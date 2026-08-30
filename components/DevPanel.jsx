"use client";
// ---------------------------------------------------------------------------
// DevPanel.jsx — developer console, only rendered on /demo. Controls the
// running experience through window.__app (exposed by Experience).
// ---------------------------------------------------------------------------
import { useState } from "react";

export default function DevPanel() {
  const [open, setOpen] = useState(false);
  const btn = (label, fn) => ({ label, fn });
  const items = [
    btn("شروع دوباره", () => window.__app && window.__app.reset()),
    btn("→ سؤال", () => window.__app && window.__app.go("question")),
    btn("→ بله", () => window.__app && window.__app.forceYes()),
    btn("→ نه واقعی", () => window.__app && window.__app.forceNo()),
    btn("کانفتی", () => window.__app && window.__app.confetti()),
    btn("بارون قلب", () => window.__app && window.__app.hearts()),
    btn("استیکرها", () => window.__app && window.__app.stickers()),
    btn("موسیقی", () => window.__app && window.__app.music()),
    btn("قالب موبایل", () => document.documentElement.classList.toggle("force-mobile")),
    btn("پاک‌کردن حافظه", () => {
      try {
        Object.keys(localStorage)
          .filter((k) => k.startsWith("rol:"))
          .forEach((k) => localStorage.removeItem(k));
        alert("localStorage پاک شد — رفرش کن");
      } catch (e) {}
    }),
  ];
  return (
    <div id="demoPanel" className={open ? "open" : ""}>
      <div className="dp-head" role="button" tabIndex={0} onClick={() => setOpen((o) => !o)} onKeyDown={(e) => e.key === "Enter" && setOpen((o) => !o)}>
        DEV ▲
      </div>
      <div className="dp-body">
        {items.map((it) => (
          <button className="dp-btn" key={it.label} type="button" onClick={it.fn}>
            {it.label}
          </button>
        ))}
      </div>
    </div>
  );
}
