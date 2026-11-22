"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createCheckerboard, demosaicBilinear, sampleBayer, toDisplayRgba, type LinearImage } from "@/lib/bayer";
import { Reveal } from "@/components/reveal";

const SIZE = 80;
const OFFSETS = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }];
const ALIGNMENTS = ["RG / GB", "GR / BG", "GB / RG", "BG / GR"];

function paint(canvas: HTMLCanvasElement | null, image: LinearImage) {
  const context = canvas?.getContext("2d");
  if (!context) return;
  const pixels = context.createImageData(image.width, image.height);
  pixels.data.set(toDisplayRgba(image));
  context.putImageData(pixels, 0, 0);
}

export function Experiment() {
  const [patternSize, setPatternSize] = useState(1);
  const [alignment, setAlignment] = useState(0);
  const original = useRef<HTMLCanvasElement>(null);
  const reconstructed = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const image = createCheckerboard(SIZE, SIZE, patternSize);
    paint(original.current, image);
    paint(reconstructed.current, demosaicBilinear(sampleBayer(image, OFFSETS[alignment])));
  }, [patternSize, alignment]);

  return <section className="experiment" id="experiment"><div className="container">
    <div className="section-topline light-line"><span>THE EXPERIMENT / 01</span><span>INTERACTIVE STUDY</span></div>
    <div className="experiment-heading"><Reveal><p className="eyebrow"><span className="eyebrow-dot" /> FIRST, LOOK CLOSER</p><h2>This image has<br /><span>no color.</span></h2></Reveal><div className="experiment-intro"><span className="intro-index">01 / 03</span><p>So why does our virtual camera see green and magenta?</p><span className="intro-line" /></div></div>
    <div className="experiment-workspace">
      <div className="panel-grid">
        <figure className="image-panel"><figcaption><span><b>01</b> ORIGINAL INPUT</span><span>GRAYSCALE</span></figcaption><div className="canvas-wrap"><canvas ref={original} width={SIZE} height={SIZE} role="img" aria-label={`Original black and white checkerboard, ${patternSize} pixels per check`} /><span className="corner corner-tl" /><span className="corner corner-br" /></div><div className="panel-bottom"><span>THE SCENE</span><span>BLACK + WHITE</span></div></figure>
        <figure className="image-panel"><figcaption><span><b>02</b> CAMERA OUTPUT</span><span>RECONSTRUCTED</span></figcaption><div className="canvas-wrap"><canvas ref={reconstructed} width={SIZE} height={SIZE} role="img" aria-label={`Bayer reconstructed image, pattern size ${patternSize}, sensor alignment ${ALIGNMENTS[alignment]}`} /><span className="corner corner-tl" /><span className="corner corner-br" /></div><div className="panel-bottom"><span>THE INTERPRETATION</span><span className="rgb-key"><i /> <i /> <i /> RGB</span></div></figure>
      </div>
      <p className="experiment-prompt">Change the pattern size or shift the sensor to see the colors change.</p>
      <div className="controls"><div className="slider-control"><div className="control-label"><label htmlFor="pattern-size">PATTERN SIZE</label><output htmlFor="pattern-size">{String(patternSize).padStart(2, "0")} PX</output></div><input id="pattern-size" type="range" min="1" max="10" step="1" value={patternSize} aria-valuetext={`${patternSize} ${patternSize === 1 ? "pixel" : "pixels"} per check`} style={{ "--range-progress": `${(patternSize - 1) / 9 * 100}%` } as CSSProperties} onChange={event => setPatternSize(Number(event.target.value))} /><div className="range-ends"><span>FINE</span><span>COARSE</span></div></div><div className="control-actions"><button type="button" className="control-button" onClick={() => setAlignment(current => (current + 1) % OFFSETS.length)}>Shift sensor <span className="alignment-chip" aria-hidden="true">{ALIGNMENTS[alignment]}</span></button><button type="button" className="reset-button" disabled={patternSize === 1 && alignment === 0} onClick={() => { setPatternSize(1); setAlignment(0); }}>Reset <span aria-hidden="true">↺</span></button></div></div>
      <div className="experiment-foot"><p><span className="info-symbol">i</span><span>The sensor recorded one color value at each location. The missing values were estimated using nearby samples. For fine patterns, those estimates can introduce colors that were not in the scene.</span></p><div><span>IDEALIZED SIMULATION · NOT PHONE RAW DATA</span><span aria-live="polite">SENSOR ALIGNMENT: {ALIGNMENTS[alignment]}</span></div></div>
    </div>
    <a className="lab-next-link" href="#reconstruction-lab">Go deeper in the reconstruction lab <span aria-hidden="true">↓</span></a>
  </div></section>;
}
