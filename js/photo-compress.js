/* Kompresi foto di sisi CLIENT (Canvas) sebelum upload.
 * Kenapa client, bukan server: server PaaS gratisan cuma ~512MB RAM untuk
 * ±150 user bersamaan. Library kompresi server (sharp/imagemagick) makan
 * puluhan MB RAM + memperlambat cold start. Browser sudah "gratis" untuk ini.
 * Server tetap validasi ulang (magic-byte + hard cap 2MB) — jangan percaya client 100%.
 */
const PHOTO_MAX_DIMENSION = 1600; // px, sisi terpanjang
const PHOTO_MAX_BYTES = 2 * 1024 * 1024; // harus SAMA dengan MAX_PHOTO_BYTES di server
const PHOTO_ALLOWED = ['image/png', 'image/jpeg'];

/** @param {File} file @returns {Promise<string>} data URL (image/jpeg) siap kirim ke /api/photos */
async function compressPhoto(file) {
  if (!PHOTO_ALLOWED.includes(file.type)) {
    throw new Error('Hanya file PNG atau JPG/JPEG yang diizinkan.');
  }
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error('File gambar tidak bisa dibaca. Coba file lain.');
  });
  const scale = Math.min(1, PHOTO_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  // Turunkan kualitas JPEG bertahap sampai di bawah batas ukuran, tetap jernih.
  let quality = 0.85, dataUrl = canvas.toDataURL('image/jpeg', quality);
  while (approxBytes(dataUrl) > PHOTO_MAX_BYTES && quality > 0.4) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }
  if (approxBytes(dataUrl) > PHOTO_MAX_BYTES) {
    throw new Error('Foto masih terlalu besar walau sudah dikompres. Gunakan foto lain.');
  }
  return dataUrl;
}

function approxBytes(dataUrl) {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  return Math.ceil(base64.length * 0.75);
}

/** Kompres lalu simpan ke DEVICE INI (IndexedDB) — default, gak nyentuh server sama sekali.
 * @returns {Promise<{id:string,byteSize:number}>} */
async function uploadPhoto(file) {
  const dataUrl = await compressPhoto(file);
  const id = await window.savePhotoLocal(dataUrl, { mimeType: 'image/jpeg' });
  const record = await window.getPhotoLocal(id);
  return { id, byteSize: record.byteSize };
}

/** Varian opt-in: kompres lalu langsung upload ke server (dipakai kalau memang perlu backup lintas device). */
async function uploadPhotoToServer(file) {
  const dataUrl = await compressPhoto(file);
  const res = await fetch('/api/photos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ dataUrl }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Gagal mengunggah foto.');
  return data;
}

window.compressPhoto = compressPhoto;
window.uploadPhoto = uploadPhoto;
window.uploadPhotoToServer = uploadPhotoToServer;
