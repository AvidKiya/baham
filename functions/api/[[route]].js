// ---------------------------------------------------------------------------
// functions/api/[[route]].js — Cloudflare Pages Function (runs on the edge
// next to the static Next.js export). One file, all endpoints:
//
//   ---- دعوت‌نامه (رُل) ----
//   GET    /api/config        → merged config (defaults + KV overrides)  [public]
//   PUT    /api/config        → save overrides   [auth: x-admin-key]
//   DELETE /api/config        → reset to defaults [auth]
//   POST   /api/event         → tiny answer analytics [public, KV STATS]
//   GET    /api/stats?key=…   → aggregated counts     [auth via key]
//   GET    /api/health        → { ok, kv }
//
//   ---- اپ باهم ----
//   POST   /api/auth/register → ثبت‌نام {username,password,name}
//   POST   /api/auth/login    → ورود
//   GET    /api/me            → پروفایل [Bearer token]
//   PUT    /api/me            → ویرایش پروفایل/تنظیمات AI [Bearer]
//   POST   /api/me            → {action:"ai-test"} تست اتصال AI [Bearer]
//   POST   /api/chat          → پاسخ هوش مصنوعی با کلید خود کاربر [Bearer]
//   GET    /api/history       → تاریخچه چت‌ها/دعوت‌ها [Bearer]
//   POST   /api/history       → ثبت آیتم [Bearer]
//   DELETE /api/history       → حذف آیتم ?id=&t= [Bearer]
//
// Bindings: CONFIG (users/history/config) · STATS (analytics, optional)
// Env: ADMIN_PASSWORD · AUTH_SECRET (optional, برای توکن‌ها)
// ---------------------------------------------------------------------------
import { DEFAULT_CONFIG, mergeConfig } from "../_lib/config.mjs";
import { validatePatch } from "../_lib/validate.mjs";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
};
const ALLOWED_EVENTS = new Set(["view", "yes", "no", "date", "when", "contract", "final", "secret"]);
const TONES = {
  funny: { t: "شوخ و بامزه" },
  romantic: { t: "رمانتیک و لطیف" },
  literary: { t: "ادبی و شاعرانه" },
  direct: { t: "مستقیم و صادق، بدون دورو" },
  mystery: { t: "کمی مرموز و کنجکاوکننده" },
  cool: { t: "خونسرد و بی‌خیال — نشان نده که منتظری" },
  bold18: { t: "بزرگسالِ جسور: تیز و پرادعا اما بدون توصیف صریح", adult: true },
  dom18: { t: "بزرگسالِ سلطه‌گر: قاطع و آمرانه اما محترمانه", adult: true },
  tease18: { t: "بزرگسالِ وسوسه‌کننده: بازیگوش و اغواگر با اشاره‌های تلویحی، بدون صراحت", adult: true },
};
const MODES = {
  reply: "کاربر پیام یا وضعیت طرف مقابل را داده؛ سه پیشنهادِ پاسخِ آماده‌ی ارسال بده.",
  opener: "کاربر می‌خواهد گفت‌وگو را شروع کند؛ با اطلاعات داده‌شده سه پیام اولِ کوتاه و متفاوت بنویس.",
  rewrite: "کاربر پیش‌نویس پیام خودش را داده؛ همان را با لحن انتخابی بازنویسی کن و در یک خط بگو چه چیزی بهتر شد.",
  analyze: "متن یا تصویر پروفایل/چت طرف مقابل را تحلیل کن: شخصیت محتمل، نشانه‌های علاقه یا بی‌علاقگی، و سه پیشنهاد پیامِ متناسب.",
  date: "سه ایده‌ی قرار متناسب با شرط کاربر بده؛ برای هر کدام مکان، بهانه و یک جمله‌ی دعوتِ آماده بنویس.",
  sim: "شبیه‌ساز کرش — در نقش طرف مقابل کاربر گفت‌وگو کن (تمرین زندهٔ مخ زدن).",
  comfort: "دلداری — برای وقتی طرف مقابل حالش بد است؛ سه پیام همدلانه بدون نصیحت‌کاری و بدون کوچک‌کردن احساسش؛ اول احساس را تأیید کن بعد (فقط اگر مناسب بود) راه بشمار.",
  congrats: "تبریک — سه پیام تبریک پرانرژی و شخصی متناسب با مناسبتی که کاربر گفته؛ بیش‌ازحد تشریفاتی نباشد.",
  express: "ابراز علاقه — سه پیام صادقانه برای گفتن حس کاربر؛ متناسب با مرحله‌ی رابطه (تازه‌آشنا تا جدی)؛ پوشالی و کلیشه‌ای نباشد.",
  nothing: "جواب به «هیچی نیستم» — طرف مقابل منفعل و ساکت است؛ سه پیام که بدون فشار و بازخواست در را باز نگه دارد و حرفِ پشتِ سکوتش را با ملایمت بیرون بکشد.",
  apology: "آشتی/عذرخواهی واقعی — با مسئولیت‌پذیریِ روشن (بدن «متأسفم که…») سه پیشنهاد بده؛ بدون توجیه اضافه و بدون شرط («اگر ناراحت شدی…» ممنوع).",
  sensitive: "موضوع حساس رابطه — برای آغاز یک گفت‌وگوی سخت، سه جمله‌ی شروعِ ملایمِ بدون سرزنش (با «من» جمله‌بندی شود نه «تو»)؛ و دو جمله که حتماً نگوی.",
  sos: "الان چی بگم؟ — کاربر وسط مکالمه است و جواب فوری می‌خواهد؛ دقیقاً به آخرین پیام طرف، سه جواب کوتاهِ آماده‌ی ارسال بده (سرد، گرم، شاد) و در یک خط بگو کدام را پس بده.",
  aftercare: "پس‌مراقبت (aftercare) — پیام‌های گرم، آرام و مراقبت‌محور برای بعد از یک بازی/لحظه‌ی بزرگسال؛ لحن نرم، امن‌ساز و مسئولانه. سه پیام کوتاه بده.",
  game: "بازی کارتی (محلی) — اگر پیام آمد، راهنمای کوتاه بازی حقیقت یا جرأت بده.",
  memory: "حافظه‌ی رابطه — کاربر از خاطرات و روزهای ثبت‌شده‌اش سؤال می‌پرسد؛ فقط با همان زمینه جواب بده.",
};
const INTERESTS_OK = new Set([
  "رابطه جدی", "آشنایی کژوال", "ازدواج", "دوستی اول",
  "سلطه‌گر", "سلطه‌پذیر", "سوییچ", "بانداج", "بازی نقش‌ها", "فتیش پا", "فتیش بو", "لباس و یونیفرم", "تحسین و پرستش", "سادی-مازو ملایم",
]);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

/* ============================ ابزارهای مشترک ============================ */

function adminPassword(env, cfg) {
  return (env && env.ADMIN_PASSWORD) || (cfg && cfg.stats && cfg.stats.adminKey) || "";
}
async function authLocked(kv) {
  if (!kv) return false;
  try { return (await kv.get("auth:lock")) === "1"; } catch { return false; }
}
async function authFail(kv) {
  if (!kv) return;
  try {
    const n = parseInt((await kv.get("auth:fails")) || "0", 10) + 1;
    if (n >= 8) {
      await kv.put("auth:lock", "1", { expirationTtl: 600 });
      await kv.delete("auth:fails");
    } else {
      await kv.put("auth:fails", String(n), { expirationTtl: 600 });
    }
  } catch {}
}
async function authReset(kv) {
  if (!kv) return;
  try { await kv.delete("auth:fails"); } catch {}
}
function isAuthed(request, env, cfg) {
  const key = request.headers.get("x-admin-key") || "";
  return key.length > 0 && key === adminPassword(env, cfg);
}
function sanitizeName(raw) {
  if (typeof raw !== "string") return "";
  try {
    return raw.replace(/[^\p{L}\p{M}\p{Nd}\u0020'\u2019\u060C\u00B7-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 32);
  } catch { return ""; }
}
async function readStoredConfig(env) {
  if (!env || !env.CONFIG) return { patch: null, stored: false };
  try {
    const raw = await env.CONFIG.get("config");
    if (!raw) return { patch: null, stored: false };
    return { patch: JSON.parse(raw), stored: true };
  } catch { return { patch: null, stored: false }; }
}
async function currentConfig(env) {
  const { patch } = await readStoredConfig(env);
  return mergeConfig(DEFAULT_CONFIG, patch || {});
}
/** محدودسازی سبک ضد اسپم (per-isolate) */
const RL = new Map();
function rateLimited(request, bucket, max) {
  const ip = (request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
  const k = bucket + ":" + ip;
  const now = Date.now();
  const rec = RL.get(k);
  if (!rec || now - rec.t > 60_000) { RL.set(k, { t: now, n: 1 }); return false; }
  rec.n += 1;
  return rec.n > (max || 60);
}

/* ============================ احراز هویت کاربران ============================ */

const TE = new TextEncoder();

async function sha256Hex(str) {
  const d = await crypto.subtle.digest("SHA-256", TE.encode(str));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function pkcePair() {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = b64url(await crypto.subtle.digest("SHA-256", TE.encode(verifier)));
  return { verifier, challenge };
}
const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (s) => atob(s.replace(/-/g, "+").replace(/_/g, "/"));

function authSecret(env) {
  return (env && (env.AUTH_SECRET || env.ADMIN_PASSWORD)) || "mokhyar-dev-secret-1404";
}

async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey("raw", TE.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, TE.encode(msg)));
}

async function hashPassword(pw, saltHex) {
  const salt = new Uint8Array((saltHex.match(/../g) || []).map((h) => parseInt(h, 16)));
  const key = await crypto.subtle.importKey("raw", TE.encode(pw), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 60000, hash: "SHA-256" }, key, 256);
  return b64url(bits);
}
const randHex = (n) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, "0")).join("");

async function makeToken(uid, env, days = 30) {
  const exp = Date.now() + days * 86400_000;
  const payload = b64url(TE.encode(uid + "|" + exp));
  const sig = await hmac(authSecret(env), payload);
  return payload + "." + sig;
}
async function readToken(request, env) {
  const h = request.headers.get("authorization") || "";
  const token = h.startsWith("Bearer ") ? h.slice(7).trim() : "";
  if (!token || token.length > 300) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const payload = token.slice(0, dot), sig = token.slice(dot + 1);
  let good = "";
  try { good = await hmac(authSecret(env), payload); } catch { return null; }
  if (good !== sig) return null;
  try {
    const [uid, exp] = fromB64url(payload).split("|");
    if (!uid || !exp || Date.now() > Number(exp)) return null;
    return uid;
  } catch { return null; }
}

