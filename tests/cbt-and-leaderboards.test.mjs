import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { summarizeIgdProgress, summarizeRujukLangkaProgress } from '../lib/minigames-summary.mjs';
import { isValidSyncKey, mergeJsonKey } from '../lib/sync-merge.mjs';
import { buildBundles, extractAppAssets, minifyCss } from '../tools/build-bundles.mjs';

const ROOT = new URL('..', import.meta.url);
const readRel = p => fs.readFileSync(new URL(p, ROOT), 'utf8');

function loadCbtModule(initialStore = {}) {
  const store = { ...initialStore };
  const win = {
    addEventListener: () => {},
    show: () => {},
    scrollTo: () => {},
    BANKS: {}
  };
  const ctx = vm.createContext({
    window: win,
    document: { getElementById: () => null, addEventListener: () => {} },
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
    Boolean,
    console
  });
  vm.runInContext(readRel('js/cbt-tryout.js'), ctx);
  return { CBT: ctx.window.CLINED_CBT_TRYOUT, store };
}

test('summarizeIgdProgress aggregates nights 1-6 monotonically and clamps malformed values', () => {
  assert.equal(summarizeIgdProgress(null), null);
  assert.equal(summarizeIgdProgress('not-json'), null);

  const s = summarizeIgdProgress({
    unlocked: 5,
    best: { 1: 620, 2: 810, 3: 940, 6: 1200, 99: 999999, bad: -50 },
    done: { 1: true, 2: true, 3: true, 6: false },
    solved: { c1: 1, c2: 1, c3: 1, c4: 0 },
    runs: 7
  });
  assert.deepEqual(s, {
    totalBest: 3570,
    bestNightScore: 1200,
    nightsDone: 3,
    solvedCases: 3,
    runsPlayed: 7
  });

  const clamped = summarizeIgdProgress({ best: { 1: 9_999_999 }, runs: -10 });
  assert.equal(clamped.bestNightScore, 250_000);
  assert.equal(clamped.totalBest, 250_000);
  assert.equal(clamped.runsPlayed, 0);
});

test('summarizeRujukLangkaProgress aggregates scored & archive buckets without counting practice mode', () => {
  assert.equal(summarizeRujukLangkaProgress(null), null);

  const s = summarizeRujukLangkaProgress({
    scored: {
      '2026-04-01': { score: 850, done: true },
      '2026-04-02': { total: 1020, done: true }
    },
    archive: {
      '2026-03-29': { score: 740, done: true }
    },
    practice: {
      'rnd-1': { score: 9999, done: true }
    }
  });
  assert.deepEqual(s, {
    bestScore: 1020,
    totalScore: 2610,
    roundsDone: 3
  });
});

test('clined_cbt_tryout_v1 CRDT merges runs by id across devices and keeps highest bestPct', () => {
  assert.equal(isValidSyncKey('clined_cbt_tryout_v1'), true);
  const localRaw = JSON.stringify({
    bestPct: 72,
    updatedAt: 2000,
    runs: [
      { id: 'r1', at: 1000, pct: 60 },
      { id: 'r2', at: 2000, pct: 72 }
    ]
  });
  const serverRaw = JSON.stringify({
    bestPct: 84,
    updatedAt: 1500,
    runs: [
      { id: 'r1', at: 1000, pct: 60 },
      { id: 'r3', at: 1500, pct: 84 }
    ]
  });
  const res = mergeJsonKey('clined_cbt_tryout_v1', localRaw, serverRaw);
  assert.ok(res);
  assert.equal(res.dirty, true);
  const merged = JSON.parse(res.value);
  assert.equal(merged.bestPct, 84);
  assert.equal(merged.updatedAt, 2000);
  assert.deepEqual(merged.runs.map(r => r.id), ['r2', 'r3', 'r1']);
});

test('CLINED_CBT_TRYOUT.buildExam & gradeExam enforce strict scoring, 66% pass bar, and weakest-first organ report', () => {
  const { CBT } = loadCbtModule();
  assert.ok(CBT);
  assert.equal(CBT.PASSING_PCT, 66);

  const pool = [
    { id: 'q1', block: 'KARDIOLOGI', soal: 'STEMI anterior?', opsi: ['V1-V4', 'II,III,aVF'], jawabanBenar: 0, pembahasan: 'LAD' },
    { id: 'q2', block: 'KARDIOLOGI', soal: 'Terapi awal?', opsi: ['Aspirin', 'Vitamin C'], jawabanBenar: 0, pembahasan: 'Antiplatelet' },
    { id: 'q3', block: 'GINJAL', soal: 'Sindrom nefrotik?', opsi: ['Proteinuria masif', 'Hematuria'], jawabanBenar: 0, pembahasan: '>3.5g/hari' },
    { id: 'q4', block: 'GINJAL', soal: 'Kreatinin meningkat pada?', opsi: ['AKI', 'Flu biasa'], jawabanBenar: 0, pembahasan: 'GFR turun' },
    { id: 'q5', block: 'ENDOKRINE', soal: 'KAD terapi utama?', opsi: ['Rehidrasi + Insulin', 'Oral saja'], jawabanBenar: 0, pembahasan: 'NaCl 0.9%' }
  ];

  const exam = CBT.buildExam(pool, 5, { minutes: 10, scope: 'ALL', title: 'Test CBT' });
  assert.equal(exam.total, 5);
  assert.equal(exam.durationSec, 600);

  // Answer: KARDIOLOGI 2/2 (100%), ENDOKRINE 1/1 (100%), GINJAL 0/2 (0%: 1 wrong, 1 blank)
  const answers = {};
  const flags = {};
  exam.questions.forEach((q, idx) => {
    if (q.block === 'KARDIOLOGI' || q.block === 'ENDOKRINE') {
      answers[idx] = q.jawabanBenar;
    } else if (q.id === 'q3') {
      answers[idx] = 1; // wrong
      flags[idx] = true;
    }
    // q4 left blank
  });

  const report = CBT.gradeExam(exam, answers, flags, 125);
  assert.equal(report.correct, 3);
  assert.equal(report.wrong, 1);
  assert.equal(report.blank, 1);
  assert.equal(report.flaggedCount, 1);
  assert.equal(report.pct, 60);
  assert.equal(report.passed, false);
  assert.equal(report.weakestBlock, 'GINJAL');
  assert.equal(report.blocks[0].block, 'GINJAL');
  assert.equal(report.blocks[0].pct, 0);
  assert.equal(report.blocks[report.blocks.length - 1].pct, 100);

  // All correct passes >= 66%
  const allRight = {};
  exam.questions.forEach((q, idx) => { allRight[idx] = q.jawabanBenar; });
  const passReport = CBT.gradeExam(exam, allRight, {}, 90);
  assert.equal(passReport.pct, 100);
  assert.equal(passReport.passed, true);
});

