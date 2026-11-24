import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  isValidSyncKey,
  mergeJsonKey,
  reconcileMateriResumeWithHistory,
  reconcileBankSessionsWithHistory,
  reconcileBookmarksWithMeta,
} from '../lib/sync-merge.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ONLINE_SYNC_CODE = fs.readFileSync(path.join(__dirname, '..', 'js', 'online-sync.js'), 'utf8');
const UPDATE_NOTICE_CODE = fs.readFileSync(path.join(__dirname, '..', 'js', 'update-notice.js'), 'utf8');

function createMockServer() {
  let clock = 1_700_000_000_000;
  const state = {}; // key -> { value?, deleted?, updatedAt, serverUpdatedMs }
  const seenOps = new Set();
  const postLog = [];
  let failMultiOpPost = false;

  function reconcileServer() {
    const nowIso = new Date(++clock).toISOString();
    const valOf = k => (state[k] && !state[k].deleted && typeof state[k].value === 'string') ? state[k].value : null;
    const touched = [];

    const mat = reconcileMateriResumeWithHistory(
      valOf('clined_materi_resume_v2'),
      valOf('clined_materi_best_v1'),
      valOf('clined_materi_last_v1')
    );
    if (mat.changed && typeof mat.value === 'string') {
      state['clined_materi_resume_v2'] = { value: mat.value, updatedAt: nowIso, serverUpdatedMs: clock };
      touched.push('clined_materi_resume_v2');
    }

    const bank = reconcileBankSessionsWithHistory(
      valOf('clined_bank_sessions_v1'),
      valOf('gaster_v8_quiz_session'),
      valOf('clined_bank_best_v1'),
      valOf('gaster_v8_history')
    );
    if (bank.bankSessionsChanged && typeof bank.bankSessionsValue === 'string') {
      state['clined_bank_sessions_v1'] = { value: bank.bankSessionsValue, updatedAt: nowIso, serverUpdatedMs: clock };
      touched.push('clined_bank_sessions_v1');
    }
    if (bank.quizSessionChanged && typeof bank.quizSessionValue === 'string') {
      state['gaster_v8_quiz_session'] = { value: bank.quizSessionValue, updatedAt: nowIso, serverUpdatedMs: clock };
      touched.push('gaster_v8_quiz_session');
    }

    const book = reconcileBookmarksWithMeta(
      valOf('gaster_v8_bookmarks'),
      valOf('clined_bookmarks_meta_v1')
    );
    if (book.changed && typeof book.value === 'string') {
      state['gaster_v8_bookmarks'] = { value: book.value, updatedAt: nowIso, serverUpdatedMs: clock };
      touched.push('gaster_v8_bookmarks');
    }

    return touched;
  }

  async function handleFetch(urlStr, opts = {}) {
    const method = (opts.method || 'GET').toUpperCase();
    const u = new URL(urlStr, 'http://localhost');

    if (method === 'GET' && u.pathname === '/api/sync') {
      const since = u.searchParams.get('since');
      if (!since) {
        reconcileServer();
        const out = {};
        for (const [k, v] of Object.entries(state)) {
          if (!isValidSyncKey(k)) continue;
          out[k] = v.deleted ? { deleted: true, updatedAt: v.updatedAt } : { value: v.value, updatedAt: v.updatedAt };
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ mode: 'full', state: out, updatedAt: new Date(++clock).toISOString() })
        };
      }
      const sinceMs = Date.parse(since) || 0;
      const changes = {};
      let maxMs = sinceMs;
      for (const [k, v] of Object.entries(state)) {
        if (!isValidSyncKey(k)) continue;
        if (v.serverUpdatedMs > sinceMs) {
          changes[k] = v.deleted ? { deleted: true, updatedAt: v.updatedAt } : { value: v.value, updatedAt: v.updatedAt };
          if (v.serverUpdatedMs > maxMs) maxMs = v.serverUpdatedMs;
        }
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ mode: 'delta', changes, updatedAt: new Date(maxMs).toISOString(), hasMore: false })
      };
    }

    if (method === 'POST' && u.pathname === '/api/sync') {
      const payload = JSON.parse(opts.body || '{}');
      const ops = payload.operations || [];
      postLog.push(ops);

      if (failMultiOpPost && ops.length > 1) {
        return {
          ok: false,
          status: 413,
          json: async () => ({ error: 'Simulated batch rejection requiring per-key fallback' })
        };
      }

      const accepted = {};
      for (const op of ops) {
        const key = String(op?.key || '');
        if (!op || !isValidSyncKey(key) || !['set', 'delete'].includes(op.type)) continue;
        if (op.type === 'set' && (typeof op.value !== 'string' || Buffer.byteLength(op.value) > 500_000)) continue;

        if (seenOps.has(op.id)) {
          if (state[key]) {
            accepted[key] = state[key].deleted
              ? { deleted: true, updatedAt: state[key].updatedAt }
              : { value: state[key].value, updatedAt: state[key].updatedAt };
          }
          continue;
        }
        seenOps.add(op.id);

        const tsMs = ++clock;
        const nowIso = new Date(Math.max(Date.parse(op.updatedAt) || 0, tsMs)).toISOString();

        if (key === 'gaster_v11_xp' && op.type === 'set') {
          const prevXp = state[key] && !state[key].deleted ? Number(state[key].value) || 0 : 0;
          const bestXp = Math.max(prevXp, Number(op.value) || 0);
          state[key] = { value: String(bestXp), updatedAt: nowIso, serverUpdatedMs: tsMs };
          accepted[key] = { value: state[key].value, updatedAt: nowIso };
          continue;
        }

        if (op.type === 'set' && state[key] && !state[key].deleted && typeof state[key].value === 'string') {
          const merged = mergeJsonKey(key, op.value, state[key].value);
          if (merged) {
            if (merged.dirty) {
              state[key] = { value: merged.value, updatedAt: nowIso, serverUpdatedMs: tsMs };
            }
            accepted[key] = { value: state[key].value, updatedAt: state[key].updatedAt };
            continue;
          }
        }

        if (op.type === 'delete') {
          state[key] = { deleted: true, updatedAt: nowIso, serverUpdatedMs: tsMs };
          accepted[key] = { deleted: true, updatedAt: nowIso };
        } else {
          state[key] = { value: op.value, updatedAt: nowIso, serverUpdatedMs: tsMs };
          accepted[key] = { value: op.value, updatedAt: nowIso };
        }
      }

      const healed = reconcileServer();
      for (const hk of healed) {
        accepted[hk] = { value: state[hk].value, updatedAt: state[hk].updatedAt };
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({ mode: 'delta', changes: accepted })
      };
    }

    throw new Error(`Unhandled mock fetch: ${method} ${urlStr}`);
  }

  return {
    state,
    postLog,
    handleFetch,
    setFailMultiOpPost(v) { failMultiOpPost = v; },
    directWrite(key, value) {
      const tsMs = ++clock;
      state[key] = { value, updatedAt: new Date(tsMs).toISOString(), serverUpdatedMs: tsMs };
    }
  };
}