async function getUser(env, uid) {
  if (!env || !env.CONFIG || !uid || !/^[\da-f]{4,40}$/.test(uid)) return null;
  try {
    const raw = await env.CONFIG.get("user:" + uid);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
async function putUser(env, user) {
  await env.CONFIG.put("user:" + user.id, JSON.stringify(user));
}
function safeUser(u) {
  return {
    id: u.id, username: u.username, name: u.name || u.username, created: u.created,
    profile: u.profile || {},
    ai: { base: (u.ai && u.ai.base) || "", model: (u.ai && u.ai.model) || "gpt-4o-mini", hasKey: !!(u.ai && u.ai.key) },
  };
}

/* ---------- حالت پارتنر (v6.2): جفت‌شدن دو حساب ---------- */
async function pairGet(env, key) {
  try { const r = await env.CONFIG.get(key); return r ? JSON.parse(r) : null; } catch { return null; }
}
async function pairPut(env, key, val, ttl) {
  try { await env.CONFIG.put(key, JSON.stringify(val), ttl ? { expirationTtl: ttl } : undefined); } catch {}
}
async function pairDel(env, key) {
  try { await env.CONFIG.delete(key); } catch {}
}
const SHARE_STATUS = new Set(["", "low", "talk", "hard"]);
const SHARE_CYCLE = new Set(["", "period", "follicular", "ovulation", "pms", "luteal", "due"]);
async function partnerFullState(env, uid) {
  const pid = await env.CONFIG.get("uspair:" + uid);
  if (!pid) return { paired: false };
  const pair = await pairGet(env, "pair:" + pid);
  if (!pair || (pair.a !== uid && pair.b !== uid)) { await pairDel(env, "uspair:" + uid); return { paired: false }; }
  const otherId = pair.a === uid ? pair.b : pair.a;
  const mine = (await pairGet(env, "pshare:" + uid)) || { name: "", status: "", mood: "", cycle: "" };
  const theirs = (await pairGet(env, "pshare:" + otherId)) || { name: "پارتنر", status: "", mood: "", cycle: "" };
  const myConf = await pairGet(env, "pconf:" + uid);
  const theirConf = await pairGet(env, "pconf:" + otherId);
  return {
    paired: true, since: pair.ts, otherId,
    partner: { name: theirs.name || "پارتنر", status: theirs.status || "", mood: theirs.mood || "", cycle: theirs.cycle || "", ts: theirs.ts || 0 },
    me: { status: mine.status || "", mood: mine.mood || "", cycle: mine.cycle || "" },
    myConf: myConf ? { topic: myConf.topic, ans: myConf.ans, ts: myConf.ts } : null,
    theirConf: theirConf ? { topic: theirConf.topic, ans: theirConf.ans, ts: theirConf.ts } : null,
  };
}

async function requireUser(request, env) {
  const uid = await readToken(request, env);
  if (!uid) return { err: json({ ok: false, error: "unauthorized", message: "اول بزن تو حسابت" }, 401) };
  const user = await getUser(env, uid);
  if (!user) return { err: json({ ok: false, error: "no_user" }, 401) };
  return { user };
}

async function readBody(request, maxLen) {
  try {
    const text = await request.text();
    if (text.length > (maxLen || 8192)) return { err: "too_large" };
    return { body: JSON.parse(text) };
  } catch { return { err: "bad_json" }; }
}

/* ============================ پرامپت باهم ============================ */

function bahamPrompt(user, styleId, modeId, again) {
  if (modeId === "memory") {
    return (
      "تو «باهم» هستی؛ دستیار حافظه‌ی رابطه برای کاربر فارسی‌زبان.\n" +
      "کاربر از خاطرات، روزها و آرزوهایی که خودش ثبت کرده سؤال می‌پرسد؛ زمینه‌ی آن‌ها در ادامه‌ی همین پیام سیستمی آمده.\n" +
      "قواعد:\n" +
      "۱. فقط و فقط با همان زمینه جواب بده؛ چیزی که در زمینه نیست را نساز و حدس نزن.\n" +
      "۲. اگر جواب در زمینه نیست، صمیمی بگو چنین چیزی ثبت نشده و پیشنهاد بده ثبتش کند.\n" +
      "۳. فارسی محاوره‌ای گرم و کوتاه بنویس؛ مثل یه رفیق که همه‌چی رو یادشه.\n" +
      "۴. تاریخ‌ها را همان‌طور که در زمینه آمده نقل کن؛ تاریخ جدید نساز.\n"
    );
  }
  const p = (user && user.profile) || {};
  const tone = (TONES[styleId] || TONES.funny).t;
  const isAdult = !!(TONES[styleId] || {}).adult;
  const sim = modeId === "sim";
  let s =
    "تو «باهم» هستی؛ مشاور پیام‌رسان عاشقانه برای کاربر فارسی‌زبان که می‌خواهد با کراشش ارتباط بهتری بگیرد.\n" +
    "لحن درخواستی: " + tone + (p.crush ? "؛ اسم طرف مقابل: «" + p.crush + "»" : "") + "\n" +
    "ابزار فعال: " + (MODES[modeId] ? MODES[modeId] : MODES.reply) + "\n\n" +
    "قواعد:\n" +
    "۱. فارسی محاوره‌ای طبیعی بنویس؛ شبیه پیام واقعی، نه متن کتابی. انرژی پیام‌های طرف مقابل را آینه کن.\n" +
    (sim
      ? "۲. دقیقاً در نقشِ طرف مقابلِ کاربر (کرش) جواب بده: فقط یک پیام کوتاه چت‌مانند، بدون شماره‌گذاری و بدون لیست. شخصیتش را از توضیح کاربر برداشت کن (پیش‌فرض: کمی سرد و متمایل به خودش) و در تمام گفتگو همان بمان. اگر پیام کاربر ضعیف یا حاشیه‌ای بود، بعد از پیامِ خودت یک خط خالی بگذار و در یک خط با پیشوند «نکته:» بگو چه چیزی بهتر می‌شد.\n"
      : "۲. خروجی را دقیقاً سه گزینه‌ی شماره‌دار بده (۱. ۲. ۳.)، هر کدام حداکثر ۱-۲ جمله؛ برای هر گزینه یک دلیل یک‌خطی کوتاه." + (again ? "\nاین تکرار است: گزینه‌های تازه و متفاوت از دفعه قبل بده." : "") + "\n") +
    "۳. اگر اسکرین‌شات استوری یا چت فرستاده شده، اول در یک خط برداشتت از تصویر را بگو، بعد گزینه‌ها را بده.\n" +
    "۴. اگر اطلاعات کم است، حداکثر یک سؤال کوتاه بپرس ولی همیشه حداقل دو گزینه‌ی قابل استفاده هم بده.\n" +
    "۵. هرگز تعقیب، فریب، اذیت یا توهین توصیه نکن؛ اگر نشانه‌های بی‌علاقگی طرف مقابل واضح است، صادقانه بگو و راه محترمانه‌ی عقب‌نشینی یا صبر را پیشنهاد بده.\n" +
    "۶. ایموجی را کم و بجا استفاده کن (۰ تا ۲ تا در برخی گزینه‌ها).\n" +
    "۷. کوتاه و کاربردی؛ بدون مقدمه‌چینی.\n" +
    "قوانین لحن (مهم‌ترین بخش): فارسیِ محاوره‌ی واقعی بنویس؛ مثل پیام یه رفیق ۲۲ساله‌ی باحال که روابط رو می‌فهمه — نه دستیار رسمی، نه مقاله‌ی روان‌شناسی، نه جواب ChatGPT‌وار. جمله‌های کوتاه. واژه‌های اداری (می‌باشد، می‌نماید، نمایید، لطفاً، کاربر گرامی، عملیات، درخواست شما، با موفقیت انجام شد) ممنوع. موضوع جدی شد (دعوا، ناراحتی، مرز، سلامت) شوخی را کم کن و درست و بالغ حرف بزن. ایموجی کم و به‌جا؛ لوس و بچگانه هرگز.\n" +
    "مثال بد: «به نظر می‌رسد منظور او این است که از توجه شما احساس مثبتی دریافت کرده است.»\n" +
    "مثال خوب: «داره می‌گه از توجهت خوشش اومده؛ پس خوب پیش رفتی 😏»\n";
  if (Array.isArray(p.interests) && p.interests.length) {
    s += "۸. علاقه‌مندی‌های اعلام‌شده‌ی کاربر: «" + p.interests.join("، ") + "» — این‌ها را به‌طور طبیعی در لحن و زاویه‌ی پیشنهادها لحاظ کن، بدون اینکه برچسب یا اصطلاح فنی را مستقیم در پیام بیاوری مگر اینکه خود کاربر آورده باشد.\n";
  }
  if (isAdult) {
    s +=
      "۹. لحن بزرگسال فعال است: جسور، تیز و حس‌برانگیز بنویس، اما هرگز پورنوگرافیک یا با توصیف صریح اندام/عمل نباش؛ قدرتِ متن در کنایه و مکث است. رضایت و راحتی طرف مقابل همیشه مقدس است؛ اگر معلوم نیست طرف مقابل بزرگسالِ راضی است، محتاط‌تر و ملایم‌تر بنویس.\n" +
      "۱۰. هرگز محتوای عاشقانه یا بزرگسال درباره‌ی افراد زیر ۱۸ نساز؛ اگر برداشت شد موضوع نابالغ است، با مهربانی رد کن و سراغ موضوع نرو.\n";
  } else {
    s += "۸. محتوای بزرگسال/جنسی صریح تولید نکن؛ آشنا بودن و دلبری با ظرافت پیش برو.\n";
  }
  return s;
}

function buildAiMessages(user, b, images) {
  const styleId = TONES[b.style] ? b.style : "funny";
  let sys = bahamPrompt(user, styleId, b.mode, !!b.again);
  if (b.mode === "memory" && b.memory) {
    sys += "\n\nزمینه‌ی خاطرات و روزهای ثبت‌شده‌ی کاربر (فقط از همین استفاده کن؛ چیزی نساز):\n" + String(b.memory).slice(0, 8000);
  }
  const text = String(b.text || "").slice(0, 6000).trim();
  const content = (text || "این تصویر را ببین.") + (b.again ? "\n(این بار گزینه‌های تازه و متفاوت از قبلی بده.)" : "");
  const hist = [];
  for (const m of (b.msgs || []).slice(-12)) {
    if (!m || typeof m !== "object") continue;
    const role = m.role === "assistant" ? "assistant" : "user";
    const c = String(m.content || "").slice(0, 3000);
    if (!c.trim()) continue;
    hist.push({ role, content: c });
  }
  let userMsg;
  if (images && images.length) {
    const parts = [{ type: "text", text: content }];
    for (const im of images.slice(0, 2)) parts.push({ type: "image_url", image_url: { url: im } });
    userMsg = { role: "user", content: parts };
  } else {
    userMsg = { role: "user", content };
  }
  const out = [{ role: "system", content: sys }];
  const brain = String(b.brain || "").slice(0, 600).trim();
  if (brain) {
    out.push({ role: "system", content: "حافظه‌ی رابطه (کاربر با اجازه‌ی خودش فرستاده؛ فقط برای شخصی‌سازی پاسخ استفاده کن و اگر مرتبط نیست نادیده‌اش بگیر؛ داده‌های سلامت هرگز در آن نیست):\n" + brain });
  }
  return out.concat(hist).concat([userMsg]);
}

async function callAi(user, messages, maxTokens, stream) {
  const ai = user.ai || {};
  const key = ai.key || "";
  if (!key) return { err: json({ ok: false, error: "no_key", message: "کلید API هوش مصنوعی را در تنظیمات وارد کنید" }, 400) };
  const base = ((ai.base && String(ai.base).trim()) || "https://api.openai.com/v1").replace(/\/+$/, "");
  if (!/^https?:\/\//.test(base)) return { err: json({ ok: false, error: "bad_base", message: "این آدرس API یه چیزیش هست" }, 400) };
  const model = String(ai.model || "gpt-4o-mini").slice(0, 60);
  const headers = { "content-type": "application/json", authorization: "Bearer " + key };
  if (/openrouter\.ai/.test(base)) headers["X-Title"] = "Baham";
  let ctrl;
  try { ctrl = new AbortController(); } catch { ctrl = null; }
  const timer = ctrl && setTimeout(() => { try { ctrl.abort(); } catch {} }, 45000);
  let res;
  try {
    res = await fetch(base + "/chat/completions", {
      method: "POST",
      headers,
      body: JSON.stringify(Object.assign({ model, messages, max_tokens: maxTokens || 900, temperature: 0.85 }, stream ? { stream: true } : {})),
      signal: ctrl ? ctrl.signal : undefined,
    });
  } catch (e) {
    if (timer) clearTimeout(timer);
    return { err: json({ ok: false, error: "ai_unreachable", message: "به هوش مصنوعی دست نیافتیم؛ آدرس یا کلید رو یه چک بکن" }, 502) };
  }
  if (timer) clearTimeout(timer);
  if (!res.ok) {
    let msg = "خطای سرویس هوش مصنوعی";
    if (res.status === 401) msg = "کلید API نامعتبر است";
    else if (res.status === 429) msg = "محدودیت/سهمیه‌ی حساب شما پر شده است";
    else if (res.status === 404) msg = "مدل یا آدرس پیدا نشد";
    return { err: json({ ok: false, error: "ai_error", status: res.status, message: msg }, res.status === 401 ? 401 : 502) };
  }
  if (stream) return { res };
  let data = null;
  try { data = await res.json(); } catch {}
  const text = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (!text) return { err: json({ ok: false, error: "ai_empty", message: "پاسخی دریافت نشد؛ دوباره تلاش کنید" }, 502) };
  return { text: String(text).slice(0, 8000) };
}

/* ============================ تاریخچه ============================ */

async function getHist(env, uid) {
  try {
    const raw = await env.CONFIG.get("hist:" + uid);
    return raw ? JSON.parse(raw) : { chats: [], invites: [] };
  } catch { return { chats: [], invites: [] }; }
}
async function putHist(env, uid, h) {
  h.chats = (h.chats || []).slice(0, 80);
  h.invites = (h.invites || []).slice(0, 80);
  await env.CONFIG.put("hist:" + uid, JSON.stringify(h));
}

/* ---------- دعوت‌نامه‌های شخصی (حساب‌محور) ---------- */
async function getInvite(env, slug) {
  try { return JSON.parse((await env.CONFIG.get("inv:" + slug)) || "null"); } catch { return null; }
}
async function putInvite(env, inv) {
  await env.CONFIG.put("inv:" + inv.id, JSON.stringify(inv));
}
async function getInvIdx(env, uid) {
  try { return JSON.parse((await env.CONFIG.get("invidx:" + uid)) || "[]"); } catch { return []; }
}
async function putInvIdx(env, uid, list) {
  await env.CONFIG.put("invidx:" + uid, JSON.stringify(list.slice(0, 20)));
}
/* ---------- کشف/کرش‌یابی (opt-in) ---------- */
async function getDisc(env, uid) {
  try { return JSON.parse((await env.CONFIG.get("disc:" + uid)) || "null"); } catch { return null; }
}
async function getDiscIdx(env) {
  try { return JSON.parse((await env.CONFIG.get("discidx") || "null")) || []; } catch { return []; }
}
async function putDiscIdx(env, arr) {
  await env.CONFIG.put("discidx", JSON.stringify(arr.slice(0, 500)));
}
async function getLikes(env, uid) {
  try { return JSON.parse((await env.CONFIG.get("dlike:" + uid)) || "null") || {}; } catch { return {}; }
}
async function getDStats(env, uid) {
  try { return JSON.parse((await env.CONFIG.get("dstats:" + uid)) || "null") || { v: 0 }; } catch { return { v: 0 }; }
}
async function getBlocks(env, uid) {
  try { return JSON.parse((await env.CONFIG.get("dblock:" + uid)) || "null") || {}; } catch { return {}; }
}
async function getRoomIdx(env, uid) {
  try { return JSON.parse((await env.CONFIG.get("rooms:" + uid)) || "null") || []; } catch { return []; }
}
async function getRoom(env, id) {
  try { return JSON.parse((await env.CONFIG.get("room:" + id)) || "null"); } catch { return null; }
}
function kmBetween(a, b) {
  if (!a || !b || !isFinite(a.lat) || !isFinite(b.lat)) return -1;
  if ((a.lat === 0 && a.lng === 0) || (b.lat === 0 && b.lng === 0)) return -1; // بدون موقعیت
  const R = 6371, dLa = (b.lat - a.lat) * Math.PI / 180, dLo = (b.lng - a.lng) * Math.PI / 180;
  const x = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLo / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)));
}
const isAdultBy = (by) => { const y = new Date().getFullYear(); return by && y - by >= 18 && y - by < 100; };

