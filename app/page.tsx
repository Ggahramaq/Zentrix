import { Experiment } from "@/components/experiment";
import { Header, Mark } from "@/components/header";
import { Reveal } from "@/components/reveal";
import { BayerSensor } from "@/components/bayer-sensor";
import { SensorJourney } from "@/components/sensor-journey";
import { ReconstructionLab } from "@/components/reconstruction-lab";
import { PhotoLab } from "@/components/photo-lab";

const steps = [
  { number: "01", title: "Measure", text: "Each tiny spot measures light through one color filter.", type: "measure" },
  { number: "02", title: "Guess the missing pieces", text: "Nearby measurements help estimate the other two colors.", type: "estimate" },
  { number: "03", title: "Build the picture", text: "The camera combines measured and estimated values into a full-color image.", type: "reconstruct" },
];

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return <span aria-hidden="true" className="arrow">{diagonal ? "↗" : "→"}</span>;
}

function SensorGraphic() {
  return <div className="sensor-graphic" aria-hidden="true">
    <div className="sensor-orbit orbit-one" /><div className="sensor-orbit orbit-two" />
    <div className="sensor-axis axis-horizontal" /><div className="sensor-axis axis-vertical" />
    <div className="sensor-frame"><div className="sensor-inner"><div className="sensor-grid" /></div></div>
    <span className="graphic-coordinate coordinate-top">FIG. 01 / SENSOR ARRAY</span>
    <span className="graphic-coordinate coordinate-bottom">LIGHT IN <span>↗</span> COLOR OUT</span>
    <span className="graphic-plus plus-a">+</span><span className="graphic-plus plus-b">+</span>
  </div>;
}

function StepGraphic({ type }: { type: string }) {
  return <div className={`step-graphic ${type}`} aria-hidden="true"><div className="mini-grid">{Array.from({ length: 36 }, (_, i) => <i key={i} className={((Math.floor(i / 6) % 2) === 0 ? (i % 2 === 0 ? "r" : "g") : (i % 2 === 0 ? "g" : "b"))} />)}</div><span className="step-line" /></div>;
}

export default function Home() {
  return <>
    <Header />
    <main>
      <SensorJourney />
      <section className="hero" id="top">
        <div className="hero-inner container">
          <div className="hero-copy">
            <p className="eyebrow hero-eyebrow"><span className="eyebrow-dot" /> THE HIDDEN SCIENCE OF EVERY PHOTO</p>
            <h1 aria-label="Your camera invents color."><span className="headline-line"><span style={{ animationDelay: "0.1s" }}>Your</span> <span style={{ animationDelay: "0.22s" }}>camera</span></span><span className="headline-line"><span style={{ animationDelay: "0.34s" }}>invents</span> <span className="muted-word" style={{ animationDelay: "0.46s" }}>color.</span></span></h1>
            <p className="hero-description" aria-label="Your camera measures one piece of color information at each tiny spot, then calculates the missing pieces. Sometimes it gets them wrong. Want to see it happen?">{"Your camera measures one piece of color information at each tiny spot, then calculates the missing pieces. Sometimes it gets them wrong. Want to see it happen?".split(" ").map((word, index) => <span aria-hidden="true" key={`${word}-${index}`} style={{ animationDelay: `${0.5 + index * 0.035}s` }}>{word} </span>)}</p>
            <div className="hero-actions"><a className="button button-primary" href="#sensor-grid">Show me how <Arrow diagonal /></a><a className="text-link" href="#experiment">See the illusion <Arrow /></a></div>
          </div>
          <div className="hero-visual"><SensorGraphic /><div className="visual-caption"><span>THE ART OF SEEING</span><span>01 - 03</span></div></div>
        </div>
        <div className="hero-bottom container"><span>AN INTERACTIVE FIELD NOTE</span><a href="#experiment">SCROLL TO DISCOVER <span>↓</span></a><span>ZENTRIX / 001</span></div>
      </section>
      <section className="journey-track journey-track-static" id="sensor" aria-label="From camera lens to reconstructed image">
        <div className="container journey-track-inner">
          <div className="journey-story">
            <p className="eyebrow"><span className="eyebrow-dot" /> INSIDE THE CAMERA</p>
            <h2>One tiny spot.<br />One color measurement.</h2>
            <p>A camera sensor has millions of tiny spots. Each measures light through a red, green, or blue filter. A full-color picture needs all three values at each spot. Where do the missing ones come from?</p>
            <div className="journey-legend"><span><i /> MEASURED</span><span><i /> ESTIMATED FROM NEIGHBORS</span></div>
            <p className="journey-note">A conceptual visualization. Explore the actual reconstruction below.</p>
            <a href="#experiment" className="text-link">Go to the experiment <span className="arrow" aria-hidden="true">→</span></a>
          </div>
          <BayerSensor />
        </div>
      </section>
      <Experiment />
      <ReconstructionLab />
      <PhotoLab />
      <section className="how-section" id="how-it-works">
        <div className="container">
          <div className="section-topline"><span>THE PROCESS / 02</span><span>FROM LIGHT TO IMAGE</span></div>
          <div className="how-intro"><Reveal><p className="eyebrow blue-label">A LITTLE SENSOR SCIENCE</p><h2>One measurement.<br /><span>Three colors.</span></h2></Reveal><p>Every photograph begins with an incomplete picture. A remarkably clever process fills in the rest.</p></div>
          <div className="steps">{steps.map(step => <article className="step" key={step.number}><div className="step-header"><span>{step.number} / 03</span><span>↗</span></div><StepGraphic type={step.type} /><div className="step-copy"><h3>{step.title}</h3><p>{step.text}</p></div></article>)}</div>
          <div className="process-note"><span className="process-dots"><i /><i /><i /></span><span>MORE GREEN SITES HELP CAPTURE DETAIL</span><span>R G / G B</span></div>
        </div>
      </section>
      <section className="closing" id="about"><div className="container closing-inner"><div className="closing-kicker"><span className="eyebrow-dot" /> A NEW WAY OF SEEING</div><Reveal><h2>You&apos;ve seen the image.<br /><span>Now see the invisible.</span></h2></Reveal><div className="closing-bottom"><p>The next time you take a photograph, remember: part of its color was calculated.</p><a href="#experiment" className="button button-light">Experiment again <Arrow diagonal /></a></div><div className="closing-art" aria-hidden="true"><i /><i /><i /><i /></div></div></section>
    </main>
    <footer><div className="container footer-inner"><div><a className="brand footer-brand" href="#top"><Mark /> <span>ZENTRIX</span></a><p>An exploration of the unseen science<br />behind every photograph.</p></div><div className="footer-right"><span>MADE FOR CURIOUS MINDS</span><span>AN INTERACTIVE SIMULATION</span></div></div><div className="container footer-base"><span>ZENTRIX © 2026</span><span>LOOK CLOSER.</span></div></footer>
  </>;
}