test('Legal compliance, SEO files, landing showcases, and mini-games leaderboards are wired end-to-end', () => {
  const legalHtml = readRel('legal.html');
  assert.match(legalHtml, /id="disclaimer"/);
  assert.match(legalHtml, /id="privasi"/);
  assert.match(legalHtml, /id="syarat"/);
  assert.match(legalHtml, /scrypt/i);

  const robots = readRel('robots.txt');
  assert.match(robots, /Sitemap:\s*https:\/\/www\.clined\.web\.id\/sitemap\.xml/);
  assert.match(robots, /Disallow:\s*\/api\//);

  const sitemap = readRel('sitemap.xml');
  assert.match(sitemap, /<urlset/);
  assert.match(sitemap, /https:\/\/www\.clined\.web\.id\/legal\.html/);

  const indexHtml = readRel('index.html');
  assert.match(indexHtml, /application\/ld\+json/);
  assert.match(indexHtml, /https:\/\/www\.clined\.web\.id\//);
  assert.match(indexHtml, /Meja Jaga IGD/);
  assert.match(indexHtml, /Rujuk Langka/);
  assert.match(indexHtml, /Blok Lysis/);
  assert.match(indexHtml, /Simulasi CBT/);
  assert.match(indexHtml, /Duel Gladiator/);
  assert.match(indexHtml, /Card Collection/);
  assert.match(indexHtml, /legal\.html#disclaimer/);

  const appHtml = readRel('app.html');
  assert.match(appHtml, /id="cbtTryoutPage"/);
  assert.match(appHtml, /data-lb-tab="igd"/);
  assert.match(appHtml, /data-lb-tab="rujuk_langka"/);
  assert.match(appHtml, /legal\.html#disclaimer/);
  assert.match(appHtml, /legal\.html#privasi/);

  const migration = readRel('db/migrations/051_minigames_leaderboards.sql');
  assert.match(migration, /CREATE TABLE IF NOT EXISTS igd_scores/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS rujuk_langka_scores/);
});

test('Asset bundler & minifier produces valid minified CSS + syntax-checked JS bundles', () => {
  const appHtml = readRel('app.html');
  const { styles, scripts } = extractAppAssets(appHtml);
  assert.ok(styles.length >= 18, 'should discover app.html stylesheets');
  assert.ok(scripts.length >= 35, 'should discover app.html scripts');
  assert.equal(minifyCss('/* c */ .a { color : red ; }'), '.a{color:red}');

  const tmpDist = fs.mkdtempSync(path.join(os.tmpdir(), 'clined-dist-'));
  try {
    const manifest = buildBundles({ dist: tmpDist, verifySyntax: true });
    assert.equal(manifest.css.inputs, styles.length);
    assert.equal(manifest.js.inputs, scripts.length);
    assert.ok(manifest.css.minifiedBytes < manifest.css.rawBytes, 'CSS should shrink after minification');
    assert.ok(manifest.js.minifiedBytes < manifest.js.rawBytes, 'JS should shrink after compaction');
    assert.ok(fs.existsSync(path.join(tmpDist, 'clined-core.min.css')));
    assert.ok(fs.existsSync(path.join(tmpDist, 'clined-core.min.js')));
    assert.ok(fs.existsSync(path.join(tmpDist, 'app.bundle.html')));
    assert.ok(fs.existsSync(path.join(tmpDist, 'bundle-manifest.json')));

    const bundledHtml = fs.readFileSync(path.join(tmpDist, 'app.bundle.html'), 'utf8');
    assert.match(bundledHtml, /id="clinedDesignSystemCss"[^>]*href="dist\/clined-core\.min\.css\?v=/);
    assert.match(bundledHtml, /src="dist\/clined-core\.min\.js\?v=/);
    assert.equal([...bundledHtml.matchAll(/href="(?:\.\/)?css\/[^"]+"/gi)].length, 0, 'Bundled HTML must consolidate all local CSS links into 1');
    assert.equal([...bundledHtml.matchAll(/src="(?:\.\/)?js\/[^"]+"/gi)].length, 0, 'Bundled HTML must consolidate all local JS scripts into 1');

    const vercel = JSON.parse(readRel('vercel.json'));
    assert.equal(vercel.buildCommand, 'npm run build:bundles');
    assert.ok(vercel.rewrites?.some(r => r.source === '/app.html' && r.destination === '/dist/app.bundle.html'));
  } finally {
    fs.rmSync(tmpDist, { recursive: true, force: true });
  }
});
