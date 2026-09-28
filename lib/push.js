// ---------------------------------------------------------------------------
// lib/push.js — وب‌پوش واقعی (v8.2): اشتراک tickle برای پیام پارتنر
// سرور فقط «بیدارباش» خالی می‌فرسته؛ متن پیام هرگز تو اعلان نیست.
// ---------------------------------------------------------------------------
"use client";
import { api, getToken } from "./appauth";

export const pushSupported = () => {
  try {
    return ("serviceWorker" in navigator) && ("PushManager" in window) && ("Notification" in window);
  } catch { return false; }
};

const b64ToU8 = (s) => {
  s = String(s || "").replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

export async function pushStatus() {
  const st = { sup: pushSupported(), on: false, perm: "default" };
  try { st.perm = Notification.permission; } catch {}
  if (!st.sup) return st;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    st.on = !!sub;
  } catch {}
  return st;
}

export async function pushToggle(want) {
  if (!pushSupported()) return { ok: false, msg: "مرورگرت پوش رو پشتیبانی نمی‌کنه 😕" };
  if (!getToken()) return { ok: false, msg: "اول وارد حسابت شو 🔑" };
  try {
    if (!want) {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        try { await api("/api/push", { method: "POST", body: { unsub: sub.endpoint } }); } catch {}
        await sub.unsubscribe();
      }
      return { ok: true, msg: "اعلان خاموش شد 🔕" };
    }
    if (typeof Notification !== "undefined" && Notification.permission === "denied") {
      return { ok: false, msg: "دسترسی اعلان رو بسته بودی؛ از تنظیمات مرورگر بازش کن ⚙️" };
    }
    let perm = "granted";
    try { perm = await Notification.requestPermission(); } catch {}
    if (perm !== "granted") return { ok: false, msg: "بدون اجازه، اعلان نمیاد 😅" };
    const k = await api("/api/push/key");
    const vapid = k && k.data && k.data.key;
    if (!vapid) return { ok: false, msg: "سرور آماده نیست؛ بعداً دوباره بزن 🔄" };
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(vapid) });
    const r = await api("/api/push", { method: "POST", body: { sub: sub.toJSON() } });
    if (!r || !r.ok) return { ok: false, msg: "ثبت نشد؛ دوباره تلاش کن 🔄" };
    return { ok: true, msg: "روشن شد! پیام پارتنرت رو از دست نمی‌دی 🔔💞" };
  } catch {
    return { ok: false, msg: "خطا شد؛ دوباره تلاش کن 🔄" };
  }
}
