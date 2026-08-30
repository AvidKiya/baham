import { chromium } from "playwright";
const browser = await chromium.launch();
const p = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
p.on("pageerror", (e) => console.log("PAGEERROR:", String(e).slice(0, 500)));
await p.goto("http://127.0.0.1:8080/invite", { waitUntil: "networkidle" });
await p.waitForTimeout(400);
// intro emoji count (while mounted)
console.log("intro .emj:", await p.evaluate(() => document.querySelectorAll("#scr-intro .emj").length));
await p.click("text=بزن بریم");
await p.waitForTimeout(250);
await p.click("#scr-build");
await p.click("text=خب بپرس");
await p.waitForTimeout(300);
await p.click(".answers .yes", { force: true });
await p.waitForTimeout(400);
await p.click("#scr-yes");
await p.waitForTimeout(200);
const st1 = await p.evaluate(() => ({
  active: document.querySelector(".screen.active")?.id,
  nextBtn: !!document.getElementById("yesBtnNext"),
  nextPe: document.getElementById("yesBtnNext") ? getComputedStyle(document.getElementById("yesBtnNext")).pointerEvents : null,
}));
console.log("yes screen:", JSON.stringify(st1));
await p.click("#yesBtnNext");
await p.waitForTimeout(400);
const st2 = await p.evaluate(() => ({
  active: document.querySelector(".screen.active")?.id,
  afterHtml: document.querySelector("#scr-after")?.innerHTML?.slice(0, 400) || "NOT MOUNTED",
}));
console.log("after screen:", st2.active);
console.log(String(st2.afterHtml).slice(0, 400));
await browser.close();
