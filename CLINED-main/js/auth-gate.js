/* Auth-wall visual guard. Server API protection remains the source of truth. */
(() => {
  const unlock = () => document.body.classList.remove('auth-pending');
  const lock = () => document.body.classList.add('auth-pending');
  window.CLINED_AUTH_GATE = { unlock, lock };
})();