function createEventTarget() {
  const listeners = new Map(); // type -> [{ fn, capture }]
  return {
    addEventListener(type, fn, opts) {
      const capture = typeof opts === 'boolean' ? opts : Boolean(opts?.capture);
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push({ fn, capture, once: Boolean(opts?.once) });
    },
    dispatchEvent(ev) {
      const list = (listeners.get(ev.type) || []).slice();
      const ordered = [
        ...list.filter(x => x.capture),
        ...list.filter(x => !x.capture),
      ];
      for (const item of ordered) {
        if (item.once) {
          const arr = listeners.get(ev.type) || [];
          const idx = arr.indexOf(item);
          if (idx >= 0) arr.splice(idx, 1);
        }
        item.fn.call(this, ev);
      }
      return true;
    }
  };
}

function createDeviceEnv(server, initialStorage = {}) {
  const store = new Map(Object.entries(initialStorage));
  const localStorage = {
    get length() { return store.size; },
    key(i) { return [...store.keys()][i] ?? null; },
    getItem(k) { return store.has(String(k)) ? store.get(String(k)) : null; },
    setItem(k, v) { store.set(String(k), String(v)); },
    removeItem(k) { store.delete(String(k)); },
    clear() { store.clear(); }
  };

  const winTarget = createEventTarget();
  const docTarget = createEventTarget();
  const beacons = [];
  const timers = new Set();

  const document = {
    visibilityState: 'visible',
    readyState: 'loading',
    addEventListener: docTarget.addEventListener.bind(docTarget),
    dispatchEvent: docTarget.dispatchEvent.bind(docTarget),
  };

  const navigator = {
    onLine: true,
    sendBeacon(url, blob) {
      beacons.push({ url, blob });
      return true;
    }
  };

  class CustomEventMock {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
    }
  }
  class EventMock {
    constructor(type) {
      this.type = type;
    }
  }

  const windowObj = {
    localStorage,
    document,
    navigator,
    CustomEvent: CustomEventMock,
    Event: EventMock,
    TextEncoder,
    Blob,
    URL,
    crypto: globalThis.crypto,
    console,
    fetch: (url, opts) => server.handleFetch(url, opts),
    addEventListener: winTarget.addEventListener.bind(winTarget),
    dispatchEvent: winTarget.dispatchEvent.bind(winTarget),
    setTimeout: (fn, ms) => {
      const id = setTimeout(() => { timers.delete(id); fn(); }, Math.min(Number(ms) || 0, 50));
      timers.add(id);
      return id;
    },
    clearTimeout: id => { timers.delete(id); clearTimeout(id); },
    setInterval: () => 0,
    clearInterval: () => {},
  };
  windowObj.window = windowObj;
  windowObj.globalThis = windowObj;

  vm.runInNewContext(ONLINE_SYNC_CODE, windowObj, { filename: 'online-sync.js' });

  return {
    window: windowObj,
    document,
    localStorage,
    store,
    beacons,
    syncApi: windowObj.CLINED_ONLINE_SYNC,
    cleanup() {
      for (const id of timers) clearTimeout(id);
      timers.clear();
    }
  };
}

