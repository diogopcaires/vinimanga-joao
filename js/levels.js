(function () {
  function makeGrid(opts) {
    const g = [];
    for (let y = 0; y < 15; y++) {
      const row = [];
      for (let x = 0; x < 20; x++) {
        const borderN = y === 0;
        const borderS = y === 14;
        const borderW = x <= 1;
        const borderE = x >= 18;
        const nsGap = x === 9 || x === 10;
        const ewGap = y === 6 || y === 7;
        let wall = false;
        if (borderN && !(opts.n && nsGap)) wall = true;
        if (borderS && !(opts.s && nsGap)) wall = true;
        if (borderW && !(opts.w && ewGap)) wall = true;
        if (borderE && !(opts.e && ewGap)) wall = true;
        if ((borderN || borderS) && (borderW || borderE)) wall = true;
        row.push(wall ? "#" : ".");
      }
      g.push(row);
    }
    if (opts.paint) opts.paint(g);
    return g.map(function (r) { return r.join(""); });
  }

  function grass(g) {
    for (let y = 0; y < 15; y++) {
      for (let x = 0; x < 20; x++) {
        if (g[y][x] !== ".") continue;
        const path = (x >= 8 && x <= 11) || (y >= 6 && y <= 8 && x >= 2 && x <= 17);
        if (!path) g[y][x] = ",";
      }
    }
  }

function crackEast(g) {
  g[6][18] = "+";
  g[6][19] = "+";
  g[7][18] = "+";
  g[7][19] = "+";
}

function crackNorth(g) {
  g[0][9] = "+";
  g[0][10] = "+";
  g[1][9] = "+";
  g[1][10] = "+";
}

  function crackCol(g, x) {
    for (let y = 1; y <= 13; y++) g[y][x] = "+";
  }

  function laserNorth(g) {
    for (const y of [0, 1, 2]) {
      g[y][9] = "l";
      g[y][10] = "l";
    }
  }

  function chasm(g) {
    for (const y of [6, 7]) {
      for (let x = 2; x <= 17; x++) g[y][x] = x >= 8 && x <= 11 ? "=" : "v";
    }
  }

  const DIR = {
    N: { bit: 1, dx: 0, dy: -1, opp: 4 },
    E: { bit: 2, dx: 1, dy: 0, opp: 8 },
    S: { bit: 4, dx: 0, dy: 1, opp: 1 },
    W: { bit: 8, dx: -1, dy: 0, opp: 2 }
  };

  const MASKS = {
    line: [10, 5, 10, 5],
    corner: [3, 6, 12, 9]
  };

  function pipeMask(p) {
    return MASKS[p.kind][(p.rot || 0) & 3];
  }

  function evalPipes(pipes, source, sink) {
    const byKey = new Map(pipes.map(function (p) { return [p.x + "," + p.y, p]; }));
    const powered = new Set();
    let reached = false;
    const startKey = (source.x + DIR[source.dir].dx) + "," + (source.y + DIR[source.dir].dy);
    const stack = [{ key: startKey, fromBit: DIR[source.dir].opp }];
    const seen = new Set();
    while (stack.length) {
      const cur = stack.pop();
      const token = cur.key + ":" + cur.fromBit;
      if (seen.has(token)) continue;
      seen.add(token);
      const p = byKey.get(cur.key);
      if (!p) continue;
      const mask = pipeMask(p);
      if ((mask & cur.fromBit) === 0) continue;
      powered.add(cur.key);
      for (const d of Object.values(DIR)) {
        if ((mask & d.bit) === 0) continue;
        if (d.bit === cur.fromBit) continue;
        const nx = p.x + d.dx;
        const ny = p.y + d.dy;
        if (nx === sink.x && ny === sink.y && d.bit === DIR[sink.accept].bit) reached = true;
        stack.push({ key: nx + "," + ny, fromBit: d.opp });
      }
    }
    return { powered: powered, reached: reached };
  }

  function pipe(id, x, y, kind, solution) {
    return { type: "pipe", id: id, x: x, y: y, kind: kind, rot: (solution + 1) % 4, solution: solution };
  }

  const levels = [
    {
      id: "bosque",
      name: "FASE 1",
      title: "BOSQUE DOS BUGS",
      short: "BOSQUE",
      theme: "forest",
      music: "forest",
      start: "entrada",
      card: "O Mestre dos Mestres espera na clareira.",
      hint: [
        "TAB ou 1 e 2 trocam quem age. O outro anda junto e é intangível.",
        "Vini: ESPAÇO peida e empurra peso. R arrota parede rachada.",
        "João: ESPAÇO é o taco. R empina a moto branca e atropela 2 quadrados."
      ],
      objectives: [
        { flag: "talk_l1", text: "Fale com o Mestre dos Mestres" },
        { flag: "plate_crate", text: "Peide a caixa até o botão" },
        { flag: "crack_muro", text: "Arrote o muro rachado" },
        { flag: "key1", text: "Quebre a caixa e pegue a chave" },
        { flag: "boss1", text: "Derrote o Bug Rei" }
      ],
      rooms: {
        entrada: {
          name: "Clareira do Café",
          grid: makeGrid({ n: true, paint: grass }),
          exits: { n: "caixa" },
          spawns: { vini: [4, 10], joao: [14, 10] },
          entities: [
            { type: "npc", id: "npc_master1", sprite: "master", name: "MESTRE", short: "MESTRE", color: "#e7b2c8", x: 7, y: 8, auto: true, flag: "talk_l1", heal: 0,
              lines: [
                "Estagiários. Vocês dormiram no teclado da Lifemed de novo.",
                "Aqui o sonho é medieval, mas o inimigo é bug, query torta e deploy furado.",
                "Vini, sua mão virou o corpo. A cabeça mora no dedão.",
                "ESPAÇO peida e empurra o que é pesado. R arrota e quebra o que está rachado.",
                "João, o taco cibernético quebra caixa, inseto e interrupção.",
                "No João, R empina uma moto branca. O dash atropela o que estiver dois quadrados na frente.",
                "TAB, ou 1 e 2, troca quem age. O outro vem junto e atravessa parede, caixa e bicho."
              ],
              again: ["O peido empurra. O arroto quebra. O taco commita. A moto do João atropela."]
            },
            { type: "sign", id: "sign_ent", x: 15, y: 11, name: "PLACA", lines: ["1 Vini, 2 João, TAB troca.", "R do Vini arrota. R do João é a moto."] },
            { type: "tree", id: "tree_a", x: 4, y: 4 },
            { type: "tree", id: "tree_b", x: 15, y: 4 }
          ]
        },
        caixa: {
          name: "Trilha da Caixa",
          grid: makeGrid({ n: true, s: true, paint: grass }),
          exits: { n: "muro", s: "entrada" },
          entities: [
            { type: "crate", id: "crate_heavy", x: 5, y: 7, kind: "heavy" },
            { type: "plate", id: "plate_crate", x: 14, y: 7, accept: "crate_heavy", flag: "plate_crate" },
            { type: "door", id: "door_crate", side: "n", flag: "plate_crate" },
            { type: "sign", id: "sign_caixa", x: 4, y: 4, name: "PLACA", lines: ["Caixa pesada só obedece peido.", "Fica de frente pra ela e aperta ESPAÇO.", "Ela para em cima do botão."] }
          ]
        },
        muro: {
          name: "Muro Rachado",
          grid: makeGrid({ n: true, s: true, e: true, paint: function (g) { grass(g); crackEast(g); crackNorth(g); } }),
          exits: { n: "patio", s: "caixa", e: "coracao" },
          entities: [
            { type: "sign", id: "sign_muro", x: 4, y: 4, name: "PLACA", lines: ["O norte está rachado. Vini aperta R de frente.", "O mesmo arroto abre a capela a leste. O Padre está lá."] }
          ]
        },
        coracao: {
          name: "Capela do Commit",
          grid: makeGrid({ w: true, paint: grass }),
          exits: { w: "muro" },
          entities: [
            { type: "npc", id: "npc_priest", sprite: "priest", name: "PADRE", short: "PADRE", color: "#ff5a4a", x: 10, y: 7, auto: true, heal: 2,
              lines: [
                "Eu guardo o commit que ninguém quer revisar.",
                "O arroto abre o que está rachado. O taco abre o que está lacrado.",
                "Chega perto. Vou repor uns corações. Não é milagre, é rollback."
              ],
              again: ["De novo? Tá. Rollback de coração, sem juros."]
            },
            { type: "heart", id: "heart1", x: 8, y: 10 }
          ]
        },
        patio: {
          name: "Jardim dos Bugs",
          grid: makeGrid({ n: true, s: true, paint: grass }),
          exits: { n: "boss1", s: "muro" },
          entities: [
            { type: "npc", id: "npc_pandora1", sprite: "pandora", name: "PANDORA", short: "PANDORA", color: "#ffe08a", x: 4, y: 10, auto: true, heal: "full",
              lines: [
                "Respira, estagiário. Eu colo os corações de volta.",
                "Não é deploy. É cura. Podem entrar no boss inteiros."
              ],
              again: ["A cura ainda está de pé. Vem, que eu colo de novo."]
            },
            { type: "enemy", id: "bug_patio_a", kind: "bug", x: 5, y: 5, hp: 2 },
            { type: "enemy", id: "bug_patio_b", kind: "bug", x: 14, y: 6, hp: 2 },
            { type: "crate", id: "crate_wood", x: 9, y: 8, kind: "wood", drop: "key1" },
            { type: "door", id: "door_boss1", side: "n", needKey: "key1" },
            { type: "sign", id: "sign_patio", x: 15, y: 11, name: "PLACA", lines: ["A caixa de madeira quebra no taco do João.", "Dentro tem a chave do Bug Rei."] }
          ]
        },
        boss1: {
          name: "Trono do Bug Rei",
          grid: makeGrid({ s: true }),
          exits: { s: "patio" },
          boss: true,
          intro: [{ name: "BUG REI", text: "NullPointerException! Vocês esqueceram o ponto e vírgula da vida." }],
          victory: [
            { name: "MESTRE", sprite: "master", text: "O Bug Rei virou stack trace e sumiu." },
            { name: "MESTRE", sprite: "master", text: "Encosta no portal. A cripta do SQL está aberta." }
          ],
          entities: [
            { type: "boss", id: "boss_bugrei", kind: "bugrei", label: "BUG REI", x: 9, y: 6, hp: 8, setsFlag: "boss1" },
            { type: "door", id: "seal1", side: "s", seal: "boss1" },
            { type: "portal", id: "port1", x: 9, y: 9, flag: "boss1" }
          ]
        }
      }
    },
    {
      id: "cripta",
      name: "FASE 2",
      title: "CRIPTA DO SQL",
      short: "SQL",
      theme: "crypt",
      music: "crypt",
      start: "sql_hall",
      card: "O Mestre SQL laça as linhas no escuro.",
      hint: [
        "JOIN: pisa no botão da esquerda. O outro cobre o da direita.",
        "No terminal, só o Vini. SELECT com WHERE. Sem DROP.",
        "NULL não toma taco. O peido tira ele do fantasma. Aí o taco acerta."
      ],
      objectives: [
        { flag: "talk_l2", text: "Ouça o Mestre SQL" },
        { flag: "join_ok", text: "Faça o JOIN nos dois botões" },
        { flag: "query_ok", text: "Acerte o SELECT" },
        { flag: "null_dead", text: "Derrote o NULL" },
        { flag: "boss2", text: "Vença o DELETE sem WHERE" }
      ],
      rooms: {
        sql_hall: {
          name: "Salão do SELECT",
          grid: makeGrid({ n: true }),
          exits: { n: "sql_join" },
          spawns: { vini: [4, 10], joao: [14, 10] },
          entities: [
            { type: "npc", id: "npc_sql", sprite: "sqlmaster", name: "MESTRE SQL", short: "SQL", color: "#8fd0ff", x: 7, y: 8, auto: true, flag: "talk_l2",
              lines: [
                "Eu laço as linhas. Vocês executam.",
                "JOIN é os dois nos botões juntos. Pisa no da esquerda: o outro fecha o da direita.",
                "No terminal, só o Vini. SELECT com WHERE. Nada de DROP. Nada de DELETE sem filtro.",
                "O Guerreiro SQL está mais adiante, de pata e tudo.",
                "NULL não toma taco enquanto é fantasma. O peido materializa. O taco finaliza."
              ],
              again: ["WHERE é filtro. JOIN é os dois juntos. DROP é demissão."]
            },
            { type: "torch", id: "t1", x: 3, y: 3 },
            { type: "torch", id: "t2", x: 16, y: 3 }
          ]
        },
        sql_join: {
          name: "Câmara do JOIN",
          grid: makeGrid({ n: true, s: true }),
          exits: { n: "sql_query", s: "sql_hall" },
          entities: [
            { type: "plate", id: "join_a", x: 8, y: 8, pair: "join", latch: "join_ok" },
            { type: "plate", id: "join_b", x: 9, y: 8, pair: "join", latch: "join_ok" },
            { type: "door", id: "door_join", side: "n", flag: "join_ok" },
            { type: "sign", id: "sign_join", x: 9, y: 5, name: "PLACA", lines: ["Os dois andam juntos.", "Pisa no botão da esquerda.", "O outro fecha o da direita e a porta commita."] },
            { type: "torch", id: "t3", x: 3, y: 11 },
            { type: "torch", id: "t4", x: 16, y: 11 }
          ]
        },
        sql_query: {
          name: "Terminal",
          grid: makeGrid({ n: true, s: true }),
          exits: { n: "sql_null", s: "sql_join" },
          entities: [
            { type: "terminal", id: "term_sql", x: 9, y: 7, who: "vini", flag: "query_ok",
              title: "TERMINAL SQL",
              intro: "portoes (nome, status): norte/bug, leste/ok, sul/bug.",
              question: "Qual query abre só o portão certo?",
              options: [
                "SELECT * FROM portoes;",
                "SELECT nome FROM portoes WHERE status = 'ok';",
                "DELETE FROM portoes;",
                "DROP TABLE portoes;"
              ],
              answer: 1,
              wrong: "ERRO: isso não devolve só a linha ok."
            },
            { type: "door", id: "door_query", side: "n", flag: "query_ok" },
            { type: "sign", id: "sign_q", x: 4, y: 10, name: "PLACA", lines: ["O Vini opera o terminal com E.", "Queremos a linha com status ok. Sem apagar a tabela."] }
          ]
        },
        sql_null: {
          name: "Corredor NULL",
          grid: makeGrid({ n: true, s: true }),
          exits: { n: "boss2", s: "sql_query" },
          entities: [
            { type: "npc", id: "npc_warrior", sprite: "warrior", name: "GUERREIRO SQL", short: "GUERREIRO", color: "#ff8ac4", x: 4, y: 5, auto: true,
              lines: [
                "Eu vim de pata, mas bato em bug.",
                "Esse NULL não toma taco enquanto está fantasma.",
                "Vini peida, o bicho fica sólido, João commita o taco.",
                "Quatro acertos. Aí a porta norte aceita o plano de execução."
              ],
              again: ["Peido tira o NULL do ar. Taco em seguida. Eu fico de olho."]
            },
            { type: "npc", id: "npc_pandora2", sprite: "pandora", name: "PANDORA", short: "PANDORA", color: "#ffe08a", x: 15, y: 5, auto: true, heal: "full",
              lines: ["A cripta esfria os corações. Deixa que eu esquento.", "O DELETE sem WHERE está atrás daquela porta."],
              again: ["Cola de novo. Eu não cobro ponto de função."]
            },
            { type: "enemy", id: "null1", kind: "null", x: 9, y: 8, hp: 4, setsFlag: "null_dead" },
            { type: "door", id: "door_null", side: "n", flag: "null_dead" }
          ]
        },
        boss2: {
          name: "Altar do DELETE",
          grid: makeGrid({ s: true }),
          exits: { s: "sql_null" },
          boss: true,
          intro: [{ name: "DELETE", text: "Eu apago tudo. Sem WHERE. Sem piedade. Sem backup." }],
          victory: [
            { name: "MESTRE SQL", sprite: "sqlmaster", text: "Filtro aplicado. O DELETE perdeu o emprego." },
            { name: "MESTRE SQL", sprite: "sqlmaster", text: "Portal. A torre da arquitetura está no próximo commit." }
          ],
          entities: [
            { type: "boss", id: "boss_delete", kind: "delete", label: "DELETE SEM WHERE", x: 9, y: 7, hp: 3, setsFlag: "boss2" },
            { type: "clause", id: "where", x: 4, y: 5, label: "WHERE" },
            { type: "clause", id: "and", x: 15, y: 5, label: "AND" },
            { type: "clause", id: "limit", x: 9, y: 11, label: "LIMIT" },
            { type: "exec", id: "exec_del", x: 9, y: 4, label: "EXECUTAR" },
            { type: "door", id: "seal2", side: "s", seal: "boss2" },
            { type: "portal", id: "port2", x: 5, y: 11, flag: "boss2" },
            { type: "sign", id: "sign_del", x: 14, y: 11, name: "PLACA", lines: ["O taco acende WHERE, AND e LIMIT.", "Com as três cláusulas, o Vini executa no altar.", "Taco no boss não deleta nada. 0 rows."] }
          ]
        }
      }
    },
    {
      id: "torre",
      name: "FASE 3",
      title: "TORRE DA ARQUITETURA",
      short: "TORRE",
      theme: "tower",
      music: "tower",
      start: "arq_hall",
      card: "O Mestre Frontend pede componente no lugar certo.",
      hint: [
        "João gira os tubos com E até o fluxo chegar no receptor.",
        "Bloco de ferro só anda com taco, um passo por vez.",
        "Interruptores na ordem: Controller, Service, Repository."
      ],
      objectives: [
        { flag: "talk_l3", text: "Ouça o Mestre Frontend" },
        { flag: "pipes_ok", text: "Ligue os tubos até o receptor" },
        { flag: "seq_ok", text: "Ordem: Controller, Service, Repository" },
        { flag: "laser_off", text: "Assente o ferro no receptor" },
        { flag: "boss3", text: "Quebre a God Class" }
      ],
      rooms: {
        arq_hall: {
          name: "Hall SOLID",
          grid: makeGrid({ n: true }),
          exits: { n: "arq_pipes" },
          spawns: { vini: [4, 10], joao: [14, 10] },
          entities: [
            { type: "npc", id: "npc_front", sprite: "frontend", name: "MESTRE FRONT", short: "FRONT", color: "#ffd36a", x: 7, y: 8, auto: true, flag: "talk_l3",
              lines: [
                "Arquitetura boa é componente no lugar certo. Igual CSS, só que a torre cai.",
                "João gira os tubos com E até o fluxo acender o receptor. Aí a porta abre.",
                "O bloco de ferro só obedece taco. O peido não move metal.",
                "Os interruptores seguem a ordem: Controller, Service, Repository.",
                "Errou a ordem, o estado zera. Igual formulário sem controle."
              ],
              again: ["Gira tubo, empurra ferro, respeita a ordem. Eu sorrio e cobro o layout."]
            }
          ]
        },
        arq_pipes: {
          name: "Sala dos Tubos",
          grid: makeGrid({ n: true, s: true }),
          exits: { n: "arq_ordem", s: "arq_hall" },
          entities: [
            { type: "source", id: "src", x: 2, y: 5, dir: "E" },
            pipe("pA", 3, 5, "line", 0),
            pipe("pB", 4, 5, "line", 0),
            pipe("pC", 5, 5, "corner", 2),
            pipe("pD", 5, 6, "line", 1),
            pipe("pE", 5, 7, "corner", 0),
            pipe("pF", 6, 7, "line", 0),
            pipe("pG", 7, 7, "corner", 3),
            pipe("pH", 7, 6, "line", 1),
            pipe("pI", 7, 5, "corner", 1),
            { type: "sink", id: "sink", x: 8, y: 5, accept: "E" },
            { type: "door", id: "door_pipes", side: "n", flag: "pipes_ok" },
            { type: "sign", id: "sign_pipe", x: 12, y: 10, name: "PLACA", lines: ["João aperta E num tubo pra girar.", "O brilho tem que sair do cristal e chegar no cadeado.", "Vini, pode peidar à vontade. Não gira diagrama."] }
          ]
        },
        arq_ordem: {
          name: "Corredor SOLID",
          grid: makeGrid({ n: true, s: true }),
          exits: { n: "arq_laser", s: "arq_pipes" },
          entities: [
            { type: "switch", id: "controller", group: "solid_seq", order: ["controller", "service", "repository"], doneFlag: "seq_ok", x: 5, y: 7, label: "Controller" },
            { type: "switch", id: "service", group: "solid_seq", order: ["controller", "service", "repository"], doneFlag: "seq_ok", x: 9, y: 7, label: "Service" },
            { type: "switch", id: "repository", group: "solid_seq", order: ["controller", "service", "repository"], doneFlag: "seq_ok", x: 13, y: 7, label: "Repository" },
            { type: "door", id: "door_seq", side: "n", flag: "seq_ok" },
            { type: "enemy", id: "bug_ordem", kind: "bug", x: 9, y: 11, hp: 2 },
            { type: "sign", id: "sign_ord", x: 9, y: 4, name: "PLACA", lines: ["Taco na ordem: Controller, Service, Repository.", "Errou, zera. O bug no caminho é só distração."] }
          ]
        },
        arq_laser: {
          name: "Feixe Acoplado",
          grid: makeGrid({ n: true, s: true, paint: laserNorth }),
          exits: { n: "boss3", s: "arq_ordem" },
          entities: [
            { type: "crate", id: "metal1", x: 6, y: 10, kind: "metal" },
            { type: "plate", id: "plate_laser", x: 6, y: 6, accept: "metal1", flag: "laser_off" },
            { type: "npc", id: "npc_pandora3", sprite: "pandora", name: "PANDORA", short: "PANDORA", color: "#ffe08a", x: 14, y: 10, auto: true, heal: "full",
              lines: ["O feixe está sólido até o ferro sentar no botão.", "Eu cuido da vida. O João cuida do bloco."],
              again: ["Cura pronta. O ferro continua sendo problema de vocês."]
            },
            { type: "sign", id: "sign_laser", x: 12, y: 4, name: "PLACA", lines: ["Empurra o bloco de ferro com o taco, um tile por vez.", "Quando ele senta no botão, o feixe cai."] }
          ]
        },
        boss3: {
          name: "Sala da God Class",
          grid: makeGrid({ s: true }),
          exits: { s: "arq_laser" },
          boss: true,
          intro: [{ name: "GOD CLASS", text: "Eu faço tudo. Controller, regra, banco e o café. E faço mal." }],
          victory: [
            { name: "MESTRE FRONT", sprite: "frontend", text: "Extraíram a God Class. O código até respira." },
            { name: "MESTRE FRONT", sprite: "frontend", text: "Sobe. A nuvem é o último andar desse sonho." }
          ],
          entities: [
            { type: "boss", id: "boss_god", kind: "godclass", label: "GOD CLASS", x: 9, y: 6, hp: 3, setsFlag: "boss3" },
            { type: "door", id: "seal3", side: "s", seal: "boss3" },
            { type: "portal", id: "port3", x: 9, y: 10, flag: "boss3" },
            { type: "sign", id: "sign_god", x: 3, y: 11, name: "PLACA", lines: ["O taco racha o acoplamento.", "Quando o núcleo abrir, taco ou arroto tira um pedaço.", "Peido só atordoa. God Class aguenta o cheiro."] }
          ]
        }
      }
    },
    {
      id: "nuvem",
      name: "FASE 4",
      title: "INFRA NA NUVEM",
      short: "NUVEM",
      theme: "cloud",
      music: "cloud",
      start: "nuv_hall",
      card: "Quatro serviços. Uma ponte. O deploy no fim.",
      hint: [
        "Oeste EC2, leste S3, norte RDS. Lambda fica depois do banco.",
        "João liga console. Vini arrota firewall e faz a query da Lambda.",
        "RDS sobe com JOIN. A ponte pede os quatro. No boss: BUILD, TEST, DEPLOY."
      ],
      objectives: [
        { flag: "talk_l4", text: "Ouça o Mestre na nuvem" },
        { flag: "svc_ec2", text: "Ative o EC2" },
        { flag: "svc_s3", text: "Ative o S3" },
        { flag: "svc_rds", text: "Ative o RDS" },
        { flag: "svc_lambda", text: "Ative a Lambda" },
        { flag: "bridge", text: "Libere a ponte" },
        { flag: "boss4", text: "Derrote o Downtime e faça o deploy" }
      ],
      rooms: {
        nuv_hall: {
          name: "Saguão da Nuvem",
          grid: makeGrid({ n: true, paint: function (g) {
            function pit(x0, x1, y0, y1) {
              for (let y = y0; y <= y1; y++) {
                for (let x = x0; x <= x1; x++) {
                  if (g[y][x] === ".") g[y][x] = "v";
                }
              }
            }
            pit(3, 6, 2, 5);
            pit(13, 16, 2, 3);
            pit(12, 16, 11, 12);
          } }),
          exits: { n: "nuv_hub" },
          spawns: { vini: [4, 10], joao: [14, 10] },
          entities: [
            { type: "npc", id: "npc_master4", sprite: "master", name: "MESTRE", short: "MESTRE", color: "#e7b2c8", x: 7, y: 8, auto: true, flag: "talk_l4",
              lines: [
                "A nuvem é o último andar do sonho. Eu subi junto.",
                "EC2 a oeste, S3 a leste, RDS ao norte. Lambda fica depois do banco.",
                "João liga os consoles. Vini quebra o firewall rachado do S3 e faz a query da Lambda.",
                "No RDS, pisa no botão da esquerda. O outro fecha o da direita, e o João confirma.",
                "Com os quatro no ar, a ponte libera. O boss se chama Downtime.",
                "Na luta, o João ativa BUILD, depois TEST, depois DEPLOY, quando o pedestal acender."
              ],
              again: ["Quatro serviços, ponte, deploy. Eu cruzo os braços e confio. Quase."]
            },
            { type: "server", id: "srv0", x: 15, y: 5 }
          ]
        },
        nuv_hub: {
          name: "Mapa de Serviços",
          grid: makeGrid({ n: true, s: true, e: true, w: true }),
          exits: { n: "nuv_rds", s: "nuv_hall", e: "nuv_s3", w: "nuv_ec2" },
          entities: [
            { type: "sign", id: "sign_hub", x: 9, y: 8, name: "PLACA", lines: ["Oeste EC2. Leste S3.", "Norte RDS, e depois a Lambda.", "Sul volta pro Mestre."] },
            { type: "server", id: "srv1", x: 4, y: 4 },
            { type: "server", id: "srv2", x: 15, y: 4 },
            { type: "server", id: "srv3", x: 4, y: 11 },
            { type: "server", id: "srv4", x: 15, y: 11 }
          ]
        },
        nuv_ec2: {
          name: "Instância EC2",
          grid: makeGrid({ e: true }),
          exits: { e: "nuv_hub" },
          entities: [
            { type: "enemy", id: "bug_ec2a", kind: "bug", x: 8, y: 5, hp: 2 },
            { type: "enemy", id: "bug_ec2b", kind: "bug", x: 8, y: 9, hp: 2 },
            { type: "console", id: "con_ec2", x: 5, y: 7, who: "joao", flag: "svc_ec2", label: "EC2", needGone: ["bug_ec2a", "bug_ec2b"], deny: "EC2 recusou: ainda há bugs na instância." },
            { type: "sign", id: "sign_ec2", x: 5, y: 4, name: "PLACA", lines: ["Limpa os bugs. Aí o João aperta E no console."] }
          ]
        },
        nuv_s3: {
          name: "Bucket S3",
          grid: makeGrid({ w: true, paint: function (g) { crackCol(g, 10); } }),
          exits: { w: "nuv_hub" },
          entities: [
            { type: "console", id: "con_s3", x: 14, y: 7, who: "joao", flag: "svc_s3", label: "S3", needFlags: ["crack_nuv_s3"], deny: "O firewall rachado ainda está de pé." },
            { type: "sign", id: "sign_s3", x: 5, y: 4, name: "PLACA", lines: ["Firewall rachado no meio da sala.", "Vini arrota de frente. João liga o bucket."] }
          ]
        },
        nuv_rds: {
          name: "Banco RDS",
          grid: makeGrid({ n: true, s: true }),
          exits: { n: "nuv_lambda", s: "nuv_hub" },
          entities: [
            { type: "plate", id: "rds_a", x: 8, y: 7, pair: "rds", latch: "rds_join" },
            { type: "plate", id: "rds_b", x: 9, y: 7, pair: "rds", latch: "rds_join" },
            { type: "console", id: "con_rds", x: 9, y: 4, who: "joao", flag: "svc_rds", label: "RDS", needFlags: ["rds_join"], deny: "RDS recusou: faltam as duas conexões." },
            { type: "sign", id: "sign_rds", x: 9, y: 10, name: "PLACA", lines: ["Pisa no botão da esquerda. O outro cobre o da direita.", "Aí o João aperta E no console."] }
          ]
        },
        nuv_lambda: {
          name: "Lambda",
          grid: makeGrid({ n: true, s: true }),
          exits: { n: "nuv_bridge", s: "nuv_rds" },
          entities: [
            { type: "terminal", id: "term_lambda", x: 9, y: 7, who: "vini", flag: "svc_lambda",
              title: "LAMBDA",
              intro: "eventos (tipo, ativo): deploy/true, bug/true, login/false.",
              question: "Qual query dispara a função?",
              options: [
                "SELECT * FROM eventos;",
                "SELECT tipo FROM eventos WHERE tipo = 'deploy' AND ativo = true;",
                "UPDATE eventos SET ativo = false;",
                "DROP DATABASE lifemed;"
              ],
              answer: 1,
              wrong: "A função não disparou. Lê o WHERE de novo."
            },
            { type: "door", id: "door_lambda", side: "n", flag: "svc_lambda" },
            { type: "sign", id: "sign_lmb", x: 4, y: 5, name: "PLACA", lines: ["Vini no terminal. A Lambda só ouve deploy ativo."] }
          ]
        },
        nuv_bridge: {
          name: "Ponte do Deploy",
          grid: makeGrid({ n: true, s: true, paint: chasm }),
          exits: { n: "boss4", s: "nuv_lambda" },
          entities: [
            { type: "lever", id: "lev_bridge", x: 9, y: 10, who: "joao", flag: "bridge", needFlags: ["svc_ec2", "svc_s3", "svc_rds", "svc_lambda"] },
            { type: "npc", id: "npc_pandora4", sprite: "pandora", name: "PANDORA", short: "PANDORA", color: "#ffe08a", x: 4, y: 11, auto: true, heal: "full",
              lines: ["Última cura antes do Downtime.", "A ponte só existe se os quatro serviços conversam."],
              again: ["Ainda dá tempo de colar o coração. A ponte não espera, mas eu espero."]
            },
            { type: "sign", id: "sign_br", x: 14, y: 10, name: "PLACA", lines: ["João puxa a alavanca com E quando EC2, S3, RDS e Lambda estiverem no ar."] }
          ]
        },
        boss4: {
          name: "Sala do Deploy",
          grid: makeGrid({ s: true }),
          exits: { s: "nuv_bridge" },
          boss: true,
          intro: [{ name: "DOWNTIME", text: "Produção caiu. De novo. E o standup é o de vocês." }],
          victory: [
            { name: "MESTRE", sprite: "master", text: "DEPLOY 200 OK. A nuvem ficou verde." },
            { name: "PANDORA", sprite: "pandora", text: "Podem acordar. Eu fico no sonho, de plantão." },
            { name: "MESTRE", sprite: "master", text: "Encosta no portal. O despertador da Lifemed já tocou." }
          ],
          entities: [
            { type: "boss", id: "boss_down", kind: "downtime", label: "DOWNTIME", x: 9, y: 6, hp: 3, setsFlag: "boss4" },
            { type: "pad", id: "pad_build", x: 4, y: 4, label: "BUILD", order: 0 },
            { type: "pad", id: "pad_test", x: 15, y: 4, label: "TEST", order: 1 },
            { type: "pad", id: "pad_deploy", x: 9, y: 10, label: "DEPLOY", order: 2 },
            { type: "door", id: "seal4", side: "s", seal: "boss4" },
            { type: "portal", id: "port4", x: 9, y: 8, flag: "boss4" },
            { type: "sign", id: "sign_down", x: 3, y: 12, name: "PLACA", lines: ["O pedestal aceso é o da vez: BUILD, TEST, DEPLOY.", "João aperta E nele. Peido limpa os bugs pequenos."] }
          ]
        }
      }
    }
  ];

  globalThis.VMJ = {
    levels: levels,
    evalPipes: evalPipes,
    pipeMask: pipeMask
  };
})();
