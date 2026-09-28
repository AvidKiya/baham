// sw.js — سرویس‌ورکر باهم v8.1: کش هوشمند + آفلاین کامل + آماده‌ی آپدیت
const VER = "baham-v2";
const CORE = ["/", "/fonts/Vazirmatn-var.woff2", "/assets/icon-192.png", "/assets/icon-512.png", "/site.webmanifest"];
const MAX_RUNTIME = 120; // سقف آیتم‌های کش زمان‌اجرا

async function trimCache() {
  try {
    const c = await caches.open(VER);
    const keys = await c.keys();
    if (keys.length > MAX_RUNTIME + CORE.length) {
      for (const k of keys.slice(0, keys.length - MAX_RUNTIME - CORE.length)) {
        const url = new URL(k.url);
        if (!CORE.includes(url.pathname)) await c.delete(k);
      }
    }
  } catch {}
}

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VER).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()).catch(() => {}));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VER).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

// پیام از کلاینت (مثلاً رد شدن دستی آپدیت)
self.addEventListener("message", (e) => {
  if (e && e.data && e.data.type === "SKIP_UPDATE") self.skipWaiting();
});

// وب‌پوش (v8.2): tickle بدون محتوا — فقط بیدارباش
self.addEventListener("push", (e) => {
  e.waitUntil((async () => {
    try {
      await self.registration.showNotification("باهم \u0001f491", {
        body: "\u06cc\u0647 \u062e\u0628\u0631 \u062a\u0627\u0632\u0647 \u062a\u0648 \u0641\u0636\u0627\u06cc \u0634\u0645\u0627\u0633\u062a \u0001f440",
        icon: "/assets/icon-192.png",
        badge: "/assets/icon-192.png",
        dir: "rtl",
        lang: "fa",
        tag: "baham-space",
        renotify: true,
        data: { url: "/?tab=space&view=chat" },
      });
    } catch {}
  })());
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/?tab=space";
  e.waitUntil((async () => {
    try {
      const wins = await clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const w of wins) {
        try {
          const u = new URL(w.url);
          if (u.origin === location.origin) {
            await w.focus();
            try { await w.navigate(url); } catch {}
            return;
          }
        } catch {}
      }
      await clients.openWindow(url);
    } catch {}
  })());
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  if (url.pathname.startsWith("/api/")) return; // API همیشه آنلاین
  // فونت/آیکون/چانک‌ها: اول کش (stale-while-revalidate سبک)
  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/fonts/") || url.pathname.startsWith("/_next/static/")) {
    e.respondWith(
      caches.match(e.request).then((hit) => {
        const net = fetch(e.request).then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(VER).then((c) => c.put(e.request, copy)).then(trimCache).catch(() => {});
          }
          return res;
        }).catch(() => hit);
        return hit || net;
      })
    );
    return;
  }
  // صفحات و ناوبری: اول شبکه، در خطا کش (آفلاین واقعی)
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res && res.ok && e.request.method === "GET") {
          const copy = res.clone();
          caches.open(VER).then((c) => c.put(e.request, copy)).then(trimCache).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(e.request).then((hit) => hit || caches.match("/")))
  );
});
