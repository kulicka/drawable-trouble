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
    this.drawerIndex = -1;
    this.drawerOrder = [];
    this.currentWord = null;
    this.timer = null;
    this.secondsLeft = 0;
  }

  addPlayer(id, name, color = '#e94560') {
    this.players.set(id, { id, name, color, score: 0, hasGuessed: false });
  }

  removePlayer(id) {
    this.players.delete(id);
    this.drawerOrder = this.drawerOrder.filter(pid => pid !== id);
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

  startGame(maxRounds = 3) {
    this.state = 'selecting';
    this.round = 1;
    this.maxRounds = maxRounds;
    this.drawerOrder = [...this.players.keys()];
    this.drawerIndex = 0;
    this.players.forEach(p => { p.score = 0; p.hasGuessed = false; });
    return getRandomWords(3);
  }

  selectWord(word) {
    this.currentWord = word.toLowerCase();
    this.state = 'drawing';
    this.secondsLeft = TURN_DURATION;
    this.players.forEach(p => { p.hasGuessed = false; });
    return this.currentWord;
  }

  checkGuess(playerId, text) {
    if (this.state !== 'drawing') return 'wrong';
    if (playerId === this.drawerId) return 'wrong';
    const player = this.players.get(playerId);
    if (!player || player.hasGuessed) return 'already';
    if (text.toLowerCase().trim() === this.currentWord) {
      player.hasGuessed = true;
      const points = Math.max(POINTS_MIN, Math.round((this.secondsLeft / TURN_DURATION) * POINTS_MAX));
      player.score += points;
      // Reward drawer too
      const drawer = this.players.get(this.drawerId);
      if (drawer) drawer.score += 10;
      return { result: 'correct', points };
    }
    return 'wrong';
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
