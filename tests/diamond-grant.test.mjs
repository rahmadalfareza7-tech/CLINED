import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseDiamondGrantAmount,
  parseGiveDiamondAllCommand,
  cleanDiamondGrantNote,
  MAX_DIAMOND_GRANT,
  MAX_DIAMOND_NOTE,
} from '../lib/diamond-grant.mjs';

test('parseDiamondGrantAmount accepts positive integers and formatted strings within limit', () => {
  assert.equal(parseDiamondGrantAmount(500), 500);
  assert.equal(parseDiamondGrantAmount('1.000'), 1000);
  assert.equal(parseDiamondGrantAmount('25,000'), 25000);
  assert.equal(parseDiamondGrantAmount(MAX_DIAMOND_GRANT), MAX_DIAMOND_GRANT);
  assert.equal(parseDiamondGrantAmount(0), null);
  assert.equal(parseDiamondGrantAmount(-100), null);
  assert.equal(parseDiamondGrantAmount(12.5), null);
  assert.equal(parseDiamondGrantAmount(MAX_DIAMOND_GRANT + 1), null);
  assert.equal(parseDiamondGrantAmount('abc'), null);
});

test('parseGiveDiamondAllCommand parses /givediamondtoall command with optional note accurately', () => {
  assert.deepEqual(parseGiveDiamondAllCommand('/givediamondtoall 500'), { matched: true, amount: 500, note: '' });
  assert.deepEqual(parseGiveDiamondAllCommand('  /GiveDiamondToAll 1.500 '), { matched: true, amount: 1500, note: '' });
  assert.deepEqual(parseGiveDiamondAllCommand('/givediamondtoall 500 Semangat belajar UAB ya!'), { matched: true, amount: 500, note: 'Semangat belajar UAB ya!' });
  assert.deepEqual(parseGiveDiamondAllCommand('/givediamondtoall'), { matched: true, amount: null, note: '' });
  assert.deepEqual(parseGiveDiamondAllCommand('/givediamondtoall -50'), { matched: true, amount: null, note: '' });
  assert.equal(parseGiveDiamondAllCommand('givediamondtoall 500'), null);
  assert.equal(parseGiveDiamondAllCommand('hipertensi'), null);
});

test('cleanDiamondGrantNote trims, strips control chars, and enforces max length', () => {
  assert.equal(cleanDiamondGrantNote('  Halo   semua!\u0007\u202E  '), 'Halo semua!');
  assert.equal(cleanDiamondGrantNote('a'.repeat(MAX_DIAMOND_NOTE + 50)).length, MAX_DIAMOND_NOTE);
  assert.equal(cleanDiamondGrantNote(''), '');
});
