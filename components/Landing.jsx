"use client";
// ---------------------------------------------------------------------------
// Landing.jsx — desktop split hero (left: copy, right: phone mockup running
// the real experience). On mobile the mockup hides and the CTA enters the
// fullscreen app in-place.
// ---------------------------------------------------------------------------
import { useState, useEffect, useCallback } from "react";
import { DEFAULT_CONFIG } from "../shared/config.mjs";
import { T, cleanText, fetchConfig } from "@/lib/core";
import { EmoText } from "@/lib/emoji";
import { RM, fxStart } from "@/lib/fx";
import Experience, { Credit } from "@/components/Experience";
import { HEART_SVG } from "@/components/Experience";

const E2 = (cfg, key, fb) => <EmoText text={T(cfg, key, fb)} />;

export default function Landing({ initialConfig }) {
  const [cfg, setCfg] = useState(initialConfig || DEFAULT_CONFIG);
  const [builder, setBuilder] = useState(false);
  const [mode, setMode] = useState("landing");

  useEffect(() => {
    document.body.dataset.mode = "landing";
    fetchConfig().then((c) => {
      if (c) setCfg(c);
    });
  }, []);

  const enterApp = () => {
    setMode("invite");
    document.body.dataset.mode = "invite";
    fxStart();
  };
  const flashPhone = () => {
    const ph = document.getElementById("phoneShell");
    if (ph) {
      ph.classList.remove("flash");
      void ph.offsetWidth;
      ph.classList.add("flash");
      try {
        ph.scrollIntoView({ behavior: RM ? "auto" : "smooth", block: "center" });
      } catch (e) {}
    }
  };
  const onTry = () => {
    if (window.matchMedia && window.matchMedia("(min-width: 920px)").matches) flashPhone();
    else enterApp();
  };

  return (
    <>
      <div className="bg" aria-hidden="true">
        <div className="aurora a1"></div>
        <div className="aurora a2"></div>
        <div className="blob b1"></div>
        <div className="blob b2"></div>
        <div className="blob b3"></div>
      </div>
      <div className="grain" aria-hidden="true"></div>
      <div className="vignette" aria-hidden="true"></div>

      <div id="home">
        <section className="hero" id="hero">
          <span className="badge">{E2(cfg, "landingBadge", "یه دعوت‌نامه‌ی کوچیک 💌")}</span>
          <h1 className="rise-in">
            {E2(cfg, "landingH1a", "یه سؤال رو بپرس…")}
            <br />
            <span className="grad">{E2(cfg, "landingH1b", "بذار بله بگه ❤️")}</span>
          </h1>
          <p className="sub rise-in" style={{ animationDelay: "90ms" }}>
            {E2(cfg, "landingSub", "یه تجربه‌ی کوچیک و شخصی برای یه آدم خاص؛ لینکش رو بفرست، بقیه‌ش با دکمه‌ی «آره».")}
          </p>
          <div className="hero-cta rise-in" style={{ animationDelay: "180ms" }}>
            <button className="btn primary xl" type="button" onClick={() => setBuilder(true)}>
              {E2(cfg, "landingCta", "ساخت لینک شخصی ✨")}
            </button>
            <button className="btn ghost xl" type="button" onClick={onTry}>
              {E2(cfg, "landingTry", "تجربه‌ی نمونه 👀")}
            </button>
            <a className="btn ghost xl" href="/admin">
              پنل مدیریت ⚙️
            </a>
          </div>
          <p className="tiny rise-in" style={{ animationDelay: "270ms" }}>
            {E2(cfg, "landingFeatures", "بدون ثبت‌نام · بدون ردیابیِ اذیت‌کننده · فقط یه سؤال ☺️")}
          </p>
          <p className="tiny credit-line rise-in" style={{ animationDelay: "360ms" }}>
            <Credit cfg={cfg} />
          </p>
        </section>

        <div className="phone-col">
          <div id="phoneShell" className="phone-shell">
            <div className="phone">
              <div className="island" aria-hidden="true"></div>
              <div className="home-bar" aria-hidden="true"></div>
              <div className="screen-glow" aria-hidden="true"></div>
              <Experience config={cfg} mode={mode} />
            </div>
          </div>
        </div>
      </div>

      {builder ? <BuilderModal cfg={cfg} onClose={() => setBuilder(false)} /> : null}
    </>
  );
}

