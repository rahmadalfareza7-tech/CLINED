// Entrypoint untuk self-host/Render/Docker (proses Node persisten). TIDAK dipakai
// oleh Vercel (lihat api/[...path].mjs) — Vercel jalanin serverless function, bukan
// server yang nyala terus, jadi createServer(...).listen(...) di sini diabaikan di sana.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { handleRequest } from './lib/app.mjs';
import { headers as securityHeaders } from './lib/http.mjs';

const root = resolve(process.env.PUBLIC_DIR || '.'), port = Number(process.env.PORT || 3000), host = process.env.HOST || '0.0.0.0';
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.woff':'font/woff','.webmanifest':'application/manifest+json'};
const privateFiles = new Set(['server.mjs','package.json','package-lock.json','dockerfile','readme.md','.env','.env.example']);

async function staticFile(req,res){
  if(!['GET','HEAD'].includes(req.method))return res.writeHead(405).end();
  const wanted=decodeURIComponent(new URL(req.url,`http://${req.headers.host||'localhost'}`).pathname);
  let rel=wanted==='/'?'index.html':wanted==='/app'?'app.html':wanted.replace(/^\/+/, '');
  if(rel.includes('..')||rel.startsWith('.')||privateFiles.has(rel.toLowerCase())||rel.startsWith('data/')||rel.startsWith('seed-data/')||rel.startsWith('banks/')||rel.startsWith('lib/')||rel.startsWith('api/')||rel.endsWith('.bak'))return res.writeHead(404).end();
  let file=resolve(root,rel);
  if(!file.startsWith(root+sep))return res.writeHead(404).end();
  const ext=extname(file).toLowerCase();
  const isVersionedDist=rel.startsWith('dist/') && ['.js','.css'].includes(ext);
  const noCache=!isVersionedDist && ['.html','.js','.mjs','.css','.webmanifest'].includes(ext);
  try{
    let content;
    if(rel==='app.html'){
      try{ content=await readFile(resolve(root,'dist/app.bundle.html')); }
      catch{ content=await readFile(file); }
    }else{
      content=await readFile(file);
    }
    securityHeaders(res);
    res.writeHead(200,{'Content-Type':mime[ext]||'application/octet-stream','Cache-Control':isVersionedDist?'public, max-age=31536000, immutable':noCache?'no-store, no-cache, must-revalidate':'public, max-age=3600'});
    res.end(req.method==='GET'?content:undefined);
  }
  catch{res.writeHead(404).end();}
}

createServer(async(req,res)=>{
  if(new URL(req.url,'http://x').pathname.startsWith('/api/'))return handleRequest(req,res);
  return staticFile(req,res);
}).listen(port,host,()=>console.log(`CLINED Online berjalan di ${host}:${port}`));
