/* CLINED: Latihan Resep & Praktikum Farmakologi Blok Kedokteran Keluarga.
   Halaman sendiri di menu; UI di Shadow DOM supaya CSS global CLINED tidak ikut mengubahnya. */
(() => {
'use strict';
const BEST_KEY='clined_resep_best_v1';
const LP_BEST_KEY='clined_resep_lp_best_v1';
const gid=id=>document.getElementById(id);
const {CASES,SEDIAAN,RACIKAN=[],TEORI_BSO={},SINGK,PADAT,REV_SRC}=window.RESEP_DATA;
const {n2r,r2n,checkResep,line1Of,rowsFromLines,FNAME,evalLembarPengamatan}=window.RESEP_CORE;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const pick=(a,n)=>shuffle(a).slice(0,n);
const bestMap=()=>{try{const v=JSON.parse(localStorage.getItem(BEST_KEY)||'null');return v&&typeof v==='object'?v:{}}catch{return {}}};
const lpBestMap=()=>{try{const v=JSON.parse(localStorage.getItem(LP_BEST_KEY)||'null');return v&&typeof v==='object'?v:{}}catch{return {}}};
let sr=null,inited=false;
const $=s=>sr.querySelector(s);
const CSS=`:host{display:block;width:100%;max-width:100%;min-width:0;overflow-x:hidden;overflow-wrap:normal;word-break:normal;hyphens:none;padding-bottom:calc(115px + env(safe-area-inset-bottom,0px));--green-soft:var(--brand-soft,#e6f7d4);--on-green:#fff;--red-soft:#ffe5e5;--red-dark:#d93a3a;--amber:#8a5d00;--amber-soft:#fff3c4;--rxb:#1c8ed8;--rxbs:#ddf1fd;--shadow:0 3px 0 rgba(31,42,35,.08);
  --paper:#ffffff;--paper-line:#cbd5e1;--pen:#1e3a8a;--ink:#0f172a;--font:'Plus Jakarta Sans',Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;--hand:'Plus Jakarta Sans',Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:var(--text);font:600 15px/1.55 var(--font);box-sizing:border-box;-webkit-font-smoothing:antialiased}
a{color:var(--rxb);font-weight:800}
:host(.rxdark){--red-soft:#3b2022;--amber:#f2c86b;--amber-soft:#3a2f12;--rxb:#6cc4f5;--rxbs:#12303f;--shadow:0 3px 0 rgba(0,0,0,.35)}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;overflow-wrap:normal;word-break:normal}
button{font:inherit;color:inherit;touch-action:manipulation;cursor:pointer}
button:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible{outline:3px solid rgba(28,142,216,.45);outline-offset:2px}
.eyebrow{font-size:12px;font-weight:900;letter-spacing:.6px;text-transform:uppercase;color:var(--green-dark)}
h1{font-size:23px;line-height:1.22;margin:2px 0 6px;font-weight:900;letter-spacing:-.3px;overflow-wrap:break-word}
h2{font-size:18.5px;line-height:1.32;margin:0 0 6px;font-weight:900;letter-spacing:-.2px;overflow-wrap:break-word}
h3{font-size:16px;margin:0 0 8px;font-weight:800;line-height:1.38;overflow-wrap:break-word}
p{margin:0;overflow-wrap:break-word}
.muted,.sub{color:var(--muted);font-size:13.5px;font-weight:600;line-height:1.55;overflow-wrap:break-word}
.tabs{position:sticky;top:0;z-index:5;background:var(--bg);display:flex;gap:8px;overflow-x:auto;padding:8px 2px 12px;margin:0;width:100%;max-width:100%;scrollbar-width:none;-webkit-overflow-scrolling:touch}
.tabs::-webkit-scrollbar{display:none}
.tab{flex:none;border:2px solid var(--line);border-bottom-width:4px;background:var(--card);color:var(--text);padding:9px 15px;border-radius:15px;font-weight:800;font-size:13.5px;white-space:nowrap}
.tab[aria-selected="true"]{background:var(--green);border-color:var(--green-dark);color:var(--on-green)}
main,#list,#quiz,#rows{display:flex;flex-direction:column;gap:14px;width:100%;max-width:100%;min-width:0}
main{padding-top:4px}
.card{display:block;background:var(--card);border:2px solid var(--line);border-radius:20px;padding:18px;box-shadow:var(--shadow);width:100%;max-width:100%;min-width:0;overflow:hidden}
@media(max-width:480px){
  .card{padding:14px;border-radius:18px}
  h1{font-size:20px}
  h2{font-size:17px}
  h3{font-size:15px}
}
.note{background:var(--amber-soft);color:var(--amber);border-radius:16px;padding:12px 15px;font-size:13.5px;font-weight:700;line-height:1.5;width:100%;max-width:100%;min-width:0;overflow-wrap:break-word}
.primary{display:flex;align-items:center;justify-content:center;width:100%;min-height:46px;border:2px solid var(--green-dark);border-bottom-width:4px;background:var(--green);color:var(--on-green);border-radius:15px;padding:11px 14px;font-weight:900;font-size:15px;text-align:center;line-height:1.25}
.primary:active{transform:translateY(2px);border-bottom-width:2px}
.secondary{display:flex;align-items:center;justify-content:center;width:100%;min-height:46px;border:2px solid var(--line);border-bottom-width:4px;background:var(--card);color:var(--text);border-radius:15px;padding:11px 14px;font-weight:800;font-size:14px;text-align:center;line-height:1.25}
.secondary:active{transform:translateY(2px);border-bottom-width:2px}
.primary:disabled,.secondary:disabled{opacity:.5}
.small{width:auto;min-height:38px;padding:7px 12px;font-size:13px;border-radius:12px}
.actions{display:grid;grid-template-columns:minmax(0,1fr);gap:10px;margin-top:14px}
@media(min-width:520px){.actions.two{grid-template-columns:repeat(2,minmax(0,1fr))}}
.row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;min-width:0}
.between{justify-content:space-between}
.grow{flex:1;min-width:0}
.badge{display:inline-flex;align-items:center;font-size:11.5px;font-weight:800;letter-spacing:.2px;padding:4px 10px;border-radius:99px;background:var(--green-soft);color:var(--green-dark);max-width:100%;white-space:normal;overflow-wrap:break-word;line-height:1.3}
.badge.warn{background:var(--amber-soft);color:var(--amber)}
.badge.red{background:var(--red-soft);color:var(--red-dark)}
.badge.blue{background:var(--rxbs);color:var(--rxb)}
.progress{height:12px;background:var(--surface);border:2px solid var(--line);border-radius:99px;overflow:hidden;width:100%}
.progress i{display:block;height:100%;background:var(--green);border-radius:99px;transition:width .25s}
.icon-btn{flex:none;width:42px;height:42px;border:2px solid var(--line);border-bottom-width:4px;background:var(--card);border-radius:14px;font-size:20px;font-weight:900;line-height:1;display:grid;place-items:center}
/* daftar kasus */
.cases{display:grid;grid-template-columns:minmax(0,1fr);gap:10px;width:100%;min-width:0}
@media(min-width:620px){.cases{grid-template-columns:repeat(2,minmax(0,1fr))}}
.case{display:flex;gap:12px;align-items:center;width:100%;min-width:0;text-align:left;background:var(--card);border:2px solid var(--line);border-bottom-width:4px;border-radius:18px;padding:12px 14px}
.case:active{transform:translateY(2px);border-bottom-width:2px}
.case .no{flex:none;width:38px;height:38px;border-radius:12px;background:var(--green-soft);color:var(--green-dark);display:grid;place-items:center;font-weight:900;font-size:16px}
.case.done .no{background:var(--green);color:var(--on-green)}
.case .t{font-weight:800;font-size:14.5px;line-height:1.4;overflow-wrap:break-word}
.case .d{font-size:12px;color:var(--muted);font-weight:700;margin-top:2px}
/* langkah kasus */
.bar{display:flex;gap:10px;align-items:center;width:100%;min-width:0}
.bar .progress{flex:1;min-width:0}
.timer{font-weight:900;font-size:14px;font-variant-numeric:tabular-nums;color:var(--muted);min-width:46px;text-align:right}
.timer.late{color:var(--red)}
.step-h{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px;min-width:0}
.vignette{font-size:15.5px;line-height:1.65;font-weight:600;overflow-wrap:break-word}
.pt{margin-top:10px;padding:11px 14px;border-radius:14px;background:var(--surface);font-size:13.5px;font-weight:700;line-height:1.45}
.answers{display:grid;grid-template-columns:minmax(0,1fr);gap:8px;margin-top:12px;width:100%;min-width:0}
.answer{display:flex;gap:10px;align-items:flex-start;width:100%;min-width:0;text-align:left;background:var(--card);border:2px solid var(--line);border-bottom-width:4px;border-radius:15px;padding:12px 13px;font-weight:700;font-size:14.5px;line-height:1.45;color:var(--text)}
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
.fb{margin-top:14px;padding:13px 15px;border-radius:16px;background:var(--surface);font-size:14px;font-weight:600;line-height:1.6;width:100%;max-width:100%;min-width:0;overflow-wrap:break-word}
.fb.good{background:var(--green-soft)}.fb.bad{background:var(--red-soft)}
.fb b{font-weight:900}
.fb ul{margin:6px 0 0;padding-left:18px}
.tag{display:inline-block;font-size:12px;font-weight:800;padding:4px 9px;border-radius:9px;margin:0 5px 5px 0;max-width:100%;overflow-wrap:break-word}
.tag.good{background:var(--green-soft);color:var(--green-dark)}.tag.bad{background:var(--red-soft);color:var(--red-dark)}
.tag.warn{background:var(--amber-soft);color:var(--amber)}
.rowfb{padding:10px 0;border-top:2px solid var(--line);min-width:0}.rowfb:first-child{border-top:0;padding-top:0}
/* kertas resep ergonomis */
.paper{background:var(--paper);color:var(--ink);border:2px solid #cbd5e1;border-radius:14px;padding:16px 16px 18px;box-shadow:0 2px 10px rgba(15,23,42,.06);position:relative;width:100%;max-width:100%;min-width:0;overflow:hidden}
.lh{text-align:center;padding-bottom:10px;border-bottom:3px double #334155;margin-bottom:10px}
.lh-name{font:800 15.5px var(--font);letter-spacing:.2px;color:var(--ink)}
.lh-sub{font:600 11.5px/1.45 var(--font);color:#475569}
.pdate{text-align:right;font:700 13px var(--font);color:#475569;margin:4px 0 12px}
.blk{margin-bottom:10px;min-width:0}
.ln{display:flex;gap:8px;align-items:flex-end;min-width:0}
.ln.l2{padding-left:22px;margin-top:4px}
.rm{flex:none;font:900 19px/1.3 var(--font);color:var(--pen);width:28px}
.sm{flex:none;font:900 16.5px/1.35 var(--font);color:var(--pen);width:18px;text-align:center}
.paper textarea,.paper input{display:block;flex:1;min-width:0;width:100%;font:700 15.5px/1.55 var(--font);color:var(--pen);background:transparent;border:0;border-bottom:1.5px dashed var(--paper-line);border-radius:0;padding:2px 4px;resize:none;overflow:hidden;box-shadow:none}
.paper textarea::placeholder,.paper input::placeholder{color:#94a3b8;font-weight:600;font-size:14px}
.paper textarea:focus,.paper input:focus{outline:0;border-bottom:2px solid var(--pen)}
.paraf{display:block;margin:2px 0 0 auto;width:54px;height:15px;color:var(--pen);opacity:.85}
.paraf-btn{display:inline-flex;align-items:center;gap:8px;border:1.5px dashed var(--pen);background:rgba(30,58,138,.05);color:var(--pen);border-radius:10px;padding:6px 12px;font:800 12.5px var(--font);cursor:pointer;transition:all .15s;margin-left:auto}
.paraf-btn:hover:not(:disabled){background:rgba(30,58,138,.12)}
.paraf-btn.signed{border-style:solid;background:#ecfdf5;border-color:#059669;color:#065f46}
.paraf-btn .paraf{margin:0;width:50px;height:15px;color:currentColor}
.sep{height:0;border-top:1.5px solid var(--paper-line);margin:10px 0 12px}
.pro-title{font:800 11.5px var(--font);text-transform:uppercase;letter-spacing:.3px;color:#475569;margin-bottom:6px}
.pro{display:grid;grid-template-columns:minmax(0,1fr);gap:10px;margin-top:4px}
@media(min-width:520px){.pro{grid-template-columns:repeat(2,minmax(0,1fr))}}
.pro label{display:flex;flex-direction:column;align-items:stretch;gap:3px;font:800 12.5px var(--font);color:#334155;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:10px;padding:7px 10px}
.pro label input{font:700 15px var(--font);color:var(--pen);border-bottom:1.5px dashed var(--paper-line);padding:2px 0}
.keyp{font:700 15px/1.65 var(--font);color:var(--pen);white-space:pre-wrap;overflow-wrap:break-word;word-break:normal}
.quick{display:flex;gap:6px;overflow-x:auto;padding:10px 2px 2px;margin-top:10px;scrollbar-width:none;width:100%;max-width:100%;-webkit-overflow-scrolling:touch}
.quick::-webkit-scrollbar{display:none}
.quick button{flex:none;border:2px solid var(--line);border-bottom-width:3px;background:var(--card);border-radius:11px;padding:6px 11px;font:800 12.5px var(--font);color:var(--text)}
.hint{font-size:12.5px;color:var(--muted);font-weight:600;margin-top:8px;line-height:1.5;overflow-wrap:break-word}
/* kuis */
.q{font-size:17px;font-weight:800;line-height:1.5;margin:12px 0 6px;overflow-wrap:break-word}
.q-meta{display:flex;justify-content:space-between;align-items:center;gap:10px;font-size:13px;color:var(--muted);font-weight:800}
.opt-text{white-space:pre-line;overflow-wrap:break-word;min-width:0;flex:1}
/* daftar, form, hitung */
input.f,select.f,textarea.f{font:700 14.5px/1.45 var(--font);color:var(--text);background:var(--card);border:2px solid var(--line);border-radius:14px;padding:10px 12px;width:100%;max-width:100%;min-width:0}
textarea.f{min-height:80px;resize:vertical;font-weight:600}
label.l{display:block;font-size:12.5px;font-weight:800;color:var(--muted);margin:0 0 6px}
.fgrid{display:grid;grid-template-columns:minmax(0,1fr);gap:14px;margin-top:12px;width:100%;min-width:0}
@media(min-width:600px){.fgrid.c3{grid-template-columns:repeat(3,minmax(0,1fr))}.fgrid.c2{grid-template-columns:repeat(2,minmax(0,1fr))}}
.out{margin-top:14px;padding:12px 14px;border-radius:16px;background:var(--green-soft);font-weight:900;font-size:16px;line-height:1.45;overflow-wrap:break-word}
.seg{display:flex;gap:7px;flex-wrap:wrap;width:100%;min-width:0}
.seg button{border:2px solid var(--line);border-bottom-width:3px;background:var(--card);border-radius:12px;padding:8px 12px;font-weight:800;font-size:13px;line-height:1.3;text-align:center;min-width:0}
.seg button[aria-pressed="true"]{background:var(--green);border-color:var(--green-dark);color:var(--on-green)}
.seg.sub-seg{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
@media(min-width:640px){.seg.sub-seg.cols4{grid-template-columns:repeat(4,minmax(0,1fr))}.seg.sub-seg.cols3{grid-template-columns:repeat(3,minmax(0,1fr))}}
.racik-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;width:100%;min-width:0}
@media(min-width:640px){.racik-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
.racik-grid button{border:2px solid var(--line);border-bottom-width:3px;background:var(--card);border-radius:14px;padding:9px 11px;font-weight:800;font-size:13px;line-height:1.3;text-align:left;display:flex;align-items:center;gap:8px;min-width:0}
.racik-grid button .rno{flex:none;width:24px;height:24px;border-radius:8px;background:var(--surface);color:var(--text);display:grid;place-items:center;font-size:12px;font-weight:900}
.racik-grid button .rlbl{min-width:0;flex:1;overflow-wrap:break-word}
.racik-grid button[aria-pressed="true"]{background:var(--green);border-color:var(--green-dark);color:var(--on-green)}
.racik-grid button[aria-pressed="true"] .rno{background:rgba(255,255,255,.25);color:#fff}
details.dt{border:2px solid var(--line);border-radius:16px;background:var(--card);padding:0;width:100%;max-width:100%;min-width:0;overflow:hidden}
details.dt+details.dt{margin-top:8px}
details.dt>summary{list-style:none;cursor:pointer;padding:12px 14px;font-weight:800;display:flex;gap:8px;justify-content:space-between;align-items:center;min-width:0}
details.dt>summary::-webkit-details-marker{display:none}
details.dt>summary::after{content:"+";font-weight:900;color:var(--muted);flex:none}
details.dt[open]>summary::after{content:"−"}
details.dt>.in{padding:0 14px 14px;min-width:0;overflow-wrap:break-word}
.item{padding:11px 0;border-top:2px solid var(--line);min-width:0;line-height:1.55}.item:first-child{border-top:0}
.kv{display:grid;grid-template-columns:minmax(0,1fr);gap:7px;font-size:13.5px;font-weight:600;line-height:1.55;min-width:0;overflow-wrap:break-word}.kv b{font-weight:800}
.mono{font-family:ui-monospace,Menlo,Consolas,monospace;font-weight:700;overflow-wrap:break-word}
.sc{display:grid;gap:10px;margin-top:10px}
.sc .r{display:grid;grid-template-columns:1fr auto;gap:4px 10px;align-items:center;font-weight:800;font-size:14px}
.sc .r .progress{grid-column:1/-1;height:10px}
.big{font-size:40px;line-height:1;font-weight:900;letter-spacing:-1px}
@media(prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}

.paper textarea:disabled,.paper input:disabled{opacity:1;-webkit-text-fill-color:var(--pen);color:var(--pen)}
.blk-f{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:2px;min-height:24px}
.lnk{border:0;background:none;padding:6px 0;font:700 12.5px var(--font);color:var(--rxb);text-decoration:underline;min-height:30px;text-align:left}
.ln:not(.l2){align-items:flex-start}
.tabs[hidden]{display:none}
.answer .mk{color:#fff}
.answer:not(.sel):not(.good):not(.bad):not(.alt) .mk{color:transparent}
.answer.miss .mk{color:transparent}

/* ===== BUNGKUS OBAT & LEMBAR PENGAMATAN (GAMBAR 1 & GAMBAR 2) ===== */
.pkg-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:14px;margin-top:14px;width:100%;min-width:0}
@media(min-width:680px){.pkg-grid{grid-template-columns:230px minmax(0,1fr)}}
.pkg-photo-box{display:flex;flex-direction:column;align-items:center;justify-content:center;background:#fff;border:2px solid var(--line);border-radius:16px;padding:12px;position:relative;overflow:hidden;min-height:190px;width:100%;min-width:0}
.pkg-photo-box img{max-width:100%;max-height:185px;object-fit:contain;border-radius:8px;cursor:zoom-in;transition:transform .2s}
.pkg-photo-box img:hover{transform:scale(1.04)}
.pkg-zoom-hint{margin-top:8px;font-size:11.5px;font-weight:800;color:#4b5563;background:#f3f4f6;padding:4px 10px;border-radius:99px;border:1px solid #e5e7eb;text-align:center}
.pkg-back{background:var(--surface);border:2px solid var(--line);border-radius:16px;padding:14px;display:grid;grid-template-columns:minmax(0,1fr);gap:9px;align-content:start;width:100%;min-width:0}
.pkg-back-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;border-bottom:2px dashed var(--line);padding-bottom:10px;min-width:0}
.pkg-back-list{display:grid;grid-template-columns:minmax(0,1fr);gap:7px;font-size:13.5px;line-height:1.55;min-width:0;overflow-wrap:break-word}
.pkg-back-list.blurred{filter:blur(6px);user-select:none;pointer-events:none}
.gol-pill{display:inline-flex;align-items:center;gap:7px;padding:4px 11px;border-radius:99px;font-size:12px;font-weight:800;border:1.5px solid var(--line);background:var(--card);max-width:100%}
.gol-dot{width:20px;height:20px;border-radius:50%;border:2px solid #111;display:inline-grid;place-items:center;font-weight:900;font-size:11px;line-height:1;flex:none}
.gol-dot.keras{background:#e11d48;color:#111}
.gol-dot.bebas_terbatas{background:#1d4ed8;color:#fff}
.gol-dot.bebas{background:#16a34a;color:#fff}
.gol-dot.jamu{background:#fff;border-color:#15803d;color:#15803d;font-size:12px}
.pno-box{background:#111;color:#fff;padding:5px 10px;border-radius:8px;font-size:11.5px;font-weight:800;line-height:1.4;display:inline-block;max-width:100%;overflow-wrap:break-word}
/* Lembar Pengamatan Worksheet (Gambar 2) */
.lp-sheet{border:2px solid var(--line);border-radius:16px;overflow:hidden;background:var(--card);margin-top:14px;width:100%;max-width:100%;min-width:0}
.lp-sheet-head{background:var(--surface);padding:12px 14px;border-bottom:2px solid var(--line);text-align:center}
.lp-sheet-head h3{margin:0 0 2px;font-size:15px;letter-spacing:.3px;text-transform:uppercase}
.lp-form-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;padding:14px;width:100%;min-width:0}
@media(min-width:640px){.lp-form-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
.lp-col{background:var(--surface);border:2px solid var(--line);border-radius:14px;padding:12px;display:flex;flex-direction:column;gap:7px;min-width:0;width:100%}
.lp-col.full{grid-column:1/-1}
.lp-col.good{border-color:var(--green);background:var(--green-soft)}
.lp-col.partial{border-color:#e0a800;background:var(--amber-soft)}
.lp-col.bad{border-color:var(--red);background:var(--red-soft)}
.lp-col-title{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:13px;font-weight:900;min-width:0}
.lp-col-code{display:inline-grid;place-items:center;width:24px;height:24px;border-radius:7px;background:var(--green);color:var(--on-green);font-size:12px;font-weight:900;flex:none;margin-right:4px}
.lp-chips{display:flex;gap:5px;flex-wrap:wrap;margin-top:2px;min-width:0}
.lp-chips button{border:1.5px solid var(--line);background:var(--card);border-radius:8px;padding:5px 9px;font-size:11.5px;font-weight:800;text-align:left;max-width:100%}
.lp-chips button:hover{border-color:var(--rxb)}
/* Tabel Rekap Lembar Pengamatan & Scroll Horizontal Desktop/Tablet/Mobile */
.lp-scroll-bar{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-top:12px;padding:8px 12px;background:var(--surface);border:1.5px solid var(--line);border-radius:12px;font-size:12.5px;font-weight:800}
.lp-scroll-btns{display:flex;gap:6px;align-items:center}
.lp-scroll-btns button{border:1.5px solid var(--line);border-bottom-width:3px;background:var(--card);border-radius:9px;padding:5px 10px;font-size:12px;font-weight:900}
.lp-table-wrap{display:block;width:0;min-width:100%;max-width:100%;overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain;border:2px solid var(--line);border-radius:14px;background:var(--card);margin-top:8px;scrollbar-width:thin;cursor:grab}
.lp-table-wrap:active{cursor:grabbing}
.lp-table-wrap::-webkit-scrollbar{height:10px}
.lp-table-wrap::-webkit-scrollbar-track{background:var(--surface);border-radius:8px}
.lp-table-wrap::-webkit-scrollbar-thumb{background:var(--green);border-radius:8px}
table.lp-tbl{width:100%;border-collapse:collapse;min-width:1120px;font-size:13px;line-height:1.5}
table.lp-tbl th,table.lp-tbl td{border:1.5px solid var(--line);padding:10px 12px;vertical-align:top;text-align:left;overflow-wrap:break-word;word-break:normal}
table.lp-tbl th{background:var(--surface);font-weight:900;font-size:11.5px;text-transform:uppercase;letter-spacing:.3px;position:sticky;top:0;z-index:2}
table.lp-tbl td.lp-cell-hide,.lp-mitem.lp-cell-hide,.calc-hide.lp-cell-hide{filter:blur(5px);cursor:pointer;user-select:none;transition:filter .15s}
table.lp-tbl td.lp-cell-hide:hover,.lp-mitem.lp-cell-hide:hover,.calc-hide.lp-cell-hide:hover{filter:blur(2px)}
table.lp-tbl tr:nth-child(even) td{background:rgba(128,128,128,.04)}
.tbl-thumb{width:54px;height:54px;object-fit:contain;background:#fff;border:1px solid var(--line);border-radius:8px;padding:2px;cursor:zoom-in;display:block;margin-bottom:4px;flex:none}
/* Kartu Rekap Lembar Pengamatan (a)-(f) untuk Mobile */
.lp-mcards{display:grid;grid-template-columns:minmax(0,1fr);gap:14px;margin-top:12px;width:100%;min-width:0}
.lp-mcard{background:var(--surface);border:2px solid var(--line);border-radius:18px;padding:14px;display:grid;grid-template-columns:minmax(0,1fr);gap:10px;width:100%;min-width:0}
.lp-mcard-head{display:flex;gap:12px;align-items:flex-start;border-bottom:2px dashed var(--line);padding-bottom:10px;min-width:0;flex-wrap:wrap}
.lp-mcard-head img{width:64px;height:64px;object-fit:contain;background:#fff;border:1.5px solid var(--line);border-radius:10px;padding:4px;flex:none;cursor:zoom-in}
.lp-mcard-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:8px;width:100%;min-width:0}
@media(min-width:600px){.lp-mcard-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
.lp-mitem{background:var(--card);border:1.5px solid var(--line);border-radius:12px;padding:10px 12px;font-size:13px;line-height:1.5;min-width:0;overflow-wrap:break-word}
.lp-mitem>b{display:block;font-size:11.5px;font-weight:900;color:var(--green-dark);text-transform:uppercase;letter-spacing:.2px;margin-bottom:3px}
/* Layout Ergonomis Panduan, Racikan & Perbandingan BSO */
.racik-summary{background:var(--surface);border:1.5px solid var(--line);border-radius:14px;padding:11px 14px;margin-top:10px;font-size:13.5px;line-height:1.55}
.calc-list,.func-list{display:grid;grid-template-columns:minmax(0,1fr);gap:10px;margin-top:10px;width:100%;min-width:0}
.calc-item,.func-item{background:var(--surface);border:2px solid var(--line);border-radius:14px;padding:12px 14px;display:grid;grid-template-columns:minmax(0,1fr);gap:6px;min-width:0}
@media(min-width:680px){
  .calc-item{grid-template-columns:190px minmax(0,1fr) auto;align-items:center;gap:12px}
  .func-item{grid-template-columns:190px 210px minmax(0,1fr);align-items:start;gap:12px}
}
.calc-name,.func-name{font-weight:900;font-size:14.5px;color:var(--text);line-height:1.35}
.calc-formula{font-size:13.5px;color:var(--muted);font-weight:700;line-height:1.45}
.calc-take{display:inline-flex;align-items:center;justify-self:start;background:var(--green-soft);color:var(--green-dark);font-weight:900;font-size:13px;padding:6px 11px;border-radius:10px;line-height:1.35}
.func-desc{font-size:13.5px;line-height:1.55;color:var(--text)}
.step-list{list-style:none;margin:10px 0 0;padding:0;display:grid;gap:8px}
.step-list li{display:flex;gap:10px;align-items:flex-start;background:var(--surface);border:1.5px solid var(--line);border-radius:13px;padding:10px 13px;font-size:14px;line-height:1.55}
.step-list li .sno{flex:none;width:24px;height:24px;border-radius:8px;background:var(--green);color:var(--on-green);font-weight:900;font-size:12.5px;display:grid;place-items:center;margin-top:1px}
.bso-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;margin-top:12px;width:100%;min-width:0}
@media(min-width:780px){.bso-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
.bso-card{background:var(--surface);border:2px solid var(--line);border-radius:16px;padding:14px;display:flex;flex-direction:column;gap:9px;min-width:0}
.bso-card-head{border-bottom:2px dashed var(--line);padding-bottom:8px}
.bso-card-head h4{margin:0;font-size:15.5px;font-weight:900;color:var(--text)}
.bso-kv{font-size:13px;line-height:1.5}
.bso-kv b{display:block;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.3px;color:var(--muted);margin-bottom:1px}
/* Etiket Apotek YARSI */
.etiket{border:2px solid #1e293b;border-radius:12px;padding:14px 15px;font-size:13px;line-height:1.55;color:#0f172a;width:100%;box-shadow:0 2px 8px rgba(15,23,42,.08);overflow-wrap:break-word}
.etiket.putih{background:#ffffff}
.etiket.biru{background:#e0f2fe;border-color:#0369a1}
.etiket-head{text-align:center;border-bottom:2px solid #1e293b;padding-bottom:6px;margin-bottom:8px;font-weight:900;font-size:13px;letter-spacing:.3px}
/* Lightbox Modal */
.rx-modal{position:fixed;inset:0;background:rgba(10,15,25,.82);z-index:9999;display:grid;place-items:center;padding:16px}
.rx-modal[hidden]{display:none}
.rx-modal-box{background:#fff;color:#111;border-radius:20px;max-width:560px;width:100%;padding:16px;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,.45)}
.rx-modal-box img{max-width:100%;max-height:68vh;object-fit:contain;border-radius:10px}
`;

/* ===== STATE & ROUTER ===== */
const STEPS_FULL=[{k:'v'},{k:'s1',n:1,w:20},{k:'s3',n:3,w:25},{k:'s4',n:4,w:35},{k:'s5',n:5,w:20},{k:'res'}];
const STEPS_RX=[{k:'v'},{k:'s4',n:4,w:35},{k:'res'}];
let STEPS=STEPS_FULL;
const stOf=k=>STEPS_FULL.find(x=>x.k===k);
const isMobileViewport=()=>typeof window!=='undefined'&&window.innerWidth<640;
const S={
  only:false,
  tab:'kasus',
  case:null,
  exam:false,
  step:0,
  f:null,
  chk:{},
  xpGiven:null,
  caseXpTotal:0,
  sessionXp:0,
  t0:0,
  tm:null,
  quiz:null,
  foc:{i:0,f:'l1'},
  sub:{sed:'lp',sing:'kuis',pad:'kuis',pan:'racik'},
  lp:{idx:0,examMode:false,hideLabel:false,checked:false,isExample:false,xpCols:{},lastXpGain:0,form:{a:'',b:'',c:'',d:'',e:'',fR:'',fS:'',fParaf:false,fPro:'',fUmur:''},tblFilter:'all',tblSearch:'',tblHide:false,tblMode:'auto',revealed:{}},
  racik:{idx:0,hideCalc:false}
};

/* ===== REWARD EXP FARMAKOLOGI (+10 EXP SETIAP JAWABAN BENAR) ===== */
const XP_PER_CORRECT=10;
function getTotalXP(){
  try{
    const raw=localStorage.getItem('gaster_v11_xp');
    return Math.max(0,Number(raw?JSON.parse(raw):0)||0);
  }catch{return 0;}
}
function updateHeaderXP(){
  const el=gid('resepXpLiveBadge');
  if(!el)return;
  const total=getTotalXP();
  el.textContent=`⚡ ${total} XP${S.sessionXp?` (+${S.sessionXp} EXP sesi ini)`:''}`;
}
function awardFarmakoXP(correctCount,reason,refPrefix,silentPopup=false){
  const n=Math.max(0,Math.floor(Number(correctCount)||0));
  if(!n)return 0;
  const totalGain=n*XP_PER_CORRECT;
  S.sessionXp=(S.sessionXp||0)+totalGain;
  const stamp=Date.now().toString(36)+Math.random().toString(36).slice(2,5);
  const xpBefore=getTotalXP();
  if(typeof window!=='undefined'&&typeof window.addXP==='function'){
    const label=n===1?`${reason} (+${XP_PER_CORRECT} EXP)`:`${reason} (${n} benar × ${XP_PER_CORRECT} EXP)`;
    for(let i=0;i<n;i++){
      const isLast=(i===n-1);
      try{
        window.addXP(
          XP_PER_CORRECT,
          label,
          {
            kind:'materi',
            ref:`${refPrefix||'farmako'}:${i}:${stamp}`.slice(0,80),
            silent:silentPopup||n>1||!isLast
          }
        );
      }catch{}
    }
    const xpAfter=getTotalXP();
    const leveledUp=Math.floor(xpAfter/100)>Math.floor(xpBefore/100);
    if(!silentPopup&&n>1&&typeof window.showXPPopup==='function'){
      try{window.showXPPopup(totalGain,label,leveledUp);}catch{}
    }
  }
  updateHeaderXP();
  return totalGain;
}
function awardCaseStepXP(st,silentPopup=false){
  const c=S.case,f=S.f;
  if(!c||!f||!S.xpGiven)return 0;
  let n=0,reason=`Kasus #${c.id}`;
  if(st==='s1'){
    if(f.dx===c.dx&&!S.xpGiven.s1){
      S.xpGiven.s1=true;
      n=1;
      reason=`Kasus #${c.id} • Diagnosis benar`;
    }
  }else if(st==='s3'){
    const j=judge3();
    for(const p of f.picks){
      const lc=p.toLowerCase();
      if((j.req.includes(lc)||j.alt.includes(lc))&&!S.xpGiven.s3[lc]){
        S.xpGiven.s3[lc]=true;
        n++;
      }
    }
    reason=`Kasus #${c.id} • Pilihan obat benar`;
  }else if(st==='s4'){
    const r=checkResep(c,f);
    for(const o of r.out){
      if(!o.miss&&o.r&&o.r.pts===o.r.max&&!S.xpGiven.s4Rows[o.idx]){
        S.xpGiven.s4Rows[o.idx]=true;
        n++;
      }
    }
    const activeRows=(f.rows||[]).filter(x=>x.l1.trim()||x.l2.trim());
    if(r.parafOk&&activeRows.length>0&&activeRows.every(x=>x.paraf)&&!S.xpGiven.s4Paraf){
      S.xpGiven.s4Paraf=true;
      n++;
    }
    if(r.proOk&&r.usiaOk&&!S.xpGiven.s4Id){
      S.xpGiven.s4Id=true;
      n++;
    }
    reason=`Kasus #${c.id} • Penulisan resep benar`;
  }else if(st==='s5'){
    for(const idx of f.l5){
      if(!S.xpGiven.s5[idx]){
        S.xpGiven.s5[idx]=true;
        n++;
      }
    }
    reason=`Kasus #${c.id} • Informasi pasien benar`;
  }
  if(!n)return 0;
  const gained=awardFarmakoXP(n,reason,`farmako:case:${c.id}:${st}`,silentPopup);
  S.caseXpTotal=(S.caseXpTotal||0)+gained;
  return gained;
}

const TABS=[['kasus','Kasus'],['sediaan','Sediaan & Bungkus'],['panduan','Panduan & Racikan'],['singkatan','Singkatan'],['padat','BSO padat'],['hitung','Hitung']];
function renderTabs(){$('#tabs').hidden=false;$('#tabs').innerHTML=TABS.map(([k,l])=>`<button class="tab" role="tab" aria-selected="${S.tab===k}" data-tab="${k}">${l}</button>`).join('')}
function go(tab){stopTimer();S.tab=tab;S.quiz=null;S.case=null;renderTabs();render();scrollTo({top:0})}
function render(){updateHeaderXP();const m=$('#app');({kasus:viewKasus,sediaan:viewSediaan,panduan:viewPanduan,singkatan:viewSingk,padat:viewPadat,hitung:viewHitung})[S.tab](m);fitAll()}
const P=(label,act,dis,extra='')=>`<button class="primary" data-act="${act}" ${extra} ${dis?'disabled':''}>${label}</button>`;
const X=(label,act,extra='')=>`<button class="secondary" data-act="${act}" ${extra}>${label}</button>`;
const acts=(p,s)=>`<div class="actions ${s?'two':''}">${p}${s||''}</div>`;

/* ===== HELPER VISUAL GOLONGAN OBAT ===== */
const GOL_INFO={
  keras:{label:'Obat Keras (Dengan Resep Dokter)',cls:'keras',sym:'K',warn:'HARUS DENGAN RESEP DOKTER'},
  bebas_terbatas:{label:'Obat Bebas Terbatas',cls:'bebas_terbatas',sym:'●',warn:'AWAS! OBAT KERAS'},
  bebas:{label:'Obat Bebas',cls:'bebas',sym:'●',warn:''},
  jamu:{label:'Jamu / Obat Tradisional',cls:'jamu',sym:'🌿',warn:''}
};
const PNO_TEXT={
  'P.No.1':'P.No.1: Awas! Obat Keras. Bacalah aturan memakainya.',
  'P.No.2':'P.No.2: Awas! Obat Keras. Hanya untuk kumur, jangan ditelan.',
  'P.No.3':'P.No.3: Awas! Obat Keras. Hanya untuk bagian luar dari badan.',
  'P.No.4':'P.No.4: Awas! Obat Keras. Hanya untuk dibakar.',
  'P.No.5':'P.No.5: Awas! Obat Keras. Tidak boleh ditelan.',
  'P.No.6':'P.No.6: Awas! Obat Keras. Obat wasir, jangan ditelan.'
};
function golBadgeHtml(s){
  const g=GOL_INFO[s.gol]||GOL_INFO.keras;
  const pno=s.pNo&&PNO_TEXT[s.pNo]?`<div class="pno-box" style="margin-top:4px">${esc(PNO_TEXT[s.pNo])}</div>`:'';
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center"><span class="gol-pill"><span class="gol-dot ${g.cls}">${g.sym}</span><span>${esc(g.label)}</span></span>${s.pNo?`<span class="badge blue">${esc(s.pNo)}</span>`:''}</div>${pno}`;
}

/* ===== DAFTAR KASUS ===== */
function viewKasus(m){
  $('#tabs').hidden=!!S.case;
  if(S.case)return viewCase(m);
  const best=bestMap(),passed=CASES.filter(c=>((best[c.id+(S.only?'r':'')]||{}).pct||0)>=80).length,todo=CASES.filter(c=>((best[c.id+(S.only?'r':'')]||{}).pct||0)<80);
  m.innerHTML=`<div class="note"><b>Penting.</b> Kunci jawaban dari catatan mahasiswa (Bella &amp; Syaf), bukan sumber resmi. Bagian yang bertentangan ditandai dan kedua versi diterima. Buka Catatan verifikasi di hasil tiap kasus.</div>
  <div class="card"><h2>Latihan kasus</h2><p class="sub">Diagnosis, pilihan obat, resep, dan informasi dinilai. Setiap jawaban benar memberikan <b>+10 EXP</b>.</p>
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
  S.xpGiven={s1:false,s3:{},s4Rows:{},s4Paraf:false,s4Id:false,s5:{}};
  S.caseXpTotal=0;
  S.f={dx:'',dxOpts,obatOpts,picks:[],rows:[{l1:'',l2:'',paraf:false}],pro:'',usia:'',l5:[],note:''};
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
const stepHead=st=>S.only?`<div class="step-h"><span class="badge">Tulis resep</span><span class="badge blue">⚡ +10 EXP / benar</span></div>`:`<div class="step-h"><span class="badge">Langkah ${st.n}</span><span class="muted">bobot ${st.w}</span><span class="badge blue">⚡ +10 EXP / benar</span></div>`;
const prevBtn=()=>S.exam?X('Sebelumnya','prev'):'';
function stepV(){
  const c=S.case;
  return `<section class="card"><div class="step-h"><span class="badge">Kasus ${c.id}</span>${S.exam?'<span class="badge warn">Mode ujian</span>':''}</div><p class="vignette">${esc(c.v)}</p><div class="pt">Pasien untuk resep: <b>${esc(c.pro)}</b>, ${c.usia} tahun.</div>${acts(P('Mulai','next'))}</section>`;
}
function answerBtn(label,{r,cls='',dis,attr,mk}){return `<button class="answer ${r?'r':''} ${cls}" ${attr} ${dis?'disabled':''}><span class="mk">${mk??'✓'}</span><span class="opt-text">${esc(label)}</span></button>`}
function stepS1(){
  const c=S.case,f=S.f,d=!!S.chk.s1,st=stOf('s1');
  const list=f.dxOpts.map((o,i)=>{let cl='';if(d)cl=o===c.dx?'good':(o===f.dx?'bad':'');else if(o===f.dx)cl='sel';return answerBtn(o,{r:1,cls:cl,dis:d,attr:`data-dx="${i}"`,mk:'●'})}).join('');
  const fb=d?`<div role="status" class="fb ${f.dx===c.dx?'good':'bad'}"><b>${f.dx===c.dx?'Benar. <span class="tag good" style="margin-left:6px">⚡ +10 EXP</span>':'Jawaban: '+esc(c.dx)}</b><details class="dt" style="margin-top:10px"><summary>Langkah 2: tujuan terapi (baca saja)</summary><div class="in"><ul>${c.tujuan.map(t=>`<li>${esc(t)}</li>`).join('')}</ul></div></details></div>`:'';
  const a=S.exam?acts(P('Lanjut','next'),prevBtn()):d?acts(P('Lanjut','next'),X('Coba lagi','retry')):acts(P('Periksa','check',!f.dx));
  return `<section class="card">${stepHead(st)}<h2>Apa diagnosis pasien?</h2><div class="answers">${list}</div>${fb}${a}</section>`;
}
function judge3(){const c=S.case,f=S.f,req=c.p.map(x=>x.toLowerCase()),alt=c.a.map(x=>x.toLowerCase());
  const hit=f.picks.filter(p=>req.includes(p.toLowerCase())).length,altHit=f.picks.filter(p=>alt.includes(p.toLowerCase())).length,wrong=f.picks.filter(p=>!req.includes(p.toLowerCase())&&!alt.includes(p.toLowerCase())).length;
  return{req,alt,hit,altHit,wrong,need:req.length}}
function stepS3(){
  const c=S.case,f=S.f,d=!!S.chk.s3,st=stOf('s3'),j=judge3(),correctDrugs=j.hit+(j.altHit||0);
  const list=f.obatOpts.map((o,i)=>{const on=f.picks.includes(o),lc=o.toLowerCase();let cl='';
    if(d){if(j.req.includes(lc))cl=on?'good':'miss';else if(j.alt.includes(lc))cl=on?'alt':'';else cl=on?'bad':''}else if(on)cl='sel';
    return answerBtn(o+(d&&j.alt.includes(lc)?' (alternatif di catatan)':''),{cls:cl,dis:d,attr:`data-obat="${i}"`,mk:d&&cl==='bad'?'✕':'✓'})}).join('');
  const fb=d?`<div role="status" class="fb ${j.hit===j.need&&!j.wrong?'good':'bad'}"><b>${j.hit} dari ${j.need} obat wajib terpilih${j.wrong?`, ${j.wrong} pilihan tidak sesuai`:''}.${correctDrugs?` <span class="tag good" style="margin-left:6px">⚡ +${correctDrugs*XP_PER_CORRECT} EXP (${correctDrugs} obat benar)</span>`:''}</b><div style="margin-top:8px"><span class="tag good">hijau benar</span><span class="tag bad">merah tidak sesuai</span><span class="tag" style="background:var(--amber-soft);color:var(--amber)">kuning terlewat</span><span class="tag" style="background:var(--rxbs);color:var(--rxb)">biru alternatif</span></div></div>`:'';
  const a=S.exam?acts(P('Lanjut','next'),prevBtn()):d?acts(P('Lanjut','next'),X('Coba lagi','retry')):acts(P('Periksa','check',!f.picks.length));
  return `<section class="card">${stepHead(st)}<h2>Pilih obat yang tepat</h2><p class="sub">Terapi kausal dan simtomatis. Pilih semua yang sesuai.</p><div class="answers">${list}</div>${fb}${a}</section>`;
}
const SVG_PARAF='<svg class="paraf" viewBox="0 0 62 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 13c5-11 9-11 7-2s6 5 10-4c2-5 4 2 6 4s6-6 9-8c-2 6-1 9 3 8s8-3 12-6"/></svg>';
function stepS4(){
  const c=S.case,f=S.f,d=!!S.chk.s4,st=stOf('s4');
  const date=new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
  const blocks=f.rows.map((r,i)=>`<div class="blk" data-i="${i}"><div class="ln"><span class="rm">R/</span><textarea rows="1" data-f="l1" aria-label="Baris R/ obat ${i+1}" placeholder="Tab. Contoh 100 mg no. X" autocomplete="off" autocapitalize="sentences" spellcheck="false" ${d?'disabled':''}>${esc(r.l1)}</textarea></div><div class="ln l2"><span class="sm">S</span><textarea rows="1" data-f="l2" aria-label="Baris S obat ${i+1}" placeholder="3 dd tab I pc" autocomplete="off" autocapitalize="off" spellcheck="false" ${d?'disabled':''}>${esc(r.l2)}</textarea></div><div class="blk-f" style="margin-top:6px">${!d&&f.rows.length>1?`<button class="lnk" type="button" data-act="delrow" data-i="${i}">hapus R/ ini</button>`:'<span></span>'}<button type="button" class="paraf-btn ${r.paraf?'signed':''}" data-act="toggleparaf" data-i="${i}" ${d?'disabled':''}>${r.paraf?`<span>✓ Tanda Tangan / Paraf</span>${SVG_PARAF}`:'✍️ + Tambahkan Tanda Tangan / Paraf'}</button></div></div>`).join('');
  const paper=`<div class="paper"><div class="lh"><div class="lh-name">dr. ____________________</div><div class="lh-sub">SIP ______________ · Praktik umum</div></div><div class="pdate">${date}</div>${blocks}<div class="sep"></div><div class="pro-title">Identitas Pasien &amp; Umur:</div><div class="pro"><label><span>Pro (Nama Pasien):</span><input data-pro placeholder="Contoh: Tn. A / Ny. S / An. R" autocomplete="off" aria-label="Pro (nama pasien)" value="${esc(f.pro)}" ${d?'disabled':''}></label><label><span>Umur Pasien:</span><input data-usia placeholder="Contoh: 45 th" autocomplete="off" aria-label="Umur pasien" value="${esc(f.usia)}" ${d?'disabled':''}></label></div></div>`;
  const tools=d?'':`<div class="row between" style="margin-top:10px"><button class="secondary small" data-act="addrow">+ Tambah R/ (${f.rows.length}${!S.exam?`/${c.rows.length}`:''})</button>${!S.exam&&f.rows.length<c.rows.length?`<span class="sub">Kasus ini memiliki ${c.rows.length} obat pada kunci resep</span>`:''}</div>${S.exam?'':`<div class="quick" id="quick" role="toolbar" aria-label="Sisipkan singkatan"></div>`}`;
  const a=S.exam?acts(P('Lanjut','next'),prevBtn()):d?acts(P('Lanjut','next'),X('Perbaiki resep','retry')):acts(P('Periksa resep','check'));
  return `<section class="card">${stepHead(st)}<h2>Tulis resepnya</h2>${S.only?`<details class="dt" style="margin-bottom:12px"><summary>Petunjuk: diagnosis dan obat</summary><div class="in"><div><b>Diagnosis:</b> ${esc(c.dx)}</div><div style="margin-top:6px"><b>Obat:</b> ${esc([...c.p,...c.a].join(', '))}</div></div></details>`:''}<p class="sub" style="margin-bottom:12px">Pasien: <b>${esc(c.pro)}</b>, <b>${c.usia} tahun</b>. Tulis tiap obat seperti di kertas resep: baris R/ (bentuk, nama, kekuatan, jumlah), baris S (aturan pakai), klik tombol <b>Tambahkan Tanda Tangan / Paraf</b>, serta lengkapi <b>Identitas Pasien (Pro &amp; Umur)</b> di bawah resep.</p>${paper}${tools}${d?res4():''}${a}</section>`;
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
  const activeRows=(S.f.rows||[]).filter(x=>x.l1.trim()||x.l2.trim());
  const rxCorrectCount=r.out.filter(o=>!o.miss&&o.r&&o.r.pts===o.r.max).length+(r.parafOk&&activeRows.length>0&&activeRows.every(x=>x.paraf)?1:0)+(r.proOk&&r.usiaOk?1:0);
  const rows=r.out.map(o=>o.miss?`<div class="rowfb"><b>${esc(o.u.o)}</b> <span class="tag bad">tidak ada di kunci</span><div class="sub">Bisa benar secara klinis, tapi tidak ada di catatan sehingga dihitung tambahan (−1).</div></div>`:
    `<div class="rowfb"><b>${esc(o.u.o)}</b> <span class="muted">${o.r.pts}/${o.r.max}</span> ${o.r.pts===o.r.max?'<span class="tag good">⚡ +10 EXP</span>':''}<div style="margin-top:6px">${o.r.res.map(x=>`<span class="tag ${x.ok?'good':'bad'}">${x.ok?'✓':'✕'} ${x.label}${x.ok?'':': '+esc(x.exp)}</span>`).join('')}</div></div>`).join('');
  const none=r.out.length?'':`<div class="rowfb"><span class="muted">Belum ada obat yang terbaca. Tulis nama obat di baris R/.</span></div>`;
  return `<div role="status" class="fb ${r.pct>=80?'good':'bad'}"><b>Skor resep ${r.pct}%${rxCorrectCount?` <span class="tag good" style="margin-left:6px">⚡ +${rxCorrectCount*XP_PER_CORRECT} EXP (${rxCorrectCount} benar)</span>`:''}</b><div style="margin-top:8px">${rows}${none}${r.missing.length?`<div class="rowfb"><span class="tag bad">belum ada</span> ${r.missing.map(k=>esc(k.o)).join(', ')}</div>`:''}<div class="rowfb"><span class="tag ${r.parafOk?'good':'bad'}">${r.parafOk?'✓':'✕'} Tanda tangan / Paraf dokter</span><span class="tag ${r.proOk?'good':'bad'}">${r.proOk?'✓':'✕'} Pro: ${esc(c.pro)}</span><span class="tag ${r.usiaOk?'good':'bad'}">${r.usiaOk?'✓':'✕'} Umur: ${c.usia} th</span></div></div>
  <details class="dt" style="margin-top:6px"><summary>Lihat resep kunci</summary><div class="in">${keyHtml(c)}</div></details>${revHtml(c)}${c.cat?`<p class="sub" style="margin-top:10px">${esc(c.cat)}</p>`:''}</div>`;
}
function l5List(interactive){
  const c=S.case,f=S.f;
  return c.l5.map((t,i)=>{const on=f.l5.includes(i);return answerBtn(t,{cls:on?'good':'miss',dis:!interactive,attr:`data-l5="${i}"`,mk:on?'✓':''})}).join('');
}
function stepS5(){
  const c=S.case,f=S.f,d=!!S.chk.s5,st=stOf('s5');
  const note=`<label class="l" for="note" style="margin-top:12px">Catatan jawabanmu (opsional)</label><textarea class="f" id="note" placeholder="Efek samping, cara pakai, kontrol, pesan penting" >${esc(f.note)}</textarea>`;
  const body=d?`<p class="sub" style="margin-top:12px">Ketuk poin yang sudah kamu sebut (setiap poin benar mendapat +10 EXP).</p><div class="answers">${l5List(true)}</div><div class="fb ${f.l5.length?'good':''}"><b>Kamu sebut ${f.l5.length} dari ${c.l5.length}${f.l5.length?` <span class="tag good" style="margin-left:6px">⚡ +${f.l5.length*XP_PER_CORRECT} EXP</span>`:''}</b></div>`:'';
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
function finish(){
  ['s1','s3','s4','s5'].forEach(k=>S.chk[k]=true);
  const stepsToAward=S.only?['s4']:['s1','s3','s4','s5'];
  let newlyGained=0;
  for(const k of stepsToAward){newlyGained+=awardCaseStepXP(k,true)}
  if(newlyGained>0&&typeof window!=='undefined'&&typeof window.showXPPopup==='function'){
    try{window.showXPPopup(newlyGained,`Kasus #${S.case.id} selesai (+${newlyGained} EXP)`,false);}catch{}
  }
  stopTimer();S.step=STEPS.length-1;saveBest();render();scrollTo({top:0});
}
function stepRes(){
  if(S.only)return stepResRx();
  const c=S.case,sc=scores(),pass=sc.total>=80;
  const row=(l,v,mx)=>`<div class="r"><span>${l}</span><span>${Math.round(v)} / ${mx}</span><div class="progress"><i style="width:${100*v/mx}%"></i></div></div>`;
  return `<section class="card"><div class="step-h"><span class="badge ${pass?'':'warn'}">${pass?'Lulus':'Belum lulus (batas 80)'}</span><span class="muted">Kasus ${c.id}</span>${S.caseXpTotal?`<span class="badge blue">⚡ +${S.caseXpTotal} EXP diperoleh</span>`:''}</div><div class="big">${Math.round(sc.total)}%</div><div class="sc">${row('Diagnosis',sc.s1,20)}${row('Pilihan obat',sc.s3,25)}${row('Resep',sc.s4,35)}${row('Informasi pasien',sc.s5,20)}</div></section>
  <section class="card"><h2>Resep yang kamu tulis</h2>${res4()}</section>
  <section class="card"><h2>Informasi untuk pasien</h2><p class="sub">Ketuk poin yang sudah kamu sebut, skor dan EXP (+10 EXP/poin) ikut bertambah.</p><div class="answers">${l5List(true)}</div></section>
  <details class="dt"><summary>Langkah 2: tujuan terapi (baca saja)</summary><div class="in"><ul>${c.tujuan.map(t=>`<li>${esc(t)}</li>`).join('')}</ul></div></details>
  <details class="dt"><summary>Langkah 6: monitoring dan evaluasi (baca saja)</summary><div class="in"><ul>${c.mon.map(t=>`<li>${esc(t)}</li>`).join('')}</ul></div></details>
  ${acts(P('Ulangi kasus','again'),X('Kasus lain','list'))}`;
}

function stepResRx(){
  const c=S.case,sc=scores(),pass=sc.total>=80;
  return `<section class="card"><div class="step-h"><span class="badge ${pass?'':'warn'}">${pass?'Lulus':'Belum lulus (batas 80)'}</span><span class="muted">Kasus ${c.id} · tulis resep saja</span>${S.caseXpTotal?`<span class="badge blue">⚡ +${S.caseXpTotal} EXP diperoleh</span>`:''}</div><div class="big">${Math.round(sc.total)}%</div></section>
  <section class="card"><h2>Resep yang kamu tulis</h2>${res4()}</section>
  ${acts(P('Ulangi kasus','again'),X('Kasus lain','list'))}`;
}

/* ===== KUIS ===== */
function startQuiz(qs,title){S.quiz={qs,i:0,score:0,ans:null,wrong:[],title};drawQuiz()}
function drawQuiz(){
  const z=S.quiz,m=$('#quiz');if(!z||!m)return;
  if(z.i>=z.qs.length){const pct=Math.round(100*z.score/z.qs.length);
    m.innerHTML=`<div class="card"><div class="step-h"><span class="badge">${esc(z.title)}</span><span class="badge blue">⚡ +${z.score*XP_PER_CORRECT} EXP diperoleh</span></div><div class="big">${pct}%</div><p class="sub" style="margin:6px 0 12px">${z.score} dari ${z.qs.length} benar · <b>⚡ +${z.score*XP_PER_CORRECT} EXP</b></p><div class="progress"><i style="width:${pct}%"></i></div>${z.wrong.length?`<h3 style="margin-top:16px">Yang salah</h3>${z.wrong.map(w=>`<div class="item"><div>${esc(w.q)}</div><span class="tag good opt-text" style="margin-top:6px">${esc(w.a)}</span></div>`).join('')}`:'<p style="margin-top:14px">Semua benar.</p>'}${acts(P('Ulangi dengan soal baru','qagain'))}</div>`;return}
  const q=z.qs[z.i],d=z.ans!=null,pct=Math.round(100*z.i/z.qs.length);
  const imgHtml=q.img?`<div class="pkg-photo-box" style="margin-top:10px;min-height:150px"><img src="${esc(q.img)}" alt="Kemasan obat" data-zoom="${esc(q.img)}" data-zoom-title="Soal Kuis Sediaan"><span class="pkg-zoom-hint">🔍 Ketuk gambar untuk memperbesar</span></div>`:'';
  m.innerHTML=`<div class="card"><div class="q-meta"><span>${esc(z.title)} · ⚡ +10 EXP / benar</span><span>${z.i+1}/${z.qs.length}</span></div><div class="progress" style="margin-top:8px"><i style="width:${pct}%"></i></div>${imgHtml}<p class="q">${esc(q.q)}</p><div class="answers">${q.o.map((o,i)=>{let cl='';if(d){if(o===q.a)cl='good';else if(i===z.ans)cl='bad'}return answerBtn(o,{r:1,cls:cl,dis:d,attr:`data-ans="${i}"`,mk:cl==='bad'?'✕':cl==='good'?'✓':''})}).join('')}</div>${d?`<div class="fb ${q.o[z.ans]===q.a?'good':'bad'}"><b>${q.o[z.ans]===q.a?'Benar! <span class="tag good" style="margin-left:6px">⚡ +10 EXP</span>':'Belum tepat.'}</b>${q.o[z.ans]===q.a?'':` Jawaban: <span class="opt-text">${esc(q.a)}</span>`}${q.exp?`<div style="margin-top:6px;font-size:13px">${esc(q.exp)}</div>`:''}</div>${acts(P(z.i+1<z.qs.length?'Lanjut':'Lihat hasil','qnext'))}`:''}</div>`;
}
function answer(i){
  const z=S.quiz,q=z.qs[z.i];if(z.ans!=null)return;
  z.ans=i;
  if(q.o[i]===q.a){
    z.score++;
    awardFarmakoXP(1,`${z.title} • Jawaban benar`,`farmako:quiz:${S.tab}:${z.i}`);
  }else{
    z.wrong.push(q);
  }
  drawQuiz();
}
/* pilihan pengecoh: tidak boleh satu kelompok, dan tidak boleh memuat / termuat dalam jawaban benar */
function opts(a,pool,n=3,grp=()=>''){
  const al=String(a).toLowerCase(),g=grp(a);
  const ok=x=>{if(x===a)return false;const xl=String(x).toLowerCase();if(g&&grp(x)===g)return false;if(al.length>=3&&xl.length>=3&&(xl.includes(al)||al.includes(xl)))return false;return true};
  let c=[...new Set(pool)].filter(ok);
  return shuffle([a,...pick(c,n)]);
}
const subnav=(key,items)=>`<div class="seg sub-seg cols${items.length}" role="group" style="margin-top:12px">${items.map(([k,l])=>`<button aria-pressed="${S.sub[key]===k}" data-sub="${key}:${k}">${l}</button>`).join('')}</div>`;

/* ===== SEDIAAN BSO CAIR (26 OBAT GAMBAR 1 + LEMBAR PENGAMATAN GAMBAR 2) ===== */
const fb=f=>f.startsWith('serbuk injeksi')?'serbuk injeksi':f.startsWith('suspensi')?'suspensi':f.startsWith('inhaler')?'inhaler':f;
const rb=r=>/^injeksi/.test(r)?'injeksi':r.replace(/\s*\(.*\)/,'').trim();
function viewSediaan(m){
  const lpBest=lpBestMap(),doneCount=SEDIAAN.filter(s=>(lpBest[s.no]||0)>=80).length;
  m.innerHTML=`<div class="card">
    <div class="step-h"><span class="badge">Praktikum 2 · BSO Cair</span><span class="muted">DR. Dra. Risdawati Djohan, Apt., MKes</span><span class="badge blue">⚡ +10 EXP / benar</span></div>
    <h2>26 Sediaan BSO Cair, Bungkus Obat &amp; Lembar Pengamatan</h2>
    <p class="sub">Lengkap dengan foto bungkus asli &amp; label komposisi/dosis yang telah diverifikasi untuk 26 obat praktikum serta latihan Lembar Pengamatan kolom (a)–(f).</p>
    ${subnav('sed',[['lp','📝 Lembar Pengamatan'],['tabel','📋 Tabel Kunci (a)–(f)'],['daftar','📦 Bungkus & Daftar (26)'],['kuis','🎯 Kuis']])}
    <div style="margin-top:10px" class="sub">Progres Lembar Pengamatan: <b>${doneCount} / ${SEDIAAN.length}</b> obat lulus (≥80%)</div>
  </div>
  <div id="quiz"></div><div id="list"></div>`;
  if(S.sub.sed==='lp')drawLembarPengamatan();
  else if(S.sub.sed==='tabel')drawLpTable();
  else if(S.sub.sed==='daftar'){$('#list').innerHTML=`<div class="card"><input class="f" id="q" placeholder="Cari nomor, nama praktikum, merek, zat aktif, atau bentuk sediaan..." aria-label="Cari"><div id="rows" style="margin-top:12px"></div></div>`;drawSed('')}
  else if(!S.quiz)startQuiz(sedQs(),'Kuis 26 Sediaan BSO Cair');else drawQuiz();
}

function selectLpDrug(idx){
  S.lp.idx=(idx+SEDIAAN.length)%SEDIAAN.length;
  S.lp.checked=false;
  S.lp.isExample=false;
  S.lp.xpCols={};
  S.lp.lastXpGain=0;
  S.lp.form={a:'',b:'',c:'',d:'',e:'',fR:'',fS:'',fParaf:false,fPro:'',fUmur:''};
  drawLembarPengamatan();
}

function drawLembarPengamatan(){
  const s=SEDIAAN[S.lp.idx]||SEDIAAN[0],lp=s.lp||{},f=S.lp.form,d=S.lp.checked,exam=!!S.lp.examMode,lpBest=lpBestMap();
  const ev=d?evalLembarPengamatan(s,f):null;
  const colCls=c=>!d?'':(c.ok?'good':c.partial?'partial':'bad');
  const colTag=c=>!d?'':`<span class="tag ${c.ok?'good':c.partial?'warn':'bad'}" style="margin:0">${c.pts}/${c.max}${c.ok&&!S.lp.isExample?' · ⚡+10 EXP':''}</span>`;
  const chipsA=['Solutio (Larutan)','Suspensi oral','Sirup kering (Dry syrup)','Elixir','Gargle (Obat kumur)','Guttae ophthalmicae (Tetes mata)','Guttae auriculares (Tetes telinga)','Guttae nasales (Tetes hidung)','Injeksi ampul','Serbuk injeksi (Vial)','Infus IV','Emulsi oral','Lotio topikal','Enema rektal','Vaginal douche','Nebules inhalasi','Turbuhaler (DPI)','Inhaler (MDI)'];
  const chipsE=['Obat Keras (lingkaran merah K)','Obat Bebas Terbatas (lingkaran biru)','Obat Bebas (lingkaran hijau)','Jamu / Obat Tradisional','Simpan suhu <30°C, terlindung cahaya','Kocok dahulu sebelum dipakai','Rekonstitusi tahan maks. 7 hari'];

  $('#list').innerHTML=`
  <div class="card">
    <div class="row between" style="padding-bottom:12px;margin-bottom:12px;border-bottom:2px dashed var(--line)">
      <div>
        <div class="eyebrow">Mode Pengerjaan</div>
        <div class="sub">${exam?'Mode Ujian aktif: seluruh panduan, label teks, chip bantuan, dan contoh jawaban disembunyikan.':'Mode Latihan aktif: dilengkapi panduan label kemasan, chip bantuan, dan contoh penulisan.'}</div>
      </div>
      <div class="seg" role="group" aria-label="Pilih mode Lembar Pengamatan" style="width:auto">
        <button type="button" aria-pressed="${!exam}" data-lpexam="0">📖 Mode Latihan (Ada Panduan)</button>
        <button type="button" aria-pressed="${exam}" data-lpexam="1">🎯 Mode Ujian (Tanpa Panduan)</button>
      </div>
    </div>

    <div class="row between">
      <div class="grow">
        <label class="l" for="lpSelect">${exam?'Pilih Nomor Soal Obat Praktikum (1–26)':'Pilih Obat Praktikum BSO Cair (1–26 sesuai daftar Gambar 1)'}</label>
        <select class="f" id="lpSelect">
          ${SEDIAAN.map((x,i)=>{const sc=lpBest[x.no];return `<option value="${i}" ${i===S.lp.idx?'selected':''}>${exam?`Soal Obat Praktikum #${x.no}`:`#${x.no}. ${esc(x.praktikumNama)} — ${esc(x.n)} (${esc(x.tipePraktikum)})`}${sc!=null?` [Terbaik ${sc}%]`:''}</option>`}).join('')}
        </select>
      </div>
      <div class="row" style="margin-top:8px">
        <button class="secondary small" data-act="lpprev" title="Obat sebelumnya">‹ Sebelumnya</button>
        <button class="secondary small" data-act="lpnext" title="Obat berikutnya">Berikutnya ›</button>
        <button class="secondary small" data-act="lprand">🎲 Acak</button>
      </div>
    </div>

    ${exam?`
      <div class="pkg-photo-box" style="margin-top:14px;min-height:230px;padding:16px">
        <div class="step-h" style="justify-content:center;margin-bottom:10px">
          <span class="badge warn">🎯 SOAL UJIAN · OBAT PRAKTIKUM #${s.no}</span>
        </div>
        <img src="${esc(s.img)}" style="max-height:230px" alt="Kemasan Obat Praktikum #${s.no}" data-zoom="${esc(s.img)}" data-zoom-title="Soal Ujian Obat Praktikum #${s.no}">
        <span class="pkg-zoom-hint">🔍 Ketuk foto bungkus obat untuk memperbesar &amp; membaca kemasan</span>
      </div>
    `:`
      <div class="pkg-grid">
        <div class="pkg-photo-box">
          <img src="${esc(s.img)}" alt="Bungkus ${esc(s.n)}" data-zoom="${esc(s.img)}" data-zoom-title="#${s.no} ${esc(s.n)} (${esc(s.tipePraktikum)})">
          <span class="pkg-zoom-hint">🔍 Klik foto bungkus untuk zoom</span>
        </div>
        <div class="pkg-back">
          <div class="pkg-back-head">
            <div>
              <span class="badge">#${s.no} · ${esc(s.tipePraktikum)}</span>
              <h3 style="margin:4px 0 2px">${esc(s.n)}</h3>
              <div class="sub">Nama di daftar praktikum: <b>${esc(s.praktikumNama)}</b></div>
            </div>
            <button class="secondary small" data-act="lptogglelabel">${S.lp.hideLabel?'👁️ Lihat Label Bungkus':'🙈 Tutup Teks Label'}</button>
          </div>
          ${golBadgeHtml(s)}
          <div class="pkg-back-list ${S.lp.hideLabel?'blurred':''}">
            <div><b>Komposisi pada bungkus:</b> ${esc(lp.c||s.k)}</div>
            <div><b>Indikasi:</b> ${esc(s.indikasi||'-')}</div>
            <div><b>Dosis &amp; Aturan Pakai:</b> ${esc(lp.d||s.d)}</div>
            <div><b>Kemasan &amp; Fisik/Organoleptis:</b> ${esc(s.kemasan||'-')} — ${esc(s.organoleptis||'-')}</div>
            <div><b>Cara Penyimpanan:</b> ${esc(s.penyimpanan||'-')}</div>
          </div>
          ${S.lp.hideLabel?`<div class="hint">Teks label diburamkan. Ketuk "Lihat Label Bungkus" untuk menampilkan kembali, atau gunakan "🎯 Mode Ujian (Tanpa Panduan)" di atas untuk ujian penuh.</div>`:''}
        </div>
      </div>
    `}

    <div class="lp-sheet">
      <div class="lp-sheet-head">
        <h3>Lembar Pengamatan Praktikum BSO Cair ${exam?`(Mode Ujian — Obat #${s.no})`:''}</h3>
        <div class="sub">${exam?`Amati foto kemasan Obat #${s.no} di atas dan isi kolom (a) s/d (f) tanpa panduan.`:`Isi kolom (a) sampai (f) berdasarkan pengamatan bungkus obat #${s.no} (${esc(s.praktikumNama)}), lalu klik Periksa.`}</div>
      </div>
      <div class="lp-form-grid">
        <div class="lp-col ${colCls(ev?.cols.a)}">
          <div class="lp-col-title"><span><span class="lp-col-code">a</span> Nama Bentuk Sediaan</span>${colTag(ev?.cols.a)}</div>
          <input class="f" data-lp="a" placeholder="${exam?'Tulis nama bentuk sediaan...':'Contoh: Suspensi oral — Sirup kering (Dry syrup)'}" value="${esc(f.a)}">
          ${exam?'':`<div class="lp-chips">${chipsA.map(c=>`<button type="button" data-lpchip="a:${esc(c)}">${esc(c)}</button>`).join('')}</div>`}
          ${d?`<div class="sub" style="margin-top:4px"><b>${ev.cols.a.ok?'✓':'Catatan:'}</b> ${esc(ev.cols.a.msg)}<br><b>Kunci (a):</b> ${esc(ev.cols.a.key)}</div>`:''}
        </div>

        <div class="lp-col ${colCls(ev?.cols.b)}">
          <div class="lp-col-title"><span><span class="lp-col-code">b</span> Nama Obat &amp; Strength</span>${colTag(ev?.cols.b)}</div>
          <input class="f" data-lp="b" placeholder="${exam?'Tulis nama dagang/obat beserta kekuatannya...':'Contoh: Amoxsan Drops, 100 mg/ml'}" value="${esc(f.b)}">
          ${d?`<div class="sub" style="margin-top:4px"><b>${ev.cols.b.ok?'✓':'Catatan:'}</b> ${esc(ev.cols.b.msg)}<br><b>Kunci (b):</b> ${esc(ev.cols.b.key)}</div>`:''}
        </div>

        <div class="lp-col ${colCls(ev?.cols.c)}">
          <div class="lp-col-title"><span><span class="lp-col-code">c</span> Senyawa Aktif &amp; Komposisi</span>${colTag(ev?.cols.c)}</div>
          <textarea class="f" rows="2" style="min-height:64px" data-lp="c" placeholder="${exam?'Tulis zat aktif dan komposisi sesuai kemasan...':'Contoh: Amoksisilin trihidrat setara amoksisilin 100 mg/ml'}">${esc(f.c)}</textarea>
          ${d?`<div class="sub" style="margin-top:4px"><b>${ev.cols.c.ok?'✓':'Catatan:'}</b> ${esc(ev.cols.c.msg)}<br><b>Kunci (c):</b> ${esc(ev.cols.c.key)}</div>`:''}
        </div>

        <div class="lp-col ${colCls(ev?.cols.d)}">
          <div class="lp-col-title"><span><span class="lp-col-code">d</span> Cara Pemakaian &amp; Dosis</span>${colTag(ev?.cols.d)}</div>
          <textarea class="f" rows="2" style="min-height:64px" data-lp="d" placeholder="${exam?'Tulis rute/cara pemakaian dan dosis...':'Contoh: Oral (pipet tetes): Anak 20-40 mg/kgBB/hari dibagi 3 dosis (tiap 8 jam 1 ml) sesudah makan'}">${esc(f.d)}</textarea>
          ${d?`<div class="sub" style="margin-top:4px"><b>${ev.cols.d.ok?'✓':'Catatan:'}</b> ${esc(ev.cols.d.msg)}<br><b>Kunci (d):</b> ${esc(ev.cols.d.key)}</div>`:''}
        </div>

        <div class="lp-col full ${colCls(ev?.cols.e)}">
          <div class="lp-col-title"><span><span class="lp-col-code">e</span> Keterangan (Golongan Obat &amp; Cara Penyimpanan)</span>${colTag(ev?.cols.e)}</div>
          <textarea class="f" rows="2" style="min-height:58px" data-lp="e" placeholder="${exam?'Tulis golongan obat (Keras/Bebas Terbatas/Bebas/Jamu) dan cara penyimpanannya...':'Contoh: Obat Keras (lingkaran merah huruf K); simpan pada suhu <30°C, kering & terlindung cahaya'}">${esc(f.e)}</textarea>
          ${exam?'':`<div class="lp-chips">${chipsE.map(c=>`<button type="button" data-lpchip="e:${esc(c)}">${esc(c)}</button>`).join('')}</div>`}
          ${d?`<div class="sub" style="margin-top:4px"><b>${ev.cols.e.ok?'✓':'Catatan:'}</b> ${esc(ev.cols.e.msg)}<br><b>Kunci (e):</b> ${esc(ev.cols.e.key)}</div>`:''}
        </div>

        <div class="lp-col full ${colCls(ev?.cols.f)}">
          <div class="lp-col-title"><span><span class="lp-col-code">f</span> Penulisan Resep (Baris R/, S, Tanda Tangan &amp; Identitas Pasien)</span>${colTag(ev?.cols.f)}</div>
          <div class="paper" style="padding:14px 16px">
            <div class="lh"><div class="lh-name">dr. ____________________</div><div class="lh-sub">SIP ______________ · Praktik umum</div></div>
            <div class="pdate">${new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'})}</div>
            <div class="ln"><span class="rm">R/</span><input data-lp="fR" placeholder="${exam?'Tulis baris R/ ...':'Drops Amoxsan 100 mg/ml fl. I'}" value="${esc(f.fR)}" autocomplete="off" spellcheck="false"></div>
            <div class="ln l2" style="margin-top:6px"><span class="sm">S</span><input data-lp="fS" placeholder="${exam?'Tulis baris S (signatura) ...':'3 dd gtt oral 1 ml pc'}" value="${esc(f.fS)}" autocomplete="off" spellcheck="false"></div>
            <div class="blk-f" style="margin-top:8px">
              <span></span>
              <button type="button" class="paraf-btn ${f.fParaf?'signed':''}" data-act="lpparaf">
                ${f.fParaf?`<span>✓ Tanda Tangan / Paraf Ditambahkan</span>${SVG_PARAF}`:'✍️ + Tambahkan Tanda Tangan / Paraf'}
              </button>
            </div>
            <div class="sep"></div>
            <div class="pro-title">Identitas Pasien &amp; Umur:</div>
            <div class="pro">
              <label><span>Pro (Nama Pasien):</span><input data-lp="fPro" placeholder="${exam?'Tulis nama pasien (Pro)...':'Contoh: Tn. A / An. B'}" value="${esc(f.fPro||'')}" autocomplete="off"></label>
              <label><span>Umur Pasien:</span><input data-lp="fUmur" placeholder="${exam?'Tulis umur pasien...':'Contoh: 25 th / 5 th'}" value="${esc(f.fUmur||'')}" autocomplete="off"></label>
            </div>
          </div>
          ${d?`<div class="sub" style="margin-top:6px">
            <div style="margin-bottom:4px">
              <span class="tag ${ev.cols.f.parafOk?'good':'bad'}">${ev.cols.f.parafOk?'✓':'✕'} Tanda Tangan / Paraf</span>
              <span class="tag ${ev.cols.f.proOk?'good':'bad'}">${ev.cols.f.proOk?'✓':'✕'} Pro (Nama Pasien)</span>
              <span class="tag ${ev.cols.f.umurOk?'good':'bad'}">${ev.cols.f.umurOk?'✓':'✕'} Umur Pasien</span>
            </div>
            <b>${ev.cols.f.ok?'✓':'Catatan:'}</b> ${esc(ev.cols.f.msg)}<br>
            <b>Kunci Resep (f):</b>
            <div class="paper" style="margin-top:6px;padding:12px">
              <div class="keyp">${esc(ev.cols.f.key)}</div>
              <div class="blk-f" style="margin-top:4px"><span></span>${SVG_PARAF}</div>
              <div class="sep"></div>
              <div class="keyp" style="font-size:13.5px">Pro: ${esc(f.fPro||'Tn. A / An. B')} &nbsp;·&nbsp; Umur: ${esc(f.fUmur||'25 th')}</div>
            </div>
          </div>`:''}
        </div>
      </div>
    </div>

    ${d?`<div role="status" class="fb ${ev.pct>=80?'good':'bad'}">
      <b>Skor Lembar Pengamatan #${s.no} (${esc(s.praktikumNama)} — ${esc(s.n)}): ${ev.pct}% (${ev.pts}/${ev.max} poin)${!S.lp.isExample&&Object.keys(S.lp.xpCols||{}).length?` <span class="tag good" style="margin-left:6px">⚡ +${Object.keys(S.lp.xpCols).length*XP_PER_CORRECT} EXP (${Object.keys(S.lp.xpCols).length} kolom benar)</span>`:''}</b>
      ${S.lp.isExample?`<div style="margin-top:4px;font-size:13px" class="muted">💡 Mode contoh kunci jawaban aktif — klik "Kosongkan &amp; Coba Lagi" dan tulis jawaban sendiri untuk mendapat <b>+10 EXP</b> tiap kolom benar.</div>`:''}
      <div style="margin-top:6px"><b>Alasan Pemilihan BSO:</b> ${esc(s.alasanBso)}</div>
      <div style="margin-top:4px"><b>Efek Samping &amp; Perhatian:</b> ${esc(s.efekSamping)}</div>
    </div>`:''}

    <div class="actions two">
      ${P(d?'Periksa Ulang Jawaban':(exam?'🎯 Kumpulkan & Nilai Lembar Pengamatan':'Periksa Lembar Pengamatan'),'lpcheck')}
      ${exam?(d?X('Kosongkan & Coba Lagi','lpfill'):X('🎲 Ganti Soal Obat Acak','lprand')):X(d?'Kosongkan & Coba Lagi':'Isi Contoh Kunci Jawaban','lpfill')}
    </div>
  </div>`;
}

function drawLpTable(){
  const flt=S.lp.tblFilter,q=S.lp.tblSearch.toLowerCase(),hide=S.lp.tblHide;
  const viewMode=S.lp.tblMode==='auto'?(isMobileViewport()?'cards':'table'):S.lp.tblMode;
  const rows=SEDIAAN.filter(s=>{
    if(flt==='solutio'&&s.f!=='solutio')return false;
    if(flt==='suspensi'&&!s.f.includes('suspensi'))return false;
    if(flt==='emulsi'&&s.f!=='emulsi')return false;
    if(flt==='injeksi'&&!s.r.includes('injeksi')&&!s.r.includes('infus'))return false;
    if(flt==='inhalasi'&&s.r!=='inhalasi')return false;
    if(q&&!(s.no+' '+s.n+' '+s.praktikumNama+' '+s.tipePraktikum+' '+s.k+' '+(s.lp?.a||'')+' '+(s.lp?.c||'')).toLowerCase().includes(q))return false;
    return true;
  });
  const cell=(no,col,txt)=>{
    const k=`${no}:${col}`,cl=hide&&!S.lp.revealed[k]?'lp-cell-hide':'';
    return `<td class="${cl}" data-reveal="${k}">${esc(txt)}</td>`;
  };
  const mitem=(no,col,lbl,txt,isMono=false)=>{
    const k=`${no}:${col}`,cl=hide&&!S.lp.revealed[k]?'lp-cell-hide':'';
    return `<div class="lp-mitem ${cl}" data-reveal="${k}"><b>(${col}) ${lbl}</b><div class="${isMono?'mono':''}" style="${isMono?'white-space:pre-wrap;font-size:12.5px;color:var(--pen);margin-top:2px':''}">${esc(txt)}</div></div>`;
  };
  $('#list').innerHTML=`
  <div class="card">
    <div class="row between">
      <div>
        <h3>Tabel Kunci Lembar Pengamatan Praktikum BSO Cair (26 Obat)</h3>
        <p class="sub">Format persis Lembar Pengamatan Praktikum BSO Cair (Gambar 2): kolom (a) s/d (f). Klik foto untuk memperbesar.</p>
      </div>
      <div class="row">
        <button class="secondary small" data-act="lptblmode">${viewMode==='cards'?'📋 Tampilan Tabel Geser':'📱 Tampilan Kartu'}</button>
        <button class="secondary small" data-act="lptblhide">${hide?'👁️ Buka Semua Kunci':'🙈 Mode Hafalan'}</button>
      </div>
    </div>
    <div class="seg" style="margin-top:10px">
      ${[['all','Semua (26)'],['solutio','Solutio'],['suspensi','Suspensi'],['emulsi','Emulsi'],['injeksi','Injeksi/Infus/Pelarut'],['inhalasi','Inhalasi']].map(([k,l])=>`<button aria-pressed="${flt===k}" data-lpflt="${k}">${l}</button>`).join('')}
    </div>
    <input class="f" id="lpTblSearch" style="margin-top:10px" placeholder="Cari obat di tabel Lembar Pengamatan..." value="${esc(S.lp.tblSearch)}">
    ${hide?`<div class="hint">Mode hafalan aktif: ketuk sel/kotak yang buram untuk membuka kunci jawaban per kolom.</div>`:''}

    ${viewMode==='cards'?`
      <div class="lp-mcards">
        ${rows.map(s=>`<div class="lp-mcard">
          <div class="lp-mcard-head">
            <img src="${esc(s.img)}" alt="${esc(s.praktikumNama)}" data-zoom="${esc(s.img)}" data-zoom-title="#${s.no} ${esc(s.n)}">
            <div>
              <div class="row" style="gap:6px"><span class="badge">#${s.no}</span><span class="badge blue">${esc(s.tipePraktikum)}</span></div>
              <div style="font-weight:800;font-size:15px;margin-top:3px">${esc(s.praktikumNama)} — ${esc(s.n)}</div>
              <div style="margin-top:4px">${golBadgeHtml(s)}</div>
            </div>
            <button class="secondary small" data-lpgoto="${s.no-1}">📝 Latih</button>
          </div>
          <div class="lp-mcard-grid">
            ${mitem(s.no,'a','Nama Bentuk Sediaan',s.lp.a)}
            ${mitem(s.no,'b','Nama Obat & Strength',s.lp.b)}
            ${mitem(s.no,'c','Senyawa Aktif & Komposisi',s.lp.c)}
            ${mitem(s.no,'d','Cara Pemakaian & Dosis',s.lp.d)}
            ${mitem(s.no,'e','Golongan Obat & Penyimpanan',s.lp.e)}
            ${mitem(s.no,'f','Penulisan Resep',s.x,true)}
          </div>
        </div>`).join('')||'<p class="sub">Tidak ada obat yang cocok.</p>'}
      </div>
    `:`
      <div class="lp-scroll-bar">
        <span>↔️ Geser tabel ke samping untuk melihat kolom (a) sampai (f)</span>
        <div class="lp-scroll-btns">
          <button class="secondary small" type="button" data-act="lpscrollL">◀ Geser Kiri</button>
          <button class="secondary small" type="button" data-act="lpscrollR">Geser Kanan ▶</button>
        </div>
      </div>
      <div class="lp-table-wrap" id="lpMainTblWrap" style="margin-top:6px">
        <table class="lp-tbl">
          <thead>
            <tr>
              <th style="width:42px">No</th>
              <th style="width:140px">Bungkus &amp; Daftar</th>
              <th style="width:150px">(a) Nama Bentuk Sediaan</th>
              <th style="width:150px">(b) Nama Obat &amp; Strength</th>
              <th style="width:185px">(c) Senyawa Aktif &amp; Komposisi</th>
              <th style="width:195px">(d) Cara Pemakaian &amp; Dosis</th>
              <th style="width:185px">(e) Golongan Obat &amp; Penyimpanan</th>
              <th style="width:195px">(f) Penulisan Resep</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(s=>`<tr>
              <td><b>${s.no}</b></td>
              <td>
                <img class="tbl-thumb" src="${esc(s.img)}" alt="${esc(s.praktikumNama)}" data-zoom="${esc(s.img)}" data-zoom-title="#${s.no} ${esc(s.n)}">
                <b>${esc(s.praktikumNama)}</b><br>
                <span class="badge" style="margin-top:2px">${esc(s.tipePraktikum)}</span><br>
                <button class="lnk" data-lpgoto="${s.no-1}">Latih obat ini →</button>
              </td>
              ${cell(s.no,'a',s.lp.a)}
              ${cell(s.no,'b',s.lp.b)}
              ${cell(s.no,'c',s.lp.c)}
              ${cell(s.no,'d',s.lp.d)}
              ${cell(s.no,'e',s.lp.e)}
              <td class="${hide&&!S.lp.revealed[s.no+':f']?'lp-cell-hide':''}" data-reveal="${s.no}:f"><div class="mono" style="white-space:pre-wrap;font-size:12px;color:var(--pen)">${esc(s.x)}</div></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    `}
  </div>`;
}

function drawSed(q){
  q=q.toLowerCase();
  $('#rows').innerHTML=SEDIAAN.filter(s=>(s.no+' '+s.n+' '+s.praktikumNama+' '+s.tipePraktikum+' '+s.k+' '+s.f+' '+s.r).toLowerCase().includes(q)).map(s=>`
  <details class="dt">
    <summary>
      <span class="row" style="gap:8px">
        <span class="badge">#${s.no}</span>
        <span><b>${esc(s.praktikumNama)}</b> — ${esc(s.n)}</span>
        <span class="badge blue">${esc(s.tipePraktikum)}</span>
        <span class="badge">${esc(s.f)}</span>
      </span>
    </summary>
    <div class="in">
      <div class="pkg-grid" style="margin-top:6px">
        <div class="pkg-photo-box">
          <img src="${esc(s.img)}" alt="Bungkus ${esc(s.n)}" data-zoom="${esc(s.img)}" data-zoom-title="#${s.no} ${esc(s.n)}">
          <span class="pkg-zoom-hint">🔍 Klik bungkus untuk memperbesar</span>
        </div>
        <div class="kv">
          ${golBadgeHtml(s)}
          <div><b>(a) Bentuk Sediaan:</b> ${esc(s.lp?.a||s.f)}</div>
          <div><b>(b) Nama &amp; Strength:</b> ${esc(s.lp?.b||s.n)}</div>
          <div><b>(c) Komposisi / Zat Aktif:</b> ${esc(s.lp?.c||s.k)}</div>
          <div><b>(d) Rute &amp; Dosis:</b> ${esc(s.lp?.d||`${s.r} — ${s.d}`)}</div>
          <div><b>(e) Penyimpanan &amp; Kemasan:</b> ${esc(s.kemasan||'-')} · ${esc(s.penyimpanan||'-')}</div>
          <div><b>Indikasi &amp; Alasan BSO:</b> ${esc(s.indikasi||'-')} (${esc(s.alasanBso||'-')})</div>
        </div>
      </div>
      <div class="paper" style="margin-top:10px;padding:12px"><div class="keyp" style="font-size:18px">${esc(s.x)}</div></div>
      <div style="margin-top:8px"><button class="secondary small" data-lpgoto="${s.no-1}">📝 Latih di Lembar Pengamatan #${s.no}</button></div>
    </div>
  </details>`).join('')||'<p class="sub">Tidak ada yang cocok.</p>';
}

function sedQs(){
  const qs=[];
  for(const s of pick(SEDIAAN,12)){
    const t=Math.floor(Math.random()*5);
    if(t===0)qs.push({img:s.img,q:`Perhatikan foto kemasan obat #${s.no} (${s.praktikumNama}). Apa bentuk sediaan dan cara pemberiannya?`,a:s.lp?.a||s.f,o:opts(s.lp?.a||s.f,SEDIAAN.map(x=>x.lp?.a||x.f),3),exp:`Komposisi: ${s.k} · Rute: ${s.r}`});
    if(t===1)qs.push({img:s.img,q:`Rute pemakaian untuk sediaan ${s.n} (${s.tipePraktikum})?`,a:s.r,o:opts(s.r,SEDIAAN.map(x=>x.r),3,rb),exp:s.lp?.d});
    if(t===2)qs.push({img:s.img,q:`Senyawa aktif dan kekuatan (strength) pada bungkus ${s.n}?`,a:s.k,o:opts(s.k,SEDIAAN.map(x=>x.k),3),exp:s.lp?.c});
    if(t===3)qs.push({img:s.img,q:`Pilih penulisan resep (kolom f Lembar Pengamatan) yang tepat untuk ${s.n}:`,a:s.x,o:opts(s.x,SEDIAAN.map(x=>x.x),3),exp:s.lp?.d});
    if(t===4){
      const golAns=s.lp?.e||GOL_INFO[s.gol]?.label;
      qs.push({img:s.img,q:`Golongan obat dan cara penyimpanan untuk ${s.n}?`,a:golAns,o:opts(golAns,SEDIAAN.map(x=>x.lp?.e||x.penyimpanan),3),exp:`Kemasan: ${s.kemasan}`});
    }
  }
  return qs;
}

/* ===== PANDUAN PRAKTIKUM & 6 RESEP RACIKAN FK YARSI ===== */
function viewPanduan(m){
  m.innerHTML=`<div class="card">
    <div class="step-h"><span class="badge">Buku Penuntun Praktikum FK YARSI</span><span class="muted">Blok Kedokteran Keluarga</span></div>
    <h2>Panduan Praktikum, 6 Resep Racikan &amp; Teori BSO</h2>
    <p class="sub">Materi lengkap Praktikum 1 (BSO Padat &amp; ½ Padat — Drs. Dharma Permana, Apt., PhD) dan Praktikum 2 (BSO Cair — DR. Dra. Risdawati Djohan, Apt., MKes).</p>
    ${subnav('pan',[['racik','⚗️ 6 Resep Racikan Lab'],['teori','📖 Teori & Etiket'],['kuis','🎯 Kuis Praktikum']])}
  </div>
  <div id="quiz"></div><div id="list"></div>`;
  if(S.sub.pan==='racik')drawRacikan();
  else if(S.sub.pan==='teori')drawTeoriPanduan();
  else if(!S.quiz)startQuiz(panduanQs(),'Kuis Panduan Praktikum & Racikan');else drawQuiz();
}

const RACIK_SHORT=['Pulveres Parasetamol','Kapsul Racikan Asma','Salep 2-4 (Unguentum)','Potio Nigra (OBH)','Lotio Kummerfeldi','Emulsi Minyak Ikan'];
function drawRacikan(){
  const r=RACIKAN[S.racik.idx]||RACIKAN[0],hide=S.racik.hideCalc;
  const [prakShort,prakDosen]=(r.praktikum||'').split('—').map(s=>s.trim());
  $('#list').innerHTML=`
  <div class="card">
    <div class="racik-grid" role="group" aria-label="Pilih resep racikan">
      ${RACIKAN.map((x,i)=>`<button aria-pressed="${i===S.racik.idx}" data-racik="${i}"><span class="rno">${i+1}</span><span class="rlbl">${esc(RACIK_SHORT[i]||x.nama)}</span></button>`).join('')}
    </div>
    <div style="margin-top:16px">
      <div class="step-h">
        <span class="badge">${esc(prakShort||r.praktikum)}</span>
        <span class="badge blue">${esc(r.bso)}</span>
        ${prakDosen?`<span class="muted">Pengampu: ${esc(prakDosen)}</span>`:''}
      </div>
      <h2>${esc(r.nama)}</h2>
      <div class="racik-summary">
        <div><b>Pasien:</b> ${esc(r.pro)}</div>
        <div style="margin-top:3px"><b>Indikasi / Skenario Praktikum:</b> ${esc(r.keluhan)}</div>
      </div>
    </div>

    <div class="fgrid c2" style="margin-top:14px">
      <div>
        <label class="l">Resep &amp; Formula Standar</label>
        <div class="paper"><div class="keyp">${esc(r.resep)}</div></div>
      </div>
      <div>
        <label class="l">Etiket Obat (${r.etiket==='putih'?'Etiket Putih — Obat Dalam':'Etiket Biru — Obat Luar'})</label>
        <div class="etiket ${r.etiket}">
          <div class="etiket-head">APOTEK YARSI<br><span style="font-weight:600;font-size:11px">Jl. Letjen Suprapto, Cempaka Putih, Jakarta Pusat</span></div>
          <div style="white-space:pre-line;font-weight:700">${esc(r.etiketTeks)}</div>
        </div>
      </div>
    </div>

    <div style="margin-top:18px">
      <div class="row between">
        <h3 style="margin:0">1. Perhitungan Penimbangan Bahan / Tablet</h3>
        <button class="secondary small" data-act="racikhide">${hide?'👁️ Tampilkan Hasil Hitung':'🙈 Mode Latihan Hitung'}</button>
      </div>
      ${hide?`<div class="hint">Ketuk bagian yang buram untuk membuka perhitungan per bahan obat.</div>`:''}
      <div class="calc-list">
        ${r.perhitungan.map((p,i)=>`<div class="calc-item">
          <div class="calc-name">${esc(p.bahan)}</div>
          <div class="calc-formula calc-hide ${hide&&!S.lp.revealed['rc:'+i]?'lp-cell-hide':''}" data-reveal="rc:${i}">${esc(p.rumus)}</div>
          <div class="calc-take calc-hide ${hide&&!S.lp.revealed['ra:'+i]?'lp-cell-hide':''}" data-reveal="ra:${i}">Diambil: ${esc(p.ambil)}</div>
        </div>`).join('')}
      </div>
    </div>

    <div style="margin-top:18px">
      <h3>2. Fungsi Tiap Bahan Obat dalam Resep (Laporan Praktikum)</h3>
      <div class="func-list">
        ${r.fungsiBahan.map((f,i)=>`<div class="func-item">
          <div class="func-name">${esc(f.bahan)}</div>
          <div class="calc-hide ${hide&&!S.lp.revealed['rf:'+i]?'lp-cell-hide':''}" data-reveal="rf:${i}"><span class="badge">${esc(f.peran)}</span></div>
          <div class="func-desc">${esc(f.ket)}</div>
        </div>`).join('')}
      </div>
    </div>

    <div style="margin-top:18px">
      <h3>3. Cara Kerja / Pembuatan di Laboratorium</h3>
      <ol class="step-list">
        ${r.langkah.map((l,i)=>`<li><span class="sno">${i+1}</span><span>${esc(l)}</span></li>`).join('')}
      </ol>
    </div>
  </div>`;
}

function drawTeoriPanduan(){
  $('#list').innerHTML=`
  <div class="card">
    <h3>Perbedaan 3 Jenis BSO Cair: Solutio vs Suspensi vs Emulsi</h3>
    <p class="sub">Berdasarkan diagram penggolongan BSO Cair pada Buku Penuntun Praktikum hal. 13.</p>
    <div class="bso-grid">
      ${(TEORI_BSO.perbandinganCair||[]).map((x,i)=>`<div class="bso-card">
        <div class="bso-card-head">
          <span class="badge ${i===0?'':i===1?'blue':'warn'}" style="margin-bottom:5px">BSO Cair #${i+1}</span>
          <h4>${esc(x.jenis)}</h4>
        </div>
        <div class="bso-kv"><b>Tampilan Fisik</b><div>${esc(x.tampilan)}</div></div>
        <div class="bso-kv"><b>Sifat Zat &amp; Fase</b><div>${esc(x.komponen)}</div></div>
        <div class="bso-kv"><b>Zat Tambahan Khas</b><div>${esc(x.zatTambahan)}</div></div>
        <div class="bso-kv"><b>Aturan Kocok</b><div><span class="badge ${x.kocok.includes('WAJIB')?'warn':''}">${esc(x.kocok)}</span></div></div>
        <div class="bso-kv"><b>Contoh Sediaan Praktikum</b><div>${esc(x.contoh)}</div></div>
      </div>`).join('')}
    </div>
  </div>

  <div class="card">
    <h3>Fungsi Bahan Obat dalam Resep Racikan</h3>
    <p class="sub">Wajib dijelaskan pada Laporan Praktikum pembuatan obat racikan (Buku Panduan hal. 18).</p>
    <div style="margin-top:8px">
      ${(TEORI_BSO.fungsiBahan||[]).map(f=>`<div class="item"><b>${esc(f.istilah)}</b><div>${esc(f.arti)}</div><div class="sub" style="margin-top:2px">Contoh: ${esc(f.contoh)}</div></div>`).join('')}
    </div>
  </div>

  <div class="card">
    <h3>Aturan Pemilihan Etiket Putih vs Etiket Biru</h3>
    <div class="fgrid c2">
      ${(TEORI_BSO.etiket||[]).map((e,i)=>`<div class="etiket ${i===0?'putih':'biru'}">
        <div class="etiket-head">${esc(e.warna.toUpperCase())}</div>
        <div><b>Peruntukan:</b> ${esc(e.untuk)}</div>
        <div style="margin-top:6px"><b>Contoh:</b> ${esc(e.contoh)}</div>
      </div>`).join('')}
    </div>
  </div>`;
}

function panduanQs(){
  const raw=[
    {q:'Pada resep racikan Pulveres: R/ Parasetamol 125 mg, Luminal 7,5 mg, Sach. Lact. q.s., m.f. pulv. d.t.d. no. X. Berapa tablet Parasetamol 500 mg dan Luminal 30 mg yang diambil?',a:'2 ½ tablet Parasetamol 500 mg (1250 mg) dan 2 ½ tablet Luminal 30 mg (75 mg)',o:['2 ½ tablet Parasetamol 500 mg (1250 mg) dan 2 ½ tablet Luminal 30 mg (75 mg)','1 ¼ tablet Parasetamol 500 mg dan 1 ¼ tablet Luminal 30 mg','5 tablet Parasetamol 500 mg dan 5 tablet Luminal 30 mg','10 tablet Parasetamol 500 mg dan 2 ½ tablet Luminal 30 mg'],exp:'Karena ada d.t.d. no. X: Parasetamol 125 mg × 10 = 1250 mg (1250/500 = 2,5 tab); Luminal 7,5 mg × 10 = 75 mg (75/30 = 2,5 tab).'},
    {q:'Pada resep racikan Kapsul Asma (R/ Teofilin 100 mg, Salbutamol 2 mg, Prednison 5 mg, m.f. pulv. d.t.d. no. X da in caps), berapa tablet yang diambil bila tersedia Teofilin 200 mg, Salbutamol 4 mg, dan Prednison 5 mg?',a:'5 tab Teofilin 200 mg + 5 tab Salbutamol 4 mg + 10 tab Prednison 5 mg',o:['5 tab Teofilin 200 mg + 5 tab Salbutamol 4 mg + 10 tab Prednison 5 mg','10 tab Teofilin 200 mg + 10 tab Salbutamol 4 mg + 10 tab Prednison 5 mg','2 tab Teofilin 200 mg + 2 tab Salbutamol 4 mg + 5 tab Prednison 5 mg','5 tab Teofilin 200 mg + 10 tab Salbutamol 4 mg + 5 tab Prednison 5 mg'],exp:'Teofilin: 100×10 = 1000 mg (5 tab @200 mg); Salbutamol: 2×10 = 20 mg (5 tab @4 mg); Prednison: 5×10 = 50 mg (10 tab @5 mg).'},
    {q:'Pada pembuatan Unguentum 2-4 sebanyak 25 gram (R/ Acid. salicyl. 2%, Sulfur pp. 4%, Vas. flav. ad 25), berapa berat masing-masing bahan dan etiket apa yang digunakan?',a:'Acid. salicyl. 0,5 g; Sulfur pp. 1 g; Vaselin flavum 23,5 g — Etiket Biru (Obat Luar)',o:['Acid. salicyl. 0,5 g; Sulfur pp. 1 g; Vaselin flavum 23,5 g — Etiket Biru (Obat Luar)','Acid. salicyl. 2 g; Sulfur pp. 4 g; Vaselin flavum 19 g — Etiket Biru','Acid. salicyl. 0,5 g; Sulfur pp. 1 g; Vaselin flavum 25 g — Etiket Putih','Acid. salicyl. 1 g; Sulfur pp. 2 g; Vaselin flavum 22 g — Etiket Biru'],exp:'2% × 25 g = 0,5 g; 4% × 25 g = 1 g; Vaselin ad 25 g = 25 − 1,5 = 23,5 g. Karena salep kulit topikal, gunakan Etiket Biru.'},
    {q:'Mengapa kristal Acidum salicylicum ditetesi ±10 tetes alkohol (etanol) terlebih dahulu saat membuat Salep 2-4 di lumpang?',a:'Untuk melarutkan kristal asam salisilat agar halus dan tidak mengiritasi kulit',o:['Untuk melarutkan kristal asam salisilat agar halus dan tidak mengiritasi kulit','Sebagai pengawet salep terhadap jamur','Untuk mencairkan vaselin flavum menjadi emulsi','Sebagai corrigens odoris (pengharum salep)'],exp:'Asam salisilat berbentuk kristal jarum yang tajam; tetesan etanol melarutkannya sebelum dicampur sulfur dan basis vaselin.'},
    {q:'Pada pembuatan Potio Nigra (OBH) 100 gram dari formula standar 300 gram (Ammon. chlor. 6, Succus liq. 10, S.A.S.A. 6, Aq. dest. ad 300), berapa jumlah bahan yang ditimbang?',a:'Ammon. chlor. 2 g, Succus liq. 3,3 g, S.A.S.A. 2 g, dan Aquadest 92,7 g',o:['Ammon. chlor. 2 g, Succus liq. 3,3 g, S.A.S.A. 2 g, dan Aquadest 92,7 g','Ammon. chlor. 6 g, Succus liq. 10 g, S.A.S.A. 6 g, dan Aquadest 78 g','Ammon. chlor. 3 g, Succus liq. 5 g, S.A.S.A. 3 g, dan Aquadest 89 g','Ammon. chlor. 1 g, Succus liq. 1,65 g, S.A.S.A. 1 g, dan Aquadest 96,35 g'],exp:'Faktor konversi = 100/300 = 1/3. Ammon. chlor = 2 g; Succus liq = 3,3 g; SASA = 2 g; Aquadest = 100 − (2+3,3+2) = 92,7 g.'},
    {q:'Mengapa S.A.S.A. (Solutio Ammoniae Spirituosa Anisata) pada pembuatan Potio Nigra ditimbang langsung di dalam botol wadah obat dan dimasukkan terakhir?',a:'Karena mengandung amonia & minyak adas manis dalam alkohol yang mudah menguap',o:['Karena mengandung amonia & minyak adas manis dalam alkohol yang mudah menguap','Karena S.A.S.A. berbentuk serbuk kasar yang harus digerus panas','Karena S.A.S.A. berfungsi sebagai suspending agent','Karena S.A.S.A. hanya larut dalam minyak ikan'],exp:'SASA bersifat volatil (mudah menguap), sehingga ditimbang di botol wadah obat agar tidak menguap di lumpang.'},
    {q:'Apa fungsi PGA (Pulvis Gummi Arabici) pada resep Suspensi Lotio Kummerfeldi?',a:'Suspending agent (zat pensuspensi) agar Sulfur pp. dan Camphora terdispersi merata',o:['Suspending agent (zat pensuspensi) agar Sulfur pp. dan Camphora terdispersi merata','Remedium cardinale untuk mematikan bakteri jerawat','Corrigens odoris untuk memberi bau mawar','Pelarut kristal kamfer'],exp:'Dalam suspensi Lotio Kummerfeldi, zat padat tidak larut (Sulfur pp & Camphora) membutuhkan PGA sebagai suspending agent.'},
    {q:'Etiket dan peringatan khusus apa yang wajib ditempelkan pada botol Suspensi Lotio Kummerfeldi (S 2 dd loc. dol.)?',a:'Etiket Biru (OBAT LUAR) + tulisan "KOCOK SEBELUM DIPAKAI"',o:['Etiket Biru (OBAT LUAR) + tulisan "KOCOK SEBELUM DIPAKAI"','Etiket Putih (Obat Dalam) + tulisan "Habiskan"','Etiket Biru + tulisan "Hanya untuk kumur, jangan ditelan"','Etiket Putih tanpa perlu dikocok'],exp:'Lotio Kummerfeldi adalah suspensi topikal kulit, sehingga menggunakan Etiket Biru (Obat Luar) dan wajib dikocok sebelum dipakai.'},
    {q:'Pada pembuatan Emulsi Minyak Ikan (Emulsum Ol. Iecoris Aselli) 100 ml dengan PGA 13,95 g, berapa volume Aqua pro corpus emulsi yang ditambahkan sekaligus untuk membuat corpus emulsi?',a:'20,9 ml (1,5 × berat PGA)',o:['20,9 ml (1,5 × berat PGA)','13,95 ml (1 × berat PGA)','46,5 ml (sama dengan berat minyak ikan)','92,7 ml'],exp:'Rumus Aqua pro corpus untuk PGA = 1,5 × berat PGA = 1,5 × 13,95 g = 20,925 ml (≈ 20,9 ml), digerus cepat dan searah.'},
    {q:'Apa fungsi Oleum Cinnamomi (minyak kayu manis) pada resep Emulsum Olei Iecoris Aselli?',a:'Corrigens odoris & saporis (menutupi bau dan rasa amis minyak ikan)',o:['Corrigens odoris & saporis (menutupi bau dan rasa amis minyak ikan)','Emulgator utama pembentuk corpus emulsi','Remedium cardinale sumber Vitamin A dan D','Vehiculum pembawa fase air'],exp:'Ol. Cinnamomi ditambahkan 2 tetes di akhir untuk memperbaiki bau (odoris) dan rasa (saporis) amis dari minyak ikan.'},
    {q:'Manakah perbandingan yang BENAR antara Solutio, Suspensi, dan Emulsi menurut buku panduan praktikum BSO Cair?',a:'Solutio: jernih (zat padat larut); Suspensi: keruh (zat padat tidak larut); Emulsi: kental (minyak & air + emulgator)',o:['Solutio: jernih (zat padat larut); Suspensi: keruh (zat padat tidak larut); Emulsi: kental (minyak & air + emulgator)','Solutio: keruh; Suspensi: jernih; Emulsi: serbuk kering','Solutio wajib dikocok dahulu; Suspensi tidak boleh dikocok','Emulsi tidak memerlukan zat pengemulsi (emulgator)'],exp:'Diagram hal. 13: Solution = jernih (obat padat larut); Suspension = keruh (obat padat tidak larut); Emulsion = kental (minyak & air).'},
    {q:'Bahan obat dalam resep yang berfungsi membantu atau memperkuat efek bahan obat utama (Remedium cardinale) disebut...',a:'Remedium adjuvans',o:['Remedium adjuvans','Vehiculum / Constituens','Corrigens saporis','Suspending agent'],exp:'Remedium cardinale = obat utama; Remedium adjuvans = penunjang/penguat; Corrigens = memperbaiki rasa/bau/warna; Vehiculum = pembawa.'}
  ];
  return shuffle(raw).map(q=>({...q,o:shuffle(q.o)}));
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
  m.innerHTML=`<div class="note">Alat bantu hitung dosis &amp; latihan soal perhitungan resep. Setiap jawaban benar di kuis hitung mendapat <b>+10 EXP</b>.</div>
  <div id="quiz"></div>
  <div class="card"><h2>Jumlah obat (no.)</h2><p class="sub">Dosis × frekuensi × hari menjadi angka Romawi di resep.</p><div class="fgrid c3"><div><label class="l" for="c1a">Jumlah per minum</label><input class="f" id="c1a" type="number" min="0" step="0.5" value="1" inputmode="decimal"></div><div><label class="l" for="c1b">Kali sehari (dd)</label><input class="f" id="c1b" type="number" min="0" value="3" inputmode="numeric"></div><div><label class="l" for="c1c">Lama (hari)</label><input class="f" id="c1c" type="number" min="0" value="5" inputmode="numeric"></div></div><div class="out" id="o1"></div></div>
  <div class="card"><h2>Dosis per berat badan</h2><p class="sub">Contoh dari catatan: ibuprofen 10 mg/kgBB/dosis, sirup 100 mg/5 ml.</p><div class="fgrid c2"><div><label class="l" for="c2a">Berat badan (kg)</label><input class="f" id="c2a" type="number" min="0" value="15" inputmode="decimal"></div><div><label class="l" for="c2b">Dosis (mg/kgBB)</label><input class="f" id="c2b" type="number" min="0" value="10" inputmode="decimal"></div><div><label class="l" for="c2c">Dosis tersebut per</label><select class="f" id="c2c"><option value="1">dosis</option><option value="d">hari (dibagi)</option></select></div><div><label class="l" for="c2d">Dibagi berapa dosis/hari</label><input class="f" id="c2d" type="number" min="1" value="3" inputmode="numeric"></div><div><label class="l" for="c2e">Kekuatan sirup (mg)</label><input class="f" id="c2e" type="number" min="0" value="100" inputmode="decimal"></div><div><label class="l" for="c2f">per berapa ml</label><input class="f" id="c2f" type="number" min="0" value="5" inputmode="decimal"></div></div><div class="out" id="o2"></div></div>
  <div class="card"><h2>Angka Romawi</h2><div class="fgrid c2"><div><label class="l" for="c3a">Angka</label><input class="f" id="c3a" type="number" min="1" max="399" value="15"></div><div><label class="l" for="c3b">Romawi</label><input class="f" id="c3b" value="XV"></div></div><div class="out" id="o3">XV</div></div>`;
  calc();
  if(!S.quiz)startQuiz(hitungQs(),'Kuis Hitung Dosis & Romawi');else drawQuiz();
}
function hitungQs(){
  const raw=[
    {q:'Pasien diresepkan Amoksisilin 500 mg dengan signatura S 3 dd tab I pc selama 5 hari. Berapa jumlah obat (no.) dalam angka Romawi?',a:'no. XV (15 tablet)',o:['no. XV (15 tablet)','no. X (10 tablet)','no. XII (12 tablet)','no. XX (20 tablet)'],exp:'1 tablet × 3 kali/hari × 5 hari = 15 tablet → ditulis no. XV.'},
    {q:'Anak berat badan 15 kg membutuhkan Ibuprofen 10 mg/kgBB/kali. Sediaan yang ada: Suspensi Ibuprofen 100 mg/5 ml. Berapa dosis sekali minum?',a:'150 mg → 7,5 ml (1 ½ sendok takar 5 ml)',o:['150 mg → 7,5 ml (1 ½ sendok takar 5 ml)','100 mg → 5 ml (1 sendok takar 5 ml)','150 mg → 5 ml (1 sendok takar 5 ml)','300 mg → 15 ml (3 sendok takar 5 ml)'],exp:'Dosis = 15 kg × 10 mg = 150 mg/kali. Volume = (150 mg / 100 mg) × 5 ml = 7,5 ml.'},
    {q:'Pasien diresepkan obat S 2 dd tab ½ selama 6 hari. Berapa jumlah tablet yang ditulis pada baris R/ (no.)?',a:'no. VI (6 tablet)',o:['no. VI (6 tablet)','no. XII (12 tablet)','no. III (3 tablet)','no. X (10 tablet)'],exp:'0,5 tablet × 2 kali/hari × 6 hari = 6 tablet → ditulis no. VI.'},
    {q:'Anak berat badan 12 kg diresepkan Amoksisilin 25 mg/kgBB/hari dibagi dalam 3 dosis (tiap 8 jam). Sirup tersedia 125 mg/5 ml. Berapa ml sekali minum?',a:'100 mg/kali → 4 ml tiap 8 jam',o:['100 mg/kali → 4 ml tiap 8 jam','300 mg/kali → 12 ml tiap 8 jam','125 mg/kali → 5 ml tiap 8 jam','75 mg/kali → 3 ml tiap 8 jam'],exp:'Total harian = 12 × 25 = 300 mg/hari. Per dosis (÷3) = 100 mg/kali → (100/125) × 5 ml = 4 ml.'},
    {q:'Untuk terapi hipertensi kronis selama 30 hari dengan aturan pakai S 1 dd tab I, bagaimana penulisan jumlah obat dalam angka Romawi?',a:'no. XXX',o:['no. XXX','no. XX','no. XL','no. XV'],exp:'1 × 1 × 30 hari = 30 tablet → angka Romawi 30 adalah XXX.'},
    {q:'Jika pada resep tertulis "Tab. Parasetamol 500 mg no. XVIII", berapa jumlah tablet yang diserahkan kepada pasien?',a:'18 tablet',o:['18 tablet','16 tablet','13 tablet','28 tablet'],exp:'X (10) + V (5) + III (3) = 18 tablet.'},
    {q:'Pasien diresepkan kapsul antibiotik S 4 dd caps I selama 6 hari. Berapa jumlah kapsul dalam angka Romawi?',a:'no. XXIV (24 kapsul)',o:['no. XXIV (24 kapsul)','no. XXVI (26 kapsul)','no. XIX (19 kapsul)','no. XX (20 kapsul)'],exp:'1 kapsul × 4 kali/hari × 6 hari = 24 kapsul → ditulis no. XXIV.'},
    {q:'Anak 10 kg membutuhkan Parasetamol 12 mg/kgBB/kali. Sediaan Sirup Parasetamol 120 mg/5 ml. Berapa ml yang diberikan tiap kali minum?',a:'120 mg → 5 ml (1 sendok takar / cth I)',o:['120 mg → 5 ml (1 sendok takar / cth I)','60 mg → 2,5 ml (½ sendok takar)','240 mg → 10 ml (2 sendok takar)','100 mg → 4 ml'],exp:'10 kg × 12 mg = 120 mg/kali. Karena kekuatan sirup 120 mg/5 ml, maka volume sekali minum = 5 ml (cth I).'}
  ];
  return shuffle(raw).map(q=>({...q,o:shuffle(q.o)}));
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
const Q1=['Tab.','Caps.','Syr.','Susp.','Drops','Inj.','Sach.','Inhaler','mg','ml','no.','fl. I','tb. I','vial I'],Q2=['1 dd','2 dd','3 dd','4 dd','tab I','caps I','cth I','cth II','gtt','puff I','ac','pc','prn','mane','nocte','ue','imm'];
function renderQuick(){const q=$('#quick');if(!q)return;const f=S.foc.f;q.innerHTML=(f==='l2'?Q2:Q1).map(x=>`<button type="button" data-ins="${esc(x)}">${esc(x)}</button>`).join('')}
function insertAt(txt){
  const t=sr.querySelector(`.blk[data-i="${S.foc.i}"] textarea[data-f="${S.foc.f}"]`);if(!t||t.disabled)return;
  const a=t.selectionStart??t.value.length,b=t.selectionEnd??a,pre=t.value.slice(0,a),post=t.value.slice(b);
  const add=(pre&&!/\s$/.test(pre)?' ':'')+txt+(post&&/^\s/.test(post)?'':' ');
  t.value=pre+add+post;const p=(pre+add).length;t.focus();t.setSelectionRange(p,p);
  S.f.rows[S.foc.i][S.foc.f]=t.value;fit(t);
}
function addRow(focus=true){S.f.rows.push({l1:'',l2:'',paraf:false});viewCase($('#app'));fitAll();if(focus){const i=S.f.rows.length-1;S.foc={i,f:'l1'};const t=sr.querySelector(`.blk[data-i="${i}"] textarea[data-f="l1"]`);t&&t.focus();renderQuick()}}

/* ===== LIGHTBOX MODAL ZOOM BUNGKUS ===== */
function openZoom(src,title){
  const m=$('#rxModal');if(!m)return;
  $('#rxModalImg').src=src;
  $('#rxModalTitle').textContent=title||'Kemasan Obat';
  m.hidden=false;
}
function closeZoom(){const m=$('#rxModal');if(m)m.hidden=true}

/* ===== EVENTS ===== */
function ensure(){
  gid('resepBtn')?.remove();
  gid('openResepLauncher')?.remove();
  if(!gid('resepPage')){
    const s=document.createElement('section');s.id='resepPage';s.className='view';
    s.innerHTML='<div class="card ub-head"><div class="topline" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px"><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><button class="back" type="button" data-back-kedkel>‹ BLOK KEDKEL</button><b>✍️ Latihan Resep &amp; Praktikum Farmakologi</b></div><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><span style="background:rgba(22,163,74,.14);color:#16a34a;padding:5px 10px;border-radius:99px;font-weight:800;font-size:12px">⚡ +10 EXP / Jawaban Benar</span><span id="resepXpLiveBadge" style="background:rgba(37,99,235,.14);color:#2563eb;padding:5px 11px;border-radius:99px;font-weight:900;font-size:12.5px">⚡ 0 XP</span></div></div><p class="muted" style="margin:6px 0 0;font-size:13px">Blok Kedokteran Keluarga — Setiap jawaban benar di Kasus, Tulis Resep, Lembar Pengamatan, Kuis Sediaan, Racikan, Singkatan, BSO Padat, &amp; Hitung mendapat <b>+10 EXP</b>.</p></div><div id="resepHost"></div>';
    const anchor=gid('glossaryPage')||gid('analytics')||document.querySelector('main .view:last-of-type');
    anchor&&anchor.parentNode?anchor.parentNode.insertBefore(s,anchor):document.body.appendChild(s);
  }
  const kedkel=gid('blokKedkelPage');
  if(kedkel&&!gid('openResepKedkel')){
    const wrap=document.createElement('div');
    wrap.className='materi-section resep-kedkel-section';
    wrap.innerHTML='<button class="materi-button resep-kedkel-button" id="openResepKedkel" type="button" aria-label="Buka Latihan Resep Farmakologi">✍️ LATIHAN RESEP &amp; PRAKTIKUM FARMAKOLOGI</button>';
    const anchor=kedkel.querySelector('.latihan-materi-section')||kedkel.querySelector('.materi-section')||kedkel.querySelector('.exam-page-header');
    if(anchor)anchor.insertAdjacentElement('afterend',wrap);else kedkel.prepend(wrap);
  }
  updateHeaderXP();
}
function init(){
  if(inited){updateHeaderXP();return;}inited=true;
  const host=gid('resepHost');sr=host.attachShadow({mode:'open'});
  sr.innerHTML='<style>'+CSS+'</style><nav class="tabs" id="tabs" role="tablist" aria-label="Menu latihan resep"></nav><main id="app"></main><div class="rx-modal" id="rxModal" hidden><div class="rx-modal-box"><div class="row between" style="margin-bottom:10px"><b id="rxModalTitle">Kemasan Obat</b><button class="secondary small" data-act="closezoom">Tutup ✕</button></div><img id="rxModalImg" src="" alt="Perbesaran bungkus obat"></div></div>';
  const dark=()=>host.classList.toggle('rxdark',document.documentElement.classList.contains('dark'));
  dark();new MutationObserver(dark).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  bind();renderTabs();render();
}
function bind(){
sr.addEventListener('mousedown',e=>{if(e.target.closest('.quick button'))e.preventDefault()});
sr.addEventListener('click',e=>{
  const img=e.target.closest('[data-zoom]');
  if(img)return openZoom(img.dataset.zoom,img.dataset.zoomTitle);
  if(e.target.id==='rxModal')return closeZoom();
  const rev=e.target.closest('[data-reveal]');
  if(rev){const k=rev.dataset.reveal;S.lp.revealed[k]=!S.lp.revealed[k];rev.classList.toggle('lp-cell-hide',!S.lp.revealed[k]);return}
  const t=e.target.closest('button');if(!t)return;
  if(t.dataset.tab)return go(t.dataset.tab);
  if(t.classList.contains('case'))return openCase(+t.dataset.case,false);
  if(t.dataset.ins!=null)return insertAt(t.dataset.ins);
  if(t.dataset.mode){S.only=t.dataset.mode==='rx';return render()}
  if(t.dataset.sub){const[k,v]=t.dataset.sub.split(':');S.sub[k]=v;S.quiz=null;return render()}
  if(t.dataset.racik!=null){S.racik.idx=+t.dataset.racik;S.lp.revealed={};return drawRacikan()}
  if(t.dataset.lpgoto!=null){S.sub.sed='lp';selectLpDrug(+t.dataset.lpgoto);render();return scrollTo({top:0})}
  if(t.dataset.lpexam!=null){S.lp.examMode=t.dataset.lpexam==='1';S.lp.checked=false;return drawLembarPengamatan()}
  if(t.dataset.lpflt!=null){S.lp.tblFilter=t.dataset.lpflt;return drawLpTable()}
  if(t.dataset.lpchip!=null){
    const idx=t.dataset.lpchip.indexOf(':'),col=t.dataset.lpchip.slice(0,idx),val=t.dataset.lpchip.slice(idx+1);
    const cur=S.lp.form[col]||'';
    S.lp.form[col]=cur?(cur.includes(val)?cur:`${cur}; ${val}`):val;
    const inp=sr.querySelector(`[data-lp="${col}"]`);if(inp)inp.value=S.lp.form[col];
    return;
  }
  if(t.dataset.ans!=null)return answer(+t.dataset.ans);
  if(t.dataset.dx!=null){S.f.dx=S.f.dxOpts[+t.dataset.dx];return viewCase($('#app'))}
  if(t.dataset.obat!=null){const o=S.f.obatOpts[+t.dataset.obat];S.f.picks=S.f.picks.includes(o)?S.f.picks.filter(x=>x!==o):[...S.f.picks,o];return viewCase($('#app'))}
  if(t.dataset.l5!=null){
    const i=+t.dataset.l5,f=S.f;
    f.l5=f.l5.includes(i)?f.l5.filter(x=>x!==i):[...f.l5,i];
    awardCaseStepXP('s5');
    if(STEPS[S.step].k==='res'&&!S.only)saveBest();
    const y=scrollY;viewCase($('#app'));scrollTo({top:y});return;
  }
  const a=t.dataset.act;if(!a)return;
  if(a==='closezoom')return closeZoom();
  if(a==='lpprev')return selectLpDrug(S.lp.idx-1);
  if(a==='lpnext')return selectLpDrug(S.lp.idx+1);
  if(a==='lprand')return selectLpDrug(Math.floor(Math.random()*SEDIAAN.length));
  if(a==='lptogglelabel'){S.lp.hideLabel=!S.lp.hideLabel;return drawLembarPengamatan()}
  if(a==='lpparaf'){S.lp.form.fParaf=!S.lp.form.fParaf;return drawLembarPengamatan()}
  if(a==='toggleparaf'){const idx=+t.dataset.i;if(S.f?.rows?.[idx]){S.f.rows[idx].paraf=!S.f.rows[idx].paraf;viewCase($('#app'));fitAll()}return}
  if(a==='lpcheck'){
    S.lp.checked=true;
    const s=SEDIAAN[S.lp.idx],ev=evalLembarPengamatan(s,S.lp.form);
    if(!S.lp.isExample){
      if(!S.lp.xpCols)S.lp.xpCols={};
      let newOk=0;
      for(const k of ['a','b','c','d','e','f']){
        if(ev.cols[k]?.ok&&!S.lp.xpCols[k]){
          S.lp.xpCols[k]=true;
          newOk++;
        }
      }
      if(newOk>0)awardFarmakoXP(newOk,`Lembar Pengamatan #${s.no} (${s.praktikumNama})`,`farmako:lp:${s.no}`);
    }
    const b=lpBestMap();if(!b[s.no]||ev.pct>=b[s.no]){b[s.no]=ev.pct;try{localStorage.setItem(LP_BEST_KEY,JSON.stringify(b))}catch{}}
    viewSediaan($('#app'));
    const fbEl=sr.querySelector('.fb');return fbEl&&fbEl.scrollIntoView({block:'center',behavior:'smooth'});
  }
  if(a==='lpfill'){
    const s=SEDIAAN[S.lp.idx],lp=s.lp||{};
    if(S.lp.checked){
      S.lp.checked=false;
      S.lp.isExample=false;
      S.lp.xpCols={};
      S.lp.form={a:'',b:'',c:'',d:'',e:'',fR:'',fS:'',fParaf:false,fPro:'',fUmur:''};
      return drawLembarPengamatan();
    }
    const rxLines=String(s.x||'').split('\n');
    S.lp.form={
      a:lp.a||s.f,
      b:lp.b||`${s.n}, ${s.k}`,
      c:lp.c||s.k,
      d:lp.d||`${s.r}: ${s.d}`,
      e:lp.e||s.penyimpanan||'',
      fR:rxLines[0]?.replace(/^\s*R\/\s*/i,'')||'',
      fS:rxLines.slice(1).join(' ').replace(/^\s*S\s*/i,'')||'',
      fParaf:true,
      fPro:'Tn. A',
      fUmur:'28 th'
    };
    S.lp.isExample=true;
    S.lp.checked=true;
    return drawLembarPengamatan();
  }
  if(a==='lptblhide'){S.lp.tblHide=!S.lp.tblHide;S.lp.revealed={};return drawLpTable()}
  if(a==='lptblmode'){
    const cur=S.lp.tblMode==='auto'?(isMobileViewport()?'cards':'table'):S.lp.tblMode;
    S.lp.tblMode=cur==='cards'?'table':'cards';
    return drawLpTable();
  }
  if(a==='lpscrollL'||a==='lpscrollR'){
    const w=$('#lpMainTblWrap');
    if(w)w.scrollBy({left:a==='lpscrollR'?340:-340,behavior:'smooth'});
    return;
  }
  if(a==='racikhide'){S.racik.hideCalc=!S.racik.hideCalc;S.lp.revealed={};return drawRacikan()}
  const st=STEPS[S.step]&&STEPS[S.step].k;
  if(a==='todo'){const best=bestMap(),td=CASES.filter(c=>((best[c.id+(S.only?'r':'')]||{}).pct||0)<80);if(td.length)openCase(td[Math.floor(Math.random()*td.length)].id,false);return}
  if(a==='exam')return openCase(CASES[Math.floor(Math.random()*CASES.length)].id,true);
  if(a==='back'||a==='list'){stopTimer();S.case=null;render();return scrollTo({top:0})}
  if(a==='again')return openCase(S.case.id,S.exam);
  if(a==='next'){S.step++;S.focusH=true;if(STEPS[S.step].k==='res')return finish();viewCase($('#app'));fitAll();return scrollTo({top:0})}
  if(a==='prev'){S.step=Math.max(0,S.step-1);viewCase($('#app'));fitAll();return scrollTo({top:0})}
  if(a==='check'){
    S.chk[st]=true;
    awardCaseStepXP(st);
    viewCase($('#app'));fitAll();
    const fbEl=sr.querySelector('.fb');return fbEl&&fbEl.scrollIntoView({block:'center',behavior:'smooth'});
  }
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
  if(t.id==='lpTblSearch'&&S.tab==='sediaan'){S.lp.tblSearch=t.value;const pos=t.selectionStart;drawLpTable();const el=$('#lpTblSearch');if(el){el.focus();el.setSelectionRange(pos,pos)}return}
  if(t.dataset.lp){S.lp.form[t.dataset.lp]=t.value;return}
  const f=S.f;if(!f)return;
  if(t.matches('.paper textarea')){f.rows[+t.closest('.blk').dataset.i][t.dataset.f]=t.value;return fit(t)}
  if(t.dataset.pro!=null)f.pro=t.value;
  if(t.dataset.usia!=null)f.usia=t.value;
  if(t.id==='note')f.note=t.value;
});
sr.addEventListener('change',e=>{
  if(e.target.id==='c2c')return calc();
  if(e.target.id==='lpSelect')return selectLpDrug(+e.target.value);
});
sr.addEventListener('focusin',e=>{const t=e.target;if(t.matches&&t.matches('.paper textarea')&&t.closest('.blk')){const n={i:+t.closest('.blk').dataset.i,f:t.dataset.f};if(n.f!==S.foc.f||n.i!==S.foc.i){S.foc=n;renderQuick()}}});
sr.addEventListener('keydown',e=>{
  if(e.key==='Escape')closeZoom();
  const t=e.target;if(!t.matches||!t.matches('.paper textarea')||!t.closest('.blk')||e.key!=='Enter'||e.isComposing)return;
  e.preventDefault();const i=+t.closest('.blk').dataset.i;
  if(t.dataset.f==='l1')return sr.querySelector(`.blk[data-i="${i}"] textarea[data-f="l2"]`).focus();
  const nx=sr.querySelector(`.blk[data-i="${i+1}"] textarea[data-f="l1"]`);
  if(nx)nx.focus();else if(t.value.trim())addRow();
});

}
function open(){ensure();if(!gid('resepPage'))return;window.show('resepPage');init();updateHeaderXP();scrollTo({top:0})}
document.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('button');if(!t)return;if(t.id==='openResepKedkel')return open();if(t.matches('#resepPage [data-back-kedkel],#resepPage [data-home]')){stopTimer();return window.show(gid('blokKedkelPage')?'blokKedkelPage':'home')}});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensure);else ensure();
window.CLINED_RESEP={open};
})();
