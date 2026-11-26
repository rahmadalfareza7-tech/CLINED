import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { isValidSyncKey, mergeJsonKey } from '../lib/sync-merge.mjs';

const ROOT = new URL('..', import.meta.url);
const readRel = p => fs.readFileSync(new URL(p, ROOT), 'utf8');

function loadRujukLangka(initialStore = {}) {
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
      documentElement: { classList: { add: () => {}, remove: () => {}, toggle: () => {} } },
      body: { classList: { add: () => {}, remove: () => {}, toggle: () => {} } }
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
  vm.runInContext(readRel('js/rujuk-langka-data.js'), ctx);
  vm.runInContext(readRel('js/rujuk-langka.js'), ctx);
  return {
    DATA: ctx.window.CLINED_RUJUK_LANGKA_DATA,
    RL: ctx.window.CLINED_RUJUK_LANGKA,
    store
  };
}

test('Dataset integrity: 4 rounds, 28 prompts, 3,200+ medical answers, all 8 Google-popularity tiers per prompt', () => {
  const { DATA, RL } = loadRujukLangka();
  assert.ok(DATA && Array.isArray(DATA.rounds), 'Expected CLINED_RUJUK_LANGKA_DATA.rounds');
  assert.equal(DATA.rounds.length, 4, 'Expected 4 clinical rounds');
  assert.equal(DATA.weightSource, 'google-search-popularity-id');

  let totalPrompts = 0;
  let totalAnswers = 0;
  let totalAliases = 0;
  const seenPromptIds = new Set();

  for (const round of DATA.rounds) {
    assert.ok(round.roundId && round.date && round.title, `Round ${round.roundId} must have metadata`);
    assert.equal(round.patients.length, 7, `Round ${round.roundId} must have exactly 7 patients`);
    for (const p of round.patients) {
      totalPrompts++;
      assert.ok(!seenPromptIds.has(p.id), `Duplicate prompt id: ${p.id}`);
      seenPromptIds.add(p.id);
      assert.ok(p.category && p.prompt, `Prompt ${p.id} must have category and prompt`);
      assert.ok(p.acceptedAnswers.length >= 80, `Prompt ${p.id} should have >= 80 answers (got ${p.acceptedAnswers.length})`);

      const seenCanon = new Set();
      for (const ans of p.acceptedAnswers) {
        assert.ok(ans.canonicalName && typeof ans.canonicalName === 'string', `Missing canonicalName in ${p.id}`);
        assert.ok(!seenCanon.has(ans.canonicalName.toLowerCase()), `Duplicate canonicalName ${ans.canonicalName} in ${p.id}`);
        seenCanon.add(ans.canonicalName.toLowerCase());
        assert.ok(typeof ans.initialWeight === 'number' && ans.initialWeight > 0, `Invalid initialWeight for ${ans.canonicalName}`);
        assert.ok(Array.isArray(ans.aliases), `Aliases must be array for ${ans.canonicalName}`);
        totalAnswers++;
        totalAliases += ans.aliases.length;
      }

      const dist = RL.Engine.distribution(p, {});
      const tiersPresent = new Set(dist.rows.map(r => r.tier));
      for (let t = 1; t <= 8; t++) {
        assert.ok(tiersPresent.has(t), `Prompt ${p.id} (${p.category}) is missing rarity Tier ${t}`);
      }
    }
  }

  assert.equal(totalPrompts, 28, 'Expected 28 total clinical prompts');
  assert.ok(totalAnswers >= 3200, `Expected >= 3,200 answers (got ${totalAnswers})`);
  assert.ok(totalAliases >= 5500, `Expected >= 5,500 aliases (got ${totalAliases})`);
});

