// ---------------------------------------------------------------------------
// lib/couple.js — «فضای ما» 💑 : لایه داده Couple Space به سبک Between
// local-first: همه‌چیز روی گوشی؛ اگر زوج جفت شده باشن با سرور سینک می‌شه.
// ---------------------------------------------------------------------------

/* ============================ ابزار پایه ============================ */
export const faNum = (n) => {
  try { return Number(n).toLocaleString("fa-IR"); } catch { return String(n); }
};
export const uid = () => {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID().slice(0, 8);
  } catch {}
  return Date.now().toString(36).slice(-4) + Math.floor(Math.random() * 1e6).toString(36);
};
const DAY = 86400000;
export const DAY_MS = DAY;
export const isoDay = (d) => {
  const t = new Date(d);
  return t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0");
};
export const nowTs = () => Date.now();

const rd = (k, def) => {
  try {
    const v = typeof localStorage !== "undefined" ? localStorage.getItem(k) : null;
    return v === null ? def : JSON.parse(v);
  } catch { return def; }
};
const wr = (k, v) => {
  try {
    if (typeof localStorage === "undefined") return;
    // فقط خواندنی بعد از قطع ارتباط (v9): هیچ sp:*ای نوشته نمی‌شه
    if (String(k).startsWith("sp:") && localStorage.getItem("mk:spacero") === "1") return;
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
};
/* فقط خواندنی فضای ما */
export const isSpaceRO = () => { try { return localStorage.getItem("mk:spacero") === "1"; } catch { return false; } };
export const setSpaceRO = (on) => { try { if (on) localStorage.setItem("mk:spacero", "1"); else localStorage.removeItem("mk:spacero"); } catch {} };
const rm = (k) => {
  try { if (typeof localStorage !== "undefined") localStorage.removeItem(k); } catch {}
};

/* ============================ تقویم شمسی ============================ */
/* الگوریتم تبدیل دقیق (بر اساس jalaali-js، سازگار با تقویم رسمی) */
const div = (a, b) => ~~(a / b);
const mod = (a, b) => a - Math.floor(a / b) * b;
const J_BREAKS = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
function jalCal(jy) {
  const bl = J_BREAKS.length;
  const gy = jy + 621;
  let leapJ = -14, jp = J_BREAKS[0], jm = 0, jump = 0;
  for (let i = 1; i < bl; i++) {
    jm = J_BREAKS[i]; jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  let n = jy - jp;
  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;
  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;
  return { leap, gy, march };
}
function g2d(gy, gm, gd) {
  let d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4)
    + div(153 * mod(gm + 9, 12) + 2, 5) + gd - 34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}
function d2g(jdn) {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}
function d2j(jdn) {
  const gy = d2g(jdn).gy;
  let jy = gy - 621;
  const r = jalCal(jy);
  const jdn1f = g2d(gy, 3, r.march);
  let jm = 0, jd = 0, k = jdn - jdn1f;
  if (k >= 0) {
    if (k <= 185) return { jy, jm: 1 + div(k, 31), jd: mod(k, 31) + 1 };
    k -= 186;
  } else {
    jy -= 1; k += 179;
    if (r.leap === 1) k += 1;
  }
  jm = 7 + div(k, 30); jd = mod(k, 30) + 1;
  return { jy, jm, jd };
}
export const isLeapJalali = (jy) => jalCal(jy).leap === 0;
export const jMonthLength = (jy, jm) => {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isLeapJalali(jy) ? 30 : 29;
};
/** میلادی → شمسی */
export function toJalali(d) {
  const t = new Date(d);
  if (isNaN(t)) return null;
  return d2j(g2d(t.getFullYear(), t.getMonth() + 1, t.getDate()));
}
/** شمسی → میلادی (Date محلی) */
export function fromJalali(jy, jm, jd) {
  const g = d2g(g2d0(j2d0(jy, jm, jd)));
  return new Date(g.gy, g.gm - 1, g.gd);
}
function j2d0(jy, jm, jd) {
  const r = jalCal(jy);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}
function g2d0(jdn) { return jdn; }

export const J_MONTHS = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
export const J_WDAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];
export const J_WDAYS_S = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

/** «۶ مهر ۱۴۰۵» */
export function faJalali(d) {
  try {
    const j = toJalali(d);
    if (!j) return "";
    return faNum(j.jd) + " " + J_MONTHS[j.jm - 1] + " " + faNum(j.jy);
  } catch { return ""; }
}
/** «دوشنبه ۶ مهر» */
export function faJalaliShort(d) {
  try {
    const t = new Date(d);
    const j = toJalali(t);
    if (!j) return "";
    const wd = J_WDAYS[(t.getDay() + 1) % 7];
    return wd + " " + faNum(j.jd) + " " + J_MONTHS[j.jm - 1];
  } catch { return ""; }
}
/** برچسب ماه: «مهر ۱۴۰۵» */
export const jMonthLabel = (jy, jm) => J_MONTHS[jm - 1] + " " + faNum(jy);

/* ============================ پروفایل زوج ============================ */
export const SPACE_KEYS = ["profile", "memories", "events", "notes", "wishlist", "bucket", "letters", "daily", "songs", "expenses", "moods", "games", "dares", "polls", "trips", "spins", "capsules", "chains", "quests", "arts", "casts", "pins", "banks", "movies", "recipes", "dreams", "shots", "ballots", "counts", "laws"];
const K = (c) => "sp:" + c;

export const COUPLE_EMOJIS = ["❤️", "💕", "💘", "💖", "💗", "💞", "💓", "🥰", "😍", "🌹", "💍", "🫶", "💋", "🔥", "🌙", "✨"];

export function getCoupleProfile() {
  const p = rd(K("profile"), null);
  if (p && typeof p === "object") return { me: "", partner: "", meNick: "", partnerNick: "", emoji: "❤️", since: "", theme: "rose", wallpaper: "rose", ...p };
  // مهاجرت از داده‌های قبلی تب «ما»
  let since = "";
  try { since = localStorage.getItem("mk:anniv") || ""; } catch {}
  return { me: "", partner: "", meNick: "", partnerNick: "", emoji: "❤️", since, theme: "rose", wallpaper: "rose", u: 0 };
}
/** والپیپرهای چت زوج (v8.1) */
export const WALLPAPERS = {
  rose: "linear-gradient(160deg, rgba(255,79,139,.13), rgba(168,85,247,.13))",
  night: "linear-gradient(160deg, rgba(49,46,129,.22), rgba(88,28,135,.20))",
  ocean: "linear-gradient(160deg, rgba(45,212,191,.13), rgba(59,130,246,.15))",
  sunset: "linear-gradient(160deg, rgba(245,158,11,.15), rgba(239,68,68,.13))",
  forest: "linear-gradient(160deg, rgba(34,197,94,.12), rgba(20,83,45,.16))",
};
export function setCoupleProfile(p) {
  const cur = getCoupleProfile();
  const next = { ...cur, ...p, u: nowTs() };
  wr(K("profile"), next);
  poke();
  return next;
}

/* ---------- شمارنده رابطه ---------- */
export function daysBetween(a, b) {
  const d1 = new Date(isoDay(a || new Date()) + "T00:00:00");
  const d2 = new Date(isoDay(b || new Date()) + "T00:00:00");
  if (isNaN(d1) || isNaN(d2)) return 0;
  return Math.max(0, Math.round((d2 - d1) / DAY));
}
/** تفکیک روزها به سال/ماه/روز (تقریبی تقویمی با ماه شمسی واقعی) */
export function breakdownDays(sinceIso, toDate) {
  const start = new Date((sinceIso || isoDay(new Date())) + "T00:00:00");
  const end = new Date(isoDay(toDate || new Date()) + "T00:00:00");
  if (isNaN(start) || isNaN(end) || end < start) return { y: 0, m: 0, d: 0, total: 0 };
  const total = daysBetween(start, end);
  const js = toJalali(start), je = toJalali(end);
  let y = je.jy - js.jy, m = je.jm - js.jm, d = je.jd - js.jd;
  if (d < 0) { m -= 1; const pm = je.jm === 1 ? 12 : je.jm - 1; const py = je.jm === 1 ? je.jy - 1 : je.jy; d += jMonthLength(py, pm); }
  if (m < 0) { y -= 1; m += 12; }
  return { y, m, d, total };
}
export const MILESTONES = [1, 7, 30, 50, 100, 150, 200, 250, 300, 365, 400, 500, 600, 700, 800, 900, 1000, 1111, 1221, 1314, 1500, 2000, 2500, 3000, 3650, 5000];
export const MILESTONE_NAMES = {
  1: "اولین روز 💕", 7: "اولین هفته 🌷", 30: "یک ماهگی 🌙", 100: "صد روزگی 🎉",
  365: "یک سالگی 🎂", 500: "پانصد روزگی 💖", 1000: "هزار روزگی 👑",
  1111: "هزار و صد و یازده 💘", 1314: "۱۳۱۴ — یک عمر عاشقانه 🔥", 2000: "دو هزار روز 💎",
};
export function milestoneFor(total) {
  let passed = null, next = null;
  for (const m of MILESTONES) {
    if (total >= m) passed = m;
    else if (next === null) next = m;
  }
  return { passed, next, left: next === null ? 0 : next - total };
}
/** شمارش معکوس تا سالگرد بعدی */
export function nextAnniversary(sinceIso, toDate) {
  if (!sinceIso) return null;
  const s = new Date(sinceIso + "T00:00:00");
  if (isNaN(s)) return null;
  const t0 = new Date(isoDay(toDate || new Date()) + "T00:00:00");
  const js = toJalali(s);
  const jt = toJalali(t0);
  let jy = jt.jy;
  let target = fromJalali(jy, js.jm, Math.min(js.jd, jMonthLength(jy, js.jm)));
  if (target < t0) { jy += 1; target = fromJalali(jy, js.jm, Math.min(js.jd, jMonthLength(jy, js.jm))); }
  const left = Math.round((new Date(isoDay(target) + "T00:00:00") - t0) / DAY);
  return { date: target, left, year: jy - js.jy + (left === 0 ? 0 : 0) };
}

