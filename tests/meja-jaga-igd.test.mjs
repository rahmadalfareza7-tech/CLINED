import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { isValidSyncKey, mergeJsonKey } from '../lib/sync-merge.mjs';

const ROOT = new URL('..', import.meta.url);
const readRel = p => fs.readFileSync(new URL(p, ROOT), 'utf8');

function loadModule(initialStore = {}) {
  const store = { ...initialStore };
  const listeners = {};
  const win = {
    addEventListener: (ev, fn) => { (listeners[ev] ||= []).push(fn); },
    show: () => {},
    scrollTo: () => {}
  };
  const ctx = vm.createContext({
    window: win,
    document: {
      getElementById: () => null,
      addEventListener: () => {},
      documentElement: { classList: { toggle: () => {}, remove: () => {} } },
      body: { classList: { toggle: () => {}, remove: () => {} } }
    },
    localStorage: {
      getItem: k => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: k => { delete store[k]; }
    },
    Date,
    Math,
    JSON,
    Object,
    Array,
    Number,
    String,
    Set,
    Map,
    console
  });
  vm.runInContext(readRel('js/meja-jaga-igd-data.js'), ctx);
  vm.runInContext(readRel('js/meja-jaga-igd.js'), ctx);
  return {
    CLINED_IGD: ctx.window.CLINED_IGD,
    DATA: ctx.window.CLINED_IGD_DATA,
    store
  };
}

test('Progress.record tracks per-night best scores, completion, unlock, and unique solved cases', () => {
  const { CLINED_IGD, store } = loadModule();
  assert.ok(CLINED_IGD?.Progress);
  assert.equal(CLINED_IGD.Progress.KEY, 'clined_igd_v2');

  const init = CLINED_IGD.Progress.read();
  assert.equal(init.unlocked, 1);
  assert.deepEqual({ ...init.best }, {});
  assert.deepEqual({ ...init.done }, {});

  const r1 = CLINED_IGD.Progress.record({
    night: 1,
    score: 640,
    ok: 5,
    total: 6,
    alive: true,
    solvedIds: ['tn-budi-santoso', 'an-raka-pratama', 'tn-budi-santoso']
  });
  assert.equal(r1.isBest, true);
  assert.equal(r1.newlyClearedNight, true);
  assert.deepEqual([...r1.newIds], ['tn-budi-santoso', 'an-raka-pratama']);
  assert.equal(r1.p.best[1], 640);
  assert.equal(r1.p.done[1], true);
  assert.equal(r1.p.unlocked, 2);
  assert.equal(r1.p.runs, 1);

  const r2 = CLINED_IGD.Progress.record({
    night: 1,
    score: 790,
    ok: 6,
    total: 6,
    alive: true,
    solvedIds: ['tn-budi-santoso', 'ny-sari-wulandari']
  });
  assert.equal(r2.isBest, true);
  assert.equal(r2.newlyClearedNight, false);
  assert.deepEqual([...r2.newIds], ['ny-sari-wulandari']);
  assert.equal(r2.p.best[1], 790);
  assert.equal(r2.p.runs, 2);

  const r3 = CLINED_IGD.Progress.record({
    night: 6,
    score: 320,
    ok: 3,
    total: 10,
    alive: false,
    solvedIds: ['tn-darmawan']
  });
  assert.equal(r3.isBest, true);
  assert.equal(r3.newlyClearedNight, false);
  assert.equal(r3.p.best[6], 320);
  assert.equal(r3.p.done[6], undefined);
  assert.deepEqual([...r3.newIds], ['tn-darmawan']);

  store.clined_igd_v2 = '{broken';
  assert.equal(CLINED_IGD.Progress.read().unlocked, 1);
});

test('Progress.read migrates legacy standalone igd-meja-jaga-v1 data once', () => {
  const { CLINED_IGD, store } = loadModule({
    'igd-meja-jaga-v1': JSON.stringify({
      unlocked: 4,
      best: { 1: 710, 2: 650, 3: 590 },
      done: { 1: true, 2: true, 3: true }
    })
  });
  const migrated = CLINED_IGD.Progress.read();
  assert.equal(migrated.unlocked, 4);
  assert.equal(migrated.best[1], 710);
  assert.equal(migrated.done[3], true);
  assert.ok(store.clined_igd_v2, 'Expected migrated progress written to clined_igd_v2');
});

