// ================== DESIGN CONSTANTS (FIGMA SPACE) ==================
// All positions are designed in a 1920x1080 artboard.
// We keep that as "virtual space" and scale it to any screen size.

const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;

// These will be computed so the art scales and stays centered.
let sceneScale = 1;
let sceneOffsetX = 0;
let sceneOffsetY = 0;

// We'll keep the p5 canvas so we can set its cursor style
let canvas;

// Global mouse in "design space"
let mouseDesignX = 0;
let mouseDesignY = 0;

// Track whether we are hovering any live turtle (for cursor)
let isHoveringLiveTurtle = false;

// Cursor mode: "default" | "hover" | "warning"
let cursorMode = "default";

function updateSceneTransform() {
  // Fit the 1920x1080 design into current window, keep aspect ratio
  sceneScale = min(windowWidth / DESIGN_WIDTH, windowHeight / DESIGN_HEIGHT);
  sceneOffsetX = (windowWidth - DESIGN_WIDTH * sceneScale) * 0.5;
  sceneOffsetY = (windowHeight - DESIGN_HEIGHT * sceneScale) * 0.5;
}

// ================== DATA FROM FIGMA ==================

let blueOutlineCircles = [
  { x: 719,    y: 564,    d: 40    },
  { x: 739.5,  y: 563.5,  d: 55    },
  { x: 753.74, y: 563.74, d: 69.48 },
  { x: 787.81, y: 563.81, d: 95.62 },
  { x: 829.325,y: 564.325,d: 150.65 },
  { x: 865.545,y: 563.545,d: 251.09 },
  { x: 947.045,y: 564.045,d: 456.09 },
  { x: 947,    y: 564,    d: 576    },
  { x: 1009.5, y: 563.5,  d: 917    },
  { x: 991,    y: 564,    d: 1198   },
  { x: 927.5,  y: 563.5,  d: 1511   },
  { x: 928.99, y: 557.99, d: 1887.46 }
];

let blackOutlineCircles = [
  { x: 145.93, y: 408.78, d: 96.84 },
  { x: 295,    y: 542,    d: 74    },
  { x: 331.09, y: 638.27, d: 48.42 },
  { x: 333.29, y: 889.75, d: 54.62 },
  { x: 307.59, y: 993.32, d: 12.78 },
  { x: 243.70, y: 1087.03,d: 49.30 },
  { x: 364.84, y: 381.50, d: 15.00 },
  { x: 432.22, y: 1053.52,d: 12.78 },
  { x: 411.23, y: 492.67, d: 30.01 },
  { x: 476.01, y: 150.32, d: 38.19 },
  { x: 484.41, y: 868.81, d: 21.91 },
  { x: 759.71, y: 13.23,  d: 80.47 },
  { x: 554.87, y: 829.51, d: 26.24 },
  { x: 681.91, y: 943.58, d: 16.07 },
  { x: 812.52, y: 1007.73,d: 51.86 },
  { x: 1171.965,y:95.415, d: 92.07 },
  { x: 1429.45,y: 239.25, d: 19.22 },
  { x: 1512.26,y: 588.92, d: 10.98 },
  { x: 1475.56,y: 652.58, d: 19.22 },
  { x: 1333.005,y:912.815,d: 38.99 },
  { x: 746.355,y:925.685,d: 39.63 },
  { x: 735.855,y:872.635,d: 25.93 },
  { x: 677.5,  y: 664.5,  d: 49    },
  { x: 1087.405,y:291.145,d: 23.87 },
  { x: 1290.15,y:298.53, d: 64.8  },
  { x: 1387.115,y:675.325,d:10.43 },
  { x: 1257.84,y:865.53, d: 58.78 },
  { x: 1093.915,y:851.035,d:77.97 },
  { x: 1596.695,y:641.215,d:32.95},
  { x: 1713.525,y:443.685,d:82.13}
];

let blueFilledCircles = [
  { x: 592,    y: 749,    d: 86  },
  { x: 1543.5, y: 326.5,  d: 53  },
  { x: 1234.5, y: 534.5,  d: 65  },
  { x: 904.5,  y: 548.5,  d: 25  },
  { x: 829,    y: 584,    d: 32  },
  { x: 788,    y: 557,    d: 14  },
  { x: 865.5,  y: 353.5,  d: 35  },
  { x: 720,    y: 0,      d: 124 },
  { x: 220,    y: 336,    d: 244 },
  { x: 1883,   y: 1084,   d: 888 }
];

// ================== UTILS ==================

function buildArray(n, fillFunction) {
  let outputArray = [];
  for (let i = 0; i < n; i++) outputArray.push(fillFunction(i));
  return outputArray;
}