/* ============================ خاطرات 📸 ============================ */
export const MEMORY_MOODS = [
  { id: "love", e: "❤️", t: "عاشقانه" }, { id: "happy", e: "😍", t: "شاد" },
  { id: "calm", e: "🌙", t: "آروم" }, { id: "fun", e: "😂", t: "بامزه" },
  { id: "trip", e: "✈️", t: "سفر" }, { id: "food", e: "🍕", t: "خوراکی" },
  { id: "gift", e: "🎁", t: "سورپرایز" }, { id: "star", e: "⭐", t: "خاص" },
];
export const getMemories = () => {
  const l = rd(K("memories"), []);
  return Array.isArray(l) ? l : [];
};
export function saveMemories(l) { wr(K("memories"), l.slice(0, 500)); poke(); return l.slice(0, 500); }
export function addMemory({ title, text, date, photos, mood, place, tags }) {
  const l = getMemories();
  const m = {
    id: uid(), ts: nowTs(), u: nowTs(),
    title: String(title || "").slice(0, 80),
    text: String(text || "").slice(0, 2000),
    date: date || isoDay(new Date()),
    photos: (photos || []).slice(0, 6),
    mood: mood || "", place: String(place || "").slice(0, 60),
    tags: (tags || []).slice(0, 8).map((t) => String(t).slice(0, 24)),
  };
  l.unshift(m);
  return { list: saveMemories(l), item: m };
}
export function delMemory(id) { tomb("memories", id); return saveMemories(getMemories().filter((m) => m.id !== id)); }
/** گروه‌بندی بر اساس ماه شمسی */
export function groupMemoriesByMonth(list) {
  const groups = [];
  const map = {};
  for (const m of list) {
    const j = toJalali(m.date || m.ts) || toJalali(new Date());
    const key = j.jy + "-" + j.jm;
    if (!map[key]) { map[key] = { key, jy: j.jy, jm: j.jm, label: jMonthLabel(j.jy, j.jm), items: [] }; groups.push(map[key]); }
    map[key].items.push(m);
  }
  return groups;
}
/** خاطره‌های «امروزِ پارسال(ها)» */
export function onThisDay(list) {
  const j = toJalali(new Date());
  if (!j) return [];
  return (list || getMemories()).filter((m) => {
    const mj = toJalali(m.date || m.ts);
    return mj && mj.jm === j.jm && mj.jd === j.jd && mj.jy < j.jy;
  });
}
/** فشرده‌سازی عکس برای خاطرات (حداکثر ~۷۲۰px) */
export function compressImage(file, maxSize = 720, quality = 0.82) {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        try {
          let { width: w, height: h } = img;
          const scale = Math.min(1, maxSize / Math.max(w, h));
          w = Math.round(w * scale); h = Math.round(h * scale);
          const cv = document.createElement("canvas");
          cv.width = w; cv.height = h;
          cv.getContext("2d").drawImage(img, 0, 0, w, h);
          URL.revokeObjectURL(url);
          resolve(cv.toDataURL("image/jpeg", quality));
        } catch { URL.revokeObjectURL(url); resolve(""); }
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(""); };
      img.src = url;
    } catch { resolve(""); }
  });
}

/* ============================ تقویم و رویدادها 🗓 ============================ */
export const EVENT_KINDS = [
  { id: "date", e: "❤️", t: "قرار" }, { id: "birthday", e: "🎂", t: "تولد" },
  { id: "anniv", e: "💍", t: "سالگرد" }, { id: "trip", e: "✈️", t: "سفر" },
  { id: "movie", e: "🎬", t: "فیلم" }, { id: "food", e: "🍽️", t: "رستوران" },
  { id: "gift", e: "🎁", t: "کادو" }, { id: "call", e: "📞", t: "تماس" },
  { id: "other", e: "⭐", t: "دیگه" },
];
export const eventEmoji = (kind) => (EVENT_KINDS.find((k) => k.id === kind) || EVENT_KINDS[8]).e;
export const getEvents = () => {
  const l = rd(K("events"), null);
  if (Array.isArray(l)) return l;
  // مهاجرت از مناسبت‌های قدیمی تب «ما»
  try {
    const old = JSON.parse(localStorage.getItem("mk:occs") || "[]");
    if (Array.isArray(old) && old.length) {
      const migrated = old.slice(0, 20).map((o) => ({
        id: uid(), ts: nowTs(), u: nowTs(),
        title: String(o.t || "").slice(0, 80), date: o.d, time: "",
        kind: "other", note: "", recur: "yearly",
      }));
      wr(K("events"), migrated);
      return migrated;
    }
  } catch {}
  return [];
};
export function saveEvents(l) {
  const s = [...l].sort((a, b) => String(a.date).localeCompare(String(b.date))).slice(0, 300);
  wr(K("events"), s); poke();
  return s;
}
export function addEvent({ title, date, time, kind, note, recur }) {
  const l = getEvents();
  const e = {
    id: uid(), ts: nowTs(), u: nowTs(),
    title: String(title || "").slice(0, 80) || "بدون عنوان",
    date: date || isoDay(new Date()), time: String(time || "").slice(0, 5),
    kind: kind || "date", note: String(note || "").slice(0, 500),
    recur: recur || "none",
  };
  l.push(e);
  return { list: saveEvents(l), item: e };
}
export function delEvent(id) { tomb("events", id); return saveEvents(getEvents().filter((e) => e.id !== id)); }
/** وقوع بعدی یک رویداد (با احتساب تکرار) */
export function nextOccurrence(ev, fromDate) {
  if (!ev || !ev.date) return null;
  const t0 = new Date(isoDay(fromDate || new Date()) + "T00:00:00");
  let d = new Date(ev.date + "T00:00:00");
  if (isNaN(d)) return null;
  if (!ev.recur || ev.recur === "none") {
    if (d < t0) return null;
    return { date: d, left: Math.round((d - t0) / DAY) };
  }
  let guard = 0;
  while (d < t0 && guard++ < 400) {
    if (ev.recur === "daily") d = new Date(d.getTime() + DAY);
    else if (ev.recur === "weekly") d = new Date(d.getTime() + 7 * DAY);
    else if (ev.recur === "monthly") d = new Date(d.getFullYear(), d.getMonth() + 1, Math.min(d.getDate(), 28));
    else d = new Date(d.getFullYear() + 1, d.getMonth(), d.getDate()); // yearly
  }
  if (guard >= 400) return null;
  return { date: d, left: Math.round((d - t0) / DAY) };
}
export function upcomingEvents(limit = 8) {
  const out = [];
  for (const e of getEvents()) {
    const n = nextOccurrence(e);
    if (n) out.push({ ...e, ...n });
  }
  out.sort((a, b) => a.left - b.left);
  return out.slice(0, limit);
}
/** رویدادهای یک روز مشخص (iso) با احتساب تکرار هفتگی/ماهانه/سالانه ساده */
export function eventsOn(iso) {
  const t = new Date(iso + "T00:00:00");
  if (isNaN(t)) return [];
  return getEvents().filter((e) => {
    const n = nextOccurrence(e, new Date(t.getTime() - DAY));
    if (!n) return false;
    if (isoDay(n.date) === iso) return true;
    // تکرار هفتگی: روزهای بعدی هم match می‌شن
    if (e.recur === "weekly" || e.recur === "daily") {
      const first = new Date(e.date + "T00:00:00");
      if (t < first) return false;
      const diff = Math.round((t - first) / DAY);
      return e.recur === "daily" ? true : diff % 7 === 0;
    }
    if (e.recur === "monthly") {
      const first = new Date(e.date + "T00:00:00");
      return t >= first && t.getDate() === first.getDate();
    }
    if (e.recur === "yearly") {
      const first = new Date(e.date + "T00:00:00");
      return t >= first && t.getDate() === first.getDate() && t.getMonth() === first.getMonth();
    }
    return false;
  });
}

/* ============================ یادداشت‌ها 📝 ============================ */
export const getNotes = () => { const l = rd(K("notes"), []); return Array.isArray(l) ? l : []; };
export function saveNotes(l) { wr(K("notes"), l.slice(0, 200)); poke(); return l.slice(0, 200); }
export function addNote({ title, body, kind, items }) {
  const l = getNotes();
  const n = {
    id: uid(), ts: nowTs(), u: nowTs(),
    title: String(title || "").slice(0, 80) || "یادداشت",
    body: String(body || "").slice(0, 3000),
    kind: kind === "check" ? "check" : "text",
    items: kind === "check" ? (items || []).slice(0, 30).map((t) => ({ t: String(t).slice(0, 120), done: false })) : [],
  };
  l.unshift(n);
  return { list: saveNotes(l), item: n };
}
export function updateNote(id, patch) {
  const l = getNotes().map((n) => (n.id === id ? { ...n, ...patch, u: nowTs() } : n));
  return saveNotes(l);
}
export function delNote(id) { tomb("notes", id); return saveNotes(getNotes().filter((n) => n.id !== id)); }

/* ============================ آرزوها 🎁 ============================ */
export const getWishlist = () => { const l = rd(K("wishlist"), []); return Array.isArray(l) ? l : []; };
export function saveWishlist(l) { wr(K("wishlist"), l.slice(0, 200)); poke(); return l.slice(0, 200); }
export function addWish({ title, link, price, note, mine, by }) {
  const l = getWishlist();
  const w = {
    id: uid(), ts: nowTs(), u: nowTs(), by: by || "",
    title: String(title || "").slice(0, 100),
    link: String(link || "").slice(0, 300), price: String(price || "").slice(0, 40),
    note: String(note || "").slice(0, 300), mine: mine !== false,
  };
  if (!w.title) return { list: l, item: null };
  l.unshift(w);
  return { list: saveWishlist(l), item: w };
}
export function delWish(id) { tomb("wishlist", id); return saveWishlist(getWishlist().filter((w) => w.id !== id)); }
/** سورپرایزهای مخفی: فقط روی گوشیِ هدیه‌دهنده ذخیره می‌شه */
export const getSecretGifts = () => rd("sp:secretgifts", []);
export function toggleSecretGift(id) {
  let l = getSecretGifts().filter((x) => x !== id);
  if (!getSecretGifts().includes(id)) l.unshift(id);
  wr("sp:secretgifts", l.slice(0, 50));
  return l.slice(0, 50);
}

/* ============================ باکت‌لیست 🪣 ============================ */
export const BUCKET_IDEAS = [
  "سفر به استانبول ✈️", "کمپ زیر ستاره‌ها ⛺", "کنسرت خواننده موردعلاقه 🎤",
  "غواصی 🤿", "یه ماه زندگی تو یه شهر دیگه 🏡", "پیک‌نیک ساحل وقت غروب 🌅",
  "کلاس آشپزی دونفره 🍳", "تماشای طلوع از یه قله 🌄", "جشن سالگرد تو یه شهر جدید 🎂",
  "عکس‌برداری حرفه‌ای دونفره 📸", "نوشتن نامه برای ۱۰ سال بعد 💌", "یاد گرفتن یه رقص دونفره 💃",
];
export const getBucket = () => { const l = rd(K("bucket"), []); return Array.isArray(l) ? l : []; };
export function saveBucket(l) { wr(K("bucket"), l.slice(0, 200)); poke(); return l.slice(0, 200); }
export function addBucket(title) {
  const t = String(title || "").slice(0, 120).trim();
  if (!t) return getBucket();
  const l = getBucket();
  l.unshift({ id: uid(), ts: nowTs(), u: nowTs(), title: t, done: false });
  return saveBucket(l);
}
export function toggleBucket(id) {
  return saveBucket(getBucket().map((b) => (b.id === id ? { ...b, done: !b.done, u: nowTs() } : b)));
}
export function delBucket(id) { tomb("bucket", id); return saveBucket(getBucket().filter((b) => b.id !== id)); }

/* ============================ نامه‌های عاشقانه 💌 ============================ */
export const getLetters = () => { const l = rd(K("letters"), []); return Array.isArray(l) ? l : []; };
export function saveLetters(l) { wr(K("letters"), l.slice(0, 200)); poke(); return l.slice(0, 200); }
export function addLetter({ to, title, body, openAt, mine, by, voice, vdur }) {
  const l = getLetters();
  const lt = {
    id: uid(), ts: nowTs(), u: nowTs(), by: by || "",
    to: String(to || "").slice(0, 40),
    title: String(title || "").slice(0, 80) || "یه نامه برات دارم 💌",
    body: String(body || "").slice(0, 5000),
    openAt: openAt ? new Date(openAt + "T00:00:00").getTime() : 0,
    mine: mine !== false, opened: false,
    voice: typeof voice === "string" ? voice.slice(0, 460000) : "",
    vdur: Math.max(0, Math.min(90, Math.round(Number(vdur) || 0))),
  };
  l.unshift(lt);
  return { list: saveLetters(l), item: lt };
}
export function openLetter(id) {
  return saveLetters(getLetters().map((x) => (x.id === id ? { ...x, opened: true, u: nowTs() } : x)));
}
export function delLetter(id) { tomb("letters", id); return saveLetters(getLetters().filter((x) => x.id !== id)); }
export const isSealed = (lt, now) => lt.openAt && (now || Date.now()) < lt.openAt;

