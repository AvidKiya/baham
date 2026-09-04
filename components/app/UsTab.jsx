"use client";
// ---------------------------------------------------------------------------
// components/app/UsTab.jsx — هاب «ما»: چرخه · حال · پارتنرمن · رشد
// همه‌چیز محلی و خصوصیه؛ به‌علاوه قفل PIN و پاک‌سازی کامل.
// ---------------------------------------------------------------------------
import { useState, useEffect, useCallback } from "react";
import { Ic } from "@/lib/icons";
import { buzz } from "@/lib/fx";
import {
  getPms, logPeriodToday, removeLast, pmsStatus, PHASES, PARTNER_TIPS,
  faDate, iso, getAnniv, setAnniv, getOccs, setOccs, daysTogether, nextMilestone, giftIdea, endPeriodToday,
} from "@/lib/pms";
import {
  MOODS, getMoods, logMood, moodInsight, LOVE_LANGS, LL_QUIZ, getLL, setLL,
  P_FIELDS, getPartner, setPartner, getWishes, addWish, toggleWish, delWish, oldWishes,
  BUDGETS, giftFor, SCORE_DIMS, getScore, setScore, weakest,
  CHECKIN_QS, getCheckins, addCheckin, CHALLENGE_DAYS, getChallenge, startChallenge, advanceChallenge, stopChallenge,
  REWRITE_TONES, soften, LESSONS, getPin, setPin, wipeUs,
  CONFLICT_QS, CONFLICT_STEPS, conflictMerge,
} from "@/lib/relationship";
import { api } from "@/lib/appauth";

const fa = (n) => { try { return Number(n).toLocaleString("fa-IR"); } catch { return String(n); } };
const DAY = 86400000;
const SEGS = [
  { id: "cycle", t: "چرخه", e: "🌙" },
  { id: "mood", t: "حال و شناخت", e: "💭" },
  { id: "partner", t: "پارتنرمن", e: "💘" },
  { id: "duo", t: "همراه", e: "💞" },
  { id: "grow", t: "رشد", e: "🌱" },
];

export default function UsTab() {
  const [tick, setTick] = useState(0);
  const [seg, setSeg] = useState(() => { try { return localStorage.getItem("mk:paircode") ? "duo" : "cycle"; } catch { return "cycle"; } });
  const [pin, setPinState] = useState(null); // null=قفل نیست، ""=باز نیست، "ok"=باز شده
  const [pinIn, setPinIn] = useState("");
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const stored = getPin();
    setPinState(stored ? "" : "ok");
    try {
      const st = pmsStatus();
      if (!st.empty && typeof Notification !== "undefined" && Notification.permission === "granted") {
        if (st.dueToday) new Notification("مخ‌یار 🌙", { body: "ممکنه امروز پریودت شروع بشه؛ چای گرم و یه کم مهربونی با خودت ❤️" });
        else if (st.dueTomorrow) new Notification("مخ‌یار 🌙", { body: "فردا احتمالاً موعدهش؛ آماده باش 🧡" });
      }
    } catch {}
    /* یادآور هوشمند مناسبت‌ها (v6.1) */
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        const t0 = new Date(); t0.setHours(0, 0, 0, 0);
        for (const o of getOccs()) {
          const d = new Date(o.d + "T00:00:00");
          if (isNaN(d)) continue;
          let next = new Date(t0.getFullYear(), d.getMonth(), d.getDate());
          if (next < t0) next = new Date(t0.getFullYear() + 1, d.getMonth(), d.getDate());
          const left = Math.round((next - t0) / DAY);
          if (left <= 3) {
            const pa = getPartner();
            const g = giftFor("mid", pa);
            new Notification("مخ‌یار 🎁", { body: (left === 0 ? "امروز " : fa(left) + " روز دیگه: ") + o.t + (pa && pa.name ? " — بر اساس چیزایی که داری: " + g.idea : " — پیشنهاد هدیه: " + g.idea) });
            break;
          }
        }
      }
    } catch {}
  }, []);

  if (pin === "") {
    return (
      <div className="card ccard pinbox">
        <span className="phase-emoji">🔒</span>
        <h3>این بخش قفله</h3>
        <p className="dim small">پین تب «ما» رو بزن تا باز شه.</p>
        <input className="inp pininp" dir="ltr" type="password" inputMode="numeric" maxLength={8} value={pinIn} onChange={(e) => setPinIn(e.target.value.replace(/\D/g, ""))} onKeyDown={(e) => { if (e.key === "Enter" && pinIn === getPin()) { setPinState("ok"); buzz(8); } }} placeholder="••••" />
        <button className="btn primary" type="button" onClick={() => { if (pinIn === getPin()) { setPinState("ok"); buzz(8); } else { setPinIn(""); } }}>بازش کن</button>
      </div>
    );
  }

  return (
    <div className="ustab">
      <header className="tabhead">
        <h2><Ic n="calHeart" s={20} /> ما</h2>
        <p>گوشه‌ی خصوصی رابطه‌تون — همه‌چیز فقط روی گوشی خودته.</p>
      </header>

      <div className="seg usegs">
        {SEGS.map((s) => (
          <button key={s.id} type="button" className={"seg-btn" + (seg === s.id ? " on" : "")} onClick={() => { setSeg(s.id); buzz(5); }}>
            <span>{s.e}</span> {s.t}
          </button>
        ))}
      </div>

      {seg === "cycle" ? (
        <>
          <PmsCard key={"p" + tick} reload={reload} />
          <AnnivCard key={"a" + tick} reload={reload} />
          <OccsCard key={"o" + tick} reload={reload} />
        </>
      ) : null}
      {seg === "mood" ? (
        <>
          <MoodCard key={"m" + tick} reload={reload} />
          <LLCard key={"l" + tick} reload={reload} />
        </>
      ) : null}
      {seg === "partner" ? (
        <>
          <PartnerCard reload={reload} />
          <WishCard key={"w" + tick} reload={reload} />
          <SurpriseCard />
        </>
      ) : null}
      {seg === "duo" ? <DuoCard key={"d" + tick} reload={reload} /> : null}
      {seg === "grow" ? (
        <>
          <ScoreCard key={"s" + tick} reload={reload} />
          <CheckinCard reload={reload} />
          <ChallengeCard key={"ch" + tick} reload={reload} />
          <UnsentCard />
          <LessonsCard />
        </>
      ) : null}

      <PrivacyCard reload={reload} />
    </div>
  );
}

