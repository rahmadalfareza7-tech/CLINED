/* CLINED — dialog konfirmasi bergaya aplikasi (pengganti confirm/alert bawaan HP), meluncur dari atas.
   Pakai: await clinedConfirm({ title, lines|text, ok, cancel, tone, icon }) -> true/false */
(() => {
  'use strict';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const bold = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  let open = null;

  function clinedConfirm(o = {}) {
    if (open) open.finish(false);
    return new Promise(resolve => {
      const tone = o.tone || 'warn';
      const icon = o.icon || (tone === 'danger' ? '🗑️' : tone === 'info' ? 'ℹ️' : '⚠️');
      const lines = Array.isArray(o.lines) ? o.lines : (o.text ? String(o.text).split('\n\n') : []);
      const body = lines.map(l => Array.isArray(l) ? `<ul>${l.map(x => `<li>${bold(x)}</li>`).join('')}</ul>` : `<p>${bold(l)}</p>`).join('');
      const layer = document.createElement('div');
      layer.className = 'cdlg-layer';
      layer.innerHTML = `<div class="cdlg-card" role="alertdialog" aria-modal="true" aria-labelledby="cdlgT" data-tone="${esc(tone)}">
        <div class="cdlg-head"><span class="cdlg-ico" aria-hidden="true">${icon}</span><h3 class="cdlg-title" id="cdlgT">${esc(o.title || 'Konfirmasi')}</h3></div>
        <div class="cdlg-body">${body}</div>
        <div class="cdlg-actions${o.cancel === false ? ' single' : ''}">
          ${o.cancel === false ? '' : `<button type="button" class="secondary cdlg-cancel">${esc(o.cancel || 'Batal')}</button>`}
          <button type="button" class="primary cdlg-ok" data-tone="${esc(tone)}">${esc(o.ok || 'Lanjut')}</button>
        </div></div>`;
      const prevFocus = document.activeElement;
      const finish = v => {
        if (!open) return; open = null;
        document.removeEventListener('keydown', onKey, true);
        layer.classList.remove('show');
        setTimeout(() => { layer.remove(); try { prevFocus?.focus?.(); } catch {} }, 260);
        resolve(v);
      };
      const onKey = e => { if (e.key === 'Escape') { e.preventDefault(); finish(false); } };
      layer.addEventListener('click', e => {
        if (e.target.closest('.cdlg-ok')) return finish(true);
        if (e.target.closest('.cdlg-cancel') || e.target === layer) return finish(false);
      });
      document.addEventListener('keydown', onKey, true);
      document.body.appendChild(layer);
      open = { finish };
      requestAnimationFrame(() => { layer.classList.add('show'); layer.querySelector('.cdlg-ok')?.focus({ preventScroll: true }); });
    });
  }

  const notify = (msg, isErr) => (window.showToast ? window.showToast(msg, !!isErr) : null);

  window.clinedConfirm = clinedConfirm;
  window.clinedNotify = notify;
})();
