"use client";
// ---------------------------------------------------------------------------
// components/app/AppShell.jsx — پوسته‌ی باهم: تب‌بار شیشه‌ای شناور + دارک
// ---------------------------------------------------------------------------
import { useState, useEffect, useCallback } from "react";
import { getToken, getUser, setSession, clearSession, api } from "@/lib/appauth";
import { Ic, Logo } from "@/lib/icons";
import { buzz } from "@/lib/fx";
import { touchDay } from "@/lib/rizz";
import { SOS_QUICK } from "@/lib/relationship";
import Onboarding from "./Onboarding";
import AuthView from "./AuthView";
import HomeTab from "./HomeTab";
import ChatTab from "./ChatTab";
import CreateTab from "./CreateTab";
import DiscoverTab from "./DiscoverTab";
import SpaceTab from "./SpaceTab";
import UsTab from "./UsTab";
import HistoryTab from "./HistoryTab";
import SettingsTab from "./SettingsTab";

const TABS = [
  { id: "home", ic: "home", label: "خانه" },
  { id: "space", ic: "hearts", label: "فضای ما" },
  { id: "chat", ic: "chatSpark", label: "چت‌یار" },
  { id: "discover", ic: "sparkles", label: "کشف" },
  { id: "create", ic: "invite", label: "براش بساز" },
  { id: "us", ic: "calHeart", label: "ما" },
  { id: "history", ic: "clock", label: "قبلیام" },
  { id: "settings", ic: "gear", label: "تنظیمات" },
];

export const ACCENTS = {
  rose: ["#ff4f8b", "#a855f7"],
  violet: ["#a855f7", "#6366f1"],
  amber: ["#f59e0b", "#ef4444"],
  teal: ["#2dd4bf", "#3b82f6"],
};

const effTheme = (mode) => {
  if (mode !== "auto") return mode;
  const h = new Date().getHours();
  let dark = h >= 19 || h < 6;
  try { if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) dark = true; } catch {}
  return dark ? "dark" : "light";
};