/* ============================ سؤال روزانه ❓ ============================ */
export const DAILY_QS = [
  "اگه الان می‌تونستیم هر جای دنیا باشیم، کجا می‌رفتیم؟",
  "اولین چیزی که تو من توجهت رو جلب کرد چی بود؟",
  "یه خاطره از ما که هیچ‌وقت یادت نمی‌ره؟",
  "اگه یه روز کامل وقت آزاد داشتیم، چطور می‌گذروندیش؟",
  "بهترین هدیه‌ای که می‌تونم بهت بدم چیه؟",
  "چه آهنگی یاد من می‌ندازتت؟",
  "اگه می‌تونستیم به گذشته برگردیم، کدوم روزمون رو دوباره زندگی می‌کردی؟",
  "چه چیزی تو رابطه‌مون رو بیشتر از همه دوست داری؟",
  "یه آرزوی مشترک که هنوز بهش نرسیدیم؟",
  "اگه قرار بود یه فیلم از قصه‌ی ما بسازن، اسمش چی بود؟",
  "چه غذایی رو دوست داری یه روز با هم درست کنیم؟",
  "کدوم فصل سال بیشتر حس ما رو داره؟",
  "اگه یه سفر رویایی داشتیم، سه‌تا وسیله‌ای که حتماً می‌بردی؟",
  "چه حرفی رو دوست داری بیشتر از من بشنوی؟",
  "یه عادت کوچیک من که دوستش داری؟",
  "اگه می‌تونستیم یه قدرت مشترک داشته باشیم، چی انتخاب می‌کردی؟",
  "بهترین قراری که تا حالا رفتیم؟",
  "چه چیزی باعث می‌شه حس کنی خیلی دوستت دارم؟",
  "اگه یه خونه‌ی رویایی داشتیم، چه شکلی بود؟",
  "یه چیزی که هنوز درباره‌م نمی‌دونی و دوست داری بدونی؟",
  "کدوم عکس دونفره‌مون رو بیشتر دوست داری؟",
  "اگه فردا یه روز تعطیل غیرمنتظره داشتیم، چی کار می‌کردی؟",
  "چه کتابی رو دوست داری با هم بخونیم؟",
  "یه جمله که همیشه یادت می‌مونه از من؟",
  "اگه می‌تونستیم یه حیوون خونگی داشته باشیم، چی بود؟",
  "چه کاری هست که هنوز با هم نکردیم و دوست داری بکنیم؟",
  "بهترین صبحانه‌ی دونفره‌ی رویاییت چیه؟",
  "اگه قرار بود یه آهنگ برای ما بنویسی، موضوعش چی بود؟",
  "چه چیزی تو من اولش برات عجیب بود و حالا دوستش داری؟",
  "یه شهر که دوست داری با هم توش گم بشیم؟",
  "اگه یه شب بارونی بود و برق رفته بود، چی کار می‌کردیم؟",
  "چه لحظه‌ای بود که فهمیدی من همون آدمم؟",
  "اگه می‌تونستیم یه رستوران بزنیم، اسمش چی بود؟",
  "چه فیلمی رو حاضری صد بار با من ببینی؟",
  "یه چیزی که از بچگیت هنوز دوست داری؟",
  "اگه قرار بود یه تتو مشترک بزنیم، چی بود؟",
  "چه بویی یاد خاطره‌های خوبت می‌ندازتت؟",
  "اگه یه هفته اینترنت نبود، با هم چی کار می‌کردیم؟",
  "کدوم دوستت اول از همه فهمید ما با همیم؟",
  "چه چیزی رو تو خودت می‌خوای بهتر کنی و من چطور کمک کنم؟",
  "اگه می‌تونستیم یه کنسرت خصوصی داشته باشیم، کی می‌خوند؟",
  "یه عادت صبحگاهی که دوست داری با هم داشته باشیم؟",
  "چه چیزی بیشتر از همه تو روز سخت آرومت می‌کنه؟",
  "اگه قرار بود یه نامه به خودِ یک سال پیشمون بنویسیم، چی می‌نوشتیم؟",
  "کدوم مهمونی یا جمع رو با هم خیلی خوش گذروندیم؟",
  "یه چیزی که همیشه می‌خندونتت وقتی یادش می‌افتی؟",
  "اگه می‌تونستیم یه کلبه داشته باشیم، کجا بود؟",
  "چه ورزشی رو دوست داری با هم امتحان کنیم؟",
  "یه جمله‌ی انگیزشی که واقعاً بهش اعتقاد داری؟",
  "اگه قرار بود یه روز جای هم باشیم، اولین کاری که می‌کردی؟",
  "چه دسری رو هیچ‌وقت نمی‌تونی رد کنی؟",
  "یه فیلمی که گریه‌ت انداخت؟",
  "اگه می‌تونستیم به فضا سفر کنیم، می‌رفتی؟",
  "چه چیزی تو خونه‌ی رویاییمون حتماً باید باشه؟",
  "یه آهنگ که همیشه حالت رو خوب می‌کنه؟",
  "اگه قرار بود یه کسب‌وکار مشترک بزنیم، چی بود؟",
  "چه خاطره‌ای از بچگیت رو دوست داری برام تعریف کنی؟",
  "اگه یه روز کامل بارون می‌اومد، برنامه‌ت چی بود؟",
  "چه چیزی رو تو من تحسین می‌کنی؟",
  "یه کشور که دوست داری با هم زندگیش کنیم؟",
  "اگه می‌تونستیم یه جشن بگیریم بدون هیچ دلیلی، تمش چی بود؟",
  "چه ساعتی از روز رو بیشتر دوست داری؟",
  "یه چیزی که همیشه می‌خواستی یاد بگیری؟",
  "اگه قرار بود یه پادکست مشترک داشته باشیم، موضوعش چی بود؟",
  "چه فیلمی رو دوست داری امشب با هم ببینیم؟",
  "یه چیزی که از من یاد گرفتی؟",
  "اگه می‌تونستیم یه باغ داشته باشیم، چی می‌کاشتیم؟",
  "چه چیزی باعث می‌شه یه روز معمولی برات خاص بشه؟",
  "یه رویایی که هنوز به کسی نگفتی؟",
  "اگه قرار بود یه سفر جاده‌ای بریم، کی رانندگی می‌کرد؟",
  "چه چیزی تو رابطه‌مون رو می‌خوای قوی‌تر کنیم؟",
  "یه جمله که دوست داری هر روز صبح بشنوی؟",
  "اگه می‌تونستیم یه شب تو موزه بخوابیم، کدوم موزه؟",
  "چه فصلی برای عروسی رویاییت بهتره؟",
  "یه چیزی که دوست داری بیشتر با هم حرف بزنیم درباره‌ش؟",
  "اگه قرار بود یه اسم برای تیم دونفره‌مون بذاریم، چی بود؟",
  "چه چیزی رو تو زندگی بیشتر از همه شکرگزاری می‌کنی؟",
  "یه فیلمی که دوست داری با هم تو سینما ببینیم؟",
  "اگه می‌تونستیم یه جزیره‌ی خصوصی داشته باشیم، اسمش چی بود؟",
  "چه چیزی تو من بهت آرامش می‌ده؟",
  "یه کاری که دوست داری امسال با هم انجام بدیم؟",
  "اگه قرار بود یه کتاب از قصه‌ی ما بنویسن، فصل اولش چی بود؟",
  "چه آهنگی رو دوست داری با هم بخونیم؟",
  "یه چیزی که هیچ‌وقت از گفتنش به من خسته نمی‌شم؟",
  "اگه می‌تونستیم یه پیک‌نیک رویایی بچینیم، کجا بود؟",
  "چه چیزی تو آینده‌مون بیشتر هیجانت می‌کنه؟",
  "یه قولی که دوست داری به هم بدیم؟",
];
export function dailyQuestion(date) {
  const t = new Date(isoDay(date || new Date()) + "T00:00:00");
  const idx = Math.floor(t.getTime() / DAY) % DAILY_QS.length;
  return { idx, q: DAILY_QS[idx], date: isoDay(t) };
}
/** جواب‌ها: { [date]: { mine, mineTs, theirs, theirsTs, q } } */
export const getDaily = () => { const d = rd(K("daily"), {}); return d && typeof d === "object" ? d : {}; };
export function saveDaily(d) { wr(K("daily"), d); poke(); return d; }
export function answerDaily(date, text, who) {
  const d = getDaily();
  const cur = d[date] || { q: (dailyQuestion(date) || {}).q || "" };
  if (who === "theirs") { cur.theirs = String(text || "").slice(0, 500); cur.theirsTs = nowTs(); }
  else { cur.mine = String(text || "").slice(0, 500); cur.mineTs = nowTs(); }
  cur.u = nowTs();
  d[date] = cur;
  return saveDaily(d);
}

/* ============================ آهنگ‌های ما 🎵 ============================ */
export const getSongs = () => { const l = rd(K("songs"), []); return Array.isArray(l) ? l : []; };
export function saveSongs(l) { wr(K("songs"), l.slice(0, 200)); poke(); return l.slice(0, 200); }
export function addSong({ title, artist, link, note }) {
  const t = String(title || "").slice(0, 100).trim();
  if (!t) return getSongs();
  const l = getSongs();
  l.unshift({ id: uid(), ts: nowTs(), u: nowTs(), title: t, artist: String(artist || "").slice(0, 80), link: String(link || "").slice(0, 300), note: String(note || "").slice(0, 200) });
  return saveSongs(l);
}
export function delSong(id) { tomb("songs", id); return saveSongs(getSongs().filter((s) => s.id !== id)); }

/* ============================ تایم‌لاین 🕐 ============================ */
export function buildTimeline() {
  const items = [];
  const prof = getCoupleProfile();
  if (prof.since) items.push({ id: "since", ts: new Date(prof.since + "T00:00:00").getTime() || 0, kind: "since", e: "❤️", t: "شروع قصه‌ی ما", d: faJalali(prof.since) });
  for (const m of getMemories()) items.push({ id: "m" + m.id, ts: new Date((m.date || isoDay(m.ts)) + "T12:00:00").getTime() || m.ts, kind: "memory", e: "📸", t: m.title || "خاطره", d: m.text, photos: m.photos, ref: m.id });
  for (const e of getEvents()) {
    const n = nextOccurrence(e);
    const past = !e.recur || e.recur === "none" ? new Date(e.date + "T00:00:00").getTime() < Date.now() : false;
    if (past || (n && n.left === 0)) items.push({ id: "e" + e.id, ts: new Date(e.date + "T12:00:00").getTime(), kind: "event", e: eventEmoji(e.kind), t: e.title, d: e.note });
  }
  const bd = prof.since ? breakdownDays(prof.since) : null;
  if (bd && bd.total > 0) {
    for (const m of MILESTONES) {
      if (bd.total >= m) {
        const d = new Date(new Date(prof.since + "T00:00:00").getTime() + m * DAY);
        items.push({ id: "ms" + m, ts: d.getTime(), kind: "milestone", e: "🏆", t: faNum(m) + " روزگی" + (MILESTONE_NAMES[m] ? " " + MILESTONE_NAMES[m] : ""), d: faJalali(d) });
      }
    }
  }
  for (const b of getBucket().filter((x) => x.done)) items.push({ id: "b" + b.id, ts: b.u || b.ts, kind: "bucket", e: "✅", t: b.title, d: "از باکت‌لیست خط خورد 🎉" });
  items.sort((a, b) => b.ts - a.ts);
  return items.slice(0, 300);
}

