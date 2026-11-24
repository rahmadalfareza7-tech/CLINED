/* Account-scoped online study data sync with conflict-free bidirectional merge & realtime cross-device updates. */
(() => {
  'use strict';
  const QUEUE = 'clined_online_sync_queue_v3';
  const ACTIVE_USER = 'clined_active_user_id_v3';
  const CURSOR = 'clined_sync_cursor_v4';
  const LEGACY_QUEUE = 'clined_online_sync_queue_v2';
  const LEGACY_CURSORS = ['clined_sync_cursor_v1', 'clined_sync_cursor_v2', 'clined_sync_cursor_v3'];

  const ALLOWED_PREFIX_RE = /^(gaster_|clined_|medicalRpg|medical_rpg|current_block|last_worked|dashboard_block|alpha5_)/;
  const EXCLUDED_KEY_RE = /^(?:clined_(?:account_profile|google_form_url|schema_version|migrated_at|menu|member_sidebar|active_user_id|sync_cursor|sync_meta|online_sync_queue|xp_queue|glossary_v1|resep_overrides_v1|materi_packs_cache|materi_resume$|last_view|upd_at|sw_version|push_dismiss|active_duel_id|usage_off)|gaster_v22_question_ability_map$)/;
  const EXCLUDED_CACHE_RE = /(?:_ability_map|_packs_cache)$/i;
  const BLOCKED_AUTH_RE = /(?:^|[_-])(?:auth|password|passwd|secret|cookie|credential|jwt|bearer|apikey|api_key)(?:$|[_-])|(?:auth|login|user|account)[_-]?session|session[_-]?(?:token|id|key|secret|cookie)|(?:auth|access|refresh|csrf|id|api|reset|session)[_-]?token|^token$|sync_queue|sync_cursor|last_activity|xp_queue/i;

  const safe = key => (
    typeof key === 'string' &&
    key.length > 0 &&
    key.length <= 120 &&
    ALLOWED_PREFIX_RE.test(key) &&
    !EXCLUDED_KEY_RE.test(key) &&
    !EXCLUDED_CACHE_RE.test(key) &&
    !BLOCKED_AUTH_RE.test(key)
  );

  const PRIORITY_0_KEYS = new Set([
    'gaster_v11_xp',
    'clined_xp_daily_refs_v1',
    'gaster_daily_streak_v1',
    'clined_materi_resume_v2',
    'clined_materi_best_v1',
    'clined_materi_last_v1',
    'clined_materi_flags_v1',
    'clined_bank_best_v1',
    'clined_bank_sessions_v1',
    'gaster_v8_quiz_session',
    'gaster_v8_bookmarks',
    'clined_bookmarks_meta_v1',
  ]);

  const PRIORITY_1_KEYS = new Set([
    'gaster_v8_history',
    'clined_study_log_v1',
    'clined_qtime_v1',
    'clined_resep_best_v1',
    'clined_resep_lp_best_v1',
    'clined_clinical_quest_v1',
    'clined_kedkel_summary_done_v2',
    'clined_kedkel_summary_star_v2',
    'clined_unlocked_achievements_v1',
    'clined_claimed_quiz_dia_v1',
    'clined_duel_claims_v1',
    'clined_sm2_v1',
    'clined_notes_v1',
    'clined_diamonds_v1',
  ]);

  function keyPriority(key) {
    if (PRIORITY_0_KEYS.has(key)) return 0;
    if (PRIORITY_1_KEYS.has(key) || (typeof key === 'string' && (key.startsWith('clined_timer_sessions_') || key.startsWith('clined_upi_flashcards_block_v2_')))) return 1;
    return 2;
  }

  function isCriticalKey(key) {
    return keyPriority(key) <= 1;
  }

  const encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
  const utf8Bytes = str => {
    const s = String(str ?? '');
    if (encoder) return encoder.encode(s).length;
    try { return new Blob([s]).size; } catch { return s.length * 2; }
  };

  const MAX_VALUE_BYTES = 500_000;
  const MAX_BATCH_BYTES = 420_000;
  const MAX_BATCH_OPS = 50;
  const MAX_BEACON_BYTES = 58_000;
  const PERIODIC_PULL_MS = 25_000;
  const FULL_RECONCILE_MS = 180_000;

  const learningKeys = () => Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)).filter(k => k && safe(k));
  const uuid = () => (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });
  const CLIENT_ID = uuid();

  let suppress = false;
  let sending = false;
  let dirty = true;
  let pendingResync = false;
  let pendingFullPull = true;
  let lastPullAt = 0;
  let lastFullPullAt = 0;
  let hiddenAt = 0;

  const nativeSet = localStorage.setItem.bind(localStorage);
  const nativeRemove = localStorage.removeItem.bind(localStorage);
  try {
    for (const lk of LEGACY_CURSORS) nativeRemove(lk);
  } catch {}

  const read = (k, f) => {
    try { return JSON.parse(localStorage.getItem(k) || '') ?? f; } catch { return f; }
  };

  let memQueue = null;
  let queueFlushTimer = 0;
  let dirtyTimer = 0;
  let dirtySince = 0;
  let remotePullTimer = 0;

  function getQueue() {
    if (!memQueue) {
      const raw = read(QUEUE, []);
      const arr = Array.isArray(raw) ? raw : [];
      const cleaned = arr.filter(op => op && safe(op.key) && (op.type === 'set' || op.type === 'delete'));
      memQueue = cleaned;
      if (cleaned.length !== arr.length) {
        try { nativeSet(QUEUE, JSON.stringify(memQueue)); } catch {}
      }
    }
    return memQueue;
  }

  function flushQueueNow() {
    clearTimeout(queueFlushTimer);
    queueFlushTimer = 0;
    if (!memQueue) return;
    try { nativeSet(QUEUE, JSON.stringify(memQueue)); } catch {}
  }

  function scheduleQueueFlush() {
    clearTimeout(queueFlushTimer);
    queueFlushTimer = setTimeout(flushQueueNow, 150);
  }

  function setQueue(next, immediate = false) {
    memQueue = Array.isArray(next) ? next.filter(op => op && safe(op.key)).slice(-200) : [];
    if (immediate) flushQueueNow();
    else scheduleQueueFlush();
  }

  function dropQueuedKey(key, immediate = false) {
    const q = getQueue();
    if (!q.some(op => op?.key === key)) return;
    setQueue(q.filter(op => op?.key !== key), immediate || isCriticalKey(key));
  }

  function scheduleDirtySync(urgent = false) {
    dirty = true;
    if (!localStorage.getItem(ACTIVE_USER)) return;
    if (sending) { pendingResync = true; return; }
    if (!dirtySince) dirtySince = Date.now();
    const waitMs = urgent ? 420 : 800;
    if (Date.now() - dirtySince >= 2200) {
      clearTimeout(dirtyTimer); dirtyTimer = 0; dirtySince = 0;
      sync({ force: true });
    } else if (!dirtyTimer) {
      dirtyTimer = setTimeout(() => { dirtyTimer = 0; dirtySince = 0; sync({ force: true }); }, waitMs);
    }
  }

  function clearLocalLearningData() {
    suppress = true;
    try {
      for (const k of learningKeys()) localStorage.removeItem(k);
      try { localStorage.removeItem('gaster_v22_question_ability_map'); } catch {}
      memQueue = [];
      clearTimeout(queueFlushTimer);
      nativeRemove(QUEUE);
      nativeRemove(LEGACY_QUEUE);
      nativeRemove(CURSOR);
      for (const lk of LEGACY_CURSORS) nativeRemove(lk);
    } finally {
      suppress = false;
    }
  }

  function switchUser(userId) {
    const id = String(userId || '');
    const prev = localStorage.getItem(ACTIVE_USER) || '';
    if (!id) {
      clearLocalLearningData();
      localStorage.removeItem(ACTIVE_USER);
      return { changed: Boolean(prev) };
    }
    if (prev !== id) {
      clearLocalLearningData();
      localStorage.setItem(ACTIVE_USER, id);
      dirty = true;
      pendingFullPull = true;
      lastPullAt = 0;
      lastFullPullAt = 0;
      return { changed: true };
    }
    return { changed: false };
  }

  function enqueue(operation, autoSchedule = true) {
    if (suppress || !operation || !safe(operation.key)) return;
    const q = getQueue();
    const next = [];
    for (let i = 0; i < q.length; i++) {
      if (q[i]?.key !== operation.key) next.push(q[i]);
    }
    next.push(operation);
    const critical = isCriticalKey(operation.key) || operation.type === 'delete';
    setQueue(next, critical);
    dirty = true;
    if (autoSchedule) scheduleDirtySync(critical);
  }

  function markSet(key, value, autoSchedule = true) {
    if (safe(key)) {
      enqueue({ id: uuid(), type: 'set', key, value: String(value), updatedAt: new Date().toISOString() }, autoSchedule);
    }
  }

  function markDelete(key, autoSchedule = true) {
    if (safe(key)) {
      enqueue({ id: uuid(), type: 'delete', key, updatedAt: new Date().toISOString() }, autoSchedule);
    }
  }

  localStorage.setItem = (key, value) => {
    const str = String(value);
    const prev = localStorage.getItem(key);
    nativeSet(key, str);
    if (!suppress && safe(key) && prev !== str) markSet(key, str, true);
  };

  localStorage.removeItem = key => {
    const was = safe(key) && localStorage.getItem(key) !== null;
    nativeRemove(key);
    if (was && !suppress) markDelete(key, true);
  };

  async function request(path, options = {}) {
    const r = await fetch(path, {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      const err = Error(d.error || 'Sinkronisasi gagal.');
      err.status = r.status;
      throw err;
    }
    return d;
  }

  function jsonDeepEqual(x, y) {
    if (x === y) return true;
    if (!x || !y || typeof x !== 'object' || typeof y !== 'object') return false;
    if (Array.isArray(x) !== Array.isArray(y)) return false;
    if (Array.isArray(x)) return x.length === y.length && x.every((v, i) => jsonDeepEqual(v, y[i]));
    const kx = Object.keys(x);
    const ky = Object.keys(y);
    return kx.length === ky.length && kx.every(k => Object.prototype.hasOwnProperty.call(y, k) && jsonDeepEqual(x[k], y[k]));
  }

  function maxMergeDeep(a, b) {
    if (typeof a === 'number' && typeof b === 'number') return Math.max(a, b);
    if (typeof a === 'boolean' && typeof b === 'boolean') return a || b;
    if (Array.isArray(a) && Array.isArray(b)) {
      const out = [...b];
      for (const item of a) if (!out.some(x => JSON.stringify(x) === JSON.stringify(item))) out.push(item);
      return out;
    }
    if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
      const out = { ...b };
      for (const [k, v] of Object.entries(a)) out[k] = Object.prototype.hasOwnProperty.call(b, k) ? maxMergeDeep(v, b[k]) : v;
      return out;
    }
    return b !== undefined ? b : a;
  }

  function parsePlainObj(raw) {
    if (typeof raw !== 'string' || !raw) return null;
    try {
      const p = JSON.parse(raw);
      return p && typeof p === 'object' && !Array.isArray(p) ? p : null;
    } catch { return null; }
  }

  function parseArr(raw) {
    if (typeof raw !== 'string' || !raw) return null;
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p : null;
    } catch { return null; }
  }

  function trailingStreakFromCounts(counts) {
    if (!counts || typeof counts !== 'object') return 0;
    const validDays = Object.keys(counts).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
    if (!validDays.length) return 0;
    const latestStr = validDays[validDays.length - 1];
    const anchor = new Date(`${latestStr}T12:00:00Z`);
    if (Number.isNaN(anchor.getTime())) return 0;
    const fmt = dt => dt.toISOString().slice(0, 10);
    const qual = key => (Number(counts[key]) || 0) >= 5;
    if (!qual(fmt(anchor))) anchor.setUTCDate(anchor.getUTCDate() - 1);
    if (!qual(fmt(anchor))) return 0;
    let n = 0;
    for (let i = 0; i < 366; i++) {
      const d = new Date(anchor);
      d.setUTCDate(anchor.getUTCDate() - i);
      if (qual(fmt(d))) n++;
      else break;
    }
    return n;
  }

  function countMateriAnswered(entry) {
    if (Array.isArray(entry?.ans)) return entry.ans.filter(a => a !== null && a !== undefined).length;
    return Math.max(0, Number(entry?.answered ?? entry?.doneCount) || 0);
  }

  function isSameMateriSession(lv, sv) {
    if (lv?.sessionId && sv?.sessionId) return String(lv.sessionId) === String(sv.sessionId);
    const lStart = Number(lv?.startedAt) || 0;
    const sStart = Number(sv?.startedAt) || 0;
    if (lStart > 0 && sStart > 0 && lStart !== sStart) return false;
    if (Array.isArray(lv?.seq) && Array.isArray(sv?.seq) && lv.seq.length > 0 && sv.seq.length > 0) {
      if (lv.seq.length !== sv.seq.length) return false;
      return lv.seq.every((x, i) => String(x?.id ?? x) === String(sv.seq[i]?.id ?? sv.seq[i]));
    }
    return true;
  }

  function mergeMateriResumeEntry(lv, sv) {
    const lt = Number(lv?.updated) || 0;
    const st = Number(sv?.updated) || 0;
    const lDel = Boolean(lv?.deleted);
    const sDel = Boolean(sv?.deleted);

    if (lDel && sDel) {
      if (lt > st) {
        const next = { ...sv, ...lv, deleted: true, updated: lt };
        return { entry: next, changed: !jsonDeepEqual(next, sv) };
      }
      return { entry: sv, changed: false };
    }
    if (lDel && !sDel) {
      const sStart = Number(sv?.startedAt) || 0;
      const sameSid = Boolean(lv?.sessionId && sv?.sessionId && String(lv.sessionId) === String(sv.sessionId));
      if (!sameSid && (sStart > 0 ? sStart > lt : st > lt)) return { entry: sv, changed: false };
      return {
        entry: {
          deleted: true,
          updated: Math.max(lt, st),
          ...(lv?.sessionId || sv?.sessionId ? { sessionId: lv?.sessionId || sv?.sessionId } : {})
        },
        changed: true
      };
    }
    if (!lDel && sDel) {
      const lStart = Number(lv?.startedAt) || 0;
      const sameSid = Boolean(lv?.sessionId && sv?.sessionId && String(lv.sessionId) === String(sv.sessionId));
      if (!sameSid && (lStart > 0 ? lStart > st : lt > st)) return { entry: lv, changed: true };
      return { entry: sv, changed: false };
    }

    const lAnsCnt = countMateriAnswered(lv);
    const sAnsCnt = countMateriAnswered(sv);
    if (isSameMateriSession(lv, sv)) {
      const lPos = Math.max(0, Number(lv?.pos) || 0);
      const sPos = Math.max(0, Number(sv?.pos) || 0);
      const preferLocal = lAnsCnt > sAnsCnt || (lAnsCnt === sAnsCnt && (lPos > sPos || (lPos === sPos && lt >= st)));
      const base = preferLocal ? lv : sv;
      const seq = Array.isArray(base?.seq) && base.seq.length ? base.seq : (Array.isArray(sv?.seq) ? sv.seq : lv?.seq);
      const lAnsArr = Array.isArray(lv?.ans) ? lv.ans : null;
      const sAnsArr = Array.isArray(sv?.ans) ? sv.ans : null;
      let mergedAns;
      if (lAnsArr || sAnsArr) {
        const len = Math.max(Array.isArray(seq) ? seq.length : 0, lAnsArr ? lAnsArr.length : 0, sAnsArr ? sAnsArr.length : 0);
        mergedAns = [];
        for (let i = 0; i < len; i++) {
          const la = lAnsArr && i < lAnsArr.length ? lAnsArr[i] : null;
          const sa = sAnsArr && i < sAnsArr.length ? sAnsArr[i] : null;
          const laHas = la !== null && la !== undefined;
          const saHas = sa !== null && sa !== undefined;
          if (laHas && !saHas) mergedAns.push(la);
          else if (!laHas && saHas) mergedAns.push(sa);
          else if (laHas && saHas) mergedAns.push(preferLocal ? la : sa);
          else mergedAns.push(null);
        }
      }
      const rawPos = Math.max(lPos, sPos);
      const mergedPos = Array.isArray(seq) && seq.length > 0 ? Math.min(seq.length - 1, rawPos) : rawPos;
      const mergedUpdated = Math.max(lt, st);
      const starts = [Number(lv?.startedAt) || 0, Number(sv?.startedAt) || 0].filter(n => n > 0);
      const next = {
        ...sv,
        ...lv,
        ...base,
        ...(seq !== undefined ? { seq } : {}),
        ...(mergedAns !== undefined ? { ans: mergedAns } : {}),
        pos: mergedPos,
        updated: mergedUpdated,
      };
      if (starts.length) next.startedAt = Math.min(...starts);
      if (lv?.sessionId || sv?.sessionId) next.sessionId = base?.sessionId || sv?.sessionId || lv?.sessionId;
      return { entry: next, changed: !jsonDeepEqual(next, sv) };
    }

    const lAnchor = Number(lv?.startedAt) || lt;
    const sAnchor = Number(sv?.startedAt) || st;
    if (lAnchor > sAnchor || (lAnchor === sAnchor && (lt > st || (lt === st && lAnsCnt > sAnsCnt)))) {
      return { entry: lv, changed: !jsonDeepEqual(lv, sv) };
    }
    return { entry: sv, changed: false };
  }

  function bankSessTimestamp(entry) {
    return Math.max(Number(entry?.updated) || 0, Date.parse(entry?.savedAt || '') || 0);
  }

  function bankSessDoneCount(entry) {
    if (!entry || entry.deleted) return 0;
    const fromItems = Array.isArray(entry.items)
      ? entry.items.filter(it => it && it.a !== null && it.a !== undefined).length
      : 0;
    return Math.max(Number(entry.doneCount) || 0, fromItems);
  }

  function isSameBankSession(lv, sv) {
    if (lv?.sessionId && sv?.sessionId) return String(lv.sessionId) === String(sv.sessionId);
    const lStart = Number(lv?.startedAt) || 0;
    const sStart = Number(sv?.startedAt) || 0;
    if (lStart > 0 && sStart > 0 && lStart !== sStart) return false;
    if (Array.isArray(lv?.items) && Array.isArray(sv?.items) && lv.items.length > 0 && sv.items.length > 0) {
      if (lv.items.length !== sv.items.length) return false;
      return lv.items.every((it, idx) => String(it?.id ?? it?.i) === String(sv.items[idx]?.id ?? sv.items[idx]?.i));
    }
    if (lv?.total && sv?.total && Number(lv.total) !== Number(sv.total)) return false;
    return true;
  }

  function mergeBankSessionEntry(lv, sv) {
    const lt = bankSessTimestamp(lv);
    const st = bankSessTimestamp(sv);
    const lDel = Boolean(lv?.deleted);
    const sDel = Boolean(sv?.deleted);

    if (lDel && sDel) {
      if (lt > st) {
        const next = { ...sv, ...lv, deleted: true, updated: lt };
        return { entry: next, changed: !jsonDeepEqual(next, sv) };
      }
      return { entry: sv, changed: false };
    }
    if (lDel && !sDel) {
      const sStart = Number(sv?.startedAt) || 0;
      const sameSid = Boolean(lv?.sessionId && sv?.sessionId && String(lv.sessionId) === String(sv.sessionId));
      if (!sameSid && (sStart > 0 ? sStart > lt : st > lt)) return { entry: sv, changed: false };
      const ts = Math.max(lt, st);
      return {
        entry: {
          deleted: true,
          ...(sv?.bankId || lv?.bankId ? { bankId: sv?.bankId || lv?.bankId } : {}),
          updated: ts,
          savedAt: new Date(ts || Date.now()).toISOString(),
          ...(lv?.sessionId || sv?.sessionId ? { sessionId: lv?.sessionId || sv?.sessionId } : {})
        },
        changed: true
      };
    }
    if (!lDel && sDel) {
      const lStart = Number(lv?.startedAt) || 0;
      const sameSid = Boolean(lv?.sessionId && sv?.sessionId && String(lv.sessionId) === String(sv.sessionId));
      if (!sameSid && (lStart > 0 ? lStart > st : lt > st)) return { entry: lv, changed: true };
      return { entry: sv, changed: false };
    }

    const lDone = bankSessDoneCount(lv);
    const sDone = bankSessDoneCount(sv);
    if (isSameBankSession(lv, sv)) {
      const lPos = Math.max(0, Number(lv?.pos) || 0);
      const sPos = Math.max(0, Number(sv?.pos) || 0);
      const preferLocal = lDone > sDone || (lDone === sDone && (lPos > sPos || (lPos === sPos && lt >= st)));
      const base = preferLocal ? lv : sv;
      let mergedItems;
      if (Array.isArray(lv?.items) && Array.isArray(sv?.items) && lv.items.length === sv.items.length) {
        mergedItems = lv.items.map((lit, idx) => {
          const sit = sv.items[idx];
          const lHas = lit && lit.a !== null && lit.a !== undefined;
          const sHas = sit && sit.a !== null && sit.a !== undefined;
          if (lHas && !sHas) return lit;
          if (!lHas && sHas) return sit;
          return preferLocal ? lit : sit;
        });
      } else {
        mergedItems = Array.isArray(base?.items) ? base.items : (Array.isArray(sv?.items) ? sv.items : lv?.items);
      }
      const itemsDone = Array.isArray(mergedItems)
        ? mergedItems.filter(it => it && it.a !== null && it.a !== undefined).length
        : 0;
      const mergedDone = Math.max(lDone, sDone, itemsDone);
      const total = Number(base?.total || sv?.total || lv?.total || (Array.isArray(mergedItems) ? mergedItems.length : 0)) || 0;
      const rawPos = Math.max(lPos, sPos);
      const mergedPos = total > 0 ? Math.min(total - 1, rawPos) : rawPos;
      const flaggedSet = new Set([
        ...(Array.isArray(sv?.flagged) ? sv.flagged : []),
        ...(Array.isArray(lv?.flagged) ? lv.flagged : [])
      ]);
      const winSavedAt = lt >= st ? (lv?.savedAt || sv?.savedAt) : (sv?.savedAt || lv?.savedAt);
      const mergedUpdated = Math.max(Number(lv?.updated) || 0, Number(sv?.updated) || 0);
      const starts = [Number(lv?.startedAt) || 0, Number(sv?.startedAt) || 0].filter(n => n > 0);
      const next = {
        ...sv,
        ...lv,
        ...base,
        ...(mergedItems !== undefined ? { items: mergedItems } : {}),
        pos: mergedPos,
        doneCount: mergedDone,
        ...(total > 0 ? { total } : {}),
        ...(lv?.score !== undefined || sv?.score !== undefined ? { score: Math.max(Number(lv?.score) || 0, Number(sv?.score) || 0) } : {}),
        ...(lv?.sessionXP !== undefined || sv?.sessionXP !== undefined ? { sessionXP: Math.max(Number(lv?.sessionXP) || 0, Number(sv?.sessionXP) || 0) } : {}),
        ...(Array.isArray(lv?.flagged) || Array.isArray(sv?.flagged) ? { flagged: [...flaggedSet] } : {}),
        ...(winSavedAt ? { savedAt: winSavedAt } : {}),
        ...(mergedUpdated > 0 ? { updated: mergedUpdated } : {}),
      };
      if (starts.length) next.startedAt = Math.min(...starts);
      if (lv?.sessionId || sv?.sessionId) next.sessionId = base?.sessionId || sv?.sessionId || lv?.sessionId;
      return { entry: next, changed: !jsonDeepEqual(next, sv) };
    }

    const lAnchor = Number(lv?.startedAt) || lt;
    const sAnchor = Number(sv?.startedAt) || st;
    if (lAnchor > sAnchor || (lAnchor === sAnchor && (lt > st || (lt === st && lDone > sDone)))) {
      return { entry: lv, changed: !jsonDeepEqual(lv, sv) };
    }
    return { entry: sv, changed: false };
  }

  function quizSessDoneCount(s) {
    if (!s || s.deleted) return 0;
    if (Array.isArray(s.quiz)) return s.quiz.filter(q => q && q.selectedAnswer !== null && q.selectedAnswer !== undefined).length;
    return Math.max(Number(s.doneCount) || 0, Number(s.pos) || 0);
  }

  function mergeQuizSession(loc, srv) {
    if (jsonDeepEqual(loc, srv)) return { value: JSON.stringify(srv), dirty: false };
    const lt = bankSessTimestamp(loc);
    const st = bankSessTimestamp(srv);
    const lDel = Boolean(loc?.deleted);
    const sDel = Boolean(srv?.deleted);

    if (lDel && sDel) {
      if (lt > st) {
        const next = { ...srv, ...loc, deleted: true, updated: lt };
        return { value: JSON.stringify(next), dirty: !jsonDeepEqual(next, srv) };
      }
      return { value: JSON.stringify(srv), dirty: false };
    }
    if (lDel && !sDel) {
      const sStart = Number(srv?.startedAt) || 0;
      const sameSid = Boolean(loc?.sessionId && srv?.sessionId && String(loc.sessionId) === String(srv.sessionId));
      if (!sameSid && (sStart > 0 ? sStart > lt : st > lt)) return { value: JSON.stringify(srv), dirty: false };
      const ts = Math.max(lt, st);
      return {
        value: JSON.stringify({
          deleted: true,
          updated: ts,
          savedAt: new Date(ts || Date.now()).toISOString(),
          ...(loc?.sessionId || srv?.sessionId ? { sessionId: loc?.sessionId || srv?.sessionId } : {})
        }),
        dirty: true
      };
    }
    if (!lDel && sDel) {
      const lStart = Number(loc?.startedAt) || 0;
      const sameSid = Boolean(loc?.sessionId && srv?.sessionId && String(loc.sessionId) === String(srv.sessionId));
      if (!sameSid && (lStart > 0 ? lStart > st : lt > st)) return { value: JSON.stringify(loc), dirty: true };
      return { value: JSON.stringify(srv), dirty: false };
    }

    const sameSession = (loc?.sessionId && srv?.sessionId)
      ? String(loc.sessionId) === String(srv.sessionId)
      : (
          !(Number(loc?.startedAt) > 0 && Number(srv?.startedAt) > 0 && Number(loc.startedAt) !== Number(srv.startedAt)) &&
          Boolean(loc?.selectedBank && loc.selectedBank === srv?.selectedBank) &&
          Number(loc?.total || loc?.quiz?.length || 0) === Number(srv?.total || srv?.quiz?.length || 0)
        );
    const lDone = quizSessDoneCount(loc);
    const sDone = quizSessDoneCount(srv);

    if (sameSession) {
      const lPos = Math.max(0, Number(loc?.pos) || 0);
      const sPos = Math.max(0, Number(srv?.pos) || 0);
      const preferLocal = lDone > sDone || (lDone === sDone && (lPos > sPos || (lPos === sPos && lt >= st)));
      const base = preferLocal ? loc : srv;
      let mergedQuiz;
      if (Array.isArray(loc?.quiz) && Array.isArray(srv?.quiz) && loc.quiz.length === srv.quiz.length) {
        mergedQuiz = loc.quiz.map((lq, idx) => {
          const sq = srv.quiz[idx];
          const lHas = lq && lq.selectedAnswer !== null && lq.selectedAnswer !== undefined;
          const sHas = sq && sq.selectedAnswer !== null && sq.selectedAnswer !== undefined;
          if (lHas && !sHas) return lq;
          if (!lHas && sHas) return sq;
          return preferLocal ? lq : sq;
        });
      } else if (Array.isArray(base?.quiz)) {
        mergedQuiz = base.quiz;
      }
      const total = Number(base?.total || srv?.total || loc?.total || (Array.isArray(mergedQuiz) ? mergedQuiz.length : 0)) || 0;
      const rawPos = Math.max(lPos, sPos);
      const mergedPos = total > 0 ? Math.min(total - 1, rawPos) : rawPos;
      const flaggedSet = new Set([
        ...(Array.isArray(srv?.flagged) ? srv.flagged : []),
        ...(Array.isArray(loc?.flagged) ? loc.flagged : [])
      ]);
      const winSavedAt = lt >= st ? (loc?.savedAt || srv?.savedAt) : (srv?.savedAt || loc?.savedAt);
      const mergedUpdated = Math.max(Number(loc?.updated) || 0, Number(srv?.updated) || 0);
      const starts = [Number(loc?.startedAt) || 0, Number(srv?.startedAt) || 0].filter(n => n > 0);
      const mergedDone = Array.isArray(mergedQuiz)
        ? mergedQuiz.filter(q => q && q.selectedAnswer !== null && q.selectedAnswer !== undefined).length
        : Math.max(Number(loc?.doneCount) || 0, Number(srv?.doneCount) || 0);
      const next = {
        ...srv,
        ...loc,
        ...base,
        ...(mergedQuiz !== undefined ? { quiz: mergedQuiz } : {}),
        pos: mergedPos,
        ...(mergedQuiz !== undefined || loc?.doneCount !== undefined || srv?.doneCount !== undefined || loc?.compact || srv?.compact ? { doneCount: mergedDone } : {}),
        ...(loc?.score !== undefined || srv?.score !== undefined ? { score: Math.max(Number(loc?.score) || 0, Number(srv?.score) || 0) } : {}),
        ...(loc?.sessionXP !== undefined || srv?.sessionXP !== undefined ? { sessionXP: Math.max(Number(loc?.sessionXP) || 0, Number(srv?.sessionXP) || 0) } : {}),
        ...(Array.isArray(loc?.flagged) || Array.isArray(srv?.flagged) ? { flagged: [...flaggedSet] } : {}),
        ...(winSavedAt ? { savedAt: winSavedAt } : {}),
        ...(mergedUpdated > 0 ? { updated: mergedUpdated } : {}),
      };
      if (Array.isArray(mergedQuiz) && mergedQuiz[mergedPos] && ('answered' in loc || 'answered' in srv || 'selectedAnswer' in loc || 'selectedAnswer' in srv)) {
        const sel = mergedQuiz[mergedPos].selectedAnswer ?? null;
        next.selectedAnswer = sel;
        next.answered = sel !== null && sel !== undefined;
      }
      if (starts.length) next.startedAt = Math.min(...starts);
      if (loc?.sessionId || srv?.sessionId) next.sessionId = base?.sessionId || srv?.sessionId || loc?.sessionId;
      return { value: JSON.stringify(next), dirty: !jsonDeepEqual(next, srv) };
    }

    const lAnchor = Number(loc?.startedAt) || lt;
    const sAnchor = Number(srv?.startedAt) || st;
    if (lAnchor > sAnchor || (lAnchor === sAnchor && (lt > st || (lt === st && lDone > sDone)))) {
      return { value: JSON.stringify(loc), dirty: !jsonDeepEqual(loc, srv) };
    }
    return { value: JSON.stringify(srv), dirty: false };
  }

  function reconcileMateriResumeWithHistory(resumeRaw, bestRaw, lastRaw) {
    if (typeof resumeRaw !== 'string' || !resumeRaw) return { value: resumeRaw, changed: false };
    const resume = parsePlainObj(resumeRaw);
    if (!resume) return { value: resumeRaw, changed: false };
    const best = parsePlainObj(bestRaw) || {};
    const last = parsePlainObj(lastRaw) || {};
    const next = { ...resume };
    let changed = false;

    for (const [k, rv] of Object.entries(resume)) {
      if (!rv || typeof rv !== 'object' || rv.deleted) continue;
      const doneAt = Math.max(Number(best[k]?.at) || 0, Number(last[k]?.at) || 0);
      if (doneAt <= 0) continue;
      const resUpd = Number(rv.updated) || 0;
      const resStart = Number(rv.startedAt) || 0;
      const sameFinishedSid = Boolean(rv.sessionId && last[k]?.sessionId && String(rv.sessionId) === String(last[k].sessionId));
      const isNewSessionAfterDone = !sameFinishedSid && (resStart > 0 ? resStart > doneAt : resUpd > doneAt);
      if (!isNewSessionAfterDone) {
        next[k] = {
          deleted: true,
          updated: Math.max(doneAt, resUpd),
          ...(last[k]?.sessionId || rv.sessionId ? { sessionId: last[k]?.sessionId || rv.sessionId } : {})
        };
        changed = true;
      }
    }
    return changed ? { value: JSON.stringify(next), changed: true } : { value: resumeRaw, changed: false };
  }

  function reconcileBankSessionsWithHistory(bankSessionsRaw, quizSessionRaw, bankBestRaw, historyRaw) {
    const bankBest = parsePlainObj(bankBestRaw) || {};
    const history = parseArr(historyRaw) || [];
    const histDoneByBank = {};
    for (const h of history) {
      const b = h?.bank || h?.bankId;
      if (!b) continue;
      const t = Date.parse(h?.date || h?.at || h?.ts || '') || 0;
      if (t > (histDoneByBank[b] || 0)) histDoneByBank[b] = t;
    }
    const doneMsOf = bankId => Math.max(
      Date.parse(bankBest[bankId]?.lastAt || '') || Number(bankBest[bankId]?.at) || 0,
      histDoneByBank[bankId] || 0
    );

    let bankSessionsValue = bankSessionsRaw;
    let bankSessionsChanged = false;
    const bankSessions = parsePlainObj(bankSessionsRaw);
    const nextBankSessions = bankSessions ? { ...bankSessions } : null;

    if (nextBankSessions) {
      for (const [bankId, sess] of Object.entries(nextBankSessions)) {
        if (!sess || typeof sess !== 'object' || sess.deleted) continue;
        const doneMs = doneMsOf(bankId);
        if (doneMs <= 0) continue;
        const sessUpd = bankSessTimestamp(sess);
        const sessStart = Number(sess.startedAt) || 0;
        const isNewAfterDone = sessStart > 0 ? sessStart > doneMs : sessUpd > doneMs;
        if (!isNewAfterDone) {
          const ts = Math.max(doneMs, sessUpd);
          nextBankSessions[bankId] = {
            deleted: true,
            bankId,
            updated: ts,
            savedAt: new Date(ts).toISOString(),
            ...(sess.sessionId ? { sessionId: sess.sessionId } : {})
          };
          bankSessionsChanged = true;
        }
      }
      if (bankSessionsChanged) bankSessionsValue = JSON.stringify(nextBankSessions);
    }

    let quizSessionValue = quizSessionRaw;
    let quizSessionChanged = false;
    const quizSess = parsePlainObj(quizSessionRaw);
    if (quizSess && !quizSess.deleted && !quizSess.isCustom && quizSess.selectedBank) {
      const bankId = quizSess.selectedBank;
      const doneMs = doneMsOf(bankId);
      const qUpd = bankSessTimestamp(quizSess);
      const qStart = Number(quizSess.startedAt) || 0;
      const bs = nextBankSessions?.[bankId];
      const bsTombMs = bs?.deleted ? bankSessTimestamp(bs) : 0;
      const effectiveDoneMs = Math.max(doneMs, bsTombMs);
      const sameTombSid = Boolean(bs?.deleted && bs?.sessionId && quizSess.sessionId && String(bs.sessionId) === String(quizSess.sessionId));
      const isNewAfterDone = !sameTombSid && effectiveDoneMs > 0 && (qStart > 0 ? qStart > effectiveDoneMs : qUpd > effectiveDoneMs);
      if (effectiveDoneMs > 0 && !isNewAfterDone) {
        const ts = Math.max(effectiveDoneMs, qUpd);
        quizSessionValue = JSON.stringify({
          deleted: true,
          updated: ts,
          savedAt: new Date(ts).toISOString(),
          ...(quizSess.sessionId ? { sessionId: quizSess.sessionId } : {})
        });
        quizSessionChanged = true;
      }
    }

    return { bankSessionsValue, bankSessionsChanged, quizSessionValue, quizSessionChanged };
  }

  function reconcileBookmarksWithMeta(bookmarksRaw, metaRaw) {
    const meta = parsePlainObj(metaRaw);
    if (!meta) return { value: bookmarksRaw, changed: false };
    const list = parseArr(bookmarksRaw) || [];
    const nextSet = new Set();
    for (const id of list) {
      const k = String(id);
      if (meta[k]?.deleted) continue;
      nextSet.add(k);
    }
    for (const [k, entry] of Object.entries(meta)) {
      if (entry && typeof entry === 'object' && !entry.deleted) nextSet.add(k);
    }
    const next = [...nextSet];
    const changed = typeof bookmarksRaw !== 'string' || next.length !== list.length || next.some((v, i) => v !== list[i]);
    return changed ? { value: JSON.stringify(next), changed: true } : { value: bookmarksRaw, changed: false };
  }

  function mergeJsonKey(key, localRaw, serverRaw) {
    if (localRaw === null || localRaw === undefined) return { value: serverRaw, dirty: false };
    try {
      const loc = JSON.parse(localRaw);
      const srv = JSON.parse(serverRaw);
      if ((key === 'gaster_v8_bookmarks' || key === 'clined_unlocked_achievements_v1' || key === 'clined_kedkel_summary_done_v2' || key === 'clined_kedkel_summary_star_v2' || key === 'clined_seen_cosmetics_v1' || key === 'clined_claimed_quiz_dia_v1') && Array.isArray(loc) && Array.isArray(srv)) {
        const merged = [...new Set([...srv, ...loc])];
        return { value: JSON.stringify(merged), dirty: merged.length > srv.length };
      }
      if (key === 'clined_study_log_v1' && loc && srv && typeof loc === 'object' && typeof srv === 'object' && !Array.isArray(loc) && !Array.isArray(srv)) {
        const merged = { ...srv }; let changed = false;
        for (const [d, v] of Object.entries(loc)) { const ln = Number(v) || 0, sn = Number(srv[d]) || 0; if (ln > sn) { merged[d] = ln; changed = true; } }
        return { value: JSON.stringify(merged), dirty: changed };
      }
      if (key === 'gaster_v8_wrong_stats' && Array.isArray(loc) && Array.isArray(srv)) {
        const byId = new Map(); let changed = false;
        for (const item of srv) if (item && item.id != null) byId.set(String(item.id), item);
        for (const item of loc) {
          if (!item || item.id == null) continue;
          const k = String(item.id), prev = byId.get(k);
          if (!prev) { byId.set(k, item); changed = true; }
          else {
            const lw = Number(item.wrong) || 0, pw = Number(prev.wrong) || 0;
            const lt = Date.parse(item.lastWrong || item.lastSeen || 0) || 0, pt = Date.parse(prev.lastWrong || prev.lastSeen || 0) || 0;
            if (lw > pw || lt > pt) { byId.set(k, { ...prev, ...item, wrong: Math.max(lw, pw), lastWrong: lt >= pt ? (item.lastWrong || prev.lastWrong) : prev.lastWrong }); changed = true; }
          }
        }
        return { value: JSON.stringify([...byId.values()]), dirty: changed };
      }
      if (key === 'gaster_daily_streak_v1' && loc && srv && typeof loc === 'object' && typeof srv === 'object') {
        const hasCounts = (loc.counts && typeof loc.counts === 'object' && !Array.isArray(loc.counts)) || (srv.counts && typeof srv.counts === 'object' && !Array.isArray(srv.counts));
        const hasLegacy = Array.isArray(loc.days) || Array.isArray(srv.days) || 'lastDate' in loc || 'lastDate' in srv || 'best' in loc || 'best' in srv;
        const merged = { ...srv, ...loc };
        let dirty = false;
        if (hasCounts) {
          const lc = (loc.counts && typeof loc.counts === 'object' && !Array.isArray(loc.counts)) ? loc.counts : {};
          const sc = (srv.counts && typeof srv.counts === 'object' && !Array.isArray(srv.counts)) ? srv.counts : {};
          const counts = {};
          const allDays = [...new Set([...Object.keys(sc), ...Object.keys(lc)])].sort();
          for (const d of allDays) {
            const lv = Math.max(0, Number(lc[d]) || 0), sv = Math.max(0, Number(sc[d]) || 0), mx = Math.max(lv, sv);
            counts[d] = mx;
            if (mx > sv || !(d in sc)) dirty = true;
          }
          merged.counts = counts;
        }
        if (hasLegacy) {
          const days = [...new Set([...(Array.isArray(srv.days) ? srv.days : []), ...(Array.isArray(loc.days) ? loc.days : [])])].sort();
          const lLast = String(loc.lastDate || ''), sLast = String(srv.lastDate || '');
          const lastDate = lLast >= sLast ? lLast : sLast;
          const calcStreak = hasCounts ? trailingStreakFromCounts(merged.counts) : 0;
          const streak = Math.max(Number(loc.streak) || 0, Number(srv.streak) || 0, calcStreak);
          const best = Math.max(Number(loc.best) || 0, Number(srv.best) || 0, streak);
          merged.days = days; merged.lastDate = lastDate; merged.streak = streak; merged.best = best;
          if (!dirty && !jsonDeepEqual(merged, srv)) dirty = true;
        } else {
          const calcStreak = hasCounts ? trailingStreakFromCounts(merged.counts) : 0;
          const streak = Math.max(Number(loc.streak) || 0, Number(srv.streak) || 0, calcStreak);
          merged.streak = streak;
          if (streak > (Number(srv.streak) || 0)) dirty = true;
        }
        return { value: JSON.stringify(merged), dirty };
      }
      if (key === 'gaster_v8_history' && Array.isArray(loc) && Array.isArray(srv)) {
        const sig = x => `${x?.at || x?.ts || x?.date || ''}|${x?.bank || x?.bankId || ''}|${x?.score ?? ''}|${x?.total ?? ''}`;
        const map = new Map();
        for (const item of srv) if (item && typeof item === 'object') map.set(sig(item), item);
        let changed = false;
        for (const item of loc) { if (!item || typeof item !== 'object') continue; const k = sig(item); if (!map.has(k)) { map.set(k, item); changed = true; } }
        const merged = [...map.values()].sort((a, b) => (Date.parse(b?.at || b?.ts || b?.date || 0) || 0) - (Date.parse(a?.at || a?.ts || a?.date || 0) || 0)).slice(0, 250);
        return { value: JSON.stringify(merged), dirty: changed };
      }
      if (key === 'gaster_v22_question_performance' && loc && srv && typeof loc === 'object' && typeof srv === 'object' && !Array.isArray(loc) && !Array.isArray(srv)) {
        const merged = { ...srv }; let changed = false;
        for (const [k, lv] of Object.entries(loc)) {
          const sv = srv[k];
          if (!sv) { merged[k] = lv; changed = true; }
          else if (lv && typeof lv === 'object' && typeof sv === 'object') {
            const la = Number(lv.attempts || lv.seen || 0), sa = Number(sv.attempts || sv.seen || 0), lc = Number(lv.correct || 0), sc = Number(sv.correct || 0), lw = Number(lv.wrong || 0), sw = Number(sv.wrong || 0);
            if (la > sa || lc > sc || lw > sw) { merged[k] = { ...sv, ...lv, attempts: Math.max(la, sa), correct: Math.max(lc, sc), wrong: Math.max(lw, sw) }; changed = true; }
          }
        }
        return { value: JSON.stringify(merged), dirty: changed };
      }
      if ((key === 'clined_sm2_v1' || key.startsWith('clined_upi_flashcards_block_v2_')) && loc && srv && typeof loc === 'object' && typeof srv === 'object' && !Array.isArray(loc) && !Array.isArray(srv)) {
        const merged = { ...srv }; let changed = false;
        for (const [k, lv] of Object.entries(loc)) {
          const sv = srv[k];
          if (!sv) { merged[k] = lv; changed = true; }
          else if (lv && typeof lv === 'object' && sv && typeof sv === 'object') {
            const lt = Date.parse(lv?.lastReview || lv?.updatedAt || 0) || Number(lv?.dueAt) || 0, st = Date.parse(sv?.lastReview || sv?.updatedAt || 0) || Number(sv?.dueAt) || 0;
            const lReps = Number(lv?.reps) || 0, sReps = Number(sv?.reps) || 0, lLapses = Number(lv?.lapses) || 0, sLapses = Number(sv?.lapses) || 0;
            if (lReps > sReps || lLapses > sLapses || lt > st) { merged[k] = lv; changed = true; }
          }
        }
        return { value: JSON.stringify(merged), dirty: changed };
      }
      if ((key === 'clined_upi_custom_cards_v1' || key === 'clined_userbank_index_v1') && Array.isArray(loc) && Array.isArray(srv)) {
        const byId = new Map(); let changed = false;
        for (const item of srv) if (item && item.id != null) byId.set(String(item.id), item);
        for (const item of loc) {
          if (!item || item.id == null) continue;
          const k = String(item.id), prev = byId.get(k);
          if (!prev) { byId.set(k, item); changed = true; }
          else {
            const lt = Date.parse(item.updatedAt || item.createdAt || 0) || Number(item.updated || item.at) || 0;
            const pt = Date.parse(prev.updatedAt || prev.createdAt || 0) || Number(prev.updated || prev.at) || 0;
            if (lt > pt) { byId.set(k, item); changed = true; }
          }
        }
        return { value: JSON.stringify([...byId.values()]), dirty: changed };
      }
      if ((key === 'clined_materi_flags_v1' || key === 'clined_bookmarks_meta_v1') && loc && srv && typeof loc === 'object' && typeof srv === 'object' && !Array.isArray(loc) && !Array.isArray(srv)) {
        const merged = { ...srv }; let changed = false;
        for (const [k, lv] of Object.entries(loc)) {
          if (!lv || typeof lv !== 'object') continue;
          const sv = srv[k];
          if (!sv || typeof sv !== 'object') { merged[k] = lv; changed = true; }
          else {
            const lt = Number(lv.at) || 0, st = Number(sv.at) || 0;
            if (lt > st || (lt === st && !lv.deleted && sv.deleted)) { merged[k] = lv; changed = true; }
          }
        }
        return { value: JSON.stringify(merged), dirty: changed };
      }
      if (key === 'clined_materi_best_v1' && loc && srv && typeof loc === 'object' && typeof srv === 'object' && !Array.isArray(loc) && !Array.isArray(srv)) {
        const merged = { ...srv }; let changed = false;
        for (const [k, lv] of Object.entries(loc)) {
          if (!lv || typeof lv !== 'object') continue;
          const sv = srv[k];
          if (!sv || typeof sv !== 'object') { merged[k] = lv; changed = true; }
          else {
            const lp = Number(lv.pct) || 0, sp = Number(sv.pct) || 0, ls = Number(lv.score) || 0, ss = Number(sv.score) || 0, lt = Number(lv.at) || 0, st = Number(sv.at) || 0;
            const winScore = lp > sp || (lp === sp && ls > ss) || (lp === sp && ls === ss && lt >= st);
            const maxAt = Math.max(lt, st);
            if (lp > sp || (lp === sp && ls > ss) || lt > st) {
              const base = winScore ? { ...sv, ...lv } : { ...lv, ...sv };
              merged[k] = { ...base, pct: Math.max(lp, sp), score: winScore ? ls : ss, at: maxAt };
              if (!jsonDeepEqual(merged[k], sv)) changed = true;
            }
          }
        }
        return { value: JSON.stringify(merged), dirty: changed };
      }
      if (key === 'clined_bank_best_v1' && loc && srv && typeof loc === 'object' && typeof srv === 'object' && !Array.isArray(loc) && !Array.isArray(srv)) {
        const merged = { ...srv }; let changed = false;
        for (const [k, lv] of Object.entries(loc)) {
          if (!lv || typeof lv !== 'object') continue;
          const sv = srv[k];
          if (!sv || typeof sv !== 'object') { merged[k] = lv; changed = true; }
          else {
            const lp = Number(lv.bestPct ?? lv.pct) || 0, sp = Number(sv.bestPct ?? sv.pct) || 0;
            const ls = Number(lv.bestScore ?? lv.score) || 0, ss = Number(sv.bestScore ?? sv.score) || 0;
            const lAtt = Number(lv.attempts) || 0, sAtt = Number(sv.attempts) || 0;
            const lt = Date.parse(lv.lastAt || '') || Number(lv.at) || 0, st = Date.parse(sv.lastAt || '') || Number(sv.at) || 0;
            const winBest = lp > sp || (lp === sp && ls > ss), winLast = lt >= st;
            if (winBest || lAtt > sAtt || lt > st) {
              merged[k] = {
                ...sv, ...lv,
                bestPct: Math.max(lp, sp),
                bestScore: winBest ? ls : ss,
                bestTotal: winBest ? (Number(lv.bestTotal ?? lv.total) || Number(sv.bestTotal ?? sv.total) || 0) : (Number(sv.bestTotal ?? sv.total) || Number(lv.bestTotal ?? lv.total) || 0),
                lastPct: winLast ? (lv.lastPct ?? lp) : (sv.lastPct ?? sp),
                attempts: Math.max(lAtt, sAtt),
                lastAt: winLast ? (lv.lastAt || sv.lastAt || '') : (sv.lastAt || lv.lastAt || '')
              };
              changed = true;
            }
          }
        }
        return { value: JSON.stringify(merged), dirty: changed };
      }
      if (key === 'clined_bank_sessions_v1' && loc && srv && typeof loc === 'object' && typeof srv === 'object' && !Array.isArray(loc) && !Array.isArray(srv)) {
        const merged = { ...srv }; let changed = false;
        for (const [k, lv] of Object.entries(loc)) {
          if (!lv || typeof lv !== 'object') continue;
          const sv = srv[k];
          if (!sv || typeof sv !== 'object') { merged[k] = lv; changed = true; }
          else {
            const res = mergeBankSessionEntry(lv, sv);
            if (res.changed) { merged[k] = res.entry; changed = true; }
          }
        }
        return { value: JSON.stringify(merged), dirty: changed };
      }
      if (key === 'gaster_v8_quiz_session' && loc && srv && typeof loc === 'object' && typeof srv === 'object' && !Array.isArray(loc) && !Array.isArray(srv)) {
        return mergeQuizSession(loc, srv);
      }
      if (key === 'clined_materi_last_v1' && loc && srv && typeof loc === 'object' && typeof srv === 'object' && !Array.isArray(loc) && !Array.isArray(srv)) {
        const merged = { ...srv }; let changed = false;
        for (const [k, lv] of Object.entries(loc)) {
          if (!lv || typeof lv !== 'object') continue;
          const sv = srv[k];
          if (!sv || typeof sv !== 'object') { merged[k] = lv; changed = true; }
          else if ((Number(lv.at) || 0) > (Number(sv.at) || 0)) { merged[k] = lv; changed = true; }
        }
        return { value: JSON.stringify(merged), dirty: changed };
      }
      if (key === 'clined_materi_resume_v2' && loc && srv && typeof loc === 'object' && typeof srv === 'object' && !Array.isArray(loc) && !Array.isArray(srv)) {
        const merged = { ...srv }; let changed = false;
        for (const [k, lv] of Object.entries(loc)) {
          if (!lv || typeof lv !== 'object') continue;
          const sv = srv[k];
          if (!sv || typeof sv !== 'object') { merged[k] = lv; changed = true; }
          else {
            const res = mergeMateriResumeEntry(lv, sv);
            if (res.changed) { merged[k] = res.entry; changed = true; }
          }
        }
        return { value: JSON.stringify(merged), dirty: changed };
      }
      if (key === 'clined_qtime_v1' && loc && srv && typeof loc === 'object' && typeof srv === 'object' && !Array.isArray(loc) && !Array.isArray(srv)) {
        const merged = { ...srv }; let changed = false;
        for (const [k, lv] of Object.entries(loc)) {
          if (!lv || typeof lv !== 'object') continue;
          const sv = srv[k];
          if (!sv || typeof sv !== 'object') { merged[k] = lv; changed = true; }
          else {
            const next = { n: Math.max(Number(lv.n) || 0, Number(sv.n) || 0), sum: Math.max(Number(lv.sum) || 0, Number(sv.sum) || 0), fastWrong: Math.max(Number(lv.fastWrong) || 0, Number(sv.fastWrong) || 0), slow: Math.max(Number(lv.slow) || 0, Number(sv.slow) || 0) };
            if (next.n !== (Number(sv.n) || 0) || next.sum !== (Number(sv.sum) || 0) || next.fastWrong !== (Number(sv.fastWrong) || 0) || next.slow !== (Number(sv.slow) || 0)) { merged[k] = next; changed = true; }
          }
        }
        return { value: JSON.stringify(merged), dirty: changed };
      }
      if ((key === 'clined_notes_v1' || key === 'clined_resep_best_v1' || key === 'clined_resep_lp_best_v1' || key === 'clined_clinical_quest_v1' || key === 'clined_duel_claims_v1' || key === 'clined_ann_seen_v1') && loc && srv && typeof loc === 'object' && typeof srv === 'object' && !Array.isArray(loc) && !Array.isArray(srv)) {
        const merged = maxMergeDeep(loc, srv);
        return { value: JSON.stringify(merged), dirty: !jsonDeepEqual(merged, srv) };
      }
      if (key === 'clined_xp_daily_refs_v1' && loc && srv && typeof loc === 'object' && typeof srv === 'object') {
        if (loc.day && loc.day === srv.day) {
          const v = Math.max(Number(loc.v) || 1, Number(srv.v) || 1);
          const lRefs = loc.refs && typeof loc.refs === 'object' ? loc.refs : {};
          const sRefs = srv.refs && typeof srv.refs === 'object' ? srv.refs : {};
          const refs = {};
          const keys = new Set([...Object.keys(sRefs), ...Object.keys(lRefs)]);
          let dirty = v > (Number(srv.v) || 1);
          for (const k of keys) {
            const lv = Number(lRefs[k]) || 0, sv = Number(sRefs[k]) || 0;
            const normL = (Number(loc.v) >= 2) ? lv : (lv ? 9999 : 0);
            const normS = (Number(srv.v) >= 2) ? sv : (sv ? 9999 : 0);
            const mx = Math.max(normL, normS);
            refs[k] = mx;
            if (mx > normS || !(k in sRefs)) dirty = true;
          }
          return { value: JSON.stringify({ v, day: srv.day, refs }), dirty };
        }
        return { value: JSON.stringify(String(loc.day || '') > String(srv.day || '') ? loc : srv), dirty: String(loc.day || '') > String(srv.day || '') };
      }
      if (key.startsWith('clined_timer_sessions_')) {
        const mx = Math.max(Number(loc) || 0, Number(srv) || 0);
        return { value: String(mx), dirty: mx > (Number(srv) || 0) };
      }
    } catch {}
    return null;
  }

  function parseXpNum(raw) {
    if (typeof raw === 'number') return Number.isFinite(raw) && raw >= 0 ? Math.round(raw) : null;
    if (typeof raw !== 'string' || !raw.trim()) return null;
    try {
      const p = JSON.parse(raw);
      const n = Number(p);
      return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
    } catch {
      const n = Number(raw);
      return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
    }
  }

  function sameVal(a, b) {
    if (a === b) return true;
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    const tA = a.trim(), tB = b.trim();
    if (!tA || !tB || (tA[0] !== '{' && tA[0] !== '[') || tA[0] !== tB[0]) return false;
    try {
      return jsonDeepEqual(JSON.parse(tA), JSON.parse(tB));
    } catch { return false; }
  }

  function reconcileLocalCrossState(autoSchedule = false) {
    const healed = [];
    suppress = true;
    try {
      const matRes = reconcileMateriResumeWithHistory(
        localStorage.getItem('clined_materi_resume_v2'),
        localStorage.getItem('clined_materi_best_v1'),
        localStorage.getItem('clined_materi_last_v1')
      );
      if (matRes.changed && typeof matRes.value === 'string') {
        nativeSet('clined_materi_resume_v2', matRes.value);
        healed.push(['clined_materi_resume_v2', matRes.value]);
      }

      const bankRes = reconcileBankSessionsWithHistory(
        localStorage.getItem('clined_bank_sessions_v1'),
        localStorage.getItem('gaster_v8_quiz_session'),
        localStorage.getItem('clined_bank_best_v1'),
        localStorage.getItem('gaster_v8_history')
      );
      if (bankRes.bankSessionsChanged && typeof bankRes.bankSessionsValue === 'string') {
        nativeSet('clined_bank_sessions_v1', bankRes.bankSessionsValue);
        healed.push(['clined_bank_sessions_v1', bankRes.bankSessionsValue]);
      }
      if (bankRes.quizSessionChanged && typeof bankRes.quizSessionValue === 'string') {
        nativeSet('gaster_v8_quiz_session', bankRes.quizSessionValue);
        healed.push(['gaster_v8_quiz_session', bankRes.quizSessionValue]);
      }

      const bookRes = reconcileBookmarksWithMeta(
        localStorage.getItem('gaster_v8_bookmarks'),
        localStorage.getItem('clined_bookmarks_meta_v1')
      );
      if (bookRes.changed && typeof bookRes.value === 'string') {
        nativeSet('gaster_v8_bookmarks', bookRes.value);
        healed.push(['gaster_v8_bookmarks', bookRes.value]);
      }
    } finally {
      suppress = false;
    }

    for (const [k, v] of healed) {
      markSet(k, v, autoSchedule);
    }
    return healed.map(([k]) => k);
  }

  function apply(state, opts = {}) {
    let restoreXP = null;
    const rePush = [];
    const cleanQueued = [];
    const changedKeys = [];
    const xpKey = 'gaster_v11_xp';
    let changed = Boolean(opts && opts.forceNotify);
    const queuedByKey = new Map();
    for (const op of getQueue()) {
      if (op?.key) queuedByKey.set(op.key, op);
    }

    suppress = true;
    try {
      for (const [key, item] of Object.entries(state || {})) {
        if (!safe(key) || !item) continue;
        if (key === xpKey) {
          const localRaw = localStorage.getItem(xpKey);
          const localXP = parseXpNum(localRaw);
          const serverXP = item.deleted ? null : parseXpNum(item.value);
          if (localXP !== null && (serverXP === null || localXP > serverXP)) {
            restoreXP = String(localXP);
            continue;
          }
          if (serverXP !== null) {
            const sVal = String(serverXP);
            if (localRaw !== sVal) { nativeSet(xpKey, sVal); changed = true; changedKeys.push(xpKey); }
            cleanQueued.push(xpKey);
          }
          continue;
        }
        if (item.deleted) {
          const qOp = queuedByKey.get(key);
          const qMs = Date.parse(qOp?.updatedAt || '') || 0;
          const sMs = Date.parse(item.updatedAt || '') || 0;
          if (qOp && qOp.type === 'set' && qMs > sMs) {
            continue;
          }
          if (localStorage.getItem(key) !== null) { nativeRemove(key); changed = true; changedKeys.push(key); }
          cleanQueued.push(key);
          continue;
        }
        if (typeof item.value === 'string') {
          const prevVal = localStorage.getItem(key);
          const merged = mergeJsonKey(key, prevVal, item.value);
          if (merged) {
            if (prevVal !== merged.value) {
              nativeSet(key, merged.value);
              if (!sameVal(prevVal, merged.value)) { changed = true; changedKeys.push(key); }
            }
            if (merged.dirty || !sameVal(merged.value, item.value)) rePush.push([key, merged.value]);
            else cleanQueued.push(key);
          } else {
            const qOp = queuedByKey.get(key);
            const qMs = Date.parse(qOp?.updatedAt || '') || 0;
            const sMs = Date.parse(item.updatedAt || '') || 0;
            if (qOp && qMs > sMs) {
              continue;
            }
            if (prevVal !== item.value) {
              nativeSet(key, item.value);
              if (!sameVal(prevVal, item.value)) { changed = true; changedKeys.push(key); }
            }
            cleanQueued.push(key);
          }
        }
      }
    } finally {
      suppress = false;
    }

    for (const k of cleanQueued) dropQueuedKey(k, false);
    if (restoreXP !== null) markSet(xpKey, restoreXP, false);
    for (const [k, v] of rePush) markSet(k, v, false);

    const healedKeys = reconcileLocalCrossState(false);
    for (const hk of healedKeys) {
      if (!changedKeys.includes(hk)) changedKeys.push(hk);
      changed = true;
    }

    if (restoreXP !== null || rePush.length || healedKeys.length) {
      flushQueueNow();
    }

    if ((changed && Object.keys(state || {}).length) || healedKeys.length) {
      window.dispatchEvent(new CustomEvent('clined:sync-applied', {
        detail: { keys: changedKeys, full: Boolean(opts && opts.forceNotify) }
      }));
    }
  }

  function reconcileFullWithServer(serverState) {
    const srvState = serverState || {};
    const xpKey = 'gaster_v11_xp';
    const extraChanged = [];

    for (const key of learningKeys()) {
      const localVal = localStorage.getItem(key);
      if (localVal === null) continue;
      const srvEntry = srvState[key];

      if (!srvEntry) {
        markSet(key, localVal, false);
        continue;
      }

      if (key === xpKey) {
        const lXp = parseXpNum(localVal);
        const sXp = srvEntry.deleted ? null : parseXpNum(srvEntry.value);
        if (lXp !== null && (sXp === null || lXp > sXp)) {
          markSet(xpKey, String(lXp), false);
        }
        continue;
      }

      if (srvEntry.deleted) continue;

      if (typeof srvEntry.value === 'string' && !sameVal(localVal, srvEntry.value)) {
        const merged = mergeJsonKey(key, localVal, srvEntry.value);
        if (merged) {
          if (localVal !== merged.value) {
            suppress = true;
            try { nativeSet(key, merged.value); } finally { suppress = false; }
            if (!sameVal(localVal, merged.value)) extraChanged.push(key);
          }
          if (merged.dirty || !sameVal(merged.value, srvEntry.value)) {
            markSet(key, merged.value, false);
          }
        }
      }
    }

    const healedKeys = reconcileLocalCrossState(false);
    for (const hk of healedKeys) {
      const val = localStorage.getItem(hk);
      const srvVal = srvState[hk] && !srvState[hk].deleted ? srvState[hk].value : null;
      if (val !== null && (srvVal === null || !sameVal(val, srvVal))) {
        markSet(hk, val, false);
      }
      if (!extraChanged.includes(hk)) extraChanged.push(hk);
    }

    flushQueueNow();
    if (extraChanged.length) {
      window.dispatchEvent(new CustomEvent('clined:sync-applied', {
        detail: { keys: extraChanged, full: true }
      }));
    }
  }

  async function pull(forceFull = false) {
    if (forceFull) {
      try { nativeRemove(CURSOR); } catch {}
    }
    let cursor = forceFull ? null : localStorage.getItem(CURSOR);
    let loops = 0;
    while (loops++ < 10) {
      const path = cursor ? `/api/sync?since=${encodeURIComponent(cursor)}` : '/api/sync';
      const d = await request(path);
      if (d.mode === 'full') {
        apply(d.state || {}, { forceNotify: true });
        reconcileFullWithServer(d.state || {});
        lastFullPullAt = Date.now();
      } else {
        apply(d.changes || {});
      }
      if (d.updatedAt) {
        cursor = d.updatedAt;
        nativeSet(CURSOR, d.updatedAt);
      }
      if (!d.hasMore) return d;
    }
    return { mode: 'delta', hasMore: true, updatedAt: cursor };
  }

  function compactOpIfNeeded(op) {
    if (!op || op.type !== 'set' || typeof op.value !== 'string') return op;
    if (utf8Bytes(op.value) <= MAX_VALUE_BYTES) return op;
    try {
      const compacted = JSON.stringify(JSON.parse(op.value));
      if (utf8Bytes(compacted) <= MAX_VALUE_BYTES) return { ...op, value: compacted };
    } catch {}
    return op;
  }

  function prioritizeOps(ops) {
    return ops
      .map((op, idx) => ({ op, idx, prio: keyPriority(op?.key) }))
      .sort((a, b) => (a.prio - b.prio) || (b.idx - a.idx))
      .map(x => x.op);
  }

  function flushBeacon() {
    try {
      try { window.dispatchEvent(new Event('clined:before-sync-flush')); } catch {}
      reconcileLocalCrossState(false);
      flushQueueNow();
      if (!navigator.onLine || !localStorage.getItem(ACTIVE_USER)) return;
      const ops = getQueue();
      if (!ops.length) return;

      const ordered = prioritizeOps(ops);
      const selected = [];
      let currentPayload = '';
      for (const rawOp of ordered) {
        if (selected.length >= MAX_BATCH_OPS) break;
        const op = compactOpIfNeeded(rawOp);
        if (op.type === 'set' && utf8Bytes(op.value) > MAX_VALUE_BYTES) continue;
        const candidate = [...selected, op];
        const candidateStr = JSON.stringify({ clientId: CLIENT_ID, operations: candidate });
        if (utf8Bytes(candidateStr) <= MAX_BEACON_BYTES) {
          selected.push(op);
          currentPayload = candidateStr;
        }
      }
      if (!selected.length || !currentPayload) return;

      let sent = false;
      if (typeof navigator.sendBeacon === 'function') {
        try {
          sent = navigator.sendBeacon('/api/sync', new Blob([currentPayload], { type: 'application/json' }));
        } catch {
          sent = false;
        }
      }
      if (!sent) {
        fetch('/api/sync', {
          method: 'POST',
          credentials: 'same-origin',
          keepalive: true,
          headers: { 'Content-Type': 'application/json' },
          body: currentPayload
        }).catch(() => {});
      }
    } catch {}
  }

  async function postOperationsGroup(group) {
    const saved = await request('/api/sync', {
      method: 'POST',
      body: JSON.stringify({ clientId: CLIENT_ID, operations: group })
    });
    const accepted = saved.changes || {};
    const confirmed = group.filter(op => Object.prototype.hasOwnProperty.call(accepted, op.key));
    if (confirmed.length) {
      const ids = new Set(confirmed.map(op => op.id));
      setQueue(getQueue().filter(op => !ids.has(op.id)), true);
    } else if (group.length === 1) {
      // Single-op POST succeeded (200 OK) without server accepting the key -> server rejected key/size; drop to prevent infinite loop.
      const badId = group[0].id;
      setQueue(getQueue().filter(op => op.id !== badId), true);
    }
    apply(accepted);
    if (saved.unlocked100k?.unlocked) window.CLINED_XP_100K?.onUnlock?.(saved.unlocked100k);
  }

  async function sendGroupWithPerKeyFallback(group) {
    const cleaned = [];
    for (const rawOp of group) {
      if (!rawOp || !safe(rawOp.key)) {
        if (rawOp?.id) setQueue(getQueue().filter(x => x.id !== rawOp.id), true);
        continue;
      }
      const op = compactOpIfNeeded(rawOp);
      if (op.type === 'set' && utf8Bytes(op.value) > MAX_VALUE_BYTES) {
        console.warn('[CLINED sync] Skipping oversized key >500KB:', op.key);
        setQueue(getQueue().filter(x => x.id !== op.id), true);
        continue;
      }
      cleaned.push(op);
    }
    if (!cleaned.length) return;

    const batchBody = JSON.stringify({ clientId: CLIENT_ID, operations: cleaned });
    const batchTooLarge = cleaned.length > 1 && utf8Bytes(batchBody) > 500_000;

    if (!batchTooLarge) {
      try {
        await postOperationsGroup(cleaned);
        return;
      } catch (err) {
        if (cleaned.length <= 1 || !navigator.onLine || err?.status === 401 || err?.status === 429) {
          throw err;
        }
      }
    }

    // Per-key fallback: never silently skip a batch; isolate each key so valid progress always lands.
    let firstErr = null;
    for (const singleOp of cleaned) {
      try {
        await postOperationsGroup([singleOp]);
      } catch (err) {
        if (!firstErr) firstErr = err;
        if (!navigator.onLine || err?.status === 401 || err?.status === 429) break;
      }
    }
    if (firstErr) throw firstErr;
  }

  async function sync({ force = false, full = false } = {}) {
    if (full) pendingFullPull = true;
    if (!navigator.onLine) return;
    const id = localStorage.getItem(ACTIVE_USER);
    if (!id) return;
    if (sending) {
      if (force || full || dirty || getQueue().length) pendingResync = true;
      return;
    }

    const now = Date.now();
    const duePeriodicFull = !lastFullPullAt || (now - lastFullPullAt >= FULL_RECONCILE_MS);
    if (duePeriodicFull) pendingFullPull = true;

    const needs = force || full || pendingFullPull || dirty || getQueue().length || (now - lastPullAt >= PERIODIC_PULL_MS);
    if (!needs) return;

    sending = true;
    pendingResync = false;
    const doFull = pendingFullPull;
    pendingFullPull = false;

    try {
      reconcileLocalCrossState(false);
      await pull(doFull);

      // Preserve chronological causal order within prioritized push: critical keys first, oldest->newest within same priority
      const orderedForPush = getQueue()
        .slice()
        .map((op, idx) => ({ op, idx, prio: keyPriority(op?.key) }))
        .sort((a, b) => (a.prio - b.prio) || (a.idx - b.idx))
        .map(x => x.op);

      const batches = [];
      let batch = [];
      let batchBytes = 64;
      for (const rawOp of orderedForPush) {
        const op = compactOpIfNeeded(rawOp);
        const opBytes = utf8Bytes(JSON.stringify(op)) + 2;
        if (batch.length && (batch.length >= MAX_BATCH_OPS || batchBytes + opBytes > MAX_BATCH_BYTES)) {
          batches.push(batch);
          batch = [op];
          batchBytes = 64 + opBytes;
        } else {
          batch.push(op);
          batchBytes += opBytes;
        }
      }
      if (batch.length) batches.push(batch);

      for (const group of batches) {
        await sendGroupWithPerKeyFallback(group);
      }

      dirty = getQueue().length > 0;
      lastPullAt = Date.now();
    } catch {
      dirty = true;
      if (doFull) pendingFullPull = true;
    } finally {
      sending = false;
      if (pendingResync || pendingFullPull || getQueue().length > 0) {
        const again = pendingResync || pendingFullPull || getQueue().length > 0;
        pendingResync = false;
        if (again && navigator.onLine) setTimeout(() => sync({ force: true }), 280);
      }
    }
  }

  function onRemoteUpdate(info) {
    if (info && info.clientId && info.clientId === CLIENT_ID) return;
    clearTimeout(remotePullTimer);
    remotePullTimer = setTimeout(() => {
      remotePullTimer = 0;
      sync({ force: true });
    }, 220);
  }

  function onStreamOpen() {
    const sleptLong = hiddenAt > 0 && (Date.now() - hiddenAt >= 45_000);
    return sync({ force: true, full: sleptLong });
  }

  window.addEventListener('online', () => sync({ force: true, full: true }));
  window.addEventListener('pagehide', () => { flushBeacon(); });
  window.addEventListener('pageshow', () => { sync({ force: true }); });
  window.addEventListener('clined:before-reload', () => { flushBeacon(); });
  window.addEventListener('clined:stream-open', () => { onStreamOpen(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      hiddenAt = Date.now();
      flushBeacon();
    } else {
      const sleptMs = hiddenAt > 0 ? (Date.now() - hiddenAt) : 0;
      hiddenAt = 0;
      sync({ force: true, full: sleptMs >= 60_000 });
    }
  });
  window.addEventListener('focus', () => {
    if (Date.now() - lastPullAt >= 2000 || dirty || getQueue().length) {
      sync({ force: true });
    }
  });
  window.addEventListener('clined:auth-ready', () => sync({ force: true, full: true }));
  setInterval(() => {
    if (document.visibilityState === 'visible') sync();
  }, PERIODIC_PULL_MS);

  window.CLINED_ONLINE_SYNC = {
    clientId: CLIENT_ID,
    sync,
    switchUser,
    clearLocalLearningData,
    onRemoteUpdate,
    onStreamOpen,
    flushBeacon,
    isSafeKey: safe,
    reconcileLocal: reconcileLocalCrossState,
    markDirty: () => scheduleDirtySync(true),
  };

  if (document.readyState === 'complete') {
    setTimeout(() => sync({ force: true, full: true }), 0);
  } else {
    window.addEventListener('load', () => sync({ force: true, full: true }), { once: true });
  }
})();
