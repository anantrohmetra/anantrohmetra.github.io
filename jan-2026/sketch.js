let seed;
let timePosition = 0;
let scrollSpeed = 0.4;
let canvasWidth = 4000;
let viewWidth = 1400;
let viewHeight = 200;
let elements = [];
let movingLines = [];
let mainStaffY;

// Audio variables
let mic;
let audioLevel = 0;
let audioHistory = [];
let fft;
let spectrum = [];
let audioStarted = false;
let startButton;

function setup() {
  createCanvas(viewWidth, 600);
  seed = random(10000);
  generateScore();

  // Create start button
  startButton = createButton('START AUDIO');
  startButton.position(viewWidth / 2 - 60, height / 2 - 20);
  startButton.size(120, 40);
  startButton.style('font-size', '16px');
  startButton.style('background-color', '#ff3333');
  startButton.style('color', 'white');
  startButton.style('border', 'none');
  startButton.style('cursor', 'pointer');
  startButton.mousePressed(startAudio);

  // Initialize audio history
  for (let i = 0; i < 100; i++) {
    audioHistory.push(0);
  }
}

function startAudio() {
  if (!audioStarted) {
    // Request microphone access
    mic = new p5.AudioIn();
    mic.start();

    fft = new p5.FFT(0.8, 256);
    fft.setInput(mic);

    audioStarted = true;
    startButton.hide();

    console.log('Microphone access granted!');

    // Check if mic is actually working
    setTimeout(() => {
      if (mic.enabled) {
        console.log('Microphone is enabled and working');
      } else {
        console.log('Microphone permission denied or not working');
        alert('Please allow microphone access in your browser settings');
      }
    }, 1000);
  }
}

function generateScore() {
  randomSeed(seed);
  elements = [];
  movingLines = [];

  mainStaffY = viewHeight / 2;

  let numMovingLines = int(random(8, 15));
  for (let i = 0; i < numMovingLines; i++) {
    movingLines.push({
      x: random(0, canvasWidth),
      length: random(20, 80),
      thickness: random([0.5, 1, 1.5, 2]),
      yOffset: random(-40, 40)
    });
  }

  let numElements = int(random(25, 40));

  for (let i = 0; i < numElements; i++) {
    let x = random(200, canvasWidth - 200);
    let y = random(20, viewHeight - 20);
    let size = random(15, 70);
    let shapeType = int(random(10));
    let strokeW = random([0.5, 1, 1.5, 2]);
    let hasFill = random() > 0.7;

    elements.push({
      x: x,
      y: y,
      size: size,
      type: shapeType,
      strokeWeight: strokeW,
      hasFill: hasFill
    });
  }

  elements.sort((a, b) => a.x - b.x);
}

function draw() {
  background(0);

  if (!audioStarted) {
    // Show instructions
    fill(255);
    noStroke();
    textSize(20);
    textAlign(CENTER, CENTER);
    text(
        'Click the button to grant microphone access', viewWidth / 2,
        height / 2 - 80);
    textSize(14);
    text(
        'Make sure to allow microphone permission in your browser',
        viewWidth / 2, height / 2 + 60);
    return;
  }

  // Get audio input
  if (mic && mic.enabled) {
    audioLevel = mic.getLevel();
    spectrum = fft.analyze();
  } else {
    audioLevel = 0;
    spectrum = new Array(256).fill(0);
  }

  // Store audio history
  audioHistory.push(audioLevel);
  if (audioHistory.length > 100) {
    audioHistory.shift();
  }

  // Audio reactive scroll speed
  let targetSpeed = 0.4 + audioLevel * 3;
  scrollSpeed = lerp(scrollSpeed, targetSpeed, 0.1);

  // Move time position
  timePosition += scrollSpeed;
  if (timePosition > canvasWidth - viewWidth) {
    timePosition = 0;
  }

  drawVisuals();
}

