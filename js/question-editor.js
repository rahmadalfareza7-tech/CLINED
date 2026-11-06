/* CLINED — edit soal langsung dari layar soal (admin/helper): kunci jawaban, pilihan, pembahasan konsep inti,
   pembahasan per pilihan, catatan klinis. Berlaku untuk bank bawaan (DB) dan paket buatan web (UAB / Latihan Materi). */
(() => {
  'use strict';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = (m, e) => window.showToast?.(m, !!e);
  const L = 'ABCDEF';
  const role = () => { try { return window.authCurrentUser?.()?.role || ''; } catch { return ''; } };
  const canEdit = () => role() === 'admin' || role() === 'helper';
  async function call(url, opt = {}) {
    const r = await fetch(url, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...opt });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(d.error || `Permintaan gagal (${r.status}).`), { status: r.status });
    return d;
  }
  const urlOf = t => t.packageId
    ? `/api/content/packages/${encodeURIComponent(t.packageId)}/questions/${encodeURIComponent(t.qid)}`
    : `/api/admin/banks/${encodeURIComponent(t.bankId)}/questions/${encodeURIComponent(t.qid)}`;

  /* t = { bankId | packageId, qid, onSaved(rawQuestion) } */
  async function open(t) {
    if (!t || !t.qid || !(t.bankId || t.packageId)) return toast('Soal ini belum bisa diedit (tidak punya ID server).', true);
    if (!canEdit()) return toast('Hanya admin/helper yang dapat mengedit soal.', true);
    document.querySelector('.qe-layer')?.remove();
    const layer = document.createElement('div');
    layer.className = 'cdlg-layer qe-layer';
    layer.innerHTML = '<div class="cdlg-card qe-card" role="dialog" aria-modal="true" aria-labelledby="qeT"><div class="cdlg-head"><span class="cdlg-ico" aria-hidden="true">✏️</span><h3 class="cdlg-title" id="qeT">Edit soal</h3></div><div class="cdlg-body qe-body"><p class="muted">Memuat soal…</p></div><div class="cdlg-actions"><button type="button" class="secondary" data-qe-cancel>Batal</button><button type="button" class="primary" data-qe-save disabled>Simpan</button></div></div>';
    document.body.appendChild(layer);
    requestAnimationFrame(() => layer.classList.add('show'));
    const close = () => { layer.classList.remove('show'); setTimeout(() => layer.remove(), 260); };
    const bodyEl = layer.querySelector('.qe-body'), saveBtn = layer.querySelector('[data-qe-save]');
    let q;
    try { q = (await call(urlOf(t))).question; }
    catch (err) { bodyEl.innerHTML = `<p class="muted">${esc(err.status === 404 ? 'Soal ini tidak ada di server (bank statis di perangkat). Edit lewat admin / seed ulang.' : err.message)}</p>`; }
    if (q) {
      const per = opsi => opsi.map((_, i) => (Array.isArray(q.pembahasanPilihan) && q.pembahasanPilihan[i]) || q.pembahasan_klinis?.[L[i]] || '');
      const pr = per(q.opsi);
      bodyEl.innerHTML = `<label class="qe-lab">Soal</label><textarea rows="4" data-qe="soal">${esc(q.soal)}</textarea>
        <label class="qe-lab">Pilihan &amp; kunci <small>(bulatan = kunci jawaban)</small></label>
        ${q.opsi.map((o, i) => `<div class="qe-opt"><label class="qe-key"><input type="radio" name="qeKey" value="${i}" ${q.jawabanBenar === i ? 'checked' : ''}><span>${L[i]}</span></label><div class="qe-opt-fields"><input type="text" data-qe-o="${i}" value="${esc(o)}" aria-label="Pilihan ${L[i]}"><textarea rows="2" data-qe-p="${i}" placeholder="Pembahasan pilihan ${L[i]} (opsional)">${esc(pr[i])}</textarea></div></div>`).join('')}
        <label class="qe-lab">Konsep inti (pembahasan utama)</label><textarea rows="4" data-qe="pembahasan">${esc(q.pembahasan || '')}</textarea>
        <label class="qe-lab">Catatan klinis <small>(opsional)</small></label><textarea rows="2" data-qe="catatanKlinis">${esc(q.catatanKlinis || '')}</textarea>
        <p class="muted qe-note">Perubahan berlaku untuk semua pengguna.</p>`;
      saveBtn.disabled = false;
    }
    layer.addEventListener('click', async e => {
      if (e.target === layer || e.target.closest('[data-qe-cancel]')) return close();
      if (!e.target.closest('[data-qe-save]') || !q) return;
      const v = k => layer.querySelector(`[data-qe="${k}"]`).value;
      const opsi = [...layer.querySelectorAll('[data-qe-o]')].map(i => i.value.trim());
      const key = layer.querySelector('input[name="qeKey"]:checked');
      if (!v('soal').trim() || opsi.some(x => !x)) return toast('Soal dan semua pilihan harus diisi.', true);
      if (!key) return toast('Pilih kunci jawaban dulu.', true);
      saveBtn.disabled = true; saveBtn.textContent = 'Menyimpan…';
      try {
        const d = await call(urlOf(t), { method: 'PATCH', body: JSON.stringify({
          soal: v('soal'), opsi, jawabanBenar: Number(key.value), pembahasan: v('pembahasan'), catatanKlinis: v('catatanKlinis'),
          pembahasanPilihan: [...layer.querySelectorAll('[data-qe-p]')].map(i => i.value) }) });
        close(); toast('Soal diperbarui ✅');
        try { t.onSaved?.(d.question); } catch (err) { console.warn(err); }
      } catch (err) { saveBtn.disabled = false; saveBtn.textContent = 'Simpan'; toast(err.message, true); }
    });
  }
  window.clinedEditQuestion = open;
  window.clinedCanEditQuestions = canEdit;

  /* Tombol di layar kuis utama (UAB / bank) */
  function ensureQuizButton() {
    const rep = document.getElementById('reportQBtn');
    if (!rep) return;
    let b = document.getElementById('editQBtn');
    if (!b) { b = document.createElement('button'); b.id = 'editQBtn'; b.type = 'button'; b.className = 'text-btn'; b.textContent = '✏️ Edit jawaban & pembahasan'; rep.after(b); }
    b.hidden = !canEdit();
  }
  document.addEventListener('click', e => {
    if (!e.target.closest('#editQBtn')) return;
    window.clinedEditCurrentQuiz?.();
  });
  setInterval(ensureQuizButton, 1500);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensureQuizButton); else ensureQuizButton();
})();
