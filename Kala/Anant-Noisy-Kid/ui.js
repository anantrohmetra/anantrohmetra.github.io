/**
 * UI layer for Anant Noisy Kid — pads, boid controls, audio picker, toggle.
 * Reads/writes via window.sketch; called from sketch's draw/setup/mouse.
 */
(function () {
  'use strict';

  const UI_LEFT = 24;
  const FILL_UI_LEFT = 24 + 200 + 16;
  const UI_BOTTOM = 24;
  const UI_W = 200;
  const UI_H = 120;
  const UI_POINT_R = 6;

  let draggedPointIndex = -1;
  let draggedPanel = null;

  function sketch() { return window.sketch; }

  function drawEqualizerInRect(left, top, w, h) {
    const bands = sketch().bands;
    if (!bands || bands.length < 2) return;
    noStroke();
    const n = bands.length;
    const barW = Math.max(1, w / n - 0.5);
    for (let i = 0; i < n; i++) {
      const x = left + (i / (n - 1)) * (w - barW);
      const barH = Math.max(0, bands[i] * h * 0.95);
      const y = top + h - barH;
      fill(255, 255, 255, 85);
      rect(x, y, barW, barH);
    }
  }

  function drawSensitivityUI() {
    const s = sketch();
    const top = s.height - UI_BOTTOM - UI_H;
    const left = UI_LEFT;
    const sensitivityPoints = s.sensitivityPoints;

    push();
    noStroke();
    fill(0);
    rect(left, top, UI_W, UI_H);
    drawEqualizerInRect(left, top, UI_W, UI_H);
    stroke(255);
    strokeWeight(1);
    noFill();
    rect(left, top, UI_W, UI_H);
    strokeWeight(0.5);
    line(left, top + UI_H / 2, left + UI_W, top + UI_H / 2);

    fill(255);
    noStroke();
    textSize(10);
    textAlign(LEFT, BOTTOM);
    text('freq →', left + UI_W - 28, top + UI_H - 4);
    textAlign(LEFT, TOP);
    text('↑ sens', left + 4, top + 14);

    stroke(255);
    strokeWeight(1.5);
    noFill();
    beginShape();
    for (let i = 0; i < sensitivityPoints.length; i++) {
      const px = left + sensitivityPoints[i].x * UI_W;
      const py = top + (1 - sensitivityPoints[i].y) * UI_H;
      vertex(px, py);
    }
    endShape();

    noStroke();
    fill(255);
    for (let i = 0; i < sensitivityPoints.length; i++) {
      const px = left + sensitivityPoints[i].x * UI_W;
      const py = top + (1 - sensitivityPoints[i].y) * UI_H;
      circle(px, py, UI_POINT_R * 2);
    }
    pop();
  }

  function drawFillColorUI() {
    const s = sketch();
    const top = s.height - UI_BOTTOM - UI_H;
    const left = FILL_UI_LEFT;
    const fillColorPoints = s.fillColorPoints;

    push();
    noStroke();
    fill(0);
    rect(left, top, UI_W, UI_H);
    drawEqualizerInRect(left, top, UI_W, UI_H);
    stroke(255);
    strokeWeight(1);
    noFill();
    rect(left, top, UI_W, UI_H);
    strokeWeight(0.5);
    line(left, top + UI_H / 2, left + UI_W, top + UI_H / 2);

    fill(255);
    noStroke();
    textSize(10);
    textAlign(LEFT, BOTTOM);
    text('bass → treble', left + UI_W - 52, top + UI_H - 4);
    textAlign(LEFT, TOP);
    text('↑ B / W', left + 4, top + 14);

    stroke(255);
    strokeWeight(1.5);
    noFill();
    beginShape();
    for (let i = 0; i < fillColorPoints.length; i++) {
      const px = left + fillColorPoints[i].x * UI_W;
      const py = top + (1 - fillColorPoints[i].y) * UI_H;
      vertex(px, py);
    }
    endShape();

    noStroke();
    for (let i = 0; i < fillColorPoints.length; i++) {
      const g = Math.round(fillColorPoints[i].y * 255);
      fill(g);
      const px = left + fillColorPoints[i].x * UI_W;
      const py = top + (1 - fillColorPoints[i].y) * UI_H;
      circle(px, py, UI_POINT_R * 2);
    }
    pop();
  }

  function hitTestSensitivityUI(mx, my) {
    const s = sketch();
    const top = s.height - UI_BOTTOM - UI_H;
    const sensitivityPoints = s.sensitivityPoints;
    if (mx < UI_LEFT || mx > UI_LEFT + UI_W || my < top || my > top + UI_H) return -1;
    for (let i = 0; i < sensitivityPoints.length; i++) {
      const px = UI_LEFT + sensitivityPoints[i].x * UI_W;
      const py = top + (1 - sensitivityPoints[i].y) * UI_H;
      if (Math.hypot(mx - px, my - py) <= UI_POINT_R + 4) return i;
    }
    return -1;
  }

  function hitTestFillColorUI(mx, my) {
    const s = sketch();
    const top = s.height - UI_BOTTOM - UI_H;
    const fillColorPoints = s.fillColorPoints;
    if (mx < FILL_UI_LEFT || mx > FILL_UI_LEFT + UI_W || my < top || my > top + UI_H) return -1;
    for (let i = 0; i < fillColorPoints.length; i++) {
      const px = FILL_UI_LEFT + fillColorPoints[i].x * UI_W;
      const py = top + (1 - fillColorPoints[i].y) * UI_H;
      if (Math.hypot(mx - px, my - py) <= UI_POINT_R + 4) return i;
    }
    return -1;
  }

  function createBoidControls() {
    if (document.getElementById('boid-controls')) return;
    const s = sketch();
    const boidParams = s.boidParams;
    let backgroundAlpha = s.backgroundAlpha;

    const panel = document.createElement('div');
    panel.id = 'boid-controls';
    panel.className = 'ui-panel';
    panel.style.cssText = 'position:fixed; top:1rem; left:1rem; z-index:1000; font:11px system-ui; color:#ccc; background:rgba(0,0,0,0.9); padding:10px 12px; border:1px solid #555; min-width:180px;';
    const style = document.createElement('style');
    style.textContent = '#boid-controls input[type=range] { accent-color: #fff; } #boid-controls label { display:block; margin-top:6px; color:#eee; } #boid-controls .row { display:flex; align-items:center; gap:8px; margin-top:2px; } #boid-controls .row span { min-width:32px; color:#aaa; }';
    document.head.appendChild(style);

    const sliders = [
      { key: 'separationW', label: 'Separation', min: 0, max: 3, step: 0.05 },
      { key: 'alignmentW', label: 'Alignment', min: 0, max: 2, step: 0.05 },
      { key: 'cohesionW', label: 'Cohesion', min: 0, max: 2, step: 0.05 },
      { key: 'attractorW', label: 'Attractor', min: 0, max: 0.3, step: 0.01 },
      { key: 'perception', label: 'Perception', min: 50, max: 400, step: 5 },
      { key: 'separationR', label: 'Sep. radius', min: 20, max: 150, step: 5 },
      { key: 'maxSpeed', label: 'Max speed', min: 0.5, max: 5, step: 0.1 },
      { key: 'maxForce', label: 'Max force', min: 0.1, max: 4, step: 0.1 },
      { key: 'edgeForce', label: 'Edge force', min: 0, max: 0.2, step: 0.01 }
    ];

    panel.appendChild(document.createElement('div')).textContent = 'Boids';
    panel.querySelector('div').style.cssText = 'color:#fff; font-weight:bold; margin-bottom:6px; border-bottom:1px solid #444; padding-bottom:4px;';

    sliders.forEach(({ key, label, min, max, step }) => {
      const row = document.createElement('div');
      row.className = 'row';
      const lab = document.createElement('label');
      lab.textContent = label + ':';
      const valSpan = document.createElement('span');
      valSpan.textContent = boidParams[key];
      const input = document.createElement('input');
      input.type = 'range';
      input.min = min;
      input.max = max;
      input.step = step;
      input.value = boidParams[key];
      input.addEventListener('input', () => {
        boidParams[key] = parseFloat(input.value);
        valSpan.textContent = typeof boidParams[key] === 'number' && boidParams[key] % 1 !== 0 ? boidParams[key].toFixed(2) : boidParams[key];
      });
      row.appendChild(lab);
      row.appendChild(input);
      row.appendChild(valSpan);
      panel.appendChild(row);
    });

    const sep = document.createElement('div');
    sep.style.cssText = 'border-bottom:1px solid #444; margin:6px 0 4px 0;';
    panel.appendChild(sep);
    const bgRow = document.createElement('div');
    bgRow.className = 'row';
    const bgLab = document.createElement('label');
    bgLab.textContent = 'Bg alpha:';
    const bgVal = document.createElement('span');
    bgVal.textContent = backgroundAlpha;
    const bgInput = document.createElement('input');
    bgInput.type = 'range';
    bgInput.min = 0;
    bgInput.max = 255;
    bgInput.step = 1;
    bgInput.value = backgroundAlpha;
    bgInput.addEventListener('input', () => {
      const v = parseInt(bgInput.value, 10);
      if (s.setBackgroundAlpha) s.setBackgroundAlpha(v);
      bgVal.textContent = v;
    });
    bgRow.appendChild(bgLab);
    bgRow.appendChild(bgInput);
    bgRow.appendChild(bgVal);
    panel.appendChild(bgRow);

    document.body.appendChild(panel);
  }

  function showPrompt() {
    if (document.getElementById('start-prompt')) return;
    const div = document.createElement('div');
    div.id = 'start-prompt';
    div.style.cssText = [
      'position:fixed; inset:0; display:flex; align-items:center; justify-content:center;',
      'background:rgba(10,10,12,0.85); z-index:999; cursor:pointer;',
      'font:18px/1.5 system-ui, sans-serif; color:#ccc; text-align:center; padding:2rem;',
    ].join(' ');
    div.innerHTML = '<p>Click anywhere to start audio input<br/>and begin the visual.</p>';
    div.addEventListener('click', () => { if (window.startAudioOnce) window.startAudioOnce(); });
    document.body.appendChild(div);
  }

  function showInputDevicePicker() {
    if (document.getElementById('input-device-picker')) return;
    const wrap = document.createElement('div');
    wrap.id = 'input-device-picker';
    wrap.className = 'ui-panel';
    wrap.style.cssText = 'position:fixed; top:1rem; right:1rem; z-index:1000; font:12px system-ui; color:#ccc; background:rgba(0,0,0,0.85); padding:8px 10px; border:1px solid #444;';
    wrap.innerHTML = '<label for="audio-input-select">Input: </label><select id="audio-input-select" style="margin-left:4px; background:#111; color:#eee; border:1px solid #666;"></select>';
    document.body.appendChild(wrap);
    const sel = document.getElementById('audio-input-select');
    populateAudioInputs(sel);
    sel.addEventListener('change', () => { if (window.switchAudioInput) window.switchAudioInput(sel.value); });
  }

  async function populateAudioInputs(selectEl) {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const inputs = devices.filter(d => d.kind === 'audioinput');
    selectEl.innerHTML = '';
    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = 'Default input';
    selectEl.appendChild(defaultOpt);
    inputs.forEach((d, i) => {
      const opt = document.createElement('option');
      opt.value = d.deviceId;
      opt.textContent = d.label || `Audio input ${i + 1}`;
      selectEl.appendChild(opt);
    });
  }

  function setUIVisible(visible) {
    const panels = document.querySelectorAll('#boid-controls, #input-device-picker');
    panels.forEach(el => { if (el) el.style.display = visible ? '' : 'none'; });
    const btn = document.getElementById('ui-toggle-btn');
    if (btn) btn.textContent = visible ? 'Hide UI' : 'Show UI';
  }

  function createToggleButton() {
    if (document.getElementById('ui-toggle-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'ui-toggle-btn';
    btn.textContent = 'Hide UI';
    btn.style.cssText = 'position:fixed; bottom:1rem; right:1rem; z-index:1001; padding:6px 12px; font:12px system-ui; background:rgba(0,0,0,0.85); color:#ccc; border:1px solid #555; cursor:pointer;';
    btn.addEventListener('click', () => {
      if (window.toggleUI) window.toggleUI();
    });
    document.body.appendChild(btn);
  }

  function createSaveImageButton() {
    if (document.getElementById('save-image-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'save-image-btn';
    btn.textContent = 'Save image';
    btn.style.cssText = 'position:fixed; bottom:3rem; right:1rem; z-index:1001; padding:6px 12px; font:12px system-ui; background:rgba(0,0,0,0.85); color:#ccc; border:1px solid #555; cursor:pointer;';
    btn.addEventListener('click', () => {
      if (window.saveHighResImage) window.saveHighResImage();
    });
    document.body.appendChild(btn);
  }

  function initUI() {
    if (!window.sketch) return;
    document.getElementById('boid-controls') || createBoidControls();
    createToggleButton();
    createSaveImageButton();
  }

  function drawUI() {
    if (!window.sketch) return;
    drawSensitivityUI();
    drawFillColorUI();
  }

  function uiMousePressed(mx, my) {
    let idx = hitTestFillColorUI(mx, my);
    if (idx >= 0) {
      draggedPanel = 'fill';
      draggedPointIndex = idx;
      return;
    }
    idx = hitTestSensitivityUI(mx, my);
    if (idx >= 0) {
      draggedPanel = 'sens';
      draggedPointIndex = idx;
    }
  }

  function uiMouseDragged(mx, my) {
    if (draggedPointIndex < 0 || !draggedPanel) return;
    const s = sketch();
    const top = s.height - UI_BOTTOM - UI_H;
    const yNorm = Math.max(0, Math.min(1, 1 - (my - top) / UI_H));
    const left = draggedPanel === 'sens' ? UI_LEFT : FILL_UI_LEFT;
    const xNorm = Math.max(0, Math.min(1, (mx - left) / UI_W));

    if (draggedPanel === 'sens') {
      const pts = s.sensitivityPoints;
      pts[draggedPointIndex].x = xNorm;
      pts[draggedPointIndex].y = yNorm;
      pts.sort((a, b) => a.x - b.x);
      draggedPointIndex = pts.findIndex(p => Math.abs(p.x - xNorm) < 0.02 && Math.abs(p.y - yNorm) < 0.02);
      if (draggedPointIndex < 0) draggedPointIndex = pts.findIndex(p => Math.abs(p.x - xNorm) < 0.02);
    } else {
      const pts = s.fillColorPoints;
      pts[draggedPointIndex].x = xNorm;
      pts[draggedPointIndex].y = yNorm;
      pts.sort((a, b) => a.x - b.x);
      draggedPointIndex = pts.findIndex(p => Math.abs(p.x - xNorm) < 0.02 && Math.abs(p.y - yNorm) < 0.02);
      if (draggedPointIndex < 0) draggedPointIndex = pts.findIndex(p => Math.abs(p.x - xNorm) < 0.02);
    }
    if (draggedPointIndex < 0) draggedPointIndex = 0;
  }

  function uiMouseReleased() {
    draggedPointIndex = -1;
    draggedPanel = null;
  }

  window.initUI = initUI;
  window.drawUI = drawUI;
  window.setUIVisible = setUIVisible;
  window.uiMousePressed = uiMousePressed;
  window.uiMouseDragged = uiMouseDragged;
  window.uiMouseReleased = uiMouseReleased;
  window.showPrompt = showPrompt;
  window.showInputDevicePicker = showInputDevicePicker;
})();
