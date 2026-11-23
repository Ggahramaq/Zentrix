"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { bayerChannel, createCheckerboard, demosaicBilinear, sampleBayer } from "@/lib/bayer";
import { getContributingSites } from "@/lib/bayer-inspection";

const SIDE = 12;
const channels = ["Red", "Green", "Blue"] as const;
const channelClasses = ["red", "green", "blue"] as const;
const mosaic = sampleBayer(createCheckerboard(SIDE, SIDE, 3));
const image = demosaicBilinear(mosaic);
const indexes = Array.from({ length: SIDE * SIDE }, (_, index) => index);
const percent = (value: number) => `${Math.round(value * 100)}%`;

export function BayerSensor() {
  const [selected, setSelected] = useState(5 * SIDE + 5);
  const [announcement, setAnnouncement] = useState("");
  const [revealed, setRevealed] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const x = selected % SIDE;
  const y = Math.floor(selected / SIDE);
  const measured = bayerChannel(x, y, mosaic.offset);
  const neighbors = getContributingSites(mosaic, x, y);
  const neighborIndexes = new Set(neighbors.map(site => site.y * SIDE + site.x));

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setRevealed(true);
        observer.disconnect();
      }
    }, { threshold: 0.18 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  function moveSelection(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextX = index % SIDE;
    let nextY = Math.floor(index / SIDE);
    if (event.key === "ArrowLeft") nextX--;
    else if (event.key === "ArrowRight") nextX++;
    else if (event.key === "ArrowUp") nextY--;
    else if (event.key === "ArrowDown") nextY++;
    else return;
    event.preventDefault();
    nextX = Math.max(0, Math.min(SIDE - 1, nextX));
    nextY = Math.max(0, Math.min(SIDE - 1, nextY));
    const next = nextY * SIDE + nextX;
    setSelected(next);
    setAnnouncement(`Row ${nextY + 1}, column ${nextX + 1}: ${channels[bayerChannel(nextX, nextY, mosaic.offset)]} filter measured ${percent(mosaic.data[next])}.`);
    buttons.current[next]?.focus();
  }

  return <div className="bayer-visual" ref={container}>
    <div className="bayer-visual-heading"><span>INSIDE THE SENSOR</span><span>12 × 12 SPOTS</span></div>
    <p className="discovery-instruction">Tap a square to explore. Each color shows what kind of light that spot can measure.</p>
    <div className="bayer-stage">
      <div className="bayer-board-wrap" id="sensor-grid">
        <div className={`bayer-board${revealed ? " is-revealed" : ""}`} role="group" aria-label="Bayer sensor sites. Use arrow keys to move between sites.">
          {indexes.map(index => {
            const col = index % SIDE, row = Math.floor(index / SIDE);
            const channel = bayerChannel(col, row, mosaic.offset);
            const isSelected = index === selected;
            return <button
              key={index}
              ref={element => { buttons.current[index] = element; }}
              type="button"
              className={`bayer-tile ${channelClasses[channel]}${isSelected ? " is-selected" : ""}${neighborIndexes.has(index) ? " is-neighbor" : ""}`}
              style={{ "--tile-delay": `${(col + row) * 20}ms` } as CSSProperties}
              aria-label={`${channels[channel]} filter, row ${row + 1}, column ${col + 1}`}
              aria-pressed={isSelected}
              tabIndex={isSelected ? 0 : -1}
              onPointerEnter={event => { if (event.pointerType !== "touch") setSelected(index); }}
              onClick={() => { setSelected(index); setAnnouncement(`Row ${row + 1}, column ${col + 1}: ${channels[channel]} filter measured ${percent(mosaic.data[index])}.`); }}
              onFocus={() => setSelected(index)}
              onKeyDown={event => moveSelection(event, index)}
            ><span className="bayer-tile-face" /></button>;
          })}
          <svg className="bayer-connections" viewBox={`0 0 ${SIDE} ${SIDE}`} preserveAspectRatio="none" aria-hidden="true">
            {neighbors.map(site => <line key={`${selected}-${site.x}-${site.y}`} className={`bayer-wire ${channelClasses[site.channel]}`} x1={site.x + 0.5} y1={site.y + 0.5} x2={x + 0.5} y2={y + 0.5} pathLength="1" />)}
          </svg>
          <span className="bayer-selector" aria-hidden="true" style={{ left: `${(x + 0.5) / SIDE * 100}%`, top: `${(y + 0.5) / SIDE * 100}%` }} />
        </div>
      </div>
    </div>
    <p className="visually-hidden" role="status">{announcement}</p>
    <div className="bayer-readout">
      <div className="bayer-readout-top"><span><i /> YOUR SPOT</span><span>ROW {String(y + 1).padStart(2, "0")} / COL {String(x + 1).padStart(2, "0")}</span></div>
      <p className="sensor-discovery">This spot collects a clue about <strong>{channels[measured].toUpperCase()}</strong> light. The camera uses the connected spots to guess the other two colors.</p>
      <div className="bayer-readout-channels">{channels.map((channel, index) => <div className={`bayer-reading ${channelClasses[index]}${index === measured ? " is-measured" : ""}`} key={channel}>
        <span><i />{channel}</span><small>{index === measured ? "Collected here" : "Guessed from nearby"}</small><strong>{percent(image.data[selected * 3 + index])}</strong>
      </div>)}</div>
      <p>The numbers show the clues and guesses for this example.</p>
    </div>
    <p className="bayer-hint">HOVER OR TAP A SPOT <span aria-hidden="true">+</span> USE ARROW KEYS TO EXPLORE</p>
  </div>;
}
