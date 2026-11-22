"use client";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { bayerChannel, createCheckerboard, demosaicBilinear, linearToSrgb, sampleBayer, toDisplayRgba, type LinearImage } from "@/lib/bayer";
import { getContributingSites } from "@/lib/bayer-inspection";
import { falseColorScore } from "@/lib/metrics";
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
  const simulation = useMemo(() => {
    const source = createCheckerboard(SIZE, SIZE, patternSize);
    const mosaic = sampleBayer(source, OFFSETS[alignment]);
    return { source, mosaic, result: demosaicBilinear(mosaic) };
  }, [patternSize, alignment]);
  const samplePositions = [[8, 8], [9, 8], [8, 9], [9, 9]] as const;
  const names = ["Red", "Green", "Blue"] as const;
  const sampleIndex = 8 * SIZE + 8;
  const rgb = [0, 1, 2].map(channel => simulation.result.data[sampleIndex * 3 + channel]);
  const measuredChannel = bayerChannel(8, 8, simulation.mosaic.offset);
  const neighbors = getContributingSites(simulation.mosaic, 8, 8);
  const unwantedColor = falseColorScore(simulation.result);
  const resultColor = `rgb(${rgb.map(value => Math.round(linearToSrgb(value) * 255)).join(" ")})`;

  useEffect(() => {
    paint(original.current, simulation.source);
    paint(reconstructed.current, simulation.result);
  }, [simulation]);

  return <section className="experiment" id="experiment"><div className="container">
    <div className="section-topline light-line"><span>THE EXPERIMENT / 01</span><span>INTERACTIVE STUDY</span></div>
    <div className="experiment-heading"><Reveal><p className="eyebrow"><span className="eyebrow-dot" /> FIRST, LOOK CLOSER</p><h2>This image has<br /><span>no color.</span></h2></Reveal><div className="experiment-intro"><span className="intro-index">01 / 03</span><p>So why does our virtual camera see green and magenta?</p><span className="intro-line" /></div></div>
    <div className="experiment-workspace">
      <div className="panel-grid">
        <figure className="image-panel"><figcaption><span><b>01</b> ORIGINAL INPUT</span><span>GRAYSCALE</span></figcaption><div className="canvas-wrap"><canvas ref={original} width={SIZE} height={SIZE} role="img" aria-label={`Original black and white checkerboard, ${patternSize} pixels per check`} /><span className="corner corner-tl" /><span className="corner corner-br" /></div><div className="panel-bottom"><span>THE SCENE</span><span>BLACK + WHITE</span></div></figure>
        <figure className="image-panel"><figcaption><span><b>02</b> CAMERA OUTPUT</span><span>RECONSTRUCTED</span></figcaption><div className="canvas-wrap"><canvas ref={reconstructed} width={SIZE} height={SIZE} role="img" aria-label={`Bayer reconstructed image, pattern size ${patternSize}, sensor alignment ${ALIGNMENTS[alignment]}`} /><span className="corner corner-tl" /><span className="corner corner-br" /></div><div className="panel-bottom"><span>THE INTERPRETATION</span><span className="rgb-key"><i /> <i /> <i /> RGB</span></div></figure>
      </div>
      <p className="experiment-prompt">Both pictures came from the same black-and-white pattern. Where did the color come from?</p>
      <details className="why-details"><summary>Show me why</summary><div className="discovery-stages">
        <div><span className="stage-number">01 / ORIGINAL</span><div className="sample-grid" aria-label="A magnified two by two region of the original pattern">{samplePositions.map(([x, y]) => <span key={`${x}-${y}`} style={{ background: simulation.source.data[(y * SIZE + x) * 3] ? "#fff" : "#10151d" }} />)}</div><p>This picture contains only black and white.</p></div>
        <div><span className="stage-number">02 / SENSOR MEASUREMENTS</span><div className="sample-grid sensor-samples">{samplePositions.map(([x, y]) => { const channel = bayerChannel(x, y, simulation.mosaic.offset); const value = simulation.mosaic.data[y * SIZE + x]; return <span role="img" className={`sample-${names[channel].toLowerCase()}`} key={`${x}-${y}`} aria-label={`${names[channel]} filter measured ${Math.round(value * 100)} percent`}><b>{names[channel][0]}</b><small>{Math.round(value * 100)}%</small></span>; })}</div><p>Each spot measures light through one filter. The letters name the filters; percentages show the actual measurements.</p></div>
        <div><span className="stage-number">03 / RECONSTRUCTED</span><div role="img" className="sample-result" style={{ backgroundColor: resultColor }} aria-label={`Reconstructed top-left spot: red ${Math.round(rgb[0] * 100)} percent, green ${Math.round(rgb[1] * 100)} percent, blue ${Math.round(rgb[2] * 100)} percent`} /><p>The camera combines a measurement with estimates from nearby spots. Here: R {Math.round(rgb[0] * 100)}% · G {Math.round(rgb[1] * 100)}% · B {Math.round(rgb[2] * 100)}% in linear light. The pattern can create color absent from the original.</p></div>
      </div></details>
      <p className="experiment-prompt">What if the sensor started in a different place? Move it one step and watch which filters measure white or black.</p>
      <p className="experiment-prompt">The picture stays the same when the sensor moves; the filters sampling it change. Current unwanted color: {unwantedColor.toFixed(2)}. Lower means less color in this grayscale test.</p>
      <details className="calculation-details"><summary>See the reconstructed spot’s calculation</summary><p>The top-left spot in the example measured {names[measuredChannel]} at {Math.round(simulation.mosaic.data[sampleIndex] * 100)}%. The other values use the actual neighboring samples below, including spots outside the four shown above.</p>{names.map((name, channel) => {
        if (channel === measuredChannel) return null;
        const sites = neighbors.filter(site => site.channel === channel);
        const totalWeight = sites.reduce((sum, site) => sum + site.weight, 0);
        return <p key={name}><strong>{name}:</strong> ({sites.map(site => `${Math.round(simulation.mosaic.data[site.y * SIZE + site.x] * 100)}% × ${site.weight}`).join(" + ")}) ÷ {totalWeight} = {Math.round(rgb[channel] * 100)}%.</p>;
      })}</details>
      <div className="controls"><div className="slider-control"><div className="control-label"><label htmlFor="pattern-size">SIZE OF THE BLACK-AND-WHITE SQUARES</label><output htmlFor="pattern-size">{String(patternSize).padStart(2, "0")} PX</output></div><input id="pattern-size" type="range" min="1" max="10" step="1" value={patternSize} aria-valuetext={`${patternSize} ${patternSize === 1 ? "pixel" : "pixels"} per check`} style={{ "--range-progress": `${(patternSize - 1) / 9 * 100}%` } as CSSProperties} onChange={event => setPatternSize(Number(event.target.value))} /><div className="range-ends"><span>FINE</span><span>COARSE</span></div></div><div className="control-actions"><button type="button" className="control-button" onClick={() => setAlignment(current => (current + 1) % OFFSETS.length)}>Move the sensor one step <span className="alignment-chip" aria-hidden="true">{ALIGNMENTS[alignment]}</span></button><button type="button" className="reset-button" disabled={patternSize === 1 && alignment === 0} onClick={() => { setPatternSize(1); setAlignment(0); }}>Reset <span aria-hidden="true">↺</span></button></div></div>
      <div className="experiment-foot"><p><span className="info-symbol">i</span><span>The sensor recorded one color value at each location. The missing values were estimated using nearby samples. For fine patterns, those estimates can introduce colors that were not in the scene.</span></p><div><span>IDEALIZED SIMULATION · NOT PHONE RAW DATA</span><span aria-live="polite">WHERE THE SENSOR STARTS: {ALIGNMENTS[alignment]}</span></div></div>
    </div>
    <a className="lab-next-link" href="#reconstruction-lab">Go deeper in the reconstruction lab <span aria-hidden="true">↓</span></a>
  </div></section>;
}
