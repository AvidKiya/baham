"use client";
// ---------------------------------------------------------------------------
// app/share/ShareView.jsx — نمایش عمومی خاطره/کارت اشتراک‌گذاری‌شده (v9.1)
// ---------------------------------------------------------------------------
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

const faNum = (n) => { try { return Number(n).toLocaleString("fa-IR"); } catch { return n; } };

export default function ShareView() {
  const qp = useSearchParams();
  const slug = (qp.get("s") || "").slice(0, 16);
  const [st, setSt] = useState("loading"); // loading | ok | bad | gone
  const [share, setShare] = useState(null);

  useEffect(() => {
    if (!/^[a-z0-9]{8}$/.test(slug)) { setSt("bad"); return; }
    let on = true;
    fetch("/api/share/" + slug).then((r) => r.json()).then((j) => {
      if (!on) return;
      if (j && j.ok && j.share) { setShare(j.share); setSt("ok"); }
      else setSt("gone");
    }).catch(() => { if (on) setSt("gone"); });
    return () => { on = false; };
  }, [slug]);

  const days = (() => {
    try {
      if (!share || share.kind !== "card" || !share.data.since) return 0;
      return Math.max(0, Math.floor((Date.now() - new Date(share.data.since + "T12:00:00")) / 864e5));
    } catch { return 0; }
  })();

  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: "linear-gradient(160deg,#1c1533,#3b1d4e 60%,#5b2144)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "Vazirmatn,Tahoma,system-ui" }}>
      <div style={{ width: "100%", maxWidth: 440, background: "#fff", borderRadius: 24, padding: 28, textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,.4)" }}>
        {st === "loading" && <p style={{ color: "#888" }}>یه لحظه… 💑</p>}
        {st === "bad" && <p>لینک درست نیست 😕</p>}
        {st === "gone" && <><div style={{ fontSize: 48 }}>🥲</div><p>این اشتراک پیدا نشد یا منقضی شده.</p></>}
        {st === "ok" && share.kind === "memory" && (
          <>
            <div style={{ fontSize: 40 }}>📸</div>
            <h2 style={{ margin: "8px 0" }}>{share.data.title || "یه خاطره"}</h2>
            <p style={{ color: "#888", fontSize: 13 }}>{share.data.date || ""}{share.data.place ? " · 📍 " + share.data.place : ""}</p>
            {share.data.photo ? <img src={share.data.photo} alt="" style={{ width: "100%", borderRadius: 16, marginTop: 10 }} /> : null}
            {share.data.text ? <p style={{ lineHeight: 2, marginTop: 12, whiteSpace: "pre-wrap" }}>{share.data.text}</p> : null}
          </>
        )}
        {st === "ok" && share.kind === "card" && (
          <>
            <div style={{ fontSize: 52 }}>{share.data.emoji || "💑"}</div>
            <h2 style={{ margin: "8px 0" }}>{share.data.me || "من"} ❤️ {share.data.partner || "تو"}</h2>
            {days ? <p style={{ fontSize: 20, fontWeight: 900, color: "#e11d48" }}>{faNum(days)} روز با هم بودن 💞</p> : <p style={{ color: "#888" }}>تازه اول قصه‌ست ✨</p>}
          </>
        )}
        <a href="/" style={{ display: "inline-block", marginTop: 20, background: "linear-gradient(135deg,#ff4f8b,#a855f7)", color: "#fff", borderRadius: 99, padding: "10px 26px", textDecoration: "none", fontWeight: 800, fontSize: 14 }}>
          تو هم بیا تو باهم 💑
        </a>
      </div>
    </div>
  );
}
