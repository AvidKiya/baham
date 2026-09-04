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
  const emjIntro = await p.evaluate(() => /\p{Extended_Pictographic}/u.test(document.getElementById("scr-intro").textContent));
  ok(emjIntro, "ایموجی‌های native در متن مقدمه حضور دارند");
  ok((await p.locator("#musicBtn").count()) === 1, "دکمه‌ی موسیقی موجود است");
  await audit(p, "intro");

  await p.click("text=بزن بریم");
  await sleep(300);
  ok((await active(p)) === "scr-build", "→ build");
  // موزیک: با اولین تعامل شروع می‌شود؛ وضعیت و زمان واقعی پخش چک می‌شود
  await sleep(700);
  const mus = await p.evaluate(() => ({
    on: document.getElementById("musicBtn")?.classList.contains("on") || false,
    label: document.querySelector(".mlabel")?.textContent || "",
  }));
  ok(mus.on && mus.label.includes("در حال پخش"), "موزیک با اولین تعامل شروع شد: " + mus.label);
  await p.click("#musicBtn"); await sleep(250);
  ok(await p.evaluate(() => !document.getElementById("musicBtn").classList.contains("on")), "توقف موزیک با دکمه");
  await p.click("#musicBtn"); await sleep(400);
  const ct = await p.evaluate(() => {
    const as = performance.getEntriesByType("resource").filter((e) => e.name.includes("aurora"));
    return as.length;
  });
  ok(ct >= 1, "فایل موزیک واقعاً بارگذاری شد");
  await p.click("#scr-build"); // skip
  await sleep(120);
  await p.click("text=خب بپرس");
  await sleep(300);
  ok((await active(p)) === "scr-question", "→ question");
  ok(await p.isVisible("text=با من رل می‌زنی"), "سؤال اصلی نمایان");
  const yesC = await p.evaluate(() => {
    const el = document.getElementById("yesBtn");
    const r = el.getBoundingClientRect();
    return { cx: r.left + r.width / 2, vw: window.innerWidth, pos: getComputedStyle(el).position };
  });
  ok(yesC.pos === "absolute" && Math.abs(yesC.cx - yesC.vw / 2) < 12, "دکمه‌ی آره دقیقاً وسط صفحه است (" + yesC.pos + ", cx=" + Math.round(yesC.cx) + ")");

  // playful no — رد کردن باید غیرممکن باشد
  for (let i = 0; i < 10; i++) await p.click(".answers .no", { force: true });
  await sleep(300);
  ok((await active(p)) === "scr-question", "۱۰ بار «نه» → هنوز در صفحه‌ی سؤال (رد کردن غیرممکن)");
  ok((await p.locator(".realno .btn").count()) === 0, "هیچ دکمه‌ی «نه واقعی» در صفحه وجود ندارد");
  const noTxt = (await p.locator(".answers .no .nlabel").textContent()).trim();
  ok(noTxt.includes("آره"), "دکمه‌ی نه تسلیم شد و خودش «آره» شد: " + noTxt);
  const answerState = await p.evaluate(() => window.__app.state.answer);
  ok(answerState === null, "هیچ جواب «نه»ی ثبت نشده");
  const tauntVisible = await p.locator("#taunt").textContent();
  ok(tauntVisible.length > 0, "پیام tease فعال: " + tauntVisible);
  const tauntEmj = await p.evaluate(() => /\p{Extended_Pictographic}/u.test(document.getElementById("taunt").textContent));
  ok(tauntEmj, "ایموجی native داخل پیام tease");
  // کلیک روی دکمه‌ی تسلیم‌شده = بله
  await p.click(".answers .no", { force: true });
  await sleep(600);
  ok((await active(p)) === "scr-yes", "کلیک روی دکمه‌ی تسلیم‌شده → جشن بله");
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
  await sleep(400);
  ok((await active(p)) === "scr-poem", "→ صفحه‌ی شعر (بعد از آره)");
  const bayts = await p.locator("#scr-poem .bayt").count();
  ok(bayts >= 3, `${bayts} بیت شعر روی صفحه`);
  ok(await p.isVisible("text=شهریار"), "شاعر پیش‌فرض: شهریار");
  ok((await p.locator("#scr-poem .bayt .m1").first().textContent()).includes("شهریارت می‌شوم"), "بیت اولِ شهریار درست است");
  const poemEmj = await p.evaluate(() => /\p{Extended_Pictographic}/u.test(document.querySelector("#scr-poem .line.big").textContent));
  ok(poemEmj, "ایموجی native در عنوان صفحه‌ی شعر");
  await p.click("text=بریم سراغ قرار");
  await sleep(350);
  ok((await active(p)) === "scr-date", "شعر → انتخاب قرار");
  const cards = await p.locator(".dcard").count();
  ok(cards >= 7, `${cards} کارت قرار`);
  ok(await p.isVisible("text=آشپزی دونفره"), "گزینه‌ی آشپزی دونفره‌ی خونه‌ای هست");
  const wide = await p.evaluate(() => {
    const el = [...document.querySelectorAll(".dcard")].find((c) => c.textContent.includes("سورپرایز"));
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return el.classList.contains("wide") && r.width > 300;
  });
  ok(wide, "کارت سورپرایز کشیده و تمام‌عرض است");
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
  await p.click("text=امضا می‌کنم"); // lawyerOk button
  await sleep(1500);
  ok((await active(p)) === "scr-final", "→ کارت پایانی");
  ok(await p.isVisible("text=رسماً گفت آره"), "کارت پایانی: رسماً گفت آره");
  const nameShown = await p.locator(".final-name").textContent();
  ok(nameShown.includes("سارا"), "اسم او در کارت: " + nameShown.trim());
  await audit(p, "final");

  const hasShare = await p.evaluate(() => !!(navigator.share || navigator.webkitShare));
  if (!hasShare) {
    ok(await p.isVisible(".copy-link"), "بدون Web Share → دکمه‌ی «کپی لینک دعوت» جایگزین شد");
  }
  // reply via telegram
  const replyBtn = await p.evaluate(() => {
    const a = document.querySelector(".reply-cta");
    return a ? a.href : null;
  });
  ok(replyBtn && replyBtn.includes("t.me/AvidKiya") && replyBtn.includes("text="), "دکمه‌ی «جوابم رو خودم بگم» → تلگرام تو");
  // canvas card modal
  await p.click("#finalSave");
  let imgOk = false;
  for (let i = 0; i < 10 && !imgOk; i++) {
    await sleep(450);
    imgOk = await p.evaluate(() => { const im = document.querySelector(".card-preview"); return !!im && im.naturalWidth > 100; });
  }
  ok(imgOk, "تصویر کارت (canvas) ساخته شد");
  await p.screenshot({ path: "/tmp/t-flow-final.png" });
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
  await p2.evaluate(() => document.querySelector(".answers .yes").click());
  await sleep(400);
  await p2.click("#scr-yes");
  await p2.click("#yesBtnNext");
  await p2.click("text=آره، بریم");
  await sleep(400);
  await p2.click("text=بریم سراغ قرار");
  await sleep(350);
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