/* ---------------- ترکر PMS (چرخه) ---------------- */
function PmsCard({ reload }) {
  const p = getPms();
  const st = pmsStatus(p);
  const [showPartner, setShowPartner] = useState(false);
  const ph = st.empty ? null : PHASES[st.phase];
  const tips = st.empty ? null : PARTNER_TIPS[st.phase];

  const askNotif = async () => {
    if (typeof Notification === "undefined") return;
    const r = await Notification.requestPermission();
    if (r === "granted") { p.notif = true; logNothing(p); }
  };
  const logNothing = (pp) => { try { localStorage.setItem("mk:pms", JSON.stringify(pp)); } catch {} reload(); };

  return (
    <div className="card ccard pmscard">
      <h3 className="ip-head"><span>🌙</span> چرخه‌ش دستت باشه <span className="tiny est">حدسِ ماست، تشخیص پزشکی نیست</span></h3>

      {st.empty ? (
        <>
          <p className="dim small">اولین روز پریود رو ثبت کن؛ از اون به بعد پیش‌بینی، فاز و راهنمایِ کنار اومدنش رو خودم می‌گم.</p>
          <div className="m-row">
            <button className="btn primary" type="button" onClick={() => { logPeriodToday(); buzz(10); reload(); }}>امروز شروع شد</button>
          </div>
        </>
      ) : (
        <>
          {st.dueToday || st.dueTomorrow ? (
            <div className="pms-alert">
              {st.dueToday ? "⏳ امروز احتمالاً روزشه؛ یه کم بیشتر ملاحظه‌ش باش ❤️" : "🕐 فردا احتمالاً موعدهش؛ کیسه‌ی آب داغ رو پیش بگیر 🧡"}
            </div>
          ) : null}
          <div className="phasebox" style={{ borderColor: ph.c + "66", background: ph.c + "14" }}>
            <div className="phase-head">
              <span className="phase-emoji">{ph.emoji}</span>
              <div>
                <b style={{ color: ph.c }}>{ph.t}</b>
                <span className="hi-time">روز {fa(st.cd)} از سیکل · میانگین {fa(st.avg)} روزه</span>
              </div>
            </div>
            <p className="phase-desc">{ph.d}</p>
          </div>

          <div className="statrow">
            <div className="stat"><b>{fa(st.countdown)}</b><span>روز تا بعدی</span></div>
            <div className="stat"><b>{faDate(st.next)}</b><span>پیش‌بینی</span></div>
            <div className="stat"><b>{fa(p.logs.length)}</b><span>بار ثبت</span></div>
          </div>

          <div className="m-row">
            <button className="btn primary" type="button" onClick={() => { logPeriodToday(); buzz(10); reload(); }}>امروز شروع شد</button>
            <button className="btn ghost" type="button" onClick={() => setShowPartner(!showPartner)}>
              <Ic n={showPartner ? "chev" : "wand"} s={15} style={showPartner ? { transform: "rotate(180deg)" } : undefined} /> راهنمای پارتنر 💘
            </button>
            <button className="btn ghost danger sm" type="button" onClick={() => { removeLast(); reload(); }}><Ic n="trash" s={14} /> آخرین ثبت</button>
          </div>
          {st.phase === "period" && st.cd >= 2 ? (
            <button className="btn ghost sm" type="button" onClick={() => { endPeriodToday(); buzz(8); reload(); }}><Ic n="check" s={14} /> پریود تموم شد (طولش رو یاد می‌گیرم)</button>
          ) : null}

          {showPartner && tips ? (
            <div className="ptips">
              <p className="flbl"><Ic n="check" s={14} /> امروز چیکار کنی؟</p>
              <ul>{tips.do.map((t, i) => <li key={i}>{t}</li>)}</ul>
              <p className="flbl warn"><Ic n="x" s={14} /> امروز چیکار نکنی</p>
              <ul className="donts">{tips.dont.map((t, i) => <li key={i}>{t}</li>)}</ul>
              <p className="flbl"><Ic n="spark" s={14} /> سوپرایز کوچیک</p>
              <p className="gift-one">{tips.surprise}</p>
              <p className="flbl"><Ic n="invite" s={14} /> جمله‌ی خوب امروز</p>
              <p className="say-one">{tips.say}</p>
              <p className="tiny self">برای خودت: {tips.self}</p>
            </div>
          ) : null}
        </>
      )}
      {typeof Notification !== "undefined" && Notification.permission !== "granted" ? (
        <button className="btn ghost sm" type="button" onClick={askNotif}><Ic n="alert" s={14} /> اعلان روزش رو برام بفرست</button>
      ) : null}
    </div>
  );
}

