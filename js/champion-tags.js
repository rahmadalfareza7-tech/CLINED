/* CLINED — Katalog & Renderer Tag Champion per Blok (dikelola Admin). */
(() => {
  'use strict';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const LIST = [
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
  ];

  const BY_BLOCK = new Map(LIST.map(c => [c.block, c]));
  const ORDER = new Map(LIST.map((c, i) => [c.block, i]));

  function normalize(raw) {
    const arr = Array.isArray(raw) ? raw : [];
    const seen = new Set();
    for (const x of arr) {
      const k = String(x || '').trim().toUpperCase().replace(/^BLOK\s+/, '');
      if (BY_BLOCK.has(k)) seen.add(k);
    }
    return [...seen].sort((a, b) => (ORDER.get(a) ?? 99) - (ORDER.get(b) ?? 99));
  }

  function getMeta(block) {
    return BY_BLOCK.get(String(block || '').trim().toUpperCase()) || null;
  }

  function renderBadges(rawBlocks, opts = {}) {
    const keys = normalize(rawBlocks);
    if (!keys.length) return '';
    const compact = Boolean(opts.compact);
    const shortLabel = Boolean(opts.short);
    const max = Number(opts.max) > 0 ? Number(opts.max) : keys.length;
    const shown = keys.slice(0, max);
    const extra = keys.length - shown.length;
    const clsExtra = compact ? ' compact' : '';
    let html = shown.map(k => {
      const c = BY_BLOCK.get(k);
      const text = shortLabel ? `${c.short} Champ` : c.label;
      return `<em class="chat-badge b-champ champ-${esc(c.tone)}${clsExtra}" title="🏆 ${esc(c.title)}">${c.icon} ${esc(text)}</em>`;
    }).join('');
    if (extra > 0) {
      const restTitles = keys.slice(max).map(k => BY_BLOCK.get(k)?.label || k).join(', ');
      html += `<em class="chat-badge b-champ champ-more${clsExtra}" title="Tag Champion lainnya: ${esc(restTitles)}">+${extra} 🏆</em>`;
    }
    return html;
  }

  window.CLINED_CHAMPIONS = {
    LIST,
    BY_BLOCK,
    normalize,
    getMeta,
    renderBadges
  };
})();
