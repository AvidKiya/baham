// ---------------------------------------------------------------------------
// lib/chatimport.js — ایمپورت تاریخچه چت تلگرام/واتساپ به خاطرات (v9.2)
// ---------------------------------------------------------------------------
"use client";

const fa2en = (s) => String(s || "").replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));

/* تلگرام: JSON با messages:[{type,date,from,text}] */
function parseTelegram(json) {
  const msgs = [];
  const arr = (json && (json.messages || json)) || [];
  if (!Array.isArray(arr)) return [];
  for (const m of arr) {
    if (!m || (m.type && m.type !== "message") || !m.date) continue;
    let text = "";
    if (typeof m.text === "string") text = m.text;
    else if (Array.isArray(m.text)) text = m.text.map((p) => (typeof p === "string" ? p : (p && p.text) || "")).join("");
    text = String(text || "").trim();
    if (!text || m.forwarded_from) continue;
    if (m.media_type && !text) continue;
    const d = new Date(m.date);
    if (isNaN(d)) continue;
    msgs.push({ ts: d.getTime(), from: String(m.from || "").slice(0, 40), text: text.slice(0, 500) });
  }
  return msgs;
}

/* واتساپ: "21/03/24, 14:32 - Name: text" و گونه‌ها (با/بدون ثانیه و AM/PM) */
function parseWhatsApp(txt) {
  const msgs = [];
  const lines = fa2en(txt).split(/\n/);
  const P = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|am|pm)?\s*[—–-]\s*([^:]{1,60}):\s(.*)$/;
  const SKIP = /media omitted|image omitted|video omitted|document omitted|this message was deleted|message deleted|تماس|Call/i;
  let cur = null;
  const flush = () => { if (cur && cur.text.trim()) msgs.push(cur); cur = null; };
  for (const ln0 of lines) {
    const ln = String(ln0 || "").replace(/[\u200e\u200f]/g, "");
    const mm = ln.match(P);
    if (mm) {
      flush();
      const a = Number(mm[1]), b = Number(mm[2]);
      let Y = Number(mm[3]);
      if (Y < 100) Y += 2000;
      // حدس ترتیب روز/ماه: اگه اولی >۱۲ پس روز اوله؛ وگرنه پیش‌فرض روز/ماه
      const D = a > 12 ? a : (b > 12 ? b : a);
      const M = a > 12 ? b : (b > 12 ? a : b);
      let h = Number(mm[4]) % 24;
      const ap = (mm[7] || "").toLowerCase();
      if (ap === "pm" && h < 12) h += 12;
      if (ap === "am" && h === 12) h = 0;
      const d = new Date(Y, M - 1, D, h, Number(mm[5]));
      const text = String(mm[9] || "").trim();
      if (isNaN(d) || !text || SKIP.test(text)) { cur = null; continue; }
      cur = { ts: d.getTime(), from: String(mm[8] || "").trim().slice(0, 40), text: text.slice(0, 500) };
    } else if (cur && ln.trim()) {
      cur.text = (cur.text + "\n" + ln.trim()).slice(0, 500);
    }
  }
  flush();
  const now = Date.now();
  return msgs.filter((m) => m.ts > 946684800000 && m.ts < now + 864e5);
}

export function parseChatFile(name, content) {
  const n = String(name || "").toLowerCase();
  if (n.endsWith(".json")) {
    try {
      return { msgs: parseTelegram(JSON.parse(content)), src: "telegram" };
    } catch {
      return { msgs: [], src: "telegram" };
    }
  }
  return { msgs: parseWhatsApp(content), src: "whatsapp" };
}

/* گروه‌بندی روزانه → حداکثر ۶۰ خاطره (تازه‌ترین روزها) */
export function msgsToMemories(msgs) {
  const byDay = new Map();
  for (const m of (msgs || []).slice(0, 20000)) {
    const d = new Date(m.ts);
    const k = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k).push(m);
  }
  const days = [...byDay.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 60);
  return days.map(([day, list]) => {
    const picks = list.filter((m) => m.text && m.text.length > 1).slice(0, 40);
    const text = picks.map((m) => `${m.from || "؟"}: ${m.text}`).join("\n").slice(0, 2000);
    return { day, count: list.length, title: `حرفای ${day} 💬`, text };
  }).filter((x) => x.text);
}
