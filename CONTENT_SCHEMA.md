# Aturan visibilitas konten

| Modul | Pembuat | Ruang lingkup | Siapa yang dapat melihatnya |
| --- | --- | --- | --- |
| UAB | Admin | Publik | Semua pengguna yang sudah login |
| UPI | Admin | Publik | Semua pengguna yang sudah login |
| UPI | User | Privat | Hanya pemilik `owner_user_id` |

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

Setiap `id` harus unik dalam paket; `opsi` minimal dua; `jawabanBenar` harus berupa indeks opsi yang valid. UPI memakai struktur flashcard/package yang sama, namun hasil import user selalu diberi `owner_user_id` dari session server.
