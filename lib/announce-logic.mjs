// Validasi gaya pengumuman floating (aman: whitelist, tanpa HTML, tautan hanya https:// atau path internal).
export const THEMES = ['biru', 'hijau', 'oranye', 'merah', 'ungu', 'gelap', 'kustom'];
export const POSITIONS = ['top', 'bottom'];
export const SIZES = ['compact', 'normal'];
export const REPEATS = ['once', 'always'];
export const AUTOHIDE = [0, 5, 8, 12, 20, 30];
const HEX = /^#[0-9a-fA-F]{6}$/;

export function cleanLink(url) {
  const u = String(url ?? '').trim();
  if (!u) return '';
  if (u.length > 300) return null;
  if (/^https:\/\/[^\s]+$/i.test(u) || /^\/(?!\/)[^\s]*$/.test(u) || /^#[\w-]+$/.test(u)) return u;
  return null;
}

export function cleanStyle(input) {
  const s = input && typeof input === 'object' ? input : {};
  const out = {};
  const icon = [...String(s.icon ?? '📣').trim()].slice(0, 2).join('');
  out.icon = /[<>&"']/.test(icon) ? '📣' : icon;
  out.theme = THEMES.includes(s.theme) ? s.theme : 'biru';
  if (out.theme === 'kustom') {
    for (const k of ['bg', 'fg', 'accent']) {
      if (!HEX.test(String(s[k] ?? ''))) return { error: 'Warna kustom harus berupa hex 6 digit, mis. #1cb0f6.' };
      out[k] = String(s[k]).toLowerCase();
    }
  }
  out.position = POSITIONS.includes(s.position) ? s.position : 'top';
  out.size = SIZES.includes(s.size) ? s.size : 'normal';
  out.repeat = REPEATS.includes(s.repeat) ? s.repeat : 'once';
  out.dismissible = s.dismissible !== false;
  const auto = Number(s.autoHide);
  out.autoHide = AUTOHIDE.includes(auto) ? auto : 0;
  const label = String(s.buttonLabel ?? '').trim().slice(0, 24);
  const link = cleanLink(s.buttonUrl);
  if (link === null) return { error: 'Tautan tombol harus diawali https:// atau / (halaman dalam aplikasi).' };
  if (label && link) { out.buttonLabel = label; out.buttonUrl = link; }
  else if (label || link) return { error: 'Tombol butuh label dan tautan sekaligus.' };
  return { value: out };
}

// Status tayang untuk daftar admin.
export function stateOf(a, now = Date.now()) {
  const t = v => (v ? new Date(v).getTime() : 0);
  if (!a.published) return 'draft';
  if (a.expires_at && t(a.expires_at) <= now) return 'expired';
  if (a.starts_at && t(a.starts_at) > now) return 'scheduled';
  return 'live';
}
