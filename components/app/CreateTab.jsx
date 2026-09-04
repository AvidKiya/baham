"use client";
// ---------------------------------------------------------------------------
// components/app/CreateTab.jsx — ساخت درخواست: لینک سریع + دعوت‌نامه‌های شخصی
// ---------------------------------------------------------------------------
import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/appauth";
import { Ic } from "@/lib/icons";
import InvitesPanel from "./InvitesPanel";

function cleanText(s, n) {
  return String(s || "").replace(/\s+/g, " ").trim().slice(0, n || 32);
}

export default function CreateTab({ cfg: cfgProp, user, go, onUnreplied }) {
  const [cfg, setCfg] = useState(cfgProp || null);
  const [name, setName] = useState("");
  const [theme, setTheme] = useState(null);
  const [occ, setOcc] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (cfg) return;
    fetch("/api/config").then((r) => r.json()).then((c) => { const cfg2 = (c && c.config) || c; if (cfg2 && (cfg2.themes || cfg2.occasions)) setCfg(cfg2); }).catch(() => {});
  }, []);

  const themes = cfg && cfg.themes ? Object.keys(cfg.themes) : ["romantic", "violet", "wine", "candy", "sunset", "mint"];
  const occasions = (cfg && cfg.occasions) || [];
  const defOcc = (cfg && cfg.defaultOccasion) || "love";

  const link = useCallback(() => {
    const q = [];
    const nm = cleanText(name, 32);
    if (nm) q.push("name=" + nm.replace(/ /g, "%20"));
    if (theme && theme !== ((cfg && cfg.theme) || "romantic")) q.push("theme=" + theme);
    if (occ && occ !== defOcc) q.push("occasion=" + occ);
    return "/invite" + (q.length ? "?" + q.join("&") : "");
  }, [name, theme, occ, cfg, defOcc])();

  const fullLink = typeof location !== "undefined" ? location.origin + link : link;
  const [savedMsg, setSavedMsg] = useState("");

  const copy = async () => {
    const full = typeof location !== "undefined" ? location.origin + link : link;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(full);
      else {
        const ta = document.createElement("textarea");
        ta.value = full; document.body.appendChild(ta); ta.select();
        document.execCommand("copy"); ta.remove();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };
  const share = async () => {
    const nav = navigator.share || navigator.webkitShare;
    if (!nav) { copy(); return; }
    const nm = cleanText(name, 32);
    try {
      await nav.call(navigator, {
        title: "یه سؤال کوچیک دارم ازت…",
        text: nm ? "سلام \"" + nm + "\"، یه چیزی برات دارم…" : "یه چیزی برات دارم…",
        url: fullLink,
      });
    } catch {}
  };
  const saveToHistory = async () => {
    if (!user) { go("settings"); return; }
    const nm = cleanText(name, 32);
    const r = await api("/api/history", {
      method: "POST",
      body: { type: "invite", title: nm || "لینک دعوت", data: { url: encodeURI(link), name: nm, theme: theme || "", occasion: occ || "" } },
    });
    setSavedMsg(r.ok ? "در تاریخچه ذخیره شد" : ((r.data && r.data.message) || "ذخیره نشد"));
    setTimeout(() => setSavedMsg(""), 2000);
  };

  return (
    <div className="createtab">
      <header className="tabhead">
        <h2><Ic n="invite" s={20} /> ساخت درخواست</h2>
        <p>لینکی که «نه» نداره — یا یه دعوت‌نامه‌ی شخصی با پنل و جواب</p>
      </header>

      <div className="card ccard">
        <p className="dim small">این یکی «سریع»ه: لینک می‌سازی می‌فرستی، طرف بازش می‌کنه، یه سوال بامزه می‌بینه و… «نه» جواب نمی‌گیره.</p>

        <label className="field">
          <span className="flbl"><Ic n="user" s={15} /> اسم طرف</span>
          <input className="inp" dir="rtl" maxLength={32} placeholder="مثلاً: سارا" value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <div className="flbl"><Ic n="palette" s={15} /> تم رنگی</div>
        <div className="theme-row">
          {themes.map((th) => (
            <button key={th} className={"swatch " + th + (theme === th ? " sel" : "")} type="button"
              title={th} aria-label={"تم " + th} onClick={() => setTheme(th)} />
          ))}
        </div>

        {occasions.length ? (
          <>
            <div className="flbl"><Ic n="star" s={15} /> مناسبت</div>
            <div className="occ-row">
              {occasions.map((o) => (
                <button key={o.id} type="button" className={"occ-chip" + (occ === o.id ? " sel" : "")}
                  aria-pressed={occ === o.id} onClick={() => setOcc(occ === o.id ? null : o.id)}>
                  {o.label || o.id}
                </button>
              ))}
            </div>
          </>
        ) : null}

        <div className="link-box">
          <span className="link-txt" dir="ltr">{fullLink}</span>
        </div>

        <div className="m-row">
          <button className="btn primary" type="button" onClick={copy}><Ic n={copied ? "check" : "copy"} s={16} /> {copied ? "کپی شد، بفرستش" : "کپی لینک"}</button>
          <button className="btn ghost" type="button" onClick={share}><Ic n="share" s={16} /> بفرستش</button>
          <a className="btn ghost" href={link} target="_blank" rel="noopener"><Ic n="eye" s={16} /> یه نگاه بندازم</a>
        </div>
        <div className="m-row">
          <button className="btn ghost" type="button" onClick={saveToHistory}><Ic n="clock" s={16} /> ذخیره در تاریخچه</button>
        </div>
        {savedMsg ? <div className="mini-ok"><Ic n="check" s={14} /> {savedMsg}</div> : null}
      </div>

      <InvitesPanel user={user} go={go} onUnreplied={onUnreplied} />
    </div>
  );
}
