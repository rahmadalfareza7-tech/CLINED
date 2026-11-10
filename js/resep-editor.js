/* CLINED — Edit konten Latihan Farmako (khusus admin & helper).
   Data bawaan ada di js/resep-data.js. Perubahan disimpan di server sebagai "patch" (hanya field yang diubah)
   lalu digabungkan ke data bawaan saat halaman dimuat, sehingga berlaku untuk semua pengguna.
   Dimuat SETELAH resep-data.js dan SEBELUM resep.js (array diubah di tempat agar referensi tetap valid). */
(() => {
  'use strict';
  const D = window.RESEP_DATA;
  if (!D) return;
  const KEYS = { cases: 'id', sediaan: 'no', racikan: 'id', singk: 't', padat: 'q' };
  const ARR = { cases: D.CASES, sediaan: D.SEDIAAN, racikan: D.RACIKAN, singk: D.SINGK, padat: D.PADAT };
  const CACHE_KEY = 'clined_resep_overrides_v1';
  const LABELS = {
    cases: { ringkas: 'Ringkasan (judul di daftar)', pro: 'Nama pasien (Pro:)', usia: 'Umur pasien (th)', v: 'Skenario kasus', dx: 'Diagnosis',
      tujuan: 'Tujuan terapi (satu per baris)', p: 'Obat pilihan (satu per baris)', a: 'Obat alternatif (satu per baris)',
      l5: 'Informasi obat & instruksi (satu per baris)', mon: 'Monitoring (satu per baris)', cat: 'Catatan / versi lain yang diterima' },
    singk: { t: 'Singkatan', a: 'Arti', s: 'Sumber (c = catatan, u = umum)' },
    padat: { q: 'Pertanyaan', a: 'Jawaban', g: 'Kelompok' }
  };
  const FORMS = [['tab', 'Tablet'], ['caps', 'Kapsul'], ['syr', 'Sirup'], ['susp', 'Suspensi'], ['drops', 'Tetes'], ['inj', 'Injeksi'], ['sach', 'Sachet'], ['inhaler', 'Inhaler']];
  const ROW_KNOWN = ['b', 'o', 'n', 'k', 'kAlt', 'j', 's', 'sAlt', 'opt', 'bl'];

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clone = v => JSON.parse(JSON.stringify(v));
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const toast = (m, e) => window.showToast?.(m, !!e);
  const role = () => { try { return window.authCurrentUser?.()?.role || ''; } catch { return ''; } };
  const canEdit = () => role() === 'admin' || role() === 'helper';
  const find = (ds, key) => (ARR[ds] || []).find(x => String(x[KEYS[ds]]) === String(key));
  const lines = v => String(v || '').split('\n').map(x => x.trim()).filter(Boolean);

  /* ===== penggabungan data bawaan + override ===== */
  const orig = new Map();   // "ds:key" -> salinan data bawaan
  const edited = new Set(); // "ds:key" yang sedang dioverride
  const id = (ds, key) => ds + ':' + key;
  function snapshot(ds, item) {
    const k = id(ds, item[KEYS[ds]]);
    if (!orig.has(k)) orig.set(k, clone(item));
    return k;
  }
  function replaceInPlace(item, data) {
    Object.keys(item).forEach(k => delete item[k]);
    Object.assign(item, clone(data));
  }
  function applyOne(ds, key, patch) {
    const item = find(ds, key);
    if (!item) return false;
    const k = snapshot(ds, item);
    replaceInPlace(item, { ...orig.get(k), ...patch });
    edited.add(k);
    return true;
  }
  function resetOne(ds, key) {
    const item = find(ds, key), k = id(ds, key);
    if (item && orig.has(k)) replaceInPlace(item, orig.get(k));
    edited.delete(k);
  }
  function applyAll(list) {
    const want = new Set((list || []).map(o => id(o.dataset, o.key)));
    [...edited].forEach(k => { if (!want.has(k)) { const i = k.indexOf(':'); resetOne(k.slice(0, i), k.slice(i + 1)); } });
    (list || []).forEach(o => { if (KEYS[o.dataset] && o.data && typeof o.data === 'object') applyOne(o.dataset, o.key, o.data); });
  }
  const api = {
    canEdit, applyAll, applyOne, resetOne, rerender: null,
    isEdited: (ds, key) => edited.has(id(ds, key)),
    btn(ds, key) {
      if (!canEdit()) return '';
      return `<span class="re-btn" role="button" tabindex="0" data-re-edit="${esc(ds)}:${esc(encodeURIComponent(key))}" aria-label="Edit">✏️ Edit${edited.has(id(ds, key)) ? ' •' : ''}</span>`;
    },
    open
  };
  window.RESEP_EDIT = api;

  try { applyAll(JSON.parse(localStorage.getItem(CACHE_KEY) || '[]')); } catch { /* cache rusak diabaikan */ }
  async function load() {
    try {
      const r = await fetch('/api/resep-overrides', { credentials: 'same-origin' });
      if (!r.ok) return;
      const list = (await r.json()).overrides || [];
      localStorage.setItem(CACHE_KEY, JSON.stringify(list));
      applyAll(list);
      api.rerender?.();
    } catch { /* offline: pakai cache */ }
  }
  api.reload = load;
  load();

  async function call(url, opt = {}) {
    const r = await fetch(url, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...opt });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || `Permintaan gagal (${r.status}).`);
    return d;
  }

  /* ===== form generik ===== */
  const isStrArr = v => Array.isArray(v) && v.every(x => typeof x === 'string');
  const isPlain = v => v && typeof v === 'object' && !Array.isArray(v);
  const isSimpleObj = v => isPlain(v) && Object.values(v).every(x => ['string', 'number', 'boolean'].includes(typeof x) || isStrArr(x));
  function fieldsOf(ds, item) {
    const out = [], idKey = KEYS[ds], lab = LABELS[ds] || {};
    const add = (path, v, label) => {
      let type = 'json';
      if (typeof v === 'string') type = 'str'; else if (typeof v === 'number') type = 'num'; else if (typeof v === 'boolean') type = 'bool'; else if (isStrArr(v)) type = 'arr';
      out.push({ path, type, value: v, label });
    };
    Object.keys(item).forEach(k => {
      if (k === idKey) return;
      if (ds === 'cases' && k === 'rows') return;
      const v = item[k];
      if (isSimpleObj(v)) Object.keys(v).forEach(s => add(k + '.' + s, v[s], `${lab[k] || k} › ${s}`));
      else add(k, v, lab[k] || k);
    });
    return out;
  }
  function fieldHtml(f, i) {
    const lbl = `<label class="qe-lab" for="reF${i}">${esc(f.label)}${f.type === 'arr' ? ' <small>(satu per baris)</small>' : f.type === 'json' ? ' <small>(JSON)</small>' : ''}</label>`;
    const at = `id="reF${i}" data-re-f="${i}"`;
    if (f.type === 'bool') return `<label class="re-chk"><input type="checkbox" ${at} ${f.value ? 'checked' : ''}> ${esc(f.label)}</label>`;
    if (f.type === 'num') return `${lbl}<input type="number" step="any" ${at} value="${esc(f.value)}">`;
    if (f.type === 'str') {
      const long = f.value.length > 70 || f.value.includes('\n');
      return long ? `${lbl}<textarea rows="${Math.min(10, Math.max(3, Math.ceil(f.value.length / 60)))}" ${at}>${esc(f.value)}</textarea>`
        : `${lbl}<input type="text" ${at} value="${esc(f.value)}">`;
    }
    const text = f.type === 'arr' ? f.value.join('\n') : JSON.stringify(f.value, null, 1);
    return `${lbl}<textarea rows="${Math.min(14, Math.max(3, text.split('\n').length + 1))}" class="${f.type === 'json' ? 're-mono' : ''}" ${at}>${esc(text)}</textarea>`;
  }
  function readField(f, el) {
    if (f.type === 'bool') return el.checked;
    if (f.type === 'num') { const n = Number(el.value); if (el.value.trim() === '' || !Number.isFinite(n)) throw new Error(`"${f.label}" harus berupa angka.`); return n; }
    if (f.type === 'str') return el.value;
    if (f.type === 'arr') return lines(el.value);
    try { return JSON.parse(el.value); } catch { throw new Error(`"${f.label}": format JSON tidak valid.`); }
  }
  function setPath(obj, path, val) {
    const [a, b] = path.split('.');
    if (b === undefined) obj[a] = val; else { obj[a] = isPlain(obj[a]) ? obj[a] : {}; obj[a][b] = val; }
  }

  /* ===== editor resep kunci (khusus kasus) ===== */
  function rowHtml(r, i) {
    const rest = {};
    Object.keys(r).forEach(k => { if (!ROW_KNOWN.includes(k)) rest[k] = r[k]; });
    const has = Object.keys(rest).length;
    const opts = FORMS.map(([v, l]) => `<option value="${v}" ${r.b === v ? 'selected' : ''}>${l}</option>`).join('') + (FORMS.some(([v]) => v === r.b) ? '' : `<option value="${esc(r.b)}" selected>${esc(r.b)}</option>`);
    return `<div class="re-row" data-re-row="${i}">
      <div class="re-row-h"><b>R/ ${i + 1}</b><button type="button" class="secondary re-mini" data-re-delrow="${i}">Hapus obat</button></div>
      <div class="re-grid">
        <label>Nama obat<input type="text" data-r="o" value="${esc(r.o)}"></label>
        <label>Bentuk sediaan<select data-r="b">${opts}</select></label>
        <label>Kekuatan<input type="text" data-r="k" value="${esc(r.k)}" placeholder="500 mg"></label>
        <label>Jumlah (no.)<input type="text" data-r="j" value="${esc(r.j)}" placeholder="15 atau fl I"></label>
        <label class="re-wide">Label bentuk di resep <small>(opsional, mis. gtt opth)</small><input type="text" data-r="bl" value="${esc(r.bl)}"></label>
        <label class="re-wide">Signa (S) kunci<input type="text" data-r="s" value="${esc(r.s)}" placeholder="3dd tab I pc"></label>
      </div>
      <label>Signa lain yang diterima <small>(satu per baris)</small><textarea rows="2" data-r="sAlt">${esc((r.sAlt || []).join('\n'))}</textarea></label>
      <label>Kekuatan lain yang diterima <small>(satu per baris)</small><textarea rows="2" data-r="kAlt">${esc((r.kAlt || []).join('\n'))}</textarea></label>
      <label>Nama lain yang dikenali sistem <small>(satu per baris, huruf kecil)</small><textarea rows="2" data-r="n">${esc((r.n || []).join('\n'))}</textarea></label>
      <label class="re-chk"><input type="checkbox" data-r="opt" ${r.opt ? 'checked' : ''}> Opsional (tidak wajib ditulis, tidak dihitung tambahan)</label>
      <details class="re-adv"><summary>Lanjutan: pengganti obat (v), bentuk lain (bAlt), jumlah lain (jAlt), label bentuk (bl)</summary>
        <textarea rows="4" class="re-mono" data-r="rest" placeholder="{}">${has ? esc(JSON.stringify(rest, null, 1)) : ''}</textarea>
      </details></div>`;
  }
  function readRows(layer) {
    return [...layer.querySelectorAll('[data-re-row]')].map((el, i) => {
      const g = k => el.querySelector(`[data-r="${k}"]`);
      const o = g('o').value.trim();
      if (!o) throw new Error(`Resep kunci R/ ${i + 1}: nama obat wajib diisi.`);
      const j = g('j').value.trim();
      const r = { b: g('b').value, o, n: lines(g('n').value).map(x => x.toLowerCase()) };
      if (!r.n.length) r.n = [o.toLowerCase()];
      if (g('bl').value.trim()) r.bl = g('bl').value.trim();
      if (g('k').value.trim()) r.k = g('k').value.trim();
      const kAlt = lines(g('kAlt').value); if (kAlt.length) r.kAlt = kAlt;
      if (!j) throw new Error(`Resep kunci R/ ${i + 1}: jumlah wajib diisi.`);
      r.j = /^\d+$/.test(j) ? Number(j) : j;
      if (!g('s').value.trim()) throw new Error(`Resep kunci R/ ${i + 1}: signa wajib diisi.`);
      r.s = g('s').value.trim();
      const sAlt = lines(g('sAlt').value); if (sAlt.length) r.sAlt = sAlt;
      if (g('opt').checked) r.opt = true;
      const rest = g('rest').value.trim();
      if (rest) {
        let x; try { x = JSON.parse(rest); } catch { throw new Error(`Resep kunci R/ ${i + 1}: JSON "Lanjutan" tidak valid.`); }
        if (!isPlain(x)) throw new Error(`Resep kunci R/ ${i + 1}: "Lanjutan" harus berupa objek JSON.`);
        Object.assign(r, x);
      }
      return r;
    });
  }

  /* ===== dialog ===== */
  function ensureStyle() {
    if (document.getElementById('reStyle')) return;
    const st = document.createElement('style');
    st.id = 'reStyle';
    st.textContent = `.re-card{max-width:640px;width:calc(100vw - 24px)}.re-card .qe-body{max-height:calc(88vh - 150px);-webkit-overflow-scrolling:touch;overscroll-behavior:contain}
.re-card label{display:grid;gap:3px;font-size:12.5px;font-weight:800}.re-card label small{font-weight:600;opacity:.65}
.re-card input[type=text],.re-card input[type=number],.re-card select,.re-card textarea{width:100%;box-sizing:border-box;border:2px solid var(--line,#e5e7eb);border-radius:10px;padding:8px 10px;font:inherit;font-size:14px;font-weight:600;background:var(--card,#fff);color:var(--text,#111)}
.re-mono{font-family:ui-monospace,Menlo,Consolas,monospace!important;font-size:12.5px!important}
.re-row{border:2px solid var(--line,#e5e7eb);border-radius:14px;padding:10px;display:grid;gap:8px;background:var(--surface,transparent)}
.re-row-h{display:flex;align-items:center;justify-content:space-between}.re-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.re-wide{grid-column:1/-1}
.re-chk{display:flex!important;align-items:center;gap:8px}.re-chk input{width:auto!important}
.re-mini{min-height:30px!important;padding:0 10px!important;font-size:12px!important}.re-adv summary{cursor:pointer;font-size:12px;font-weight:800;opacity:.8}
.re-sec{font-weight:950;font-size:14px;margin-top:10px}.re-warn{margin:0;font-size:12px}
@media(max-width:480px){.re-grid{grid-template-columns:1fr}}`;
    document.head.appendChild(st);
  }

  function open(ds, rawKey) {
    if (!canEdit()) return toast('Hanya admin/helper yang dapat mengedit.', true);
    const key = decodeURIComponent(String(rawKey));
    const item = find(ds, key);
    if (!item) return toast('Item tidak ditemukan.', true);
    ensureStyle();
    document.querySelector('.re-layer')?.remove();
    const base = orig.get(id(ds, key)) || clone(item);
    const fields = fieldsOf(ds, item);
    const isCase = ds === 'cases';
    const title = ({ cases: `Edit kasus ${key}`, sediaan: `Edit sediaan #${key}`, racikan: 'Edit resep racikan', singk: `Edit singkatan "${key}"`, padat: 'Edit butir BSO padat' })[ds];
    const layer = document.createElement('div');
    layer.className = 'cdlg-layer qe-layer re-layer';
    const rowsHtml = isCase ? `<div class="re-sec">Resep kunci (R/ dan signa)</div><div data-re-rows>${(item.rows || []).map(rowHtml).join('')}</div>
      <button type="button" class="secondary re-mini" data-re-addrow>+ Tambah obat</button>` : '';
    layer.innerHTML = `<div class="cdlg-card qe-card re-card" role="dialog" aria-modal="true" aria-labelledby="reT"><div class="cdlg-head"><span class="cdlg-ico" aria-hidden="true">✏️</span><h3 class="cdlg-title" id="reT">${esc(title)}</h3></div>
      <div class="cdlg-body qe-body">${fields.map(fieldHtml).join('')}${rowsHtml}
      <p class="muted qe-note re-warn">Perubahan berlaku untuk semua pengguna. Ubah ${isCase ? '"Resep kunci", "Obat pilihan/alternatif" ' : ''}dengan hati-hati karena dipakai untuk menilai jawaban.</p></div>
      <div class="cdlg-actions"><button type="button" class="secondary" data-re-cancel>Batal</button>${edited.has(id(ds, key)) ? '<button type="button" class="secondary" data-re-reset>↩︎ Bawaan</button>' : ''}<button type="button" class="primary" data-re-save>Simpan</button></div></div>`;
    document.body.appendChild(layer);
    requestAnimationFrame(() => layer.classList.add('show'));
    const close = () => { layer.classList.remove('show'); setTimeout(() => layer.remove(), 260); };
    const saveBtn = layer.querySelector('[data-re-save]');
    /* Nilai awal form (sudah dinormalkan) dipakai supaya field yang tidak disentuh tidak ikut tersimpan. */
    const initVals = fields.map((f, i) => { try { return readField(f, layer.querySelector(`[data-re-f="${i}"]`)); } catch { return undefined; } });
    let initRows = null;
    if (isCase) { try { initRows = readRows(layer); } catch { initRows = null; } }
    const url = `/api/admin/resep-overrides/${ds}/${encodeURIComponent(key)}`;
    const done = msg => { close(); toast(msg); api.rerender?.(); };

    layer.addEventListener('click', async e => {
      if (e.target === layer || e.target.closest('[data-re-cancel]')) return close();
      const del = e.target.closest('[data-re-delrow]');
      if (del) { del.closest('[data-re-row]').remove(); return; }
      if (e.target.closest('[data-re-addrow]')) {
        const box = layer.querySelector('[data-re-rows]');
        box.insertAdjacentHTML('beforeend', rowHtml({ b: 'tab', o: '', n: [], j: 10, s: '3dd tab I' }, box.children.length));
        box.lastElementChild.scrollIntoView({ block: 'nearest' });
        return;
      }
      if (e.target.closest('[data-re-reset]')) {
        if (!confirm('Kembalikan item ini ke versi bawaan?')) return;
        try { await call(url, { method: 'DELETE' }); resetOne(ds, key); updateCache(ds, key, null); done('Dikembalikan ke versi bawaan ✅'); }
        catch (err) { toast(err.message, true); }
        return;
      }
      if (!e.target.closest('[data-re-save]')) return;
      let next;
      try {
        next = clone(item);
        fields.forEach((f, i) => { const v = readField(f, layer.querySelector(`[data-re-f="${i}"]`)); if (!same(v, initVals[i])) setPath(next, f.path, v); });
        if (isCase) {
          const rows = readRows(layer);
          if (!same(rows, initRows)) next.rows = rows;
          if (!next.rows.length) throw new Error('Resep kunci minimal 1 obat.');
          if (!next.dx?.trim()) throw new Error('Diagnosis wajib diisi.');
          if (!Array.isArray(next.p) || !next.p.length) throw new Error('Obat pilihan minimal 1.');
        }
      } catch (err) { return toast(err.message, true); }
      const patch = {};
      Object.keys(next).forEach(k => { if (k !== KEYS[ds] && !same(next[k], base[k])) patch[k] = next[k]; });
      if (!Object.keys(patch).length) {
        if (edited.has(id(ds, key))) { try { await call(url, { method: 'DELETE' }); resetOne(ds, key); updateCache(ds, key, null); } catch (err) { return toast(err.message, true); } return done('Dikembalikan ke versi bawaan ✅'); }
        return close();
      }
      saveBtn.disabled = true; saveBtn.textContent = 'Menyimpan…';
      try {
        await call(url, { method: 'PUT', body: JSON.stringify({ data: patch }) });
        applyOne(ds, key, patch); updateCache(ds, key, patch);
        done('Perubahan disimpan ✅');
      } catch (err) { saveBtn.disabled = false; saveBtn.textContent = 'Simpan'; toast(err.message, true); }
    });
  }
  function updateCache(ds, key, patch) {
    try {
      const list = (JSON.parse(localStorage.getItem(CACHE_KEY) || '[]')).filter(o => !(o.dataset === ds && String(o.key) === String(key)));
      if (patch) list.push({ dataset: ds, key: String(key), data: patch });
      localStorage.setItem(CACHE_KEY, JSON.stringify(list));
    } catch { /* abaikan */ }
  }
})();
