const socket = io();
window._socket = socket;

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
const toolbar        = document.getElementById('toolbar');

let myId = sessionStorage.getItem('playerId');
let myDrawer = false;

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
  const playerId  = sessionStorage.getItem('playerId');
  const roomCode  = sessionStorage.getItem('roomCode');
  const playerName = sessionStorage.getItem('playerName');
  if (playerId && roomCode) {
    socket.emit('rejoin', { playerId, roomCode, playerName });
  }
});

socket.on('game-state', ({ players, drawerId, drawerName, round, maxRounds, state, wordHint, wordLength }) => {
  myId = socket.id; // socket.id changed after page navigation
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
  wordPicker.classList.add('hidden');
  roundDisplay.textContent = `Round ${round} of ${maxRounds}`;

  if (socket.id === drawerId) {
    // word-options event will show the picker
    wordDisplay.textContent = 'Choose a word!';
    setDrawerUI(true);
  } else {
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
});

socket.on('chat', ({ name, text }) => {
  addChat(`<span class="sender">${name}:</span> ${text}`);
});

socket.on('correct-guess', ({ name, points, players }) => {
  addChat(`🎉 <strong>${name}</strong> guessed correctly! (+${points})`, 'correct');
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
  roundDisplay.textContent = `Round ${round} of ${maxRounds}`;
  renderPlayers([], drawerId);
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
  showTurnOverlay('Game over!\n\n' + lines, 99999);
  wordDisplay.textContent = '🏆 Game Over';
  timerEl.textContent = '--';
  addChat('Game over! Final scores:\n' + lines, 'system');
});

socket.on('you-are-host', () => {
  addChat('You are now the host.', 'system');
});

socket.on('error', (msg) => addChat(`⚠️ ${msg}`, 'system'));

// ── Chat / guess ──
chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;
  if (!myDrawer) socket.emit('guess', { text });
  chatInput.value = '';
});

// Disable chat input for the drawer
socket.on('your-word', () => {
  chatInput.placeholder = 'You are drawing...';
  chatInput.disabled = true;
});
socket.on('turn-ended', () => {
  chatInput.placeholder = 'Type your guess...';
  chatInput.disabled = false;
});