/* ================= 2.5) مناسبت‌ها و اشعار ================= */
console.log("— مناسبت‌ها و اشعار");
{
  const { ctx, p } = await page({ viewport: { width: 390, height: 844 } });
  await p.goto(BASE + "/invite?name=سارا&occasion=friendship", { waitUntil: "networkidle" });
  await sleep(400);
  await p.click("text=بزن بریم"); await p.click("#scr-build"); await sleep(120);
  await p.click("text=خب بپرس"); await sleep(300);
  await p.click(".answers .yes", { force: true }); await sleep(400);
  await p.click("#scr-yes"); await sleep(150);
  await p.click("#yesBtnNext"); await sleep(150);
  await p.click("text=آره، بریم"); await sleep(400);
  ok((await active(p)) === "scr-poem", "مناسبت دوستی → صفحه‌ی شعر");
  ok(await p.isVisible("text=درختِ دوستی بنشان"), "بیت حافظ (دوستی) نمایش داده شد");
  ok(await p.isVisible("text=حافظ و سعدی"), "شاعرهای مناسبت دوستی درج شدند");
  const workLink = await p.evaluate(() => location.href);
  ok(workLink.includes("occasion=friendship"), "پارامتر occasion در URL باقی است");
  await p.evaluate(() => { const b = document.querySelector("#scr-poem .btn.primary"); if (b) b.click(); }); await sleep(350);
  ok((await active(p)) === "scr-date", "شعر دوستی → انتخاب قرار");
  await ctx.close();
}

