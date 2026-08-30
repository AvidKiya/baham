import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
const browser = await chromium.launch();
const p = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
await p.goto("http://127.0.0.1:8080/invite?name=" + encodeURIComponent("سارا"), { waitUntil: "networkidle" });
await p.evaluate(() => {
  localStorage.setItem("rol:state", JSON.stringify({ checkpoint: 4, answer: "yes", dateId: "cafe", dateLabel: "☕ کافه", whenLabel: "این هفته", timeLabel: "شب", signed: false, secrets: {}, openedAt: 1 }));
});
await p.reload();
await p.waitForTimeout(600);
await p.evaluate(() => window.__app.go("final"));
await p.waitForTimeout(400);
await p.evaluate(() => [...document.querySelectorAll(".screen.active button")].find(b=>b.textContent.includes("ذخیره کن")).click());
await p.waitForTimeout(1800);
const data = await p.evaluate(async () => {
  const im = document.querySelector(".card-preview");
  if (!im) return null;
  const b = await (await fetch(im.src)).blob();
  return new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); });
});
if (data) { writeFileSync("/tmp/card-mine.png", Buffer.from(data.split(",")[1], "base64")); console.log("saved /tmp/card-mine.png"); }
else console.log("NO CARD IMAGE");
await browser.close();
