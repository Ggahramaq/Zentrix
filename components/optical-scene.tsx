"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import { createMorphData, morphPhase } from "@/lib/morph-data";

type Props = {
  progress: MutableRefObject<number>;
  active: MutableRefObject<boolean>;
  invalidateRef: MutableRefObject<(() => void) | null>;
  onReady: () => void;
  onFailure: () => void;
};

function Lifecycle({ invalidateRef, onReady, onFailure }: Pick<Props, "invalidateRef" | "onReady" | "onFailure">) {
  const { gl, invalidate } = useThree();
  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (event: Event) => { event.preventDefault(); onFailure(); };
    const visible = () => { if (document.visibilityState === "visible") invalidate(); };
    canvas.addEventListener("webglcontextlost", lost);
    document.addEventListener("visibilitychange", visible);
    invalidateRef.current = invalidate;
    onReady();
    invalidate();
    return () => { invalidateRef.current = null; canvas.removeEventListener("webglcontextlost", lost); document.removeEventListener("visibilitychange", visible); };
  }, [gl, invalidate, invalidateRef, onReady, onFailure]);
  return null;
}

function OpticalObject({ progress, active, onFailure }: Pick<Props, "progress" | "active" | "onFailure">) {
  const tiles = useRef<THREE.InstancedMesh>(null);
  const root = useRef<THREE.Group>(null);
  const housing = useRef<THREE.Group>(null);
  const glass = useRef<THREE.MeshPhysicalMaterial>(null);
  const lastProgress = useRef(-1);
  const performanceSample = useRef({ frames: 0, elapsed: 0, reported: false });
  const side = useMemo(() => window.matchMedia("(max-width: 680px)").matches ? 24 : 32, []);
  const data = useMemo(() => createMorphData(side), [side]);
  const scratch = useMemo(() => ({ object: new THREE.Object3D(), color: new THREE.Color() }), []);
  const { invalidate, camera, size } = useThree();

  useFrame(({ clock }, delta) => {
    const p = progress.current;
    const sample = performanceSample.current;
    if (active.current && p < 0.16 && document.visibilityState === "visible" && delta > 0 && delta < 0.5 && !sample.reported) {
      sample.frames++;
      sample.elapsed += delta;
      if (sample.frames >= 60) {
        if (sample.elapsed > 4) { sample.reported = true; onFailure(); }
        else { sample.frames = 0; sample.elapsed = 0; }
      }
    } else if (p >= 0.16 || !active.current || document.visibilityState !== "visible") {
      sample.frames = 0;
      sample.elapsed = 0;
    }
    const unfold = morphPhase(p, 0.16, 0.52);
    const resolve = morphPhase(p, 0.78, 0.98);
    if (root.current) {
      root.current.rotation.set(-0.17 * (1 - unfold), 0.26 * (1 - unfold), -0.11 * (1 - unfold) + Math.sin(clock.elapsedTime * 0.32) * 0.012 * (1 - unfold));
    }
    if (housing.current) {
      const s = 1 + unfold * 0.22;
      housing.current.scale.setScalar(s);
      housing.current.position.z = -unfold * 0.82;
    }
    if (glass.current) glass.current.opacity = 0.22 * (1 - unfold * 0.9);
    const aspectFit = Math.max(1, 0.9 / (size.width / size.height));
    camera.position.set(0, 0, (6.4 - unfold * 0.1 + resolve * 0.2) * aspectFit);
    camera.lookAt(0, 0, 0);
    if (tiles.current && Math.abs(lastProgress.current - p) > 0.00001) {
      const mesh = tiles.current;
      const unit = 2.9 / side;
      for (let i = 0; i < side * side; i++) {
        const k = i * 3;
        const mix = THREE.MathUtils.lerp;
        scratch.object.position.set(
          mix(mix(data.opticalPositions[k], data.sensorPositions[k], unfold), data.imagePositions[k], resolve),
          mix(mix(data.opticalPositions[k + 1], data.sensorPositions[k + 1], unfold), data.imagePositions[k + 1], resolve),
          mix(mix(data.opticalPositions[k + 2], data.sensorPositions[k + 2], unfold), data.imagePositions[k + 2], resolve),
        );
        const scale = unit * mix(mix(0.58, 0.86, unfold), 1.005, resolve);
        scratch.object.scale.set(scale, scale, mix(0.027, 0.012, resolve));
        scratch.object.updateMatrix();
        mesh.setMatrixAt(i, scratch.object.matrix);
        scratch.color.setRGB(
          mix(mix(data.opticalColors[k], data.sensorColors[k], unfold), data.imageColors[k], resolve),
          mix(mix(data.opticalColors[k + 1], data.sensorColors[k + 1], unfold), data.imageColors[k + 1], resolve),
          mix(mix(data.opticalColors[k + 2], data.sensorColors[k + 2], unfold), data.imageColors[k + 2], resolve),
        );
        mesh.setColorAt(i, scratch.color);
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      lastProgress.current = p;
    }
    if (active.current && p < 0.16 && document.visibilityState === "visible") invalidate();
  });

  return <group ref={root}>
    <group ref={housing}>
      <mesh position={[0, 0, -0.42]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[1.62, 1.69, 0.65, 96, 1, true]} /><meshStandardMaterial color="#172132" metalness={0.86} roughness={0.3} side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, 0, -0.07]}><torusGeometry args={[1.59, 0.095, 16, 112]} /><meshStandardMaterial color="#2c394e" metalness={0.94} roughness={0.25} /></mesh>
      <mesh position={[0, 0, 0.015]}><torusGeometry args={[1.44, 0.028, 12, 112]} /><meshStandardMaterial color="#a8b9d7" metalness={0.92} roughness={0.24} /></mesh>
      <mesh position={[0, 0, -0.15]}><torusGeometry args={[1.32, 0.07, 12, 112]} /><meshStandardMaterial color="#090e17" metalness={0.85} roughness={0.26} /></mesh>
      <mesh position={[0, 0, -0.24]}><torusGeometry args={[1.23, 0.014, 8, 112]} /><meshStandardMaterial color="#5477c5" emissive="#132c65" emissiveIntensity={0.5} metalness={0.8} roughness={0.28} /></mesh>
      <mesh position={[0, 0, -0.66]}><circleGeometry args={[1.31, 96]} /><meshStandardMaterial color="#08101d" metalness={0.65} roughness={0.27} /></mesh>
      <mesh position={[0, 0, -0.12]}><circleGeometry args={[1.22, 96]} /><meshPhysicalMaterial ref={glass} color="#38538a" metalness={0.15} roughness={0.13} transparent opacity={0.22} depthWrite={false} /></mesh>
      <mesh position={[0, 0, 0.03]}><torusGeometry args={[1.52, 0.008, 8, 96, Math.PI * 0.42]} /><meshBasicMaterial color="#9bb8f7" transparent opacity={0.55} /></mesh>
    </group>
    <instancedMesh ref={tiles} args={[undefined, undefined, side * side]} frustumCulled={false}><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial color="#ffffff" metalness={0.12} roughness={0.55} /></instancedMesh>
  </group>;
}

export default function OpticalScene(props: Props) {
  return <Canvas frameloop="demand" dpr={[1, 1.5]} camera={{ position: [0, 0, 6.4], fov: 36, near: 0.1, far: 30 }} gl={{ antialias: true, alpha: true, powerPreference: "low-power" }} fallback={<span />}>
    <ambientLight intensity={1.2} /><directionalLight position={[3, 4, 6]} color="#e3ecff" intensity={2.4} /><directionalLight position={[-4, 0, 1]} color="#537de6" intensity={1.5} /><pointLight position={[0, -3, 3]} color="#4777f5" intensity={8} distance={10} />
    <Lifecycle invalidateRef={props.invalidateRef} onReady={props.onReady} onFailure={props.onFailure} />
    <OpticalObject progress={props.progress} active={props.active} onFailure={props.onFailure} />
  </Canvas>;
}
