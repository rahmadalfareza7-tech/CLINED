/* Account-scoped online study data sync.
   The server is the source of truth for identity and learning state.
   localStorage is only a warm cache for the currently authenticated user. */
(() => {
  'use strict';
  const QUEUE = 'clined_online_sync_queue_v2';
  const ACTIVE_USER = 'clined_active_user_id_v2';
  const LEGACY_QUEUE = 'clined_online_sync_queue_v1';

  // Only learning/progress keys are account-owned. UI/configuration remains device-global.
  const safe = key => /^(gaster_|clined_(?!account_profile|google_form_url|schema_version|migrated_at|menu)|medicalRpg|medical_rpg|current_block|last_worked|dashboard_block|alpha5_)/.test(key)
    && !/auth|password|session|token|sync_queue/i.test(key);
  const learningKeys = () => Array.from({length: localStorage.length}, (_, i) => localStorage.key(i))
    .filter(key => key && safe(key));

  function clearLocalLearningData() {
    for (const key of learningKeys()) localStorage.removeItem(key);
    localStorage.removeItem(QUEUE);
    localStorage.removeItem(LEGACY_QUEUE);
  }

  function switchUser(userId) {
    const id = String(userId || '');
    const previous = localStorage.getItem(ACTIVE_USER) || '';
    if (!id) {
      clearLocalLearningData();
      localStorage.removeItem(ACTIVE_USER);
      return {changed: Boolean(previous)};
    }
    if (previous !== id) {
      clearLocalLearningData();
      localStorage.setItem(ACTIVE_USER, id);
      return {changed:true};
    }
    return {changed:false};
  }

  const read = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key) || '') ?? fallback; }
    catch { return fallback; }
  };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const uuid = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  let sending = false;

  const enqueue = operation => write(
    QUEUE,
    read(QUEUE, []).filter(item => item.key !== operation.key).concat(operation).slice(-200)
  );

  async function request(path, options = {}) {
    const r = await fetch(path, {
      credentials: 'same-origin',
      headers: {'Content-Type':'application/json', ...(options.headers || {})},
      ...options
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw Error(d.error || 'Sinkronisasi gagal.');
    return d;
  }

  function snapshot(serverState = {}) {
    for (const key of learningKeys()) {
      if (!serverState[key]) enqueue({
        id: uuid(), type: 'set', key,
        value: localStorage.getItem(key),
        updatedAt: new Date().toISOString()
      });
    }
  }

  function apply(state) {
    for (const [key, item] of Object.entries(state || {})) {
      if (!safe(key) || !item) continue;
      if (item.deleted) localStorage.removeItem(key);
      else if (typeof item.value === 'string') localStorage.setItem(key, item.value);
    }
  }

  async function sync() {
    if (sending || !navigator.onLine) return;
    sending = true;
    try {
      // Always resolve identity first. This prevents a previous user's local cache
      // from being sent to, or displayed from, the next user's account.
      const me = await request('/api/auth/me');
      const user = me.user || null;
      const switched = switchUser(user?.id || '');
      if (!user) return;

      const remote = await request('/api/sync');
      if (switched.changed) {
        // On account change, server state is authoritative. Never upload stale
        // local data from the previous account.
        apply(remote.state);
      } else {
        apply(remote.state);
        snapshot(remote.state);
      }

      const operations = read(QUEUE, []);
      if (operations.length) {
        const saved = await request('/api/sync', {
          method:'POST', body:JSON.stringify({operations})
        });
        write(QUEUE, []);
        apply(saved.state);
      }
    } catch {
      // Keep the queue for the next successful authenticated sync.
    } finally {
      sending = false;
    }
  }

  window.addEventListener('online', sync);
  window.addEventListener('pagehide', sync);
  setInterval(sync, 30_000);
  window.CLINED_ONLINE_SYNC = {sync, switchUser, clearLocalLearningData};
  window.addEventListener('load', sync, {once:true});
})();
