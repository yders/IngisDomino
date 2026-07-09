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

  // A player's score entries in the order they were added; entry i is the
  // player's round i+1. Rounds are derived by index so the model stays a
  // flat list and players who joined late simply have blank early rounds.
  function playerEntries(game, playerId) {
    return game.rounds.filter((r) => r.playerId === playerId);
  }

  function playerGameStats(game, playerId) {
    const entries = playerEntries(game, playerId);
    const total = entries.reduce((s, e) => s + e.points, 0);
    const zeros = entries.reduce((s, e) => s + (e.points === 0 ? 1 : 0), 0);
    const avg = entries.length ? total / entries.length : null;
    return { entries, total, zeros, avg };
  }

  function allTimeStats() {
    const stats = new Map();
    for (const p of db.players) {
      stats.set(p.id, { player: p, points: 0, games: 0, wins: 0, rounds: 0, zeros: 0 });
    }
    for (const g of db.games) {
      for (const pid of g.playerIds) {
        const s = stats.get(pid);
        if (s) s.games++;
      }
      for (const r of g.rounds) {
        const s = stats.get(r.playerId);
        if (!s) continue;
        s.points += r.points;
        s.rounds++;
        if (r.points === 0) s.zeros++;
      }
      if (g.finishedAt && g.winnerIds) {
        for (const pid of g.winnerIds) {
          const s = stats.get(pid);
          if (s) s.wins++;
        }
      }
    }
    return [...stats.values()].sort((a, b) => b.wins - a.wins || b.points - a.points);
  }

  // ------------------------------------------------------------------ utils

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // Player avatar: their photo if they have one, otherwise their emoji.
  // Sizing comes from the surrounding context's CSS.
  function avatarHtml(player) {
    if (player && player.photo) return `<img class="avatar-img" src="${player.photo}" alt="" />`;
    return `<span class="avatar">${player ? player.avatar : "👤"}</span>`;
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

  // Classic Mexican-train style scoresheet: one row per round, one column
  // per player, totals at the bottom. Best score of each round is green;
  // tapping a number lets the scorekeeper fix it (while the game is live).
  function renderScoreboard(game) {
    const cols = game.playerIds.map((pid) => ({ pid, entries: playerEntries(game, pid) }));
    let numRounds = 0;
    for (const c of cols) if (c.entries.length > numRounds) numRounds = c.entries.length;
    if (!numRounds) return "";
    const finished = !!game.finishedAt;
    const leaders = new Set(leadersOf(game));
    const bestOf = game.winRule === "low" ? Math.min : Math.max;

    let html = `<div class="section-title">Rounds</div><div class="card scoreboard-card"><table class="scoreboard"><thead><tr><th></th>`;
    for (const c of cols) {
      const p = playerById(c.pid);
      html += `<th>${avatarHtml(p)}<span class="nm">${esc(playerName(c.pid))}</span></th>`;
    }
    html += `</tr></thead><tbody>`;
    for (let i = 0; i < numRounds; i++) {
      const values = [];
      for (const c of cols) if (c.entries[i]) values.push(c.entries[i].points);
      const best = values.length ? bestOf.apply(null, values) : null;
      html += `<tr><td class="rnd">${i + 1}</td>`;
      for (const c of cols) {
        const e = c.entries[i];
        if (!e) {
          html += `<td class="cell empty">–</td>`;
        } else {
          const cls = e.points === best ? " best" : "";
          const tap = finished ? "" : ` data-action="edit-cell" data-game="${game.id}" data-player="${c.pid}" data-index="${i}"`;
          html += `<td class="cell${cls}"${tap}>${e.points}</td>`;
        }
      }
      html += `</tr>`;
    }
    html += `</tbody><tfoot><tr><th>Σ</th>`;
    for (const c of cols) {
      const lead = leaders.has(c.pid);
      html += `<td class="${lead ? "lead" : ""}">${lead ? "👑 " : ""}${gameTotal(game, c.pid)}</td>`;
    }
    html += `</tr></tfoot></table>${finished ? "" : `<div class="hint-line">Tap a number to fix it</div>`}</div>`;
    return html;
  }

  function renderGameDetail() {
    const game = db.games.find((g) => g.id === state.gameId);
    if (!game) {
      state.gameId = null;
      return renderGamesList();
    }
    const finished = !!game.finishedAt;
    const ruleLabel = game.winRule === "low" ? "lowest score wins" : "highest score wins";

    let html = `
      <div class="back-row">
        <button class="icon-btn" data-action="back-to-games">‹ Back</button>
        <h2>${esc(game.name)}</h2>
        <button class="icon-btn" data-action="rename-game" data-id="${game.id}">✎</button>
      </div>
      <div class="game-meta">${
        finished
          ? ruleLabel
          : `<button class="rule-chip" data-action="toggle-rule" data-id="${game.id}">${ruleLabel} ⇄</button>`
      }${game.targetScore ? ` · plays to ${game.targetScore}` : ""}${finished ? ` · finished ${fmtTime(game.finishedAt)}` : ""}</div>`;

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
      const st = playerGameStats(game, row.playerId);
      const n = st.entries.length;
      const sub = n
        ? `${n} round${n === 1 ? "" : "s"} · avg ${st.avg.toFixed(1)}${st.zeros ? ` · ${st.zeros}× 🥚` : ""}`
        : "no rounds yet";
      html += `
        <div class="card">
          <div class="score-row">
            ${avatarHtml(p)}
            <div class="who">
              <div class="name">${esc(playerName(row.playerId))}</div>
              <div class="sub">${sub}</div>
            </div>
            <div class="total" data-total="${row.playerId}">${row.total}</div>
            ${finished ? "" : `
            <div class="actions">
              <button class="cam" data-action="scan-for-player" data-game="${game.id}" data-player="${row.playerId}" title="Count with camera">📷</button>
              <button data-action="manual-for-player" data-game="${game.id}" data-player="${row.playerId}" title="Enter points">✎</button>
            </div>`}
          </div>
        </div>`;
    }

    if (!finished) {
      html += `<button class="btn ghost block" data-action="add-player-to-game" data-id="${game.id}">＋ Add player to game</button>`;
    }

    html += renderScoreboard(game);

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
            <button class="avatar-btn" data-action="player-photo" data-id="${s.player.id}" title="Set photo">${avatarHtml(s.player)}</button>
            <div class="who">
              <div class="name">${esc(s.player.name)}</div>
              <div class="sub">${s.wins} win${s.wins === 1 ? "" : "s"} · ${s.games} game${s.games === 1 ? "" : "s"}</div>
              ${s.rounds ? `<div class="sub">avg ${(s.points / s.rounds).toFixed(1)}/round${s.zeros ? ` · ${s.zeros}× 🥚` : ""}</div>` : ""}
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
        (p) => `<label><input type="checkbox" name="players" value="${p.id}" /> ${avatarHtml(p)} ${esc(p.name)}</label>`
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
            <div class="seg" id="ng-rule">
              <button type="button" class="seg-btn active" data-action="ng-rule-pick" data-rule="low">Lowest wins</button>
              <button type="button" class="seg-btn" data-action="ng-rule-pick" data-rule="high">Highest wins</button>
            </div>
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

  // Shared by the new-game and add-to-game modals: create a player from the
  // inline input and append it to the checkbox list, pre-checked.
  function inlineAddPlayer(listId, inputId) {
    const input = document.getElementById(inputId);
    const name = input.value.trim();
    if (!name) return;
    const p = addPlayer(name);
    const label = document.createElement("label");
    label.innerHTML = `<input type="checkbox" name="players" value="${p.id}" checked /> ${p.avatar} ${esc(p.name)}`;
    document.getElementById(listId).appendChild(label);
    input.value = "";
    input.focus();
  }

  function showAddToGameModal(gameId) {
    const game = db.games.find((g) => g.id === gameId);
    if (!game) return;
    const available = db.players.filter((p) => !game.playerIds.includes(p.id));
    const checks = available
      .map((p) => `<label><input type="checkbox" name="players" value="${p.id}" /> ${avatarHtml(p)} ${esc(p.name)}</label>`)
      .join("");
    modalRoot.innerHTML = `
      <div class="modal-backdrop" data-action="modal-backdrop">
        <div class="modal">
          <h3>Who's joining ${esc(game.name)}?</h3>
          <div class="field">
            <div class="check-list" id="ag-players">${checks}</div>
            <div class="inline-add">
              <input type="text" id="ag-new-player" placeholder="${available.length ? "Or add a new player…" : "New player's name…"}" />
              <button class="btn" data-action="ag-add-player">＋</button>
            </div>
          </div>
          <div class="btn-row">
            <button class="btn ghost" data-action="modal-cancel">Cancel</button>
            <button class="btn primary" data-action="ag-save" data-id="${game.id}">Add to game</button>
          </div>
        </div>
      </div>`;
  }

  function agSave(gameId) {
    const game = db.games.find((g) => g.id === gameId);
    if (!game) return;
    const ids = [...document.querySelectorAll("#ag-players input:checked")].map((el) => el.value);
    if (!ids.length) {
      alert("Pick who joins (or add a new player with ＋).");
      return;
    }
    for (const id of ids) {
      if (!game.playerIds.includes(id)) game.playerIds.push(id);
    }
    save();
    closeModal();
    render();
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
      winRule: (() => {
        const active = document.querySelector("#ng-rule .seg-btn.active");
        return active && active.dataset.rule === "high" ? "high" : "low";
      })(),
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

  // Manual entry walks through the whole table: tap ✎ on a player and the
  // sheet starts there, then each Add advances to the next player in the
  // game (each player once, wrapping around), so a 7-player round is
  // type-Add, type-Add… with the number pad staying up the whole time.
  // Focus must be called synchronously inside the tap handler or iOS will
  // not raise the keyboard.
  const manualQueue = { gameId: null, ids: [], index: 0 };

  function showManualModal(gameId, playerId) {
    const game = db.games.find((g) => g.id === gameId);
    if (!game) return;
    const start = game.playerIds.indexOf(playerId);
    manualQueue.gameId = gameId;
    manualQueue.ids = game.playerIds
      .slice(start === -1 ? 0 : start)
      .concat(game.playerIds.slice(0, start === -1 ? 0 : start));
    manualQueue.index = 0;

    modalRoot.innerHTML = `
      <div class="modal-backdrop" data-action="modal-backdrop">
        <div class="modal">
          <h3>Eyes for <span id="manual-name"></span></h3>
          <div class="field">
            <input type="number" id="manual-points" inputmode="numeric" min="0" enterkeyhint="done" />
          </div>
          <div class="btn-row">
            <button class="btn ghost" data-action="modal-cancel">Done</button>
            <button class="btn ghost" data-action="manual-skip" ${manualQueue.ids.length > 1 ? "" : "hidden"}>Skip ›</button>
            <button class="btn primary" data-action="manual-save">✓ Add</button>
          </div>
          <div class="hint-line" id="manual-progress"></div>
        </div>
      </div>`;
    updateManualSheet();
  }

  function updateManualSheet() {
    const nameEl = document.getElementById("manual-name");
    const input = document.getElementById("manual-points");
    if (!nameEl || !input) return;
    const playerId = manualQueue.ids[manualQueue.index];
    nameEl.textContent = playerName(playerId);
    const progress = document.getElementById("manual-progress");
    if (progress) {
      progress.textContent =
        manualQueue.ids.length > 1 ? `Player ${manualQueue.index + 1} of ${manualQueue.ids.length}` : "";
    }
    input.value = "";
    input.focus();
  }

  // Advance to the next player, or close after the last one.
  function manualAdvance() {
    manualQueue.index++;
    if (manualQueue.index >= manualQueue.ids.length) {
      closeModal();
    } else {
      updateManualSheet();
    }
  }

  function showPlayerMenu(playerId) {
    const p = playerById(playerId);
    if (!p) return;
    modalRoot.innerHTML = `
      <div class="modal-backdrop" data-action="modal-backdrop">
        <div class="modal">
          <h3>${esc(p.name)}</h3>
          <div class="menu-list">
            <button class="btn block" data-action="pm-photo" data-id="${p.id}">📷 ${p.photo ? "Change photo" : "Add photo"}</button>
            ${p.photo ? `<button class="btn block" data-action="pm-remove-photo" data-id="${p.id}">✕ Remove photo</button>` : ""}
            <button class="btn block" data-action="pm-rename" data-id="${p.id}">✎ Rename</button>
            <button class="btn block danger" data-action="pm-delete" data-id="${p.id}">🗑 Delete player</button>
            <button class="btn block ghost" data-action="modal-cancel">Cancel</button>
          </div>
        </div>
      </div>`;
  }

  // ---------------------------------------------------------------- photos

  // Hidden file input: on iOS, accept="image/*" offers Take Photo or the
  // photo library. The chosen image is center-cropped square, shrunk to
  // 96px, and stored as a small JPEG data URL on the player.
  const photoInput = document.createElement("input");
  photoInput.type = "file";
  photoInput.accept = "image/*";
  photoInput.hidden = true;
  document.body.appendChild(photoInput);
  let pendingPhotoPlayerId = null;

  photoInput.addEventListener("change", () => {
    const file = photoInput.files && photoInput.files[0];
    const playerId = pendingPhotoPlayerId;
    pendingPhotoPlayerId = null;
    photoInput.value = "";
    if (file && playerId) setPlayerPhoto(playerId, file);
  });

  function setPlayerPhoto(playerId, file) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const SIZE = 96;
      const canvas = document.createElement("canvas");
      canvas.width = SIZE;
      canvas.height = SIZE;
      const side = Math.min(img.width, img.height);
      canvas.getContext("2d").drawImage(
        img,
        (img.width - side) / 2, (img.height - side) / 2, side, side,
        0, 0, SIZE, SIZE
      );
      const player = playerById(playerId);
      if (player) {
        player.photo = canvas.toDataURL("image/jpeg", 0.82);
        save();
        render();
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      alert("Could not read that image.");
    };
    img.src = url;
  }

  function addRound(gameId, playerId, points, method) {
    const game = db.games.find((g) => g.id === gameId);
    if (!game || game.finishedAt) return;
    game.rounds.push({ id: uid(), playerId, points, method, ts: Date.now() });
    save();
    render();
    const totalEl = document.querySelector(`[data-total="${playerId}"]`);
    if (totalEl) totalEl.classList.add("pop");
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
    counting: false,
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
    cam.counting = false;
    cam.errorEl.hidden = true;
    cam.el.hidden = false;
    document.body.style.overflow = "hidden";
    updateCamUi();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      camFail("Camera is not available here. Note: the camera only works over HTTPS. You can still close this and enter the count manually (✎).");
      return;
    }
    // Reuse the stream acquired earlier this session: calling getUserMedia
    // again makes iOS home-screen apps re-prompt for permission on every
    // scan, so ask once and keep the stream (capture is disabled while the
    // camera view is closed).
    const liveTrack = cam.stream && cam.stream.getVideoTracks().find((t) => t.readyState === "live");
    if (liveTrack) {
      for (const t of cam.stream.getTracks()) t.enabled = true;
    } else {
      try {
        cam.stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch (e) {
        cam.stream = null;
        camFail("Could not open the camera (" + e.name + "). Check camera permissions for this site, or close and enter the count manually (✎).");
        return;
      }
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
    cam.countEl.textContent = cam.counting ? "…" : String(currentCount());
    cam.polarityBtn.textContent = POLARITY_LABELS[cam.polarity];
    const b = camButtons();
    const settled = cam.frozen && !cam.counting;
    b.capture.hidden = cam.frozen;
    b.confirm.hidden = !settled;
    b.retake.hidden = !settled;
    b.minus.hidden = !settled;
    b.plus.hidden = !settled;
    cam.hintEl.textContent = cam.counting
      ? "Counting the photo…"
      : cam.frozen
        ? "Check the green circles — fix the count with − / ＋ if needed"
        : "Point at the tiles, then tap the round button";
  }

  // Detect on a full-resolution still, working at up to 720px wide for
  // accuracy. Returns the count and overlay pips in normalized coords.
  function detectStill(source) {
    const sw = source.width;
    const sh = source.height;
    const ww = Math.min(720, sw);
    const wh = Math.round((sh / sw) * ww);
    cam.workCanvas.width = ww;
    cam.workCanvas.height = wh;
    const wctx = cam.workCanvas.getContext("2d", { willReadFrequently: true });
    wctx.drawImage(source, 0, 0, ww, wh);
    const imageData = wctx.getImageData(0, 0, ww, wh);
    const result = DominoDetector.detect(imageData, { polarity: cam.polarity === "auto" ? "auto" : cam.polarity });
    return {
      count: result.count,
      pips: result.pips.map((p) => ({ x: p.x / ww, y: p.y / wh, r: p.r / ww })),
    };
  }

  function grabFullResStill() {
    const c = document.createElement("canvas");
    c.width = cam.video.videoWidth;
    c.height = cam.video.videoHeight;
    c.getContext("2d").drawImage(cam.video, 0, 0, c.width, c.height);
    return c;
  }

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // The live preview is only an estimate. On capture we grab a short burst
  // of full-resolution stills, recount each, and trust the majority result
  // (a single frame can be blurred or catch glare). The frame that produced
  // the winning count becomes the frozen image shown with its pip circles.
  async function captureFrame() {
    if (!cam.video.videoWidth || cam.counting) return;
    cam.frozen = true;
    cam.counting = true;
    cam.adjust = 0;
    updateCamUi();

    const results = [];
    for (let i = 0; i < 3; i++) {
      const still = grabFullResStill();
      results.push({ still, ...detectStill(still) });
      if (i < 2) await wait(60);
    }

    // Majority vote on the count; ties favor the earlier (usually sharper) frame.
    const tally = new Map();
    for (const r of results) tally.set(r.count, (tally.get(r.count) || 0) + 1);
    let bestCount = results[0].count;
    let bestVotes = 0;
    for (const r of results) {
      const v = tally.get(r.count);
      if (v > bestVotes) {
        bestVotes = v;
        bestCount = r.count;
      }
    }
    const chosen = results.find((r) => r.count === bestCount);

    cam.frozenCanvas = chosen.still;
    cam.pips = chosen.pips;
    cam.detectedCount = chosen.count;
    cam.counting = false;
    redrawFrozen();
    updateCamUi();
  }

  function runDetectionFromFrozenFrame() {
    if (!cam.frozenCanvas.width) return;
    const r = detectStill(cam.frozenCanvas);
    cam.pips = r.pips;
    cam.detectedCount = r.count;
  }

  function redrawFrozen() {
    // The frozen still is full camera resolution; scale it to fill the
    // display canvas (which keeps the live preview's aspect ratio).
    const ctx = cam.canvas.getContext("2d");
    ctx.drawImage(
      cam.frozenCanvas,
      0, 0, cam.frozenCanvas.width, cam.frozenCanvas.height,
      0, 0, cam.canvas.width, cam.canvas.height
    );
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
    // Disable capture but keep the stream, so reopening the camera does not
    // trigger a new iOS permission prompt. Fully released on pagehide.
    if (cam.stream) {
      for (const t of cam.stream.getTracks()) t.enabled = false;
    }
    cam.onConfirm = null;
  }

  function releaseCamera() {
    if (cam.stream) {
      for (const t of cam.stream.getTracks()) t.stop();
      cam.stream = null;
      cam.video.srcObject = null;
    }
  }
  window.addEventListener("pagehide", releaseCamera);

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
        inlineAddPlayer("ng-players", "ng-new-player");
        break;
      case "ng-create":
        ngCreate();
        break;
      case "add-player-to-game":
        showAddToGameModal(target.dataset.id);
        break;
      case "ag-add-player":
        inlineAddPlayer("ag-players", "ag-new-player");
        break;
      case "ag-save":
        agSave(target.dataset.id);
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
          addRound(gameId, playerId, count, "camera");
        });
        break;
      }
      case "manual-for-player":
        showManualModal(target.dataset.game, target.dataset.player);
        break;
      case "manual-save": {
        const points = parseInt(document.getElementById("manual-points").value, 10);
        if (!Number.isFinite(points) || points < 0) {
          alert("Enter the number of eyes.");
          break;
        }
        addRound(manualQueue.gameId, manualQueue.ids[manualQueue.index], points, "manual");
        manualAdvance();
        break;
      }
      case "manual-skip":
        manualAdvance();
        break;
      case "edit-cell": {
        const game = db.games.find((g) => g.id === target.dataset.game);
        if (!game || game.finishedAt) break;
        const playerId = target.dataset.player;
        const index = parseInt(target.dataset.index, 10);
        const entry = playerEntries(game, playerId)[index];
        if (!entry) break;
        const answer = prompt(
          `Round ${index + 1} for ${playerName(playerId)} — new eye count, or "x" to remove:`,
          String(entry.points)
        );
        if (answer === null) break;
        const t = answer.trim().toLowerCase();
        if (t === "x") {
          game.rounds = game.rounds.filter((r) => r.id !== entry.id);
          save();
          render();
          break;
        }
        const v = parseInt(t, 10);
        if (Number.isFinite(v) && v >= 0) {
          entry.points = v;
          save();
          render();
        } else {
          alert('Enter a number (0 or more), or "x" to remove the round.');
        }
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
      case "ng-rule-pick": {
        document.querySelectorAll("#ng-rule .seg-btn").forEach((b) => {
          b.classList.toggle("active", b === target);
        });
        break;
      }
      case "toggle-rule": {
        const game = db.games.find((g) => g.id === target.dataset.id);
        if (!game || game.finishedAt) break;
        game.winRule = game.winRule === "low" ? "high" : "low";
        save();
        render();
        break;
      }

      case "player-menu":
        showPlayerMenu(target.dataset.id);
        break;
      case "player-photo":
      case "pm-photo":
        closeModal();
        pendingPhotoPlayerId = target.dataset.id;
        photoInput.click();
        break;
      case "pm-remove-photo": {
        const player = playerById(target.dataset.id);
        if (player) {
          delete player.photo;
          save();
        }
        closeModal();
        render();
        break;
      }
      case "pm-rename": {
        const player = playerById(target.dataset.id);
        if (!player) break;
        const name = prompt("Player name:", player.name);
        closeModal();
        if (name && name.trim()) {
          player.name = name.trim();
          save();
        }
        render();
        break;
      }
      case "pm-delete": {
        const player = playerById(target.dataset.id);
        if (!player) break;
        if (confirm(`Remove ${player.name}? Their past scores stay in game history.`)) {
          db.players = db.players.filter((p) => p.id !== player.id);
          save();
          closeModal();
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
    // Tapping any tab (including Games while inside a game) returns to the
    // tab's top-level view.
    state.gameId = null;
    render();
  });

  // Enter key adds the inline player in the new-game / add-to-game modals.
  document.addEventListener("keydown", (ev) => {
    if (ev.key !== "Enter") return;
    if (ev.target.id === "ng-new-player") {
      ev.preventDefault();
      inlineAddPlayer("ng-players", "ng-new-player");
    } else if (ev.target.id === "ag-new-player") {
      ev.preventDefault();
      inlineAddPlayer("ag-players", "ag-new-player");
    } else if (ev.target.id === "manual-points") {
      ev.preventDefault();
      const saveBtn = document.querySelector('[data-action="manual-save"]');
      if (saveBtn) saveBtn.click();
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