/* ============================ حریم خصوصی 🔐 ============================ */
export const SYNCABLE = [
  { id: "memories", t: "خاطرات", e: "📸" },
  { id: "events", t: "تقویم و رویدادها", e: "🗓" },
  { id: "notes", t: "یادداشت‌ها", e: "📝" },
  { id: "wishlist", t: "آرزوها", e: "🎁" },
  { id: "bucket", t: "باکت‌لیست", e: "🪣" },
  { id: "letters", t: "نامه‌ها", e: "💌" },
  { id: "daily", t: "سؤال روزانه", e: "❓" },
  { id: "songs", t: "آهنگ‌ها", e: "🎵" },
  { id: "expenses", t: "دانگ و هزینه", e: "💸" },
  { id: "moods", t: "حال مشترک", e: "😊" },
  { id: "games", t: "بازی دونفره", e: "🎮" },
  { id: "dares", t: "چالش‌ها", e: "🎯" },
  { id: "polls", t: "نظرسنجی‌ها", e: "🗳️" },
];
export const getPrivacy = () => {
  const p = rd("sp:privacy", null);
  if (p && typeof p === "object") return p;
  const all = {};
  for (const s of SYNCABLE) all[s.id] = true;
  return all;
};
export function setPrivacy(p) { wr("sp:privacy", p); poke(); return p; }

/* ============================ خروجی/ورودی 💾 ============================ */
export function exportSpace() {
  const doc = {};
  for (const c of SPACE_KEYS) doc[c] = rd(K(c), c === "profile" ? getCoupleProfile() : []);
  doc.exportedAt = nowTs();
  doc.app = "baham-space-v8";
  return doc;
}
export function importSpace(doc) {
  if (!doc || typeof doc !== "object") return false;
  try {
    for (const c of SPACE_KEYS) {
      if (doc[c] !== undefined) wr(K(c), doc[c]);
    }
    poke();
    return true;
  } catch { return false; }
}
export function wipeSpace() {
  for (const c of SPACE_KEYS) rm(K(c));
  rm("sp:privacy"); rm("sp:secretgifts"); rm("sp:lastsync");
  rm("mk:spacero"); rm("mk:spacewaspaired");
}


/* ============================ دانگ و هزینه مشترک 💸 (v8.2) ============ */
export const getExpenses = () => { const l = rd(K("expenses"), []); return Array.isArray(l) ? l : []; };
export function saveExpenses(l) { wr(K("expenses"), l.slice(0, 300)); poke(); return l.slice(0, 300); }
export function addExpense({ title, amount, by, mine, note, date, kind }) {
  const a = Math.max(0, Math.round(Number(amount) || 0));
  if (!a) return getExpenses();
  const l = getExpenses();
  l.unshift({
    id: uid(), ts: nowTs(), u: nowTs(), by: by || "", mine: mine !== false,
    title: String(title || "").slice(0, 80) || (kind === "settle" ? "تسویه 🤝" : "خرج"),
    amount: a, kind: kind === "settle" ? "settle" : "exp",
    note: String(note || "").slice(0, 200), date: date || isoDay(new Date()),
  });
  return saveExpenses(l);
}
/** پرداخت‌کننده منم؟ (mine نسبی به سازنده است؛ طرف مقابل معکوس می‌بیند) */
export function expenseIsMine(e, myId) {
  if (!e) return true;
  const m = e.mine !== false;
  if (!e.by || !myId) return m;
  return e.by === myId ? m : !m;
}
export function delExpense(id) { tomb("expenses", id); return saveExpenses(getExpenses().filter((e) => e.id !== id)); }
/** مانده‌حساب: مثبت = پارتنر به من بدهکاره، منفی = من بدهکارم
    خرج مشترک ۵۰/۵۰، ولی تسویه انتقال ۱۰۰٪ است */
export function expenseBalance(myId) {
  let me = 0, peer = 0, meS = 0, peerS = 0;
  for (const e of getExpenses()) {
    const mine = expenseIsMine(e, myId);
    if (e.kind === "settle") { if (mine) meS += e.amount || 0; else peerS += e.amount || 0; }
    else if (mine) me += e.amount || 0;
    else peer += e.amount || 0;
  }
  return Math.round((me - peer) / 2 + (meS - peerS));
}
export const faToman = (n) => {
  try { return Number(n || 0).toLocaleString("fa-IR") + " تومان"; } catch { return n + " تومان"; }
};

/* ============================ حال مشترک روزانه 😊 (v8.2) ============ */
export const MOOD5 = [
  { v: 1, e: "😞", t: "بد" }, { v: 2, e: "😐", t: "معمولی" }, { v: 3, e: "🙂", t: "خوب" },
  { v: 4, e: "😊", t: "عالی" }, { v: 5, e: "🤩", t: "فوق‌العاده" },
];
export const moodEmoji = (v) => (MOOD5.find((m) => m.v === v) || {}).e || "•";
/** { [date]: { mineV, mineNote, mineTs, theirsV, theirsNote, theirsTs, u } } */
export const getMoodLog = () => { const d = rd(K("moods"), {}); return d && typeof d === "object" ? d : {}; };
export function saveMoodLog(d) {
  const keys = Object.keys(d).sort().slice(-180);
  const slim = {};
  for (const k of keys) slim[k] = d[k];
  wr(K("moods"), slim); poke();
  return slim;
}
export function answerMood(date, v, note) {
  const d = getMoodLog();
  const cur = d[date] || {};
  cur.mineV = Math.max(1, Math.min(5, Number(v) || 3));
  cur.mineNote = String(note || "").slice(0, 200);
  cur.mineTs = nowTs(); cur.u = nowTs();
  d[date] = cur;
  return saveMoodLog(d);
}
/** استریک روزهای پشت سر هم که حالم را ثبت کردم */
export function moodStreak() {
  const d = getMoodLog();
  let s = 0;
  const t = new Date();
  if (!d[isoDay(t)] || !d[isoDay(t)].mineTs) t.setDate(t.getDate() - 1); // امروز ثبت نشده؟ از دیروز بشمر
  while (d[isoDay(t)] && d[isoDay(t)].mineTs) { s++; t.setDate(t.getDate() - 1); }
  return s;
}

/* ============================ بازی دونفره 🎮 (v8.2) ================== */
export const getGames = () => { const l = rd(K("games"), []); return Array.isArray(l) ? l : []; };
export function saveGames(l) { wr(K("games"), l.slice(0, 100)); poke(); return l.slice(0, 100); }
export function addQuiz({ title, qs, by }) {
  const clean = (qs || []).slice(0, 8).map((q) => ({
    q: String(q.q || "").slice(0, 200),
    opts: (q.opts || []).slice(0, 4).map((o) => String(o || "").slice(0, 80)),
    a: Math.max(0, Math.min(3, Number(q.a) || 0)),
  })).filter((q) => q.q && q.opts.filter(Boolean).length >= 2);
  if (!clean.length) return getGames();
  const l = getGames();
  const g = { id: uid(), ts: nowTs(), u: nowTs(), by: by || "", kind: "quiz", title: String(title || "").slice(0, 80) || "کی منو بهتر می‌شناسه؟", qs: clean, answers: {} };
  l.unshift(g);
  return saveGames(l);
}
export function answerQuiz(id, picks, myId) {
  const l = getGames().map((g) => {
    if (g.id !== id) return g;
    const answers = { ...(g.answers || {}) };
    answers[myId || "me"] = { picks: (picks || []).slice(0, 8).map((x) => Number(x) || 0), ts: nowTs() };
    return { ...g, answers, u: nowTs() };
  });
  return saveGames(l);
}
export function quizScore(g, uid) {
  const an = (g.answers || {})[uid];
  if (!an) return null;
  let s = 0;
  (g.qs || []).forEach((q, i) => { if ((an.picks || [])[i] === q.a) s++; });
  return { score: s, total: (g.qs || []).length };
}
export function delGame(id) { tomb("games", id); return saveGames(getGames().filter((g) => g.id !== id)); }

/* ================= چالش‌های زوج 🎯 (v9.1) ================= */
export const DARE_IDEAS = [
  { t: "به هم سه تا تعریف واقعی بکنید", e: "💬" }, { t: "یه عکس قدیمی‌تون رو پیدا کنید و حرف بزنید", e: "📸" },
  { t: "با هم یه غذای جدید درست کنید", e: "🍳" }, { t: "یه پیاده‌روی بدون گوشی برید", e: "🚶" },
  { t: "به هم یه نامه‌ی کوتاه بنویسید", e: "💌" }, { t: "یه آهنگ قدیمی که دوست داشتید گوش بدید", e: "🎵" },
  { t: "از هم یه سؤالی که تا حالا نپرسیدید بپرسید", e: "❓" }, { t: "یه فیلم با هم ببینید و وسطش حرف بزنید", e: "🎬" },
  { t: "یه کار خونه رو با هم انجام بدید", e: "🧹" }, { t: "به هم یه ماساژ ۵ دقیقه‌ای بدید", e: "💆" },
  { t: "یه خاطره‌ی بامزه‌ی هم رو تعریف کنید", e: "😂" }, { t: "با هم یه پلی‌لیست بسازید", e: "🎧" },
  { t: "یه قرار surprise برای آخر هفته بچینید", e: "🎁" }, { t: "به هم بگید امروز چی خوشحالتون کرد", e: "☀️" },
  { t: "یه بازی رومیزی یا کارتی بکنید", e: "🃏" }, { t: "یه عکس دوتایی تازه بگیرید", e: "🤳" },
  { t: "قدم اول یه آرزوی باکت‌لیست رو بردارید", e: "🪣" }, { t: "یه ربع فقط به هم گوش بدید، بدون نظر دادن", e: "👂" },
  { t: "یه دسر مشترک بخورید", e: "🍨" }, { t: "به هم یه لقب تازه بدید", e: "🏷️" },
  { t: "یه ویدیوی خنده‌دار برای هم بفرستید", e: "📹" }, { t: "یه چیز تازه درباره‌ی هم یاد بگیرید", e: "🧠" },
  { t: "با هم به یه جای جدید تو شهرتون برید", e: "🗺️" }, { t: "قبل خواب به هم زنگ بزنید", e: "📞" },
];
export const getDares = () => { const l = rd(K("dares"), []); return Array.isArray(l) ? l : []; };
export function saveDares(l) { wr(K("dares"), l.slice(0, 200)); poke(); return l.slice(0, 200); }
export function addDare({ t, e, by }) {
  const txt = String(t || "").slice(0, 120).trim();
  if (!txt) return getDares();
  const l = getDares();
  l.unshift({ id: uid(), ts: nowTs(), u: nowTs(), by: by || "", t: txt, e: String(e || "🎯").slice(0, 8), done: {} });
  return saveDares(l);
}
export function doneDare(id, myId) {
  return saveDares(getDares().map((d) => {
    if (d.id !== id) return d;
    const done = { ...(d.done || {}) };
    const k = myId || "me";
    if (done[k]) delete done[k]; else done[k] = nowTs();
    return { ...d, done, u: nowTs() };
  }));
}
export function delDare(id) { tomb("dares", id); return saveDares(getDares().filter((d) => d.id !== id)); }
/** استریک روزهای پشت سر هم که خودم حداقل یه چالش انجام دادم */
export function dareStreak(myId) {
  const k = myId || "me";
  const days = new Set();
  for (const d of getDares()) {
    const t = (d.done || {})[k];
    if (t) days.add(isoDay(new Date(t)));
  }
  let s = 0;
  const t = new Date();
  if (!days.has(isoDay(t))) t.setDate(t.getDate() - 1);
  while (days.has(isoDay(t))) { s++; t.setDate(t.getDate() - 1); }
  return s;
}

