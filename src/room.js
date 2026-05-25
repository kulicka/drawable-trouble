const { getRandomWords } = require('./words');

const TURN_DURATION = 80; // seconds
const POINTS_MAX = 300;
const POINTS_MIN = 50;

class Room {
  constructor(code, hostId) {
    this.code = code;
    this.hostId = hostId;
    this.players = new Map(); // socketId → { id, name, score, hasGuessed }
    this.state = 'lobby';    // lobby | selecting | drawing | ended
    this.round = 0;
    this.maxRounds = 3;
    this.difficulty = 'medium';
    this.drawerIndex = -1;
    this.drawerOrder = [];
    this.usedWords = new Set();
    this.currentWord = null;
    this.timer = null;
    this.secondsLeft = 0;
  }

  addPlayer(id, name, color) {
    const safeColor = (typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color)) ? color : '#e94560';
    this.players.set(id, { id, name, color: safeColor, score: 0, hasGuessed: false });
  }

  removePlayer(id) {
    this.players.delete(id);
    const idx = this.drawerOrder.indexOf(id);
    if (idx === -1) return;
    this.drawerOrder.splice(idx, 1);
    // Keep the rotation pointer aligned so we don't skip a player after a removal.
    // If the removed slot is at or before the current drawer, shift left.
    // For the drawer themselves, the server calls endTurn afterwards which advances
    // the pointer — decrementing here makes that advance land on the correct next player.
    if (idx <= this.drawerIndex) this.drawerIndex--;
  }

  getPublicPlayers() {
    return [...this.players.values()].map(p => ({
      id: p.id,
      name: p.name,
      color: p.color,
      score: p.score,
      hasGuessed: p.hasGuessed,
    }));
  }

  get drawerId() {
    return this.drawerOrder[this.drawerIndex] ?? null;
  }

  startGame(maxRounds = 3, difficulty = 'medium') {
    this.state = 'selecting';
    this.round = 1;
    this.maxRounds = maxRounds;
    this.difficulty = ['easy', 'medium', 'hard', 'mixed'].includes(difficulty) ? difficulty : 'medium';
    this.drawerOrder = [...this.players.keys()];
    for (let i = this.drawerOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.drawerOrder[i], this.drawerOrder[j]] = [this.drawerOrder[j], this.drawerOrder[i]];
    }
    this.drawerIndex = 0;
    this.players.forEach(p => { p.score = 0; p.hasGuessed = false; });
    this.usedWords = new Set();
    return getRandomWords(3, this.difficulty);
  }

  selectWord(word) {
    this.currentWord = word.toLowerCase();
    this.usedWords.add(this.currentWord);
    this.state = 'drawing';
    this.secondsLeft = TURN_DURATION;
    this.players.forEach(p => { p.hasGuessed = false; });
    // Per-player revealed-letter hints (start as all underscores)
    this.playerHints = new Map();
    this.players.forEach((_, id) => {
      if (id !== this.drawerId) {
        this.playerHints.set(id, Array(this.currentWord.length).fill('_'));
      }
    });
    return this.currentWord;
  }

  checkGuess(playerId, text) {
    if (this.state !== 'drawing') return { result: 'wrong' };
    if (playerId === this.drawerId) return { result: 'wrong' };
    const player = this.players.get(playerId);
    if (!player) return { result: 'wrong' };
    if (player.hasGuessed) return { result: 'already' };

    const guess = text.toLowerCase().trim();

    if (guess === this.currentWord) {
      player.hasGuessed = true;
      const points = Math.max(POINTS_MIN, Math.round((this.secondsLeft / TURN_DURATION) * POINTS_MAX));
      player.score += points;
      const drawer = this.players.get(this.drawerId);
      if (drawer) drawer.score += 10;
      return { result: 'correct', points };
    }

    // Same-length wrong guess: reveal matching positions and apply penalty
    if (guess.length === this.currentWord.length) {
      const PENALTY = 15;
      player.score = Math.max(0, player.score - PENALTY);

      const hint = this.playerHints.get(playerId) || Array(this.currentWord.length).fill('_');
      for (let i = 0; i < this.currentWord.length; i++) {
        if (guess[i] === this.currentWord[i]) hint[i] = this.currentWord[i];
      }
      this.playerHints.set(playerId, hint);

      return { result: 'wrong', penalty: PENALTY, hint: hint.join(' ') };
    }

    return { result: 'wrong', penalty: 0, hint: null };
  }

  playerHintFor(playerId) {
    if (!this.playerHints) return this.wordHint();
    const hint = this.playerHints.get(playerId);
    return hint ? hint.join(' ') : this.wordHint();
  }

  allGuessed() {
    return [...this.players.values()]
      .filter(p => p.id !== this.drawerId)
      .every(p => p.hasGuessed);
  }

  nextTurn() {
    this.drawerIndex++;
    const totalDrawers = this.drawerOrder.length;
    if (this.drawerIndex >= totalDrawers) {
      this.drawerIndex = 0;
      this.round++;
    }
    if (this.round > this.maxRounds) {
      this.state = 'ended';
      return false;
    }
    this.state = 'selecting';
    this.currentWord = null;
    this.players.forEach(p => { p.hasGuessed = false; });
    return true;
  }

  wordHint() {
    return this.currentWord
      ? this.currentWord.split('').map(c => (c === ' ' ? ' ' : '_')).join(' ')
      : '';
  }
}

module.exports = Room;
