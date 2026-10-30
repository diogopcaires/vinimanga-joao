(function () {
  const THEMES = {
    forest: {
      grassA: "#2f6d34", grassB: "#276028",
      pathA: "#8d8474", pathB: "#6f675c",
      wall: "#5c5348", wallLit: "#8a8070", wallDark: "#2c2822",
      void: "#0c1610", flower: true
    },
    crypt: {
      grassA: "#3a3158", grassB: "#2e2748",
      pathA: "#463c66", pathB: "#3a3158",
      wall: "#241c38", wallLit: "#6a5a90", wallDark: "#120c20",
      void: "#100818", flower: false
    },
    tower: {
      grassA: "#6d6458", grassB: "#5c554c",
      pathA: "#7a7164", pathB: "#655c52",
      wall: "#3e4a62", wallLit: "#8ea0be", wallDark: "#242c3e",
      void: "#161c2a", flower: false
    },
    cloud: {
      grassA: "#1a1440", grassB: "#141033",
      pathA: "#221a52", pathB: "#1a1440",
      wall: "#24185a", wallLit: "#3de0ff", wallDark: "#0a0618",
      void: "#070414", flower: false, neon: true
    }
  };

  const GLYPH = {
    A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
    B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
    C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
    D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
    E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
    F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
    G: ["01110", "10001", "10000", "10111", "10001", "10001", "01110"],
    H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
    I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
    J: ["00111", "00010", "00010", "00010", "10010", "10010", "01100"],
    K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
    L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
    M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
    N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
    O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
    P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
    Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
    R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
    S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
    T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
    U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
    V: ["10001", "10001", "10001", "10001", "01010", "01010", "00100"],
    W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
    X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
    Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
    Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"]
  };

  function textWidth(s, scale) {
    let w = 0;
    for (const ch of s) w += (ch === " " ? 4 : 6) * scale;
    return w;
  }

  function blit(ctx, s, x, y, color, scale) {
    ctx.fillStyle = color;
    let cx = x;
    for (const ch of s) {
      if (ch === " ") { cx += 4 * scale; continue; }
      const g = GLYPH[ch];
      if (!g) { cx += 6 * scale; continue; }
      for (let row = 0; row < g.length; row++) {
        for (let col = 0; col < 5; col++) {
          if (g[row][col] === "1") ctx.fillRect(cx + col * scale, y + row * scale, scale, scale);
        }
      }
      cx += 6 * scale;
    }
  }

  function centerBlit(ctx, s, y, color, scale) {
    const x = Math.round((320 - textWidth(s, scale)) / 2);
    blit(ctx, s, x + scale, y + scale, "#000", scale);
    blit(ctx, s, x, y, color, scale);
  }

  function hash(x, y) {
    return ((x * 73856093) ^ (y * 19349663)) >>> 0;
  }

  function shadow(ctx, x, y, w) {
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(Math.round(x - w / 2), Math.round(y + 2), w, 3);
  }

  const SPRITE_NAMES = [
    "vini_down", "vini_up", "vini_side",
    "vini_down_walk", "vini_up_walk", "vini_side_walk",
    "vini_down_fart", "vini_up_fart", "vini_side_fart",
    "vini_down_burp", "vini_up_burp", "vini_side_burp",
    "joao_down", "joao_up", "joao_side",
    "joao_down_walk", "joao_up_walk", "joao_side_walk",
    "joao_down_bat", "joao_up_bat", "joao_side_bat",
    "joao_down_bike", "joao_up_bike", "joao_side_bike",
    "npc_master", "npc_frontend", "npc_priest", "npc_warrior", "npc_pandora", "npc_sqlmaster",
    "item_lamp", "item_console", "item_crate", "item_crate_metal", "item_server", "item_bug", "item_railing"
  ];
  const spriteImg = {};
  if (typeof Image !== "undefined") {
    SPRITE_NAMES.forEach(function (name) {
      const img = new Image();
      img.src = "sprites/" + name + ".png";
      spriteImg[name] = img;
    });
  }

  function spriteReady(name) {
    const img = spriteImg[name];
    return !!(img && img.complete && img.naturalWidth);
  }

  function paintSprite(ctx, name, x, y, h, flip) {
    const img = spriteImg[name];
    if (!spriteReady(name)) return false;
    const dh = Math.max(1, Math.round(h));
    const dw = Math.max(1, Math.round(img.naturalWidth * (dh / img.naturalHeight)));
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(x), Math.round(y));
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(img, -Math.round(dw / 2), -dh, dw, dh);
    ctx.restore();
    return true;
  }

  function poseSprite(base, frame, attack) {
    if (attack) {
      const hit = base + "_" + attack;
      if (spriteReady(hit)) return hit;
    }
    if (frame) {
      const walk = base + "_walk";
      if (spriteReady(walk)) return walk;
    }
    return base;
  }

  function poseHeight(base, attack) {
    if (attack === "burp") return Math.round(base * 1.34);
    if (attack === "bat") return Math.round(base * 1.22);
    if (attack === "bike") return Math.round(base * 1.55);
    if (attack === "fart") return Math.round(base * 1.08);
    return base;
  }

  function paintSpriteBox(ctx, name, x, y, dw, dh) {
    const img = spriteImg[name];
    if (!spriteReady(name)) return false;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, Math.round(x - dw / 2), Math.round(y - dh), Math.round(dw), Math.round(dh));
    ctx.restore();
    return true;
  }

  function footShadow(ctx, x, y, w) {
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(Math.round(x - w / 2), Math.round(y + 1), w, 3);
  }

  function at(grid, x, y) {
    if (y < 0 || x < 0 || y >= grid.length || x >= grid[0].length) return "#";
    return grid[y][x];
  }

  function canWalk(ch, flags, roomId) {
    if (ch === "." || ch === ",") return true;
    if (ch === "=" && flags.bridge) return true;
    if (ch === "+" && flags["crack_" + roomId]) return true;
    if (ch === "l" && flags.laser_off) return true;
    return false;
  }

  function stageLook(themeName) {
    const packs = {
      forest: {
        sky: ["#083028", "#06241c", "#041612", "#020c0a"],
        tower: ["#0c2420", "#10302a"],
        win: ["#34d399", "#fbbf24", "#5eead4"],
        neon: "#34d399", neon2: "#f472b6",
        haze: "rgba(8,60,48,0.45)",
        deck: "#1f4d40", deckAlt: "#184438", deckDim: "#12362c", deckDim2: "#0e2c24",
        deckHi: "#6ee7b7", deckLo: "#082018", seam: "#061810", bolt: "#a7f3d0",
        grate: "#0c241c", grateLine: "#16483a",
        face: "#071410", faceWin: "#14523c", faceLo: "#030a08",
        rail: "#f97316", railHi: "#ffedd5", railPost: "#7c2d12",
        lamp: "#fbbf24", crack: "#052e24", crackHot: "#34d399"
      },
      crypt: {
        sky: ["#2a1048", "#160824", "#0c0616", "#06030c"],
        tower: ["#2a1248", "#1a0c30"],
        win: ["#e879f9", "#fb7185", "#fbbf24"],
        neon: "#e879f9", neon2: "#fb7185",
        haze: "rgba(60,16,80,0.4)",
        deck: "#3a2a58", deckAlt: "#322450", deckDim: "#281c44", deckDim2: "#201638",
        deckHi: "#f0abfc", deckLo: "#140c24", seam: "#10081c", bolt: "#e9d5ff",
        grate: "#1c1234", grateLine: "#3b2460",
        face: "#100818", faceWin: "#4c1d6a", faceLo: "#080410",
        rail: "#fb7185", railHi: "#ffe4e6", railPost: "#881337",
        lamp: "#fbbf24", crack: "#3b0764", crackHot: "#e879f9"
      },
      tower: {
        sky: ["#172554", "#0f172a", "#0b1020", "#060814"],
        tower: ["#172554", "#1e293b"],
        win: ["#38bdf8", "#22d3ee", "#fbbf24"],
        neon: "#38bdf8", neon2: "#e879f9",
        haze: "rgba(16,40,80,0.4)",
        deck: "#2c3d58", deckAlt: "#263650", deckDim: "#1e2c42", deckDim2: "#182436",
        deckHi: "#7dd3fc", deckLo: "#0c1424", seam: "#0a1020", bolt: "#e0f2fe",
        grate: "#141e30", grateLine: "#24344c",
        face: "#0c1424", faceWin: "#1d4ed8", faceLo: "#060a14",
        rail: "#f97316", railHi: "#ffedd5", railPost: "#9a3412",
        lamp: "#fbbf24", crack: "#1e3a8a", crackHot: "#38bdf8"
      },
      cloud: {
        sky: ["#2a1258", "#16082e", "#0c0618", "#06030e"],
        tower: ["#1a1040", "#241450"],
        win: ["#22d3ee", "#f472b6", "#fbbf24"],
        neon: "#22d3ee", neon2: "#e879f9",
        haze: "rgba(48,16,90,0.42)",
        deck: "#3c4a66", deckAlt: "#34405a", deckDim: "#2a344c", deckDim2: "#222a40",
        deckHi: "#a5f3fc", deckLo: "#121826", seam: "#101624", bolt: "#e2e8f0",
        grate: "#1a2234", grateLine: "#2e3a52",
        face: "#121826", faceWin: "#1e3a5f", faceLo: "#080c16",
        rail: "#f97316", railHi: "#ffedd5", railPost: "#9a3412",
        lamp: "#fbbf24", crack: "#4c1d95", crackHot: "#e879f9"
      }
    };
    return packs[themeName] || packs.forest;
  }

  function drawSkyline(ctx, time, themeName) {
    const look = stageLook(themeName);
    for (let y = 0; y < 240; y++) {
      const band = y < 40 ? 0 : y < 110 ? 1 : y < 180 ? 2 : 3;
      ctx.fillStyle = look.sky[band];
      ctx.fillRect(0, y, 320, 1);
    }
    for (let i = 0; i < 10; i++) {
      const x = (i * 34 + hash(i, 7) % 10) % 316;
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = i % 2 ? look.neon : look.neon2;
      ctx.fillRect(x, 70, 2, 170);
      ctx.globalAlpha = 1;
    }
    for (let i = 0; i < 22; i++) {
      const w = 12 + hash(i, 1) % 22;
      const x = (i * 15 + hash(i, 3) % 9) % (318 - w);
      const h = 48 + hash(i, 5) % 160;
      const top = 240 - h;
      ctx.fillStyle = i % 2 ? look.tower[0] : look.tower[1];
      ctx.fillRect(x, top, w, h);
      ctx.fillStyle = i % 3 ? look.neon : look.neon2;
      ctx.fillRect(x, top, w, 2);
      if (hash(i, 8) % 3 === 0) {
        ctx.fillStyle = look.neon2;
        ctx.fillRect(x + w - 3, top - 10, 2, 10);
        ctx.fillRect(x + w - 6, top - 4, 6, 2);
      }
      for (let wy = top + 6; wy < 232; wy += 5) {
        for (let wx = 2; wx < w - 3; wx += 4) {
          const lit = (hash(i + wx, wy) + (time * 3 | 0)) % 5 !== 0;
          ctx.globalAlpha = lit ? 0.95 : 0.18;
          ctx.fillStyle = look.win[(hash(i, wy) + wx) % 3];
          ctx.fillRect(x + wx, wy, 2, 2);
          ctx.globalAlpha = 1;
        }
      }
    }
    ctx.fillStyle = look.haze;
    ctx.fillRect(0, 188, 320, 52);
  }

  function drawDeck(ctx, px, py, x, y, look, kind, hsh) {
    const side = kind === "side";
    const lane = kind === "lane";
    const checker = ((x >> 1) + (y >> 1)) % 2 === 0;
    let fill = side ? (checker ? look.deckDim2 : look.deckDim) : (checker ? look.deckAlt : look.deck);
    if (lane) fill = look.deck;
    ctx.fillStyle = fill;
    ctx.fillRect(px, py, 16, 16);
    if (y % 2 === 0) {
      ctx.fillStyle = look.deckHi;
      ctx.globalAlpha = lane ? 0.85 : 0.4;
      ctx.fillRect(px, py, 16, 1);
      ctx.globalAlpha = 1;
    }
    if (x % 2 === 0) {
      ctx.fillStyle = look.deckHi;
      ctx.globalAlpha = 0.35;
      ctx.fillRect(px, py, 1, 16);
      ctx.globalAlpha = 1;
    }
    if (x % 2 === 1) {
      ctx.fillStyle = look.seam;
      ctx.fillRect(px + 15, py, 1, 16);
    }
    if (y % 2 === 1) {
      ctx.fillStyle = look.deckLo;
      ctx.fillRect(px, py + 15, 16, 1);
    }
    if (x % 2 === 0 && y % 2 === 0) {
      ctx.fillStyle = look.bolt;
      ctx.fillRect(px + 2, py + 2, 1, 1);
      ctx.fillRect(px + 3, py + 2, 1, 1);
    }
    if (side && hsh % 5 === 0) {
      ctx.fillStyle = look.grate;
      ctx.fillRect(px + 3, py + 4, 10, 8);
      ctx.fillStyle = look.grateLine;
      ctx.fillRect(px + 4, py + 5, 8, 1);
      ctx.fillRect(px + 4, py + 8, 8, 1);
    }
    if (lane && x >= 8 && x <= 11 && y % 2 === 0) {
      ctx.fillStyle = look.neon;
      ctx.globalAlpha = 0.35;
      ctx.fillRect(px + 7, py + 4, 2, 8);
      ctx.globalAlpha = 1;
    }
  }

  function drawCatwalk(ctx, px, py, look) {
    ctx.fillStyle = look.face;
    ctx.fillRect(px + 1, py + 3, 14, 10);
    ctx.fillStyle = look.deck;
    ctx.fillRect(px + 2, py + 5, 12, 6);
    ctx.fillStyle = look.rail;
    ctx.fillRect(px, py + 3, 16, 2);
    ctx.fillRect(px, py + 11, 16, 2);
    ctx.fillStyle = look.railHi;
    ctx.fillRect(px, py + 3, 16, 1);
    ctx.fillRect(px, py + 11, 16, 1);
    ctx.fillStyle = look.neon;
    ctx.fillRect(px, py + 5, 2, 6);
    ctx.fillRect(px + 14, py + 5, 2, 6);
  }

  function drawRail(ctx, px, py, look, pulse) {
    ctx.fillStyle = look.railPost;
    ctx.fillRect(px + 1, py + 11, 2, 5);
    ctx.fillRect(px + 13, py + 11, 2, 5);
    ctx.fillStyle = pulse ? look.railHi : look.rail;
    ctx.fillRect(px, py + 9, 16, 2);
    ctx.fillStyle = look.railHi;
    ctx.fillRect(px, py + 9, 16, 1);
  }

  function drawFascia(ctx, px, py, look) {
    ctx.fillStyle = look.face;
    ctx.fillRect(px, py, 16, 11);
    ctx.fillStyle = look.neon;
    ctx.fillRect(px, py, 16, 1);
    ctx.fillStyle = look.faceWin;
    ctx.fillRect(px + 2, py + 3, 4, 4);
    ctx.fillRect(px + 10, py + 3, 4, 4);
    ctx.fillStyle = look.faceLo;
    ctx.fillRect(px, py + 9, 16, 2);
    ctx.fillStyle = look.neon2;
    ctx.globalAlpha = 0.7;
    ctx.fillRect(px + 3, py + 4, 2, 2);
    ctx.globalAlpha = 1;
  }

  function drawLampPost(ctx, px, py, time, look) {
    ctx.fillStyle = "#070b14";
    ctx.fillRect(px + 6, py - 16, 4, 30);
    ctx.fillStyle = look.face;
    ctx.fillRect(px + 7, py - 15, 2, 28);
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(px + 2, py - 20, 12, 7);
    ctx.fillStyle = (time * 3 | 0) % 2 ? "#fff7d6" : look.lamp;
    ctx.fillRect(px + 3, py - 18, 10, 4);
    ctx.fillStyle = "#fff";
    ctx.fillRect(px + 6, py - 17, 3, 2);
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = look.lamp;
    ctx.fillRect(px, py - 22, 16, 14);
    ctx.globalAlpha = 1;
  }

  function drawStage(ctx, grid, themeName, flags, roomId, time) {
    const look = stageLook(themeName);
    const crackOpen = !!flags["crack_" + roomId];
    const laserOff = !!flags.laser_off;
    const bridge = !!flags.bridge;
    const pulse = ((time * 2) | 0) % 2 === 0;
    drawSkyline(ctx, time, themeName);
    const walk = function (x, y) { return canWalk(at(grid, x, y), flags, roomId); };
    const voidAt = function (x, y) {
      const ch = at(grid, x, y);
      if (ch === "#" || ch === "v" || ch === "~") return true;
      if (ch === "=" && !bridge) return true;
      return false;
    };
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        const ch = grid[y][x];
        const px = x * 16;
        const py = y * 16;
        const hsh = hash(x, y);
        if (ch === "=" && bridge) {
          drawCatwalk(ctx, px, py, look);
          continue;
        }
        if (ch === "=" && !bridge) {
          ctx.fillStyle = look.railPost;
          ctx.fillRect(px, py + 6, 5, 3);
          ctx.fillRect(px + 11, py + 6, 5, 3);
          continue;
        }
        if (ch === "+" && !crackOpen) {
          ctx.fillStyle = look.crack;
          ctx.fillRect(px, py, 16, 16);
          ctx.fillStyle = look.crackHot;
          for (let i = 0; i < 16; i += 4) ctx.fillRect(px + ((i + y) % 8 < 4 ? i : i), py, 2, 16);
          ctx.fillStyle = pulse ? "#fff" : look.crackHot;
          ctx.fillRect(px + 7, py, 2, 16);
          continue;
        }
        if (ch === "l" && !laserOff) {
          ctx.fillStyle = "rgba(255,30,70,0.28)";
          ctx.fillRect(px + 3, py, 10, 16);
          ctx.fillStyle = pulse ? "#ffe4e6" : "#ff2255";
          ctx.fillRect(px + 6, py, 4, 16);
          ctx.fillStyle = "#fff";
          ctx.fillRect(px + 7, py, 2, 16);
          continue;
        }
        if (!walk(x, y)) continue;
        const lane = ch === "." && ((x >= 8 && x <= 11) || (y >= 6 && y <= 8));
        const kind = ch === "," ? "side" : (lane ? "lane" : "deck");
        drawDeck(ctx, px, py, x, y, look, kind, hsh);
        ctx.fillStyle = "#05070f";
        if (!walk(x, y - 1)) ctx.fillRect(px, py, 16, 1);
        if (!walk(x - 1, y)) ctx.fillRect(px, py, 1, 16);
        if (!walk(x + 1, y)) ctx.fillRect(px + 15, py, 1, 16);
        if (!walk(x, y + 1)) {
          drawRail(ctx, px, py, look, pulse);
          if (voidAt(x, y + 1)) drawFascia(ctx, px, py + 16, look);
        }
        if (!walk(x - 1, y)) {
          ctx.fillStyle = look.neon;
          ctx.fillRect(px, py, 2, 16);
          if (voidAt(x - 1, y)) {
            ctx.fillStyle = look.face;
            ctx.fillRect(px - 5, py + 2, 5, 12);
            ctx.fillStyle = look.neon2;
            ctx.fillRect(px - 5, py + 2, 5, 1);
          }
        }
        if (!walk(x + 1, y)) {
          ctx.fillStyle = look.neon2;
          ctx.fillRect(px + 14, py, 2, 16);
          if (voidAt(x + 1, y)) {
            ctx.fillStyle = look.face;
            ctx.fillRect(px + 16, py + 2, 5, 12);
            ctx.fillStyle = look.neon;
            ctx.fillRect(px + 16, py + 2, 5, 1);
          }
        }
        if (!walk(x, y - 1) && voidAt(x, y - 1)) {
          ctx.fillStyle = look.neon;
          ctx.globalAlpha = pulse ? 0.95 : 0.55;
          ctx.fillRect(px, py, 16, 2);
          ctx.globalAlpha = 1;
        }
        const edgeL = !walk(x - 1, y) && walk(x, y + 1) && walk(x, y - 1);
        const edgeR = !walk(x + 1, y) && walk(x, y + 1) && walk(x, y - 1);
        if ((edgeL || edgeR) && y % 4 === 2 && y > 2 && y < 12 && hsh % 2 === 0) {
          drawLampPost(ctx, px, py, time, look);
        }
        if (ch === "," && !walk(x, y + 1) && hsh % 2 === 0) {
          ctx.fillStyle = "#14532d";
          ctx.fillRect(px + 5, py + 6, 2, 4);
          ctx.fillStyle = "#4ade80";
          ctx.fillRect(px + 3, py + 4, 6, 3);
          ctx.fillStyle = "#86efac";
          ctx.fillRect(px + 4, py + 3, 2, 2);
        }
      }
    }
    const marks = themeName === "cloud"
      ? [["EC2", 8, 28, look.neon], ["S3", 286, 28, look.neon2], ["RDS", 8, 120, "#a5f3fc"], ["LMB", 280, 120, "#e9d5ff"]]
      : themeName === "forest"
        ? [["BOSQUE", 8, 28, look.neon]]
        : themeName === "crypt"
          ? [["SQL", 8, 28, look.neon]]
          : [["TORRE", 8, 28, look.neon]];
    if (themeName === "cloud" && roomId === "boss4") marks.push(["DEPLOY", 188, 18, look.neon2]);
    for (let i = 0; i < marks.length; i++) {
      const m = marks[i];
      const w = m[0].length * 6 + 8;
      ctx.fillStyle = "#070b16";
      ctx.fillRect(m[1], m[2], w, 13);
      ctx.fillStyle = m[3];
      ctx.fillRect(m[1], m[2], w, 1);
      ctx.fillRect(m[1], m[2] + 12, w, 1);
      ctx.fillRect(m[1], m[2], 1, 13);
      ctx.fillRect(m[1] + w - 1, m[2], 1, 13);
      blit(ctx, m[0], m[1] + 4, m[2] + 3, m[3], 1);
    }
  }

  function tilemap(ctx, grid, themeName, flags, roomId, time) {
    drawStage(ctx, grid, themeName, flags, roomId, time);
  }

  function stamp(ctx, rows, pal, footX, footY) {
    const y0 = Math.round(footY - rows.length);
    for (let y = 0; y < rows.length; y++) {
      const row = rows[y];
      const x0 = Math.round(footX - row.length / 2);
      for (let x = 0; x < row.length; x++) {
        const col = pal[row[x]];
        if (!col) continue;
        ctx.fillStyle = col;
        ctx.fillRect(x0 + x, y0 + y, 1, 1);
      }
    }
  }

  function stepped(rows, frame) {
    if (!frame) return rows;
    const out = rows.slice();
    const a = out.length - 1;
    const b = a - 1;
    if (a < 1) return out;
    out[a] = out[a].slice(1) + ".";
    out[b] = "." + out[b].slice(0, -1);
    return out;
  }

  const VINI_PAL = {
    o: "#120c14",
    k: "#24140c",
    K: "#4a2818",
    i: "#f0a0b4",
    s: "#f3c4a4",
    d: "#d09870",
    e: "#24140c",
    w: "#f8fafc",
    b: "#120c14",
    m: "#c06058",
    u: "#5b21b6",
    U: "#7c3aed",
    h: "#3b0764",
    t: "#f5f3ff",
    l: "#312e81",
    L: "#4338ca",
    p: "#1e3a5f",
    P: "#60a5fa",
    g: "#f8fafc",
    n: "#0f172a",
    a: "#e8b090"
  };

  const VINI_FRONT = [
    "........ok..ko........",
    ".......oki..iko.......",
    "......okkkkkkkko......",
    ".......okKKKKko.......",
    "........osssso........",
    ".......osddddso.......",
    "......osewwwweso......",
    "......oswbwwbwso......",
    ".......osdmmso........",
    "........ossso.........",
    ".....opuuuuuuuupo.....",
    "....opuuUttUUuuupo....",
    "....opauuuuuuuuapo....",
    ".....ohhhhhhhhho......",
    "......olLLLLLLlo......",
    "......oll....llo......",
    "......oll....llo......",
    "......ogn....ngo......"
  ];

  const VINI_BACK = [
    "........ok..ko........",
    "......okkkkkkkko......",
    ".......okKKKKko.......",
    "......okkkkkkkko......",
    ".....opPPPPPPPPpo.....",
    "....opPPPPPPPPPPpo....",
    "....opuuuuuuuuuupo....",
    ".....ohhhhhhhhho......",
    "......olLLLLLLlo......",
    "......oll....llo......",
    "......oll....llo......",
    "......ogn....ngo......"
  ];

  const VINI_SIDE = [
    "......okko........",
    ".....okiiko.......",
    "....okkkkkko......",
    ".....okKKko.......",
    "......ossso.......",
    ".....osebso.......",
    ".....osmso........",
    "....opuuuupo......",
    "...oPuuUtuupo.....",
    "...oPuuuuuupo.....",
    "....ohhhhho.......",
    ".....olllo........",
    ".....ol.lo........",
    ".....og.no........"
  ];

  const JOAO_PAL = {
    o: "#120c14",
    k: "#1a120e",
    K: "#3a2418",
    s: "#c4845c",
    d: "#8d5a3c",
    H: "#e0a070",
    w: "#f8fafc",
    W: "#e2e8f0",
    e: "#1a120e",
    b: "#120c14",
    m: "#7a4038",
    y: "#eab308",
    Y: "#fde68a",
    c: "#22d3ee",
    C: "#cffafe",
    p: "#1e293b",
    n: "#0f172a",
    g: "#f8fafc",
    a: "#a86b48"
  };

  const JOAO_FRONT = [
    ".......okkkkkko.......",
    "......okKKKKKko.......",
    "......osssssssso......",
    ".....osHddddddHso.....",
    "....osebwwwwwwbeso....",
    "....oswbwwwwwwbwso....",
    ".....osdmmmmmmdso.....",
    "......osddddddso......",
    "...oyowwwwwwwwwwyo....",
    "..oyYowwwccwwwwwoYy...",
    "..oyyowwwCCcwwwwwoyy..",
    "..oaaowwwwwwwwwwwoaa..",
    "...oowWWWWWWWWWWwo....",
    "....oppppppppppppo....",
    "....opp........ppo....",
    "....opp........ppo....",
    "....ogn........ngo...."
  ];

  const JOAO_BACK = [
    ".......okkkkkko.......",
    "......okKKKKKko.......",
    ".....okkkkkkkkkko.....",
    "...oyYYYYYYYYYYYYYo...",
    "..oyYYYYYYYYYYYYYYyo..",
    "..oyyyyyyyyyyyyyyyyo..",
    "...oowwwwwwwwwwwwo....",
    "....owWWWWWWWWWWwo....",
    "....oppppppppppppo....",
    "....opp........ppo....",
    "....opp........ppo....",
    "....ogn........ngo...."
  ];

  const JOAO_SIDE = [
    ".....okko..........",
    "....okKko..........",
    "....osssso.........",
    "...osHddso.........",
    "...osebso..........",
    "...osmso...........",
    "..oyYYYyo..........",
    ".oyYwwccyo.........",
    ".oywwwwwyo.........",
    "..owWWWWyo.........",
    "...oppppo..........",
    "...op..po..........",
    "...og..no.........."
  ];

  function drawVini(ctx, x, y, dir, frame, attack) {
    const bob = frame ? -1 : 0;
    const name = dir === "up" ? "vini_up" : (dir === "left" || dir === "right" ? "vini_side" : "vini_down");
    if (spriteReady(name)) {
      footShadow(ctx, x, y + 6, 18);
      paintSprite(ctx, poseSprite(name, frame, attack || ""), x, y + 6, poseHeight(38, attack || ""), dir === "left");
      return;
    }
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y + 6));
    if (dir === "left") ctx.scale(-1, 1);
    ctx.scale(2, 2);
    shadow(ctx, 0, 1, 12);
    ctx.translate(0, bob);
    const rows = dir === "up" ? VINI_BACK : (dir === "left" || dir === "right" ? VINI_SIDE : VINI_FRONT);
    stamp(ctx, stepped(rows, frame), VINI_PAL, 0, 0);
    ctx.restore();
  }

  function drawBat(ctx, swinging, bob) {
    ctx.fillStyle = "#155e75";
    if (swinging) {
      ctx.fillRect(10, -20 + bob, 16, 4);
      ctx.fillRect(24, -22 + bob, 3, 8);
      ctx.fillStyle = "#e0f2fe";
      ctx.fillRect(12, -19 + bob, 12, 2);
    } else {
      ctx.fillRect(10, -18 + bob, 3, 14);
      ctx.fillRect(8, -20 + bob, 8, 3);
      ctx.fillStyle = "#a5f3fc";
      ctx.fillRect(11, -16 + bob, 1, 8);
    }
  }

  function drawJoao(ctx, x, y, dir, frame, swinging, biking) {
    const bob = frame ? -1 : 0;
    const name = dir === "up" ? "joao_up" : (dir === "left" || dir === "right" ? "joao_side" : "joao_down");
    const attack = biking ? "bike" : (swinging ? "bat" : "");
    if (spriteReady(name)) {
      const spr = poseSprite(name, biking ? 0 : frame, attack);
      const img = spriteImg[spr];
      const h = biking && img ? Math.round(img.naturalHeight * 0.5) : poseHeight(42, attack);
      footShadow(ctx, x, y + 7, biking ? 28 : 20);
      paintSprite(ctx, spr, x, y + 7, h, dir === "left");
      return;
    }
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y + 7));
    if (dir === "left") ctx.scale(-1, 1);
    ctx.scale(2, 2);
    shadow(ctx, 0, 1, 14);
    ctx.translate(0, bob);
    const rows = dir === "up" ? JOAO_BACK : (dir === "left" || dir === "right" ? JOAO_SIDE : JOAO_FRONT);
    stamp(ctx, stepped(rows, frame), JOAO_PAL, 0, 0);
    if (!biking) drawBat(ctx, swinging, 0);
    ctx.restore();
  }

  const NPC_PAL = {
    o: "#140c18",
    s: "#f0c4a4",
    d: "#c48b6a",
    k: "#1a120e",
    K: "#3a2418",
    i: "#fda4af",
    w: "#f8fafc",
    b: "#1a120e",
    m: "#a85a4a",
    r: "#9f1239",
    R: "#e11d48",
    g: "#d6d3d1",
    G: "#a8a29e",
    p: "#fb7185",
    P: "#ffc2d4",
    n: "#1e1b4b",
    y: "#fbbf24",
    c: "#e7d5b0",
    C: "#f5edd8",
    h: "#fde68a",
    a: "#3b82f6",
    u: "#0f172a",
    f: "#f8fafc",
    e: "#94a3b8",
    q: "#c4a574",
    Q: "#f3efe4",
    z: "#8a5a32"
  };

  const NPC_MASTER = [
    "......okkkko......",
    ".....okKKKKko.....",
    "......osssso......",
    ".....osewwbeso....",
    ".....oswbwwbso....",
    "......osmmso......",
    "....orrrrrrrro....",
    "...orRRRRRRRRRo...",
    "...orrrrrrrrrro...",
    "....ohhhhhhhho....",
    ".....onnnnnno.....",
    ".....onn...nno....",
    ".....ogg...ggo...."
  ];

  const NPC_FRONT = [
    "......okkkko......",
    ".....okKKKKko.....",
    "....oeeeeeeeeo....",
    "....osebwwbeso....",
    ".....osbwwbso.....",
    "......okmmko......",
    "....ouuuuuuuuo....",
    "...ouuuuuuuuuuo...",
    "...oauuuuuuuuao...",
    "....ohhhhhhhho....",
    ".....onnnnnno.....",
    ".....onn...nno....",
    ".....ogg...ggo...."
  ];

  const NPC_PRIEST = [
    "......okkkko......",
    "....osggggggso....",
    "...osggggggggso...",
    "....oswbwwbwso....",
    "....ogggmmgggo....",
    "...oRRRRRRRRRRo...",
    "..oRRRRRRRRRRRRo..",
    "..oRRRRRRRRRRRRo..",
    "...oRRRRRRRRRRo...",
    ".....onnnnnno.....",
    ".....onn...nno....",
    ".....ogg...ggo...."
  ];

  const NPC_WARRIOR = [
    ".....op....po.....",
    "....opPi..iPpo....",
    "....oppppppppo....",
    ".....osssssso.....",
    "....oswbwwbwso....",
    "....ospmmmmmpso...",
    "...oppppppppppo...",
    "..opPPPPPPPPPPpo..",
    "..oppppppppppppo..",
    "...oppppppppppo...",
    ".....onnnnnno.....",
    ".....onn...nno....",
    ".....ogg...ggo...."
  ];

  const NPC_PANDORA = [
    ".......hhhh.......",
    "......hh..hh......",
    ".....okkkkkko.....",
    "....okKKKKKKko....",
    "....osssssssso....",
    "...oswbwwwwbwso...",
    "....osdmmmmso.....",
    "...oCCCCCCCCCo....",
    "..ocCCCCCCCCCCco..",
    "..ocCCCCCCCCCCco..",
    "...oCCCCCCCCCo....",
    ".....onnnnnno.....",
    ".....onn...nno...."
  ];

  const NPC_SQL = [
    "............okko......",
    "...........osssso.....",
    "..........osebwso.....",
    "..........oaaaaao.....",
    ".....oqqqqqqqqqqo.....",
    "....oqQQQQQQQQQQqo....",
    "...oqQQqqqqqqqqqqo....",
    "....ozz........zzo....",
    "....ozz........ozo...."
  ];

  function drawNpc(ctx, kind, x, y, frame) {
    const bob = frame ? -1 : 0;
    const file = "npc_" + (kind || "master");
    const tall = kind === "sqlmaster" ? 88 : 96;
    const shade = kind === "sqlmaster" ? 40 : (kind === "pandora" ? 32 : 20);
    if (spriteReady(file)) {
      footShadow(ctx, x, y + 6, shade);
      paintSprite(ctx, file, x, y + 6 + bob, tall, false);
      return;
    }
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y + 6));
    ctx.scale(2, 2);
    shadow(ctx, 0, 1, kind === "sqlmaster" ? 12 : 10);
    ctx.translate(0, bob);
    const map = {
      master: NPC_MASTER,
      frontend: NPC_FRONT,
      priest: NPC_PRIEST,
      warrior: NPC_WARRIOR,
      pandora: NPC_PANDORA,
      sqlmaster: NPC_SQL
    };
    const rows = map[kind] || NPC_MASTER;
    const pal = Object.assign({}, NPC_PAL);
    if (kind === "master") { pal.r = "#7f1d3a"; pal.R = "#be123c"; }
    if (kind === "warrior") {
      ctx.fillStyle = "#fb7185";
      ctx.fillRect(8, -16, 5, 5);
      ctx.fillStyle = "#1a120e";
      ctx.fillRect(9, -15, 3, 3);
    }
    stamp(ctx, rows, pal, 0, 0);
    if (kind === "sqlmaster") {
      ctx.strokeStyle = "#e7c56a";
      ctx.beginPath();
      ctx.moveTo(2, -16);
      ctx.lineTo(-6, -22);
      ctx.stroke();
    }
    ctx.restore();
  }

  const BUG_PAL = { o: "#140c18", r: "#e11d48", R: "#fb7185", b: "#0f172a", w: "#f8fafc", y: "#fbbf24" };
  const BUG_ROWS = [
    "..o....o..",
    ".oro..oro.",
    "orRRRRRRo.",
    "orRbwwbRo.",
    "orRRRRRRo.",
    ".orRRRRo..",
    "..oorrro..",
    "...oooo..."
  ];

  function block(ctx, x, y, w, h, fill) {
    ctx.fillStyle = "#140c18";
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
  }

  function drawBug(ctx, x, y, frame, big, phased) {
    if (spriteReady("item_bug")) {
      ctx.save();
      if (phased) ctx.globalAlpha = 0.45;
      const foot = y + (big ? 8 : 6) + (frame ? -1 : 0);
      footShadow(ctx, x, y + (big ? 8 : 6), big ? 18 : 12);
      paintSprite(ctx, "item_bug", x, foot, big ? 30 : 16, false);
      ctx.restore();
      return;
    }
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y + (big ? 10 : 6)));
    if (phased) ctx.globalAlpha = 0.45;
    const s = big ? 2 : 1;
    ctx.scale(s, s);
    shadow(ctx, 0, 0, 12);
    if (frame) ctx.translate(0, -1);
    stamp(ctx, BUG_ROWS, BUG_PAL, 0, 0);
    if (big) {
      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(-3, -12, 6, 2);
    }
    ctx.restore();
  }

  function drawBoss(ctx, e, frame) {
    const x = e.x;
    const y = e.y;
    if (e.kind === "bugrei") return drawBug(ctx, x, y, frame, true, false);
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y + 8));
    const bob = frame ? -1 : 0;
    shadow(ctx, 0, 0, 26);
    if (e.kind === "delete") {
      block(ctx, -14, -32 + bob, 28, 30, "#1e1030");
      ctx.fillStyle = "#4c1d4f";
      ctx.fillRect(-12, -30 + bob, 24, 8);
      ctx.fillStyle = "#ff2255";
      ctx.fillRect(-10, -26 + bob, 20, 4);
      ctx.fillStyle = "#fecdd3";
      ctx.fillRect(-8, -14 + bob, 16, 3);
      ctx.fillStyle = "#fb7185";
      ctx.fillRect(-6, -8 + bob, 3, 3);
      ctx.fillRect(3, -8 + bob, 3, 3);
    } else if (e.kind === "godclass") {
      block(ctx, -16, -34 + bob, 32, 32, e.expose > 0 ? "#c084fc" : "#6d28d9");
      ctx.fillStyle = "#2e1064";
      ctx.fillRect(-14, -10 + bob, 28, 6);
      ctx.fillStyle = "#f5d0fe";
      ctx.fillRect(-10, -26 + bob, 4, 4);
      ctx.fillRect(4, -26 + bob, 4, 4);
      ctx.fillRect(-3, -20 + bob, 4, 4);
      ctx.fillStyle = "#22d3ee";
      ctx.fillRect(-18, -22 + bob, 3, 10);
      ctx.fillRect(15, -18 + bob, 3, 10);
      if (e.expose > 0) {
        ctx.fillStyle = "#fef08a";
        ctx.fillRect(-4, -8 + bob, 8, 5);
      }
    } else if (e.kind === "downtime") {
      block(ctx, -14, -32 + bob, 28, 30, "#b91c1c");
      ctx.fillStyle = "#7f1d1d";
      ctx.fillRect(-16, -22 + bob, 4, 8);
      ctx.fillRect(12, -22 + bob, 4, 8);
      ctx.fillStyle = "#450a0a";
      ctx.fillRect(-6, -36 + bob, 4, 6);
      ctx.fillRect(2, -36 + bob, 4, 6);
      ctx.fillStyle = "#fef08a";
      ctx.fillRect(-8, -26 + bob, 4, 4);
      ctx.fillRect(4, -26 + bob, 4, 4);
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(-10, -16 + bob, 20, 8);
      ctx.fillStyle = frame ? "#22d3ee" : "#f97316";
      ctx.fillRect(-8, -14 + bob, 2, 2);
      ctx.fillRect(-3, -14 + bob, 2, 2);
      ctx.fillRect(2, -14 + bob, 2, 2);
      ctx.fillRect(6, -14 + bob, 2, 2);
    }
    ctx.restore();
  }

  function heartIcon(ctx, x, y, full) {
    ctx.fillStyle = full ? "#e23b4a" : "#3a2438";
    ctx.fillRect(x + 1, y, 2, 1);
    ctx.fillRect(x + 4, y, 2, 1);
    ctx.fillRect(x, y + 1, 7, 2);
    ctx.fillRect(x + 1, y + 3, 5, 1);
    ctx.fillRect(x + 2, y + 4, 3, 1);
    ctx.fillRect(x + 3, y + 5, 1, 1);
  }

  function drawPipe(ctx, e, on) {
    const mask = globalThis.VMJ.pipeMask(e);
    const x = e.x;
    const y = e.y;
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(x - 3, y - 3, 6, 6);
    ctx.fillStyle = on ? "#67e8f9" : "#155e75";
    ctx.fillRect(x - 2, y - 2, 4, 4);
    if (mask & 1) ctx.fillRect(x - 2, y - 8, 4, 8);
    if (mask & 2) ctx.fillRect(x, y - 2, 8, 4);
    if (mask & 4) ctx.fillRect(x - 2, y, 4, 8);
    if (mask & 8) ctx.fillRect(x - 8, y - 2, 8, 4);
    ctx.fillStyle = on ? "#ecfeff" : "#164e63";
    ctx.fillRect(x - 1, y - 1, 2, 2);
  }

  function drawCrate(ctx, e) {
    const name = e.kind === "metal" ? "item_crate_metal" : "item_crate";
    if (paintSprite(ctx, name, e.x, e.y + 6, 18, false)) return;
    const x = Math.round(e.x - 8);
    const y = Math.round(e.y - 10);
    ctx.fillStyle = "#140c18";
    ctx.fillRect(x - 1, y - 1, 18, 18);
    if (e.kind === "metal") {
      ctx.fillStyle = "#64748b";
      ctx.fillRect(x, y, 16, 16);
      ctx.fillStyle = "#e2e8f0";
      ctx.fillRect(x + 2, y + 2, 5, 4);
      ctx.fillStyle = "#334155";
      ctx.fillRect(x + 2, y + 8, 12, 2);
      ctx.fillStyle = "#22d3ee";
      ctx.fillRect(x + 11, y + 3, 2, 2);
    } else if (e.kind === "wood") {
      ctx.fillStyle = "#a16207";
      ctx.fillRect(x, y, 16, 16);
      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(x, y + 3, 16, 2);
      ctx.fillRect(x, y + 10, 16, 2);
      ctx.fillStyle = "#78350f";
      ctx.fillRect(x + 7, y, 2, 16);
      ctx.fillStyle = "#e7c56a";
      ctx.fillRect(x + 1, y + 1, 3, 2);
      ctx.fillRect(x + 12, y + 13, 3, 2);
    } else {
      ctx.fillStyle = "#57534e";
      ctx.fillRect(x, y, 16, 16);
      ctx.fillStyle = "#292524";
      ctx.fillRect(x + 2, y + 7, 12, 2);
      ctx.fillStyle = "#d6d3d1";
      ctx.fillRect(x + 2, y + 2, 4, 4);
      ctx.fillStyle = "#a8a29e";
      ctx.fillRect(x + 10, y + 10, 4, 4);
    }
  }

  function drawDoor(ctx, e, open) {
    if (open) return;
    const x = Math.round(e.x - e.w / 2);
    const y = Math.round(e.y - e.h / 2);
    const w = e.w;
    const h = e.h;
    ctx.fillStyle = "#070b16";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#22d3ee";
    ctx.fillRect(x, y, w, 1);
    ctx.fillRect(x, y + h - 1, w, 1);
    ctx.fillRect(x, y, 1, h);
    ctx.fillRect(x + w - 1, y, 1, h);
    ctx.fillStyle = "#f97316";
    if (w > h) {
      ctx.fillRect(x + 3, y + Math.round(h / 2) - 1, w - 6, 2);
    } else {
      ctx.fillRect(x + Math.round(w / 2) - 1, y + 3, 2, h - 6);
    }
    ctx.fillStyle = "#e879f9";
    ctx.fillRect(x + 2, y + 2, 2, 2);
    ctx.fillRect(x + w - 4, y + h - 4, 2, 2);
  }

  globalThis.VMJDraw = {
    THEMES: THEMES,
    blit: blit,
    centerBlit: centerBlit,
    textWidth: textWidth,
    tilemap: tilemap,
    drawSkyline: function (ctx, time, themeName) {
      drawSkyline(ctx, time, themeName);
    },
    drawVini: drawVini,
    drawJoao: drawJoao,
    drawNpc: drawNpc,
    drawBug: drawBug,
    drawBoss: drawBoss,
    heartIcon: heartIcon,
    drawPipe: drawPipe,
    drawCrate: drawCrate,
    drawDoor: drawDoor,
    shadow: shadow,
    drawProp: function (ctx, name, x, y, h) {
      return paintSprite(ctx, name, x, y, h, false);
    }
  };
})();