/* ================= این یا اون ⚖️ (v9.1) ================= */
export function addYN({ a, b, by }) {
  const A = String(a || "").slice(0, 80).trim(), B = String(b || "").slice(0, 80).trim();
  if (!A || !B) return getGames();
  const l = getGames();
  l.unshift({ id: uid(), ts: nowTs(), u: nowTs(), by: by || "", kind: "yn", title: "این یا اون؟", a: A, b: B, answers: {} });
  return saveGames(l);
}
export function answerYN(id, pick, myId) {
  return saveGames(getGames().map((g) => {
    if (g.id !== id) return g;
    const answers = { ...(g.answers || {}) };
    answers[myId || "me"] = { pick: pick ? 1 : 0, ts: nowTs() };
    return { ...g, answers, u: nowTs() };
  }));
}
export function ynResult(g, myId) {
  const me = myId || "me";
  const an = (g && g.answers) || {};
  const mine = an[me] && (an[me].pick === 0 || an[me].pick === 1) ? an[me].pick : null;
  const others = Object.keys(an).filter((k) => k !== me);
  const o = others.length ? an[others[0]] : null;
  const theirs = o && (o.pick === 0 || o.pick === 1) ? o.pick : null;
  return { mine, theirs, match: mine !== null && theirs !== null ? mine === theirs : null };
}

/* ================= دستیار حافظه 🔍 (v8.2) ================= */
export function buildMemoryContext() {
  const prof = getCoupleProfile();
  const parts = [];
  parts.push(`ما: ${prof.meNick || prof.me || "من"} و ${prof.partnerNick || prof.partner || "پارتنر"}${prof.since ? ` — با هم از ${prof.since}` : ""}`);
  const mems = getMemories().slice(0, 40);
  if (mems.length) {
    parts.push("خاطرات ثبت‌شده:");
    for (const m of mems) {
      parts.push(`- [${m.date || ""}] ${m.title || "خاطره"}${m.place ? " @ " + m.place : ""}${m.text ? ": " + String(m.text).slice(0, 200) : ""}`);
    }
  }
  const stars = getEvents().filter((e) => e.star).slice(0, 20);
  if (stars.length) {
    parts.push("روزهای خاص:");
    for (const e of stars) parts.push(`- [${e.date || ""}] ${e.title || ""}`);
  }
  const done = getBucket().filter((b) => b.done).slice(0, 20);
  if (done.length) parts.push("آرزوهای محقق‌شده: " + done.map((b) => b.title).join("، "));
  return parts.join("\n").slice(0, 8000);
}

/* ================= مناسبت‌ها 🎄 (v9.2) ================= */
export function occasionNow(now) {
  const d = now ? new Date(now) : new Date();
  const m = d.getMonth() + 1, day = d.getDate();
  const md = m * 100 + day;
  if ((m === 3 && day >= 19) || (m === 4 && day <= 2)) return { id: "nowruz", e: "🌸", t: "نوروز", greet: "نوروزتون پیروز! سال تازه، عشق تازه 🌸" };
  if (md >= 1220 && md <= 1222) return { id: "yalda", e: "🍉", t: "یلدا", greet: "یلداتون مبارک! بلندترین شب سال، کنار هم 🍉" };
  if (md >= 213 && md <= 215) return { id: "valentine", e: "💘", t: "ولنتاین", greet: "ولنتاین مبارک! 💘" };
  if (md === 217 || md === 218) return { id: "sepand", e: "💝", t: "سپندارمذگان", greet: "روز عشق ایرانی مبارک! 💝" };
  if (md >= 1224 && md <= 1226) return { id: "xmas", e: "🎄", t: "کریسمس", greet: "کریسمس مبارک! 🎄" };
  return null;
}

/* ================= نظرسنجی دو نفره 🗳️ (v9.2) ================= */
export const getPolls = () => { const l = rd(K("polls"), []); return Array.isArray(l) ? l : []; };
export function savePolls(l) { wr(K("polls"), l.slice(0, 200)); poke(); return l.slice(0, 200); }
export function addPoll({ q, opts, by }) {
  const question = String(q || "").slice(0, 200).trim();
  const clean = (opts || []).map((o) => String(o || "").slice(0, 80).trim()).filter(Boolean).slice(0, 4);
  if (!question || clean.length < 2) return getPolls();
  const l = getPolls();
  l.unshift({ id: uid(), ts: nowTs(), u: nowTs(), by: by || "", q: question, opts: clean, votes: {}, closed: false });
  return savePolls(l);
}
export function votePoll(id, pick, myId) {
  return savePolls(getPolls().map((p) => {
    if (p.id !== id || p.closed) return p;
    const votes = { ...(p.votes || {}) };
    votes[myId || "me"] = { pick: Math.max(0, Math.min(3, Number(pick) || 0)), ts: nowTs() };
    return { ...p, votes, u: nowTs() };
  }));
}
export function togglePoll(id) {
  return savePolls(getPolls().map((p) => (p.id === id ? { ...p, closed: !p.closed, u: nowTs() } : p)));
}
export function delPoll(id) { tomb("polls", id); return savePolls(getPolls().filter((p) => p.id !== id)); }
export function pollResult(p, myId) {
  const me = myId || "me";
  const votes = (p && p.votes) || {};
  const counts = (p.opts || []).map(() => 0);
  for (const v of Object.values(votes)) {
    if (v && v.pick >= 0 && v.pick < counts.length) counts[v.pick]++;
  }
  const total = counts.reduce((a, b) => a + b, 0);
  const mine = votes[me] ? votes[me].pick : null;
  const others = Object.keys(votes).filter((k) => k !== me);
  return { counts, total, mine, voted: others.length > 0 || mine !== null, bothVoted: mine !== null && others.length > 0 };
}

/* ================= امتیاز و مدال زوج 🏆 (v9.3) ================= */
export const SCORE_LEVELS = [
  { min: 0, t: "جوانه", e: "🌱" },
  { min: 100, t: "هم‌مسیر", e: "🚶" },
  { min: 300, t: "هم‌دل", e: "💞" },
  { min: 600, t: "عاشق پیشه", e: "💘" },
  { min: 1000, t: "زوج افسانه‌ای", e: "🏆" },
];
export function coupleScore() {
  const mems = getMemories().length;
  const evs = getEvents().length;
  const dares = getDares();
  const bothDares = dares.filter((d) => Object.keys(d.done || {}).length >= 2).length;
  const games = getGames();
  const played = games.filter((g) => Object.keys(g.answers || {}).length > 0).length;
  const polls = getPolls().filter((p) => Object.keys(p.votes || {}).length > 0).length;
  const mlog = getMoodLog();
  const moods = Object.keys(mlog).filter((k) => (mlog[k] || {}).mineTs).length;
  const letters = getLetters().length;
  const exps = getExpenses().filter((e) => e.kind !== "settle").length;
  const prof = getCoupleProfile();
  const days = prof.since ? Math.max(0, Math.floor((Date.now() - new Date(prof.since + "T12:00:00")) / 864e5)) : 0;
  const score = mems * 10 + evs * 3 + bothDares * 25 + played * 15 + polls * 10 + moods * 5 + letters * 8 + exps * 2 + Math.min(days, 1000);
  let lvl = SCORE_LEVELS[0], next = SCORE_LEVELS[1] || null;
  for (let i = 0; i < SCORE_LEVELS.length; i++) {
    if (score >= SCORE_LEVELS[i].min) { lvl = SCORE_LEVELS[i]; next = SCORE_LEVELS[i + 1] || null; }
  }
  return { score, level: lvl, next, parts: { mems, bothDares, played, polls, moods, letters, days } };
}
export const MEDALS = [
  { id: "first-memory", e: "📸", t: "اولین خاطره", d: "اولین خاطره رو ثبت کن", ok: () => getMemories().length >= 1 },
  { id: "mem10", e: "📚", t: "خاطره‌باز", d: "۱۰ خاطره ثبت کن", ok: () => getMemories().length >= 10 },
  { id: "mem50", e: "🏛️", t: "موزه‌دار عشق", d: "۵۰ خاطره ثبت کن", ok: () => getMemories().length >= 50 },
  { id: "dare-both", e: "🎯", t: "هم‌تیمی", d: "یه چالش رو هر دو انجام بدید", ok: () => getDares().some((d) => Object.keys(d.done || {}).length >= 2) },
  { id: "dare10", e: "🔥", t: "چالش‌خور", d: "۱۰ چالش دو نفره تموم کنید", ok: () => getDares().filter((d) => Object.keys(d.done || {}).length >= 2).length >= 10 },
  { id: "mood7", e: "😊", t: "خوش‌حال", d: "۷ روز پشت سر هم حالت رو ثبت کن", ok: () => moodStreak() >= 7 },
  { id: "game5", e: "🎮", t: "بازی‌باز", d: "۵ تا بازی انجام بده", ok: (me) => getGames().filter((g) => (g.answers || {})[me || "me"]).length >= 5 },
  { id: "yn-match", e: "💞", t: "هم‌دل", d: "تو «این یا اون» هم‌نظر بشید", ok: (me) => getGames().some((g) => g.kind === "yn" && ynResult(g, me).match) },
  { id: "letter5", e: "💌", t: "نامه‌رسان", d: "۵ تا نامه بنویسید", ok: () => getLetters().length >= 5 },
  { id: "days100", e: "💯", t: "صد روزگی", d: "۱۰۰ روز با هم باشید", ok: () => { const p = getCoupleProfile(); return !!(p.since && (Date.now() - new Date(p.since + "T12:00:00")) / 864e5 >= 100); } },
  { id: "days365", e: "💍", t: "یه‌سالگی", d: "یه سال با هم باشید", ok: () => { const p = getCoupleProfile(); return !!(p.since && (Date.now() - new Date(p.since + "T12:00:00")) / 864e5 >= 365); } },
  { id: "dong10", e: "💸", t: "حساب‌کتاب", d: "۱۰ تا خرج ثبت کنید", ok: () => getExpenses().filter((e) => e.kind !== "settle").length >= 10 },
];
export function earnedMedals(myId) {
  const out = [];
  for (const m of MEDALS) { try { if (m.ok(myId)) out.push(m.id); } catch {} }
  return out;
}

