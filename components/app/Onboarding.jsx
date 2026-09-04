"use client";
// ---------------------------------------------------------------------------
// components/app/Onboarding.jsx — آزمون ۴ سؤالی شخصیت → لحن پیشنهادی
// ---------------------------------------------------------------------------
import { useState } from "react";
import { Ic } from "@/lib/icons";

const QS = [
  {
    q: "وقتی پیامش می‌رسد، قلبت چه می‌کند؟",
    opts: [
      { t: "سه ساعته جواب می‌دهم که معلوم نباشد منتظرم", style: "cool", r: "خونسرد" },
      { t: "همان لحظه با ده املای مختلف جواب می‌دهم", style: "romantic", r: "حواس‌پرتِ عاشق" },
      { t: "یه جواب بامزه می‌چینم که بخندد", style: "funny", r: "شوخ" },
      { t: "رک می‌گویم چی می‌خواهم", style: "direct", r: "رک" },
    ],
  },
  {
    q: "سبک مخ زدنت نزدیک‌تر است به…",
    opts: [
      { t: "شعر و متن‌های ادبی", style: "literary", r: "ادبی" },
      { t: "طعنه و شیطنت ظریف", style: "mystery", r: "مرموز" },
      { t: "کامنت‌های بامزه و میم", style: "funny", r: "شوخ" },
      { t: "صادقانه و بی‌حاشیه", style: "direct", r: "رک" },
    ],
  },
  {
    q: "بزرگ‌ترین ترست؟",
    opts: [
      { t: "جوابمو نده", style: "cool", r: "خونسرد" },
      { t: "خیلی سریع زیاد بگویم و بترسانم", style: "mystery", r: "مرموز" },
      { t: "خشک بمیرم و حرفم گیر کند", style: "literary", r: "ادبی" },
      { t: "دوستمان بمانیم و تمام", style: "romantic", r: "رومانتیک" },
    ],
  },
  {
    q: "امسال چه می‌خواهی؟",
    opts: [
      { t: "همین گفت‌وگوها شیرین‌تر شود", style: "romantic", r: "رومانتیک" },
      { t: "بالاخره یک قرار واقعی", style: "direct", r: "رک" },
      { t: "رابطه‌ی جدی", style: "literary", r: "ادبی" },
      { t: "ببینیم کجا می‌رسد؛ فشار نیاورم", style: "cool", r: "خونسرد" },
    ],
  },
];

export default function Onboarding({ onDone }) {
  const [step, setStep] = useState(0);
  const [picks, setPicks] = useState([]);
  const done = step >= QS.length;

  const pick = (o) => {
    const p = [...picks, o];
    setPicks(p);
    setStep(step + 1);
  };

  const finish = async (save) => {
    if (save) {
      const tally = {};
      for (const o of picks) tally[o.style] = (tally[o.style] || 0) + 1;
      const best = Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0];
      try {
        const { api } = await import("@/lib/appauth");
        await api("/api/me", { method: "PUT", body: { style: best, onboarded: true } });
      } catch {}
      onDone(best);
    } else {
      try {
        const { api } = await import("@/lib/appauth");
        await api("/api/me", { method: "PUT", body: { onboarded: true } });
      } catch {}
      onDone(null);
    }
  };

  const result = (() => {
    if (!done) return null;
    const tally = {};
    for (const o of picks) tally[o.style] = (tally[o.style] || 0) + 1;
    return Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
  })();

  return (
    <div className="qscrim">
      <div className="qmodal card">
        {!done ? (
          <>
            <div className="qdots">{QS.map((_, i) => <i key={i} className={i <= step ? "on" : ""} />)}</div>
            <h3>{QS[step].q}</h3>
            <div className="qops">
              {QS[step].opts.map((o) => (
                <button key={o.t} type="button" className="qop" onClick={() => pick(o)}>{o.t}</button>
              ))}
            </div>
            {step > 0 ? <button type="button" className="auth-forgot" onClick={() => { setStep(step - 1); setPicks(picks.slice(0, -1)); }}>سؤال قبلی</button> : null}
            <button type="button" className="auth-forgot" onClick={() => finish(false)}>رد کردن آزمون</button>
          </>
        ) : (
          <div className="qres">
            <span className="bigico"><Ic n="sparkles" s={30} /></span>
            <h3>شخصیت مخ‌زنِ تو: {result[1] && QS.flatMap(q => q.opts).find(o => o.style === result[0]).r}</h3>
            <p>این را به‌عنوان لحن پیش‌فرض ذخیره کنم؟ هر وقت بخواهی در تنظیمات عوضش می‌کنی.</p>
            <button className="btn primary big" type="button" onClick={() => finish(true)}><Ic n="check" s={16} /> بله، ذخیره کن</button>
            <button type="button" className="auth-forgot" onClick={() => finish(false)}>بی‌خیال، خودم تنظیم می‌کنم</button>
          </div>
        )}
      </div>
    </div>
  );
}
