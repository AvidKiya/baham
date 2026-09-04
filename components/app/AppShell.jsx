"use client";
// ---------------------------------------------------------------------------
// components/app/AppShell.jsx — پوسته‌ی مخ‌یار: تب‌بار شیشه‌ای شناور + دارک
// ---------------------------------------------------------------------------
import { useState, useEffect, useCallback } from "react";
import { getToken, getUser, setSession, clearSession, api } from "@/lib/appauth";
import { Ic, Logo } from "@/lib/icons";
import { buzz } from "@/lib/fx";
import { touchDay } from "@/lib/rizz";
import Onboarding from "./Onboarding";
import AuthView from "./AuthView";
import HomeTab from "./HomeTab";
import ChatTab from "./ChatTab";
import CreateTab from "./CreateTab";
import HistoryTab from "./HistoryTab";
import SettingsTab from "./SettingsTab";

const TABS = [
  { id: "home", ic: "home", label: "خانه" },
  { id: "chat", ic: "chatSpark", label: "چت‌یار" },
  { id: "create", ic: "invite", label: "ساخت درخواست" },
  { id: "history", ic: "clock", label: "تاریخچه" },
  { id: "settings", ic: "gear", label: "تنظیمات" },
];

export const ACCENTS = {
  rose: ["#ff4f8b", "#a855f7"],
  violet: ["#a855f7", "#6366f1"],
  amber: ["#f59e0b", "#ef4444"],
  teal: ["#2dd4bf", "#3b82f6"],
};

