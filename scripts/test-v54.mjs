// تست دود v5.4 — تلگرام شخصی، چت دونفره‌ی دعوت‌نامه، کشف/مچ، بازی
import { chromium } from "playwright";
const BASE = "http://127.0.0.1:8080";
let failed = 0;
const check = (c, m) => { console.log((c ? "✅" : "❌") + " " + m); if (!c) failed++; };

const b = await chromium.launch();
const D = (p) => p.setDefaultTimeout(9000);

/* ---- کمکی: ثبت‌نام + لاگین ---- */
async function mkuser(uname) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: "fa-IR" });
  const p = await ctx.newPage(); D(p);
  await p.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(1500);
  await p.click('button[role="tab"]:has-text("تنظیمات"), [role="tab"]:has-text("تنظیمات")');
  await p.waitForTimeout(900);
  await p.click('button:has-text("حساب نداری؟")');
  await p.fill('input[autocomplete="username"]', uname);
  await p.fill('input[type="password"]', "secret123");
  await p.click('button[type="submit"]:has-text("ثبت‌نام")');
  await p.waitForTimeout(2600);
  await p.click('button:has-text("نوشتمش، بزن بریم")').catch(() => {});
  await p.waitForTimeout(700);
  await p.click('button:has-text("بی‌خیال، رد شو")').catch(() => {});
  await p.waitForTimeout(500);
  return p;
}

const ctx1 = await b.newContext({ viewport: { width: 390, height: 844 }, locale: "fa-IR" });

/* ================= ۱) لینک سریع با آیدی تلگرام خود سازنده ================= */
const ali = await mkuser("ali" + Date.now().toString(36).slice(-5));
await ali.click('[role="tab"]:has-text("ساخت")');
await ali.waitForTimeout(800);
await ali.fill('input[placeholder*="سارا"]', "سارا");
await ali.fill('input[placeholder="myusername"]', "ali_lover99");
await ali.waitForTimeout(400);
const qlink = await ali.locator(".link-txt").first().textContent();
check(/reply=ali_lover99/.test(qlink), "لینک سریع reply= داره: " + qlink.trim().slice(-40));

// سمت کرش: تا صفحه‌ی آخر بره و دکمه‌ی جواب به t.me/ali_lover99 بره
const cr = await ctx1.newPage(); D(cr);
await cr.goto(BASE + "/invite?name=سارا&reply=ali_lover99", { waitUntil: "domcontentloaded" });
await cr.waitForTimeout(3500);
await cr.locator('#scr-intro button:has-text("بزن بریم")').click(); await cr.waitForTimeout(800);
await cr.click(".screen"); await cr.waitForTimeout(250);
await cr.click('button:has-text("خب بپرس")'); await cr.waitForTimeout(800);
await cr.click("#yesBtn"); await cr.waitForTimeout(1000);
await cr.click("#scr-yes"); await cr.waitForTimeout(300);
await cr.locator("#yesBtnNext").click(); await cr.waitForTimeout(800);
await cr.locator("#scr-after button.btn").first().click(); await cr.waitForTimeout(2200);
await cr.locator("#scr-poem button.btn").first().click(); await cr.waitForTimeout(1200);
await cr.locator("#dateGrid .dcard").first().click(); await cr.waitForTimeout(1400);
await cr.locator("#scr-when .chips button").first().click(); await cr.waitForTimeout(250);
await cr.locator("#scr-when button.btn").first().click(); await cr.waitForTimeout(800);
await cr.locator("#scr-contract button.btn.primary").last().click(); await cr.waitForTimeout(1700);
const href = await cr.locator("a.reply-cta").getAttribute("href").catch(() => "");
check(/t\.me\/ali_lover99/.test(href || ""), "دکمه‌ی جواب → تلگرامِ خود سازنده: " + (href || "—").slice(0, 40));

