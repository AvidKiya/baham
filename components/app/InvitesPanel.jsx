"use client";
// ---------------------------------------------------------------------------
// components/app/InvitesPanel.jsx — پنل دعوت‌نامه‌های شخصی:
// ساخت، شخصی‌سازی (سوال/موزیک/تم/مناسبت/نامه)، بازدید، پیام‌ها و جواب دادن
// ---------------------------------------------------------------------------
import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/appauth";
import { Ic } from "@/lib/icons";
import { buzz } from "@/lib/fx";

const OCCS = [
  { id: "love", t: "رُل زدن" },
  { id: "marriage", t: "خواستگاری" },
  { id: "friendship", t: "دوستی" },
  { id: "business", t: "همکاری" },
];
const THEMES = [
  { id: "romantic", t: "صورتی", c: "#ff6b9d" },
  { id: "violet", t: "بنفش", c: "#a78bfa" },
  { id: "wine", t: "شرابی", c: "#a3233c" },
  { id: "candy", t: "آب‌نباتی", c: "#f9a8d4" },
  { id: "sunset", t: "غروب", c: "#fb923c" },
  { id: "mint", t: "نعنایی", c: "#34d399" },
];
const MUSICS = [
  { id: "", t: "موزیک پیش‌فرض سایت" },
  { id: "none", t: "بدون موزیک" },
];
const faTime = (ts) => { try { return ts ? new Intl.DateTimeFormat("fa-IR", { dateStyle: "short", timeStyle: "short" }).format(new Date(ts)) : "—"; } catch { return "—"; } };