function removeValueFromArray(arr, value) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === value) {
      arr.splice(i, 1);
      return;
    }
  }
}

function chooseBestOrbitFromList(px, py, orbitIndexList) {
  if (!orbitIndexList || orbitIndexList.length === 0) return 0;

  let bestIdx = orbitIndexList[0];
  let bestDiff = Infinity;

  for (let k = 0; k < orbitIndexList.length; k++) {
    let idx = orbitIndexList[k];
    let c = blueOutlineCircles[idx];
    let circleR = c.d / 2;

    let distToCenter = dist(px, py, c.x, c.y);
    let diff = abs(distToCenter - circleR);

    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = idx;
    }
  }
  return bestIdx;
}

// pick theta so turtles stay inside the DESIGN canvas,
// not the real browser canvas.
function pickThetaInsideCanvas(cx, cy, r, margin) {
  let candidates = [];
  for (let a = 0; a < TWO_PI; a += 0.01) {
    let x = cx + cos(a) * r;
    let y = cy + sin(a) * r;
    if (
      x > margin &&
      x < DESIGN_WIDTH - margin &&
      y > margin &&
      y < DESIGN_HEIGHT - margin
    ) {
      candidates.push(a);
    }
  }
  if (candidates.length === 0) return random(TWO_PI);
  return candidates[floor(random(candidates.length))];
}

// ================== STATE ==================

let liveTurtles = [];
let deadBgTurtles = [];
let plastics = [];
let blobs = [];
let turtleImg = null;

let trashDrops = 0;
let isGameOver = false;
let isCleaning = false;
let dangerLevel = 0;

let btnClean = null;
let domMoreBtn = null;

// music toggle
let musicBtn = null;
let isMusicOn = true;   // UI state: user wants music or not

// ================== SOUNDS ==================

let sEat = null;       // uc.wav
let sDrop = null;      // bubble.wav
let sHover = null;     // turtle slide.wav
let sTurnRed = null;   // turn red.wav
let sClean = null;     // underwater.wav
let sAmbient = null;   // ambient music with noise.wav

// ================== CONFIG ==================

let REMOVE_LIVE_TURTLE_INDEX = -1;
let OUTER_LIVE_ORBIT_INDEX = 11;

let LIVE_BASE_SIZE = 70;
let LIVE_TURTLE_SIZE_MULTS = [5.0, 4.0, 2.3, 0.7, 0.5, 2.0];
let LIVE_MIN_SIZE = 42;

let LIVE_ORBIT_POOL = [1, 3, 5, 7, 9];

// background turtles
let DEAD_BG_COUNT = 40;
let BG_SCALE = 1.15;
let BG_TINT_R = 10,  BG_TINT_G = 60,  BG_TINT_B = 180, BG_TINT_A = 95;
let DEAD_TINT_R = 5, DEAD_TINT_G = 40, DEAD_TINT_B = 140, DEAD_TINT_A = 210;

// plastics
let PLASTIC_CLUSTER = 18;

// hover + collision
let HOVER_RADIUS_PAD = 28;
let HOVER_SPEED_BOOST = 20.0;

let HEAD_OFFSET_RATIO = 0.38;
let COLLISION_PAD = 4;

// PNG / SVG rotate offset (turtle drawn pointing up → rotate 90°)
var TURTLE_ROT_OFFSET = Math.PI / 2;

// game
let TRASH_DROP_LIMIT = 10;
let CLEAN_FADE_SPEED = 10;
let DANGER_FADE_SPEED = 0.06;

// BLOBS (other creatures – round stroke trails)
const BLOB_COUNT = 26;
const BLOB_MIN_LEN = 40;
const BLOB_MAX_LEN = 120;
const BLOB_MIN_THICK = 6;
const BLOB_MAX_THICK = 14;

// ================== QUOTES + TEXT ORBITS ==================

let quotes = [
  "Their survival is our responsibility; we must create hope.",
  "Even a single piece of plastic can kill a turtle.",
  "Vu Minh Duc · S4032402 · Maciawa",
  "SDG 14 · Life Below Water · If the ocean dies, we die"
];

// orbit 0: Notable + larger spacing
let textOrbits = [
  {
    circleIndex: 10,
    quoteIndex: 3,
    size: 90,
    speed: 0.00160,
    start: -Math.PI * 0.10,
    spacing: 1.35
  },
  {
    circleIndex: 8,
    quoteIndex: 0,
    size: 68,
    speed: -0.00170,
    start: -Math.PI * 0.55,
    spacing: 1.08
  },
  {
    circleIndex: 6,
    quoteIndex: 1,
    size: 30,
    speed: 0.00175,
    start: Math.PI * 0.85,
    spacing: 1.14
  },
  {
    circleIndex: 4,
    quoteIndex: 2,
    size: 20,
    speed: -0.00185,
    start: Math.PI * 0.75,
    spacing: 1.18
  }
];

