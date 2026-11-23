/* CLINED — Chat (tab di Sosial). Pesan hilang otomatis setelah 48 jam. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = (m, e) => window.showToast?.(m, !!e);
  const C = { pending: null, users: null, q: '', peer: null, thread: null, host: null, unread: 0, timer: null, busy: false, lastHtml: '' };
  const BADGE = { admin: ['👑', 'Admin'], helper: ['🛠️', 'Helper'], mentor: ['🙋', 'Tempat bertanya'] };
  const initials = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase() || '?';
  const HUES = [[28,176,246,124,92,255],[255,150,0,255,75,75],[88,204,2,0,180,150],[255,99,160,160,90,255],[0,184,217,60,100,230],[255,196,0,255,120,0]];
  const hue = n => { let h = 0; for (const c of String(n || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0; const x = HUES[h % HUES.length]; return `background:linear-gradient(135deg,rgb(${x[0]},${x[1]},${x[2]}),rgb(${x[3]},${x[4]},${x[5]}))`; };
  const av = (p, cls = '') => `<span class="soc-av ${cls}${p.online ? ' on' : ''}${p.avatarDeco ? ' has-deco' : ''}" style="${p.avatarUrl ? '' : hue(p.name)}" aria-hidden="true">${p.avatarUrl ? `<img class="soc-av-img" src="${esc(p.avatarUrl)}" alt="">` : esc(initials(p.name))}${p.avatarDeco ? `<img class="avatar-deco-img" src="${esc(p.avatarDeco)}" alt="">` : ''}</span>`;
  const ago = t => { if (!t) return ''; const m = Math.round((Date.now() - t) / 6e4); return m < 1 ? 'baru' : m < 60 ? m + ' mnt' : m < 1440 ? Math.floor(m / 60) + ' jam' : Math.floor(m / 1440) + ' hr'; };
  const badges = p => (p.badges || []).map(b => `<em class="chat-badge b-${b}">${BADGE[b][0]} ${BADGE[b][1]}</em>`).join('');
  const clock = t => new Date(t).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const dayLbl = t => { const d = new Date(t), n = new Date(); return d.toDateString() === n.toDateString() ? 'Hari ini' : new Date(n - 864e5).toDateString() === d.toDateString() ? 'Kemarin' : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }); };
  async function api(url, opt = {}) {
    const r = await fetch(url, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...opt, body: opt.body ? JSON.stringify(opt.body) : undefined });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(d.error || `Permintaan gagal (${r.status}).`), { status: r.status });
    return d;
  }
  const setDot = n => {
    const count = Math.max(0, Number(n) || 0);
    C.unread = count;
    document.querySelectorAll('[data-chat-dot]').forEach(d => {
      d.textContent = count > 9 ? '9+' : String(count);
      d.hidden = !count;
    });
    const chatNavBtn = document.querySelector('#floatingDashboardNav .floating-nav-item[data-floating-nav="chat"]');
    if (chatNavBtn) {
      chatNavBtn.classList.toggle('has-unread', count > 0);
      chatNavBtn.setAttribute('aria-label', count > 0 ? `Chat (${count} pesan belum terbaca)` : 'Chat');
    }
    try { window.CLINED_CHAT.unread = count; window.dispatchEvent(new Event('clined:chat-unread')); } catch {}
  };

  /* ───────── notifikasi HP (Web Push) ───────── */
  const PUSH = { supported: 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window, key: undefined, on: false, busy: false };
  const iosNeedsInstall = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !(navigator.standalone || matchMedia('(display-mode: standalone)').matches);
  const u8 = b64 => Uint8Array.from(atob(b64.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(b64.length / 4) * 4, '=')), c => c.charCodeAt(0));
  async function pushState() {
    if (!PUSH.supported) return;
    try {
      if (PUSH.key === undefined) PUSH.key = (await api('/api/chat/push/key')).key || null;
      const reg = await navigator.serviceWorker.getRegistration();
      PUSH.on = !!(reg && await reg.pushManager.getSubscription()) && Notification.permission === 'granted';
    } catch { PUSH.key = PUSH.key ?? null; }
  }
  async function pushToggle(want) {
    if (PUSH.busy) return; PUSH.busy = true; render();
    try {
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (want) {
        if (Notification.permission === 'denied') throw new Error('Notifikasi diblokir di pengaturan browser/HP.');
        if (await Notification.requestPermission() !== 'granted') throw new Error('Izin notifikasi tidak diberikan.');
        if (!PUSH.key) throw new Error('Notifikasi belum diaktifkan di server.');
        sub = sub || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: u8(PUSH.key) });
        await api('/api/chat/push/subscribe', { method: 'POST', body: sub.toJSON() });
        PUSH.on = true; toast('Notifikasi chat aktif 🔔');
      } else {
        if (sub) { await api('/api/chat/push/unsubscribe', { method: 'POST', body: { endpoint: sub.endpoint } }).catch(() => {}); await sub.unsubscribe(); }
        PUSH.on = false; toast('Notifikasi chat dimatikan');
      }
    } catch (e) { toast(e.message || 'Gagal mengatur notifikasi.', true); }
    PUSH.busy = false; render();
  }
  const pushShown = () => PUSH.supported && PUSH.key;
  const bellHTML = () => pushShown() ? `<button type="button" class="chat-bell${PUSH.on ? ' on' : ''}" data-chat-push="${PUSH.on ? 'off' : 'on'}" ${PUSH.busy ? 'disabled' : ''} aria-label="${PUSH.on ? 'Matikan' : 'Aktifkan'} notifikasi chat" title="Notifikasi chat">${PUSH.on ? '🔔' : '🔕'}</button>` : '';
  const pushNoteHTML = () => {
    if (!PUSH.supported && iosNeedsInstall()) return '<div class="chat-pushnote">📲 Untuk notifikasi di iPhone: Bagikan → Tambah ke Layar Utama, lalu buka dari ikon CLINED.</div>';
    if (!pushShown() || PUSH.on || localStorage.getItem('clined_push_dismiss') === '1') return '';
    return '<div class="chat-pushnote">🔔 Aktifkan notifikasi supaya pesan masuk muncul di HP walau app ditutup.<button type="button" data-chat-push="on">Aktifkan</button></div>';
  };

  /* ───────── daftar pengguna ───────── */
  const hasChat = u => (u.unread || 0) > 0 || (u.lastAt || 0) > 0;
  const group = u => (hasChat(u) ? 0 : u.badges?.length ? 1 : u.friend === 'accepted' ? 2 : 3);
  const GT = ['💬 Percakapan Terbaru', 'Admin, Helper & Tempat bertanya', 'Teman', 'Pengguna lain'];
  const sortRecent = (a, b) =>
    (((b.unread || 0) > 0 ? 1 : 0) - ((a.unread || 0) > 0 ? 1 : 0))
    || ((b.lastAt || 0) - (a.lastAt || 0))
    || String(a.name || '').localeCompare(String(b.name || ''), 'id');
  const isAdmin = () => {
    try { return typeof authCurrentUser === 'function' && authCurrentUser()?.role === 'admin'; }
    catch { return false; }
  };
  let onlineStats = null;
  let onlineTimer = null;
  async function loadOnlineStats() {
    if (!isAdmin()) return;
    try {
      const r = await fetch('/api/admin/online-stats', { credentials: 'same-origin' });
      const d = await r.json();
      if (r.ok && d.ok) {
        const prev = onlineStats?.accounts;
        onlineStats = d;
        if (C.host?.isConnected && !C.peer && !document.hidden && prev !== d.accounts) {
          const badge = C.host.querySelector('.chat-online-total');
          if (badge) badge.textContent = `${d.accounts} online`;
          else render();
        }
      }
    } catch {}
  }
  function startOnlinePoll() {
    stopOnlinePoll();
    if (!isAdmin()) return;
    loadOnlineStats();
    onlineTimer = setInterval(() => {
      if (!document.hidden && C.host?.isConnected) loadOnlineStats();
    }, 15000);
  }
  function stopOnlinePoll() {
    if (onlineTimer) clearInterval(onlineTimer);
    onlineTimer = null;
  }
  const onlineBadge = () => isAdmin() && onlineStats
    ? ` <span class="chat-online-total" title="Akun dengan koneksi aktif">${onlineStats.accounts} online</span>`
    : '';

  function rowHTML(u) {
    const act = u.canChat ? '' : u.friend === 'outgoing' ? '<span class="chat-wait">⏳ Menunggu</span>'
      : u.friend === 'incoming' ? `<button type="button" class="primary chat-mini" data-chat-accept="${esc(u.username)}">Terima</button>`
      : `<button type="button" class="secondary chat-mini" data-chat-add="${esc(u.username)}">➕ Teman</button>`;
    const sub = u.lastText ? esc(u.lastText) : `@${esc(u.username)}${u.online ? ' • online' : ''}`;
    const meta = (u.lastAt ? `<time>${ago(u.lastAt)}</time>` : '') + (u.unread ? `<i class="soc-dot inline">${u.unread > 9 ? '9+' : u.unread}</i>` : '') + act;
    const banner = u.bannerUrl ? `<span class="chat-row-bg" style="background-image:url('${esc(u.bannerUrl)}')" aria-hidden="true"></span>` : '';
    const nc = u.nameColor ? ` data-name-color="${esc(u.nameColor)}"` : '';
    const xp100 = u.xp100k ? '<em class="chat-badge b-xp100k" title="Pencapaian 100.000 All-Time XP">⚜️ 100K Legend</em>' : '';
    const champs = window.CLINED_CHAMPIONS?.renderBadges?.(u.championBlocks, { compact: true, max: 2 }) || '';
    return `<div class="chat-row${u.canChat ? ' open' : ''}${u.unread ? ' has-unread' : ''}${u.bannerUrl ? ' has-banner' : ''}" ${u.canChat ? `data-chat-open="${esc(u.id)}" role="button" tabindex="0"` : ''}>${banner}${av(u)}
      <div class="chat-who"><div class="chat-who-top"><b${nc}>${esc(u.name)}</b>${xp100}${champs}${badges(u)}</div><small>${sub}</small></div>
      <div class="chat-meta">${meta}</div></div>`;
  }
  function selfCardHTML() {
    let me = null;
    try { me = typeof authCurrentUser === 'function' ? authCurrentUser() : null; } catch {}
    if (!me) return '';
    const meBadges = [];
    if (me.role === 'admin') meBadges.push('admin');
    else if (me.role === 'helper') meBadges.push('helper');
    if (me.isMentor) meBadges.push('mentor');
    const selfOnline = window.CLINED_SOCIAL?.isStreamOnline ? window.CLINED_SOCIAL.isStreamOnline() : navigator.onLine !== false;
    let localXp = 0;
    try { localXp = Number(JSON.parse(localStorage.getItem('gaster_v11_xp') || '0')) || 0; } catch {}
    const has100k = typeof me.xp100k === 'boolean' ? me.xp100k : localXp >= 100000;
    const u = { ...me, online: selfOnline, badges: meBadges, xp100k: has100k };
    const banner = u.bannerUrl ? `<span class="chat-row-bg" style="background-image:url('${esc(u.bannerUrl)}')" aria-hidden="true"></span>` : '';
    const nc = u.nameColor ? ` data-name-color="${esc(u.nameColor)}"` : '';
    const xp100 = u.xp100k ? '<em class="chat-badge b-xp100k" title="Pencapaian 100.000 All-Time XP">⚜️ 100K Legend</em>' : '';
    const champs = window.CLINED_CHAMPIONS?.renderBadges?.(u.championBlocks, { compact: true, max: 3 }) || '';
    return `<div class="chat-grp"><h4>Profil Kamu</h4><div class="chat-row chat-self${u.bannerUrl ? ' has-banner' : ''}">${banner}${av(u)}
      <div class="chat-who"><div class="chat-who-top"><b${nc}>${esc(u.name)}</b>${xp100}${champs}${badges(u)}</div><small>@${esc(u.username)} • tampil di chat</small></div>
      <div class="chat-meta"><button type="button" class="secondary chat-mini" data-chat-shop>🎨 Atur</button></div></div></div>`;
  }
  function listHTML() {
    const q = C.q.trim().toLowerCase();
    const all = (C.users || []).filter(u => !q || u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q));
    const recent = all.filter(u => group(u) === 0).sort(sortRecent);
    let html = '';
    if (recent.length) html += `<div class="chat-grp"><h4>${GT[0]} <small>${recent.length}</small></h4>${recent.map(rowHTML).join('')}</div>`;
    if (!q) html += selfCardHTML();
    [1, 2, 3].forEach(g => { const rows = all.filter(u => group(u) === g); if (rows.length) html += `<div class="chat-grp"><h4>${GT[g]} <small>${rows.length}</small>${g === 3 ? onlineBadge() : ''}</h4>${rows.map(rowHTML).join('')}</div>`; });
    return `<div class="card soc-card chat-card"><div class="chat-hero"><span class="chat-hero-ico">💬</span><div><h3>Chat</h3><p>Tanya soal ke Admin, Helper & Tempat bertanya, atau ngobrol dengan teman.</p></div>${bellHTML()}</div>
      <div class="chat-pad">${pushNoteHTML()}
      <div class="chat-searchbox"><input type="search" class="chat-search" data-chat-q placeholder="Cari nama atau username…" value="${esc(C.q)}" aria-label="Cari pengguna" autocomplete="off"></div>
      <div class="chat-list">${C.users == null ? '<p class="soc-empty">Memuat…</p>' : html || '<div class="chat-empty"><span>🫥</span><b>Tidak ada pengguna</b><small>Coba kata kunci lain.</small></div>'}</div>
      <p class="chat-hint">🕒 Pesan hilang otomatis setelah 48 jam. Chat dengan teman perlu saling berteman.</p></div></div>`;
  }
  async function loadUsers() {
    const d = await api('/api/chat/users'); C.users = d.users || []; setDot(d.unread || 0);
  }

  /* ───────── percakapan ───────── */
  function threadHTML() {
    const T = C.thread, p = C.peer;
    let last = '', prev = null;
    const msgs = (T?.messages || []).map(m => {
      const d = dayLbl(m.at), newDay = d !== last; last = d;
      const cont = !newDay && prev && prev.mine === m.mine && m.at - prev.at < 3 * 6e4, gap = !newDay && prev && !cont;
      prev = m;
      return `${newDay ? `<div class="chat-day">${d}</div>` : ''}<div class="chat-msg ${m.mine ? 'me' : 'them'}${cont ? ' cont' : ''}${gap ? ' gap' : ''}"><p>${esc(m.text)}</p><small>${clock(m.at)}</small></div>`;
    }).join('');
    const can = T ? T.canChat : false;
    const headBg = p.bannerUrl ? `<span class="chat-row-bg" style="background-image:url('${esc(p.bannerUrl)}')" aria-hidden="true"></span>` : '';
    const nc = p.nameColor ? ` data-name-color="${esc(p.nameColor)}"` : '';
    const xp100 = p.xp100k ? '<em class="chat-badge b-xp100k" title="Pencapaian 100.000 All-Time XP">⚜️ 100K Legend</em>' : '';
    const champs = window.CLINED_CHAMPIONS?.renderBadges?.(p.championBlocks, { compact: true, max: 3 }) || '';
    return `<div class="card soc-card chat-card chat-thread"><div class="chat-head${p.bannerUrl ? ' has-banner' : ''}">${headBg}<button type="button" class="chat-back" data-chat-back aria-label="Kembali">‹</button>${av(p)}<div class="chat-who"><div class="chat-who-top"><b${nc}>${esc(p.name)}</b>${xp100}${champs}${badges(p)}</div><small>@${esc(p.username)}${p.online ? ' • online' : ''}</small></div></div>
      <div class="chat-ttl">🕒 Pesan hilang otomatis setelah 48 jam</div>
      <div class="chat-msgs" id="chatMsgs">${T ? (msgs || '<div class="chat-empty"><span>👋</span><b>Belum ada pesan</b><small>Sapa duluan!</small></div>') : '<p class="soc-empty">Memuat…</p>'}</div>
      ${can ? `<div class="chat-compose"><textarea id="chatInput" rows="1" maxlength="1000" placeholder="Tulis pesan…" aria-label="Pesan"></textarea><button type="button" class="chat-send" data-chat-send aria-label="Kirim" disabled>➤</button></div>` : '<p class="chat-locked">Tambahkan sebagai teman dulu untuk membalas.</p>'}</div>`;
  }
  async function loadThread(first) {
    if (!C.peer) return;
    const d = await api('/api/chat/messages?with=' + encodeURIComponent(C.peer.id));
    const prev = C.thread?.messages?.length || 0;
    const prevOnline = !!C.peer?.online;
    C.peer = { ...C.peer, ...d.peer }; C.thread = d;
    if (first || d.messages.length !== prev) { render(); scrollEnd(); }
    else if (!!C.peer.online !== prevOnline && C.host?.isConnected) {
      const headAv = C.host.querySelector('.chat-head .soc-av');
      const headSub = C.host.querySelector('.chat-head .chat-who > small');
      if (headAv) headAv.classList.toggle('on', !!C.peer.online);
      if (headSub) headSub.textContent = `@${C.peer.username}${C.peer.online ? ' • online' : ''}`;
    }
  }
  const scrollEnd = () => { const m = $('chatMsgs'); if (m) m.scrollTop = m.scrollHeight; };
  function startPoll() { stopPoll(); C.timer = setInterval(() => { if (document.hidden || !C.host?.isConnected) return; (C.peer ? loadThread(false) : loadUsers().then(() => { if (!document.activeElement?.matches?.('[data-chat-q]')) render(); })).catch(() => {}); }, 6000); }
  function stopPoll() { clearInterval(C.timer); C.timer = null; }

  function render() {
    if (!C.host) return;
    const nextHtml = C.peer ? threadHTML() : listHTML();
    if (nextHtml === C.lastHtml) return;
    C.lastHtml = nextHtml;
    const keepQ = document.activeElement?.matches?.('[data-chat-q]'), inp = $('chatInput')?.value;
    C.host.innerHTML = nextHtml;
    if (C.peer) { const i = $('chatInput'); if (i && inp) { i.value = inp; const b = document.querySelector('[data-chat-send]'); if (b) b.disabled = !inp.trim(); } scrollEnd(); }
    else if (keepQ) { const e = C.host.querySelector('[data-chat-q]'); e?.focus(); e?.setSelectionRange(e.value.length, e.value.length); }
  }
  async function mount(host) {
    C.host = host; C.peer = null; C.thread = null; C.lastHtml = '';
    render();
    try { await Promise.all([loadUsers(), pushState()]); } catch (e) { C.lastHtml = ''; host.innerHTML = `<p class="soc-empty">${esc(e.message)}</p>`; return; }
    render(); startPoll(); startOnlinePoll();
    if (C.pending) { const id = C.pending; C.pending = null; openPeer(id); }
  }
  async function openPeer(id) {
    const u = (C.users || []).find(x => x.id === id); if (!u) return;
    C.peer = u; C.thread = null; render();
    try {
      await loadThread(true);
      if (u.unread > 0) {
        const dec = u.unread;
        u.unread = 0;
        setDot(Math.max(0, C.unread - dec));
      }
      loadUsers().catch(() => {});
    } catch (e) { toast(e.message, true); C.peer = null; render(); }
  }
  async function send() {
    const i = $('chatInput'); if (!i || C.busy) return;
    const text = i.value.trim(); if (!text) return;
    C.busy = true;
    try {
      const d = await api('/api/chat/send', { method: 'POST', body: { to: C.peer.id, text } });
      i.value = ''; C.thread.messages.push(d.message);
      const u = (C.users || []).find(x => x.id === C.peer.id);
      if (u) { u.lastAt = d.message.at || Date.now(); u.lastText = 'Kamu: ' + text.slice(0, 60); }
      render(); scrollEnd(); $('chatInput')?.focus();
    } catch (e) { toast(e.message, true); } finally { C.busy = false; }
  }

  document.addEventListener('click', async e => {
    const t = e.target.closest('[data-chat-open],[data-chat-back],[data-chat-send],[data-chat-add],[data-chat-accept],[data-chat-push],[data-chat-shop]'); if (!t) return;
    if (t.matches('[data-chat-shop]')) return window.CLINED_CARD_SHOP?.show?.('banners');
    if (t.matches('[data-chat-push]')) return pushToggle(t.dataset.chatPush === 'on');
    if (t.matches('[data-chat-open]')) return openPeer(t.dataset.chatOpen);
    if (t.matches('[data-chat-back]')) { C.peer = null; C.thread = null; render(); loadUsers().then(render).catch(() => {}); return; }
    if (t.matches('[data-chat-send]')) return send();
    if (t.matches('[data-chat-add],[data-chat-accept]')) {
      t.disabled = true;
      try {
        const r = await api('/api/friends/request', { method: 'POST', body: { username: t.dataset.chatAdd || t.dataset.chatAccept } });
        toast(r.status === 'accepted' ? 'Sekarang berteman 🎉' : 'Permintaan teman dikirim');
        await loadUsers(); render();
      } catch (err) { t.disabled = false; toast(err.message, true); }
    }
  });
  document.addEventListener('keydown', e => {
    if (e.target.id === 'chatInput' && e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); }
    if (e.key === 'Enter' && e.target.matches?.('[data-chat-open]')) openPeer(e.target.dataset.chatOpen);
  });
  document.addEventListener('input', e => {
    if (e.target.matches?.('[data-chat-q]')) { C.q = e.target.value; render(); }
    if (e.target.id === 'chatInput') { const b = document.querySelector('[data-chat-send]'); if (b) b.disabled = !e.target.value.trim(); e.target.style.height = 'auto'; e.target.style.height = Math.min(120, e.target.scrollHeight) + 'px'; }
  });
  /* ───────── Notif Balas Cepat (Quick Reply tanpa keluar halaman/kuis) ───────── */
  let qrTimer = null;
  function dismissQuickReply() {
    clearTimeout(qrTimer); qrTimer = null;
    const el = $('clinedChatQReply');
    if (!el) return;
    el.classList.remove('show');
    setTimeout(() => { if (el && !el.classList.contains('show')) el.remove(); }, 240);
  }
  function scheduleQuickReplyHide(ms = 8000) {
    clearTimeout(qrTimer);
    qrTimer = setTimeout(() => {
      const el = $('clinedChatQReply');
      const inp = el?.querySelector('.cqr-input');
      if (inp && (document.activeElement === inp || inp.value.trim())) return;
      dismissQuickReply();
    }, ms);
  }
  function showQuickReplyBanner(m) {
    const fromId = m?.from?.id || '';
    const fromName = m?.from?.name || 'Seseorang';
    const text = String(m?.text || 'pesan baru');
    if (!fromId) { toast(`💬 ${fromName}: ${text}`); return; }

    let el = $('clinedChatQReply');
    const samePeer = el && el.dataset.peerId === fromId;
    if (samePeer) {
      const msgEl = el.querySelector('.cqr-text');
      if (msgEl) msgEl.textContent = text;
      el.classList.add('show');
      scheduleQuickReplyHide(8000);
      return;
    }
    if (el) el.remove();

    const u = (C.users || []).find(x => x.id === fromId);
    const avHtml = u?.avatarUrl
      ? `<span class="cqr-av"><img src="${esc(u.avatarUrl)}" alt=""></span>`
      : `<span class="cqr-av" style="${hue(fromName)}">${esc(initials(fromName))}</span>`;

    el = document.createElement('div');
    el.id = 'clinedChatQReply';
    el.className = 'chat-qreply';
    el.dataset.peerId = fromId;
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.innerHTML = `<div class="cqr-top">
        ${avHtml}
        <div class="cqr-info">
          <div class="cqr-name"><b>${esc(fromName)}</b><span>Pesan baru</span></div>
          <p class="cqr-text">${esc(text)}</p>
        </div>
        <button type="button" class="cqr-close" aria-label="Tutup notifikasi">✕</button>
      </div>
      <form class="cqr-form" autocomplete="off">
        <input type="text" class="cqr-input" maxlength="1000" placeholder="Balas cepat ke ${esc(fromName)}…" aria-label="Balas cepat">
        <button type="submit" class="cqr-send" disabled aria-label="Kirim balasan">➤</button>
      </form>`;

    const form = el.querySelector('.cqr-form');
    const inp = el.querySelector('.cqr-input');
    const btn = el.querySelector('.cqr-send');
    const closeBtn = el.querySelector('.cqr-close');

    closeBtn.addEventListener('click', dismissQuickReply);
    inp.addEventListener('focus', () => clearTimeout(qrTimer));
    inp.addEventListener('blur', () => { if (!inp.value.trim()) scheduleQuickReplyHide(4500); });
    inp.addEventListener('input', () => {
      clearTimeout(qrTimer);
      btn.disabled = !inp.value.trim();
    });
    el.addEventListener('mouseenter', () => clearTimeout(qrTimer));
    el.addEventListener('mouseleave', () => { if (document.activeElement !== inp && !inp.value.trim()) scheduleQuickReplyHide(4500); });

    let sending = false;
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (sending) return;
      const reply = inp.value.trim();
      if (!reply) return;
      sending = true;
      btn.disabled = true;
      inp.disabled = true;
      try {
        const d = await api('/api/chat/send', { method: 'POST', body: { to: fromId, text: reply } });
        const peer = (C.users || []).find(x => x.id === fromId);
        if (peer) {
          peer.unread = 0;
          peer.lastAt = d.message?.at || Date.now();
          peer.lastText = 'Kamu: ' + reply.slice(0, 60);
        }
        refreshDot();
        dismissQuickReply();
        toast(`✓ Balasan terkirim ke ${fromName}`);
      } catch (err) {
        sending = false;
        inp.disabled = false;
        btn.disabled = !inp.value.trim();
        toast(err.message || 'Gagal mengirim balasan.', true);
      }
    });

    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    scheduleQuickReplyHide(8000);
  }

  /* ───────── Kotak Chat Melayang (Floating Chat Box tanpa pindah halaman) ───────── */
  const F = { el: null, peer: null, thread: null, minimized: false, unreadLocal: 0, busy: false, timer: null, lastKey: '' };

  function stopFloatPoll() { clearInterval(F.timer); F.timer = null; }
  function startFloatPoll() {
    stopFloatPoll();
    F.timer = setInterval(() => {
      if (document.hidden || !F.el || !F.peer || F.minimized) return;
      loadFloatThread(false).catch(() => {});
    }, 6000);
  }

  function closeFloating() {
    stopFloatPoll();
    if (F.el) {
      const box = F.el;
      F.el = null;
      box.classList.remove('open');
      setTimeout(() => box.remove(), 200);
    }
    F.peer = null;
    F.thread = null;
    F.minimized = false;
    F.unreadLocal = 0;
    F.lastKey = '';
  }

  function floatMsgsHtml(list) {
    if (!list) return '<div class="cf-loading">Memuat percakapan…</div>';
    if (!list.length) return '<div class="chat-empty"><span>👋</span><b>Belum ada pesan</b><small>Sapa duluan!</small></div>';
    let last = '', prev = null;
    return list.map(m => {
      const d = dayLbl(m.at), newDay = d !== last; last = d;
      const cont = !newDay && prev && prev.mine === m.mine && m.at - prev.at < 3 * 6e4;
      const gap = !newDay && prev && !cont;
      prev = m;
      return `${newDay ? `<div class="chat-day">${d}</div>` : ''}<div class="chat-msg ${m.mine ? 'me' : 'them'}${cont ? ' cont' : ''}${gap ? ' gap' : ''}"><p>${esc(m.text)}</p><small>${clock(m.at)}</small></div>`;
    }).join('');
  }

  function renderFloatHeader() {
    if (!F.el || !F.peer) return;
    const p = F.peer;
    const head = F.el.querySelector('[data-fc-head]');
    if (!head) return;
    head.classList.toggle('has-banner', !!p.bannerUrl);
    const bg = p.bannerUrl ? `<span class="chat-row-bg" style="background-image:url('${esc(p.bannerUrl)}')" aria-hidden="true"></span>` : '';
    const nc = p.nameColor ? ` data-name-color="${esc(p.nameColor)}"` : '';
    const xp100 = p.xp100k ? '<em class="chat-badge b-xp100k compact" title="Pencapaian 100.000 All-Time XP">⚜️ 100K</em>' : '';
    const minUnread = (F.minimized && F.unreadLocal > 0) ? `<span class="cf-min-badge">${F.unreadLocal > 9 ? '9+' : F.unreadLocal}</span>` : '';
    head.innerHTML = `${bg}${av(p)}
      <div class="cf-who">
        <div class="cf-who-top"><b${nc}>${esc(p.name || p.username || 'Member')}</b>${xp100}${badges(p)}</div>
        <small>@${esc(p.username || '')}${p.online ? ' • online' : ' • offline'}</small>
      </div>
      ${minUnread}
      <div class="cf-acts">
        <button type="button" class="cf-act" data-fc-expand title="Buka halaman Chat penuh" aria-label="Buka halaman Chat penuh">↗</button>
        <button type="button" class="cf-act" data-fc-min title="${F.minimized ? 'Perbesar chat' : 'Perkecil chat'}" aria-label="${F.minimized ? 'Perbesar chat' : 'Perkecil chat'}">${F.minimized ? '▢' : '—'}</button>
        <button type="button" class="cf-act" data-fc-close title="Tutup chat" aria-label="Tutup chat">✕</button>
      </div>`;
  }

  function renderFloatFooter() {
    if (!F.el || !F.peer) return;
    const foot = F.el.querySelector('[data-fc-foot]');
    if (!foot) return;
    if (!F.thread) {
      foot.innerHTML = '<div class="cf-locked">Menyiapkan ruang chat…</div>';
      return;
    }
    if (F.thread.canChat) {
      if (foot.querySelector('#floatChatInput')) return;
      foot.innerHTML = `<div class="cf-compose">
        <textarea id="floatChatInput" rows="1" maxlength="1000" placeholder="Tulis pesan…" aria-label="Tulis pesan"></textarea>
        <button type="button" class="cf-send" data-fc-send aria-label="Kirim pesan" disabled>➤</button>
      </div>`;
      return;
    }
    const fr = F.peer.friend;
    if (fr?.state === 'pending' && fr?.dir === 'in') {
      foot.innerHTML = `<div class="cf-locked"><span>Ingin berteman denganmu</span><button type="button" class="cf-friend-btn" data-fc-friend="${esc(F.peer.username)}">✓ Terima Teman</button></div>`;
    } else if (fr?.state === 'pending') {
      foot.innerHTML = '<div class="cf-locked">⏳ Permintaan teman terkirim — tunggu diterima untuk mulai chat.</div>';
    } else {
      foot.innerHTML = `<div class="cf-locked"><span>Berteman dulu untuk membalas</span><button type="button" class="cf-friend-btn" data-fc-friend="${esc(F.peer.username)}">🤝 Tambah Teman</button></div>`;
    }
  }

  function scrollFloatEnd() {
    const m = F.el?.querySelector('[data-fc-msgs]');
    if (m) m.scrollTop = m.scrollHeight;
  }

  function renderFloatMsgs(forceScroll = false) {
    if (!F.el) return;
    const box = F.el.querySelector('[data-fc-msgs]');
    if (!box) return;
    const msgs = F.thread?.messages || null;
    const key = msgs ? `${msgs.length}:${msgs[msgs.length - 1]?.id || ''}` : 'loading';
    if (key === F.lastKey && !forceScroll) return;
    const nearBottom = forceScroll || (box.scrollHeight - box.scrollTop - box.clientHeight < 64);
    F.lastKey = key;
    box.innerHTML = floatMsgsHtml(msgs);
    if (nearBottom) scrollFloatEnd();
  }

  async function loadFloatThread(first = false) {
    if (!F.peer) return;
    const targetId = F.peer.id;
    const d = await api('/api/chat/messages?with=' + encodeURIComponent(targetId));
    if (!F.peer || F.peer.id !== targetId || !F.el) return;
    const prevOnline = !!F.peer.online;
    const prevBanner = F.peer.bannerUrl || '';
    const hadThread = !!F.thread;
    F.peer = { ...F.peer, ...d.peer };
    F.thread = d;
    if (first || !hadThread || prevOnline !== !!F.peer.online || prevBanner !== (F.peer.bannerUrl || '')) {
      renderFloatHeader();
    }
    renderFloatMsgs(first);
    renderFloatFooter();
    if (first) {
      F.unreadLocal = 0;
      const u = (C.users || []).find(x => x.id === targetId);
      if (u && u.unread > 0) {
        const dec = u.unread;
        u.unread = 0;
        setDot(Math.max(0, C.unread - dec));
      }
      refreshDot();
      if (!F.minimized && F.thread.canChat) {
        setTimeout(() => F.el?.querySelector('#floatChatInput')?.focus({ preventScroll: true }), 40);
      }
    }
  }

  async function sendFloat() {
    const inp = F.el?.querySelector('#floatChatInput');
    if (!inp || !F.peer || F.busy) return;
    const text = inp.value.trim();
    if (!text) return;
    F.busy = true;
    const btn = F.el?.querySelector('[data-fc-send]');
    if (btn) btn.disabled = true;
    try {
      const d = await api('/api/chat/send', { method: 'POST', body: { to: F.peer.id, text } });
      inp.value = '';
      inp.style.height = 'auto';
      if (!F.thread) F.thread = { canChat: true, messages: [] };
      F.thread.messages.push(d.message);
      const u = (C.users || []).find(x => x.id === F.peer.id);
      if (u) { u.lastAt = d.message.at || Date.now(); u.lastText = 'Kamu: ' + text.slice(0, 60); }
      renderFloatMsgs(true);
      inp.focus({ preventScroll: true });
    } catch (e) {
      toast(e.message || 'Gagal mengirim pesan.', true);
    } finally {
      F.busy = false;
      if (btn) btn.disabled = !inp.value.trim();
    }
  }

  function ensureFloatShell() {
    if (F.el && F.el.isConnected) return F.el;
    const el = document.createElement('aside');
    el.id = 'clinedFloatChat';
    el.className = 'chat-float';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Chat melayang');
    el.innerHTML = `<div class="cf-head" data-fc-head></div>
      <div class="cf-body" data-fc-body>
        <div class="cf-ttl">🕒 Pesan hilang otomatis setelah 48 jam</div>
        <div class="cf-msgs" data-fc-msgs></div>
        <div class="cf-foot" data-fc-foot></div>
      </div>`;
    el.addEventListener('click', async e => {
      if (e.target.closest('[data-fc-close]')) { closeFloating(); return; }
      if (e.target.closest('[data-fc-expand]')) {
        const pid = F.peer?.id;
        closeFloating();
        if (pid) deepLink(pid);
        return;
      }
      if (e.target.closest('[data-fc-min]')) {
        F.minimized = !F.minimized;
        el.classList.toggle('is-min', F.minimized);
        if (!F.minimized) {
          F.unreadLocal = 0;
          loadFloatThread(true).catch(() => {});
        }
        renderFloatHeader();
        return;
      }
      if (F.minimized && e.target.closest('[data-fc-head]')) {
        F.minimized = false;
        el.classList.remove('is-min');
        F.unreadLocal = 0;
        renderFloatHeader();
        loadFloatThread(true).catch(() => {});
        return;
      }
      if (e.target.closest('[data-fc-send]')) { sendFloat(); return; }
      const fBtn = e.target.closest('[data-fc-friend]');
      if (fBtn) {
        fBtn.disabled = true;
        try {
          const r = await api('/api/friends/request', { method: 'POST', body: { username: fBtn.dataset.fcFriend } });
          toast(r.status === 'accepted' ? 'Sekarang berteman 🎉' : 'Permintaan teman dikirim');
          await loadFloatThread(true);
        } catch (err) {
          fBtn.disabled = false;
          toast(err.message || 'Gagal mengirim permintaan teman.', true);
        }
      }
    });
    el.addEventListener('keydown', e => {
      if (e.key === 'Escape') { closeFloating(); return; }
      if (e.target.id === 'floatChatInput' && e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        sendFloat();
      }
    });
    el.addEventListener('input', e => {
      if (e.target.id === 'floatChatInput') {
        const b = el.querySelector('[data-fc-send]');
        if (b) b.disabled = !e.target.value.trim() || F.busy;
        e.target.style.height = 'auto';
        e.target.style.height = Math.min(96, e.target.scrollHeight) + 'px';
      }
    });
    document.body.appendChild(el);
    F.el = el;
    requestAnimationFrame(() => el.classList.add('open'));
    return el;
  }

  async function openFloating(uid, peerHint = null) {
    if (!/^[0-9a-f-]{36}$/i.test(String(uid || ''))) return;
    if (typeof authCurrentUser === 'function' && !authCurrentUser()) return;
    dismissQuickReply();
    const cached = (C.users || []).find(x => x.id === uid);
    const samePeer = F.peer && F.peer.id === uid && F.el?.isConnected;
    F.peer = { ...(cached || {}), ...(peerHint || {}), id: uid };
    F.minimized = false;
    F.unreadLocal = 0;
    if (!samePeer) {
      F.thread = null;
      F.lastKey = '';
    }
    const el = ensureFloatShell();
    el.classList.remove('is-min');
    renderFloatHeader();
    renderFloatMsgs(true);
    renderFloatFooter();
    startFloatPoll();
    try {
      await loadFloatThread(true);
    } catch (err) {
      toast(err.message || 'Gagal memuat percakapan.', true);
      if (!F.thread) closeFloating();
    }
  }

  /* Dipanggil social.js saat event SSE 'chat' tiba */
  function onPush(m) {
    const here = document.querySelector('.view.active')?.id === 'hubPage' && C.host?.isConnected;
    if (here && C.peer && C.peer.id === m.from?.id) { loadThread(false).catch(() => {}); return; }
    if (F.el?.isConnected && F.peer && F.peer.id === m.from?.id) {
      if (!F.minimized) {
        loadFloatThread(false).catch(() => {});
        return;
      }
      F.unreadLocal += 1;
      renderFloatHeader();
      setDot(C.unread + 1);
      return;
    }
    showQuickReplyBanner(m);
    setDot(C.unread + 1);
    const sender = (C.users || []).find(x => x.id === m.from?.id);
    if (sender) {
      sender.unread = (sender.unread || 0) + 1;
      sender.lastAt = Date.now();
      sender.lastText = String(m.text || 'pesan baru').slice(0, 60);
    }
    if (here && !C.peer) { render(); loadUsers().then(render).catch(() => {}); }
  }
  async function refreshDot() { try { setDot((await api('/api/chat/unread')).unread || 0); } catch {} }
  function deepLink(id) {
    if (!/^[0-9a-f-]{36}$/i.test(String(id || ''))) return;
    const go = () => {
      if (typeof authCurrentUser === 'function' && !authCurrentUser()) return false;
      if (!window.CLINED_SOCIAL) return false;
      C.pending = id; C.peer = null; window.CLINED_SOCIAL.openChat();
      return true;
    };
    if (go()) return;
    let n = 0;
    const t = setInterval(() => {
      if (++n > 40 || go()) clearInterval(t);
    }, 300);
  }
  navigator.serviceWorker?.addEventListener?.('message', e => { if (e.data?.type === 'open-chat') deepLink(e.data.id); });
  try { const q = new URLSearchParams(location.search).get('chat'); if (q) { deepLink(q); history.replaceState(null, '', location.pathname + location.hash); } } catch {}
  window.addEventListener('clined:profile-style', () => { if (C.host?.isConnected && !C.peer) render(); });
  window.addEventListener('clined:auth-ready', () => {
    if (typeof authCurrentUser === 'function' && authCurrentUser()) refreshDot();
    else { setDot(0); closeFloating(); }
  });
  window.addEventListener('clined:auth-logout', () => { setDot(0); closeFloating(); });
  window.addEventListener('online', () => {
    if (typeof authCurrentUser === 'function' && authCurrentUser()) refreshDot();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (F.el?.isConnected && F.peer && !F.minimized) loadFloatThread(false).catch(() => {});
    if (!C.host?.isConnected) {
      if (typeof authCurrentUser === 'function' && authCurrentUser()) refreshDot();
      return;
    }
    loadOnlineStats();
    (C.peer ? loadThread(false) : loadUsers().then(() => { if (!document.activeElement?.matches?.('[data-chat-q]')) render(); })).catch(() => {});
  });
  if (typeof authCurrentUser === 'function' && authCurrentUser()) refreshDot();
  window.CLINED_CHAT = { unread: 0, mount, stop: () => { stopPoll(); stopOnlinePoll(); C.peer = null; C.thread = null; }, onPush, refreshDot, openWith: deepLink, openFloating, closeFloating };
})();
