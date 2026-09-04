"use client";
// ---------------------------------------------------------------------------
// components/app/Games.jsx — بازی و سرگرمی (کاملاً محلی، بدون هوش مصنوعی)
// تیک‌تک‌تو با بات · حدس کلمه‌ی عاشقانه · طالع‌بینی قلب — همه با امتیاز رِز
// ---------------------------------------------------------------------------
import { useState, useEffect } from "react";
import { Ic } from "@/lib/icons";
import { addXp } from "@/lib/rizz";
import { buzz } from "@/lib/fx";

const GAMES = [
  { id: "ttt", t: "دوز قلبی", d: "با بات بازی کن؛ قلبا در برابر گل‌ها", ic: "invite" },
  { id: "word", t: "حدس کلمه", d: "کلمه‌ی عاشقانه رو حدس بزن", ic: "pencil" },
  { id: "fortune", t: "طالع‌بینی قلب", d: "یه عدد بزن، ببین قلب چی می‌گه", ic: "sparkles" },
  { id: "wheel", t: "گردونه شانس", d: "روزی یه بار بچرخون، امتیاز رِز ببر", ic: "star" },
  { id: "quiz", t: "کوییز رابطه", d: "۸ سؤال ببین چطور توی رابطه‌ای", ic: "smile" },
];

