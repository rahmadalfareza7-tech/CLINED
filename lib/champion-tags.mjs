// Katalog & logika murni Tag Champion per Blok (dikelola Admin).
// Setiap blok memiliki identitas ikon, gelar, dan tema warna tersendiri.

export const CHAMPION_BLOCKS = Object.freeze([
  { block: 'BM1',             icon: '🧬', label: 'BM1 Champion',         short: 'BM1',         title: 'Juara Blok BM1',             tone: 'emerald' },
  { block: 'BM2',             icon: '🔬', label: 'BM2 Champion',         short: 'BM2',         title: 'Juara Blok BM2',             tone: 'indigo'  },
  { block: 'HNC',             icon: '🗣️', label: 'HNC Champion',         short: 'HNC',         title: 'Juara Blok HNC',             tone: 'sky'     },
  { block: 'MP1',             icon: '🧫', label: 'MP1 Champion',         short: 'MP1',         title: 'Juara Blok MP1',             tone: 'lime'    },
  { block: 'MP2',             icon: '🦠', label: 'MP2 Champion',         short: 'MP2',         title: 'Juara Blok MP2',             tone: 'teal'    },
  { block: 'MPT',             icon: '💊', label: 'MPT Champion',         short: 'MPT',         title: 'Juara Blok MPT',             tone: 'amber'   },
  { block: 'MUSKULOSKELETAL', icon: '🦴', label: 'Muskulo Champion',     short: 'Muskulo',     title: 'Juara Blok Muskuloskeletal', tone: 'slate'   },
  { block: 'RESPIRATORY',     icon: '🫁', label: 'Respi Champion',       short: 'Respi',       title: 'Juara Blok Respiratory',     tone: 'cyan'    },
  { block: 'KARDIOLOGI',      icon: '❤️‍🔥', label: 'Kardio Champion',      short: 'Kardio',      title: 'Juara Blok Kardiologi',      tone: 'crimson' },
  { block: 'HEMATOLOGI',      icon: '🩸', label: 'Hemato Champion',      short: 'Hemato',      title: 'Juara Blok Hematologi',      tone: 'ruby'    },
  { block: 'GIT',             icon: '🩺', label: 'GIT Champion',         short: 'GIT',         title: 'Juara Blok GIT',             tone: 'jade'    },
  { block: 'FORENSIK',        icon: '⚖️', label: 'Forensik Champion',    short: 'Forensik',    title: 'Juara Blok Forensik',        tone: 'bronze'  },
  { block: 'GINJAL',          icon: '💧', label: 'Ginjal Champion',      short: 'Ginjal',      title: 'Juara Blok Ginjal',          tone: 'cobalt'  },
  { block: 'ENDOKRINE',       icon: '⚡', label: 'Endokrin Champion',    short: 'Endokrin',    title: 'Juara Blok Endokrine',       tone: 'sun'     },
  { block: 'REPRODUKSI',      icon: '🌸', label: 'Repro Champion',       short: 'Repro',       title: 'Juara Blok Reproduksi',      tone: 'rose'    },
  { block: 'SSP',             icon: '🧠', label: 'SSP Champion',         short: 'SSP',         title: 'Juara Blok SSP',             tone: 'violet'  },
  { block: 'PANCA INDRA',     icon: '👁️', label: 'Panca Indra Champion', short: 'Panca Indra', title: 'Juara Blok Panca Indra',     tone: 'aqua'    },
  { block: 'KEDKOM',          icon: '🌍', label: 'Kedkom Champion',      short: 'Kedkom',      title: 'Juara Blok Kedkom',          tone: 'forest'  },
  { block: 'KEDKEL',          icon: '🏡', label: 'Kedkel Champion',      short: 'Kedkel',      title: 'Juara Blok Kedkel',          tone: 'warm'    },
  { block: 'MULSIS',          icon: '👑', label: 'Mulsis Champion',      short: 'Mulsis',      title: 'Juara Blok Mulsis',          tone: 'gold'    }
]);

const ALIASES = {
  'PANCAINDRA': 'PANCA INDRA',
  'PANCA_INDRA': 'PANCA INDRA',
  'ENDOCRINE': 'ENDOKRINE',
  'ENDOKRIN': 'ENDOKRINE',
  'KARDIO': 'KARDIOLOGI',
  'HEMATO': 'HEMATOLOGI',
  'RESPI': 'RESPIRATORY',
  'RESPIRASI': 'RESPIRATORY',
  'MUSKULO': 'MUSKULOSKELETAL',
  'REPRO': 'REPRODUKSI'
};

export const CHAMPION_BY_BLOCK = new Map(CHAMPION_BLOCKS.map(c => [c.block, c]));
const ORDER_INDEX = new Map(CHAMPION_BLOCKS.map((c, i) => [c.block, i]));

export function canonicalChampionBlock(raw) {
  let s = String(raw || '').trim().toUpperCase().replace(/^BLOCK:/, '').replace(/^BLOK\s+/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!s) return '';
  if (ALIASES[s]) s = ALIASES[s];
  return CHAMPION_BY_BLOCK.has(s) ? s : '';
}

export function cleanChampionBlocks(raw) {
  const arr = Array.isArray(raw) ? raw : [];
  const seen = new Set();
  for (const item of arr) {
    const k = canonicalChampionBlock(item);
    if (k) seen.add(k);
  }
  return [...seen].sort((a, b) => (ORDER_INDEX.get(a) ?? 99) - (ORDER_INDEX.get(b) ?? 99));
}

export function championTagsOf(u) {
  const raw = Array.isArray(u) ? u : (u?.champion_blocks ?? u?.championBlocks ?? []);
  return cleanChampionBlocks(raw).map(k => CHAMPION_BY_BLOCK.get(k)).filter(Boolean);
}

let colReady = false;
export async function ensureChampionColumn(q) {
  if (colReady) return;
  await q.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS champion_blocks TEXT[] NOT NULL DEFAULT ARRAY[]::text[]`);
  colReady = true;
}