const INV_THEMES = new Set(["romantic", "violet", "wine", "candy", "sunset", "mint"]);
const INV_OCCS = new Set(["love", "marriage", "friendship", "business"]);
function invPublic(inv) {
  return { name: inv.name, theme: inv.theme, occasion: inv.occasion, music: inv.music, qText: inv.qText || "", letter: inv.letter || "", tg: inv.tg || "" };
}
function invText(v, n) {
  return String(v || "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, n || 140);
}

/* ---------- فضای ما (v8): سینک زوج + چت ---------- */
const SPACE_LISTS = { memories: 200, events: 300, notes: 200, wishlist: 200, bucket: 200, letters: 200, songs: 200, expenses: 300, games: 100, dares: 200, polls: 200, trips: 100, spins: 100, capsules: 100, chains: 50, quests: 20, arts: 200, casts: 20, pins: 200, banks: 50, movies: 200, recipes: 100, dreams: 200, shots: 100, ballots: 24, counts: 50, laws: 100 };
function spaceText(v, n) {
  return String(v === null || v === undefined ? "" : v).replace(/[<>]/g, "").trim().slice(0, n || 500);
}
async function spacePair(env, uid) {
  try {
    const pid = await env.CONFIG.get("uspair:" + uid);
    if (!pid || !/^[a-f0-9]{4,32}$/.test(pid)) return null;
    const pair = await pairGet(env, "pair:" + pid);
    if (!pair || (pair.a !== uid && pair.b !== uid)) return null;
    const otherId = pair.a === uid ? pair.b : pair.a;
    return { pid, otherId };
  } catch { return null; }
}
async function spaceGetDoc(env, pid) {
  try { return JSON.parse((await env.CONFIG.get("space:" + pid)) || "null") || {}; } catch { return {}; }
}
function spaceTrimDoc(doc) {
  // اگر داک خیلی بزرگ شد، اول عکس‌های قدیمی‌ترین خاطرات را از سینک حذف کن
  try {
    let s = JSON.stringify(doc);
    if (s.length <= 1800000) return doc;
    const mems = ((doc && doc.memories) || []).slice().sort((a, b) => (a.u || 0) - (b.u || 0));
    for (const m of mems) {
      if (!m.photos || !m.photos.length) continue;
      m.photos = [];
      s = JSON.stringify(doc);
      if (s.length <= 1800000) break;
    }
    return doc;
  } catch { return doc; }
}
async function spacePutDoc(env, pid, doc) {
  try { await env.CONFIG.put("space:" + pid, JSON.stringify(spaceTrimDoc(doc))); } catch {}
}
function spaceCleanItem(c, it) {
  if (!it || typeof it !== "object") return null;
  const id = String(it.id || "").slice(0, 40);
  if (!/^[A-Za-z0-9_-]{2,40}$/.test(id)) return null;
  const u = Math.min(Date.now(), Math.max(0, Number(it.u) || 0));
  const ts = Math.min(Date.now(), Math.max(0, Number(it.ts) || 0));
  const base = { id, u, ts };
  const T = (v, n) => spaceText(v, n);
  const by = String(it.by || "").slice(0, 40);
  if (c === "memories") return { ...base, title: T(it.title, 80), text: T(it.text, 2000), date: T(it.date, 10), mood: T(it.mood, 12), place: T(it.place, 60), tags: Array.isArray(it.tags) ? it.tags.slice(0, 8).map((t) => T(t, 24)) : [], photos: Array.isArray(it.photos) ? it.photos.filter((p) => typeof p === "string" && p.indexOf("data:image/") === 0 && p.length < 420000).slice(0, 6) : [] };
  if (c === "events") return { ...base, title: T(it.title, 80), date: T(it.date, 10), time: T(it.time, 5), kind: T(it.kind, 12), note: T(it.note, 500), recur: ["none", "daily", "weekly", "monthly", "yearly"].includes(it.recur) ? it.recur : "none" };
  if (c === "notes") return { ...base, title: T(it.title, 80), body: T(it.body, 3000), kind: it.kind === "check" ? "check" : "text", items: Array.isArray(it.items) ? it.items.slice(0, 30).map((x) => ({ t: T(x && x.t, 120), done: !!(x && x.done) })) : [] };
  if (c === "wishlist") return { ...base, by, title: T(it.title, 100), link: T(it.link, 300), price: T(it.price, 40), note: T(it.note, 300), mine: it.mine !== false };
  if (c === "bucket") return { ...base, title: T(it.title, 120), done: !!it.done };
  if (c === "letters") {
    let voice = "", vdur = 0;
    if (typeof it.voice === "string" && it.voice) {
      vdur = Math.max(0, Math.min(90, Math.round(Number(it.vdur) || 0)));
      if (vdur > 0 && it.voice.length <= 450000 && /^data:audio\/(webm|mp4|ogg|mpeg|wav);base64,[A-Za-z0-9+/=]+$/.test(it.voice)) voice = it.voice;
    }
    return { ...base, by, to: T(it.to, 40), title: T(it.title, 80), body: T(it.body, 5000), openAt: Math.max(0, Math.min(4102444800000, Number(it.openAt) || 0)), mine: it.mine !== false, opened: !!it.opened, voice: voice || undefined, vdur: vdur || undefined };
  }
  if (c === "songs") return { ...base, title: T(it.title, 100), artist: T(it.artist, 80), link: T(it.link, 300), note: T(it.note, 200) };
  if (c === "expenses") return { ...base, by, mine: it.mine !== false, title: T(it.title, 80), amount: Math.max(0, Math.min(10000000000, Math.round(Number(it.amount) || 0))), kind: it.kind === "settle" ? "settle" : "exp", note: T(it.note, 200), date: T(it.date, 10) };
  if (c === "games") {
    const answers = {};
    if (it.answers && typeof it.answers === "object") {
      for (const [uid, an] of Object.entries(it.answers).slice(0, 4)) {
        if (!an || typeof an !== "object") continue;
        const rec = { ts: Math.min(Date.now(), Math.max(0, Number(an.ts) || 0)) };
        if (Array.isArray(an.picks)) rec.picks = an.picks.slice(0, 8).map((x) => Math.max(0, Math.min(3, Number(x) || 0)));
        if (an.pick === 0 || an.pick === 1 || an.pick === "0" || an.pick === "1") rec.pick = Number(an.pick);
        answers[String(uid).slice(0, 40)] = rec;
      }
    }
    if (it.kind === "yn") return { ...base, by, kind: "yn", title: T(it.title, 80), a: T(it.a, 80), b: T(it.b, 80), answers };
    const qs = Array.isArray(it.qs) ? it.qs.slice(0, 8).map((q) => ({ q: T(q && q.q, 200), opts: Array.isArray(q && q.opts) ? q.opts.slice(0, 4).map((o) => T(o, 80)) : [], a: Math.max(0, Math.min(3, Number((q && q.a) || 0))) })).filter((q) => q.q) : [];
    return { ...base, by, kind: "quiz", title: T(it.title, 80), qs, answers };
  }
  if (c === "movies") {
    const votes = {};
    if (it.votes && typeof it.votes === "object") {
      for (const [uid, v] of Object.entries(it.votes).slice(0, 4)) {
        if (v === "y" || v === "n") votes[String(uid).slice(0, 40)] = v;
      }
    }
    if (!T(it.title, 100)) return null;
    return { ...base, title: T(it.title, 100), kind: it.kind === "series" ? "series" : "film", votes, watched: !!it.watched, stars: Math.max(0, Math.min(5, Number(it.stars) || 0)) };
  }
  if (c === "recipes") {
    const steps = Array.isArray(it.steps) ? it.steps.slice(0, 20).map((s) => T(s, 200)).filter(Boolean) : [];
    if (!T(it.title, 80)) return null;
    return { ...base, by, title: T(it.title, 80), desc: T(it.desc, 300), mins: Math.max(0, Math.min(600, Math.floor(Number(it.mins) || 0))), steps, cooked: Math.max(0, Math.min(9999, Math.floor(Number(it.cooked) || 0))), last: Math.min(Date.now(), Math.max(0, Number(it.last) || 0)) };
  }
  if (c === "dreams") {
    if (!T(it.text, 1000)) return null;
    return { ...base, by, text: T(it.text, 1000), day: T(it.day, 10) };
  }
  if (c === "laws") {
    const signs = {};
    if (it.signs && typeof it.signs === "object") {
      for (const [uid, ts] of Object.entries(it.signs).slice(0, 4)) {
        const n = Math.min(Date.now(), Math.max(0, Number(ts) || 0));
        if (n) signs[String(uid).slice(0, 40)] = n;
      }
    }
    if (!T(it.text, 200)) return null;
    return { ...base, text: T(it.text, 200), signs };
  }
  if (c === "shots") {
    const entries = {};
    if (it.entries && typeof it.entries === "object") {
      for (const [uid, e] of Object.entries(it.entries).slice(0, 4)) {
        if (!e || typeof e.photo !== "string" || e.photo.indexOf("data:image/") !== 0 || e.photo.length >= 420000) continue;
        entries[String(uid).slice(0, 40)] = { photo: e.photo, ts: Math.min(Date.now(), Math.max(0, Number(e.ts) || 0)) };
      }
    }
    const votes = {};
    if (it.votes && typeof it.votes === "object") {
      for (const [uid, v] of Object.entries(it.votes).slice(0, 4)) votes[String(uid).slice(0, 40)] = String(v).slice(0, 40);
    }
    if (!T(it.week, 8)) return null;
    return { ...base, week: T(it.week, 8), theme: T(it.theme, 60), entries, votes };
  }
  if (c === "ballots") {
    const wishes = Array.isArray(it.wishes) ? it.wishes.slice(0, 20).map((w) => ({ id: T(w.id, 24), t: T(w.t, 120), by: String(w.by || "").slice(0, 40) })).filter((w) => w.id && w.t) : [];
    const votes = {};
    if (it.votes && typeof it.votes === "object") {
      for (const [uid, v] of Object.entries(it.votes).slice(0, 4)) votes[String(uid).slice(0, 40)] = String(v).slice(0, 24);
    }
    if (!T(it.month, 7)) return null;
    return { ...base, month: T(it.month, 7), wishes, votes, fulfilled: T(it.fulfilled, 24) };
  }
  if (c === "counts") {
    if (!T(it.title, 80) || !T(it.date, 10)) return null;
    return { ...base, title: T(it.title, 80), date: T(it.date, 10), emoji: T(it.emoji, 8) || "⏳" };
  }
  if (c === "casts") {
    const segs = Array.isArray(it.segs) ? it.segs.slice(-12).map((s) => {
      const au = (typeof s.audio === "string" && s.audio.length <= 450000 && /^data:audio\/(webm|mp4|ogg|mpeg|wav);base64,[A-Za-z0-9+/=]+$/.test(s.audio)) ? s.audio : "";
      return { by: String(s.by || "").slice(0, 40), ts: Math.min(Date.now(), Math.max(0, Number(s.ts) || 0)), dur: Math.max(0, Math.min(300, Number(s.dur) || 0)), audio: au };
    }).filter((s) => s.audio) : [];
    if (!T(it.title, 80)) return null;
    return { ...base, by, title: T(it.title, 80), segs };
  }
  if (c === "pins") {
    const lat = Number(it.lat), lon = Number(it.lon);
    if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
    if (!T(it.title, 80)) return null;
    return { ...base, by, title: T(it.title, 80), note: T(it.note, 300), lat, lon, day: T(it.day, 10) };
  }
  if (c === "banks") {
    const dep = Array.isArray(it.dep) ? it.dep.slice(-200).map((d) => ({ by: String(d.by || "").slice(0, 40), amt: Math.max(0, Math.min(1e9, Math.floor(Number(d.amt) || 0))), ts: Math.min(Date.now(), Math.max(0, Number(d.ts) || 0)) })).filter((d) => d.amt > 0) : [];
    if (!T(it.title, 80)) return null;
    return { ...base, by, title: T(it.title, 80), target: Math.max(1, Math.min(1e12, Math.floor(Number(it.target) || 0))) || 1000000, dep };
  }
  if (c === "chains") {
    const lines = Array.isArray(it.lines) ? it.lines.slice(-200).map((x) => ({ by: String(x.by || "").slice(0, 40), t: T(x.t, 200), ts: Math.min(Date.now(), Math.max(0, Number(x.ts) || 0)) })).filter((x) => x.t) : [];
    if (!T(it.title, 80)) return null;
    return { ...base, by, title: T(it.title, 80), lines };
  }
  if (c === "quests") {
    const done = {};
    if (it.done && typeof it.done === "object") {
      for (const [day, dd] of Object.entries(it.done).slice(0, 30)) {
        const di = Number(day);
        if (!Number.isInteger(di) || di < 0 || di > 29 || !dd || typeof dd !== "object") continue;
        const per = {};
        for (const [uid, ts] of Object.entries(dd).slice(0, 4)) {
          const n = Math.min(Date.now(), Math.max(0, Number(ts) || 0));
          if (n) per[String(uid).slice(0, 40)] = n;
        }
        done[di] = per;
      }
    }
    return { ...base, title: T(it.title, 80) || "چالش ۳۰ روزه", start: Math.min(Date.now(), Math.max(0, Number(it.start) || 0)), done };
  }
  if (c === "arts") {
    const px = String(it.px || "");
    if (!/^[0-7]{256}$/.test(px)) return null;
    return { ...base, by, day: T(it.day, 10), px };
  }
  if (c === "spins") {
    const opts = Array.isArray(it.opts) ? it.opts.slice(0, 8).map((o) => T(o, 60)).filter(Boolean) : [];
    if (opts.length < 2) return null;
    return { ...base, title: T(it.title, 80) || "؟", opts, win: Math.max(0, Math.min(opts.length - 1, Number(it.win) || 0)) };
  }
  if (c === "capsules") {
    if (!T(it.body, 2000)) return null;
    return { ...base, by, title: T(it.title, 80) || "کپسول زمان", body: T(it.body, 2000), openAt: Math.min(4102444800000, Math.max(0, Number(it.openAt) || 0)) };
  }
  if (c === "trips") {
    const items = Array.isArray(it.items) ? it.items.slice(0, 60).map((x) => {
      const done = {};
      if (x && x.done && typeof x.done === "object") {
        for (const [uid, ts] of Object.entries(x.done).slice(0, 4)) {
          const n = Math.min(Date.now(), Math.max(0, Number(ts) || 0));
          if (n) done[String(uid).slice(0, 40)] = n;
        }
      }
      return { id: T(x && x.id, 24), t: T(x && x.t, 100), done };
    }).filter((x) => x.id && x.t) : [];
    if (!T(it.title, 80)) return null;
    return { ...base, by, title: T(it.title, 80), dest: T(it.dest, 60), date: T(it.date, 10), items };
  }
  if (c === "dares") {
    const done = {};
    if (it.done && typeof it.done === "object") {
      for (const [uid, ts] of Object.entries(it.done).slice(0, 4)) {
        const n = Math.min(Date.now(), Math.max(0, Number(ts) || 0));
        if (n) done[String(uid).slice(0, 40)] = n;
      }
    }
    return { ...base, by, t: T(it.t, 120), e: T(it.e, 8), done };
  }
  if (c === "polls") {
    const opts = Array.isArray(it.opts) ? it.opts.slice(0, 4).map((o) => T(o, 80)).filter(Boolean) : [];
    const votes = {};
    if (it.votes && typeof it.votes === "object") {
      for (const [uid, v] of Object.entries(it.votes).slice(0, 4)) {
        if (!v || typeof v !== "object") continue;
        const pick = Math.max(0, Math.min(3, Number(v.pick ?? 0)));
        if (pick < opts.length) votes[String(uid).slice(0, 40)] = { pick, ts: Math.min(Date.now(), Math.max(0, Number(v.ts) || 0)) };
      }
    }
    if (!T(it.q, 200) || opts.length < 2) return null;
    return { ...base, by, q: T(it.q, 200), opts, votes, closed: !!it.closed };
  }
  return null;
}
function spaceMergeList(cur, inc, cap, col) {
  const map = new Map();
  for (const it of (cur || [])) if (it && it.id) map.set(it.id, it);
  for (const it of (inc || [])) {
    if (!it || !it.id) continue;
    const old = map.get(it.id);
    if (!old || (it.u || 0) >= (old.u || 0)) {
      // بازی/چالش: جواب‌های هر دو طرف union می‌شن
      const UF = col === "games" ? "answers" : col === "dares" ? "done" : col === "polls" ? "votes" : col === "movies" ? "votes" : col === "laws" ? "signs" : null;
      if (UF && old && it[UF]) {
        const au = { ...(it[UF] || {}) };
        for (const [uid, an] of Object.entries(old[UF] || {})) {
          const has = au[uid];
          const ats = an && typeof an === "object" ? (an.ts || 0) : (Number(an) || 0);
          const hts = has && typeof has === "object" ? (has.ts || 0) : (Number(has) || 0);
          if (an && (!has || ats > hts)) au[uid] = an;
        }
        map.set(it.id, { ...it, [UF]: au });
      } else if (col === "shots" && old) {
        map.set(it.id, { ...it, entries: { ...(old.entries || {}), ...(it.entries || {}) }, votes: { ...(old.votes || {}), ...(it.votes || {}) } });
      } else if (col === "ballots" && old) {
        const wmap = new Map();
        for (const x of (old.wishes || [])) if (x && x.id) wmap.set(x.id, x);
        for (const x of (it.wishes || [])) if (x && x.id && !wmap.has(x.id)) wmap.set(x.id, x);
        map.set(it.id, { ...it, wishes: [...wmap.values()].slice(0, 20), votes: { ...(old.votes || {}), ...(it.votes || {}) } });
      } else if (col === "casts" && old && Array.isArray(it.segs)) {
        const seen = new Set((old.segs || []).map((x) => (x.by || "") + ":" + (x.ts || 0)));
        const merged = (old.segs || []).slice();
        for (const x of (it.segs || [])) {
          if (!x || !x.audio) continue;
          const sig = (x.by || "") + ":" + (x.ts || 0);
          if (!seen.has(sig)) { seen.add(sig); merged.push(x); }
        }
        merged.sort((a, b) => (a.ts || 0) - (b.ts || 0));
        map.set(it.id, { ...it, segs: merged.slice(-12) });
      } else if (col === "banks" && old && Array.isArray(it.dep)) {
        const seen = new Set((old.dep || []).map((x) => (x.by || "") + ":" + (x.ts || 0) + ":" + (x.amt || 0)));
        const merged = (old.dep || []).slice();
        for (const x of (it.dep || [])) {
          if (!x || !(Number(x.amt) > 0)) continue;
          const sig = (x.by || "") + ":" + (x.ts || 0) + ":" + (x.amt || 0);
          if (!seen.has(sig)) { seen.add(sig); merged.push(x); }
        }
        merged.sort((a, b) => (a.ts || 0) - (b.ts || 0));
        map.set(it.id, { ...it, dep: merged.slice(-200) });
      } else if (col === "chains" && old && Array.isArray(it.lines)) {
        const seen = new Set((old.lines || []).map((x) => (x.by || "") + ":" + (x.ts || 0)));
        const merged = (old.lines || []).slice();
        for (const x of (it.lines || [])) {
          if (!x || !x.t) continue;
          const sig = (x.by || "") + ":" + (x.ts || 0);
          if (!seen.has(sig)) { seen.add(sig); merged.push(x); }
        }
        merged.sort((a, b) => (a.ts || 0) - (b.ts || 0));
        map.set(it.id, { ...it, lines: merged.slice(-200) });
      } else if (col === "quests" && old && it.done) {
        const dn = { ...(old.done || {}) };
        for (const [day, dd] of Object.entries(it.done || {})) {
          dn[day] = { ...(dn[day] || {}), ...(dd || {}) };
        }
        map.set(it.id, { ...it, done: dn });
      } else if (col === "trips" && old && Array.isArray(it.items)) {
        const imap = new Map();
        for (const x of (old.items || [])) if (x && x.id) imap.set(x.id, x);
        for (const x of (it.items || [])) {
          if (!x || !x.id) continue;
          const o = imap.get(x.id);
          if (o) imap.set(x.id, { ...x, done: { ...(o.done || {}), ...(x.done || {}) } });
          else imap.set(x.id, x);
        }
        map.set(it.id, { ...it, items: [...imap.values()].slice(0, 60) });
      } else if (col === "memories" && old && Array.isArray(old.photos) && old.photos.length) {
        const seen = new Set((it.photos || []).map((p) => p.length + ":" + p.slice(0, 48)));
        const merged = (it.photos || []).slice();
        for (const p of old.photos) {
          if (merged.length >= 6) break;
          const sig = p.length + ":" + p.slice(0, 48);
          if (!seen.has(sig)) { seen.add(sig); merged.push(p); }
        }
        map.set(it.id, { ...it, photos: merged });
      } else {
        map.set(it.id, it);
      }
    }
  }
  const out = [...map.values()];
  out.sort((a, b) => (b.u || b.ts || 0) - (a.u || a.ts || 0));
  return out.slice(0, cap);
}
/* tombstoneها: حذف‌های منتشرشده */
function spaceApplyTombs(list, tombs) {
  if (!tombs || !list || !list.length) return list || [];
  return list.filter((it) => {
    const t = tombs[it.id];
    return !(t && t >= (it.u || 0));
  });
}
function spaceMergeTombs(a, b) {
  const out = { ...((a && typeof a === "object") ? a : {}) };
  if (b && typeof b === "object") {
    for (const [col, ids] of Object.entries(b)) {
      if (!ids || typeof ids !== "object") continue;
      out[col] = out[col] && typeof out[col] === "object" ? { ...out[col] } : {};
      for (const [id, ts] of Object.entries(ids).slice(0, 500)) {
        const n = Number(ts) || 0;
        if (n > (out[col][id] || 0)) out[col][id] = Math.min(n, Date.now());
      }
    }
  }
  return out;
}
async function spaceGetChat(env, pid) {
  try { return JSON.parse((await env.CONFIG.get("spacechat:" + pid)) || "null") || { msgs: [], typing: {} }; } catch { return { msgs: [], typing: {} }; }
}
async function spacePutChat(env, pid, c) {
  try {
    c.msgs = (c.msgs || []).slice(-300);
    // مدیا (ویس/ویدیو): فقط ۲۵ تای آخر نگه داشته می‌شن تا KV منفجر نشه
    let media = 0;
    const kept = [];
    for (let i = c.msgs.length - 1; i >= 0; i--) {
      const m = c.msgs[i];
      if (m && (m.voice || m.video)) { media++; if (media > 25) continue; }
      kept.unshift(m);
    }
    c.msgs = kept;
    await env.CONFIG.put("spacechat:" + pid, JSON.stringify(c));
  } catch {}
}
const isPlusUser = (user) => !!((user && user.plusUntil) && Number(user.plusUntil) > Date.now());

/* ============================ GET ============================ */

/* ================= وب‌پوش واقعی (v8.2): tickle بدون محتوا ================= */
function b64uEncode(bytes) {
  let s = "";
  const b = new Uint8Array(bytes);
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function b64uDecode(s) {
  s = String(s || "").replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
/* کلید VAPID: اولین بار خودکار ساخته و در KV نگه داشته می‌شه (خصوصی هرگز بیرون نمیاد) */
async function vapidGet(env) {
  let v = await pairGet(env, "push:vapid");
  if (v && v.pub && v.priv) return v;
  const kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const pubJwk = await crypto.subtle.exportKey("jwk", kp.publicKey);
  const privJwk = await crypto.subtle.exportKey("jwk", kp.privateKey);
  const pubRaw = new Uint8Array([4, ...b64uDecode(pubJwk.x), ...b64uDecode(pubJwk.y)]);
  v = { pub: b64uEncode(pubRaw.buffer), priv: privJwk };
  await pairPut(env, "push:vapid", v);
  return v;
}
async function vapidJWT(env, endpoint) {
  const v = await vapidGet(env);
  const aud = new URL(endpoint).origin;
  const head = b64uEncode(new TextEncoder().encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const pay = b64uEncode(new TextEncoder().encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 43200, sub: "https://baham.app" })));
  const key = await crypto.subtle.importKey("jwk", v.priv, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, new TextEncoder().encode(head + "." + pay));
  return "vapid t=" + head + "." + pay + "." + b64uEncode(sig) + ", k=" + v.pub;
}
/* ارسال tickle (بدون هیچ محتوایی) به یک اشتراک */
async function pushTickleTo(env, sub) {
  if (!sub || !sub.endpoint || !/^https:\/\//.test(String(sub.endpoint))) return "bad";
  try {
    const auth = await vapidJWT(env, sub.endpoint);
    const r = await fetch(sub.endpoint, { method: "POST", headers: { Authorization: auth, TTL: "120", Urgency: "normal" } });
    if (r.status === 404 || r.status === 410) return "gone";
    return r.ok ? "ok" : "err";
  } catch { return "err"; }
}
async function pushSubsGet(env, uid) {
  const l = await pairGet(env, "pushsub:" + uid);
  return Array.isArray(l) ? l : [];
}
/* خبر کردن پارتنر بعد از پیام چت */
async function pushTicklePeer(env, sp, myUid) {
  const peer = sp && sp.otherId;
  if (!peer || !env || !env.CONFIG) return;
  const subs = await pushSubsGet(env, peer);
  if (!subs.length) return;
  const keep = [];
  for (const s of subs) {
    const st = await pushTickleTo(env, s);
    if (st !== "gone" && st !== "bad") keep.push(s);
  }
  if (keep.length !== subs.length) await pairPut(env, "pushsub:" + peer, keep);
}

/* ================= اشتراک عمومی 🔗 (v9.1): لینک خاطره و کارت ما ================= */
const mkShareSlug = () => {
  const A = "abcdefghjkmnpqrstuvwxyz23456789";
  let s = "";
  const a = new Uint8Array(8);
  crypto.getRandomValues(a);
  for (const b of a) s += A[b % A.length];
  return s;
};

/* ================= باهم پلاس 💎 (v9): کد + زرین‌پال ================= */
const PLUS_ALPH = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const mkPlusCode = () => {
  let s = "";
  const a = new Uint8Array(8);
  crypto.getRandomValues(a);
  for (const b of a) s += PLUS_ALPH[b % PLUS_ALPH.length];
  return "BHAM-" + s.slice(0, 4) + "-" + s.slice(4);
};
async function plusExtend(env, uid, months) {
  const user = await getUser(env, uid);
  if (!user) return 0;
  const m = Math.max(1, Math.min(24, Number(months) || 1));
  const until = Math.max(Date.now(), Number(user.plusUntil) || 0) + m * 30 * 86400000;
  user.plusUntil = until;
  try { await env.CONFIG.put("user:" + user.id, JSON.stringify(user)); } catch {}
  return until;
}
async function plusSettings(env) {
  const s = await pairGet(env, "plus:settings");
  return {
    merchant: (s && s.merchant) || "",
    price1: Math.max(0, Number((s && s.price1) || 0)),
    price12: Math.max(0, Number((s && s.price12) || 0)),
    sandbox: !!((s && s.sandbox)),
  };
}

/* ================= تماس صوتی/تصویری (v9): سیگنالینگ WebRTC ================= */
const callFresh = (call) => {
  if (!call || typeof call !== "object") return false;
  const age = Date.now() - (Number(call.ts) || 0);
  if (call.state === "ringing") return age < 75000;
  if (call.state === "active") return age < 3 * 3600000;
  if (call.state === "ended") return age < 25000;
  return false;
};
/* خلاصه برای چت/نظرسنجی سبک */
async function callSummary(env, sp) {
  const call = await pairGet(env, "call:" + sp.pid);
  if (!callFresh(call) || (call.state !== "ringing" && call.state !== "active")) return null;
  return { state: call.state, from: call.from, type: call.type, ts: call.ts };
}
/* نمای کامل سیگنالینگ برای یک طرف */
async function callView(env, sp, myUid) {
  const call = await pairGet(env, "call:" + sp.pid);
  if (!callFresh(call)) return null;
  const v = { state: call.state, type: call.type, from: call.from, ts: call.ts, mine: call.from === myUid };
  if (call.from !== myUid && call.state === "ringing" && call.offer) v.offer = call.offer;
  if (call.from === myUid && call.answer) v.answer = call.answer;
  const pc = (call.cand && call.cand[sp.otherId]) || [];
  if (pc.length) v.cand = pc.slice(-40);
  return v;
}
const cleanSdp = (o) => {
  if (!o || typeof o !== "object") return null;
  const sdp = String(o.sdp || "");
  const type = String(o.type || "");
  if (!sdp || sdp.length > 12000 || (type !== "offer" && type !== "answer")) return null;
  return { type, sdp: sdp.slice(0, 12000) };
};
const cleanCand = (c) => {
  if (!c) return null;
  if (typeof c === "string") return c.length <= 2000 ? c : null;
  if (typeof c === "object") {
    const s = JSON.stringify(c);
    if (s.length > 2000) return null;
    return { candidate: String(c.candidate || ""), sdpMid: String(c.sdpMid || c.sdpMLineIndex || ""), sdpMLineIndex: Number(c.sdpMLineIndex) || 0 };
  }
  return null;
};

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const seg = url.pathname.replace(/^\/api\/?/, "").split("/");

  if (seg[0] === "health") {
    return json({ ok: true, kv: !!(env && env.CONFIG), stats: !!(env && env.STATS), authEnv: !!(env && env.ADMIN_PASSWORD) });
  }

  /* ---------- دعوت‌نامه‌ی شخصی: کانفیگ عمومی ---------- */
  if (seg[0] === "i" && seg[1] && env && env.CONFIG) {
    const slug = String(seg[1]);
    if (!/^[a-z0-9-]{4,20}$/.test(slug)) return json({ ok: false, error: "bad_slug" }, 400);
    const inv = await getInvite(env, slug);
    if (!inv) return json({ ok: false, error: "not_found" }, 404);
    if (seg[2] === "msgs") {
      return json({ ok: true, msgs: (inv.msgs || []).slice(0, 30).map((m) => ({ id: m.id, ts: m.ts, text: m.text, reply: m.reply || "", tsReply: m.tsReply || 0 })) });
    }
    return json({ ok: true, invite: invPublic(inv) });
  }

  /* ---------- اشتراک عمومی: خواندن (بدون لاگین) ---------- */
  if (seg[0] === "share" && seg[1]) {
    const slug = String(seg[1]).slice(0, 16);
    if (!/^[a-z0-9]{8}$/.test(slug)) return json({ ok: false, error: "bad_slug" }, 400);
    if (!env || !env.CONFIG) return json({ ok: false, error: "no_kv" }, 501);
    if (rateLimited(request, "shareget", 120)) return json({ ok: false, error: "rate_limited" }, 429);
    const sh = await pairGet(env, "share:" + slug);
    if (!sh) return json({ ok: false, error: "not_found" }, 404);
    return json({ ok: true, share: { kind: sh.kind, data: sh.data, ts: sh.ts } });
  }

  /* ---------- پلاس: وضعیت ---------- */
  if (seg[0] === "plus" && !seg[1]) {
    const u = await requireUser(request, env);
    if (u.err) return u.err;
    return json({ ok: true, plus: isPlusUser(u.user), until: Number(u.user.plusUntil) || 0 });
  }
  /* ---------- پلاس: ادمین (کدها + تنظیمات درگاه) ---------- */
  if (seg[0] === "plus" && seg[1] === "admin") {
    if (rateLimited(request, "plusadm", 30)) return json({ ok: false, error: "rate_limited" }, 429);
    const cfg = await currentConfig(env);
    if (!isAuthed(request, env, cfg)) return json({ ok: false, error: "unauthorized" }, 401);
    if (!env || !env.CONFIG) return json({ ok: false, error: "no_kv" }, 501);
    if (request.method === "GET") {
      const s = await plusSettings(env);
      let codes = [];
      try {
        const idx = await pairGet(env, "plus:idx");
        codes = Array.isArray(idx) ? idx.slice(0, 100) : [];
      } catch {}
      return json({ ok: true, settings: { hasMerchant: !!s.merchant, price1: s.price1, price12: s.price12, sandbox: s.sandbox }, codes });
    }
    return json({ ok: false, error: "bad_method" }, 405);
  }

  /* ---------- تماس: وضعیت سیگنالینگ ---------- */
  if (seg[0] === "call") {
    const u = await requireUser(request, env);
    if (u.err) return u.err;
    if (!env || !env.CONFIG) return json({ ok: false, error: "no_kv" }, 501);
    const sp = await spacePair(env, u.user.id);
    if (!sp) return json({ ok: true, call: null });
    if (rateLimited(request, "callget", 300)) return json({ ok: false, error: "rate_limited" }, 429);
    return json({ ok: true, call: await callView(env, sp, u.user.id) });
  }

  /* ---------- وب‌پوش: کلید عمومی VAPID ---------- */
  if (seg[0] === "push" && seg[1] === "key") {
    const u = await requireUser(request, env);
    if (u.err) return u.err;
    if (!env || !env.CONFIG) return json({ ok: false, error: "no_kv" }, 501);
    const v = await vapidGet(env);
    return json({ ok: true, key: v.pub });
  }

  /* ---------- حالت پارتنر: وضعیت ارتباط ---------- */
  if (seg[0] === "partner") {
    const u = await requireUser(request, env);
    if (u.err) return u.err;
    return json({ ok: true, ...(await partnerFullState(env, u.user.id)) });
  }

  /* ---------- فضای ما (v8): سینک زوج + چت ---------- */
  if (seg[0] === "space") {
    const u = await requireUser(request, env);
    if (u.err) return u.err;
    if (!env || !env.CONFIG) return json({ ok: false, error: "no_kv" }, 501);
    const sp = await spacePair(env, u.user.id);
    if (!sp) return json({ ok: true, paired: false });
    const other = await getUser(env, sp.otherId);
    const partnerName = (other && ((other.profile && other.profile.name) || other.username)) || "پارتنر";
    if (url.searchParams.get("chat") === "1") {
      const c = await spaceGetChat(env, sp.pid);
      const since = Number(url.searchParams.get("since") || 0) || 0;
      const peerTyping = ((c.typing && c.typing[sp.otherId]) || 0) > Date.now() - 9000;
      // لوکیشن زنده: منقضی‌ها را هرس کن
      let peerLive = null;
      if (c.live && typeof c.live === "object") {
        let dirty = false;
        for (const [id, L] of Object.entries(c.live)) {
          if (!L || !isFinite(L.lat) || !isFinite(L.lng) || (L.until || 0) < Date.now()) { delete c.live[id]; dirty = true; continue; }
          if (id === sp.otherId) peerLive = L;
        }
        if (dirty) await spacePutChat(env, sp.pid, c);
      }
      const callSum = await callSummary(env, sp);
      return json({ ok: true, paired: true, partner: partnerName, me: u.user.id, peer: sp.otherId, peerTyping, peerLive, call: callSum, msgs: (c.msgs || []).filter((m) => m.ts > since).slice(-60) });
    }
    const doc = await spaceGetDoc(env, sp.pid);
    return json({ ok: true, paired: true, partner: partnerName, me: u.user.id, peer: sp.otherId, doc });
  }

  /* ---------- کشف: کارت من + کاندیدها + چت‌ها ---------- */
  if (seg[0] === "discover") {
    const u = await requireUser(request, env);
    if (u.err) return u.err;
    if (!(u.user.profile && u.user.profile.adult)) return json({ ok: false, error: "adult_only", message: "کشف فقط برای بزرگسداده؛ اول سنت رو تأیید کن" }, 403);

    /* جستجوی مستقیم با یوزرنیم */
    if (seg[1] === "find") {
      const un = String(url.searchParams.get("u") || "").toLowerCase().replace(/^@/, "").trim();
      if (!/^[a-z0-9_]{3,24}$/.test(un)) return json({ ok: true, found: false, message: "یوزرنیم درست نیست" });
      const uid = await env.CONFIG.get("useridx:" + un);
      if (!uid) return json({ ok: true, found: false });
      const c = await getDisc(env, uid);
      if (!c || c.ghost || !isAdultBy(c.by)) return json({ ok: true, found: false });
      const theirBlocks = await getBlocks(env, uid);
      if (theirBlocks[u.user.id]) return json({ ok: true, found: false });
      const myInterests0 = (u.user.profile && Array.isArray(u.user.profile.interests) && u.user.profile.interests) || [];
      const now0 = Date.now();
      return json({ ok: true, found: true, cand: { uid, name: c.name || c.username, age: new Date().getFullYear() - c.by, city: c.city, bio: c.bio || "", km: -1, g: c.g || "x", img: c.img || "", status: (c.st && now0 - c.st < 864e5 && c.status) || "", shared: (c.interests || []).filter((x) => myInterests0.includes(x)).length } });
    }

    const me = await getDisc(env, u.user.id);
    const myLikes = await getLikes(env, u.user.id);
    const myBlocks = await getBlocks(env, u.user.id);
    const myInterests = (u.user.profile && Array.isArray(u.user.profile.interests) && u.user.profile.interests) || [];
    const f = (me && me.f) || {};
    const idx = await getDiscIdx(env);
    const now = Date.now();
    const cands = [];
    let likesGot = 0;
    for (const uid of idx.slice(0, 60)) {
      if (uid === u.user.id) continue;
      if (myBlocks[uid]) continue;
      const c = await getDisc(env, uid);
      if (!c) continue;
      const theirLikes = await getLikes(env, uid);
      if (theirLikes[u.user.id] === 1) likesGot++;
      if (myLikes[uid]) continue;
      if (!isAdultBy(c.by)) continue;
      if (c.ghost) continue; // حالت نامرئی
      const theirBlocks = await getBlocks(env, uid);
      if (theirBlocks[u.user.id]) continue;
      const age = now && (new Date().getFullYear() - c.by);
      // فیلترها
      if (f.g && f.g !== "any" && (c.g || "x") !== f.g) continue;
      if (f.amin && age < f.amin) continue;
      if (f.amax && age > f.amax) continue;
      const km = kmBetween(me, c);
      if (f.km && (km < 0 || km > f.km)) continue;
      const shared = (c.interests || []).filter((x) => myInterests.includes(x)).length;
      cands.push({ uid, name: c.name || c.username, age, city: c.city, bio: c.bio || "", km, ts: c.ts, g: c.g || "x", img: c.img || "", status: (c.st && now - c.st < 864e5 && c.status) || "", shared });
    }
    cands.sort((x, y) => (x.km < 0 ? 999 : x.km) - (y.km < 0 ? 999 : y.km));
    // فانوس: بیشترین علاقه‌ی مشترک؛ وگرنه نزدیک‌ترین
    let fanous = null;
    const withShared = cands.filter((c) => c.shared > 0);
    if (withShared.length) fanous = withShared.sort((a, b) => b.shared - a.shared)[0];
    else if (cands.length) fanous = cands[0];
    const roomIdx = await getRoomIdx(env, u.user.id);
    const rooms = [];
    for (const rid of roomIdx) {
      const r = await getRoom(env, rid);
      if (!r) continue;
      const peerId = r.a === u.user.id ? r.b : r.a;
      const pc = await getDisc(env, peerId);
      const last = r.msgs && r.msgs.length ? r.msgs[r.msgs.length - 1] : null;
      rooms.push({ id: r.id, peer: (pc && pc.name) || "؟", img: (pc && pc.img) || "", last: last ? last.text.slice(0, 40) : "", ts: last ? last.ts : r.created });
    }
    rooms.sort((x, y) => (y.ts || 0) - (x.ts || 0));
    const myStats = await getDStats(env, u.user.id);
    return json({ ok: true, on: !!me, card: me ? { city: me.city, bio: me.bio || "", lat: me.lat || 0, lng: me.lng || 0, img: me.img || "", status: me.status || "", ghost: !!me.ghost, views: myStats.v || 0, f: me.f || {} } : null, candidates: cands.slice(0, 30), fanous, likesGot, rooms });
  }

  /* ---------- اتاق چت دونفره ---------- */
  if (seg[0] === "room" && seg[1]) {
    const u = await requireUser(request, env);
    if (u.err) return u.err;
    const r = await getRoom(env, String(seg[1]));
    if (!r || (r.a !== u.user.id && r.b !== u.user.id)) return json({ ok: false, error: "not_found" }, 404);
    const since = Number(url.searchParams.get("since") || 0) || 0;
    const peerId = r.a === u.user.id ? r.b : r.a;
    const pc = await getDisc(env, peerId);
    return json({ ok: true, peer: (pc && pc.name) || "؟", peerImg: (pc && pc.img) || "", game: r.game || null, msgs: (r.msgs || []).filter((m) => m.ts > since).slice(-60) });
  }

  /* ---------- دعوت‌نامه‌های من: لیست/جزئیات ---------- */
  if (seg[0] === "invites") {
    const u = await requireUser(request, env);
    if (u.err) return u.err;
    const oneId = url.searchParams.get("id") || "";
    if (oneId) {
      if (!/^[a-z0-9-]{4,20}$/.test(oneId)) return json({ ok: false, error: "bad_slug" }, 400);
      const inv = await getInvite(env, oneId);
      if (!inv || inv.uid !== u.user.id) return json({ ok: false, error: "not_found" }, 404);
      return json({ ok: true, invite: { id: inv.id, ...invPublic(inv), views: inv.views || 0, lastView: inv.lastView || 0, created: inv.created, msgsList: inv.msgs || [] } });
    }
    const idx = await getInvIdx(env, u.user.id);
    const out = [];
    for (const slug of idx) {
      const inv = await getInvite(env, slug);
      if (inv) out.push({ id: inv.id, name: inv.name, occasion: inv.occasion, theme: inv.theme, music: inv.music, qText: inv.qText || "", letter: inv.letter || "", views: inv.views || 0, lastView: inv.lastView || 0, msgs: (inv.msgs || []).length, unreplied: (inv.msgs || []).filter((m) => !m.reply).length, created: inv.created });
    }
    return json({ ok: true, invites: out });
  }

  /* ---------- گزارش‌های کشف: لیست (ادمین) ---------- */
  if (seg[0] === "reports") {
    const cfg = await currentConfig(env);
    if (!isAuthed(request, env, cfg)) return json({ ok: false, error: "unauthorized", message: "رمز ادمین لازمه" }, 401);
    const raw = (await env.CONFIG.get("dreports")) || "[]";
    let list = [];
    try { list = JSON.parse(raw) || []; } catch {}
    const out = [];
    for (const r of list.slice(0, 60)) {
      let tn = r.target, bn = r.by;
      try { const uo = JSON.parse((await env.CONFIG.get("user:" + r.target)) || "null"); if (uo && uo.username) tn = uo.username; } catch {}
      try { const uo = JSON.parse((await env.CONFIG.get("user:" + r.by)) || "null"); if (uo && uo.username) bn = uo.username; } catch {}
      out.push({ ts: r.ts, target: tn, by: bn });
    }
    return json({ ok: true, reports: out });
  }

  /* ---------- اتصال با اکانت (OpenRouter PKCE) ---------- */
  if (seg[0] === "oauth" && seg[1] === "openrouter") {
    if (!env || !env.CONFIG) return json({ ok: false, error: "no_kv" }, 501);

    // شروع: ساخت challenge و دادن لینک لاگین به کاربر لاگین‌کرده
    if (seg[2] === "start") {
      const u = await requireUser(request, env);
      if (u.err) return u.err;
      if (rateLimited(request, "oauth", 6)) return json({ ok: false, error: "rate_limited", message: "کمی صبر کنید و دوباره تلاش کنید" }, 429);
      const { verifier, challenge } = await pkcePair();
      const st = randHex(12);
      const origin = (url.searchParams.get("origin") || url.origin || "").replace(/\/+$/, "");
      if (!/^https?:\/\/[\w.\-:]+$/.test(origin)) return json({ ok: false, error: "bad_origin" }, 400);
      const callback = origin + "/api/oauth/openrouter/callback?st=" + st;
      try {
        await env.CONFIG.put("oa:" + st, JSON.stringify({ uid: u.user.id, verifier, ts: Date.now() }), { expirationTtl: 600 });
      } catch { return json({ ok: false, error: "kv_write_failed" }, 500); }
      const authUrl = "https://openrouter.ai/auth?callback_url=" + encodeURIComponent(callback) + "&code_challenge=" + challenge + "&code_challenge_method=S256";
      return json({ ok: true, url: authUrl });
    }

    // بازگشت: مبادله‌ی کد با کلید و اتصال حساب
    if (seg[2] === "callback") {
      const st = String(url.searchParams.get("st") || "");
      const code = String(url.searchParams.get("code") || "");
      const back = function (q) { return new Response(null, { status: 302, headers: { location: "/?" + q } }); };
      if (!/^[\w-]{1,64}$/.test(st) || !/^[\w-]{8,128}$/.test(code)) return back("connect=bad");
      let saved = null;
      try { saved = JSON.parse((await env.CONFIG.get("oa:" + st)) || "null"); } catch {}
      if (!saved || !saved.uid || !saved.verifier) return back("connect=expired");
      try { await env.CONFIG.delete("oa:" + st); } catch {}
      let key = "";
      try {
        const r = await fetch("https://openrouter.ai/api/v1/auth/keys", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ code, code_verifier: saved.verifier, code_challenge_method: "S256" }),
        });
        const d = await r.json().catch(() => null);
        key = (d && d.key) || "";
      } catch {}
      if (!/^sk-or-[\w-]{8,}$/.test(key)) return back("connect=failed");
      const user = await getUser(env, saved.uid);
      if (!user) return back("connect=expired");
      const ai = user.ai || {};
      ai.key = key;
      ai.base = "https://openrouter.ai/api/v1";
      if (!ai.model || ai.model === "gpt-4o-mini") ai.model = "openai/gpt-4o-mini";
      user.ai = ai;
      try { await putUser(env, user); } catch { return back("connect=failed"); }
      return back("connected=1");
    }

    return json({ ok: false, error: "not_found" }, 404);
  }

  if (seg[0] === "config") {
    const cfg = await currentConfig(env);
    const { stored } = await readStoredConfig(env);
    return json({ ok: true, stored, config: cfg });
  }

  if (seg[0] === "stats") {
    const cfg = await currentConfig(env);
    const key = url.searchParams.get("key") || "";
    if (!key || key !== adminPassword(env, cfg)) return json({ ok: false, error: "forbidden" }, 403);
    if (!env || !env.STATS) return json({ ok: false, error: "no_kv", hint: "binding STATS is not connected" }, 501);
    const out = { events: {}, last: {} };
    try {
      const listed = await env.STATS.list({ prefix: "stat:" });
      for (const k of listed.keys || []) {
        const parts = k.name.split(":");
        if (parts.length < 3) continue;
        const ev = parts[1];
        const who = parts.slice(2).join(":");
        const count = parseInt((await env.STATS.get(k.name)) || "0", 10);
        out.events[ev] = out.events[ev] || { total: 0, by: {} };
        out.events[ev].total += count;
        out.events[ev].by[who] = count;
      }
      for (const ev of ALLOWED_EVENTS) {
        const last = await env.STATS.get("last:" + ev);
        if (last) out.last[ev] = last;
      }
    } catch { return json({ ok: false, error: "kv_error" }, 500); }
    return json({ ok: true, stats: out });
  }

  if (seg[0] === "me") {
    const u = await requireUser(request, env);
    if (u.err) return u.err;
    return json({ ok: true, user: safeUser(u.user) });
  }

  if (seg[0] === "history") {
    const u = await requireUser(request, env);
    if (u.err) return u.err;
    const h = await getHist(env, u.user.id);
    return json({ ok: true, history: h });
  }

  return json({ ok: false, error: "not_found" }, 404);
}

