const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const Room = require('./src/room');
const { getRandomWords } = require('./src/words');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.set('trust proxy', 1);
app.use(express.static('public'));

const rooms = new Map(); // code → Room

function generateCode() {
  return Math.random().toString(36).slice(2, 7).toUpperCase();
}

function startTurnTimer(room) {
  clearInterval(room.timer);
  room.secondsLeft = 80;

  room.timer = setInterval(() => {
    room.secondsLeft--;
    io.to(room.code).emit('timer', room.secondsLeft);

    if (room.secondsLeft <= 0 || room.allGuessed()) {
      clearInterval(room.timer);
      endTurn(room);
    }
  }, 1000);
}

function endTurn(room) {
  clearInterval(room.timer);
  const word = room.currentWord;
  io.to(room.code).emit('turn-ended', { word, players: room.getPublicPlayers() });

  setTimeout(() => {
    const continues = room.nextTurn();
    if (!continues) {
      io.to(room.code).emit('game-ended', { players: room.getPublicPlayers() });
      return;
    }
    const drawerId = room.drawerId;
    const words = getRandomWords(3, room.difficulty);
    io.to(room.code).emit('new-turn', {
      drawerId,
      drawerName: room.players.get(drawerId)?.name,
      round: room.round,
      maxRounds: room.maxRounds,
      wordLength: 0,
      players: room.getPublicPlayers(),
    });
    io.to(drawerId).emit('word-options', words);
  }, 4000);
}

