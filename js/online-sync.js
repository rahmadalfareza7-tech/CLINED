/* Account-scoped online study data sync with delta pulls. */
(() => {
  'use strict';
  const QUEUE='clined_online_sync_queue_v3', ACTIVE_USER='clined_active_user_id_v3', CURSOR='clined_sync_cursor_v1';
  const LEGACY_QUEUE='clined_online_sync_queue_v2';
  const safe=key=>/^(gaster_|clined_(?!account_profile|google_form_url|schema_version|migrated_at|menu|active_user_id|sync_cursor|xp_queue)|medicalRpg|medical_rpg|current_block|last_worked|dashboard_block|alpha5_)/.test(key)&&!/auth|password|session|token|sync_queue|last_activity|xp_queue/i.test(key);
  const learningKeys=()=>Array.from({length:localStorage.length},(_,i)=>localStorage.key(i)).filter(k=>k&&safe(k));
  let suppress=false, sending=false, dirty=true, lastPullAt=0;
  const PERIODIC_PULL_MS=10*60_000;
  const nativeSet=localStorage.setItem.bind(localStorage),nativeRemove=localStorage.removeItem.bind(localStorage);
  const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k)||'')??f}catch{return f}};
  let memQueue=null, queueFlushTimer=0;
  function getQueue(){
    if(!memQueue){
      const raw=read(QUEUE,[]);
      memQueue=Array.isArray(raw)?raw:[];
    }
    return memQueue;
  }
  function flushQueueNow(){
    clearTimeout(queueFlushTimer);queueFlushTimer=0;
    if(!memQueue)return;
    try{nativeSet(QUEUE,JSON.stringify(memQueue));}catch{}
  }
  function scheduleQueueFlush(){
    clearTimeout(queueFlushTimer);
    queueFlushTimer=setTimeout(flushQueueNow,180);
  }
  function setQueue(next,immediate=false){
    memQueue=Array.isArray(next)?next.slice(-200):[];
    if(immediate)flushQueueNow();
    else scheduleQueueFlush();
  }
  const uuid=()=>crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random()}`;
  function clearLocalLearningData(){suppress=true;try{for(const k of learningKeys())localStorage.removeItem(k);memQueue=[];clearTimeout(queueFlushTimer);nativeRemove(QUEUE);nativeRemove(LEGACY_QUEUE);nativeRemove(CURSOR);}finally{suppress=false;}}
  function switchUser(userId){const id=String(userId||''),prev=localStorage.getItem(ACTIVE_USER)||'';if(!id){clearLocalLearningData();localStorage.removeItem(ACTIVE_USER);return{changed:Boolean(prev)}}if(prev!==id){clearLocalLearningData();localStorage.setItem(ACTIVE_USER,id);dirty=true;lastPullAt=0;return{changed:true}}return{changed:false}}
  function enqueue(operation){if(suppress)return;const q=getQueue();const next=[];for(let i=0;i<q.length;i++){if(q[i]?.key!==operation.key)next.push(q[i]);}next.push(operation);setQueue(next,false);dirty=true;}
  function markSet(key,value){if(safe(key))enqueue({id:uuid(),type:'set',key,value,updatedAt:new Date().toISOString()});}
  function markDelete(key){if(safe(key))enqueue({id:uuid(),type:'delete',key,updatedAt:new Date().toISOString()});}
  localStorage.setItem=(key,value)=>{nativeSet(key,String(value));if(!suppress&&safe(key))markSet(key,String(value));};
  localStorage.removeItem=key=>{const was=safe(key)&&localStorage.getItem(key)!==null;nativeRemove(key);if(was&&!suppress)markDelete(key);};
  async function request(path,options={}){const r=await fetch(path,{credentials:'same-origin',headers:{'Content-Type':'application/json',...(options.headers||{})},...options});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Sinkronisasi gagal.');return d;}
  function maxMergeDeep(a,b){
    if(typeof a==='number'&&typeof b==='number')return Math.max(a,b);
    if(typeof a==='boolean'&&typeof b==='boolean')return a||b;
    if(Array.isArray(a)&&Array.isArray(b)){
      const out=[...b];
      for(const item of a)if(!out.some(x=>JSON.stringify(x)===JSON.stringify(item)))out.push(item);
      return out;
    }
    if(a&&b&&typeof a==='object'&&typeof b==='object'&&!Array.isArray(a)&&!Array.isArray(b)){
      const out={...b};
      for(const [k,v] of Object.entries(a))out[k]=Object.prototype.hasOwnProperty.call(b,k)?maxMergeDeep(v,b[k]):v;
      return out;
    }
    return b!==undefined?b:a;
  }
  function mergeJsonKey(key, localRaw, serverRaw){
    if(localRaw===null||localRaw===undefined)return{value:serverRaw,dirty:false};
    try{
      const loc=JSON.parse(localRaw), srv=JSON.parse(serverRaw);
      if((key==='gaster_v8_bookmarks'||key==='clined_unlocked_achievements_v1'||key==='clined_kedkel_summary_done_v2'||key==='clined_kedkel_summary_star_v2'||key==='clined_seen_cosmetics_v1')&&Array.isArray(loc)&&Array.isArray(srv)){
        const merged=[...new Set([...srv,...loc])];
        return{value:JSON.stringify(merged),dirty:merged.length>srv.length};
      }
      if(key==='clined_study_log_v1'&&loc&&srv&&typeof loc==='object'&&typeof srv==='object'&&!Array.isArray(loc)&&!Array.isArray(srv)){
        const merged={...srv};let changed=false;
        for(const [d,v] of Object.entries(loc)){const ln=Number(v)||0,sn=Number(srv[d])||0;if(ln>sn){merged[d]=ln;changed=true;}}
        return{value:JSON.stringify(merged),dirty:changed};
      }
      if(key==='gaster_v8_wrong_stats'&&Array.isArray(loc)&&Array.isArray(srv)){
        const byId=new Map();let changed=false;
        for(const item of srv)if(item&&item.id!=null)byId.set(String(item.id),item);
        for(const item of loc){
          if(!item||item.id==null)continue;
          const k=String(item.id), prev=byId.get(k);
          if(!prev){byId.set(k,item);changed=true;}
          else{
            const lw=Number(item.wrong)||0, pw=Number(prev.wrong)||0;
            const lt=Date.parse(item.lastWrong||item.lastSeen||0)||0, pt=Date.parse(prev.lastWrong||prev.lastSeen||0)||0;
            if(lw>pw||lt>pt){byId.set(k,{...prev,...item,wrong:Math.max(lw,pw),lastWrong:lt>=pt?(item.lastWrong||prev.lastWrong):prev.lastWrong});changed=true;}
          }
        }
        return{value:JSON.stringify([...byId.values()]),dirty:changed};
      }
      if(key==='gaster_daily_streak_v1'&&loc&&srv&&typeof loc==='object'&&typeof srv==='object'){
        const days=[...new Set([...(Array.isArray(srv.days)?srv.days:[]),...(Array.isArray(loc.days)?loc.days:[])])].sort();
        const lLast=String(loc.lastDate||''),sLast=String(srv.lastDate||'');
        const lastDate=lLast>=sLast?lLast:sLast;
        const streak=Math.max(Number(loc.streak)||0,Number(srv.streak)||0);
        const best=Math.max(Number(loc.best)||0,Number(srv.best)||0,streak);
        const merged={...srv,...loc,days,lastDate,streak,best};
        return{value:JSON.stringify(merged),dirty:JSON.stringify(merged)!==JSON.stringify(srv)};
      }
      if(key==='gaster_v8_history'&&Array.isArray(loc)&&Array.isArray(srv)){
        const sig=x=>`${x?.at||x?.ts||x?.date||''}|${x?.bank||x?.bankId||''}|${x?.score??''}|${x?.total??''}`;
        const map=new Map();
        for(const item of srv)if(item&&typeof item==='object')map.set(sig(item),item);
        let changed=false;
        for(const item of loc){if(!item||typeof item!=='object')continue;const k=sig(item);if(!map.has(k)){map.set(k,item);changed=true;}}
        const merged=[...map.values()].sort((a,b)=>(Date.parse(b?.at||b?.ts||b?.date||0)||0)-(Date.parse(a?.at||a?.ts||a?.date||0)||0)).slice(0,250);
        return{value:JSON.stringify(merged),dirty:changed};
      }
      if(key==='gaster_v22_question_performance'&&loc&&srv&&typeof loc==='object'&&typeof srv==='object'&&!Array.isArray(loc)&&!Array.isArray(srv)){
        const merged={...srv};let changed=false;
        for(const [k,lv] of Object.entries(loc)){
          const sv=srv[k];
          if(!sv){merged[k]=lv;changed=true;}
          else if(lv&&typeof lv==='object'&&typeof sv==='object'){
            const la=Number(lv.attempts||lv.seen||0),sa=Number(sv.attempts||sv.seen||0),lc=Number(lv.correct||0),sc=Number(sv.correct||0),lw=Number(lv.wrong||0),sw=Number(sv.wrong||0);
            if(la>sa||lc>sc||lw>sw){merged[k]={...sv,...lv,attempts:Math.max(la,sa),correct:Math.max(lc,sc),wrong:Math.max(lw,sw)};changed=true;}
          }
        }
        return{value:JSON.stringify(merged),dirty:changed};
      }
      if(key==='clined_sm2_v1'&&loc&&srv&&typeof loc==='object'&&typeof srv==='object'){
        const merged={...srv};let changed=false;
        for(const [k,lv] of Object.entries(loc)){
          const sv=srv[k];
          if(!sv){merged[k]=lv;changed=true;}
          else{
            const lt=Date.parse(lv?.lastReview||lv?.updatedAt||0)||0,st=Date.parse(sv?.lastReview||sv?.updatedAt||0)||0;
            if(lt>st||(Number(lv?.reps)||0)>(Number(sv?.reps)||0)){merged[k]=lv;changed=true;}
          }
        }
        return{value:JSON.stringify(merged),dirty:changed};
      }
      if((key==='clined_notes_v1'||key==='clined_bank_best_v1'||key==='clined_materi_best_v1'||key==='clined_resep_best_v1'||key==='clined_resep_lp_best_v1'||key==='clined_clinical_quest_v1'||key==='clined_duel_claims_v1'||key==='clined_ann_seen_v1')&&loc&&srv&&typeof loc==='object'&&typeof srv==='object'&&!Array.isArray(loc)&&!Array.isArray(srv)){
        const merged=maxMergeDeep(loc,srv);
        return{value:JSON.stringify(merged),dirty:JSON.stringify(merged)!==JSON.stringify(srv)};
      }
      if(key==='clined_xp_daily_refs_v1'&&loc&&srv&&typeof loc==='object'&&typeof srv==='object'){
        if(loc.day&&loc.day===srv.day){
          const v=Math.max(Number(loc.v)||1,Number(srv.v)||1);
          const lRefs=loc.refs&&typeof loc.refs==='object'?loc.refs:{};
          const sRefs=srv.refs&&typeof srv.refs==='object'?srv.refs:{};
          const refs={};
          const keys=new Set([...Object.keys(sRefs),...Object.keys(lRefs)]);
          let dirty=v>(Number(srv.v)||1);
          for(const k of keys){
            const lv=Number(lRefs[k])||0, sv=Number(sRefs[k])||0;
            const normL=(Number(loc.v)>=2)?lv:(lv?9999:0);
            const normS=(Number(srv.v)>=2)?sv:(sv?9999:0);
            const mx=Math.max(normL,normS);
            refs[k]=mx;
            if(mx>normS||!(k in sRefs))dirty=true;
          }
          return{value:JSON.stringify({v,day:srv.day,refs}),dirty};
        }
        return{value:JSON.stringify(String(loc.day||'')>String(srv.day||'')?loc:srv),dirty:String(loc.day||'')>String(srv.day||'')};
      }
      if(key.startsWith('clined_timer_sessions_')){
        const mx=Math.max(Number(loc)||0,Number(srv)||0);
        return{value:String(mx),dirty:mx>(Number(srv)||0)};
      }
    }catch{}
    return null;
  }
  function parseXpNum(raw){
    if(typeof raw==='number')return Number.isFinite(raw)&&raw>=0?Math.round(raw):null;
    if(typeof raw!=='string'||!raw.trim())return null;
    try{
      const p=JSON.parse(raw);
      const n=Number(p);
      return Number.isFinite(n)&&n>=0?Math.round(n):null;
    }catch{
      const n=Number(raw);
      return Number.isFinite(n)&&n>=0?Math.round(n):null;
    }
  }
  function apply(state, opts={}){
    let restoreXP=null;
    const rePush=[];
    const xpKey='gaster_v11_xp';
    let changed=Boolean(opts&&opts.forceNotify);
    suppress=true;
    try{
      for(const [key,item] of Object.entries(state||{})){
        if(!safe(key)||!item)continue;
        if(key===xpKey){
          const localRaw=localStorage.getItem(xpKey);
          const localXP=parseXpNum(localRaw);
          const serverXP=item.deleted?null:parseXpNum(item.value);
          if(localXP!==null&&(serverXP===null||localXP>serverXP)){
            restoreXP=String(localXP);
            continue;
          }
        }
        if(item.deleted){
          if(localStorage.getItem(key)!==null){nativeRemove(key);changed=true;}
          continue;
        }
        if(typeof item.value==='string'){
          const prevVal=localStorage.getItem(key);
          const merged=mergeJsonKey(key,prevVal,item.value);
          if(merged){
            if(prevVal!==merged.value){nativeSet(key,merged.value);changed=true;}
            if(merged.dirty)rePush.push([key,merged.value]);
          }else{
            if(prevVal!==item.value){nativeSet(key,item.value);changed=true;}
          }
        }
      }
    }finally{suppress=false;}
    if(restoreXP!==null)markSet(xpKey,restoreXP);
    for(const [k,v] of rePush)markSet(k,v);
    if(changed&&Object.keys(state||{}).length)window.dispatchEvent(new CustomEvent('clined:sync-applied'));
  }
  function snapshot(serverState){for(const key of learningKeys())if(!serverState[key])enqueue({id:uuid(),type:'set',key,value:localStorage.getItem(key),updatedAt:new Date().toISOString()});}
  async function pull(force=false){let cursor=localStorage.getItem(CURSOR);let loops=0;while(loops++<10){
    // force berarti 'jalankan sekarang', BUKAN 'download full state'.
    // Full sync hanya dilakukan saat user belum punya cursor (akun/perangkat baru).
    const path=cursor?`/api/sync?since=${encodeURIComponent(cursor)}`:'/api/sync';
    const d=await request(path);
    if(d.mode==='full'){apply(d.state||{},{forceNotify:true});snapshot(d.state||{});}else apply(d.changes||{});
    if(d.updatedAt){cursor=d.updatedAt;nativeSet(CURSOR,d.updatedAt);}
    if(!d.hasMore)return d;
  }
  return {mode:'delta',hasMore:true,updatedAt:cursor};
}
  function flushBeacon(){
    try{
      flushQueueNow();
      if(!navigator.onLine||!localStorage.getItem(ACTIVE_USER))return;
      const ops=getQueue();
      if(!ops.length)return;
      const payload=JSON.stringify({operations:ops.slice(-50)});
      if(payload.length<=60000){
        fetch('/api/sync',{method:'POST',credentials:'same-origin',keepalive:true,headers:{'Content-Type':'application/json'},body:payload}).catch(()=>{});
      }
    }catch{}
  }
  async function sync({force=false}={}){
    if(sending||!navigator.onLine)return;
    const id=localStorage.getItem(ACTIVE_USER);
    if(!id)return;
    const needs=force||dirty||getQueue().length||(Date.now()-lastPullAt>=PERIODIC_PULL_MS);
    if(!needs)return;
    sending=true;
    try{
      await pull(force);
      const ops=getQueue().slice();
      const batches=[];
      let batch=[], batchEst=32;
      for(const op of ops){
        const opEst=(String(op?.key||'').length+String(op?.value||'').length)*2+160;
        if(batch.length&&batchEst+opEst>420000){
          batches.push(batch);
          batch=[op];
          batchEst=32+opEst;
        }else{
          batch.push(op);
          batchEst+=opEst;
        }
      }
      if(batch.length)batches.push(batch);

      for(const group of batches){
        const bodyStr=JSON.stringify({operations:group});
        if(new Blob([bodyStr]).size>520000)continue;
        const saved=await request('/api/sync',{
          method:'POST',
          body:bodyStr
        });
        const accepted=saved.changes||{};
        const confirmed=group.filter(op=>{
          if(!Object.prototype.hasOwnProperty.call(accepted,op.key))return false;
          const result=accepted[op.key];
          if(op.type==='delete')return result?.deleted===true;
          if(op.key==='gaster_v11_xp'&&result?.deleted!==true){
            const rv=parseXpNum(result?.value), ov=parseXpNum(op.value);
            if(rv!==null&&ov!==null&&rv>=ov)return true;
          }
          return result?.deleted!==true&&result?.value===op.value;
        });
        if(confirmed.length){
          const ids=new Set(confirmed.map(op=>op.id));
          setQueue(getQueue().filter(op=>!ids.has(op.id)),true);
        }
        apply(accepted);
        if(saved.updatedAt)nativeSet(CURSOR,saved.updatedAt);
        if(saved.unlocked100k?.unlocked)window.CLINED_XP_100K?.onUnlock?.(saved.unlocked100k);
      }
      dirty=getQueue().length>0;
      lastPullAt=Date.now();
    }catch{
      dirty=true;
    }finally{
      sending=false;
    }
  }
  window.addEventListener('online',()=>sync({force:true}));
  window.addEventListener('pagehide',()=>{flushBeacon();});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flushBeacon();});
  window.addEventListener('clined:auth-ready',()=>sync({force:true}));
  setInterval(()=>sync(),PERIODIC_PULL_MS);
  let dirtyTimer=0, dirtySince=0;
  window.CLINED_ONLINE_SYNC={
    sync,switchUser,clearLocalLearningData,
    markDirty:()=>{
      dirty=true;
      if(!dirtySince)dirtySince=Date.now();
      if(Date.now()-dirtySince>=2500){
        clearTimeout(dirtyTimer);dirtyTimer=0;dirtySince=0;
        sync({force:true});
      }else if(!dirtyTimer){
        dirtyTimer=setTimeout(()=>{dirtyTimer=0;dirtySince=0;sync({force:true});},900);
      }
    }
  };
  window.addEventListener('load',()=>sync({force:true}),{once:true});
})();
