/* CLINED — Ringkasan Full Blok Kedokteran Keluarga (34 Materi • Selaras Jadwal TA 2026–2027 FK YARSI) */
(() => {
  'use strict';

  const SCHEDULE_META = {
  "title": "Jadwal Putaran 2 Semester Ganjil TA 2026–2027 FK YARSI",
  "block": "Blok Kedokteran Keluarga (Semester 7)",
  "period": "19 Oktober – 26 November 2026",
  "milestones": [
    {
      "icon": "🎬",
      "label": "Pendahuluan Blok",
      "date": "Sel, 20 Okt 2026 (14.50)",
      "note": "DR. Rifda Wulansari (Ar-Rahim)"
    },
    {
      "icon": "🧪",
      "label": "Ujian Praktikum Farma",
      "date": "Kam, 12 Nov 2026 (07.55)",
      "note": "Setelah Praktikum Farma 1–3"
    },
    {
      "icon": "🎤",
      "label": "Pleno Skenario 1–4",
      "date": "Jum, 20 Nov 2026 (13.00)",
      "note": "Al-Quddus (Minggu ke-5)"
    },
    {
      "icon": "📝",
      "label": "Ujian Akhir Blok (UAB)",
      "date": "Sel, 24 Nov 2026 (09.45)",
      "note": "Evaluasi akhir Blok KEDKEL"
    },
    {
      "icon": "🔄",
      "label": "UPER Blok KEDKEL",
      "date": "Kam, 26 Nov 2026 (07.55)",
      "note": "Ujian perbaikan blok"
    }
  ]
};

  const WEEKS = [
  {
    "id": 1,
    "short": "M1",
    "label": "Minggu 1",
    "dates": "19–23 Okt 2026",
    "agenda": "Pendahuluan Blok (Sel 20 Okt) • Fondasi Klinis, Komunikasi, Jiwa, Farma & K3"
  },
  {
    "id": 2,
    "short": "M2",
    "label": "Minggu 2",
    "dates": "26–30 Okt 2026",
    "agenda": "Praktikum Farma 1 • PBL S1 • Bimbingan TM 1 • KedKel, PCA, LTC & Lab Primer"
  },
  {
    "id": 3,
    "short": "M3",
    "label": "Minggu 3",
    "dates": "2–6 Nov 2026",
    "agenda": "Praktikum Farma 2 & 3A • PBL S2 • Bimbingan TM 2 • Lansia, Keluarga, Gizi & Etika"
  },
  {
    "id": 4,
    "short": "M4",
    "label": "Minggu 4",
    "dates": "9–13 Nov 2026",
    "agenda": "Praktikum Farma 3B • 🎯 Ujian Praktikum Farma (Kam 12 Nov) • PBL S3 • TM 3 & 4"
  },
  {
    "id": 5,
    "short": "M5",
    "label": "Minggu 5",
    "dates": "16–20 Nov 2026",
    "agenda": "Feedback Tugas Baca (16–17 Nov) • Bimbingan TM 5 • Pleno Skenario 1–4 (Jum 20 Nov)"
  }
];

  const CLUSTERS = [
  {
    "id": "all",
    "icon": "📚",
    "label": "Semua (34)"
  },
  {
    "id": "fondasi",
    "icon": "🩺",
    "label": "Fondasi & Komunikasi"
  },
  {
    "id": "jiwa",
    "icon": "🧠",
    "label": "Jiwa, Perilaku & Keluarga"
  },
  {
    "id": "farma",
    "icon": "💊",
    "label": "Farma, BSO & Lab Primer"
  },
  {
    "id": "lansia_k3",
    "icon": "👴",
    "label": "Lansia, LTC & PAK/K3"
  },
  {
    "id": "gizi_lingkungan",
    "icon": "🥗",
    "label": "Gizi, Fisik & Lingkungan"
  },
  {
    "id": "islam_etika",
    "icon": "☪️",
    "label": "Etika, Hukum & Islam"
  }
];

  const TOPICS = [
  {
    "no": 1,
    "id": "d01",
    "driveNo": 1,
    "week": 1,
    "weekA": 1,
    "weekB": 1,
    "schedule": "A: Rab 21 Okt • B: Jum 23 Okt",
    "scheduleA": "Rab 21 Okt (07.55)",
    "scheduleB": "Jum 23 Okt (07.55)",
    "cluster": "jiwa",
    "icon": "🧠",
    "title": "Deteksi Dini Gangguan Jiwa & Risiko Bunuh Diri",
    "dosen": "dr. Liko Maryudhiyanto, Sp.KJ",
    "readMin": 3,
    "tldr": "Dokter keluarga di layanan primer adalah garda terdepan mengenali gangguan jiwa sedini mungkin dan melakukan skrining aktif risiko bunuh diri sebelum jatuh ke kondisi krisis.",
    "sections": [
      {
        "heading": "Konsep & Pentingnya Deteksi Dini",
        "bullets": [
          "**Definisi (Depkes RI & WHO)**: Perubahan fungsi jiwa yang menimbulkan penderitaan (*distress* signifikan) dan/atau hambatan dalam peran pribadi, sosial, maupun pekerjaan.",
          "**Kenapa wajib dideteksi dini?**: Mencegah kronisitas, menekan disabilitas jangka panjang, memperbaiki prognosis, serta menurunkan angka percobaan dan kematian akibat bunuh diri.",
          "**Gejala klinis utama yang perlu diwaspadai**: Perubahan mood ekstrem (sedih berkepanjangan/hilang minat atau euforia), cemas/panik berlebihan, gangguan tidur & nafsu makan, keluhan somatik berulang tanpa sebab organik jelas, menarik diri dari sosial, hingga gejala psikotik (halusinasi/waham)."
        ]
      },
      {
        "heading": "Faktor Risiko Bunuh Diri & Skrining",
        "bullets": [
          "**Prediktor terkuat**: Riwayat percobaan bunuh diri sebelumnya (*previous suicide attempt*) dan riwayat bunuh diri di keluarga.",
          "**Faktor klinis & psikososial**: Gangguan mood (depresi berat, bipolar), penyalahgunaan zat/alkohol, penyakit fisik kronis & nyeri kronis, riwayat trauma/kekerasan/*bullying*, kehilangan besar (putus hubungan, duka, gagal akademik, masalah finansial/hukum), isolasi sosial, serta **akses mudah ke sarana mematikan** (obat resep tidak aman, benda tajam/senjata).",
          "**Hambatan utama**: Stigma sosial terhadap pencarian bantuan kesehatan jiwa.",
          "**Instrumen skrining primer**: SRQ-20 (gangguan mental emosional), PHQ-9 (depresi), GAD-7 (cemas), dan skrining ide/rencana bunuh diri (seperti C-SSRS / SAD PERSONS)."
        ]
      },
      {
        "heading": "Penanganan Awal & Layanan Krisis",
        "bullets": [
          "**Saat pasien menunjukkan risiko tinggi**: Tetap tenang dan empatik, jangan tinggalkan pasien sendirian, singkirkan akses ke benda/obat berbahaya, libatkan keluarga/pendamping, dan segera rujuk ke IGD/psikiater.",
          "**Layanan krisis nasional**: Hubungi **119** atau akses **healing119.id** (layanan konseling krisis jiwa RSJ dr. H. Marzoeki Mahdi Bogor)."
        ]
      }
    ],
    "highYield": [
      "Menanyakan langsung ide bunuh diri secara empatik **TIDAK** memicu pasien bunuh diri — justru menyelamatkan nyawa.",
      "Ingat hotline krisis di slide dr. Liko: **119** / **healing119.id** (RSJ Marzoeki Mahdi Bogor)."
    ]
  },
  {
    "no": 2,
    "id": "d02",
    "driveNo": 2,
    "week": 1,
    "weekA": 1,
    "weekB": 2,
    "schedule": "A: Rab 21 Okt (M1) • B: Jum 30 Okt (M2)",
    "scheduleA": "Rab 21 Okt (09.45)",
    "scheduleB": "Jum 30 Okt (09.45)",
    "cluster": "fondasi",
    "icon": "🗣️",
    "title": "Teknik Komunikasi Dokter–Pasien",
    "dosen": "Prof. dr. Hj. Qomariyah, MS, PKK, AIFM, Sp.KKLP",
    "readMin": 4,
    "tldr": "Komunikasi efektif adalah inti transaksi terapeutik: menyesuaikan pola hubungan dengan kondisi pasien, menjalankan komunikasi inti secara runtut, dan berempati saat menyampaikan berita buruk.",
    "sections": [
      {
        "heading": "3 Model Klasik Hubungan Dokter–Pasien",
        "table": {
          "headers": [
            "Model",
            "Peran Dokter & Pasien",
            "Contoh Kondisi"
          ],
          "rows": [
            [
              "Activity–Passivity",
              "Dokter aktif penuh, pasien pasif (seperti orang tua–bayi)",
              "Pasien tidak sadar, koma, gawat darurat berat, anestesi"
            ],
            [
              "Guidance–Cooperation",
              "Dokter membimbing, pasien kooperatif mengikuti arahan",
              "Penyakit akut ringan–sedang (ISPA, infeksi akut)"
            ],
            [
              "Mutual Participation",
              "Kemitraan setara; dokter & pasien berbagi keputusan",
              "Penyakit kronis (DM, hipertensi, asma, TBC jangka panjang)"
            ]
          ]
        }
      },
      {
        "heading": "Alur Komunikasi Inti & Keterampilan Dasar",
        "bullets": [
          "**5 Langkah Komunikasi Inti**: (1) Anamnesis → (2) Penetapan diagnosis → (3) Penyampaian hasil pemeriksaan → (4) Membangun transaksi pengobatan (kesepakatan terapi + edukasi efek samping & jadwal kontrol) → (5) Penutup.",
          "**Verbal & Non-verbal**: Gunakan bahasa sederhana tanpa jargon medis, kontak mata hangat, intonasi tenang, posisi duduk sejajar, dan hindari sikap menghakimi atau memotong cerita pasien.",
          "**Prinsip mendengar aktif**: Beri ruang pasien bicara di menit awal, klarifikasi dengan pertanyaan terbuka lalu tertutup, dan rangkum pemahaman pasien (*teach-back*)."
        ]
      },
      {
        "heading": "5 Tahap Reaksi Psikologis Berita Buruk (Kübler-Ross)",
        "bullets": [
          "**1. Denial & Isolation (Penolakan)**: Menyangkal hasil lab/diagnosis (\"Tidak mungkin, pasti salah periksa\").",
          "**2. Anger (Marah)**: Melampiaskan kekesalan ke dokter, keluarga, atau takdir (\"Kenapa harus saya?\").",
          "**3. Bargaining (Tawar-menawar)**: Berjanji berubah demi kesembuhan atau menunda kenyataan.",
          "**4. Depression (Depresi)**: Kesedihan mendalam, menarik diri, merasa tidak berdaya.",
          "**5. Acceptance (Penerimaan)**: Menerima kenyataan dengan tenang dan mulai fokus pada langkah penanganan."
        ]
      }
    ],
    "highYield": [
      "Jembatan keledai Kübler-Ross: **DABDA** (*Denial → Anger → Bargaining → Depression → Acceptance*).",
      "Pasien koma/IGD = **Activity–Passivity**; pasien infeksi akut sadar = **Guidance–Cooperation**; pasien DM/hipertensi kronis = **Mutual Participation**."
    ]
  },
  {
    "no": 3,
    "id": "d04",
    "driveNo": 4,
    "week": 1,
    "weekA": 1,
    "weekB": 1,
    "schedule": "A: Rab 21 Okt • B: Jum 23 Okt",
    "scheduleA": "Rab 21 Okt (14.50)",
    "scheduleB": "Jum 23 Okt (14.50)",
    "cluster": "fondasi",
    "icon": "📋",
    "title": "Diagnosis Holistik",
    "dosen": "DR. dr. Erlina Wijayanti, MPH, Sp.KKLP",
    "readMin": 4,
    "tldr": "Diagnosis holistik bukan sekadar memberi nama penyakit, melainkan memetakan 5 aspek pasien secara utuh (Personal, Klinis, Risiko Internal, Risiko Eksternal, dan Derajat Fungsional) berdasarkan Mandala of Health.",
    "sections": [
      {
        "heading": "5 Aspek Diagnosis Holistik (Wajib Hafal!)",
        "table": {
          "headers": [
            "Aspek",
            "Isi yang Digali & Dituliskan"
          ],
          "rows": [
            [
              "1. Personal",
              "Alasan kedatangan, persepsi penyakit, kekhawatiran (fear/concern), harapan (expectation), dan nilai spiritual"
            ],
            [
              "2. Klinis",
              "Diagnosis kerja (ICD-10), diagnosis banding, serta status apakah termasuk Penyakit Akibat Kerja (PAK) atau bukan"
            ],
            [
              "3. Risiko Internal",
              "Faktor dari dalam diri: genetik, biologis, komorbid, status gizi, dan gaya hidup (pola makan, aktivitas fisik, rokok, alkohol)"
            ],
            [
              "4. Risiko Eksternal",
              "Faktor luar: siklus & dinamika/fungsi keluarga (APGAR, genogram, SCREEM), lingkungan fisik rumah, tempat kerja, sosial-ekonomi"
            ],
            [
              "5. Derajat Fungsional",
              "Skala 1–5 kemampuan pasien menjalankan aktivitas sehari-hari"
            ]
          ]
        }
      },
      {
        "heading": "Skala Derajat Fungsional (1–5) & Instrumen Pengkajian",
        "bullets": [
          "**Derajat 1**: Mandiri penuh, tidak ada kesulitan menjalankan aktivitas harian.",
          "**Derajat 2**: Mulai berkurang, tetapi masih mampu mengerjakan aktivitas ringan/sehari-hari secara mandiri.",
          "**Derajat 3**: Hanya mampu melakukan perawatan diri dasar, tidak mampu bekerja penuh.",
          "**Derajat 4**: Aktivitas sangat terbatas, banyak berbaring, bergantung pada orang lain.",
          "**Derajat 5**: Tidak berdaya sama sekali, sepenuhnya terbaring di tempat tidur dan bergantung total.",
          "**Pengkajian Risiko Internal terukur**: Pola makan dinilai dengan **Food Record 3 hari** (2 hari kerja + 1 hari libur), aktivitas fisik dengan **Bouchard / GPAQ**."
        ]
      },
      {
        "heading": "8 Tahap Siklus Perkembangan Keluarga (Duvall, 1957)",
        "bullets": [
          "**Tahap 1**: Pasangan baru menikah (*beginning families*, tanpa anak).",
          "**Tahap 2**: Keluarga melahirkan anak pertama (*childbearing*, anak tertua <30 bulan).",
          "**Tahap 3**: Keluarga dengan anak prasekolah (anak tertua 2,5–6 tahun).",
          "**Tahap 4**: Keluarga dengan anak usia sekolah (6–13 tahun).",
          "**Tahap 5**: Keluarga dengan anak remaja (13–20 tahun).",
          "**Tahap 6**: Keluarga melepas anak dewasa (*launching center*).",
          "**Tahap 7**: Keluarga usia pertengahan (*middle-age / empty nest* hingga pensiun).",
          "**Tahap 8**: Keluarga usia lanjut (*aging families*, pensiun hingga pasangan wafat)."
        ]
      }
    ],
    "highYield": [
      "Urutan 5 Aspek: **P–K–I–E–F** (Personal, Klinis, Internal, Eksternal, Fungsional).",
      "**Mandala of Health** menempatkan manusia (*Body–Mind–Spirit*) di pusat ekosistem keluarga, gaya hidup, budaya, lingkungan fisik, dan biosfer.",
      "Duvall **Tahap 7** = *Empty nest* sampai pensiun (sering keluar!)."
    ]
  },
  {
    "no": 4,
    "id": "d06",
    "driveNo": 6,
    "week": 1,
    "weekA": 2,
    "weekB": 1,
    "schedule": "B: Rab 21 Okt (M1) • A: Sen 26 Okt (M2)",
    "scheduleA": "Sen 26 Okt (13.00)",
    "scheduleB": "Rab 21 Okt (14.50)",
    "cluster": "farma",
    "icon": "✅",
    "title": "Rational Use of Medicine (Penggunaan Obat Rasional)",
    "dosen": "dr. Lilian Batubara, M.Kes",
    "readMin": 3,
    "tldr": "Penggunaan obat rasional (POR) memastikan pasien mendapat obat sesuai indikasi klinis, dosis tepat, durasi cukup, dan biaya paling terjangkau melalui 6 langkah WHO.",
    "sections": [
      {
        "heading": "Definisi WHO (1985) & Kriteria Obat Rasional",
        "bullets": [
          "**Definisi POR**: Pasien menerima obat sesuai kebutuhan klinis, dalam dosis yang memenuhi kebutuhan individual, untuk periode waktu yang adekuat, dengan biaya terendah bagi pasien dan masyarakat.",
          "**Tepat Indikasi, Tepat Obat, Tepat Pasien, Tepat Dosis/Cara/Lama Pemberian, Tepat Informasi, dan Waspada Efek Samping**."
        ]
      },
      {
        "heading": "6 Langkah Proses Pengobatan Rasional (WHO)",
        "bullets": [
          "**1. Tetapkan masalah pasien** (diagnosis kerja yang akurat).",
          "**2. Tetapkan tujuan terapi** (kuratif, simtomatik, atau preventif).",
          "**3. Tentukan obat pilihan (*P-drug*)**: Dinilai dari 4 kriteria — **Efektivitas (kemanjuran), Keamanan, Kecocokan (kontraindikasi/interaksi), dan Biaya**.",
          "**4. Mulai terapi & tulis resep** secara lengkap dan legal.",
          "**5. Berikan informasi, instruksi & peringatan** (efek terapi, aturan pakai, efek samping, kapan kembali).",
          "**6. Pantau (dan hentikan bila perlu)** respons terapi."
        ]
      },
      {
        "heading": "10 Dasar Pertimbangan Pemilihan Obat",
        "bullets": [
          "Pilih obat yang paling *established* (bukti ilmiah kuat) dan hindari kombinasi tetap bila tidak perlu.",
          "Gunakan **rute paling aman** (oral dipilih bila pasien bisa menelan) dan **dosis efektif terkecil**.",
          "Kurangi polifarmasi untuk mencegah interaksi obat dan meningkatkan kepatuhan pasien.",
          "Sesuaikan dengan kondisi khusus: usia (anak/lansia), kehamilan/menyusui, fungsi ginjal/hati, dan kemampuan ekonomi."
        ]
      }
    ],
    "highYield": [
      "4 Kriteria pemilihan *P-drug* (Langkah ke-3 WHO): **E–K–K–B** (Efektivitas, Keamanan, Kecocokan, Biaya).",
      "Rute paling aman bila pasien sadar & bisa menelan = **per oral**, dengan **dosis efektif terkecil**."
    ]
  },
  {
    "no": 5,
    "id": "d07",
    "driveNo": 7,
    "week": 1,
    "weekA": 1,
    "weekB": 1,
    "schedule": "A: Kam 22 Okt • B: Jum 23 Okt",
    "scheduleA": "Kam 22 Okt (07.55)",
    "scheduleB": "Jum 23 Okt (09.45)",
    "cluster": "fondasi",
    "icon": "💬",
    "title": "Konseling Individu",
    "dosen": "dr. Maya Trisiswati, MKM",
    "readMin": 3,
    "tldr": "Konseling bukan memberi nasihat sepihak, melainkan membantu klien memahami masalahnya dan mengambil keputusan sendiri secara sadar dalam suasana aman, rahasia, dan empatik.",
    "sections": [
      {
        "heading": "Beda Pendidikan Kesehatan, Konsultasi & Konseling",
        "table": {
          "headers": [
            "Pendekatan",
            "Peran Dokter & Arah Keputusan"
          ],
          "rows": [
            [
              "Pendidikan Kesehatan",
              "Menyampaikan informasi agar sasaran sadar dan mau mengikuti anjuran"
            ],
            [
              "Konsultasi",
              "Membantu analisis masalah dan memberi saran/rekomendasi profesional"
            ],
            [
              "Konseling",
              "Membantu klien mengeksplorasi perasaan & alternatif agar klien mengambil keputusan sendiri"
            ]
          ]
        }
      },
      {
        "heading": "Keterampilan Inti, Setting & Sikap Konselor",
        "bullets": [
          "**Mendengar Aktif (3 bentuk refleksi)**: **Refleksi Isi** (mengulang inti fakta), **Refleksi Perasaan** (menangkap emosi di balik cerita), dan **Refleksi Makna** (menghubungkan fakta + perasaan).",
          "**Perilaku verbal & non-verbal mendukung**: Bahasa mudah dimengerti, sesuai usia, kontak mata wajar, ekspresi ramah, humor ringan proporsional, tidak memotong/menghakimi/menggurui/berpidato.",
          "**Setting waktu & tempat**: Durasi ideal **maksimal 45 menit**, hindari jam tidur/ibadah/terlalu pagi; tempat tidak harus di ruang praktik asalkan **tenang, nyaman, dan menjaga privasi**.",
          "**5 Isi Konseling**: Informasi umum → Penilaian tingkat risiko → Rencana perubahan perilaku → Identifikasi hambatan (gender, adat, ekonomi) → Akses rujukan."
        ]
      },
      {
        "heading": "Menangani Klien Sulit",
        "bullets": [
          "**Klien menangis tersedu**: Beri waktu meluapkan emosi, sediakan tisu/minum, yakinkan konselor hadir mendengarkan, jangan langsung menyuruh berhenti menangis.",
          "**Klien pendiam/terpaksa**: Sampaikan jujur bahwa konseling sulit berhasil jika terpaksa, beri ruang tenang tanpa memaksa, bangun rasa aman secara bertahap."
        ]
      }
    ],
    "highYield": [
      "Durasi konseling individu: **maksimal 45 menit**; jangan dilakukan saat jam ibadah/tidur.",
      "3 jenis refleksi dalam mendengar aktif: **Isi, Perasaan, Makna**."
    ]
  },
  {
    "no": 6,
    "id": "d10",
    "driveNo": 10,
    "week": 1,
    "weekA": 1,
    "weekB": 1,
    "schedule": "B: Kam 22 Okt • A: Jum 23 Okt",
    "scheduleA": "Jum 23 Okt (13.00)",
    "scheduleB": "Kam 22 Okt (07.55)",
    "cluster": "farma",
    "icon": "💊",
    "title": "BSO Padat & Setengah Padat",
    "dosen": "Drs. Dharma Permana, Apt., Ph.D",
    "readMin": 5,
    "tldr": "Pemilihan bentuk sediaan padat (serbuk, kapsul, tablet, supositoria) dan setengah padat (salep, krim, gel, pasta) bergantung pada stabilitas zat aktif, kecepatan absorpsi, lokasi kerja, dan kemampuan menelan pasien.",
    "sections": [
      {
        "heading": "BSO Padat: Serbuk, Kapsul & Tablet Khusus",
        "bullets": [
          "**Pulveres (puyer/serbuk terbagi)**: Cocok untuk anak/dewasa sulit menelan, absorpsi lebih cepat daripada tablet (tidak butuh waktu disintegrasi 5–10 menit), lebih stabil dibanding cair; bobot ideal **300–1000 mg (rata-rata 500 mg)**; kurang cocok untuk zat higroskopis atau sangat pahit.",
          "**Pulvis (serbuk tak terbagi)**: Oral untuk obat indeks terapi lebar (mis. oralit); topikal = **Pulvis adspersorius** (bedak tabur, kehalusan **100 mesh**).",
          "**Tablet Sublingual & Bukal**: Melarut cepat di bawah lidah/pipi, absorpsi langsung lewat mukosa mulut → **menghindari first-pass metabolism hati** (kerja sangat cepat, mis. ISDN).",
          "**Tablet Salut Enterik**: Disalut bahan tahan asam (selulosa asetat ftalat/shellac) agar **tidak hancur di lambung** melainkan di usus (melindungi lambung dari obat iritatif atau melindungi obat yang rusak oleh asam lambung) → **jangan digerus/dikunyah**.",
          "**Tablet Lepas Lambat (*Sustained/Extended Release*)**: Melepaskan obat bertahap agar frekuensi minum lebih jarang → tidak boleh dibelah/digerus."
        ]
      },
      {
        "heading": "BSO Setengah Padat (Topikal & Mata)",
        "table": {
          "headers": [
            "Bentuk Sediaan",
            "Ciri Khas & Indikasi Utama"
          ],
          "rows": [
            [
              "Salep (Unguentum)",
              "Basis berlemak/oklusif, bertahan lama di kulit; cocok untuk lesi kering/kronis/skuama"
            ],
            [
              "Krim (Cremor)",
              "Emulsi air + minyak (M/A mudah dicuci, tidak lengket); cocok untuk lesi basah/subakut/berambut"
            ],
            [
              "Pasta",
              "Mengandung **40–50% serbuk padat** (ZnO, amilum, talk); konsistensi kenyal, tidak berminyak, protektif/menyerap eksudat"
            ],
            [
              "Gel",
              "Basis air transparan, dingin, cepat meresap, tidak berminyak; cocok untuk area berambut/wajah"
            ],
            [
              "Salep Mata (Oculentum)",
              "**Wajib steril** & bebas partikel kasar; waktu kontak lebih lama daripada tetes mata, tapi dapat mengaburkan penglihatan sementara"
            ]
          ]
        }
      }
    ],
    "highYield": [
      "Ingat angka emas: bobot pulveres ideal **500 mg (300–1000 mg)**; bedak tabur **100 mesh**; pasta mengandung **40–50% serbuk padat**.",
      "Tablet **sublingual** = hindari *first-pass effect*; tablet **salut enterik** = pecah di usus, tidak boleh digerus."
    ]
  },
  {
    "no": 7,
    "id": "d13",
    "driveNo": 13,
    "week": 1,
    "weekA": 1,
    "weekB": 2,
    "schedule": "A: Kam 22 Okt (M1) • B: Sen 26 Okt (M2)",
    "scheduleA": "Kam 22 Okt (13.00)",
    "scheduleB": "Sen 26 Okt (08.50)",
    "cluster": "islam_etika",
    "icon": "🛡️",
    "title": "Asuransi Syariah",
    "dosen": "Dr. dr. Endy M. Astiwara, MA, FIIS",
    "readMin": 3,
    "tldr": "Berbeda dari asuransi konvensional yang memindahkan risiko (transfer of risk), asuransi syariah menggunakan akad tolong-menolong (ta’awun & takaful) dengan dana tabarru’ bebas gharar, maysir, dan riba.",
    "sections": [
      {
        "heading": "Perbandingan Asuransi Syariah vs Konvensional",
        "table": {
          "headers": [
            "Aspek",
            "Asuransi Konvensional",
            "Asuransi Syariah (Takaful)"
          ],
          "rows": [
            [
              "Prinsip Risiko",
              "Transfer of risk (peserta → perusahaan)",
              "**Sharing of risk** (saling menanggung antar peserta)"
            ],
            [
              "Akad Dasar",
              "Jual-beli/pertanggungan (Pasal 246 KUHD)",
              "Ta’awuni/takafuli & wakalah bil ujrah (pengelolaan)"
            ],
            [
              "Kepemilikan Dana",
              "Premi menjadi milik perusahaan",
              "Dana **tabarru’** tetap milik kolektif peserta"
            ],
            [
              "Pengawasan",
              "Dewan Komisaris saja",
              "Pengawasan ganda: Dewan Komisaris + **Dewan Pengawas Syariah (DPS)**"
            ]
          ]
        }
      },
      {
        "heading": "4 Unsur Terlarang & Prinsip Investasi Halal",
        "bullets": [
          "**4 aspek konvensional yang bertentangan syariah**: **Gharar** (ketidakjelasan/ketidakpastian), **Maysir** (judi/untung-untungan), **Riba** (bunga), dan **Zhulm** (kezaliman/ketidakadilan).",
          "**Praktik investasi yang dilarang**: Spekulasi/maysir, *short selling* (*bay’ al-ma’dum*), *cornering* (*bay’ al-najasy*), gharar, riba, serta sektor usaha haram.",
          "**Fungsi polis**: Bukti tertulis perjanjian itikad baik, bukti jaminan ganti rugi/santunan, dan bukti pembayaran kontribusi/premi."
        ]
      }
    ],
    "highYield": [
      "Kata kunci syariah: **Sharing of risk**, dana **tabarru’** (milik peserta), pengawasan ganda dengan **DPS**.",
      "4 larangan: **Gharar, Maysir, Riba, Zhulm**."
    ]
  },
  {
    "no": 8,
    "id": "d15",
    "driveNo": 15,
    "week": 1,
    "weekA": 2,
    "weekB": 1,
    "schedule": "B: Kam 22 Okt (M1) • A: Kam 29 Okt (M2)",
    "scheduleA": "Kam 29 Okt (14.50)",
    "scheduleB": "Kam 22 Okt (13.00)",
    "cluster": "lansia_k3",
    "icon": "🏭",
    "title": "Ruang Lingkup Kesehatan Kerja & 7 Langkah Diagnosis PAK",
    "dosen": "dr. Dian Mardhiyah, MKK, Sp.KKLP, Subsp.FOMC, Ph.D",
    "readMin": 5,
    "tldr": "Kesehatan kerja melindungi pekerja dari bahaya lingkungan kerja (fisik, kimia, biologi, ergonomi, psikososial), dan penetapan Penyakit Akibat Kerja (PAK) wajib mengikuti 7 langkah diagnosis baku.",
    "sections": [
      {
        "heading": "Ruang Lingkup & Standar Kesehatan Kerja (K3)",
        "bullets": [
          "**4 Jenis Pemeriksaan Kesehatan Pekerja (Permenaker 2/1980)**: (1) **Awal** (sebelum diterima kerja), (2) **Berkala** (minimal 1x/tahun), (3) **Khusus** (pekerja berisiko tertentu), (4) **Purna Bakti** (3 bulan sebelum pensiun).",
          "**Petugas P3K**: Risiko rendah = **1 : 150** pekerja; risiko tinggi = **1 : 100** pekerja.",
          "**Gizi Kerja**: 50–200 pekerja wajib **ruang makan**; >200 pekerja wajib **kantin perusahaan**.",
          "**NAB Kebisingan**: **85 dB** maksimal **8 jam/hari**; setiap naik +3 dB waktu pajanan dibagi dua (**88 dB = 4 jam**, **91 dB = 2 jam**). Program Konservasi Pendengaran memakai audiometri nada murni.",
          "**Getaran lokal (*hand-arm vibration*)**: Paparan bor genggam/mesin getar memicu **Vibration White Finger (VWF)** (gangguan vaskular, saraf, dan sendi tangan)."
        ]
      },
      {
        "heading": "7 Langkah Diagnosis Penyakit Akibat Kerja (PAK)",
        "bullets": [
          "**1. Tegakkan diagnosis klinis** sesuai prosedur medis.",
          "**2. Tentukan pajanan yang dialami** pekerja di tempat kerja (saat ini & riwayat sebelumnya).",
          "**3. Tentukan hubungan pajanan dengan diagnosis klinis** berdasarkan *evidence-based medicine*.",
          "**4. Tentukan apakah besarnya pajanan cukup** untuk menimbulkan penyakit (dosis, durasi, NAB, pemakaian APD).",
          "**5. Tentukan faktor individu** yang berperan (genetik, alergi, riwayat penyakit sebelumnya).",
          "**6. Tentukan faktor lain di luar tempat kerja** (hobi, pekerjaan sampingan, lingkungan rumah).",
          "**7. Tetapkan diagnosis okupasi**: Apakah **PAK**, penyakit diperberat pekerjaan, atau bukan PAK."
        ]
      }
    ],
    "highYield": [
      "Urutan 7 Langkah PAK: **Klinis → Pajanan → Hubungan (EBM) → Besarnya pajanan → Faktor individu → Faktor luar kerja → Diagnosis PAK**.",
      "Hafal angka K3: NAB bising **85 dB (8 jam) / 88 dB (4 jam) / 91 dB (2 jam)**; P3K **1:150** (rendah) / **1:100** (tinggi); kantin **>200 pekerja**."
    ]
  },
  {
    "no": 9,
    "id": "s01",
    "driveNo": null,
    "isScheduleExtra": true,
    "cluster": "lansia_k3",
    "icon": "🦺",
    "title": "Kecelakaan Kerja (K3 & Return to Work)",
    "dosen": "dr. Dian Mardiyah, MKK, Sp.KKLP, Subsp.COPC, Ph.D",
    "readMin": 3,
    "tldr": "Kecelakaan kerja (KK) adalah insiden akut terkait hubungan kerja (termasuk rute wajar berangkat–pulang) yang dicegah lewat hierarki pengendalian K3, wajib dilaporkan ke BPJS Ketenagakerjaan maksimal 2×24 jam, dan ditindaklanjuti dengan program Return to Work.",
    "sections": [
      {
        "heading": "Definisi, Ruang Lingkup & Perbedaan KK vs PAK",
        "table": {
          "headers": [
            "Aspek",
            "Kecelakaan Kerja (KK)",
            "Penyakit Akibat Kerja (PAK)"
          ],
          "rows": [
            [
              "Onset",
              "Akut, mendadak, tidak terduga pada waktu & lokasi tertentu",
              "Kronik/bertahap akibat pajanan kumulatif di tempat kerja"
            ],
            [
              "Penyebab",
              "Insiden mekanis, jatuh, terjepit, listrik, bahan kimia akut, kecelakaan lalu lintas rute kerja",
              "Pajanan bahaya fisik (bising), kimia, biologi, ergonomi, psikososial"
            ],
            [
              "Ruang Lingkup JKK",
              "Di tempat kerja & dalam perjalanan berangkat/pulang melalui rute wajar (PP No. 44/2015)",
              "Ditegakkan melalui 7 Langkah Diagnosis PAK (Perpres No. 7/2019)"
            ]
          ]
        }
      },
      {
        "heading": "Faktor Penyebab (Teori Domino Heinrich & Piramida Kecelakaan)",
        "bullets": [
          "**Unsafe Act (~88%)**: Perilaku tidak aman pekerja — tidak memakai APD, melanggar SOP, bekerja terburu-buru, kelelahan (*fatigue*), atau kurang pelatihan.",
          "**Unsafe Condition (~10%)**: Lingkungan/alat tidak aman — lantai licin, mesin tanpa pelindung (*guarding*), pencahayaan buruk, kebocoran bahan kimia, ventilasi kurang.",
          "**Faktor Tak Terduga / Act of God (~2%)**: Kejadian alam di luar kendali manusia.",
          "**Konsep Near Miss (Nyaris Celaka)**: Menurut Piramida Bird, di balik 1 cedera fatal terdapat ratusan insiden ringan dan ribuan *near miss* — pelaporan *near miss* krusial untuk mencegah kecelakaan berat."
        ]
      },
      {
        "heading": "Pencegahan, Tata Laksana, Pelaporan & Return to Work (RTW)",
        "bullets": [
          "**Hierarki Pengendalian Bahaya (paling efektif → terakhir)**: (1) **Eliminasi** → (2) **Substitusi** → (3) **Rekayasa Teknik (*Engineering*)** → (4) **Pengendalian Administratif** (SOP, rotasi shift, pelatihan) → (5) **APD** (benteng terakhir).",
          "**Peran Dokter Layanan Primer**: Pertolongan pertama & stabilisasi kegawatdaruratan (ABCDE), rujukan tepat, dokumentasi rekam medis akurat mengenai kronologi hubungan kerja, serta pencegahan kecacatan.",
          "**Pelaporan JKK (BPJS Ketenagakerjaan & Disnaker)**: **Tahap I** wajib dilaporkan maksimal **2×24 jam** sejak kejadian; **Tahap II** dilaporkan setelah pekerja sembuh, cacat, atau meninggal untuk penetapan manfaat JKK.",
          "**Return to Work (RTW)**: Program pendampingan medis & rehabilitasi kerja terstruktur (penilaian *fit to work*, modifikasi tugas/jam kerja, evaluasi tempat kerja) agar pekerja pascacedera dapat kembali bekerja dengan aman dan produktif."
        ]
      }
    ],
    "highYield": [
      "Batas waktu pelaporan awal (Tahap I) Kecelakaan Kerja ke BPJS Ketenagakerjaan & Disnaker adalah **2×24 jam**.",
      "Kecelakaan lalu lintas saat berangkat atau pulang kerja melalui **rute yang wajar dan biasa dilalui** termasuk **Kecelakaan Kerja** (ditanggung JKK).",
      "Penyebab terbanyak KK menurut Heinrich adalah **unsafe act (~88%)**; pengendalian paling efektif adalah **Eliminasi**, sedangkan **APD selalu pilihan terakhir**."
    ],
    "week": 1,
    "weekA": 1,
    "weekB": 3,
    "schedule": "A: Kam 22 Okt (M1) & Rab 4 Nov (M3) • B: Sel 3 Nov (M3)",
    "scheduleA": "Kam 22 Okt (14.50) & Rab 4 Nov (07.55)",
    "scheduleB": "Sel 3 Nov (07.55)"
  },
  {
    "no": 10,
    "id": "d14",
    "driveNo": 14,
    "week": 1,
    "weekA": 2,
    "weekB": 1,
    "schedule": "B: Kam 22 Okt (M1) • A: Jum 30 Okt (M2)",
    "scheduleA": "Jum 30 Okt (09.45)",
    "scheduleB": "Kam 22 Okt (14.50)",
    "cluster": "islam_etika",
    "icon": "⚖️",
    "title": "Sebab-Sebab Perilaku Menyimpang dalam Islam",
    "dosen": "Dr. dr. Endy M. Astiwara, MA, FIIS",
    "readMin": 3,
    "tldr": "Perilaku menyimpang dipahami dari dua sisi: teori sosiologis (anomi, labelling) dan akar spiritual dalam Islam (lemahnya iman, hawa nafsu/hirsh, dan terbiasa dengan maksiat yang menghitamkan kalbu).",
    "sections": [
      {
        "heading": "Teori Sosiologis Penyimpangan",
        "bullets": [
          "**Anomi**: Kondisi masyarakat tanpa norma/nilai yang dihayati konsisten sebagai pedoman (terjadi saat nilai lama ditinggalkan, sementara nilai baru belum terbentuk).",
          "**Teori Labelling**: Seseorang yang melakukan penyimpangan awal (*primary deviance*) diberi cap/stigma negatif oleh lingkungan, lalu menginternalisasi label tersebut dan terus mengulanginya (*secondary deviance*).",
          "**Differential Association**: Penyimpangan dipelajari melalui pergaulan intensif dengan kelompok yang mendukung perilaku menyimpang."
        ]
      },
      {
        "heading": "Sebab Penyimpangan dalam Perspektif Al-Qur’an & Hadis",
        "bullets": [
          "**Kebebasan memilih & tanggung jawab**: Al-Qur’an menegaskan jalan petunjuk dan kesesatan sudah jelas (QS Al-Baqarah [2]: 256; QS Al-Kahfi [18]: 29), namun sebagian orang menutup diri dan sombong (QS Nuh [71]: 7).",
          "**Terbiasa dengan keburukan (*Nuktah Sauda’*)**: HR Tirmidzi menjelaskan setiap dosa menimbulkan satu titik noda hitam di hati; bila diulang tanpa tobat, hati tertutup (*raan*) hingga tidak peka lagi terhadap kebenaran.",
          "**Tamak (*Hirsh*) terhadap harta & kedudukan**: HR Tirmidzi & Ahmad mengibaratkan sifat tamak terhadap harta dan kehormatan lebih merusak agama seseorang daripada **dua serigala lapar yang dilepas di tengah kumpulan kambing**."
        ]
      }
    ],
    "highYield": [
      "Beda istilah: **Anomi** = hilangnya norma pedoman; **Labelling** = stigma memicu penyimpangan sekunder.",
      "Hadis populer di soal: **Nuktah sauda’** (noda hitam di hati akibat dosa berulang) & **2 serigala lapar** (perumpamaan sifat tamak/*hirsh*)."
    ]
  },
  {
    "no": 11,
    "id": "d16",
    "driveNo": 16,
    "week": 1,
    "weekA": 1,
    "weekB": 2,
    "schedule": "A: Jum 23 Okt (M1) • B: Sel 27 Okt (M2)",
    "scheduleA": "Jum 23 Okt (07.55)",
    "scheduleB": "Sel 27 Okt (09.45)",
    "cluster": "fondasi",
    "icon": "🏠",
    "title": "Home Visit, Home Care & Palliative Care",
    "dosen": "dr. Zwasta Pribadi Mahardhika, M.Med.Ed, Sp.KKLP",
    "readMin": 4,
    "tldr": "Pelayanan di rumah menjaga kesinambungan perawatan holistik: Home Visit setara rawat jalan terbatas, Home Care setara rawat inap di rumah, dan Palliative Care berfokus pada kualitas hidup penyakit mengancam jiwa.",
    "sections": [
      {
        "heading": "Perbedaan Home Visit, Home Care & Palliative Care",
        "table": {
          "headers": [
            "Layanan",
            "Ruang Lingkup & Fokus Utama"
          ],
          "rows": [
            [
              "Home Visit (Kunjungan Rumah)",
              "Lebih terbatas — setara **rawat jalan (ambulatory)**; mengenal kehidupan/lingkungan pasien & evaluasi medis ringan"
            ],
            [
              "Home Care (Perawatan di Rumah)",
              "Lebih luas — setara **rawat inap (hospitalization)** di rumah untuk pasien kronis, lansia, pasca-RS, atau disabilitas berat"
            ],
            [
              "Palliative Care",
              "Meningkatkan kualitas hidup pasien & keluarga pada penyakit terminal/mengancam jiwa lewat kendali nyeri, psikososial, dan spiritual"
            ]
          ]
        }
      },
      {
        "heading": "6 Langkah Pengumpulan Data saat Home Visit",
        "bullets": [
          "**1.** Mempersiapkan daftar nama keluarga yang akan dikunjungi.",
          "**2.** Mengatur jadwal kunjungan bersama pasien/keluarga.",
          "**3.** Mempersiapkan macam data yang akan dikumpulkan (klinis, lingkungan, keluarga).",
          "**4.** Melakukan kunjungan rumah dan observasi langsung.",
          "**5.** Mencatat data hasil kunjungan secara sistematis.",
          "**6.** Menyampaikan hasil & merencanakan tindak lanjut bersama keluarga."
        ]
      },
      {
        "heading": "Manfaat, Faktor Pendorong & Hambatan",
        "bullets": [
          "**Manfaat**: Memahami latar belakang pasien secara nyata, mempererat hubungan dokter–pasien, menjamin kebutuhan kesehatan terpenuhi, dan meningkatkan kepuasan.",
          "**4 Faktor pendorong**: Kemudahan sistem komunikasi, kemajuan iptek kedokteran, ketersediaan alat medis portabel/canggih, dan sikap/harapan masyarakat.",
          "**Masalah/kendala**: Keterbatasan peralatan/tindakan medis di rumah, waktu & jarak tempuh dokter, serta biaya dan keselamatan petugas."
        ]
      }
    ],
    "highYield": [
      "Beda kunci: **Home Visit** = lingkup rawat jalan (*ambulatory*); **Home Care** = lingkup rawat inap (*hospitalization*).",
      "Palliative care bukan hanya untuk saat menjelang ajal, tetapi berfokus pada **kualitas hidup & martabat pasien**."
    ]
  },
  {
    "no": 12,
    "id": "d12",
    "driveNo": 12,
    "week": 1,
    "weekA": 1,
    "weekB": 2,
    "schedule": "A: Jum 23 Okt (M1) • B: Sen 26 Okt (M2)",
    "scheduleA": "Jum 23 Okt (09.45)",
    "scheduleB": "Sen 26 Okt (14.50)",
    "cluster": "farma",
    "icon": "🧪",
    "title": "BSO Cairan (Oral, Parenteral & Topikal)",
    "dosen": "DR. Dra. Risdawati Djohan, M.Kes, Apt.",
    "readMin": 4,
    "tldr": "BSO cair terbagi menjadi larutan sejati (solutio, sirup, eliksir), sistem dispersi (suspensi, emulsi), sediaan parenteral steril, dan cairan topikal — masing-masing punya aturan kocok, pelarut, dan sterilitas khusus.",
    "sections": [
      {
        "heading": "BSO Cair Oral (Solutio, Sirup, Eliksir, Suspensi, Emulsi)",
        "table": {
          "headers": [
            "Sediaan",
            "Karakteristik Kunci"
          ],
          "rows": [
            [
              "Solutio (Larutan)",
              "Zat terlarut molekuler merata → keseragaman dosis tinggi, tidak perlu dikocok"
            ],
            [
              "Sirup",
              "Larutan oral berkadar gula (sukrosa) tinggi; untuk pasien DM dipakai pemanis sorbitol/aspartam"
            ],
            [
              "Eliksir",
              "Larutan oral **hidroalkohol** jernih & manis (etanol sebagai kosolven ± gliserin/propilen glikol); lebih encer dari sirup"
            ],
            [
              "Suspensi",
              "Partikel padat tidak larut terdispersi dalam cairan → **wajib kocok dahulu** sebelum dipakai; *dry syrup* direkonstitusi air dan stabil terbatas (7–14 hari)"
            ],
            [
              "Emulsi",
              "Campuran dua cairan tidak saling campur (minyak & air) distabilkan emulgator → kocok sebelum pakai"
            ]
          ]
        }
      },
      {
        "heading": "BSO Cair Parenteral & Topikal",
        "bullets": [
          "**Syarat mutlak sediaan parenteral**: **Steril, bebas partikulat, dan bebas pirogen (non-pirogenik)** (pirogen = senyawa organik penyebab demam dari mikroba).",
          "**Wadah parenteral**: **Ampul** = wadah dosis tunggal sekali pakai (tidak bisa ditutup steril lagi setelah dipatahkan); **Vial** = wadah dosis ganda bertutup karet.",
          "**BSO Cair Topikal**: Lotio (suspensi/emulsi encer untuk area luas), obat tetes mata (*guttae ophthalmicae* — wajib steril & isotonis), tetes telinga (*guttae auriculares*), tetes hidung (*guttae nasales*), dan obat kumur (*gargarisma* — tidak untuk ditelan).",
          "**Skala Kelarutan FI**: Sangat mudah larut (<1 bagian pelarut), Mudah larut (1–10), Larut (10–30), Agak sukar (30–100), Sukar (100–1000), Sangat sukar (1000–10.000), Praktis tidak larut (>10.000)."
        ]
      }
    ],
    "highYield": [
      "Beda wadah: **Ampul** = single-dose sekali buka; **Vial** = multi-dose.",
      "**Eliksir** selalu identik dengan pelarut **hidroalkohol (etanol)** dan lebih encer dari sirup.",
      "Syarat wajib parenteral: **Steril + Bebas Partikulat + Bebas Pirogen**."
    ]
  },
  {
    "no": 13,
    "id": "d27",
    "driveNo": 27,
    "week": 2,
    "weekA": 3,
    "weekB": 2,
    "schedule": "B: Sen 26 Okt (M2) • A: Sel 3 Nov (M3)",
    "scheduleA": "Sel 3 Nov (07.55)",
    "scheduleB": "Sen 26 Okt (13.00)",
    "cluster": "jiwa",
    "icon": "🔄",
    "title": "Model Perubahan & Determinan Perilaku Kesehatan",
    "dosen": "dr. Nur Isnaeni Evry Kurniawati, MARS",
    "readMin": 4,
    "tldr": "Mengubah perilaku pasien tidak cukup dengan memberi informasi — dokter harus memetakan determinan (Lawrence Green, HBM), tahapan kesiapan berubah (TTM), dan memilih strategi perubahan WHO yang berkelanjutan.",
    "sections": [
      {
        "heading": "Domain Bloom & Determinan Lawrence Green (PRECEDE–PROCEED)",
        "bullets": [
          "**3 Domain Bloom**: **Kognitif** (Pengetahuan = *Tahu*) → **Afektif** (Sikap = *Mau*) → **Psikomotor** (Tindakan/Praktik = *Mampu*).",
          "**Faktor Predisposisi (*Predisposing*)**: Faktor internal pendorong — pengetahuan, sikap, kepercayaan, nilai, persepsi.",
          "**Faktor Pemungkin (*Enabling*)**: Sarana & lingkungan yang memungkinkan perilaku — ketersediaan faskes, jarak, biaya, akses obat/alat.",
          "**Faktor Penguat (*Reinforcing*)**: Dukungan sosial dari keluarga, tokoh masyarakat, teman sebaya, dan umpan balik petugas kesehatan."
        ]
      },
      {
        "heading": "Teori Utama Perubahan Perilaku",
        "bullets": [
          "**Transtheoretical Model / TTM (Prochaska & DiClemente — 6 tahap)**: (1) **Precontemplation** (belum berniat) → (2) **Contemplation** (mulai menimbang) → (3) **Preparation** (sudah bersiap/berencana segera) → (4) **Action** (mulai menjalankan) → (5) **Maintenance** (mempertahankan ≥6 bulan) → (6) *Termination/Relapse*.",
          "**Health Belief Model (Janz & Becker)**: *Perceived susceptibility* (kerentanan), *severity* (keparahan), *benefits* (manfaat), *barriers* (hambatan), *self-efficacy*, dan ***Cues to action*** (pemicu/isyarat dari lingkungan/media/orang sekitar).",
          "**Adopsi Inovasi (5 tahap)**: **Awareness → Interest → Evaluation → Trial → Adoption**."
        ]
      },
      {
        "heading": "3 Strategi Perubahan Perilaku Menurut WHO",
        "table": {
          "headers": [
            "Strategi",
            "Mekanisme & Kelebihan/Kelemahan"
          ],
          "rows": [
            [
              "Power Approach (Paksaan/Aturan)",
              "Lewat hukum/perintah/sanksi → hasil **cepat**, tetapi **tidak bertahan lama** karena bukan dari kesadaran"
            ],
            [
              "Information Approach",
              "Edukasi/penyuluhan satu arah → meningkatkan pengetahuan, namun belum tentu langsung jadi perilaku"
            ],
            [
              "Participatory Approach",
              "Diskusi & pelibatan aktif masyarakat → perubahan paling **mendalam dan berkelanjutan**"
            ]
          ]
        }
      }
    ],
    "highYield": [
      "Lawrence Green: **Predisposing** (dalam diri), **Enabling** (sarana/akses), **Reinforcing** (dukungan keluarga/nakes).",
      "Strategi WHO paling langgeng = **Participatory Approach**; paling cepat tapi rapuh = **Power Approach**."
    ]
  },
  {
    "no": 14,
    "id": "d26",
    "driveNo": 26,
    "week": 2,
    "weekA": 2,
    "weekB": 2,
    "schedule": "A: Sen 26 Okt • B: Kam 29 Okt",
    "scheduleA": "Sen 26 Okt (14.50)",
    "scheduleB": "Kam 29 Okt (09.45)",
    "cluster": "lansia_k3",
    "icon": "🩺",
    "title": "Long-Term Care (Perawatan Jangka Panjang)",
    "dosen": "DR. dr. Erlina Wijayanti, MPH, Sp.KKLP",
    "readMin": 4,
    "tldr": "Long-Term Care (LTC) menyediakan dukungan medis dan non-medis jangka panjang bagi lansia atau pasien penyakit kronis yang mengalami penurunan ADL/IADL agar tetap aman dan menekan angka rawat inap berulang.",
    "sections": [
      {
        "heading": "ADL vs IADL (Dasar Penilaian Kebutuhan LTC)",
        "table": {
          "headers": [
            "Kategori",
            "Aktivitas yang Dinilai"
          ],
          "rows": [
            [
              "ADLs (Activities of Daily Living)",
              "Perawatan diri dasar: **mandi, berpakaian, makan, toileting, berpindah tempat**"
            ],
            [
              "IADLs (Instrumental ADLs)",
              "Kemandirian lebih kompleks: **mengurus keuangan, belanja, memasak, mengelola obat, telepon/transportasi**"
            ]
          ]
        }
      },
      {
        "heading": "Perbandingan Jenis Layanan Residensial LTC",
        "table": {
          "headers": [
            "Layanan",
            "Kapasitas & Karakteristik"
          ],
          "rows": [
            [
              "In-Home Care / Aging in Place",
              "Perawatan di rumah sendiri + kunjungan rutin perawat puskesmas & dukungan keluarga"
            ],
            [
              "Assisted Living",
              "Kapasitas besar (puluhan–ratusan), penghuni relatif **lebih mandiri**, layanan medis minimal"
            ],
            [
              "Residential Care",
              "Kapasitas kecil (**4–10 orang**), suasana mirip rumah tinggal, penghuni lebih bergantung pada *caregiver* & supervisi lebih ketat"
            ],
            [
              "Nursing Home (Panti Perawatan)",
              "Perawatan medis & keperawatan 24 jam bagi ketergantungan berat"
            ]
          ]
        }
      },
      {
        "heading": "Model Pembiayaan & Dampak Klinis LTC",
        "bullets": [
          "**Pembiayaan dunia**: Inggris (**Welfare State** / pajak pemerintah), Amerika Serikat (**Commercial Insurance** / swasta), Jepang & Jerman (**Social Insurance** / asuransi sosial jangka panjang).",
          "**Model LFP (Longitudinal Family Physician — Kanada 2024)**: Pembiayaan berbasis 3 komponen — waktu pelayanan (komitmen jam/hari), jumlah interaksi/kunjungan, serta ukuran & kompleksitas panel pasien.",
          "**Dampak terbukti (Balqis-Ali et al., BMC Geriatrics 2024)**: *Continuity of Care* dan *Caregiver Integration* secara signifikan **menurunkan angka rawat inap ulang (readmisi) dan kunjungan IGD**."
        ]
      }
    ],
    "highYield": [
      "Beda **Assisted Living** (puluhan–ratusan, lebih mandiri) vs **Residential Care** (4–10 orang, suasana rumah, supervisi lebih ketat).",
      "**ADLs** = mandi/makan/berpakaian; **IADLs** = masak/belanja/atur uang."
    ]
  },
  {
    "no": 15,
    "id": "d08",
    "driveNo": 8,
    "week": 2,
    "weekA": 2,
    "weekB": 2,
    "schedule": "A: Sel 27 Okt • B: Jum 30 Okt",
    "scheduleA": "Sel 27 Okt (07.55)",
    "scheduleB": "Jum 30 Okt (07.55)",
    "cluster": "jiwa",
    "icon": "🚨",
    "title": "Perilaku Menyimpang & Kesehatan Reproduksi",
    "dosen": "dr. Maya Trisiswati, MKM",
    "readMin": 4,
    "tldr": "Perilaku menyimpang remaja (NAPZA, seks berisiko, aborsi, tawuran, adiksi gadget) saling berkaitan erat dan harus dicegah lewat ketahanan keluarga, komunikasi asertif, dan continuum of care.",
    "sections": [
      {
        "heading": "Jenis, Keterkaitan & Kontinuum NAPZA",
        "bullets": [
          "**Definisi**: Tingkah laku yang bertentangan dengan norma dan hukum masyarakat (NAPZA, seks bebas/berisiko, aborsi, tawuran, adiksi gadget).",
          "**Lingkaran risiko**: Adiksi gadget & alkohol/NAPZA menjadi pintu masuk seks berisiko → meningkatkan risiko **IMS, HIV/AIDS, KTD (Kehamilan Tidak Diinginkan), aborsi tidak aman, kemandulan, kanker serviks**, hingga gangguan jiwa & sanksi pidana.",
          "**Kontinuum Penggunaan NAPZA (Burrows et al., 1999)**: **Abstinen** (tak pernah pakai) → **Eksperimental** (coba-coba) → **Rekreasional** (saat kumpul/pesta) → **Reguler / Habitual** (rutin) → **Tergantung** (adiksi/dependensi)."
        ]
      },
      {
        "heading": "Fakta Kekerasan Remaja & Respons Pelecehan Seksual",
        "bullets": [
          "**Data SNPHAR 2018**: 2 dari 3 anak/remaja pernah mengalami minimal satu bentuk kekerasan (emosional, fisik, atau seksual) dan sering tumpang tindih.",
          "**6 Langkah Respons Laporan Pelecehan Seksual**: (1) Dengarkan keluhan dengan baik → (2) Jangan bereaksi berlebihan → (3) Tenangkan korban & yakinkan ia tidak bersalah → (4) Catat kronologi secara objektif → (5) Jaga kerahasiaan → (6) Rujuk ke layanan perlindungan/medis/psikologis."
        ]
      },
      {
        "heading": "Pencegahan & Peran Orang Tua",
        "bullets": [
          "**Bekal informasi remaja**: Kespro dasar, memahami dorongan seksual, pencegahan pelecehan seksual, dan **keterampilan bersikap asertif** (berani menolak ajakan berisiko).",
          "**4 Peran kunci orang tua**: Menjadi sahabat remaja, pendengar yang baik, sumber informasi kespro yang lengkap & jujur, serta meninggalkan gaya komunikasi menyalahkan/membandingkan."
        ]
      }
    ],
    "highYield": [
      "Urutan Kontinuum NAPZA: **Abstinen → Eksperimental → Rekreasional → Reguler/Habitual → Tergantung**.",
      "Seks berisiko dan NAPZA saling menjadi **pintu masuk** satu sama lain."
    ]
  },
  {
    "no": 16,
    "id": "d03",
    "driveNo": 3,
    "week": 2,
    "weekA": 2,
    "weekB": 2,
    "schedule": "B: Sel 27 Okt • A: Jum 30 Okt",
    "scheduleA": "Jum 30 Okt (07.55)",
    "scheduleB": "Sel 27 Okt (07.55)",
    "cluster": "fondasi",
    "icon": "👨‍👩‍👧‍👦",
    "title": "Konsep Dasar Kedokteran Keluarga",
    "dosen": "Prof. dr. Hj. Qomariyah, MS, PKK, AIFM, Sp.KKLP",
    "readMin": 4,
    "tldr": "Dokter keluarga melayani pasien secara holistik, komprehensif, dan berkesinambungan dalam konteks keluarga & komunitas — menjalankan 5 peran Five-Star Doctor dan 9 prinsip pelayanan.",
    "sections": [
      {
        "heading": "Sejarah Singkat Kedokteran Keluarga di Indonesia",
        "bullets": [
          "**1981**: Kelompok Studi Dokter Keluarga → **1990**: KDKI → **1997**: PDKI (Perhimpunan Dokter Keluarga Indonesia).",
          "**2001–2004**: Masuk kurikulum seluruh FK di Indonesia & penyusunan Kurikulum Berbasis Kompetensi (KBK).",
          "**2006–2007**: KIKK bergabung menjadi KDDKI, lalu kini **KIKKI** berdiri tersendiri; **2020**: Pelantikan **Sp.KKLP** (Spesialis Kedokteran Keluarga Layanan Primer), dan FK YARSI menjadi salah satu penyelenggara prodi Sp.KKLP."
        ]
      },
      {
        "heading": "Dokter 5 Bintang (WHO Five-Star Doctor)",
        "table": {
          "headers": [
            "Peran",
            "Inti Praktik di Layanan Primer"
          ],
          "rows": [
            [
              "1. Care Provider",
              "Memandang pasien secara holistik (biopsikososial-spiritual) sebagai bagian keluarga & komunitas"
            ],
            [
              "2. Decision Maker",
              "Memilih pemeriksaan, terapi, dan teknologi medis secara efektif & cost-effective"
            ],
            [
              "3. Communicator",
              "Mengedukasi gaya hidup sehat secara efektif agar pasien mengubah perilaku"
            ],
            [
              "4. Community Leader",
              "Menggerakkan upaya kesehatan berbasis kebutuhan masyarakat setempat"
            ],
            [
              "5. Manager",
              "Bekerja dalam tim multidisiplin & mengelola sumber daya layanan kesehatan"
            ]
          ]
        }
      },
      {
        "heading": "9 Prinsip Pelayanan Dokter Keluarga",
        "bullets": [
          "**Kontak pertama (*First Contact*)**: Pintu masuk utama pasien ke sistem kesehatan.",
          "**Holistik & Komprehensif**: Mencakup promotif, preventif, kuratif, rehabilitatif, dan paliatif lintas aspek biopsikososial-spiritual.",
          "**Berkesinambungan (*Continuity of Care*)**: Mengikuti pasien dari waktu ke waktu lintas siklus hidup.",
          "**Koordinatif & Kolaboratif**: Mengoordinasikan konsultasi/rujukan tepat sasaran dan bekerja bersama tim/spesialis.",
          "**Berorientasi Pasien, Keluarga & Komunitas**: Melibatkan dinamika keluarga & lingkungan kerja/tinggal.",
          "**Pencegahan diutamakan**, **Sadar biaya & mutu**, serta **Dapat diaudit & dipertanggungjawabkan**."
        ]
      }
    ],
    "highYield": [
      "Hafal bedanya **5-Star Doctor**: pilih tes/terapi hemat biaya = *Decision Maker*; edukasi gaya hidup = *Communicator*; rujukan/tim = *Manager* (atau prinsip *Koordinatif & Kolaboratif*).",
      "Tahun penting: **1981** (KSDK), **1990** (KDKI), **1997** (PDKI), **2020** (Sp.KKLP)."
    ]
  },
  {
    "no": 17,
    "id": "d09",
    "driveNo": 9,
    "week": 2,
    "weekA": 2,
    "weekB": 2,
    "schedule": "A: Sel 27 Okt • B: Kam 29 Okt",
    "scheduleA": "Sel 27 Okt (09.45)",
    "scheduleB": "Kam 29 Okt (07.55)",
    "cluster": "jiwa",
    "icon": "🧩",
    "title": "Psikoedukasi",
    "dosen": "dr. Liko Maryudhiyanto, Sp.KJ",
    "readMin": 3,
    "tldr": "Psikoedukasi adalah intervensi edukatif terstruktur untuk pasien dan keluarga guna meningkatkan pemahaman penyakit, kepatuhan minum obat, kualitas hidup, dan mencegah kekambuhan.",
    "sections": [
      {
        "heading": "Tujuan & 3 Komponen Utama Psikoedukasi",
        "bullets": [
          "**3 Luaran utama**: Meningkatkan **kepatuhan terapi**, meningkatkan **kualitas hidup**, dan **mengurangi angka kekambuhan** (terutama pada gangguan kronis seperti skizofrenia/bipolar/depresi).",
          "**Komponen 1 — Informasi Penyakit**: Gejala, penyebab, perjalanan penyakit, peran obat & efek samping, serta prognosis.",
          "**Komponen 2 — Manajemen Emosional**: Keterampilan mengelola stres, mengenali tanda awal relaps, dan regulasi emosi.",
          "**Komponen 3 — Keterampilan Koping & Pelibatan Keluarga**: Menjelaskan peran aktif keluarga tanpa mengambil alih kemandirian pasien (batasan peran yang sehat)."
        ]
      },
      {
        "heading": "Peran Dokter, Teknik Komunikasi & Kasus Skizofrenia",
        "bullets": [
          "**Peran dokter**: Sebagai **fasilitator** yang empatik, bukan menggurui.",
          "**3 Teknik komunikasi inti**: (1) **Pendekatan kolaboratif** (diskusi bersama pasien & keluarga tentang obat dan efek samping), (2) **Empati & validasi keluhan**, (3) **Dukungan berkelanjutan**.",
          "**Studi kasus pasien putus antipsikotik karena merasa \"mati rasa\"**: Jangan memarahi pasien; validasi keluhan efek sampingnya, jelaskan peran obat mencegah halusinasi/waham kambuh, evaluasi penyesuaian dosis/jenis obat bersama psikiater, dan libatkan keluarga untuk memantau minum obat tanpa menghakimi."
        ]
      }
    ],
    "highYield": [
      "3 hambatan utama psikoedukasi: **Stigma sosial**, **kurangnya pengetahuan**, dan **dinamika keluarga yang kompleks**.",
      "3 komponen utama: **Informasi penyakit + Manajemen emosional + Keterampilan koping/dukungan keluarga**."
    ]
  },
  {
    "no": 18,
    "id": "d11",
    "driveNo": 11,
    "week": 2,
    "weekA": 2,
    "weekB": 2,
    "schedule": "A: Rab 28 Okt • B: Jum 30 Okt",
    "scheduleA": "Rab 28 Okt (07.55)",
    "scheduleB": "Jum 30 Okt (10.40)",
    "cluster": "farma",
    "icon": "📖",
    "title": "Formularium & Obat Esensial (DOEN & Fornas)",
    "dosen": "Drs. Dharma Permana, Apt., Ph.D",
    "readMin": 3,
    "tldr": "DOEN dan Formularium Nasional (Fornas) memastikan ketersediaan obat paling dibutuhkan, bermutu, aman, dan cost-effective, lengkap dengan mekanisme ketat bila perlu obat di luar Fornas.",
    "sections": [
      {
        "heading": "Konsep & Kriteria Pemilihan Obat Esensial",
        "bullets": [
          "**Obat Esensial**: Obat terpilih yang paling dibutuhkan untuk diagnosis, profilaksis, terapi, dan rehabilitasi di fasilitas kesehatan sesuai tingkatannya.",
          "**Kriteria utama**: Rasio manfaat–risiko (*benefit-risk ratio*) terbaik, mutu/stabilitas/bioavailabilitas terjamin, praktis disimpan & diserahkan, meningkatkan kepatuhan, serta rasio manfaat–biaya (*benefit-cost ratio*) tertinggi.",
          "**Kombinasi tetap (FDC)**: Hanya dipilih bila khasiat & keamanan lebih tinggi dari komponen tunggal, rasio dosis sesuai mayoritas pasien, meningkatkan *benefit-cost ratio*, dan khusus antibiotik harus **mencegah/mengurangi resistensi**.",
          "**Yang TIDAK masuk Fornas**: Obat tradisional/herbal dan suplemen makanan."
        ]
      },
      {
        "heading": "Tata Nama & Mekanisme Obat di Luar Fornas",
        "bullets": [
          "**Tata nama baku**: Menggunakan nama generik sesuai **Farmakope Indonesia edisi terakhir**; jika belum tercantum, gunakan **INN (*International Nonproprietary Names*)** dari WHO.",
          "**Obat di luar Fornas di FKTP (Puskesmas)**: Pengadaan dapat dilakukan bila sesuai indikasi medis & standar pelayanan dengan persetujuan **Kepala Dinas Kesehatan Kabupaten/Kota**.",
          "**Obat di luar Fornas di FKRTL (Rumah Sakit)**: Memerlukan **rekomendasi Ketua Komite Farmasi dan Terapi (KFT)** dengan **persetujuan Komite Medik dan Kepala/Direktur Rumah Sakit**."
        ]
      }
    ],
    "highYield": [
      "Beda izin obat luar Fornas: **Puskesmas (FKTP)** → Kepala Dinkes Kab/Kota; **Rumah Sakit (FKRTL)** → rekomendasi Ketua KFT + persetujuan Komite Medik & Direktur RS.",
      "Obat tradisional & suplemen makanan **tidak masuk Fornas**."
    ]
  },
  {
    "no": 19,
    "id": "d05",
    "driveNo": 5,
    "week": 2,
    "weekA": 2,
    "weekB": 3,
    "schedule": "A: Rab 28 Okt (M2) • B: Jum 6 Nov (M3)",
    "scheduleA": "Rab 28 Okt (08.50)",
    "scheduleB": "Jum 6 Nov (07.55)",
    "cluster": "fondasi",
    "icon": "🤝",
    "title": "Patient-Centered Approach, Family-Focused & Community-Oriented",
    "dosen": "DR. dr. Erlina Wijayanti, MPH, Sp.KKLP",
    "readMin": 4,
    "tldr": "Patient-Centered Care (PCC) menempatkan pasien sebagai pribadi unik yang berotonomi penuh dalam 8 dimensi pelayanan, diperluas ke pemberdayaan keluarga dan orientasi komunitas.",
    "sections": [
      {
        "heading": "8 Dimensi Patient-Centered Care (PCC)",
        "bullets": [
          "**1. Menghormati pilihan, nilai & penilaian pasien**: Menerima pasien sebagai pribadi, menjaga kerahasiaan, melibatkan dalam keputusan.",
          "**2. Koordinasi & integrasi pelayanan**: Kolaborasi multidisiplin antara layanan klinis dan layanan dukungan.",
          "**3. Informasi, komunikasi & edukasi**: Memberi informasi penyakit/terapi yang jelas, jujur, dan mudah dipahami.",
          "**4. Kenyamanan fisik**: Tata laksana nyeri, kenyamanan lingkungan, dan bantuan aktivitas harian.",
          "**5. Dukungan emosional**: Empati, mendengarkan penuh perhatian, meredakan rasa takut dan cemas.",
          "**6. Pelibatan keluarga & teman**: Menghargai peran pendamping sebagai mitra perawatan.",
          "**7. Transisi & kontinuitas pelayanan**: Perencanaan pulang, jadwal kontrol, rujuk balik, dan dukungan pasca-rawat.",
          "**8. Akses terhadap pelayanan**: Kemudahan menjangkau fasilitas, waktu tunggu wajar, dan ketersediaan rujukan."
        ]
      },
      {
        "heading": "Penerapan pada Penyakit Kronis/Infeksi (Contoh: Pasien TB)",
        "bullets": [
          "**Menjaga kepatuhan OAT hingga tuntas**: Edukasi penyakit & durasi pengobatan, kelola efek samping obat sejak dini, pilih PMO (Pengawas Menelan Obat) yang dipercaya pasien, serta bantu mengatasi hambatan ekonomi/transportasi dan stigma.",
          "**Family-Focused**: Edukasi etika batuk, ventilasi rumah, skrining kontak serumah, dan dukungan emosional keluarga.",
          "**Community-Oriented**: Memahami literasi kesehatan masyarakat, budaya setempat, dan mengintegrasikan layanan primer dengan program kesehatan komunitas."
        ]
      }
    ],
    "highYield": [
      "Hati-hati membedakan Dimensi 2 (**Koordinasi multidisiplin**) vs Dimensi 7 (**Transisi & Kontinuitas** saat pulang/kontrol/rujuk balik) vs Dimensi 5 (**Dukungan Emosional** mengurangi takut/cemas)."
    ]
  },
  {
    "no": 20,
    "id": "d20",
    "driveNo": 20,
    "week": 2,
    "weekA": 2,
    "weekB": 3,
    "schedule": "A: Kam 29 Okt (M2) • B: Sen 2 Nov (M3)",
    "scheduleA": "Kam 29 Okt (13.00)",
    "scheduleB": "Sen 2 Nov (13.00)",
    "cluster": "farma",
    "icon": "🔬",
    "title": "Konsep Dasar & Regulasi Laboratorium Layanan Primer",
    "dosen": "dr. Syukrini Bahri, Sp.PK",
    "readMin": 3,
    "tldr": "Laboratorium klinik di layanan primer diatur 3 PMK utama (411/2010, 37/2012, 43/2013) dengan klasifikasi Pratama, Madya, dan Utama sesuai kemampuan alat, SDM, dan cakupan pemeriksaan.",
    "sections": [
      {
        "heading": "3 Regulasi Utama Laboratorium Primer",
        "bullets": [
          "**PMK No. 411/Menkes/Per/III/2010**: Tentang Laboratorium Klinik (klasifikasi Umum Pratama/Madya/Utama & Khusus).",
          "**PMK No. 37 Tahun 2012**: Tentang Penyelenggaraan Laboratorium Pusat Kesehatan Masyarakat (Puskesmas).",
          "**PMK No. 43 Tahun 2013**: Tentang Cara Penyelenggaraan Laboratorium Klinik yang Baik (Good Laboratory Practice, PMI & PME)."
        ]
      },
      {
        "heading": "Klasifikasi Laboratorium Klinik Umum (PMK 411/2010)",
        "table": {
          "headers": [
            "Tingkat",
            "Kemampuan & SDM Minimal"
          ],
          "rows": [
            [
              "Pratama",
              "Teknik **sederhana** (hematologi rutin, urinalisis, feses, kimia klinik dasar; imunologi wajib hanya **tes kehamilan**). PJ teknis: dokter umum terlatih; minimal **2 analis** & 1 administrasi"
            ],
            [
              "Madya",
              "Teknik sederhana + **lebih lengkap** (termasuk imunologi/serologi sederhana seperti Widal, VDRL/TPHA, ASTO, HBsAg). PJ teknis: **dr. Sp.PK**"
            ],
            [
              "Utama",
              "Teknik **automatik** & canggih (termasuk biakan/kultur & identifikasi kuman, uji kepekaan). PJ teknis: **dr. Sp.PK**"
            ]
          ]
        }
      },
      {
        "heading": "Laboratorium Klinik Khusus & Mutu",
        "bullets": [
          "**Lab Klinik Khusus**: Fokus satu bidang — Mikrobiologi Klinik, Parasitologi Klinik, atau Patologi Anatomik.",
          "**Pemantapan Mutu**: **PMI** (Pemantapan Mutu Internal harian di lab) dan **PME** (Pemantapan Mutu Eksternal oleh lembaga rujukan) serta kontrol pra-analitik, analitik, dan pasca-analitik."
        ]
      }
    ],
    "highYield": [
      "Ingat 3 PMK Lab: **411/2010** (Lab Klinik), **37/2012** (Lab Puskesmas), **43/2013** (Penyelenggaraan Lab yang Baik).",
      "Jebakan klasik: Di **Lab Pratama**, pemeriksaan imunologi wajib hanya **tes kehamilan** (Widal/HBsAg/VDRL masuk tingkat **Madya**)."
    ]
  },
  {
    "no": 21,
    "id": "s02",
    "driveNo": null,
    "isScheduleExtra": true,
    "cluster": "farma",
    "icon": "🧪",
    "title": "Pemeriksaan Laboratorium Rasional pada Layanan Kedokteran Keluarga",
    "dosen": "dr. Endah Purnamasari, Sp.PK",
    "readMin": 3,
    "tldr": "Pemeriksaan laboratorium rasional memilih tes yang tepat indikasi, tepat waktu, dan cost-effective berdasarkan hipotesis klinis — bukan panel acak — dengan pengendalian ketat tahap pra-analitik, analitik, dan pasca-analitik.",
    "sections": [
      {
        "heading": "Prinsip Pemilihan Tes Rasional di Layanan Primer",
        "bullets": [
          "**Berangkat dari klinis**: Anamnesis dan pemeriksaan fisik menetapkan *pre-test probability* (hipotesis diagnosis); pemeriksaan lab diminta hanya bila hasilnya akan **mengubah keputusan klinis** (menegakkan/menyingkirkan diagnosis, menentukan terapi, atau memantau progresivitas).",
          "**Prinsip 5 Tepat**: Tepat pasien/indikasi, tepat jenis tes, tepat waktu & persiapan sampel, tepat interpretasi dalam konteks klinis, dan tepat biaya (*cost-effective*, menghindari *over-testing* & *under-testing*).",
          "**4 Tujuan Utama**: Skrining/deteksi dini (mis. GDP/profil lipid kelompok risiko), konfirmasi diagnosis, penilaian derajat berat/prognosis, serta evaluasi efektivitas & efek samping terapi."
        ]
      },
      {
        "heading": "Sensitivitas, Spesifisitas & Nilai Prediktif",
        "table": {
          "headers": [
            "Parameter",
            "Makna Klinis",
            "Kegunaan Utama"
          ],
          "rows": [
            [
              "Sensitivitas tinggi (SnNout)",
              "Kemampuan mendeteksi orang sakit (positif sejati tinggi, negatif palsu minimal)",
              "Skrining awal — bila hasil **Negatif**, efektif menyingkirkan penyakit (*Rule Out*)"
            ],
            [
              "Spesifisitas tinggi (SpPin)",
              "Kemampuan mengenali orang sehat (negatif sejati tinggi, positif palsu minimal)",
              "Konfirmasi diagnosis — bila hasil **Positif**, kuat memastikan penyakit (*Rule In*)"
            ],
            [
              "PPV & NPV",
              "Peluang benar-benar sakit bila tes (+) atau sehat bila tes (−)",
              "Sangat dipengaruhi **prevalensi** penyakit di populasi layanan primer"
            ]
          ]
        }
      },
      {
        "heading": "Kendali Mutu 3 Tahap & Contoh Rasional di FKTP",
        "bullets": [
          "**Tahap Pra-analitik (~60–70% sumber kesalahan terbanyak)**: Persiapan pasien (puasa 8–12 jam untuk GDP & profil lipid, hindari olahraga berat sebelumnya), identifikasi sampel, teknik flebotomi (torniket <1 menit, cegah hemolisis), tabung antikoagulan yang sesuai, serta suhu/waktu transportasi sampel.",
          "**Tahap Analitik**: Validasi reagen, kalibrasi instrumen, Pemantapan Mutu Internal (PMI) harian, dan Pemantapan Mutu Eksternal (PME).",
          "**Tahap Pasca-analitik**: Verifikasi hasil, pelaporan segera **nilai kritis (*critical value*)**, dan interpretasi menyeluruh bersama klinis pasien (*treat the patient, not the lab result*).",
          "**Contoh pemilihan tepat waktu di FKTP**: Demam dengue hari 1–3 pilih **NS1** + hematologi rutin (trombosit/hematokrit serial), hari ≥5 baru **IgM/IgG dengue**; skrining TB paru dengan **TCM/BTA sputum**; pemantauan DM jangka panjang dengan **HbA1c** tiap 3–6 bulan."
        ]
      }
    ],
    "highYield": [
      "Sumber kesalahan laboratorium paling dominan adalah tahap **pra-analitik (~60–70%)**, sehingga persiapan pasien & pengambilan sampel krusial.",
      "Ingat kaidah uji diagnostik: **SnNout** (Sensitivitas tinggi → Negatif menyingkirkan penyakit, untuk **skrining**) dan **SpPin** (Spesifisitas tinggi → Positif memastikan penyakit, untuk **konfirmasi**).",
      "Puasa standar pemeriksaan **GDP & profil lipid (trigliserida)** adalah **8–12 jam** (boleh minum air putih biasa)."
    ],
    "week": 2,
    "weekA": 2,
    "weekB": 3,
    "schedule": "A: Kam 29 Okt (M2) • B: Sen 2 Nov (M3)",
    "scheduleA": "Kam 29 Okt (13.55)",
    "scheduleB": "Sen 2 Nov (13.55)"
  },
  {
    "no": 22,
    "id": "d29",
    "driveNo": 29,
    "week": 3,
    "weekA": 3,
    "weekB": 3,
    "schedule": "B: Sen 2 Nov • A: Kam 5 Nov",
    "scheduleA": "Kam 5 Nov (09.45)",
    "scheduleB": "Sen 2 Nov (07.55)",
    "cluster": "islam_etika",
    "icon": "❤️",
    "title": "Perawatan & Pendampingan Lansia Perspektif Islam",
    "dosen": "Afrizal Tw, Lc., MA., Ph.D",
    "readMin": 3,
    "tldr": "\"Gelar bertambah, bakti tak berkurang\": kesibukan profesi dokter hanya mengubah cara berbakti kepada orang tua lanjut usia, bukan menghapus kewajiban *birrul walidain* baik saat hidup maupun setelah wafat.",
    "sections": [
      {
        "heading": "Etika Al-Qur’an & Kerangka 4 Kuadran Harian Bakti",
        "bullets": [
          "**QS Al-Isra’ [17]: 23**: Larangan mengucapkan kata *\"ah\" (uff)* atau membentak, serta perintah berkata mulia (**qaulan kariman**) — saring emosi lelah sebelum berbicara kepada orang tua.",
          "**Kuadran 1 — Waktu Komunikasi**: Menyepakati jadwal telepon/kunjungan rutin yang realistis.",
          "**Kuadran 2 — Kabar Sebelum Sibuk**: Manajemen ekspektasi (memberi tahu sebelum jaga/ujian dan menepati janji menghubungi balik).",
          "**Kuadran 3 — Perhatian Utuh**: Kehadiran 100% tanpa distraksi gawai saat bersama atau menelepon orang tua.",
          "**Kuadran 4 — Doa & Empati Aktif**: Mendoakan dan memahami kebutuhan emosional orang tua di masa senja."
        ]
      },
      {
        "heading": "Bakti Setelah Orang Tua Wafat & Ijabah Doa",
        "bullets": [
          "**3 Bentuk Konkret Bakti Pasca-Wafat**: (1) **Doa dan istighfar** tiada henti, (2) **Sedekah jariyah** atas nama orang tua, (3) **Menjaga silaturahmi** serta memuliakan kerabat dan sahabat orang tua.",
          "**3 Bentuk Pengabulan Doa (HR Ahmad)**: Selama tidak mengandung dosa/putus silaturahmi, Allah pasti memberi salah satu dari: (1) disegerakan di dunia, (2) **disimpan sebagai pahala akhirat**, atau (3) **dihindarkan dari keburukan yang sebanding**."
        ]
      }
    ],
    "highYield": [
      "Hafal 4 Kuadran Harian: **Waktu Komunikasi → Kabar Sebelum Sibuk → Perhatian Utuh → Doa/Empati**.",
      "QS Al-Isra’ [17]: 23 → larangan *uff* & perintah **qaulan kariman**."
    ]
  },
  {
    "no": 23,
    "id": "d17",
    "driveNo": 17,
    "week": 3,
    "weekA": 3,
    "weekB": 3,
    "schedule": "B: Sen 2 Nov • A: Rab 4 Nov",
    "scheduleA": "Rab 4 Nov (09.45)",
    "scheduleB": "Sen 2 Nov (09.45)",
    "cluster": "islam_etika",
    "icon": "🤲",
    "title": "Aspek Religi dalam Pengelolaan Pasien",
    "dosen": "dr. Zwasta Pribadi Mahardhika, M.Med.Ed, Sp.KKLP",
    "readMin": 3,
    "tldr": "Dalam perspektif Islam, ikhtiar berobat berjalan beriringan dengan tawakal; dokter memadukan kompetensi, empati, amanah, dan kepekaan terhadap praktik keagamaan pasien dalam rencana terapi.",
    "sections": [
      {
        "heading": "Ikhtiar, Tawakal & 3 Pilar Peran Dokter",
        "bullets": [
          "**Berobat adalah perintah**: Hadis *\"Wahai hamba-hamba Allah, berobatlah\"* (HR Tirmidzi) dipadukan dengan tawakal QS Asy-Syu’ara [26]: 80 (*\"Dan apabila aku sakit, Dialah yang menyembuhkanku\"*).",
          "**Sabar saat sakit**: Sakit menjadi penggugur dosa (HR Bukhari), sekaligus mendorong harapan dan kepatuhan terapi.",
          "**3 Pilar Kewajiban Dokter**: (1) **Compassion** (kasih sayang & empati), (2) **Competence** (kompetensi & belajar sepanjang hayat), (3) **Trust** (amanah & kerahasiaan pasien).",
          "**Prinsip Etika Islam**: **Sanctity of Life** (kesucian nyawa — QS Al-An’am [6]: 151), keadilan, dan tidak membahayakan."
        ]
      },
      {
        "heading": "Menghormati Praktik Keagamaan & Integrasi Spiritual Care",
        "bullets": [
          "**4 Dimensi Sensitivitas Keagamaan**: (1) **Dietary considerations** (makanan/obat halal), (2) **Gender sensitivity** (menjaga aurat/preferensi pemeriksa bila memungkinkan), (3) **Prayer & worship** (kemudahan ibadah/tayammum/puasa saat sakit), (4) **Modesty & privacy**.",
          "**4 Tahap Integrasi Perawatan Spiritual**: (1) **Assessment** (kaji kebutuhan & distres spiritual) → (2) **Collaboration** (libatkan keluarga/rohaniawan) → (3) **Integration** (selaraskan dengan rencana terapi) → (4) **Follow-up**.",
          "**Shared Decision-Making**: Open communication + Education + Respect for patient values + Collaborative plan."
        ]
      }
    ],
    "highYield": [
      "3 Pilar Dokter dalam Islam: **Compassion, Competence, Trust**.",
      "4 Tahap *Spiritual Care*: **Assessment → Collaboration → Integration → Follow-up**."
    ]
  },
  {
    "no": 24,
    "id": "d25",
    "driveNo": 25,
    "week": 3,
    "weekA": 3,
    "weekB": 3,
    "schedule": "A: Sen 2 Nov • B: Kam 5 Nov",
    "scheduleA": "Sen 2 Nov (14.50)",
    "scheduleB": "Kam 5 Nov (13.00)",
    "cluster": "jiwa",
    "icon": "🏡",
    "title": "Ketahanan Keluarga",
    "dosen": "dr. Maya Trisiswati, MKM",
    "readMin": 3,
    "tldr": "Keluarga adalah pilar utama bangsa (\"keluarga rapuh → negara runtuh\"); ketahanan keluarga (UU No. 52/2009) memadukan keuletan fisik-materil dan psikis-mental-spiritual untuk hidup mandiri dan harmonis.",
    "sections": [
      {
        "heading": "Konsep, Regulasi & Dimensi Ketahanan Keluarga",
        "bullets": [
          "**Definisi UU No. 52 Tahun 2009**: Kondisi keluarga yang memiliki keuletan dan ketangguhan serta kemampuan fisik-materil dan psikis-mental-spiritual untuk hidup mandiri, mengembangkan diri, dan hidup harmonis lahir-batin.",
          "**Dimensi Ketahanan Fisik (4 indikator)**: Kemampuan makan lengkap **2 kali sehari**, status ada/tidaknya penyakit akut/kronis/cacat bawaan, masalah gizi keluarga, dan ketersediaan **ruang tidur terpisah** orang tua & anak.",
          "**Ciri keluarga tangguh**: Ada *quality time*, komunikasi efektif & kemampuan mendengarkan, fleksibel menjalankan peran, ikatan emosi kuat, komitmen spiritual, serta mampu meminta bantuan saat dibutuhkan."
        ]
      },
      {
        "heading": "Peran Orang Tua dalam Pengasuhan Remaja",
        "bullets": [
          "**4 Peran Kunci**: (1) Menjadi **sahabat remaja**, (2) Menjadi **pendengar yang baik**, (3) Menjadi **sumber informasi lengkap & bertanggung jawab**, (4) Meninggalkan gaya komunikasi *\"polisi\"* (menyalahkan, membandingkan, menceramahi) serta menghilangkan rasa tabu."
        ]
      }
    ],
    "highYield": [
      "Regulasi: **UU No. 52 Tahun 2009** tentang Perkembangan Kependudukan dan Pembangunan Keluarga.",
      "Indikator Ketahanan Fisik: **Makan lengkap 2×/hari, status penyakit/cacat, masalah gizi, dan ruang tidur terpisah**."
    ]
  },
  {
    "no": 25,
    "id": "d30",
    "driveNo": 30,
    "week": 3,
    "weekA": 3,
    "weekB": 3,
    "schedule": "A: Sel 3 Nov • B: Jum 6 Nov",
    "scheduleA": "Sel 3 Nov (09.45)",
    "scheduleB": "Jum 6 Nov (09.45)",
    "cluster": "gizi_lingkungan",
    "icon": "🌾",
    "title": "Perbaikan Gizi Masyarakat & Aksesibilitas Pangan Beragam",
    "dosen": "DR. Rifda Wulansari, SP, M.Kes",
    "readMin": 4,
    "tldr": "Stunting Indonesia turun ke 19,8% (SSGI 2024) namun beban ganda gizi tetap menantang; solusinya memadukan 3 strategi gizi (spesifik, sensitif, tata kelola) dan 4 pilar ketahanan pangan B2SA.",
    "sections": [
      {
        "heading": "Situasi Gizi Nasional & 3 Pilar Strategi Perbaikan Gizi",
        "bullets": [
          "**Tren SSGI**: Stunting turun dari 21,6% (2022) menjadi **19,8% (2024)**, namun masih ada disparitas wilayah serta beban ganda (*wasting* dan *overweight*).",
          "**1. Strategi Spesifik Gizi** (menyasar langsung biologis & asupan): Intervensi **1000 HPK**, TTD ibu hamil (**90 tablet**) & remaja putri (**1 tablet/minggu**), Vitamin A balita, PMT balita gizi kurang & bumil KEK, ASI eksklusif 6 bulan + MP-ASI, tata laksana gizi buruk & infeksi.",
          "**2. Strategi Sensitif Gizi** (sektor non-kesehatan): Ketahanan pangan rumah tangga, pengentasan kemiskinan (PKH/BPNT), pendidikan & literasi gizi ibu, air bersih & sanitasi, pertanian keluarga, dan Posyandu aktif.",
          "**3. Strategi Sistem & Tata Kelola (*Enabling Environment*)**: Regulasi/RPJMN, kolaborasi multisektor, surveilans SSGI, dan digitalisasi layanan."
        ]
      },
      {
        "heading": "4 Pilar Ketahanan Pangan & Pangan B2SA",
        "bullets": [
          "**4 Pilar Ketahanan Pangan**: (1) **Ketersediaan (*Availability*)**, (2) **Akses (*Access* — fisik, ekonomi, sosial-budaya, informasi)**, (3) **Pemanfaatan (*Utilization*)**, dan (4) **Stabilitas (*Stability*)**.",
          "**Aksesibilitas Pangan Beragam (B2SA — Beragam, Bergizi Seimbang, dan Aman)**: Diversifikasi pangan lokal (umbi, jagung, sorgum, kacang-kacangan) dan pemanfaatan pekarangan melalui **KRPL (Kawasan Rumah Pangan Lestari)**."
        ]
      }
    ],
    "highYield": [
      "Beda cepat: **Spesifik Gizi** = TTD, Vit A, PMT, ASI, 1000 HPK (kesehatan langsung); **Sensitif Gizi** = air bersih, sanitasi, bansos, pendidikan ibu, pertanian.",
      "4 Pilar Ketahanan Pangan: **Ketersediaan – Akses – Pemanfaatan – Stabilitas**."
    ]
  },
  {
    "no": 26,
    "id": "d19",
    "driveNo": 19,
    "week": 3,
    "weekA": 3,
    "weekB": 3,
    "schedule": "B: Sel 3 Nov • A: Menyesuaikan jadwal",
    "scheduleA": "Menyesuaikan jadwal",
    "scheduleB": "Sel 3 Nov (09.45)",
    "cluster": "islam_etika",
    "icon": "📝",
    "title": "Informed Consent (Persetujuan Tindakan Medis)",
    "dosen": "dr. Farah Primadani Karouw, Sp.F",
    "readMin": 4,
    "tldr": "Transaksi terapeutik adalah perjanjian upaya (inspanningverbintenis), dan Pasal 293 UU Kesehatan No. 17/2023 mewajibkan penjelasan minimal 7 unsur sebelum persetujuan tindakan medis.",
    "sections": [
      {
        "heading": "Landasan Hukum & Jenis Perjanjian Medis",
        "bullets": [
          "**Landasan**: UUD 1945, **UU Kesehatan No. 17 Tahun 2023 (Pasal 293)**, KODEKI, dan Permenkes Persetujuan Tindakan Medis.",
          "**Inspanningverbintenis (Perjanjian Upaya)**: Dokter berjanji berupaya maksimal sesuai standar profesi, standar pelayanan, dan SOP — **bukan** *Resultaatverbintenis* (janji pasti sembuh).",
          "**Tujuan Informed Consent**: Melindungi pasien dari tindakan yang tidak diperlukan sekaligus memberikan perlindungan hukum bagi dokter karena setiap tindakan medis mengandung risiko."
        ]
      },
      {
        "heading": "7 Unsur Wajib Penjelasan (Pasal 293 Ayat 3 UU No. 17/2023)",
        "bullets": [
          "**1.** Diagnosis",
          "**2.** Indikasi",
          "**3.** Tindakan pelayanan kesehatan yang dilakukan dan tujuannya",
          "**4.** Risiko dan komplikasi yang mungkin terjadi",
          "**5.** Alternatif tindakan lain dan risikonya",
          "**6.** Risiko apabila tindakan tidak dilakukan",
          "**7.** Prognosis setelah memperoleh tindakan"
        ]
      },
      {
        "heading": "Bentuk Persetujuan, Proxy Consent & Pengecualian",
        "bullets": [
          "**Expressed Consent**: Dinyatakan tegas secara lisan atau tertulis (tindakan berisiko tinggi wajib tertulis).",
          "**Implied Consent**: Tersirat dari sikap/perilaku pasien (mis. mengulurkan lengan untuk suntik/tensi).",
          "**Urutan Proxy Consent** (bila pasien tidak kompeten): **(1) Suami/Istri → (2) Orang tua kandung → (3) Anak kandung → (4) Saudara kandung**.",
          "**Anak <18 tahun**: Orang tua memberi *informed permission*, kecuali **emancipated minor** (mis. sudah menikah, mandiri finansial, ibu dari anak, atau anggota militer).",
          "**Kegawatdaruratan mengancam nyawa**: Tindakan penyelamatan tetap dilakukan tanpa menunda persetujuan; penjelasan diberikan segera setelah kondisi stabil."
        ]
      }
    ],
    "highYield": [
      "Hafal 7 unsur Pasal 293 UU 17/2023: **D–I–T–R–A–R–P** (Diagnosis, Indikasi, Tindakan+tujuan, Risiko+komplikasi, Alternatif, Risiko bila tidak dilakukan, Prognosis).",
      "Urutan wali (*proxy*): **1. Suami/Istri → 2. Orang tua → 3. Anak → 4. Saudara kandung**."
    ]
  },
  {
    "no": 27,
    "id": "d18",
    "driveNo": 18,
    "week": 3,
    "weekA": 3,
    "weekB": 3,
    "schedule": "A: Kam 5 Nov (07.55) • B: Kam 5 Nov (14.50)",
    "scheduleA": "Kam 5 Nov (07.55)",
    "scheduleB": "Kam 5 Nov (14.50)",
    "cluster": "lansia_k3",
    "icon": "👴",
    "title": "Pelayanan Kesehatan Kelompok Usia Lansia",
    "dosen": "dr. Zwasta Pribadi Mahardhika, M.Med.Ed, Sp.KKLP",
    "readMin": 3,
    "tldr": "Berdasarkan PP No. 28 Tahun 2024, layanan kesehatan lansia dimulai sejak usia 60 tahun secara menyeluruh (promotif, preventif, kuratif, rehabilitatif, paliatif) agar tetap sehat, berkualitas, dan bermartabat.",
    "sections": [
      {
        "heading": "Kerangka PP No. 28 Tahun 2024",
        "bullets": [
          "**Batas usia**: Dimulai sejak seseorang berusia **60 tahun**.",
          "**Tujuan**: Menjaga lansia tetap **hidup sehat, berkualitas, dan produktif sesuai martabat kemanusiaan**.",
          "**Upaya Promotif (6 pilar)**: Menjaga kebersihan diri, gizi seimbang, aktivitas fisik rutin, kehidupan sosial, kesempatan berkarya, dan lingkungan ramah lansia.",
          "**Upaya Preventif (Deteksi dini & skrining)**: (1) **Skrining tingkat kemandirian** (ketidakmampuan fisik, mental, intelektual), dan (2) **Skrining kesehatan** (status gizi, penyakit menular, PTM, dan kesehatan jiwa).",
          "**Upaya Kuratif**: Disesuaikan kondisi medis **serta hasil skrining kemandirian & kesehatan**.",
          "**Upaya Rehabilitatif & Paliatif**: Mengurangi keluhan pada penyakit terminal agar lansia menjalani akhir hidup bermartabat."
        ]
      },
      {
        "heading": "Perawatan Jangka Panjang (PJP) & Peran Keluarga",
        "bullets": [
          "**Komponen PJP Lansia**: Perawatan umum & khusus, pemenuhan gizi, pertolongan pertama gawat darurat, penanganan gangguan perilaku demensia, dan pengelolaan stres.",
          "**Peran Keluarga**: Menjaga kesehatan & kebugaran, **stimulasi kognitif**, pemenuhan gizi, mendukung kehidupan sosial, pemantauan berkala, dan pendampingan jangka panjang."
        ]
      }
    ],
    "highYield": [
      "Regulasi kunci: **PP No. 28 Tahun 2024**, dimulai usia **≥60 tahun**.",
      "2 ranah skrining preventif lansia: **Tingkat Kemandirian** (fisik, mental, intelektual) & **Skrining Kesehatan** (gizi, PM, PTM, jiwa)."
    ]
  },
  {
    "no": 28,
    "id": "d21",
    "driveNo": 21,
    "week": 4,
    "weekA": 4,
    "weekB": 4,
    "schedule": "B: Sen 9 Nov • A: Rab 11 Nov",
    "scheduleA": "Rab 11 Nov (07.55)",
    "scheduleB": "Sen 9 Nov (07.55)",
    "cluster": "gizi_lingkungan",
    "icon": "🏃",
    "title": "Aktivitas Fisik",
    "dosen": "dr. Rita Komalasari, MoD., Ph.D",
    "readMin": 3,
    "tldr": "Aktivitas fisik diukur berdasarkan intensitas kalori/MET dan dievaluasi dengan laporan individual (GPAQ, Bouchard 3×24 jam) atau alat objektif; intensitas sedang rutin paling optimal meningkatkan imunitas.",
    "sections": [
      {
        "heading": "Klasifikasi Intensitas (Kalori/Menit & MET)",
        "table": {
          "headers": [
            "Kategori",
            "Kriteria MET / Energi & Tanda Klinis"
          ],
          "rows": [
            [
              "Ringan / Rendah",
              "<3,5 kkal/menit; napas tidak berubah, masih bisa bicara dan bernyanyi; tidak memenuhi kriteria sedang/tinggi"
            ],
            [
              "Sedang",
              "3,5–7 kkal/menit (sedikit berkeringat, masih bisa bicara tapi tak bisa bernyanyi); **≥600 MET-mnt/mgg** (mis. jalan ≥30 mnt/hr selama ≥5 hari, atau berat ≥20 mnt/hr selama 3 hari)"
            ],
            [
              "Berat / Tinggi",
              ">7 kkal/menit (keringat banyak, terengah-engah sulit bicara); berat ≥3 hari ≥**1500 MET-mnt/mgg**, atau kombinasi ≥**3000 MET-mnt/mgg**"
            ]
          ]
        }
      },
      {
        "heading": "Metode Pengukuran & Protokol Bouchard",
        "bullets": [
          "**Laporan Individual** (paling sering dipakai, kelemahan: akurasi frekuensi & intensitas): **GPAQ (WHO)** dan **Bouchard**.",
          "**Pengukuran Objektif**: Pedometer, akselerometer, sensor gerak, observasi langsung, dan monitor denyut jantung.",
          "**Protokol Baku Bouchard (3-Day Physical Activity Record)**: Dicatat **3 × 24 jam** dalam 1 minggu (**2 hari kerja + 1 hari libur**), **tidak boleh hari berurutan** (mis. Selasa–Kamis–Sabtu), dengan blok pencatatan tiap **15 menit** (kcal/kgBB/15 mnt) lalu dirata-ratakan."
        ]
      },
      {
        "heading": "Hubungan Aktivitas Fisik & Imunitas",
        "bullets": [
          "**Kurva berbentuk J (tidak linear)**: Perilaku sedenter menurunkan imunitas; **aktivitas intensitas sedang rutin** meningkatkan imunitas paling optimal; latihan sangat berat ekstrem tanpa pemulihan dapat menurunkan imunitas sementara."
        ]
      }
    ],
    "highYield": [
      "Angka MET wajib hafal: **Sedang ≥600**, **Tinggi berat ≥1500** atau **kombinasi ≥3000 MET-menit/minggu**.",
      "Bouchard: **3×24 jam** (**2 hari kerja + 1 hari libur**, **tidak berurutan**), interval **15 menit**."
    ]
  },
  {
    "no": 29,
    "id": "d22",
    "driveNo": 22,
    "week": 4,
    "weekA": 4,
    "weekB": 4,
    "schedule": "B: Sen 9 Nov • A: Kam 12 Nov",
    "scheduleA": "Kam 12 Nov (09.45)",
    "scheduleB": "Sen 9 Nov (08.50)",
    "cluster": "gizi_lingkungan",
    "icon": "🍽️",
    "title": "Pengelolaan Gizi dalam Keluarga",
    "dosen": "DR. Rifda Wulansari, SP, M.Kes",
    "readMin": 4,
    "tldr": "Pengelolaan gizi keluarga masuk aspek risiko internal Diagnosis Holistik, mencakup kebutuhan energi khusus (hamil/menyusui), komposisi Gizi Seimbang, KADARZI, dan metode survei konsumsi pangan.",
    "sections": [
      {
        "heading": "Tambahan Kebutuhan Energi (AKG) Ibu Hamil & Menyusui",
        "table": {
          "headers": [
            "Kelompok Fisiologis",
            "Tambahan Energi per Hari"
          ],
          "rows": [
            [
              "Ibu Hamil Trimester 1",
              "**+180 kkal/hari**"
            ],
            [
              "Ibu Hamil Trimester 2",
              "**+300 kkal/hari**"
            ],
            [
              "Ibu Hamil Trimester 3",
              "**+300 kkal/hari**"
            ],
            [
              "Ibu Menyusui 6 bulan pertama",
              "**+330 kkal/hari**"
            ],
            [
              "Ibu Menyusui 6 bulan kedua",
              "**+400 kkal/hari**"
            ]
          ]
        }
      },
      {
        "heading": "Metode Pengukuran Konsumsi Pangan",
        "bullets": [
          "**Metode Kualitatif** (pola & frekuensi makan): **FFQ (*Food Frequency Questionnaire*)**, *Dietary History*, dan *Food List*.",
          "**Metode Kuantitatif** (jumlah gram/kalori aktual): **Recall 24 jam**, **Estimated Food Record** (mencatat makanan yang dikonsumsi dalam URT), **Food Weighing** (menimbang langsung), *Food Account*, dan *Inventory Method*."
        ]
      },
      {
        "heading": "Gizi Seimbang & KADARZI",
        "bullets": [
          "**Isi Piringku / Gizi Seimbang**: 1/3 makanan pokok, 1/3 sayuran, 1/3 lauk-pauk + buah (susu bukan lagi kewajiban bila protein tercukupi dari lauk lain).",
          "**KADARZI (Keluarga Sadar Gizi — 5 Indikator)**: (1) Menimbang berat badan teratur, (2) Memberikan ASI eksklusif 0–6 bulan, (3) Makan beraneka ragam, (4) Menggunakan garam beryodium, (5) Minum suplemen gizi sesuai anjuran (Vit A, TTD)."
        ]
      }
    ],
    "highYield": [
      "Hafal angka AKG tambahan: Hamil **+180 / +300 / +300**, Menyusui **+330 / +400 kkal/hari**.",
      "Bedakan **Kualitatif** (FFQ, Dietary History, Food List) vs **Kuantitatif** (Recall 24j, Food Record, Food Weighing)."
    ]
  },
  {
    "no": 30,
    "id": "d28",
    "driveNo": 28,
    "week": 4,
    "weekA": 4,
    "weekB": 4,
    "schedule": "B: Sen 9 Nov (13.00) • A: Sen 9 Nov (14.50)",
    "scheduleA": "Sen 9 Nov (14.50)",
    "scheduleB": "Sen 9 Nov (13.00)",
    "cluster": "islam_etika",
    "icon": "🚦",
    "title": "Pencegahan & Penanganan Kecelakaan Lalu Lintas (Perspektif Islam)",
    "dosen": "Afrizal Tw, Lc., MA., Ph.D",
    "readMin": 3,
    "tldr": "Mematuhi aturan lalu lintas adalah kewajiban syar’i (QS An-Nisa: 59) untuk menjaga jiwa (Hifzhun Nafs); dokter wajib menilai kelayakan mengemudi dan menyelamatkan korban gawat darurat sesuai kaidah fikih.",
    "sections": [
      {
        "heading": "Kewajiban Syar’i & Tanggung Jawab Ikhtiar",
        "bullets": [
          "**Dasar Dalil (IIFA / Majma’ al-Fiqh al-Islami)**: **QS An-Nisa’ [4]: 59** (taat kepada Allah, Rasul, dan *ulul amri*) → mematuhi rambu dan aturan lalu lintas hukumnya wajib syar’i meski tidak ada petugas yang mengawasi.",
          "**Maqashid Syariah**: Bagian dari **Hifzhun Nafs** (menjaga nyawa) dan **Hifzhul Mal** (menjaga harta).",
          "**Takdir vs Kelalaian**: Mengakui takdir atau tidak berniat mencelakai **tidak menghapus tanggung jawab** hukum dan moral atas kelalaian (mengantuk, mengebut, kendaraan tidak layak)."
        ]
      },
      {
        "heading": "Peran Dokter: Kelayakan Mengemudi & Kaidah Fikih Gawat Darurat",
        "bullets": [
          "**Pertanyaan wajib dokter sebelum meresepkan obat**: *\"Apakah Bapak/Ibu akan mengemudi setelah minum obat ini?\"* — perhatikan obat sedatif (antihistamin gen-1, benzodiazepin, opioid), risiko **hipoglikemia** (pasien DM), dan kelelahan.",
          "**2 Kaidah Fikih Penanganan Korban KLL Darurat**: (1) ***Adh-dharurat tubih al-mahzhurat*** (keadaan darurat membolehkan hal yang semula terlarang — segera selamatkan nyawa tanpa menunda persetujuan), dan (2) ***Adh-dharurat tuqaddar biqadariha*** (darurat diukur sebatas kadarnya — buka pakaian & sentuh tubuh hanya sebatas area tindakan sambil tetap menjaga privasi)."
        ]
      }
    ],
    "highYield": [
      "Dalil wajib taat lalu lintas: **QS An-Nisa’ ayat 59**.",
      "2 Kaidah Fikih darurat: **Tubih al-mahzhurat** (bolehkan yang terlarang saat darurat) & **Tuqaddar biqadariha** (sebatas yang diperlukan saja)."
    ]
  },
  {
    "no": 31,
    "id": "s03",
    "driveNo": null,
    "isScheduleExtra": true,
    "cluster": "farma",
    "icon": "💨",
    "title": "Tugas Baca: Penggunaan Obat Cair & Inhalasi",
    "dosen": "DR. Dra. Risdawati Djohan, Apt., M.Kes",
    "readMin": 4,
    "tldr": "Efektivitas obat cair dan inhalasi sangat ditentukan oleh edukasi cara pakai: penakaran akurat dalam mL, pengocokan suspensi, rekonstitusi sirup kering, teknik napas tepat pada pMDI/spacer/DPI, dan kumur wajib pasca-kortikosteroid inhalasi.",
    "sections": [
      {
        "heading": "Penggunaan Tepat Sediaan Obat Cair (Oral & Topikal)",
        "bullets": [
          "**Penakaran Akurat**: Selalu gunakan **spuit oral, pipet tetes terkalibrasi, atau gelas/sendok takar berskala mL** (1 sdt = **5 mL**, 1 sdm = **15 mL**). Hindari sendok makan/teh rumah tangga karena volumenya sangat bervariasi dan berisiko salah dosis (terutama pada anak).",
          "**Suspensi & Emulsi**: Wajib **dikocok merata** setiap sebelum dituang agar partikel obat terdispersi homogen dan dosis tidak kurang di awal / berlebih di akhir botol.",
          "**Sirup Kering (*Dry Syrup* Antibiotik)**: Rekonstitusi dengan air matang suhu ruang bertahap hingga tanda batas botol, kocok hingga larut merata, simpan sesuai petunjuk (suhu ruang/lemari es non-freezer), dan **buang sisa setelah 7–14 hari** (*beyond-use date*).",
          "**Tetes Mata & Tetes Telinga**: Cuci tangan, hindari ujung penetes menyentuh mata/telinga/kulit; tetes mata diarahkan ke kantong konjungtiva bawah + oklusi pungtum nasolakrimal 1–2 menit, beri jeda **5–10 menit** antar obat mata berbeda, dan umumnya dibuang **28 hari** setelah segel dibuka (botol multidosis)."
        ]
      },
      {
        "heading": "Perbandingan Perangkat Inhalasi Utama",
        "table": {
          "headers": [
            "Perangkat",
            "Teknik Napas & Koordinasi",
            "Keunggulan & Indikasi Utama"
          ],
          "rows": [
            [
              "pMDI (Metered Dose Inhaler)",
              "Kocok dulu; butuh koordinasi **tekan + tarik napas lambat & dalam**, lalu tahan 5–10 detik",
              "Praktis, ringkas, banyak tersedia; sering salah teknik bila tanpa spacer"
            ],
            [
              "pMDI + Spacer (VHC)",
              "Semprot 1 puff ke tabung spacer, hirup perlahan (atau bernapas tidal 5–6× pada balita)",
              "Menghilangkan masalah koordinasi, tingkatkan deposisi paru, turunkan deposisi orofaring (anak, lansia, ICS)"
            ],
            [
              "DPI (Turbuhaler / Diskus / Handihaler)",
              "Tidak perlu dikocok & tidak perlu koordinasi tekan-hirup; butuh tarikan napas **cepat & kuat**",
              "Aktif mengikuti inspirasi (*breath-actuated*); kurang cocok bila aliran inspirasi lemah (anak <5 thn, PPOK/serangan berat)"
            ],
            [
              "Nebulizer",
              "Bernapas biasa melalui masker/mouthpiece selama 5–15 menit",
              "Tidak butuh koordinasi; dipakai pada serangan akut berat, balita, atau pasien sangat lemah"
            ]
          ]
        }
      },
      {
        "heading": "Langkah Kritis Inhaler & Pencegahan Efek Samping",
        "bullets": [
          "**Urutan pMDI yang benar**: Lepas tutup & kocok vertikal → ekspirasi penuh menjauh dari alat → rapatkan bibir di *mouthpiece* → mulai tarik napas **perlahan & dalam** bersamaan menekan kanister 1× → **tahan napas 5–10 detik** → hembuskan perlahan. Tunggu 30–60 detik bila perlu puff ke-2.",
          "**Pantangan DPI**: Jangan menghembuskan napas ke dalam *mouthpiece* karena uap air akan menggumpalkan serbuk obat.",
          "**Kortikosteroid Inhalasi (ICS)**: Wajib **berkumur air bersih lalu buang (jangan ditelan)** segera setelah pemakaian (dan lap wajah bila memakai masker spacer) untuk mencegah **kandidiasis orofaring (*oral thrush*)** serta suara serak (*disfonia*)."
        ]
      }
    ],
    "highYield": [
      "Beda tarikan napas utama: **pMDI = lambat & dalam** (+ tahan napas 5–10 detik); **DPI = cepat & kuat** (*forceful inhalation*).",
      "Pasca-penggunaan **kortikosteroid inhalasi (ICS)** wajib **berkumur lalu membuang air kumuran** untuk mencegah *oral thrush* dan disfonia.",
      "Pada anak, lansia, atau pasien kesulitan koordinasi pMDI, tambahkan **spacer** agar obat masuk optimal ke saluran napas bawah.",
      "Jangan takar sirup anak dengan sendok dapur — gunakan **spuit oral / sendok takar mL** (1 sdt = 5 mL) dan selalu **kocok suspensi** sebelum pakai."
    ],
    "week": 4,
    "weekA": 4,
    "weekB": 4,
    "schedule": "A: Sel 10 Nov • B: Kam 12 Nov (+ Feedback M5: 16–17 Nov)",
    "scheduleA": "Sel 10 Nov (07.55) + Feedback Sel 17 Nov",
    "scheduleB": "Kam 12 Nov (13.00) + Feedback Sen 16 Nov"
  },
  {
    "no": 32,
    "id": "d23",
    "driveNo": 23,
    "week": 4,
    "weekA": 4,
    "weekB": 4,
    "schedule": "A: Sel 10 Nov • B: Kam 12 Nov",
    "scheduleA": "Sel 10 Nov (09.45)",
    "scheduleB": "Kam 12 Nov (09.45)",
    "cluster": "gizi_lingkungan",
    "icon": "🏙️",
    "title": "Kesehatan Perkotaan & Pedesaan",
    "dosen": "DR. Kholis Ernawati, M.Kes",
    "readMin": 3,
    "tldr": "Profil penyakit kota dan desa kontras: kota didominasi PTM, polusi, dan stres mental, sedangkan desa didominasi penyakit menular, sanitasi/air terbatas, dan akses faskes rendah — keduanya dinilai mutunya lewat SERVQUAL.",
    "sections": [
      {
        "heading": "Perbandingan Masalah Kesehatan Kota vs Desa",
        "table": {
          "headers": [
            "Dimensi",
            "Perkotaan (Urban)",
            "Perdesaan (Rural)"
          ],
          "rows": [
            [
              "Penyakit Dominan",
              "**PTM** (hipertensi, DM, jantung, stroke, kanker), gangguan mental/stres, penyakit padat penduduk",
              "**Penyakit menular** (diare, malaria, DBD, TBC)"
            ],
            [
              "Faktor Risiko Utama",
              "Kepadatan tinggi, polusi udara, gaya hidup sedenter, pola makan tinggi kalori, tekanan hidup",
              "Akses faskes & nakes terbatas, air bersih kurang (**48,7%**), sanitasi kurang (**69,7%**), literasi lebih rendah"
            ],
            [
              "Fokus Intervensi",
              "Pencegahan PTM berbasis komunitas, **telemedicine/digital**, pengendalian polusi & ruang terbuka",
              "Pemerataan faskes/nakes, perbaikan air bersih & sanitasi, edukasi kesehatan & posyandu"
            ]
          ]
        }
      },
      {
        "heading": "Evaluasi Mutu Layanan: 5 Dimensi SERVQUAL",
        "bullets": [
          "**5 Dimensi SERVQUAL (Parasuraman)**: (1) **Tangibility** (bukti fisik), (2) **Reliability** (keandalan), (3) **Responsiveness** (daya tanggap), (4) **Assurance** (jaminan/kompetensi), (5) **Empathy** (empati) — ditambah *Accessibility* & *Affordability* (Sarumpaet et al., 2012).",
          "**Temuan utama KIA kota vs desa**: Harapan masyarakat terhadap mutu layanan KIA sama-sama tinggi baik di kota maupun desa, tetapi kesenjangan kepuasan (*gap*) lebih besar di desa akibat akses & keterbatasan sarana."
        ]
      }
    ],
    "highYield": [
      "5 Dimensi SERVQUAL: **R–A–T–E–R** (*Reliability, Assurance, Tangibles, Empathy, Responsiveness*).",
      "Kota = **PTM + mental + polusi**; Desa = **Penyakit menular + akses + sanitasi (69,7% kurang) & air bersih (48,7% kurang)**."
    ]
  },
  {
    "no": 33,
    "id": "d24",
    "driveNo": 24,
    "week": 4,
    "weekA": 4,
    "weekB": 4,
    "schedule": "A: Rab 11 Nov • B: Jum 13 Nov",
    "scheduleA": "Rab 11 Nov (08.50)",
    "scheduleB": "Jum 13 Nov (09.45)",
    "cluster": "gizi_lingkungan",
    "icon": "🏡",
    "title": "Penilaian Rumah Sehat, Perumahan & PHBS dalam DH",
    "dosen": "DR. Kholis Ernawati, M.Kes",
    "readMin": 4,
    "tldr": "Lingkungan rumah sehat (Depkes 2007 & Kepmenkes 829/1999) dan PHBS tatanan rumah tangga (Riskesdas 2013) adalah komponen krusial aspek risiko eksternal dalam Diagnosis Holistik.",
    "sections": [
      {
        "heading": "Penilaian Rumah Sehat (Bobot & Syarat Teknis)",
        "bullets": [
          "**3 Kelompok Penilaian & Bobotnya**: (1) **Komponen Fisik Rumah** (bobot **25**), (2) **Sarana Sanitasi** (bobot **25**), dan (3) **Perilaku Penghuni** (bobot **50** — bobot terbesar!).",
          "**Luas bangunan minimal (Kepmenkes 829/1999)**: **≥ 8 m² per orang** (jika <8 m²/orang = padat hunian, memicu penularan TB/ISPA & stres psikologis).",
          "**Sarana Air Bersih**: Kapasitas minimal **60 liter/orang/hari**, jernih, tidak berwarna, tidak berbau, suhu di bawah suhu udara luar.",
          "**Jamban nilai tertinggi (skor 4)**: Tipe **leher angsa dengan septic tank** (tidak mencemari tanah/air, tidak dijamah lalat, tidak berbau).",
          "**Pembuangan Sampah nilai tertinggi (skor 3)**: Kedap air, **bertutup rapat**, dan dibuang/dikelola secara rutin."
        ]
      },
      {
        "heading": "4 Peran Lingkungan terhadap Penyakit & Kriteria PHBS",
        "bullets": [
          "**4 Peran Lingkungan**: Penyebab langsung (pencahayaan kurang → gangguan mata), Media transmisi (TB/ISPA), Faktor predisposisi (padat hunian → gangguan psikologis), dan Memengaruhi perjalanan penyakit (rumah lembap → pemicu asma).",
          "**Kriteria PHBS Baik (Riskesdas 2013)**: Rumah tangga **dengan balita** minimal memenuhi **≥ 6 indikator**; rumah tangga **tanpa balita** minimal memenuhi **≥ 5 indikator**.",
          "**Indikator Pemberantasan Jentik**: Menguras bak mandi **≥ 1 kali/minggu** (atau tidak memiliki bak penampungan air)."
        ]
      }
    ],
    "highYield": [
      "Hafal angka kunci Rumah Sehat: Bobot **25–25–50** (Perilaku paling besar!), Luas **≥8 m²/org**, Air **≥60 L/org/hr**, Jamban **leher angsa + septic tank**.",
      "Cut-off PHBS Baik Riskesdas: **≥6 indikator** (ada balita) atau **≥5 indikator** (tanpa balita)."
    ]
  },
  {
    "no": 34,
    "id": "d31",
    "driveNo": 31,
    "week": 5,
    "weekA": 5,
    "weekB": 5,
    "schedule": "B: Sen 16 Nov (13.00) • A: Sen 16 Nov (14.50)",
    "scheduleA": "Sen 16 Nov (14.50)",
    "scheduleB": "Sen 16 Nov (13.00)",
    "cluster": "islam_etika",
    "icon": "🤝",
    "title": "Ta’awun dalam Pandangan Islam",
    "dosen": "Afrizal Tw, Lc., MA., Ph.D",
    "readMin": 3,
    "tldr": "Ta’awun (QS Al-Ma’idah: 2) adalah kerja sama timbal-balik dalam kebaikan (al-birr) dan ketakwaan (at-taqwa) yang memuliakan kedua pihak — diuji lewat 4 Filter Diagnostik Ta’awun dalam praktik medis.",
    "sections": [
      {
        "heading": "Makna Ta’awun vs I’anah & Dalil Utama",
        "bullets": [
          "**QS Al-Ma’idah [5]: 2**: Tolong-menolong hanya dalam ***al-birr* (kebaikan)** dan ***at-taqwa***, serta **dilarang** dalam ***al-itsm* (dosa)** dan ***al-‘udwan* (permusuhan/pelanggaran)**.",
          "**Ta’awun vs I’anah**: **Ta’awun** berpola *tafa’ul* (timbal-balik, saling menguatkan, setara), sedangkan **I’anah** bersifat satu arah sehingga rentan memunculkan ilusi superioritas pemberi dan rasa rendah diri penerima.",
          "**Menolong saudara yang berbuat salah (HR Bukhari)**: Dilakukan dengan **mencegah/menghentikan kesalahannya** — dalam medis, bukan menutupi malpraktik/kesalahan rekan, melainkan melapor demi keselamatan pasien dan mendampingi perbaikan.",
          "**Hadis Satu Tubuh & Larangan Al-Mann wal Adza**: Sesama mukmin bagai satu tubuh (HR Bukhari–Muslim); jangan membatalkan amal dengan mengungkit-ungkit (*al-mann*) atau menyakiti (*al-adza*) (QS Al-Baqarah [2]: 264)."
        ]
      },
      {
        "heading": "4 Filter Diagnostik Ta’awun & Konsep Tanfis",
        "bullets": [
          "**Filter 1 — Al-Birr**: Apakah tujuannya baik?",
          "**Filter 2 — At-Taqwa**: Apakah caranya halal dan jujur?",
          "**Filter 3 — Laa Dharar wa Laa Dhirar**: Adakah pihak lain yang dirugikan/dibahayakan (termasuk menghormati batas kompetensi klinis)?",
          "**Filter 4 — Memberdayakan**: Apakah bantuan ini membuat penerimanya **bertumbuh**?",
          "**Tanfis**: Meringankan beban emosional/fisik pasien dengan empati dan pendampingan meski tidak semua masalahnya selesai sekaligus."
        ]
      }
    ],
    "highYield": [
      "4 Filter Diagnostik Ta’awun: **1. Tujuan baik (Al-Birr) → 2. Cara halal/jujur (At-Taqwa) → 3. Tidak merugikan (Laa Dharar) → 4. Membuat penerima bertumbuh**.",
      "Beda **Ta’awun** (timbal-balik/setara) vs **I’anah** (satu arah)."
    ]
  }
];

  window.CLINED_KEDKEL_SUMMARY_DATA = { SCHEDULE_META, WEEKS, CLUSTERS, TOPICS };
})();
