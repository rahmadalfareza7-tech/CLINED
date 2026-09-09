# Aturan visibilitas konten

| Modul | Pembuat | Ruang lingkup | Siapa yang dapat melihatnya |
| --- | --- | --- | --- |
| UAB | Admin | Publik | Semua pengguna yang sudah login |
| UPI | Admin | Publik | Semua pengguna yang sudah login |
| UPI | User | Privat/lokal | Hanya pemilik atau perangkat pengguna; **tidak masuk katalog publik** |

Tidak ada jalur untuk membuat UAB oleh user biasa. Database menolak UAB privat dan UPI privat tanpa pemilik. Endpoint server harus menurunkan scope berdasarkan role sesi—bukan berdasarkan nilai role/visibility yang dikirim browser.

## Format paket soal UAB

```json
{
  "title": "UAB SSP Semester 1",
  "block": "SSP",
  "questions": [{
    "id": "uab-ssp-001",
    "soal": "Pertanyaan...",
    "opsi": ["A", "B", "C", "D"],
    "jawabanBenar": 0,
    "pembahasan": "Penjelasan klinis..."
  }]
}
```

Setiap `id` harus unik dalam paket; `opsi` minimal dua; `jawabanBenar` harus berupa indeks opsi yang valid. UPI yang dibuat pengguna biasa bersifat privat dan tidak dapat dipublikasikan melalui API. Semua paket publik UAB/UPI wajib dibuat oleh session dengan role `admin`; server mengabaikan nilai visibility dari browser.
