/* ============================================================
   Aaserud Trapp – skrollanimasjon og interaksjon
   ============================================================ */

(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Header: bakgrunn etter skroll ---------- */

  var header = document.getElementById("siteHeader");
  function updateHeader() {
    header.classList.toggle("is-scrolled", window.scrollY > 40);
  }

  /* ---------- Mobilmeny ---------- */

  var navToggle = document.getElementById("navToggle");
  var siteNav = document.getElementById("siteNav");

  navToggle.addEventListener("click", function () {
    var open = siteNav.classList.toggle("is-open");
    navToggle.classList.toggle("is-open", open);
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    navToggle.setAttribute("aria-label", open ? "Lukk meny" : "Åpne meny");
  });

  siteNav.addEventListener("click", function (e) {
    if (e.target.tagName === "A") {
      siteNav.classList.remove("is-open");
      navToggle.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    }
  });

  /* ---------- Skroll-historien: klatre opp trappen ----------
     Scenen er større enn skjermen. Mens man skroller flyttes den
     diagonalt (ned + mot venstre), slik at "kameraet" beveger seg
     opp og mot høyre – som å gå opp trappen. */

  var story = document.getElementById("story");
  var scene = document.getElementById("scene");
  var scenePhoto = scene.querySelector(".scene__photo");
  var panels = Array.prototype.slice.call(document.querySelectorAll(".story-panel"));
  var ctaPanel = document.querySelector(".story-panel--cta");
  var hint = document.getElementById("scrollHint");
  var bars = Array.prototype.slice.call(document.querySelectorAll("#climbProgress span"));

  // Når hvert tekstpanel er synlig, som andel av klatringen (0–1)
  var windows = [
    { start: -0.1, end: 0.2 },
    { start: 0.26, end: 0.46 },
    { start: 0.52, end: 0.72 },
    { start: 0.8, end: 9 } // siste panel blir stående
  ];
  var FADE = 0.05;

  var dims = { vw: 0, vh: 0, w: 0, h: 0, total: 1 };

  // Illustrasjonen er 2400/1600 = 1.5 bred/høy og klatrer fra nede-venstre
  // til oppe-høyre (samme retning som er tegnet inn i SVG-en).
  var sceneRatio = 1.5;
  // Fokuspunkt (som andel av bildet, 0–1) for nederste og øverste trinn.
  // Lastes et ekte foto med data-focus-start/-end, brukes disse i stedet
  // for å style kameraet til å faktisk følge trappen i det bildet.
  var focus = { x0: 0.08, y0: 0.92, x1: 0.92, y1: 0.08 };

  function measure() {
    dims.vw = window.innerWidth;
    dims.vh = window.innerHeight;
    // Scenen må være større enn skjermen både i høyde og bredde,
    // ellers blir det ingen "reise".
    dims.h = Math.max(dims.vh * 2, (dims.vw * 1.575) / sceneRatio);
    dims.w = dims.h * sceneRatio;
    scene.style.width = dims.w + "px";
    scene.style.height = dims.h + "px";
    dims.total = story.offsetHeight - dims.vh;
  }

  function parseFocus(attr) {
    var v = scenePhoto.getAttribute(attr);
    if (!v) return null;
    var parts = v.split(",").map(Number);
    if (parts.length !== 2 || parts.some(isNaN)) return null;
    return [parts[0] / 100, parts[1] / 100];
  }

  function adoptPhoto() {
    if (scenePhoto && scenePhoto.naturalWidth > 0) {
      sceneRatio = scenePhoto.naturalWidth / scenePhoto.naturalHeight;
      var start = parseFocus("data-focus-start");
      var end = parseFocus("data-focus-end");
      if (start) { focus.x0 = start[0]; focus.y0 = start[1]; }
      if (end) { focus.x1 = end[0]; focus.y1 = end[1]; }
      measure();
      update();
    }
  }

  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function clamp01(v) {
    return Math.min(1, Math.max(0, v));
  }

  function update() {
    var p = clamp01((window.scrollY - story.offsetTop) / dims.total);

    // Flytt scenen: start ved foten av trappen, slutt på toppen.
    if (reduceMotion) {
      scene.style.transform =
        "translate(" + (dims.vw - dims.w) / 2 + "px," + (dims.vh - dims.h) / 2 + "px)";
    } else {
      var e = easeInOut(p);
      // Finn fokuspunktet akkurat nå (mellom bunn- og topptrinn), og
      // sentrer scenen slik at det punktet havner midt i vinduet.
      var fx = focus.x0 + (focus.x1 - focus.x0) * e;
      var fy = focus.y0 + (focus.y1 - focus.y0) * e;
      var tx = dims.vw / 2 - fx * dims.w;
      var ty = dims.vh / 2 - fy * dims.h;
      // Aldri vis tomrom utenfor scenen
      tx = Math.min(0, Math.max(dims.vw - dims.w, tx));
      ty = Math.min(0, Math.max(dims.vh - dims.h, ty));
      scene.style.transform = "translate3d(" + tx + "px," + ty + "px,0)";
    }

    // Ton tekstpanelene inn og ut
    panels.forEach(function (panel, i) {
      var w = windows[i];
      var o = clamp01(Math.min((p - w.start) / FADE, (w.end - p) / FADE));
      panel.style.opacity = o;
      panel.style.transform = reduceMotion ? "none" : "translateY(" + (1 - o) * 26 + "px)";
    });
    ctaPanel.classList.toggle("is-live", p > windows[3].start);

    // Skrollehint forsvinner straks man begynner
    hint.style.opacity = Math.max(0, 1 - p * 10);

    // Trinn-indikatoren fylles
    var filled = Math.round(p * bars.length);
    bars.forEach(function (bar, i) {
      bar.classList.toggle("is-on", i < filled);
    });
  }

  var ticking = false;
  function onScroll() {
    updateHeader();
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(function () {
        update();
        ticking = false;
      });
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", function () {
    measure();
    update();
  });

  measure();
  update();
  updateHeader();

  if (scenePhoto) {
    if (scenePhoto.complete) {
      adoptPhoto();
    } else {
      scenePhoto.addEventListener("load", adoptPhoto);
    }
  }

  /* ---------- Filtrering av trappemodeller ---------- */

  var filterBtns = Array.prototype.slice.call(document.querySelectorAll(".filter-btn"));
  var cards = Array.prototype.slice.call(document.querySelectorAll(".model-card"));

  filterBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      filterBtns.forEach(function (b) {
        b.classList.toggle("is-active", b === btn);
      });
      var filter = btn.getAttribute("data-filter");
      cards.forEach(function (card) {
        var show = filter === "alle" || card.getAttribute("data-supplier") === filter;
        card.classList.toggle("is-hidden", !show);
      });
    });
  });

  /* ---------- Modell-CTA: ta med valgt modell inn i kontaktskjemaet ---------- */

  var meldingField = document.getElementById("f-melding");
  var emneField = document.getElementById("f-emne");
  document.querySelectorAll(".model-card__body a[data-model]").forEach(function (link) {
    link.addEventListener("click", function () {
      var modell = link.getAttribute("data-model");
      if (meldingField && !meldingField.value.trim()) {
        meldingField.value = "Hei, jeg er interessert i trappemodellen " + modell + ". Kan dere sende meg et pristilbud?";
      }
      if (emneField) {
        emneField.value = "Ny trapp";
      }
    });
  });

  /* ---------- Reveal: seksjoner toner inn ---------- */

  if ("IntersectionObserver" in window && !reduceMotion) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll(".reveal").forEach(function (el) {
      observer.observe(el);
    });
  } else {
    document.querySelectorAll(".reveal").forEach(function (el) {
      el.classList.add("is-visible");
    });
  }
})();
