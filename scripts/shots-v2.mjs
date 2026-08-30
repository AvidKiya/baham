import { chromium } from "playwright";
const BASE = "http://127.0.0.1:8080";
const browser = await chromium.launch();
const phone = { viewport: { width: 390, height: 844 }, deviceScaleRatio: 2 };
const desk = { viewport: { width: 1440, height: 900 } };

// 1) invite intro (new glass + animated sticker)
let ctx = await browser.newContext(phone);
let p = await ctx.newPage();
await p.goto(BASE + "/invite?name=" + encodeURIComponent("سارا"), { waitUntil: "networkidle" });
await p.waitForTimeout(900);
await p.screenshot({ path: "docs/shots/v2-intro.png" });

// 2) question with candy theme
await p.click("text=بزن بریم");
await p.click("#scr-build");
await p.click("text=خب بپرس");
await p.waitForTimeout(500);
await p.screenshot({ path: "docs/shots/v2-question.png" });

// 3) yes celebration
await p.click(".answers .yes");
await p.waitForTimeout(900);
await p.screenshot({ path: "docs/shots/v2-yes.png" });

// 4) final card + modal
await p.evaluate(() => window.__app.go("final"));
await p.waitForTimeout(600);
await p.screenshot({ path: "docs/shots/v2-final.png" });
await p.click("#finalSave");
await p.waitForTimeout(2000);
await p.screenshot({ path: "docs/shots/v2-card-modal.png" });
await p.keyboard.press("Escape");
await p.waitForTimeout(400);
// check d-check badge position sanity on date screen
await p.evaluate(() => window.__app.go("date"));
await p.waitForTimeout(400);
await p.click(".dcard >> nth=1");
await p.waitForTimeout(400);
const check = await p.evaluate(() => {
  const card = document.querySelector(".dcard.picked");
  const chk = card.querySelector(".d-check");
  const cr = card.getBoundingClientRect(), chr = chk.getBoundingClientRect();
  return { inside: chr.top >= cr.top && chr.right <= cr.right + 1 && chr.bottom <= cr.bottom + 1 };
});
console.log("d-check inside card:", check.inside ? "PASS" : "FAIL");
await p.screenshot({ path: "docs/shots/v2-date.png" });
await ctx.close();

// 5) landing desktop v2
ctx = await browser.newContext(desk);
p = await ctx.newPage();
await p.goto(BASE + "/", { waitUntil: "networkidle" });
await p.waitForTimeout(900);
await p.screenshot({ path: "docs/shots/v2-landing.png" });
// builder with new theme swatches
await p.click("text=ساخت لینک شخصی");
await p.waitForTimeout(400);
await p.fill("#builderName", "لیلا");
await p.waitForTimeout(200);
await p.screenshot({ path: "docs/shots/v2-builder.png" });
await ctx.close();

// 6) admin v2 (login + themes tab)
ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
p = await ctx.newPage();
await p.goto(BASE + "/admin", { waitUntil: "networkidle" });
await p.fill("input[type=password]", "rol-admin-1234");
await p.click("text=ورود");
await p.waitForTimeout(900);
await p.click("text=تم و رنگ");
await p.waitForTimeout(400);
await p.screenshot({ path: "docs/shots/v2-admin-themes.png" });
await p.click("text=موسیقی و استیکر");
await p.waitForTimeout(400);
await p.screenshot({ path: "docs/shots/v2-admin-media.png" });
await ctx.close();

await browser.close();
console.log("v2 screenshots done");
