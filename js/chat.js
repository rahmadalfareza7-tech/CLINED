/* CLINED — Chat (tab di Sosial). Pesan hilang otomatis setelah 48 jam. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = (m, e) => window.showToast?.(m, !!e);
  const C = { pending: null, users: null, q: '', peer: null, thread: null, host: null, unread: 0, timer: null, busy: false };
  const BADGE = { admin: ['👑', 'Admin'], helper: ['🛠️', 'Helper'], mentor: ['🙋', 'Tempat bertanya'] };
  const initials = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase() || '?';
  const HUES = [[28,176,246,124,92,255],[255,150,0,255,75,75],[88,204,2,0,180,150],[255,99,160,160,90,255],[0,184,217,60,100,230],[255,196,0,255,120,0]];
  const hue = n => { let h = 0; for (const c of String(n || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0; const x = HUES[h % HUES.length]; return `background:linear-gradient(135deg,rgb(${x[0]},${x[1]},${x[2]}),rgb(${x[3]},${x[4]},${x[5]}))`; };
  const av = (p, cls = '') => `<span class="soc-av ${cls}${p.online ? ' on' : ''}" style="${hue(p.name)}" aria-hidden="true">${esc(initials(p.name))}</span>`;
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
  const setDot = n => { C.unread = n; document.querySelectorAll('[data-chat-dot]').forEach(d => { d.textContent = n > 9 ? '9+' : n; d.hidden = !n; }); try { window.CLINED_CHAT.unread = n; window.dispatchEvent(new Event('clined:chat-unread')); } catch {} };

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
  const group = u => (u.badges?.length ? 0 : u.friend === 'accepted' ? 1 : 2);
  const GT = ['Admin, Helper & Tempat bertanya', 'Teman', 'Pengguna lain'];
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
        onlineStats = d;
        if (C.host?.isConnected && !C.peer && !document.hidden) render();
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
    return `<div class="chat-row${u.canChat ? ' open' : ''}${u.unread ? ' has-unread' : ''}" ${u.canChat ? `data-chat-open="${esc(u.id)}" role="button" tabindex="0"` : ''}>${av(u)}
      <div class="chat-who"><div class="chat-who-top"><b>${esc(u.name)}</b>${badges(u)}</div><small>${sub}</small></div>
      <div class="chat-meta">${meta}</div></div>`;
  }
  function listHTML() {
    const q = C.q.trim().toLowerCase();
    const all = (C.users || []).filter(u => !q || u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q));
    let html = '';
    [0, 1, 2].forEach(g => { const rows = all.filter(u => group(u) === g); if (rows.length) html += `<div class="chat-grp"><h4>${GT[g]} <small>${rows.length}</small>${g === 2 ? onlineBadge() : ''}</h4>${rows.map(rowHTML).join('')}</div>`; });
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
    return `<div class="card soc-card chat-card chat-thread"><div class="chat-head"><button type="button" class="chat-back" data-chat-back aria-label="Kembali">‹</button>${av(p)}<div class="chat-who"><div class="chat-who-top"><b>${esc(p.name)}</b>${badges(p)}</div><small>@${esc(p.username)}${p.online ? ' • online' : ''}</small></div></div>
      <div class="chat-ttl">🕒 Pesan hilang otomatis setelah 48 jam</div>
      <div class="chat-msgs" id="chatMsgs">${T ? (msgs || '<div class="chat-empty"><span>👋</span><b>Belum ada pesan</b><small>Sapa duluan!</small></div>') : '<p class="soc-empty">Memuat…</p>'}</div>
      ${can ? `<div class="chat-compose"><textarea id="chatInput" rows="1" maxlength="1000" placeholder="Tulis pesan…" aria-label="Pesan"></textarea><button type="button" class="chat-send" data-chat-send aria-label="Kirim" disabled>➤</button></div>` : '<p class="chat-locked">Tambahkan sebagai teman dulu untuk membalas.</p>'}</div>`;
  }
  async function loadThread(first) {
    if (!C.peer) return;
    const d = await api('/api/chat/messages?with=' + encodeURIComponent(C.peer.id));
    const prev = C.thread?.messages?.length || 0;
    C.peer = { ...C.peer, ...d.peer }; C.thread = d;
    if (first || d.messages.length !== prev) { render(); scrollEnd(); }
  }
  const scrollEnd = () => { const m = $('chatMsgs'); if (m) m.scrollTop = m.scrollHeight; };
  function startPoll() { stopPoll(); C.timer = setInterval(() => { if (document.hidden || !C.host?.isConnected) return; (C.peer ? loadThread(false) : loadUsers().then(() => { if (!document.activeElement?.matches?.('[data-chat-q]')) render(); })).catch(() => {}); }, 6000); }
  function stopPoll() { clearInterval(C.timer); C.timer = null; }

  function render() {
    if (!C.host) return;
    const keepQ = document.activeElement?.matches?.('[data-chat-q]'), inp = $('chatInput')?.value;
    C.host.innerHTML = C.peer ? threadHTML() : listHTML();
    if (C.peer) { const i = $('chatInput'); if (i && inp) { i.value = inp; const b = document.querySelector('[data-chat-send]'); if (b) b.disabled = !inp.trim(); } scrollEnd(); }
    else if (keepQ) { const e = C.host.querySelector('[data-chat-q]'); e?.focus(); e?.setSelectionRange(e.value.length, e.value.length); }
  }
  async function mount(host) {
    C.host = host; C.peer = null; C.thread = null;
    render();
    try { await Promise.all([loadUsers(), pushState()]); } catch (e) { host.innerHTML = `<p class="soc-empty">${esc(e.message)}</p>`; return; }
    render(); startPoll(); startOnlinePoll();
    if (C.pending) { const id = C.pending; C.pending = null; openPeer(id); }
  }
  async function openPeer(id) {
    const u = (C.users || []).find(x => x.id === id); if (!u) return;
    C.peer = u; C.thread = null; render();
    try { await loadThread(true); loadUsers().catch(() => {}); } catch (e) { toast(e.message, true); C.peer = null; render(); }
  }
  async function send() {
    const i = $('chatInput'); if (!i || C.busy) return;
    const text = i.value.trim(); if (!text) return;
    C.busy = true;
    try {
      const d = await api('/api/chat/send', { method: 'POST', body: { to: C.peer.id, text } });
      i.value = ''; C.thread.messages.push(d.message); render(); scrollEnd(); $('chatInput')?.focus();
    } catch (e) { toast(e.message, true); } finally { C.busy = false; }
  }

  document.addEventListener('click', async e => {
    const t = e.target.closest('[data-chat-open],[data-chat-back],[data-chat-send],[data-chat-add],[data-chat-accept],[data-chat-push]'); if (!t) return;
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
  /* Dipanggil social.js saat event SSE 'chat' tiba */
  function onPush(m) {
    const here = document.querySelector('.view.active')?.id === 'hubPage' && C.host?.isConnected;
    if (here && C.peer && C.peer.id === m.from?.id) { loadThread(false).catch(() => {}); return; }
    toast(`💬 ${m.from?.name || 'Seseorang'}: ${m.text || 'pesan baru'}`);
    setDot(C.unread + 1);
    if (here && !C.peer) loadUsers().then(render).catch(() => {});
  }
  async function refreshDot() { try { setDot((await api('/api/chat/unread')).unread || 0); } catch {} }
  function deepLink(id) {
    if (!/^[0-9a-f-]{36}$/i.test(String(id || ''))) return;
    let n = 0;
    const t = setInterval(() => {
      if (++n > 40) return clearInterval(t);
      if (typeof authCurrentUser === 'function' && !authCurrentUser()) return;
      if (!window.CLINED_SOCIAL) return;
      clearInterval(t);
      C.pending = id; C.peer = null; window.CLINED_SOCIAL.openChat();
    }, 500);
  }
  navigator.serviceWorker?.addEventListener?.('message', e => { if (e.data?.type === 'open-chat') deepLink(e.data.id); });
  try { const q = new URLSearchParams(location.search).get('chat'); if (q) { deepLink(q); history.replaceState(null, '', location.pathname + location.hash); } } catch {}
  window.CLINED_CHAT = { unread: 0, mount, stop: () => { stopPoll(); stopOnlinePoll(); C.peer = null; C.thread = null; }, onPush, refreshDot };
})();