let orbitAngles = new Array(textOrbits.length).fill(0);

function isCircleUsedByText(idx) {
  for (let i = 0; i < textOrbits.length; i++) {
    if (textOrbits[i].circleIndex === idx) return true;
  }
  return false;
}

// ================== CURSOR HELPERS ==================

function setCursorMode(newMode) {
  if (newMode === cursorMode) return; // avoid spamming DOM
  cursorMode = newMode;

  const body = document.body;
  let canvasCursor, bodyCursor, btnCursor, warningCursor;

  const defaultCursor = 'url("assets/cursor.svg") 16 16, auto';
  const pointerCursor = 'url("assets/pointer.svg") 16 16, pointer';
  const warning = 'url("assets/canhbao.svg") 16 16, auto';

  if (newMode === "warning") {
    bodyCursor = warning;
    canvasCursor = warning;
    warningCursor = warning;
  } else if (newMode === "hover") {
    // Hover mode: we are currently on an interactive thing (turtle),
    // so canvas uses pointer.svg, body stays default.
    bodyCursor = defaultCursor;
    canvasCursor = pointerCursor;
    warningCursor = pointerCursor; // for buttons in hover/normal mode
  } else {
    // default
    bodyCursor = defaultCursor;
    canvasCursor = defaultCursor;
    warningCursor = pointerCursor; // buttons still appear clickable
  }

  if (body) {
    body.style.cursor = bodyCursor;
  }
  if (canvas && canvas.elt) {
    canvas.elt.style.cursor = canvasCursor;
  }
  if (domMoreBtn) {
    domMoreBtn.style.cursor = warningCursor;
  }
  if (btnClean) {
    btnClean.style("cursor", warningCursor);
  }
  if (musicBtn) {
    musicBtn.style("cursor", warningCursor);
  }
}

// ================== PRELOAD ==================

function preload() {
  // Use SVG turtle sprite
  turtleImg = loadImage(
    "assets/turtle.svg",
    () => console.log("✅ turtle.svg loaded"),
    () => { console.log("❌ FAILED to load assets/turtle.svg"); turtleImg = null; }
  );

  soundFormats("wav");

  sEat      = loadSound("assets/uc.wav",                        () => {}, () => {});
  sDrop     = loadSound("assets/bubble.wav",                    () => {}, () => {});
  sHover    = loadSound("assets/turtle slide.wav",              () => {}, () => {});
  sTurnRed  = loadSound("assets/turn red.wav",                  () => {}, () => {});
  sClean    = loadSound("assets/underwater.wav",                () => {}, () => {});
  sAmbient  = loadSound("assets/ambient music with noise.wav",  () => {}, () => {});
}

// ================== SETUP ==================

function setup() {
  // Responsive canvas: match browser window
  canvas = createCanvas(windowWidth, windowHeight);
  frameRate(30);

  updateSceneTransform(); // compute sceneScale + offsets

  imageMode(CENTER);
  angleMode(RADIANS);

  textFont("Atkinson Hyperlegible Mono");

  domMoreBtn = document.getElementById("btnMore");

  initLiveTurtles();
  initDeadBgTurtles();
  initBlobs();

  // Clean button – visually aligned with the HTML "More" button, but on the left
  btnClean = createButton("Clean");
  btnClean.position(20, height * 0.06 - 20);
  btnClean.style("padding", "0.4vw 1.25vw");
  btnClean.style("border-radius", "50vw");
  btnClean.style("border", "2px solid #1E97F2");
  btnClean.style("background", "transparent");
  btnClean.style("color", "#FFFFFF");
  btnClean.style("font-size", "0.94vw");
  btnClean.style("cursor", "pointer"); // will be overridden by setCursorMode
  btnClean.style("font-family", "Atkinson Hyperlegible Mono, monospace");
  btnClean.style("z-index", "500");
  btnClean.mousePressed(startCleaning);

  // Music toggle icon – bottom right, aligned with "More" button (roughly)
  let rightMargin = width * 0.0208;
  let iconSize = 40;
  musicBtn = createImg("assets/musicon.svg", "toggle music");
  musicBtn.position(width - rightMargin - iconSize, height - height * 0.06 - iconSize / 2);
  musicBtn.size(iconSize, iconSize);
  musicBtn.style("cursor", "pointer"); // overridden by setCursorMode
  musicBtn.mousePressed(toggleMusic);

  // Set sound volumes
  if (sAmbient) {
    sAmbient.setLoop(true);
    sAmbient.setVolume(0.35);
  }
  if (sDrop)    sDrop.setVolume(0.55);
  if (sEat)     sEat.setVolume(0.65);
  if (sHover)   sHover.setVolume(0.5);
  if (sTurnRed) sTurnRed.setVolume(0.7);
  if (sClean)   sClean.setVolume(0.7);

  // Try to start ambient music right away (browser may still block it)
  ensureAmbientPlaying();

  // Set initial cursor to default (cursor.svg)
  setCursorMode("default");
}

