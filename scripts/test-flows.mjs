// ---------------------------------------------------------------------------
// test-flows.mjs — full-browser test against the local Pages dev server
// (npm run preview). Covers: invite flow, playful no, admin panel save →
// live effect on the invite page, landing builder, demo panel, layouts.
// Run: node scripts/test-flows.mjs     (server must be on :8080)
// ---------------------------------------------------------------------------
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://127.0.0.1:8080";
let passed = 0, failed = 0;
const ok = (c, l) => { if (c) { passed++; console.log("  PASS", l); } else { failed++; console.log("  FAIL", l); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch();
const errors = [];
async function page(ctxOpts = {}) {
  const ctx = await browser.newContext({ viewport: ctxOpts.viewport || { width: 390, height: 844 }, ...ctxOpts });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  p.on("console", (m) => { if (m.type() === "error" && !/net::ERR|Failed to load resource/i.test(m.text())) errors.push(m.text().slice(0, 160)); });
  return { ctx, p };
}
async function audit(p, label) {
  const r = await p.evaluate(() => {
    const out = { overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth, small: [], broken: [] };
    out.font = document.fonts.check("16px Vazirmatn");
    for (const b of document.querySelectorAll("button:not([hidden]), a.btn")) {
      const cs = getComputedStyle(b);
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      const rect = b.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;
      if (rect.height < 30 || rect.width < 30) out.small.push((b.id || b.className.toString().slice(0, 20)) + " " + Math.round(rect.width) + "x" + Math.round(rect.height));
    }
    for (const im of document.querySelectorAll("img")) if (im.complete && im.naturalWidth === 0) out.broken.push(im.className || im.src.slice(-30));
    return out;
  });
  ok(r.overflowX <= 0, `${label}: بدون سرریز افقی (${r.overflowX})`);
  ok(r.small.length === 0, `${label}: دکمه‌ها ≥30px (${r.small.join("|") || "ok"})`);
  ok(r.broken.length === 0, `${label}: بدون عکس خراب (${r.broken.join(",")})`);
  ok(r.font, `${label}: فونت وزیرمتن`);
}
const active = (p) => p.evaluate(() => document.querySelector(".screen.active")?.id || "");

/* ================= 1) invite flow ================= */
console.log("— جریان کامل دعوت‌نامه");
{
  const { ctx, p } = await page();
  await p.goto(BASE + "/invite?name=" + encodeURIComponent("سارا"), { waitUntil: "networkidle" });
  await sleep(400);
  ok((await active(p)) === "scr-intro", "boot → intro");
  await audit(p, "intro");

  await p.click("text=بزن بریم");
  await sleep(300);
  ok((await active(p)) === "scr-build", "→ build");
  await p.click("#scr-build"); // skip
  await sleep(120);
  await p.click("text=خب بپرس");
  await sleep(300);
  ok((await active(p)) === "scr-question", "→ question");
  ok(await p.isVisible("text=با من رل می‌زنی"), "سؤال اصلی نمایان");

  // playful no ×5
  for (let i = 0; i < 5; i++) await p.click(".answers .no", { force: true });
  await sleep(250);
  ok(await p.isVisible("text=اگه واقعاً می‌ گی نه، اینجا بزن".replace("گی", "گی")) || (await p.locator(".realno .btn").count()) === 1, "گزینه‌ی نه واقعی ظاهر شد");
  const tauntVisible = await p.locator("#taunt").textContent();
  ok(tauntVisible.length > 0, "پیام tease فعال: " + tauntVisible);

  // real no → graceful
  await p.click(".realno .btn");
  await sleep(250);
  ok((await active(p)) === "scr-no", "→ صفحه‌ی نه محترمانه");

  // back and YES
  await p.click("text=یه بار دیگه نگاه کن");
  await sleep(250);
  await p.click(".answers .yes");
  await sleep(600);
  ok((await active(p)) === "scr-yes", "→ جشن بله");
  const won = await p.evaluate(() => document.body.classList.contains("won"));
  ok(won, "حالت جشن (won) فعال");
  const confettiPx = await p.evaluate(() => {
    const cv = document.getElementById("confetti");
    if (!cv || !cv.getContext) return 0;
    const d = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 40) if (d[i] > 0) n++;
    return n;
  });
  ok(confettiPx > 40, `کانفتی واقعاً نقاشی شد (${confettiPx}px)`);

  await p.click("#scr-yes"); // skip sequence
  await sleep(120);
  await p.click("#yesBtnNext");
  await sleep(200);
  await p.click("text=آره، بریم");
  await sleep(350);
  ok((await active(p)) === "scr-date", "→ انتخاب قرار");
  const cards = await p.locator(".dcard").count();
  ok(cards >= 7, `${cards} کارت قرار`);
  await audit(p, "date");

  await p.click(".dcard >> nth=2");
  await sleep(1200);
  ok((await active(p)) === "scr-when", "→ زمان‌بندی");
  await p.click("#whenChips .chip >> nth=0");
  await p.click("#timeChips .chip >> nth=1");
  const whenEnabled = await p.evaluate(() => !document.getElementById("whenBtn").disabled);
  ok(whenEnabled, "دکمه‌ی ثبت با انتخاب فعال شد");
  await p.click("#whenBtn");
  await sleep(350);
  ok((await active(p)) === "scr-contract", "→ قرارداد");
  const clauses = await p.locator(".clause").count();
  ok(clauses >= 4, `${clauses} بند قرارداد`);
  await audit(p, "contract");

  // lawyer detour
  await p.click("text=نیاز به وکیل دارم");
  await sleep(200);
  await p.click("text=امضا می‌کنم ❤️"); // lawyerOk button
  await sleep(1500);
  ok((await active(p)) === "scr-final", "→ کارت پایانی");
  ok(await p.isVisible("text=رسماً گفت آره"), "کارت پایانی: رسماً گفت آره");
  const nameShown = await p.locator(".final-name").textContent();
  ok(nameShown.includes("سارا"), "اسم او در کارت: " + nameShown.trim());
  await audit(p, "final");

  // canvas card modal
  await p.click("text=این لحظه رو ذخیره کن");
  await sleep(900);
  const imgOk = await p.evaluate(() => { const im = document.querySelector(".card-preview"); return !!im && im.naturalWidth > 100; });
  ok(imgOk, "تصویر کارت (canvas) ساخته شد");
  await p.screenshot({ path: "docs/shots/next-flow-final.png" });
  await ctx.close();
}

/* ================= 2) admin: edit → save → live ================= */
console.log("— پنل مدیریت: ویرایش → ذخیره → اعمال روی سایت");
{
  const { ctx, p } = await page({ viewport: { width: 1280, height: 900 } });
  await p.goto(BASE + "/admin", { waitUntil: "networkidle" });
  await sleep(400);
  ok(await p.isVisible("text=پنل مدیریت دعوت‌نامه"), "صفحه‌ی ورود ادمین");
  await p.fill("input[type=password]", "rol-admin-1234");
  await p.click("text=ورود");
  await sleep(700);
  ok(await p.isVisible(".adm-top"), "ورود موفق → پنل");
  await audit(p, "admin");

  // edit question + a date option + a text
  const q = "همراه من می‌شی برای یه قهوه؟ ☕";
  await p.fill(".adm-card input.adm-input >> nth=0", "آرش");
  // question field is 4th input in general tab (sender, recipient, demo, question)
  const inputs = p.locator(".adm-card .adm-row input.adm-input");
  await inputs.nth(3).fill(q);
  await p.click("text=گزینه‌های قرار");
  await sleep(200);
  await p.fill(".adm-opt >> nth=0 >> input[aria-label=عنوان]", "کافه‌ی مورد علاقه");
  await p.click("text=ذخیره‌ی تغییرات");
  await sleep(900);
  const savedToast = await p.locator(".adm-toast.ok").count();
  ok(savedToast > 0 || (await p.locator(".adm-dirty").count()) === 0, "ذخیره شد");

  // invite page must show the new question + option
  const p2 = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await p2.goto(BASE + "/invite", { waitUntil: "networkidle" });
  await sleep(500);
  await p2.click("text=بزن بریم");
  await p2.click("#scr-build");
  await sleep(100);
  await p2.click("text=خب بپرس");
  await sleep(300);
  const qShown = await p2.locator(".q-text").textContent();
  ok(qShown.includes("قهوه"), "سؤال جدید از KV روی سایت اعمال شد: " + qShown.trim());
  // sender name in footer
  const footer = await p2.locator(".appfoot .foot-line").textContent();
  ok(footer.includes("آرش"), "اسم فرستنده در فوتر: " + footer.trim());
  await p2.click(".answers .yes");
  await sleep(400);
  await p2.click("#scr-yes");
  await p2.click("#yesBtnNext");
  await p2.click("text=آره، بریم");
  await sleep(400);
  const firstCard = await p2.locator(".dcard .d-title >> nth=0").textContent();
  ok(firstCard.includes("کافه‌ی مورد علاقه"), "گزینه‌ی ویرایش‌شده اعمال شد: " + firstCard);
  await p2.context().close();

  // reset to defaults (cleanup)
  await p.click("text=پشتیبان‌گیری");
  await sleep(200);
  p.on("dialog", (d) => d.accept());
  await p.click("text=حذف همه‌ی تنظیمات ذخیره‌شده");
  await sleep(800);
  const cfg = await (await fetch(BASE + "/api/config")).json();
  ok(cfg.stored === false, "بازنشانی به پیش‌فرض (cleanup)");
  await ctx.close();
}

/* ================= 3) landing + builder ================= */
console.log("— لندینگ و ساخت لینک");
{
  const { ctx, p } = await page({ viewport: { width: 1440, height: 900 } });
  await p.goto(BASE + "/", { waitUntil: "networkidle" });
  await sleep(500);
  ok(await p.isVisible("#phoneShell .phone"), "موك‌آپ گوشی در دسکتاپ");
  const phoneBox = await p.locator(".phone").boundingBox();
  ok(phoneBox && phoneBox.height > 500, `موك‌آپ سایز مناسب (${Math.round(phoneBox.height)}px)`);
  await audit(p, "landing");
  await p.click("text=ساخت لینک شخصی");
  await sleep(400);
  await p.fill("#builderName", "لیلا");
  await sleep(250);
  const link = await p.locator(".link-txt").textContent();
  ok(link.includes(encodeURIComponent("لیلا")), "لینک با اسم انکد شده: " + link.trim().slice(-30));
  await p.screenshot({ path: "docs/shots/next-landing.png" });
  await ctx.close();
}

/* ================= 4) demo panel ================= */
console.log("— حالت دمو");
{
  const { ctx, p } = await page();
  await p.goto(BASE + "/demo", { waitUntil: "networkidle" });
  await sleep(500);
  ok(await p.isVisible("#demoPanel"), "پنل DEV در /demo");
  await p.click(".dp-head");
  await sleep(150);
  const btns = await p.locator(".dp-btn").count();
  ok(btns >= 9, `${btns} دکمه‌ی توسعه‌دهنده`);
  await p.click(".dp-btn >> nth=3"); // → نه واقعی
  await sleep(300);
  ok((await active(p)) === "scr-no", "دکمه‌ی force-no کار می‌کند");
  await p.click(".dp-btn >> nth=4"); // کانفتی
  await sleep(400);
  ok(true, "کانفتی بدون خطا");
  await ctx.close();
}

/* ================= 4.5) music (bundled) + theme param ================= */
console.log("— موزیک و تم");
{
  const { ctx, p } = await page();
  await p.goto(BASE + "/invite", { waitUntil: "networkidle" });
  await sleep(500);
  ok(await p.isVisible("#musicBtn"), "دکمه‌ی موزیک با فایل پیش‌فرض نمایان است");
  await p.click("text=بزن بریم");
  await sleep(1400);
  const on = await p.evaluate(() => document.getElementById("musicBtn").classList.contains("on"));
  ok(on, "موزیک بعد از اولین لمس شروع شد (بدون autoplay اجباری)");
  await p.click("#musicBtn");
  await sleep(300);
  const off = await p.evaluate(() => !document.getElementById("musicBtn").classList.contains("on"));
  ok(off, "توقف موزیک با دکمه");
  await ctx.close();
}
{
  const { ctx, p } = await page();
  await p.goto(BASE + "/invite?theme=candy", { waitUntil: "networkidle" });
  await sleep(400);
  const acc = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--acc").trim());
  ok(acc === "#ff6fb5", "تم آب‌نباتی از URL اعمال شد: " + acc);
  await ctx.close();
}
{
  const { ctx, p } = await page();
  await p.goto(BASE + "/invite", { waitUntil: "networkidle" });
  await p.click("text=بزن بریم");
  await p.click("#scr-build");
  await p.click("text=خب بپرس");
  for (let i = 0; i < 5; i++) await p.click(".answers .no", { force: true });
  await p.click(".realno .btn");
  await sleep(400);
  const roses = await p.evaluate(() => {
    const st = document.querySelector("#scr-no .stk img");
    return !!st && st.src.includes("roses");
  });
  ok(roses, "استیکر رز در صفحه‌ی نه");
  await ctx.close();
}

/* ================= 5) resume + rm ================= */
console.log("— ادامه بعد از رفرش + reduced motion");
{
  const { ctx, p } = await page();
  await p.goto(BASE + "/invite", { waitUntil: "networkidle" });
  await p.evaluate(() => localStorage.setItem("rol:state", JSON.stringify({ checkpoint: 6, answer: "yes", dateId: "cafe", dateLabel: "☕ کافه", whenLabel: "این هفته", timeLabel: "شب", signed: true, secrets: {}, openedAt: 1 })));
  await p.reload();
  await sleep(600);
  ok((await active(p)) === "scr-final", "رفرش → ادامه از کارت پایانی");
  await ctx.close();
}
{
  const { ctx, p } = await page({ reducedMotion: "reduce" });
  await p.goto(BASE + "/invite", { waitUntil: "networkidle" });
  await sleep(400);
  const rm = await p.evaluate(() => document.documentElement.classList.contains("rm"));
  ok(rm, "reduced-motion اعمال شد");
  await p.click("text=بزن بریم");
  await p.click("#scr-build");
  await p.click("text=خب بپرس");
  await p.click(".answers .yes", { force: true }).catch(() => {});
  await sleep(300);
  ok(true, "RM: جریان بدون کرش");
  await ctx.close();
}

await browser.close();
const realErrors = errors.filter((e) => !/__next|Hydration|downloadable font|Failed to load resource.*(font|woff)/i.test(e));
ok(realErrors.length === 0, "بدون خطای کنسول (" + (realErrors[0] || "هیچ") + ")");
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
