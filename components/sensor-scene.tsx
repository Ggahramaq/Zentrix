"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import { bayerChannel } from "@/lib/bayer";
import { smoothRange, type SensorFrame } from "@/lib/sensor-motion";

type SceneProps = {
  frame: MutableRefObject<SensorFrame>;
  pointer: MutableRefObject<{ x: number; y: number }>;
  active: MutableRefObject<boolean>;
  invalidateRef: MutableRefObject<(() => void) | null>;
  onReady: () => void;
  onFailure: () => void;
};

function WebGLUnavailable({ onFailure }: { onFailure: () => void }) {
  useEffect(() => { onFailure(); }, [onFailure]);
  return null;
}

function RendererLifecycle({ invalidateRef, onFailure }: Pick<SceneProps, "invalidateRef" | "onFailure">) {
  const { gl, invalidate } = useThree();
  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (event: Event) => { event.preventDefault(); onFailure(); };
    canvas.addEventListener("webglcontextlost", lost);
    invalidateRef.current = invalidate;
    invalidate();
    return () => { invalidateRef.current = null; canvas.removeEventListener("webglcontextlost", lost); };
  }, [gl, invalidate, invalidateRef, onFailure]);
  return null;
}

function SensorAssembly({ frame, pointer, active, onReady, onFailure }: Omit<SceneProps, "invalidateRef">) {
  const group = useRef<THREE.Group>(null);
  const base = useRef<THREE.Group>(null);
  const cover = useRef<THREE.Group>(null);
  const tiles = useRef<THREE.InstancedMesh>(null);
  const coverMaterial = useRef<THREE.MeshPhysicalMaterial>(null);
  const highlight = useRef<THREE.Mesh>(null);
  const highlightMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const announced = useRef(false);
  const lastProgress = useRef(-1);
  const parallax = useRef({ x: 0, y: 0 });
  const performanceSample = useRef({ count: 0, seconds: 0, reported: false });
  const { camera, size, invalidate } = useThree();
  const scratch = useMemo(() => new THREE.Object3D(), []);
  const colors = useMemo(() => [new THREE.Color("#a7515d"), new THREE.Color("#3e8b73"), new THREE.Color("#557bc4")], []);
  const metal = useMemo(() => new THREE.MeshStandardMaterial({ color: "#253247", metalness: 0.88, roughness: 0.3, transparent: true }), []);
  const silicon = useMemo(() => new THREE.MeshStandardMaterial({ color: "#080f19", metalness: 0.62, roughness: 0.38, transparent: true }), []);
  const materials = useRef<{ metal: THREE.MeshStandardMaterial; silicon: THREE.MeshStandardMaterial } | null>(null);
  useEffect(() => {
    materials.current = { metal, silicon };
    return () => { materials.current = null; metal.dispose(); silicon.dispose(); };
  }, [metal, silicon]);

  useFrame(({ clock }, delta) => {
    if (!group.current || !base.current || !cover.current || !tiles.current) return;
    const state = frame.current;
    const p = state.progress;
    const elapsed = clock.elapsedTime;
    const introduction = p > 0.03 ? 1 : 1 - Math.pow(1 - Math.min(elapsed / 1.15, 1), 3);
    const approach = smoothRange(p, 0.12, 0.42);
    const split = smoothRange(p, 0.30, 0.62);
    const flatten = smoothRange(p, 0.52, 0.95);
    const housingFade = 1 - smoothRange(p, 0.68, 0.9);
    const parallaxStrength = 1 - smoothRange(p, 0.22, 0.55);
    parallax.current.x = THREE.MathUtils.damp(parallax.current.x, pointer.current.x, 5, Math.min(delta, 0.05));
    parallax.current.y = THREE.MathUtils.damp(parallax.current.y, pointer.current.y, 5, Math.min(delta, 0.05));
    const cameraDepth = 8.5 - approach * 1.1;
    camera.position.set(0, 0, cameraDepth);
    camera.lookAt(0, 0, 0);
    const worldPerPixel = (2 * cameraDepth * Math.tan(THREE.MathUtils.degToRad(36 / 2))) / Math.max(size.height, 1);
    group.current.position.set((state.x - size.width / 2 + parallax.current.x * 4 * parallaxStrength) * worldPerPixel, (size.height / 2 - state.y - parallax.current.y * 4 * parallaxStrength) * worldPerPixel + (1 - p) * Math.sin(elapsed * 0.6) * 0.008, 0);
    group.current.scale.setScalar(state.side * worldPerPixel / 2 * (0.93 + introduction * 0.07));
    group.current.rotation.set(-0.22 * (1 - flatten) + parallax.current.y * 0.04 * parallaxStrength, 0.28 * (1 - flatten) + parallax.current.x * 0.055 * parallaxStrength, 0.21 * (1 - flatten));
    base.current.position.z = -0.08 - split * 0.18;
    cover.current.position.z = 0.09 + split * 0.28;
    if (materials.current) {
      materials.current.metal.opacity = housingFade;
      materials.current.silicon.opacity = housingFade;
    }
    if (coverMaterial.current) coverMaterial.current.opacity = 0.17 * housingFade;
    if (highlight.current && highlightMaterial.current) {
      highlight.current.position.x = -0.8 + introduction * 1.6;
      highlightMaterial.current.opacity = 0.12 * housingFade * (1 - introduction * 0.65);
    }
    if (Math.abs(lastProgress.current - p) > 0.00001) {
      const mesh = tiles.current;
      for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) {
        const index = y * 12 + x;
        const px = (x - 5.5) / 6;
        const py = (5.5 - y) / 6;
        const distance = Math.hypot(px, py) / 1.3;
        const wave = smoothRange(p, 0.39 + distance * 0.1, 0.63 + distance * 0.1);
        const settle = smoothRange(p, 0.73, 0.95);
        scratch.position.set(px, py, THREE.MathUtils.lerp(0.035, -0.012, flatten) + wave * (1 - settle) * 0.18);
        scratch.rotation.set(0, 0, 0);
        scratch.scale.setScalar(1);
        scratch.updateMatrix();
        mesh.setMatrixAt(index, scratch.matrix);
        if (lastProgress.current < 0) mesh.setColorAt(index, colors[bayerChannel(x, y)]);
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      lastProgress.current = p;
    }
    if (!announced.current && state.side > 0) {
      announced.current = true;
      onReady();
    }
    const sample = performanceSample.current;
    if (active.current && p < 0.1 && document.visibilityState === "visible" && delta > 0 && delta < 0.5 && !sample.reported) {
      sample.count++; sample.seconds += delta;
      if (sample.count >= 75) {
        if (sample.seconds > 6) { sample.reported = true; onFailure(); }
        else { sample.count = 0; sample.seconds = 0; }
      }
    } else if (!active.current || p >= 0.1 || document.visibilityState !== "visible") {
      sample.count = 0; sample.seconds = 0;
    }
    const parallaxMoving = Math.abs(pointer.current.x - parallax.current.x) > 0.001 || Math.abs(pointer.current.y - parallax.current.y) > 0.001;
    if (active.current && document.visibilityState === "visible" && (p < 0.15 || (parallaxStrength > 0.001 && parallaxMoving))) invalidate();
  });

  return <group ref={group}>
    <group ref={base}>
      <mesh material={silicon} position={[0, 0, -0.13]}><boxGeometry args={[2.3, 2.3, 0.13]} /></mesh>
      <mesh material={metal} position={[0, 1.09, -0.03]}><boxGeometry args={[2.32, 0.09, 0.16]} /></mesh>
      <mesh material={metal} position={[0, -1.09, -0.03]}><boxGeometry args={[2.32, 0.09, 0.16]} /></mesh>
      <mesh material={metal} position={[-1.09, 0, -0.03]}><boxGeometry args={[0.09, 2.09, 0.16]} /></mesh>
      <mesh material={metal} position={[1.09, 0, -0.03]}><boxGeometry args={[0.09, 2.09, 0.16]} /></mesh>
      <mesh material={metal} position={[0, -1.19, -0.12]}><boxGeometry args={[1.55, 0.025, 0.025]} /></mesh>
    </group>
    <instancedMesh ref={tiles} args={[undefined, undefined, 144]} frustumCulled={false}>
      <boxGeometry args={[0.152, 0.152, 0.024]} />
      <meshStandardMaterial color="#ffffff" metalness={0.18} roughness={0.38} />
    </instancedMesh>
    <group ref={cover}>
      <mesh><boxGeometry args={[2.06, 2.06, 0.025]} /><meshPhysicalMaterial ref={coverMaterial} color="#a9c4ec" metalness={0.1} roughness={0.12} transparent opacity={0.17} depthWrite={false} /></mesh>
      <mesh ref={highlight} position={[0, 0, 0.02]}><planeGeometry args={[0.16, 2.02]} /><meshBasicMaterial ref={highlightMaterial} color="#d8eaff" transparent opacity={0.12} depthWrite={false} /></mesh>
    </group>
  </group>;
}

export default function SensorScene(props: SceneProps) {
  return <Canvas frameloop="demand" dpr={[1, 1.5]} camera={{ position: [0, 0, 8.5], fov: 36, near: 0.1, far: 50 }} gl={{ antialias: true, alpha: true, powerPreference: "low-power" }} fallback={<WebGLUnavailable onFailure={props.onFailure} />}>
    <ambientLight intensity={1.05} />
    <directionalLight position={[3, 4, 8]} color="#e0e9ff" intensity={1.7} />
    <directionalLight position={[-4, -1, 3]} color="#6e95e8" intensity={0.8} />
    <RendererLifecycle invalidateRef={props.invalidateRef} onFailure={props.onFailure} />
    <SensorAssembly frame={props.frame} pointer={props.pointer} active={props.active} onReady={props.onReady} onFailure={props.onFailure} />
  </Canvas>;
}