test('clined_igd_v2 is sync-eligible and merges per-night scores, unlocks, and solved cases across devices', () => {
  assert.equal(isValidSyncKey('clined_igd_v2'), true);

  const devA = JSON.stringify({
    unlocked: 3,
    best: { 1: 820, 2: 610 },
    done: { 1: true, 2: true },
    solved: { 'tn-budi-santoso': 1, 'ny-sari-wulandari': 1 },
    runs: 4,
    at: 1700000100000
  });
  const devB = JSON.stringify({
    unlocked: 5,
    best: { 1: 760, 2: 740, 4: 880, 6: 950 },
    done: { 1: true, 4: true, 6: true },
    solved: { 'ny-sari-wulandari': 1, 'tn-darmawan': 1 },
    runs: 3,
    at: 1700000200000
  });

  const merged = mergeJsonKey('clined_igd_v2', devA, devB);
  assert.ok(merged);
  const parsed = JSON.parse(merged.value);
  assert.equal(parsed.unlocked, 5);
  assert.deepEqual(parsed.best, { 1: 820, 2: 740, 4: 880, 6: 950 });
  assert.deepEqual(parsed.done, { 1: true, 2: true, 4: true, 6: true });
  assert.deepEqual(parsed.solved, {
    'tn-budi-santoso': 1,
    'ny-sari-wulandari': 1,
    'tn-darmawan': 1
  });
  assert.equal(parsed.runs, 4);
  assert.equal(merged.dirty, true);
});

test('Expanded dataset integrity: 56 unique cases, 5-minute timers, valid flaws/KTP/KIA/APPEAR/labs', () => {
  const { DATA } = loadModule();
  assert.ok(DATA);
  const { DOCS, APPEAR, WIL, FASKES, TOPICS, NIGHTS, TYPES, GAME } = DATA;

  assert.equal(DOCS.length, 56, 'Expected 56 diverse cases');

  // Every night 1..6 has 5 minutes (300s) per case
  for (let n = 1; n <= 6; n++) {
    assert.ok(NIGHTS[n], `Missing NIGHTS[${n}]`);
    assert.equal(NIGHTS[n].limit, 300, `NIGHTS[${n}].limit must be 300s (5 minutes)`);
  }

  const age = iso => {
    const [y, m, d] = iso.split('-').map(Number);
    let a = GAME.y - y;
    if (GAME.m < m || (GAME.m === m && GAME.d < d)) a--;
    return a;
  };

  const seenNames = new Set();
  for (const d of DOCS) {
    const name = d.pt.nama;
    assert.ok(!seenNames.has(name), `Duplicate patient name: ${name}`);
    seenNames.add(name);

    assert.ok(TYPES[d.type], `Invalid type ${d.type} for ${name}`);
    assert.ok(TOPICS[d.topic], `Invalid topic ${d.topic} for ${name}`);
    assert.ok(APPEAR[name], `Missing APPEAR entry for ${name}`);
    assert.ok(APPEAR[name].look && APPEAR[name].say, `Incomplete APPEAR for ${name}`);
    assert.ok(WIL[d.ktp.wil], `Unknown wil ${d.ktp.wil} for ${name}`);
    assert.ok(FASKES[d.ktp.wil], `Unknown faskes for wil ${d.ktp.wil}`);
    if (d.idx?.wil) assert.ok(WIL[d.idx.wil], `Unknown idx.wil ${d.idx.wil} for ${name}`);
    assert.ok(typeof d.why === 'string' && d.why.length >= 30, `Missing/short explanation for ${name}`);

    // Age vs KTP/KIA fields
    const effLahir = d.idx?.lahir || d.pt.lahir;
    const effAge = age(effLahir);
    assert.ok(effAge >= 0 && effAge <= 110, `Invalid age ${effAge} for ${name}`);
    if (effAge < 17) {
      assert.ok(d.ktp.kk && d.ktp.kepala, `Child KIA case ${name} must have kk & kepala`);
    } else {
      assert.ok(d.ktp.kawin && d.ktp.kerja, `Adult KTP case ${name} must have kawin & kerja`);
    }

    // Validate all flaw IDs map to actual rendered line IDs
    const lineIds = new Set(['id']);
    for (const sec of d.sections) {
      for (const l of sec.lines) lineIds.add(l.id);
    }
    const validExtraIds = new Set([
      'ktp-nama', 'ktp-ttl', 'ktp-jk', 'ktp-alamat', 'ktp-foto', 'ktp-kk', 'ktp-kepala',
      'ktp-agama', 'ktp-kawin', 'ktp-kerja', 'ktp-wn', 'ktp-berlaku',
      'gelang-nama', 'gelang-lahir',
      'lab-id',
      'jkn-no', 'jkn-nama', 'jkn-lahir', 'jkn-faskes', 'jkn-status'
    ]);
    const flaws = [].concat(d.flaw || []);
    for (const fid of flaws) {
      assert.ok(lineIds.has(fid) || validExtraIds.has(fid), `Invalid flaw id "${fid}" in ${name}`);
      if (fid === 'ktp-foto') {
        assert.ok(APPEAR[name].foto, `Case ${name} has ktp-foto flaw so APPEAR.foto must be defined`);
        assert.ok(effAge >= 5, `Case ${name} has ktp-foto flaw so patient must be >= 5 yo (has KIA/KTP photo)`);
      }
      if (fid === 'lab-id') {
        assert.ok(d.lab && d.lab.ident, `Case ${name} has lab-id flaw so d.lab.ident must be defined`);
      }
    }
    if (d.kind === 'lab' || d.needs === 'lab') {
      assert.ok(d.lab && Array.isArray(d.lab.rows) && d.lab.rows.length >= 2, `Lab case ${name} must have lab.rows`);
    }
  }
});