// Keep canvas responsive on window resize
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  updateSceneTransform();

  // Reposition UI elements when screen size changes
  if (btnClean) {
    btnClean.position(20, height * 0.06 - 20);
  }
  if (musicBtn) {
    let rightMargin = width * 0.0208;
    let iconSize = 40;
    musicBtn.position(width - rightMargin - iconSize, height - height * 0.06 - iconSize / 2);
  }
}

// ================== PATH HELPERS ==================

function setTurtlePosOnPath(t) {
  let wobble = sin(t.theta * t.wobbleFreq + t.wobblePhase) * t.wobbleAmp;
  let r = t.pathR + wobble;

  t.x = t.pathCx + cos(t.theta) * r;
  t.y = t.pathCy + sin(t.theta) * r;
}

// ================== INIT ==================

function initLiveTurtles() {
  liveTurtles = [];

  let orbitPool = LIVE_ORBIT_POOL.slice();
  orbitPool = orbitPool.filter(idx => !isCircleUsedByText(idx));
  orbitPool = orbitPool.filter(i => i !== OUTER_LIVE_ORBIT_INDEX);

  let maxLive = 1 + orbitPool.length;

  for (let i = 0; i < maxLive; i++) {
    let orbitIdx;

    if (i === 0) {
      orbitIdx = OUTER_LIVE_ORBIT_INDEX;
    } else {
      let src = blueFilledCircles[i] || { x: DESIGN_WIDTH / 2, y: DESIGN_HEIGHT / 2 };
      orbitIdx = chooseBestOrbitFromList(src.x, src.y, orbitPool);
      removeValueFromArray(orbitPool, orbitIdx);
    }

    let bestCircle = blueOutlineCircles[orbitIdx];

    let mult = (LIVE_TURTLE_SIZE_MULTS[i] !== undefined) ? LIVE_TURTLE_SIZE_MULTS[i] : 1.0;
    let size = LIVE_BASE_SIZE * mult;
    if (size < LIVE_MIN_SIZE) size = LIVE_MIN_SIZE;

    let t = {
      pathCx: bestCircle.x,
      pathCy: bestCircle.y,
      pathR: bestCircle.d / 2,

      theta: random(TWO_PI),

      baseSpeed: random(0.0012, 0.0020),
      speed: 0,

      wobbleAmp: size * random(0.06, 0.14),
      wobbleFreq: random(0.8, 1.8),
      wobblePhase: random(TWO_PI),

      size: size,
      isDead: false,

      x: 0, y: 0,
      angle: 0,
      wasHovered: false
    };

    t.speed = t.baseSpeed;

    if (i === 0) {
      let rMax = t.pathR + abs(t.wobbleAmp);
      t.theta = pickThetaInsideCanvas(t.pathCx, t.pathCy, rMax, t.size * 0.6 + 30);
    }

    setTurtlePosOnPath(t);
    liveTurtles.push(t);
  }
}

function initDeadBgTurtles() {
  let count = DEAD_BG_COUNT;

  let len = blackOutlineCircles.length;
  let step = floor(len / count);
  if (step < 1) step = 1;

  deadBgTurtles = buildArray(count, (i) => {
    let idx = (i * step + floor(step * 0.45)) % len;
    let src = blackOutlineCircles[idx];

    let jx = random(-55, 55);
    let jy = random(-45, 45);

    let size = src.d * BG_SCALE * random(0.78, 1.08);

    return {
      x: src.x + jx,
      y: src.y + jy,
      baseX: src.x + jx,
      baseY: src.y + jy,
      size: size,

      floatOffsetY: random(-110, 110),
      floatSpeedY: random(-0.50, 0.50),
      floatRangeY: random(110, 220),

      floatOffsetX: random(-80, 80),
      floatSpeedX: random(-0.35, 0.35),
      floatRangeX: random(80, 160),

      rotPhase: random(TWO_PI),
      rotAmp: random(0.02, 0.06)
    };
  });
}

