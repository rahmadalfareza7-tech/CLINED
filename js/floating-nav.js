/* CLINED · Floating Dashboard Navigation (extracted from app.html for strict CSP script-src 'self') */
(() => {
  'use strict';

  function boot() {
    const nav = document.getElementById('floatingDashboardNav');
    if (!nav || nav.dataset.finalNavBound === '1') return;
    nav.dataset.finalNavBound = '1';

    function setActive(key) {
      nav.querySelectorAll('[data-floating-nav]').forEach(b => {
        b.classList.toggle('active', b.dataset.floatingNav === key);
      });
      const items = [...nav.querySelectorAll('[data-floating-nav]')];
      const i = items.findIndex(b => b.dataset.floatingNav === key);
      nav.style.setProperty('--floating-index', String(Math.max(0, i)));
    }

    let lastNavKey = '';
    let lastNavAt = 0;
    function route(key) {
      const now = Date.now();
      if (key === lastNavKey && now - lastNavAt < 220) return;
      lastNavKey = key;
      lastNavAt = now;

      if (key === 'chat' && window.CLINED_SOCIAL && window.CLINED_SOCIAL.openChat) {
        setActive(key);
        try { window.CLINED_SOCIAL.openChat(); } catch (e) { console.warn(e); }
        window.scrollTo(0, 0);
        return;
      }

      const target = {
        home: 'home',
        dashboard: 'clinicalDashboard',
        uab: 'uabPage',
        chat: 'hubPage',
        account: 'accountPage'
      }[key];
      if (!target || !document.getElementById(target)) return;

      if (typeof window.show === 'function') {
        window.show(target);
      } else {
        document.querySelectorAll('.view.active').forEach(v => v.classList.remove('active'));
        document.getElementById(target).classList.add('active');
      }
      setActive(key);
      if (key === 'dashboard' && typeof window.renderClinicalDashboard === 'function') {
        try { window.renderClinicalDashboard(); } catch (e) { console.warn(e); }
      }
      if (key === 'uab' && typeof window.syncUabStats === 'function') {
        try { window.syncUabStats(); } catch (e) { console.warn(e); }
      }
      if (key === 'account' && typeof window.renderAccount === 'function') {
        try { window.renderAccount(); } catch (e) { console.warn(e); }
      }
      window.scrollTo(0, 0);
    }

    nav.addEventListener('click', e => {
      const btn = e.target.closest('[data-floating-nav]');
      if (!btn || !nav.contains(btn)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      route(btn.dataset.floatingNav);
    }, true);

    nav.addEventListener('pointerup', e => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const btn = e.target.closest('[data-floating-nav]');
      if (!btn || !nav.contains(btn)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      route(btn.dataset.floatingNav);
    }, true);

    // Keep the selected item synchronized whenever the SPA router changes page.
    window.addEventListener('clined:view-change', e => {
      const map = {
        home: 'home',
        clinicalDashboard: 'dashboard',
        uabPage: 'uab',
        hubPage: 'chat',
        accountPage: 'account'
      };
      if (map[e.detail]) setActive(map[e.detail]);
    });
    setActive('home');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
  window.addEventListener('load', boot, { once: true });
})();