test('Verified drug & clinical guidelines integrity: >= 65 unique drugs with full fields and updated references', () => {
  const { DATA } = loadModule();
  const drugs = [...DATA.DRUGS_A, ...DATA.DRUGS_B];
  assert.ok(drugs.length >= 65, `Expected >= 65 verified drugs, got ${drugs.length}`);

  const names = new Set();
  for (const d of drugs) {
    assert.ok(d.n && !names.has(d.n.toLowerCase()), `Duplicate or empty drug name: ${d.n}`);
    names.add(d.n.toLowerCase());
    for (const k of ['cls', 'ind', 'd', 'a', 'kh', 'ki', 'es']) {
      assert.ok(typeof d[k] === 'string' && d[k].trim().length > 0, `Drug "${d.n}" missing field "${k}"`);
    }
  }

  // Spot-check key clinical guideline verifications
  const byName = n => drugs.find(x => x.n.toLowerCase().includes(n.toLowerCase()));
  assert.equal(drugs.length, 81, 'Expected 81 verified drugs in handbook');
  assert.match(byName('Atropin').d, /1 mg IV/i, 'Atropin adult ACLS dose should reflect 1 mg IV');
  assert.match(byName('Diazepam').a, /12 kg/i, 'Diazepam pediatric rectal cutoff should match IDAI (12 kg)');
  assert.match(byName('Magnesium sulfat').kh, /RR ≥ 16/i, 'MgSO4 monitoring should require RR >= 16/min (PNPK POGI)');
  assert.match(byName('Tramadol').a, /< 12 tahun/i, 'Tramadol should warn contraindication in children < 12 yo');
  assert.match(byName('Insulin reguler').d, /3,3/i, 'DKA insulin should require K >= 3.3 mmol/L');
  assert.match(byName('Fenitoin').d, /NaCl 0,9%/i, 'Phenytoin should specify NaCl 0.9% dilution only');
  assert.ok(byName('Amoksisilin–klavulanat') && byName('Simvastatin') && byName('Alopurinol') && byName('Kloramfenikol') && byName('Doksisiklin') && byName('Glibenklamid'));
  assert.ok(byName('Warfarin') && byName('Vitamin K1') && byName('Spironolakton') && byName('Asam traneksamat') && byName('N-asetilsistein') && byName('KCl'));
});

