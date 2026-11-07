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
    tab: 'status', hubTab: 'status', openC: new Set(), comments: {}, feed: null, F: null,
    mine: [], invites: [], openRooms: [], myStats: null, h2h: {}, leaderboard: [],
    banks: [], bank: '', count: 10, sec: 30, mode: 'classic', wager: 0, isPublic: true,
    D: null, fb: null, busy: false, tick: null, skew: 0, sentFor: -1,
    emotes: {}, oppFlash: null
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
    ['shock', '😱', 'Soal sulit!'],
    ['bolt', '⚡', 'Kejar kalau bisa!'],
    ['brain', '🧠', 'Hafal nih!'],
    ['skull', '💀', 'Awas nyawa!'],
    ['pray', '🙏', 'GGWP!']
  ];
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
      if (saved.bank) S.bank = saved.bank;
      if ([5, 10, 15].includes(Number(saved.count))) S.count = Number(saved.count);
      if ([0, 15, 30, 45, 60].includes(Number(saved.sec))) S.sec = Number(saved.sec);
      if (['classic', 'sudden_death'].includes(saved.mode)) S.mode = saved.mode;
      if ([0, 20, 50].includes(Number(saved.wager))) S.wager = Number(saved.wager);
      if (typeof saved.isPublic === 'boolean') S.isPublic = saved.isPublic;
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
    if (!D || D.status !== 'finished' || !D.result) return null;
    const R = D.result, win = R.winnerId === D.me.id, draw = !R.winnerId;
    const wager = Number(D.wager) || 0;
    const mode = D.mode || 'classic';
    const xpGain = win ? (30 + wager) : draw ? 10 : 0;
    const diaGain = win ? (1 + (wager >= 50 ? 2 : wager >= 20 ? 1 : 0) + (mode === 'sudden_death' ? 1 : 0)) : 0;
    try {
      const claims = JSON.parse(localStorage.getItem(CLAIM_KEY) || '{}') || {};
      if (!claims[D.id]) {
        claims[D.id] = { at: Date.now(), xpGain, diaGain, win, draw };
        localStorage.setItem(CLAIM_KEY, JSON.stringify(claims));
        if (diaGain > 0) addDiamonds(diaGain);
        if (xpGain > 0 && typeof window.addXP === 'function') {
          try {
            window.addXP(xpGain, win ? `Menang Duel Klinik (+${xpGain} EXP)` : `Seri Duel Klinik (+${xpGain} EXP)`, {
              kind: 'materi',
              ref: `duel-local:${D.id}`.slice(0, 80),
              silent: false
            });
          } catch {}
        }
      }
    } catch {}
    return { xpGain, diaGain, wager };
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
    S.myStats = a.myStats || { wins: 0, losses: 0, draws: 0, total: 0, rp: 0, winRate: 0, streak: 0, bestStreak: 0, title: { icon: '🗡️', name: 'Petarung Baru' }, rank: rankFromRp(0) };
    S.h2h = a.h2h || {};
    S.leaderboard = a.leaderboard || [];
    dot();
  }
  async function loadBanks() {
    if (S.banks.length) return;
    try { const d = await api('/api/banks'); S.banks = (d.banks || []).filter(b => Number(b.count) >= 5).sort((a, b) => String(a.name).localeCompare(String(b.name), 'id')); } catch {}
    if (!S.banks.some(b => b.id === S.bank)) S.bank = S.banks[0]?.id || '';
  }
  const savePref = () => { try { localStorage.setItem(PREF, JSON.stringify({ bank: S.bank, count: S.count, sec: S.sec, mode: S.mode, wager: S.wager, isPublic: S.isPublic })); } catch {} };

  /* ───────── LOBI & ARENA VISUAL ───────── */
  const initials = n => esc(String(n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase());
  const avatar = (p, cls = '') => `<span class="soc-av ${cls}${p?.online ? ' on' : ''}" aria-hidden="true">${initials(p?.name)}</span>`;
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
    const bankOpts = S.banks.map(b => `<option value="${esc(b.id)}"${b.id === S.bank ? ' selected' : ''}>${esc(b.name)} (${b.count} soal)</option>`).join('');
    const curBankName = S.banks.find(b => b.id === S.bank)?.name || 'Bank Soal Pilihan';

    // 1. Arena Hero Banner + Rank Tier Emblem + RP Progress + Career Stats + Quick Match CTA
    const heroHTML = `
    <div class="card duel-hero">
      <div class="duel-hero-glow" aria-hidden="true"></div>
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
      <div class="duel-quick-wrap">
        <button type="button" class="duel-quick-btn" data-soc-quick>
          <span class="duel-quick-ico">⚡</span>
          <span class="duel-quick-txt">
            <b>Cari Lawan Cepat (Ranked Match)</b>
            <small>${esc(curBankName)} • ${S.count} soal • ${S.mode === 'sudden_death' ? '💀 Sudden Death' : '🏆 Klasik'}${S.wager ? ` • 💰 ${S.wager} EXP` : ''}</small>
          </span>
          <span class="duel-quick-go">GAS ›</span>
        </button>
      </div>
    </div>`;

    // 2. Active duels & incoming friend invites
    const mine = S.mine.map(d => {
      const opp = d.opponent, title = d.status === 'waiting' ? `Ruang ${esc(d.code)}` : `vs ${esc(opp?.name || 'Lawan')}`;
      return `<button type="button" class="soc-live" data-soc-open="${esc(d.id)}">
        <span class="soc-live-ico">${d.status === 'waiting' ? '⏳' : '🔥'}</span>
        <span class="soc-who">
          <b>${title}</b>
          <small>${d.status === 'waiting' ? 'Menunggu penantang masuk…' : `Berlangsung • ${d.me.answered}/${d.total} soal`} • ${d.mode === 'sudden_death' ? '💀 3❤️' : '🏆 Klasik'}</small>
        </span>
        <span class="soc-go">Masuk ›</span>
      </button>`;
    }).join('');

    const inv = S.invites.map(i => `<div class="soc-invite">
      <div class="soc-who">
        <b>⚔️ ${esc(i.from?.name || 'Teman')} menantangmu!</b>
        <small>${esc(i.bank.name)} • ${i.total} soal</small>
        <div class="duel-tags-row">${modePill(i.mode)}${wagerPill(i.wager)}</div>
      </div>
      <div class="soc-btns">
        <button type="button" class="primary" data-soc-accept="${esc(i.code)}">⚡ Terima</button>
        <button type="button" class="secondary" data-soc-decline="${esc(i.id)}" aria-label="Tolak">✕</button>
      </div>
    </div>`).join('');

    // 3. Open Arena Rooms (Poin 1: Lobi Tantangan Terbuka)
    const openRows = (S.openRooms || []).map(r => {
      const host = r.host || r.from || {};
      return `<div class="duel-open-room">
        <div class="duel-open-top">
          ${avatar(host)}
          <div class="soc-who">
            <b>${esc(host.name || 'Petarung')} <small class="duel-open-user">@${esc(host.username || '')}</small></b>
            <small>📚 ${esc(r.bank?.name || 'Bank Soal')} • ${r.total} soal • ${r.perQ ? `${r.perQ / 1000}d/soal` : '∞'}</small>
          </div>
          <button type="button" class="primary duel-join-now" data-soc-accept="${esc(r.code)}">⚡ Lawan!</button>
        </div>
        <div class="duel-tags-row">${rankPill(host.rank, false)}${modePill(r.mode)}${wagerPill(r.wager)}${h2hBadge(host.id)}</div>
      </div>`;
    }).join('');

    const openArenaHTML = `
    <div class="card soc-card duel-arena-card">
      <div class="soc-title between">
        <div class="duel-title-left"><span>🌐</span><div><h3>Tantangan Terbuka</h3><small class="soc-hint">Masuk langsung 1-klik tanpa ketik kode</small></div></div>
        <button type="button" class="secondary duel-mini-btn" data-soc-refresh-lobby aria-label="Segarkan lobi">🔄 Segarkan</button>
      </div>
      ${openRows ? `<div class="duel-open-list">${openRows}</div>` : `<div class="duel-open-empty">
        <span>🏟️</span>
        <div><b>Belum ada ruang terbuka yang menunggu lawan</b><small>Klik <b>⚡ Cari Lawan Cepat</b> di atas atau buat ruang publik agar teman/mahasiswa lain yang online bisa langsung melawanmu!</small></div>
      </div>`}
    </div>`;

    // 4. Custom Duel Setup (with Mode, Wager, Visibility)
    const setupHTML = `
    <div class="card soc-card soc-setup">
      <div class="soc-title"><span>⚙️</span><div><h3>Atur Arena Duel</h3><small class="soc-hint">Pilih bank soal, mode permainan, dan taruhan EXP</small></div></div>
      <label class="duel-field-label" for="socBank">📚 Bank Soal Ujian</label>
      <select id="socBank" data-soc-bank aria-label="Bank soal">${bankOpts || '<option value="">Memuat…</option>'}</select>

      <div class="duel-field-label">🎮 Mode Pertarungan</div>
      <div class="duel-mode-grid" role="radiogroup" aria-label="Mode duel">
        ${MODES.map(([k, ico, name, desc]) => `
          <button type="button" role="radio" aria-checked="${S.mode === k}" class="duel-mode-card ${k}${S.mode === k ? ' on' : ''}" data-soc-mode="${k}">
            <div class="duel-mode-head"><span class="duel-mode-ico">${ico}</span><b>${name}</b></div>
            <small>${desc}</small>
          </button>
        `).join('')}
      </div>

      <div class="soc-opt-row"><span class="soc-lab">Jumlah<small>Soal duel</small></span><div class="soc-seg n3" role="radiogroup" aria-label="Jumlah soal">${[5, 10, 15].map(n => `<button type="button" role="radio" aria-checked="${S.count === n}" class="${S.count === n ? 'on' : ''}" data-soc-count="${n}">${n} Soal</button>`).join('')}</div></div>
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

      <div class="soc-opt-row">
        <span class="soc-lab">Visibilitas<small>Ruang duel</small></span>
        <div class="soc-seg n2" role="radiogroup" aria-label="Visibilitas ruang">
          <button type="button" role="radio" aria-checked="${S.isPublic}" class="${S.isPublic ? 'on' : ''}" data-soc-vis="1">🌐 Publik (Lobi)</button>
          <button type="button" role="radio" aria-checked="${!S.isPublic}" class="${!S.isPublic ? 'on' : ''}" data-soc-vis="0">🔒 Privat (Kode)</button>
        </div>
      </div>

      <button type="button" class="primary soc-big duel-create-btn" data-soc-create>🔑 Buat Ruang Duel (${S.isPublic ? 'Publik' : 'Privat'})</button>
      <div class="soc-join">
        <input id="socCode" data-soc-code type="text" inputmode="text" autocapitalize="characters" autocomplete="off" maxlength="6" placeholder="KODE 6 DIGIT" aria-label="Kode duel">
        <button type="button" class="secondary" data-soc-join>Gabung Kode</button>
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
    const quickHTML = `<div class="card soc-card"><div class="soc-title"><span>👥</span><div><h3>Tantang Teman &amp; Rekor H2H</h3><small class="soc-hint">Lihat rekor pertemuan Head-to-Head dengan temanmu</small></div></div><div class="soc-sec">${quick}</div><button type="button" class="secondary soc-big" data-soc-hub="teman">Kelola Teman di Sosial ›</button></div>`;

    // 6. Papan Peringkat Ranked Gladiator Duel (Poin 9 + Sistem Rank RP)
    const lbRows = (S.leaderboard || []).map(p => {
      const medal = p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : p.rank === 3 ? '🥉' : `#${p.rank}`;
      const pTier = getRank(p.tier || { rp: p.rp || 0 });
      return `<div class="duel-lb-row${p.me ? ' me' : ''}">
        <span class="duel-lb-rank ${p.rank <= 3 ? `top-${p.rank}` : ''}">${medal}</span>
        ${avatar(p)}
        <div class="duel-lb-main">
          <div class="duel-lb-top">
            <b class="duel-lb-name">${esc(p.name)} ${p.me ? '<em class="soc-tag me">Kamu</em>' : ''}</b>
            <span class="duel-lb-wins">🏆 ${p.wins} Menang</span>
          </div>
          <div class="duel-lb-bottom">
            ${rankPill(pTier, true)}
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

    const duelAll = `${heroHTML}${inv}${mine ? `<div class="soc-lives">${mine}</div>` : ''}${openArenaHTML}${setupHTML}${quickHTML}${lbHTML}`;
    return { duel: duelAll, friends: friendsHTML0 };
  }

  const timeAgo = t => { const m = Math.floor((Date.now() - t) / 60000); return m < 1 ? 'baru saja' : m < 60 ? `${m} mnt lalu` : m < 1440 ? `${Math.floor(m / 60)} jam lalu` : `${Math.floor(m / 1440)} hari lalu`; };
  function commentsHTML(id) {
    const list = S.comments[id];
    const rows = list == null ? '<p class="soc-empty">Memuat komentar…</p>' : (list.length ? list.map(c => `<div class="soc-cmt${c.own ? ' own' : ''}">${avatar({ name: c.name })}<div class="soc-cmt-body"><div class="soc-cmt-head"><b>${c.own ? 'Kamu' : esc(c.name)}</b><small>${timeAgo(c.createdAt)}</small>${c.canDelete ? `<button type="button" class="soc-cdel" data-soc-cdel="${esc(c.id)}" data-post="${esc(id)}" aria-label="Hapus komentar">✕</button>` : ''}</div><p>${esc(c.message)}</p></div></div>`).join('') : '<p class="soc-empty">Belum ada komentar. Jadi yang pertama!</p>');
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
      return `<article class="soc-post${p.own ? ' own' : ''}"><div class="soc-post-head"><span class="soc-avwrap">${avatar({ name: p.name })}<span class="soc-mood" title="${esc(m[2])}">${m[1]}</span></span><div class="soc-who"><b>${esc(p.name)}</b><small>@${esc(p.username || '')} · ${timeAgo(p.createdAt)}</small></div>${tag}</div>
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
    const pct = D.total ? Math.round((R.me.score / D.total) * 100) : null;
    const modeTag = D.mode === 'sudden_death' ? 'Mode Sudden Death 💀' : 'Mode Klasik 🏆';
    const msg = draw
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
    if (reload) { if (!S.F) body.innerHTML = '<p class="soc-empty">Memuat Arena Duel…</p>'; try { await Promise.all([loadLobby(), loadBanks()]); } catch (e) { body.innerHTML = `<p class="soc-empty">${esc(e.message)}</p>`; return; } }
    const keep = { code: $('socCode')?.value };
    body.innerHTML = lobbyHTML().duel;
    if (keep.code && $('socCode')) $('socCode').value = keep.code;
  }
  const hubTabs = () => { const tab = (k, label, extra = '') => `<button type="button" role="tab" aria-selected="${S.hubTab === k}" class="${S.hubTab === k ? 'on' : ''}" data-soc-tab="${k}">${label}${extra}</button>`;
    return `<div class="soc-tabs three" role="tablist">${tab('status', '📣 Status')}${tab('chat', '💬 Chat', `<i class="soc-dot inline" data-chat-dot ${window.CLINED_CHAT?.unread ? '' : 'hidden'}>${window.CLINED_CHAT?.unread > 9 ? '9+' : window.CLINED_CHAT?.unread || 0}</i>`)}${tab('teman', '👥 Teman', S.F?.incoming?.length ? ` <i class="soc-dot inline">${S.F.incoming.length}</i>` : '')}</div>`; };
  async function renderHub(reload = true) {
    ensureShell();
    const body = $('hubBody'); if (!body) return;
    if (reload) {
      if (!S.F || (S.hubTab === 'status' && S.feed == null)) body.innerHTML = '<p class="soc-empty">Memuat…</p>';
      try { await Promise.all([loadLobby(), S.hubTab === 'status' ? loadFeed() : Promise.resolve()]); } catch (e) { body.innerHTML = `<p class="soc-empty">${esc(e.message)}</p>`; return; }
    }
    if (S.hubTab === 'chat') {
      if (!reload && $('chatHost')) return;
      body.innerHTML = hubTabs() + '<div id="chatHost"></div>';
      window.CLINED_CHAT?.mount($('chatHost')); return;
    }
    window.CLINED_CHAT?.stop?.();
    const keep = { user: $('socUser')?.value };
    body.innerHTML = hubTabs() + (S.hubTab === 'status' ? statusHTML() : lobbyHTML().friends);
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
    if (!D.perQ) return;
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
      finished: '⏰ Waktu habis, diselesaikan lebih unggul.'
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

  function duelHTML() {
    const D = S.D; if (!D) return '<p class="soc-empty">Duel tidak ditemukan.</p>';
    const opp = D.opponent, oppName = esc(opp?.name || D.invited?.name || 'Lawan');
    const isSD = D.mode === 'sudden_death';
    const myRk = getRank(D.me?.rank || S.myStats?.rank || { rp: S.myStats?.rp || 0 });
    const oppRk = opp ? getRank(opp.rank || { rp: 0 }) : null;

    if (D.status === 'cancelled') {
      return `<div class="card soc-card soc-center"><div class="soc-emoji">🚫</div><h3>Duel dibatalkan</h3><button type="button" class="primary soc-big" data-soc-lobby>Kembali ke Arena</button></div>`;
    }
    if (D.status === 'waiting') {
      if (!D.isHost) {
        return `<div class="card soc-card soc-center duel-wait-card">
          <div class="soc-vs-av">${avatar(opp || {})}<b class="duel-vs-glow">VS</b>${avatar(D.me)}</div>
          <h3>⚔️ ${oppName} menantangmu!</h3>
          <p>${esc(D.bank.name)} • ${D.total} soal • ${secText(D.perQ)}</p>
          <div class="duel-tags-row center">${oppRk ? rankPill(oppRk) : ''}${modePill(D.mode)}${wagerPill(D.wager)}${h2hBadge(opp?.id)}</div>
          <button type="button" class="primary soc-big" data-soc-accept="${esc(D.code)}">⚔️ Terima Tantangan</button>
          <button type="button" class="secondary soc-big" data-soc-decline="${esc(D.id)}">Tolak</button>
        </div>`;
      }
      return `<div class="card soc-card soc-center duel-wait-card">
        <div class="soc-emoji soc-pulse">⏳</div>
        <h3>${D.invited ? `Menunggu ${oppName}…` : (D.isPublic ? '🌐 Menunggu Penantang di Lobi Publik…' : '🔒 Menunggu Lawan via Kode…')}</h3>
        <p>${esc(D.bank.name)} • ${D.total} soal • ${secText(D.perQ)}</p>
        <div class="duel-tags-row center">${rankPill(myRk)}${modePill(D.mode)}${wagerPill(D.wager)}</div>
        <div class="soc-code" aria-label="Kode duel">${esc(D.code)}</div>
        <div class="soc-btns2"><button type="button" class="secondary" data-soc-copy="${esc(D.code)}">📋 Salin Kode</button><button type="button" class="primary" data-soc-share="${esc(D.code)}">📤 Bagikan</button></div>
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

      const bar = (name, s, me, fObj, rkObj) => `<div class="soc-score${me ? ' me' : ''}">
        <small>${esc(name)}</small>
        ${rkObj ? `<div class="duel-score-rank">${rankPill(rkObj, false)}</div>` : ''}
        <b>${s.score}<em>/${D.total}</em></b>
        <span>⏱ ${s.done ? fmtMs(s.timeMs) : 'belum selesai'}</span>
        <div class="duel-res-sub">
          ${isSD ? renderHearts(fObj?.hearts ?? 3, D.maxHearts || 3) : ''}
          ${(fObj?.maxStreak || 0) >= 2 ? `<span class="duel-streak-pill">🔥 Max Streak ${fObj.maxStreak}x</span>` : ''}
        </div>
      </div>`;
      const review = R.review.map(q => `<details class="soc-rev"><summary><span class="soc-rn ${q.myChoice === q.correctIdx ? 'ok' : 'bad'}">${q.i + 1}</span>${esc(q.soal.slice(0, 90))}${q.soal.length > 90 ? '…' : ''}</summary>
        <ul>${q.opsi.map((o, i) => `<li class="${i === q.correctIdx ? 'ok' : ''}">${L5[i]}. ${esc(o)} ${i === q.correctIdx ? '✓' : ''}${i === q.myChoice ? ' <em>kamu</em>' : ''}${i === q.oppChoice ? ' <em class="opp">lawan</em>' : ''}</li>`).join('')}</ul>${q.myChoice === -1 ? '<p class="soc-pemb">⏰ Kamu tidak menjawab tepat waktu.</p>' : ''}${q.pembahasan ? `<p class="soc-pemb">${esc(q.pembahasan)}</p>` : ''}</details>`).join('');

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

      const rewardBanner = (win || draw) && rw ? `
        <div class="duel-reward-banner ${win ? 'win' : 'draw'}">
          <div class="duel-reward-title">${win ? '🎁 HADIAH KEMENANGAN ARENA' : '🤝 BONUS PARTISIPASI DUEL'}</div>
          <div class="duel-reward-pills">
            ${rw.xpGain ? `<span class="duel-rw-pill xp">⚡ +${rw.xpGain} EXP</span>` : ''}
            ${rw.diaGain ? `<span class="duel-rw-pill dia">💎 +${rw.diaGain} Diamond</span>` : ''}
            ${win && rw.wager ? `<span class="duel-rw-pill wager">💰 Menang Taruhan ${rw.wager} EXP</span>` : ''}
          </div>
        </div>` : '';

      return `<div class="card soc-card soc-center soc-result ${draw ? 'draw' : win ? 'win' : 'lose'}">
        <div class="soc-emoji">${draw ? '🤝' : R.reason === 'knockout' && win ? '💀🏆' : win ? '🏆' : '💪'}</div>
        <div class="duel-tags-row center">${modePill(D.mode)}${wagerPill(D.wager)}${h2hBadge(opp?.id)}</div>
        <h3>${draw ? 'Pertarungan Seri!' : win ? 'Kamu Menang!' : `${oppName} Menang`}</h3>
        <p>${reasonText(R.reason, win, draw)}</p>
        ${rankResultCard}
        ${rewardBanner}
        <div class="soc-scores">${bar('Kamu', R.me, true, D.me, newRk)}${bar(opp?.name || 'Lawan', R.opponent, false, opp, oppRk)}</div>
        <button type="button" class="duel-share-win-btn" data-soc-share-duel>📣 Pamerkan Hasil Duel ke Status</button>
        <div class="soc-btns2"><button type="button" class="secondary" data-soc-lobby>Ke Lobi Arena</button><button type="button" class="primary" data-soc-rematch>⚔️ Tanding Ulang</button></div>
      </div>
      <div class="card soc-card"><h4>📝 Pembahasan &amp; Perbandingan Jawaban</h4>${review}</div>`;
    }

    // ───────── DUEL AKTIF (ARENA TOP BAR + TUG OF WAR + EMOTE) ─────────
    const pct = n => Math.round((n / D.total) * 100), mineN = D.myAnswers.length;
    const myLiveScore = D.me.liveScore ?? D.me.score ?? 0;
    const oppLiveScore = opp?.liveScore ?? 0;
    const lead = myLiveScore - oppLiveScore;
    const tugPct = Math.max(12, Math.min(88, 50 + lead * Math.round(36 / Math.max(3, D.total / 2))));
    const flash = S.oppFlash && Date.now() < S.oppFlash.until ? S.oppFlash : null;

    const board = `
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
        <div class="duel-tags-row center">${modePill(D.mode)}${wagerPill(D.wager)}${h2hBadge(opp?.id)}</div>
        <p>Siapkan dirimu! Pertarungan dimulai dalam…</p>
        <div class="soc-count" id="duelGo">${Math.max(1, Math.ceil((D.startedAt - nowS()) / 1000))}</div>
        <p class="soc-hint">${esc(D.bank.name)} • ${D.total} soal • ${secText(D.perQ)}</p>
      </div>` + emoteBarHTML();
    }

    const fbIdx = S.fb != null && S.fb === mineN - 1 ? S.fb : null, qi = fbIdx != null ? fbIdx : mineN;
    let main;
    if (qi >= D.total) {
      main = `<div class="card soc-card soc-center"><div class="soc-emoji soc-pulse">⏳</div><h3>Menunggu ${oppName} menyelesaikan soal…</h3><p>Skormu: ✅ ${D.me.score}/${D.total}. Kirim stiker di bawah sambil menunggu lawan!</p></div>`;
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
    return board + emoteBarHTML() + main + `<button type="button" class="secondary soc-big soc-danger" data-soc-leave>🏳️ Menyerah dari Duel</button>`;
  }

  function renderDuel() {
    ensureShell();
    const b = $('duelBody'); if (!b) return;
    const D = S.D;
    $('duelTitle').textContent = D?.status === 'finished' ? '🏁 Hasil Arena Duel' : (D?.mode === 'sudden_death' ? '💀 Duel Sudden Death' : '⚔️ Arena Duel');
    b.innerHTML = duelHTML();
    if (D?.status === 'active') startTick(); else stopTick();
  }
  async function openDuel(id) {
    S.fb = null; window.show('duelPage');
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
    if (!S.bank) return toast('Pilih bank soal dulu.', true);
    const d = await api('/api/duels', {
      method: 'POST',
      body: {
        bankId: S.bank,
        count: S.count,
        seconds: S.sec,
        mode: S.mode,
        wager: S.wager,
        isPublic: friendId ? false : S.isPublic,
        ...(friendId ? { friendId } : {})
      }
    });
    syncD(d.duel); S.fb = null; S.sentFor = -1; window.show('duelPage'); renderDuel();
    if (friendId) toast('Tantangan terkirim ⚔️');
  }
  async function quickMatch() {
    if (!S.bank && S.banks.length) S.bank = S.banks[0].id;
    if (!S.bank) return toast('Pilih bank soal dulu.', true);
    const d = await api('/api/duels/quick', {
      method: 'POST',
      body: { bankId: S.bank, count: S.count, seconds: S.sec, mode: S.mode, wager: S.wager }
    });
    syncD(d.duel); S.fb = null; S.sentFor = -1; window.show('duelPage'); renderDuel();
    toast(d.matched ? '⚡ Lawan ditemukan! Bersiap bertarung!' : '🌐 Ruang publik dibuat! Menunggu lawan masuk…');
  }
  async function joinByCode(code) {
    const d = await api('/api/duels/join', { method: 'POST', body: { code } });
    syncD(d.duel); S.fb = null; S.sentFor = -1; window.show('duelPage'); renderDuel();
  }
  async function answer(choice) {
    const D = S.D; if (!D || D.status !== 'active') return;
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
    try { await api(`/api/duels/${encodeURIComponent(D.id)}/emote`, { method: 'POST', body: { emote: key } }); } catch {}
  }

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
    if ('socTab' in ds) { S.hubTab = ds.socTab; if (S.hubTab === 'status') S.feed = null; return renderHub(); }
    if ('socHub' in ds) return openHub(ds.socHub);
    if ('socRefreshLobby' in ds) return guard(() => renderLobby(true));
    if ('socQuick' in ds) return guard(() => quickMatch());
    if ('socMode' in ds) { S.mode = ds.socMode; savePref(); return renderLobby(false); }
    if ('socWager' in ds) { S.wager = Number(ds.socWager); savePref(); return renderLobby(false); }
    if ('socVis' in ds) { S.isPublic = ds.socVis === '1'; savePref(); return renderLobby(false); }
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
      const text = `Ayo duel soal di Arena CLINED! Masukkan kode ${ds.socShare} di menu Duel.`;
      if (navigator.share) return navigator.share({ text }).catch(() => {});
      try { navigator.clipboard.writeText(text); toast('Ajakan disalin 📋'); } catch {} return;
    }
    if ('socLeave' in ds) return guard(async () => {
      const D = S.D, act = D?.status === 'active';
      if (act && !(await clinedConfirm({ title: 'Menyerah dari duel?', lines: ['Kamu dianggap **kalah** dan lawan langsung menang.'], ok: 'Menyerah', cancel: 'Lanjut main', tone: 'danger' }))) return;
      await api(`/api/duels/${encodeURIComponent(D.id)}/leave`, { method: 'POST', body: {} });
      S.D = null; stopTick(); openLobby();
    });
    if ('socRematch' in ds) return guard(async () => {
      const D = S.D, opp = D?.opponent;
      S.bank = D.bank.id; S.count = D.total; S.sec = (D.perQ || 0) / 1000;
      if (D.mode) S.mode = D.mode;
      if (D.wager != null) S.wager = D.wager;
      const friend = opp && S.F?.friends?.some(f => f.id === opp.id);
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
  document.addEventListener('change', e => { if (e.target.matches('[data-soc-bank]')) { S.bank = e.target.value; savePref(); renderLobby(false); } });
  document.addEventListener('input', e => { if (e.target.matches('[data-soc-code]')) e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    if (e.target.matches?.('[data-soc-user]')) $('hubBody')?.querySelector('[data-soc-add]')?.click();
    if (e.target.matches?.('[data-soc-cinput]')) e.target.closest('.soc-cform')?.querySelector('[data-soc-csend]')?.click();
    if (e.target.matches?.('[data-soc-code]')) $('socialBody')?.querySelector('[data-soc-join]')?.click();
  });

  /* ───────── realtime ───────── */
  let es = null, nextTry = 0, delay = 3000;
  function connect() {
    if (es || Date.now() < nextTry || !loggedIn() || typeof EventSource === 'undefined') return;
    es = new EventSource('/api/stream');
    es.addEventListener('ready', () => { delay = 3000; loadLobby().catch(() => {}); window.CLINED_CHAT?.refreshDot(); });
    es.addEventListener('friend', ev => onFriend(JSON.parse(ev.data || '{}')));
    es.addEventListener('duel', ev => onDuel(JSON.parse(ev.data || '{}')));
    es.addEventListener('status', ev => onStatus(JSON.parse(ev.data || '{}')));
    es.addEventListener('chat', ev => window.CLINED_CHAT?.onPush(JSON.parse(ev.data || '{}')));
    es.onerror = () => { if (es.readyState === 2) { es = null; nextTry = Date.now() + delay; delay = Math.min(delay * 2, 60000); } };
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
  function onDuel(m) {
    const n = m.from?.name || 'Lawan';
    const here = S.D && S.D.id === m.id && activeView() === 'duelPage';
    if (m.kind === 'emote') {
      if (here && m.emote) showEmoteBubble('opp', m.emote.emoji, m.emote.text);
      return;
    }
    if (m.kind === 'progress' && here) {
      S.oppFlash = {
        text: m.ok ? `⚡ ${n} menjawab BENAR soal #${(m.idx ?? 0) + 1}!` : `💥 ${n} salah di soal #${(m.idx ?? 0) + 1}!`,
        ok: !!m.ok,
        until: Date.now() + 3400
      };
    }
    if (m.kind === 'invite') toast(`⚔️ ${n} menantangmu duel!`);
    else if (m.kind === 'joined' && !here) toast(`⚔️ ${n} bergabung ke duelmu!`);
    else if (m.kind === 'declined') toast(`${n} menolak tantanganmu`);
    else if (m.kind === 'finished' && !here) toast('🏁 Duel selesai, lihat hasilnya di menu Duel');
    if (here) refreshDuel();
    loadLobby().then(() => { if (activeView() === 'socialPage') renderLobby(false); }).catch(() => {});
  }

  function boot() { ensureShell(); connect(); }
  setInterval(() => { ensureShell(); connect(); }, 5000);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.CLINED_SOCIAL = { openChat: () => { S.hubTab = 'chat'; renderHub(); }, openStatus: () => { S.hubTab = 'status'; S.feed = null; renderHub(); }, open: openLobby, refresh: () => renderLobby(true) };
})();
