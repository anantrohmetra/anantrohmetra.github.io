// Black Hole — single-word bursts from the void
// p5.js sketch (2D) — monochrome sci-fi

let stars = [];
let fragments = [];
let time = 0;

const BH_RADIUS = 0.1;

// ─────────────────────────────────────
//  Word pools
// ─────────────────────────────────────
const WORDS_MARX = [
  "history", "class", "struggle", "capital", "labour", "production",
  "weapon", "criticism", "solid", "air", "holy", "profaned",
  "philosophers", "world", "change", "vampire", "ruling", "ideas",
  "accumulation", "wealth", "misery", "tradition", "nightmare",
  "generations", "commodity", "abolition", "revolution", "proletariat",
  "bourgeois", "wage", "alienation", "consciousness", "material",
  "liberation", "emancipation", "contradiction", "surplus", "value",
  "exploitation", "fetishism", "dialectic", "praxis", "negation",
];

const WORDS_CARDEW = [
  "revolutionary", "irresistible", "improviser", "composer", "music",
  "politics", "superstructure", "transform", "bourgeois", "hoards",
  "galleries", "learning", "weapon", "struggle", "smash", "culture",
  "liberation", "decoration", "people", "serve", "notation", "score",
  "silence", "collective", "resistance", "solidarity", "dissonance",
  "cadence", "treatise", "refusal", "unity", "praxis",
];

const WORDS_SWARTZ = [
  "information", "power", "justice", "unjust", "guerilla", "access",
  "knowledge", "curious", "afraid", "deeply", "hero", "story",
  "share", "world", "fight", "open", "duty", "resources",
  "freedom", "download", "manifest", "network", "encrypt", "public",
  "domain", "copyright", "abolish", "distribute", "code", "hack",
  "truth", "transparency", "watchdog", "resist", "archive",
];

const ALL_WORDS = [...WORDS_MARX, ...WORDS_CARDEW, ...WORDS_SWARTZ];

// ─────────────────────────────────────
//  Chance operations — mangle single words
// ─────────────────────────────────────
function scrambleWord() {
  const word = random(ALL_WORDS);
  const chars = word.split('');
  const method = floor(random(5));

  switch (method) {
    case 0: {
      for (let i = chars.length - 1; i > 0; i--) {
        const j = floor(random(i + 1));
        [chars[i], chars[j]] = [chars[j], chars[i]];
      }
      return chars.join('');
    }
    case 1: {
      return chars.filter(() => random() > 0.35).join('');
    }
    case 2: {
      return chars.reverse().join('');
    }
    case 3: {
      const other = random(ALL_WORDS);
      const cut = floor(random(1, chars.length - 1));
      const oCut = floor(random(1, other.length));
      return word.slice(0, cut) + other.slice(oCut);
    }
    case 4: {
      const s = floor(random(chars.length - 1));
      const e = s + floor(random(2, min(5, chars.length - s)));
      return word.slice(s, e);
    }
  }
}

// ─────────────────────────────────────
//  Fragment system
// ─────────────────────────────────────
function spawnBurst(cx, cy, bhR) {
  const count = floor(random(4, 12));
  const burstAngle = random(TWO_PI);
  const spread = random(0.3, 1.0);

  for (let i = 0; i < count; i++) {
    const angle = burstAngle + random(-spread, spread);
    const speed = random(0.6, 2.8);
    const word = scrambleWord();

    fragments.push({
      x: cx + cos(angle) * bhR * 1.05,
      y: cy + sin(angle) * bhR * 1.05,
      vx: cos(angle) * speed,
      vy: sin(angle) * speed,
      text: word,
      maxAlpha: random(30, 80),
      size: random(9, 16),
      life: 1,
      decay: random(0.002, 0.005),
      rotation: random(-0.2, 0.2),
      rotSpeed: random(-0.003, 0.003),
      glow: random() > 0.6,
      shade: floor(random(140, 255)),
    });
  }
}

function updateFragments() {
  for (let i = fragments.length - 1; i >= 0; i--) {
    const f = fragments[i];
    f.x += f.vx;
    f.y += f.vy;
    f.vx *= 0.996;
    f.vy *= 0.996;
    f.life -= f.decay;
    f.rotation += f.rotSpeed;
    if (f.life <= 0) fragments.splice(i, 1);
  }
}

function drawFragments() {
  textFont('monospace');
  textAlign(CENTER, CENTER);

  for (const f of fragments) {
    const a = f.maxAlpha * f.life;
    if (a < 1) continue;

    push();
    translate(f.x, f.y);
    rotate(f.rotation);
    textSize(f.size);

    // glow layer
    if (f.glow) {
      noStroke();
      fill(f.shade, a * 0.15);
      textSize(f.size + 1);
      text(f.text, 0, 0);
      textSize(f.size);
    }

    noStroke();
    fill(f.shade, a);
    text(f.text, 0, 0);
    pop();
  }
}

