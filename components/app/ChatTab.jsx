"use client";
// ---------------------------------------------------------------------------
// components/app/ChatTab.jsx — چت‌یار: ۶ ابزار + ۹ لحن + استریم زنده +
// حافظه‌ی گفتگو + شبیه‌ساز کرش + کرش‌های چندتایی
// ---------------------------------------------------------------------------
import { useState, useEffect, useRef } from "react";
import { api, getToken } from "@/lib/appauth";
import { Ic } from "@/lib/icons";
import { buzz } from "@/lib/fx";
import { addXp } from "@/lib/rizz";
import { getBrainContext } from "@/lib/relationship";

const MODES = [
  { id: "reply", ic: "chatSpark", t: "پاسخ", ph: "چه گفته یا چه گذشته؟ متنش را بنویس یا اسکرین‌شات را پیوست کن…", scens: ["جوابمو نداده", "دیده ولی ساکته", "گفت فعلاً فقط دوستیم", "تازه آشنا شدیم", "بعد از قرار ساکته", "سر حرف دعوایش شد"] },
  { id: "opener", ic: "spark", t: "شروع", ph: "درباره‌اش چه می‌دانی؟ (بیو، علاقه‌مندی، کجا دیده‌ای…)", scens: ["هم‌کلاسی است", "فالوورم شده", "تو جمع مشترک دیدمش", "ادمین یه پیج است"] },
  { id: "rewrite", ic: "wand", t: "بازنویسی", ph: "پیش‌نویس پیامت را اینجا بچسبان تا همان را با لحن انتخابی صیقل بدهم…", scens: ["خیلی جدی شده", "خیلی بامزه شده", "طولانی است", "خشک و بی‌روح است"] },
  { id: "analyze", ic: "scan", t: "تحلیل", ph: "بیو یا کپشنش را کپی کن؛ یا اسکرین‌شات پروفایل/چت را پیوست کن…", scens: ["بیوی اینستاگرام", "کپشن آخرین پست", "چت قدیمی‌مان"] },
  { id: "date", ic: "calHeart", t: "قرار", ph: "چه حال‌وهوایی می‌خواهی؟ (مثلاً: آرام و قهوه‌ای، پرهیجان، بودجه کم، غریبه نیستیم…)", scens: ["قهوه و پیاده‌رو", "فیلم و پاپ‌کورن", "کوه و طلوع", "بودجه کم", "دور است، آنلاین بگذریم"] },
  { id: "sim", ic: "user", t: "شبیه‌ساز", ph: "انگار داری با خودش حرف می‌زنی؛ اولین پیامت را بفرست تا در نقشِ او جواب بدهم…", scens: ["طرفش سرد و خودخواه است", "خجالتی و کم‌حرف", "شیطان و بازیگوش", "جادار و متمایل"] },
  { id: "game", ic: "dice", t: "بازی", ph: "", scens: [], local: true },
  { id: "comfort", ic: "shieldPlain", t: "دلداری", ph: "چه اتفاقی افتاده و الان چه حسی داره؟ (مثلاً: امتحانش خراب شده، خانوادگی، خسته‌ست…)", scens: ["امتحانش خراب شده", "خسته و کوفته‌ست", "خانوادگی شکرش ریخته", "اخبار بدی شنیده"] },
  { id: "congrats", ic: "star", t: "تبریک", ph: "چه مناسبتیه؟ (قبولی، تولد، پروموشن، اولین قدمش…)", scens: ["قبولی کنکور", "تولدشه", "پروموشن گرفته", "کار جدیدش شروع شده"] },
  { id: "express", ic: "invite", t: "ابراز علاقه", ph: "چقدر جدی هستید و چه سبکی؟ (تازه آشنا شدیم، رابطه‌ی جدی، دیر شده بگم…)", scens: ["تازه آشنا شدیم", "رابطه‌مان جدی است", "دیر شده و نمی‌دانم", "دوریم و دلم تنگ است"] },
  { id: "nothing", ic: "user", t: "«هیچی نیستم»", ph: "وقتی طرف می‌گوید «هیچی نیستم / أهمیتی ندارد» و نمی‌دانی جوابش را چه بدهی…", scens: ["گفته هیچی نیستم و ساکت شده", "گفته مهم نیست ولی معلوم است مهم است", "همه‌اش «باشه» می‌گوید"] },
  { id: "apology", ic: "invite", t: "آشتی", ph: "چه گذشته؟ چه بخشی تقصیر تو بوده و چه حسی داری؟ (خلاصه بگو…)", scens: ["تقصیر من بود", "هر دو بد گفتیم", "قهریم و نمی‌دونم چطور شروع کنم", "دیر جوابش رو دادم"] },
  { id: "sensitive", ic: "shieldPlain", t: "موضوع حساس", ph: "موضوع سخت را بنویس تا قبل از گفتن، جمله‌اش را با هم پیدا کنیم (مثلاً: حسودیت، گذشته، خانواده‌ها…)", scens: ["درباره‌ی گذشته‌ش", "مشکل خانوادگی", "حسودیت شدید", "رابطه‌مان یکنواخت شده"] },
  { id: "sos", ic: "alert", t: "الان چی بگم؟", ph: "همین الان وسط مکالمه‌ای؛ آخرین پیامش و چیزی که می‌خوانی بگو (یا ضبط کن)…", scens: ["متنش رو دیده و جواب نداده", "ازم بغض کرده", "داره قهر می‌کنه", "سوالی پرسیده و نمی‌دونم"] },
  { id: "aftercare", ic: "shieldPlain", t: "پس‌مراقبت", ph: "برای بعد از یک بازی یا لحظه‌ی خصوصی؛ چه چیزی لازم است؟ (مثلاً: آرامشش کن، بگو برجاست، بپرسم حالش خوب است…)", scens: ["می‌خواهم آرامش کنم", "حالم خوب نیست", "می‌خواهم بگویم برجایم"], adult: true },
];

