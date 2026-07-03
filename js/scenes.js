/* ============================================================
   TONIGHT — generative scenes
   swirl:   van gogh flow-field over the hero
   stars:   twinkling starfield + shooting stars
   lights:  a sea of raised lights (the crowd, symbolically)
   constellation: footer stars that connect near the cursor
   ============================================================ */

(function () {
  "use strict";

  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const DPR = Math.min(window.devicePixelRatio || 1, 1.75);
  const TAU = Math.PI * 2;

  const LAVENDERS = ["#b3a4e6", "#8d7fc0", "#5e79c9", "#c9bdf0", "#3b4f8f"];
  const WARMS = ["#d9b47a", "#f2ecdd", "#e8c9a0", "#b3a4e6"];

  function sizeCanvas(canvas) {
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, r.width * DPR);
    canvas.height = Math.max(1, r.height * DPR);
    return { w: canvas.width, h: canvas.height };
  }

  function onVisible(canvas, cb) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => cb(e.isIntersecting));
    }, { threshold: 0 });
    io.observe(canvas);
  }

  /* ---------- flow field: fixed vortices, à la Starry Night ---------- */

  function makeVortices(w, h) {
    return [
      { x: w * 0.30, y: h * 0.34, s: 1.15, r: Math.min(w, h) * 0.42 },
      { x: w * 0.68, y: h * 0.26, s: -0.95, r: Math.min(w, h) * 0.36 },
      { x: w * 0.52, y: h * 0.68, s: 0.7,  r: Math.min(w, h) * 0.30 },
      { x: w * 0.88, y: h * 0.62, s: -0.6, r: Math.min(w, h) * 0.26 },
    ];
  }

  function fieldAt(x, y, t, vortices, mouse) {
    let vx = 14, vy = 0; // gentle westerly drift
    for (const v of vortices) {
      const dx = x - v.x, dy = y - v.y;
      const d2 = dx * dx + dy * dy;
      const d = Math.sqrt(d2) + 0.0001;
      const fall = Math.exp(-d / v.r);
      const str = v.s * 90 * fall;
      vx += (-dy / d) * str;
      vy += (dx / d) * str;
    }
    // breathing wiggle
    vx += Math.sin(y * 0.006 + t * 0.4) * 8;
    vy += Math.cos(x * 0.005 - t * 0.3) * 8;
    // the cursor is its own small vortex
    if (mouse && mouse.on) {
      const dx = x - mouse.x, dy = y - mouse.y;
      const d = Math.sqrt(dx * dx + dy * dy) + 0.0001;
      const fall = Math.exp(-d / (140 * DPR));
      vx += (-dy / d) * 160 * fall;
      vy += (dx / d) * 160 * fall;
    }
    return { vx, vy };
  }

  /* ============ SWIRL (hero + mini variant) ============ */

  function initSwirl(canvas, opts) {
    const ctx = canvas.getContext("2d");
    const mini = !!(opts && opts.mini);
    let { w, h } = sizeCanvas(canvas);
    let vortices = makeVortices(w, h);
    const COUNT = REDUCED ? 0 : Math.round((mini ? 240 : 620) * Math.min(1, w / (1600 * DPR)) + (mini ? 120 : 220));
    const mouse = { x: 0, y: 0, on: false };
    let running = false, raf = null, t = 0;

    const parts = [];
    function spawn(p) {
      p.x = Math.random() * w;
      p.y = Math.random() * h;
      p.life = 0;
      p.ttl = 140 + Math.random() * 240;
      p.c = LAVENDERS[(Math.random() * LAVENDERS.length) | 0];
      p.lw = (Math.random() < 0.12 ? 1.8 : 0.7 + Math.random() * 0.7) * DPR;
      return p;
    }
    for (let i = 0; i < COUNT; i++) {
      const p = spawn({});
      p.life = Math.random() * p.ttl; // desync
      parts.push(p);
    }

    // paint the base once so the first frames aren't black
    function paintBase() {
      const g = ctx.createRadialGradient(w * 0.35, h * 0.3, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.8);
      g.addColorStop(0, "#0d1024");
      g.addColorStop(0.5, "#080a18");
      g.addColorStop(1, "#06070f");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    paintBase();

    function frame() {
      t += 0.016;
      // fade, don't clear — this is what makes the brushstrokes
      ctx.fillStyle = "rgba(6, 7, 15, 0.045)";
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      for (const p of parts) {
        const f = fieldAt(p.x, p.y, t, vortices, mouse);
        const nx = p.x + f.vx * 0.016 * DPR;
        const ny = p.y + f.vy * 0.016 * DPR;
        const fade = Math.sin((p.life / p.ttl) * Math.PI); // ease in & out
        ctx.strokeStyle = p.c;
        ctx.globalAlpha = 0.16 * fade;
        ctx.lineWidth = p.lw;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(nx, ny);
        ctx.stroke();
        p.x = nx; p.y = ny;
        p.life++;
        if (p.life > p.ttl || p.x < -20 || p.x > w + 20 || p.y < -20 || p.y > h + 20) spawn(p);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      if (running) raf = requestAnimationFrame(frame);
    }

    onVisible(canvas, (vis) => {
      if (vis) {
        const r = canvas.getBoundingClientRect();
        if (Math.abs(r.width * DPR - w) > 2 || Math.abs(r.height * DPR - h) > 2) {
          ({ w, h } = sizeCanvas(canvas));
          vortices = makeVortices(w, h);
          paintBase();
        }
      }
      const should = vis && !REDUCED;
      if (should && !running) { running = true; raf = requestAnimationFrame(frame); }
      if (!should && running) { running = false; cancelAnimationFrame(raf); }
      if (REDUCED && vis) paintBase();
    });

    if (!mini) {
      canvas.addEventListener("pointermove", (e) => {
        const r = canvas.getBoundingClientRect();
        mouse.x = (e.clientX - r.left) * DPR;
        mouse.y = (e.clientY - r.top) * DPR;
        mouse.on = true;
      });
      canvas.addEventListener("pointerleave", () => { mouse.on = false; });
    }

    let rt;
    window.addEventListener("resize", () => {
      clearTimeout(rt);
      rt = setTimeout(() => {
        ({ w, h } = sizeCanvas(canvas));
        vortices = makeVortices(w, h);
        paintBase();
      }, 150);
    });
  }

  /* ============ STARS (hero overlay + shooting stars) ============ */

  function initStars(canvas) {
    const ctx = canvas.getContext("2d");
    let { w, h } = sizeCanvas(canvas);
    let running = false, raf = null, t = 0;
    let stars = [];
    let milky = null;
    const meteors = [];

    function gauss() {
      let u = 0, v = 0;
      while (!u) u = Math.random();
      while (!v) v = Math.random();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
    }

    // the galaxy is painted once on a square canvas sized to the viewport
    // diagonal, so it can rotate around the center without exposing edges
    function buildMilky() {
      const S = Math.ceil(Math.hypot(w, h)) + 8;
      milky = document.createElement("canvas");
      milky.width = S; milky.height = S;
      const m = milky.getContext("2d");

      // faint dust scattered across the whole sky
      const dustN = Math.round((S * S) / (2600 * DPR * DPR));
      for (let i = 0; i < dustN; i++) {
        m.globalAlpha = 0.03 + Math.random() * 0.09;
        m.fillStyle = Math.random() < 0.3 ? "#cfc7e8" : "#ffffff";
        m.beginPath();
        m.arc(Math.random() * S, Math.random() * S, (0.3 + Math.random() * 0.45) * DPR, 0, TAU);
        m.fill();
      }

      // the galactic band, running diagonally behind the wordmark
      const cx = S * 0.53, cy = S * 0.46, ang = -0.6;
      const dx = Math.cos(ang), dy = Math.sin(ang), px = -dy, py = dx;
      const L = S * 0.72;

      // soft nebular haze along the band
      m.globalCompositeOperation = "lighter";
      for (let i = 0; i < 58; i++) {
        const u = (Math.random() * 2 - 1) * L * 0.95;
        const v = gauss() * S * 0.055;
        const x = cx + u * dx + v * px, y = cy + u * dy + v * py;
        const rad = (80 + Math.random() * 210) * DPR;
        const tint = Math.random() < 0.3 ? "170,160,220" : (Math.random() < 0.5 ? "190,200,240" : "245,240,235");
        const g = m.createRadialGradient(x, y, 0, x, y, rad);
        g.addColorStop(0, "rgba(" + tint + ",0.15)");
        g.addColorStop(1, "rgba(" + tint + ",0)");
        m.fillStyle = g;
        m.beginPath(); m.arc(x, y, rad, 0, TAU); m.fill();
      }

      // the galactic core: a bright, broad central bulge, layered like the real thing
      for (let i = 0; i < 4; i++) {
        const u = (i * 0.06) * L * (i % 2 ? -1 : 1);
        const x = cx + u * dx, y = cy + u * dy + (i % 2 ? -1 : 1) * S * 0.008;
        const rad = (300 + i * 120) * DPR;
        const a = 0.2 - i * 0.035;
        const g = m.createRadialGradient(x, y, 0, x, y, rad);
        g.addColorStop(0, "rgba(255,241,224," + a.toFixed(3) + ")");
        g.addColorStop(0.35, "rgba(235,222,238," + (a * 0.5).toFixed(3) + ")");
        g.addColorStop(1, "rgba(235,222,238,0)");
        m.fillStyle = g;
        m.beginPath(); m.arc(x, y, rad, 0, TAU); m.fill();
      }

      // dense star dust concentrated in the band's core
      const bandN = Math.round((S * S) / (230 * DPR * DPR));
      for (let i = 0; i < bandN; i++) {
        const u = (Math.random() * 2 - 1) * L;
        const v = gauss() * S * 0.095;
        const x = cx + u * dx + v * px, y = cy + u * dy + v * py;
        if (x < -4 || x > S + 4 || y < -4 || y > S + 4) continue;
        const core = Math.abs(v) < S * 0.045;
        m.globalAlpha = (core ? 0.13 : 0.08) + Math.random() * (core ? 0.3 : 0.19);
        m.fillStyle = Math.random() < 0.22 ? "#d8d2f0" : (Math.random() < 0.1 ? "#ffe9d8" : "#ffffff");
        m.beginPath();
        m.arc(x, y, (0.3 + Math.random() * (core ? 0.7 : 0.45)) * DPR, 0, TAU);
        m.fill();
      }
      m.globalAlpha = 1;
      m.globalCompositeOperation = "source-over";

      // the dark rift: a dust lane threading the band's core
      for (let i = 0; i < 40; i++) {
        const u = (Math.random() * 2 - 1) * L;
        const v = gauss() * S * 0.013 + Math.sin(u * 0.002 / DPR) * S * 0.008;
        const x = cx + u * dx + v * px, y = cy + u * dy + v * py;
        const rad = (44 + Math.random() * 100) * DPR;
        const g = m.createRadialGradient(x, y, 0, x, y, rad);
        g.addColorStop(0, "rgba(2,1,4,0.22)");
        g.addColorStop(1, "rgba(2,1,4,0)");
        m.fillStyle = g;
        m.beginPath(); m.arc(x, y, rad, 0, TAU); m.fill();
      }
    }

    function seed() {
      stars = [];
      const n = Math.round((w * h) / (11000 * DPR));
      for (let i = 0; i < n; i++) {
        const roll = Math.random();
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: (0.35 + Math.pow(Math.random(), 3) * 1.9) * DPR,
          tw: 0.25 + Math.random() * 1.1,
          ph: Math.random() * TAU,
          c: roll < 0.14 ? "#cfc7e8" : (roll < 0.24 ? "#dfe6ff" : (roll < 0.3 ? "#ffe9d8" : "#ffffff")),
        });
      }
    }
    // one synchronous frame so the sky exists before the animation loop starts
    function drawStatic() {
      ctx.clearRect(0, 0, w, h);
      if (milky) {
        const S = milky.width;
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.drawImage(milky, -S / 2, -S / 2);
        ctx.restore();
      }
      for (const s of stars) {
        ctx.globalAlpha = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(s.ph));
        ctx.fillStyle = s.c;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    buildMilky();
    seed();
    drawStatic();

    function shoot(x, y) {
      const a = Math.PI * (0.12 + Math.random() * 0.2);
      meteors.push({
        x: x !== undefined ? x : Math.random() * w * 0.8,
        y: y !== undefined ? y : Math.random() * h * 0.35,
        vx: Math.cos(a) * (9 + Math.random() * 6) * DPR,
        vy: Math.sin(a) * (9 + Math.random() * 6) * DPR,
        life: 0, ttl: 40 + Math.random() * 25,
      });
    }
    // expose for clicks & easter eggs
    canvas.__shoot = shoot;

    function frame() {
      t += 0.016;
      ctx.clearRect(0, 0, w, h);
      if (milky) {
        // fixed in place, turning like the night sky on a long exposure
        const S = milky.width;
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.rotate(t * 0.0035);
        ctx.drawImage(milky, -S / 2, -S / 2);
        ctx.restore();
      }
      // stars are pinned: they twinkle in brightness but never move
      for (const s of stars) {
        const a = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * s.tw + s.ph));
        ctx.globalAlpha = a;
        ctx.fillStyle = s.c;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, TAU);
        ctx.fill();
        if (s.r > 1.4 * DPR) { // bright stars get a cross flare
          ctx.globalAlpha = a * 0.35;
          ctx.strokeStyle = s.c;
          ctx.lineWidth = 0.6 * DPR;
          ctx.beginPath();
          ctx.moveTo(s.x - s.r * 4, s.y); ctx.lineTo(s.x + s.r * 4, s.y);
          ctx.moveTo(s.x, s.y - s.r * 4); ctx.lineTo(s.x, s.y + s.r * 4);
          ctx.stroke();
        }
      }
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        const fade = 1 - m.life / m.ttl;
        const g = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * 6, m.y - m.vy * 6);
        g.addColorStop(0, "rgba(255,255,255," + (0.9 * fade) + ")");
        g.addColorStop(1, "rgba(207,199,232,0)");
        ctx.globalAlpha = 1;
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.4 * DPR;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(m.x - m.vx * 6, m.y - m.vy * 6);
        ctx.stroke();
        m.x += m.vx; m.y += m.vy; m.life++;
        if (m.life > m.ttl) meteors.splice(i, 1);
      }
      ctx.globalAlpha = 1;
      // occasional unprompted wish
      if (!REDUCED && Math.random() < 0.0032) shoot();
      if (running) raf = requestAnimationFrame(frame);
    }

    onVisible(canvas, (vis) => {
      const should = vis && !REDUCED;
      if (should && !running) { running = true; raf = requestAnimationFrame(frame); }
      if (!should && running) { running = false; cancelAnimationFrame(raf); }
      if (REDUCED) { // static sky
        ctx.clearRect(0, 0, w, h);
        if (milky) ctx.drawImage(milky, 0, 0);
        for (const s of stars) {
          ctx.globalAlpha = 0.7; ctx.fillStyle = s.c;
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill();
        }
      }
    });

    // click the sky, make a wish
    canvas.addEventListener("pointerdown", (e) => {
      const r = canvas.getBoundingClientRect();
      shoot((e.clientX - r.left) * DPR, (e.clientY - r.top) * DPR);
    });


    let rt;
    window.addEventListener("resize", () => {
      clearTimeout(rt);
      rt = setTimeout(() => { ({ w, h } = sizeCanvas(canvas)); buildMilky(); seed(); drawStatic(); }, 150);
    });
  }

  /* ============ LIGHTS — a sea of raised lights ============ */

  function initLights(canvas) {
    const ctx = canvas.getContext("2d");
    let { w, h } = sizeCanvas(canvas);
    let running = false, raf = null, t = 0;

    let lights = [];
    function seedLights() {
      lights = [];
      const count = REDUCED ? 0 : Math.round((w / DPR) / 6);
      for (let i = 0; i < count; i++) {
        lights.push({
          x: Math.random() * w,
          base: h * (0.55 + Math.random() * 0.4),
          r: (0.8 + Math.random() * 2.4) * DPR,
          sway: 6 + Math.random() * 18,
          sp: 0.3 + Math.random() * 0.9,
          ph: Math.random() * TAU,
          c: WARMS[(Math.random() * WARMS.length) | 0],
          flash: 0,
        });
      }
    }
    seedLights();

    function silhouette() {
      // rows of heads — the crowd, abstracted
      ctx.fillStyle = "rgba(4, 5, 11, 0.9)";
      for (let row = 0; row < 3; row++) {
        const yBase = h * (0.82 + row * 0.07);
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += 26 * DPR) {
          const head = Math.sin(x * 0.05 / DPR + row * 7) * 6 * DPR + Math.sin(x * 0.013 / DPR + row) * 10 * DPR;
          ctx.lineTo(x, yBase + head);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fill();
      }
    }

    function paintBase() {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#06070f");
      g.addColorStop(0.6, "#0c0f22");
      g.addColorStop(1, "#131022");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      // stage glow on the horizon
      const s = ctx.createRadialGradient(w * 0.5, h * 0.95, 0, w * 0.5, h * 0.95, w * 0.55);
      s.addColorStop(0, "rgba(179,164,230,0.16)");
      s.addColorStop(0.5, "rgba(94,121,201,0.07)");
      s.addColorStop(1, "transparent");
      ctx.fillStyle = s;
      ctx.fillRect(0, 0, w, h);
    }

    function frame() {
      t += 0.016;
      paintBase();
      ctx.globalCompositeOperation = "lighter";
      for (const L of lights) {
        const x = L.x + Math.sin(t * L.sp + L.ph) * L.sway * DPR * 0.4;
        const y = L.base + Math.cos(t * L.sp * 0.7 + L.ph) * 4 * DPR;
        if (Math.random() < 0.0006) L.flash = 1; // a camera goes off
        const glow = L.flash > 0 ? L.flash : 0.5 + 0.5 * Math.sin(t * 1.3 + L.ph);
        const rr = L.r * (1 + (L.flash > 0 ? L.flash * 3 : 0));
        const g = ctx.createRadialGradient(x, y, 0, x, y, rr * 5);
        g.addColorStop(0, L.c);
        g.addColorStop(0.25, L.c + "66");
        g.addColorStop(1, "transparent");
        ctx.globalAlpha = 0.25 + glow * 0.5;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, rr * 5, 0, TAU);
        ctx.fill();
        if (L.flash > 0) L.flash -= 0.05;
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      silhouette();
      if (running) raf = requestAnimationFrame(frame);
    }

    onVisible(canvas, (vis) => {
      if (vis) {
        const r = canvas.getBoundingClientRect();
        if (Math.abs(r.width * DPR - w) > 2 || Math.abs(r.height * DPR - h) > 2) {
          ({ w, h } = sizeCanvas(canvas));
          seedLights();
        }
      }
      const should = vis && !REDUCED;
      if (should && !running) { running = true; raf = requestAnimationFrame(frame); }
      if (!should && running) { running = false; cancelAnimationFrame(raf); }
      if (REDUCED && vis) { paintBase(); silhouette(); }
    });

    let rt;
    window.addEventListener("resize", () => {
      clearTimeout(rt);
      rt = setTimeout(() => { ({ w, h } = sizeCanvas(canvas)); seedLights(); paintBase(); silhouette(); }, 150);
    });
  }

  /* ============ CONSTELLATION (footer) ============ */

  function initConstellation(canvas) {
    const ctx = canvas.getContext("2d");
    let { w, h } = sizeCanvas(canvas);
    let running = false, raf = null, t = 0;
    const mouse = { x: -9999, y: -9999 };
    let pts = [];

    function seed() {
      pts = [];
      const n = Math.round((w * h) / (34000 * DPR));
      for (let i = 0; i < n; i++) {
        pts.push({
          x: Math.random() * w, y: Math.random() * h,
          r: (0.5 + Math.random() * 1) * DPR,
          tw: 0.4 + Math.random() * 1.6, ph: Math.random() * TAU,
        });
      }
    }
    seed();

    function frame() {
      t += 0.016;
      ctx.clearRect(0, 0, w, h);
      const R = 170 * DPR;
      for (const p of pts) {
        const a = 0.25 + 0.5 * (0.5 + 0.5 * Math.sin(t * p.tw + p.ph));
        ctx.globalAlpha = a;
        ctx.fillStyle = "#c9bdf0";
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
      }
      // the sky organizes itself around your attention
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        const da = Math.hypot(a.x - mouse.x, a.y - mouse.y);
        if (da > R) continue;
        for (let j = i + 1; j < pts.length; j++) {
          const b = pts[j];
          const db = Math.hypot(b.x - mouse.x, b.y - mouse.y);
          if (db > R) continue;
          const dd = Math.hypot(a.x - b.x, a.y - b.y);
          if (dd < 120 * DPR) {
            ctx.globalAlpha = (1 - da / R) * (1 - dd / (120 * DPR)) * 0.5;
            ctx.strokeStyle = "#8d7fc0";
            ctx.lineWidth = 0.6 * DPR;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
      if (running) raf = requestAnimationFrame(frame);
    }

    onVisible(canvas, (vis) => {
      const should = vis && !REDUCED;
      if (should && !running) { running = true; raf = requestAnimationFrame(frame); }
      if (!should && running) { running = false; cancelAnimationFrame(raf); }
    });

    const footer = canvas.closest("footer") || canvas;
    footer.addEventListener("pointermove", (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = (e.clientX - r.left) * DPR;
      mouse.y = (e.clientY - r.top) * DPR;
    });
    footer.addEventListener("pointerleave", () => { mouse.x = mouse.y = -9999; });

    let rt;
    window.addEventListener("resize", () => {
      clearTimeout(rt);
      rt = setTimeout(() => { ({ w, h } = sizeCanvas(canvas)); seed(); }, 150);
    });
  }

  /* ============ boot ============ */

  window.TonightScenes = {
    boot() {
      const swirl = document.getElementById("swirl");
      const stars = document.getElementById("stars");
      if (swirl) initSwirl(swirl, { mini: false });
      if (stars) initStars(stars);
      document.querySelectorAll('canvas[data-scene="swirl-mini"]').forEach((c) => initSwirl(c, { mini: true }));
      document.querySelectorAll('canvas[data-scene="lights-mini"]').forEach((c) => initLights(c));
      const con = document.getElementById("constellation");
      if (con) initConstellation(con);
    },
    wish() { // used by easter eggs: a volley of shooting stars
      const stars = document.getElementById("stars");
      if (stars && stars.__shoot) {
        for (let i = 0; i < 7; i++) setTimeout(() => stars.__shoot(), i * 260);
      }
    },
  };
})();
