(function () {
  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d");
  const D = VMJDraw;
  const A = VMJAudio;
  const ROOM_Y = 36;
  const DIRS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
  };
  const ENTRY = {
    s: [[9, 12], [10, 12]],
    n: [[9, 3], [10, 3]],
    w: [[3, 6], [3, 7]],
    e: [[16, 6], [16, 7]]
  };
  const FACE = { s: "up", n: "down", w: "right", e: "left" };
  const DOOR = {
    n: { x: 160, y: 8, w: 32, h: 16 },
    s: { x: 160, y: 232, w: 32, h: 16 },
    w: { x: 16, y: 112, w: 32, h: 32 },
    e: { x: 304, y: 112, w: 32, h: 32 }
  };
  const SIZE = {
    crate: [14, 14], enemy: [12, 12], boss: [26, 22], npc: [14, 14],
    plate: [20, 20], terminal: [16, 14], console: [16, 14], lever: [12, 12],
    switch: [14, 12], clause: [14, 12], exec: [16, 14], tree: [12, 10],
    portal: [18, 18], heart: [10, 10], sign: [12, 12], torch: [8, 12],
    server: [14, 16], pipe: [14, 14], source: [12, 12], sink: [12, 12], pad: [16, 14]
  };
  const PORTRAIT = {
    vini: { src: "vini_manga.png", crop: [0.3, 0.02, 0.42, 0.3] },
    joao: { src: "joao.png", crop: [0.54, 0.088, 0.19, 0.10] },
    master: { src: "npcs/master_master.png", crop: [0.22, 0.0, 0.56, 0.42] },
    frontend: { src: "npcs/frontend_master.jpg", crop: [0.18, 0.0, 0.64, 0.78] },
    sqlmaster: { src: "npcs/sql_master.png", crop: [0.16, 0.02, 0.66, 0.42] },
    warrior: { src: "npcs/sql_warrior.png", crop: [0.16, 0.02, 0.46, 0.42] },
    priest: { src: "npcs/priest.png", crop: [0.26, 0.0, 0.48, 0.4] },
    pandora: { src: "npcs/pandora_healer.png", crop: [0.3, 0.06, 0.4, 0.36] }
  };
  const INTRO = [
    ["LIFEMED — 02:14", "O café acabou. O bug não.", "Vini Manga e João dormem no teclado."],
    ["O sonho abre em 32 bits.", "Bugs têm perna. Query é porta.", "O deploy mora no fim da nuvem."],
    ["Vini olha o próprio corpo.", "Orelha de gato, camisa roxa.", "Peido, arroto e o SQL continuam."],
    ["João está de regata e mochila.", "O taco brilha como terminal.", "Os mestres já esperam na clareira."]
  ];
  const ENDING = [
    ["DEPLOY 200 OK", "O Downtime virou log. A nuvem ficou verde."],
    ["O Mestre fecha o quadro.", "Pandora guarda a cura. O Pastor assina o commit."],
    ["02:47 na Lifemed.", "As orelhas somem. O taco não volta com o João."],
    ["VINI: eu ainda sinto o peido.", "JOÃO: standup em cinco minutos.", "Fim do sprint."]
  ];
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const keys = {};
  const pressed = {};
  const imgs = {};
  let mode = "title";
  let levelIndex = 0;
  let level = null;
  let room = null;
  let arriveSide = null;
  let entities = [];
  let players = {};
  let active = "vini";
  let flags = {};
  let gone = {};
  let pos = {};
  let inventory = {};
  let seen = {};
  let announced = {};
  let chain = [];
  let hp = { vini: 4, joao: 4 };
  let downed = { vini: 0, joao: 0 };
  let iframes = { vini: 0, joao: 0 };
  let dialogue = null;
  let sql = null;
  let particles = [];
  let floats = [];
  let powered = new Set();
  let sealed = false;
  let shake = 0;
  let fade = 0;
  let exitLock = 0;
  let levelTime = 0;
  let snapT = 0;
  let time = 0;
  let introI = 0;
  let endI = 0;
  let mid = 1;
  let mx = 0;
  let my = 0;
  let last = 0;
  let blockPlay = false;

  Object.keys(PORTRAIT).forEach(function (k) {
    const img = new Image();
    img.src = PORTRAIT[k].src;
    imgs[k] = img;
  });

function font(size) {
  ctx.font = (size || 8) + "px Courier New, Courier, monospace";
  ctx.textBaseline = "top";
}

  function wrap(text, maxW) {
    font(8);
    const words = String(text).split(" ");
    const lines = [];
    let cur = "";
    for (let i = 0; i < words.length; i++) {
      const next = cur ? cur + " " + words[i] : words[i];
      if (ctx.measureText(next).width > maxW && cur) {
        lines.push(cur);
        cur = words[i];
      } else cur = next;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  function overlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return Math.abs(ax - bx) * 2 < aw + bw && Math.abs(ay - by) * 2 < ah + bh;
  }

  function hit(a, b) {
    return overlap(a.x, a.y, a.w || 12, a.h || 12, b.x, b.y, b.w || 12, b.h || 12);
  }

  function solidTile(tx, ty) {
    if (!room || tx < 0 || ty < 0 || tx >= 20 || ty >= 15) return true;
    const ch = room.grid[ty][tx];
    if (ch === "#" || ch === "~") return true;
    if (ch === "+" && !flags["crack_" + room.id]) return true;
    if (ch === "l" && !flags.laser_off) return true;
    if (ch === "v") return true;
    if (ch === "=" && !flags.bridge) return true;
    return false;
  }

  function solidEnt(e) {
    if (!e || e.dead) return false;
    if (e.type === "door") return !doorOpen(e);
    if (e.type === "crate" || e.type === "tree") return true;
    return false;
  }

  function doorOpen(e) {
    if (e.seal) return !!flags[e.seal] || !sealed;
    if (e.needKey) return !!inventory[e.needKey];
    if (e.flag) return !!flags[e.flag];
    return true;
  }

  function blocked(x, y, w, h, ignore, ignorePlayers) {
    const l = x - w / 2;
    const r = x + w / 2 - 0.01;
    const t = y - h / 2;
    const b = y + h / 2 - 0.01;
    for (let ty = Math.floor(t / 16); ty <= Math.floor(b / 16); ty++) {
      for (let tx = Math.floor(l / 16); tx <= Math.floor(r / 16); tx++) {
        if (solidTile(tx, ty)) return true;
      }
    }
    for (let i = 0; i < entities.length; i++) {
      const e = entities[i];
      if (e === ignore || !solidEnt(e)) continue;
      if (overlap(x, y, w, h, e.x, e.y, e.w, e.h)) return true;
    }
    if (!ignorePlayers) {
      const ids = ["vini", "joao"];
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        const p = players[id];
        if (!p || p === ignore || id !== active || hp[id] <= 0 || downed[id] > 0) continue;
        if (overlap(x, y, w, h, p.x, p.y, p.w, p.h)) return true;
      }
    }
    return false;
  }

  function moveBody(body, dx, dy, ignorePlayers) {
    stepAxis(body, dx, 0, ignorePlayers);
    stepAxis(body, 0, dy, ignorePlayers);
  }

  function stepAxis(body, dx, dy, ignorePlayers) {
    const dist = Math.abs(dx || dy);
    if (!dist) return;
    const sx = Math.sign(dx);
    const sy = Math.sign(dy);
    let left = dist;
    while (left > 0.01) {
      const step = Math.min(1, left);
      const nx = body.x + sx * step;
      const ny = body.y + sy * step;
      if (blocked(nx, ny, body.w, body.h, body, ignorePlayers)) break;
      body.x = nx;
      body.y = ny;
      left -= step;
    }
  }

  function float(text, at) {
    const p = at || players[active] || { x: 160, y: 80 };
    floats.push({ x: p.x, y: p.y - 18, text: text, life: 1.25 });
    if (floats.length > 6) floats.shift();
  }

  function burst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.28;
      const s = 18 + Math.random() * 46;
      particles.push({
        x: x, y: y,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: 0.35 + Math.random() * 0.3,
        color: color, s: 1 + (Math.random() * 2 | 0)
      });
    }
  }

  function readSave() {
    try { return JSON.parse(localStorage.getItem("vmj_save") || "null"); } catch (err) { return null; }
  }

  function save() {
    try { localStorage.setItem("vmj_save", JSON.stringify({ level: levelIndex })); } catch (err) {}
  }

  function setupBoss(e) {
    e.maxHp = e.hp;
    e.w = e.kind === "godclass" ? 30 : 26;
    e.h = e.kind === "godclass" ? 26 : 22;
    if (e.kind === "godclass") { e.armor = 3; e.armorMax = 3; e.expose = 0; e.shot = 2.2; }
    if (e.kind === "downtime") { e.phase = 0; e.timer = 7; e.vulnerable = 0; }
    if (e.kind === "delete") e.shot = 1.4;
    if (e.kind === "bugrei") { e.timer = 1; e.dashing = 0; e.dashx = 1; e.dashy = 0; }
  }

  function spawnEntity(t) {
    if (t.id && gone[t.id]) return;
    const e = JSON.parse(JSON.stringify(t));
    e.tx = t.x;
    e.ty = t.y;
    e.dead = false;
    if (e.type === "door") {
      const r = DOOR[e.side];
      e.x = r.x;
      e.y = r.y;
      e.w = r.w;
      e.h = r.h;
    } else {
      e.x = t.x * 16 + 8;
      e.y = t.y * 16 + 8;
      const sz = SIZE[e.type] || [12, 12];
      e.w = sz[0];
      e.h = sz[1];
    }
    if (e.type === "boss") setupBoss(e);
    if (e.kind === "null") { e.phased = true; e.phaseT = 0; e.w = 14; e.h = 14; }
    const saved = e.id && pos[e.id];
    if (saved) {
      if (e.type === "crate" || e.type === "enemy" || e.type === "boss") {
        if (saved.x != null) { e.x = saved.x; e.y = saved.y; }
        if (saved.hp != null && (e.type === "enemy" || e.type === "boss")) e.hp = saved.hp;
        if (saved.armor != null) e.armor = saved.armor;
      }
      if (saved.rot != null) e.rot = saved.rot;
    }
    entities.push(e);
  }

  function ensurePlayers() {
    if (!players.vini) {
      players.vini = { dir: "down", cd: 0, w: 14, h: 12, speed: 78, moving: false, swing: 0 };
      players.joao = { dir: "down", cd: 0, w: 12, h: 12, speed: 96, moving: false, swing: 0 };
    }
  }

  function positionPlayers(arrive) {
    ensurePlayers();
    if (!arrive) {
      players.vini.x = room.spawns.vini[0] * 16 + 8;
      players.vini.y = room.spawns.vini[1] * 16 + 8;
      players.joao.x = room.spawns.joao[0] * 16 + 8;
      players.joao.y = room.spawns.joao[1] * 16 + 8;
      players.vini.dir = "down";
      players.joao.dir = "down";
      players.joao.bike = null;
      if (mode === "play") syncMate();
      return;
    }
    const spots = ENTRY[arrive];
    players.vini.x = spots[0][0] * 16 + 8;
    players.vini.y = spots[0][1] * 16 + 8;
    players.joao.x = spots[1][0] * 16 + 8;
    players.joao.y = spots[1][1] * 16 + 8;
    players.vini.dir = FACE[arrive];
    players.joao.dir = FACE[arrive];
    players.joao.bike = null;
    if (mode === "play") syncMate();
  }

  function snapshot() {
    for (let i = 0; i < entities.length; i++) {
      const e = entities[i];
      if (!e.id || e.ephemeral || e.type === "shot" || e.dead) continue;
      pos[e.id] = { x: e.x, y: e.y, rot: e.rot, hp: e.hp, armor: e.armor };
    }
  }

  function refreshPipes() {
    const pipes = [];
    let source = null;
    let sink = null;
    for (let i = 0; i < entities.length; i++) {
      const e = entities[i];
      if (e.type === "pipe") pipes.push({ x: e.tx, y: e.ty, kind: e.kind, rot: e.rot || 0 });
      if (e.type === "source") source = e;
      if (e.type === "sink") sink = e;
    }
    if (!source || !sink) { powered = new Set(); return; }
    const res = VMJ.evalPipes(pipes, { x: source.tx, y: source.ty, dir: source.dir }, { x: sink.tx, y: sink.ty, accept: sink.accept });
    powered = res.powered;
    if (res.reached) flags.pipes_ok = true;
  }

  function loadRoom(id, arrive) {
    room = level.rooms[id];
    room.id = id;
    arriveSide = arrive;
    entities = [];
    const bossT = room.entities.find(function (e) { return e.type === "boss"; });
    sealed = !!(bossT && !gone[bossT.id] && !flags[bossT.setsFlag]);
    for (let i = 0; i < room.entities.length; i++) spawnEntity(room.entities[i]);
    positionPlayers(arrive);
    refreshPipes();
    A.song(room.boss ? "boss" : level.music);
  }

  function beginLevel() {
    level = VMJ.levels[levelIndex];
    flags = {};
    gone = {};
    pos = {};
    inventory = {};
    seen = {};
    announced = {};
    chain = [];
    hp = { vini: 4, joao: 4 };
    downed = { vini: 0, joao: 0 };
    iframes = { vini: 0, joao: 0 };
    active = "vini";
    entities = [];
    dialogue = null;
    sql = null;
    levelTime = 0;
    mode = "levelcard";
    A.song(level.music);
    save();
  }

  function openLevel() {
    loadRoom(level.start, null);
    mode = "play";
    exitLock = 0.35;
    greet();
  }

  function go(dest, arrive) {
    snapshot();
    loadRoom(dest, arrive);
    fade = 0.28;
    exitLock = 0.45;
    greet();
  }

  function startDialogue(lines, onDone) {
    dialogue = { lines: lines, i: 0, shown: 0, onDone: onDone || null };
    mode = "dialogue";
    A.blip();
  }

  function greetNpcs() {
    chain = entities.filter(function (e) { return e.type === "npc" && e.auto && !seen[e.id]; });
    if (!chain.length) return;
    talkNPC(chain.shift(), false, true);
  }

  function greet() {
    if (room.intro && !seen["intro_" + room.id]) {
      seen["intro_" + room.id] = true;
      startDialogue(room.intro, greetNpcs);
      return;
    }
    greetNpcs();
  }

  function talkNPC(npc, replay, queued) {
    if (!replay) seen[npc.id] = true;
    const src = replay && npc.again ? npc.again : npc.lines;
    startDialogue(src.map(function (text) {
      return { name: npc.name, text: text, sprite: npc.sprite };
    }), function () {
      if (npc.flag) flags[npc.flag] = true;
      if (npc.heal === "full") healAll();
      else if (npc.heal) healSome(npc.heal);
      if (queued && chain.length) talkNPC(chain.shift(), false, true);
    });
  }

  function healAll() {
    let changed = false;
    ["vini", "joao"].forEach(function (id) {
      if (hp[id] < 4 || downed[id] > 0) changed = true;
      hp[id] = 4;
      downed[id] = 0;
      iframes[id] = 0.5;
    });
    if (changed) {
      A.heal();
      burst(players[active].x, players[active].y, "#ffe08a", 12);
    }
  }

  function healSome(n) {
    ["vini", "joao"].forEach(function (id) {
      if (downed[id] > 0) { hp[id] = n; downed[id] = 0; }
      else hp[id] = Math.min(4, hp[id] + n);
      iframes[id] = 0.4;
    });
    A.heal();
  }

  function advanceDialogue() {
    if (!dialogue) return;
    const line = dialogue.lines[dialogue.i];
    if (dialogue.shown < line.text.length) {
      dialogue.shown = line.text.length;
      return;
    }
    dialogue.i++;
    dialogue.shown = 0;
    A.blip();
    if (dialogue.i >= dialogue.lines.length) {
      const cb = dialogue.onDone;
      dialogue = null;
      mode = "play";
      if (cb) cb();
    }
  }

  function nearest() {
    let best = null;
    const id = active;
    const p = players[id];
    if (p && hp[id] > 0 && downed[id] <= 0) best = p;
    return best;
  }

  function hurt(who, n) {
    if (who !== active || mode !== "play" || iframes[who] > 0 || hp[who] <= 0) return;
    hp[who] -= n;
    iframes[who] = 1.15;
    shake = reduceMotion ? 0 : 5;
    A.hurt();
    if (hp[who] <= 0) {
      hp[who] = 0;
      if (hp.vini <= 0 && hp.joao <= 0) {
        mode = "gameover";
        return;
      }
      downed[who] = 6;
      const next = who === "vini" ? "joao" : "vini";
      const fallen = players[who];
      const mate = players[next];
      if (mate && fallen && blocked(mate.x, mate.y, mate.w, mate.h, mate, true)) {
        mate.x = fallen.x;
        mate.y = fallen.y;
        mate.dir = fallen.dir;
      }
      active = next;
      if (players.joao) players.joao.bike = null;
      syncMate();
    }
  }

  function kill(e) {
    if (!e || e.dead) return;
    e.dead = true;
    if (e.id && !e.ephemeral) gone[e.id] = true;
    burst(e.x, e.y, "#ffb4c8", 12);
    if (e.setsFlag) flags[e.setsFlag] = true;
    if (e.type === "boss") {
      sealed = false;
      exitLock = 0.8;
      shake = reduceMotion ? 0 : 8;
      A.fanfare();
      if (room.victory) startDialogue(room.victory);
    }
  }

  function frontRect(p, w, h, dist) {
    const d = DIRS[p.dir];
    return { x: p.x + d.x * dist, y: p.y + d.y * dist, w: w, h: h };
  }

  function facingTiles(p, dist) {
    const d = DIRS[p.dir];
    const tiles = [];
    for (let i = 1; i <= dist; i++) {
      for (let side = -1; side <= 1; side++) {
        const px = p.x + d.x * i * 16 + d.y * side * 10;
        const py = p.y + d.y * i * 16 + d.x * side * 10;
        tiles.push([Math.floor(px / 16), Math.floor(py / 16)]);
      }
    }
    return tiles;
  }

  function pushHeavy(e) {
    if (e.sliding) return;
    const d = DIRS[players.vini.dir];
    const plate = entities.find(function (p) { return p.type === "plate" && p.accept === e.id; });
    let x = e.x;
    let y = e.y;
    for (let i = 0; i < 12; i++) {
      const nx = x + d.x * 16;
      const ny = y + d.y * 16;
      const tx = Math.floor(nx / 16);
      const ty = Math.floor(ny / 16);
      if (tx < 3 || tx > 16 || ty < 3 || ty > 11) break;
      if (blocked(nx, ny, e.w, e.h, e, false)) break;
      x = nx;
      y = ny;
      if (plate && Math.abs(x - plate.x) < 10 && Math.abs(y - plate.y) < 10) break;
    }
    if (x === e.x && y === e.y) { float("não anda", e); return; }
    e.tx = x;
    e.ty = y;
    e.sliding = true;
    burst(e.x, e.y, "#86c45a", 8);
  }

  function pushMetal(e) {
    const d = DIRS[players.joao.dir];
    const nx = e.x + d.x * 16;
    const ny = e.y + d.y * 16;
    const tx = Math.floor(nx / 16);
    const ty = Math.floor(ny / 16);
    if (tx < 3 || tx > 16 || ty < 3 || ty > 11) { float("não cabe", e); return; }
    if (blocked(nx, ny, e.w, e.h, e, false)) { float("bloqueado", e); return; }
    e.x = nx;
    e.y = ny;
    A.blip();
  }

  function breakWood(e) {
    e.dead = true;
    if (e.id) gone[e.id] = true;
    burst(e.x, e.y, "#e0b070", 8);
    if (e.drop) {
      inventory[e.drop] = true;
      flags[e.drop] = true;
      float("CHAVE", e);
      A.good();
    }
  }

  function hitSwitch(e) {
    const step = flags[e.group] || 0;
    const idx = e.order.indexOf(e.id);
    if (idx < step) return;
    if (idx > step) {
      flags[e.group] = 0;
      A.bad();
      float("ordem errada", e);
      shake = reduceMotion ? 0 : 3;
      return;
    }
    flags[e.group] = step + 1;
    A.blip();
    float(e.label, e);
    if (flags[e.group] === e.order.length) {
      flags[e.doneFlag] = true;
      A.good();
      float("arquitetura ok", e);
    }
  }

  function damageActor(e, kind) {
    if (e.kind === "bug") {
      e.hp -= 1;
      if (kind === "fart") e.stun = 1.15;
      float("-1", e);
      if (e.hp <= 0) kill(e);
      return;
    }
    if (e.kind === "null") {
      if (e.phased) {
        if (kind === "fart") {
          e.phased = false;
          e.phaseT = 3.4;
          float("NOT NULL", e);
          A.good();
        } else float("NULL", e);
        return;
      }
      e.hp -= 1;
      e.stun = 0.15;
      float("-1", e);
      if (e.hp <= 0) kill(e);
      return;
    }
    if (e.kind === "bugrei") {
      if (kind === "fart") { e.stun = 0.8; float("ecc", e); return; }
      e.hp -= 1;
      e.stun = 0.12;
      float("-1", e);
      if (e.hp <= 0) kill(e);
      return;
    }
    if (e.kind === "delete") {
      if (kind === "fart") { e.stun = 0.7; float("ecc", e); return; }
      float("0 rows", e);
      return;
    }
    if (e.kind === "godclass") {
      if (kind === "fart") { e.stun = 0.8; float("code smell", e); return; }
      if (e.expose > 0) {
        e.hp -= 1;
        e.expose = 0;
        e.armor = e.armorMax;
        float("REFACTOR", e);
        A.good();
        if (e.hp <= 0) kill(e);
        return;
      }
      if (kind === "bat") {
        e.armor -= 1;
        float("acopla -1", e);
        if (e.armor <= 0) {
          e.expose = 4.5;
          e.armor = 0;
          float("EXTRAIA", e);
          A.good();
        }
        return;
      }
      float("opaca", e);
      return;
    }
    if (e.kind === "downtime") {
      if (kind === "fart") { e.stun = 0.45; return; }
      float("espera o pedestal", e);
    }
  }

  function strike(e, kind) {
    if (!e || e.dead) return;
    if (e.type === "shot") { e.dead = true; return; }
    if (e.type === "clause") {
      if (kind === "bat") { flags["cl_" + e.id] = true; A.blip(); float(e.label, e); }
      return;
    }
    if (e.type === "switch") {
      if (kind === "bat") hitSwitch(e);
      return;
    }
    if (e.kind === "heavy") {
      if (kind === "fart") pushHeavy(e);
      else if (kind === "bat") float("pesada demais", e);
      return;
    }
    if (e.kind === "metal") {
      if (kind === "bat") pushMetal(e);
      else if (kind === "fart") float("ferro demais", e);
      return;
    }
    if (e.kind === "wood") {
      if (kind === "bat") breakWood(e);
      else if (kind === "fart") float("usa o taco", e);
      return;
    }
    if (e.type === "enemy" || e.type === "boss") damageActor(e, kind);
  }

  function breakCracks(p) {
    if (flags["crack_" + room.id]) return;
    const tiles = facingTiles(p, 2);
    for (let i = 0; i < tiles.length; i++) {
      const t = tiles[i];
      const row = room.grid[t[1]];
      if (row && row[t[0]] === "+") {
        flags["crack_" + room.id] = true;
        burst(p.x + DIRS[p.dir].x * 16, p.y + DIRS[p.dir].y * 16, "#d2b48c", 12);
        float("rachou", p);
        return;
      }
    }
  }

  function bikeObstacle(x, y, p) {
    const w = p.w;
    const h = p.h;
    const l = x - w / 2;
    const r = x + w / 2 - 0.01;
    const t = y - h / 2;
    const b = y + h / 2 - 0.01;
    for (let ty = Math.floor(t / 16); ty <= Math.floor(b / 16); ty++) {
      for (let tx = Math.floor(l / 16); tx <= Math.floor(r / 16); tx++) {
        if (solidTile(tx, ty)) return "wall";
      }
    }
    for (let i = 0; i < entities.length; i++) {
      const e = entities[i];
      if (!e || e.dead || !overlap(x, y, w, h, e.x, e.y, e.w || 12, e.h || 12)) continue;
      if (e.type === "crate" && e.kind === "wood") return e;
      if (e.type === "npc" || solidEnt(e)) return "wall";
    }
    return null;
  }

  function bikeCanHit(e) {
    if (!e || e.dead) return false;
    if (e.type === "enemy" || e.type === "boss" || e.type === "shot") return true;
    if (e.type === "clause" || e.type === "switch") return true;
    return e.type === "crate" && e.kind === "wood";
  }

  function trample(p, e) {
    if (!bikeCanHit(e) || p.bike.seen.indexOf(e) >= 0) return;
    p.bike.seen.push(e);
    strike(e, "bat");
    burst(e.x, e.y, "#f8fafc", 8);
    A.bat();
  }

  function trampleBody(p) {
    for (let i = 0; i < entities.length; i++) {
      const e = entities[i];
      if (!overlap(p.x, p.y, p.w, p.h, e.x, e.y, e.w || 12, e.h || 12)) continue;
      trample(p, e);
    }
  }

  function startBike() {
    const p = players.joao;
    if (!p || hp.joao <= 0 || downed.joao > 0 || p.cd > 0 || p.bike) return;
    p.bike = { dir: p.dir, left: 32, seen: [] };
    p.pose = "bike";
    p.swing = 0.62;
    p.cd = 0.85;
    p.moving = false;
    A.bike();
    shake = reduceMotion ? 0 : 4;
  }

  function mateId() {
    return active === "vini" ? "joao" : "vini";
  }

  function syncMate() {
    const lead = players[active];
    const mate = players[mateId()];
    if (!lead || !mate || !lead.x) return;
    mate.x = lead.x + 16;
    mate.y = lead.y;
    mate.dir = lead.dir;
    mate.moving = !!lead.moving;
  }

  function updateBike(dt) {
    const p = players.joao;
    if (!p || !p.bike || active !== "joao") {
      if (p) p.bike = null;
      return;
    }
    const d = DIRS[p.bike.dir];
    p.dir = p.bike.dir;
    p.pose = "bike";
    p.moving = true;
    const step = Math.min(p.bike.left, 150 * dt);
    let moved = 0;
    while (moved < step - 0.001) {
      const bit = Math.min(1, step - moved);
      const nx = p.x + d.x * bit;
      const ny = p.y + d.y * bit;
      const obs = bikeObstacle(nx, ny, p);
      if (obs && obs.kind === "wood") trample(p, obs);
      if (obs === "wall" || (obs && !obs.dead)) {
        p.bike.left = 0;
        break;
      }
      p.x = nx;
      p.y = ny;
      moved += bit;
      p.bike.left -= bit;
      trampleBody(p);
    }
    if (!reduceMotion) {
      particles.push({
        x: p.x - d.x * 10,
        y: p.y - d.y * 4,
        vx: -d.x * 24 + (Math.random() - 0.5) * 12,
        vy: -d.y * 24 - 10,
        life: 0.28,
        color: Math.random() > 0.5 ? "#f8fafc" : "#cbd5e1",
        s: 2
      });
    }
    if (p.bike.left <= 0.05) p.bike = null;
  }

  function attack(kind) {
    const id = active;
    const p = players[id];
    if (!p || hp[id] <= 0 || downed[id] > 0) return;
    if (kind === "fart" && id !== "vini") { float("só a mão peida", p); return; }
    if (kind === "burp" && id !== "vini") { float("só a mão arrota", p); return; }
    if (kind === "bat" && id !== "joao") return;
    if (p.cd > 0) return;
    let rect;
    p.pose = kind;
    p.swing = kind === "bat" ? 0.26 : 0.36;
    if (kind === "fart") {
      p.cd = 0.55;
      A.fart();
      shake = reduceMotion ? 0 : 7;
      rect = frontRect(p, 22, 18, 16);
      burst(rect.x, rect.y, "#8fd15a", 14);
      const d = DIRS[p.dir];
      moveBody(p, -d.x * 8, -d.y * 8, false);
    } else if (kind === "burp") {
      p.cd = 0.6;
      A.burp();
      shake = reduceMotion ? 0 : 4;
      rect = frontRect(p, 30, 24, 16);
      burst(rect.x, rect.y, "#d6e27a", 10);
      breakCracks(p);
    } else {
      p.cd = 0.34;
      A.bat();
      rect = frontRect(p, 20, 18, 15);
      burst(rect.x, rect.y, "#7ef0ff", 6);
    }
    for (let i = 0; i < entities.length; i++) {
      const e = entities[i];
      if (e.dead) continue;
      if (overlap(rect.x, rect.y, rect.w, rect.h, e.x, e.y, e.w || 12, e.h || 12)) strike(e, kind);
    }
  }

  function clausesReady() {
    return flags.cl_where && flags.cl_and && flags.cl_limit;
  }

  function nearestOf(types, maxDist) {
    const p = players[active];
    let best = null;
    let bd = maxDist;
    for (let i = 0; i < entities.length; i++) {
      const e = entities[i];
      if (e.dead || types.indexOf(e.type) < 0) continue;
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  function useConsole(e) {
    if (flags[e.flag]) { float(e.label + " no ar", e); return; }
    if (e.who && e.who !== active) {
      float(e.who === "joao" ? "infra é o João" : "SQL é o Vini", e);
      return;
    }
    if (e.needGone && e.needGone.some(function (id) { return !gone[id]; })) {
      float(e.deny, e);
      A.bad();
      return;
    }
    if (e.needFlags && e.needFlags.some(function (f) { return !flags[f]; })) {
      float(e.deny, e);
      A.bad();
      return;
    }
    flags[e.flag] = true;
    A.good();
    float(e.label + " NO AR", e);
    burst(e.x, e.y, "#7ef0ff", 10);
  }

  function useLever(e) {
    if (flags[e.flag]) { float("já foi", e); return; }
    if (e.who && e.who !== active) { float("infra é o João", e); return; }
    if (e.needFlags) {
      const names = { svc_ec2: "EC2", svc_s3: "S3", svc_rds: "RDS", svc_lambda: "Lambda" };
      const miss = e.needFlags.filter(function (f) { return !flags[f]; });
      if (miss.length) {
        float("falta " + miss.map(function (f) { return names[f] || f; }).join(" "), e);
        A.bad();
        return;
      }
    }
    flags[e.flag] = true;
    A.good();
    float("ponte liberada", e);
  }

  function useExec(e) {
    if (active !== "vini") { float("quem executa é o Vini", e); return; }
    const boss = entities.find(function (b) { return b.kind === "delete" && !b.dead; });
    if (!boss) return;
    if (!clausesReady()) { float("faltam cláusulas", e); A.bad(); return; }
    boss.hp -= 1;
    flags.cl_where = false;
    flags.cl_and = false;
    flags.cl_limit = false;
    A.good();
    burst(boss.x, boss.y, "#ff4455", 16);
    float("1 row deleted", boss);
    if (boss.hp <= 0) kill(boss);
  }

  function usePad(e) {
    const boss = entities.find(function (b) { return b.kind === "downtime" && !b.dead; });
    if (!boss) return;
    if (active !== "joao") { float("João no deploy", e); return; }
    if (boss.phase !== e.order) {
      float("fora de ordem", e);
      A.bad();
      hurt(active, 1);
      return;
    }
    boss.phase += 1;
    boss.hp -= 1;
    boss.vulnerable = 1.5;
    boss.stun = 1.1;
    A.good();
    float(e.label + " OK", e);
    burst(e.x, e.y, "#7ef0ff", 12);
    if (boss.hp <= 0) kill(boss);
  }

  function openSQL(e) {
    if (flags[e.flag]) { float("já commitada", e); return; }
    if (e.who && e.who !== active) { float("SQL é o Vini", e); return; }
    sql = { e: e, sel: 0 };
    mode = "sql";
    A.blip();
  }

  function confirmSQL() {
    const e = sql.e;
    if (sql.sel === e.answer) {
      flags[e.flag] = true;
      mode = "play";
      A.good();
      float("query ok", players.vini);
      burst(e.x, e.y, "#7ef0a0", 12);
    } else {
      mode = "play";
      A.bad();
      float(e.wrong || "erro", players.vini);
      shake = reduceMotion ? 0 : 4;
      const bugs = entities.filter(function (en) { return en.kind === "bug" && !en.dead; }).length;
      if (bugs < 3) {
        entities.push({
          type: "enemy", kind: "bug", id: "bad" + (mid++),
          x: players.vini.x + 28, y: players.vini.y, hp: 2, w: 12, h: 12, ephemeral: true, dead: false, stun: 0.6
        });
      }
    }
    sql = null;
  }

  function interact() {
    if (hp[active] <= 0 || downed[active] > 0) return;
    const order = [
      ["npc", 30], ["terminal", 28], ["console", 28], ["lever", 26], ["exec", 28],
      ["pad", 26], ["sign", 24], ["pipe", 18], ["switch", 22], ["clause", 22]
    ];
    for (let i = 0; i < order.length; i++) {
      const e = nearestOf([order[i][0]], order[i][1]);
      if (!e) continue;
      if (e.type === "npc") { talkNPC(e, !!seen[e.id], false); return; }
      if (e.type === "terminal") { openSQL(e); return; }
      if (e.type === "console") { useConsole(e); return; }
      if (e.type === "lever") { useLever(e); return; }
      if (e.type === "exec") { useExec(e); return; }
      if (e.type === "pad") { usePad(e); return; }
      if (e.type === "sign") {
        startDialogue(e.lines.map(function (text) { return { name: e.name || "PLACA", text: text }; }));
        return;
      }
      if (e.type === "pipe") {
        if (active !== "joao") { float("João gira isso", e); return; }
        e.rot = ((e.rot || 0) + 1) % 4;
        A.blip();
        refreshPipes();
        if (flags.pipes_ok) { float("fluxo ligado", e); A.good(); }
        return;
      }
      if (e.type === "switch" || e.type === "clause") {
        float(active === "joao" ? "usa o taco" : "isso pede o taco", e);
        return;
      }
    }
  }

  function updatePlates() {
    const groups = {};
    for (let i = 0; i < entities.length; i++) {
      const e = entities[i];
      if (e.type !== "plate") continue;
      let on = false;
      if (e.accept) {
        const c = entities.find(function (c0) { return c0.id === e.accept && !c0.dead; });
        on = !!(c && hit(c, e));
      } else {
        on = ["vini", "joao"].some(function (id) {
          return hp[id] > 0 && downed[id] <= 0 && hit(players[id], e);
        });
      }
      e.on = on;
      if (e.pair) {
        if (!groups[e.pair]) groups[e.pair] = [];
        groups[e.pair].push(e);
      } else if (on && e.flag) flags[e.flag] = true;
    }
    Object.keys(groups).forEach(function (k) {
      const ps = groups[k];
      if (ps.every(function (p) { return p.on; })) flags[ps[0].latch] = true;
    });
  }

  function updateSlides(dt) {
    for (let i = 0; i < entities.length; i++) {
      const e = entities[i];
      if (!e.sliding) continue;
      const dx = e.tx - e.x;
      const dy = e.ty - e.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 0.6) { e.x = e.tx; e.y = e.ty; e.sliding = false; continue; }
      const step = Math.min(dist, 120 * dt);
      const nx = e.x + (dx / dist) * step;
      const ny = e.y + (dy / dist) * step;
      if (blocked(nx, ny, e.w, e.h, e, false)) { e.sliding = false; continue; }
      e.x = nx;
      e.y = ny;
    }
  }

  function touch(e) {
    const p = players[active];
    if (!p || hp[active] <= 0 || downed[active] > 0) return;
    if (hit(e, p)) hurt(active, 1);
  }

  function chase(e, speed, dt) {
    const t = nearest(e);
    if (!t) return;
    const a = Math.atan2(t.y - e.y, t.x - e.x);
    moveBody(e, Math.cos(a) * speed * dt, Math.sin(a) * speed * dt, true);
  }

  function spawnMinion(x, y) {
    entities.push({
      type: "enemy", kind: "bug", id: "m" + (mid++),
      x: x, y: y, hp: 1, w: 10, h: 10, ephemeral: true, dead: false
    });
  }

  function shoot(e, speed) {
    const t = nearest(e);
    if (!t) return;
    const a = Math.atan2(t.y - e.y, t.x - e.x);
    entities.push({
      type: "shot", x: e.x, y: e.y,
      vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
      life: 3, w: 6, h: 6, ephemeral: true, dead: false
    });
  }

  function updateEnemies(dt) {
    for (let i = 0; i < entities.length; i++) {
      const e = entities[i];
      if (e.dead) continue;
      if (e.type === "enemy" && e.kind === "bug") {
        if (e.stun > 0) { e.stun -= dt; continue; }
        e.wander = (e.wander || 0) - dt;
        if (e.wander <= 0) {
          const dirs = ["up", "down", "left", "right"];
          const d = DIRS[dirs[(Math.random() * 4) | 0]];
          e.vx = d.x * 28;
          e.vy = d.y * 28;
          e.wander = 0.6 + Math.random() * 0.8;
        }
        moveBody(e, (e.vx || 0) * dt, (e.vy || 0) * dt, true);
        touch(e);
      } else if (e.kind === "null") {
        if (!e.phased) {
          e.phaseT -= dt;
          if (e.phaseT <= 0) e.phased = true;
        }
        if (e.stun > 0) e.stun -= dt;
        else chase(e, 34, dt);
        touch(e);
      } else if (e.kind === "bugrei") {
        if (e.stun > 0) { e.stun -= dt; touch(e); continue; }
        if (e.dashing > 0) {
          e.dashing -= dt;
          moveBody(e, e.dashx * 120 * dt, e.dashy * 120 * dt, true);
        } else {
          e.timer -= dt;
          const t = nearest(e);
          if (t && e.timer <= 0) {
            const a = Math.atan2(t.y - e.y, t.x - e.x);
            e.dashx = Math.cos(a);
            e.dashy = Math.sin(a);
            e.dashing = 0.42;
            e.timer = 1.45;
          } else chase(e, 30, dt);
        }
        touch(e);
      } else if (e.kind === "delete") {
        if (e.stun > 0) e.stun -= dt;
        else {
          chase(e, 34, dt);
          e.shot -= dt;
          if (e.shot <= 0) { e.shot = 1.7; shoot(e, 76); }
        }
        touch(e);
      } else if (e.kind === "godclass") {
        if (e.expose > 0) {
          e.expose -= dt;
          if (e.expose <= 0) { e.armor = e.armorMax; float("acoplou de novo", e); }
        }
        if (e.stun > 0) e.stun -= dt;
        else {
          chase(e, e.expose > 0 ? 16 : 24, dt);
          e.shot -= dt;
          if (e.shot <= 0) { e.shot = 2.4; shoot(e, 60); }
        }
        touch(e);
      } else if (e.kind === "downtime") {
        if (e.vulnerable > 0) e.vulnerable -= dt;
        if (e.stun > 0) e.stun -= dt;
        else if (e.vulnerable <= 0) chase(e, 38, dt);
        e.timer -= dt;
        if (e.timer <= 0) {
          e.timer = 6.5;
          spawnMinion(e.x + 24, e.y);
          spawnMinion(e.x - 24, e.y);
        }
        touch(e);
      }
    }
  }

  function updateShots(dt) {
    for (let i = 0; i < entities.length; i++) {
      const s = entities[i];
      if (s.type !== "shot" || s.dead) continue;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
      const tx = Math.floor(s.x / 16);
      const ty = Math.floor(s.y / 16);
      if (s.life <= 0 || solidTile(tx, ty)) { s.dead = true; continue; }
      if (hp[active] > 0 && downed[active] <= 0 && !s.dead && hit(s, players[active])) {
        s.dead = true;
        hurt(active, 1);
      }
    }
  }

  function updatePickups() {
    for (let i = 0; i < entities.length; i++) {
      const e = entities[i];
      if (e.type !== "heart" || e.dead) continue;
      ["vini", "joao"].forEach(function (id) {
        if (!e.dead && hp[id] > 0 && hit(players[id], e)) {
          e.dead = true;
          gone[e.id] = true;
          healSome(1);
          float("+coração", e);
        }
      });
    }
  }

  function checkExit() {
    if (exitLock > 0 || mode !== "play") return;
    const p = players[active];
    const tx = Math.floor(p.x / 16);
    const ty = Math.floor(p.y / 16);
    let dir = null;
    if (ty <= 0 && (tx === 9 || tx === 10) && room.exits.n) dir = "n";
    else if (ty >= 14 && (tx === 9 || tx === 10) && room.exits.s) dir = "s";
    else if (tx <= 0 && (ty === 6 || ty === 7) && room.exits.w) dir = "w";
    else if (tx >= 19 && (ty === 6 || ty === 7) && room.exits.e) dir = "e";
    if (!dir) return;
    const out = (dir === "n" && my < 0) || (dir === "s" && my > 0) || (dir === "w" && mx < 0) || (dir === "e" && mx > 0);
    if (!out) return;
    const opp = { n: "s", s: "n", e: "w", w: "e" }[dir];
    go(room.exits[dir], opp);
  }

  function checkPortal() {
    if (mode !== "play" || exitLock > 0) return;
    for (let i = 0; i < entities.length; i++) {
      const e = entities[i];
      if (e.type === "portal" && flags[e.flag] && players[active] && hit(e, players[active])) {
        nextLevel();
        return;
      }
    }
  }

  function nextLevel() {
    if (mode !== "play") return;
    if (levelIndex >= VMJ.levels.length - 1) {
      mode = "ending";
      endI = 0;
      A.song("title");
      return;
    }
    levelIndex += 1;
    beginLevel();
  }

  function pollObj() {
    if (!level || levelTime < 0.6) return;
    for (let i = 0; i < level.objectives.length; i++) {
      const o = level.objectives[i];
      if (flags[o.flag] && !announced[o.flag]) {
        announced[o.flag] = true;
        if (o.flag.indexOf("talk_") !== 0) A.good();
      }
    }
  }

  function setActive(id) {
    if (hp[id] <= 0 || downed[id] > 0) { float("caído", players[id]); return; }
    if (id !== active && players[id] && players[active] && blocked(players[id].x, players[id].y, players[id].w, players[id].h, players[id], true)) {
      players[id].x = players[active].x;
      players[id].y = players[active].y;
      players[id].dir = players[active].dir;
    }
    if (players.joao && id !== "joao") players.joao.bike = null;
    active = id;
    syncMate();
  }

  function retryRoom() {
    snapshot();
    for (let i = 0; i < room.entities.length; i++) {
      const t = room.entities[i];
      if (t.type === "enemy" || t.type === "boss") {
        delete pos[t.id];
        delete gone[t.id];
        if (t.setsFlag) delete flags[t.setsFlag];
      }
    }
    Object.keys(flags).forEach(function (k) { if (k.indexOf("cl_") === 0) delete flags[k]; });
    delete seen["intro_" + room.id];
    hp = { vini: 4, joao: 4 };
    downed = { vini: 0, joao: 0 };
    iframes = { vini: 0, joao: 0 };
    const id = room.id;
    const arrive = arriveSide;
    mode = "play";
    loadRoom(id, arrive);
    exitLock = 0.4;
    greet();
  }

  function updatePlay(dt) {
    levelTime += dt;
    ["vini", "joao"].forEach(function (id) {
      if (iframes[id] > 0) iframes[id] -= dt;
      players[id].cd = Math.max(0, players[id].cd - dt);
      if (players[id].swing > 0) players[id].swing -= dt;
      if (downed[id] > 0) {
        downed[id] -= dt;
        if (downed[id] <= 0) {
          downed[id] = 0;
          hp[id] = 2;
          iframes[id] = 1.4;
        }
      }
    });
    if (mode !== "play") return;
    mx = 0;
    my = 0;
    if (keys.arrowleft || keys.a) mx -= 1;
    if (keys.arrowright || keys.d) mx += 1;
    if (keys.arrowup || keys.w) my -= 1;
    if (keys.arrowdown || keys.s) my += 1;
    const p = players[active];
    p.moving = false;
    if (p && !p.bike && hp[active] > 0 && downed[active] <= 0 && (mx || my)) {
      p.moving = true;
      if (Math.abs(mx) > Math.abs(my)) p.dir = mx < 0 ? "left" : "right";
      else p.dir = my < 0 ? "up" : "down";
      const len = Math.hypot(mx, my);
      moveBody(p, (mx / len) * p.speed * dt, (my / len) * p.speed * dt, false);
    }
    if (pressed.r) {
      if (active === "joao") startBike();
      else attack("burp");
    }
    updateBike(dt);
    syncMate();
    if (pressed.space) attack(active === "vini" ? "fart" : "bat");
    if (pressed.f) attack("fart");
    if (pressed["1"]) setActive("vini");
    if (pressed["2"]) setActive("joao");
    if (pressed.tab) setActive(active === "vini" ? "joao" : "vini");
    if (pressed.e || pressed.enter) interact();
    if (pressed.h) {
      startDialogue(level.hint.map(function (text) {
        return { name: "DICA", text: text, sprite: level.theme === "crypt" ? "sqlmaster" : level.theme === "tower" ? "frontend" : "master" };
      }));
      return;
    }
    if (mode !== "play") return;
    updateSlides(dt);
    updateEnemies(dt);
    if (mode !== "play") return;
    updateShots(dt);
    updatePlates();
    updatePickups();
    pollObj();
    checkPortal();
    checkExit();
    snapT -= dt;
    if (snapT <= 0) { snapshot(); snapT = 0.4; }
    entities = entities.filter(function (e) { return !e.dead; });
  }

  function drawCover(key, x, y, w, h) {
    const img = imgs[key];
    const spec = PORTRAIT[key];
    if (!img || !spec || !img.complete || !img.naturalWidth) return false;
    const sx = spec.crop[0] * img.naturalWidth;
    const sy = spec.crop[1] * img.naturalHeight;
    const sw = spec.crop[2] * img.naturalWidth;
    const sh = spec.crop[3] * img.naturalHeight;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
    ctx.restore();
    ctx.imageSmoothingEnabled = false;
    return true;
  }

  function drawPlate(e) {
    const on = e.on || (e.flag && flags[e.flag]) || (e.latch && flags[e.latch]);
    ctx.fillStyle = "#121826";
    ctx.fillRect(e.x - 8, e.y - 8, 16, 16);
    ctx.fillStyle = on ? "#22d3ee" : "#f97316";
    ctx.fillRect(e.x - 8, e.y - 8, 16, 1);
    ctx.fillRect(e.x - 8, e.y + 7, 16, 1);
    ctx.fillRect(e.x - 8, e.y - 8, 1, 16);
    ctx.fillRect(e.x + 7, e.y - 8, 1, 16);
    ctx.fillStyle = on ? "#4ade80" : "#334155";
    ctx.fillRect(e.x - 4, e.y - 4, 8, 8);
    ctx.fillStyle = on ? "#ecfdf5" : "#94a3b8";
    ctx.fillRect(e.x - 2, e.y - 2, 4, 4);
  }

  function tag(text, x, y, color) {
    font(8);
    const w = ctx.measureText(text).width;
    ctx.fillStyle = "#000";
    ctx.fillText(text, x - w / 2 + 1, y + 1);
    ctx.fillStyle = color || "#fff";
    ctx.fillText(text, x - w / 2, y);
  }

  function drawSprite(e) {
    if (e.type === "crate") return D.drawCrate(ctx, e);
    if (e.type === "npc") {
      D.drawNpc(ctx, e.sprite, e.x, e.y, (time * 2 | 0) % 2);
      const lift = e.sprite === "sqlmaster" ? 100 : 108;
      tag(e.short || e.name, e.x, Math.max(2, e.y - lift), e.color || "#fff");
      return;
    }
    if (e.type === "enemy") return D.drawBug(ctx, e.x, e.y, (time * 6 | 0) % 2, false, !!e.phased);
    if (e.type === "boss") return D.drawBoss(ctx, e, (time * 4 | 0) % 2);
    if (e.type === "tree") {
      D.shadow(ctx, e.x, e.y, 16);
      ctx.fillStyle = "#052e16";
      ctx.fillRect(e.x - 2, e.y - 8, 4, 10);
      ctx.fillStyle = "#14532d";
      ctx.fillRect(e.x - 9, e.y - 24, 18, 16);
      ctx.fillStyle = "#22c55e";
      ctx.fillRect(e.x - 6, e.y - 21, 8, 6);
      ctx.fillStyle = "#34d399";
      ctx.fillRect(e.x - 9, e.y - 24, 18, 1);
      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(e.x + 4, e.y - 18, 2, 2);
      return;
    }
    if (e.type === "heart") {
      D.heartIcon(ctx, e.x - 4, e.y - 8, true);
      return;
    }
    if (e.type === "torch") {
      ctx.fillStyle = "#6b5130";
      ctx.fillRect(e.x - 1, e.y - 4, 2, 8);
      ctx.fillStyle = (time * 8 | 0) % 2 ? "#ffb020" : "#ffe06a";
      ctx.fillRect(e.x - 2, e.y - 10, 4, 5);
      return;
    }
    if (e.type === "server") {
      if (D.drawProp(ctx, "item_server", e.x, e.y + 6, 32)) return;
      ctx.fillStyle = "#020617";
      ctx.fillRect(e.x - 8, e.y - 20, 16, 26);
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(e.x - 7, e.y - 19, 14, 24);
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(e.x - 6, e.y - 16, 12, 5);
      ctx.fillRect(e.x - 6, e.y - 9, 12, 5);
      ctx.fillRect(e.x - 6, e.y - 2, 12, 5);
      const blink = (time * 3 | 0) % 2;
      ctx.fillStyle = blink ? "#22d3ee" : "#4ade80";
      ctx.fillRect(e.x - 5, e.y - 15, 2, 2);
      ctx.fillRect(e.x - 5, e.y - 8, 2, 2);
      ctx.fillStyle = blink ? "#f472b6" : "#fbbf24";
      ctx.fillRect(e.x + 2, e.y - 14, 2, 2);
      ctx.fillRect(e.x + 2, e.y - 1, 2, 2);
      return;
    }
    if (e.type === "terminal" || e.type === "exec" || e.type === "console" || e.type === "pad") {
      const on = (e.type === "exec" && clausesReady()) || (e.type === "console" && flags[e.flag]) || (e.type === "pad" && entities.some(function (b) {
        return b.kind === "downtime" && !b.dead && b.phase === e.order;
      }));
      if (D.drawProp(ctx, "item_console", e.x, e.y + 4, 20)) {
        tag(e.label || "SQL", e.x, e.y - 28, on ? "#d8ffe8" : "#9bd7e4");
        return;
      }
      ctx.fillStyle = "#020617";
      ctx.fillRect(e.x - 10, e.y - 14, 20, 18);
      ctx.fillStyle = "#22d3ee";
      ctx.fillRect(e.x - 10, e.y - 14, 20, 1);
      ctx.fillRect(e.x - 10, e.y + 3, 20, 1);
      ctx.fillRect(e.x - 10, e.y - 14, 1, 18);
      ctx.fillRect(e.x + 9, e.y - 14, 1, 18);
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(e.x - 8, e.y - 12, 16, 14);
      ctx.fillStyle = on ? "#bbf7d0" : "#164e63";
      ctx.fillRect(e.x - 6, e.y - 8, 8, 2);
      ctx.fillRect(e.x, e.y - 10, 2, 6);
      tag(e.label || "SQL", e.x, e.y - 22, "#d8ffe8");
      return;
    }
    if (e.type === "lever") {
      ctx.fillStyle = "#6b5434";
      ctx.fillRect(e.x - 3, e.y - 2, 6, 6);
      ctx.fillStyle = flags[e.flag] ? "#7ef0a0" : "#e7c56a";
      ctx.fillRect(e.x - 1, e.y - 10, 2, 8);
      return;
    }
    if (e.type === "switch" || e.type === "clause") {
      const step = e.order ? (flags[e.group] || 0) : 0;
      const on = e.type === "clause" ? !!flags["cl_" + e.id] : e.order.indexOf(e.id) < step;
      ctx.fillStyle = on ? "#7ef0a0" : "#5c4a38";
      ctx.fillRect(e.x - 6, e.y - 4, 12, 8);
      ctx.fillStyle = on ? "#fff" : "#d7c4a4";
      ctx.fillRect(e.x - 2, e.y - 8, 4, 4);
      tag(e.label, e.x, e.y - 20, on ? "#d8ffe8" : "#f2e2b0");
      return;
    }
    if (e.type === "sign") {
      ctx.fillStyle = "#8a6234";
      ctx.fillRect(e.x - 1, e.y - 2, 2, 8);
      ctx.fillStyle = "#e6d2a2";
      ctx.fillRect(e.x - 6, e.y - 10, 12, 8);
      ctx.fillStyle = "#6b5130";
      ctx.fillRect(e.x - 4, e.y - 8, 8, 1);
      ctx.fillRect(e.x - 4, e.y - 6, 6, 1);
      return;
    }
    if (e.type === "source") {
      ctx.fillStyle = "#7ef0ff";
      ctx.fillRect(e.x - 3, e.y - 8, 6, 10);
      ctx.fillStyle = "#fff";
      ctx.fillRect(e.x - 1, e.y - 6, 2, 4);
      return;
    }
    if (e.type === "sink") {
      ctx.fillStyle = flags.pipes_ok ? "#7ef0a0" : "#a33b4a";
      ctx.fillRect(e.x - 5, e.y - 6, 10, 10);
      ctx.fillStyle = "#1a1020";
      ctx.fillRect(e.x - 2, e.y - 2, 4, 4);
      return;
    }
    if (e.type === "portal" && flags[e.flag]) {
      const c = (time * 6 | 0) % 2 ? "#ffe08a" : "#7ef0ff";
      ctx.fillStyle = c;
      ctx.fillRect(e.x - 6, e.y - 12, 12, 16);
      ctx.fillStyle = "#1a1030";
      ctx.fillRect(e.x - 3, e.y - 8, 6, 8);
      tag("PORTAL", e.x, e.y - 22, c);
    }
  }

  function drawHero(id) {
    const p = players[id];
    if (!p) return;
    if (iframes[id] > 0 && hp[id] > 0 && ((time * 16) | 0) % 2 === 0) return;
    ctx.save();
    if (hp[id] <= 0) {
      ctx.translate(p.x, p.y);
      ctx.scale(1, 0.45);
      ctx.translate(-p.x, -p.y);
    } else if (id !== active) ctx.globalAlpha = 0.62;
    const frame = p.moving ? ((time * 8) | 0) % 2 : 0;
    const pose = p.swing > 0 ? (p.pose || "") : "";
    if (id === "vini") D.drawVini(ctx, p.x, p.y, p.dir, frame, pose);
    else D.drawJoao(ctx, p.x, p.y, p.dir, frame, pose === "bat", pose === "bike");
    ctx.restore();
  }

  function drawActors() {
    const list = [];
    [mateId(), active].forEach(function (id) {
      if (players[id]) list.push({ y: players[id].y, draw: function () { drawHero(id); } });
    });
    for (let i = 0; i < entities.length; i++) {
      const e = entities[i];
      if (e.dead) continue;
      if (["plate", "pipe", "door", "shot"].indexOf(e.type) >= 0) continue;
      list.push({ y: e.y, draw: function () { drawSprite(e); } });
    }
    list.sort(function (a, b) { return a.y - b.y; });
    for (let i = 0; i < list.length; i++) list[i].draw();
    for (let i = 0; i < entities.length; i++) {
      const s = entities[i];
      if (s.type === "shot" && !s.dead) {
        ctx.fillStyle = "#ff4455";
        ctx.fillRect(s.x - 2, s.y - 2, 4, 4);
      }
    }
    if (players[active] && hp[active] > 0) {
      const p = players[active];
      const ay = p.y - 46 + Math.sin(time * 6) * 2;
      ctx.fillStyle = active === "vini" ? "#ffb000" : "#3ec6ff";
      ctx.fillRect(p.x - 2, ay, 4, 3);
    }
  }

  function drawFloorDecals() {
    for (let i = 0; i < entities.length; i++) {
      const e = entities[i];
      if (e.dead) continue;
      if (e.type === "plate") drawPlate(e);
      else if (e.type === "pipe") D.drawPipe(ctx, e, powered.has(e.tx + "," + e.ty));
      else if (e.type === "door") D.drawDoor(ctx, e, doorOpen(e));
    }
  }

  function drawWorld() {
    if (!room || !players.vini) return;
    if (players.joao && players.vini.x) syncMate();
    ctx.save();
    if (!reduceMotion && shake > 0.4) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    ctx.translate(0, ROOM_Y);
    D.tilemap(ctx, room.grid, level.theme, flags, room.id, time);
    drawFloorDecals();
    drawActors();
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      ctx.globalAlpha = Math.max(0, p.life * 2);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x | 0, p.y | 0, p.s, p.s);
      ctx.globalAlpha = 1;
    }
    font(8);
    for (let i = 0; i < floats.length; i++) {
      const f = floats[i];
      ctx.fillStyle = "#000";
      ctx.fillText(f.text, f.x + 1, f.y + 1);
      ctx.fillStyle = "#fff";
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.restore();
    drawHUD();
    drawObjective();
    if (fade > 0 && room) {
      ctx.fillStyle = "rgba(0,0,0," + Math.min(0.85, fade / 0.28) + ")";
      ctx.fillRect(0, 0, 320, 292);
      font(8);
      ctx.fillStyle = "#ffe08a";
      ctx.textAlign = "center";
      ctx.fillText(room.name, 160, 140);
      ctx.textAlign = "left";
    }
  }

  function plaque(x, y, w, h, accent) {
    ctx.fillStyle = "#0c1224";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = accent;
    ctx.fillRect(x, y, w, 1);
    ctx.fillRect(x, y + h - 1, w, 1);
    ctx.fillRect(x, y, 1, h);
    ctx.fillRect(x + w - 1, y, 1, h);
  }

  function drawMiniKeys(x, y) {
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(x, y, 14, 8);
    ctx.fillStyle = "#94a3b8";
    ctx.fillRect(x + 1, y + 1, 3, 2);
    ctx.fillRect(x + 5, y + 1, 3, 2);
    ctx.fillRect(x + 9, y + 1, 3, 2);
    ctx.fillRect(x + 1, y + 4, 11, 2);
  }

  function drawMiniLaptop(x, y) {
    ctx.fillStyle = "#e2e8f0";
    ctx.fillRect(x, y, 12, 7);
    ctx.fillStyle = "#22d3ee";
    ctx.fillRect(x + 1, y + 1, 10, 4);
    ctx.fillStyle = "#94a3b8";
    ctx.fillRect(x - 1, y + 7, 14, 2);
  }

  function drawHUD() {
    ctx.fillStyle = "rgba(6,8,18,0.94)";
    ctx.fillRect(0, 0, 320, 36);
    ctx.fillStyle = "#22d3ee";
    ctx.fillRect(0, 35, 320, 1);
    plaque(2, 2, 120, 32, active === "vini" ? "#fbbf24" : "#22d3ee");
    plaque(198, 2, 120, 32, active === "joao" ? "#22d3ee" : "#64748b");
    drawFace("vini", 5, 4, active === "vini");
    drawFace("joao", 201, 4, active === "joao");
    font(8);
    ctx.fillStyle = "#f8fafc";
    ctx.fillText("VINI MANGA", 36, 5);
    ctx.fillText("JOÃO", 232, 5);
    for (let i = 0; i < 4; i++) {
      D.heartIcon(ctx, 36 + i * 9, 16, i < hp.vini);
      D.heartIcon(ctx, 232 + i * 9, 16, i < hp.joao);
    }
    drawMiniKeys(96, 18);
    drawMiniLaptop(292, 17);
    if (level) {
      ctx.textAlign = "center";
      ctx.fillStyle = "#fbbf24";
      ctx.fillText(level.name, 160, 8);
      ctx.fillStyle = "#67e8f9";
      ctx.fillText(level.short, 160, 18);
      ctx.textAlign = "left";
    }
    const boss = entities.find(function (e) { return e.type === "boss" && !e.dead; });
    if (boss) {
      const max = boss.maxHp || 3;
      ctx.fillStyle = "#2a1020";
      ctx.fillRect(120, 36, 80, 3);
      ctx.fillStyle = "#e11d48";
      ctx.fillRect(120, 36, Math.max(0, 80 * (boss.hp / max)), 3);
    }
  }

  function drawFace(key, x, y, on) {
    ctx.fillStyle = on ? (key === "vini" ? "#fbbf24" : "#22d3ee") : "#1e293b";
    ctx.fillRect(x - 1, y - 1, 30, 30);
    ctx.fillStyle = "#0c1224";
    ctx.fillRect(x, y, 28, 28);
    if (!drawCover(key, x, y, 28, 28)) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, 28, 28);
      ctx.clip();
      if (key === "vini") D.drawVini(ctx, x + 14, y + 30, "down", 0);
      else D.drawJoao(ctx, x + 14, y + 30, "down", 0, false);
      ctx.restore();
    }
  }

  function drawObjective() {
    ctx.fillStyle = "#0c1224";
    ctx.fillRect(0, 276, 320, 16);
    ctx.fillStyle = "#e879f9";
    ctx.fillRect(0, 276, 320, 1);
    if (!level) return;
    font(8);
    if (level.theme === "cloud") {
      const items = [["EC2", "svc_ec2"], ["S3", "svc_s3"], ["RDS", "svc_rds"], ["LMB", "svc_lambda"], ["PONTE", "bridge"], ["DEP", "boss4"]];
      items.forEach(function (it, i) {
        const on = !!flags[it[1]];
        ctx.fillStyle = on ? "#3ecf6e" : "#3a3148";
        ctx.fillRect(4 + i * 46, 280, 6, 6);
        ctx.fillStyle = on ? "#d8ffe6" : "#b6a8c4";
        ctx.fillText(it[0], 12 + i * 46, 279);
      });
    } else {
      const cur = level.objectives.find(function (o) { return !flags[o.flag]; });
      ctx.fillStyle = "#f2e2b0";
      ctx.fillText(cur ? cur.text : "Fase limpa. Encosta no portal.", 6, 280);
    }
    ctx.fillStyle = "#0c1224";
    ctx.fillRect(300, 278, 18, 12);
    ctx.fillStyle = "#e879f9";
    ctx.fillText("Q", 304, 280);
  }

  function panel(y, h) {
    ctx.fillStyle = "rgba(8,6,16,0.94)";
    ctx.fillRect(8, y, 304, h);
    ctx.strokeStyle = "#e7c56a";
    ctx.strokeRect(8.5, y + 0.5, 303, h - 1);
  }

  function drawDialogue() {
    if (!dialogue) return;
    const line = dialogue.lines[dialogue.i];
    panel(168, 104);
    if (line.sprite) {
      ctx.fillStyle = "#1a1030";
      ctx.fillRect(16, 178, 52, 52);
      if (!drawCover(line.sprite, 16, 178, 52, 52)) D.drawNpc(ctx, line.sprite, 42, 226, 0);
      ctx.strokeStyle = "#e7c56a";
      ctx.strokeRect(16.5, 178.5, 51, 51);
    }
    font(8);
    ctx.fillStyle = "#ffe08a";
    const tx = line.sprite ? 76 : 18;
    ctx.fillText(line.name || "", tx, 176);
    const shown = line.text.slice(0, Math.floor(dialogue.shown));
    const lines = wrap(shown, line.sprite ? 220 : 276);
    ctx.fillStyle = "#f6f0e4";
    lines.forEach(function (ln, i) { ctx.fillText(ln, tx, 190 + i * 11); });
    if (dialogue.shown >= line.text.length && (time * 2 | 0) % 2 === 0) {
      ctx.fillStyle = "#ffe08a";
      ctx.fillText(">", 292, 250);
    }
  }

  function drawSQL() {
    const e = sql.e;
    ctx.fillStyle = "rgba(4,2,10,0.78)";
    ctx.fillRect(0, 36, 320, 240);
    ctx.fillStyle = "#10160f";
    ctx.fillRect(12, 48, 296, 210);
    ctx.strokeStyle = "#7ef0a0";
    ctx.strokeRect(12.5, 48.5, 295, 209);
    font(8);
    ctx.fillStyle = "#7ef0a0";
    ctx.fillText(e.title, 20, 56);
    let y = 70;
    wrap(e.intro, 272).forEach(function (ln) { ctx.fillStyle = "#d7ecff"; ctx.fillText(ln, 20, y); y += 10; });
    y += 4;
    wrap(e.question, 272).forEach(function (ln) { ctx.fillStyle = "#ffe08a"; ctx.fillText(ln, 20, y); y += 10; });
    y += 6;
    e.options.forEach(function (op, i) {
      const mark = (i === sql.sel ? "> " : "  ") + (i + 1) + " " + op;
      ctx.fillStyle = i === sql.sel ? "#ffffff" : "#b7c4aa";
      wrap(mark, 272).forEach(function (ln) { ctx.fillText(ln, 20, y); y += 10; });
      y += 3;
    });
  }

  function drawPause() {
    ctx.fillStyle = "rgba(0,0,0,0.72)";
    ctx.fillRect(0, 36, 320, 240);
    font(8);
    ctx.fillStyle = "#ffe08a";
    ctx.fillText("PAUSA", 20, 48);
    level.objectives.forEach(function (o, i) {
      ctx.fillStyle = flags[o.flag] ? "#7ef0a0" : "#f2e2b0";
      ctx.fillText((flags[o.flag] ? "[x] " : "[ ] ") + o.text, 20, 66 + i * 12);
    });
    ctx.fillStyle = "#c8b48a";
    ctx.fillText("ESC ou ENTER volta. H repete a dica do mestre.", 20, 248);
  }

  function drawGameOver() {
    ctx.fillStyle = "rgba(0,0,0,0.72)";
    ctx.fillRect(0, 70, 320, 120);
    font(8);
    ctx.fillStyle = "#ff8b96";
    ctx.textAlign = "center";
    ctx.fillText("BUG CRÍTICO", 160, 90);
    ctx.fillStyle = "#f6f0e4";
    ctx.fillText("Os dois caíram no meio do sonho.", 160, 112);
    ctx.fillText("ENTER tenta de novo nesta sala.", 160, 132);
    ctx.textAlign = "left";
  }

  function drawCard() {
    ctx.fillStyle = "#140c22";
    ctx.fillRect(0, 0, 320, 292);
    D.centerBlit(ctx, level.name, 70, "#ffb000", 2);
    D.centerBlit(ctx, level.title, 100, "#7ec8ff", 2);
    font(8);
    ctx.fillStyle = "#f6f0e4";
    ctx.textAlign = "center";
    wrap(level.card, 260).forEach(function (ln, i) { ctx.fillText(ln, 160, 150 + i * 12); });
    if ((time * 2 | 0) % 2 === 0) ctx.fillStyle = "#ffe08a";
    ctx.fillText("ENTER", 160, 220);
    ctx.textAlign = "left";
  }

  function drawPages(pages, index) {
    ctx.fillStyle = "#100818";
    ctx.fillRect(0, 0, 320, 292);
    font(8);
    ctx.textAlign = "center";
    const page = pages[index];
    page.forEach(function (ln, i) {
      ctx.fillStyle = i === 0 ? "#ffe08a" : "#f6f0e4";
      ctx.fillText(ln, 160, 100 + i * 16);
    });
    if ((time * 2 | 0) % 2 === 0) {
      ctx.fillStyle = "#c8b48a";
      ctx.fillText("ENTER", 160, 240);
    }
    ctx.textAlign = "left";
  }

  function drawQuestHold() {
    if (!level) return;
    const objs = level.objectives || [];
    const open = objs.filter(function (o) { return !flags[o.flag]; });
    const done = objs.filter(function (o) { return !!flags[o.flag]; });
    const rows = [{ t: "OBJETIVOS", c: "#ffe08a" }];
    if (!open.length) rows.push({ t: "Nada pendente.", c: "#f2e2b0" });
    open.forEach(function (o) { rows.push({ t: "[ ] " + o.text, c: "#f6f0e4" }); });
    rows.push({ t: "", c: "#f6f0e4" });
    rows.push({ t: "CONCLUÍDAS  " + done.length + "/" + objs.length, c: "#7ef0a0" });
    if (!done.length) rows.push({ t: "Nenhuma ainda.", c: "#c8b48a" });
    done.forEach(function (o) { rows.push({ t: "[x] " + o.text, c: "#7ef0a0" }); });
    rows.push({ t: "", c: "#c8b48a" });
    rows.push({ t: "solta Q", c: "#c8b48a" });
    const lineH = 11;
    const h = 16 + rows.length * lineH;
    const y0 = 44;
    ctx.fillStyle = "rgba(4,2,12,0.86)";
    ctx.fillRect(0, 36, 320, 256);
    ctx.fillStyle = "rgba(8,6,16,0.98)";
    ctx.fillRect(8, y0, 304, h);
    ctx.strokeStyle = "#e7c56a";
    ctx.strokeRect(8.5, y0 + 0.5, 303, h - 1);
    font(8);
    rows.forEach(function (r, i) {
      ctx.fillStyle = r.c;
      ctx.fillText(r.t, 18, y0 + 8 + i * lineH);
    });
  }

  function drawTitle() {
    ctx.fillStyle = "#100818";
    ctx.fillRect(0, 0, 320, 292);
    for (let i = 0; i < 16; i++) {
      const x = (i * 41) % 308;
      const h = 36 + (i * 19) % 78;
      ctx.fillStyle = i % 2 ? "#2a1848" : "#172554";
      ctx.fillRect(x, 168 - h, 26, h);
      ctx.fillStyle = i % 3 ? "#22d3ee" : "#e879f9";
      ctx.fillRect(x + 4, 176 - h, 3, 3);
      ctx.fillRect(x + 12, 188 - h, 3, 3);
      if (i % 2 === 0) {
        ctx.fillStyle = "#fbbf24";
        ctx.fillRect(x + 18, 200 - h, 2, 2);
      }
    }
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(0, 168, 320, 124);
    ctx.fillStyle = "#22d3ee";
    ctx.fillRect(0, 168, 320, 1);
    ctx.fillStyle = "#e879f9";
    ctx.fillRect(0, 170, 320, 1);
    D.centerBlit(ctx, "LIFEMED", 12, "#f2e2b0", 2);
    D.centerBlit(ctx, "VINI MANGA", 34, "#ffb000", 3);
    D.centerBlit(ctx, "E JOAO", 62, "#3ec6ff", 3);
    D.centerBlit(ctx, "CODE ADVENTURE", 90, "#ffe14a", 2);
    const cast = ["master", "frontend", "sqlmaster", "warrior", "priest", "pandora"];
    cast.forEach(function (k, i) {
      const x = 46 + i * 40;
      ctx.fillStyle = "#0c1224";
      ctx.fillRect(x, 112, 28, 28);
      if (!drawCover(k, x, 112, 28, 28)) D.drawNpc(ctx, k, x + 14, 136, 0);
      ctx.strokeStyle = "#67e8f9";
      ctx.strokeRect(x + 0.5, 112.5, 27, 27);
    });
    D.drawVini(ctx, 86, 208, "down", (time * 6 | 0) % 2);
    D.drawJoao(ctx, 230, 210, "down", (time * 6 | 0) % 2, false);
    ctx.fillStyle = "rgba(8,10,22,0.82)";
    ctx.fillRect(28, 228, 264, 32);
    ctx.strokeStyle = "#fbbf24";
    ctx.strokeRect(28.5, 228.5, 263, 31);
    font(8);
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff4c8";
    ctx.fillText("ENTER dorme no teclado", 160, 234);
    ctx.fillText("C continua   K controles", 160, 246);
    const saveData = readSave();
    if (saveData && saveData.level > 0) {
      ctx.fillStyle = "#fff2c4";
      ctx.fillText("continuar na fase " + (saveData.level + 1), 160, 262);
    }
    ctx.textAlign = "left";
  }

  function drawControls() {
    ctx.fillStyle = "#140c22";
    ctx.fillRect(0, 0, 320, 292);
    font(8);
    const lines = [
      "CONTROLES",
      "",
      "Setas ou WASD andam com o herói ativo",
      "1 Vini   2 João   TAB troca",
      "O outro anda junto e atravessa tudo.",
      "",
      "Vini: ESPAÇO ou F peida",
      "R arrota e quebra parede rachada",
      "E no terminal responde SQL",
      "",
      "João: ESPAÇO é o taco cibernético",
      "R empina a moto e atropela 2 quadrados",
      "E gira tubo, liga console, puxa alavanca",
      "H repete a dica do mestre",
      "Segure Q: objetivos e concluídas",
      "ESC pausa    M música",
      "",
      "ENTER volta"
    ];
    lines.forEach(function (ln, i) {
      ctx.fillStyle = i === 0 ? "#ffe08a" : "#f6f0e4";
      ctx.fillText(ln, 16, 16 + i * 14);
    });
  }

  function draw() {
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, 320, 292);
    if (mode === "title") return drawTitle();
    if (mode === "controls") return drawControls();
    if (mode === "intro") return drawPages(INTRO, introI);
    if (mode === "ending") return drawPages(ENDING, endI);
    if (mode === "levelcard") return drawCard();
    drawWorld();
    if (mode === "play" && keys.q) drawQuestHold();
    if (mode === "dialogue") drawDialogue();
    if (mode === "sql") drawSQL();
    if (mode === "pause") drawPause();
    if (mode === "gameover") drawGameOver();
  }

  function handleModes() {
    blockPlay = false;
    if (pressed.m) A.toggle();
    if (mode === "title") {
      if (pressed.k) mode = "controls";
      else if (pressed.c) {
        const saveData = readSave();
        if (saveData && saveData.level > 0) {
          levelIndex = saveData.level;
          beginLevel();
        }
      } else if (pressed.enter || pressed.space) {
        levelIndex = 0;
        introI = 0;
        mode = "intro";
      }
      return;
    }
    if (mode === "controls") {
      if (pressed.enter || pressed.space || pressed.escape || pressed.k) mode = "title";
      return;
    }
    if (mode === "intro") {
      if (pressed.enter || pressed.space) {
        introI += 1;
        if (introI >= INTRO.length) beginLevel();
      }
      return;
    }
    if (mode === "ending") {
      if (pressed.enter || pressed.space) {
        endI += 1;
        if (endI >= ENDING.length) mode = "title";
      }
      return;
    }
    if (mode === "levelcard") {
      if (pressed.enter || pressed.space) openLevel();
      return;
    }
    if (mode === "gameover") {
      if (pressed.enter || pressed.space) retryRoom();
      return;
    }
    if (mode === "dialogue") {
      if (pressed.enter || pressed.space || pressed.e) {
        advanceDialogue();
        blockPlay = true;
      }
      return;
    }
    if (mode === "sql") {
      if (pressed.arrowup || pressed.w) sql.sel = (sql.sel + sql.e.options.length - 1) % sql.e.options.length;
      if (pressed.arrowdown || pressed.s) sql.sel = (sql.sel + 1) % sql.e.options.length;
      if (pressed["1"]) sql.sel = 0;
      if (pressed["2"]) sql.sel = 1;
      if (pressed["3"]) sql.sel = 2;
      if (pressed["4"]) sql.sel = 3;
      if (pressed.enter || pressed.space) { confirmSQL(); blockPlay = true; }
      else if (pressed.escape) { mode = "play"; sql = null; blockPlay = true; }
      return;
    }
    if (mode === "pause") {
      if (pressed.escape || pressed.enter) mode = "play";
      return;
    }
    if (mode === "play" && pressed.escape) mode = "pause";
  }

  function frame(t) {
    const dt = Math.min(0.033, last ? (t - last) / 1000 : 0.016);
    last = t;
    time += dt;
    if (fade > 0) fade -= dt;
    if (exitLock > 0) exitLock -= dt;
    shake = Math.max(0, shake - dt * 18);
    A.tick();
    handleModes();
    if (mode === "dialogue" && dialogue) dialogue.shown += dt * 46;
    if (mode === "play" && !blockPlay && !keys.q) updatePlay(dt);
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    particles = particles.filter(function (p) { return p.life > 0; });
    for (let i = 0; i < floats.length; i++) {
      floats[i].life -= dt;
      floats[i].y -= 16 * dt;
    }
    floats = floats.filter(function (f) { return f.life > 0; });
    draw();
    for (const k in pressed) delete pressed[k];
    requestAnimationFrame(frame);
  }

  window.addEventListener("keydown", function (e) {
    const k = e.key === " " ? "space" : e.key === "Escape" ? "escape" : e.key === "Tab" ? "tab" : e.key === "Enter" ? "enter" : e.key.toLowerCase();
    if (["space", "arrowup", "arrowdown", "arrowleft", "arrowright", "tab"].indexOf(k) >= 0) e.preventDefault();
    keys[k] = true;
    if (!e.repeat) pressed[k] = true;
    A.unlock();
  });
  window.addEventListener("keyup", function (e) {
    const k = e.key === " " ? "space" : e.key === "Escape" ? "escape" : e.key === "Tab" ? "tab" : e.key === "Enter" ? "enter" : e.key.toLowerCase();
    keys[k] = false;
  });
  canvas.addEventListener("mousedown", function () {
    pressed.enter = true;
    A.unlock();
    canvas.focus();
  });

  A.song("title");
  requestAnimationFrame(frame);
})();
