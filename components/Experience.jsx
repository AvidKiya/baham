"use client";
// ---------------------------------------------------------------------------
// Experience.jsx — the whole interactive flow (intro → question → yes/no →
// date → contract → final card), ported 1:1 from the vanilla version.
// ---------------------------------------------------------------------------
import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { DEFAULT_CONFIG } from "../shared/config.mjs";
import { T, cleanText, store, loadState, INITIAL_STATE, track, toFa, applyTheme } from "@/lib/core";
import { fxStart, confettiBurst, confettiCannons, confettiRain, heartsRain, chime, buzz, RM } from "@/lib/fx";
import { stickerSVG, STICKER_KINDS } from "@/lib/stickers";
import { cardBlob } from "@/lib/card";
import { EmoText } from "@/lib/emoji";
import { occasionOf } from "@/lib/occasion";
import Sticker from "@/components/Sticker";

/* ---------- creator credit ---------- */
const SOCIAL_ICONS = {
  instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.3" cy="6.7" r="1.3" fill="currentColor" stroke="none"/></svg>',
  telegram: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.9 4.4 19 19.2c-.2 1-.8 1.2-1.6.8l-4.5-3.3-2.2 2.1c-.2.2-.4.4-.9.4l.3-4.6 8.4-7.6c.4-.3-.1-.5-.6-.2L7.5 13.2 3 11.8c-1-.3-1-1 .2-1.5l17.3-6.7c.8-.3 1.5.2 1.4 1.1z"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.7 3H21l-7.3 8.3L22.2 21h-6.7l-5.2-6.2L4.3 21H1l7.8-8.9L1.8 3h6.9l4.7 5.7L17.7 3zm-1.2 16h1.9L6.2 4.9H4.2L16.5 19z"/></svg>',
  github: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1.7a10.3 10.3 0 0 0-3.3 20.1c.5.1.7-.2.7-.5v-1.9c-2.8.6-3.4-1.2-3.4-1.2-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.6-1.4-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.2-.4-1.3.1-2.6 0 0 .8-.3 2.7 1a9.4 9.4 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.3.2 2.4.1 2.6.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.9V21c0 .3.2.6.7.5A10.3 10.3 0 0 0 12 1.7z"/></svg>',
};
function Credit({ cfg, compact }) {
  const cr = (cfg && cfg.creator) || {};
  const links = cr.links || {};
  return (
    <span className="credit">
      <span className="credit-text">
        {E(cfg, "madeWith", "ساخته‌شده با ❤️ و کلی جسارت")}
        {cr.fa ? <> توسط <b className="credit-name">{cr.fa}</b></> : null}
        {cr.username ? <a className="credit-user" href={links.instagram || links.github || "#"} target="_blank" rel="noopener">{cr.username}</a> : null}
      </span>
      {!compact ? (
        <span className="credit-icons">
          {Object.entries(SOCIAL_ICONS).map(([k, svg]) =>
            links[k] ? (
              <a key={k} href={links[k]} target="_blank" rel="noopener" aria-label={k} dangerouslySetInnerHTML={{ __html: svg }} />
            ) : null
          )}
        </span>
      ) : null}
    </span>
  );
}

const Ctx = createContext(null);
const useApp = () => useContext(Ctx);
/** T() but with iPhone-style emoji images swapped in (JSX children only) */
const E = (cfg, key, fb) => <EmoText text={T(cfg, key, fb)} />;
export const HEART_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="lh" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff5c98"/><stop offset="1" stop-color="#b478ff"/></linearGradient></defs><path d="M12 21c-5.6-4.2-9-7.6-9-11.4C3 6.6 5.4 4.5 8 4.5c1.7 0 3.2.9 4 2.3.8-1.4 2.3-2.3 4-2.3 2.6 0 5 2.1 5 5.1 0 3.8-3.4 7.2-9 11.4z" fill="url(#lh)"/></svg>';

const rise = (i, cls) => ({ className: (cls ? cls + " " : "") + "rise-in", style: { animationDelay: `${i * 90 + 60}ms` } });

/* ============================== sticker ============================== */
// (separate file: components/Sticker.jsx)

