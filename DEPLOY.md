# 🚀 راهنمای دیپلوی باهم روی Cloudflare

> فرانت‌ت کاملاً استاتیکه (`out/`) و بک‌اندت یه فایل Pages Functionه (`functions/api/[[route]].js`).
> کل کار حدود **۱۵ دقیقه** طول می‌کشه و با **روش ۱** حتی نیازی به ترمینال نداری.

---

## روش ۱: با داشبورد (پیشنهادی، بدون ترمینال) 🖱️

### قدم ۱ — اتصال گیت‌هاب

1. کد رو بفرست روی یه ریپوی گیت‌هاب (پرایوت هم اوکیه).
2. برو به [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
3. ریپو رو انتخاب کن و این تنظیمات بیلد رو بده:

| گزینه | مقدار |
|---|---|
| Framework preset | **Next.js (Static HTML Export)** |
| Build command | `npm run build` |
| Build output directory | `out` |
| Root directory | (خالی — اگه کد توی روت ریپوست) |

4. **Deploy site** رو بزن. ✅ فرانت بالا میاد ولی API هنوز KV نداره — ادامه بده.

### قدم ۲ — ساخت KV ها (دیتابیس)

1. توی همون اکانت برو به **Workers & Pages** → **KV** → **Create a namespace** و دو تا بساز:
   - `baham-config` (اصلی: یوزرها، جفت‌ها، فضای ما، پوش…)
   - `baham-stats` (آمار؛ اگه حوصله نداری می‌تونی همون اولی رو دوباره بایند کنی)
2. برگرد به پروژه‌ی Pages → **Settings** → **Functions** → **KV namespace bindings** → **Add binding**:

| Variable name | KV namespace |
|---|---|
| `CONFIG` | `baham-config` |
| `STATS` | `baham-stats` |

> ⚠️ اسم‌ها باید **دقیقاً** همین باشن (حروف بزرگ). برای هر دو Environment یعنی **Production** و **Preview** اضافه کن.

### قدم ۳ — سکرت‌ها (مهم! 🔑)

توی همون صفحه‌ی **Settings** → **Environment variables** → برای **Production** (و Preview) این دو تا رو **Add variable** کن (تیک **Encrypt** روشن):

| نام | مقدار | توضیح |
|---|---|---|
| `ADMIN_PASSWORD` | یه رمز قوی و طولانی | رمز ورود پنل ادمین (`/admin`) |
| `AUTH_SECRET` | یه رشته‌ی تصادفی طولانی (مثلاً ۴۰ کاراکتر) | امضای توکن‌های ورود — مهمه که حدس‌زدنی نباشه |

> برای ساخت رشته‌ی تصادفی می‌تونی از [randomkeygen.com](https://randomkeygen.com) استفاده کنی.

### قدم ۴ — دیپلوی مجدد

1. برو به **Deployments** → روی آخرین دیپلوی **…** → **Retry deployment** (تا KV و سکرت‌ها اعمال بشن).
2. وقتی سبز شد، این آدرس رو باز کن:

```
https://BAHAM.pages.dev/api/health
```

اگه دیدی یعنی همه‌چیز وصله: 🎉

```json
{"ok":true,"kv":true,"stats":true,"authEnv":true}
```

### قدم ۵ — تست واقعی ✅

1. ثبت‌نام کن → وارد شو.
2. از «فضای ما» یه لینک جفت‌سازی بساز و با یه مرورگر دیگه (یا حالت ناشناس) وصل شو.
3. یه خاطره/پیام بفرست و ببین سینک می‌شه.
4. پنل ادمین: `https://BAHAM.pages.dev/admin` با `ADMIN_PASSWORD`.

### قدم ۶ (اختیاری) — دامنه‌ی خودت

**Custom domains** → **Set up a custom domain** → مثلاً `baham.ir`. اگه DNS دامنه‌ت روی Cloudflare نیست، خودش راهنمایی‌ت می‌کنه.

---

## روش ۲: با ترمینال (wrangler) ⌨️

```bash
# ۱. نصب و ورود
npm i -g wrangler
wrangler login

# ۲. ساخت KV ها (id ها رو بهت میده — بذار توی wrangler.toml)
wrangler kv namespace create baham-config
wrangler kv namespace create baham-stats

# ۳. بیلد و دیپلوی
npm run build
wrangler pages deploy out --project-name=baham

# ۴. سکرت‌ها (تک‌تک ازت مقدار می‌خواد)
wrangler pages secret put ADMIN_PASSWORD --project-name=baham
wrangler pages secret put AUTH_SECRET --project-name=baham
```

> نکته: با این روش، هر بار که کد رو عوض کردی فقط `npm run build` و `wrangler pages deploy out` رو تکرار کن.

---

## ⚙️ چیزایی که خودکارن (کاری لازم نداره)

| چیز | چطور کار می‌کنه |
|---|---|
| کلید VAPID پوش | اولین بار خودکار ساخته و توی KV ذخیره می‌شه |
| درگاه زرین‌پال | مرچنت و قیمت‌ها رو از داخل **پنل ادمین** ست می‌کنی (توی KV می‌ره) |
| کد فعال‌سازی پلاس | از داخل **پنل ادمین** می‌سازی |

## 🐛 عیب‌یابی

| مشکل | راه‌حل |
|---|---|
| `/api/health` می‌گه `kv:false` | بایندینگ `CONFIG` رو چک کن + **Retry deployment** |
| خطای `501 no_kv` | یعنی بایندینگ KV وصل نیست (قدم ۲) |
| ورود به `/admin` کار نمی‌کنه | `ADMIN_PASSWORD` ست نشده یا اشتباهه |
| از یه گوشی لاگین می‌پری | `AUTH_SECRET` رو ست کن (وگرنه با هر دیپلوی عوض می‌شه!) |
| ویس/تماس/لوکیشن کار نمی‌کنه | باید با **HTTPS** باز کنی (مرورگر روی HTTP اجازه نمی‌ده) |
| لاگ خطا می‌خوای | پروژه → **Logs** → لاگ زنده‌ی Functions رو ببین |

---

## 💰 هزینه

پلن رایگان Cloudflare برای شروع کافیه (۱۰۰هزار ریکوئست Function در روز + ۱ گیگ KV). وقتی کاربرات زیاد شدن، پلن Workers Paid ماهی ۵ دلاره.
