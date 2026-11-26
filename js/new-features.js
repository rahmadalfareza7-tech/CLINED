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
      await Promise.allSettled([
        window.CLINED_XP?.flush?.(),
        window.CLINED_ONLINE_SYNC?.sync?.({ force: true })
      ]);
    }
    const r = await fetch('/api/leaderboard', { credentials: 'same-origin', cache: 'no-store' });
    if (!r.ok) {
      if (r.status === 401) return { __unauth: true };
      throw new Error(`HTTP ${r.status}`);
    }
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
    if (lbTab === 'block' || lbTab === 'gladiator' || lbTab === 'blok_lysis') return render(listEl, lbTab);
    listEl.innerHTML = '<div class="leaderboard-loading">Memuat…</div>';
    try {
      const data = await fetchLeaderboard(true);
      if (!data || data.__unauth) { listEl.innerHTML = '<div class="leaderboard-loading">Belum bisa memuat. Masuk akun dulu.</div>'; return; }
      render(listEl, lbTab);
      loadTeaser();
    } catch { listEl.innerHTML = '<div class="leaderboard-loading">Gagal memuat peringkat. Coba muat ulang halaman.</div>'; }
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
      if (data && !data.__unauth) loadTeaser();
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

  function readLocalBlokLysisPayload() {
    try {
      const rawStats = localStorage.getItem('clined_blok_lysis_v1');
      const rawSess = localStorage.getItem('clined_blok_lysis_session_v1');
      const st = rawStats ? JSON.parse(rawStats) : {};
      const se = rawSess ? JSON.parse(rawSess) : {};
      const sessScore = se && !se.over && !se.clearedAt ? Math.max(0, Math.floor(Number(se.score) || 0)) : 0;
      const sessCombo = se && !se.over && !se.clearedAt ? Math.max(0, Math.floor(Number(se.combo) || 0)) : 0;
      const best = Math.max(0, Math.floor(Number(st?.best) || 0), sessScore);
      const games = Math.max(0, Math.floor(Number(st?.games) || 0));
      const lines = Math.max(0, Math.floor(Number(st?.lines) || 0));
      const bestCombo = Math.max(0, Math.floor(Number(st?.bestCombo) || 0), sessCombo);
      const hasLast = st?.last !== undefined && st?.last !== null && Number.isFinite(Number(st.last));
      const last = hasLast ? Math.max(0, Math.floor(Number(st.last))) : null;
      const lastAt = hasLast ? Math.max(0, Math.floor(Number(st?.lastAt) || 0)) : 0;
      const updatedAt = Math.max(Number(st?.updatedAt) || 0, Number(se?.updated) || 0, Date.now());
      return { best, games, lines, bestCombo, last, lastAt, updatedAt };
    } catch {
      return { best: 0, games: 0, lines: 0, bestCombo: 0, last: null, lastAt: 0, updatedAt: Date.now() };
    }
  }

  async function renderBlokLysis(listEl) {
    listEl.innerHTML = '<div class="leaderboard-loading">Menyinkronkan &amp; memuat Peringkat Blok Lysis…</div>';
    try {
      const me = typeof authCurrentUser === 'function' ? authCurrentUser() : null;
      const localStats = readLocalBlokLysisPayload();
      let d = null;

      // Push local high score sequentially first so DB & leaderboard are guaranteed fresh without lock race
      if (me && me.id && navigator.onLine && (localStats.best > 0 || localStats.games > 0)) {
        try {
          const pr = await fetch('/api/minigames/blok-lysis/score', {
            method: 'POST',
            credentials: 'same-origin',
            cache: 'no-store',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...localStats,
              clientId: window.CLINED_ONLINE_SYNC?.clientId || ''
            })
          });
          if (pr.status === 401) {
            if (lbTab === 'blok_lysis') listEl.innerHTML = '<div class="leaderboard-loading">Masuk akun dulu untuk melihat peringkat Blok Lysis.</div>';
            return;
          }
          if (pr.ok) {
            const pd = await pr.json().catch(() => null);
            if (pd && Array.isArray(pd.rankings)) d = pd;
          }
        } catch {}
      }

      if (!d) {
        await window.CLINED_ONLINE_SYNC?.sync?.({ force: true })?.catch?.(() => {});
        const r = await fetch('/api/leaderboard?game=blok_lysis', { credentials: 'same-origin', cache: 'no-store' });
        if (r.status === 401) {
          if (lbTab === 'blok_lysis') listEl.innerHTML = '<div class="leaderboard-loading">Masuk akun dulu untuk melihat peringkat Blok Lysis.</div>';
          return;
        }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        d = await r.json();
      }

      if (lbTab !== 'blok_lysis') return;
      const meId = d.me || me?.id || '';
      const isAdminLike = Boolean(me && (me.role === 'admin' || me.role === 'developer'));
      const isHiddenAdmin = Boolean(d.hiddenByAdminToggle || (isAdminLike && d.showInLeaderboard === false) || (isAdminLike && d.showInLeaderboard === undefined && !me.showInLeaderboard));
      let rows = (Array.isArray(d.rankings) ? d.rankings : []).map(row => ({
        ...row,
        bestScore: Number(row.bestScore) || 0,
        bestCombo: Number(row.bestCombo) || 0,
        totalLines: Number(row.totalLines) || 0
      }));
      if (me && meId && !isHiddenAdmin && localStats.best > 0) {
        const uidStr = String(meId);
        const idx = rows.findIndex(row => String(row.id) === uidStr);
        if (idx >= 0) {
          if (localStats.best > rows[idx].bestScore || localStats.bestCombo > rows[idx].bestCombo || localStats.lines > rows[idx].totalLines) {
            rows[idx] = {
              ...rows[idx],
              bestScore: Math.max(rows[idx].bestScore, localStats.best),
              bestCombo: Math.max(rows[idx].bestCombo, localStats.bestCombo),
              totalLines: Math.max(rows[idx].totalLines, localStats.lines)
            };
          }
        } else if (rows.length < 50 || localStats.best >= (rows[rows.length - 1]?.bestScore || 0)) {
          rows.push({
            id: meId,
            name: me.name || me.username || 'Kamu',
            username: me.username || '',
            avatarUrl: me.avatarUrl || '',
            avatarDeco: me.avatarDeco || '',
            bannerUrl: me.bannerUrl || '',
            nameColor: me.nameColor || '',
            xp100k: Boolean(me.xp100k),
            championBlocks: me.championBlocks || [],
            bestScore: localStats.best,
            bestCombo: localStats.bestCombo,
            totalLines: localStats.lines
          });
        }
        rows.sort((a, b) =>
          (b.bestScore - a.bestScore) ||
          (b.bestCombo - a.bestCombo) ||
          (b.totalLines - a.totalLines) ||
          String(a.name || '').localeCompare(String(b.name || ''), 'id')
        );
        if (rows.length > 50) rows.length = 50;
      }

      const lbAv = row => {
        const ini = String(row.name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
        return `<span class="lb-av${row.avatarDeco ? ' has-deco' : ''}" aria-hidden="true">${row.avatarUrl ? `<img class="lb-av-img" src="${escHtml(row.avatarUrl)}" alt="" loading="lazy">` : escHtml(ini)}${row.avatarDeco ? `<img class="avatar-deco-img" src="${escHtml(row.avatarDeco)}" alt="" loading="lazy">` : ''}</span>`;
      };
      const hiddenHint = isHiddenAdmin
        ? `<div class="leaderboard-loading" style="margin-bottom:8px;padding:10px 12px;border-radius:12px;background:rgba(255,210,63,.12);border:1px solid rgba(255,210,63,.35)">👑 Mode Admin tersembunyi aktif — aktifkan sakelar <b>Tampil di Leaderboard</b> di atas agar skor ♛ ${Math.max(localStats.best, Number(d.myBest) || 0).toLocaleString('id')} ikut masuk peringkat.</div>`
        : '';
      const uidStr = String(meId || '');
      const listHtml = rows.map((row, i) => {
        const rank = i + 1;
        const best = Number(row.bestScore) || 0;
        const isMe = uidStr && String(row.id) === uidStr;
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
        const bg = row.bannerUrl ? `<span class="chat-row-bg" style="background-image:url('${escHtml(row.bannerUrl)}')" aria-hidden="true"></span>` : '';
        const nc = row.nameColor ? ` data-name-color="${escHtml(row.nameColor)}"` : '';
        const xpBadge = row.xp100k ? ' <em class="chat-badge b-xp100k compact" title="Pencapaian 100.000 All-Time XP">⚜️ 100K Legend</em>' : '';
        const champBadges = window.CLINED_CHAMPIONS?.renderBadges?.(row.championBlocks, { compact: true, max: 2 }) || '';
        const metaParts = [`@${row.username}`];
        if (row.bestCombo > 1) metaParts.push(`Kombo ×${row.bestCombo}`);
        if (row.totalLines > 0) metaParts.push(`${row.totalLines} baris`);
        return `<div class="leaderboard-row${isMe ? ' leaderboard-me' : ''}${row.bannerUrl ? ' has-banner' : ''}">
          ${bg}
          <span class="lb-rank">${medal}</span>
          ${lbAv(row)}
          <div class="lb-user">
            <b${nc}>${escHtml(row.name)}</b>${xpBadge}${champBadges ? ' ' + champBadges : ''}
            <small>${escHtml(metaParts.join(' · '))}</small>
          </div>
          <span class="lb-xp">♛ ${best.toLocaleString('id')}</span>
        </div>`;
      }).join('');
      listEl.innerHTML = hiddenHint + (listHtml || '<div class="leaderboard-loading">Belum ada skor Blok Lysis. Mainkan di Mini Games dan jadilah #1!</div>');
    } catch {
      if (lbTab === 'blok_lysis') listEl.innerHTML = '<div class="leaderboard-loading">Gagal memuat peringkat Blok Lysis. Masuk akun dulu.</div>';
    }
  }

  function renderRows(listEl, rows, meId, getXp, emptyMsg) {
    const lbAv = r => {
      const ini = String(r.name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
      return `<span class="lb-av${r.avatarDeco ? ' has-deco' : ''}" aria-hidden="true">${r.avatarUrl ? `<img class="lb-av-img" src="${escHtml(r.avatarUrl)}" alt="" loading="lazy">` : escHtml(ini)}${r.avatarDeco ? `<img class="avatar-deco-img" src="${escHtml(r.avatarDeco)}" alt="" loading="lazy">` : ''}</span>`;
    };
    listEl.innerHTML = (rows || []).map((r, i) => {
      const rank = r.rank || (i + 1);
      const xp = Number(getXp(r)) || 0;
      const isMe = r.id === meId;
      const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
      const bg = r.bannerUrl ? `<span class="chat-row-bg" style="background-image:url('${escHtml(r.bannerUrl)}')" aria-hidden="true"></span>` : '';
      const nc = r.nameColor ? ` data-name-color="${escHtml(r.nameColor)}"` : '';
      const xpBadge = r.xp100k ? ' <em class="chat-badge b-xp100k compact" title="Pencapaian 100.000 All-Time XP">⚜️ 100K Legend</em>' : '';
      const champBadges = window.CLINED_CHAMPIONS?.renderBadges?.(r.championBlocks, { compact: true, max: 2 }) || '';
      return `<div class="leaderboard-row${isMe ? ' leaderboard-me' : ''}${r.bannerUrl ? ' has-banner' : ''}">
        ${bg}
        <span class="lb-rank">${medal}</span>
        ${lbAv(r)}
        <div class="lb-user">
          <b${nc}>${escHtml(r.name)}</b>${xpBadge}${champBadges ? ' ' + champBadges : ''}
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
    if (tab === 'blok_lysis') return renderBlokLysis(listEl);
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
      const bg = r.bannerUrl ? `<span class="chat-row-bg" style="background-image:url('${escHtml(r.bannerUrl)}')" aria-hidden="true"></span>` : '';
      const nc = r.nameColor ? ` data-name-color="${escHtml(r.nameColor)}"` : '';
      const xpBadge = r.xp100k ? ' <em class="chat-badge b-xp100k compact" title="Pencapaian 100.000 All-Time XP">⚜️ 100K</em>' : '';
      const champBadge = window.CLINED_CHAMPIONS?.renderBadges?.(r.championBlocks, { compact: true, short: true, max: 1 }) || '';
      return `<div class="lb-teaser-row${isMe ? ' leaderboard-me' : ''}${r.bannerUrl ? ' has-banner' : ''}">
        ${bg}
        <span>${medal}</span>
        <span class="lb-av lb-av-sm${r.avatarDeco ? ' has-deco' : ''}" aria-hidden="true">${r.avatarUrl ? `<img class="lb-av-img" src="${escHtml(r.avatarUrl)}" alt="" loading="lazy">` : escHtml(ini)}${r.avatarDeco ? `<img class="avatar-deco-img" src="${escHtml(r.avatarDeco)}" alt="" loading="lazy">` : ''}</span>
        <span class="lb-teaser-name"${nc}>${escHtml(r.name)}</span>${xpBadge}${champBadge ? ' ' + champBadge : ''}
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

  function syncAdminLeaderboardToggle() {
    const box = document.getElementById('adminLeaderboardToggleBox');
    const btn = document.getElementById('adminLeaderboardSwitch');
    const lbl = document.getElementById('adminLeaderboardSwitchLbl');
    const sub = document.getElementById('adminLeaderboardToggleSub');
    if (!box || !btn) return;
    const me = typeof authCurrentUser === 'function' ? authCurrentUser() : null;
    const isAdminUser = Boolean(me && (me.role === 'admin' || me.role === 'developer'));
    box.hidden = !isAdminUser;
    if (!isAdminUser) return;
    const on = Boolean(me.showInLeaderboard);
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-checked', String(on));
    if (lbl) lbl.textContent = on ? 'ON' : 'OFF';
    if (sub) {
      sub.textContent = on
        ? 'Aktif • Akun Admin ikut muncul di Weekly, Per BLOK, All Time, Gladiator & Blok Lysis'
        : 'Nonaktif • Akun Admin disembunyikan dari semua papan peringkat';
    }
  }

  document.getElementById('adminLeaderboardSwitch')?.addEventListener('click', async () => {
    const btn = document.getElementById('adminLeaderboardSwitch');
    const me = typeof authCurrentUser === 'function' ? authCurrentUser() : null;
    if (!btn || !me || (me.role !== 'admin' && me.role !== 'developer') || btn.disabled) return;
    const nextEnabled = !me.showInLeaderboard;
    btn.disabled = true;
    try {
      const r = await fetch('/api/auth/leaderboard-visibility', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextEnabled })
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Gagal mengatur tampilan leaderboard.');
      me.showInLeaderboard = Boolean(d.user ? d.user.showInLeaderboard : nextEnabled);
      syncAdminLeaderboardToggle();
      lbLoadedAt = 0;
      lbData = null;
      blockCache.clear();
      if (typeof window.showToast === 'function') {
        window.showToast(me.showInLeaderboard
          ? '👑 Admin sekarang tampil di semua Leaderboard!'
          : 'Admin disembunyikan dari semua Leaderboard.');
      }
      await load();
      refreshTeaser(true);
    } catch (err) {
      if (typeof window.showToast === 'function') window.showToast(err.message || 'Gagal mengatur tampilan leaderboard.', true);
    } finally {
      btn.disabled = false;
    }
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
    syncAdminLeaderboardToggle();
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

  window.addEventListener('clined:auth-ready', () => { syncAdminLeaderboardToggle(); refreshTeaser(true); });
  window.addEventListener('clined:xp-gained', () => { lbLoadedAt = 0; blockCache.clear(); });
  window.addEventListener('clined:view-change', e => {
    if (e.detail === 'home') refreshTeaser();
    if (e.detail === 'leaderboardPage') { syncAdminLeaderboardToggle(); load(); }
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(() => { syncAdminLeaderboardToggle(); refreshTeaser(); }, 300));
  else setTimeout(() => { syncAdminLeaderboardToggle(); refreshTeaser(); }, 300);

  return { load, openPage, refreshTeaser, syncAdminLeaderboardToggle };
})();

// ── STUDY TIMER (INFUS BELAJAR — POMODORO & STOPWATCH + HEADER PILL) ──────
window.CLINED_StudyTimer = (function () {
  const MODES = {
    pomodoro: { work: 25 * 60, rest: 5 * 60, label: 'Pomodoro' },
    short: { work: 15 * 60, rest: 3 * 60, label: 'Fokus Singkat' },
    long: { work: 50 * 60, rest: 10 * 60, label: 'Deep Work' }
  };
  const STATE_KEY = 'clined_iv_timer_state_v1';
  const FLUID_KEY = 'clined_iv_timer_fluid_v1';
  const FLUIDS = new Set(['nacl', 'blood', 'vita']);

  let interval = null;
  let running = false;
  let kind = 'pomodoro'; // 'pomodoro' | 'stopwatch'
  let phase = 'work'; // 'work' | 'rest'
  let mode = 'pomodoro';
  let fluid = (() => {
    const saved = String(localStorage.getItem(FLUID_KEY) || 'nacl');
    return FLUIDS.has(saved) ? saved : 'nacl';
  })();
  let seconds = MODES.pomodoro.work; // remaining in pomodoro, elapsed in stopwatch
  let deadlineMs = 0; // wall-clock deadline when pomodoro is running
  let startedAtMs = 0; // wall-clock anchor when stopwatch is running
  let sessionsToday = Number(localStorage.getItem('clined_timer_sessions_' + new Date().toDateString()) || 0);

  const cardEl = () => document.getElementById('ivTimerCard');
  const clockEl = () => document.getElementById('timerClock');
  const labelEl = () => document.getElementById('timerModeLabel');
  const volEl = () => document.getElementById('ivVolumeLabel');
  const ctxEl = () => document.getElementById('ivContextLine');
  const liquidEl = () => document.getElementById('ivLiquidGroup');
  const startBtn = () => document.getElementById('timerStartBtn');
  const resetBtn = () => document.getElementById('timerResetBtn');
  const sessionEl = () => document.getElementById('timerSessionCount');
  const modeGridEl = () => document.getElementById('timerModeGrid');
  const hdrPillEl = () => document.getElementById('headerIvTimerPill');
  const hdrTextEl = () => document.getElementById('headerIvTimerText');
  const hdrFillEl = () => document.getElementById('hdrIvFillRect');

  function fmt(s) {
    const safe = Math.max(0, Math.floor(Number(s) || 0));
    const h = Math.floor(safe / 3600);
    const m = Math.floor((safe % 3600) / 60);
    const sec = safe % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }

  function currentTotalSec() {
    if (kind === 'stopwatch') return 3600;
    return MODES[mode][phase === 'work' ? 'work' : 'rest'];
  }

  function isSessionActive() {
    if (running) return true;
    if (kind === 'stopwatch') return seconds > 0;
    return phase === 'rest' || seconds < currentTotalSec();
  }

  function computeFillRatio() {
    if (kind === 'stopwatch') {
      // Siklus visual 60 menit perlahan turun dari 100% -> 12% agar cairan tetap terasa mengalir
      const cycleSec = 60 * 60;
      const frac = 1 - ((seconds % cycleSec) / cycleSec);
      return Math.max(0.12, Math.min(1, frac));
    }
    const total = Math.max(1, currentTotalSec());
    return Math.max(0, Math.min(1, seconds / total));
  }

  function detectStudyContext() {
    let blk = '';
    try {
      if (typeof window.getCurrentBlockId === 'function') blk = String(window.getCurrentBlockId() || '').trim();
      if (!blk) blk = String(localStorage.getItem('current_block') || localStorage.getItem('last_worked_block') || '').trim();
    } catch {}
    const clean = blk.replace(/^BLOK\s+/i, '').trim().toUpperCase();
    const roleText = kind === 'stopwatch'
      ? 'Stopwatch Belajar'
      : phase === 'rest'
        ? 'Istirahat & Pemulihan'
        : MODES[mode].label;
    return clean ? `🩺 BLOK ${clean} • ${roleText}` : `🩺 ${roleText} • CLINED`;
  }

  function persistState() {
    try {
      if (!isSessionActive()) {
        localStorage.removeItem(STATE_KEY);
        return;
      }
      localStorage.setItem(STATE_KEY, JSON.stringify({
        running, kind, mode, phase, seconds, deadlineMs, startedAtMs, updatedAt: Date.now()
      }));
    } catch {}
  }

  function hydrateState() {
    try {
      const raw = JSON.parse(localStorage.getItem(STATE_KEY) || 'null');
      if (!raw || typeof raw !== 'object') return;
      if (raw.kind === 'pomodoro' || raw.kind === 'stopwatch') kind = raw.kind;
      if (MODES[raw.mode]) mode = raw.mode;
      if (raw.phase === 'work' || raw.phase === 'rest') phase = raw.phase;
      running = Boolean(raw.running);
      seconds = Math.max(0, Math.floor(Number(raw.seconds) || 0));
      deadlineMs = Number(raw.deadlineMs) || 0;
      startedAtMs = Number(raw.startedAtMs) || 0;
      if (running) {
        if (kind === 'pomodoro' && deadlineMs > 0) {
          seconds = Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000));
          if (seconds <= 0) {
            running = false;
            deadlineMs = 0;
            completePomodoroPhase(true);
            return;
          }
        } else if (kind === 'stopwatch' && startedAtMs > 0) {
          seconds = Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000));
        }
        startInterval();
      }
    } catch {}
  }

  function playChime() {
    try {
      if (typeof window.beep === 'function') { window.beep('level'); return; }
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.46);
    } catch {}
  }

  function completePomodoroPhase(silentRestore = false) {
    if (phase === 'work') {
      sessionsToday++;
      try { localStorage.setItem('clined_timer_sessions_' + new Date().toDateString(), String(sessionsToday)); } catch {}
      phase = 'rest';
      seconds = MODES[mode].rest;
      if (!silentRestore) {
        if (typeof showToast === 'function') showToast('🎉 Infus fokus habis! 1 sesi selesai — waktunya istirahat.', false);
        playChime();
      }
      if (running) deadlineMs = Date.now() + seconds * 1000;
    } else {
      phase = 'work';
      seconds = MODES[mode].work;
      if (!silentRestore) {
        if (typeof showToast === 'function') showToast('💧 Istirahat selesai! Infus fokus baru siap mengalir.', false);
        playChime();
      }
      if (running) deadlineMs = Date.now() + seconds * 1000;
    }
    persistState();
  }

  function render() {
    const active = isSessionActive();
    const state = running ? 'running' : active ? 'paused' : 'idle';
    const ratio = computeFillRatio();
    const text = fmt(seconds);

    const card = cardEl();
    if (card) {
      card.dataset.fluid = fluid;
      card.dataset.phase = kind === 'pomodoro' ? phase : 'work';
      card.dataset.state = state;
    }

    const c = clockEl();
    if (c) c.textContent = text;

    const l = labelEl();
    if (l) {
      l.textContent = kind === 'stopwatch'
        ? (running ? 'STOPWATCH AKTIF' : active ? 'STOPWATCH JEDA' : 'STOPWATCH')
        : (phase === 'work' ? (running ? 'INFUS FOKUS' : active ? 'INFUS JEDA' : 'SIAP INFUS') : 'ISTIRAHAT');
    }

    const vol = volEl();
    if (vol) {
      if (kind === 'stopwatch') {
        const mlDripped = Math.round((seconds / 60) * 16.6);
        vol.textContent = `${mlDripped} mL masuk`;
      } else {
        const mlLeft = Math.round(ratio * 500);
        vol.textContent = `${mlLeft} mL`;
      }
    }

    const liq = liquidEl();
    if (liq) {
      // Clip area tinggi 132px (y=42..174); translateY 0 = penuh, 134 = kosong
      const offsetY = Math.round((1 - ratio) * 132);
      liq.style.transform = `translateY(${offsetY}px)`;
    }

    const ctx = ctxEl();
    if (ctx) ctx.textContent = detectStudyContext();

    const s = startBtn();
    if (s) {
      s.textContent = running
        ? '⏸ Jeda'
        : active
          ? '▶ Lanjutkan'
          : (kind === 'stopwatch' ? '▶ Mulai Stopwatch' : '▶ Mulai Infus');
    }
    const rb = resetBtn();
    if (rb) rb.textContent = active ? '⏹ Selesai' : '↺ Reset';

    const se = sessionEl();
    if (se) se.textContent = sessionsToday;

    const mg = modeGridEl();
    if (mg) mg.hidden = (kind !== 'pomodoro');

    document.querySelectorAll('.iv-seg-btn').forEach(b => {
      const on = b.dataset.timerKind === kind;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', String(on));
    });
    document.querySelectorAll('.iv-fluid-chip').forEach(b => {
      b.classList.toggle('active', b.dataset.ivFluid === fluid);
    });
    document.querySelectorAll('.timer-mode-choice').forEach(b => {
      b.classList.toggle('active', b.dataset.timerMode === mode);
    });

    // Header Live IV Drip Pill — muncul otomatis saat Study Timer aktif di seluruh halaman
    const pill = hdrPillEl();
    if (pill) {
      pill.hidden = !active;
      pill.dataset.state = state;
      pill.dataset.fluid = fluid;
      pill.dataset.phase = kind === 'pomodoro' ? phase : 'work';
      const ht = hdrTextEl();
      if (ht) ht.textContent = text;
      const hf = hdrFillEl();
      if (hf) {
        const h = Math.max(0, +(13.5 * ratio).toFixed(2));
        const y = +(7 + (13.5 - h)).toFixed(2);
        hf.setAttribute('y', String(y));
        hf.setAttribute('height', String(h));
      }
    }
    document.body.classList.toggle('iv-timer-active', active);
    document.title = running ? `💧 ${text} — CLINED` : 'CLINED — Clinical Education';
  }

  function startInterval() {
    clearInterval(interval);
    interval = setInterval(tick, 500);
  }

  function tick() {
    if (!running) return;
    if (kind === 'stopwatch') {
      seconds = Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000));
      render();
      return;
    }
    const rem = Math.ceil((deadlineMs - Date.now()) / 1000);
    if (rem <= 0) {
      seconds = 0;
      completePomodoroPhase(false);
    } else {
      seconds = rem;
    }
    render();
  }

  function toggleRunning() {
    if (running) {
      tick();
      running = false;
      clearInterval(interval);
      deadlineMs = 0;
      startedAtMs = 0;
    } else {
      running = true;
      if (kind === 'stopwatch') {
        startedAtMs = Date.now() - seconds * 1000;
      } else {
        if (seconds <= 0) seconds = currentTotalSec();
        deadlineMs = Date.now() + seconds * 1000;
      }
      startInterval();
    }
    persistState();
    render();
  }

  function reset() {
    const wasStopwatchDone = kind === 'stopwatch' && seconds >= 60;
    running = false;
    clearInterval(interval);
    deadlineMs = 0;
    startedAtMs = 0;
    if (wasStopwatchDone) {
      sessionsToday++;
      try { localStorage.setItem('clined_timer_sessions_' + new Date().toDateString(), String(sessionsToday)); } catch {}
      if (typeof showToast === 'function') showToast(`🎉 Sesi stopwatch ${fmt(seconds)} tercatat!`, false);
    }
    phase = 'work';
    seconds = kind === 'stopwatch' ? 0 : MODES[mode].work;
    persistState();
    render();
  }

  function openPage() {
    if (typeof window.show === 'function') window.show('studyTimerPage', { force: true });
    else {
      document.querySelectorAll('.view.active').forEach(v => v.classList.remove('active'));
      document.getElementById('studyTimerPage')?.classList.add('active');
    }
    render();
  }

  document.getElementById('timerStartBtn')?.addEventListener('click', toggleRunning);
  document.getElementById('timerResetBtn')?.addEventListener('click', reset);
  document.getElementById('headerIvTimerPill')?.addEventListener('click', openPage);
  document.getElementById('studyTimerMenuBtn')?.addEventListener('click', openPage);

  document.getElementById('backFromStudyTimer')?.addEventListener('click', () => {
    // Jangan matikan timer saat kembali ke Beranda agar infus tetap menetes di header!
    if (typeof window.show === 'function') window.show('home');
    else {
      document.getElementById('studyTimerPage')?.classList.remove('active');
      document.getElementById('home')?.classList.add('active');
    }
    render();
  });

  document.addEventListener('click', e => {
    const kindBtn = e.target.closest('[data-timer-kind]');
    if (kindBtn) {
      const next = kindBtn.dataset.timerKind;
      if (next && next !== kind && (next === 'pomodoro' || next === 'stopwatch')) {
        running = false; clearInterval(interval); deadlineMs = 0; startedAtMs = 0;
        kind = next;
        phase = 'work';
        seconds = kind === 'stopwatch' ? 0 : MODES[mode].work;
        persistState();
        render();
      }
      return;
    }
    const fluidBtn = e.target.closest('[data-iv-fluid]');
    if (fluidBtn) {
      const f = fluidBtn.dataset.ivFluid;
      if (FLUIDS.has(f)) {
        fluid = f;
        try { localStorage.setItem(FLUID_KEY, fluid); } catch {}
        render();
      }
      return;
    }
    const choice = e.target.closest('[data-timer-mode]');
    if (choice && MODES[choice.dataset.timerMode]) {
      mode = choice.dataset.timerMode;
      running = false; clearInterval(interval); deadlineMs = 0; startedAtMs = 0;
      phase = 'work';
      seconds = MODES[mode].work;
      persistState();
      render();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && running) tick();
  });
  window.addEventListener('clined:view-change', () => { if (isSessionActive()) render(); });
  window.addEventListener('clined:sync-applied', () => {
    sessionsToday = Number(localStorage.getItem('clined_timer_sessions_' + new Date().toDateString()) || 0);
    render();
  });

  hydrateState();
  render();
  return { openPage, toggleRunning, reset, fmt };
})();
