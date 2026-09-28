/* CLINED CARD COLLECTION v2 */
(function(){
'use strict';
const KEY_DIA='clined_diamonds_v1',KEY_CARDS='clined_collection_v1',KEY_PACKS='clined_packs_v1';
const PACK_PRICE=20,QUIZ_PER_DIA=5;
function isAdmin(){try{const u=typeof authCurrentUser==='function'?authCurrentUser():null;return!!(u&&u.role==='admin');}catch{return false;}}
const CARD_CATALOG=[
{id:'cor',name:'COR',rarity:'rare',color:'#e8435a',img:'assets/cards/card-cor.png'},
{id:'pulmo',name:'PULMO',rarity:'common',color:'#00c9d4',img:'assets/cards/card-pulmo.png'},
    {id:'cerebrum',name:'CEREBRUM',rarity:'epic',color:'#4ade80',fact:'Complicated',strength:'Telekinesis',img:'assets/cards/card-cerebrum.png'},
    {id:'skull',name:'SKULL',rarity:'legendary',color:'#f5c97a',fact:'Like a war helmet',strength:'Strongest',img:'assets/cards/card-skull.png'}
  ];

  const getDia=()=>isAdmin()?999999:parseInt(localStorage.getItem(KEY_DIA)||'0');
  const setDia=v=>{if(!isAdmin())localStorage.setItem(KEY_DIA,String(Math.max(0,v)));};
  const getCards=()=>{try{return JSON.parse(localStorage.getItem(KEY_CARDS)||'[]');}catch{return[];}};
  const saveCards=c=>{
    localStorage.setItem(KEY_CARDS,JSON.stringify(c));
    syncCardsToServer(c);
  };
  async function syncCardsToServer(col){
    try{
      if(typeof authCurrentUser!=='function'||!authCurrentUser())return;
      await fetch('/api/auth/cards',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({cards:col})});
    }catch(e){console.warn('Card sync failed',e);}
  }
  async function loadCardsFromServer(){
    try{
      if(typeof authCurrentUser!=='function'||!authCurrentUser())return;
      const r=await fetch('/api/auth/cards',{credentials:'same-origin'});
      if(!r.ok)return;
      const d=await r.json();
      if(d&&Array.isArray(d.cards)&&d.cards.length>0){
        const local=getCards();
        const merged=[...d.cards];
        local.forEach(lc=>{if(!merged.find(sc=>sc.id===lc.id&&sc.at===lc.at))merged.push(lc);});
        localStorage.setItem(KEY_CARDS,JSON.stringify(merged));
      }
    }catch(e){console.warn('Card load failed',e);}
  }
  const getPacks=()=>parseInt(localStorage.getItem(KEY_PACKS)||'0');

  /* Diamond earn */
  let _ans=parseInt(sessionStorage.getItem('clined_qa_cnt')||'0');
  const _orig=window.addXP;
  window.addXP=function(a,r){
    if(_orig)_orig.apply(this,arguments);
    if(a>5||(r&&r.includes('benar'))){
      _ans++;sessionStorage.setItem('clined_qa_cnt',String(_ans));
      if(_ans>0&&_ans%QUIZ_PER_DIA===0){setDia(getDia()+1);updateDia();showDiaPop();}
    }
  };

  function updateDia(){const d=getDia();document.querySelectorAll('[data-diamond-count]').forEach(e=>e.textContent=d);}
  function showDiaPop(){
    const p=document.createElement('div');
    p.className='diamond-earn-pop';p.textContent='💎 +1 Diamond!';
    document.body.appendChild(p);setTimeout(()=>p.remove(),2200);
  }

  /* Pack SVG */
  function packSVG(anim){
    const sw=anim?'<animateTransform attributeName="transform" type="translate" values="-200 0;400 0" dur="1.4s" repeatCount="indefinite"/>':'';
    return '<svg viewBox="0 0 160 220" xmlns="http://www.w3.org/2000/svg" class="pack-svg-art">'
      +'<defs>'
      +'<linearGradient id="pg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#1cb0f6"/><stop offset="50%" stop-color="#7c3aed"/><stop offset="100%" stop-color="#ec4899"/></linearGradient>'
      +'<linearGradient id="ps" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="rgba(255,255,255,0)"/><stop offset="50%" stop-color="rgba(255,255,255,0.38)"/><stop offset="100%" stop-color="rgba(255,255,255,0)"/></linearGradient>'
      +'<linearGradient id="pt" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ffd700"/><stop offset="100%" stop-color="#f59e0b"/></linearGradient>'
      +'<filter id="pglow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
      +'<clipPath id="pc"><rect x="8" y="32" width="144" height="180" rx="12"/></clipPath>'
      +'</defs>'
      +'<ellipse cx="80" cy="215" rx="55" ry="5" fill="rgba(0,0,0,0.18)"/>'
      +'<rect x="8" y="32" width="144" height="180" rx="12" fill="url(#pg)" filter="url(#pglow)"/>'
      +'<rect x="13" y="37" width="134" height="170" rx="9" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="1.5"/>'
      +'<text x="22" y="78" font-size="13" opacity="0.65">✦</text>'
      +'<text x="122" y="68" font-size="9" opacity="0.55">✦</text>'
      +'<text x="112" y="162" font-size="15" opacity="0.6">✦</text>'
      +'<text x="18" y="172" font-size="7" opacity="0.45">✦</text>'
      +'<circle cx="80" cy="125" r="42" fill="rgba(255,255,255,0.11)"/>'
      +'<circle cx="80" cy="125" r="34" fill="rgba(255,255,255,0.07)"/>'
      +'<text x="80" y="139" font-size="38" text-anchor="middle" filter="url(#pglow)">🧬</text>'
      +'<rect x="30" y="175" width="100" height="24" rx="12" fill="rgba(255,255,255,0.17)"/>'
      +'<text x="80" y="191" font-size="10" font-weight="900" text-anchor="middle" fill="white" letter-spacing="2">CLINED</text>'
      +'<rect x="8" y="32" width="144" height="180" rx="12" fill="url(#ps)" clip-path="url(#pc)">'
      +'<rect x="0" y="0" width="60" height="300" fill="url(#ps)">'+sw+'</rect></rect>'
      +'<rect x="8" y="32" width="144" height="28" rx="12" fill="url(#pt)"/>'
      +'<path d="M68,16 L80,32 L92,16 Z" fill="url(#pt)"/>'
      +'<rect x="15" y="39" width="130" height="14" rx="7" fill="rgba(255,255,255,0.24)"/>'
      +'<text x="80" y="50" font-size="9" font-weight="900" text-anchor="middle" fill="rgba(255,255,255,0.95)" letter-spacing="1">ORGAN PACK</text>'
      +'<circle cx="28" cy="46" r="3" fill="rgba(255,255,255,0.38)"/>'
      +'<circle cx="132" cy="46" r="3" fill="rgba(255,255,255,0.38)"/>'
      +'</svg>';
  }

  /* Gacha */
  function openPack(){
    const d=getDia();if(d<PACK_PRICE)return null;
    setDia(d-PACK_PRICE);updateDia();
    localStorage.setItem(KEY_PACKS,String(getPacks()+1));
    // Weighted random: legendary 5%, epic 15%, rare 30%, common 50%
    const weights={legendary:5,epic:15,rare:30,common:50};
    const roll=Math.random()*100;
    let tiers=CARD_CATALOG.filter(c=>c.rarity==='common');
    if(roll<5)tiers=CARD_CATALOG.filter(c=>c.rarity==='legendary');
    else if(roll<20)tiers=CARD_CATALOG.filter(c=>c.rarity==='epic');
    else if(roll<50)tiers=CARD_CATALOG.filter(c=>c.rarity==='rare');
    const pool=tiers.length?tiers:CARD_CATALOG;
    const card=pool[Math.floor(Math.random()*pool.length)];
    const col=getCards();col.push({id:card.id,at:new Date().toISOString()});saveCards(col);
    return card;
  }

  /* Rarity label */
  const RARITY_LABEL={common:'COMMON',rare:'⭐ RARE',epic:'💜 EPIC',legendary:'👑 LEGENDARY'};
  const RARITY_COLOR={common:'rgba(255,255,255,.12)',rare:'linear-gradient(135deg,#fbbf24,#f59e0b)',epic:'linear-gradient(135deg,#a855f7,#7c3aed)',legendary:'linear-gradient(135deg,#ffd700,#ff8c00)'};

  /* Collection grid */
  function buildGrid(){
    const col=getCards();
    if(!col.length)return '<div class="card-coll-empty">Belum ada kartu.<br>Buka pack pertamamu! 🎴</div>';
    const counts={};col.forEach(c=>counts[c.id]=(counts[c.id]||0)+1);
    return CARD_CATALOG.map(card=>{
      const n=counts[card.id]||0;
      if(!n)return '<div class="coll-card-slot locked"><span>🔒</span><small>???</small></div>';
      return '<div class="coll-card-slot rarity-'+card.rarity+'" style="--card-color:'+card.color+'">'
        +'<img src="'+card.img+'" alt="'+card.name+'" class="coll-card-img" loading="lazy"/>'
        +'<div class="coll-card-name">'+card.name+'</div>'
        +(n>1?'<div class="coll-card-badge">×'+n+'</div>':'')
        +'</div>';
    }).join('');
  }

  /* Shop HTML */
  function buildShop(){
    const d=getDia(),n=getCards().length;
    return '<div class="card-shop-inner">'
      +'<div class="card-shop-header">'
      +'<div><div class="card-shop-kicker">CLINED CARDS</div><h3>Card Shop</h3><p>Kumpulkan semua kartu organ!</p></div>'
      +'<button class="card-shop-close" id="closeCardShop" aria-label="Tutup">✕</button>'
      +'</div>'
      +'<div class="card-shop-dia-row">'
      +'<span class="card-shop-dia-badge">💎 <b data-diamond-count>'+(isAdmin()?'∞':d)+'</b></span>'
      +'<small>+1 💎 setiap 5 soal benar</small>'
      +'</div>'
      +'<div class="card-shop-divider"></div>'
      +'<div class="card-pack-feature">'
      +'<div class="card-pack-art">'+packSVG(true)+'</div>'
      +'<div class="card-pack-info">'
      +'<div class="card-pack-name">Organ Pack</div>'
      +'<div class="card-pack-desc">1 kartu acak • chance LEGENDARY!</div>'
      +'<div class="card-rarity-odds">'
      +'<span class="odds-pill common">COMMON 50%</span>'
      +'<span class="odds-pill rare">RARE 30%</span>'
      +'<span class="odds-pill epic">EPIC 15%</span>'
      +'<span class="odds-pill legendary">LEGENDARY 5%</span>'
      +'</div>'
      +'<div class="card-pack-price">💎 '+PACK_PRICE+'</div>'
      +'<button class="card-shop-buy-btn" id="buyPackBtn"'+(!isAdmin()&&d<PACK_PRICE?' disabled':'')+'>'
      +(!isAdmin()&&d<PACK_PRICE?'💎 '+d+'/'+PACK_PRICE:'🎴 Buka Pack')
      +'</button>'
      +'</div></div>'
      +'<div class="card-shop-divider"></div>'
      +'<div class="card-collection-title">Koleksiku <span class="card-coll-count">'+n+' / '+CARD_CATALOG.length+'</span></div>'
      +'<div class="card-collection-grid">'+buildGrid()+'</div>'
      +'</div>';
  }

  /* REVEAL — cinematic multi-phase */
  function showReveal(card){
    const isRare=card.rarity==='rare';
    const isEpic=card.rarity==='epic';
    const isLegendary=card.rarity==='legendary';
    const isFancy=isRare||isEpic||isLegendary;
    const ov=document.createElement('div');
    ov.className='card-reveal-overlay'+(isLegendary?' reveal-legendary':isEpic?' reveal-epic':'');
    ov.innerHTML=
      '<div class="card-reveal-bg-rays" id="rvRays" hidden></div>'
      +'<div class="card-reveal-particles" id="rvParticles"></div>'
      +'<div class="card-reveal-inner">'
      +'<div class="card-reveal-glow" style="--glow:'+card.color+'"></div>'
      +'<div id="rvPack" class="card-reveal-pack">'
      +'<div class="pack-shine-ring"></div>'
      +packSVG(false)
      +'</div>'
      +'<div id="rvResult" class="card-reveal-result" hidden>'
      +'<div class="card-reveal-label">'+(isLegendary?'👑 LEGENDARY! 👑':isEpic?'💜 Epic Pull! 💜':isFancy?'✨ Kartu Langka! ✨':'Kartu Baru!')+'</div>'
      +'<div class="card-result-wrap rarity-'+card.rarity+'" style="--rarity-color:'+card.color+'">'
      +(isFancy?'<div class="rare-shine"></div>':'')
      +'<img src="'+card.img+'" alt="'+card.name+'" class="card-result-img" loading="eager"/>'
      +'</div>'
      +'<div class="card-reveal-name">'+card.name+'</div>'
      +'<div class="card-reveal-rarity '+card.rarity+'">'+RARITY_LABEL[card.rarity]+'</div>'
      +'<button class="card-reveal-ok" id="rvOk">Simpan ke Koleksi →</button>'
      +'</div>'
      +'<div class="card-reveal-hint-wrap" id="rvHint">'
      +'<span class="hint-tap-icon">👆</span><span>Tap untuk membuka</span>'
      +'</div>'
      +'</div>';
    document.body.appendChild(ov);

    /* Particle burst */
    function burstParticles(){
      const container=document.getElementById('rvParticles');if(!container)return;
      const palettes={
        common:['#fff','#a5f3fc','#86efac','#c4b5fd'],
        rare:['#fbbf24','#f59e0b','#ffd700','#fff','#fb7185'],
        epic:['#a855f7','#c084fc','#e879f9','#fff','#818cf8'],
        legendary:['#ffd700','#ff8c00','#fff','#fbbf24','#f97316','#ec4899']
      };
      const colors=palettes[card.rarity]||palettes.common;
      const count={common:14,rare:24,epic:32,legendary:48}[card.rarity]||14;
      for(let i=0;i<count;i++){
        const p=document.createElement('div');
        const isStr=Math.random()>.5;
        p.className='rv-particle'+(isStr?' rv-particle--star':'');
        p.style.cssText='--tx:'+(Math.random()*280-140)+'px;--ty:'+(-(Math.random()*220+60))+'px;'
          +'--rot:'+(Math.random()*720-360)+'deg;'
          +'--bg:'+colors[Math.floor(Math.random()*colors.length)]+';'
          +'--sz:'+(Math.random()*10+4)+'px;'
          +'--delay:'+(Math.random()*.2)+'s;'
          +'--dur:'+(Math.random()*.5+.5)+'s;'
          +'left:calc(50% + '+(Math.random()*80-40)+'px);top:40%;';
        container.appendChild(p);
        setTimeout(()=>p.remove(),1000);
      }
    }

    let done=false;
    function openPk(){
      if(done)return;done=true;
      const pack=document.getElementById('rvPack');
      const hint=document.getElementById('rvHint');
      const result=document.getElementById('rvResult');
      const rays=document.getElementById('rvRays');
      if(hint)hint.classList.add('hint-exit');
      // Phase 1: glow surge
      pack.classList.add('pack-pre-open');
      setTimeout(()=>{
        // Phase 2: shake
        pack.classList.remove('pack-pre-open');
        pack.classList.add('pack-opening');
        setTimeout(()=>{
          // Phase 3: particles + explode
          burstParticles();
          pack.classList.add('pack-explode');
          // Rays for epic/legendary
          if(isEpic||isLegendary){rays.hidden=false;rays.classList.add('rays-spin');}
          setTimeout(()=>{
            pack.hidden=true;
            // Phase 4: card appear
            result.hidden=false;
            result.classList.add('result-appear');
            // Phase 5: screen flash
            if(isLegendary){ov.classList.add('legendary-flash');setTimeout(()=>ov.classList.remove('legendary-flash'),800);}
            else if(isFancy){ov.classList.add('rare-flash');setTimeout(()=>ov.classList.remove('rare-flash'),500);}
          },340);
        },420);
      },220);
    }

    ov.addEventListener('click',function(e){
      if(e.target.id==='rvOk'||e.target.closest&&e.target.closest('#rvOk')){
        ov.classList.add('closing');setTimeout(()=>{ov.remove();refreshShop();},450);return;
      }
      if(!done)openPk();
    });
    ov.addEventListener('touchend',function(e){
      const t=e.target;
      if(t.id==='rvOk'||(t.closest&&t.closest('#rvOk'))){return;}
      e.preventDefault();if(!done)openPk();
    },{passive:false});
  }

  /* Shop modal */
  function refreshShop(){const c=document.getElementById('cardShopContainer');if(c){c.innerHTML=buildShop();bindShop();}}
  function bindShop(){
    const cl=document.getElementById('closeCardShop');if(cl)cl.addEventListener('click',hideShop);
    const buy=document.getElementById('buyPackBtn');
    if(buy)buy.addEventListener('click',()=>{const card=openPack();if(!card)return;hideShop();showReveal(card);});
  }
  function _blockBodyScroll(e){
    const c=document.getElementById('cardShopContainer');
    if(c&&c.contains(e.target))return;
    e.preventDefault();
  }
  function showShop(){
    let m=document.getElementById('cardShopModal');
    if(!m){
      m=document.createElement('div');m.id='cardShopModal';m.className='card-shop-modal';
      m.innerHTML='<div class="card-shop-backdrop" id="csBd"></div><div id="cardShopContainer" class="card-shop-container"></div>';
      document.body.appendChild(m);
      document.getElementById('csBd').addEventListener('click',hideShop);
    }
    document.getElementById('cardShopContainer').innerHTML=buildShop();
    bindShop();
    requestAnimationFrame(()=>m.classList.add('open'));
    document.body.dataset.shopOpen='1';
    document.addEventListener('touchmove',_blockBodyScroll,{passive:false});
  }
  function hideShop(){
    const m=document.getElementById('cardShopModal');if(m)m.classList.remove('open');
    delete document.body.dataset.shopOpen;
    document.removeEventListener('touchmove',_blockBodyScroll);
  }

  /* FAB inject */
  function injectUI(){
    loadCardsFromServer().then(()=>refreshShop()).catch(()=>{});
    const items=document.querySelectorAll('.duo-reward-item');
    if(items.length>=4){
      items[3].innerHTML='<span class="duo-reward-icon">💎</span><div><b data-diamond-count>'+(isAdmin()?'∞':getDia())+'</b><small>Diamond</small></div>';
    }
    if(!document.getElementById('cardShopFab')){
      const fab=document.createElement('button');
      fab.id='cardShopFab';fab.className='card-shop-fab';
      fab.setAttribute('aria-label','Card Shop');
      fab.innerHTML='<img class="fab-basket-img" src="assets/cards/fab-basket.png" alt="shop"/>'
        +(isAdmin()?'<span class="fab-dia fab-dia--admin">∞ 💎</span>'
          :'<span class="fab-dia"><span data-diamond-count>'+getDia()+'</span> 💎</span>');
      // Drag
      let _d=false,_mx=false,_fx=0,_fy=0,_sx=0,_sy=0;
      function _start(cx,cy){_d=true;_mx=false;const r=fab.getBoundingClientRect();_fx=r.left;_fy=r.top;_sx=cx;_sy=cy;fab.style.transition='none';}
      function _move(cx,cy){
        if(!_d)return;
        const dx=cx-_sx,dy=cy-_sy;
        if(Math.abs(dx)>5||Math.abs(dy)>5)_mx=true;
        if(!_mx)return;
        const r=fab.getBoundingClientRect();
        fab.style.left=Math.max(8,Math.min(window.innerWidth-r.width-8,_fx+dx))+'px';
        fab.style.top=Math.max(56,Math.min(window.innerHeight-r.height-8,_fy+dy))+'px';
        fab.style.bottom='auto';fab.style.right='auto';
      }
      function _end(){
        if(!_d)return;_d=false;
        fab.style.transition='transform .18s ease,box-shadow .18s ease';
        if(!_mx){showShop();return;}
        // Snap edge
        const r=fab.getBoundingClientRect();
        const toLeft=r.left+r.width/2<window.innerWidth/2;
        fab.style.left=toLeft?'14px':(window.innerWidth-r.width-14)+'px';
        setTimeout(()=>_mx=false,80);
      }
      fab.addEventListener('touchstart',e=>{_start(e.touches[0].clientX,e.touches[0].clientY);},{passive:true});
      fab.addEventListener('touchmove',e=>{_move(e.touches[0].clientX,e.touches[0].clientY);if(_mx)e.preventDefault();},{passive:false});
      fab.addEventListener('touchend',_end,{passive:true});
      fab.addEventListener('mousedown',e=>{if(e.button===0)_start(e.clientX,e.clientY);});
      document.addEventListener('mousemove',e=>{if(_d)_move(e.clientX,e.clientY);});
      document.addEventListener('mouseup',e=>{if(_d)_end();});
      fab.addEventListener('click',e=>{if(_mx)e.stopPropagation();});
      document.body.appendChild(fab);
    }
    updateDia();
  }

  /* Jaga class home-context selalu sinkron dengan view aktif (FAB hanya tampil di Beranda setelah login) */
  function syncHomeContext(){
    const b=document.body,h=document.getElementById('home');
    const want=!!(h&&h.classList.contains('active'))&&!b.classList.contains('auth-pending');
    if(b.classList.contains('home-context')!==want)b.classList.toggle('home-context',want);
  }
  function watchHome(){
    syncHomeContext();
    const mo=new MutationObserver(syncHomeContext);
    mo.observe(document.body,{attributes:true,attributeFilter:['class']});
    document.querySelectorAll('.view').forEach(v=>mo.observe(v,{attributes:true,attributeFilter:['class']}));
  }
  const boot=()=>{injectUI();watchHome();};
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot):boot();
  window.cardShop={show:showShop,hide:hideShop,getDiamonds:getDia};
})();