export default function AppShell() {
  const [booted, setBooted] = useState(false);
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("home");
  const [drawer, setDrawer] = useState(false);
  const [installEvt, setInstallEvt] = useState(null);
  const [acc, setAcc] = useState("rose");
  const [toast, setToast] = useState("");
  const [recCode, setRecCode] = useState("");
  const [theme, setTheme] = useState("light");
  const [quiz, setQuiz] = useState(false);

  useEffect(() => {
    try {
      const t = localStorage.getItem("mk:tab");
      if (t && TABS.some((x) => x.id === t)) setTab(t);
      const a = localStorage.getItem("mk:accent");
      if (a && ACCENTS[a]) setAcc(a);
      const th = localStorage.getItem("mk:theme");
      if (th === "dark" || th === "light") setTheme(th);
      else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) setTheme("dark");
    } catch {}
    touchDay();
    const u = getUser();
    if (getToken() && u) {
      setUser(u);
      api("/api/me").then((r) => { if (r.ok && r.data && r.data.user) saveUser(r.data.user); });
    } else if (getToken()) {
      api("/api/me").then((r) => { if (r.ok && r.data && r.data.user) saveUser(r.data.user); });
    }
    if ("serviceWorker" in navigator) {
      try { navigator.serviceWorker.register("/sw.js").catch(() => {}); } catch {}
    }
    const bip = (e) => { e.preventDefault(); setInstallEvt(e); };
    window.addEventListener("beforeinstallprompt", bip);
    try {
      const q = new URLSearchParams(location.search);
      if (q.get("connected") === "1") { setToast("اتصال انجام شد؛ چت‌یار روشن است"); setTimeout(() => api("/api/me").then((r) => { if (r.ok && r.data && r.data.user) saveUserRef(r.data.user); }), 400); }
      else if (q.get("connect")) setToast("اتصال انجام نشد؛ دوباره تلاش کن");
      if (q.get("connected") || q.get("connect")) history.replaceState({}, "", "/");
    } catch {}
    setBooted(true);
    return () => window.removeEventListener("beforeinstallprompt", bip);
  }, []);

  const saveUser = (u) => {
    setUser(u);
    try { localStorage.setItem("mk:user", JSON.stringify(u)); } catch {}
  };
  const saveUserRef = saveUser;

  const onAuthed = (token, u, recoveryCode) => {
    setSession(token, u);
    saveUser(u);
    if (recoveryCode) setRecCode(recoveryCode);
    if (u && u.profile && !u.profile.onboarded) setQuiz(true);
  };
  const logout = () => {
    clearSession();
    setUser(null);
    setDrawer(false);
    setTab("settings");
  };

  const go = (id) => {
    setTab(id);
    try { localStorage.setItem("mk:tab", id); } catch {}
    setDrawer(false);
    try { buzz(6); } catch {}
    window.scrollTo({ top: 0 });
  };
  const setAccent = (k) => {
    setAcc(k);
    try { localStorage.setItem("mk:accent", k); } catch {}
  };
  const setThemeMode = (m) => {
    setTheme(m);
    try { localStorage.setItem("mk:theme", m); } catch {}
  };
  const install = async () => {
    if (!installEvt) return;
    try { await installEvt.prompt(); } catch {}
  };

  if (!booted) return null;
  const [a1, a2] = ACCENTS[acc] || ACCENTS.rose;
  const Gate = () => <AuthView onAuthed={onAuthed} compact />;

  return (
    <div className="appwrap" data-theme={theme} style={{ "--acc": a1, "--acc2": a2 }} dir="rtl">
      <div className="appbg" aria-hidden="true">
        <span className="ablob a1" />
        <span className="ablob a2" />
      </div>

      <header className="topapp">
        <button className="topburger" type="button" aria-label="حساب من" onClick={() => (user ? setDrawer(true) : go("settings"))}>
          <Ic n="user" s={20} />
        </button>
        <div className="topbrand">
          <Logo s={30} />
          <div className="topname">مخ‌یار</div>
        </div>
        <div className="topuser" style={{ marginRight: 6, marginLeft: 6 }}>{user ? "@" + user.username : "مهمان"}</div>
        <button className="toptheme" type="button" aria-label={theme === "dark" ? "تم روشن" : "تم تاریک"} onClick={() => setThemeMode(theme === "dark" ? "light" : "dark")}>
          <Ic n={theme === "dark" ? "sun" : "moon"} s={19} />
        </button>
      </header>

      {quiz && user && !recCode ? (
        <Onboarding onDone={(style) => {
          setQuiz(false);
          if (style) api("/api/me").then((r) => { if (r.ok && r.data && r.data.user) saveUser(r.data.user); });
          setToast("خوش آمدی؛ پروفایلت آماده شد");
        }} />
      ) : null}

      {drawer && user ? (
        <div className="dscrim" onClick={() => setDrawer(false)}>
          <aside className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="dhead">
              <Logo s={38} />
              <div>
                <div className="dname">{(user.profile && user.profile.name) || user.username}</div>
                <div className="dsub">@{user.username}</div>
              </div>
            </div>
            <div className="dlinks">
              {TABS.filter((t) => t.id !== "home").map((t) => (
                <button key={t.id} type="button" onClick={() => go(t.id)} className={"dlink" + (tab === t.id ? " on" : "")}>
                  <Ic n={t.ic} s={19} /> <span>{t.label}</span>
                </button>
              ))}
              {installEvt ? (
                <button type="button" className="dlink" onClick={install}><Ic n="download" s={19} /> <span>نصب اپ</span></button>
              ) : null}
            </div>
            <button type="button" className="btn ghost danger dbtn" onClick={logout}>
              <Ic n="logout" s={18} /> خروج از حساب
            </button>
          </aside>
        </div>
      ) : null}

      <main className="appcol tabpane" key={tab}>
        {tab === "home" ? <HomeTab go={go} user={user} installEvt={installEvt} install={install} /> : null}
        {tab === "chat" ? (user ? <ChatTab user={user} go={go} onUser={saveUser} /> : <Gate />) : null}
        {tab === "create" ? <CreateTab user={user} go={go} cfg={null} /> : null}
        {tab === "history" ? (user ? <HistoryTab user={user} /> : <Gate />) : null}
        {tab === "settings" ? (user ? <SettingsTab user={user} onUser={saveUser} logout={logout} installEvt={installEvt} install={install} acc={acc} setAcc={setAccent} theme={theme} setTheme={setThemeMode} /> : <Gate />) : null}
      </main>

      {toast ? (
        <div className="toast" role="status" onClick={() => setToast("")}>
          <Ic n={/انجام نشد/.test(toast) ? "alert" : "check"} s={16} /> {toast}
        </div>
      ) : null}

      {recCode ? (
        <div className="recscrim" onClick={() => setRecCode("")}>
          <div className="recmodal card" onClick={(e) => e.stopPropagation()}>
            <span className="btile"><Ic n="key" s={20} /></span>
            <h3>کد بازیابی حسابت</h3>
            <p>اگر روزی رمزت را فراموش کردی، با این کد می‌توانی حسابت را پس بگیری. <b>فقط همین یک‌بار نشان داده می‌شود.</b></p>
            <button type="button" className="recode" onClick={() => { try { navigator.clipboard.writeText(recCode); } catch {} }}>{recCode}</button>
            <button type="button" className="btn primary big rec-ok" onClick={() => setRecCode("")}>نوشتمش، بزن بریم</button>
          </div>
        </div>
      ) : null}

      <nav className="tabbar" role="tablist" aria-label="بخش‌های مخ‌یار">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id}
            className={"tab" + (tab === t.id ? " on" : "")} onClick={() => go(t.id)}>
            <span className="tico"><Ic n={t.ic} s={22} /></span>
            <span className="tlbl">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
