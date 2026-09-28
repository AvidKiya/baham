// ---------------------------------------------------------------------------
// lib/spaceSync.js — سینک «فضای ما» بین دو پارتنر جفت‌شده
// local-first + ادغام last-writer-wins روی هر آیتم (فیلد u)
// ---------------------------------------------------------------------------
"use client";
import { api, getToken } from "./appauth";
import { SPACE_KEYS, getPrivacy, getDirty, getLastSync, setLastSync } from "./couple";

const rd = (k, def) => {
  try {
    const v = localStorage.getItem(k);
    return v === null ? def : JSON.parse(v);
  } catch { return def; }
};
const wr = (k, v) => {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
};

/* ---------- ادغام دو لیست بر اساس id + u ---------- */
function mergeList(localArr, remoteArr, cap, col) {
  const map = new Map();
  for (const it of (localArr || [])) if (it && it.id) map.set(it.id, it);
  for (const it of (remoteArr || [])) {
    if (!it || !it.id) continue;
    const cur = map.get(it.id);
    if (!cur || (it.u || 0) >= (cur.u || 0)) {
      // بازی/چالش: جواب‌های هر دو طرف union می‌شن تا گم نشن
      const UF = col === "games" ? "answers" : col === "dares" ? "done" : col === "polls" ? "votes" : col === "movies" ? "votes" : col === "laws" ? "signs" : null;
      if (UF && cur && cur[UF] && it[UF]) {
        const au = { ...(it[UF] || {}) };
        for (const [uid, an] of Object.entries(cur[UF] || {})) {
          const has = au[uid];
          const ats = an && typeof an === "object" ? (an.ts || 0) : (Number(an) || 0);
          const hts = has && typeof has === "object" ? (has.ts || 0) : (Number(has) || 0);
          if (an && (!has || ats > hts)) au[uid] = an;
        }
        map.set(it.id, { ...it, [UF]: au });
      } else if (col === "shots" && cur) {
        map.set(it.id, { ...it, entries: { ...(cur.entries || {}), ...(it.entries || {}) }, votes: { ...(cur.votes || {}), ...(it.votes || {}) } });
      } else if (col === "ballots" && cur) {
        const wmap = new Map();
        for (const x of (cur.wishes || [])) if (x && x.id) wmap.set(x.id, x);
        for (const x of (it.wishes || [])) if (x && x.id && !wmap.has(x.id)) wmap.set(x.id, x);
        map.set(it.id, { ...it, wishes: [...wmap.values()].slice(0, 20), votes: { ...(cur.votes || {}), ...(it.votes || {}) } });
      } else if (col === "casts" && cur && Array.isArray(it.segs)) {
        const seen = new Set((cur.segs || []).map((x) => (x.by || "") + ":" + (x.ts || 0)));
        const merged = (cur.segs || []).slice();
        for (const x of (it.segs || [])) {
          if (!x || !x.audio) continue;
          const sig = (x.by || "") + ":" + (x.ts || 0);
          if (!seen.has(sig)) { seen.add(sig); merged.push(x); }
        }
        merged.sort((a, b) => (a.ts || 0) - (b.ts || 0));
        map.set(it.id, { ...it, segs: merged.slice(-12) });
      } else if (col === "banks" && cur && Array.isArray(it.dep)) {
        const seen = new Set((cur.dep || []).map((x) => (x.by || "") + ":" + (x.ts || 0) + ":" + (x.amt || 0)));
        const merged = (cur.dep || []).slice();
        for (const x of (it.dep || [])) {
          if (!x || !(Number(x.amt) > 0)) continue;
          const sig = (x.by || "") + ":" + (x.ts || 0) + ":" + (x.amt || 0);
          if (!seen.has(sig)) { seen.add(sig); merged.push(x); }
        }
        merged.sort((a, b) => (a.ts || 0) - (b.ts || 0));
        map.set(it.id, { ...it, dep: merged.slice(-200) });
      } else if (col === "chains" && cur && Array.isArray(it.lines)) {
        const seen = new Set((cur.lines || []).map((x) => (x.by || "") + ":" + (x.ts || 0)));
        const merged = (cur.lines || []).slice();
        for (const x of (it.lines || [])) {
          if (!x || !x.t) continue;
          const sig = (x.by || "") + ":" + (x.ts || 0);
          if (!seen.has(sig)) { seen.add(sig); merged.push(x); }
        }
        merged.sort((a, b) => (a.ts || 0) - (b.ts || 0));
        map.set(it.id, { ...it, lines: merged.slice(-200) });
      } else if (col === "quests" && cur && it.done) {
        const dn = { ...(cur.done || {}) };
        for (const [day, dd] of Object.entries(it.done || {})) {
          dn[day] = { ...(dn[day] || {}), ...(dd || {}) };
        }
        map.set(it.id, { ...it, done: dn });
      } else if (col === "trips" && cur && Array.isArray(it.items)) {
        const imap = new Map();
        for (const x of (cur.items || [])) if (x && x.id) imap.set(x.id, x);
        for (const x of (it.items || [])) {
          if (!x || !x.id) continue;
          const o = imap.get(x.id);
          if (o) imap.set(x.id, { ...x, done: { ...(o.done || {}), ...(x.done || {}) } });
          else imap.set(x.id, x);
        }
        map.set(it.id, { ...it, items: [...imap.values()].slice(0, 60) });
      } else {
        map.set(it.id, it);
      }
    }
  }
  const out = [...map.values()];
  out.sort((a, b) => (b.u || b.ts || 0) - (a.u || a.ts || 0));
  return out.slice(0, cap || 500);
}
/* ---------- ادغام daily ----------
   فرمت سرور: { [date]: { q, a: {uid:{t,ts}}, u } }
   فرمت محلی: { [date]: { q, mine, mineTs, theirs, theirsTs, u } } */