export default function InvitesPanel({ user, go, onUnreplied }) {
  const [list, setList] = useState(null);
  const [busy, setBusy] = useState(false);
  const [openNew, setOpenNew] = useState(false);
  const [panel, setPanel] = useState(null); // { id, tab: "edit"|"msgs" }
  const [full, setFull] = useState(null); // دعوت‌نامه‌ی کامل با پیام‌ها

  const load = useCallback(async () => {
    if (!user) return;
    const r = await api("/api/invites");
    if (r.ok && r.data) {
      setList(r.data.invites || []);
      if (onUnreplied) onUnreplied((r.data.invites || []).reduce((a, x) => a + (x.unreplied || 0), 0));
    } else setList([]);
  }, [user, onUnreplied]);
  useEffect(() => { load(); }, [load]);

  const openPanel = async (id, tab) => {
    setPanel({ id, tab });
    const r = await api("/api/invites?id=" + id);
    if (r.ok && r.data) setFull(r.data.invite);
    load();
  };

  if (!user) {
    return (
      <div className="card ccard">
        <h3><Ic n="invite" s={17} /> دعوت‌نامه‌های شخصی</h3>
        <p className="dim small">با حساب، برای هر نفر یه دعوت‌نامه‌ی اختصاصی بساز؛ بازدیدش و جوابش هم همین‌جا می‌آید.</p>
        <button className="btn ghost" type="button" onClick={() => go("settings")}><Ic n="user" s={16} /> اول وارد شو</button>
      </div>
    );
  }

  return (
    <div className="invpanel">
      <div className="card ccard">
        <div className="ip-head">
          <h3><Ic n="invite" s={17} /> دعوت‌نامه‌های شخصی من</h3>
          <button className="btn primary sm" type="button" onClick={() => { setOpenNew(!openNew); setPanel(null); }}><Ic n="plus" s={15} /> جدید</button>
        </div>
        {list === null ? <p className="dim small">یه لحظه…</p> : list.length === 0 && !openNew ? (
          <p className="dim small">هنوز نساختی. «جدید» رو بزن؛ لینک اختصاصی می‌گیری که بازدید و جوابش اینجا بیاید.</p>
        ) : null}

        {openNew ? <NewInvite onDone={async (slug) => { setOpenNew(false); await load(); if (slug) openPanel(slug, "edit"); }} /> : null}

        {list && list.length ? (
          <div className="iplist">
            {list.map((x) => (
              <div key={x.id} className={"ipitem card" + (panel && panel.id === x.id ? " open" : "")}>
                <button className="hi-row" type="button" onClick={() => (panel && panel.id === x.id ? (setPanel(null), setFull(null)) : openPanel(x.id, "edit"))}>
                  <span className="hi-ico"><Ic n="invite" s={17} /></span>
                  <span className="hi-body">
                    <b>{x.name}</b>
                    <span className="hi-time">
                      {x.views} بازدید · {x.msgs} پیام{x.unreplied ? <i className="newdot">{x.unreplied} جدید</i> : null}
                    </span>
                  </span>
                  <span className="hi-chev"><Ic n="chev" s={16} /></span>
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {panel && full ? (
        panel.tab === "edit" ? (
          <EditInvite inv={full} onSaved={() => { load(); }} onMsgs={() => openPanel(panel.id, "msgs")} onDeleted={async () => { setPanel(null); setFull(null); load(); }} />
        ) : (
          <MsgsPanel inv={full} onBack={() => openPanel(panel.id, "edit")} onReplied={() => { load(); openPanel(panel.id, "msgs"); }} />
        )
      ) : null}
    </div>
  );
}

function NewInvite({ onDone }) {
  const [name, setName] = useState("");
  const [occ, setOcc] = useState("love");
  const [theme, setTheme] = useState("romantic");
  const [music, setMusic] = useState("");
  const [qText, setQText] = useState("");
  const [letter, setLetter] = useState("");
  const [tg, setTg] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const create = async () => {
    if (busy) return;
    if (!name.trim()) { setErr("اسم طرف رو بنویس"); return; }
    setBusy(true); setErr("");
    const r = await api("/api/invites", { method: "POST", body: { name: name.trim(), occasion: occ, theme, music, tg: tg.trim(), qText: qText.trim(), letter: letter.trim() } });
    setBusy(false);
    if (r.ok && r.data && r.data.invite) { try { buzz(10); } catch {} onDone(r.data.invite.id); }
    else setErr((r.data && r.data.message) || "ساخته نشد؛ دوباره امتحان کن");
  };

  return (
    <div className="newinv">
      <p className="flbl">اسم طرف</p>
      <input className="inp" dir="rtl" maxLength={32} placeholder="مثلاً: لیلا" value={name} onChange={(e) => setName(e.target.value)} />
      <p className="flbl">مناسبت</p>
      <div className="occ-row">
        {OCCS.map((o) => (
          <button key={o.id} type="button" className={"occ-chip" + (occ === o.id ? " sel" : "")} onClick={() => setOcc(o.id)}>{o.t}</button>
        ))}
      </div>
      <p className="flbl">تم</p>
      <div className="theme-row">
        {THEMES.map((t) => (
          <button key={t.id} type="button" title={t.t} aria-label={"تم " + t.t} className={"swatch " + t.id + (theme === t.id ? " sel" : "")} style={{ background: t.c }} onClick={() => setTheme(t.id)} />
        ))}
      </div>
      <p className="flbl">موزیک</p>
      <div className="occ-row">
        {MUSICS.map((m) => (
          <button key={m.id} type="button" className={"occ-chip" + (music === m.id ? " sel" : "")} onClick={() => setMusic(m.id)}>{m.t}</button>
        ))}
      </div>
      <p className="flbl">یوزرنیم تلگرام تو (برای دکمه‌ی جواب)</p>
      <input className="inp" dir="ltr" placeholder="myusername" maxLength={32} value={tg} onChange={(e) => setTg(e.target.value.replace(/[^A-Za-z0-9_]/g, ""))} />
      <p className="flbl">متن سوال (خالی یعنی پیش‌فرض)</p>
      <input className="inp" dir="rtl" maxLength={140} placeholder="مثلاً: فردا کافه‌ی همیشگی، میای؟" value={qText} onChange={(e) => setQText(e.target.value)} />
      <p className="flbl">حرف آخر صفحه‌ی پایانی (اختیاری)</p>
      <textarea className="inp" style={{ minHeight: 76, padding: "10px 14px", resize: "none" }} dir="rtl" maxLength={400} placeholder="مثلاً: هر جوابی بدی برام مهمه، فقط روم نکن…" value={letter} onChange={(e) => setLetter(e.target.value)} />
      {err ? <div className="mini-err big">{err}</div> : null}
      <button className="btn primary big" type="button" onClick={create} disabled={busy}>{busy ? "یه لحظه…" : "بساز"}</button>
    </div>
  );
}

function EditInvite({ inv, onSaved, onMsgs, onDeleted }) {
  const [name, setName] = useState(inv.name);
  const [occ, setOcc] = useState(inv.occasion);
  const [theme, setTheme] = useState(inv.theme);
  const [music, setMusic] = useState(inv.music);
  const [qText, setQText] = useState(inv.qText || "");
  const [letter, setLetter] = useState(inv.letter || "");
  const [tg, setTg] = useState(inv.tg || "");
  const [msg, setMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const [arm, setArm] = useState(false);
  const link = typeof location !== "undefined" ? location.origin + "/invite?i=" + inv.id : "/invite?i=" + inv.id;

  const save = async () => {
    const r = await api("/api/invites", { method: "PUT", body: { invite: { id: inv.id, name: name.trim(), occasion: occ, theme, music, tg: tg.trim(), qText: qText.trim(), letter: letter.trim() } } });
    setMsg(r.ok ? "سیو شد" : "سیو نشد؛ دوباره امتحان کن");
    setTimeout(() => setMsg(""), 2000);
    if (r.ok) onSaved();
  };
  const del = async () => {
    if (!arm) { setArm(true); setTimeout(() => setArm(false), 3500); return; }
    await api("/api/invites?id=" + inv.id, { method: "DELETE" });
    onDeleted();
  };
  const copy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(link);
      else { const ta = document.createElement("textarea"); ta.value = link; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove(); }
      setCopied(true); setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  return (
    <div className="card ccard">
      <div className="ip-head">
        <h3><Ic n="gear" s={16} /> شخصی‌سازی «{inv.name}»</h3>
        <button className="btn ghost sm" type="button" onClick={onMsgs}><Ic n="chat" s={15} /> پیام‌ها</button>
      </div>
      <div className="statrow">
        <div className="stat"><Ic n="eye" s={15} /><b>{inv.views}</b><span>بازدید</span></div>
        <div className="stat"><Ic n="chat" s={15} /><b>{(inv.msgsList || []).length}</b><span>پیام</span></div>
        <div className="stat"><Ic n="clock" s={15} /><b>{faTime(inv.lastView)}</b><span>آخرین بازدید</span></div>
      </div>
      <div className="link-box"><span className="link-txt" dir="ltr">{link}</span></div>
      <div className="m-row">
        <button className="btn primary sm" type="button" onClick={copy}><Ic n={copied ? "check" : "copy"} s={15} /> {copied ? "کپی شد" : "کپی لینک"}</button>
        <a className="btn ghost sm" href={"/invite?i=" + inv.id} target="_blank" rel="noopener"><Ic n="eye" s={15} /> پیش‌نمایش</a>
      </div>
      <div className="newinv">
        <p className="flbl">اسم</p>
        <input className="inp" dir="rtl" maxLength={32} value={name} onChange={(e) => setName(e.target.value)} />
        <p className="flbl">مناسبت</p>
        <div className="occ-row">{OCCS.map((o) => <button key={o.id} type="button" className={"occ-chip" + (occ === o.id ? " sel" : "")} onClick={() => setOcc(o.id)}>{o.t}</button>)}</div>
        <p className="flbl">تم</p>
        <div className="theme-row">{THEMES.map((t) => <button key={t.id} type="button" title={t.t} aria-label={"تم " + t.t} className={"swatch " + t.id + (theme === t.id ? " sel" : "")} style={{ background: t.c }} onClick={() => setTheme(t.id)} />)}</div>
        <p className="flbl">موزیک</p>
        <div className="occ-row">{MUSICS.map((m) => <button key={m.id} type="button" className={"occ-chip" + (music === m.id ? " sel" : "")} onClick={() => setMusic(m.id)}>{m.t}</button>)}</div>
        <p className="flbl">یوزرنیم تلگرام تو</p>
        <input className="inp" dir="ltr" placeholder="myusername" maxLength={32} value={tg} onChange={(e) => setTg(e.target.value.replace(/[^A-Za-z0-9_]/g, ""))} />
        <p className="flbl">متن سوال</p>
        <input className="inp" dir="rtl" maxLength={140} value={qText} onChange={(e) => setQText(e.target.value)} />
        <p className="flbl">حرف آخر</p>
        <textarea className="inp" style={{ minHeight: 76, padding: "10px 14px", resize: "none" }} dir="rtl" maxLength={400} value={letter} onChange={(e) => setLetter(e.target.value)} />
      </div>
      {msg ? <div className="mini-ok big">{msg}</div> : null}
      <div className="m-row">
        <button className="btn primary" type="button" onClick={save}><Ic n="check" s={16} /> سیو کن</button>
        <button className={"btn ghost danger sm" + (arm ? " arm" : "")} type="button" onClick={del}><Ic n="trash" s={15} /> {arm ? "مطمئنی؟ دوباره بزن" : "حذف"}</button>
      </div>
    </div>
  );
}

function MsgsPanel({ inv, onBack, onReplied }) {
  const [replies, setReplies] = useState({});
  const msgs = inv.msgsList || [];
  const sendReply = async (m) => {
    const t = (replies[m.id] || "").trim();
    if (!t) return;
    const r = await api("/api/invites", { method: "PUT", body: { invite: { id: inv.id, replyTo: m.id, reply: t } } });
    if (r.ok) { setReplies((p) => ({ ...p, [m.id]: "" })); onReplied(); }
  };
  return (
    <div className="card ccard">
      <div className="ip-head">
        <h3><Ic n="chat" s={16} /> پیام‌های «{inv.name}»</h3>
        <button className="btn ghost sm" type="button" onClick={onBack}><Ic n="gear" s={15} /> شخصی‌سازی</button>
      </div>
      {msgs.length === 0 ? (
        <p className="dim small">هنوز هیچ پیامی نیامده. وقتی طرف جوابش رو بفرسته، همین‌جا می‌بینی.</p>
      ) : (
        <div className="msglist">
          {msgs.map((m) => (
            <div key={m.id} className={"imsg" + (m.reply ? "" : " new")}>
              <div className="im-bubble">{m.text}</div>
              <span className="im-time">{faTime(m.ts)}</span>
              {m.reply ? (
                <div className="im-reply"><b>جوابت:</b> {m.reply}</div>
              ) : (
                <div className="im-row">
                  <input className="inp" placeholder="جوابت رو بنویس…" value={replies[m.id] || ""} onChange={(e) => setReplies((p) => ({ ...p, [m.id]: e.target.value }))} maxLength={300} />
                  <button className="btn primary sm" type="button" onClick={() => sendReply(m)}>بفرست</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
