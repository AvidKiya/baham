"use client";
// ---------------------------------------------------------------------------
// components/app/DiscoverTab.jsx — کشف: افراد نزدیک، لایک/مچ، چت دونفره
// v5.5: عکس پروفایل، استوری روزانه، فیلترها، فانوس، حالت نامرئی،
//       گزارش/مسدود، دوز چالشی، پیشنهاد شروع، نوتیفیکیشن
// ---------------------------------------------------------------------------
import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/appauth";
import { Ic } from "@/lib/icons";

const fa = (n) => { try { return Number(n).toLocaleString("fa-IR"); } catch { return String(n); } };
const REACTS = [["heart", "invite"], ["laugh", "smile"], ["star", "star"], ["fire", "flame"]];
const OPENERS = [
  "سلام! چطور شد خودتی اینجا؟ 😄",
  "خیلی سلیقه‌هام شبیهه؛ از کجا شروع کنیم؟",
  "یه سؤال مهم: قهوه یا چای؟ 🍵☕",
  "سلام! پروفایلت خندوندم؛ گفتی چی؟",
  "به‌به؛ بالاخره یه آدم بامزه پیدا شد!",
];

export default function DiscoverTab({ user, go }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [chat, setChat] = useState(null); // {id, peer, img}
  const [q, setQ] = useState("");
  const [found, setFound] = useState(null);
  const [qMsg, setQMsg] = useState("");
  const adult = !!(user && user.profile && user.profile.adult);

  const load = useCallback(async () => {
    if (!user || !adult) return;
    const r = await api("/api/discover");
    if (r.ok && r.data) {
      const d = r.data;
      // نوتیفیکیشن پیام تازه
      try {
        if (d.rooms) {
          for (const rm of d.rooms) {
            const k = "mk:lastmsg:" + rm.id;
            const last = Number(localStorage.getItem(k) || 0);
            if (rm.ts > last && last > 0) {
              if (typeof Notification !== "undefined" && Notification.permission === "granted") {
                new Notification("مخ‌یار 💬", { body: rm.peer + ": " + (rm.last || "پیام جدید") });
              }
            }
            if (rm.ts > last) localStorage.setItem(k, String(rm.ts));
          }
        }
      } catch {}
      setData(d); setErr("");
    } else setErr((r.data && r.data.message) || "یه مشکلی بود؛ دوباره امتحان کن");
  }, [user, adult]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!data || !data.on) return;
    const t = setInterval(load, 25000);
    return () => clearInterval(t);
  }, [data && data.on]);

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

  const doFind = async () => {
    const un = q.trim().replace(/^@/, "");
    if (!un) { setQMsg("یوزرنیم رو بنویس"); setFound(null); return; }
    setQMsg("می‌گردم…"); setFound(null);
    const r = await api("/api/discover/find?u=" + encodeURIComponent(un));
    if (r.ok && r.data) {
      setFound(r.data.found ? r.data.cand : null);
      setQMsg(r.data.found ? "پیداش کردم! 👇" : (r.data.message || "پیدا نشد؛ شاید کشفش روشن نیست یا نامرئیه"));
    } else setQMsg((r.data && r.data.message) || "الان نشد؛ دوباره امتحان کن");
  };

  const fanous = data && data.fanous;
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
            <div className="stat"><Ic n="invite" s={15} /><b>{fa(data.likesGot)}</b><span>بهت لایک دادن</span></div>
            <div className="stat"><Ic n="eye" s={15} /><b>{fa((data.card && data.card.views) || 0)}</b><span>بازدید کارتت</span></div>
            <div className="stat"><Ic n="chat" s={15} /><b>{fa(data.rooms.length)}</b><span>چت باز</span></div>
          </div>

          <div className="card ccard">
            <h3 className="ip-head"><Ic n="search" s={16} /> دنبال کسی خاصی هستی؟</h3>
            <div className="ansrow findrow">
              <input className="inp" dir="ltr" placeholder="username" maxLength={24} value={q} onChange={(e) => setQ(e.target.value.replace(/[^A-Za-z0-9_@]/g, ""))} onKeyDown={(e) => { if (e.key === "Enter") doFind(); }} />
              <button className="btn primary" type="button" onClick={doFind}><Ic n="search" s={15} /> دنبالش بگرد</button>
            </div>
            {qMsg ? <p className={"small " + (found ? "dim" : "anserr")}>{qMsg}</p> : null}
            {found ? <CandCard c={found} onDone={() => { setFound(null); setQMsg(""); load(); }} /> : null}
          </div>

          {data.rooms.length ? (
            <div className="card ccard">
              <h3 className="ip-head"><Ic n="chat" s={16} /> چت‌هات</h3>
              <div className="iplist">
                {data.rooms.map((r) => (
                  <button key={r.id} type="button" className="roomrow card" onClick={() => setChat({ id: r.id, peer: r.peer, img: r.img })}>
                    {r.img ? <img className="hi-ava" src={r.img} alt="" /> : <span className="hi-ico"><Ic n="user" s={16} /></span>}
                    <span className="hi-body"><b>{r.peer}</b><span className="hi-time">{r.last || "هنوز حرفی نزدید"}</span></span>
                    <Ic n="chev" s={15} />
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {fanous ? (
            <div className="fanous card">
              <div className="fn-tag"><Ic n="spark" s={13} /> فانوسِ امروز</div>
              <CandCard c={fanous} onDone={load} fanous />
            </div>
          ) : null}

          {data.candidates.length ? (
            <CandCard c={data.candidates[0]} onDone={load} />
          ) : (
            <div className="card ccard disccard">
              <span className="btile"><Ic n="search" s={20} /></span>
              <p>الان تو حوالیات کسی نیست که ندیده باشی. بعدا سر بزن یا فیلترهات رو شل‌تر کن.</p>
            </div>
          )}

          <DiscSetup onSaved={load} compact editMode card={data.card} />
        </>
      )}
    </div>
  );
}

/* ---------------- کارت کاندید + لایک/رد/گزارش ---------------- */
function CandCard({ c, onDone, fanous }) {
  const [busy, setBusy] = useState(false);
  const [fly, setFly] = useState("");
  useEffect(() => {
    try {
      const k = "mk:seen:" + c.uid;
      if (!sessionStorage.getItem(k)) {
        sessionStorage.setItem(k, "1");
        api("/api/discover/seen", { method: "POST", body: { target: c.uid } }).catch(() => {});
      }
    } catch {}
  }, [c.uid]);
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
  const report = async () => {
    if (busy) return;
    if (!confirm("این کارت گزارش و مسدود بشه؟ دیگه نمی‌بینی‌ش.")) return;
    setBusy(true);
    await api("/api/discover/block", { method: "POST", body: { target: c.uid, report: true } });
    setBusy(false);
    setFly("nope");
    setTimeout(() => { setFly(""); onDone(); }, 260);
  };
  return (
    <div className={"swipecard card" + (fly ? " fly-" + fly : "") + (fanous ? " fanous-card" : "")}>
      <div className="sw-head">
        {c.img ? <img className="sw-img" src={c.img} alt="" /> : <span className="sw-ava"><Ic n="user" s={26} /></span>}
        <div>
          <b>{c.name}</b>
          <span className="hi-time">{fa(c.age)} ساله · {c.city}</span>
        </div>
        {c.shared > 0 ? <span className="sw-shared"><Ic n="star" s={12} /> {fa(c.shared)} سلیقه‌ی مشترک</span> : null}
      </div>
      {c.status ? <p className="sw-status">«{c.status}»</p> : null}
      {c.km >= 0 ? <span className="sw-km"><Ic n="spark" s={12} /> {c.km < 1 ? "همون حوالیا" : fa(c.km) + " کیلومتر اون‌ورتر"}</span> : null}
      {c.bio ? <p className="sw-bio">{c.bio}</p> : <p className="sw-bio dim">چیزی درباره‌ش ننوشته…</p>}
      <div className="sw-actions">
        <button className="btn ghost danger" type="button" disabled={busy} onClick={() => act(false)}><Ic n="x" s={17} /> بگذر</button>
        <button className="btn primary" type="button" disabled={busy} onClick={() => act(true)}><Ic n="invite" s={17} /> خوشم اومد</button>
      </div>
      <button className="sw-flag" type="button" onClick={report} disabled={busy}><Ic n="alert" s={13} /> گزارش/مسدود</button>
    </div>
  );
}

/* ---------------- فرم پروفایل کشف ---------------- */
function DiscSetup({ onSaved, compact, editMode, card }) {
  const [open, setOpen] = useState(!compact);
  const [city, setCity] = useState((card && card.city) || "");
  const [bio, setBio] = useState((card && card.bio) || "");
  const [status, setStatus] = useState((card && card.status) || "");
  const [img, setImg] = useState((card && card.img) || "");
  const [geo, setGeo] = useState(!!(card && card.lat));
  const [coords, setCoords] = useState(card && card.lat ? [card.lat, card.lng] : [0, 0]);
  const [ghost, setGhost] = useState(!!(card && card.ghost));
  const [f, setF] = useState((card && card.f) || { g: "any", amin: "", amax: "", km: "" });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  const enableGeo = () => {
    if (!navigator.geolocation) { setMsg("مرورگرت موقعیت نمی‌ده؛ عیب نداره، شهر کافیه"); return; }
    setMsg("دارم می‌گیرم…");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setCoords([Math.round(p.coords.latitude * 100) / 100, Math.round(p.coords.longitude * 100) / 100]);
        setGeo(true); setMsg("گرفتم؛ تقریبی ذخیره می‌شه نه دقیق ✅");
      },
      () => setMsg("اجازه ندادی؛ عیب نداره، شهر کافیه"),
      { timeout: 8000 }
    );
  };

  const pickImg = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { setMsg("عکست سنگینه؛ یه عکس کوچیک‌تر بذار"); return; }
    const rd = new FileReader();
    rd.onload = () => {
      const im = new Image();
      im.onload = () => {
        const cv = document.createElement("canvas");
        cv.width = 96; cv.height = 96;
        cv.getContext("2d").drawImage(im, 0, 0, 96, 96);
        setImg(cv.toDataURL("image/jpeg", 0.62));
        setMsg("عکس آماده شد 📸");
      };
      im.src = rd.result;
    };
    rd.readAsDataURL(file);
  };

  const enableNotif = async () => {
    if (typeof Notification === "undefined") { setMsg("مرورگرت نوتیف نمی‌ده"); return; }
    const p = await Notification.requestPermission();
    setMsg(p === "granted" ? "نوتیف فعال شد؛ پیام جدید که بیاد خبرت می‌کنم 🔔" : "اجازه ندادی؛ هر وقت خواستی دوباره بزن");
  };

  const save = async (on) => {
    if (busy) return;
    if (on && !city.trim()) { setMsg("شهرت رو بنویس"); return; }
    setBusy(true);
    const r = await api("/api/discover", {
      method: "PUT",
      body: on
        ? { on: true, city: city.trim(), bio: bio.trim(), status: status.trim(), img, ghost, lat: geo ? coords[0] : 0, lng: geo ? coords[1] : 0, f: { g: f.g || "any", amin: Number(f.amin) || 0, amax: Number(f.amax) || 0, km: Number(f.km) || 0 } }
        : { on: false },
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
      <p className="dim small">فقط وقتی خودت روشنش کنی تو کارتای بقیه می‌افتی. اسم و سن از حسابت میاد.</p>

      <div className="ava-row">
        {img ? <img className="ava-big" src={img} alt="عکس من" /> : <span className="ava-big ph"><Ic n="user" s={26} /></span>}
        <div className="ava-btns">
          <button className="btn ghost sm" type="button" onClick={() => fileRef.current && fileRef.current.click()}><Ic n="image" s={14} /> عکس بذار</button>
          {img ? <button className="btn ghost sm danger" type="button" onClick={() => { setImg(""); setMsg("عکس حذف شد؛ موقع سیو اعمال می‌شه"); }}><Ic n="trash" s={14} /> بردار</button> : null}
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickImg} />
        </div>
      </div>

      <label className="field">
        <span className="flbl"><Ic n="pencil" s={15} /> وضعیت امروزت (استوری یک‌خطی — ۲۴ ساعت می‌مونه)</span>
        <input className="inp" dir="rtl" maxLength={140} placeholder="مثلاً: امروز حوصله‌ی گپ دارم…" value={status} onChange={(e) => setStatus(e.target.value)} />
      </label>
      <label className="field">
        <span className="flbl"><Ic n="home" s={15} /> شهر</span>
        <input className="inp" dir="rtl" maxLength={40} placeholder="مثلاً: تهران" value={city} onChange={(e) => setCity(e.target.value)} />
      </label>
      <label className="field">
        <span className="flbl"><Ic n="pencil" s={15} /> درباره‌ت (اختیاری)</span>
        <textarea className="inp" style={{ minHeight: 66, padding: "10px 14px", resize: "none" }} dir="rtl" maxLength={200} placeholder="مثلاً: قهوه، موزیک و گپای نصفه‌شب…" value={bio} onChange={(e) => setBio(e.target.value)} />
      </label>

      <div className="flbl"><Ic n="search" s={15} /> فیلترها — چی می‌بینی؟</div>
      <div className="occ-row">
        {[{ id: "any", t: "همه" }, { id: "f", t: "دختر" }, { id: "m", t: "پسر" }].map((o) => (
          <button key={o.id} type="button" className={"occ-chip" + ((f.g || "any") === o.id ? " sel" : "")} onClick={() => setF({ ...f, g: o.id })}>{o.t}</button>
        ))}
      </div>
      <div className="filt-row">
        <input className="inp" dir="ltr" type="number" placeholder="از سن" value={f.amin || ""} onChange={(e) => setF({ ...f, amin: e.target.value })} />
        <input className="inp" dir="ltr" type="number" placeholder="تا سن" value={f.amax || ""} onChange={(e) => setF({ ...f, amax: e.target.value })} />
        <input className="inp" dir="ltr" type="number" placeholder="شعاع (کیلومتر)" value={f.km || ""} onChange={(e) => setF({ ...f, km: e.target.value })} />
      </div>
      <p className="tiny">خالی یعنی بی‌قید. فیلتر جنسیت بر اساس جنسیتی که تو تنظیمات انتخاب کرده‌هاست.</p>

      <button className={"btn ghost" + (geo ? " on-geo" : "")} type="button" onClick={enableGeo}>
        <Ic n={geo ? "check" : "scan"} s={15} /> {geo ? "موقعیت تقریبی فعاله" : "موقعیت تقریبی بده (اختیاری)"}
      </button>
      <p className="tiny">مختصات فقط تا ~۱ کیلومتر گرد می‌شه؛ هیچ‌وقت خونه‌ت رو دقیق نشون نمی‌ده.</p>

      <button className={"btn ghost" + (ghost ? " on-geo" : "")} type="button" onClick={() => setGhost(!ghost)}>
        <Ic n={ghost ? "eyeOff" : "eye"} s={15} /> {ghost ? "حالت نامرئی فعاله (می‌بینی، دیده نمی‌شی)" : "حالت نامرئی (اختیاری)"}
      </button>
      <button className="btn ghost" type="button" onClick={enableNotif}><Ic n="alert" s={15} /> نوتیف پیام جدید</button>

      {msg ? <div className="mini-ok big">{msg}</div> : null}
      <div className="m-row">
        <button className="btn primary" type="button" disabled={busy} onClick={() => save(true)}><Ic n="sparkles" s={15} /> {editMode ? "سیو کن" : "روشنم کن"}</button>
        {editMode ? <button className="btn ghost danger" type="button" disabled={busy} onClick={() => save(false)}><Ic n="x" s={15} /> خاموشم کن</button> : null}
      </div>
    </div>
  );
}

