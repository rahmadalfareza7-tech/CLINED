/* CLINED · Rujuk Langka — Game Rujukan Medis Harian (6 Ronde · 42 Topik · 4.850+ Jawaban)
   Bobot poin dikalibrasi berbasis popularitas pencarian Google: makin jarang dicari di Google,
   makin tinggi tingkat faskes rujukan (DPM 10 poin → RS Tipe A 175 poin). */
(() => {
  'use strict';

  const STORAGE_KEY = 'clined_rujuk_langka_v1';
  const LEGACY_KEY = 'rujuklangka:v2';

  /* ================= MATCHING & GOOGLE-RARITY SCORING ENGINE ================= */
  const Engine = (() => {
    const TIERS = [
      { n: 1, name: 'Dokter Praktik Mandiri', short: 'DPM', pts: 10, band: 30, color: '#9aa5b1', emoji: '⬜' },
      { n: 2, name: 'Puskesmas', short: 'PKM', pts: 20, band: 20, color: '#4fb8e8', emoji: '🟫' },
      { n: 3, name: 'Klinik Pratama', short: 'KP', pts: 35, band: 16, color: '#2ec4b6', emoji: '🟦' },
      { n: 4, name: 'RS Tipe D', short: 'RS D', pts: 50, band: 12, color: '#46c45a', emoji: '🟩' },
      { n: 5, name: 'RS Tipe C', short: 'RS C', pts: 75, band: 9, color: '#9ccc2c', emoji: '🟨' },
      { n: 6, name: 'Klinik Utama', short: 'KU', pts: 100, band: 7, color: '#ffb020', emoji: '🟧' },
      { n: 7, name: 'RS Tipe B', short: 'RS B', pts: 130, band: 4, color: '#ff7a3d', emoji: '🟥' },
      { n: 8, name: 'RS Tipe A', short: 'RS A', pts: 175, band: 2, color: '#ff4b5c', emoji: '🟪' }
    ];
    const CUT = [];
    let cAcc = 0;
    TIERS.forEach(t => { cAcc += t.band; CUT.push(cAcc); }); // 30,50,66,78,87,94,98,100

    const STOP = {
      sindrom: 1, sindroma: 1, syndrome: 1, sign: 1, tanda: 1, refleks: 1, reflex: 1, tes: 1, test: 1,
      penyakit: 1, disease: 1, musculus: 1, muscle: 1, m: 1, otot: 1, obat: 1, infeksi: 1, infection: 1,
      the: 1, of: 1, dan: 1, and: 1, s: 1, nervus: 1, nerve: 1, saraf: 1, arteri: 1, arteria: 1, artery: 1,
      vena: 1, vein: 1, os: 1, tulang: 1, bone: 1, virus: 1, vaksin: 1, vaccine: 1, hormon: 1, hormone: 1,
      bakteri: 1, bacteria: 1, jamur: 1, enzim: 1, enzyme: 1, kanker: 1, cancer: 1, tumor: 1, karsinoma: 1,
      carcinoma: 1, bercak: 1, nodus: 1, lesi: 1, pupil: 1, murmur: 1, fenomena: 1, cincin: 1, garis: 1,
      papul: 1, punuk: 1, nadi: 1, ca: 1
    };
    const STOP_FUZZY = [
      'sindrom', 'sindroma', 'syndrome', 'penyakit', 'disease', 'musculus', 'nervus', 'saraf',
      'arteri', 'arteria', 'tanda', 'refleks', 'virus', 'vaksin', 'bakteri', 'jamur',
      'hormon', 'enzim', 'kanker', 'karsinoma', 'carcinoma', 'tumor', 'infeksi'
    ];
    const LEAD = { a: 1, n: 1, v: 1 };

    // Optimal String Alignment (Damerau-Levenshtein): adjacent letter swaps cost 1 edit
    function lev(a, b, max) {
      const la = a.length, lb = b.length;
      if (Math.abs(la - lb) > max) return max + 1;
      let prev2 = null, prev = [], cur = [];
      for (let j = 0; j <= lb; j++) prev[j] = j;
      for (let i = 1; i <= la; i++) {
        cur = [i];
        let best = i;
        for (let j = 1; j <= lb; j++) {
          const cost = a[i - 1] === b[j - 1] ? 0 : 1;
          let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
          if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
            v = Math.min(v, prev2[j - 2] + 1);
          }
          cur[j] = v;
          if (v < best) best = v;
        }
        if (best > max) return max + 1;
        prev2 = prev;
        prev = cur;
      }
      return prev[lb];
    }

    function isFuzzyStop(w) {
      if (STOP[w]) return true;
      if (w.length < 5) return false;
      for (let i = 0; i < STOP_FUZZY.length; i++) {
        const sw = STOP_FUZZY[i];
        if (Math.abs(sw.length - w.length) <= 1 && lev(w, sw, 1) <= 1) return true;
      }
      return false;
    }

    function norm(s) {
      const t = String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ').trim();
      if (!t) return '';
      const raw = t.split(' ').filter(Boolean);
      const kept = raw.length > 1 ? raw.filter(w => !isFuzzyStop(w)) : raw.filter(w => !STOP[w]);
      if (kept.length > 1 && LEAD[kept[0]] && kept.slice(1).join('').length >= 3) kept.shift();
      return (kept.length ? kept : raw).join(' ');
    }
    const compact = s => s.replace(/ /g, '');
    const sortTok = s => s.split(' ').sort().join(' ');

    // Indonesian + English + Latin medical phonetic normalizer
    function phon(c) {
      let s = String(c || '').toLowerCase()
        .replace(/^ps/, 's').replace(/^pn/, 'n').replace(/^pt/, 't').replace(/^kn/, 'n')
        .replace(/sch/g, 'sk').replace(/sc(?=[eiy])/g, 's').replace(/sy/g, 's')
        .replace(/ph/g, 'f').replace(/th/g, 't').replace(/rh/g, 'r').replace(/kh/g, 'k')
        .replace(/gh/g, 'g').replace(/ch/g, 'k').replace(/sh/g, 's').replace(/ck/g, 'k')
        .replace(/dj/g, 'j').replace(/qu/g, 'k')
        .replace(/c(?=[eiy])/g, 's').replace(/c/g, 'k').replace(/q/g, 'k').replace(/x/g, 'ks')
        .replace(/y/g, 'i').replace(/z/g, 's').replace(/v/g, 'f')
        .replace(/ae|oe|eu/g, 'e').replace(/ou|oo/g, 'u').replace(/ei|ie/g, 'i')
        .replace(/([bdfgjklmnprstw])h/g, '$1').replace(/(.)\1+/g, '$1');
      if (s.length > 4) s = s.replace(/e$/, '');
      return s;
    }

    function keys(patient) {
      if (patient._keys) return patient._keys;
      patient._keys = patient.acceptedAnswers.map(a => {
        const list = [a.canonicalName].concat(a.aliases || []).map(norm).filter(Boolean);
        const uniq = {};
        list.forEach(k => { uniq[k] = 1; uniq[sortTok(k)] = 1; });
        return Object.keys(uniq);
      });
      return patient._keys;
    }

    function pkeys(patient) {
      if (patient._pkeys) return patient._pkeys;
      patient._pkeys = keys(patient).map(list =>
        list.map(k => {
          const kc = compact(k);
          const toks = k.split(' ').filter(w => w.length >= 2);
          return { k, kc, kp: phon(kc), toks, ptoks: toks.map(phon) };
        })
      );
      return patient._pkeys;
    }

    const tolRaw = len => (len <= 3 ? 0 : len <= 7 ? 1 : len <= 11 ? 2 : len <= 16 ? 3 : Math.min(5, Math.floor(len * 0.25)));
    const tolPhon = len => (len <= 3 ? 0 : len <= 5 ? 1 : len <= 8 ? 2 : len <= 12 ? 3 : Math.min(5, Math.floor(len * 0.28)));

    function evalKey(q, qs, qc, qp, qt, qpt, entry, loose) {
      const { k, kc, kp, ptoks } = entry;
      if (k === q || k === qs || kc === qc) return { score: 0, sim: 1, exact: true };
      if (qp.length >= 4 && qp === kp) return { score: 0.12, sim: 0.98, exact: false };

      let best = null;
      const keep = (score, sim) => { if (!best || score < best.score) best = { score, sim, exact: false }; };

      // 1. Raw Damerau-Levenshtein
      const minR = Math.min(qc.length, kc.length);
      const maxR = Math.max(qc.length, kc.length);
      const tR = loose ? Math.min(6, Math.max(1, Math.floor(minR * 0.36))) : tolRaw(minR);
      if (tR > 0 && (' ' + k + ' ').indexOf(' ' + q + ' ') === -1) {
        const rd = Math.min(lev(qc, kc, tR), lev(qs, k, tR));
        if (rd <= tR) {
          const sim = 1 - rd / maxR;
          const okShort = minR > 4 || (rd === 1 && (qc[0] === kc[0] || (qc[0] === kc[1] && qc[1] === kc[0])));
          if (okShort && sim >= (loose ? 0.56 : 0.72)) keep(0.25 + rd * 0.55 + (1 - sim), sim);
        }
      }

      // 2. Phonetic Damerau-Levenshtein (handles Indo <-> Eng <-> Latin spellings)
      const minP = Math.min(qp.length, kp.length);
      const maxP = Math.max(qp.length, kp.length);
      const tP = loose ? Math.min(6, Math.max(1, Math.floor(minP * 0.38))) : tolPhon(minP);
      if (tP > 0 && minP >= 4) {
        const pd = lev(qp, kp, tP);
        if (pd <= tP) {
          const psim = 1 - pd / maxP;
          const minSim = loose ? 0.58 : (minP <= 5 ? 0.78 : 0.72);
          const okShortP = minP > 4 || (pd === 1 && (qp[0] === kp[0] || (qp[0] === kp[1] && qp[1] === kp[0])));
          if (okShortP && psim >= minSim) keep(0.4 + pd * 0.5 + (1 - psim), psim);
        }
      }

      // 3. Multi-word token fuzzy match (e.g. "stafilokokus aereus", "lupus eritematos")
      if (qpt.length >= 2 && qpt.length === ptoks.length) {
        let sumSim = 0, allOk = true;
        for (let t = 0; t < qpt.length; t++) {
          const a = qpt[t], b = ptoks[t];
          const ml = Math.min(a.length, b.length), xl = Math.max(a.length, b.length);
          const mt = Math.max(1, Math.floor(ml * (loose ? 0.4 : 0.32)));
          const d = lev(a, b, mt);
          const s = 1 - d / xl;
          if (d > mt || s < (loose ? 0.55 : 0.68)) { allOk = false; break; }
          sumSim += s;
        }
        if (allOk) {
          const avg = sumSim / qpt.length;
          if (avg >= (loose ? 0.6 : 0.74)) keep(0.45 + (1 - avg) * 2.2, avg);
        }
      }

      // 4. Prefix / Latin stem match (e.g. "sternokleidomastoid" -> "sternocleidomastoideus")
      if (qp.length >= 6 && kp.length >= 6) {
        const isPref = kp.indexOf(qp) === 0 || qp.indexOf(kp) === 0;
        const ratio = Math.min(qp.length, kp.length) / Math.max(qp.length, kp.length);
        if (isPref && ratio >= (loose ? 0.55 : 0.65)) keep(0.5 + (1 - ratio) * 1.4, ratio);
      }

      return best;
    }

    function rankCandidates(patient, input, loose) {
      const q = norm(input);
      if (!q || compact(q).length < 2) return [];
      const qs = sortTok(q), qc = compact(q), qp = phon(qc);
      const qt = q.split(' ').filter(w => w.length >= 2);
      const qpt = qt.map(phon);
      const all = pkeys(patient);
      const ranked = [];
      for (let i = 0; i < all.length; i++) {
        let bestForAns = null;
        const entries = all[i];
        for (let j = 0; j < entries.length; j++) {
          const r = evalKey(q, qs, qc, qp, qt, qpt, entries[j], loose);
          if (r && (!bestForAns || r.score < bestForAns.score)) bestForAns = r;
          if (bestForAns && bestForAns.exact) break;
        }
        if (bestForAns) ranked.push({ i, score: bestForAns.score, sim: bestForAns.sim, exact: bestForAns.exact });
      }
      ranked.sort((a, b) => (a.score - b.score) || (b.sim - a.sim));
      return ranked;
    }

    function suggest(patient, input, limit) {
      const lim = limit || 3;
      const q = norm(input);
      if (!q || compact(q).length < 4) return [];
      const ranked = rankCandidates(patient, input, true);
      return ranked.slice(0, lim).map(r => ({
        index: r.i,
        canonicalName: patient.acceptedAnswers[r.i].canonicalName,
        sim: r.sim
      }));
    }

    function match(patient, input) {
      const q = norm(input);
      if (!q || compact(q).length < 2) return null;
      const qc = compact(q), ks = keys(patient);

      // Fast ranked pass (exact + phonetic + Damerau-Levenshtein + multi-word + stem)
      const ranked = rankCandidates(patient, input, false);
      if (ranked.length) {
        const best = ranked[0], second = ranked[1];
        if (best.exact) return { index: best.i, distance: 0, corrected: false };
        const clearWin = !second || (second.score - best.score > 0.08) || (best.sim >= 0.88 && best.score < second.score);
        if (clearWin) return { index: best.i, distance: best.score, corrected: true };
        return {
          ambiguous: true,
          suggestions: ranked.slice(0, 3).map(r => ({
            index: r.i,
            canonicalName: patient.acceptedAnswers[r.i].canonicalName
          }))
        };
      }

      // Word-prefix fallback for partial multi-word entries (e.g. "amoksisilin" -> unique prefix)
      if (qc.length >= 5) {
        const hits = {};
        ks.forEach((list, i) => {
          list.forEach(k => {
            if (k.indexOf(q + ' ') === 0 && qc.length / compact(k).length >= 0.6) hits[i] = 1;
          });
        });
        const h = Object.keys(hits);
        if (h.length === 1) return { index: +h[0], distance: 0.5, corrected: true };
        if (!h.length) ks.forEach((list, i) => { list.forEach(k => { if (k.indexOf(q + ' ') === 0) hits[i] = 1; }); });
        const allH = Object.keys(hits);
        if (allH.length > 1) {
          return {
            ambiguous: true,
            suggestions: allH.slice(0, 3).map(idx => ({
              index: +idx,
              canonicalName: patient.acceptedAnswers[+idx].canonicalName
            }))
          };
        }
      }
      return null;
    }

    function tierFromPct(p) {
      for (let i = 0; i < CUT.length; i++) if (p < CUT[i]) return i + 1;
      return 8;
    }

    function distribution(patient, counts) {
      counts = counts || {};
      const rows = patient.acceptedAnswers.map((a, i) => {
        const real = counts[a.canonicalName] || 0;
        return { i, a, real, w: a.initialWeight + real };
      });
      const total = rows.reduce((s, r) => s + r.w, 0);
      const realTotal = rows.reduce((s, r) => s + r.real, 0);
      rows.sort((x, y) => y.w - x.w);
      let cum = 0;
      rows.forEach(r => {
        r.share = r.w / total * 100;
        r.mid = cum + r.share / 2;
        cum += r.share;
        r.tier = tierFromPct(r.mid);
        if (r.a.isTopTier && r.real === 0 && realTotal >= 20) r.firstFinder = true;
        r.realShare = realTotal ? r.real / realTotal * 100 : 0;
      });
      const byIndex = [];
      rows.forEach(r => { byIndex[r.i] = r; });
      return { rows, byIndex, realTotal };
    }

    function score(patient, idx, counts) {
      const d = distribution(patient, counts), r = d.byIndex[idx];
      const tier = r.firstFinder ? 8 : r.tier;
      return { tier, pts: TIERS[tier - 1].pts, share: r.share, realShare: r.realShare, realTotal: d.realTotal, firstFinder: !!r.firstFinder, dist: d };
    }

    return { phon, TIERS, CUT, norm, lev, match, suggest, distribution, score, tierFromPct };
  })();

  /* ================= STORAGE & STREAK ================= */
  const WIB = 7 * 3600e3;
  const EPOCH = Date.UTC(2026, 0, 1); // 1 Jan 2026 WIB
  const todayWib = () => new Date(Date.now() + WIB).toISOString().slice(0, 10);
  const dayNum = d => Math.round((Date.parse(d + 'T00:00:00Z') - EPOCH) / 864e5);
  const addDays = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);

  const Progress = {
    KEY: STORAGE_KEY,
    read() {
      const base = { scored: {}, archive: {}, practice: {}, ext: false, seenHelp: false, at: 0 };
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const p = JSON.parse(raw);
          if (p && typeof p === 'object') return Object.assign(base, p);
        }
        const leg = localStorage.getItem(LEGACY_KEY);
        if (leg) {
          const lp = JSON.parse(leg);
          if (lp && typeof lp === 'object') {
            const merged = Object.assign(base, lp, { at: Date.now() });
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch {}
            return merged;
          }
        }
      } catch {}
      return base;
    },
    write(state) {
      try {
        state.at = Date.now();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {}
    },
    streak(state) {
      const days = Object.keys(state.scored || {}).filter(d => state.scored[d]?.done).sort();
      if (!days.length) return { n: 0, buf: false };
      const set = new Set(days), t = todayWib();
      let n = 0, buf = false;
      for (let d = days[0]; d <= t; d = addDays(d, 1)) {
        if (set.has(d)) { n++; if (n % 7 === 0) buf = true; }
        else if (d === t) break;
        else if (buf) buf = false;
        else n = 0;
      }
      return { n, buf };
    }
  };

  /* ================= RANDOMIZED ROUND GENERATOR (NON-PATTERNED) ================= */
  const RoundGen = (() => {
    function hashStr(str) {
      let h = 2166136261 >>> 0;
      const s = String(str || '');
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619) >>> 0;
      }
      return h >>> 0;
    }
    function mulberry32(seed) {
      let a = seed >>> 0;
      return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
    function shuffle(list, rng) {
      const a = list.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
      }
      return a;
    }
    function allPatients(bank) {
      const out = [], seen = new Set();
      for (const r of (bank?.rounds || [])) {
        for (const p of (r.patients || [])) {
          if (p && p.id && !seen.has(p.id)) { seen.add(p.id); out.push(p); }
        }
      }
      return out;
    }
    function pickBalanced7(pool, rng, avoidIds) {
      const avoid = avoidIds instanceof Set ? avoidIds : new Set(avoidIds || []);
      const fresh = shuffle(pool.filter(p => !avoid.has(p.id)), rng);
      const rest = shuffle(pool.filter(p => avoid.has(p.id)), rng);
      const picked = [];
      const usedCat = new Set();
      const usedId = new Set();
      const take = (arr, uniqueCat) => {
        for (const p of arr) {
          if (picked.length >= 7) break;
          if (usedId.has(p.id)) continue;
          if (uniqueCat && usedCat.has(p.category)) continue;
          picked.push(p);
          usedId.add(p.id);
          usedCat.add(p.category);
        }
      };
      take(fresh, true);
      take(fresh, false);
      take(rest, true);
      take(rest, false);
      return shuffle(picked, rng);
    }
    function buildEpochDays(pool, epochIdx, numDays) {
      const rng = mulberry32(hashStr('clined-rl-epoch-v3:' + numDays + ':' + epochIdx));
      const rem = shuffle(pool, rng);
      const days = Array.from({ length: numDays }, () => []);
      for (let slot = 0; slot < numDays; slot++) {
        const usedCat = new Set();
        for (let k = 0; k < 7 && rem.length; k++) {
          let pickIdx = rem.findIndex(p => !usedCat.has(p.category));
          if (pickIdx < 0) pickIdx = 0;
          const [p] = rem.splice(pickIdx, 1);
          usedCat.add(p.category);
          days[slot].push(p);
        }
        days[slot] = shuffle(days[slot], rng);
      }
      return days;
    }
    function forDate(bank, dateStr) {
      const pool = allPatients(bank);
      const numDays = Math.max(4, Math.floor(pool.length / 7));
      const dn = dayNum(dateStr);
      const epoch = Math.floor(dn / numDays);
      const slot = ((dn % numDays) + numDays) % numDays;
      const days = buildEpochDays(pool, epoch, numDays);
      // Avoid boundary overlap between slot 0 of this epoch and last slot of previous epoch
      const prevLastIds = new Set(buildEpochDays(pool, epoch - 1, numDays)[numDays - 1].map(p => p.id));
      for (let i = 0; i < days[0].length; i++) {
        if (!prevLastIds.has(days[0][i].id)) continue;
        outer: for (let s = 1; s < numDays - 1; s++) {
          for (let j = 0; j < days[s].length; j++) {
            if (!prevLastIds.has(days[s][j].id)) {
              const tmp = days[0][i]; days[0][i] = days[s][j]; days[s][j] = tmp;
              break outer;
            }
          }
        }
      }
      return { roundId: 'DAY-' + dateStr, date: dateStr, title: 'Ronde Harian Acak', patients: days[slot] };
    }
    function random(bank, avoidIds, customSeed) {
      const pool = allPatients(bank);
      const seed = (customSeed != null ? (Number(customSeed) >>> 0) : ((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0));
      const rng = mulberry32(seed || 1);
      const patients = pickBalanced7(pool, rng, avoidIds);
      return { roundId: 'RND-' + seed.toString(36), date: '', title: 'Ronde Acak', patients };
    }
    function shuffleRound(round, rng) {
      const r = rng || Math.random;
      return Object.assign({}, round, { patients: shuffle(round.patients || [], r) });
    }
    function fromIds(bank, ids, meta) {
      if (!Array.isArray(ids) || !ids.length) return null;
      const byId = new Map(allPatients(bank).map(p => [p.id, p]));
      const patients = ids.map(id => byId.get(id)).filter(Boolean);
      if (patients.length !== ids.length) return null;
      return {
        roundId: meta?.roundId || 'CUSTOM',
        date: meta?.date || '',
        title: meta?.title || 'Ronde Acak',
        patients
      };
    }
    return { hashStr, mulberry32, shuffle, allPatients, pickBalanced7, forDate, random, shuffleRound, fromIds };
  })();

  /* ================= MARKUP ================= */
  const MARKUP = `<div class="rl" id="rl-root">
<header class="rl-top">
  <button type="button" class="rl-back-clined" id="rl-exit-mg" title="Kembali ke Mini Games">‹ Mini Games</button>
  <button type="button" class="rl-brand" id="rl-home" aria-label="Beranda Rujuk Langka">
    <svg width="32" height="32" viewBox="0 0 34 34" aria-hidden="true"><rect x="1" y="3" width="32" height="30" rx="10" fill="#2f9c45"/><rect x="1" y="1" width="32" height="29" rx="10" fill="#46c45a"/><rect x="14" y="7" width="6" height="17" rx="2" fill="#fff"/><rect x="8.5" y="12.5" width="17" height="6" rx="2" fill="#fff"/></svg>
    <span>rujuklangka</span>
  </button>
  <div class="rl-beds" id="rl-sq" hidden aria-label="Progres pasien"></div>
  <span class="rl-sp"></span>
  <span class="rl-hstreak" id="rl-hStreak" title="Streak"><svg width="19" height="21" viewBox="0 0 20 22" aria-hidden="true"><path d="M10 1c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-4-1-6 1-9z" fill="#ff9600"/><path d="M10 11c1 2 3 3 3 5a3 3 0 0 1-6 0c0-1 1-2 1-2 0 1 1 1 1 1 0-2 0-3 1-4z" fill="#ffc331"/></svg><span id="rl-hStreakN">0</span></span>
  <div class="rl-tm" id="rl-tm" hidden><div class="bar"><i id="rl-tBar"></i></div><b id="rl-tNum">30</b></div>
  <button type="button" class="rl-ib" id="rl-helpBtn" aria-label="Cara bermain">?</button>
</header>

<div class="rl-body">
  <section class="rl-dash" id="rl-vDash">
    <div class="rl-home">
      <div class="rl-desk" aria-label="Ilustrasi meja jaga IGD">
        <svg viewBox="0 0 520 400" role="img" aria-hidden="true">
          <rect x="8" y="18" width="504" height="300" rx="40" fill="#e9f7f1"/>
          <circle cx="470" cy="40" r="70" fill="#dff1ea"/>
          <rect x="38" y="52" width="150" height="62" rx="18" fill="#d93245"/>
          <rect x="38" y="46" width="150" height="62" rx="18" fill="#ff4b5c"/>
          <rect x="56" y="64" width="26" height="26" rx="7" fill="#fff"/><rect x="66" y="68" width="6" height="18" rx="2" fill="#ff4b5c"/><rect x="60" y="74" width="18" height="6" rx="2" fill="#ff4b5c"/>
          <text x="94" y="89" font-family="Nunito,sans-serif" font-weight="900" font-size="30" fill="#fff">IGD</text>
          <text x="152" y="89" font-family="Nunito,sans-serif" font-weight="900" font-size="12" fill="#ffd3d8">24J</text>
          <circle cx="420" cy="92" r="40" fill="#cfe3e8"/><circle cx="420" cy="88" r="40" fill="#fff"/><circle cx="420" cy="88" r="33" fill="#fff" stroke="#e1ecef" stroke-width="3"/>
          <g fill="#c4d3d8"><rect x="418" y="59" width="4" height="8" rx="2"/><rect x="418" y="109" width="4" height="8" rx="2"/><rect x="391" y="86" width="8" height="4" rx="2"/><rect x="441" y="86" width="8" height="4" rx="2"/></g>
          <line id="rl-clockH" x1="420" y1="88" x2="420" y2="70" stroke="#3c4048" stroke-width="5" stroke-linecap="round"/>
          <line id="rl-clockM" x1="420" y1="88" x2="420" y2="62" stroke="#4fb8e8" stroke-width="3.5" stroke-linecap="round"/>
          <circle cx="420" cy="88" r="4" fill="#ff4b5c"/>
          <rect x="466" y="132" width="6" height="128" rx="3" fill="#b9c6cf"/><rect x="450" y="128" width="38" height="6" rx="3" fill="#b9c6cf"/>
          <rect x="446" y="136" width="30" height="46" rx="12" fill="#bfe9ff"/><rect x="446" y="156" width="30" height="26" rx="12" fill="#7fd0f5"/><rect x="451" y="141" width="6" height="12" rx="3" fill="#fff" opacity=".8"/>
          <rect x="459.5" y="182" width="3" height="34" rx="1.5" fill="#9fdcff"/>
          <rect x="226" y="222" width="20" height="24" rx="4" fill="#9aa8b3"/><rect x="204" y="240" width="64" height="10" rx="5" fill="#9aa8b3"/>
          <rect x="148" y="122" width="178" height="112" rx="20" fill="#26323f"/>
          <rect x="160" y="134" width="154" height="88" rx="12" fill="#1a2430"/>
          <text id="rl-monRound" x="172" y="156" font-family="Nunito,sans-serif" font-weight="900" font-size="14" fill="#9fe7b4">JAGA #–</text>
          <text x="262" y="156" font-family="Nunito,sans-serif" font-weight="900" font-size="14" fill="#ff8a97">♥ 72</text>
          <polyline class="rl-ecg" points="166,196 190,196 198,196 204,182 210,208 216,170 224,214 230,196 252,196 260,196 266,186 272,204 278,178 286,210 292,196 310,196" fill="none" stroke="#46e08a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>
          <g transform="rotate(6 360 150)"><rect x="336" y="128" width="52" height="46" rx="6" fill="#ffe27a"/><rect x="344" y="142" width="34" height="4" rx="2" fill="#e0b93a"/><rect x="344" y="152" width="26" height="4" rx="2" fill="#e0b93a"/></g>
          <path class="rl-steam" d="M372 196c-6-8 6-12 0-20" stroke="#c8d6dd" stroke-width="4" fill="none" stroke-linecap="round"/>
          <path class="rl-steam s2" d="M386 198c-6-8 6-12 0-20" stroke="#c8d6dd" stroke-width="4" fill="none" stroke-linecap="round"/>
          <rect x="398" y="212" width="16" height="20" rx="8" fill="none" stroke="#2b93c7" stroke-width="6"/>
          <rect x="364" y="204" width="40" height="44" rx="12" fill="#4fb8e8"/><rect x="370" y="210" width="8" height="24" rx="4" fill="#fff" opacity=".5"/>
          <g transform="rotate(-9 100 214)"><rect x="66" y="168" width="70" height="86" rx="12" fill="#c98b4e"/><rect x="74" y="178" width="54" height="70" rx="6" fill="#fff"/><rect x="88" y="162" width="26" height="14" rx="6" fill="#9aa8b3"/>
          <rect x="82" y="192" width="38" height="5" rx="2.5" fill="#d7dee3"/><rect x="82" y="204" width="30" height="5" rx="2.5" fill="#d7dee3"/><rect x="82" y="216" width="36" height="5" rx="2.5" fill="#d7dee3"/><rect x="82" y="228" width="22" height="5" rx="2.5" fill="#46c45a"/></g>
          <rect x="24" y="244" width="472" height="26" rx="13" fill="#ffffff"/><rect x="24" y="262" width="472" height="8" rx="4" fill="#e6ebef"/>
          <rect x="40" y="268" width="440" height="116" rx="26" fill="#2f9c45"/>
          <rect x="40" y="262" width="440" height="112" rx="26" fill="#46c45a"/>
          <rect x="58" y="276" width="10" height="84" rx="5" fill="#6fd37f"/>
          <rect x="226" y="288" width="68" height="68" rx="18" fill="#fff"/><rect x="252" y="298" width="16" height="48" rx="5" fill="#ff4b5c"/><rect x="236" y="314" width="48" height="16" rx="5" fill="#ff4b5c"/>
          <rect x="400" y="236" width="44" height="8" rx="4" fill="#d9a520"/><path d="M404 238a18 18 0 0 1 36 0z" fill="#ffc331"/><circle cx="422" cy="216" r="4" fill="#d9a520"/><rect x="410" y="224" width="6" height="10" rx="3" fill="#fff" opacity=".6"/>
        </svg>
      </div>

      <h1>Rujuk Langka <span id="rl-dRound">#–</span></h1>
      <p class="rl-date" id="rl-dDate">–</p>
      <p class="rl-lede">Satu jawaban medis per pasien. 7 topik diacak tanpa pola dari 42 topik klinis (obat, penyakit, organ, sel, lab, dll.) — makin jarang dicari di Google, makin jauh dirujuk hingga RS Tipe A (+175 poin).</p>
      <div class="rl-pill-stats" id="rl-bankStats"></div>
      <div class="rl-home-ctas">
        <button type="button" class="rl-btn green big wide" id="rl-start">Mulai jaga</button>
        <button type="button" class="rl-btn sky wide" id="rl-randBtn">🎲 Main Ronde Acak (7/42 Topik)</button>
      </div>
      <div class="rl-links">
        <button class="rl-link" id="rl-resBtn" type="button" hidden>Hasil hari ini</button>
        <button class="rl-link" id="rl-archBtn" type="button">Pilih Paket / Arsip</button>
        <button class="rl-link" id="rl-howBtn" type="button">Cara bermain</button>
        <label class="rl-chipt"><input type="checkbox" id="rl-ext"> Waktu 45 detik</label>
      </div>
      <div class="rl-hmeta">
        <span>Streak <b id="rl-sStreak">0 hari</b></span>
        <span>Ronde baru <b id="rl-sCount">--:--:--</b></span>
      </div>
      <p class="rl-syncl" id="rl-sync">Progres tersimpan di akun &amp; perangkat · Ronde acak tanpa pola · Bobot pencarian Google</p>
    </div>
  </section>

  <section class="rl-ask" id="rl-vPlay" hidden>
    <span class="rl-eyebrow" id="rl-pEye"></span>
    <p class="rl-vig" id="rl-pVig" hidden></p>
    <h2 class="rl-q" id="rl-pQ"></h2>
    <div class="rl-inwrap">
      <form class="rl-inrow" id="rl-form" autocomplete="off">
        <input id="rl-ans" type="text" placeholder="Ketik satu jawaban medis…" aria-label="Jawaban medis" spellcheck="false" autocapitalize="off" enterkeyhint="send">
        <button class="rl-btn green" id="rl-go" type="submit">Kirim</button>
      </form>
      <div class="rl-inmeta">
        <span class="rl-err" id="rl-err" aria-live="polite"></span>
        <button class="rl-pass" id="rl-passBtn" type="button"><span id="rl-passT">Lewati</span> <span class="kbd">ESC</span></button>
      </div>
      <div class="rl-sugs" id="rl-sugs" hidden aria-live="polite"></div>
    </div>
  </section>

  <section id="rl-vSum" hidden>
    <div class="rl-sumw">
      <div>
        <span class="rl-eyebrow" id="rl-sumTag"></span>
        <h2>Jaga selesai!</h2>
        <div id="rl-xpSlot"></div>
        <div class="rl-cards3">
          <div class="rl-sc" style="--c:#ffb020"><div class="h">Total skor</div><div class="v" id="rl-sumScore">0</div></div>
          <div class="rl-sc" style="--c:#4fb8e8"><div class="h">Persentil</div><div class="v" id="rl-sumP">–</div></div>
          <div class="rl-sc" id="rl-sumBestC" style="--c:#46c45a"><div class="h">Tertinggi</div><div class="v" id="rl-sumBest">–</div></div>
        </div>
        <p class="rl-sumpct" id="rl-sumPct"></p>
        <div class="rl-grid7" id="rl-sumGrid"></div>
        <div class="rl-ctas">
          <button type="button" class="rl-btn green" id="rl-randNextBtn">🎲 Ronde Acak Baru</button>
          <button type="button" class="rl-btn" id="rl-replayBtn">Ulangi Ronde Ini</button>
          <button type="button" class="rl-btn" id="rl-pickOtherBtn">Paket / Arsip</button>
          <button type="button" class="rl-btn" id="rl-shareBtn">Bagikan</button>
          <button type="button" class="rl-btn ghost" id="rl-backBtn">Beranda Game</button>
        </div>
        <div class="rl-copied" id="rl-copied" aria-live="polite"></div>
        <div id="rl-shareFallback"></div>
      </div>
      <table class="rl-br"><tbody id="rl-sumRows"></tbody></table>
    </div>
  </section>

  <div class="rl-scene" id="rl-scene" hidden>
    <canvas id="rl-cv" aria-label="Jalan dengan delapan fasilitas kesehatan dan ambulans"></canvas>
    <div id="rl-flags"></div>
    <button type="button" class="rl-skiph" id="rl-skipH" hidden>Ambulans merujuk pasien… Ketuk / <span class="kbd">ENTER</span> lewati</button>
    <div class="rl-sheet" id="rl-card" hidden></div>
  </div>
</div>

<div class="rl-ov" id="rl-howOv" hidden>
  <div class="rl-modal" role="dialog" aria-modal="true" aria-labelledby="rl-howT">
    <div class="hd"><h2 id="rl-howT">Cara bermain Rujuk Langka</h2><button type="button" class="x" data-rl-close aria-label="Tutup">×</button></div>
    <p>Ketik satu jawaban medis yang valid untuk tiap pasien (7 pasien per ronde). <b>Makin jarang dicari di Google</b>, makin tinggi faskes rujukannya dan makin besar poinnya!</p>
    <p>Bahasa Indonesia, Inggris, istilah Latin, nama merek obat populer, dan singkatan klinis (seperti <b>SLE, GBS, GERD, CTS, BPPV, HNP, LAD</b>) diterima; salah ketik kecil dikoreksi otomatis.</p>
    <div id="rl-howTiers"></div>
    <p>30 detik per pasien (atau 45 detik bila mode santai diaktifkan). Jawaban salah tidak mengakhiri ronde — cukup coba jawaban lain sebelum waktu habis.</p>
    <p>Tiap hari 7 topik dipilih secara <b>acak tanpa pola</b> dari seluruh <b>42 topik klinis (4.850+ jawaban)</b> meliputi obat, penyakit, organ, sel, laboratorium, hingga anatomi. Kamu juga bisa klik <b>🎲 Main Ronde Acak</b> kapan saja untuk mendapatkan 7 pasien acak baru.</p>
    <div class="rl-keys"><span><span class="kbd">ENTER</span> mulai, kirim, lanjut</span><span><span class="kbd">ESC</span> 2× lewati</span></div>
  </div>
</div>

<div class="rl-ov" id="rl-archOv" hidden>
  <div class="rl-modal" role="dialog" aria-modal="true" aria-labelledby="rl-archT">
    <div class="hd"><h2 id="rl-archT">Pilih Ronde &amp; Arsip</h2><button type="button" class="x" data-rl-close aria-label="Tutup">×</button></div>
    <p>Setiap ronde harian &amp; mode acak mengocok 7 topik berbeda dari seluruh 42 topik klinis tanpa pola berulang.</p>
    <div class="rl-archl">
      <button type="button" class="rl-rand-card" id="rl-archRandBtn">
        <span><b>🎲 Mulai Ronde Acak Baru (7 dari 42 Topik)</b><span class="sub">Acak total lintas cabang kedokteran · tidak mengulang ronde terakhir</span></span>
        <span class="s">Acak ›</span>
      </button>
    </div>
    <div class="rl-arch-sec">Paket Tematik (Urutan Pasien Diacak)</div>
    <div class="rl-archl" id="rl-roundList"></div>
    <div class="rl-arch-sec">Arsip Harian Sebelumnya (Kombinasi Acak Harian)</div>
    <div class="rl-archl" id="rl-archList"></div>
  </div>
</div>

<div class="rl-foot"><b>CLINED · Rujuk Langka</b><span>Edukasi kosakata medis berbasis popularitas pencarian Google · Ronde acak harian tiap 00.00 WIB</span></div>
</div>`;

  /* ================= GAME INSTANCE ================= */
  function createGame() {
    const BANK = window.CLINED_RUJUK_LANGKA_DATA;
    if (!BANK || !Array.isArray(BANK.rounds) || !BANK.rounds.length) {
      throw new Error('Data Rujuk Langka belum dimuat.');
    }
    const host = document.getElementById('rujukLangkaHost');
    if (!host) return null;
    host.innerHTML = MARKUP;

    const root = host.querySelector('#rl-root');
    const q = id => host.querySelector('#' + id);
    const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const T = Engine.TIERS;
    const REDUCE = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches || false;
    const fmtDate = (d, o) => new Date(d + 'T12:00:00Z').toLocaleDateString('id-ID', Object.assign({ timeZone: 'UTC' }, o));
    let lastPlayedIds = new Set();
    const roundFor = (key, rec, shufflePack) => {
      if (rec && Array.isArray(rec.pids) && rec.pids.length) {
        const saved = RoundGen.fromIds(BANK, rec.pids, { roundId: key, date: /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : '', title: rec.title || 'Ronde Acak' });
        if (saved) return saved;
      }
      const byId = BANK.rounds.find(r => r.roundId === key);
      if (byId) return shufflePack ? RoundGen.shuffleRound(byId) : byId;
      if (/^\d{4}-\d{2}-\d{2}$/.test(key)) return RoundGen.forDate(BANK, key);
      return RoundGen.random(BANK, lastPlayedIds);
    };

    const totalPrompts = RoundGen.allPatients(BANK).length;
    const totalAnswers = BANK.rounds.reduce((s, r) => s + r.patients.reduce((a, p) => a + p.acceptedAnswers.length, 0), 0);
    q('rl-bankStats').innerHTML = `<span>Ronde Acak 7/${totalPrompts}</span><span>${totalPrompts} Topik Klinis</span><span>${totalAnswers.toLocaleString('id-ID')}+ Jawaban Medis</span>`;

    let S = Progress.read();
    const save = () => Progress.write(S);
    const isOpen = () => !!document.getElementById('rujukLangkaPage')?.classList.contains('active');

    /* ---------- 8-Faskes Referral Street Canvas Scene ---------- */
    const Scene = (() => {
      const WH = 240, BASE = 180, SW = 230, X0 = 140;
      const cx = t => X0 + (t - 1) * SW;
      const WW = cx(8) + 230;
      const B = [[44, 32], [92, 40], [64, 60], [86, 74], [104, 90], [92, 104], [110, 122], [170, 140]];
      const ST = B.map(b => BASE - b[1] - 30), SX = B.map((_, i) => X0 + i * SW);
      const LABEL = ['PRAKTIK DOKTER', 'PUSKESMAS', 'KLINIK PRATAMA', 'RS TIPE D', 'RS TIPE C', 'KLINIK UTAMA', 'RS TIPE B', 'RS TIPE A'];
      const cv = q('rl-cv'), ctx = cv.getContext('2d'), sceneHost = q('rl-scene'), flags = q('rl-flags');
      flags.innerHTML = T.map(t => `<div class="rl-flag" style="--c:${t.color}"><i></i>+${t.pts} poin</div>`).join('');
      const fl = [...flags.children];
      const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
      let P = 0, world, far;
      let seed = 5;
      const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      const rr = (g, x, y, w, h, r, c) => { g.fillStyle = c; g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); g.fill(); };
      const ci = (g, x, y, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };
      function block(g, x, y, w, h, r, col, shade, hi) {
        rr(g, x, y, w, h, r, col);
        g.save(); g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); g.clip();
        g.fillStyle = shade; g.fillRect(x + w * .8, y, w, h); g.fillStyle = hi; g.fillRect(x, y, Math.max(3, w * .07), h); g.restore();
      }
      function win(g, x, y, w, h, c) { rr(g, x, y, w, h, Math.min(3, w / 3), c || '#bfe9ff'); rr(g, x + 1.2, y + 1.2, w * .38, h * .32, 1.2, 'rgba(255,255,255,.85)'); }
      function grid(g, x, y, w, rows, cols, ww, wh, gy, c) { const gap = (w - cols * ww) / (cols + 1); for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) win(g, x + gap + k * (ww + gap), y + r * (wh + gy), ww, wh, c); }
      function cross(g, x, y, s) { rr(g, x, y, s, s, s * .28, '#fff'); const m = s * .34; rr(g, x + (s - m) / 2, y + s * .16, m, s * .68, 1.2, '#ff4b5c'); rr(g, x + s * .16, y + (s - m) / 2, s * .68, m, 1.2, '#ff4b5c'); }
      function door(g, x, w, h) { rr(g, x, BASE - h, w, h + 2, [4, 4, 0, 0], '#7fd0f5'); g.fillStyle = '#5bb6e0'; g.fillRect(x + w / 2 - .6, BASE - h, 1.2, h); }
      function sign(g, cxp, y, text, col) {
        g.font = '900 6px Nunito, system-ui, sans-serif'; const tw = g.measureText(text).width + 10;
        rr(g, cxp - tw / 2, y, tw, 10, 5, col); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, cxp, y + 5.3);
      }
      function roof(g, x, y, w, h, col, dark) {
        g.fillStyle = col; g.strokeStyle = col; g.lineJoin = 'round'; g.lineWidth = 6;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + w / 2, y - h); g.lineTo(x + w, y); g.closePath(); g.fill(); g.stroke();
        if (dark) { g.fillStyle = dark; g.beginPath(); g.moveTo(x + w / 2, y - h); g.lineTo(x + w, y); g.lineTo(x + w * .7, y); g.closePath(); g.fill(); }
      }
      function tree(g, x) {
        rr(g, x - 2.5, BASE - 22, 5, 24, 2.5, '#b07a4a');
        ci(g, x - 6, BASE - 26, 9, '#4fbf5a'); ci(g, x + 6, BASE - 27, 10, '#46b551'); ci(g, x, BASE - 36, 11, '#5ccc66'); ci(g, x - 3, BASE - 39, 4, '#8be08f');
      }
      function lamp(g, x) { rr(g, x - 1.5, BASE - 40, 3, 42, 1.5, '#9aa8b3'); rr(g, x - 1.5, BASE - 42, 12, 3.5, 1.75, '#9aa8b3'); rr(g, x + 5, BASE - 40, 7, 3.5, 1.75, '#ffd86b'); }
      function paint() {
        seed = 5;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        P = Math.min(4, Math.ceil(3 * dpr));
        world = mk(Math.ceil(WW * P), Math.ceil(WH * P)); far = mk(Math.ceil((WW * .5 + 1400) * P / 2), Math.ceil(WH * P / 2));
        let g = far.getContext('2d'); g.scale(P / 2, P / 2);
        ci(g, 200, 46, 22, '#fff3c4'); ci(g, 200, 46, 16, '#ffd34d');
        for (let x = 60; x < far.width * 2 / P; x += 170 + rnd() * 120) { const y = 22 + rnd() * 40, s = .7 + rnd() * .6; ci(g, x, y, 10 * s, '#fff'); ci(g, x + 12 * s, y - 5 * s, 13 * s, '#fff'); ci(g, x + 26 * s, y, 10 * s, '#fff'); rr(g, x - 4 * s, y, 38 * s, 10 * s, 5 * s, '#fff'); }
        for (let x = -40; x < far.width * 2 / P; x += 120 + rnd() * 90) { const r = 50 + rnd() * 50; g.fillStyle = rnd() < .5 ? '#bfe8a5' : '#ade093'; g.beginPath(); g.ellipse(x, BASE + 10, r * 1.4, r * .75, 0, Math.PI, 0); g.fill(); }
        for (let x = 0; x < far.width * 2 / P; x += 26 + rnd() * 30) { const w = 16 + rnd() * 18, h = 20 + rnd() * 40; rr(g, x, BASE - h, w, h + 4, 5, '#cfe6ee'); }
        g = world.getContext('2d'); g.scale(P, P);
        const T8 = T.map(t => t.color);
        const sg = (i, cxp, y) => { sign(g, cxp, y, LABEL[i], T8[i]); ST[i] = y; SX[i] = cxp; };
        const bush = (x, r, c) => { ci(g, x - r * .7, BASE - r * .55, r * .75, c || '#4fbf5a'); ci(g, x + r * .7, BASE - r * .55, r * .75, c || '#4fbf5a'); ci(g, x, BASE - r * .9, r, c || '#5ccc66'); };
        const plaza = (x, w, c) => { rr(g, x, BASE - 1.5, w, 3, 1.5, c || '#f3e7cf'); };
        function glass(x, y, w, h, r, top, bot) {
          g.save(); g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); g.clip();
          const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, top || '#9fe0ff'); gr.addColorStop(1, bot || '#4fb8e8'); g.fillStyle = gr; g.fillRect(x, y, w, h);
          g.fillStyle = 'rgba(255,255,255,.35)'; for (let k = x + 8; k < x + w; k += 9) g.fillRect(k, y, .8, h); for (let k = y + 9; k < y + h; k += 9) g.fillRect(x, k, w, .8);
          g.fillStyle = 'rgba(255,255,255,.28)'; g.beginPath(); g.moveTo(x + w * .15, y + h); g.lineTo(x + w * .45, y); g.lineTo(x + w * .62, y); g.lineTo(x + w * .32, y + h); g.fill();
          g.restore();
        }
        function warmGlass(x, y, w, h, r) {
          g.save(); g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); g.clip();
          g.fillStyle = '#2f6f8f'; g.fillRect(x, y, w, h);
          for (let k = y + 4; k < y + h - 4; k += 10) { g.fillStyle = '#ffd98a'; g.fillRect(x, k, w, 6); g.fillStyle = '#fff1c7'; g.fillRect(x, k, w, 1.4); }
          g.fillStyle = 'rgba(255,255,255,.18)'; for (let k = x + 10; k < x + w; k += 11) g.fillRect(k, y, 1, h);
          g.restore();
        }
        function fountain(x) { rr(g, x - 13, BASE - 6, 26, 7, 3.5, '#c9d6de'); rr(g, x - 11, BASE - 6, 22, 3, 1.5, '#7fd0f5'); g.strokeStyle = '#9fe0ff'; g.lineWidth = 1.6; g.lineCap = 'round'; [[-7, -15], [0, -20], [7, -15]].forEach(([dx, hh]) => { g.beginPath(); g.moveTo(x, BASE - 6); g.quadraticCurveTo(x + dx * .6, BASE - 6 + hh, x + dx, BASE - 6); g.stroke(); }); }
        function flagpole(x, h, top, bot) { rr(g, x - .8, BASE - h, 1.6, h, .8, '#b9c6cf'); rr(g, x + .8, BASE - h + 1, 12, 4, 1, top); rr(g, x + .8, BASE - h + 5, 12, 4, 1, bot); ci(g, x, BASE - h, 1.4, '#ffd34d'); }
        function palm(x) { rr(g, x - 1.5, BASE - 30, 3, 31, 1.5, '#b07a4a'); g.fillStyle = '#3fb25a'; [[-12, -4], [12, -4], [-9, -11], [9, -11], [0, -13]].forEach(([dx, dy]) => { g.beginPath(); g.ellipse(x + dx * .55, BASE - 31 + dy * .4, 9, 3, Math.atan2(dy, dx) + (dx < 0 ? .5 : -.5), 0, Math.PI * 2); g.fill(); }); ci(g, x, BASE - 31, 2.5, '#8a5a33'); }
        function heli(x, y) {
          rr(g, x - 16, y - 1, 32, 1.6, .8, '#3a4450'); rr(g, x - .8, y, 1.6, 3, .8, '#3a4450');
          rr(g, x - 9, y + 3, 16, 8, 4, '#ff4b5c'); rr(g, x + 5, y + 5, 12, 2.4, 1.2, '#ff4b5c'); rr(g, x + 15, y + 3, 2.4, 5, 1.2, '#d93245');
          rr(g, x - 7, y + 4.5, 6, 3.5, 1.7, '#bfe9ff'); rr(g, x - 9, y + 12, 16, 1.2, .6, '#3a4450'); rr(g, x - 6, y + 10.5, 1, 2, .5, '#3a4450'); rr(g, x + 3, y + 10.5, 1, 2, .5, '#3a4450');
        }
        (() => { const [w, h] = B[0], x = cx(1) - w / 2; block(g, x, BASE - h, w, h + 2, 5, '#efe3cc', '#ddcdb0', '#f7eedd'); roof(g, x - 3, BASE - h + 1, w + 6, 15, '#c9775b', '#b4664c'); win(g, x + 7, BASE - h + 10, 10, 9); rr(g, x + w - 17, BASE - 16, 9, 18, [3, 3, 0, 0], '#a9774f'); ci(g, x + w - 10, BASE - 7, .9, '#ffd34d'); rr(g, x - 14, BASE - 12, 1.4, 12, .7, '#9aa8b3'); rr(g, x - 20, BASE - 18, 13, 7, 2, '#ffffff'); g.fillStyle = '#7b838d'; g.font = '900 4.5px Nunito, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('dr.', x - 13.5, BASE - 14.4); sg(0, x + w / 2, BASE - h - 30); })();
        (() => { const [w, h] = B[1], x = cx(2) - w / 2; block(g, x, BASE - h, w, h + 2, 6, '#ffffff', '#e7edf1', '#ffffff'); rr(g, x - 6, BASE - h - 10, w + 12, 13, 6, '#46c45a'); rr(g, x - 6, BASE - h - 1, w + 12, 4, 2, '#2f9c45'); grid(g, x, BASE - h + 9, w, 1, 5, 9, 10, 0); door(g, x + w / 2 - 7, 14, 17); flagpole(x + w + 12, 48, '#ff4b5c', '#ffffff'); for (let k = x + 2; k < x + w - 4; k += 12) ci(g, k + 4, BASE - 3, 4, '#6fd37f'); sg(1, x + w / 2, BASE - h - 23); })();
        (() => { const [w, h] = B[2], x = cx(3) - w / 2; block(g, x, BASE - h, w, h + 2, 7, '#7fdccf', '#5fc6b8', '#a5eadf'); grid(g, x, BASE - h + 8, w, 2, 3, 11, 11, 9); for (let k = 0; k < 6; k++) rr(g, x - 3 + k * ((w + 6) / 6), BASE - 27, (w + 6) / 6, 7, [0, 0, 3, 3], k % 2 ? '#ffffff' : '#2ec4b6'); door(g, x + w / 2 - 7, 14, 18); cross(g, x + w - 15, BASE - h + 4, 10); [x - 6, x + w + 6].forEach(px => { rr(g, px - 4, BASE - 7, 8, 8, 2, '#c98b4e'); ci(g, px, BASE - 10, 5, '#4fbf5a'); }); sg(2, x + w / 2, BASE - h - 14); })();
        (() => { const [w, h] = B[3], x = cx(4) - w / 2; block(g, x, BASE - h, w, h + 2, 8, '#ffffff', '#e3eaef', '#ffffff'); rr(g, x, BASE - h + 20, w, 3, 1.5, '#4fb8e8'); rr(g, x, BASE - h + 42, w, 3, 1.5, '#4fb8e8'); grid(g, x, BASE - h + 6, w, 3, 5, 10, 10, 12); rr(g, x + w / 2 - 16, BASE - 24, 32, 5, 2.5, '#4fb8e8'); door(g, x + w / 2 - 8, 16, 19); cross(g, x + w / 2 - 7, BASE - h - 16, 14); bush(x - 6, 6); bush(x + w + 6, 6); sg(3, x + w / 2, BASE - h - 30); })();
        (() => { const [w, h] = B[4], x = cx(5) - w / 2; plaza(x - 24, w + 40); block(g, x, BASE - h, w, h + 2, 9, '#f4f7fa', '#dbe3e9', '#ffffff'); for (let r = 0; r < 4; r++) rr(g, x + 6, BASE - h + 8 + r * 16, w - 12, 9, 4, '#bfe9ff'); g.fillStyle = 'rgba(255,255,255,.7)'; for (let r = 0; r < 4; r++) for (let k = x + 16; k < x + w - 8; k += 14) g.fillRect(k, BASE - h + 8 + r * 16, 1.2, 9); rr(g, x - 22, BASE - 26, 36, 6, 3, '#ff4b5c'); rr(g, x - 20, BASE - 20, 3, 22, 1.5, '#c3ccd3'); rr(g, x + 8, BASE - 20, 3, 22, 1.5, '#c3ccd3'); rr(g, x - 17, BASE - 37, 24, 10, 5, '#ff4b5c'); g.fillStyle = '#fff'; g.font = '900 6px Nunito, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('IGD', x - 5, BASE - 31.7); door(g, x + w / 2 - 4, 20, 20); rr(g, x + w / 2 - 22, BASE - h - 4, 1.5, 6, .7, '#9aa8b3'); rr(g, x + w / 2 + 20, BASE - h - 4, 1.5, 6, .7, '#9aa8b3'); cross(g, x + w - 22, BASE - h - 17, 14); bush(x + w + 8, 7); sg(4, x + w / 2 - 6, BASE - h - 13); })();
        (() => { const [w, h] = B[5], x = cx(6) - w / 2; plaza(x - 18, w + 36, '#eadfc9'); rr(g, x - 2, BASE - h - 2, w + 4, h + 4, 16, '#ffffff'); warmGlass(x + 3, BASE - h + 3, w - 6, h - 6, 13); rr(g, x - 8, BASE - 24, w + 16, 5, 2.5, '#ffffff'); door(g, x + w / 2 - 11, 22, 18); palm(x - 12); palm(x + w + 12); rr(g, x + w / 2 - 26, BASE - h - 15, 52, 12, 6, '#ffffff'); sg(5, x + w / 2, BASE - h - 14); })();
        (() => { const [w, h] = B[6], x = cx(7) - w / 2; plaza(x - 26, w + 52, '#eadfc9'); block(g, x, BASE - h, w, h + 2, 12, '#ffffff', '#e3eaef', '#ffffff'); glass(x + 7, BASE - h + 7, w / 2 - 14, h - 30, 6); glass(x + w / 2 + 7, BASE - h + 7, w / 2 - 14, h - 30, 6); rr(g, x + w / 2 - 5, BASE - h, 10, h, 5, '#ff7a3d'); for (let y = BASE - h + 6; y < BASE - 26; y += 9) rr(g, x + w / 2 - 3, y, 6, 5, 2.5, '#ffd2bd'); rr(g, x + 10, BASE - h - 8, w - 20, 9, 4.5, '#e3eaef'); rr(g, x + w / 2 - 24, BASE - 26, 48, 5, 2.5, '#bfe9ff'); door(g, x + w / 2 - 11, 22, 20); cross(g, x + w / 2 - 9, BASE - h - 27, 18); fountain(x - 14); bush(x + w + 10, 8, '#46b551'); sg(6, x + w / 2, BASE - h - 42); })();
        (() => { const [w, h] = B[7], x = cx(8) - w / 2, tw = 82, t2 = 56, gap = w - tw - t2; plaza(x - 30, w + 60, '#f1e3c4'); block(g, x + tw + gap, BASE - 112, t2, 114, 12, '#ffffff', '#e3eaef', '#ffffff'); glass(x + tw + gap + 6, BASE - 106, t2 - 12, 74, 6, '#b7ecff', '#5bb6e0'); block(g, x, BASE - h, tw, h + 2, 14, '#ffffff', '#e1e8ed', '#ffffff'); glass(x + 7, BASE - h + 8, tw - 14, h - 44, 7, '#b7ecff', '#4fb8e8'); rr(g, x, BASE - h + 4, tw, 2.5, 1.2, '#ffc331'); rr(g, x + tw + gap, BASE - 108, t2, 2.5, 1.2, '#ffc331'); rr(g, x + tw - 4, BASE - 82, gap + 8, 12, 5, '#ffffff'); glass(x + tw - 2, BASE - 80, gap + 4, 8, 3, '#d4f3ff', '#7fd0f5'); rr(g, x - 10, BASE - 34, w + 20, 36, 12, '#ffffff'); glass(x - 4, BASE - 30, w + 8, 26, 8, '#d4f3ff', '#7fd0f5'); rr(g, x + tw / 2 - 26, BASE - 37, 52, 5, 2.5, '#ffc331'); door(g, x + tw / 2 - 12, 24, 22); rr(g, x + 10, BASE - h - 5, tw - 20, 6, 3, '#9aa8b3'); g.fillStyle = '#ffd34d'; g.beginPath(); g.ellipse(x + tw / 2, BASE - h - 5, 18, 3.4, 0, 0, Math.PI * 2); g.fill(); heli(x + tw / 2, BASE - h - 20); rr(g, x + 5, BASE - h - 18, 2.5, 14, 1.2, '#9aa8b3'); cross(g, x + tw + gap + t2 / 2 - 9, BASE - 134, 18); flagpole(x - 22, 44, '#ff4b5c', '#ffffff'); flagpole(x - 14, 40, '#46c45a', '#ffffff'); flagpole(x + w + 16, 44, '#4fb8e8', '#ffffff'); fountain(x + w + 34); bush(x + w + 4, 7, '#46b551'); sg(7, x + tw / 2, BASE - h - 34); })();
        for (let t = 1; t <= 7; t++) { const m = cx(t) + SW / 2; tree(g, m - 18); lamp(g, m + 12); }
        tree(g, cx(8) + 150); lamp(g, cx(8) + 180); tree(g, 40); lamp(g, 70);
        rr(g, 0, BASE, WW, 8, 0, '#e3e8ec'); rr(g, 0, BASE, WW, 2.5, 0, '#f4f6f8'); rr(g, 0, BASE + 8, WW, 3, 0, '#c9d1d8');
        rr(g, 0, BASE + 11, WW, 26, 0, '#6b7682'); for (let x = 6; x < WW; x += 24) rr(g, x, BASE + 22.5, 12, 3, 1.5, '#ffffff');
        rr(g, 0, BASE + 37, WW, 3, 0, '#c9d1d8'); rr(g, 0, BASE + 40, WW, WH - BASE - 40, 0, '#8fd86e');
        for (let i = 0; i < 70; i++) { const x = rnd() * WW, y = BASE + 46 + rnd() * 18; ci(g, x, y, 2 + rnd() * 2, '#7ccc5b'); }
      }
      let s = 2, sT = 2, oy = 0, oyT = 0, amb = 20, cam = 0, tw = null, hit = 0, w = 0, h = 0, dpr = 1, ready = false;
      function size() {
        w = sceneHost.clientWidth; h = sceneHost.clientHeight; dpr = Math.min(2, window.devicePixelRatio || 1);
        if (!w || !h) return;
        cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
        if (!P || P !== Math.min(4, Math.ceil(3 * dpr))) paint();
        ready = true;
      }
      if (typeof ResizeObserver !== 'undefined') new ResizeObserver(size).observe(sceneHost);
      window.addEventListener('resize', () => { if (isOpen()) size(); });
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { P = 0; size(); });
      function drawAmb(x, y, driving, now) {
        const b = driving ? Math.sin(now / 70) * .8 : 0, on = driving && Math.floor(now / 180) % 2 === 0, g = ctx;
        g.fillStyle = 'rgba(40,60,80,.14)'; g.beginPath(); g.ellipse(x + 22, y + 27.5, 22, 3, 0, 0, Math.PI * 2); g.fill();
        if (driving) { g.fillStyle = on ? 'rgba(255,75,92,.28)' : 'rgba(79,184,232,.28)'; g.beginPath(); g.arc(x + 18, y + 2 + b, 9, 0, Math.PI * 2); g.fill(); }
        rr(g, x + 13, y + .5 + b, 5, 4, 2, on ? '#ff4b5c' : '#ffb3ba'); rr(g, x + 18, y + .5 + b, 5, 4, 2, driving && !on ? '#4fb8e8' : '#b9e3f7');
        rr(g, x, y + 4 + b, 32, 20, 6, '#ffffff'); rr(g, x + 26, y + 8 + b, 18, 16, 7, '#ffffff');
        rr(g, x + 1, y + 19 + b, 42, 4, 2, '#e3e9ee'); rr(g, x + 1, y + 15 + b, 42, 3.5, 1.5, '#ff4b5c');
        rr(g, x + 10.5, y + 6.5 + b, 3.6, 10, 1.3, '#ff4b5c'); rr(g, x + 7.3, y + 9.7 + b, 10, 3.6, 1.3, '#ff4b5c');
        rr(g, x + 29, y + 9.5 + b, 13, 7.5, 3.5, '#9fdcff'); rr(g, x + 30.5, y + 10.7 + b, 4.5, 2.2, 1.1, 'rgba(255,255,255,.85)');
        rr(g, x + 20, y + 8 + b, 6, 6, 2, '#9fdcff');
        ci(g, x + 43, y + 19.5 + b, 1.3, '#ffe38a');
        const rot = driving ? now / 90 : 0;
        [9, 35].forEach(wx => { ci(g, x + wx, y + 24, 4.4, '#3a4450'); ci(g, x + wx, y + 24, 2, '#d4dbe1'); g.strokeStyle = '#3a4450'; g.lineWidth = .8; g.beginPath(); g.moveTo(x + wx, y + 24); g.lineTo(x + wx + Math.cos(rot) * 2, y + 24 + Math.sin(rot) * 2); g.stroke(); });
      }
      function frame(now) {
        requestAnimationFrame(frame);
        if (!isOpen() || !ready || sceneHost.hidden || !w) return;
        let driving = false;
        if (tw) {
          const k = Math.max(0, Math.min(1, (now - tw.s) / tw.d)), e = -(Math.cos(Math.PI * k) - 1) / 2;
          amb = tw.a + (tw.b - tw.a) * e; driving = k > 0 && k < 1;
          if (k >= 1) { const cb = tw.cb; tw = null; if (cb) cb(); }
        }
        const res = root.classList.contains('resmode');
        const gF = !q('rl-card').hidden ? (w < 700 ? .48 : .58) : .84;
        sT = Math.max(1.25, Math.min(3, res ? gF * h / 240 : h / 268, w / 160));
        s += (sT - s) * .12;
        const LH = h / s, VW = w / s;
        oyT = res ? Math.min(LH - WH, gF * LH - (BASE + 40)) : LH - WH;
        oy += (oyT - oy) * .12;
        const max = Math.max(0, WW - VW);
        cam = Math.max(0, Math.min(max, amb + 22 - VW * (VW < 300 ? .32 : .42)));
        if (WW < VW) cam = -(VW - WW) / 2;
        const g = ctx;
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#bfe8ff'); sky.addColorStop(1, '#effaff');
        g.fillStyle = sky; g.fillRect(0, 0, w, h);
        g.setTransform(s * dpr, 0, 0, s * dpr, 0, 0); g.imageSmoothingEnabled = true;
        const fx = Math.max(0, cam) * .5, Pf = P / 2;
        g.drawImage(far, fx * Pf, 0, VW * Pf, WH * Pf, 0, oy, VW, WH);
        if (cam >= 0) g.drawImage(world, cam * P, 0, Math.min(VW, WW - cam) * P, WH * P, 0, oy, Math.min(VW, WW - cam), WH);
        else g.drawImage(world, 0, 0, WW * P, WH * P, -cam, oy, WW, WH);
        g.fillStyle = '#8fd86e'; g.fillRect(0, oy + WH - .5, VW, LH - oy - WH + 1);
        [[6, 3], [7, 4], [8, 7]].forEach(([t, n]) => {
          const [bw, bh] = B[t - 1];
          for (let k = 0; k < n; k++) {
            const ph = (now / 900 + k * 1.7 + t) % 3; if (ph > 1) continue;
            const a = Math.sin(ph * Math.PI), sx = cx(t) - cam + ((k * 37 + t * 13) % bw) - bw / 2, sy = oy + BASE - bh * (.35 + ((k * 23) % 60) / 100);
            g.fillStyle = `rgba(255,255,255,${a})`; g.beginPath(); g.moveTo(sx, sy - 3.5 * a); g.lineTo(sx + a, sy - a); g.lineTo(sx + 3.5 * a, sy); g.lineTo(sx + a, sy + a); g.lineTo(sx, sy + 3.5 * a); g.lineTo(sx - a, sy + a); g.lineTo(sx - 3.5 * a, sy); g.lineTo(sx - a, sy - a); g.fill();
          }
        });
        if (Math.floor(now / 500) % 2) ci(g, cx(8) - B[7][0] / 2 + 6.2 - cam, oy + BASE - B[7][1] - 19, 1.6, '#ff4b5c');
        drawAmb(amb - cam, oy + BASE + 6, driving, now);
        for (let i = 0; i < 8; i++) {
          const f = fl[i], x = (SX[i] - cam) * s, y = (oy + ST[i]) * s - f.offsetHeight - 6;
          f.style.transform = `translate(${Math.round(x - f.offsetWidth / 2)}px,${Math.round(y)}px)`;
          f.classList.toggle('hit', hit === i + 1);
        }
      }
      requestAnimationFrame(frame);
      return {
        size,
        park(t) { tw = null; hit = t || 0; amb = t ? cx(t) - 22 : 20; },
        reset() { tw = null; hit = 0; amb = 20; },
        drive(t, cb) {
          hit = 0;
          tw = { a: amb, b: cx(t) - 22, s: performance.now() + 400, d: REDUCE ? 600 : 1400 + 600 * (t - 1), cb: () => { hit = t; cb && cb(); } };
        },
        skip() { if (tw) { const cb = tw.cb; amb = tw.b; tw = null; if (cb) cb(); } },
        busy: () => !!tw
      };
    })();

    /* ---------- How-to tiers ---------- */
    const NOTE = { 1: 'paling sering dicari di Google (30% teratas)', 8: '2% paling langka di pencarian Google' };
    let accP = 0;
    q('rl-howTiers').innerHTML = T.map(t => {
      const a = accP; accP += t.band;
      return `<div class="rl-trow" style="--c:${t.color}"><span class="rl-badge">${t.n}</span><span class="nm">${t.name}</span><span class="pt">+${t.pts}</span><span class="nt">${NOTE[t.n] || `persentil kelangkaan ${a}–${accP}%`}</span></div>`;
    }).join('');

    /* ---------- Views & Dashboard ---------- */
    const VIEWS = ['rl-vDash', 'rl-vPlay', 'rl-vSum'];
    const MODE_LABEL = { archive: 'arsip', practice: 'latihan' };
    const boxFor = mode => (mode === 'practice' ? (S.practice = S.practice || {}) : mode ? (S.archive = S.archive || {}) : (S.scored = S.scored || {}));
    let G = null;

    function showView(v) {
      if (v !== 'rl-vPlay') { root.classList.remove('resmode'); q('rl-skipH').hidden = true; }
      VIEWS.forEach(x => { q(x).hidden = x !== v; });
      q('rl-scene').hidden = v === 'rl-vDash';
      q('rl-sq').hidden = q('rl-tm').hidden = v !== 'rl-vPlay';
      q('rl-hStreak').hidden = v === 'rl-vPlay';
      if (v !== 'rl-vPlay') q('rl-card').hidden = true;
      if (v !== 'rl-vDash') requestAnimationFrame(() => Scene.size());
    }

    function renderDash() {
      const t = todayWib(), st = Progress.streak(S), rec = S.scored?.[t];
      const num = Math.max(1, dayNum(t) + 1);
      q('rl-dRound').textContent = '#' + num;
      q('rl-dDate').textContent = fmtDate(t, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      q('rl-monRound').textContent = 'JAGA #' + num;
      q('rl-hStreakN').textContent = st.n;
      q('rl-hStreak').title = st.buf ? `Streak ${st.n} hari · 1 hari cadangan` : `Streak ${st.n} hari`;
      q('rl-sStreak').textContent = st.n + ' hari';
      q('rl-ext').checked = !!S.ext;
      q('rl-start').innerHTML = (rec && rec.done ? '🎲 Main Ronde Acak Baru' : rec && rec.a.length ? `Lanjut jaga ${Math.min(rec.a.length + 1, 7)}/7` : 'Mulai jaga harian') + ' <span class="kbd">ENTER</span>';
      q('rl-randBtn').hidden = !!(rec && rec.done);
      q('rl-resBtn').hidden = !(rec && rec.done);
    }

    function openArchive() {
      // 1. All 4 themed packs playable immediately (patient order shuffled each play)
      q('rl-roundList').innerHTML = BANK.rounds.map((r, idx) => {
        const topics = r.patients.map(p => p.category).join(' · ');
        const ar = S.archive?.[r.roundId];
        const st = ar && ar.done ? `Rekor ${ar.score} poin` : `${r.patients.length} pasien`;
        return `<button type="button" data-rl-round="${r.roundId}"><span><b>Paket ${idx + 1}: ${esc(r.title || r.roundId)}</b><span class="sub">${esc(topics)}</span></span><span class="s">${st} ›</span></button>`;
      }).join('');
      // 2. Past daily dates (each date has its own non-patterned 7-of-28 random mix)
      const t = todayWib(), rows = [];
      for (let k = 1; k <= 10; k++) { const x = addDays(t, -k); if (dayNum(x) < 0) break; rows.push(x); }
      q('rl-archList').innerHTML = rows.length ? rows.map(x => {
        const sc = S.scored?.[x], ar = S.archive?.[x];
        const st = sc && sc.done ? `${sc.score} poin` : ar && ar.done ? `${ar.score} poin (arsip)` : 'Mainkan ›';
        return `<button type="button" data-rl-date="${x}"><span><b>#${dayNum(x) + 1}</b> ${fmtDate(x, { weekday: 'short', day: 'numeric', month: 'short' })}</span><span class="s">${st}</span></button>`;
      }).join('') : '<p>Belum ada ronde sebelumnya.</p>';
      openM('rl-archOv');
    }

    q('rl-archRandBtn').addEventListener('click', () => { closeM(); startRandom(); });
    q('rl-roundList').addEventListener('click', e => {
      const b = e.target.closest('button[data-rl-round]'); if (!b) return;
      closeM(); begin(b.dataset.rlRound, 'archive');
    });
    q('rl-archList').addEventListener('click', e => {
      const b = e.target.closest('button[data-rl-date]'); if (!b) return;
      closeM(); begin(b.dataset.rlDate, 'archive');
    });

    let lastTickDay = '';
    function tick() {
      if (!host.isConnected) return;
      const now = Date.now() + WIB, ms = Math.ceil(now / 864e5) * 864e5 - now;
      q('rl-sCount').textContent = [ms / 36e5, (ms % 36e5) / 6e4, (ms % 6e4) / 1e3].map(x => String(Math.floor(x)).padStart(2, '0')).join(':');
      const curDay = todayWib();
      if (lastTickDay && lastTickDay !== curDay && !q('rl-vDash').hidden) renderDash();
      const wib = new Date(Date.now() + WIB), hh = wib.getUTCHours() % 12, mm = wib.getUTCMinutes();
      q('rl-clockH').setAttribute('transform', `rotate(${hh * 30 + mm / 2} 420 88)`);
      q('rl-clockM').setAttribute('transform', `rotate(${mm * 6} 420 88)`);
      lastTickDay = curDay;
    }
    setInterval(tick, 1000);
    tick();

    /* ---------- Gameplay ---------- */
    function startRandom() {
      const rndRound = RoundGen.random(BANK, lastPlayedIds);
      begin(rndRound.roundId, 'practice', rndRound);
    }

    function begin(key, archive, customRound) {
      if (archive === true) archive = 'archive';
      const box = boxFor(archive);
      const existing = archive ? null : box[key];
      const round = customRound || roundFor(key, existing, !!archive);
      if (archive) box[key] = { a: [], score: 0, done: false, pids: round.patients.map(p => p.id), title: round.title || '' };
      const rec = box[key] = box[key] || { a: [], score: 0, done: false, pids: round.patients.map(p => p.id), title: round.title || '' };
      if (!Array.isArray(rec.pids) || !rec.pids.length) { rec.pids = round.patients.map(p => p.id); rec.title = round.title || ''; }
      if (rec.done) return summary(key, archive);
      if (rec.started === rec.a.length && rec.a.length < round.patients.length) rec.a.push(null);
      lastPlayedIds = new Set(round.patients.map(p => p.id));
      G = { date: key, round, archive, rec };
      showView('rl-vPlay');
      nextPatient();
    }

    function squares() {
      q('rl-sq').innerHTML = G.round.patients.map((_, k) => {
        const x = G.rec.a[k];
        if (k < G.rec.a.length) return x ? `<i class="done" style="--c:${T[x.t - 1].color}">${x.t}</i>` : '<i class="miss">–</i>';
        return `<i class="${k === G.i ? 'cur' : ''}"></i>`;
      }).join('');
    }

    function clearSugs() {
      const box = q('rl-sugs');
      if (box) { box.innerHTML = ''; box.hidden = true; }
    }
    function renderSugs(list, typed) {
      const box = q('rl-sugs');
      if (!box) return;
      if (!list || !list.length) { clearSugs(); return; }
      box.innerHTML = `<span>Maksud kamu:</span>` + list.map(s =>
        `<button type="button" class="rl-sug-chip" data-rl-sug="${s.index}" data-rl-typed="${esc(typed)}">${esc(s.canonicalName)}</button>`
      ).join('');
      box.hidden = false;
    }
    q('rl-sugs').addEventListener('click', e => {
      const btn = e.target.closest('button[data-rl-sug]');
      if (!btn || !G || G.phase !== 'ask') return;
      const idx = Number(btn.dataset.rlSug);
      const typed = btn.dataset.rlTyped || q('rl-ans')?.value || '';
      clearSugs();
      if (Number.isInteger(idx) && idx >= 0) resolve(idx, null, typed || null);
    });
    q('rl-ans').addEventListener('input', clearSugs);

    function nextPatient() {
      if (!G) return;
      const { rec, round } = G;
      if (rec.a.length >= round.patients.length) return finish();
      G.i = rec.a.length; rec.started = G.i; save();
      const p = round.patients[G.i], parts = p.prompt.split(/(?=Sebutkan )/);
      q('rl-pEye').textContent = `Pasien ${G.i + 1} dari ${round.patients.length} · ${p.category}${G.archive ? ' · ' + MODE_LABEL[G.archive] : ''}`;
      q('rl-pVig').textContent = parts.length > 1 ? parts[0].trim() : '';
      q('rl-pVig').hidden = !q('rl-pVig').textContent;
      q('rl-pQ').textContent = parts.length > 1 ? parts.slice(1).join('').trim() : p.prompt;
      q('rl-card').hidden = true; q('rl-skipH').hidden = true;
      root.classList.remove('resmode');
      squares();
      const inp = q('rl-ans'); inp.value = ''; inp.readOnly = false; q('rl-go').disabled = false;
      q('rl-err').textContent = ''; clearSugs(); passArm(false); q('rl-passBtn').hidden = false;
      Scene.reset();
      G.phase = 'ask'; G.secs = S.ext ? 45 : 30; G.deadline = performance.now() + G.secs * 1000; G.escAt = 0;
      try { inp.focus(); } catch {}
      cancelAnimationFrame(G.raf);
      loop();
    }

    function loop() {
      if (!G || G.phase !== 'ask') return;
      const left = Math.max(0, G.deadline - performance.now());
      q('rl-tBar').style.transform = `scaleX(${left / (G.secs * 1000)})`;
      q('rl-tNum').textContent = Math.ceil(left / 1000);
      q('rl-tm').classList.toggle('low', left < 5000);
      if (left <= 0) return resolve(null, 'Waktu habis');
      G.raf = requestAnimationFrame(loop);
    }

    function passArm(on) {
      q('rl-passBtn').classList.toggle('arm', on);
      q('rl-passT').textContent = on ? 'Lewati? Tekan lagi' : 'Lewati';
    }

    function submit() {
      if (!G) return;
      if (G.phase === 'res') return advance();
      const inp = q('rl-ans'), v = inp.value.trim(); if (!v) return;
      const p = G.round.patients[G.i], m = Engine.match(p, v);
      if (!m || m.ambiguous) {
        inp.classList.remove('rl-shake'); void inp.offsetWidth; inp.classList.add('rl-shake');
        const sugs = (m && Array.isArray(m.suggestions) && m.suggestions.length) ? m.suggestions : Engine.suggest(p, v, 3);
        q('rl-err').textContent = m?.ambiguous
          ? `"${v.slice(0, 28)}" mirip beberapa istilah — pilih di bawah atau perjelas.`
          : sugs.length
            ? `Ejaan "${v.slice(0, 28)}" belum pas — ketuk saran di bawah atau koreksi:`
            : `"${v.slice(0, 28)}" tidak ada di daftar.`;
        renderSugs(sugs, v);
        try { inp.select(); } catch {}
        return;
      }
      clearSugs();
      resolve(m.index, null, m.corrected ? v : null);
    }

    function pass() {
      if (!G || G.phase !== 'ask') return;
      const now = performance.now();
      if (now - G.escAt < 1800) return resolve(null, 'Pasien dilewati');
      G.escAt = now; passArm(true);
      setTimeout(() => { if (G && G.phase === 'ask' && performance.now() - G.escAt >= 1700) passArm(false); }, 1850);
    }

    function advance() { if (Scene.busy()) Scene.skip(); else nextPatient(); }
    const fmtPct = x => (x < 1 ? x.toFixed(1) : Math.round(x)).toString().replace('.', ',') + '%';

    function resolve(idx, why, typed) {
      G.phase = 'res'; cancelAnimationFrame(G.raf);
      const p = G.round.patients[G.i], dist = Engine.distribution(p, {});
      const inp = q('rl-ans'); inp.readOnly = true; q('rl-go').disabled = true; q('rl-passBtn').hidden = true; q('rl-err').textContent = ''; clearSugs();
      let left, tier = 0, color = '#ff4b5c';
      if (idx == null) {
        G.rec.a.push(null);
        left = `<div class="hd"><span class="rl-badge">!</span><span class="tn">${esc(why)}</span></div>
          <div class="lab">Paling sering dicari di Google</div><div class="ans">${dist.rows.slice(0, 3).map(r => esc(r.a.canonicalName)).join(', ')}</div>`;
      } else {
        const sc = Engine.score(p, idx, {}), t = T[sc.tier - 1], a = p.acceptedAnswers[idx]; tier = sc.tier; color = t.color;
        G.rec.a.push({ c: a.canonicalName, t: sc.tier, p: sc.pts, k: idx }); G.rec.score += sc.pts;
        inp.value = a.canonicalName;
        const pct = `Estimasi pangsa pencarian Google: ${fmtPct(sc.share)}`;
        left = `<div class="hd"><span class="rl-badge">${t.n}</span><div><div class="tn">Dirujuk ke ${t.name}</div><div class="pts">+${sc.pts} poin · tingkat ${t.n} dari 8</div></div></div>
          <div class="lab">Diterima sebagai</div><div class="ans">${esc(a.canonicalName)}</div>${typed ? `<div class="fix">✓ Dikoreksi otomatis dari “${esc(typed.slice(0, 40))}”</div>` : ''}<div class="meta">${pct}</div>`;
      }
      const right = `<p class="exp">${esc(p.explanation)}</p>`;
      const isLast = G.i === G.round.patients.length - 1;
      const html = `<div class="in"><div>${left}</div><div>${right}</div><div class="nb"><button type="button" class="rl-btn" id="rl-nextBtn">${isLast ? 'Lihat hasil' : 'Lanjut'} <span class="kbd">ENTER</span></button></div></div>`;
      G.rec.started = -1; save();
      const reveal = () => {
        squares(); q('rl-skipH').hidden = true;
        const c = q('rl-card'); c.style.setProperty('--c', color); c.innerHTML = html; c.hidden = false; c.scrollTop = 0;
        const nb = q('rl-nextBtn'); if (nb) nb.onclick = () => nextPatient();
      };
      root.classList.add('resmode');
      window.scrollTo(0, 0);
      if (tier) { q('rl-skipH').hidden = false; Scene.drive(tier, reveal); } else reveal();
      try { inp.blur(); } catch {}
    }

    function awardXP(key, rec, archive) {
      let gained = 0, leveledUp = false;
      try {
        if (typeof window.addXP !== 'function') return { gained: 0, leveledUp: false };
        const answered = rec.a.filter(Boolean).length;
        if (!answered) return { gained: 0, leveledUp: false };
        const bestTier = Math.max(0, ...rec.a.map(x => (x ? x.t : 0)));
        const baseXp = archive ? Math.min(20, answered * 3) : Math.min(40, 15 + answered * 3 + (bestTier >= 7 ? 10 : 0));
        const res = window.addXP(baseXp, 'Rujuk Langka • shift selesai', { kind: 'quest', ref: 'rl:' + key + ':' + (archive || 'daily'), silent: true });
        if (res && res.gained > 0) { gained = res.gained; leveledUp = !!res.leveledUp; }
        window.recordDailyQuestion?.();
        if (gained > 0 && typeof window.showXPPopup === 'function') {
          window.showXPPopup(gained, `Rujuk Langka • ${rec.score} poin`, leveledUp);
        }
      } catch {}
      return { gained, leveledUp };
    }

    function finish() {
      const rec = G.rec; rec.done = true; rec.started = -1; save();
      if (G.archive !== 'practice') {
        try {
          const me = typeof window.authCurrentUser === 'function' ? window.authCurrentUser() : null;
          if (me && me.id && navigator.onLine) {
            fetch('/api/minigames/rujuk-langka/score', {
              method: 'POST',
              credentials: 'same-origin',
              cache: 'no-store',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(S)
            }).catch(() => {});
          }
        } catch {}
      }
      const xpRes = awardXP(G.date, rec, G.archive);
      const { date, archive } = G; G = null;
      summary(date, archive, xpRes);
    }

    function simPercentile(round, mine) {
      let seed = 7, wins = 0;
      const N = 1200, rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      const dists = round.patients.map(p => Engine.distribution(p, {}));
      for (let k = 0; k < N; k++) {
        let s = 0;
        for (const d of dists) {
          if (rnd() < .12) continue;
          let x = rnd() * 100;
          const row = d.rows.find(r => (x -= r.share) <= 0) || d.rows[d.rows.length - 1];
          s += T[row.tier - 1].pts;
        }
        if (s < mine) wins++;
      }
      return Math.min(99, Math.round(wins / N * 100));
    }

    function summary(key, archive, xpRes) {
      const rec = boxFor(archive)[key], round = roundFor(key, rec, false);
      const isDateKey = /^\d{4}-\d{2}-\d{2}$/.test(key);
      showView('rl-vSum');
      q('rl-sumTag').textContent = isDateKey
        ? `Ronde #${dayNum(key) + 1} · ${fmtDate(key, { day: 'numeric', month: 'long' })}${archive ? ' · ' + MODE_LABEL[archive] : ''}`
        : `${round.title || round.roundId} · ${MODE_LABEL[archive] || 'acak'}`;
      q('rl-sumScore').textContent = rec.score;
      q('rl-xpSlot').innerHTML = xpRes && xpRes.gained > 0 ? `<div class="rl-xp-note">+${xpRes.gained} XP CLINED tercatat</div>` : '';
      const pv = simPercentile(round, rec.score);
      q('rl-sumP').textContent = pv + '%';
      let pct = `Perkiraan: skormu melampaui ${pv}% pemain (simulasi distribusi pencarian Google).`;
      if (archive) pct += archive === 'practice' ? ' Mode acak / latihan — hasil harian resmi tetap percobaan pertamamu.' : ' Mode arsip / paket tematik.';
      q('rl-sumPct').textContent = pct;
      const tiers = round.patients.map((p, k) => {
        const x = rec.a[k];
        if (!x) return 0;
        if (!x.t) x.t = Engine.score(p, x.k, {}).tier;
        return x.t;
      });
      const best = Math.max(0, ...tiers);
      q('rl-sumBest').textContent = best ? T[best - 1].short : '–';
      q('rl-sumBestC').style.setProperty('--c', best ? T[best - 1].color : '#9aa5b1');
      q('rl-sumGrid').innerHTML = tiers.map(t => (t ? `<i style="--c:${T[t - 1].color}">${t}</i>` : '<i class="x">–</i>')).join('');
      q('rl-sumRows').innerHTML = round.patients.map((p, k) => {
        const x = rec.a[k], t = tiers[k];
        return `<tr><td>${x ? `<span class="dot" style="--c:${T[t - 1].color}">${t}</span>` : '<span class="dot x">–</span>'}</td><td><span style="color:var(--mute);font-size:12.5px">${k + 1}. ${esc(p.category)}</span><br>${x ? `<b>${esc(x.c)}</b><br><span class="t" style="--c:${T[t - 1].color}">${T[t - 1].name}</span>` : '<span style="color:#9ca3af">Tidak terjawab</span>'}</td><td>${x ? '+' + (x.p || T[t - 1].pts) : '0'}</td></tr>`;
      }).join('');
      q('rl-copied').textContent = ''; q('rl-shareFallback').innerHTML = '';
      q('rl-randNextBtn').onclick = startRandom;
      q('rl-replayBtn').onclick = () => begin(key, archive || 'practice', round);
      q('rl-pickOtherBtn').onclick = openArchive;
      q('rl-shareBtn').onclick = () => share(key, round, rec.score, tiers, archive);
      Scene.park(Math.max(0, ...tiers));
    }

    function share(key, round, score, tiers, archive) {
      const best = Math.max(0, ...tiers);
      const label = /^\d{4}-\d{2}-\d{2}$/.test(key) ? `#${dayNum(key) + 1} · ${fmtDate(key, { day: 'numeric', month: 'short', year: 'numeric' })}` : (round.title || round.roundId);
      const txt = `CLINED Rujuk Langka ${label}${archive ? ` (${MODE_LABEL[archive]})` : ''}\n🚑 ${tiers.map(t => (t ? T[t - 1].emoji : '⬛')).join('')}\n${score} poin${best ? ' · dirujuk sampai ' + T[best - 1].name : ''}\n#RujukLangka #CLINED`;
      const ok = () => { q('rl-copied').textContent = 'Disalin ke clipboard!'; };
      const fail = () => {
        q('rl-copied').textContent = 'Salin teks ini:';
        q('rl-shareFallback').innerHTML = `<textarea class="rl-share" readonly>${esc(txt)}</textarea>`;
        const ta = q('rl-shareFallback').firstChild;
        if (ta) { ta.focus(); ta.select(); }
      };
      try { navigator.clipboard.writeText(txt).then(ok, fail); } catch { fail(); }
    }

    /* ---------- Modals & Navigation ---------- */
    let lastFocus = null;
    const openM = id => { lastFocus = document.activeElement; const el = q(id); if (!el) return; el.hidden = false; el.querySelector('[data-rl-close]')?.focus(); };
    const closeM = () => {
      const a = document.activeElement;
      if (a && a.closest && a.closest('.rl-ov')) a.blur();
      host.querySelectorAll('.rl-ov').forEach(o => { o.hidden = true; });
      if (lastFocus && lastFocus !== document.body && lastFocus.focus) try { lastFocus.focus(); } catch {}
    };
    const modalOpen = () => [...host.querySelectorAll('.rl-ov')].some(o => !o.hidden);
    host.querySelectorAll('.rl-ov').forEach(o => o.addEventListener('click', e => { if (e.target === o || e.target.closest('[data-rl-close]')) closeM(); }));

    const goDash = () => {
      if (G) { cancelAnimationFrame(G.raf); G.phase = 'off'; }
      G = null; closeM(); renderDash(); showView('rl-vDash');
    };
    const exitToMiniGames = () => {
      onLeave();
      try { window.show?.('miniGamesPage', { force: true }); window.scrollTo(0, 0); } catch {}
    };
    const startSel = () => {
      const t = todayWib(), r = S.scored?.[t];
      if (r && r.done) startRandom();
      else begin(t, false);
    };

    q('rl-howBtn').onclick = q('rl-helpBtn').onclick = () => openM('rl-howOv');
    q('rl-resBtn').onclick = () => summary(todayWib(), false);
    q('rl-archBtn').onclick = openArchive;
    q('rl-start').onclick = startSel;
    q('rl-randBtn').onclick = startRandom;
    q('rl-ext').onchange = e => { S.ext = e.target.checked; save(); };
    q('rl-home').onclick = q('rl-backBtn').onclick = goDash;
    q('rl-exit-mg').onclick = exitToMiniGames;
    q('rl-skipH').onclick = () => advance();
    q('rl-form').addEventListener('submit', e => { e.preventDefault(); submit(); });
    q('rl-passBtn').onclick = () => { pass(); q('rl-ans')?.focus(); };

    document.addEventListener('keydown', e => {
      if (!isOpen()) return;
      if (modalOpen()) { if (e.key === 'Escape') closeM(); return; }
      if (!q('rl-vPlay').hidden && G) {
        if (e.key === 'Escape') { e.preventDefault(); pass(); }
        else if (e.key === 'Enter' && G.phase === 'res') { e.preventDefault(); advance(); }
        return;
      }
      if (!q('rl-vDash').hidden && e.key === 'Enter' && !e.target.closest('button,input,label')) { e.preventDefault(); startSel(); }
    });

    function onEnter() {
      S = Progress.read();
      const page = document.getElementById('rujukLangkaPage');
      page?.classList.remove('motion-page-enter');
      try {
        document.documentElement.classList.add('rl-open');
        document.body.classList.add('quiz-context');
      } catch {}
      renderDash();
      showView('rl-vDash');
    }

    function onLeave() {
      if (G) { cancelAnimationFrame(G.raf); G.phase = 'off'; }
      G = null;
      closeM();
      try {
        document.documentElement.classList.remove('rl-open');
        document.body.classList.remove('quiz-context');
      } catch {}
    }

    renderDash();
    showView('rl-vDash');
    return { onEnter, onLeave, isPlaying: () => !!G };
  }

  let game = null;
  function open() {
    if (!game) game = createGame();
    try { window.show?.('rujukLangkaPage', { force: true }); window.scrollTo(0, 0); } catch (e) { console.warn(e); }
    game?.onEnter();
  }
  window.addEventListener('clined:view-change', e => {
    if (!game) return;
    if (e.detail === 'rujukLangkaPage') game.onEnter();
    else game.onLeave();
  });
  window.CLINED_RUJUK_LANGKA = { open, Engine, Progress, RoundGen, isPlaying: () => !!game?.isPlaying() };
})();