/* ---------------- شمارنده و مناسبت‌ها (چرخه) ---------------- */
function AnnivCard({ reload }) {
  const v = getAnniv();
  const days = daysTogether(v);
  const ms = days >= 0 ? nextMilestone(days) : null;
  return (
    <div className="card ccard">
      <h3 className="ip-head"><Ic n="invite" s={16} /> چند روزه کنارید؟ ❤️</h3>
      {days < 0 ? (
        <>
          <p className="dim small">تاریخ شروعتون رو بده؛ روزشمار و مایل‌استون‌ها رو خودم می‌شمروم.</p>
          <input className="inp" type="date" dir="ltr" value={v} onChange={(e) => { setAnniv(e.target.value); reload(); }} />
        </>
      ) : (
        <>
          <div className="daysbig">
            <b>{fa(days)}</b>
            <span>روز کناریم ❤️</span>
          </div>
          <p className="dim small">از {faDate(new Date(v))} تا امروز{ms && ms.m ? ` · ${fa(ms.left)} روز تا مایل‌استون ${fa(ms.m)} روزگی` : " · افسانه‌ای!"}</p>
          <input className="inp" type="date" dir="ltr" value={v} onChange={(e) => { setAnniv(e.target.value); reload(); }} />
        </>
      )}
    </div>
  );
}

