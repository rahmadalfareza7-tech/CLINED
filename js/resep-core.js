/* CLINED: logika murni penilaian resep & Lembar Pengamatan BSO Cair (tanpa DOM). Dites di tests/resep-core.test.mjs. */
(() => {
'use strict';
/* ===== UTIL ===== */
const shuffle0=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const ROM=[[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];
const RV={I:1,V:5,X:10,L:50,C:100};
const n2r=n=>{let s='';for(const[v,r]of ROM)while(n>=v){s+=r;n-=v}return s};
const r2n=s=>{s=String(s||'').toUpperCase();if(!/^[IVXLC]+$/.test(s))return 0;let n=0;for(let i=0;i<s.length;i++){const v=RV[s[i]],w=RV[s[i+1]]||0;n+=v<w?-v:v}return n2r(n)===s?n:0};
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const lev=(a,b)=>{const m=a.length,n=b.length,d=Array.from({length:m+1},(_,i)=>[i]);for(let j=1;j<=n;j++)d[0][j]=j;for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return d[m][n]};
const WAKTU=new Set(['ac','pc','prn','nocte','mane','1/2h','sublingual']);
const UNIT=new Set(['tab','caps','tablet','kapsul','kaps','cap','sach','sachet','bungkus','bks','pulv','pulveres']);
function toks(s){return String(s||'').toLowerCase().replace(/½/g,'1/2').replace(/(\d),(\d)/g,'$1.$2').split(/[^a-z0-9./]+/).filter(Boolean).map(t=>{const n=r2n(t);return n?String(n):t.replace(/^\.+|\.+$/g,'')}).filter(Boolean)}
function parseS(str){
  const raw=String(str||'').toLowerCase()
    .replace(/1\s*\/\s*2\s*h/g,'1/2h')
    .replace(/\ba\.\s*c\b\.?/g,'ac')
    .replace(/\bp\.\s*c\b\.?/g,'pc')
    .replace(/\bp\.\s*r\.\s*n\b\.?/g,'prn')
    .replace(/\bd\.\s*d\b\.?/g,'dd')
    .replace(/\bi\.\s*m\.\s*m\b\.?/g,'imm')
    .replace(/\bu\.\s*c\b\.?/g,'uc')
    .replace(/\bu\.\s*e\b\.?/g,'ue')
    .replace(/\bo\.\s*d\.\s*s\b\.?/g,'ods')
    .replace(/\ba\.\s*d\.\s*s\b\.?/g,'ads')
    .replace(/\ba\.\s*s\b\.?/g,'as')
    .replace(/\ba\.\s*d\b\.?/g,'ad')
    .replace(/\bo\.\s*d\b\.?/g,'od')
    .replace(/\bo\.\s*s\b\.?/g,'os')
    .replace(/\bgtt\.?\s*ophth?\b\.?/g,'gtt opth')
    .replace(/\bgtt\.?\s*auric(?:ulares)?\b\.?/g,'gtt auris')
    .replace(/\b(puff|semprot|semprotan|hisap|hisapan)\b/g,'dose')
    .replace(/\b(sublingualis|sl)\b/g,'sublingual')
    .replace(/\bpagi\b/g,'mane')
    .replace(/\bmalam\b/g,'nocte');
  const m=raw.match(/(\d+)\s*dd/);
  const dd=m?+m[1]:null;
  const t=toks(raw.replace(/(\d+)\s*dd/,' ')).filter(x=>x!=='s');
  return{dd,q:new Set(t.filter(x=>!WAKTU.has(x)&&!UNIT.has(x))),w:new Set(t.filter(x=>WAKTU.has(x)))}
}
function parseJ(str){const s=String(str||'').toLowerCase().replace(/\bno\.?/,' ').trim();const last=s.split(/\s+/).pop(),n=r2n(last.toUpperCase())||(/^\d+$/.test(last)?+last:0);return{n,t:new Set(toks(s))}}
const nameOk=(u,spec)=>{const un=norm(u);if(!un)return false;return spec.n.some(x=>{const nx=norm(x);return un.includes(nx)||(nx.includes(un)&&un.length>=5)||lev(un,nx)<=Math.max(1,Math.floor(nx.length*.2))})};
const kuatN=s=>String(s||'').toLowerCase().replace(/\s+/g,'').replace(/(\d),(\d)/g,'$1.$2').replace(/^1000mg$/,'1g').replace(/^(\d+(?:\.\d+)?)gr(?:am)?$/,'$1g').replace(/µg|ug/g,'mcg');

/* ===== BACA BARIS R/ YANG DITULIS BEBAS ===== */
const FORM={tab:'tab',tablet:'tab',caps:'caps',cap:'caps',kaps:'caps',kapsul:'caps',capsul:'caps',syr:'syr',syrup:'syr',sirup:'syr',sir:'syr',susp:'susp',suspensi:'susp',drops:'drops',drop:'drops',tetes:'drops',inj:'inj',injeksi:'inj',sach:'sach',sachet:'sach',inhaler:'inhaler',gtt:'drops',sol:'sol',solutio:'sol',emuls:'emuls',emulsi:'emuls',lotio:'lotio',lotion:'lotio',enema:'enema',garg:'garg',gargle:'garg',turbuhaler:'inhaler',nebules:'sol'};
const FNAME={tab:'Tab.',caps:'Caps.',syr:'Syr.',susp:'Susp.',drops:'Drops',inj:'Inj.',sach:'Sach.',inhaler:'Inhaler',sol:'Sol.',emuls:'Emuls.',lotio:'Lotio',enema:'Enema',garg:'Garg.'};
function parseLine1(str){
  let s=String(str||'').replace(/½/g,'1/2').replace(/^\s*r\s*\/\s*/i,' ');
  let b='';
  s=s.replace(/(^|[^a-z])(tablet|tab|caps|cap|kapsul|kaps|capsul|syrup|syr|sirup|sir|suspensi|susp|drops|drop|tetes|injeksi|inj|sachet|sach|inhaler|turbuhaler|gtt)\b\.?/gi,(m,pre,w)=>{if(!b)b=FORM[w.toLowerCase()];return pre+' '});
  let k='';
  s=s.replace(/(\d+(?:[.,]\d+)?)\s*(mg|mcg|µg|ug|gr|gram|g|iu|%)(?![a-z])(?:\s*\/\s*(\d+(?:[.,]\d+)?)?\s*(ml|mg|g|dose|puff)(?![a-z]))?/i,(m,n,u,d,du)=>{const uNorm=u.toLowerCase().replace(/^gr(?:am)?$/,'g').replace(/^(?:µg|ug)$/,'mcg');k=n+(uNorm==='%'?'':' ')+uNorm+(du?'/'+(d?d+' ':'')+du.toLowerCase():'');return ' '});
  let j='';
  s=s.replace(/(^|[^a-z])(no|fl|flac|flakon|fls|vial|amp|ampul|tube|strip|botol|btl|kolf)\.?\s*([ivxlc]+|\d+)(?![a-z0-9])/i,(m,pre,w,n)=>{w=w.toLowerCase();const wn=(w==='flac'||w==='flakon'||w==='fls'||w==='botol'||w==='btl')?'fl':(w==='ampul'?'amp':w);j=wn==='no'?n.toUpperCase():wn+' '+n.toUpperCase();return pre+' '});
  if(!j){const m=s.match(/\s(\d+|[ivx]+)\s*$/i);if(m&&(/^\d+$/.test(m[1])||r2n(m[1]))){j=m[1].toUpperCase();s=s.slice(0,m.index)}}
  if(!b&&/^(vial|amp)\b/i.test(j))b='inj';
  const o=s.replace(/\b(ophth?|oculi|auris|auric(?:ulares)?|naris|nasi|nasales|mata|telinga|hidung)\b/gi,' ').replace(/[^\p{L}\p{N}\s-]/gu,' ').replace(/\s+/g,' ').trim();
  return{b,o,k,j};
}
const stripS=s=>String(s||'').replace(/^\s*(s|sig|signa)\s*[.:]?\s+/i,'');
const rowsFromLines=f=>f.rows.filter(r=>r.l1.trim()||r.l2.trim()).map(r=>({...parseLine1(r.l1),s:stripS(r.l2)}));

/* ===== PENILAIAN RESEP ===== */
function evalRow(key,u){
  const specs=[key.s,...(key.sAlt||[])].map(parseS),main=specs[0],us=parseS(u.s),res=[];
  let best=null;
  for(const sp of specs){
    const dd=sp.dd===us.dd,q=sp.q.size?[...sp.q].every(x=>us.q.has(x)):null,w=sp.w.size?[...sp.w].every(x=>us.w.has(x)):null;
    const sc=(dd?1:0)+(q?1:0)+(w?1:0)+(q===null?1:0)+(w===null?1:0);
    if(!best||sc>best.sc)best={dd,q,w,sc,sp};
  }
  const add=(ok,label,exp)=>res.push({ok,label,exp});
  const allowedB=[key.b,...(key.bAlt||[])];
  add(allowedB.includes(u.b),'bentuk sediaan',FNAME[key.b]||key.b);
  if(key.k){
    const allowedK=[key.k,...(key.kAlt||[])].map(kuatN);
    add(allowedK.includes(kuatN(u.k)),'kekuatan',key.k);
  }
  const j=parseJ(u.j);let jok,jnote='';
  if(typeof key.j==='number'){const dq=Number([...main.q].find(x=>/^\d+$/.test(x))||1),daily=(main.dd||1)*dq;
    jok=j.n===key.j||(key.jAlt||[]).includes(j.n)||(j.n>0&&j.n%daily===0);if(jok&&j.n!==key.j)jnote=` (catatan: ${n2r(key.j)})`;add(jok,'jumlah (no.)',n2r(key.j)+jnote)}
  else{const kn=r2n(String(key.j).split(/\s+/).pop().toUpperCase())||1;jok=j.n===kn;add(jok,'jumlah',key.j)}
  add(best.dd,'frekuensi (dd)',main.dd==null?'tanpa dd':main.dd+' dd');
  if(main.q.size)add(best.q!==false,'jumlah per pemberian',[...main.q].join(' '));
  if(main.w.size)add(best.w!==false,'waktu minum',[...main.w].join(' '));
  return{res,pts:res.filter(r=>r.ok).length,max:res.length};
}
function checkResep(c,f){
  const used=new Set();let pts=0,max=0,extra=0;
  const ur=rowsFromLines(f).filter(r=>r.o),out=[];
  for(const u of ur){
    let idx=-1,spec=null,r=null;
    c.rows.forEach((k,i)=>{if(used.has(i))return;for(const v of [k,...(k.v||[])]){const sp={...k,...v,s:v.s||k.s};if(nameOk(u.o,{n:v.n||k.n})){const rr=evalRow(sp,u);if(!r||rr.pts>r.pts){idx=i;spec=sp;r=rr}}}});
    if(idx<0){extra++;out.push({u,miss:true});continue}
    used.add(idx);pts+=r.pts;max+=r.max;out.push({u,r,key:spec,idx});
  }
  const missing=c.rows.filter((k,i)=>!used.has(i)&&!k.opt);
  c.rows.forEach((k,i)=>{if(!used.has(i)&&!k.opt)max+=evalRow(k,{b:'',k:'',j:'',s:''}).max});
  const proOk=String(f.pro||'').trim().toLowerCase().startsWith(c.pro.split(' ')[0].toLowerCase());
  const usiaOk=Number(String(f.usia||'').replace(/\D/g,''))===c.usia;
  const activeRows=(f.rows||[]).filter(r=>r.l1.trim()||r.l2.trim());
  const checkParaf=activeRows.some(r=>typeof r.paraf==='boolean');
  const parafOk=checkParaf?(activeRows.length>0&&activeRows.every(r=>r.paraf)):true;
  pts+=(proOk?1:0)+(usiaOk?1:0)+(checkParaf?(parafOk?1:0):0);
  max+=2+(checkParaf?1:0);
  return{out,missing,proOk,usiaOk,parafOk,pct:Math.round(100*Math.max(0,pts-extra)/max),extra};
}
const line1Of=k=>`${k.bl||FNAME[k.b]||k.b} ${k.o}${k.k?' '+k.k:''} ${typeof k.j==='string'?k.j:'no. '+n2r(k.j)}`;

/* ===== PENILAIAN LEMBAR PENGAMATAN PRAKTIKUM BSO CAIR (Gambar 2: Kolom a s/d f) ===== */
function normText(s){
  return String(s||'').toLowerCase().replace(/(\d),(\d)/g,'$1.$2').replace(/\s+/g,' ').trim();
}
function matchKw(text,kwList){
  const t=normText(text),tn=norm(text);
  if(!t)return[];
  return(kwList||[]).filter(k=>{
    const kl=normText(k),kn=norm(k);
    return t.includes(kl)||(kn.length>=3&&tn.includes(kn));
  });
}
function evalLembarPengamatan(item,form){
  const lp=item.lp||{},u=form||{};
  /* (a) Nama Bentuk Sediaan */
  const hitA=matchKw(u.a,lp.kwA);
  const okA=hitA.length>=1;
  const colA={ok:okA,pts:okA?2:0,max:2,hit:hitA,key:lp.a||item.f,
    msg:okA?`Sesuai (${hitA.slice(0,3).join(', ')})`:'Sebutkan jenis BSO cair & bentuk spesifiknya (misal Solutio/Suspensi/Emulsi + sirup/tetes/infus/lotio)'};

  /* (b) Nama Obat & Strength */
  const hitB=matchKw(u.b,lp.kwB);
  const hasNumB=/\d/.test(String(u.b||''))||(item.no===17&&hitB.length>=1);
  const hasNameB=hitB.some(k=>/[a-z]{3}/i.test(k));
  const ptsB=(hasNameB?1:0)+(hasNumB&&hitB.length>=1?1:0);
  const colB={ok:ptsB===2,partial:ptsB===1,pts:ptsB,max:2,hit:hitB,key:lp.b||`${item.n}, ${item.k}`,
    msg:ptsB===2?'Nama obat dan kekuatan/strength tepat':ptsB===1?'Lengkapi baik nama obat maupun kekuatan/strength-nya':'Tulis nama produk obat beserta kekuatannya (mg/ml, %, IU, atau g)'};

  /* (c) Senyawa Aktif & Komposisi */
  const hitC=matchKw(u.c,lp.kwC);
  const okC=hitC.length>=1;
  const colC={ok:okC,pts:okC?2:0,max:2,hit:hitC,key:lp.c||item.k,
    msg:okC?`Zat aktif terbaca (${hitC.slice(0,3).join(', ')})`:'Tuliskan senyawa aktif / komposisi beserta takarannya'};

  /* (d) Cara Pemakaian & Dosis */
  const hitD=matchKw(u.d,lp.kwD);
  const ptsD=hitD.length>=2?2:(hitD.length===1?1:0);
  const colD={ok:ptsD===2,partial:ptsD===1,pts:ptsD,max:2,hit:hitD,key:lp.d||`${item.r} — ${item.d}`,
    msg:ptsD===2?'Cara pemakaian (rute) dan dosis sesuai':ptsD===1?'Lengkapi rute pemberian sekaligus frekuensi/dosisnya':'Sebutkan cara pemakaian (oral/tetes/injeksi/oles/inhalasi) dan dosisnya'};

  /* (e) Golongan Obat & Cara Penyimpanan */
  const te=normText(u.e);
  const golMap={
    keras:['keras','lingkaran merah','huruf k'],
    bebas_terbatas:['bebas terbatas','lingkaran biru','p.no','p no'],
    bebas:['obat bebas','lingkaran hijau','bebas','suplemen'],
    jamu:['jamu','tradisional','herbal','bebas']
  };
  const golKws=golMap[item.gol]||[];
  const golOk=golKws.some(g=>te.includes(g))||(item.no===13&&(te.includes('bebas')||te.includes('lingkaran hijau')||te.includes('lingkaran biru')))||(item.no===23&&(te.includes('keras')||te.includes('lingkaran merah')||te.includes('bebas terbatas')||te.includes('lingkaran biru')));
  const storeOk=['30','25','sejuk','kering','cahaya','kocok','suhu','steril'].some(w=>te.includes(w));
  const ptsE=(golOk?1:0)+(storeOk?1:0);
  const colE={ok:ptsE===2,partial:ptsE===1,pts:ptsE,max:2,hit:matchKw(u.e,lp.kwE),key:lp.e||item.penyimpanan,
    msg:ptsE===2?'Golongan obat dan cara penyimpanan tepat':ptsE===1?(golOk?'Golongan obat benar, tambahkan cara penyimpanan (<30°C / terlindung cahaya / kocok dahulu)':'Cara penyimpanan benar, tambahkan golongan obat (Obat Keras / Bebas Terbatas / Bebas)'):'Sebutkan golongan obat (Keras/Bebas Terbatas/Bebas) dan cara penyimpanannya'};

  /* (f) Penulisan Resep (R/, S, Paraf/TTD, serta Identitas Pasien Pro & Umur) */
  const fText=normText((u.fR||u.fS)?`R/ ${u.fR||''}\nS ${u.fS||''}`:(u.f||''));
  const hasR=/\br\s*\/|\b(sol|susp|syr|drops|gtt|inj|emuls|lotio|fl|vial|amp|ampul|tube|strip|no)\b/i.test(fText)||fText.length>8;
  const nameTokens=[item.n,item.praktikumNama,...(lp.kwB||[]),...(lp.kwC||[])].map(normText).filter(x=>x.length>=4);
  const hasDrug=nameTokens.some(tok=>fText.includes(tok)||norm(fText).includes(norm(tok)));
  const hasSigna=/\b(\d+\s*dd|o\s*\d+\s*h|prn|p\.r\.n|pro\s*inj(?:eksi)?|imm|i\.m\.m|gtt|uc|u\.c|u\s+c|inf|cth|puff|dose|extend|loc|grg|garg|supp|applic|rekonstitusi)\b/i.test(fText);
  const checkExtra=('fParaf' in u)||('fPro' in u)||('fUmur' in u);
  const parafOk=checkExtra?!!u.fParaf:true;
  const proOk=checkExtra?String(u.fPro||'').trim().length>=2:true;
  const umurOk=checkExtra?/\d/.test(String(u.fUmur||'')):true;
  const rxBodyOk=hasDrug&&hasSigna&&hasR;
  const extraOk=parafOk&&proOk&&umurOk;
  const ptsF=(rxBodyOk&&extraOk)?2:((hasDrug||hasSigna||(checkExtra&&(parafOk||proOk)))?1:0);
  let msgF='Tuliskan baris R/ (bentuk sediaan, nama obat, jumlah), baris S (aturan pakai), tambahkan tanda tangan/paraf, serta isi Pro & Umur pasien';
  if(ptsF===2)msgF='Penulisan R/, Signa (S), Tanda Tangan/Paraf, serta Identitas Pasien (Pro & Umur) lengkap dan sesuai';
  else if(rxBodyOk&&!extraOk){
    const miss=[];
    if(!parafOk)miss.push('klik tombol "✍️ Tambahkan Tanda Tangan / Paraf"');
    if(!proOk)miss.push('isi nama pasien (Pro)');
    if(!umurOk)miss.push('isi umur pasien');
    msgF=`Baris R/ dan S sudah tepat, namun jangan lupa: ${miss.join(', ')}`;
  }else if(hasDrug&&!hasSigna)msgF='Baris R/ terbaca, lengkapi baris Signa (S aturan pakai), paraf, dan identitas pasien';
  else if(!hasDrug&&hasSigna)msgF='Aturan pakai terbaca, pastikan nama obat/sediaan di baris R/ tepat';
  const colF={ok:ptsF===2,partial:ptsF===1,pts:ptsF,max:2,parafOk,proOk,umurOk,key:lp.f||item.x,msg:msgF};

  const cols={a:colA,b:colB,c:colC,d:colD,e:colE,f:colF};
  const pts=colA.pts+colB.pts+colC.pts+colD.pts+colE.pts+colF.pts;
  const max=12;
  return{cols,pts,max,pct:Math.round(100*pts/max)};
}

const RESEP_CORE={n2r,r2n,parseLine1,parseS,parseJ,evalRow,checkResep,line1Of,rowsFromLines,stripS,FNAME,evalLembarPengamatan};
globalThis.RESEP_CORE=RESEP_CORE;
if(typeof module!=='undefined'&&module.exports)module.exports=RESEP_CORE;
if(typeof window!=='undefined')window.RESEP_CORE=RESEP_CORE;
})();
