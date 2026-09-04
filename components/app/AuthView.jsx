"use client";
// ---------------------------------------------------------------------------
// components/app/AuthView.jsx — ورود / ثبت‌نام / بازیابی با کد
// ---------------------------------------------------------------------------
import { useState } from "react";
import { Logo, Ic } from "@/lib/icons";
import { confettiBurst } from "@/lib/fx";

export default function AuthView({ onAuthed, compact }) {
  const [view, setView] = useState("login"); // login | register | recover
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e && e.preventDefault();
    if (busy) return;
    setErr("");
    const u = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(u)) { setErr("یوزرنیم: ۳ تا ۲۰ حرف انگلیسی، عدد یا _"); return; }
    if (view !== "recover" && password.length < 6) { setErr("رمزت حداقل ۶ کاراکتر باشه"); return; }
    if (view === "recover" && password.length < 6) { setErr("رمز جدید حداقل ۶ کاراکتر باشد"); return; }
    setBusy(true);
    try {
      const path = view === "register" ? "register" : view === "recover" ? "recover" : "login";
      const body = view === "register"
        ? { username: u, password, name: name.trim() }
        : view === "recover"
          ? { username: u, recoveryCode: code.trim(), newPassword: password }
          : { username: u, password };
      const res = await fetch("/api/auth/" + path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const r = await res.json();
      if (r && r.ok) {
        if (view === "register") { try { confettiBurst({ x: window.innerWidth / 2, y: window.innerHeight * 0.3, n: 90, spread: 6 }); } catch {} }
        onAuthed(r.token, r.user, r.recoveryCode);
      } else {
        setErr((r && r.message) || "یه چیزی شد؛ دوباره امتحان کن");
      }
    } catch { setErr("اینترنتت وصل نیست به نظرم"); }
    setBusy(false);
  };

  return (
    <div className={"authwrap" + (compact ? " compact" : "")}>
      <div className="authcard card">
        <div className="authhead">
          <Logo s={44} />
          <div>
            <h2>{view === "register" ? "بریم یه حساب بسازیم" : view === "recover" ? "بازیابی حساب" : "خوش برگشتی"}</h2>
            <p>{view === "register" ? "ده ثانیه‌ی حداکثر، قول" : view === "recover" ? "با کد بازیابی، رمز نو بذار" : "بزن تو حسابت"}</p>
          </div>
        </div>
        <form onSubmit={submit} className="authform">
          {view === "register" ? (
            <label className="field">
              <span className="flbl"><Ic n="user" s={15} /> اسم مستعار (اختیاری)</span>
              <input className="inp" placeholder="مثلاً: سارا" value={name} onChange={(e) => setName(e.target.value)} maxLength={32} />
            </label>
          ) : null}
          <label className="field">
            <span className="flbl"><Ic n="user" s={15} /> یوزرنیم</span>
            <input className="inp" autocomplete="username" dir="ltr" placeholder="my_username" value={username} onChange={(e) => setUsername(e.target.value)} />
          </label>
          {view === "recover" ? (
            <label className="field">
              <span className="flbl"><Ic n="key" s={15} /> کد بازیابی (اون موقع موقع ثبت‌نام دادیم بهت)</span>
              <input className="inp" dir="ltr" placeholder="ABCD234567" value={code} onChange={(e) => setCode(e.target.value)} maxLength={12} />
            </label>
          ) : null}
          <label className="field">
            <span className="flbl"><Ic n="lock" s={15} /> {view === "recover" ? "رمز جدید" : "رمز"}</span>
            <input className="inp" type="password" autocomplete={view === "login" ? "current-password" : "new-password"} placeholder={view === "recover" ? "رمز نو، حداقل ۶ تا کاراکتر" : "حداقل ۶ کاراکتر"} value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {err ? <div className="auth-err" role="alert"><Ic n="alert" s={16} /> {err}</div> : null}
          <button className="btn primary" type="submit" disabled={busy}>
            {busy ? "صبر کن…" : view === "register" ? "ثبت‌نام کن، بزن بریم" : view === "recover" ? "رمز نو بذار و برو تو" : "ورود"}
          </button>
        </form>
        <div className="authlinks">
          {view === "login" ? (
            <>
              <button type="button" className="auth-switch" onClick={() => { setView("register"); setErr(""); }}>حساب نداری؟ یه دقیقه‌ی حسابت رو بساز</button>
              <button type="button" className="auth-forgot" onClick={() => { setView("recover"); setErr(""); }}>رمزت یادت رفته؟</button>
            </>
          ) : (
            <button type="button" className="auth-switch" onClick={() => { setView("login"); setErr(""); }}>برگرد عقب</button>
          )}
        </div>
      </div>
    </div>
  );
}
