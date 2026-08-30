// ---------------------------------------------------------------------------
// lib/card.js — v3.2 shareable story card (1080×1350).
// Premium dark-romantic design: glow field, scattered native emoji, big
// sticker, gradient name, twin glass info cards, credit bar.
// ایموجی‌ها native و به‌صورت متن رسم می‌شوند — روی گوشی کاربر (آیفون/اندروید)
// همیشه درست و خوانا؛ فونت وزیرمتن هم قبل از رسم تضمینی لود می‌شود.
// ---------------------------------------------------------------------------
import { palette } from "./fx";

const W = 1080, H = 1350;

function rr(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function clean(s, n) {
  return String(s || "").replace(/\s+/g, " ").trim().slice(0, n || 40);
}

function firstEmoji(s) {
  const m = String(s || "").match(/(\p{Extended_Pictographic}|\u2764\uFE0F?)/u);
  return m ? m[0] : "❤️";
}

function loadImage(url) {
  return new Promise((resolve) => {
    const im = new Image();
    let done = false;
    const fin = (ok) => { if (!done) { done = true; resolve(ok ? im : null); } };
    im.onload = () => fin(true);
    im.onerror = () => fin(false);
    im.src = url;
    setTimeout(() => fin(false), 1600);
  });
}

/** یک نویسه/متن با ایموجیِ native، وسط‌چین و با چرخش اختیاری */
function glyph(c, ch, x, y, size, alpha, rot) {
  c.save();
  c.globalAlpha = alpha == null ? 1 : alpha;
  c.font = size + "px \"Apple Color Emoji\",\"Segoe UI Emoji\",\"Noto Color Emoji\",sans-serif";
  c.textAlign = "center";
  c.textBaseline = "middle";
  if (rot) {
    c.translate(x, y);
    c.rotate((rot * Math.PI) / 180);
    c.fillText(ch, 0, 0);
  } else {
    c.fillText(ch, x, y);
  }
  c.restore();
}

export function paintCard(cb, opts) {
  const { cfg, name, state } = opts;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const c = cv.getContext && cv.getContext("2d");
  if (!c) { cb(null); return; }
  const t = (k, d) => {
    let o = cfg && cfg.text;
    for (const p of k.split(".")) { if (o == null) break; o = o[p]; }
    return o === undefined || o === null || o === "" ? d : o;
  };
  const pal = palette();
  const A = pal.rgb.join(",");
  const A2 = pal.rgb2.join(",");
  const creator = (cfg && cfg.creator) || {};

  const badge = clean(t("finalTitle", "قرارمون ثبت شد ❤️"), 40);
  const said = clean(t("finalSaid", "رسماً گفت آره!"), 40);
  const note = clean(t("finalNote", "حالا فقط مونده یه روز خوب براش پیدا کنیم 😌"), 80);
  const dateVal = clean(state.dateLabel, 34) || "—";
  const whenVal = clean(state.whenLabel, 24) || "—";
  const timeVal = clean(state.timeLabel, 16);
  const dateIcon = firstEmoji(state.dateLabel);
  const nm = (name || "تو").slice(0, 24);

  Promise.all([
    document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]) : Promise.resolve(),
    loadImage((cfg && cfg.assets && cfg.assets.happy) || "/assets/stickers/happy.webp"),
  ]).then(([, sticker]) => {
    /* ---------- background ---------- */
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#1d0f36");
    g.addColorStop(0.5, "#130a27");
    g.addColorStop(1, "#0a0614");
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);

    const rgTop = c.createRadialGradient(W / 2, 250, 50, W / 2, 250, 720);
    rgTop.addColorStop(0, "rgba(" + A + ",0.38)");
    rgTop.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = rgTop;
    c.fillRect(0, 0, W, H);
    const rgL = c.createRadialGradient(120, H - 160, 30, 120, H - 160, 620);
    rgL.addColorStop(0, "rgba(" + A2 + ",0.30)");
    rgL.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = rgL;
    c.fillRect(0, 0, W, H);
    const vign = c.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.85);
    vign.addColorStop(0, "rgba(0,0,0,0)");
    vign.addColorStop(1, "rgba(3,1,8,0.55)");
    c.fillStyle = vign;
    c.fillRect(0, 0, W, H);

    /* ---------- scattered native emoji decor ---------- */
    const deco = [
      ["❤️", 0.085, 0.062, 56, 0.9, 12], ["✨", 0.9, 0.085, 44, 0.95, -10],
      ["❤️", 0.055, 0.35, 34, 0.55, -14], ["✨", 0.945, 0.33, 36, 0.6, 18],
      ["✨", 0.115, 0.62, 32, 0.5, 0], ["❤️", 0.9, 0.6, 30, 0.45, 20],
      ["✨", 0.5, 0.035, 30, 0.7, 0], ["❤️", 0.12, 0.9, 30, 0.4, -8], ["✨", 0.88, 0.93, 26, 0.4, 14],
    ];
    for (const [ch, fx, fy, size, alpha, rot] of deco) glyph(c, ch, W * fx, H * fy, size, alpha, rot);

    /* ---------- top badge pill ---------- */
    c.textAlign = "center";
    c.textBaseline = "middle";
    try { c.direction = "rtl"; } catch (e) {}
    c.font = "700 40px Vazirmatn, Vazir, Tahoma, sans-serif";
    const bw = c.measureText(badge).width + 170;
    const bx = (W - bw) / 2, by = 96;
    rr(c, bx, by, bw, 100, 50);
    c.fillStyle = "rgba(" + A + ",0.15)";
    c.fill();
    c.lineWidth = 2.5;
    c.strokeStyle = "rgba(" + A + ",0.55)";
    c.stroke();
    c.fillStyle = "#ffd9ec";
    c.fillText(badge, W / 2, by + 52);

    /* ---------- sticker with glow ---------- */
    const glow = c.createRadialGradient(W / 2, 425, 40, W / 2, 425, 300);
    glow.addColorStop(0, "rgba(" + A + ",0.22)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = glow;
    c.fillRect(W / 2 - 320, 100, 640, 660);
    const stS = 330;
    if (sticker && sticker.width) {
      try { c.drawImage(sticker, (W - stS) / 2, 262, stS, stS); } catch (e) {}
    } else {
      const hg = c.createLinearGradient(W / 2 - 130, 0, W / 2 + 130, 0);
      hg.addColorStop(0, "rgb(" + A + ")");
      hg.addColorStop(1, "rgb(" + A2 + ")");
      c.fillStyle = hg;
      c.save();
      c.translate(W / 2, 425);
      c.beginPath();
      c.moveTo(0, 120);
      c.bezierCurveTo(-150, 30, -130, -130, 0, -70);
      c.bezierCurveTo(130, -130, 150, 30, 0, 120);
      c.closePath();
      c.fill();
      c.restore();
    }

    /* ---------- name (gradient) + heart ---------- */
    c.font = "700 106px Vazirmatn, Vazir, Tahoma, sans-serif";
    const nw = c.measureText(nm).width;
    const ng = c.createLinearGradient(W / 2 - nw / 2, 0, W / 2 + nw / 2, 0);
    ng.addColorStop(0, "#ffffff");
    ng.addColorStop(1, "rgb(" + A + ")");
    const saved = c.fillStyle;
    c.fillStyle = ng;
    c.fillText(nm, W / 2 - 20, 700);
    c.fillStyle = saved;
    glyph(c, "❤️", W / 2 + nw / 2 + 46, 688, 64);

    /* ---------- said pill ---------- */
    c.font = "700 48px Vazirmatn, Vazir, Tahoma, sans-serif";
    const sw = c.measureText(said).width + 170;
    rr(c, (W - sw) / 2, 780, sw, 104, 52);
    const pg = c.createLinearGradient((W - sw) / 2, 0, (W + sw) / 2, 0);
    pg.addColorStop(0, "rgba(" + A + ",0.95)");
    pg.addColorStop(1, "rgba(" + A2 + ",0.95)");
    c.fillStyle = pg;
    c.fill();
    c.strokeStyle = "rgba(255,255,255,0.35)";
    c.lineWidth = 2;
    c.stroke();
    c.fillStyle = "#ffffff";
    c.fillText(said, W / 2, 834);

    /* ---------- twin glass info cards ---------- */
    const gy = 948, gh = 250, gap = 30;
    const cw2 = (W - 220 - gap) / 2;
    const whenTxt = timeVal ? whenVal + " · " + timeVal : whenVal;
    drawInfoCard(c, W - 110 - cw2, gy, cw2, gh, t("finalDateRow", "اولین قرارمون"), dateVal, dateIcon, A);
    drawInfoCard(c, 110, gy, cw2, gh, t("finalWhenRow", "کِی"), whenTxt, "🌙", A);

    /* ---------- note ---------- */
    c.font = "400 34px Vazirmatn, Vazir, Tahoma, sans-serif";
    c.fillStyle = "rgba(255,238,250,0.8)";
    c.fillText(note, W / 2, gy + gh + 86);

    /* ---------- signature + credit bar ---------- */
    let dateStr = "";
    try { dateStr = new Intl.DateTimeFormat("fa-IR", { dateStyle: "long" }).format(new Date()); } catch (e) {}
    const sender = cfg && cfg.senderName ? "با عشق، " + clean(cfg.senderName, 24) + " · " : "";
    const credit = (creator.username || "@AvidKiya") + " · " + (creator.fa || "اَوید کیا");
    c.font = "400 30px Vazirmatn, Vazir, Tahoma, sans-serif";
    c.fillStyle = "rgba(255,238,250,0.6)";
    c.fillText(sender + dateStr, W / 2, H - 128);
    // credit pill
    c.font = "700 30px Vazirmatn, Vazir, Tahoma, sans-serif";
    const crw = c.measureText(credit).width + 190;
    rr(c, (W - crw) / 2, H - 104, crw, 72, 36);
    c.fillStyle = "rgba(255,255,255,0.05)";
    c.fill();
    c.lineWidth = 2;
    c.strokeStyle = "rgba(" + A + ",0.4)";
    c.stroke();
    c.fillStyle = "rgb(" + A + ")";
    c.fillText(credit, W / 2, H - 67);
    glyph(c, "❤️", (W - crw) / 2 + 55, H - 68, 40);
    glyph(c, "❤️", (W + crw) / 2 - 55, H - 68, 40);

    cb(cv);
  }).catch(() => { cb(null); });
}

