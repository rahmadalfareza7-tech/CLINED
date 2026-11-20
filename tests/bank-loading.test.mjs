import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('STATIC_BANK_META di js/app.js sinkron lengkap dengan seluruh 24 bank di seed-data/manifest.json', () => {
  const manifest = JSON.parse(fs.readFileSync(new URL('../seed-data/manifest.json', import.meta.url), 'utf8'));
  const appSrc = fs.readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  const m = appSrc.match(/const STATIC_BANK_META=(\[[\s\S]*?\]);/);
  assert.ok(m, 'STATIC_BANK_META harus ada di js/app.js');
  const staticMeta = JSON.parse(m[1]);
  assert.equal(staticMeta.length, manifest.banks.length, 'Jumlah bank STATIC_BANK_META harus sama dengan manifest.json');
  const byId = new Map(staticMeta.map(b => [b.id, b]));
  for (const bank of manifest.banks) {
    const entry = byId.get(bank.id);
    assert.ok(entry, `Bank ${bank.id} harus ada di STATIC_BANK_META`);
    assert.equal(Number(entry.count), Number(bank.count), `Count bank ${bank.id} harus cocok`);
  }
});

test('question-bank-engine tidak menghapus count/staticUrl bank statis dan menjaga count/block paket server-uab', () => {
  const engineSrc = fs.readFileSync(new URL('../js/question-bank-engine.js', import.meta.url), 'utf8');
  const BANKS = {
    'kedkel-2026-tryout-1': {
      name: 'TRY OUT 1 KEDKEL',
      count: 100,
      block: 'KEDKEL',
      data: [],
      loaded: false,
      version: 2,
      staticUrl: '/seed-data/banks/kedkel-2026-tryout-1.json',
      staticVersion: 2,
      serverVersion: 0,
      source: 'static'
    }
  };
  const context = {
    BANKS,
    window: {},
    document: {},
    location: { href: 'https://clined.id/app.html' },
    CustomEvent: function CustomEvent(type, init) { this.type = type; this.detail = init?.detail; },
    console
  };
  context.window = context;
  context.window.dispatchEvent = () => {};
  vm.runInNewContext(engineSrc, context);

  assert.equal(BANKS['kedkel-2026-tryout-1'].count, 100);
  assert.equal(BANKS['kedkel-2026-tryout-1'].staticUrl, '/seed-data/banks/kedkel-2026-tryout-1.json');
  assert.equal(BANKS['kedkel-2026-tryout-1'].loaded, false);
  assert.equal(context.CLINED_BANK_ENGINE.banks['kedkel-2026-tryout-1'].block, 'KEDKEL');

  context.CLINED_BANK_ENGINE.registerBank({
    id: 'server-uab-123',
    name: 'UAB Import Test',
    block: 'GINJAL',
    version: 1,
    data: [{ id: 'q1', soal: 'Pertanyaan 1?', opsi: ['A', 'B'], jawabanBenar: 0 }]
  }, { persist: false, source: 'server-admin' });

  assert.equal(BANKS['server-uab-123'].count, 1);
  assert.equal(BANKS['server-uab-123'].loaded, true);
  assert.equal(BANKS['server-uab-123'].block, 'GINJAL');
  assert.equal(context.CLINED_BANK_ENGINE.banks['server-uab-123'].block, 'GINJAL');
});
