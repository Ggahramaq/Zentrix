"use client";

import dynamic from "next/dynamic";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { morphPhase } from "@/lib/morph-data";

const Scene = dynamic(() => import("./optical-scene"), { ssr: false });

type SceneBoundaryProps = { children: ReactNode; onError: () => void };
class SceneBoundary extends Component<SceneBoundaryProps, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

export function CinematicJourney() {
  const layer = useRef<HTMLDivElement>(null);
  const progress = useRef(0);
  const active = useRef(true);
  const invalidate = useRef<(() => void) | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const element = layer.current;
    const shell = element?.closest<HTMLElement>(".journey-shell");
    const visual = shell?.querySelector<HTMLElement>(".hero-visual");
    const story = shell?.querySelector<HTMLElement>(".journey-story");
    if (!element || !shell || !visual || !story) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = shell.getBoundingClientRect();
      const distance = Math.max(1, rect.height - window.innerHeight);
      progress.current = Math.min(1, Math.max(0, -rect.top / distance));
      const visualRect = visual.getBoundingClientRect();
      const mobile = window.innerWidth <= 680;
      element.style.setProperty("--scene-top", `${Math.max(mobile ? 72 : 85, visualRect.top)}px`);
      const reveal = morphPhase(progress.current, 0.24, 0.49);
      story.style.setProperty("--story-reveal", String(reveal));
      story.style.setProperty("--story-shift", `${(1 - reveal) * 12}px`);
      shell.style.setProperty("--journey-progress", String(progress.current));
      if (active.current) invalidate.current?.();
    };
    const requestUpdate = () => { if (!frame) frame = requestAnimationFrame(update); };
    const onMotion = () => { setEnabled(!motion.matches); shell.classList.toggle("motion-reduced", motion.matches); if (motion.matches) shell.classList.remove("scene-ready"); requestUpdate(); };
    const observer = new IntersectionObserver(([entry]) => { active.current = entry.isIntersecting; if (entry.isIntersecting) requestUpdate(); }, { rootMargin: "100px" });
    observer.observe(shell);
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate, { passive: true });
    motion.addEventListener("change", onMotion);
    onMotion();
    update();
    return () => { observer.disconnect(); window.removeEventListener("scroll", requestUpdate); window.removeEventListener("resize", requestUpdate); motion.removeEventListener("change", onMotion); if (frame) cancelAnimationFrame(frame); shell.classList.remove("scene-ready", "motion-reduced"); };
  }, []);

  function fail() {
    setFailed(true);
    layer.current?.closest(".journey-shell")?.classList.remove("scene-ready");
  }

  return <div className="journey-layer" ref={layer} aria-hidden="true"><div className="journey-canvas">
    {enabled && !failed && <SceneBoundary onError={fail}><Scene progress={progress} active={active} invalidateRef={invalidate} onReady={() => layer.current?.closest(".journey-shell")?.classList.add("scene-ready")} onFailure={fail} /></SceneBoundary>}
  </div></div>;
}
