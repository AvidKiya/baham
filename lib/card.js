// ---------------------------------------------------------------------------
// lib/card.js — paints the final shareable 1080×1080 card on a canvas.
// Persian text, Jalali date, theme colors, downloadable PNG.
// ---------------------------------------------------------------------------
import { drawHeartPath, palette, rand } from "./fx";

function rr(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

/**
 * paintCard({ canvas, cfg, name, state }) — paints and calls cb(canvas)
 * after fonts settle (repaints once for correct Vazirmatn shaping).
 */
export function paintCard(cb, opts) {
  const { cfg, name, state } = opts;
  const W = 1080,
    H = 1080;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const c = cv.getContext && cv.getContext("2d");
  if (!c) {
    cb(null);
    return;
  }
  const t = (k, d) => {
    let o = cfg && cfg.text;
    for (const p of k.split(".")) {
      if (o == null) break;
      o = o[p];
    }
    return o === undefined || o === null || o === "" ? d : o;
  };
  const pal = palette();

  function paint() {
    c.clearRect(0, 0, W, H);
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#180b2e");
    g.addColorStop(1, "#0b0715");
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    const rg = c.createRadialGradient(W * 0.5, H * 0.24, 40, W * 0.5, H * 0.24, W * 0.75);
    rg.addColorStop(0, "rgba(" + pal.rgb.join(",") + ",0.30)");
    rg.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = rg;
    c.fillRect(0, 0, W, H);
    const rg2 = c.createRadialGradient(W * 0.18, H * 0.86, 30, W * 0.18, H * 0.86, W * 0.6);
    rg2.addColorStop(0, "rgba(" + pal.rgb2.join(",") + ",0.20)");
    rg2.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = rg2;
    c.fillRect(0, 0, W, H);

    const seeds = [
      [0.1, 0.09, 26],
      [0.91, 0.13, 20],
      [0.07, 0.5, 16],
      [0.95, 0.58, 24],
      [0.14, 0.92, 20],
      [0.88, 0.9, 16],
      [0.5, 0.045, 13],
    ];
    for (let i = 0; i < seeds.length; i++) {
      c.globalAlpha = 0.5;
      c.fillStyle = i % 2 ? "rgba(" + pal.rgb.join(",") + ",0.6)" : "rgba(" + pal.rgb2.join(",") + ",0.55)";
      drawHeartPath(c, W * seeds[i][0], H * seeds[i][1], seeds[i][2], 0.3);
      c.fill();
    }
    c.globalAlpha = 1;

    const cx = 90,
      cy = 210,
      cw = W - 180,
      ch = H - 420;
    c.save();
    rr(c, cx, cy, cw, ch, 56);
    c.fillStyle = "rgba(255,255,255,0.05)";
    c.fill();
    c.lineWidth = 2;
    c.strokeStyle = "rgba(255,255,255,0.16)";
    c.stroke();
    c.restore();

    const font = (w, s) => w + " " + s + "px Vazirmatn, Vazir, Tahoma, sans-serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    try {
      c.direction = "rtl";
    } catch (e) {}

    const title = t("finalTitle", "قرارمون ثبت شد ❤️").replace(/\s*❤️\s*/g, "").trim();
    c.fillStyle = "rgba(255,235,248,0.85)";
    c.font = font(400, 34);
    c.fillText(title, W / 2, cy + 84);
    const tw = c.measureText(title).width;
    c.fillStyle = "rgb(" + pal.rgb.join(",") + ")";
    drawHeartPath(c, W / 2 + tw / 2 + 30, cy + 76, 24, 0);
    c.fill();

    c.fillStyle = "#ffffff";
    c.font = font(700, 96);
    c.fillText(name || "تو", W / 2, cy + 214);
    c.fillStyle = "rgb(" + pal.rgb.join(",") + ")";
    c.font = font(700, 46);
    c.fillText(t("finalSaid", "رسماً گفت آره!"), W / 2, cy + 316);

    c.strokeStyle = "rgba(255,255,255,0.18)";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(cx + 120, cy + 382);
    c.lineTo(cx + cw - 120, cy + 382);
    c.stroke();

    const row = (y, label, val) => {
      c.fillStyle = "rgba(255,235,248,0.62)";
      c.font = font(400, 30);
      c.fillText(label, W / 2, y);
      c.fillStyle = "#ffffff";
      c.font = font(700, 44);
      c.fillText(val, W / 2, y + 62);
    };
    row(cy + 456, t("finalDateRow", "اولین قرارمون"), state.dateLabel || "—");
    row(cy + 596, t("finalWhenRow", "کِی"), (state.whenLabel || "—") + (state.timeLabel ? " · " + state.timeLabel : ""));

    let dateStr = "";
    try {
      dateStr = new Intl.DateTimeFormat("fa-IR", { dateStyle: "long" }).format(new Date());
    } catch (e) {}
    c.fillStyle = "rgba(255,235,248,0.5)";
    c.font = font(400, 26);
    const sender = cfg && cfg.senderName ? "با عشق، " + String(cfg.senderName).slice(0, 24) + " · " : "";
    c.fillText(sender + dateStr, W / 2, cy + ch - 46);

    c.fillStyle = "rgb(" + pal.rgb.join(",") + ")";
    drawHeartPath(c, W / 2, cy + ch - 116, 28, 0);
    c.fill();

    c.fillStyle = "rgba(255,235,248,0.55)";
    c.font = font(400, 28);
    c.fillText(t("finalNote", "حالا فقط مونده یه روز خوب براش پیدا کنیم 😌").replace(/\s*😌\s*/g, "").trim(), W / 2, H - 128);
  }

  paint();
  if (document.fonts && document.fonts.ready) {
    Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1200))])
      .then(() => {
        paint();
        cb(cv);
      })
      .catch(() => cb(cv));
  } else {
    cb(cv);
  }
}

export function cardBlob(cb, opts) {
  paintCard((cv) => {
    if (!cv || !cv.toBlob) {
      cb(null);
      return;
    }
    try {
      cv.toBlob((b) => cb(b), "image/png");
    } catch (e) {
      cb(null);
    }
  }, opts);
}