io.on('connection', (socket) => {

  socket.on('create-room', ({ playerName, playerColor }) => {
    const code = generateCode();
    const room = new Room(code, socket.id);
    room.addPlayer(socket.id, playerName, playerColor);
    rooms.set(code, room);
    socket.join(code);
    socket.emit('room-created', { code, playerId: socket.id, players: room.getPublicPlayers() });
  });

  socket.on('join-room', ({ code, playerName, playerColor }) => {
    const room = rooms.get(code);
    if (!room) return socket.emit('error', 'Room not found.');
    if (room.state !== 'lobby') return socket.emit('error', 'Game already in progress.');
    if (room.players.size >= 8) return socket.emit('error', 'Room is full.');

    room.addPlayer(socket.id, playerName, playerColor);
    socket.join(code);
    socket.emit('room-joined', { code, playerId: socket.id, players: room.getPublicPlayers() });
    socket.to(code).emit('player-joined', { players: room.getPublicPlayers() });
  });

  socket.on('start-game', ({ rounds = 3, difficulty = 'medium' } = {}) => {
    const room = [...rooms.values()].find(r => r.hostId === socket.id);
    if (!room || room.players.size < 2) return socket.emit('error', 'Need at least 2 players to start.');
    const words = room.startGame(Math.min(Math.max(parseInt(rounds) || 3, 1), 10), difficulty);
    const drawerId = room.drawerId;
    io.to(room.code).emit('game-started', {
      drawerId,
      drawerName: room.players.get(drawerId)?.name,
      round: room.round,
      maxRounds: room.maxRounds,
      players: room.getPublicPlayers(),
    });
    io.to(drawerId).emit('word-options', words);
  });

  socket.on('restart-game', ({ rounds = 3, difficulty = 'medium' } = {}) => {
    const room = [...rooms.values()].find(r => r.hostId === socket.id);
    if (!room || room.state !== 'ended') return;
    clearInterval(room.timer);
    const words = room.startGame(Math.min(Math.max(parseInt(rounds) || 3, 1), 10), difficulty);
    const drawerId = room.drawerId;
    io.to(room.code).emit('game-started', {
      drawerId,
      drawerName: room.players.get(drawerId)?.name,
      round: room.round,
      maxRounds: room.maxRounds,
      players: room.getPublicPlayers(),
    });
    io.to(drawerId).emit('word-options', words);
  });

  socket.on('select-word', ({ word }) => {
    const room = [...rooms.values()].find(r => r.drawerId === socket.id && r.state === 'selecting');
    if (!room) return;
    room.selectWord(word);
    io.to(socket.id).emit('your-word', word);
    io.to(room.code).except(socket.id).emit('word-hint', { hint: room.wordHint(), length: word.length });
    startTurnTimer(room);
  });

  socket.on('draw', (data) => {
    const room = [...rooms.values()].find(r => r.players.has(socket.id));
    if (!room || room.drawerId !== socket.id) return;
    socket.to(room.code).emit('draw', data);
  });

  socket.on('clear-canvas', () => {
    const room = [...rooms.values()].find(r => r.drawerId === socket.id);
    if (!room) return;
    socket.to(room.code).emit('canvas-cleared');
  });

  socket.on('stroke-start', () => {
    const room = [...rooms.values()].find(r => r.players.has(socket.id));
    if (!room || room.drawerId !== socket.id) return;
    socket.to(room.code).emit('stroke-start');
  });

  socket.on('undo', () => {
    const room = [...rooms.values()].find(r => r.drawerId === socket.id);
    if (!room) return;
    socket.to(room.code).emit('undo');
  });

  socket.on('guess', ({ text }) => {
    const room = [...rooms.values()].find(r => r.players.has(socket.id));
    if (!room) return;
    const player = room.players.get(socket.id);
    if (!player || socket.id === room.drawerId) return;

    if (room.state === 'drawing') {
      const result = room.checkGuess(socket.id, text);
      if (result.result === 'already') return;

      if (result.result === 'correct') {
        io.to(room.code).emit('correct-guess', {
          playerId: socket.id,
          name: player.name,
          color: player.color,
          points: result.points,
          players: room.getPublicPlayers(),
        });
        if (room.allGuessed()) {
          clearInterval(room.timer);
          endTurn(room);
        }
      } else {
        io.to(room.code).emit('chat', {
          playerId: socket.id, name: player.name, color: player.color,
          text, penalty: result.penalty || 0,
        });
        if (result.hint) {
          socket.emit('partial-hint', { hint: result.hint });
        }
      }
    } else {
      // Allow chat between turns
      io.to(room.code).emit('chat', { playerId: socket.id, name: player.name, color: player.color, text, penalty: 0 });
    }
  });

  socket.on('rejoin', ({ roomCode, playerName, playerColor, playerId }) => {
    const room = rooms.get(roomCode);
    if (!room) return;

    // Re-associate player: old socket ID → new socket ID
    const player = room.players.get(playerId);
    if (player) {
      room.players.delete(playerId);
      player.id = socket.id;
      room.players.set(socket.id, player);
      const idx = room.drawerOrder.indexOf(playerId);
      if (idx !== -1) room.drawerOrder[idx] = socket.id;
      if (room.hostId === playerId) room.hostId = socket.id;
    } else {
      room.addPlayer(socket.id, playerName, playerColor);
    }

    socket.join(roomCode);

    const drawerId = room.drawerId;
    const isDrawer = socket.id === drawerId;

    socket.emit('game-state', {
      players: room.getPublicPlayers(),
      drawerId,
      drawerName: room.players.get(drawerId)?.name,
      round: room.round,
      maxRounds: room.maxRounds,
      state: room.state,
      wordHint: room.state === 'drawing' && !isDrawer ? room.playerHintFor(socket.id) : null,
      wordLength: room.currentWord ? room.currentWord.length : 0,
      isHostFlag: room.hostId === socket.id,
    });

    if (isDrawer && room.state === 'selecting') {
      socket.emit('word-options', getRandomWords(3));
    }
    if (isDrawer && room.state === 'drawing') {
      socket.emit('your-word', room.currentWord);
    }
  });

  socket.on('disconnect', () => {
    for (const [code, room] of rooms) {
      if (!room.players.has(socket.id)) continue;
      const wasDrawer = room.drawerId === socket.id;
      const inGame = room.state !== 'lobby';

      const doRemove = () => {
        if (!room.players.has(socket.id)) return; // already rejoined under new socket
        room.removePlayer(socket.id);

        if (room.players.size === 0) { rooms.delete(code); return; }

        if (room.hostId === socket.id) {
          room.hostId = [...room.players.keys()][0];
          io.to(room.hostId).emit('you-are-host');
        }

        io.to(code).emit('player-left', { players: room.getPublicPlayers() });

        if (wasDrawer && room.state === 'drawing') {
          clearInterval(room.timer);
          endTurn(room);
        }
      };

      // Grace period during game to allow page-navigation rejoin
      if (inGame) {
        setTimeout(doRemove, 10000);
      } else {
        doRemove();
      }
      break;
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`drawable-trouble running on http://localhost:${PORT}`));
