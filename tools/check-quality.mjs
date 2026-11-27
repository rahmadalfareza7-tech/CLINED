#!/usr/bin/env node
// CLINED · Automated Quality Gate (syntax, CSS brace/Safari integrity, strict CSP, online-only claims, SW parity)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const args = new Set(process.argv.slice(2));
const runAll = args.size === 0 || args.has('--all');

let failures = 0;
function fail(msg) {
  console.error(`✗ ${msg}`);
  failures++;
}
function ok(msg) {
  console.log(`✓ ${msg}`);
}

function walkFiles(dir, exts, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name === '.git' || ent.name === 'dist') continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walkFiles(full, exts, out);
    else if (exts.some(e => ent.name.endsWith(e))) out.push(full);
  }
  return out;
}

if (runAll || args.has('--syntax')) {
  const jsFiles = [
    ...walkFiles(path.join(ROOT, 'js'), ['.js', '.mjs']),
    ...walkFiles(path.join(ROOT, 'lib'), ['.js', '.mjs']),
    ...walkFiles(path.join(ROOT, 'api'), ['.js', '.mjs']),
    ...walkFiles(path.join(ROOT, 'tools'), ['.js', '.mjs']),
    ...walkFiles(path.join(ROOT, 'tests'), ['.js', '.mjs']),
    path.join(ROOT, 'sw.js'),
    path.join(ROOT, 'local-server.mjs')
  ].filter(f => fs.existsSync(f));

  for (const file of jsFiles) {
    try {
      execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
    } catch (err) {
      fail(`Syntax error in ${path.relative(ROOT, file)}: ${err.stderr?.toString() || err.message}`);
    }
  }
  ok(`JS/MJS syntax check passed (${jsFiles.length} files)`);
}

if (runAll || args.has('--css')) {
  const cssFiles = walkFiles(path.join(ROOT, 'css'), ['.css']);
  let totalImportant = 0;
  for (const file of cssFiles) {
    const raw = fs.readFileSync(file, 'utf8');
    const clean = raw.replace(/\/\*[\s\S]*?\*\//g, '');
    let depth = 0;
    let unbalanced = false;
    for (const ch of clean) {
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      if (depth < 0) { unbalanced = true; break; }
    }
    if (unbalanced || depth !== 0) {
      fail(`Unbalanced braces in ${path.relative(ROOT, file)} (depth=${depth})`);
    }
    const imp = (clean.match(/!important/g) || []).length;
    totalImportant += imp;
  }
  ok(`CSS brace-balance check passed (${cssFiles.length} files, ${totalImportant} !important declarations tracked)`);
}

if (runAll || args.has('--csp')) {
  for (const htmlName of ['app.html', 'index.html']) {
    const html = fs.readFileSync(path.join(ROOT, htmlName), 'utf8');
    const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>/gi)];
    if (inlineScripts.length > 0) {
      fail(`${htmlName} contains ${inlineScripts.length} inline <script> tag(s) (violates strict CSP script-src 'self')`);
    }
    const inlineStyles = [...html.matchAll(/<style\b[^>]*>/gi)];
    if (inlineStyles.length > 0) {
      fail(`${htmlName} contains ${inlineStyles.length} inline <style> tag(s)`);
    }
    const inlineHandlers = [...html.matchAll(/\son(?:click|change|input|submit|keydown|keyup|load|error)\s*=/gi)];
    if (inlineHandlers.length > 0) {
      fail(`${htmlName} contains ${inlineHandlers.length} inline on*= event handler(s)`);
    }
  }

  const httpMjs = fs.readFileSync(path.join(ROOT, 'lib/http.mjs'), 'utf8');
  const vercelJson = fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8');
  if (!/script-src 'self'/.test(httpMjs) || /script-src[^;]*'unsafe-inline'/.test(httpMjs)) {
    fail("lib/http.mjs CSP must enforce strict script-src 'self' without 'unsafe-inline'");
  }
  if (!/script-src 'self'/.test(vercelJson) || /script-src[^;]*'unsafe-inline'/.test(vercelJson)) {
    fail("vercel.json CSP must enforce strict script-src 'self' without 'unsafe-inline'");
  }

  // Online-only copy check
  const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  if (/bisa dipakai offline|tetap jalan saat offline|mode gelap dan offline|saat sinyal hilang/i.test(indexHtml)) {
    fail('index.html still advertises offline availability');
  }

  // SW_VERSION parity check
  const swJs = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  const updJs = fs.readFileSync(path.join(ROOT, 'js/update-notice.js'), 'utf8');
  const swVer = swJs.match(/const SW_VERSION = '([^']+)'/)?.[1];
  const appVer = updJs.match(/const APP_SW_VERSION = '([^']+)'/)?.[1];
  if (!swVer || !appVer || swVer !== appVer) {
    fail(`SW_VERSION (${swVer}) !== APP_SW_VERSION (${appVer})`);
  }

  ok(`Strict CSP, online-only copy, and SW parity (${swVer}) passed`);
}

if (failures > 0) {
  console.error(`\nQuality gate failed with ${failures} issue(s).`);
  process.exit(1);
}
console.log('\nAll CLINED quality checks passed.');
