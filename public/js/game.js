const socket = io();
window._socket = socket;

// ── Audio ──
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playCorrectSound() {
  try {
    const ctx = getAudioCtx();
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {  // C5 E5 G5 C6
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.11;
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.start(t);
      osc.stop(t + 0.45);
    });
  } catch (_) {}
}

function playTickSound(seconds) {
  try {
    const ctx = getAudioCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = seconds <= 5 ? 1050 : 820;
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(seconds <= 5 ? 0.2 : 0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    osc.start(t);
    osc.stop(t + 0.09);
  } catch (_) {}
}

const wordDisplay    = document.getElementById('word-display');
const roundDisplay   = document.getElementById('round-display');
const timerEl        = document.getElementById('timer');
const playerListEl   = document.getElementById('player-list');
const chatMessages   = document.getElementById('chat-messages');
const chatForm       = document.getElementById('chat-form');
const chatInput      = document.getElementById('chat-input');
const wordPicker     = document.getElementById('word-picker');
const wordOptions    = document.getElementById('word-options');
const turnOverlay    = document.getElementById('turn-overlay');
const turnOverlayText= document.getElementById('turn-overlay-text');
const btnPlayAgain        = document.getElementById('btn-play-again');
const playAgainControls   = document.getElementById('play-again-controls');
const toolbar        = document.getElementById('toolbar');

let myId = sessionStorage.getItem('playerId');
let myDrawer = false;
let isHost = false;

function renderPlayers(players, drawerId) {
  playerListEl.innerHTML = players.map(p => `
    <li class="${p.id === drawerId ? 'is-drawer' : ''} ${p.hasGuessed ? 'guessed' : ''}">
      ${p.id === drawerId ? '🎨 ' : ''}${p.name}${p.id === myId ? ' (you)' : ''}
      <span class="player-score">${p.score}</span>
    </li>
  `).join('');
}

function addChat(html, cls = '') {
  const div = document.createElement('div');
  div.className = 'chat-msg ' + cls;
  div.innerHTML = html;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function setDrawerUI(active) {
  myDrawer = active;
  toolbar.style.pointerEvents = active ? 'auto' : 'none';
  toolbar.style.opacity = active ? '1' : '0.4';
  if (active) {
    enableDrawing(socket);
  } else {
    disableDrawing();
  }
}

function showTurnOverlay(text, duration = 3000) {
  turnOverlayText.textContent = text;
  turnOverlay.classList.remove('hidden');
  setTimeout(() => turnOverlay.classList.add('hidden'), duration);
}

// ── Socket events ──

socket.on('connect', () => {
  const playerId   = sessionStorage.getItem('playerId');
  const roomCode   = sessionStorage.getItem('roomCode');
  const playerName = sessionStorage.getItem('playerName');
  const playerColor = sessionStorage.getItem('playerColor');
  if (playerId && roomCode) {
    socket.emit('rejoin', { playerId, roomCode, playerName, playerColor });
  }
});

socket.on('game-state', ({ players, drawerId, drawerName, round, maxRounds, state, wordHint, wordLength, isHostFlag }) => {
  myId = socket.id; // socket.id changed after page navigation
  isHost = !!isHostFlag;
  roundDisplay.textContent = `Round ${round} of ${maxRounds}`;
  renderPlayers(players, drawerId);

  const isDrawer = socket.id === drawerId;
  setDrawerUI(isDrawer);

  if (state === 'selecting' && isDrawer) {
    wordDisplay.textContent = 'Choose a word!';
  } else if (state === 'drawing') {
    wordDisplay.textContent = isDrawer ? '(your word)' : (wordHint || '_ '.repeat(wordLength).trim());
  } else {
    wordDisplay.textContent = 'Waiting...';
  }

  if (!isDrawer && drawerName) {
    addChat(`${drawerName} is drawing!`, 'system');
  }
});

socket.on('new-turn', ({ drawerId, drawerName, round, maxRounds, wordLength }) => {
  clearCanvas();
  roundDisplay.textContent = `Round ${round} of ${maxRounds}`;

  if (socket.id === drawerId) {
    wordDisplay.textContent = 'Choose a word!';
    setDrawerUI(true);
    // word-options arrives after this and will show the picker
  } else {
    wordPicker.classList.add('hidden');
    setDrawerUI(false);
    wordDisplay.textContent = wordLength ? '_ '.repeat(wordLength).trim() : '...';
    showTurnOverlay(`${drawerName} is drawing!`);
  }
});

socket.on('word-options', (words) => {
  wordOptions.innerHTML = '';
  words.forEach(w => {
    const btn = document.createElement('button');
    btn.textContent = w;
    btn.addEventListener('click', () => {
      socket.emit('select-word', { word: w });
      wordPicker.classList.add('hidden');
    });
    wordOptions.appendChild(btn);
  });
  wordPicker.classList.remove('hidden');
});

socket.on('your-word', (word) => {
  wordDisplay.textContent = word.toUpperCase();
});

socket.on('word-hint', ({ hint, length }) => {
  wordDisplay.textContent = hint || '_ '.repeat(length).trim();
});

socket.on('draw', receiveStroke);

socket.on('canvas-cleared', clearCanvas);

socket.on('timer', (seconds) => {
  timerEl.textContent = seconds;
  timerEl.style.color = seconds <= 10 ? '#ff5252' : 'var(--accent)';
  if (seconds <= 10 && seconds > 0) playTickSound(seconds);
});

socket.on('chat', ({ name, color, text }) => {
  addChat(`<span class="sender" style="color:${color || 'var(--accent2)'}">${name}:</span> ${text}`);
});

socket.on('correct-guess', ({ name, color, points, players }) => {
  playCorrectSound();
  addChat(`🎉 <span style="color:${color || 'var(--accent2)'};font-weight:700">${name}</span> guessed correctly! (+${points})`, 'correct');
  renderPlayers(players, null);
});

socket.on('turn-ended', ({ word, players }) => {
  timerEl.textContent = '--';
  wordDisplay.textContent = word.toUpperCase();
  setDrawerUI(false);
  wordPicker.classList.add('hidden');
  addChat(`The word was: <strong>${word}</strong>`, 'system');
  renderPlayers(players, null);
  showTurnOverlay(`The word was "${word}"`, 3500);
});

socket.on('player-joined', ({ players }) => renderPlayers(players, null));
socket.on('player-left',   ({ players }) => renderPlayers(players, null));

socket.on('game-started', ({ drawerId, drawerName, round, maxRounds }) => {
  playAgainControls.classList.add('hidden');
  turnOverlay.classList.add('hidden');
  clearCanvas();
  roundDisplay.textContent = `Round ${round} of ${maxRounds}`;
  renderPlayers([], drawerId);
  chatInput.placeholder = 'Type your guess...';
  chatInput.disabled = false;
  if (socket.id === drawerId) {
    setDrawerUI(true);
    wordDisplay.textContent = 'Choose a word!';
  } else {
    showTurnOverlay(`${drawerName} is drawing!`);
  }
});

socket.on('game-ended', ({ players }) => {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const lines = sorted.map((p, i) => `${i + 1}. ${p.name} — ${p.score} pts`).join('\n');
  turnOverlayText.textContent = 'Game over!\n\n' + lines;
  turnOverlay.classList.remove('hidden');
  if (isHost) playAgainControls.classList.remove('hidden');
  wordDisplay.textContent = '🏆 Game Over';
  timerEl.textContent = '--';
  addChat('Game over! Final scores:\n' + lines, 'system');
});

socket.on('you-are-host', () => {
  isHost = true;
  addChat('You are now the host.', 'system');
});

socket.on('error', (msg) => addChat(`⚠️ ${msg}`, 'system'));

btnPlayAgain.addEventListener('click', () => {
  const rounds = parseInt(document.getElementById('rounds-select-game').value) || 3;
  socket.emit('restart-game', { rounds });
});

// ── Chat / guess ──
chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text || myDrawer) return;
  socket.emit('guess', { text });
  chatInput.value = '';
});

socket.on('your-word', () => {
  chatInput.placeholder = 'You are drawing...';
  chatInput.disabled = true;
});

// Re-enable chat whenever a new turn starts (old drawer becomes guesser)
socket.on('new-turn', () => {
  chatInput.placeholder = 'Type your guess...';
  chatInput.disabled = false;
});
socket.on('turn-ended', () => {
  chatInput.placeholder = 'Type your guess...';
  chatInput.disabled = false;
});
