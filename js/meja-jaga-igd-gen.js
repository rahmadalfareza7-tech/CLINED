/* CLINED · Meja Jaga IGD — Generator Kasus Acak SKDI Dokter Umum (4A / 3B / 3A).
   Menghasilkan pasien (wajah, nama, tanggal lahir, BB, alamat, NIK, RM) dan variasi
   kesalahan klinis/identitas secara prosedural dari templat terverifikasi sehingga
   diagnosis yang sama dapat memunculkan kesalahan yang berbeda-beda — praktis tidak habis.
   Dimuat lazy setelah js/meja-jaga-igd-data.js dan sebelum js/meja-jaga-igd.js. */
(() => {
  'use strict';

  const DATA = window.CLINED_IGD_DATA;
  if (!DATA) throw new Error('CLINED_IGD_DATA harus dimuat sebelum meja-jaga-igd-gen.js');
  const { GAME, WIL } = DATA;

  /* ================= UTILITAS ACAK & TANGGAL ================= */
  const pad2 = n => String(n).padStart(2, '0');
  const pad4 = n => String(n).padStart(4, '0');
  const dmy = iso => iso.split('-').reverse().join('-');
  const ageOf = iso => {
    const [y, m, d] = iso.split('-').map(Number);
    let a = GAME.y - y;
    if (GAME.m < m || (GAME.m === m && GAME.d < d)) a--;
    return a;
  };
  const randInt = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
  const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
  const pickOther = (rng, arr, exclude) => {
    const f = arr.filter(x => x !== exclude);
    return f.length ? pick(rng, f) : arr[0];
  };

  function makeDobForAge(rng, targetAge) {
    const m = randInt(rng, 1, 12);
    const maxD = m === 2 ? 28 : [4, 6, 9, 11].includes(m) ? 30 : 31;
    const d = randInt(rng, 1, maxD);
    let y = GAME.y - targetAge;
    if (m > GAME.m || (m === GAME.m && d > GAME.d)) y -= 1;
    return `${y}-${pad2(m)}-${pad2(d)}`;
  }

  function shiftDobYears(iso, deltaYears) {
    const [y, m, d] = iso.split('-').map(Number);
    return `${y + deltaYears}-${pad2(m)}-${pad2(d)}`;
  }

  /* ================= BANK IDENTITAS & WAJAH INDONESIA ================= */
  const MALE_FIRST = [
    'Adi','Agung','Ahmad','Akbar','Andi','Angga','Ardi','Arief','Bagus','Bambang',
    'Bayu','Budi','Cahyo','Darma','Dedi','Denny','Dimas','Dwi','Eko','Fajar',
    'Fikri','Galih','Hadi','Hendra','Ilham','Indra','Irfan','Joko','Kurnia','Lukman',
    'Nugroho','Pramono','Reza','Rizki','Rudi','Setiawan','Slamet','Taufik','Wahyu','Yusuf'
  ];
  const FEMALE_FIRST = [
    'Amalia','Anisa','Ayu','Citra','Desi','Dewi','Dian','Dinda','Dwi','Endang',
    'Evi','Fitri','Gita','Hani','Indah','Intan','Kartika','Laras','Lestari','Lina',
    'Maya','Mega','Melati','Murni','Nadia','Nita','Nur','Putri','Rahma','Ratih',
    'Ratna','Rina','Rini','Sari','Sinta','Siti','Sri','Tari','Wati','Yuliana'
  ];
  const BOY_FIRST = [
    'Abian','Alvaro','Arka','Azka','Bagas','Bima','Danu','Daffa','Farhan','Fathan',
    'Galang','Gilang','Hafiz','Kenzo','Maulana','Naufal','Rafa','Raka','Rasyid','Rayyan',
    'Rehan','Satria','Zidan','Zaki'
  ];
  const GIRL_FIRST = [
    'Aisyah','Alya','Aurel','Azzahra','Bilqis','Cinta','Fara','Gendis','Hana','Kayla',
    'Keisha','Khansa','Kirana','Laila','Mikayla','Nadia','Naila','Naura','Qaila','Rania',
    'Salma','Syifa','Yasmin','Zahra'
  ];
  const SURNAMES = [
    'Pratama','Saputra','Wijaya','Santoso','Nugroho','Kusuma','Hidayat','Setiawan',
    'Firmansyah','Ramadhan','Hakim','Mahendra','Wibowo','Gunawan','Permana','Utomo',
    'Kurniawan','Hartanto','Susanto','Suryadi','Lestari','Wulandari','Permata','Anggraini',
    'Rahmawati','Puspita','Salsabila','Handayani','Maharani','Kartini','Syahputra','Maulana',
    'Baskoro','Purnama','Herlambang','Nugraha'
  ];

  const STREETS = {
    '3273': { tl:'BANDUNG', kec:['01','05','07','10','12','16','18'],
      addr:['JL. CIHAMPELAS NO.','JL. DAGO ASRI NO.','JL. BUAH BATU NO.','JL. SUPRATMAN NO.','JL. ANTAPANI RAYA NO.','JL. SARIJADI BLOK B','JL. TERUSAN JAKARTA NO.','JL. PASTEUR GG. MELATI','JL. SUKAJADI NO.','JL. MERDEKA NO.'] },
    '3204': { tl:'BANDUNG', kec:['06','09','12','14','17','20'],
      addr:['KP. CILEUNYI RT','KP. BOJONGSOANG RT','JL. RAYA SOREANG NO.','KP. MAJALAYA RT','KP. BALEENDAH RT','KP. CIPARAY RT','JL. RAYA BANJARAN NO.'] },
    '3277': { tl:'CIMAHI', kec:['01','02','03'],
      addr:['JL. CIBABAT RAYA NO.','JL. GATOT SUBROTO NO.','JL. AMIR MACHMUD NO.','JL. LEUWIGAJAH NO.','JL. CITEUREUP NO.'] },
    '3275': { tl:'BEKASI', kec:['01','02','04','06','09'],
      addr:['JL. CUT MEUTIA NO.','JL. AHMAD YANI NO.','JL. KALIMALANG NO.','JL. BEKASI TIMUR NO.','PERUM HARAPAN INDAH BLOK C'] },
    '3201': { tl:'BOGOR', kec:['01','04','08','09','12'],
      addr:['JL. PAJAJARAN NO.','JL. SHOLIS ISKANDAR NO.','JL. DRAMAGA RAYA NO.','JL. RAYA CIBINONG NO.','PERUM BUMI SENTOSA NO.'] },
    '3205': { tl:'GARUT', kec:['01','03','05','08'],
      addr:['JL. AHMAD YANI GARUT NO.','KP. TAROGONG RT','JL. CIPANAS RAYA NO.','KP. SUKAHAJI RT','JL. OTISTA GARUT NO.'] }
  };
  const WIL_CODES = Object.keys(STREETS);
  const AGAMA = ['ISLAM','ISLAM','ISLAM','ISLAM','KRISTEN','KATOLIK','HINDU'];
  const GOLDAR = ['A','B','AB','O','O'];
  const KERJA_M = ['KARYAWAN SWASTA','WIRASWASTA','PEGAWAI NEGERI SIPIL','GURU','PEDAGANG','TEKNISI','SOPIR','BURUH'];
  const KERJA_F = ['KARYAWAN SWASTA','MENGURUS RUMAH TANGGA','GURU','WIRASWASTA','PEGAWAI NEGERI SIPIL','PERAWAT','PEDAGANG'];
  const KERJA_OLD = ['PENSIUNAN','MENGURUS RUMAH TANGGA','WIRASWASTA','PEDAGANG'];

  const DOC_SIGNS = ['dr. Rina Wijaya','dr. Aditya Pratama','dr. Nadia Kusuma','dr. Fajar Ramadhan','dr. Sinta Dewi','dr. Bayu Santoso'];
  const COASS_SIGNS = ['c. Reza','c. Putri','c. Bagas','c. Nabila','c. Faris','c. Dinda'];
  const DPJP_SIGNS = {
    pd: 'dr. Hendra, Sp.PD',
    jp: 'dr. Arman, Sp.JP',
    og: 'dr. Ratna, Sp.OG',
    a:  'dr. Bima, Sp.A',
    em: 'dr. Maria, Sp.EM'
  };

  const SHIRTS = ['#4a90d9','#55b884','#e0785a','#8a6cd8','#4ea3a3','#d99840','#c96b8e','#5d79a8','#6aa84f','#c9644a'];
  const HIJABS = ['#d86a92','#6b8fd4','#5ca98a','#9c78c8','#c98a5b','#4e7a96','#b85c75'];
  const HAIRS_M = ['short','spiky','side'];
  const HAIRS_M_OLD = ['bald','short','side'];
  const HAIRS_F = ['long','bob','side'];

  function genLook(rng, jk, ageNum) {
    const sk = randInt(rng, 0, 3);
    const shirt = pick(rng, SHIRTS);
    if (ageNum < 12) {
      return {
        sk,
        hair: jk === 'P' ? pick(rng, ['pig','bob','long']) : pick(rng, ['kid','short','spiky']),
        shirt,
        kid: 1,
        small: ageNum < 5 ? 1 : 0,
        blush: 1
      };
    }
    const old = ageNum >= 62 ? 1 : 0;
    if (jk === 'P') {
      const hijab = rng() < 0.45 ? pick(rng, HIJABS) : null;
      return {
        sk,
        hair: hijab ? undefined : pick(rng, HAIRS_F),
        hijab,
        shirt,
        old,
        glasses: rng() < (old ? 0.45 : 0.2) ? 1 : 0,
        blush: old ? 0 : (rng() < 0.4 ? 1 : 0)
      };
    }
    return {
      sk,
      hair: pick(rng, old ? HAIRS_M_OLD : HAIRS_M),
      shirt,
      old,
      must: rng() < (old ? 0.5 : 0.25) ? 1 : 0,
      glasses: rng() < (old ? 0.45 : 0.2) ? 1 : 0
    };
  }

  function genDifferentLook(rng, orig, jk, ageNum) {
    // Pastikan foto berbeda sangat jelas (kulit + rambut/jilbab + baju/atribut)
    const sk = (orig.sk + randInt(rng, 1, 2)) % 4;
    const shirt = pickOther(rng, SHIRTS, orig.shirt);
    if (ageNum < 12) {
      const hList = jk === 'P' ? ['pig','bob','long'] : ['kid','short','spiky'];
      return {
        sk,
        hair: pickOther(rng, hList, orig.hair),
        shirt,
        kid: 1,
        small: ageNum < 5 ? 1 : 0,
        blush: 1
      };
    }
    const old = ageNum >= 62 ? 1 : 0;
    if (jk === 'P') {
      const hijab = orig.hijab ? null : pick(rng, HIJABS);
      return {
        sk,
        hair: hijab ? undefined : pickOther(rng, HAIRS_F, orig.hair),
        hijab,
        shirt,
        old,
        glasses: orig.glasses ? 0 : 1
      };
    }
    return {
      sk,
      hair: pickOther(rng, old ? HAIRS_M_OLD : HAIRS_M, orig.hair),
      shirt,
      old,
      must: orig.must ? 0 : 1,
      glasses: orig.glasses ? 0 : 1
    };
  }

  function makeAddress(rng, wil) {
    const info = STREETS[wil];
    const base = pick(rng, info.addr);
    const suffix = base.endsWith('RT')
      ? ` ${pad2(randInt(rng, 1, 9))}/${pad2(randInt(rng, 1, 12))}`
      : ` ${randInt(rng, 4, 148)}`;
    return {
      wil,
      kec: pick(rng, info.kec),
      sn: pad4(randInt(rng, 1, 99)),
      tl: info.tl,
      alamat: base + suffix
    };
  }

  function makePatient(rng, opts, usedNames) {
    const jk = opts.jk || (rng() < 0.5 ? 'L' : 'P');
    const ageNum = randInt(rng, opts.minAge, opts.maxAge);
    const lahir = makeDobForAge(rng, ageNum);
    const isKid = ageNum < 17;

    let first, last, prefix, fullName;
    let tries = 0;
    do {
      first = isKid
        ? pick(rng, jk === 'L' ? BOY_FIRST : GIRL_FIRST)
        : pick(rng, jk === 'L' ? MALE_FIRST : FEMALE_FIRST);
      last = pick(rng, SURNAMES);
      prefix = isKid ? 'An.' : jk === 'L' ? 'Tn.' : (ageNum < 24 && !opts.married ? 'Nn.' : 'Ny.');
      fullName = `${prefix} ${first} ${last}`;
      tries++;
    } while (usedNames && usedNames.has(fullName) && tries < 60);
    if (usedNames) usedNames.add(fullName);

    let bbNum;
    if (opts.minBb && opts.maxBb) bbNum = randInt(rng, opts.minBb, opts.maxBb);
    else if (isKid) bbNum = Math.max(9, Math.min(48, Math.round(ageNum * 2.1 + 8 + randInt(rng, -1, 1))));
    else if (jk === 'L') bbNum = randInt(rng, 58, 80);
    else bbNum = randInt(rng, 48, 66);

    const wil = pick(rng, WIL_CODES);
    const addr = makeAddress(rng, wil);
    const rm = `${pad2(randInt(rng, 0, 9))}-${pad2(randInt(rng, 10, 98))}-${pad2(randInt(rng, 10, 98))}`;

    const ktp = {
      wil: addr.wil,
      kec: addr.kec,
      sn: addr.sn,
      tl: addr.tl,
      alamat: addr.alamat,
      agama: pick(rng, AGAMA),
      goldar: pick(rng, GOLDAR)
    };
    if (isKid) {
      const dadFirst = pickOther(rng, MALE_FIRST, first);
      ktp.kk = `${addr.wil}${addr.kec}${pad2(randInt(rng, 10, 28))}${pad2(randInt(rng, 1, 12))}${pad2(randInt(rng, 11, 19))}${pad4(randInt(rng, 1, 9))}`;
      ktp.kepala = `${dadFirst} ${last}`.toUpperCase();
    } else {
      ktp.kawin = opts.married ? 'KAWIN' : ageNum < 25 ? 'BELUM KAWIN' : (rng() < 0.75 ? 'KAWIN' : 'BELUM KAWIN');
      ktp.kerja = ageNum >= 62 ? pick(rng, KERJA_OLD) : pick(rng, jk === 'L' ? KERJA_M : KERJA_F);
    }

    const look = genLook(rng, jk, ageNum);
    const comp = isKid
      ? genLook(rng, rng() < 0.7 ? 'P' : 'L', randInt(rng, 28, 42))
      : (opts.withComp ? genLook(rng, jk === 'P' ? 'L' : 'P', randInt(rng, 26, 45)) : undefined);

    return {
      first, last, jk, ageNum, bbNum, isKid,
      pt: {
        nama: fullName,
        lahir,
        jk,
        rm,
        bb: `${bbNum} kg`,
        dx: opts.dx || '',
        alergi: opts.alergi || 'Tidak ada',
        cat: opts.cat || ''
      },
      ktp,
      appear: { look, comp, say: opts.say || 'Tolong diperiksa ya, Dok.' }
    };
  }

  /* ================= TEMPLAT SKENARIO KLINIS SKDI DOKTER UMUM =================
     Tiap skenario mendefinisikan:
     - id, label, profile (filter demografi)
     - safe(rng, used): menghasilkan 1 berkas klinis 100% AMAN (dipakai langsung sebagai
       kasus aman ATAU dibungkus mutator identitas/KTP keluarga/gelang/lab-id)
     - flaws: daftar varian kesalahan klinis yang bisa muncul untuk skenario yang SAMA!
       Setiap varian punya: id, errType, bucket ('clin'|'lab'), topic, build(rng, used)
  */

  const SCENARIOS = [
    /* 1. TONSILOFARINGITIS / RINOSINUSITIS BAKTERIAL (SKDI 4A) */
    {
      id: 'ispa_faringitis',
      safe(rng, used) {
        const useAllergySafe = rng() < 0.4;
        const p = makePatient(rng, {
          minAge: 19, maxAge: 54,
          dx: useAllergySafe ? 'Tonsilofaringitis akut bakterial' : 'Rinosinusitis bakterial akut',
          alergi: useAllergySafe ? 'PENISILIN (urtikaria luas & sesak, 2021)' : 'Tidak ada',
          cat: useAllergySafe ? 'Nyeri menelan 3 hari, demam 38,4 °C, eksudat tonsil (+)' : 'Nyeri pipi, ingus kental 10 hari, demam 38,2 °C',
          say: 'Tenggorokan sakit sekali buat menelan sejak kemarin, Dok.'
        }, used);
        return {
          type: 'resep', sign: pick(rng, DOC_SIGNS), flaw: null, topic: 'aman',
          tplId: useAllergySafe ? 'gen-ispa-safe-alergi' : 'gen-ispa-safe',
          scenarioId: 'ispa_faringitis', errorKind: 'aman',
          pt: p.pt, ktp: p.ktp, appear: p.appear,
          sections: [{ lines: useAllergySafe ? [
            { id:'l1', t:'R/ Azitromisin tab 500 mg', s:'S 1 dd tab I, 3 hari' },
            { id:'l2', t:'R/ Paracetamol tab 500 mg', s:'S 3 dd tab I k/p demam/nyeri' },
            { id:'l3', t:'R/ Edukasi: banyak minum air hangat & istirahat cukup', s:'' }
          ] : [
            { id:'l1', t:'R/ Amoksisilin tab 500 mg', s:'S 3 dd tab I, 7 hari' },
            { id:'l2', t:'R/ Paracetamol tab 500 mg', s:'S 3 dd tab I k/p demam/nyeri' },
            { id:'l3', t:'R/ Cuci hidung NaCl 0,9%', s:'S 2 dd semprot tiap lubang hidung' }
          ]}],
          why: useAllergySafe
            ? 'Aman! Meski pasien alergi penisilin, dokter sudah tepat memilih azitromisin (makrolida non-beta-laktam) dosis 500 mg 1×/hari selama 3 hari dan identitas cocok.'
            : 'Aman! Antibiotik, dosis dewasa, dan terapi simtomatis sesuai SKDI 4A tanpa alergi maupun kontraindikasi.'
        };
      },
      flaws: [
        {
          id: 'alergi_penisilin', errType: 'alergi-golongan', bucket: 'clin', topic: 'alergi',
          build(rng, used) {
            const drug = pick(rng, [
              { n:'R/ Amoksisilin tab 500 mg', s:'S 3 dd tab I, 7 hari', nm:'Amoksisilin' },
              { n:'R/ Amoksisilin–klavulanat (Co-amoxiclav) tab 625 mg', s:'S 3 dd tab I, 7 hari', nm:'Co-amoxiclav (amoksisilin–klavulanat)' }
            ]);
            const p = makePatient(rng, {
              minAge: 19, maxAge: 55,
              dx: 'Tonsilofaringitis bakterial / rinosinusitis akut',
              alergi: 'PENISILIN (anafilaksis, 2020)',
              cat: 'Nyeri menelan, demam 38,5 °C sejak 3 hari',
              say: 'Dok, saya dulu pernah sesak hebat setelah minum obat penisilin.'
            }, used);
            return {
              type: 'resep', sign: pick(rng, DOC_SIGNS), flaw: 'l1', topic: 'alergi',
              tplId: 'gen-ispa-alergi-penisilin', scenarioId: 'ispa_faringitis', errorKind: 'alergi-golongan',
              pt: p.pt, ktp: p.ktp, appear: p.appear,
              sections: [{ lines: [
                { id:'l1', t:drug.n, s:drug.s },
                { id:'l2', t:'R/ Paracetamol tab 500 mg', s:'S 3 dd tab I k/p demam' },
                { id:'l3', t:'R/ Edukasi: istirahat dan minum air hangat', s:'' }
              ]}],
              why: `Alergi satu golongan obat! ${drug.nm} adalah golongan penisilin. Pada pasien riwayat anafilaksis penisilin, pemberiannya kontraindikasi absolut (SKDI 4A). Pilih makrolida (azitromisin) atau klindamisin.`
            };
          }
        },
        {
          id: 'dosis_x10_amox', errType: 'dosis-x10', bucket: 'clin', topic: 'dosis',
          build(rng, used) {
            const p = makePatient(rng, {
              minAge: 19, maxAge: 54,
              dx: 'Tonsilofaringitis bakterial akut',
              cat: 'Nyeri menelan 3 hari, demam 38,3 °C',
              say: 'Tenggorokan perih dan badan meriang, Dok.'
            }, used);
            return {
              type: 'resep', sign: pick(rng, DOC_SIGNS), flaw: 'l1', topic: 'dosis',
              tplId: 'gen-ispa-dosis-x10', scenarioId: 'ispa_faringitis', errorKind: 'dosis-x10',
              pt: p.pt, ktp: p.ktp, appear: p.appear,
              sections: [{ lines: [
                { id:'l1', t:'R/ Amoksisilin 5.000 mg (5 g)', s:'S 3 dd 5.000 mg, 7 hari' },
                { id:'l2', t:'R/ Paracetamol tab 500 mg', s:'S 3 dd tab I k/p demam' },
                { id:'l3', t:'R/ Edukasi: minum cukup & istirahat', s:'' }
              ]}],
              why: 'Kesalahan dosis ×10! Dosis lazim amoksisilin dewasa adalah 500 mg tiap 8 jam (maks 3–4 g/hari). Menulis 5.000 mg tiap kali (= 15 g/hari) merupakan overdosis berat.'
            };
          }
        },
        {
          id: 'satuan_pct_g', errType: 'satuan-tertukar', bucket: 'clin', topic: 'dosis',
          build(rng, used) {
            const p = makePatient(rng, {
              minAge: 20, maxAge: 54,
              dx: 'Faringitis akut + demam',
              cat: 'Demam 38,6 °C, nyeri menelan sejak 2 hari',
              say: 'Badan panas dan tenggorokan nyeri, Dok.'
            }, used);
            return {
              type: 'resep', sign: pick(rng, DOC_SIGNS), flaw: 'l2', topic: 'dosis',
              tplId: 'gen-ispa-satuan-pct', scenarioId: 'ispa_faringitis', errorKind: 'satuan-tertukar',
              pt: p.pt, ktp: p.ktp, appear: p.appear,
              sections: [{ lines: [
                { id:'l1', t:'R/ Amoksisilin tab 500 mg', s:'S 3 dd tab I, 7 hari' },
                { id:'l2', t:'R/ Paracetamol 500 g', s:'S 3 dd 500 g k/p demam' },
                { id:'l3', t:'R/ Edukasi: minum air hangat', s:'' }
              ]}],
              why: 'Satuan mg dan g tertukar! 500 g sama dengan 500.000 mg (1.000× dosis lazim paracetamol 500 mg!). Batas maksimum paracetamol dewasa sehat hanya 4 g (4.000 mg) per hari.'
            };
          }
        },
        {
          id: 'rute_kumur_po', errType: 'rute-salah', bucket: 'clin', topic: 'dosis',
          build(rng, used) {
            const p = makePatient(rng, {
              minAge: 19, maxAge: 50,
              dx: 'Tonsilofaringitis akut',
              cat: 'Nyeri menelan, sariawan ringan',
              say: 'Tenggorokan serik dan agak nyeri menelan, Dok.'
            }, used);
            return {
              type: 'resep', sign: pick(rng, DOC_SIGNS), flaw: 'l2', topic: 'dosis',
              tplId: 'gen-ispa-rute-kumur', scenarioId: 'ispa_faringitis', errorKind: 'rute-salah',
              pt: p.pt, ktp: p.ktp, appear: p.appear,
              sections: [{ lines: [
                { id:'l1', t:'R/ Paracetamol tab 500 mg', s:'S 3 dd tab I k/p nyeri' },
                { id:'l2', t:'R/ Klorheksidin 0,2% larutan kumur', s:'S 3 dd 1 sendok makan (15 mL) DIMINUM (PO)' },
                { id:'l3', t:'R/ Edukasi: istirahat dan minum hangat', s:'' }
              ]}],
              why: 'Rute pemberian salah! Klorheksidin 0,2% adalah antiseptik topikal untuk BERKUMUR lalu dibuang — TIDAK boleh diminum/ditelan karena menyebabkan iritasi saluran cerna dan toksisitas.'
            };
          }
        }
      ]
    },

    /* 2. ASMA BRONKIAL / EKSASERBASI (SKDI 4A) */
    {
      id: 'asma_bronkial',
      safe(rng, used) {
        const p = makePatient(rng, {
          minAge: 19, maxAge: 58,
          dx: 'Asma eksaserbasi sedang',
          cat: 'Asma sejak remaja, mengi bilateral, SpO₂ awal 92%, berbicara dalam frasa',
          say: 'Dada agak sesak dan bunyi ngik sejak sore tadi, Dok.'
        }, used);
        return {
          type: 'instruksi', sign: pick(rng, DOC_SIGNS), flaw: null, topic: 'aman',
          tplId: 'gen-asma-safe', scenarioId: 'asma_bronkial', errorKind: 'aman',
          pt: p.pt, ktp: p.ktp, appear: p.appear,
          sections: [{ lines: [
            { id:'l1', cols:['Oksigen kanul nasal','3 L/menit','Inhalasi','Target SpO₂ 93–95%'] },
            { id:'l2', cols:['Nebulisasi Salbutamol + Ipratropium','2,5 mg + 0,5 mg','Inhalasi','Tiap 20 mnt (3 dosis awal)'] },
            { id:'l3', cols:['Prednison tablet','40 mg','PO','1×/hari selama 5 hari'] }
          ]}],
          why: 'Aman! Tatalaksana asma eksaserbasi sedang sesuai GINA/PDPI & SKDI 4A: O₂ target SpO₂ 93–95%, nebulisasi SABA + ipratropium tiap 20 menit, serta kortikosteroid sistemik dini.'
        };
      },
      flaws: [
        {
          id: 'kontra_propranolol', errType: 'kontra-komorbid', bucket: 'clin', topic: 'kontra',
          build(rng, used) {
            const p = makePatient(rng, {
              minAge: 20, maxAge: 55,
              dx: 'Asma persisten sedang, keluhan berdebar',
              cat: 'Asma sering kambuh malam hari, pakai inhaler rutin',
              say: 'Napas agak berat dan jantung terasa berdebar, Dok.'
            }, used);
            return {
              type: 'resep', sign: pick(rng, DOC_SIGNS), flaw: 'l2', topic: 'kontra',
              tplId: 'gen-asma-kontra-bb', scenarioId: 'asma_bronkial', errorKind: 'kontra-komorbid',
              pt: p.pt, ktp: p.ktp, appear: p.appear,
              sections: [{ lines: [
                { id:'l1', t:'R/ Salbutamol inhaler 100 mcg', s:'S prn 2 puff bila sesak' },
                { id:'l2', t:'R/ Propranolol tab 40 mg', s:'S 2 dd tab I (untuk berdebar)' },
                { id:'l3', t:'R/ Budesonid inhaler 200 mcg', s:'S 2 dd 1 puff, kumur setelah pakai' }
              ]}],
              why: 'Kontraindikasi komorbid! Propranolol adalah beta-blocker non-selektif (memblok reseptor β2 bronkus) sehingga dapat memicu bronkospasme berat pada pasien asma.'
            };
          }
        },
        {
          id: 'satuan_salbutamol_mg', errType: 'satuan-tertukar', bucket: 'clin', topic: 'dosis',
          build(rng, used) {
            const p = makePatient(rng, {
              minAge: 19, maxAge: 52,
              dx: 'Asma intermiten ringan',
              cat: 'Sesak ringan bila kena debu, tidak ada serangan berat',
              say: 'Inhaler asma saya habis, Dok, minta resep baru.'
            }, used);
            return {
              type: 'resep', sign: pick(rng, DOC_SIGNS), flaw: 'l1', topic: 'dosis',
              tplId: 'gen-asma-satuan-mcg-mg', scenarioId: 'asma_bronkial', errorKind: 'satuan-tertukar',
              pt: p.pt, ktp: p.ktp, appear: p.appear,
              sections: [{ lines: [
                { id:'l1', t:'R/ Salbutamol inhaler 100 mg/semprot', s:'S prn 2 puff bila sesak' },
                { id:'l2', t:'R/ Edukasi: teknik inhaler & hindari pencetus debu', s:'' }
              ]}],
              why: 'Satuan mcg dan mg tertukar! Dosis salbutamol MDI inhaler adalah 100 mcg/semprot, BUKAN 100 mg (= 100.000 mcg, 1.000× dosis normal!).'
            };
          }
        },
        {
          id: 'dosis_x10_salbutamol', errType: 'dosis-x10', bucket: 'clin', topic: 'dosis',
          build(rng, used) {
            const p = makePatient(rng, {
              minAge: 20, maxAge: 54,
              dx: 'Asma eksaserbasi ringan',
              cat: 'Batuk dan mengi ringan sejak pagi',
              say: 'Napas agak mengi dari pagi tadi, Dok.'
            }, used);
            return {
              type: 'resep', sign: pick(rng, DOC_SIGNS), flaw: 'l1', topic: 'dosis',
              tplId: 'gen-asma-dosis-x10', scenarioId: 'asma_bronkial', errorKind: 'dosis-x10',
              pt: p.pt, ktp: p.ktp, appear: p.appear,
              sections: [{ lines: [
                { id:'l1', t:'R/ Salbutamol tablet 40 mg', s:'S 3 dd tab I' },
                { id:'l2', t:'R/ Budesonid inhaler 200 mcg', s:'S 2 dd 1 puff, kumur setelah pakai' },
                { id:'l3', t:'R/ Edukasi: segera ke IGD bila sesak memberat', s:'' }
              ]}],
              why: 'Kesalahan dosis ×10! Dosis salbutamol oral dewasa hanya 2–4 mg tiap 6–8 jam (pilihan utama tetap inhaler). Menulis 40 mg per kali memicu tremor hebat, takikardia/aritmia, dan hipokalemia berat.'
            };
          }
        },
        {
          id: 'rute_nebu_iv', errType: 'rute-salah', bucket: 'clin', topic: 'dosis',
          build(rng, used) {
            const p = makePatient(rng, {
              minAge: 21, maxAge: 58,
              dx: 'Asma eksaserbasi sedang',
              cat: 'Mengi bilateral, RR 26, SpO₂ 93%',
              say: 'Sesak napas, Dok, tadi inhaler di rumah belum mempan.'
            }, used);
            return {
              type: 'instruksi', sign: pick(rng, DOC_SIGNS), flaw: 'l2', topic: 'dosis',
              tplId: 'gen-asma-rute-nebu-iv', scenarioId: 'asma_bronkial', errorKind: 'rute-salah',
              pt: p.pt, ktp: p.ktp, appear: p.appear,
              sections: [{ lines: [
                { id:'l1', cols:['Oksigen kanul nasal','3 L/menit','Inhalasi','Target SpO₂ 93–95%'] },
                { id:'l2', cols:['Salbutamol larutan nebulisasi','2,5 mg','IV bolus','Tiap 20 menit'] },
                { id:'l3', cols:['Prednison tablet','40 mg','PO','1×/hari selama 5 hari'] }
              ]}],
              why: 'Rute pemberian salah! Sediaan larutan nebulisasi salbutamol HANYA untuk inhalasi via nebulizer, TIDAK boleh disuntikkan IV bolus (berisiko aritmia fatal & toksisitas pembuluh darah).'
            };
          }
        }
      ]
    },

    /* 3. PASIEN RUTIN WARFARIN — INTERAKSI OBAT (WARFARIN + NSAID / KOTRIM / METRO) */
    {
      id: 'warfarin_interaksi',
      safe(rng, used) {
        const p = makePatient(rng, {
          minAge: 48, maxAge: 72,
          dx: 'Nyeri lutut (osteoartritis), riwayat fibrilasi atrium',
          cat: 'Rutin minum Warfarin 2 mg 1×/hari sejak 1 tahun lalu, tidak ada tanda perdarahan',
          say: 'Lutut saya ngilu, Dok. Saya tiap hari rutin minum warfarin pengencer darah.'
        }, used);
        return {
          type: 'resep', sign: pick(rng, DOC_SIGNS), flaw: null, topic: 'aman',
          tplId: 'gen-warfarin-safe', scenarioId: 'warfarin_interaksi', errorKind: 'aman',
          pt: p.pt, ktp: p.ktp, appear: p.appear,
          sections: [{ lines: [
            { id:'l1', t:'R/ Paracetamol tab 500 mg', s:'S 3 dd tab I k/p nyeri (maks 2 g/hari)' },
            { id:'l2', t:'R/ Kompres hangat & kurangi beban sendi lutut', s:'' },
            { id:'l3', t:'R/ Edukasi: hindari jamu/NSAID bebas, lapor bila gusi berdarah atau BAB hitam', s:'' }
          ]}],
          why: 'Aman! Pada pengguna warfarin rutin, paracetamol dosis rendah (≤ 2 g/hari) adalah analgesik yang jauh lebih aman daripada NSAID. Identitas dan edukasi tanda perdarahan juga tepat.'
        };
      },
      flaws: [
        {
          id: 'warfarin_nsaid', errType: 'interaksi-obat', bucket: 'clin', topic: 'kontra',
          build(rng, used) {
            const nsaid = pick(rng, [
              { n:'R/ Ibuprofen tab 400 mg', s:'S 3 dd tab I sesudah makan', nm:'Ibuprofen (NSAID)' },
              { n:'R/ Natrium diklofenak tab 50 mg', s:'S 3 dd tab I sesudah makan', nm:'Natrium diklofenak (NSAID)' }
            ]);
            const p = makePatient(rng, {
              minAge: 50, maxAge: 74,
              dx: 'Nyeri pinggang bawah / osteoartritis lutut',
              cat: 'Rutin minum Warfarin 2 mg 1×/hari (pengencer darah untuk fibrilasi atrium)',
              say: 'Pinggang saya pegal linu, Dok. Saya rutin minum warfarin setiap malam.'
            }, used);
            return {
              type: 'resep', sign: pick(rng, DOC_SIGNS), flaw: 'l1', topic: 'kontra',
              tplId: 'gen-interaksi-warfarin-nsaid', scenarioId: 'warfarin_interaksi', errorKind: 'interaksi-obat',
              pt: p.pt, ktp: p.ktp, appear: p.appear,
              sections: [{ lines: [
                { id:'l1', t:nsaid.n, s:nsaid.s },
                { id:'l2', t:'R/ Kompres hangat area nyeri', s:'S 2 dd 15 menit' },
                { id:'l3', t:'R/ Edukasi: kontrol poli Penyakit Dalam sesuai jadwal', s:'' }
              ]}],
              why: `Interaksi obat berat (Warfarin + NSAID)! ${nsaid.nm} merusak mukosa lambung, menghambat agregasi trombosit, dan meningkatkan efek antikoagulan warfarin → risiko perdarahan saluran cerna & perdarahan otak yang mengancam jiwa! Pilih paracetamol dosis terbatas atau terapi topikal.`
            };
          }
        },
        {
          id: 'warfarin_kotrim', errType: 'interaksi-obat', bucket: 'clin', topic: 'kontra',
          build(rng, used) {
            const p = makePatient(rng, {
              minAge: 48, maxAge: 72,
              dx: 'Infeksi saluran kemih bawah (sistitis akut)',
              cat: 'Rutin minum Warfarin 2 mg 1×/hari (riwayat katup jantung/AF)',
              say: 'Anyang-anyangan sejak 2 hari, Dok. Obat rutin saya warfarin.'
            }, used);
            return {
              type: 'resep', sign: pick(rng, DOC_SIGNS), flaw: 'l1', topic: 'kontra',
              tplId: 'gen-interaksi-warfarin-kotrim', scenarioId: 'warfarin_interaksi', errorKind: 'interaksi-obat',
              pt: p.pt, ktp: p.ktp, appear: p.appear,
              sections: [{ lines: [
                { id:'l1', t:'R/ Kotrimoksazol forte tab 960 mg', s:'S 2 dd tab I, 3 hari' },
                { id:'l2', t:'R/ Paracetamol tab 500 mg', s:'S 3 dd tab I k/p nyeri' },
                { id:'l3', t:'R/ Edukasi: banyak minum air putih', s:'' }
              ]}],
              why: 'Interaksi obat berat (Warfarin + Kotrimoksazol)! Kotrimoksazol menghambat metabolisme CYP2C9 warfarin sehingga kadar warfarin & INR melonjak drastis → risiko perdarahan hebat! Pilih antibiotik lain yang tidak berinteraksi kuat (mis. sefiksim/nitrofurantoin).'
            };
          }
        },
        {
          id: 'warfarin_metro', errType: 'interaksi-obat', bucket: 'clin', topic: 'kontra',
          build(rng, used) {
            const p = makePatient(rng, {
              minAge: 48, maxAge: 70,
              dx: 'Diare akut diduga amebiasis ringan',
              cat: 'Rutin minum Warfarin 3 mg 1×/hari (riwayat DVT)',
              say: 'Perut mulas dan BAB cair berlendir, Dok. Saya tiap hari minum warfarin.'
            }, used);
            return {
              type: 'resep', sign: pick(rng, DOC_SIGNS), flaw: 'l1', topic: 'kontra',
              tplId: 'gen-interaksi-warfarin-metro', scenarioId: 'warfarin_interaksi', errorKind: 'interaksi-obat',
              pt: p.pt, ktp: p.ktp, appear: p.appear,
              sections: [{ lines: [
                { id:'l1', t:'R/ Metronidazol tab 500 mg', s:'S 3 dd tab I, 7 hari (lanjutkan warfarin rutin seperti biasa)' },
                { id:'l2', t:'R/ Oralit 200 mL', s:'S tiap kali BAB cair' },
                { id:'l3', t:'R/ Edukasi: jaga kebersihan makanan', s:'' }
              ]}],
              why: 'Interaksi obat berat (Warfarin + Metronidazol)! Metronidazol menghambat metabolisme warfarin via CYP2C9 sehingga menaikkan INR drastis dan memicu perdarahan. Jangan diresepkan bersamaan tanpa penyesuaian dosis warfarin dan pantauan INR ketat.'
            };
          }
        }
      ]
    },

    /* 4. HIPERTENSI URGENSI / HIPERTENSI DERAJAT 2 (SKDI 4A / 3A) */
    {
      id: 'hipertensi',
      safe(rng, used) {
        const p = makePatient(rng, {
          minAge: 40, maxAge: 68,
          dx: 'Hipertensi urgensi',
          cat: 'Obat darah tinggi habis 1 minggu, TD 186/106 mmHg, tidak ada nyeri dada/defisit neurologis',
          say: 'Tengkuk terasa berat dan agak pusing sejak sore, Dok.'
        }, used);
        return {
          type: 'soap', sign: pick(rng, COASS_SIGNS), flaw: null, topic: 'aman',
          tplId: 'gen-ht-safe', scenarioId: 'hipertensi', errorKind: 'aman',
          pt: p.pt, ktp: p.ktp, appear: p.appear,
          sections: [
            { h:'S · Subjective', lines:[{ id:'s1', t:'Pusing dan tengkuk berat sejak sore. Obat antihipertensi habis 1 minggu.' }] },
            { h:'O · Objective', lines:[{ id:'o1', t:'TD 186/106 mmHg, N 84, RR 18, SpO₂ 99%. Tidak ada nyeri dada, sesak, maupun defisit neurologis.' }] },
            { h:'A · Assessment', lines:[{ id:'a1', t:'Hipertensi urgensi (tanpa kerusakan organ target akut).' }] },
            { h:'P · Plan', lines:[
              { id:'p1', t:'Kaptopril 25 mg PO (telan oral), observasi TD ulang 30–60 menit.' },
              { id:'p2', t:'Lanjutkan Amlodipin 10 mg PO 1×/hari dan edukasi kontrol rutin.' }
            ]}
          ],
          why: 'Aman! Hipertensi urgensi (SKDI 4A/3A) diturunkan bertahap dengan antihipertensi oral (kaptopril PO / amlodipin PO), bukan sublingual. Identitas dan seluruh rencana sudah tepat.'
        };
      },
      flaws: [
        {
          id: 'rute_nifedipin_sublingual', errType: 'rute-salah', bucket: 'clin', topic: 'dosis',
          build(rng, used) {
            const p = makePatient(rng, {
              minAge: 42, maxAge: 68,
              dx: 'Hipertensi urgensi',
              cat: 'TD 188/108 mmHg, tidak ada nyeri dada maupun defisit neurologis',
              say: 'Tensi saya tinggi sekali tadi di triase, Dok, pusing di tengkuk.'
            }, used);
            return {
              type: 'soap', sign: pick(rng, COASS_SIGNS), flaw: 'p1', topic: 'dosis',
              tplId: 'gen-ht-rute-nifedipin-sl', scenarioId: 'hipertensi', errorKind: 'rute-salah',
              pt: p.pt, ktp: p.ktp, appear: p.appear,
              sections: [
                { h:'S · Subjective', lines:[{ id:'s1', t:'Pusing dan tengkuk tegang sejak sore. Obat darah tinggi habis.' }] },
                { h:'O · Objective', lines:[{ id:'o1', t:'TD 188/108 mmHg, N 86, RR 18. Tidak ada defisit neurologis atau nyeri dada.' }] },
                { h:'A · Assessment', lines:[{ id:'a1', t:'Hipertensi urgensi.' }] },
                { h:'P · Plan', lines:[
                  { id:'p1', t:'Nifedipin kapsul 10 mg ditusuk lalu teteskan SUBLINGUAL di bawah lidah.' },
                  { id:'p2', t:'Observasi tekanan darah 30 menit, lalu edukasi minum obat rutin.' }
                ]}
              ],
              why: 'Rute pemberian salah & berbahaya! Nifedipin sublingual KONTRAINDIKASI pada hipertensi urgensi karena menurunkan TD mendadak tak terkendali sehingga memicu stroke iskemik atau infark miokard! Berikan antihipertensi oral (PO telan).'
            };
          }
        },
        {
          id: 'dosis_x10_amlodipin', errType: 'dosis-x10', bucket: 'clin', topic: 'dosis',
          build(rng, used) {
            const p = makePatient(rng, {
              minAge: 40, maxAge: 66,
              dx: 'Hipertensi derajat 2',
              cat: 'TD 166/98 mmHg, kontrol obat habis',
              say: 'Obat tensi saya habis, Dok, tadi tensi 166.'
            }, used);
            return {
              type: 'resep', sign: pick(rng, DOC_SIGNS), flaw: 'l1', topic: 'dosis',
              tplId: 'gen-ht-dosis-x10-amlodipin', scenarioId: 'hipertensi', errorKind: 'dosis-x10',
              pt: p.pt, ktp: p.ktp, appear: p.appear,
              sections: [{ lines: [
                { id:'l1', t:'R/ Amlodipin tab 50 mg', s:'S 1 dd tab I pagi hari' },
                { id:'l2', t:'R/ Edukasi: diet rendah garam & kontrol TD 2 minggu', s:'' }
              ]}],
              why: 'Kesalahan dosis ×10! Dosis lazim amlodipin dewasa hanya 5–10 mg 1×/hari (maks 10 mg/hari). Menulis 50 mg 1×/hari berisiko memicu vasodilatasi berat dan syok hipotensi!'
            };
          }
        },
        {
          id: 'satuan_amlodipin_g', errType: 'satuan-tertukar', bucket: 'clin', topic: 'dosis',
          build(rng, used) {
            const p = makePatient(rng, {
              minAge: 42, maxAge: 65,
              dx: 'Hipertensi derajat 2',
              cat: 'TD 164/96 mmHg, tidak ada keluhan nyeri dada',
              say: 'Mau kontrol obat tekanan darah, Dok.'
            }, used);
            return {
              type: 'resep', sign: pick(rng, DOC_SIGNS), flaw: 'l1', topic: 'dosis',
              tplId: 'gen-ht-satuan-amlodipin', scenarioId: 'hipertensi', errorKind: 'satuan-tertukar',
              pt: p.pt, ktp: p.ktp, appear: p.appear,
              sections: [{ lines: [
                { id:'l1', t:'R/ Amlodipin 10 g', s:'S 1 dd 10 g pagi hari' },
                { id:'l2', t:'R/ Edukasi: kurangi garam & olahraga ringan rutin', s:'' }
              ]}],
              why: 'Satuan mg dan g tertukar! 10 g sama dengan 10.000 mg (= 1.000× dosis maksimal amlodipin 10 mg/hari!).'
            };
          }
        }
      ]
    },

    /* 5. KEHAMILAN — ISK / HIPERTENSI / NYERI / TIFOID (SKDI 4A / 3A / 3B) */
    {
      id: 'kehamilan',
      safe(rng, used) {
        const isHt = rng() < 0.5;
        const wk = randInt(rng, 22, 32);
        const p = makePatient(rng, {
          jk: 'P', minAge: 22, maxAge: 36, married: true,
          dx: isHt ? `Hipertensi gestasional, G2P1A0 hamil ${wk} minggu` : `ISK bawah (sistitis), G1P0A0 hamil ${wk} minggu`,
          cat: isHt ? 'TD 148/94 mmHg, proteinuria (-), DJJ 146 x/mnt' : 'Nyeri saat BAK 2 hari, tidak ada demam tinggi/nyeri pinggang',
          say: isHt ? `Saya hamil ${wk} minggu, Dok, tensi agak naik tapi nggak pusing.` : `Saya hamil ${wk} minggu, Dok, sakit saat buang air kecil.`
        }, used);
        return {
          type: 'resep', sign: pick(rng, DOC_SIGNS), flaw: null, topic: 'aman',
          tplId: isHt ? 'gen-hamil-safe-ht' : 'gen-hamil-safe-isk',
          scenarioId: 'kehamilan', errorKind: 'aman',
          pt: p.pt, ktp: p.ktp, appear: p.appear,
          sections: [{ lines: isHt ? [
            { id:'l1', t:'R/ Metildopa tab 250 mg', s:'S 2 dd tab I' },
            { id:'l2', t:'R/ Edukasi: tanda bahaya preeklamsia & kontrol ANC 1 minggu', s:'' }
          ] : [
            { id:'l1', t:'R/ Sefiksim cap 200 mg', s:'S 2 dd cap I, 5 hari' },
            { id:'l2', t:'R/ Paracetamol tab 500 mg', s:'S 3 dd tab I k/p nyeri/demam' },
            { id:'l3', t:'R/ Edukasi: banyak minum air putih & jangan menahan BAK', s:'' }
          ]}],
          why: isHt
            ? 'Aman! Metildopa (atau nifedipin/labetalol) adalah antihipertensi lini pertama yang aman pada kehamilan (SKDI 3A).'
            : 'Aman! Sefiksim dan paracetamol aman untuk ISK ibu hamil (SKDI 4A), dosis tepat, dan identitas cocok.'
        };
      },
      flaws: [
        {
          id: 'kontra_hamil_ace_arb', errType: 'kontra-kehamilan', bucket: 'clin', topic: 'kontra',
          build(rng, used) {
            const wk = randInt(rng, 14, 26);
            const drug = pick(rng, [
              { t:'Kaptopril 25 mg PO, 2 kali sehari.', nm:'Kaptopril (ACE inhibitor)' },
              { t:'Candesartan 16 mg PO, 1 kali sehari.', nm:'Candesartan (ARB)' }
            ]);
            const p = makePatient(rng, {
              jk: 'P', minAge: 23, maxAge: 37, married: true,
              dx: `Hipertensi dalam kehamilan, G2P1A0 hamil ${wk} minggu`,
              cat: 'TD 150/96 mmHg, proteinuria negatif, DJJ 144 x/mnt',
              say: `Saya sedang hamil ${wk} minggu, Dok, tensinya naik.`
            }, used);
            return {
              type: 'soap', sign: pick(rng, COASS_SIGNS), flaw: 'p1', topic: 'kontra',
              tplId: 'gen-hamil-kontra-ace-arb', scenarioId: 'kehamilan', errorKind: 'kontra-kehamilan',
              pt: p.pt, ktp: p.ktp, appear: p.appear,
              sections: [
                { h:'S · Subjective', lines:[{ id:'s1', t:`Kontrol kehamilan ${wk} minggu, pusing ringan, tidak ada pandangan kabur.` }] },
                { h:'O · Objective', lines:[{ id:'o1', t:'TD 150/96 mmHg, N 84, RR 18, proteinuria negatif, DJJ 144 x/menit.' }] },
                { h:'A · Assessment', lines:[{ id:'a1', t:`Hipertensi dalam kehamilan non-berat (hamil ${wk} minggu).` }] },
                { h:'P · Plan', lines:[
                  { id:'p1', t:drug.t },
                  { id:'p2', t:'Edukasi tanda bahaya kehamilan dan kontrol ANC 1 minggu lagi.' }
                ]}
              ],
              why: `Kontraindikasi absolut kehamilan! ${drug.nm} bersifat fetotoksik (gagal ginjal janin, oligohidramnion, hipoplasia paru/tengkorak). Ganti ke metildopa, nifedipin, atau labetalol.`
            };
          }
        },
        {
          id: 'kontra_hamil_cipro', errType: 'kontra-kehamilan', bucket: 'clin', topic: 'kontra',
          build(rng, used) {
            const wk = randInt(rng, 16, 28);
            const p = makePatient(rng, {
              jk: 'P', minAge: 21, maxAge: 35, married: true,
              dx: `Infeksi saluran kemih bawah, G1P0A0 hamil ${wk} minggu`,
              cat: 'Nyeri BAK dan sering BAK sejak 2 hari',
              say: `Saya hamil ${wk} minggu, Dok, perih tiap buang air kecil.`
            }, used);
            return {
              type: 'resep', sign: pick(rng, DOC_SIGNS), flaw: 'l1', topic: 'kontra',
              tplId: 'gen-hamil-kontra-cipro', scenarioId: 'kehamilan', errorKind: 'kontra-kehamilan',
              pt: p.pt, ktp: p.ktp, appear: p.appear,
              sections: [{ lines: [
                { id:'l1', t:'R/ Siprofloksasin tab 500 mg', s:'S 2 dd tab I, 5 hari' },
                { id:'l2', t:'R/ Paracetamol tab 500 mg', s:'S 3 dd tab I k/p demam/nyeri' },
                { id:'l3', t:'R/ Edukasi: banyak minum air putih', s:'' }
              ]}],
              why: 'Kontraindikasi kehamilan! Siprofloksasin (fluorokuinolon) berisiko merusak kartilago/sendi janin. Untuk ISK ibu hamil (SKDI 4A), pilih sefiksim, amoksisilin–klavulanat, atau sefaleksin.'
            };
          }
        },
        {
          id: 'kontra_hamil_nsaid', errType: 'kontra-kehamilan', bucket: 'clin', topic: 'kontra',
          build(rng, used) {
            const wk = randInt(rng, 29, 35);
            const nsaid = pick(rng, [
              { t:'R/ Ibuprofen tab 400 mg', s:'S 3 dd tab I sesudah makan', nm:'Ibuprofen' },
              { t:'R/ Natrium diklofenak tab 50 mg', s:'S 2 dd tab I sesudah makan', nm:'Natrium diklofenak' }
            ]);
            const p = makePatient(rng, {
              jk: 'P', minAge: 22, maxAge: 36, married: true,
              dx: `Nyeri punggung bawah, G2P1A0 hamil ${wk} minggu`,
              cat: 'Nyeri pegal pinggang, tidak ada kontraksi maupun keluar cairan',
              say: `Saya hamil ${wk} minggu, Dok, pinggang pegal banget.`
            }, used);
            return {
              type: 'resep', sign: pick(rng, DOC_SIGNS), flaw: 'l1', topic: 'kontra',
              tplId: 'gen-hamil-kontra-nsaid', scenarioId: 'kehamilan', errorKind: 'kontra-kehamilan',
              pt: p.pt, ktp: p.ktp, appear: p.appear,
              sections: [{ lines: [
                { id:'l1', t:nsaid.t, s:nsaid.s },
                { id:'l2', t:'R/ Edukasi: kompres hangat punggung & tidur miring kiri', s:'' }
              ]}],
              why: `Kontraindikasi kehamilan trimester 3! ${nsaid.nm} (NSAID) pada usia kehamilan ≥ 20 minggu / trimester 3 berisiko menutup duktus arteriosus janin secara prematur dan memicu oligohidramnion! Pilih paracetamol.`
            };
          }
        },
        {
          id: 'kontra_hamil_kloram', errType: 'kontra-kehamilan', bucket: 'clin', topic: 'kontra',
          build(rng, used) {
            const wk = randInt(rng, 28, 34);
            const p = makePatient(rng, {
              jk: 'P', minAge: 22, maxAge: 35, married: true,
              dx: `Demam tifoid tanpa komplikasi, G1P0A0 hamil ${wk} minggu`,
              cat: 'Demam 6 hari naik sore–malam, lidah kotor, masih mau makan-minum',
              say: `Saya hamil ${wk} minggu, Dok, demam terus tiap sore hampir seminggu.`
            }, used);
            return {
              type: 'resep', sign: pick(rng, DOC_SIGNS), flaw: 'l1', topic: 'kontra',
              tplId: 'gen-hamil-kontra-kloram', scenarioId: 'kehamilan', errorKind: 'kontra-kehamilan',
              pt: p.pt, ktp: p.ktp, appear: p.appear,
              sections: [{ lines: [
                { id:'l1', t:'R/ Kloramfenikol cap 500 mg', s:'S 4 dd cap I, 10 hari' },
                { id:'l2', t:'R/ Paracetamol tab 500 mg', s:'S 3 dd tab I k/p demam' },
                { id:'l3', t:'R/ Edukasi: tirah baring & diet lunak', s:'' }
              ]}],
              why: 'Kontraindikasi kehamilan trimester 3! Kloramfenikol menembus plasenta dan berisiko memicu gray baby syndrome serta supresi sumsum tulang janin. Untuk demam tifoid ibu hamil (SKDI 4A), pilih amoksisilin, sefiksim, atau seftriakson.'
            };
          }
        }
      ]
    },

    /* 6. PEDIATRI: DEMAM / ISPA / VARISELA / IMPETIGO / DIARE / KEJANG (SKDI 4A) */
    {
      id: 'pediatri_umum',
      safe(rng, used) {
        const mode = pick(rng, ['pct', 'diare']);
        const p = makePatient(rng, {
          minAge: mode === 'diare' ? 2 : 3,
          maxAge: mode === 'diare' ? 4 : 9,
          dx: mode === 'diare' ? 'Diare akut dehidrasi ringan–sedang' : 'ISPA akut dengan demam',
          cat: mode === 'diare' ? 'BAB cair 5×, masih mau minum, mata agak cekung, tidak berdarah' : 'Demam 2 hari 38,4 °C, batuk pilek, aktif',
          say: mode === 'diare' ? 'Anak saya mencret dari kemarin, Dok, tapi masih mau minum.' : 'Anak saya demam dan pilek sejak kemarin, Dok.'
        }, used);
        const bb = p.bbNum;
        if (mode === 'diare') {
          const oralitMl = 75 * bb;
          return {
            type: 'soap', sign: pick(rng, COASS_SIGNS), flaw: null, topic: 'aman',
            tplId: 'gen-anak-safe-diare', scenarioId: 'pediatri_umum', errorKind: 'aman',
            pt: p.pt, ktp: p.ktp, appear: p.appear,
            sections: [
              { h:'S · Subjective', lines:[{ id:'s1', t:'Diare cair 5 kali sejak kemarin, muntah 1 kali, masih mau minum.' }] },
              { h:'O · Objective', lines:[{ id:'o1', t:`BB ${bb} kg, suhu 37,8 °C, mata sedikit cekung, turgor kembali lambat, CRT < 2 detik.` }] },
              { h:'A · Assessment', lines:[{ id:'a1', t:'Diare akut dehidrasi ringan–sedang, tanpa tanda disentri.' }] },
              { h:'P · Plan', lines:[
                { id:'p1', t:`Terapi B: Oralit ${oralitMl} mL (75 mL/kgBB) diminum bertahap dalam 3 jam di IGD.` },
                { id:'p2', t:'Zinc 20 mg PO 1×/hari selama 10 hari. Lanjutkan makan/ASI, edukasi tanda bahaya.' }
              ]}
            ],
            why: `Aman! Terapi B WHO/IDAI (SKDI 4A) tepat: oralit 75 × ${bb} kg = ${oralitMl} mL dalam 3 jam, zinc 20 mg/hari selama 10 hari (usia ≥ 6 bulan), dan KIA anak < 5 th memang tanpa foto.`
          };
        }
        const pctMg = Math.round(bb * 12 / 10) * 10; // ~12 mg/kg (di tengah rentang 10-15)
        const pctMl = (pctMg / 24).toFixed(1).replace('.', ','); // sirup 120 mg/5 mL = 24 mg/mL
        return {
          type: 'resep', sign: pick(rng, DOC_SIGNS), flaw: null, topic: 'aman',
          tplId: 'gen-anak-safe-pct', scenarioId: 'pediatri_umum', errorKind: 'aman',
          pt: p.pt, ktp: p.ktp, appear: p.appear,
          sections: [{ lines: [
            { id:'l1', t:`R/ Paracetamol sirup 120 mg/5 mL`, s:`S 3–4 dd ${pctMl} mL (±${pctMg} mg/kali) k/p demam` },
            { id:'l2', t:'R/ NaCl 0,9% tetes hidung', s:'S 3 dd 2 tetes tiap lubang hidung' },
            { id:'l3', t:'R/ Edukasi: minum cukup & segera kembali bila sesak/kejang', s:'' }
          ]}],
          why: `Aman! Dosis paracetamol anak ${pctMg} mg untuk BB ${bb} kg berada tepat di rentang 10–15 mg/kgBB/kali (±${Math.round(pctMg/bb)} mg/kg/kali), sesuai SKDI 4A.`
        };
      },
      flaws: [
        {
          id: 'dosis_x10_anak_pct', errType: 'dosis-x10', bucket: 'clin', topic: 'dosis',
          build(rng, used) {
            const p = makePatient(rng, {
              minAge: 2, maxAge: 5, minBb: 12, maxBb: 16,
              dx: 'Demam 2 hari, ISPA akut',
              cat: 'Suhu 38,5 °C, batuk pilek ringan',
              say: 'Anak saya badannya panas dari kemarin malam, Dok.'
            }, used);
            const bb = p.bbNum;
            const normal = bb * 15;
            const overd = normal * 10;
            return {
              type: 'resep', sign: pick(rng, DOC_SIGNS), flaw: 'l1', topic: 'dosis',
              tplId: 'gen-anak-dosis-x10-pct', scenarioId: 'pediatri_umum', errorKind: 'dosis-x10',
              pt: p.pt, ktp: p.ktp, appear: p.appear,
              sections: [{ lines: [
                { id:'l1', t:`R/ Paracetamol ${overd.toLocaleString('id-ID')} mg`, s:`S 3 dd ${overd.toLocaleString('id-ID')} mg k/p demam` },
                { id:'l2', t:'R/ NaCl 0,9% tetes hidung', s:'S 3 dd 2 tetes tiap lubang hidung' },
                { id:'l3', t:'R/ Edukasi: kompres hangat & cukup cairan', s:'' }
              ]}],
              why: `Overdosis ×10 yang fatal! Dosis paracetamol anak adalah 10–15 mg/kgBB/kali (untuk BB ${bb} kg hanya ${bb*10}–${normal} mg/kali). Menulis ${overd.toLocaleString('id-ID')} mg memicu nekrosis hati akut!`
            };
          }
        },
        {
          id: 'kontra_anak_aspirin', errType: 'kontra-komorbid', bucket: 'clin', topic: 'kontra',
          build(rng, used) {
            const p = makePatient(rng, {
              minAge: 5, maxAge: 10,
              dx: 'Varisela (cacar air) hari ke-2',
              cat: 'Demam 38,4 °C, muncul lenting berair gatal di badan dan wajah',
              say: 'Anak saya kena cacar air dan demam, Dok.'
            }, used);
            return {
              type: 'resep', sign: pick(rng, DOC_SIGNS), flaw: 'l1', topic: 'kontra',
              tplId: 'gen-anak-kontra-aspirin', scenarioId: 'pediatri_umum', errorKind: 'kontra-komorbid',
              pt: p.pt, ktp: p.ktp, appear: p.appear,
              sections: [{ lines: [
                { id:'l1', t:'R/ Aspirin tab 500 mg', s:'S 3 dd ½ tab k/p demam' },
                { id:'l2', t:'R/ Losion kalamin', s:'S oles tipis pada lenting yang gatal' },
                { id:'l3', t:'R/ Edukasi: minum cukup & jangan menggaruk vesikel', s:'' }
              ]}],
              why: 'Kontraindikasi pediatri! Aspirin dilarang pada anak/remaja dengan infeksi virus (varisela/influenza) karena risiko Sindrom Reye (ensefalopati akut & gagal hati berat). Gunakan paracetamol sesuai BB.'
            };
          }
        },
        {
          id: 'kontra_anak_doksi', errType: 'kontra-komorbid', bucket: 'clin', topic: 'kontra',
          build(rng, used) {
            const p = makePatient(rng, {
              minAge: 5, maxAge: 7,
              dx: 'Impetigo krustosa / pioderma luas',
              cat: 'Koreng bernanah di tungkai, tidak demam tinggi',
              say: 'Koreng di kaki anak saya makin banyak, Dok.'
            }, used);
            return {
              type: 'resep', sign: pick(rng, DOC_SIGNS), flaw: 'l1', topic: 'kontra',
              tplId: 'gen-anak-kontra-doksi', scenarioId: 'pediatri_umum', errorKind: 'kontra-komorbid',
              pt: p.pt, ktp: p.ktp, appear: p.appear,
              sections: [{ lines: [
                { id:'l1', t:'R/ Doksisiklin cap 100 mg', s:'S 2 dd cap I, 7 hari' },
                { id:'l2', t:'R/ Kompres NaCl 0,9% hangat pada krusta', s:'S 2 dd 10 menit' },
                { id:'l3', t:'R/ Edukasi: jaga kebersihan kulit & potong kuku', s:'' }
              ]}],
              why: `Kontraindikasi anak < 8 tahun! Doksisiklin (tetrasiklin) merusak pertumbuhan tulang dan menyebabkan pewarnaan gigi permanen pada anak usia ${p.ageNum} th (ditambah dosisnya dosis dewasa!). Pilih sefaleksin atau amoksisilin–klavulanat anak.`
            };
          }
        },
        {
          id: 'kontra_anak_tramadol', errType: 'kontra-komorbid', bucket: 'clin', topic: 'kontra',
          build(rng, used) {
            const p = makePatient(rng, {
              minAge: 6, maxAge: 10,
              dx: 'Luka robek tungkai pasca-jahit',
              cat: 'Luka sudah dijahit rapi 3 jahitan, pasien mengeluh nyeri',
              say: 'Kaki anak saya masih terasa nyeri habis dijahit, Dok.'
            }, used);
            return {
              type: 'resep', sign: pick(rng, DOC_SIGNS), flaw: 'l1', topic: 'kontra',
              tplId: 'gen-anak-kontra-tramadol', scenarioId: 'pediatri_umum', errorKind: 'kontra-komorbid',
              pt: p.pt, ktp: p.ktp, appear: p.appear,
              sections: [{ lines: [
                { id:'l1', t:'R/ Tramadol cap 50 mg', s:'S 3 dd cap I k/p nyeri' },
                { id:'l2', t:'R/ Rawat luka steril & jaga tetap kering', s:'' },
                { id:'l3', t:'R/ Kontrol lepas jahitan hari ke-7', s:'' }
              ]}],
              why: `Kontraindikasi anak < 12 tahun! Tramadol dilarang pada anak usia ${p.ageNum} th (peringatan BPOM/FDA) karena metabolisme CYP2D6 ultra-cepat dapat memicu depresi napas fatal. Berikan paracetamol/ibuprofen sesuai BB.`
            };
          }
        },
        {
          id: 'kontra_anak_loperamid', errType: 'kontra-komorbid', bucket: 'clin', topic: 'kontra',
          build(rng, used) {
            const p = makePatient(rng, {
              minAge: 2, maxAge: 4,
              dx: 'Diare akut tanpa dehidrasi',
              cat: 'BAB cair 4 kali sejak pagi, anak aktif & mau minum',
              say: 'Anak saya mencret dari pagi, Dok, minta obat biar langsung mampet.'
            }, used);
            return {
              type: 'resep', sign: pick(rng, DOC_SIGNS), flaw: 'l2', topic: 'kontra',
              tplId: 'gen-anak-kontra-loperamid', scenarioId: 'pediatri_umum', errorKind: 'kontra-komorbid',
              pt: p.pt, ktp: p.ktp, appear: p.appear,
              sections: [{ lines: [
                { id:'l1', t:'R/ Oralit', s:'S 100 mL tiap kali BAB cair' },
                { id:'l2', t:'R/ Loperamid tab 2 mg', s:'S 3 dd tab I sampai BAB berhenti' },
                { id:'l3', t:'R/ Zinc tab dispersibel 20 mg', s:'S 1 dd tab I selama 10 hari' }
              ]}],
              why: 'Kontraindikasi diare anak! Loperamid (antimotilitas) dilarang pada anak balita karena berisiko memicu ileus paralitik, megakolon toksik, dan depresi susunan saraf pusat. Tatalaksana diare anak WHO/IDAI cukup oralit + zinc + nutrisi!'
            };
          }
        }
      ]
    },

    /* 7. ANAFILAKSIS (SKDI 4A) */
    {
      id: 'anafilaksis',
      safe(rng, used) {
        const p = makePatient(rng, {
          minAge: 20, maxAge: 48,
          dx: 'Reaksi anafilaksis pasca-makan udang',
          alergi: 'SEAFOOD / UDANG (anafilaksis)',
          cat: 'Bibir bengkak, urtikaria seluruh tubuh, mengi, TD 86/54 mmHg',
          say: 'Tenggorokan seperti tercekik setelah makan udang tadi, Dok...'
        }, used);
        return {
          type: 'instruksi', sign: DPJP_SIGNS.em, flaw: null, topic: 'aman',
          tplId: 'gen-anafilaksis-safe', scenarioId: 'anafilaksis', errorKind: 'aman',
          pt: p.pt, ktp: p.ktp, appear: p.appear,
          sections: [{ lines: [
            { id:'l1', cols:['Epinefrin 1:1.000 (1 mg/mL)','0,5 mg','IM paha lateral','Segera, ulang tiap 5–15 mnt bila perlu'] },
            { id:'l2', cols:['Oksigen NRM + NaCl 0,9%','10 L/mnt + 500 mL','Inhalasi + IV','Guyur cepat, posisi supinasi tungkai naik'] },
            { id:'l3', cols:['Metilprednisolon + Difenhidramin','125 mg + 50 mg','IV pelan','Adjuvan setelah epinefrin'] }
          ]}],
          why: 'Aman! Tatalaksana anafilaksis (SKDI 4A) tepat: epinefrin 1:1.000 dosis 0,3–0,5 mg IM di paha anterolateral sebagai lini pertama, oksigen + kristaloid cepat, dan steroid/antihistamin hanya adjuvan.'
        };
      },
      flaws: [
        {
          id: 'rute_epi_iv', errType: 'rute-salah', bucket: 'clin', topic: 'dosis',
          build(rng, used) {
            const p = makePatient(rng, {
              minAge: 20, maxAge: 48,
              dx: 'Reaksi anafilaksis pasca-sengatan lebah',
              cat: 'Urtikaria luas, mengi, pusing, TD 88/56 mmHg',
              say: 'Habis disengat lebah langsung sesak dan bentol semua, Dok!'
            }, used);
            return {
              type: 'instruksi', sign: DPJP_SIGNS.em, flaw: 'l1', topic: 'dosis',
              tplId: 'gen-anafilaksis-rute-iv', scenarioId: 'anafilaksis', errorKind: 'rute-salah',
              pt: p.pt, ktp: p.ktp, appear: p.appear,
              sections: [{ lines: [
                { id:'l1', cols:['Epinefrin 1:1.000 (1 mg/mL)','1 mg','IV bolus cepat','Segera'] },
                { id:'l2', cols:['Oksigen NRM + NaCl 0,9%','10 L/mnt + 500 mL','Inhalasi + IV','Guyur cepat'] },
                { id:'l3', cols:['Difenhidramin','50 mg','IV pelan','Adjuvan'] }
              ]}],
              why: 'Rute salah & overdosis fatal! Pada anafilaksis, epinefrin 1:1.000 WAJIB diberikan IM di paha anterolateral (dewasa 0,3–0,5 mg). Menyuntikkan 1:1.000 IV bolus cepat memicu aritmia ventrikel fatal & krisis hipertensi!'
            };
          }
        },
        {
          id: 'satuan_epi_g', errType: 'satuan-tertukar', bucket: 'clin', topic: 'dosis',
          build(rng, used) {
            const p = makePatient(rng, {
              minAge: 21, maxAge: 46,
              dx: 'Reaksi anafilaksis pasca-makan kacang',
              alergi: 'KACANG (anafilaksis)',
              cat: 'Bibir bengkak, mengi, TD 88/58 mmHg',
              say: 'Sesak dan bentol seluruh badan habis makan saus kacang, Dok!'
            }, used);
            return {
              type: 'instruksi', sign: DPJP_SIGNS.em, flaw: 'l1', topic: 'dosis',
              tplId: 'gen-anafilaksis-satuan-g', scenarioId: 'anafilaksis', errorKind: 'satuan-tertukar',
              pt: p.pt, ktp: p.ktp, appear: p.appear,
              sections: [{ lines: [
                { id:'l1', cols:['Epinefrin 1:1.000','0,5 g','IM paha lateral','Segera'] },
                { id:'l2', cols:['Oksigen NRM + NaCl 0,9%','10 L/mnt + 500 mL','Inhalasi + IV','Guyur cepat'] }
              ]}],
              why: 'Satuan mg dan g tertukar! 0,5 g = 500 mg (= 1.000× dosis normal epinefrin anafilaksis 0,3–0,5 mg IM!).'
            };
          }
        }
      ]
    },

    /* 8. NYERI DADA / SKA / ANGINA (SKDI 3B) */
    {
      id: 'nyeri_dada',
      safe(rng, used) {
        const p = makePatient(rng, {
          minAge: 48, maxAge: 68,
          dx: 'Nyeri dada akut (STEMI anterior)',
          cat: 'Hipertensi tidak rutin kontrol, nyeri dada kiri 40 menit menjalar ke lengan kiri',
          say: 'Dada kiri saya seperti ditindih beban berat sejak 40 menit lalu, Dok...'
        }, used);
        return {
          type: 'soap', sign: pick(rng, COASS_SIGNS), flaw: null, topic: 'aman',
          tplId: 'gen-ska-safe', scenarioId: 'nyeri_dada', errorKind: 'aman',
          pt: p.pt, ktp: p.ktp, appear: p.appear,
          sections: [
            { h:'S · Subjective', lines:[{ id:'s1', t:'Nyeri dada kiri menekan menjalar ke lengan kiri 40 menit disertai keringat dingin.' }] },
            { h:'O · Objective', lines:[{ id:'o1', t:'TD 148/90, N 94, RR 20, SpO₂ 97% udara ruang. EKG: ST elevasi V1–V4.' }] },
            { h:'A · Assessment', lines:[{ id:'a1', t:'STEMI anterior.' }] },
            { h:'P · Plan', lines:[
              { id:'p1', t:'Aspirin 320 mg kunyah + Clopidogrel 300 mg loading.' },
              { id:'p2', t:'O₂ tidak perlu (SpO₂ ≥ 90%). Pasang IV line & segera rujuk Sp.JP untuk reperfusi.' }
            ]}
          ],
          why: 'Aman! Tatalaksana awal STEMI (SKDI 3B / PERKI) sudah tepat: antiplatelet ganda (aspirin kunyah + clopidogrel loading), tidak perlu oksigen rutin bila SpO₂ ≥ 90%, dan rujuk reperfusi segera.'
        };
      },
      flaws: [
        {
          id: 'interaksi_isdn_sildenafil', errType: 'interaksi-obat', bucket: 'clin', topic: 'kontra',
          build(rng, used) {
            const p = makePatient(rng, {
              jk: 'L', minAge: 46, maxAge: 68,
              dx: 'Nyeri dada akut (suspek SKA)',
              cat: 'Minum sildenafil 50 mg 3 jam sebelum datang ke IGD',
              say: 'Dada saya terasa berat, Dok. Jujur, 3 jam lalu saya sempat minum obat kuat sildenafil.'
            }, used);
            return {
              type: 'instruksi', sign: DPJP_SIGNS.jp, flaw: 'l2', topic: 'kontra',
              tplId: 'gen-ska-interaksi-sildenafil', scenarioId: 'nyeri_dada', errorKind: 'interaksi-obat',
              pt: p.pt, ktp: p.ktp, appear: p.appear,
              sections: [{ lines: [
                { id:'l1', cols:['Aspirin kunyah','320 mg','PO','Loading segera'] },
                { id:'l2', cols:['ISDN (Isosorbid dinitrat)','5 mg','Sublingual','Ulang tiap 5 menit bila nyeri'] },
                { id:'l3', cols:['EKG 12 sadapan + konsul Sp.JP','—','—','Segera'] }
              ]}],
              why: 'Interaksi obat mematikan! Nitrat (ISDN/nitrogliserin) KONTRAINDIKASI absolut dalam 24 jam setelah sildenafil (48 jam setelah tadalafil) karena sinergi cGMP memicu hipotensi berat yang fatal!'
            };
          }
        },
        {
          id: 'dosis_x10_isdn', errType: 'dosis-x10', bucket: 'clin', topic: 'dosis',
          build(rng, used) {
            const p = makePatient(rng, {
              minAge: 48, maxAge: 68,
              dx: 'Angina pektoris stabil',
              cat: 'Nyeri dada saat naik tangga, mereda saat istirahat, TD 136/84 mmHg, tidak minum sildenafil',
              say: 'Dada sering nyeri sebentar kalau kecapekan jalan, Dok.'
            }, used);
            return {
              type: 'resep', sign: pick(rng, DOC_SIGNS), flaw: 'l1', topic: 'dosis',
              tplId: 'gen-ska-dosis-x10-isdn', scenarioId: 'nyeri_dada', errorKind: 'dosis-x10',
              pt: p.pt, ktp: p.ktp, appear: p.appear,
              sections: [{ lines: [
                { id:'l1', t:'R/ ISDN (Isosorbid dinitrat) 50 mg', s:'S prn 1 tab sublingual bila nyeri dada' },
                { id:'l2', t:'R/ Aspirin tab 80 mg', s:'S 1 dd tab I sesudah makan' },
                { id:'l3', t:'R/ Edukasi: segera ke IGD bila nyeri tidak reda > 15 menit', s:'' }
              ]}],
              why: 'Kesalahan dosis ×10! Dosis ISDN sublingual adalah 5 mg (bukan 50 mg!). Memberikan 50 mg sublingual sekaligus memicu vasodilatasi drastis, hipotensi berat, dan refleks takikardia.'
            };
          }
        }
      ]
    },

    /* 9. GOUT AKUT / ULKUS PEPTIKUM / ALERGI SULFA / LANSIA KETOROLAK (SKDI 4A / 3B) */
    {
      id: 'gout_nyeri_alergi',
      safe(rng, used) {
        const p = makePatient(rng, {
          minAge: 34, maxAge: 60,
          dx: 'Artritis gout akut (podagra jempol kaki kanan)',
          cat: 'Jempol kaki bengkak merah sejak semalam, tidak ada riwayat maag/ginjal',
          say: 'Jempol kaki kanan saya bengkak merah dan sakit sekali disentuh, Dok.'
        }, used);
        return {
          type: 'resep', sign: pick(rng, DOC_SIGNS), flaw: null, topic: 'aman',
          tplId: 'gen-gout-safe', scenarioId: 'gout_nyeri_alergi', errorKind: 'aman',
          pt: p.pt, ktp: p.ktp, appear: p.appear,
          sections: [{ lines: [
            { id:'l1', t:'R/ Natrium diklofenak tab 50 mg', s:'S 2 dd tab I sesudah makan (3–5 hari)' },
            { id:'l2', t:'R/ Omeprazol cap 20 mg', s:'S 1 dd cap I sebelum sarapan' },
            { id:'l3', t:'R/ Edukasi: kompres dingin, istirahatkan kaki, cek asam urat setelah radang reda', s:'' }
          ]}],
          why: 'Aman! Pada gout akut (SKDI 4A) dengan lambung & ginjal aman, terapi lini pertama adalah antiinflamasi (NSAID/kolkisin/steroid) TANPA memulai alopurinol saat serangan akut.'
        };
      },
      flaws: [
        {
          id: 'kontra_gout_alopurinol', errType: 'kontra-komorbid', bucket: 'clin', topic: 'kontra',
          build(rng, used) {
            const p = makePatient(rng, {
              jk: 'L', minAge: 38, maxAge: 65,
              dx: 'Artritis gout akut (podagra)',
              cat: 'Jempol kaki kanan bengkak merah sangat nyeri sejak semalam, belum pernah minum alopurinol',
              say: 'Asam urat saya kumat, Dok, jempol kaki bengkak sakit banget.'
            }, used);
            return {
              type: 'resep', sign: pick(rng, DOC_SIGNS), flaw: 'l1', topic: 'kontra',
              tplId: 'gen-gout-kontra-alopurinol', scenarioId: 'gout_nyeri_alergi', errorKind: 'kontra-komorbid',
              pt: p.pt, ktp: p.ktp, appear: p.appear,
              sections: [{ lines: [
                { id:'l1', t:'R/ Alopurinol tab 300 mg', s:'S 1 dd tab I (mulai hari ini untuk turunkan asam urat)' },
                { id:'l2', t:'R/ Paracetamol tab 500 mg', s:'S 3 dd tab I k/p nyeri' },
                { id:'l3', t:'R/ Edukasi: kompres dingin & hindari jeroan', s:'' }
              ]}],
              why: 'Kontraindikasi saat serangan akut! Alopurinol TIDAK boleh dimulai saat serangan gout akut (SKDI 4A) karena perubahan cepat kadar asam urat justru memperberat inflamasi dan nyeri. Atasi radang dulu dengan NSAID/kolkisin/kortikosteroid.'
            };
          }
        },
        {
          id: 'kontra_ulkus_nsaid', errType: 'kontra-komorbid', bucket: 'clin', topic: 'kontra',
          build(rng, used) {
            const nsaid = pick(rng, [
              { t:'R/ Natrium diklofenak tab 50 mg', s:'S 3 dd tab I', nm:'Natrium diklofenak' },
              { t:'R/ Ibuprofen tab 400 mg', s:'S 3 dd tab I', nm:'Ibuprofen' }
            ]);
            const p = makePatient(rng, {
              minAge: 42, maxAge: 68,
              dx: 'Suspek perdarahan saluran cerna atas (melena), nyeri sendi',
              cat: 'BAB hitam lengket sejak kemarin, nyeri ulu hati berat',
              say: 'Perut ulu hati perih dan BAB saya hitam seperti kopi dari kemarin, Dok.'
            }, used);
            return {
              type: 'resep', sign: pick(rng, DOC_SIGNS), flaw: 'l2', topic: 'kontra',
              tplId: 'gen-ulkus-kontra-nsaid', scenarioId: 'gout_nyeri_alergi', errorKind: 'kontra-komorbid',
              pt: p.pt, ktp: p.ktp, appear: p.appear,
              sections: [{ lines: [
                { id:'l1', t:'R/ Omeprazol cap 20 mg', s:'S 2 dd cap I sebelum makan' },
                { id:'l2', t:nsaid.t, s:nsaid.s },
                { id:'l3', t:'R/ Sukralfat sirup 500 mg/5 mL', s:'S 3 dd 2 sdt (jeda 1 jam dari omeprazol)' }
              ]}],
              why: `Kontraindikasi absolut! ${nsaid.nm} (NSAID) menghambat prostaglandin pelindung lambung dan memperparah perdarahan saluran cerna / melena.`
            };
          }
        },
        {
          id: 'alergi_sulfa', errType: 'alergi-golongan', bucket: 'clin', topic: 'alergi',
          build(rng, used) {
            const p = makePatient(rng, {
              minAge: 24, maxAge: 58,
              dx: 'Abses kulit ringan / ISK bawah',
              alergi: 'SULFONAMID / SULFA (Sindrom Stevens-Johnson, 2018)',
              cat: 'Benjolan bernanah ringan sudah diinsisi-drainase, tidak demam tinggi',
              say: 'Dok, dulu saya pernah melepuh seluruh kulit gara-gara obat sulfa.'
            }, used);
            return {
              type: 'resep', sign: pick(rng, DOC_SIGNS), flaw: 'l1', topic: 'alergi',
              tplId: 'gen-alergi-sulfa-kotrim', scenarioId: 'gout_nyeri_alergi', errorKind: 'alergi-golongan',
              pt: p.pt, ktp: p.ktp, appear: p.appear,
              sections: [{ lines: [
                { id:'l1', t:'R/ Kotrimoksazol forte tab 960 mg', s:'S 2 dd tab I, 5 hari' },
                { id:'l2', t:'R/ Paracetamol tab 500 mg', s:'S 3 dd tab I k/p nyeri' },
                { id:'l3', t:'R/ Rawat luka harian, kontrol 2 hari lagi', s:'' }
              ]}],
              why: 'Alergi satu golongan obat! Kotrimoksazol (trimetoprim–sulfametoksazol) mengandung golongan sulfonamid. Pada riwayat SJS akibat sulfa, pemberian ulang kontraindikasi absolut!'
            };
          }
        },
        {
          id: 'dosis_lansia_ketorolak', errType: 'dosis-lansia', bucket: 'clin', topic: 'dosis',
          build(rng, used) {
            const p = makePatient(rng, {
              minAge: 68, maxAge: 80, minBb: 43, maxBb: 48,
              dx: 'Nyeri kolik ginjal akut',
              cat: 'Nyeri pinggang kanan menjalar ke lipat paha, fungsi ginjal baik',
              say: 'Pinggang kanan saya nyeri sekali, Dok, rasanya melilit.'
            }, used);
            return {
              type: 'instruksi', sign: pick(rng, DOC_SIGNS), flaw: 'l1', topic: 'dosis',
              tplId: 'gen-dosis-ketorolak-lansia', scenarioId: 'gout_nyeri_alergi', errorKind: 'dosis-x10',
              pt: p.pt, ktp: p.ktp, appear: p.appear,
              sections: [{ lines: [
                { id:'l1', cols:['Ketorolak','30 mg','IV pelan','Tiap 6 jam (= 120 mg/hari)'] },
                { id:'l2', cols:['Ondansetron','4 mg','IV pelan','k/p mual'] },
                { id:'l3', cols:['Ringer Laktat','500 mL','IV drip','Habis 8 jam'] }
              ]}],
              why: `Overdosis lansia & BB rendah! Pada usia ≥ 65 th (${p.ageNum} th) atau BB < 50 kg (${p.bbNum} kg), dosis maksimum ketorolak hanya 60 mg/hari (10–15 mg tiap 6–8 jam). Pemberian 120 mg/hari = 2× batas aman (risiko perdarahan GI & AKI!).`
            };
          }
        }
      ]
    },

    /* 10. EDEMA PARU AKUT / URTIKARIA / DISPEPSIA (SKDI 3B / 4A) */
    {
      id: 'edema_alergi_ringan',
      safe(rng, used) {
        const p = makePatient(rng, {
          minAge: 21, maxAge: 52,
          dx: 'Urtikaria akut ringan (tanpa anafilaksis)',
          cat: 'Bentol gatal di lengan sejak 3 jam, TD 120/78, tidak ada sesak/bengkak bibir',
          say: 'Tangan saya bentol-bentol gatal habis bersih-bersih gudang, Dok.'
        }, used);
        return {
          type: 'resep', sign: pick(rng, DOC_SIGNS), flaw: null, topic: 'aman',
          tplId: 'gen-urtikaria-safe', scenarioId: 'edema_alergi_ringan', errorKind: 'aman',
          pt: p.pt, ktp: p.ktp, appear: p.appear,
          sections: [{ lines: [
            { id:'l1', t:'R/ Cetirizin tab 10 mg', s:'S 1 dd tab I malam hari' },
            { id:'l2', t:'R/ Losion kalamin', s:'S oles tipis pada bagian gatal' },
            { id:'l3', t:'R/ Edukasi: segera ke IGD bila sesak napas atau bibir bengkak', s:'' }
          ]}],
          why: 'Aman! Urtikaria akut ringan tanpa tanda anafilaksis (SKDI 4A) tepat ditangani dengan antihistamin generasi 2 (cetirizin 10 mg 1×/hari) + edukasi tanda bahaya.'
        };
      },
      flaws: [
        {
          id: 'satuan_furosemid_g', errType: 'satuan-tertukar', bucket: 'clin', topic: 'dosis',
          build(rng, used) {
            const p = makePatient(rng, {
              minAge: 56, maxAge: 74,
              dx: 'Edema paru akut / gagal jantung dekompensasi',
              cat: 'Sesak berat saat berbaring, ronki basah halus bilateral, TD 152/90 mmHg',
              say: 'Napas saya ngos-ngosan sekali kalau tidur telentang, Dok...'
            }, used);
            return {
              type: 'instruksi', sign: DPJP_SIGNS.pd, flaw: 'l2', topic: 'dosis',
              tplId: 'gen-edema-satuan-furosemid', scenarioId: 'edema_alergi_ringan', errorKind: 'satuan-tertukar',
              pt: p.pt, ktp: p.ktp, appear: p.appear,
              sections: [{ lines: [
                { id:'l1', cols:['Oksigen NRM + posisi setengah duduk','10 L/menit','Inhalasi','Target SpO₂ > 94%'] },
                { id:'l2', cols:['Furosemid','40 g','IV bolus','Segera, pantau produksi urin'] },
                { id:'l3', cols:['Pasang kateter urin + konsul Sp.JP','—','—','Catat balans cairan'] }
              ]}],
              why: 'Satuan mg dan g tertukar! 40 g sama dengan 40.000 mg (= 1.000× dosis awal furosemid IV 40 mg!). Kesalahan satuan fatal.'
            };
          }
        },
        {
          id: 'dosis_x10_cetirizin', errType: 'dosis-x10', bucket: 'clin', topic: 'dosis',
          build(rng, used) {
            const p = makePatient(rng, {
              minAge: 20, maxAge: 50,
              dx: 'Urtikaria akut ringan',
              cat: 'Bentol gatal di lengan, tidak ada sesak/mengi',
              say: 'Kulit saya gatal bentol-bentol sejak tadi siang, Dok.'
            }, used);
            return {
              type: 'resep', sign: pick(rng, DOC_SIGNS), flaw: 'l1', topic: 'dosis',
              tplId: 'gen-urtikaria-dosis-x10-cetirizin', scenarioId: 'edema_alergi_ringan', errorKind: 'dosis-x10',
              pt: p.pt, ktp: p.ktp, appear: p.appear,
              sections: [{ lines: [
                { id:'l1', t:'R/ Cetirizin tab 100 mg', s:'S 1 dd 100 mg malam hari' },
                { id:'l2', t:'R/ Edukasi: hindari pencetus & ke IGD bila sesak', s:'' }
              ]}],
              why: 'Kesalahan dosis ×10! Dosis cetirizin dewasa adalah 10 mg 1×/hari (bukan 100 mg!). Overdosis menyebabkan sedasi berat, pusing, dan takikardia.'
            };
          }
        },
        {
          id: 'satuan_ctm_g', errType: 'satuan-tertukar', bucket: 'clin', topic: 'dosis',
          build(rng, used) {
            const p = makePatient(rng, {
              minAge: 20, maxAge: 48,
              dx: 'Rinitis alergi akut',
              cat: 'Bersin-bersin dan hidung gatal, tidak ada demam',
              say: 'Hidung saya gatal dan bersin terus sejak pagi, Dok.'
            }, used);
            return {
              type: 'resep', sign: pick(rng, DOC_SIGNS), flaw: 'l1', topic: 'dosis',
              tplId: 'gen-rinitis-satuan-ctm', scenarioId: 'edema_alergi_ringan', errorKind: 'satuan-tertukar',
              pt: p.pt, ktp: p.ktp, appear: p.appear,
              sections: [{ lines: [
                { id:'l1', t:'R/ Klorfeniramin (CTM) 4 g', s:'S 3 dd 4 g' },
                { id:'l2', t:'R/ Cuci hidung NaCl 0,9%', s:'S 2 dd semprot' }
              ]}],
              why: 'Satuan mg dan g tertukar! Dosis CTM dewasa adalah 4 mg tiap 4–6 jam (maks 24 mg/hari), BUKAN 4 g (= 4.000 mg, 1.000× dosis normal!).'
            };
          }
        }
      ]
    },

    /* 11. LAB GINJAL & METABOLIK (DM / OA / PGK / HIPOKALEMIA / HIPOGLIKEMIA — Malam 4+) */
    {
      id: 'lab_ginjal_metabolik',
      safe(rng, used) {
        const mode = pick(rng, ['hipokalemia', 'oa_ckd']);
        if (mode === 'hipokalemia') {
          const p = makePatient(rng, {
            minAge: 24, maxAge: 54,
            dx: 'Hipokalemia ringan–sedang e.c. diare akut',
            cat: 'Lemas, kram betis, fungsi ginjal normal',
            say: 'Kaki terasa kram dan badan lemas sekali setelah diare 2 hari, Dok.'
          }, used);
          const kVal = pick(rng, ['2,8', '2,9', '3,0']);
          return {
            type: 'instruksi', sign: DPJP_SIGNS.pd, flaw: null, needs: 'lab', topic: 'aman',
            tplId: 'gen-lab-safe-hipokalemia', scenarioId: 'lab_ginjal_metabolik', errorKind: 'aman',
            pt: p.pt, ktp: p.ktp, appear: p.appear,
            lab: { rows: [
              ['Kalium', kVal, 'mmol/L', '3,5–5,0', 'L'],
              ['Natrium', '136', 'mmol/L', '135–145', ''],
              ['Kreatinin', '0,9', 'mg/dL', '0,7–1,3', ''],
              ['GDS', '108', 'mg/dL', '< 200', '']
            ]},
            sections: [{ lines: [
              { id:'l1', cols:['KCl dalam NaCl 0,9% 500 mL','20 mEq','IV drip','Habis 4 jam (5 mEq/jam)'] },
              { id:'l2', cols:['Cek kalium ulang','—','—','Setelah koreksi selesai'] }
            ]}],
            why: `Aman! Kalium ${kVal} mmol/L memang perlu koreksi. KCl 20 mEq dalam 500 mL (= 40 mEq/L, batas maks perifer) habis 4 jam (= 5 mEq/jam, batas aman ≤ 10 mEq/jam), dan kreatinin normal.`
          };
        }
        const p = makePatient(rng, {
          minAge: 52, maxAge: 70,
          dx: 'Osteoartritis lutut + gangguan ginjal',
          cat: 'Nyeri lutut kanan, riwayat hipertensi lama',
          say: 'Lutut saya nyeri buat jalan, Dok, ini hasil lab ginjal barusan.'
        }, used);
        return {
          type: 'resep', sign: pick(rng, DOC_SIGNS), flaw: null, needs: 'lab', topic: 'aman',
          tplId: 'gen-lab-safe-oa-ckd', scenarioId: 'lab_ginjal_metabolik', errorKind: 'aman',
          pt: p.pt, ktp: p.ktp, appear: p.appear,
          lab: { rows: [
            ['Kreatinin', '3,2', 'mg/dL', '0,7–1,3', 'H'],
            ['eGFR', '21', 'mL/mnt', '≥ 90', 'L'],
            ['Ureum', '96', 'mg/dL', '10–50', 'H'],
            ['Kalium', '4,6', 'mmol/L', '3,5–5,0', '']
          ]},
          sections: [{ lines: [
            { id:'l1', t:'R/ Paracetamol tab 500 mg', s:'S 3 dd tab I k/p nyeri' },
            { id:'l2', t:'R/ Kompres hangat & kurangi beban sendi', s:'' },
            { id:'l3', t:'R/ Rujuk evaluasi fungsi ginjal ke poli Penyakit Dalam', s:'' }
          ]}],
          why: 'Aman! Meski eGFR turun (21 mL/mnt), dokter sudah tepat menghindari NSAID dan memilih paracetamol yang aman bagi ginjal serta merujuk evaluasi PGK.'
        };
      },
      flaws: [
        {
          id: 'kontra_ginjal_nsaid', errType: 'kontra-ginjal', bucket: 'lab', topic: 'lab',
          build(rng, used) {
            const nsaid = pick(rng, [
              { t:'R/ Ibuprofen tab 400 mg', s:'S 3 dd tab I sesudah makan', nm:'Ibuprofen' },
              { t:'R/ Natrium diklofenak tab 50 mg', s:'S 3 dd tab I sesudah makan', nm:'Natrium diklofenak' }
            ]);
            const cr = pick(rng, ['3,5','3,8','4,1']);
            const egfr = pick(rng, ['16','18','20']);
            const p = makePatient(rng, {
              minAge: 52, maxAge: 72,
              dx: 'Osteoartritis genu (nyeri lutut)',
              cat: 'Riwayat hipertensi lama, kaki sering bengkak',
              say: 'Lutut saya sakit banget buat jalan, Dok, ini hasil labnya.'
            }, used);
            return {
              type: 'resep', sign: pick(rng, DOC_SIGNS), flaw: 'l1', kind: 'lab', topic: 'lab',
              tplId: 'gen-lab-ginjal-nsaid', scenarioId: 'lab_ginjal_metabolik', errorKind: 'kontra-ginjal',
              pt: p.pt, ktp: p.ktp, appear: p.appear,
              lab: { rows: [
                ['Kreatinin', cr, 'mg/dL', '0,7–1,3', 'H'],
                ['eGFR', egfr, 'mL/mnt', '≥ 90', 'L'],
                ['Ureum', '114', 'mg/dL', '10–50', 'H'],
                ['Kalium', '4,9', 'mmol/L', '3,5–5,0', '']
              ]},
              sections: [{ lines: [
                { id:'l1', t:nsaid.t, s:nsaid.s },
                { id:'l2', t:'R/ Kompres hangat sendi lutut', s:'' },
                { id:'l3', t:'R/ Rujuk evaluasi fungsi ginjal ke Sp.PD', s:'' }
              ]}],
              why: `Kontraindikasi ginjal! Lab menunjukkan gagal ginjal berat (Kreatinin ${cr}, eGFR ${egfr} < 30). ${nsaid.nm} (NSAID) memperburuk perfusi ginjal dan memicu gagal ginjal akut! Pilih paracetamol atau analgesik topikal.`
            };
          }
        },
        {
          id: 'kontra_ginjal_metformin', errType: 'kontra-ginjal', bucket: 'lab', topic: 'lab',
          build(rng, used) {
            const cr = pick(rng, ['3,9','4,2','4,6']);
            const egfr = pick(rng, ['14','16','18']);
            const p = makePatient(rng, {
              minAge: 50, maxAge: 72,
              dx: 'DM tipe 2 dengan AKI / gangguan ginjal berat',
              cat: 'Lemas, mual, BAK berkurang 2 hari',
              say: 'Badan saya lemas dan kencing berkurang 2 hari ini, Dok.'
            }, used);
            return {
              type: 'instruksi', sign: DPJP_SIGNS.pd, flaw: 'l2', kind: 'lab', topic: 'lab',
              tplId: 'gen-lab-ginjal-metformin', scenarioId: 'lab_ginjal_metabolik', errorKind: 'kontra-ginjal',
              pt: p.pt, ktp: p.ktp, appear: p.appear,
              lab: { rows: [
                ['GDS', '274', 'mg/dL', '< 200', 'H'],
                ['Kreatinin', cr, 'mg/dL', '0,7–1,3', 'H'],
                ['eGFR', egfr, 'mL/mnt', '≥ 90', 'L'],
                ['Ureum', '128', 'mg/dL', '10–50', 'H']
              ]},
              sections: [{ lines: [
                { id:'l1', cols:['NaCl 0,9%','500 mL','IV drip','Habis 6 jam, pantau balans urin'] },
                { id:'l2', cols:['Metformin','500 mg','PO','3×/hari sesudah makan'] },
                { id:'l3', cols:['Pantau GDS & konsul Sp.PD','—','—','Evaluasi fungsi ginjal'] }
              ]}],
              why: `Kontraindikasi ginjal! Metformin dilarang pada eGFR < 30 (pasien ini eGFR ${egfr}) atau AKI karena risiko asidosis laktat yang fatal!`
            };
          }
        },
        {
          id: 'kontra_ginjal_gliben', errType: 'kontra-ginjal', bucket: 'lab', topic: 'lab',
          build(rng, used) {
            const p = makePatient(rng, {
              minAge: 68, maxAge: 79,
              dx: 'DM tipe 2 kontrol rutin',
              cat: 'Sering keringat dingin dan gemetar bila telat makan',
              say: 'Saya sering gemetar dingin sebelum makan siang, Dok, ini hasil lab ginjalnya.'
            }, used);
            return {
              type: 'resep', sign: pick(rng, DOC_SIGNS), flaw: 'l1', kind: 'lab', topic: 'lab',
              tplId: 'gen-lab-ginjal-gliben', scenarioId: 'lab_ginjal_metabolik', errorKind: 'kontra-ginjal',
              pt: p.pt, ktp: p.ktp, appear: p.appear,
              lab: { rows: [
                ['GDS', '188', 'mg/dL', '< 200', ''],
                ['Kreatinin', '2,2', 'mg/dL', '0,6–1,1', 'H'],
                ['eGFR', '25', 'mL/mnt', '≥ 90', 'L'],
                ['Ureum', '78', 'mg/dL', '10–50', 'H']
              ]},
              sections: [{ lines: [
                { id:'l1', t:'R/ Glibenklamid tab 5 mg', s:'S 2 dd tab I sebelum makan' },
                { id:'l2', t:'R/ Edukasi: makan teratur & kenali tanda hipoglikemia', s:'' },
                { id:'l3', t:'R/ Rujuk evaluasi PGK ke poli Penyakit Dalam', s:'' }
              ]}],
              why: `Kontraindikasi lansia & ginjal! Glibenklamid kerja panjang diekskresi ginjal. Pada usia ${p.ageNum} th dan eGFR 25 (< 60), risikonya sangat tinggi memicu hipoglikemia berat berkepanjangan!`
            };
          }
        },
        {
          id: 'rute_kcl_bolus', errType: 'rute-salah', bucket: 'lab', topic: 'lab',
          build(rng, used) {
            const p = makePatient(rng, {
              minAge: 26, maxAge: 56,
              dx: 'Hipokalemia e.c. diare akut',
              cat: 'Lemas, kram kaki, BAK lancar',
              say: 'Badan lemas sekali setelah mencret 3 hari, Dok.'
            }, used);
            return {
              type: 'instruksi', sign: DPJP_SIGNS.pd, flaw: 'l1', kind: 'lab', topic: 'lab',
              tplId: 'gen-lab-rute-kcl-bolus', scenarioId: 'lab_ginjal_metabolik', errorKind: 'rute-salah',
              pt: p.pt, ktp: p.ktp, appear: p.appear,
              lab: { rows: [
                ['Kalium', '2,8', 'mmol/L', '3,5–5,0', 'L'],
                ['Natrium', '135', 'mmol/L', '135–145', ''],
                ['Kreatinin', '0,9', 'mg/dL', '0,7–1,3', '']
              ]},
              sections: [{ lines: [
                { id:'l1', cols:['KCl (Kalium klorida)','20 mEq','IV bolus cepat','Segera langsung lewat vena perifer'] },
                { id:'l2', cols:['Cek kalium ulang','—','—','4 jam kemudian'] }
              ]}],
              why: 'Rute salah MEMATIKAN! KCl TIDAK BOLEH disuntikkan IV bolus langsung karena langsung memicu fibrilasi ventrikel / henti jantung! WAJIB diencerkan (≤ 40 mEq/L perifer) dan diinfus pelan (≤ 10 mEq/jam).'
            };
          }
        },
        {
          id: 'lab_hiperkalemia_kcl', errType: 'lab-abnormal', bucket: 'lab', topic: 'lab',
          build(rng, used) {
            const kVal = pick(rng, ['6,6','6,8','7,1']);
            const p = makePatient(rng, {
              minAge: 54, maxAge: 74,
              dx: 'CKD stadium 5, lemas',
              cat: 'Jadwal cuci darah terlewat 1 minggu',
              say: 'Badan saya lemas banget, Dok, minggu kemarin belum sempat cuci darah.'
            }, used);
            return {
              type: 'instruksi', sign: DPJP_SIGNS.pd, flaw: 'l2', kind: 'lab', topic: 'lab',
              tplId: 'gen-lab-hiperkalemia-kcl', scenarioId: 'lab_ginjal_metabolik', errorKind: 'lab-abnormal',
              pt: p.pt, ktp: p.ktp, appear: p.appear,
              lab: { rows: [
                ['Kalium', kVal, 'mmol/L', '3,5–5,0', 'H'],
                ['Ureum', '172', 'mg/dL', '10–50', 'H'],
                ['Kreatinin', '9,2', 'mg/dL', '0,7–1,3', 'H'],
                ['Hemoglobin', '8,8', 'g/dL', '12–17', 'L']
              ]},
              sections: [{ lines: [
                { id:'l1', cols:['Monitor EKG kontinu','—','—','Observasi ketat'] },
                { id:'l2', cols:['KCl dalam NaCl 0,9% 500 mL','20 mEq','IV drip','Habis 4 jam'] },
                { id:'l3', cols:['Konsul Sp.PD-KGH','—','—','Rujuk dialisis segera'] }
              ]}],
              why: `Nilai lab kritis! Kalium sudah ${kVal} mmol/L (hiperkalemia berat!). Menambah KCl dapat memicu henti jantung. Justru diperlukan Ca glukonas 10% IV pelan, insulin + D40%, salbutamol nebu, lalu dialisis.`
            };
          }
        },
        {
          id: 'lab_hipoglikemia_insulin', errType: 'lab-abnormal', bucket: 'lab', topic: 'lab',
          build(rng, used) {
            const gds = String(randInt(rng, 38, 48));
            const p = makePatient(rng, {
              minAge: 56, maxAge: 76, withComp: true,
              dx: 'Penurunan kesadaran, DM tipe 2',
              cat: 'Keringat dingin, bicara melantur setelah minum glibenklamid tanpa sarapan',
              say: 'Pusing... keringat dingin sekali, Dok...'
            }, used);
            return {
              type: 'instruksi', sign: DPJP_SIGNS.pd, flaw: 'l1', kind: 'lab', topic: 'lab',
              tplId: 'gen-lab-hipoglikemia-insulin', scenarioId: 'lab_ginjal_metabolik', errorKind: 'lab-abnormal',
              pt: p.pt, ktp: p.ktp, appear: p.appear,
              lab: { rows: [
                ['GDS', gds, 'mg/dL', '< 200', 'L'],
                ['Kalium', '4,0', 'mmol/L', '3,5–5,0', ''],
                ['Natrium', '138', 'mmol/L', '135–145', ''],
                ['Kreatinin', '1,0', 'mg/dL', '0,6–1,2', '']
              ]},
              sections: [{ lines: [
                { id:'l1', cols:['Insulin reguler','10 unit','IV bolus','Segera'] },
                { id:'l2', cols:['Cek GDS ulang','—','—','15 menit kemudian'] }
              ]}],
              why: `Nilai lab kritis! GDS hanya ${gds} mg/dL (hipoglikemia berat!). Memberi insulin akan menjatuhkan gula darah lebih dalam dan fatal. Yang benar: bolus D40% 25–50 mL IV pelan lalu cek GDS ulang 15 menit!`
            };
          }
        }
      ]
    },

    /* 12. LAB INFEKSI TROPIS: DENGUE / TIFOID / HEPATITIS A (SKDI 4A — Malam 4+) */
    {
      id: 'lab_infeksi_tropis',
      safe(rng, used) {
        const tr = `${randInt(rng, 88, 108)}.000`;
        const p = makePatient(rng, {
          minAge: 18, maxAge: 45,
          dx: 'Demam dengue hari ke-3 (tanpa tanda bahaya)',
          cat: 'Demam 3 hari, nyeri belakang mata, mau minum, tidak ada mimisan/nyeri perut',
          say: 'Demam tinggi sudah 3 hari, Dok, tapi masih kuat minum.'
        }, used);
        return {
          type: 'resep', sign: pick(rng, DOC_SIGNS), flaw: null, needs: 'lab', topic: 'aman',
          tplId: 'gen-lab-safe-dengue', scenarioId: 'lab_infeksi_tropis', errorKind: 'aman',
          pt: p.pt, ktp: p.ktp, appear: p.appear,
          lab: { rows: [
            ['Trombosit', tr, '/µL', '150.000–400.000', 'L'],
            ['Hematokrit', '42', '%', '37–48', ''],
            ['Leukosit', '3.500', '/µL', '4.000–11.000', 'L'],
            ['Hemoglobin', '14,2', 'g/dL', '12–17', '']
          ]},
          sections: [{ lines: [
            { id:'l1', t:'R/ Paracetamol tab 500 mg', s:'S 3 dd tab I k/p demam' },
            { id:'l2', t:'R/ Oralit / cairan oral 2–2,5 L per hari', s:'S minum bertahap' },
            { id:'l3', t:'R/ Edukasi tanda bahaya (perdarahan, nyeri perut hebat, muntah terus) & cek lab 24 jam', s:'' }
          ]}],
          why: 'Aman! Penanganan demam dengue tanpa tanda bahaya (SKDI 4A) sudah tepat: antipiretik hanya paracetamol (tanpa NSAID/aspirin), rehidrasi oral, dan edukasi tanda bahaya + pantau trombosit/Ht.'
        };
      },
      flaws: [
        {
          id: 'lab_dengue_nsaid', errType: 'lab-abnormal', bucket: 'lab', topic: 'lab',
          build(rng, used) {
            const tr = `${randInt(rng, 32, 48)}.000`;
            const nsaid = pick(rng, [
              { t:'R/ Ibuprofen tab 400 mg', s:'S 3 dd tab I k/p demam/nyeri', nm:'Ibuprofen' },
              { t:'R/ Natrium diklofenak tab 50 mg', s:'S 2 dd tab I k/p pegal', nm:'Natrium diklofenak' }
            ]);
            const p = makePatient(rng, {
              minAge: 18, maxAge: 42,
              dx: 'Demam dengue hari ke-4',
              cat: 'Demam 4 hari, badan pegal, bintik merah di lengan',
              say: 'Badan pegal sekali dan muncul bintik merah, Dok.'
            }, used);
            return {
              type: 'resep', sign: pick(rng, DOC_SIGNS), flaw: 'l2', kind: 'lab', topic: 'lab',
              tplId: 'gen-lab-dengue-nsaid', scenarioId: 'lab_infeksi_tropis', errorKind: 'lab-abnormal',
              pt: p.pt, ktp: p.ktp, appear: p.appear,
              lab: { rows: [
                ['Trombosit', tr, '/µL', '150.000–400.000', 'L'],
                ['Hematokrit', '46', '%', '37–48', ''],
                ['Leukosit', '3.100', '/µL', '4.000–11.000', 'L'],
                ['NS1 Dengue', 'Positif', '', 'Negatif', 'H']
              ]},
              sections: [{ lines: [
                { id:'l1', t:'R/ Paracetamol tab 500 mg', s:'S 3 dd tab I k/p demam' },
                { id:'l2', t:nsaid.t, s:nsaid.s },
                { id:'l3', t:'R/ Edukasi: banyak minum & cek trombosit besok', s:'' }
              ]}],
              why: `Bahaya perdarahan dengue! Trombosit tinggal ${tr}/µL. ${nsaid.nm} (NSAID) menghambat fungsi trombosit dan memicu perdarahan berat/saluran cerna! Gunakan paracetamol saja.`
            };
          }
        },
        {
          id: 'lab_tifoid_kloram', errType: 'lab-abnormal', bucket: 'lab', topic: 'lab',
          build(rng, used) {
            const p = makePatient(rng, {
              minAge: 19, maxAge: 48,
              dx: 'Demam tifoid hari ke-6',
              cat: 'Demam naik sore–malam, lidah kotor, lemas',
              say: 'Demam nggak turun-turun sudah 6 hari, Dok, ini hasil labnya.'
            }, used);
            return {
              type: 'resep', sign: pick(rng, DOC_SIGNS), flaw: 'l1', kind: 'lab', topic: 'lab',
              tplId: 'gen-lab-tifoid-kloram', scenarioId: 'lab_infeksi_tropis', errorKind: 'lab-abnormal',
              pt: p.pt, ktp: p.ktp, appear: p.appear,
              lab: { rows: [
                ['Leukosit', '2.000', '/µL', '4.000–11.000', 'L'],
                ['Trombosit', '84.000', '/µL', '150.000–400.000', 'L'],
                ['Hemoglobin', '9,6', 'g/dL', '12–17', 'L'],
                ['Tubex TF', '+4', '', '≤ 2', 'H']
              ]},
              sections: [{ lines: [
                { id:'l1', t:'R/ Kloramfenikol cap 500 mg', s:'S 4 dd cap I, 10 hari' },
                { id:'l2', t:'R/ Paracetamol tab 500 mg', s:'S 3 dd tab I k/p demam' },
                { id:'l3', t:'R/ Edukasi: tirah baring & diet lunak', s:'' }
              ]}],
              why: 'Kontraindikasi supresi sumsum tulang! Lab menunjukkan leukopenia berat (2.000/µL) & pansitopenia. Kloramfenikol berisiko memperparah depresi sumsum tulang / anemia aplastik. Pilih sefiksim atau azitromisin (SKDI 4A).'
            };
          }
        },
        {
          id: 'lab_hepatitis_statin', errType: 'lab-abnormal', bucket: 'lab', topic: 'lab',
          build(rng, used) {
            const statin = pick(rng, ['Simvastatin tab 20 mg', 'Atorvastatin tab 20 mg']);
            const p = makePatient(rng, {
              minAge: 34, maxAge: 62,
              dx: 'Hepatitis A akut (ikterik, mual)',
              cat: 'Sklera kuning 3 hari, urin warna teh, rutin minum obat kolesterol',
              say: 'Mata saya menguning dan mual sejak 3 hari lalu, Dok.'
            }, used);
            return {
              type: 'resep', sign: pick(rng, DOC_SIGNS), flaw: 'l1', kind: 'lab', topic: 'lab',
              tplId: 'gen-lab-hepatitis-statin', scenarioId: 'lab_infeksi_tropis', errorKind: 'lab-abnormal',
              pt: p.pt, ktp: p.ktp, appear: p.appear,
              lab: { rows: [
                ['SGOT (AST)', '640', 'U/L', '< 40', 'H'],
                ['SGPT (ALT)', '760', 'U/L', '< 40', 'H'],
                ['Bilirubin total', '4,9', 'mg/dL', '0,2–1,2', 'H'],
                ['IgM Anti-HAV', 'Positif', '', 'Negatif', 'H']
              ]},
              sections: [{ lines: [
                { id:'l1', t:`R/ ${statin} (lanjut rutin)`, s:'S 1 dd tab I malam hari' },
                { id:'l2', t:'R/ Ondansetron tab 4 mg', s:'S 2 dd tab I k/p mual (maks 8 mg/hari)' },
                { id:'l3', t:'R/ Edukasi: istirahat cukup, diet lunak, hindari alkohol', s:'' }
              ]}],
              why: 'Kontraindikasi absolut penyakit hati aktif! SGOT/SGPT melonjak > 15× normal pada hepatitis A akut. Statin (simvastatin/atorvastatin) wajib ditunda sementara hingga enzim hati kembali normal!'
            };
          }
        }
      ]
    }
  ];

  /* ================= MUTATOR IDENTITAS & DOKUMEN (UNTUK KASUS AMAN) ================= */

  function cloneDoc(d) {
    return JSON.parse(JSON.stringify(d));
  }

  function mutateKtpKeluarga(rng, base) {
    const d = cloneDoc(base);
    const a = ageOf(d.pt.lahir);
    const parts = d.pt.nama.replace(/^(Tn|Ny|An|Nn|Sdr)\.\s*/, '').split(' ');
    const first = parts[0], last = parts.slice(1).join(' ') || 'Pratama';

    // Anak usia 5..14 -> KIA milik kakak/adik (KK & kepala keluarga sama!)
    if (a < 17) {
      if (a < 5) return null; // butuh KIA dengan foto (usia >= 5)
      const sibDelta = a <= 7 ? -2 : 2; // tahun lahir beda 2 th -> tetap rentang 5..15 th
      const sibLahir = shiftDobYears(d.pt.lahir, sibDelta);
      const sibAge = ageOf(sibLahir);
      if (sibAge < 5 || sibAge >= 17) return null;
      const sibFirst = pickOther(rng, d.pt.jk === 'L' ? BOY_FIRST : GIRL_FIRST, first);
      const sibFull = `${sibFirst} ${last}`.toUpperCase();
      d.idx = { nama: sibFull, lahir: sibLahir };
      d.appear.foto = genDifferentLook(rng, d.appear.look, d.pt.jk, sibAge);
      d.flaw = ['ktp-nama', 'ktp-ttl', 'ktp-foto'];
      d.kind = 'id';
      d.topic = 'identitas';
      d.tplId = 'gen-kia-keluarga-saudara';
      d.errorKind = 'ktp-keluarga';
      d.why = `KIA milik saudara (kakak/adik) pasien! No. KK, nama kepala keluarga, dan alamat memang sama, tetapi nama anak (${sibFull}), tanggal lahir (${dmy(sibLahir)}), dan fotonya bukan pasien yang datang — berisiko salah dosis anak!`;
      return d;
    }

    // Dewasa -> pilih acak: KTP Orang Tua, KTP Saudara, atau KTP Pasangan!
    const choices = ['saudara'];
    if (a >= 19 && a <= 44) choices.push('orangtua');
    if (d.ktp.kawin === 'KAWIN') choices.push('pasangan');
    const rel = pick(rng, choices);

    if (rel === 'orangtua') {
      const parentJk = rng() < 0.5 ? 'L' : 'P';
      const parentFirst = pickOther(rng, parentJk === 'L' ? MALE_FIRST : FEMALE_FIRST, first);
      const parentFull = `${parentFirst} ${last}`.toUpperCase();
      const parentLahir = shiftDobYears(d.pt.lahir, -randInt(rng, 24, 30));
      const parentAge = ageOf(parentLahir);
      d.idx = {
        nama: parentFull,
        lahir: parentLahir,
        jk: parentJk,
        kawin: 'KAWIN',
        kerja: parentAge >= 62 ? 'PENSIUNAN' : pick(rng, parentJk === 'L' ? KERJA_M : KERJA_F)
      };
      d.appear.foto = genDifferentLook(rng, d.appear.look, parentJk, parentAge);
      d.flaw = parentJk !== d.pt.jk ? ['ktp-nama', 'ktp-ttl', 'ktp-jk', 'ktp-foto'] : ['ktp-nama', 'ktp-ttl', 'ktp-foto'];
      d.kind = 'id';
      d.topic = 'identitas';
      d.tplId = 'gen-ktp-keluarga-orangtua';
      d.errorKind = 'ktp-keluarga';
      d.why = `KTP milik orang tua (${parentJk === 'L' ? 'ayah' : 'ibu'}) pasien! Alamat rumah dan nama belakang sama, tetapi nama (${parentFull}), tanggal lahir (${dmy(parentLahir)}, ${parentAge} th), dan foto KTP bukan milik pasien.`;
      return d;
    }

    if (rel === 'pasangan') {
      const spJk = d.pt.jk === 'L' ? 'P' : 'L';
      const spFirst = pick(rng, spJk === 'L' ? MALE_FIRST : FEMALE_FIRST);
      const spLast = rng() < 0.5 ? last : pickOther(rng, SURNAMES, last);
      const spFull = `${spFirst} ${spLast}`.toUpperCase();
      const delta = spJk === 'P' ? randInt(rng, 1, 5) : -randInt(rng, 1, 5);
      const spLahir = shiftDobYears(d.pt.lahir, delta);
      const spAge = ageOf(spLahir);
      if (spAge < 18) return null;
      d.idx = {
        nama: spFull,
        lahir: spLahir,
        jk: spJk,
        kawin: 'KAWIN',
        kerja: pick(rng, spJk === 'L' ? KERJA_M : KERJA_F)
      };
      d.appear.foto = genDifferentLook(rng, d.appear.look, spJk, spAge);
      d.flaw = ['ktp-nama', 'ktp-ttl', 'ktp-jk', 'ktp-foto'];
      d.kind = 'id';
      d.topic = 'identitas';
      d.tplId = 'gen-ktp-keluarga-pasangan';
      d.errorKind = 'ktp-keluarga';
      d.why = `KTP milik pasangan (${spJk === 'L' ? 'suami' : 'istri'}) pasien! Alamat rumah memang sama, tetapi nama (${spFull}), jenis kelamin, tanggal lahir, dan fotonya berbeda dengan kartu pasien.`;
      return d;
    }

    // Saudara kandung (kakak/adik)
    const sibFirst = pickOther(rng, d.pt.jk === 'L' ? MALE_FIRST : FEMALE_FIRST, first);
    const sibFull = `${sibFirst} ${last}`.toUpperCase();
    const delta = a <= 23 ? -randInt(rng, 2, 5) : (rng() < 0.5 ? -randInt(rng, 2, 6) : randInt(rng, 2, 5));
    const sibLahir = shiftDobYears(d.pt.lahir, delta);
    const sibAge = ageOf(sibLahir);
    if (sibAge < 18) return null;
    d.idx = { nama: sibFull, lahir: sibLahir };
    d.appear.foto = genDifferentLook(rng, d.appear.look, d.pt.jk, sibAge);
    d.flaw = ['ktp-nama', 'ktp-ttl', 'ktp-foto'];
    d.kind = 'id';
    d.topic = 'identitas';
    d.tplId = 'gen-ktp-keluarga-saudara';
    d.errorKind = 'ktp-keluarga';
    d.why = `KTP milik saudara (kakak/adik) pasien! Alamat dan nama belakang sama, tetapi nama depan (${sibFull}), tanggal lahir (${dmy(sibLahir)}, ${sibAge} th), dan foto wajahnya bukan pasien di loket.`;
    return d;
  }

  function mutateKtpAlamat(rng, base) {
    const d = cloneDoc(base);
    const a = ageOf(d.pt.lahir);
    if (a < 5) return null;
    const otherWil = pickOther(rng, WIL_CODES, d.ktp.wil);
    const otherAddr = makeAddress(rng, otherWil);
    d.idx = { wil: otherAddr.wil, kec: otherAddr.kec, alamat: otherAddr.alamat, tl: otherAddr.tl };
    d.appear.foto = genDifferentLook(rng, d.appear.look, d.pt.jk, a);
    d.flaw = ['ktp-alamat', 'ktp-foto'];
    d.kind = 'id';
    d.topic = 'identitas';
    d.tplId = 'gen-ktp-alamat-beda';
    d.errorKind = 'identitas-dokumen';
    d.why = `Nama dan tanggal lahir di ${a < 17 ? 'KIA' : 'KTP'} kebetulan sama, tetapi alamatnya (${otherAddr.alamat}, ${WIL[otherWil]}) berbeda dengan kartu pasien (${d.ktp.alamat}, ${WIL[d.ktp.wil]}) dan fotonya orang lain!`;
    return d;
  }

  function mutateBerkasId(rng, base) {
    const d = cloneDoc(base);
    const swapName = rng() < 0.55;
    if (swapName) {
      const m = d.pt.nama.match(/^((?:Tn|Ny|An|Nn|Sdr)\.\s+\S+)\s+(.+)$/);
      const head = m ? m[1] : d.pt.nama;
      const oldLast = m ? m[2] : 'Pratama';
      const newLast = pickOther(rng, SURNAMES, oldLast);
      const wrongName = `${head} ${newLast}`;
      d.berkas = { nama: wrongName };
      d.flaw = 'id';
      d.kind = 'id';
      d.topic = 'identitas';
      d.tplId = 'gen-berkas-nama-beda';
      d.errorKind = 'identitas-dokumen';
      d.why = `Nama di berkas tertulis "${wrongName}", sedangkan kartu pasien dan KTP/KIA adalah "${d.pt.nama}". Nama belakang yang berbeda menandakan berkas tertukar dengan pasien lain!`;
      return d;
    }
    const a = ageOf(d.pt.lahir);
    const delta = a < 17 ? (a > 6 ? 3 : -2) : (rng() < 0.5 ? -randInt(rng, 6, 14) : randInt(rng, 5, 11));
    const wrongLahir = shiftDobYears(d.pt.lahir, delta);
    if (ageOf(wrongLahir) < 1) return null;
    d.berkas = { lahir: wrongLahir };
    d.flaw = 'id';
    d.kind = 'id';
    d.topic = 'identitas';
    d.tplId = 'gen-berkas-ttl-beda';
    d.errorKind = 'identitas-dokumen';
    d.why = `Tanggal lahir di berkas (${dmy(wrongLahir)}, ${ageOf(wrongLahir)} th) berbeda dengan kartu pasien dan KTP/KIA (${dmy(d.pt.lahir)}, ${a} th). Berkas kemungkinan milik pasien lain bernama sama!`;
    return d;
  }

  function mutateFotoBeda(rng, base) {
    const d = cloneDoc(base);
    const a = ageOf(d.pt.lahir);
    if (a < 5) return null;
    d.appear.foto = genDifferentLook(rng, d.appear.look, d.pt.jk, a);
    d.flaw = 'ktp-foto';
    d.kind = 'gelang';
    d.topic = 'identitas';
    d.tplId = 'gen-ktp-foto-beda';
    d.errorKind = 'identitas-dokumen';
    d.why = `Nama, tanggal lahir, dan alamat di semua kertas memang cocok, tetapi wajah orang di loket sama sekali berbeda dengan foto di ${a < 17 ? 'KIA' : 'KTP'}! Wajib verifikasi ulang sebelum tindakan.`;
    return d;
  }

  function mutateGelang(rng, base) {
    const d = cloneDoc(base);
    if (rng() < 0.5) {
      const m = d.pt.nama.match(/^((?:Tn|Ny|An|Nn|Sdr)\.\s+\S+)\s+(.+)$/);
      const head = m ? m[1] : d.pt.nama;
      const oldLast = m ? m[2] : 'Pratama';
      const wrongName = `${head} ${pickOther(rng, SURNAMES, oldLast)}`;
      d.gelang = { nama: wrongName };
      d.flaw = 'gelang-nama';
      d.kind = 'gelang';
      d.topic = 'identitas';
      d.tplId = 'gen-gelang-nama-beda';
      d.errorKind = 'identitas-dokumen';
      d.why = `Nama di gelang triase tertulis "${wrongName}", padahal kartu pasien adalah "${d.pt.nama}". Gelang tertukar dengan pasien lain — wajib diganti sebelum pemberian obat!`;
      return d;
    }
    const a = ageOf(d.pt.lahir);
    const delta = a < 17 ? (a <= 4 ? -2 : 2) : -randInt(rng, 6, 12);
    const wrongLahir = shiftDobYears(d.pt.lahir, delta);
    if (ageOf(wrongLahir) < 1) return null;
    d.gelang = { lahir: wrongLahir };
    d.flaw = 'gelang-lahir';
    d.kind = 'gelang';
    d.topic = 'identitas';
    d.tplId = 'gen-gelang-ttl-beda';
    d.errorKind = 'identitas-dokumen';
    d.why = `Tanggal lahir di gelang identitas (${dmy(wrongLahir)}) berbeda dengan kartu pasien (${dmy(d.pt.lahir)}). Gelang tertukar dengan pasien bernama sama di triase!`;
    return d;
  }

  function mutateLabId(rng, base) {
    const d = cloneDoc(base);
    if (!d.lab) {
      // Tambahkan hasil lab wajar agar realistis bila base belum punya lab
      d.lab = { rows: [
        ['Hemoglobin', d.pt.jk === 'L' ? '14,4' : '12,8', 'g/dL', d.pt.jk === 'L' ? '13–17' : '12–16', ''],
        ['Leukosit', '9.400', '/µL', '4.000–11.000', ''],
        ['Trombosit', '245.000', '/µL', '150.000–400.000', ''],
        ['GDS', '112', 'mg/dL', '< 200', '']
      ]};
    }
    const a = ageOf(d.pt.lahir);
    const wrongLahir = shiftDobYears(d.pt.lahir, a < 17 ? -3 : -randInt(rng, 7, 16));
    d.lab.ident = { nama: d.pt.nama, lahir: wrongLahir };
    d.flaw = 'lab-id';
    d.kind = 'lab';
    d.topic = 'identitas';
    d.tplId = 'gen-lab-id-tertukar';
    d.errorKind = 'identitas-dokumen';
    d.why = `Lembar hasil laboratorium ini milik pasien lain bernama sama! Tanggal lahir di lab tertulis ${dmy(wrongLahir)}, sedangkan pasien lahir ${dmy(d.pt.lahir)}. Jangan mengambil keputusan klinis dari lab orang lain!`;
    return d;
  }

  function decorateSafeDistractor(rng, base, night) {
    const d = cloneDoc(base);
    const a = ageOf(d.pt.lahir);
    const roll = rng();
    if (night >= 5 && roll < 0.35) {
      d.jkn = { status: 'TIDAK AKTIF' };
      d.why += ' Status kartu JKN tidak aktif bukan alasan menolak layanan gawat darurat (UU 17/2023 Pasal 174).';
    } else if (night >= 2 && a >= 25 && roll < 0.55) {
      d.idx = Object.assign({}, d.idx || {}, { berlaku: '18-04-2018' });
      d.why += ' KTP-el cetakan lama tetap berlaku seumur hidup sehingga tetap sah.';
    } else if (night >= 3 && a >= 18 && d.appear.look.glasses && roll < 0.75) {
      d.appear.fotoStyle = { glasses: 0 };
      d.why += ' Foto KTP memang foto lama tanpa kacamata, tetapi wajahnya tetap orang yang sama.';
    }
    return d;
  }

  /* ================= API GENERATOR UTAMA ================= */
  const CLIN_FLAWS = [];
  const LAB_FLAWS = [];
  SCENARIOS.forEach(sc => {
    sc.flaws.forEach(f => {
      const entry = { sc, f };
      if (f.bucket === 'lab') LAB_FLAWS.push(entry);
      else CLIN_FLAWS.push(entry);
    });
  });

  const ERROR_TEMPLATES = [
    { id:'dosis-x10', label:'Dosis ×10 / overdosis' },
    { id:'satuan-tertukar', label:'Satuan mg/g/mcg tertukar' },
    { id:'alergi-golongan', label:'Alergi satu golongan obat' },
    { id:'kontra-kehamilan', label:'Kontraindikasi kehamilan' },
    { id:'kontra-ginjal', label:'Kontraindikasi ginjal / lansia' },
    { id:'kontra-komorbid', label:'Kontraindikasi komorbid / anak' },
    { id:'interaksi-obat', label:'Interaksi obat (Warfarin + NSAID, ISDN + Sildenafil)' },
    { id:'rute-salah', label:'Rute pemberian salah' },
    { id:'lab-abnormal', label:'Obat bertentangan dengan hasil lab' },
    { id:'ktp-keluarga', label:'KTP / KIA milik keluarga' },
    { id:'identitas-dokumen', label:'Identitas berkas / wajah / gelang / lab tertukar' }
  ];

  function pickNonRecent(rng, arr, getKey, recentSet, usedSet) {
    const fresh = arr.filter(x => (!usedSet || !usedSet.has(getKey(x))) && (!recentSet || !recentSet.has(getKey(x))));
    if (fresh.length) return pick(rng, fresh);
    const notUsed = arr.filter(x => !usedSet || !usedSet.has(getKey(x)));
    if (notUsed.length) return pick(rng, notUsed);
    return pick(rng, arr);
  }

  function generateSafe(rng, night, usedNames, usedScenarios, recentTpls) {
    const eligible = SCENARIOS.filter(sc => {
      if (night < 4 && (sc.id === 'lab_ginjal_metabolik' || sc.id === 'lab_infeksi_tropis')) return false;
      return true;
    });
    const sc = pickNonRecent(rng, eligible, s => s.id, null, usedScenarios);
    const base = sc.safe(rng, usedNames);
    if (usedScenarios) usedScenarios.add(sc.id);
    if (recentTpls && base.tplId) recentTpls.add(base.tplId);
    return decorateSafeDistractor(rng, base, night);
  }

  function generateClinFlaw(rng, usedNames, usedScenarios, usedErrTypes, recentTpls) {
    let pool = CLIN_FLAWS.filter(e => !usedScenarios?.has(e.sc.id) && !usedErrTypes?.has(e.f.errType));
    if (!pool.length) pool = CLIN_FLAWS.filter(e => !usedErrTypes?.has(e.f.errType));
    if (!pool.length) pool = CLIN_FLAWS;
    const chosen = pickNonRecent(rng, pool, e => `${e.sc.id}:${e.f.id}`, recentTpls, null);
    const doc = chosen.f.build(rng, usedNames);
    if (usedScenarios) usedScenarios.add(chosen.sc.id);
    if (usedErrTypes) usedErrTypes.add(chosen.f.errType);
    if (recentTpls) recentTpls.add(`${chosen.sc.id}:${chosen.f.id}`);
    return doc;
  }

  function generateLabFlaw(rng, usedNames, usedScenarios, usedErrTypes, recentTpls) {
    // 25% lab tertukar pasien lain, 75% obat bertentangan dengan hasil lab
    if (rng() < 0.25 && !usedErrTypes?.has('lab-id')) {
      for (let t = 0; t < 6; t++) {
        const sc = pickNonRecent(rng, SCENARIOS, s => s.id, null, usedScenarios);
        const base = sc.safe(rng, usedNames);
        const doc = mutateLabId(rng, base);
        if (doc) {
          if (usedScenarios) usedScenarios.add(sc.id);
          if (usedErrTypes) usedErrTypes.add('lab-id');
          return doc;
        }
        if (usedNames) usedNames.delete(base.pt.nama);
      }
    }
    const chosen = pickNonRecent(rng, LAB_FLAWS, e => `${e.sc.id}:${e.f.id}`, recentTpls, null);
    const doc = chosen.f.build(rng, usedNames);
    if (usedScenarios) usedScenarios.add(chosen.sc.id);
    if (usedErrTypes) usedErrTypes.add(chosen.f.errType);
    if (recentTpls) recentTpls.add(`${chosen.sc.id}:${chosen.f.id}`);
    return doc;
  }

  function generateIdFlaw(rng, night, usedNames, usedScenarios, usedErrTypes) {
    // Prioritaskan KTP milik keluarga (55%), sisanya KTP beda alamat (20%) & identitas berkas (25%)
    const mutators = [
      { key:'ktp-keluarga', fn: mutateKtpKeluarga, weight: 3 },
      { key:'ktp-alamat',   fn: mutateKtpAlamat,   weight: 1 },
      { key:'berkas-id',    fn: mutateBerkasId,    weight: 2 }
    ];
    const weighted = [];
    mutators.forEach(m => {
      const w = usedErrTypes?.has(m.key) ? 1 : m.weight;
      for (let i = 0; i < w; i++) weighted.push(m);
    });
    const eligibleSc = SCENARIOS.filter(sc => night >= 4 || (sc.id !== 'lab_ginjal_metabolik' && sc.id !== 'lab_infeksi_tropis'));
    for (let t = 0; t < 16; t++) {
      const m = pick(rng, weighted);
      const sc = pickNonRecent(rng, eligibleSc, s => s.id, null, usedScenarios);
      const base = sc.safe(rng, usedNames);
      const doc = m.fn(rng, base);
      if (doc) {
        if (usedScenarios) usedScenarios.add(sc.id);
        if (usedErrTypes) usedErrTypes.add(m.key);
        return doc;
      }
      if (usedNames) usedNames.delete(base.pt.nama);
    }
    return generateClinFlaw(rng, usedNames, usedScenarios, usedErrTypes, null);
  }

  function generateGelangFlaw(rng, night, usedNames, usedScenarios, usedErrTypes) {
    const preferFoto = !usedErrTypes?.has('ktp-foto') && rng() < 0.45;
    const eligibleSc = SCENARIOS.filter(sc => night >= 4 || (sc.id !== 'lab_ginjal_metabolik' && sc.id !== 'lab_infeksi_tropis'));
    for (let t = 0; t < 12; t++) {
      const sc = pickNonRecent(rng, eligibleSc, s => s.id, null, usedScenarios);
      const base = sc.safe(rng, usedNames);
      const doc = preferFoto ? mutateFotoBeda(rng, base) : mutateGelang(rng, base);
      if (doc) {
        if (usedScenarios) usedScenarios.add(sc.id);
        if (usedErrTypes) usedErrTypes.add(preferFoto ? 'ktp-foto' : 'gelang');
        return doc;
      }
      if (usedNames) usedNames.delete(base.pt.nama);
    }
    return generateIdFlaw(rng, night, usedNames, usedScenarios, usedErrTypes);
  }

  function generate({ night = 1, bucket = 'clin', usedNames, usedScenarios, usedErrTypes, recentTpls, rng = Math.random } = {}) {
    const parts = String(bucket).split('|');
    const chosenBucket = parts.length > 1 ? pick(rng, parts) : parts[0];

    if (chosenBucket === 'safe') return generateSafe(rng, night, usedNames, usedScenarios, recentTpls);
    if (chosenBucket === 'clin') return generateClinFlaw(rng, usedNames, usedScenarios, usedErrTypes, recentTpls);
    if (chosenBucket === 'id') return night >= 2 ? generateIdFlaw(rng, night, usedNames, usedScenarios, usedErrTypes) : generateClinFlaw(rng, usedNames, usedScenarios, usedErrTypes, recentTpls);
    if (chosenBucket === 'gelang') return night >= 3 ? generateGelangFlaw(rng, night, usedNames, usedScenarios, usedErrTypes) : generateIdFlaw(rng, night, usedNames, usedScenarios, usedErrTypes);
    if (chosenBucket === 'lab') return night >= 4 ? generateLabFlaw(rng, usedNames, usedScenarios, usedErrTypes, recentTpls) : generateClinFlaw(rng, usedNames, usedScenarios, usedErrTypes, recentTpls);

    // 'flaw' (Mode Sulit / acak semua kategori aktif pada malam tersebut)
    const avail = ['clin', 'clin'];
    if (night >= 2) avail.push('id');
    if (night >= 3) avail.push('gelang');
    if (night >= 4) avail.push('lab');
    const sub = pick(rng, avail);
    return generate({ night, bucket: sub, usedNames, usedScenarios, usedErrTypes, recentTpls, rng });
  }

  window.CLINED_IGD_GEN = {
    generate,
    SCENARIOS,
    ERROR_TEMPLATES,
    stats() {
      const adultNames = (MALE_FIRST.length + FEMALE_FIRST.length) * SURNAMES.length;
      const childNames = (BOY_FIRST.length + GIRL_FIRST.length) * SURNAMES.length;
      return {
        scenarios: SCENARIOS.length,
        clinicalFlawTemplates: CLIN_FLAWS.length,
        labFlawTemplates: LAB_FLAWS.length,
        errorCategories: ERROR_TEMPLATES.length,
        nameCombinations: adultNames + childNames
      };
    }
  };
})();
