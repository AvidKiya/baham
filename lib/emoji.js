"use client";
// ---------------------------------------------------------------------------
// lib/emoji.js — iPhone-style emoji system. Bundled Apple-look emoji images
// (public/assets/emoji/*.webp, generated) are swapped into every text via
// <EmoText>, so emojis look identical on Android/Windows too.
// ---------------------------------------------------------------------------
import { createElement, Fragment } from "react";
import { EMOJI_URL, EMOJI_CHARS } from "./emoji-assets";

const ESC = (s) => s.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&");
const RE = new RegExp("(" + EMOJI_CHARS.map(ESC).join("|") + ")", "gu");

/** split a string into text/emoji runs → [{t:"txt"} | {e:"❤️"}] */
export function emojiRuns(text) {
  if (!text) return [];
  const out = [];
  let last = 0;
  text.replace(RE, (m, _g, idx) => {
    if (idx > last) out.push({ t: text.slice(last, idx) });
    out.push({ e: m });
    last = idx + m.length;
    return m;
  });
  if (last < text.length) out.push({ t: text.slice(last) });
  return out;
}

export function EmoText({ text }) {
  if (text === undefined || text === null || text === "") return null;
  const runs = emojiRuns(String(text));
  if (!runs.length) return null;
  return createElement(
    Fragment,
    null,
    runs.map((r, i) =>
      r.e
        ? createElement("img", {
            key: i,
            className: "emj",
            src: EMOJI_URL[r.e],
            alt: r.e,
            draggable: false,
            "aria-hidden": true,
          })
        : createElement(Fragment, { key: i }, r.t)
    )
  );
}

/** preload images for emoji chars used in a set of strings (for canvas) */
export function collectEmojis(strings) {
  const set = new Set();
  for (const s of strings || []) {
    if (!s) continue;
    const m = String(s).match(RE);
    if (m) m.forEach((c) => set.add(c));
  }
  return [...set];
}

export function loadEmojiImages(chars) {
  return Promise.all(
    chars.map(
      (c) =>
        new Promise((res) => {
          const im = new Image();
          let done = false;
          const fin = (ok) => { if (!done) { done = true; res([c, ok ? im : null]); } };
          im.onload = () => fin(true);
          im.onerror = () => fin(false);
          im.src = EMOJI_URL[c];
          setTimeout(() => fin(false), 1200);
        })
    )
  ).then((pairs) => {
    const map = {};
    for (const [c, im] of pairs) if (im) map[c] = im;
    return map;
  });
}

/** emoji-aware canvas text: draws runs (text + emoji imgs), centered at x */
export function drawRunWithEmojis(c, text, cx, y, font, fillStyle, emojiMap, fontSize) {
  const runs = emojiRuns(text);
  if (!runs.length) return;
  c.font = font;
  const eSize = (fontSize || parseInt(font.match(/(\d+)px/) ? font.replace(/.*?(\d+)px.*/, "$1") : "32", 10)) * 1.12;
  let total = 0;
  const parts = runs.map((r) => {
    if (r.e) { total += eSize + eSize * 0.15; return { r, w: eSize + eSize * 0.15 }; }
    const w = c.measureText(r.t).width;
    total += w;
    return { r, w };
  });
  let x = cx - total / 2;
  const prev = c.fillStyle;
  c.fillStyle = fillStyle;
  c.textAlign = "left";
  c.textBaseline = "middle";
  for (const p of parts) {
    if (p.r.e) {
      const im = emojiMap[p.r.e];
      if (im) { try { c.drawImage(im, x, y - eSize * 0.55, eSize, eSize); } catch (e) {} }
      x += p.w;
    } else {
      c.fillText(p.r.t, x, y);
      x += p.w;
    }
  }
  c.fillStyle = prev;
  c.textAlign = "center";
}