/* ================= ۲) چت دونفره‌ی دعوت‌نامه‌ی شخصی ================= */
await ali.bringToFront();
await ali.click('button:has-text("جدید")');
await ali.fill('input[placeholder*="لیلا"]', "لیلا");
await ali.fill('.newinv input[placeholder="myusername"]', "ali_lover99");
await ali.click('button:has-text("بساز")');
await ali.waitForTimeout(1800);
const plink = await ali.locator('.link-txt:has-text("?i=")').first().textContent();
const slug = (plink.match(/i=([a-z0-9-]+)/) || [])[1];
check(!!slug, "دعوت‌نامه‌ی شخصی ساخته شد");

const ctx1b = await b.newContext({ viewport: { width: 390, height: 844 }, locale: "fa-IR" });
const cr2 = await ctx1b.newPage(); D(cr2);
await cr2.goto(BASE + "/invite?i=" + slug, { waitUntil: "domcontentloaded" });
await cr2.waitForTimeout(3500);
await cr2.locator('#scr-intro button:has-text("بزن بریم")').click(); await cr2.waitForTimeout(800);
await cr2.click(".screen"); await cr2.waitForTimeout(250);
await cr2.click('button:has-text("خب بپرس")'); await cr2.waitForTimeout(800);
await cr2.click("#yesBtn"); await cr2.waitForTimeout(1000);
await cr2.click("#scr-yes"); await cr2.waitForTimeout(300);
await cr2.locator("#yesBtnNext").click(); await cr2.waitForTimeout(800);
await cr2.locator("#scr-after button.btn").first().click(); await cr2.waitForTimeout(2200);
await cr2.locator("#scr-poem button.btn").first().click(); await cr2.waitForTimeout(1200);
await cr2.locator("#dateGrid .dcard").first().click(); await cr2.waitForTimeout(1400);
await cr2.locator("#scr-when .chips button").first().click(); await cr2.waitForTimeout(250);
await cr2.locator("#scr-when button.btn").first().click(); await cr2.waitForTimeout(800);
await cr2.locator("#scr-contract button.btn.primary").last().click(); await cr2.waitForTimeout(1700);
// چت: پیام بده
await cr2.fill(".ansinp", "سلام! کلم قلبمت رو دیدم، خیلی بامزه بود");
await cr2.click('.ansrow button:has-text("بفرست")');
await cr2.waitForTimeout(1500);
check(await cr2.locator(".ansmine").count() > 0, "پیام کرش تو چت نشون داده شد");

// سازنده جواب می‌ده از پنل
await ali.bringToFront();
await ali.reload({ waitUntil: "domcontentloaded" });
await ali.waitForTimeout(2000);
await ali.locator("button.hi-row").first().click();
await ali.waitForTimeout(1200);
await ali.click('button:has-text("پیام‌ها")');
await ali.waitForTimeout(1200);
await ali.fill('.im-row input', "خوش اومدی لیلا جان 😊 دلم برات تنگ شده بود");
await ali.click('.im-row button:has-text("بفرست")');
await ali.waitForTimeout(1500);
check(await ali.locator('.im-reply:has-text("تنگ شده بود")').count() > 0, "جواب سازنده ثبت شد");

// کرش جواب رو می‌بینه (پولینگ)
await cr2.bringToFront();
await cr2.waitForTimeout(6000);
check(await cr2.locator(".anstheir:has-text(\"تنگ شده بود\")").count() > 0, "چت دونفره: کرش جواب سازنده رو دید");
await cr2.screenshot({ path: "docs/shots/v54-01-invite-chat.png" });

/* ================= ۳) کشف: دو کاربر، مچ، چت ================= */
const sara = await mkuser("sara" + Date.now().toString(36).slice(-5));
const mana = await mkuser("mana" + Date.now().toString(36).slice(-5));

// هر دو بزرگسال بشن (سال تولد)
for (const p of [sara, mana]) {
  await p.click('[role="tab"]:has-text("تنظیمات")'); await p.waitForTimeout(700);
  await p.fill('input[placeholder="1376 یا 1998"]', "1375");
  await p.click('button:has-text("تأیید سن")').catch(() => p.click('button:has-text("سنم رو تأیید کن")'));
  await p.waitForTimeout(1200);
}

