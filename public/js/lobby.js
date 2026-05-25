const socket = io();

const nameStep    = document.getElementById('name-step');
const joinStep    = document.getElementById('join-step');
const waitingStep = document.getElementById('waiting-step');
const errorMsg    = document.getElementById('error-msg');
const btnCreate   = document.getElementById('btn-create');
const btnJoinToggle = document.getElementById('btn-join-toggle');
const btnJoin     = document.getElementById('btn-join');
const btnBack     = document.getElementById('btn-back');
const btnStart    = document.getElementById('btn-start');
const playerNameInput = document.getElementById('player-name');
const roomCodeInput   = document.getElementById('room-code');
const displayCode     = document.getElementById('display-code');
const playerList      = document.getElementById('player-list');
const waitingMsg      = document.getElementById('waiting-msg');

let myId = null;
let isHost = false;

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.classList.remove('hidden');
  setTimeout(() => errorMsg.classList.add('hidden'), 4000);
}

function renderPlayers(players) {
  playerList.innerHTML = players
    .map(p => `<li>${p.name}${p.id === myId ? ' (you)' : ''}</li>`)
    .join('');
}

function goToWaiting(code, players) {
  nameStep.classList.add('hidden');
  joinStep.classList.add('hidden');
  waitingStep.classList.remove('hidden');
  displayCode.textContent = code;
  renderPlayers(players);
}

btnCreate.addEventListener('click', () => {
  const name = playerNameInput.value.trim();
  if (!name) return showError('Please enter your name.');
  const playerColor = document.getElementById('player-color').value;
  sessionStorage.setItem('playerColor', playerColor);
  socket.emit('create-room', { playerName: name, playerColor });
});

btnJoinToggle.addEventListener('click', () => {
  nameStep.classList.add('hidden');
  joinStep.classList.remove('hidden');
});

btnBack.addEventListener('click', () => {
  joinStep.classList.add('hidden');
  nameStep.classList.remove('hidden');
});

btnJoin.addEventListener('click', () => {
  const name = playerNameInput.value.trim() || 'Guest';
  const code = roomCodeInput.value.trim().toUpperCase();
  if (!code) return showError('Please enter a room code.');
  const playerColor = document.getElementById('player-color').value;
  sessionStorage.setItem('playerColor', playerColor);
  socket.emit('join-room', { code, playerName: name, playerColor });
});

function getSelectedOption(rowId) {
  const active = document.querySelector('#' + rowId + ' .option-btn.active');
  return active ? active.dataset.value : null;
}

document.querySelectorAll('.option-row').forEach(row => {
  row.addEventListener('click', e => {
    const btn = e.target.closest('.option-btn');
    if (!btn || btn.classList.contains('active')) return;
    row.querySelectorAll('.option-btn').forEach(b => b.classList.toggle('active', b === btn));
  });
});

btnStart.addEventListener('click', () => {
  const rounds = parseInt(getSelectedOption('rounds-options')) || 5;
  const difficulty = getSelectedOption('difficulty-options') || 'mixed';
  socket.emit('start-game', { rounds, difficulty });
});

const btnCopyCode = document.getElementById('btn-copy-code');
btnCopyCode?.addEventListener('click', async () => {
  const code = displayCode.textContent.trim();
  if (!code) return;
  try {
    await navigator.clipboard.writeText(code);
  } catch (_) {
    const ta = document.createElement('textarea');
    ta.value = code;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (_) {}
    ta.remove();
  }
  btnCopyCode.classList.add('copied');
  btnCopyCode.setAttribute('aria-label', 'Copied!');
  setTimeout(() => {
    btnCopyCode.classList.remove('copied');
    btnCopyCode.setAttribute('aria-label', 'Copy room code');
  }, 1500);
});

socket.on('room-created', ({ code, playerId, players }) => {
  myId = playerId;
  isHost = true;
  sessionStorage.setItem('playerId', playerId);
  sessionStorage.setItem('roomCode', code);
  goToWaiting(code, players);
  btnStart.classList.remove('hidden');
  document.getElementById('host-controls').classList.remove('hidden');
  waitingMsg.classList.add('hidden');
});

socket.on('room-joined', ({ code, playerId, players, inProgress }) => {
  myId = playerId;
  sessionStorage.setItem('playerId', playerId);
  sessionStorage.setItem('roomCode', code);
  sessionStorage.setItem('playerName', playerNameInput.value.trim() || 'Guest');
  sessionStorage.setItem('playerColor', document.getElementById('player-color').value);
  if (inProgress) {
    window.location.href = '/game.html';
    return;
  }
  goToWaiting(code, players);
});

socket.on('player-joined', ({ players }) => renderPlayers(players));

socket.on('you-are-host', () => {
  isHost = true;
  btnStart.classList.remove('hidden');
  document.getElementById('host-controls').classList.remove('hidden');
  waitingMsg.classList.add('hidden');
});

const btnLeaveWaiting = document.getElementById('btn-leave-waiting');
btnLeaveWaiting.addEventListener('click', () => {
  socket.emit('leave-room');
  sessionStorage.removeItem('playerId');
  sessionStorage.removeItem('roomCode');
  isHost = false;
  myId = null;
  waitingStep.classList.add('hidden');
  btnStart.classList.add('hidden');
  document.getElementById('host-controls').classList.add('hidden');
  waitingMsg.classList.remove('hidden');
  playerList.innerHTML = '';
  nameStep.classList.remove('hidden');
});

socket.on('game-started', () => {
  sessionStorage.setItem('playerName', playerNameInput.value.trim() || 'Guest');
  sessionStorage.setItem('playerColor', document.getElementById('player-color').value);
  window.location.href = '/game.html';
});

socket.on('error', showError);
