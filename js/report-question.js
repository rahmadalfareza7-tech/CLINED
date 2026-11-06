/* CLINED — laporan soal → server (kotak masuk admin). Jika gagal/offline: salin detail + buka formulir (cara lama). */
(() => {
  'use strict';
  const CATS = [['key', 'Kunci jawaban salah'], ['typo', 'Salah ketik / data janggal'], ['ambiguous', 'Soal ambigu'], ['explanation', 'Pembahasan keliru'], ['other', 'Lainnya']];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = (m, e) => window.showToast?.(m, !!e);
  let busy = false;

  function legacy(d) {
    try { navigator.clipboard?.writeText(d.text || ''); } catch {}
    toast('Detail soal disalin. Tempel di formulir masukan ya 🙏');
    const url = document.getElementById('feedback')?.href;
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  }

  async function send(d, category, note) {
    const r = await fetch('/api/question-reports', {
      method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: d.id, source: d.source || 'bank', bank: d.bank || '', snippet: d.soal || '', category, note })
    });
    if (!r.ok) { const e = new Error('HTTP ' + r.status); e.status = r.status; throw e; }
  }

  function report(d) {
    if (!d || !d.id || busy) return;
    document.querySelector('.rq-layer')?.remove();
    const layer = document.createElement('div');
    layer.className = 'cdlg-layer rq-layer';
    layer.innerHTML = `<div class="cdlg-card" role="dialog" aria-modal="true" aria-labelledby="rqT" data-tone="warn">
      <div class="cdlg-head"><span class="cdlg-ico" aria-hidden="true">🚩</span><h3 class="cdlg-title" id="rqT">Laporkan soal ini</h3></div>
      <div class="cdlg-body"><p>Apa yang bermasalah?</p>
        <div class="rq-cats" role="radiogroup" aria-label="Jenis masalah">${CATS.map(([k, l], i) => `<button type="button" class="rq-cat${i === 0 ? ' on' : ''}" role="radio" aria-checked="${i === 0}" data-rq-cat="${k}">${esc(l)}</button>`).join('')}</div>
        <textarea class="rq-note" rows="3" maxlength="600" placeholder="Catatan (opsional): mis. menurut buku X jawabannya C…" aria-label="Catatan"></textarea></div>
      <div class="cdlg-actions"><button type="button" class="secondary" data-rq-cancel>Batal</button><button type="button" class="primary" data-rq-send>Kirim laporan</button></div></div>`;
    let cat = 'key';
    const close = () => { layer.classList.remove('show'); setTimeout(() => layer.remove(), 260); };
    layer.addEventListener('click', async e => {
      const c = e.target.closest('[data-rq-cat]');
      if (c) { cat = c.dataset.rqCat; layer.querySelectorAll('.rq-cat').forEach(b => { const on = b === c; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); }); return; }
      if (e.target === layer || e.target.closest('[data-rq-cancel]')) return close();
      if (e.target.closest('[data-rq-send]')) {
        const btn = e.target.closest('[data-rq-send]'); busy = true; btn.disabled = true; btn.textContent = 'Mengirim…';
        try { await send(d, cat, layer.querySelector('.rq-note').value); close(); toast('Laporan terkirim. Terima kasih sudah membantu! 🙏'); }
        catch (err) {
          close();
          if (err.status === 401 || err.status === 403) toast('Masuk dulu untuk mengirim laporan. Detail soal disalin sebagai cadangan.', true);
          legacy(d);
        } finally { busy = false; }
      }
    });
    document.body.appendChild(layer);
    requestAnimationFrame(() => layer.classList.add('show'));
  }

  window.clinedReportQuestion = report;
})();
