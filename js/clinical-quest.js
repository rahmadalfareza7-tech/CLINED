/* CLINED Clinical Quest — MVP, local-first. */
(function(){
  'use strict';
  const KEY='clined_clinical_quest_v1';
  const state=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch{return{}}};
  const save=v=>{try{localStorage.setItem(KEY,JSON.stringify(v));return true}catch{return false}};
  const escQ=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let QUESTS=[];
  async function loadQuests(){
    if(QUESTS.length>0)return;
    try{
      const r=await fetch('js/quests-data.json');
      QUESTS=await r.json();
    }catch(e){
      console.warn('Failed to load quests-data.json',e);
      QUESTS=[];
    }
  }  let active=null,step=0,answers=[],filter='ALL';
  const host=()=>document.getElementById('clinicalQuestHost');
  function progress(){const st=state();return st.completed||{};}
  async function render(){
    const root=host();if(!root)return;
    try{
      if(QUESTS.length===0){
        root.innerHTML=`<div class="clinical-quest-loading">${[1,2,3,4,5].map(()=>`
          <div class="quest-skeleton-card">
            <div class="quest-skeleton-icon skeleton"></div>
            <div class="quest-skeleton-text">
              <div class="quest-skeleton-title skeleton"></div>
              <div class="quest-skeleton-sub skeleton"></div>
            </div>
            <div class="quest-skeleton-btn skeleton"></div>
          </div>`).join('')}</div>`;
        await loadQuests();
      }
      if(QUESTS.length===0){
        root.innerHTML=`<div class="clined-error-state">
          <span class="error-icon">📡</span>
          <b>Gagal memuat Clinical Quest</b>
          <small>Periksa koneksi internetmu, lalu coba lagi.</small>
          <button onclick="window.renderClinicalQuest()">Coba lagi</button>
        </div>`;
        return;
      }
      if(active){renderStep(root);return;}
      renderHome(root);
    }catch(e){
      console.error('Clinical Quest render error',e);
      root.innerHTML=`<div class="clined-error-state">
        <span class="error-icon">⚠️</span>
        <b>Terjadi kesalahan</b>
        <small>${e?.message||'Coba muat ulang halaman.'}</small>
        <button onclick="window.renderClinicalQuest()">Coba lagi</button>
      </div>`;
    }
  }
  function renderHome(root){
    const done=progress();
    const blocks=['ALL',...new Set(QUESTS.map(q=>q.block))];
    const list=QUESTS.filter(q=>filter==='ALL'||q.block===filter).map(q=>{
      const d=done[q.id];
      const pct=d?Math.round((d.correct/q.steps.length)*100):0;
      const isComplete=!!d;
      return `<article class="clinical-quest-card${isComplete?' quest-completed':''}">
        <span class="quest-icon">${escQ(q.icon)}</span>
        <div class="quest-main">
          <b>${escQ(q.title)}</b>
          <small>${escQ(q.duration)} &bull; ${escQ(String(q.steps.length))} tahap</small>
        </div>
        <div class="quest-actions">
          ${d?`<span class="quest-percent">${pct}%</span>`:''}
          <button class="clinical-quest-start" type="button" data-quest-start="${escQ(q.id)}">${d?'Ulangi':'Mulai'}</button>
        </div>
      </article>`;
    }).join('');
    root.innerHTML=`<div class="clinical-quest-shell">
      <section class="clinical-quest-hero">
        <span class="quest-kicker">Clinical Reasoning Mode</span>
        <h3>Think like a clinician.</h3>
        <p>Baca kasus, tentukan masalah, analisis mekanisme — bukan sekadar mencari jawaban.</p>
      </section>
      <div class="clinical-quest-filter">${blocks.map(b=>`<button type="button" class="${b===filter?'active':''}" data-quest-filter="${escQ(b)}">${escQ(b==='ALL'?'Semua Block':b)}</button>`).join('')}</div>
      <div class="clinical-quest-list">${list||'<div class="card"><p class="muted">Belum ada quest untuk blok ini.</p></div>'}</div>
    </div>`;
    root.querySelectorAll('[data-quest-start]').forEach(b=>b.addEventListener('click',()=>start(b.dataset.questStart)));
    root.querySelectorAll('[data-quest-filter]').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.questFilter;render();}));
  }

  function shuffleArray(arr){
    const a=arr.slice();
    for(let i=a.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [a[i],a[j]]=[a[j],a[i]];
    }
    return a;
  }
  function shuffleQuest(q){
    // Shuffle each question's options as answer+option pairs. The correct answer
    // index is recalculated after shuffling, so grading/explanations stay intact.
    // Target positions are balanced per quest to avoid accidentally leaving every
    // correct answer in the same letter.
    const qi=Math.max(0,QUESTS.indexOf(q));
    const positions=shuffleArray([0,1,2,3,qi%4]);
    return {...q,steps:q.steps.map((s,i)=>{
      const correct=String(s.options[s.answer]);
      const distractors=s.options.filter((_,idx)=>idx!==s.answer);
      const mixed=shuffleArray(distractors);
      const target=positions[i];
      const options=[];
      let di=0;
      for(let pos=0;pos<s.options.length;pos++){
        if(pos===target) options.push(correct);
        else options.push(mixed[di++]);
      }
      return {...s,options,answer:target};
    })};
  }
  async function start(id){
    if(QUESTS.length===0)await loadQuests();
    const quest=QUESTS.find(q=>q.id===id);
    active=quest?shuffleQuest(quest):null;
    if(!active)return;
    step=0;answers=[];render();window.scrollTo({top:0,behavior:'auto'});
  }
  function renderStep(root){
    const q=active, s=q.steps[step], selected=answers[step];
    const pct=Math.round((step/q.steps.length)*100);
    const opts=s.options.map((o,i)=>{
      let cls='';
      if(selected!=null){if(i===s.answer)cls=' correct';else if(i===selected)cls=' wrong';}
      return `<button type="button" class="quest-option${cls}" data-quest-answer="${i}" ${selected!=null?'disabled':''}><b>${String.fromCharCode(65+i)}</b>${escQ(o)}</button>`;
    }).join('');
    const splitQ=(()=>{
      const m=s.q.match(/^(.*?)(?:\s+)(Apakah|Apa|Manakah|Bagaimanakah|Bagaimana|Mengapa|Kapan|Dimanakah|Di manakah|Siapakah|Berapa)\b([\s\S]*)$/i);
      const scenario=m?m[1].trim():s.q.trim();
      const question=m?(m[2]+" "+m[3]).trim():s.q.trim();
      return {scenario,question};
    })();
    const isCorrect=selected===s.answer;
    root.innerHTML=`<div class="clinical-quest-shell">
      <section class="card clinical-quest-step-card">
        <div class="cq-step-header">
          <div class="quest-case-label">
            ${escQ(q.block)} &bull; ${escQ(s.stage)}
            <span>${step+1} / ${q.steps.length}</span>
          </div>
          <div class="clinical-quest-progress"><i style="width:${pct}%"></i></div>
        </div>
        <div class="quest-scenario-box">
          <div class="quest-scenario-label">Skenario Kasus</div>
          <div class="quest-scenario-text">${escQ(splitQ.scenario)}</div>
        </div>
        <div class="quest-question-label">Pertanyaan</div>
        <h3 class="quest-step-title">${escQ(splitQ.question)}${splitQ.question.endsWith('?')?'':'?'}</h3>
        <div class="quest-options">${opts}</div>
        ${selected!=null?`<div class="quest-explanation">
          <b class="${isCorrect?'correct-label':'wrong-label'}">${isCorrect?'✔ Benar!':'❌ Belum tepat.'}</b>
          ${escQ(s.why)}
        </div>`:''}
        <div class="quest-step-nav">
          <button type="button" class="secondary" data-quest-exit>← Kembali</button>
          ${selected!=null?`<button type="button" class="primary" data-quest-next>${step===q.steps.length-1?'Lihat Hasil':'Lanjut →'}</button>`:''}
        </div>
      </section>
    </div>`;
    root.querySelectorAll('[data-quest-answer]').forEach(b=>b.addEventListener('click',()=>{answers[step]=Number(b.dataset.questAnswer);render();}));
    root.querySelector('[data-quest-exit]')?.addEventListener('click',()=>{active=null;render();});
    root.querySelector('[data-quest-next]')?.addEventListener('click',()=>{if(step<q.steps.length-1){step++;render();window.scrollTo({top:0,behavior:'auto'});}else finish();});
  }
  function finish(){
    const q=active;const correct=answers.reduce((n,a,i)=>n+(a===q.steps[i].answer?1:0),0);const st=state();st.completed=st.completed||{};st.completed[q.id]={correct,total:q.steps.length,at:new Date().toISOString()};save(st);
    try{if(typeof window.addXP==='function')window.addXP(10+correct*5,`Clinical Quest • ${q.title}`);}catch(e){}
    const pct=Math.round(correct/q.steps.length*100);const root=host();
    root.innerHTML=`<div class="clinical-quest-shell">
      <section class="card quest-result">
        <div class="quest-score-ring" style="--quest-score:${pct}%"><div><b>${pct}%</b></div></div>
        <h3>${escQ(q.title)}</h3>
        <p>${correct} dari ${q.steps.length} tahap berhasil. Clinical reasoning dibangun dari proses, bukan hanya jawaban akhir.</p>
        <div class="quest-result-grid">${q.steps.map((s,i)=>`<div><b>${answers[i]===s.answer?'✔':'×'}</b><small>${escQ(s.stage)}</small></div>`).join('')}</div>
        <div class="quest-result-actions">
          <button type="button" class="secondary" data-quest-home>← Quest</button>
          <button type="button" class="primary" data-quest-retry>Ulangi Quest</button>
        </div>
      </section>
    </div>`;
    root.querySelector('[data-quest-home]').onclick=()=>{active=null;render();};
    root.querySelector('[data-quest-retry]').onclick=()=>{step=0;answers=[];render();};
  }
  window.renderClinicalQuest=render; // async
  window.openClinicalQuest=async()=>{active=null;await render();if(typeof window.show==='function')window.show('clinicalQuestPage');};
  document.addEventListener('DOMContentLoaded',()=>{document.getElementById('clinicalQuestPage')&&render();});
})();