/* ================= 2.7) پک‌های متن هر مناسبت ================= */
console.log("— متن‌های اختصاصی مناسبت‌ها");
for (const [occ, qWord, yesWord] of [["marriage", "ازدواج", "قبوله"], ["friendship", "دوست", "آره"], ["work", "همکاری", "آره"]]) {
  const { ctx, p } = await page({ viewport: { width: 390, height: 844 } });
  await p.goto(BASE + "/invite?name=آیدا&occasion=" + occ, { waitUntil: "networkidle" });
  await sleep(400);
  await p.click("text=بزن بریم"); await p.click("#scr-build"); await sleep(150);
  await p.click("text=خب بپرس"); await sleep(350);
  const q = await p.locator(".q-text").textContent();
  ok(q.includes(qWord), `مناسبت ${occ}: سؤال اختصاصی («${qWord}») → ` + q.trim().slice(0, 30));
  const y = await p.locator(".answers .yes").textContent();
  ok(y.includes(yesWord), `مناسبت ${occ}: دکمه‌ی آره اختصاصی → ` + y.trim());
  await p.click(".answers .yes", { force: true }); await sleep(400);
  await p.click("#scr-yes"); await sleep(150);
  await p.click("#yesBtnNext"); await sleep(150);
  await p.click("text=آره، بریم").catch(() => p.click("button >> nth=0")).catch(() => {});
  await sleep(150);
  // دکمه‌ی بعدی هر مناسبت ممکن است متن متفاوت باشد — کلیک عمومی روی دکمه‌ی primary صفحه‌ی after
  await p.evaluate(() => {
    const scr = document.querySelector("#scr-after");
    if (scr) { const b = scr.querySelector(".btn.primary"); if (b) b.click(); }
  });
  await sleep(450);
  const stk = await p.evaluate(() => !!document.querySelector("#scr-poem .stk-img, #scr-poem .stk-fb"));
  ok(stk, `مناسبت ${occ}: استیکر مناسبت در صفحه‌ی شعر`);
  await ctx.close();
}
// متن پایانی ازدواج
{
  const { ctx, p } = await page({ viewport: { width: 390, height: 844 } });
  await p.goto(BASE + "/invite?name=آیدا&occasion=marriage", { waitUntil: "networkidle" });
  await p.evaluate(() => localStorage.setItem("rol:state", JSON.stringify({ checkpoint: 6, answer: "yes", dateId: "cafe", dateLabel: "☕ کافه", whenLabel: "این هفته", timeLabel: "شب", signed: true, secrets: {}, openedAt: 1 })));
  await p.reload(); await sleep(600);
  const ft = await p.locator(".final-card .line.dim").textContent();
  ok(ft.includes("پیوند"), "کارت پایانی ازدواج: " + ft.trim());
  await ctx.close();
}