/* ================= قانون‌های ما 📜 (v10) ================= */
export function getLaws() { return rd(K("laws"), []); }
export function saveLaws(l) { wr(K("laws"), l.slice(0, 100)); poke(); return l.slice(0, 100); }
export function addLaw(text) {
  const t = String(text || "").slice(0, 200).trim();
  if (!t) return getLaws();
  const l = getLaws();
  l.unshift({ id: uid(), ts: nowTs(), u: nowTs(), text: t, signs: {} });
  return saveLaws(l);
}
export function signLaw(id, myId) {
  const k = myId || "me";
  return saveLaws(getLaws().map((w) => {
    if (w.id !== id) return w;
    const signs = { ...(w.signs || {}) };
    if (signs[k]) delete signs[k]; else signs[k] = nowTs();
    return { ...w, signs, u: nowTs() };
  }));
}
export function delLaw(id) { tomb("laws", id); return saveLaws(getLaws().filter((w) => w.id !== id)); }

/* ================= چالش عکس هفته 📸 (v9.9) ================= */
export function weekKey(d) {
  const t = new Date(d || Date.now());
  const one = new Date(t.getFullYear(), 0, 1);
  const w = Math.ceil((((t - one) / 864e5) + one.getDay() + 1) / 7);
  return t.getFullYear() + "-W" + String(w).padStart(2, "0");
}
export const SHOT_THEMES = ["☕ قهوه/چای‌تون", "🌅 غروب", "🐱 حیوون بامزه", "🍕 غذای امروز", "👟 کفش‌هاتون", "🌧️ بارون", "📚 کتاب", "🎶 موزیک", "🌙 شب", "🌸 گل", "🚗 ماشین", "🏠 گوشه‌ی دنج خونه", "🌳 درخت", "🎨 رنگ‌ها", "💡 نور و سایه", "🧸 عروسک و بازی", "🍦 دسر", "🌊 آب", "🔥 آتیش", "❄️ سرما", "😂 خنده", "🤳 سلفی", "🛋️ تنبلی", "🌈 رنگین‌کمون", "⭐ ستاره", "🍂 برگ و پاییز"];
export function shotTheme(week) {
  const w = Number(String(week || "").split("-W")[1] || 1);
  return SHOT_THEMES[(w - 1) % SHOT_THEMES.length];
}
export function getShots() { return rd(K("shots"), []); }
export function saveShots(l) { wr(K("shots"), l.slice(0, 100)); poke(); return l.slice(0, 100); }
export function ensureShot() {
  const wk = weekKey();
  let s = getShots().find((x) => x.week === wk);
  if (!s) {
    const l = getShots();
    s = { id: uid(), ts: nowTs(), u: nowTs(), week: wk, theme: shotTheme(wk), entries: {}, votes: {} };
    l.unshift(s); saveShots(l);
  }
  return s;
}
export function addShotEntry(photo, myId) {
  const wk = weekKey();
  const p = String(photo || "");
  if (!p || p.length > 420000 || p.indexOf("data:image/") !== 0) return getShots();
  return saveShots(getShots().map((s) => s.week !== wk ? s : { ...s, u: nowTs(), entries: { ...(s.entries || {}), [myId || "me"]: { photo: p, ts: nowTs() } } }));
}
export function voteShot(votedUid, myId) {
  const wk = weekKey();
  const me = myId || "me";
  return saveShots(getShots().map((s) => {
    if (s.week !== wk) return s;
    const votes = { ...(s.votes || {}) };
    if (votes[me] === votedUid) delete votes[me]; else votes[me] = String(votedUid).slice(0, 40);
    return { ...s, votes, u: nowTs() };
  }));
}

/* ================= صندوق آرزوهای ماه 🗳️ (v9.9) ================= */
export function monthKey(d) { return isoDay(new Date(d || Date.now())).slice(0, 7); }
export function getBallots() { return rd(K("ballots"), []); }
export function saveBallots(l) { wr(K("ballots"), l.slice(0, 24)); poke(); return l.slice(0, 24); }
export function ensureBallot() {
  const mo = monthKey();
  let b = getBallots().find((x) => x.month === mo);
  if (!b) {
    const l = getBallots();
    b = { id: uid(), ts: nowTs(), u: nowTs(), month: mo, wishes: [], votes: {}, fulfilled: "" };
    l.unshift(b); saveBallots(l);
  }
  return b;
}
export function addBallotWish(text, myId) {
  const mo = monthKey();
  const t = String(text || "").slice(0, 120).trim();
  if (!t) return getBallots();
  return saveBallots(getBallots().map((b) => b.month !== mo ? b : { ...b, u: nowTs(), wishes: [...(b.wishes || []), { id: uid(), t, by: myId || "me" }].slice(0, 20) }));
}
export function voteWish(wishId, myId) {
  const mo = monthKey();
  const me = myId || "me";
  return saveBallots(getBallots().map((b) => {
    if (b.month !== mo) return b;
    const votes = { ...(b.votes || {}) };
    if (votes[me] === wishId) delete votes[me]; else votes[me] = String(wishId).slice(0, 24);
    return { ...b, votes, u: nowTs() };
  }));
}
export function fulfillBallot(wishId) {
  const mo = monthKey();
  return saveBallots(getBallots().map((b) => b.month !== mo ? b : { ...b, fulfilled: String(wishId).slice(0, 24), u: nowTs() }));
}

/* ================= شمارش‌های ما ⏳ (v9.9) ================= */
export function getCounts() { return rd(K("counts"), []); }
export function saveCounts(l) { wr(K("counts"), l.slice(0, 50)); poke(); return l.slice(0, 50); }
export function addCount({ title, date, emoji }) {
  const t = String(title || "").slice(0, 80).trim();
  if (!t || !date) return getCounts();
  const l = getCounts();
  l.unshift({ id: uid(), ts: nowTs(), u: nowTs(), title: t, date: String(date).slice(0, 10), emoji: String(emoji || "⏳").slice(0, 8) });
  return saveCounts(l);
}
export function delCount(id) { tomb("counts", id); return saveCounts(getCounts().filter((c) => c.id !== id)); }

/* ================= فیلم‌بین ما 🎬 (v9.8) ================= */
export function getMovies() { return rd(K("movies"), []); }
export function saveMovies(l) { wr(K("movies"), l.slice(0, 200)); poke(); return l.slice(0, 200); }
export function addMovie({ title, kind }) {
  const t = String(title || "").slice(0, 100).trim();
  if (!t) return getMovies();
  const l = getMovies();
  l.unshift({ id: uid(), ts: nowTs(), u: nowTs(), title: t, kind: kind === "series" ? "series" : "film", votes: {}, watched: 0, stars: 0 });
  return saveMovies(l);
}
export function voteMovie(id, v, myId) {
  const k = myId || "me";
  const vv = v === "n" ? "n" : "y";
  return saveMovies(getMovies().map((m) => {
    if (m.id !== id) return m;
    const votes = { ...(m.votes || {}) };
    if (votes[k] === vv) delete votes[k]; else votes[k] = vv;
    return { ...m, votes, u: nowTs() };
  }));
}
export function watchMovie(id, stars) {
  return saveMovies(getMovies().map((m) => m.id !== id ? m : { ...m, watched: m.watched ? 0 : 1, stars: Math.max(0, Math.min(5, Number(stars) || 0)), u: nowTs() }));
}
export function rateMovie(id, stars) {
  return saveMovies(getMovies().map((m) => m.id !== id ? m : { ...m, stars: Math.max(0, Math.min(5, Number(stars) || 0)), u: nowTs() }));
}
export function delMovie(id) { tomb("movies", id); return saveMovies(getMovies().filter((m) => m.id !== id)); }

/* ================= آشپزخونه‌ی ما 🍳 (v9.8) ================= */
export function getRecipes() { return rd(K("recipes"), []); }
export function saveRecipes(l) { wr(K("recipes"), l.slice(0, 100)); poke(); return l.slice(0, 100); }
export function addRecipe({ title, desc, mins, steps }) {
  const t = String(title || "").slice(0, 80).trim();
  if (!t) return getRecipes();
  const st = (steps || []).map((x) => String(x || "").slice(0, 200).trim()).filter(Boolean).slice(0, 20);
  const l = getRecipes();
  l.unshift({ id: uid(), ts: nowTs(), u: nowTs(), title: t, desc: String(desc || "").slice(0, 300), mins: Math.max(0, Math.min(600, Math.floor(Number(mins) || 0))), steps: st, cooked: 0, last: 0 });
  return saveRecipes(l);
}
export function cookRecipe(id) {
  return saveRecipes(getRecipes().map((r) => r.id !== id ? r : { ...r, cooked: (Number(r.cooked) || 0) + 1, last: nowTs(), u: nowTs() }));
}
export function delRecipe(id) { tomb("recipes", id); return saveRecipes(getRecipes().filter((r) => r.id !== id)); }

/* ================= رویای مشترک 💤 (v9.8) ================= */
export function getDreams() { return rd(K("dreams"), []); }
export function saveDreams(l) { wr(K("dreams"), l.slice(0, 200)); poke(); return l.slice(0, 200); }
export function addDream({ text, by }) {
  const t = String(text || "").slice(0, 1000).trim();
  if (!t) return getDreams();
  const l = getDreams();
  l.unshift({ id: uid(), ts: nowTs(), u: nowTs(), by: by || "", text: t, day: isoDay(new Date()) });
  return saveDreams(l);
}
export function delDream(id) { tomb("dreams", id); return saveDreams(getDreams().filter((d) => d.id !== id)); }
export const DREAM_FUN = [
  { s: "آب زلال 🌊", t: "یه سفر آبی تو راهه — چمدون ببندید!" },
  { s: "پرواز 🕊️", t: "قراره یه خبر خوب غافلگیرتون کنه!" },
  { s: "مهمونی 🎉", t: "یه دورهمی شاد نزدیکه — خودتون بگیریدش!" },
  { s: "غذا 🍲", t: "امشب باید یه چیز خوشمزه بپزید، خواب گفته!" },
  { s: "بارون 🌧️", t: "یه حال خوب داره میاد — چتر لازم نیست!" },
  { s: "ستاره ✨", t: "یه آرزوتون داره برآورده می‌شه!" },
  { s: "گربه 🐱", t: "یه ناز اضافه به پارتنرت بدهکار شدی!" },
  { s: "سفر ✈️", t: "خواب می‌گه وقتشه یه سفر برید!" },
  { s: "گل 🌸", t: "یه سورپرایز کوچیک برای هم بخرید!" },
  { s: "ماهی 🐟", t: "برکت تو راهه — قلکتون رو پر کنید!" },
  { s: "کوه 🏔️", t: "یه چالش رو با هم فتح می‌کنید!" },
  { s: "ماه 🌙", t: "امشب یه حرف عاشقانه بزن — اثرش ده برابره!" },
];
export function dreamFun(text) {
  let h = 0;
  for (const ch of String(text || "")) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return DREAM_FUN[h % DREAM_FUN.length];
}

