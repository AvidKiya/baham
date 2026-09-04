"use client";
// ---------------------------------------------------------------------------
// components/app/HistoryTab.jsx — تاریخچه: چت‌ها + دعوت‌نامه‌ها + جست‌وجو
// ---------------------------------------------------------------------------
import { useState, useEffect } from "react";
import { api } from "@/lib/appauth";
import { Ic } from "@/lib/icons";

const safeDec = (u) => { try { return decodeURI(u); } catch { return u; } };

const faTime = (ts) => {
  try {
    return new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(ts));
  } catch { return ""; }
};

const MODE_LBL = { reply: "پاسخ", opener: "شروع", rewrite: "بازنویسی", analyze: "تحلیل", date: "قرار" };

export default function HistoryTab({ user }) {
  const [seg, setSeg] = useState("chats");
  const [items, setItems] = useState({ chats: [], invites: [] });
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(null);
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    const r = await api("/api/history");
    if (r.ok && r.data && r.data.history) setItems({ chats: r.data.history.chats || [], invites: r.data.history.invites || [] });
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const del = async (id, kind) => {
    const r = await api(`/api/history?id=${encodeURIComponent(id)}&t=${kind === "chats" ? "chat" : "invite"}`, { method: "DELETE" });
    if (r.ok) { setOpen(null); load(); }
  };

  const copy = async (t) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(t);
      else {
        const ta = document.createElement("textarea");
        ta.value = t; document.body.appendChild(ta); ta.select();
        document.execCommand("copy"); ta.remove();
      }
    } catch {}
  };

  const ql = q.trim().toLowerCase();
  const list = (items[seg] || []).filter((x) => !ql || String(x.title || "").toLowerCase().includes(ql) || JSON.stringify(x.data || {}).toLowerCase().includes(ql));

  return (
    <div className="histtab">
      <header className="tabhead">
        <h2><Ic n="clock" s={20} /> تاریخچه</h2>
        <p>هر چی پرسیدی و ساختی، همینه</p>
      </header>

      <div className="seg glass" role="tablist" aria-label="نوع تاریخچه">
        <button className={seg === "chats" ? "on" : ""} type="button" role="tab" aria-selected={seg === "chats"} onClick={() => setSeg("chats")}>
          <Ic n="chatSpark" s={15} /> چت‌های یار <em>{items.chats.length}</em>
        </button>
        <button className={seg === "invites" ? "on" : ""} type="button" role="tab" aria-selected={seg === "invites"} onClick={() => setSeg("invites")}>
          <Ic n="invite" s={15} /> دعوت‌نامه‌ها <em>{items.invites.length}</em>
        </button>
      </div>

      <label className="hsearch card">
        <Ic n="search" s={17} />
        <input placeholder="دنبال چی می‌گردی؟" value={q} onChange={(e) => setQ(e.target.value)} />
        {q ? <button type="button" aria-label="پاک کردن" onClick={() => setQ("")}><Ic n="x" s={14} /></button> : null}
      </label>

      {loading ? (
        <div className="empty card"><b>یه لحظه…</b></div>
      ) : list.length === 0 ? (
        <div className="empty card">
          <span className="eico"><Ic n={seg === "chats" ? "chatSpark" : "invite"} s={26} /></span>
          <b>{q ? "چیزی پیدا نشد" : seg === "chats" ? "هنوز گپی نزدی" : "هنوز چیزی نساختی"}</b>
          <p>{q ? "یه چیز دیگه امتحان کن." : "اولیش رو از چت‌یار یا ساخت درخواست شروع کن."}</p>
        </div>
      ) : (
        <div className="histlist">
          {list.map((x) => (
            <div key={x.id} className={"histitem card" + (open === x.id ? " open" : "")}>
              <button className="hi-row" type="button" onClick={() => setOpen(open === x.id ? null : x.id)}>
                <span className="hi-ico"><Ic n={seg === "chats" ? "chat" : "invite"} s={17} /></span>
                <span className="hi-body">
                  <b>{x.title || (seg === "chats" ? "چت" : "دعوت‌نامه")}</b>
                  {seg === "chats" && x.data && x.data.mode ? <i className="hi-mode">{MODE_LBL[x.data.mode] || x.data.mode}</i> : null}
                  <span className="hi-time">{faTime(x.ts)}</span>
                </span>
                <span className="hi-chev"><Ic n="chev" s={16} /></span>
                <span className="hi-x" role="button" aria-label="حذف" onClick={(e) => { e.stopPropagation(); del(x.id, seg); }}><Ic n="trash" s={15} /></span>
              </button>
              {open === x.id ? (
                <div className="hi-detail">
                  {seg === "chats" ? (
                    <div className="hi-q"><b>تو:</b> {x.data && x.data.q}{x.data && x.data.img ? " (با تصویر)" : ""}</div>
                  ) : (
                    <div className="hi-q"><b>لینک:</b></div>
                  )}
                  {seg === "chats" ? (
                    <div className="hi-a"><b>مخ‌یار:</b> {x.data && x.data.a}</div>
                  ) : (
                    <>
                      <div className="link-box"><span className="link-txt" dir="ltr">{typeof location !== "undefined" ? location.origin : ""}{x.data && x.data.url ? safeDec(x.data.url) : ""}</span></div>
                      <div className="m-row">
                        <a className="btn ghost sm" href={x.data && x.data.url} target="_blank" rel="noopener"><Ic n="eye" s={15} /> باز کردن</a>
                        <button className="btn ghost sm" type="button" onClick={() => copy((x.data && x.data.url) || "")}><Ic n="copy" s={15} /> کپی</button>
                      </div>
                    </>
                  )}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
