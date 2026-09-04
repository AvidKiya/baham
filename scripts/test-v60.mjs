// تست دود v6.0 — سوپراپ رابطه: هاب «ما»، مغز رابطه، مودهای جدید چت‌یار، حریم خصوصی
import { chromium } from "playwright";
const BASE = "http://127.0.0.1:8080";
let failed = 0;
const check = (c, m) => { console.log((c ? "✅" : "❌") + " " + m); if (!c) failed++; };

const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
p.setDefaultTimeout(9000);
p.on("dialog", (d) => d.accept().catch(() => {}));
await p.goto(BASE + "/", { waitUntil: "domcontentloaded" }); await p.waitForTimeout(1600);

const us = async () => { await p.click('[role="tab"]:has-text("ما")'); await p.waitForTimeout(500); };

/* ۱) هاب ۴ بخشی */
await us();
check(await p.locator(".usegs .seg-btn").count() === 5, "۱) هاب «ما» با ۵ سگمنت");
check((await p.locator(".usegs").textContent()).includes("چرخه") && (await p.locator(".usegs").textContent()).includes("رشد"), "۱ب) سگمنت‌ها: چرخه…رشد");
await p.locator('.pmscard button:has-text("امروز شروع شد")').click(); await p.waitForTimeout(500);
check(await p.locator(".phasebox").count() === 1, "۱ج) ثبت پریود → فاز نمایش داده شد (برای تست wipe)");

/* ۲) حال روزانه */
await p.click('.seg-btn:has-text("حال و شناخت")'); await p.waitForTimeout(400);
await p.locator(".moodbtn").nth(2).click(); await p.waitForTimeout(400);
check(await p.locator(".moodbtn.sel").count() === 1, "۲) ثبت حال روزانه");
check(await p.locator(".moodstrip span").count() >= 1, "۲ب) نوار ۷ روز اخیر");

/* ۳) آزمون زبان عشق — ۵ سؤال */
for (let i = 0; i < 5; i++) { await p.locator(".qopt").first().click(); await p.waitForTimeout(300); }
await p.waitForTimeout(400);
const llTxt = (await p.locator(".llbox, .ccard").first().textContent().catch(() => ""));
check(await p.locator(".llbox").count() === 1 && llTxt.length > 0, "۳) آزمون زبان عشق کامل شد و نتیجه آمد");

/* ۴) مغز رابطه */
await p.click('.seg-btn:has-text("پارتنرمن")'); await p.waitForTimeout(400);
await p.locator('input[placeholder*="نازنین"]').fill("نازنین");
await p.locator('button:has-text("سیو کن")').click(); await p.waitForTimeout(500);
check(await p.locator(".mini-ok.big").count() === 1, "۴) مغز رابطه: ذخیره‌ی پروفایل پارتنر");

/* ۵) یه چیزی گفته بود */
await p.locator('input[placeholder*="رستوران"]').fill("گفت دلش می‌خواد بره اون رستوران کنار دریا");
await p.locator('button:has-text("ثبت")').first().click(); await p.waitForTimeout(400);
check(await p.locator(".occrow:has-text(\"رستوران\")").count() === 1, "۵) ثبت خواسته در «یه چیزی گفته بود…»");

/* ۶) هدیه‌یاب */
check(await p.locator(".giftbox").count() >= 1, "۶) هدیه‌یاب پیشنهاد می‌دهد");
await p.locator('.occ-chip:has-text("خاص")').click(); await p.waitForTimeout(300);
const g1 = await p.locator(".big-gift").textContent();
await p.locator('button:has-text("یه پیشنهاد دیگه")').click(); await p.waitForTimeout(300);
const g2 = await p.locator(".big-gift").textContent();
check(g1.length > 3 && g2.length > 3, "۶ب) پیشنهاد هدیه با بودجه «خاص»");

/* ۷) سلامت رابطه */
await p.click('.seg-btn:has-text("رشد")'); await p.waitForTimeout(400);
check(await p.locator(".scorerow").count() === 7, "۷) امتیازدهی ۷ بُعدی");
await p.locator('button:has-text("ثبت امتیاز")').click(); await p.waitForTimeout(400);
check((await p.locator(".scoreres").textContent()).includes("۳/۵"), "۷ب) میانگین پیش‌فرض ۳/۵");

/* ۸) چک‌این هفتگی */
await p.locator(".ccard .field .inp").first().fill("بیشتر وقت‌ها خوبیم");
await p.locator('button:has-text("ثبت چک‌این")').click(); await p.waitForTimeout(400);
check(await p.locator(".mini-ok.big:has-text(\"ثبت شد\")").count() === 1, "۸) چک‌این هفتگی ثبت شد");

