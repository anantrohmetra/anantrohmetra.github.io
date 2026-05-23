/**
 * Anant Noisy Kid — Audio-reactive boids + node mesh
 * Mic → logarithmic frequency bands → boids particle system → proximity mesh
 */

let audioContext;
let analyser;
let mic;
let currentStream = null;
let fftData;
let bands = [];
let bandBoundaries = [];
let nodes = [];  // boids: { x, y, vx, vy }

const NUM_NODES = 60;
const FFT_SIZE = 1024;
const BAND_BASE_HZ = 50;
const BAND_GROWTH = 1.22;
const MAX_FREQ_HZ = 12000;

// Display
let backgroundAlpha = 255;

// Boids (tunable via UI)
const MARGIN = 80;
const boidParams = {
  perception: 305,
  separationR: 100,
  maxSpeed: 3.2,
  maxForce: 2.18,
  separationW: 0.4,
  alignmentW: 0.1,
  cohesionW: 0.1,
  edgeForce: 0.04,
  attractorW: 0.08
};

// Sensitivity vs frequency / fill color (black↔white) — data only; drawing in ui.js
let sensitivityPoints = [];
let fillColorPoints = [];

let uiVisible = true;
let captureScreenNextFrame = false;

const TREBLE_RGB_THRESHOLD = 0.12;  // above this treble level, edges use RGB

function setup() {
  createCanvas(windowWidth, windowHeight);
  frameRate(60);
  buildLogBandBoundaries();
  fftData = new Uint8Array(FFT_SIZE / 2);
  initSensitivityUI();
  initNodes();

  window.sketch = {
    get width() { return width; },
    get height() { return height; },
    get bands() { return bands; },
    get sensitivityPoints() { return sensitivityPoints; },
    get fillColorPoints() { return fillColorPoints; },
    get boidParams() { return boidParams; },
    get backgroundAlpha() { return backgroundAlpha; },
    setBackgroundAlpha(v) { backgroundAlpha = v; }
  };
  window.startAudioOnce = startAudioOnce;
  window.switchAudioInput = switchAudioInput;
  window.toggleUI = function () {
    uiVisible = !uiVisible;
    if (window.setUIVisible) window.setUIVisible(uiVisible);
  };
  window.saveHighResImage = saveHighResImage;

  if (window.initUI) window.initUI();
  initAudio();
}

function initSensitivityUI() {
  sensitivityPoints = [
    { x: 0, y: 1 }, { x: 0.25, y: 1 }, { x: 0.5, y: 1 }, { x: 0.75, y: 1 }, { x: 1, y: 1 }
  ];
  fillColorPoints = [
    { x: 0, y: 0 }, { x: 0.25, y: 0.25 }, { x: 0.5, y: 0.5 }, { x: 0.75, y: 0.75 }, { x: 1, y: 1 }
  ];
}

function buildLogBandBoundaries() {
  bandBoundaries = [BAND_BASE_HZ];
  let low = BAND_BASE_HZ;
  let width = BAND_BASE_HZ;
  while (low + width <= MAX_FREQ_HZ) {
    low += width;
    bandBoundaries.push(low);
    width *= BAND_GROWTH;
  }
  bands = new Array(bandBoundaries.length - 1).fill(0);
}

const BAND_SMOOTH = 0.35;

function getBandEnergies(sampleRate) {
  if (!analyser) return;
  analyser.getByteFrequencyData(fftData);
  const binToHz = sampleRate / FFT_SIZE;

  for (let b = 0; b < bands.length; b++) {
    const fLo = bandBoundaries[b];
    const fHi = bandBoundaries[b + 1];
    const iLo = Math.max(0, Math.floor(fLo / binToHz));
    const iHi = Math.min(fftData.length - 1, Math.ceil(fHi / binToHz));
    let sum = 0;
    let n = 0;
    for (let i = iLo; i <= iHi; i++) {
      sum += fftData[i];
      n++;
    }
    const raw = n > 0 ? (sum / n) / 255 : 0;
    bands[b] = BAND_SMOOTH * bands[b] + (1 - BAND_SMOOTH) * raw;
    bands[b] *= getSensitivityAtFreq(b / Math.max(1, bands.length - 1));
  }
}

