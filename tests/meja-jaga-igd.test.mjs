import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { isValidSyncKey, mergeJsonKey } from '../lib/sync-merge.mjs';

const ROOT = new URL('..', import.meta.url);
const readRel = p => fs.readFileSync(new URL(p, ROOT), 'utf8');

function loadModule() {
  const store = {};
  const listeners = {};
  const win = {
    addEventListener: (ev, fn) => { (listeners[ev] ||= []).push(fn); },
    show: () => {},
    scrollTo: () => {}
  };
  const ctx = vm.createContext({
    window: win,
    document: {
      getElementById: () => null,
      addEventListener: () => {},
      body: { classList: { toggle: () => {}, remove: () => {} } }
    },
    localStorage: {
      getItem: k => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: k => { delete store[k]; }
    },
    Date,
    Math,
    JSON,
    Object,
    Array,
    Number,
    String,
    console
  });
  vm.runInContext(readRel('js/meja-jaga-igd.js'), ctx);
  return { CLINED_IGD: ctx.window.CLINED_IGD, store };
}

test('Progress.record tracks best score, unique solved cases, runs, and perfect shifts', () => {
  const { CLINED_IGD, store } = loadModule();
  assert.ok(CLINED_IGD?.Progress);

  assert.equal(CLINED_IGD.Progress.statsHtml(12), '');

  const r1 = CLINED_IGD.Progress.record({
    score: 640,
    ok: 6,
    total: 8,
    lives: 2,
    solvedIds: ['asma-propranolol', 'furosemid-gram', 'asma-propranolol']
  });
  assert.equal(r1.isBest, true);
  assert.deepEqual([...r1.newIds], ['asma-propranolol', 'furosemid-gram']);
  assert.equal(r1.p.best, 640);
  assert.equal(r1.p.bestOk, 6);
  assert.equal(r1.p.runs, 1);
  assert.equal(r1.p.perfect, 0);
  assert.match(r1.html, /Rekor baru!/);
  assert.match(r1.html, /\+2 berkas baru dikuasai/);

  const r2 = CLINED_IGD.Progress.record({
    score: 980,
    ok: 8,
    total: 8,
    lives: 3,
    solvedIds: ['asma-propranolol', 'stemi-aman']
  });
  assert.equal(r2.isBest, true);
  assert.deepEqual([...r2.newIds], ['stemi-aman']);
  assert.equal(r2.p.best, 980);
  assert.equal(r2.p.bestOk, 8);
  assert.equal(r2.p.runs, 2);
  assert.equal(r2.p.perfect, 1);
  assert.deepEqual(Object.keys(r2.p.solved).sort(), ['asma-propranolol', 'furosemid-gram', 'stemi-aman']);

  const r3 = CLINED_IGD.Progress.record({
    score: 400,
    ok: 4,
    total: 8,
    lives: 1,
    solvedIds: ['stemi-aman']
  });
  assert.equal(r3.isBest, false);
  assert.deepEqual([...r3.newIds], []);
  assert.equal(r3.p.best, 980);
  assert.equal(r3.p.runs, 3);
  assert.match(CLINED_IGD.Progress.statsHtml(12), /Rekor <b>980<\/b>/);
  assert.match(CLINED_IGD.Progress.statsHtml(12), /3\/12/);

  // Corrupt JSON falls back safely
  store.clined_igd_v1 = '{broken';
  assert.equal(CLINED_IGD.Progress.read().best, 0);
});

test('clined_igd_v1 is sync-eligible and merges cleanly across two devices', () => {
  assert.equal(isValidSyncKey('clined_igd_v1'), true);

  const devA = JSON.stringify({
    best: 820,
    bestOk: 7,
    runs: 3,
    perfect: 0,
    solved: { 'asma-propranolol': 1, 'stemi-aman': 1 },
    at: 1700000100000
  });
  const devB = JSON.stringify({
    best: 760,
    bestOk: 8,
    runs: 2,
    perfect: 1,
    solved: { 'stemi-aman': 1, 'metformin-aki': 1 },
    at: 1700000200000
  });

  const merged = mergeJsonKey('clined_igd_v1', devA, devB);
  assert.ok(merged);
  const parsed = JSON.parse(merged.value);
  assert.equal(parsed.best, 820);
  assert.equal(parsed.bestOk, 8);
  assert.equal(parsed.runs, 3);
  assert.equal(parsed.perfect, 1);
  assert.deepEqual(parsed.solved, {
    'asma-propranolol': 1,
    'stemi-aman': 1,
    'metformin-aki': 1
  });
  assert.equal(merged.dirty, true);
});

test('CSP & asset integrity: self-hosted fonts exist, no external URLs or nested & CSS', () => {
  const css = readRel('css/meja-jaga-igd.css');
  const js = readRel('js/meja-jaga-igd.js');

  assert.doesNotMatch(css, /url\(\s*['"]?https?:\/\//i, 'CSS must not load external url() (blocked by CSP)');
  assert.doesNotMatch(css, /@import\b/i, 'CSS must not use @import');
  assert.doesNotMatch(js, /fonts\.googleapis\.com|fonts\.gstatic\.com/i);
  assert.doesNotMatch(css, /(^|\s)&[.:#\[]/, 'CSS must be flat (no nesting) for older Safari compatibility');

  const fontUrls = [...css.matchAll(/url\(\.\.\/(assets\/fonts\/igd\/[^)]+\.woff2)\)/g)].map(m => m[1]);
  assert.ok(fontUrls.length >= 4, 'Expected self-hosted woff2 fonts');
  for (const rel of new Set(fontUrls)) {
    const stat = fs.statSync(new URL(rel, ROOT));
    assert.ok(stat.size > 1000, `Font file ${rel} must be non-empty`);
  }
});

test('App wiring: view, menu, lazy bundle, BUSY_VIEWS, SW version parity, and font MIME', () => {
  const appHtml = readRel('app.html');
  const lazyJs = readRel('js/lazy-loader.js');
  const swJs = readRel('sw.js');
  const updJs = readRel('js/update-notice.js');
  const serverJs = readRel('local-server.mjs');
  const syncJs = readRel('js/online-sync.js');

  assert.match(appHtml, /id="mejaJagaIgdPage"/);
  assert.match(appHtml, /id="mejaJagaIgdHost"/);
  assert.match(appHtml, /id="igdMenuBtn"/);
  assert.match(lazyJs, /igd:\s*\{/);
  assert.match(lazyJs, /id\s*=\s*'igdStudyToolBtn'/);
  assert.match(updJs, /'mejaJagaIgdPage'/);
  assert.match(syncJs, /'clined_igd_v1'/);
  assert.match(serverJs, /'\.woff2':'font\/woff2'/);

  const swVer = swJs.match(/const SW_VERSION = '([^']+)'/)?.[1];
  const updVer = updJs.match(/const APP_SW_VERSION = '([^']+)'/)?.[1];
  assert.ok(swVer && updVer && swVer === updVer, `SW_VERSION (${swVer}) must match APP_SW_VERSION (${updVer})`);
});
