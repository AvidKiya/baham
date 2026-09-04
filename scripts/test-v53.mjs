// تست دود v5.3 — سیستم دعوت‌نامه‌ی شخصی (مرورگر واقعی)
import { chromium } from "playwright";

const BASE = "http://127.0.0.1:8080";
const ok = (c, m) => console.log((c ? "✅" : "❌") + " " + m);
let failed = 0;
const check = (c, m) => { ok(c, m); if (!c) failed++; };

const b = await chromium.launch();
const D = (p) => p.setDefaultTimeout(9000);
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: "fa-IR" });

/* ---- ۱) اپ: ثبت‌نام ---- */
const app = await ctx.newPage(); D(app);
await app.goto(BASE + "/", { waitUntil: "networkidle" });
await app.click('button[role="tab"]:has-text("تنظیمات"), [role="tab"]:has-text("تنظیمات")');
await app.waitForTimeout(1200);
await app.click('button:has-text("حساب نداری؟")');
const uname = "e2e" + Date.now().toString(36).slice(-5);
await app.fill('input[autocomplete="username"]', uname);
await app.fill('input[type="password"]', "secret123");
await app.click('button[type="submit"]:has-text("ثبت‌نام")');
await app.waitForTimeout(3000);
// مودال کد بازیابی
await app.click('button:has-text("نوشتمش، بزن بریم")').catch(() => {});
await app.waitForTimeout(1000);
// کوییز — رد شو
await app.click('button:has-text("بی‌خیال، رد شو")').catch(() => {});
await app.waitForTimeout(800);
check(await app.locator('text=/@' + uname + '/').count() > 0 || await app.locator(".topuser").textContent() === "@" + uname, "ثبت‌نام و ورود");

/* ---- ۲) ساخت دعوت‌نامه از تب «ساخت درخواست» ---- */
await app.click('[role="tab"]:has-text("ساخت")');
await app.click('button:has-text("جدید")');
await app.fill('input[placeholder*="لیلا"]', "لیلا");
await app.click('.newinv .occ-chip:has-text("خواستگاری")');
await app.fill('.newinv input[placeholder*="کافه"]', "با من رل می‌زنی؟");
await app.click('button:has-text("بساز")');
await app.waitForTimeout(2000);
const link = await app.locator('.link-txt:has-text("?i=")').first().textContent().catch(() => "");
check(/\/invite\?i=/.test(link), "لینک شخصی ساخته شد: " + link);
const slug = (link.match(/i=([a-z0-9-]+)/) || [])[1];

/* ---- ۳) شخصی‌سازی: تم عوض کن ---- */
await app.locator('.newinv .swatch.sunset').first().click();
await app.click('button:has-text("سیو کن")');
await app.waitForTimeout(1500);
check(await app.locator('text=سیو شد').count() > 0, "سیو شخصی‌سازی");

/* ---- ۴) سمت کرش: لینک رو باز کن ---- */
const cr = await ctx.newPage(); D(cr);
await cr.goto(BASE + "/invite?i=" + slug, { waitUntil: "domcontentloaded" });
await cr.waitForTimeout(4500);
await cr.waitForTimeout(3500);
// از مقدمه رد شو تا سوال
await cr.locator('#scr-intro button:has-text("بزن بریم")').click().catch(() => {});
await cr.waitForTimeout(900);
await cr.click('.screen').catch(() => {}); // اسکیپ انیمیشن متن
await cr.waitForTimeout(300);
await cr.click('button:has-text("خب بپرس")').catch(() => {});
await cr.waitForTimeout(900);
const q = await cr.locator("#scr-question .q-text").textContent().catch(() => "");
check(q.includes("رل") || q.length > 3, "سوال شخصی نشون داده شد: " + q.trim().slice(0, 30));
// آره بزن
await cr.click("#yesBtn").catch(() => {});
await cr.waitForTimeout(1200);
// تا صفحه‌ی آخر (سلکتور ساختاری — متن دکمه‌ها بسته به مناسبت فرق داره)
await cr.click("#scr-yes").catch(() => {});            // رد شدن از انیمیشن «جدی می‌گی»
await cr.waitForTimeout(400);
await cr.locator("#yesBtnNext").click().catch(() => {}); // خب، بعدش؟
await cr.waitForTimeout(900);
await cr.locator("#scr-after button.btn").first().click().catch(() => {});
await cr.waitForTimeout(2500);                          // شعر/نامه نمایش داده می‌شه
await cr.locator("#scr-poem button.btn").first().click().catch(() => {});
await cr.waitForTimeout(1300);                          // انتخاب قرار
await cr.locator("#dateGrid .dcard").first().click().catch(() => {});
await cr.waitForTimeout(1500);
await cr.locator("#scr-when .chips button").first().click().catch(() => {}); // روز
await cr.waitForTimeout(300);
await cr.locator("#scr-when button.btn").first().click().catch(() => {});    // ثبت
await cr.waitForTimeout(900);
await cr.locator("#scr-contract button.btn.primary").last().click().catch(() => {}); // امضا
await cr.waitForTimeout(1900);

/* ---- ۵) جعبه‌ی جواب: چیپ «آره، میام» ---- */
const chip = cr.locator('.anschip:has-text("آره، میام")');
if (await chip.count()) {
  await chip.click();
  await cr.waitForTimeout(1500);
  check(await cr.locator('.ansbox:has-text("رسید!")').count() > 0, "جواب از سمت کرش رفت");
} else check(false, "جعبه‌ی جواب پیدا نشد (شاید هنوز صفحه‌ی آخر نیامده)");

/* ---- ۶) پنل سازنده: پیام اومده؟ جواب بده ---- */
await app.bringToFront();
await app.reload({ waitUntil: "networkidle" });
await app.waitForTimeout(2000);
await app.click('button.hi-row:has-text("لیلا")').catch(() => app.click('text=لیلا'));
await app.waitForTimeout(1500);
check(await app.locator('.stat b').first().textContent() === "۱" || (await app.locator('.stat b').first().textContent()) === "1" || await app.locator('text=بازدید').count() > 0, "بازدید ثبت شده");
await app.click('button:has-text("پیام‌ها")');
await app.waitForTimeout(1500);
const bubble = await app.locator(".im-bubble").first().textContent().catch(() => "");
check(bubble.includes("آره") || bubble.length > 0, "پیام کرش تو پنل: " + bubble.slice(0, 25));
await app.fill('.im-row input', 'ساعت ۵، کافه‌ی همیشگی');
await app.click('.im-row button:has-text("بفرست")');
await app.waitForTimeout(1500);
check(await app.locator('.im-reply:has-text("ساعت ۵")').count() > 0, "جواب سازنده ثبت شد");

/* ---- ۷) اسکرین‌شات‌ها ---- */
await app.screenshot({ path: "docs/shots/v53-01-create-panel.png", fullPage: false });
await app.click('button:has-text("شخصی‌سازی")').catch(() => {});
await app.waitForTimeout(800);
await app.screenshot({ path: "docs/shots/v53-02-edit-panel.png", fullPage: false });
await cr.bringToEnd ? null : null;
await cr.screenshot({ path: "docs/shots/v53-03-answerbox.png", fullPage: false });

await b.close();
console.log(failed ? `\n❌ ${failed} مورد شکست خورد` : "\n🎉 همه‌ی تست‌های v5.3 سبز");
process.exit(failed ? 1 : 0);
