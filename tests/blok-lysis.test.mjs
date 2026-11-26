import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { isValidSyncKey, mergeJsonKey, reconcileBlokLysisWithStats, sanitizeBlokLysisStats } from '../lib/sync-merge.mjs';

const ROOT = new URL('..', import.meta.url);
const readRel = p => fs.readFileSync(new URL(p, ROOT), 'utf8');

function makeBoard(fill = -1) {
  return Array.from({ length: 8 }, () => Array(8).fill(fill));
}

function loadBlokLysisModule(initialStore = {}) {
  const store = { ...initialStore };
  const listeners = {};
  const win = {
    addEventListener: (ev, fn) => { (listeners[ev] ||= []).push(fn); },
    dispatchEvent: () => {},
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
      removeItem: k => { delete store[k]; },
      key: i => Object.keys(store)[i] ?? null,
      get length() { return Object.keys(store).length; }
    },
    Date,
    Math,
    JSON,
    Object,
    Array,
    Number,
    String,
    Set,
    Map,
    console
  });
  vm.runInContext(readRel('js/blok-lysis.js'), ctx);
  return { BL: ctx.window.CLINED_BLOK_LYSIS, store };
}

function loadOnlineSyncClient(initialStore = {}) {
  const store = { ...initialStore };
  const dispatched = [];
  const ls = {
    getItem: k => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; },
    key: i => Object.keys(store)[i] ?? null,
    get length() { return Object.keys(store).length; }
  };
  const ss = {};
  const sessionStorage = {
    getItem: k => (Object.prototype.hasOwnProperty.call(ss, k) ? ss[k] : null),
    setItem: (k, v) => { ss[k] = String(v); },
    removeItem: k => { delete ss[k]; }
  };
  const win = {
    location: { protocol: 'https:', origin: 'https://clined.test', hostname: 'clined.test', pathname: '/app.html' },
    localStorage: ls,
    sessionStorage,
    navigator: { onLine: true, sendBeacon: () => true },
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: ev => { dispatched.push(ev); },
    CustomEvent: class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } },
    Event: class Event { constructor(type) { this.type = type; } },
    setTimeout: () => 1,
    clearTimeout: () => {},
    setInterval: () => 1,
    clearInterval: () => {},
    fetch: async () => ({ ok: true, status: 200, json: async () => ({ mode: 'full', state: {}, updatedAt: new Date().toISOString() }) })
  };
  const doc = {
    visibilityState: 'visible',
    addEventListener: () => {},
    querySelector: () => null,
    getElementById: () => null
  };
  const ctx = vm.createContext({
    window: win,
    self: win,
    document: doc,
    localStorage: ls,
    sessionStorage,
    navigator: win.navigator,
    location: win.location,
    fetch: win.fetch,
    CustomEvent: win.CustomEvent,
    Event: win.Event,
    setTimeout: win.setTimeout,
    clearTimeout: win.clearTimeout,
    setInterval: win.setInterval,
    clearInterval: win.clearInterval,
    Storage: function Storage() {},
    Date,
    Math,
    JSON,
    Object,
    Array,
    Number,
    String,
    Boolean,
    Set,
    Map,
    Promise,
    Error,
    RegExp,
    URL,
    Blob: class Blob { constructor(p) { this.p = p; } },
    console
  });
  ctx.Storage.prototype = ls;
  vm.runInContext(readRel('js/online-sync.js'), ctx);
  return { sync: ctx.window.CLINED_ONLINE_SYNC, store, dispatched };
}

