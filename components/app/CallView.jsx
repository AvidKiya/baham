"use client";
// ---------------------------------------------------------------------------
// components/app/CallView.jsx — تماس صوتی/تصویری زوج (v9) با WebRTC
// سیگنالینگ روی همین بک‌اند (pull هر ۱٫۵ ثانیه) + STUN عمومی گوگل
// ---------------------------------------------------------------------------
import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/appauth";
import { Ic } from "@/lib/icons";
import { buzz } from "@/lib/fx";

const RTC_CFG = { iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }] };
const faClock = (s) => {
  const m = Math.floor(s / 60), r = s % 60;
  const p = (n) => (n < 10 ? "۰" + "۰۱۲۳۴۵۶۷۸۹"[n] : String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]));
  return p(m) + ":" + p(r);
};

export default function CallView({ pName, mode, onEnd }) {
  const type = (mode && mode.type) || "audio";
  const [phase, setPhase] = useState(mode && mode.dir === "in" ? "incoming" : "starting");
  const [muted, setMuted] = useState(false);
  const [vidOff, setVidOff] = useState(false);
  const [err, setErr] = useState("");
  const [dur, setDur] = useState(0);
  const pc = useRef(null);
  const stream = useRef(null);
  const pollT = useRef(null);
  const durT = useRef(null);
  const gotCand = useRef(0);
  const alive = useRef(true);
  const ended = useRef(false);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const locVid = useRef(null);
  const remVid = useRef(null);
  const remAud = useRef(null);
  const pendRem = useRef(null);

  const cleanup = () => {
    try { if (pollT.current) clearInterval(pollT.current); } catch {}
    try { if (durT.current) clearInterval(durT.current); } catch {}
    pollT.current = null; durT.current = null;
    try { if (pc.current) pc.current.close(); } catch {}
    pc.current = null;
    try { if (stream.current) stream.current.getTracks().forEach((t) => t.stop()); } catch {}
    stream.current = null;
  };
  const finish = (silent) => {
    if (ended.current) return;
    ended.current = true;
    cleanup();
    if (!silent) { try { buzz(15); } catch {} }
    if (onEnd) onEnd();
  };
  const hangup = async (decline) => {
    try { await api("/api/call", { method: "POST", body: { action: decline ? "decline" : "hangup" } }); } catch {}
    finish();
  };

  const attachRemote = (e) => {
    try {
      const s = (e.streams && e.streams[0]) || null;
      if (!s) return;
      pendRem.current = s;
      if (type === "video" && remVid.current) remVid.current.srcObject = s;
      else if (remAud.current) remAud.current.srcObject = s;
    } catch {}
  };
  /* اگه ترک زودتر از رندر ویدیو رسید، بعد از رندر وصلش کن */
  useEffect(() => {
    try {
      if (pendRem.current) {
        if (type === "video" && remVid.current) remVid.current.srcObject = pendRem.current;
        else if (remAud.current) remAud.current.srcObject = pendRem.current;
      }
      if (stream.current && type === "video" && locVid.current && !locVid.current.srcObject) {
        locVid.current.srcObject = stream.current;
      }
    } catch {}
  }, [phase, type]);
  const mkPeer = (s) => {
    const p = new RTCPeerConnection(RTC_CFG);
    pc.current = p;
    try { s.getTracks().forEach((t) => p.addTrack(t, s)); } catch {}
    p.onicecandidate = (e) => {
      if (e.candidate) api("/api/call", { method: "POST", body: { action: "candidate", candidate: e.candidate.toJSON() } }).catch(() => {});
    };
    p.ontrack = attachRemote;
    p.onconnectionstatechange = () => {
      try {
        if (p.connectionState === "connected" && phaseRef.current !== "active") setPhase("active");
        if (p.connectionState === "failed") setErr("اتصال مستقیم برقرار نشد؛ شاید اینترنت یکی‌تون محدوده 😕");
      } catch {}
    };
    return p;
  };
  const startPoll = () => {
    if (pollT.current) clearInterval(pollT.current);
    pollT.current = setInterval(poll, 1500);
    poll();
  };
  const startDur = () => {
    if (durT.current) return;
    const t0 = Date.now();
    durT.current = setInterval(() => setDur(Math.round((Date.now() - t0) / 1000)), 1000);
  };

  const poll = async () => {
    if (!alive.current || ended.current) return;
    try {
      const r = await api("/api/call");
      const c = r && r.data && r.data.call;
      if (!c || c.state === "ended" || !alive.current || ended.current) {
        if (!c || c.state === "ended") finish(true);
        return;
      }
      if (pc.current) {
        if (c.mine && c.answer && !pc.current.remoteDescription) {
          try {
            await pc.current.setRemoteDescription(new RTCSessionDescription(c.answer));
            setPhase("active"); startDur();
          } catch {}
        }
        const list = c.cand || [];
        for (let i = gotCand.current; i < list.length; i++) {
          try { await pc.current.addIceCandidate(new RTCIceCandidate(list[i])); } catch {}
        }
        gotCand.current = list.length;
        if (c.state === "active" && phaseRef.current === "ringing") { setPhase("active"); startDur(); }
      } else if (!c.mine && c.state !== "ringing" && phaseRef.current === "incoming") {
        finish(true); // قبل از جواب لغو شد
      }
    } catch {}
  };

  const getMedia = (t) => navigator.mediaDevices.getUserMedia({
    audio: true,
    video: t === "video" ? { width: { ideal: 640 }, facingMode: "user" } : false,
  });

  /* تماس خروجی */
  const startOut = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof RTCPeerConnection === "undefined") {
        setErr("مرورگرت تماس رو پشتیبانی نمی‌کنه 😕"); setPhase("error"); return;
      }
      const s = await getMedia(type);
      if (!alive.current || ended.current) { s.getTracks().forEach((t) => t.stop()); return; }
      stream.current = s;
      if (type === "video") setTimeout(() => { try { if (locVid.current) locVid.current.srcObject = s; } catch {} }, 60);
      const p = mkPeer(s);
      const offer = await p.createOffer();
      await p.setLocalDescription(offer);
      const r = await api("/api/call", { method: "POST", body: { action: "start", type, offer: { type: offer.type, sdp: offer.sdp } } });
      if (!alive.current || ended.current) return;
      if (!r.ok) {
        setErr((r.data && r.data.message) || "تماس برقرار نشد؛ دوباره بزن"); setPhase("error"); cleanup(); return;
      }
      setPhase("ringing");
      startPoll();
    } catch {
      if (!alive.current) return;
      setErr(type === "video" ? "به دوربین/میکروفون دسترسی ندادی 🎥" : "به میکروفون دسترسی ندادی 🎙️");
      setPhase("error");
    }
  };

  /* جواب تماس ورودی */
  const accept = async () => {
    setPhase("starting");
    try {
      const r0 = await api("/api/call");
      const c = r0 && r0.data && r0.data.call;
      if (!c || c.state !== "ringing" || !c.offer) { setErr("تماس دیگه فعال نیست"); setPhase("error"); return; }
      const s = await getMedia(c.type || "audio");
      if (!alive.current || ended.current) { s.getTracks().forEach((t) => t.stop()); return; }
      stream.current = s;
      if ((c.type || "audio") === "video") setTimeout(() => { try { if (locVid.current) locVid.current.srcObject = s; } catch {} }, 60);
      const p = mkPeer(s);
      await p.setRemoteDescription(new RTCSessionDescription(c.offer));
      const ans = await p.createAnswer();
      await p.setLocalDescription(ans);
      const r = await api("/api/call", { method: "POST", body: { action: "answer", answer: { type: ans.type, sdp: ans.sdp } } });
      if (!alive.current || ended.current) return;
      if (!r.ok) { setErr((r.data && r.data.message) || "وصل نشد"); setPhase("error"); cleanup(); return; }
      setPhase("active"); startDur(); startPoll();
    } catch {
      if (!alive.current) return;
      setErr("به میکروفون/دوربین دسترسی ندادی"); setPhase("error");
    }
  };

  const toggleMute = () => {
    try {
      const on = !muted;
      (stream.current ? stream.current.getAudioTracks() : []).forEach((t) => { t.enabled = !on; });
      setMuted(on);
    } catch {}
  };
  const toggleVid = () => {
    try {
      const off = !vidOff;
      (stream.current ? stream.current.getVideoTracks() : []).forEach((t) => { t.enabled = !off; });
      setVidOff(off);
    } catch {}
  };

  useEffect(() => {
    alive.current = true;
    if (mode && mode.dir === "out") startOut();
    else if (mode && mode.dir === "in") startPoll();
    const onHide = () => {};
    return () => { alive.current = false; cleanup(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusTxt = phase === "incoming" ? "تماس ورودی… 📲"
    : phase === "starting" ? "یه لحظه…"
    : phase === "ringing" ? "در حال زنگ خوردن… 📞"
    : phase === "active" ? ("در حال مکالمه " + faClock(dur)) : "";

  return (
    <div className="call-ovl">
      <div className="call-card card">
        {type === "video" && (phase === "active" || phase === "ringing") ? (
          <video ref={remVid} autoPlay playsInline className="call-remote" />
        ) : (
          <div className="call-ava">{type === "video" ? "📹" : "📞"}</div>
        )}
        <h3>{pName || "پارتنر"}</h3>
        <p className="dim small">{err || statusTxt}</p>
        {type === "video" && stream.current ? (
          <video ref={locVid} autoPlay playsInline muted className="call-local" style={{ opacity: vidOff ? 0.25 : 1 }} />
        ) : null}
        <audio ref={remAud} autoPlay style={{ display: "none" }} />
        {phase === "incoming" ? (
          <div className="call-btns">
            <button type="button" className="call-btn decline" onClick={() => hangup(true)} title="رد">✖</button>
            <button type="button" className="call-btn accept" onClick={accept} title="جواب">📞</button>
          </div>
        ) : phase === "error" ? (
          <div className="call-btns">
            <button type="button" className="btn primary sm" onClick={() => finish()}>باشه</button>
          </div>
        ) : (
          <div className="call-btns">
            <button type="button" className={"call-btn small" + (muted ? " off" : "")} onClick={toggleMute} title={muted ? "روشن کردن صدا" : "بی‌صدا"}>{muted ? "🔇" : "🎙️"}</button>
            {type === "video" ? (
              <button type="button" className={"call-btn small" + (vidOff ? " off" : "")} onClick={toggleVid} title="دوربین">{vidOff ? "🚫" : "📹"}</button>
            ) : null}
            <button type="button" className="call-btn decline" onClick={() => hangup(false)} title="قطع">✖</button>
          </div>
        )}
        <p className="tiny dim">تماس مستقیم (P2P) و رمزنگاری‌شده 🔒</p>
      </div>
    </div>
  );
}
