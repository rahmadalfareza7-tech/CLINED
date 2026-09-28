/* Klasifikator komponen kemampuan klinis (Physiology, Anatomy, Diagnostics, Histology, Pharmacology, Recall).
 *
 * Prinsip: soal dikelompokkan berdasarkan APA YANG DITANYAKAN (kalimat pertanyaan di akhir stem),
 * bukan berdasarkan kata yang kebetulan muncul di vignette. Vignette klinis hampir selalu memuat kata
 * "pasien", "keluhan", atau nama pemeriksaan, sehingga pencocokan kata di seluruh stem membuat hampir
 * semua soal tampak seperti Diagnostics.
 *
 * Definisi komponen:
 *   Diagnostics  : menegakkan diagnosis, diagnosis banding, memilih/menafsirkan pemeriksaan penunjang, tanda dan
 *                  gejala khas, klasifikasi/derajat/stadium penyakit.
 *   Pharmacology : memilih terapi (obat maupun tatalaksana non-obat), mekanisme kerja, efek samping,
 *                  kontraindikasi, rasionalitas penggunaan obat.
 *   Physiology   : mekanisme normal dan patofisiologi, patogenesis, etiologi, faktor risiko, alasan terjadinya.
 *   Anatomy      : letak, hubungan, persarafan, vaskularisasi, origo/insersio, struktur makroskopis.
 *   Histology    : struktur mikroskopis, jenis sel/jaringan/epitel, gambaran histopatologi.
 *   Recall       : fakta, definisi, istilah, angka/nilai rujukan, regulasi, kebijakan, dan pengetahuan kedokteran
 *                  komunitas/keluarga yang tidak termasuk lima komponen di atas.
 */