function OccsCard({ reload }) {
  const list = getOccs();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const today = new Date(iso(new Date()));

  const add = () => {
    const t = title.trim();
    if (!t || !date) return;
    setOccs([{ t, d: date, i: Date.now() % 9999 }].concat(list));
    setTitle(""); setDate("");
    buzz(8);
    reload();
  };
  const del = (i) => { setOccs(list.filter((_, k) => k !== i)); reload(); };
  const daysTo = (dstr) => {
    const d = new Date(dstr + "T00:00:00");
    if (isNaN(d)) return -1;
    const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    let next = new Date(today.getFullYear(), d.getMonth(), d.getDate());
    if (next < t0) next = new Date(today.getFullYear() + 1, d.getMonth(), d.getDate());
    return Math.round((next - t0) / DAY);
  };

  return (
    <div className="card ccard">
      <h3 className="ip-head"><Ic n="star" s={16} /> مناسبت‌ها 📅</h3>
      <p className="dim small">تولد، سالگرد، هر چی که براتون مهمه؛ یادشون می‌دارم و کادوهم پیشنهاد می‌دم 🎁</p>
      <div className="occ-add">
        <input className="inp" dir="rtl" placeholder="مثلاً: تولد لیلا" maxLength={40} value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className="inp" type="date" dir="ltr" value={date} onChange={(e) => setDate(e.target.value)} />
        <button className="btn primary sm" type="button" onClick={add}><Ic n="plus" s={14} /> اضافه کن</button>
      </div>
      {list.length ? (
        <div className="iplist">
          {list.map((o, i) => {
            const left = daysTo(o.d);
            return (
              <div key={o.i}>
                <div className="occrow card">
                  <span className="occ-ic">{left <= 7 ? "🎈" : "📆"}</span>
                  <span className="hi-body">
                    <b>{o.t}</b>
                    <span className="hi-time">{faDate(new Date(o.d + "T00:00:00"))} · {left === 0 ? "امروزه! 🎉" : fa(left) + " روز مونده"}</span>
                  </span>
                  <span className="gift-chip" title="پیشنهاد کادو">{giftIdea(o.i + left)}</span>
                  <button className="sw-flag" type="button" onClick={() => del(i)}><Ic n="trash" s={13} /></button>
                </div>
                {left <= 7 ? (
                  <div className="occgifts">
                    <span className="tiny">پیشنهاد هدیه با بودجه:</span>
                    {["eco", "mid", "high"].map((b) => (
                      <button key={b} type="button" className="occ-chip" onClick={() => { try { navigator.clipboard.writeText(giftFor(b, getPartner()).idea); } catch {} }}>{giftFor(b, getPartner()).idea.slice(0, 26)}…</button>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/* ---------------- حال روزانه (حال و شناخت) ---------------- */
function MoodCard({ reload }) {
  const moods = getMoods();
  const pms = getPms();
  const ins = moodInsight(pms);
  const todayMood = moods.length && moods[0].d === iso(new Date()) ? moods[0].m : null;
  const last7 = moods.slice(0, 7).reverse();
  return (
    <div className="card ccard">
      <h3 className="ip-head"><span>💭</span> حالِ امروزت چطوره؟</h3>
      <div className="moodrow">
        {MOODS.map((m) => (
          <button key={m.id} type="button" className={"moodbtn" + (todayMood === m.id ? " sel" : "")} onClick={() => { logMood(m.id); buzz(6); reload(); }}>
            <span>{m.e}</span><b>{m.t}</b>
          </button>
        ))}
      </div>
      {last7.length ? (
        <>
          <p className="flbl" style={{ marginTop: 12 }}>۷ روز اخیر</p>
          <div className="moodstrip">
            {last7.map((x, i) => {
              const m = MOODS.find((mm) => mm.id === x.m);
              return <span key={i} title={x.d}>{m ? m.e : "؟"}</span>;
            })}
          </div>
        </>
      ) : null}
      {ins ? (
        <div className="insight">
          <b>الگوی تو 🧠</b>
          <p>تو {fa(ins.total)} روز اخیر، بیشتر از همه «{ins.top.t}» {ins.top.e} بودی ({fa(ins.n)} بار).</p>
          {ins.pmsLine ? <p className="dim small">{ins.pmsLine}</p> : null}
        </div>
      ) : <p className="tiny">چند روز پشت‌سرهم ثبت کن؛ الگوهاش خودشون رو نشون می‌دن 👀</p>}
    </div>
  );
}

/* ---------------- زبان عشق (حال و شناخت) ---------------- */
function LLCard({ reload }) {
  const res = getLL();
  const [i, setI] = useState(0);
  const [cnt, setCnt] = useState({});
  if (res) {
    const ll = LOVE_LANGS.find((l) => l.id === res.id) || LOVE_LANGS[0];
    return (
      <div className="card ccard">
        <h3 className="ip-head"><span>💝</span> عشق رو با چه زبونی نشون می‌دی؟</h3>
        <div className="llbox">
          <span className="phase-emoji">{ll.e}</span>
          <b>{ll.t}</b>
          <p className="dim small">{ll.d}</p>
          <p className="say-one">«{ll.t}» برای تو احتمالاً بیشتر از بقیه‌ی راه‌ها جواب می‌ده؛ هم عشقت رو هم عذرخواهیت رو با همین زبون نشون بده.</p>
        </div>
        <button className="btn ghost sm" type="button" onClick={() => { setI(0); setCnt({}); const k = "mk:ll"; try { localStorage.removeItem(k); } catch {} reload(); }}><Ic n="refresh" s={14} /> دوباره امتحان بدم؟</button>
      </div>
    );
  }
  const q = LL_QUIZ[i];
  const done = i >= LL_QUIZ.length;
  const choose = (id) => {
    const c = { ...cnt, [id]: (cnt[id] || 0) + 1 };
    setCnt(c);
    buzz(5);
    if (i + 1 >= LL_QUIZ.length) {
      const win = Object.entries(c).sort((a, b) => b[1] - a[1])[0][0];
      setLL(win);
      reload();
    } else setI(i + 1);
  };
  return (
    <div className="card ccard">
      <h3 className="ip-head"><span>💝</span> زبان عشقت رو پیدا کن</h3>
      {done ? null : (
        <>
          <p className="tiny">سؤال {fa(i + 1)} از {fa(LL_QUIZ.length)}</p>
          <p className="qz-q">{q.q}</p>
          <div className="qz-opts">
            {q.o.map(([t, id]) => (
              <button key={id} type="button" className="qopt" onClick={() => choose(id)}>{t}</button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------- پارتنرمن (مغز رابطه) ---------------- */
function PartnerCard({ reload }) {
  const p = getPartner();
  const [name, setName] = useState(p.name || "");
  const [f, setF] = useState(p.f || {});
  const [msg, setMsg] = useState("");
  const save = () => {
    setPartner({ name: name.trim().slice(0, 32), f });
    setMsg("سیو شد؛ از الان همه‌ی پیشنهادها از این اطلاعات استفاده می‌کنن 🧠");
    setTimeout(() => setMsg(""), 2600);
    reload();
  };
  return (
    <div className="card ccard">
      <h3 className="ip-head"><span>🧠</span> مغز رابطه 🧠 — هرچی درباره‌ش می‌دونی</h3>
      <p className="dim small">هرچی بیشتر بگی، پیشنهادا و سورپرایزا شخصی‌تر می‌شن. همه‌چیز فقط تو همین گوشیه.</p>
      <label className="field">
        <span className="flbl"><Ic n="user" s={14} /> اسمش</span>
        <input className="inp" dir="rtl" maxLength={32} placeholder="مثلاً: نازنین" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      {P_FIELDS.map((fl) => (
        <label className="field" key={fl.k}>
          <span className="flbl">{fl.t}</span>
          <input className="inp" dir="rtl" maxLength={80} value={f[fl.k] || ""} onChange={(e) => setF({ ...f, [fl.k]: e.target.value })} />
        </label>
      ))}
      {msg ? <div className="mini-ok big">{msg}</div> : null}
      <button className="btn primary" type="button" onClick={save}><Ic n="check" s={15} /> سیو کن</button>
    </div>
  );
}

/* ---------------- یه چیزی گفته بود... ---------------- */
function WishCard({ reload }) {
  const list = getWishes();
  const [t, setT] = useState("");
  const olds = oldWishes();
  return (
    <div className="card ccard">
      <h3 className="ip-head"><span>🗒️</span> یه چیزی گفته بود…</h3>
      <p className="dim small">هر خواسته یا حرفی که زد اینجا نگه دار؛ بعد یه مدت یادت می‌ندازم که وقتشه رسیده!</p>
      {olds.length ? (
        <div className="pms-alert" style={{ background: "rgba(245,158,11,.12)", borderColor: "rgba(245,158,11,.35)", color: "#b45309" }}>
          {olds.map((w, i) => <span key={i} className="wishold">«{w.text}» — {fa(Math.round((Date.now() - w.ts) / DAY))} روز از وقتی گفته‌ش گذشته؛ شاید الان وقتشه 😉</span>)}
        </div>
      ) : null}
      <div className="occ-add">
        <input className="inp" dir="rtl" placeholder="مثلاً: گفت دلش می‌خواد بره اون رستوران" maxLength={200} value={t} onChange={(e) => setT(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && t.trim()) { addWish(t); setT(""); reload(); } }} />
        <button className="btn primary sm" type="button" onClick={() => { if (t.trim()) { addWish(t); setT(""); reload(); } }}><Ic n="plus" s={14} /> ثبت</button>
      </div>
      {list.length ? (
        <div className="iplist">
          {list.map((w, i) => (
            <div key={w.ts} className={"occrow card" + (w.done ? " dimcard2" : "")}>
              <button className="wchk" type="button" onClick={() => { toggleWish(i); reload(); }}>{w.done ? "☑" : "☐"}</button>
              <span className="hi-body"><b className={w.done ? "strike" : ""}>{w.text}</b></span>
              <button className="sw-flag" type="button" onClick={() => { delWish(i); reload(); }}><Ic n="trash" s={13} /></button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ---------------- امروز چجوری خوشحالش کنیم؟ 🎁 ---------------- */
function SurpriseCard() {
  const [b, setB] = useState("free");
  const [n, setN] = useState(0);
  const partner = getPartner();
  const g = giftFor(b, partner);
  return (
    <div className="card ccard">
      <h3 className="ip-head"><span>🎁</span> امروز چجوری خوشحالش کنیم؟ 🎁</h3>
      <p className="dim small">بر اساس بودجه {partner && partner.name ? `و چیزایی که درباره‌ی «${partner.name}» می‌دونی` : "و سلیقه‌ش"}</p>
      <div className="occ-row">
        {BUDGETS.map((x) => (
          <button key={x.id} type="button" className={"occ-chip" + (b === x.id ? " sel" : "")} onClick={() => { setB(x.id); setN(n + 1); buzz(5); }}>{x.t}</button>
        ))}
      </div>
      <div className="giftbox" key={b + "-" + n}>
        <p className="gift-one big-gift">{g.idea}</p>
        <p className="say-one">{g.scenario}</p>
      </div>
      <button className="btn ghost sm" type="button" onClick={() => { setN(n + 1); buzz(5); }}><Ic n="refresh" s={14} /> یه پیشنهاد دیگه</button>
    </div>
  );
}

/* ---------------- سلامت رابطه (رشد) ---------------- */
function ScoreCard({ reload }) {
  const s = getScore();
  const [v, setV] = useState((s && s.v) || {});
  const avg = SCORE_DIMS.length ? Math.round(SCORE_DIMS.reduce((a, d) => a + (Number(v[d.id]) || 3), 0) / SCORE_DIMS.length) : 0;
  const w = weakest(v);
  return (
    <div className="card ccard">
      <h3 className="ip-head"><span>📊</span> رابطه‌تون چنده؟ 👀</h3>
      <p className="dim small">از ۱ تا ۵ به هر بخش نمره بدید؛ ۵ یعنی عالیه.</p>
      {SCORE_DIMS.map((d) => (
        <div className="scorerow" key={d.id}>
          <span className="sc-lbl">{d.t}</span>
          <input type="range" min="1" max="5" step="1" value={v[d.id] || 3} onChange={(e) => setV({ ...v, [d.id]: Number(e.target.value) })} dir="ltr" />
          <b className="sc-num">{fa(v[d.id] || 3)}</b>
        </div>
      ))}
      <div className="scoreres">
        <b>{fa(avg)}/۵</b>
        {w && w.n < 4 ? <p>ضعیف‌ترین حلقه: «{w.t}» — این هفته فقط همین رو دست بگیرید 💪</p> : <p>هر هفته چک کنید؛ افت تدریجی رو زود ببینید.</p>}
      </div>
      <button className="btn primary" type="button" onClick={() => { setScore(v); buzz(8); reload(); }}>ثبت امتیاز</button>
    </div>
  );
}

/* ---------------- چک‌این هفتگی ---------------- */
function CheckinCard({ reload }) {
  const list = getCheckins();
  const [ans, setAns] = useState(CHECKIN_QS.map(() => ""));
  const [saved, setSaved] = useState(false);
  const last = list[0];
  const canSave = ans.some((a) => a.trim());
  const weekAgo = last && Date.now() - last.ts < 6 * DAY;
  return (
    <div className="card ccard">
      <h3 className="ip-head"><span>🫶</span> یه چک‌این هفتگی</h3>
      <p className="dim small">۵ تا سؤال، هفته‌ای یه بار؛ جوابا فقط پیش خودتون می‌مونه.</p>
      {weekAgo ? <p className="tiny">آخرین چک‌این: {faDate(new Date(last.ts))} — هر وقت هفته شد دوباره پر کن.</p> : null}
      {CHECKIN_QS.map((q, i) => (
        <label className="field" key={i}>
          <span className="flbl">{fa(i + 1)}. {q}</span>
          <input className="inp" dir="rtl" maxLength={200} value={ans[i]} onChange={(e) => { const a = ans.slice(); a[i] = e.target.value; setAns(a); }} />
        </label>
      ))}
      {saved ? <div className="mini-ok big">ثبت شد؛ فقط پیش خودت 🤫</div> : null}
      <button className="btn primary" type="button" disabled={!canSave} onClick={() => { addCheckin(ans.map((a) => a.trim())); setAns(CHECKIN_QS.map(() => "")); setSaved(true); buzz(10); setTimeout(() => setSaved(false), 2200); reload(); }}>ثبت چک‌این</button>
      {list.length > 1 ? <p className="tiny">{fa(list.length)} تا چک‌این نگه داشته شده؛ فقط پیش خودتون.</p> : null}
    </div>
  );
}

/* ---------------- چالش ۷ روزه ---------------- */
function ChallengeCard({ reload }) {
  const c = getChallenge();
  if (!c) {
    return (
      <div className="card ccard">
        <h3 className="ip-head"><span>🔥</span> چالش ۷ روزه‌ی توجه</h3>
        <p className="dim small">هر روز یه کار کوچیک، ۷ روز پشت‌سرهم. شدش؟ 🔥</p>
        <button className="btn primary" type="button" onClick={() => { startChallenge(); buzz([10, 30, 10]); reload(); }}>شروع چالش</button>
      </div>
    );
  }
  const finished = c.done.length >= 7;
  return (
    <div className="card ccard">
      <h3 className="ip-head"><span>🔥</span> چالش توجه · روز {fa(Math.min(c.day, 7))} از ۷</h3>
      <div className="chbar">{Array.from({ length: 7 }, (_, i) => <span key={i} className={c.done.includes(i + 1) ? "chd on" : "chd"}>{fa(i + 1)}</span>)}</div>
      {finished ? (
        <>
          <p className="fort-txt">تمومش کردید! 🎉 یعنی ۷ روز پشت‌سرهم انتخابش کردید.</p>
          <button className="btn ghost sm" type="button" onClick={() => { stopChallenge(); reload(); }}>پاک کن، دوباره شروع کنیم</button>
        </>
      ) : (
        <>
          <p className="say-one">امروز: {CHALLENGE_DAYS[c.day - 1]}</p>
          <div className="m-row">
            <button className="btn primary" type="button" onClick={() => { advanceChallenge(); buzz(12); reload(); }}>انجامش دادم ✅</button>
            <button className="btn ghost danger sm" type="button" onClick={() => { stopChallenge(); reload(); }}>رهایش کن</button>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------- صندوق حرف‌های ناگفته ---------------- */
function UnsentCard() {
  const [t, setT] = useState("");
  const [tone, setTone] = useState("respect");
  const [out, setOut] = useState("");
  return (
    <div className="card ccard">
      <h3 className="ip-head"><span>📮</span> صندوق حرف‌های ناگفته</h3>
      <p className="dim small">همون حرف سخت رو بنویس؛ لحنش رو نرم می‌کنم. هیچ‌جا نمی‌ره؛ فقط پیش خودته.</p>
      <textarea className="inp" style={{ minHeight: 80, padding: "10px 14px", resize: "none" }} dir="rtl" maxLength={500} placeholder="مثلاً: از وقتی با گوشی حرف می‌زنی حس می‌کنم نیستم…" value={t} onChange={(e) => setT(e.target.value)} />
      <div className="occ-row" style={{ margin: "8px 0" }}>
        {REWRITE_TONES.map((x) => (
          <button key={x.id} type="button" className={"occ-chip" + (tone === x.id ? " sel" : "")} onClick={() => setTone(x.id)}>{x.t}</button>
        ))}
      </div>
      <button className="btn primary" type="button" onClick={() => { setOut(soften(t, tone)); buzz(6); }}>بازنویسی کن</button>
      {out ? (
        <>
          <div className="giftbox"><p className="gift-one">{out}</p></div>
          <button className="btn ghost sm" type="button" onClick={() => { try { navigator.clipboard.writeText(out); } catch {} }}><Ic n="copy" s={14} /> کپی کن</button>
        </>
      ) : null}
    </div>
  );
}

/* ---------------- درس‌های کوتاه ---------------- */
function LessonsCard() {
  const [open, setOpen] = useState(-1);
  return (
    <div className="card ccard">
      <h3 className="ip-head"><span>📚</span> مدرسه‌ی رابطه</h3>
      <div className="iplist">
        {LESSONS.map((l, i) => (
          <div key={i} className="lesson">
            <button className="hi-row" type="button" onClick={() => setOpen(open === i ? -1 : i)}>
              <span className="hi-ico">📖</span>
              <span className="hi-body"><b>{l.t}</b></span>
              <span className="hi-chev" style={{ transform: open === i ? "rotate(180deg)" : undefined }}><Ic n="chev" s={15} /></span>
            </button>
            {open === i ? <p className="lesson-body">{l.d}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- حریم خصوصی ---------------- */
function PrivacyCard({ reload }) {
  const [pinMsg, setPinMsg] = useState("");
  const [pin1, setPin1] = useState("");
  const hasPin = !!getPin();
  const savePin = () => {
    if (!/^\d{4,8}$/.test(pin1)) { setPinMsg("۴ تا ۸ رقم بزن"); return; }
    setPin(pin1);
    setPin1("");
    setPinMsg("قفل فعاله 🔒");
    setTimeout(() => setPinMsg(""), 2400);
  };
  const wipe = async () => {
    if (!confirm("همه‌ی داده‌های تب «ما» (سیکل، حال‌وهوا، پارتنر، خاطره‌ها) برای همیشه پاک بشن؟")) return;
    wipeUs();
    alert("پاک شد؛ از صفر شروع می‌کنیم 🌱");
    reload();
  };
  return (
    <div className="card ccard">
      <h3 className="ip-head"><Ic n="shield" s={16} /> حریم خصوصی</h3>
      <p className="dim small">این اطلاعات مال خودته؛ بدون اجازه‌ت با کسی share نمی‌شه و به هیچ سروری نمی‌ره — همه‌ش روی همین گوشیه. هر لحظه هم می‌تونی همه‌چیز رو پاک کنی. مغز رابطه هم فقط وقتی به هوش مصنوعی می‌ره که خودت چیپش رو تو چت‌یار روشن نگه داشته باشی؛ داده‌ی سیکل هرگز نمی‌ره.</p>
      <div className="pinrow">
        <input className="inp" dir="ltr" type="password" inputMode="numeric" placeholder="پین جدید (۴-۸ رقم)" maxLength={8} value={pin1} onChange={(e) => setPin1(e.target.value.replace(/\D/g, ""))} />
        <button className="btn ghost sm" type="button" onClick={savePin}>{hasPin ? "پین رو عوض کن" : "قفل بذار"}</button>
      </div>
      {pinMsg ? <p className="tiny">{pinMsg}</p> : null}
      <button className="btn ghost danger sm" type="button" onClick={wipe}><Ic n="trash" s={14} /> پاک کردن همه‌ی داده‌های «ما»</button>
    </div>
  );
}

/* ---------------- همراه 💞: اتصال دونفره (v6.2) ---------------- */
const STATUSES = [
  { id: "", t: "همه‌چیز عادی", e: "🙂" },
  { id: "low", t: "امروز انرژی ندارم", e: "🥱" },
  { id: "talk", t: "حوصله‌ی حرف دارم", e: "💬" },
  { id: "hard", t: "یه روز سخت داشتم", e: "🫂" },
];
const stT = (id) => { const s = STATUSES.find((x) => x.id === id); return s ? s.e + " " + s.t : "🙂 همه‌چیز عادی"; };

function DuoCard({ reload }) {
  const [st, setSt] = useState(null);
  const [code, setCode] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const pending = (() => { try { return localStorage.getItem("mk:paircode") || ""; } catch { return ""; } })();

  const load = async () => {
    const r = await api("/api/partner");
    setSt(r.ok && r.data ? r.data : { paired: false });
  };
  useEffect(() => { load(); }, []);

  const flash = (t) => { setMsg(t); setTimeout(() => setMsg(""), 2400); };
  const mkInvite = async () => {
    setBusy(true);
    const r = await api("/api/partner/invite", { method: "POST" });
    setBusy(false);
    if (r.ok && r.data.code) { setCode(r.data); flash("لینک ساخته شد؛ براش بفرست 💌"); }
    else flash((r.data && r.data.message) || "نشد؛ دوباره امتحان کن");
  };
  const accept = async (c) => {
    setBusy(true);
    const r = await api("/api/partner/accept", { method: "POST", body: { code: c || pending } });
    setBusy(false);
    if (r.ok) { try { localStorage.removeItem("mk:paircode"); } catch {} setCode(null); load(); reload(); }
    else flash((r.data && r.data.message) || "نشد؛ دوباره امتحان کن");
  };
  const unlink = async () => {
    if (!confirm("ارتباط با پارتنرت قطع بشه؟ همه‌ی چیزای اشتراک‌گذاشته‌شده از هر دو طرف پاک می‌شه.")) return;
    setBusy(true);
    await api("/api/partner", { method: "DELETE" });
    setBusy(false);
    setSt({ paired: false }); setCode(null);
  };

  if (!st) return <div className="card ccard"><p className="dim small">یه لحظه…</p></div>;
  if (!st.paired) {
    return (
      <div className="card ccard">
        <h3 className="ip-head"><span>💞</span> پارتنرت رو دعوت کن</h3>
        <p className="dim small">با یه لینک، پارتنرت هم به اپ میاد؛ بعد از اون می‌تونید هرچی «خودتون» انتخاب کنید به اشتراک بذارید — از هر طرف، هر لحظه قابل لغو.</p>
        {pending ? (
          <div className="pms-alert" style={{ background: "rgba(34,197,94,.1)", borderColor: "rgba(34,197,94,.35)", color: "#15803d" }}>
            با کد <b dir="ltr">{pending}</b> دعوت شدی.
            <button className="btn primary sm" type="button" disabled={busy} onClick={() => accept()} style={{ marginTop: 8 }}>قبول می‌کنم 💞</button>
          </div>
        ) : null}
        {code ? (
          <div className="giftbox" style={{ textAlign: "center" }}>
            <b className="tiny">کد جفت‌شدن (۷ روز اعتبار):</b>
            <button className="recode" type="button" onClick={() => { try { navigator.clipboard.writeText(code.url || code.code); } catch {} }} dir="ltr">{code.code}</button>
            <button className="btn ghost sm" type="button" onClick={() => { try { navigator.clipboard.writeText(code.url || code.code); } catch {} flash("لینک کپی شد؛ براش بفرست"); }}><Ic n="copy" s={14} /> کپی لینک دعوت</button>
          </div>
        ) : (
          <button className="btn primary" type="button" disabled={busy} onClick={mkInvite}><Ic n="invite" s={15} /> ساخت لینک دعوت</button>
        )}
        {msg ? <p className="tiny">{msg}</p> : null}
      </div>
    );
  }

  return (
    <>
      <div className="card ccard">
        <h3 className="ip-head"><span>💞</span> متصل با {st.partner.name}</h3>
        <p className="dim small">از {faDate(new Date(st.since || Date.now()))} کنارید. هر دو طرف می‌تونید هر لحظه قطع کنید؛ با قطع شدن، همه‌ی چیزای اشتراک‌گذاشته‌شده پاک می‌شه.</p>
        <button className="btn ghost danger sm" type="button" disabled={busy} onClick={unlink}><Ic n="x" s={14} /> قطع ارتباط</button>
      </div>
      <ShareCard st={st} onSaved={load} />
      <TheirCard st={st} />
      <ConflictDuo st={st} onSaved={load} />
    </>
  );
}

function ShareCard({ st, onSaved }) {
  const [status, setStatus] = useState(st.me.status || "");
  const [mood, setMood] = useState(st.me.mood || "");
  const [cycle, setCycle] = useState(!!st.me.cycle);
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const save = async () => {
    setBusy(true);
    let cyc = "";
    if (cycle) { const s = pmsStatus(); if (!s.empty && PHASES[s.phase]) cyc = s.phase; }
    const r = await api("/api/partner/share", { method: "POST", body: { status, mood, cycle: cyc } });
    setBusy(false);
    if (r.ok) { setOk(true); setTimeout(() => setOk(false), 2000); onSaved(); }
  };
  return (
    <div className="card ccard">
      <h3 className="ip-head"><span>📬</span> چی به پارتنرت نشون داده بشه؟</h3>
      <p className="dim small">فقط همین‌ها می‌ره اون‌طرف؛ بقیه‌ی اپ (مثل مغز رابطه و تاریخچه‌ی چت) برای خودته.</p>
      <div className="sospicks">
        {STATUSES.map((s) => (
          <button key={s.id} type="button" className={"sospick" + (status === s.id ? " on" : "")} onClick={() => setStatus(s.id)}>{s.e} {s.t}</button>
        ))}
      </div>
      <input className="inp" dir="rtl" maxLength={60} placeholder="یه جمله برای حال امروزت (اختیاری)" value={mood} onChange={(e) => setMood(e.target.value)} />
      <label className="cyccheck">
        <input type="checkbox" checked={cycle} onChange={(e) => setCycle(e.target.checked)} />
        <span>فاز سیکلم رو هم نشونش بده <b className="tiny">(خیلی خصوصیه؛ فقط اگر کاملاً راحتی)</b></span>
      </label>
      {ok ? <div className="mini-ok big">اشتراک‌گذاری سیو شد</div> : null}
      <button className="btn primary" type="button" disabled={busy} onClick={save}><Ic n="check" s={15} /> سیو کن</button>
    </div>
  );
}

function TheirCard({ st }) {
  const p = st.partner || {};
  const has = p.status || p.mood || p.cycle;
  return (
    <div className="card ccard">
      <h3 className="ip-head"><span>💌</span> {p.name} این روزها…</h3>
      {!has ? (
        <p className="tiny">هنوز چیزی به اشتراک نگذاشته؛ وقتی بذاره همین‌جا می‌بینی.</p>
      ) : (
        <div className="insight">
          {p.status ? <b>{stT(p.status)}</b> : null}
          {p.mood ? <p>«{p.mood}»</p> : null}
          {p.cycle ? <p className="dim small">فاز سیکلش (تخمینی): {PHASES[p.cycle] ? PHASES[p.cycle].t : p.cycle} — {PHASES[p.cycle] ? PHASES[p.cycle].d : ""}</p> : null}
          {p.ts ? <p className="tiny">آخرین به‌روزرسانی: {faDate(new Date(p.ts))}</p> : null}
        </div>
      )}
    </div>
  );
}

function ConflictDuo({ st, onSaved }) {
  const my = st.myConf, their = st.theirConf;
  const [topic, setTopic] = useState(my ? my.topic : "");
  const [ans, setAns] = useState(["", "", "", ""]);
  const [busy, setBusy] = useState(false);
  const merged = my && their ? conflictMerge(my, their) : null;
  const submit = async () => {
    setBusy(true);
    const r = await api("/api/partner/conflict", { method: "POST", body: { topic, ans } });
    setBusy(false);
    if (r.ok) onSaved();
  };
  return (
    <div className="card ccard">
      <h3 className="ip-head"><span>🤝</span> دعوا کردین؟ بیا درستش کنیم</h3>
      {merged ? (
        <>
          <p className="dim small">موضوع: «{their.topic || my.topic}» — هر دو جواب دادید. برداشت‌ها رو مقایسه کن:</p>
          <div className="iplist">
            {merged.map((row, i) => (
              <div className="confrow" key={i}>
                <b className="flbl">{fa(i + 1)}. {row.q}</b>
                <p><span className="confside me">تو:</span> {row.me}</p>
                <p><span className="confside them">{(st.partner && st.partner.name) || "اون"}:</span> {row.them}</p>
              </div>
            ))}
          </div>
          {merged[1] && merged[2] && merged[1].me !== merged[2].them ? (
            <div className="insight"><b>نقطه‌ی اختلاف دیدگاه 🧩</b><p>تو فکر کردی «{merged[1].me}»؛ اون از زاویه‌ی خودش «{merged[2].them}». خیلی وقت‌ها دعوا سرِ خودِ اتفاق نیست؛ سرِ این دو تا برداشته.</p></div>
          ) : null}
          <p className="flbl">مسیر گفت‌وگو بدون دعوا:</p>
          <ol className="confsteps">{CONFLICT_STEPS.map((s, i) => <li key={i}>{s}</li>)}</ol>
        </>
      ) : my ? (
        <>
          <p className="dim small">جواب‌ت برای «{my.topic}» ثبت شد. جواب اون فقط وقتی دیده می‌شه که خودش هم بفرسته.</p>
          <p className="tiny">اگر عوضش کنی، جواب جدید جای قبلی می‌شینه.</p>
          <button className="btn ghost sm" type="button" onClick={() => setAns(["", "", "", ""])}>ویرایش جواب‌هام</button>
        </>
      ) : (
        <>
          <p className="dim small">هر دو بدون اینکه جواب دیگری رو ببینید، جداگانه جواب می‌دید؛ بعد اپ اختلاف دیدگاه رو نشون می‌ده.</p>
          <input className="inp" dir="rtl" maxLength={60} placeholder="موضوع اختلاف (مثلاً: جمعه رفتن کافه)" value={topic} onChange={(e) => setTopic(e.target.value)} />
          {CONFLICT_QS.map((q, i) => (
            <label className="field" key={i}>
              <span className="flbl">{fa(i + 1)}. {q}</span>
              <input className="inp" dir="rtl" maxLength={200} value={ans[i]} onChange={(e) => { const a = ans.slice(); a[i] = e.target.value; setAns(a); }} />
            </label>
          ))}
          <button className="btn primary" type="button" disabled={busy || !topic.trim() || ans.some((x) => !x.trim())} onClick={submit}>ثبت جواب‌هام</button>
        </>
      )}
    </div>
  );
}