function getSensitivityAtFreq(normFreq) {
  if (sensitivityPoints.length === 0) return 1;
  let i = 0;
  while (i + 1 < sensitivityPoints.length && sensitivityPoints[i + 1].x < normFreq) i++;
  if (i + 1 >= sensitivityPoints.length) return sensitivityPoints[sensitivityPoints.length - 1].y;
  const a = sensitivityPoints[i];
  const b = sensitivityPoints[i + 1];
  const t = (normFreq - a.x) / (b.x - a.x + 1e-9);
  return a.y + t * (b.y - a.y);
}

function getFillAtFreq(normFreq) {
  if (fillColorPoints.length === 0) return 0.5;
  let i = 0;
  while (i + 1 < fillColorPoints.length && fillColorPoints[i + 1].x < normFreq) i++;
  if (i + 1 >= fillColorPoints.length) return fillColorPoints[fillColorPoints.length - 1].y;
  const a = fillColorPoints[i];
  const b = fillColorPoints[i + 1];
  const t = (normFreq - a.x) / (b.x - a.x + 1e-9);
  return a.y + t * (b.y - a.y);
}

function initNodes() {
  nodes = [];
  for (let i = 0; i < NUM_NODES; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.5 + Math.random() * 1.5;
    nodes.push({
      x: MARGIN + Math.random() * (width - 2 * MARGIN),
      y: MARGIN + Math.random() * (height - 2 * MARGIN),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
    });
  }
}

function limit(v, max) {
  const m = Math.hypot(v.x, v.y);
  if (m > max && m > 0) {
    v.x = (v.x / m) * max;
    v.y = (v.y / m) * max;
  }
  return v;
}

function setMag(v, mag) {
  const m = Math.hypot(v.x, v.y);
  if (m > 0) {
    v.x = (v.x / m) * mag;
    v.y = (v.y / m) * mag;
  }
  return v;
}

const MIN_SPEED_MULT = 0.06;  // smallest motion when volume is 0

function updateNodePositions() {
  const overall = bands.length ? bands.reduce((a, b) => a + b, 0) / bands.length : 0;
  const bass = bands[0] ?? 0;
  const mid = bands[Math.min(4, bands.length - 1)] ?? 0;
  const speedMult = overall > 0.008 ? (0.85 + 0.4 * bass) : MIN_SPEED_MULT;
  const perception = boidParams.perception + 25 * mid;
  const cellSize = Math.min(perception + 10, 100);
  const grid = new Map();
  for (let i = 0; i < nodes.length; i++) {
    const b = nodes[i];
    const key = Math.floor(b.x / cellSize) + ',' + Math.floor(b.y / cellSize);
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push(i);
  }

  for (let i = 0; i < nodes.length; i++) {
    const b = nodes[i];
    let sep = { x: 0, y: 0 };
    let align = { x: 0, y: 0 };
    let coh = { x: 0, y: 0 };
    let sepCount = 0;
    let alignCount = 0;
    let cohCount = 0;

    const gx = Math.floor(b.x / cellSize);
    const gy = Math.floor(b.y / cellSize);
    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        const key = (gx + ox) + ',' + (gy + oy);
        const cell = grid.get(key);
        if (!cell) continue;
        for (const j of cell) {
          if (i === j) continue;
          const o = nodes[j];
          const dx = o.x - b.x;
          const dy = o.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d > perception) continue;

          if (d < boidParams.separationR && d > 0) {
            sep.x -= dx / d;
            sep.y -= dy / d;
            sepCount++;
          }
          if (d > 0) {
            align.x += o.vx;
            align.y += o.vy;
            alignCount++;
            coh.x += o.x;
            coh.y += o.y;
            cohCount++;
          }
        }
      }
    }

    if (sepCount > 0) {
      sep.x /= sepCount;
      sep.y /= sepCount;
      setMag(sep, boidParams.maxSpeed);
      sep.x -= b.vx;
      sep.y -= b.vy;
      limit(sep, boidParams.maxForce);
    }
    if (alignCount > 0) {
      align.x /= alignCount;
      align.y /= alignCount;
      setMag(align, boidParams.maxSpeed);
      align.x -= b.vx;
      align.y -= b.vy;
      limit(align, boidParams.maxForce);
    }
    if (cohCount > 0) {
      coh.x /= cohCount;
      coh.y /= cohCount;
      coh.x -= b.x;
      coh.y -= b.y;
      setMag(coh, boidParams.maxSpeed);
      coh.x -= b.vx;
      coh.y -= b.vy;
      limit(coh, boidParams.maxForce);
    }

    const cx = width / 2;
    const cy = height / 2;
    let att = { x: 0, y: 0 };
    if (boidParams.attractorW > 0) {
      att.x = cx - b.x;
      att.y = cy - b.y;
      const dist = Math.hypot(att.x, att.y);
      if (dist > 1) {
        setMag(att, boidParams.maxSpeed);
        att.x -= b.vx;
        att.y -= b.vy;
        limit(att, boidParams.maxForce);
      }
    }

    b.vx += (sep.x * boidParams.separationW + align.x * boidParams.alignmentW + coh.x * boidParams.cohesionW + att.x * boidParams.attractorW);
    b.vy += (sep.y * boidParams.separationW + align.y * boidParams.alignmentW + coh.y * boidParams.cohesionW + att.y * boidParams.attractorW);

    if (b.x < MARGIN) b.vx += boidParams.edgeForce;
    if (b.x > width - MARGIN) b.vx -= boidParams.edgeForce;
    if (b.y < MARGIN) b.vy += boidParams.edgeForce;
    if (b.y > height - MARGIN) b.vy -= boidParams.edgeForce;

    const vel = { x: b.vx, y: b.vy };
    limit(vel, boidParams.maxSpeed * speedMult);
    b.vx = vel.x;
    b.vy = vel.y;
    b.x += b.vx;
    b.y += b.vy;
    b.x = Math.max(MARGIN, Math.min(width - MARGIN, b.x));
    b.y = Math.max(MARGIN, Math.min(height - MARGIN, b.y));
  }
}

