const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const Room = require('./src/room');
const { getRandomWords } = require('./src/words');

// Tiny structured logger. Writes one line per event to stdout so fly.io's
// log stream and `journalctl` both pick it up. Keep ctx flat and small.
function log(level, msg, ctx) {
  const t = new Date().toISOString();
  const c = ctx ? ' ' + JSON.stringify(ctx) : '';
  process.stdout.write(`${t} [${level}] ${msg}${c}\n`);
}
const sid = (s) => s ? s.slice(0, 6) : null; // short socket id for readable logs

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.set('trust proxy', 1);
// Never cache the HTML shell so a redeploy reaches phones immediately;
// versioned assets (style.css?v=...) can still be cached aggressively.
app.use((req, res, next) => {
  if (req.path === '/' || req.path.endsWith('.html')) {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
  next();
});
app.use(express.static('public'));

const rooms = new Map(); // code → Room

const SELECT_DURATION = 15; // seconds the drawer has to pick a word

const CODE_ALPHABET = 'ABCDEFGHJKLMNOPRSTUVWXYZ123456789';
function generateCode() {
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

// Emit word options to the current drawer and arm a server-side auto-pick
// timer. If the drawer hasn't selected by SELECT_DURATION, a random one of
// the three offered words is chosen for them.
function offerWords(room) {
  const words = getRandomWords(3, room.difficulty, [...room.usedWords]);
  room.offeredWords = words;
  clearTimeout(room.selectTimer);
  room.selectTimer = setTimeout(() => {
    if (room.state !== 'selecting' || !room.offeredWords) return;
    const drawerId = room.drawerId;
    if (!drawerId) return;
    const pick = room.offeredWords[Math.floor(Math.random() * room.offeredWords.length)].word;
    log('info', 'word auto-picked (select timeout)', {
      code: room.code, drawer: room.players.get(drawerId)?.name, word: pick,
    });
    room.selectWord(pick);
    room.offeredWords = null;
    io.to(drawerId).emit('your-word', pick);
    io.to(room.code).except(drawerId).emit('word-hint', { hint: room.wordHint(), length: pick.length });
    startTurnTimer(room);
  }, SELECT_DURATION * 1000);
  io.to(room.drawerId).emit('word-options', words, SELECT_DURATION);
  return words;
}

function startTurnTimer(room) {
  clearInterval(room.timer);
  room.secondsLeft = 75;

  room.timer = setInterval(() => {
    room.secondsLeft--;
    io.to(room.code).emit('timer', room.secondsLeft);

    // With only the drawer in the room there's nobody to "guess", so
    // allGuessed() is trivially true and would end the turn instantly.
    // Skip that branch when there's just one player.
    const allGuessedAndOthersExist = room.players.size > 1 && room.allGuessed();
    if (room.secondsLeft <= 0 || allGuessedAndOthersExist) {
      clearInterval(room.timer);
      endTurn(room);
    }
  }, 1000);
}

function endTurn(room) {
  clearInterval(room.timer);
  clearTimeout(room.selectTimer);
  room.selectTimer = null;
  room.offeredWords = null;
  const word = room.currentWord;
  const guessed = [...room.players.values()].filter(p => p.hasGuessed).length;
  log('info', 'turn ended', { code: room.code, round: room.round, word, guessed });
  io.to(room.code).emit('turn-ended', { word, players: room.getPublicPlayers() });

  setTimeout(() => {
    const continues = room.nextTurn();
    if (!continues) {
      const scores = room.getPublicPlayers().map(p => ({ name: p.name, score: p.score }));
      log('info', 'game ended', { code: room.code, scores });
      io.to(room.code).emit('game-ended', { players: room.getPublicPlayers() });
      return;
    }
    const drawerId = room.drawerId;
    log('info', 'next turn', {
      code: room.code, round: room.round, drawer: room.players.get(drawerId)?.name,
    });
    io.to(room.code).emit('new-turn', {
      drawerId,
      drawerName: room.players.get(drawerId)?.name,
      round: room.round,
      maxRounds: room.maxRounds,
      wordLength: 0,
      players: room.getPublicPlayers(),
    });
    offerWords(room);
  }, 4000);
}

io.on('connection', (socket) => {
  log('info', 'socket connect', { sid: sid(socket.id), total: io.engine.clientsCount });

  socket.on('create-room', ({ playerName, playerColor }) => {
    const code = generateCode();
    const room = new Room(code, socket.id);
    room.addPlayer(socket.id, playerName, playerColor);
    rooms.set(code, room);
    socket.join(code);
    log('info', 'room created', { code, host: playerName, sid: sid(socket.id), rooms: rooms.size });
    socket.emit('room-created', { code, playerId: socket.id, players: room.getPublicPlayers() });
  });

  socket.on('join-room', ({ code, playerName, playerColor }) => {
    const room = rooms.get(code);
    if (!room) {
      log('warn', 'join-room: not found', { code, sid: sid(socket.id) });
      return socket.emit('error', 'Room not found.');
    }
    if (room.players.size >= 8) {
      log('warn', 'join-room: full', { code, sid: sid(socket.id) });
      return socket.emit('error', 'Room is full.');
    }

    room.addPlayer(socket.id, playerName, playerColor);
    if (room.state !== 'lobby') room.drawerOrder.push(socket.id);
    socket.join(code);
    const inProgress = room.state !== 'lobby';
    log('info', 'player joined', { code, name: playerName, sid: sid(socket.id), inProgress, players: room.players.size });
    socket.emit('room-joined', { code, playerId: socket.id, players: room.getPublicPlayers(), inProgress });
    socket.to(code).emit('player-joined', { players: room.getPublicPlayers() });
  });

  socket.on('start-game', ({ rounds = 3, difficulty = 'medium' } = {}) => {
    const room = [...rooms.values()].find(r => r.hostId === socket.id);
    if (!room) return;
    room.startGame(Math.min(Math.max(parseInt(rounds) || 3, 1), 10), difficulty);
    const drawerId = room.drawerId;
    log('info', 'game started', {
      code: room.code, players: room.players.size, rounds: room.maxRounds,
      difficulty: room.difficulty, firstDrawer: room.players.get(drawerId)?.name,
    });
    io.to(room.code).emit('game-started', {
      drawerId,
      drawerName: room.players.get(drawerId)?.name,
      round: room.round,
      maxRounds: room.maxRounds,
      players: room.getPublicPlayers(),
    });
    offerWords(room);
  });

  socket.on('restart-game', ({ rounds = 3, difficulty = 'medium' } = {}) => {
    const room = [...rooms.values()].find(r => r.hostId === socket.id);
    if (!room || room.state !== 'ended') return;
    clearInterval(room.timer);
    clearTimeout(room.selectTimer);
    room.startGame(Math.min(Math.max(parseInt(rounds) || 3, 1), 10), difficulty);
    const drawerId = room.drawerId;
    log('info', 'game restarted', {
      code: room.code, players: room.players.size, rounds: room.maxRounds, difficulty: room.difficulty,
    });
    io.to(room.code).emit('game-started', {
      drawerId,
      drawerName: room.players.get(drawerId)?.name,
      round: room.round,
      maxRounds: room.maxRounds,
      players: room.getPublicPlayers(),
    });
    offerWords(room);
  });

  socket.on('select-word', ({ word }) => {
    const room = [...rooms.values()].find(r => r.drawerId === socket.id && r.state === 'selecting');
    if (!room) return;
    clearTimeout(room.selectTimer);
    room.selectTimer = null;
    room.offeredWords = null;
    room.selectWord(word);
    log('info', 'word selected', {
      code: room.code, round: room.round, drawer: room.players.get(socket.id)?.name, length: word.length,
    });
    io.to(socket.id).emit('your-word', word);
    io.to(room.code).except(socket.id).emit('word-hint', { hint: room.wordHint(), length: word.length });
    startTurnTimer(room);
  });

  socket.on('draw', (data) => {
    const room = [...rooms.values()].find(r => r.players.has(socket.id));
    if (!room || room.drawerId !== socket.id) return;
    socket.to(room.code).emit('draw', data);
  });

  socket.on('fill', (data) => {
    const room = [...rooms.values()].find(r => r.players.has(socket.id));
    if (!room || room.drawerId !== socket.id) return;
    socket.to(room.code).emit('fill', data);
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
        log('info', 'correct guess', {
          code: room.code, round: room.round, name: player.name, points: result.points, remaining: room.secondsLeft,
        });
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
    if (!room) {
      log('warn', 'rejoin: room gone', { code: roomCode, name: playerName, sid: sid(socket.id) });
      return;
    }

    // Re-associate player: old socket ID → new socket ID
    const player = room.players.get(playerId);
    if (player) {
      room.players.delete(playerId);
      player.id = socket.id;
      room.players.set(socket.id, player);
      const idx = room.drawerOrder.indexOf(playerId);
      if (idx !== -1) room.drawerOrder[idx] = socket.id;
      if (room.hostId === playerId) room.hostId = socket.id;
      log('info', 'player rejoined (in-grace)', { code: roomCode, name: player.name, sid: sid(socket.id) });
    } else {
      // Disconnect ran past the grace period — re-add and put back in rotation
      room.addPlayer(socket.id, playerName, playerColor);
      if (room.state !== 'lobby') room.drawerOrder.push(socket.id);
      log('info', 'player rejoined (re-added)', { code: roomCode, name: playerName, sid: sid(socket.id), players: room.players.size });
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
      // Re-send the same options the drawer was already offered (if any) so a
      // mid-selection rejoin doesn't reset the choices. The server-side
      // auto-pick timer is still running on its original schedule.
      const words = room.offeredWords || getRandomWords(3, room.difficulty, [...room.usedWords]);
      socket.emit('word-options', words, SELECT_DURATION);
    }
    if (isDrawer && room.state === 'drawing') {
      socket.emit('your-word', room.currentWord);
    }
  });

  socket.on('leave-room', () => {
    for (const [code, room] of rooms) {
      if (!room.players.has(socket.id)) continue;
      // Host may only leave while still in the lobby; mid-game they must stay so the room has an owner.
      if (room.hostId === socket.id && room.state !== 'lobby') return;
      const wasDrawer = room.drawerId === socket.id;
      const wasHost = room.hostId === socket.id;
      const name = room.players.get(socket.id)?.name;
      room.removePlayer(socket.id);
      socket.leave(code);

      if (room.players.size === 0) {
        rooms.delete(code);
        log('info', 'room closed (empty)', { code, rooms: rooms.size });
        return;
      }

      if (wasHost) {
        room.hostId = [...room.players.keys()][0];
        log('info', 'host transferred', { code, to: room.players.get(room.hostId)?.name });
        io.to(room.hostId).emit('you-are-host');
      }

      log('info', 'player left', { code, name, players: room.players.size });
      io.to(code).emit('player-left', { players: room.getPublicPlayers() });

      if (wasDrawer && room.state === 'drawing') {
        clearInterval(room.timer);
        endTurn(room);
      }
      return;
    }
  });

  socket.on('disconnect', () => {
    log('info', 'socket disconnect', { sid: sid(socket.id), total: io.engine.clientsCount });
    for (const [code, room] of rooms) {
      if (!room.players.has(socket.id)) continue;
      const wasDrawer = room.drawerId === socket.id;
      const inGame = room.state !== 'lobby';
      const name = room.players.get(socket.id)?.name;

      const doRemove = () => {
        if (!room.players.has(socket.id)) return; // already rejoined under new socket
        room.removePlayer(socket.id);

        if (room.players.size === 0) {
          rooms.delete(code);
          log('info', 'room closed (empty after disconnect)', { code, name, rooms: rooms.size });
          return;
        }

        if (room.hostId === socket.id) {
          room.hostId = [...room.players.keys()][0];
          log('info', 'host transferred', { code, to: room.players.get(room.hostId)?.name });
          io.to(room.hostId).emit('you-are-host');
        }

        log('info', 'player removed (disconnect)', { code, name, players: room.players.size });
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
server.listen(PORT, () => log('info', 'server listening', { port: PORT, node: process.version }));
