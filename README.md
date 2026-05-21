# Drawable Trouble

A real-time multiplayer drawing and guessing game — like skribbl.io, but yours.

One player draws, the rest guess. Take turns, earn points, have fun.

---

## How to run

```bash
npm install
npm start
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

---

## How to play

| Action | Description |
|--------|-------------|
| Create room | Host a private game with a custom word list |
| Join room | Enter a room code to join friends |
| Draw | Use the canvas tools to draw the secret word |
| Guess | Type your guess in the chat — fast guesses score more points |

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | HTML, CSS, Vanilla JS |
| Backend | Node.js + Express |
| Real-time | Socket.io |

---

## Project structure

```
drawable-trouble/
├── server.js            ← Entry point — Express + Socket.io server
├── package.json
├── public/
│   ├── index.html       ← Landing / lobby page
│   ├── game.html        ← Game room page
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── lobby.js     ← Room creation and joining
│       ├── canvas.js    ← Drawing tools and sync
│       └── game.js      ← Game logic, chat, scoring
└── src/
    ├── room.js          ← Room and player state management
    └── words.js         ← Default word list
```

---

## V1 roadmap

- [ ] Lobby — create and join rooms
- [ ] Canvas — draw and broadcast strokes in real time
- [ ] Guess chat — submit guesses, reveal correct answers
- [ ] Turn system — rotate drawers, countdown timer
- [ ] Scoring — points based on guess speed
- [ ] Word selection — drawer picks from 3 random words
- [ ] Custom word lists
- [ ] End screen with leaderboard
