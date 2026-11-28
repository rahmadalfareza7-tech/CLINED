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
  const BLACK_FIRE_HTML = '<span class="clined-fire-aura" aria-hidden="true"><span class="clined-fire-ring-b"></span><span class="clined-fire-ring-a"></span><span class="clined-fire-rise r1"></span><span class="clined-fire-rise r2"></span></span>';

  function ensureBlackFireDefs() {
    if (document.getElementById('clinedBlackFireDefs') || !document.body) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = `<svg id="clinedBlackFireDefs" class="clined-fire-defs" aria-hidden="true"><defs><filter id="clined-black-fire-a" x="-20%" y="-65%" width="140%" height="230%" color-interpolation-filters="sRGB"><feTurbulence type="turbulence" baseFrequency="0.068 0.145" numOctaves="4" seed="4" result="turbA"><animate attributeName="baseFrequency" values="0.062 0.135;0.082 0.185;0.066 0.15;0.062 0.135" dur="1.7s" repeatCount="indefinite"/></feTurbulence><feDisplacementMap in="SourceGraphic" in2="turbA" scale="8.5" xChannelSelector="R" yChannelSelector="G"/></filter><filter id="clined-black-fire-b" x="-25%" y="-85%" width="150%" height="260%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.092 0.185" numOctaves="4" seed="11" result="turbB"><animate attributeName="baseFrequency" values="0.084 0.165;0.112 0.228;0.09 0.19;0.084 0.165" dur="1.25s" repeatCount="indefinite"/></feTurbulence><feDisplacementMap in="SourceGraphic" in2="turbB" scale="13" xChannelSelector="G" yChannelSelector="B" result="dispB"/><feOffset in="dispB" dx="0" dy="-1.5"/></filter></defs></svg>`;
    const svg = wrap.firstElementChild;
    if (svg) document.body.appendChild(svg);
  }
  window.clinedEnsureBlackFireDefs = ensureBlackFireDefs;

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
    if (me) {
      const idx = list.findIndex(x => x.id === me.id);
      if (idx >= 0) {
        list[idx] = { ...list[idx], bannerUrl: me.bannerUrl ?? list[idx].bannerUrl, nameColor: me.nameColor ?? list[idx].nameColor, avatarDeco: me.avatarDeco ?? list[idx].avatarDeco, xp100k: typeof me.xp100k === 'boolean' ? me.xp100k : list[idx].xp100k, championBlocks: Array.isArray(me.championBlocks) ? me.championBlocks : list[idx].championBlocks };
      } else {
        list.push({
          id: me.id,
          name: me.name || me.username || 'Kamu',
          username: me.username || '',
          avatarUrl: me.avatarUrl || '',
          bannerUrl: me.bannerUrl || '',
          nameColor: me.nameColor || '',
          avatarDeco: me.avatarDeco || '',
          xp100k: Boolean(me.xp100k),
          championBlocks: Array.isArray(me.championBlocks) ? me.championBlocks : [],
          badges: badgesForUser(me),
          online: true,
          isMe: true,
          unread: 0,
        });
      }
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
    const isAdminUser = badges.includes('admin') || u.role === 'admin';
    const hasBanner = !!u.bannerUrl;
    const bannerStyle = hasBanner ? ` style="background-image:url('${esc(u.bannerUrl)}')"` : '';
    const nc = u.nameColor ? ` data-name-color="${esc(u.nameColor)}"` : '';
    const roleTag = isAdminUser
      ? '<span class="ms-role-tag admin">Admin</span>'
      : badges.includes('helper')
        ? '<span class="ms-role-tag helper">Helper</span>'
        : badges.includes('mentor')
          ? '<span class="ms-role-tag mentor">Mentor</span>'
          : u.isMe
            ? '<span class="ms-role-tag me">Kamu</span>'
            : '';
    const xpBadge = u.xp100k ? '<span class="ms-xp100k" title="Pencapaian 100.000 All-Time XP">⚜️ 100K</span>' : '';
    const champBadge = window.CLINED_CHAMPIONS?.renderBadges?.(u.championBlocks, { compact: true, short: true, max: 1 }) || '';
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
    const title = u.isMe ? 'Buka profil kamu' : isAdmin() ? `Chat / Fitur Admin — ${u.name}` : `Chat dengan ${u.name}`;
    if (isAdminUser) ensureBlackFireDefs();
    const fireAuraHtml = isAdminUser ? BLACK_FIRE_HTML : '';

    return `<button type="button" class="ms-row${isAdminUser ? ' is-admin' : ''}${hasBanner ? ' has-banner' : ''}${u.online ? '' : ' is-offline'}" data-ms-uid="${esc(u.id)}" data-ms-me="${u.isMe ? '1' : '0'}" title="${esc(title)}"${bannerStyle}>
      ${fireAuraHtml}
      <span class="ms-av${u.online ? ' on' : ''}${u.avatarDeco ? ' has-deco' : ''}" style="${u.avatarUrl ? '' : `background:${hue(u.name)}`}">${avInner}${deco}</span>
      <span class="ms-meta">
        <span class="ms-name-line"><b class="ms-name"${nc}>${esc(u.name)}</b>${xpBadge}${champBadge}${roleTag}</span>
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

  function isAdmin() {
    const me = typeof window.authCurrentUser === 'function' ? window.authCurrentUser() : null;
    return me?.role === 'admin';
  }

  let popLayer = null;
  function closeAdminPopup() {
    if (popLayer) { popLayer.remove(); popLayer = null; }
  }

  function openDirectChat(uid, peerObj = null) {
    if (!dockedMq.matches) setOpen(false);
    const peer = peerObj || getMergedList().find(x => x.id === uid) || null;
    if (uid && window.CLINED_CHAT?.openFloating) {
      window.CLINED_CHAT.openFloating(uid, peer);
    } else if (uid && window.CLINED_CHAT?.openWith) {
      window.CLINED_CHAT.openWith(uid);
    } else if (window.CLINED_SOCIAL?.openChat) {
      window.CLINED_SOCIAL.openChat();
    }
  }

  function openAdminMemberPopup(u) {
    if (!isAdmin() || !u) return;
    closeAdminPopup();
    const badges = badgesForUser(u);
    const hasBanner = !!u.bannerUrl;
    const bannerStyle = hasBanner ? ` style="background-image:url('${esc(u.bannerUrl)}')"` : '';
    const nc = u.nameColor ? ` data-name-color="${esc(u.nameColor)}"` : '';
    const avInner = u.avatarUrl
      ? `<img class="ms-av-img" src="${esc(u.avatarUrl)}" alt="">`
      : esc(ini(u.name));
    const deco = u.avatarDeco ? `<img class="avatar-deco-img" src="${esc(u.avatarDeco)}" alt="">` : '';
    const isAdminUser = badges.includes('admin') || u.role === 'admin';
    const roleTag = isAdminUser
      ? '<span class="ms-role-tag admin">Admin</span>'
      : badges.includes('helper')
        ? '<span class="ms-role-tag helper">Helper</span>'
        : badges.includes('mentor')
          ? '<span class="ms-role-tag mentor">Mentor</span>'
          : '';
    const xpBadge = u.xp100k ? '<span class="ms-xp100k" title="Pencapaian 100.000 All-Time XP">⚜️ 100K Legend</span>' : '';
    const champBadges = window.CLINED_CHAMPIONS?.renderBadges?.(u.championBlocks, { compact: true }) || '';

    const layer = document.createElement('div');
    layer.className = 'ms-pop-layer';
    if (isAdminUser) ensureBlackFireDefs();
    const fireAuraHtml = isAdminUser ? BLACK_FIRE_HTML : '';
    layer.innerHTML = `
      <div class="ms-pop-card" role="dialog" aria-modal="true" aria-label="Aksi Member">
        <div class="ms-pop-hero${isAdminUser ? ' is-admin' : ''}${hasBanner ? ' has-banner' : ''}"${bannerStyle}>
          ${fireAuraHtml}
          <span class="ms-av${u.online ? ' on' : ''}${u.avatarDeco ? ' has-deco' : ''}" style="${u.avatarUrl ? '' : `background:${hue(u.name)}`}">${avInner}${deco}</span>
          <span class="ms-meta">
            <span class="ms-name-line"><b class="ms-name"${nc}>${esc(u.name)}</b>${xpBadge}${roleTag}</span>
            <span class="ms-sub">@${esc(u.username)} • ${u.online ? 'Online' : 'Offline'}</span>
            ${champBadges ? `<span class="ms-champ-row" style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">${champBadges}</span>` : ''}
          </span>
          <button type="button" class="ms-pop-close" data-msp-close aria-label="Tutup">✕</button>
        </div>
        <div class="ms-pop-body">
          <div class="ms-pop-choices">
            <button type="button" class="ms-pop-btn chat" data-msp-chat>💬 Chat</button>
            <button type="button" class="ms-pop-btn admin" data-msp-toggle-admin>🛡️ Fitur Admin</button>
          </div>
          <div class="ms-pop-admin-panel" data-msp-admin hidden>
            <div class="ms-pop-sec-lbl">💎 Tambah Diamond</div>
            <div class="ms-pop-presets">
              <button type="button" class="ms-pop-chip" data-msp-preset="50">+50</button>
              <button type="button" class="ms-pop-chip" data-msp-preset="100">+100</button>
              <button type="button" class="ms-pop-chip" data-msp-preset="250">+250</button>
              <button type="button" class="ms-pop-chip" data-msp-preset="500">+500</button>
              <button type="button" class="ms-pop-chip" data-msp-preset="1000">+1.000</button>
            </div>
            <form class="ms-pop-dia-row" data-msp-dia-form>
              <input type="number" class="ms-pop-input" data-msp-dia-input min="1" max="1000000" step="1" inputmode="numeric" placeholder="Nominal diamond…">
              <button type="submit" class="ms-pop-send-dia" data-msp-dia-submit>💎 Kirim</button>
            </form>
            <button type="button" class="ms-pop-reset-btn" data-msp-reset>🔑 Buat Kode Reset Password</button>
            <div class="ms-pop-reset-out" data-msp-reset-out hidden></div>
            <p class="ms-pop-status" data-msp-status role="status" hidden></p>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(layer);
    popLayer = layer;

    const statusEl = layer.querySelector('[data-msp-status]');
    const setStatus = (msg, bad = false) => {
      if (!statusEl) return;
      statusEl.textContent = msg || '';
      statusEl.className = 'ms-pop-status' + (msg ? (bad ? ' bad' : ' ok') : '');
      statusEl.hidden = !msg;
    };

    const onKey = e => { if (e.key === 'Escape') { closeAdminPopup(); document.removeEventListener('keydown', onKey); } };
    document.addEventListener('keydown', onKey);

    layer.addEventListener('click', async e => {
      if (e.target === layer || e.target.closest('[data-msp-close]')) {
        closeAdminPopup();
        document.removeEventListener('keydown', onKey);
        return;
      }
      if (e.target.closest('[data-msp-chat]')) {
        closeAdminPopup();
        document.removeEventListener('keydown', onKey);
        openDirectChat(u.id, u);
        return;
      }
      const toggleBtn = e.target.closest('[data-msp-toggle-admin]');
      if (toggleBtn) {
        const panel = layer.querySelector('[data-msp-admin]');
        const opening = panel.hidden;
        panel.hidden = !opening;
        toggleBtn.classList.toggle('on', opening);
        if (opening) layer.querySelector('[data-msp-dia-input]')?.focus();
        return;
      }
      const preset = e.target.closest('[data-msp-preset]');
      if (preset) {
        const inp = layer.querySelector('[data-msp-dia-input]');
        if (inp) { inp.value = preset.dataset.mspPreset; inp.focus(); }
        return;
      }
      const resetBtn = e.target.closest('[data-msp-reset]');
      if (resetBtn) {
        resetBtn.disabled = true;
        setStatus('');
        try {
          const res = await fetch(`/api/admin/users/${encodeURIComponent(u.id)}/reset-code`, {
            method: 'POST', credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
          });
          const d = await res.json().catch(() => ({}));
          if (!res.ok) throw Error(d.error || 'Gagal membuat kode reset.');
          const out = layer.querySelector('[data-msp-reset-out]');
          out.hidden = false;
          out.innerHTML = `<div class="ms-pop-reset-code">${esc(d.code)}</div><button type="button" class="ms-pop-chip" data-msp-copydm="${esc(d.code)}">📋 Salin Pesan DM</button>`;
          setStatus(`Kode reset untuk @${u.username} berlaku ${d.expiresMinutes || 30} menit.`);
        } catch (err) {
          setStatus(err.message || 'Gagal membuat kode reset.', true);
        } finally {
          resetBtn.disabled = false;
        }
        return;
      }
      const copyBtn = e.target.closest('[data-msp-copydm]');
      if (copyBtn) {
        const code = copyBtn.dataset.mspCopydm;
        const dm = `Halo ${u.name} (@${u.username}), ini kode reset password CLINED kamu:\n\n${code}\n\nMasukkan kode tersebut di menu "Lupa password?" pada halaman Login CLINED. Kode berlaku 30 menit dan hanya bisa dipakai 1 kali ya.`;
        try { await navigator.clipboard.writeText(dm); setStatus('Pesan DM disalin!'); }
        catch { setStatus('Gagal menyalin otomatis. Salin kode di atas secara manual.', true); }
      }
    });

    layer.querySelector('[data-msp-dia-form]')?.addEventListener('submit', async e => {
      e.preventDefault();
      const inp = layer.querySelector('[data-msp-dia-input]');
      const btn = layer.querySelector('[data-msp-dia-submit]');
      const amount = Math.floor(Number(inp?.value || 0));
      if (!Number.isSafeInteger(amount) || amount < 1 || amount > 1000000) {
        setStatus('Masukkan nominal diamond antara 1 – 1.000.000.', true);
        inp?.focus();
        return;
      }
      btn.disabled = true;
      btn.textContent = 'Mengirim…';
      setStatus('');
      try {
        const res = await fetch(`/api/admin/users/${encodeURIComponent(u.id)}/diamonds`, {
          method: 'POST', credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount })
        });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) throw Error(d.error || 'Gagal menambahkan diamond.');
        inp.value = '';
        setStatus(d.message || `Berhasil menambah +${amount.toLocaleString('id-ID')} 💎 untuk @${u.username}.`);
        if (typeof window.showToast === 'function') window.showToast(`+${amount.toLocaleString('id-ID')} 💎 dikirim ke @${u.username}`);
      } catch (err) {
        setStatus(err.message || 'Gagal menambahkan diamond.', true);
      } finally {
        btn.disabled = false;
        btn.textContent = '💎 Kirim';
      }
    });
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
      if (row.dataset.msMe === '1') {
        if (!dockedMq.matches) setOpen(false);
        if (typeof window.show === 'function') window.show('accountPage');
        return;
      }
      const uid = row.dataset.msUid;
      if (isAdmin()) {
        const target = getMergedList().find(x => x.id === uid);
        if (target) {
          openAdminMemberPopup(target);
          return;
        }
      }
      openDirectChat(uid);
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
    closeAdminPopup();
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
