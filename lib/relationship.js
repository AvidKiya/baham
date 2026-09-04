// lib/relationship.js — مغز رابطه 🧠 (کاملاً محلی؛ هیچ داده‌ای به سرور نمی‌ره)
// پروفایل پارتنر + حال روزانه + زبان عشق + سلامت رابطه + چالش‌ها + هدیه‌یاب

const DAY = 86400000;
const iso = (d) => { const t = new Date(d); return t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0"); };
const rd = (k, def) => { try { const v = localStorage.getItem(k); return v === null ? def : JSON.parse(v); } catch { return def; } };
const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

/* ---------- حال روزانه ---------- */
export const MOODS = [
  { id: "great", t: "عالی", e: "🤩" }, { id: "good", t: "خوب", e: "🙂" }, { id: "ok", t: "معمولی", e: "😐" },
  { id: "tired", t: "خسته", e: "🥱" }, { id: "sad", t: "ناراحت", e: "😔" }, { id: "angry", t: "عصبی", e: "😤" }, { id: "alone", t: "نیاز به تنهایی", e: "🌙" },
];
export const getMoods = () => rd("mk:moods", []);
export const logMood = (id) => {
  const l = getMoods().filter((x) => x.d !== iso(new Date()));
  l.unshift({ d: iso(new Date()), m: id });
  wr("mk:moods", l.slice(0, 120));
  return l.slice(0, 120);
};
export const moodInsight = (pms) => {
  const l = getMoods();
  if (l.length < 4) return null;
  const cnt = {};
  l.slice(0, 30).forEach((x) => { cnt[x.m] = (cnt[x.m] || 0) + 1; });
  const top = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
  const mt = MOODS.find((m) => m.id === top[0]);
  if (!mt) return null;
  let pmsLine = "";
  try {
    if (pms && pms.logs && pms.logs.length) {
      const late = l.filter((x) => x.m === "tired" || x.m === "sad").filter((x) => pms.logs.some((g) => { const diff = (new Date(x.d) - new Date(g)) / DAY; return diff >= 21 && diff <= 28; }));
      if (late.length >= 2) pmsLine = "الانم: الان که نزدیک موعدی، بیشتر خسته/ناراحتی — طبیعیه، خودت رو ببخش 🧡";
    }
  } catch {}
  return { top: mt, n: top[1], total: Math.min(l.length, 30), pmsLine };
};

/* ---------- زبان عشق ---------- */
export const LOVE_LANGS = [
  { id: "words", t: "کلام محبت‌آمیز", e: "💬", d: "براش تعریف و جمله‌های گرم از همه‌چیز بیشتر معنی داره." },
  { id: "time", t: "وقت گذاشتن", e: "⏰", d: "حضور بی‌وقفه‌ی تو، بهترین هدیه‌ست؛ حتی بی‌کارِ خاص." },
  { id: "gifts", t: "هدیه", e: "🎁", d: "یه یادگاری کوچیک براش نمادِ دیده‌شدنه." },
  { id: "acts", t: "کمک و توجه", e: "🤝", d: "کارای عملی (ظرف، شارژ، راه افتادن) براش یعنی عشق." },
  { id: "touch", t: "تماس و صمیمیت", e: "🤗", d: "دست گرفتن، بغل و نزدیکی فیزیکی زبون عشقشه." },
];
export const LL_QUIZ = [
  { q: "یه روز سخت گذشته؛ چی بیشتر آدمیت رو درمیاره؟", o: [["یه پیام گرم", "words"], ["بی سؤال بیاید کنارم", "time"], ["یه یادگاری کوچیک", "gifts"], ["کارام رو انجام کنه", "acts"], ["فقط بغل کنم", "touch"]] },
  { q: "برای نشان دادن علاقه‌ت اول سراغ چی می‌ری؟", o: [["می‌گم چقدر دوستش دارم", "words"], ["وقت خالص می‌ذارم", "time"], ["یه چیزی می‌خرم", "gifts"], ["کارش رو سبک می‌کنم", "acts"], ["نزدیکش می‌شم", "touch"]] },
  { q: "کدوم یکی نادیده گرفته بشه بیشتر می‌زنه؟", o: [["کلام سرد", "words"], ["با گوشی حرف زدن", "time"], ["بدون یادگاری موندن مناسبت", "gifts"], ["کمک نکردن", "acts"], ["دور بودن", "touch"]] },
  { q: "بهترین تعطیلات دونفره؟", o: [["گپ تا صبح", "words"], ["سفر دوتایی", "time"], ["کادوپیچ کردن", "gifts"], ["باهم یه پروژه", "acts"], ["دست تو دست", "touch"]] },
  { q: "وقتی دلتنگت می‌شه چی می‌کنی؟", o: [["پیام صمیمی", "words"], ["قرار می‌ذارم", "time"], ["یه چیزی می‌فرستم", "gifts"], ["کارش رو می‌کنم", "acts"], ["بغلش می‌کنم", "touch"]] },
];
export const getLL = () => rd("mk:ll", null);
export const setLL = (id) => wr("mk:ll", { id, ts: Date.now() });

/* ---------- پروفایل پارتنر (مغز رابطه) ---------- */
export const P_FIELDS = [
  { k: "food", t: "غذای موردعلاقه" }, { k: "flower", t: "گل موردعلاقه" }, { k: "color", t: "رنگ موردعلاقه" },
  { k: "movie", t: "فیلم/سریال موردعلاقه" }, { k: "size", t: "سایز لباس" }, { k: "dislike", t: "چیزایی که دوست نداره" },
  { k: "friends", t: "اسم دوستاش" }, { k: "dream", t: "آرزوهاش" }, { k: "sign", t: "وقتی ناراحته چی می‌کنه" },
];
export const getPartner = () => rd("mk:partner", { name: "", f: {} });
export const setPartner = (p) => wr("mk:partner", p);

/* ---------- «یه چیزی گفته بود...» ---------- */
export const getWishes = () => rd("mk:wishes", []);
export const addWish = (text) => {
  const l = getWishes();
  l.unshift({ text: String(text).slice(0, 200), ts: Date.now(), done: false });
  wr("mk:wishes", l.slice(0, 50));
  return l.slice(0, 50);
};
export const toggleWish = (i) => { const l = getWishes(); if (l[i]) { l[i].done = !l[i].done; wr("mk:wishes", l); } return l; };
export const delWish = (i) => { const l = getWishes().filter((_, k) => k !== i); wr("mk:wishes", l); return l; };
export const oldWishes = () => {
  const l = getWishes().filter((w) => !w.done && Date.now() - w.ts > 21 * DAY);
  return l.slice(0, 3);
};

/* ---------- هدیه‌یاب (بر اساس بودجه + پروفایل) ---------- */
export const BUDGETS = [
  { id: "free", t: "بدون هزینه" }, { id: "eco", t: "اقتصادی" }, { id: "mid", t: "زیر ۵۰۰ هزار" }, { id: "high", t: "خاص" },
];
export const giftFor = (budget, partner) => {
  const p = (partner && partner.f) || {};
  const name = (partner && partner.name) || "طرفت";
  const G = {
    free: [
      p.food ? `ناهار خانگی با «${p.food}» که می‌دونم عاشقشه 🍽️` : "یه ناهار خانگی ساده با چاشنی موزیک موردعلاقه‌ش",
      "نامه‌ی دست‌نویس ۱۰ خطی؛ کاغذ قشنگ پیدا کن و پست کن",
      "یادداشتای چسبنده رو می‌چسبون به آینه/لپ‌تاپش قبل برخورد",
      "یه پیاده‌روی غروب بدون گوشی؛ فقط شما دو نفر",
    ],
    eco: [
      p.flower ? `دسته‌گل کوچیک ${p.flower} + کارت دست‌نویس 🌷` : "یه شاخه گل + کارت دست‌نویس",
      p.movie ? `شب «${p.movie}» با پاپ‌کورن و پتو 🎬` : "شب فیلم با پاپ‌کورن و پتوی دونفره",
      "یه فلاسک چای + پارک یا ساحل، ساعت غروب",
      "یه میوه‌ی خاص که هیچ‌وقت نخریدی + جمله‌ی «به خودت یادم انداختی»",
    ],
    mid: [
      p.size ? `یه تیشرت سلیقه‌ای سایز ${p.size}` : "یه اکسسوری کوچیک ولی دقیق (ساعت/شال/کیف کوچیک)",
      "رستورانی که ماه‌هاست می‌گه «یه روز بریم» + رزرو میز",
      "باکس مراقبت: عطر کوچیک + ماسک + شمع + یادداشت",
      p.dream ? `یه قدم کوچیک به سمت «${p.dream}»ش` : "یه کلاس/تجربه‌ی جدید دونفره",
    ],
    high: [
      "سفر یه‌شبه سروصدا؛ فقط ساعتش رو بگو بقیه‌ش سورپرایز",
      "دوربین لحظه‌ای + یه شب عکس‌برداری دونفره",
      "جواهر/ساعت با حک اسم؛ کلاسیک و ماندگار",
      "همه‌ی آهنگای مشترکتون تو یه پلی‌لیست + اسپیکر خوب",
    ],
  };
  const list = G[budget] || G.free;
  const idea = list[Math.floor(Math.random() * list.length)];
  const scenarios = [
    "سناریو: بدون توضیح بگو ساعت ۶ آماده باش؛ خودش رو برسون جایی که نگفتی.",
    "سناریو: کادو رو جا بذار (کیف کارش/زیر بالش) با یه نوت «امشب قبل خواب بازش کن».",
    "سناریو: اول یه شام معمولی؛ آخر شام با یه جمله‌ی ساده تقدیمش کن.",
    "سناریو: بفرستش یه ماموریت پیامکی؛ سه سرنخ، آخرش خودت و کادو.",
  ];
  return { idea, scenario: scenarios[Math.floor(Math.random() * scenarios.length)], name };
};

/* ---------- سلامت رابطه ---------- */
export const SCORE_DIMS = [
  { id: "comm", t: "ارتباط" }, { id: "atten", t: "توجه" }, { id: "trust", t: "اعتماد" }, { id: "fun", t: "تفریح" },
  { id: "conflict", t: "حل اختلاف" }, { id: "close", t: "صمیمیت" }, { id: "time", t: "وقت مشترک" },
];
export const getScore = () => rd("mk:rscore", null);
export const setScore = (v) => wr("mk:rscore", { v, ts: Date.now() });
export const weakest = (s) => {
  if (!s) return null;
  const arr = SCORE_DIMS.map((d) => ({ ...d, n: s[d.id] || 3 })).sort((a, b) => a.n - b.n);
  return arr[0];
};

/* ---------- چک‌این هفتگی ---------- */
export const CHECKIN_QS = [
  "این هفته از رابطه‌مون چقدر راضی بودی؟",
  "چیزی هست که اذیتت کرده؟",
  "دوست داشتی بیشتر چه کاری کنم؟",
  "یه خاطره‌ی خوب این هفته؟",
  "هفته‌ی بعد چی رو باهم شروع کنیم؟",
];
export const getCheckins = () => rd("mk:checkins", []);
export const addCheckin = (answers) => {
  const l = getCheckins();
  l.unshift({ ts: Date.now(), a: answers });
  wr("mk:checkins", l.slice(0, 52));
  return l.slice(0, 52);
};

/* ---------- چالش ۷ روزه توجه ---------- */
export const CHALLENGE_DAYS = [
  "یه تعریفِ واقعی و دقیق ازش کن",
  "یه خاطره‌ی مشترک رو از زاویه‌ی دید خودت تعریف کن",
  "۳۰ دقیقه بدون موبایل، فقط شما دو نفر",
  "یه سورپرایز کوچیک بی‌مناسبت",
  "یه کارش رو بدون اینکه بخواهت انجام بده",
  "ازش یه سؤال عمیق بپرس و فقط گوش بده",
  "بهش بگو چرا از بودن باهاش خوشبختی",
];
export const getChallenge = () => rd("mk:ch7", null);
export const startChallenge = () => { const c = { start: Date.now(), day: 1, done: [] }; wr("mk:ch7", c); return c; };
export const advanceChallenge = () => {
  const c = getChallenge();
  if (!c) return null;
  if (!c.done.includes(c.day)) c.done.push(c.day);
  if (c.day < 7) c.day += 1;
  wr("mk:ch7", c);
  return c;
};
export const stopChallenge = () => { try { localStorage.removeItem("mk:ch7"); } catch {} };

/* ---------- صندوق حرف‌های ناگفته ---------- */
export const REWRITE_TONES = [
  { id: "respect", t: "محترمانه" },
  { id: "warm", t: "صمیمی" },
  { id: "noclame", t: "بدون سرزنش" },
  { id: "direct", t: "مستقیم" },
];
export const soften = (text, tone) => {
  const t = String(text || "").trim();
  if (!t) return "";
  if (tone === "respect") return "سلام. یه چیزی ذهنم رو مشغول کرده و احترام‌آمیز می‌خوام بگم: " + t + " اگه اشتباه می‌کنم لطفاً بگو؛ هدفم فهمیدنه، نه شکایت.";
  if (tone === "warm") return "می‌خوام یه چیزی رو با علاقه بگم چون برام مهمی: " + t + " هیچ فشاری نیست؛ فقط دوست دارم بدونی چی حس می‌کنم ❤️";
  if (tone === "noclame") return "احساسم رو از خودم می‌گم نه از تو: " + t.replace(/تو /g, "من ").replace(/شما /g, "من ") + ". این حس مال منه و می‌خوام باهم راه‌حلش رو پیدا کنیم.";
  return "مستقیم می‌گم: " + t + " برام مهمه که بدونی و یه جواب روشن بهم بدی.";
};

/* ---------- درس‌های کوتاه رابطه ---------- */
export const LESSONS = [
  { t: "چطور دعوا کنیم؟", d: "قانون اول: با «من» شروع کن نه «تو». به‌جای «تو همیشه دیر می‌کنی» بگو «وقتی دیر می‌شه نگران می‌شم». یه موضوع در یه دعوا؛ لیست جرم‌ها نساز. پایان هر دعوا باید یه تصمیم کوچیک باشه." },
  { t: "چطور عذرخواهی کنیم؟", d: "عذرخواهی واقعی سه‌تاست: ۱) دقیق بگو چی کار کردی ۲) بگو چه حسی به طرف داده ۳) بگو چه چیزی رو فرق می‌ذاری. «متأسفم اگه ناراحت شدی» عذرخواهی نیست؛ مسئولیت پذیرفتنه." },
  { t: "چطور مرز بذاریم؟", d: "مرز سالم = خواسته‌ی روشن + نتیجه‌ی روشن. «این جمله رو دوست ندارم؛ اگه تکرار بشه من از گفت‌وگو فاصله می‌گیرم.» مرز یعنی چی کار می‌کنی، نه اینکه طرف رو کنترل کنی." },
  { t: "حسادت رو چطور مدیریت کنیم؟", d: "اول از همه: حسادت احساسه، جرم نیست. سه‌گام: اسم احساس رو بذار (ترس از دست دادن؟)، به‌جای اتهام، نیازت رو بگو («نیاز دارم بیشتر مطمئن‌م بشم»)، و بالاخره خودت هم چک کن واقعیت چیه نه تفسیرت." },
  { t: "درباره‌ی پول چطور حرف بزنیم؟", d: "پول سخت‌ترین موضوعه؛ پس قاعده بذارید: یه وقت مشخص، بدون قضاوت، با اعداد واقعی. اول رویاهاتون رو بگید بعد محدودیت‌ها رو. پول ابزاره، نه معیار عشق." },
  { t: "درباره‌ی آینده چطور صحبت کنیم؟", d: "سؤالای بزرگ (ازدواج، شهر، بچه) رو قطره‌قطره بپرسید نه یه‌جا. «تا یه سال دیگه چه تصویری از زندگیت داری؟» بهتر از «قراره کِی بخوای؟» است." },
  { t: "چطور «نه» بشنویم؟", d: "نهِ محترمانه یعنی طرف به خودش و به تو صادق بوده. جواب درست: «ممنون که راحت گفتی.» حالِ بدت رو قبول کن، ولی خودت رو کوچیک نکن؛ نه فقط درباره‌ی تو نیست." },
];

/* ---------- قفل و پاک‌سازی ---------- */
export const getPin = () => rd("mk:uspin", null);
export const setPin = (p) => wr("mk:uspin", String(p).slice(0, 8));
export const wipeUs = () => {
  ["mk:pms", "mk:anniv", "mk:occs", "mk:moods", "mk:ll", "mk:partner", "mk:wishes", "mk:rscore", "mk:checkins", "mk:ch7", "mk:uspin"].forEach((k) => { try { localStorage.removeItem(k); } catch {} });
};

/* ---------- SOS: جواب‌های سریع محلی (v6.1) ---------- */
export const SOS_QUICK = [
  {
    id: "cold", t: "سرد شده",
    a: [
      "«یه مدیده کمتر حرف می‌زنیم؛ چیزی شده که بدونم؟ فقط می‌خوام بفهمم، نه اینکه گیر بدم.»",
      "«حس می‌کنم یه فاصله‌ای افتاده؛ اگه حوصله‌ش رو داری، بگو چی توی ذهنته.»",
      "«نمی‌خوام با حدس‌وگمان سرت شلوغ کنم؛ هر وقت راحتی من هستیم که حرف بزنیم.»",
    ],
  },
  {
    id: "sad", t: "بغض کرده",
    a: [
      "«می‌بینم حالت خوب نیست؛ لازم نیست الان حرف بزنی، فقط بدونم که هستم.»",
      "«چیزی که گفتم شاید بی‌ملاحظه بود؛ اگه آزارت داد بگو تا درستش کنم.»",
      "«نمی‌خوام حلش کنم الان؛ فقط می‌خوام بدونم کنارت باشم یا بهت فضا بدم؟»",
    ],
  },
  {
    id: "mad", t: "قهر کرده",
    a: [
      "«قهر رو نمی‌خوام طولانی کنم؛ اگه تقصیر من بود بگو کجاش بود تا جبران کنم.»",
      "«حرف آخرم: من رابطه‌مون رو از غرورم بیشتر دوست دارم. آماده‌م حرف بزنیم.»",
      "«یه پیام کوتاه کافیه که بگی هنوز می‌خوای حرف بزنیم؛ اون‌وقت من شروع می‌کنم.»",
    ],
  },
  {
    id: "short", t: "جوابش کوتاه شده",
    a: [
      "«سؤالی بپرسم که جوابش یه کلمه بیشتر باشه؟ دلم برات تنگه.»",
      "«جواب‌های کوتاه رو می‌بینم؛ شاید سرت شلوغه؟ اگه آره بعداً حرف می‌زنیم.»",
      "«بیا یه چیز ساده: امشب یه تماس ۵ دقیقه‌ای؟ صدات کم هم بشه کافیه.»",
    ],
  },
];

/* ---------- مغز رابطه → چت‌یار (v6.1) ---------- */
export const getBrainContext = () => {
  try {
    const parts = [];
    const pa = getPartner();
    if (pa && (pa.name || Object.keys(pa.f || {}).some((k) => (pa.f[k] || "").trim()))) {
      const bits = [];
      if (pa.name) bits.push("اسمش: " + pa.name);
      for (const fl of P_FIELDS) {
        const v = (pa.f && pa.f[fl.k] || "").trim();
        if (v) bits.push(fl.t + ": " + v);
      }
      if (bits.length) parts.push(bits.join("؛ "));
    }
    const ll = getLL();
    if (ll) {
      const l = LOVE_LANGS.find((x) => x.id === ll.id);
      if (l) parts.push("زبان عشق کاربر: " + l.t);
    }
    const w = getWishes().filter((x) => !x.done).slice(0, 3);
    if (w.length) parts.push("خواسته‌های گفته‌شده‌ی طرف مقابل: " + w.map((x) => "«" + x.text + "»").join("، "));
    const m = getMoods()[0];
    if (m) {
      const mm = MOODS.find((x) => x.id === m.m);
      if (mm) parts.push("حالِ آخرِ کاربر: " + mm.t);
    }
    return parts.join("\n").slice(0, 600);
  } catch { return ""; }
};

/* ---------- حل اختلاف دونفره (v6.2) ---------- */
export const CONFLICT_QS = [
  "چه اتفاقی افتاد؟ (فقط اتفاق، بدون تفسیر)",
  "تو چی حس کردی؟",
  "فکر می‌کنی طرف مقابل چه حسی داشته؟",
  "دلت می‌خواد آخرش چی بشه؟",
];
export const CONFLICT_STEPS = [
  "هر کدوم از سؤال ۲ و ۳ یکی جمله بخونید و طرف مقابل فقط تکرارش کنه («پس تو این حس داشتی») — بدون دفاع.",
  "جاهایی که دو برداشت فرق داشته، فقط بگید «آهان، من یه‌جور دیگه فکر می‌کردم» — قضاوت ممنوع.",
  "آخر: هر کدوم یک جمله از سؤال ۴ رو عملی کنید؛ یه قدم کوچیک همین هفته.",
];
export const conflictMerge = (my, their) => {
  if (!my || !their) return null;
  return CONFLICT_QS.map((q, i) => ({
    q,
    me: (my.ans && my.ans[i]) || "—",
    them: (their.ans && their.ans[i]) || "—",
  }));
};
