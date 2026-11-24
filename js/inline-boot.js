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

// --- Home Banner Slider: smooth horizontal slide (auto + touch swipe + mouse drag + arrows + dots) ---
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

    function applyTransform(dxPx) {
      if (dxPx) {
        track.style.transform = 'translate3d(calc(' + (-idx * 100) + '% + ' + dxPx + 'px), 0, 0)';
      } else {
        track.style.transform = 'translate3d(' + (-idx * 100) + '%, 0, 0)';
      }
    }

    function goTo(n, instant) {
      updateDots(n);
      if (instant) {
        track.classList.add('dragging');
        applyTransform(0);
        void track.offsetWidth;
        track.classList.remove('dragging');
      } else {
        track.classList.remove('dragging');
        applyTransform(0);
      }
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
    function resetAuto() { startAuto(); }

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

    // Pause on hover (desktop)
    root.addEventListener('mouseenter', function () { paused = true; });
    root.addEventListener('mouseleave', function () { paused = false; });

    var suppressClick = false;
    function armClickSuppress() {
      suppressClick = true;
      setTimeout(function () { suppressClick = false; }, 60);
    }
    track.addEventListener('click', function (e) {
      if (suppressClick) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);

    // Live horizontal touch swipe (mobile)
    var tActive = false, tStartX = 0, tStartY = 0, tDx = 0, tLocked = null;
    track.addEventListener('touchstart', function (e) {
      if (!e.touches || e.touches.length !== 1) return;
      tActive = true;
      paused = true;
      tStartX = e.touches[0].clientX;
      tStartY = e.touches[0].clientY;
      tDx = 0;
      tLocked = null;
    }, { passive: true });
    track.addEventListener('touchmove', function (e) {
      if (!tActive || !e.touches || e.touches.length !== 1) return;
      var dx = e.touches[0].clientX - tStartX;
      var dy = e.touches[0].clientY - tStartY;
      if (tLocked === null) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        tLocked = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
        if (tLocked === 'x') track.classList.add('dragging');
      }
      if (tLocked !== 'x') return;
      tDx = dx;
      applyTransform(dx);
    }, { passive: true });
    function endTouch() {
      if (!tActive) return;
      tActive = false;
      paused = false;
      var w = root.clientWidth || 300;
      if (tLocked === 'x') armClickSuppress();
      if (tLocked === 'x' && Math.abs(tDx) > Math.min(48, w * 0.14)) {
        goTo(idx + (tDx < 0 ? 1 : -1), false);
      } else {
        goTo(idx, false);
      }
      tDx = 0;
      tLocked = null;
      resetAuto();
    }
    track.addEventListener('touchend', endTouch, { passive: true });
    track.addEventListener('touchcancel', endTouch, { passive: true });

    // Live mouse drag (desktop)
    var mDragging = false, mStartX = 0, mDx = 0;
    track.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return;
      mDragging = true;
      paused = true;
      mStartX = e.clientX;
      mDx = 0;
      track.classList.add('dragging');
    });
    window.addEventListener('mousemove', function (e) {
      if (!mDragging) return;
      mDx = e.clientX - mStartX;
      applyTransform(mDx);
    });
    window.addEventListener('mouseup', function () {
      if (!mDragging) return;
      mDragging = false;
      paused = false;
      if (Math.abs(mDx) > 8) armClickSuppress();
      var w = root.clientWidth || 300;
      if (Math.abs(mDx) > Math.min(50, w * 0.12)) {
        goTo(idx + (mDx < 0 ? 1 : -1), false);
      } else {
        goTo(idx, false);
      }
      mDx = 0;
      resetAuto();
    });

    var overlayFrame = root.querySelector('.hbs-overlay-frame');
    var overlayIframe = root.querySelector('.hbs-overlay-iframe');
    function fitOverlay() {
      if (!overlayFrame || !overlayIframe) return;
      var fw = overlayFrame.clientWidth;
      var fh = overlayFrame.clientHeight;
      if (fw < 40 || fh < 40) return;
      var isMobile = fw < 660;
      var vw = isMobile ? 680 : Math.max(820, fw);
      var vh = isMobile ? 138 : 108;
      var padBottom = isMobile ? 14 : 12;
      var availW = Math.max(40, fw - 4);
      var availH = Math.max(40, fh - padBottom);
      var scale = Math.min(availW / vw, availH / vh, 1);
      var scaledW = vw * scale;
      var scaledH = vh * scale;
      overlayIframe.style.width = vw + 'px';
      overlayIframe.style.height = vh + 'px';
      overlayIframe.style.left = Math.round((fw - scaledW) / 2) + 'px';
      overlayIframe.style.top = Math.round((availH - scaledH) / 2) + 'px';
      overlayIframe.style.transform = 'scale(' + scale.toFixed(4) + ')';
    }
    if (overlayFrame && typeof ResizeObserver !== 'undefined') {
      try { new ResizeObserver(fitOverlay).observe(overlayFrame); } catch (_) {}
    }
    window.addEventListener('resize', fitOverlay, { passive: true });
    fitOverlay();

    goTo(0, true);
    startAuto();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootSlider, { once: true });
  else bootSlider();
})();
