(function () {
  "use strict";

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ===================== Tabs ===================== */
  var tabButtons = document.querySelectorAll(".tab-btn");
  var panels = document.querySelectorAll(".tab-panel");
  var navTabs = document.getElementById("navTabs");
  var hamburger = document.getElementById("hamburger");

  function activateTab(id, updateHash) {
    var panel = document.getElementById(id);
    if (!panel) return;
    panels.forEach(function (p) { p.classList.toggle("active", p.id === id); });
    tabButtons.forEach(function (b) { b.classList.toggle("active", b.dataset.tab === id); });
    if (updateHash !== false) history.replaceState(null, "", "#" + id);
    navTabs.classList.remove("open");
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
    // run synchronously: the panel is laid out as soon as .active is applied,
    // and rAF is paused in background tabs, which would defer canvas sizing.
    observeReveals();
    if (id === "research") startCloud();
  }

  tabButtons.forEach(function (btn) {
    btn.addEventListener("click", function () { activateTab(btn.dataset.tab); });
  });

  document.querySelectorAll("[data-tab-link]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      activateTab(el.dataset.tabLink);
    });
  });

  hamburger.addEventListener("click", function () { navTabs.classList.toggle("open"); });

  /* ===================== Theme toggle ===================== */
  var themeToggle = document.getElementById("themeToggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      var next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) { /* private mode */ }
      refreshCloudColors();
    });
  }

  // Follow the OS if the visitor has never chosen explicitly.
  try {
    window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", function (e) {
      if (localStorage.getItem("theme")) return;
      document.documentElement.setAttribute("data-theme", e.matches ? "light" : "dark");
      refreshCloudColors();
    });
  } catch (e) { /* older browsers */ }

  /* ===================== Clock ===================== */
  var clock = document.getElementById("clock");
  function tick() {
    var opts = { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/New_York" };
    clock.textContent = new Date().toLocaleTimeString("en-US", opts) + " EST";
  }
  if (clock) { tick(); setInterval(tick, 30000); }

  /* ===================== Rotating banner ===================== */
  (function initBanner() {
    var banner = document.getElementById("banner");
    if (!banner) return;
    var track = document.getElementById("bannerTrack");
    var slides = track.querySelectorAll(".slide");
    var dotsWrap = document.getElementById("bannerDots");
    var prev = document.getElementById("bannerPrev");
    var next = document.getElementById("bannerNext");
    var count = slides.length;
    var index = 0;
    var timer = null;
    var DELAY = 5000;

    if (count < 2) {
      prev.style.display = next.style.display = dotsWrap.style.display = "none";
      return;
    }

    // build dots
    for (var i = 0; i < count; i++) {
      var dot = document.createElement("button");
      dot.className = "dot" + (i === 0 ? " active" : "");
      dot.setAttribute("aria-label", "Go to image " + (i + 1));
      dot.dataset.index = i;
      dotsWrap.appendChild(dot);
    }
    var dots = dotsWrap.querySelectorAll(".dot");
    var hudIdx = document.getElementById("bannerIdx");
    var hudCam = hudIdx && hudIdx.parentNode;
    if (hudCam) hudCam.lastChild.textContent = "/" + (count < 10 ? "0" : "") + count;

    function go(n) {
      index = (n + count) % count;
      track.style.transform = "translateX(-" + index * 100 + "%)";
      dots.forEach(function (d, di) { d.classList.toggle("active", di === index); });
      if (hudIdx) hudIdx.textContent = (index < 9 ? "0" : "") + (index + 1);
    }

    function start() {
      if (reducedMotion) return;
      stop();
      timer = setInterval(function () { go(index + 1); }, DELAY);
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function jump(n) { go(n); start(); }

    next.addEventListener("click", function () { jump(index + 1); });
    prev.addEventListener("click", function () { jump(index - 1); });
    dots.forEach(function (d) {
      d.addEventListener("click", function () { jump(parseInt(d.dataset.index, 10)); });
    });

    banner.addEventListener("mouseenter", stop);
    banner.addEventListener("mouseleave", start);
    banner.addEventListener("focusin", stop);
    banner.addEventListener("focusout", start);

    // keyboard
    banner.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { jump(index + 1); }
      else if (e.key === "ArrowLeft") { jump(index - 1); }
    });

    // touch swipe
    var startX = null;
    banner.addEventListener("touchstart", function (e) { startX = e.touches[0].clientX; stop(); }, { passive: true });
    banner.addEventListener("touchend", function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) jump(index + (dx < 0 ? 1 : -1));
      else start();
      startX = null;
    });

    // pause when tab hidden
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop(); else start();
    });

    start();
  })();

  /* ===================== Cursor spotlight ===================== */
  if (!reducedMotion && window.matchMedia("(hover: hover)").matches) {
    document.addEventListener("pointermove", function (e) {
      var el = e.target.closest && e.target.closest(".card, .project, .route, .pub, .award");
      if (!el) return;
      var r = el.getBoundingClientRect();
      el.style.setProperty("--mx", (e.clientX - r.left) + "px");
      el.style.setProperty("--my", (e.clientY - r.top) + "px");
    });
  }

  /* ===================== Counters ===================== */
  var counted = false;
  function runCounters() {
    if (counted || reducedMotion) return;
    counted = true;
    document.querySelectorAll(".stat-num[data-count]").forEach(function (el) {
      var target = parseInt(el.dataset.count, 10);
      var start = performance.now(), dur = 1000;
      (function frame(t) {
        var p = Math.min((t - start) / dur, 1);
        el.textContent = Math.round((1 - Math.pow(1 - p, 3)) * target);
        if (p < 1) requestAnimationFrame(frame);
      })(start);
    });
  }

  /* ===================== Reveal on scroll ===================== */
  var revealTargets = ".card, .project, .award, .t-item, .stat, .pub, .route, .terminal";
  document.querySelectorAll(revealTargets).forEach(function (el) { el.classList.add("reveal"); });

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        if (entry.target.classList.contains("stat")) runCounters();
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  function observeReveals() {
    document.querySelectorAll(".tab-panel.active .reveal:not(.visible)").forEach(function (el) {
      io.observe(el);
    });
  }
  observeReveals();
  if (reducedMotion) {
    document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("visible"); });
  }

  // Failsafe: never leave content stuck at opacity 0 if the observer misfires.
  setTimeout(function () {
    document.querySelectorAll(".tab-panel.active .reveal:not(.visible)").forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight) el.classList.add("visible");
    });
  }, 2500);

  /* ===================== Point cloud (research tab) ===================== */
  var cloudStarted = false;
  var cloudPt = "0,232,135", cloudGround = "143,163,160";

  function refreshCloudColors() {
    var cs = getComputedStyle(document.documentElement);
    cloudPt = (cs.getPropertyValue("--cloud-pt") || "0,232,135").trim();
    cloudGround = (cs.getPropertyValue("--cloud-ground") || "143,163,160").trim();
  }
  refreshCloudColors();

  function startCloud() {
    var canvas = document.getElementById("cloud");
    if (!canvas) return;

    var ctx = canvas.getContext("2d");
    var W, H, DPR = Math.min(window.devicePixelRatio || 1, 2);
    var mouseX = 0, mouseY = 0;

    function resize() {
      var r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return false;
      W = r.width; H = r.height;
      canvas.width = W * DPR; canvas.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      return true;
    }
    if (!resize()) return; // panel still hidden

    if (cloudStarted) return;
    cloudStarted = true;
    window.addEventListener("resize", resize);

    canvas.parentElement.addEventListener("mousemove", function (e) {
      var r = canvas.getBoundingClientRect();
      mouseX = (e.clientX - r.left) / r.width - 0.5;
      mouseY = (e.clientY - r.top) / r.height - 0.5;
    });

    var N = 900, pts = [];
    for (var i = 0; i < N; i++) {
      var t = (i / N) * Math.PI * 2;
      var p = 2, q = 3, R2 = 0.35;
      var r0 = Math.cos(q * t) + 2;
      var j = function () { return (Math.random() - 0.5) * 0.22; };
      pts.push({
        x: r0 * Math.cos(p * t) * R2 + j(),
        y: r0 * Math.sin(p * t) * R2 + j(),
        z: -Math.sin(q * t) * R2 + j(),
        tw: Math.random() * Math.PI * 2
      });
    }
    var ground = [];
    for (var g = 0; g < 200; g++) {
      ground.push({ x: (Math.random() - 0.5) * 3.4, y: 1.05, z: (Math.random() - 0.5) * 2.4 });
    }

    var fpsEl = document.getElementById("vizFps");
    if (fpsEl) fpsEl.textContent = (N + ground.length) + " PTS";

    function project(pt, cx, cy, scale, rotY, rotX) {
      var x = pt.x * Math.cos(rotY) - pt.z * Math.sin(rotY);
      var z = pt.x * Math.sin(rotY) + pt.z * Math.cos(rotY);
      var y = pt.y * Math.cos(rotX) - z * Math.sin(rotX);
      z = pt.y * Math.sin(rotX) + z * Math.cos(rotX);
      var persp = 2.6 / (2.6 + z);
      return { sx: cx + x * scale * persp, sy: cy + y * scale * persp, d: persp };
    }

    var angle = 0, scanY = -1.2;
    function draw(now) {
      if (!W || !H) { requestAnimationFrame(draw); return; }
      if (reducedMotion) { drawStatic(); return; }
      ctx.clearRect(0, 0, W, H);
      angle += 0.0035;
      var rotY = angle + mouseX * 0.6;
      var rotX = -0.32 + mouseY * 0.4;
      var cx = W / 2, cy = H / 2, scale = Math.min(W, H) * 0.5;

      for (var gi = 0; gi < ground.length; gi++) {
        var gp = project(ground[gi], cx, cy, scale, rotY * 0.4, rotX);
        ctx.fillStyle = "rgba(" + cloudGround + ",0.26)";
        ctx.fillRect(gp.sx, gp.sy, 1.2, 1.2);
      }

      for (var pi = 0; pi < pts.length; pi++) {
        var pt = pts[pi];
        var pr = project(pt, cx, cy, scale, rotY, rotX);
        var tw = 0.55 + 0.45 * Math.sin(pt.tw + now * 0.002);
        var alpha = Math.max(0.08, Math.min(0.95, (pr.d - 0.7) * 2.2)) * tw;
        var sz = Math.max(0.8, 2.2 * pr.d);
        if (Math.abs(pt.y - scanY) < 0.12) {
          ctx.fillStyle = "rgba(" + cloudPt + "," + Math.min(1, alpha + 0.6) + ")";
          sz += 0.8;
        } else {
          ctx.fillStyle = "rgba(" + cloudPt + "," + alpha * 0.85 + ")";
        }
        ctx.fillRect(pr.sx - sz / 2, pr.sy - sz / 2, sz, sz);
      }

      scanY += 0.006;
      if (scanY > 1.3) scanY = -1.3;
      requestAnimationFrame(draw);
    }

    // single static frame for reduced-motion users
    function drawStatic() {
      ctx.clearRect(0, 0, W, H);
      var cx = W / 2, cy = H / 2, scale = Math.min(W, H) * 0.5;
      for (var pi = 0; pi < pts.length; pi++) {
        var pr = project(pts[pi], cx, cy, scale, 0.6, -0.32);
        var alpha = Math.max(0.1, Math.min(0.9, (pr.d - 0.7) * 2.2));
        var sz = Math.max(0.8, 2.2 * pr.d);
        ctx.fillStyle = "rgba(" + cloudPt + "," + alpha * 0.85 + ")";
        ctx.fillRect(pr.sx - sz / 2, pr.sy - sz / 2, sz, sz);
      }
    }

    requestAnimationFrame(draw);
  }

  /* ===================== Deep link ===================== */
  var initial = location.hash.replace("#", "");
  if (initial && document.getElementById(initial)) activateTab(initial, false);
})();