function draw() {
  if (analyser && audioContext) {
    getBandEnergies(audioContext.sampleRate);
  }

  updateNodePositions();

  const bass = bands[0] ?? 0;
  const mid = bands[Math.min(4, bands.length - 1)] ?? 0;
  const overall = bands.reduce((a, b) => a + b, 0) / Math.max(1, bands.length);

  const lineAlpha = 25 + 70 * overall;
  const treble = bands.length > 0
    ? bands.slice(Math.floor(bands.length * 0.7)).reduce((a, b) => a + b, 0) / Math.max(1, bands.length * 0.3)
    : 0;
  const useRGB = treble > TREBLE_RGB_THRESHOLD;

  background(10, 10, 12, backgroundAlpha);
  // noFill();
  strokeWeight(useRGB ? 0.6 : 0.5);

  const points = [];
  for (let i = 0; i < nodes.length; i++) {
    points.push(nodes[i].x, nodes[i].y);
  }
  const delaunay = typeof Delaunator !== 'undefined' ? Delaunator.from(points) : null;
  const edges = new Set();
  if (delaunay && delaunay.triangles) {
    const ek = (a, b) => (a < b ? `${a},${b}` : `${b},${a}`);
    for (let i = 0; i < delaunay.triangles.length; i += 3) {
      const a = delaunay.triangles[i];
      const b = delaunay.triangles[i + 1];
      const c = delaunay.triangles[i + 2];
      edges.add(ek(a, b));
      edges.add(ek(b, c));
      edges.add(ek(c, a));
    }
  }

  let edgeIndex = 0;
  const totalEdges = edges.size;
  edges.forEach(edgeKey => {
    const [i, j] = edgeKey.split(',').map(Number);
    const x1 = nodes[i].x, y1 = nodes[i].y;
    const x2 = nodes[j].x, y2 = nodes[j].y;
    const d = Math.hypot(x2 - x1, y2 - y1);
    const a = (1 - d / 150) * (lineAlpha / 255);
    if (useRGB) {
      const t = (edgeIndex / Math.max(1, totalEdges) + millis() * 0.0008) % 1;
      const r = Math.round(255 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2)));
      const g = Math.round(255 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2 + 2)));
      const b = Math.round(255 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2 + 4)));
      stroke(r, g, b, a * 255);
    } else {
      stroke(255, 255, 255, 255);
    }
    line(x1, y1, x2, y2);
    edgeIndex++;
  });

  let fillGray = 0.5;
  if (bands.length > 0) {
    let sum = 0, wSum = 0;
    for (let b = 0; b < bands.length; b++) {
      const w = getFillAtFreq(b / Math.max(1, bands.length - 1));
      sum += bands[b] * w;
      wSum += bands[b];
    }
    fillGray = wSum > 0.001 ? sum / wSum : 0.5;
    fillGray = Math.max(0, Math.min(1, fillGray));
  }
  const gray = Math.round(fillGray * 255);

  stroke(255, 200);
  const nodeSize = 0.3 + 100.1 * Math.min(1, overall);
  strokeWeight(0);
  for (let i = 0; i < nodes.length; i += 2) {
    push();
    translate(nodes[i].x, nodes[i].y);
    stroke(255);
    // strokeWeight(0.3);
    fill(gray);
    circle(0, 0,   nodeSize * (0.7 + 0.3 * fillGray));
    pop();
  }

  if (captureScreenNextFrame) {
    saveCanvas('anant-noisy-kid-' + Date.now(), 'png');
    captureScreenNextFrame = false;
  } else if (uiVisible && window.drawUI) {
    window.drawUI();
  }
}

