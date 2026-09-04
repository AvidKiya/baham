"use client";
// ---------------------------------------------------------------------------
// lib/rizz.js — موتور رِز: استریک روزانه + امتیاز و سطح (ذخیره محلی)
// ---------------------------------------------------------------------------
const DAYS_KEY = "mk:days";
const XP_KEY = "mk:xp";

export const LEVELS = [
  { min: 0, t: "تازه‌وارد", ic: "spark" },
  { min: 60, t: "آماتور رِز", ic: "smile" },
  { min: 160, t: "روون", ic: "chat" },
  { min: 340, t: "حرفه‌ای", ic: "star" },
  { min: 650, t: "استاد رِز", ic: "crown" },
  { min: 1200, t: "افسانه", ic: "flame" },
];

const dstr = (d) => d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();

export function loadDays() {
  try { return JSON.parse(localStorage.getItem(DAYS_KEY) || "[]"); } catch { return []; }
}

export function touchDay() {
  try {
    const days = loadDays();
    const t = dstr(new Date());
    if (!days.includes(t)) {
      days.push(t);
      localStorage.setItem(DAYS_KEY, JSON.stringify(days.slice(-400)));
    }
  } catch {}
}

export function streak() {
  const days = loadDays().sort();
  if (!days.length) return 0;
  const set = new Set(days);
  let n = 0;
  const d = new Date();
  if (!set.has(dstr(d))) d.setDate(d.getDate() - 1); // استریک تا دیروز هم معتبر است
  while (set.has(dstr(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

export function xp() {
  try { return parseInt(localStorage.getItem(XP_KEY) || "0", 10) || 0; } catch { return 0; }
}

export function addXp(n) {
  try {
    const before = levelOf(xp()).i;
    localStorage.setItem(XP_KEY, String(xp() + n));
    const after = levelOf(xp()).i;
    return after > before ? after : 0; // اگر سطح بالا رفت، شماره‌ی سطح نو را بده
  } catch { return 0; }
}

export function levelOf(x) {
  let i = 0;
  for (let k = 0; k < LEVELS.length; k++) if (x >= LEVELS[k].min) i = k;
  const cur = LEVELS[i];
  const next = LEVELS[i + 1] || null;
  const span = next ? next.min - cur.min : 1;
  const prog = next ? Math.min(1, (x - cur.min) / span) : 1;
  return { i, cur, next, prog: Math.round(prog * 100) };
}
