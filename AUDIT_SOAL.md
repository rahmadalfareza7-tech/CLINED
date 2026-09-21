# Audit bank soal CLINED

Dibuat dari pemeriksaan otomatis + tinjauan oleh AI. **Ini bukan verifikasi ahli.** Tidak ada soal yang dicocokkan
langsung dengan textbook atau jurnal. Soal yang tercantum di bagian "Perlu ditinjau" harus dicek oleh dokter/dosen sebelum
dianggap benar.

## Sudah diperbaiki di paket ini
| Bank | Masalah | Tindakan |
|---|---|---|
| `muskulo-2019` | Semua 100 kunci jawaban tersimpan 1-based (nilai 1–5, tidak ada 0), aplikasi membaca 0-based, jadi kunci bergeser satu opsi. 83/100 terkonfirmasi lewat kecocokan teks pembahasan. | Semua kunci dikurangi 1. |
| `ginjal-2021` | 59 dari 100 soal adalah template palsu ("Opsi kriteria diagnostik utama A untuk kasus 57"). | Dipindah ke `seed-data/quarantine/ginjal-2021-placeholder.json`. Sisa 41 soal asli. **Perlu soal asli untuk mengisi kembali.** |
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
