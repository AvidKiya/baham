"use client";
// ---------------------------------------------------------------------------
// InvitePage.jsx — تجربه‌ی دعوت‌نامه (/invite و /demo).
// کانفیگ از API (ویرایش ادمین) + اگر ?i=slug باشد: دعوت‌نامه‌ی شخصی حساب‌محور
// (اسم/تم/مناسبت/موزیک/سوال اختصاصی + شمارش بازدید + جعبه‌ی جواب).
// ---------------------------------------------------------------------------
import { useState, useEffect } from "react";
import { DEFAULT_CONFIG } from "../shared/config.mjs";
import { fetchConfig } from "@/lib/core";
import Experience from "@/components/Experience";
import DevPanel from "@/components/DevPanel";

export default function InvitePage({ mode = "invite" }) {
  const [cfg, setCfg] = useState(null);
  const demo = mode === "demo";

  useEffect(() => {
    document.body.dataset.mode = "invite";
    let done = false;
    const finish = async (c) => {
      if (done) return;
      done = true;
      let base = c || DEFAULT_CONFIG;
      // دعوت‌نامه‌ی شخصی؟
      try {
        const slug = (new URLSearchParams(location.search).get("i") || "").trim();
        if (slug && /^[a-z0-9-]{4,20}$/.test(slug)) {
          const r = await fetch("/api/i/" + slug, { headers: { "cache-control": "no-cache" } }).catch(() => null);
          const j = r ? await r.json().catch(() => null) : null;
          if (j && j.ok && j.invite) {
            const inv = j.invite;
            base = { ...base };
            if (inv.tg) base.replyTo = { ...(base.replyTo || {}), telegram: inv.tg };
            if (inv.name) base.recipientName = inv.name;
            if (inv.theme) base.theme = inv.theme;
            if (inv.music === "none") base.music = "";
            if (inv.occasion) {
              // مناسبت از URL خوانده می‌شود؛ اضافه‌اش می‌کنیم تا کل جریان (شعر/قرارداد/...) همان باشد
              try {
                const u = new URL(location.href);
                if (!u.searchParams.get("occasion")) {
                  u.searchParams.set("occasion", inv.occasion);
                  history.replaceState({}, "", u.pathname + "?" + u.searchParams.toString());
                }
              } catch {}
            }
            // متن اختصاصی سوال و نامه‌ی پایانی → داخل pack مناسبت تزریق می‌شود
            if (inv.qText || inv.letter) {
              const occs = (base.occasions || []).map((o) => ({ ...o, pack: { ...(o.pack || {}) } }));
              const oi = occs.findIndex((o) => o.id === (inv.occasion || (base.defaultOccasion || "love")));
              if (oi >= 0) {
                if (inv.qText) occs[oi].pack.question = inv.qText;
                if (inv.letter) occs[oi].pack.finalNote = inv.letter;
              }
              base.occasions = occs;
            }
            base._inv = { slug };
          }
        }
        // ثبت بازدید (یک‌بار در هر نشست)
        const slug2 = (new URLSearchParams(location.search).get("i") || "").trim();
        if (slug2 && /^[a-z0-9-]{4,20}$/.test(slug2)) {
          const k = "rol:iv:" + slug2;
          if (!sessionStorage.getItem(k)) {
            try { sessionStorage.setItem(k, "1"); } catch {}
            fetch("/api/i/" + slug2 + "/view", { method: "POST" }).catch(() => {});
          }
        }
      } catch {}
      // آیدی تلگرامِ سازنده‌ی لینک (لینک سریع): ?reply=username
      try {
        const rp = (new URLSearchParams(location.search).get("reply") || "").trim();
        if (rp && /^[A-Za-z0-9_]{4,32}$/.test(rp)) base = { ...base, replyTo: { ...(base.replyTo || {}), telegram: rp } };
      } catch {}
      setCfg(base);
    };
    const ctrl = new AbortController();
    const timer = setTimeout(() => finish(null), 1500); // never hang the experience
    fetchConfig(ctrl.signal).then((c) => {
      clearTimeout(timer);
      finish(c);
    });
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, []);

  if (!cfg) {
    return (
      <>
        <div className="bg" aria-hidden="true">
          <div className="blob b1"></div>
          <div className="blob b2"></div>
        </div>
        <div className="splash" role="status" aria-label="در حال بارگذاری">
          <div className="splash-heart" aria-hidden="true" />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="bg" aria-hidden="true">
        <div className="blob b1"></div>
        <div className="blob b2"></div>
        <div className="blob b3"></div>
      </div>
      <div className="grain" aria-hidden="true"></div>
      <div className="vignette" aria-hidden="true"></div>
      <div className="phone-shell">
        <div className="phone">
          <Experience config={cfg} mode="invite" />
        </div>
      </div>
      {demo ? <DevPanel /> : null}
    </>
  );
}
