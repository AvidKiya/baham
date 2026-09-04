// lib/pms.js — ترکر سیکل و PMS (کاملاً محلی و خصوصی؛ هیچ‌چیز به سرور نمی‌ره)
const DAY = 86400000;
export const PMS_KEY = "mk:pms";
export const iso = (d) => {
  const t = new Date(d);
  return t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0");
};
export const fromIso = (s) => {
  const [y, m, d] = String(s).split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const faDate = (d) => {
  try { return new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(d); } catch { return iso(d); }
};
export const getPms = () => {
  try { return JSON.parse(localStorage.getItem(PMS_KEY)) || { logs: [], len: 5, notif: true }; } catch { return { logs: [], len: 5, notif: true }; }
};
export const setPms = (p) => {
  try { localStorage.setItem(PMS_KEY, JSON.stringify(p)); } catch {}
};
export const logPeriodToday = (p = getPms()) => {
  const today = iso(new Date());
  if (!p.logs.includes(today)) p.logs = [today].concat(p.logs).slice(0, 24);
  setPms(p);
  return p;
};
export const removeLast = (p = getPms()) => {
  p.logs = p.logs.slice(1);
  setPms(p);
  return p;
};
export const endPeriodToday = (p = getPms()) => {
  if (!p.logs.length) return p;
  const last = p.logs.map(fromIso).sort((a, b) => b - a)[0];
  const cd = Math.floor((new Date(iso(new Date())) - last) / DAY) + 1; // روز سیکل
  p.len = Math.max(2, Math.min(8, cd - 1)); // امروز دیگر روزِ خونریزی نیست
  setPms(p);
  return p;
};
export const avgCycle = (p = getPms()) => {
  const ls = p.logs.map(fromIso).sort((a, b) => b - a).slice(0, 7);
  if (ls.length < 2) return 28;
  const diffs = [];
  for (let i = 0; i < ls.length - 1; i++) {
    const d = Math.round((ls[i] - ls[i + 1]) / DAY);
    if (d >= 18 && d <= 40) diffs.push(d);
  }
  if (!diffs.length) return 28;
  return Math.max(21, Math.min(35, Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length)));
};
// وضعیت امروز
export const pmsStatus = (p = getPms(), now = new Date()) => {
  if (!p.logs.length) return { empty: true };
  const last = p.logs.map(fromIso).sort((a, b) => b - a)[0];
  const avg = avgCycle(p);
  const len = p.len || 5;
  const cd = Math.floor((new Date(iso(now)) - last) / DAY) + 1; // روز سیکل
  const next = new Date(last.getTime() + avg * DAY);
  const countdown = Math.round((new Date(iso(next)) - new Date(iso(now))) / DAY);
  let phase = "luteal";
  if (cd <= len) phase = "period";
  else if (cd <= avg - 17) phase = "follicular";
  else if (cd <= avg - 11) phase = "ovulation";
  else if (cd >= avg) phase = "due";
  else if (cd >= avg - 5) phase = "pms";
  return { empty: false, cd, avg, len, phase, last, next, countdown, dueToday: countdown === 0, dueTomorrow: countdown === 1 };
};
export const PHASES = {
  period: { t: "روزای پریود", emoji: "🌸", c: "#f43f5e", d: "روزای اول؛ بدن استراحت می‌خواد، بهش سخت نگیر." },
  follicular: { t: "انرژی برمی‌گرده", emoji: "🌱", c: "#22c55e", d: "حال خوب داری برمی‌گرده؛ بهترین وقته برای برنامه‌ریزی." },
  ovulation: { t: "اوج انرژی ✨", emoji: "✨", c: "#a855f7", d: "پر انرژی و جذاب؛ اگه قراره کاری بکنی، الان وقتهشه 😏" },
  pms: { t: "روزای حساس", emoji: "🌊", c: "#f59e0b", d: "حالا ممکنه بالا پایین بشه؛ با خودت مهربون باش." },
  luteal: { t: "آروم ولی بی‌قرار", emoji: "🌙", c: "#8b5cf6", d: "یه آرومیِ نسبی؛ شاید یه کم هم دل‌تنگ باشی." },
  due: { t: "نزدیک موعد", emoji: "⏳", c: "#ef4444", d: "پریود بعدی همین نزدیکی‌ست؛ آماده باش." },
};
// راهنمای پارتنر — چیکار کنی / نکنی / سوپرایز / جمله‌ی خوب
export const PARTNER_TIPS = {
  period: {
    do: ["چای یا آب گرم بیار، کیسه‌ی آب داغ آماده کن", "برنامه‌ها رو کنسل‌پذیر و آروم کن", "چاکلت یا خوراکی موردعلاقه‌ش رو بیار بدون اینکه بگه"],
    dont: ["«باز شروع شد؟» نگو", "شوخی به حال جسمش نکن", "انتظار انرژی و مهمونی نداشته باش"],
    surprise: "یه شب فیلم و پتوی دونفره؛ بدون سؤال، فقط آماده‌ش کن 🍫",
    say: "«هر چی لازم داری من همین‌جام؛ امروز قرار نیست کاری کنی»",
    self: "گرما، استراحت، آهن و خواب؛ بدنت داره کار سنگینی می‌کنه.",
  },
  pms: {
    do: ["فقط گوش بده؛ راه‌حل نده تا نخواد", "حرفاش رو جدی بگیر، حتی کوچیکاش", "کارای کوچیک (ظرف، خرید) رو بی‌سروصدا انجام بده"],
    dont: ["«چرا ناراحتی؟ چی نشده؟» رو تکرار نکن", "«زیاده‌رویی می‌کنی» جواب نمی‌ده، فقط فاصله می‌سازه", "لوژیک و استدلال نری سراغ احساساتش"],
    surprise: "یه پیام «دلم برات تنگه، چیزی لازم داری؟» ساعت ۹ شب معجزه می‌کنه 🌙",
    say: "«حق داری همین حس رو داشته باشی؛ من کنارتم»",
    self: "پیاده‌روی سبک، آب زیاد و خواب منظم؛ نوسان هورمونی واقعیه؛ تو داری چیزی از خودت درنمیاری.",
  },
  ovulation: {
    do: ["یه قرار خاص بذار؛ انرژی بالاست", "بامزه‌ترین نسخه‌ت رو بیار بیرون", "اگه رابطه‌تون جدیه، این روزا بهترین وقت خلوت دونفره‌ست"],
    dont: ["انرژی‌ش رو دست‌کم نگیر", "برنامه‌ی خفیف نذار که حوصله سر بره"],
    surprise: "یه قرار برنامه‌ریزی‌شده که خودت همه‌ش رو چیدی؛ جزئیات مهمه ✨",
    say: "«خداییش امروز می‌درخشی؛ خوشبختم که هستی»",
    self: "انرژی‌ت بالاست؛ بهترین وقت برای ورزش و کارای بزرگه.",
  },
  follicular: {
    do: ["یه برنامه‌ی جدید دونفره پیشنهاد بده", "گپای عمیق رو اینجا بکن", "کارای مشترک (ورزش، کلاس) رو شروع کن"],
    dont: ["کل هفته رو خالی نذار", "فقط برنامه‌ی خونه‌ای نذار"],
    surprise: "یه لیست «۱۰ کار که هنوز باهم نکردیم» بنویس و بفرست 📝",
    say: "«یه فکرایی برام اومده برای ما؛ کِی گپ بزنیم؟»",
    self: "حال‌وهوایت داره جا میاد؛ هدف‌گذاری کن برای خودت.",
  },
  luteal: {
    do: ["آروم و منظم باش", "خوراکی سالم و خواب رو ترویج کن", "پیش‌بینی‌پذیر باش؛ سورپرایزای بزرگ رو نگه دار"],
    dont: ["موضوعای سنگین رو این هفته پیش نکش", "حساسیتاش رو بزرگ نکن"],
    surprise: "یه شام ساده‌ی گرم بدون انتظار خاص 🍲",
    say: "«هر جا هستم، هوای تو هست»",
    self: "بدنت داره به سمت PMS می‌ره؛ از الان خواب و آب رو جدی بگیر.",
  },
  due: {
    do: ["یادش باشه که یادت هست (بدون کنترل!)", "لباس راحت و پد/تامپون پیش‌پا افتاده", "صبر و آرامش"],
    dont: ["«چرا دیر شد؟» با لحن نگران نگو", "استرس اضافه نکن"],
    surprise: "یه کیت مراقبت کوچیک: چای + چاکلت + یه یادداشت گرم 🧡",
    say: "«هر روزش باهم راحت‌تر می‌شه؛ مواظبتم»",
    self: "استرس دیر رو می‌کنه؛ آروم باش و ثبتش کن وقتی شروع شد.",
  },
};
// روز شروع رابطه + مناسبت‌ها
export const getAnniv = () => { try { return localStorage.getItem("mk:anniv") || ""; } catch { return ""; } };
export const setAnniv = (v) => { try { localStorage.setItem("mk:anniv", v); } catch {} };
export const getOccs = () => { try { return JSON.parse(localStorage.getItem("mk:occs")) || []; } catch { return []; } };
export const setOccs = (l) => { try { localStorage.setItem("mk:occs", JSON.stringify(l.slice(0, 20))); } catch {} };
export const daysTogether = (isoDate, now = new Date()) => {
  if (!isoDate) return -1;
  const d = fromIso(isoDate);
  if (isNaN(d)) return -1;
  return Math.max(0, Math.floor((new Date(iso(now)) - d) / DAY));
};
export const nextMilestone = (days) => {
  const MS = [100, 200, 300, 365, 500, 700, 1000, 1500, 2000, 3000, 5000];
  for (const m of MS) if (days < m) return { m, left: m - days };
  return { m: null, left: 0 };
};
const GIFT_IDEAS = ["یه نامه‌ی دست‌نویس ❤️", "گل + چاکلت موردعلاقه‌ش", "یه خاطره‌سازی دونفره (آلبوم عکس چاپی)", "رستوران همیشگی با یه چاشنی تازه", "یه چیزی که ماه‌هاست می‌گه می‌خواد", "پیک‌نیک ساده‌ی غروب", "کارت‌بازی + شب گپ تا دیروقت"];
export const giftIdea = (i) => GIFT_IDEAS[(i || 0) % GIFT_IDEAS.length];