test('Google-Search popularity calibration: mainstream drugs/diseases score low tiers (DPM/PKM), rare specialist terms score high tiers (RS B/A)', () => {
  const { DATA, RL } = loadRujukLangka();
  const findPrompt = id => DATA.rounds.flatMap(r => r.patients).find(p => p.id === id);

  const checkTier = (promptId, query, minTier, maxTier) => {
    const p = findPrompt(promptId);
    assert.ok(p, `Prompt ${promptId} not found`);
    const m = RL.Engine.match(p, query);
    assert.ok(m, `Query "${query}" must match in prompt ${promptId}`);
    const sc = RL.Engine.score(p, m.index, {});
    assert.ok(
      sc.tier >= minTier && sc.tier <= maxTier,
      `Expected "${query}" in ${promptId} to be Tier ${minTier}..${maxTier}, got Tier ${sc.tier} (${sc.pts} pts)`
    );
    return sc;
  };

  // High Google Search volume (mainstream Indonesia/global) -> Tier 1-2
  const amox = checkTier('A5', 'Amoksisilin', 1, 2);
  const amlo = checkTier('A2', 'Amlodipin', 1, 2);
  const metf = checkTier('C3', 'Metformin', 1, 2);
  const para = checkTier('C6', 'Parasetamol', 1, 2);
  const lupus = checkTier('A6', 'Lupus', 1, 2);
  const insul = checkTier('A7', 'Insulin', 1, 2);
  const covid = checkTier('B3', 'SARS-CoV-2', 1, 2);

  // Ultra-rare specialist medical terms -> Tier 7-8 (RS Tipe B / RS Tipe A)
  const zoliflodasin = checkTier('A5', 'Zoliflodasin', 7, 8);
  const aprocitentan = checkTier('A2', 'Aprocitentan', 7, 8);
  const saroglitazar = checkTier('C3', 'Saroglitazar', 7, 8);
  const ketobemidon = checkTier('C6', 'Ketobemidon', 7, 8);
  const sefiderokol = checkTier('A5', 'Sefiderokol', 6, 8);

  assert.ok(zoliflodasin.pts > amox.pts, 'Rare antibiotic must award far more points than Amoksisilin');
  assert.ok(sefiderokol.pts > amox.pts, 'Reserve antibiotic must award far more points than Amoksisilin');
  assert.ok(aprocitentan.pts > amlo.pts, 'Rare antihypertensive must award far more points than Amlodipin');
  assert.ok(saroglitazar.pts > metf.pts, 'Rare antidiabetic must award far more points than Metformin');
  assert.ok(ketobemidon.pts > para.pts, 'Rare analgesic must award far more points than Parasetamol');
  assert.ok(lupus.pts <= 20 && insul.pts <= 20 && covid.pts <= 20);
});

test('Engine.match supports Indonesian, English, Latin, brand names, clinical abbreviations, and typo correction', () => {
  const { DATA, RL } = loadRujukLangka();
  const findPrompt = id => DATA.rounds.flatMap(r => r.patients).find(p => p.id === id);
  const matchName = (p, q) => {
    const m = RL.Engine.match(p, q);
    return m ? p.acceptedAnswers[m.index].canonicalName : null;
  };

  // Brand name -> Parasetamol (Panadol / Sanmol)
  const pAnalgesik = findPrompt('C6');
  assert.equal(matchName(pAnalgesik, 'Panadol'), 'Parasetamol');
  assert.equal(matchName(pAnalgesik, 'acetaminophen'), 'Parasetamol');

  // Abbreviation -> Lupus (SLE)
  const pAutoimun = findPrompt('A6');
  assert.equal(matchName(pAutoimun, 'SLE'), 'Lupus eritematosus sistemik');

  // Stopword stripping & prefix stripping -> Nervus vagus / N. vagus
  const pSaraf = findPrompt('B1');
  assert.equal(matchName(pSaraf, 'N. vagus'), 'Nervus vagus');
  assert.equal(matchName(pSaraf, 'saraf vagus'), 'Nervus vagus');

  // Eponymous sign -> Tanda Babinski / Babinski sign
  const pTanda = findPrompt('C4');
  assert.equal(matchName(pTanda, 'babinski'), 'Tanda Babinski');

  // Typo autocorrect -> Amoksisilin
  const pAbx = findPrompt('A5');
  const typoMatch = RL.Engine.match(pAbx, 'amoksisiln');
  assert.ok(typoMatch, 'Minor typo should autocorrect');
  assert.equal(pAbx.acceptedAnswers[typoMatch.index].canonicalName, 'Amoksisilin');
  assert.equal(typoMatch.corrected, true);
});

