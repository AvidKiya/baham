"use client";
// ---------------------------------------------------------------------------
// components/app/CreateTab.jsx — ساخت درخواست: لینک دعوت‌نامه‌ی تعاملی
// اسم فارسی خام + تم + مناسبت؛ ذخیره در تاریخچه‌ی حساب.
// ---------------------------------------------------------------------------
import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/appauth";
import { Ic } from "@/lib/icons";

function cleanText(s, n) {
  return String(s || "").replace(/\s+/g, " ").trim().slice(0, n || 32);
}

export default function CreateTab({ cfg: cfgProp, user, go }) {
  const [cfg, setCfg] = useState(cfgProp || null);
  const [name, setName] = useState("");
  const [theme, setTheme] = useState(null);
  const [occ, setOcc] = useState(null);
  const [copied, setCopied] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  useEffect(() => {
    if (cfg) return;
    fetch("/api/config").then((r) => r.json()).then((c) => { const cfg2 = (c && c.config) || c; if (cfg2 && (cfg2.themes || cfg2.occasions)) setCfg(cfg2); }).catch(() => {});
  }, []);

  const themes = cfg && cfg.themes ? Object.keys(cfg.themes) : ["romantic", "violet", "wine", "candy", "sunset", "mint"];
  const themeNames = { romantic: "رمانتیک صورتی", violet: "بنفش", wine: "شرابی", candy: "آب‌نباتی", sunset: "غروب", mint: "نعنایی" };
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

  const copy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(fullLink);
      else {
        const ta = document.createElement("textarea");
        ta.value = fullLink; document.body.appendChild(ta); ta.select();
        document.execCommand("copy"); ta.remove();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };
  const share = async () => {
    const nav = navigator.share || navigator.webkitShare;
    if (!nav) { copy(); return; }
    try {
      await nav.call(navigator, {
        title: "یه سؤال کوچیک دارم ازت…",
        text: cleanText(name, 32) ? "سلام «" + cleanText(name, 32) + "»، یه چیزی برات دارم…" : "یه چیزی برات دارم…",
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
        <p>لینکی بساز که «نه» ندارد</p>
      </header>

      <div className="card ccard">
        <p className="dim">طرف لینک را باز می‌کند، اسم خودش را می‌بیند، به سؤال بامزه جواب می‌دهد، شعر می‌خواند و قرار انتخاب می‌کند.</p>

        <label className="field">
          <span className="flbl"><Ic n="user" s={15} /> اسم طرف مقابل</span>
          <input className="inp" dir="rtl" maxLength={32} placeholder="مثلاً: سارا" value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <div className="flbl"><Ic n="palette" s={15} /> تم رنگی</div>
        <div className="theme-row">
          {themes.map((th) => (
            <button key={th} className={"swatch " + th + (theme === th ? " sel" : "")} type="button"
              title={themeNames[th] || th} aria-label={"تم " + (themeNames[th] || th)} onClick={() => setTheme(th)} />
          ))}
        </div>

        <div className="flbl"><Ic n="star" s={15} /> مناسبت (شعر و متن‌های خودش)</div>
        <div className="occ-row">
          {occasions.map((o) => (
            <button key={o.id} type="button" className={"occ-chip" + (occ === o.id ? " sel" : "")}
              aria-pressed={occ === o.id} onClick={() => setOcc(occ === o.id ? null : o.id)}>
              {o.label || o.id}
            </button>
          ))}
        </div>

        <div className="link-box">
          <span className="link-txt" dir="ltr">{fullLink}</span>
        </div>

        <div className="m-row">
          <button className="btn primary" type="button" onClick={copy}><Ic n={copied ? "check" : "copy"} s={16} /> {copied ? "کپی شد" : "کپی لینک"}</button>
          <button className="btn ghost" type="button" onClick={share}><Ic n="share" s={16} /> اشتراک‌گذاری</button>
          <a className="btn ghost" href={link} target="_blank" rel="noopener"><Ic n="eye" s={16} /> پیش‌نمایش</a>
        </div>
        <div className="m-row">
          <button className="btn ghost" type="button" onClick={saveToHistory}><Ic n="clock" s={16} /> ذخیره در تاریخچه</button>
        </div>
        {savedMsg ? <div className="mini-ok"><Ic n="check" s={14} /> {savedMsg}</div> : null}
        {!user ? <p className="dim small">برای ذخیره‌ی لینک‌ها در تاریخچه، <button className="linkish" type="button" onClick={() => go("settings")}>وارد شوید</button></p> : null}
      </div>

      <div className="card ccard howto">
        <h3><Ic n="info" s={17} /> چطور بفرستم؟</h3>
        <ol>
          <li>لینک را کپی یا مستقیم اشتراک بگذار (تلگرام، واتساپ، دایرکت).</li>
          <li>طرف لینک را باز می‌کند؛ اسم خودش را می‌بیند، جواب می‌دهد، شعر می‌خواند و قرار انتخاب می‌کند.</li>
          <li>آخرش می‌تواند جوابش را مستقیم در تلگرام برایت بفرستد.</li>
        </ol>
      </div>
    </div>
  );
}
