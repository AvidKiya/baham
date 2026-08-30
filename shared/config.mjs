// ---------------------------------------------------------------------------
// shared/config.mjs — ✏️ THE single source of truth for every text & setting.
// Imported by BOTH the Next.js app AND the Pages Function, so what you see in
// the admin panel, the invite page and the API always agree.
// (The admin panel writes overrides into KV at runtime; these are the defaults.)
// ---------------------------------------------------------------------------
export const DEFAULT_CONFIG = {
  // ---- who -----------------------------------------------------------------
  senderName: "",              // اسم خودت (اختیاری) — پایین صفحه و کارت پایانی
  recipientName: "",           // اسم پیش‌فرض او (وقتی لینک name نداشته باشد)
  demoName: "سارا",            // اسم نمونه در حالت /demo

  // ---- the big question ----------------------------------------------------
  question: "با من رل می‌زنی؟ ❤️",
  petPhrase: "خانومِ من",       // بعد از بله: «خب خانومِ من…»

  // ---- look & feel ---------------------------------------------------------
  theme: "romantic",           // romantic | violet | wine  (یا با ?theme= در لینک)
  themes: {
    romantic: { bg: "#0b0715", bg2: "#180c2e", acc: "#ff4f8b", acc2: "#c96bff", glow: "255,79,139" },
    violet:   { bg: "#0a0819", bg2: "#181040", acc: "#a06bff", acc2: "#ff5ec4", glow: "160,107,255" },
    wine:     { bg: "#130610", bg2: "#2b0c22", acc: "#ff3d71", acc2: "#c22e8f", glow: "255,61,113" },
    candy:    { bg: "#12081f", bg2: "#261045", acc: "#ff6fb5", acc2: "#5fd4ff", glow: "255,111,181" },
    sunset:   { bg: "#160a14", bg2: "#361229", acc: "#ff8a5c", acc2: "#d96bff", glow: "255,138,92" },
    mint:     { bg: "#071310", bg2: "#0e2620", acc: "#3fe0b0", acc2: "#8fb0ff", glow: "63,224,176" },
  },

  // ---- music (optional) ----------------------------------------------------
  // موزیک پیش‌فرض: یک قطعه‌ی اورجینال رمانتیک که همراه پروژه است.
  // اگر آهنگ خاصی می‌خواهی (مثلاً بیلی آیلیش/ویکند)، فقط لینک مستقیم mp3 را
  // در پنل مدیریت بچسبان — بدون هیچ تغییر کدی.
  music: "/assets/music/aurora-love.mp3",

  // ---- optional stickers (leave "" to use the built-in ones) ---------------
  // اگر خواستی استیکر دلخواه بذاری، آدرس تصویر (webp/png/gif) رو اینجا بذار.
  assets: {
    nervous:  "",   // قلبِ خجالتی — صفحه اول
    happy:    "",   // قلبِ خوشحال — کارت پایانی
    celebrate:"",   // قلبِ جشن — لحظه‌ی بله
    confused: "",   // قلبِ گیج — کنار جواب‌های «نه»
    date:     "",   // قرار اول
    sparkles: "",   // پیام‌های مخفی
    letter:   "",   // نامه‌ی عشق 💌
    roses:    "",   // رز 🌹
  },

  // ---- date options --------------------------------------------------------
  dateOptions: [
    { id: "cafe",     emoji: "☕", label: "کافه",            hint: "کتاب، قهوه و حرف‌زدن" },
    { id: "food",     emoji: "🍕", label: "یه چیزی بخوریم",  hint: "پیتزا همیشه جوابه" },
    { id: "cinema",   emoji: "🎬", label: "سینما",           hint: "فیلم رو با هم انتخاب کنیم" },
    { id: "drive",    emoji: "🌃", label: "یه دور دور",       hint: "مقصد مهم نیست" },
    { id: "cooking",  emoji: "🍳", label: "آشپزی دونفره‌ی خونه‌ای", hint: "با هم بپزیم، با هم بخوریم" },
    { id: "calm",     emoji: "🌙", label: "یه جای آروم",     hint: "فقط آروم و قشنگ" },
    { id: "picnic",   emoji: "🧺", label: "پیک‌نیک",           hint: "فرش، میان‌وعده و آفتاب" },
    { id: "icecream", emoji: "🍦", label: "بستنی‌فروشی",       hint: "دونفره یه بستنی" },
    { id: "karaoke",  emoji: "🎤", label: "کارائوکه",          hint: "بذار صدای خوشت رو نشونت بدم" },
    { id: "surprise", emoji: "🎁", label: "سورپرایز با تو",   hint: "انتخاب با خودت" },
  ],
  whenOptions: [
    { id: "w1", label: "این هفته ✨" },
    { id: "w2", label: "هفته‌ی بعد 🌱" },
    { id: "w3", label: "هر وقت تو بگی 🌷" },
  ],
  timeOptions: [
    { id: "t1", label: "عصر ☕" },
    { id: "t2", label: "شب 🌙" },
  ],

  // ---- the little contract -------------------------------------------------
  contractClauses: [
    "گاهی دلتنگ شدیم، حق داریم بگیم.",
    "قهر کردن آزاده؛ ولی طولانی‌شدنش ممنوع.",
    "قرارهای خوب باید زیاد باشن.",
    "خندیدن کنار هم اجباری نیست… ولی شدیداً توصیه می‌شه.",
    "هر وقت یکی ازمون «یه چیزی هست» گفت، اون یکی گوش می‌ده.",
  ],

  // ---- hidden messages (easter eggs) --------------------------------------
  secrets: [
    "راستش از همون اول می‌دونستم تو اینو پیدا می‌کنی؛ چون تو از اون آدمای خاصی 🤍",
    "این قلب کوچیک پایین صفحه، از اول به اسم تو می‌تپید ❤️",
    "ستاره‌ها هم از خبر بودن؛ فقط تو دیرتر فهمیدی ✨",
  ],

  // ---- optional, privacy-conscious stats ----------------------------------
  // فقط تعداد کلیک‌ها ذخیره می‌شود (بله / نه / قرار / …) — بدون IP، بدون کوکی.
  // کار می‌کند فقط اگر KV با نام STATS وصل کرده باشی (در wrangler.toml).
  // storeName: true یعنی اسم (هش‌نشده) هم ذخیره شود تا بفهمی کدوم لینک جواب داده.
  stats: {
    enabled: true,
    storeName: false,
    adminKey: "rol-admin-1234",   // ← حتماً عوضش کن! /api/stats?key=...
  },

  // ---- creator credit (همیشه پایین سایت و روی کارت نهایی) ------------------
  creator: {
    name: "Avid Kiya",
    fa: "اَوید کیا",
    username: "@AvidKiya",
    links: {
      instagram: "https://instagram.com/AvidKiya",
      telegram: "https://t.me/AvidKiya",
      x: "https://x.com/AvidKiya",
      github: "https://github.com/AvidKiya",
    },
  },

  // ---- reply (دکمه‌ی «جوابم رو خودم بگم» در صفحه‌ی پایانی) ------------------
  replyTo: {
    telegram: "AvidKiya",   // یوزرنیم تلگرام خودت (خالی = دکمه مخفی می‌شود)
    text: "سلام! جواب سؤالت رو می‌خوای بدونی؟ رسماً آره ❤️ قرارمون هم {date} ({when})",
  },

  // ---- مناسبت‌ها و شعر اختصاصی هر کدام --------------------------------------
  defaultOccasion: "love",
  occasions: [
    { id: "love", emoji: "💌", label: "رل زدن و دعوت عاشقانه", poet: "شهریار", verses: [
      ["شهریارت می‌شوم، دار و ندارم می‌شوی", "ماه رویم! اخترِ دنباله‌دارم می‌شوی"],
      ["صخره‌ام! یاد تو موجِ روزگاران من است", "بی‌قرارت می‌شوم اما قرارم می‌شوی"],
      ["روزی از این روزها دل را به دریا می‌زنم", "ناخدایت می‌شوم امیدوارم می‌شوی"],
      ["متهم نه! من که محکومم به عشقت نازنین", "شوره‌زارم من ولیکن لاله‌زارم می‌شوی"],
    ]},
    { id: "marriage", emoji: "🌹", label: "خواستگاری و ازدواج", poet: "سعدی و حافظ", verses: [
      ["دگران چون بروند از نظر از دل بروند", "تو چنان در دل من رفته که جان در بدن"],
      ["آن دم که با تو باشم یک سال هست روزی", "دانم که بی‌تو باشم یک لحظه هست سالی"],
      ["از صدای سخن عشق ندیدم خوش‌تر", "یادگاری که در این گنبد دوار بماند"],
    ]},
    { id: "friendship", emoji: "🌷", label: "دوستی و رفاقت", poet: "حافظ و سعدی", verses: [
      ["درختِ دوستی بنشان که کامِ دل به بار آرد", "نهالِ دشمنی بَرکَن که رنج بی‌شمار آرد"],
      ["شبِ صحبت غنیمت دان که بعد از روزگارِ ما", "بسی گردش کُنَد گردون، بسی لیل و نهار آرد"],
      ["دوست آن دانم که گیرد دستِ دوست", "در پریشان‌حالی و درماندگی"],
    ]},
    { id: "work", emoji: "🌱", label: "همکاری و شروع کار مشترک", poet: "سعدی و فردوسی", verses: [
      ["بنی‌آدم اعضای یک پیکرند", "که در آفرینش ز یک گوهرند"],
      ["چو عضوی به‌درد آورد روزگار", "دگر عضوها را نماند قرار"],
      ["توانا بود هر که دانا بود", "ز دانش دل پیر برنا بود"],
    ]},
  ],

  // ---- share ---------------------------------------------------------------
  finalShareText: "رسماً گفت آره ❤️",

  // ---- all the copy (به همین ترتیب توی صفحه‌ها می‌نشیند) --------------------
  text: {
    siteTitle: "یه سؤال کوچیک برای تو ❤️",
    siteDesc: "یه دعوت کوچیک، برای یه آدم خاص.",
    ogDesc: "همین که بازش کردی، نصف جواب رو دادی 👀",

    landingBadge: "یه دعوت‌نامه‌ی کوچیک 💌",
    landingH1a: "یه سؤال رو بپرس…",
    landingH1b: "بذار بله بگه ❤️",
    landingSub: "یه تجربه‌ی کوچیک و شخصی برای یه آدم خاص؛ لینکش رو بفرست، بقیه‌ش با دکمه‌ی «آره».",
    landingCta: "ساخت لینک شخصی ✨",
    landingTry: "تجربه‌ی نمونه 👀",
    landingFeatures: "بدون ثبت‌نام · بدون ردیابیِ اذیت‌کننده · فقط یه سؤال ☺️",

    introL1: "یه چیزی هست که مدت‌هاست می‌خوام بهت بگم…",
    introL2: "ولی گفتم شاید اینجوری قشنگ‌تر باشه 👀",
    introBtn: "بزن بریم ❤️",

    buildL1: "قول می‌دم طولانی نشه…",
    buildL2: "فقط یه سؤال کوچیک دارم.",
    buildL3: "ولی جوابش برام خیلی مهمه ❤️",
    buildSkip: "برای رد شدن سریع، لمس کن",
    buildBtn: "خب بپرس 😳",

    qPre: "خب…",
    yesBtn: "آره ❤️",
    noBtn: "نه 😐",
    noTaunts: [
      "عه؟ 😐 مطمئنی؟",
      "یه بار دیگه فکر کن 😂",
      "نه نگو دیگه 🥺",
      "این دکمه چرا اینقدر فراریه؟ 😂",
      "من هنوز امیدوارم ❤️",
      "به نظرت جایی برای فرار مونده؟ 😌",
      "دکمه‌ی نه داره خسته می‌شه…",
      "آخرین خبر: «نه» امروز تعطیله ❤️",
    ],

    yesL1: "جدی می‌گی؟ 😳",
    yesL2: "پس شد! 🥹",
    yesL3: "از امروز رسماً باید تحملم کنی 😂❤️",
    yesBtnNext: "خب، بعدش؟ ✨",

    afterL1: "خب {pet}…",
    afterL2: "حالا بریم سراغ اولین قرار؟ 👀",
    afterBtn: "آره، بریم 😌",
    poemTitle: "یه چیزی برات دارم 💌",
    poemBtn: "بریم سراغ قرار ✨",

    dateTitle: "اولین قرارمون کجا باشه؟ ❤️",
    datePicked: "انتخاب شد ❤️",
    whenTitle: "حالا کِی؟",
    whenTimeLabel: "چه ساعتی؟ (اختیاری)",
    whenBtn: "ثبت قرار ✨",

    contractTitle: "یه قرارداد کوچیک 😂❤️",
    contractFine: "* این قرارداد با یک قلب امضا می‌شود و اعتبار عاطفی کامل دارد.",
    contractSign: "امضا می‌کنم ❤️",
    contractLawyer: "نیاز به وکیل دارم 😂",
    contractLawyerMsg: "باشه… پس باید با وکیلم صحبت کنیم 😂",
    contractLawyerOk: "خب ببخشید، امضا می‌کنم ❤️",
    contractStamp: "مُهر و امضا شد ❤️",

    finalTitle: "قرارمون ثبت شد ❤️",
    finalSaid: "رسماً گفت آره!",
    finalDateRow: "اولین قرارمون",
    finalWhenRow: "کِی",
    finalNote: "حالا فقط مونده یه روز خوب براش پیدا کنیم 😌",
    finalSave: "این لحظه رو ذخیره کن 📸",
    replyBtn: "جوابم رو خودم بهت بگم 💌",
    finalShare: "اشتراک‌گذاری",
    finalAgain: "از اول",

    noGiveUp: "خب باشه، آره ❤️",
    noTitle: "باشه ❤️",
    noL1: "ممنون که صادق بودی.",
    noL2: "همین که جوابم رو دادی، برام ارزش داشت.",
    noL3: "امیدوارم همیشه خوشحال باشی 🌷",
    noAgain: "یه بار دیگه نگاه کن",
    noRestart: "از اول",

    resumeChip: "ادامه از جایی که موندیم",
    secretTitle: "خب… این یکی رو قرار نبود پیدا کنی 👀",
    secretClose: "باشه باشه، رفتم 😂",
    musicLabel: "موسیقی",
    madeWith: "ساخته‌شده با ❤️ و کمی جسارت",

    builderTitle: "لینک شخصی‌ات رو بساز",
    builderNamePh: "اسمش چیه؟",
    builderCopy: "کپی لینک",
    builderOpen: "باز کردن",
    builderShare: "فرستادن",
    copied: "کپی شد ✨",
  },
};

// deep-merge stored KV overrides on top of the defaults
export function mergeConfig(base, patch) {
  if (!patch || typeof patch !== "object") return base;
  const out = Array.isArray(base) ? base.slice() : { ...base };
  for (const k of Object.keys(patch)) {
    const bv = base ? base[k] : undefined;
    const pv = patch[k];
    if (pv === undefined || pv === null) continue;
    if (Array.isArray(bv) || Array.isArray(pv)) {
      if (Array.isArray(pv)) out[k] = pv;
    } else if (bv && typeof bv === "object" && pv && typeof pv === "object") {
      out[k] = mergeConfig(bv, pv);
    } else if (typeof bv === "undefined" || typeof bv === typeof pv) {
      out[k] = pv;
    }
  }
  return out;
}
