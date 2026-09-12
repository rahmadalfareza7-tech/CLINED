import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(new URL('..',import.meta.url).pathname,'banks');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
let failed=false;
for(const b of manifest.banks||[]){
  const file=path.resolve(root,b.dataUrl.replace('./banks/',''));
  let data;
  try{data=JSON.parse(fs.readFileSync(file,'utf8'));}catch(e){console.error(`✗ ${b.id}: ${e.message}`);failed=true;continue;}
  const ids=new Set();
  for(let i=0;i<data.length;i++){
    const q=data[i];
    const errors=[];
    if(!q?.id)errors.push('id');
    if(!q?.soal)errors.push('soal');
    if(!Array.isArray(q?.opsi)||q.opsi.length<2)errors.push('opsi');
    if(q?.jawabanBenar!==null && (!Number.isInteger(q?.jawabanBenar)||q.jawabanBenar<0||q.jawabanBenar>=q.opsi.length))errors.push('jawabanBenar');
    if(ids.has(q?.id))errors.push('duplicate-id');
    ids.add(q?.id);
    if(errors.length){console.error(`✗ ${b.id} #${i+1}: ${errors.join(', ')}`);failed=true;}
  }
  console.log(`${failed?'':'✓'} ${b.id}: ${data.length} soal, ${ids.size} ID unik, v${b.version}`);
}
if(failed)process.exit(1);
