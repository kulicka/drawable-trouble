const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

let drawing = false;
let isDrawer = false;
let color = '#000000';
let brushSize = 6;
let erasing = false;
let filling = false;
let lastX = 0, lastY = 0;
let drawController = null;

const MAX_HISTORY = 30;
const drawerHistory = [];
const guesserHistory = [];

function pushDrawerHistory() {
  drawerHistory.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  if (drawerHistory.length > MAX_HISTORY) drawerHistory.shift();
}

function pushGuesserHistory() {
  guesserHistory.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  if (guesserHistory.length > MAX_HISTORY) guesserHistory.shift();
}

function undoDrawer(socket) {
  if (!isDrawer || drawerHistory.length === 0) return;
  ctx.putImageData(drawerHistory.pop(), 0, 0);
  socket.emit('undo');
}

function applyGuesserUndo() {
  if (guesserHistory.length === 0) return;
  ctx.putImageData(guesserHistory.pop(), 0, 0);
}

const COLORS = ['#000000','#ffffff','#e94560','#ff9800','#ffeb3b','#4caf50','#2196f3','#9c27b0','#795548','#607d8b'];

function initToolbar() {
  const swatchContainer = document.getElementById('color-swatches');
  const trigger = document.getElementById('color-picker-trigger');
  const currentColorEl = document.getElementById('current-color');
  const toolbarEl = document.getElementById('toolbar');

  function updateCurrentColor(c) {
    if (currentColorEl) currentColorEl.style.background = c;
  }
  function closeSwatchPopover() {
    toolbarEl.classList.remove('swatches-open');
    trigger.classList.remove('open');
  }

  COLORS.forEach(c => {
    const s = document.createElement('div');
    s.className = 'swatch' + (c === color ? ' active' : '');
    s.style.background = c;
    s.addEventListener('click', () => {
      setColor(c);
      updateCurrentColor(c);
      document.querySelectorAll('.swatch').forEach(el => el.classList.remove('active'));
      s.classList.add('active');
      erasing = false;
      document.getElementById('btn-eraser').classList.remove('active');
      closeSwatchPopover();
    });
    swatchContainer.appendChild(s);
  });

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const opening = !toolbarEl.classList.contains('swatches-open');
    toolbarEl.classList.toggle('swatches-open', opening);
    trigger.classList.toggle('open', opening);
  });
  document.addEventListener('click', (e) => {
    if (!toolbarEl.contains(e.target)) closeSwatchPopover();
  });

  document.getElementById('btn-fill').addEventListener('click', () => {
    filling = !filling;
    document.getElementById('btn-fill').classList.toggle('active', filling);
    if (filling) {
      erasing = false;
      document.getElementById('btn-eraser').classList.remove('active');
    }
  });

  document.getElementById('custom-color').addEventListener('input', e => {
    setColor(e.target.value);
    updateCurrentColor(e.target.value);
    erasing = false;
  });

  updateCurrentColor(color);

  document.getElementById('brush-size').addEventListener('input', e => {
    brushSize = parseInt(e.target.value);
  });

  document.getElementById('btn-eraser').addEventListener('click', () => {
    erasing = !erasing;
    document.getElementById('btn-eraser').classList.toggle('active', erasing);
    if (erasing) {
      filling = false;
      document.getElementById('btn-fill').classList.remove('active');
    }
  });

  document.getElementById('btn-clear').addEventListener('click', () => {
    if (!isDrawer) return;
    clearCanvas();
    window._socket?.emit('clear-canvas');
  });
}

function setColor(c) {
  color = c;
}

function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const src = e.touches ? e.touches[0] : e;
  return {
    x: (src.clientX - rect.left) * scaleX,
    y: (src.clientY - rect.top) * scaleY,
  };
}

function drawSegment(x0, y0, x1, y1, c, size, erase) {
  ctx.save();
  ctx.globalCompositeOperation = erase ? 'destination-out' : 'source-over';
  ctx.strokeStyle = c;
  ctx.lineWidth = size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.restore();
}