test('End-to-end two-device (iPad <-> Server <-> PC) sync achieves 100% state parity across all features', async () => {
  const server = createMockServer();
  const sharedSeq = [
    { id: 'q1', order: [0, 1, 2, 3] },
    { id: 'q2', order: [1, 0, 2, 3] },
    { id: 'q3', order: [2, 1, 0, 3] },
    { id: 'q4', order: [3, 2, 1, 0] },
    { id: 'q5', order: [0, 2, 1, 3] },
  ];

  // iPad starts with existing legacy cursor, stale completed materi resume, partial m2 answers (clock ahead),
  // flags, bank session, bookmarks, Day 2 streak, XP 1250, plus huge derived ability map cache & auth session.
  const ipad = createDeviceEnv(server, {
    clined_active_user_id_v3: 'user-same-account',
    clined_sync_cursor_v3: '2026-11-24T00:00:00.000Z',
    clined_auth_session_v1: 'secret-session-cookie-mirror',
    gaster_v22_question_ability_map: JSON.stringify({ huge: 'x'.repeat(20_000) }),
    clined_materi_resume_v2: JSON.stringify({
      'KEDKEL|m1': { pos: 3, ans: [0, 1, 2, null], seq: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }], updated: 2000 },
      'KEDKEL|m2': { sessionId: 'm2-run-1', startedAt: 1000, pos: 1, ans: [1, null, null, null, 3], seq: sharedSeq, updated: 99_000 },
    }),
    clined_materi_flags_v1: JSON.stringify({
      'KEDKEL|m1|q1': { block: 'KEDKEL', pk: 'm1', rid: 'q1', at: 5000 },
      'KEDKEL|m1|q2': { deleted: true, at: 6000 },
    }),
    clined_bank_sessions_v1: JSON.stringify({
      'ginjal-2023': { sessionId: 'bs-ginjal', bankId: 'ginjal-2023', pos: 4, doneCount: 5, total: 20, items: [{ id: 'g1', a: 0 }], savedAt: '2026-11-24T10:00:00Z' }
    }),
    'clined_timer_sessions_Tue Nov 24 2026': '3',
    gaster_v8_bookmarks: JSON.stringify(['q-book-1', 'q-book-2']),
    clined_bookmarks_meta_v1: JSON.stringify({
      'q-book-1': { at: 1000 },
      'q-book-2': { at: 1000 },
    }),
    gaster_daily_streak_v1: JSON.stringify({ counts: { '2026-11-24': 5 }, streak: 1 }),
    gaster_v11_xp: '1250',
  });

  // PC has existing cursor, finished KEDKEL|m1 (at: 3500 > 2000), answered 4 questions on KEDKEL|m2 (clock behind: updated 5000),
  // unbookmarked q-book-2 and bookmarked q-book-3, active custom quiz session, bankBest, Day 1 streak, XP 1800.
  const pc = createDeviceEnv(server, {
    clined_active_user_id_v3: 'user-same-account',
    clined_sync_cursor_v3: '2026-11-24T00:00:00.000Z',
    gaster_v22_question_ability_map: JSON.stringify({ huge: 'y'.repeat(20_000) }),
    clined_materi_best_v1: JSON.stringify({
      'KEDKEL|m1': { pct: 95, score: 19, total: 20, at: 3500 },
    }),
    clined_materi_last_v1: JSON.stringify({
      'KEDKEL|m1': { pct: 95, score: 19, total: 20, at: 3500, seq: [{ id: 'a' }] },
    }),
    clined_materi_resume_v2: JSON.stringify({
      'KEDKEL|m2': { sessionId: 'm2-run-1', startedAt: 1000, pos: 4, ans: [1, 2, 0, 1, null], seq: sharedSeq, updated: 5000 },
    }),
    clined_materi_flags_v1: JSON.stringify({
      'KEDKEL|m1|q2': { block: 'KEDKEL', pk: 'm1', rid: 'q2', at: 2000 },
      'KEDKEL|m1|q3': { block: 'KEDKEL', pk: 'm1', rid: 'q3', at: 7000 },
    }),
    clined_bank_best_v1: JSON.stringify({
      'kedkel-2022': { bestPct: 94, bestScore: 47, bestTotal: 50, lastPct: 94, attempts: 2, lastAt: '2026-11-24T11:00:00Z' }
    }),
    gaster_v8_quiz_session: JSON.stringify({
      sessionId: 'custom-qs-1',
      isCustom: true,
      selectedBank: 'kedkel-2022',
      pos: 3,
      score: 3,
      quiz: [{ id: 'c1', selectedAnswer: 0 }, { id: 'c2', selectedAnswer: 1 }, { id: 'c3', selectedAnswer: 2 }, { id: 'c4', selectedAnswer: null }],
      savedAt: '2026-11-24T11:05:00Z'
    }),
    'clined_timer_sessions_Tue Nov 24 2026': '5',
    gaster_v8_bookmarks: JSON.stringify(['q-book-3']),
    clined_bookmarks_meta_v1: JSON.stringify({
      'q-book-2': { deleted: true, at: 4000 },
      'q-book-3': { at: 4500 },
    }),
    gaster_daily_streak_v1: JSON.stringify({ counts: { '2026-11-23': 6 }, streak: 1 }),
    gaster_v11_xp: '1800',
  });

  try {
    // Sync roundtrip across both devices
    await ipad.syncApi.sync({ force: true });
    await pc.syncApi.sync({ force: true });
    await ipad.syncApi.sync({ force: true });
    await pc.syncApi.sync({ force: true });

    // Excluded keys never uploaded to server
    assert.equal('gaster_v22_question_ability_map' in server.state, false);
    assert.equal('clined_auth_session_v1' in server.state, false);

    // Client safe(key) matches server isValidSyncKey
    assert.equal(ipad.syncApi.isSafeKey('clined_bank_sessions_v1'), true);
    assert.equal(ipad.syncApi.isSafeKey('gaster_v8_quiz_session'), true);
    assert.equal(ipad.syncApi.isSafeKey('clined_timer_sessions_Tue Nov 24 2026'), true);
    assert.equal(ipad.syncApi.isSafeKey('gaster_v22_question_ability_map'), false);
    assert.equal(ipad.syncApi.isSafeKey('clined_auth_session_v1'), false);

    // Verify every synced key on Server is 100% identical between iPad and PC
    const syncedKeys = Object.keys(server.state);
    assert.ok(syncedKeys.includes('clined_bank_sessions_v1'));
    assert.ok(syncedKeys.includes('gaster_v8_quiz_session'));
    assert.ok(syncedKeys.includes('clined_timer_sessions_Tue Nov 24 2026'));

    for (const key of syncedKeys) {
      const iVal = ipad.localStorage.getItem(key);
      const pVal = pc.localStorage.getItem(key);
      assert.notEqual(iVal, null, `iPad missing key ${key}`);
      assert.notEqual(pVal, null, `PC missing key ${key}`);
      let iParsed, pParsed, isJson = false;
      try {
        iParsed = JSON.parse(iVal);
        pParsed = JSON.parse(pVal);
        isJson = true;
      } catch {}
      if (isJson) assert.deepEqual(iParsed, pParsed, `Mismatch on JSON key ${key}`);
      else assert.equal(iVal, pVal, `Mismatch on scalar key ${key}`);
    }

    // Specific domain assertions
    const matResume = JSON.parse(ipad.localStorage.getItem('clined_materi_resume_v2'));
    assert.equal(matResume['KEDKEL|m1'].deleted, true, 'Finished materi m1 must be tombstoned on iPad');
    assert.equal(matResume['KEDKEL|m2'].pos, 4, 'Same session m2 must keep furthest pos despite clock skew');
    assert.deepEqual(matResume['KEDKEL|m2'].ans, [1, 2, 0, 1, 3], 'Same session m2 must merge all answered questions');

    const flags = JSON.parse(ipad.localStorage.getItem('clined_materi_flags_v1'));
    assert.equal(flags['KEDKEL|m1|q1'].rid, 'q1');
    assert.equal(flags['KEDKEL|m1|q2'].deleted, true);
    assert.equal(flags['KEDKEL|m1|q3'].rid, 'q3');

    const bookmarks = JSON.parse(ipad.localStorage.getItem('gaster_v8_bookmarks')).sort();
    assert.deepEqual(bookmarks, ['q-book-1', 'q-book-3']);

    const streak = JSON.parse(ipad.localStorage.getItem('gaster_daily_streak_v1'));
    assert.deepEqual(streak, { counts: { '2026-11-23': 6, '2026-11-24': 5 }, streak: 2 });

    assert.equal(ipad.localStorage.getItem('gaster_v11_xp'), '1800');
    assert.equal(ipad.localStorage.getItem('clined_timer_sessions_Tue Nov 24 2026'), '5');
  } finally {
    ipad.cleanup();
    pc.cleanup();
  }
});

