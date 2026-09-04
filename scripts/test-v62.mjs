// تست دود v6.2 — حالت پارتنر: دعوت، جفت‌شدن، اشتراک‌گذاری granular، حل اختلاف دونفره، قطع ارتباط
import { chromium } from "playwright";
const BASE = "http://127.0.0.1:8080";
let failed = 0;
const check = (c, m) => { console.log((c ? "✅" : "❌") + " " + m); if (!c) failed++; };
const J = { "content-type": "application/json" };
const reg = async (u) => (await (await fetch(BASE + "/api/auth/register", { method: "POST", headers: J, body: JSON.stringify({ username: u, password: "test1234" }) })).json());
const login = async (u) => (await (await fetch(BASE + "/api/auth/login", { method: "POST", headers: J, body: JSON.stringify({ username: u, password: "test1234" }) })).json());
const A0 = { ...J, authorization: "" };

/* ---------- API ---------- */
const uA = "pa" + Date.now().toString(36).slice(-6);
const uB = "pb" + Date.now().toString(36).slice(-6);
const rA = await reg(uA), rB = await reg(uB);
const HA = { ...J, authorization: "Bearer " + rA.token };
const HB = { ...J, authorization: "Bearer " + rB.token };
check(!!(rA.ok && rB.ok), "۱) دو کاربر آزمایشی");

let r = await (await fetch(BASE + "/api/partner", { headers: HA })).json();
check(r.ok && r.paired === false, "۲) وضعیت اولیه: وصل نیست");

r = await (await fetch(BASE + "/api/partner/invite", { method: "POST", headers: HA })).json();
check(r.ok && /^[a-f0-9]{6}$/.test(r.code) && r.url.includes("?pair=" + r.code), "۳) ساخت لینک دعوت: " + (r.code || "—"));
const code = r.code;

r = await (await fetch(BASE + "/api/partner/accept", { method: "POST", headers: HA, body: JSON.stringify({ code }) })).json();
check(!r.ok && r.error === "self", "۴) قبول کد خودت → رد");

r = await (await fetch(BASE + "/api/partner/accept", { method: "POST", headers: HB, body: JSON.stringify({ code: "deadbeef" }) })).json();
check(!r.ok && (r.error === "not_found" || r.error === "bad_code"), "۵) کد غلط → رد");

r = await (await fetch(BASE + "/api/partner/accept", { method: "POST", headers: HB, body: JSON.stringify({ code }) })).json();
check(r.ok && r.paired === true, "۶) قبول کد → جفت شد");

r = await (await fetch(BASE + "/api/partner", { headers: HA })).json();
check(r.ok && r.paired && r.partner.name === uB, "۷) A اسم B رو می‌بینه: " + (r.partner && r.partner.name));

/* اشتراک‌گذاری granular */
r = await (await fetch(BASE + "/api/partner/share", { method: "POST", headers: HB, body: JSON.stringify({ status: "hard", mood: "دلم می‌خواد فقط گوش بدی", cycle: "pms" }) })).json();
check(r.ok, "۸) B اشتراک گذاشت (وضعیت + جمله + فاز)");
r = await (await fetch(BASE + "/api/partner", { headers: HA })).json();
check(r.partner.status === "hard" && r.partner.mood.includes("گوش"), "۹) A وضعیت و جمله‌ی B رو می‌بینه");
check(r.partner.cycle === "pms", "۱۰) فاز سیکل (اختیاری) به اشتراک گذاشته شد");

r = await (await fetch(BASE + "/api/partner/share", { method: "POST", headers: HB, body: JSON.stringify({ status: "hard", mood: "دلم می‌خواد فقط گوش بدی", cycle: "" }) })).json();
r = await (await fetch(BASE + "/api/partner", { headers: HA })).json();
check(r.partner.cycle === "", "۱۱) لغو اشتراک فاز → دیگه دیده نمی‌شه");

r = await (await fetch(BASE + "/api/partner/share", { method: "POST", headers: HB, body: JSON.stringify({ status: "weird" }) })).json();
r = await (await fetch(BASE + "/api/partner", { headers: HA })).json();
check(r.partner.status === "", "۱۲) مقدار نامعتبر بهداشت شد (فیلتر سرور)");