/** Request a screen capture on the next frame (art only, no UI). */
function saveHighResImage() {
  captureScreenNextFrame = true;
}

function keyPressed() {
  if (key === 'u' || key === 'U') {
    uiVisible = !uiVisible;
    if (window.setUIVisible) window.setUIVisible(uiVisible);
  }
}

function mousePressed() {
  if (window.uiMousePressed) window.uiMousePressed(mouseX, mouseY);
}

function mouseDragged() {
  if (window.uiMouseDragged) window.uiMouseDragged(mouseX, mouseY);
}

function mouseReleased() {
  if (window.uiMouseReleased) window.uiMouseReleased();
}

function initAudio() {
  document.body.addEventListener('click', startAudioOnce, { once: true });
  if (window.showPrompt) window.showPrompt();
}

async function startAudioOnce() {
  const prompt = document.getElementById('start-prompt');
  if (prompt) prompt.remove();

  if (audioContext) return;

  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  await audioContext.resume();

  analyser = audioContext.createAnalyser();
  analyser.fftSize = FFT_SIZE;
  analyser.smoothingTimeConstant = 0.7;
  analyser.minDecibels = -60;
  analyser.maxDecibels = -20;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    currentStream = stream;
    if (audioContext.state === 'suspended') await audioContext.resume();
    mic = audioContext.createMediaStreamSource(stream);
    mic.connect(analyser);
    showAudioStatus(true);
    if (window.showInputDevicePicker) window.showInputDevicePicker();
  } catch (err) {
    console.error('Audio input error:', err);
    showAudioStatus(false, err.message);
  }
}

async function switchAudioInput(deviceId) {
  if (!audioContext || !analyser) return;
  try {
    if (currentStream) {
      currentStream.getTracks().forEach(t => t.stop());
    }
    const constraints = deviceId
      ? { audio: { deviceId: { exact: deviceId } } }
      : { audio: true };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    currentStream = stream;
    if (mic) mic.disconnect();
    mic = audioContext.createMediaStreamSource(stream);
    mic.connect(analyser);
  } catch (err) {
    console.error('Switch input error:', err);
  }
}

function showAudioStatus(ok, message) {
  const id = 'audio-status';
  if (document.getElementById(id)) return;
  const div = document.createElement('div');
  div.id = id;
  div.style.cssText = 'position:fixed; bottom:1rem; left:1rem; font:14px system-ui; z-index:1000;';
  div.style.color = ok ? '#6a6' : '#a44';
  div.textContent = ok ? 'Mic on' : (message || 'Microphone denied or unavailable.');
  document.body.appendChild(div);
  if (ok) setTimeout(() => div.remove(), 3000);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  initNodes();
}
