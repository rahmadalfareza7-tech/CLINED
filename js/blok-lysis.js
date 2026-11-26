/* CLINED · Blok Lysis — Game Puzzle Histologi 8×8 tersinkronisasi per akun + Leaderboard CLINED.
   Progres disimpan di localStorage "clined_blok_lysis_v1" (statistik/rekor monotonik CRDT)
   dan "clined_blok_lysis_session_v1" (papan aktif + tombstone anti-ghost) — otomatis dibersihkan
   saat ganti akun & disinkronkan lintas perangkat via /api/sync + /api/minigames/blok-lysis/*. */
(() => {
  'use strict';

  const STATS_KEY = 'clined_blok_lysis_v1';
  const SESSION_KEY = 'clined_blok_lysis_session_v1';
  const SFX_KEY = 'clined_blok_lysis_sfx_v1';
  const N = 8;

  /* ================= WEBAUDIO SFX SYNTHESIZER (iOS/Safari PWA safe, zero external files) ================= */
  const SFX = (() => {
    let ac = null;
    let unlocked = false;
    let muted = false;
    try { muted = localStorage.getItem(SFX_KEY) === '0'; } catch {}

    function ctx() {
      if (muted) return null;
      if (!ac) {
        const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
        if (!AC) return null;
        try { ac = new AC(); } catch { return null; }
      }
      if (ac && ac.state === 'suspended') {
        try { ac.resume().catch?.(() => {}); } catch {}
      }
      return ac;
    }

    function unlock() {
      const c = ctx();
      if (!c) return false;
      try {
        if (c.state === 'suspended') c.resume().catch?.(() => {});
        if (!unlocked) {
          const buf = c.createBuffer(1, 1, 22050);
          const src = c.createBufferSource();
          src.buffer = buf;
          src.connect(c.destination);
          src.start(0);
          unlocked = true;
        }
        return true;
      } catch {
        return false;
      }
    }

    function tone({ type = 'sine', freq = 440, freqEnd = null, dur = 0.09, delay = 0, vol = 0.14, attack = 0.006 }) {
      const c = ctx();
      if (!c) return;
      try {
        const t0 = c.currentTime + delay;
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(Math.max(40, freq), t0);
        if (freqEnd !== null && freqEnd > 0) {
          osc.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), t0 + dur);
        }
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.linearRampToValueAtTime(vol, t0 + Math.min(attack, dur * 0.4));
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        osc.connect(gain);
        gain.connect(c.destination);
        osc.start(t0);
        osc.stop(t0 + dur + 0.015);
      } catch {}
    }

    const SCALE = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51, 1567.98];

    return {
      isMuted: () => muted,
      setMuted(v) {
        muted = !!v;
        try { localStorage.setItem(SFX_KEY, muted ? '0' : '1'); } catch {}
        if (!muted) { unlock(); this.uiTap(); }
        return muted;
      },
      toggleMute() { return this.setMuted(!muted); },
      unlock,
      uiTap() {
        tone({ type: 'sine', freq: 520, freqEnd: 680, dur: 0.045, vol: 0.08 });
      },
      pickup() {
        tone({ type: 'sine', freq: 340, freqEnd: 530, dur: 0.055, vol: 0.11 });
      },
      place(cellsCount = 3) {
        const boost = Math.min(5, Math.max(0, cellsCount - 1)) * 14;
        tone({ type: 'triangle', freq: 235 + boost, freqEnd: 118, dur: 0.085, vol: 0.18 });
        tone({ type: 'sine', freq: 520 + boost * 1.6, freqEnd: 340, dur: 0.05, vol: 0.07 });
      },
      invalid() {
        tone({ type: 'triangle', freq: 185, freqEnd: 135, dur: 0.075, vol: 0.09 });
        tone({ type: 'triangle', freq: 155, freqEnd: 115, dur: 0.075, delay: 0.06, vol: 0.07 });
      },
      deal() {
        tone({ type: 'sine', freq: 390, freqEnd: 520, dur: 0.045, delay: 0.0, vol: 0.055 });
        tone({ type: 'sine', freq: 440, freqEnd: 580, dur: 0.045, delay: 0.06, vol: 0.055 });
        tone({ type: 'sine', freq: 500, freqEnd: 660, dur: 0.055, delay: 0.12, vol: 0.065 });
      },
      clear(linesCount = 1, comboCount = 1, boardEmpty = false) {
        const idx = Math.min(SCALE.length - 3, Math.max(0, (comboCount || 1) - 1));
        const base = SCALE[idx];
        const third = SCALE[Math.min(SCALE.length - 1, idx + 2)];
        const fifth = SCALE[Math.min(SCALE.length - 1, idx + 4)];
        // Warm rising lysis chime
        tone({ type: 'sine', freq: base, dur: 0.16, delay: 0.0, vol: 0.15 });
        tone({ type: 'triangle', freq: third, dur: 0.19, delay: 0.055, vol: 0.13 });
        if (linesCount >= 2 || comboCount >= 2) {
          tone({ type: 'sine', freq: fifth, dur: 0.24, delay: 0.11, vol: 0.13 });
        }
        if (linesCount >= 3 || boardEmpty) {
          tone({ type: 'sine', freq: fifth * 1.25, dur: 0.28, delay: 0.165, vol: 0.11 });
          tone({ type: 'sine', freq: fifth * 1.5, dur: 0.34, delay: 0.22, vol: 0.10 });
        }
        // Subtle authentic medical ECG telemetry ping on combo >= 2
        if (comboCount >= 2) {
          const ecgHz = 860 + Math.min(8, comboCount - 1) * 42;
          tone({ type: 'sine', freq: ecgHz, dur: 0.07, delay: 0.14, vol: 0.075 });
        }
      },
      flatline() {
        tone({ type: 'sine', freq: 440, freqEnd: 392, dur: 0.28, vol: 0.065, attack: 0.015 });
      },
      newBest() {
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
          tone({ type: 'triangle', freq: f, dur: 0.18 + (i === 3 ? 0.14 : 0), delay: i * 0.075, vol: 0.11 });
        });
      },
      gameOver() {
        [392.0, 329.63, 261.63].forEach((f, i) => {
          tone({ type: 'triangle', freq: f, freqEnd: f * 0.94, dur: 0.22, delay: i * 0.14, vol: 0.10 });
        });
      }
    };
  })();

  /* ================= BALANCED ANTI-TRAP DEALER ENGINE ================= */
  const Dealer = (() => {
    const parse = s => { const out = []; s.split('/').forEach((row, r) => [...row].forEach((ch, c) => { if (ch === 'X') out.push([r, c]); })); return out; };
    const norm = cells => { const mr = Math.min(...cells.map(p => p[0])), mc = Math.min(...cells.map(p => p[1])); return cells.map(([r, c]) => [r - mr, c - mc]).sort((a, b) => a[0] - b[0] || a[1] - b[1]); };
    const rot = cells => norm(cells.map(([r, c]) => [c, -r]));
    const keyOf = cells => cells.map(p => p.join(',')).join(';');
    // Balanced weights: lively variety with friendly connectors and less awkward brick spam
    const BASES = [
      ['X', .75], ['XX', 1.2], ['XXX', 1.3], ['XXXX', 1.0], ['XXXXX', .52],
      ['XX/XX', 1.35], ['XXX/XXX/XXX', .40], ['XX/X.', 1.3], ['XXX/X../X..', .52],
      ['XXX/X..', .95], ['XXX/..X', .95], ['XXX/.X.', .90],
      ['XX./.XX', .45], ['.XX/XX.', .45], ['XXX/XXX', .52]
    ];
    const SHAPES = [];
    BASES.forEach(([s, w]) => {
      const seen = new Set(); let c = norm(parse(s)); const rots = [];
      for (let i = 0; i < 4; i++) { const k = keyOf(c); if (!seen.has(k)) { seen.add(k); rots.push(c); } c = rot(c); }
      rots.forEach(cells => {
        const h = Math.max(...cells.map(p => p[0])) + 1;
        const wd = Math.max(...cells.map(p => p[1])) + 1;
        SHAPES.push({ cells, w: w / rots.length, h, wd, size: cells.length, heavy: cells.length >= 5 || (h === 3 && wd === 3) });
      });
    });
    const TOTALW = SHAPES.reduce((a, s) => a + s.w, 0);
    const SIZE = SHAPES.map(sh => sh.size);
    const HEAVY = SHAPES.map(sh => sh.heavy);
    const LINES = [];
    const bitsOf = cells => { let lo = 0, hi = 0; cells.forEach(k => { if (k < 32) lo |= 1 << k; else hi |= 1 << (k - 32); }); return [lo >>> 0, hi >>> 0]; };
    for (let i = 0; i < N; i++) { LINES.push(bitsOf([...Array(N)].map((_, c) => i * N + c))); LINES.push(bitsOf([...Array(N)].map((_, r) => r * N + i))); }
    const PLACES = SHAPES.map(sh => { const out = []; for (let r = 0; r <= N - sh.h; r++) for (let c = 0; c <= N - sh.wd; c++) out.push(bitsOf(sh.cells.map(([a, b]) => (r + a) * N + c + b))); return out; });
    const pop32 = x => { x = x >>> 0; x -= (x >>> 1) & 0x55555555; x = (x & 0x33333333) + ((x >>> 2) & 0x33333333); return (((x + (x >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24; };
    const pop64 = (lo, hi) => pop32(lo) + pop32(hi);

    function pickShape(maxSize = 9, allowHeavy = true) {
      let total = 0;
      for (let i = 0; i < SHAPES.length; i++) {
        if (SIZE[i] <= maxSize && (allowHeavy || !HEAVY[i])) total += SHAPES[i].w;
      }
      if (total <= 0) return 0;
      let x = Math.random() * total;
      for (let i = 0; i < SHAPES.length; i++) {
        if (SIZE[i] > maxSize || (!allowHeavy && HEAVY[i])) continue;
        x -= SHAPES[i].w;
        if (x <= 0) return i;
      }
      return 0;
    }

    function boardBitsOf(board) {
      const ks = [];
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (board[r][c] >= 0) ks.push(r * N + c);
      return [...bitsOf(ks), ks.length];
    }

    function applyBits(lo, hi, pl, ph) {
      lo = (lo | pl) >>> 0; hi = (hi | ph) >>> 0; let cl = 0, ch = 0, n = 0;
      for (const [ml, mh] of LINES) if (((lo & ml) >>> 0) === ml && ((hi & mh) >>> 0) === mh) { cl |= ml; ch |= mh; n++; }
      return [(lo & ~cl) >>> 0, (hi & ~ch) >>> 0, n];
    }

    function solve(lo, hi, shapes, cap) {
      let count = 0, maxClear = 0, minAfterPop = 64;
      const dfs = (lo2, hi2, rem, cleared) => {
        if (!rem.length) {
          count++;
          if (cleared > maxClear) maxClear = cleared;
          const after = pop64(lo2, hi2);
          if (after < minAfterPop) minAfterPop = after;
          return;
        }
        for (let i = 0; i < rem.length; i++) {
          if (i && rem[i] === rem[i - 1]) continue;
          const rest = rem.slice(0, i).concat(rem.slice(i + 1));
          for (const [pl, ph] of PLACES[rem[i]]) {
            if ((lo2 & pl) || (hi2 & ph)) continue;
            const [nl, nh, n] = applyBits(lo2, hi2, pl, ph);
            dfs(nl, nh, rest, cleared + n);
            if (count >= cap) return;
          }
        }
      };
      dfs(lo, hi, shapes.slice().sort((a, b) => a - b), 0);
      return { count, maxClear, minAfterPop };
    }

    function scoreCandidate(c, fill, filled, activeCombo) {
      const cells = c.cells;
      const heavyCnt = c.shapes.filter(s => HEAVY[s]).length;
      const tinyCnt = c.shapes.filter(s => SIZE[s] <= 2).length;
      let sc = 0;

      // 1. Breathable solvability: reward comfortable solution counts, strongly penalize needle-in-a-haystack chokeholds!
      sc += Math.min(34, Math.log2(c.count + 1) * 5.6);
      if (c.count < 6) sc -= 28;
      else if (c.count < 12) sc -= 10;

      // 2. Line-clearing & combo satisfaction
      if (c.maxClear >= 1) {
        sc += fill >= 0.50 ? 44 : fill >= 0.30 ? 30 : 16;
        if (activeCombo >= 1) sc += 18;
      }
      if (c.maxClear >= 2) sc += 16;
      if (c.maxClear >= 3) sc += 8;

      // 3. Anti-trap next-phase breathing room
      if (c.minAfterPop <= filled) sc += fill >= 0.45 ? 20 : 10;
      if (c.minAfterPop <= filled - 5) sc += 12;

      // 4. Balanced size curve (fun chunky variety when open, fair tactical mix when mid/tight)
      const targetLo = fill < 0.35 ? 8 : fill < 0.55 ? 7 : 5;
      const targetHi = fill < 0.35 ? 12 : fill < 0.55 ? 10 : 9;
      if (cells >= targetLo && cells <= targetHi) sc += 14;
      else sc -= Math.min(20, (cells < targetLo ? targetLo - cells : cells - targetHi) * 4.5);

      // 5. Prevent multi-brick chokeholds and boring all-dot trays
      if (heavyCnt > 1) sc -= 32;
      if (fill >= 0.45 && c.shapes.some(s => SIZE[s] >= 9)) sc -= 35;
      if (fill < 0.62 && tinyCnt === 3) sc -= 24;
      else if (fill < 0.50 && tinyCnt === 2) sc -= 8;

      return sc;
    }

    function dealShapes(board, activeCombo = 0) {
      const [lo, hi, filled] = boardBitsOf(board);
      const fill = filled / (N * N);
      const CAP = 180;
      const cands = [];
      const seenKey = new Set();

      const tryTray = shapes => {
        const key = shapes.slice().sort((a, b) => a - b).join(',');
        if (seenKey.has(key)) return;
        seenKey.add(key);
        const r = solve(lo, hi, shapes, CAP);
        if (r.count) {
          cands.push({
            shapes,
            ...r,
            cells: shapes.reduce((a, s) => a + SIZE[s], 0)
          });
        }
      };

      // Phase A: balanced organic sampling (cap heavy pieces to <= 1)
      const maxSize = fill >= 0.58 ? 5 : fill >= 0.45 ? 6 : 9;
      const allowHeavy = fill < 0.58;
      for (let k = 0; k < 55 && cands.length < 16; k++) {
        const s1 = pickShape(maxSize, allowHeavy);
        const s2 = pickShape(HEAVY[s1] ? 4 : maxSize, allowHeavy && !HEAVY[s1]);
        const s3 = pickShape(HEAVY[s1] || HEAVY[s2] ? 4 : maxSize, allowHeavy && !HEAVY[s1] && !HEAVY[s2]);
        tryTray([s1, s2, s3]);
      }

      // Phase B: clear-aware & nimble rescue synergy pool (makes mid/late game satisfying & fair)
      if (fill >= 0.22 || activeCombo >= 1 || cands.length < 10) {
        const clearPool = [];
        const nimblePool = [];
        const fitPool = [];
        SHAPES.forEach((sh, s) => {
          if (SIZE[s] > maxSize) return;
          let canFit = false, canClear = false;
          for (const [pl, ph] of PLACES[s]) {
            if ((lo & pl) || (hi & ph)) continue;
            canFit = true;
            if (applyBits(lo, hi, pl, ph)[2] > 0) { canClear = true; break; }
          }
          if (!canFit) return;
          fitPool.push(s);
          if (canClear) clearPool.push(s);
          if (SIZE[s] <= 3) nimblePool.push(s);
        });
        const pickFrom = arr => arr[Math.floor(Math.random() * arr.length)];
        const clearTarget = fill >= 0.45 ? 10 : 6;
        for (let k = 0; k < 120 && fitPool.length && cands.filter(c => c.maxClear > 0).length < clearTarget; k++) {
          const s1 = clearPool.length ? pickFrom(clearPool) : pickFrom(fitPool);
          const s2 = nimblePool.length ? pickFrom(nimblePool) : pickFrom(fitPool);
          const s3 = (k % 3 === 0 && clearPool.length) ? pickFrom(clearPool) : pickFrom(fitPool);
          if ([s1, s2, s3].filter(s => HEAVY[s]).length > 1) continue;
          tryTray([s1, s2, s3]);
        }
      }

      // Phase C: tight-board safety net (never hand an unplayable brick wall if small pieces still fit)
      if (!cands.length) {
        const smallFit = [];
        SHAPES.forEach((sh, s) => {
          if (SIZE[s] <= 4 && PLACES[s].some(([pl, ph]) => !(lo & pl) && !(hi & ph))) smallFit.push(s);
        });
        for (let k = 0; k < 90 && smallFit.length && cands.length < 6; k++) {
          tryTray([0, 1, 2].map(() => smallFit[Math.floor(Math.random() * smallFit.length)]));
        }
      }

      let pick;
      if (!cands.length) {
        pick = { shapes: [pickShape(4, false), pickShape(3, false), pickShape(4, false)] };
      } else {
        const ranked = cands
          .map(c => ({ c, sc: scoreCandidate(c, fill, filled, activeCombo) + (Math.random() - 0.5) * 4 }))
          .sort((a, b) => b.sc - a.sc);
        const topK = Math.min(4, ranked.length);
        pick = ranked[Math.floor(Math.random() * topK)].c;
      }
      return pick.shapes.slice().sort(() => Math.random() - 0.5);
    }

    return { SHAPES, SIZE, HEAVY, PLACES, LINES, bitsOf, boardBitsOf, applyBits, solve, scoreCandidate, dealShapes, pop64 };
  })();

  const newGid = () => {
    try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID(); } catch {}
    return 'bl-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  };

  const validBoard = b => Array.isArray(b) && b.length === N && b.every(row => Array.isArray(row) && row.length === N);

  const emptyStats = () => ({ best: 0, games: 0, lines: 0, bestCombo: 0, last: null, lastAt: 0, updatedAt: 0 });

  function sanitizeStats(raw) {
    const base = emptyStats();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base;
    base.best = Math.max(0, Math.floor(Number(raw.best) || 0));
    base.games = Math.max(0, Math.floor(Number(raw.games) || 0));
    base.lines = Math.max(0, Math.floor(Number(raw.lines) || 0));
    base.bestCombo = Math.max(0, Math.floor(Number(raw.bestCombo) || 0));
    if (raw.last !== undefined && raw.last !== null && Number.isFinite(Number(raw.last))) {
      base.last = Math.max(0, Math.floor(Number(raw.last)));
      base.lastAt = Math.max(0, Math.floor(Number(raw.lastAt) || 0));
    }
    base.updatedAt = Math.max(0, Math.floor(Number(raw.updatedAt) || 0));
    return base;
  }

  function mergeStatsMonotonic(a, b) {
    const x = sanitizeStats(a);
    const y = sanitizeStats(b);
    let last = null;
    let lastAt = Math.max(x.lastAt, y.lastAt);
    if (x.last !== null && y.last !== null) {
      last = x.lastAt >= y.lastAt ? x.last : y.last;
    } else if (x.last !== null) {
      last = x.last;
      lastAt = x.lastAt || x.updatedAt;
    } else if (y.last !== null) {
      last = y.last;
      lastAt = y.lastAt || y.updatedAt;
    }
    return {
      best: Math.max(x.best, y.best),
      games: Math.max(x.games, y.games),
      lines: Math.max(x.lines, y.lines),
      bestCombo: Math.max(x.bestCombo, y.bestCombo),
      last,
      lastAt,
      updatedAt: Math.max(x.updatedAt, y.updatedAt)
    };
  }

  const Storage = {
    STATS_KEY,
    SESSION_KEY,
    readStats() {
      try {
        const raw = localStorage.getItem(STATS_KEY);
        if (!raw) return emptyStats();
        return sanitizeStats(JSON.parse(raw));
      } catch {
        return emptyStats();
      }
    },
    writeStats(next) {
      try {
        const cur = Storage.readStats();
        const merged = mergeStatsMonotonic(next, cur);
        merged.updatedAt = Math.max(merged.updatedAt, Date.now());
        localStorage.setItem(STATS_KEY, JSON.stringify(merged));
        return merged;
      } catch {
        return sanitizeStats(next);
      }
    },
    readSession() {
      try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        const d = JSON.parse(raw);
        if (!d || typeof d !== 'object' || d.over || d.clearedAt || !validBoard(d.board)) return null;
        return d;
      } catch {
        return null;
      }
    },
    writeSession(sess) {
      try {
        const payload = {
          gid: String(sess.gid || newGid()),
          board: sess.board,
          tray: sess.tray,
          score: Math.max(0, Math.floor(Number(sess.score) || 0)),
          combo: Math.max(0, Math.floor(Number(sess.combo) || 0)),
          msc: Math.max(0, Math.floor(Number(sess.msc) || 0)),
          moves: Math.max(0, Math.floor(Number(sess.moves) || 0)),
          over: false,
          startedAt: Math.max(0, Math.floor(Number(sess.startedAt) || Date.now())),
          updated: Date.now()
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
        return payload;
      } catch {
        return null;
      }
    },
    clearSession(gid) {
      try {
        const now = Date.now();
        localStorage.setItem(SESSION_KEY, JSON.stringify({
          gid: String(gid || newGid()),
          over: true,
          clearedAt: now,
          updated: now
        }));
      } catch {}
    }
  };

  /* ================= MARKUP ================= */
  const MARKUP = `<div class="bl" id="bl-root">
<svg id="bl-anat" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true" fill="none" stroke="#bff6f4" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
  <g transform="translate(30 40)"><path d="M40 20c-14-22-46-12-40 16 4 20 22 34 40 50 18-16 36-30 40-50 6-28-26-38-40-16z"/><path d="M40 20v-14M30 8c4-6 16-6 20 0M52 30l14-10"/></g>
  <g transform="translate(250 60)"><path d="M50 10v40M50 50c-8 0-12 8-18 4-14-8-30 10-30 40 0 22 6 36 18 36 14 0 22-14 22-34V60M50 50c8 0 12 8 18 4 14-8 30 10 30 40 0 22-6 36-18 36-14 0-22-14-22-34V60"/></g>
  <g transform="translate(60 330)"><path d="M70 10C40 4 8 22 8 52c0 26 22 40 42 38 6 12 26 14 34 4 26 4 46-14 44-38-2-30-28-48-58-46z"/><path d="M68 12c-4 20 6 30 2 50M40 30c10 4 14 14 10 26M96 26c-8 8-8 18-2 28M70 90v30"/></g>
  <g transform="translate(280 330)"><path d="M10 0c20 20 40 20 60 40s40 20 40 40M10 0c-6 8 2 16 8 12M110 80c6-8-2-16-8-12"/><path d="M40 40c8-8 18-2 14 6"/></g>
  <g transform="translate(40 600)"><path d="M10 0c30 25 30 50 0 75s-30 50 0 75M70 0C40 25 40 50 70 75s30 50 0 75"/><path d="M22 12h36M24 38h32M22 64h36M22 88h36M24 112h32M22 138h36"/></g>
  <g transform="translate(250 610)"><circle cx="40" cy="40" r="28"/><circle cx="40" cy="40" r="10"/><path d="M40 4v8M40 68v8M4 40h8M68 40h8M15 15l6 6M59 59l6 6M65 15l-6 6M21 59l-6 6"/></g>
</svg>
<canvas id="bl-cv" aria-label="Jaringan 8 kali 8 permainan Blok Lysis"></canvas>
<div class="bl-tb l" id="bl-tbL" hidden>
  <button type="button" class="bl-ib" id="bl-homeBtn" aria-label="Ke lobi"><svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M3 9.5 10 3l7 6.5V17a1 1 0 0 1-1 1h-3.5v-5h-5v5H4a1 1 0 0 1-1-1z" fill="#fff"/></svg></button>
  <button type="button" class="bl-ib" id="bl-restartBtn" aria-label="Mulai ulang">↻</button>
  <button type="button" class="bl-ib" id="bl-sfxBtn" aria-label="Suara efek" aria-pressed="true">🔊</button>
</div>

<section id="bl-lobby" aria-label="Lobi Blok Lysis">
  <div class="bl-fl" id="bl-fl" aria-hidden="true"></div>
  <button type="button" class="bl-back-mg" id="bl-exitMgBtn" aria-label="Kembali ke Mini Games">‹ Mini Games</button>
  <div class="bl-lobby-r">
    <button type="button" class="bl-ib bl-sfx-pill" id="bl-lbSfxBtn" aria-label="Suara efek" aria-pressed="true">🔊</button>
    <button type="button" class="bl-ib bl-lbtop" id="bl-lbBtn" aria-label="Leaderboard Blok Lysis">
      <svg width="19" height="19" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 2h10v3a5 5 0 0 1-4 4.9V12h3v2H6v-2h3V9.9A5 5 0 0 1 5 5z" fill="#ffd23f"/><path d="M5 3H2v1.5A3.5 3.5 0 0 0 5 8M15 3h3v1.5A3.5 3.5 0 0 1 15 8" stroke="#ffd23f" stroke-width="1.6" fill="none"/><rect x="5" y="15" width="10" height="3" rx="1.2" fill="#ffd23f"/></svg>
      <span>Leaderboard</span>
    </button>
  </div>
  <div class="bl-lb">
    <canvas class="bl-logo" id="bl-logoCv" width="200" height="190" aria-hidden="true"></canvas>
    <h1>Blok <span>Lysis</span></h1>
    <p class="bl-tag">Susun sel. Penuhi jaringan. Lisiskan!</p>
    <div class="bl-bestc">
      <span class="cr"><svg width="26" height="22" viewBox="0 0 26 22" aria-hidden="true"><path d="M2 6l6 5 5-9 5 9 6-5-2 14H4z" fill="#fff"/></svg></span>
      <div><div class="v" id="bl-lBest">0</div><div class="l">Skor terbaik akunmu</div></div>
    </div>
    <button type="button" class="bl-btn go" id="bl-playBtn">Main</button>
    <div class="bl-sub" id="bl-playSub"></div>
    <button type="button" class="bl-lnk" id="bl-newBtn" hidden>Main baru</button>
    <div class="bl-stats">
      <div class="bl-st"><div class="v" id="bl-sGames">0</div><div class="l">Permainan</div></div>
      <div class="bl-st"><div class="v" id="bl-sLines">0</div><div class="l">Garis dipecah</div></div>
      <div class="bl-st"><div class="v" id="bl-sCombo">0</div><div class="l">Combo terbaik</div></div>
      <div class="bl-st"><div class="v" id="bl-sLast">–</div><div class="l">Skor terakhir</div></div>
    </div>
    <div class="bl-sync-note" id="bl-syncNote">Progres &amp; leaderboard tersinkronisasi per akun CLINED</div>
  </div>
</section>

<div class="bl-ov" id="bl-lbOv" hidden>
  <div class="bl-card bl-lbcard" role="dialog" aria-modal="true" aria-labelledby="bl-lbT">
    <div class="bl-lb-head">
      <h2 id="bl-lbT">🏆 Leaderboard</h2>
      <button type="button" class="bl-lb-ref" id="bl-lbRefreshBtn">↻ Segarkan</button>
    </div>
    <p style="margin-top:4px;text-align:left">Skor tertinggi Blok Lysis seluruh akun CLINED</p>
    <div class="bl-myrank" id="bl-myRankBar" hidden></div>
    <ol class="bl-lbl" id="bl-lbList"></ol>
    <p class="bl-lbmsg" id="bl-lbMsg" hidden></p>
    <button type="button" class="bl-btn" data-bl-close>Tutup</button>
  </div>
</div>

<div class="bl-ov" id="bl-overOv" hidden>
  <div class="bl-card" role="dialog" aria-modal="true" aria-labelledby="bl-overT">
    <h2 id="bl-overT">Jaringan penuh!</h2>
    <p>Tidak ada ruang lagi untuk sel yang tersisa.</p>
    <div class="bl-big" id="bl-overScore">0</div>
    <div class="bl-best" id="bl-overBest">Terbaik 0</div>
    <div id="bl-overXp"></div>
    <button type="button" class="bl-btn" id="bl-againBtn">Main lagi</button>
    <button type="button" class="bl-btn gold" id="bl-overLbBtn">🏆 Lihat Leaderboard</button>
    <button type="button" class="bl-btn alt" id="bl-overLobbyBtn">Ke lobi</button>
  </div>
</div>
</div>`;

  /* ================= GAME INSTANCE ================= */
  function createGame() {
    const host = document.getElementById('blokLysisHost');
    if (!host) return null;
    host.innerHTML = MARKUP;

    const q = id => host.querySelector('#' + id);
    const fmt = n => Number(n || 0).toLocaleString('id-ID');
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const currentUser = () => { try { return typeof window.authCurrentUser === 'function' ? window.authCurrentUser() : null; } catch { return null; } };
    const currentUid = () => String(currentUser()?.id || '');
    const isOpen = () => !!document.getElementById('blokLysisPage')?.classList.contains('active');

    /* ---------- shapes & balanced anti-trap dealer ---------- */
    const COLORS = ['#e5484d', '#ee8a3c', '#e8b931', '#2fb87e', '#38b6e0', '#4a5fd6', '#9a6cf0', '#f2709c'];
    const { SHAPES } = Dealer;
    const fits = (p, r0, c0) => p.cells.every(([r, c]) => { const R = r0 + r, C = c0 + c; return R >= 0 && R < N && C >= 0 && C < N && board[R][C] < 0; });
    const anyFit = p => { for (let r = 0; r <= N - p.h; r++) for (let c = 0; c <= N - p.wd; c++) if (fits(p, r, c)) return true; return false; };

    /* ---------- state (account-scoped via clined_blok_lysis_v1 + clined_blok_lysis_session_v1) ---------- */
    let boundUid = currentUid();
    let stats = Storage.readStats();
    let board = Array.from({ length: N }, () => Array(N).fill(-1));
    let tray = [null, null, null];
    let score = 0, best = stats.best || 0, combo = 0, msc = 0, moves = 0, over = false;
    let bestBrokenThisRun = false;
    let gid = newGid(), startedAt = Date.now();
    let drag = null, sel = -1, hover = null, kcur = { r: 3, c: 3 };
    let pop = [], parts = [], clearing = [], shake = 0, scoreShown = 0;
    let praise = null, comboFx = null, comboLost = null;
    const wob = new Map();
    let rafId = 0, running = false;

    function dealTray(playSound = false) {
      const order = Dealer.dealShapes(board, combo);
      tray = order.map(s => ({ s, col: Math.floor(Math.random() * COLORS.length), ...SHAPES[s] }));
      pop.push({ kind: 'deal', t0: performance.now() });
      if (playSound && isOpen() && lobby && lobby.hidden) SFX.deal();
    }

    function saveStatsNow() {
      stats.best = Math.max(stats.best || 0, best);
      stats = Storage.writeStats(stats);
      best = stats.best;
    }

    function saveSessionNow() {
      if (over) {
        Storage.clearSession(gid);
        return;
      }
      Storage.writeSession({
        gid,
        board,
        tray: tray.map(p => (p ? { s: p.s, col: p.col } : null)),
        score,
        combo,
        msc,
        moves,
        startedAt
      });
    }

    function freshGame({ writeTombstone = false } = {}) {
      if (writeTombstone && gid) Storage.clearSession(gid);
      board = Array.from({ length: N }, () => Array(N).fill(-1));
      score = 0; combo = 0; msc = 0; moves = 0; over = false; bestBrokenThisRun = false;
      gid = newGid(); startedAt = Date.now();
      tray = [null, null, null];
      drag = null; sel = -1; praise = null; comboFx = null; comboLost = null;
      clearing = []; parts = []; pop = []; wob.clear();
      dealTray(false);
    }

    function loadFromStorage() {
      stats = Storage.readStats();
      best = stats.best;
      const d = Storage.readSession();
      if (!d) return false;
      gid = String(d.gid || newGid());
      startedAt = Number(d.startedAt) || Date.now();
      board = d.board.map(row => row.map(v => (typeof v === 'number' ? v : -1)));
      score = Math.max(0, Math.floor(Number(d.score) || 0));
      if (score > best) { best = score; saveStatsNow(); }
      bestBrokenThisRun = score > 0 && score >= best;
      combo = Math.max(0, Math.floor(Number(d.combo) || 0));
      msc = Math.max(0, Math.floor(Number(d.msc) || 0));
      moves = Math.max(0, Math.floor(Number(d.moves) || 0));
      over = false;
      tray = Array.isArray(d.tray) && d.tray.length === 3
        ? d.tray.map(p => (p && SHAPES[p.s] ? { s: p.s, col: Math.max(0, Math.min(COLORS.length - 1, Number(p.col) || 0)), ...SHAPES[p.s] } : null))
        : [null, null, null];
      if (tray.every(p => !p)) dealTray(false);
      return true;
    }

    function endGameStats() {
      if (score > 0) {
        stats.games = (stats.games || 0) + 1;
        stats.last = score;
        stats.lastAt = Date.now();
        stats.best = Math.max(stats.best || 0, best, score);
        best = stats.best;
        saveStatsNow();
      }
    }

    function awardXP(finalScore, gameId) {
      try {
        if (typeof window.addXP !== 'function' || finalScore < 100) return 0;
        const xpAmt = Math.min(25, Math.max(5, Math.floor(finalScore / 150)));
        const res = window.addXP(xpAmt, 'Blok Lysis • skor ' + fmt(finalScore), { kind: 'quest', ref: 'bl:' + gameId, silent: true });
        if (res && res.gained > 0) {
          window.showXPPopup?.(res.gained, `Blok Lysis • ${fmt(finalScore)}`, !!res.leveledUp);
          return res.gained;
        }
      } catch {}
      return 0;
    }

    /* ---------- Server Leaderboard & Per-Account Sync ---------- */
    const LB = { rows: [], myRank: null, myBest: 0, ready: false, loading: false, err: '', lastPushedSig: '', writing: Promise.resolve(), fetchedAt: 0 };

    function pushBest(force = false) {
      const u = currentUser();
      if (!u || !u.id || !navigator.onLine) return LB.writing;
      saveStatsNow();
      const sig = `${u.id}|${stats.best}|${stats.games}|${stats.lines}|${stats.bestCombo}|${stats.last ?? ''}`;
      if (!force && (stats.best <= 0 && stats.games <= 0)) return LB.writing;
      if (!force && sig === LB.lastPushedSig) return LB.writing;
      const payload = {
        best: stats.best,
        games: stats.games,
        lines: stats.lines,
        bestCombo: stats.bestCombo,
        last: stats.last,
        lastAt: stats.lastAt,
        updatedAt: stats.updatedAt || Date.now(),
        clientId: window.CLINED_ONLINE_SYNC?.clientId || ''
      };
      LB.lastPushedSig = sig;
      LB.writing = LB.writing.then(async () => {
        const r = await fetch('/api/minigames/blok-lysis/score', {
          method: 'POST',
          credentials: 'same-origin',
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!r.ok) {
          LB.lastPushedSig = '';
          return;
        }
        const d = await r.json().catch(() => null);
        if (!d || currentUid() !== u.id) return;
        if (d.stats) {
          const merged = Storage.writeStats(d.stats);
          stats = merged;
          best = merged.best;
        }
        if (Array.isArray(d.rankings)) {
          LB.rows = d.rankings;
          LB.myRank = d.myRank ?? null;
          LB.myBest = Math.max(Number(d.myBest) || 0, best);
          LB.ready = true;
          LB.err = '';
          LB.fetchedAt = Date.now();
          if (!q('bl-lbOv').hidden) renderLB();
        }
        if (!q('bl-lobby').hidden) refreshLobbyNumbers();
      }).catch(() => {
        LB.lastPushedSig = '';
      });
      return LB.writing;
    }

    async function fetchLeaderboard(syncFirst = true) {
      const u = currentUser();
      if (!u || !u.id) {
        LB.ready = false;
        LB.rows = [];
        LB.err = 'Masuk ke akun CLINED untuk melihat leaderboard bersama.';
        renderLB();
        return;
      }
      LB.loading = true;
      LB.err = '';
      renderLB();
      try {
        if (syncFirst) {
          await Promise.allSettled([
            pushBest(stats.best > 0 || stats.games > 0),
            window.CLINED_ONLINE_SYNC?.sync?.({ force: true })
          ]);
        }
        const r = await fetch('/api/minigames/blok-lysis/leaderboard', { credentials: 'same-origin', cache: 'no-store' });
        if (r.status === 401) {
          LB.ready = false;
          LB.err = 'Sesi berakhir. Masuk kembali ke akun CLINED.';
        } else if (!r.ok) {
          throw new Error(`HTTP ${r.status}`);
        } else {
          const d = await r.json();
          if (currentUid() !== u.id) return;
          LB.rows = Array.isArray(d.rankings) ? d.rankings : [];
          LB.myRank = d.myRank ?? null;
          LB.myBest = Math.max(Number(d.myBest) || 0, best);
          if (LB.myBest > best) {
            best = LB.myBest;
            stats.best = best;
            saveStatsNow();
            if (!q('bl-lobby').hidden) refreshLobbyNumbers();
          }
          LB.ready = true;
          LB.err = '';
          LB.fetchedAt = Date.now();
        }
      } catch {
        LB.err = LB.rows.length ? '' : 'Leaderboard belum bisa dimuat. Periksa koneksi lalu segarkan.';
      } finally {
        LB.loading = false;
        renderLB();
      }
    }

    function renderLB() {
      const list = q('bl-lbList'), msg = q('bl-lbMsg'), myBar = q('bl-myRankBar');
      const u = currentUser();
      const say = t => { msg.hidden = !t; msg.textContent = t || ''; };
      if (!u || !u.id) {
        list.innerHTML = ''; myBar.hidden = true;
        say(`Masuk akun CLINED untuk sinkronisasi & leaderboard. Skor terbaikmu: ${fmt(best)}.`);
        return;
      }
      if (LB.loading && !LB.rows.length) {
        list.innerHTML = ''; myBar.hidden = true;
        say('Menyinkronkan & memuat leaderboard…');
        return;
      }
      if (LB.err && !LB.rows.length) {
        list.innerHTML = ''; myBar.hidden = true;
        say(LB.err);
        return;
      }
      const rows = LB.rows.slice();
      if (best > 0 && !rows.some(r => r.id === u.id)) {
        const isHiddenAdmin = u.role === 'admin' && !u.showInLeaderboard;
        if (!isHiddenAdmin) {
          rows.push({
            id: u.id,
            name: u.name || u.username || 'Kamu',
            username: u.username || '',
            avatarUrl: u.avatarUrl || null,
            bestScore: best,
            bestCombo: stats.bestCombo || 0,
            totalLines: stats.lines || 0,
            local: true
          });
          rows.sort((a, b) => (b.bestScore - a.bestScore) || (b.bestCombo - a.bestCombo));
        }
      }
      if (!rows.length) {
        list.innerHTML = ''; myBar.hidden = true;
        say('Belum ada skor tercatat. Mainkan sekarang untuk menjadi peringkat #1!');
        return;
      }
      say('');
      const myIdx = rows.findIndex(r => r.id === u.id);
      const shownRank = LB.myRank || (myIdx >= 0 ? myIdx + 1 : null);
      if (shownRank || best > 0) {
        myBar.hidden = false;
        myBar.innerHTML = `<span>Peringkatmu: ${shownRank ? '#' + shownRank : '–'}</span><span>♛ ${fmt(Math.max(best, LB.myBest))}</span>`;
      } else {
        myBar.hidden = true;
      }

      list.innerHTML = rows.map((r, i) => {
        const rank = r.rank || (i + 1);
        const isMe = r.id === u.id;
        const medalCls = rank <= 3 ? ' g' + rank : '';
        const ini = String(r.name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
        const avHtml = r.avatarUrl
          ? `<span class="av"><img src="${esc(r.avatarUrl)}" alt="" loading="lazy"></span>`
          : `<span class="av">${esc(ini)}</span>`;
        const metaParts = [];
        if (r.username) metaParts.push('@' + r.username);
        if (r.bestCombo > 1) metaParts.push(`Combo ×${r.bestCombo}`);
        if (r.totalLines > 0) metaParts.push(`${fmt(r.totalLines)} garis`);
        return `<li class="${isMe ? 'me' : ''}">
          <span class="rk${medalCls}">${rank}</span>
          ${avHtml}
          <div class="info">
            <div class="nm">${esc(r.name || 'Pemain')}${isMe ? '<small>kamu</small>' : ''}</div>
            <div class="sub">${esc(metaParts.join(' · '))}</div>
          </div>
          <span class="sc">${fmt(r.bestScore)}</span>
        </li>`;
      }).join('');
    }

    /* ---------- canvas layout & Wright-Giemsa cell art ---------- */
    const cv = q('bl-cv'), ctx = cv.getContext('2d');
    let W = 0, H = 0, dpr = 1, L = {};
    const sprites = new Map();

    function layout() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = window.innerWidth; H = window.innerHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      const top = Math.max(70, H * .11), trayH = Math.min(H * .2, 170);
      const boardS = Math.max(200, Math.floor(Math.min(W - 28, 520, H - top - trayH - 40)));
      const cell = boardS / N;
      L = { cell, bs: boardS, bx: (W - boardS) / 2, by: top + Math.max(0, (H - top - trayH - boardS - 30) / 2), trayH };
      L.ty = L.by + boardS + 24; L.tcell = Math.min(cell * .6, (W - 30) / 3 / 4.9, trayH / 5.2);
      L.slots = [0, 1, 2].map(i => ({ x: W / 2 + (i - 1) * Math.min(W / 3, boardS / 3 + 10), y: L.ty + trayH / 2 }));
      sprites.clear();
    }

    const rr = (g, x, y, w, h, r) => { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); };
    const rgba = (hex, a, f = 0) => {
      const n = parseInt(hex.slice(1), 16);
      let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
      const t = f < 0 ? 0 : 255, p = Math.abs(f);
      r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b);
      return `rgba(${r},${g},${b},${a})`;
    };
    const NUC = '#4a2580', NUC2 = '#2f1758';
    const DOTS = (n, seed, rad) => {
      const out = []; let x = seed;
      for (let i = 0; i < n; i++) {
        x = (x * 9301 + 49297) % 233280; const a = x / 233280 * Math.PI * 2;
        x = (x * 9301 + 49297) % 233280; const r = Math.sqrt(x / 233280) * rad;
        out.push([50 + Math.cos(a) * r, 50 + Math.sin(a) * r]);
      }
      return out;
    };
    const GR_FINE = DOTS(46, 7, 33), GR_EO = DOTS(30, 11, 31), GR_BASO = DOTS(26, 23, 30);

    function cellArt(g, col) {
      const C = (x, y, r, f) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = f; g.fill(); };
      const E = (x, y, rx, ry, rot2, f) => { g.beginPath(); g.ellipse(x, y, rx, ry, rot2, 0, Math.PI * 2); g.fillStyle = f; g.fill(); };
      const rim = (r, f, st) => { C(50, 50, r, f); g.lineWidth = 3; g.strokeStyle = st; g.beginPath(); g.arc(50, 50, r - 1.5, 0, Math.PI * 2); g.stroke(); };
      if (col === 0) {
        const gr = g.createRadialGradient(50, 50, 4, 50, 50, 40); gr.addColorStop(0, '#ffd9db'); gr.addColorStop(.42, '#ff9aa0'); gr.addColorStop(.75, '#ef5b63'); gr.addColorStop(1, '#c93a43');
        C(50, 50, 40, gr); g.lineWidth = 2.5; g.strokeStyle = 'rgba(255,214,216,.9)'; g.beginPath(); g.arc(50, 50, 39, 0, Math.PI * 2); g.stroke(); C(44, 40, 7, 'rgba(255,255,255,.35)');
      } else if (col === 1) {
        rim(40, '#ffe3cf', '#f2b48c');
        E(36, 52, 13, 15, .2, NUC); E(64, 52, 13, 15, -.2, NUC); g.lineWidth = 6; g.strokeStyle = NUC; g.beginPath(); g.moveTo(40, 55); g.quadraticCurveTo(50, 62, 60, 55); g.stroke();
        GR_EO.forEach(([x, y], i) => C(x, y, 3.4, i % 3 ? '#ff6a2f' : '#ff8f52'));
      } else if (col === 2) {
        rim(41, '#ffeaa0', '#e0b52c'); C(48, 47, 33, '#fffbe8'); C(40, 38, 9, 'rgba(255,255,255,.9)');
        g.beginPath(); g.ellipse(70, 70, 5, 12, -.78, 0, Math.PI * 2); g.fillStyle = NUC; g.fill();
      } else if (col === 3) {
        C(50, 50, 44, 'rgba(190,255,220,.35)'); rim(38, '#d7f7e6', '#7fd8ad');
        C(50, 50, 27, '#7a52c7'); C(50, 50, 27, 'rgba(255,255,255,.08)'); C(56, 45, 7, NUC2); C(54, 43, 2.2, '#b79df0');
        g.fillStyle = '#fff'; [[86, 18, 5], [16, 80, 4]].forEach(([x, y, z]) => { g.beginPath(); g.moveTo(x, y - z); g.lineTo(x + z * .3, y - z * .3); g.lineTo(x + z, y); g.lineTo(x + z * .3, y + z * .3); g.lineTo(x, y + z); g.lineTo(x - z * .3, y + z * .3); g.lineTo(x - z, y); g.lineTo(x - z * .3, y - z * .3); g.fill(); });
      } else if (col === 4) {
        rim(36, '#bfe6fb', '#7fc4ea'); C(48, 51, 29, NUC); [[40, 44, 4], [54, 58, 5], [58, 42, 3.5], [42, 62, 3]].forEach(([x, y, r]) => C(x, y, r, NUC2)); C(40, 40, 5, 'rgba(255,255,255,.18)');
      } else if (col === 5) {
        rim(39, '#e9dcff', '#b9a2ee'); E(50, 52, 22, 17, 0, '#7b5bc4');
        GR_BASO.forEach(([x, y]) => C(x, y, 4.4, '#241b6b')); GR_BASO.slice(0, 10).forEach(([x, y]) => C(x - 1.2, y - 1.2, 1.3, '#6e64c9'));
      } else if (col === 6) {
        rim(40, '#f6e9ff', '#cdb2ee');
        GR_FINE.forEach(([x, y]) => C(x, y, 1.5, '#d9a7e8'));
        const lobes = [[30, 46], [42, 62], [58, 58], [68, 40]];
        g.strokeStyle = NUC; g.lineWidth = 3.2; g.beginPath(); g.moveTo(...lobes[0]); lobes.slice(1).forEach(p => g.lineTo(...p)); g.stroke();
        lobes.forEach(([x, y], i) => E(x, y, 9, 8, i * .7, NUC));
      } else {
        g.beginPath(); g.moveTo(50, 9); g.bezierCurveTo(66, 8, 70, 22, 80, 22); g.bezierCurveTo(94, 22, 95, 42, 86, 50); g.bezierCurveTo(96, 62, 88, 84, 70, 80);
        g.bezierCurveTo(62, 92, 40, 94, 34, 84); g.bezierCurveTo(16, 88, 6, 70, 14, 58); g.bezierCurveTo(4, 46, 12, 26, 28, 26); g.bezierCurveTo(32, 14, 40, 9, 50, 9); g.closePath();
        g.fillStyle = '#ffe1ec'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#e996b4'; g.stroke();
        E(42, 54, 15, 11, -.4, NUC); C(46, 51, 4, '#ffe1ec');
        [[66, 36, 7], [70, 62, 5], [30, 36, 4.5]].forEach(([x, y, r]) => { C(x, y, r, '#fff7fa'); g.lineWidth = 1.5; g.strokeStyle = '#e3a1bb'; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke(); });
        [[66, 36, 2.6, '#3c9a54'], [70, 62, 2, '#7a3b2a'], [58, 74, 2.4, '#5a2a7a']].forEach(([x, y, r, f]) => C(x, y, r, f));
      }
    }

    function sprite(col, s) {
      const k = col + '|' + Math.round(s * dpr); if (sprites.has(k)) return sprites.get(k);
      const S = Math.max(4, Math.round(s * dpr)), c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
      const base = COLORS[col], r = S * .26, pad = S * .05, w = S - 2 * pad;
      const body = () => rr(g, pad, pad, w, w, r);
      body(); const jg = g.createRadialGradient(S * .45, S * .4, S * .08, S * .5, S * .5, S * .72); jg.addColorStop(0, rgba(base, .34, .45)); jg.addColorStop(.55, rgba(base, .58, .15)); jg.addColorStop(1, rgba(base, .97, .05)); g.fillStyle = jg; g.fill();
      g.save(); body(); g.clip();
      g.fillStyle = rgba(base, .28, -.35); g.fillRect(0, S * .86, S, S * .14);
      g.globalAlpha = .93; g.translate(S * .12, S * .1); g.scale(S * .76 / 100, S * .76 / 100); cellArt(g, col); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
      const sh = g.createLinearGradient(0, 0, 0, S); sh.addColorStop(0, 'rgba(255,255,255,.5)'); sh.addColorStop(.42, 'rgba(255,255,255,.06)'); sh.addColorStop(.43, 'rgba(255,255,255,0)'); g.fillStyle = sh; g.fillRect(0, 0, S, S);
      const rl = g.createRadialGradient(S * .85, S * .88, 0, S * .85, S * .88, S * .4); rl.addColorStop(0, 'rgba(255,255,255,.28)'); rl.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rl; g.fillRect(0, 0, S, S);
      g.restore();
      body(); g.lineWidth = Math.max(1, S * .04); g.strokeStyle = rgba(base, .95, .2); g.stroke();
      rr(g, pad + S * .035, pad + S * .035, w - S * .07, w - S * .07, r * .85); g.lineWidth = Math.max(1, S * .022); g.strokeStyle = 'rgba(255,255,255,.45)'; g.stroke();
      g.beginPath(); g.ellipse(S * .3, S * .18, S * .15, S * .06, -.25, 0, Math.PI * 2); g.fillStyle = 'rgba(255,255,255,.75)'; g.fill();
      g.beginPath(); g.arc(S * .5, S * .15, S * .025, 0, Math.PI * 2); g.fill();
      sprites.set(k, c); return c;
    }

    const block = (col, x, y, s, a = 1, sx = 1, sy = 1) => {
      ctx.globalAlpha = a;
      if (sx === 1 && sy === 1) ctx.drawImage(sprite(col, s), x, y, s, s);
      else { const w2 = s * sx, h2 = s * sy; ctx.drawImage(sprite(col, s), x + (s - w2) / 2, y + (s - h2), w2, h2); }
      ctx.globalAlpha = 1;
    };

    /* ---------- rules & placement ---------- */
    function linesFor(p, r0, c0) {
      const filled = (R, C) => board[R][C] >= 0 || p.cells.some(([r, c]) => r0 + r === R && c0 + c === C);
      const rows = [], cols = [];
      for (let R = 0; R < N; R++) { let ok = true; for (let C = 0; C < N; C++) if (!filled(R, C)) { ok = false; break; } if (ok) rows.push(R); }
      for (let C = 0; C < N; C++) { let ok = true; for (let R = 0; R < N; R++) if (!filled(R, C)) { ok = false; break; } if (ok) cols.push(C); }
      return { rows, cols };
    }
    const LINE_PTS = [0, 10, 30, 60, 100, 150, 210];
    const PRAISE = {
      good: { text: 'Good!', c1: '#b6ffcf', c2: '#2fb87e' },
      great: { text: 'Great!', c1: '#bff3ff', c2: '#22a8e0' },
      excellent: { text: 'Excellent!', c1: '#e6d4ff', c2: '#8a55f0' },
      amazing: { text: 'Amazing!', c1: '#ffe1b8', c2: '#ff7a2f' },
      perfect: { text: 'Perfect!', c1: '#fff6c2', c2: '#ffb300' }
    };

    function place(i, r0, c0) {
      SFX.unlock();
      const p = tray[i], now = performance.now();
      const { rows, cols } = linesFor(p, r0, c0);
      p.cells.forEach(([r, c]) => { board[r0 + r][c0 + c] = p.col; wob.set((r0 + r) * N + c0 + c, now + (r + c) * 25); });
      moves++;
      SFX.place(p.cells.length);
      let gained = p.cells.length;
      const n = rows.length + cols.length;
      if (n) {
        combo++; msc = 0;
        stats.lines = (stats.lines || 0) + n;
        if (combo > (stats.bestCombo || 0)) stats.bestCombo = combo;
        const set = new Set();
        rows.forEach(R => { for (let C = 0; C < N; C++) set.add(R * N + C); });
        cols.forEach(C => { for (let R = 0; R < N; R++) set.add(R * N + C); });
        set.forEach(k => {
          const R = Math.floor(k / N), C = k % N, col = board[R][C];
          clearing.push({ R, C, col, t0: now + ((R + C) % 8) * 18 });
          board[R][C] = -1;
          parts.push({ ring: true, x: L.bx + (C + .5) * L.cell, y: L.by + (R + .5) * L.cell, col, t0: now });
          for (let j = 0; j < 5; j++) parts.push({ x: L.bx + (C + .5) * L.cell, y: L.by + (R + .5) * L.cell, vx: (Math.random() - .5) * 7, vy: -Math.random() * 7 - 2, s: L.cell * (.18 + Math.random() * .18), col, t0: now, a: Math.random() * 6 });
        });
        let pts = (LINE_PTS[n] || 210 + (n - 6) * 70) * combo;
        const empty = board.every(row => row.every(v => v < 0));
        if (empty) pts += 300;
        gained += pts;
        const cx = L.bx + (c0 + p.wd / 2) * L.cell, cy = L.by + (r0 + p.h / 2) * L.cell;
        pop.push({ text: '+' + pts, x: cx, y: cy, t0: now, col: '#fff', size: 1 });
        const P = empty ? PRAISE.perfect : n >= 4 ? PRAISE.amazing : n === 3 ? PRAISE.excellent : n === 2 ? PRAISE.great : PRAISE.good;
        praise = { ...P, t0: now + 60 };
        if (combo > 1) comboFx = { n: combo, t0: now };
        shake = Math.min(12, 3 + n * 2 + (empty ? 6 : 0));
        SFX.clear(n, combo, empty);
      } else if (combo && ++msc >= 3) {
        if (combo > 1) {
          comboLost = { n: combo, t0: now };
          SFX.flatline();
        }
        combo = 0; msc = 0;
      }
      const prevBest = best;
      score += gained;
      if (score > best) {
        best = score;
        if (!bestBrokenThisRun && prevBest > 0) {
          bestBrokenThisRun = true;
          SFX.newBest();
        }
      }
      if (n || best > prevBest) saveStatsNow();
      tray[i] = null; if (sel === i) sel = -1;
      if (tray.every(t => !t)) dealTray(true);
      saveSessionNow();
      if (best > prevBest && best >= 100) pushBest();
      if (!tray.some(t => t && anyFit(t))) {
        over = true;
        SFX.gameOver();
        const finishedGid = gid;
        const finalScore = score;
        endGameStats();
        Storage.clearSession(finishedGid);
        pushBest(true);
        const xpGained = awardXP(finalScore, finishedGid);
        setTimeout(() => {
          if (!isOpen() || !over) return;
          q('bl-overScore').textContent = fmt(finalScore);
          q('bl-overBest').textContent = (finalScore >= best && finalScore > 0 ? '🎉 Rekor baru! ' : 'Terbaik ') + fmt(best);
          q('bl-overXp').innerHTML = xpGained > 0 ? `<span class="bl-xp-pill">+${xpGained} XP CLINED</span>` : '';
          openOv('bl-overOv');
        }, 850);
      }
    }

    /* ---------- pointer & keyboard interaction ---------- */
    const lobby = q('bl-lobby'), playBtn = q('bl-playBtn'), newBtn = q('bl-newBtn'), tbL = q('bl-tbL');
    function slotHit(px, py) {
      for (let i = 0; i < 3; i++) {
        const s = L.slots[i];
        if (tray[i] && Math.abs(px - s.x) < Math.min(W / 6, L.bs / 6 + 10) && Math.abs(py - s.y) < L.trayH / 2 + 10) return i;
      }
      return -1;
    }
    function anchorFor(p, px, py) {
      return { r: Math.round((py - L.by) / L.cell - p.h / 2), c: Math.round((px - L.bx) / L.cell - p.wd / 2) };
    }
    cv.addEventListener('pointerdown', e => {
      if (!isOpen() || over || !lobby.hidden) return;
      SFX.unlock();
      const i = slotHit(e.clientX, e.clientY);
      if (i >= 0) {
        try { cv.setPointerCapture(e.pointerId); } catch {}
        drag = { i, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), lift: e.pointerType === 'touch' ? L.cell * 1.9 : 0, moved: false };
        SFX.pickup();
        return;
      }
      if (sel >= 0 && tray[sel]) {
        const p = tray[sel], a = anchorFor(p, e.clientX, e.clientY);
        if (fits(p, a.r, a.c)) place(sel, a.r, a.c);
        else SFX.invalid();
      }
    });
    cv.addEventListener('pointermove', e => {
      if (drag) {
        drag.x = e.clientX; drag.y = e.clientY;
        if (Math.hypot(drag.x - drag.sx, drag.y - drag.sy) > 8) drag.moved = true;
      } else hover = { x: e.clientX, y: e.clientY };
    });
    function endDrag() {
      if (!drag) return;
      const d = drag; drag = null;
      if (!d.moved && performance.now() - d.t < 350) { sel = sel === d.i ? -1 : d.i; return; }
      const p = tray[d.i]; if (!p) return;
      const a = anchorFor(p, d.x, d.y - d.lift);
      if (fits(p, a.r, a.c)) place(d.i, a.r, a.c);
      else if (d.y - d.lift < L.by + L.bs + 24) SFX.invalid();
    }
    cv.addEventListener('pointerup', endDrag);
    cv.addEventListener('pointercancel', () => { drag = null; });
    cv.addEventListener('pointerleave', () => { hover = null; });

    document.addEventListener('keydown', e => {
      if (!isOpen()) return;
      SFX.unlock();
      if (!q('bl-lbOv').hidden || !q('bl-overOv').hidden) { if (e.key === 'Escape') closeAll(); return; }
      if (!lobby.hidden) {
        if (e.key === 'Enter' && !e.target.closest('button')) { e.preventDefault(); playBtn.click(); }
        return;
      }
      if (['1', '2', '3'].includes(e.key)) { const i = +e.key - 1; if (tray[i]) { sel = i; hover = null; SFX.pickup(); } }
      else if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        if (sel < 0) sel = tray.findIndex(Boolean);
        kcur.r += e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
        kcur.c += e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        kcur.r = Math.max(0, Math.min(N - 1, kcur.r)); kcur.c = Math.max(0, Math.min(N - 1, kcur.c));
        hover = null;
      } else if ((e.key === 'Enter' || e.key === ' ') && sel >= 0 && tray[sel]) {
        e.preventDefault();
        const p = tray[sel];
        if (fits(p, kcur.r, kcur.c)) place(sel, kcur.r, kcur.c);
        else SFX.invalid();
      } else if (e.key === 'Escape') sel = -1;
    });

    /* ---------- Combo ECG Monitor ---------- */
    function ecgY(ph) {
      if (ph < .1) return 0;
      if (ph < .2) return -.13 * Math.sin((ph - .1) / .1 * Math.PI);
      if (ph < .28) return 0;
      if (ph < .3) return .18 * (ph - .28) / .02;
      if (ph < .33) return .18 - 1.18 * (ph - .3) / .03;
      if (ph < .36) return -1 + 1.42 * (ph - .33) / .03;
      if (ph < .39) return .42 - .42 * (ph - .36) / .03;
      if (ph < .5) return 0;
      if (ph < .66) return -.27 * Math.sin((ph - .5) / .16 * Math.PI);
      return 0;
    }
    const MON_COL = ['#46e08a', '#ffd23f', '#ff5a5f'];
    function monitorBox(sw) {
      const lostK = comboLost ? (performance.now() - comboLost.t0) / 1400 : 2;
      if (combo < 2 && lostK > 1) return null;
      const mw = Math.round(Math.min(168, Math.max(128, W * .36))), mh = 52;
      return { x: Math.min(W - 12 - mw, W / 2 + sw / 2 + 26), y: Math.max(12, L.by * .5 - mh / 2 - 6), w: mw, h: mh, lostK };
    }
    function drawMonitor(g, now, m) {
      if (!m) return;
      const lost = combo < 2, n = lost ? comboLost.n : combo, col = lost ? '#ff5a5f' : MON_COL[Math.min(2, msc)];
      const fk = comboFx ? (now - comboFx.t0) / 600 : 1; if (fk > 1) comboFx = null;
      const pop2 = fk < 1 ? 1 + .14 * Math.sin(Math.min(1, fk) * Math.PI) : 1;
      const bpm = Math.min(200, 66 + n * 18), alpha = lost ? Math.max(0, 1 - m.lostK) : 1;
      if (lost && m.lostK > 1) { comboLost = null; return; }
      g.save(); g.globalAlpha = alpha; g.translate(m.x + m.w / 2, m.y + m.h / 2); g.scale(pop2, pop2); g.translate(-m.w / 2, -m.h / 2);
      rr(g, 0, 0, m.w, m.h, 14); g.fillStyle = '#03181e'; g.fill();
      g.save(); rr(g, 0, 0, m.w, m.h, 14); g.clip();
      g.strokeStyle = 'rgba(70,224,138,.08)'; g.lineWidth = 1;
      for (let gx = 6; gx < m.w; gx += 8) { g.beginPath(); g.moveTo(gx, 0); g.lineTo(gx, m.h); g.stroke(); }
      for (let gy = 6; gy < m.h; gy += 8) { g.beginPath(); g.moveTo(0, gy); g.lineTo(m.w, gy); g.stroke(); }
      const tx = 56, tw = m.w - tx - 8, cy = m.h / 2 + 5, amp = m.h * .4 * (fk < 1 ? 1.25 : 1), win = 1.25;
      g.beginPath();
      for (let i = 0; i <= tw; i += 1.5) {
        const t = now / 1000 - (tw - i) / tw * win, ph = ((t * bpm / 60) % 1 + 1) % 1, yv = lost ? 0 : ecgY(ph);
        if (i) g.lineTo(tx + i, cy + yv * amp); else g.moveTo(tx + i, cy + yv * amp);
      }
      g.strokeStyle = col; g.lineWidth = 2.2; g.lineJoin = 'round'; g.shadowColor = col; g.shadowBlur = 8; g.stroke();
      const ph0 = ((now / 1000 * bpm / 60) % 1), yl = lost ? 0 : ecgY(ph0), beat = !lost && ph0 > .28 && ph0 < .42;
      g.beginPath(); g.arc(tx + tw, cy + yl * amp, beat ? 3.6 : 2.6, 0, Math.PI * 2); g.fillStyle = '#fff'; g.fill();
      g.shadowBlur = 0; g.restore();
      rr(g, 0, 0, m.w, m.h, 14); g.strokeStyle = col; g.globalAlpha = alpha * (beat ? 1 : .75); g.lineWidth = 2; g.stroke(); g.globalAlpha = alpha;
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.font = '900 10px Nunito, system-ui, sans-serif'; g.fillStyle = col; g.fillText(lost ? 'FLATLINE' : 'COMBO', 11, 18);
      g.font = `900 ${beat ? 25 : 23}px Nunito, system-ui, sans-serif`; g.fillStyle = lost ? 'rgba(255,255,255,.55)' : '#fff'; g.fillText('×' + n, 10, 42);
      if (!lost) { g.font = '800 9px Nunito, system-ui, sans-serif'; g.fillStyle = 'rgba(255,255,255,.55)'; g.textAlign = 'right'; g.fillText(bpm + ' bpm', m.w - 9, 14); }
      g.restore(); g.textAlign = 'center'; g.textBaseline = 'middle';
    }

    /* ---------- render loop (pauses cleanly when view inactive) ---------- */
    const easeBack = x => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
    function frame(now) {
      if (!running) return;
      rafId = requestAnimationFrame(frame);
      if (!W || !lobby.hidden) return;
      const g = ctx; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
      let sx = 0, sy = 0; if (shake > .2) { sx = (Math.random() - .5) * shake; sy = (Math.random() - .5) * shake; shake *= .86; }
      g.save(); g.translate(sx, sy);
      scoreShown += (score - scoreShown) * .18; if (Math.abs(score - scoreShown) < .5) scoreShown = score;
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff';
      g.font = `900 ${Math.round(Math.min(56, L.by * .55))}px Nunito, system-ui, sans-serif`;
      const sTxt = Math.round(scoreShown).toLocaleString('id-ID');
      const sw = g.measureText(sTxt).width, mon = monitorBox(sw), sx0 = mon ? Math.min(W / 2, mon.x - 14 - sw / 2) : W / 2;
      g.fillText(sTxt, sx0, L.by * .5 + 4);
      const bx = sx0, byy = L.by * .5 - Math.min(56, L.by * .55) * .62 - 4;
      g.font = '900 14px Nunito, system-ui, sans-serif'; g.fillStyle = '#ffd23f';
      if (byy > 8) g.fillText('♛ ' + best.toLocaleString('id-ID'), bx, byy);

      rr(g, L.bx - 10, L.by - 10, L.bs + 20, L.bs + 20, 20); g.fillStyle = '#06303a'; g.fill();
      rr(g, L.bx - 10, L.by - 10, L.bs + 20, L.bs + 20, 20); g.strokeStyle = 'rgba(160,240,240,.22)'; g.lineWidth = 2; g.stroke();
      const vg = g.createRadialGradient(L.bx + L.bs / 2, L.by + L.bs / 2, L.bs * .1, L.bx + L.bs / 2, L.by + L.bs / 2, L.bs * .75);
      vg.addColorStop(0, 'rgba(120,230,235,.10)'); vg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = vg; g.fillRect(L.bx, L.by, L.bs, L.bs);
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const x = L.bx + c * L.cell, y = L.by + r * L.cell; rr(g, x + 3, y + 3, L.cell - 6, L.cell - 6, L.cell * .2); g.fillStyle = 'rgba(160,240,240,.045)'; g.fill(); }
      g.strokeStyle = 'rgba(140,230,235,.22)'; g.lineWidth = 1;
      for (let i = 0; i <= N; i++) {
        const o = i * L.cell, thick = i % 4 === 0;
        for (const d of (thick ? [-2, 0, 2] : [0])) {
          g.beginPath(); g.moveTo(L.bx + o + d, L.by); g.lineTo(L.bx + o + d, L.by + L.bs); g.stroke();
          g.beginPath(); g.moveTo(L.bx, L.by + o + d); g.lineTo(L.bx + L.bs, L.by + o + d); g.stroke();
        }
      }

      let gp = null, ga = null;
      if (drag && tray[drag.i]) { gp = tray[drag.i]; ga = anchorFor(gp, drag.x, drag.y - drag.lift); }
      else if (sel >= 0 && tray[sel]) { gp = tray[sel]; ga = hover ? anchorFor(gp, hover.x, hover.y) : kcur; }
      let lines = null;
      if (gp && fits(gp, ga.r, ga.c)) lines = linesFor(gp, ga.r, ga.c);

      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const v = board[r][c]; if (v < 0) continue;
        const hit = lines && (lines.rows.includes(r) || lines.cols.includes(c));
        let wSx = 1, wSy = 1; const wt = wob.get(r * N + c);
        if (wt !== undefined) {
          const k = (now - wt) / 520;
          if (k > 1) wob.delete(r * N + c);
          else if (k > 0) { const amp = .16 * (1 - k), w2 = Math.sin(k * Math.PI * 4); wSx = 1 + amp * w2; wSy = 1 - amp * w2; }
        }
        block(hit ? gp.col : v, L.bx + c * L.cell, L.by + r * L.cell, L.cell, 1, wSx, wSy);
        if (hit) { g.globalAlpha = .25 + .15 * Math.sin(now / 90); rr(g, L.bx + c * L.cell + 2, L.by + r * L.cell + 2, L.cell - 4, L.cell - 4, L.cell * .18); g.fillStyle = '#fff'; g.fill(); g.globalAlpha = 1; }
      }

      if (gp && ga) {
        const ok = fits(gp, ga.r, ga.c);
        if (ok) gp.cells.forEach(([r, c]) => block(gp.col, L.bx + (ga.c + c) * L.cell, L.by + (ga.r + r) * L.cell, L.cell, .38));
        else if (!drag && sel >= 0 && !hover) gp.cells.forEach(([r, c]) => { const R = ga.r + r, C = ga.c + c; if (R < N && C < N) { rr(g, L.bx + C * L.cell + 3, L.by + R * L.cell + 3, L.cell - 6, L.cell - 6, 6); g.strokeStyle = 'rgba(255,90,95,.8)'; g.lineWidth = 2; g.stroke(); } });
        if (lines && (lines.rows.length || lines.cols.length)) {
          g.strokeStyle = COLORS[gp.col]; g.lineWidth = 3; g.globalAlpha = .7;
          lines.rows.forEach(R => { rr(g, L.bx - 3, L.by + R * L.cell, L.bs + 6, L.cell, 10); g.stroke(); });
          lines.cols.forEach(C => { rr(g, L.bx + C * L.cell, L.by - 3, L.cell, L.bs + 6, 10); g.stroke(); });
          g.globalAlpha = 1;
        }
      }

      clearing = clearing.filter(item => {
        const k = (now - item.t0) / 320; if (k > 1) return false;
        if (k < 0) { block(item.col, L.bx + item.C * L.cell, L.by + item.R * L.cell, L.cell); return true; }
        const s = L.cell * (1 - k * .9), x = L.bx + item.C * L.cell + (L.cell - s) / 2, y = L.by + item.R * L.cell + (L.cell - s) / 2;
        block(item.col, x, y, s, 1 - k * .6); g.globalAlpha = (1 - k) * .8; rr(g, x, y, s, s, s * .2); g.fillStyle = '#fff'; g.fill(); g.globalAlpha = 1; return true;
      });

      const deal = pop.find(p => p.kind === 'deal');
      for (let i = 0; i < 3; i++) {
        const p = tray[i]; if (!p || (drag && drag.i === i)) continue;
        const s = L.slots[i], ts = L.tcell * (sel === i ? 1.12 : 1);
        let dy = 0, a = 1; if (deal) { const k = Math.min(1, (now - deal.t0 - i * 70) / 280); dy = (1 - Math.max(0, k)) * 40; a *= Math.max(0, k); }
        if (sel === i) { rr(g, s.x - (p.wd * ts) / 2 - 10, s.y - (p.h * ts) / 2 - 10 + dy, p.wd * ts + 20, p.h * ts + 20, 14); g.fillStyle = 'rgba(255,255,255,.12)'; g.fill(); }
        p.cells.forEach(([r, c]) => block(p.col, s.x - (p.wd * ts) / 2 + c * ts, s.y - (p.h * ts) / 2 + r * ts + dy, ts, a));
      }
      pop = pop.filter(p => p.kind !== 'deal' || now - p.t0 < 600);

      if (drag && tray[drag.i]) {
        const p = tray[drag.i], s = L.cell * .96, x0 = drag.x - (p.wd * s) / 2, y0 = drag.y - drag.lift - (p.h * s) / 2;
        g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 16; g.shadowOffsetY = 8;
        p.cells.forEach(([r, c]) => block(p.col, x0 + c * s, y0 + r * s, s));
        g.shadowColor = 'transparent'; g.shadowBlur = 0; g.shadowOffsetY = 0;
      }

      parts = parts.filter(item => {
        const t = (now - item.t0) / 16; if (t > 55) return false;
        if (item.ring) { const k = t / 22; if (k > 1) return false; g.globalAlpha = 1 - k; g.strokeStyle = COLORS[item.col]; g.lineWidth = 3 * (1 - k) + .5; g.beginPath(); g.arc(item.x, item.y, L.cell * (.3 + k * .55), 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1; return true; }
        const x = item.x + item.vx * t, y = item.y + item.vy * t + .18 * t * t, a = 1 - t / 55;
        g.globalAlpha = a; g.fillStyle = COLORS[item.col]; g.beginPath(); g.arc(x, y, item.s / 2, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.arc(x - item.s * .15, y - item.s * .15, item.s * .15, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1; return true;
      });

      drawMonitor(g, now, mon);

      if (praise) {
        const k = (now - praise.t0) / 1250;
        if (k > 1) praise = null;
        else if (k >= 0) {
          const sc = k < .22 ? .3 + easeBack(k / .22) * .7 : k > .8 ? 1 + (k - .8) * .6 : 1, a = k > .8 ? (1 - k) / .2 : 1, fs = Math.round(Math.min(L.cell * 1.05, W / 7));
          g.save(); g.globalAlpha = a; g.translate(W / 2, L.by + L.bs * .52); g.rotate(-.06); g.scale(sc, sc);
          g.font = `900 ${fs}px Nunito, system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
          for (let i = 0; i < 8; i++) {
            const ang = i / 8 * Math.PI * 2 + k * 2, rad = fs * (1.2 + k * 1.4), tw = g.measureText(praise.text).width;
            const x = Math.cos(ang) * (tw / 2 + rad * .3), y = Math.sin(ang) * rad * .6, z = fs * .16 * (1 - k);
            g.fillStyle = i % 2 ? praise.c2 : '#fff'; g.beginPath();
            g.moveTo(x, y - z * 2); g.lineTo(x + z * .5, y - z * .5); g.lineTo(x + z * 2, y); g.lineTo(x + z * .5, y + z * .5);
            g.lineTo(x, y + z * 2); g.lineTo(x - z * .5, y + z * .5); g.lineTo(x - z * 2, y); g.lineTo(x - z * .5, y - z * .5); g.fill();
          }
          g.lineJoin = 'round'; g.lineWidth = fs * .26; g.strokeStyle = '#04232b'; g.strokeText(praise.text, 0, fs * .06);
          g.lineWidth = fs * .14; g.strokeStyle = praise.c2; g.strokeText(praise.text, 0, 0);
          const tg = g.createLinearGradient(0, -fs * .5, 0, fs * .5); tg.addColorStop(0, '#ffffff'); tg.addColorStop(.45, praise.c1); tg.addColorStop(1, praise.c2);
          g.fillStyle = tg; g.fillText(praise.text, 0, 0);
          g.restore();
        }
      }

      pop = pop.filter(p => {
        if (p.kind) return true;
        const k = (now - p.t0) / 1000; if (k > 1) return false; if (k < 0) return true;
        const sc = p.size * (k < .15 ? .6 + k / .15 * .55 : 1.15 - Math.min(.15, (k - .15)));
        g.globalAlpha = k > .7 ? (1 - k) / .3 : 1; g.font = `900 ${Math.round(L.cell * .5 * sc)}px Nunito, system-ui, sans-serif`;
        g.lineWidth = 6; g.strokeStyle = 'rgba(20,26,70,.85)'; g.strokeText(p.text, p.x, p.y - k * 40); g.fillStyle = p.col; g.fillText(p.text, p.x, p.y - k * 40); g.globalAlpha = 1; return true;
      });
      g.restore();
    }

    /* ---------- overlays, lobby & floating cells ---------- */
    function openOv(id) { const el = q(id); if (!el) return; el.hidden = false; el.querySelector('.bl-btn')?.focus(); }
    function closeAll() { host.querySelectorAll('.bl-ov').forEach(o => { o.hidden = true; }); }
    host.querySelectorAll('[data-bl-close]').forEach(b => { b.onclick = () => { closeAll(); if (!lobby.hidden) playBtn.focus(); }; });
    host.querySelectorAll('.bl-ov').forEach(o => o.addEventListener('click', e => { if (e.target === o) closeAll(); }));

    function refreshLobbyNumbers() {
      const inProgress = !over && score > 0;
      q('bl-lBest').textContent = fmt(best);
      playBtn.textContent = inProgress ? 'Lanjutkan' : 'Main';
      q('bl-playSub').textContent = inProgress ? `Permainan tersimpan · skor ${fmt(score)}` : '';
      newBtn.hidden = !inProgress;
      q('bl-sGames').textContent = fmt(stats.games);
      q('bl-sLines').textContent = fmt(stats.lines);
      q('bl-sCombo').textContent = stats.bestCombo ? '×' + stats.bestCombo : '0';
      q('bl-sLast').textContent = stats.last == null ? '–' : fmt(stats.last);
      const u = currentUser();
      q('bl-syncNote').textContent = u?.username
        ? `Tersinkron ke akun @${u.username} · Leaderboard CLINED aktif`
        : 'Masuk akun CLINED untuk sinkronisasi & leaderboard';
    }

    function showLobby() {
      drag = null; sel = -1; closeAll();
      refreshLobbyNumbers();
      tbL.hidden = true;
      lobby.hidden = false;
      pushBest();
      try { playBtn.focus(); } catch {}
    }

    function hideLobby() {
      lobby.hidden = true;
      tbL.hidden = false;
    }

    function drawLogo() {
      const lc = q('bl-logoCv'); if (!lc) return;
      const sc = Math.min(3, (window.devicePixelRatio || 1) * 1.5);
      lc.width = 200 * sc; lc.height = 190 * sc;
      const g = lc.getContext('2d'); g.scale(sc, sc); const t = 56;
      [[72, 8, 0], [12, 66, 4], [72, 66, 6], [132, 66, 7], [72, 124, 3]].forEach(([x, y, col]) => g.drawImage(sprite(col, t * sc / (dpr || 1)), x, y, t, t));
      g.fillStyle = '#fff';
      const star = (x, y, z) => { g.beginPath(); g.moveTo(x, y - z); g.lineTo(x + z * .25, y - z * .25); g.lineTo(x + z, y); g.lineTo(x + z * .25, y + z * .25); g.lineTo(x, y + z); g.lineTo(x - z * .25, y + z * .25); g.lineTo(x - z, y); g.lineTo(x - z * .25, y - z * .25); g.fill(); };
      star(176, 26, 10); star(24, 32, 7); g.globalAlpha = .7; g.beginPath(); g.arc(160, 44, 3, 0, 7); g.fill(); g.globalAlpha = 1;
    }

    (() => {
      const M = [
        '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="#e5484d"/><circle cx="20" cy="20" r="9" fill="#ff8a90"/></svg>',
        '<svg viewBox="0 0 60 26"><rect x="2" y="3" width="56" height="20" rx="10" fill="#2fb87e"/><path d="M58 13c6 0 6 8 12 8" stroke="#2fb87e" stroke-width="2" fill="none"/><circle cx="18" cy="13" r="3" fill="#1d7f56"/></svg>',
        '<svg viewBox="0 0 44 44"><g stroke="#9a6cf0" stroke-width="3" stroke-linecap="round"><path d="M22 2v6M22 36v6M2 22h6M36 22h6M8 8l4 4M32 32l4 4M36 8l-4 4M8 36l4-4"/></g><circle cx="22" cy="22" r="13" fill="#9a6cf0"/><circle cx="18" cy="18" r="3" fill="#c7b0fa"/></svg>',
        '<svg viewBox="0 0 30 80"><g fill="none" stroke="#5ec8ef" stroke-width="3"><path d="M5 0c20 20 20 30 0 40s-20 30 0 40M25 0C5 20 5 30 25 40s20 30 0 40"/></g><g stroke="#f2c94c" stroke-width="2"><path d="M9 10h12M7 30h16M9 50h12M7 70h16"/></g></svg>'
      ];
      let h = '';
      for (let i = 0; i < 14; i++) h += M[i % M.length].replace('<svg ', `<svg style="left:${(i * 7.3 + 3) % 100}%;--s:${22 + (i * 13) % 30}px;--d:${16 + (i * 5) % 12}s;--dl:-${(i * 3.1) % 16}s" `);
      q('bl-fl').innerHTML = h;
    })();

    let armed = 0;
    function confirmRestart() {
      const b = q('bl-restartBtn');
      if (performance.now() - armed < 2500) return true;
      armed = performance.now(); b.textContent = '?'; b.style.background = '#ff5a5f';
      b.setAttribute('aria-label', 'Ketuk lagi untuk mulai ulang');
      setTimeout(() => { b.textContent = '↻'; b.style.background = ''; b.setAttribute('aria-label', 'Mulai ulang'); }, 2500);
      return false;
    }

    function syncSfxButtons() {
      const m = SFX.isMuted();
      [q('bl-sfxBtn'), q('bl-lbSfxBtn')].forEach(b => {
        if (!b) return;
        b.textContent = m ? '🔇' : '🔊';
        b.classList.toggle('muted', m);
        b.setAttribute('aria-pressed', String(!m));
        b.setAttribute('aria-label', m ? 'Suara mati (ketuk untuk nyalakan)' : 'Suara aktif (ketuk untuk bisukan)');
      });
    }
    syncSfxButtons();
    [q('bl-sfxBtn'), q('bl-lbSfxBtn')].forEach(b => {
      if (b) b.onclick = () => { SFX.toggleMute(); syncSfxButtons(); };
    });
    host.addEventListener('pointerdown', () => SFX.unlock(), { capture: true, passive: true });
    host.addEventListener('touchstart', () => SFX.unlock(), { capture: true, passive: true });

    q('bl-playBtn').onclick = () => { SFX.unlock(); SFX.uiTap(); if (over) { freshGame({ writeTombstone: true }); saveSessionNow(); } hideLobby(); scoreShown = score; };
    q('bl-newBtn').onclick = () => { SFX.unlock(); SFX.uiTap(); endGameStats(); freshGame({ writeTombstone: true }); saveSessionNow(); hideLobby(); scoreShown = 0; };
    q('bl-againBtn').onclick = () => { SFX.unlock(); SFX.uiTap(); closeAll(); freshGame({ writeTombstone: true }); saveSessionNow(); scoreShown = 0; };
    q('bl-homeBtn').onclick = () => { SFX.uiTap(); saveSessionNow(); saveStatsNow(); showLobby(); };
    q('bl-overLobbyBtn').onclick = () => { SFX.uiTap(); freshGame({ writeTombstone: true }); showLobby(); };
    q('bl-restartBtn').onclick = () => { SFX.unlock(); if (over || score === 0 || confirmRestart()) { SFX.uiTap(); if (!over) endGameStats(); closeAll(); freshGame({ writeTombstone: true }); saveSessionNow(); scoreShown = 0; } else SFX.invalid(); };
    q('bl-lbBtn').onclick = () => { SFX.unlock(); SFX.uiTap(); openOv('bl-lbOv'); fetchLeaderboard(true); };
    q('bl-overLbBtn').onclick = () => { SFX.unlock(); SFX.uiTap(); closeAll(); openOv('bl-lbOv'); fetchLeaderboard(true); };
    q('bl-lbRefreshBtn').onclick = () => { SFX.uiTap(); fetchLeaderboard(true); };
    q('bl-exitMgBtn').onclick = () => {
      SFX.uiTap();
      onLeave();
      try { window.show?.('miniGamesPage', { force: true }); window.scrollTo(0, 0); } catch {}
    };

    /* ---------- Account Isolation & Live Cross-Device Sync Reactivity ---------- */
    function rebindAccountState() {
      const uid = currentUid();
      const switched = uid !== boundUid;
      if (switched) {
        boundUid = uid;
        LB.rows = []; LB.myRank = null; LB.myBest = 0; LB.ready = false; LB.err = ''; LB.lastPushedSig = ''; LB.fetchedAt = 0;
        if (!loadFromStorage()) freshGame();
        scoreShown = score;
        if (isOpen()) showLobby();
        return;
      }
      // Same account: monotonically merge any remote stats & update session if on lobby
      const remoteStats = Storage.readStats();
      stats = mergeStatsMonotonic(stats, remoteStats);
      best = Math.max(best, stats.best);
      if (!lobby.hidden && !drag) {
        const sess = Storage.readSession();
        if (sess) loadFromStorage();
        else if (score > 0 && !over) freshGame();
      }
      if (isOpen() && !lobby.hidden) refreshLobbyNumbers();
    }

    window.addEventListener('clined:auth-ready', rebindAccountState);
    window.addEventListener('clined:sync-applied', e => {
      const keys = e?.detail?.keys;
      const relevant = !Array.isArray(keys) || !keys.length || e?.detail?.full || keys.includes(STATS_KEY) || keys.includes(SESSION_KEY);
      if (relevant) rebindAccountState();
    });
    window.addEventListener('online', () => { if (isOpen()) pushBest(); });
    window.addEventListener('resize', () => { if (isOpen()) layout(); });

    function startLoop() {
      if (running) return;
      running = true;
      rafId = requestAnimationFrame(frame);
    }
    function stopLoop() {
      running = false;
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    }

    function onEnter() {
      const page = document.getElementById('blokLysisPage');
      page?.classList.remove('motion-page-enter');
      try {
        document.documentElement.classList.add('bl-open');
        document.body.classList.add('quiz-context');
      } catch {}
      layout();
      drawLogo();
      syncSfxButtons();
      const uid = currentUid();
      if (uid !== boundUid) {
        boundUid = uid;
        LB.rows = []; LB.myRank = null; LB.myBest = 0; LB.ready = false; LB.lastPushedSig = '';
      }
      if (!loadFromStorage()) freshGame();
      scoreShown = score;
      showLobby();
      startLoop();
      if (document.fonts) document.fonts.ready.then(() => { sprites.clear(); drawLogo(); }).catch(() => {});
      try { window.CLINED_ONLINE_SYNC?.sync?.(); } catch {}
    }

    function onLeave() {
      stopLoop();
      if (!over && score > 0) saveSessionNow();
      saveStatsNow();
      pushBest();
      closeAll();
      try {
        document.documentElement.classList.remove('bl-open');
        document.body.classList.remove('quiz-context');
      } catch {}
    }

    layout();
    drawLogo();
    if (!loadFromStorage()) freshGame();
    scoreShown = score;
    showLobby();
    return { onEnter, onLeave, isPlaying: () => isOpen() && lobby.hidden && !over };
  }

  let game = null;
  function open() {
    if (!game) game = createGame();
    try { window.show?.('blokLysisPage', { force: true }); window.scrollTo(0, 0); } catch (e) { console.warn(e); }
    game?.onEnter();
  }

  window.addEventListener('clined:view-change', e => {
    if (!game) return;
    if (e.detail === 'blokLysisPage') game.onEnter();
    else game.onLeave();
  });

  window.CLINED_BLOK_LYSIS = { open, Storage, Dealer, SFX, mergeStatsMonotonic, sanitizeStats, isPlaying: () => !!game?.isPlaying() };
})();
