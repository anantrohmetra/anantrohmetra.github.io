# Anant Noisy Kid

Monochromatic, audio-reactive visual: microphone input is split into **logarithmic frequency bands** (50–100 Hz, 100–160 Hz, 160–230 Hz, … with band width increasing by ~1.22× each step) and drives a **P5.js** sketch made of **thousands of nodes** that connect by proximity to form geometric meshes.

## Run locally

Microphone access requires a secure context (HTTPS or `localhost`). Serve the project with any static server, then open in the browser.

```bash
# Python 3
python3 -m http.server 8080

# Node (if you have npx)
npx serve .

# Then open http://localhost:8080
```

**Click anywhere** on the page to start the microphone and the visual.

## How it works

- **Audio:** Web Audio API captures the mic, FFT analysis runs at 2048 bins. Raw bins are grouped into bands whose *width in Hz* grows logarithmically (base width 50 Hz, growth factor 1.22), so low bands are narrow and high bands wider.
- **Bands drive the visual:**  
  - Bass (first band) scales the radius and overall size.  
  - Low-mid adds slow rotation/drift.  
  - Mid/high add deterministic jitter and affect connection distance and line opacity.
- **Nodes:** ~950 points are laid out in concentric layers (tuned for smooth performance) using the golden angle for even angular spacing. Each frame their position is updated from the band energies (scale, drift, jitter).
- **Connections:** Nodes within a reactive distance are connected with white lines; opacity falls off with distance. A spatial grid limits checks to nearby nodes for performance.
- **Look:** Monochrome (dark background, white/gray lines and points), mathematically driven (golden angle, sin/cos jitter, band-driven parameters).

## Files

- `index.html` — Page and P5 container
- `sketch.js` — Audio setup, band computation, node layout, drawing
