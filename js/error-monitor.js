/* CLINED · Lightweight First-Party Frontend Error Monitor (CSP connect-src 'self' safe)
   Menangkap runtime error & unhandled promise rejection dari perangkat pengguna (termasuk iOS/iPadOS PWA)
   dengan deduplikasi, pembatasan kuota, dan tanpa PII/token. */
(() => {
  'use strict';

  const ENDPOINT = '/api/client-errors';
  const MAX_REPORTS_PER_SESSION = 8;
  const IGNORED_RE = /^(?:Script error\.?|ResizeObserver loop|Non-Error promise rejection|Load failed|AbortError)/i;
  const IGNORED_SOURCE_RE = /(?:tako\.id|chrome-extension:|safari-extension:|moz-extension:)/i;

  let sentCount = 0;
  const seen = new Set();

  function activeViewId() {
    try {
      return document.querySelector('.view.active')?.id || location.pathname || '';
    } catch {
      return '';
    }
  }

  function cleanText(v, maxLen = 300) {
    return String(v ?? '')
      .replace(/clined_session=[^;\s]+/gi, 'clined_session=[redacted]')
      .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redacted]')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, maxLen);
  }

  function report(payload) {
    if (sentCount >= MAX_REPORTS_PER_SESSION) return false;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
    const message = cleanText(payload?.message, 320);
    const source = cleanText(payload?.source, 200);
    if (!message || IGNORED_RE.test(message) || IGNORED_SOURCE_RE.test(source) || IGNORED_SOURCE_RE.test(message)) {
      return false;
    }
    const kind = payload?.kind === 'unhandledrejection' ? 'unhandledrejection' : 'error';
    const line = Math.max(0, Math.floor(Number(payload?.line) || 0));
    const col = Math.max(0, Math.floor(Number(payload?.col) || 0));
    const sig = `${kind}|${message.slice(0, 120)}|${source}|${line}`;
    if (seen.has(sig)) return false;
    seen.add(sig);
    sentCount++;

    const body = JSON.stringify({
      kind,
      message,
      source,
      line,
      col,
      stack: cleanText(payload?.stack, 900),
      viewId: cleanText(activeViewId(), 64),
      appVersion: cleanText(document.querySelector('meta[name="clined-release"]')?.content || '', 64)
    });

    try {
      if (typeof fetch === 'function') {
        fetch(ENDPOINT, {
          method: 'POST',
          credentials: 'same-origin',
          keepalive: true,
          headers: { 'Content-Type': 'application/json' },
          body
        }).catch(() => {});
        return true;
      }
      if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        const blob = new Blob([body], { type: 'application/json' });
        return navigator.sendBeacon(ENDPOINT, blob);
      }
      return false;
    } catch {
      return false;
    }
  }

  window.addEventListener('error', e => {
    report({
      kind: 'error',
      message: e?.message || e?.error?.message || '',
      source: e?.filename || '',
      line: e?.lineno || 0,
      col: e?.colno || 0,
      stack: e?.error?.stack || ''
    });
  });

  window.addEventListener('unhandledrejection', e => {
    const r = e?.reason;
    const msg = (r && typeof r === 'object') ? (r.message || String(r)) : String(r ?? '');
    const stack = (r && typeof r === 'object' && r.stack) ? String(r.stack) : '';
    report({
      kind: 'unhandledrejection',
      message: msg,
      source: '',
      line: 0,
      col: 0,
      stack
    });
  });

  window.CLINED_ERROR_MONITOR = { report, cleanText };
})();