export default function AppShell() {
  const [booted, setBooted] = useState(false);
  const [themeMode, setThemeModeState] = useState("light");
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("home");
  const [sosOpen, setSosOpen] = useState(false);
  const [unreplied, setUnreplied] = useState(0);
  const [drawer, setDrawer] = useState(false);
  const [installEvt, setInstallEvt] = useState(null);
  const [acc, setAcc] = useState("rose");
  const [toast, setToast] = useState("");
  const [recCode, setRecCode] = useState("");
  const [theme, setTheme] = useState("light");
  const [quiz, setQuiz] = useState(false);
  const [online, setOnline] = useState(true);
  const [updateAv, setUpdateAv] = useState(false);
  const [locked, setLocked] = useState(false);
  const [lockPin, setLockPin] = useState("");
  const lockSet = () => { try { return !!localStorage.getItem("mk:applock"); } catch { return false; } };

  useEffect(() => {
    try {
      /* دیپ‌لینک‌ها: ?pair=CODE · ?tab= · ?view= · ?new=1 · ?share=1 */
      const qp = new URLSearchParams(window.location.search || "");
      const pairC = qp.get("pair");
      let deepTab = null;
      if (pairC && /^[a-f0-9]{4,16}$/i.test(pairC)) {
        localStorage.setItem("mk:paircode", pairC.toLowerCase());
        deepTab = "us";
      }
      /* برگشت از درگاه زرین‌پال */
      if (qp.get("plus") === "verify" && qp.get("Authority")) {
        try { localStorage.setItem("mk:plusverify", JSON.stringify({ authority: String(qp.get("Authority")).slice(0, 64), status: String(qp.get("Status") || ""), ts: Date.now() })); } catch {}
        deepTab = "settings";
      }
      const qtab = qp.get("tab");
      if (qtab && TABS.some((x) => x.id === qtab)) deepTab = qtab;
      const qview = qp.get("view");
      if (qview) { try { localStorage.setItem("mk:spaceview", qview); } catch {} }
      if (qp.get("new") === "1") { try { localStorage.setItem("mk:spacenew", "1"); } catch {} }
      /* دریافت اشتراک از اپ‌های دیگر (Share Target) → خاطره جدید */
      if (qp.get("share") === "1") {
        try {
          const sh = { t: (qp.get("t") || "").slice(0, 100), text: (qp.get("text") || "").slice(0, 2000), url: (qp.get("url") || "").slice(0, 500), ts: Date.now() };
          if (sh.text || sh.url) localStorage.setItem("mk:share", JSON.stringify(sh));
        } catch {}
        deepTab = "space";
        try { localStorage.setItem("mk:spaceview", "memories"); localStorage.setItem("mk:spacenew", "1"); } catch {}
      }
      if (deepTab) {
        setTab(deepTab);
        try { localStorage.setItem("mk:tab", deepTab); } catch {}
      } else {
        const t = localStorage.getItem("mk:tab");
        if (t && TABS.some((x) => x.id === t)) setTab(t);
      }
      /* فقط پارامترهای مصرف‌شده را پاک کن (connected/connect می‌مونه) */
      if (pairC || qtab || qview || qp.get("new") || qp.get("share") || qp.get("plus")) {
        try {
          ["pair", "tab", "view", "new", "share", "plus", "Authority", "Status", "t", "text", "url"].forEach((k) => qp.delete(k));
          const rest = qp.toString();
          window.history.replaceState({}, "", "/" + (rest ? "?" + rest : ""));
        } catch {}
      }
      const a = localStorage.getItem("mk:accent");
      if (a && ACCENTS[a]) setAcc(a);
      const th = localStorage.getItem("mk:theme");
      if (th === "dark" || th === "light") setTheme(th);
      else if (th === "auto") { setTheme(effTheme("auto")); setThemeMode("auto"); }
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
      try {
        navigator.serviceWorker.register("/sw.js").then((reg) => {
          try {
            let sawUpdate = false;
            reg.addEventListener("updatefound", () => { sawUpdate = true; });
            navigator.serviceWorker.addEventListener("controllerchange", () => { if (sawUpdate) setUpdateAv(true); });
            if (reg.waiting) setUpdateAv(true);
          } catch {}
        }).catch(() => {});
      } catch {}
    }
    const bip = (e) => { e.preventDefault(); setInstallEvt(e); };
    window.addEventListener("beforeinstallprompt", bip);
    /* وضعیت آنلاین/آفلاین */
    const onOn = () => setOnline(true);
    const onOff = () => setOnline(false);
    window.addEventListener("online", onOn);
    window.addEventListener("offline", onOff);
    try { setOnline(navigator.onLine !== false); } catch {}
    /* قفل اپ: موقع بوت + قفل خودکار بعد از ۲ دقیقه پس‌زمینه */
    try { if (localStorage.getItem("mk:applock")) { setLocked(true); setLockPin(""); } } catch {}
    const vis = () => {
      try {
        if (document.hidden) localStorage.setItem("mk:lockts", String(Date.now()));
        else {
          const pin = localStorage.getItem("mk:applock");
          const ts = Number(localStorage.getItem("mk:lockts") || 0);
          if (pin && ts && Date.now() - ts > 120000) { setLocked(true); setLockPin(""); }
        }
      } catch {}
    };
    document.addEventListener("visibilitychange", vis);
    const thTimer = setInterval(() => {
      try { if (localStorage.getItem("mk:theme") === "auto") setTheme(effTheme("auto")); } catch {}
    }, 60000);
    try {
      const q = new URLSearchParams(location.search);
      if (q.get("connected") === "1") { setToast("وصل شد؛ چت‌یار روشنه ✨"); setTimeout(() => api("/api/me").then((r) => { if (r.ok && r.data && r.data.user) saveUserRef(r.data.user); }), 400); }
      else if (q.get("connect")) setToast("وصل نشد؛ یه بار دیگه امتحان کن");
      if (q.get("connected") || q.get("connect")) history.replaceState({}, "", "/");
    } catch {}
    setBooted(true);
    return () => {
      clearInterval(thTimer);
      window.removeEventListener("beforeinstallprompt", bip);
      window.removeEventListener("online", onOn);
      window.removeEventListener("offline", onOff);
      document.removeEventListener("visibilitychange", vis);
    };
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
    setThemeModeState(m);
    setTheme(effTheme(m));
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
          <div className="topname">باهم</div>
        </div>
        <div className="topuser" style={{ marginRight: 6, marginLeft: 6 }}>{user ? "@" + user.username : "مهمان"}</div>
        <button className="toptheme" type="button" aria-label={themeMode === "auto" ? "تم خودکار" : theme === "dark" ? "تم روشن" : "تم تاریک"} onClick={() => setThemeMode(themeMode === "light" ? "dark" : themeMode === "dark" ? "auto" : "light")}>
          <Ic n={themeMode === "auto" ? "clock" : theme === "dark" ? "sun" : "moon"} s={19} />
        </button>
      </header>

      {!online ? (
        <div className="offbanner" role="status"><Ic n="alert" s={14} /> آفلاینی 📴 — خیالت راحت، همه‌چیز ذخیره می‌شه و بعداً سینک می‌شه</div>
      ) : null}
      {updateAv ? (
        <div className="updbanner" role="status">
          <span><Ic n="refresh" s={14} /> نسخه جدید اومده 🎉</span>
          <button type="button" onClick={() => { try { location.reload(); } catch {} }}>به‌روزرسانی</button>
        </div>
      ) : null}
      {locked ? <LockScreen pin={lockPin} setPin={setLockPin} onUnlock={() => { setLocked(false); setLockPin(""); }} /> : null}

      {quiz && user && !recCode ? (
        <Onboarding onDone={(style) => {
          setQuiz(false);
          if (style) api("/api/me").then((r) => { if (r.ok && r.data && r.data.user) saveUser(r.data.user); });
          setToast("خوش اومدی؛ پروفایلت آماده‌ست ✨");
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
              {lockSet() ? (
                <button type="button" className="dlink" onClick={() => { setLocked(true); setLockPin(""); setDrawer(false); }}><Ic n="lock" s={19} /> <span>قفل اپ</span></button>
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
        {tab === "space" ? <SpaceTab user={user} go={go} /> : null}
        {tab === "chat" ? (user ? <ChatTab user={user} go={go} onUser={saveUser} /> : <Gate />) : null}
        {tab === "create" ? <CreateTab user={user} go={go} cfg={null} onUnreplied={setUnreplied} /> : null}
      {tab === "discover" ? (user ? <DiscoverTab user={user} go={go} /> : <Gate />) : null}
      {tab === "us" ? <UsTab /> : null}
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
            <p>اگه یه روزی رمزت یادت رفت، با این کد حسابت رو برمی‌گردونی. <b>فقط همین یه بار نشونش می‌دیم، یه جا یادداشتش کن.</b></p>
            <button type="button" className="recode" onClick={() => { try { navigator.clipboard.writeText(recCode); } catch {} }}>{recCode}</button>
            <button type="button" className="btn primary big rec-ok" onClick={() => setRecCode("")}>نوشتمش، بزن بریم</button>
          </div>
        </div>
      ) : null}

      <button type="button" className="sosfab" aria-label="الان چی بگم؟" onClick={() => { setSosOpen(true); try { buzz(6); } catch {} }}>
        <Ic n="alert" s={17} /> <span>الان چی بگم؟</span>
      </button>
      {sosOpen ? <SosSheet onClose={() => setSosOpen(false)} onAsk={(t) => { try { localStorage.setItem("mk:sosdraft", t); } catch {} go("chat"); setSosOpen(false); }} /> : null}

      <nav className="tabbar" role="tablist" aria-label="بخش‌های باهم">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id}
            className={"tab" + (tab === t.id ? " on" : "")} onClick={() => go(t.id)}>
            <span className="tico"><Ic n={t.ic} s={22} /></span>
            <span className="tlbl">{t.label}</span>
            {t.id === "create" && unreplied > 0 ? <span className="tabdot">{unreplied > 9 ? "۹+" : unreplied.toLocaleString("fa-IR")}</span> : null}
          </button>
        ))}
      </nav>
    </div>
  );
}

/* ---------- صفحه قفل اپ (v8.1) ---------- */
function LockScreen({ pin, setPin, onUnlock }) {
  const [err, setErr] = useState(false);
  const press = (d) => {
    if (pin.length >= 8) return;
    const next = pin + d;
    setPin(next);
    try { buzz(5); } catch {}
    let real = "";
    try { real = localStorage.getItem("mk:applock") || ""; } catch {}
    if (real && next.length >= real.length) {
      if (next === real) { onUnlock(); }
      else {
        setErr(true);
        try { buzz(40); } catch {}
        setTimeout(() => { setPin(""); setErr(false); }, 500);
      }
    }
  };
  return (
    <div className="lockscrim">
      <div className={"lockbox" + (err ? " err" : "")}>
        <Logo s={52} />
        <h3>باهم قفله 🔒</h3>
        <p className="dim small">پین رو بزن تا باز شه</p>
        <div className="lockdots" dir="ltr">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={pin.length > i ? "on" : ""} />
          ))}
        </div>
        <div className="lockpad">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((d, i) => (
            d === "" ? <span key={i} /> : (
              <button key={i} type="button" onClick={() => (d === "⌫" ? setPin(pin.slice(0, -1)) : press(d))}>
                {d}
              </button>
            )
          ))}
        </div>
        {err ? <p className="anserr center">اشتباهه؛ دوباره بزن</p> : null}
      </div>
    </div>
  );
}

