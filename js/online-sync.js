/* Account-scoped online study data sync with delta pulls. */
(() => {
  'use strict';
  const QUEUE='clined_online_sync_queue_v3', ACTIVE_USER='clined_active_user_id_v3', CURSOR='clined_sync_cursor_v1';
  const LEGACY_QUEUE='clined_online_sync_queue_v2';
  const safe=key=>/^(gaster_|clined_(?!account_profile|google_form_url|schema_version|migrated_at|menu|active_user_id|sync_cursor)|medicalRpg|medical_rpg|current_block|last_worked|dashboard_block|alpha5_)/.test(key)&&!/auth|password|session|token|sync_queue|last_activity/i.test(key);
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
  function mergeJsonKey(key, localRaw, serverRaw){
    if(localRaw===null||localRaw===undefined)return{value:serverRaw,dirty:false};
    try{
      const loc=JSON.parse(localRaw), srv=JSON.parse(serverRaw);
      if(key==='gaster_v8_bookmarks'&&Array.isArray(loc)&&Array.isArray(srv)){
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
            const lt=Date.parse(item.lastWrong||0)||0, pt=Date.parse(prev.lastWrong||0)||0;
            if(lw>pw||lt>pt){byId.set(k,{...prev,...item,wrong:Math.max(lw,pw),lastWrong:lt>=pt?(item.lastWrong||prev.lastWrong):prev.lastWrong});changed=true;}
          }
        }
        return{value:JSON.stringify([...byId.values()]),dirty:changed};
      }
    }catch{}
    return null;
  }
  function apply(state){
    let restoreXP=null;
    const rePush=[];
    const xpKey='gaster_v11_xp';
    const xpNumber=raw=>{
      if(typeof raw!=='string'||!/^\s*\d+\s*$/.test(raw))return null;
      const n=Number(raw);
      return Number.isSafeInteger(n)&&n>=0?n:null;
    };
    suppress=true;
    try{
      for(const [key,item] of Object.entries(state||{})){
        if(!safe(key)||!item)continue;
        if(key===xpKey){
          const localRaw=localStorage.getItem(xpKey);
          const localXP=xpNumber(localRaw);
          const serverXP=item.deleted?null:xpNumber(item.value);
          if(localXP!==null&&(serverXP===null||localXP>serverXP)){
            restoreXP=localRaw;
            continue;
          }
        }
        if(item.deleted){nativeRemove(key);continue;}
        if(typeof item.value==='string'){
          const merged=mergeJsonKey(key,localStorage.getItem(key),item.value);
          if(merged){
            nativeSet(key,merged.value);
            if(merged.dirty)rePush.push([key,merged.value]);
          }else{
            nativeSet(key,item.value);
          }
        }
      }
    }finally{suppress=false;}
    if(restoreXP!==null)markSet(xpKey,restoreXP);
    for(const [k,v] of rePush)markSet(k,v);
    if(Object.keys(state||{}).length)window.dispatchEvent(new CustomEvent('clined:sync-applied'));
  }
  function snapshot(serverState){for(const key of learningKeys())if(!serverState[key])enqueue({id:uuid(),type:'set',key,value:localStorage.getItem(key),updatedAt:new Date().toISOString()});}
  async function pull(force=false){let cursor=localStorage.getItem(CURSOR);let loops=0;while(loops++<10){
    // force berarti 'jalankan sekarang', BUKAN 'download full state'.
    // Full sync hanya dilakukan saat user belum punya cursor (akun/perangkat baru).
    const path=cursor?`/api/sync?since=${encodeURIComponent(cursor)}`:'/api/sync';
    const d=await request(path);
    if(d.mode==='full'){apply(d.state||{});snapshot(d.state||{});}else apply(d.changes||{});
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
      let batch=[];
      for(const op of ops){
        const candidate=[...batch,op];
        if(batch.length&&new Blob([JSON.stringify({operations:candidate})]).size>450000){
          batches.push(batch);
          batch=[op];
        }else{
          batch=candidate;
        }
      }
      if(batch.length)batches.push(batch);

      for(const group of batches){
        if(new Blob([JSON.stringify({operations:group})]).size>520000)continue;
        const saved=await request('/api/sync',{
          method:'POST',
          body:JSON.stringify({operations:group})
        });
        const accepted=saved.changes||{};
        const confirmed=group.filter(op=>{
          if(!Object.prototype.hasOwnProperty.call(accepted,op.key))return false;
          const result=accepted[op.key];
          return op.type==='delete'
            ? result?.deleted===true
            : result?.deleted!==true&&result?.value===op.value;
        });
        if(confirmed.length){
          const ids=new Set(confirmed.map(op=>op.id));
          setQueue(getQueue().filter(op=>!ids.has(op.id)),true);
        }
        apply(accepted);
        if(saved.updatedAt)localStorage.setItem(CURSOR,saved.updatedAt);
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
  let dirtyTimer=0;
  window.CLINED_ONLINE_SYNC={sync,switchUser,clearLocalLearningData,markDirty:()=>{dirty=true;clearTimeout(dirtyTimer);dirtyTimer=setTimeout(()=>sync({force:true}),900)}};
  window.addEventListener('load',()=>sync({force:true}),{once:true});
})();