test('Blok Lysis Storage: monotonic career stats, tombstone clear, zero unowned key bleed', () => {
  const { BL, store } = loadBlokLysisModule({
    'blokpecah:v1': JSON.stringify({ best: 99999, games: 99, lines: 500, bestCombo: 9 })
  });
  assert.ok(BL?.Storage);
  assert.equal(BL.Storage.STATS_KEY, 'clined_blok_lysis_v1');
  assert.equal(BL.Storage.SESSION_KEY, 'clined_blok_lysis_session_v1');

  // Must NEVER import unowned legacy standalone keys (prevents cross-account bleed)
  const initial = BL.Storage.readStats();
  assert.equal(initial.best, 0);
  assert.equal(initial.games, 0);

  const w1 = BL.Storage.writeStats({ best: 1240, games: 3, lines: 18, bestCombo: 4, last: 900, lastAt: 1000 });
  assert.equal(w1.best, 1240);
  assert.equal(w1.games, 3);
  assert.equal(w1.bestCombo, 4);
  assert.equal(w1.last, 900);

  // Writing lower values never regresses monotonic career stats
  const w2 = BL.Storage.writeStats({ best: 400, games: 1, lines: 5, bestCombo: 2, last: 400, lastAt: 2000 });
  assert.equal(w2.best, 1240);
  assert.equal(w2.games, 3);
  assert.equal(w2.lines, 18);
  assert.equal(w2.bestCombo, 4);
  assert.equal(w2.last, 400, 'Newer lastAt updates last score');

  // Active session save & tombstone clear
  const board = makeBoard(-1);
  board[0][0] = 2;
  const saved = BL.Storage.writeSession({ gid: 'g-1', board, tray: [null, null, null], score: 350, combo: 2, msc: 0, moves: 9 });
  assert.equal(saved.gid, 'g-1');
  assert.equal(BL.Storage.readSession()?.score, 350);

  BL.Storage.clearSession('g-1');
  assert.equal(BL.Storage.readSession(), null, 'Tombstoned session must not resume');
  const rawTomb = JSON.parse(store.clined_blok_lysis_session_v1);
  assert.equal(rawTomb.over, true);
  assert.ok(rawTomb.clearedAt > 0);
});

test('Server CRDT merge for clined_blok_lysis_v1 is strictly monotonic across devices', () => {
  assert.equal(isValidSyncKey('clined_blok_lysis_v1'), true);
  assert.equal(isValidSyncKey('clined_blok_lysis_session_v1'), true);

  const devA = JSON.stringify({ best: 2450, games: 7, lines: 42, bestCombo: 5, last: 1100, lastAt: 1700000100000, updatedAt: 1700000100000 });
  const devB = JSON.stringify({ best: 1800, games: 12, lines: 65, bestCombo: 8, last: 1800, lastAt: 1700000200000, updatedAt: 1700000200000 });

  const mAB = JSON.parse(mergeJsonKey('clined_blok_lysis_v1', devA, devB).value);
  const mBA = JSON.parse(mergeJsonKey('clined_blok_lysis_v1', devB, devA).value);
  assert.deepEqual(mAB, mBA, 'Merge must be commutative');
  assert.equal(mAB.best, 2450);
  assert.equal(mAB.games, 12);
  assert.equal(mAB.lines, 65);
  assert.equal(mAB.bestCombo, 8);
  assert.equal(mAB.last, 1800);
  assert.equal(mAB.lastAt, 1700000200000);
});

test('Server CRDT merge for clined_blok_lysis_session_v1: tombstone prevents ghost resurrection & same-gid advances monotonically', () => {
  const b1 = makeBoard(-1); b1[1][1] = 1;
  const b2 = makeBoard(-1); b2[1][1] = 1; b2[2][2] = 3;

  // Same game: higher moves wins even if clock skewed backward
  const early = JSON.stringify({ gid: 'game-42', board: b1, tray: [], score: 120, combo: 1, msc: 0, moves: 4, over: false, updated: 1700000500000 });
  const advanced = JSON.stringify({ gid: 'game-42', board: b2, tray: [], score: 480, combo: 3, msc: 0, moves: 11, over: false, updated: 1700000400000 });
  const mergedActive = JSON.parse(mergeJsonKey('clined_blok_lysis_session_v1', early, advanced).value);
  assert.equal(mergedActive.moves, 11);
  assert.equal(mergedActive.score, 480);

  // Same game finished/restarted on Device B (tombstone) vs stale active on Device A -> tombstone ALWAYS wins!
  const tombstone = JSON.stringify({ gid: 'game-42', over: true, clearedAt: 1700000300000, updated: 1700000300000 });
  const mTomb1 = JSON.parse(mergeJsonKey('clined_blok_lysis_session_v1', advanced, tombstone).value);
  const mTomb2 = JSON.parse(mergeJsonKey('clined_blok_lysis_session_v1', tombstone, advanced).value);
  assert.equal(mTomb1.over, true, 'Stale active device must never resurrect finished game');
  assert.equal(mTomb2.over, true, 'Tombstone wins regardless of merge order');

  // Different game: newer active game beats older tombstone
  const newGame = JSON.stringify({ gid: 'game-99', board: b1, tray: [], score: 40, combo: 0, msc: 0, moves: 1, over: false, updated: 1700000900000 });
  const mNew = JSON.parse(mergeJsonKey('clined_blok_lysis_session_v1', newGame, tombstone).value);
  assert.equal(mNew.gid, 'game-99');
  assert.equal(mNew.over, false);
});

