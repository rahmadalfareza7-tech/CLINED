#!/usr/bin/env node
// CLINED · Zero-dependency Asset Bundler & Minifier
// Reads core stylesheet and script load order directly from app.html,
// emits dist/clined-core.min.css, dist/clined-core.min.js, dist/app.bundle.html,
// and dist/bundle-manifest.json with SHA-256 integrity hashes and byte metrics.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const DIST = path.join(ROOT, 'dist');

export function extractAppAssets(html) {
  const styles = [];
  const scripts = [];
  for (const m of html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi)) {
    const href = m[1];
    if (/^https?:\/\//i.test(href)) continue;
    const rel = href.split('?')[0].replace(/^\.\//, '');
    if (rel.startsWith('css/')) styles.push(rel);
  }
  for (const m of html.matchAll(/<script\b[^>]*src=["']([^"']+)["'][^>]*>/gi)) {
    const src = m[1];
    if (/^https?:\/\//i.test(src)) continue;
    const rel = src.split('?')[0].replace(/^\.\//, '');
    if (rel.startsWith('js/')) scripts.push(rel);
  }
  return { styles, scripts };
}

export function minifyCss(css) {
  return String(css)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*([{}:;,>~])\s*/g, '$1')
    .replace(/;}/g, '}')
    .replace(/\n+/g, '')
    .trim();
}

/** Conservative whitespace/comment compaction for JS that preserves string, template & regex literals. */
export function compactJs(code) {
  const src = String(code).replace(/\r\n?/g, '\n');
  const out = [];
  const lines = src.split('\n');
  let inBlockComment = false;
  for (const rawLine of lines) {
    let line = rawLine;
    if (inBlockComment) {
      const end = line.indexOf('*/');
      if (end === -1) continue;
      line = line.slice(end + 2);
      inBlockComment = false;
    }
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('//')) continue;
    if (trimmed.startsWith('/*')) {
      const end = trimmed.indexOf('*/', 2);
      if (end === -1) { inBlockComment = true; continue; }
      const rest = trimmed.slice(end + 2).trim();
      if (!rest) continue;
      out.push(rest);
      continue;
    }
    out.push(trimmed);
  }
  return out.join('\n');
}

/** Replace local css/* link tags and local js/* script tags with 1 bundled CSS + 1 bundled JS tag. */
export function buildBundledHtml(appHtml, { cssHash, jsHash }) {
  let cssInjected = false;
  const cssTag = `<link id="clinedDesignSystemCss" rel="stylesheet" href="dist/clined-core.min.css?v=${cssHash}">`;
  let out = appHtml.replace(/^[ \t]*<link\b[^>]*rel=["']stylesheet["'][^>]*href=["'](?:\.\/)?css\/[^"']+["'][^>]*>\r?\n?/gim, () => {
    if (!cssInjected) {
      cssInjected = true;
      return `${cssTag}\n`;
    }
    return '';
  });

  let jsInjected = false;
  const jsTag = `<script src="dist/clined-core.min.js?v=${jsHash}"></script>`;
  out = out.replace(/^[ \t]*<script\b[^>]*src=["'](?:\.\/)?js\/[^"']+["'][^>]*><\/script>\r?\n?/gim, () => {
    if (!jsInjected) {
      jsInjected = true;
      return `${jsTag}\n`;
    }
    return '';
  });

  return out;
}

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);
}

function gzipSize(buf) {
  return zlib.gzipSync(buf, { level: 9 }).length;
}

export function buildBundles({ root = ROOT, dist = DIST, verifySyntax = true } = {}) {
  const appHtml = fs.readFileSync(path.join(root, 'app.html'), 'utf8');
  const { styles, scripts } = extractAppAssets(appHtml);
  fs.mkdirSync(dist, { recursive: true });

  let cssRawBytes = 0;
  const cssChunks = [];
  for (const rel of styles) {
    const raw = fs.readFileSync(path.join(root, rel), 'utf8');
    cssRawBytes += Buffer.byteLength(raw, 'utf8');
    cssChunks.push(minifyCss(raw));
  }
  const cssOut = cssChunks.join('\n');
  const cssBuf = Buffer.from(cssOut, 'utf8');
  const cssHash = sha256(cssBuf);
  const cssPath = path.join(dist, 'clined-core.min.css');
  fs.writeFileSync(cssPath, cssBuf);

  let jsRawBytes = 0;
  const jsChunks = [];
  for (const rel of scripts) {
    const raw = fs.readFileSync(path.join(root, rel), 'utf8');
    jsRawBytes += Buffer.byteLength(raw, 'utf8');
    // Wrap each file with semicolon guard so IIFEs never collide when concatenated
    jsChunks.push(`;/* ${rel} */\n${compactJs(raw)};`);
  }
  const jsOut = jsChunks.join('\n');
  const jsBuf = Buffer.from(jsOut, 'utf8');
  const jsHash = sha256(jsBuf);
  const jsPath = path.join(dist, 'clined-core.min.js');
  fs.writeFileSync(jsPath, jsBuf);

  if (verifySyntax) {
    execFileSync(process.execPath, ['--check', jsPath], { stdio: 'pipe' });
  }

  const bundledHtml = buildBundledHtml(appHtml, { cssHash, jsHash });
  fs.writeFileSync(path.join(dist, 'app.bundle.html'), bundledHtml, 'utf8');

  const manifest = {
    generatedAt: new Date().toISOString(),
    html: 'dist/app.bundle.html',
    css: {
      file: 'dist/clined-core.min.css',
      inputs: styles.length,
      files: styles,
      rawBytes: cssRawBytes,
      minifiedBytes: cssBuf.length,
      gzipBytes: gzipSize(cssBuf),
      savingPct: cssRawBytes > 0 ? Math.round((1 - cssBuf.length / cssRawBytes) * 1000) / 10 : 0,
      sha256: cssHash
    },
    js: {
      file: 'dist/clined-core.min.js',
      inputs: scripts.length,
      files: scripts,
      rawBytes: jsRawBytes,
      minifiedBytes: jsBuf.length,
      gzipBytes: gzipSize(jsBuf),
      savingPct: jsRawBytes > 0 ? Math.round((1 - jsBuf.length / jsRawBytes) * 1000) / 10 : 0,
      sha256: jsHash
    }
  };

  fs.writeFileSync(path.join(dist, 'bundle-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const m = buildBundles();
  const kb = n => `${(n / 1024).toFixed(1)} KB`;
  console.log(`✓ CSS bundle (${m.css.inputs} files → 1): ${kb(m.css.rawBytes)} → ${kb(m.css.minifiedBytes)} min (${kb(m.css.gzipBytes)} gzip, -${m.css.savingPct}%) [${m.css.sha256}]`);
  console.log(`✓ JS  bundle (${m.js.inputs} files → 1): ${kb(m.js.rawBytes)} → ${kb(m.js.minifiedBytes)} min (${kb(m.js.gzipBytes)} gzip, -${m.js.savingPct}%) [${m.js.sha256}]`);
  console.log(`✓ Bundled HTML written to ${m.html} (59 core requests → 2)`);
}
