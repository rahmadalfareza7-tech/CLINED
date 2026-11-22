/* CLINED — Discord-style Right Member Sidebar (Desktop ≥1280px) */
(() => {
  'use strict';

  const PREF_KEY = 'clined_member_sidebar_open_v1';
  const POLL_MS = 25000;
  const HUES = ['#1cb0f6,#7c5cff', '#ff9600,#ff4b4b', '#58cc02,#00b496', '#ff63a0,#a05aff', '#00b8d9,#3c64e6', '#ffc400,#ff7800'];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const hue = n => { let h = 0; for (const c of String(n || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0; return `linear-gradient(135deg,${HUES[h % HUES.length]})`; };
  const ini = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase() || '?';
  const tabletUpMq = window.matchMedia('(min-width: 768px)');
  const dockedMq = window.matchMedia('(min-width: 1024px)');

  const S = {
    open: dockedMq.matches,
    showOffline: false,
    users: null,
    q: '',
    poll: null,
    loading: false,
    lastHtml: '',
  };

  try {
    const saved = localStorage.getItem(PREF_KEY);
    if (saved === '0') S.open = false;
    else if (saved === '1' && dockedMq.matches) S.open = true;
  } catch {}

  let aside = null;
  let reopenBtn = null;
  let backdrop = null;

  function isLoggedIn() {
    return typeof window.authCurrentUser === 'function' && !!window.authCurrentUser();
  }

  function applyOpenState() {
    const active = S.open && tabletUpMq.matches && isLoggedIn();
    document.body.classList.toggle('ms-open', active);
  }

  function setOpen(next) {
    S.open = !!next;
    if (dockedMq.matches) {
      try { localStorage.setItem(PREF_KEY, S.open ? '1' : '0'); } catch {}
    }
    applyOpenState();
    if (S.open && tabletUpMq.matches && isLoggedIn()) {
      loadMembers();
      startPoll();
    } else {
      stopPoll();
    }
  }

  function badgesForUser(u) {
    if (Array.isArray(u?.badges)) return u.badges;
    const b = [];
    if (u?.role === 'admin' || u?.role === 'developer') b.push('admin');
    if (u?.role === 'helper') b.push('helper');
    if (u?.isMentor || u?.is_mentor) b.push('mentor');
    return b;
  }

  function getMergedList() {
    const list = Array.isArray(S.users) ? S.users.slice() : [];
    const me = typeof window.authCurrentUser === 'function' ? window.authCurrentUser() : null;
    if (me && !list.some(x => x.id === me.id)) {
      list.push({
        id: me.id,
        name: me.name || me.username || 'Kamu',
        username: me.username || '',
        avatarUrl: me.avatarUrl || '',
        bannerUrl: me.bannerUrl || '',
        nameColor: me.nameColor || '',
        avatarDeco: me.avatarDeco || '',
        badges: badgesForUser(me),
        online: true,
        isMe: true,
        unread: 0,
      });
    }
    return list;
  }

  function sortByOnlineThenName(a, b) {
    if (!!a.online !== !!b.online) return a.online ? -1 : 1;
    if (!!a.isMe !== !!b.isMe) return a.isMe ? -1 : 1;
    return String(a.name || '').localeCompare(String(b.name || ''), 'id');
  }

  function memberRowHtml(u) {
    const badges = badgesForUser(u);
    const hasBanner = !!u.bannerUrl;
    const bannerStyle = hasBanner ? ` style="background-image:url('${esc(u.bannerUrl)}')"` : '';
    const nc = u.nameColor ? ` data-name-color="${esc(u.nameColor)}"` : '';
    const roleTag = badges.includes('admin')
      ? '<span class="ms-role-tag admin">Admin</span>'
      : badges.includes('helper')
        ? '<span class="ms-role-tag helper">Helper</span>'
        : badges.includes('mentor')
          ? '<span class="ms-role-tag mentor">Mentor</span>'
          : u.isMe
            ? '<span class="ms-role-tag me">Kamu</span>'
            : '';
    const sub = u.lastText
      ? u.lastText
      : u.isMe
        ? `@${u.username} • Online`
        : `@${u.username}`;
    const unread = (u.unread || 0) > 0 ? `<span class="ms-unread">${u.unread > 9 ? '9+' : u.unread}</span>` : '';
    const avInner = u.avatarUrl
      ? `<img class="ms-av-img" src="${esc(u.avatarUrl)}" alt="" loading="lazy">`
      : esc(ini(u.name));
    const deco = u.avatarDeco ? `<img class="avatar-deco-img" src="${esc(u.avatarDeco)}" alt="">` : '';
    const title = u.isMe ? 'Buka profil kamu' : `Chat dengan ${u.name}`;

    return `<button type="button" class="ms-row${hasBanner ? ' has-banner' : ''}${u.online ? '' : ' is-offline'}" data-ms-uid="${esc(u.id)}" data-ms-me="${u.isMe ? '1' : '0'}" title="${esc(title)}"${bannerStyle}>
      <span class="ms-av${u.online ? ' on' : ''}${u.avatarDeco ? ' has-deco' : ''}" style="${u.avatarUrl ? '' : `background:${hue(u.name)}`}">${avInner}${deco}</span>
      <span class="ms-meta">
        <span class="ms-name-line"><b class="ms-name"${nc}>${esc(u.name)}</b>${roleTag}</span>
        <span class="ms-sub">${esc(sub)}</span>
      </span>
      ${unread}
    </button>`;
  }

  function render() {
    if (!aside) return;
    const body = aside.querySelector('[data-ms-body]');
    const onlinePill = aside.querySelector('[data-ms-online]');
    const reopenCount = reopenBtn?.querySelector('[data-ms-reopen-count]');
    if (!body) return;

    if (S.users == null) {
      body.innerHTML = '<div class="ms-empty">Memuat daftar member…</div>';
      return;
    }

    const all = getMergedList();
    const totalOnline = all.filter(u => u.online).length;
    if (onlinePill) onlinePill.innerHTML = `<i></i>${totalOnline} Online`;
    if (reopenCount) reopenCount.textContent = `${totalOnline} Online`;

    const q = S.q.trim().toLowerCase();
    const filtered = q
      ? all.filter(u => String(u.name || '').toLowerCase().includes(q) || String(u.username || '').toLowerCase().includes(q))
      : all;

    if (!filtered.length) {
      const emptyHtml = '<div class="ms-empty">Member tidak ditemukan.</div>';
      if (emptyHtml !== S.lastHtml) { S.lastHtml = emptyHtml; body.innerHTML = emptyHtml; }
      return;
    }

    const admins = [];
    const helpers = [];
    const mentors = [];
    const onlineStudents = [];
    const offlineStudents = [];

    for (const u of filtered) {
      const b = badgesForUser(u);
      if (b.includes('admin')) admins.push(u);
      else if (b.includes('helper')) helpers.push(u);
      else if (b.includes('mentor')) mentors.push(u);
      else if (u.online) onlineStudents.push(u);
      else offlineStudents.push(u);
    }

    admins.sort(sortByOnlineThenName);
    helpers.sort(sortByOnlineThenName);
    mentors.sort(sortByOnlineThenName);
    onlineStudents.sort(sortByOnlineThenName);
    offlineStudents.sort(sortByOnlineThenName);

    const groupHtml = (icon, label, items) => items.length
      ? `<section class="ms-group"><div class="ms-group-hdr"><span>${icon} ${label} — ${items.length}</span></div>${items.map(memberRowHtml).join('')}</section>`
      : '';

    let html = '';
    html += groupHtml('👑', 'Admin', admins);
    html += groupHtml('🛠️', 'Helper', helpers);
    html += groupHtml('🙋', 'Mentor', mentors);
    html += groupHtml('🟢', 'Online', onlineStudents);

    if (offlineStudents.length) {
      const expanded = S.showOffline || !!q;
      html += `<section class="ms-group">
        <button type="button" class="ms-group-hdr ms-group-toggle" data-ms-toggle-offline aria-expanded="${expanded}">
          <span>⚫ Offline — ${offlineStudents.length}</span>
          <span>${expanded ? '▾' : '▸'}</span>
        </button>
        ${expanded ? offlineStudents.map(memberRowHtml).join('') : ''}
      </section>`;
    }

    if (html !== S.lastHtml) {
      S.lastHtml = html;
      body.innerHTML = html;
    }
  }

  async function loadMembers() {
    if (S.loading || !isLoggedIn() || !tabletUpMq.matches) return;
    S.loading = true;
    try {
      const res = await fetch('/api/chat/users', { credentials: 'same-origin', cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data?.users)) {
        S.users = data.users;
        render();
      }
    } catch {}
    finally { S.loading = false; }
  }

  function startPoll() {
    stopPoll();
    S.poll = setInterval(() => {
      if (document.hidden || !S.open || !tabletUpMq.matches || !isLoggedIn()) return;
      if (document.body.classList.contains('quiz-context')) return;
      loadMembers();
    }, POLL_MS);
  }

  function stopPoll() {
    if (S.poll) { clearInterval(S.poll); S.poll = null; }
  }

  function mountDom() {
    if (aside) return;
    backdrop = document.createElement('div');
    backdrop.className = 'ms-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', () => setOpen(false));

    aside = document.createElement('aside');
    aside.id = 'memberSidebar';
    aside.className = 'ms-sidebar';
    aside.setAttribute('aria-label', 'Daftar Member CLINED');
    aside.innerHTML = `
      <div class="ms-head">
        <div class="ms-head-top">
          <span class="ms-title">👥 Member <span class="ms-online-pill" data-ms-online><i></i>0 Online</span></span>
          <button type="button" class="ms-hide-btn" data-ms-hide title="Sembunyikan panel member" aria-label="Sembunyikan panel member">›</button>
        </div>
        <input type="search" class="ms-search" data-ms-search placeholder="Cari member…" autocomplete="off" aria-label="Cari member">
      </div>
      <div class="ms-body" data-ms-body></div>
    `;
    document.body.appendChild(aside);

    reopenBtn = document.createElement('button');
    reopenBtn.type = 'button';
    reopenBtn.className = 'ms-reopen';
    reopenBtn.setAttribute('aria-label', 'Tampilkan daftar member');
    reopenBtn.innerHTML = `<span class="ms-reopen-dot"></span><span>👥</span><span data-ms-reopen-count>Member</span>`;
    document.body.appendChild(reopenBtn);

    aside.addEventListener('click', e => {
      if (e.target.closest('[data-ms-hide]')) { setOpen(false); return; }
      if (e.target.closest('[data-ms-toggle-offline]')) { S.showOffline = !S.showOffline; render(); return; }
      const row = e.target.closest('[data-ms-uid]');
      if (!row) return;
      if (!dockedMq.matches) setOpen(false);
      if (row.dataset.msMe === '1') {
        if (typeof window.show === 'function') window.show('accountPage');
        return;
      }
      const uid = row.dataset.msUid;
      if (uid && window.CLINED_CHAT?.openWith) {
        window.CLINED_CHAT.openWith(uid);
      } else if (window.CLINED_SOCIAL?.openChat) {
        window.CLINED_SOCIAL.openChat();
      }
    });

    aside.addEventListener('input', e => {
      if (e.target.matches('[data-ms-search]')) {
        S.q = e.target.value || '';
        render();
      }
    });

    reopenBtn.addEventListener('click', () => setOpen(true));
  }

  function boot() {
    mountDom();
    applyOpenState();
    if (isLoggedIn() && tabletUpMq.matches) {
      loadMembers();
      if (S.open) startPoll();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  const onViewportChange = () => {
    if (!dockedMq.matches && S.open) S.open = false;
    applyOpenState();
    if (tabletUpMq.matches && isLoggedIn()) {
      loadMembers();
      if (S.open) startPoll();
      else stopPoll();
    } else {
      stopPoll();
    }
  };
  tabletUpMq.addEventListener?.('change', onViewportChange);
  dockedMq.addEventListener?.('change', onViewportChange);

  window.addEventListener('clined:auth-ready', () => {
    applyOpenState();
    if (tabletUpMq.matches) { loadMembers(); if (S.open) startPoll(); }
  });
  window.addEventListener('clined:auth-logout', () => {
    S.users = null;
    S.lastHtml = '';
    stopPoll();
    applyOpenState();
  });
  window.addEventListener('clined:profile-style', () => { if (S.open && tabletUpMq.matches) render(); });
  window.addEventListener('clined:chat-unread', () => { if (tabletUpMq.matches && isLoggedIn()) loadMembers(); });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && S.open && tabletUpMq.matches && isLoggedIn()) loadMembers();
  });

  window.CLINED_MEMBER_SIDEBAR = { refresh: loadMembers, setOpen };
})();
