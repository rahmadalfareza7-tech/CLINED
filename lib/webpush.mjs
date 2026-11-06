// Web Push tanpa dependensi: enkripsi RFC 8291 (aes128gcm) + VAPID RFC 8292 (ES256), hanya node:crypto.
import crypto from 'node:crypto';

const b64u = b => Buffer.from(b).toString('base64url');
const unb64u = s => Buffer.from(String(s), 'base64url');

function hkdf(salt, ikm, info, len) {
  return Buffer.from(crypto.hkdfSync('sha256', ikm, salt, info, len));
}

/** Buat pasangan kunci VAPID baru: { publicKey, privateKey } (base64url). */
export function generateVapidKeys() {
  const ecdh = crypto.createECDH('prime256v1'); ecdh.generateKeys();
  return { publicKey: b64u(ecdh.getPublicKey()), privateKey: b64u(ecdh.getPrivateKey()) };
}

/** Enkripsi payload untuk satu langganan. `test` hanya dipakai untuk uji vektor RFC. */
export function encryptPayload(sub, payload, test = {}) {
  const uaPub = unb64u(sub.p256dh), auth = unb64u(sub.auth);
  if (uaPub.length !== 65 || uaPub[0] !== 4 || auth.length !== 16) throw new Error('Langganan push tidak valid.');
  const ecdh = crypto.createECDH('prime256v1');
  if (test.asPrivate) ecdh.setPrivateKey(unb64u(test.asPrivate)); else ecdh.generateKeys();
  const asPub = ecdh.getPublicKey();
  const secret = ecdh.computeSecret(uaPub);
  const salt = test.salt ? unb64u(test.salt) : crypto.randomBytes(16);
  const prk = hkdf(auth, secret, Buffer.concat([Buffer.from('WebPush: info\0'), uaPub, asPub]), 32);
  const cek = hkdf(salt, prk, Buffer.from('Content-Encoding: aes128gcm\0'), 16);
  const nonce = hkdf(salt, prk, Buffer.from('Content-Encoding: nonce\0'), 12);
  const data = Buffer.concat([Buffer.from(payload), Buffer.from([2])]);
  const c = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const enc = Buffer.concat([c.update(data), c.final(), c.getAuthTag()]);
  const rs = Buffer.alloc(4); rs.writeUInt32BE(4096);
  return Buffer.concat([salt, rs, Buffer.from([asPub.length]), asPub, enc]);
}

/** Header Authorization VAPID untuk endpoint tertentu. */
export function vapidHeader(endpoint, { publicKey, privateKey, subject }, now = Date.now()) {
  const aud = new URL(endpoint).origin;
  const head = b64u(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const claims = b64u(JSON.stringify({ aud, exp: Math.floor(now / 1000) + 12 * 3600, sub: subject }));
  const pub = unb64u(publicKey);
  const key = crypto.createPrivateKey({ format: 'jwk', key: { kty: 'EC', crv: 'P-256', d: b64u(unb64u(privateKey)), x: b64u(pub.subarray(1, 33)), y: b64u(pub.subarray(33, 65)) } });
  const sig = crypto.sign('sha256', Buffer.from(`${head}.${claims}`), { key, dsaEncoding: 'ieee-p1363' });
  return `vapid t=${head}.${claims}.${b64u(sig)}, k=${publicKey}`;
}

export function vapidFromEnv(env = process.env) {
  const publicKey = env.VAPID_PUBLIC_KEY, privateKey = env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject: env.VAPID_SUBJECT || 'mailto:admin@example.com' };
}

/** Kirim satu push. Mengembalikan { ok, gone, status }. gone=true -> langganan harus dihapus. */
export async function sendPush(sub, payloadObj, vapid, { ttl = 3600, urgency = 'high', fetchImpl = fetch } = {}) {
  const body = encryptPayload(sub, JSON.stringify(payloadObj));
  const r = await fetchImpl(sub.endpoint, {
    method: 'POST',
    headers: { Authorization: vapidHeader(sub.endpoint, vapid), 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: String(ttl), Urgency: urgency },
    body, signal: AbortSignal.timeout(8000)
  });
  return { ok: r.ok, gone: r.status === 404 || r.status === 410, status: r.status };
}
