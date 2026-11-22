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
        key === 'clined_seen_cosmetics_v1') &&
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
      const days = [...new Set([...(Array.isArray(srv.days) ? srv.days : []), ...(Array.isArray(loc.days) ? loc.days : [])])].sort();
      const lLast = String(loc.lastDate || ''), sLast = String(srv.lastDate || '');
      const lastDate = lLast >= sLast ? lLast : sLast;
      const streak = Math.max(Number(loc.streak) || 0, Number(srv.streak) || 0);
      const best = Math.max(Number(loc.best) || 0, Number(srv.best) || 0, streak);
      const merged = { ...srv, ...loc, days, lastDate, streak, best };
      const dirty = JSON.stringify(merged) !== JSON.stringify(srv);
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

    if (key === 'clined_sm2_v1' && loc && srv && typeof loc === 'object' && typeof srv === 'object') {
      const merged = { ...srv };
      let changed = false;
      for (const [k, lv] of Object.entries(loc)) {
        const sv = srv[k];
        if (!sv) { merged[k] = lv; changed = true; }
        else {
          const lt = Date.parse(lv?.lastReview || lv?.updatedAt || 0) || 0;
          const st = Date.parse(sv?.lastReview || sv?.updatedAt || 0) || 0;
          if (lt > st || (Number(lv?.reps) || 0) > (Number(sv?.reps) || 0)) {
            merged[k] = lv;
            changed = true;
          }
        }
      }
      return { value: JSON.stringify(merged), dirty: changed };
    }

    if (
      (key === 'clined_notes_v1' ||
        key === 'clined_bank_best_v1' ||
        key === 'clined_materi_best_v1' ||
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
