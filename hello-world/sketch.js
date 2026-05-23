var equations = [
  "H(Y) = -Ef(y)log q(y)",
  "an' = rd  L/(1 d' r)",
  "Sn' = rd  L/(1 d' r) for |r| < 1",
  "P(X=x) = (e^(-L)L^x)/x!",
  "H(X) = -Efp(x)log p(x)",
  "P(A d'+ B) = P(A|P(B)",
  "Eeg(j) = j(j+1)/2",
  "|B| = det(B) where B da",
  "p(x) = (1/s*sqrt(2pi))e^(-x^2)",
  "e^(ix) = cos(x) + isin(x)",
  "|A| = det(A)",
  "E[X] = d'*int f(x)dx",
  "P(A|B)P(B) = P(A d'+ B)",
  "u(x,t) = Sum an*sin(npx)e^(-n^2)",
  "Fa(x) = da(1 - e^(-Lx))",
  "Df/Dx = (f(x+h)-f(x))/h as h->0",
  "dL^2s/dtL^2 = cL^2 d^2 L^2s",
  "P(W->inf) = d'^2 int f(x)dx",
  "DY^-1 x DY+ = d'x int f(x)dx",
  "an' = rd L/(1 d' r)",
  "Ee(d nS|Sum) = N",
  "bL^2 = Ea for unbiased estimator",
  "Sn' = r^(n+1)/(1-r) d'n int_0",
];

var orbits = [];
var stars = [];
var netNodes = [];
var scrollY = 0;

// Audio - raw Web Audio API
var audioCtx, analyser, micSource, dataArray;
var audioLevel = 0;
var audioStarted = false;

// Offscreen buffer for star trails
var starBuffer;

function setup() {
  createCanvas(windowWidth, windowHeight);
  starBuffer = createGraphics(windowWidth, windowHeight);
  starBuffer.background(0, 0);

  // Inner white orbits
  for (var i = 0; i < 5; i++) {
    orbits.push({
      rx: 40 + i * 35,
      ry: 30 + i * 28,
      r: 200, g: 200, b: 210,
      a: 50 + i * 15,
      w: 1.0,
      spd: 0.003 + i * 0.001,
      off: random(TWO_PI),
      tilt: random(-0.15, 0.15)
    });
  }

  // Outer red orbits
  for (var i = 0; i < 5; i++) {
    orbits.push({
      rx: 200 + i * 55,
      ry: 150 + i * 45,
      r: 170, g: 40, b: 60,
      a: 25 + i * 10,
      w: 0.7,
      spd: 0.001 + i * 0.0005,
      off: random(TWO_PI),
      tilt: random(-0.3, 0.3)
    });
  }

  // Star boids
  for (var i = 0; i < 250; i++) {
    var ang = random(TWO_PI);
    var r = random(30, max(width, height) * 0.55);
    var spd = random(0.5, 1.2);
    var vAng = random(TWO_PI);
    stars.push({
      x: width / 2 + cos(ang) * r * random(0.4, 1.4),
      y: height / 2 + sin(ang) * r * random(0.4, 1.0),
      vx: cos(vAng) * spd,
      vy: sin(vAng) * spd,
      s: random(1, 2.5),
      al: random(100, 255),
      flSpd: random(0.01, 0.04),
      ph: random(TWO_PI),
      baseMaxSpd: spd + 0.3,
      maxSpd: spd + 0.3
    });
  }

  // Network nodes
  for (var i = 0; i < 50; i++) {
    var ang = random(TWO_PI);
    var r = random(80, max(width, height) * 0.45);
    netNodes.push({
      x: width / 2 + cos(ang) * r * random(0.5, 1.2),
      y: height / 2 + sin(ang) * r * random(0.4, 1.0),
      vx: random(-0.4, 0.4),
      vy: random(-0.4, 0.4)
    });
  }
}

function mousePressed() {
  if (!audioStarted) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    dataArray = new Uint8Array(analyser.frequencyBinCount);

    navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream) {
      micSource = audioCtx.createMediaStreamSource(stream);
      micSource.connect(analyser);
      audioStarted = true;
    }).catch(function(err) {
      console.log("Mic error:", err);
    });
  }
}

