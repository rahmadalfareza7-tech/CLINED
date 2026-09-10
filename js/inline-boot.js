// Extracted from inline <script> tags in index.html so the Content-Security-Policy
// script-src can drop 'unsafe-inline'. Behavior is unchanged from the original inline code.

// --- Loading screen stability fix — preserves the existing animation/style. ---
(function () {
  var finished = false;
  function reveal() {
    if (finished) return;
    finished = true;
    var el = document.getElementById("appLoading"), content = document.getElementById("splashContent");
    if (!el) return;
    if (content) content.classList.add("is-exiting");
    setTimeout(function () {
      el.classList.add("is-hidden");
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 620);
    }, 560);
  }
  // Reveal as soon as the page has actually finished loading (plus a short
  // buffer for the exit animation) instead of forcing a fixed minimum wait.
  if (document.readyState === "complete") setTimeout(reveal, 150);
  else window.addEventListener("load", function () { setTimeout(reveal, 150); }, { once: true });
  // Safety net in case the load event never fires for some reason.
  setTimeout(reveal, 3000);
})();

// --- Home quick-start shortcuts + streak label sync ---
(function () {
  var go = function () { var b = document.getElementById('openUabPage'); if (b) b.click(); };
  document.addEventListener('click', function (e) {
    if (e.target.closest('#duoQuickStart,#duoUnitStart,#duoNode1,#duoNode2')) go();
  });
  var sync = function () {
    var el = document.getElementById('duoStreakValue');
    var src = document.getElementById('dailyStreakCount');
    if (el && src) el.textContent = (src.textContent || '0').split('/')[0] || '0';
  };
  setTimeout(sync, 700);
  window.addEventListener('pageshow', sync, { passive: true });
})();

// --- UAB node index tagging ---
(function () {
  document.querySelectorAll('#uabBlockList > button.uab-node').forEach(function (el, i) {
    el.dataset.uabIndex = i + 1;
  });
})();

// --- V23 UAB hard lock: continuously remove legacy inline position/transform mutations. ---
(function () {
  var clean = function (n) {
    if (!n || !n.matches || !n.matches('#uabBlockList > .uab-node')) return;
    ['left', 'right', 'top', 'bottom', 'transform', 'translate', 'rotate', 'scale', 'margin-left', 'margin-right'].forEach(function (k) { n.style.removeProperty(k); });
  };
  var run = function () { document.querySelectorAll('#uabBlockList > .uab-node').forEach(clean); };
  document.addEventListener('DOMContentLoaded', run, { once: true });
  window.addEventListener('resize', run, { passive: true });
  var obs = new MutationObserver(function (muts) {
    muts.forEach(function (m) { if (m.type === 'attributes' && m.attributeName === 'style') clean(m.target); });
  });
  var start = function () {
    var list = document.getElementById('uabBlockList');
    if (list) { obs.observe(list, { subtree: true, attributes: true, attributeFilter: ['style'] }); run(); }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
