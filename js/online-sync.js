/* Account-scoped online study data sync with delta pulls. */
(() => {
  'use strict';
  const QUEUE='clined_online_sync_queue_v3', ACTIVE_USER='clined_active_user_id_v3', CURSOR='clined_sync_cursor_v1';
  const LEGACY_QUEUE='clined_online_sync_queue_v2';
  const safe=key=>/^(gaster_|clined_(?!account_profile|google_form_url|schema_version|migrated_at|menu|active_user_id|sync_cursor)|medicalRpg|medical_rpg|current_block|last_worked|dashboard_block|alpha5_)/.test(key)&&!/auth|password|session|token|sync_queue/i.test(key);
  const learningKeys=()=>Array.from({length:localStorage.length},(_,i)=>localStorage.key(i)).filter(k=>k&&safe(k));
  let suppress=false, sending=false, dirty=true, lastPullAt=0;
  const PERIODIC_PULL_MS=10*60_000;
  const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k)||'')??f}catch{return f}};
  const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const uuid=()=>crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random()}`;
  function clearLocalLearningData(){suppress=true;try{for(const k of learningKeys())localStorage.removeItem(k);localStorage.removeItem(QUEUE);localStorage.removeItem(LEGACY_QUEUE);localStorage.removeItem(CURSOR);}finally{suppress=false;}}
  function switchUser(userId){const id=String(userId||''),prev=localStorage.getItem(ACTIVE_USER)||'';if(!id){clearLocalLearningData();localStorage.removeItem(ACTIVE_USER);return{changed:Boolean(prev)}}if(prev!==id){clearLocalLearningData();localStorage.setItem(ACTIVE_USER,id);dirty=true;lastPullAt=0;return{changed:true}}return{changed:false}}
  function enqueue(operation){if(suppress)return;write(QUEUE,read(QUEUE,[]).filter(x=>x.key!==operation.key).concat(operation).slice(-200));dirty=true;}
  let syncTimer=null;
  function scheduleSync(){clearTimeout(syncTimer);syncTimer=setTimeout(()=>sync(),1200);}
  function markSet(key,value){if(safe(key)){enqueue({id:uuid(),type:'set',key,value,updatedAt:new Date().toISOString()});scheduleSync();}}
  function markDelete(key){if(safe(key)){enqueue({id:uuid(),type:'delete',key,updatedAt:new Date().toISOString()});scheduleSync();}}
  const nativeSet=localStorage.setItem.bind(localStorage),nativeRemove=localStorage.removeItem.bind(localStorage);
  localStorage.setItem=(key,value)=>{nativeSet(key,String(value));if(!suppress&&safe(key))markSet(key,String(value));};
  localStorage.removeItem=key=>{const was=safe(key)&&localStorage.getItem(key)!==null;nativeRemove(key);if(was&&!suppress)markDelete(key);};
  async function request(path,options={}){const r=await fetch(path,{credentials:'same-origin',headers:{'Content-Type':'application/json',...(options.headers||{})},...options});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Sinkronisasi gagal.');return d;}
  function apply(state){suppress=true;try{for(const [key,item] of Object.entries(state||{})){if(!safe(key)||!item)continue;if(item.deleted)nativeRemove(key);else if(typeof item.value==='string')nativeSet(key,item.value);}}finally{suppress=false;}}
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
  async function sync({force=false}={}){if(sending||!navigator.onLine)return;const id=localStorage.getItem(ACTIVE_USER);if(!id)return;const needs=force||dirty||read(QUEUE,[]).length||(Date.now()-lastPullAt>=PERIODIC_PULL_MS);if(!needs)return;sending=true;try{await pull(force);const ops=read(QUEUE,[]);if(ops.length){const saved=await request('/api/sync',{method:'POST',body:JSON.stringify({operations:ops})});write(QUEUE,[]);apply(saved.changes||{});if(saved.updatedAt)localStorage.setItem(CURSOR,saved.updatedAt);}dirty=false;lastPullAt=Date.now();}catch{}finally{sending=false;}}
  window.addEventListener('online',()=>sync({force:true}));window.addEventListener('pagehide',()=>sync());window.addEventListener('clined:auth-ready',()=>sync({force:true}));setInterval(()=>sync(),PERIODIC_PULL_MS);
  window.CLINED_ONLINE_SYNC={sync,switchUser,clearLocalLearningData,markDirty:()=>{dirty=true;sync()}};
  window.addEventListener('load',()=>sync({force:true}),{once:true});
})();