function getAudioLevel() {
  if (!audioStarted || !analyser) return 0;
  analyser.getByteTimeDomainData(dataArray);
  var sum = 0;
  for (var i = 0; i < dataArray.length; i++) {
    var v = (dataArray[i] - 128) / 128.0;
    sum += v * v;
  }
  return sqrt(sum / dataArray.length);
}

function draw() {
  background(10, 12, 16);

  var cx = width / 2;
  var cy = height / 2;

  // Audio
  var rawLevel = getAudioLevel();
  audioLevel = lerp(audioLevel, rawLevel, 0.3);
  var boost = 1.0 + audioLevel * 40;

  // Scrolling equations
  scrollY += 0.5;
  var lh = 33;
  var total = equations.length * lh;
  push();
  noStroke();
  textSize(13);
  textAlign(LEFT, TOP);
  textFont("monospace");
  for (var i = -5; i < 60; i++) {
    var idx = ((i % equations.length) + equations.length) % equations.length;
    var yy = i * lh - (scrollY % total);
    if (yy < -lh || yy > height + lh) continue;
    var dc = abs(yy - cy);
    var fade = dc < 200 ? map(dc, 0, 200, 15, 90) : 90;
    fill(130, 140, 150, fade);
    text(equations[idx], 25, yy);
  }
  pop();

  // Crosshair
  stroke(70, 70, 80, 35);
  strokeWeight(0.5);
  line(cx, 0, cx, height);
  line(0, cy, width, cy);

  // Orbits
  push();
  translate(cx, cy);
  noFill();
  for (var i = 0; i < orbits.length; i++) {
    var o = orbits[i];
    push();
    rotate(o.tilt + sin(frameCount * o.spd * 0.4) * 0.04);
    stroke(o.r, o.g, o.b, o.a);
    strokeWeight(o.w);
    ellipse(0, 0, o.rx * 2, o.ry * 2);
    pop();

    var angle = o.off + frameCount * o.spd * 2 * boost;
    var dx = cos(angle) * o.rx;
    var dy = sin(angle) * o.ry;
    push();
    rotate(o.tilt + sin(frameCount * o.spd * 0.4) * 0.04);
    noStroke();
    fill(o.r, o.g, o.b, 200);
    ellipse(dx, dy, 3, 3);
    pop();
  }

  // Center glow
  for (var i = 3; i > 0; i--) {
    noFill();
    stroke(110, 110, 180, 15 + i * 12);
    strokeWeight(1);
    ellipse(0, 0, 18 + i * 12, 14 + i * 9);
  }
  noStroke();
  fill(90, 90, 210, 140);
  ellipse(0, 0, 10, 10);
  fill(130, 130, 255, 60);
  ellipse(0, 0, 22, 22);
  pop();

  // --- Stars with trails (alpha 3 fade on separate buffer) ---
  updateBoids(boost);

  // Fade the star buffer
  starBuffer.noStroke();
  starBuffer.fill(10, 12, 16, 3);
  starBuffer.rect(0, 0, width, height);

  // Draw stars onto the buffer
  starBuffer.noStroke();
  for (var i = 0; i < stars.length; i++) {
    var p = stars[i];
    var a = p.al * (0.5 + 0.5 * sin(frameCount * p.flSpd + p.ph));
    starBuffer.fill(215, 215, 225, a);
    starBuffer.ellipse(p.x, p.y, p.s);
  }

  // Draw the star buffer onto the main canvas
  image(starBuffer, 0, 0);

  // Network nodes
  for (var i = 0; i < netNodes.length; i++) {
    var n = netNodes[i];
    n.x += n.vx;
    n.y += n.vy;
    if (n.x < 0) n.x += width;
    if (n.x > width) n.x -= width;
    if (n.y < 0) n.y += height;
    if (n.y > height) n.y -= height;
  }

  // Red constellation lines
  for (var i = 0; i < netNodes.length; i++) {
    for (var j = i + 1; j < netNodes.length; j++) {
      var dx = netNodes[i].x - netNodes[j].x;
      var dy = netNodes[i].y - netNodes[j].y;
      var d = sqrt(dx * dx + dy * dy);
      if (d < 180) {
        var al = map(d, 0, 180, 70, 0);
        stroke(170, 40, 55, al);
        strokeWeight(0.6);
        line(netNodes[i].x, netNodes[i].y, netNodes[j].x, netNodes[j].y);
      }
    }
  }

  noStroke();
  for (var i = 0; i < netNodes.length; i++) {
    fill(190, 55, 70, 100);
    ellipse(netNodes[i].x, netNodes[i].y, 2.5);
  }

  // Corner brackets
  var m = 28;
  var l = 38;
  stroke(150, 150, 160, 110);
  strokeWeight(2);
  noFill();
  line(m, m, m + l, m);
  line(m, m, m, m + l);
  line(width - m, m, width - m - l, m);
  line(width - m, m, width - m, m + l);
  line(m, height - m, m + l, height - m);
  line(m, height - m, m, height - m - l);
  line(width - m, height - m, width - m - l, height - m);
  line(width - m, height - m, width - m, height - m - l);

  // Audio prompt
  if (!audioStarted) {
    push();
    textAlign(CENTER, CENTER);
    textSize(14);
    fill(200, 200, 210, 120);
    text("click to enable audio reactivity", cx, height - 40);
    pop();
  }
}

