/* CLINED — Glosarium: halaman istilah, ketuk istilah di pembahasan, dan pengelola admin.
   Isi definisi dimasukkan admin; aplikasi tidak membawa teks kamus apa pun. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = (m, e) => window.showToast?.(m, !!e);
  const CACHE = 'clined_glossary_v1';
  const G = { terms: [], byId: new Map(), matcher: null, loaded: false, loading: null, q: '' };
  const DEFAULT_SOURCE = "Dorland's Illustrated Medical Dictionary";

  async function api(path, opt = {}) {
    const r = await fetch(path, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...opt, body: opt.body ? JSON.stringify(opt.body) : undefined });
    const t = await r.text(); let d = {}; try { d = t ? JSON.parse(t) : {}; } catch {}
    if (!r.ok) throw new Error(d.error || `Permintaan gagal (${r.status}).`);
    return d;
  }
  const loggedIn = () => { try { return typeof authCurrentUser === 'function' && !!authCurrentUser(); } catch { return false; } };

  function setTerms(list) {
    G.terms = list; G.byId = new Map(list.map(t => [String(t.id), t]));
    G.matcher = window.ClinedGlossaryMatch.build(list.map(t => ({ id: String(t.id), term: t.term, aliases: t.aliases })));
    G.loaded = true;
  }
  async function load(force = false) {
    if (G.loading) return G.loading;
    if (G.loaded && !force) return;
    if (!force) { try { const c = JSON.parse(localStorage.getItem(CACHE) || 'null'); if (c && Date.now() - c.at < 6 * 3600e3) { setTerms(c.terms); return; } } catch {} }
    G.loading = api('/api/glossary').then(d => { setTerms(d.terms || []); try { localStorage.setItem(CACHE, JSON.stringify({ at: Date.now(), terms: d.terms || [] })); } catch {} })
      .catch(() => { if (!G.loaded) setTerms([]); }).finally(() => { G.loading = null; });
    return G.loading;
  }

  /* ───────── halaman Glosarium ───────── */
  function ensureShell() {
    if (!$('glossaryPage')) {
      const s = document.createElement('section'); s.id = 'glossaryPage'; s.className = 'view';
      s.innerHTML = '<div class="card ub-head"><div class="topline"><button class="back" type="button" data-home>‹ Beranda</button><b>📖 Glosarium</b></div></div><div class="gl-body"><div class="gl-search"><input id="glSearch" type="search" placeholder="Cari istilah…" autocomplete="off" enterkeyhint="search" aria-label="Cari istilah"></div><div id="glInfo" class="gl-info"></div><div id="glList" class="gl-list"></div></div>';
      const anchor = $('analytics') || document.querySelector('main .view:last-of-type');
      anchor?.parentNode ? anchor.parentNode.insertBefore(s, anchor) : document.body.appendChild(s);
    }
    const menu = $('menuSectionContent');
    if (menu && !$('glossaryBtn')) {
      const b = document.createElement('button'); b.className = 'secondary menu-item'; b.id = 'glossaryBtn'; b.type = 'button';
      b.innerHTML = '<span class="menu-icon">📖</span><span>Glosarium</span>';
      const ref = $('studyPlusBtn') || null; menu.insertBefore(b, ref ? ref : null);
    }
  }
  const fold = s => String(s).normalize('NFC').toLowerCase();
  function renderList() {
    const box = $('glList'), info = $('glInfo'); if (!box) return;
    const q = fold(G.q).trim();
    const list = G.terms.filter(t => !q || fold(t.term).includes(q) || t.aliases.some(a => fold(a).includes(q)) || fold(t.definition).includes(q));
    info.textContent = G.terms.length ? `${list.length} dari ${G.terms.length} istilah` : '';
    if (!G.terms.length) { box.innerHTML = '<div class="gl-empty"><div>📖</div><b>Glosarium masih kosong</b><p>Admin dapat menambahkan istilah lewat Profil → Kelola Konten → Glosarium.</p></div>'; return; }
    if (!list.length) { box.innerHTML = '<div class="gl-empty"><div>🔎</div><b>Istilah tidak ditemukan</b></div>'; return; }
    let letter = '';
    box.innerHTML = list.slice(0, 200).map(t => {
      const L = fold(t.term)[0]?.toUpperCase() || '#', head = L !== letter && !q ? `<div class="gl-letter">${esc(letter = L)}</div>` : '';
      return head + termCard(t);
    }).join('') + (list.length > 200 ? '<p class="gl-info">Tampil 200 pertama — persempit pencarian.</p>' : '');
  }
  function termCard(t, compact) {
    return `<article class="gl-card${compact ? ' compact' : ''}"><div class="gl-term-head"><b>${esc(t.term)}</b>${t.verified ? '' : '<em title="Belum diverifikasi">belum diverifikasi</em>'}</div>
      ${t.aliases.length ? `<div class="gl-alias">${t.aliases.map(esc).join(' • ')}</div>` : ''}<p>${esc(t.definition)}</p>${t.source ? `<small class="gl-src">Sumber: ${esc(t.source)}</small>` : ''}</article>`;
  }
  async function openPage() { ensureShell(); window.show('glossaryPage'); $('glList').innerHTML = '<p class="gl-info">Memuat…</p>'; await load(); renderList(); }

  /* ───────── ketuk istilah di pembahasan ───────── */
  const TARGETS = '#explain, .ml-explain, #question';
  let busy = false;
  function annotate(root) {
    if (busy || !G.matcher || !G.matcher.re || !root || root.dataset.glDone === String(G.terms.length) + '|' + root.textContent.length) return;
    busy = true;
    try {
      root.querySelectorAll('.gl-term').forEach(b => b.replaceWith(document.createTextNode(b.textContent)));
      root.normalize();
      const used = new Set(), walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentElement.closest('button,a,.gl-term,textarea,script,style') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
      const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
      for (const node of nodes) {
        const hits = window.ClinedGlossaryMatch.find(node.nodeValue, G.matcher, 12).filter(h => !used.has(h.id));
        if (!hits.length) continue;
        const frag = document.createDocumentFragment(); let pos = 0;
        for (const h of hits) {
          used.add(h.id); frag.append(node.nodeValue.slice(pos, h.start));
          const b = document.createElement('button'); b.type = 'button'; b.className = 'gl-term'; b.dataset.glId = h.id; b.textContent = node.nodeValue.slice(h.start, h.end);
          b.setAttribute('aria-label', 'Arti istilah ' + b.textContent); frag.append(b); pos = h.end;
        }
        frag.append(node.nodeValue.slice(pos)); node.replaceWith(frag);
      }
      root.dataset.glDone = String(G.terms.length) + '|' + root.textContent.length;
    } finally { busy = false; }
  }
  function sweep() { if (!G.matcher?.re) return; document.querySelectorAll(TARGETS).forEach(annotate); }
  let tmr = null;
  const obs = new MutationObserver(() => { if (busy) return; clearTimeout(tmr); tmr = setTimeout(sweep, 120); });

  function showSheet(id) {
    const t = G.byId.get(String(id)); if (!t) return;
    document.querySelector('.gl-sheet')?.remove();
    const el = document.createElement('div'); el.className = 'cdlg-layer gl-sheet';
    el.innerHTML = `<div class="cdlg-card" role="dialog" aria-modal="true" aria-label="Arti istilah" data-tone="info"><div class="cdlg-head"><span class="cdlg-ico" aria-hidden="true">📖</span><h3 class="cdlg-title">${esc(t.term)}</h3></div>
      <div class="cdlg-body">${t.aliases.length ? `<p class="gl-alias">${t.aliases.map(esc).join(' • ')}</p>` : ''}<p>${esc(t.definition)}</p>${t.source ? `<small class="gl-src">Sumber: ${esc(t.source)}</small>` : ''}${t.verified ? '' : '<small class="gl-src warn">Belum diverifikasi — cek ke sumber resmi.</small>'}</div>
      <div class="cdlg-actions"><button type="button" class="secondary" data-gl-close>Tutup</button><button type="button" class="primary" data-gl-page>Buka Glosarium</button></div></div>`;
    const close = () => { el.classList.remove('show'); setTimeout(() => el.remove(), 260); };
    el.addEventListener('click', e => { if (e.target === el || e.target.closest('[data-gl-close]')) return close(); if (e.target.closest('[data-gl-page]')) { close(); G.q = t.term; openPage().then(() => { const i = $('glSearch'); if (i) i.value = t.term; renderList(); }); } });
    document.body.appendChild(el); requestAnimationFrame(() => el.classList.add('show'));
  }

  /* ───────── admin ───────── */
  const A = { editing: null };
  function adminPanelHTML() {
    return `<div class="admin-content-intro"><b>Glosarium</b><span>Isi definisi dari sumber yang kamu punya hak pakainya (mis. Dorland's). Aplikasi hanya menyimpan teks yang kamu masukkan.</span></div>
      <form class="gl-form" data-gl-form>
        <input type="text" name="term" maxlength="80" placeholder="Istilah (mis. Glomerulonefritis)" required aria-label="Istilah">
        <input type="text" name="aliases" maxlength="200" placeholder="Sinonim / singkatan, pisahkan dengan titik koma" aria-label="Sinonim">
        <textarea name="definition" rows="5" maxlength="1500" placeholder="Definisi" required aria-label="Definisi"></textarea>
        <input type="text" name="source" maxlength="160" value="${esc(DEFAULT_SOURCE)}" aria-label="Sumber">
        <label class="gl-check"><input type="checkbox" name="verified"> Sudah diverifikasi terhadap sumber</label>
        <div class="gl-formbtns"><button type="button" class="secondary" data-gl-reset>Kosongkan</button><button type="submit" class="primary">Simpan istilah</button></div>
      </form>
      <details class="gl-import"><summary>⬆️ Impor banyak istilah (CSV)</summary>
        <p class="muted">Kolom: <code>term, aliases, definition, source</code>. Baris tanpa definisi dilewati.</p>
        <textarea data-gl-csv rows="6" placeholder='term,aliases,definition,source&#10;"Edema","sembab","…","${esc(DEFAULT_SOURCE)}"'></textarea>
        <label class="gl-check"><input type="checkbox" data-gl-csv-verified> Tandai semua sebagai terverifikasi</label>
        <div class="gl-formbtns"><label class="secondary gl-file">Pilih berkas<input type="file" accept=".csv,text/csv" data-gl-file hidden></label><button type="button" class="primary" data-gl-import>Impor</button></div></details>
      <div class="gl-adminlist" data-gl-adminlist></div>`;
  }
  async function renderAdminList() {
    const box = document.querySelector('[data-gl-adminlist]'); if (!box) return;
    await load(true);
    box.innerHTML = `<h4>${G.terms.length} istilah</h4>` + G.terms.map(t => `<div class="gl-arow"><div><b>${esc(t.term)}</b><small>${t.verified ? '✓ terverifikasi' : 'belum diverifikasi'}${t.source ? ' • ' + esc(t.source) : ''}</small></div><div class="gl-abtns"><button type="button" class="secondary" data-gl-edit="${esc(t.id)}">Edit</button><button type="button" class="secondary gl-del" data-gl-del="${esc(t.id)}" data-name="${esc(t.term)}">Hapus</button></div></div>`).join('');
  }
  function ensureAdminTab() {
    const p = document.querySelector('#adminContentWorkspace [data-content-panel="glossary"]');
    if (p && !p.dataset.glReady) { p.dataset.glReady = '1'; p.innerHTML = adminPanelHTML() + '<p class="acm-message" data-gl-msg role="status"></p>'; }
  }
  const msg = (t, err) => { const m = document.querySelector('[data-gl-msg]'); if (m) { m.textContent = t; m.className = 'acm-message' + (err ? ' error' : ' ok'); } toast(t, err); };

  document.addEventListener('click', async e => {
    const t = e.target.closest('button, label, summary'); if (!t) return;
    if (t.id === 'glossaryBtn') return openPage();
    if (t.matches('#glossaryPage [data-home]')) return window.show('home');
    if (t.classList.contains('gl-term')) { e.preventDefault(); return showSheet(t.dataset.glId); }
    if (t.dataset.contentTab === 'glossary') { setTimeout(renderAdminList, 60); return; }
    if ('glReset' in t.dataset) { document.querySelector('[data-gl-form]').reset(); A.editing = null; return; }
    if ('glEdit' in t.dataset) {
      const x = G.byId.get(t.dataset.glEdit), f = document.querySelector('[data-gl-form]'); if (!x || !f) return;
      f.term.value = x.term; f.aliases.value = x.aliases.join('; '); f.definition.value = x.definition; f.source.value = x.source; f.verified.checked = x.verified; f.scrollIntoView({ block: 'center', behavior: 'smooth' }); return;
    }
    if ('glDel' in t.dataset) {
      if (!(await clinedConfirm({ title: 'Hapus istilah ini?', lines: [`**${t.dataset.name}** dihapus dari glosarium.`], ok: 'Hapus', tone: 'danger' }))) return;
      try { await api('/api/glossary/delete', { method: 'POST', body: { id: Number(t.dataset.glDel) } }); msg('Istilah dihapus.'); renderAdminList(); } catch (err) { msg(err.message, true); } return;
    }
    if ('glImport' in t.dataset) {
      const csv = document.querySelector('[data-gl-csv]').value; if (!csv.trim()) return msg('Tempel isi CSV dulu.', true);
      try {
        const r = await api('/api/glossary/import', { method: 'POST', body: { csv, verified: !!document.querySelector('[data-gl-csv-verified]').checked } });
        msg(`Impor selesai: ${r.created} baru, ${r.updated} diperbarui${r.skippedCount ? `, ${r.skippedCount} dilewati` : ''}.`, !!r.skippedCount && !(r.created + r.updated));
        if (r.skipped?.length) console.info('Baris dilewati:', r.skipped);
        document.querySelector('[data-gl-csv]').value = ''; renderAdminList();
      } catch (err) { msg(err.message, true); } return;
    }
  });
  document.addEventListener('submit', async e => {
    const f = e.target.closest('[data-gl-form]'); if (!f) return; e.preventDefault();
    try {
      const r = await api('/api/glossary', { method: 'POST', body: { term: f.term.value, aliases: f.aliases.value, definition: f.definition.value, source: f.source.value, verified: f.verified.checked } });
      msg(r.created ? 'Istilah ditambahkan.' : 'Istilah diperbarui.'); f.reset(); f.source.value = DEFAULT_SOURCE; renderAdminList();
    } catch (err) { msg(err.message, true); }
  });
  document.addEventListener('change', e => {
    const f = e.target.closest('[data-gl-file]'); if (!f || !f.files[0]) return;
    const rd = new FileReader(); rd.onload = () => { document.querySelector('[data-gl-csv]').value = String(rd.result || ''); }; rd.readAsText(f.files[0], 'utf-8');
  });
  document.addEventListener('input', e => { if (e.target.id === 'glSearch') { G.q = e.target.value; renderList(); } });

  function boot() {
    ensureShell(); ensureAdminTab();
    if (loggedIn()) load().then(sweep);
    obs.observe(document.body, { childList: true, subtree: true, characterData: false });
  }
  setInterval(() => { ensureShell(); ensureAdminTab(); if (!G.loaded && loggedIn() && !G.loading) load().then(sweep); }, 4000);
  window.addEventListener('clined:view-change', () => setTimeout(sweep, 200));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.CLINED_GLOSSARY = { load, open: openPage, count: () => G.terms.length };
})();
