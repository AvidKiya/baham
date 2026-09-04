"use client";
// ---------------------------------------------------------------------------
// components/app/DiscoverTab.jsx — کشف: افراد نزدیک، لایک/مچ و چت دونفره
// opt-in کامل: تا وقتی خودت روشن نکنی، هیچ‌کس تو رو نمی‌بینه.
// مختصات فقط ۲ رقم اعشعار (~۱ کیلومتر) ذخیره می‌شه؛ هیچ‌وقت دقیق نیست.
// ---------------------------------------------------------------------------
import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/appauth";
import { Ic } from "@/lib/icons";

const fa = (n) => { try { return Number(n).toLocaleString("fa-IR"); } catch { return String(n); } };

export default function DiscoverTab({ user, go }) {
  const [data, setData] = useState(null); // {on, card, candidates, likesGot, rooms}
  const [err, setErr] = useState("");
  const [chat, setChat] = useState(null); // {id, peer}
  const adult = !!(user && user.profile && user.profile.adult);

  const load = useCallback(async () => {
    if (!user || !adult) return;
    const r = await api("/api/discover");
    if (r.ok && r.data) { setData(r.data); setErr(""); }
    else setErr((r.data && r.data.message) || "یه مشکلی بود؛ دوباره امتحان کن");
  }, [user, adult]);
  useEffect(() => { load(); }, [load]);

  if (!user) {
    return (
      <div className="card ccard disccard">
        <span className="btile"><Ic n="sparkles" s={22} /></span>
        <h2>کشف نزدیک‌ها</h2>
        <p className="dim">با افراد اطرافت آشنا شو، لایک بده، اگه طرف هم لایک کرد چت باز می‌شه.</p>
        <button className="btn primary" type="button" onClick={() => go("settings")}><Ic n="user" s={16} /> اول بزن تو حسابت</button>
      </div>
    );
  }
  if (!adult) {
    return (
      <div className="card ccard disccard">
        <span className="btile"><Ic n="lock" s={22} /></span>
        <h2>کشف فقط برای بزرگسداده</h2>
        <p className="dim">برای امنیت بچه‌ها، این بخش با تأیید سن باز می‌شه.</p>
        <button className="btn primary" type="button" onClick={() => go("settings")}><Ic n="shield" s={16} /> برو تأیید سن</button>
      </div>
    );
  }

  if (chat) return <RoomChat room={chat} onBack={() => { setChat(null); load(); }} me={user.id} />;

  return (
    <div className="disctab">
      <header className="tabhead">
        <h2><Ic n="sparkles" s={20} /> کشف نزدیک‌ها</h2>
        <p>کارت ببین، لایک بده؛ اگه طرف هم لایک کرد، چت دونفره باز می‌شه ✨</p>
      </header>

      {err ? <div className="mini-err big">{err}</div> : null}
      {!data ? <p className="dim small">یه لحظه…</p> : !data.on ? (
        <DiscSetup onSaved={load} />
      ) : (
        <>
          <div className="statrow">
            <div className="stat"><Ic n="sparkles" s={15} /><b>{fa(data.candidates.length)}</b><span>کارت جدید</span></div>
            <div className="stat"><Ic n="heart" s={15} /><b>{fa(data.likesGot)}</b><span>بهت لایک دادن</span></div>
            <div className="stat"><Ic n="chat" s={15} /><b>{fa(data.rooms.length)}</b><span>چت باز</span></div>
          </div>

          {data.rooms.length ? (
            <div className="card ccard">
              <h3 className="ip-head"><Ic n="chat" s={16} /> چت‌هات</h3>
              <div className="iplist">
                {data.rooms.map((r) => (
                  <button key={r.id} type="button" className="roomrow card" onClick={() => setChat({ id: r.id, peer: r.peer })}>
                    <span className="hi-ico"><Ic n="user" s={16} /></span>
                    <span className="hi-body"><b>{r.peer}</b><span className="hi-time">{r.last || "هنوز حرفی نزدید"}</span></span>
                    <Ic n="chev" s={15} />
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {data.candidates.length ? (
            <CandCard c={data.candidates[0]} onDone={load} />
          ) : (
            <div className="card ccard disccard">
              <span className="btile"><Ic n="search" s={20} /></span>
              <p>الان تو حوالیات کسی نیست که ندیده باشی. بعدا سر بزن یا شهرت رو چک کن.</p>
            </div>
          )}

          <DiscSetup onSaved={load} compact editMode card={data.card} />
        </>
      )}
    </div>
  );
}

/* ---------------- کارت کاندید + لایک/رد ---------------- */
function CandCard({ c, onDone }) {
  const [busy, setBusy] = useState(false);
  const [fly, setFly] = useState(""); // "" | "like" | "nope"
  const act = async (like) => {
    if (busy) return;
    setBusy(true);
    setFly(like ? "like" : "nope");
    const r = await api("/api/discover/like", { method: "POST", body: { target: c.uid, like } });
    setTimeout(() => {
      setBusy(false); setFly("");
      if (r.ok && r.data && r.data.matched) {
        alert("مچ شدی با «" + (r.data.peer || "طرف") + "»! چت‌هات باز شد ✨");
      }
      onDone();
    }, 260);
  };
  return (
    <div className={"swipecard card" + (fly ? " fly-" + fly : "")}>
      <div className="sw-head">
        <span className="sw-ava"><Ic n="user" s={26} /></span>
        <div>
          <b>{c.name}</b>
          <span className="hi-time">{fa(c.age)} ساله · {c.city}</span>
        </div>
      </div>
      {c.km >= 0 ? <span className="sw-km"><Ic n="spark" s={12} /> {c.km < 1 ? "همون حوالیا" : fa(c.km) + " کیلومتر اون‌ورتر"}</span> : null}
      {c.bio ? <p className="sw-bio">{c.bio}</p> : <p className="sw-bio dim">چیزی درباره‌ش ننوشته…</p>}
      <div className="sw-actions">
        <button className="btn ghost danger" type="button" disabled={busy} onClick={() => act(false)}><Ic n="x" s={17} /> بگذر</button>
        <button className="btn primary" type="button" disabled={busy} onClick={() => act(true)}><Ic n="invite" s={17} /> خوشم اومد</button>
      </div>
    </div>
  );
}

/* ---------------- فرم پروفایل کشف ---------------- */
function DiscSetup({ onSaved, compact, editMode, card }) {
  const [open, setOpen] = useState(!compact);
  const [city, setCity] = useState((card && card.city) || "");
  const [bio, setBio] = useState((card && card.bio) || "");
  const [geo, setGeo] = useState(!!(card && card.lat));
  const [coords, setCoords] = useState(card && card.lat ? [card.lat, card.lng] : [0, 0]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const enableGeo = () => {
    if (!navigator.geolocation) { setMsg("مرورگرت موقعیت نمی‌ده؛ عیب نداره، شهر کافیه"); return; }
    setMsg("دارم می‌گیرم…");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        // فقط ۲ رقم اعشار (~۱ کیلومتر دقیق) — حریم خصوصی
        setCoords([Math.round(p.coords.latitude * 100) / 100, Math.round(p.coords.longitude * 100) / 100]);
        setGeo(true); setMsg("گرفتم؛ تقریبی ذخیره می‌شه نه دقیق ✅");
      },
      () => setMsg("اجازه ندادی؛ عیب نداره، شهر کافیه"),
      { timeout: 8000 }
    );
  };

  const save = async (on) => {
    if (busy) return;
    if (on && !city.trim()) { setMsg("شهرت رو بنویس"); return; }
    setBusy(true);
    const r = await api("/api/discover", {
      method: "PUT",
      body: on ? { on: true, city: city.trim(), bio: bio.trim(), lat: geo ? coords[0] : 0, lng: geo ? coords[1] : 0 } : { on: false },
    });
    setBusy(false);
    setMsg(r.ok ? (on ? "ذخیره شد؛ الان تو کارتای بقیه‌ای 🎉" : "خاموش شد؛ دیگه هیچ‌کس نمی‌بینتت") : ((r.data && r.data.message) || "ذخیره نشد"));
    setTimeout(() => setMsg(""), 2600);
    onSaved();
  };

  if (compact && !open) {
    return (
      <div className="card ccard disccard">
        <button className="btn ghost" type="button" onClick={() => setOpen(true)}><Ic n="gear" s={15} /> کارت کشف من رو ویرایش کن / خاموشم کن</button>
      </div>
    );
  }
  return (
    <div className="card ccard">
      <h3 className="ip-head"><Ic n={editMode ? "gear" : "sparkles"} s={16} /> کارت کشف من {editMode ? "(ویرایش)" : ""}</h3>
      <p className="dim small">فقط وقتی خودت روشنش کنی تو کارتای بقیه می‌افتی. اسم و سن از حسابت میاد؛ اینجا شهر و یه توضیح کوتاه.</p>
      <label className="field">
        <span className="flbl"><Ic n="home" s={15} /> شهر</span>
        <input className="inp" dir="rtl" maxLength={40} placeholder="مثلاً: تهران" value={city} onChange={(e) => setCity(e.target.value)} />
      </label>
      <label className="field">
        <span className="flbl"><Ic n="pencil" s={15} /> درباره‌ت (اختیاری)</span>
        <textarea className="inp" style={{ minHeight: 66, padding: "10px 14px", resize: "none" }} dir="rtl" maxLength={200} placeholder="مثلاً: قهوه، موزیک و گپای نصفه‌شب…" value={bio} onChange={(e) => setBio(e.target.value)} />
      </label>
      <button className={"btn ghost" + (geo ? " on-geo" : "")} type="button" onClick={enableGeo}>
        <Ic n={geo ? "check" : "scan"} s={15} /> {geo ? "موقعیت تقریبی فعاله" : "موقعیت تقریبی بده (اختیاری)"}
      </button>
      <p className="tiny">مختصات فقط تا ~۱ کیلومتر گرد می‌شه؛ هیچ‌وقت خونه‌ت رو دقیق نشون نمی‌ده.</p>
      {msg ? <div className="mini-ok big">{msg}</div> : null}
      <div className="m-row">
        <button className="btn primary" type="button" disabled={busy} onClick={() => save(true)}><Ic n="sparkles" s={15} /> روشنم کن</button>
        {editMode ? <button className="btn ghost danger" type="button" disabled={busy} onClick={() => save(false)}><Ic n="x" s={15} /> خاموشم کن</button> : null}
      </div>
    </div>
  );
}

/* ---------------- چت دونفره ---------------- */
function RoomChat({ room, onBack, me }) {
  const [msgs, setMsgs] = useState([]);
  const [txt, setTxt] = useState("");
  const [peer, setPeer] = useState(room.peer || "؟");
  const boxRef = useRef(null);
  const lastTs = useRef(0);

  const poll = useCallback(async () => {
    const r = await api("/api/room/" + room.id + "?since=" + lastTs.current);
    if (r.ok && r.data && Array.isArray(r.data.msgs)) {
      if (r.data.peer) setPeer(r.data.peer);
      if (r.data.msgs.length) {
        setMsgs((prev) => prev.concat(r.data.msgs));
        lastTs.current = r.data.msgs[r.data.msgs.length - 1].ts;
      }
    }
  }, [room.id]);
  useEffect(() => {
    poll();
    const t = setInterval(poll, 4000);
    return () => clearInterval(t);
  }, [poll]);
  useEffect(() => { if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight; }, [msgs]);

  const send = async () => {
    const text = txt.trim();
    if (!text) return;
    setTxt("");
    const now = Date.now();
    setMsgs((p) => p.concat([{ uid: me, ts: now, text }]));
    lastTs.current = Math.max(lastTs.current, now);
    await api("/api/room/" + room.id + "/msg", { method: "POST", body: { text } });
  };

  return (
    <div className="roomchat">
      <header className="roomhead">
        <button className="btn ghost sm" type="button" onClick={onBack}><Ic n="chev" s={15} style={{ transform: "rotate(90deg)" }} /></button>
        <span className="hi-ico"><Ic n="user" s={16} /></span>
        <b>{peer}</b>
      </header>
      <div className="roombox" ref={boxRef}>
        {msgs.length === 0 ? <p className="dim small center">اولین حرف رو بزن؛ چیزی که توی دلت هست رو بگو 😊</p> : null}
        {msgs.map((m, i) => (
          <div key={m.ts + "-" + i} className={"dmsg" + (m.uid === me ? " mine" : "")}>
            <div className="dm-b">{m.text}</div>
          </div>
        ))}
      </div>
      <div className="ansrow roomrow">
        <input className="ansinp" dir="rtl" value={txt} maxLength={500} placeholder="بنویس…" onChange={(e) => setTxt(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} />
        <button className="btn primary" type="button" onClick={send}><Ic n="send" s={16} /></button>
      </div>
    </div>
  );
}
