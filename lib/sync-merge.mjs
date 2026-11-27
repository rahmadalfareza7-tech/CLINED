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
    for (const item of a) {
      if (!out.some(x => JSON.stringify(x) === JSON.stringify(item))) out.push(item);
    }
    return out;
  }
  if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
    const out = { ...b };
    for (const [k, v] of Object.entries(a)) {
      out[k] = Object.prototype.hasOwnProperty.call(b, k) ? maxMergeDeep(v, b[k]) : v;
    }
    return out;
  }
  return b !== undefined ? b : a;
}

const ALLOWED_KEY_PREFIX_RE = /^(gaster_|clined_|medicalRpg|medical_rpg|current_block|last_worked|dashboard_block|alpha5_)/;
const EXCLUDED_LOCAL_OR_CACHE_KEY_RE = /^(?:clined_(?:account_profile|google_form_url|schema_version|migrated_at|menu|member_sidebar|active_user_id|sync_cursor|sync_meta|online_sync_queue|xp_queue|glossary_v1|resep_overrides_v1|materi_packs_cache|materi_resume$|last_view|upd_at|sw_version|push_dismiss|active_duel_id|usage_off)|gaster_v22_question_ability_map$)/;
const EXCLUDED_DERIVED_CACHE_RE = /(?:_ability_map|_packs_cache)$/i;
const BLOCKED_AUTH_TOKEN_RE = /(?:^|[_-])(?:auth|password|passwd|secret|cookie|credential|jwt|bearer|apikey|api_key)(?:$|[_-])|(?:auth|login|user|account)[_-]?session|session[_-]?(?:token|id|key|secret|cookie)|(?:auth|access|refresh|csrf|id|api|reset|session)[_-]?token|^token$|sync_queue|sync_cursor|last_activity|xp_queue/i;

export function isValidSyncKey(key) {
  if (typeof key !== 'string' || !key || key.length > 120) return false;
  if (!ALLOWED_KEY_PREFIX_RE.test(key)) return false;
  if (EXCLUDED_LOCAL_OR_CACHE_KEY_RE.test(key)) return false;
  if (EXCLUDED_DERIVED_CACHE_RE.test(key)) return false;
  if (BLOCKED_AUTH_TOKEN_RE.test(key)) return false;
  return true;
}

function parsePlainObj(raw) {
  if (typeof raw !== 'string' || !raw) return null;
  try {
    const p = JSON.parse(raw);
    return p && typeof p === 'object' && !Array.isArray(p) ? p : null;
  } catch {
    return null;
  }
}

