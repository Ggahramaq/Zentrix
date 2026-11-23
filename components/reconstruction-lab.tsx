"use client";

import { useMemo, useState } from "react";
import { sampleBayer } from "@/lib/bayer";
import { gaussianBlur } from "@/lib/blur";
import { reconstruct, type Algorithm } from "@/lib/demosaic";
import { detailRatio, falseColorScore, meanSquaredError } from "@/lib/metrics";
import { createPattern, type Pattern } from "@/lib/patterns";
import { ImageComparison } from "./image-comparison";
import { Reveal } from "./reveal";

const methods: { id: Algorithm; title: string; technical: string; description: string; note: string }[] = [
  { id: "nearest", title: "Copy the closest", technical: "Nearest Neighbor", description: "Uses the nearest clue to guess each missing color.", note: "Simple, but the picture can look blocky." },
  { id: "bilinear", title: "Average the neighbors", technical: "Bilinear", description: "Mixes nearby clues to guess each missing color.", note: "The picture can look smoother, but tiny details may blur." },
  { id: "edge", title: "Follow the edges", technical: "Edge-Aware", description: "Looks for edges in the picture to help guess the missing colors.", note: "It tries to keep edges clear, but can still get colors wrong." },
];
const offsets = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }];
const alignments = ["RG / GB", "GR / BG", "GB / RG", "BG / GR"];

export function AlgorithmSelector({ value, onChange, name }: { value: Algorithm; onChange: (value: Algorithm) => void; name: string }) {
  const selected = methods.find(item => item.id === value)!;
  return <fieldset className="lab-algorithms"><legend>HOW SHOULD THE CAMERA FILL IN THE MISSING COLORS?</legend><div className="lab-method-list">{methods.map(method => <label className={value === method.id ? "lab-method selected" : "lab-method"} key={method.id}><input type="radio" name={name} value={method.id} checked={value === method.id} onChange={() => onChange(method.id)} /><span><strong>{method.title}</strong></span></label>)}</div><p className="lab-method-description">{selected.description} <span>{selected.note}</span></p></fieldset>;
}

export function ReconstructionLab() {
  const [method, setMethod] = useState<Algorithm>("bilinear"), [blur, setBlur] = useState(0), [pattern, setPattern] = useState<Pattern>("checker"), [width, setWidth] = useState(2), [orientation, setOrientation] = useState<"vertical" | "horizontal">("vertical"), [alignment, setAlignment] = useState(0);
  const source = useMemo(() => createPattern(128, 128, pattern, width, orientation), [pattern, width, orientation]);
  const filtered = useMemo(() => gaussianBlur(source, blur), [source, blur]);
  const mosaic = useMemo(() => sampleBayer(filtered, offsets[alignment]), [filtered, alignment]);
  const result = useMemo(() => reconstruct(mosaic, method), [mosaic, method]);
  const metrics = useMemo(() => ({ falseColor: falseColorScore(result), mse: meanSquaredError(source, result), detail: detailRatio(source, result) }), [source, result]);
  const baseline = useMemo(() => {
    const image = reconstruct(sampleBayer(source, offsets[alignment]), "bilinear");
    return { falseColor: falseColorScore(image), detail: detailRatio(source, image) };
  }, [source, alignment]);
  function reset() { setMethod("bilinear"); setBlur(0); setPattern("checker"); setWidth(2); setOrientation("vertical"); setAlignment(0); }
  return <section className="lab-section" id="reconstruction-lab"><div className="container">
    <div className="section-topline light-line"><span>THE COLOR LAB / 02</span><span>AN INTERACTIVE STUDY</span></div>
    <div className="lab-heading"><Reveal><p className="eyebrow"><span className="eyebrow-dot" /> TAKE CONTROL</p><h2>Become the camera.</h2></Reveal><p>Now it is your turn. Choose how the camera guesses the missing colors and see what changes.</p></div>
    <div className="lab-layout"><ImageComparison original={source} result={result} /><div className="lab-side"><AlgorithmSelector value={method} onChange={setMethod} name="lab-method" /><div className="lab-metrics"><div><span>Unwanted color</span><strong>{metrics.falseColor.toFixed(2)}</strong><small>A lower number means fewer extra colors. Zero means there are no extra colors.</small></div><div><span>Difference from the original</span><strong>{metrics.mse.toFixed(4)}</strong><small>A lower number means the picture is closer to the original.</small></div><div><span>Edge detail compared with the original</span><strong>{metrics.detail === null ? "—" : `${metrics.detail.toFixed(2)}×`}</strong><small>{metrics.detail === null ? "There are no clear edges to compare." : metrics.detail < 0.005 ? "Some edges have become less clear." : "1× means the edges are as strong as in the original. Extra marks can affect this number too."}</small></div></div></div></div>
    <div className="challenge"><div><p className="eyebrow"><span className="eyebrow-dot" /> THE CHALLENGE</p><h3>Can you fix what<br />the camera invented?</h3><p>This picture should be black and white. Can you remove the extra colors without making the pattern too blurry? Try to lower unwanted color while keeping the original recognizable.</p><details className="calculation-details"><summary>Need a hint?</summary><p>Try changing how the camera fills in missing colors. Then try a little blur before measuring.</p></details><p className="challenge-feedback" aria-live="polite">Compared with the starting settings: {metrics.falseColor < baseline.falseColor - 0.01 ? "less unwanted color. " : metrics.falseColor > baseline.falseColor + 0.01 ? "more unwanted color. " : "similar unwanted color. "}{metrics.detail !== null && baseline.detail !== null && metrics.detail < baseline.detail - 0.05 ? "Some edges became less clear too." : "Check the picture too: extra marks can look like detail."}</p><div className="challenge-comparison"><ImageComparison original={source} result={result} /><p aria-live="polite">FALSE COLOR {metrics.falseColor.toFixed(2)} · ERROR {metrics.mse.toFixed(4)} · DETAIL {metrics.detail === null ? "-" : `${metrics.detail.toFixed(2)}×`}</p></div></div><div className="challenge-controls"><div className="challenge-method"><AlgorithmSelector value={method} onChange={setMethod} name="challenge-method" /></div><label>CHOOSE A BLACK-AND-WHITE PATTERN<select value={pattern} onChange={e => setPattern(e.target.value as Pattern)}><option value="checker">Tiny checkerboard</option><option value="stripes">Black-and-white stripes</option><option value="diagonal">Diagonal stripes</option><option value="texture">Tiny shapes</option></select></label><label>SIZE OF THE STRIPES <output>{width} PX</output><input aria-label="Stripe width" type="range" min="1" max="8" value={width} disabled={pattern === "checker"} onChange={e => setWidth(Number(e.target.value))} /></label><label>DIRECTION OF THE STRIPES<select value={orientation} disabled={pattern !== "stripes"} onChange={e => setOrientation(e.target.value as "vertical" | "horizontal")}><option value="vertical">Vertical</option><option value="horizontal">Horizontal</option></select></label><label>BLUR BEFORE MEASURING <output>{blur.toFixed(1)} PX</output><input aria-label="Challenge optical prefilter" type="range" min="0" max="1.5" step="0.1" value={blur} onChange={e => setBlur(Number(e.target.value))} /></label><div className="challenge-actions"><button type="button" onClick={() => setAlignment((alignment + 1) % 4)}>Move the sensor one step <span>{alignments[alignment]}</span></button><button type="button" onClick={reset}>Reset experiment</button></div><p>A little blur can reduce extra colors, but too much can hide small details.</p></div></div>
    <a className="lab-next-link" href="#your-photo">Try it with a photograph <span aria-hidden="true">↓</span></a>
  </div></section>;
}
