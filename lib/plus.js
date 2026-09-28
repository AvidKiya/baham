// ---------------------------------------------------------------------------
// lib/plus.js — باهم پلاس 💎 (v9): وضعیت، کد فعال‌سازی، خرید زرین‌پال
// ---------------------------------------------------------------------------
"use client";
import { api, getToken } from "./appauth";

let cache = null, cacheTs = 0;
export async function plusStatus(force) {
  const now = Date.now();
  if (!force && cache && now - cacheTs < 5 * 60 * 1000) return cache;
  const d = { plus: false, until: 0 };
  if (getToken()) {
    try {
      const r = await api("/api/plus");
      if (r && r.ok && r.data) { d.plus = !!r.data.plus; d.until = Number(r.data.until) || 0; }
    } catch {}
  }
  cache = d; cacheTs = now;
  return d;
}
export const clearPlusCache = () => { cache = null; cacheTs = 0; };
export const plusLeftDays = (until) => {
  if (!until || until <= Date.now()) return 0;
  return Math.ceil((until - Date.now()) / 86400000);
};
export async function plusRedeem(code) {
  const c = String(code || "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
  if (c.length < 6) return { ok: false, msg: "کد رو کامل بنویس 🔑" };
  try {
    const r = await api("/api/plus/redeem", { method: "POST", body: { code: c } });
    clearPlusCache();
    if (r && r.ok && r.data && r.data.ok) return { ok: true, msg: "پلاس فعال شد! 💎🎉", until: r.data.until };
    return { ok: false, msg: (r && r.data && r.data.message) || "کد قبول نشد؛ دوباره چک کن" };
  } catch {
    return { ok: false, msg: "اینترنت رو چک کن و دوباره بزن 📡" };
  }
}
export async function plusPay(months) {
  const m = months === 12 ? 12 : 1;
  try {
    const r = await api("/api/plus/pay", { method: "POST", body: { months: m } });
    if (r && r.ok && r.data && r.data.url) return { ok: true, url: r.data.url };
    return { ok: false, msg: (r && r.data && r.data.message) || "فعلاً خرید آنلاین فعال نیست؛ از کد فعال‌سازی استفاده کن 🎟" };
  } catch {
    return { ok: false, msg: "اینترنت رو چک کن و دوباره بزن 📡" };
  }
}
export async function plusVerify(authority, status) {
  try {
    const r = await api("/api/plus/verify", { method: "POST", body: { authority, status } });
    clearPlusCache();
    if (r && r.ok && r.data && r.data.ok) return { ok: true, msg: "پرداخت تأیید شد؛ پلاس فعاله! 💎🎉", until: r.data.until, ref: r.data.ref };
    return { ok: false, msg: (r && r.data && r.data.message) || "پرداخت تأیید نشد" };
  } catch {
    return { ok: false, msg: "اینترنت رو چک کن و دوباره بزن 📡" };
  }
}