test('online-sync never silently skips batches: falls back per-key on batch failure and isolates >500KB entries', async () => {
  const server = createMockServer();
  server.setFailMultiOpPost(true);

  const dev = createDeviceEnv(server, {
    clined_active_user_id_v3: 'user-fallback',
  });

  try {
    await dev.syncApi.sync({ force: true });

    // Enqueue 3 valid keys + 1 oversized (>500KB) entry directly in queue
    dev.localStorage.setItem('gaster_v11_xp', '2400');
    dev.localStorage.setItem('clined_materi_best_v1', JSON.stringify({ 'KEDKEL|m1': { pct: 88, score: 22, total: 25, at: 5000 } }));
    dev.localStorage.setItem('clined_bank_sessions_v1', JSON.stringify({ 'endo-2023': { pos: 7, doneCount: 8, total: 40, savedAt: '2026-11-24T12:00:00Z' } }));

    // Verify synchronous queue persistence for critical progress keys (0ms, before timer)
    const persistedQueue = JSON.parse(dev.localStorage.getItem('clined_online_sync_queue_v3') || '[]');
    assert.equal(persistedQueue.length, 3);

    // Inject an un-syncable >500KB op into queue to ensure it doesn't block valid neighbor keys
    dev.localStorage.setItem('clined_notes_v1', JSON.stringify({ giant: 'z'.repeat(520_000) }));

    await dev.syncApi.sync({ force: true });

    assert.equal(server.state['gaster_v11_xp']?.value, '2400');
    assert.equal(JSON.parse(server.state['clined_materi_best_v1'].value)['KEDKEL|m1'].pct, 88);
    assert.equal(JSON.parse(server.state['clined_bank_sessions_v1'].value)['endo-2023'].doneCount, 8);
    assert.equal('clined_notes_v1' in server.state, false);

    const remainingQueue = JSON.parse(dev.localStorage.getItem('clined_online_sync_queue_v3') || '[]');
    assert.equal(remainingQueue.length, 0);
  } finally {
    dev.cleanup();
  }
});