// blobs – other creatures drawn as soft stroke trails
function createRandomBlob() {
  let edge = floor(random(4));
  let x, y, angle;
  let margin = 80;

  if (edge === 0) {           // left → right
    x = -margin;
    y = random(DESIGN_HEIGHT);
    angle = random(-PI / 4, PI / 4);
  } else if (edge === 1) {    // right → left
    x = DESIGN_WIDTH + margin;
    y = random(DESIGN_HEIGHT);
    angle = PI + random(-PI / 4, PI / 4);
  } else if (edge === 2) {    // top → bottom
    x = random(DESIGN_WIDTH);
    y = -margin;
    angle = PI / 2 + random(-PI / 4, PI / 4);
  } else {                    // bottom → top
    x = random(DESIGN_WIDTH);
    y = DESIGN_HEIGHT + margin;
    angle = -PI / 2 + random(-PI / 4, PI / 4);
  }

  let baseSpeed = random(3.0, 5.0); // move quite fast
  let length = random(BLOB_MIN_LEN, BLOB_MAX_LEN);
  let thickness = random(BLOB_MIN_THICK, BLOB_MAX_THICK);

  return {
    x,
    y,
    angle,
    baseSpeed,
    length,
    thickness,
    phase: random(TWO_PI),
    curLength: length
  };
}

function initBlobs() {
  blobs = buildArray(BLOB_COUNT, () => createRandomBlob());
}

// ================== GAME HELPERS ==================

function areAllLiveDead() {
  for (let i = 0; i < liveTurtles.length; i++) {
    if (!liveTurtles[i].isDead) return false;
  }
  return true;
}

function triggerGameOver() {
  if (!isGameOver) {
    isGameOver = true;
    if (sTurnRed) sTurnRed.play();
  }
}

function startCleaning() {
  isCleaning = true;
  isGameOver = false;
  if (sClean) sClean.play();

  // When starting to clean, go back to default cursor (no warning)
  setCursorMode("default");
}

function finishCleaningAndReset() {
  isCleaning = false;
  trashDrops = 0;

  for (let i = 0; i < liveTurtles.length; i++) {
    liveTurtles[i].isDead = false;
  }

  // After everything is cleaned, back to default safe state
  setCursorMode("default");
}

// ================== UPDATE ==================

function updateLiveTurtles() {
  // Reset hover flag each frame
  isHoveringLiveTurtle = false;

  for (let i = 0; i < liveTurtles.length; i++) {
    let t = liveTurtles[i];
    if (t.isDead) continue;

    let hoverRadius = t.size * 0.6 + HOVER_RADIUS_PAD;
    // Mouse is in design-space already when we use this function
    let dMouse = dist(mouseDesignX, mouseDesignY, t.x, t.y);
    let isHovered = dMouse < hoverRadius;

    // If we hover this turtle, mark global flag
    if (isHovered) {
      isHoveringLiveTurtle = true;
    }

    // First time hovered → dash + sound
    if (isHovered && !t.wasHovered && !isCleaning) {
      if (sHover) sHover.play();
    }

    if (isHovered) {
      t.speed = t.baseSpeed * HOVER_SPEED_BOOST;
    } else {
      t.speed = lerp(t.speed, t.baseSpeed, 0.10);
    }

    t.wasHovered = isHovered;

    t.theta -= t.speed;
    setTurtlePosOnPath(t);

    // Orient turtle along its orbit direction
    t.angle = t.theta - HALF_PI;

    checkHeadCollision(t);
  }
}

function checkHeadCollision(t) {
  if (plastics.length === 0) return;

  let headOffset = t.size * HEAD_OFFSET_RATIO;
  let headX = t.x + cos(t.angle) * headOffset;
  let headY = t.y + sin(t.angle) * headOffset;

  for (let j = 0; j < plastics.length; j++) {
    let p = plastics[j];

    let threshold = p.size * 0.70 + COLLISION_PAD;
    let d = dist(headX, headY, p.x, p.y);

    if (d < threshold) {
      t.isDead = true;
      if (sEat && !isCleaning) sEat.play();
      return;
    }
  }
}

function updateDeadBgTurtles() {
  for (let i = 0; i < deadBgTurtles.length; i++) {
    let t = deadBgTurtles[i];

    t.floatOffsetY += t.floatSpeedY;
    if (t.floatOffsetY > t.floatRangeY || t.floatOffsetY < -t.floatRangeY) {
      t.floatSpeedY *= -1;
    }

    t.floatOffsetX += t.floatSpeedX;
    if (t.floatOffsetX > t.floatRangeX || t.floatOffsetX < -t.floatRangeX) {
      t.floatSpeedX *= -1;
    }

    t.x = t.baseX + t.floatOffsetX;
    t.y = t.baseY + t.floatOffsetY;
  }
}

