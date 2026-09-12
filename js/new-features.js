/* CLINED New Features: Announcements, Leaderboard, Study Timer, Question Notes */
'use strict';

// ── ANNOUNCEMENTS ─────────────────────────────────────────────────────────
(function initAnnouncements() {
  const banner = document.getElementById('announcementBanner');
  const text = document.getElementById('announcementText');
  const dot = document.getElementById('announcementDot');
  const closeBtn = document.getElementById('closeAnnouncement');
  if (!banner) return;

  const dismissed = JSON.parse(localStorage.getItem('clined_dismissed_announcements') || '[]');

  async function loadAnnouncements() {
    try {
      const r = await fetch('/api/announcements');
      if (!r.ok) return;
      const { announcements } = await r.json();
      if (!announcements || !announcements.length) return;
      const ann = announcements.find(a => !dismissed.includes(a.id));
      if (!ann) return;
      text.textContent = `${ann.title}: ${ann.body}`;
      dot.dataset.priority = ann.priority;
      dot.className = `announcement-priority-dot priority-${ann.priority}`;
      banner._currentId = ann.id;
      banner.hidden = false;
    } catch {}
  }

  closeBtn.addEventListener('click', () => {
    if (banner._currentId) {
      dismissed.push(banner._currentId);
      localStorage.setItem('clined_dismissed_announcements', JSON.stringify(dismissed));
    }
    banner.hidden = true;
  });

  loadAnnouncements();
})();

// ── LEADERBOARD ───────────────────────────────────────────────────────────
window.CLINED_Leaderboard = (function () {
  let lbData = null;
  let lbTab = 'weekly';

  async function load() {
    const listEl = document.getElementById('leaderboardList');
    if (!listEl) return;
    listEl.innerHTML = '<div class="leaderboard-loading">Memuat…</div>';
    try {
      const r = await fetch('/api/leaderboard');
      if (!r.ok) { listEl.innerHTML = '<div class="leaderboard-loading">Belum bisa memuat. Masuk akun dulu.</div>'; return; }
      lbData = await r.json();
      render(listEl, lbTab);
      loadTeaser();
    } catch { listEl.innerHTML = '<div class="leaderboard-loading">Gagal memuat peringkat.</div>'; }
  }

  function render(listEl, tab) {
    if (!lbData) return;
    const rankings = [...lbData.rankings];
    if (tab === 'alltime') rankings.sort((a, b) => b.xpAllTime - a.xpAllTime);
    const meId = lbData.me;
    listEl.innerHTML = rankings.map((r, i) => {
      const rank = tab === 'alltime' ? i + 1 : r.rank;
      const xp = tab === 'alltime' ? r.xpAllTime : r.xpWeekly;
      const isMe = r.id === meId;
      const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
      return `<div class="leaderboard-row${isMe ? ' leaderboard-me' : ''}">
        <span class="lb-rank">${medal}</span>
        <div class="lb-user">
          <b>${escHtml(r.name)}</b>
          <small>@${escHtml(r.username)}</small>
        </div>
        <span class="lb-xp">⚡ ${xp.toLocaleString('id')} XP</span>
      </div>`;
    }).join('') || '<div class="leaderboard-loading">Belum ada data minggu ini.</div>';
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
      return `<div class="lb-teaser-row${isMe ? ' leaderboard-me' : ''}">
        <span>${medal}</span>
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

  // Open leaderboard page
  function openPage() {
    const page = document.getElementById('leaderboardPage');
    if (!page) return;
    document.querySelectorAll('.view.active').forEach(v => v.classList.remove('active'));
    page.classList.add('active');
    if (!lbData) load();
  }

  document.getElementById('openLeaderboardBtn')?.addEventListener('click', openPage);
  document.getElementById('leaderboardMenuBtn')?.addEventListener('click', openPage);
  document.getElementById('backFromLeaderboard')?.addEventListener('click', () => {
    document.getElementById('leaderboardPage')?.classList.remove('active');
    document.getElementById('home')?.classList.add('active');
  });

  // Load teaser on home load
  setTimeout(() => { fetch('/api/leaderboard').then(r => r.json()).then(d => { lbData = d; loadTeaser(); }).catch(() => {}); }, 1500);

  return { load, openPage };
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