function mergeDaily(localD, remoteD, me, peer) {
  const out = { ...(localD || {}) };
  for (const [k, v] of Object.entries(remoteD || {})) {
    if (!v || typeof v !== "object") continue;
    const cur = out[k] || {};
    if (v.a && typeof v.a === "object") {
      const mineA = (me && v.a[me]) || {};
      let thT = "", thTs = 0;
      for (const [id, ans] of Object.entries(v.a)) {
        if (id === me || !ans || typeof ans !== "object") continue;
        if ((ans.ts || 0) > thTs && ans.t) { thT = ans.t; thTs = ans.ts; }
      }
      const nv = { q: v.q || cur.q || "" };
      if ((mineA.ts || 0) > (cur.mineTs || 0) && mineA.t) { nv.mine = mineA.t; nv.mineTs = mineA.ts; }
      else { nv.mine = cur.mine || ""; nv.mineTs = cur.mineTs || 0; }
      if (thTs >= (cur.theirsTs || 0) && thT) { nv.theirs = thT; nv.theirsTs = thTs; }
      else { nv.theirs = cur.theirs || ""; nv.theirsTs = cur.theirsTs || 0; }
      nv.u = Math.max(cur.u || 0, v.u || 0);
      out[k] = nv;
    } else {
      // فرمت قدیمی/محلی
      const nv = { ...cur };
      if ((v.theirsTs || 0) > (cur.theirsTs || 0) && v.theirs) { nv.theirs = v.theirs; nv.theirsTs = v.theirsTs; }
      if ((v.mineTs || 0) > (cur.mineTs || 0) && v.mine) { nv.mine = v.mine; nv.mineTs = v.mineTs; }
      if (v.q && !nv.q) nv.q = v.q;
      nv.u = Math.max(cur.u || 0, v.u || 0);
      out[k] = nv;
    }
  }
  const keys = Object.keys(out).sort().slice(-180);
  const slim = {};
  for (const k of keys) slim[k] = out[k];
  return slim;
}

/* ---------- ادغام حال مشترک (مثل daily ولی با v/note) ---------- */
function mergeMoods(localD, remoteD, me) {
  const out = { ...(localD || {}) };
  for (const [k, v] of Object.entries(remoteD || {})) {
    if (!v || typeof v !== "object" || !/^\d{4}-\d{2}-\d{2}$/.test(k)) continue;
    const cur = out[k] || {};
    if (v.a && typeof v.a === "object") {
      const mineA = (me && v.a[me]) || {};
      let th = null, thTs = 0;
      for (const [id, ans] of Object.entries(v.a)) {
        if (id === me || !ans || typeof ans !== "object") continue;
        if ((ans.ts || 0) > thTs && ans.v) { th = ans; thTs = ans.ts; }
      }
      const nv = {};
      if ((mineA.ts || 0) > (cur.mineTs || 0) && mineA.v) { nv.mineV = mineA.v; nv.mineNote = mineA.note || ""; nv.mineTs = mineA.ts; }
      else { nv.mineV = cur.mineV || 0; nv.mineNote = cur.mineNote || ""; nv.mineTs = cur.mineTs || 0; }
      if (th && thTs >= (cur.theirsTs || 0)) { nv.theirsV = th.v; nv.theirsNote = th.note || ""; nv.theirsTs = thTs; }
      else { nv.theirsV = cur.theirsV || 0; nv.theirsNote = cur.theirsNote || ""; nv.theirsTs = cur.theirsTs || 0; }
      nv.u = Math.max(cur.u || 0, v.u || 0);
      out[k] = nv;
    } else {
      const nv = { ...cur };
      if ((v.mineTs || 0) > (cur.mineTs || 0) && v.mineV) { nv.mineV = v.mineV; nv.mineNote = v.mineNote || ""; nv.mineTs = v.mineTs; }
      if ((v.theirsTs || 0) > (cur.theirsTs || 0) && v.theirsV) { nv.theirsV = v.theirsV; nv.theirsNote = v.theirsNote || ""; nv.theirsTs = v.theirsTs; }
      nv.u = Math.max(cur.u || 0, v.u || 0);
      out[k] = nv;
    }
  }
  const keys = Object.keys(out).sort().slice(-180);
  const slim = {};
  for (const k of keys) slim[k] = out[k];
  return slim;
}

