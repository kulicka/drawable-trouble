const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

let drawing = false;
let isDrawer = false;
let color = '#000000';
let brushSize = 6;
let erasing = false;
let lastX = 0, lastY = 0;

const COLORS = ['#000000','#ffffff','#e94560','#ff9800','#ffeb3b','#4caf50','#2196f3','#9c27b0','#795548','#607d8b'];

function initToolbar() {
  const swatchContainer = document.getElementById('color-swatches');
  COLORS.forEach(c => {
    const s = document.createElement('div');
    s.className = 'swatch' + (c === color ? ' active' : '');
    s.style.background = c;
    s.addEventListener('click', () => {
      setColor(c);
      document.querySelectorAll('.swatch').forEach(el => el.classList.remove('active'));
      s.classList.add('active');
      erasing = false;
      document.getElementById('btn-eraser').classList.remove('active');
    });
    swatchContainer.appendChild(s);
  });

  document.getElementById('custom-color').addEventListener('input', e => {
    setColor(e.target.value);
    erasing = false;
  });

  document.getElementById('brush-size').addEventListener('input', e => {
    brushSize = parseInt(e.target.value);
  });

  document.getElementById('btn-eraser').addEventListener('click', () => {
    erasing = !erasing;
    document.getElementById('btn-eraser').classList.toggle('active', erasing);
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
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function enableDrawing(socket) {
  isDrawer = true;
  canvas.style.cursor = 'crosshair';

  function start(e) {
    e.preventDefault();
    drawing = true;
    const { x, y } = getPos(e);
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

  canvas.addEventListener('mousedown', start);
  canvas.addEventListener('mousemove', move);
  canvas.addEventListener('mouseup', end);
  canvas.addEventListener('mouseleave', end);
  canvas.addEventListener('touchstart', start, { passive: false });
  canvas.addEventListener('touchmove', move, { passive: false });
  canvas.addEventListener('touchend', end, { passive: false });
}

function disableDrawing() {
  isDrawer = false;
  canvas.style.cursor = 'default';
}

function receiveStroke(data) {
  drawSegment(data.x0, data.y0, data.x1, data.y1, data.color, data.size, data.erase);
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