(function (root) {
  'use strict';

  var ORDER = ['Diagnostics', 'Pharmacology', 'Physiology', 'Anatomy', 'Histology', 'Recall'];

  function norm(s) {
    return String(s == null ? '' : s).toLowerCase().replace(/[\u2018\u2019\u201c\u201d"'`*_]/g, ' ')
      .replace(/\btata ?laksana\b/g, 'tatalaksana').replace(/\bapakah\b/g, 'apa').replace(/\bmanakah\b/g, 'mana')
      .replace(/\s+/g, ' ').trim();
  }

  // Ambil kalimat pertanyaan: bagian terakhir stem. Vignette panjang biasanya diakhiri satu kalimat tanya.
  function askOf(stem) {
    var s = String(stem || '').replace(/\s+/g, ' ').trim();
    // lindungi singkatan agar titik pada "dr." "No." "m." tidak dianggap akhir kalimat
    var protectedText = s.replace(/\b(dr|drg|no|dll|dsb|mis|yg|sp|prof|n|m|a|v|os|lig|gr|mg|ml|kg)\.\s/gi, function (m) { return m.replace('.', '\u0001'); });
    var parts = protectedText.split(/(?<=[.?!:])\s+/).map(function (x) { return x.replace(/\u0001/g, '.').trim(); }).filter(Boolean);
    if (!parts.length) return '';
    var last = parts[parts.length - 1];
    // Stem yang diakhiri titik dua atau "adalah..." tetap memakai kalimat terakhir; bila terlalu pendek, gabung dengan sebelumnya.
    if (last.length < 25 && parts.length > 1) last = parts[parts.length - 2] + ' ' + last;
    return norm(last);
  }

  var RULES = {
    Diagnostics: [
      [/\b(diagnosis|diagnosa|diagnostik|diagnosis banding|ddx)\b/, 6],
      [/\b(kemungkinan|dugaan|paling mungkin)\b.*\b(penyakit|kelainan|kondisi|penyebab|diagnosis|jenis|tipe)\b/, 5],
      [/\b(penyakit|kelainan|kondisi|sindrom|gangguan) (apa|apakah|yang)\b.*\b(diderita|dialami|paling)\b/, 5],
      [/\bpemeriksaan (penunjang|lanjutan|lanjut|awal|apa|yang (paling )?(tepat|sesuai|diperlukan|dianjurkan|perlu)|laboratorium|radiologi|fisik)\b/, 6],
      [/\b(interpretasi|hasil (pemeriksaan|laboratorium|lab|uji|tes)|temuan (klinis|laboratorium|fisik|radiologi)|gambaran (klinis|radiologi|radiologis|laboratorium|lab|ekg|foto)|kesan (pada )?foto|kesan radiologi)\b/, 5],
      [/\b(tanda|gejala|manifestasi) (khas|utama|patognomonik|yang (paling )?(sesuai|khas|mungkin)|klinis)\b/, 5],
      [/\b(kriteria diagnosis|klasifikasi|derajat|stadium|skor|grading|staging|gcs)\b/, 4],
      [/\b(uji|tes) (skrining|diagnostik|konfirmasi|penapisan)\b|\bgold standard\b|\bbaku emas\b/, 5],
      [/\b(pemeriksaan|uji|tes) (apa|apakah)\b/, 5],
      [/\b(ekg|rontgen|x ray|xray|ct scan|mri|usg|urinalisis|spirometri|kultur|biopsi|elektroforesis|apusan)\b.*\b(menunjukkan|tampak|ditemukan|terlihat)\b/, 3],
      [/\b(diduga|dicurigai) (menderita|mengalami)|menderita (sakit|penyakit|kelainan)|penyakit apa|kelainan (apa|apakah|yang)|apa yang (sedang )?(diderita|dialami)|menandakan|mengindikasikan|menunjukkan (adanya|kelainan)|tanda (apa|apakah)|gejala (apa|apakah)|kesan\b/, 5],
      [/\b(bakteri|kuman|patogen|mikroorganisme|parasit|virus|jamur) (apa|apakah|yang)\b|\bapa (bakteri|kuman|patogen)\b/, 5],
      [/\b(sampel|spesimen|bahan) (urin|darah|dahak|apa)\b|\bcara (pengambilan|pemeriksaan)\b/, 4],
      [/\b(komplikasi|prognosis|kriteria|grade)\b.*\b(kelainan|penyakit|trauma|gangguan|penderita)\b|\b(komplikasi|prognosis)\b/, 4],
      [/\bpemeriksaan [a-z ]{1,25} apa\b|\bevaluasi (klinis|awal)\b|\bpenilaian klinis\b|\bkriteria (jones|diagnosis|who|asia)\b/, 6]
    ],
    Pharmacology: [
      [/\b(terapi|tatalaksana|penatalaksanaan|manajemen|pengobatan|penanganan)\b/, 6],
      [/\b(obat|antibiotik|antibiotika|antidot|antihipertensi|analgesik|antikoagulan|diuretik|insulin|vaksin|imunisasi|profilaksis)\b/, 5],
      [/\b(dosis|efek samping|kontraindikasi|interaksi obat|mekanisme kerja|farmakokinetik|farmakodinamik|farmakologi|resep|diresepkan|rasional)\b/, 6],
      [/\b(diberikan|dianjurkan|disarankan|direkomendasikan)\b/, 3],
      [/\b(tindakan (yang )?(paling )?(tepat|selanjutnya|awal|pertama)|langkah (selanjutnya|awal|pertama|terapi)|pilihan (terapi|obat|tindakan)|lini pertama)\b/, 5],
      [/\b(diklofenac|ketoprofen|ibuprofen|parasetamol|paracetamol|aspirin|asam mefenamat|kortikosteroid|prednison|metformin|amoksisilin|ciprofloxacin|siprofloksasin|nsaid|oains|medikamentosa)\b/, 5],
      [/\btindakan (yang )?(diperlukan|dilakukan|harus|dapat|sebaiknya)|pertolongan|reposisi|imobilisasi|sebaiknya (dilakukan|diberikan)|edukasi (apa|yang)|konseling|rehabilitasi|pembedahan|operasi|dibutuhkan pasien\b/, 5]
    ],
    Physiology: [
      [/\b(mekanisme|patogenesis|patofisiologi|patogenik|fisiologi|fisiologis|homeostasis|regulasi|umpan balik|feedback)\b/, 6],
      [/\b(penyebab|etiologi|faktor risiko|faktor predisposisi|faktor yang (mempengaruhi|memengaruhi)|dipengaruhi|akibat|dampak|konsekuensi|alasan|mengapa|kenapa)\b/, 4],
      [/\b(bagaimana|apa) (proses|terjadinya|mekanisme|cara kerja)\b|\bproses (terjadinya|pembentukan|sintesis)\b/, 5],
      [/\b(hormon|enzim|metabolisme|reabsorpsi|filtrasi|sekresi|potensial aksi|kontraksi|ventilasi|perfusi|curah jantung|gfr|lfg|osmolaritas|asam basa|elektrolit)\b/, 3],
      [/\b(berperan|peran|fungsi utama|berfungsi|bertugas)\b/, 3],
      [/\b(patomekanisme|patologi (utama|dasar)|apa yang (akan )?terjadi|yang (akan )?terjadi (bila|jika|apabila)|terjadi (bila|jika|apabila)|menyebabkan)\b/, 5],
      [/\b(berpengaruh|pengaruh|mean arterial pressure|map)\b/, 4],
      [/\b(stroke volume|curah jantung|cardiac output|tekanan arteri rerata|klirens|clearance|osmolalitas|anion gap|kalkulasi|hitung|dihitung)\b/, 4]
    ],
    Anatomy: [
      [/\b(anatomi|anatomis|topografi)\b/, 6],
      [/\b(nervus|n\.|arteri|arteria|a\.|vena|v\.|otot|musculus|m\.|tulang|os\.?|ligamentum|lig\.|foramen|kanalis|canalis|fossa|processus|sulcus|gyrus|lobus|nukleus|nucleus|ganglion|pleksus|plexus|cabang)\b/, 3],
      [/\b(dipersarafi|persarafan|inervasi|vaskularisasi|diperdarahi|perdarahan oleh|origo|insersio|bersendi|persendian|kompartemen|hubungan anatomi|berbatasan|dilewati|melewati|terletak|letak|lokasi|posisi)\b/, 5],
      [/\b(saraf|nervus|otot|tendon|tulang|arteri|vena|ligamen|ligamentum|pembuluh darah) (apa|mana|yang|tersebut)\b/, 5],
      [/\bapa nama\b.*\b(otot|tulang|struktur|bagian|saraf|arteri|vena|sendi|tonjolan|ligamen)\b/, 6],
      [/\b(struktur|bagian) (apa|apakah|mana|manakah|yang)\b/, 4],
      [/\bmana (otot|tulang|saraf|arteri|vena|struktur)\b/, 5],
      [/\b(sendi|articulatio|pembuluh darah|bangunan|lengkung|lengkungan|zona|daerah|tonjolan|tulang tulang|menyusun|penyusun|ureter|uretra|kelenjar|bagian (lateral|medial|anterior|posterior|proksimal|distal))\b/, 3]
    ],
    Histology: [
      [/\b(histologi|histologis|histopatologi|histopatologis|mikroskop|mikroskopis|preparat|pewarnaan|hematoksilin|imunohistokimia)\b/, 8],
      [/\b(jenis|tipe) (sel|epitel|jaringan)\b|\bsel (apa|apakah|yang)\b|\bepitel\b|\bgambaran (mikroskopis|histologi|pa)\b/, 6],
      [/\b(patologi anatomi|pemeriksaan pa)\b/, 5],
      [/\bnama sel\b|\bsel progenitor\b|\bsel (punca|induk)\b|\b(glomerulosklerosis|glomerulus|sklerosis (fokal|segmental|global))\b/, 5]
    ],
    Recall: [
      [/\b(definisi|istilah|disebut|dikenal (sebagai|dengan)|yang dimaksud|pengertian|arti|singkatan|nama)\b/, 5],
      [/\b(berapa|berapakah|nilai (normal|rujukan)|angka|persentase|jumlah)\b/, 4],
      [/\b(prinsip|konsep|tujuan|fungsi (dari )?(program|puskesmas)|indikator|program|kebijakan|peraturan|undang|permenkes|standar)\b/, 4],
      [/\b(yang (bukan|tidak)|kecuali|bukan merupakan|tidak termasuk)\b/, 2]
    ]
  };

  function scoreAll(ask, stem, opts, stemWeight) {
    var scores = {};
    ORDER.forEach(function (k) { scores[k] = 0; });
    ORDER.forEach(function (k) {
      RULES[k].forEach(function (r) {
        if (r[0].test(ask)) scores[k] += r[1] * 2;           // kalimat tanya berbobot dua kali lipat
        else if (r[0].test(stem)) scores[k] += r[1] * stemWeight;  // konteks vignette: petunjuk lemah
      });
    });
    return scores;
  }

  // Koreksi terstruktur setelah skor dihitung.
  function adjust(scores, ask, stem, opts) {
    var optText = norm((opts || []).join(' | '));

    // Bila opsi terutama berisi nama penyakit/sindrom, soal tentang diagnosis walaupun kalimat tanyanya singkat.
    // (dilakukan hanya bila kalimat tanya tidak menyebut terapi/mekanisme)
    var asksTherapy = /\b(terapi|tatalaksana|penatalaksanaan|pengobatan|manajemen|obat)\b/.test(ask);
    var asksMech = /\b(mekanisme|patogenesis|patofisiologi|penyebab|etiologi|proses)\b/.test(ask);
    if (!asksTherapy && !asksMech && /\b(apa(kah)? (diagnosis|penyakit)|diagnosis (yang )?(paling )?(tepat|mungkin|sesuai))\b/.test(ask)) scores.Diagnostics += 6;

    // "Apa mekanisme kerja obat" -> Pharmacology, bukan Physiology
    if (/\bmekanisme kerja\b/.test(ask) || /\bmekanisme (aksi|obat)\b/.test(ask)) { scores.Pharmacology += 8; scores.Physiology -= 6; }

    // Kalimat tanya "penyebab ... paling mungkin" pada vignette klinis: tetap patofisiologi/etiologi, bukan diagnosis.
    if (/\bpenyebab\b/.test(ask) && !/\bdiagnosis\b/.test(ask)) scores.Physiology += 3;

    // Tanya nama struktur pada gambar/foto: anatomi
    if (/\b(ditunjuk|tanda panah|panah|gambar|foto)\b/.test(ask) && /\b(nama|struktur|bagian|tulang|otot|saraf)\b/.test(ask)) scores.Anatomy += 6;

    return scores;
  }

  function classify(q) {
    var stem = norm(q && q.soal);
    var ask = askOf(q && q.soal);
    var scores = adjust(scoreAll(ask, stem, q && q.opsi, 0.35), ask, stem, q && q.opsi);
    // Kalimat tanya kadang hanya "apa yang dimaksud?"; petunjuk sebenarnya ada di vignette.
    var mx = 0; ORDER.forEach(function (k) { if (k !== 'Recall' && scores[k] > mx) mx = scores[k]; });
    if (mx < 6) scores = adjust(scoreAll(ask, stem, q && q.opsi, 1.0), ask, stem, q && q.opsi);
    // Blok kedokteran komunitas/keluarga/Islam: pertanyaan tentang peran, penyebab, dan proses hampir selalu
    // bersifat kebijakan/konsep, bukan fisiologi organ. Redam sumbu ilmu dasar kecuali ada sinyal eksplisit.
    var blk = String((q && (q.block || q.bank)) || '').toLowerCase();
    if (/(kedkom|kedkel|mulsis)/.test(blk)) {
      var explicitBasic = /\b(fisiologi|patofisiologi|anatomi|histologi|mikroskop)\b/.test(ask);
      if (!explicitBasic) { scores.Physiology *= 0.25; scores.Anatomy *= 0.25; scores.Histology *= 0.25; }
    }
    var best = 'Recall', top = 0;
    ORDER.forEach(function (k) {
      if (scores[k] > top + 1e-9) { top = scores[k]; best = k; }
    });
    // Ambang: bila tidak ada sinyal berarti, itu soal pengetahuan umum
    if (top < 3) best = 'Recall';
    return { primary: best, scores: scores, ask: ask };
  }

  var api = { classify: classify, askOf: askOf, ORDER: ORDER };
  root.CLINED_ABILITY_CLASSIFIER = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
