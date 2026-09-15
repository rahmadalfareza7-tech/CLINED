import { handleRequest } from '../lib/app.mjs';

// WAJIB: body() di lib/app.mjs baca req sebagai raw stream sendiri.
// Kalau bodyParser Vercel dibiarkan aktif, stream-nya sudah "dihabiskan" duluan.
export const config = { api: { bodyParser: false } };

export default handleRequest;
