// ---------------------------------------------------------------------------
// lib/card.js — paints the shareable story card (1080×1350) on canvas.
// v2: richer liquid-glass design · happy-heart sticker · gradient name ·
// glass info panel · Jalali date · creator credit (@AvidKiya).
// ---------------------------------------------------------------------------
import { drawHeartPath, palette } from "./fx";

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

function stripEmoji(s) {
  return String(s || "").replace(/[\u{1F000}-\u{1FAFF}\u{2190}-\u{27BF}\u{FE0F}\u{20E3}]/gu, "").replace(/\s+/g, " ").trim();
}

function loadSticker(url) {
  return new Promise((resolve) => {
    const im = new Image();
    let done = false;
    const finish = (ok) => { if (!done) { done = true; resolve(ok ? im : null); } };
    im.onload = () => finish(true);
    im.onerror = () => finish(false);
    im.src = url;
    setTimeout(() => finish(false), 1400);
  });
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
  const ACC = "rgb(" + pal.rgb.join(",") + ")";
  const creator = (cfg && cfg.creator) || {};

  function paint(sticker) {
    c.clearRect(0, 0, W, H);
    // ---- background
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#1b0d33");
    g.addColorStop(0.55, "#120826");
    g.addColorStop(1, "#0b0715");
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    const rg = c.createRadialGradient(W * 0.5, H * 0.16, 40, W * 0.5, H * 0.16, W * 0.85);
    rg.addColorStop(0, "rgba(" + pal.rgb.join(",") + ",0.34)");
    rg.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = rg;
    c.fillRect(0, 0, W, H);
    const rg2 = c.createRadialGradient(W * 0.12, H * 0.92, 30, W * 0.12, H * 0.92, W * 0.7);
    rg2.addColorStop(0, "rgba(" + pal.rgb2.join(",") + ",0.26)");
    rg2.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = rg2;
    c.fillRect(0, 0, W, H);

    // scattered hearts + stars
    const hearts = [[0.09, 0.07, 30], [0.92, 0.1, 24], [0.06, 0.34, 18], [0.95, 0.38, 22], [0.1, 0.66, 20], [0.91, 0.72, 16], [0.5, 0.035, 14], [0.14, 0.93, 16], [0.88, 0.95, 13]];
    for (let i = 0; i < hearts.length; i++) {
      c.globalAlpha = 0.5;
      c.fillStyle = i % 2 ? "rgba(" + pal.rgb.join(",") + ",0.65)" : "rgba(" + pal.rgb2.join(",") + ",0.6)";
      drawHeartPath(c, W * hearts[i][0], H * hearts[i][1], hearts[i][2], 0.35);
      c.fill();
    }
    c.globalAlpha = 0.8;
    c.fillStyle = "rgba(255,240,252,0.75)";
    for (let i = 0; i < 26; i++) {
      const sx = (i * 173.3) % W, sy = (i * 331.7) % H;
      if (Math.abs(sx - W / 2) < 330 && sy > H * 0.1 && sy < H * 0.62) continue;
      c.globalAlpha = 0.15 + ((i * 37) % 40) / 100;
      c.beginPath();
      c.arc(sx, sy, 1.6 + (i % 3), 0, 6.283);
      c.fill();
    }
    c.globalAlpha = 1;

    // ---- top badge pill
    const badge = stripEmoji(t("finalTitle", "قرارمون ثبت شد"));
    c.font = "700 40px Vazirmatn, Vazir, Tahoma, sans-serif";
    const bw = c.measureText(badge).width + 150;
    const bx = (W - bw) / 2, by = 92;
    rr(c, bx, by, bw, 92, 46);
    c.fillStyle = "rgba(" + pal.rgb.join(",") + ",0.14)";
    c.fill();
    c.lineWidth = 2.5;
    c.strokeStyle = "rgba(" + pal.rgb.join(",") + ",0.55)";
    c.stroke();
    c.textAlign = "center";
    c.textBaseline = "middle";
    try { c.direction = "rtl"; } catch (e) {}
    c.fillStyle = "#ffd7ea";
    c.fillText(badge, W / 2 + 18, by + 48);
    c.fillStyle = ACC;
    drawHeartPath(c, W / 2 - bw / 2 + 62, by + 44, 30, 0.15);
    c.fill();

    // ---- sticker
    const stY = 250, stSize = 320;
    if (sticker && sticker.width) {
      try { c.drawImage(sticker, (W - stSize) / 2, stY, stSize, stSize); } catch (e) {}
    } else {
      // graceful fallback: big glossy heart
      const cg = c.createLinearGradient(W / 2 - 140, 0, W / 2 + 140, 0);
      cg.addColorStop(0, "rgb(" + pal.rgb.join(",") + ")");
      cg.addColorStop(1, "rgb(" + pal.rgb2.join(",") + ")");
      c.fillStyle = cg;
      drawHeartPath(c, W / 2, stY + stSize / 2 + 10, 250, 0);
      c.fill();
    }

    // ---- name with gradient
    const nm = (name || "تو").slice(0, 24);
    c.font = "700 104px Vazirmatn, Vazir, Tahoma, sans-serif";
    const ng = c.createLinearGradient(W / 2 - 260, 0, W / 2 + 260, 0);
    ng.addColorStop(0, "#ffffff");
    ng.addColorStop(1, "rgb(" + pal.rgb.join(",") + ")");
    c.fillStyle = ng;
    c.fillText(nm, W / 2, 672);
    c.fillStyle = ACC;
    drawHeartPath(c, W / 2 + c.measureText(nm).width / 2 + 46, 648, 38, 0.1);
    c.fill();

    // ---- said pill
    const said = stripEmoji(t("finalSaid", "رسماً گفت آره!"));
    c.font = "700 48px Vazirmatn, Vazir, Tahoma, sans-serif";
    const sw = c.measureText(said).width + 130;
    rr(c, (W - sw) / 2, 748, sw, 98, 49);
    const pg = c.createLinearGradient((W - sw) / 2, 0, (W + sw) / 2, 0);
    pg.addColorStop(0, "rgba(" + pal.rgb.join(",") + ",0.92)");
    pg.addColorStop(1, "rgba(" + pal.rgb2.join(",") + ",0.92)");
    c.fillStyle = pg;
    c.fill();
    c.fillStyle = "#ffffff";
    c.fillText(said, W / 2, 799);

    // ---- glass info panel
    const px = 110, py = 906, pw = W - 220, ph = 300;
    c.save();
    rr(c, px, py, pw, ph, 48);
    c.fillStyle = "rgba(255,255,255,0.055)";
    c.fill();
    c.lineWidth = 2.5;
    c.strokeStyle = "rgba(255,255,255,0.18)";
    c.stroke();
    // top sheen
    c.save();
    rr(c, px, py, pw, ph, 48);
    c.clip();
    const sheen = c.createLinearGradient(px, py, px + pw * 0.7, py + ph * 0.5);
    sheen.addColorStop(0, "rgba(255,255,255,0.09)");
    sheen.addColorStop(0.4, "rgba(255,255,255,0.02)");
    sheen.addColorStop(0.41, "rgba(255,255,255,0)");
    c.fillStyle = sheen;
    c.fillRect(px, py, pw, ph);
    c.restore();
    c.restore();

    const rowY = [py + 92, py + 208];
    const labels = [t("finalDateRow", "اولین قرارمون"), t("finalWhenRow", "کِی")];
    const vals = [stripEmoji(state.dateLabel) || "—", (stripEmoji(state.whenLabel) || "—") + (state.timeLabel ? " · " + stripEmoji(state.timeLabel) : "")];
    for (let i = 0; i < 2; i++) {
      // icon bubble
      c.save();
      c.beginPath();
      c.arc(px + pw - 74, rowY[i], 44, 0, 6.283);
      c.fillStyle = "rgba(" + pal.rgb.join(",") + ",0.16)";
      c.fill();
      c.lineWidth = 2;
      c.strokeStyle = "rgba(" + pal.rgb.join(",") + ",0.5)";
      c.stroke();
      c.fillStyle = ACC;
      if (i === 0) drawHeartPath(c, px + pw - 74, rowY[i] - 2, 34, 0.15);
      else {
        // crescent moon
        c.beginPath();
        c.arc(px + pw - 74, rowY[i], 18, 0.6, 5.2);
        c.arc(px + pw - 74 - 9, rowY[i] - 6, 15, 0.9, 4.6, true);
        c.fill();
      }
      c.fill();
      c.restore();
      // text (label right-aligned near icon, value left)
      c.textAlign = "right";
      c.fillStyle = "rgba(255,235,248,0.6)";
      c.font = "400 32px Vazirmatn, Vazir, Tahoma, sans-serif";
      c.fillText(labels[i], px + pw - 150, rowY[i] - 22);
      c.fillStyle = "#ffffff";
      c.font = "700 52px Vazirmatn, Vazir, Tahoma, sans-serif";
      c.fillText(vals[i], px + pw - 150, rowY[i] + 38);
      c.textAlign = "center";
    }
    // divider
    c.strokeStyle = "rgba(255,255,255,0.14)";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(px + 70, py + 150);
    c.lineTo(px + pw - 70, py + 150);
    c.stroke();

    // ---- note
    const note = stripEmoji(t("finalNote", "حالا فقط مونده یه روز خوب براش پیدا کنیم"));
    c.fillStyle = "rgba(255,235,248,0.72)";
    c.font = "400 34px Vazirmatn, Vazir, Tahoma, sans-serif";
    c.fillText(note, W / 2, py + ph + 90);

    // ---- signature + credit
    let dateStr = "";
    try { dateStr = new Intl.DateTimeFormat("fa-IR", { dateStyle: "long" }).format(new Date()); } catch (e) {}
    const sender = cfg && cfg.senderName ? "با عشق، " + String(cfg.senderName).slice(0, 24) : "";
    c.fillStyle = "rgba(255,235,248,0.62)";
    c.font = "400 32px Vazirmatn, Vazir, Tahoma, sans-serif";
    c.fillText((sender ? sender + " · " : "") + dateStr, W / 2, H - 118);
    // credit line
    const cred = (creator.username || "@AvidKiya") + "  ·  " + (creator.fa || "اَوید کیا");
    c.fillStyle = "rgba(255,215,235,0.8)";
    c.font = "700 30px Vazirmatn, Vazir, Tahoma, sans-serif";
    c.fillText(cred, W / 2, H - 62);
    // tiny hearts flanking credit
    c.fillStyle = ACC;
    drawHeartPath(c, W / 2 - 178, H - 64, 18, 0);
    c.fill();
    drawHeartPath(c, W / 2 + 178, H - 64, 18, 0);
    c.fill();
  }

  const fontsReady = document.fonts && document.fonts.ready
    ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1200))])
    : Promise.resolve();
  const stickerUrl = (cfg && cfg.assets && cfg.assets.happy) || "/assets/stickers/happy.webp";
  Promise.all([fontsReady, loadSticker(stickerUrl)]).then(([f, sticker]) => {
    paint(sticker);
    cb(cv);
  }).catch(() => { paint(null); cb(cv); });
}

export function cardBlob(cb, opts) {
  paintCard((cv) => {
    if (!cv || !cv.toBlob) { cb(null); return; }
    try { cv.toBlob((b) => cb(b), "image/png"); }
    catch (e) { cb(null); }
  }, opts);
}
