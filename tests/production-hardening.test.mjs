import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { checkPersistentLimit } from '../lib/rate-limit.mjs';
import { sanitizeClientError } from '../lib/telemetry.mjs';

const ROOT = new URL('..', import.meta.url);
const readRel = p => fs.readFileSync(new URL(p, ROOT), 'utf8');

test('Online-only revision: zero offline availability claims & graceful online-only guard wired', () => {
  const indexHtml = readRel('index.html');
  const appHtml = readRel('app.html');
  const swJs = readRel('sw.js');
  const materiJs = readRel('js/latihan-materi.js');
  const guardJs = readRel('js/online-guard.js');

  assert.doesNotMatch(indexHtml, /bisa dipakai offline|tetap jalan saat offline|mode gelap dan offline|saat sinyal hilang/i);
  assert.doesNotMatch(appHtml, /OFFLINE SAFE/);
  assert.doesNotMatch(materiJs, /Mode offline/);

  assert.match(appHtml, /js\/online-guard\.js\?v=1/);
  assert.match(indexHtml, /js\/online-guard\.js\?v=1/);
  assert.match(guardJs, /CLINED membutuhkan koneksi online/);
  assert.match(swJs, /ONLINE_REQUIRED_HTML/);
  assert.match(swJs, /CLINED membutuhkan koneksi internet/);
  assert.doesNotMatch(swJs, /API_CACHEABLE/, 'sw.js must not serve stale cached API responses offline');
});

test('Strict CSP hardening: zero inline scripts/styles/handlers in HTML and script-src self without unsafe-inline', () => {
  for (const file of ['app.html', 'index.html', 'legal.html']) {
    const html = readRel(file);
    assert.equal([...html.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*type=["']application\/ld\+json["'])[^>]*>/gi)].length, 0, `${file} must have zero executable inline <script>`);
    assert.equal([...html.matchAll(/<style\b[^>]*>/gi)].length, 0, `${file} must have zero inline <style>`);
    assert.equal([...html.matchAll(/\son(?:click|change|input|submit|keydown|keyup|load|error)\s*=/gi)].length, 0, `${file} must have zero inline on*= handlers`);
  }

  const httpSrc = readRel('lib/http.mjs');
  const cspMatch = httpSrc.match(/export const CSP_HEADER = "([^"]+)"/);
  assert.ok(cspMatch?.[1], 'lib/http.mjs must export CSP_HEADER');
  const CSP_HEADER = cspMatch[1];
  assert.match(CSP_HEADER, /script-src 'self';/);
  assert.doesNotMatch(CSP_HEADER, /script-src[^;]*'unsafe-inline'/);
  assert.match(CSP_HEADER, /object-src 'none'/);
  assert.match(CSP_HEADER, /form-action 'self'/);

  const vercel = JSON.parse(readRel('vercel.json'));
  const cspRule = vercel.headers?.flatMap(h => h.headers || []).find(h => h.key === 'Content-Security-Policy');
  assert.ok(cspRule?.value, 'vercel.json must configure Content-Security-Policy');
  assert.match(cspRule.value, /script-src 'self';/);
  assert.doesNotMatch(cspRule.value, /script-src[^;]*'unsafe-inline'/);

  const appHtml = readRel('app.html');
  assert.match(appHtml, /js\/floating-nav\.js\?v=1/);
  assert.match(appHtml, /js\/error-monitor\.js\?v=1/);
});

test('Persistent PostgreSQL rate limiter increments atomically, blocks over limit, and degrades gracefully if DB fails', async () => {
  let count = 0;
  const mockPool = {
    async query(sql) {
      if (sql.includes('INSERT INTO rate_limit_buckets')) {
        count++;
        return { rows: [{ count, remaining_sec: 42 }] };
      }
      return { rows: [] };
    }
  };

  const r1 = await checkPersistentLimit(mockPool, 'ip:1.2.3.4:/api/auth/login', 2, 60_000);
  assert.deepEqual(r1, { allowed: true, count: 1, retryAfterSec: 42 });

  const r2 = await checkPersistentLimit(mockPool, 'ip:1.2.3.4:/api/auth/login', 2, 60_000);
  assert.deepEqual(r2, { allowed: true, count: 2, retryAfterSec: 42 });

  const r3 = await checkPersistentLimit(mockPool, 'ip:1.2.3.4:/api/auth/login', 2, 60_000);
  assert.deepEqual(r3, { allowed: false, count: 3, retryAfterSec: 42 });

  // Graceful null fallback when DB is unavailable
  const brokenPool = { async query() { throw new Error('db down'); } };
  const fallback = await checkPersistentLimit(brokenPool, 'ip:1.2.3.4:/api/auth/login', 2, 60_000);
  assert.equal(fallback, null);

  const authMjs = readRel('lib/auth.mjs');
  assert.match(authMjs, /limitStrict\(req, res, 10\)/);
});

test('Client error telemetry sanitizes secrets/tokens and rejects empty payloads', () => {
  assert.equal(sanitizeClientError(null), null);
  assert.equal(sanitizeClientError({ message: '   ' }), null);

  const clean = sanitizeClientError({
    kind: 'unhandledrejection',
    message: 'Failed with clined_session=abc-123 and Bearer secret.jwt.token password="myPassword123"',
    source: 'https://clined.id/js/app.js',
    line: 42.9,
    col: -5,
    stack: 'Error\n at clined_session=xyz-999',
    viewId: 'blokLysisPage',
    appVersion: 'v29-unified-design'
  }, 'Mozilla/5.0 iPhone Safari');

  assert.ok(clean);
  assert.equal(clean.kind, 'unhandledrejection');
  assert.doesNotMatch(clean.message, /abc-123|secret\.jwt\.token|myPassword123/);
  assert.match(clean.message, /\[redacted\]/);
  assert.doesNotMatch(clean.stack, /xyz-999/);
  assert.equal(clean.line, 42);
  assert.equal(clean.col, 0);

  const appMjs = readRel('lib/app.mjs');
  assert.match(appMjs, /\/api\/client-errors/);
  assert.match(appMjs, /\/api\/admin\/client-errors/);
  assert.match(readRel('db/migrations/050_ops_hardening.sql'), /CREATE TABLE IF NOT EXISTS client_error_logs/);
  assert.match(readRel('db/migrations/050_ops_hardening.sql'), /CREATE TABLE IF NOT EXISTS rate_limit_buckets/);
});

test('CI workflow, PWA manifest maskable icon, and OpenGraph metadata are configured', () => {
  const ciYml = readRel('.github/workflows/ci.yml');
  const deployYml = readRel('.github/workflows/deploy.yml');
  const manifest = JSON.parse(readRel('manifest.webmanifest'));

  assert.match(ciYml, /npm run check:all/);
  assert.match(ciYml, /npm run validate:banks/);
  assert.match(ciYml, /npm test/);
  assert.match(deployYml, /npm run check:all/);

  assert.ok(manifest.icons.some(ic => ic.purpose === 'maskable'), 'manifest.webmanifest must include a maskable icon');
  assert.match(readRel('index.html'), /property="og:title"/);
  assert.match(readRel('app.html'), /property="og:title"/);
});