/* ---------- tombstoneهای محلی ---------- */
function localTombs() {
  const t = rd("sp:tombs", {});
  return t && typeof t === "object" ? t : {};
}
function applyTombs(list, tombs) {
  if (!tombs || !list || !list.length) return list || [];
  return list.filter((it) => {
    const t = tombs[it.id];
    return !(t && t >= (it.u || 0));
  });
}

/* ---------- خواندن داک محلی (فقط موارد مجاز حریم خصوصی) ----------
   عکس‌ها: ۳۰ خاطره‌ی اخیر کامل + پنجره‌ی چرخشی ۱۰تایی برای backfill */
function localDoc() {
  const priv = getPrivacy();
  const doc = { profile: rd("sp:profile", null), tombs: localTombs() };
  for (const c of SPACE_KEYS) {
    if (c === "profile") continue;
    if (priv[c] === false) { doc[c] = undefined; continue; }
    if (c === "memories") {
      const all = rd("sp:memories", []);
      let cursor = Number(rd("sp:photoCursor", 30)) || 30;
      doc.memories = all.map((m, i) => {
        if (i < 30 || (i >= cursor && i < cursor + 10)) return m;
        if (!m.photos || !m.photos.length) return m;
        const { photos, ...rest } = m;
        return { ...rest, photos: [] };
      });
      cursor = cursor + 10 >= all.length ? 30 : cursor + 10;
      wr("sp:photoCursor", cursor);
      continue;
    }
    doc[c] = rd("sp:" + c, (c === "daily" || c === "moods") ? {} : []);
  }
  return doc;
}
/* ---------- اعمال داک ادغام‌شده روی حافظه محلی ---------- */
function applyDoc(doc, ids) {
  if (!doc || typeof doc !== "object") return;
  const me = ids && ids.me ? ids.me : "";
  const priv = getPrivacy();
  if (doc.profile && typeof doc.profile === "object") {
    const cur = rd("sp:profile", null);
    if (!cur || (doc.profile.u || 0) >= (cur.u || 0)) wr("sp:profile", doc.profile);
  }
  // tombstoneهای سرور را با محلی ادغام کن
  if (doc.tombs && typeof doc.tombs === "object") {
    const lt = localTombs();
    for (const [col, idmap] of Object.entries(doc.tombs)) {
      if (!idmap || typeof idmap !== "object") continue;
      lt[col] = lt[col] && typeof lt[col] === "object" ? lt[col] : {};
      for (const [id, ts] of Object.entries(idmap)) {
        if (Number(ts) > (lt[col][id] || 0)) lt[col][id] = Number(ts);
      }
    }
    wr("sp:tombs", lt);
  }
  const tombs = localTombs();
  const caps = { memories: 200, events: 300, notes: 200, wishlist: 200, bucket: 200, letters: 200, songs: 200, expenses: 300, games: 100, dares: 200, polls: 200, trips: 100, spins: 100, capsules: 100, chains: 50, quests: 20, arts: 200, casts: 20, pins: 200, banks: 50, movies: 200, recipes: 100, dreams: 200, shots: 100, ballots: 24, counts: 50, laws: 100 };
  for (const c of SPACE_KEYS) {
    if (c === "profile" || doc[c] === undefined) continue;
    if (c === "daily" || c === "moods") {
      const fn = c === "daily" ? mergeDaily : mergeMoods;
      wr("sp:" + c, fn(rd("sp:" + c, {}), doc[c], me));
      continue;
    }
    if (priv[c] === false) continue; // کاربر این را خصوصی کرده؛ ریموت را هم نپذیر
    wr("sp:" + c, applyTombs(mergeList(rd("sp:" + c, []), doc[c], caps[c] || 300, c), tombs[c]));
  }
}

let syncing = false;
let lastStatus = { state: "idle", ts: 0, paired: false };

export const syncStatus = () => lastStatus;
const subs = new Set();
export function onSyncStatus(fn) { subs.add(fn); return () => subs.delete(fn); }
function emit() { for (const fn of [...subs]) { try { fn(lastStatus); } catch {} } }

