// Validasi entri glosarium (murni, mudah diuji).
export const MAX_IMPORT = 500;
const strip = s => String(s ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, '');
export const termKey = t => strip(t).normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();

export function cleanTerm(input = {}) {
  const term = strip(input.term).replace(/\s+/g, ' ').trim().slice(0, 80);
  const definition = strip(input.definition).replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, 1500);
  const source = strip(input.source).replace(/\s+/g, ' ').trim().slice(0, 160);
  const rawAliases = Array.isArray(input.aliases) ? input.aliases : String(input.aliases ?? '').split(/[;,\n]/);
  const key = termKey(term);
  const aliases = [...new Set(rawAliases.map(a => strip(a).replace(/\s+/g, ' ').trim().slice(0, 80)).filter(a => a && termKey(a) !== key))].slice(0, 8);
  if (term.length < 2) return { error: 'Istilah terlalu pendek.' };
  if (definition.length < 10) return { error: 'Definisi terlalu pendek atau kosong.' };
  return { value: { term, termKey: key, aliases, definition, source, verified: !!input.verified } };
}

/** Parse CSV sederhana (koma, kutip ganda) → array objek {term, aliases, definition, source}. */
export function parseCsv(text) {
  const rows = []; let cur = [], f = '', q = false;
  const s = String(text ?? '').replace(/^\uFEFF/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === '"') { if (s[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { cur.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && s[i + 1] === '\n') i++; cur.push(f); f = ''; if (cur.some(x => x.trim())) rows.push(cur); cur = []; }
    else f += c;
  }
  cur.push(f); if (cur.some(x => x.trim())) rows.push(cur);
  if (!rows.length) return [];
  const head = rows[0].map(h => h.trim().toLowerCase());
  const idx = n => head.findIndex(h => n.includes(h));
  const iT = idx(['term', 'istilah']), iD = idx(['definition', 'definisi']), iA = idx(['aliases', 'alias', 'sinonim']), iS = idx(['source', 'sumber']);
  if (iT < 0 || iD < 0) return [];
  return rows.slice(1).map(r => ({ term: r[iT], definition: r[iD], aliases: iA >= 0 ? r[iA] : '', source: iS >= 0 ? r[iS] : '' }));
}
