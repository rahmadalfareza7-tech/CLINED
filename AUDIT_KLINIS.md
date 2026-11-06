# Audit klinis bank soal CLINED (v78)

**Penting:** ini tinjauan AI, bukan verifikasi dokter/dosen. Tidak ada soal yang dicocokkan dengan buku teks atau jurnal.
Semua temuan di bawah harus dikonfirmasi oleh dosen/dokter sebelum kunci diubah. Kunci jawaban di data **tidak diubah** pada paket ini.

## Cakupan
| Pemeriksaan | Soal | Hasil |
|---|---|---|
| Struktur (kunci valid, opsi kosong/kembar, pembahasan ada) | 2.199 soal / 23 bank | Tidak ada kunci di luar rentang; 2 soal opsi kembar; 1 pembahasan placeholder |
| Konsistensi kunci vs pembahasan per opsi (otomatis) | 2.199 | 52 + 79 soal terindikasi (kebanyakan soal "KECUALI/BUKAN", bukan salah) |
| Tinjauan klinis manual atas soal terindikasi | ± 190 | Lihat daftar di bawah |
| Sampel acak soal medis yang tidak terindikasi | 60 dari 1.183 | 1 kunci salah, 1 salah ketik data, 3 catatan ambiguitas |
| **Tidak diperiksa** | Latihan Materi (paket di server, tidak ada di zip), soal berbasis gambar, ± 1.120 soal medis tak terindikasi yang tidak masuk sampel | — |

Dari sampel acak, perkiraan kasar: ± 2–3% soal medis yang tidak terindikasi masih punya masalah (rentang ketidakpastian lebar, kira-kira 0,5–11%).

## A. Kunci kemungkinan salah / soal rusak — perlu diperbaiki
1. **ginjal-2019 #58** (glandula bulbourethralis) — kunci D "homolog dengan glandula paraurethralis" **salah**. Pembahasan sendiri menulis homolog dengan Bartholin (Skene homolog dengan prostat). Opsi yang paling tepat: **E** (di sekeliling urethra pars membranacea). Keyakinan: tinggi.
2. **ginjal-2018 #40** (kateter tidak mengeluarkan urin) — kunci D "melipat di vesica urinaria" **bertentangan** dengan ginjal-2022 #66 dan #23 yang menjawab fossa intrabulbaris / pars membranacea. Kemungkinan kunci seharusnya **A** (fossa intrabulbaris). Keyakinan: sedang-tinggi.
3. **ginjal-2018 #51** (siprofloksasin, pernyataan SALAH) — opsi B "lebih aktif pada pH asam" memang salah, tetapi opsi C "generasi pertama fluorokuinolon yang paling poten" **juga salah** (siprofloksasin generasi kedua). Dua jawaban benar; revisi opsi C.
4. **ginjal-2023 #63** — nilai lab tidak masuk akal: "ureum 1,5 mg/dL, kreatinin 20 mg/dL" (kemungkinan tertukar). Kunci USG tetap benar.
5. **kedkom-2021 #73** — pembahasan hanya "Pilihan D diacak." (sisa editing). Kunci "obat selama 40 hari" masuk akal.
6. **ginjal-2018 #12** — opsi A dan E identik. Kunci C (Ekskresi = Filtrasi − Reabsorpsi + Sekresi) benar.
7. **kedkel-2021 #46** — opsi C dan E identik dan soal bergantung pada gambar forest plot yang tidak bisa diverifikasi.

## B. Ambigu / perlu dicek dosen
- **muskulo-2019 #53** (fraktur terbuka): kunci "Anti tetanus serum"; praktik sekarang TIG manusia + toksoid sesuai status imunisasi. Soal tidak memuat status imunisasi sehingga "Toksoid tetanus" (E) juga bisa benar.
- **muskulo-2022 #35** (rakitis, KECUALI): kunci "dwarfisme"; gangguan pertumbuhan/perawakan pendek lazim pada rakitis. Kunci hanya tepat jika yang dimaksud tanda "klasik" (Harrison, rosary, craniotabes, pectus carinatum).
- **kedkel-2021 #19** (metode Bouchard): kunci menyatakan pencatatan 3 hari harus berurutan. Banyak sumber menyebut 2 hari kerja + 1 hari libur tanpa mewajibkan berurutan. Cek ke materi dosen.
- **kedkel-2021 #31** (manfaat asuransi): opsi D "uang ketika sakit" juga benar pada asuransi swasta.
- **ginjal-2020 #20** (sampel urin anak 5 th): kunci aspirasi suprapubik sesuai bunyi "gold standard steril", tetapi praktik pada anak 5 th yang sudah toilet training adalah urin pancar tengah.
- **ginjal-2018 #25** (nyeri pinggang wanita usia subur): kunci BNO; banyak pedoman memilih USG lebih dahulu.
- **ginjal-2023 #88** (dipstick darah +, sedimen tanpa eritrosit): "urin lama" (lisis eritrosit) dan mioglobinuria juga penyebab sah.
- **kedkel-2020 #2, #69** dan **kedkom-2018 #55**: rumusan soal kabur sehingga kunci sulit dipertanggungjawabkan.
- **Negasi ganda / "bukan salah satu di atas"**: kedkel-2018 #14, kedkel-2022 #31.
- **Soal kembar antar tahun dengan kunci berbeda**: lihat daftar di `AUDIT_SOAL.md`.

## C. Ditinjau dan dinilai sesuai
Semua soal "KECUALI/BUKAN" lain yang terindikasi otomatis (± 40, termasuk rotator cuff, 4 Terlalu, imunisasi dasar, IMD, DOEN, POR, skrining) kuncinya konsisten. Soal ginjal/kateter 2022 #23 dan #66, preeklamsia (nifedipin), GNAPS, sindrom nefrotik, hiperparatiroid, Addison, HHD, dan sampel anatomi muskuloskeletal sesuai.

## Rekomendasi
1. Minta dosen mengonfirmasi bagian A dan B, lalu ubah di `seed-data/banks/*.json` dan jalankan `npm run db:seed`.
2. Aktifkan tombol "🚩 Laporkan soal" (sudah ada di kuis UAB sejak v78) agar mahasiswa membantu menemukan sisanya.