/* ============================ PUT ============================ */

export async function onRequestPut(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const seg = url.pathname.replace(/^\/api\/?/, "").split("/");

  if (seg[0] === "config") {
    const cfg = await currentConfig(env);
    if (await authLocked(env && env.CONFIG)) return json({ ok: false, error: "locked", message: "تلاش زیاد؛ ۱۰ دقیقه صبر کن" }, 429);
    if (!isAuthed(request, env, cfg)) {
      await authFail(env && env.CONFIG);
      return json({ ok: false, error: "unauthorized", message: "رمز درست نیست" }, 401);
    }
    await authReset(env && env.CONFIG);
    if (!env || !env.CONFIG) return json({ ok: false, error: "no_kv", message: "KV با نام CONFIG وصل نشده" }, 501);
    const r = await readBody(request, 120 * 1024);
    if (r.err) return json({ ok: false, error: r.err }, r.err === "too_large" ? 413 : 400);
    const patch = r.body && r.body.config !== undefined ? r.body.config : r.body;
    const res = validatePatch(patch);
    if (res.err) return json({ ok: false, error: "invalid", message: res.err, path: res.path || "" }, 400);
    try { await env.CONFIG.put("config", JSON.stringify(res.ok)); } catch { return json({ ok: false, error: "kv_write_failed" }, 500); }
    return json({ ok: true, saved: true, config: mergeConfig(DEFAULT_CONFIG, res.ok) });
  }

    /* ---------- کشف: ذخیره‌ی کارت من ---------- */
  if (seg[0] === "discover") {
    const u = await requireUser(request, env);
    if (u.err) return u.err;
    if (!(u.user.profile && u.user.profile.adult)) return json({ ok: false, error: "adult_only", message: "کشف فقط برای بزرگسداده؛ اول سنت رو تأیید کن" }, 403);
    if (rateLimited(request, "discput", 30)) return json({ ok: false, error: "rate_limited" }, 429);
    const r = await readBody(request, 4096);
    if (r.err || !r.body) return json({ ok: false, error: r.err || "bad_json" }, 400);
    const b = r.body;
    const uid = u.user.id;
    const idx = await getDiscIdx(env);
    if (b.on === false) {
      try {
        await env.CONFIG.delete("disc:" + uid);
        await putDiscIdx(env, idx.filter((x) => x !== uid));
      } catch {}
      return json({ ok: true, on: false });
    }
    const city = invText(b.city, 40);
    if (!city) return json({ ok: false, error: "bad_city", message: "شهرت رو بنویس" }, 400);
    const lat = isFinite(Number(b.lat)) ? Math.round(Number(b.lat) * 100) / 100 : 0;
    const lng = isFinite(Number(b.lng)) ? Math.round(Number(b.lng) * 100) / 100 : 0;
    const prev = await getDisc(env, uid);
    let img = (prev && prev.img) || "";
    if (b.img !== undefined) {
      const t = String(b.img || "");
      img = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(t) && t.length <= 60000 ? t : "";
    }
    const status = invText(b.status, 140);
    const g = ["m", "f", "x"].includes(b.g) ? b.g : ((u.user.profile && u.user.profile.gender) || "x");
    const bf = b.f || {};
    const nAge = (v) => { const n = Number(v); return Number.isFinite(n) && n >= 18 ? Math.min(90, Math.round(n)) : 0; };
    const nKm = (v) => { const n = Number(v); return Number.isFinite(n) && n >= 1 ? Math.min(500, Math.round(n)) : 0; };
    const flt = { g: ["m", "f", "x", "any"].includes(bf.g) ? bf.g : "any", amin: nAge(bf.amin), amax: nAge(bf.amax), km: nKm(bf.km) };
    const card = { uid, username: u.user.username, name: (u.user.profile && u.user.profile.name) || u.user.username, by: u.user.profile.birthYear || 0, city, bio: invText(b.bio, 200), lat, lng, g, img, status, st: status ? Date.now() : (prev && prev.st) || 0, ghost: !!b.ghost, f: flt, interests: (u.user.profile && Array.isArray(u.user.profile.interests) && u.user.profile.interests) || [], ts: Date.now() };
    try {
      await env.CONFIG.put("disc:" + uid, JSON.stringify(card));
      if (!idx.includes(uid)) await putDiscIdx(env, [uid].concat(idx));
    } catch { return json({ ok: false, error: "kv_write_failed" }, 500); }
    return json({ ok: true, on: true });
  }

  /* ---------- دعوت‌نامه‌ی شخصی: ویرایش / جواب پیام ---------- */
  if (seg[0] === "invites") {
    const u = await requireUser(request, env);
    if (u.err) return u.err;
    const r = await readBody(request, 8192);
    if (r.err || !r.body) return json({ ok: false, error: r.err || "bad_json" }, 400);
    const iv = r.body.invite || {};
    if (!/^[a-z0-9-]{4,20}$/.test(String(iv.id || ""))) return json({ ok: false, error: "bad_slug" }, 400);
    const inv = await getInvite(env, iv.id);
    if (!inv || inv.uid !== u.user.id) return json({ ok: false, error: "not_found" }, 404);
    if (iv.replyTo !== undefined) {
      const m = (inv.msgs || []).find((x) => x.id === iv.replyTo);
      if (!m) return json({ ok: false, error: "bad_msg" }, 404);
      m.reply = invText(iv.reply, 300);
      m.tsReply = Date.now();
    } else {
      if (iv.name !== undefined) { const n = sanitizeName(String(iv.name)); if (n) inv.name = n; }
      if (iv.occasion !== undefined && INV_OCCS.has(iv.occasion)) inv.occasion = iv.occasion;
      if (iv.theme !== undefined && INV_THEMES.has(iv.theme)) inv.theme = iv.theme;
      if (iv.music !== undefined) inv.music = iv.music === "none" ? "none" : "";
      if (iv.tg !== undefined) inv.tg = /^[A-Za-z0-9_]{4,32}$/.test(String(iv.tg || "")) ? String(iv.tg) : "";
      if (iv.qText !== undefined) inv.qText = invText(iv.qText, 140);
      if (iv.letter !== undefined) inv.letter = invText(iv.letter, 400);
    }
    try { await putInvite(env, inv); } catch { return json({ ok: false, error: "kv_write_failed" }, 500); }
    return json({ ok: true, invite: { id: inv.id, ...invPublic(inv), views: inv.views || 0, lastView: inv.lastView || 0, msgs: (inv.msgs || []).length, unreplied: (inv.msgs || []).filter((m) => !m.reply).length, created: inv.created, msgsList: inv.msgs || [] } });
  }

if (seg[0] === "me") {
    const u = await requireUser(request, env);
    if (u.err) return u.err;
    const user = u.user;
    const r = await readBody(request, 64 * 1024);
    if (r.err) return json({ ok: false, error: r.err }, r.err === "too_large" ? 413 : 400);
    const b = r.body || {};
    {
      const p = user.profile || {};
      if (b.name !== undefined) { const n = sanitizeName(String(b.name)); p.name = n || p.name; }
      if (b.crush !== undefined) p.crush = sanitizeName(String(b.crush));
      if (b.crushes !== undefined) {
        if (!Array.isArray(b.crushes)) return json({ ok: false, error: "bad_crushes" }, 400);
        p.crushes = [...new Set(b.crushes.map((x) => sanitizeName(String(x))).filter(Boolean))].slice(0, 5);
      }
      if (b.gender !== undefined) p.gender = ["m", "f", "x"].includes(b.gender) ? b.gender : "x";
      if (b.style !== undefined && TONES[b.style]) p.style = b.style;
      if (b.onboarded !== undefined) p.onboarded = !!b.onboarded;
      if (b.birthYear !== undefined) {
        let y = parseInt(b.birthYear, 10);
        if (!Number.isFinite(y)) return json({ ok: false, error: "bad_year", message: "سال تولد رو درست بزن" }, 400);
        if (y >= 1200 && y <= 1500) y = y + 621;
        const nowY = new Date().getUTCFullYear();
        if (y < 1930 || y > nowY) return json({ ok: false, error: "bad_year", message: "سال تولد رو درست بزن" }, 400);
        if (nowY - y < 18) return json({ ok: false, error: "not_adult", message: "سن شما برای فعال‌سازی فضای بزرگسال کافی نیست" }, 403);
        p.birthYear = y;
        p.adult = true;
      }
      if (b.interests !== undefined) {
        if (!Array.isArray(b.interests)) return json({ ok: false, error: "bad_interests", message: "لیست علاقه‌مندی‌ها نامعتبر است" }, 400);
        p.interests = [...new Set(b.interests.map((x) => String(x).trim()).filter((x) => INTERESTS_OK.has(x)))].slice(0, 8);
      }
      user.profile = p;
    }
    if (b.profile) {
      const p = user.profile || {};
      if (b.profile.name !== undefined) p.name = sanitizeName(String(b.profile.name)) || p.name;
      if (b.profile.crush !== undefined) p.crush = sanitizeName(String(b.profile.crush));
      if (b.profile.gender !== undefined) p.gender = ["m", "f", "x"].includes(b.profile.gender) ? b.profile.gender : "x";
      if (b.profile.style !== undefined && TONES[b.profile.style]) p.style = b.profile.style;
      user.profile = p;
    }
    if (b.ai) {
      const ai = user.ai || {};
      if (b.ai.base !== undefined) {
        const base = String(b.ai.base || "").trim().slice(0, 120);
        if (base && !/^https?:\/\/[^\s"'<>]+$/.test(base)) return json({ ok: false, error: "bad_base", message: "آدرس API باید با http/https شروع شود" }, 400);
        ai.base = base;
      }
      if (b.ai.model !== undefined) ai.model = String(b.ai.model || "").replace(/[^\w.\-\/:]/g, "").slice(0, 60) || "gpt-4o-mini";
      if (b.ai.key !== undefined) {
        const key = String(b.ai.key || "").replace(/\s+/g, "").slice(0, 200);
        if (key && !/^sk-[\w\-]{8,}$|^(sk-)?ant-[\w\-]{8,}$|^[\w\-]{20,}$/.test(key)) return json({ ok: false, error: "bad_key", message: "این کلید که درست به نظر نمی‌رسه" }, 400);
        ai.key = key || "";
      }
      user.ai = ai;
    }
    if (b.name !== undefined) user.name = sanitizeName(String(b.name)) || user.name;
    try { await putUser(env, user); } catch { return json({ ok: false, error: "kv_write_failed" }, 500); }
    return json({ ok: true, user: safeUser(user) });
  }

  return json({ ok: false, error: "not_found" }, 404);
}

/* ============================ DELETE ============================ */

export async function onRequestDelete(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const seg = url.pathname.replace(/^\/api\/?/, "").split("/");

  /* ---------- قطع ارتباط پارتنر (v6.2) ---------- */
  if (seg[0] === "partner") {
    const u = await requireUser(request, env);
    if (u.err) return u.err;
    const pid = await env.CONFIG.get("uspair:" + u.user.id);
    if (pid) {
      const pair = await pairGet(env, "pair:" + pid);
      if (pair) {
        const otherId = pair.a === u.user.id ? pair.b : pair.a;
        await pairDel(env, "uspair:" + otherId);
        await pairDel(env, "pshare:" + otherId);
        await pairDel(env, "pconf:" + otherId);
      }
      await pairDel(env, "uspair:" + u.user.id);
      await pairDel(env, "pshare:" + u.user.id);
      await pairDel(env, "pconf:" + u.user.id);
      await pairDel(env, "pair:" + pid);
      // فضای ما: داک مشترک و چت زوج هم کامل پاک می‌شه
      await pairDel(env, "space:" + pid);
      await pairDel(env, "spacechat:" + pid);
      await pairDel(env, "call:" + pid);
    }
    return json({ ok: true });
  }

  if (seg[0] === "config") {
    const cfg = await currentConfig(env);
    if (await authLocked(env && env.CONFIG)) return json({ ok: false, error: "locked", message: "تلاش زیاد؛ ۱۰ دقیقه صبر کن" }, 429);
    if (!isAuthed(request, env, cfg)) {
      await authFail(env && env.CONFIG);
      return json({ ok: false, error: "unauthorized", message: "رمز درست نیست" }, 401);
    }
    await authReset(env && env.CONFIG);
    if (!env || !env.CONFIG) return json({ ok: false, error: "no_kv" }, 501);
    try { await env.CONFIG.delete("config"); } catch { return json({ ok: false, error: "kv_delete_failed" }, 500); }
    return json({ ok: true, reset: true, config: DEFAULT_CONFIG });
  }

  if (seg[0] === "history") {
    const u = await requireUser(request, env);
    if (u.err) return u.err;
    const id = url.searchParams.get("id") || "";
    const t = url.searchParams.get("t") === "invite" ? "invites" : "chats";
    if (!id || !/^[\w-]{1,60}$/.test(id)) return json({ ok: false, error: "bad_id" }, 400);
    const h = await getHist(env, u.user.id);
    h[t] = (h[t] || []).filter((x) => x && x.id !== id);
    try { await putHist(env, u.user.id, h); } catch { return json({ ok: false, error: "kv_write_failed" }, 500); }
    return json({ ok: true, history: h });
  }

  /* ---------- گزارش‌های کشف (ادمین) ---------- */
  if (seg[0] === "reports") {
    const cfg = await currentConfig(env);
    if (!isAuthed(request, env, cfg)) return json({ ok: false, error: "unauthorized", message: "رمز ادمین لازمه" }, 401);
    try {
      const reps = JSON.parse((await env.CONFIG.get("dreports")) || "[]");
      await env.CONFIG.put("dreports", "[]");
    } catch {}
    return json({ ok: true });
  }

  /* ---------- حذف دعوت‌نامه‌ی شخصی ---------- */
  if (seg[0] === "invites") {
    const u = await requireUser(request, env);
    if (u.err) return u.err;
    const id = url.searchParams.get("id") || "";
    if (!/^[a-z0-9-]{4,20}$/.test(id)) return json({ ok: false, error: "bad_slug" }, 400);
    const inv = await getInvite(env, id);
    if (!inv || inv.uid !== u.user.id) return json({ ok: false, error: "not_found" }, 404);
    try {
      await env.CONFIG.delete("inv:" + id);
      const idx = await getInvIdx(env, u.user.id);
      await putInvIdx(env, u.user.id, idx.filter((x) => x !== id));
    } catch { return json({ ok: false, error: "kv_delete_failed" }, 500); }
    return json({ ok: true });
  }

  /* ---------- حذف کامل حساب ---------- */
  if (seg[0] === "me") {
    const u = await requireUser(request, env);
    if (u.err) return u.err;
    try {
      await env.CONFIG.delete("user:" + u.user.id);
      await env.CONFIG.delete("useridx:" + u.user.username);
      await env.CONFIG.delete("hist:" + u.user.id);
    } catch { return json({ ok: false, error: "kv_delete_failed" }, 500); }
    return json({ ok: true, deleted: true });
  }

  return json({ ok: false, error: "not_found" }, 404);
}

/* ============================ POST ============================ */

export async function onRequestPost(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const seg = url.pathname.replace(/^\/api\/?/, "").split("/");

  /* ---------- حالت پارتنر (v6.2) ---------- */
  if (seg[0] === "partner" && seg[1] === "invite") {
    const u = await requireUser(request, env);
    if (u.err) return u.err;
    if (await env.CONFIG.get("uspair:" + u.user.id)) return json({ ok: false, error: "already_paired", message: "قبلاً وصل شدی؛ اول قطع کن" }, 409);
    const code = randHex(3);
    await pairPut(env, "pcode:" + code, { u: u.user.id, name: u.user.username, ts: Date.now() }, 7 * 86400);
    let base = "";
    try { base = new URL(request.url).origin; } catch {}
    return json({ ok: true, code, url: base + "/?pair=" + code });
  }
  if (seg[0] === "partner" && seg[1] === "accept") {
    const u = await requireUser(request, env);
    if (u.err) return u.err;
    const r = await readBody(request, 512);
    if (r.err) return json({ ok: false, error: "bad_json" }, 400);
    const code = String(r.body.code || "").toLowerCase().trim();
    if (!/^[a-f0-9]{4,16}$/.test(code)) return json({ ok: false, error: "bad_code", message: "کد درست نیست" }, 400);
    const pc = await pairGet(env, "pcode:" + code);
    if (!pc) return json({ ok: false, error: "not_found", message: "کد پیدا نشد یا منقضی شده" }, 404);
    if (pc.u === u.user.id) return json({ ok: false, error: "self", message: "این کد مال خودته؛ به پارتنرت بده" }, 400);
    if (await env.CONFIG.get("uspair:" + u.user.id)) return json({ ok: false, error: "already_paired", message: "تو قبلاً وصل شدی" }, 409);
    if (await env.CONFIG.get("uspair:" + pc.u)) return json({ ok: false, error: "owner_paired", message: "اون که کد رو ساخته قبلاً وصل شده" }, 409);
    const pid = randHex(4);
    await pairPut(env, "pair:" + pid, { a: pc.u, b: u.user.id, ts: Date.now() });
    await env.CONFIG.put("uspair:" + pc.u, pid);
    await env.CONFIG.put("uspair:" + u.user.id, pid);
    if (!(await pairGet(env, "pshare:" + pc.u))) await pairPut(env, "pshare:" + pc.u, { name: pc.name || "پارتنر", status: "", mood: "", cycle: "", ts: 0 });
    if (!(await pairGet(env, "pshare:" + u.user.id))) await pairPut(env, "pshare:" + u.user.id, { name: u.user.username || "پارتنر", status: "", mood: "", cycle: "", ts: 0 });
    await pairDel(env, "pcode:" + code);
    return json({ ok: true, paired: true, partner: { name: pc.name || "پارتنر" } });
  }
  if (seg[0] === "partner" && seg[1] === "share") {
    const u = await requireUser(request, env);
    if (u.err) return u.err;
    if (!(await env.CONFIG.get("uspair:" + u.user.id))) return json({ ok: false, error: "not_paired", message: "اول پارتنرت رو وصل کن" }, 409);
    const r = await readBody(request, 1024);
    if (r.err) return json({ ok: false, error: "bad_json" }, 400);
    const status = SHARE_STATUS.has(r.body.status) ? r.body.status : "";
    const cycle = SHARE_CYCLE.has(r.body.cycle) ? r.body.cycle : "";
    const mood = String(r.body.mood || "").trim().slice(0, 60);
    const cur = (await pairGet(env, "pshare:" + u.user.id)) || { name: u.user.username };
    await pairPut(env, "pshare:" + u.user.id, { ...cur, status, cycle, mood, ts: Date.now() });
    return json({ ok: true });
  }
  if (seg[0] === "partner" && seg[1] === "conflict") {
    const u = await requireUser(request, env);
    if (u.err) return u.err;
    if (!(await env.CONFIG.get("uspair:" + u.user.id))) return json({ ok: false, error: "not_paired", message: "اول پارتنرت رو وصل کن" }, 409);
    const r = await readBody(request, 4096);
    if (r.err) return json({ ok: false, error: "bad_json" }, 400);
    const topic = String(r.body.topic || "").trim().slice(0, 60);
    const ans = Array.isArray(r.body.ans) ? r.body.ans.slice(0, 4).map((x) => String(x || "").trim().slice(0, 200)) : [];
    if (!topic || ans.length < 4 || ans.some((x) => !x)) return json({ ok: false, error: "incomplete", message: "موضوع و هر ۴ جواب لازمه" }, 400);
    await pairPut(env, "pconf:" + u.user.id, { topic, ans, ts: Date.now() });
    const st = await partnerFullState(env, u.user.id);
    return json({ ok: true, bothDone: !!(st.theirConf) });
  }

  /* ---------- فضای ما (v8): ذخیره داک + چت زوج ---------- */
  if (seg[0] === "space") {
    const u = await requireUser(request, env);
    if (u.err) return u.err;
    if (!env || !env.CONFIG) return json({ ok: false, error: "no_kv" }, 501);
    const sp = await spacePair(env, u.user.id);
    if (!sp) return json({ ok: false, error: "not_paired", message: "اول پارتنرت رو وصل کن" }, 409);
    const r = await readBody(request, 9000000);
    if (r.err) return json({ ok: false, error: r.err || "bad_json" }, r.err === "too_large" ? 413 : 400);
    const body = r.body || {};
    // تایپینگ چت
    if (body.typing) {
      const c = await spaceGetChat(env, sp.pid);
      c.typing = c.typing || {};
      c.typing[u.user.id] = Date.now();
      await spacePutChat(env, sp.pid, c);
      return json({ ok: true });
    }
    // پیام چت
    if (body.chat && typeof body.chat === "object") {
      const ch = body.chat;
      const text = spaceText(ch.text, 500);
      const burst = ch.burst === true;
      const react = typeof ch.react === "string" ? ch.react.slice(0, 8).replace(/[<>]/g, "") : "";
      let loc = null;
      if (ch.loc && typeof ch.loc === "object") {
        const la = Number(ch.loc.lat), ln = Number(ch.loc.lng);
        if (isFinite(la) && isFinite(ln) && Math.abs(la) <= 90 && Math.abs(ln) <= 180) {
          loc = { lat: Math.round(la * 100000) / 100000, lng: Math.round(ln * 100000) / 100000 };
        }
      }
      // استیکر (v9): ارجاع سبک pack:id
      let sticker = "";
      if (typeof ch.sticker === "string" && /^[a-z0-9-]{1,16}:[a-z0-9-]{1,16}$/.test(ch.sticker)) sticker = ch.sticker;
      // ویس (v9): حداکثر ~۳۰۰KB و ۹۰ ثانیه
      let voice = "", vdur = 0;
      if (typeof ch.voice === "string" && ch.voice) {
        const v = ch.voice;
        vdur = Math.max(0, Math.min(90, Math.round(Number(ch.vdur) || 0)));
        if (vdur > 0 && v.length <= 450000 && /^data:audio\/(webm|mp4|ogg|mpeg|wav);base64,[A-Za-z0-9+/=]+$/.test(v)) voice = v;
        else if (v) return json({ ok: false, error: "bad_voice", message: "ویس خرابه یا خیلی سنگینه (حداکثر ۹۰ ثانیه)" }, 400);
      }
      // ویدیو (v9): فقط پلاس — حداکثر ~۲MB و ۳۰ ثانیه
      let video = "", vidur = 0;
      if (typeof ch.video === "string" && ch.video) {
        if (!isPlusUser(u.user)) return json({ ok: false, error: "plus_only", message: "پیام ویدیویی مخصوص باهم پلاسه 💎" }, 402);
        const v = ch.video;
        vidur = Math.max(0, Math.min(30, Math.round(Number(ch.vidur) || 0)));
        if (vidur > 0 && v.length <= 2900000 && /^data:video\/(webm|mp4);base64,[A-Za-z0-9+/=]+$/.test(v)) video = v;
        else return json({ ok: false, error: "bad_video", message: "ویدیو خرابه یا خیلی سنگینه (حداکثر ۳۰ ثانیه)" }, 400);
      }
      if (!text && !burst && !react && !loc && !sticker && !voice && !video) return json({ ok: false, error: "empty" }, 400);
      if (rateLimited(request, "spchat", 120)) return json({ ok: false, error: "rate_limited", message: "یه کم آروم‌تر ❤️" }, 429);
      const c = await spaceGetChat(env, sp.pid);
      const msg = { uid: u.user.id, ts: Date.now(), text, burst: burst || undefined, react: react || undefined, loc: loc || undefined, sticker: sticker || undefined, voice: voice || undefined, vdur: vdur || undefined, video: video || undefined, vidur: vidur || undefined };
      c.msgs = (c.msgs || []).concat([msg]).slice(-300);
      await spacePutChat(env, sp.pid, c);
      try { await pushTicklePeer(env, sp, u.user.id); } catch {}
      return json({ ok: true, msg });
    }
    // لوکیشن زنده (v8.1): {lat,lng,until} یا {stop:true} — حداکثر ۳ ساعت
    if (body.live && typeof body.live === "object") {
      const c = await spaceGetChat(env, sp.pid);
      c.live = (c.live && typeof c.live === "object") ? c.live : {};
      if (body.live.stop) {
        delete c.live[u.user.id];
      } else {
        const la = Number(body.live.lat), ln = Number(body.live.lng);
        const until = Number(body.live.until) || 0;
        if (!isFinite(la) || !isFinite(ln) || Math.abs(la) > 90 || Math.abs(ln) > 180) return json({ ok: false, error: "bad_loc" }, 400);
        if (rateLimited(request, "splive", 120)) return json({ ok: false, error: "rate_limited" }, 429);
        c.live[u.user.id] = { lat: Math.round(la * 100000) / 100000, lng: Math.round(ln * 100000) / 100000, ts: Date.now(), until: Math.min(until, Date.now() + 3 * 3600000) };
      }
      await spacePutChat(env, sp.pid, c);
      return json({ ok: true });
    }
    // داک سینک
    if (body.doc && typeof body.doc === "object") {
      const cur = await spaceGetDoc(env, sp.pid);
      const inc = body.doc;
      const next = { ...(cur || {}) };
      if (inc.profile && typeof inc.profile === "object") {
        const p = inc.profile;
        const clean = { me: spaceText(p.me, 40), partner: spaceText(p.partner, 40), meNick: spaceText(p.meNick, 24), partnerNick: spaceText(p.partnerNick, 24), emoji: spaceText(p.emoji, 8), since: spaceText(p.since, 10), theme: spaceText(p.theme, 12), wallpaper: spaceText(p.wallpaper, 12), c1: spaceText(p.c1, 7), c2: spaceText(p.c2, 7), u: Math.min(Date.now(), Math.max(0, Number(p.u) || 0)) };
        if (!next.profile || (clean.u || 0) >= (next.profile.u || 0)) next.profile = clean;
      }
      // tombstoneها اول ادغام می‌شن
      next.tombs = spaceMergeTombs(next.tombs, inc.tombs);
      for (const c of Object.keys(SPACE_LISTS)) {
        if (!Array.isArray(inc[c])) continue;
        const cleaned = [];
        for (const it of inc[c].slice(0, SPACE_LISTS[c])) {
          const cl = spaceCleanItem(c, it);
          if (cl) cleaned.push(cl);
        }
        next[c] = spaceApplyTombs(spaceMergeList(next[c], cleaned, SPACE_LISTS[c], c), (next.tombs || {})[c]);
      }
      // یادآور قرار (v9.1): رویداد تازه‌ی نزدیک (۴۸ ساعت آینده) → خبر به پارتنر
      if (Array.isArray(inc.events)) {
        try {
          const oldIds = new Set(((cur.events) || []).map((e) => e && e.id));
          const now0 = Date.now();
          const tk = (next.tkrev && typeof next.tkrev === "object") ? next.tkrev : {};
          let ping = false;
          for (const e of (next.events || [])) {
            if (!e || !e.id || !e.date || oldIds.has(e.id) || tk[e.id]) continue;
            const t = new Date(e.date + "T12:00:00").getTime();
            if (isFinite(t) && t > now0 - 86400000 && t < now0 + 2 * 86400000) { tk[e.id] = now0; ping = true; }
          }
          next.tkrev = tk;
          if (ping) { try { await pushTicklePeer(env, sp, u.user.id); } catch {} }
        } catch {}
      }
      // حال مشترک (v8.2): مثل daily ولی با v/note
      if (inc.moods && typeof inc.moods === "object") {
        const md = { ...((next.moods && typeof next.moods === "object") ? next.moods : {}) };
        for (const [k, v] of Object.entries(inc.moods).slice(-180)) {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !v || typeof v !== "object") continue;
          const curD = (md[k] && typeof md[k] === "object") ? md[k] : {};
          const a = { ...((curD.a && typeof curD.a === "object") ? curD.a : {}) };
          const mv = Math.max(0, Math.min(5, Number(v.mineV) || 0));
          const mTs = Number(v.mineTs || 0);
          const prevMine = a[u.user.id] || {};
          if (mv && mTs >= (prevMine.ts || 0)) a[u.user.id] = { v: mv, note: spaceText(v.mineNote, 200), ts: mTs };
          md[k] = { a, u: Math.max(Number(curD.u || 0), Number(v.u || 0)) };
        }
        const mkeys = Object.keys(md).sort().slice(-180);
        const mslim = {};
        for (const k of mkeys) mslim[k] = md[k];
        next.moods = mslim;
      }
      // سؤال روزانه: هر کس جواب خودش (mine) را می‌فرستد؛ سرور per-user نگه می‌دارد
      if (inc.daily && typeof inc.daily === "object") {
        const dd = { ...((next.daily && typeof next.daily === "object") ? next.daily : {}) };
        for (const [k, v] of Object.entries(inc.daily).slice(-180)) {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !v || typeof v !== "object") continue;
          const curD = (dd[k] && typeof dd[k] === "object") ? dd[k] : {};
          const a = { ...((curD.a && typeof curD.a === "object") ? curD.a : {}) };
          const myText = spaceText(v.mine, 500);
          const myTs = Number(v.mineTs || 0);
          const prevMine = a[u.user.id] || {};
          if (myText && myTs >= (prevMine.ts || 0)) a[u.user.id] = { t: myText, ts: myTs };
          const q = spaceText(v.q || curD.q, 200);
          dd[k] = { q, a, u: Math.max(Number(curD.u || 0), Number(v.u || 0)) };
        }
        const keys = Object.keys(dd).sort().slice(-180);
        const slim = {};
        for (const k of keys) slim[k] = dd[k];
        next.daily = slim;
      }
      await spacePutDoc(env, sp.pid, next);
      return json({ ok: true, me: u.user.id, peer: sp.otherId, doc: next });
    }
    return json({ ok: false, error: "bad_request" }, 400);
  }

  /* ---------- ایونت‌های دعوت‌نامه ---------- */
  if (seg[0] === "event") {
    if (rateLimited(request, "ev", 60)) return json({ ok: false, error: "rate_limited" }, 429);
    if (!env || !env.STATS) return json({ ok: true, stored: false }, 202);
    const r = await readBody(request, 2048);
    if (r.err) return json({ ok: false, error: r.err || "bad_json" }, r.err === "too_large" ? 413 : 400);
    const payload = r.body;
    if (!payload || !ALLOWED_EVENTS.has(payload.t)) return json({ ok: false, error: "bad_event" }, 400);
    const cfg = await currentConfig(env);
    if (!cfg.stats || !cfg.stats.enabled) return json({ ok: true, stored: false }, 202);
    const name = sanitizeName(payload.name || "");
    const value = sanitizeName(payload.v || "").slice(0, 48);
    let who = "anon";
    try {
      if (cfg.stats.storeName && name) who = "name:" + name;
      else if (name) {
        const digest = await crypto.subtle.digest("SHA-256", TE.encode(name));
        who = "hash:" + Array.from(new Uint8Array(digest)).slice(0, 5).map((b) => b.toString(16).padStart(2, "0")).join("");
      }
    } catch { who = "anon"; }
    const key = "stat:" + payload.t + ":" + who;
    context.waitUntil((async () => {
      try {
        const cur = parseInt((await env.STATS.get(key)) || "0", 10);
        await env.STATS.put(key, String(cur + 1), { expirationTtl: 90 * 24 * 3600 });
        await env.STATS.put("last:" + payload.t, new Date().toISOString(), { expirationTtl: 90 * 24 * 3600 });
      } catch {}
    })());
    return json({ ok: true, stored: true });
  }

  if (!env || !env.CONFIG) return json({ ok: false, error: "no_kv", message: "KV با نام CONFIG وصل نشده — در تنظیمات Pages بسازید" }, 501);

  /* ---------- ثبت‌نام / ورود ---------- */
  if (seg[0] === "auth") {
    const action = seg[1];
    if (rateLimited(request, "auth", 12)) return json({ ok: false, error: "rate_limited", message: "یه کم سریع بودی؛ نفس تازه کن و دوباره بزن" }, 429);
    const r = await readBody(request, 4096);
    if (r.err) return json({ ok: false, error: r.err || "bad_json" }, 400);
    const b = r.body || {};
    const username = String(b.username || "").toLowerCase().trim();
    const password = String(b.password || "");
    if (!/^[a-z0-9_]{3,24}$/.test(username)) return json({ ok: false, error: "bad_username", message: "یوزرنیم: ۳ تا ۲۴ حرف انگلیسی/عدد/_" }, 400);
    if (action !== "recover" && (password.length < 6 || password.length > 72)) return json({ ok: false, error: "bad_password", message: "رمز حداقل ۶ کاراکتر" }, 400);

    if (action === "register") {
      const exists = await env.CONFIG.get("useridx:" + username);
      if (exists) return json({ ok: false, error: "taken", message: "این یوزرنیم رو یکی قبلاً برده" }, 409);
      const uid = randHex(6);
      const salt = randHex(8);
      const ABC = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
      const recoveryCode = Array.from(crypto.getRandomValues(new Uint8Array(10))).map((b) => ABC[b % ABC.length]).join("");
      const user = {
        id: uid, username,
        name: sanitizeName(String(b.name || "")) || username,
        pass: await hashPassword(password, salt), salt,
        recoveryHash: await sha256Hex(recoveryCode),
        created: Date.now(),
        profile: { style: "funny", gender: "x", crush: "", name: "", interests: [], crushes: [] },
        ai: { key: "", base: "", model: "gpt-4o-mini" },
      };
      await env.CONFIG.put("useridx:" + username, uid);
      await putUser(env, user);
      const token = await makeToken(uid, env);
      return json({ ok: true, token, user: safeUser(user), recoveryCode });
    }

    if (action === "login") {
      const uid = await env.CONFIG.get("useridx:" + username);
      const user = uid ? await getUser(env, uid) : null;
      if (!user || !user.pass) return json({ ok: false, error: "bad_login", message: "یوزرنیم یا رمز اشتباه است" }, 401);
      const h = await hashPassword(password, user.salt || "");
      if (h !== user.pass) return json({ ok: false, error: "bad_login", message: "یوزرنیم یا رمز اشتباه است" }, 401);
      const token = await makeToken(user.id, env);
      return json({ ok: true, token, user: safeUser(user) });
    }

    if (action === "recover") {
      const code = String(b.recoveryCode || "").replace(/[\s-]/g, "").toUpperCase();
      const newPassword = String(b.newPassword || "");
      if (!/^[A-Z0-9]{8,16}$/.test(code)) return json({ ok: false, error: "bad_code", message: "کد بازیابی معتبر نیست" }, 400);
      if (newPassword.length < 6 || newPassword.length > 72) return json({ ok: false, error: "bad_password", message: "رمز جدید حداقل ۶ کاراکتر" }, 400);
      const uid = await env.CONFIG.get("useridx:" + username);
      const user = uid ? await getUser(env, uid) : null;
      if (!user || !user.recoveryHash) return json({ ok: false, error: "bad_login", message: "حسابی با این یوزرنیم پیدا نکردیم" }, 401);
      if ((await sha256Hex(code)) !== user.recoveryHash) return json({ ok: false, error: "bad_code", message: "کد بازیابی اشتباه است" }, 401);
      const salt = randHex(8);
      user.salt = salt;
      user.pass = await hashPassword(newPassword, salt);
      try { await putUser(env, user); } catch { return json({ ok: false, error: "kv_write_failed" }, 500); }
      const token = await makeToken(user.id, env);
      return json({ ok: true, token, user: safeUser(user) });
    }

    return json({ ok: false, error: "not_found" }, 404);
  }

  /* ---------- پروفایل: تست اتصال AI ---------- */
  if (seg[0] === "me") {
    const u = await requireUser(request, env);
    if (u.err) return u.err;
    const r = await readBody(request, 4096);
    if (r.err || !r.body) return json({ ok: false, error: r.err || "bad_json" }, 400);
    if (r.body.action === "ai-test") {
      if (rateLimited(request, "aitest", 10)) return json({ ok: false, error: "rate_limited" }, 429);
      const res = await callAi(u.user, [
        { role: "system", content: "You are a connection test. Reply with exactly: OK" },
        { role: "user", content: "test" },
      ], 8);
      if (res.err) return res.err;
      return json({ ok: true, reply: res.text.slice(0, 40) });
    }
    return json({ ok: false, error: "not_found" }, 404);
  }

  /* ---------- دعوت‌نامه‌ی شخصی: بازدید و پیام (عمومی) ---------- */
  if (seg[0] === "i" && seg[1] && env && env.CONFIG) {
    const slug = String(seg[1]);
    if (!/^[a-z0-9-]{4,20}$/.test(slug)) return json({ ok: false, error: "bad_slug" }, 400);
    const inv = await getInvite(env, slug);
    if (!inv) return json({ ok: false, error: "not_found" }, 404);

    if (seg[2] === "view") {
      if (rateLimited(request, "iview", 60)) return json({ ok: true, throttled: true });
      inv.views = (inv.views || 0) + 1;
      inv.lastView = Date.now();
      try { await putInvite(env, inv); } catch {}
      return json({ ok: true, views: inv.views });
    }

    if (seg[2] === "msg") {
      if (rateLimited(request, "imsg", 10)) return json({ ok: false, error: "rate_limited", message: "یه کم آروم‌تر؛ الان دوباره امتحان کن" }, 429);
      const r = await readBody(request, 4096);
      if (r.err || !r.body) return json({ ok: false, error: r.err || "bad_json" }, 400);
      const text = invText(r.body.text, 500);
      if (!text) return json({ ok: false, error: "empty", message: "یه چیزی بنویس بفرست" }, 400);
      inv.msgs = [{ id: randHex(4) + "-" + Date.now().toString(36), ts: Date.now(), text, reply: "" }].concat(inv.msgs || []).slice(0, 50);
      try { await putInvite(env, inv); } catch { return json({ ok: false, error: "kv_write_failed" }, 500); }
      return json({ ok: true, msgs: inv.msgs.length });
    }

    return json({ ok: false, error: "not_found" }, 404);
  }

  /* ---------- کشف: لایک/رد ---------- */
  if (seg[0] === "discover" && seg[1] === "like") {
    const u = await requireUser(request, env);
    if (u.err) return u.err;
    if (!(u.user.profile && u.user.profile.adult)) return json({ ok: false, error: "adult_only" }, 403);
    if (rateLimited(request, "dlike", 120)) return json({ ok: false, error: "rate_limited" }, 429);
    const r = await readBody(request, 2048);
    if (r.err || !r.body) return json({ ok: false, error: r.err || "bad_json" }, 400);
    const target = String(r.body.target || "");
    if (!/^[a-f0-9]{4,24}$/.test(target) || target === u.user.id) return json({ ok: false, error: "bad_target" }, 400);
    const tc = await getDisc(env, target);
    if (!tc) return json({ ok: false, error: "not_found" }, 404);
    const myLikes = await getLikes(env, u.user.id);
    myLikes[target] = r.body.like ? 1 : -1;
    await env.CONFIG.put("dlike:" + u.user.id, JSON.stringify(myLikes));
    if (r.body.like) {
      const theirLikes = await getLikes(env, target);
      if (theirLikes[u.user.id] === 1) {
        const id = randHex(6);
        const room = { id, a: u.user.id, b: target, msgs: [], created: Date.now() };
        await env.CONFIG.put("room:" + id, JSON.stringify(room));
        for (const p of [u.user.id, target]) {
          const ri = await getRoomIdx(env, p);
          if (!ri.includes(id)) await env.CONFIG.put("rooms:" + p, JSON.stringify([id].concat(ri).slice(0, 50)));
        }
        return json({ ok: true, matched: true, room: id, peer: tc.name || tc.username });
      }
    }
    return json({ ok: true, matched: false });
  }

  /* ---------- کشف: ثبت بازدید کارت ---------- */
  if (seg[0] === "discover" && seg[1] === "seen") {
    const u = await requireUser(request, env);
    if (u.err) return u.err;
    if (rateLimited(request, "dseen", 150)) return json({ ok: true, throttled: true });
    const r = await readBody(request, 1024);
    if (r.err || !r.body) return json({ ok: false, error: "bad_json" }, 400);
    const target = String(r.body.target || "");
    if (!/^[a-f0-9]{4,24}$/.test(target)) return json({ ok: false, error: "bad_target" }, 400);
    const c = await getDisc(env, target);
    if (c) {
      const st = await getDStats(env, target);
      st.v = (st.v || 0) + 1;
      try { await env.CONFIG.put("dstats:" + target, JSON.stringify(st)); } catch {}
    }
    return json({ ok: true });
  }

  /* ---------- کشف: گزارش/مسدود ---------- */
  if (seg[0] === "discover" && seg[1] === "block") {
    const u = await requireUser(request, env);
    if (u.err) return u.err;
    const r = await readBody(request, 2048);
    if (r.err || !r.body) return json({ ok: false, error: r.err || "bad_json" }, 400);
    const target = String(r.body.target || "");
    if (!/^[a-f0-9]{4,24}$/.test(target) || target === u.user.id) return json({ ok: false, error: "bad_target" }, 400);
    const blocks = await getBlocks(env, u.user.id);
    blocks[target] = 1;
    try { await env.CONFIG.put("dblock:" + u.user.id, JSON.stringify(blocks)); } catch { return json({ ok: false, error: "kv_write_failed" }, 500); }
    if (r.body.report) {
      try {
        const reps = JSON.parse((await env.CONFIG.get("dreports")) || "[]");
        reps.unshift({ by: u.user.id, target, ts: Date.now() });
        await env.CONFIG.put("dreports", JSON.stringify(reps.slice(0, 200)));
      } catch {}
    }
    return json({ ok: true, blocked: true });
  }

  /* ---------- اتاق چت: پیام جدید ---------- */
  if (seg[0] === "room" && seg[2] === "msg") {
    const u = await requireUser(request, env);
    if (u.err) return u.err;
    if (rateLimited(request, "rmsg", 30)) return json({ ok: false, error: "rate_limited", message: "یه کم آروم‌تر" }, 429);
    const r = await readBody(request, 4096);
    if (r.err || !r.body) return json({ ok: false, error: r.err || "bad_json" }, 400);
    const react = r.body && ["heart", "laugh", "star", "fire"].includes(r.body.react) ? r.body.react : "";
    const text = react ? "" : invText(r.body.text, 500);
    if (!text && !react) return json({ ok: false, error: "empty" }, 400);
    const room = await getRoom(env, String(seg[1]));
    if (!room || (room.a !== u.user.id && room.b !== u.user.id)) return json({ ok: false, error: "not_found" }, 404);
    room.msgs = (room.msgs || []).concat([{ uid: u.user.id, ts: Date.now(), text, react }]).slice(-200);
    try { await env.CONFIG.put("room:" + room.id, JSON.stringify(room)); } catch { return json({ ok: false, error: "kv_write_failed" }, 500); }
    return json({ ok: true });
  }

  /* ---------- اتاق چت: دوز چالشی ---------- */
  if (seg[0] === "room" && seg[2] === "game" && seg[1]) {
    const u = await requireUser(request, env);
    if (u.err) return u.err;
    if (rateLimited(request, "rgame", 90)) return json({ ok: false, error: "rate_limited" }, 429);
    const room = await getRoom(env, String(seg[1]));
    if (!room || (room.a !== u.user.id && room.b !== u.user.id)) return json({ ok: false, error: "not_found" }, 404);
    const r = await readBody(request, 2048);
    if (r.err || !r.body) return json({ ok: false, error: r.err || "bad_json" }, 400);
    const b = r.body;
    if (b.new) {
      room.game = { bd: ["", "", "", "", "", "", "", "", ""], x: u.user.id, turn: u.user.id, over: 0 };
    } else if (b.end) {
      room.game = null;
    } else {
      const g = room.game;
      const i = Number(b.i);
      if (!g || g.over) return json({ ok: false, error: "no_game" }, 400);
      if (g.turn !== u.user.id) return json({ ok: false, error: "not_your_turn", message: "نوبت طرف نیست" }, 400);
      if (!(i >= 0 && i <= 8) || g.bd[i]) return json({ ok: false, error: "bad_move" }, 400);
      const sym = g.x === u.user.id ? "♥" : "✿";
      g.bd[i] = sym;
      const L = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
      const win = L.some((l) => l.every((k) => g.bd[k] === sym));
      if (win) g.over = u.user.id;
      else if (g.bd.every((x) => x)) g.over = -1;
      else g.turn = room.a === u.user.id ? room.b : room.a;
    }
    try { await env.CONFIG.put("room:" + room.id, JSON.stringify(room)); } catch { return json({ ok: false, error: "kv_write_failed" }, 500); }
    return json({ ok: true, game: room.game });
  }

  /* ---------- ساخت دعوت‌نامه‌ی شخصی ---------- */
  if (seg[0] === "invites") {
    const u = await requireUser(request, env);
    if (u.err) return u.err;
    if (rateLimited(request, "invcreate", 20)) return json({ ok: false, error: "rate_limited" }, 429);
    const r = await readBody(request, 8192);
    if (r.err || !r.body) return json({ ok: false, error: r.err || "bad_json" }, 400);
    const b = r.body;
    const name = sanitizeName(String(b.name || ""));
    if (!name) return json({ ok: false, error: "bad_name", message: "اسم طرف رو بنویس" }, 400);
    const occasion = INV_OCCS.has(b.occasion) ? b.occasion : "love";
    const theme = INV_THEMES.has(b.theme) ? b.theme : "romantic";
    const music = b.music === "none" ? "none" : "";
    const tg = /^[A-Za-z0-9_]{4,32}$/.test(String(b.tg || "")) ? String(b.tg) : "";
    const slug = randHex(4) + "-" + Date.now().toString(36).slice(-4);
    const inv = { id: slug, uid: u.user.id, name, occasion, theme, music, tg, qText: invText(b.qText, 140), letter: invText(b.letter, 400), created: Date.now(), views: 0, msgs: [] };
    const idx = await getInvIdx(env, u.user.id);
    if (idx.length >= 20) {
      const drop = idx.splice(20 - 1);
      for (const d of drop) { try { await env.CONFIG.delete("inv:" + d); } catch {} }
    }
    try {
      await putInvite(env, inv);
      await putInvIdx(env, u.user.id, [slug].concat(idx).slice(0, 20));
    } catch { return json({ ok: false, error: "kv_write_failed" }, 500); }
    return json({ ok: true, invite: { id: slug, ...invPublic(inv), views: 0, msgs: 0, unreplied: 0, created: inv.created } });
  }

  /* ---------- چت یار ---------- */
  /* ---------- اشتراک عمومی: ساخت/حذف ---------- */
  if (seg[0] === "share") {
    const u = await requireUser(request, env);
    if (u.err) return u.err;
    if (!env || !env.CONFIG) return json({ ok: false, error: "no_kv" }, 501);
    const r = await readBody(request, 600000);
    if (r.err) return json({ ok: false, error: r.err || "bad_json" }, r.err === "too_large" ? 413 : 400);
    const b = r.body || {};
    // حذف
    if (b.delete) {
      const slug = String(b.delete).slice(0, 16);
      if (!/^[a-z0-9]{8}$/.test(slug)) return json({ ok: false, error: "bad_slug" }, 400);
      const sh = await pairGet(env, "share:" + slug);
      if (!sh) return json({ ok: true, gone: true });
      if (sh.uid !== u.user.id) return json({ ok: false, error: "forbidden" }, 403);
      await pairDel(env, "share:" + slug);
      try {
        const idx = (await pairGet(env, "shareidx:" + u.user.id)) || [];
        await pairPut(env, "shareidx:" + u.user.id, idx.filter((x) => x !== slug));
      } catch {}
      return json({ ok: true, deleted: true });
    }
    if (rateLimited(request, "sharemk", 20)) return json({ ok: false, error: "rate_limited" }, 429);
    let data = null, kind = "";
    if (b.kind === "memory" && b.m && typeof b.m === "object") {
      kind = "memory";
      let photo = "";
      if (typeof b.m.photo === "string" && b.m.photo.length <= 400000 && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(b.m.photo)) photo = b.m.photo;
      data = { title: spaceText(b.m.title, 80), text: spaceText(b.m.text, 2000), date: spaceText(b.m.date, 10), place: spaceText(b.m.place, 60), photo };
      if (!data.title && !data.text && !photo) return json({ ok: false, error: "empty" }, 400);
    } else if (b.kind === "card" && b.c && typeof b.c === "object") {
      kind = "card";
      data = { me: spaceText(b.c.me, 40), partner: spaceText(b.c.partner, 40), since: spaceText(b.c.since, 10), emoji: spaceText(b.c.emoji, 8) || "❤️" };
      if (!data.me && !data.partner) return json({ ok: false, error: "empty" }, 400);
    } else {
      return json({ ok: false, error: "bad_kind" }, 400);
    }
    const slug = mkShareSlug();
    await pairPut(env, "share:" + slug, { kind, uid: u.user.id, ts: Date.now(), data }, 90 * 86400);
    try {
      const idx = (await pairGet(env, "shareidx:" + u.user.id)) || [];
      await pairPut(env, "shareidx:" + u.user.id, [slug].concat(idx).slice(0, 20));
    } catch {}
    let origin = "";
    try { origin = new URL(request.url).origin; } catch {}
    return json({ ok: true, slug, url: origin + "/share?s=" + slug });
  }

  /* ---------- پلاس: redeem / خرید / تأیید / ادمین ---------- */
  if (seg[0] === "plus" && seg[1] === "redeem") {
    const u = await requireUser(request, env);
    if (u.err) return u.err;
    if (!env || !env.CONFIG) return json({ ok: false, error: "no_kv" }, 501);
    if (rateLimited(request, "plusredeem", 20)) return json({ ok: false, error: "rate_limited" }, 429);
    const r = await readBody(request, 1024);
    if (r.err) return json({ ok: false, error: "bad_json" }, 400);
    const code = String((r.body && r.body.code) || "").trim().toUpperCase().slice(0, 24);
    if (!/^[A-Z0-9-]{6,24}$/.test(code)) return json({ ok: false, error: "bad_code", message: "فرمت کد درست نیست" }, 400);
    const rec = await pairGet(env, "pluscode:" + code);
    if (!rec) return json({ ok: false, error: "not_found", message: "چنین کدی پیدا نشد" }, 404);
    if (rec.used) return json({ ok: false, error: "used", message: "این کد قبلاً استفاده شده" }, 409);
    const until = await plusExtend(env, u.user.id, rec.months);
    rec.used = { uid: u.user.id, ts: Date.now() };
    await pairPut(env, "pluscode:" + code, rec);
    try {
      const idx = (await pairGet(env, "plus:idx")) || [];
      const it = idx.find((x) => x && x.code === code);
      if (it) { it.used = true; await pairPut(env, "plus:idx", idx.slice(0, 200)); }
    } catch {}
    return json({ ok: true, until });
  }
  if (seg[0] === "plus" && seg[1] === "pay") {
    const u = await requireUser(request, env);
    if (u.err) return u.err;
    if (!env || !env.CONFIG) return json({ ok: false, error: "no_kv" }, 501);
    if (rateLimited(request, "pluspay", 20)) return json({ ok: false, error: "rate_limited" }, 429);
    const r = await readBody(request, 1024);
    if (r.err) return json({ ok: false, error: "bad_json" }, 400);
    const months = Number((r.body && r.body.months) || 1) === 12 ? 12 : 1;
    const s = await plusSettings(env);
    const amount = months === 12 ? s.price12 : s.price1;
    if (!s.merchant || !amount || amount < 1000) return json({ ok: false, error: "no_gateway", message: "فعلاً خرید آنلاین فعال نیست؛ از کد فعال‌سازی استفاده کن 🎟" }, 503);
    let origin = "";
    try { origin = new URL(request.url).origin; } catch {}
    const host = s.sandbox ? "api.sandbox.zarinpal.com" : "api.zarinpal.com";
    const web = s.sandbox ? "www.sandbox.zarinpal.com" : "www.zarinpal.com";
    try {
      const zr = await fetch("https://" + host + "/pg/v4/payment/request.json", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ merchant_id: s.merchant, amount, callback_url: origin + "/?plus=verify", description: "باهم پلاس " + (months === 12 ? "یک‌ساله 💎" : "یک‌ماهه 💎") }),
      });
      const zj = await zr.json();
      if (!zj || !zj.data || zj.data.code !== 100 || !zj.data.authority) {
        return json({ ok: false, error: "gateway", message: "درگاه جواب نداد؛ بعداً دوباره بزن 🔄" }, 502);
      }
      await pairPut(env, "pluspay:" + zj.data.authority, { uid: u.user.id, months, amount }, 1800);
      return json({ ok: true, url: "https://" + web + "/pg/StartPay/" + zj.data.authority });
    } catch {
      return json({ ok: false, error: "gateway", message: "درگاه جواب نداد؛ بعداً دوباره بزن 🔄" }, 502);
    }
  }
  if (seg[0] === "plus" && seg[1] === "verify") {
    const u = await requireUser(request, env);
    if (u.err) return u.err;
    if (!env || !env.CONFIG) return json({ ok: false, error: "no_kv" }, 501);
    const r = await readBody(request, 1024);
    if (r.err) return json({ ok: false, error: "bad_json" }, 400);
    const authority = String((r.body && r.body.authority) || "").slice(0, 64);
    const status = String((r.body && r.body.status) || "");
    if (!authority) return json({ ok: false, error: "bad_authority" }, 400);
    if (status !== "" && status !== "OK") return json({ ok: false, error: "cancelled", message: "پرداخت لغو شد" }, 400);
    const pay = await pairGet(env, "pluspay:" + authority);
    if (!pay || pay.uid !== u.user.id) {
      // قبلاً تأیید و مصرف شده؟ وضعیت فعلی رو برگردون
      return json({ ok: true, dup: true, until: Number(u.user.plusUntil) || 0 });
    }
    const s = await plusSettings(env);
    const host = s.sandbox ? "api.sandbox.zarinpal.com" : "api.zarinpal.com";
    try {
      const zr = await fetch("https://" + host + "/pg/v4/payment/verify.json", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ merchant_id: s.merchant, amount: pay.amount, authority }),
      });
      const zj = await zr.json();
      const code = zj && zj.data && zj.data.code;
      if (code !== 100 && code !== 101) return json({ ok: false, error: "not_verified", message: "پرداخت تأیید نشد؛ اگه پول کم شده خودش برمی‌گرده" }, 400);
      const until = await plusExtend(env, u.user.id, pay.months);
      await pairDel(env, "pluspay:" + authority);
      return json({ ok: true, until, ref: (zj.data && zj.data.ref_id) || "" });
    } catch {
      return json({ ok: false, error: "gateway", message: "درگاه جواب نداد؛ چند دقیقه دیگه از تنظیمات دوباره چک کن 🔄" }, 502);
    }
  }
  if (seg[0] === "plus" && seg[1] === "admin") {
    if (rateLimited(request, "plusadm", 30)) return json({ ok: false, error: "rate_limited" }, 429);
    const cfg = await currentConfig(env);
    if (!isAuthed(request, env, cfg)) return json({ ok: false, error: "unauthorized" }, 401);
    if (!env || !env.CONFIG) return json({ ok: false, error: "no_kv" }, 501);
    const r = await readBody(request, 8192);
    if (r.err) return json({ ok: false, error: "bad_json" }, 400);
    const b = r.body || {};
    // تنظیمات درگاه
    if (b.op === "settings") {
      const cur = await plusSettings(env);
      const next = {
        merchant: String(b.merchant || "").trim().slice(0, 64) || cur.merchant,
        price1: Math.max(0, Math.round(Number(b.price1) || 0)),
        price12: Math.max(0, Math.round(Number(b.price12) || 0)),
        sandbox: !!b.sandbox,
      };
      if (b.clearMerchant) next.merchant = "";
      await pairPut(env, "plus:settings", next);
      return json({ ok: true, settings: { hasMerchant: !!next.merchant, price1: next.price1, price12: next.price12, sandbox: next.sandbox } });
    }
    // ساخت کد
    if (b.op === "mkcodes") {
      const months = Math.max(1, Math.min(24, Number(b.months) || 1));
      const count = Math.max(1, Math.min(50, Number(b.count) || 1));
      const made = [];
      for (let i = 0; i < count; i++) {
        const code = mkPlusCode();
        await pairPut(env, "pluscode:" + code, { months, ts: Date.now(), used: null });
        made.push({ code, months, used: false, ts: Date.now() });
      }
      try {
        const idx = (await pairGet(env, "plus:idx")) || [];
        await pairPut(env, "plus:idx", made.concat(idx).slice(0, 200));
      } catch {}
      return json({ ok: true, codes: made });
    }
    return json({ ok: false, error: "bad_op" }, 400);
  }

  /* ---------- تماس: شروع/جواب/کاندید/قطع ---------- */
  if (seg[0] === "call") {
    const u = await requireUser(request, env);
    if (u.err) return u.err;
    if (!env || !env.CONFIG) return json({ ok: false, error: "no_kv" }, 501);
    const sp = await spacePair(env, u.user.id);
    if (!sp) return json({ ok: false, error: "not_paired" }, 409);
    if (rateLimited(request, "callpost", 150)) return json({ ok: false, error: "rate_limited" }, 429);
    const r = await readBody(request, 32768);
    if (r.err) return json({ ok: false, error: "bad_json" }, 400);
    const b = r.body || {};
    const key = "call:" + sp.pid;
    const cur = await pairGet(env, key);
    const live = cur && callFresh(cur) && (cur.state === "ringing" || cur.state === "active") ? cur : null;
    // شروع تماس
    if (b.action === "start") {
      if (live) return json({ ok: false, error: "busy", message: "یه تماس در جریانه 📞" }, 409);
      const type = b.type === "video" ? "video" : "audio";
      if (type === "video" && !isPlusUser(u.user)) return json({ ok: false, error: "plus_only", message: "تماس تصویری مخصوص باهم پلاسه 💎" }, 402);
      const offer = cleanSdp(b.offer);
      if (!offer || offer.type !== "offer") return json({ ok: false, error: "bad_offer" }, 400);
      const call = { state: "ringing", from: u.user.id, type, offer, answer: null, cand: {}, ts: Date.now() };
      await pairPut(env, key, call, 180);
      try { await pushTicklePeer(env, sp, u.user.id); } catch {}
      return json({ ok: true, call: await callView(env, sp, u.user.id) });
    }
    // جواب دادن (فقط طرف مقابل، فقط در حال زنگ)
    if (b.action === "answer") {
      if (!live || live.state !== "ringing" || live.from === u.user.id) return json({ ok: false, error: "no_call" }, 409);
      const answer = cleanSdp(b.answer);
      if (!answer || answer.type !== "answer") return json({ ok: false, error: "bad_answer" }, 400);
      live.answer = answer; live.state = "active";
      await pairPut(env, key, live, 3 * 3600);
      return json({ ok: true, call: await callView(env, sp, u.user.id) });
    }
    // کاندید ICE
    if (b.action === "candidate") {
      if (!live) return json({ ok: false, error: "no_call" }, 409);
      const cd = cleanCand(b.candidate);
      if (!cd) return json({ ok: false, error: "bad_cand" }, 400);
      live.cand = live.cand || {};
      const mine = (live.cand[u.user.id] || []).concat([cd]).slice(-40);
      live.cand[u.user.id] = mine;
      await pairPut(env, key, live, live.state === "active" ? 3 * 3600 : 180);
      return json({ ok: true });
    }
    // قطع / رد
    if (b.action === "hangup" || b.action === "decline") {
      if (cur && callFresh(cur)) {
        cur.state = "ended"; cur.ts = Date.now();
        await pairPut(env, key, cur, 30);
      }
      return json({ ok: true, ended: true });
    }
    return json({ ok: false, error: "bad_action" }, 400);
  }

  /* ---------- وب‌پوش: اشتراک/لغو tickle ---------- */
  if (seg[0] === "push") {
    const u = await requireUser(request, env);
    if (u.err) return u.err;
    if (!env || !env.CONFIG) return json({ ok: false, error: "no_kv" }, 501);
    const r = await readBody(request, 2048);
    if (r.err) return json({ ok: false, error: "bad_json" }, 400);
    const b = r.body || {};
    const subs = await pushSubsGet(env, u.user.id);
    if (b.unsub) {
      const ep = String(b.unsub).slice(0, 500);
      await pairPut(env, "pushsub:" + u.user.id, subs.filter((s) => s && s.endpoint !== ep));
      return json({ ok: true, off: true });
    }
    const s = b.sub || {};
    if (!s.endpoint || !/^https:\/\/.{4,500}$/.test(String(s.endpoint))) return json({ ok: false, error: "bad_sub" }, 400);
    if (!s.keys || typeof s.keys.p256dh !== "string" || typeof s.keys.auth !== "string") return json({ ok: false, error: "bad_sub" }, 400);
    if (rateLimited(request, "pushsub", 30)) return json({ ok: false, error: "rate_limited" }, 429);
    const clean = { endpoint: String(s.endpoint).slice(0, 500), keys: { p256dh: String(s.keys.p256dh).slice(0, 200), auth: String(s.keys.auth).slice(0, 100) }, ts: Date.now() };
    const rest = subs.filter((x) => x && x.endpoint !== clean.endpoint);
    rest.unshift(clean);
    await pairPut(env, "pushsub:" + u.user.id, rest.slice(0, 3));
    return json({ ok: true, on: true });
  }

  if (seg[0] === "chat") {
    const u = await requireUser(request, env);
    if (u.err) return u.err;
    if (rateLimited(request, "chat", 20)) return json({ ok: false, error: "rate_limited", message: "یه کم سریع بودی؛ نفس تازه کن و دوباره بزن" }, 429);
    const r = await readBody(request, 6 * 1024 * 1024);
    if (r.err) return json({ ok: false, error: r.err || "bad_json" }, r.err === "too_large" ? 413 : 400);
    const b = r.body || {};
    const styleId = TONES[b.style] ? b.style : "funny";
    const adultUser = !!(u.user.profile && u.user.profile.adult);
    if (TONES[styleId].adult && !adultUser) {
      return json({ ok: false, error: "adult_locked", message: "این لحن فقط برای حساب‌های بزرگسال (با تأیید سن در تنظیمات) فعال است" }, 403);
    }
    if (b.mode === "aftercare" && !adultUser) {
      return json({ ok: false, error: "adult_locked", message: "پس‌مراقبت فقط برای حساب‌های بزرگسال (با تأیید سن) فعال است" }, 403);
    }
    const images = [];
    for (const im of (b.images || []).slice(0, 2)) {
      const s = String(im || "");
      if (/^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(s) && s.length <= 2_300_000) images.push(s);
    }
    const qText = String(b.text || "").replace(/\s+/g, " ").trim().slice(0, 6000);
    if (!qText && !images.length) return json({ ok: false, error: "empty", message: "یه چیزی بنویس یا عکس بذار، بعد بفرست" }, 400);
    const modeId = MODES[b.mode] ? b.mode : "reply";
    // دستیار حافظه (v9): رایگان روزی ۵ سؤال، پلاس نامحدود
    if (modeId === "memory" && !isPlusUser(u.user)) {
      const day = new Date().toISOString().slice(0, 10);
      const qk = "memq:" + u.user.id + ":" + day;
      const qn = (await pairGet(env, qk)) || { d: day, n: 0 };
      const n = (qn.d === day ? Number(qn.n) || 0 : 0) + 1;
      if (n > 5) return json({ ok: false, error: "memory_quota", message: "سهم امروزت از دستیار حافظه تموم شد (۵ سؤال)؛ با باهم پلاس نامحدود می‌شه 💎" }, 402);
      await pairPut(env, qk, { d: day, n });
    }
    const messages = buildAiMessages(u.user, { ...b, style: styleId }, images);

    const saveChat = async (fullText) => {
      try {
        const h = await getHist(env, u.user.id);
        const LBL = { reply: "چی جواب بدم", opener: "شروع گفتگو", rewrite: "بهترش کن", analyze: "چی می‌گه؟", date: "کجا بریم", sim: "جای اون", apology: "آشتی", sensitive: "موضوع حساس", sos: "الان چی بگم", comfort: "دلداری", congrats: "تبریک", express: "دوستش دارم؟", nothing: "هیچی نیستم", memory: "حافظه‌ی رابطه" };
        h.chats.unshift({
          id: randHex(4) + "-" + Date.now().toString(36),
          ts: Date.now(),
          title: (LBL[modeId] ? LBL[modeId] + " · " : "") + (qText || "با تصویر").slice(0, 50),
          data: {
            q: qText.slice(0, 1200),
            a: String(fullText || "").slice(0, 2000),
            mode: modeId,
            tone: styleId,
            img: images.length > 0,
          },
        });
        await putHist(env, u.user.id, h);
      } catch {}
    };

    // استریم زنده (SSE)
    if (b.stream) {
      const s = await callAi(u.user, messages, 900, true);
      if (s.err) return s.err;
      const upstream = s.res;
      const { readable, writable } = new TransformStream();
      (async () => {
        const reader = upstream.body.getReader();
        const writer = writable.getWriter();
        const dec = new TextDecoder();
        let raw = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            await writer.write(value);
            raw += dec.decode(value, { stream: true });
          }
        } catch {}
        let full = "";
        for (const line of raw.split("\n")) {
          const l = line.trim();
          if (!l.startsWith("data:")) continue;
          const payload = l.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const j = JSON.parse(payload);
            const d = j.choices && j.choices[0] && (j.choices[0].delta || j.choices[0].message);
            if (d && d.content) full += d.content;
          } catch {}
        }
        if (full) await saveChat(full);
        try { await writer.close(); } catch {}
      })();
      return new Response(readable, {
        headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache, no-transform", "x-accel-buffering": "no" },
      });
    }

    const res = await callAi(u.user, messages, 900);
    if (res.err) return res.err;
    await saveChat(res.text);
    return json({ ok: true, reply: res.text });
  }

  /* ---------- ثبت آیتم تاریخچه (دعوت‌نامه و ...) ---------- */
  if (seg[0] === "history") {
    const u = await requireUser(request, env);
    if (u.err) return u.err;
    const r = await readBody(request, 16 * 1024);
    if (r.err || !r.body) return json({ ok: false, error: r.err || "bad_json" }, 400);
    const b = r.body;
    if (b.type !== "invite") return json({ ok: false, error: "bad_type" }, 400);
    const url2 = String((b.data && b.data.url) || "");
    if (!/^\/invite\?[\w%\-.~=&?]*$/.test(url2) || url2.length > 300) return json({ ok: false, error: "bad_url" }, 400);
    const h = await getHist(env, u.user.id);
    if ((h.invites || []).some((x) => x.data && x.data.url === url2)) return json({ ok: true, history: h, dup: true });
    h.invites.unshift({
      id: randHex(4) + "-" + Date.now().toString(36),
      ts: Date.now(),
      title: sanitizeName(String(b.title || "لینک دعوت")) || "لینک دعوت",
      data: { url: url2, name: sanitizeName(String((b.data && b.data.name) || "")), theme: String((b.data && b.data.theme) || "").replace(/[^a-z]/g, ""), occasion: String((b.data && b.data.occasion) || "").replace(/[^a-z]/g, "") },
    });
    try { await putHist(env, u.user.id, h); } catch { return json({ ok: false, error: "kv_write_failed" }, 500); }
    return json({ ok: true, history: h });
  }

  return json({ ok: false, error: "not_found" }, 404);
}
