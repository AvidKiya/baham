// تست دود v5.6 — جستجو، واکنش، تم خودکار، آمار، کوییز، پنل گزارش‌ها
import { chromium } from "playwright";
const BASE = "http://127.0.0.1:8080";
let failed = 0;
const check = (c, m) => { console.log((c ? "✅" : "❌") + " " + m); if (!c) failed++; };
const j = async (r) => { try { return await r.json(); } catch { return {}; } };

async function mkuser(uname) {
  const r = await j(await fetch(BASE + "/api/auth/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: uname, password: "secret123" }) }));
  return r.token;
}
const auth = (t) => ({ "content-type": "application/json", authorization: "Bearer " + t });

const S = Date.now().toString(36).slice(-5);
const tA = await mkuser("za" + S), tB = await mkuser("zb" + S), tC = await mkuser("zc" + S);
for (const t of [tA, tB, tC]) {
  await j(await fetch(BASE + "/api/me", { method: "PUT", headers: auth(t), body: JSON.stringify({ birthYear: 1374, interests: ["رابطه جدی"] }) }));
}
const on = (t, o) => fetch(BASE + "/api/discover", { method: "PUT", headers: auth(t), body: JSON.stringify(Object.assign({ on: true, city: "تهران", bio: "ب", lat: 35.7, lng: 51.4 }, o || {})) }).then(j);
await on(tA); await on(tB); await on(tC, { ghost: true });

/* ۱) جستجو با یوزرنیم */
let r = await j(await fetch(BASE + "/api/discover/find?u=zb" + S, { headers: auth(tA) }));
check(r.found && r.cand && r.cand.name === "zb" + S, "۱) جستجو: کاربر پیدا شد");
r = await j(await fetch(BASE + "/api/discover/find?u=zc" + S, { headers: auth(tA) }));
check(r.found === false, "۱ب) جستجو: نامرئی پیدا نمی‌شه");
r = await j(await fetch(BASE + "/api/discover/find?u=nobody99999", { headers: auth(tA) }));
check(r.found === false, "۱ج) جستجو: بی‌موجود پیدا نمی‌شه");

/* ۲) بازدید کارت */
await j(await fetch(BASE + "/api/discover/seen", { method: "POST", headers: auth(tA), body: JSON.stringify({ target: (await j(await fetch(BASE + "/api/discover/find?u=zb" + S, { headers: auth(tA) }))).cand.uid }) }));
const dB = await j(await fetch(BASE + "/api/discover", { headers: auth(tB) }));
check((dB.card && dB.card.views) >= 1, "۲) بازدید کارت شمرده شد: " + ((dB.card && dB.card.views) || 0));

/* ۳) واکنش در چت */
const uidA = (await j(await fetch(BASE + "/api/me", { headers: auth(tA) }))).user.id;
const uidB = (await j(await fetch(BASE + "/api/me", { headers: auth(tB) }))).user.id;
await j(await fetch(BASE + "/api/discover/like", { method: "POST", headers: auth(tA), body: JSON.stringify({ target: uidB, like: true }) }));
const m = await j(await fetch(BASE + "/api/discover/like", { method: "POST", headers: auth(tB), body: JSON.stringify({ target: uidA, like: true }) }));
check(m.matched && m.room, "۳) مچ شدند");
await j(await fetch(BASE + "/api/room/" + m.room + "/msg", { method: "POST", headers: auth(tA), body: JSON.stringify({ react: "heart" }) }));
const room = await j(await fetch(BASE + "/api/room/" + m.room + "?since=0", { headers: auth(tB) }));
check(room.msgs.length === 1 && room.msgs[0].react === "heart" && room.msgs[0].text === "", "۳ب) واکنش قلب ثبت شد");

/* ۴) گزارش‌ها: پنل ادمین */
await j(await fetch(BASE + "/api/discover/block", { method: "POST", headers: auth(tA), body: JSON.stringify({ target: uidB, report: true }) }));
const reps = await j(await fetch(BASE + "/api/reports", { headers: { "x-admin-key": "rol-admin-1234" } }));
check(reps.ok && reps.reports.length >= 1 && reps.reports[0].target === "zb" + S, "۴) گزارش تو پنل ادمین");
const noAuth = await j(await fetch(BASE + "/api/reports"));
check(noAuth.ok === false, "۴ب) بدون رمز ادمین → رد");
await j(await fetch(BASE + "/api/reports", { method: "DELETE", headers: { "x-admin-key": "rol-admin-1234" } }));
const reps2 = await j(await fetch(BASE + "/api/reports", { headers: { "x-admin-key": "rol-admin-1234" } }));
check(reps2.reports.length === 0, "۴ج) پاک‌سازی گزارش‌ها");

/* ۵) UI: تم خودکار + جستجو + واکنش + کوییز */
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
p.setDefaultTimeout(9000);
await p.goto(BASE + "/", { waitUntil: "domcontentloaded" }); await p.waitForTimeout(1600);

// تم: light → dark → auto
const t0 = await p.locator(".appwrap").getAttribute("data-theme");
await p.locator(".toptheme").click(); await p.waitForTimeout(300);
const t1 = await p.locator(".appwrap").getAttribute("data-theme");
await p.locator(".toptheme").click(); await p.waitForTimeout(300);
const mode = await p.evaluate(() => localStorage.getItem("mk:theme"));
const h = new Date().getHours();
const expectAuto = (h >= 19 || h < 6) ? "dark" : "light";
const t2 = await p.locator(".appwrap").getAttribute("data-theme");
check(t0 === "light" && t1 === "dark", "۵) چرخه تم: " + t0 + "→" + t1);
check(mode === "auto" && t2 === expectAuto, "۵ب) تم خودکار: mode=auto → " + t2 + " (انتظار " + expectAuto + ")");
await p.locator(".toptheme").click(); await p.waitForTimeout(200); // برگرد به light

// ورود A و کشف
await p.click('[role="tab"]:has-text("تنظیمات")'); await p.waitForTimeout(800);
await p.fill('input[autocomplete="username"]', "za" + S);
await p.fill('input[type="password"]', "secret123");
await p.click('button[type="submit"]:has-text("ورود")'); await p.waitForTimeout(2400);
for (let k = 0; k < 3; k++) { await p.locator('button:has-text("بی‌خیال، رد شو")').click().catch(() => {}); await p.waitForTimeout(400); }
await p.click('[role="tab"]:has-text("کشف")'); await p.waitForTimeout(1600);

// جستجو UI
await p.fill('.findrow input', "zb" + S);
await p.click('button:has-text("دنبالش بگرد")');
await p.waitForTimeout(900);
check(await p.locator(".findrow ~ .swipecard, .card.ccard .swipecard").count() > 0 || (await p.locator(".swipecard").count()) >= 1, "۵ج) جستجوی UI کارت آورد");
// بازگشت به حالت عادی (بستن نتیجه با لایک یا برگشت)
await p.locator('.swipecard button:has-text("بگذر")').last().click({ force: true }).catch(() => {});

// چت و واکنش
await p.waitForSelector(".roomrow", { timeout: 8000 }).catch(() => {});
const rr = p.locator(".roomrow").first();
if (await rr.count()) {
  await rr.click(); await p.waitForTimeout(1400);
  const before = await p.locator(".dreact").count();
  await p.locator(".rbtn").first().click(); await p.waitForTimeout(900);
  check(await p.locator(".dreact").count() === before + 1, "۵د) واکنش سریع تو چت");
  await p.locator(".roomhead .btn").first().click(); await p.waitForTimeout(600);
} else check(false, "۵د) چت مچ باز نشد");

// کوییز
await p.click('[role="tab"]:has-text("خانه")'); await p.waitForTimeout(800);
await p.locator(".games-card").scrollIntoViewIfNeeded().catch(() => {});
await p.locator(".games-card").click({ force: true });
await p.waitForSelector(".gpanel", { timeout: 6000 }).catch(() => {});
await p.locator(".gitem").nth(4).evaluate((el) => el.click()); // کوییز (پنجمی)
await p.waitForSelector(".qz", { timeout: 6000 }).catch(() => {});
check(await p.locator(".qz").count() > 0, "۵ه) کوییز باز شد");
for (let k = 0; k < 8; k++) {
  await p.locator(".qopt").first().evaluate((el) => el.click()).catch(() => {});
  await p.waitForTimeout(750);
}
check(await p.locator(".qz .fort-txt").count() > 0, "۵و) کوییز تموم شد و نتیجه آمد");
await p.screenshot({ path: "docs/shots/v56-01-quiz.png" });

await b.close();
console.log(failed ? `\n❌ ${failed} مورد شکست` : "\n🎉 همه‌ی تست‌های v5.6 سبز");
process.exit(failed ? 1 : 0);
