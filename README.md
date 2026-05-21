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

## Deployment

### Local network

Other players on the same Wi-Fi can join using your local IP instead of `localhost`:

```bash
ipconfig getifaddr en0   # macOS
ip route get 1 | awk '{print $7}'  # Linux
```

Then share `http://<your-local-ip>:3000`.

### VPS (internet-facing)

To make the game publicly accessible, deploy it to a VPS (DigitalOcean, Linode, etc.):

1. **Provision** — Ubuntu 22.04, 1 GB RAM ($6/mo) is enough
2. **Install** Node (via nvm), PM2, and nginx on the server
3. **Clone & run** the repo with PM2
4. **Proxy** nginx → `localhost:3000` with WebSocket upgrade headers
5. **HTTPS** — add a domain and run Certbot for free SSL

Full step-by-step instructions: [DEPLOYMENT.md](DEPLOYMENT.md)

---

## V1 roadmap

- [x] Lobby — create and join rooms
- [x] Canvas — draw and broadcast strokes in real time
- [x] Guess chat — submit guesses, reveal correct answers
- [x] Turn system — rotate drawers, countdown timer
- [x] Scoring — points based on guess speed
- [x] Word selection — drawer picks from 3 random words
- [ ] Custom word lists
- [ ] End screen with leaderboard
