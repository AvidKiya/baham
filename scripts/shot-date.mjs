import { chromium } from "playwright";
const browser = await chromium.launch();
const p = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleRatio: 2 })).newPage();
await p.goto("http://127.0.0.1:8080/invite?name=" + encodeURIComponent("سارا"), { waitUntil: "networkidle" });
await p.waitForTimeout(500);
await p.click("text=بزن بریم");
await p.click("#scr-build");
await p.click("text=خب بپرس");
await p.waitForTimeout(300);
// dodge shot after 3 attempts
for (let i = 0; i < 3; i++) await p.click(".answers .no", { force: true });
await p.waitForTimeout(400);
await p.screenshot({ path: "docs/shots/v21-no-dodge.png" });
await p.click(".answers .yes", { force: true });
await p.waitForTimeout(300);
await p.evaluate(() => window.__app.go("date"));
await p.waitForTimeout(500);
await p.screenshot({ path: "docs/shots/v21-date.png", fullPage: false });
const wide = await p.evaluate(() => {
  const el = [...document.querySelectorAll(".dcard")].find((c) => c.textContent.includes("سورپرایز"));
  const r = el.getBoundingClientRect();
  const grid = getComputedStyle(el).gridColumnStart;
  return { w: Math.round(r.width), h: Math.round(r.height), gridColumnStart: grid };
});
console.log("surprise card:", JSON.stringify(wide));
await browser.close();