test('reconcileBlokLysisWithStats heals stats.best upward when active session has higher score', () => {
  const b = makeBoard(-1); b[0][0] = 4;
  const stats = JSON.stringify({ best: 600, games: 2, lines: 10, bestCombo: 2, last: 500, lastAt: 1000, updatedAt: 1000 });
  const session = JSON.stringify({ gid: 'g-hi', board: b, tray: [], score: 1950, combo: 6, msc: 0, moves: 25, over: false, updated: 2000 });

  const rec = reconcileBlokLysisWithStats(stats, session);
  assert.equal(rec.changed, true);
  const healed = JSON.parse(rec.value);
  assert.equal(healed.best, 1950);
  assert.equal(healed.bestCombo, 6);
  assert.equal(healed.games, 2);

  // Already up-to-date -> no change
  const rec2 = reconcileBlokLysisWithStats(rec.value, session);
  assert.equal(rec2.changed, false);
});

test('Per-account isolation: online-sync switchUser wipes Blok Lysis keys cleanly (zero cross-account bleed)', () => {
  const b = makeBoard(-1); b[3][3] = 5;
  const { sync, store } = loadOnlineSyncClient({
    clined_blok_lysis_v1: JSON.stringify({ best: 8800, games: 15, lines: 90, bestCombo: 7, last: 3200, lastAt: 5000, updatedAt: 5000 }),
    clined_blok_lysis_session_v1: JSON.stringify({ gid: 'ua-1', board: b, tray: [], score: 1200, combo: 2, msc: 0, moves: 14, over: false, updated: 5000 })
  });
  assert.ok(sync);
  const res = sync.switchUser('user-b');
  assert.equal(res.changed, true);
  assert.equal(store.clined_blok_lysis_v1, undefined, 'User A stats must be wiped on switch to User B');
  assert.equal(store.clined_blok_lysis_session_v1, undefined, 'User A active board must be wiped on switch to User B');
});

test('Server sanitizeBlokLysisStats validates and clamps bounds safely', () => {
  assert.equal(sanitizeBlokLysisStats(null), null);
  assert.equal(sanitizeBlokLysisStats('not-json'), null);
  assert.equal(sanitizeBlokLysisStats([]), null);

  const clamped = sanitizeBlokLysisStats({ best: 999_999_999, games: -5, lines: 42.9, bestCombo: 9999, last: 320, lastAt: 123456 });
  assert.equal(clamped.best, 10_000_000);
  assert.equal(clamped.games, 0);
  assert.equal(clamped.lines, 42);
  assert.equal(clamped.bestCombo, 500);
  assert.equal(clamped.last, 320);
  assert.equal(clamped.lastAt, 123456);
});