/* ============================== music button ============================== */
function MusicButton({ cfg, toast }) {
  const [playing, setPlaying] = useState(false);
  const [available, setAvailable] = useState(!!cfg.music);
  const audioRef = useRef(null);

  const getAudio = useCallback(() => {
    if (!audioRef.current && cfg.music) {
      try {
        const a = new Audio();
        a.src = cfg.music;
        a.loop = true;
        a.volume = 0.4;
        a.preload = "none";
        a.addEventListener("error", () => {
          setAvailable(false);
          setPlaying(false);
          toast("موسیقی در دسترس نیست");
        });
        audioRef.current = a;
      } catch (e) {
        setAvailable(false);
      }
    }
    return audioRef.current;
  }, [cfg.music, toast]);

  const tryStart = useCallback(() => {
    if (!cfg.music || !available) return;
    const a = getAudio();
    if (!a) return;
    if (a.paused) {
      const p = a.play();
      if (p && p.then) p.then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  }, [cfg.music, available, getAudio]);

  const toggle = useCallback(() => {
    const a = getAudio();
    if (!a) return;
    if (a.paused) {
      const p = a.play();
      if (p && p.then) p.then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      a.pause();
      setPlaying(false);
    }
  }, [getAudio]);

  useEffect(() => {
    const onCta = () => tryStart();
    const onToggle = () => toggle();
    window.addEventListener("rol:cta", onCta);
    window.addEventListener("rol:music-toggle", onToggle);
    return () => {
      window.removeEventListener("rol:cta", onCta);
      window.removeEventListener("rol:music-toggle", onToggle);
    };
  }, [tryStart, toggle]);

  if (!available) return null;
  return (
    <button
      id="musicBtn"
      className={"music" + (playing ? " on" : "")}
      type="button"
      aria-pressed={playing ? "true" : "false"}
      aria-label={playing ? "توقف موسیقی" : "پخش موسیقی"}
      onClick={toggle}
    >
      <span className="mi" aria-hidden="true">♪</span>
      <span className="eq" aria-hidden="true"><i></i><i></i><i></i></span>
      <span className="mlabel">{playing ? "در حال پخش" : T(cfg, "musicLabel", "موسیقی")}</span>
    </button>
  );
}

/* ============================== intro ============================== */
function IntroScreen() {
  const { cfg, name, appState, update, go, toast, none } = useApp();
  const start = () => {
    buzz(10);
    window.dispatchEvent(new CustomEvent("rol:cta"));
    update({ checkpoint: Math.max(appState.checkpoint, 1) });
    go("build");
  };
  const resume = () => {
    const cp = appState.checkpoint;
    if (cp >= 6) go("final");
    else if (cp >= 5) go("contract");
    else if (cp >= 2 && appState.answer === "yes") go("date");
    else go("build");
  };
  return (
    <section className="screen active" id="scr-intro" aria-label="مقدمه">
      <div {...rise(0, "card glass")} >
        <Sticker kind="nervous" cls="stk stk-l" cfg={cfg} ariaLabel="قلب خجالتی" />
        <p className="line big">{E(cfg, "introL1", "یه چیزی هست که مدت‌هاست می‌خوام بهت بگم…")}</p>
        <p className="line dim">{E(cfg, "introL2", "ولی گفتم شاید اینجوری قشنگ‌تر باشه 👀")}</p>
        <button className="btn primary xl" type="button" autoFocus onClick={start}>
          {E(cfg, "introBtn", "بزن بریم ❤️")}
        </button>
      </div>
      {appState.checkpoint >= 2 && appState.answer === "yes" ? (
        <button className="chip" type="button" onClick={resume}>
          {E(cfg, "resumeChip", "ادامه از جایی که موندیم")}
        </button>
      ) : null}
    </section>
  );
}

/* ============================== build ============================== */
function BuildScreen() {
  const { cfg, name, go } = useApp();
  const [step, setStep] = useState(0); // 0..n lines shown, n+1 = button
  const lines = [
    T(cfg, "buildL1", "قول می‌دم طولانی نشه…"),
    null, // name line rendered specially
    T(cfg, "buildL3", "ولی جوابش برام خیلی مهمه ❤️"),
  ];
  const total = lines.length + 1;
  const timers = useRef([]);
  useEffect(() => {
    const ms = RM ? 240 : 1650;
    for (let i = 1; i <= total; i++) {
      timers.current.push(setTimeout(() => setStep(i), 250 + i * ms - ms));
    }
    return () => timers.current.forEach(clearTimeout);
  }, []);
  const skip = () => setStep(total);
  const done = step >= total;
  return (
    <section
      className="screen active"
      id="scr-build"
      aria-label="مقدمه‌ی سؤال"
      onPointerDown={(e) => {
        if (!e.target.closest("button")) skip();
      }}
    >
      <div {...rise(0, "card glass slim")} >
        <div id="buildLines">
          <p className={"line big bl" + (step >= 1 ? " shown" : "")}>{E(cfg, "buildL1", "قول می‌دم طولانی نشه…")}</p>
          <p className={"line big bl" + (step >= 2 ? " shown" : "")}>
            {name ? <span className="nm">{name}، </span> : null}
            {E(cfg, "buildL2", "فقط یه سؤال کوچیک دارم.")}
          </p>
          <p className={"line big bl" + (step >= 3 ? " shown" : "")}>{E(cfg, "buildL3", "ولی جوابش برام خیلی مهمه ❤️")}</p>
        </div>
        <p className={"hint" + (done ? "" : " bl")} style={done ? undefined : { opacity: step >= 1 ? 0.7 : 0 }}>
          {E(cfg, "buildSkip", "برای رد شدن سریع، لمس کن")}
        </p>
        <button className={"btn primary xl" + (done ? "" : " bl")} type="button" onClick={() => { buzz(8); go("question"); }}>
          {E(cfg, "buildBtn", "خب بپرس 😶‍🌫️")}
        </button>
      </div>
    </section>
  );
}

/* ============================== the question ============================== */
function QuestionScreen() {
  const { cfg, name, appState, update, go, track } = useApp();
  const [attempts, setAttempts] = useState(0);
  const [taunt, setTaunt] = useState("");
  const [noLabel, setNoLabel] = useState(null); // null → default label
  const [givenUp, setGivenUp] = useState(false); // بعد از چند تلاش، «نه» تسلیم می‌شود و «آره» می‌شود
  const [grow, setGrow] = useState(1);
  const zoneRef = useRef(null);
  const noRef = useRef(null);
  const GIVE_UP = 10;
  const taunts = (cfg.text && cfg.text.noTaunts && cfg.text.noTaunts.length ? cfg.text.noTaunts : null) || [
    "عه؟ 😐 مطمئنی؟",
    "یه بار دیگه فکر کن 😂",
    "نه نگو دیگه 🥺",
    "این دکمه چرا اینقدر فراریه؟ 😂",
    "من هنوز امیدوارم ❤️",
  ];

  const dodge = useCallback(() => {
    const zone = zoneRef.current,
      b = noRef.current;
    if (!zone || !b) return;
    const zr = zone.getBoundingClientRect(),
      br = b.getBoundingClientRect();
    if (b.dataset.abs !== "1") {
      b.dataset.abs = "1";
      b.style.left = br.left - zr.left + "px";
      b.style.top = br.top - zr.top + "px";
      b.style.margin = "0";
      b.classList.add("dodging");
    }
    const bw = br.width || 96,
      bh = br.height || 52;
    const maxX = Math.max(10, zr.width - bw - 6),
      maxY = Math.max(10, zr.height - bh - 6);
    const curX = parseFloat(b.style.left) || 0,
      curY = parseFloat(b.style.top) || 0;
    let nx = curX,
      ny = curY;
    for (let t = 0; t < 14; t++) {
      nx = 6 + Math.random() * maxX;
      ny = 6 + Math.random() * maxY;
      if (Math.abs(nx - curX) > 70 || Math.abs(ny - curY) > 40) break;
    }
    b.style.left = nx + "px";
    b.style.top = ny + "px";
    const rot = (Math.random() * 24 - 12).toFixed(1),
      sc = (0.86 + Math.random() * 0.12).toFixed(2);
    b.style.transform = "rotate(" + rot + "deg) scale(" + sc + ")";
  }, []);

  const attempt = useCallback(
    (fromPointer) => {
      const next = attempts + 1;
      setAttempts(next);
      // پیام‌های بی‌پایان: لیست که تموم شد، تصادفی ادامه می‌دهیم
      const msg = next <= taunts.length ? taunts[next - 1] : taunts[Math.floor(Math.random() * taunts.length)];
      setTaunt(msg);
      if (next >= 3 && next < GIVE_UP) setNoLabel("نه نگو دیگه 🥺");
      if (next >= GIVE_UP && !givenUp) {
        // دکمه‌ی «نه» رسماً تسلیم می‌شود و خودش «آره» می‌شود
        setGivenUp(true);
        setNoLabel(T(cfg, "noGiveUp", "خب باشه، آره ❤️"));
        setTaunt("دکمه‌ی نه رسماً تسلیم شد؛ فقط «آره» مونده ❤️");
        setGrow(1.35);
        buzz([12, 40, 18]);
      } else if (next < GIVE_UP) {
        if (fromPointer) dodge();
        setGrow(1 + Math.min(next, 8) * 0.05);
        buzz(6);
      }
    },
    [attempts, dodge, taunts, cfg, givenUp]
  );

  const doYes = () => {
    buzz([12, 40, 18]);
    update({ answer: "yes", checkpoint: Math.max(appState.checkpoint, 2) });
    track("yes");
    chime();
    confettiCannons();
    confettiRain(1700);
    document.body.classList.add("won");
    go("yes");
  };
  const doNo = () => {
    buzz(10);
    update({ answer: "no", checkpoint: Math.max(appState.checkpoint, 2) });
    track("no");
    go("no");
  };

  return (
    <section className="screen active" id="scr-question" aria-label="سؤال اصلی">
      <p {...rise(0, "q-pre line")} >
        {E(cfg, "qPre", "خب…")}
      </p>
      <h1 {...rise(1, "q-text pop")} >
        {cfg.question || "با من رل می‌زنی؟ ❤️"}
      </h1>
      <div {...rise(2, "answers")} id="answers" ref={zoneRef} >
        <button
          id="yesBtn"
          className="btn primary big yes"
          type="button"
          style={{ transform: `translate(-50%,-50%) scale(${grow})` }}
          onClick={doYes}
        >
          {E(cfg, "yesBtn", "آره ❤️")}
        </button>
        <button
          id="noBtn"
          ref={noRef}
          className={"btn big no " + (givenUp ? "primary givenup" : "ghost")}
          type="button"
          aria-label={givenUp ? "خب باشه، آره" : "نه"}
          onPointerEnter={(e) => {
            if (e.pointerType === "mouse" && !givenUp && attempts >= 1) dodge();
          }}
          onClick={(e) => {
            e.preventDefault();
            if (givenUp) {
              doYes();
              return;
            }
            attempt(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (givenUp) {
                doYes();
                return;
              }
              attempt(false);
            }
          }}
        >
          <span className="nlabel">{noLabel || T(cfg, "noBtn", "نه 😐")}</span>
        </button>
      </div>
      <div className="taunt-wrap" hidden={!taunt}>
        <div className="stk stk-xs" aria-hidden="true" dangerouslySetInnerHTML={{ __html: stickerSVG("confused") }} />
        <p id="taunt" className="taunt pop" aria-live="polite">
          <EmoText text={taunt} />
        </p>
      </div>
    </section>
  );
}

/* ============================== yes sequence ============================== */
function YesScreen() {
  const { cfg, go } = useApp();
  const [step, setStep] = useState(0);
  const total = 4;
  useEffect(() => {
    const ms = RM ? 300 : 1450;
    const ts = [];
    for (let i = 1; i <= total; i++) ts.push(setTimeout(() => setStep(i), 350 + i * ms - ms));
    ts.push(setTimeout(() => confettiBurst({ n: 46 }), 350 + 2 * ms));
    return () => ts.forEach(clearTimeout);
  }, []);
  return (
    <section
      className="screen active"
      id="scr-yes"
      aria-label="جواب بله"
      onPointerDown={(e) => {
        if (!e.target.closest("button")) setStep(total);
      }}
    >
      <Sticker kind="celebrate" cls="stk stk-l" cfg={cfg} ariaLabel="قلب جشن‌گرفته" />
      <div id="yesLines">
        <p className={"line big yl" + (step >= 1 ? " shown" : "")}>{E(cfg, "yesL1", "جدی می‌گی؟ 😳")}</p>
        <p className={"line big yl" + (step >= 2 ? " shown" : "")}>{E(cfg, "yesL2", "پس شد! 🥹")}</p>
        <p className={"line yl" + (step >= 3 ? " shown" : "")}>{E(cfg, "yesL3", "از امروز رسماً باید تحملم کنی 😂❤️")}</p>
      </div>
      <button
        id="yesBtnNext"
        className={"btn primary xl" + (step >= total ? " shown" : "")}
        type="button"
        onClick={() => go("after")}
        style={step >= total ? undefined : { pointerEvents: "none" }}
      >
        {E(cfg, "yesBtnNext", "خب، بعدش؟ ✨")}
      </button>
    </section>
  );
}

/* ============================== after ============================== */
function AfterScreen() {
  const { cfg, go } = useApp();
  return (
    <section className="screen active" id="scr-after" aria-label="قدم بعدی">
      <Sticker kind="letter" cls="stk stk-s" cfg={cfg} />
      <p {...rise(0, "line big")} >
        <EmoText text={T(cfg, "afterL1", "خب {pet}…").replace("{pet}", cfg.petPhrase || "خانومِ من")} />
      </p>
      <p {...rise(1, "line")} >
        {E(cfg, "afterL2", "حالا بریم سراغ اولین قرار؟ 👀")}
      </p>
      <button {...rise(2, "btn primary xl")} type="button" autoFocus  onClick={() => { buzz(8); go("poem"); }}>
        {E(cfg, "afterBtn", "آره، بریم 😌")}
      </button>
    </section>
  );
}

/* ============================== poem (شعرِ مناسبت) ============================== */
function PoemScreen() {
  const { cfg, go } = useApp();
  const occ = occasionOf(cfg) || { poet: "", verses: [] };
  const verses = (occ.verses || []).slice(0, 8);
  return (
    <section className="screen active" id="scr-poem" aria-label="شعر برای تو">
      <Sticker kind="letter" cls="stk stk-s" cfg={cfg} />
      <p {...rise(0, "line big")}>
        {E(cfg, "poemTitle", "یه چیزی برات دارم 💌")}
      </p>
      <div className="poem-card glass" {...rise(1, "")}>
        <div className="poem-body">
          {verses.map((b, i) => (
            <div className={"bayt" + (RM ? "" : " anim")} key={i} style={RM ? undefined : { animationDelay: (i * 260 + 140) + "ms" }}>
              <span className="m1">{b[0]}</span>
              <span className="m2">{b[1]}</span>
            </div>
          ))}
        </div>
        {occ.poet ? <div className="poem-poet">{occ.poet}</div> : null}
      </div>
      <button {...rise(2, "btn primary xl")} type="button" autoFocus onClick={() => { buzz(8); go("date"); }}>
        {E(cfg, "poemBtn", "بریم سراغ قرار ✨")}
      </button>
    </section>
  );
}

/* ============================== date picker ============================== */
function DateScreen() {
  const { cfg, name, appState, update, go, track } = useApp();
  const [picked, setPicked] = useState(null);
  const [locked, setLocked] = useState(false);
  const options = cfg.dateOptions && cfg.dateOptions.length ? cfg.dateOptions : DEFAULT_CONFIG.dateOptions;

  const pick = (e, o) => {
    if (locked) return;
    setLocked(true);
    setPicked(o.id);
    buzz(10);
    const label = (o.emoji ? o.emoji + " " : "") + o.label;
    update({ dateId: o.id, dateLabel: label, checkpoint: Math.max(appState.checkpoint, 3) });
    track("date", o.label);
    const r = e.currentTarget.getBoundingClientRect();
    confettiBurst({ x: r.left + r.width / 2, y: r.top, n: 42, spread: 4.4 });
    setTimeout(() => go("when"), RM ? 200 : 800);
  };

  return (
    <section className="screen active" id="scr-date" aria-label="انتخاب قرار">
      <h2 {...rise(0, "line big")} >
        {E(cfg, "dateTitle", "اولین قرارمون کجا باشه؟ ❤️")}
      </h2>
      <Sticker kind="date" cls="stk stk-s" cfg={cfg} />
      <div id="dateGrid" {...rise(1, "dgrid")} role="group" aria-label="گزینه‌های قرار" >
        {options.map((o) => (
          <button
            key={o.id}
            className={"dcard glass" + (o.id === "surprise" ? " wide surprise" : "") + (picked === o.id ? " picked" : picked ? " dim" : "")}
            type="button"
            aria-pressed={picked === o.id ? "true" : "false"}
            onClick={(e) => pick(e, o)}
          >
            <span className="d-emoji"><EmoText text={o.emoji} /></span>
            <span className="d-title"><EmoText text={o.label} /></span>
            <span className="d-hint">{o.hint || ""}</span>
            <span className="d-check">✓</span>
          </button>
        ))}
      </div>
      {locked ? <span className="picked-chip">{E(cfg, "datePicked", "انتخاب شد ❤️")}</span> : null}
    </section>
  );
}

/* ============================== when picker ============================== */
function WhenScreen() {
  const { cfg, name, appState, update, go, track } = useApp();
  const [when, setWhen] = useState(null);
  const [time, setTime] = useState(null);
  const whenOptions = cfg.whenOptions && cfg.whenOptions.length ? cfg.whenOptions : DEFAULT_CONFIG.whenOptions;
  const timeOptions = cfg.timeOptions && cfg.timeOptions.length ? cfg.timeOptions : DEFAULT_CONFIG.timeOptions;
  const strip = (s) => (s || "").replace(/[⚡🌱🌷☕🌙]/g, "").trim();

  const submit = () => {
    if (!when) return;
    update({
      whenLabel: strip(when.label),
      timeLabel: time ? strip(time.label) : "",
      checkpoint: Math.max(appState.checkpoint, 4),
    });
    track("when", strip(when.label));
    buzz(12);
    confettiBurst({ n: 55 });
    go("contract");
  };

  const chipRow = (items, sel, setSel, label, id) => (
    <div id={id} className="chips" role="group" aria-label={label}>
      {items.map((o) => (
        <button
          key={o.id}
          className={"chip glass" + (sel && sel.id === o.id ? " sel" : "")}
          type="button"
          aria-pressed={sel && sel.id === o.id ? "true" : "false"}
          onClick={() => {
            setSel(o);
            buzz(6);
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );

  return (
    <section className="screen active" id="scr-when" aria-label="زمان قرار">
      <h2 {...rise(0, "line big")} >
        {name ? name + "، حالا کِی؟" : T(cfg, "whenTitle", "حالا کِی؟")}
      </h2>
      {chipRow(whenOptions, when, setWhen, "زمان", "whenChips")}
      <p {...rise(1, "mini-label")} >
        {E(cfg, "whenTimeLabel", "چه ساعتی؟ (اختیاری)")}
      </p>
      {chipRow(timeOptions, time, setTime, "ساعت", "timeChips")}
      <button id="whenBtn" className={"btn primary xl" + (when ? " ready" : "")} type="button" disabled={!when} onClick={submit}>
        {E(cfg, "whenBtn", "ثبت قرار ✨")}
      </button>
    </section>
  );
}

/* ============================== contract ============================== */
function ContractScreen() {
  const { cfg, appState, update, go, track } = useApp();
  const [lawyer, setLawyer] = useState(false);
  const [stamped, setStamped] = useState(false);
  const okRef = useRef(null);
  const clauses = cfg.contractClauses && cfg.contractClauses.length ? cfg.contractClauses : DEFAULT_CONFIG.contractClauses;

  const sign = () => {
    if (stamped) return;
    buzz([10, 30, 10]);
    setStamped(true);
    update({ signed: true, checkpoint: Math.max(appState.checkpoint, 5) });
    track("contract");
    confettiBurst({ n: 70, y: (window.innerHeight || 600) * 0.5 });
    setTimeout(() => go("final"), RM ? 250 : 1250);
  };

  return (
    <section className="screen active" id="scr-contract" aria-label="قرارداد کوچیک">
      <div {...rise(0, "contract glass")} >
        <h2>{E(cfg, "contractTitle", "یه قرارداد کوچیک 😂❤️")}</h2>
        <Sticker kind="nervous" cls="stk stk-s" cfg={cfg} />
        <ol className="clauses">
          {clauses.map((c, i) => (
            <li className="clause" key={i}>
              <span className="c-num">بند {toFa(i + 1)}</span>
              <span className="c-body">{c}</span>
            </li>
          ))}
        </ol>
        <p className="fine">{E(cfg, "contractFine", "* این قرارداد با یک قلب امضا می‌شود و اعتبار عاطفی کامل دارد.")}</p>
        {lawyer ? (
          <>
            <p className="lawyer-msg">{E(cfg, "contractLawyerMsg", "باشه… پس باید با وکیلم صحبت کنیم 😂")}</p>
            <div className="c-actions">
              <button className="btn primary" type="button" ref={okRef} autoFocus onClick={sign}>
                {E(cfg, "contractLawyerOk", "خب ببخشید، امضا می‌کنم ❤️")}
              </button>
            </div>
          </>
        ) : (
          <div className="c-actions">
            <button className="btn primary" type="button" onClick={sign}>
              {E(cfg, "contractSign", "امضا می‌کنم ❤️")}
            </button>
            <button
              className="btn ghost"
              type="button"
              onClick={() => {
                setLawyer(true);
                setTimeout(() => {
                  try {
                    okRef.current && okRef.current.focus();
                  } catch (e) {}
                }, 50);
              }}
            >
              {E(cfg, "contractLawyer", "نیاز به وکیل دارم 😂")}
            </button>
          </div>
        )}
        {stamped ? (
          <div className="stamp go" role="status">
            {E(cfg, "contractStamp", "مُهر و امضا شد ❤️")}
          </div>
        ) : null}
      </div>
    </section>
  );
}

/* ============================== final card ============================== */
function FinalScreen() {
  const { cfg, name, appState, update, go, track, openModal, toast } = useApp();
  useEffect(() => {
    if (appState.checkpoint !== 6) {
      update({ checkpoint: 6 });
      track("final");
    }
    if (!RM) setTimeout(() => confettiBurst({ n: 60 }), 350);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const displayName = name || "تو";
  const canShare = typeof navigator !== "undefined" && (navigator.share || navigator.webkitShare);
  const replyHref = (() => {
    const tg = cfg.replyTo && cfg.replyTo.telegram ? String(cfg.replyTo.telegram).replace(/[^A-Za-z0-9_]/g, "") : "";
    if (!tg) return null;
    const tpl = (cfg.replyTo && cfg.replyTo.text) || "رسماً آره ❤️ قرارمون: {date} ({when})";
    const msg = tpl.replace("{date}", appState.dateLabel || "-").replace("{when}", appState.whenLabel || "-").replace("{name}", displayName);
    return "https://t.me/" + tg + "?text=" + encodeURIComponent(msg);
  })();

  const saveCard = () => {
    buzz(10);
    cardBlob((blob) => {
      if (!blob) {
        toast("مرورگرت از ذخیره‌سازی تصویر پشتیبانی نمی‌کنه");
        return;
      }
      const url = URL.createObjectURL(blob);
      openModal((close) => (
        <>
          <h3 className="m-title">{E(cfg, "finalTitle", "قرارمون ثبت شد ❤️")}</h3>
          <div className="card-frame glass">
            <img className="card-preview" src={url} alt={T(cfg, "finalTitle", "قرارمون ثبت شد ❤️").replace(" ❤️", "")} />
          </div>
          <p className="m-note">روی آیفون: روی تصویر نگه‌دار و «افزودن به عکس‌ها» 📸</p>
          <button
            className="btn primary"
            type="button"
            onClick={() => {
              const a = document.createElement("a");
              a.href = url;
              a.download = "rol-" + (name || "card") + ".png";
              document.body.appendChild(a);
              a.click();
              a.remove();
            }}
          >
            دانلود تصویر
          </button>
          <button className="btn ghost" type="button" onClick={close}>
            بستن
          </button>
        </>
      ));
    }, { cfg, name: displayName, state: appState });
  };

  const shareCard = () => {
    const nav = navigator.share || navigator.webkitShare;
    if (!nav) return;
    const text = cfg.finalShareText || "رسماً گفت آره ❤️";
    cardBlob((blob) => {
      let p = null;
      if (blob && navigator.canShare) {
        try {
          const file = new File([blob], "card.png", { type: "image/png" });
          if (navigator.canShare({ files: [file] })) p = nav.call(navigator, { files: [file], text: text + (name ? " ( " + name + " )" : "") });
        } catch (e) {}
      }
      if (!p) p = nav.call(navigator, { title: document.title, text });
      if (p && p.then) p.then(() => toast("فرستاده شد ✨")).catch(() => {});
    }, { cfg, name: displayName, state: appState });
  };

  return (
    <section className="screen active" id="scr-final" aria-label="کارت نهایی">
      <div {...rise(0, "final-card glass")} >
        <p className="line dim">{E(cfg, "finalTitle", "قرارمون ثبت شد ❤️")}</p>
        <h2 className="final-name">{displayName} ❤️</h2>
        <p className="final-said">{E(cfg, "finalSaid", "رسماً گفت آره!")}</p>
        <div className="f-row">
          <span className="f-lab">{E(cfg, "finalDateRow", "اولین قرارمون")}</span>
          <span className="f-val"><EmoText text={appState.dateLabel || "—"} /></span>
        </div>
        <div className="f-row">
          <span className="f-lab">{E(cfg, "finalWhenRow", "کِی")}</span>
          <span className="f-val"><EmoText text={(appState.whenLabel || "—") + (appState.timeLabel ? " · " + appState.timeLabel : "")} /></span>
        </div>
        <p className="final-note">{E(cfg, "finalNote", "حالا فقط مونده یه روز خوب براش پیدا کنیم 😌")}</p>
        <Sticker kind="happy" cls="stk stk-m2" cfg={cfg} />
      </div>
      <div className="f-actions">
        <button id="finalSave" className="btn primary xl" type="button" onClick={saveCard}>
          {E(cfg, "finalSave", "این لحظه رو ذخیره کن 📸")}
        </button>
        <div className="row2">
          {canShare ? (
            <button className="btn ghost" type="button" onClick={shareCard}>
              {E(cfg, "finalShare", "اشتراک‌گذاری")}
            </button>
          ) : (
            <button
              className="btn ghost copy-link"
              type="button"
              onClick={async () => {
                try {
                  const url = location.origin + "/invite" + (name ? "?name=" + name : "");
                  if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(url);
                  else {
                    const ta = document.createElement("textarea");
                    ta.value = url;
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand("copy");
                    ta.remove();
                  }
                  toast("لینک کپی شد ✨");
                } catch (e) { toast("کپی نشد؛ لینک رو دستی کپی کن"); }
              }}
            >
              کپی لینک دعوت 🔗
            </button>
          )}
          <button className="btn ghost" type="button" onClick={() => go("intro")}>
            {E(cfg, "finalAgain", "از اول")}
          </button>
        </div>
        {replyHref ? (
          <a className="btn reply-cta" href={replyHref} target="_blank" rel="noopener">
            {E(cfg, "replyBtn", "جوابم رو خودم بهت بگم 💌")}
          </a>
        ) : null}
      </div>
    </section>
  );
}

/* ============================== graceful no ============================== */
function NoScreen() {
  const { cfg, go, reset } = useApp();
  return (
    <section className="screen active" id="scr-no" aria-label="جواب من">
      <Sticker kind="roses" cls="stk stk-s" cfg={cfg} />
      <div {...rise(0, "card glass")} >
        <p className="line big">{E(cfg, "noTitle", "باشه ❤️")}</p>
        <p className="line">{E(cfg, "noL1", "ممنون که صادق بودی.")}</p>
        <p className="line">{E(cfg, "noL2", "همین که جوابم رو دادی، برام ارزش داشت.")}</p>
        <p className="line dim">{E(cfg, "noL3", "امیدوارم همیشه خوشحال باشی 🌷")}</p>
        <div className="c-actions">
          <button className="btn ghost" type="button" onClick={() => go("question")}>
            {E(cfg, "noAgain", "یه بار دیگه نگاه کن")}
          </button>
          <button className="btn text" type="button" onClick={reset}>
            {E(cfg, "noRestart", "از اول")}
          </button>
        </div>
      </div>
    </section>
  );
}

/* ============================== secrets ============================== */
function useSecrets(cfg, appState, update, track, openModal) {
  const openSecret = useCallback(
    (i) => {
      const list = cfg.secrets && cfg.secrets.length ? cfg.secrets : DEFAULT_CONFIG.secrets;
      const msg = list[i % list.length];
      const isNew = !appState.secrets[i];
      if (isNew) {
        const secrets = { ...appState.secrets, [i]: true };
        update({ secrets });
        track("secret", "s" + i);
      }
      buzz(12);
      openModal((close) => (
        <>
          <Sticker kind="sparkles" cls="stk stk-m" cfg={cfg} />
          <h3 className="m-title">{E(cfg, "secretTitle", "خب… این یکی رو قرار نبود پیدا کنی 👀")}</h3>
          <p className="m-msg"><EmoText text={(isNew ? "" : "اینو قبلاً هم پیدا کرده بودی 😂 ") + msg} /></p>
          <button className="btn primary" type="button" onClick={close}>
            {E(cfg, "secretClose", "باشه باشه، رفتم 😂")}
          </button>
        </>
      ));
    },
    [cfg, appState, update, track, openModal]
  );
  return openSecret;
}

/* ============================== the app shell ============================== */
export { Credit };

export default function Experience({ config, mode = "invite", initialName = "" }) {
  const cfg = config || DEFAULT_CONFIG;
  const [name, setName] = useState(initialName || cfg.recipientName || "");
  const [appState, setAppState] = useState(INITIAL_STATE);
  const [screen, setScreen] = useState("intro");
  const [toastMsg, setToastMsg] = useState(null);
  const [modal, setModal] = useState(null);
  const [sparkleOn, setSparkleOn] = useState(false);
  const stageRef = useRef(null);
  const toastTimer = useRef(null);
  const modalRef = useRef(null);
  const logoTaps = useRef(0);
  const logoTimer = useRef(null);
  const lpTimer = useRef(null);

  const toast = useCallback((msg) => {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 2400);
  }, []);

  const openModal = useCallback((build) => {
    setModal({ build });
  }, []);
  const closeModal = useCallback(() => setModal(null), []);

  const update = useCallback((patch) => {
    setAppState((prev) => {
      const next = { ...prev, ...patch };
      store.set("state", next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    store.clearRol();
    document.body.classList.remove("won");
    try {
      location.reload();
    } catch (e) {
      setAppState({ ...INITIAL_STATE, openedAt: Date.now() });
      setScreen("intro");
    }
  }, []);

  const go = useCallback((id) => {
    setScreen(id);
    setSparkleOn(id === "question");
    if (stageRef.current) {
      try {
        stageRef.current.scrollTop = 0;
      } catch (e) {}
    }
  }, []);

  const trackC = useCallback((type, value) => track(cfg, mode, type, value, name), [cfg, mode, name]);
  const openSecret = useSecrets(cfg, appState, update, trackC, openModal);

  /* boot: theme, particles, URL name, stored state, initial screen */
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const themeParam = (params.get("theme") || "").toLowerCase().trim();
    const themeKeys = Object.keys(cfg.themes || {});
    applyTheme(cfg.themes, themeKeys.includes(themeParam) ? themeParam : cfg.theme || "romantic");
    fxStart();
    const urlName = cleanText(params.get("name") || "", 32);
    if (urlName) setName(urlName);
    else if (cfg.recipientName) setName(cleanText(cfg.recipientName, 32));
    const saved = loadState();
    setAppState(saved);
    if (mode !== "landing") {
      if (saved.checkpoint >= 6) setScreen("final");
      else if (saved.answer === "no") setScreen("no");
    }
    track(cfg, mode, "view", "", urlName || cfg.recipientName || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* sparkle egg timer */
  useEffect(() => {
    if (!sparkleOn || RM) return;
    const iv = setInterval(() => {
      if (document.hidden) return;
      setSparkleOn(false);
      setTimeout(() => setSparkleOn(true) || undefined, 0);
    }, 9500);
    return () => clearInterval(iv);
  }, [sparkleOn]);

  /* logo taps ×5 */
  const onLogo = () => {
    logoTaps.current++;
    if (logoTimer.current) clearTimeout(logoTimer.current);
    logoTimer.current = setTimeout(() => (logoTaps.current = 0), 2800);
    if (logoTaps.current >= 5) {
      logoTaps.current = 0;
      openSecret(0);
    }
  };
  /* footer heart long-press */
  const onFootDown = () => {
    lpTimer.current = setTimeout(() => {
      openSecret(1);
      lpTimer.current = null;
    }, 850);
  };
  const onFootUp = () => {
    if (lpTimer.current) clearTimeout(lpTimer.current);
    lpTimer.current = null;
  };

  /* dev helpers (demo mode panel) */
  useEffect(() => {
    window.__resetPalette = () => {
      // recompute palette after theme change
      import("@/lib/fx").then((m) => m.resetPaletteCache && m.resetPaletteCache());
    };
    window.__app = {
      state: appState,
      go,
      reset,
      forceYes: () => {
        update({ answer: "yes", checkpoint: Math.max(appState.checkpoint, 2) });
        document.body.classList.add("won");
        confettiCannons();
        go("yes");
      },
      forceNo: () => {
        update({ answer: "no", checkpoint: Math.max(appState.checkpoint, 2) });
        go("no");
      },
      confetti: () => {
        confettiCannons();
        confettiRain(1400);
      },
      hearts: heartsRain,
      stickers: () =>
        openModal((close) => (
          <>
            <h3 className="m-title">استیکرها (و حالت جایگزین)</h3>
            <StickerTestGrid cfg={cfg} />
            <button className="btn primary" type="button" onClick={close}>
              بستن
            </button>
          </>
        )),
      music: () => window.dispatchEvent(new CustomEvent("rol:music-toggle")),
    };
  }, [appState, go, reset, update, cfg, openModal]);

  /* modal escape */
  useEffect(() => {
    if (!modal) return;
    const onKey = (e) => {
      if (e.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [modal, closeModal]);

  const screens = {
    intro: IntroScreen,
    build: BuildScreen,
    question: QuestionScreen,
    yes: YesScreen,
    after: AfterScreen,
    poem: PoemScreen,
    date: DateScreen,
    when: WhenScreen,
    contract: ContractScreen,
    final: FinalScreen,
    no: NoScreen,
  };
  const Screen = screens[screen] || IntroScreen;

  return (
    <Ctx.Provider
      value={{
        cfg,
        name,
        mode,
        appState,
        update,
        go,
        reset,
        track: trackC,
        toast,
        openModal,
        closeModal,
      }}
    >
      <canvas id="fx" aria-hidden="true" />
      <canvas id="confetti" aria-hidden="true" />

      <div id="app">
        <header className="topbar">
          <button
            className="logo beat"
            type="button"
            aria-label="قلب کوچیک"
            onClick={onLogo}
            dangerouslySetInnerHTML={{ __html: HEART_SVG }}
          />
          <MusicButton cfg={cfg} toast={toast} />
        </header>

        <div className="stage" ref={stageRef}>
          <Screen key={screen} />
        </div>

        <footer className="appfoot">
          <button
            className="foot-heart"
            type="button"
            aria-label="قلب کوچیک پایین"
            onPointerDown={onFootDown}
            onPointerUp={onFootUp}
            onPointerLeave={onFootUp}
            onPointerCancel={onFootUp}
            onContextMenu={(e) => e.preventDefault()}
          >
            ♥
          </button>
          <span className="foot-line">
            <Credit cfg={cfg} />
            {cfg.senderName ? <span className="foot-sender"> · {cfg.senderName}</span> : null}
          </span>
        </footer>
      </div>

      {mode !== "landing" && screen === "question" ? (
        <button
          id="sparkleEgg"
          type="button"
          aria-label="یه چیز کوچیک"
          className={sparkleOn ? "show" : ""}
          onClick={() => openSecret(2)}
        >
          ✦
        </button>
      ) : null}

      <div id="toast" role="status" aria-live="polite" className={toastMsg ? "show" : ""}>
        <EmoText text={toastMsg || ""} />
      </div>

      {modal ? (
        <div
          className={"m-back" + (modalRef.current ? " in" : "")}
          role="dialog"
          aria-modal="true"
          ref={(el) => {
            modalRef.current = el;
            if (el) requestAnimationFrame(() => el.classList.add("in"));
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="m-card glass">{modal.build(closeModal)}</div>
        </div>
      ) : null}
    </Ctx.Provider>
  );
}

function StickerTestGrid({ cfg }) {
  const [fallback, setFallback] = useState(false);
  return (
    <>
      <div className="stk-grid">
        {STICKER_KINDS.map((k) => (
          <div className="stk-cell" key={k}>
            {fallback ? (
              <div className={"stk"} style={{ height: 84, width: 84 }} dangerouslySetInnerHTML={{ __html: stickerSVG(k) }} />
            ) : (
              <Sticker kind={k} cls="stk" style={{ height: 84, width: 84 }} cfg={cfg} />
            )}
            <span className="stk-cap">{k}</span>
          </div>
        ))}
      </div>
      <button className="btn ghost" type="button" onClick={() => setFallback((f) => !f)}>
        {fallback ? "نمایش تصاویر واقعی" : "تست حالت بدون تصویر (SVG)"}
      </button>
    </>
  );
}
