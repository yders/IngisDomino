# 🁫 IngisDomino — Domino Eye Counter

Count the eyes (pips) on your domino tiles with the phone camera and keep
score across games and players.

**Live app: https://yders.github.io/IngisDomino/**

Open the link in Safari on an iPhone and tap Share → **Add to Home Screen**
to install it as a full-screen app. It works offline after the first load.
Share the same link with friends — everyone gets their own scoreboard
(scores are stored locally on each phone).

## Features

- 📷 **Camera counting** — point at the tiles, tap Capture; detected pips
  are circled and counted. Fix the count with −/＋ before confirming, or
  enter points manually. A toggle handles dark pips on light tiles and
  light pips on dark tiles. The computer vision is dependency-free
  JavaScript (adaptive thresholding + blob detection) in
  [`client/public/domino/detector.js`](client/public/domino/detector.js).
- 🎲 **Scoring** — players with avatars, any number of games running at
  once, per-game totals and round history, optional "play to N" target,
  highest- or lowest-score-wins rules, and an all-time leaderboard
  (points, wins, games played).
- 📱 **PWA** — installable, offline-capable, no accounts, no server.

## How it's hosted

The app is plain static files in [`client/public/domino/`](client/public/domino/).
On every push to `main` that touches the app,
[`.github/workflows/deploy-domino.yml`](.github/workflows/deploy-domino.yml)
publishes it to the `gh-pages` branch, which GitHub Pages serves.

## Repository history

This repo previously hosted a coffee roastery inventory app (React +
Express + Drizzle, formerly deployed on Replit); that code is still here
(`client/src`, `server/`, `shared/`) but is no longer deployed. The domino
app is independent of it.
