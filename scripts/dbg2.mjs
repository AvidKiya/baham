import { chromium } from "playwright";
const browser = await chromium.launch();
const p = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
p.on("pageerror", (e) => console.log("PAGEERROR:", String(e).slice(0, 300)));
p.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE:", m.text().slice(0, 200)); });
await p.goto("http://127.0.0.1:8080/invite", { waitUntil: "networkidle" });
await p.waitForTimeout(400);
await p.click("text=بزن بریم");
await p.waitForTimeout(250);
await p.click("#scr-build");
await p.waitForTimeout(120);
await p.click("text=خب بپرس");
await p.waitForTimeout(300);
for (let i = 0; i < 12; i++) {
  try {
    await p.click(".answers .no", { force: true, timeout: 4000 });
    console.log("click", i + 1, "ok");
  } catch (e) {
    console.log("click", i + 1, "FAILED:", String(e).split("\n")[0]);
    const st = await p.evaluate(() => ({
      active: document.querySelector(".screen.active")?.id,
      no: !!document.querySelector(".answers .no"),
      noBtn: !!document.getElementById("noBtn"),
      cls: document.getElementById("noBtn")?.className,
      taunt: document.getElementById("taunt")?.textContent,
    }));
    console.log(JSON.stringify(st));
    break;
  }
  await p.waitForTimeout(120);
}
await browser.close();
