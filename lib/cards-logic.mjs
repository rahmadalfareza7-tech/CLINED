export const MAX_CARD_STAR = 5;

export function cleanCardId(id) {
  const s = String(id || '').trim().toLowerCase();
  return /^[a-z0-9_-]{1,40}$/.test(s) ? s : '';
}

export function cleanCardList(list) {
  const map = new Map();
  if (!Array.isArray(list)) return [];
  for (const item of list) {
    const id = cleanCardId(typeof item === 'string' ? item : item?.id);
    if (!id) continue;
    const atNum = Number(item?.at);
    const at = Number.isFinite(atNum) && atNum > 0 ? Math.floor(atNum) : 1;
    const key = `${id}:${at}`;
    if (!map.has(key)) map.set(key, { id, at });
  }
  return [...map.values()].sort((a, b) => a.at - b.at).slice(0, 500);
}

export function cleanStars(stars) {
  const out = {};
  if (!stars || typeof stars !== 'object' || Array.isArray(stars)) return out;
  for (const [rawId, rawVal] of Object.entries(stars)) {
    const id = cleanCardId(rawId);
    const val = Math.floor(Number(rawVal) || 0);
    if (id && val >= 1) out[id] = Math.min(MAX_CARD_STAR, val);
  }
  return out;
}

export function cleanDiamonds(val) {
  const n = Math.floor(Number(val) || 0);
  return Math.max(0, Math.min(1_000_000, n));
}

export function mergeCardStates(existing, incoming, mode = 'save') {
  const base = existing || { diamonds: 0, cards: [], stars: {}, equippedId: '' };
  const inc = incoming || {};
  const baseCards = cleanCardList(base.cards);
  const incCards = cleanCardList(inc.cards);
  const mergedCards = cleanCardList([...baseCards, ...incCards]);
  const ownedIds = new Set(mergedCards.map(c => c.id));

  const baseStars = cleanStars(base.stars);
  const incStars = cleanStars(inc.stars);
  const mergedStars = {};
  for (const id of new Set([...Object.keys(baseStars), ...Object.keys(incStars), ...ownedIds])) {
    const val = Math.max(baseStars[id] || 0, incStars[id] || 0, ownedIds.has(id) ? 1 : 0);
    if (val >= 1) mergedStars[id] = Math.min(MAX_CARD_STAR, val);
  }

  const baseDia = cleanDiamonds(base.diamonds);
  const incDia = inc.diamonds !== undefined ? cleanDiamonds(inc.diamonds) : baseDia;
  const diamonds = mode === 'merge' ? Math.max(baseDia, incDia) : incDia;

  const candEquip = cleanCardId(inc.equippedId !== undefined ? inc.equippedId : base.equippedId);
  const fallbackEquip = mergedCards[0]?.id || '';
  const equippedId = (candEquip && ownedIds.has(candEquip))
    ? candEquip
    : ((base.equippedId && ownedIds.has(base.equippedId)) ? base.equippedId : fallbackEquip);

  return { diamonds, cards: mergedCards, stars: mergedStars, equippedId };
}