// کارت کشف هر دو روشن
for (const [p, city, bio] of [[sara, "تهران", "قهوه و رمان"], [mana, "تهران", "موزیک و گپ نصفه‌شب"]]) {
  await p.click('[role="tab"]:has-text("کشف")'); await p.waitForTimeout(1200);
  await p.fill('input[placeholder*="تهران"]', city);
  await p.fill("textarea", bio);
  await p.click('button:has-text("روشنم کن")');
  await p.waitForTimeout(1500);
}
await sara.reload({ waitUntil: "domcontentloaded" }); await sara.waitForTimeout(2800);
check(await sara.locator(".swipecard").count() > 0, "کارت کاندید برای سارا اومد");

// سارا لایک می‌کنه → هنوز مچ نه؛ مانا لایک می‌کنه → مچ!
await sara.click('button:has-text("خوشم اومد")'); await sara.waitForTimeout(1500);
check(await mana.locator(".swipecard").count() > 0, "کارت کاندید برای مانا اومد");
await mana.click('button:has-text("خوشم اومد")'); await mana.waitForTimeout(1800);
const matched = await mana.locator("text=مچ شدی").count() > 0 || (await mana.locator(".roomrow").count()) > 0;
check(matched, "مچ انجام شد و چت باز شد");

// چت دونفره‌ی مچ
await mana.click(".roomrow").catch(() => {});
await mana.waitForTimeout(1200);
await mana.fill(".ansinp", "سلام! کجای تهران هستی؟");
await mana.keyboard.press("Enter"); await mana.waitForTimeout(300);
await mana.locator(".roomrow .btn").last().click().catch(() => {});
await mana.waitForTimeout(1800);
check((await mana.locator(".dmsg.mine").count()) > 0, "پیام مانا رفت");

await sara.bringToFront();
await sara.reload({ waitUntil: "domcontentloaded" }); await sara.waitForTimeout(3000);
const rr = sara.locator(".roomrow").first();
if (await rr.count()) await rr.click().catch(() => {});
await sara.waitForSelector(".dmsg:not(.mine)", { timeout: 12000 }).catch(() => {});
const gotIt = await sara.locator('.dmsg:not(.mine):has-text("کجای تهران")').count() > 0;
if (!gotIt) console.log("   ↳ متن چت سارا:", ((await sara.locator(".roomchat").textContent().catch(() => "؟")) || "").replace(/\s+/g, " ").slice(0, 120));
check(gotIt, "سارا پیام مانا رو گرفت");
await sara.screenshot({ path: "docs/shots/v54-02-match-chat.png" });

/* ================= ۴) بازی ================= */
await sara.click('[role="tab"]:has-text("خانه")'); await sara.waitForTimeout(800);
await sara.click('.games-card'); await sara.waitForTimeout(700);
check(await sara.locator(".gpanel").count() > 0, "پنل بازی‌ها باز شد");
console.log("   ↳ gitem count:", await sara.locator(".gitem").count());
await sara.screenshot({ path: "/tmp/dbg-fail.png" });
await sara.locator(".gitem").nth(1).click({ force: true }); // حدس کلمه
await sara.waitForSelector(".wgk", { timeout: 6000 }).catch(() => {});
await sara.locator(".wgk").first().evaluate((el) => el.click());
await sara.waitForSelector(".wgk.good, .wgk.bad, .wgl.on", { timeout: 5000 }).catch(() => {});
check((await sara.locator(".wgk.good, .wgk.bad").count()) > 0 || (await sara.locator(".wgl.on").count()) > 0, "حدس کلمه: حرف زده شد");
await sara.locator('.gback').click({ force: true }); await sara.waitForTimeout(500);
await sara.locator('.gitem:has-text("دوز")').first().click({ force: true }); await sara.waitForTimeout(500);
await sara.locator(".ttc").first().click(); await sara.waitForTimeout(700);
check(await sara.locator(".ttc.bot, .ttc.me").count() >= 2, "دوز: بات جواب داد");
await sara.screenshot({ path: "docs/shots/v54-03-games.png" });
await mana.screenshot({ path: "docs/shots/v54-04-discover.png" }).catch(() => {});

await b.close();
console.log(failed ? `\n❌ ${failed} مورد شکست` : "\n🎉 همه‌ی تست‌های v5.4 سبز");
process.exit(failed ? 1 : 0);
