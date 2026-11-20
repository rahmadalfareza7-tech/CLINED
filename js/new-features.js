/* CLINED New Features: Leaderboard, Study Timer, Question Notes */
'use strict';

// ── LEADERBOARD ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
window.CLINED_Leaderboard = (function () {
  let lbData = null;
  let lbTab = 'weekly';

  let lbLoadedAt = 0;
  const blockCache = new Map();

  async function fetchLeaderboard(syncFirst = false) {
    if (syncFirst) {
      try { await window.CLINED_ONLINE_SYNC?.sync?.(); } catch {}
    }
    const r = await fetch('/api/leaderboard', { credentials: 'same-origin', cache: 'no-store' });
    if (!r.ok) return null;
    lbData = await r.json();
    lbLoadedAt = Date.now();
    return lbData;
  }

  function currentBlockChoice() {
    const sel = document.getElementById('leaderboardBlockSelect');
    if (sel) {
      if (!sel.dataset.inited) {
        const saved = String(localStorage.getItem('current_block') || '').trim().toUpperCase();
        if (saved && [...sel.options].some(o => o.value === saved)) sel.value = saved;
        sel.dataset.inited = '1';
      }
      return sel.value || 'KEDKEL';
    }
    return 'KEDKEL';
  }

  async function load() {
    const listEl = document.getElementById('leaderboardList');
    if (!listEl) return;
    if (lbTab === 'block' || lbTab === 'gladiator') return render(listEl, lbTab);
    listEl.innerHTML = '<div class="leaderboard-loading">Memuat…</div>';
    try {
      const data = await fetchLeaderboard(true);
      if (!data) { listEl.innerHTML = '<div class="leaderboard-loading">Belum bisa memuat. Masuk akun dulu.</div>'; return; }
      render(listEl, lbTab);
      loadTeaser();
    } catch { listEl.innerHTML = '<div class="leaderboard-loading">Gagal memuat peringkat.</div>'; }
  }

  async function refreshTeaser(force = false) {
    const teaserEl = document.getElementById('leaderboardTeaser');
    if (!teaserEl) return;
    if (typeof authCurrentUser === 'function' && !authCurrentUser()) return;
    if (!force && lbData && (Date.now() - lbLoadedAt < 60_000)) {
      loadTeaser();
      return;
    }
    try {
      const data = await fetchLeaderboard();
      if (data) loadTeaser();
    } catch {}
  }

  async function renderBlockLeaderboard(listEl) {
    const block = currentBlockChoice();
    const cached = blockCache.get(block);
    if (cached && (Date.now() - cached.at < 30_000)) {
      return renderRows(listEl, cached.data.rankings, cached.data.me, r => r.xpBlock, `Belum ada data XP di blok ${block}.`);
    }
    listEl.innerHTML = `<div class="leaderboard-loading">Memuat peringkat ${escHtml(block)}…</div>`;
    try {
      const r = await fetch(`/api/leaderboard?block=${encodeURIComponent(block)}`, { credentials: 'same-origin', cache: 'no-store' });
      if (!r.ok) throw new Error();
      const d = await r.json();
      blockCache.set(block, { at: Date.now(), data: d });
      if (lbTab !== 'block' || currentBlockChoice() !== block) return;
      renderRows(listEl, d.rankings || [], d.me, row => row.xpBlock, `Belum ada data XP di blok ${block}.`);
    } catch {
      if (lbTab === 'block') listEl.innerHTML = '<div class="leaderboard-loading">Gagal memuat peringkat blok. Masuk akun dulu.</div>';
    }
  }

  async function renderGladiator(listEl) {
    listEl.innerHTML = '<div class="leaderboard-loading">Memuat Rank Gladiator…</div>';
    try {
      const r = await fetch('/api/duels/active', { credentials: 'same-origin', cache: 'no-store' });
      if (!r.ok) throw new Error();
      const d = await r.json();
      if (lbTab !== 'gladiator') return;
      const html = window.CLINED_SOCIAL?.gladiatorRowsHTML?.(d.leaderboardFull || d.leaderboard);
      listEl.innerHTML = html ? `<div class="duel-lb-list">${html}</div>` : '<div class="leaderboard-loading">Belum ada rekor duel. Jadilah Gladiator pertama!</div>';
    } catch { if (lbTab === 'gladiator') listEl.innerHTML = '<div class="leaderboard-loading">Gagal memuat Rank Gladiator. Masuk akun dulu.</div>'; }
  }

  function renderRows(listEl, rows, meId, getXp, emptyMsg) {
    const lbAv = r => {
      const ini = String(r.name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
      return `<span class="lb-av" aria-hidden="true">${r.avatarUrl ? `<img class="lb-av-img" src="${escHtml(r.avatarUrl)}" alt="" loading="lazy">` : escHtml(ini)}</span>`;
    };
    listEl.innerHTML = (rows || []).map((r, i) => {
      const rank = r.rank || (i + 1);
      const xp = Number(getXp(r)) || 0;
      const isMe = r.id === meId;
      const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
      return `<div class="leaderboard-row${isMe ? ' leaderboard-me' : ''}">
        <span class="lb-rank">${medal}</span>
        ${lbAv(r)}
        <div class="lb-user">
          <b>${escHtml(r.name)}</b>
          <small>@${escHtml(r.username)}</small>
        </div>
        <span class="lb-xp">⚡ ${xp.toLocaleString('id')} XP</span>
      </div>`;
    }).join('') || `<div class="leaderboard-loading">${escHtml(emptyMsg)}</div>`;
  }

  function render(listEl, tab) {
    const blockBar = document.getElementById('leaderboardBlockBar');
    if (blockBar) blockBar.hidden = tab !== 'block';
    if (tab === 'gladiator') return renderGladiator(listEl);
    if (tab === 'block') return renderBlockLeaderboard(listEl);
    if (!lbData) return load();
    const rankings = tab === 'alltime'
      ? [...(lbData.rankingsAllTime || lbData.rankings)].sort((a, b) => b.xpAllTime - a.xpAllTime)
      : [...lbData.rankings];
    renderRows(
      listEl,
      rankings.map((r, i) => ({ ...r, rank: tab === 'alltime' ? i + 1 : r.rank })),
      lbData.me,
      r => (tab === 'alltime' ? r.xpAllTime : r.xpWeekly),
      tab === 'alltime' ? 'Belum ada data XP.' : 'Belum ada data minggu ini.'
    );
  }

  function loadTeaser() {
    const teaserEl = document.getElementById('leaderboardTeaser');
    if (!teaserEl || !lbData) return;
    const top3 = lbData.rankings.slice(0, 3);
    if (!top3.length) { teaserEl.innerHTML = '<div class="leaderboard-loading">Jadilah yang pertama!</div>'; return; }
    const meId = lbData.me;
    teaserEl.innerHTML = top3.map((r, i) => {
      const medal = ['🥇','🥈','🥉'][i];
      const isMe = r.id === meId;
      const ini = String(r.name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
      return `<div class="lb-teaser-row${isMe ? ' leaderboard-me' : ''}">
        <span>${medal}</span>
        <span class="lb-av lb-av-sm" aria-hidden="true">${r.avatarUrl ? `<img class="lb-av-img" src="${escHtml(r.avatarUrl)}" alt="" loading="lazy">` : escHtml(ini)}</span>
        <span class="lb-teaser-name">${escHtml(r.name)}</span>
        <span class="lb-teaser-xp">⚡${r.xpWeekly.toLocaleString('id')}</span>
      </div>`;
    }).join('');
  }

  function escHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  // Tab switching
  document.addEventListener('click', e => {
    const tab = e.target.closest('[data-lb-tab]');
    if (!tab) return;
    lbTab = tab.dataset.lbTab;
    document.querySelectorAll('.lb-tab').forEach(t => { t.classList.toggle('active', t.dataset.lbTab === lbTab); t.setAttribute('aria-selected', t.dataset.lbTab === lbTab); });
    render(document.getElementById('leaderboardList'), lbTab);
  });

  document.getElementById('leaderboardBlockSelect')?.addEventListener('change', () => {
    if (lbTab === 'block') renderBlockLeaderboard(document.getElementById('leaderboardList'));
  });

  // Open leaderboard page
  function openPage() {
    const page = document.getElementById('leaderboardPage');
    if (!page) return;
    if (typeof show === 'function') show('leaderboardPage', { force: true });
    else {
      document.querySelectorAll('.view.active').forEach(v => v.classList.remove('active'));
      page.classList.add('active');
    }
    load();
  }

  document.getElementById('openLeaderboardBtn')?.addEventListener('click', openPage);
  document.getElementById('leaderboardMenuBtn')?.addEventListener('click', openPage);
  document.getElementById('backFromLeaderboard')?.addEventListener('click', () => {
    if (typeof show === 'function') show('home');
    else {
      document.getElementById('leaderboardPage')?.classList.remove('active');
      document.getElementById('home')?.classList.add('active');
    }
    refreshTeaser();
  });

  window.addEventListener('clined:auth-ready', () => refreshTeaser(true));
  window.addEventListener('clined:view-change', e => {
    if (e.detail === 'home') refreshTeaser();
    if (e.detail === 'leaderboardPage') load();
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(() => refreshTeaser(), 300));
  else setTimeout(() => refreshTeaser(), 300);

  return { load, openPage, refreshTeaser };
})();

// ── STUDY TIMER (POMODORO) ────────────────────────────────────────────────
window.CLINED_StudyTimer = (function () {
  const MODES = {
    pomodoro: { work: 25 * 60, rest: 5 * 60, label: 'Pomodoro' },
    short: { work: 15 * 60, rest: 3 * 60, label: 'Fokus Singkat' },
    long: { work: 50 * 60, rest: 10 * 60, label: 'Deep Work' }
  };

  let interval = null;
  let running = false;
  let phase = 'work'; // 'work' | 'rest'
  let seconds = MODES.pomodoro.work;
  let mode = 'pomodoro';
  let sessionsToday = Number(localStorage.getItem('clined_timer_sessions_' + new Date().toDateString()) || 0);

  const clockEl = () => document.getElementById('timerClock');
  const labelEl = () => document.getElementById('timerModeLabel');
  const startBtn = () => document.getElementById('timerStartBtn');
  const sessionEl = () => document.getElementById('timerSessionCount');

  function fmt(s) {
    const m = Math.floor(s / 60);
    return `${String(m).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;
  }

  function render() {
    const c = clockEl(); if (!c) return;
    c.textContent = fmt(seconds);
    const l = labelEl();
    if (l) l.textContent = phase === 'work' ? 'BELAJAR' : 'ISTIRAHAT';
    const s = startBtn();
    if (s) s.textContent = running ? '⏸ Jeda' : '▶ ' + (seconds < MODES[mode][phase === 'work' ? 'work' : 'rest'] ? 'Lanjutkan' : 'Mulai');
    const se = sessionEl(); if (se) se.textContent = sessionsToday;
    document.title = running ? `${fmt(seconds)} — CLINED` : 'CLINED — Clinical Education';
  }

  function tick() {
    if (!running) return;
    seconds--;
    if (seconds < 0) {
      if (phase === 'work') {
        sessionsToday++;
        localStorage.setItem('clined_timer_sessions_' + new Date().toDateString(), sessionsToday);
        phase = 'rest';
        seconds = MODES[mode].rest;
        if (typeof showToast === 'function') showToast('🎉 Sesi selesai! Waktunya istirahat.', false);
        try { new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAA').play(); } catch {}
      } else {
        phase = 'work';
        seconds = MODES[mode].work;
        if (typeof showToast === 'function') showToast('⏱ Istirahat selesai. Ayo belajar lagi!', false);
      }
    }
    render();
  }

  function toggleRunning() {
    running = !running;
    if (running) { interval = setInterval(tick, 1000); }
    else { clearInterval(interval); }
    render();
  }

  function reset() {
    running = false; clearInterval(interval);
    phase = 'work'; seconds = MODES[mode].work;
    render();
  }

  document.getElementById('timerStartBtn')?.addEventListener('click', toggleRunning);
  document.getElementById('timerResetBtn')?.addEventListener('click', reset);

  document.addEventListener('click', e => {
    const choice = e.target.closest('[data-timer-mode]');
    if (!choice) return;
    mode = choice.dataset.timerMode;
    document.querySelectorAll('.timer-mode-choice').forEach(c => c.classList.toggle('active', c.dataset.timerMode === mode));
    reset();
  });

  document.getElementById('studyTimerMenuBtn')?.addEventListener('click', () => {
    document.querySelectorAll('.view.active').forEach(v => v.classList.remove('active'));
    document.getElementById('studyTimerPage')?.classList.add('active');
    render();
  });
  document.getElementById('backFromStudyTimer')?.addEventListener('click', () => {
    document.getElementById('studyTimerPage')?.classList.remove('active');
    document.getElementById('home')?.classList.add('active');
    running = false; clearInterval(interval);
    document.title = 'CLINED — Clinical Education';
    render();
  });

  render();
})();