function drawVisuals() {
  // Audio reactive vertical offset
  let audioShake = audioLevel * 20;

  push();
  translate(0, (height - viewHeight) / 2 + sin(frameCount * 0.1) * audioShake);
  translate(-timePosition, 0);

  // Main staff line with audio reactive thickness
  let staffThickness = 2 + audioLevel * 8;
  stroke(255);
  strokeWeight(staffThickness);
  noFill();

  // Draw staff line
  line(0, mainStaffY, canvasWidth, mainStaffY);

  // Draw moving lines with audio reactivity
  for (let ml of movingLines) {
    if (ml.x > timePosition - 100 && ml.x < timePosition + viewWidth + 100) {
      let freqIdx = int(map(ml.x, 0, canvasWidth, 0, spectrum.length - 1));
      freqIdx = constrain(freqIdx, 0, spectrum.length - 1);
      let freqAmp = map(spectrum[freqIdx], 0, 255, 0, 1);

      stroke(255, 255 * (0.5 + freqAmp * 0.5));
      strokeWeight(ml.thickness + freqAmp * 2);

      let reactiveYOffset = ml.yOffset + freqAmp * 20;
      line(
          ml.x, mainStaffY + reactiveYOffset, ml.x + ml.length,
          mainStaffY + reactiveYOffset);
    }
  }

  // Draw elements with audio reactivity
  for (let el of elements) {
    if (el.x > timePosition - 100 && el.x < timePosition + viewWidth + 100) {
      let freqIdx = int(map(el.x, 0, canvasWidth, 0, spectrum.length - 1));
      freqIdx = constrain(freqIdx, 0, spectrum.length - 1);
      let freqAmp = map(spectrum[freqIdx], 0, 255, 0, 1);

      drawElement(el, freqAmp);
    }
  }

  pop();

  // Red timeline marker - audio reactive
  let markerAlpha = 150 + audioLevel * 105;
  stroke(255, 50, 50, markerAlpha);
  strokeWeight(2 + audioLevel * 3);
  line(viewWidth / 2, 0, viewWidth / 2, height);

  // Audio level display
  fill(255, 200);
  noStroke();
  textSize(14);
  textAlign(CENTER);
  text(
      '🎤 Audio Level: ' + nf(audioLevel * 100, 2, 1) + '%', viewWidth / 2, 30);

  // Audio level bar
  fill(255, 50, 50);
  rect(viewWidth / 2 - 100, 40, audioLevel * 200, 5);
  noFill();
  stroke(255);
  strokeWeight(1);
  rect(viewWidth / 2 - 100, 40, 200, 5);

  // Time marker
  fill(255, 150);
  textSize(10);
  text('Time: ' + nf(timePosition / 100, 2, 1), viewWidth / 2, height - 10);
}

function drawElement(el, audioReactivity) {
  let reactiveSize = el.size * (1 + audioReactivity * 0.5);
  let opacity = 255 * (0.7 + audioReactivity * 0.3);

  strokeWeight(el.strokeWeight + audioReactivity * 2);
  stroke(220 + audioReactivity * 35, 220 + audioReactivity * 35, 255, opacity);

  if (el.hasFill) {
    fill(
        220 + audioReactivity * 35, 200 + audioReactivity * 55, 255,
        opacity * 0.8);
  } else {
    noFill();
  }

  let x = el.x;
  let y = el.y;
  let size = reactiveSize;

  switch (el.type) {
    case 0:
      ellipse(x, y, size, size);
      break;
    case 1:
      rect(x, y, size, size * 0.7);
      break;
    case 2:
      strokeWeight(el.strokeWeight + audioReactivity * 2);
      let angle = random(TWO_PI);
      let len = random(40, 120) * (1 + audioReactivity);
      line(x, y, x + cos(angle) * len, y + sin(angle) * len);
      break;
    case 3:
      arc(x, y, size, size, random(TWO_PI), random(TWO_PI));
      break;
    case 4:
      triangle(x, y, x + size, y, x + size / 2, y - size);
      break;
    case 5:
      noFill();
      beginShape();
      for (let j = 0; j < 8; j++) {
        let wx = x + j * 20;
        let wy = y + sin(j * 0.5) * random(25, 35) * (1 + audioReactivity);
        curveVertex(wx, wy);
      }
      endShape();
      break;
    case 6:
      line(x - size / 2, y, x + size / 2, y);
      line(x, y - size / 2, x, y + size / 2);
      break;
    case 7:
      noFill();
      beginShape();
      for (let a = 0; a < TWO_PI * 2.5; a += 0.15) {
        let r = a * 4 * (1 + audioReactivity * 0.3);
        curveVertex(x + cos(a) * r, y + sin(a) * r);
      }
      endShape();
      break;
    case 8:
      for (let d = 0; d < 6; d++) {
        let dx = x + random(-size / 2, size / 2);
        let dy = y + random(-size / 2, size / 2);
        ellipse(dx, dy, 3 + audioReactivity * 2, 3 + audioReactivity * 2);
      }
      break;
    case 9:
      let sides = int(random(5, 7));
      beginShape();
      for (let a = 0; a < TWO_PI; a += TWO_PI / sides) {
        vertex(x + cos(a) * size / 2, y + sin(a) * size / 2);
      }
      endShape(CLOSE);
      break;
  }
}

function keyPressed() {
  if (key === 's' || key === 'S') {
    saveCanvas('treatise_score', 'png');
  }
  if (key === 'r' || key === 'R') {
    seed = random(10000);
    timePosition = 0;
    generateScore();
  }
  if (key === ' ') {
    if (scrollSpeed > 0) {
      scrollSpeed = 0;
    } else {
      scrollSpeed = 0.4;
    }
  }
}