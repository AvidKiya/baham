"use client";
// ---------------------------------------------------------------------------
// Landing.jsx — desktop split hero (left: copy, right: phone mockup running
// the real experience). On mobile the mockup hides and the CTA enters the
// fullscreen app in-place.
// ---------------------------------------------------------------------------
import { useState, useEffect, useCallback } from "react";
import { DEFAULT_CONFIG } from "../shared/config.mjs";
import { T, cleanText, fetchConfig } from "@/lib/core";
import { RM, fxStart } from "@/lib/fx";
import Experience from "@/components/Experience";
import { HEART_SVG } from "@/components/Experience";

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
        <div className="blob b1"></div>
        <div className="blob b2"></div>
        <div className="blob b3"></div>
      </div>
      <div className="grain" aria-hidden="true"></div>
      <div className="vignette" aria-hidden="true"></div>

      <div id="home">
        <section className="hero" id="hero">
          <span className="badge">{T(cfg, "landingBadge", "یه دعوت‌نامه‌ی کوچیک 💌")}</span>
          <h1 className="rise-in">
            {T(cfg, "landingH1a", "یه سؤال رو بپرس…")}
            <br />
            <span className="grad">{T(cfg, "landingH1b", "بذار بله بگه ❤️")}</span>
          </h1>
          <p className="sub rise-in" style={{ animationDelay: "90ms" }}>
            {T(cfg, "landingSub", "یه تجربه‌ی کوچیک و شخصی برای یه آدم خاص؛ لینکش رو بفرست، بقیه‌ش با دکمه‌ی «آره».")}
          </p>
          <div className="hero-cta rise-in" style={{ animationDelay: "180ms" }}>
            <button className="btn primary xl" type="button" onClick={() => setBuilder(true)}>
              {T(cfg, "landingCta", "ساخت لینک شخصی ✨")}
            </button>
            <button className="btn ghost xl" type="button" onClick={onTry}>
              {T(cfg, "landingTry", "تجربه‌ی نمونه 👀")}
            </button>
            <a className="btn ghost xl" href="/admin">
              پنل مدیریت ⚙️
            </a>
          </div>
          <p className="tiny rise-in" style={{ animationDelay: "270ms" }}>
            {T(cfg, "landingFeatures", "بدون ثبت‌نام · بدون ردیابیِ اذیت‌کننده · فقط یه سؤال ☺️")}
          </p>
        </section>

        <div className="phone-col">
          <div id="phoneShell" className="phone-shell">
            <div className="phone">
              <div className="island" aria-hidden="true"></div>
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
  const [copied, setCopied] = useState(false);
  const link = useCallback(() => {
    const base = location.origin + "/invite";
    const q = [];
    const nm = cleanText(name, 32);
    if (nm) q.push("name=" + encodeURIComponent(nm));
    if (theme && theme !== (cfg.theme || "romantic")) q.push("theme=" + theme);
    return base + (q.length ? "?" + q.join("&") : "");
  }, [name, theme, cfg.theme])();

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
  const themeNames = { romantic: "روتیک صورتی", violet: "بنفش", wine: "شرابی" };

  return (
    <div className="m-back in" role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="m-card glass">
        <h3 className="m-title">{T(cfg, "builderTitle", "لینک شخصی‌ات رو بساز")}</h3>
        <label className="m-label" htmlFor="builderName">
          {T(cfg, "builderNamePh", "اسمش چیه؟")}
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
            {T(cfg, "builderOpen", "باز کردن")}
          </a>
          {typeof navigator !== "undefined" && (navigator.share || navigator.webkitShare) ? (
            <button className="btn ghost" type="button" onClick={share}>
              {T(cfg, "builderShare", "فرستادن")}
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