function updatePlastics() {
  for (let i = plastics.length - 1; i >= 0; i--) {
    let p = plastics[i];

    let time = frameCount * p.floatSpeed + p.phase;
    p.x = p.baseX + sin(time) * p.floatAmpX;
    p.y = p.baseY + cos(time) * p.floatAmpY;

    if (isCleaning) {
      p.alpha -= CLEAN_FADE_SPEED;
      if (p.alpha <= 0) plastics.splice(i, 1);
    }
  }

  if (isCleaning && plastics.length === 0) {
    finishCleaningAndReset();
  }
}

function updateOrbitText() {
  let speedMult = 1 + dangerLevel * 25;
  for (let i = 0; i < textOrbits.length; i++) {
    orbitAngles[i] += textOrbits[i].speed * speedMult;
  }
}

function updateDangerLevel() {
  let target = (isGameOver ? 1 : 0);
  dangerLevel = lerp(dangerLevel, target, DANGER_FADE_SPEED);
}

function updateBlobs() {
  let margin = 120;

  for (let i = 0; i < blobs.length; i++) {
    let b = blobs[i];

    // When the scene is almost fully red, blobs freeze (no breathing)
    if (isGameOver && dangerLevel > 0.9) {
      b.curLength = b.length;
      continue;
    }

    // Normal state: blobs "breathe" slightly
    let wobble = 0.25 * sin(frameCount * 0.04 + b.phase);
    b.curLength = b.length * (1 + wobble);

    // Move fast in their direction
    let speed = b.baseSpeed;
    b.x += cos(b.angle) * speed;
    b.y += sin(b.angle) * speed;

    // If off-screen (design space), respawn a new blob
    if (
      b.x < -margin || b.x > DESIGN_WIDTH + margin ||
      b.y < -margin || b.y > DESIGN_HEIGHT + margin
    ) {
      blobs[i] = createRandomBlob();
    }
  }
}

// ================== INTERACTION ==================

function isClickOnAnyTurtle(px, py) {
  for (let i = 0; i < liveTurtles.length; i++) {
    let t = liveTurtles[i];
    let rr = t.size * 0.35;
    if (dist(px, py, t.x, t.y) < rr) return true;
  }

  for (let i = 0; i < deadBgTurtles.length; i++) {
    let t = deadBgTurtles[i];
    let rr = t.size * 0.35;
    if (dist(px, py, t.x, t.y) < rr) return true;
  }

  return false;
}

function ensureAmbientPlaying() {
  // Try to keep the ambient loop running when user wants music
  if (!sAmbient) return;

  if (isMusicOn && !sAmbient.isPlaying()) {
    sAmbient.loop();
  }
}

function mousePressed() {
  // Make sure audio context is unlocked on first user interaction
  if (typeof userStartAudio === "function") {
    userStartAudio();
  }

  ensureAmbientPlaying();

  // Convert screen mouse → design-space mouse
  let px = (mouseX - sceneOffsetX) / sceneScale;
  let py = (mouseY - sceneOffsetY) / sceneScale;

  if (!isClickOnAnyTurtle(px, py)) {
    addPlasticAtPoint(px, py);
  }
}

function toggleMusic() {
  if (!sAmbient) return;

  if (isMusicOn) {
    // Turn OFF: pause ambient loop
    isMusicOn = false;
    sAmbient.pause();
    if (musicBtn) musicBtn.attribute("src", "assets/musicoff.svg");
  } else {
    // Turn ON: restart loop if allowed
    isMusicOn = true;
    ensureAmbientPlaying();
    if (musicBtn) musicBtn.attribute("src", "assets/musicon.svg");
  }
}

function addPlasticAtPoint(px, py) {
  trashDrops += 1;

  if (sDrop && !isCleaning) sDrop.play();

  for (let j = 0; j < PLASTIC_CLUSTER; j++) {
    let angle = random(TWO_PI);
    let r = random(20, 80);

    let x = px + cos(angle) * r;
    let y = py + sin(angle) * r;

    let size = random(6, 14);

    let shapeType;
    let rShape = random();
    if (rShape < 0.33) shapeType = "circle";
    else if (rShape < 0.66) shapeType = "square";
    else shapeType = "triangle";

    plastics.push({
      baseX: x, baseY: y,
      x: x, y: y,
      size: size,
      shapeType: shapeType,
      phase: random(TWO_PI),
      floatSpeed: random(0.012, 0.028),
      floatAmpX: random(1.5, 5),
      floatAmpY: random(1.5, 6),
      alpha: 255
    });
  }
}

