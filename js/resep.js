/* CLINED: Latihan Resep. Halaman sendiri di menu; UI di Shadow DOM supaya CSS global CLINED tidak ikut mengubahnya. */
(() => {
'use strict';
const BEST_KEY='clined_resep_best_v1';
const gid=id=>document.getElementById(id);
const {CASES,SEDIAAN,SINGK,PADAT,REV_SRC}=window.RESEP_DATA;
const {n2r,r2n,checkResep,line1Of,rowsFromLines,FNAME}=window.RESEP_CORE;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const pick=(a,n)=>shuffle(a).slice(0,n);
const bestMap=()=>{try{const v=JSON.parse(localStorage.getItem(BEST_KEY)||'null');return v&&typeof v==='object'?v:{}}catch{return {}}};
let sr=null,inited=false;
const $=s=>sr.querySelector(s);
const CSS=`:host{display:block;--green-soft:var(--brand-soft,#e6f7d4);--on-green:#fff;--red-soft:#ffe5e5;--red-dark:#d93a3a;--amber:#8a5d00;--amber-soft:#fff3c4;--rxb:#1c8ed8;--rxbs:#ddf1fd;--shadow:0 3px 0 rgba(31,42,35,.10);
  --paper:#fffffc;--paper-line:#c9d3df;--pen:#1d3a99;--ink:#2a2d33;--font:inherit;--hand:'Kalam','Segoe Print','Bradley Hand','Comic Sans MS',cursive;color:var(--text);font:600 15px/1.5 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}
a{color:var(--rxb);font-weight:800}
:host(.rxdark){--red-soft:#3b2022;--amber:#f2c86b;--amber-soft:#3a2f12;--rxb:#6cc4f5;--rxbs:#12303f;--shadow:0 3px 0 rgba(0,0,0,.35)}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{margin:0;color:var(--text);font:600 15px/1.5 var(--font);padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));padding-block:0 40px;-webkit-font-smoothing:antialiased}
button{font:inherit;color:inherit;touch-action:manipulation;cursor:pointer}
button:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible{outline:3px solid rgba(28,142,216,.45);outline-offset:2px}
.eyebrow{font-size:12px;font-weight:900;letter-spacing:.6px;text-transform:uppercase;color:var(--green-dark)}
h1{font-size:26px;line-height:1.1;margin:2px 0 4px;font-weight:900;letter-spacing:-.5px}
h2{font-size:19px;line-height:1.25;margin:0 0 6px;font-weight:900;letter-spacing:-.2px;text-wrap:balance}
h3{font-size:16px;margin:0 0 8px;font-weight:800;line-height:1.35}
p{margin:0}
.muted,.sub{color:var(--muted);font-size:13px;font-weight:600}
.tabs{position:sticky;top:0;z-index:5;background:var(--bg);display:flex;gap:8px;overflow-x:auto;padding:10px 2px 12px;margin:0 -2px;scrollbar-width:none}
.tabs::-webkit-scrollbar{display:none}
.tab{flex:none;border:2px solid var(--line);border-bottom-width:4px;background:var(--card);color:var(--text);padding:8px 16px;border-radius:16px;font-weight:800;font-size:14px}
.tab[aria-selected="true"]{background:var(--green);border-color:var(--green-dark);color:var(--on-green)}
main{display:grid;gap:14px;padding-top:4px}
.card{background:var(--card);border:2px solid var(--line);border-radius:20px;padding:16px;box-shadow:var(--shadow);min-width:0}
.note{background:var(--amber-soft);color:var(--amber);border-radius:16px;padding:11px 14px;font-size:13px;font-weight:700;line-height:1.45}
.primary{display:flex;align-items:center;justify-content:center;width:100%;min-height:48px;border:2px solid var(--green-dark);border-bottom-width:4px;background:var(--green);color:var(--on-green);border-radius:16px;padding:12px 16px;font-weight:900;font-size:16px;text-align:center}
.primary:active{transform:translateY(2px);border-bottom-width:2px}
.secondary{display:flex;align-items:center;justify-content:center;width:100%;min-height:48px;border:2px solid var(--line);border-bottom-width:4px;background:var(--card);color:var(--text);border-radius:16px;padding:12px 16px;font-weight:800;font-size:15px;text-align:center}
.secondary:active{transform:translateY(2px);border-bottom-width:2px}
.primary:disabled,.secondary:disabled{opacity:.5}
.small{width:auto;min-height:38px;padding:7px 14px;font-size:14px;border-radius:13px}
.actions{display:grid;gap:10px;margin-top:16px}
@media(min-width:520px){.actions.two{grid-template-columns:1fr 1fr}}
.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.between{justify-content:space-between}
.grow{flex:1;min-width:0}
.badge{display:inline-block;font-size:11px;font-weight:900;letter-spacing:.4px;text-transform:uppercase;padding:3px 9px;border-radius:99px;background:var(--green-soft);color:var(--green-dark)}
.badge.warn{background:var(--amber-soft);color:var(--amber)}
.badge.red{background:var(--red-soft);color:var(--red-dark)}
.progress{height:12px;background:var(--surface);border:2px solid var(--line);border-radius:99px;overflow:hidden}
.progress i{display:block;height:100%;background:var(--green);border-radius:99px;transition:width .25s}
.icon-btn{flex:none;width:42px;height:42px;border:2px solid var(--line);border-bottom-width:4px;background:var(--card);border-radius:14px;font-size:20px;font-weight:900;line-height:1;display:grid;place-items:center}
/* daftar kasus */
.cases{display:grid;gap:10px}
@media(min-width:620px){.cases{grid-template-columns:1fr 1fr}}
.case{display:flex;gap:12px;align-items:center;width:100%;text-align:left;background:var(--card);border:2px solid var(--line);border-bottom-width:4px;border-radius:18px;padding:12px 14px}
.case:active{transform:translateY(2px);border-bottom-width:2px}
.case .no{flex:none;width:38px;height:38px;border-radius:12px;background:var(--green-soft);color:var(--green-dark);display:grid;place-items:center;font-weight:900;font-size:16px}
.case.done .no{background:var(--green);color:var(--on-green)}
.case .t{font-weight:800;font-size:14px;line-height:1.35}
.case .d{font-size:12px;color:var(--muted);font-weight:700;margin-top:2px}
/* langkah kasus */
.bar{display:flex;gap:10px;align-items:center}
.bar .progress{flex:1}
.timer{font-weight:900;font-size:14px;font-variant-numeric:tabular-nums;color:var(--muted);min-width:46px;text-align:right}
.timer.late{color:var(--red)}
.step-h{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:4px}
.vignette{font-size:16px;line-height:1.6;font-weight:600}
.pt{margin-top:10px;padding:10px 12px;border-radius:14px;background:var(--surface);font-size:13px;font-weight:700}
.answers{display:grid;gap:8px;margin-top:12px}
.answer{display:flex;gap:12px;align-items:flex-start;width:100%;text-align:left;background:var(--card);border:2px solid var(--line);border-bottom-width:4px;border-radius:15px;padding:12px 14px;font-weight:700;font-size:15px;line-height:1.4;color:var(--text)}
.answer:active:not(:disabled){transform:translateY(2px);border-bottom-width:2px}
.answer:disabled{cursor:default}
.answer .mk{flex:none;width:22px;height:22px;margin-top:1px;border-radius:7px;border:2px solid var(--line);display:grid;place-items:center;font-size:13px;font-weight:900;color:transparent}
.answer.r .mk{border-radius:50%}
.answer.sel{border-color:var(--rxb);background:var(--rxbs)}
.answer.sel .mk{background:var(--rxb);border-color:var(--rxb);color:#fff}
.answer.good{border-color:var(--green);background:var(--green-soft)}
.answer.good .mk{background:var(--green);border-color:var(--green);color:#fff}
.answer.bad{border-color:var(--red);background:var(--red-soft)}
.answer.bad .mk{background:var(--red);border-color:var(--red);color:#fff}
.answer.miss{border-color:#e0a800;background:var(--amber-soft)}
.answer.miss .mk{border-color:#e0a800}
.answer.alt{border-color:var(--rxb);background:var(--rxbs)}
.fb{margin-top:14px;padding:13px 14px;border-radius:16px;background:var(--surface);font-size:14px;font-weight:600;line-height:1.55}
.fb.good{background:var(--green-soft)}.fb.bad{background:var(--red-soft)}
.fb b{font-weight:900}
.fb ul{margin:6px 0 0;padding-left:18px}
.tag{display:inline-block;font-size:12px;font-weight:800;padding:3px 9px;border-radius:9px;margin:0 6px 6px 0}
.tag.good{background:var(--green-soft);color:var(--green-dark)}.tag.bad{background:var(--red-soft);color:var(--red-dark)}
.rowfb{padding:10px 0;border-top:2px solid var(--line)}.rowfb:first-child{border-top:0;padding-top:0}
/* kertas resep */
.paper{background:var(--paper);color:var(--ink);border:1px solid #cfd6df;border-radius:6px;padding:18px 16px 20px;box-shadow:0 1px 0 #fff inset,0 6px 18px rgba(20,30,50,.12);position:relative}
.lh{text-align:center;padding-bottom:8px;border-bottom:3px double #44484f;margin-bottom:6px}
.lh-name{font:800 18px var(--font);letter-spacing:.2px;color:var(--ink)}
.lh-sub{font:600 11.5px/1.5 var(--font);color:#5b616b}
.pdate{text-align:right;font:400 17px var(--hand);color:var(--pen);margin:6px 0 10px}
.blk{margin-bottom:8px}
.ln{display:flex;gap:8px;align-items:flex-end}
.ln.l2{padding-left:26px;margin-top:-2px}
.rm{flex:none;font:700 27px/1.2 var(--hand);color:var(--pen);width:34px}
.sm{flex:none;font:700 22px/1.3 var(--hand);color:var(--pen);width:20px;text-align:center}
.paper textarea,.paper input{display:block;flex:1;min-width:0;width:100%;font:400 21px/1.45 var(--hand);color:var(--pen);background:transparent;border:0;border-bottom:1.5px dotted var(--paper-line);border-radius:0;padding:0 2px;resize:none;overflow:hidden;box-shadow:none}
.paper textarea::placeholder,.paper input::placeholder{color:#9aa4b2;font-size:16px}
.paper textarea:focus,.paper input:focus{outline:0;border-bottom:1.5px solid var(--pen)}
.paraf{display:block;margin:2px 0 0 auto;width:62px;height:18px;color:var(--pen);opacity:.75}
.sep{height:0;border-top:1px solid var(--paper-line);margin:4px 0 10px}
.pro{display:flex;gap:16px;flex-wrap:wrap;margin-top:10px}
.pro label{display:flex;gap:6px;align-items:flex-end;flex:1;min-width:140px;font:700 16px var(--hand);color:var(--pen)}
.keyp{font:400 20px/1.5 var(--hand);color:var(--pen);white-space:pre-wrap}
.quick{display:flex;gap:6px;overflow-x:auto;padding:10px 2px 2px;margin-top:10px;scrollbar-width:none}
.quick::-webkit-scrollbar{display:none}
.quick button{flex:none;border:2px solid var(--line);border-bottom-width:3px;background:var(--card);border-radius:11px;padding:5px 10px;font:800 13px var(--font);color:var(--text)}
.hint{font-size:12.5px;color:var(--muted);font-weight:700;margin-top:8px}
/* kuis */
.q{font-size:19px;font-weight:850;line-height:1.45;margin:14px 0 4px;text-wrap:balance}
.q-meta{display:flex;justify-content:space-between;align-items:center;gap:10px;font-size:13px;color:var(--muted);font-weight:800}
.opt-text{white-space:pre-line}
/* daftar, form, hitung */
input.f,select.f,textarea.f{font:700 15px var(--font);color:var(--text);background:var(--card);border:2px solid var(--line);border-radius:14px;padding:11px 12px;width:100%;min-width:0}
textarea.f{min-height:84px;resize:vertical;font-weight:600}
label.l{display:block;font-size:12px;font-weight:800;color:var(--muted);margin:0 0 4px}
.fgrid{display:grid;gap:12px;margin-top:12px}
@media(min-width:560px){.fgrid.c3{grid-template-columns:repeat(3,1fr)}.fgrid.c2{grid-template-columns:1fr 1fr}}
.out{margin-top:14px;padding:12px 14px;border-radius:16px;background:var(--green-soft);font-weight:900;font-size:17px;line-height:1.4}
.seg{display:flex;gap:6px}
.seg button{border:2px solid var(--line);border-bottom-width:3px;background:var(--card);border-radius:12px;padding:6px 12px;font-weight:800;font-size:13px}
.seg button[aria-pressed="true"]{background:var(--green);border-color:var(--green-dark);color:var(--on-green)}
details.dt{border:2px solid var(--line);border-radius:16px;background:var(--card);padding:0}
details.dt+details.dt{margin-top:8px}
details.dt>summary{list-style:none;cursor:pointer;padding:12px 14px;font-weight:800;display:flex;gap:8px;justify-content:space-between;align-items:center}
details.dt>summary::-webkit-details-marker{display:none}
details.dt>summary::after{content:"+";font-weight:900;color:var(--muted)}
details.dt[open]>summary::after{content:"−"}
details.dt>.in{padding:0 14px 14px}
.item{padding:10px 0;border-top:2px solid var(--line)}.item:first-child{border-top:0}
.kv{display:grid;gap:4px;font-size:14px;font-weight:600}.kv b{font-weight:800}
.mono{font-family:ui-monospace,Menlo,Consolas,monospace;font-weight:700}
.sc{display:grid;gap:10px;margin-top:10px}
.sc .r{display:grid;grid-template-columns:1fr auto;gap:4px 10px;align-items:center;font-weight:800;font-size:14px}
.sc .r .progress{grid-column:1/-1;height:10px}
.big{font-size:44px;line-height:1;font-weight:900;letter-spacing:-1px}
@media(prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}

.paper textarea:disabled,.paper input:disabled{opacity:1;-webkit-text-fill-color:var(--pen);color:var(--pen)}
.blk-f{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:2px;min-height:24px}
.lnk{border:0;background:none;padding:6px 0;font:700 12px var(--font);color:#7a828d;text-decoration:underline;min-height:32px}
.ln:not(.l2){align-items:flex-start}
.tabs[hidden]{display:none}
.answer .mk{color:#fff}
.answer:not(.sel):not(.good):not(.bad):not(.alt) .mk{color:transparent}
.answer.miss .mk{color:transparent}
`;
/* ===== STATE & ROUTER ===== */
const STEPS_FULL=[{k:'v'},{k:'s1',n:1,w:20},{k:'s3',n:3,w:25},{k:'s4',n:4,w:35},{k:'s5',n:5,w:20},{k:'res'}];
const STEPS_RX=[{k:'v'},{k:'s4',n:4,w:35},{k:'res'}];
let STEPS=STEPS_FULL;
const stOf=k=>STEPS_FULL.find(x=>x.k===k);
const S={only:false,tab:'kasus',case:null,exam:false,step:0,f:null,chk:{},t0:0,tm:null,quiz:null,foc:{i:0,f:'l1'},sub:{sed:'kuis',sing:'kuis',pad:'kuis'}};
const TABS=[['kasus','Kasus'],['sediaan','Sediaan'],['singkatan','Singkatan'],['padat','BSO padat'],['hitung','Hitung']];
function renderTabs(){$('#tabs').hidden=false;$('#tabs').innerHTML=TABS.map(([k,l])=>`<button class="tab" role="tab" aria-selected="${S.tab===k}" data-tab="${k}">${l}</button>`).join('')}
function go(tab){stopTimer();S.tab=tab;S.quiz=null;S.case=null;renderTabs();render();scrollTo({top:0})}
function render(){const m=$('#app');({kasus:viewKasus,sediaan:viewSediaan,singkatan:viewSingk,padat:viewPadat,hitung:viewHitung})[S.tab](m);fitAll()}
const P=(label,act,dis,extra='')=>`<button class="primary" data-act="${act}" ${extra} ${dis?'disabled':''}>${label}</button>`;
const X=(label,act,extra='')=>`<button class="secondary" data-act="${act}" ${extra}>${label}</button>`;
const acts=(p,s)=>`<div class="actions ${s?'two':''}">${p}${s||''}</div>`;

/* ===== DAFTAR KASUS ===== */
function viewKasus(m){
  $('#tabs').hidden=!!S.case;
  if(S.case)return viewCase(m);
  const best=bestMap(),passed=CASES.filter(c=>((best[c.id+(S.only?'r':'')]||{}).pct||0)>=80).length,todo=CASES.filter(c=>((best[c.id+(S.only?'r':'')]||{}).pct||0)<80);
  m.innerHTML=`<div class="note"><b>Penting.</b> Kunci jawaban dari catatan mahasiswa (Bella &amp; Syaf), bukan sumber resmi. Bagian yang bertentangan ditandai dan kedua versi diterima. Buka Catatan verifikasi di hasil tiap kasus.</div>
  <div class="card"><h2>Latihan kasus</h2><p class="sub">Diagnosis, pilihan obat, resep, dan informasi dinilai. Langkah 2 dan 6 cukup dibaca (catatan dr. Lilian).</p>
  <div class="seg" role="group" aria-label="Jenis latihan" style="margin-top:12px"><button aria-pressed="${!S.only}" data-mode="full">Lengkap (6 langkah)</button><button aria-pressed="${S.only}" data-mode="rx">Tulis resep saja</button></div><p class="sub" style="margin-top:8px">${S.only?'Langsung tulis resep. Diagnosis dan obat tersedia di Petunjuk bila perlu.':''}</p><div class="progress" style="margin-top:10px"><i style="width:${100*passed/CASES.length}%"></i></div><p class="sub" style="margin-top:6px">Lulus ${passed} dari ${CASES.length} kasus (nilai 80 ke atas)</p><div class="actions two">${P('Kasus acak yang belum lulus','todo',!todo.length)}${X('Mode ujian acak (15 menit)','exam')}</div></div>
  <div class="cases">${CASES.map(c=>{const bo=best[c.id+(S.only?'r':'')],b=bo&&bo.pct;return `<button class="case ${b>=80?'done':''}" data-case="${c.id}"><span class="no">${b>=80?'✓':c.id}</span><span class="grow"><span class="t">${esc(c.ringkas)}</span><br><span class="d">${b!=null?`Terbaik ${b}%`:'Belum dicoba'}</span></span></button>`}).join('')}</div>`;
}
function openCase(id,exam){
  STEPS=S.only?STEPS_RX:STEPS_FULL;
  const c=CASES.find(x=>x.id===id),all=CASES.filter(x=>x.id!==id);
  const dxOpts=shuffle([c.dx,...pick([...new Set(all.map(x=>x.dx).filter(d=>d!==c.dx))],3)]);
  const keep=new Set([...c.p,...c.a].map(x=>x.toLowerCase()));
  const pool=[...new Set(all.flatMap(x=>[...x.p,...x.a]))].filter(x=>!keep.has(x.toLowerCase()));
  const n=Math.max(0,10-c.p.length-Math.min(2,c.a.length));
  const obatOpts=shuffle([...c.p,...pick(c.a,2),...pick(pool,n)]);
  S.case=c;S.exam=!!exam;S.step=0;S.chk={};S.foc={i:0,f:'l1'};
  S.f={dx:'',dxOpts,obatOpts,picks:[],rows:[{l1:'',l2:''}],pro:'',usia:'',l5:[],note:''};
  S.t0=Date.now();startTimer();render();scrollTo({top:0});
}
const left=()=>900-Math.floor((Date.now()-S.t0)/1000);
const fmt=l=>(l<0?'-':'')+String(Math.floor(Math.abs(l)/60)).padStart(2,'0')+':'+String(Math.abs(l)%60).padStart(2,'0');
function startTimer(){stopTimer();if(!S.exam)return;S.tm=setInterval(()=>{const e=$('#timer');if(!e)return;const l=left();e.textContent=fmt(l);e.classList.toggle('late',l<0)},500)}
function stopTimer(){clearInterval(S.tm);S.tm=null}

/* ===== LANGKAH KASUS ===== */
function viewCase(m){
  const c=S.case,st=STEPS[S.step],pct=Math.round(100*S.step/(STEPS.length-1));
  const head=`<div class="bar"><button class="icon-btn" data-act="back" aria-label="Keluar dari kasus">×</button><div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="width:${pct}%"></i></div>${S.exam?`<span class="timer" id="timer">${fmt(left())}</span>`:''}</div>`;
  const recap=st.k==='v'||st.k==='res'?'':`<details class="dt"><summary>Lihat kasus ${c.id}</summary><div class="in vignette">${esc(c.v)}</div></details>`;
  m.innerHTML=head+recap+({v:stepV,s1:stepS1,s3:stepS3,s4:stepS4,s5:stepS5,res:stepRes})[st.k]();
  if(S.focusH){S.focusH=false;const h=m.querySelector('h2,.big');if(h){h.tabIndex=-1;h.focus({preventScroll:true})}}
}
const stepHead=st=>S.only?`<div class="step-h"><span class="badge">Tulis resep</span></div>`:`<div class="step-h"><span class="badge">Langkah ${st.n}</span><span class="muted">bobot ${st.w}</span></div>`;
const prevBtn=()=>S.exam?X('Sebelumnya','prev'):'';
function stepV(){
  const c=S.case;
  return `<section class="card"><div class="step-h"><span class="badge">Kasus ${c.id}</span>${S.exam?'<span class="badge warn">Mode ujian</span>':''}</div><p class="vignette">${esc(c.v)}</p><div class="pt">Pasien untuk resep: <b>${esc(c.pro)}</b>, ${c.usia} tahun.</div>${acts(P('Mulai','next'))}</section>`;
}
function answerBtn(label,{r,cls='',dis,attr,mk}){return `<button class="answer ${r?'r':''} ${cls}" ${attr} ${dis?'disabled':''}><span class="mk">${mk??'✓'}</span><span class="opt-text">${esc(label)}</span></button>`}
function stepS1(){
  const c=S.case,f=S.f,d=!!S.chk.s1,st=stOf('s1');
  const list=f.dxOpts.map((o,i)=>{let cl='';if(d)cl=o===c.dx?'good':(o===f.dx?'bad':'');else if(o===f.dx)cl='sel';return answerBtn(o,{r:1,cls:cl,dis:d,attr:`data-dx="${i}"`,mk:'●'})}).join('');
  const fb=d?`<div role="status" class="fb ${f.dx===c.dx?'good':'bad'}"><b>${f.dx===c.dx?'Benar.':'Jawaban: '+esc(c.dx)}</b><details class="dt" style="margin-top:10px"><summary>Langkah 2: tujuan terapi (baca saja)</summary><div class="in"><ul>${c.tujuan.map(t=>`<li>${esc(t)}</li>`).join('')}</ul></div></details></div>`:'';
  const a=S.exam?acts(P('Lanjut','next'),prevBtn()):d?acts(P('Lanjut','next'),X('Coba lagi','retry')):acts(P('Periksa','check',!f.dx));
  return `<section class="card">${stepHead(st)}<h2>Apa diagnosis pasien?</h2><div class="answers">${list}</div>${fb}${a}</section>`;
}
function judge3(){const c=S.case,f=S.f,req=c.p.map(x=>x.toLowerCase()),alt=c.a.map(x=>x.toLowerCase());
  const hit=f.picks.filter(p=>req.includes(p.toLowerCase())).length,wrong=f.picks.filter(p=>!req.includes(p.toLowerCase())&&!alt.includes(p.toLowerCase())).length;
  return{req,alt,hit,wrong,need:req.length}}
function stepS3(){
  const c=S.case,f=S.f,d=!!S.chk.s3,st=stOf('s3'),j=judge3();
  const list=f.obatOpts.map((o,i)=>{const on=f.picks.includes(o),lc=o.toLowerCase();let cl='';
    if(d){if(j.req.includes(lc))cl=on?'good':'miss';else if(j.alt.includes(lc))cl=on?'alt':'';else cl=on?'bad':''}else if(on)cl='sel';
    return answerBtn(o+(d&&j.alt.includes(lc)?' (alternatif di catatan)':''),{cls:cl,dis:d,attr:`data-obat="${i}"`,mk:d&&cl==='bad'?'✕':'✓'})}).join('');
  const fb=d?`<div role="status" class="fb ${j.hit===j.need&&!j.wrong?'good':'bad'}"><b>${j.hit} dari ${j.need} obat wajib terpilih${j.wrong?`, ${j.wrong} pilihan tidak sesuai`:''}.</b><div style="margin-top:8px"><span class="tag good">hijau benar</span><span class="tag bad">merah tidak sesuai</span><span class="tag" style="background:var(--amber-soft);color:var(--amber)">kuning terlewat</span><span class="tag" style="background:var(--blue-soft);color:var(--blue)">biru alternatif</span></div></div>`:'';
  const a=S.exam?acts(P('Lanjut','next'),prevBtn()):d?acts(P('Lanjut','next'),X('Coba lagi','retry')):acts(P('Periksa','check',!f.picks.length));
  return `<section class="card">${stepHead(st)}<h2>Pilih obat yang tepat</h2><p class="sub">Terapi kausal dan simtomatis. Pilih semua yang sesuai.</p><div class="answers">${list}</div>${fb}${a}</section>`;
}
const SVG_PARAF='<svg class="paraf" viewBox="0 0 62 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 13c5-11 9-11 7-2s6 5 10-4c2-5 4 2 6 4s6-6 9-8c-2 6-1 9 3 8s8-3 12-6"/></svg>';
function stepS4(){
  const c=S.case,f=S.f,d=!!S.chk.s4,st=stOf('s4');
  const date=new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
  const blocks=f.rows.map((r,i)=>`<div class="blk" data-i="${i}"><div class="ln"><span class="rm">R/</span><textarea rows="1" data-f="l1" aria-label="Baris R/ obat ${i+1}" placeholder="Tab. Contoh 100 mg no. X" autocomplete="off" autocapitalize="sentences" spellcheck="false" ${d?'disabled':''}>${esc(r.l1)}</textarea></div><div class="ln l2"><span class="sm">S</span><textarea rows="1" data-f="l2" aria-label="Baris S obat ${i+1}" placeholder="3 dd tab I pc" autocomplete="off" autocapitalize="off" spellcheck="false" ${d?'disabled':''}>${esc(r.l2)}</textarea></div><div class="blk-f">${!d&&f.rows.length>1?`<button class="lnk" data-act="delrow" data-i="${i}">hapus R/ ini</button>`:'<span></span>'}${SVG_PARAF}</div></div>`).join('');
  const paper=`<div class="paper"><div class="lh"><div class="lh-name">dr. ____________________</div><div class="lh-sub">SIP ______________ · Praktik umum</div></div><div class="pdate">${date}</div>${blocks}<div class="sep"></div><div class="pro"><label>Pro: <input data-pro placeholder="Tn. A" autocomplete="off" aria-label="Pro (nama pasien)" value="${esc(f.pro)}" ${d?'disabled':''}></label><label>Umur: <input data-usia placeholder="45 th" inputmode="numeric" autocomplete="off" aria-label="Umur pasien" value="${esc(f.usia)}" ${d?'disabled':''}></label></div></div>`;
  const tools=d?'':`<div class="row" style="margin-top:10px"><button class="secondary small" data-act="addrow">+ Tambah R/</button></div>${S.exam?'':`<div class="quick" id="quick" role="toolbar" aria-label="Sisipkan singkatan"></div>`}`;
  const a=S.exam?acts(P('Lanjut','next'),prevBtn()):d?acts(P('Lanjut','next'),X('Perbaiki resep','retry')):acts(P('Periksa resep','check'));
  return `<section class="card">${stepHead(st)}<h2>Tulis resepnya</h2>${S.only?`<details class="dt" style="margin-bottom:12px"><summary>Petunjuk: diagnosis dan obat</summary><div class="in"><div><b>Diagnosis:</b> ${esc(c.dx)}</div><div style="margin-top:6px"><b>Obat:</b> ${esc([...c.p,...c.a].join(', '))}</div></div></details>`:''}<p class="sub" style="margin-bottom:12px">Pasien: ${esc(c.pro)}, ${c.usia} tahun. Tulis tiap obat seperti di kertas resep: baris R/ (bentuk, nama, kekuatan, jumlah) lalu baris S (aturan pakai).</p>${paper}${tools}${d?res4():''}${a}</section>`;
}
function keyHtml(c){
  const blocks=c.rows.map(k=>`<div class="blk"><div class="ln"><span class="rm">R/</span><div class="keyp">${esc(line1Of(k))}</div></div><div class="ln l2"><span class="sm">S</span><div class="keyp">${esc(k.s)}</div></div><div class="blk-f"><span></span>${SVG_PARAF}</div></div>`).join('');
  const alts=c.rows.filter(k=>k.sAlt||k.v).map(k=>`${k.o}: ${[...(k.sAlt?['S juga diterima '+k.sAlt.join(' / ')]:[]),...(k.v?['pengganti diterima '+k.v.map(v=>v.o).join(', ')]:[])].join('; ')}`);
  return `<div class="paper"><div class="lh"><div class="lh-name">Resep kunci</div><div class="lh-sub">dari catatan, bukan sumber resmi</div></div>${blocks}<div class="sep"></div><div class="keyp">Pro: ${esc(c.pro)} &nbsp; Umur: ${c.usia} th</div></div>${alts.length?`<p class="hint">${alts.map(esc).join('<br>')}</p>`:''}`;
}
const REV_T={src:['sesuai sumber','good'],warn:['berbeda dari sumber','bad'],unv:['belum diverifikasi','warn'],fix:['koreksi data','good']};
function revHtml(c){
  if(!c.rev||!c.rev.length)return '';
  return `<details class="dt" style="margin-top:6px"><summary>Catatan verifikasi</summary><div class="in">${c.rev.map(([k,t])=>`<div class="rowfb"><span class="tag ${REV_T[k][1]==='warn'?'':REV_T[k][1]}" ${REV_T[k][1]==='warn'?'style="background:var(--amber-soft);color:var(--amber)"':''}>${REV_T[k][0]}</span><div>${esc(t)}</div></div>`).join('')}<p class="hint">Pemeriksaan oleh Claude (AI) dengan pencarian web terbatas, bukan pengganti dosen atau pedoman resmi. Kunci jawaban tetap mengikuti catatan Bella &amp; Syaf.</p><p class="hint">Sumber: ${REV_SRC.map(([t,u])=>`<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(t)}</a>`).join(' · ')}</p></div></details>`;
}
function res4(){
  const c=S.case,r=checkResep(c,S.f);
  const rows=r.out.map(o=>o.miss?`<div class="rowfb"><b>${esc(o.u.o)}</b> <span class="tag bad">tidak ada di kunci</span><div class="sub">Bisa benar secara klinis, tapi tidak ada di catatan sehingga dihitung tambahan (−1).</div></div>`:
    `<div class="rowfb"><b>${esc(o.u.o)}</b> <span class="muted">${o.r.pts}/${o.r.max}</span><div style="margin-top:6px">${o.r.res.map(x=>`<span class="tag ${x.ok?'good':'bad'}">${x.ok?'✓':'✕'} ${x.label}${x.ok?'':': '+esc(x.exp)}</span>`).join('')}</div></div>`).join('');
  const none=r.out.length?'':`<div class="rowfb"><span class="muted">Belum ada obat yang terbaca. Tulis nama obat di baris R/.</span></div>`;
  return `<div role="status" class="fb ${r.pct>=80?'good':'bad'}"><b>Skor resep ${r.pct}%</b><div style="margin-top:8px">${rows}${none}${r.missing.length?`<div class="rowfb"><span class="tag bad">belum ada</span> ${r.missing.map(k=>esc(k.o)).join(', ')}</div>`:''}<div class="rowfb"><span class="tag ${r.proOk?'good':'bad'}">${r.proOk?'✓':'✕'} Pro: ${esc(c.pro)}</span><span class="tag ${r.usiaOk?'good':'bad'}">${r.usiaOk?'✓':'✕'} Umur: ${c.usia} th</span></div></div>
  <details class="dt" style="margin-top:6px"><summary>Lihat resep kunci</summary><div class="in">${keyHtml(c)}</div></details>${revHtml(c)}${c.cat?`<p class="sub" style="margin-top:10px">${esc(c.cat)}</p>`:''}</div>`;
}
function l5List(interactive){
  const c=S.case,f=S.f;
  return c.l5.map((t,i)=>{const on=f.l5.includes(i);return answerBtn(t,{cls:on?'good':'miss',dis:!interactive,attr:`data-l5="${i}"`,mk:on?'✓':''})}).join('');
}
function stepS5(){
  const c=S.case,f=S.f,d=!!S.chk.s5,st=stOf('s5');
  const note=`<label class="l" for="note" style="margin-top:12px">Catatan jawabanmu (opsional)</label><textarea class="f" id="note" placeholder="Efek samping, cara pakai, kontrol, pesan penting" >${esc(f.note)}</textarea>`;
  const body=d?`<p class="sub" style="margin-top:12px">Ketuk poin yang sudah kamu sebut.</p><div class="answers">${l5List(true)}</div><div class="fb"><b>Kamu sebut ${f.l5.length} dari ${c.l5.length}</b></div>`:'';
  const a=S.exam?acts(P('Kumpulkan dan lihat skor','submit'),prevBtn()):d?acts(P('Lihat hasil','next')):acts(P('Buka kunci','check'));
  return `<section class="card">${stepHead(st)}<h2>Informasi untuk pasien</h2><p class="sub">Efek samping, cara pakai, kontrol, dan pesan penting. Ucapkan atau tulis dulu, lalu buka kunci.</p>${note}${body}${a}</section>`;
}
function scores(){
  const c=S.case,f=S.f,o={s1:0,s3:0,s4:0,s5:0};
  if(S.chk.s1)o.s1=f.dx===c.dx?20:0;
  if(S.chk.s3){const j=judge3();o.s3=25*Math.max(0,(j.hit-.5*j.wrong)/j.need)}
  if(S.chk.s4)o.s4=35*checkResep(c,f).pct/100;
  if(S.chk.s5)o.s5=20*f.l5.length/c.l5.length;
  o.total=S.only?o.s4*100/35:o.s1+o.s3+o.s4+o.s5;return o;
}
function saveBest(){const t=Math.round(scores().total),b=bestMap(),id=S.case.id+(S.only?'r':''),o=b[id];if(!o||t>=o.pct){b[id]={pct:t,at:Date.now()};try{localStorage.setItem(BEST_KEY,JSON.stringify(b))}catch{}}}
function finish(){['s1','s3','s4','s5'].forEach(k=>S.chk[k]=true);stopTimer();S.step=STEPS.length-1;saveBest();render();scrollTo({top:0})}
function stepRes(){
  if(S.only)return stepResRx();
  const c=S.case,sc=scores(),pass=sc.total>=80,r4=checkResep(c,S.f);
  const row=(l,v,mx)=>`<div class="r"><span>${l}</span><span>${Math.round(v)} / ${mx}</span><div class="progress"><i style="width:${100*v/mx}%"></i></div></div>`;
  return `<section class="card"><div class="step-h"><span class="badge ${pass?'':'warn'}">${pass?'Lulus':'Belum lulus (batas 80)'}</span><span class="muted">Kasus ${c.id}</span></div><div class="big">${Math.round(sc.total)}%</div><div class="sc">${row('Diagnosis',sc.s1,20)}${row('Pilihan obat',sc.s3,25)}${row('Resep',sc.s4,35)}${row('Informasi pasien',sc.s5,20)}</div></section>
  <section class="card"><h2>Resep yang kamu tulis</h2>${res4()}</section>
  <section class="card"><h2>Informasi untuk pasien</h2><p class="sub">Ketuk poin yang sudah kamu sebut, skor ikut berubah.</p><div class="answers">${l5List(true)}</div></section>
  <details class="dt"><summary>Langkah 2: tujuan terapi (baca saja)</summary><div class="in"><ul>${c.tujuan.map(t=>`<li>${esc(t)}</li>`).join('')}</ul></div></details>
  <details class="dt"><summary>Langkah 6: monitoring dan evaluasi (baca saja)</summary><div class="in"><ul>${c.mon.map(t=>`<li>${esc(t)}</li>`).join('')}</ul></div></details>
  ${acts(P('Ulangi kasus','again'),X('Kasus lain','list'))}`;
}

function stepResRx(){
  const c=S.case,sc=scores(),pass=sc.total>=80;
  return `<section class="card"><div class="step-h"><span class="badge ${pass?'':'warn'}">${pass?'Lulus':'Belum lulus (batas 80)'}</span><span class="muted">Kasus ${c.id} · tulis resep saja</span></div><div class="big">${Math.round(sc.total)}%</div></section>
  <section class="card"><h2>Resep yang kamu tulis</h2>${res4()}</section>
  ${acts(P('Ulangi kasus','again'),X('Kasus lain','list'))}`;
}

/* ===== KUIS ===== */
function startQuiz(qs,title){S.quiz={qs,i:0,score:0,ans:null,wrong:[],title};drawQuiz()}
function drawQuiz(){
  const z=S.quiz,m=$('#quiz');if(!z||!m)return;
  if(z.i>=z.qs.length){const pct=Math.round(100*z.score/z.qs.length);
    m.innerHTML=`<div class="card"><div class="big">${pct}%</div><p class="sub" style="margin:6px 0 12px">${z.score} dari ${z.qs.length} benar</p><div class="progress"><i style="width:${pct}%"></i></div>${z.wrong.length?`<h3 style="margin-top:16px">Yang salah</h3>${z.wrong.map(w=>`<div class="item"><div>${esc(w.q)}</div><span class="tag good opt-text" style="margin-top:6px">${esc(w.a)}</span></div>`).join('')}`:'<p style="margin-top:14px">Semua benar.</p>'}${acts(P('Ulangi dengan soal baru','qagain'))}</div>`;return}
  const q=z.qs[z.i],d=z.ans!=null,pct=Math.round(100*z.i/z.qs.length);
  m.innerHTML=`<div class="card"><div class="q-meta"><span>${esc(z.title)}</span><span>${z.i+1}/${z.qs.length}</span></div><div class="progress" style="margin-top:8px"><i style="width:${pct}%"></i></div><p class="q">${esc(q.q)}</p><div class="answers">${q.o.map((o,i)=>{let cl='';if(d){if(o===q.a)cl='good';else if(i===z.ans)cl='bad'}return answerBtn(o,{r:1,cls:cl,dis:d,attr:`data-ans="${i}"`,mk:cl==='bad'?'✕':cl==='good'?'✓':''})}).join('')}</div>${d?`<div class="fb ${q.o[z.ans]===q.a?'good':'bad'}"><b>${q.o[z.ans]===q.a?'Benar.':'Belum tepat.'}</b>${q.o[z.ans]===q.a?'':` Jawaban: <span class="opt-text">${esc(q.a)}</span>`}</div>${acts(P(z.i+1<z.qs.length?'Lanjut':'Lihat hasil','qnext'))}`:''}</div>`;
}
function answer(i){const z=S.quiz,q=z.qs[z.i];if(z.ans!=null)return;z.ans=i;if(q.o[i]===q.a)z.score++;else z.wrong.push(q);drawQuiz()}
/* pilihan pengecoh: tidak boleh satu kelompok, dan tidak boleh memuat / termuat dalam jawaban benar */
function opts(a,pool,n=3,grp=()=>''){
  const al=String(a).toLowerCase(),g=grp(a);
  const ok=x=>{if(x===a)return false;const xl=String(x).toLowerCase();if(g&&grp(x)===g)return false;if(al.length>=3&&xl.length>=3&&(xl.includes(al)||al.includes(xl)))return false;return true};
  let c=[...new Set(pool)].filter(ok);
  return shuffle([a,...pick(c,n)]);
}
const subnav=(key,items)=>`<div class="seg" role="group" style="margin-top:12px">${items.map(([k,l])=>`<button aria-pressed="${S.sub[key]===k}" data-sub="${key}:${k}">${l}</button>`).join('')}</div>`;

/* ===== SEDIAAN ===== */
const fb=f=>f.startsWith('serbuk injeksi')?'serbuk injeksi':f.startsWith('suspensi')?'suspensi':f;
const rb=r=>/^injeksi/.test(r)?'injeksi':r.replace(/\s*\(.*\)/,'').trim();
function viewSediaan(m){
  m.innerHTML=`<div class="card"><h2>Kenali sediaan cair</h2><p class="sub">${SEDIAAN.length} produk dari praktikum BSO cair (Bu Risda).</p>${subnav('sed',[['kuis','Kuis'],['daftar','Daftar']])}</div><div id="quiz"></div><div id="list"></div>`;
  if(S.sub.sed==='daftar'){$('#list').innerHTML=`<div class="card"><input class="f" id="q" placeholder="Cari produk atau zat aktif" aria-label="Cari"><div id="rows" style="margin-top:10px"></div></div>`;drawSed('')}
  else if(!S.quiz)startQuiz(sedQs(),'Kuis sediaan');else drawQuiz();
}
function drawSed(q){q=q.toLowerCase();$('#rows').innerHTML=SEDIAAN.filter(s=>(s.n+s.k+s.f).toLowerCase().includes(q)).map(s=>`<details class="dt"><summary><span>${esc(s.n)} <span class="badge">${esc(s.f)}</span></span></summary><div class="in"><div class="kv"><div><b>Zat aktif:</b> ${esc(s.k)}</div><div><b>Rute:</b> ${esc(s.r)}</div><div><b>Dosis:</b> ${esc(s.d)}</div></div><div class="paper" style="margin-top:10px;padding:12px"><div class="keyp" style="font-size:18px">${esc(s.x)}</div></div></div></details>`).join('')||'<p class="sub">Tidak ada yang cocok.</p>'}
function sedQs(){
  const qs=[];
  for(const s of pick(SEDIAAN,10)){
    const t=Math.floor(Math.random()*4);
    if(t===0)qs.push({q:`Bentuk sediaan ${s.n}?`,a:s.f,o:opts(s.f,SEDIAAN.map(x=>x.f),3,fb)});
    if(t===1)qs.push({q:`Rute pemakaian ${s.n}?`,a:s.r,o:opts(s.r,SEDIAAN.map(x=>x.r),3,rb)});
    if(t===2)qs.push({q:`Zat aktif dan kekuatan ${s.n}?`,a:s.k,o:opts(s.k,SEDIAAN.map(x=>x.k),3)});
    if(t===3)qs.push({q:`Pilih resep yang tepat untuk ${s.n}`,a:s.x,o:opts(s.x,SEDIAAN.map(x=>x.x),3)});
  }
  return qs;
}

/* ===== SINGKATAN ===== */
const SG={ac:'w','1/2h ac':'w',pc:'w',mane:'w',nocte:'w',prn:'n',mv:'n','Pro:':'p','pro inj':'p','gtt in naris':'h',utraque:'h','extend part dol':'o','part affectam':'o','8h / 12h / 6h':'d',dd:'d'};
const sg=t=>SG[t]||'';
const sga=a=>{const e=SINGK.find(x=>x.a===a);return e?sg(e.t):''};
function viewSingk(m){
  m.innerHTML=`<div class="card"><h2>Singkatan Latin resep</h2><p class="sub">${SINGK.length} singkatan. "catatan" = ada di catatan; "umum" = istilah baku, cek ke dosen.</p>${subnav('sing',[['kuis','Kuis'],['daftar','Daftar']])}</div><div id="quiz"></div><div id="list"></div>`;
  if(S.sub.sing==='daftar')$('#list').innerHTML=`<div class="card">${SINGK.map(s=>`<div class="item"><div class="row between"><b class="mono">${esc(s.t)}</b><span class="badge ${s.s==='c'?'':'warn'}">${s.s==='c'?'catatan':'umum'}</span></div><div>${esc(s.a)}</div></div>`).join('')}</div>`;
  else if(!S.quiz)startQuiz(singQs(),'Kuis singkatan');else drawQuiz();
}
function singQs(){return pick(SINGK,12).map(s=>Math.random()<.5?{q:`Arti "${s.t}"?`,a:s.a,o:opts(s.a,SINGK.map(x=>x.a),3,sga)}:{q:`Singkatan untuk: ${s.a}`,a:s.t,o:opts(s.t,SINGK.map(x=>x.t),3,sg)})}

/* ===== BSO PADAT ===== */
function viewPadat(m){
  m.innerHTML=`<div class="card"><h2>BSO padat dan semipadat</h2><p class="sub">${PADAT.length} butir dari praktikum Pak Dharma.</p>${subnav('pad',[['kuis','Kuis'],['ringkas','Ringkasan']])}</div><div id="quiz"></div><div id="list"></div>`;
  if(S.sub.pad==='ringkas'){const G={rute:'Rute sediaan padat',serbuk:'Serbuk, granul, kapsul',tablet:'Tablet',supp:'Suppositoria dan ovula',salep:'Salep',lain:'Krim, gel, pasta, linimentum, sapo'};
    $('#list').innerHTML=Object.entries(G).map(([g,l])=>`<details class="dt"><summary>${l}</summary><div class="in">${PADAT.filter(p=>p.g===g).map(p=>`<div class="item"><b>${esc(p.q)}</b><div>${esc(p.a)}</div></div>`).join('')}</div></details>`).join('')}
  else if(!S.quiz)startQuiz(padQs(),'Kuis BSO padat');else drawQuiz();
}
function padQs(){return pick(PADAT,12).map(p=>{const same=PADAT.filter(x=>x.g===p.g).map(x=>x.a),all=PADAT.map(x=>x.a);let o=opts(p.a,same,3);if(o.length<4)o=opts(p.a,all,3);return{q:p.q+'?',a:p.a,o}})}

/* ===== HITUNG ===== */
function viewHitung(m){
  m.innerHTML=`<div class="note">Alat bantu hitung untuk latihan. Dosis tetap mengikuti pedoman dan dosen.</div>
  <div class="card"><h2>Jumlah obat (no.)</h2><p class="sub">Dosis × frekuensi × hari menjadi angka Romawi di resep.</p><div class="fgrid c3"><div><label class="l" for="c1a">Jumlah per minum</label><input class="f" id="c1a" type="number" min="0" step="0.5" value="1" inputmode="decimal"></div><div><label class="l" for="c1b">Kali sehari (dd)</label><input class="f" id="c1b" type="number" min="0" value="3" inputmode="numeric"></div><div><label class="l" for="c1c">Lama (hari)</label><input class="f" id="c1c" type="number" min="0" value="5" inputmode="numeric"></div></div><div class="out" id="o1"></div></div>
  <div class="card"><h2>Dosis per berat badan</h2><p class="sub">Contoh dari catatan: ibuprofen 10 mg/kgBB/dosis, sirup 100 mg/5 ml.</p><div class="fgrid c2"><div><label class="l" for="c2a">Berat badan (kg)</label><input class="f" id="c2a" type="number" min="0" value="15" inputmode="decimal"></div><div><label class="l" for="c2b">Dosis (mg/kgBB)</label><input class="f" id="c2b" type="number" min="0" value="10" inputmode="decimal"></div><div><label class="l" for="c2c">Dosis tersebut per</label><select class="f" id="c2c"><option value="1">dosis</option><option value="d">hari (dibagi)</option></select></div><div><label class="l" for="c2d">Dibagi berapa dosis/hari</label><input class="f" id="c2d" type="number" min="1" value="3" inputmode="numeric"></div><div><label class="l" for="c2e">Kekuatan sirup (mg)</label><input class="f" id="c2e" type="number" min="0" value="100" inputmode="decimal"></div><div><label class="l" for="c2f">per berapa ml</label><input class="f" id="c2f" type="number" min="0" value="5" inputmode="decimal"></div></div><div class="out" id="o2"></div></div>
  <div class="card"><h2>Angka Romawi</h2><div class="fgrid c2"><div><label class="l" for="c3a">Angka</label><input class="f" id="c3a" type="number" min="1" max="399" value="15"></div><div><label class="l" for="c3b">Romawi</label><input class="f" id="c3b" value="XV"></div></div><div class="out" id="o3">XV</div></div>`;
  calc();
}
function calc(){
  const v=id=>Number($('#'+id)?.value)||0;if(!$('#o1'))return;
  const t=v('c1a')*v('c1b')*v('c1c');$('#o1').textContent=t>0?`${t} → no. ${n2r(Math.round(t))||'-'}`:'-';
  const bb=v('c2a'),dm=v('c2b'),per=$('#c2c').value,n=v('c2d')||1;const mg=per==='d'?bb*dm/n:bb*dm;const ml=v('c2f')&&v('c2e')?mg/v('c2e')*v('c2f'):0;
  $('#o2').textContent=bb&&dm?`${mg.toFixed(1)} mg per dosis → ${ml.toFixed(1)} ml per dosis${per==='d'?` (${(mg*n).toFixed(0)} mg/hari)`:''}`:'-';
}

/* ===== KERTAS RESEP: tinggi otomatis, sisip singkatan, Enter pindah baris ===== */
const fit=t=>{t.style.height='auto';t.style.height=t.scrollHeight+'px'};
const fitAll=()=>{sr.querySelectorAll('.paper textarea').forEach(fit);renderQuick()};
const Q1=['Tab.','Caps.','Syr.','Susp.','Drops','Inj.','Sach.','no.','fl I'],Q2=['1 dd','2 dd','3 dd','tab I','caps I','ac','pc','prn','mane','nocte','1/2h ac','gtt'];
function renderQuick(){const q=$('#quick');if(!q)return;const f=S.foc.f;q.innerHTML=(f==='l2'?Q2:Q1).map(x=>`<button type="button" data-ins="${esc(x)}">${esc(x)}</button>`).join('')}
function insertAt(txt){
  const t=sr.querySelector(`.blk[data-i="${S.foc.i}"] textarea[data-f="${S.foc.f}"]`);if(!t||t.disabled)return;
  const a=t.selectionStart??t.value.length,b=t.selectionEnd??a,pre=t.value.slice(0,a),post=t.value.slice(b);
  const add=(pre&&!/\s$/.test(pre)?' ':'')+txt+(post&&/^\s/.test(post)?'':' ');
  t.value=pre+add+post;const p=(pre+add).length;t.focus();t.setSelectionRange(p,p);
  S.f.rows[S.foc.i][S.foc.f]=t.value;fit(t);
}
function addRow(focus=true){S.f.rows.push({l1:'',l2:''});viewCase($('#app'));fitAll();if(focus){const i=S.f.rows.length-1;S.foc={i,f:'l1'};const t=sr.querySelector(`.blk[data-i="${i}"] textarea[data-f="l1"]`);t&&t.focus();renderQuick()}}

/* ===== EVENTS ===== */

function ensure(){
  if(!gid('resepPage')){
    const s=document.createElement('section');s.id='resepPage';s.className='view';
    s.innerHTML='<div class="card ub-head"><div class="topline"><button class="back" type="button" data-home>‹ Beranda</button><b>✍️ Latihan Resep</b></div><p class="muted" style="margin:6px 0 0;font-size:13px">Latihan menulis resep untuk praktikum farmakologi. Kunci dari catatan mahasiswa, bukan sumber resmi.</p></div><div id="resepHost"></div>';
    const anchor=gid('glossaryPage')||gid('analytics')||document.querySelector('main .view:last-of-type');
    anchor&&anchor.parentNode?anchor.parentNode.insertBefore(s,anchor):document.body.appendChild(s);
  }
  const menu=gid('menuSectionContent');
  if(menu&&!gid('resepBtn')){
    const b=document.createElement('button');b.className='secondary menu-item';b.id='resepBtn';b.type='button';
    b.innerHTML='<span class="menu-icon">✍️</span><span>Latihan Resep</span>';
    menu.insertBefore(b,gid('glossaryBtn')||gid('studyPlusBtn')||null);
  }
}
function init(){
  if(inited)return;inited=true;
  const host=gid('resepHost');sr=host.attachShadow({mode:'open'});
  sr.innerHTML='<style>'+CSS+'</style><nav class="tabs" id="tabs" role="tablist" aria-label="Menu latihan resep"></nav><main id="app"></main>';
  const dark=()=>host.classList.toggle('rxdark',document.documentElement.classList.contains('dark'));
  dark();new MutationObserver(dark).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  bind();renderTabs();render();
}
function bind(){
sr.addEventListener('mousedown',e=>{if(e.target.closest('.quick button'))e.preventDefault()});
sr.addEventListener('click',e=>{
  const t=e.target.closest('button');if(!t)return;
  if(t.dataset.tab)return go(t.dataset.tab);
  if(t.classList.contains('case'))return openCase(+t.dataset.case,false);
  if(t.dataset.ins!=null)return insertAt(t.dataset.ins);
  if(t.dataset.mode){S.only=t.dataset.mode==='rx';return render()}
  if(t.dataset.sub){const[k,v]=t.dataset.sub.split(':');S.sub[k]=v;S.quiz=null;return render()}
  if(t.dataset.ans!=null)return answer(+t.dataset.ans);
  if(t.dataset.dx!=null){S.f.dx=S.f.dxOpts[+t.dataset.dx];return viewCase($('#app'))}
  if(t.dataset.obat!=null){const o=S.f.obatOpts[+t.dataset.obat];S.f.picks=S.f.picks.includes(o)?S.f.picks.filter(x=>x!==o):[...S.f.picks,o];return viewCase($('#app'))}
  if(t.dataset.l5!=null){const i=+t.dataset.l5,f=S.f;f.l5=f.l5.includes(i)?f.l5.filter(x=>x!==i):[...f.l5,i];if(STEPS[S.step].k==='res'&&!S.only)saveBest();const y=scrollY;viewCase($('#app'));scrollTo({top:y});return}
  const a=t.dataset.act;if(!a)return;
  const st=STEPS[S.step]&&STEPS[S.step].k;
  if(a==='todo'){const best=bestMap(),td=CASES.filter(c=>((best[c.id+(S.only?'r':'')]||{}).pct||0)<80);if(td.length)openCase(td[Math.floor(Math.random()*td.length)].id,false);return}
  if(a==='exam')return openCase(CASES[Math.floor(Math.random()*CASES.length)].id,true);
  if(a==='back'||a==='list'){stopTimer();S.case=null;render();return scrollTo({top:0})}
  if(a==='again')return openCase(S.case.id,S.exam);
  if(a==='next'){S.step++;S.focusH=true;if(STEPS[S.step].k==='res')return finish();viewCase($('#app'));fitAll();return scrollTo({top:0})}
  if(a==='prev'){S.step=Math.max(0,S.step-1);viewCase($('#app'));fitAll();return scrollTo({top:0})}
  if(a==='check'){S.chk[st]=true;viewCase($('#app'));fitAll();const fb=sr.querySelector('.fb');return fb&&fb.scrollIntoView({block:'center',behavior:'smooth'})}
  if(a==='retry'){S.chk[st]=false;if(st==='s1')S.f.dx='';if(st==='s3')S.f.picks=[];viewCase($('#app'));fitAll();return scrollTo({top:0})}
  if(a==='submit')return finish();
  if(a==='addrow')return addRow();
  if(a==='delrow'){S.f.rows.splice(+t.dataset.i,1);S.foc={i:0,f:'l1'};viewCase($('#app'));return fitAll()}
  if(a==='qnext'){S.quiz.i++;S.quiz.ans=null;return drawQuiz()}
  if(a==='qagain'){S.quiz=null;return render()}
});
sr.addEventListener('input',e=>{
  const t=e.target;
  if(S.tab==='hitung'&&t.closest('#app')){
    if(t.id==='c3a'){const n=+t.value;$('#c3b').value=n>0&&n<400?n2r(n):'';$('#o3').textContent=$('#c3b').value||'-'}
    if(t.id==='c3b'){const n=r2n(t.value);$('#c3a').value=n||'';$('#o3').textContent=n?String(n):'Romawi tidak valid'}
    return calc();
  }
  if(t.id==='q'&&S.tab==='sediaan')return drawSed(t.value);
  const f=S.f;if(!f)return;
  if(t.matches('.paper textarea')){f.rows[+t.closest('.blk').dataset.i][t.dataset.f]=t.value;return fit(t)}
  if(t.dataset.pro!=null)f.pro=t.value;
  if(t.dataset.usia!=null)f.usia=t.value;
  if(t.id==='note')f.note=t.value;
});
sr.addEventListener('change',e=>{if(e.target.id==='c2c')calc()});
sr.addEventListener('focusin',e=>{const t=e.target;if(t.matches&&t.matches('.paper textarea')){const n={i:+t.closest('.blk').dataset.i,f:t.dataset.f};if(n.f!==S.foc.f||n.i!==S.foc.i){S.foc=n;renderQuick()}}});
sr.addEventListener('keydown',e=>{
  const t=e.target;if(!t.matches||!t.matches('.paper textarea')||e.key!=='Enter'||e.isComposing)return;
  e.preventDefault();const i=+t.closest('.blk').dataset.i;
  if(t.dataset.f==='l1')return sr.querySelector(`.blk[data-i="${i}"] textarea[data-f="l2"]`).focus();
  const nx=sr.querySelector(`.blk[data-i="${i+1}"] textarea[data-f="l1"]`);
  if(nx)nx.focus();else if(t.value.trim())addRow();
});

}
function open(){ensure();if(!gid('resepPage'))return;window.show('resepPage');init()}
document.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('button');if(!t)return;if(t.id==='resepBtn')return open();if(t.matches('#resepPage [data-home]')){stopTimer();return window.show('home')}});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensure);else ensure();
window.CLINED_RESEP={open};
})();
