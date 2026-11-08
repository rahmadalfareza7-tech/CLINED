/* CLINED Medical Calculator & Pediatric Dose Saku (Pre-Klinik & Koas)
   Fitur:
   1. Kalkulator Dosis Anak & Resep BSO (Sirup, Drops, Puyer/Tablet + Rumus Clark, Young, Dilling + Draft R/ & Signa)
   2. Kalkulator Tetesan Infus (Makro/Mikro/Transfusi) & Cairan Maintenance Holliday-Segar (4-2-1)
   3. Kalkulator Antropometri: IMT Asia-Pasifik, BSA Mosteller, BB Ideal Broca, BMR
   4. Kalkulator Fungsi Ginjal: eGFR CKD-EPI & CrCl Cockcroft-Gault + Stadium KDIGO
   5. Skor Klinis Cepat: Glasgow Coma Scale (GCS) & CURB-65 Pneumonia
   6. Koreksi Elektrolit: Defisit Natrium (NaCl 3%), Kalsium Terkoreksi Albumin, Defisit Kalium
*/
(() => {
  'use strict';

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n, d = 1) => {
    const v = Number(n);
    if (!Number.isFinite(v)) return '0';
    return Number(v.toFixed(d)).toString().replace('.', ',');
  };
  const toRoman = num => {
    let n = Math.max(1, Math.min(100, Math.round(Number(num) || 1)));
    const map = [[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];
    let out = '';
    for (const [val, sym] of map) {
      while (n >= val) { out += sym; n -= val; }
    }
    return out;
  };

  const PEDS_PRESETS = [
    { key: 'pct_syr',  label: 'Paracetamol Sirup',  drug: 'Paracetamol Syr 120 mg/5 mL',  basis: 'per_dose', mgKg: 12.5, freq: 3, days: 3, form: 'syrup', strength: 120, adultMg: 500, range: '10–15 mg/kgBB/kali (tiap 4–6–8 jam)' },
    { key: 'pct_drp',  label: 'Paracetamol Drops',  drug: 'Paracetamol Drops 100 mg/mL',  basis: 'per_dose', mgKg: 12.5, freq: 3, days: 3, form: 'drops', strength: 100, adultMg: 500, range: '10–15 mg/kgBB/kali (bayi < 1 thn)' },
    { key: 'amox_125', label: 'Amoxicillin 125',    drug: 'Amoxicillin Syr 125 mg/5 mL',  basis: 'per_day',  mgKg: 30,   freq: 3, days: 5, form: 'syrup', strength: 125, adultMg: 500, range: '20–40 mg/kgBB/hari dibagi 3 dosis' },
    { key: 'amox_250', label: 'Amoxicillin 250',    drug: 'Amoxicillin Syr 250 mg/5 mL',  basis: 'per_day',  mgKg: 30,   freq: 3, days: 5, form: 'syrup', strength: 250, adultMg: 500, range: '20–40 mg/kgBB/hari dibagi 3 dosis' },
    { key: 'ibu_syr',  label: 'Ibuprofen Sirup',    drug: 'Ibuprofen Syr 100 mg/5 mL',    basis: 'per_dose', mgKg: 8,    freq: 3, days: 3, form: 'syrup', strength: 100, adultMg: 400, range: '5–10 mg/kgBB/kali (tiap 6–8 jam, pc)' },
    { key: 'cefixime', label: 'Cefixime Sirup',     drug: 'Cefixime Syr 100 mg/5 mL',     basis: 'per_day',  mgKg: 8,    freq: 2, days: 5, form: 'syrup', strength: 100, adultMg: 200, range: '8 mg/kgBB/hari dibagi 2 dosis' },
    { key: 'cetiriz',  label: 'Cetirizine Sirup',   drug: 'Cetirizine Syr 5 mg/5 mL',     basis: 'per_day',  mgKg: 0.25, freq: 1, days: 5, form: 'syrup', strength: 5,   adultMg: 10,  range: '0,25 mg/kgBB/hari (1x sehari)' },
    { key: 'ambroxol', label: 'Ambroxol Sirup',     drug: 'Ambroxol Syr 15 mg/5 mL',      basis: 'per_day',  mgKg: 1.5,  freq: 3, days: 5, form: 'syrup', strength: 15,  adultMg: 30,  range: '1,2–1,6 mg/kgBB/hari dibagi 3 dosis' },
    { key: 'salbu',    label: 'Salbutamol Sirup',   drug: 'Salbutamol Syr 2 mg/5 mL',     basis: 'per_dose', mgKg: 0.1,  freq: 3, days: 5, form: 'syrup', strength: 2,   adultMg: 4,   range: '0,1–0,15 mg/kgBB/kali (3x sehari)' },
    { key: 'ctm_puy',  label: 'CTM Puyer (4 mg)',   drug: 'CTM (Chlorpheniramine) 4 mg',  basis: 'per_day',  mgKg: 0.35, freq: 3, days: 3, form: 'puyer', strength: 4,   adultMg: 4,   range: '0,35 mg/kgBB/hari dibagi 3 dosis' },
    { key: 'pred_puy', label: 'Prednison Puyer',    drug: 'Prednison Tab 5 mg',           basis: 'per_day',  mgKg: 1,    freq: 3, days: 3, form: 'puyer', strength: 5,   adultMg: 5,   range: '1–2 mg/kgBB/hari dibagi 3 dosis' },
  ];

  const S = {
    tab: 'peds',
    peds: { preset: 'pct_syr', bb: 15, age: 4, drug: 'Paracetamol Syr 120 mg/5 mL', basis: 'per_dose', mgKg: 12.5, freq: 3, days: 3, form: 'syrup', strength: 120, adultMg: 500, range: '10–15 mg/kgBB/kali (tiap 4–6–8 jam)' },
    infus: { vol: 500, hours: 8, mins: 0, factor: 20, bb: 18, temp: 37.5 },
    bmi: { bb: 60, tb: 165, age: 21, sex: 'M' },
    renal: { cr: 1.1, age: 52, bb: 65, sex: 'M' },
    scores: { gcsE: 4, gcsV: 5, gcsM: 6, curbC: false, curbU: false, curbR: false, curbB: false, curb65: false },
    lytes: { naCur: 122, naTarg: 130, bb: 60, sex: 'M', caRaw: 7.6, alb: 2.5, kCur: 2.8, kTarg: 4.0 }
  };

  function cthLabel(ml) {
    const ratio = ml / 5;
    if (Math.abs(ratio - 0.5) <= 0.15) return '½ cth (2,5 mL)';
    if (Math.abs(ratio - 1) <= 0.2) return 'I cth (5 mL)';
    if (Math.abs(ratio - 1.5) <= 0.2) return 'I ½ cth (7,5 mL)';
    if (Math.abs(ratio - 2) <= 0.25) return 'II cth (10 mL)';
    if (Math.abs(ratio - 3) <= 0.25) return 'I C / III cth (15 mL)';
    return `${fmt(ml, 1)} mL (~${fmt(ratio, 1)} cth)`;
  }

  function cthSignaRoman(ml) {
    const ratio = ml / 5;
    if (Math.abs(ratio - 0.5) <= 0.18) return 'cth 1/2';
    if (Math.abs(ratio - 1) <= 0.22) return 'cth I';
    if (Math.abs(ratio - 1.5) <= 0.22) return 'cth I 1/2';
    if (Math.abs(ratio - 2) <= 0.25) return 'cth II';
    if (Math.abs(ratio - 3) <= 0.25) return 'C I';
    return `${fmt(ml, 1)} mL`;
  }

  function calcPedsResult() {
    const p = S.peds;
    const bb = Math.max(1, Number(p.bb) || 15);
    const age = Math.max(0.1, Number(p.age) || 4);
    const mgKg = Math.max(0.01, Number(p.mgKg) || 10);
    const freq = Math.max(1, Number(p.freq) || 3);
    const days = Math.max(1, Number(p.days) || 3);
    const strength = Math.max(0.1, Number(p.strength) || 120);
    const adultMg = Math.max(1, Number(p.adultMg) || 500);

    const singleMg = p.basis === 'per_day' ? (mgKg * bb) / freq : (mgKg * bb);
    const dailyMg = singleMg * freq;

    let doseGiveText = '', packNeedText = '', rxDraft = '';
    const totalDoses = freq * days;

    if (p.form === 'syrup') {
      const mlPerDose = (singleMg / strength) * 5;
      const totalMl = mlPerDose * totalDoses;
      const bottles = Math.max(1, Math.ceil(totalMl / 60));
      doseGiveText = `${fmt(mlPerDose, 1)} mL / kali (${cthLabel(mlPerDose)})`;
      packNeedText = `Total ${fmt(totalMl, 0)} mL (${days} hari) → ${bottles} fls (@60 mL)`;
      rxDraft = `R/ ${p.drug} fl No. ${toRoman(bottles)}\nS ${freq} dd ${cthSignaRoman(mlPerDose)}`;
    } else if (p.form === 'drops') {
      const mlPerDose = singleMg / strength;
      const gtt = Math.round(mlPerDose * 20);
      const totalMl = mlPerDose * totalDoses;
      const bottles = Math.max(1, Math.ceil(totalMl / 15));
      doseGiveText = `${fmt(mlPerDose, 2)} mL / kali (~${gtt} tetes / gtt)`;
      packNeedText = `Total ${fmt(totalMl, 1)} mL (${days} hari) → ${bottles} fls (@15 mL)`;
      rxDraft = `R/ ${p.drug} fl No. ${toRoman(bottles)}\nS ${freq} dd gtt ${toRoman(Math.max(1, gtt))}`;
    } else {
      // Puyer / Tablet
      const tabPerDose = singleMg / strength;
      const totalTabs = tabPerDose * totalDoses;
      doseGiveText = `${fmt(singleMg, 1)} mg / bungkus (${fmt(tabPerDose, 2)} tab/bungkus)`;
      packNeedText = `${totalDoses} bungkus (${days} hari) → butuh ${fmt(totalTabs, 1)} tablet`;
      rxDraft = `R/ ${p.drug.replace(/\s*Tab.*$/i, '')} ${fmt(singleMg, 1)} mg\n   Saccharin q.s.\n   m.f. pulv. d.t.d. No. ${toRoman(totalDoses)}\nS ${freq} dd pulv I`;
    }

    // Rumus Konversi Dosis Dewasa (Sekali Minum)
    const clarkMg = (bb / 70) * adultMg;
    const youngMg = (age / (age + 12)) * adultMg;
    const dillingMg = (age / 20) * adultMg;

    return { singleMg, dailyMg, doseGiveText, packNeedText, rxDraft, clarkMg, youngMg, dillingMg };
  }

  function renderPedsTab() {
    const p = S.peds;
    const r = calcPedsResult();
    return `
      <div class="medcalc-presets-wrap">
        <span class="medcalc-label-sm">⚡ Pilih Cepat Obat Anak &amp; Praktikum BSO</span>
        <div class="medcalc-presets">
          ${PEDS_PRESETS.map(pr => `<button type="button" class="medcalc-preset-chip ${p.preset === pr.key ? 'active' : ''}" data-mc-preset="${pr.key}">${esc(pr.label)}</button>`).join('')}
        </div>
      </div>

      <div class="medcalc-grid three">
        <div class="medcalc-field">
          <label for="mcPedsBb">Berat Badan (kg)</label>
          <input id="mcPedsBb" type="number" step="0.5" min="1" max="120" value="${p.bb}" data-mc-model="peds.bb">
        </div>
        <div class="medcalc-field">
          <label for="mcPedsAge">Usia Anak (tahun)</label>
          <input id="mcPedsAge" type="number" step="0.5" min="0.1" max="18" value="${p.age}" data-mc-model="peds.age">
        </div>
        <div class="medcalc-field">
          <label for="mcPedsForm">Bentuk Sediaan</label>
          <select id="mcPedsForm" data-mc-model="peds.form">
            <option value="syrup" ${p.form === 'syrup' ? 'selected' : ''}>Sirup (mg / 5 mL)</option>
            <option value="drops" ${p.form === 'drops' ? 'selected' : ''}>Drops (mg / 1 mL)</option>
            <option value="puyer" ${p.form === 'puyer' ? 'selected' : ''}>Puyer / Tablet (mg)</option>
          </select>
        </div>
        <div class="medcalc-field">
          <label for="mcPedsBasis">Basis Dosis</label>
          <select id="mcPedsBasis" data-mc-model="peds.basis">
            <option value="per_dose" ${p.basis === 'per_dose' ? 'selected' : ''}>mg / kgBB / kali</option>
            <option value="per_day" ${p.basis === 'per_day' ? 'selected' : ''}>mg / kgBB / hari</option>
          </select>
        </div>
        <div class="medcalc-field">
          <label for="mcPedsMgKg">Dosis (${p.basis === 'per_day' ? 'mg/kg/hari' : 'mg/kg/kali'})</label>
          <input id="mcPedsMgKg" type="number" step="0.05" min="0.01" value="${p.mgKg}" data-mc-model="peds.mgKg">
        </div>
        <div class="medcalc-field">
          <label for="mcPedsStrength">Kekuatan (${p.form === 'syrup' ? 'mg/5mL' : p.form === 'drops' ? 'mg/1mL' : 'mg/tab'})</label>
          <input id="mcPedsStrength" type="number" step="1" min="0.5" value="${p.strength}" data-mc-model="peds.strength">
        </div>
        <div class="medcalc-field">
          <label for="mcPedsFreq">Frekuensi Sehari</label>
          <select id="mcPedsFreq" data-mc-model="peds.freq">
            <option value="1" ${Number(p.freq) === 1 ? 'selected' : ''}>1x sehari (tiap 24 jam)</option>
            <option value="2" ${Number(p.freq) === 2 ? 'selected' : ''}>2x sehari (tiap 12 jam)</option>
            <option value="3" ${Number(p.freq) === 3 ? 'selected' : ''}>3x sehari (tiap 8 jam)</option>
            <option value="4" ${Number(p.freq) === 4 ? 'selected' : ''}>4x sehari (tiap 6 jam)</option>
          </select>
        </div>
        <div class="medcalc-field">
          <label for="mcPedsDays">Lama Terapi (hari)</label>
          <input id="mcPedsDays" type="number" step="1" min="1" max="30" value="${p.days}" data-mc-model="peds.days">
        </div>
        <div class="medcalc-field">
          <label for="mcPedsAdult">Dosis Dewasa (mg)</label>
          <input id="mcPedsAdult" type="number" step="5" min="1" value="${p.adultMg}" data-mc-model="peds.adultMg">
        </div>
      </div>

      <div class="medcalc-res-card" id="mcResultBox">
        ${renderPedsResultInner(p, r)}
      </div>
    `;
  }

  function renderPedsResultInner(p, r) {
    return `
      <div class="medcalc-kpi-row">
        <div class="medcalc-kpi">
          <small>🎯 DOSIS SEKALI MINUM</small>
          <b>${fmt(r.singleMg, 1)} mg / kali</b>
          <span>Total Harian: <b>${fmt(r.dailyMg, 1)} mg/hari</b> (${p.freq}x sehari)</span>
        </div>
        <div class="medcalc-kpi green">
          <small>🥄 TAKARAN PEMBERIAN</small>
          <b>${esc(r.doseGiveText)}</b>
          <span>${esc(r.packNeedText)}</span>
        </div>
      </div>

      <div class="medcalc-rx-box">
        <div class="medcalc-rx-top">
          <small>📝 CONTOH PENULISAN RESEP (${esc(p.drug)})</small>
          <button type="button" class="medcalc-copy-btn" data-mc-copy="${esc(r.rxDraft)}">📋 Salin Resep</button>
        </div>
        <div class="medcalc-rx-code">${esc(r.rxDraft)}</div>
      </div>

      <div class="medcalc-label-sm">📐 Perbandingan Rumus Dosis Anak (dari Dosis Dewasa ${fmt(p.adultMg, 0)} mg)</div>
      <div class="medcalc-formula-strip">
        <div class="medcalc-fbox">
          <small>Rumus Clark (BB/70)</small>
          <b>${fmt(r.clarkMg, 1)} mg / kali</b>
        </div>
        <div class="medcalc-fbox">
          <small>Rumus Young (&lt;8 thn: n/(n+12))</small>
          <b>${fmt(r.youngMg, 1)} mg / kali</b>
        </div>
        <div class="medcalc-fbox">
          <small>Rumus Dilling (≥8 thn: n/20)</small>
          <b>${fmt(r.dillingMg, 1)} mg / kali</b>
        </div>
      </div>
      ${p.range ? `<div class="medcalc-note">💡 <b>Referensi Dosis:</b> ${esc(p.range)}</div>` : ''}
    `;
  }

  function calcInfusResult() {
    const f = S.infus;
    const vol = Math.max(1, Number(f.vol) || 500);
    const totalMins = Math.max(1, (Number(f.hours) || 0) * 60 + (Number(f.mins) || 0));
    const factor = Number(f.factor) || 20;
    const tpm = (vol * factor) / totalMins;
    const mlPerHour = (vol / totalMins) * 60;

    // Holliday-Segar (4-2-1)
    const bb = Math.max(1, Number(f.bb) || 18);
    let maint24 = 0;
    if (bb <= 10) maint24 = bb * 100;
    else if (bb <= 20) maint24 = 1000 + (bb - 10) * 50;
    else maint24 = 1500 + (bb - 20) * 20;
    const maintHr = maint24 / 24;

    const temp = Number(f.temp) || 37.5;
    const feverDelta = Math.max(0, temp - 37.5);
    const feverMaint24 = maint24 * (1 + feverDelta * 0.12);
    return { tpm, mlPerHour, maint24, maintHr, feverDelta, feverMaint24 };
  }

  function renderInfusTab() {
    const f = S.infus;
    const r = calcInfusResult();
    return `
      <div class="medcalc-grid three">
        <div class="medcalc-field">
          <label for="mcInfVol">Volume Cairan (mL)</label>
          <input id="mcInfVol" type="number" step="50" min="10" value="${f.vol}" data-mc-model="infus.vol">
        </div>
        <div class="medcalc-field">
          <label for="mcInfHours">Waktu Pemberian (Jam)</label>
          <input id="mcInfHours" type="number" step="1" min="0" value="${f.hours}" data-mc-model="infus.hours">
        </div>
        <div class="medcalc-field">
          <label for="mcInfMins">Tambahan Menit</label>
          <input id="mcInfMins" type="number" step="5" min="0" max="59" value="${f.mins}" data-mc-model="infus.mins">
        </div>
        <div class="medcalc-field">
          <label for="mcInfFactor">Faktor Tetes Infus Set</label>
          <select id="mcInfFactor" data-mc-model="infus.factor">
            <option value="20" ${Number(f.factor) === 20 ? 'selected' : ''}>Makro Dewasa (20 tetes/mL)</option>
            <option value="60" ${Number(f.factor) === 60 ? 'selected' : ''}>Mikro / Anak (60 tetes/mL)</option>
            <option value="15" ${Number(f.factor) === 15 ? 'selected' : ''}>Transfusi / Otsuka (15 tetes/mL)</option>
          </select>
        </div>
        <div class="medcalc-field">
          <label for="mcInfBb">Berat Badan Holliday-Segar (kg)</label>
          <input id="mcInfBb" type="number" step="0.5" min="1" value="${f.bb}" data-mc-model="infus.bb">
        </div>
        <div class="medcalc-field">
          <label for="mcInfTemp">Suhu Tubuh (°C)</label>
          <input id="mcInfTemp" type="number" step="0.1" min="35" max="42" value="${f.temp}" data-mc-model="infus.temp">
        </div>
      </div>
      <div class="medcalc-res-card" id="mcResultBox">
        ${renderInfusResultInner(f, r)}
      </div>
    `;
  }

  function renderInfusResultInner(f, r) {
    return `
      <div class="medcalc-kpi-row">
        <div class="medcalc-kpi">
          <small>💧 KECEPATAN TETESAN INFUS</small>
          <b>${Math.round(r.tpm)} tpm</b>
          <span>(${fmt(r.tpm, 1)} tetes/menit • <b>${fmt(r.mlPerHour, 1)} mL/jam</b>)</span>
        </div>
        <div class="medcalc-kpi green">
          <small>⚖️ HOLLIDAY-SEGAR (MAINTENANCE BB ${f.bb} KG)</small>
          <b>${fmt(r.maint24, 0)} mL / 24 jam</b>
          <span>Kecepatan: <b>${fmt(r.maintHr, 1)} mL/jam</b> (Rumus 4-2-1)</span>
        </div>
      </div>
      ${r.feverDelta > 0 ? `<div class="medcalc-note">🌡️ <b>Koreksi Demam (${f.temp}°C):</b> Kebutuhan cairan naik +${fmt(r.feverDelta * 12, 1)}% menjadi <b>${fmt(r.feverMaint24, 0)} mL / 24 jam</b> (+12% tiap kenaikan 1°C di atas 37,5°C).</div>` : `<div class="medcalc-note">📐 <b>Rumus Holliday-Segar:</b> 10 kg pertama × 100 mL/kg + 10 kg kedua × 50 mL/kg + sisa kg × 20 mL/kg per 24 jam.</div>`}
    `;
  }

  function calcBmiResult() {
    const b = S.bmi;
    const bb = Math.max(1, Number(b.bb) || 60);
    const tb = Math.max(50, Number(b.tb) || 165);
    const age = Math.max(1, Number(b.age) || 21);
    const tbM = tb / 100;
    const bmi = bb / (tbM * tbM);
    const bsa = Math.sqrt((tb * bb) / 3600);
    const broca = b.sex === 'F'
      ? (tb - 100) - 0.15 * (tb - 100)
      : (tb - 100) - 0.10 * (tb - 100);
    const bmr = b.sex === 'F'
      ? (10 * bb + 6.25 * tb - 5 * age - 161)
      : (10 * bb + 6.25 * tb - 5 * age + 5);

    let cat = 'Normal (18,5–22,9)', tone = 'green';
    if (bmi < 18.5) { cat = 'Underweight (< 18,5)'; tone = 'amber'; }
    else if (bmi >= 30) { cat = 'Obesitas II (≥ 30,0)'; tone = 'amber'; }
    else if (bmi >= 25) { cat = 'Obesitas I (25,0–29,9)'; tone = 'amber'; }
    else if (bmi >= 23) { cat = 'Overweight / Berisiko (23,0–24,9)'; tone = 'amber'; }
    return { bmi, bsa, broca, bmr, cat, tone };
  }

  function renderBmiTab() {
    const b = S.bmi;
    const r = calcBmiResult();
    return `
      <div class="medcalc-grid">
        <div class="medcalc-field">
          <label for="mcBmiBb">Berat Badan (kg)</label>
          <input id="mcBmiBb" type="number" step="0.5" min="2" value="${b.bb}" data-mc-model="bmi.bb">
        </div>
        <div class="medcalc-field">
          <label for="mcBmiTb">Tinggi Badan (cm)</label>
          <input id="mcBmiTb" type="number" step="0.5" min="40" value="${b.tb}" data-mc-model="bmi.tb">
        </div>
        <div class="medcalc-field">
          <label for="mcBmiAge">Usia (tahun)</label>
          <input id="mcBmiAge" type="number" step="1" min="1" value="${b.age}" data-mc-model="bmi.age">
        </div>
        <div class="medcalc-field">
          <label for="mcBmiSex">Jenis Kelamin</label>
          <select id="mcBmiSex" data-mc-model="bmi.sex">
            <option value="M" ${b.sex === 'M' ? 'selected' : ''}>Laki-laki</option>
            <option value="F" ${b.sex === 'F' ? 'selected' : ''}>Perempuan</option>
          </select>
        </div>
      </div>
      <div class="medcalc-res-card" id="mcResultBox">
        ${renderBmiResultInner(r)}
      </div>
    `;
  }

  function renderBmiResultInner(r) {
    return `
      <div class="medcalc-kpi-row">
        <div class="medcalc-kpi ${r.tone}">
          <small>⚖️ IMT (WHO ASIA-PASIFIK)</small>
          <b>${fmt(r.bmi, 1)} kg/m²</b>
          <span>Kategori: <b>${esc(r.cat)}</b></span>
        </div>
        <div class="medcalc-kpi">
          <small>📏 LUAS PERMUKAAN TUBUH (BSA)</small>
          <b>${fmt(r.bsa, 2)} m²</b>
          <span>BB Ideal Broca: <b>${fmt(r.broca, 1)} kg</b> • BMR: <b>${fmt(r.bmr, 0)} kkal</b></span>
        </div>
      </div>
    `;
  }

  function calcRenalResult() {
    const rn = S.renal;
    const cr = Math.max(0.1, Number(rn.cr) || 1.0);
    const age = Math.max(1, Number(rn.age) || 50);
    const bb = Math.max(10, Number(rn.bb) || 65);
    const isF = rn.sex === 'F';

    // Cockcroft-Gault CrCl
    const crcl = (((140 - age) * bb) / (72 * cr)) * (isF ? 0.85 : 1.0);

    // CKD-EPI 2021
    const kappa = isF ? 0.7 : 0.9;
    const alpha = isF ? -0.241 : -0.302;
    const minRatio = Math.min(cr / kappa, 1);
    const maxRatio = Math.max(cr / kappa, 1);
    const egfr = 142 * Math.pow(minRatio, alpha) * Math.pow(maxRatio, -1.200) * Math.pow(0.9938, age) * (isF ? 1.012 : 1.0);

    let stage = 'G1 (Normal / Tinggi ≥ 90)', note = 'Tidak perlu penyesuaian dosis obat ekskresi ginjal.';
    if (egfr < 15) { stage = 'G5 (Gagal Ginjal / Kidney Failure < 15)'; note = 'Hindari obat nefrotoksik (NSAID, aminoglikosida); sesuaikan ketat dosis antibiotik renal.'; }
    else if (egfr < 30) { stage = 'G4 (Penurunan Berat 15–29)'; note = 'Kurangi dosis / perpanjang interval obat ekskresi renal (mis. Amoxicillin, Cefixime, Gabapentin).'; }
    else if (egfr < 45) { stage = 'G3b (Penurunan Sedang–Berat 30–44)'; note = 'Hati-hati Metformin & obat nefrotoksik; sesuaikan dosis obat dengan indeks terapi sempit.'; }
    else if (egfr < 60) { stage = 'G3a (Penurunan Ringan–Sedang 45–59)'; note = 'Pantau fungsi ginjal berkala & evaluasi penyesuaian dosis bila menggunakan obat ekskresi ginjal.'; }
    else if (egfr < 90) { stage = 'G2 (Penurunan Ringan 60–89)'; note = 'Umumnya dosis standar masih aman kecuali obat nefrotoksik dosis tinggi.'; }

    return { crcl, egfr, stage, note };
  }

  function renderRenalTab() {
    const rn = S.renal;
    const r = calcRenalResult();
    return `
      <div class="medcalc-grid">
        <div class="medcalc-field">
          <label for="mcRenCr">Kreatinin Serum (mg/dL)</label>
          <input id="mcRenCr" type="number" step="0.1" min="0.1" value="${rn.cr}" data-mc-model="renal.cr">
        </div>
        <div class="medcalc-field">
          <label for="mcRenAge">Usia Pasien (tahun)</label>
          <input id="mcRenAge" type="number" step="1" min="1" value="${rn.age}" data-mc-model="renal.age">
        </div>
        <div class="medcalc-field">
          <label for="mcRenBb">Berat Badan (kg)</label>
          <input id="mcRenBb" type="number" step="0.5" min="10" value="${rn.bb}" data-mc-model="renal.bb">
        </div>
        <div class="medcalc-field">
          <label for="mcRenSex">Jenis Kelamin</label>
          <select id="mcRenSex" data-mc-model="renal.sex">
            <option value="M" ${rn.sex === 'M' ? 'selected' : ''}>Laki-laki</option>
            <option value="F" ${rn.sex === 'F' ? 'selected' : ''}>Perempuan (×0,85 CG)</option>
          </select>
        </div>
      </div>
      <div class="medcalc-res-card" id="mcResultBox">
        ${renderRenalResultInner(r)}
      </div>
    `;
  }

  function renderRenalResultInner(r) {
    return `
      <div class="medcalc-kpi-row">
        <div class="medcalc-kpi ${r.egfr >= 60 ? 'green' : 'amber'}">
          <small>🫘 eGFR (CKD-EPI)</small>
          <b>${fmt(r.egfr, 1)} mL/mnt/1,73m²</b>
          <span>Stadium KDIGO: <b>${esc(r.stage)}</b></span>
        </div>
        <div class="medcalc-kpi">
          <small>🧪 CrCl (COCKCROFT-GAULT)</small>
          <b>${fmt(r.crcl, 1)} mL/menit</b>
          <span>Digunakan untuk penyesuaian dosis obat (Renal Dosing)</span>
        </div>
      </div>
      <div class="medcalc-note">💊 <b>Rekomendasi Farmakoterapi:</b> ${esc(r.note)}</div>
    `;
  }

  function calcScoresResult() {
    const sc = S.scores;
    const gcs = (Number(sc.gcsE) || 4) + (Number(sc.gcsV) || 5) + (Number(sc.gcsM) || 6);
    let gcsCat = 'Cedera Kepala Ringan (GCS 14–15) • Compos Mentis';
    if (gcs <= 8) gcsCat = 'Cedera Kepala Berat (GCS ≤ 8) • Coma / Pertimbangkan Intubasi';
    else if (gcs <= 13) gcsCat = 'Cedera Kepala Sedang (GCS 9–13) • Observasi Ketat';

    const curb = (sc.curbC ? 1 : 0) + (sc.curbU ? 1 : 0) + (sc.curbR ? 1 : 0) + (sc.curbB ? 1 : 0) + (sc.curb65 ? 1 : 0);
    let curbRec = 'Skor 0–1: Risiko rendah → Dapat Rawat Jalan (Antibiotik Empiris Oral)';
    if (curb === 2) curbRec = 'Skor 2: Risiko sedang → Pertimbangkan Rawat Inap Bangsal / Observasi';
    else if (curb >= 3) curbRec = 'Skor 3–5: Pneumonia Berat → Rawat Inap Segera (Skor ≥ 4 pertimbangkan ICU)';

    return { gcs, gcsCat, curb, curbRec };
  }

  function renderScoresTab() {
    const sc = S.scores;
    const r = calcScoresResult();
    return `
      <div class="medcalc-section-title"><span>🧠 Glasgow Coma Scale (GCS)</span><b>E${sc.gcsE} V${sc.gcsV} M${sc.gcsM} = ${r.gcs}</b></div>
      <div class="medcalc-grid three">
        <div class="medcalc-field">
          <label for="mcGcsE">Respon Mata (Eye)</label>
          <select id="mcGcsE" data-mc-model="scores.gcsE">
            <option value="4" ${Number(sc.gcsE) === 4 ? 'selected' : ''}>E4 — Spontan</option>
            <option value="3" ${Number(sc.gcsE) === 3 ? 'selected' : ''}>E3 — Terhadap Suara</option>
            <option value="2" ${Number(sc.gcsE) === 2 ? 'selected' : ''}>E2 — Terhadap Nyeri</option>
            <option value="1" ${Number(sc.gcsE) === 1 ? 'selected' : ''}>E1 — Tidak Ada Respon</option>
          </select>
        </div>
        <div class="medcalc-field">
          <label for="mcGcsV">Respon Verbal (V)</label>
          <select id="mcGcsV" data-mc-model="scores.gcsV">
            <option value="5" ${Number(sc.gcsV) === 5 ? 'selected' : ''}>V5 — Orientasi Baik</option>
            <option value="4" ${Number(sc.gcsV) === 4 ? 'selected' : ''}>V4 — Bingung (Confused)</option>
            <option value="3" ${Number(sc.gcsV) === 3 ? 'selected' : ''}>V3 — Kata Tidak Tepat</option>
            <option value="2" ${Number(sc.gcsV) === 2 ? 'selected' : ''}>V2 — Mengerang (Suara)</option>
            <option value="1" ${Number(sc.gcsV) === 1 ? 'selected' : ''}>V1 — Tidak Ada Respon</option>
          </select>
        </div>
        <div class="medcalc-field">
          <label for="mcGcsM">Respon Motorik (M)</label>
          <select id="mcGcsM" data-mc-model="scores.gcsM">
            <option value="6" ${Number(sc.gcsM) === 6 ? 'selected' : ''}>M6 — Mengikuti Perintah</option>
            <option value="5" ${Number(sc.gcsM) === 5 ? 'selected' : ''}>M5 — Melokalisir Nyeri</option>
            <option value="4" ${Number(sc.gcsM) === 4 ? 'selected' : ''}>M4 — Menghindar Nyeri</option>
            <option value="3" ${Number(sc.gcsM) === 3 ? 'selected' : ''}>M3 — Fleksi Abnormal (Dekortikasi)</option>
            <option value="2" ${Number(sc.gcsM) === 2 ? 'selected' : ''}>M2 — Ekstensi Abnormal (Deserebrasi)</option>
            <option value="1" ${Number(sc.gcsM) === 1 ? 'selected' : ''}>M1 — Tidak Ada Respon</option>
          </select>
        </div>
      </div>

      <div class="medcalc-section-title"><span>🫁 Skor CURB-65 (Keparahan Pneumonia Komunitas)</span><b>${r.curb} / 5</b></div>
      <div class="medcalc-check-list">
        ${[
          ['curbC', 'C — Confusion (Disorientasi baru / penurunan kesadaran)'],
          ['curbU', 'U — Urea > 7 mmol/L (atau BUN > 19 mg/dL / Ureum > 42 mg/dL)'],
          ['curbR', 'R — Respiratory Rate ≥ 30 kali/menit'],
          ['curbB', 'B — Blood Pressure: Sistolik < 90 mmHg atau Diastolik ≤ 60 mmHg'],
          ['curb65', '65 — Usia pasien ≥ 65 tahun']
        ].map(([k, lbl]) => `
          <label class="medcalc-check-item ${sc[k] ? 'checked' : ''}">
            <input type="checkbox" ${sc[k] ? 'checked' : ''} data-mc-check="scores.${k}">
            <span>${esc(lbl)}</span>
          </label>
        `).join('')}
      </div>

      <div class="medcalc-res-card" id="mcResultBox">
        ${renderScoresResultInner(sc, r)}
      </div>
    `;
  }

  function renderScoresResultInner(sc, r) {
    return `
      <div class="medcalc-kpi-row">
        <div class="medcalc-kpi ${r.gcs >= 14 ? 'green' : 'amber'}">
          <small>🧠 SKOR GCS (E${sc.gcsE} V${sc.gcsV} M${sc.gcsM})</small>
          <b>${r.gcs} / 15</b>
          <span>${esc(r.gcsCat)}</span>
        </div>
        <div class="medcalc-kpi ${r.curb <= 1 ? 'green' : 'amber'}">
          <small>🫁 SKOR CURB-65 PNEUMONIA</small>
          <b>Skor ${r.curb} / 5</b>
          <span>${esc(r.curbRec)}</span>
        </div>
      </div>
    `;
  }

  function calcLytesResult() {
    const l = S.lytes;
    const bb = Math.max(5, Number(l.bb) || 60);
    const tbwFactor = l.sex === 'F' ? 0.5 : 0.6;
    const tbw = bb * tbwFactor;
    const naDelta = Math.max(0, (Number(l.naTarg) || 130) - (Number(l.naCur) || 122));
    const naDeficit = tbw * naDelta;
    const mlNaCl3 = (naDeficit / 513) * 1000;
    const mlNaCl09 = (naDeficit / 154) * 1000;

    // Corrected Calcium
    const caRaw = Number(l.caRaw) || 7.6;
    const alb = Number(l.alb) || 2.5;
    const caCorr = caRaw + 0.8 * (4.0 - alb);

    // Potassium deficit
    const kDelta = Math.max(0, (Number(l.kTarg) || 4.0) - (Number(l.kCur) || 2.8));
    const kDeficit = kDelta * 0.4 * bb;

    return { naDeficit, mlNaCl3, mlNaCl09, caCorr, kDeficit };
  }

  function renderLytesTab() {
    const l = S.lytes;
    const r = calcLytesResult();
    return `
      <div class="medcalc-grid three">
        <div class="medcalc-field">
          <label for="mcLyNaCur">Na Saat Ini (mEq/L)</label>
          <input id="mcLyNaCur" type="number" step="1" value="${l.naCur}" data-mc-model="lytes.naCur">
        </div>
        <div class="medcalc-field">
          <label for="mcLyNaTarg">Na Target (mEq/L)</label>
          <input id="mcLyNaTarg" type="number" step="1" value="${l.naTarg}" data-mc-model="lytes.naTarg">
        </div>
        <div class="medcalc-field">
          <label for="mcLyBb">Berat Badan (kg)</label>
          <input id="mcLyBb" type="number" step="1" value="${l.bb}" data-mc-model="lytes.bb">
        </div>
        <div class="medcalc-field">
          <label for="mcLyCa">Kalsium Total (mg/dL)</label>
          <input id="mcLyCa" type="number" step="0.1" value="${l.caRaw}" data-mc-model="lytes.caRaw">
        </div>
        <div class="medcalc-field">
          <label for="mcLyAlb">Albumin Serum (g/dL)</label>
          <input id="mcLyAlb" type="number" step="0.1" value="${l.alb}" data-mc-model="lytes.alb">
        </div>
        <div class="medcalc-field">
          <label for="mcLyKCur">Kalium Saat Ini (mEq/L)</label>
          <input id="mcLyKCur" type="number" step="0.1" value="${l.kCur}" data-mc-model="lytes.kCur">
        </div>
      </div>
      <div class="medcalc-res-card" id="mcResultBox">
        ${renderLytesResultInner(r)}
      </div>
    `;
  }

  function renderLytesResultInner(r) {
    return `
      <div class="medcalc-kpi-row">
        <div class="medcalc-kpi">
          <small>🧂 DEFISIT NATRIUM (HIPONATREMIA)</small>
          <b>${fmt(r.naDeficit, 0)} mEq Na⁺</b>
          <span>≈ <b>${fmt(r.mlNaCl3, 0)} mL NaCl 3%</b> (513 mEq/L) atau ${fmt(r.mlNaCl09, 0)} mL NaCl 0,9%</span>
        </div>
        <div class="medcalc-kpi green">
          <small>🦴 KALSIUM TERKOREKSI &amp; DEFISIT K⁺</small>
          <b>Ca: ${fmt(r.caCorr, 2)} mg/dL</b>
          <span>Defisit Kalium (menuju 4,0): <b>${fmt(r.kDeficit, 0)} mEq KCl</b></span>
        </div>
      </div>
      <div class="medcalc-note">⚠️ <b>Prinsip Keamanan Koreksi Natrium:</b> Kecepatan koreksi maksimal <b>8–10 mEq/L dalam 24 jam pertama</b> untuk mencegah <em>Osmotic Demyelination Syndrome (ODS)</em>.</div>
    `;
  }

  function renderActiveTabBody() {
    switch (S.tab) {
      case 'infus': return renderInfusTab();
      case 'bmi': return renderBmiTab();
      case 'renal': return renderRenalTab();
      case 'scores': return renderScoresTab();
      case 'lytes': return renderLytesTab();
      default: return renderPedsTab();
    }
  }

  function refreshResultOnly() {
    const box = document.getElementById('mcResultBox');
    if (!box) return renderModalContent();
    if (S.tab === 'peds') box.innerHTML = renderPedsResultInner(S.peds, calcPedsResult());
    else if (S.tab === 'infus') box.innerHTML = renderInfusResultInner(S.infus, calcInfusResult());
    else if (S.tab === 'bmi') box.innerHTML = renderBmiResultInner(calcBmiResult());
    else if (S.tab === 'renal') box.innerHTML = renderRenalResultInner(calcRenalResult());
    else if (S.tab === 'scores') {
      renderModalContent();
    } else if (S.tab === 'lytes') box.innerHTML = renderLytesResultInner(calcLytesResult());
  }

  function renderModalContent() {
    const host = document.getElementById('medCalcSheetHost');
    if (!host) return;
    const tabs = [
      ['peds', '👶 Dosis Anak & Resep'],
      ['infus', '💧 Infus & Cairan'],
      ['bmi', '⚖️ IMT & BSA'],
      ['renal', '🫘 eGFR Ginjal'],
      ['scores', '🧠 GCS & CURB-65'],
      ['lytes', '🧪 Elektrolit']
    ];
    const prevTabs = host.querySelector('.medcalc-tabs');
    const prevLeft = prevTabs ? prevTabs.scrollLeft : 0;
    host.innerHTML = `
      <div class="medcalc-head">
        <div>
          <span class="medcalc-eyebrow">CLINED • CLINICAL &amp; PHARMACY TOOLS</span>
          <h3>🧮 Kalkulator Medis &amp; Dosis Anak</h3>
          <p>Hitung cepat dosis mg/kgBB, takaran sirup/puyer, infus, eGFR &amp; skor klinis.</p>
        </div>
        <button type="button" class="medcalc-close" id="closeMedCalcBtn" aria-label="Tutup">✕</button>
      </div>
      <div class="medcalc-tabs" role="tablist">
        ${tabs.map(([k, lbl]) => `<button type="button" role="tab" aria-selected="${S.tab === k}" class="medcalc-tab ${S.tab === k ? 'active' : ''}" data-mc-tab="${k}">${lbl}</button>`).join('')}
      </div>
      <div class="medcalc-body" id="medCalcTabBody">
        ${renderActiveTabBody()}
      </div>
    `;
    const tabsEl = host.querySelector('.medcalc-tabs');
    if (tabsEl) {
      tabsEl.scrollLeft = prevLeft;
      const act = tabsEl.querySelector('.medcalc-tab.active');
      if (act) {
        const l = act.offsetLeft - 8, r = act.offsetLeft + act.offsetWidth + 8;
        if (l < tabsEl.scrollLeft) tabsEl.scrollLeft = l;
        else if (r > tabsEl.scrollLeft + tabsEl.clientWidth) tabsEl.scrollLeft = r - tabsEl.clientWidth;
      }
    }
  }

  function ensureModal() {
    let modal = document.getElementById('medCalcModal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'medCalcModal';
    modal.className = 'medcalc-modal';
    modal.innerHTML = `
      <div class="medcalc-backdrop" id="medCalcBackdrop"></div>
      <div class="medcalc-sheet" id="medCalcSheetHost" role="dialog" aria-modal="true" aria-label="Kalkulator Medis dan Dosis Anak"></div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener('click', e => {
      if (e.target.id === 'medCalcBackdrop' || e.target.closest('#closeMedCalcBtn')) {
        closeMedCalc();
        return;
      }
      const tabBtn = e.target.closest('[data-mc-tab]');
      if (tabBtn) {
        if (tabBtn.parentElement?.dataset.justDragged) return;
        S.tab = tabBtn.getAttribute('data-mc-tab') || 'peds';
        renderModalContent();
        return;
      }
      const presetBtn = e.target.closest('[data-mc-preset]');
      if (presetBtn) {
        const key = presetBtn.getAttribute('data-mc-preset');
        const pr = PEDS_PRESETS.find(x => x.key === key);
        if (pr) {
          S.peds = { ...S.peds, ...pr, preset: pr.key };
          renderModalContent();
        }
        return;
      }
      const copyBtn = e.target.closest('[data-mc-copy]');
      if (copyBtn) {
        const text = copyBtn.getAttribute('data-mc-copy') || '';
        navigator.clipboard?.writeText(text).catch(() => {});
        const prev = copyBtn.textContent;
        copyBtn.textContent = '✅ Tersalin!';
        setTimeout(() => { copyBtn.textContent = prev; }, 1400);
      }
    });

    // Geser tab ke samping: drag mouse + roda mouse (sentuhan memakai scroll native)
    let drag = null;
    modal.addEventListener('pointerdown', e => {
      const t = e.target.closest('.medcalc-tabs');
      if (!t || e.pointerType === 'touch') return;
      drag = { el: t, x: e.clientX, left: t.scrollLeft, moved: false };
    });
    window.addEventListener('pointermove', e => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (Math.abs(dx) > 4) { drag.moved = true; drag.el.classList.add('dragging'); }
      drag.el.scrollLeft = drag.left - dx;
    });
    window.addEventListener('pointerup', () => {
      if (!drag) return;
      const d = drag; drag = null;
      setTimeout(() => d.el.classList.remove('dragging'), 0);
      if (d.moved) { d.el.dataset.justDragged = '1'; setTimeout(() => delete d.el.dataset.justDragged, 60); }
    });
    modal.addEventListener('wheel', e => {
      const t = e.target.closest('.medcalc-tabs');
      if (!t || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      t.scrollLeft += e.deltaY;
      e.preventDefault();
    }, { passive: false });

    modal.addEventListener('input', e => {
      const m = e.target.getAttribute('data-mc-model');
      if (!m) return;
      const [sec, key] = m.split('.');
      if (S[sec] && key) {
        S[sec][key] = e.target.type === 'number' ? parseFloat(e.target.value || '0') : e.target.value;
        if (sec === 'peds' && (key === 'form' || key === 'basis')) {
          renderModalContent();
        } else {
          refreshResultOnly();
        }
      }
    });

    modal.addEventListener('change', e => {
      const chk = e.target.getAttribute('data-mc-check');
      if (chk) {
        const [sec, key] = chk.split('.');
        if (S[sec] && key) {
          S[sec][key] = !!e.target.checked;
          renderModalContent();
        }
        return;
      }
      const m = e.target.getAttribute('data-mc-model');
      if (m && e.target.tagName === 'SELECT') {
        const [sec, key] = m.split('.');
        if (S[sec] && key) {
          S[sec][key] = e.target.value;
          renderModalContent();
        }
      }
    });

    return modal;
  }

  function openMedCalc(initialTab) {
    if (initialTab && typeof initialTab === 'string') S.tab = initialTab;
    const modal = ensureModal();
    renderModalContent();
    requestAnimationFrame(() => modal.classList.add('open'));
  }

  function closeMedCalc() {
    document.getElementById('medCalcModal')?.classList.remove('open');
  }

  function injectEntryButtons() {
    // 1. Header button sebelah Normal Values
    const nvBtn = document.getElementById('normalValuesHeaderBtn');
    if (nvBtn && !document.getElementById('medCalcHeaderBtn')) {
      const btn = document.createElement('button');
      btn.id = 'medCalcHeaderBtn';
      btn.className = 'icon-btn';
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Kalkulator Medis & Dosis Anak');
      btn.setAttribute('title', 'Kalkulator Medis & Dosis Anak');
      btn.textContent = '🧮';
      btn.addEventListener('click', () => openMedCalc('peds'));
      nvBtn.parentNode.insertBefore(btn, nvBtn);
    }

    // 2. Study Lab Grid tile
    const grid = document.querySelector('#studyTools .study-tool-grid');
    if (grid && !document.getElementById('medCalcStudyToolBtn')) {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'study-tool';
      tile.id = 'medCalcStudyToolBtn';
      tile.innerHTML = '<span>🧮</span><b>Kalkulator Medis</b><small>Dosis Anak, Infus, eGFR &amp; GCS</small>';
      tile.addEventListener('click', () => openMedCalc('peds'));
      grid.appendChild(tile);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectEntryButtons);
  else injectEntryButtons();

  window.CLINED_MEDCALC = {
    open: openMedCalc,
    close: closeMedCalc,
    calcPeds: calcPedsResult
  };
})();
