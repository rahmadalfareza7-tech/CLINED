import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { isValidSyncKey, mergeJsonKey } from '../lib/sync-merge.mjs';

const ROOT = new URL('..', import.meta.url);
const readRel = p => fs.readFileSync(new URL(p, ROOT), 'utf8');

function loadModule(initialStore = {}) {
  const store = { ...initialStore };
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
      documentElement: { classList: { toggle: () => {}, remove: () => {} } },
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

test('Progress.record tracks per-night best scores, completion, unlock, and unique solved cases', () => {
  const { CLINED_IGD, store } = loadModule();
  assert.ok(CLINED_IGD?.Progress);
  assert.equal(CLINED_IGD.Progress.KEY, 'clined_igd_v2');

  const init = CLINED_IGD.Progress.read();
  assert.equal(init.unlocked, 1);
  assert.deepEqual({ ...init.best }, {});
  assert.deepEqual({ ...init.done }, {});

  // First clear of Malam 1
  const r1 = CLINED_IGD.Progress.record({
    night: 1,
    score: 640,
    ok: 5,
    total: 6,
    alive: true,
    solvedIds: ['tn-budi-santoso', 'an-raka-pratama', 'tn-budi-santoso']
  });
  assert.equal(r1.isBest, true);
  assert.equal(r1.newlyClearedNight, true);
  assert.deepEqual([...r1.newIds], ['tn-budi-santoso', 'an-raka-pratama']);
  assert.equal(r1.p.best[1], 640);
  assert.equal(r1.p.done[1], true);
  assert.equal(r1.p.unlocked, 2);
  assert.equal(r1.p.runs, 1);

  // Replay Malam 1 with higher score -> no newlyClearedNight, only new case id counted
  const r2 = CLINED_IGD.Progress.record({
    night: 1,
    score: 790,
    ok: 6,
    total: 6,
    alive: true,
    solvedIds: ['tn-budi-santoso', 'ny-sari-wulandari']
  });
  assert.equal(r2.isBest, true);
  assert.equal(r2.newlyClearedNight, false);
  assert.deepEqual([...r2.newIds], ['ny-sari-wulandari']);
  assert.equal(r2.p.best[1], 790);
  assert.equal(r2.p.runs, 2);

  // Failed shift on Mode Sulit (night 6): records high score if > 0, does not mark done
  const r3 = CLINED_IGD.Progress.record({
    night: 6,
    score: 320,
    ok: 3,
    total: 10,
    alive: false,
    solvedIds: ['tn-darmawan']
  });
  assert.equal(r3.isBest, true);
  assert.equal(r3.newlyClearedNight, false);
  assert.equal(r3.p.best[6], 320);
  assert.equal(r3.p.done[6], undefined);
  assert.deepEqual([...r3.newIds], ['tn-darmawan']);

  // Corrupt JSON falls back safely
  store.clined_igd_v2 = '{broken';
  assert.equal(CLINED_IGD.Progress.read().unlocked, 1);
});

test('Progress.read migrates legacy standalone igd-meja-jaga-v1 data once', () => {
  const { CLINED_IGD, store } = loadModule({
    'igd-meja-jaga-v1': JSON.stringify({
      unlocked: 4,
      best: { 1: 710, 2: 650, 3: 590 },
      done: { 1: true, 2: true, 3: true }
    })
  });
  const migrated = CLINED_IGD.Progress.read();
  assert.equal(migrated.unlocked, 4);
  assert.equal(migrated.best[1], 710);
  assert.equal(migrated.done[3], true);
  assert.ok(store.clined_igd_v2, 'Expected migrated progress written to clined_igd_v2');
});

test('clined_igd_v2 is sync-eligible and merges per-night scores, unlocks, and solved cases across devices', () => {
  assert.equal(isValidSyncKey('clined_igd_v2'), true);

  const devA = JSON.stringify({
    unlocked: 3,
    best: { 1: 820, 2: 610 },
    done: { 1: true, 2: true },
    solved: { 'tn-budi-santoso': 1, 'ny-sari-wulandari': 1 },
    runs: 4,
    at: 1700000100000
  });
  const devB = JSON.stringify({
    unlocked: 5,
    best: { 1: 760, 2: 740, 4: 880, 6: 950 },
    done: { 1: true, 4: true, 6: true },
    solved: { 'ny-sari-wulandari': 1, 'tn-darmawan': 1 },
    runs: 3,
    at: 1700000200000
  });

  const merged = mergeJsonKey('clined_igd_v2', devA, devB);
  assert.ok(merged);
  const parsed = JSON.parse(merged.value);
  assert.equal(parsed.unlocked, 5);
  assert.deepEqual(parsed.best, { 1: 820, 2: 740, 4: 880, 6: 950 });
  assert.deepEqual(parsed.done, { 1: true, 2: true, 4: true, 6: true });
  assert.deepEqual(parsed.solved, {
    'tn-budi-santoso': 1,
    'ny-sari-wulandari': 1,
    'tn-darmawan': 1
  });
  assert.equal(parsed.runs, 4);
  assert.equal(merged.dirty, true);
});

test('CSP & asset integrity: self-hosted Nunito/Caveat fonts exist, flat CSS with balanced braces, no external URLs', () => {
  const css = readRel('css/meja-jaga-igd.css');
  const js = readRel('js/meja-jaga-igd.js');

  assert.doesNotMatch(css, /url\(\s*['"]?https?:\/\//i, 'CSS must not load external url() (blocked by CSP)');
  assert.doesNotMatch(css, /@import\b/i, 'CSS must not use @import');
  assert.doesNotMatch(js, /fonts\.googleapis\.com|fonts\.gstatic\.com/i);
  assert.doesNotMatch(css, /(^|\s)&[.:#\[]/, 'CSS must be flat (no nesting) for older Safari compatibility');

  let depth = 0;
  for (const ch of css) {
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    assert.ok(depth >= 0, 'Unbalanced closing brace in CSS');
  }
  assert.equal(depth, 0, 'Unclosed brace in CSS');

  const fontUrls = [...css.matchAll(/url\(\.\.\/(assets\/fonts\/igd\/[^)]+\.woff2)\)/g)].map(m => m[1]);
  assert.ok(fontUrls.length >= 2, 'Expected self-hosted woff2 fonts');
  for (const rel of new Set(fontUrls)) {
    const stat = fs.statSync(new URL(rel, ROOT));
    assert.ok(stat.size > 1000, `Font file ${rel} must be non-empty`);
  }
});

test('App wiring: view, menu, lazy v2 bundle, exit controls, BUSY_VIEWS, SW parity, and font MIME', () => {
  const appHtml = readRel('app.html');
  const lazyJs = readRel('js/lazy-loader.js');
  const swJs = readRel('sw.js');
  const updJs = readRel('js/update-notice.js');
  const serverJs = readRel('local-server.mjs');
  const syncJs = readRel('js/online-sync.js');
  const igdJs = readRel('js/meja-jaga-igd.js');

  assert.match(appHtml, /id="mejaJagaIgdPage"/);
  assert.match(appHtml, /id="mejaJagaIgdHost"/);
  assert.match(appHtml, /id="igdMenuBtn"/);
  assert.match(lazyJs, /css\/meja-jaga-igd\.css\?v=2/);
  assert.match(lazyJs, /js\/meja-jaga-igd\.js\?v=2/);
  assert.match(lazyJs, /id\s*=\s*'igdStudyToolBtn'/);
  assert.match(updJs, /'mejaJagaIgdPage'/);
  assert.match(syncJs, /'clined_igd_v2'/);
  assert.match(serverJs, /'\.woff2':'font\/woff2'/);
  assert.match(igdJs, /data-act="exit"/);
  assert.match(igdJs, /FIT\.disable\(\)/);

  const swVer = swJs.match(/const SW_VERSION = '([^']+)'/)?.[1];
  const updVer = updJs.match(/const APP_SW_VERSION = '([^']+)'/)?.[1];
  assert.ok(swVer && updVer && swVer === updVer, `SW_VERSION (${swVer}) must match APP_SW_VERSION (${updVer})`);
});