// ─────────────────────────────────────
//  Stars — sparse, white/grey
// ─────────────────────────────────────
function initStars() {
  stars = [];
  const count = floor(width * height / 4000);
  for (let i = 0; i < count; i++) {
    const shade = random(160, 255);
    stars.push({
      x: random(width),
      y: random(height),
      r: random(0.3, 1.0),
      brightness: random(0.3, 1),
      twinkleSpeed: random(0.005, 0.02),
      phase: random(TWO_PI),
      shade: shade,
    });
  }
}

function drawStars(cx, cy, bhR) {
  noStroke();
  for (const s of stars) {
    const dx = s.x - cx, dy = s.y - cy;
    const dist = sqrt(dx * dx + dy * dy);

    let drawX = s.x, drawY = s.y;
    if (dist < bhR * 7 && dist > bhR * 1.6) {
      const lensStrength = pow(map(dist, bhR * 1.6, bhR * 7, 1, 0), 2) * bhR * 0.7;
      const angle = atan2(dy, dx);
      drawX += cos(angle) * lensStrength;
      drawY += sin(angle) * lensStrength;
    }
    if (dist < bhR * 1.6) continue;

    const twinkle = 0.5 + 0.5 * sin(time * s.twinkleSpeed * 60 + s.phase);
    const a = (0.25 + 0.75 * s.brightness * twinkle) * 255;

    fill(s.shade, min(a, 255));
    ellipse(drawX, drawY, s.r * 2, s.r * 2);
  }
}

// ─────────────────────────────────────
//  Black hole — dissolves into space, monochrome
// ─────────────────────────────────────
function drawBlackHole(cx, cy, bhR) {
  noStroke();

  // outer dissolve — black fades gradually into background
  for (let i = 60; i >= 0; i--) {
    const t = i / 60;
    const r = bhR * (0.6 + t * 4.0);
    const a = pow(1 - t, 3) * 35;
    fill(3, a);
    ellipse(cx, cy, r * 2, r * 2);
  }

  // mid dissolve
  for (let i = 40; i >= 0; i--) {
    const t = i / 40;
    const r = bhR * (0.5 + t * 2.0);
    const a = pow(1 - t, 2.5) * 60;
    fill(2, a);
    ellipse(cx, cy, r * 2, r * 2);
  }

  // core dissolve
  for (let i = 30; i >= 0; i--) {
    const t = i / 30;
    const r = bhR * (0.3 + t * 1.2);
    const a = pow(1 - t, 2) * 120;
    fill(1, a);
    ellipse(cx, cy, r * 2, r * 2);
  }

  // soft photon haze — faint grey glow
  for (let i = 35; i >= 0; i--) {
    const t = i / 35;
    const r = bhR * (0.9 + t * 1.8);
    const a = pow(1 - t, 3) * 6;
    fill(80, a);
    ellipse(cx, cy, r * 2, r * 2);
  }

  // ghost photon ring — soft grey
  noFill();
  for (let i = 20; i >= 0; i--) {
    const t = i / 20;
    const r = bhR * (0.95 + t * 0.4);
    const a = pow(1 - t, 2) * 25;
    const g = lerp(120, 40, t);
    stroke(g, a);
    strokeWeight(1 + t * 4);
    ellipse(cx, cy, r * 2, r * 2);
  }

  // faint polar wisps — grey
  noStroke();
  for (let i = 12; i >= 0; i--) {
    const t = i / 12;
    const sz = bhR * 0.12 * (1 - t);
    fill(100, (1 - t) * 12);
    ellipse(cx, cy - bhR * 0.9, sz * 2.5, sz * 5);
    ellipse(cx, cy + bhR * 0.9, sz * 2.5, sz * 5);
  }

  // deep void center
  for (let i = 20; i >= 0; i--) {
    const t = i / 20;
    const r = bhR * (0.15 + t * 0.55);
    const a = pow(1 - t, 1.5) * 255;
    fill(0, a);
    ellipse(cx, cy, r * 2, r * 2);
  }
}

function drawLensingRing(cx, cy, bhR) {
  noStroke();
  for (let i = 20; i >= 0; i--) {
    const t = i / 20;
    const r = bhR * (1.3 + t * 0.6);
    fill(70, pow(1 - t, 3) * 4);
    ellipse(cx, cy, r * 2, r * 2);
  }
}

// ─────────────────────────────────────
//  Scan lines overlay
// ─────────────────────────────────────
function drawScanlines() {
  stroke(0, 18);
  strokeWeight(0.5);
  for (let y = 0; y < height; y += 3) {
    line(0, y, width, y);
  }
}

// ─────────────────────────────────────
//  Setup + Draw
// ─────────────────────────────────────
let nextBurst = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  initStars();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  initStars();
}

function draw() {
  background(4);
  time = millis() * 0.001;

  const cx = width / 2;
  const cy = height / 2;
  const bhR = min(width, height) * BH_RADIUS;

  drawStars(cx, cy, bhR);
  drawLensingRing(cx, cy, bhR);
  drawBlackHole(cx, cy, bhR);

  // chance-triggered bursts
  if (millis() > nextBurst) {
    spawnBurst(cx, cy, bhR);
    nextBurst = millis() + random(300, 2000);
  }

  updateFragments();
  drawFragments();
  drawScanlines();
}