/* ================= پادکست ما 🎙️ (v9.7) ================= */
export function getCasts() { return rd(K("casts"), []); }
export function saveCasts(l) { wr(K("casts"), l.slice(0, 20)); poke(); return l.slice(0, 20); }
export function addCast(title) {
  const t = String(title || "").slice(0, 80).trim() || "پادکست ما 🎙️";
  const l = getCasts();
  l.unshift({ id: uid(), ts: nowTs(), u: nowTs(), title: t, segs: [] });
  return saveCasts(l);
}
export function delCast(id) { tomb("casts", id); return saveCasts(getCasts().filter((c) => c.id !== id)); }
export function addCastSeg(id, { audio, dur }, myId) {
  const au = String(audio || "");
  if (!au || au.length > 450000 || !/^data:audio\/(webm|mp4|ogg|mpeg|wav);base64,[A-Za-z0-9+/=]+$/.test(au)) return getCasts();
  return saveCasts(getCasts().map((c) => c.id !== id ? c : { ...c, u: nowTs(), segs: [...(c.segs || []), { by: myId || "me", ts: nowTs(), dur: Math.max(1, Math.min(300, Math.round(Number(dur) || 0))), audio: au }].slice(-12) }));
}
export function delCastSeg(id, ts, by) {
  return saveCasts(getCasts().map((c) => c.id !== id ? c : { ...c, u: nowTs(), segs: (c.segs || []).filter((s) => !(s.ts === ts && (s.by || "") === (by || ""))) }));
}

/* ================= نقشه‌ی خاطرات 📍 (v9.7) ================= */
export function getPins() { return rd(K("pins"), []); }
export function savePins(l) { wr(K("pins"), l.slice(0, 200)); poke(); return l.slice(0, 200); }
export function addPin({ title, note, lat, lon, day }) {
  const t = String(title || "").slice(0, 80).trim();
  const la = Number(lat), lo = Number(lon);
  if (!t || !isFinite(la) || !isFinite(lo) || Math.abs(la) > 90 || Math.abs(lo) > 180) return getPins();
  const l = getPins();
  l.unshift({ id: uid(), ts: nowTs(), u: nowTs(), title: t, note: String(note || "").slice(0, 300), lat: la, lon: lo, day: day || isoDay(new Date()) });
  return savePins(l);
}
export function delPin(id) { tomb("pins", id); return savePins(getPins().filter((p) => p.id !== id)); }

/* ================= قلک آرزو 💰 (v9.7) ================= */
export function getBanks() { return rd(K("banks"), []); }
export function saveBanks(l) { wr(K("banks"), l.slice(0, 50)); poke(); return l.slice(0, 50); }
export function addBank({ title, target }) {
  const t = String(title || "").slice(0, 80).trim();
  const tg = Math.floor(Number(target) || 0);
  if (!t || tg < 1) return getBanks();
  const l = getBanks();
  l.unshift({ id: uid(), ts: nowTs(), u: nowTs(), title: t, target: Math.min(1e12, tg), dep: [] });
  return saveBanks(l);
}
export function delBank(id) { tomb("banks", id); return saveBanks(getBanks().filter((b) => b.id !== id)); }
export function addDeposit(id, amt, myId) {
  const a = Math.floor(Number(amt) || 0);
  if (a < 1 || a > 1e9) return getBanks();
  return saveBanks(getBanks().map((b) => b.id !== id ? b : { ...b, u: nowTs(), dep: [...(b.dep || []), { by: myId || "me", amt: a, ts: nowTs() }].slice(-200) }));
}
export function bankSum(b) { return (b.dep || []).reduce((s, d) => s + (Number(d.amt) || 0), 0); }

/* ================= داستان زنجیره‌ای 💌 (v9.6) ================= */
export function getChains() { return rd(K("chains"), []); }
export function saveChains(l) { wr(K("chains"), l.slice(0, 50)); poke(); return l.slice(0, 50); }
export function addChain(title) {
  const t = String(title || "").slice(0, 80).trim() || "داستان ما 📖";
  const l = getChains();
  l.unshift({ id: uid(), ts: nowTs(), u: nowTs(), title: t, lines: [] });
  return saveChains(l);
}
export function addChainLine(id, text, myId) {
  const t = String(text || "").slice(0, 200).trim();
  if (!t) return getChains();
  return saveChains(getChains().map((c) => c.id !== id ? c : { ...c, u: nowTs(), lines: [...(c.lines || []), { by: myId || "me", t, ts: nowTs() }].slice(-200) }));
}
export function delChain(id) { tomb("chains", id); return saveChains(getChains().filter((c) => c.id !== id)); }

/* ================= چالش ۳۰ روزه 🏅 (v9.6) ================= */
export function getQuests() { return rd(K("quests"), []); }
export function saveQuests(l) { wr(K("quests"), l.slice(0, 20)); poke(); return l.slice(0, 20); }
export function questDay(q) {
  const d0 = new Date(q.start); d0.setHours(0, 0, 0, 0);
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return Math.floor((t - d0) / 864e5);
}
export function startQuest() {
  const l = getQuests();
  if (l.some((q) => questDay(q) < 30)) return l;
  l.unshift({ id: uid(), ts: nowTs(), u: nowTs(), title: "چالش ۳۰ روزه 🏅", start: nowTs(), done: {} });
  return saveQuests(l);
}
export function checkQuest(id, day, myId) {
  const k = myId || "me";
  return saveQuests(getQuests().map((q) => {
    if (q.id !== id) return q;
    const done = { ...(q.done || {}) };
    const dd = { ...(done[day] || {}) };
    if (dd[k]) delete dd[k]; else dd[k] = nowTs();
    done[day] = dd;
    return { ...q, done, u: nowTs() };
  }));
}
export const MISSIONS_30 = ["به هم یه تعریف غیرمنتظره بگید 🥰", "با هم یه غذای تازه بپزید 🍳", "۱۰ دقیقه بدون گوشی حرف بزنید 📵", "یه عکس بامزه از هم بگیرید 🤪", "به هم یه پیام صوتی عاشقانه بدید 🎙️", "با هم پیاده‌روی کنید 🚶", "یه فیلم که هردوتون ندیدید ببینید 🎬", "به هم یه نامه‌ی کوتاه بنویسید 💌", "با هم یه آهنگ رو بلند بخونید 🎤", "یه خاطره‌ی قدیمی رو تعریف کنید 📖", "به هم ماساژ شونه بدید 💆", "یه دسر مشترک درست کنید 🧁", "ستاره‌ها رو با هم نگاه کنید ✨", "یه بازی رومیزی بکنید 🎲", "به هم یه هدیه‌ی کوچیک بدید 🎁", "با هم ورزش کنید 🏃", "یه جای تازه تو شهر کشف کنید 📍", "عکس‌های قدیمیتون رو مرور کنید 🖼️", "به هم یه قول کوچیک بدید 🤝", "با هم قهوه/چای درست کنید ☕", "یه پازل یا لگو با هم بسازید 🧩", "به زبون هم یه جمله‌ی عاشقانه یاد بگیرید 💬", "با هم آواز بخونید تو ماشین 🚗", "یه غروب رو بدون برنامه با هم باشید 🌅", "به هم یه شعر بخونید 📜", "یه ویدیوی خنده‌دار برای هم بفرستید 😂", "با هم به یه نفر کمک کنید 🤲", "برنامه‌ی یه سفر رو بریزید 🧳", "از هم عذرخواهی کنید اگه لازمه 💛", "جشن بگیرید: ۳۰ روز کنار هم! 🎉"];

/* ================= پیکسل‌آرت روزانه 🎨 (v9.6) ================= */
export function getArts() { return rd(K("arts"), []); }
export function saveArts(l) { wr(K("arts"), l.slice(0, 200)); poke(); return l.slice(0, 200); }
export function saveArt(day, px, myId) {
  const clean = String(px || "").replace(/[^0-7]/g, "0").padEnd(256, "0").slice(0, 256);
  const l = getArts().filter((a) => !(a.day === day && (a.by || "") === (myId || "")));
  l.unshift({ id: uid(), ts: nowTs(), u: nowTs(), by: myId || "", day, px: clean });
  return saveArts(l);
}
export function delArt(id) { tomb("arts", id); return saveArts(getArts().filter((a) => a.id !== id)); }
export const PIXEL_COLORS = ["#f8fafc", "#1e293b", "#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7", "#ff4f8b"];

/* ================= گردونه شانس 🎰 (v9.5) ================= */
export function getSpins() { return rd(K("spins"), []); }
export function saveSpins(l) { wr(K("spins"), l.slice(0, 100)); poke(); return l.slice(0, 100); }
export function addSpin({ title, opts, win }) {
  const o = (opts || []).map((x) => String(x || "").slice(0, 60).trim()).filter(Boolean).slice(0, 8);
  if (o.length < 2) return getSpins();
  const l = getSpins();
  l.unshift({ id: uid(), ts: nowTs(), u: nowTs(), title: String(title || "امشب چیکار کنیم؟").slice(0, 80), opts: o, win: Math.max(0, Math.min(o.length - 1, Number(win) || 0)) });
  return saveSpins(l);
}
export function delSpin(id) { tomb("spins", id); return saveSpins(getSpins().filter((s) => s.id !== id)); }
export const SPIN_PRESETS = {
  food: { t: "🍔 چی بخوریم؟", opts: ["پیتزا 🍕", "کباب 🍢", "سوشی 🍣", "فست‌فود 🍔", "غذای خونگی 🍲", "رستوران تازه 🍽️"] },
  fun: { t: "🎉 کجا بریم؟", opts: ["سینما 🎬", "کافه ☕", "پارک 🌳", "شهربازی 🎢", "کنسرت 🎶", "بولینگ 🎳"] },
  home: { t: "🏠 تو خونه؟", opts: ["فیلم 🎬", "بازی رومیزی 🎲", "آشپزی مشترک 👩‍🍳", "موسیقی و رقص 💃", "کتاب‌خونی 📖", "هیچی، بغل! 🫂"] },
};

/* ================= کپسول زمان 📖 (v9.5) ================= */
export function getCapsules() { return rd(K("capsules"), []); }
export function saveCapsules(l) { wr(K("capsules"), l.slice(0, 100)); poke(); return l.slice(0, 100); }
export function addCapsule({ title, body, openAt }) {
  const b = String(body || "").slice(0, 2000).trim();
  if (!b || !openAt) return getCapsules();
  const l = getCapsules();
  l.unshift({ id: uid(), ts: nowTs(), u: nowTs(), title: String(title || "کپسول زمان").slice(0, 80), body: b, openAt: Math.max(0, Number(openAt) || 0) });
  return saveCapsules(l);
}
export function delCapsule(id) { tomb("capsules", id); return saveCapsules(getCapsules().filter((c) => c.id !== id)); }

/* ================= هوای قرار 🌦️ (v9.5) ================= */
export function weatherSuggest(code) {
  const c = Number(code);
  if ([0, 1].includes(c)) return { e: "☀️", t: "آفتابی", tip: "هوای پیک‌نیکه! 🌅" };
  if (c === 2) return { e: "⛅", t: "کمی ابری", tip: "پیاده‌روی غروب؟ 🚶‍♀️🚶" };
  if (c === 3) return { e: "☁️", t: "ابری", tip: "کافه‌گردی بچسبه ☕" };
  if ([45, 48].includes(c)) return { e: "🌫️", t: "مه‌آلود", tip: "رانندگی آروم با موزیک 🚗🎶" };
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(c)) return { e: "🌧️", t: "بارونی", tip: "فیلم و پاپ‌کورن؟ 🎬🍿" };
  if ([71, 73, 75, 77, 85, 86].includes(c)) return { e: "❄️", t: "برفی", tip: "برف‌بازی و هات‌چاکلت ☕❄️" };
  if ([95, 96, 99].includes(c)) return { e: "⛈️", t: "طوفانی", tip: "امشب خونه بمونید و بغل کنید 🫂" };
  return { e: "🌤️", t: "معمولی", tip: "هر کاری بکنید خوش می‌گذره 💕" };
}

