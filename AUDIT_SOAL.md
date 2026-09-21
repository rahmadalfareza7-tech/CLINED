# Audit bank soal CLINED

Dibuat dari pemeriksaan otomatis + tinjauan oleh AI. **Ini bukan verifikasi ahli.** Tidak ada soal yang dicocokkan
langsung dengan textbook atau jurnal. Soal yang tercantum di bagian "Perlu ditinjau" harus dicek oleh dokter/dosen sebelum
dianggap benar.

## Sudah diperbaiki di paket ini
| Bank | Masalah | Tindakan |
|---|---|---|
| `muskulo-2019` | Semua 100 kunci jawaban tersimpan 1-based (nilai 1–5, tidak ada 0), aplikasi membaca 0-based, jadi kunci bergeser satu opsi. 83/100 terkonfirmasi lewat kecocokan teks pembahasan. | Semua kunci dikurangi 1. |
| `ginjal-2021` | (lihat bagian Pembaruan di bawah) 59 dari 100 soal adalah template palsu ("Opsi kriteria diagnostik utama A untuk kasus 57"). | Dipindah ke `seed-data/quarantine/ginjal-2021-placeholder.json`. Sisa 41 soal asli. **Perlu soal asli untuk mengisi kembali.** |
| `kedkom-2021` | No. 36 kosong (opsi "A/B/C"). | Dipindah ke `seed-data/quarantine/kedkom-2021-blank.json`. Sisa 99 soal. |
| Semua bank | Tidak ada `komponenStatistik`, sehingga radar memakai pengklasifikasi kata kunci lama (Diagnostics 36%, Recall 34%, Physiology 6%). | Label baru ditulis ke tiap soal. Lihat `AUDIT_KATEGORI.csv`. |

Manifest (`seed-data/manifest.json`) dan `STATIC_BANK_META` sudah diperbarui (jumlah soal, versi 2). Setelah deploy jalankan `npm run db:seed`.

## Perlu ditinjau dokter atau dosen
- `ginjal-2018` #51: opsi B dan C sama-sama salah (siprofloksasin disebut "generasi pertama"), kunci B.
- `ginjal-2018` #12: opsi A dan E identik.
- `kedkel-2021` #46: opsi C dan E identik.
- `kedkom-2021` #73: pembahasan berisi catatan sisa "Pilihan D diacak".
- `kedkel-2018` #14 dan `kedkel-2022` #31: soal "kecuali… bukan salah satu di atas" (negasi ganda).
- `ginjal-2020` #92: hidroureter/hidronefrosis juga komplikasi BPH yang sah, kunci "retensi urin akut".
- `muskulo-2022` #35: dwarfisme sebagai "bukan tanda riketsia" perlu dipastikan.
- `kedkel-2020` #2 dan #69: kunci "deteksi PTM" sebagai pengecualian perlu dipastikan.
- Soal kembar antar-tahun dengan teks kunci berbeda (belum ditinjau satu per satu; sebagian hanya beda penulisan):
- endo-2019#66 → “Meminta pasien untuk meludah pada wadah sambil mengunyah parafin (Sial” | endo-2023#20 → “Meminta pasien untuk meludah pada wadah sambil mengunyah parafin”
- ginjal-2018#71 → “Tekanan onkotik capsula bowman” | ginjal-2022#7 → “Tekanan hidrostatik kapiler glomerulus”
- kedkel-2018#3 → “Pasien, family and community oriented” | kedkel-2021#11 → “Patient, family and community oriented” | kedkel-2022#50 → “Pasien, family and community oriented”
- kedkel-2018#6 → “semua pilihan jawaban benar” | kedkel-2022#64 → “Jawaban a, b, c, dan d benar”
- kedkel-2018#10 → “Obat yang sudah lama ditemukan dan jelas manfaatnya” | kedkel-2019#28 → “Obat yang sudah lama ditemukan dan jelas manfaat serta keamanannya” | kedkel-2021#6 → “Obat yang sudah lama ditemukan dan jelas manfaatnya” | kedkel-2021#16 → “Obat yang sudah lama ditemukan dan jelas manfaatnya” | kedkel-2022#72 → “Obat yang sudah lama ditemukan dan jelas manfaatnya”
- kedkel-2018#13 → “Pemeriksaan dan edukasi online” | kedkel-2021#17 → “Pemeriksaan dan edukasi secara on line”
- kedkel-2018#15 → “minimal 6 aspek penilaian PHBS memenuhi syarat” | kedkel-2022#19 → “minimal 7 aspek penilaian PHBS memenuhi syarat”
- kedkel-2018#29 → “Perlu dilakukan individualisasi dosis obat” | kedkel-2019#26 → “Perlu dilakukan individualisasi dosis obat” | kedkel-2021#30 → “Pengobatan dengan mempertimbangkan faktor-faktor yang dimiliki pasien” | kedkel-2022#81 → “Perlu dilakukan individualisasi dosis obat”
- kedkel-2018#45 → “Memberikan efek obat lebih lama/panjang dibandingkan tablet biasa” | kedkel-2021#42 → “Memberikan efek obat lebih lama/panjang”
- kedkel-2018#55 → “Memperpanjang shelf- life sediaan obat” | kedkel-2021#66 → “Memperpanjang shelf-life sediaan obat”
- kedkel-2021#39 → “Dinas Kesehatan Tk I” | kedkel-2022#49 → “Kementrian Kesehatan”
- kedkel-2021#44 → “Dokter dengan pendekatan dokter keluarga” | kedkel-2022#90 → “Dokter umum”
- kedkom-2018#28 → “Gate Keeper” | kedkom-2019#7 → “Gatekeeper”

