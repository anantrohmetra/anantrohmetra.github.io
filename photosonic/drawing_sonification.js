// Drawing Sonification Platform
// Inspired by ANS Synthesizer, Oramics, and Kandinsky's synesthesia
// Uses p5.js for drawing and Tone.js for audio synthesis

let drawing = [];
let isDrawing = false;
let synths = [];
let scanning = false;
let scanPosition = 0;
let scanSpeed = 2;
let bgColor;
let drawColor;
let brushSize = 3;
let synthMode = 'spatial'; // 'spatial', 'gestural', 'kandinsky', 'ans'

// Color to timbre mapping (Kandinsky-inspired)
const colorToWave = {
  red: 'sawtooth',
  blue: 'sine',
  yellow: 'triangle',
  green: 'square',
  purple: 'sawtooth',
  orange: 'triangle'
};

function setup() {
  createCanvas(800, 600);
  bgColor = color(20, 20, 30);
  drawColor = color(255, 100, 150);
  background(bgColor);
  
  // Create UI
  createUI();
  
  // Initialize Tone.js
  Tone.start();
  
  // Create a polyphonic synth pool
  for (let i = 0; i < 8; i++) {
    synths.push(new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: {
        attack: 0.02,
        decay: 0.1,
        sustain: 0.3,
        release: 0.8
      }
    }).toDestination());
    synths[i].volume.value = -12;
  }
}

function draw() {
  // Draw the canvas
  if (isDrawing && mouseIsPressed) {
    stroke(drawColor);
    strokeWeight(brushSize);
    line(mouseX, mouseY, pmouseX, pmouseY);
    
    // Store drawing data
    drawing.push({
      x: mouseX,
      y: mouseY,
      px: pmouseX,
      py: pmouseY,
      color: drawColor,
      size: brushSize,
      time: millis()
    });
  }
  
  // ANS-style scanning visualization
  if (scanning) {
    scanPosition += scanSpeed;
    if (scanPosition > width) {
      scanPosition = 0;
    }
    
    // Draw scan line
    push();
    stroke(100, 255, 100, 150);
    strokeWeight(2);
    line(scanPosition, 0, scanPosition, height);
    pop();
    
    // Sonify at scan position
    sonifyAtPosition(scanPosition);
  }
}

function sonifyAtPosition(x) {
  // Get all pixels at this x position
  let column = [];
  loadPixels();
  
  for (let y = 0; y < height; y += 5) { // Sample every 5 pixels for performance
    let index = (y * width + floor(x)) * 4;
    let r = pixels[index];
    let g = pixels[index + 1];
    let b = pixels[index + 2];
    let a = pixels[index + 3];
    
    // If not background color
    if (a > 0 && (r !== red(bgColor) || g !== green(bgColor) || b !== blue(bgColor))) {
      column.push({
        y: y,
        r: r,
        g: g,
        b: b,
        brightness: (r + g + b) / 3
      });
    }
  }
  
  // Play notes based on column data
  if (column.length > 0) {
    playColumn(column);
  }
}

function playColumn(column) {
  if (synthMode === 'spatial' || synthMode === 'ans') {
    // ANS/Spatial mode: Y position = pitch
    column.forEach((pixel, i) => {
      let freq = map(pixel.y, 0, height, 880, 110); // A5 to A2
      let duration = 0.1;
      let velocity = map(pixel.brightness, 0, 255, 0.1, 0.8);
      
      // Use different synth based on color
      let synthIndex = floor(map(pixel.r, 0, 255, 0, synths.length - 1));
      synths[synthIndex].triggerAttackRelease(freq, duration, undefined, velocity);
    });
  } else if (synthMode === 'kandinsky') {
    // Kandinsky mode: shapes and colors determine timbre
    column.forEach((pixel) => {
      let freq = map(pixel.y, 0, height, 880, 110);
      let duration = 0.15;
      
      // Determine waveform based on color
      let waveType = getWaveFromColor(pixel.r, pixel.g, pixel.b);
      synths[0].set({ oscillator: { type: waveType } });
      synths[0].triggerAttackRelease(freq, duration);
    });
  }
}

