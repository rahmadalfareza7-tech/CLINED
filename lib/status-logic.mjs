// Validasi status (murni, mudah diuji).
export const MOODS = ['mantap', 'lumayan', 'berat', 'semangat', 'doa'];
export const REACTIONS = ['🔥', '👏', '💪', '😂', '❤️'];
export const MAX_MESSAGE = 240;
export const DAILY_LIMIT = 5;
export const MAX_COMMENT = 200;
export const COMMENT_DAILY_LIMIT = 40;

const stripControls = s => String(s ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, '');

export function cleanStatus(input = {}) {
  const message = stripControls(input.message).replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, MAX_MESSAGE);
  const examName = stripControls(input.examName).replace(/\s+/g, ' ').trim().slice(0, 60);
  const mood = MOODS.includes(input.mood) ? input.mood : 'semangat';
  const raw = Number(input.scorePct);
  const scorePct = input.scorePct != null && input.scorePct !== '' && Number.isFinite(raw) && raw >= 0 && raw <= 100 ? Math.round(raw) : null;
  if (!message && !examName && scorePct == null) return { error: 'Tulis sesuatu dulu ya.' };
  if (!message) return { error: 'Tulis pesan atau kesanmu dulu.' };
  return { value: { message, examName, mood, scorePct } };
}
export const cleanReaction = e => (e == null || e === '' ? null : REACTIONS.includes(e) ? e : undefined);

export function cleanComment(input = {}) {
  const message = stripControls(input.message).replace(/\r/g, '').replace(/\s*\n\s*/g, ' ').replace(/[ \t]{2,}/g, ' ').trim().slice(0, MAX_COMMENT);
  return message ? { value: { message } } : { error: 'Tulis komentarmu dulu.' };
}