test('Progress storage, legacy migration, and multi-device sync merge for clined_rujuk_langka_v1', () => {
  const { RL, store } = loadRujukLangka({
    'rujuklangka:v2': JSON.stringify({
      scored: { '2026-11-25': { roundId: 'R-2026-11-25', picks: [], total: 420, done: true } },
      archive: {},
      practice: {},
      ext: true,
      seenHelp: true
    })
  });

  const migrated = RL.Progress.read();
  assert.equal(migrated.scored['2026-11-25'].total, 420);
  assert.equal(migrated.ext, true);
  assert.ok(store.clined_rujuk_langka_v1, 'Legacy rujuklangka:v2 should migrate to clined_rujuk_langka_v1');

  assert.equal(isValidSyncKey('clined_rujuk_langka_v1'), true);

  const devA = JSON.stringify({
    scored: {
      '2026-11-25': { roundId: 'R-2026-11-25', picks: [{ pts: 100 }], total: 510, done: true },
      '2026-11-26': { roundId: 'R-2026-11-26', picks: [{ pts: 50 }], total: 50, done: false }
    },
    archive: {},
    practice: {},
    ext: false,
    seenHelp: true,
    at: 1700000100000
  });
  const devB = JSON.stringify({
    scored: {
      '2026-11-25': { roundId: 'R-2026-11-25', picks: [{ pts: 75 }], total: 390, done: true },
      '2026-11-26': { roundId: 'R-2026-11-26', picks: [{ pts: 130 }], total: 640, done: true }
    },
    archive: { '2026-11-27': { roundId: 'R-2026-11-27', picks: [{ pts: 175 }], total: 725, done: true } },
    practice: {},
    ext: true,
    seenHelp: false,
    at: 1700000200000
  });

  const merged = mergeJsonKey('clined_rujuk_langka_v1', devA, devB);
  assert.ok(merged);
  const parsed = JSON.parse(merged.value);
  assert.equal(parsed.scored['2026-11-25'].total, 510, 'Higher completed score wins');
  assert.equal(parsed.scored['2026-11-25'].picks.length, 1, 'Picks array must not duplicate');
  assert.equal(parsed.scored['2026-11-26'].done, true, 'Completed round beats incomplete');
  assert.equal(parsed.archive['2026-11-27'].total, 725, 'Archive rounds preserved');
  assert.equal(parsed.seenHelp, true, 'seenHelp OR-merged');
  assert.equal(parsed.ext, true, 'Newer timestamp preference wins');
});