function getWaveFromColor(r, g, b) {
  // Determine dominant color and return wave type
  if (r > g && r > b) return 'sawtooth'; // Red
  if (b > r && b > g) return 'sine'; // Blue
  if (g > r && g > b) return 'square'; // Green
  if (r > 150 && g > 150) return 'triangle'; // Yellow
  return 'sine'; // Default
}

function mousePressed() {
  if (mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
    isDrawing = true;
  }
}

function mouseReleased() {
  isDrawing = false;
  
  // In gestural mode, play the entire gesture
  if (synthMode === 'gestural' && drawing.length > 10) {
    playGestural();
  }
}

function playGestural() {
  // Play the drawing as a melodic sequence based on gesture
  let gesture = drawing.slice(-50); // Last 50 points
  
  gesture.forEach((point, i) => {
    let delay = i * 0.05; // 50ms between notes
    let freq = map(point.y, 0, height, 880, 110);
    let duration = map(point.size, 1, 20, 0.1, 0.5);
    
    setTimeout(() => {
      synths[0].triggerAttackRelease(freq, duration);
    }, delay * 1000);
  });
}

function createUI() {
  // Play/Scan button
  let scanBtn = createButton('▶ Scan & Play');
  scanBtn.position(20, height + 20);
  scanBtn.mousePressed(() => {
    scanning = !scanning;
    scanBtn.html(scanning ? '⏸ Stop' : '▶ Scan & Play');
  });
  
  // Clear button
  let clearBtn = createButton('Clear Canvas');
  clearBtn.position(150, height + 20);
  clearBtn.mousePressed(() => {
    background(bgColor);
    drawing = [];
  });
  
  // Mode selector
  let modeLabel = createP('Mode:');
  modeLabel.position(280, height + 5);
  
  let modeSelect = createSelect();
  modeSelect.position(340, height + 20);
  modeSelect.option('Spatial (ANS)', 'spatial');
  modeSelect.option('Kandinsky', 'kandinsky');
  modeSelect.option('Gestural', 'gestural');
  modeSelect.changed(() => {
    synthMode = modeSelect.value();
  });
  
  // Speed control
  let speedLabel = createP('Scan Speed:');
  speedLabel.position(500, height + 5);
  
  let speedSlider = createSlider(0.5, 10, 2, 0.5);
  speedSlider.position(600, height + 28);
  speedSlider.input(() => {
    scanSpeed = speedSlider.value();
  });
  
  // Brush size
  let sizeLabel = createP('Brush:');
  sizeLabel.position(750, height + 5);
  
  let sizeSlider = createSlider(1, 20, 3, 1);
  sizeSlider.position(800, height + 28);
  sizeSlider.input(() => {
    brushSize = sizeSlider.value();
  });
  
  // Color picker
  let colorLabel = createP('Color:');
  colorLabel.position(20, height + 60);
  
  let colorPicker = createColorPicker('#ff6496');
  colorPicker.position(80, height + 75);
  colorPicker.input(() => {
    drawColor = colorPicker.color();
  });
  
  // Instructions
  let instructions = createP('Draw with your mouse. Press "Scan & Play" to hear your drawing sonified. Try different modes!');
  instructions.position(200, height + 60);
  instructions.style('color', '#888');
  instructions.style('font-size', '14px');
}

function keyPressed() {
  // Spacebar to toggle scanning
  if (key === ' ') {
    scanning = !scanning;
  }
  
  // 'C' to clear
  if (key === 'c' || key === 'C') {
    background(bgColor);
    drawing = [];
  }
  
  // Number keys for quick color changes
  if (key === '1') drawColor = color(255, 100, 150); // Red
  if (key === '2') drawColor = color(100, 150, 255); // Blue
  if (key === '3') drawColor = color(255, 255, 100); // Yellow
  if (key === '4') drawColor = color(100, 255, 150); // Green
  if (key === '5') drawColor = color(200, 100, 255); // Purple
}
