// Entrypoint untuk self-host/Render/Docker (proses Node persisten). TIDAK dipakai
// oleh Vercel (lihat api/[...path].mjs) — Vercel jalanin serverless function, bukan
// server yang nyala terus, jadi createServer(...).listen(...) di sini diabaikan di sana.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { handleRequest } from './lib/app.mjs';

const root = resolve(process.env.PUBLIC_DIR || '.'), port = Number(process.env.PORT || 3000), host = process.env.HOST || '0.0.0.0';
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webmanifest':'application/manifest+json'};
const privateFiles = new Set(['server.mjs','package.json','package-lock.json','dockerfile','readme.md','.env','.env.example']);

async function staticFile(req,res){
  if(!['GET','HEAD'].includes(req.method))return res.writeHead(405).end();
  const wanted=decodeURIComponent(new URL(req.url,`http://${req.headers.host||'localhost'}`).pathname),rel=wanted==='/'?'index.html':wanted.replace(/^\/+/, '');
  if(rel.includes('..')||rel.startsWith('.')||privateFiles.has(rel.toLowerCase())||rel.startsWith('data/')||rel.startsWith('lib/')||rel.startsWith('api/')||rel.endsWith('.bak'))return res.writeHead(404).end();
  const file=resolve(root,rel);
  if(!file.startsWith(root+sep))return res.writeHead(404).end();
  try{const content=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':extname(file)==='.html'?'no-cache':'public, max-age=3600'});res.end(req.method==='GET'?content:undefined);}
  catch{res.writeHead(404).end();}
}

createServer(async(req,res)=>{
  if(new URL(req.url,'http://x').pathname.startsWith('/api/'))return handleRequest(req,res);
  return staticFile(req,res);
}).listen(port,host,()=>console.log(`CLINED Online berjalan di ${host}:${port}`));