test('CSS & CSP safety: flat Safari-compatible CSS, balanced braces, self-hosted Nunito only', () => {
  const blCss = readRel('css/blok-lysis.css');
  const blCssNoComments = blCss.replace(/\/\*[\s\S]*?\*\//g, '');
  const blJs = readRel('js/blok-lysis.js');

  assert.doesNotMatch(blCss, /fonts\.googleapis\.com|https?:\/\//, 'CSS must not reference external CDN URLs');
  assert.doesNotMatch(blJs, /fonts\.googleapis\.com|https?:\/\/|blokpecah:v1/, 'JS must not reference external CDNs or unowned standalone keys');
  assert.doesNotMatch(blCssNoComments, /&[.:#\[\s>+~]/, 'CSS must be 100% flat without nested & selectors for Safari compatibility');

  let depth = 0;
  for (const ch of blCssNoComments) {
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    assert.ok(depth >= 0, 'Unbalanced closing brace in css/blok-lysis.css');
  }
  assert.equal(depth, 0, 'Unclosed brace in css/blok-lysis.css');
  assert.match(blCss, /\.\.\/assets\/fonts\/igd\/nunito-600\.woff2/, 'Must use self-hosted Nunito font');
  assert.match(blCss, /#blokLysisPage\.motion-page-enter/, 'Must include PWA motion-page-enter transform guard');
});

test('Full CLINED app & server wiring for Blok Lysis + synced leaderboard', () => {
  const appHtml = readRel('app.html');
  const homeCss = readRel('css/home-ergonomic.css');
  const motionCss = readRel('css/motion.css');
  const appJs = readRel('js/app.js');
  const newFeatJs = readRel('js/new-features.js');
  const lazyJs = readRel('js/lazy-loader.js');
  const syncJs = readRel('js/online-sync.js');
  const updJs = readRel('js/update-notice.js');
  const usageJs = readRel('js/usage.js');
  const swJs = readRel('sw.js');
  const libApp = readRel('lib/app.mjs');
  const libSync = readRel('lib/sync.mjs');
  const migration = readRel('db/migrations/049_blok_lysis_scores.sql');

  // HTML hub card, view section, leaderboard tab
  assert.match(appHtml, /id="mgCardBlokLysis"[^>]*data-open-blok-lysis/);
  assert.match(appHtml, /id="mgBlStatus"/);
  assert.match(appHtml, /id="blokLysisPage"/);
  assert.match(appHtml, /id="blokLysisHost"/);
  assert.match(appHtml, /data-lb-tab="blok_lysis"/);

  // CSS & motion exclusion
  assert.match(homeCss, /\.mg-card-bl/);
  assert.match(homeCss, /\.mg-banner-bl/);
  assert.match(motionCss, /:not\(#blokLysisPage\)/);
  assert.match(appJs, /id!=="blokLysisPage"/);

  // Leaderboard tab + lazy loader + busy views + usage + SW precache
  assert.match(newFeatJs, /\/api\/leaderboard\?game=blok_lysis/);
  assert.match(newFeatJs, /\/api\/minigames\/blok-lysis\/score/);
  assert.match(newFeatJs, /tab === 'blok_lysis'/);
  assert.match(lazyJs, /blokLysis:\s*\{/);
  assert.match(lazyJs, /css\/blok-lysis\.css\?v=3/);
  assert.match(lazyJs, /js\/blok-lysis\.js\?v=3/);
  assert.match(lazyJs, /window\.CLINED_BLOK_LYSIS/);
  assert.match(lazyJs, /data-open-blok-lysis/);
  assert.match(lazyJs, /clined:sync-applied/);
  assert.match(syncJs, /'clined_blok_lysis_v1'/);
  assert.match(syncJs, /'clined_blok_lysis_session_v1'/);
  assert.match(updJs, /'blokLysisPage'/);
  assert.match(usageJs, /blokLysisPage:\s*'Blok Lysis'/);
  assert.match(swJs, /\.\/css\/blok-lysis\.css/);
  assert.match(swJs, /\.\/js\/blok-lysis\.js/);

  // Backend routes, bidirectional sync mirroring, and DB migration
  assert.match(libApp, /\/api\/minigames\/blok-lysis\/leaderboard/);
  assert.match(libApp, /\/api\/minigames\/blok-lysis\/score/);
  assert.match(libApp, /url\.searchParams\.get\('game'\)\s*===\s*'blok_lysis'/);
  assert.match(libSync, /upsertBlokLysisFromState/);
  assert.match(libSync, /getAuthoritativeBlokLysisRow/);
  assert.match(libSync, /reconcileBlokLysisWithStats/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS blok_lysis_scores/);
});

test('Balanced Anti-Trap Dealer rewards breathable solvability & line clears, avoids chokeholds & multi-heavy brick traps', () => {
  const { BL } = loadBlokLysisModule();
  const { Dealer } = BL;
  assert.ok(Dealer?.dealShapes && Dealer?.scoreCandidate && Dealer?.solve);

  // Chokehold tray (count=3, no clear) must score much lower than breathable clear-enabling tray (count=40, maxClear=1)
  const choke = Dealer.scoreCandidate({ shapes: [0, 1, 2], count: 3, maxClear: 0, minAfterPop: 42, cells: 9 }, 0.5, 32, 1);
  const fair = Dealer.scoreCandidate({ shapes: [0, 1, 2], count: 40, maxClear: 1, minAfterPop: 28, cells: 9 }, 0.5, 32, 1);
  assert.ok(fair > choke + 40, `Expected fair tray (${fair}) to strongly beat chokehold (${choke})`);

  // On a 50% filled board with 7-of-8 row ready to clear, dealShapes must deliver a solvable tray with <=1 heavy piece
  const midBoard = makeBoard(-1);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 7; c++) midBoard[r][c] = 1;
  const [lo, hi] = Dealer.boardBitsOf(midBoard);
  for (let i = 0; i < 15; i++) {
    const shapes = Dealer.dealShapes(midBoard, 2);
    assert.equal(shapes.length, 3);
    const sol = Dealer.solve(lo, hi, shapes, 60);
    assert.ok(sol.count >= 6, `Expected breathable solvability (>=6), got ${sol.count}`);
    const heavyCnt = shapes.filter(s => Dealer.HEAVY[s]).length;
    assert.ok(heavyCnt <= 1, `Never deal multiple heavy bricks on mid board, got ${heavyCnt}`);
  }
});

test('WebAudio SFX synthesizer plays tones when unmuted, respects mute toggle & persists clined_blok_lysis_sfx_v1', () => {
  let oscStarts = 0;
  let resumed = 0;
  const fakeAC = class MockAudioContext {
    constructor() { this.state = 'suspended'; this.currentTime = 0; this.destination = {}; }
    resume() { resumed++; this.state = 'running'; return Promise.resolve(); }
    createBuffer() { return {}; }
    createBufferSource() { return { buffer: null, connect: () => {}, start: () => {} }; }
    createOscillator() {
      return {
        type: 'sine',
        frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
        connect: () => {},
        start: () => { oscStarts++; },
        stop: () => {}
      };
    }
    createGain() {
      return {
        gain: { setValueAtTime: () => {}, linearRampToValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
        connect: () => {}
      };
    }
  };
  const store = {};
  const ctx = vm.createContext({
    window: { addEventListener: () => {}, AudioContext: fakeAC },
    document: { getElementById: () => null, addEventListener: () => {} },
    localStorage: {
      getItem: k => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: k => { delete store[k]; }
    },
    Date, Math, JSON, Object, Array, Number, String, Set, Map, Promise, console
  });
  vm.runInContext(readRel('js/blok-lysis.js'), ctx);
  const { SFX } = ctx.window.CLINED_BLOK_LYSIS;

  assert.equal(SFX.isMuted(), false, 'Sound defaults to ON');
  assert.equal(SFX.unlock(), true);
  assert.ok(resumed >= 1, 'AudioContext should resume on user gesture unlock');

  SFX.pickup();
  SFX.place(4);
  SFX.clear(2, 3, false);
  SFX.flatline();
  SFX.deal();
  SFX.newBest();
  SFX.gameOver();
  assert.ok(oscStarts >= 14, `Expected rich WebAudio tones scheduled, got ${oscStarts}`);

  // Muting persists '0' and silences all subsequent SFX calls
  assert.equal(SFX.toggleMute(), true);
  assert.equal(store.clined_blok_lysis_sfx_v1, '0');
  const countWhenMuted = oscStarts;
  SFX.pickup();
  SFX.place(3);
  SFX.clear(1, 2, false);
  assert.equal(oscStarts, countWhenMuted, 'Muted SFX must schedule 0 oscillators');

  // Unmuting persists '1' and plays confirmation tap
  assert.equal(SFX.toggleMute(), false);
  assert.equal(store.clined_blok_lysis_sfx_v1, '1');
  assert.ok(oscStarts > countWhenMuted, 'Unmuting should play confirmation tap');
});

test('reconcileLeaderboardRows upgrades stale server score, re-sorts to #1, recomputes ranks cleanly, and detects hidden Admin toggle', () => {
  const { BL } = loadBlokLysisModule();
  assert.equal(typeof BL.reconcileLeaderboardRows, 'function');

  const serverRows = [
    { rank: 1, id: 'u-rii', name: 'Rii', username: 'maurzm', bestScore: 1191, bestCombo: 4, totalLines: 30 },
    { rank: 2, id: 'u-her', name: 'dr. Herssen', username: 'thelazyraccoon', bestScore: 1171, bestCombo: 3, totalLines: 22 },
    { rank: 3, id: 'u-reza', name: 'Reza', username: 'reza', bestScore: 389, bestCombo: 5, totalLines: 16 }
  ];

  // Case 1: Existing student row on server is stale (389) while local best is 3794 -> MUST jump to #1 and recompute ALL ranks
  const studentRes = BL.reconcileLeaderboardRows(
    serverRows,
    { id: 'u-reza', name: 'Reza', username: 'reza', role: 'student', showInLeaderboard: true },
    { best: 3794, bestCombo: 7, lines: 54 },
    { serverMyRank: 3, serverMyBest: 389 }
  );
  assert.equal(studentRes.myRank, 1, 'Student with 3794 must immediately rank #1 over 1191');
  assert.equal(studentRes.myBest, 3794);
  assert.equal(studentRes.needsResync, true);
  assert.equal(studentRes.isHiddenAdmin, false);
  assert.deepEqual(
    studentRes.rows.map(r => [r.rank, r.id, r.bestScore]),
    [
      [1, 'u-reza', 3794],
      [2, 'u-rii', 1191],
      [3, 'u-her', 1171]
    ],
    'Ranks must be strictly sequential 1, 2, 3 with zero duplicate #1'
  );

  // Case 2: New/missing helper account not yet on server -> inserted at #1, previous #1 shifted to #2
  const helperRes = BL.reconcileLeaderboardRows(
    serverRows,
    { id: 'u-helper', name: 'Dr. Helper', username: 'helper1', role: 'helper', showInLeaderboard: true },
    { best: 2500, bestCombo: 4, lines: 40 },
    { serverMyRank: null, serverMyBest: 0 }
  );
  assert.equal(helperRes.myRank, 1);
  assert.equal(helperRes.needsResync, true);
  assert.deepEqual(helperRes.rows.map(r => r.rank), [1, 2, 3, 4]);
  assert.equal(helperRes.rows[0].id, 'u-helper');
  assert.equal(helperRes.rows[1].rank, 2);

  // Case 3: Admin with showInLeaderboard=false -> flagged as hidden admin so UI shows 1-tap toggle banner
  const hiddenAdminRes = BL.reconcileLeaderboardRows(
    serverRows,
    { id: 'u-admin', name: 'Admin', username: 'admin', role: 'admin', showInLeaderboard: false },
    { best: 3794, bestCombo: 6, lines: 50 },
    { serverMyRank: null, serverMyBest: 3794, hiddenByAdminToggle: true, showInLeaderboard: false }
  );
  assert.equal(hiddenAdminRes.isHiddenAdmin, true);
  assert.equal(hiddenAdminRes.myRank, null);
  assert.equal(hiddenAdminRes.myBest, 3794);
  assert.equal(hiddenAdminRes.rows.some(r => r.id === 'u-admin'), false);

  // Case 4: Admin with showInLeaderboard=true -> ranked #1 normally
  const visibleAdminRes = BL.reconcileLeaderboardRows(
    serverRows,
    { id: 'u-admin', name: 'Admin', username: 'admin', role: 'admin', showInLeaderboard: true },
    { best: 3794, bestCombo: 6, lines: 50 },
    { serverMyRank: null, serverMyBest: 0, hiddenByAdminToggle: false, showInLeaderboard: true }
  );
  assert.equal(visibleAdminRes.isHiddenAdmin, false);
  assert.equal(visibleAdminRes.myRank, 1);
  assert.equal(visibleAdminRes.rows[0].id, 'u-admin');
});

test('Blok Lysis leaderboard sync safeguards: throttled mid-game push, post-COMMIT mirror, and unified server CTE', () => {
  const blJs = readRel('js/blok-lysis.js');
  const libBl = readRel('lib/blok-lysis.mjs');
  const libSync = readRel('lib/sync.mjs');

  // Client throttles mid-game push (no 60/min spam storm on place()) and supports 1-tap Admin show button
  assert.match(blJs, /if \(best > prevBest && best >= 100\) schedulePushBest\(\);/);
  assert.match(blJs, /id="bl-adminShowBtn"/);
  assert.match(blJs, /\/api\/auth\/leaderboard-visibility/);

  // Server unifies blok_lysis_scores + learning_states + learning_state_entries + active session
  assert.match(libBl, /LEFT JOIN learning_state_entries e_bl/);
  assert.match(libBl, /LEFT JOIN learning_state_entries e_sess/);
  assert.match(libBl, /hiddenByAdminToggle/);
  assert.match(libBl, /limit\(req, res, 120\)/);

  // lib/sync.mjs mirrors Blok Lysis scores AFTER COMMIT (never inside transaction)
  const commitIdx = libSync.indexOf("await client.query('COMMIT');");
  const mirrorIdx = libSync.indexOf('upsertBlokLysisFromState(getPool(), u.id, blValueToMirror)');
  assert.ok(commitIdx > 0 && mirrorIdx > commitIdx, 'upsertBlokLysisFromState must run AFTER COMMIT in POST /api/sync');
});
