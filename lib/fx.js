// ---------------------------------------------------------------------------
// lib/fx.js — ambient particles, confetti engine, chime, haptics, palette.
// Framework-agnostic canvas modules. No dependencies. prefers-reduced-motion
// aware: with RM enabled nothing animates and all burst functions no-op.
// ---------------------------------------------------------------------------

/* ---------- reduced motion ---------- */
export let RM = false;
if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
  const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
  RM = !!mql.matches;
  const apply = () => {
    RM = !!mql.matches;
    document.documentElement.classList[RM ? "add" : "remove"]("rm");
  };
  apply();
  mql.addEventListener ? mql.addEventListener("change", apply) : mql.addListener(apply);
}

/* ---------- tiny helpers ---------- */
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export function buzz(ms) {
  try {
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(ms);
  } catch (e) {}
}

/* ---------- theme palette (reads CSS vars) ---------- */
let paletteCache = null;
export function palette() {
  if (paletteCache) return paletteCache;
  const cs = getComputedStyle(document.documentElement);
  const hex = (h) => {
    h = (h || "").trim();
    if (h.indexOf("#") !== 0 || h.length < 7) return [255, 79, 139];
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const acc = hex(cs.getPropertyValue("--acc"));
  const acc2 = hex(cs.getPropertyValue("--acc2"));
  paletteCache = { rgb: acc, rgb2: acc2 };
  return paletteCache;
}
export function resetPaletteCache() {
  paletteCache = null;
}

/* ---------- canvas plumbing ---------- */
function fitCanvas(cv) {
  if (!cv) return null;
  const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
  const w = cv.clientWidth,
    h = cv.clientHeight;
  if (!w || !h) return null;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
  }
  const ctx = cv.getContext && cv.getContext("2d");
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

export function drawHeartPath(c, x, y, s, rot) {
  c.save();
  c.translate(x, y);
  if (rot) c.rotate(rot);
  const k = s / 16;
  c.scale(k, k);
  c.beginPath();
  c.moveTo(0, 6);
  c.bezierCurveTo(-9, -2, -7, -11, 0, -6);
  c.bezierCurveTo(7, -11, 9, -2, 0, 6);
  c.closePath();
  c.restore();
}

/* ---------- chime (WebAudio arpeggio, no files) ---------- */
export function chime() {
  if (RM) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    [523.25, 659.25, 783.99].forEach((f, i) => {
      const o = ctx.createOscillator(),
        g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = f;
      const t0 = ctx.currentTime + i * 0.12;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.09, t0 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(t0);
      o.stop(t0 + 0.55);
    });
  } catch (e) {}
}

/* ---------- ambient particles (background #fx) ---------- */
const fx = { cv: null, items: [], running: false, last: 0 };

function fxItem() {
  const W = (fx.cv && fx.cv.clientWidth) || window.innerWidth;
  const H = (fx.cv && fx.cv.clientHeight) || window.innerHeight;
  const r = Math.random();
  const type = r < 0.6 ? "star" : r < 0.88 ? "heart" : "sparkle";
  return {
    type,
    x: rand(0, W),
    y: rand(0, H),
    vy: rand(0.06, 0.3),
    sway: rand(0.4, 1.4),
    ph: rand(0, Math.PI * 2),
    s: type === "star" ? rand(0.8, 2.1) : rand(4, 11),
    a: rand(0.15, 0.6),
    tw: rand(0.5, 2.2),
  };
}