test('SKDI Dokter Umum case scope: no specialist-only ICU/subspecialty cases remain in DOCS', () => {
  const { DATA } = loadModule();
  const docsText = JSON.stringify(DATA.DOCS);
  // Ensure the 10 removed specialist/advanced scenarios are gone from patient cases
  assert.doesNotMatch(docsText, /V4R|Mobitz II|osmotic demyelination|INR.*6,8|syringe pump|infark ventrikel kanan|NaCl 3%|Fenitoin.*D5|spironolakton|warfarin|Ketoasidosis diabetikum/i);
  // Ensure replacement SKDI 4A/3B/3A GP cases are present
  const names = new Set(DATA.DOCS.map(d => d.pt.nama));
  for (const expected of ['Tn. Dedi Kurniawan', 'Ny. Melati Kusumaningrum', 'An. Danu Pratama', 'Ny. Ratih Permata', 'Ny. Yuliana', 'Tn. Bahrudin', 'Ny. Hasanah', 'Tn. Gunawan', 'Ny. Mawar Indah', 'Tn. Ridho Saputra']) {
    assert.ok(names.has(expected), `Expected SKDI GP case ${expected} in DOCS`);
  }
});

test('CSP & asset integrity: self-hosted Nunito/Caveat fonts exist, flat CSS with balanced braces, no external URLs', () => {
  const css = readRel('css/meja-jaga-igd.css');
  const js = readRel('js/meja-jaga-igd.js');
  const dataJs = readRel('js/meja-jaga-igd-data.js');

  assert.doesNotMatch(css, /url\(\s*['"]?https?:\/\//i, 'CSS must not load external url() (blocked by CSP)');
  assert.doesNotMatch(css, /@import\b/i, 'CSS must not use @import');
  assert.doesNotMatch(js + dataJs, /fonts\.googleapis\.com|fonts\.gstatic\.com/i);
  assert.doesNotMatch(css, /(^|\s)&[.:#\[]/, 'CSS must be flat (no nesting) for older Safari compatibility');

  let depth = 0;
  for (const ch of css) {
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    assert.ok(depth >= 0, 'Unbalanced closing brace in CSS');
  }
  assert.equal(depth, 0, 'Unclosed brace in CSS');

  const fontUrls = [...css.matchAll(/url\(\.\.\/(assets\/fonts\/igd\/[^)]+\.woff2)\)/g)].map(m => m[1]);
  assert.ok(fontUrls.length >= 2, 'Expected self-hosted woff2 fonts');
  for (const rel of new Set(fontUrls)) {
    const stat = fs.statSync(new URL(rel, ROOT));
    assert.ok(stat.size > 1000, `Font file ${rel} must be non-empty`);
  }
});

test('App wiring: view, menu, lazy SKDI bundle (data+engine), timer HUD, exit controls, BUSY_VIEWS, SW parity, and font MIME', () => {
  const appHtml = readRel('app.html');
  const lazyJs = readRel('js/lazy-loader.js');
  const swJs = readRel('sw.js');
  const updJs = readRel('js/update-notice.js');
  const serverJs = readRel('local-server.mjs');
  const syncJs = readRel('js/online-sync.js');
  const igdJs = readRel('js/meja-jaga-igd.js');

  assert.match(appHtml, /id="mejaJagaIgdPage"/);
  assert.match(appHtml, /id="mejaJagaIgdHost"/);
  assert.match(appHtml, /id="igdMenuBtn"/);
  assert.match(lazyJs, /css\/meja-jaga-igd\.css\?v=3/);
  assert.match(lazyJs, /js\/meja-jaga-igd-data\.js\?v=2/);
  assert.match(lazyJs, /js\/meja-jaga-igd\.js\?v=4/);
  assert.match(lazyJs, /id\s*=\s*'igdStudyToolBtn'/);
  assert.match(updJs, /'mejaJagaIgdPage'/);
  assert.match(syncJs, /'clined_igd_v2'/);
  assert.match(serverJs, /'\.woff2':'font\/woff2'/);
  assert.match(igdJs, /id="igd-timer"/);
  assert.match(igdJs, /data-act="exit"/);
  assert.match(igdJs, /FIT\.disable\(\)/);

  const swVer = swJs.match(/const SW_VERSION = '([^']+)'/)?.[1];
  const updVer = updJs.match(/const APP_SW_VERSION = '([^']+)'/)?.[1];
  assert.ok(swVer && updVer && swVer === updVer, `SW_VERSION (${swVer}) must match APP_SW_VERSION (${updVer})`);
});
