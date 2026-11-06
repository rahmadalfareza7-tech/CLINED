/* Parser bank soal pribadi: teks hasil copy-paste -> objek soal. Murni (tanpa DOM) agar mudah diuji.
   Dipakai di browser (window.CLINED_UB_PARSER) dan Node (module.exports). */
(function (root) {
  'use strict';
  const L5 = 'ABCDE';
  const OPT = /^\s*([*✓✔√]\s*)?\(?([A-Ea-e])[.)\]]\s+(.*)$/;
  const KEY = /^\s*(?:jawaban(?:\s+(?:yang\s+)?benar)?|kunci(?:\s+jawaban)?|answer|ans|key)\s*[:=\-–]?\s*(.*)$/i;
  const EXPL = /^\s*(?:pembahasan|penjelasan|explanation|rationale|alasan)(\s+(?:per\s*)?(?:opsi|pilihan|jawaban))?\s*[:\-–]\s*(.*)$/i;
  const PERLINE = /^\s*(?:[-•*]\s*)?(?:opsi\s*)?\(?([A-Ea-e])\)?\s*[.:\-–)]\s*(\S.*)$/i;
  const INLINE_EXPL = /^\s*(?:(?:→|=>|->)\s*|(?=(?:benar|salah)\b[\s.,:\-–]))(.+)$/i;
  const EXPL_OPT = /^\s*(?:pembahasan|penjelasan)\s*(?:opsi\s*)?\(?([A-Ea-e])\)?\s*[:\-–]\s*(.*)$/i;
  const NOTE = /^\s*(?:catatan\s*klinis|clinical\s*note|catatan)\s*[:\-–]\s*(.*)$/i;
  const START = /^\s*(?:soal\s*)?(?:no\.?\s*)?(\d{1,3})\s*[.)\]:]\s*(\S.*)$/i;
  const PAIR = /(?:^|[\s,;])(\d{1,3})\s*[.\-:)]?\s*([A-Ea-e])(?=$|[\s,;.)])/g;

  function clean(text) {
    return String(text ?? '')
      .replace(/\r\n?/g, '\n').replace(/[\u00a0\u2007\u202f\t]/g, ' ').replace(/[\u200b-\u200d\ufeff]/g, '')
      .replace(/：/g, ':').replace(/\*\*/g, '').replace(/__/g, '').replace(/^\s*[-•▪●]\s+(?=\S)/gm, '')
      .split('\n').map(l => l.replace(/\s+$/, '')).join('\n');
  }

  /* "A. x B. y C. z" dalam satu baris -> beberapa opsi berurutan. */
  function splitInline(rest, firstLetterIdx) {
    const re = /\s\(?([B-Eb-e])[.)\]]\s+/g, cuts = [];
    let m, expect = firstLetterIdx + 1;
    while ((m = re.exec(rest))) {
      if (m[1].toUpperCase() === L5[expect]) { cuts.push({ at: m.index, len: m[0].length }); expect++; }
    }
    if (!cuts.length) return [rest];
    const out = []; let prev = 0;
    cuts.forEach(c => { out.push(rest.slice(prev, c.at).trim()); prev = c.at + c.len; });
    out.push(rest.slice(prev).trim());
    return out;
  }

  function letterOf(value, opsi) {
    const v = String(value || '').trim().replace(/^[(\[]|[)\]]$/g, '');
    const m = v.match(/^([A-Ea-e])(?![A-Za-z])/);
    if (m) return L5.indexOf(m[1].toUpperCase());
    const t = v.toLowerCase();                       // kunci berupa teks opsi
    const i = opsi.findIndex(o => o.toLowerCase() === t);
    return i;
  }

  /* Tabel kunci di akhir teks: "Kunci: 1.B 2.C 3.A" (boleh beberapa baris). */
  function extractKeyTable(lines) {
    const map = {};
    for (let i = lines.length - 1; i >= 0; i--) {
      const ln = lines[i];
      if (!/^\s*(kunci|jawaban|answer\s*key|key)\b/i.test(ln)) continue;
      const block = [];
      for (let j = i; j < lines.length; j++) if (j === i || /^[\s\d.\-:),;A-Ea-e]+$/.test(lines[j])) block.push(j); else break;
      const joined = block.map(j => lines[j].replace(/^\s*(kunci(\s+jawaban)?|jawaban|answer\s*key|key)\s*[:=\-–]?/i, '')).join(' ');
      const pairs = [...joined.matchAll(PAIR)];
      if (pairs.length >= 2) {
        pairs.forEach(p => { map[+p[1]] = L5.indexOf(p[2].toUpperCase()); });
        block.forEach(j => { lines[j] = null; });
        break;
      }
    }
    return map;
  }

  /* Apakah dalam beberapa baris ke depan muncul opsi A sebelum nomor soal lain? */
  function lookaheadHasOptA(lines, i, stopAtBlank) {
    for (let j = i + 1; j < Math.min(lines.length, i + 9); j++) {
      const l = lines[j]; if (l == null) continue;
      if (!l.trim()) { if (stopAtBlank) return false; continue; }
      const m = l.match(OPT);
      if (m && m[2].toUpperCase() === 'A') return true;
      if (START.test(l) && !m) return false;
    }
    return false;
  }

  function parseQuestions(text) {
    const lines = clean(text).split('\n');
    const keyTable = extractKeyTable(lines);
    const items = []; let cur = null, mode = 'none', lastNum = 0, ignored = 0, perIdx = -1;

    const open = (num, first) => {
      cur = { num: num || null, soal: first || '', opsi: [], key: null, pembahasan: '', catatan: '', per: [], inl: [], markedKey: null };
      items.push(cur); mode = 'stem'; perIdx = -1;
      if (num) lastNum = num;
    };
    const addOpt = (letterIdx, txt, marked) => {
      cur.opsi.push(txt.trim());
      if (marked && cur.markedKey == null) cur.markedKey = cur.opsi.length - 1;
      mode = 'opts';
    };
    const feedOption = (m, raw) => {
      const idx = L5.indexOf(m[2].toUpperCase());
      const parts = splitInline(m[3], idx);
      parts.forEach((p, k) => {
        const am = p.match(/^(.*?)\s+(?:→|=>|->)\s*((?:benar|salah)\b.*)$/i);        // "A. teks → Benar, karena ..."
        addOpt(idx + k, am ? am[1] : p, k === 0 && !!m[1]);
        if (am) { cur.per[cur.opsi.length - 1] = am[2]; cur.inl.push(cur.opsi.length - 1); }
      });
    };
    const trailMark = () => {                       // "C. teks *"  atau  "(benar)"
      if (!cur) return; const o = cur.opsi.length - 1; if (o < 0) return;
      const t = cur.opsi[o], mm = t.match(/^(.*?)\s*(?:\*|✓|✔|√|\((?:benar|kunci)\))\s*$/i);
      if (mm && mm[1]) { cur.opsi[o] = mm[1].trim(); if (cur.markedKey == null) cur.markedKey = o; }
    };

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i]; if (line == null) continue;
      if (!line.trim()) { if (mode === 'expl' && cur) cur.pembahasan += '\n'; else if (mode === 'stem' && cur && cur.soal) cur.soal += '\n'; continue; }

      // "Jawaban: C. Pembahasan: ..." dalam satu baris
      const km = line.match(KEY);
      if (km && cur && /pembahasan\s*[:\-–]/i.test(km[1])) {
        const cut = km[1].search(/pembahasan\s*[:\-–]/i);
        lines.splice(i, 1, line.slice(0, line.length - km[1].length) + km[1].slice(0, cut), km[1].slice(cut));
        line = lines[i];
      }

      const mOpt = line.match(OPT);
      const mStart = line.match(START);
      const mKey = line.match(KEY);
      const mEO = line.match(EXPL_OPT);
      const mEx = line.match(EXPL);
      const mNote = line.match(NOTE);

      if (mKey && cur && cur.opsi.length >= 1 && mKey[1].trim() && (letterOf(mKey[1], cur.opsi) >= 0 || /^[(\[]?[A-Ea-e]/.test(mKey[1]))) {
        const v = letterOf(mKey[1], cur.opsi); cur.key = v >= 0 ? v : null; mode = 'afterKey'; continue;
      }
      if (cur && mEO) { perIdx = L5.indexOf(mEO[1].toUpperCase()); cur.per[perIdx] = mEO[2]; mode = 'per'; continue; }
      // pembahasan tepat di bawah sebuah opsi (sebelum opsi berikutnya / kunci)
      if (cur && (mode === 'opts' || mode === 'inl') && cur.opsi.length >= 1 && !mOpt) {
        const mi = mEx ? { 1: mEx[2] } : line.match(INLINE_EXPL);
        if (mi && !(mEx && mEx[1])) {
          perIdx = cur.opsi.length - 1; cur.per[perIdx] = (mi[1] || '').trim(); if (!cur.inl.includes(perIdx)) cur.inl.push(perIdx); mode = 'inl'; continue;
        }
      }
      if (cur && mEx) {
        if (mEx[1] && !mEx[2].trim()) { mode = 'per'; perIdx = -1; continue; }          // "Pembahasan per opsi:" lalu A./B./C. di bawahnya
        cur.pembahasan = mEx[2]; mode = 'expl'; continue;
      }
      if (cur && mNote) { cur.catatan = mNote[1]; mode = 'note'; continue; }
      if (cur && cur.opsi.length >= 2 && ['afterKey', 'expl', 'note', 'per'].includes(mode) && !mStart) {
        const mp = line.match(PERLINE);                                                   // "A. Benar karena ..." sesudah kunci/pembahasan
        const k = mp ? L5.indexOf(mp[1].toUpperCase()) : -1;
        if (mp && k >= 0 && k < cur.opsi.length) { perIdx = k; cur.per[k] = mp[2]; mode = 'per'; continue; }
      }

      if (mStart && !(mOpt && cur && mode === 'opts' && L5.indexOf(mOpt[2].toUpperCase()) === cur.opsi.length)) {
        const num = +mStart[1];
        const finished = !cur || cur.opsi.length >= 2 || mode === 'inl' || mode === 'afterKey' || mode === 'expl' || mode === 'note' || mode === 'per';
        if (finished && lookaheadHasOptA(lines, i)) { trailMark(); open(num, mStart[2]); continue; }
      }

      if (mOpt) {
        const idx = L5.indexOf(mOpt[2].toUpperCase());
        if (!cur) { ignored++; continue; }
        if (idx === cur.opsi.length && cur.opsi.length < 5 && ['stem', 'opts', 'inl'].includes(mode) || (idx === 0 && !cur.opsi.length)) { feedOption(mOpt, line); trailMark(); continue; }
        if (idx === 0 && cur.opsi.length >= 2 && ['afterKey', 'expl', 'note', 'per'].includes(mode)) { open(null, ''); feedOption(mOpt, line); continue; }  // soal tanpa nomor
      }

      // teks biasa
      if (!cur) { open(null, line.trim()); continue; }
      if (['afterKey', 'expl', 'note', 'per'].includes(mode) && cur.opsi.length >= 2 && lookaheadHasOptA(lines, i, true)) {
        trailMark(); open(null, line.trim()); continue;                       // soal berikutnya tanpa nomor
      }
      if (mode === 'afterKey') { cur.pembahasan += (cur.pembahasan ? '\n' : '') + line.trim(); mode = 'expl'; continue; }
      if (mode === 'stem') cur.soal += (cur.soal && !cur.soal.endsWith('\n') ? '\n' : '') + line.trim();
      else if (mode === 'opts') cur.opsi[cur.opsi.length - 1] += ' ' + line.trim();
      else if (mode === 'expl') cur.pembahasan += (cur.pembahasan && !cur.pembahasan.endsWith('\n') ? ' ' : '') + line.trim();
      else if (mode === 'note') cur.catatan += ' ' + line.trim();
      else if (mode === 'per' || mode === 'inl') { if (perIdx >= 0) cur.per[perIdx] = ((cur.per[perIdx] || '') + ' ' + line.trim()).trim(); }
    }

    const out = [];
    items.forEach(it => {
      if (it.opsi.length === 0 && it.key == null) { ignored++; return; }       // judul/teks nyasar
      trailMarkFix(it);
      if (it.inl.length === 1 && it.inl[0] === it.opsi.length - 1 && !it.pembahasan) {   // hanya satu & di opsi terakhir: itu pembahasan umum
        it.pembahasan = it.per[it.inl[0]] || ''; it.per[it.inl[0]] = '';
      }
      const key = it.key != null ? it.key : (it.markedKey != null ? it.markedKey : (it.num != null && keyTable[it.num] != null ? keyTable[it.num] : null));
      out.push(finalize({
        soal: it.soal.replace(/\n{2,}/g, '\n').trim(), opsi: it.opsi.slice(0, 5), jawabanBenar: key,
        pembahasan: it.pembahasan.replace(/\n{3,}/g, '\n\n').trim(), catatanKlinis: it.catatan.trim(),
        pembahasanPilihan: it.opsi.slice(0, 5).map((_, k) => (it.per[k] || '').trim()), _num: it.num
      }));
    });
    return { items: out, ignored };
    function trailMarkFix(it) { it.opsi = it.opsi.map(o => o.replace(/\s+/g, ' ').trim()); }
  }

  /* Validasi + normalisasi satu soal. errors = harus diperbaiki, warnings = boleh disimpan. */
  function finalize(q) {
    const errors = [], warnings = [];
    q.opsi = (q.opsi || []).map(o => String(o ?? '').trim()).filter((o, i, a) => o || i < a.length);
    if (!q.soal || !String(q.soal).trim()) errors.push('Teks soal kosong');
    const n = q.opsi.filter(Boolean).length;
    if (n < 2) errors.push('Minimal 2 opsi');
    if (q.opsi.some(o => !o)) errors.push('Ada opsi yang kosong');
    if (q.jawabanBenar == null || !Number.isInteger(q.jawabanBenar)) errors.push('Kunci jawaban belum ada');
    else if (q.jawabanBenar < 0 || q.jawabanBenar >= q.opsi.length) errors.push('Kunci di luar pilihan opsi');
    if (!String(q.pembahasan || '').trim() && !(q.pembahasanPilihan || []).some(x => String(x || '').trim())) warnings.push('Belum ada pembahasan');
    const lower = q.opsi.map(o => o.toLowerCase());
    if (new Set(lower).size !== lower.length) warnings.push('Ada opsi yang kembar');
    q.errors = errors; q.warnings = warnings; q.valid = errors.length === 0;
    return q;
  }

  /* Objek soal dari JSON impor (format CLINED atau mirip). */
  function normalizeImported(raw) {
    const list = Array.isArray(raw) ? raw : Array.isArray(raw?.questions) ? raw.questions : Array.isArray(raw?.data) ? raw.data : Array.isArray(raw?.soal_list) ? raw.soal_list : [];
    return list.map(r => {
      const opsiRaw = Array.isArray(r.opsi) ? r.opsi : Array.isArray(r.options) ? r.options : [];
      const opsi = opsiRaw.slice(0, 5).map(o => String(o ?? '').replace(/^\s*[A-Ea-e][.)]\s+/, '').trim());
      let k = r.jawabanBenar ?? r.jawaban ?? r.kunci ?? r.answer ?? null;
      if (typeof k === 'string') k = /^[A-Ea-e]$/.test(k.trim()) ? L5.indexOf(k.trim().toUpperCase()) : (Number.isFinite(+k) ? +k : letterOf(k, opsi));
      const per = Array.isArray(r.pembahasanPilihan) ? r.pembahasanPilihan.slice(0, 5).map(x => String(x ?? '').trim()) : opsi.map(() => '');
      return finalize({ soal: String(r.soal ?? r.question ?? '').trim(), opsi, jawabanBenar: Number.isInteger(k) ? k : null,
        pembahasan: String(r.pembahasan ?? r.explanation ?? '').trim(), catatanKlinis: String(r.catatanKlinis ?? '').trim(), pembahasanPilihan: per });
    });
  }

  const api = { parseQuestions, finalize, normalizeImported, clean };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.CLINED_UB_PARSER = api;
})(typeof window !== 'undefined' ? window : globalThis);