test('CSS & CSP safety: flat Safari-compatible CSS, balanced braces, self-hosted fonts only', () => {
  const rlCss = readRel('css/rujuk-langka.css');
  const rlCssNoComments = rlCss.replace(/\/\*[\s\S]*?\*\//g, '');
  const rlJs = readRel('js/rujuk-langka.js');
  const rlData = readRel('js/rujuk-langka-data.js');

  assert.doesNotMatch(rlCss, /fonts\.googleapis\.com|https?:\/\//, 'CSS must not reference external CDN URLs');
  assert.doesNotMatch(rlJs, /fonts\.googleapis\.com|window\.claude/, 'JS must not reference external CDNs or standalone claude artifact DB');
  assert.doesNotMatch(rlData, /https?:\/\//, 'Data file must not contain external URLs');
  assert.doesNotMatch(rlCssNoComments, /&[.:#\[\s>+~]/, 'CSS must be 100% flat without nested & selectors for Safari compatibility');

  let depth = 0;
  for (const ch of rlCssNoComments) {
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    assert.ok(depth >= 0, 'Unbalanced closing brace in css/rujuk-langka.css');
  }
  assert.equal(depth, 0, 'Unclosed brace in css/rujuk-langka.css');
  assert.match(rlCss, /\.\.\/assets\/fonts\/igd\/nunito-600\.woff2/, 'Must use self-hosted Nunito font');
  assert.match(rlCss, /#rujukLangkaPage\.motion-page-enter/, 'Must include PWA motion-page-enter transform guard');
});

test('App wiring: Mini Games Hub card, view section, lazy bundle, BUSY_VIEWS, usage, sync, and SW precache', () => {
  const appHtml = readRel('app.html');
  const lazyJs = readRel('js/lazy-loader.js');
  const swJs = readRel('sw.js');
  const updJs = readRel('js/update-notice.js');
  const usageJs = readRel('js/usage.js');
  const motionCss = readRel('css/motion.css');
  const appJs = readRel('js/app.js');
  const syncJs = readRel('js/online-sync.js');

  assert.match(appHtml, /id="mgCardRujukLangka"[^>]*data-open-rujuk-langka/);
  assert.match(appHtml, /id="mgRlStatus"/);
  assert.match(appHtml, /id="rujukLangkaPage"/);
  assert.match(appHtml, /id="rujukLangkaHost"/);
  assert.match(lazyJs, /rujukLangka:\s*\{/);
  assert.match(lazyJs, /css\/rujuk-langka\.css\?v=3/);
  assert.match(lazyJs, /js\/rujuk-langka-data\.js\?v=1/);
  assert.match(lazyJs, /js\/rujuk-langka\.js\?v=3/);
  assert.match(lazyJs, /showRujukLangkaLoadingUI/);
  assert.match(lazyJs, /data-open-rujuk-langka/);
  assert.match(updJs, /'rujukLangkaPage'/);
  assert.match(usageJs, /rujukLangkaPage:\s*'Rujuk Langka'/);
  assert.match(motionCss, /:not\(#rujukLangkaPage\)/);
  assert.match(appJs, /id!=="rujukLangkaPage"/);
  assert.match(syncJs, /'clined_rujuk_langka_v1'/);
  assert.match(swJs, /\.\/css\/rujuk-langka\.css/);
  assert.match(swJs, /\.\/js\/rujuk-langka-data\.js/);
  assert.match(swJs, /\.\/js\/rujuk-langka\.js/);
});

test('Smart medical autocorrect handles transpositions, Indo/Eng/Latin phonetics, fuzzy prefixes, multi-word typos, stems, and rejects gibberish', () => {
  const { DATA, RL } = loadRujukLangka();
  const findPrompt = id => DATA.rounds.flatMap(r => r.patients).find(p => p.id === id);
  const expectAuto = (promptId, typed, expectedCanonical) => {
    const p = findPrompt(promptId);
    const m = RL.Engine.match(p, typed);
    assert.ok(m && !m.ambiguous, `Expected "${typed}" in ${promptId} to auto-match "${expectedCanonical}", got ${JSON.stringify(m)}`);
    assert.equal(p.acceptedAnswers[m.index].canonicalName, expectedCanonical, `Expected "${typed}" -> "${expectedCanonical}"`);
    assert.equal(m.corrected, true, `Expected "${typed}" to be flagged as corrected`);
  };

  // Adjacent letter transpositions (Damerau-Levenshtein)
  expectAuto('C6', 'paracetmaol', 'Parasetamol');
  expectAuto('C6', 'ibuporfen', 'Ibuprofen');
  expectAuto('A2', 'amlodpiin', 'Amlodipin');
  expectAuto('C3', 'metfomrin', 'Metformin');

  // Indonesian <-> English <-> Latin medical phonetic typos & multi-word misspellings
  expectAuto('C1', 'stafilokokus aereus', 'Staphylococcus aureus');
  expectAuto('C1', 'streptokokus piogenis', 'Streptococcus pyogenes');
  expectAuto('A3', 'eskerisia koli', 'Escherichia coli');
  expectAuto('A5', 'amoksicilin', 'Amoksisilin');
  expectAuto('A5', 'siprofloksacin', 'Siprofloksasin');
  expectAuto('A5', 'ceftriaksone', 'Seftriakson');
  expectAuto('A6', 'miastenia grafis', 'Miastenia gravis');
  expectAuto('D1', 'alzeimer', 'Penyakit Alzheimer');
  expectAuto('A6', 'guilan bare', 'Sindrom Guillain-Barré');
  expectAuto('C4', 'babinsky', 'Tanda Babinski');

  // Typoed medical stopword prefix ("nerfus", "sindorm")
  expectAuto('B1', 'nerfus fagus', 'Nervus vagus');
  expectAuto('D7', 'sindorm marfn', 'Sindrom Marfan');

  // Stem / truncated Latin ending
  expectAuto('A1', 'sternokleidomastoid', 'Sternocleidomastoideus');

  // Gibberish / unrelated words must NOT falsely autocorrect
  assert.equal(RL.Engine.match(findPrompt('A5'), 'asdfghjkl'), null);
  assert.equal(RL.Engine.match(findPrompt('A5'), 'kucing'), null);
  assert.equal(RL.Engine.match(findPrompt('B3'), 'xyz'), null);

  // Near-miss suggest() returns helpful candidates for bigger typos
  const sugs = RL.Engine.suggest(findPrompt('A5'), 'amoksisilxxx', 3);
  assert.ok(sugs.length >= 1 && sugs.some(s => s.canonicalName === 'Amoksisilin'), `Expected Amoksisilin in suggestions, got ${JSON.stringify(sugs)}`);
});

test('RoundGen produces non-patterned daily rounds (0 consecutive-day overlap, no 4-day cycle) and fresh random rounds', () => {
  const { DATA, RL } = loadRujukLangka();
  const { RoundGen } = RL;
  assert.ok(RoundGen, 'Expected CLINED_RUJUK_LANGKA.RoundGen');
  assert.equal(RoundGen.allPatients(DATA).length, 28);

  // Check 14 consecutive daily rounds: deterministic, 7 unique topics each, 0 overlap with previous day, no 4-day repeat
  const sigs = [];
  let prevSet = null;
  for (let d = 1; d <= 14; d++) {
    const iso = `2026-12-${String(d).padStart(2, '0')}`;
    const r = RoundGen.forDate(DATA, iso);
    const rAgain = RoundGen.forDate(DATA, iso);
    assert.equal(r.patients.length, 7);
    const ids = r.patients.map(p => p.id);
    assert.deepEqual(ids, rAgain.patients.map(p => p.id), 'Daily round must be deterministic for same date');
    assert.equal(new Set(ids).size, 7, 'No duplicate patients within a round');
    if (prevSet) {
      const overlap = ids.filter(id => prevSet.has(id));
      assert.equal(overlap.length, 0, `Consecutive day ${iso} must not repeat previous day topics (overlap: ${overlap})`);
    }
    prevSet = new Set(ids);
    sigs.push(ids.join(','));
  }
  // Ensure day 1 != day 5 (breaks old 4-day fixed modulo cycle!)
  assert.notEqual(sigs[0], sigs[4], 'Daily rounds must NOT repeat on a 4-day cycle');
  assert.equal(new Set(sigs).size, 14, 'All 14 consecutive days should have distinct randomized sequences');

  // Fresh random rounds avoid previous round topics and reconstruct via fromIds
  const rnd1 = RoundGen.random(DATA, null, 12345);
  const rnd2 = RoundGen.random(DATA, new Set(rnd1.patients.map(p => p.id)), 67890);
  assert.equal(rnd1.patients.length, 7);
  assert.equal(rnd2.patients.length, 7);
  const rndOverlap = rnd2.patients.filter(p => rnd1.patients.some(x => x.id === p.id));
  assert.equal(rndOverlap.length, 0, 'Consecutive random round should avoid repeating the 7 topics just played');

  const rebuilt = RoundGen.fromIds(DATA, rnd2.patients.map(p => p.id), { roundId: rnd2.roundId, title: rnd2.title });
  assert.deepEqual(rebuilt.patients.map(p => p.id), rnd2.patients.map(p => p.id));
});
