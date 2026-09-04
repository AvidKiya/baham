"use client";
// ---------------------------------------------------------------------------
// components/app/HomeTab.jsx — خانه: هیرو + بنتوگرید امکانات + راهنما
// ---------------------------------------------------------------------------
import { Ic } from "@/lib/icons";
import { levelOf, xp, streak } from "@/lib/rizz";

const CELLS = [
  { ic: "chatSpark", t: "پاسخ هوشمند", d: "پیامش را بده، سه پیشنهادِ آماده‌ی ارسال بگیر", go: "chat", wide: true },
  { ic: "scan", t: "بینایی استوری", d: "اسکرین‌شات چت یا استوری را بفرست تا تحلیل شود", go: "chat" },
  { ic: "sparkles", t: "۹ لحن + شبیه‌ساز", d: "از بامزه تا جسور؛ حتی تمرین زنده در نقش کرشت", go: "chat" },
  { ic: "shield", t: "فضای +۱۸", d: "لحن‌های بزرگسال با تأیید سن و رضایت", go: "settings", lock: true },
  { ic: "invite", t: "دعوت‌نامه‌ی تعاملی", d: "لینکی که «نه» ندارد؛ برای مخ زدن کلاسیک", go: "create" },
  { ic: "clock", t: "تاریخ‌واره شمسی", d: "همه‌ی چت‌ها و دعوت‌نامه‌ها یادت می‌مانند", go: "history" },
  { ic: "download", t: "سبک و آفلاین", d: "PWA — نصب می‌شود و آفلاین هم باز می‌شود", go: null },
];

const STEPS = [
  { n: "۱", t: "ثبت‌نام ده‌ثانیه‌ای", d: "فقط یوزرنیم و رمز؛ نه ایمیل، نه شماره" },
  { n: "۲", t: "با اکانتت وصل شو", d: "یک دکمه، لاگین با گوگل — بدون کلید و API" },
  { n: "۳", t: "مخ بزن", d: "پاسخ بگیر، تمرین کن، قرار بچین، دعوت‌نامه بساز" },
];

export default function HomeTab({ go, user, installEvt, install }) {
  const adult = !!(user && user.profile && user.profile.adult);
  const x = xp();
  const lv = levelOf(x);
  const st = streak();
  return (
    <div className="hometab">
      <section className="hero">
        <div className="hero-pill"><Ic n="spark" s={14} /> همراهِ همیشگیِ مخ زدن</div>
        <h1>از اولین پیام<br /><span className="gradtxt">تا قرار اول</span></h1>
        <p className="hero-sub">مخ‌یار با هوش مصنوعیِ خودت جواب کرشت را می‌نویسد، استوری‌اش را تحلیل می‌کند، قرار می‌چیند و دعوت‌نامه‌ی تعاملی می‌سازد.</p>
        <div className="hero-cta">
          <button className="btn primary" type="button" onClick={() => go(user ? "chat" : "settings")}>
            <Ic n="chatSpark" s={18} /> {user ? "شروع چت‌یار" : "شروع کن"}
          </button>
          <button className="btn ghost" type="button" onClick={() => go("create")}>
            <Ic n="invite" s={18} /> ساخت دعوت‌نامه
          </button>
        </div>
        <div className="hero-stats">
          <span><b>۵</b> ابزار</span><i />
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
      </section>

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
          <div><b>مخ‌یار را روی گوشی نصب کن</b><p>همین حالا، بدون فروشگاه اپ</p></div>
          <button className="btn primary sm" type="button" onClick={install}>نصب</button>
        </section>
      ) : (
        <section className="card installcard dimcard">
          <Ic n="download" s={22} />
          <div><b>نصب روی گوشی</b><p>از منوی مرورگر: Add to Home Screen</p></div>
        </section>
      )}

      <footer className="credit">
        <span>ساخته‌شده با وسواس توسط <a href="https://t.me/AvidKiya" target="_blank" rel="noopener">اَوید کیا</a></span>
        <span className="dim">مخ‌یار · نسخه ۵٫۰</span>
      </footer>
    </div>
  );
}
