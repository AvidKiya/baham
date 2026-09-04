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
//   ---- اپ مخ‌یار ----
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
  aftercare: "پس‌مراقبت (aftercare) — پیام‌های گرم، آرام و مراقبت‌محور برای بعد از یک بازی/لحظه‌ی بزرگسال؛ لحن نرم، امن‌ساز و مسئولانه. سه پیام کوتاه بده.",
  game: "بازی کارتی (محلی) — اگر پیام آمد، راهنمای کوتاه بازی حقیقت یا جرأت بده.",
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

async function requireUser(request, env) {
  const uid = await readToken(request, env);
  if (!uid) return { err: json({ ok: false, error: "unauthorized", message: "اول وارد شوید" }, 401) };
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

/* ============================ پرامپت مخ‌یار ============================ */

function mokhyarPrompt(user, styleId, modeId, again) {
  const p = (user && user.profile) || {};
  const tone = (TONES[styleId] || TONES.funny).t;
  const isAdult = !!(TONES[styleId] || {}).adult;
  const sim = modeId === "sim";
  let s =
    "تو «مخ‌یار» هستی؛ مشاور پیام‌رسان عاشقانه برای کاربر فارسی‌زبان که می‌خواهد با کراشش ارتباط بهتری بگیرد.\n" +
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
    "۷. کوتاه و کاربردی؛ بدون مقدمه‌چینی.\n";
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
  const sys = mokhyarPrompt(user, styleId, b.mode, !!b.again);
  const text = String(b.text || "").slice(0, 6000).trim();
  const content = (text || "این تصویر را ببین.") + (b.again ? "\n(لطفاً گزینه‌های جدید و متفاوت از قبل بده.)" : "");
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
  return [{ role: "system", content: sys }].concat(hist).concat([userMsg]);
}

async function callAi(user, messages, maxTokens, stream) {
  const ai = user.ai || {};
  const key = ai.key || "";
  if (!key) return { err: json({ ok: false, error: "no_key", message: "کلید API هوش مصنوعی را در تنظیمات وارد کنید" }, 400) };
  const base = ((ai.base && String(ai.base).trim()) || "https://api.openai.com/v1").replace(/\/+$/, "");
  if (!/^https?:\/\//.test(base)) return { err: json({ ok: false, error: "bad_base", message: "آدرس API نامعتبر است" }, 400) };
  const model = String(ai.model || "gpt-4o-mini").slice(0, 60);
  const headers = { "content-type": "application/json", authorization: "Bearer " + key };
  if (/openrouter\.ai/.test(base)) headers["X-Title"] = "Mokhyar";
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
    return { err: json({ ok: false, error: "ai_unreachable", message: "اتصال به سرویس هوش مصنوعی برقرار نشد — آدرس یا کلید را چک کنید" }, 502) };
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

/* ============================ GET ============================ */

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const seg = url.pathname.replace(/^\/api\/?/, "").split("/");

  if (seg[0] === "health") {
    return json({ ok: true, kv: !!(env && env.CONFIG), stats: !!(env && env.STATS), authEnv: !!(env && env.ADMIN_PASSWORD) });
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
      return json({ ok: false, error: "unauthorized", message: "رمز اشتباه است" }, 401);
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
        if (!Number.isFinite(y)) return json({ ok: false, error: "bad_year", message: "سال تولد را درست وارد کن" }, 400);
        if (y >= 1200 && y <= 1500) y = y + 621;
        const nowY = new Date().getUTCFullYear();
        if (y < 1930 || y > nowY) return json({ ok: false, error: "bad_year", message: "سال تولد را درست وارد کن" }, 400);
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
        if (key && !/^sk-[\w\-]{8,}$|^(sk-)?ant-[\w\-]{8,}$|^[\w\-]{20,}$/.test(key)) return json({ ok: false, error: "bad_key", message: "شکل کلید معتبر به نظر نمی‌رسد" }, 400);
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

  if (seg[0] === "config") {
    const cfg = await currentConfig(env);
    if (await authLocked(env && env.CONFIG)) return json({ ok: false, error: "locked", message: "تلاش زیاد؛ ۱۰ دقیقه صبر کن" }, 429);
    if (!isAuthed(request, env, cfg)) {
      await authFail(env && env.CONFIG);
      return json({ ok: false, error: "unauthorized", message: "رمز اشتباه است" }, 401);
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
    if (rateLimited(request, "auth", 12)) return json({ ok: false, error: "rate_limited", message: "تلاش زیاد؛ کمی صبر کنید" }, 429);
    const r = await readBody(request, 4096);
    if (r.err) return json({ ok: false, error: r.err || "bad_json" }, 400);
    const b = r.body || {};
    const username = String(b.username || "").toLowerCase().trim();
    const password = String(b.password || "");
    if (!/^[a-z0-9_]{3,24}$/.test(username)) return json({ ok: false, error: "bad_username", message: "یوزرنیم: ۳ تا ۲۴ حرف انگلیسی/عدد/_" }, 400);
    if (action !== "recover" && (password.length < 6 || password.length > 72)) return json({ ok: false, error: "bad_password", message: "رمز حداقل ۶ کاراکتر" }, 400);

    if (action === "register") {
      const exists = await env.CONFIG.get("useridx:" + username);
      if (exists) return json({ ok: false, error: "taken", message: "این یوزرنیم قبلاً گرفته شده" }, 409);
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
      if (!user || !user.recoveryHash) return json({ ok: false, error: "bad_login", message: "حسابی با این یوزرنیم پیدا نشد" }, 401);
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

  /* ---------- چت یار ---------- */
  if (seg[0] === "chat") {
    const u = await requireUser(request, env);
    if (u.err) return u.err;
    if (rateLimited(request, "chat", 20)) return json({ ok: false, error: "rate_limited", message: "سرعت زیاد؛ کمی صبر کنید" }, 429);
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
    if (!qText && !images.length) return json({ ok: false, error: "empty", message: "پیامی برای ارسال نیست" }, 400);
    const modeId = MODES[b.mode] ? b.mode : "reply";
    const messages = buildAiMessages(u.user, { ...b, style: styleId }, images);

    const saveChat = async (fullText) => {
      try {
        const h = await getHist(env, u.user.id);
        const LBL = { reply: "پاسخ", opener: "شروع", rewrite: "بازنویسی", analyze: "تحلیل", date: "قرار", sim: "شبیه‌ساز" };
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
