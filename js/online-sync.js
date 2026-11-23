/* Account-scoped online study data sync with conflict-free bidirectional merge & realtime cross-device updates. */
(() => {
  'use strict';
  const QUEUE='clined_online_sync_queue_v3', ACTIVE_USER='clined_active_user_id_v3', CURSOR='clined_sync_cursor_v2';
  const LEGACY_QUEUE='clined_online_sync_queue_v2', LEGACY_CURSOR='clined_sync_cursor_v1';
  const safe=key=>/^(gaster_|clined_(?!account_profile|google_form_url|schema_version|migrated_at|menu|active_user_id|sync_cursor|xp_queue|glossary_v1)|medicalRpg|medical_rpg|current_block|last_worked|dashboard_block|alpha5_)/.test(key)&&!/auth|password|session|token|sync_queue|last_activity|xp_queue/i.test(key);
  const learningKeys=()=>Array.from({length:localStorage.length},(_,i)=>localStorage.key(i)).filter(k=>k&&safe(k));
  const uuid=()=>crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
  const CLIENT_ID=uuid();
  let suppress=false, sending=false, dirty=true, pendingResync=false, lastPullAt=0;
  const PERIODIC_PULL_MS=60_000;
  const nativeSet=localStorage.setItem.bind(localStorage),nativeRemove=localStorage.removeItem.bind(localStorage);
  try{nativeRemove(LEGACY_CURSOR);}catch{}
  const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k)||'')??f}catch{return f}};
  let memQueue=null, queueFlushTimer=0, dirtyTimer=0, dirtySince=0, remotePullTimer=0;
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
  function dropQueuedKey(key){
    const q=getQueue();
    if(!q.some(op=>op?.key===key))return;
    setQueue(q.filter(op=>op?.key!==key),false);
  }
  function scheduleDirtySync(){
    dirty=true;
    if(!localStorage.getItem(ACTIVE_USER))return;
    if(sending){pendingResync=true;return;}
    if(!dirtySince)dirtySince=Date.now();
    if(Date.now()-dirtySince>=2500){
      clearTimeout(dirtyTimer);dirtyTimer=0;dirtySince=0;
      sync({force:true});
    }else if(!dirtyTimer){
      dirtyTimer=setTimeout(()=>{dirtyTimer=0;dirtySince=0;sync({force:true});},800);
    }
  }
  function clearLocalLearningData(){suppress=true;try{for(const k of learningKeys())localStorage.removeItem(k);memQueue=[];clearTimeout(queueFlushTimer);nativeRemove(QUEUE);nativeRemove(LEGACY_QUEUE);nativeRemove(CURSOR);nativeRemove(LEGACY_CURSOR);}finally{suppress=false;}}
  function switchUser(userId){const id=String(userId||''),prev=localStorage.getItem(ACTIVE_USER)||'';if(!id){clearLocalLearningData();localStorage.removeItem(ACTIVE_USER);return{changed:Boolean(prev)}}if(prev!==id){clearLocalLearningData();localStorage.setItem(ACTIVE_USER,id);dirty=true;lastPullAt=0;return{changed:true}}return{changed:false}}
  function enqueue(operation,autoSchedule=true){
    if(suppress)return;
    const q=getQueue();
    const next=[];
    for(let i=0;i<q.length;i++){if(q[i]?.key!==operation.key)next.push(q[i]);}
    next.push(operation);
    setQueue(next,false);
    dirty=true;
    if(autoSchedule)scheduleDirtySync();
  }
  function markSet(key,value,autoSchedule=true){if(safe(key))enqueue({id:uuid(),type:'set',key,value,updatedAt:new Date().toISOString()},autoSchedule);}
  function markDelete(key,autoSchedule=true){if(safe(key))enqueue({id:uuid(),type:'delete',key,updatedAt:new Date().toISOString()},autoSchedule);}
  localStorage.setItem=(key,value)=>{const str=String(value),prev=localStorage.getItem(key);nativeSet(key,str);if(!suppress&&safe(key)&&prev!==str)markSet(key,str,true);};
  localStorage.removeItem=key=>{const was=safe(key)&&localStorage.getItem(key)!==null;nativeRemove(key);if(was&&!suppress)markDelete(key,true);};
  async function request(path,options={}){const r=await fetch(path,{credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json',...(options.headers||{})},...options});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Sinkronisasi gagal.');return d;}
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
        const hasCounts=(loc.counts&&typeof loc.counts==='object'&&!Array.isArray(loc.counts))||(srv.counts&&typeof srv.counts==='object'&&!Array.isArray(srv.counts));
        const hasLegacy=Array.isArray(loc.days)||Array.isArray(srv.days)||'lastDate' in loc||'lastDate' in srv||'best' in loc||'best' in srv;
        const merged={...srv,...loc};
        let dirty=false;
        if(hasCounts){
          const lc=(loc.counts&&typeof loc.counts==='object'&&!Array.isArray(loc.counts))?loc.counts:{};
          const sc=(srv.counts&&typeof srv.counts==='object'&&!Array.isArray(srv.counts))?srv.counts:{};
          const counts={};
          const allDays=[...new Set([...Object.keys(sc),...Object.keys(lc)])].sort();
          for(const d of allDays){
            const lv=Math.max(0,Number(lc[d])||0), sv=Math.max(0,Number(sc[d])||0), mx=Math.max(lv,sv);
            counts[d]=mx;
            if(mx>sv||!(d in sc))dirty=true;
          }
          merged.counts=counts;
        }
        if(hasLegacy){
          const days=[...new Set([...(Array.isArray(srv.days)?srv.days:[]),...(Array.isArray(loc.days)?loc.days:[])])].sort();
          const lLast=String(loc.lastDate||''),sLast=String(srv.lastDate||'');
          const lastDate=lLast>=sLast?lLast:sLast;
          const streak=Math.max(Number(loc.streak)||0,Number(srv.streak)||0);
          const best=Math.max(Number(loc.best)||0,Number(srv.best)||0,streak);
          merged.days=days;merged.lastDate=lastDate;merged.streak=streak;merged.best=best;
          if(!dirty&&JSON.stringify(merged)!==JSON.stringify(srv))dirty=true;
        }else{
          const streak=Math.max(Number(loc.streak)||0,Number(srv.streak)||0);
          merged.streak=streak;
          if(streak>(Number(srv.streak)||0))dirty=true;
        }
        return{value:JSON.stringify(merged),dirty};
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
      if(key==='clined_materi_flags_v1'&&loc&&srv&&typeof loc==='object'&&typeof srv==='object'&&!Array.isArray(loc)&&!Array.isArray(srv)){
        const merged={...srv};let changed=false;
        for(const [k,lv] of Object.entries(loc)){
          if(!lv||typeof lv!=='object')continue;
          const sv=srv[k];
          if(!sv||typeof sv!=='object'){merged[k]=lv;changed=true;}
          else{
            const lt=Number(lv.at)||0,st=Number(sv.at)||0;
            if(lt>st||(lt===st&&!lv.deleted&&sv.deleted)){merged[k]=lv;changed=true;}
          }
        }
        return{value:JSON.stringify(merged),dirty:changed};
      }
      if((key==='clined_materi_best_v1'||key==='clined_bank_best_v1')&&loc&&srv&&typeof loc==='object'&&typeof srv==='object'&&!Array.isArray(loc)&&!Array.isArray(srv)){
        const merged={...srv};let changed=false;
        for(const [k,lv] of Object.entries(loc)){
          if(!lv||typeof lv!=='object')continue;
          const sv=srv[k];
          if(!sv||typeof sv!=='object'){merged[k]=lv;changed=true;}
          else{
            const lp=Number(lv.pct)||0,sp=Number(sv.pct)||0,ls=Number(lv.score)||0,ss=Number(sv.score)||0,lt=Number(lv.at)||0,st=Number(sv.at)||0;
            if(lp>sp||(lp===sp&&ls>ss)||(lp===sp&&ls===ss&&lt>st)){
              merged[k]={...sv,...lv,pct:Math.max(lp,sp),score:Math.max(ls,ss),at:Math.max(lt,st)};
              changed=true;
            }
          }
        }
        return{value:JSON.stringify(merged),dirty:changed};
      }
      if(key==='clined_materi_last_v1'&&loc&&srv&&typeof loc==='object'&&typeof srv==='object'&&!Array.isArray(loc)&&!Array.isArray(srv)){
        const merged={...srv};let changed=false;
        for(const [k,lv] of Object.entries(loc)){
          if(!lv||typeof lv!=='object')continue;
          const sv=srv[k];
          if(!sv||typeof sv!=='object'){merged[k]=lv;changed=true;}
          else if((Number(lv.at)||0)>(Number(sv.at)||0)){merged[k]=lv;changed=true;}
        }
        return{value:JSON.stringify(merged),dirty:changed};
      }
      if(key==='clined_materi_resume_v2'&&loc&&srv&&typeof loc==='object'&&typeof srv==='object'&&!Array.isArray(loc)&&!Array.isArray(srv)){
        const merged={...srv};let changed=false;
        for(const [k,lv] of Object.entries(loc)){
          if(!lv||typeof lv!=='object')continue;
          const sv=srv[k];
          if(!sv||typeof sv!=='object'){merged[k]=lv;changed=true;}
          else{
            const lt=Number(lv.updated)||0,st=Number(sv.updated)||0;
            if(lt>st||(lt===st&&lv.deleted&&!sv.deleted)){merged[k]=lv;changed=true;}
          }
        }
        return{value:JSON.stringify(merged),dirty:changed};
      }
      if(key==='clined_qtime_v1'&&loc&&srv&&typeof loc==='object'&&typeof srv==='object'&&!Array.isArray(loc)&&!Array.isArray(srv)){
        const merged={...srv};let changed=false;
        for(const [k,lv] of Object.entries(loc)){
          if(!lv||typeof lv!=='object')continue;
          const sv=srv[k];
          if(!sv||typeof sv!=='object'){merged[k]=lv;changed=true;}
          else{
            const next={n:Math.max(Number(lv.n)||0,Number(sv.n)||0),sum:Math.max(Number(lv.sum)||0,Number(sv.sum)||0),fastWrong:Math.max(Number(lv.fastWrong)||0,Number(sv.fastWrong)||0),slow:Math.max(Number(lv.slow)||0,Number(sv.slow)||0)};
            if(next.n!==(Number(sv.n)||0)||next.sum!==(Number(sv.sum)||0)||next.fastWrong!==(Number(sv.fastWrong)||0)||next.slow!==(Number(sv.slow)||0)){merged[k]=next;changed=true;}
          }
        }
        return{value:JSON.stringify(merged),dirty:changed};
      }
      if((key==='clined_notes_v1'||key==='clined_resep_best_v1'||key==='clined_resep_lp_best_v1'||key==='clined_clinical_quest_v1'||key==='clined_duel_claims_v1'||key==='clined_ann_seen_v1')&&loc&&srv&&typeof loc==='object'&&typeof srv==='object'&&!Array.isArray(loc)&&!Array.isArray(srv)){
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
  function sameVal(a,b){
    if(a===b)return true;
    if(typeof a!=='string'||typeof b!=='string')return false;
    const tA=a.trim(), tB=b.trim();
    if(!tA||!tB||(tA[0]!=='{'&&tA[0]!=='[')||tA[0]!==tB[0])return false;
    try{
      const deepEq=(x,y)=>{
        if(x===y)return true;
        if(!x||!y||typeof x!=='object'||typeof y!=='object')return false;
        if(Array.isArray(x)!==Array.isArray(y))return false;
        if(Array.isArray(x))return x.length===y.length&&x.every((v,i)=>deepEq(v,y[i]));
        const kx=Object.keys(x), ky=Object.keys(y);
        return kx.length===ky.length&&kx.every(k=>Object.prototype.hasOwnProperty.call(y,k)&&deepEq(x[k],y[k]));
      };
      return deepEq(JSON.parse(tA),JSON.parse(tB));
    }catch{return false;}
  }
  function apply(state, opts={}){
    let restoreXP=null;
    const rePush=[];
    const cleanQueued=[];
    const changedKeys=[];
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
          if(serverXP!==null){
            const sVal=String(serverXP);
            if(localRaw!==sVal){nativeSet(xpKey,sVal);changed=true;changedKeys.push(xpKey);}
            cleanQueued.push(xpKey);
          }
          continue;
        }
        if(item.deleted){
          if(localStorage.getItem(key)!==null){nativeRemove(key);changed=true;changedKeys.push(key);}
          cleanQueued.push(key);
          continue;
        }
        if(typeof item.value==='string'){
          const prevVal=localStorage.getItem(key);
          const merged=mergeJsonKey(key,prevVal,item.value);
          if(merged){
            if(prevVal!==merged.value){
              nativeSet(key,merged.value);
              if(!sameVal(prevVal,merged.value)){changed=true;changedKeys.push(key);}
            }
            if(merged.dirty)rePush.push([key,merged.value]);
            else cleanQueued.push(key);
          }else{
            if(prevVal!==item.value){
              nativeSet(key,item.value);
              if(!sameVal(prevVal,item.value)){changed=true;changedKeys.push(key);}
            }
            cleanQueued.push(key);
          }
        }
      }
    }finally{suppress=false;}
    for(const k of cleanQueued)dropQueuedKey(k);
    if(restoreXP!==null)markSet(xpKey,restoreXP,false);
    for(const [k,v] of rePush)markSet(k,v,false);
    if(changed&&Object.keys(state||{}).length){
      window.dispatchEvent(new CustomEvent('clined:sync-applied',{detail:{keys:changedKeys,full:Boolean(opts&&opts.forceNotify)}}));
    }
  }
  function snapshot(serverState){
    for(const key of learningKeys()){
      if(!serverState[key]){
        enqueue({id:uuid(),type:'set',key,value:localStorage.getItem(key),updatedAt:new Date().toISOString()},false);
      }
    }
  }
  async function pull(){
    let cursor=localStorage.getItem(CURSOR);
    let loops=0;
    while(loops++<10){
      const path=cursor?`/api/sync?since=${encodeURIComponent(cursor)}`:'/api/sync';
      const d=await request(path);
      if(d.mode==='full'){apply(d.state||{},{forceNotify:true});snapshot(d.state||{});}
      else apply(d.changes||{});
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
      const payload=JSON.stringify({clientId:CLIENT_ID,operations:ops.slice(-50)});
      if(payload.length<=60000){
        fetch('/api/sync',{method:'POST',credentials:'same-origin',keepalive:true,headers:{'Content-Type':'application/json'},body:payload}).catch(()=>{});
      }
    }catch{}
  }
  async function sync({force=false}={}){
    if(!navigator.onLine)return;
    const id=localStorage.getItem(ACTIVE_USER);
    if(!id)return;
    if(sending){
      if(force)pendingResync=true;
      return;
    }
    const needs=force||dirty||getQueue().length||(Date.now()-lastPullAt>=PERIODIC_PULL_MS);
    if(!needs)return;
    sending=true;
    pendingResync=false;
    try{
      await pull();
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
        const bodyStr=JSON.stringify({clientId:CLIENT_ID,operations:group});
        if(new Blob([bodyStr]).size>520000)continue;
        const saved=await request('/api/sync',{
          method:'POST',
          body:bodyStr
        });
        const accepted=saved.changes||{};
        const confirmed=group.filter(op=>Object.prototype.hasOwnProperty.call(accepted,op.key));
        if(confirmed.length){
          const ids=new Set(confirmed.map(op=>op.id));
          setQueue(getQueue().filter(op=>!ids.has(op.id)),true);
        }
        apply(accepted);
        if(saved.unlocked100k?.unlocked)window.CLINED_XP_100K?.onUnlock?.(saved.unlocked100k);
      }
      dirty=getQueue().length>0;
      lastPullAt=Date.now();
    }catch{
      dirty=true;
    }finally{
      sending=false;
      if(pendingResync||getQueue().length>0){
        const again=pendingResync;
        pendingResync=false;
        if(again)setTimeout(()=>sync({force:true}),250);
      }
    }
  }
  function onRemoteUpdate(info){
    if(info&&info.clientId&&info.clientId===CLIENT_ID)return;
    clearTimeout(remotePullTimer);
    remotePullTimer=setTimeout(()=>{
      remotePullTimer=0;
      sync({force:true});
    },320);
  }
  window.addEventListener('online',()=>sync({force:true}));
  window.addEventListener('pagehide',()=>{flushBeacon();});
  window.addEventListener('pageshow',()=>{sync({force:true});});
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='hidden')flushBeacon();
    else if(Date.now()-lastPullAt>=1500||dirty||getQueue().length)sync({force:true});
  });
  window.addEventListener('clined:auth-ready',()=>sync({force:true}));
  setInterval(()=>{if(document.visibilityState==='visible')sync();},PERIODIC_PULL_MS);
  window.CLINED_ONLINE_SYNC={
    clientId:CLIENT_ID,
    sync,switchUser,clearLocalLearningData,onRemoteUpdate,
    markDirty:scheduleDirtySync
  };
  window.addEventListener('load',()=>sync({force:true}),{once:true});
})();
