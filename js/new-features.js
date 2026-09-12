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

// ── ADMIN PANEL: ANNOUNCEMENTS ────────────────────────────────────────────
window.CLINED_AdminAnnouncements = (function () {
  let announcements = [];

  async function load() {
    const container = document.getElementById('adminAnnouncementsContainer');
    if (!container) return;
    container.innerHTML = '<div class="admin-loading">Memuat…</div>';
    try {
      const r = await fetch('/api/admin/announcements');
      if (!r.ok) { container.innerHTML = '<div class="admin-loading">Tidak punya akses.</div>'; return; }
      const data = await r.json();
      announcements = data.announcements || [];
      renderList(container);
    } catch { container.innerHTML = '<div class="admin-loading">Gagal memuat.</div>'; }
  }

  function renderList(container) {
    if (!announcements.length) {
      container.innerHTML = '<div class="admin-loading">Belum ada pengumuman.</div>';
      return;
    }
    container.innerHTML = announcements.map(a => `
      <div class="admin-announce-row" data-id="${a.id}">
        <div class="admin-announce-meta">
          <span class="admin-announce-priority priority-${a.priority}">${a.priority.toUpperCase()}</span>
          <b>${esc(a.title)}</b>
          <span class="admin-announce-status ${a.published ? 'pub' : 'draft'}">${a.published ? 'Dipublikasi' : 'Draft'}</span>
        </div>
        <p class="admin-announce-body">${esc(a.body)}</p>
        <div class="admin-announce-actions">
          <button class="secondary small-btn" onclick="CLINED_AdminAnnouncements.togglePublish('${a.id}', ${!a.published})">
            ${a.published ? 'Jadikan Draft' : 'Publikasikan'}
          </button>
          <button class="secondary small-btn danger" onclick="CLINED_AdminAnnouncements.deleteAnn('${a.id}')">Hapus</button>
        </div>
      </div>`).join('');
  }

  function esc(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  async function togglePublish(id, published) {
    await fetch(`/api/admin/announcements/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ published }), credentials: 'include' });
    load();
  }

  async function deleteAnn(id) {
    if (!confirm('Hapus pengumuman ini?')) return;
    await fetch(`/api/admin/announcements/${id}`, { method: 'DELETE', credentials: 'include' });
    load();
  }

  async function createAnn() {
    const title = document.getElementById('newAnnTitle')?.value?.trim();
    const body = document.getElementById('newAnnBody')?.value?.trim();
    const priority = document.getElementById('newAnnPriority')?.value || 'normal';
    const published = false;
    if (!title || !body) { alert('Judul dan isi pengumuman harus diisi.'); return; }
    const r = await fetch('/api/admin/announcements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, body, priority, published }), credentials: 'include' });
    if (r.ok) {
      document.getElementById('newAnnTitle').value = '';
      document.getElementById('newAnnBody').value = '';
      
      load();
      if (typeof showToast === 'function') showToast('Pengumuman berhasil disimpan.', false);
    } else { alert('Gagal menyimpan pengumuman.'); }
  }

  return { load, togglePublish, deleteAnn, createAnn };
})();

// ── INJECT ADMIN ANNOUNCEMENT TAB INTO EXISTING ADMIN PANEL ──────────────
(function injectAdminAnnouncementsUI() {
  // Called when admin tab UI is detected - poll until admin panel exists
  function tryInject() {
    // Look for admin panel tabs container (dynamically created by app.js)
    const adminPanelContent = document.getElementById('adminPanelContent');
    if (!adminPanelContent) return false;

    // Check if already injected
    if (document.getElementById('adminAnnouncementsContainer')) return true;

    // Find tab bar and inject new tab
    const tabBar = adminPanelContent.querySelector('.admin-tabs, .admin-panel-tabs');
    if (tabBar) {
      const newTab = document.createElement('button');
      newTab.className = 'admin-panel-tab';
      newTab.dataset.adminTab = 'announcements';
      newTab.textContent = '📢 Pengumuman';
      tabBar.appendChild(newTab);
    }

    // Inject announcement form section
    const announceSection = document.createElement('div');
    announceSection.id = 'adminAnnouncementsSection';
    announceSection.className = 'admin-tab-section admin-announcements-section';
    announceSection.hidden = true;
    announceSection.innerHTML = `
      <div class="admin-section-head">
        <h3>📢 Kelola Pengumuman</h3>
        <p>Kirim pengumuman ke semua pengguna CLINED.</p>
      </div>
      <div class="admin-new-announce-form card nested-card">
        <div class="section-title">Buat Pengumuman Baru</div>
        <label for="newAnnTitle">Judul</label>
        <input id="newAnnTitle" type="text" maxlength="120" placeholder="Judul pengumuman…">
        <label for="newAnnBody">Isi Pengumuman</label>
        <textarea id="newAnnBody" rows="3" maxlength="2000" placeholder="Tulis isi pengumuman…"></textarea>
        <div class="admin-ann-meta-row">
          <select id="newAnnPriority">
            <option value="low">Low</option>
            <option value="normal" selected>Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          
        </div>
        <button class="primary" type="button" onclick="CLINED_AdminAnnouncements.createAnn()">Simpan Pengumuman</button>
      </div>
      <div class="section-title">Pengumuman Tersimpan</div>
      <div id="adminAnnouncementsContainer"><div class="admin-loading">Klik tab untuk memuat.</div></div>
    `;
    adminPanelContent.appendChild(announceSection);

    // Tab switching logic
    adminPanelContent.addEventListener('click', e => {
      const tab = e.target.closest('[data-admin-tab]');
      if (!tab || tab.dataset.adminTab !== 'announcements') return;
      adminPanelContent.querySelectorAll('.admin-tab-section').forEach(s => { s.hidden = s.id !== 'adminAnnouncementsSection'; });
      adminPanelContent.querySelectorAll('.admin-panel-tab').forEach(t => t.classList.toggle('active', t.dataset.adminTab === 'announcements'));
      CLINED_AdminAnnouncements.load();
    });

    return true;
  }

  let attempts = 0;
  const poll = setInterval(() => {
    if (tryInject() || ++attempts > 30) clearInterval(poll);
  }, 500);
})();