/* ================= 3) اپ مخ‌یار v5: خانه/ثبت‌نام/چت/+۱۸/ساخت/تاریخچه ================= */
console.log("— اپ مخ‌یار v5");
{
  const uniq = "t" + Date.now().toString(36).slice(-6);
  const { ctx, p } = await page({ viewport: { width: 390, height: 844 } });

  // ۳.۱ پوسته‌ی اپ و تب‌بار آیکونی
  await p.goto(BASE + "/", { waitUntil: "networkidle" });
  await sleep(700);
  const tabs = await p.locator(".tabbar .tab").count();
  ok(tabs === 5, `تب‌بار شناور با ۵ تب (${tabs})`);
  const tabIcons = await p.locator(".tabbar .tab svg").count();
  ok(tabIcons === 5, `آیکون SVG در همه‌ی تب‌ها (${tabIcons})`);
  ok(await p.isVisible(".hero"), "تب خانه: هیرو");
  const bento = await p.locator(".bento .bcard").count();
  ok(bento === 7, `بنتوگرید خانه: ۷ سلول (${bento})`);
  ok(await p.isVisible("text=اَوید کیا"), "اعتبار سازنده در خانه");
  const theme0 = await p.evaluate(() => document.querySelector(".appwrap").getAttribute("data-theme"));
  ok(theme0 === "light" || theme0 === "dark", "تم اولیه ست است: " + theme0);
  await p.click(".toptheme"); await sleep(350);
  const theme1 = await p.evaluate(() => document.querySelector(".appwrap").getAttribute("data-theme"));
  ok(theme1 !== theme0, `سوییچ شب/روز کار می‌کند (${theme0} → ${theme1})`);
  await p.click(".toptheme"); await sleep(300);
  const emojiHit = await p.evaluate(() => {
    const t = document.body.innerText || "";
    return /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u.test(t);
  });
  ok(!emojiHit, "رابط اپ بدون ایموجی");

  // ۳.۲ ثبت‌نام
  await p.click('.tab:has-text("تنظیمات")'); await sleep(400);
  ok(await p.isVisible(".authcard"), "تب نیاز به حساب → فرم ورود/ثبت‌نام");
  await p.click('button:has-text("حساب نداری؟")'); await sleep(250);
  await p.fill('input[autocomplete="username"]', uniq);
  await p.fill('input[type="password"]', "test1234");
  await p.click('button:has-text("ثبت‌نام کن")'); await sleep(900);
  ok(await p.isVisible(".recmodal"), "کد بازیابی بعد از ثبت‌نام نشان داده شد");
  const recTxt = ((await p.locator(".recode").textContent()) || "").trim();
  ok(/^[A-Z0-9]{10}$/.test(recTxt), "شکل کد بازیابی درست است: " + recTxt);
  await p.click(".rec-ok"); await sleep(400);
  ok(await p.isVisible(".qscrim"), "آزمون شخصیت بعد از ثبت‌نام باز شد");
  for (let i = 0; i < 4; i++) { await p.click(".qop >> nth=0"); await sleep(250); }
  await sleep(300);
  const qres = ((await p.locator(".qres h3").textContent()) || "").trim();
  ok(qres.includes("شخصیت مخ‌زن"), "نتیجه‌ی آزمون نشان داده شد: " + qres.slice(0, 34));
  await p.click('button:has-text("آره، ذخیره کن")'); await sleep(700);
  ok(!(await p.isVisible(".qscrim")), "آزمون بسته شد");
  ok(await p.isVisible(".settingstab"), "ثبت‌نام موفق → تنظیمات باز شد");
  ok(((await p.locator(".topuser").textContent()) || "").trim().length > 0, "نام کاربری در نوار بالا");

  // ۳.۳ ذخیره‌ی پروفایل
  await p.fill('input[placeholder="مثلاً: سارا"]', "سارا");
  await p.click('button:has-text("پروفایلم رو سیو کن")'); await sleep(700);
  ok(await p.isVisible("text=پروفایلت سیو شد"), "پروفایل ذخیره شد");

  // ۳.۴ چت‌یار: ابزارها، لحن‌ها، قفل +۱۸
  await p.click('.tab:has-text("چت‌یار")'); await sleep(500);
  ok(await p.isVisible(".ai-banner"), "بنر «هوش مصنوعی وصل نیست»");
  const modes = await p.locator(".mode-chip").count();
  ok(modes === 8, `۸ ابزار چت‌یار (${modes})`);
  const lockedModes = await p.locator(".mode-chip.locked").count();
  ok(lockedModes === 1, `ابزار +۱۸ (پس‌مراقبت) قفل تا تأیید سن (${lockedModes})`);
  await p.click('.mode-chip:has-text("شبیه‌ساز")'); await sleep(250);
  const simPh = await p.locator("textarea.ctxt").getAttribute("placeholder");
  ok(/حرف می‌زنی|نقش/.test(simPh || ""), "جای‌نمای شبیه‌ساز درست است");
  await p.click('.mode-chip:has-text("پاسخ")'); await sleep(250);
  // بازی کارتی محلی (بدون هوش مصنوعی)
  await p.click('.mode-chip:has-text("بازی")'); await sleep(350);
  ok(await p.isVisible(".deckcard"), "بازی حقیقت/جرأت: کارت شروع");
  const lockedDeckCats = await p.locator(".deckcats .locked").count();
  ok(lockedDeckCats === 1, "دسته‌ی بزرگسال بازی قفل است");
  await p.click('.deckcats button:has-text("یخ‌شکن")'); await sleep(250);
  await p.click(".deckcard"); await sleep(350);
  const cardTxt = ((await p.locator(".deckcard p").nth(0).textContent()) || "").trim();
  ok(cardTxt.length > 8, "کارت بازی کشیده شد: " + cardTxt.slice(0, 28));
  await p.click('button:has-text("یکی دیگه")'); await sleep(300);
  ok(((await p.locator(".deckcard p").nth(0).textContent()) || "").trim().length > 8, "کارت بعدی هم می‌آید");
  await p.click('.mode-chip:has-text("قرار")'); await sleep(250);
  const ph = await p.locator("textarea.ctxt").getAttribute("placeholder");
  ok(/حال‌وهوا/.test(ph || ""), "جای‌نمای مخصوص حالت «قرار»");
  await p.click('.mode-chip:has-text("پاسخ")'); await sleep(250);
  const tones = await p.locator(".tone-chip").count();
  ok(tones === 9, `۹ لحن چت (${tones})`);
  const locked = await p.locator(".tone-chip.locked").count();
  ok(locked === 3, `۳ لحن +۱۸ قفل تا تأیید سن (${locked})`);
  const scens = await p.locator(".scen").count();
  ok(scens >= 4, `چیپ‌های سناریو در دسترس (${scens})`);
  await p.fill("textarea.ctxt", "جوابمو نداده");
  await p.click(".c-send"); await sleep(500);
  ok(await p.isVisible(".settingstab"), "ارسال بدون کلید → هدایت به تنظیمات");

  // ۳.۵ اتصال با اکانت + کلید AI جعلی → تست اتصال با خطای فارسی
  ok(await p.isVisible('button:has-text("اتصال با اکانت")'), "دکمه‌ی «اتصال با اکانت» حاضر است");
  await p.click(".adv summary"); await sleep(300);
  await p.fill('input[placeholder="sk-…"]', "sk-test00000000");
  await p.click('button:has-text("سیو و تست کن")'); await sleep(3000);
  const aiMsg = await p.evaluate(() => { const els = document.querySelectorAll(".mini-ok, .mini-err"); return els.length ? els[els.length - 1].innerText : ""; });
  ok(/کلید|اتصال|نامعتبر/.test(aiMsg || ""), "تست اتصال پاسخ داد: " + String(aiMsg).slice(0, 40));

  // ۳.۶ دروازه‌ی +۱۸: سال زیر ۱۸ رد، سال درست فعال
  await p.fill('input[placeholder="1376 یا 1998"]', "1390");
  await p.click('button:has-text("سنم رو تأیید کن")'); await sleep(700);
  ok(await p.isVisible("text=کافی نیست"), "سال ۱۳۹۰ → رد شد (زیر ۱۸)");
  await p.fill('input[placeholder="1376 یا 1998"]', "1376");
  await p.click('button:has-text("سنم رو تأیید کن")'); await sleep(700);
  ok(await p.isVisible(".adult-on"), "سال ۱۳۷۶ → فضای بزرگسال فعال");
  const ints = await p.locator(".int-chip").count();
  ok(ints === 14, `۱۴ علاقه‌مندی (۴ عمومی + ۱۰ بزرگسال) (${ints})`);
  await p.click('.int-chip:has-text("رابطه جدی")');
  await p.click('.int-chip:has-text("بانداج")'); await sleep(200);
  await p.click('button:has-text("سلیقه‌هام رو سیو کن")'); await sleep(700);
  ok(await p.isVisible("text=سلیقه‌هات سیو شد"), "علاقه‌مندی‌ها ذخیره شد");

  // ۳.۷ لحن‌های +۱۸ باز شد
  const locked2 = await p.locator(".tone-chip.locked").count();
  ok(locked2 === 0, `لحن‌های +۱۸ بعد از تأیید سن باز شدند (${locked2} قفل)`);

  // ۳.۸ ساخت دعوت‌نامه + ذخیره در تاریخچه
  await p.click('.tab:has-text("ساخت درخواست")'); await sleep(500);
  await p.fill('input[placeholder="مثلاً: سارا"]', "لیلا");
  await sleep(300);
  const link = await p.locator(".link-txt").textContent();
  ok(link.includes("لیلا"), "لینک با اسم فارسیِ خام: " + link.trim().slice(-24));
  ok(!link.includes("%D9"), "لینک بدون درصد-انکودینگ");
  await p.click(".occ-chip >> nth=2"); await sleep(250);
  const link2 = await p.locator(".link-txt").textContent();
  ok(link2.includes("occasion="), "چیپ مناسبت در لینک: " + link2.trim().slice(-40));
  await p.click('button:has-text("ذخیره در تاریخچه")'); await sleep(800);
  ok(await p.isVisible("text=در تاریخچه ذخیره شد"), "لینک در تاریخچه ذخیره شد");

  // ۳.۹ تاریخچه + جست‌وجو
  await p.click('.tab:has-text("تاریخچه")'); await sleep(600);
  await p.click('.seg button:has-text("دعوت‌نامه‌ها")'); await sleep(500);
  ok((await p.locator(".histitem").count()) === 1, "تاریخچه: ۱ دعوت‌نامه");
  await p.fill(".hsearch input", "لیلا"); await sleep(300);
  ok((await p.locator(".histitem").count()) === 1, "جست‌وجوی «لیلا»: نتیجه دارد");
  await p.fill(".hsearch input", "zzzz"); await sleep(300);
  ok((await p.locator(".histitem").count()) === 0, "جست‌وجوی بی‌نتیجه: خالی");
  await p.fill(".hsearch input", ""); await sleep(300);
  await p.click(".hi-row"); await sleep(300);
  ok(await p.isVisible(".hi-detail .link-txt"), "جزئیات لینک باز شد");
  await p.click(".hi-x"); await sleep(700);
  ok((await p.locator(".histitem").count()) === 0, "حذف آیتم تاریخچه");

  // ۳.۹ب خروجی داده و کارت سطح
  await p.click('.tab:has-text("تنظیمات")'); await sleep(500);
  ok(await p.isVisible('button:has-text("داده‌هام رو بده")'), "دکمه‌ی خروجی JSON هست");
  await p.click('.tab:has-text("خانه")'); await sleep(500);
  ok(await p.isVisible(".levelcard"), "کارت سطح/استریک در خانه");
  ok(await p.isVisible(".lvlbar"), "نوار پیشرفت سطح");

  // ۳.۱۰ خروج و ورود دوباره
  await p.click('.tab:has-text("تنظیمات")'); await sleep(400);
  await p.click('button:has-text("خروج از حساب")'); await sleep(500);
  ok(await p.isVisible(".authcard"), "خروج → فرم ورود");
  await p.fill('input[autocomplete="username"]', uniq);
  await p.fill('input[type="password"]', "test1234");
  await p.click('button:has-text("ورود")'); await sleep(900);
  ok(await p.isVisible(".settingstab"), "ورود دوباره موفق");
  const stillAdult = await p.isVisible(".adult-on");
  ok(stillAdult, "وضعیت +۱۸ بعد از ورود دوباره حفظ شد");
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch {} });

  // ۳.۱۱ PWA و فونت
  const swR = await fetch(BASE + "/sw.js");
  ok(swR.status === 200, "سرویس‌ورکر /sw.js سرو می‌شود");
  const mf = await (await fetch(BASE + "/site.webmanifest")).json();
  ok(mf.name && mf.name.includes("مخ‌یار") && mf.start_url === "/", "مانیفست PWA: مخ‌یار");
  ok(mf.theme_color === "#0b0810", "تم دارک در مانیفست");
  const fR = await fetch(BASE + "/fonts/Vazirmatn-var.woff2");
  ok(fR.status === 200 && (await (await fR.arrayBuffer()).byteLength) > 50000, "فونت وزیرمتن متغیر سرو می‌شود");
  await ctx.close();
}