export default function Games({ onClose }) {
  const [game, setGame] = useState(null);
  return (
    <div className="gscrim" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="gpanel card" onClick={(e) => e.stopPropagation()}>
        <div className="ip-head">
          <h3><Ic n="smile" s={18} /> بازی و سرگرمی</h3>
          <button className="btn ghost sm" type="button" onClick={onClose}><Ic n="x" s={15} /></button>
        </div>
        {!game ? (
          <div className="glist">
            {GAMES.map((g) => (
              <button key={g.id} type="button" className="gitem card" onClick={() => { setGame(g.id); buzz(6); }}>
                <span className="hi-ico"><Ic n={g.ic} s={18} /></span>
                <span className="hi-body"><b>{g.t}</b><span className="hi-time">{g.d}</span></span>
                <Ic n="chev" s={15} />
              </button>
            ))}
          </div>
        ) : (
          <>
            <button className="btn ghost sm gback" type="button" onClick={() => setGame(null)}><Ic n="chev" s={14} style={{ transform: "rotate(90deg)" }} /> همه بازی‌ها</button>
            {game === "ttt" ? <TicTacToe /> : game === "word" ? <WordGuess /> : game === "wheel" ? <Wheel /> : game === "quiz" ? <RelQuiz /> : <Fortune />}
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------- دوز قلبی (vs بات) ---------------- */
function TicTacToe() {
  const [bd, setBd] = useState(Array(9).fill(""));
  const [done, setDone] = useState(null); // "me" | "bot" | "draw"
  const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  const win = (b, p) => LINES.some((l) => l.every((i) => b[i] === p));
  const full = (b) => b.every((x) => x);

  const botMove = (b) => {
    const tryP = (p) => {
      for (const l of LINES) {
        const vals = l.map((i) => b[i]);
        if (vals.filter((v) => v === p).length === 2 && vals.includes("")) return l[vals.indexOf("")];
      }
      return -1;
    };
    let m = tryP("✿");                 // برنده شو
    if (m < 0) m = tryP("♥");          // جلوگیری از برد حریف
    if (m < 0 && b[4] === "") m = 4;
    if (m < 0) { const free = b.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0); m = free[Math.floor(Math.random() * free.length)]; }
    return m;
  };

  const play = (i) => {
    if (done || bd[i]) return;
    const b = bd.slice();
    b[i] = "♥";
    buzz(5);
    if (win(b, "♥")) { setBd(b); setDone("me"); addXp(3); buzz([12, 40, 18]); return; }
    if (full(b)) { setBd(b); setDone("draw"); return; }
    const m = botMove(b);
    if (m >= 0) b[m] = "✿";
    setBd(b);
    if (win(b, "✿")) setDone("bot");
    else if (full(b)) setDone("draw");
  };
  const reset = () => { setBd(Array(9).fill("")); setDone(null); };

  return (
    <div className="ttt">
      <p className="dim small center">{done === "me" ? "بردی! +۳ امتیاز رِز 🎉" : done === "bot" ? "باختی؛ ریمچ؟" : done === "draw" ? "مساوی شد" : "تو ♥ هستی؛ بات ✿"}</p>
      <div className="ttt-grid">
        {bd.map((v, i) => (
          <button key={i} type="button" className={"ttc" + (v === "♥" ? " me" : v === "✿" ? " bot" : "")} onClick={() => play(i)} disabled={!!v || !!done}>{v}</button>
        ))}
      </div>
      <button className="btn ghost sm" type="button" onClick={reset}><Ic n="refresh" s={14} /> از اول</button>
    </div>
  );
}

/* ---------------- حدس کلمه ---------------- */
const WORDS = ["دلتنگی", "لبخند", "قرار", "کافه", "ستاره", "خاطره", "پیام", "قلب", "خنده", "عاشقی", "دوستت", "هواجان", "ناز", "سلام", "بوس"];
const ALPHA = "ابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی";
function WordGuess() {
  const [word, setWord] = useState(() => WORDS[Math.floor(Math.random() * WORDS.length)]);
  const [hit, setHit] = useState([]);
  const [lives, setLives] = useState(5);
  const [msg, setMsg] = useState("");
  const won = word.split("").every((ch) => hit.includes(ch));
  const dead = lives <= 0;

  const letters = Array.from(new Set(word.split("").concat(Array.from({ length: 8 }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)])))).sort();

  const pick = (l) => {
    if (won || dead || hit.includes(l)) return;
    const next = hit.concat(l);
    setHit(next);
    if (word.includes(l)) { buzz(6); if (word.split("").every((c) => next.includes(c))) { addXp(5); setMsg("درست بود! +۵ امتیاز رِز 🎉"); buzz([12, 40, 18]); } }
    else { setLives(lives - 1); buzz(20); if (lives - 1 <= 0) setMsg("دل‌هات تموم شد؛ کلمه «" + word + "» بود"); }
  };
  const reset = () => { setWord(WORDS[Math.floor(Math.random() * WORDS.length)]); setHit([]); setLives(5); setMsg(""); };

  return (
    <div className="wg">
      <p className="dim small center">{won || dead ? msg : "با حرف‌ها کلمه رو بچین"}</p>
      <div className="wg-hearts">{"♥".repeat(Math.max(0, lives))}<span className="dim">{"♡".repeat(5 - Math.max(0, lives))}</span></div>
      <div className="wg-word" dir="rtl">
        {word.split("").map((ch, i) => <span key={i} className={"wgl" + (hit.includes(ch) ? " on" : "")}>{hit.includes(ch) || dead ? ch : "؟"}</span>)}
      </div>
      <div className="wg-keys">
        {letters.map((l) => (
          <button key={l} type="button" className={"wgk" + (hit.includes(l) ? (word.includes(l) ? " good" : " bad") : "")} disabled={hit.includes(l) || won || dead} onClick={() => pick(l)}>{l}</button>
        ))}
      </div>
      <button className="btn ghost sm" type="button" onClick={reset}><Ic n="refresh" s={14} /> کلمه‌ی بعدی</button>
    </div>
  );
}

/* ---------------- طالع‌بینی قلب ---------------- */
const FORTUNES = [
  "یه پیام تو راهه؛ فردا گوشیت رو چک کن 👀",
  "کسی الان داره بهت فکر می‌کنه؛ اسمش رو که نمی‌گم",
  "یه خنده‌ی بزرگ تو راهه؛ آماده باش",
  "قصد داری بکنی که به نتیجه می‌رسه؛ ولی با یه تأخیر کوچیک",
  "بهتره این هفته یه قهوه‌ی دونفره بچینی ☕",
  "چیزی که انتظارش رو نداشتی، برمی‌گرده سراغت",
  "یه راز کوچیک به‌زودی فاش می‌شه؛ نگران نباش، خوشه",
  "انرژی‌ت این روزها بالاست؛ ازش استفاده کن",
  "قلبت درست می‌گه؛ به شهودت گوش کن",
];
function Fortune() {
  const [num, setNum] = useState(null);
  const [res, setRes] = useState("");
  const go = (n) => {
    setNum(n);
    setRes(FORTUNES[(n * 3 + new Date().getDate()) % FORTUNES.length]);
    addXp(2);
    buzz([8, 30, 8]);
  };
  return (
    <div className="fort">
      {res ? (
        <>
          <div className="fort-heart">♥</div>
          <p className="fort-txt">{res}</p>
          <button className="btn ghost sm" type="button" onClick={() => { setNum(null); setRes(""); }}><Ic n="refresh" s={14} /> دوباره</button>
        </>
      ) : (
        <>
          <p className="dim small center">یه عدد از ۱ تا ۹ بزن؛ قلب برات می‌گه</p>
          <div className="fort-nums">
            {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
              <button key={n} type="button" className="wgk" onClick={() => go(n)}>{(n).toLocaleString("fa-IR")}</button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}


/* ---------------- گردونه شانس (روزی یک‌بار) ---------------- */
const PRIZES = [
  { t: "+۵ امتیاز رِز", xp: 5 }, { t: "امسال عاشق می‌شی ❤️", xp: 2 },
  { t: "+۱۰ امتیاز رِز", xp: 10 }, { t: "یه پیام خوش حساب کن 💌", xp: 2 },
  { t: "+۱۵ امتیاز رِز", xp: 15 }, { t: "قرارت نزدیکه 🌹", xp: 2 },
  { t: "+۲۰ امتیاز رِز", xp: 20 }, { t: "خوش شانسی! فردا دوباره بچرخون ✨", xp: 3 },
];
function Wheel() {
  const today = () => { try { return new Date().toISOString().slice(0, 10); } catch { return String(Date.now()); } };
  const key = "mk:spin:" + today();
  const [used, setUsed] = useState(false);
  const [spin, setSpin] = useState(false);
  const [prize, setPrize] = useState(null);
  const [deg, setDeg] = useState(0);
  useEffect(() => { try { setUsed(!!localStorage.getItem(key)); } catch {} }, [key]);
  const go = () => {
    if (used || spin) return;
    setSpin(true);
    const idx = Math.floor(Math.random() * PRIZES.length);
    const target = 360 * 4 + (360 - idx * (360 / PRIZES.length));
    setDeg(target);
    setTimeout(() => {
      setSpin(false);
      setPrize(PRIZES[idx]);
      setUsed(true);
      addXp(PRIZES[idx].xp);
      buzz([12, 40, 18]);
      try { localStorage.setItem(key, "1"); } catch {}
    }, 2600);
  };
  return (
    <div className="wheel">
      <div className="wheel-rot" style={{ transform: "rotate(" + deg + "deg)" }}>
        {PRIZES.map((p, i) => (
          <div key={i} className="wseg" style={{ transform: "rotate(" + i * (360 / PRIZES.length) + "deg)" }}>
            <span>{p.t}</span>
          </div>
        ))}
      </div>
      <div className="wheel-pin">▼</div>
      {prize ? <p className="fort-txt">جایزه‌ت: {prize.t} (+{faNum(prize.xp)} رِز)</p> : <p className="dim small center">{used ? "امروز چرخوندی؛ فردا دوباره بِه!" : "روزی یه بار — شانست رو امتحان کن"}</p>}
      <button className="btn primary" type="button" onClick={go} disabled={used || spin}>{spin ? "می‌چرخه…" : "بچرخون!"}</button>
    </div>
  );
}
const faNum = (n) => { try { return Number(n).toLocaleString("fa-IR"); } catch { return String(n); } };


/* ---------------- کوییز رابطه ---------------- */
const QZ = [
  { q: "طرف یه پیام سرد می‌فرسته؛ واکنشت؟", o: ["همون‌طور سرد جواب می‌دم", "شوخی می‌کنم یخ رو می‌شکنم", "خیلی تحلیل می‌کنم", "منتظر می‌مونه خودش بگه"], a: 1 },
  { q: "اولین قرار کجا باشه بهتره؟", o: ["کافه‌ی خلوت", "سینما", "پارک و بستنی", "یه جا شلوغ"], a: 2 },
  { q: "بامزه‌ترین راه مخ زدن کدومه؟", o: ["متنای طولانی", "شوخی لحظه‌ای", "استوری‌های تلخ", "سکوت مرگبار"], a: 1 },
  { q: "اگه دیر جواب بده…", o: ["پیام پشت پیام", "آروم منتظر می‌مونم", "منم دیر جواب می‌دم", "کلا بی‌خیال می‌شم"], a: 1 },
  { q: "بهترین ویژگی تو تو رابطه؟", o: ["صبورم", "خندونم", "رکم", "وفادارم"], a: 3 },
  { q: "یه تعارف چطور جواب می‌دی؟", o: ["انکار می‌کنم", "شکر می‌کنم بامزه", "سکوت خوشمزه", "معامله می‌کنم"], a: 1 },
  { q: "قرار بدون گوشی…", o: ["معرکه‌ست", "سخت ولی می‌ارزه", "چرا بی‌گوشی؟!", "نصفه‌نیمه"], a: 0 },
  { q: "آخرین قدم قبل از رل زدن؟", o: ["مطمئن‌ش می‌کنم حسش رو", "شعر می‌نویسم", "دست به انتظار می‌زنم", "یه لینک دعوت‌نامه می‌فرستم!"], a: 3 },
];
function RelQuiz() {
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [pick, setPick] = useState(null);
  const done = i >= QZ.length;
  const choose = (k) => {
    if (pick !== null) return;
    setPick(k);
    const good = k === QZ[i].a;
    const ns = score + (good ? 1 : 0);
    if (good) buzz(6); else buzz(20);
    setTimeout(() => {
      setPick(null);
      setI(i + 1);
      setScore(ns);
      if (i + 1 >= QZ.length) { addXp(ns * 2); buzz([12, 40, 18]); }
    }, 550);
  };
  if (done) {
    return (
      <div className="qz">
        <div className="fort-heart">{score >= 6 ? "💖" : score >= 4 ? "❤️" : "💛"}</div>
        <p className="fort-txt">{faNum(score)} از {faNum(QZ.length)} درست!</p>
        <p className="dim small center">{score >= 7 ? "استاد مخ زدنی!" : score >= 5 ? "خیلی خوبی؛ یه ذره دیگه!" : "بیشتر تمرین کن؛ چت‌یار کمکت هست 😉"}</p>
        <button className="btn ghost sm" type="button" onClick={() => { setI(0); setScore(0); }}><Ic n="refresh" s={14} /> دوباره</button>
      </div>
    );
  }
  return (
    <div className="qz">
      <p className="dim small center">سؤال {faNum(i + 1)} از {faNum(QZ.length)} · {faNum(score)} درست</p>
      <p className="qz-q">{QZ[i].q}</p>
      <div className="qz-opts">
        {QZ[i].o.map((t, k) => (
          <button key={k} type="button" className={"qopt" + (pick === null ? "" : k === QZ[i].a ? " good" : pick === k ? " bad" : " dim")}
            onClick={() => choose(k)} disabled={pick !== null}>{t}</button>
        ))}
      </div>
    </div>
  );
}