const DECKS = [
  { id: "ice", t: "یخ‌شکن", ic: "snow", cards: ["یک راز کوچک بگو که اینجا هیچ‌کس نمی‌داند", "بدترین قرار خواب‌آلود زندگی‌ات را تعریف کن", "آخرین بار کی برای کسی قلبت تند زد؟", "یک عادت مسخره‌ی خودت را اعتراف کن", "اگر الان اجازه داشته باشی به یکی پیام بدهی، به کی چه می‌گویی؟"] },
  { id: "love", t: "عاشقانه", ic: "invite", cards: ["سه چیزی که دوست داری درباره‌ی من بدانی بگو", "اولین برداشتت از من چه بود؟", "یک خاطره از ما که هنوز به آن می‌خندی", "اگر الان جلوی من بودی، چه می‌کردی؟", "کدام ویژگی‌ام بیشتر از همه دلت را می‌گیرد؟"] },
  { id: "bold", t: "جسورانه", ic: "flame", cards: ["جرأت داری حرف دلت رو با من رک بگی؟", "یه جسورت: بگو کِی از طرفم حسودیت شده", "بگو کدوم پیامم رو ده بار خوندی", "جرأت داری بگی چند بار اسمت رو آورده‌م زبونم؟"] },
  { id: "either", ic: "dice", t: "این یا اون", cards: ["قهوه‌ی سرد یا چای داغ؟", "دریا یا کوه؟", "فیلم در خانه یا سینما؟", "سفر جاده‌ای یا پرواز؟", "صبح‌زود یا شب‌بیدار؟", "گفت‌وگوی عمیق یا شوخی تا صبح؟", "شام خانگی یا رستوران جدید؟", "هدیه‌ی کوچک یا نامه‌ی بلند؟", "تماس صوتی یا پیام طولانی؟", "قرار برنامه‌دار یا بی‌برنامه؟"] },
  { id: "adult", t: "بزرگسال", ic: "crown", adult: true, cards: ["یک مرز نرمِ امشب را با یک کلمه تعیین کن", "بگو کدام نقش امشب مالِ توست", "یک خیال ناگفته را تنها با یک جمله بگو — بدون جزئیات", "جرأت داری امن‌واژه‌ی امشب را انتخاب کنی؟", "یک چیز کوچک که بعد از بازی به‌ترتیبت می‌آید بگو"] },
];