test('flushBeacon runs pre-flush hooks first and prioritizes critical progress keys within beacon byte budget', async () => {
  const server = createMockServer();
  const dev = createDeviceEnv(server, {
    clined_active_user_id_v3: 'user-beacon',
  });

  try {
    await dev.syncApi.sync({ force: true });

    // Queue a bulky 50KB low-priority key first
    dev.localStorage.setItem('clined_upi_custom_cards_v1', JSON.stringify([{ id: 'c1', back: 'x'.repeat(50_000) }]));
    dev.localStorage.setItem('gaster_v11_xp', '999');

    // Register pre-flush hook simulating latihan-materi.js saving active run right as iPad hides
    let preFlushCalled = false;
    dev.window.addEventListener('clined:before-sync-flush', () => {
      preFlushCalled = true;
      dev.localStorage.setItem('clined_materi_resume_v2', JSON.stringify({
        'KEDKEL|m9': { sessionId: 's9', startedAt: 1000, pos: 6, ans: [0, 1, 2, 0, 1, 2, null], seq: [{ id: '1' }], updated: 2000 }
      }));
    });

    dev.document.visibilityState = 'hidden';
    dev.document.dispatchEvent(new dev.window.Event('visibilitychange'));

    assert.equal(preFlushCalled, true);
    assert.equal(dev.beacons.length, 1);
    const beaconText = await dev.beacons[0].blob.text();
    const parsed = JSON.parse(beaconText);
    const sentKeys = parsed.operations.map(op => op.key);

    // Critical progress keys MUST be packed first even when bulky low-priority op is 50KB!
    assert.ok(sentKeys.includes('clined_materi_resume_v2'));
    assert.ok(sentKeys.includes('gaster_v11_xp'));
  } finally {
    dev.cleanup();
  }
});

