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

export function mergeJsonKey(key, localRaw, serverRaw) {
  if (localRaw === null || localRaw === undefined) return { value: serverRaw, dirty: false };
  try {
    const loc = JSON.parse(localRaw);
    const srv = JSON.parse(serverRaw);

    if (
      (key === 'gaster_v8_bookmarks' ||
        key === 'clined_unlocked_achievements_v1' ||
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
        const streak = Math.max(Number(loc.streak) || 0, Number(srv.streak) || 0);
        const best = Math.max(Number(loc.best) || 0, Number(srv.best) || 0, streak);
        merged.days = days;
        merged.lastDate = lastDate;
        merged.streak = streak;
        merged.best = best;
        if (!dirty && JSON.stringify(merged) !== JSON.stringify(srv)) dirty = true;
      } else {
        const streak = Math.max(Number(loc.streak) || 0, Number(srv.streak) || 0);
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

    if (key === 'clined_materi_flags_v1' && loc && srv && typeof loc === 'object' && typeof srv === 'object' && !Array.isArray(loc) && !Array.isArray(srv)) {
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
          if (lp > sp || (lp === sp && ls > ss) || (lp === sp && ls === ss && lt > st)) {
            merged[k] = { ...sv, ...lv, pct: Math.max(lp, sp), score: Math.max(ls, ss), at: Math.max(lt, st) };
            changed = true;
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
          const lt = Date.parse(lv.savedAt || '') || Number(lv.updated) || 0;
          const st = Date.parse(sv.savedAt || '') || Number(sv.updated) || 0;
          const lDone = Number(lv.doneCount) || 0, sDone = Number(sv.doneCount) || 0;
          if (lt > st || (lt === st && lDone > sDone)) {
            merged[k] = lv;
            changed = true;
          }
        }
      }
      return { value: JSON.stringify(merged), dirty: changed };
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
          const lt = Number(lv.updated) || 0;
          const st = Number(sv.updated) || 0;
          if (lt > st || (lt === st && lv.deleted && !sv.deleted)) {
            merged[k] = lv;
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
      (key === 'clined_notes_v1' ||
        key === 'clined_resep_best_v1' ||
        key === 'clined_resep_lp_best_v1' ||
        key === 'clined_clinical_quest_v1' ||
        key === 'clined_duel_claims_v1' ||
        key === 'clined_ann_seen_v1') &&
      loc && srv && typeof loc === 'object' && typeof srv === 'object' && !Array.isArray(loc) && !Array.isArray(srv)
    ) {
      const merged = maxMergeDeep(loc, srv);
      const dirty = JSON.stringify(merged) !== JSON.stringify(srv);
      return { value: JSON.stringify(merged), dirty };
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
