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

btnStart.addEventListener('click', () => {
  const rounds = parseInt(document.getElementById('rounds-select').value) || 3;
  socket.emit('start-game', { rounds });
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

socket.on('room-joined', ({ code, playerId, players }) => {
  myId = playerId;
  sessionStorage.setItem('playerId', playerId);
  sessionStorage.setItem('roomCode', code);
  goToWaiting(code, players);
});

socket.on('player-joined', ({ players }) => renderPlayers(players));

socket.on('game-started', () => {
  sessionStorage.setItem('playerName', playerNameInput.value.trim() || 'Guest');
  sessionStorage.setItem('playerColor', document.getElementById('player-color').value);
  window.location.href = '/game.html';
});

socket.on('error', showError);
