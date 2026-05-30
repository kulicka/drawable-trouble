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
const btnUndo        = document.getElementById('btn-undo');
const btnLeaveRoom   = document.getElementById('btn-leave-room');
const btnCopyRoomCode= document.getElementById('btn-copy-room-code');
const gameRoomCodeEl = document.getElementById('game-room-code');

let myId = sessionStorage.getItem('playerId');
let myDrawer = false;
let isHost = false;

const myRoomCode = sessionStorage.getItem('roomCode') || '';
if (gameRoomCodeEl) gameRoomCodeEl.textContent = myRoomCode;

function applyHostUI() {
  btnLeaveRoom.classList.toggle('hidden', isHost);
}

btnCopyRoomCode?.addEventListener('click', async () => {
  if (!myRoomCode) return;
  try {
    await navigator.clipboard.writeText(myRoomCode);
  } catch (_) {
    const ta = document.createElement('textarea');
    ta.value = myRoomCode;
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (_) {}
    ta.remove();
  }
  btnCopyRoomCode.classList.add('copied');
  setTimeout(() => btnCopyRoomCode.classList.remove('copied'), 1500);
});

btnLeaveRoom?.addEventListener('click', () => {
  if (isHost) return;
  if (!confirm('Leave this room?')) return;
  socket.emit('leave-room');
  sessionStorage.removeItem('playerId');
  sessionStorage.removeItem('roomCode');
  window.location.href = '/';
});

function renderPlayers(players, drawerId) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const rankMap = new Map(sorted.map((p, i) => [p.id, i + 1]));

  const initials = name => name.trim().split(/\s+/).map(w => w[0].toUpperCase()).slice(0, 2).join('');

  playerListEl.innerHTML = `<div class="players-section-label">Players</div>` + players.map(p => {
    const isDrawer  = p.id === drawerId;
    const isYou     = p.id === myId;
    const guessed   = p.hasGuessed;
    const cardCls   = [isDrawer ? 'is-drawer' : '', isYou && !isDrawer ? 'is-you' : '', guessed && !isDrawer ? 'has-guessed' : ''].filter(Boolean).join(' ');
    const ring      = isDrawer ? '<div class="drawing-ring"></div>' : '';
    const youTag    = isYou ? ' <span class="you-tag">(you)</span>' : '';
    const status    = isDrawer
      ? '<div class="p-status drawing-txt">✏ drawing</div>'
      : guessed ? '<div class="p-status guessed-txt">✓ guessed</div>' : '';
    const scoreUp   = guessed || isDrawer ? 'score-up' : '';
    const rank      = rankMap.get(p.id);

    return `
      <div class="player-card ${cardCls}">
        <div class="player-avatar" style="background:${p.color || '#818cf8'}">${ring}${initials(p.name)}</div>
        <div class="player-info">
          <div class="p-name">${p.name}${youTag}</div>
          ${status}
        </div>
        <div class="player-right">
          <div class="p-score ${scoreUp}">${p.score}</div>
          <div class="p-rank">#${rank}</div>
        </div>
      </div>`;
  }).join('');
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
  applyHostUI();
  roundDisplay.textContent = `Round ${round} of ${maxRounds}`;
  renderPlayers(players, drawerId);

  const isDrawer = socket.id === drawerId;
  setDrawerUI(isDrawer);

  if (state === 'selecting' && isDrawer) {
    wordDisplay.textContent = 'Choose a word!';
  } else if (state === 'drawing') {
    if (isDrawer) {
      wordDisplay.textContent = '(your word)';
    } else {
      const blanks = wordHint || '_ '.repeat(wordLength).trim();
      wordDisplay.textContent = `${blanks}  (${wordLength} letters)`;
    }
  } else {
    wordDisplay.textContent = 'Waiting...';
  }

  if (!isDrawer && drawerName) {
    addChat(`${drawerName} is drawing!`, 'system');
  }
});

