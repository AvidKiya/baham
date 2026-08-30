import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
const browser = await chromium.launch();
const NAME = process.argv[2] || "سارا";
const p = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
await p.goto("http://127.0.0.1:8080/invite?name=" + encodeURIComponent(NAME), { waitUntil: "networkidle" });
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
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < 40 && !(im.complete && im.naturalWidth); i++) await wait(100);
  const cv = document.createElement("canvas");
  cv.width = im.naturalWidth; cv.height = im.naturalHeight;
  cv.getContext("2d").drawImage(im, 0, 0);
  return cv.toDataURL("image/png");
});
if (data) { writeFileSync("/tmp/card-mine.png", Buffer.from(data.split(",")[1], "base64")); console.log("saved /tmp/card-mine.png"); }
else console.log("NO CARD IMAGE");
await browser.close();
