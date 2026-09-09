/* Penyimpanan foto LOKAL per-device (IndexedDB) — dipakai sebagai cache utama
 * supaya server/DB (kuota gratisan, kecil) gak numpuk data biner tiap user upload.
 * Trade-off yang perlu kamu tahu:
 *  - Foto ini HANYA ada di device itu. Ganti device / clear browser data / uninstall
 *    PWA = foto hilang (gak ada salinan di server by default).
 *  - Kalau mau foto tetap ada lintas device, panggil syncPhotoToServer(id) manual
 *    (pakai endpoint /api/photos yang sudah ada) — opt-in, bukan default.
 */
const DB_NAME = 'clined-photos', STORE = 'photos', DB_VERSION = 1;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'id' }); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Simpan foto (dataUrl base64 jpeg/png) ke device ini. @returns {Promise<string>} id lokal */
async function savePhotoLocal(dataUrl, meta = {}) {
  const db = await openDb();
  const id = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const record = { id, dataUrl, byteSize: Math.ceil((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75), createdAt: Date.now(), synced: false, ...meta, id };
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(record);
    tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
  });
  db.close();
  return id;
}

/** Ambil satu foto lokal. @returns {Promise<object|null>} */
async function getPhotoLocal(id) {
  const db = await openDb();
  const record = await new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return record;
}

/** List semua foto lokal (tanpa dataUrl penuh, buat thumbnail grid ringan). */
async function listPhotosLocal() {
  const db = await openDb();
  const all = await new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

async function deletePhotoLocal(id) {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
  });
  db.close();
}

/** Total ukuran cache lokal (buat ditampilkan ke user + kasih opsi bersihkan). */
async function localPhotoCacheSize() {
  const all = await listPhotosLocal();
  return all.reduce((sum, p) => sum + (p.byteSize || 0), 0);
}

/** Opt-in: backup satu foto lokal ke server (pakai /api/photos yang sudah ada). */
async function syncPhotoToServer(id) {
  const record = await getPhotoLocal(id);
  if (!record) throw new Error('Foto lokal tidak ditemukan.');
  const res = await fetch('/api/photos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ dataUrl: record.dataUrl }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Gagal sinkron foto ke server.');
  const db = await openDb();
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).put({ ...record, synced: true, serverId: data.id });
  await new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
  db.close();
  return data;
}

window.savePhotoLocal = savePhotoLocal;
window.getPhotoLocal = getPhotoLocal;
window.listPhotosLocal = listPhotosLocal;
window.deletePhotoLocal = deletePhotoLocal;
window.localPhotoCacheSize = localPhotoCacheSize;
window.syncPhotoToServer = syncPhotoToServer;
