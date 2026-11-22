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

const ADMIN_ONLY_BANNERS = new Set(['21-creation-touch', '22-abyssal-touch']);
export const USER_EXCLUSIVE_BANNERS = {
  'luuk-helix-nameplate': new Set(['thelazyraccoon'])
};

export function normalizeBannerUsername(username) {
  return String(username || '').trim().toLowerCase().replace(/^@+/, '');
}

export function canUseBanner(id, { isAdmin = false, username = '' } = {}) {
  if (!id) return false;
  if (ADMIN_ONLY_BANNERS.has(id)) return Boolean(isAdmin);
  const allowedUsers = USER_EXCLUSIVE_BANNERS[id];
  if (allowedUsers) return allowedUsers.has(normalizeBannerUsername(username));
  return true;
}

export function exclusiveBannersForUser(username) {
  const u = normalizeBannerUsername(username);
  if (!u) return [];
  const out = [];
  for (const [id, set] of Object.entries(USER_EXCLUSIVE_BANNERS)) {
    if (set.has(u)) out.push(id);
  }
  return out;
}

export function mergeCardStates(existing, incoming, mode = 'save', opts = {}) {
  const isAdmin = Boolean(opts && opts.isAdmin);
  const username = normalizeBannerUsername(opts && opts.username);
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

  const cleanBannerId = id => {
    const s = String(id || '').trim().toLowerCase();
    return /^[a-z0-9-]{1,40}$/.test(s) ? s : '';
  };
  const allowBanner = id => canUseBanner(id, { isAdmin, username });
  const personalExclusive = exclusiveBannersForUser(username);
  const baseBanners = Array.isArray(base.ownedBanners) ? base.ownedBanners.map(cleanBannerId).filter(allowBanner) : [];
  const incBanners = Array.isArray(inc.ownedBanners) ? inc.ownedBanners.map(cleanBannerId).filter(allowBanner) : [];
  const ownedBanners = [...new Set([...personalExclusive, ...baseBanners, ...incBanners])].slice(0, 80);
  const ownedBannerSet = new Set(ownedBanners);
  const baseEqBanner = cleanBannerId(base.equippedBanner);
  const incEqBanner = inc.equippedBanner !== undefined ? cleanBannerId(inc.equippedBanner) : undefined;
  let candBanner = incEqBanner !== undefined ? incEqBanner : baseEqBanner;
  if (mode === 'merge' && baseEqBanner && allowBanner(baseEqBanner) && ownedBannerSet.has(baseEqBanner)) {
    if (!incEqBanner || (USER_EXCLUSIVE_BANNERS[baseEqBanner] && !incBanners.includes(baseEqBanner))) {
      candBanner = baseEqBanner;
    }
  }
  const equippedBanner = (candBanner && allowBanner(candBanner) && ownedBannerSet.has(candBanner)) ? candBanner : '';

  const baseDecos = Array.isArray(base.ownedDecos) ? base.ownedDecos.map(cleanBannerId).filter(Boolean) : [];
  const incDecos = Array.isArray(inc.ownedDecos) ? inc.ownedDecos.map(cleanBannerId).filter(Boolean) : [];
  const ownedDecos = [...new Set([...baseDecos, ...incDecos])].slice(0, 60);
  const ownedDecoSet = new Set(ownedDecos);
  const candDeco = inc.equippedDeco !== undefined ? cleanBannerId(inc.equippedDeco) : cleanBannerId(base.equippedDeco);
  const equippedDeco = (candDeco && ownedDecoSet.has(candDeco)) ? candDeco : '';

  const freeBannerClaimed = Boolean(base.freeBannerClaimed || inc.freeBannerClaimed);
  const freeDecoClaimed = Boolean(base.freeDecoClaimed || inc.freeDecoClaimed);
  const cosmeticTutorialDone = Boolean(base.cosmeticTutorialDone || inc.cosmeticTutorialDone);

  return {
    diamonds, cards: mergedCards, stars: mergedStars, equippedId,
    ownedBanners, equippedBanner, ownedDecos, equippedDeco,
    freeBannerClaimed, freeDecoClaimed, cosmeticTutorialDone
  };
}