function BuilderModal({ cfg, onClose }) {
  const [name, setName] = useState("");
  const [theme, setTheme] = useState(null);
  const [occ, setOcc] = useState(null);
  const [copied, setCopied] = useState(false);
  const link = useCallback(() => {
    const base = location.origin + "/invite";
    const q = [];
    const nm = cleanText(name, 32);
    if (nm) q.push("name=" + nm); // فارسیِ خام — خوانا و مستقیم، بدون کدشدن
    if (theme && theme !== (cfg.theme || "romantic")) q.push("theme=" + theme);
    if (occ && occ !== (cfg.defaultOccasion || "love")) q.push("occasion=" + occ);
    return base + (q.length ? "?" + q.join("&") : "");
  }, [name, theme, occ, cfg.theme, cfg.defaultOccasion])();

  const copy = async () => {
    const url = link;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(url);
      else {
        const ta = document.createElement("textarea");
        ta.value = url;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (e) {}
  };
  const share = async () => {
    const nav = navigator.share || navigator.webkitShare;
    if (!nav) return;
    try {
      await nav.call(navigator, { title: document.title, text: "یه سؤال کوچیک دارم ازت… 👀", url });
    } catch (e) {}
  };
  const themes = Object.keys(cfg.themes || DEFAULT_CONFIG.themes);
  const themeNames = { romantic: "روتیک صورتی", violet: "بنفش", wine: "شرابی", candy: "آب‌نباتی", sunset: "غروب", mint: "نعنایی" };

  return (
    <div className="m-back in" role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="m-card glass">
        <h3 className="m-title">{E2(cfg, "builderTitle", "لینک شخصی‌ات رو بساز")}</h3>
        <label className="m-label" htmlFor="builderName">
          {E2(cfg, "builderNamePh", "اسمش چیه؟")}
        </label>
        <input
          id="builderName"
          className="m-input"
          maxLength={32}
          dir="rtl"
          placeholder="مثلاً: سارا"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <div className="theme-row">
          {themes.map((th) => (
            <button
              key={th}
              className={"swatch " + th + (theme === th ? " sel" : "")}
              type="button"
              title={themeNames[th] || th}
              aria-label={"تم " + (themeNames[th] || th)}
              onClick={() => setTheme(th)}
            />
          ))}
        </div>
        <div className="occ-row" role="group" aria-label="مناسبت دعوت">
          {(cfg.occasions || []).map((o) => (
            <button
              key={o.id}
              className={"occ-chip" + (occ === o.id ? " sel" : "")}
              type="button"
              aria-pressed={occ === o.id}
              onClick={() => setOcc(occ === o.id ? null : o.id)}
            >
              <EmoText text={(o.emoji || "💌") + " " + o.label} />
            </button>
          ))}
        </div>
        <div className="link-box glass">
          <span className="link-txt" dir="ltr">
            {link}
          </span>
        </div>
        <p className="m-preview">
          {cleanText(name, 32) ? 'سلام «' + cleanText(name, 32) + '» 👋 این لینک مخصوص خودشه' : "یه اسم بنویس تا لینک شخصی‌ش ساخته بشه"}
        </p>
        <div className="m-row">
          <button className="btn primary" type="button" onClick={copy}>
            {copied ? "کپی شد ✨" : T(cfg, "builderCopy", "کپی لینک")}
          </button>
          <a className="btn ghost" href={link} target="_blank" rel="noopener">
            {E2(cfg, "builderOpen", "باز کردن")}
          </a>
          {typeof navigator !== "undefined" && (navigator.share || navigator.webkitShare) ? (
            <button className="btn ghost" type="button" onClick={share}>
              {E2(cfg, "builderShare", "فرستادن")}
            </button>
          ) : null}
        </div>
        <button className="btn text" type="button" onClick={onClose}>
          بستن
        </button>
      </div>
    </div>
  );
}