function drawInfoCard(c, x, y, w, h, label, value, icon, A) {
  c.save();
  rr(c, x, y, w, h, 44);
  c.fillStyle = "rgba(255,255,255,0.055)";
  c.fill();
  c.lineWidth = 2.5;
  c.strokeStyle = "rgba(255,255,255,0.17)";
  c.stroke();
  // sheen
  c.save();
  rr(c, x, y, w, h, 44);
  c.clip();
  const sh = c.createLinearGradient(x, y, x + w * 0.8, y + h * 0.6);
  sh.addColorStop(0, "rgba(255,255,255,0.10)");
  sh.addColorStop(0.45, "rgba(255,255,255,0.02)");
  sh.addColorStop(0.46, "rgba(255,255,255,0)");
  c.fillStyle = sh;
  c.fillRect(x, y, w, h);
  c.restore();
  // icon bubble + native emoji glyph
  const cx = x + w / 2, iy = y + 74;
  c.beginPath();
  c.arc(cx, iy, 44, 0, 6.283);
  c.fillStyle = "rgba(" + A + ",0.16)";
  c.fill();
  c.lineWidth = 2;
  c.strokeStyle = "rgba(" + A + ",0.5)";
  c.stroke();
  glyph(c, icon, cx, iy + 2, 52);
  // label + value
  c.textAlign = "center";
  c.textBaseline = "middle";
  try { c.direction = "rtl"; } catch (e) {}
  c.fillStyle = "rgba(255,235,248,0.62)";
  c.font = "400 30px Vazirmatn, Vazir, Tahoma, sans-serif";
  c.fillText(label, cx, y + 152);
  c.fillStyle = "#ffffff";
  c.font = "700 46px Vazirmatn, Vazir, Tahoma, sans-serif";
  const maxW = w - 50;
  let v = value;
  while (c.measureText(v).width > maxW && v.length > 3) v = v.slice(0, -2) + "…";
  c.fillText(v, cx, y + 202);
  c.restore();
}

export function cardBlob(cb, opts) {
  paintCard((cv) => {
    if (!cv || !cv.toBlob) { cb(null); return; }
    try { cv.toBlob((b) => cb(b), "image/png"); }
    catch (e) { cb(null); }
  }, opts);
}
