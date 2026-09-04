// تست دود v5.5 — ۱۰ قابلیت جدید کشف
import { chromium } from "playwright";
const BASE = "http://127.0.0.1:8080";
let failed = 0;
const check = (c, m) => { console.log((c ? "✅" : "❌") + " " + m); if (!c) failed++; };
const j = async (r) => { try { return await r.json(); } catch { return {}; } };

// ---------- ابزار API ----------
async function mkuser(uname) {
  const r = await j(await fetch(BASE + "/api/auth/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: uname, password: "secret123" }) }));
  return r.token;
}
const auth = (t) => ({ "content-type": "application/json", authorization: "Bearer " + t });
const tinyImg = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

const S = Date.now().toString(36).slice(-5);
const tA = await mkuser("fa" + S), tB = await mkuser("fb" + S), tC = await mkuser("fc" + S);

// هر سه: بزرگسال + سلیقه‌ی مشترک + کشف روشن
for (const [t, extra] of [[tA, { gender: "f" }], [tB, { gender: "m" }], [tC, { gender: "m" }]]) {
  await j(await fetch(BASE + "/api/me", { method: "PUT", headers: auth(t), body: JSON.stringify({ birthYear: 1374, interests: ["رابطه جدی", "دوستی اول"], ...extra }) }));
}
const discOn = (t, o) => fetch(BASE + "/api/discover", { method: "PUT", headers: auth(t), body: JSON.stringify(Object.assign({ on: true, city: "تهران", bio: "تست", lat: 35.7, lng: 51.4 }, o)) }).then(j);
await discOn(tA); await discOn(tB, { img: tinyImg, status: "امروز حوصله‌ی گپ دارم" });

/* ۱) عکس + استوری روی کارت */
let dA = await j(await fetch(BASE + "/api/discover", { headers: auth(tA) }));
const bCard = dA.candidates.find((c) => c.name === "fb" + S);
check(bCard && bCard.img === tinyImg, "۱) عکس پروفایل روی کارت");
check(bCard && bCard.status === "امروز حوصله‌ی گپ دارم", "۲) استوری ۲۴ ساعته روی کارت");

/* ۳) فانوس: علاقه‌ی مشترک */
check(dA.fanous && dA.fanous.shared >= 2, "۳) فانوسِ امروز با سلیقه‌ی مشترک (shared=" + ((dA.fanous && dA.fanous.shared) || 0) + ")");

/* ۴) فیلتر جنسیت: A فقط پسرها */
await j(await fetch(BASE + "/api/discover", { method: "PUT", headers: auth(tA), body: JSON.stringify({ on: true, city: "تهران", bio: "تست", lat: 35.7, lng: 51.4, f: { g: "m" } }) }));
dA = await j(await fetch(BASE + "/api/discover", { headers: auth(tA) }));
check(dA.candidates.length > 0 && dA.candidates.every((c) => c.g === "m"), "۴) فیلتر جنسیت اعمال شد");
// فیلتر شعاع خیلی کوچیک → هیچ‌کس
await j(await fetch(BASE + "/api/discover", { method: "PUT", headers: auth(tA), body: JSON.stringify({ on: true, city: "تهران", bio: "تست", lat: 0, lng: 0, f: { g: "any", km: 1 } }) }));
dA = await j(await fetch(BASE + "/api/discover", { headers: auth(tA) }));
check(dA.candidates.length === 0, "۴ب) فیلتر شعاع ۱ کیلومتری کار می‌کنه");
await j(await fetch(BASE + "/api/discover", { method: "PUT", headers: auth(tA), body: JSON.stringify({ on: true, city: "تهران", bio: "تست", lat: 35.7, lng: 51.4, f: { g: "any" } }) }));

/* ۵) حالت نامرئی: C روشنش کنه → B نبیندش؛ C هنوز B رو می‌بینه */
await discOn(tC, { ghost: true });
const dB = await j(await fetch(BASE + "/api/discover", { headers: auth(tB) }));
check(!dB.candidates.some((c) => c.name === "fc" + S), "۵) حالت نامرئی: نامرئی دیده نمی‌شه");
const dC = await j(await fetch(BASE + "/api/discover", { headers: auth(tC) }));
check(dC.candidates.some((c) => c.name === "fa" + S), "۵ب) نامرئی خودش بقیه رو می‌بینه");

/* ۶) گزارش/مسدود: A مسدودش کنه C رو (اگه دیده بشه) — B مسدود کنه A رو */
await j(await fetch(BASE + "/api/discover/block", { method: "POST", headers: auth(tB), body: JSON.stringify({ target: dC.candidates.find((c) => c.name === "fa" + S).uid, report: true }) }));
const dB2 = await j(await fetch(BASE + "/api/discover", { headers: auth(tB) }));
check(!dB2.candidates.some((c) => c.name === "fa" + S), "۶) مسدودسازی: کارت حذف شد");

/* ۷) مچ + دوز چالشی + پیشنهاد شروع (API دوز) */
const uidA = (await j(await fetch(BASE + "/api/me", { headers: auth(tA) }))).user.id;
const uidC = (await j(await fetch(BASE + "/api/me", { headers: auth(tC) }))).user.id;
await j(await fetch(BASE + "/api/discover/like", { method: "POST", headers: auth(tA), body: JSON.stringify({ target: uidC, like: true }) }));
const m = await j(await fetch(BASE + "/api/discover/like", { method: "POST", headers: auth(tC), body: JSON.stringify({ target: uidA, like: true }) }));
check(m.matched && m.room, "۷) مچ A و C انجام شد");
const room = m.room;
let g = await j(await fetch(BASE + "/api/room/" + room + "/game", { method: "POST", headers: auth(tA), body: JSON.stringify({ new: true }) }));
check(g.ok && g.game.bd.length === 9, "۷ب) دوز چالشی شروع شد");
g = await j(await fetch(BASE + "/api/room/" + room + "/game", { method: "POST", headers: auth(tA), body: JSON.stringify({ i: 4 }) }));
check(g.ok && g.game.bd[4] === "♥", "۷ج) حرکت اول A (مرکز)");
const notYours = await j(await fetch(BASE + "/api/room/" + room + "/game", { method: "POST", headers: auth(tA), body: JSON.stringify({ i: 0 }) }));
check(notYours.error === "not_your_turn", "۷د) نوبت‌بندی درسته");
g = await j(await fetch(BASE + "/api/room/" + room + "/game", { method: "POST", headers: auth(tC), body: JSON.stringify({ i: 0 }) }));
check(g.ok && g.game.bd[0] === "✿" && g.game.turn === uidA, "۷ه) C جواب داد و نوبت برگشت");

/* ۸) UI: پیشنهاد شروع + نوتیف + گردونه + عکس */
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
p.setDefaultTimeout(9000);
// ورود A
await p.goto(BASE + "/", { waitUntil: "domcontentloaded" }); await p.waitForTimeout(1600);
await p.click('[role="tab"]:has-text("تنظیمات")'); await p.waitForTimeout(800);
await p.fill('input[autocomplete="username"]', "fa" + S);
await p.fill('input[type="password"]', "secret123");
await p.click('button[type="submit"]:has-text("ورود")'); await p.waitForTimeout(2600);
for (let k = 0; k < 3; k++) { await p.locator('button:has-text("بی‌خیال، رد شو")').click().catch(() => {}); await p.waitForTimeout(500); }
await p.click('[role="tab"]:has-text("کشف")'); await p.waitForTimeout(1500);
// چت مچ
await p.waitForSelector(".roomrow", { timeout: 10000 }).catch(() => {});
const rr = p.locator(".roomrow").first();
if (await rr.count()) await rr.click();
await p.waitForTimeout(1500);
check((await p.locator(".gstart").count()) + (await p.locator(".rgame").count()) > 0, "۸) دوز چالشی تو چت هست");
await p.locator(".gstart").click().catch(() => {}); await p.waitForTimeout(900);
check(await p.locator(".rgame").count() > 0, "۸ب) تخته‌ی دوز دونفره باز شد");
check((await p.locator(".ttc").allTextContents()).join("").includes("♥"), "۸ج) حرکت‌های قبلی سینک شد");
// پیشنهاد شروع
await p.locator('.roomrow button:has(svg)').first().click(); await p.waitForTimeout(300);
const v = await p.locator(".ansinp").inputValue();
check(v && v.length > 3, "۸د) پیشنهاد شروع گفتگو: " + (v || "—").slice(0, 24));
// دکمه‌ی نوتیف
await p.locator(".roomhead .btn").first().click(); await p.waitForTimeout(800); // عقب
await p.locator('button:has-text("کارت کشف من رو ویرایش کن")').click().catch(() => {});
await p.waitForTimeout(700);
const notifBtn = await p.locator('button:has-text("نوتیف پیام جدید")').count();
check(notifBtn > 0, "۸ه) دکمه‌ی نوتیفیکیشن هست");
// وضعیت/عکس روی کارت
await p.waitForTimeout(800);
const discOk = (await p.locator(".disctab .statrow").count()) > 0 || (await p.locator(".disctab .swipecard").count()) > 0;
check(discOk, "۸و) رابط کشف بعد از چت سالمه");
// گردونه شانس
await p.click('[role="tab"]:has-text("خانه")'); await p.waitForTimeout(900);
await p.locator(".games-card").scrollIntoViewIfNeeded().catch(() => {});
await p.locator(".games-card").click({ force: true });
await p.waitForSelector(".gpanel", { timeout: 6000 }).catch(() => {});
await p.waitForTimeout(400);
await p.locator('.gitem:has-text("گردونه")').evaluate((el) => el.click());
await p.waitForSelector(".wheel", { timeout: 6000 }).catch(() => {});
await p.waitForTimeout(400);
console.log("   ↳ gpanel:", await p.locator(".gpanel").count(), "| gitem:", await p.locator(".gitem").count(), "| wheel:", await p.locator(".wheel").count());
await p.screenshot({ path: "/tmp/dbg-wheel.png" });
check(await p.locator(".wheel").count() > 0, "۸ز) گردونه‌ی شانس باز شد");
await p.locator('button:has-text("بچرخون")').evaluate((el) => el.click()); await p.waitForTimeout(3100);
check(await p.locator(".fort-txt").count() > 0, "۸ح) گردونه جایزه داد");
await p.screenshot({ path: "docs/shots/v55-01-wheel.png" });
await p.keyboard.press("Escape").catch(() => {});
await b.close();

console.log(failed ? `\n❌ ${failed} مورد شکست` : "\n🎉 همه‌ی تست‌های v5.5 سبز");
process.exit(failed ? 1 : 0);
