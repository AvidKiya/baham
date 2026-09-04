"use client";
// ---------------------------------------------------------------------------
// lib/appauth.js — احراز هویت سمت کلاینت اپ مخ‌یار
// ---------------------------------------------------------------------------
const TOKEN_KEY = "mk:token";
const USER_KEY = "mk:user";

export const getToken = () => {
  try { return localStorage.getItem(TOKEN_KEY) || ""; } catch { return ""; }
};
export const getUser = () => {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || "null"); } catch { return null; }
};
export const setSession = (token, user) => {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {}
};
export const clearSession = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {}
};

/** fetch با توکن؛ خروجی همیشه {status, ok, data} */
export async function api(path, opts = {}) {
  const headers = Object.assign({ "content-type": "application/json" }, opts.headers || {});
  const token = getToken();
  if (token) headers.authorization = "Bearer " + token;
  let res;
  try {
    res = await fetch(path, { method: opts.method || "GET", headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
  } catch {
    return { status: 0, ok: false, data: { ok: false, message: "اتصال برقرار نشد" } };
  }
  let data = {};
  try { data = await res.json(); } catch {}
  if (res.status === 401 && data && data.error === "unauthorized") clearSession();
  return { status: res.status, ok: res.ok && data.ok !== false, data };
}