## Metode dan batasannya
- Pemeriksaan otomatis: kunci di luar rentang, pembahasan kosong/tidak lengkap, placeholder, opsi kembar, kunci yang tidak cocok
  dengan teks pembahasan, penjelasan opsi salah yang bernada "jawaban benar", soal kembar dengan kunci berbeda.
- Tinjauan klinis oleh AI: seluruh soal yang ditandai (±60) dan sampel acak 26 soal klinis. Tidak ditemukan kunci yang jelas salah
  pada sampel, tetapi ada 1–2 yang ambigu. Sampel ini bukan jaminan untuk 2.100+ soal lainnya.
- Soal agama/etika (AIK) dan hukum tidak dinilai kebenarannya.

## Kategori (`komponenStatistik`)
Pengklasifikasi baru: `js/ability-classifier.js`. Soal dinilai dari **kalimat pertanyaan** di akhir stem, bukan dari kata di vignette.
Definisi tiap komponen ada di komentar file tersebut. Ini heuristik, bukan label ahli. Pada sampel acak 45 soal (sebelum penyetelan
terakhir) sekitar 60–65% cocok dengan penilaian manual. Kesalahan tersisa paling sering pada soal berkalimat tanya pendek ("apa yang dimaksud?")
dan soal blok KEDKOM/KEDKEL/MULSIS, yang memang tidak cocok dengan enam sumbu ilmu dasar (sebagian besar masuk Recall).
Untuk mengoreksi, isi kolom `komponen_koreksi_manual` di `AUDIT_KATEGORI.csv`, lalu salin nilainya ke field `komponenStatistik` soal terkait.


## Pembaruan: arsip Ginjal 2021 (PDF "Ginjal_2021_Bella")
Judul di dalam PDF tertulis "ARSIP GINJAL 2023", padahal nama file 2021; isinya gabungan beberapa tahun. PDF adalah arsip ingatan mahasiswa,
banyak soal tanpa opsi ("lupa"), dengan catatan dan tanda stabilo pribadi. Bukan sumber resmi.

**Ditambahkan ke `ginjal-2021` (30 soal, kini 71 soal).** Hanya soal dengan pokok soal dan minimal 4 opsi lengkap. Pembahasan tiap opsi
ditulis ulang oleh AI dan belum ditinjau ahli. Nomor 24, 42, 51, 62, 63, 68, 74, 77, 84, 86, 91, 96, 97, 101, 102 mengisi nomor arsip
yang sebelumnya template; nomor 103–117 berasal dari bagian arsip lain.
Kunci yang **disimpulkan sendiri** (arsip tidak menandai jawaban): no. 84, 97, 102, 117. Soal fikih (no. 116, dan no. 8) perlu dosen AIK.

