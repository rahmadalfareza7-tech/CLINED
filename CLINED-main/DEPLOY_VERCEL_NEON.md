# CLINED — Deployment GitHub → Neon → Vercel

## 1. GitHub
Upload the **contents of this folder** to the repository root. Do not nest the project inside another `CLINED_OFFLINE_RELEASE` folder.

Do not commit `.env` or real database credentials.

## 2. Neon
Create a PostgreSQL database and copy its connection string. Run migrations once against that database:

```bash
npm install
DATABASE_URL="postgresql://..." npm run db:migrate
DATABASE_URL="postgresql://..." npm run db:seed
```

Create the admin account by setting `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and `ADMIN_NAME` in Vercel. The API creates it automatically at the first `/api/*` request. `ADMIN_PASSWORD` must be at least 12 characters.

## 3. Vercel
Import the GitHub repository. Use:

- Root Directory: `./` (jika isi ZIP ini di-upload ke root repository)
- Framework Preset: Other
- Build Command: empty
- Output Directory: empty
- Node.js: 22.x (also pinned in `package.json` and `vercel.json`)

Set these Production Environment Variables:

- `DATABASE_URL` = Neon connection string
- `DATABASE_SSL=true`
- `NODE_ENV=production`
- `AUTH_COOKIE_SECURE=true`
- `ADMIN_USERNAME` = desired admin username
- `ADMIN_PASSWORD` = strong password
- `ADMIN_NAME` = Administrator CLINED

Optional:

- `DATABASE_POOL_SIZE=5`
- `MAX_PHOTO_BYTES=2097152`
- `FRONTEND_ORIGIN` can remain empty for same-origin Vercel deployment.
- `ADMIN_RESET_PASSWORD=true` only while intentionally resetting an existing admin password; change it back to `false` after the reset.

## 4. Verify
After deploy, open:

`/api/health`

Expected when database and migrations are ready:

```json
{"ok":true,"database":true,"schema":"ready","admin":{"configured":true,"username":"admin","resetPending":false}}
```

If the response is not `ok: true`, verify that the Vercel `DATABASE_URL` points to the Neon project you migrated. The health endpoint runs the same migration/bootstrap path as login, so its error message can be used to diagnose the deployment before users try to sign in.

## 5. Account isolation
Each authenticated user has a separate `learning_states` row keyed by `user_id`, and quiz attempts/photos are also keyed to the authenticated user. The browser clears the previous account's learning cache before loading another account's server state.


## Admin & global bank soal
Set Vercel Production variables `ADMIN_USERNAME=admin`, `ADMIN_PASSWORD=<password minimal 12 karakter>`, dan `ADMIN_NAME=Administrator CLINED`, lalu redeploy. Setelah deployment pertama, server membuat akun admin tersebut otomatis. Jika password admin lama tidak bisa dipakai, isi ulang `ADMIN_PASSWORD` dengan password baru, set sementara `ADMIN_RESET_PASSWORD=true`, redeploy, lalu buka `/api/health` sekali. Setelah berhasil masuk, ubah `ADMIN_RESET_PASSWORD=false` dan redeploy lagi agar password yang diganti dari halaman Account tidak tertimpa pada cold start berikutnya. Admin dapat memperbarui bank soal global dari halaman Account; perubahan disimpan di Neon dan diambil pengguna saat memuat ulang.