/* ۹) چالش ۷ روزه */
await p.locator('button:has-text("شروع چالش")').click(); await p.waitForTimeout(400);
check(await p.locator(".chbar .chd").count() === 7, "۹) چالش ۷ روزه شروع شد");
await p.locator('button:has-text("انجامش دادم")').click(); await p.waitForTimeout(400);
check(await p.locator(".chbar .chd.on").count() === 1, "۹ب) روز ۱ تیک خورد");

/* ۱۰) صندوق حرف‌های ناگفته */
await p.locator(".ccard textarea").fill("وقتی با گوشی حرف می‌زنی حس می‌کنم نیستم");
await p.locator('button:has-text("بازنویسی کن")').click(); await p.waitForTimeout(400);
const soft = await p.locator(".giftbox .gift-one").first().textContent();
check(soft.includes("احترام") || soft.includes("می‌خوام") || soft.includes("مستقیم"), "۱۰) بازنویسی نرم حرف سخت");

/* ۱۱) مدرسه‌ی رابطه */
check(await p.locator(".lesson").count() === 7, "۱۱) ۷ درس مدرسه‌ی رابطه");
await p.locator(".lesson .hi-row").first().click(); await p.waitForTimeout(300);
check(await p.locator(".lesson-body").first().isVisible(), "۱۱ب) باز شدن متن درس");

/* ۱۲) مودهای جدید چت‌یار (چت‌یار حساب می‌خواهد) */
const J = { "content-type": "application/json" };
const uname = "v6" + Date.now().toString(36).slice(-6);
await fetch(BASE + "/api/auth/register", { method: "POST", headers: J, body: JSON.stringify({ username: uname, password: "test1234" }) });
const lg = await (await fetch(BASE + "/api/auth/login", { method: "POST", headers: J, body: JSON.stringify({ username: uname, password: "test1234" }) })).json();
check(!!(lg.ok && lg.token), "۱۲) کاربر آزمایشی ساخته و وارد شد");
const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 } });
await ctx2.addInitScript(([t, u]) => { try { localStorage.setItem("mk:token", t); localStorage.setItem("mk:user", u); } catch {} }, [lg.token, JSON.stringify(lg.user || {})]);
const p2 = await ctx2.newPage();
p2.setDefaultTimeout(9000);
await p2.goto(BASE + "/", { waitUntil: "domcontentloaded" }); await p2.waitForTimeout(1600);
await p2.click('[role="tab"]:has-text("چت‌یار")'); await p2.waitForTimeout(700);
for (const t of ["آشتی", "موضوع حساس", "الان چی بگم؟"]) {
  check(await p2.locator('.mode-chip:has-text("' + t + '")').count() === 1, "۱۲ب) مود «" + t + "» در چت‌یار");
}
await p2.locator('.mode-chip:has-text("آشتی")').click(); await p2.waitForTimeout(400);
check((await p2.locator("textarea.ctxt").getAttribute("placeholder") || "").includes("چه گذشته"), "۱۲ج) placeholder مود آشتی");
await ctx2.close();

/* ۱۳) قفل PIN */
await us();
await p.locator('button:has-text("قفل بذار")').scrollIntoViewIfNeeded();
await p.locator('input[placeholder*="پین جدید"]').fill("1378");
await p.locator('button:has-text("قفل بذار")').click(); await p.waitForTimeout(400);
await p.reload({ waitUntil: "domcontentloaded" }); await p.waitForTimeout(1500); await us();
check(await p.locator(".pinbox").count() === 1, "۱۳) بعد از رفرش، تب «ما» قفل است");
await p.locator(".pininp").fill("1378");
await p.locator('button:has-text("بازش کن")').click(); await p.waitForTimeout(500);
check(await p.locator(".usegs").count() === 1, "۱۳ب) باز شدن با PIN درست");

/* ۱۴) پاک‌سازی کامل */
await p.locator('button:has-text("پاک کردن همه")').scrollIntoViewIfNeeded();
await p.locator('button:has-text("پاک کردن همه")').click(); await p.waitForTimeout(700);
await p.reload({ waitUntil: "domcontentloaded" }); await p.waitForTimeout(1500); await us();
check(await p.locator(".pinbox").count() === 0, "۱۴) بعد از wipe، قلب PIN هم پاک شد");
check((await p.locator(".pmscard").textContent()).includes("اولین روز پریود"), "۱۴ب) داده‌های «ما» صفر شدند");

await b.close();
console.log(failed ? "\n❌ " + failed + " مورد شکست" : "\n🎉 همه‌ی تست‌های v6.0 سبز");
process.exit(failed ? 1 : 0);
