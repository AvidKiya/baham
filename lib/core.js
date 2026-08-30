// ---------------------------------------------------------------------------
// lib/core.js — localStorage state, sanitization, API calls, misc helpers.
// Everything guarded: the app must run even with storage/network disabled.
// ---------------------------------------------------------------------------

/* ---------- sanitize ---------- */
export function cleanText(v, max) {
  if (typeof v !== "string") return "";
  let out = v;
  try {
    out = v.replace(/[^\p{L}\p{M}\p{Nd}\u0020'\u2019\u060C\u00B7-]/gu, "");
  } catch (e) {
    out = v.replace(/[<>]/g, "");
  }
  return out.replace(/\s+/g, " ").trim().slice(0, max || 40);
}

/* ---------- storage ---------- */
export const store = {
  ok: (function () {
    try {
      const t = "__rol";
      localStorage.setItem(t, "1");
      localStorage.removeItem(t);
      return true;
    } catch (e) {
      return false;
    }
  })(),
  get(k, d) {
    if (!store.ok) return d;
    try {
      const v = localStorage.getItem("rol:" + k);
      return v === null ? d : JSON.parse(v);
    } catch (e) {
      return d;
    }
  },
  set(k, v) {
    if (!store.ok) return;
    try {
      localStorage.setItem("rol:" + k, JSON.stringify(v));
    } catch (e) {}
  },
  clearRol() {
    if (!store.ok) return;
    try {
      const kill = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.indexOf("rol:") === 0) kill.push(k);
      }
      for (let j = 0; j < kill.length; j++) localStorage.removeItem(kill[j]);
    } catch (e) {}
  },
};

export const INITIAL_STATE = {
  checkpoint: 0, // 1 started · 2 answered · 3 date picked · 4 when picked · 5 signed · 6 finished
  answer: null,
  dateId: null,
  dateLabel: "",
  whenLabel: "",
  timeLabel: "",
  signed: false,
  secrets: {},
  openedAt: null,
};

export function loadState() {
  const saved = store.get("state", null);
  if (saved && typeof saved === "object") {
    const s = { ...INITIAL_STATE, ...saved };
    if (!s.openedAt) s.openedAt = Date.now();
    store.set("state", s);
    return s;
  }
  const fresh = { ...INITIAL_STATE, openedAt: Date.now() };
  store.set("state", fresh);
  return fresh;
}

/* ---------- config text lookup ---------- */
export function T(cfg, key, fallback) {
  let o = cfg && cfg.text;
  for (const p of key.split(".")) {
    if (o == null) break;
    o = o[p];
  }
  return o === undefined || o === null || o === "" ? fallback : o;
}

/* ---------- API ---------- */
export async function fetchConfig(signal) {
  try {
    const r = await fetch("/api/config", { signal, headers: { "cache-control": "no-cache" } });
    if (!r.ok) throw new Error("http " + r.status);
    const j = await r.json();
    return j && j.config ? j.config : null;
  } catch (e) {
    return null;
  }
}

export function track(cfg, mode, type, value, name) {
  if (!cfg || !cfg.stats || !cfg.stats.enabled) return;
  if (mode !== "invite") return;
  try {
    const body = JSON.stringify({ t: type, v: cleanText(value || "", 48), name: cleanText(name || "", 32) });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/event", new Blob([body], { type: "application/json" }));
    } else {
      fetch("/api/event", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true }).catch(() => {});
    }
  } catch (e) {}
}

/* ---------- misc ---------- */
export function toFa(n) {
  return String(n).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);
}

export function applyTheme(themes, name) {
  const t = (themes && (themes[name] || themes.romantic)) || {
    bg: "#0b0715",
    bg2: "#180c2e",
    acc: "#ff4f8b",
    acc2: "#c96bff",
  };
  const r = document.documentElement.style;
  r.setProperty("--bg", t.bg);
  r.setProperty("--bg2", t.bg2);
  r.setProperty("--acc", t.acc);
  r.setProperty("--acc2", t.acc2);
  // derive glow rgb from acc
  let glow = "255,79,139";
  try {
    const n = parseInt(t.acc.replace("#", ""), 16);
    glow = [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(",");
  } catch (e) {}
  r.setProperty("--glow", glow);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", t.bg);
  if (typeof window !== "undefined" && window.__resetPalette) window.__resetPalette();
}
