"use client";
// ---------------------------------------------------------------------------
// components/app/SpaceChat.jsx — چت خصوصی زوج (v8.1)
// متن + بارش قلب + لوکیشن (لحظه‌ای/زنده) + صف آفلاین + لقب + والپیپر
// ---------------------------------------------------------------------------
import { useState, useEffect, useRef, useCallback } from "react";
import { Ic } from "@/lib/icons";
import { buzz, heartsRain } from "@/lib/fx";
import { api } from "@/lib/appauth";
import { pullChat, pushChat, pushTyping, pairState, flushChatQ, pushLive, stopLive } from "@/lib/spaceSync";
import { LOVE_BURSTS, LOVE_NOTES, getCoupleProfile, WALLPAPERS, STICKER_PACKS, stickerBody } from "@/lib/couple";
import { plusStatus } from "@/lib/plus";
import CallView from "./CallView";

const agoFa = (ts) => {
  const m = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (m < 1) return "الان";
  if (m === 1) return "۱ دقیقه پیش";
  try { return m.toLocaleString("fa-IR") + " دقیقه پیش"; } catch { return m + " دقیقه پیش"; }
};
const getPos = () => new Promise((res, rej) => {
  try {
    if (!navigator.geolocation) return rej(new Error("no-geo"));
    navigator.geolocation.getCurrentPosition(
      (p) => res({ lat: p.coords.latitude, lng: p.coords.longitude }),
      rej,
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  } catch (e) { rej(e); }
});
const faSec = (s) => { try { return Number(s || 0).toLocaleString("fa-IR") + " ثانیه"; } catch { return (s || 0) + "s"; } };
const mapsUrl = (lat, lng) => "https://www.google.com/maps?q=" + lat + "," + lng;
const osmUrl = (lat, lng) => "https://www.openstreetmap.org/?mlat=" + lat + "&mlon=" + lng + "#map=16/" + lat + "/" + lng;

export default function SpaceChat({ user }) {
  const [pair, setPair] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [txt, setTxt] = useState("");
  const [peerTyping, setPeerTyping] = useState(false);
  const [peerLive, setPeerLive] = useState(null);
  const [myLive, setMyLive] = useState(0); // until
  const [liveMenu, setLiveMenu] = useState(false);
  const [invite, setInvite] = useState(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");
  const [showStk, setShowStk] = useState(false);
  const [stkPack, setStkPack] = useState("love");
  const [rec, setRec] = useState(null); // {kind,mr,stream,t0}
  const [recSec, setRecSec] = useState(0);
  const recTimer = useRef(null);
  const cancelRec = useRef(false);
  const vidPrev = useRef(null);
  const [callMode, setCallMode] = useState(null);
  const callModeRef = useRef(false);
  const [prof, setProf] = useState(() => getCoupleProfile());
  const boxRef = useRef(null);
  const lastTs = useRef(0);
  const seenRef = useRef(0);
  const holdTimer = useRef(null);
  const typeTimer = useRef(null);
  const liveTimer = useRef(null);
  const me = (user && user.id) || "";
  const pName = prof.partnerNick || prof.partner || (pair && pair.partner) || "پارتنر";

  useEffect(() => {
    let on = true;
    pairState(true).then((p) => { if (on) setPair(p); });
    try { setProf(getCoupleProfile()); } catch {}
    return () => { on = false; };
  }, []);

  const notify = useCallback((m, peerName) => {
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "granted" && m.uid !== me) {
        const body = m.burst ? "❤️ یه بارش قلب برات فرستاد" : m.loc ? "📍 لوکیشنش رو فرستاد" : m.sticker ? "💝 " + (stickerBody(m.sticker) || "یه استیکر برات فرستاد") : m.voice ? "🎙️ یه ویس برات فرستاد" : m.video ? "📹 یه ویدیو برات فرستاد" : (m.react ? m.react : String(m.text || "").slice(0, 60));
        new Notification("💑 " + (peerName || "پارتنرت"), { body });
      }
    } catch {}
  }, [me]);

  const mergeIncoming = useCallback((incoming) => {
    if (!incoming || !incoming.length) return [];
    let fresh = [];
    setMsgs((prev) => {
      const have = new Set(prev.map((m) => m.uid + ":" + m.ts));
      fresh = incoming.filter((m) => !have.has(m.uid + ":" + m.ts));
      return fresh.length ? prev.concat(fresh) : prev;
    });
    return fresh;
  }, []);

  const poll = useCallback(async () => {
    if (!pair || !pair.paired) return;
    // اول صف آفلاین را خالی کن
    try {
      const flushed = await flushChatQ();
      if (flushed && flushed.length) {
        const qids = new Set(flushed.map((f) => f.qid));
        setMsgs((prev) => prev.filter((m) => !(m.pending && qids.has(m.qid))).concat(flushed.map((f) => f.msg)));
        for (const f of flushed) {
          lastTs.current = Math.max(lastTs.current, f.msg.ts);
          seenRef.current = Math.max(seenRef.current, f.msg.ts);
        }
      }
    } catch {}
    const d = await pullChat(lastTs.current);
    if (!d) return;
    setPeerTyping(!!d.peerTyping);
    setPeerLive(d.peerLive || null);
    /* تماس ورودی */
    if (d.call && d.call.state === "ringing" && d.call.from !== me && !callModeRef.current) {
      callModeRef.current = true;
      setCallMode({ dir: "in", type: d.call.type || "audio" });
      try { buzz([50, 60, 50, 60, 120]); } catch {}
    }
    if (Array.isArray(d.msgs) && d.msgs.length) {
      const fresh = mergeIncoming(d.msgs);
      const last = d.msgs[d.msgs.length - 1];
      lastTs.current = Math.max(lastTs.current, last.ts);
      if (fresh.length) {
        const lastFresh = fresh[fresh.length - 1];
        if (lastFresh.uid !== me && lastFresh.ts > seenRef.current) {
          seenRef.current = lastFresh.ts;
          notify(lastFresh, d.partner);
          if (lastFresh.burst) { try { heartsRain(); buzz(20); } catch {} }
        } else {
          seenRef.current = Math.max(seenRef.current, lastFresh.ts);
        }
      } else {
        seenRef.current = Math.max(seenRef.current, last.ts);
      }
    }
  }, [pair, me, notify, mergeIncoming]);

  useEffect(() => {
    if (!pair || !pair.paired) return;
    lastTs.current = 0;
    setMsgs([]);
    poll();
    const t = setInterval(poll, 4000);
    const onOn = () => poll();
    window.addEventListener("online", onOn);
    return () => { clearInterval(t); window.removeEventListener("online", onOn); };
  }, [pair && pair.paired]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [msgs, peerTyping]);

  /* پاک‌سازی تایمر لوکیشن زنده */
  useEffect(() => () => { if (liveTimer.current) clearInterval(liveTimer.current); if (recTimer.current) clearInterval(recTimer.current); }, []);

  /* ارسال یکپارچه با پشتیبانی صف آفلاین */
  const sendMsg = async (payload, render) => {
    if (!pair || !pair.paired) return;
    const now = Date.now();
    setMsgs((p) => p.concat([{ uid: me, ts: now, ...render }]));
    lastTs.current = Math.max(lastTs.current, now);
    seenRef.current = Math.max(seenRef.current, now);
    const r = await pushChat(payload);
    if (r && r.msg) {
      setMsgs((p) => p.map((m) => (m.ts === now && m.uid === me && !m.qid ? r.msg : m)));
      lastTs.current = Math.max(lastTs.current, r.msg.ts);
      seenRef.current = Math.max(seenRef.current, r.msg.ts);
    } else if (r && r.queued) {
      setMsgs((p) => p.map((m) => (m.ts === now && m.uid === me ? { ...m, pending: true, qid: r.qid } : m)));
      setFlash("آفلاینی؛ پیام تو صف موند و خودش ارسال می‌شه 🕐");
      setTimeout(() => setFlash(""), 2500);
    }
  };

  const sendText = (text) => {
    const t = String(text || "").trim().slice(0, 500);
    if (!t) return;
    setTxt("");
    sendMsg({ text: t }, { text: t });
  };
  const sendReact = (emoji) => {
    try { buzz(8); } catch {}
    sendMsg({ react: emoji }, { text: "", react: emoji });
  };
  const sendBurst = () => {
    try { heartsRain(); buzz(25); } catch {}
    sendMsg({ burst: true }, { text: "", burst: true });
  };
  const sendLoc = async () => {
    setFlash("دارم لوکیشن رو می‌گیرم… 📍");
    try {
      const p = await getPos();
      setFlash("");
      sendMsg({ loc: p }, { text: "", loc: p });
    } catch {
      setFlash("نتونستم لوکیشن بگیرم؛ دسترسی مکانی رو چک کن");
      setTimeout(() => setFlash(""), 2600);
    }
  };

  /* لوکیشن زنده */
  const startLive = async (minutes) => {
    setLiveMenu(false);
    try {
      const p = await getPos();
      const until = Date.now() + minutes * 60000;
      const ok = await pushLive(p.lat, p.lng, until);
      if (!ok) { setFlash("ارسال نشد؛ دوباره امتحان کن"); return; }
      setMyLive(until);
      setFlash("اشتراک زنده فعال شد 🔴 (" + (minutes === 15 ? "۱۵ دقیقه" : "۱ ساعت") + ")");
      setTimeout(() => setFlash(""), 2500);
      if (liveTimer.current) clearInterval(liveTimer.current);
      liveTimer.current = setInterval(async () => {
        if (Date.now() >= until) {
          clearInterval(liveTimer.current);
          liveTimer.current = null;
          setMyLive(0);
          return;
        }
        try {
          const np = await getPos();
          await pushLive(np.lat, np.lng, until);
        } catch {}
      }, 45000);
    } catch {
      setFlash("نتونستم لوکیشن بگیرم؛ دسترسی مکانی رو چک کن");
      setTimeout(() => setFlash(""), 2600);
    }
  };
  const endLive = async () => {
    if (liveTimer.current) { clearInterval(liveTimer.current); liveTimer.current = null; }
    setMyLive(0);
    await stopLive();
    poll();
  };

  /* ضبط ویس/ویدیو (v9) */
  const clearRecTimer = () => { if (recTimer.current) { clearInterval(recTimer.current); recTimer.current = null; } };
  const startRec = async (kind) => {
    if (rec || !pair || !pair.paired) return;
    if (typeof navigator === "undefined" || !navigator.onLine) { setFlash("برای ویس/ویدیو باید آنلاین باشی 📡"); setTimeout(() => setFlash(""), 2200); return; }
    if (kind === "video") {
      try {
        const ps = await plusStatus();
        if (!ps.plus) { setFlash("پیام ویدیویی مخصوص باهم پلاسه 💎 (از تنظیمات فعالش کن)"); setTimeout(() => setFlash(""), 3200); return; }
      } catch {}
    }
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === "undefined") {
        setFlash("مرورگرت ضبط رو پشتیبانی نمی‌کنه 😕"); setTimeout(() => setFlash(""), 2200); return;
      }
      const stream = kind === "video"
        ? await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 480 }, facingMode: "user" }, audio: true })
        : await navigator.mediaDevices.getUserMedia({ audio: true });
      let mime = "";
      const cands = kind === "video"
        ? ["video/webm;codecs=vp9,opus", "video/webm", "video/mp4"]
        : ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
      for (const c of cands) { try { if (MediaRecorder.isTypeSupported(c)) { mime = c; break; } } catch {} }
      const mr = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), ...(kind === "video" ? { videoBitsPerSecond: 350000 } : { audioBitsPerSecond: 32000 }) });
      const chunks = [];
      const t0 = Date.now();
      mr.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
      mr.onstop = () => {
        clearRecTimer();
        try { stream.getTracks().forEach((t) => t.stop()); } catch {}
        setRec(null);
        if (cancelRec.current) { cancelRec.current = false; return; }
        const blob = new Blob(chunks, { type: (mime || (kind === "video" ? "video/webm" : "audio/webm")).split(";")[0] });
        const dur = Math.max(1, Math.round((Date.now() - t0) / 1000));
        const cap = kind === "video" ? 2500000 : 400000;
        if (!blob.size) { setFlash("چیزی ضبط نشد؛ دوباره بگیر"); setTimeout(() => setFlash(""), 2200); return; }
        if (blob.size > cap) { setFlash(kind === "video" ? "ویدیو سنگین شد؛ کوتاه‌تر بگیر (حداکثر ۳۰ ثانیه)" : "ویس سنگین شد؛ کوتاه‌تر بگیر"); setTimeout(() => setFlash(""), 2500); return; }
        const fr = new FileReader();
        fr.onload = () => {
          const url = String(fr.result || "");
          if (!url.startsWith("data:")) return;
          if (kind === "video") sendMsg({ video: url, vidur: dur }, { text: "", video: url, vidur: dur });
          else sendMsg({ voice: url, vdur: dur }, { text: "", voice: url, vdur: dur });
        };
        fr.readAsDataURL(blob);
      };
      mr.start(500);
      setRec({ kind, mr, stream, t0 });
      setRecSec(0);
      clearRecTimer();
      const max = kind === "video" ? 25 : 60;
      recTimer.current = setInterval(() => {
        const s = Math.round((Date.now() - t0) / 1000);
        setRecSec(s);
        if (s >= max) { try { mr.stop(); } catch {} }
      }, 500);
      if (kind === "video") setTimeout(() => { try { if (vidPrev.current) vidPrev.current.srcObject = stream; } catch {} }, 60);
    } catch {
      setFlash(kind === "video" ? "به دوربین/میکروفون دسترسی ندادی 🎥" : "به میکروفون دسترسی ندادی 🎙️");
      setTimeout(() => setFlash(""), 2500);
    }
  };
  const stopRec = (cancel) => {
    if (!rec) return;
    if (cancel) cancelRec.current = true;
    try { rec.mr.stop(); } catch { clearRecTimer(); try { rec.stream.getTracks().forEach((t) => t.stop()); } catch {} setRec(null); }
  };
  const sendSticker = (ref) => { setShowStk(false); sendMsg({ sticker: ref }, { text: "", sticker: ref }); };

  /* تماس (v9) */
  const startCall = async (type) => {
    if (callMode) return;
    if (type === "video") {
      try {
        const ps = await plusStatus();
        if (!ps.plus) { setFlash("تماس تصویری مخصوص باهم پلاسه 💎 (از تنظیمات فعالش کن)"); setTimeout(() => setFlash(""), 3200); return; }
      } catch {}
    }
    callModeRef.current = true;
    setCallMode({ dir: "out", type });
  };

  const onType = (v) => {
    setTxt(v);
    const now = Date.now();
    if (!typeTimer.current || now - typeTimer.current > 6000) {
      typeTimer.current = now;
      pushTyping();
    }
  };

  const holdStart = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(() => { sendBurst(); holdTimer.current = null; }, 550);
  };
  const holdEnd = (e) => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
      sendReact("❤️");
    }
    if (e && e.preventDefault) e.preventDefault();
  };

  const mkInvite = async () => {
    setBusy(true);
    const r = await api("/api/partner/invite", { method: "POST" });
    setBusy(false);
    if (r.ok && r.data && r.data.code) {
      setInvite(r.data);
      setFlash("لینک ساخته شد؛ براش بفرست 💌");
    } else setFlash((r.data && r.data.message) || "نشد؛ دوباره امتحان کن");
    setTimeout(() => setFlash(""), 2500);
  };

  if (!pair) return <div className="card ccard"><p className="dim small">یه لحظه…</p></div>;

  if (!pair.paired) {
    return (
      <div className="card ccard sp-pairgate">
        <span className="sp-gate-emoji">💑</span>
        <h3>چت دونفره‌تون اینجاست</h3>
        <p className="dim small">برای چت خصوصی، اول باید با پارتنرت جفت بشی — با یه لینک، اونم میاد تو اپ و بعدش این چت فقط مال شماست.</p>
        {invite ? (
          <div className="giftbox" style={{ textAlign: "center" }}>
            <b className="tiny">کد جفت‌شدن (۷ روز اعتبار):</b>
            <button className="recode" type="button" dir="ltr" onClick={() => { try { navigator.clipboard.writeText(invite.url || invite.code); } catch {} }}>{invite.code}</button>
            <button className="btn ghost sm" type="button" onClick={() => { try { navigator.clipboard.writeText(invite.url || invite.code); } catch {} setFlash("لینک کپی شد؛ براش بفرست"); setTimeout(() => setFlash(""), 2000); }}>
              <Ic n="copy" s={14} /> کپی لینک دعوت
            </button>
          </div>
        ) : (
          <button className="btn primary" type="button" disabled={busy} onClick={mkInvite}>
            <Ic n="invite" s={15} /> ساخت لینک دعوت پارتنر
          </button>
        )}
        {flash ? <p className="tiny center">{flash}</p> : null}
        <p className="tiny center dim">اگه پارتنرت قبلاً لینک فرستاده، از تب «ما» → بخش «همراه» قبولش کن.</p>
      </div>
    );
  }

  const wall = WALLPAPERS[prof.wallpaper] || WALLPAPERS.rose;

  return (
    <div className="sp-chatwrap">
      <div className="sp-chathead card">
        <span className="sp-chatava">{prof.emoji || "💞"}</span>
        <div>
          <b>{pName}</b>
          <span className="tiny dim">{peerTyping ? "…داره می‌نویسه" : "فضای خصوصی شما دو نفر 🔒"}</span>
        </div>
        <div className="sp-callbtns">
          <button type="button" className="sp-callbtn" onClick={() => startCall("audio")} title="تماس صوتی">📞</button>
          <button type="button" className="sp-callbtn" onClick={() => startCall("video")} title="تماس تصویری 💎">📹</button>
        </div>
      </div>
      {callMode ? <CallView pName={pName} mode={callMode} onEnd={() => { callModeRef.current = false; setCallMode(null); poll(); }} /> : null}

      {peerLive ? (
        <a className="sp-livebanner peer" href={mapsUrl(peerLive.lat, peerLive.lng)} target="_blank" rel="noopener">
          <span>🔴 {pName} داره لوکیشن زنده می‌فرسته · {agoFa(peerLive.ts)}</span>
          <b>مشاهده 🗺</b>
        </a>
      ) : null}
      {myLive > Date.now() ? (
        <div className="sp-livebanner mine">
          <span>🔴 اشتراک زنده‌ی تو فعاله</span>
          <button type="button" onClick={endLive}>قطع کن</button>
        </div>
      ) : null}

      <div className="sp-chatbox" ref={boxRef} style={{ background: wall }}>
        {msgs.length === 0 ? (
          <p className="dim small center" style={{ padding: 24 }}>اولین حرف رو بزن… یا دکمه‌ی قلب رو نگه دار ❤️</p>
        ) : null}
        {msgs.map((m, i) => {
          const mine = m.uid === me;
          if (m.burst) {
            return (
              <div key={m.ts + "-" + i} className={"sp-burst" + (mine ? " mine" : "")}>
                <span className="sp-burst-hearts">❤️💕💘💖💗</span>
              </div>
            );
          }
          if (m.react) {
            return (
              <div key={m.ts + "-" + i} className={"sp-react" + (mine ? " mine" : "")}>
                <span>{m.react}</span>
              </div>
            );
          }
          if (m.loc) {
            return (
              <div key={m.ts + "-" + i} className={"sp-msg" + (mine ? " mine" : "") + (m.pending ? " pending" : "")}>
                <div className="sp-msg-b sp-loc">
                  <b>📍 لوکیشن {mine ? "تو" : pName}</b>
                  <span className="tiny">{m.pending ? "🕐 تو صفه، ارسال می‌شه" : agoFa(m.ts)}</span>
                  <span className="sp-loc-links">
                    <a href={mapsUrl(m.loc.lat, m.loc.lng)} target="_blank" rel="noopener">گوگل‌مپ 🗺</a>
                    <a href={osmUrl(m.loc.lat, m.loc.lng)} target="_blank" rel="noopener">نقشه آزاد</a>
                  </span>
                </div>
              </div>
            );
          }
          if (m.sticker) {
            return (
              <div key={m.ts + "-" + i} className={"sp-stk" + (mine ? " mine" : "")}>
                <span>{stickerBody(m.sticker) || "💝"}</span>
              </div>
            );
          }
          if (m.voice) {
            return (
              <div key={m.ts + "-" + i} className={"sp-msg" + (mine ? " mine" : "") + (m.pending ? " pending" : "")}>
                <div className="sp-msg-b sp-voice">
                  <span>🎙️</span>
                  <audio controls preload="metadata" src={m.voice} style={{ maxWidth: 170 }} />
                  <span className="tiny">{m.vdur ? faSec(m.vdur) : ""}{m.pending ? " 🕐" : ""}</span>
                </div>
              </div>
            );
          }
          if (m.video) {
            return (
              <div key={m.ts + "-" + i} className={"sp-msg" + (mine ? " mine" : "") + (m.pending ? " pending" : "")}>
                <div className="sp-msg-b sp-video">
                  <video controls preload="metadata" src={m.video} playsInline />
                  <span className="tiny">{m.vidur ? faSec(m.vidur) : ""}{m.pending ? " 🕐" : ""}</span>
                </div>
              </div>
            );
          }
          return (
            <div key={m.ts + "-" + i} className={"sp-msg" + (mine ? " mine" : "") + (m.pending ? " pending" : "")}>
              <div className="sp-msg-b">{m.text}{m.pending ? <span className="tiny"> 🕐</span> : null}</div>
            </div>
          );
        })}
        {peerTyping ? (
          <div className="sp-msg"><div className="sp-msg-b sp-typing"><i /><i /><i /></div></div>
        ) : null}
      </div>

      {flash ? <p className="tiny center">{flash}</p> : null}

      <div className="sp-lovenotes">
        {LOVE_NOTES.map((n) => (
          <button key={n} type="button" className="sp-lovenote" onClick={() => sendText(n)}>{n}</button>
        ))}
      </div>
      <div className="sp-reactrow">
        {LOVE_BURSTS.map((e) => (
          <button key={e} type="button" className="sp-ebtn" onClick={() => sendReact(e)}>{e}</button>
        ))}
      </div>
      <div className="sp-chatinput">
        <button
          type="button" className="sp-heartbtn" title="نگه دار برای بارش قلب"
          onMouseDown={holdStart} onMouseUp={holdEnd} onMouseLeave={() => { if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null; } }}
          onTouchStart={holdStart} onTouchEnd={holdEnd} onContextMenu={(e) => e.preventDefault()}
        >
          ❤️
        </button>
        <input
          className="ansinp" dir="rtl" value={txt} maxLength={500} placeholder="بنویس…"
          onChange={(e) => onType(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") sendText(txt); }}
        />
        <button className="btn primary" type="button" onClick={() => sendText(txt)} aria-label="ارسال">
          <Ic n="send" s={16} />
        </button>
      </div>
      <div className="sp-locrow">
        <button type="button" className="btn ghost sm" onClick={sendLoc}>📍 بفرست کجام</button>
        {myLive > Date.now() ? (
          <button type="button" className="btn ghost sm danger" onClick={endLive}>🔴 قطع اشتراک زنده</button>
        ) : (
          <button type="button" className="btn ghost sm" onClick={() => setLiveMenu(!liveMenu)}>🔴 اشتراک زنده…</button>
        )}
      </div>
      <div className="sp-mediarow">
        <button type="button" className="btn ghost sm" onClick={() => setShowStk(!showStk)}>😊 استیکر</button>
        {rec ? (
          <span className="sp-recpill">🔴 {faSec(recSec)} · {rec.kind === "video" ? "ویدیو" : "ویس"}</span>
        ) : (
          <>
            <button type="button" className="btn ghost sm" onClick={() => startRec("voice")}>🎙️ ویس</button>
            <button type="button" className="btn ghost sm" onClick={() => startRec("video")}>📹 ویدیو 💎</button>
          </>
        )}
      </div>
      {rec ? (
        <div className="sp-recbox card">
          {rec.kind === "video" ? <video ref={vidPrev} muted playsInline autoPlay className="sp-recprev" /> : null}
          <div className="sp-recbtns">
            <button type="button" className="btn ghost sm danger" onClick={() => stopRec(true)}>✖ بی‌خیال</button>
            <button type="button" className="btn primary sm" onClick={() => stopRec(false)}>✓ بفرست</button>
          </div>
        </div>
      ) : null}
      {showStk && !rec ? (
        <div className="sp-stkpanel card">
          <div className="seg">
            {STICKER_PACKS.map((p) => (
              <button key={p.id} type="button" className={stkPack === p.id ? "on" : ""} onClick={() => setStkPack(p.id)}>{p.t}</button>
            ))}
          </div>
          <div className="sp-stkgrid">
            {(STICKER_PACKS.find((p) => p.id === stkPack) || STICKER_PACKS[0]).items.map((s) => (
              <button key={s.id} type="button" className="sp-stkbtn" title={s.t} onClick={() => sendSticker(stkPack + ":" + s.id)}>{s.b}</button>
            ))}
          </div>
        </div>
      ) : null}
      {liveMenu && !(myLive > Date.now()) ? (
        <div className="sp-livemenu card">
          <b className="tiny">تا کی لوکیشن زنده بفرستم؟ (خودکار قطع می‌شه)</b>
          <div className="sp-2col">
            <button type="button" className="btn primary sm" onClick={() => startLive(15)}>۱۵ دقیقه</button>
            <button type="button" className="btn primary sm" onClick={() => startLive(60)}>۱ ساعت</button>
          </div>
        </div>
      ) : null}
      <p className="tiny center dim">دکمه‌ی ❤️ رو نگه دار تا بارش قلب بفرستی · لوکیشن فقط با اجازه‌ی خودت فرستاده می‌شه</p>
    </div>
  );
}
