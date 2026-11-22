"use client";

import dynamic from "next/dynamic";
import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { isSensorGridLocked, sensorFrame, smoothRange, type SensorFrame } from "@/lib/sensor-motion";

const SensorScene = dynamic(() => import("./sensor-scene"), { ssr: false });

class SensorBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}

/** One scroll controller measures the real hero and destination without pinning the page. */
export function SensorJourney() {
  const frame = useRef<SensorFrame>({ progress: 0, x: 0, y: 0, side: 0, handoff: 0 });
  const pointer = useRef({ x: 0, y: 0 });
  const active = useRef(true);
  const invalidate = useRef<(() => void) | null>(null);
  const board = useRef<HTMLElement | null>(null);
  const sceneAvailable = useRef(false);
  const [enabled, setEnabled] = useState(false);
  const [failed, setFailed] = useState(false);
  const syncGridLock = useCallback(() => {
    const locked = isSensorGridLocked(sceneAvailable.current, frame.current.handoff);
    if (board.current) board.current.inert = locked;
    document.body.classList.toggle("sensor-3d-locked", locked);
    if (locked) document.body.classList.remove("sensor-3d-interacting");
  }, []);
  const onReady = useCallback(() => {
    document.body.classList.add("sensor-3d-ready");
    syncGridLock();
  }, [syncGridLock]);
  const onFailure = useCallback(() => {
    sceneAvailable.current = false;
    syncGridLock();
    document.body.classList.remove("sensor-3d-ready", "sensor-3d-interacting");
    setFailed(true);
  }, [syncGridLock]);

  useEffect(() => {
    const source = document.querySelector<HTMLElement>(".hero-visual .sensor-frame");
    const target = document.querySelector<HTMLElement>(".bayer-board");
    if (!source || !target) return;
    const originallyInert = target.inert;
    board.current = target;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobile = window.matchMedia("(max-width: 700px)");
    let scheduled = 0;
    let hovered = false;
    let focused = false;
    let storyRevealed = 0;
    const update = () => {
      scheduled = 0;
      frame.current = sensorFrame(source.getBoundingClientRect(), target.getBoundingClientRect(), window.innerHeight, window.scrollY);
      const { progress, handoff } = frame.current;
      syncGridLock();
      active.current = progress < 1 && document.visibilityState === "visible";
      document.documentElement.style.setProperty("--sensor-scene-opacity", String(1 - handoff));
      document.documentElement.style.setProperty("--sensor-ui-opacity", String(0.22 + handoff * 0.78));
      document.documentElement.style.setProperty("--sensor-overlay-opacity", String(handoff));
      storyRevealed = Math.max(storyRevealed, smoothRange(progress, 0.2, 0.48));
      const story = storyRevealed;
      document.documentElement.style.setProperty("--sensor-story-opacity", String(story));
      document.documentElement.style.setProperty("--sensor-story-y", `${(1 - story) * 10}px`);
      document.documentElement.style.setProperty("--sensor-story-blur", `${(1 - story) * 4}px`);
      if (active.current) invalidate.current?.();
    };
    const requestUpdate = () => { if (!scheduled) scheduled = requestAnimationFrame(update); };
    const setAvailability = () => {
      const useScene = !reduce.matches && !mobile.matches && !failed;
      sceneAvailable.current = useScene;
      if (!useScene) document.body.classList.remove("sensor-3d-ready", "sensor-3d-interacting");
      update();
      setEnabled(useScene);
    };
    const syncInteraction = () => document.body.classList.toggle("sensor-3d-interacting", !target.inert && (hovered || focused));
    const enter = () => { hovered = true; syncInteraction(); };
    const leave = () => { hovered = false; syncInteraction(); };
    const focus = () => { focused = true; syncInteraction(); };
    const blur = (event: FocusEvent) => { focused = event.relatedTarget instanceof Node && target.contains(event.relatedTarget); syncInteraction(); };
    const onScroll = () => { if (!hovered) { focused = false; syncInteraction(); } requestUpdate(); };
    const movePointer = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      pointer.current.x = Math.max(-1, Math.min(1, event.clientX / window.innerWidth * 2 - 1));
      pointer.current.y = Math.max(-1, Math.min(1, event.clientY / window.innerHeight * 2 - 1));
      if (active.current) invalidate.current?.();
    };
    const resetPointer = () => { pointer.current.x = 0; pointer.current.y = 0; if (active.current) invalidate.current?.(); };
    const leaveWindow = (event: PointerEvent) => { if (!event.relatedTarget) resetPointer(); };
    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(requestUpdate) : null;
    resizeObserver?.observe(source); resizeObserver?.observe(target);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", requestUpdate, { passive: true });
    window.addEventListener("pointermove", movePointer, { passive: true });
    window.addEventListener("pointerout", leaveWindow);
    window.addEventListener("blur", resetPointer);
    document.addEventListener("visibilitychange", requestUpdate);
    reduce.addEventListener("change", setAvailability); mobile.addEventListener("change", setAvailability);
    target.addEventListener("pointerenter", enter); target.addEventListener("pointerleave", leave);
    target.addEventListener("focusin", focus); target.addEventListener("focusout", blur);
    target.addEventListener("keydown", focus);
    setAvailability();
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", requestUpdate);
      window.removeEventListener("pointermove", movePointer); window.removeEventListener("pointerout", leaveWindow); window.removeEventListener("blur", resetPointer);
      document.removeEventListener("visibilitychange", requestUpdate);
      reduce.removeEventListener("change", setAvailability); mobile.removeEventListener("change", setAvailability);
      target.removeEventListener("pointerenter", enter); target.removeEventListener("pointerleave", leave);
      target.removeEventListener("focusin", focus); target.removeEventListener("focusout", blur);
      target.removeEventListener("keydown", focus);
      if (scheduled) cancelAnimationFrame(scheduled);
      target.inert = originallyInert;
      board.current = null;
      sceneAvailable.current = false;
      document.body.classList.remove("sensor-3d-ready", "sensor-3d-interacting", "sensor-3d-locked");
      for (const name of ["--sensor-scene-opacity", "--sensor-ui-opacity", "--sensor-overlay-opacity", "--sensor-story-opacity", "--sensor-story-y", "--sensor-story-blur"]) document.documentElement.style.removeProperty(name);
    };
  }, [failed, syncGridLock]);

  return <div className="sensor-journey-layer" aria-hidden="true">
    {enabled && !failed && <SensorBoundary onFailure={onFailure}><SensorScene frame={frame} pointer={pointer} active={active} invalidateRef={invalidate} onReady={onReady} onFailure={onFailure} /></SensorBoundary>}
  </div>;
}
