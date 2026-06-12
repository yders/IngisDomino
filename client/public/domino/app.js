/* Domino Eye Counter — camera pip counting + multi-game score keeping.
 * All data lives in localStorage on this device (the scorekeeper's phone).
 */
(function () {
  "use strict";

  // ---------------------------------------------------------------- storage

  const LS_KEY = "domino-counter-v1";

  function loadDb() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const db = JSON.parse(raw);
        if (db && Array.isArray(db.players) && Array.isArray(db.games)) return db;
      }
    } catch (e) {
      /* fall through to fresh db */
    }
    return { players: [], games: [] };
  }

  const db = loadDb();

  function save() {
    localStorage.setItem(LS_KEY, JSON.stringify(db));
  }

  function uid() {
    return typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : "id-" + Date.now() + "-" + Math.random().toString(36).slice(2);
  }

  const AVATARS = ["🦊", "🐻", "🐼", "🦁", "🐸", "🐙", "🦄", "🐯", "🐨", "🦉", "🐺", "🐰", "🐢", "🦜", "🐳", "🦔"];

  // ----------------------------------------------------------------- model

  function playerById(id) {
    return db.players.find((p) => p.id === id) || null;
  }

  function playerName(id) {
    const p = playerById(id);
    return p ? p.name : "(removed player)";
  }

  function addPlayer(name) {
    const player = {
      id: uid(),
      name: name.trim(),
      avatar: AVATARS[db.players.length % AVATARS.length],
      createdAt: Date.now(),
    };
    db.players.push(player);
    save();
    return player;
  }

  function gameTotal(game, playerId) {
    let sum = 0;
    for (const r of game.rounds) if (r.playerId === playerId) sum += r.points;
    return sum;
  }

  function standings(game) {
    const rows = game.playerIds.map((pid) => ({ playerId: pid, total: gameTotal(game, pid) }));
    rows.sort((a, b) => (game.winRule === "low" ? a.total - b.total : b.total - a.total));
    return rows;
  }

  function leadersOf(game) {
    const rows = standings(game);
    if (!rows.length) return [];
    const best = rows[0].total;
    return rows.filter((r) => r.total === best).map((r) => r.playerId);
  }

  function allTimeStats() {
    const stats = new Map();
    for (const p of db.players) {
      stats.set(p.id, { player: p, points: 0, games: 0, wins: 0 });
    }
    for (const g of db.games) {
      for (const pid of g.playerIds) {
        const s = stats.get(pid);
        if (s) s.games++;
      }
      for (const r of g.rounds) {
        const s = stats.get(r.playerId);
        if (s) s.points += r.points;
      }
      if (g.finishedAt && g.winnerIds) {
        for (const pid of g.winnerIds) {
          const s = stats.get(pid);
          if (s) s.wins++;
        }
      }
    }
    return [...stats.values()].sort((a, b) => b.points - a.points || b.wins - a.wins);
  }

  // ------------------------------------------------------------------ utils

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function fmtTime(ts) {
    return new Date(ts).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  // ------------------------------------------------------------------ state

  const state = {
    tab: "games", // games | players | counter
    gameId: null, // non-null => game detail within games tab
    counterLog: [], // session-only quick counts
  };

  const view = document.getElementById("view");

  function render() {
    document.querySelectorAll("#tabs button").forEach((b) => {
      b.classList.toggle("active", b.dataset.tab === state.tab);
    });
    if (state.tab === "games") {
      if (state.gameId) renderGameDetail();
      else renderGamesList();
    } else if (state.tab === "players") {
      renderPlayers();
    } else {
      renderCounter();
    }
  }

  // ------------------------------------------------------------- games list

  function gameSummary(game) {
    const rows = standings(game);
    if (!rows.length) return "No players";
    return rows.map((r) => `${esc(playerName(r.playerId))} ${r.total}`).join(" · ");
  }

  function renderGamesList() {
    const active = db.games.filter((g) => !g.finishedAt).sort((a, b) => b.createdAt - a.createdAt);
    const done = db.games.filter((g) => g.finishedAt).sort((a, b) => b.finishedAt - a.finishedAt);

    let html = `<button class="btn primary big block" data-action="new-game">＋ New game</button>`;

    html += `<div class="section-title">Active games (${active.length})</div>`;
    if (!active.length) {
      html += `<div class="empty"><span class="big-emoji">🁢</span>No games running.<br>Start one and add your players!</div>`;
    }
    for (const g of active) {
      html += `
        <div class="card tappable" data-action="open-game" data-id="${g.id}">
          <div class="game-row">
            <div class="info">
              <div class="name">${esc(g.name)}<span class="badge">LIVE</span></div>
              <div class="sub">${gameSummary(g)}</div>
            </div>
            <span class="chevron">›</span>
          </div>
        </div>`;
    }

    if (done.length) {
      html += `<div class="section-title">Finished</div>`;
      for (const g of done) {
        const winners = (g.winnerIds || []).map(playerName).join(" & ");
        html += `
          <div class="card tappable" data-action="open-game" data-id="${g.id}">
            <div class="game-row">
              <div class="info">
                <div class="name">${esc(g.name)}<span class="badge done">DONE</span></div>
                <div class="sub">🏆 ${esc(winners || "—")} · ${fmtTime(g.finishedAt)}</div>
              </div>
              <span class="chevron">›</span>
            </div>
          </div>`;
      }
    }
    view.innerHTML = html;
  }

  // ----------------------------------------------------------- game detail

  function renderGameDetail() {
    const game = db.games.find((g) => g.id === state.gameId);
    if (!game) {
      state.gameId = null;
      return renderGamesList();
    }
    const leaders = new Set(leadersOf(game));
    const finished = !!game.finishedAt;
    const ruleLabel = game.winRule === "low" ? "lowest score wins" : "highest score wins";

    let html = `
      <div class="back-row">
        <button class="icon-btn" data-action="back-to-games">‹ Back</button>
        <h2>${esc(game.name)}</h2>
        <button class="icon-btn" data-action="rename-game" data-id="${game.id}">✎</button>
      </div>
      <div class="game-meta">${ruleLabel}${game.targetScore ? ` · plays to ${game.targetScore}` : ""}${finished ? ` · finished ${fmtTime(game.finishedAt)}` : ""}</div>`;

    if (finished) {
      const winners = (game.winnerIds || []).map((id) => `${esc(playerName(id))}`).join(" & ");
      html += `<div class="win-banner">🏆 ${winners || "Nobody"} won!</div>`;
    } else if (game.targetScore) {
      const reached = standings(game).filter((r) => r.total >= game.targetScore);
      if (reached.length) {
        html += `<div class="target-banner">🎯 ${esc(playerName(reached[0].playerId))} reached ${game.targetScore} — time to finish the game?</div>`;
      }
    }

    for (const row of standings(game)) {
      const p = playerById(row.playerId);
      const roundCount = game.rounds.filter((r) => r.playerId === row.playerId).length;
      html += `
        <div class="card ${leaders.has(row.playerId) && game.rounds.length ? "leader" : ""}">
          <div class="score-row">
            <span class="avatar">${p ? p.avatar : "👤"}</span>
            <div class="who">
              <div class="name">${esc(playerName(row.playerId))}</div>
              <div class="sub">${roundCount} round${roundCount === 1 ? "" : "s"}</div>
            </div>
            <div class="total">${row.total}</div>
            ${finished ? "" : `
            <div class="actions">
              <button class="cam" data-action="scan-for-player" data-game="${game.id}" data-player="${row.playerId}" title="Count with camera">📷</button>
              <button data-action="manual-for-player" data-game="${game.id}" data-player="${row.playerId}" title="Enter points">✎</button>
            </div>`}
          </div>
        </div>`;
    }

    if (game.rounds.length) {
      html += `<div class="section-title">History</div><div class="card">`;
      const recent = [...game.rounds].sort((a, b) => b.ts - a.ts);
      for (const r of recent) {
        html += `
          <div class="history-item">
            <div>
              <span class="pts">+${r.points}</span> ${esc(playerName(r.playerId))}
              <div class="meta">${r.method === "camera" ? "📷 camera" : "✎ manual"} · ${fmtTime(r.ts)}</div>
            </div>
            ${finished ? "" : `<button class="del" data-action="delete-round" data-game="${game.id}" data-round="${r.id}" title="Remove">✕</button>`}
          </div>`;
      }
      html += `</div>`;
    }

    html += `<div class="btn-row">`;
    if (finished) {
      html += `<button class="btn" data-action="reopen-game" data-id="${game.id}">↺ Reopen</button>`;
    } else {
      html += `<button class="btn primary" data-action="finish-game" data-id="${game.id}">🏁 Finish game</button>`;
    }
    html += `<button class="btn danger" data-action="delete-game" data-id="${game.id}">🗑 Delete</button></div>`;

    view.innerHTML = html;
  }

  // --------------------------------------------------------------- players

  function renderPlayers() {
    const stats = allTimeStats();
    let html = `<button class="btn primary big block" data-action="add-player">＋ Add player</button>
      <div class="section-title">All-time leaderboard</div>`;
    if (!stats.length) {
      html += `<div class="empty"><span class="big-emoji">👥</span>No players yet.<br>Add the people you play with.</div>`;
    }
    stats.forEach((s, i) => {
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : String(i + 1);
      html += `
        <div class="card">
          <div class="player-row">
            <span class="rank">${medal}</span>
            <span class="avatar">${s.player.avatar}</span>
            <div class="who">
              <div class="name">${esc(s.player.name)}</div>
              <div class="sub">${s.wins} win${s.wins === 1 ? "" : "s"} · ${s.games} game${s.games === 1 ? "" : "s"}</div>
            </div>
            <span class="pts">${s.points}</span>
            <button class="menu" data-action="player-menu" data-id="${s.player.id}">⋯</button>
          </div>
        </div>`;
    });
    view.innerHTML = html;
  }

  // --------------------------------------------------------------- counter

  function renderCounter() {
    let html = `
      <div class="counter-hero">
        <span class="big-emoji">🁫</span>
        <h2>Quick count</h2>
        <p>Count the eyes on your domino tiles without a game.<br>
        Lay the tiles on a plain surface with good light.</p>
        <button class="btn primary big" data-action="quick-count">📷 Open camera</button>
      </div>`;
    if (state.counterLog.length) {
      html += `<div class="section-title">This session</div><div class="card">`;
      for (const c of [...state.counterLog].reverse()) {
        html += `<div class="history-item"><span class="pts">${c.count} eyes</span><span class="meta">${fmtTime(c.ts)}</span></div>`;
      }
      html += `</div>`;
    }
    view.innerHTML = html;
  }

  // ---------------------------------------------------------------- modals

  const modalRoot = document.getElementById("modal-root");

  function closeModal() {
    modalRoot.innerHTML = "";
  }

  function showNewGameModal() {
    const defaultName = `Game ${db.games.length + 1}`;
    const checks = db.players
      .map(
        (p) => `<label><input type="checkbox" name="players" value="${p.id}" /> ${p.avatar} ${esc(p.name)}</label>`
      )
      .join("");
    modalRoot.innerHTML = `
      <div class="modal-backdrop" data-action="modal-backdrop">
        <div class="modal">
          <h3>New game</h3>
          <div class="field">
            <label>Name</label>
            <input type="text" id="ng-name" value="${esc(defaultName)}" />
          </div>
          <div class="field">
            <label>Players</label>
            <div class="check-list" id="ng-players">${checks || ""}</div>
            <div class="inline-add">
              <input type="text" id="ng-new-player" placeholder="Add a player…" />
              <button class="btn" data-action="ng-add-player">＋</button>
            </div>
          </div>
          <div class="field">
            <label>Winner</label>
            <select id="ng-rule">
              <option value="high">Highest score wins</option>
              <option value="low">Lowest score wins</option>
            </select>
          </div>
          <div class="field">
            <label>Play to (points, optional)</label>
            <input type="number" id="ng-target" inputmode="numeric" placeholder="e.g. 100" />
          </div>
          <div class="btn-row">
            <button class="btn ghost" data-action="modal-cancel">Cancel</button>
            <button class="btn primary" data-action="ng-create">Start game</button>
          </div>
        </div>
      </div>`;
  }

  function ngAddPlayer() {
    const input = document.getElementById("ng-new-player");
    const name = input.value.trim();
    if (!name) return;
    const p = addPlayer(name);
    const list = document.getElementById("ng-players");
    const label = document.createElement("label");
    label.innerHTML = `<input type="checkbox" name="players" value="${p.id}" checked /> ${p.avatar} ${esc(p.name)}`;
    list.appendChild(label);
    input.value = "";
    input.focus();
  }

  function ngCreate() {
    const name = document.getElementById("ng-name").value.trim() || "Game";
    const playerIds = [...document.querySelectorAll('#ng-players input:checked')].map((el) => el.value);
    if (!playerIds.length) {
      alert("Pick at least one player (or add a new one).");
      return;
    }
    const target = parseInt(document.getElementById("ng-target").value, 10);
    const game = {
      id: uid(),
      name,
      createdAt: Date.now(),
      finishedAt: null,
      winnerIds: null,
      winRule: document.getElementById("ng-rule").value === "low" ? "low" : "high",
      targetScore: Number.isFinite(target) && target > 0 ? target : null,
      playerIds,
      rounds: [],
    };
    db.games.push(game);
    save();
    closeModal();
    state.tab = "games";
    state.gameId = game.id;
    render();
  }

  function showManualModal(gameId, playerId) {
    modalRoot.innerHTML = `
      <div class="modal-backdrop" data-action="modal-backdrop">
        <div class="modal">
          <h3>Points for ${esc(playerName(playerId))}</h3>
          <div class="field">
            <label>Eyes counted</label>
            <input type="number" id="manual-points" inputmode="numeric" autofocus />
          </div>
          <div class="btn-row">
            <button class="btn ghost" data-action="modal-cancel">Cancel</button>
            <button class="btn primary" data-action="manual-save" data-game="${gameId}" data-player="${playerId}">Add</button>
          </div>
        </div>
      </div>`;
    setTimeout(() => {
      const el = document.getElementById("manual-points");
      if (el) el.focus();
    }, 50);
  }

  function addRound(gameId, playerId, points, method) {
    const game = db.games.find((g) => g.id === gameId);
    if (!game || game.finishedAt) return;
    game.rounds.push({ id: uid(), playerId, points, method, ts: Date.now() });
    save();
    render();
  }

  // ---------------------------------------------------------------- camera

  const cam = {
    el: document.getElementById("camera"),
    video: document.getElementById("camera-video"),
    canvas: document.getElementById("camera-canvas"),
    countEl: document.getElementById("camera-count"),
    titleEl: document.getElementById("camera-title"),
    hintEl: document.getElementById("camera-hint"),
    errorEl: document.getElementById("camera-error"),
    polarityBtn: document.getElementById("polarity-btn"),
    stream: null,
    raf: 0,
    detectTimer: 0,
    workCanvas: document.createElement("canvas"),
    frozenCanvas: document.createElement("canvas"),
    pips: [],
    detectedCount: 0,
    adjust: 0,
    frozen: false,
    polarity: "auto",
    onConfirm: null,
  };

  const POLARITY_LABELS = { auto: "Auto", dark: "● Dark", light: "○ Light" };

  function camButtons() {
    return {
      capture: document.querySelector('[data-action="camera-capture"]'),
      confirm: document.querySelector('[data-action="camera-confirm"]'),
      retake: document.querySelector('[data-action="camera-retake"]'),
      minus: document.querySelector('[data-action="camera-minus"]'),
      plus: document.querySelector('[data-action="camera-plus"]'),
    };
  }

  async function openCamera(title, onConfirm) {
    cam.onConfirm = onConfirm;
    cam.titleEl.textContent = title;
    cam.pips = [];
    cam.detectedCount = 0;
    cam.adjust = 0;
    cam.frozen = false;
    cam.errorEl.hidden = true;
    cam.el.hidden = false;
    document.body.style.overflow = "hidden";
    updateCamUi();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      camFail("Camera is not available here. Note: the camera only works over HTTPS. You can still close this and enter the count manually (✎).");
      return;
    }
    try {
      cam.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
    } catch (e) {
      camFail("Could not open the camera (" + e.name + "). Check camera permissions for this site, or close and enter the count manually (✎).");
      return;
    }
    cam.video.srcObject = cam.stream;
    try {
      await cam.video.play();
    } catch (e) {
      /* iOS sometimes rejects an already-playing video; ignore */
    }
    startCamLoops();
  }

  function camFail(message) {
    cam.errorEl.textContent = message;
    cam.errorEl.hidden = false;
    const b = camButtons();
    b.capture.hidden = true;
  }

  function startCamLoops() {
    const draw = () => {
      if (cam.el.hidden) return;
      if (!cam.frozen && cam.video.videoWidth) {
        const vw = cam.video.videoWidth;
        const vh = cam.video.videoHeight;
        const scale = Math.min(1, 720 / vw);
        const dw = Math.round(vw * scale);
        const dh = Math.round(vh * scale);
        if (cam.canvas.width !== dw) {
          cam.canvas.width = dw;
          cam.canvas.height = dh;
        }
        const ctx = cam.canvas.getContext("2d");
        ctx.drawImage(cam.video, 0, 0, dw, dh);
        drawPipOverlay(ctx, dw, dh);
      }
      cam.raf = requestAnimationFrame(draw);
    };
    cam.raf = requestAnimationFrame(draw);
    cam.detectTimer = setInterval(() => {
      if (!cam.frozen) runDetection();
    }, 280);
  }

  function runDetection() {
    if (!cam.video.videoWidth) return;
    const vw = cam.video.videoWidth;
    const vh = cam.video.videoHeight;
    const ww = 360;
    const wh = Math.round((vh / vw) * ww);
    cam.workCanvas.width = ww;
    cam.workCanvas.height = wh;
    const wctx = cam.workCanvas.getContext("2d", { willReadFrequently: true });
    wctx.drawImage(cam.video, 0, 0, ww, wh);
    const imageData = wctx.getImageData(0, 0, ww, wh);
    const result = DominoDetector.detect(imageData, { polarity: cam.polarity === "auto" ? "auto" : cam.polarity });
    // Normalized coordinates so the display canvas can be any size.
    cam.pips = result.pips.map((p) => ({ x: p.x / ww, y: p.y / wh, r: p.r / ww }));
    cam.detectedCount = result.count;
    updateCamUi();
  }

  function drawPipOverlay(ctx, w, h) {
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#34d399";
    for (const p of cam.pips) {
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, Math.max(6, p.r * w * 1.6), 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function currentCount() {
    return Math.max(0, cam.detectedCount + cam.adjust);
  }

  function updateCamUi() {
    cam.countEl.textContent = String(currentCount());
    cam.polarityBtn.textContent = POLARITY_LABELS[cam.polarity];
    const b = camButtons();
    b.capture.hidden = cam.frozen;
    b.confirm.hidden = !cam.frozen;
    b.retake.hidden = !cam.frozen;
    b.minus.hidden = !cam.frozen;
    b.plus.hidden = !cam.frozen;
    cam.hintEl.textContent = cam.frozen
      ? "Check the circles — fix the count with − / ＋ if needed"
      : "Point the camera at the tiles, then capture";
  }

  function captureFrame() {
    if (!cam.video.videoWidth) return;
    cam.frozen = true;
    cam.adjust = 0;
    // Keep a clean (no overlay) copy of the frame for re-detection/redraws.
    cam.frozenCanvas.width = cam.canvas.width;
    cam.frozenCanvas.height = cam.canvas.height;
    cam.frozenCanvas
      .getContext("2d")
      .drawImage(cam.video, 0, 0, cam.frozenCanvas.width, cam.frozenCanvas.height);
    runDetectionFromFrozenFrame();
    redrawFrozen();
    updateCamUi();
  }

  function runDetectionFromFrozenFrame() {
    const dw = cam.frozenCanvas.width;
    const dh = cam.frozenCanvas.height;
    if (!dw) return;
    const ww = 360;
    const wh = Math.round((dh / dw) * ww);
    cam.workCanvas.width = ww;
    cam.workCanvas.height = wh;
    const wctx = cam.workCanvas.getContext("2d", { willReadFrequently: true });
    wctx.drawImage(cam.frozenCanvas, 0, 0, ww, wh);
    const imageData = wctx.getImageData(0, 0, ww, wh);
    const result = DominoDetector.detect(imageData, { polarity: cam.polarity === "auto" ? "auto" : cam.polarity });
    cam.pips = result.pips.map((p) => ({ x: p.x / ww, y: p.y / wh, r: p.r / ww }));
    cam.detectedCount = result.count;
  }

  function redrawFrozen() {
    const ctx = cam.canvas.getContext("2d");
    ctx.drawImage(cam.frozenCanvas, 0, 0);
    drawPipOverlay(ctx, cam.canvas.width, cam.canvas.height);
  }

  function retake() {
    cam.frozen = false;
    cam.adjust = 0;
    updateCamUi();
  }

  function closeCamera() {
    cam.el.hidden = true;
    document.body.style.overflow = "";
    cancelAnimationFrame(cam.raf);
    clearInterval(cam.detectTimer);
    if (cam.stream) {
      for (const t of cam.stream.getTracks()) t.stop();
      cam.stream = null;
    }
    cam.video.srcObject = null;
    cam.onConfirm = null;
  }

  function confirmCamera() {
    const count = currentCount();
    const cb = cam.onConfirm;
    closeCamera();
    if (cb) cb(count);
  }

  function cyclePolarity() {
    cam.polarity = cam.polarity === "auto" ? "dark" : cam.polarity === "dark" ? "light" : "auto";
    if (cam.frozen) {
      cam.adjust = 0;
      runDetectionFromFrozenFrame();
      redrawFrozen();
    }
    updateCamUi();
  }

  // ---------------------------------------------------------------- share

  async function shareApp() {
    const url = location.href;
    const data = { title: "Domino Eye Counter", text: "Count domino eyes with your camera and keep score!", url };
    if (navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch (e) {
        if (e.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      alert("Link copied! Send it to your friends:\n" + url);
    } catch (e) {
      prompt("Copy this link and send it to your friends:", url);
    }
  }

  // --------------------------------------------------------------- actions

  document.addEventListener("click", (ev) => {
    const target = ev.target.closest("[data-action]");
    if (!target) return;
    const action = target.dataset.action;

    switch (action) {
      case "share":
        shareApp();
        break;

      // navigation
      case "open-game":
        state.gameId = target.dataset.id;
        render();
        break;
      case "back-to-games":
        state.gameId = null;
        render();
        break;

      // game lifecycle
      case "new-game":
        showNewGameModal();
        break;
      case "ng-add-player":
        ngAddPlayer();
        break;
      case "ng-create":
        ngCreate();
        break;
      case "rename-game": {
        const game = db.games.find((g) => g.id === target.dataset.id);
        if (!game) break;
        const name = prompt("Game name:", game.name);
        if (name && name.trim()) {
          game.name = name.trim();
          save();
          render();
        }
        break;
      }
      case "finish-game": {
        const game = db.games.find((g) => g.id === target.dataset.id);
        if (!game) break;
        if (!confirm("Finish this game and declare the winner?")) break;
        game.finishedAt = Date.now();
        game.winnerIds = leadersOf(game);
        save();
        render();
        break;
      }
      case "reopen-game": {
        const game = db.games.find((g) => g.id === target.dataset.id);
        if (!game) break;
        game.finishedAt = null;
        game.winnerIds = null;
        save();
        render();
        break;
      }
      case "delete-game": {
        const game = db.games.find((g) => g.id === target.dataset.id);
        if (!game) break;
        if (!confirm(`Delete "${game.name}" and all its scores? This cannot be undone.`)) break;
        db.games = db.games.filter((g) => g.id !== game.id);
        save();
        state.gameId = null;
        render();
        break;
      }

      // scoring
      case "scan-for-player": {
        const gameId = target.dataset.game;
        const playerId = target.dataset.player;
        openCamera(`Counting for ${playerName(playerId)}`, (count) => {
          if (count > 0) addRound(gameId, playerId, count, "camera");
          else render();
        });
        break;
      }
      case "manual-for-player":
        showManualModal(target.dataset.game, target.dataset.player);
        break;
      case "manual-save": {
        const points = parseInt(document.getElementById("manual-points").value, 10);
        if (!Number.isFinite(points) || points <= 0) {
          alert("Enter a number of eyes greater than 0.");
          break;
        }
        closeModal();
        addRound(target.dataset.game, target.dataset.player, points, "manual");
        break;
      }
      case "delete-round": {
        const game = db.games.find((g) => g.id === target.dataset.game);
        if (!game) break;
        game.rounds = game.rounds.filter((r) => r.id !== target.dataset.round);
        save();
        render();
        break;
      }

      // players
      case "add-player": {
        const name = prompt("Player name:");
        if (name && name.trim()) {
          addPlayer(name.trim());
          render();
        }
        break;
      }
      case "player-menu": {
        const player = playerById(target.dataset.id);
        if (!player) break;
        const choice = prompt(`${player.name} — type a new name to rename, or "delete" to remove:`, player.name);
        if (choice === null) break;
        if (choice.trim().toLowerCase() === "delete") {
          if (confirm(`Remove ${player.name}? Their past scores stay in game history.`)) {
            db.players = db.players.filter((p) => p.id !== player.id);
            save();
            render();
          }
        } else if (choice.trim() && choice.trim() !== player.name) {
          player.name = choice.trim();
          save();
          render();
        }
        break;
      }

      // quick counter
      case "quick-count":
        openCamera("Quick count", (count) => {
          state.counterLog.push({ count, ts: Date.now() });
          render();
        });
        break;

      // camera controls
      case "camera-close":
        closeCamera();
        break;
      case "camera-capture":
        captureFrame();
        break;
      case "camera-retake":
        retake();
        break;
      case "camera-confirm":
        confirmCamera();
        break;
      case "camera-minus":
        cam.adjust--;
        updateCamUi();
        break;
      case "camera-plus":
        cam.adjust++;
        updateCamUi();
        break;
      case "camera-polarity":
        cyclePolarity();
        break;

      // modal plumbing
      case "modal-cancel":
        closeModal();
        break;
      case "modal-backdrop":
        if (ev.target === target) closeModal();
        break;
    }
  });

  document.getElementById("tabs").addEventListener("click", (ev) => {
    const btn = ev.target.closest("button[data-tab]");
    if (!btn) return;
    state.tab = btn.dataset.tab;
    if (state.tab !== "games") state.gameId = null;
    render();
  });

  // Enter key adds the inline player in the new-game modal.
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" && ev.target.id === "ng-new-player") {
      ev.preventDefault();
      ngAddPlayer();
    }
  });

  // ------------------------------------------------------------------- pwa

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {
      /* offline support is optional */
    });
  }

  render();
})();