const TONES = [
  { id: "funny", ic: "smile", t: "بامزه" },
  { id: "romantic", ic: "invite", t: "رمانتیک" },
  { id: "literary", ic: "star", t: "ادبی" },
  { id: "direct", ic: "target", t: "مستقیم" },
  { id: "mystery", ic: "eye", t: "مرموز" },
  { id: "cool", ic: "snow", t: "خونسرد" },
  { id: "bold18", ic: "flame", t: "جسورانه", adult: true },
  { id: "dom18", ic: "crown", t: "سلطه‌گر", adult: true },
  { id: "tease18", ic: "sparkles", t: "وسوسه‌گر", adult: true },
];

export default function ChatTab({ user, go, onUser }) {
  const adult = !!(user && user.profile && user.profile.adult);
  const hasKey = !!(user && user.ai && user.ai.hasKey);
  const [mode, setMode] = useState("reply");
  const [tone, setTone] = useState((user && user.profile && user.profile.style) || "funny");
  const [text, setText] = useState("");
  const [imgs, setImgs] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [sugs, setSugs] = useState([]);
  const [simMsg, setSimMsg] = useState("");
  const [live, setLive] = useState("");
  const [copiedIdx, setCopiedIdx] = useState(-1);
  const [crush, setCrush] = useState((user && user.profile && user.profile.crush) || "");
  const [thread, setThread] = useState([]);
  const [rec, setRec] = useState(false);
  const [deck, setDeck] = useState(null);
  const [deckCard, setDeckCard] = useState(null);
  const [toast2, setToast2] = useState("");
  const [brain, setBrain] = useState(() => { try { return localStorage.getItem("mk:brainon") !== "0"; } catch { return true; } });
  const [plan, setPlan] = useState({ city: "", budget: "", dur: "", place: "", vibe: "" });
  const fileRef = useRef(null);
  const boxRef = useRef(null);
  const md = MODES.find((m) => m.id === mode) || MODES[0];
  const planStr = () => [plan.city && "در " + plan.city, plan.budget, plan.dur, plan.place, plan.vibe].filter(Boolean).join(" · ") || "";

  useEffect(() => { setSugs([]); setErr(""); setSimMsg(""); setLive(""); setDeck(null); setDeckCard(null); setPlan({ city: "", budget: "", dur: "", place: "", vibe: "" }); }, [mode]);

  /* درفت SOS از دکمه‌ی شناور */
  useEffect(() => {
    const grab = () => {
      try {
        const d = localStorage.getItem("mk:sosdraft");
        if (d) {
          localStorage.removeItem("mk:sosdraft");
          setMode("sos"); setText(d); setErr("");
        }
      } catch {}
    };
    grab();
    window.addEventListener("mk-sos", grab);
    return () => window.removeEventListener("mk-sos", grab);
  }, []);

  /* میکروفون (Web Speech فارسی) */
  const mic = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setErr("مرورگرت میکروفون رو قبول نمی‌کنه"); return; }
    if (rec) { try { rec.stop && 0; } catch {} return; }
    const r = new SR();
    r.lang = "fa-IR";
    r.interimResults = false;
    r.onresult = (e) => {
      const t = e.results && e.results[0] && e.results[0][0] ? e.results[0][0].transcript : "";
      if (t) setText((p) => (p ? p + " " : "") + t);
    };
    r.onend = () => setRec(false);
    r.onerror = () => { setRec(false); setErr("صدایی نشنیدم؛ یه بار دیگه بگو"); };
    setRec(true);
    try { r.start(); } catch { setRec(false); }
  };

  const addImgs = (files) => {
    const list = [...(files || [])].filter((f) => f && f.type && f.type.startsWith("image/"));
    for (const f of list) {
      if (imgs.length >= 2) { setErr("بیشتر از ۲ تا عکس نمی‌شه"); return; }
      if (f.size > 2 * 1024 * 1024) { setErr("هر عکس حداکثر ۲ مگ"); return; }
      const r = new FileReader();
      r.onload = () => setImgs((p) => (p.length >= 2 ? p : [...p, String(r.result)]));
      r.readAsDataURL(f);
    }
  };

  const saveCrush = async () => {
    const c = crush.trim().slice(0, 32);
    if (!user || c === ((user.profile && user.profile.crush) || "")) return;
    const r = await api("/api/me", { method: "PUT", body: { crush: c } });
    if (r.ok && r.data && r.data.user) onUser(r.data.user);
  };

  const addCrushToList = async () => {
    const c = crush.trim().slice(0, 32);
    if (!c) return;
    const list = [...new Set([...((user.profile && user.profile.crushes) || []), c])].slice(0, 5);
    const r = await api("/api/me", { method: "PUT", body: { crushes: list, crush: c } });
    if (r.ok && r.data && r.data.user) onUser(r.data.user);
  };

  const finish = (raw) => {
    if (!raw) { setErr("جوابی نیومد؛ یه بار دیگه امتحان کن"); setBusy(false); return; }
    if (mode === "sim") {
      setSimMsg(raw.trim());
      setThread((p) => [...p, { q: text.trim(), a: raw.trim().split("\n")[0].slice(0, 300) }].slice(-6));
    } else {
      const list = parseSugs(raw);
      setSugs(list);
      setThread((p) => [...p, { q: text.trim(), a: (list[0] || raw).slice(0, 300) }].slice(-6));
    }
    setBusy(false);
    addXp(5);
    try { buzz(10); } catch {}
    if (boxRef.current) boxRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const send = async (again) => {
    const t = text.trim();
    if (!t && imgs.length === 0) { setErr("اول یه چیزی بنویس یا عکس بذار"); return; }
    if (!hasKey) { go("settings"); return; }
    if (TONES.find((x) => x.id === tone && x.adult) && !adult) { setErr("این لحن فقط واسه بزرگسالا باز می‌شه؛ سنت رو تو تنظیمات تأیید کن"); return; }
    setBusy(true); setErr(""); setCopiedIdx(-1); setSugs([]); setSimMsg(""); setLive("");
    const hist = thread.flatMap((x) => [{ role: "user", content: x.q }, { role: "assistant", content: x.a }]).slice(-12);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: "Bearer " + (getToken() || "") },
        body: JSON.stringify({ text: t || "این تصویر را ببین.", images: imgs, style: tone, mode, again: !!again, msgs: hist, stream: true, brain: brain ? getBrainContext() : "" }),
      });
      const ctype = res.headers.get("content-type") || "";
      if (ctype.includes("text/event-stream")) {
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = "";
        let full = "";
        setLive(" ");
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() || "";
          for (const line of lines) {
            const l = line.trim();
            if (!l.startsWith("data:")) continue;
            const pay = l.slice(5).trim();
            if (!pay || pay === "[DONE]") continue;
            try {
              const j = JSON.parse(pay);
              const d = j.choices && j.choices[0] && (j.choices[0].delta || j.choices[0].message);
              if (d && d.content) { full += d.content; setLive(full); }
            } catch {}
          }
        }
        finish(full);
        return;
      }
      const j = await res.json().catch(() => null);
      if (j && j.ok && j.reply) { finish(j.reply); return; }
      if (res.status === 401) { try { localStorage.removeItem("mk:token"); localStorage.removeItem("mk:user"); } catch {} go("settings"); setBusy(false); return; }
      setErr((j && j.message) || "چیزی برنگشت؛ دوباره بزن");
      setBusy(false);
    } catch { setErr("ارتباط برقرار نشد"); setBusy(false); }
  };

  const copySug = async (s, i) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(s);
      else {
        const ta = document.createElement("textarea");
        ta.value = s; document.body.appendChild(ta); ta.select();
        document.execCommand("copy"); ta.remove();
      }
      setCopiedIdx(i);
      setTimeout(() => setCopiedIdx(-1), 1500);
      try {
        buzz(8);
        addXp(10);
        const w = JSON.parse(localStorage.getItem("mk:wins") || "{}");
        w[tone] = (w[tone] || 0) + 1;
        localStorage.setItem("mk:wins", JSON.stringify(w));
      } catch {}
    } catch {}
  };

  const crushes = ((user.profile && user.profile.crushes) || []);

  return (
    <div className="chattab">
      <header className="tabhead">
        <h2><Ic n="chatSpark" s={20} /> چت‌یار</h2>
        <p>هر پیامی لازم داری، با لحن خودت</p>
      </header>

      {!hasKey ? (
        <div className="ai-banner" role="alert">
          <Ic n="key" s={20} />
          <div>
            <b>هوش مصنوعی وصل نیست</b>
            <p>در تنظیمات، با یک کلیک از طریق اکانتت وصل شو (بدون کلید و دردسر) یا کلید خودت را بگذار.</p>
          </div>
          <button className="btn ghost sm" type="button" onClick={() => go("settings")}>تنظیمات</button>
        </div>
      ) : null}

      <div className="crushrow card">
        <Ic n="invite" s={17} />
        <input className="cinp" placeholder="کرشت کیه؟ (اختیاری)" value={crush}
          onChange={(e) => setCrush(e.target.value)} onBlur={saveCrush} maxLength={32} />
        <button type="button" className="c-addcrush" aria-label="افزودن به لیست" onClick={addCrushToList}><Ic n="plus" s={15} /></button>
      </div>
      {crushes.length ? (
        <div className="crushchips">
          {crushes.map((c) => (
            <button key={c} type="button" className={"cchip" + (crush === c ? " on" : "")} onClick={() => { setCrush(c); api("/api/me", { method: "PUT", body: { crush: c } }).then((r) => { if (r.ok && r.data && r.data.user) onUser(r.data.user); }); }}>
              {c}
            </button>
          ))}
        </div>
      ) : null}

      <div className="modes" role="tablist" aria-label="ابزار">
        {MODES.map((m) => {
          const locked = m.adult && !adult;
          return (
            <button key={m.id} type="button" role="tab" aria-selected={mode === m.id}
              className={"mode-chip" + (mode === m.id ? " on" : "") + (locked ? " locked" : "")}
              onClick={() => (locked ? (setMode("reply"), setErr("این یکی فقط واسه بزرگسالا باز می‌شه؛ سنت رو تأیید کن"), go("settings")) : setMode(m.id))}>
              <Ic n={locked ? "lock" : m.ic} s={16} /> {m.t}{m.adult ? <em style={{ fontStyle: "normal", fontSize: 9, marginInlineStart: 4, opacity: .8 }}>۱۸+</em> : null}
            </button>
          );
        })}
      </div>

      <div className="tones" aria-label="لحن">
        {TONES.map((t) => {
          const locked = t.adult && !adult;
          return (
            <button key={t.id} type="button"
              className={"tone-chip" + (t.id === tone ? " on" : "") + (t.adult ? " adult" : "") + (locked ? " locked" : "")}
              onClick={() => (locked ? (setTone("funny"), setErr("لحن‌های +۱۸ با تأیید سن تو تنظیمات باز می‌شن"), go("settings")) : setTone(t.id))}>
              <Ic n={locked ? "lock" : t.ic} s={15} /> {t.t}
              {t.adult ? <em>۱۸+</em> : null}
            </button>
          );
        })}
      </div>

      <div className="brainrow">
        <button type="button" className={"brainchip" + (brain ? " on" : "")} onClick={() => { const v = !brain; setBrain(v); try { localStorage.setItem("mk:brainon", v ? "1" : "0"); } catch {} }}>
          <Ic n="spark" s={14} /> مغز رابطه {brain ? "روشن" : "خاموش"}
        </button>
        <span className="tiny">با اجازه‌ت از «درباره‌ی پارتنرم» برای شخصی‌سازی جواب‌ها استفاده می‌شه</span>
      </div>

      {md.id === "date" ? (
        <div className="dplanner card">
          <b className="flbl"><Ic n="calHeart" s={14} /> قرارساز</b>
          <input className="inp dpcity" dir="rtl" maxLength={24} placeholder="کدوم شهر؟ (اختیاری)" value={plan.city} onChange={(e) => setPlan({ ...plan, city: e.target.value })} />
          {[["budget", "بودجه", ["بدون هزینه", "اقتصادی", "متوسط", "خاص"]], ["dur", "مدت", ["کوتاه (۲ ساعت)", "نیم‌روز", "تمام‌روز"]], ["place", "فضا", ["داخل", "بیرون", "فرقی نمی‌کنه"]], ["vibe", "حال‌وهوا", ["رمانتیک", "باحال", "آرام", "ماجراجو"]]].map(([k, t, opts]) => (
            <div className="dprow" key={k}>
              <span className="dpk">{t}</span>
              <div className="dpopts">
                {opts.map((o) => (
                  <button key={o} type="button" className={"occ-chip" + (plan[k] === o ? " sel" : "")} onClick={() => setPlan({ ...plan, [k]: plan[k] === o ? "" : o })}>{o}</button>
                ))}
              </div>
            </div>
          ))}
          {planStr() ? (
            <div className="datecond">
              <span>{planStr()}</span>
              <button className="btn ghost sm" type="button" onClick={() => { setText((p) => (p ? p + "\n" : "") + "شرط قرارم: " + planStr()); }}><Ic n="plus" s={14} /> بذار توی پیام</button>
            </div>
          ) : null}
        </div>
      ) : null}

      {md.scens && md.scens.length ? (
        <div className="scens">
          {md.scens.map((s) => (
            <button key={s} type="button" className="scen" onClick={() => setText((p) => (p ? p + " " : "") + (mode === "sim" ? "(شخصیت طرف: " + s + ") " : s))}>+ {s}</button>
          ))}
        </div>
      ) : null}

      {md.local ? (
        <div className="deck" ref={boxRef}>
          <div className="deckcats">
            {DECKS.map((d) => {
              const locked = d.adult && !adult;
              return (
                <button key={d.id} type="button" className={"mode-chip" + (deck === d.id ? " on" : "") + (locked ? " locked" : "")}
                  onClick={() => { if (locked) { setErr("این دسته فقط واسه بزرگسالا باز می‌شه"); go("settings"); return; } setDeck(d.id); setDeckCard(null); }}>
                  <Ic n={locked ? "lock" : d.ic} s={16} /> {d.t}{d.adult ? <em style={{ fontStyle: "normal", fontSize: 9, marginInlineStart: 4, opacity: .8 }}>۱۸+</em> : null}
                </button>
              );
            })}
          </div>
          {!deck ? (
            <div className="deckcard card" onClick={() => setDeck("ice")}>
              <span className="dtile"><Ic n="dice" s={26} /></span>
              <p>حقیقت یا جرأت</p>
              <span className="dcat">یک دسته انتخاب کن؛ بدون هوش مصنوعی هم بازی کن — یا کارت را برای طرف بفرست</span>
            </div>
          ) : !deckCard ? (
            <div className="deckcard card" onClick={() => { const D = DECKS.find((x) => x.id === deck); setDeckCard(D.cards[Math.floor(Math.random() * D.cards.length)]); addXp(3); }}>
              <span className="dtile"><Ic n="dice" s={26} /></span>
              <p>بکش</p>
              <span className="dcat">لمس کن و ببین چی می‌آید</span>
            </div>
          ) : (
            <div className={"deckcard card" + (DECKS.find((x) => x.id === deck).adult ? " adult" : "")}>
              <span className="dtile"><Ic n={DECKS.find((x) => x.id === deck).ic} s={26} /></span>
              <p>{deckCard}</p>
              <span className="dcat">دسته‌ی {DECKS.find((x) => x.id === deck).t}</span>
              <div className="deckrow">
                <button className="btn ghost sm" type="button" onClick={() => { const D = DECKS.find((x) => x.id === deck); setDeckCard(D.cards[Math.floor(Math.random() * D.cards.length)]); addXp(2); }}><Ic n="refresh" s={15} /> یکی دیگه</button>
                <button className="btn primary sm" type="button" onClick={async () => { try { if (navigator.share) await navigator.share({ text: "حقیقت یا جرأت؟ " + deckCard }); else { await navigator.clipboard.writeText(deckCard); setToast2("کپی شد — برای طرف بفرست"); setTimeout(() => setToast2(""), 1500); } } catch {} }}><Ic n="share" s={15} /> بفرست برای طرف</button>
              </div>
            </div>
          )}
          {toast2 ? <div className="mini-ok big">{toast2}</div> : null}
        </div>
      ) : null}

      {thread.length ? (
        <div className="memstrip glass">
          <Ic n="clock" s={14} />
          <span>حافظه‌ی گپ: {thread.length} رفت‌وبرگشت تا الان</span>
          <button type="button" aria-label="پاک کردن حافظه" onClick={() => setThread([])}><Ic n="x" s={13} /></button>
        </div>
      ) : null}

      <div className="cbox card" ref={md.local ? null : boxRef} style={md.local ? { display: "none" } : undefined}>
        <textarea className="ctxt" rows={4} value={text} placeholder={md.ph}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !busy) { e.preventDefault(); send(false); } }}
          onPaste={(e) => { const it = e.clipboardData && e.clipboardData.items ? [...e.clipboardData.items] : []; const im = it.find((i) => i.type && i.type.startsWith("image/")); if (im) { const f = im.getAsFile(); if (f) { e.preventDefault(); addImgs([f]); } } }}
          maxLength={2000} />
        {imgs.length ? (
          <div className="imgprev">
            {imgs.map((d, i) => (
              <div key={i} className="iprev">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={d} alt={"تصویر " + (i + 1)} />
                <button type="button" aria-label="حذف تصویر" onClick={() => setImgs(imgs.filter((_, j) => j !== i))}><Ic n="x" s={12} /></button>
              </div>
            ))}
          </div>
        ) : null}
        <div className="cfoot">
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { addImgs(e.target.files); e.target.value = ""; }} />
          <button type="button" className={"c-att" + (imgs.length >= 2 ? " off" : "")} aria-label="پیوست تصویر" onClick={() => fileRef.current && fileRef.current.click()}>
            <Ic n="image" s={19} />
          </button>
          <button type="button" className={"c-mic" + (rec ? " rec" : "")} aria-label="گفتار به متن" onClick={mic}>
            <Ic n="mic" s={19} />
          </button>
          <span className="dim tiny ccount">{text.length ? text.length + "/۲۰۰۰" : "اینتر بفرست · شیفت+اینتر خط جدید"}</span>
          <button type="button" className="c-send" disabled={busy} aria-label="بفرست" onClick={() => send(false)}>
            {busy ? <span className="spinner" /> : <Ic n="send" s={19} />}
          </button>
        </div>
      </div>

      {err ? <div className="chat-err" role="alert"><Ic n="alert" s={16} /> {err}
        {/بزرگسال/.test(err) ? <button className="btn ghost sm" type="button" onClick={() => go("settings")}>تأیید سن</button> : null}
      </div> : null}

      {busy && live ? (
        <div className="sim-bubble live card"><p>{live}<span className="caret" /></p></div>
      ) : busy ? (
        <div className="thinking card"><span className="tdots"><i /><i /><i /></span> مخ‌یار داره فکر می‌کنه…</div>
      ) : null}

      {simMsg ? (
        <>
          <div className="sim-bubble card">
            <span className="sb-who">در نقش کرشت:</span>
            <p>{simMsg}</p>
          </div>
          <button type="button" className="btn ghost sm again" onClick={() => send(true)} disabled={busy}>
            <Ic n="refresh" s={16} /> ادامه‌اش بده
          </button>
        </>
      ) : null}

      {sugs.length ? (
        <div className="sugs">
          {sugs.map((s, i) => (
            <div key={i} className="sug card">
              <span className="sugn">{String(i + 1).padStart(2, "0")}</span>
              <p>{s}</p>
              <button type="button" className={"sugcopy" + (copiedIdx === i ? " ok" : "")} onClick={() => copySug(s, i)}>
                <Ic n={copiedIdx === i ? "check" : "copy"} s={16} />
              </button>
            </div>
          ))}
          <button type="button" className="btn ghost sm again" onClick={() => send(true)} disabled={busy}>
            <Ic n="refresh" s={16} /> یکی دیگه بزن
          </button>
        </div>
      ) : null}
    </div>
  );
}

function parseSugs(raw) {
  const lines = String(raw || "").split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const out = [];
  for (let l of lines) {
    l = l.replace(/^(?:[۰-۹0-9]+)\s*[\)\.\-‌:،]\s*/, "").trim();
    if (l) out.push(l);
  }
  const clean = out.filter((l) => l.length > 1);
  if (clean.length >= 2) return clean.slice(0, 6);
  return [String(raw || "").trim()];
}
