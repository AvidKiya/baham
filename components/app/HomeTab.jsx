"use client";
// ---------------------------------------------------------------------------
// components/app/HomeTab.jsx — خانه: هیرو + بنتوگرید امکانات + راهنما
// ---------------------------------------------------------------------------
import { Ic } from "@/lib/icons";
import { levelOf, xp, streak } from "@/lib/rizz";
import { useState } from "react";
import Games from "./Games";

const CELLS = [
  { ic: "chatSpark", t: "چی جواب بدم؟", d: "پیامتو بفرست، ۳ تا جواب خفن تحویل بگیر", go: "chat", wide: true },
  { ic: "scan", t: "ببین این چت چی میگه", d: "اسکرین‌شات چت یا استوری‌ش رو بفرست؛ خودم می‌خونم و می‌گم", go: "chat" },
  { ic: "sparkles", t: "بذار جای اون جواب بده", d: "تمرین زنده با کرشت؛ ۹ تا لحن از بامزه تا جسور", go: "chat" },
  { ic: "shield", t: "اتاق +۱۸", d: "بعد از تأیید سن باز می‌شه؛ حرف مال خودته", go: "settings", lock: true },
  { ic: "sparkles", t: "کشف نزدیک‌ها", d: "کِی تو حوالیته؟ لایک بده؛ اگه دوطرفه شد چت بازه", go: "discover" },
  { ic: "invite", t: "یه چیزی براش بساز", d: "لینکی که «نه» نداره؛ مخ زدن کلاسیک 😏", go: "create" },
  { ic: "calHeart", t: "رابطه‌تو یه تکونی بده ❤️", d: "قرار، سورپرایز، آشتی، چرخه و کلی چیز دیگه", go: "us" },
  { ic: "clock", t: "قبلیام", d: "گپ‌ها و دعوت‌نامه‌هات یادشون نمی‌ره", go: "history" },
  { ic: "download", t: "سبک و آفلاین", d: "PWA — نصب می‌شه و آفلاین هم باز می‌مونه", go: null },
];

const STEPS = [
  { n: "۱", t: "ثبت‌نام ده‌ثانیه‌ای", d: "فقط یوزرنیم و رمز؛ نه ایمیل می‌خواد نه شماره" },
  { n: "۲", t: "با اکانتت وصل شو", d: "یه دکمه، لاگین با گوگل — نه کلیدی نه دردسری" },
  { n: "۳", t: "مخ بزن", d: "جواب بگیر، تمرین کن، قرار بچین، دعوت‌نامه بساز" },
];

export default function HomeTab({ go, user, installEvt, install }) {
  const adult = !!(user && user.profile && user.profile.adult);
  const [gamesOpen, setGamesOpen] = useState(false);
  const x = xp();
  const lv = levelOf(x);
  const st = streak();
  return (
    <div className="hometab">
      <section className="hero">
        <div className="hero-pill"><Ic n="spark" s={14} /> رفیقی که رابطه رو می‌فهمه 😏</div>
        <h1>از اولین پیام<br /><span className="gradtxt">تا رابطه‌ی خوب</span></h1>
        <p className="hero-sub">پیامتو بده، باهم جمعش می‌کنیم 😏 جواب کرش، قرار، سورپرایز، آشتی… هرچی یه رابطه لازم داره یه جایی همین‌جاست.</p>
        <div className="hero-cta">
          <button className="btn primary" type="button" onClick={() => go(user ? "chat" : "settings")}>
            <Ic n="chatSpark" s={18} /> {user ? "بریم چت‌یار" : "شروع کن"}
          </button>
          <button className="btn ghost" type="button" onClick={() => go("create")}>
            <Ic n="invite" s={18} /> دعوت‌نامه بساز
          </button>
        </div>
        <div className="hero-stats">
          <span><b>۱۵</b> ابزار</span><i />
          <span><b>۹</b> لحن</span><i />
          <span><b>+۱۸</b> با تأیید سن</span><i />
          <span><b>PWA</b> آفلاین</span>
        </div>
      </section>

      {user ? (
        <section className="card levelcard">
          <span className="ltile"><Ic n={lv.cur.ic} s={24} /></span>
          <div className="lbody">
            <div className="lt">
              {lv.cur.t}
              {st > 0 ? <span className="streak"><Ic n="bolt" s={12} /> {st} روز پیوسته</span> : null}
            </div>
            <div className="lvlbar"><i style={{ width: lv.prog + "%" }} /></div>
            <div className="lvlmeta">
              <span>{x} امتیاز رِز</span>
              <span>{lv.next ? "تا " + lv.next.t + ": " + (lv.next.min - x) + " امتیاز" : "سقفِ سقف‌ها"}</span>
            </div>
          </div>
        </section>
      ) : null}

      <section className="bento">
        {CELLS.map((c) => (
          <button key={c.t} type="button" className={"bcard card" + (c.wide ? " wide" : "")} onClick={() => go(c.go || "home")}>
            <span className={"btile" + (c.lock ? " adult" : "")}>
              <Ic n={c.lock ? (adult ? "flame" : "lock") : c.ic} s={20} />
            </span>
            <span className="bt">{c.t}{c.lock ? <em className={adult ? "on" : ""}>{adult ? "فعال" : "+۱۸"}</em> : null}</span>
            <span className="bd">{c.d}</span>
          </button>
        ))}
        <button type="button" className="bcard card wide games-card" onClick={() => { setGamesOpen(true); }}>
          <span className="btile"><Ic n="smile" s={20} /></span>
          <span className="bt">حوصله‌تون سر رفته؟</span>
          <span className="bd">خب برای همین اینجاییم 😏 دوز، حدس کلمه، طالع‌بینی… با امتیاز رِز</span>
        </button>
      </section>

      {gamesOpen ? <Games onClose={() => setGamesOpen(false)} /> : null}

      <section className="card howto">
        <h3><Ic n="wand" s={18} /> چطور کار می‌کند؟</h3>
        <div className="steps">
          {STEPS.map((s) => (
            <div key={s.n} className="step">
              <span className="stepn">{s.n}</span>
              <div><b>{s.t}</b><p>{s.d}</p></div>
            </div>
          ))}
        </div>
      </section>

      {installEvt ? (
        <section className="card installcard">
          <Ic n="download" s={22} />
          <div><b>مخ‌یار رو گوشیت نصب کن</b><p>همین الان، بدون فروشگاه اپ</p></div>
          <button className="btn primary sm" type="button" onClick={install}>نصب</button>
        </section>
      ) : (
        <section className="card installcard dimcard">
          <Ic n="download" s={22} />
          <div><b>نصب روی گوشی</b><p>از منوی مرورگر: Add to Home Screen</p></div>
        </section>
      )}

      <footer className="credit">
        <span>با وسواس ساخته شده توسط <a href="https://t.me/AvidKiya" target="_blank" rel="noopener">اَوید کیا</a></span>
        <span className="dim">مخ‌یار · نسخه ۷٫۰</span>
      </footer>
    </div>
  );
}
