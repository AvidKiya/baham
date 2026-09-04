// تست دود v6.1 — SOS شناور، مغز رابطه در چت، ۴ مود جدید، قرارساز، این‌یا‌اون، پایان پریود، هدیه‌ی مناسبت
import { chromium } from "playwright";
const BASE = "http://127.0.0.1:8080";
let failed = 0;
const check = (c, m) => { console.log((c ? "✅" : "❌") + " " + m); if (!c) failed++; };
const DAY = 86400000;
const isoD = (d) => { const t = new Date(d); return t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0"); };

const b = await chromium.launch();

/* ---------- بخش ۱: مهمان — دکمه‌ی شناور SOS ---------- */
{
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  p.setDefaultTimeout(9000);
  await p.goto(BASE + "/", { waitUntil: "domcontentloaded" }); await p.waitForTimeout(1600);
  check(await p.locator(".sosfab").count() === 1, "۱) دکمه‌ی شناور «الان چی بگم؟» در کل اپ");
  await p.click(".sosfab"); await p.waitForTimeout(400);
  check(await p.locator(".sossheet").count() === 1, "۲) شیت SOS باز شد");
  check(await p.locator(".sospick").count() === 4, "۳) ۴ وضعیت سریع");
  await p.locator(".sospick").first().click(); await p.waitForTimeout(300);
  check(await p.locator(".sosans-one").count() === 3, "۴) ۳ جواب آماده‌ی محلی (بدون AI)");
  await p.locator(".sosans-one").first().click(); await p.waitForTimeout(300);
  check((await p.locator(".sosans-one b").first().textContent()) === "کپی شد", "۵) کپی با یک لمس");
  await p.click(".sos-head button"); await p.waitForTimeout(300);
  check(await p.locator(".sossheet").count() === 0, "۶) بستن شیت");
  await p.close();
}

/* ---------- بخش ۲: کاربر لاگین‌شده — چت‌یار و تب ما ---------- */
const J = { "content-type": "application/json" };
const uname = "v61" + Date.now().toString(36).slice(-6);
await fetch(BASE + "/api/auth/register", { method: "POST", headers: J, body: JSON.stringify({ username: uname, password: "test1234" }) });
const lg = await (await fetch(BASE + "/api/auth/login", { method: "POST", headers: J, body: JSON.stringify({ username: uname, password: "test1234" }) })).json();
check(!!lg.token, "۷) کاربر آزمایشی");
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
await ctx.addInitScript(([t, u]) => { try { localStorage.setItem("mk:token", t); localStorage.setItem("mk:user", u); } catch {} }, [lg.token, JSON.stringify(lg.user || {})]);
const p = await ctx.newPage();
p.setDefaultTimeout(9000);
await p.goto(BASE + "/", { waitUntil: "domcontentloaded" }); await p.waitForTimeout(1600);

/* SOS → چت‌یار */
await p.click(".sosfab"); await p.waitForTimeout(400);
await p.locator('.sospick:has-text("سرد شده")').click(); await p.waitForTimeout(250);
await p.locator('button:has-text("جواب شخصی‌تر از چت‌یار")').click(); await p.waitForTimeout(700);
check(await p.locator('.mode-chip.on:has-text("الان چی بگم؟")').count() === 1, "۸) SOS → چت‌یار با مود «الان چی بگم؟»");
check((await p.locator("textarea.ctxt").inputValue()).includes("سرد شده"), "۹) درفت موقعیت در textarea");

/* مودهای جدید */
check(await p.locator(".mode-chip").count() === 15, "۱۰) ۱۵ ابزار چت‌یار");
for (const t of ["دلداری", "تبریک", "بگم دوستش دارم؟", "«هیچی نیستم»"]) {
  check(await p.locator('.mode-chip:has-text("' + t + '")').count() === 1, "۱۱) مود «" + t + "»");
}

/* مغز رابطه */
check((await p.locator(".brainchip").textContent()).includes("روشن"), "۱۲) چیپ مغز رابطه پیش‌فرض روشن");
await p.click(".brainchip"); await p.waitForTimeout(250);
check((await p.locator(".brainchip").textContent()).includes("خاموش") && (await p.evaluate(() => localStorage.getItem("mk:brainon"))) === "0", "۱۳) خاموش‌کردن مغز (با اجازه)");
await p.click(".brainchip"); await p.waitForTimeout(250);

/* قرارساز */
await p.locator('.mode-chip:has-text("کجا بریم")').click(); await p.waitForTimeout(400);
check(await p.locator(".dplanner").count() === 1, "۱۴) قرارساز فرمی در مود قرار");
await p.locator(".dpcity").fill("شیراز");
await p.locator('.occ-chip:has-text("رمانتیک")').click();
await p.locator('.occ-chip:has-text("کوتاه (۲ ساعت)")').click();
await p.locator('.occ-chip:has-text("بیرون")').click(); await p.waitForTimeout(250);
const cond = await p.locator(".datecond span").textContent();
check(cond.includes("شیراز") && cond.includes("رمانتیک") && cond.includes("بیرون"), "۱۵) شرط قرار ترکیبی: " + cond.slice(0, 40));
await p.locator('button:has-text("بذار توی پیام")').click(); await p.waitForTimeout(250);
check((await p.locator("textarea.ctxt").inputValue()).includes("شرط قرارم:"), "۱۶) شرط‌ها داخل پیام افتاد");

/* این یا اون */
await p.locator('.mode-chip:has-text("بازی")').click(); await p.waitForTimeout(400);
check(await p.locator(".deckcats .mode-chip").count() === 5, "۱۷) ۵ دسته‌ی بازی");
await p.locator('.deckcats .mode-chip:has-text("این یا اون")').click(); await p.waitForTimeout(250);
await p.locator(".deckcard").click(); await p.waitForTimeout(250);
check((await p.locator(".deckcard p").last().textContent() || "").includes(" یا "), "۱۸) کارت «این یا اون»");

/* پایان پریود */
await p.evaluate(() => { const d = new Date(); d.setDate(d.getDate() - 4); const iso = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); localStorage.setItem("mk:pms", JSON.stringify({ logs: [iso], len: 5, notif: false })); });
await p.click('[role="tab"]:has-text("ما")'); await p.waitForTimeout(600);
check((await p.locator(".phasebox").textContent()).includes("روزای پریود"), "۱۹) روز ۴ سیکل: هنوز فاز قاعدگی");
await p.locator('button:has-text("پریود تموم شد")').click(); await p.waitForTimeout(500);
const phTxt = (await p.locator(".phasebox").textContent().catch(() => ""));
check(!phTxt.includes("قاعدگی"), "۲۰) ثبت پایان → فاز عوض شد (فولیکولار)");

/* هدیه‌ی مناسبت نزدیک */
await p.evaluate((d6) => { localStorage.setItem("mk:occs", JSON.stringify([{ t: "تولد نازنین", d: d6, i: 777 }])); }, isoD(new Date(Date.now() + 6 * DAY)));
await p.reload({ waitUntil: "domcontentloaded" }); await p.waitForTimeout(1500);
await p.click('[role="tab"]:has-text("ما")'); await p.waitForTimeout(600);
check(await p.locator(".occgifts .occ-chip").count() === 3, "۲۱) ۳ پیشنهاد هدیه برای مناسبت ≤ ۷ روز");

await b.close();
console.log(failed ? "\n❌ " + failed + " مورد شکست" : "\n🎉 همه‌ی تست‌های v6.1 سبز");
process.exit(failed ? 1 : 0);