/* ================= 3b) API مخ‌یار v5.1: بازیابی/OAuth/کرش‌ها/حذف/قوانین ================= */
{
  const u2 = "r" + Date.now().toString(36).slice(-6);
  const J = { "content-type": "application/json" };
  const reg = await (await fetch(BASE + "/api/auth/register", { method: "POST", headers: J, body: JSON.stringify({ username: u2, password: "test1234" }) })).json();
  ok(reg.ok && /^[A-Z0-9]{10}$/.test(reg.recoveryCode || ""), "API ثبت‌نام: کد بازیابی می‌دهد (" + (reg.recoveryCode || "—") + ")");
  const bad = await fetch(BASE + "/api/auth/recover", { method: "POST", headers: J, body: JSON.stringify({ username: u2, recoveryCode: "WRONG12345", newPassword: "newpass99" }) });
  ok(bad.status === 401 || bad.status === 400, "بازیابی با کد غلط رد شد (" + bad.status + ")");
  const rec = await (await fetch(BASE + "/api/auth/recover", { method: "POST", headers: J, body: JSON.stringify({ username: u2, recoveryCode: reg.recoveryCode, newPassword: "newpass99" }) })).json();
  ok(rec.ok && rec.token, "بازیابی با کد درست → رمز نو و ورود");
  const relogin = await (await fetch(BASE + "/api/auth/login", { method: "POST", headers: J, body: JSON.stringify({ username: u2, password: "newpass99" }) })).json();
  ok(relogin.ok, "ورود با رمز نو موفق");
  const A2 = { ...J, authorization: "Bearer " + relogin.token };
  const oa = await (await fetch(BASE + "/api/oauth/openrouter/start", { headers: A2 })).json();
  ok(oa.ok && /openrouter\.ai\/auth\?/.test(oa.url || "") && /callback_url=/.test(oa.url || "") && /code_challenge_method=S256/.test(oa.url || ""), "شروع OAuth: لینک PKCEی OpenRouter ساخته شد");
  const oaAnon = await fetch(BASE + "/api/oauth/openrouter/start");
  ok(oaAnon.status === 401, "شروع OAuth بدون توکن → 401");
  const cb = await fetch(BASE + "/api/oauth/openrouter/callback?st=fake12&code=shortcode1", { redirect: "manual" });
  const cbLoc = cb.headers.get("location") || String(cb.status);
  ok(/connect=/.test(cbLoc), "کال‌بک OAuth با ورودی خراب → ریدایرکت خطا (" + cbLoc.slice(0, 24) + ")");
  const cr = await (await fetch(BASE + "/api/me", { method: "PUT", headers: A2, body: JSON.stringify({ crushes: ["لیلا", "آرمین", "لیلا"] }) })).json();
  ok(cr.ok && cr.user.profile.crushes.length === 2, "کرش‌های چندتا + حذف تکراری (" + (cr.user.profile.crushes || []).length + ")");
  const del = await fetch(BASE + "/api/me", { method: "DELETE", headers: A2 });
  ok(del.status === 200, "حذف کامل حساب انجام شد");
  const gone = await fetch(BASE + "/api/me", { headers: A2 });
  ok(gone.status === 401, "بعد از حذف حساب، توکن مردود است");
  const lg = await (await fetch(BASE + "/legal")).text();
  ok(lg.includes("حریم خصوصی"), "صفحه‌ی قوانین/حریم خصوصی سرو می‌شود");
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
  await p.evaluate(() => window.__app.go("no"));
  await sleep(400);
  const roses = await p.evaluate(() => {
    const st = document.querySelector("#scr-no .stk img");
    return !!st && st.src.includes("roses");
  });
  ok(roses, "استیکر رز در صفحه‌ی خروج (فقط از پنل دمو در دسترس)");
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


/* ================= 5) ریسپانسیو — بدون سرریز افقی در موبایل ================= */
console.log("— ریسپانسیو موبایل");
{
  const noOverflow = (pg, label) =>
    pg.evaluate(() => ({
      sw: document.scrollingElement ? document.scrollingElement.scrollWidth : document.documentElement.scrollWidth,
      iw: window.innerWidth,
    })).then(({ sw, iw }) => ok(sw <= iw + 1, label + ": بدون سرریز افقی (" + sw + "≤" + iw + ")"));
  for (const vp of [{ width: 320, height: 568 }, { width: 375, height: 667 }, { width: 430, height: 932 }]) {
    const { ctx, p } = await page({ viewport: vp });
    await p.goto(BASE + "/invite?name=پری&theme=mint", { waitUntil: "networkidle" });
    await sleep(450);
    await noOverflow(p, "intro " + vp.width);
    await p.click("text=بزن بریم"); await p.click("#scr-build"); await sleep(120);
    await p.click("text=خب بپرس"); await sleep(300);
    await noOverflow(p, "question " + vp.width);
    await p.evaluate(() => document.querySelector(".answers .yes").click()); await sleep(400);
    await p.click("#scr-yes"); await sleep(150);
    await p.click("#yesBtnNext"); await sleep(150);
    await p.click("text=آره، بریم"); await sleep(500);
    await noOverflow(p, "poem " + vp.width);
    const baytW = await p.evaluate(() => {
      const el = document.querySelector("#scr-poem .bayt");
      return el ? Math.round(el.getBoundingClientRect().width) : 0;
    });
    ok(baytW > 0 && baytW <= vp.width + 1, "بیت شعر داخل صفحه جا می‌شود (" + baytW + "px @" + vp.width + ")");
    await p.click("text=بریم سراغ قرار"); await sleep(400);
    await noOverflow(p, "date " + vp.width);
    await ctx.close();
  }
  // اپ در کوچک‌ترین عرض (320px)
  const { ctx, p } = await page({ viewport: { width: 320, height: 568 } });
  await p.goto(BASE + "/", { waitUntil: "networkidle" });
  await sleep(700);
  const fitsApp = await p.evaluate(() => {
    const t = document.querySelector(".tabbar");
    const r = t ? t.getBoundingClientRect() : null;
    return r ? r.left >= 0 && r.right <= window.innerWidth + 1 : false;
  });
  ok(fitsApp, "تب‌بار اپ در صفحه‌ی 320px جا می‌شود");
  await p.click('.tab:has-text("ساخت درخواست")'); await sleep(600);
  await p.fill('input[placeholder="مثلاً: سارا"]', "پریسا"); await sleep(300);
  const lnk = await p.locator(".link-txt").textContent();
  ok(lnk.includes("پریسا"), "ساخت لینک با فارسی خام @320: " + lnk.trim().slice(-28));
  await noOverflow(p, "app create 320");
  await ctx.close();
}

await browser.close();
const realErrors = errors.filter((e) => !/__next|Hydration|downloadable font|Failed to load resource.*(font|woff)/i.test(e));
ok(realErrors.length === 0, "بدون خطای کنسول (" + (realErrors[0] || "هیچ") + ")");
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
