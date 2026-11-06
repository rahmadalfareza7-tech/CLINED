/* CLINED: logika murni penilaian resep (tanpa DOM). Dites di tests/resep-core.test.mjs. */
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
const UNIT=new Set(['tab','caps','tablet','kapsul','kaps']);
function toks(s){return String(s||'').toLowerCase().replace(/½/g,'1/2').replace(/(\d),(\d)/g,'$1.$2').split(/[^a-z0-9./]+/).filter(Boolean).map(t=>{const n=r2n(t);return n?String(n):t.replace(/^\.+|\.+$/g,'')}).filter(Boolean)}
function parseS(str){const raw=String(str||'').toLowerCase().replace(/1\s*\/\s*2\s*h/g,'1/2h').replace(/\ba\.\s?c\b\.?/g,'ac').replace(/\bp\.\s?c\b\.?/g,'pc').replace(/\bp\.\s?r\.\s?n\b\.?/g,'prn').replace(/\bd\.\s?d\b\.?/g,'dd');const m=raw.match(/(\d+)\s*dd/);const dd=m?+m[1]:null;const t=toks(raw.replace(/(\d+)\s*dd/,' ')).filter(x=>x!=='s');
  return{dd,q:new Set(t.filter(x=>!WAKTU.has(x)&&!UNIT.has(x))),w:new Set(t.filter(x=>WAKTU.has(x)))}}
function parseJ(str){const s=String(str||'').toLowerCase().replace(/\bno\.?/,' ').trim();const last=s.split(/\s+/).pop(),n=r2n(last.toUpperCase())||(/^\d+$/.test(last)?+last:0);return{n,t:new Set(toks(s))}}
const nameOk=(u,spec)=>{const un=norm(u);if(!un)return false;return spec.n.some(x=>{const nx=norm(x);return un.includes(nx)||(nx.includes(un)&&un.length>=5)||lev(un,nx)<=Math.max(1,Math.floor(nx.length*.2))})};
const kuatN=s=>String(s||'').toLowerCase().replace(/\s+/g,'').replace(/(\d),(\d)/g,'$1.$2');

/* ===== BACA BARIS R/ YANG DITULIS BEBAS ===== */
const FORM={tab:'tab',tablet:'tab',caps:'caps',cap:'caps',kaps:'caps',kapsul:'caps',capsul:'caps',syr:'syr',syrup:'syr',sirup:'syr',sir:'syr',susp:'susp',suspensi:'susp',drops:'drops',drop:'drops',inj:'inj',injeksi:'inj',sach:'sach',sachet:'sach',inhaler:'inhaler',gtt:'drops'};
const FNAME={tab:'Tab.',caps:'Caps.',syr:'Syr.',susp:'Susp.',drops:'Drops',inj:'Inj.',sach:'Sach.',inhaler:'Inhaler'};
function parseLine1(str){
  let s=String(str||'').replace(/½/g,'1/2').replace(/^\s*r\s*\/\s*/i,' ');
  let b='';
  s=s.replace(/(^|[^a-z])(tablet|tab|caps|cap|kapsul|kaps|capsul|syrup|syr|sirup|sir|suspensi|susp|drops|drop|injeksi|inj|sachet|sach|inhaler|gtt)\b\.?/i,(m,pre,w)=>{b=FORM[w.toLowerCase()];return pre+' '});
  let k='';
  s=s.replace(/(\d+(?:[.,]\d+)?)\s*(mg|mcg|µg|gr|g|iu|%)(?![a-z])(?:\s*\/\s*(\d+(?:[.,]\d+)?)?\s*(ml|mg|g)(?![a-z]))?/i,(m,n,u,d,du)=>{k=n+(u==='%'?'':' ')+u.toLowerCase()+(du?'/'+(d?d+' ':'')+du.toLowerCase():'');return ' '});
  let j='';
  s=s.replace(/(^|[^a-z])(no|fl|flac|vial|amp|tube)\.?\s*([ivxlc]+|\d+)(?![a-z0-9])/i,(m,pre,w,n)=>{w=w.toLowerCase();j=w==='no'?n.toUpperCase():(w==='flac'?'fl':w)+' '+n.toUpperCase();return pre+' '});
  if(!j){const m=s.match(/\s(\d+|[ivx]+)\s*$/i);if(m&&(/^\d+$/.test(m[1])||r2n(m[1]))){j=m[1].toUpperCase();s=s.slice(0,m.index)}}
  const o=s.replace(/\b(opth|oculi|auris|naris|nasi)\b/gi,' ').replace(/[^\p{L}\p{N}\s-]/gu,' ').replace(/\s+/g,' ').trim();
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
  add(u.b===key.b,'bentuk sediaan',FNAME[key.b]||key.b);
  if(key.k)add(kuatN(u.k)===kuatN(key.k),'kekuatan',key.k);
  const j=parseJ(u.j);let jok,jnote='';
  if(typeof key.j==='number'){const dq=Number([...main.q].find(x=>/^\d+$/.test(x))||1),daily=(main.dd||1)*dq;
    jok=j.n===key.j||(j.n>0&&j.n%daily===0);if(jok&&j.n!==key.j)jnote=` (catatan: ${n2r(key.j)})`;add(jok,'jumlah (no.)',n2r(key.j)+jnote)}
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
    let idx=-1,spec=null;
    c.rows.forEach((k,i)=>{if(idx>=0||used.has(i))return;for(const v of [k,...(k.v||[])]){const sp={...k,...v,s:v.s||k.s};if(nameOk(u.o,{n:v.n||k.n})){idx=i;spec=sp;return}}});
    if(idx<0){extra++;out.push({u,miss:true});continue}
    used.add(idx);const r=evalRow(spec,u);pts+=r.pts;max+=r.max;out.push({u,r,key:spec,idx});
  }
  const missing=c.rows.filter((_,i)=>!used.has(i));
  c.rows.forEach((k,i)=>{if(!used.has(i))max+=evalRow(k,{b:'',k:'',j:'',s:''}).max});
  const proOk=String(f.pro||'').trim().toLowerCase().startsWith(c.pro.split(' ')[0].toLowerCase());
  const usiaOk=Number(String(f.usia||'').replace(/\D/g,''))===c.usia;
  pts+=(proOk?1:0)+(usiaOk?1:0);max+=2;
  return{out,missing,proOk,usiaOk,pct:Math.round(100*Math.max(0,pts-extra)/max),extra};
}
const line1Of=k=>`${k.bl||FNAME[k.b]||k.b} ${k.o}${k.k?' '+k.k:''} ${typeof k.j==='string'?k.j:'no. '+n2r(k.j)}`;


const RESEP_CORE={n2r,r2n,parseLine1,parseS,parseJ,evalRow,checkResep,line1Of,rowsFromLines,stripS,FNAME};
if(typeof module!=='undefined'&&module.exports)module.exports=RESEP_CORE;
window.RESEP_CORE=RESEP_CORE;
})();