/* ================= سفر مشترک 🧳 (v9.4) ================= */
export function getTrips() { return rd(K("trips"), []); }
export function saveTrips(l) { wr(K("trips"), l.slice(0, 100)); poke(); return l.slice(0, 100); }
export function addTrip({ title, dest, date, by }) {
  const t = String(title || "").slice(0, 80).trim();
  if (!t) return getTrips();
  const l = getTrips();
  l.unshift({ id: uid(), ts: nowTs(), u: nowTs(), by: by || "", title: t, dest: String(dest || "").slice(0, 60), date: date || "", items: [] });
  return saveTrips(l);
}
export function delTrip(id) { tomb("trips", id); return saveTrips(getTrips().filter((t) => t.id !== id)); }
export function addTripItem(tripId, text) {
  const t = String(text || "").slice(0, 100).trim();
  if (!t) return getTrips();
  return saveTrips(getTrips().map((tr) => tr.id !== tripId ? tr : { ...tr, u: nowTs(), items: [...(tr.items || []), { id: uid(), t, done: {} }].slice(0, 60) }));
}
export function toggleTripItem(tripId, itemId, myId) {
  const k = myId || "me";
  return saveTrips(getTrips().map((tr) => {
    if (tr.id !== tripId) return tr;
    return { ...tr, u: nowTs(), items: (tr.items || []).map((x) => {
      if (x.id !== itemId) return x;
      const done = { ...(x.done || {}) };
      if (done[k]) delete done[k]; else done[k] = nowTs();
      return { ...x, done };
    }) };
  }));
}
export function delTripItem(tripId, itemId) {
  return saveTrips(getTrips().map((tr) => tr.id !== tripId ? tr : { ...tr, u: nowTs(), items: (tr.items || []).filter((x) => x.id !== itemId) }));
}
export const PACK_IDEAS = ["🪪 مدارک و کارت ملی", "🔌 شارژر و پاوربانک", "💊 داروهای ضروری", "🕶️ عینک آفتابی", "🧴 ضدآفتاب", "📸 دوربین", "🎧 هندزفری", "🧥 یه دست لباس گرم", "🩴 دمپایی راحتی", "🍫 تنقلات راه", "💧 قمقمه آب", "🎲 یه بازی سفر"];

/* ================= سالگرد هوشمند 🎂 (v9.4) ================= */
export function nextMilestones() {
  const p = getCoupleProfile();
  if (!p.since) return null;
  const s = new Date(p.since + "T12:00:00");
  if (isNaN(s)) return null;
  const t0 = new Date(); t0.setHours(0, 0, 0, 0);
  const sd = Math.min(s.getDate(), 28);
  let m = null;
  for (let k = 1; k <= 1200; k++) {
    const c = new Date(s.getFullYear(), s.getMonth() + k, sd);
    if (c >= t0) { m = { n: k, date: c }; break; }
  }
  if (!m) return null;
  const yN = t0.getFullYear() - s.getFullYear() + (new Date(t0.getFullYear(), s.getMonth(), sd) < t0 ? 1 : 0);
  const yD = new Date(s.getFullYear() + yN, s.getMonth(), sd);
  return {
    monthly: { n: m.n, left: Math.round((m.date - t0) / 864e5), date: isoDay(m.date) },
    yearly: { n: yN, left: Math.round((yD - t0) / 864e5), date: isoDay(yD) },
  };
}
export const SURPRISE_IDEAS = ["یه نامه‌ی دست‌نویس بذار زیر بالشش 💌", "صبحانه رو ببر تو رختخواب 🥐", "یه پلی‌لیست از آهنگ‌های خاطره‌تون بساز 🎶", "شام دونفره با شمع بچین 🕯️", "یه ویدیوی کوتاه از عکس‌های امسال تدوین کن 🎬", "یه هدیه‌ی کوچیک ولی پرمعنی بخر 🎁", "ببرش پیک‌نیک غروب 🌅", "بلیت سینما یا تئاتر بگیر 🎭", "بهترین عکس‌هاتون رو چاپ کن و قاب کن 🖼️", "یه ویس عاشقانه از ته دل ضبط کن 🎙️", "برگردید به جایی که اول بار همدیگه رو دیدید 📍", "با هم یه کیک خونگی بپزید 🎂"];

/* ================= تقویم پیشرفته 🗓️ (v9.3) ================= */
export function gcalUrl(e) {
  const t = encodeURIComponent(e.title || "قرار");
  const d = String(e.date || "").replace(/-/g, "");
  let dates = d + "/" + d;
  if (e.time && /^\d{2}:\d{2}$/.test(e.time)) {
    const s = new Date(`${e.date}T${e.time}:00`);
    const en = new Date(s.getTime() + 3600000);
    const f = (x) => x.getFullYear() + String(x.getMonth() + 1).padStart(2, "0") + String(x.getDate()).padStart(2, "0") + "T" + String(x.getHours()).padStart(2, "0") + String(x.getMinutes()).padStart(2, "0") + "00";
    if (!isNaN(s)) dates = f(s) + "/" + f(en);
  }
  const det = encodeURIComponent((e.note || "") + " — باهم 💑");
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${t}&dates=${dates}&details=${det}`;
}
export function downloadICS(e) {
  const d = String(e.date || "");
  const dt = d.replace(/-/g, "");
  let start = dt, end = dt;
  if (e.time && /^\d{2}:\d{2}$/.test(e.time)) {
    const s = new Date(`${d}T${e.time}:00`);
    const en = new Date(s.getTime() + 3600000);
    const f = (x) => x.getFullYear() + String(x.getMonth() + 1).padStart(2, "0") + String(x.getDate()).padStart(2, "0") + "T" + String(x.getHours()).padStart(2, "0") + String(x.getMinutes()).padStart(2, "0") + "00";
    if (!isNaN(s)) { start = f(s); end = f(en); }
  }
  const esc = (s) => String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Baham//FA", "BEGIN:VEVENT", `UID:${e.id || Date.now()}@baham`, `DTSTART:${start}`, `DTEND:${end}`, `SUMMARY:${esc(e.title)}`, `DESCRIPTION:${esc(e.note || "")}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  try {
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "baham-event.ics";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  } catch {}
}

/* ================= آمار رابطه 📊 (v9.1) ================= */
export function statsMoodWeek() {
  const log = getMoodLog();
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const e = log[isoDay(d)] || {};
    out.push({ day: d, mine: e.mineV || 0, theirs: e.theirsV || 0 });
  }
  return out;
}
export function statsExpenseWeek() {
  const map = {};
  for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); map[isoDay(d)] = 0; }
  for (const e of getExpenses()) {
    if (e.kind === "settle") continue;
    const k = e.date || "";
    if (k in map) map[k] += Number(e.amount) || 0;
  }
  return Object.entries(map).map(([k, v]) => ({ k, v }));
}
export function statsTopTags(n) {
  const c = {};
  for (const m of getMemories()) for (const t of (m.tags || [])) c[t] = (c[t] || 0) + 1;
  return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, n || 6);
}
export function statsTopPlaces(n) {
  const c = {};
  for (const m of getMemories()) { if (m.place) c[m.place] = (c[m.place] || 0) + 1; }
  return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, n || 6);
}
export function statsMonthExpense() {
  const mk = isoDay(new Date()).slice(0, 7);
  let s = 0;
  for (const e of getExpenses()) {
    if (e.kind !== "settle" && String(e.date || "").startsWith(mk)) s += Number(e.amount) || 0;
  }
  return s;
}

/* ---------- اعلان تغییرات (برای سینک خودکار) ---------- */
const listeners = new Set();
export function onSpaceChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function poke() {
  try { wr("sp:dirty", nowTs()); } catch {}
  for (const fn of [...listeners]) { try { fn(); } catch {} }
}
export const getDirty = () => rd("sp:dirty", 0);
export const getLastSync = () => rd("sp:lastsync", 0);
export const setLastSync = (t) => wr("sp:lastsync", t || nowTs());

/* ---------- tombstone: انتشار حذف‌ها برای سینک ---------- */
export function tomb(col, id) {
  try {
    const t = rd("sp:tombs", {});
    const o = t && typeof t === "object" ? t : {};
    o[col] = o[col] && typeof o[col] === "object" ? o[col] : {};
    o[col][id] = nowTs();
    wr("sp:tombs", o);
  } catch {}
}
/** مالک آیتم منم؟ (سازگار با آیتم‌های قدیمی بدون by) */
export function isMine(item, myId) {
  if (!item) return true;
  if (item.by) return myId ? item.by === myId : true;
  return item.mine !== false;
}

/* ---------- پیام‌های عاشقانه سریع (چت زوج) ---------- */
export const STICKER_PACKS = [
  { id: "love", t: "عاشقانه", items: [
    { id: "hug", b: "\U0001FAC2", t: "بغل" }, { id: "kiss", b: "\U0001F48B", t: "بوس" },
    { id: "fire", b: "❤️‍\U0001F525", t: "آتیش" }, { id: "ring", b: "\U0001F48D", t: "عروسی؟" },
    { id: "bear", b: "\U0001F9F8❤️", t: "نازی" }, { id: "night", b: "\U0001F319\U0001F4A4", t: "شب بخیر" },
    { id: "coffee", b: "☕\U0001F491", t: "قرار کافه؟" }, { id: "cry", b: "\U0001F97A", t: "ناراحتم" },
  ] },
  { id: "fun", t: "بامزه", items: [
    { id: "laugh", b: "\U0001F602", t: "مردم!" }, { id: "cool", b: "\U0001F60E", t: "خفن" },
    { id: "party", b: "\U0001F973", t: "جشن!" }, { id: "sleep", b: "\U0001F634", t: "خوابم" },
    { id: "angry", b: "\U0001F624", t: "قهرم!" }, { id: "please", b: "\U0001F64F", t: "لطفاً!" },
    { id: "dance", b: "\U0001F483\U0001F57A", t: "برقصیم" }, { id: "ghost", b: "\U0001F47B", t: "بو!" },
  ] },
];
export const stickerBody = (ref) => {
  if (!ref || typeof ref !== "string") return null;
  const parts = ref.split(":");
  if (parts.length !== 2) return null;
  const pack = STICKER_PACKS.find((x) => x.id === parts[0]);
  const it = pack && pack.items.find((x) => x.id === parts[1]);
  return it ? it.b : null;
};
export const LOVE_BURSTS = ["❤️", "💕", "💘", "💖", "😍", "🥰", "💋", "🌹"];
export const LOVE_NOTES = [
  "دلم برات تنگ شده ❤️", "بهت فکر می‌کنم 💭", "تو بهترین اتفاق زندگی منی 🌹",
  "بغلت کمه 🤗", "بوس 😘", "امروز چقدر خوشگل شدی 😍",
  "ممنون که هستی 🙏", "بیا بغلم 🫶", "دوستت دارم، همین 💕",
  "کاش الان پیشم بودی 🌙", "تو خونه‌ی قلبمی 🏠❤️", "فردا می‌بینمت؟ 🥺",
];
