/* CLINED — Teman & Duel. Realtime lewat Server-Sent Events (/api/stream). */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = (m, e) => window.showToast?.(m, !!e);
  const L5 = 'ABCDEF';
  const PREF = 'clined_duel_pref';
  const S = { tab: 'status', hubTab: 'status', openC: new Set(), comments: {}, feed: null, F: null, mine: [], invites: [], banks: [], bank: '', count: 10, sec: 30, D: null, fb: null, busy: false, tick: null, skew: 0, sentFor: -1 };
  const MOODS = [['mantap', '😎', 'Mantap'], ['lumayan', '🙂', 'Lumayan'], ['berat', '😵', 'Berat'], ['semangat', '🔥', 'Semangat'], ['doa', '🙏', 'Doa']];
  const REACTS = ['🔥', '👏', '💪', '😂', '❤️'];
  const SECS = [[0, '∞'], [15, '15'], [30, '30'], [45, '45'], [60, '60']];
  try { Object.assign(S, JSON.parse(localStorage.getItem(PREF) || '{}')); } catch {}

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
      mk('socialPage', '<div class="card ub-head"><div class="topline"><button class="back" type="button" data-soc-home>‹ Beranda</button><b>⚔️ Duel</b></div></div><div id="socialBody" class="soc-body"></div>');
      mk('hubPage', '<div class="card ub-head"><div class="topline"><button class="back" type="button" data-soc-home>‹ Beranda</button><b>👥 Sosial</b></div></div><div id="hubBody" class="soc-body"></div>');
      mk('duelPage', '<div class="card ub-head"><div class="topline"><button class="back" type="button" data-soc-lobby>‹ Duel</button><b id="duelTitle">⚔️ Duel</b></div></div><div id="duelBody" class="soc-body"></div>');
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
  const dot = () => { setDot('socDot', S.invites.length); setDot('hubDot', (S.F?.incoming?.length || 0) + (window.CLINED_CHAT?.unread || 0)); };
  window.addEventListener('clined:chat-unread', dot);

  /* ───────── data ───────── */
  async function loadLobby() {
    const [f, a] = await Promise.all([api('/api/friends'), api('/api/duels/active')]);
    S.F = f; S.mine = a.mine || []; S.invites = a.invites || []; dot();
  }
  async function loadBanks() {
    if (S.banks.length) return;
    try { const d = await api('/api/banks'); S.banks = (d.banks || []).filter(b => Number(b.count) >= 5).sort((a, b) => String(a.name).localeCompare(String(b.name), 'id')); } catch {}
    if (!S.banks.some(b => b.id === S.bank)) S.bank = S.banks[0]?.id || '';
  }
  const savePref = () => { try { localStorage.setItem(PREF, JSON.stringify({ bank: S.bank, count: S.count, sec: S.sec })); } catch {} };

  /* ───────── LOBI ───────── */
  const person = p => `<div class="soc-who"><b>${esc(p.name)}</b><small>@${esc(p.username)}${p.online ? ' • <span class="soc-on">● online</span>' : ''}</small></div>`;
  const initials = n => esc(String(n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase());
  const avatar = (p, cls = '') => `<span class="soc-av ${cls}${p.online ? ' on' : ''}" aria-hidden="true">${initials(p.name)}</span>`;
  function lobbyHTML() {
    const F = S.F || { friends: [], incoming: [], outgoing: [], blocked: [] };
    const bankOpts = S.banks.map(b => `<option value="${esc(b.id)}"${b.id === S.bank ? ' selected' : ''}>${esc(b.name)} (${b.count})</option>`).join('');
    const secLabel = S.sec ? `${S.sec} dtk/soal` : 'tanpa batas';
    const mine = S.mine.map(d => {
      const opp = d.opponent, title = d.status === 'waiting' ? `Kode ${esc(d.code)}` : `vs ${esc(opp?.name || 'lawan')}`;
      return `<button type="button" class="soc-live" data-soc-open="${esc(d.id)}"><span class="soc-live-ico">${d.status === 'waiting' ? '⏳' : '🔥'}</span><span class="soc-who"><b>${title}</b><small>${d.status === 'waiting' ? 'Menunggu lawan' : `${d.me.answered}/${d.total} soal`}</small></span><span class="soc-go">Lanjut ›</span></button>`;
    }).join('');
    const inv = S.invites.map(i => `<div class="soc-invite"><div class="soc-who"><b>${esc(i.from?.name || 'Teman')} menantangmu!</b><small>${esc(i.bank.name)} • ${i.total} soal</small></div><div class="soc-btns"><button type="button" class="primary" data-soc-accept="${esc(i.code)}">Terima</button><button type="button" class="secondary" data-soc-decline="${esc(i.id)}" aria-label="Tolak">✕</button></div></div>`).join('');
    const fr = F.friends.map(f => `<div class="soc-friend">${avatar(f)}<div class="soc-who"><b>${esc(f.name)}</b><small>@${esc(f.username)}${f.online ? ' • <span class="soc-on">online</span>' : ''}</small></div>
      <button type="button" class="primary soc-fight" data-soc-challenge="${esc(f.id)}" aria-label="Tantang ${esc(f.name)}">⚔️ Tantang</button>
      <details class="soc-more"><summary aria-label="Opsi lainnya">⋯</summary><div class="soc-btns"><button type="button" class="secondary" data-soc-remove="${esc(f.id)}" data-name="${esc(f.name)}">Hapus teman</button><button type="button" class="secondary soc-danger" data-soc-block="${esc(f.id)}" data-name="${esc(f.name)}">Blokir</button></div></details></div>`).join('');
    const incoming = F.incoming.map(f => `<div class="soc-friend">${avatar(f)}<div class="soc-who"><b>${esc(f.name)}</b><small>@${esc(f.username)}</small></div><div class="soc-btns"><button type="button" class="primary" data-soc-respond="${f.linkId}" data-accept="1">Terima</button><button type="button" class="secondary" data-soc-respond="${f.linkId}" data-accept="0" aria-label="Tolak">✕</button></div></div>`).join('');
    const outgoing = F.outgoing.map(f => `<div class="soc-friend">${avatar(f)}<div class="soc-who"><b>${esc(f.name)}</b><small>Menunggu • @${esc(f.username)}</small></div><button type="button" class="secondary" data-soc-remove="${esc(f.id)}" data-quiet="1">Batal</button></div>`).join('');
    const blocked = F.blocked.map(f => `<div class="soc-friend">${avatar(f)}<div class="soc-who"><b>${esc(f.name)}</b><small>@${esc(f.username)}</small></div><button type="button" class="secondary" data-soc-unblock="${esc(f.id)}">Buka</button></div>`).join('');
    const duelHTML0 = `
    ${inv}${mine ? `<div class="soc-lives">${mine}</div>` : ''}
    <div class="card soc-card soc-setup"><div class="soc-title"><span>⚔️</span><h3>Atur duel</h3></div>
      <select id="socBank" data-soc-bank aria-label="Bank soal">${bankOpts || '<option value="">Memuat…</option>'}</select>
      <div class="soc-opt-row"><span class="soc-lab">Soal</span><div class="soc-seg n3" role="radiogroup" aria-label="Jumlah soal">${[5, 10, 15].map(n => `<button type="button" role="radio" aria-checked="${S.count === n}" class="${S.count === n ? 'on' : ''}" data-soc-count="${n}">${n}</button>`).join('')}</div></div>
      <div class="soc-opt-row"><span class="soc-lab">Waktu <small>(detik/soal)</small></span><div class="soc-seg n5" role="radiogroup" aria-label="Batas waktu per soal">${SECS.map(([v, l]) => `<button type="button" role="radio" aria-checked="${S.sec === v}" class="${S.sec === v ? 'on' : ''}" data-soc-sec="${v}">${l}</button>`).join('')}</div></div>
      <button type="button" class="primary soc-big" data-soc-create>🔑 Buat kode duel</button>
      <div class="soc-join"><input id="socCode" data-soc-code type="text" inputmode="text" autocapitalize="characters" autocomplete="off" maxlength="6" placeholder="KODE" aria-label="Kode duel"><button type="button" class="secondary" data-soc-join>Gabung</button></div>
    </div>`;
    const quick = F.friends.length ? F.friends.map(f => `<div class="soc-friend quick">${avatar(f)}<div class="soc-who"><b>${esc(f.name)}</b><small>@${esc(f.username)}${f.online ? ' • <span class="soc-on">online</span>' : ''}</small></div><button type="button" class="primary soc-fight" data-soc-challenge="${esc(f.id)}" aria-label="Tantang ${esc(f.name)}">⚔️ Tantang</button></div>`).join('') : '<p class="soc-empty">Belum ada teman untuk ditantang.</p>';
    const quickHTML = `<div class="card soc-card"><div class="soc-title"><span>👥</span><h3>Tantang teman</h3></div><div class="soc-sec">${quick}</div><button type="button" class="secondary soc-big" data-soc-hub="teman">Kelola teman di Sosial ›</button></div>`;
    const friendsHTML0 = `
    <div class="card soc-card"><div class="soc-title"><span>👥</span><h3>Teman</h3></div>
      ${incoming ? `<div class="soc-sec"><h4>Permintaan masuk</h4>${incoming}</div>` : ''}
      <div class="soc-sec">${fr || '<p class="soc-empty">Belum ada teman. Tambahkan lewat username.</p>'}</div>
      <div class="soc-join"><input id="socUser" data-soc-user type="text" autocapitalize="none" autocomplete="off" maxlength="25" placeholder="Username teman" aria-label="Username teman"><button type="button" class="primary" data-soc-add>Tambah</button></div>
      ${outgoing ? `<div class="soc-sec"><h4>Menunggu dijawab</h4>${outgoing}</div>` : ''}
      ${blocked ? `<details class="soc-sec"><summary>Diblokir (${F.blocked.length})</summary>${blocked}</details>` : ''}
    </div>`;
    return { duel: duelHTML0 + quickHTML, friends: friendsHTML0 };
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

  async function renderLobby(reload = true) {
    ensureShell();
    const body = $('socialBody'); if (!body) return;
    if (reload) { if (!S.F) body.innerHTML = '<p class="soc-empty">Memuat…</p>'; try { await Promise.all([loadLobby(), loadBanks()]); } catch (e) { body.innerHTML = `<p class="soc-empty">${esc(e.message)}</p>`; return; } }
    const keep = { code: $('socCode')?.value };
    body.innerHTML = lobbyHTML().duel;
    if (keep.code) $('socCode').value = keep.code;
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

  /* ───────── RUANG DUEL ───────── */
  const nowS = () => Date.now() + S.skew;
  const syncD = d => { S.D = d; if (d?.serverNow) S.skew = d.serverNow - Date.now(); };
  function stopTick() { clearInterval(S.tick); S.tick = null; }
  function startTick() { stopTick(); S.tick = setInterval(tick, 200); }
  function tick() {
    const D = S.D; if (!D || D.status !== 'active' || activeView() !== 'duelPage') return stopTick();
    const now = nowS();
    if (now < D.startedAt) { const el = $('duelGo'); if (el) el.textContent = Math.max(1, Math.ceil((D.startedAt - now) / 1000)); return; }
    if ($('duelGo')) { renderDuel(); return; }                       // hitungan mundur selesai → tampilkan soal 1
    const clock = $('duelClock'); if (clock && !D.perQ) clock.textContent = fmtMs(D.deadlineAt - now);
    if (!D.perQ) return;
    const qi = D.myAnswers.length; if (qi >= D.total || S.fb != null) return;
    const left = D.perQ - (now - D.qStartAt), bar = $('duelQBar'), sec = $('duelQSec');
    if (bar) { bar.style.width = Math.max(0, Math.min(100, (left / D.perQ) * 100)) + '%'; bar.dataset.low = left < 5000 ? '1' : ''; }
    if (sec) sec.textContent = Math.max(0, Math.ceil(left / 1000));
    if (left <= 0 && S.sentFor !== qi) { S.sentFor = qi; answer(-1).catch(() => { S.sentFor = -1; }); }
  }
  const reasonText = (r, win, draw) => draw ? 'Skor dan waktu sama persis.' : ({ score: 'Skor lebih tinggi.', speed: 'Skor sama, selesai lebih cepat.', forfeit: win ? 'Lawan menyerah.' : 'Kamu menyerah.', finished: 'Waktu habis, kamu lebih dulu selesai.' }[r] || '');
  const secText = ms => ms ? `${ms / 1000} dtk/soal` : 'tanpa batas waktu';

  function duelHTML() {
    const D = S.D; if (!D) return '<p class="soc-empty">Duel tidak ditemukan.</p>';
    const opp = D.opponent, oppName = esc(opp?.name || D.invited?.name || 'lawan');
    if (D.status === 'cancelled') return `<div class="card soc-card soc-center"><div class="soc-emoji">🚫</div><h3>Duel dibatalkan</h3><button type="button" class="primary soc-big" data-soc-lobby>Kembali</button></div>`;
    if (D.status === 'waiting') {
      if (!D.isHost) return `<div class="card soc-card soc-center"><div class="soc-vs-av">${avatar(opp || {})}<b>VS</b>${avatar(D.me)}</div><h3>${oppName} menantangmu!</h3><p>${esc(D.bank.name)} • ${D.total} soal • ${secText(D.perQ)}</p><button type="button" class="primary soc-big" data-soc-accept="${esc(D.code)}">⚔️ Terima tantangan</button><button type="button" class="secondary soc-big" data-soc-decline="${esc(D.id)}">Tolak</button></div>`;
      return `<div class="card soc-card soc-center"><div class="soc-emoji soc-pulse">⏳</div><h3>${D.invited ? `Menunggu ${oppName}…` : 'Menunggu lawan…'}</h3><p>${esc(D.bank.name)} • ${D.total} soal • ${secText(D.perQ)}</p>
        <div class="soc-code" aria-label="Kode duel">${esc(D.code)}</div>
        <div class="soc-btns2"><button type="button" class="secondary" data-soc-copy="${esc(D.code)}">📋 Salin</button><button type="button" class="primary" data-soc-share="${esc(D.code)}">📤 Bagikan</button></div>
        <button type="button" class="secondary soc-big soc-danger" data-soc-leave>Batalkan duel</button></div>`;
    }
    if (D.status === 'finished') {
      const R = D.result, win = R.winnerId === D.me.id, draw = !R.winnerId;
      const bar = (name, s, me) => `<div class="soc-score${me ? ' me' : ''}"><small>${esc(name)}</small><b>${s.score}<em>/${D.total}</em></b><span>⏱ ${s.done ? fmtMs(s.timeMs) : 'belum selesai'}</span></div>`;
      const review = R.review.map(q => `<details class="soc-rev"><summary><span class="soc-rn ${q.myChoice === q.correctIdx ? 'ok' : 'bad'}">${q.i + 1}</span>${esc(q.soal.slice(0, 90))}${q.soal.length > 90 ? '…' : ''}</summary>
        <ul>${q.opsi.map((o, i) => `<li class="${i === q.correctIdx ? 'ok' : ''}">${L5[i]}. ${esc(o)} ${i === q.correctIdx ? '✓' : ''}${i === q.myChoice ? ' <em>kamu</em>' : ''}${i === q.oppChoice ? ' <em class="opp">lawan</em>' : ''}</li>`).join('')}</ul>${q.myChoice === -1 ? '<p class="soc-pemb">⏰ Kamu tidak menjawab tepat waktu.</p>' : ''}${q.pembahasan ? `<p class="soc-pemb">${esc(q.pembahasan)}</p>` : ''}</details>`).join('');
      return `<div class="card soc-card soc-center soc-result ${draw ? 'draw' : win ? 'win' : 'lose'}"><div class="soc-emoji">${draw ? '🤝' : win ? '🏆' : '💪'}</div>
        <h3>${draw ? 'Seri!' : win ? 'Kamu menang!' : `${oppName} menang`}</h3><p>${reasonText(R.reason, win, draw)}</p>
        <div class="soc-scores">${bar('Kamu', R.me, true)}${bar(opp?.name || 'Lawan', R.opponent, false)}</div>
        <div class="soc-btns2"><button type="button" class="secondary" data-soc-lobby>Selesai</button><button type="button" class="primary" data-soc-rematch>⚔️ Duel lagi</button></div></div>
        <div class="card soc-card"><h4>Ulasan soal</h4>${review}</div>`;
    }
    // aktif
    const pct = n => Math.round((n / D.total) * 100), mineN = D.myAnswers.length;
    const board = `<div class="duel-board"><div class="duel-side me">${avatar(D.me)}<div><b>Kamu</b><span>${mineN}/${D.total} • ✅ ${D.me.score}</span></div><i style="--w:${pct(mineN)}%"></i></div><div class="duel-vs"><span>VS</span>${D.perQ ? '' : `<small id="duelClock">${fmtMs(D.deadlineAt - nowS())}</small>`}</div><div class="duel-side opp">${avatar(opp || {}, 'opp')}<div><b>${oppName}</b><span>${opp?.answered ?? 0}/${D.total}</span></div><i style="--w:${pct(opp?.answered ?? 0)}%"></i></div></div>`;
    if (nowS() < D.startedAt) return board + `<div class="card soc-card soc-center"><p>Bersiap…</p><div class="soc-count" id="duelGo">${Math.max(1, Math.ceil((D.startedAt - nowS()) / 1000))}</div><p class="soc-hint">${D.total} soal • ${secText(D.perQ)}</p></div>`;
    const fbIdx = S.fb != null && S.fb === mineN - 1 ? S.fb : null, qi = fbIdx != null ? fbIdx : mineN;
    let main;
    if (qi >= D.total) main = `<div class="card soc-card soc-center"><div class="soc-emoji soc-pulse">⏳</div><h3>Menunggu ${oppName}…</h3><p>Kamu selesai: ✅ ${D.me.score}/${D.total}. Hasil muncul begitu lawan selesai.</p></div>`;
    else {
      const q = D.questions[qi], a = fbIdx != null ? D.myAnswers[qi] : null, timed = D.perQ > 0;
      main = `<div class="card soc-card">${timed && !a ? `<div class="soc-qtimer"><i id="duelQBar" style="width:100%"></i><b id="duelQSec">${D.perQ / 1000}</b></div>` : ''}<small class="soc-qn">Soal ${qi + 1} dari ${D.total}</small><p class="soc-q">${esc(q.soal)}</p>
        <div class="soc-opts">${q.opsi.map((o, i) => { const cls = a ? (i === a.correctIdx ? 'ok' : i === a.choice ? 'bad' : '') : ''; return `<button type="button" class="soc-opt ${cls}" data-soc-opt="${i}" ${a ? 'disabled' : ''}><span class="soc-l">${L5[i]}</span><span>${esc(o)}</span></button>`; }).join('')}</div>
        ${a ? `<div class="soc-fb ${a.ok ? 'ok' : 'bad'}"><b>${a.ok ? '✅ Benar!' : a.choice === -1 ? '⏰ Waktu habis' : '❌ Kurang tepat'}</b>${!timed && a.pembahasan ? `<p>${esc(a.pembahasan)}</p>` : ''}</div>${timed ? '' : `<button type="button" class="primary soc-big" data-soc-next>${qi + 1 < D.total ? 'Lanjut ›' : 'Selesai ›'}</button>`}` : ''}</div>`;
    }
    return board + main + `<button type="button" class="secondary soc-big soc-danger" data-soc-leave>Menyerah</button>`;
  }
  function renderDuel() {
    ensureShell();
    const b = $('duelBody'); if (!b) return;
    const D = S.D;
    $('duelTitle').textContent = D?.status === 'finished' ? '🏁 Hasil duel' : '⚔️ Duel';
    b.innerHTML = duelHTML();
    if (D?.status === 'active') startTick(); else stopTick();
  }
  async function openDuel(id) {
    S.fb = null; window.show('duelPage');
    $('duelBody') && ($('duelBody').innerHTML = '<p class="soc-empty">Memuat…</p>');
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
    const d = await api('/api/duels', { method: 'POST', body: { bankId: S.bank, count: S.count, seconds: S.sec, ...(friendId ? { friendId } : {}) } });
    syncD(d.duel); S.fb = null; S.sentFor = -1; window.show('duelPage'); renderDuel();
    if (friendId) toast('Tantangan terkirim ⚔️');
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

  document.addEventListener('click', e => {
    const t = e.target.closest('button, summary'); if (!t) return;
    if (t.id === 'socialBtn') return openLobby();
    if (t.id === 'hubBtn') return openHub();
    if (t.matches('[data-soc-home]')) return window.show('home');
    if (t.matches('[data-soc-lobby]')) { S.D = null; stopTick(); return openLobby(); }
    const ds = t.dataset || {};
    if (t.id === 'shareStatusBtn') return openComposer(resultContext());
    if ('socTab' in ds) { S.hubTab = ds.socTab; if (S.hubTab === 'status') S.feed = null; return renderHub(); }
    if ('socHub' in ds) return openHub(ds.socHub);
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
      const text = `Ayo duel soal di CLINED! Masukkan kode ${ds.socShare} di menu Teman & Duel.`;
      if (navigator.share) return navigator.share({ text }).catch(() => {});
      try { navigator.clipboard.writeText(text); toast('Ajakan disalin 📋'); } catch {} return;
    }
    if ('socLeave' in ds) return guard(async () => {
      const D = S.D, act = D?.status === 'active';
      if (act && !(await clinedConfirm({ title: 'Menyerah dari duel?', lines: ['Kamu dianggap **kalah** dan lawan menang.'], ok: 'Menyerah', cancel: 'Lanjut main', tone: 'danger' }))) return;
      await api(`/api/duels/${encodeURIComponent(D.id)}/leave`, { method: 'POST', body: {} });
      S.D = null; stopTick(); openLobby();
    });
    if ('socRematch' in ds) return guard(async () => {
      const D = S.D, opp = D?.opponent; S.bank = D.bank.id; S.count = D.total; S.sec = (D.perQ || 0) / 1000;
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
  document.addEventListener('change', e => { if (e.target.matches('[data-soc-bank]')) { S.bank = e.target.value; savePref(); } });
  document.addEventListener('input', e => { if (e.target.matches('[data-soc-code]')) e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    if (e.target.matches?.('[data-soc-user]')) $('hubBody')?.querySelector('[data-soc-add]')?.click();
    if (e.target.matches?.('[data-soc-cinput]')) e.target.closest('.soc-cform')?.querySelector('[data-soc-csend]')?.click();
    if (e.target.matches?.('[data-soc-code]')) $('socialBody').querySelector('[data-soc-join]')?.click();
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
    const n = m.from?.name || 'Temanmu';
    const here = S.D && S.D.id === m.id && activeView() === 'duelPage';
    if (m.kind === 'invite') toast(`⚔️ ${n} menantangmu duel!`);
    else if (m.kind === 'joined' && !here) toast(`⚔️ ${n} bergabung ke duelmu`);
    else if (m.kind === 'declined') toast(`${n} menolak tantanganmu`);
    else if (m.kind === 'finished' && !here) toast('🏁 Duel selesai, lihat hasilnya di Teman & Duel');
    if (here) refreshDuel();
    loadLobby().then(() => { if (activeView() === 'socialPage') renderLobby(false); }).catch(() => {});
  }

  function boot() { ensureShell(); connect(); }
  setInterval(() => { ensureShell(); connect(); }, 5000);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.CLINED_SOCIAL = { openChat: () => { S.hubTab = 'chat'; renderHub(); }, openStatus: () => { S.hubTab = 'status'; S.feed = null; renderHub(); }, open: openLobby, refresh: () => renderLobby(true) };
})();
