"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { sampleBayer, srgbToLinear, type LinearImage } from "@/lib/bayer";
import { gaussianBlur } from "@/lib/blur";
import { reconstruct, type Algorithm } from "@/lib/demosaic";
import { meanSquaredError } from "@/lib/metrics";
import { AlgorithmSelector } from "./reconstruction-lab";
import { ImageComparison } from "./image-comparison";
import { Reveal } from "./reveal";

const MAX_SIDE = 224;

/** Decode locally, composite transparency on white, and cap work while retaining aspect ratio. */
function decodeImage(src: string, crop = false): Promise<LinearImage> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      try {
        const sx = crop ? image.naturalWidth * .2 : 0, sy = crop ? image.naturalHeight * .15 : 0;
        const sw = crop ? image.naturalWidth * .6 : image.naturalWidth, sh = crop ? image.naturalHeight * .7 : image.naturalHeight;
        const scale = Math.min(1, MAX_SIDE / Math.max(sw, sh));
        const width = Math.max(2, Math.round(sw * scale)), height = Math.max(2, Math.round(sh * scale));
        const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) throw new Error("Canvas unavailable");
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, width, height); ctx.drawImage(image, sx, sy, sw, sh, 0, 0, width, height);
        const rgba = ctx.getImageData(0, 0, width, height).data, data = new Float32Array(width * height * 3);
        for (let i = 0; i < width * height; i++) for (let c = 0; c < 3; c++) data[i * 3 + c] = srgbToLinear(rgba[i * 4 + c] / 255);
        resolve({ width, height, data });
      } catch { reject(new Error("Could not read this image.")); }
    };
    image.onerror = () => reject(new Error("Could not decode this image."));
    image.src = src;
  });
}

export function PhotoLab() {
  const [source, setSource] = useState<LinearImage | null>(null), [method, setMethod] = useState<Algorithm>("bilinear"), [blur, setBlur] = useState(0), [heatmap, setHeatmap] = useState(false), [message, setMessage] = useState("Sample · processed in your browser"), [error, setError] = useState("");
  const request = useRef(0);
  const section = useRef<HTMLElement>(null);
  useEffect(() => {
    let active = true;
    const start = () => { decodeImage("/sensor-sample.webp").then(image => { if (active && request.current === 0) setSource(image); }).catch(() => { if (active && request.current === 0) setError("The sample image could not be loaded. You can still upload a photo."); }); };
    const observer = "IntersectionObserver" in window ? new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { observer?.disconnect(); start(); } }, { rootMargin: "300px" }) : null;
    if (observer && section.current) observer.observe(section.current); else start();
    return () => { active = false; observer?.disconnect(); };
  }, []);
  const filtered = useMemo(() => source ? gaussianBlur(source, blur) : null, [source, blur]);
  const mosaic = useMemo(() => filtered ? sampleBayer(filtered) : null, [filtered]);
  const result = useMemo(() => mosaic ? reconstruct(mosaic, method) : null, [mosaic, method]);
  const mse = useMemo(() => source && result ? meanSquaredError(source, result) : 0, [source, result]);
  async function load(src: string, label: string, crop = false, objectUrl = false) {
    const current = ++request.current; setError("");
    try { const image = await decodeImage(src, crop); if (current === request.current) { setSource(image); setMessage(label); } }
    catch { if (current === request.current) setError("That image could not be decoded. Try a JPG, PNG, or WebP file."); }
    finally { if (objectUrl) URL.revokeObjectURL(src); }
  }
  function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 20 * 1024 * 1024) { request.current++; setError("Choose a JPG, PNG, or WebP image smaller than 20 MB."); return; }
    void load(URL.createObjectURL(file), `${file.name} · processed in your browser`, false, true);
  }
  return <section ref={section} className="photo-section" id="your-photo"><div className="container"><div className="section-topline light-line"><span>YOUR PHOTO / 03</span><span>YOUR IMAGE, YOUR DEVICE</span></div>
    <div className="lab-heading"><Reveal><p className="eyebrow"><span className="eyebrow-dot" /> LOOK CLOSER</p><h2>What did your camera<br />never see?</h2></Reveal><p>Try your own photo. We’ll pretend it was captured by a simple color sensor, then rebuild it using different methods.</p></div>
    <p className="discovery-instruction">Your photo stays on your device. Start with the sample or choose your own.</p><div className="photo-source"><label className="photo-upload">Choose a photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} /></label><button type="button" onClick={() => void load("/sensor-sample.webp", "Sample · processed in your browser")}>Sample image</button><button type="button" onClick={() => void load("/sensor-sample.webp", "Sample detail · processed in your browser", true)}>Sample detail</button><span>{message}</span></div>
    {error && <p role="alert" className="photo-error">{error}</p>}
    <p className="photo-disclaimer">This is a simulation: we rebuild an existing photo as if a simple Bayer sensor had captured it. We cannot recover your camera’s original sensor measurements.</p>
    {source && result && <div className="lab-layout photo-layout"><div><ImageComparison original={source} result={result} heatmap={heatmap} magnifier /><p className="comparison-instruction">Look closely at edges and tiny details. Can you spot what changed?</p><details className="calculation-details"><summary>Explore the technical details</summary><div className="heatmap-toggle"><label><input type="checkbox" checked={heatmap} onChange={e => setHeatmap(e.target.checked)} /> Show reconstruction error heatmap</label><p>Dark means lower error; warm colors show greater per-channel absolute error. The display is amplified 4× for visibility.</p></div></details></div><div className="lab-side"><AlgorithmSelector value={method} onChange={setMethod} name="photo-method" /><details className="calculation-details"><summary>More controls and measurements</summary><label className="photo-blur">BLUR BEFORE MEASURING <output>{blur.toFixed(1)} PX</output><input aria-label="Photo optical prefilter" type="range" min="0" max="1.5" step="0.1" value={blur} onChange={e => setBlur(Number(e.target.value))} /></label><div className="lab-metrics photo-metrics"><div><span>RECONSTRUCTION ERROR</span><strong>{mse.toFixed(5)}</strong><small>Mean squared error · linear RGB</small></div></div><p className="lab-metric-note">Compared with the unfiltered input, including any detail lost to the prefilter. Images are reduced to a maximum of {MAX_SIDE} pixels on their longest side.</p></details></div></div>}
  </div></section>;
}
