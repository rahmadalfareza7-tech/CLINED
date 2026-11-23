/* CLINED — Teman & Duel. Realtime lewat Server-Sent Events (/api/stream). */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = (m, e) => window.showToast?.(m, !!e);
  const L5 = 'ABCDEF';
  const PREF = 'clined_duel_pref';
  const CLAIM_KEY = 'clined_duel_claims_v1';
  const DIA_KEY = 'clined_diamonds_v1';
  const S = {
    tab: 'status', hubTab: 'chat', openC: new Set(), comments: {}, feed: null, F: null,
    mine: [], invites: [], openRooms: [], adminRooms: [], myStats: null, h2h: {}, leaderboard: [],
    blocks: [], duelBanks: [], block: '', selectedBankIds: [], bankPickerOpen: false, bankSearch: '', bankAllBlocks: false,
    count: 10, sec: 30, mode: 'classic', wager: 0, isPublic: true, maxPlayers: 2,
    prizes: { first: 0, second: 0, third: 0, others: 0 },
    D: null, fb: null, busy: false, tick: null, skew: 0, sentFor: -1,
    emotes: {}, oppFlash: null, mpExpandAll: false, inspectSearch: ''
  };
  const isAdmin = () => { try { return typeof authCurrentUser === 'function' && authCurrentUser()?.role === 'admin'; } catch { return false; } };
  const cleanPrizeNum = v => Math.max(0, Math.min(10000, Math.floor(Number(v) || 0)));
  const activePrizes = () => {
    const p = S.prizes || {};
    const first = cleanPrizeNum(p.first), second = cleanPrizeNum(p.second), third = cleanPrizeNum(p.third), others = cleanPrizeNum(p.others);
    return (first || second || third || others) ? { first, second, third, others } : null;
  };
  const prizeSummaryText = p => {
    if (!p) return '';
    const parts = [];
    if (p.first) parts.push(`🥇${p.first}`);
    if (p.second) parts.push(`🥈${p.second}`);
    if (p.third) parts.push(`🥉${p.third}`);
    if (p.others) parts.push(`4+:${p.others}`);
    return parts.join(' ');
  };
  const prizePill = p => {
    const txt = prizeSummaryText(p);
    return txt ? `<span class="duel-tag prize" title="Hadiah Diamond Otomatis">💎 ${txt}</span>` : '';
  };
  const MOODS = [['mantap', '😎', 'Mantap'], ['lumayan', '🙂', 'Lumayan'], ['berat', '😵', 'Berat'], ['semangat', '🔥', 'Semangat'], ['doa', '🙏', 'Doa']];
  const REACTS = ['🔥', '👏', '💪', '😂', '❤️'];
  const SECS = [[0, '∞'], [15, '15'], [30, '30'], [45, '45'], [60, '60']];
  const MODES = [
    ['classic', '🏆', 'Mode Klasik', 'Adu skor tertinggi & waktu tercepat sampai soal habis'],
    ['sudden_death', '💀', 'Sudden Death 3 ❤️', '3 nyawa (❤️❤️❤️) — salah 3x langsung Knockout!']
  ];
  const WAGERS = [
    [0, '🛡️', 'Santai', '0 EXP', 'Main fokus tanpa taruhan'],
    [20, '💰', 'Taruhan', '20 EXP', 'Menang +50 EXP & +2 💎'],
    [50, '🔥', 'High Stakes', '50 EXP', 'Menang +80 EXP & +3 💎']
  ];
  const DUEL_EMOTES = [
    ['fire', '🔥', 'Gas terus!'],
    ['hard', '😱', 'Soal sulit!'],
    ['fast', '⚡', 'Kejar kalau bisa!'],
    ['brain', '🧠', 'Hafal nih!'],
    ['skull', '💀', 'Awas nyawa!'],
    ['gg', '🙏', 'GGWP!']
  ];
  const BLOCK_BTN_MAP = {
    BM1: 'openBlokBm1', BM2: 'openBlokBm2', HNC: 'openBlokHnc',
    MP1: 'openBlokMp1', MP2: 'openBlokMp2', MPT: 'openBlokMpt',
    MUSKULOSKELETAL: 'openBlokMuskuloskeletal', RESPIRATORY: 'openBlokRespiratory',
    KARDIOLOGI: 'openBlokKardiologi', HEMATOLOGI: 'openBlokHematologi',
    GIT: 'openBlokGit', FORENSIK: 'openBlokForensik', GINJAL: 'openBlokGinjal',
    ENDOKRINE: 'openBlokEndokrine', REPRODUKSI: 'openBlokReproduksi',
    SSP: 'openBlokSsp', 'PANCA INDRA': 'openBlokPancaIndra',
    KEDKOM: 'openBlokKedkom', KEDKEL: 'openBlokKedkel', MULSIS: 'openBlokMulsis'
  };
  const RANK_TIERS = [
    { key: 'bronze',   name: 'Bronze',   sub: 'Koas Muda',         icon: '🥉', minRp: 0,    maxRp: 199,      color: '#cd7f32', divisions: 3 },
    { key: 'silver',   name: 'Silver',   sub: 'Residen Tangguh',   icon: '🥈', minRp: 200,  maxRp: 449,      color: '#94a3b8', divisions: 3 },
    { key: 'gold',     name: 'Gold',     sub: 'Spesialis Arena',   icon: '🥇', minRp: 450,  maxRp: 799,      color: '#facc15', divisions: 3 },
    { key: 'platinum', name: 'Platinum', sub: 'Konsultan Unggul',  icon: '💎', minRp: 800,  maxRp: 1199,     color: '#2dd4bf', divisions: 3 },
    { key: 'diamond',  name: 'Diamond',  sub: 'Gladiator Klinik',  icon: '🔮', minRp: 1200, maxRp: 1699,     color: '#38bdf8', divisions: 3 },
    { key: 'master',   name: 'Master',   sub: 'Grandmaster Medis', icon: '🔥', minRp: 1700, maxRp: 2299,     color: '#ec4899', divisions: 3 },
    { key: 'mythic',   name: 'Mythic',   sub: 'Dewa Klinik',       icon: '👑', minRp: 2300, maxRp: Infinity, color: '#fde047', divisions: 1 }
  ];
  function rankFromRp(rawRp = 0) {
    const rp = Math.max(0, Math.floor(Number(rawRp) || 0));
    let idx = 0;
    for (let i = 0; i < RANK_TIERS.length; i++) if (rp >= RANK_TIERS[i].minRp) idx = i;
    const tier = RANK_TIERS[idx];
    const nextTier = RANK_TIERS[idx + 1] || null;
    let division = 'Glory', stars = 1, progressPct = 100;
    if (tier.divisions === 3 && Number.isFinite(tier.maxRp)) {
      const span = tier.maxRp - tier.minRp + 1;
      const within = Math.max(0, rp - tier.minRp);
      const divSpan = span / 3;
      const divIdx = Math.min(2, Math.floor(within / divSpan));
      division = ['III', 'II', 'I'][divIdx];
      const withinDiv = within - divIdx * divSpan;
      stars = Math.min(3, Math.max(1, Math.floor((withinDiv / divSpan) * 3) + 1));
      progressPct = Math.min(100, Math.max(0, Math.round((within / span) * 100)));
    } else {
      stars = Math.max(1, Math.floor((rp - tier.minRp) / 50) + 1);
      progressPct = 100;
    }
    const fullName = tier.divisions > 1 ? `${tier.name} ${division}` : 'Mythic Glory';
    const nextRp = nextTier ? nextTier.minRp : null;
    const neededRp = nextRp != null ? Math.max(0, nextRp - rp) : 0;
    return {
      rp, tierIdx: idx, key: tier.key, name: tier.name, division, fullName, sub: tier.sub,
      icon: tier.icon, color: tier.color, stars, minRp: tier.minRp, nextRp, neededRp,
      nextTierName: nextTier ? `${nextTier.icon} ${nextTier.name} III` : '👑 Puncak Mythic Glory',
      progressPct
    };
  }
  const getRank = obj => (obj && obj.fullName ? obj : rankFromRp(obj?.rp ?? 0));
  const rankStarsHTML = rk => rk.key === 'mythic'
    ? `<span class="duel-stars mythic">★ ×${rk.stars}</span>`
    : `<span class="duel-stars">${'★'.repeat(rk.stars || 1)}${'☆'.repeat(Math.max(0, 3 - (rk.stars || 1)))}</span>`;
  const rankPill = (rawRank, showRp = true) => {
    const rk = getRank(rawRank);
    return `<span class="duel-rank-pill tier-${esc(rk.key)}">${rk.icon} <b>${esc(rk.fullName)}</b>${showRp ? ` <small>${rk.rp} RP</small>` : ''}</span>`;
  };
  function openRankModal() {
    document.querySelector('.duel-rank-layer')?.remove();
    const myRk = getRank(S.myStats?.rank || { rp: S.myStats?.rp || 0 });
    const layer = document.createElement('div');
    layer.className = 'cdlg-layer duel-rank-layer';
    const rows = RANK_TIERS.map(t => {
      const isMe = t.key === myRk.key;
      const range = Number.isFinite(t.maxRp) ? `${t.minRp} – ${t.maxRp} RP` : `${t.minRp}+ RP`;
      const divs = t.divisions === 3 ? 'Divisi III → II → I' : 'Mythic Glory ★';
      return `<div class="duel-tier-row tier-${t.key}${isMe ? ' current' : ''}">
        <span class="duel-tier-ico">${t.icon}</span>
        <div class="duel-tier-info">
          <b>${esc(t.name)} <small>(${esc(t.sub)})</small> ${isMe ? '<em class="duel-tier-you">📍 Rank Kamu</em>' : ''}</b>
          <span>${divs} • <strong>${range}</strong></span>
        </div>
      </div>`;
    }).join('');
    layer.innerHTML = `<div class="cdlg-card duel-rank-modal" role="dialog" aria-modal="true" aria-labelledby="rkModalT">
      <div class="cdlg-head"><span class="cdlg-ico" aria-hidden="true">${myRk.icon}</span><h3 class="cdlg-title" id="rkModalT">Sistem Rank &amp; Tier Arena Duel</h3></div>
      <div class="cdlg-body duel-rank-modal-body">
        <div class="duel-rank-mybox tier-${esc(myRk.key)}">
          <div class="duel-rank-myhead">
            <span class="duel-rank-bigico">${myRk.icon}</span>
            <div>
              <small>RANK SAAT INI</small>
              <b>${esc(myRk.fullName)} • ${myRk.rp} RP</b>
              <span>${esc(myRk.sub)} • ${myRk.nextRp ? `Kurang ${myRk.neededRp} RP ke ${myRk.nextTierName}` : 'Puncak Tertinggi Arena!'}</span>
            </div>
          </div>
        </div>
        <div class="duel-rank-rules">
          <b>⚡ Aturan Perolehan Rank Points (RP):</b>
          <ul>
            <li>🏆 <b>Menang Duel:</b> <code>+30 RP</code> dasar + bonus Knockout Sudden Death (<code>+12 RP</code>) + bonus Win Streak (s/d <code>+15 RP</code>) + bonus Taruhan (s/d <code>+10 RP</code>).</li>
            <li>🤝 <b>Hasil Seri (Draw):</b> <code>+8 RP</code> untuk kedua petarung.</li>
            <li>🛡️ <b>Proteksi Koas Muda (Bronze):</b> Di tier Bronze (<code>0–199 RP</code>), kalah duel <b>tidak mengurangi RP (0 RP)</b>!</li>
            <li>⚔️ <b>Tier Silver ke Atas:</b> Kalah mengurangi <code>-12</code> s/d <code>-18 RP</code>.</li>
          </ul>
        </div>
        <div class="duel-tier-list">${rows}</div>
      </div>
      <div class="cdlg-actions"><button type="button" class="primary" data-rk-close>Siap Bertarung! ⚔️</button></div>
    </div>`;
    const close = () => { layer.classList.remove('show'); setTimeout(() => layer.remove(), 220); };
    layer.addEventListener('click', e => { if (e.target === layer || e.target.closest('[data-rk-close]')) close(); });
    document.body.appendChild(layer);
    requestAnimationFrame(() => layer.classList.add('show'));
  }

  try {
    const saved = JSON.parse(localStorage.getItem(PREF) || '{}');
    if (saved && typeof saved === 'object') {
      if (saved.block) S.block = String(saved.block);
      else if (typeof saved.bank === 'string' && saved.bank.startsWith('block:')) S.block = saved.bank.slice(6);
      if ([5, 10, 15, 20, 30].includes(Number(saved.count))) S.count = Number(saved.count);
      if ([0, 15, 30, 45, 60].includes(Number(saved.sec))) S.sec = Number(saved.sec);
      if (['classic', 'sudden_death'].includes(saved.mode)) S.mode = saved.mode;
      if ([0, 20, 50].includes(Number(saved.wager))) S.wager = Number(saved.wager);
      if (typeof saved.isPublic === 'boolean') S.isPublic = saved.isPublic;
      const mp = Math.floor(Number(saved.maxPlayers));
      if (Number.isFinite(mp) && mp >= 2 && mp <= 100) S.maxPlayers = mp;
      if (saved.prizes && typeof saved.prizes === 'object') {
        S.prizes = {
          first: cleanPrizeNum(saved.prizes.first),
          second: cleanPrizeNum(saved.prizes.second),
          third: cleanPrizeNum(saved.prizes.third),
          others: cleanPrizeNum(saved.prizes.others)
        };
      }
    }
  } catch {}

  const getDiamonds = () => {
    try {
      const u = typeof authCurrentUser === 'function' ? authCurrentUser() : null;
      if (u && u.role === 'admin') return '∞';
      return Math.max(0, parseInt(localStorage.getItem(DIA_KEY) || '0', 10) || 0);
    } catch { return 0; }
  };
  const addDiamonds = n => {
    try {
      const u = typeof authCurrentUser === 'function' ? authCurrentUser() : null;
      if (u && u.role === 'admin') return;
      const cur = Math.max(0, parseInt(localStorage.getItem(DIA_KEY) || '0', 10) || 0);
      const next = Math.max(0, cur + n);
      localStorage.setItem(DIA_KEY, String(next));
      document.querySelectorAll('[data-diamond-count]').forEach(el => { el.textContent = String(next); });
    } catch {}
  };
  const claimDuelReward = D => {
    if (!D || D.status !== 'finished' || !D.result || D.isSpectator) return null;
    const R = D.result, win = R.winnerId === D.me.id, draw = !R.winnerId;
    const wager = Number(D.wager) || 0;
    const mode = D.mode || 'classic';
    const cardBonusXp = win ? (window.CLINED_CARDS?.getBonusDuelXp?.() || 0) : 0;
    const xpGain = win ? (30 + wager + cardBonusXp) : draw ? 10 : 0;
    const customPrizeDia = Math.max(0, Math.floor(Number(R.myPrizeDiamonds) || 0));
    const diaGain = D.prizes ? 0 : (win ? (1 + (wager >= 50 ? 2 : wager >= 20 ? 1 : 0) + (mode === 'sudden_death' ? 1 : 0)) : 0);
    try {
      const claims = JSON.parse(localStorage.getItem(CLAIM_KEY) || '{}') || {};
      if (!claims[D.id]) {
        claims[D.id] = { at: Date.now(), xpGain, cardBonusXp, diaGain, customPrizeDia, win, draw };
        localStorage.setItem(CLAIM_KEY, JSON.stringify(claims));
        if (diaGain > 0) addDiamonds(diaGain);
        if (xpGain > 0 && typeof window.addXP === 'function') {
          try {
            // Server sudah mencatat 30+wager ke xp_events saat finalize(); client cukup mencatat bonus Kartu Andalan dengan kind:'duel'
            if (cardBonusXp > 0) {
              window.CLINED_XP?.enqueue?.('duel', `${D.id}:cardbonus`.slice(0, 80), cardBonusXp);
            }
            window.addXP(xpGain, win ? `Menang Duel Klinik (+${xpGain} EXP)` : `Seri Duel Klinik (+${xpGain} EXP)`, {
              kind: 'userbank', // tidak di-enqueue ulang ke server karena 30+wager sudah dicatat server
              ref: `duel-local:${D.id}`.slice(0, 80),
              silent: false
            });
          } catch {}
        }
      }
    } catch {}
    return { xpGain, cardBonusXp, diaGain, customPrizeDia, wager };
  };

  async function api(path, opt = {}) {
    const r = await fetch(path, { credentials: 'same-origin', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, ...opt, body: opt.body ? JSON.stringify(opt.body) : undefined });
    const t = await r.text(); let d = {}; try { d = t ? JSON.parse(t) : {}; } catch {}
    if (!r.ok) { const e = new Error(d.error || `Permintaan gagal (${r.status}).`); e.status = r.status; throw e; }
    return d;
  }
  const loggedIn = () => { try { return typeof authCurrentUser === 'function' && !!authCurrentUser(); } catch { return false; } };
  const activeView = () => document.querySelector('.view.active')?.id || '';
  const fmtMs = ms => { const s = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

  /* ───────── kerangka halaman + menu ───────── */
  function ensureShell() {
    if (!$('socialPage') || !$('hubPage')) {
      document.getElementById('socialPage')?.remove(); document.getElementById('duelPage')?.remove(); document.getElementById('hubPage')?.remove();
      const anchor = $('analytics') || document.querySelector('main .view:last-of-type');
      const mk = (id, html) => { const s = document.createElement('section'); s.id = id; s.className = 'view'; s.innerHTML = html; anchor?.parentNode ? anchor.parentNode.insertBefore(s, anchor) : document.body.appendChild(s); };
      mk('socialPage', '<div class="card ub-head"><div class="topline"><button class="back" type="button" data-soc-home>‹ Beranda</button><b>⚔️ Arena Duel Klinik</b></div></div><div id="socialBody" class="soc-body"></div>');
      mk('hubPage', '<div class="card ub-head"><div class="topline"><button class="back" type="button" data-soc-home>‹ Beranda</button><b>👥 Sosial</b></div></div><div id="hubBody" class="soc-body"></div>');
      mk('duelPage', '<div class="card ub-head"><div class="topline"><button class="back" type="button" data-soc-lobby>‹ Arena Duel</button><b id="duelTitle">⚔️ Duel</b></div></div><div id="duelBody" class="soc-body"></div>');
    }
    const ra = document.querySelector('#result .result-actions');
    if (ra && !$('shareStatusBtn')) {
      const b = document.createElement('button');
      b.className = 'secondary'; b.id = 'shareStatusBtn'; b.type = 'button'; b.textContent = '📣 Bagikan status';
      ra.insertBefore(b, ra.firstChild);
    }
    const row = $('homeQuickRow');
    if (row && !$('socialBtn')) {
      const b = document.createElement('button');
      b.className = 'card home-materials-card home-materials-link home-quick-tile'; b.id = 'socialBtn'; b.type = 'button';
      b.setAttribute('aria-label', 'Buka Duel');
      b.innerHTML = '<span class="home-materials-leading"><span class="home-materials-icon">⚔️</span><span><b>Duel</b></span></span><i class="soc-dot" id="socDot" hidden>0</i>';
      row.appendChild(b);
    }
    if (row && !$('hubBtn')) {
      const h = document.createElement('button');
      h.className = 'card home-materials-card home-materials-link home-quick-tile'; h.id = 'hubBtn'; h.type = 'button';
      h.setAttribute('aria-label', 'Buka Sosial');
      h.innerHTML = '<span class="home-materials-leading"><span class="home-materials-icon">👥</span><span><b>Sosial</b></span></span><i class="soc-dot" id="hubDot" hidden>0</i>';
      row.appendChild(h);
    }
  }
  const setDot = (id, n) => { const d = $(id); if (d) { d.textContent = n > 9 ? '9+' : n; d.hidden = !n; } };
  const dot = () => { setDot('socDot', S.invites.length + (S.openRooms?.length || 0)); setDot('hubDot', (S.F?.incoming?.length || 0) + (window.CLINED_CHAT?.unread || 0)); };
  window.addEventListener('clined:chat-unread', dot);

  /* ───────── data ───────── */
  async function loadLobby() {
    const [f, a] = await Promise.all([api('/api/friends'), api('/api/duels/active')]);
    S.F = f;
    S.mine = a.mine || [];
    S.invites = a.invites || [];
    S.openRooms = a.openRooms || [];
    S.adminRooms = Array.isArray(a.adminRooms) ? a.adminRooms : [];
    S.myStats = a.myStats || { wins: 0, losses: 0, draws: 0, total: 0, rp: 0, winRate: 0, streak: 0, bestStreak: 0, title: { icon: '🗡️', name: 'Petarung Baru' }, rank: rankFromRp(0) };
    S.h2h = a.h2h || {};
    S.leaderboard = a.leaderboard || [];
    if (Array.isArray(a.duelBlocks) && a.duelBlocks.length) {
      S.blocks = a.duelBlocks;
      if (!S.blocks.some(b => b.block === S.block)) S.block = S.blocks[0]?.block || '';
    }
    if (Array.isArray(a.duelBanks)) {
      S.duelBanks = a.duelBanks;
      const validIds = new Set(S.duelBanks.map(b => b.id));
      S.selectedBankIds = S.selectedBankIds.filter(id => validIds.has(id));
    }
    dot();
    syncWaitingFloat();
  }

  let waitFloatTimer = null;
  function playMatchChime() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      const now = ctx.currentTime;
      [[587.33, 0], [880, 0.12]].forEach(([freq, offset]) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + offset);
        gain.gain.setValueAtTime(0.001, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.14, now + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.28);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(now + offset); osc.stop(now + offset + 0.3);
      });
      setTimeout(() => { try { ctx.close(); } catch {} }, 600);
    } catch {}
  }

  function getBackgroundDuel() {
    const list = Array.isArray(S.mine) ? S.mine : [];
    const active = list.find(d => d && d.status === 'active');
    if (active) return active;
    const waiting = list.find(d => d && d.status === 'waiting' && (d.isHost !== false || d.isMultiplayer));
    if (waiting) return waiting;
    if (S.D && (S.D.status === 'active' || (S.D.status === 'waiting' && (S.D.isHost !== false || S.D.isMultiplayer)))) return S.D;
    return null;
  }

  function syncWaitingFloat() {
    const existing = $('duelWaitFloat');
    const view = activeView();
    const d = loggedIn() ? getBackgroundDuel() : null;
    if (!d || view === 'duelPage') {
      existing?.remove();
      document.body.classList.remove('has-duel-wait-float');
      if (view === 'duelPage') $('duelMatchedLayer')?.remove();
      if (waitFloatTimer) { clearInterval(waitFloatTimer); waitFloatTimer = null; }
      return;
    }
    const isAct = d.status === 'active';
    const since = Number(d.createdAt) || Date.now();
    const mp = !!d.isMultiplayer;
    const key = `${d.id}:${d.status}:${d.bank?.name || ''}:${d.opponent?.name || ''}:${d.playerCount || 1}:${d.maxPlayers || 2}`;
    let el = existing;
    if (!el) {
      el = document.createElement('div');
      el.id = 'duelWaitFloat';
      el.className = 'duel-wait-float';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    document.body.classList.add('has-duel-wait-float');
    el.classList.toggle('is-active', isAct);
    if (el.dataset.key !== key) {
      el.dataset.key = key;
      el.dataset.duelId = d.id;
      el.dataset.since = String(since);
      const blk = esc(d.bank?.name || 'Arena Duel');
      const subAct = mp ? `👥 ${d.playerCount || 2} Pemain • ${blk}` : `vs ${esc(d.opponent?.name || 'Lawan')} • ${blk}`;
      const subWait = mp ? `👥 ${d.playerCount || 1}/${d.maxPlayers || 2} Pemain • ${blk} • ${esc(d.code)}` : `${blk} • ${esc(d.code)}`;
      el.innerHTML = isAct
        ? `<div class="duel-wf-left"><span class="duel-wf-dot hot"></span><div class="duel-wf-txt"><b>⚔️ ${mp ? 'Race Multiplayer Dimulai!' : 'Duel Sedang Berlangsung!'}</b><small>${subAct}</small></div></div>
           <div class="duel-wf-btns"><button type="button" class="primary duel-wf-go" data-soc-open="${esc(d.id)}">⚡ Masuk</button></div>`
        : `<div class="duel-wf-left"><span class="duel-wf-dot"></span><div class="duel-wf-txt"><b>⏳ ${mp ? `Room ${d.playerCount || 1}/${d.maxPlayers}` : 'Menunggu Lawan'} <em id="duelWfClock">0:00</em></b><small>${subWait}</small></div></div>
           <div class="duel-wf-btns"><button type="button" class="secondary duel-wf-open" data-soc-open="${esc(d.id)}">Buka</button><button type="button" class="secondary duel-wf-cancel" data-soc-cancel-wait="${esc(d.id)}" aria-label="${d.isHost ? 'Batalkan room' : 'Keluar room'}">✕</button></div>`;
    }
    const updateClock = () => {
      const clk = $('duelWfClock');
      if (!clk) return;
      const base = Number(el.dataset.since) || Date.now();
      clk.textContent = fmtMs(Math.max(0, Date.now() - base));
    };
    updateClock();
    if (!isAct && !waitFloatTimer) {
      waitFloatTimer = setInterval(() => {
        if (!$('duelWaitFloat') || !$('duelWfClock')) { clearInterval(waitFloatTimer); waitFloatTimer = null; return; }
        updateClock();
      }, 1000);
    } else if (isAct && waitFloatTimer) {
      clearInterval(waitFloatTimer); waitFloatTimer = null;
    }
  }

  function openStudyWhileWaiting(duel) {
    const d = duel || S.D || getBackgroundDuel();
    if (d && !S.mine.some(x => x.id === d.id)) S.mine = [d, ...S.mine];
    const rawId = String(d?.bank?.id || '');
    const blk = rawId.startsWith('block:') ? rawId.slice(6).toUpperCase() : String(S.block || '').toUpperCase();
    const btnId = BLOCK_BTN_MAP[blk];
    const btn = btnId ? $(btnId) : null;
    if (btn && !btn.classList.contains('locked-node')) {
      btn.click();
    } else if ($('uabPage')) {
      window.show?.('uabPage');
    } else {
      window.show?.('home');
    }
    syncWaitingFloat();
    toast('📚 Ruang duel tetap aktif! Kerjakan soal dulu — kamu otomatis dipanggil saat pertarungan dimulai.');
  }

  function showDuelMatchedModal(m) {
    if (!m || !m.id) return;
    $('duelMatchedLayer')?.remove();
    playMatchChime();
    const isMp = Number(m.maxPlayers || 2) > 2 || Number(m.playerCount || 0) > 2;
    const oppName = esc(m.from?.name || (isMp ? 'Host' : 'Lawan'));
    const oppUser = m.from?.username ? ` (@${esc(m.from.username)})` : '';
    const bankLabel = esc(m.bankName || 'Arena Duel');
    const modeLabel = m.mode === 'sudden_death' ? '💀 Sudden Death 3❤️' : '🏆 Mode Klasik';
    const layer = document.createElement('div');
    layer.id = 'duelMatchedLayer';
    layer.className = 'cdlg-layer duel-matched-layer';
    layer.innerHTML = `<div class="cdlg-card duel-matched-card" role="dialog" aria-modal="true" aria-labelledby="dmTitle">
      <div class="duel-matched-ico">⚔️</div>
      <h3 class="duel-matched-title" id="dmTitle">Lawan Ditemukan!</h3>
      <p class="duel-matched-sub"><b>${oppName}</b>${oppUser} bergabung ke ruang duelmu!</p>
      <div class="duel-matched-meta">
        <span>📚 ${bankLabel}</span>
        ${m.total ? `<span>📝 ${Number(m.total)} soal</span>` : ''}
        <span>${modeLabel}</span>
      </div>
      <p class="duel-matched-note">💡 Progress soal yang sedang kamu kerjakan tetap tersimpan otomatis.</p>
      <div class="duel-matched-actions">
        <button type="button" class="primary soc-big duel-matched-go" data-dm-enter="${esc(m.id)}">⚡ Masuk Arena Duel Sekarang!</button>
        <button type="button" class="secondary soc-big" data-dm-later>Nanti dulu</button>
      </div>
    </div>`;
    const close = () => { layer.classList.remove('show'); setTimeout(() => layer.remove(), 220); };
    layer.addEventListener('click', e => {
      if (e.target.closest('[data-dm-enter]')) { close(); openDuel(m.id); return; }
      if (e.target === layer || e.target.closest('[data-dm-later]')) { close(); syncWaitingFloat(); }
    });
    document.body.appendChild(layer);
    requestAnimationFrame(() => layer.classList.add('show'));
  }
  async function loadBlocks() {
    if (S.blocks.length) {
      if (!S.blocks.some(b => b.block === S.block)) S.block = S.blocks[0]?.block || '';
      return;
    }
    try {
      const d = await api('/api/banks');
      const map = new Map();
      for (const b of (d.banks || [])) {
        const cnt = Number(b.count) || 0;
        if (cnt <= 0) continue;
        const blk = String(b.block || '').trim().replace(/^BLOK\s+/i, '').toUpperCase();
        if (!blk || blk === 'OTHER') continue;
        const cur = map.get(blk) || { block: blk, label: `BLOK ${blk}`, bankCount: 0, questionCount: 0 };
        cur.bankCount += 1;
        cur.questionCount += cnt;
        map.set(blk, cur);
      }
      S.blocks = [...map.values()].filter(x => x.questionCount >= 5).sort((a, b) => a.block.localeCompare(b.block, 'id'));
    } catch {}
    if (!S.blocks.some(b => b.block === S.block)) S.block = S.blocks[0]?.block || '';
  }
  const savePref = () => { try { localStorage.setItem(PREF, JSON.stringify({ block: S.block, count: S.count, sec: S.sec, mode: S.mode, wager: S.wager, isPublic: S.isPublic, maxPlayers: S.maxPlayers, prizes: S.prizes })); } catch {} };

  /* ───────── LOBI & ARENA VISUAL ───────── */
  const initials = n => esc(String(n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase());
  const avatar = (p, cls = '') => `<span class="soc-av ${cls}${p?.online ? ' on' : ''}${p?.avatarDeco ? ' has-deco' : ''}" aria-hidden="true">${p?.avatarUrl ? `<img class="soc-av-img" src="${esc(p.avatarUrl)}" alt="">` : initials(p?.name)}${p?.avatarDeco ? `<img class="avatar-deco-img" src="${esc(p.avatarDeco)}" alt="">` : ''}</span>`;
  const resolveCard = raw => {
    if (!raw || !raw.id) return null;
    if (window.CLINED_CARDS?.getCardById) return window.CLINED_CARDS.getCardById(raw.id, raw.star || 1);
    return null;
  };
  const getMyShowcaseCard = () => window.CLINED_CARDS?.getEquipped?.() || null;
  const cardPill = rawCard => {
    const c = rawCard?.name ? rawCard : resolveCard(rawCard);
    if (!c) return '';
    return `<span class="duel-card-pill rarity-${esc(c.rarity)} ${esc(c.holoClass || '')}" style="--card-color:${esc(c.color)}" title="Kartu Andalan: ${esc(c.name)} (★${c.star})">
      <img src="${esc(c.img)}" alt="${esc(c.name)}">
      <b>${esc(c.name)}</b>
      <small>★${c.star}</small>
    </span>`;
  };
  const vsCardShowcaseHTML = (meName, myCardRaw, oppName, oppCardRaw) => {
    const mc = myCardRaw?.name ? myCardRaw : (resolveCard(myCardRaw) || getMyShowcaseCard());
    const oc = oppCardRaw?.name ? oppCardRaw : resolveCard(oppCardRaw);
    const slot = (label, card, isMe) => card
      ? `<div class="duel-vs-card-slot ${isMe ? 'me' : 'opp'} rarity-${esc(card.rarity)}">
          <div class="duel-vs-card-art ${esc(card.holoClass || '')}" style="--card-color:${esc(card.color)}">
            <img src="${esc(card.img)}" alt="${esc(card.name)}">
            <span class="duel-vs-card-star">★${card.star}</span>
          </div>
          <b>${esc(card.name)}</b>
          <small>${esc(label)} • ⚡ ${esc(card.strength || 'Aura')}</small>
        </div>`
      : `<div class="duel-vs-card-slot empty ${isMe ? 'me' : 'opp'}">
          <div class="duel-vs-card-art empty"><span>🃏</span></div>
          <b>Tanpa Kartu</b>
          <small>${esc(label)}</small>
        </div>`;
    return `<div class="duel-vs-cards-clash">
      ${slot(meName || 'Kamu', mc, true)}
      <div class="duel-vs-clash-mid">⚔️<small>CLASH</small></div>
      ${slot(oppName || 'Lawan', oc, false)}
    </div>`;
  };
  const modePill = m => m === 'sudden_death'
    ? '<span class="duel-tag sd">💀 Sudden Death 3❤️</span>'
    : '<span class="duel-tag cls">🏆 Klasik</span>';
  const wagerPill = w => Number(w) >= 50
    ? '<span class="duel-tag wager hi">🔥 Taruhan 50 EXP</span>'
    : Number(w) >= 20
      ? '<span class="duel-tag wager">💰 Taruhan 20 EXP</span>'
      : '<span class="duel-tag free">🛡️ Santai</span>';
  const h2hBadge = uid => {
    const rec = uid && S.h2h?.[uid];
    if (!rec || !(rec.wins || rec.losses || rec.draws)) return '<span class="h2h-pill new">⚔️ Belum pernah duel</span>';
    const lead = rec.wins > rec.losses ? 'win' : rec.wins < rec.losses ? 'lose' : 'even';
    return `<span class="h2h-pill ${lead}">⚔️ H2H: ${rec.wins}M – ${rec.losses}K${rec.draws ? ` – ${rec.draws}S` : ''}</span>`;
  };
  const renderHearts = (hearts = 3, max = 3) => {
    const h = Math.max(0, Math.min(max, Number(hearts ?? max)));
    let out = '<span class="duel-hearts" aria-label="Sisa nyawa">';
    for (let i = 0; i < max; i++) out += `<i class="${i < h ? 'alive' : 'lost'}">${i < h ? '❤️' : '🖤'}</i>`;
    return out + '</span>';
  };

  function lobbyHTML() {
    const F = S.F || { friends: [], incoming: [], outgoing: [], blocked: [] };
    const st = S.myStats || { wins: 0, losses: 0, draws: 0, total: 0, rp: 0, winRate: 0, streak: 0, bestStreak: 0, title: { icon: '🗡️', name: 'Petarung Baru' } };
    const rk = getRank(st.rank || { rp: st.rp || 0 });
    const adminUser = isAdmin();
    const blockOpts = S.blocks.map(b => `<option value="${esc(b.block)}"${b.block === S.block ? ' selected' : ''}>${esc(b.label || `BLOK ${b.block}`)} (${b.bankCount} bank • ${b.questionCount} soal acak)</option>`).join('');
    const curBlockObj = S.blocks.find(b => b.block === S.block);
    const selBanks = (S.duelBanks || []).filter(b => S.selectedBankIds.includes(b.id));
    const selQTotal = selBanks.reduce((sum, b) => sum + (Number(b.questionCount) || 0), 0);
    const curBankName = selBanks.length
      ? (selBanks.length === 1 ? selBanks[0].name : `${selBanks.length} Bank Pilihan (${selQTotal} soal acak)`)
      : (curBlockObj ? `${curBlockObj.label || `BLOK ${curBlockObj.block}`} (Acak)` : 'Pilih Blok Ujian');

    // 1. Arena Hero Banner + Rank Tier Emblem + RP Progress + Career Stats + Quick Match CTA
    const heroHTML = `
    <div class="card duel-hero">
      <div class="duel-hero-banner">
        <div class="duel-hero-top">
          <button type="button" class="duel-hero-badge tier-${esc(rk.key)}" data-soc-rank-modal title="Klik untuk melihat daftar Tier Rank Duel">
            <span class="duel-rank-ico">${rk.icon}</span>
            <div class="duel-hero-rank-txt">
              <small>RANK ARENA • ${esc(rk.sub.toUpperCase())}</small>
              <b>${esc(rk.fullName)} ${rankStarsHTML(rk)}</b>
            </div>
          </button>
          <div class="duel-hero-right">
            <button type="button" class="duel-tier-info-btn" data-soc-rank-modal>🏆 Info Rank</button>
            <div class="duel-dia-pill" title="Diamond milikmu untuk Gacha Kartu Organ">
              <span>💎</span><b data-diamond-count>${esc(getDiamonds())}</b>
            </div>
          </div>
        </div>

        <div class="duel-rp-box">
          <div class="duel-rp-head">
            <span>⚡ <b>${rk.rp} RP</b> (Rank Points)</span>
            <small>${rk.nextRp ? `Kurang <b>${rk.neededRp} RP</b> ke ${rk.nextTierName}` : '👑 Puncak Mythic Glory!'}</small>
          </div>
          <div class="duel-rp-track"><i style="width:${rk.progressPct}%"></i></div>
        </div>
      </div>

      <div class="duel-stat-grid">
        <div class="duel-stat-box win">
          <small>🏆 MENANG</small>
          <b>${st.wins}</b>
          <span>${st.losses}K • ${st.draws}S</span>
        </div>
        <div class="duel-stat-box rate">
          <small>📈 WIN RATE</small>
          <b>${st.winRate}%</b>
          <span>${st.total} total laga</span>
        </div>
        <div class="duel-stat-box streak">
          <small>🔥 STREAK</small>
          <b>${st.streak}x</b>
          <span>Rekor: ${st.bestStreak || 0}x</span>
        </div>
      </div>

      ${(() => {
        const eq = getMyShowcaseCard();
        return eq ? `<div class="duel-hero-card-strip rarity-${esc(eq.rarity)}">
          <div class="duel-hero-card-thumb ${esc(eq.holoClass || '')}" style="--card-color:${esc(eq.color)}">
            <img src="${esc(eq.img)}" alt="${esc(eq.name)}">
            <span>★${eq.star}</span>
          </div>
          <div class="duel-hero-card-txt">
            <small>🌟 KARTU ANDALAN ARENA • ${esc(eq.starsText)}</small>
            <b>${esc(eq.name)} • ⚡ ${esc(eq.buff.short)}</b>
          </div>
          <button type="button" class="duel-tier-info-btn" data-soc-open-cards>🃏 Ganti</button>
        </div>` : `<div class="duel-hero-card-strip empty">
          <div class="duel-hero-card-txt">
            <small>🃏 KARTU ANDALAN BELUM DIPASANG</small>
            <b>Buka Card Shop untuk pasang Kartu Organ &amp; aktifkan bonus EXP Duel!</b>
          </div>
          <button type="button" class="duel-tier-info-btn" data-soc-open-cards>🃏 Card Shop</button>
        </div>`;
      })()}

      <div class="duel-quick-wrap">
        <button type="button" class="duel-quick-btn" data-soc-quick>
          <span class="duel-quick-ico">⚡</span>
          <span class="duel-quick-txt">
            <b>Cari Lawan Cepat (${S.maxPlayers > 2 ? `Multiplayer ${S.maxPlayers} Orang` : 'Ranked Match 1v1'})</b>
            <small>${esc(curBankName)} • ${S.count} soal • ${S.maxPlayers > 2 ? `👥 2–${S.maxPlayers} org` : '⚔️ 1v1'} • ${S.mode === 'sudden_death' ? '💀 Sudden Death' : '🏆 Klasik'}${S.wager ? ` • 💰 ${S.wager} EXP` : ''}${adminUser && activePrizes() ? ` • 💎 ${prizeSummaryText(activePrizes())}` : ''}</small>
          </span>
          <span class="duel-quick-go">GAS ›</span>
        </button>
      </div>
    </div>`;

    // 2. Active duels & incoming friend invites
    const mine = S.mine.map(d => {
      const opp = d.opponent, isWait = d.status === 'waiting', mp = !!d.isMultiplayer;
      const title = isWait
        ? `${mp ? `Room ${d.playerCount || 1}/${d.maxPlayers} Pemain` : `Ruang ${esc(d.code)}`} • ${esc(d.bank?.name || 'Duel')}`
        : (mp ? `🏁 Race ${d.playerCount || 2} Pemain • ${esc(d.bank?.name || 'Duel')}` : `vs ${esc(opp?.name || 'Lawan')}`);
      const subLine = isWait
        ? (mp ? `Kode ${esc(d.code)} • ${d.isPublic ? '🌐 Open Access' : '🔒 Private'} • ${d.isHost ? 'Kamu Host' : 'Menunggu Host mulai'}` : 'Menunggu penantang masuk…')
        : (mp ? `Peringkat #${d.myRank || 1}/${d.playerCount || 2} • ${d.me.answered}/${d.total} soal` : `Berlangsung • ${d.me.answered}/${d.total} soal • ${esc(d.bank?.name || '')}`);
      return `<div class="soc-live-row${isWait ? ' is-waiting' : ''}">
        <button type="button" class="soc-live" data-soc-open="${esc(d.id)}">
          <span class="soc-live-ico">${isWait ? '⏳' : (mp ? '🏁' : '🔥')}</span>
          <span class="soc-who">
            <b>${title}</b>
            <small>${subLine} • ${d.mode === 'sudden_death' ? '💀 3❤️' : '🏆 Klasik'}${d.prizes ? ` • 💎 ${prizeSummaryText(d.prizes)}` : ''}</small>
          </span>
          <span class="soc-go">Masuk ›</span>
        </button>
        ${isWait ? `<div class="soc-live-subactions">
          <button type="button" class="secondary duel-mini-btn" data-soc-study-wait="${esc(d.id)}">📚 Kerjakan Soal Dulu</button>
          <button type="button" class="secondary duel-mini-btn soc-danger" data-soc-cancel-wait="${esc(d.id)}">✕ ${d.isHost ? 'Batal' : 'Keluar'}</button>
        </div>` : ''}
      </div>`;
    }).join('');

    const inv = S.invites.map(i => `<div class="soc-invite">
      <div class="soc-who">
        <b>⚔️ ${esc(i.from?.name || 'Teman')} menantangmu!</b>
        <small>${esc(i.bank.name)} • ${i.total} soal</small>
        <div class="duel-tags-row">${modePill(i.mode)}${wagerPill(i.wager)}${prizePill(i.prizes)}</div>
      </div>
      <div class="soc-btns">
        <button type="button" class="primary" data-soc-accept="${esc(i.code)}">⚡ Terima</button>
        <button type="button" class="secondary" data-soc-decline="${esc(i.id)}" aria-label="Tolak">✕</button>
      </div>
    </div>`).join('');

    // 2.5. Admin Live Inspect Panel (semua room waiting & active, termasuk Private)
    const adminRooms = adminUser ? (S.adminRooms || []) : [];
    const adminLiveCount = adminRooms.filter(r => r.status === 'active').length;
    const adminInspectHTML = adminUser ? `
    <div class="card soc-card duel-admin-inspect-card">
      <div class="soc-title between">
        <div class="duel-title-left">
          <span>👁️</span>
          <div>
            <div class="duel-arena-head-row">
              <h3>Admin Live Inspect</h3>
              <span class="duel-live-pill"><i></i> ${adminLiveCount} Berlangsung • ${adminRooms.length} Total</span>
            </div>
            <small class="soc-hint">Pantau langsung semua room (Open Access &amp; Private) secara realtime tanpa ikut bermain</small>
          </div>
        </div>
        <button type="button" class="secondary duel-mini-btn" data-soc-refresh-lobby aria-label="Segarkan daftar inspect">🔄</button>
      </div>
      ${adminRooms.length ? `<div class="duel-admin-room-list">${adminRooms.map(r => {
        const isLive = r.status === 'active';
        const host = r.host || {};
        return `<div class="duel-admin-room-row${isLive ? ' is-live' : ''}">
          <div class="duel-admin-room-info">
            <div class="duel-admin-room-top">
              <span class="duel-inspect-status ${isLive ? 'live' : 'wait'}">${isLive ? '🔴 LIVE' : '⏳ MENUNGGU'}</span>
              <b>${esc(r.bank?.name || 'Arena Duel')}</b>
              <code class="duel-admin-code">${esc(r.code)}</code>
            </div>
            <small>Host: <b>${esc(host.name || 'Pemain')}</b> (@${esc(host.username || '-')}) • ${r.total} soal • ${r.perQ ? `${r.perQ / 1000}d/soal` : '∞'}${isLive ? ` • ✅ ${r.finishedCount}/${r.playerCount} selesai` : ''}</small>
            <div class="duel-tags-row">
              <span class="duel-tag mp">👥 ${r.playerCount}/${r.maxPlayers}</span>
              <span class="duel-tag ${r.isPublic ? 'open' : 'priv'}">${r.isPublic ? '🌐 Open' : '🔒 Private'}</span>
              ${modePill(r.mode)}
              ${prizePill(r.prizes)}
            </div>
          </div>
          <button type="button" class="primary duel-inspect-btn" data-soc-inspect="${esc(r.id)}">${r.isMember ? '⚡ Buka' : '👁️ Inspect'}</button>
        </div>`;
      }).join('')}</div>` : `<div class="duel-open-empty">
        <span>🛰️</span>
        <div><b>Belum ada room yang sedang berjalan atau menunggu</b><small>Begitu ada pengguna membuat room (Open atau Private), daftar room otomatis muncul di sini untuk di-inspect secara realtime.</small></div>
      </div>`}
    </div>` : '';

    // 3. Open Arena Rooms (Lobi Tantangan Terbuka — Realtime Sync, 1v1 & Multiplayer 2–100)
    const waitAge = t => {
      if (!t) return '';
      const s = Math.max(0, Math.floor((Date.now() - Number(t)) / 1000));
      return s < 45 ? 'baru saja' : s < 3600 ? `${Math.floor(s / 60)} mnt lalu` : `${Math.floor(s / 3600)} jam lalu`;
    };
    const openRows = (S.openRooms || []).map(r => {
      const host = r.host || r.from || {};
      const age = waitAge(r.createdAt);
      const mp = !!r.isMultiplayer || Number(r.maxPlayers || 2) > 2;
      const capPill = mp
        ? `<span class="duel-tag mp">👥 ${r.playerCount || 1}/${r.maxPlayers} Pemain</span>`
        : '<span class="duel-tag free">⚔️ 1v1</span>';
      return `<div class="duel-open-room${mp ? ' is-mp' : ''}">
        <div class="duel-open-top">
          ${avatar(host)}
          <div class="soc-who">
            <b>${esc(host.name || 'Petarung')} <small class="duel-open-user">@${esc(host.username || '')}${age ? ` • ${age}` : ''}</small></b>
            <small>📚 ${esc(r.bank?.name || 'BLOK Ujian')} • ${r.total} soal • ${r.perQ ? `${r.perQ / 1000}d/soal` : '∞'}</small>
          </div>
          <button type="button" class="primary duel-join-now" data-soc-accept="${esc(r.code)}">${mp ? '⚡ Gabung!' : '⚡ Lawan!'}</button>
        </div>
        <div class="duel-tags-row">${capPill}<span class="duel-tag open">🌐 Open Access</span>${prizePill(r.prizes)}${rankPill(host.rank, false)}${cardPill(host.card)}${modePill(r.mode)}${wagerPill(r.wager)}${mp ? '' : h2hBadge(host.id)}</div>
      </div>`;
    }).join('');

    const openCount = (S.openRooms || []).length;
    const openArenaHTML = `
    <div class="card soc-card duel-arena-card">
      <div class="soc-title between">
        <div class="duel-title-left">
          <span>🌐</span>
          <div>
            <div class="duel-arena-head-row"><h3>Tantangan Terbuka</h3><span class="duel-live-pill" title="Tersinkronisasi otomatis secara realtime"><i></i> Live${openCount ? ` • ${openCount}` : ''}</span></div>
            <small class="soc-hint">Room Open Access (1v1 &amp; Multiplayer 2–100 orang) • masuk langsung 1-klik</small>
          </div>
        </div>
        <button type="button" class="secondary duel-mini-btn" data-soc-refresh-lobby aria-label="Segarkan lobi">🔄</button>
      </div>
      ${openRows ? `<div class="duel-open-list">${openRows}</div>` : `<div class="duel-open-empty">
        <span>🏟️</span>
        <div><b>Belum ada ruang Open Access yang menunggu pemain</b><small>Klik <b>⚡ Cari Lawan Cepat</b> di atas atau buat room baru (1v1 / Multiplayer hingga 100 orang) — kamu tetap bisa <b>mengerjakan soal dulu</b> sambil menunggu pemain masuk!</small></div>
      </div>`}
    </div>`;

    // 4. Custom Duel Setup (Kapasitas 2–100 Orang, Multi-Bank Picker, Admin Diamond Prizes, Open vs Private)
    const bankSearchQ = String(S.bankSearch || '').trim().toLowerCase();
    const visibleBanks = (S.duelBanks || []).filter(b => {
      if (!S.bankAllBlocks && S.block && b.block !== S.block) return false;
      if (bankSearchQ && !`${b.name} ${b.block}`.toLowerCase().includes(bankSearchQ)) return false;
      return true;
    });
    const bankPickerHTML = (S.duelBanks || []).length ? `
      <div class="duel-bank-picker${S.bankPickerOpen ? ' open' : ''}">
        <button type="button" class="duel-bank-toggle" data-soc-bank-toggle aria-expanded="${S.bankPickerOpen}">
          <span>🎯 ${selBanks.length ? `<b>${selBanks.length} Bank Soal Dipilih</b> (${selQTotal} soal acak)` : `Pilih Bank Soal Spesifik <em>(opsional — default acak semua di blok)</em>`}</span>
          <i>${S.bankPickerOpen ? '▲' : '▼'}</i>
        </button>
        ${S.bankPickerOpen ? `<div class="duel-bank-panel">
          <div class="duel-bank-tools">
            <input type="text" class="duel-bank-search" data-soc-bank-search value="${esc(S.bankSearch)}" placeholder="Cari nama bank soal…" aria-label="Cari bank soal">
            <div class="duel-bank-btns">
              <button type="button" class="secondary duel-mini-btn${S.bankAllBlocks ? ' on' : ''}" data-soc-bank-allblocks>${S.bankAllBlocks ? '✓ Semua Blok' : '🌐 Semua Blok'}</button>
              <button type="button" class="secondary duel-mini-btn" data-soc-bank-all>Pilih Semua</button>
              ${S.selectedBankIds.length ? `<button type="button" class="secondary duel-mini-btn soc-danger" data-soc-bank-clear>Reset (${S.selectedBankIds.length})</button>` : ''}
            </div>
          </div>
          <div class="duel-bank-list">
            ${visibleBanks.length ? visibleBanks.map(b => {
              const checked = S.selectedBankIds.includes(b.id);
              return `<label class="duel-bank-opt${checked ? ' checked' : ''}">
                <input type="checkbox" data-soc-bank-chk="${esc(b.id)}" ${checked ? 'checked' : ''}>
                <span class="duel-bank-name">${esc(b.name)}${S.bankAllBlocks ? ` <em class="duel-bank-blk">${esc(b.block)}</em>` : ''}</span>
                <small>${b.questionCount} soal</small>
              </label>`;
            }).join('') : '<p class="soc-empty">Tidak ada bank soal yang cocok.</p>'}
          </div>
        </div>` : ''}
      </div>` : '';

    const adminPrizeBoxHTML = adminUser ? `
      <div class="duel-prize-box">
        <div class="duel-prize-head">
          <span>💎 <b>Custom Hadiah Diamond</b> <em>(Khusus Admin)</em></span>
          ${activePrizes() ? '<button type="button" class="secondary duel-mini-btn" data-soc-prize-reset>Reset</button>' : ''}
        </div>
        <div class="duel-prize-grid">
          <label class="duel-prize-field"><span>🥇 Juara 1</span><input type="number" min="0" max="10000" inputmode="numeric" data-soc-prize="first" value="${S.prizes.first || 0}" aria-label="Hadiah diamond Juara 1"></label>
          <label class="duel-prize-field"><span>🥈 Juara 2</span><input type="number" min="0" max="10000" inputmode="numeric" data-soc-prize="second" value="${S.prizes.second || 0}" aria-label="Hadiah diamond Juara 2"></label>
          <label class="duel-prize-field"><span>🥉 Juara 3</span><input type="number" min="0" max="10000" inputmode="numeric" data-soc-prize="third" value="${S.prizes.third || 0}" aria-label="Hadiah diamond Juara 3"></label>
          <label class="duel-prize-field"><span>🎁 Peringkat 4+ (Rata)</span><input type="number" min="0" max="10000" inputmode="numeric" data-soc-prize="others" value="${S.prizes.others || 0}" aria-label="Hadiah diamond peringkat 4 ke atas pukul rata"></label>
        </div>
        <small class="duel-prize-hint">Otomatis dikreditkan ke saldo 💎 peserta saat room berakhir (0 = tanpa hadiah tambahan).</small>
      </div>` : '';

    const setupHTML = `
    <div class="card soc-card soc-setup">
      <div class="soc-title"><span>⚙️</span><div><h3>Atur Arena Duel</h3><small class="soc-hint">Bisa 1v1 atau Multiplayer 2–100 orang (adu cepat &amp; skor benar individual)</small></div></div>
      <label class="duel-field-label" for="socBlock">📚 Pilih BLOK Ujian (Acak Bank Soal)</label>
      <select id="socBlock" data-soc-block aria-label="Pilih blok ujian">${blockOpts || '<option value="">Memuat daftar blok…</option>'}</select>
      ${bankPickerHTML}

      <div class="duel-field-label">👥 Kapasitas Room (2–100 Orang)</div>
      <div class="duel-cap-row">
        <div class="soc-seg n5" role="radiogroup" aria-label="Preset kapasitas room">
          ${[2, 10, 30, 50, 100].map(n => `<button type="button" role="radio" aria-checked="${S.maxPlayers === n}" class="${S.maxPlayers === n ? 'on' : ''}" data-soc-maxp="${n}">${n === 2 ? '2' : n}</button>`).join('')}
        </div>
        <label class="duel-cap-input-wrap" title="Atur kapasitas bebas antara 2 sampai 100 orang">
          <input id="socMaxPlayers" type="number" min="2" max="100" inputmode="numeric" class="duel-cap-input" data-soc-maxp-input value="${S.maxPlayers}" aria-label="Jumlah maksimal pemain 2 sampai 100">
          <span>Org</span>
        </label>
      </div>

      <div class="duel-field-label">🎮 Mode Pertarungan</div>
      <div class="duel-mode-grid" role="radiogroup" aria-label="Mode duel">
        ${MODES.map(([k, ico, name, desc]) => `
          <button type="button" role="radio" aria-checked="${S.mode === k}" class="duel-mode-card ${k}${S.mode === k ? ' on' : ''}" data-soc-mode="${k}">
            <div class="duel-mode-head"><span class="duel-mode-ico">${ico}</span><b>${name}</b></div>
            <small>${desc}</small>
          </button>
        `).join('')}
      </div>

      <div class="soc-opt-row"><span class="soc-lab">Jumlah<small>Soal duel</small></span><div class="soc-seg n5" role="radiogroup" aria-label="Jumlah soal">${[5, 10, 15, 20, 30].map(n => `<button type="button" role="radio" aria-checked="${S.count === n}" class="${S.count === n ? 'on' : ''}" data-soc-count="${n}">${n}</button>`).join('')}</div></div>
      <div class="soc-opt-row"><span class="soc-lab">Waktu<small>Detik / soal</small></span><div class="soc-seg n5" role="radiogroup" aria-label="Batas waktu per soal">${SECS.map(([v, l]) => `<button type="button" role="radio" aria-checked="${S.sec === v}" class="${S.sec === v ? 'on' : ''}" data-soc-sec="${v}">${l}</button>`).join('')}</div></div>

      <div class="duel-field-label">💎 Taruhan &amp; Hadiah Pemenang</div>
      <div class="duel-wager-row" role="radiogroup" aria-label="Taruhan EXP">
        ${WAGERS.map(([w, ico, name, badge, sub]) => `
          <button type="button" role="radio" aria-checked="${S.wager === w}" class="duel-wager-btn${S.wager === w ? ' on' : ''}" data-soc-wager="${w}">
            <span class="duel-wager-ico">${ico}</span>
            <b>${name} <em>(${badge})</em></b>
            <small>${sub}</small>
          </button>
        `).join('')}
      </div>
      ${adminPrizeBoxHTML}

      <div class="soc-opt-row">
        <span class="soc-lab">Akses Room<small>${S.isPublic ? 'Tampil di lobi' : 'Pakai kode'}</small></span>
        <div class="soc-seg n2" role="radiogroup" aria-label="Akses ruang">
          <button type="button" role="radio" aria-checked="${S.isPublic}" class="${S.isPublic ? 'on' : ''}" data-soc-vis="1">🌐 Open Access</button>
          <button type="button" role="radio" aria-checked="${!S.isPublic}" class="${!S.isPublic ? 'on' : ''}" data-soc-vis="0">🔒 Private (Kode)</button>
        </div>
      </div>

      <button type="button" class="primary soc-big duel-create-btn" data-soc-create>${S.isPublic ? '🌐' : '🔒'} Buat Room ${S.maxPlayers > 2 ? `Multiplayer (${S.maxPlayers} Orang)` : 'Duel 1v1'} • ${S.isPublic ? 'Open Access' : 'Private'}</button>
      <div class="soc-join">
        <input id="socCode" data-soc-code type="text" inputmode="text" autocapitalize="characters" autocomplete="off" maxlength="6" placeholder="KODE PASSWORD (6 DIGIT)" aria-label="Kode password room">
        <button type="button" class="secondary" data-soc-join>Gabung Room</button>
      </div>
    </div>`;

    // 5. Tantang Teman + Rekor Head-to-Head (Poin 9)
    const quick = F.friends.length ? F.friends.map(f => `<div class="soc-friend quick">
      ${avatar(f)}
      <div class="soc-who">
        <b>${esc(f.name)}</b>
        <small>@${esc(f.username)}${f.online ? ' • <span class="soc-on">● online</span>' : ''}</small>
        <div class="duel-tags-row">${h2hBadge(f.id)}</div>
      </div>
      <button type="button" class="primary soc-fight" data-soc-challenge="${esc(f.id)}" aria-label="Tantang ${esc(f.name)}">⚔️ Tantang</button>
    </div>`).join('') : '<p class="soc-empty">Belum ada teman untuk ditantang. Tambahkan teman di menu Sosial!</p>';
    const quickHTML = `<div class="card soc-card duel-friends-card"><div class="soc-title"><span>👥</span><div><h3>Tantang Teman &amp; Rekor H2H</h3><small class="soc-hint">Lihat rekor pertemuan Head-to-Head dengan temanmu</small></div></div><div class="soc-sec">${quick}</div><button type="button" class="secondary soc-big" data-soc-hub="teman">Kelola Teman di Sosial ›</button></div>`;

    // 6. Papan Peringkat Ranked Gladiator Duel (Poin 9 + Sistem Rank RP)
    const lbRows = (S.leaderboard || []).map(p => {
      const medal = p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : p.rank === 3 ? '🥉' : `#${p.rank}`;
      const pTier = getRank(p.tier || { rp: p.rp || 0 });
      const pCard = p.me ? (getMyShowcaseCard() || p.card) : p.card;
      const bg = p.bannerUrl ? `<span class="chat-row-bg" style="background-image:url('${esc(p.bannerUrl)}')" aria-hidden="true"></span>` : '';
      const nc = p.nameColor ? ` data-name-color="${esc(p.nameColor)}"` : '';
      return `<div class="duel-lb-row${p.me ? ' me' : ''}${p.bannerUrl ? ' has-banner' : ''}">
        ${bg}
        <span class="duel-lb-rank ${p.rank <= 3 ? `top-${p.rank}` : ''}">${medal}</span>
        ${avatar(p)}
        <div class="duel-lb-main">
          <div class="duel-lb-top">
            <b class="duel-lb-name"${nc}>${esc(p.name)} ${p.me ? '<em class="soc-tag me">Kamu</em>' : ''}</b>
            <span class="duel-lb-wins">🏆 ${p.wins} Menang</span>
          </div>
          <div class="duel-lb-bottom">
            ${rankPill(pTier, true)}
            ${cardPill(pCard)}
            <small class="duel-lb-meta">${p.winRate}% WR • ${p.total} laga</small>
          </div>
        </div>
      </div>`;
    }).join('');
    const lbHTML = `<div class="card soc-card duel-lb-card">
      <div class="soc-title between">
        <div class="duel-title-left"><span>👑</span><div><h3>Leaderboard Rank Gladiator</h3><small class="soc-hint">Peringkat berdasarkan Rank Points (RP) &amp; Kemenangan</small></div></div>
        <button type="button" class="secondary duel-mini-btn" data-soc-rank-modal>🏆 Daftar Tier</button>
      </div>
      ${lbRows ? `<div class="duel-lb-list">${lbRows}</div>` : '<p class="soc-empty">Belum ada rekor duel tercatat. Jadilah Gladiator pertama yang meraih kemenangan!</p>'}
    </div>`;

    // Friends list for Sosial -> Teman tab
    const fr = F.friends.map(f => `<div class="soc-friend">${avatar(f)}<div class="soc-who"><b>${esc(f.name)}</b><small>@${esc(f.username)}${f.online ? ' • <span class="soc-on">online</span>' : ''}</small><div class="duel-tags-row">${h2hBadge(f.id)}</div></div>
      <button type="button" class="primary soc-fight" data-soc-challenge="${esc(f.id)}" aria-label="Tantang ${esc(f.name)}">⚔️ Tantang</button>
      <details class="soc-more"><summary aria-label="Opsi lainnya">⋯</summary><div class="soc-btns"><button type="button" class="secondary" data-soc-remove="${esc(f.id)}" data-name="${esc(f.name)}">Hapus teman</button><button type="button" class="secondary soc-danger" data-soc-block="${esc(f.id)}" data-name="${esc(f.name)}">Blokir</button></div></details></div>`).join('');
    const incoming = F.incoming.map(f => `<div class="soc-friend">${avatar(f)}<div class="soc-who"><b>${esc(f.name)}</b><small>@${esc(f.username)}</small></div><div class="soc-btns"><button type="button" class="primary" data-soc-respond="${f.linkId}" data-accept="1">Terima</button><button type="button" class="secondary" data-soc-respond="${f.linkId}" data-accept="0" aria-label="Tolak">✕</button></div></div>`).join('');
    const outgoing = F.outgoing.map(f => `<div class="soc-friend">${avatar(f)}<div class="soc-who"><b>${esc(f.name)}</b><small>Menunggu • @${esc(f.username)}</small></div><button type="button" class="secondary" data-soc-remove="${esc(f.id)}" data-quiet="1">Batal</button></div>`).join('');
    const blocked = F.blocked.map(f => `<div class="soc-friend">${avatar(f)}<div class="soc-who"><b>${esc(f.name)}</b><small>@${esc(f.username)}</small></div><button type="button" class="secondary" data-soc-unblock="${esc(f.id)}">Buka</button></div>`).join('');

    const friendsHTML0 = `
    <div class="card soc-card"><div class="soc-title"><span>👥</span><h3>Teman</h3></div>
      ${incoming ? `<div class="soc-sec"><h4>Permintaan masuk</h4>${incoming}</div>` : ''}
      <div class="soc-sec">${fr || '<p class="soc-empty">Belum ada teman. Tambahkan lewat username.</p>'}</div>
      <div class="soc-join"><input id="socUser" data-soc-user type="text" autocapitalize="none" autocomplete="off" maxlength="25" placeholder="Username teman" aria-label="Username teman"><button type="button" class="primary" data-soc-add>Tambah</button></div>
      ${outgoing ? `<div class="soc-sec"><h4>Menunggu dijawab</h4>${outgoing}</div>` : ''}
      ${blocked ? `<details class="soc-sec"><summary>Diblokir (${F.blocked.length})</summary>${blocked}</details>` : ''}
    </div>`;

    const duelAll = `${heroHTML}${inv}${mine ? `<div class="soc-lives">${mine}</div>` : ''}${adminInspectHTML}<div class="duel-lobby-grid">${openArenaHTML}${setupHTML}${quickHTML}</div>${lbHTML}`;
    return { duel: duelAll, friends: friendsHTML0 };
  }

  const timeAgo = t => { const m = Math.floor((Date.now() - t) / 60000); return m < 1 ? 'baru saja' : m < 60 ? `${m} mnt lalu` : m < 1440 ? `${Math.floor(m / 60)} jam lalu` : `${Math.floor(m / 1440)} hari lalu`; };
  function commentsHTML(id) {
    const list = S.comments[id];
    const rows = list == null ? '<p class="soc-empty">Memuat komentar…</p>' : (list.length ? list.map(c => `<div class="soc-cmt${c.own ? ' own' : ''}">${avatar(c)}<div class="soc-cmt-body"><div class="soc-cmt-head"><b${c.nameColor ? ` data-name-color="${esc(c.nameColor)}"` : ''}>${c.own ? 'Kamu' : esc(c.name)}</b><small>${timeAgo(c.createdAt)}</small>${c.canDelete ? `<button type="button" class="soc-cdel" data-soc-cdel="${esc(c.id)}" data-post="${esc(id)}" aria-label="Hapus komentar">✕</button>` : ''}</div><p>${esc(c.message)}</p></div></div>`).join('') : '<p class="soc-empty">Belum ada komentar. Jadi yang pertama!</p>');
    return `<div class="soc-cpanel" data-cpanel="${esc(id)}">${rows}<div class="soc-cform"><input type="text" maxlength="200" placeholder="Tulis komentar…" aria-label="Komentar" data-soc-cinput="${esc(id)}"><button type="button" class="primary" data-soc-csend="${esc(id)}">Kirim</button></div></div>`;
  }
  function statusHTML() {
    const all = S.feed, fl = S.filter || 'all';
    const posts = all && (fl === 'friends' ? all.filter(p => p.friend || p.own) : all);
    const items = (posts || []).map(p => {
      const m = MOODS.find(x => x[0] === p.mood) || MOODS[3];
      const chips = [p.examName ? `📚 ${esc(p.examName)}` : '', p.scorePct != null ? `🎯 ${p.scorePct}%` : ''].filter(Boolean).map(c => `<span>${c}</span>`).join('');
      const reacts = REACTS.map(e => { const n = p.reactions?.[e] || 0; return `<button type="button" class="soc-react${p.mine === e ? ' on' : ''}" data-soc-react="${esc(p.id)}" data-emoji="${e}" aria-pressed="${p.mine === e}" aria-label="Reaksi ${e}">${e}${n ? `<i>${n}</i>` : ''}</button>`; }).join('');
      const canDel = p.own || S.canMod;
      const tag = p.own ? '<em class="soc-tag me">Kamu</em>' : p.friend ? '<em class="soc-tag fr">Teman</em>' : '';
      return `<article class="soc-post${p.own ? ' own' : ''}"><div class="soc-post-head"><span class="soc-avwrap">${avatar(p)}<span class="soc-mood" title="${esc(m[2])}">${m[1]}</span></span><div class="soc-who"><b${p.nameColor ? ` data-name-color="${esc(p.nameColor)}"` : ''}>${esc(p.name)}</b><small>@${esc(p.username || '')} · ${timeAgo(p.createdAt)}</small></div>${tag}</div>
        ${chips ? `<div class="soc-post-chips">${chips}</div>` : ''}<p class="soc-post-msg">${esc(p.message)}</p>
        <div class="soc-reacts">${reacts}</div>
        <div class="soc-post-foot"><button type="button" class="soc-cbtn${S.openC.has(p.id) ? ' on' : ''}" data-soc-comment="${esc(p.id)}" aria-expanded="${S.openC.has(p.id)}">💬 ${p.comments ? p.comments + ' komentar' : 'Komentar'}</button>${canDel ? `<button type="button" class="soc-del" data-soc-delstatus="${esc(p.id)}" data-own="${p.own ? 1 : 0}" aria-label="${p.own ? 'Hapus statusmu' : 'Hapus status (admin)'}">🗑${p.own ? '' : '<small>Admin</small>'}</button>` : ''}</div>${S.openC.has(p.id) ? commentsHTML(p.id) : ''}</article>`;
    }).join('');
    const empty = fl === 'friends'
      ? '<div class="soc-emptybox"><div class="soc-emoji">👥</div><b>Belum ada status teman</b><p>Status dari temanmu muncul di sini.</p><button type="button" class="secondary" data-soc-filter="all">Lihat semua</button></div>'
      : '<div class="soc-emptybox"><div class="soc-emoji">💬</div><b>Belum ada status</b><p>Jadilah yang pertama berbagi kesan setelah ujian.</p></div>';
    const seg = `<div class="soc-seg n2 soc-filter" role="radiogroup" aria-label="Filter status">${[['all', '🌐 Semua'], ['friends', '👥 Teman']].map(([k, l]) => `<button type="button" role="radio" aria-checked="${fl === k}" class="${fl === k ? 'on' : ''}" data-soc-filter="${k}">${l}</button>`).join('')}</div>`;
    return `<div class="card soc-card"><div class="soc-title"><span>📣</span><h3>Status</h3></div>
      <button type="button" class="soc-compose" data-soc-newstatus aria-label="Tulis status"><span class="soc-compose-ico">✍️</span><span>Bagikan pesan &amp; kesanmu…</span></button>
      ${S.oldSrv ? '<div class="soc-warn" role="alert"><b>⚠️ Server belum diperbarui</b><span>Status hanya terlihat teman karena server masih versi lama. Admin: deploy versi terbaru lalu restart server.</span></div>' : ''}
      ${seg}
      <div class="soc-feed">${all == null ? '<p class="soc-empty">Memuat…</p>' : items || empty}</div></div>`;
  }
  function openComposer(pre = {}) {
    document.querySelector('.stc-layer')?.remove();
    let mood = pre.mood || (pre.scorePct != null ? (pre.scorePct >= 80 ? 'mantap' : pre.scorePct >= 60 ? 'lumayan' : 'berat') : 'semangat');
    const layer = document.createElement('div');
    layer.className = 'cdlg-layer stc-layer';
    layer.innerHTML = `<div class="cdlg-card" role="dialog" aria-modal="true" aria-labelledby="stcT" data-tone="info">
      <div class="cdlg-head"><span class="cdlg-ico" aria-hidden="true">📣</span><h3 class="cdlg-title" id="stcT">Bagikan status</h3></div>
      <div class="cdlg-body">
        ${pre.examName ? `<div class="stc-chips"><span>📚 ${esc(pre.examName)}</span>${pre.scorePct != null ? `<label class="stc-score"><input type="checkbox" id="stcScore" checked> 🎯 ${pre.scorePct}%</label>` : ''}</div>` : ''}
        <div class="stc-moods" role="radiogroup" aria-label="Suasana hati">${MOODS.map(([k, e, l]) => `<button type="button" role="radio" aria-checked="${k === mood}" class="${k === mood ? 'on' : ''}" data-stc-mood="${k}"><span>${e}</span><small>${l}</small></button>`).join('')}</div>
        <textarea id="stcMsg" rows="4" maxlength="240" placeholder="Pesan &amp; kesanmu setelah ujian…" aria-label="Pesan">${esc(pre.message || '')}</textarea>
        <div class="stc-foot"><small class="stc-pub">🌐 Terlihat oleh semua pengguna</small><small class="stc-count" id="stcCount">0/240</small></div></div>
      <div class="cdlg-actions"><button type="button" class="secondary" data-stc-cancel>Batal</button><button type="button" class="primary" data-stc-send>Bagikan</button></div></div>`;
    const close = () => { layer.classList.remove('show'); setTimeout(() => layer.remove(), 260); };
    const count = () => { $('stcCount').textContent = `${$('stcMsg').value.length}/240`; };
    layer.addEventListener('input', e => { if (e.target.id === 'stcMsg') count(); });
    layer.addEventListener('click', async e => {
      const m = e.target.closest('[data-stc-mood]');
      if (m) { mood = m.dataset.stcMood; layer.querySelectorAll('[data-stc-mood]').forEach(b => { const on = b === m; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); }); return; }
      if (e.target === layer || e.target.closest('[data-stc-cancel]')) return close();
      const send = e.target.closest('[data-stc-send]');
      if (send) {
        const message = $('stcMsg').value.trim();
        if (!message) return toast('Tulis pesan atau kesanmu dulu.', true);
        send.disabled = true; send.textContent = 'Mengirim…';
        try {
          await api('/api/status', { method: 'POST', body: { message, mood, examName: pre.examName || '', scorePct: pre.scorePct != null && $('stcScore')?.checked !== false ? pre.scorePct : null } });
          close(); toast('Status dibagikan 📣'); S.feed = null;
          if (activeView() === 'hubPage') { S.hubTab = 'status'; renderHub(); } else if (!pre.fromResult) openHub('status');
        } catch (err) { send.disabled = false; send.textContent = 'Bagikan'; toast(err.message, true); }
      }
    });
    document.body.appendChild(layer); count();
    requestAnimationFrame(() => { layer.classList.add('show'); $('stcMsg')?.focus({ preventScroll: true }); });
  }
  async function loadFeed() { try { const d = await api('/api/status'); S.feed = d.posts || []; S.canMod = !!d.canModerate; S.oldSrv = d.scope !== 'public'; } catch (e) { S.feed = []; toast(e.message, true); } }
  function resultContext() {
    try { const h = JSON.parse(localStorage.getItem('gaster_v8_history') || '[]')[0]; if (h) return { examName: String(h.bankName || h.bank || '').slice(0, 60), scorePct: Number.isFinite(Number(h.pct)) ? Number(h.pct) : null, fromResult: true }; } catch {}
    return { fromResult: true };
  }
  function duelResultContext() {
    const D = S.D;
    if (!D || D.status !== 'finished' || !D.result) return {};
    const R = D.result, win = R.winnerId === D.me.id, draw = !R.winnerId;
    const opp = D.opponent, oppTag = opp?.username ? `@${opp.username}` : (opp?.name || 'lawan');
    const mySt = R.myStanding || R.me || {};
    const totalP = R.totalPlayers || (Array.isArray(R.standings) ? R.standings.length : D.playerCount || 2);
    const pct = D.total ? Math.round(((mySt.score ?? R.me.score) / D.total) * 100) : null;
    const modeTag = D.mode === 'sudden_death' ? 'Mode Sudden Death 💀' : 'Mode Klasik 🏆';
    const msg = D.isMultiplayer
      ? `Meraih Peringkat #${R.myRank || 1} dari ${totalP} pemain di Arena Multiplayer CLINED (${mySt.score ?? R.me.score}/${D.total} • ⏱ ${fmtMs(mySt.timeMs || R.me.timeMs || 0)})! 🏁🔥 Siapa mau ikut race berikutnya?`
      : draw
        ? `Duel sengit ${modeTag} lawan ${oppTag} berakhir SERI (${R.me.score}/${D.total})! 🤝⚡ Siapa berani tantang berikutnya?`
        : win
          ? `Menang Duel ${modeTag} (${R.me.score}/${D.total}) lawan ${oppTag} di Arena CLINED! 🏆🔥${R.reason === 'knockout' ? ' (KNOCKOUT! 💀)' : ''} Ayo siapa berani tantang berikutnya? ⚔️`
          : `Duel seru ${modeTag} (${R.me.score}/${D.total}) lawan ${oppTag}! 💪🔥 Saatnya balas dendam di laga berikutnya!`;
    return {
      examName: `Duel: ${String(D.bank?.name || 'Klinik').slice(0, 48)}`,
      scorePct: pct,
      mood: win ? 'mantap' : draw ? 'semangat' : 'lumayan',
      message: msg,
      fromResult: false
    };
  }

  async function renderLobby(reload = true) {
    ensureShell();
    const body = $('socialBody'); if (!body) return;
    if (reload) { if (!S.F) { body.dataset.lastHtml = ''; body.innerHTML = '<p class="soc-empty">Memuat Arena Duel…</p>'; } try { await loadLobby(); await loadBlocks(); } catch (e) { body.dataset.lastHtml = ''; body.innerHTML = `<p class="soc-empty">${esc(e.message)}</p>`; return; } }
    const nextHtml = lobbyHTML().duel;
    if (body.dataset.lastHtml === nextHtml) return;
    const activeEl = document.activeElement;
    const focusSel = activeEl?.matches?.('[data-soc-bank-search]') ? '[data-soc-bank-search]'
      : activeEl?.matches?.('[data-soc-code]') ? '[data-soc-code]'
        : null;
    const selPos = focusSel && typeof activeEl.selectionStart === 'number' ? activeEl.selectionStart : null;
    const keep = { code: $('socCode')?.value };
    body.dataset.lastHtml = nextHtml;
    body.innerHTML = nextHtml;
    if (keep.code && $('socCode')) $('socCode').value = keep.code;
    if (focusSel) {
      const nextEl = body.querySelector(focusSel);
      if (nextEl) {
        nextEl.focus({ preventScroll: true });
        if (selPos != null && typeof nextEl.setSelectionRange === 'function') {
          try { nextEl.setSelectionRange(selPos, selPos); } catch {}
        }
      }
    }
  }
  const hubTabs = () => { const tab = (k, label, extra = '') => `<button type="button" role="tab" aria-selected="${S.hubTab === k}" class="${S.hubTab === k ? 'on' : ''}" data-soc-tab="${k}">${label}${extra}</button>`;
    return `<div class="soc-tabs three" role="tablist">${tab('status', '📣 Status')}${tab('chat', '💬 Chat', `<i class="soc-dot inline" data-chat-dot ${window.CLINED_CHAT?.unread ? '' : 'hidden'}>${window.CLINED_CHAT?.unread > 9 ? '9+' : window.CLINED_CHAT?.unread || 0}</i>`)}${tab('teman', '👥 Teman', S.F?.incoming?.length ? ` <i class="soc-dot inline">${S.F.incoming.length}</i>` : '')}</div>`; };
  async function renderHub(reload = true) {
    ensureShell();
    const body = $('hubBody'); if (!body) return;
    if (S.hubTab === 'chat') {
      if (!reload && $('chatHost')) return;
      body.dataset.lastHtml = '';
      body.innerHTML = hubTabs() + '<div id="chatHost"></div>';
      window.CLINED_CHAT?.mount($('chatHost'));
      if (reload && !S.F) loadLobby().catch(() => {});
      return;
    }
    if (reload) {
      if (!S.F || (S.hubTab === 'status' && S.feed == null)) { body.dataset.lastHtml = ''; body.innerHTML = '<p class="soc-empty">Memuat…</p>'; }
      try { await Promise.all([loadLobby(), S.hubTab === 'status' ? loadFeed() : Promise.resolve()]); } catch (e) { body.dataset.lastHtml = ''; body.innerHTML = `<p class="soc-empty">${esc(e.message)}</p>`; return; }
    }
    window.CLINED_CHAT?.stop?.();
    const nextHtml = hubTabs() + (S.hubTab === 'status' ? statusHTML() : lobbyHTML().friends);
    if (body.dataset.lastHtml === nextHtml) return;
    const keep = { user: $('socUser')?.value };
    body.dataset.lastHtml = nextHtml;
    body.innerHTML = nextHtml;
    if (keep.user && $('socUser')) $('socUser').value = keep.user;
  }
  const refreshActive = () => (activeView() === 'hubPage' ? renderHub(true) : renderLobby(true));
  const openHub = (tab) => { if (tab) S.hubTab = tab; if (S.hubTab === 'status') S.feed = null; window.show('hubPage'); renderHub(); };
  const openLobby = () => { window.show('socialPage'); renderLobby(); };

  /* ───────── RUANG DUEL & EMOTE REALTIME ───────── */
  const nowS = () => Date.now() + S.skew;
  const syncD = d => { S.D = d; if (d?.serverNow) S.skew = d.serverNow - Date.now(); };
  function stopTick() { clearInterval(S.tick); S.tick = null; }
  function startTick() { stopTick(); S.tick = setInterval(tick, 200); }
  function tick() {
    const D = S.D; if (!D || D.status !== 'active' || activeView() !== 'duelPage') return stopTick();
    const now = nowS();
    if (now < D.startedAt) { const el = $('duelGo'); if (el) el.textContent = Math.max(1, Math.ceil((D.startedAt - now) / 1000)); return; }
    if ($('duelGo')) { renderDuel(); return; }
    const clock = $('duelClock'); if (clock && !D.perQ) clock.textContent = fmtMs(D.deadlineAt - now);
    if (!D.perQ || D.isSpectator) return;
    const qi = D.myAnswers.length; if (qi >= D.total || S.fb != null) return;
    const left = D.perQ - (now - D.qStartAt), bar = $('duelQBar'), sec = $('duelQSec');
    if (bar) { bar.style.width = Math.max(0, Math.min(100, (left / D.perQ) * 100)) + '%'; bar.dataset.low = left < 5000 ? '1' : ''; }
    if (sec) sec.textContent = Math.max(0, Math.ceil(left / 1000));
    if (left <= 0 && S.sentFor !== qi) { S.sentFor = qi; answer(-1).catch(() => { S.sentFor = -1; }); }
  }
  const reasonText = (r, win, draw) => draw
    ? 'Skor dan waktu kedua petarung sama persis!'
    : ({
      knockout: win ? '💀 KNOCKOUT! Lawan kehabisan 3 nyawa (❤️❤️❤️)!' : '💔 GUGUR! Kamu kehabisan 3 nyawa (❤️❤️❤️).',
      score: 'Skor jawaban benar lebih tinggi.',
      speed: 'Skor seri, tetapi diselesaikan lebih cepat!',
      forfeit: win ? '🏳️ Lawan menyerah dari arena.' : '🏳️ Kamu memilih menyerah.',
      finished: '⏰ Waktu habis, diselesaikan lebih unggul.',
      admin_finish: '🏁 Room diakhiri langsung oleh Admin.'
    }[r] || '');
  const secText = ms => ms ? `${ms / 1000} dtk/soal` : 'tanpa batas waktu';

  function emoteBubbleHTML(side) {
    const em = S.emotes[side];
    if (!em || Date.now() > em.until) return `<div class="duel-emote-slot" id="duelEmote_${side}"></div>`;
    return `<div class="duel-emote-slot" id="duelEmote_${side}"><div class="duel-emote-bubble"><span>${esc(em.emoji)}</span><b>${esc(em.text)}</b></div></div>`;
  }
  function showEmoteBubble(side, emoji, text) {
    S.emotes[side] = { emoji, text, until: Date.now() + 3600 };
    const slot = $(`duelEmote_${side}`);
    if (slot) {
      slot.innerHTML = `<div class="duel-emote-bubble"><span>${esc(emoji)}</span><b>${esc(text)}</b></div>`;
    }
    setTimeout(() => {
      if (S.emotes[side] && Date.now() >= S.emotes[side].until) {
        const s = $(`duelEmote_${side}`);
        if (s) s.innerHTML = '';
      }
    }, 3650);
  }
  function emoteBarHTML() {
    return `<div class="duel-emote-bar" role="group" aria-label="Kirim stiker cepat ke lawan">
      ${DUEL_EMOTES.map(([k, emoji, txt]) => `
        <button type="button" class="duel-emote-btn" data-soc-emote="${k}" title="${esc(txt)}">
          <span>${emoji}</span><small>${esc(txt)}</small>
        </button>
      `).join('')}
    </div>`;
  }

  const fmtSpeedSec = ms => {
    const n = Number(ms) || 0;
    if (!n) return '-';
    return `${(n / 1000).toFixed(1)}d/soal`;
  };

  function mpRowHTML(p, D, pctFn, showPrize = false) {
    const isSD = D.mode === 'sudden_death';
    const total = D.total || 1;
    const medal = p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : p.rank === 3 ? '🥉' : `#${p.rank}`;
    const statusTag = p.forfeited
      ? '<em class="duel-mp-st bad">Keluar</em>'
      : p.eliminated
        ? '<em class="duel-mp-st bad">KO</em>'
        : p.done
          ? '<em class="duel-mp-st ok">Selesai</em>'
          : '';
    const estPrize = showPrize && D.prizes && !p.forfeited
      ? (p.prizeDiamonds || (p.rank === 1 ? D.prizes.first : p.rank === 2 ? D.prizes.second : p.rank === 3 ? D.prizes.third : D.prizes.others) || 0)
      : 0;
    return `<div class="duel-mp-row${p.isMe ? ' me' : ''}${p.done ? ' is-done' : ''}${p.forfeited || p.eliminated ? ' is-out' : ''}">
      <span class="duel-mp-pos ${p.rank <= 3 ? `top-${p.rank}` : ''}">${medal}</span>
      ${avatar(p, p.isMe ? '' : 'opp')}
      <div class="duel-mp-mid">
        <div class="duel-mp-top">
          <b>${esc(p.name)}${p.isMe ? ' <em class="soc-tag me">Kamu</em>' : ''}${p.isHost ? ' <em class="duel-host-tag">👑 Host</em>' : ''}</b>
          <span class="duel-mp-score">✅ <b>${p.score}</b>/${total} • ⏱ ${p.answered ? fmtMs(p.timeMs) : '0:00'}${estPrize > 0 ? ` • <em class="duel-mp-dia">💎+${estPrize}</em>` : ''}</span>
        </div>
        <div class="duel-mp-track"><i style="width:${pctFn(p.answered)}%"></i></div>
        <div class="duel-mp-sub">
          <small>${p.answered}/${total} soal${p.avgMs ? ` • ${fmtSpeedSec(p.avgMs)}` : ''}${p.username ? ` • @${esc(p.username)}` : ''}</small>
          ${isSD ? renderHearts(p.hearts ?? 3, D.maxHearts || 3) : ''}
          ${(p.streak || 0) >= 2 ? `<span class="duel-streak-pill">🔥 ${p.streak}x</span>` : ''}
          ${statusTag}
        </div>
      </div>
    </div>`;
  }

  function mpBoardHTML(D, flash) {
    const isSD = D.mode === 'sudden_death';
    const all = Array.isArray(D.players) ? D.players : [];
    const total = D.total || 1;
    const pct = n => Math.round((n / total) * 100);
    const myRank = D.myRank || (all.find(p => p.isMe)?.rank) || 1;
    const myElapsed = D.me?.timeMs || (D.startedAt ? Math.max(0, nowS() - D.startedAt) : 0);
    const privacy = !!D.privacyMode && !D.canInspectFull;
    let visible = all;
    const canToggle = !privacy && all.length > 5;
    if (canToggle && !S.mpExpandAll) {
      visible = all.slice(0, 5);
      const meRow = all.find(p => p.isMe);
      if (meRow && !visible.some(p => p.id === meRow.id)) visible = [...all.slice(0, 4), meRow];
    }
    const rows = visible.map((p, idx) => {
      const divider = privacy && idx === 3 && p.isMe && p.rank > 3
        ? '<div class="duel-privacy-sep">🔒 Posisi Pribadimu (hanya terlihat olehmu)</div>'
        : '';
      return divider + mpRowHTML(p, D, pct, !!D.prizes);
    }).join('');
    return `<div class="duel-arena-board duel-mp-board">
      <div class="duel-mp-head">
        <div class="duel-mp-mychip">
          <b>🏅 Peringkat #${myRank}</b>
          <small>dari ${D.playerCount || all.length} pemain • ✅ ${D.me.score}/${total} • ⏱ ${fmtMs(myElapsed)}</small>
        </div>
        <div class="duel-mp-head-r">
          ${D.perQ ? `<span class="duel-tag cls">${isSD ? '💀 3❤️' : '🏆 Klasik'}</span>` : `<span class="duel-tag cls" id="duelClock">⏱ ${fmtMs(D.deadlineAt - nowS())}</span>`}
          ${canToggle ? `<button type="button" class="secondary duel-mini-btn" data-soc-mp-expand>${S.mpExpandAll ? 'Ringkas ▲' : `Semua (${all.length}) ▼`}</button>` : ''}
          ${D.canInspectFull && D.status === 'active' ? '<button type="button" class="secondary duel-mini-btn soc-danger" data-soc-admin-finish>🏁 Akhiri</button>' : ''}
        </div>
      </div>
      ${privacy ? '<div class="duel-privacy-note">🔒 Mode Privasi: hanya <b>Top 3</b> &amp; posisi pribadimu yang ditampilkan.</div>' : ''}
      <div class="duel-mp-list">${rows}</div>
      ${flash ? `<div class="duel-opp-flash ${flash.ok ? 'ok' : 'bad'}">${esc(flash.text)}</div>` : ''}
    </div>`;
  }

  function adminInspectHTML(D, flash) {
    const all = Array.isArray(D.players) ? D.players : [];
    const total = D.total || 1;
    const pct = n => Math.round((n / total) * 100);
    const doneCnt = all.filter(p => p.done && !p.forfeited).length;
    const outCnt = all.filter(p => p.forfeited || p.eliminated).length;
    const playingCnt = Math.max(0, all.length - doneCnt - outCnt);
    const q = String(S.inspectSearch || '').trim().toLowerCase();
    const filtered = q
      ? all.filter(p => `${p.name || ''} ${p.username || ''} #${p.rank}`.toLowerCase().includes(q))
      : all;
    const statusBadge = D.status === 'active'
      ? '<span class="duel-inspect-status live">🔴 LIVE INSPECT</span>'
      : D.status === 'waiting'
        ? '<span class="duel-inspect-status wait">⏳ MENUNGGU MULAI</span>'
        : '<span class="duel-inspect-status done">🏁 SELESAI</span>';
    const top3 = (D.result?.top3 || D.top3 || all.slice(0, 3)).slice(0, 3);
    const podiumOrder = top3.length === 3 ? [top3[1], top3[0], top3[2]] : top3;
    const podiumHtml = D.status === 'finished' && top3.length ? `<div class="duel-podium">${podiumOrder.map(p => {
      const medal = p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : '🥉';
      return `<div class="duel-podium-slot place-${p.rank}">
        <span class="duel-podium-medal">${medal}</span>
        ${avatar(p, 'opp')}
        <b>${esc(p.name)}</b>
        <span class="duel-podium-score">${p.score}/${total}</span>
        <small>⏱ ${p.answered ? fmtMs(p.timeMs) : '-'}${p.prizeDiamonds ? ` • 💎+${p.prizeDiamonds}` : ''}</small>
      </div>`;
    }).join('')}</div>` : '';
    const countdownBar = D.status === 'active' && nowS() < D.startedAt
      ? `<div class="duel-inspect-cd">⏳ Hitungan mundur dimulai dalam <b id="duelGo">${Math.max(1, Math.ceil((D.startedAt - nowS()) / 1000))}</b> detik…</div>`
      : '';
    return `<div class="card soc-card duel-inspect-wrap">
      <div class="duel-inspect-banner">
        <div class="duel-inspect-banner-top">
          ${statusBadge}
          <code class="duel-admin-code">${esc(D.code)}</code>
          ${D.status === 'active' && !D.perQ ? `<span class="duel-tag cls" id="duelClock">⏱ ${fmtMs(D.deadlineAt - nowS())}</span>` : ''}
        </div>
        <h3>👁️ Admin Live Inspect • ${esc(D.bank?.name || 'Arena Duel')}</h3>
        <p>${D.total} soal • ${secText(D.perQ)} • Kapasitas ${D.playerCount || all.length}/${D.maxPlayers} pemain • Mode Spectator (tidak ikut bermain)</p>
        <div class="duel-tags-row">
          <span class="duel-tag ${D.isPublic ? 'open' : 'priv'}">${D.isPublic ? '🌐 Open Access' : '🔒 Private'}</span>
          ${modePill(D.mode)}${wagerPill(D.wager)}${prizePill(D.prizes)}
        </div>
      </div>

      ${countdownBar}

      <div class="duel-inspect-kpis">
        <div class="duel-inspect-kpi"><small>👥 PESERTA</small><b>${all.length}<em>/${D.maxPlayers}</em></b></div>
        <div class="duel-inspect-kpi ok"><small>✅ SELESAI</small><b>${doneCnt}</b></div>
        <div class="duel-inspect-kpi play"><small>⚡ MAIN</small><b>${D.status === 'active' ? playingCnt : 0}</b></div>
        <div class="duel-inspect-kpi out"><small>🏳️ KO/KELUAR</small><b>${outCnt}</b></div>
      </div>

      <div class="duel-inspect-actions">
        <button type="button" class="secondary duel-mini-btn" data-soc-inspect-refresh>🔄 Segarkan Live</button>
        <button type="button" class="secondary duel-mini-btn" data-soc-copy="${esc(D.code)}">📋 Salin Kode</button>
        ${D.status === 'waiting' ? `<button type="button" class="primary duel-mini-btn" data-soc-start-mp ${all.length >= 2 ? '' : 'disabled'}>🚀 Mulai Room (${all.length})</button>` : ''}
        ${D.status === 'active' ? '<button type="button" class="secondary duel-mini-btn soc-danger" data-soc-admin-finish>🏁 Akhiri Room Sekarang</button>' : ''}
      </div>

      ${flash ? `<div class="duel-opp-flash ${flash.ok ? 'ok' : 'bad'}">${esc(flash.text)}</div>` : ''}
      ${podiumHtml}

      <div class="duel-inspect-board">
        <div class="duel-inspect-board-head">
          <b>📊 Klasemen Lengkap Admin (${filtered.length}${q ? `/${all.length}` : ''} Peserta)</b>
          <input type="text" class="duel-inspect-search" data-soc-inspect-search value="${esc(S.inspectSearch)}" placeholder="Cari nama / @username…" aria-label="Cari peserta">
        </div>
        <div class="duel-mp-list duel-inspect-list">
          ${filtered.length ? filtered.map(p => mpRowHTML(p, D, pct, !!D.prizes)).join('') : '<p class="soc-empty">Tidak ada peserta yang cocok dengan pencarian.</p>'}
        </div>
      </div>

      <button type="button" class="secondary soc-big" data-soc-lobby>‹ Kembali ke Lobi Arena</button>
    </div>`;
  }

  function duelHTML() {
    const D = S.D; if (!D) return '<p class="soc-empty">Duel tidak ditemukan.</p>';
    const opp = D.opponent, oppName = esc(opp?.name || D.invited?.name || 'Lawan');
    const isSD = D.mode === 'sudden_death';
    const isMP = !!D.isMultiplayer;
    const myRk = getRank(D.me?.rank || S.myStats?.rank || { rp: S.myStats?.rp || 0 });
    const oppRk = opp ? getRank(opp.rank || { rp: 0 }) : null;
    const flash = S.oppFlash && Date.now() < S.oppFlash.until ? S.oppFlash : null;

    if (D.status === 'cancelled') {
      return `<div class="card soc-card soc-center"><div class="soc-emoji">🚫</div><h3>Room dibatalkan</h3><button type="button" class="primary soc-big" data-soc-lobby>Kembali ke Arena</button></div>`;
    }
    if (D.isSpectator) {
      return adminInspectHTML(D, flash);
    }
    if (D.status === 'waiting') {
      if (isMP) {
        const players = Array.isArray(D.players) ? D.players : [];
        const pCount = D.playerCount || players.length || 1;
        const maxP = D.maxPlayers || 2;
        const slotsLeft = Math.max(0, maxP - pCount);
        const canControlStart = D.isHost || D.canInspectFull;
        const canStart = canControlStart && pCount >= 2;
        const rosterHtml = players.map((p, idx) => `
          <div class="duel-roster-item${p.isMe ? ' me' : ''}">
            <span class="duel-roster-num">${idx + 1}</span>
            ${avatar(p, p.isMe ? '' : 'opp')}
            <div class="duel-roster-info">
              <b>${esc(p.name)}${p.isMe ? ' <em class="soc-tag me">Kamu</em>' : ''}${p.isHost ? ' <em class="duel-host-tag">👑 Host</em>' : ''}</b>
              <small>@${esc(p.username || 'peserta')}${p.online ? ' • <span class="soc-on">● online</span>' : ''}</small>
            </div>
            ${p.tierRank ? rankPill(getRank(p.tierRank), false) : ''}
          </div>
        `).join('');
        return `<div class="card soc-card soc-center duel-wait-card duel-mp-wait">
          <div class="duel-mp-wait-top">
            <span class="duel-tag mp">👥 ${pCount} / ${maxP} Pemain</span>
            <span class="duel-tag ${D.isPublic ? 'open' : 'priv'}">${D.isPublic ? '🌐 Open Access' : '🔒 Private (Kode Password)'}</span>
            ${modePill(D.mode)}${wagerPill(D.wager)}${prizePill(D.prizes)}
          </div>
          <h3>${D.isHost ? '🏟️ Ruang Tunggu Multiplayer' : '⏳ Menunggu Host Memulai Pertarungan…'}</h3>
          <p>${esc(D.bank.name)} • ${D.total} soal • ${secText(D.perQ)} • Peringkat berdasarkan <b>Skor Benar &amp; Kecepatan</b></p>

          <div class="duel-code-panel">
            <small>${D.isPublic ? 'KODE ROOM (OPSIONAL UNTUK GABUNG LANGSUNG)' : '🔒 KODE PASSWORD ROOM PRIVATE'}</small>
            <div class="soc-code" aria-label="Kode password room">${esc(D.code)}</div>
            <div class="duel-code-actions">
              <button type="button" class="secondary duel-mini-btn" data-soc-copy="${esc(D.code)}">📋 Salin Kode</button>
              <button type="button" class="secondary duel-mini-btn" data-soc-share="${esc(D.code)}">📤 Bagikan</button>
              ${D.isHost ? `<button type="button" class="secondary duel-mini-btn" data-soc-regen-code>🔄 Ganti Kode</button>` : ''}
            </div>
          </div>

          <div class="duel-roster-wrap">
            <div class="duel-roster-head">
              <b>Peserta di Room (${pCount}/${maxP})</b>
              <small>${slotsLeft > 0 ? `${slotsLeft} slot tersisa • otomatis mulai saat penuh` : 'Room penuh!'}</small>
            </div>
            <div class="duel-roster-list">${rosterHtml}</div>
          </div>

          ${canControlStart
            ? `<button type="button" class="primary soc-big duel-start-mp-btn" data-soc-start-mp ${canStart ? '' : 'disabled'}>${canStart ? `🚀 Mulai Pertarungan (${pCount} Pemain)` : '⏳ Menunggu Minimal 2 Pemain untuk Mulai…'}</button>`
            : `<div class="duel-mp-wait-note">✅ Kamu sudah masuk room! Pertarungan dimulai saat Host menekan <b>Mulai</b> atau saat kuota ${maxP} pemain terpenuhi.</div>`}

          <div class="duel-study-wait-box">
            <div class="duel-study-wait-txt">
              <b>📚 Nunggu sambil ngerjain soal dulu?</b>
              <small>Kamu tetap terdaftar di room ini. Begitu pertarungan dimulai, notifikasi langsung muncul di layar!</small>
            </div>
            <button type="button" class="secondary soc-big duel-study-wait-btn" data-soc-study-wait="${esc(D.id)}">📚 Kerjakan Soal Dulu Sambil Menunggu</button>
          </div>

          <button type="button" class="secondary soc-big soc-danger" data-soc-leave>${D.isHost ? 'Batalkan Room Multiplayer' : 'Keluar dari Room'}</button>
        </div>`;
      }

      if (!D.isHost) {
        return `<div class="card soc-card soc-center duel-wait-card">
          ${vsCardShowcaseHTML('Kamu', D.me?.card, opp?.name || 'Penantang', opp?.card)}
          <h3>⚔️ ${oppName} menantangmu!</h3>
          <p>${esc(D.bank.name)} • ${D.total} soal • ${secText(D.perQ)}</p>
          <div class="duel-tags-row center">${oppRk ? rankPill(oppRk) : ''}${modePill(D.mode)}${wagerPill(D.wager)}${prizePill(D.prizes)}${h2hBadge(opp?.id)}</div>
          <button type="button" class="primary soc-big" data-soc-accept="${esc(D.code)}">⚔️ Terima Tantangan</button>
          <button type="button" class="secondary soc-big" data-soc-decline="${esc(D.id)}">Tolak</button>
        </div>`;
      }
      return `<div class="card soc-card soc-center duel-wait-card">
        <div class="soc-emoji soc-pulse">⏳</div>
        <h3>${D.invited ? `Menunggu ${oppName}…` : (D.isPublic ? '🌐 Menunggu Penantang di Open Access…' : '🔒 Menunggu Lawan via Kode Password…')}</h3>
        <p>${esc(D.bank.name)} • ${D.total} soal • ${secText(D.perQ)}</p>
        <div class="duel-tags-row center">${rankPill(myRk)}${cardPill(D.me?.card || getMyShowcaseCard())}${modePill(D.mode)}${wagerPill(D.wager)}${prizePill(D.prizes)}</div>
        <div class="duel-study-wait-box">
          <div class="duel-study-wait-txt">
            <b>📚 Nunggu sambil ngerjain soal dulu?</b>
            <small>Ruang duelmu tetap aktif. Begitu ada lawan masuk, notifikasi langsung muncul di layar!</small>
          </div>
          <button type="button" class="primary soc-big duel-study-wait-btn" data-soc-study-wait="${esc(D.id)}">📚 Kerjakan Soal Dulu Sambil Menunggu</button>
        </div>
        <div class="soc-code" aria-label="Kode password duel">${esc(D.code)}</div>
        <div class="soc-btns2"><button type="button" class="secondary" data-soc-copy="${esc(D.code)}">📋 Salin Kode</button><button type="button" class="primary" data-soc-share="${esc(D.code)}">📤 Bagikan</button></div>
        ${!D.isPublic && !D.invited ? `<button type="button" class="secondary soc-big" data-soc-regen-code>🔄 Generate Kode Password Baru</button>` : ''}
        <button type="button" class="secondary soc-big soc-danger" data-soc-leave>Batalkan Ruang Duel</button>
      </div>`;
    }
    if (D.status === 'finished') {
      const R = D.result, win = R.winnerId === D.me.id, draw = !R.winnerId;
      const rw = claimDuelReward(D);
      const rpDelta = Number.isFinite(Number(R.rpDelta)) ? Number(R.rpDelta) : (win ? 30 : draw ? 8 : (myRk.rp < 200 ? 0 : -12));
      const newRk = getRank(R.newRank || myRk);
      const rpPillClass = rpDelta > 0 ? 'rp-up' : rpDelta < 0 ? 'rp-down' : 'rp-shield';
      const rpLabel = rpDelta > 0
        ? `📈 +${rpDelta} RP`
        : rpDelta < 0
          ? `📉 ${rpDelta} RP`
          : '🛡️ +0 RP (Proteksi Bronze)';

      const review = R.review.map(q => `<details class="soc-rev"><summary><span class="soc-rn ${q.myChoice === q.correctIdx ? 'ok' : 'bad'}">${q.i + 1}</span>${esc(q.soal.slice(0, 90))}${q.soal.length > 90 ? '…' : ''}</summary>
        <ul>${q.opsi.map((o, i) => `<li class="${i === q.correctIdx ? 'ok' : ''}">${L5[i]}. ${esc(o)} ${i === q.correctIdx ? '✓' : ''}${i === q.myChoice ? ' <em>kamu</em>' : ''}${!isMP && i === q.oppChoice ? ' <em class="opp">lawan</em>' : ''}</li>`).join('')}</ul>${q.myChoice === -1 ? '<p class="soc-pemb">⏰ Kamu tidak menjawab tepat waktu.</p>' : ''}${q.pembahasan ? `<p class="soc-pemb">${esc(q.pembahasan)}</p>` : ''}</details>`).join('');

      const rankResultCard = `
        <div class="duel-rank-result-card tier-${esc(newRk.key)}">
          ${R.rankUp ? `<div class="duel-rankup-banner">🎉 NAIK RANK! Selamat, kamu naik ke <b>${newRk.icon} ${esc(newRk.fullName)}</b>!</div>` : ''}
          <div class="duel-rank-result-top">
            <div class="duel-rank-result-left">
              <span class="duel-rank-ico">${newRk.icon}</span>
              <div>
                <b>${esc(newRk.fullName)} ${rankStarsHTML(newRk)}</b>
                <small>${esc(newRk.sub)} • Total ${newRk.rp} RP</small>
              </div>
            </div>
            <span class="duel-rp-delta ${rpPillClass}">${rpLabel}</span>
          </div>
          <div class="duel-rp-track"><i style="width:${newRk.progressPct}%"></i></div>
          <small class="duel-rp-sub">${newRk.nextRp ? `Kurang ${newRk.neededRp} RP menuju ${newRk.nextTierName}` : '👑 Kamu berada di puncak Mythic Glory!'}</small>
        </div>`;

      const customDia = Number(R.myPrizeDiamonds) || 0;
      const showReward = rw && (win || draw || customDia > 0 || (isMP && (R.myRank || 99) <= 3));
      const rewardBanner = showReward ? `
        <div class="duel-reward-banner ${win || customDia > 0 ? 'win' : 'draw'}">
          <div class="duel-reward-title">${win ? '🎁 HADIAH JUARA #1 ARENA' : isMP && (R.myRank || 99) <= 3 ? `🏅 HADIAH PODIUM #${R.myRank}` : customDia > 0 ? `💎 HADIAH PERINGKAT #${R.myRank || '-'}` : '🤝 BONUS PARTISIPASI DUEL'}</div>
          <div class="duel-reward-pills">
            ${rw.xpGain ? `<span class="duel-rw-pill xp">⚡ +${rw.xpGain} EXP</span>` : ''}
            ${win && rw.cardBonusXp ? `<span class="duel-rw-pill xp">🃏 Kartu Andalan +${rw.cardBonusXp} EXP</span>` : ''}
            ${customDia > 0 ? `<span class="duel-rw-pill dia">💎 +${customDia} Diamond (Masuk Saldo)</span>` : ''}
            ${!customDia && rw.diaGain ? `<span class="duel-rw-pill dia">💎 +${rw.diaGain} Diamond</span>` : ''}
            ${win && rw.wager ? `<span class="duel-rw-pill wager">💰 Menang Taruhan ${rw.wager} EXP</span>` : ''}
          </div>
        </div>` : '';

      if (isMP) {
        const totalPlayers = R.totalPlayers || D.playerCount || (R.standings?.length || 0);
        const top3 = (Array.isArray(R.top3) && R.top3.length ? R.top3 : (R.standings || []).slice(0, 3)).slice(0, 3);
        const myP = R.myStanding || (R.standings || []).find(p => p.isMe) || null;
        const myRank = R.myRank || myP?.rank || 1;
        const myScore = myP?.score ?? D.me.score ?? 0;
        const myTimeMs = myP?.timeMs ?? D.me.timeMs ?? 0;
        const myAvgMs = myP?.avgMs || 0;
        const podiumOrder = top3.length === 3 ? [top3[1], top3[0], top3[2]] : top3;
        const podiumHtml = `<div class="duel-podium">${podiumOrder.map(p => {
          const medal = p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : '🥉';
          return `<div class="duel-podium-slot place-${p.rank}${p.isMe ? ' me' : ''}">
            <span class="duel-podium-medal">${medal}</span>
            ${avatar(p, p.isMe ? '' : 'opp')}
            <b>${esc(p.name)}</b>
            <span class="duel-podium-score">${p.score}/${D.total}</span>
            <small>⏱ ${p.answered ? fmtMs(p.timeMs) : '-'}</small>
            ${p.prizeDiamonds > 0 ? `<span class="duel-podium-dia">💎 +${p.prizeDiamonds}</span>` : ''}
          </div>`;
        }).join('')}</div>`;

        const privateCardHtml = `
          <div class="duel-private-card">
            <div class="duel-private-head">
              <span>🔒 <b>Hasil Pribadimu</b></span>
              <em>Hanya terlihat olehmu</em>
            </div>
            <div class="duel-private-grid">
              <div class="duel-private-stat"><small>PERINGKAT</small><b>#${myRank}<em> / ${totalPlayers}</em></b></div>
              <div class="duel-private-stat"><small>SKOR BENAR</small><b>${myScore}<em> / ${D.total}</em></b></div>
              <div class="duel-private-stat"><small>TOTAL WAKTU</small><b>⏱ ${myP?.answered || D.me.answered ? fmtMs(myTimeMs) : '-'}</b></div>
              <div class="duel-private-stat"><small>KECEPATAN</small><b>${myAvgMs ? fmtSpeedSec(myAvgMs) : '-'}</b></div>
            </div>
            ${customDia > 0 ? `<div class="duel-private-dia">💎 Kamu mendapatkan <b>+${customDia} Diamond</b> dari room ini!</div>` : ''}
            <small class="duel-private-note">Demi menjaga privasi setiap peserta, papan publik hanya menampilkan <b>Top 3</b>. Peringkat &amp; skormu di luar Top 3 hanya kamu yang tahu.</small>
          </div>`;

        let standingsSectionHtml = '';
        if (D.canInspectFull && !R.privacyMode) {
          const allStand = Array.isArray(R.standings) ? R.standings : top3;
          const q = String(S.inspectSearch || '').trim().toLowerCase();
          const filtered = q ? allStand.filter(p => `${p.name || ''} ${p.username || ''} #${p.rank}`.toLowerCase().includes(q)) : allStand;
          const rowsHtml = filtered.map(p => {
            const medal = p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : p.rank === 3 ? '🥉' : `#${p.rank}`;
            const stText = p.forfeited ? 'Keluar' : p.eliminated ? 'KO' : p.done ? 'Selesai' : `${p.answered}/${D.total}`;
            return `<div class="duel-stand-row${p.isMe ? ' me' : ''}">
              <span class="duel-stand-rank ${p.rank <= 3 ? `top-${p.rank}` : ''}">${medal}</span>
              ${avatar(p, p.isMe ? '' : 'opp')}
              <div class="duel-stand-who">
                <b>${esc(p.name)}${p.isMe ? ' <em class="soc-tag me">Kamu</em>' : ''}</b>
                <small>${p.tierRank ? `${p.tierRank.icon} ${esc(p.tierRank.fullName)} • ` : ''}${stText}${p.avgMs ? ` • ${fmtSpeedSec(p.avgMs)}` : ''}${p.prizeDiamonds > 0 ? ` • 💎+${p.prizeDiamonds}` : ''}</small>
              </div>
              <div class="duel-stand-stat">
                <b>${p.score}<em>/${D.total}</em></b>
                <small>⏱ ${p.answered ? fmtMs(p.timeMs) : '-'}</small>
              </div>
            </div>`;
          }).join('');
          standingsSectionHtml = `<div class="duel-standings">
            <div class="duel-standings-head">
              <span>👁️ Klasemen Lengkap Admin (${filtered.length}/${allStand.length})</span>
              <input type="text" class="duel-inspect-search compact" data-soc-inspect-search value="${esc(S.inspectSearch)}" placeholder="Cari peserta…" aria-label="Cari peserta">
            </div>
            ${rowsHtml || '<p class="soc-empty">Tidak ada peserta cocok.</p>'}
          </div>`;
        } else {
          standingsSectionHtml = privateCardHtml;
        }

        const headline = myRank === 1 ? 'Juara #1 Arena Multiplayer!' : myRank <= 3 ? `Podium Peringkat #${myRank}!` : `Peringkat #${myRank} dari ${totalPlayers}`;
        return `<div class="card soc-card soc-center soc-result ${myRank === 1 ? 'win' : myRank <= 3 ? 'draw' : 'lose'}">
          <div class="soc-emoji">${myRank === 1 ? '🏆' : myRank === 2 ? '🥈' : myRank === 3 ? '🥉' : '🏁'}</div>
          <div class="duel-tags-row center"><span class="duel-tag mp">👥 ${totalPlayers} Pemain</span>${modePill(D.mode)}${wagerPill(D.wager)}${prizePill(D.prizes)}</div>
          <h3>${headline}</h3>
          <p>Skormu <b>${myScore}/${D.total}</b> dalam <b>⏱ ${myP?.answered || D.me.answered ? fmtMs(myTimeMs) : '-'}</b> • Dinilai dari total benar &amp; kecepatan</p>
          <div class="duel-top3-label">🏆 TOP 3 PODIUM PUBLIK</div>
          ${podiumHtml}
          ${standingsSectionHtml}
          ${rankResultCard}
          ${rewardBanner}
          <button type="button" class="duel-share-win-btn" data-soc-share-duel>📣 Pamerkan Peringkat ke Status</button>
          <div class="soc-btns2"><button type="button" class="secondary" data-soc-lobby>Ke Lobi Arena</button><button type="button" class="primary" data-soc-rematch>🚀 Buat Room Lagi</button></div>
        </div>
        <div class="card soc-card"><h4>📝 Pembahasan Soal</h4>${review}</div>`;
      }

      const bar = (name, s, me, fObj, rkObj, cRaw) => `<div class="soc-score${me ? ' me' : ''}">
        <small>${esc(name)}</small>
        <div class="duel-score-rank">${rkObj ? rankPill(rkObj, false) : ''}${cardPill(cRaw)}</div>
        <b>${s.score}<em>/${D.total}</em></b>
        <span>⏱ ${s.done ? fmtMs(s.timeMs) : 'belum selesai'}</span>
        <div class="duel-res-sub">
          ${isSD ? renderHearts(fObj?.hearts ?? 3, D.maxHearts || 3) : ''}
          ${(fObj?.maxStreak || 0) >= 2 ? `<span class="duel-streak-pill">🔥 Max Streak ${fObj.maxStreak}x</span>` : ''}
        </div>
      </div>`;

      return `<div class="card soc-card soc-center soc-result ${draw ? 'draw' : win ? 'win' : 'lose'}">
        <div class="soc-emoji">${draw ? '🤝' : R.reason === 'knockout' && win ? '💀🏆' : win ? '🏆' : '💪'}</div>
        <div class="duel-tags-row center">${modePill(D.mode)}${wagerPill(D.wager)}${prizePill(D.prizes)}${h2hBadge(opp?.id)}</div>
        <h3>${draw ? 'Pertarungan Seri!' : win ? 'Kamu Menang!' : `${oppName} Menang`}</h3>
        <p>${reasonText(R.reason, win, draw)}</p>
        ${rankResultCard}
        ${rewardBanner}
        <div class="soc-scores">${bar('Kamu', R.me, true, D.me, newRk, D.me?.card || getMyShowcaseCard())}${bar(opp?.name || 'Lawan', R.opponent, false, opp, oppRk, opp?.card)}</div>
        <button type="button" class="duel-share-win-btn" data-soc-share-duel>📣 Pamerkan Hasil Duel ke Status</button>
        <div class="soc-btns2"><button type="button" class="secondary" data-soc-lobby>Ke Lobi Arena</button><button type="button" class="primary" data-soc-rematch>⚔️ Tanding Ulang</button></div>
      </div>
      <div class="card soc-card"><h4>📝 Pembahasan &amp; Perbandingan Jawaban</h4>${review}</div>`;
    }

    // ───────── DUEL AKTIF (1v1 TUG-OF-WAR atau MULTIPLAYER LIVE RACE) ─────────
    const pct = n => Math.round((n / D.total) * 100), mineN = D.myAnswers.length;
    const myLiveScore = D.me.liveScore ?? D.me.score ?? 0;
    const oppLiveScore = opp?.liveScore ?? 0;
    const lead = myLiveScore - oppLiveScore;
    const tugPct = Math.max(12, Math.min(88, 50 + lead * Math.round(36 / Math.max(3, D.total / 2))));

    const board = isMP ? mpBoardHTML(D, flash) : `
    <div class="duel-arena-board">
      <div class="duel-board">
        <div class="duel-side me${(D.me.streak || 0) >= 2 ? ' on-fire' : ''}">
          ${emoteBubbleHTML('me')}
          ${avatar(D.me)}
          <div class="duel-fighter-info">
            <b>Kamu</b>
            <span>${mineN}/${D.total} soal • ✅ ${myLiveScore}</span>
            <div class="duel-fighter-meta">
              ${rankPill(myRk, false)}
              ${cardPill(D.me?.card || getMyShowcaseCard())}
              ${isSD ? renderHearts(D.me.hearts ?? 3, D.maxHearts || 3) : ''}
              ${(D.me.streak || 0) >= 2 ? `<span class="duel-streak-pill">🔥 ${D.me.streak}x</span>` : ''}
            </div>
          </div>
          <i style="--w:${pct(mineN)}%"></i>
        </div>
        <div class="duel-vs">
          <span class="duel-vs-badge">VS</span>
          ${D.perQ ? `<small class="duel-mode-mini">${isSD ? '💀 3❤️' : '🏆'}</small>` : `<small id="duelClock">${fmtMs(D.deadlineAt - nowS())}</small>`}
        </div>
        <div class="duel-side opp${(opp?.streak || 0) >= 2 ? ' on-fire' : ''}">
          ${emoteBubbleHTML('opp')}
          ${avatar(opp || {}, 'opp')}
          <div class="duel-fighter-info">
            <b>${oppName}</b>
            <span>${opp?.answered ?? 0}/${D.total} soal • 🎯 ${oppLiveScore}</span>
            <div class="duel-fighter-meta">
              ${oppRk ? rankPill(oppRk, false) : ''}
              ${cardPill(opp?.card)}
              ${isSD ? renderHearts(opp?.hearts ?? 3, D.maxHearts || 3) : ''}
              ${(opp?.streak || 0) >= 2 ? `<span class="duel-streak-pill">🔥 ${opp.streak}x</span>` : ''}
            </div>
          </div>
          <i style="--w:${pct(opp?.answered ?? 0)}%"></i>
        </div>
      </div>

      <div class="duel-tug" title="Indikator Tarik Tambang Keunggulan Skor">
        <div class="duel-tug-head">
          <span class="me-side">⚡ Kamu (${myLiveScore})</span>
          <b class="${lead > 0 ? 'lead-me' : lead < 0 ? 'lead-opp' : ''}">${lead > 0 ? `Unggul +${lead} Poin 🔥` : lead < 0 ? `Tertinggal ${lead} Poin ⚠️` : 'Skor Seimbang ⚖️'}</b>
          <span class="opp-side">${oppName} (${oppLiveScore}) ⚡</span>
        </div>
        <div class="duel-tug-track">
          <i class="duel-tug-fill" style="width:${tugPct}%"></i>
          <span class="duel-tug-knot" style="left:${tugPct}%">⚔️</span>
        </div>
      </div>

      ${flash ? `<div class="duel-opp-flash ${flash.ok ? 'ok' : 'bad'}">${esc(flash.text)}</div>` : ''}
    </div>`;

    if (nowS() < D.startedAt) {
      return board + `<div class="card soc-card soc-center duel-countdown-card">
        <div class="duel-tags-row center">${isMP ? `<span class="duel-tag mp">👥 ${D.playerCount} Pemain</span>` : ''}${modePill(D.mode)}${wagerPill(D.wager)}${prizePill(D.prizes)}${isMP ? '' : h2hBadge(opp?.id)}</div>
        ${isMP ? '' : vsCardShowcaseHTML('Kamu', D.me?.card, opp?.name || 'Lawan', opp?.card)}
        <p>${isMP ? 'Siapkan dirimu! Adu cepat &amp; skor benar dimulai dalam…' : 'Siapkan dirimu! Pertarungan dimulai dalam…'}</p>
        <div class="soc-count" id="duelGo">${Math.max(1, Math.ceil((D.startedAt - nowS()) / 1000))}</div>
        <p class="soc-hint">${esc(D.bank.name)} • ${D.total} soal • ${secText(D.perQ)}</p>
      </div>` + emoteBarHTML();
    }

    const fbIdx = S.fb != null && S.fb === mineN - 1 ? S.fb : null, qi = fbIdx != null ? fbIdx : mineN;
    let main;
    if (D.me?.eliminated && isSD) {
      main = `<div class="card soc-card soc-center"><div class="soc-emoji">💀</div><h3>Nyawamu Habis (KO)</h3><p>Skor akhirmu: ✅ ${D.me.score}/${D.total}. Pantau klasemen live di atas sampai peserta lain selesai!</p></div>`;
    } else if (qi >= D.total) {
      main = `<div class="card soc-card soc-center"><div class="soc-emoji soc-pulse">🏁</div><h3>${isMP ? 'Kamu Sudah Selesai! Menunggu peserta lain…' : `Menunggu ${oppName} menyelesaikan soal…`}</h3><p>Skormu: ✅ ${D.me.score}/${D.total} • ⏱ ${fmtMs(D.me.timeMs || 0)}${isMP ? ` • Peringkat sementara #${D.myRank}` : ''}. Kirim stiker sambil menunggu!</p></div>`;
    } else {
      const q = D.questions[qi], a = fbIdx != null ? D.myAnswers[qi] : null, timed = D.perQ > 0;
      main = `<div class="card soc-card duel-qcard">
        ${timed && !a ? `<div class="soc-qtimer"><i id="duelQBar" style="width:100%"></i><b id="duelQSec">${D.perQ / 1000}</b></div>` : ''}
        <div class="duel-qmeta">
          <small class="soc-qn">SOAL ${qi + 1} DARI ${D.total}</small>
          ${(D.me.streak || 0) >= 2 ? `<span class="duel-streak-pill">🔥 Combo Streak ${D.me.streak}x!</span>` : ''}
        </div>
        <p class="soc-q">${esc(q.soal)}</p>
        <div class="soc-opts">${q.opsi.map((o, i) => { const cls = a ? (i === a.correctIdx ? 'ok' : i === a.choice ? 'bad' : '') : ''; return `<button type="button" class="soc-opt ${cls}" data-soc-opt="${i}" ${a ? 'disabled' : ''}><span class="soc-l">${L5[i]}</span><span>${esc(o)}</span></button>`; }).join('')}</div>
        ${a ? `<div class="soc-fb ${a.ok ? 'ok' : 'bad'}"><b>${a.ok ? `✅ Tepat sekali!${(D.me.streak || 0) >= 2 ? ` (🔥 Streak ${D.me.streak}x)` : ''}` : a.choice === -1 ? `⏰ Waktu habis!${isSD ? ' (-1 ❤️ Nyawa)' : ''}` : `❌ Kurang tepat!${isSD ? ' (-1 ❤️ Nyawa)' : ''}`}</b>${!timed && a.pembahasan ? `<p>${esc(a.pembahasan)}</p>` : ''}</div>${timed ? '' : `<button type="button" class="primary soc-big" data-soc-next>${qi + 1 < D.total ? 'Soal Berikutnya ›' : 'Lihat Hasil ›'}</button>`}` : ''}
      </div>`;
    }
    return board + emoteBarHTML() + main + `<button type="button" class="secondary soc-big soc-danger" data-soc-leave>🏳️ ${isMP ? 'Keluar dari Race' : 'Menyerah dari Duel'}</button>`;
  }

  function renderDuel() {
    ensureShell();
    const b = $('duelBody'); if (!b) return;
    const D = S.D;
    $('duelTitle').textContent = D?.isSpectator
      ? `👁️ Admin Inspect (${D.playerCount || 0}/${D.maxPlayers || 2})`
      : D?.status === 'finished'
        ? (D?.isMultiplayer ? '🏁 Hasil Arena Multiplayer' : '🏁 Hasil Arena Duel')
        : D?.isMultiplayer
          ? `👥 Arena Multiplayer (${D.playerCount || 1}/${D.maxPlayers || 2})`
          : (D?.mode === 'sudden_death' ? '💀 Duel Sudden Death' : '⚔️ Arena Duel');
    const activeEl = document.activeElement;
    const keepInspectFocus = activeEl?.matches?.('[data-soc-inspect-search]');
    const selPos = keepInspectFocus && typeof activeEl.selectionStart === 'number' ? activeEl.selectionStart : null;
    b.innerHTML = duelHTML();
    if (keepInspectFocus) {
      const inp = b.querySelector('[data-soc-inspect-search]');
      if (inp) {
        inp.focus({ preventScroll: true });
        if (selPos != null && typeof inp.setSelectionRange === 'function') {
          try { inp.setSelectionRange(selPos, selPos); } catch {}
        }
      }
    }
    if (D?.status === 'active') startTick(); else stopTick();
    syncWaitingFloat();
  }
  async function openDuel(id) {
    S.fb = null; S.mpExpandAll = false; S.inspectSearch = ''; window.show('duelPage');
    $('duelBody') && ($('duelBody').innerHTML = '<p class="soc-empty">Memuat ruang duel…</p>');
    try { syncD((await api('/api/duels/' + encodeURIComponent(id))).duel); } catch (e) { S.D = null; toast(e.message, true); return openLobby(); }
    renderDuel();
  }
  async function refreshDuel() {
    if (!S.D) return;
    try { syncD((await api('/api/duels/' + encodeURIComponent(S.D.id))).duel); if (activeView() === 'duelPage') renderDuel(); } catch {}
  }

  /* ───────── aksi ───────── */
  const guard = async fn => { if (S.busy) return; S.busy = true; try { await fn(); } catch (e) { toast(e.message || 'Terjadi kesalahan.', true); } finally { S.busy = false; } };
  async function createDuel(friendId) {
    if (!S.block && S.blocks.length) S.block = S.blocks[0].block;
    if (!S.block && !S.selectedBankIds.length) return toast('Pilih blok atau bank soal dulu.', true);
    const card = window.CLINED_CARDS?.getEquippedPayload?.() || null;
    const prizes = isAdmin() ? activePrizes() : null;
    const d = await api('/api/duels', {
      method: 'POST',
      body: {
        block: S.block,
        bankId: `block:${S.block}`,
        ...(S.selectedBankIds.length ? { bankIds: S.selectedBankIds } : {}),
        count: S.count,
        seconds: S.sec,
        mode: S.mode,
        wager: S.wager,
        maxPlayers: friendId ? 2 : S.maxPlayers,
        isPublic: friendId ? false : S.isPublic,
        ...(prizes ? { prizes } : {}),
        ...(card ? { card } : {}),
        ...(friendId ? { friendId } : {})
      }
    });
    syncD(d.duel);
    if (d.duel) S.mine = [d.duel, ...S.mine.filter(x => x.id !== d.duel.id && x.status !== 'waiting')];
    S.fb = null; S.sentFor = -1; S.mpExpandAll = false; S.inspectSearch = ''; window.show('duelPage'); renderDuel();
    if (friendId) toast('Tantangan terkirim ⚔️');
    else if (d.duel?.isMultiplayer) toast(d.duel.isPublic ? `🌐 Room Multiplayer (${d.duel.maxPlayers} orang) dibuka!` : `🔒 Room Private dibuat! Kode password: ${d.duel.code}`);
  }
  async function quickMatch() {
    if (!S.block && S.blocks.length) S.block = S.blocks[0].block;
    if (!S.block && !S.selectedBankIds.length) return toast('Pilih blok atau bank soal dulu.', true);
    const card = window.CLINED_CARDS?.getEquippedPayload?.() || null;
    const prizes = isAdmin() ? activePrizes() : null;
    const d = await api('/api/duels/quick', {
      method: 'POST',
      body: {
        block: S.block,
        bankId: `block:${S.block}`,
        ...(S.selectedBankIds.length ? { bankIds: S.selectedBankIds } : {}),
        count: S.count,
        seconds: S.sec,
        mode: S.mode,
        wager: S.wager,
        maxPlayers: S.maxPlayers,
        ...(prizes ? { prizes } : {}),
        ...(card ? { card } : {})
      }
    });
    syncD(d.duel);
    if (d.duel) S.mine = [d.duel, ...S.mine.filter(x => x.id !== d.duel.id && x.status !== 'waiting')];
    S.fb = null; S.sentFor = -1; S.mpExpandAll = false; S.inspectSearch = ''; window.show('duelPage'); renderDuel();
    toast(d.matched ? '⚡ Lawan ditemukan! Bersiap bertarung!' : d.joined ? '👥 Berhasil masuk room multiplayer! Menunggu Host memulai.' : '🌐 Room Open Access dibuat! Kamu bisa kerjakan soal dulu sambil menunggu.');
  }
  async function startMultiplayer() {
    const D = S.D; if (!D) return;
    const r = await api(`/api/duels/${encodeURIComponent(D.id)}/start`, { method: 'POST', body: {} });
    syncD(r.duel);
    S.fb = null; S.sentFor = -1;
    renderDuel();
    toast('🚀 Pertarungan dimulai! Bersiap!');
  }
  async function finishRoomByAdmin() {
    const D = S.D; if (!D) return;
    if (!(await clinedConfirm({
      title: 'Akhiri room sekarang?',
      lines: ['Pertarungan akan langsung diselesaikan menggunakan skor saat ini, dan hadiah diamond (jika ada) langsung dibagikan ke semua peserta.'],
      ok: 'Ya, akhiri sekarang',
      cancel: 'Lanjutkan',
      tone: 'danger'
    }))) return;
    const r = await api(`/api/duels/${encodeURIComponent(D.id)}/finish`, { method: 'POST', body: {} });
    syncD(r.duel);
    renderDuel();
    toast('🏁 Room telah diakhiri & klasemen akhir dikunci.');
  }
  async function regenCode() {
    const D = S.D; if (!D) return;
    const r = await api(`/api/duels/${encodeURIComponent(D.id)}/regenerate-code`, { method: 'POST', body: {} });
    syncD(r.duel);
    renderDuel();
    toast(`🔄 Kode password baru: ${r.code}`);
  }
  async function joinByCode(code) {
    const card = window.CLINED_CARDS?.getEquippedPayload?.() || null;
    const d = await api('/api/duels/join', { method: 'POST', body: { code, ...(card ? { card } : {}) } });
    syncD(d.duel);
    if (d.duel) S.mine = [d.duel, ...S.mine.filter(x => x.id !== d.duel.id && x.status !== 'waiting')];
    S.fb = null; S.sentFor = -1; window.show('duelPage'); renderDuel();
  }
  async function answer(choice) {
    const D = S.D; if (!D || D.status !== 'active' || D.isSpectator) return;
    const idx = D.myAnswers.length;
    const d = await api(`/api/duels/${encodeURIComponent(D.id)}/answer`, { method: 'POST', body: { idx, choice } });
    syncD(d.duel); S.fb = idx; renderDuel();
    if (S.D.perQ > 0 && S.D.status === 'active' && idx + 1 < S.D.total) setTimeout(() => { if (S.fb === idx) { S.fb = null; if (activeView() === 'duelPage') renderDuel(); } }, 1100);
  }
  async function sendEmote(key) {
    const D = S.D; if (!D) return;
    const item = DUEL_EMOTES.find(e => e[0] === key);
    if (!item) return;
    showEmoteBubble('me', item[1], item[2]);
    try { await api(`/api/duels/${encodeURIComponent(D.id)}/emote`, { method: 'POST', body: { emoteId: key } }); } catch {}
  }

  window.addEventListener('clined:card-equipped', () => {
    if (activeView() === 'socialPage') renderLobby(false);
  });

  document.addEventListener('click', e => {
    const t = e.target.closest('button, summary'); if (!t) return;
    if (t.id === 'socialBtn') return openLobby();
    if (t.id === 'hubBtn') return openHub();
    if (t.matches('[data-soc-home]')) return window.show('home');
    if (t.matches('[data-soc-lobby]')) { S.D = null; stopTick(); return openLobby(); }
    const ds = t.dataset || {};
    if (t.id === 'shareStatusBtn') return openComposer(resultContext());
    if ('socShareDuel' in ds) return openComposer(duelResultContext());
    if ('socRankModal' in ds) return openRankModal();
    if ('socOpenCards' in ds) { window.CLINED_CARD_SHOP?.show?.(); return; }
    if ('socStudyWait' in ds) {
      const target = S.mine.find(x => x.id === ds.socStudyWait) || S.D;
      return openStudyWhileWaiting(target);
    }
    if ('socCancelWait' in ds) return guard(async () => {
      const id = ds.socCancelWait;
      if (!(await clinedConfirm({ title: 'Batalkan ruang duel?', lines: ['Ruang publikmu akan dihapus dari daftar Tantangan Terbuka.'], ok: 'Ya, batalkan', cancel: 'Tetap menunggu', tone: 'danger' }))) return;
      await api(`/api/duels/${encodeURIComponent(id)}/leave`, { method: 'POST', body: {} });
      S.mine = S.mine.filter(x => x.id !== id);
      if (S.D?.id === id) { S.D = null; stopTick(); }
      syncWaitingFloat();
      toast('Ruang duel dibatalkan.');
      await loadLobby();
      if (activeView() === 'socialPage') renderLobby(false);
    });
    if ('socTab' in ds) { S.hubTab = ds.socTab; if (S.hubTab === 'status') S.feed = null; return renderHub(); }
    if ('socHub' in ds) return openHub(ds.socHub);
    if ('socRefreshLobby' in ds) return guard(() => renderLobby(true));
    if ('socInspect' in ds) return openDuel(ds.socInspect);
    if ('socInspectRefresh' in ds) return guard(() => refreshDuel());
    if ('socAdminFinish' in ds) return guard(() => finishRoomByAdmin());
    if ('socQuick' in ds) return guard(() => quickMatch());
    if ('socMode' in ds) { S.mode = ds.socMode; savePref(); return renderLobby(false); }
    if ('socWager' in ds) { S.wager = Number(ds.socWager); savePref(); return renderLobby(false); }
    if ('socVis' in ds) { S.isPublic = ds.socVis === '1'; savePref(); return renderLobby(false); }
    if ('socMaxp' in ds) { const n = Math.max(2, Math.min(100, Math.floor(Number(ds.socMaxp) || 2))); S.maxPlayers = n; savePref(); return renderLobby(false); }
    if ('socBankToggle' in ds) { S.bankPickerOpen = !S.bankPickerOpen; return renderLobby(false); }
    if ('socBankAllblocks' in ds) { S.bankAllBlocks = !S.bankAllBlocks; return renderLobby(false); }
    if ('socBankAll' in ds) {
      const q = String(S.bankSearch || '').trim().toLowerCase();
      const vis = (S.duelBanks || []).filter(b => (S.bankAllBlocks || !S.block || b.block === S.block) && (!q || `${b.name} ${b.block}`.toLowerCase().includes(q)));
      const set = new Set(S.selectedBankIds);
      vis.forEach(b => set.add(b.id));
      S.selectedBankIds = [...set].slice(0, 60);
      return renderLobby(false);
    }
    if ('socBankClear' in ds) { S.selectedBankIds = []; return renderLobby(false); }
    if ('socPrizeReset' in ds) { S.prizes = { first: 0, second: 0, third: 0, others: 0 }; savePref(); return renderLobby(false); }
    if ('socStartMp' in ds) return guard(() => startMultiplayer());
    if ('socRegenCode' in ds) return guard(() => regenCode());
    if ('socMpExpand' in ds) { S.mpExpandAll = !S.mpExpandAll; return renderDuel(); }
    if ('socEmote' in ds) { sendEmote(ds.socEmote); return; }
    if ('socComment' in ds) {
      const id = ds.socComment;
      if (S.openC.has(id)) { S.openC.delete(id); return renderHub(false); }
      S.openC.add(id); S.comments[id] = null; renderHub(false);
      return api('/api/status/comments?id=' + encodeURIComponent(id)).then(d => { S.comments[id] = d.comments || []; }).catch(err => { S.comments[id] = []; toast(err.message, true); }).finally(() => { if (activeView() === 'hubPage') renderHub(false); });
    }
    if ('socCsend' in ds) return guard(async () => {
      const id = ds.socCsend, inp = document.querySelector(`[data-soc-cinput="${CSS.escape(id)}"]`), message = (inp?.value || '').trim();
      if (!message) return toast('Tulis komentarmu dulu.', true);
      await api('/api/status/comment', { method: 'POST', body: { id: Number(id), message } });
      const [c, f] = await Promise.all([api('/api/status/comments?id=' + encodeURIComponent(id)), api('/api/status')]);
      S.comments[id] = c.comments || []; S.feed = f.posts || []; S.canMod = !!f.canModerate; renderHub(false);
      document.querySelector(`[data-soc-cinput="${CSS.escape(id)}"]`)?.focus({ preventScroll: true });
    });
    if ('socCdel' in ds) return guard(async () => {
      await api('/api/status/comment/delete', { method: 'POST', body: { id: Number(ds.socCdel) } });
      const id = ds.post, [c, f] = await Promise.all([api('/api/status/comments?id=' + encodeURIComponent(id)), api('/api/status')]);
      S.comments[id] = c.comments || []; S.feed = f.posts || []; S.canMod = !!f.canModerate; renderHub(false);
    });
    if ('socFilter' in ds) { S.filter = ds.socFilter; return renderHub(false); }
    if ('socNewstatus' in ds) return openComposer({});
    if ('socReact' in ds) return guard(async () => {
      const p = S.feed?.find(x => x.id === ds.socReact); const same = p?.mine === ds.emoji;
      await api('/api/status/react', { method: 'POST', body: { id: Number(ds.socReact), emoji: same ? null : ds.emoji } });
      await loadFeed(); renderHub(false);
    });
    if ('socDelstatus' in ds) return guard(async () => {
      if (!(await clinedConfirm({ title: 'Hapus status ini?', lines: [ds.own === '0' ? 'Moderasi admin: status ini hilang untuk semua pengguna.' : 'Status akan hilang dari feed.'], ok: 'Hapus', tone: 'danger' }))) return;
      await api('/api/status/delete', { method: 'POST', body: { id: Number(ds.socDelstatus) } }); await loadFeed(); renderHub(false);
    });
    if ('socCount' in ds) { S.count = Number(ds.socCount); savePref(); return renderLobby(false); }
    if ('socSec' in ds) { S.sec = Number(ds.socSec); savePref(); return renderLobby(false); }
    if ('socCreate' in ds) return guard(() => createDuel());
    if ('socChallenge' in ds) return guard(() => createDuel(ds.socChallenge));
    if ('socJoin' in ds) return guard(() => joinByCode($('socCode').value));
    if ('socAccept' in ds) return guard(() => joinByCode(ds.socAccept));
    if ('socDecline' in ds) return guard(async () => { await api(`/api/duels/${encodeURIComponent(ds.socDecline)}/decline`, { method: 'POST', body: {} }); S.D = null; openLobby(); });
    if ('socOpen' in ds) return openDuel(ds.socOpen);
    if ('socOpt' in ds) return guard(() => answer(Number(ds.socOpt)));
    if ('socNext' in ds) { S.fb = null; return renderDuel(); }
    if ('socCopy' in ds) { try { navigator.clipboard.writeText(ds.socCopy); toast('Kode disalin 📋'); } catch { toast('Kode: ' + ds.socCopy); } return; }
    if ('socShare' in ds) {
      const text = `Ayo duel soal di Arena CLINED! Masukkan kode password ${ds.socShare} di menu Duel.`;
      if (navigator.share) return navigator.share({ text }).catch(() => {});
      try { navigator.clipboard.writeText(text); toast('Ajakan disalin 📋'); } catch {} return;
    }
    if ('socLeave' in ds) return guard(async () => {
      const D = S.D, act = D?.status === 'active', mp = !!D?.isMultiplayer;
      if (act && !(await clinedConfirm({
        title: mp ? 'Keluar dari race multiplayer?' : 'Menyerah dari duel?',
        lines: [mp ? 'Kamu akan ditandai **keluar** di urutan bawah, sementara peserta lain tetap melanjutkan balapan.' : 'Kamu dianggap **kalah** dan lawan langsung menang.'],
        ok: mp ? 'Keluar' : 'Menyerah', cancel: 'Lanjut main', tone: 'danger'
      }))) return;
      await api(`/api/duels/${encodeURIComponent(D.id)}/leave`, { method: 'POST', body: {} });
      S.mine = S.mine.filter(x => x.id !== D.id);
      S.D = null; stopTick(); syncWaitingFloat(); openLobby();
    });
    if ('socRematch' in ds) return guard(async () => {
      const D = S.D, opp = D?.opponent;
      if (typeof D?.bank?.id === 'string' && D.bank.id.startsWith('block:')) S.block = D.bank.id.slice(6);
      S.count = D.total; S.sec = (D.perQ || 0) / 1000;
      if (D.mode) S.mode = D.mode;
      if (D.wager != null) S.wager = D.wager;
      if (D.maxPlayers) S.maxPlayers = D.maxPlayers;
      const friend = !D.isMultiplayer && opp && S.F?.friends?.some(f => f.id === opp.id);
      await createDuel(friend ? opp.id : undefined);
    });
    if ('socAdd' in ds) return guard(async () => {
      const r = await api('/api/friends/request', { method: 'POST', body: { username: $('socUser').value } });
      toast(r.status === 'accepted' ? `Sekarang berteman dengan ${r.user.name} 🎉` : `Permintaan dikirim ke ${r.user.name}`);
      $('socUser').value = ''; await refreshActive();
    });
    if ('socRespond' in ds) return guard(async () => { await api('/api/friends/respond', { method: 'POST', body: { id: Number(ds.socRespond), accept: ds.accept === '1' } }); await refreshActive(); });
    if ('socUnblock' in ds) return guard(async () => { await api('/api/friends/unblock', { method: 'POST', body: { userId: ds.socUnblock } }); await refreshActive(); });
    if ('socRemove' in ds) return guard(async () => {
      if (!ds.quiet && !(await clinedConfirm({ title: 'Hapus teman?', lines: [`**${ds.name}** dihapus dari daftar temanmu.`], ok: 'Hapus', tone: 'danger' }))) return;
      await api('/api/friends/remove', { method: 'POST', body: { userId: ds.socRemove } }); await refreshActive();
    });
    if ('socBlock' in ds) return guard(async () => {
      if (!(await clinedConfirm({ title: `Blokir ${ds.name}?`, lines: ['Dia tidak bisa menambahkan atau menantangmu lagi.', 'Pertemanan kalian juga dihapus.'], ok: 'Blokir', tone: 'danger' }))) return;
      await api('/api/friends/block', { method: 'POST', body: { userId: ds.socBlock } }); await refreshActive();
    });
  });
  document.addEventListener('change', e => {
    if (e.target.matches('[data-soc-block]')) {
      S.block = e.target.value;
      if (!S.bankAllBlocks) S.selectedBankIds = [];
      savePref();
      renderLobby(false);
    }
    if (e.target.matches('[data-soc-bank-chk]')) {
      const id = e.target.dataset.socBankChk;
      if (e.target.checked) {
        if (!S.selectedBankIds.includes(id)) S.selectedBankIds = [...S.selectedBankIds, id].slice(0, 60);
      } else {
        S.selectedBankIds = S.selectedBankIds.filter(x => x !== id);
      }
      renderLobby(false);
    }
    if (e.target.matches('[data-soc-maxp-input]')) {
      const n = Math.max(2, Math.min(100, Math.floor(Number(e.target.value) || 2)));
      S.maxPlayers = n;
      e.target.value = String(n);
      savePref();
      renderLobby(false);
    }
    if (e.target.matches('[data-soc-prize]')) {
      const k = e.target.dataset.socPrize;
      if (k && ['first', 'second', 'third', 'others'].includes(k)) {
        const v = cleanPrizeNum(e.target.value);
        S.prizes[k] = v;
        e.target.value = String(v);
        savePref();
        renderLobby(false);
      }
    }
  });
  document.addEventListener('input', e => {
    if (e.target.matches('[data-soc-code]')) e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (e.target.matches('[data-soc-bank-search]')) {
      S.bankSearch = e.target.value;
      renderLobby(false);
    }
    if (e.target.matches('[data-soc-inspect-search]')) {
      S.inspectSearch = e.target.value;
      renderDuel();
    }
    if (e.target.matches('[data-soc-prize]')) {
      const k = e.target.dataset.socPrize;
      if (k && ['first', 'second', 'third', 'others'].includes(k)) {
        S.prizes[k] = cleanPrizeNum(e.target.value);
        savePref();
      }
    }
    if (e.target.matches('[data-soc-maxp-input]')) {
      const raw = Number(e.target.value);
      if (Number.isFinite(raw) && raw >= 2 && raw <= 100) {
        S.maxPlayers = Math.floor(raw);
        savePref();
      }
    }
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    if (e.target.matches?.('[data-soc-user]')) $('hubBody')?.querySelector('[data-soc-add]')?.click();
    if (e.target.matches?.('[data-soc-cinput]')) e.target.closest('.soc-cform')?.querySelector('[data-soc-csend]')?.click();
    if (e.target.matches?.('[data-soc-code]')) $('socialBody')?.querySelector('[data-soc-join]')?.click();
  });

  /* ───────── realtime ───────── */
  const HEARTBEAT_STALE_MS = 40_000, IDLE_MS = 5 * 60_000, LOBBY_POLL_MS = 12_000;
  const TYPING_SEL = '[data-soc-code],[data-soc-user],[data-soc-cinput],[data-soc-bank-search],[data-soc-maxp-input],[data-soc-prize],[data-soc-inspect-search]';
  let es = null, nextTry = 0, delay = 3000, connId = '', lastBeatAt = 0, lastInteract = Date.now(), isIdle = false, lastLobbyPoll = 0;

  function sendPresence(state, useBeacon = false) {
    if (!connId) return;
    const payload = JSON.stringify({ connId, state });
    if (useBeacon && navigator.sendBeacon) {
      try {
        if (navigator.sendBeacon('/api/stream/presence', new Blob([payload], { type: 'application/json' }))) return;
      } catch {}
    }
    if (!loggedIn() && state !== 'offline') return;
    fetch('/api/stream/presence', {
      method: 'POST', credentials: 'same-origin', keepalive: true,
      headers: { 'Content-Type': 'application/json' }, body: payload
    }).catch(() => {});
  }

  function closeStream(sendOffline = false) {
    const prevConn = connId;
    connId = '';
    lastBeatAt = 0;
    if (es) { try { es.close(); } catch {} es = null; }
    if (sendOffline && prevConn) {
      const payload = JSON.stringify({ connId: prevConn, state: 'offline' });
      let sent = false;
      if (navigator.sendBeacon) {
        try { sent = navigator.sendBeacon('/api/stream/presence', new Blob([payload], { type: 'application/json' })); } catch {}
      }
      if (!sent) {
        fetch('/api/stream/presence', {
          method: 'POST', credentials: 'same-origin', keepalive: true,
          headers: { 'Content-Type': 'application/json' }, body: payload
        }).catch(() => {});
      }
    }
  }

  function connect() {
    if (es || Date.now() < nextTry || !loggedIn() || navigator.onLine === false || typeof EventSource === 'undefined') return;
    const vis = document.visibilityState === 'visible' && !isIdle ? '1' : '0';
    es = new EventSource('/api/stream?vis=' + vis);
    es.onopen = () => { lastBeatAt = Date.now(); };
    es.addEventListener('ready', ev => {
      delay = 3000;
      lastBeatAt = Date.now();
      try { connId = JSON.parse(ev.data || '{}').connId || ''; } catch { connId = ''; }
      if (document.visibilityState !== 'visible' || isIdle) sendPresence('hidden');
      refreshSocialViews();
      window.CLINED_CHAT?.refreshDot();
    });
    es.addEventListener('ping', () => { lastBeatAt = Date.now(); });
    es.addEventListener('friend', ev => { lastBeatAt = Date.now(); onFriend(JSON.parse(ev.data || '{}')); });
    es.addEventListener('duel', ev => { lastBeatAt = Date.now(); onDuel(JSON.parse(ev.data || '{}')); });
    es.addEventListener('duel_lobby', () => { lastBeatAt = Date.now(); scheduleLobbyRealtimeSync(); });
    es.addEventListener('status', ev => { lastBeatAt = Date.now(); onStatus(JSON.parse(ev.data || '{}')); });
    es.addEventListener('chat', ev => { lastBeatAt = Date.now(); window.CLINED_CHAT?.onPush(JSON.parse(ev.data || '{}')); });
    es.addEventListener('announcement', ev => { lastBeatAt = Date.now(); window.CLINED_ANNOUNCEMENT?.onPush?.(JSON.parse(ev.data || '{}')); });
    es.addEventListener('diamonds_grant', ev => { lastBeatAt = Date.now(); window.CLINED_CARDS?.onAdminGrant?.(JSON.parse(ev.data || '{}')); });
    es.addEventListener('xp_100k_unlock', ev => { lastBeatAt = Date.now(); window.CLINED_XP_100K?.onUnlock?.(JSON.parse(ev.data || '{}')); });
    es.onerror = () => {
      if (!es || es.readyState === 2) {
        es = null; connId = ''; lastBeatAt = 0;
        nextTry = Date.now() + delay; delay = Math.min(delay * 2, 60000);
      }
    };
  }

  let lobbySyncTimer = null;
  function scheduleLobbyRealtimeSync() {
    clearTimeout(lobbySyncTimer);
    lobbySyncTimer = setTimeout(() => {
      lobbySyncTimer = null;
      if (!loggedIn()) return;
      refreshSocialViews();
    }, 180);
  }

  function refreshSocialViews() {
    lastLobbyPoll = Date.now();
    loadLobby().then(() => {
      if (activeView() === 'socialPage') {
        const typing = document.activeElement?.matches?.(TYPING_SEL);
        if (!typing) renderLobby(false);
      } else if (activeView() === 'hubPage' && S.hubTab === 'teman') {
        renderHub(false);
      }
    }).catch(() => {});
  }

  function onFriend(m) {
    const n = m.from?.name || 'Seseorang';
    if (m.kind === 'request') toast(`👋 ${n} ingin berteman denganmu`);
    if (m.kind === 'accepted') toast(`🎉 ${n} sekarang temanmu`);
    loadLobby().then(() => { if (activeView() === 'socialPage') renderLobby(false); else if (activeView() === 'hubPage') renderHub(false); }).catch(() => {});
  }
  function onStatus(m) {
    const n = m.from?.name || 'Temanmu';
    if (m.kind === 'new') toast(`📣 ${n} membagikan status`);
    if (m.kind === 'reaction') toast(`${m.emoji || '👍'} ${n} bereaksi pada statusmu`);
    if (m.kind === 'comment') toast(`💬 ${n} mengomentari statusmu`);
    if (activeView() === 'hubPage' && S.hubTab === 'status') loadFeed().then(() => { const open = [...S.openC]; Promise.all(open.map(id => api('/api/status/comments?id=' + encodeURIComponent(id)).then(d => { S.comments[id] = d.comments || []; }).catch(() => {}))).then(() => renderHub(false)); });
  }
  function reconnectStream() {
    closeStream(false);
    nextTry = 0; delay = 3000;
    connect();
  }
  function onDuel(m) {
    const n = m.from?.name || 'Pemain';
    const here = S.D && S.D.id === m.id && activeView() === 'duelPage';
    const isMyRoom = S.mine.some(x => x.id === m.id) || (S.D && S.D.id === m.id && !S.D.isSpectator);
    if (m.kind === 'emote') {
      const emoji = m.emote?.emoji || m.emoji;
      const text = m.emote?.text || m.text;
      if (here && emoji) {
        if (S.D?.isMultiplayer || S.D?.isSpectator) {
          S.oppFlash = { text: `${emoji} ${n}: ${text || ''}`, ok: true, until: Date.now() + 3400 };
          renderDuel();
        } else {
          showEmoteBubble('opp', emoji, text || '');
        }
      }
      return;
    }
    if (m.kind === 'progress' && here) {
      S.oppFlash = {
        text: m.forfeited
          ? `🏳️ ${n} keluar dari race.`
          : m.ok
            ? `⚡ ${n} menjawab BENAR soal #${(m.idx ?? 0) + 1}!`
            : `💥 ${n} salah di soal #${(m.idx ?? 0) + 1}!`,
        ok: !!m.ok && !m.forfeited,
        until: Date.now() + 3400
      };
    }
    if (m.kind === 'invite') toast(`⚔️ ${n} menantangmu duel!`);
    else if (m.kind === 'roster') {
      if (here && m.from?.name && m.playerCount) toast(`👥 ${n} di room (${m.playerCount}/${m.maxPlayers || 2} pemain)`);
    }
    else if ((m.kind === 'joined' || m.kind === 'started') && !here && isMyRoom) {
      toast(m.kind === 'started' ? `🚀 ${n} memulai race multiplayer!` : `⚔️ ${n} bergabung ke duelmu! Bersiap bertarung!`);
      showDuelMatchedModal(m);
    }
    else if (m.kind === 'declined') toast(`${n} menolak tantanganmu`);
    else if (m.kind === 'cancelled' && !here) {
      S.mine = S.mine.filter(x => x.id !== m.id);
      if (S.D?.id === m.id) S.D = null;
      syncWaitingFloat();
    }
    else if (m.kind === 'finished' && !here && isMyRoom) toast('🏁 Pertarungan selesai, lihat hasil di menu Duel');
    if (here) refreshDuel();
    loadLobby().then(() => {
      if (activeView() === 'socialPage' && !document.activeElement?.matches?.(TYPING_SEL)) renderLobby(false);
    }).catch(() => {});
  }

  function boot() { ensureShell(); connect(); }
  setInterval(() => {
    ensureShell();
    if (!loggedIn()) {
      if (es) closeStream(true);
      syncWaitingFloat();
      return;
    }
    const now = Date.now();
    if (es && es.readyState === 1 && lastBeatAt && (now - lastBeatAt) > HEARTBEAT_STALE_MS) {
      reconnectStream();
      return;
    }
    if (document.visibilityState === 'visible' && !isIdle && (now - lastInteract) >= IDLE_MS) {
      isIdle = true;
      sendPresence('hidden');
    }
    connect();
    if (activeView() === 'duelPage' && S.D && S.D.status !== 'finished' && (!es || es.readyState !== 1)) {
      refreshDuel();
    }
    if (document.visibilityState === 'visible' && (now - lastLobbyPoll) >= LOBBY_POLL_MS) {
      const v = activeView();
      const typing = document.activeElement?.matches?.(TYPING_SEL);
      if (!typing && (v === 'socialPage' || (v === 'hubPage' && S.hubTab === 'teman'))) {
        refreshSocialViews();
      }
    }
  }, 4000);

  const markActive = () => {
    if (document.visibilityState !== 'visible') return;
    const now = Date.now();
    const wasIdle = isIdle;
    lastInteract = now;
    if (wasIdle) {
      isIdle = false;
      if (!es || es.readyState !== 1 || (lastBeatAt && (now - lastBeatAt) > HEARTBEAT_STALE_MS)) reconnectStream();
      else sendPresence('visible');
    }
  };
  ['pointerdown', 'keydown', 'touchstart', 'scroll'].forEach(ev =>
    window.addEventListener(ev, markActive, { passive: true, capture: true })
  );
  window.addEventListener('clined:view-change', () => { syncWaitingFloat(); });
  window.addEventListener('clined:auth-ready', () => { lastInteract = Date.now(); isIdle = false; reconnectStream(); });
  window.addEventListener('clined:auth-logout', () => { S.mine = []; S.D = null; syncWaitingFloat(); $('duelMatchedLayer')?.remove(); closeStream(true); });
  window.addEventListener('offline', () => { closeStream(false); });
  window.addEventListener('online', () => { lastInteract = Date.now(); isIdle = false; reconnectStream(); if (activeView() === 'duelPage' && S.D) refreshDuel(); });
  window.addEventListener('pagehide', () => { closeStream(true); });
  window.addEventListener('beforeunload', () => { closeStream(true); });
  window.addEventListener('pageshow', e => {
    if (!loggedIn()) return;
    lastInteract = Date.now(); isIdle = false;
    if (e.persisted || !es || es.readyState !== 1 || (lastBeatAt && (Date.now() - lastBeatAt) > HEARTBEAT_STALE_MS)) reconnectStream();
    else sendPresence('visible');
  });
  document.addEventListener('visibilitychange', () => {
    if (!loggedIn()) { if (es) closeStream(true); return; }
    if (document.visibilityState === 'visible') {
      lastInteract = Date.now(); isIdle = false;
      if (!es || es.readyState !== 1 || (lastBeatAt && (Date.now() - lastBeatAt) > HEARTBEAT_STALE_MS)) reconnectStream();
      else sendPresence('visible');
      if (activeView() === 'duelPage' && S.D && S.D.status !== 'finished') refreshDuel();
      if (activeView() === 'socialPage' || (activeView() === 'hubPage' && S.hubTab === 'teman')) refreshSocialViews();
    } else {
      sendPresence('hidden', true);
    }
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.CLINED_SOCIAL = { gladiatorRowsHTML: list => (list || []).map(p => {
      const medal = p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : p.rank === 3 ? '🥉' : `#${p.rank}`;
      const pTier = getRank(p.tier || { rp: p.rp || 0 });
      const pCard = p.me ? (getMyShowcaseCard() || p.card) : p.card;
      const bg = p.bannerUrl ? `<span class="chat-row-bg" style="background-image:url('${esc(p.bannerUrl)}')" aria-hidden="true"></span>` : '';
      const nc = p.nameColor ? ` data-name-color="${esc(p.nameColor)}"` : '';
      const xpBadge = p.xp100k ? ' <em class="chat-badge b-xp100k compact" title="Pencapaian 100.000 All-Time XP">⚜️ 100K Legend</em>' : '';
      return `<div class="duel-lb-row${p.me ? ' me' : ''}${p.bannerUrl ? ' has-banner' : ''}">${bg}<span class="duel-lb-rank ${p.rank <= 3 ? `top-${p.rank}` : ''}">${medal}</span>${avatar(p)}<div class="duel-lb-main"><div class="duel-lb-top"><b class="duel-lb-name"${nc}>${esc(p.name)} ${xpBadge}${p.me ? '<em class="soc-tag me">Kamu</em>' : ''}</b><span class="duel-lb-wins">🏆 ${p.wins} Menang</span></div><div class="duel-lb-bottom">${rankPill(pTier, true)}${cardPill(pCard)}<small class="duel-lb-meta">${p.winRate}% WR • ${p.total} laga</small></div></div></div>`;
    }).join(''), isStreamOnline: () => !!es && es.readyState === 1 && navigator.onLine !== false && !isIdle && (!lastBeatAt || (Date.now() - lastBeatAt) <= HEARTBEAT_STALE_MS), openChat: () => openHub('chat'), openStatus: () => openHub('status'), open: openLobby, refresh: () => renderLobby(true) };
})();