function fxLoop(now) {
  if (document.hidden) {
    fx.last = now;
    requestAnimationFrame(fxLoop);
    return;
  }
  const dt = Math.min(50, now - fx.last);
  fx.last = now;
  const ctx = fitCanvas(fx.cv);
  const W = fx.cv.clientWidth,
    H = fx.cv.clientHeight;
  if (ctx) {
    ctx.clearRect(0, 0, W, H);
    const pal = palette();
    for (let i = 0; i < fx.items.length; i++) {
      const p = fx.items[i];
      p.y -= p.vy * dt * 0.06;
      p.ph += 0.0006 * dt * p.sway;
      if (p.y < -20) {
        fx.items[i] = fxItem();
        fx.items[i].y = H + rand(5, 40);
        continue;
      }
      const x = p.x + Math.sin(p.ph) * 8;
      const alpha = p.a * (0.55 + 0.45 * Math.sin(now * 0.001 * p.tw + p.ph));
      ctx.globalAlpha = clamp(alpha, 0.05, 0.7);
      if (p.type === "star") {
        ctx.fillStyle = "rgba(255,235,250,0.9)";
        ctx.beginPath();
        ctx.arc(x, p.y, p.s, 0, 6.283);
        ctx.fill();
      } else if (p.type === "heart") {
        ctx.fillStyle = p.s > 8 ? "rgb(" + pal.rgb2.join(",") + ")" : "rgb(" + pal.rgb.join(",") + ")";
        drawHeartPath(ctx, x, p.y, p.s, Math.sin(p.ph) * 0.2);
        ctx.fill();
      } else {
        ctx.strokeStyle = "rgba(255,220,245,0.95)";
        ctx.lineWidth = 1;
        const s2 = p.s * 0.5;
        ctx.beginPath();
        ctx.moveTo(x - s2, p.y);
        ctx.lineTo(x + s2, p.y);
        ctx.moveTo(x, p.y - s2);
        ctx.lineTo(x, p.y + s2);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }
  requestAnimationFrame(fxLoop);
}

export function fxStart() {
  if (RM) return;
  fx.cv = document.getElementById("fx");
  if (!fx.cv || !fx.cv.getContext) return;
  if (!fx.items.length) for (let i = 0; i < 46; i++) fx.items.push(fxItem());
  if (!fx.running) {
    fx.running = true;
    fx.last = performance.now();
    requestAnimationFrame(fxLoop);
  }
}

/* ---------- confetti engine (#confetti) ---------- */
const cf = { cv: null, items: [], running: false, last: 0, rains: 0 };

function cfCanvas() {
  if (!cf.cv) cf.cv = document.getElementById("confetti");
  return cf.cv;
}

function cfColors() {
  const pal = palette();
  return ["rgb(" + pal.rgb.join(",") + ")", "rgb(" + pal.rgb2.join(",") + ")", "#ffd76e", "#fff0fa", "#8f6bff"];
}

function cfPiece(x, y, vx, vy) {
  const r = Math.random();
  return {
    type: r < 0.34 ? "rect" : r < 0.58 ? "heart" : r < 0.82 ? "circ" : "spark",
    x,
    y,
    vx,
    vy,
    g: rand(0.12, 0.22),
    drag: rand(0.985, 0.995),
    rot: rand(0, 6.283),
    vr: rand(-0.2, 0.2),
    s: rand(5, 11),
    c: pick(cfColors()),
    life: 0,
    ttl: rand(1200, 2300),
  };
}

function cfRun() {
  if (cf.running) return;
  cf.running = true;
  cf.last = performance.now();
  requestAnimationFrame(cfLoop);
}

function cfLoop(now) {
  const dt = Math.min(48, now - cf.last);
  cf.last = now;
  const ctx = fitCanvas(cfCanvas());
  if (!ctx) {
    cf.running = false;
    return;
  }
  const W = cf.cv.clientWidth,
    H = cf.cv.clientHeight;
  ctx.clearRect(0, 0, W, H);
  const k = dt / 16.7;
  for (let i = cf.items.length - 1; i >= 0; i--) {
    const p = cf.items[i];
    p.life += dt;
    p.vy += p.g * k;
    p.vx *= Math.pow(p.drag, k);
    p.x += p.vx * k;
    p.y += p.vy * k;
    p.rot += p.vr * k;
    const fade = p.life > p.ttl - 400 ? Math.max(0, (p.ttl - p.life) / 400) : 1;
    if (p.life > p.ttl || p.y > H + 30) {
      cf.items.splice(i, 1);
      continue;
    }
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.c;
    if (p.type === "rect") ctx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.66);
    else if (p.type === "circ") {
      ctx.beginPath();
      ctx.arc(0, 0, p.s * 0.42, 0, 6.283);
      ctx.fill();
    } else if (p.type === "heart") {
      drawHeartPath(ctx, 0, 0, p.s * 1.2, 0);
      ctx.fill();
    } else {
      ctx.strokeStyle = p.c;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-p.s * 0.6, 0);
      ctx.lineTo(p.s * 0.6, 0);
      ctx.moveTo(0, -p.s * 0.6);
      ctx.lineTo(0, p.s * 0.6);
      ctx.stroke();
    }
    ctx.restore();
  }
  if (cf.items.length) requestAnimationFrame(cfLoop);
  else {
    cf.running = false;
    ctx.clearRect(0, 0, W, H);
  }
}

export function confettiBurst(opts) {
  if (RM) return;
  opts = opts || {};
  const cv = cfCanvas();
  if (!cv || !cv.getContext) return;
  const W = cv.clientWidth || window.innerWidth;
  const H = cv.clientHeight || window.innerHeight;
  const n = opts.n || 90;
  const cx = opts.x != null ? opts.x : W / 2;
  const cy = opts.y != null ? opts.y : H * 0.42;
  const spread = opts.spread || 5.2;
  for (let i = 0; i < n; i++) {
    const ang = rand(-Math.PI, 0) + (opts.aim || 0);
    const sp = rand(2.5, spread);
    cf.items.push(cfPiece(cx + rand(-14, 14), cy + rand(-10, 10), Math.cos(ang) * sp, Math.sin(ang) * sp - rand(1, 3)));
  }
  cfRun();
}

export function confettiCannons() {
  if (RM) return;
  const cv = cfCanvas();
  if (!cv) return;
  const W = cv.clientWidth || window.innerWidth;
  const H = cv.clientHeight || window.innerHeight;
  confettiBurst({ x: W * 0.12, y: H * 0.95, n: 70, spread: 8.5, aim: -Math.PI / 3.4 });
  confettiBurst({ x: W * 0.88, y: H * 0.95, n: 70, spread: 8.5, aim: -Math.PI + Math.PI / 3.4 });
  confettiBurst({ n: 110 });
}

export function confettiRain(ms) {
  if (RM) return;
  const cv = cfCanvas();
  if (!cv) return;
  const W = cv.clientWidth || window.innerWidth;
  cf.rains++;
  const rains = cf.rains;
  const end = performance.now() + (ms || 1500);
  (function tick(now) {
    if (rains !== cf.rains || now > end) return;
    for (let i = 0; i < 5; i++) cf.items.push(cfPiece(rand(0, W), -14, rand(-0.6, 0.6), rand(0.5, 2)));
    cfRun();
    requestAnimationFrame(tick);
  })(performance.now());
}

export function heartsRain() {
  if (RM) return;
  const cv = cfCanvas();
  if (!cv) return;
  const W = cv.clientWidth || window.innerWidth;
  for (let i = 0; i < 26; i++) {
    const p = cfPiece(rand(0, W), -20, rand(-0.3, 0.3), rand(0.6, 1.6));
    p.type = "heart";
    p.s = rand(8, 16);
    p.ttl = 3200;
    cf.items.push(p);
  }
  cfRun();
}