test('SSE stream reconnect (clined:stream-open) immediately pulls updates missed during iPad sleep', async () => {
  const server = createMockServer();
  const ipad = createDeviceEnv(server, {
    clined_active_user_id_v3: 'user-sse',
  });

  try {
    await ipad.syncApi.sync({ force: true });

    // Simulate PC updating XP & Materi Best on server while iPad was asleep
    server.directWrite('gaster_v11_xp', '4200');
    server.directWrite('clined_materi_best_v1', JSON.stringify({ 'KEDKEL|m5': { pct: 100, score: 15, total: 15, at: 8000 } }));

    // SSE reconnects and dispatches clined:stream-open
    ipad.window.dispatchEvent(new ipad.window.Event('clined:stream-open'));
    await new Promise(r => setTimeout(r, 80));

    assert.equal(ipad.localStorage.getItem('gaster_v11_xp'), '4200');
    assert.equal(JSON.parse(ipad.localStorage.getItem('clined_materi_best_v1'))['KEDKEL|m5'].pct, 100);
  } finally {
    ipad.cleanup();
  }
});

test('update-notice.js defers reload during active quiz/ml-running and auto-reloads on idle Materi list or Home', async () => {
  const swTarget = createEventTarget();
  swTarget.controller = { postMessage() {} };
  swTarget.register = async () => ({
    waiting: null,
    installing: null,
    addEventListener() {},
    update: async () => {}
  });
  swTarget.getRegistration = swTarget.register;

  let activeId = 'materiLatihanPage';
  let mlRunning = true;
  let reloaded = 0;
  let flushedBeforeReload = 0;
  const sessionStore = new Map();
  const winTarget = createEventTarget();
  const docTarget = createEventTarget();
  const bodyChildren = [];

  const mockMateriEl = {
    id: 'materiLatihanPage',
    classList: { contains: cls => (cls === 'ml-running' ? mlRunning : cls === 'active' ? activeId === 'materiLatihanPage' : false) }
  };

  const document = {
    visibilityState: 'visible',
    readyState: 'complete',
    body: { appendChild(el) { bodyChildren.push(el); } },
    createElement() {
      const elTarget = createEventTarget();
      return {
        className: '',
        innerHTML: '',
        setAttribute() {},
        classList: { add() {}, remove() {} },
        remove() {},
        querySelector: () => null,
        addEventListener: elTarget.addEventListener.bind(elTarget)
      };
    },
    getElementById: id => (id === 'materiLatihanPage' ? mockMateriEl : null),
    querySelector: sel => {
      if (sel === '.view.active') return { id: activeId };
      return null;
    },
    querySelectorAll: () => [],
    addEventListener: docTarget.addEventListener.bind(docTarget),
  };

  const ctx = {
    navigator: { serviceWorker: swTarget },
    document,
    sessionStorage: {
      getItem: k => sessionStore.get(k) ?? null,
      setItem: (k, v) => sessionStore.set(k, String(v))
    },
    location: { reload() { reloaded++; } },
    CustomEvent: class { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } },
    Event: class { constructor(type) { this.type = type; } },
    requestAnimationFrame: fn => fn(),
    setTimeout: (fn, ms) => setTimeout(fn, Math.min(Number(ms) || 0, 20)),
    clearTimeout,
    setInterval: () => 1,
    clearInterval: () => {},
    addEventListener: winTarget.addEventListener.bind(winTarget),
    dispatchEvent: winTarget.dispatchEvent.bind(winTarget),
  };
  ctx.window = ctx;

  ctx.addEventListener('clined:before-sync-flush', () => { flushedBeforeReload++; });

  vm.runInNewContext(UPDATE_NOTICE_CODE, ctx, { filename: 'update-notice.js' });

  // Broadcast newer SW version while user is actively answering Latihan Materi (.ml-running = true)
  swTarget.dispatchEvent({ type: 'message', data: { type: 'SW_ACTIVATED', version: 'v999-next-release' } });
  await new Promise(r => setTimeout(r, 50));
  assert.equal(reloaded, 0, 'Must NOT interrupt active Latihan Materi run');
  assert.equal(bodyChildren.length, 1, 'Should render gentle busy update banner');

  // User exits run back to idle Materi list (.ml-running = false) -> safe to auto-reload!
  mlRunning = false;
  ctx.dispatchEvent(new ctx.CustomEvent('clined:view-change', { detail: 'materiLatihanPage' }));
  await new Promise(r => setTimeout(r, 50));
  assert.equal(flushedBeforeReload, 1, 'Must flush pending sync state before reload');
  assert.equal(reloaded, 1, 'Must auto-reload once user returns to idle Materi list');
});