// ================== DRAW HELPERS ==================

function drawTurtleImage(x, y, size, angle, isDead, isBackground, extraOffset) {
  if (extraOffset === undefined) extraOffset = 0;

  if (!turtleImg) {
    // Fallback if sprite fails to load: simple ellipse turtle
    push();
    translate(x, y);
    rotate(angle);
    noStroke();
    fill(isBackground ? 30 : (isDead ? 70 : 200), 160);
    ellipse(0, 0, size * 0.72, size * 0.52);
    pop();
    return;
  }

  push();
  translate(x, y);
  rotate(angle + TURTLE_ROT_OFFSET + extraOffset);

  let r, g, b, a;

  if (isBackground) {
    // Background turtles: teal → red
    r = lerp(BG_TINT_R, 255, dangerLevel);
    g = lerp(BG_TINT_G, 0,   dangerLevel);
    b = lerp(BG_TINT_B, 0,   dangerLevel);
    a = lerp(BG_TINT_A, 220, dangerLevel);
    tint(r, g, b, a);
  } else if (isDead) {
    // Dead turtles: dark teal → red
    r = lerp(DEAD_TINT_R, 255, dangerLevel);
    g = lerp(DEAD_TINT_G, 0,   dangerLevel);
    b = lerp(DEAD_TINT_B, 0,   dangerLevel);
    a = lerp(DEAD_TINT_A, 230, dangerLevel);
    tint(r, g, b, a);
  } else {
    // Live turtles: original → red
    if (dangerLevel > 0.01) {
      let gCol = lerp(255, 0, dangerLevel);
      let bCol = lerp(255, 0, dangerLevel);
      tint(255, gCol, bCol, 255);
    } else {
      noTint();
    }
  }

  image(turtleImg, 0, 0, size, size);
  noTint();
  pop();
}

function drawPlastics() {
  noStroke();
  for (let i = 0; i < plastics.length; i++) {
    let p = plastics[i];

    // Plastics: blue-ish → red
    let rr = lerp(0,   255, dangerLevel);
    let gg = lerp(120, 0,   dangerLevel);
    let bb = lerp(255, 0,   dangerLevel);

    fill(rr, gg, bb, p.alpha);

    let s = p.size;

    if (p.shapeType === "circle") {
      circle(p.x, p.y, s);
    } else if (p.shapeType === "square") {
      rectMode(CENTER);
      rect(p.x, p.y, s, s);
    } else {
      triangle(
        p.x, p.y - s * 0.7,
        p.x - s * 0.6, p.y + s * 0.4,
        p.x + s * 0.6, p.y + s * 0.4
      );
    }
  }
}

function drawTextOnCircle(str, cx, cy, r, startAngle, textSizePx, spacingFactor, useNotable) {
  push();
  translate(cx, cy);

  textSize(textSizePx);
  textAlign(CENTER, CENTER);

  if (dangerLevel > 0.01) {
    // Text turns red (no stroke) in danger mode
    noStroke();
    let gCol = lerp(255, 0, dangerLevel);
    let bCol = lerp(255, 0, dangerLevel);
    fill(255, gCol, bCol);
  } else {
    stroke(0, 170);
    strokeWeight(textSizePx * 0.08);
    fill(255);
  }

  let baseSpacing = textSizePx * 0.64;
  let desiredSpacing = baseSpacing * spacingFactor;

  let step = desiredSpacing / r;
  let maxStep = (TWO_PI * 0.92) / max(1, str.length);
  if (step > maxStep) step = maxStep;

  let totalAngle = str.length * step;
  let a = startAngle - totalAngle / 2;

  for (let i = 0; i < str.length; i++) {
    let ch = str.charAt(i);

    let x = cos(a) * r;
    let y = sin(a) * r;

    if (useNotable) {
      textFont("Notable");
    } else {
      textFont("Atkinson Hyperlegible Mono");
    }

    push();
    translate(x, y);
    rotate(a + HALF_PI);
    text(ch, 0, 0);
    pop();

    a += step;
  }

  pop();
}

