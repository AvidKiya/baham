// تست دود v5.7 — ترکر PMS، راهنمای پارتنر، روزشمار، مناسبت‌ها
import { chromium } from "playwright";
const BASE = "http://127.0.0.1:8080";
let failed = 0;
const check = (c, m) => { console.log((c ? "✅" : "❌") + " " + m); if (!c) failed++; };
const isoD = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return isoD(d); };

const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
p.setDefaultTimeout(9000);
await p.goto(BASE + "/", { waitUntil: "domcontentloaded" }); await p.waitForTimeout(1600);

/* ۱) تب «ما» وجود داره */
check(await p.locator('[role="tab"]:has-text("ما")').count() > 0, "۱) تب «ما» هست");

/* ۲) حالت خالی → ثبت امروز → فاز قاعدگی */
await p.click('[role="tab"]:has-text("ما")'); await p.waitForTimeout(700);
check(await p.locator('text=امروز شروع شد').count() >= 1, "۲) حالت خالی با دکمه‌ی ثبت");
await p.locator('.pmscard button:has-text("امروز شروع شد")').click(); await p.waitForTimeout(700);
const phTxt = (await p.locator(".phasebox").textContent().catch(() => "")).replace(/\s+/g, " ");
check(phTxt.includes("روزای پریود") && phTxt.includes("روز ۱"), "۲ب) فاز قاعدگی روز ۱: " + phTxt.slice(0, 40));
check(await p.locator(".statrow b").first().textContent() === "۲۸" || phTxt.includes("۲۸"), "۲ج) پیش‌بینی ۲۸ روزه (پیش‌فرض)");

/* ۳) راهنمای پارتنر */
await p.locator('button:has-text("راهنمای پارتنر")').click(); await p.waitForTimeout(500);
const tips = (await p.locator(".ptips").textContent().catch(() => "")).replace(/\s+/g, " ");
check(tips.includes("چیکار کنی") && tips.includes("چیکار نکنی"), "۳) راهنمای پارتنر باز شد");
check(tips.includes("سوپرایز") && tips.includes("جمله‌ی خوب"), "۳ب) سوپرایز و جمله‌ی خوب هست");

/* ۴) حذف ثبت */
await p.locator('button:has-text("آخرین ثبت")').click(); await p.waitForTimeout(500);
check(await p.locator(".phasebox").count() === 0, "۴) حذف ثبت → خالی");

/* ۵) لاگ ۲۴ روز پیش → PMS */
await p.evaluate((d) => localStorage.setItem("mk:pms", JSON.stringify({ logs: [d], len: 5, notif: true })), daysAgo(24));
await p.reload({ waitUntil: "domcontentloaded" }); await p.waitForTimeout(1200);
await p.click('[role="tab"]:has-text("ما")'); await p.waitForTimeout(700);
const ph2 = (await p.locator(".phasebox").textContent().catch(() => "")).replace(/\s+/g, " ");
check(ph2.includes("روزای حساس"), "۵) روز ۲۴ → فاز PMS");

/* ۶) موعد امروز → هشدار */
await p.evaluate((d) => localStorage.setItem("mk:pms", JSON.stringify({ logs: [d], len: 5, notif: true })), daysAgo(28));
await p.reload({ waitUntil: "domcontentloaded" }); await p.waitForTimeout(1200);
await p.click('[role="tab"]:has-text("ما")'); await p.waitForTimeout(700);
check(await p.locator(".pms-alert").count() > 0, "۶) هشدار موعد امروز");

/* ۷) روزشمار رابطه */
const d100 = daysAgo(100);
await p.locator('.card:has-text("چند روزه کنارید") input[type="date"]').fill(d100);
await p.waitForTimeout(700);
const daysTxt = (await p.locator(".daysbig").textContent().catch(() => "")).replace(/\s+/g, " ");
check(daysTxt.includes("۱۰۰") && daysTxt.includes("روز کناریم"), "۷) روزشمار: " + daysTxt.slice(0, 24));
check(await p.locator('text=/روز تا مایل‌استون/').count() > 0, "۷ب) مایل‌استون بعدی شمرده شد");

/* ۸) مناسبت‌ها: امروز و آینده */
await p.locator('.occ-add input[dir="rtl"]').fill("تولد لیلا");
await p.locator('.occ-add input[type="date"]').fill(isoD(new Date()));
await p.locator('.occ-add button').click(); await p.waitForTimeout(600);
check(await p.locator(".occrow:has-text('تولد لیلا')").count() > 0, "۸) مناسبت اضافه شد");
check(await p.locator(".occrow:has-text('امروزه')").count() > 0, "۸ب) مناسبت امروز تشخیص داده شد");
const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 10);
await p.locator('.occ-add input[dir="rtl"]').fill("سالگرد اولین قرار");
await p.locator('.occ-add input[type="date"]').fill(isoD(tomorrow));
await p.locator('.occ-add button').click(); await p.waitForTimeout(600);
check(await p.locator(".occrow:has-text('۱۰ روز مونده')").count() > 0, "۸ج) شمارش معکوس ۱۰ روزه");
check(await p.locator(".gift-chip").count() >= 2, "۸د) پیشنهاد کادو برای هر مناسبت");

await p.screenshot({ path: "docs/shots/v57-01-us-tab.png", fullPage: true });

await b.close();
console.log(failed ? `\n❌ ${failed} مورد شکست` : "\n🎉 همه‌ی تست‌های v5.7 سبز");
process.exit(failed ? 1 : 0);
