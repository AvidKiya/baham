// ---------------------------------------------------------------------------
// functions/api/[[route]].js — Cloudflare Pages Function (runs on the edge
// next to the static Next.js export). One file, five endpoints:
//
//   GET    /api/config        → merged config (defaults + KV overrides)  [public]
//   PUT    /api/config        → save overrides   [auth: x-admin-key]
//   DELETE /api/config        → reset to defaults [auth]
//   POST   /api/event         → tiny answer analytics [public, KV STATS]
//   GET    /api/stats?key=…   → aggregated counts     [auth via key]
//   GET    /api/health        → { ok, kv }
//
// Bindings (Pages dashboard → Settings → Functions → KV bindings):
//   CONFIG → the config KV namespace     (optional but needed for admin edits)
//   STATS → the analytics KV namespace   (optional)
// Env var: ADMIN_PASSWORD (optional — fallback: config.stats.adminKey)
// ---------------------------------------------------------------------------
import { DEFAULT_CONFIG, mergeConfig } from "../_lib/config.mjs";
import { validatePatch } from "../_lib/validate.mjs";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
};
const ALLOWED_EVENTS = new Set(["view", "yes", "no", "date", "when", "contract", "final", "secret"]);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function adminPassword(env, cfg) {
  return (env && env.ADMIN_PASSWORD) || (cfg && cfg.stats && cfg.stats.adminKey) || "rol-admin-1234";
}

function isAuthed(request, env, cfg) {
  const key = request.headers.get("x-admin-key") || "";
  return key.length > 0 && key === adminPassword(env, cfg);
}

function sanitizeName(raw) {
  if (typeof raw !== "string") return "";
  try {
    return raw.replace(/[^\p{L}\p{M}\p{Nd}\u0020'\u2019\u060C\u00B7-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 32);
  } catch {
    return "";
  }
}

async function readStoredConfig(env) {
  if (!env || !env.CONFIG) return { patch: null, stored: false };
  try {
    const raw = await env.CONFIG.get("config");
    if (!raw) return { patch: null, stored: false };
    return { patch: JSON.parse(raw), stored: true };
  } catch {
    return { patch: null, stored: false };
  }
}

async function currentConfig(env) {
  const { patch } = await readStoredConfig(env);
  return mergeConfig(DEFAULT_CONFIG, patch || {});
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const route = url.pathname.replace(/^\/api\/?/, "").split("/")[0];

  if (route === "health") {
    return json({ ok: true, kv: !!(env && env.CONFIG), stats: !!(env && env.STATS) });
  }

  if (route === "config") {
    const cfg = await currentConfig(env);
    const { stored } = await readStoredConfig(env);
    return json({ ok: true, stored, config: cfg });
  }

  if (route === "stats") {
    const cfg = await currentConfig(env);
    const key = url.searchParams.get("key") || "";
    if (!key || key !== adminPassword(env, cfg)) return json({ ok: false, error: "forbidden" }, 403);
    if (!env || !env.STATS) return json({ ok: false, error: "no_kv", hint: "binding STATS is not connected" }, 501);
    const out = { events: {}, last: {} };
    try {
      const listed = await env.STATS.list({ prefix: "stat:" });
      for (const k of listed.keys || []) {
        const parts = k.name.split(":");
        if (parts.length < 3) continue;
        const ev = parts[1];
        const who = parts.slice(2).join(":");
        const count = parseInt((await env.STATS.get(k.name)) || "0", 10);
        out.events[ev] = out.events[ev] || { total: 0, by: {} };
        out.events[ev].total += count;
        out.events[ev].by[who] = count;
      }
      for (const ev of ALLOWED_EVENTS) {
        const last = await env.STATS.get("last:" + ev);
        if (last) out.last[ev] = last;
      }
    } catch {
      return json({ ok: false, error: "kv_error" }, 500);
    }
    return json({ ok: true, stats: out });
  }

  return json({ ok: false, error: "not_found" }, 404);
}

export async function onRequestPut(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  if (url.pathname.replace(/^\/api\/?/, "").split("/")[0] !== "config") return json({ ok: false, error: "not_found" }, 404);

  const cfg = await currentConfig(env);
  if (!isAuthed(request, env, cfg)) return json({ ok: false, error: "unauthorized", message: "رمز اشتباه است" }, 401);
  if (!env || !env.CONFIG) {
    return json({ ok: false, error: "no_kv", message: "KV با نام CONFIG وصل نشده — در تنظیمات Pages یک KV binding به اسم CONFIG بساز" }, 501);
  }

  let body = null;
  try {
    const text = await request.text();
    if (text.length > 120 * 1024) return json({ ok: false, error: "too_large" }, 413);
    body = JSON.parse(text);
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }

  const patch = body && body.config !== undefined ? body.config : body;
  const res = validatePatch(patch);
  if (res.err) return json({ ok: false, error: "invalid", message: res.err, path: res.path || "" }, 400);

  try {
    await env.CONFIG.put("config", JSON.stringify(res.ok));
  } catch {
    return json({ ok: false, error: "kv_write_failed" }, 500);
  }
  const merged = mergeConfig(DEFAULT_CONFIG, res.ok);
  return json({ ok: true, saved: true, config: merged });
}

export async function onRequestDelete(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  if (url.pathname.replace(/^\/api\/?/, "").split("/")[0] !== "config") return json({ ok: false, error: "not_found" }, 404);
  const cfg = await currentConfig(env);
  if (!isAuthed(request, env, cfg)) return json({ ok: false, error: "unauthorized" }, 401);
  if (!env || !env.CONFIG) return json({ ok: false, error: "no_kv", message: "KV با نام CONFIG وصل نشده" }, 501);
  try {
    await env.CONFIG.delete("config");
  } catch {
    return json({ ok: false, error: "kv_delete_failed" }, 500);
  }
  return json({ ok: true, reset: true, config: DEFAULT_CONFIG });
}

export async function onRequestPost(context) {
  const { request, env, waitUntil } = context;
  const url = new URL(request.url);
  const route = url.pathname.replace(/^\/api\/?/, "").split("/")[0];

  if (route !== "event") return json({ ok: false, error: "not_found" }, 404);
  if (!env || !env.STATS) return json({ ok: true, stored: false }, 202);

  let payload = null;
  try {
    const text = await request.text();
    if (text.length > 2048) return json({ ok: false, error: "too_large" }, 413);
    payload = JSON.parse(text);
  } catch {
    payload = null;
  }
  if (!payload || !ALLOWED_EVENTS.has(payload.t)) return json({ ok: false, error: "bad_event" }, 400);

  const cfg = await currentConfig(env);
  if (!cfg.stats || !cfg.stats.enabled) return json({ ok: true, stored: false }, 202);

  const name = sanitizeName(payload.name || "");
  const value = sanitizeName(payload.v || "").slice(0, 48);

  let who = "anon";
  try {
    if (cfg.stats.storeName && name) who = "name:" + name;
    else if (name) {
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(name));
      who = "hash:" + Array.from(new Uint8Array(digest)).slice(0, 5).map((b) => b.toString(16).padStart(2, "0")).join("");
    }
  } catch {
    who = "anon";
  }

  const key = "stat:" + payload.t + ":" + who;
  waitUntil(
    (async () => {
      try {
        const cur = parseInt((await env.STATS.get(key)) || "0", 10);
        await env.STATS.put(key, String(cur + 1), { expirationTtl: 90 * 24 * 3600 });
        await env.STATS.put("last:" + payload.t, new Date().toISOString(), { expirationTtl: 90 * 24 * 3600 });
      } catch {}
    })()
  );
  return json({ ok: true, stored: true });
}
