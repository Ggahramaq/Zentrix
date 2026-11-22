"use client";

import { useMemo, useState } from "react";
import { sampleBayer } from "@/lib/bayer";
import { gaussianBlur } from "@/lib/blur";
import { reconstruct, type Algorithm } from "@/lib/demosaic";
import { detailRatio, falseColorScore, meanSquaredError } from "@/lib/metrics";
import { createPattern, type Pattern } from "@/lib/patterns";
import { ImageComparison } from "./image-comparison";
import { Reveal } from "./reveal";

const methods: { id: Algorithm; title: string; description: string; note: string }[] = [
  { id: "nearest", title: "01 / Nearest Neighbor", description: "Fill missing colors using the closest available measurement.", note: "A fast baseline that can create jagged or blocky transitions." },
  { id: "bilinear", title: "02 / Bilinear", description: "Estimate missing colors by averaging nearby measurements.", note: "Averages nearby samples, which can soften edges and mix fine detail." },
  { id: "edge", title: "03 / Edge-Aware", description: "Use image structure to avoid averaging blindly across edges.", note: "Compares horizontal and vertical green gradients before estimating color differences. It can still make mistakes." },
];
const offsets = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }];
const alignments = ["RG / GB", "GR / BG", "GB / RG", "BG / GR"];

export function AlgorithmSelector({ value, onChange, name }: { value: Algorithm; onChange: (value: Algorithm) => void; name: string }) {
  const selected = methods.find(item => item.id === value)!;
  return <fieldset className="lab-algorithms"><legend>RECONSTRUCTION METHOD</legend><div className="lab-method-list">{methods.map(method => <label className={value === method.id ? "lab-method selected" : "lab-method"} key={method.id}><input type="radio" name={name} value={method.id} checked={value === method.id} onChange={() => onChange(method.id)} /><span>{method.title}</span></label>)}</div><p className="lab-method-description">{selected.description} <span>{selected.note}</span></p></fieldset>;
}

export function ReconstructionLab() {
  const [method, setMethod] = useState<Algorithm>("bilinear"), [blur, setBlur] = useState(0), [pattern, setPattern] = useState<Pattern>("checker"), [width, setWidth] = useState(2), [orientation, setOrientation] = useState<"vertical" | "horizontal">("vertical"), [alignment, setAlignment] = useState(0);
  const source = useMemo(() => createPattern(128, 128, pattern, width, orientation), [pattern, width, orientation]);
  const filtered = useMemo(() => gaussianBlur(source, blur), [source, blur]);
  const mosaic = useMemo(() => sampleBayer(filtered, offsets[alignment]), [filtered, alignment]);
  const result = useMemo(() => reconstruct(mosaic, method), [mosaic, method]);
  const metrics = useMemo(() => ({ falseColor: falseColorScore(result), mse: meanSquaredError(source, result), detail: detailRatio(source, result) }), [source, result]);
  function reset() { setMethod("bilinear"); setBlur(0); setPattern("checker"); setWidth(2); setOrientation("vertical"); setAlignment(0); }
  return <section className="lab-section" id="reconstruction-lab"><div className="container">
    <div className="section-topline light-line"><span>THE RECONSTRUCTION LAB / 02</span><span>AN INTERACTIVE STUDY</span></div>
    <div className="lab-heading"><Reveal><p className="eyebrow"><span className="eyebrow-dot" /> TAKE CONTROL</p><h2>Become the camera.</h2></Reveal><p>The sensor has captured its measurements. Now you decide how to reconstruct the missing colors.</p></div>
    <div className="lab-layout"><ImageComparison original={source} result={result} /><div className="lab-side"><AlgorithmSelector value={method} onChange={setMethod} name="lab-method" /><div className="lab-metrics" aria-live="polite"><div><span>FALSE COLOR SCORE</span><strong>{metrics.falseColor.toFixed(2)}</strong><small>Channel disagreement · grayscale only</small></div><div><span>RECONSTRUCTION ERROR</span><strong>{metrics.mse.toFixed(4)}</strong><small>Mean squared error · linear RGB</small></div><div><span>DETAIL RATIO</span><strong>{metrics.detail === null ? "-" : `${metrics.detail.toFixed(2)}×`}</strong><small>Luminance gradient vs. original</small></div></div><p className="lab-metric-note">Zero false color means the result remains gray. Error and detail are measured against the unfiltered original; no single metric tells the whole story.</p></div></div>
    <div className="challenge"><div><p className="eyebrow"><span className="eyebrow-dot" /> THE CHALLENGE</p><h3>Can you fix what<br />the camera invented?</h3><p>The original pattern is black and white. Your reconstruction added color. Can you remove the false colors without losing important detail?</p><div className="challenge-comparison"><ImageComparison original={source} result={result} /><p aria-live="polite">FALSE COLOR {metrics.falseColor.toFixed(2)} · ERROR {metrics.mse.toFixed(4)} · DETAIL {metrics.detail === null ? "-" : `${metrics.detail.toFixed(2)}×`}</p></div></div><div className="challenge-controls"><div className="challenge-method"><AlgorithmSelector value={method} onChange={setMethod} name="challenge-method" /></div><label>TEST PATTERN<select value={pattern} onChange={e => setPattern(e.target.value as Pattern)}><option value="checker">One-pixel checkerboard</option><option value="stripes">Black-and-white stripes</option><option value="diagonal">Diagonal stripes</option><option value="texture">Fine geometric texture</option></select></label><label>STRIPE WIDTH <output>{width} PX</output><input aria-label="Stripe width" type="range" min="1" max="8" value={width} disabled={pattern === "checker"} onChange={e => setWidth(Number(e.target.value))} /></label><label>STRIPE ORIENTATION<select value={orientation} disabled={pattern !== "stripes"} onChange={e => setOrientation(e.target.value as "vertical" | "horizontal")}><option value="vertical">Vertical</option><option value="horizontal">Horizontal</option></select></label><label>OPTICAL PREFILTER <output>{blur.toFixed(1)} PX</output><input aria-label="Challenge optical prefilter" type="range" min="0" max="1.5" step="0.1" value={blur} onChange={e => setBlur(Number(e.target.value))} /></label><div className="challenge-actions"><button type="button" onClick={() => setAlignment((alignment + 1) % 4)}>Shift sensor <span>{alignments[alignment]}</span></button><button type="button" onClick={reset}>Reset experiment</button></div><p>Some high-frequency detail must be suppressed before sampling to avoid misleading measurements. This Gaussian blur is an approximation, not a complete optical model.</p></div></div>
    <a className="lab-next-link" href="#your-photo">Try it with a photograph <span aria-hidden="true">↓</span></a>
  </div></section>;
}