function updateBoids(boost) {
  var perception = 80 + audioLevel * 300;
  var sepDist = 25;
  var gravStr = 0.0003;
  var sepW = 1.8;
  var aliW = 0.8;
  var cohW = 0.6;
  var attW = 0.3;
  var cx = width / 2;
  var cy = height / 2;

  for (var i = 0; i < stars.length; i++) {
    var b = stars[i];
    b.maxSpd = b.baseMaxSpd * boost;

    var sepX = 0, sepY = 0, sepCount = 0;
    var aliX = 0, aliY = 0, aliCount = 0;
    var cohX = 0, cohY = 0, cohCount = 0;

    for (var j = 0; j < stars.length; j++) {
      if (i === j) continue;
      var dx = stars[j].x - b.x;
      var dy = stars[j].y - b.y;
      var d = sqrt(dx * dx + dy * dy);
      if (d > perception) continue;

      if (d < sepDist && d > 0) {
        sepX -= dx / d;
        sepY -= dy / d;
        sepCount++;
      }
      if (d < perception * 0.75) {
        aliX += stars[j].vx;
        aliY += stars[j].vy;
        aliCount++;
      }
      cohX += stars[j].x;
      cohY += stars[j].y;
      cohCount++;
    }

    var ax = 0, ay = 0;

    if (sepCount > 0) {
      ax += (sepX / sepCount) * sepW;
      ay += (sepY / sepCount) * sepW;
    }
    if (aliCount > 0) {
      ax += ((aliX / aliCount) - b.vx) * aliW;
      ay += ((aliY / aliCount) - b.vy) * aliW;
    }
    if (cohCount > 0) {
      var tx = (cohX / cohCount) - b.x;
      var ty = (cohY / cohCount) - b.y;
      ax += tx * 0.01 * cohW;
      ay += ty * 0.01 * cohW;
    }

    // Gravity toward center
    var gcx = cx - b.x;
    var gcy = cy - b.y;
    var gd = sqrt(gcx * gcx + gcy * gcy);
    if (gd > 0) {
      ax += (gcx / gd) * gd * gravStr;
      ay += (gcy / gd) * gd * gravStr;
    }

    // Attraction
    if (cohCount > 0) {
      var atx = (cohX / cohCount) - b.x;
      var aty = (cohY / cohCount) - b.y;
      var atd = sqrt(atx * atx + aty * aty);
      if (atd > 0) {
        ax += (atx / atd) * attW;
        ay += (aty / atd) * attW;
      }
    }

    b.vx += ax * 0.1;
    b.vy += ay * 0.1;

    var spd = sqrt(b.vx * b.vx + b.vy * b.vy);
    if (spd > b.maxSpd) {
      b.vx = (b.vx / spd) * b.maxSpd;
      b.vy = (b.vy / spd) * b.maxSpd;
    }

    b.x += b.vx;
    b.y += b.vy;

    if (b.x < 0) b.x += width;
    if (b.x > width) b.x -= width;
    if (b.y < 0) b.y += height;
    if (b.y > height) b.y -= height;
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  starBuffer.resizeCanvas(windowWidth, windowHeight);
}
