import { chromium } from "playwright";
const browser = await chromium.launch();
const p = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
p.on("pageerror", (e) => console.log("PAGEERROR:", String(e).slice(0, 400)));
p.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE:", m.text().slice(0, 200)); });
await p.goto("http://127.0.0.1:8080/invite", { waitUntil: "networkidle" });
await p.waitForTimeout(400);
await p.click("text=بزن بریم");
await p.waitForTimeout(250);
await p.click("#scr-build");
await p.waitForTimeout(120);
await p.click("text=خب بپرس");
await p.waitForTimeout(500);
const info = await p.evaluate(() => ({
  active: document.querySelector(".screen.active")?.id,
  answersHtml: document.getElementById("answers")?.outerHTML?.slice(0, 500) || "NO ANSWERS DIV",
  noBtn: !!document.getElementById("noBtn"),
  noClass: document.getElementById("noBtn")?.className,
}));
console.log(JSON.stringify(info, null, 1));
await browser.close();