socket.on('new-turn', ({ drawerId, drawerName, round, maxRounds, wordLength, players }) => {
  clearCanvas();
  roundDisplay.textContent = `Round ${round} of ${maxRounds}`;
  if (players) renderPlayers(players, drawerId);

  if (socket.id === drawerId) {
    turnOverlay.classList.add('hidden');
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
  turnOverlay.classList.add('hidden');
  wordOptions.innerHTML = '';
  words.forEach(({ word, difficulty }) => {
    const btn = document.createElement('button');
    btn.textContent = word;
    btn.dataset.difficulty = difficulty;
    btn.addEventListener('click', () => {
      socket.emit('select-word', { word });
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
  const blanks = hint || '_ '.repeat(length).trim();
  wordDisplay.textContent = `${blanks}  (${length} letters)`;
});

socket.on('partial-hint', ({ hint }) => {
  const length = hint.replace(/ /g, '').length;
  wordDisplay.textContent = `${hint}  (${length} letters)`;
});

socket.on('draw', receiveStroke);
socket.on('fill', receiveFill);

socket.on('canvas-cleared', clearCanvas);

socket.on('timer', (seconds) => {
  timerEl.textContent = seconds;
  timerEl.style.color = seconds <= 10 ? '#ff5252' : 'var(--accent)';
  if (seconds <= 10 && seconds > 0) playTickSound(seconds);
});

socket.on('chat', ({ name, color, text, penalty }) => {
  const penaltyTag = penalty ? ` <span class="penalty">-${penalty}pts</span>` : '';
  addChat(`<span class="sender" style="color:${color || 'var(--accent2)'}">${name}:</span> ${text}${penaltyTag}`);
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

socket.on('game-started', ({ drawerId, drawerName, round, maxRounds, players }) => {
  playAgainControls.classList.add('hidden');
  turnOverlay.classList.add('hidden');
  clearCanvas();
  roundDisplay.textContent = `Round ${round} of ${maxRounds}`;
  renderPlayers(players || [], drawerId);
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
  applyHostUI();
  addChat('You are now the host.', 'system');
});

socket.on('error', (msg) => addChat(`⚠️ ${msg}`, 'system'));

btnUndo.addEventListener('click', () => {
  if (!myDrawer) return;
  undoDrawer(socket);
});

socket.on('stroke-start', () => {
  if (!myDrawer) pushGuesserHistory();
});

socket.on('undo', () => {
  if (!myDrawer) applyGuesserUndo();
});

btnPlayAgain.addEventListener('click', () => {
  const rounds = parseInt(document.getElementById('rounds-select-game').value) || 3;
  const difficulty = document.getElementById('difficulty-select-game').value || 'medium';
  socket.emit('restart-game', { rounds, difficulty });
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

// ── Panel toggles ──
(function () {
  const playersPanel = document.getElementById('players-panel');
  const chatPanel    = document.getElementById('chat-panel');
  const backdrop     = document.getElementById('panel-backdrop');

  function isMobile() { return window.innerWidth < 768; }

  function togglePanel(panel, other) {
    if (isMobile()) {
      const opening = !panel.classList.contains('mobile-open');
      panel.classList.toggle('mobile-open', opening);
      other.classList.remove('mobile-open');
      backdrop.classList.toggle('active', opening);
    } else {
      panel.classList.toggle('collapsed');
    }
  }

  document.getElementById('toggle-players').addEventListener('click',   () => togglePanel(playersPanel, chatPanel));
  document.getElementById('toggle-chat').addEventListener('click',       () => togglePanel(chatPanel, playersPanel));
  document.getElementById('mob-players-btn').addEventListener('click',  () => togglePanel(playersPanel, chatPanel));
  document.getElementById('mob-chat-btn').addEventListener('click',     () => togglePanel(chatPanel, playersPanel));

  backdrop.addEventListener('click', () => {
    playersPanel.classList.remove('mobile-open');
    chatPanel.classList.remove('mobile-open');
    backdrop.classList.remove('active');
  });

  // Start with both panels collapsed on mobile
  if (isMobile()) {
    playersPanel.classList.remove('collapsed');
    chatPanel.classList.remove('collapsed');
  }
})();
