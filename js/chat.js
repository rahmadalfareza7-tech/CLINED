/* CLINED user chat: authenticated, user-to-user, with shareable UAB/UPI questions. */
(function(){
  const $=id=>document.getElementById(id);
  const escChat=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let selected=null, poll=null, users=[], loading=false;
  async function api(path,options={}){
    const r=await fetch('/api/chat'+path,{credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json',...(options.headers||{})},...options});
    const data=await r.json().catch(()=>({})); if(!r.ok)throw Error(data.error||`Chat gagal dimuat (${r.status}).`); return data;
  }
  function current(){return typeof authCurrentUser==='function'?authCurrentUser():null;}
  function initials(name){return String(name||'?').trim().split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'?';}
  function fmt(ts){try{return new Date(ts).toLocaleString('id-ID',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'short'})}catch{return ''}}
  function renderUsers(){
    const box=$('chatUserList');if(!box)return;
    const q=String($('chatUserSearch')?.value||'').trim().toLowerCase();
    const filtered=users.filter(x=>`${x.name} ${x.username}`.toLowerCase().includes(q));
    box.innerHTML=filtered.length?filtered.map(x=>`<button class="chat-user ${selected?.id===x.id?'active':''}" data-chat-user="${x.id}"><span class="chat-avatar">${escChat(initials(x.name))}</span><span class="chat-user-copy"><b>${escChat(x.name)}</b><small>@${escChat(x.username)}</small></span></button>`).join(''):'<div class="chat-empty">Pengguna tidak ditemukan.</div>';
    box.querySelectorAll('[data-chat-user]').forEach(b=>b.onclick=()=>openUser(users.find(x=>x.id===b.dataset.chatUser)));
  }
  async function loadUsers(){
    const box=$('chatUserList');
    if(!current()){if(box)box.innerHTML='<div class="chat-empty">Masuk ke akun untuk melihat pengguna.</div>';return;}
    if(loading)return; loading=true;
    if(box)box.innerHTML='<div class="chat-empty">Memuat pengguna…</div>';
    try{
      let d; try { d=await api('/users'); } catch(first){ d=await api('/users?q='); }
      users=Array.isArray(d.users)?d.users:[];
      renderUsers();
      if(!users.length && box)box.innerHTML='<div class="chat-empty">Belum ada pengguna lain yang tersedia untuk diajak chat.</div>';
    }catch(e){
      if(box)box.innerHTML=`<div class="chat-empty">Tidak dapat memuat pengguna: ${escChat(e.message)}<br><button type="button" class="chat-inline-retry" id="chatRetryUsers">Coba lagi</button></div>`;
      $('chatRetryUsers')?.addEventListener('click',loadUsers,{once:true});
    }finally{loading=false;}
  }
  function renderQuestion(q){if(!q)return '';const opts=(q.opsi||[]);return `<div class="chat-question"><div class="chat-question-label">📚 ${escChat(q.block||'SOAL')} • ${escChat(q.bank||'')}</div><div class="chat-question-stem">${escChat(q.soal)}</div>${opts.length?`<ol class="chat-question-options">${opts.map(o=>`<li>${escChat(o)}</li>`).join('')}</ol>`:'<div class="chat-question-options">💭 Jawaban tidak disertakan — bahas bersama di chat.</div>'}</div>`}
  function renderMessages(messages){
    const box=$('chatMessages'),me=current(); if(!box)return;
    if(!messages.length){box.innerHTML='<div class="chat-empty">Belum ada pesan. Kirim pertanyaan pertama untuk mulai diskusi.</div>';return;}
    box.innerHTML=messages.map(m=>{const mine=m.sender_id===me?.id;return `<div class="chat-bubble ${mine?'mine':'theirs'}">${m.message_type==='question'?renderQuestion(m.question_data):''}<div>${escChat(m.body)}</div><div class="chat-meta">${mine?'Kamu':escChat(m.sender_name||'Pengguna')} • ${fmt(m.created_at)}</div></div>`}).join('');
    box.scrollTop=box.scrollHeight;
  }
  async function loadMessages(){if(!selected||!current())return;try{const d=await api('/messages/'+selected.id);renderMessages(d.messages||[]);}catch(e){$('chatMessages').innerHTML=`<div class="chat-empty">${escChat(e.message)}</div>`;}}
  async function openUser(user){if(!user)return;selected=user;renderUsers();$('chatHeader').innerHTML=`<div><b>${escChat(user.name)}</b><small>@${escChat(user.username)} • Diskusi UAB &amp; UPI</small></div>`;$('chatInput').disabled=false;$('chatInput').placeholder=`Tulis pesan untuk ${user.name}…`;$('chatComposer').querySelector('button').disabled=false;try{await loadMessages();}catch(e){if(typeof showToast==='function')showToast(e.message,true);}startPoll();maybePending();setTimeout(()=>$('chatInput')?.focus(),80);}
  function startPoll(){clearInterval(poll);poll=setInterval(()=>loadMessages(),5000);}
  async function sendText(){if(!selected)return;const input=$('chatInput'),body=input.value.trim();if(!body)return;const btn=$('chatComposer').querySelector('button');btn.disabled=true;try{await api('/messages',{method:'POST',body:JSON.stringify({recipientId:selected.id,messageType:'text',body})});input.value='';input.style.height='';await loadMessages();}catch(e){if(typeof showToast==='function')showToast(e.message,true);}finally{btn.disabled=false;input.focus();}}
  window.CLinedChat={shareQuestion(q){
    if(!current()){if(typeof authOpenModal==='function')authOpenModal('login');return;}
    window.__CLINED_CHAT_PENDING_QUESTION=q;show('chatPage');renderUsers();
    if(selected){setTimeout(()=>openUser(selected),30);}else if(typeof showToast==='function')showToast('Pilih pengguna untuk mengirim soal.');
  }};
  async function shareToSelected(q){if(!selected)return;if(!q?.soal)return;try{await api('/messages',{method:'POST',body:JSON.stringify({recipientId:selected.id,messageType:'question',body:'Bisa bantu bahas soal ini? Menurutmu jawabannya apa?',question:{block:q.block||'',bank:q.bank||selectedBank||'',soal:q.soal,opsi:q.opsi}})});await loadMessages();}catch(e){if(typeof showToast==='function')showToast(e.message,true);}}
  function maybePending(){const q=window.__CLINED_CHAT_PENDING_QUESTION;if(!q||!selected)return;window.__CLINED_CHAT_PENDING_QUESTION=null;shareToSelected(q);}
  function init(){
    $('chatBtn')?.addEventListener('click',async()=>{show('chatPage');await loadUsers();});
    $('backFromChat')?.addEventListener('click',()=>show('home'));
    $('chatRefreshUsers')?.addEventListener('click',loadUsers);
    $('chatUserSearch')?.addEventListener('input',renderUsers);
    $('chatComposer')?.addEventListener('submit',e=>{e.preventDefault();sendText();});
    $('chatInput')?.addEventListener('input',e=>{e.target.style.height='auto';e.target.style.height=Math.min(e.target.scrollHeight,120)+'px';});
    $('chatInput')?.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendText();}});
    document.addEventListener('click',e=>{const b=e.target.closest('[data-chat-share]');if(!b)return;const q=window.__CLINED_SHARE_QUESTIONS?.[b.dataset.chatShare];if(q)window.CLinedChat.shareQuestion(q);});
    const oldOpen=window.CLinedChat.shareQuestion;
    // When a question is shared from a quiz, show the chat and automatically present a recipient picker.
    window.CLinedChat.shareQuestion=async function(q){
      if(!current()){if(typeof authOpenModal==='function')authOpenModal('login');return;}
      window.__CLINED_CHAT_PENDING_QUESTION=q;show('chatPage');await loadUsers();
      if(selected){await openUser(selected);maybePending();}
      else if(typeof showToast==='function')showToast('Pilih pengguna untuk mengirim soal.');
    };
  }
  window.CLinedChatInit=init;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
  window.addEventListener('clined:chat-opened',()=>{loadUsers();});
  window.addEventListener('clined:auth-ready',()=>{if(document.getElementById('chatPage')?.classList.contains('active'))loadUsers();});
  window.CLinedChatMaybeShare=maybePending;
  window.CLINEDChatOpen=async function(){show('chatPage');document.getElementById('chatPage')?.scrollIntoView({block:'start',behavior:'auto'});await loadUsers();};
})();
