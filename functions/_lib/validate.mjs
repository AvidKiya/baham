// ---------------------------------------------------------------------------
// shared/validate.mjs — whitelist validator for admin-saved config patches.
// Used by the Pages Function (server-side, security) and the admin panel
// (client-side, friendly errors). Pure, dependency-free.
// ---------------------------------------------------------------------------
import { DEFAULT_CONFIG } from "./config.mjs";

const MAX = { short: 60, name: 32, text: 600, url: 400, list: 12, clauses: 10 };
const URL_RE = /^https?:\/\/[^\s"'<>]{3,}$/i;
const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const THEME_KEYS = ["bg", "bg2", "acc", "acc2"]; // glow is derived from acc
const ASSET_KEYS = ["nervous", "happy", "celebrate", "confused", "date", "sparkles"];

function str(v, max) {
  if (typeof v !== "string") return { err: "باید متن باشد" };
  if (v.length > max) return { err: "طول متن بیشتر از حد مجاز است" };
  return { ok: v };
}

function clean(v) {
  // remove control chars & angle brackets are allowed in texts? No — strip <>
  return v.replace(/[<>]/g, "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}

function validateTheme(t) {
  if (!t || typeof t !== "object") return { err: "تم نامعتبر" };
  const out = {};
  for (const k of THEME_KEYS) {
    const r = str(t[k] || "", MAX.short);
    if (r.err) return { err: "رنگ " + k + ": " + r.err };
    if (r.ok && !HEX_RE.test(r.ok)) return { err: "رنگ " + k + " باید کد hex مثل #ff4f8b باشد" };
    if (r.ok) out[k] = r.ok;
  }
  return { ok: out };
}

function validateOption(o, withHint) {
  if (!o || typeof o !== "object") return { err: "گزینه نامعتبر" };
  const id = str(o.id || "", 24);
  const label = str(o.label || "", 48);
  const emoji = str(o.emoji || "", 8);
  const hint = str(o.hint || "", 60);
  if (id.err || label.err) return { err: "id/label نامعتبر" };
  return { ok: { id: (id.ok || "").trim() || Math.random().toString(36).slice(2, 8), label: clean(label.ok || ""), ...(emoji.ok ? { emoji: emoji.ok } : {}), ...(withHint && hint.ok ? { hint: clean(hint.ok) } : {}) } };
}

/**
 * validatePatch(patch) → { ok: cleanPatch } | { err: persianMessage, path }
 * Only whitelisted keys survive; arrays are rebuilt item by item.
 */
export function validatePatch(patch) {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) return { err: "ساختار نامعتبر" };
  const out = {};
  const D = DEFAULT_CONFIG;

  // — simple fields —
  for (const k of ["senderName", "recipientName", "demoName"]) {
    if (patch[k] !== undefined) { const r = str(patch[k], MAX.name); if (r.err) return { err: r.err, path: k }; out[k] = clean(r.ok); } }
  for (const k of ["question", "petPhrase", "finalShareText"]) {
    if (patch[k] !== undefined) { const r = str(patch[k], 120); if (r.err) return { err: r.err, path: k }; out[k] = clean(r.ok); } }
  if (patch.theme !== undefined) {
    if (!Object.keys(D.themes).includes(patch.theme)) return { err: "تم انتخاب‌شده معتبر نیست", path: "theme" };
    out.theme = patch.theme;
  }

  // — themes —
  if (patch.themes !== undefined) {
    if (typeof patch.themes !== "object") return { err: "تم‌ها نامعتبر", path: "themes" };
    out.themes = {};
    for (const tk of Object.keys(patch.themes)) {
      if (!Object.keys(D.themes).includes(tk)) continue; // only known theme keys
      const r = validateTheme(patch.themes[tk]);
      if (r.err) return { err: r.err, path: "themes." + tk };
      const base = D.themes[tk];
      out.themes[tk] = { ...base, ...r.ok };
    }
  }

  // — music —
  if (patch.music !== undefined) {
    const r = str(patch.music, MAX.url);
    if (r.err) return { err: r.err, path: "music" };
    if (r.ok && !URL_RE.test(r.ok)) return { err: "آدرس موسیقی باید با http/https شروع شود", path: "music" };
    out.music = r.ok.trim();
  }

  // — asset overrides —
  if (patch.assets !== undefined) {
    if (typeof patch.assets !== "object") return { err: "استیکرها نامعتبر", path: "assets" };
    out.assets = {};
    for (const ak of ASSET_KEYS) {
      const v = patch.assets[ak];
      if (v === undefined) continue;
      const r = str(v, MAX.url);
      if (r.err) return { err: r.err, path: "assets." + ak };
      if (r.ok && !URL_RE.test(r.ok)) return { err: "آدرس استیکر باید با http/https شروع شود", path: "assets." + ak };
      out.assets[ak] = r.ok.trim();
    }
  }

  // — option lists —
  if (patch.dateOptions !== undefined) {
    if (!Array.isArray(patch.dateOptions) || !patch.dateOptions.length || patch.dateOptions.length > MAX.list)
      return { err: "بین ۱ تا " + MAX.list + " گزینه برای قرار", path: "dateOptions" };
    const list = [];
    for (const o of patch.dateOptions) { const r = validateOption(o, true); if (r.err) return { err: r.err, path: "dateOptions" }; list.push(r.ok); }
    out.dateOptions = list;
  }
  for (const key of ["whenOptions", "timeOptions"]) {
    if (patch[key] !== undefined) {
      if (!Array.isArray(patch[key]) || !patch[key].length || patch[key].length > MAX.list)
        return { err: "بین ۱ تا " + MAX.list + " گزینه", path: key };
      const list = [];
      for (const o of patch[key]) { const r = validateOption(o, false); if (r.err) return { err: r.err, path: key }; list.push(r.ok); }
      out[key] = list;
    }
  }

  // — clauses & secrets —
  if (patch.contractClauses !== undefined) {
    if (!Array.isArray(patch.contractClauses) || !patch.contractClauses.length || patch.contractClauses.length > MAX.clauses)
      return { err: "بین ۱ تا " + MAX.clauses + " بند", path: "contractClauses" };
    const list = [];
    for (const c of patch.contractClauses) { const r = str(c, MAX.text); if (r.err) return { err: r.err, path: "contractClauses" }; list.push(clean(r.ok)); }
    out.contractClauses = list;
  }
  if (patch.secrets !== undefined) {
    if (!Array.isArray(patch.secrets) || !patch.secrets.length || patch.secrets.length > 6)
      return { err: "بین ۱ تا ۶ پیام مخفی", path: "secrets" };
    const list = [];
    for (const c of patch.secrets) { const r = str(c, MAX.text); if (r.err) return { err: r.err, path: "secrets" }; list.push(clean(r.ok)); }
    out.secrets = list;
  }

  // — stats —
  if (patch.stats !== undefined) {
    if (typeof patch.stats !== "object") return { err: "تنظیمات آمار نامعتبر", path: "stats" };
    out.stats = {};
    if (patch.stats.enabled !== undefined) out.stats.enabled = !!patch.stats.enabled;
    if (patch.stats.storeName !== undefined) out.stats.storeName = !!patch.stats.storeName;
    if (patch.stats.adminKey !== undefined) { const r = str(patch.stats.adminKey, 64); if (r.err) return { err: r.err, path: "stats.adminKey" }; out.stats.adminKey = r.ok.trim() || D.stats.adminKey; }
  }

  // — texts (whitelisted keys only) —
  if (patch.text !== undefined) {
    if (typeof patch.text !== "object") return { err: "متن‌ها نامعتبر", path: "text" };
    out.text = {};
    for (const tk of Object.keys(D.text)) {
      if (patch.text[tk] === undefined) continue;
      const r = str(patch.text[tk], MAX.text);
      if (r.err) return { err: r.err, path: "text." + tk };
      out.text[tk] = clean(r.ok);
    }
    // noTaunts is a list of strings
    if (patch.text.noTaunts !== undefined) {
      if (!Array.isArray(patch.text.noTaunts) || !patch.text.noTaunts.length || patch.text.noTaunts.length > 8)
        return { err: "بین ۱ تا ۸ پیام برای دکمه‌ی نه", path: "text.noTaunts" };
      const list = [];
      for (const t2 of patch.text.noTaunts) { const r = str(t2, 80); if (r.err) return { err: r.err, path: "text.noTaunts" }; list.push(clean(r.ok)); }
      out.text.noTaunts = list;
    }
  }

  return { ok: out };
}