function clearCanvas() {
  drawerHistory.length = 0;
  guesserHistory.length = 0;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// Iterative flood fill (4-connectivity) with a small tolerance so anti-aliased
// stroke edges don't leave halos. Operates on the canvas's internal 800x550 buffer.
function floodFill(x, y, hex) {
  x = Math.floor(x); y = Math.floor(y);
  const w = canvas.width, h = canvas.height;
  if (x < 0 || x >= w || y < 0 || y >= h) return;

  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const start = (y * w + x) * 4;
  const tr = d[start], tg = d[start + 1], tb = d[start + 2], ta = d[start + 3];

  const fr = parseInt(hex.slice(1, 3), 16);
  const fg = parseInt(hex.slice(3, 5), 16);
  const fb = parseInt(hex.slice(5, 7), 16);
  if (tr === fr && tg === fg && tb === fb && ta === 255) return;

  const TOL = 8;
  const matches = (i) =>
    Math.abs(d[i] - tr) <= TOL &&
    Math.abs(d[i + 1] - tg) <= TOL &&
    Math.abs(d[i + 2] - tb) <= TOL &&
    Math.abs(d[i + 3] - ta) <= TOL;

  const stack = [x, y];
  while (stack.length) {
    const cy = stack.pop(), cx = stack.pop();
    if (cx < 0 || cx >= w || cy < 0 || cy >= h) continue;
    const i = (cy * w + cx) * 4;
    if (!matches(i)) continue;
    d[i] = fr; d[i + 1] = fg; d[i + 2] = fb; d[i + 3] = 255;
    stack.push(cx + 1, cy);
    stack.push(cx - 1, cy);
    stack.push(cx, cy + 1);
    stack.push(cx, cy - 1);
  }
  ctx.putImageData(img, 0, 0);
}

function enableDrawing(socket) {
  if (drawController) drawController.abort();
  drawController = new AbortController();
  const { signal } = drawController;

  isDrawer = true;
  canvas.style.cursor = 'crosshair';

  function start(e) {
    e.preventDefault();
    const { x, y } = getPos(e);
    if (filling) {
      pushDrawerHistory();
      socket.emit('stroke-start');
      floodFill(x, y, color);
      socket.emit('fill', { x: Math.floor(x), y: Math.floor(y), color });
      return;
    }
    pushDrawerHistory();
    socket.emit('stroke-start');
    drawing = true;
    lastX = x; lastY = y;
  }

  function move(e) {
    e.preventDefault();
    if (!drawing) return;
    const { x, y } = getPos(e);
    const data = { x0: lastX, y0: lastY, x1: x, y1: y, color, size: brushSize, erase: erasing };
    drawSegment(data.x0, data.y0, data.x1, data.y1, data.color, data.size, data.erase);
    socket.emit('draw', data);
    lastX = x; lastY = y;
  }

  function end(e) { e.preventDefault(); drawing = false; }

  canvas.addEventListener('mousedown', start, { signal });
  canvas.addEventListener('mousemove', move, { signal });
  canvas.addEventListener('mouseup', end, { signal });
  canvas.addEventListener('mouseleave', end, { signal });
  canvas.addEventListener('touchstart', start, { passive: false, signal });
  canvas.addEventListener('touchmove', move, { passive: false, signal });
  canvas.addEventListener('touchend', end, { passive: false, signal });
}

function disableDrawing() {
  if (drawController) { drawController.abort(); drawController = null; }
  isDrawer = false;
  drawing = false;
  erasing = false;
  filling = false;
  document.getElementById('btn-eraser').classList.remove('active');
  document.getElementById('btn-fill').classList.remove('active');
  canvas.style.cursor = 'default';
}

function receiveStroke(data) {
  drawSegment(data.x0, data.y0, data.x1, data.y1, data.color, data.size, data.erase);
}

function receiveFill(data) {
  floodFill(data.x, data.y, data.color);
}

// Keep CSS size in sync with the wrapper, preserving the 800×550 aspect ratio.
// Internal resolution stays fixed so coordinates are consistent across all clients.
const CANVAS_RATIO = 800 / 550;

function fitCanvas() {
  const wrapper = canvas.parentElement;
  const ww = wrapper.clientWidth;
  const wh = wrapper.clientHeight;
  let w = ww;
  let h = w / CANVAS_RATIO;
  if (h > wh) { h = wh; w = h * CANVAS_RATIO; }
  canvas.style.width  = Math.floor(w) + 'px';
  canvas.style.height = Math.floor(h) + 'px';
}

new ResizeObserver(fitCanvas).observe(canvas.parentElement);
fitCanvas();

clearCanvas();
initToolbar();