/* ---------------- چت دونفره + دوز چالشی + پیشنهاد شروع ---------------- */
function RoomChat({ room, onBack, me }) {
  const [msgs, setMsgs] = useState([]);
  const [txt, setTxt] = useState("");
  const [peer, setPeer] = useState(room.peer || "؟");
  const [peerImg, setPeerImg] = useState(room.img || "");
  const [game, setGame] = useState(null);
  const [gerr, setGerr] = useState("");
  const boxRef = useRef(null);
  const lastTs = useRef(0);
  const seen = useRef(0);

  const poll = useCallback(async () => {
    const r = await api("/api/room/" + room.id + "?since=" + lastTs.current);
    if (r.ok && r.data) {
      if (r.data.peer) setPeer(r.data.peer);
      if (r.data.peerImg) setPeerImg(r.data.peerImg);
      if (r.data.game !== undefined && r.data.game !== null) setGame(r.data.game);
      if (r.data.game === null) setGame(null);
      if (Array.isArray(r.data.msgs) && r.data.msgs.length) {
        setMsgs((prev) => prev.concat(r.data.msgs));
        lastTs.current = r.data.msgs[r.data.msgs.length - 1].ts;
        // نوتیف برای پیام جدید طرف
        const lastMsg = r.data.msgs[r.data.msgs.length - 1];
        if (lastMsg.uid !== me && lastMsg.ts > seen.current) {
          try {
            const k = "mk:lastmsg:" + room.id;
            const last = Number(localStorage.getItem(k) || 0);
            if (last > 0 && typeof Notification !== "undefined" && Notification.permission === "granted") {
              new Notification("مخ‌یار 💬", { body: peer + ": " + lastMsg.text.slice(0, 60) });
            }
            if (lastMsg.ts > last) localStorage.setItem(k, String(lastMsg.ts));
          } catch {}
        }
        seen.current = Math.max(seen.current, lastMsg.ts);
      }
    }
  }, [room.id, me, peer]);
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
    seen.current = Math.max(seen.current, now);
    await api("/api/room/" + room.id + "/msg", { method: "POST", body: { text } });
  };

  const suggestOpener = () => {
    setTxt(OPENERS[Math.floor(Math.random() * OPENERS.length)]);
  };

  const sendReact = async (r) => {
    const now = Date.now();
    setMsgs((p) => p.concat([{ uid: me, ts: now, text: "", react: r }]));
    seen.current = Math.max(seen.current, now);
    await api("/api/room/" + room.id + "/msg", { method: "POST", body: { react: r } });
  };

  const gameApi = async (body) => {
    const r = await api("/api/room/" + room.id + "/game", { method: "POST", body });
    if (r.ok && r.data) { setGame(r.data.game); setGerr(""); }
    else setGerr((r.data && r.data.message) || "الان نشد");
  };

  const myTurn = game && game.turn === me && !game.over;
  const mySym = game ? (game.x === me ? "♥" : "✿") : "";

  return (
    <div className="roomchat">
      <header className="roomhead">
        <button className="btn ghost sm" type="button" onClick={onBack}><Ic n="chev" s={15} style={{ transform: "rotate(90deg)" }} /></button>
        {peerImg ? <img className="hi-ava" src={peerImg} alt="" /> : <span className="hi-ico"><Ic n="user" s={16} /></span>}
        <b>{peer}</b>
      </header>

      {game ? (
        <div className="rgame card">
          <div className="ip-head">
            <h3><Ic n="smile" s={15} /> دوز چالشی {mySym ? <span className="dim small">(تو {mySym})</span> : null}</h3>
            {game.over ? (
              <button className="btn primary sm" type="button" onClick={() => gameApi({ new: true })}><Ic n="refresh" s={13} /> دوباره</button>
            ) : (
              <button className="btn ghost sm danger" type="button" onClick={() => gameApi({ end: true })}><Ic n="x" s={13} /> تمام</button>
            )}
          </div>
          <p className="dim small center">{game.over === -1 ? "مساوی شد!" : game.over ? (game.over === me ? "بردی! 🎉" : "باختی؛ ریمچ؟") : myTurn ? "نوبت توئه" : "نوبت طرفه…"}</p>
          <div className="ttt-grid sm">
            {game.bd.map((v, i) => (
              <button key={i} type="button" className={"ttc" + (v === "♥" ? " me" : v === "✿" ? " bot" : "")} disabled={!!v || !myTurn}
                onClick={() => gameApi({ i })}>{v}</button>
            ))}
          </div>
          {gerr ? <p className="anserr center">{gerr}</p> : null}
        </div>
      ) : (
        <button className="btn ghost gstart" type="button" onClick={() => gameApi({ new: true })}><Ic n="smile" s={15} /> دوز چالشی بزنیم؟ 🎮</button>
      )}

      <div className="roombox" ref={boxRef}>
        {msgs.length === 0 ? <p className="dim small center">اولین حرف رو بزن؛ چیزی که توی دلت هست رو بگو 😊</p> : null}
        {msgs.map((m, i) =>
          m.react ? (
            <div key={m.ts + "-" + i} className={"dreact" + (m.uid === me ? " mine" : "")}>
              <Ic n={(REACTS.find((r) => r[0] === m.react) || [null, "star"])[1]} s={15} />
            </div>
          ) : (
            <div key={m.ts + "-" + i} className={"dmsg" + (m.uid === me ? " mine" : "")}>
              <div className="dm-b">{m.text}</div>
            </div>
          )
        )}
      </div>
      <div className="reactrow">
        {REACTS.map(([r, ic]) => (
          <button key={r} type="button" className="rbtn" onClick={() => sendReact(r)}><Ic n={ic} s={15} /></button>
        ))}
      </div>
      <div className="ansrow roomrow">
        <button className="btn ghost sm" type="button" onClick={suggestOpener} title="پیشنهاد شروع"><Ic n="wand" s={15} /></button>
        <input className="ansinp" dir="rtl" value={txt} maxLength={500} placeholder="بنویس…" onChange={(e) => setTxt(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} />
        <button className="btn primary" type="button" onClick={send}><Ic n="send" s={16} /></button>
      </div>
    </div>
  );
}
