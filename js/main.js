/* ============================================================
   TONIGHT — routing, reveals, and a few things
   you only find if you're paying attention.
   ============================================================ */

(function () {
  "use strict";

  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Router ---------- */

  const pages = document.querySelectorAll(".page");
  const navLinks = document.querySelectorAll(".nav__link[data-route]");

  function route() {
    const hash = location.hash.replace(/^#\/?/, "") || "home";
    const name = ["home", "about"].includes(hash) ? hash : "home";
    pages.forEach((p) => {
      const active = p.dataset.page === name;
      p.hidden = !active;
      p.classList.toggle("is-entering", active);
    });
    document.body.classList.toggle("is-home", name === "home");
    navLinks.forEach((a) => {
      a.classList.toggle("is-active", a.dataset.route === name);
    });
    window.scrollTo(0, 0);
    // let freshly-revealed canvases re-measure themselves
    requestAnimationFrame(() => observeReveals());
  }

  window.addEventListener("hashchange", route);

  /* ---------- Scroll reveals ---------- */

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
  );

  function observeReveals() {
    document.querySelectorAll(".page:not([hidden]) .reveal:not(.is-visible)").forEach((el) => io.observe(el));
  }

  /* ---------- Nav scroll state ---------- */

  const nav = document.getElementById("nav");
  let lastY = 0;
  window.addEventListener("scroll", () => {
    const y = window.scrollY;
    nav.classList.toggle("is-scrolled", y > 40);
    lastY = y;
  }, { passive: true });

  /* ---------- Cursor glow ---------- */

  const glow = document.querySelector(".cursor-glow");
  if (glow && matchMedia("(pointer: fine)").matches && !REDUCED) {
    let gx = innerWidth / 2, gy = innerHeight / 2, tx = gx, ty = gy, seen = false;
    addEventListener("pointermove", (e) => {
      tx = e.clientX; ty = e.clientY;
      if (!seen) { seen = true; gx = tx; gy = ty; document.body.classList.add("has-cursor"); }
    });
    (function follow() {
      gx += (tx - gx) * 0.1;
      gy += (ty - gy) * 0.1;
      glow.style.transform = "translate(" + gx + "px," + gy + "px)";
      requestAnimationFrame(follow);
    })();
  }

  /* ---------- Easter eggs ---------- */

  // Type "encore" anywhere: a volley of shooting stars.
  // Konami code: the aurora comes out.
  const aurora = document.querySelector(".aurora");
  let typed = "";
  const KONAMI = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];
  let konamiIdx = 0;
  addEventListener("keydown", (e) => {
    // encore
    if (e.key && e.key.length === 1) {
      typed = (typed + e.key.toLowerCase()).slice(-6);
      if (typed === "encore") {
        typed = "";
        if (location.hash && location.hash !== "#/") location.hash = "#/";
        setTimeout(() => window.TonightScenes && window.TonightScenes.wish(), 300);
      }
    }
    // konami
    const want = KONAMI[konamiIdx];
    if (e.key === want || e.key.toLowerCase() === want) {
      konamiIdx++;
      if (konamiIdx === KONAMI.length) {
        konamiIdx = 0;
        if (aurora) {
          aurora.classList.add("is-on");
          setTimeout(() => aurora.classList.remove("is-on"), 12000);
        }
      }
    } else {
      konamiIdx = e.key === KONAMI[0] ? 1 : 0;
    }
  });

  /* ---------- Boot ---------- */

  window.TonightScenes && window.TonightScenes.boot();
  route();
  observeReveals();
})();