function parseArr(raw) {
  if (typeof raw !== 'string' || !raw) return null;
  try {
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p : null;
  } catch {
    return null;
  }
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
  if (Array.isArray(entry?.ans)) {
    return entry.ans.filter(a => a !== null && a !== undefined).length;
  }
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
    const svNewerSession = !sameSid && (sStart > 0 ? sStart > lt : st > lt);
    if (svNewerSession) return { entry: sv, changed: false };
    const next = {
      deleted: true,
      updated: Math.max(lt, st),
      ...(lv?.sessionId || sv?.sessionId ? { sessionId: lv?.sessionId || sv?.sessionId } : {})
    };
    return { entry: next, changed: true };
  }

  if (!lDel && sDel) {
    const lStart = Number(lv?.startedAt) || 0;
    const sameSid = Boolean(lv?.sessionId && sv?.sessionId && String(lv.sessionId) === String(sv.sessionId));
    const lvNewerSession = !sameSid && (lStart > 0 ? lStart > st : lt > st);
    if (lvNewerSession) return { entry: lv, changed: true };
    return { entry: sv, changed: false };
  }

  const lAnsCnt = countMateriAnswered(lv);
  const sAnsCnt = countMateriAnswered(sv);

  if (isSameMateriSession(lv, sv)) {
    const lPos = Math.max(0, Number(lv?.pos) || 0);
    const sPos = Math.max(0, Number(sv?.pos) || 0);
    const preferLocal = lAnsCnt > sAnsCnt || (lAnsCnt === sAnsCnt && (lPos > sPos || (lPos === sPos && lt >= st)));
    const base = preferLocal ? lv : sv;
    const seq = Array.isArray(base?.seq) && base.seq.length
      ? base.seq
      : (Array.isArray(sv?.seq) ? sv.seq : lv?.seq);
    const lAnsArr = Array.isArray(lv?.ans) ? lv.ans : null;
    const sAnsArr = Array.isArray(sv?.ans) ? sv.ans : null;
    let mergedAns;
    if (lAnsArr || sAnsArr) {
      const len = Math.max(
        Array.isArray(seq) ? seq.length : 0,
        lAnsArr ? lAnsArr.length : 0,
        sAnsArr ? sAnsArr.length : 0
      );
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
    const svNewer = !sameSid && (sStart > 0 ? sStart > lt : st > lt);
    if (svNewer) return { entry: sv, changed: false };
    const ts = Math.max(lt, st);
    const next = {
      deleted: true,
      ...(sv?.bankId || lv?.bankId ? { bankId: sv?.bankId || lv?.bankId } : {}),
      updated: ts,
      savedAt: new Date(ts || Date.now()).toISOString(),
      ...(lv?.sessionId || sv?.sessionId ? { sessionId: lv?.sessionId || sv?.sessionId } : {})
    };
    return { entry: next, changed: true };
  }

  if (!lDel && sDel) {
    const lStart = Number(lv?.startedAt) || 0;
    const sameSid = Boolean(lv?.sessionId && sv?.sessionId && String(lv.sessionId) === String(sv.sessionId));
    const lvNewer = !sameSid && (lStart > 0 ? lStart > st : lt > st);
    if (lvNewer) return { entry: lv, changed: true };
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
  if (Array.isArray(s.quiz)) {
    return s.quiz.filter(q => q && q.selectedAnswer !== null && q.selectedAnswer !== undefined).length;
  }
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
    const svNewer = !sameSid && (sStart > 0 ? sStart > lt : st > lt);
    if (svNewer) return { value: JSON.stringify(srv), dirty: false };
    const ts = Math.max(lt, st);
    const next = {
      deleted: true,
      updated: ts,
      savedAt: new Date(ts || Date.now()).toISOString(),
      ...(loc?.sessionId || srv?.sessionId ? { sessionId: loc?.sessionId || srv?.sessionId } : {})
    };
    return { value: JSON.stringify(next), dirty: true };
  }

  if (!lDel && sDel) {
    const lStart = Number(loc?.startedAt) || 0;
    const sameSid = Boolean(loc?.sessionId && srv?.sessionId && String(loc.sessionId) === String(srv.sessionId));
    const locNewer = !sameSid && (lStart > 0 ? lStart > st : lt > st);
    if (locNewer) return { value: JSON.stringify(loc), dirty: true };
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

export function reconcileMateriResumeWithHistory(resumeRaw, bestRaw, lastRaw) {
  if (typeof resumeRaw !== 'string' || !resumeRaw) return { value: resumeRaw, changed: false };
  const resume = parsePlainObj(resumeRaw);
  if (!resume) return { value: resumeRaw, changed: false };
  const best = parsePlainObj(bestRaw) || {};
  const last = parsePlainObj(lastRaw) || {};
  const next = { ...resume };
  let changed = false;

  for (const [k, rv] of Object.entries(resume)) {
    if (!rv || typeof rv !== 'object' || rv.deleted) continue;
    const bestAt = Number(best[k]?.at) || 0;
    const lastAt = Number(last[k]?.at) || 0;
    const doneAt = Math.max(bestAt, lastAt);
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

export function reconcileBankSessionsWithHistory(bankSessionsRaw, quizSessionRaw, bankBestRaw, historyRaw) {
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

export function reconcileBookmarksWithMeta(bookmarksRaw, metaRaw) {
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
    if (entry && typeof entry === 'object' && !entry.deleted) {
      nextSet.add(k);
    }
  }
  const next = [...nextSet];
  const changed = typeof bookmarksRaw !== 'string' || next.length !== list.length || next.some((v, i) => v !== list[i]);
  return changed ? { value: JSON.stringify(next), changed: true } : { value: bookmarksRaw, changed: false };
}

export function mergeJsonKey(key, localRaw, serverRaw) {
  if (localRaw === null || localRaw === undefined) return { value: serverRaw, dirty: false };
  try {
    const loc = JSON.parse(localRaw);
    const srv = JSON.parse(serverRaw);

    if (
      key === 'clined_unlocked_achievements_v1' &&
      loc && srv &&
      typeof loc === 'object' && typeof srv === 'object'
    ) {
      if (Array.isArray(loc) && Array.isArray(srv)) {
        const merged = [...new Set([...srv, ...loc])];
        return { value: JSON.stringify(merged), dirty: merged.length > srv.length };
      }
      const srvObj = Array.isArray(srv) ? srv.reduce((acc, k) => { if (k) acc[k] = 1; return acc; }, {}) : { ...srv };
      const locObj = Array.isArray(loc) ? loc.reduce((acc, k) => { if (k) acc[k] = 1; return acc; }, {}) : loc;
      const merged = { ...srvObj };
      let changed = false;
      for (const [id, ts] of Object.entries(locObj)) {
        if (!merged[id]) {
          merged[id] = ts;
          changed = true;
        }
      }
      return { value: JSON.stringify(merged), dirty: changed };
    }

    if (
      (key === 'gaster_v8_bookmarks' ||
        key === 'clined_kedkel_summary_done_v2' ||
        key === 'clined_kedkel_summary_star_v2' ||
        key === 'clined_seen_cosmetics_v1' ||
        key === 'clined_claimed_quiz_dia_v1') &&
      Array.isArray(loc) && Array.isArray(srv)
    ) {
      const merged = [...new Set([...srv, ...loc])];
      return { value: JSON.stringify(merged), dirty: merged.length > srv.length };
    }

    if (key === 'clined_study_log_v1' && loc && srv && typeof loc === 'object' && typeof srv === 'object' && !Array.isArray(loc) && !Array.isArray(srv)) {
      const merged = { ...srv };
      let changed = false;
      for (const [d, v] of Object.entries(loc)) {
        const ln = Number(v) || 0, sn = Number(srv[d]) || 0;
        if (ln > sn) { merged[d] = ln; changed = true; }
      }
      return { value: JSON.stringify(merged), dirty: changed };
    }

    if (key === 'gaster_v8_wrong_stats' && Array.isArray(loc) && Array.isArray(srv)) {
      const byId = new Map();
      let changed = false;
      for (const item of srv) if (item && item.id != null) byId.set(String(item.id), item);
      for (const item of loc) {
        if (!item || item.id == null) continue;
        const k = String(item.id), prev = byId.get(k);
        if (!prev) { byId.set(k, item); changed = true; }
        else {
          const lw = Number(item.wrong) || 0, pw = Number(prev.wrong) || 0;
          const lt = Date.parse(item.lastWrong || item.lastSeen || 0) || 0;
          const pt = Date.parse(prev.lastWrong || prev.lastSeen || 0) || 0;
          if (lw > pw || lt > pt) {
            byId.set(k, { ...prev, ...item, wrong: Math.max(lw, pw), lastWrong: lt >= pt ? (item.lastWrong || prev.lastWrong) : prev.lastWrong });
            changed = true;
          }
        }
      }
      return { value: JSON.stringify([...byId.values()]), dirty: changed };
    }

    if (key === 'gaster_daily_streak_v1' && loc && srv && typeof loc === 'object' && typeof srv === 'object') {
      const hasCounts = (loc.counts && typeof loc.counts === 'object' && !Array.isArray(loc.counts))
        || (srv.counts && typeof srv.counts === 'object' && !Array.isArray(srv.counts));
      const hasLegacy = Array.isArray(loc.days) || Array.isArray(srv.days)
        || 'lastDate' in loc || 'lastDate' in srv || 'best' in loc || 'best' in srv;
      const merged = { ...srv, ...loc };
      let dirty = false;
      if (hasCounts) {
        const lc = (loc.counts && typeof loc.counts === 'object' && !Array.isArray(loc.counts)) ? loc.counts : {};
        const sc = (srv.counts && typeof srv.counts === 'object' && !Array.isArray(srv.counts)) ? srv.counts : {};
        const counts = {};
        const allDays = [...new Set([...Object.keys(sc), ...Object.keys(lc)])].sort();
        for (const d of allDays) {
          const lv = Math.max(0, Number(lc[d]) || 0);
          const sv = Math.max(0, Number(sc[d]) || 0);
          const mx = Math.max(lv, sv);
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
        merged.days = days;
        merged.lastDate = lastDate;
        merged.streak = streak;
        merged.best = best;
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
      for (const item of loc) {
        if (!item || typeof item !== 'object') continue;
        const k = sig(item);
        if (!map.has(k)) { map.set(k, item); changed = true; }
      }
      const merged = [...map.values()].sort((a, b) => (Date.parse(b?.at || b?.ts || b?.date || 0) || 0) - (Date.parse(a?.at || a?.ts || a?.date || 0) || 0)).slice(0, 250);
      return { value: JSON.stringify(merged), dirty: changed };
    }

    if (key === 'gaster_v22_question_performance' && loc && srv && typeof loc === 'object' && typeof srv === 'object' && !Array.isArray(loc) && !Array.isArray(srv)) {
      const merged = { ...srv };
      let changed = false;
      for (const [k, lv] of Object.entries(loc)) {
        const sv = srv[k];
        if (!sv) { merged[k] = lv; changed = true; }
        else if (lv && typeof lv === 'object' && typeof sv === 'object') {
          const la = Number(lv.attempts || lv.seen || 0), sa = Number(sv.attempts || sv.seen || 0);
          const lc = Number(lv.correct || 0), sc = Number(sv.correct || 0);
          const lw = Number(lv.wrong || 0), sw = Number(sv.wrong || 0);
          if (la > sa || lc > sc || lw > sw) {
            merged[k] = { ...sv, ...lv, attempts: Math.max(la, sa), correct: Math.max(lc, sc), wrong: Math.max(lw, sw) };
            changed = true;
          }
        }
      }
      return { value: JSON.stringify(merged), dirty: changed };
    }

    if ((key === 'clined_sm2_v1' || key.startsWith('clined_upi_flashcards_block_v2_')) && loc && srv && typeof loc === 'object' && typeof srv === 'object' && !Array.isArray(loc) && !Array.isArray(srv)) {
      const merged = { ...srv };
      let changed = false;
      for (const [k, lv] of Object.entries(loc)) {
        const sv = srv[k];
        if (!sv) { merged[k] = lv; changed = true; }
        else if (lv && typeof lv === 'object' && sv && typeof sv === 'object') {
          const lt = Date.parse(lv?.lastReview || lv?.updatedAt || 0) || Number(lv?.dueAt) || 0;
          const st = Date.parse(sv?.lastReview || sv?.updatedAt || 0) || Number(sv?.dueAt) || 0;
          const lReps = Number(lv?.reps) || 0, sReps = Number(sv?.reps) || 0;
          const lLapses = Number(lv?.lapses) || 0, sLapses = Number(sv?.lapses) || 0;
          if (lReps > sReps || lLapses > sLapses || lt > st) {
            merged[k] = lv;
            changed = true;
          }
        }
      }
      return { value: JSON.stringify(merged), dirty: changed };
    }

    if ((key === 'clined_upi_custom_cards_v1' || key === 'clined_userbank_index_v1') && Array.isArray(loc) && Array.isArray(srv)) {
      const byId = new Map();
      let changed = false;
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
      const merged = { ...srv };
      let changed = false;
      for (const [k, lv] of Object.entries(loc)) {
        if (!lv || typeof lv !== 'object') continue;
        const sv = srv[k];
        if (!sv || typeof sv !== 'object') {
          merged[k] = lv;
          changed = true;
        } else {
          const lt = Number(lv.at) || 0;
          const st = Number(sv.at) || 0;
          if (lt > st || (lt === st && !lv.deleted && sv.deleted)) {
            merged[k] = lv;
            changed = true;
          }
        }
      }
      return { value: JSON.stringify(merged), dirty: changed };
    }

    if (key === 'clined_materi_best_v1' && loc && srv && typeof loc === 'object' && typeof srv === 'object' && !Array.isArray(loc) && !Array.isArray(srv)) {
      const merged = { ...srv };
      let changed = false;
      for (const [k, lv] of Object.entries(loc)) {
        if (!lv || typeof lv !== 'object') continue;
        const sv = srv[k];
        if (!sv || typeof sv !== 'object') {
          merged[k] = lv;
          changed = true;
        } else {
          const lp = Number(lv.pct) || 0, sp = Number(sv.pct) || 0;
          const ls = Number(lv.score) || 0, ss = Number(sv.score) || 0;
          const lt = Number(lv.at) || 0, st = Number(sv.at) || 0;
          const winScore = lp > sp || (lp === sp && ls > ss) || (lp === sp && ls === ss && lt >= st);
          const maxAt = Math.max(lt, st);
          if (lp > sp || (lp === sp && ls > ss) || lt > st) {
            const base = winScore ? { ...sv, ...lv } : { ...lv, ...sv };
            merged[k] = {
              ...base,
              pct: Math.max(lp, sp),
              score: winScore ? ls : ss,
              at: maxAt
            };
            if (!jsonDeepEqual(merged[k], sv)) changed = true;
          }
        }
      }
      return { value: JSON.stringify(merged), dirty: changed };
    }

    if (key === 'clined_bank_best_v1' && loc && srv && typeof loc === 'object' && typeof srv === 'object' && !Array.isArray(loc) && !Array.isArray(srv)) {
      const merged = { ...srv };
      let changed = false;
      for (const [k, lv] of Object.entries(loc)) {
        if (!lv || typeof lv !== 'object') continue;
        const sv = srv[k];
        if (!sv || typeof sv !== 'object') {
          merged[k] = lv;
          changed = true;
        } else {
          const lp = Number(lv.bestPct ?? lv.pct) || 0, sp = Number(sv.bestPct ?? sv.pct) || 0;
          const ls = Number(lv.bestScore ?? lv.score) || 0, ss = Number(sv.bestScore ?? sv.score) || 0;
          const lAtt = Number(lv.attempts) || 0, sAtt = Number(sv.attempts) || 0;
          const lt = Date.parse(lv.lastAt || '') || Number(lv.at) || 0;
          const st = Date.parse(sv.lastAt || '') || Number(sv.at) || 0;
          const winBest = lp > sp || (lp === sp && ls > ss);
          const winLast = lt >= st;
          if (winBest || lAtt > sAtt || lt > st) {
            merged[k] = {
              ...sv,
              ...lv,
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
      const merged = { ...srv };
      let changed = false;
      for (const [k, lv] of Object.entries(loc)) {
        if (!lv || typeof lv !== 'object') continue;
        const sv = srv[k];
        if (!sv || typeof sv !== 'object') {
          merged[k] = lv;
          changed = true;
        } else {
          const res = mergeBankSessionEntry(lv, sv);
          if (res.changed) {
            merged[k] = res.entry;
            changed = true;
          }
        }
      }
      return { value: JSON.stringify(merged), dirty: changed };
    }

    if (key === 'gaster_v8_quiz_session' && loc && srv && typeof loc === 'object' && typeof srv === 'object' && !Array.isArray(loc) && !Array.isArray(srv)) {
      return mergeQuizSession(loc, srv);
    }

    if (key === 'clined_materi_last_v1' && loc && srv && typeof loc === 'object' && typeof srv === 'object' && !Array.isArray(loc) && !Array.isArray(srv)) {
      const merged = { ...srv };
      let changed = false;
      for (const [k, lv] of Object.entries(loc)) {
        if (!lv || typeof lv !== 'object') continue;
        const sv = srv[k];
        if (!sv || typeof sv !== 'object') {
          merged[k] = lv;
          changed = true;
        } else if ((Number(lv.at) || 0) > (Number(sv.at) || 0)) {
          merged[k] = lv;
          changed = true;
        }
      }
      return { value: JSON.stringify(merged), dirty: changed };
    }

    if (key === 'clined_materi_resume_v2' && loc && srv && typeof loc === 'object' && typeof srv === 'object' && !Array.isArray(loc) && !Array.isArray(srv)) {
      const merged = { ...srv };
      let changed = false;
      for (const [k, lv] of Object.entries(loc)) {
        if (!lv || typeof lv !== 'object') continue;
        const sv = srv[k];
        if (!sv || typeof sv !== 'object') {
          merged[k] = lv;
          changed = true;
        } else {
          const res = mergeMateriResumeEntry(lv, sv);
          if (res.changed) {
            merged[k] = res.entry;
            changed = true;
          }
        }
      }
      return { value: JSON.stringify(merged), dirty: changed };
    }

    if (key === 'clined_qtime_v1' && loc && srv && typeof loc === 'object' && typeof srv === 'object' && !Array.isArray(loc) && !Array.isArray(srv)) {
      const merged = { ...srv };
      let changed = false;
      for (const [k, lv] of Object.entries(loc)) {
        if (!lv || typeof lv !== 'object') continue;
        const sv = srv[k];
        if (!sv || typeof sv !== 'object') {
          merged[k] = lv;
          changed = true;
        } else {
          const next = {
            n: Math.max(Number(lv.n) || 0, Number(sv.n) || 0),
            sum: Math.max(Number(lv.sum) || 0, Number(sv.sum) || 0),
            fastWrong: Math.max(Number(lv.fastWrong) || 0, Number(sv.fastWrong) || 0),
            slow: Math.max(Number(lv.slow) || 0, Number(sv.slow) || 0),
          };
          if (next.n !== (Number(sv.n) || 0) || next.sum !== (Number(sv.sum) || 0) || next.fastWrong !== (Number(sv.fastWrong) || 0) || next.slow !== (Number(sv.slow) || 0)) {
            merged[k] = next;
            changed = true;
          }
        }
      }
      return { value: JSON.stringify(merged), dirty: changed };
    }

    if (
      key === 'clined_igd_session_v1' &&
      loc && srv && typeof loc === 'object' && typeof srv === 'object' && !Array.isArray(loc) && !Array.isArray(srv)
    ) {
      if (jsonDeepEqual(loc, srv)) return { value: JSON.stringify(srv), dirty: false };
      const lTomb = Boolean(loc.clearedAt || !Array.isArray(loc.queue) || !loc.queue.length);
      const sTomb = Boolean(srv.clearedAt || !Array.isArray(srv.queue) || !srv.queue.length);
      const lt = Math.max(Number(loc.updated) || 0, Number(loc.clearedAt) || 0);
      const st = Math.max(Number(srv.updated) || 0, Number(srv.clearedAt) || 0);
      const sameSid = Boolean(loc.sid && srv.sid && String(loc.sid) === String(srv.sid));
      if (lTomb && sTomb) {
        const win = lt > st ? loc : srv;
        return { value: JSON.stringify(win), dirty: !jsonDeepEqual(win, srv) };
      }
      if (lTomb !== sTomb) {
        const tomb = lTomb ? loc : srv;
        const active = lTomb ? srv : loc;
        const tombT = lTomb ? lt : st;
        const activeStart = Number(active.startedAt) || Number(active.updated) || 0;
        const win = (sameSid || tombT >= activeStart) ? tomb : active;
        return { value: JSON.stringify(win), dirty: !jsonDeepEqual(win, srv) };
      }
      if (sameSid) {
        const li = Number(loc.i) || 0, si = Number(srv.i) || 0;
        const ll = Array.isArray(loc.log) ? loc.log.length : 0, sl = Array.isArray(srv.log) ? srv.log.length : 0;
        const win = (li !== si ? li > si : ll !== sl ? ll > sl : lt >= st) ? loc : srv;
        return { value: JSON.stringify(win), dirty: !jsonDeepEqual(win, srv) };
      }
      const win = lt > st ? loc : srv;
      return { value: JSON.stringify(win), dirty: !jsonDeepEqual(win, srv) };
    }

    if (
      (key === 'clined_notes_v1' ||
        key === 'clined_resep_best_v1' ||
        key === 'clined_resep_lp_best_v1' ||
        key === 'clined_clinical_quest_v1' ||
        key === 'clined_igd_v1' ||
        key === 'clined_igd_v2' ||
        key === 'clined_duel_claims_v1' ||
        key === 'clined_ann_seen_v1') &&
      loc && srv && typeof loc === 'object' && typeof srv === 'object' && !Array.isArray(loc) && !Array.isArray(srv)
    ) {
      const merged = maxMergeDeep(loc, srv);
      const dirty = !jsonDeepEqual(merged, srv);
      return { value: JSON.stringify(merged), dirty };
    }

    if (
      key === 'clined_rujuk_langka_v1' &&
      loc && srv && typeof loc === 'object' && typeof srv === 'object' && !Array.isArray(loc) && !Array.isArray(srv)
    ) {
      if (jsonDeepEqual(loc, srv)) return { value: JSON.stringify(srv), dirty: false };
      const pickBucket = (lb = {}, sb = {}) => {
        const out = { ...(sb && typeof sb === 'object' ? sb : {}) };
        for (const [d, lv] of Object.entries(lb && typeof lb === 'object' ? lb : {})) {
          const sv = out[d];
          if (!sv) { out[d] = lv; continue; }
          const lDone = Boolean(lv?.done), sDone = Boolean(sv?.done);
          const lTot = Number(lv?.score ?? lv?.total) || 0, sTot = Number(sv?.score ?? sv?.total) || 0;
          if ((lDone && !sDone) || (lDone === sDone && lTot > sTot)) out[d] = lv;
        }
        return out;
      };
      const lt = Number(loc.at) || 0, st = Number(srv.at) || 0;
      const merged = {
        scored: pickBucket(loc.scored, srv.scored),
        archive: pickBucket(loc.archive, srv.archive),
        practice: pickBucket(loc.practice, srv.practice),
        ext: lt > st ? Boolean(loc.ext) : Boolean(srv.ext),
        seenHelp: Boolean(loc.seenHelp || srv.seenHelp),
        at: Math.max(lt, st)
      };
      return { value: JSON.stringify(merged), dirty: !jsonDeepEqual(merged, srv) };
    }

    if (
      key === 'clined_blok_lysis_v1' &&
      loc && srv && typeof loc === 'object' && typeof srv === 'object' && !Array.isArray(loc) && !Array.isArray(srv)
    ) {
      if (jsonDeepEqual(loc, srv)) return { value: JSON.stringify(srv), dirty: false };
      const lBest = Math.max(0, Math.floor(Number(loc.best) || 0));
      const sBest = Math.max(0, Math.floor(Number(srv.best) || 0));
      const lGames = Math.max(0, Math.floor(Number(loc.games) || 0));
      const sGames = Math.max(0, Math.floor(Number(srv.games) || 0));
      const lLines = Math.max(0, Math.floor(Number(loc.lines) || 0));
      const sLines = Math.max(0, Math.floor(Number(srv.lines) || 0));
      const lCombo = Math.max(0, Math.floor(Number(loc.bestCombo) || 0));
      const sCombo = Math.max(0, Math.floor(Number(srv.bestCombo) || 0));
      const lLastAt = Math.max(0, Math.floor(Number(loc.lastAt) || 0));
      const sLastAt = Math.max(0, Math.floor(Number(srv.lastAt) || 0));
      const hasLLast = loc.last !== undefined && loc.last !== null && Number.isFinite(Number(loc.last));
      const hasSLast = srv.last !== undefined && srv.last !== null && Number.isFinite(Number(srv.last));
      let last = null;
      let lastAt = Math.max(lLastAt, sLastAt);
      if (hasLLast && hasSLast) {
        last = lLastAt >= sLastAt ? Math.max(0, Math.floor(Number(loc.last))) : Math.max(0, Math.floor(Number(srv.last)));
      } else if (hasLLast) {
        last = Math.max(0, Math.floor(Number(loc.last)));
        lastAt = lLastAt || Math.max(Number(loc.updatedAt) || 0, 0);
      } else if (hasSLast) {
        last = Math.max(0, Math.floor(Number(srv.last)));
        lastAt = sLastAt || Math.max(Number(srv.updatedAt) || 0, 0);
      }
      const merged = {
        best: Math.max(lBest, sBest),
        games: Math.max(lGames, sGames),
        lines: Math.max(lLines, sLines),
        bestCombo: Math.max(lCombo, sCombo),
        last,
        lastAt,
        updatedAt: Math.max(Number(loc.updatedAt) || 0, Number(srv.updatedAt) || 0)
      };
      return { value: JSON.stringify(merged), dirty: !jsonDeepEqual(merged, srv) };
    }

    if (
      key === 'clined_blok_lysis_session_v1' &&
      loc && srv && typeof loc === 'object' && typeof srv === 'object' && !Array.isArray(loc) && !Array.isArray(srv)
    ) {
      if (jsonDeepEqual(loc, srv)) return { value: JSON.stringify(srv), dirty: false };
      const validBoard = b => Array.isArray(b) && b.length === 8 && b.every(row => Array.isArray(row) && row.length === 8);
      const lTomb = Boolean(loc.over || loc.clearedAt || !validBoard(loc.board));
      const sTomb = Boolean(srv.over || srv.clearedAt || !validBoard(srv.board));
      const lt = Math.max(Number(loc.updated) || 0, Number(loc.clearedAt) || 0);
      const st = Math.max(Number(srv.updated) || 0, Number(srv.clearedAt) || 0);
      const sameGid = Boolean(loc.gid && srv.gid && String(loc.gid) === String(srv.gid));
      if (lTomb && sTomb) {
        const win = lt > st ? loc : srv;
        return { value: JSON.stringify(win), dirty: !jsonDeepEqual(win, srv) };
      }
      if (lTomb !== sTomb) {
        const tomb = lTomb ? loc : srv;
        const active = lTomb ? srv : loc;
        const tombT = lTomb ? lt : st;
        const activeStart = Number(active.startedAt) || Number(active.updated) || 0;
        const win = (sameGid || tombT >= activeStart) ? tomb : active;
        return { value: JSON.stringify(win), dirty: !jsonDeepEqual(win, srv) };
      }
      if (sameGid) {
        const lm = Number(loc.moves) || 0, sm = Number(srv.moves) || 0;
        const ls = Number(loc.score) || 0, ss = Number(srv.score) || 0;
        const win = (lm !== sm ? lm > sm : ls !== ss ? ls > ss : lt >= st) ? loc : srv;
        return { value: JSON.stringify(win), dirty: !jsonDeepEqual(win, srv) };
      }
      const lStart = Number(loc.startedAt) || lt;
      const sStart = Number(srv.startedAt) || st;
      const win = (lStart !== sStart ? lStart > sStart : lt > st) ? loc : srv;
      return { value: JSON.stringify(win), dirty: !jsonDeepEqual(win, srv) };
    }

    if (
      key === 'clined_cbt_tryout_v1' &&
      loc && srv && typeof loc === 'object' && typeof srv === 'object' && !Array.isArray(loc) && !Array.isArray(srv)
    ) {
      if (jsonDeepEqual(loc, srv)) return { value: JSON.stringify(srv), dirty: false };
      const byId = new Map();
      const addRuns = arr => {
        if (!Array.isArray(arr)) return;
        for (const r of arr) {
          if (!r || typeof r !== 'object') continue;
          const id = String(r.id || r.at || '');
          if (!id) continue;
          const prev = byId.get(id);
          if (!prev || (Number(r.at) || 0) >= (Number(prev.at) || 0)) byId.set(id, r);
        }
      };
      addRuns(srv.runs);
      addRuns(loc.runs);
      const runs = [...byId.values()].sort((a, b) => (Number(b.at) || 0) - (Number(a.at) || 0)).slice(0, 40);
      const merged = {
        runs,
        bestPct: Math.max(Number(loc.bestPct) || 0, Number(srv.bestPct) || 0, ...runs.map(r => Number(r.pct) || 0)),
        updatedAt: Math.max(Number(loc.updatedAt) || 0, Number(srv.updatedAt) || 0)
      };
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
      const lDay = String(loc.day || ''), sDay = String(srv.day || '');
      if (lDay > sDay) return { value: JSON.stringify(loc), dirty: true };
      return { value: JSON.stringify(srv), dirty: false };
    }

    if (key.startsWith('clined_timer_sessions_')) {
      const ln = Number(loc) || 0, sn = Number(srv) || 0;
      const mx = Math.max(ln, sn);
      return { value: String(mx), dirty: mx > sn };
    }
  } catch {}
  return null;
}

export const BLOK_LYSIS_MAX_SCORE = 10_000_000;
export const BLOK_LYSIS_MAX_LINES = 1_000_000;
export const BLOK_LYSIS_MAX_GAMES = 1_000_000;
export const BLOK_LYSIS_MAX_COMBO = 500;

export function sanitizeBlokLysisStats(raw) {
  let obj = raw;
  if (typeof raw === 'string') {
    try { obj = JSON.parse(raw); } catch { return null; }
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
  const clamp = (v, max) => {
    const n = Math.floor(Number(v) || 0);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.min(max, n);
  };
  const best = clamp(obj.best ?? obj.bestScore, BLOK_LYSIS_MAX_SCORE);
  const games = clamp(obj.games ?? obj.gamesPlayed, BLOK_LYSIS_MAX_GAMES);
  const lines = clamp(obj.lines ?? obj.totalLines, BLOK_LYSIS_MAX_LINES);
  const bestCombo = clamp(obj.bestCombo, BLOK_LYSIS_MAX_COMBO);
  const hasLast = obj.last !== undefined && obj.last !== null && Number.isFinite(Number(obj.last));
  const last = hasLast ? clamp(obj.last, BLOK_LYSIS_MAX_SCORE) : null;
  const lastAt = hasLast ? Math.max(0, Math.floor(Number(obj.lastAt) || 0)) : 0;
  const updatedAt = Math.max(0, Math.floor(Number(obj.updatedAt) || Date.now()));
  return { best, games, lines, bestCombo, last, lastAt, updatedAt };
}

export function reconcileBlokLysisWithStats(statsRaw, sessionRaw) {
  const sess = parsePlainObj(sessionRaw);
  if (!sess) return { changed: false, value: statsRaw };
  const sessScore = Math.max(0, Math.floor(Number(sess.score) || 0));
  const sessCombo = Math.max(0, Math.floor(Number(sess.combo) || 0));
  if (sessScore <= 0 && sessCombo <= 0) return { changed: false, value: statsRaw };
  const stats = parsePlainObj(statsRaw) || { best: 0, games: 0, lines: 0, bestCombo: 0, last: null, lastAt: 0, updatedAt: 0 };
  const curBest = Math.max(0, Math.floor(Number(stats.best) || 0));
  const curCombo = Math.max(0, Math.floor(Number(stats.bestCombo) || 0));
  if (sessScore <= curBest && sessCombo <= curCombo) return { changed: false, value: statsRaw };
  const next = {
    best: Math.max(curBest, sessScore),
    games: Math.max(0, Math.floor(Number(stats.games) || 0)),
    lines: Math.max(0, Math.floor(Number(stats.lines) || 0)),
    bestCombo: Math.max(curCombo, sessCombo),
    last: stats.last !== undefined ? stats.last : null,
    lastAt: Math.max(0, Math.floor(Number(stats.lastAt) || 0)),
    updatedAt: Math.max(Number(stats.updatedAt) || 0, Number(sess.updated) || Date.now())
  };
  return { changed: true, value: JSON.stringify(next) };
}
