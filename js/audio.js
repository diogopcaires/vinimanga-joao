(function () {
  let ctx = null;
  let master = null;
  let musicGain = null;
  let muted = false;
  let song = "title";
  let step = 0;
  let next = 0;
  let started = false;

  const songs = {
    title: [262, 330, 392, 330, 294, 370, 440, 370],
    forest: [392, 440, 494, 440, 349, 392, 440, 392],
    crypt: [220, 247, 220, 196, 220, 233, 220, 175],
    tower: [330, 392, 494, 392, 349, 415, 466, 415],
    cloud: [523, 659, 784, 659, 587, 698, 880, 698],
    boss: [196, 196, 233, 196, 175, 196, 233, 262]
  };

  function ac() {
    if (!ctx) {
      const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.22;
      master.connect(ctx.destination);
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.05;
      musicGain.connect(master);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, vol, delay) {
    const c = ac();
    if (!c || muted) return;
    const t = c.currentTime + (delay || 0);
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || "square";
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol || 0.05, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function noise(dur, vol) {
    const c = ac();
    if (!c || muted) return;
    const n = (c.sampleRate * dur) | 0;
    const b = c.createBuffer(1, n, c.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource();
    s.buffer = b;
    const g = c.createGain();
    g.gain.value = vol || 0.08;
    const f = c.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 420;
    s.connect(f);
    f.connect(g);
    g.connect(master);
    s.start();
  }

  globalThis.VMJAudio = {
    unlock: function () {
      ac();
      started = true;
    },
    toggle: function () {
      muted = !muted;
      if (musicGain) musicGain.gain.value = muted ? 0 : 0.05;
      return muted;
    },
    muted: function () { return muted; },
    song: function (name) { song = name || "title"; },
    tick: function () {
      if (!started || !ctx || muted) return;
      const now = ctx.currentTime;
      if (now + 0.05 < next) return;
      const notes = songs[song] || songs.title;
      const f = notes[step % notes.length];
      step++;
      next = now + 0.28;
      if (!f) return;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "square";
      o.frequency.value = f;
      g.gain.setValueAtTime(0.035, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      o.connect(g);
      g.connect(musicGain);
      o.start(now);
      o.stop(now + 0.24);
      if (step % 2 === 0) {
        const b = ctx.createOscillator();
        const bg = ctx.createGain();
        b.type = "triangle";
        b.frequency.value = f / 2;
        bg.gain.setValueAtTime(0.03, now);
        bg.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        b.connect(bg);
        bg.connect(musicGain);
        b.start(now);
        b.stop(now + 0.24);
      }
    },
    fart: function () { noise(0.18, 0.14); tone(150, 0.16, "sawtooth", 0.05); tone(80, 0.2, "square", 0.04); },
    burp: function () { tone(340, 0.08, "sawtooth", 0.05); tone(160, 0.14, "square", 0.04); },
    bat: function () { tone(880, 0.05, "square", 0.05); noise(0.04, 0.06); },
    bike: function () {
      noise(0.16, 0.1);
      tone(70, 0.22, "sawtooth", 0.07);
      tone(110, 0.14, "square", 0.04, 0.05);
      tone(55, 0.18, "sawtooth", 0.05, 0.1);
    },
    hurt: function () { tone(110, 0.16, "square", 0.06); },
    good: function () { tone(523, 0.07, "square", 0.05); tone(659, 0.1, "square", 0.05, 0.07); },
    bad: function () { tone(98, 0.18, "square", 0.06); },
    fanfare: function () {
      [523, 659, 784, 1046].forEach(function (f, i) { tone(f, 0.14, "square", 0.05, i * 0.12); });
    },
    blip: function () { tone(740, 0.04, "square", 0.04); },
    heal: function () {
      [392, 523, 784].forEach(function (f, i) { tone(f, 0.12, "triangle", 0.05, i * 0.08); });
    }
  };
})();
