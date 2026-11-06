/* Pencocok istilah glosarium di dalam teks (murni; dipakai klien dan dites di Node). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(); else root.ClinedGlossaryMatch = factory();
})(globalThis, function () {
  'use strict';
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const norm = s => String(s).normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();

  /** terms: [{id, term, aliases[]}] → matcher { re, map } (frasa terpanjang diutamakan). */
  function build(terms) {
    const map = new Map();
    for (const t of terms || []) for (const name of [t.term, ...(t.aliases || [])]) { const k = norm(name); if (k.length >= 3 && !map.has(k)) map.set(k, t.id); }
    const keys = [...map.keys()].sort((a, b) => b.length - a.length);
    if (!keys.length) return { re: null, map };
    const re = new RegExp('(?<![\\p{L}\\p{N}])(' + keys.map(k => esc(k).replace(/ /g, '\\s+')).join('|') + ')(?![\\p{L}\\p{N}])', 'giu');
    return { re, map };
  }
  /** → [{start, end, id}] — tiap istilah hanya pada kemunculan pertama, maksimal `max`. */
  function find(text, matcher, max = 12) {
    if (!matcher || !matcher.re) return [];
    const out = [], seen = new Set(); matcher.re.lastIndex = 0; let m;
    while ((m = matcher.re.exec(text)) && out.length < max) {
      const id = matcher.map.get(norm(m[0])); if (id == null || seen.has(id)) continue;
      seen.add(id); out.push({ start: m.index, end: m.index + m[0].length, id });
    }
    return out;
  }
  return { build, find, norm };
});