/* حل اختلاف دونفره */
const ansA = ["رفتیم مهمون بدون اینکه بهم بگی", "حس کردم بی‌توجهی کردی", "فکر می‌کنم بهت فضا دادم", "می‌خوام دیر شدن‌ها رو باهم بگیم"];
const ansB = ["مهمونی بود که دیر خبر دادن", "حس کردم تحت نظارتم", "می‌خواستم سورپرایزت کنم", "می‌خوام راحت‌تر بهم بگی"];
r = await (await fetch(BASE + "/api/partner/conflict", { method: "POST", headers: HA, body: JSON.stringify({ topic: "جمعه مهمونی", ans: ansA }) })).json();
check(r.ok && !r.bothDone, "۱۳) A جواب داد؛ جواب B هنوز پنهان");
r = await (await fetch(BASE + "/api/partner", { headers: HA })).json();
check(!(r.theirConf && r.theirConf.ans), "۱۴) تا B نفرستاده، جوابش دیده نمی‌شه");
r = await (await fetch(BASE + "/api/partner/conflict", { method: "POST", headers: HB, body: JSON.stringify({ topic: "جمعه مهمونی", ans: ansB }) })).json();
check(r.ok && r.bothDone === true, "۱۵) B هم جواب داد → هر دو کامل");
r = await (await fetch(BASE + "/api/partner", { headers: HA })).json();
check(r.theirConf && Array.isArray(r.theirConf.ans) && r.theirConf.ans.length === 4, "۱۶) حالا A جواب‌های B رو می‌بینه");
r = await (await fetch(BASE + "/api/partner/conflict", { method: "POST", headers: HA, body: JSON.stringify({ topic: "x", ans: ["۱", "۲", "۳"] }) })).json();
check(!r.ok && r.error === "incomplete", "۱۷) جواب ناقص → رد");

/* قطع ارتباط */
r = await (await fetch(BASE + "/api/partner", { method: "DELETE", headers: HA })).json();
check(r.ok, "۱۸) A قطع کرد");
r = await (await fetch(BASE + "/api/partner", { headers: HB })).json();
check(r.ok && r.paired === false, "۱۹) B هم خودکار جدا شد (دوطرفه)");
r = await (await fetch(BASE + "/api/partner/share", { method: "POST", headers: HB, body: JSON.stringify({ status: "low" }) }));
check(r.status === 409, "۲۰) اشتراک‌گذاری بدون جفت → 409");

/* ---------- UI: سگمنت همراه + دعوت ---------- */
const b = await chromium.launch();
const lg2 = await login(uB);
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
await ctx.addInitScript(([t, u]) => { try { localStorage.setItem("mk:token", t); localStorage.setItem("mk:user", u); localStorage.removeItem("mk:uspin"); } catch {} }, [lg2.token, JSON.stringify(lg2.user || {})]);
const p = await ctx.newPage();
p.setDefaultTimeout(9000);
await p.goto(BASE + "/", { waitUntil: "domcontentloaded" }); await p.waitForTimeout(1600);
await p.click('[role="tab"]:has-text("ما")'); await p.waitForTimeout(500);
check(await p.locator(".usegs .seg-btn").count() === 5, "۲۱) هاب «ما» حالا ۵ سگمنت");
await p.click('.seg-btn:has-text("همراه")'); await p.waitForTimeout(600);
check(await p.locator('button:has-text("ساخت لینک دعوت")').count() === 1, "۲۲) کارت دعوت در سگمنت همراه");
await p.locator('button:has-text("ساخت لینک دعوت")').click(); await p.waitForTimeout(700);
check(await p.locator(".recode").count() === 1, "۲۳) کد جفت‌شدن نمایش داده شد");

/* ?pair= در URL → پیام دعوت */
const lgA2 = await login(uA);
const inv = await (await fetch(BASE + "/api/partner/invite", { method: "POST", headers: { ...J, authorization: "Bearer " + lgA2.token } })).json();
check(inv.ok && inv.code, "۲۴) لینک دعوت دوم (بعد از قطع) هم کار می‌کنه");
await p.evaluate(() => { try { localStorage.removeItem("mk:tab"); } catch {} });
await p.goto(BASE + "/?pair=" + inv.code, { waitUntil: "domcontentloaded" }); await p.waitForTimeout(1600);
check(await p.locator(".usegs").count() === 1, "۲۵) با لینک دعوت مستقیم → تب «ما» باز شد");
check(await p.locator('button:has-text("قبول می‌کنم")').count() === 1, "۲۶) کارت «دعوت شدی» با دکمه‌ی قبول");
await p.locator('button:has-text("قبول می‌کنم")').click(); await p.waitForTimeout(900);
check((await p.locator("body").innerText()).includes("متصل با"), "۲۷) قبول از UI → متصل شد");

await b.close();
console.log(failed ? "\n❌ " + failed + " مورد شکست" : "\n🎉 همه‌ی تست‌های v6.2 سبز");
process.exit(failed ? 1 : 0);
