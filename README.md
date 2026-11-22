# Zentrix - The Colors Your Camera Never Saw

Zentrix is an interactive exploration of the hidden reconstruction inside a digital camera, created for the **Unveiling Technology** hackathon. Visitors produce color artifacts from black-and-white patterns, inspect a virtual Bayer sensor, compare reconstruction methods, and simulate capture of an existing photograph. No account, server API, or upload service is required.

## What visitors learn

Most Bayer sensors place red, green, and blue filters over individual photosites. A photosite measures one filtered component, not a complete RGB pixel. Demosaicing estimates the other components from nearby sites. Patterns finer than the sampling grid can be mistaken for color: this is an aliasing artifact, not a color present in the original.

Start at the first experiment, then use **Become the camera** to compare methods. The **Fix the Camera** challenge adds an optical prefilter and exposes the trade-off between false color and fine detail. The photo section repeats the simulation on an image you choose.

## The simulation

All calculations are implemented locally in TypeScript using `Float32Array` values in normalized linear RGB. An image is converted from display-encoded sRGB to linear light, optionally blurred, sampled once per photosite on the repeating `R G / G B` lattice, reconstructed, and converted back to sRGB for display. The four alignment choices shift the same RGGB array relative to the scene. Source and output have identical dimensions.

The one-pixel black-and-white checkerboard is a deterministic aliasing example: in one phase every red and blue site samples white while every green site samples black, so bilinear reconstruction yields magenta; shifting the phase can yield green. Neither color was in the input.

### Reconstruction methods

- **Nearest neighbor:** for each missing channel, copies the closest in-bounds sample of that channel. Equal-distance ties are resolved deterministically by scan order. This simple baseline can produce jagged transitions.
- **Bilinear:** averages the adjacent samples of each missing channel using Bayer-aware 1-2-1 weights, normalized at boundaries. The measured channel is copied exactly.
- **Edge-aware:** reconstructs green at red/blue sites using the direction with the smaller difference between opposing green samples, averaging on a tie. Red and blue are then estimated from neighboring measured color-minus-green differences. Available neighbors are used at edges, with bilinear fallback if needed. Values are clamped to the displayable linear range; measured channels remain unchanged. This is a simple directional educational algorithm, not a claim to match a particular commercial demosaicer or outperform bilinear in every image.

### Simulated optical prefilter

The optional separable Gaussian blur runs on the linear-light source **before** sensor sampling. Its sigma is measured in source pixels and the kernel is normalized at boundaries. More blur can suppress high-frequency aliasing, but also removes genuine detail. A Gaussian is a useful approximation, not a complete lens or optical low-pass filter model.

### Measurements

- **False Color Score:** `100 × mean(max(R,G,B) - min(R,G,B))` in normalized linear RGB. It is meaningful as a false-color measure only for the grayscale test patterns. Zero means the output is neutral, not that it is accurate.
- **Reconstruction error:** mean squared error across all linear RGB channels, compared to the **unfiltered original**. It includes both demosaicing error and detail removed by the prefilter.
- **Detail ratio:** reconstructed mean absolute horizontal and vertical linear-luminance gradients divided by the corresponding gradients in the original. A ratio can exceed 1 when artifacts create extra edges; it is not a quality percentage. A constant reference has no meaningful ratio.
- **Photo error heatmap:** mean absolute linear RGB channel error per pixel against the original, amplified fourfold and clipped for visualization. The number shown beside the photo is MSE, not the heatmap value.

These metrics describe different properties. None alone establishes image quality.

## Personal photographs and privacy

JPG, PNG, and WebP files up to 20 MB are decoded locally in the browser and resized to at most 224 pixels along the longest side, preserving aspect ratio. Transparent pixels are composited over white. Browser decoding occurs before resizing, so very large compressed images can still use significant memory. The sample image is an original AI-generated still life; the second sample option is a crop of that same image.

A normal JPEG, PNG, or WebP has already been processed by a camera or editor. **This experiment simulates Bayer capture from an existing image. It does not recover your camera's original sensor data.** No photo is transmitted to a backend by this application.

## Architecture

- `lib/bayer.ts`: sRGB conversion, RGGB sampling, original bilinear reconstruction, and display conversion.
- `lib/demosaic.ts`: nearest-neighbor and directional edge-aware reconstruction plus method dispatch.
- `lib/blur.ts`, `lib/patterns.ts`, `lib/metrics.ts`: Gaussian prefilter, procedural sources, and measurements.
- `components/reconstruction-lab.tsx`, `components/photo-lab.tsx`, and `components/image-comparison.tsx`: interactive controls and canvas displays.
- `components/sensor-journey.tsx` and `components/sensor-scene.tsx`: optional scroll-driven WebGL visualization. The 2D scientific experiments do not depend on it.
- `tests/`: deterministic tests of sampling, interpolation, edges, alignment, metrics, blur, and motion calculations.

Intermediate source, blur, and sensor samples are reused when their inputs do not change. The photo sample loads as its section approaches the viewport. The scene has a static fallback for unsupported WebGL and reduced motion.

## Setup and tests

Use a current Node.js version with support for `--experimental-strip-types` (Node 22.6+; a current Node 22 or later is recommended).

```bash
npm install
npm run dev
```

Open the local URL printed by Next.js, normally `http://localhost:3000`. For production and verification:

```bash
npm run build
npm run start
npm run lint
npx tsc --noEmit
npm test
```

If Windows reports a permission error writing the existing `.next` build directory, a separate output directory can be used in PowerShell: `$env:ZENTRIX_BUILD_DIR='.next-verify'; npm run build`. Use the same environment variable with `npm run start` to serve that build.

## Manual first-visit test

No unfamiliar-user testing is claimed. Ask a person who has not seen the project to open the homepage, without coaching:

1. Within 15 seconds, ask what technology the site explores and what they think they can interact with.
2. Ask them to produce a colored output from a black-and-white pattern. Observe whether they find the first experiment and change its controls within a minute.
3. Ask them to explain what one sensor site measures and where the other colors come from.
4. In the lab, ask them to compare methods, change the pattern, and lower false color with the prefilter. Ask what happened to detail and how they know.
5. Ask them to use the sample or upload a photo, show the error heatmap, and explain why this is not their camera's RAW data.
6. Repeat with keyboard only and on a narrow mobile screen. Record confusion, time to reach each step, and any failures; do not supply answers during the test.

## Limitations and submission

This is an idealized, noise-free Bayer simulation. It omits real filter spectral responses, lens optics, sensor noise, exposure, white balance, color correction, compression, and proprietary camera processing. Linear RGB interpolation and a single RGGB layout are simplifications. The 3D scene is an illustrative enhancement, not a model of physical dimensions. Performance depends on the device and browser; no frame-rate guarantee is made.

The public website URL, public repository URL, and short demonstration video must be created and verified separately before submission. This repository does not assert that any of them have been published.

## Dependencies and attribution

Built with Next.js, React, TypeScript, Three.js, and React Three Fiber. The image-processing algorithms and generated patterns are project code. The example still life was generated for this project using OpenAI image generation. See `package.json` and `package-lock.json` for exact dependency versions and their respective licenses.
