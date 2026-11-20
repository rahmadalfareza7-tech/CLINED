import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanCardId, cleanCardList, cleanStars, cleanDiamonds, mergeCardStates } from '../lib/cards-logic.mjs';

test('cleanCardId accepts valid lowercase card IDs and rejects invalid', () => {
  assert.equal(cleanCardId('Cor'), 'cor');
  assert.equal(cleanCardId(' pulmo_2 '), 'pulmo_2');
  assert.equal(cleanCardId('bad id!'), '');
  assert.equal(cleanCardId(''), '');
});

test('cleanCardList preserves copy counts while deduping identical (id, at) pulls', () => {
  const list = cleanCardList([
    { id: 'cor', at: 1000 },
    { id: 'cor', at: 1000 },
    { id: 'cor', at: 2000 },
    { id: 'bad!', at: 3000 }
  ]);
  assert.deepEqual(list, [
    { id: 'cor', at: 1000 },
    { id: 'cor', at: 2000 }
  ]);
});

test('cleanStars caps star levels between 1 and 5', () => {
  assert.deepEqual(cleanStars({ cor: 9, hepar: 3, pulmo: 0, 'bad!': 4 }), { cor: 5, hepar: 3 });
});

test('cleanDiamonds bounds values to non-negative integers', () => {
  assert.equal(cleanDiamonds(-5), 0);
  assert.equal(cleanDiamonds(42.9), 42);
});

test('mergeCardStates unions cards, takes max stars, and respects merge vs save diamonds', () => {
  const server = {
    diamonds: 10,
    cards: [{ id: 'cor', at: 100 }, { id: 'pulmo', at: 200 }],
    stars: { cor: 3, pulmo: 1 },
    equippedId: 'cor'
  };
  const incoming = {
    diamonds: 4,
    cards: [{ id: 'cor', at: 100 }, { id: 'cor', at: 300 }, { id: 'hepar', at: 400 }],
    stars: { cor: 2, hepar: 4 },
    equippedId: 'hepar'
  };

  const saved = mergeCardStates(server, incoming, 'save');
  assert.equal(saved.diamonds, 4);
  assert.equal(saved.cards.length, 4);
  assert.deepEqual(saved.stars, { cor: 3, pulmo: 1, hepar: 4 });
  assert.equal(saved.equippedId, 'hepar');

  const merged = mergeCardStates(server, incoming, 'merge');
  assert.equal(merged.diamonds, 10);
});

test('mergeCardStates preserves one-time free claim and cosmetic tutorial flags', () => {
  const claimed = mergeCardStates(
    { freeBannerClaimed: true, freeDecoClaimed: false, cosmeticTutorialDone: true },
    { freeBannerClaimed: false, freeDecoClaimed: true, cosmeticTutorialDone: false },
    'save'
  );
  assert.equal(claimed.freeBannerClaimed, true);
  assert.equal(claimed.freeDecoClaimed, true);
  assert.equal(claimed.cosmeticTutorialDone, true);
});
