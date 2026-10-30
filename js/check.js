const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname);
let failed = 0;

function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error("FAIL " + msg);
  }
}

for (const file of ["audio.js", "draw.js", "levels.js", "game.js"]) {
  const code = fs.readFileSync(path.join(root, file), "utf8");
  try {
    new vm.Script(code, { filename: file });
  } catch (err) {
    failed += 1;
    console.error("SYNTAX " + file + " " + err.message);
  }
}

const sandbox = { console: console };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, "levels.js"), "utf8"), sandbox);
const VMJ = sandbox.VMJ;
assert(VMJ && VMJ.levels && VMJ.levels.length === 4, "4 fases");

const sprites = new Set();
const opp = { n: "s", s: "n", e: "w", w: "e" };

for (const level of VMJ.levels) {
  const ids = new Set();
  assert(level.rooms[level.start], level.id + " start");
  assert(level.rooms[level.start].spawns && level.rooms[level.start].spawns.vini, level.id + " spawns");
  for (const [id, room] of Object.entries(level.rooms)) {
    assert(room.grid.length === 15, id + " rows " + room.grid.length);
    for (const row of room.grid) assert(row.length === 20, id + " width " + row.length + " " + row);
    for (const [dir, dest] of Object.entries(room.exits)) {
      assert(level.rooms[dest], id + " exit " + dir + " -> " + dest);
      const back = level.rooms[dest];
      assert(back.exits[opp[dir]] === id, id + " " + dir + " não volta de " + dest);
    }
    for (const e of room.entities) {
      assert(!ids.has(e.id), "id repetido " + e.id);
      ids.add(e.id);
      if (e.sprite) sprites.add(e.sprite);
      if (e.type === "door") {
        assert(room.exits[e.side], id + " porta sem saída " + e.side);
      } else if (typeof e.x === "number") {
        const ch = room.grid[e.y][e.x];
        assert(ch && ch !== "#" && ch !== "+" && ch !== "v" && ch !== "l", id + " " + e.id + " no tile " + ch + " " + e.x + "," + e.y);
      }
    }
    if (id === level.start) {
      for (const who of ["vini", "joao"]) {
        const [x, y] = room.spawns[who];
        const ch = room.grid[y][x];
        assert(ch === "." || ch === ",", id + " spawn " + who + " " + ch);
      }
    }
  }
}

for (const name of ["master", "frontend", "sqlmaster", "warrior", "priest", "pandora"]) {
  assert(sprites.has(name), "falta npc " + name);
}

const pipesRoom = VMJ.levels[2].rooms.arq_pipes;
const pipes = pipesRoom.entities.filter(function (e) { return e.type === "pipe"; });
const source = pipesRoom.entities.find(function (e) { return e.type === "source"; });
const sink = pipesRoom.entities.find(function (e) { return e.type === "sink"; });
assert(VMJ.evalPipes(pipes, source, sink).reached === false, "tubos começam desligados");
const solved = pipes.map(function (p) { return { x: p.x, y: p.y, kind: p.kind, rot: p.solution }; });
assert(VMJ.evalPipes(solved, source, sink).reached === true, "solução dos tubos liga o fluxo");

const muro = VMJ.levels[0].rooms.muro;
assert(muro.grid[0][9] === "+" && muro.grid[0][10] === "+", "norte do muro rachado");
assert(muro.grid[6][19] === "+", "leste do muro rachado");

const crateRoom = VMJ.levels[0].rooms.caixa;
const crate = crateRoom.entities.find(function (e) { return e.id === "crate_heavy"; });
const plate = crateRoom.entities.find(function (e) { return e.id === "plate_crate"; });
assert(crate.y === plate.y, "caixa e botão na mesma linha");
for (let x = crate.x + 1; x <= plate.x; x++) {
  const ch = crateRoom.grid[crate.y][x];
  assert(ch === "." || ch === ",", "caminho da caixa bloqueado em " + x + " " + ch);
}

const npcFiles = [
  "npcs/master_master.png",
  "npcs/frontend_master.jpg",
  "npcs/sql_master.png",
  "npcs/sql_warrior.png",
  "npcs/priest.png",
  "npcs/pandora_healer.png"
];
for (const file of npcFiles) assert(fs.existsSync(path.join(root, "..", file)), "arquivo " + file);

if (failed) {
  console.error(failed + " falhas");
  process.exit(1);
}
console.log("ok " + VMJ.levels.length + " fases, " + sprites.size + " npcs");
