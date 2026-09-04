// sw.js — سرویس‌ورکر سبک مخ‌یار v5: کش هسته (فونت + آیکون‌ها) برای آفلاین/نصب PWA
const VER = "mokhyar-v2";
const CORE = ["/", "/fonts/Vazirmatn-var.woff2", "/assets/icon-192.png", "/assets/icon-512.png", "/site.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VER).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()).catch(() => {}));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VER).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  if (url.pathname.startsWith("/api/")) return; // API همیشه آنلاین
  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/fonts/") || url.pathname.startsWith("/_next/static/")) {
    // فونت/آیکون/چانک‌ها: اول کش
    e.respondWith(
      caches.match(e.request).then((hit) =>
        hit ||
        fetch(e.request).then((res) => {
          const copy = res.clone();
          caches.open(VER).then((c) => c.put(e.request, copy)).catch(() => {});
          return res;
        })
      )
    );
    return;
  }
  // صفحات: اول شبکه، در خطا کش
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(VER).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request).then((hit) => hit || caches.match("/")))
  );
});
