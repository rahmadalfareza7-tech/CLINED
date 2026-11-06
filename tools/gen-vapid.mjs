// Buat kunci VAPID untuk notifikasi HP. Jalankan sekali: npm run push:keys
import { generateVapidKeys } from '../lib/webpush.mjs';
const k = generateVapidKeys();
console.log(`VAPID_PUBLIC_KEY=${k.publicKey}\nVAPID_PRIVATE_KEY=${k.privateKey}\nVAPID_SUBJECT=mailto:emailkamu@contoh.com`);
console.log('\nTempel 3 baris di atas ke .env server, lalu restart server. JANGAN bagikan VAPID_PRIVATE_KEY & jangan ganti setelah dipakai (langganan lama jadi tidak valid).');
