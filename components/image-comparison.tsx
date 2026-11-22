"use client";

import { useEffect, useRef, useState } from "react";
import { toDisplayRgba, type LinearImage } from "@/lib/bayer";

function paint(canvas: HTMLCanvasElement | null, image: LinearImage, heatmap: boolean, reference: LinearImage) {
  const ctx = canvas?.getContext("2d");
  if (!ctx || !canvas) return;
  canvas.width = image.width; canvas.height = image.height;
  const pixels = ctx.createImageData(image.width, image.height);
  if (heatmap) {
    for (let i = 0; i < image.width * image.height; i++) {
      const error = Math.min(1, (Math.abs(image.data[i * 3] - reference.data[i * 3]) + Math.abs(image.data[i * 3 + 1] - reference.data[i * 3 + 1]) + Math.abs(image.data[i * 3 + 2] - reference.data[i * 3 + 2])) / 3 * 4);
      pixels.data[i * 4] = Math.round(255 * error); pixels.data[i * 4 + 1] = Math.round(130 * error * error); pixels.data[i * 4 + 2] = Math.round(24 + 55 * (1 - error)); pixels.data[i * 4 + 3] = 255;
    }
  } else pixels.data.set(toDisplayRgba(image));
  ctx.putImageData(pixels, 0, 0);
}

export function ImageComparison({ original, result, heatmap = false, magnifier = false }: { original: LinearImage; result: LinearImage; heatmap?: boolean; magnifier?: boolean }) {
  const left = useRef<HTMLCanvasElement>(null), right = useRef<HTMLCanvasElement>(null);
  const detailLeft = useRef<HTMLCanvasElement>(null), detailRight = useRef<HTMLCanvasElement>(null);
  const [split, setSplit] = useState(50), [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const inspected = position ? { x: Math.min(position.x, original.width - 1), y: Math.min(position.y, original.height - 1) } : null;
  useEffect(() => { paint(left.current, original, false, original); paint(right.current, result, heatmap, original); }, [original, result, heatmap]);
  useEffect(() => {
    if (!position) return;
    const x = Math.min(position.x, original.width - 1), y = Math.min(position.y, original.height - 1);
    for (const [destination, source] of [[detailLeft.current, left.current], [detailRight.current, right.current]] as const) {
      const ctx = destination?.getContext("2d"); if (!ctx || !source || !destination) continue;
      ctx.clearRect(0, 0, destination.width, destination.height); ctx.imageSmoothingEnabled = false;
      ctx.drawImage(source, x - 4, y - 4, 9, 9, 0, 0, destination.width, destination.height);
    }
  }, [position, original, result, heatmap]);
  function inspect(event: React.PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.min(original.width - 1, Math.max(0, Math.floor(((event.clientX - rect.left) / rect.width / zoom + (1 - 1 / zoom) / 2) * original.width)));
    const y = Math.min(original.height - 1, Math.max(0, Math.floor(((event.clientY - rect.top) / rect.height / zoom + (1 - 1 / zoom) / 2) * original.height)));
    setPosition({ x, y });
  }
  const i = inspected ? (inspected.y * original.width + inspected.x) * 3 : 0;
  const values = (image: LinearImage) => [0, 1, 2].map(c => image.data[i + c].toFixed(2)).join(" / ");
  return <div className="lab-comparison">
    <p className="comparison-instruction">Drag the slider to compare the original picture with the camera’s reconstruction.</p>
    <div className="lab-image-labels"><span>ORIGINAL</span><span>{heatmap ? "ERROR HEATMAP" : "RECONSTRUCTED"}</span></div>
    <div className="lab-image-frame" style={{ aspectRatio: `${original.width} / ${original.height}`, maxWidth: `${680 * original.width / original.height}px` }} onPointerMove={magnifier ? inspect : undefined} onPointerDown={magnifier ? inspect : undefined} tabIndex={magnifier ? 0 : undefined} role={magnifier ? "group" : undefined} aria-label={magnifier ? "Image pixel inspector. Use arrow keys to move the inspected pixel." : undefined} onKeyDown={magnifier ? event => { const moves: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }; const move = moves[event.key]; if (!move) return; event.preventDefault(); setPosition(p => ({ x: Math.min(original.width - 1, Math.max(0, (p?.x ?? Math.floor(original.width / 2)) + move[0])), y: Math.min(original.height - 1, Math.max(0, (p?.y ?? Math.floor(original.height / 2)) + move[1])) })); } : undefined}>
      <div className="lab-image-inner" style={{ transform: `scale(${zoom})` }}><canvas ref={right} aria-label={heatmap ? "Reconstruction error heatmap" : "Reconstructed image"} role="img" /><canvas ref={left} className="lab-image-original" style={{ clipPath: `inset(0 ${100 - Math.max(0, Math.min(100, 50 + (split - 50) / zoom))}% 0 0)` }} aria-label="Original image" role="img" /></div>
      <span className="lab-split-line" style={{ left: `${split}%` }} aria-hidden="true"><i /></span>
    </div>
    <div className="lab-comparison-controls"><label>COMPARE <input type="range" min="0" max="100" value={split} aria-label="Original and reconstruction comparison" onChange={event => setSplit(Number(event.target.value))} /></label><button type="button" onClick={() => setZoom(zoom === 1 ? 2 : zoom === 2 ? 4 : 1)}>Zoom {zoom}×</button><button type="button" onClick={() => { setSplit(50); setZoom(1); setPosition(null); }}>Reset view</button></div>
    {magnifier && <div className="lab-inspector"><div className="lab-pixel-previews" hidden={!inspected}><canvas ref={detailLeft} width="90" height="90" aria-hidden="true" /><canvas ref={detailRight} width="90" height="90" aria-hidden="true" /></div><p className="lab-inspect">{inspected ? `PIXEL ${inspected.x + 1}, ${inspected.y + 1} - ORIGINAL ${values(original)} - RECONSTRUCTED ${values(result)} (LINEAR RGB)` : "MOVE OR TAP THE IMAGE, OR FOCUS IT AND USE ARROW KEYS, TO INSPECT A PIXEL."}</p></div>}
  </div>;
}
