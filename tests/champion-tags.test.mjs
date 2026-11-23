import test from 'node:test';
import assert from 'node:assert/strict';
import { CHAMPION_BLOCKS, CHAMPION_BY_BLOCK, canonicalChampionBlock, cleanChampionBlocks, championTagsOf } from '../lib/champion-tags.mjs';

test('CHAMPION_BLOCKS berisi seluruh 20 blok resmi CLINED dengan ikon, label, short, title, dan tone unik', () => {
  assert.equal(CHAMPION_BLOCKS.length, 20);
  const blocks = new Set(CHAMPION_BLOCKS.map(c => c.block));
  assert.equal(blocks.size, 20);
  for (const c of CHAMPION_BLOCKS) {
    assert.ok(c.block && c.icon && c.label && c.short && c.title && c.tone);
    assert.ok(CHAMPION_BY_BLOCK.get(c.block) === c);
  }
});

test('canonicalChampionBlock dan cleanChampionBlocks menormalkan alias, dedup, buang input liar, dan urut sesuai katalog', () => {
  assert.equal(canonicalChampionBlock('blok kardiologi'), 'KARDIOLOGI');
  assert.equal(canonicalChampionBlock('block:ssp'), 'SSP');
  assert.equal(canonicalChampionBlock('pancaindra'), 'PANCA INDRA');
  assert.equal(canonicalChampionBlock('endocrine'), 'ENDOKRINE');
  assert.equal(canonicalChampionBlock('blok_tidak_ada'), '');

  const cleaned = cleanChampionBlocks(['MULSIS', 'blok kardio', 'BM1', 'KARDIOLOGI', 'invalid', 'pancaindra']);
  assert.deepEqual(cleaned, ['BM1', 'KARDIOLOGI', 'PANCA INDRA', 'MULSIS']);
  assert.deepEqual(cleanChampionBlocks(null), []);
});

test('championTagsOf mengembalikan metadata tag lengkap dari objek user maupun array blok', () => {
  const tags = championTagsOf({ champion_blocks: ['SSP', 'KEDKEL'] });
  assert.equal(tags.length, 2);
  assert.equal(tags[0].label, 'SSP Champion');
  assert.equal(tags[1].label, 'Kedkel Champion');
});