/* ---------- شیت «الان چی بگم؟» (v6.1) ---------- */
function SosSheet({ onClose, onAsk }) {
  const [pick, setPick] = useState(null);
  const [copied, setCopied] = useState("");
  return (
    <div className="sosscrim" onClick={onClose}>
      <div className="sossheet" onClick={(e) => e.stopPropagation()}>
        <div className="sos-head">
          <h3><Ic n="alert" s={17} /> الان چی بگم؟</h3>
          <button type="button" aria-label="بستن" onClick={onClose}><Ic n="x" s={16} /></button>
        </div>
        {!pick ? (
          <>
            <p className="dim small">وضعیت الان‌تون رو بزن؛ سه جوابِ آماده‌ی همین لحظه می‌دم — بدون اینترنت هم کار می‌کنه.</p>
            <div className="sospicks">
              {SOS_QUICK.map((s) => (
                <button key={s.id} type="button" className="sospick" onClick={() => setPick(s)}>
                  <Ic n="chatSpark" s={15} /> {s.t}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <button type="button" className="btn ghost sm" onClick={() => setPick(null)}><Ic n="chev" s={14} style={{ transform: "rotate(180deg)" }} /> {pick.t}</button>
            <div className="sosans">
              {pick.a.map((x, i) => (
                <button key={i} type="button" className="sosans-one" onClick={() => { try { navigator.clipboard.writeText(x); } catch {} setCopied(String(i + 1)); setTimeout(() => setCopied(""), 1500); }}>
                  <span>{x}</span>
                  <b>{copied === String(i + 1) ? "کپی شد" : "کپی"}</b>
                </button>
              ))}
            </div>
            <button className="btn primary big" type="button" onClick={() => onAsk("وضعیت الان: " + pick.t + ". جوابای شخصی‌تر و دقیق‌تر می‌خوام.")}>جواب شخصی‌تر از چت‌یار بگیر</button>
          </>
        )}
      </div>
    </div>
  );
}
