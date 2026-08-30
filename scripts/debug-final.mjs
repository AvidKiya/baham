import { chromium } from "playwright";
const browser = await chromium.launch();
const p = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
p.on("pageerror", (e) => console.log("PAGEERROR:", String(e).slice(0, 300)));
p.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE:", m.text().slice(0, 200)); });
await p.goto("http://127.0.0.1:8080/invite?name=" + encodeURIComponent("سارا"), { waitUntil: "networkidle" });
await p.evaluate(() => {
  localStorage.setItem("rol:state", JSON.stringify({ checkpoint: 6, answer: "yes", dateId: "cafe", dateLabel: "☕ کافه", whenLabel: "این هفته", timeLabel: "شب", signed: true, secrets: {}, openedAt: 1 }));
});
await p.reload({ waitUntil: "networkidle" });
await p.waitForTimeout(1200);
const info = await p.evaluate(() => ({
  active: document.querySelector(".screen.active")?.id,
  hasApp: !!window.__app,
  finalSave: !!document.getElementById("finalSave"),
  buttons: [...document.querySelectorAll(".screen.active button")].map((b) => b.textContent.trim()).slice(0, 8),
}));
console.log(JSON.stringify(info, null, 1));
await browser.close();