**Tidak ditambahkan.** Opsi hilang atau tidak lengkap: arsip no. 29, 31, 43, 44, 46, 48, 55, 61, 65, 88, 89, 90, 92 dan beberapa soal tanpa nomor.
Butuh gambar: no. 67, 72. Duplikat soal yang sudah ada: no. 27, 49, 57, 59, 73, 75, 76, 80, 82, 83, 85, 95, 98.
Kunci meragukan: no. 64 (oliguria: arsip menandai GN kronis, secara fisiologi hipotensi lebih tepat), no. 69 dan 93 (arsip menandai
plica interureterica sebagai penahan refluks; secara anatomi yang berperan adalah ureter intramural/ostium ureter), no. 94 (interpretasi fungsi
ginjal dari kreatinin normal, ambigu), no. 103 versi "definisi mati AS" (opsi "mati neurologis" dan "mati otak" tumpang tindih).

**Soal lama yang dikoreksi agar sesuai arsip.**
- no. 8 (istinja): kunci arsip adalah 1, 2, 3, 4 (opsi D). Opsi lama "semua benar (1–5)" tidak ada di arsip dan kuncinya salah. Diperbaiki.
- no. 13 (urin menghitam): stem lama memakai anak 2 tahun dengan kunci alkaptonuria, padahal arsip menandai melanuria untuk versi anak dan
  alkaptonuria untuk versi pria 20 tahun. Stem disamakan dengan versi pria 20 tahun. Kedua versi secara klinis dapat diperdebatkan.
- no. 50 (glomerulus tampak normal, hematuria): stem lama membocorkan jawaban ("minimal change") dan kuncinya MCD. Arsip dan slide dosen
  menandai nefropati membranosa. Kunci diubah mengikuti arsip. **Ambigu secara klinis**, mohon dikonfirmasi dosen.

## Validasi kunci `muskulo-2019` (100 soal)
Setelah kunci digeser ke 0-based, semua 100 soal saya baca satu per satu (pokok soal, opsi kunci, dan pembahasan) dan saya cocokkan dengan
pengetahuan anatomi, histologi, farmakologi, dan bioetik. Tidak ada kunci yang jelas salah. Yang tetap perlu dokter/dosen:
- no. 12: opsi kunci menyebut ion kalsium "di terminal button" (terminal saraf), sedangkan kekuatan kontraksi ditentukan kalsium di sarkoplasma.
- no. 22: rotasi terbesar per segmen dinilai di regio thoraks; regio servikal (terutama C1–C2) secara total dapat lebih besar.
- no. 56: bioetik beneficence; opsi kunci ("minta izin pasien") lebih menggambarkan autonomi, tetapi tidak ada opsi lain yang lebih tepat.
- no. 71: opsi C (a. circumflexa scapulae) dan D (arteri dan vena circumflexa scapulae) sama-sama masuk akal.
- no. 82: T-score -3,0 pada wanita 65 tahun; terapi antiresorptif (bisfosfonat) biasanya diperlukan, tetapi opsi kunci hanya kalsium dan vitamin D.
- no. 4, 6, 25 dan soal bergambar lain: kunci tidak dapat diverifikasi karena gambar tidak ada di bank.

## Soal yang merujuk gambar tetapi bank tidak menyimpan gambar
Soal berikut menyebut "gambar", "panah", "ditunjuk", atau "ditandai angka", tetapi tidak ada gambar di data. Siswa tidak dapat menjawabnya secara
bermakna sampai gambar disediakan atau soalnya ditulis ulang:
- `endo-2019`: no. 86, 87, 88
- `endo-2023`: no. 70
- `ginjal-2018`: no. 4
- `ginjal-2019`: no. 35, 47, 71, 73, 76, 79, 93
- `kedkel-2021`: no. 4, 46, 47, 48
- `kedkel-2022`: no. 23, 53, 82
- `kedkom-2018`: no. 1
- `kedkom-2020`: no. 130
- `kedkom-2022`: no. 84
- `muskulo-2019`: no. 4, 6, 25
- `muskulo-2020`: no. 3, 14
