// Logika murni chat: validasi pesan, urutan daftar pengguna, aturan siapa boleh chat siapa.
export const RETENTION_HOURS = 48;
export const MAX_LEN = 1000;
export const DAILY_LIMIT = 300;

export function cleanMessage(input) {
  const text = String(input ?? '').replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!text) return { error: 'Pesan tidak boleh kosong.' };
  if (text.length > MAX_LEN) return { error: `Pesan maksimal ${MAX_LEN} karakter.` };
  return { value: text };
}

// Role dasar (satu kolom) + penanda tempat bertanya (boolean terpisah) => bisa dobel, mis. helper + tempat bertanya.
export function badgesOf(u) {
  const b = [];
  if (u.role === 'admin' || u.role === 'developer') b.push('admin');
  if (u.role === 'helper') b.push('helper');
  if (u.is_mentor || u.isMentor) b.push('mentor');
  return b;
}
// Pengguna "terbuka": boleh dichat siapa saja tanpa berteman.
export const isOpen = u => badgesOf(u).length > 0;
export function tierOf(u) {
  const b = badgesOf(u);
  return b.includes('admin') ? 0 : b.includes('helper') ? 1 : b.includes('mentor') ? 2 : 3;
}
// Urutan: admin, helper, tempat bertanya, lalu teman, lalu lainnya; di dalam kelompok: online dulu, lalu nama.
export function compareUsers(a, b) {
  const ta = tierOf(a), tb = tierOf(b); if (ta !== tb) return ta - tb;
  const fa = a.friend === 'accepted' ? 0 : 1, fb = b.friend === 'accepted' ? 0 : 1; if (fa !== fb) return fa - fb;
  if (!!a.online !== !!b.online) return a.online ? -1 : 1;
  return String(a.name || '').localeCompare(String(b.name || ''), 'id');
}
export function canChat({ friend, blocked, aOpen, bOpen }) {
  if (blocked) return false;
  return friend === 'accepted' || !!aOpen || !!bOpen;
}
