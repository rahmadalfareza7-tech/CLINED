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

// --- Home Banner Slider: auto-slide + manual swipe/drag/arrows/dots ---
(function () {
  function bootSlider() {
    var root = document.getElementById('homeBannerSlider');
    var track = document.getElementById('hbsTrack');
    if (!root || !track || root.dataset.hbsBound === '1') return;
    root.dataset.hbsBound = '1';

    var slides = track.querySelectorAll('.hbs-slide');
    var dots = root.querySelectorAll('.hbs-dot');
    var count = slides.length;
    if (count < 2) return;

    var idx = 0;
    var timer = null;
    var paused = false;
    var INTERVAL = 4500;

    function updateDots(n) {
      idx = ((n % count) + count) % count;
      dots.forEach(function (d, i) {
        var on = i === idx;
        d.classList.toggle('active', on);
        d.setAttribute('aria-selected', on ? 'true' : 'false');
      });
    }

    function goTo(n, instant) {
      updateDots(n);
      var w = track.clientWidth || 1;
      track.scrollTo({ left: idx * w, behavior: instant ? 'auto' : 'smooth' });
    }

    function stopAuto() {
      if (timer) { clearInterval(timer); timer = null; }
    }
    function startAuto() {
      stopAuto();
      timer = setInterval(function () {
        if (paused || document.hidden) return;
        var home = document.getElementById('home');
        if (home && !home.classList.contains('active')) return;
        goTo(idx + 1, false);
      }, INTERVAL);
    }
    function resetAuto() {
      startAuto();
    }

    root.addEventListener('click', function (e) {
      var arr = e.target.closest('[data-hbs-dir]');
      if (arr) {
        goTo(idx + Number(arr.dataset.hbsDir || 1), false);
        resetAuto();
        return;
      }
      var dot = e.target.closest('[data-hbs-go]');
      if (dot) {
        goTo(Number(dot.dataset.hbsGo || 0), false);
        resetAuto();
      }
    });

    var scrollRaf = 0;
    track.addEventListener('scroll', function () {
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(function () {
        scrollRaf = 0;
        var w = track.clientWidth || 1;
        var cur = Math.round(track.scrollLeft / w);
        if (cur !== idx && cur >= 0 && cur < count) updateDots(cur);
      });
    }, { passive: true });

    // Pause on hover / touch
    root.addEventListener('mouseenter', function () { paused = true; });
    root.addEventListener('mouseleave', function () { paused = false; });
    track.addEventListener('touchstart', function () { paused = true; }, { passive: true });
    track.addEventListener('touchend', function () { paused = false; resetAuto(); }, { passive: true });

    // Mouse drag support for desktop
    var dragging = false, startX = 0, startScroll = 0;
    track.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return;
      dragging = true;
      paused = true;
      startX = e.clientX;
      startScroll = track.scrollLeft;
      track.classList.add('dragging');
    });
    window.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      track.scrollLeft = startScroll - (e.clientX - startX);
    });
    window.addEventListener('mouseup', function (e) {
      if (!dragging) return;
      dragging = false;
      paused = false;
      track.classList.remove('dragging');
      var dx = e.clientX - startX;
      var w = track.clientWidth || 1;
      if (Math.abs(dx) > Math.min(50, w * 0.15)) {
        goTo(idx + (dx < 0 ? 1 : -1), false);
      } else {
        goTo(idx, false);
      }
      resetAuto();
    });

    window.addEventListener('resize', function () {
      goTo(idx, true);
    }, { passive: true });

    startAuto();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootSlider, { once: true });
  else bootSlider();
})();