test('latihan-materi.js triggers sync on openList() and flushes pendingPostPick + save(R) before online-sync flushBeacon on pagehide', async () => {
  const LATIHAN_MATERI_CODE = fs.readFileSync(path.join(__dirname, '..', 'js', 'latihan-materi.js'), 'utf8');
  const server = createMockServer();
  server.directWrite('clined_materi_best_v1', JSON.stringify({
    'KEDKEL|pack-1': { pct: 100, score: 2, total: 2, at: 50_000 }
  }));

  const store = new Map([
    ['clined_active_user_id_v3', 'user-lm'],
    ['clined_materi_resume_v2', JSON.stringify({
      'KEDKEL|pack-1': { pos: 0, ans: [0, null], seq: [{ id: 'q1' }, { id: 'q2' }], updated: 10_000 }
    })],
  ]);

  const localStorage = {
    get length() { return store.size; },
    key(i) { return [...store.keys()][i] ?? null; },
    getItem(k) { return store.has(String(k)) ? store.get(String(k)) : null; },
    setItem(k, v) { store.set(String(k), String(v)); },
    removeItem(k) { store.delete(String(k)); },
  };

  const winTarget = createEventTarget();
  const docTarget = createEventTarget();
  const beacons = [];
  const timers = new Set();

  const makeEl = (id = '') => ({
    id,
    textContent: '',
    innerHTML: '',
    hidden: false,
    dataset: {},
    style: {},
    scrollLeft: 0,
    clientWidth: 100,
    offsetLeft: 0,
    classList: {
      _s: new Set(['active']),
      toggle(c, on) { if (on === undefined) { if (this._s.has(c)) this._s.delete(c); else this._s.add(c); } else if (on) this._s.add(c); else this._s.delete(c); },
      contains(c) { return this._s.has(c); },
      add(c) { this._s.add(c); },
      remove(c) { this._s.delete(c); },
    },
    querySelector: () => null,
    querySelectorAll: () => [],
    setAttribute() {},
  });

  const els = {
    materiLatihanBody: makeEl('materiLatihanBody'),
    materiLatihanPage: makeEl('materiLatihanPage'),
    materiLatihanEyebrow: makeEl('materiLatihanEyebrow'),
    materiLatihanTitle: makeEl('materiLatihanTitle'),
    backFromMateriLatihan: makeEl('backFromMateriLatihan'),
    home: makeEl('home'),
  };

  const document = {
    visibilityState: 'visible',
    readyState: 'loading',
    activeElement: null,
    body: makeEl('body'),
    getElementById: id => els[id] || null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: docTarget.addEventListener.bind(docTarget),
    dispatchEvent: docTarget.dispatchEvent.bind(docTarget),
  };

  const packsPayload = {
    packages: [
      {
        id: 'pack-1',
        block: 'KEDKEL',
        materiNo: 1,
        title: 'Materi 1',
        questions: [
          { id: 'q1', soal: 'Soal 1?', opsi: ['A', 'B'], jawabanBenar: 0 },
          { id: 'q2', soal: 'Soal 2?', opsi: ['A', 'B'], jawabanBenar: 1 },
        ]
      },
      {
        id: 'pack-2',
        block: 'KEDKEL',
        materiNo: 2,
        title: 'Materi 2',
        questions: [
          { id: 'q21', soal: 'Soal 21?', opsi: ['A', 'B'], jawabanBenar: 1 },
          { id: 'q22', soal: 'Soal 22?', opsi: ['A', 'B'], jawabanBenar: 0 },
        ]
      }
    ]
  };

  const navigator = {
    onLine: true,
    vibrate() {},
    sendBeacon(url, blob) { beacons.push({ url, blob }); return true; },
  };

  let syncForceCount = 0;
  const ctx = {
    localStorage,
    document,
    navigator,
    CustomEvent: class { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } },
    Event: class { constructor(type) { this.type = type; } },
    TextEncoder,
    Blob,
    URL,
    crypto: globalThis.crypto,
    console,
    scrollTo() {},
    show() {},
    fetch: async (url, opts) => {
      if (String(url).startsWith('/api/content/packages')) {
        return { ok: true, status: 200, json: async () => packsPayload };
      }
      return server.handleFetch(url, opts);
    },
    addEventListener: winTarget.addEventListener.bind(winTarget),
    dispatchEvent: winTarget.dispatchEvent.bind(winTarget),
    // Keep 32ms postPickTimer slow enough that pagehide fires BEFORE the timer!
    setTimeout: (fn, ms) => {
      const delay = Number(ms) === 32 ? 500 : Math.min(Number(ms) || 0, 30);
      const id = setTimeout(() => { timers.delete(id); fn(); }, delay);
      timers.add(id);
      return id;
    },
    clearTimeout: id => { timers.delete(id); clearTimeout(id); },
    setInterval: () => 0,
    clearInterval: () => {},
  };
  ctx.window = ctx;
  ctx.globalThis = ctx;

  // Load online-sync.js FIRST (just like app.html) and latihan-materi.js SECOND!
  vm.runInNewContext(ONLINE_SYNC_CODE, ctx, { filename: 'online-sync.js' });
  const origSync = ctx.CLINED_ONLINE_SYNC.sync;
  ctx.CLINED_ONLINE_SYNC.sync = opts => {
    if (opts?.force) syncForceCount++;
    return origSync(opts);
  };
  vm.runInNewContext(LATIHAN_MATERI_CODE, ctx, { filename: 'latihan-materi.js' });

  try {
    // 1. openList() calls CLINED_ONLINE_SYNC.sync({ force: true }), pulls pack-1 best, tombstones stale pack-1 resume, and starts Materi 2
    await ctx.CLINED_LATIHAN_MATERI.open('KEDKEL', 'KEDKEL', 'blokKedkelPage', 2);
    assert.ok(syncForceCount >= 1, 'openList() must trigger CLINED_ONLINE_SYNC.sync({ force: true })');

    const resumeAfterOpen = JSON.parse(localStorage.getItem('clined_materi_resume_v2'));
    assert.equal(resumeAfterOpen['KEDKEL|pack-1'].deleted, true, 'Stale pack-1 resume must be tombstoned on openList()');

    // 2. Pick answer 'B' via keyboard shortcut while 32ms postPickTimer has NOT fired yet, then immediately fire pagehide!
    document.dispatchEvent({
      type: 'keydown',
      key: 'b',
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      target: { id: '', tagName: 'DIV' },
      preventDefault() {},
    });

    ctx.dispatchEvent(new ctx.Event('pagehide'));

    assert.equal(beacons.length, 1, 'flushBeacon must send beacon on pagehide');
    const beaconBody = JSON.parse(await beacons[0].blob.text());
    const resumeOp = beaconBody.operations.find(op => op.key === 'clined_materi_resume_v2');
    assert.ok(resumeOp, 'pagehide beacon must include freshly flushed clined_materi_resume_v2 saved BEFORE flushBeacon');
    const sentResume = JSON.parse(resumeOp.value);
    const ansCount = sentResume['KEDKEL|pack-2'].ans.filter(a => a !== null).length;
    assert.equal(ansCount, 1, 'Picked answer must be saved in clined_materi_resume_v2 before beacon fires');
  } finally {
    for (const id of timers) clearTimeout(id);
  }
});