function drawQuoteOrbits() {
  for (let i = 0; i < textOrbits.length; i++) {
    let o = textOrbits[i];
    let c = blueOutlineCircles[o.circleIndex];
    let rr = c.d / 2;

    let str = quotes[o.quoteIndex];
    let startAngle = o.start + orbitAngles[i];

    let useNotable = (o.quoteIndex === 3);

    drawTextOnCircle(
      str,
      c.x,
      c.y,
      rr,
      startAngle,
      o.size,
      o.spacing,
      useNotable
    );
  }
}

// Blob trails behind everything
function drawBlobs() {
  strokeCap(ROUND);

  for (let i = 0; i < blobs.length; i++) {
    let b = blobs[i];

    // Blobs: teal → red, alpha stronger when danger is higher
    let r = lerp(BG_TINT_R, 255, dangerLevel);
    let g = lerp(BG_TINT_G, 0,   dangerLevel);
    let bb = lerp(BG_TINT_B, 0,  dangerLevel);
    let a = lerp(BG_TINT_A, 230, dangerLevel);

    stroke(r, g, bb, a);
    strokeWeight(b.thickness);

    push();
    translate(b.x, b.y);
    rotate(b.angle);
    line(-b.curLength / 2, 0, b.curLength / 2, 0);
    pop();
  }
}

// ================== MAIN DRAW ==================

function draw() {
  background(0);

  // Update design-space mouse position every frame
  mouseDesignX = (mouseX - sceneOffsetX) / sceneScale;
  mouseDesignY = (mouseY - sceneOffsetY) / sceneScale;

  if (!isCleaning) {
    if (trashDrops > TRASH_DROP_LIMIT) triggerGameOver();
    if (areAllLiveDead()) triggerGameOver();
  }

  updateDangerLevel();
  updatePlastics();
  updateDeadBgTurtles();
  updateLiveTurtles();
  updateOrbitText();
  updateBlobs();

  // --- Cursor mode logic (after all updates) ---
  if (isGameOver && dangerLevel > 0.7) {
    // Ocean is in danger → warning cursor everywhere
    setCursorMode("warning");
  } else if (isHoveringLiveTurtle && !isCleaning) {
    // Hovering a live turtle → pointer cursor
    setCursorMode("hover");
  } else {
    // Normal state
    setCursorMode("default");
  }

  // Update UI button styles according to dangerLevel
  // Base: blue (#1E97F2) → red (#FF0000)
  let br = lerp(30, 255, dangerLevel);
  let bg = lerp(151, 0,   dangerLevel);
  let bb = lerp(242, 0,   dangerLevel);

  if (domMoreBtn) {
    domMoreBtn.style.borderColor = `rgb(${br},${bg},${bb})`;
    domMoreBtn.style.color = (dangerLevel > 0.01) ? "#FF0000" : "#1E97F2";
  }

  if (btnClean) {
    btnClean.style("border", `2px solid rgb(${br},${bg},${bb})`);
    btnClean.style("color", dangerLevel > 0.01 ? "#FF0000" : "#FFFFFF");
  }

  if (musicBtn) {
    // Slight hue shift when the scene is red
    if (dangerLevel > 0.01) {
      musicBtn.style("filter", "hue-rotate(-40deg) saturate(1.6)");
    } else {
      musicBtn.style("filter", "none");
    }
  }

  // Draw everything in design space, then scale to screen
  push();
  translate(sceneOffsetX, sceneOffsetY);
  scale(sceneScale);

  // 1. Blobs behind everything
  drawBlobs();

  // 2. Background (dead) turtles
  for (let i = 0; i < deadBgTurtles.length; i++) {
    let t = deadBgTurtles[i];
    let rot = sin(frameCount * 0.01 + t.rotPhase) * t.rotAmp;
    drawTurtleImage(t.x, t.y, t.size, rot, true, true, -TURTLE_ROT_OFFSET);
  }

  // 3. Migration orbits (blue → red)
  noFill();
  stroke(
    lerp(30, 255, dangerLevel),
    lerp(151, 0,   dangerLevel),
    lerp(242, 0,   dangerLevel)
  );
  strokeWeight(2);

  for (let i = 0; i < blueOutlineCircles.length; i++) {
    if (!isCircleUsedByText(i)) {
      let c = blueOutlineCircles[i];
      circle(c.x, c.y, c.d);
    }
  }

  // 4. Plastics
  drawPlastics();

  // 5. Live turtles
  for (let i = 0; i < liveTurtles.length; i++) {
    if (i === REMOVE_LIVE_TURTLE_INDEX) continue;

    let t = liveTurtles[i];
    if (isCleaning && t.isDead) continue;

    drawTurtleImage(t.x, t.y, t.size, t.angle, t.isDead, false, 0);
  }

  // 6. Circular text orbits
  drawQuoteOrbits();

  pop();
}