/** سینک کامل: pull بعد push (ادغام دوطرفه) */
export async function syncSpace(forcePush = false) {
  if (syncing) return lastStatus;
  if (!getToken()) { lastStatus = { state: "local", ts: Date.now(), paired: false }; emit(); return lastStatus; }
  syncing = true;
  lastStatus = { ...lastStatus, state: "syncing", ts: Date.now() };
  emit();
  try {
    // ۱) pull
    const g = await api("/api/space");
    if (!g.ok || !g.data) throw new Error("pull");
    if (g.data.paired === false) {
      lastStatus = { state: "unpaired", ts: Date.now(), paired: false };
      // اگه قبلاً جفت بودیم و اون‌ور قطع کرده → فقط خواندنی
      try { if (localStorage.getItem("mk:spacewaspaired") === "1") localStorage.setItem("mk:spacero", "1"); } catch {}
      emit();
      syncing = false;
      return lastStatus;
    }
    const ids = { me: g.data.me || "", peer: g.data.peer || "" };
    if (g.data.doc) applyDoc(g.data.doc, ids);
    // ۲) push (اگر تغییری بوده یا force)
    const dirty = getDirty();
    const last = getLastSync();
    if (forcePush || dirty > last) {
      const p = await api("/api/space", { method: "POST", body: { doc: localDoc() } });
      if (p.ok && p.data && p.data.doc) applyDoc(p.data.doc, { me: p.data.me || ids.me, peer: p.data.peer || ids.peer });
      if (p.ok) setLastSync(Date.now());
    } else {
      setLastSync(Date.now());
    }
    try { localStorage.setItem("mk:spacewaspaired", "1"); localStorage.removeItem("mk:spacero"); } catch {}
    lastStatus = { state: "ok", ts: Date.now(), paired: true, partner: g.data.partner || "" };
  } catch {
    lastStatus = { ...lastStatus, state: getLastSync() ? "offline" : "local", ts: Date.now() };
  }
  emit();
  syncing = false;
  // به UI بگو داده عوض شده (بدون جلو بردن dirty)
  try {
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("sp:synced"));
  } catch {}
  return lastStatus;
}

/* ---------- چت زوج + صف آفلاین (v8.1) ---------- */
export async function pullChat(since) {
  try {
    const r = await api("/api/space?chat=1&since=" + (since || 0));
    if (r.ok && r.data) return r.data;
  } catch {}
  return null;
}
export function queueChat(msg) {
  try {
    const q = rd("sp:chatq", []);
    const qid = "q" + Date.now().toString(36) + Math.floor(Math.random() * 9999);
    q.push({ ...msg, qid, qts: Date.now() });
    wr("sp:chatq", q.slice(-50));
    return qid;
  } catch { return ""; }
}
export async function pushChat(msg) {
  try {
    const r = await api("/api/space", { method: "POST", body: { chat: msg } });
    if (r.ok) return r.data;
    if (r.status === 0) return { queued: true, qid: queueChat(msg) }; // فقط خطای شبکه → صف
    return null;
  } catch { return { queued: true, qid: queueChat(msg) }; }
}
/** ارسال پیام‌های صف‌شده؛ خروجی: [{qid, msg}] */
export async function flushChatQ() {
  const out = [];
  try {
    const q = rd("sp:chatq", []);
    if (!q.length) return out;
    const rest = [];
    for (const m of q) {
      const { qid, qts, ...msg } = m;
      try {
        const r = await api("/api/space", { method: "POST", body: { chat: msg } });
        if (r.ok && r.data && r.data.msg) out.push({ qid, msg: r.data.msg });
        else rest.push(m);
      } catch { rest.push(m); }
    }
    wr("sp:chatq", rest.slice(-50));
  } catch {}
  return out;
}
/* ---------- لوکیشن زنده (v8.1) ---------- */
export async function pushLive(lat, lng, until) {
  try {
    const r = await api("/api/space", { method: "POST", body: { live: { lat, lng, until } } });
    return r.ok;
  } catch { return false; }
}
export async function stopLive() {
  try { await api("/api/space", { method: "POST", body: { live: { stop: true } } }); } catch {}
}
export async function pushTyping() {
  try { await api("/api/space", { method: "POST", body: { typing: 1 } }); } catch {}
}

/* ---------- وضعیت جفت‌شدن (کش‌شده) ---------- */
let pairCache = { ts: 0, paired: false, partner: "" };
export async function pairState(force) {
  if (!getToken()) return { paired: false };
  if (!force && Date.now() - pairCache.ts < 30000) return pairCache;
  try {
    const r = await api("/api/partner");
    if (r.ok && r.data) {
      pairCache = { ts: Date.now(), paired: !!r.data.paired, partner: (r.data.partner && r.data.partner.name) || "", since: r.data.since || 0 };
      return pairCache;
    }
  } catch {}
  return pairCache;
}
