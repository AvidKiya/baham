"use client";
// ---------------------------------------------------------------------------
// AdminPanel.jsx — the 0-to-100 editor at /admin.
// ---------------------------------------------------------------------------
// Sections: general · themes · every text · date/time options · contract ·
// secrets · media (music/stickers) · stats · links & preview · backup.
// Saves only the DIFF against defaults → future code updates keep working.
// ---------------------------------------------------------------------------
import { useState, useEffect, useCallback, useRef } from "react";
import { DEFAULT_CONFIG } from "../shared/config.mjs";
import { validatePatch } from "../shared/validate.mjs";
import { STICKER_KINDS } from "@/lib/stickers";

const TABS = [
  { id: "general", label: "عمومی", icon: "⚙️" },
  { id: "themes", label: "تم و رنگ", icon: "🎨" },
  { id: "texts", label: "متن‌ها", icon: "✍️" },
  { id: "options", label: "گزینه‌های قرار", icon: "☕" },
  { id: "contract", label: "قرارداد", icon: "📜" },
  { id: "secrets", label: "پیام‌های مخفی", icon: "🕵️" },
  { id: "media", label: "موسیقی و استیکر", icon: "🎵" },
  { id: "stats", label: "آمار", icon: "📊" },
  { id: "links", label: "لینک و پیش‌نمایش", icon: "🔗" },
  { id: "backup", label: "پشتیبان‌گیری", icon: "💾" },
];

const TEXT_GROUPS = [
  { title: "سایت و شبکه‌های اجتماعی", keys: ["siteTitle", "siteDesc", "ogDesc"] },
  { title: "صفحه‌ی اول (لندینگ)", keys: ["landingBadge", "landingH1a", "landingH1b", "landingSub", "landingCta", "landingTry", "landingFeatures"] },
  { title: "مقدمه", keys: ["introL1", "introL2", "introBtn", "resumeChip"] },
  { title: "قبل از سؤال", keys: ["buildL1", "buildL2", "buildL3", "buildSkip", "buildBtn"] },
  { title: "سؤال اصلی", keys: ["qPre", "yesBtn", "noBtn", "noGiveUp"] },
  { title: "بعد از بله", keys: ["yesL1", "yesL2", "yesL3", "yesBtnNext", "afterL1", "afterL2", "afterBtn"] },
  { title: "انتخاب قرار", keys: ["dateTitle", "datePicked", "whenTitle", "whenTimeLabel", "whenBtn"] },
  { title: "قرارداد", keys: ["contractTitle", "contractFine", "contractSign", "contractLawyer", "contractLawyerMsg", "contractLawyerOk", "contractStamp"] },
  { title: "کارت پایانی", keys: ["finalTitle", "finalSaid", "finalDateRow", "finalWhenRow", "finalNote", "finalSave", "finalShare", "finalAgain"] },
  { title: "صفحه‌ی نه", keys: ["noTitle", "noL1", "noL2", "noL3", "noAgain", "noRestart"] },
  { title: "متفرقه", keys: ["secretTitle", "secretClose", "musicLabel", "madeWith", "builderTitle", "builderNamePh", "builderCopy", "builderOpen", "builderShare", "copied"] },
];

const THEME_NAMES = { romantic: "روتیک صورتی", violet: "بنفش", wine: "شرابی", candy: "آب‌نباتی 🍬", sunset: "غروب 🌅", mint: "نعنایی 🌿" };

const LONG_TEXTS = new Set(["introL1", "introL2", "buildL1", "buildL2", "buildL3", "landingSub", "noL2", "finalNote"]);

/* ---------- tiny field components ---------- */
function Row({ label, hint, children }) {
  return (
    <div className="adm-row">
      <div className="adm-row-head">
        <span className="adm-label">{label}</span>
        {hint ? <span className="adm-hint">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}
function TextInput({ value, onChange, ph, dir }) {
  return <input className="adm-input" type="text" value={value ?? ""} placeholder={ph} dir={dir} onChange={(e) => onChange(e.target.value)} />;
}
function TextArea({ value, onChange, rows = 3 }) {
  return <textarea className="adm-input" rows={rows} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
}
function Toggle({ value, onChange, label, hint }) {
  return (
    <div className="adm-row adm-toggle-row">
      <div>
        <span className="adm-label">{label}</span>
        {hint ? <span className="adm-hint">{hint}</span> : null}
      </div>
      <button className={"adm-toggle" + (value ? " on" : "")} type="button" role="switch" aria-checked={!!value} aria-label={label} onClick={() => onChange(!value)}>
        <span className="adm-toggle-knob" />
      </button>
    </div>
  );
}
function ColorInput({ value, onChange, label }) {
  return (
    <div className="adm-color">
      <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(value || "") ? value : "#ff4f8b"} onChange={(e) => onChange(e.target.value)} aria-label={label} />
      <input className="adm-input adm-color-hex" type="text" value={value ?? ""} dir="ltr" onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

/* ---------- list editors ---------- */
function StringListEditor({ items, onChange, addLabel, max = 10, rows = 2 }) {
  const move = (i, d) => {
    const arr = items.slice();
    const j = i + d;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    onChange(arr);
  };
  return (
    <div className="adm-list">
      {items.map((it, i) => (
        <div className="adm-list-item" key={i}>
          <span className="adm-list-num">{i + 1}</span>
          <textarea className="adm-input" rows={rows} value={it} onChange={(e) => onChange(items.map((x, k) => (k === i ? e.target.value : x)))} />
          <div className="adm-list-ops">
            <button type="button" aria-label="بالا" onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
            <button type="button" aria-label="پایین" onClick={() => move(i, 1)} disabled={i === items.length - 1}>↓</button>
            <button type="button" aria-label="حذف" className="danger" onClick={() => onChange(items.filter((_, k) => k !== i))} disabled={items.length <= 1}>✕</button>
          </div>
        </div>
      ))}
      {items.length < max ? (
        <button className="btn ghost adm-add" type="button" onClick={() => onChange(items.concat([""]))}>
          + {addLabel}
        </button>
      ) : null}
    </div>
  );
}

function OptionListEditor({ items, onChange, withHint, addLabel, max = 12 }) {
  const upd = (i, patch) => onChange(items.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  const move = (i, d) => {
    const arr = items.slice();
    const j = i + d;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    onChange(arr);
  };
  return (
    <div className="adm-list">
      {items.map((it, i) => (
        <div className="adm-list-item adm-opt" key={i}>
          <div className="adm-opt-grid">
            <input className="adm-input adm-emoji" type="text" value={it.emoji || ""} placeholder="☕" aria-label="ایموجی" onChange={(e) => upd(i, { emoji: e.target.value })} />
            <input className="adm-input" type="text" value={it.label || ""} placeholder="عنوان (مثلاً کافه)" aria-label="عنوان" onChange={(e) => upd(i, { label: e.target.value })} />
            <input className="adm-input" type="text" value={it.id || ""} dir="ltr" placeholder="id" aria-label="شناسه" onChange={(e) => upd(i, { id: e.target.value.replace(/[^a-zA-Z0-9_-]/g, "") })} />
            {withHint ? <input className="adm-input adm-hint-input" type="text" value={it.hint || ""} placeholder="توضیح کوتاه (اختیاری)" onChange={(e) => upd(i, { hint: e.target.value })} /> : null}
          </div>
          <div className="adm-list-ops">
            <button type="button" aria-label="بالا" onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
            <button type="button" aria-label="پایین" onClick={() => move(i, 1)} disabled={i === items.length - 1}>↓</button>
            <button type="button" aria-label="حذف" className="danger" onClick={() => onChange(items.filter((_, k) => k !== i))} disabled={items.length <= 1}>✕</button>
          </div>
        </div>
      ))}
      {items.length < max ? (
        <button
          className="btn ghost adm-add"
          type="button"
          onClick={() => onChange(items.concat([{ id: "opt" + Date.now().toString(36).slice(-4), emoji: "✨", label: "گزینه‌ی جدید", ...(withHint ? { hint: "" } : {}) }]))}
        >
          + {addLabel}
        </button>
      ) : null}
    </div>
  );
}

/* ---------- deep diff (send only changes) ---------- */
function deepDiff(base, edit) {
  const out = {};
  for (const k of Object.keys(edit)) {
    const b = base ? base[k] : undefined;
    const e = edit[k];
    if (e === undefined) continue;
    if (Array.isArray(e)) {
      if (JSON.stringify(b) !== JSON.stringify(e)) out[k] = e;
    } else if (e && typeof e === "object") {
      if (b && typeof b === "object") {
        const sub = deepDiff(b, e);
        if (Object.keys(sub).length) out[k] = sub;
      } else if (JSON.stringify(e) !== JSON.stringify(b)) out[k] = e;
    } else if (b !== e) {
      out[k] = e;
    }
  }
  return out;
}

/* =============================== the panel =============================== */
function cleanName(v) {
  // فارسیِ خوانا می‌ماند؛ فقط فاصله کد می‌شود
  return String(v || "").trim().replace(/\s+/g, "%20").slice(0, 32);
}

export default function AdminPanel() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [draft, setDraft] = useState(null); // full editable config
  const [stored, setStored] = useState(false);
  const [tab, setTab] = useState("general");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // {type:'ok'|'err', text}
  const [dirty, setDirty] = useState(false);
  const [stats, setStats] = useState(null);
  const [authEnv, setAuthEnv] = useState(true);
  const [previewName, setPreviewName] = useState("");
  const [occSel, setOccSel] = useState("love");
  const [linkOcc, setLinkOcc] = useState("");
  // لینک دعوت: اسم فارسیِ خام + مناسبت اختیاری
  const invHref = () => {
    const q = [];
    if (previewName.trim()) q.push("name=" + cleanName(previewName));
    if (linkOcc) q.push("occasion=" + linkOcc);
    return "/invite" + (q.length ? "?" + q.join("&") : "");
  };
  const fileRef = useRef(null);

  const flash = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3200);
  };

  useEffect(() => {
    document.body.dataset.mode = "admin";
    document.documentElement.style.setProperty("--acc", "#ff4f8b");
    document.documentElement.style.setProperty("--acc2", "#c96bff");
    try {
      const saved = sessionStorage.getItem("rol:adminKey");
      if (saved) setPassword(saved);
    } catch (e) {}
    // public config — load even before auth
    fetch("/api/health").then((r) => r.json()).then((h) => setAuthEnv(!!h.authEnv)).catch(() => {});
    fetch("/api/config")
      .then((r) => r.json())
      .then((j) => {
        if (j && j.config) {
          setDraft(j.config);
          setStored(!!j.stored);
        }
      })
      .catch(() => setDraft(DEFAULT_CONFIG));
  }, []);

  useEffect(() => {
    if (draft) setDirty(Object.keys(deepDiff(DEFAULT_CONFIG, draft)).length > 0);
  }, [draft]);

  const set = useCallback((path, value) => {
    setDraft((d) => {
      const next = { ...d };
      const parts = path.split(".");
      let o = next;
      for (let i = 0; i < parts.length - 1; i++) {
        o[parts[i]] = Array.isArray(o[parts[i]]) ? o[parts[i]].slice() : { ...o[parts[i]] };
        o = o[parts[i]];
      }
      o[parts[parts.length - 1]] = value;
      return next;
    });
  }, []);
  const setT = (key, value) => set("text." + key, value);

  const login = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/health");
      const h = await r.json();
      if (!h.kv) {
        flash("err", "KV با نام CONFIG وصل نشده — اول تنظیمات Pages رو طبق README کامل کن (بخش «اتصال KV»).");
      }
      const test = await fetch("/api/config", { method: "PUT", headers: { "x-admin-key": password, "content-type": "application/json" }, body: JSON.stringify({ config: {} }) });
      if (test.status === 429) flash("err", "تلاش زیاد؛ ۱۰ دقیقه صبر کن");
      else if (test.status === 401) flash("err", "رمز اشتباه است");
      else if (test.status === 501) flash("err", "KV وصل نیست؛ اما رمز درست است. برای ذخیره‌سازی، KV CONFIG را وصل کن.");
      else if (test.ok) {
        setAuthed(true);
        try {
          sessionStorage.setItem("rol:adminKey", password);
        } catch (e) {}
        flash("ok", "خوش آمدی 👋 حالا می‌توانی همه‌چیز را ویرایش کنی");
      } else flash("err", "خطای غیرمنتظره (" + test.status + ")");
    } catch (e) {
      flash("err", "ارتباط با سرور برقرار نشد");
    }
    setBusy(false);
  };

  const save = async () => {
    if (!authed) return flash("err", "اول وارد شو");
    const patch = deepDiff(DEFAULT_CONFIG, draft);
    if (!Object.keys(patch).length) return flash("ok", "چیزی تغییر نکرده");
    const check = validatePatch(patch);
    if (check.err) return flash("err", "خطا در " + (check.path || "") + ": " + check.err);
    setBusy(true);
    try {
      const r = await fetch("/api/config", {
        method: "PUT",
        headers: { "x-admin-key": password, "content-type": "application/json" },
        body: JSON.stringify({ config: patch }),
      });
      const j = await r.json();
      if (r.ok) {
        setDraft(j.config);
        setStored(true);
        flash("ok", "ذخیره شد ✨ (" + Object.keys(patch).length + " بخش تغییر کرد)");
      } else {
        flash("err", (j && j.message) || "ذخیره نشد");
      }
    } catch (e) {
      flash("err", "ارتباط برقرار نشد");
    }
    setBusy(false);
  };

  const resetAll = async () => {
    if (!confirm("همه‌ی تنظیمات به حالت پیش‌فرض برگرده؟")) return;
    setBusy(true);
    try {
      const r = await fetch("/api/config", { method: "DELETE", headers: { "x-admin-key": password } });
      if (r.ok) {
        setDraft(DEFAULT_CONFIG);
        setStored(false);
        flash("ok", "به پیش‌فرض برگشت");
      } else flash("err", "نشد");
    } catch (e) {
      flash("err", "ارتباط برقرار نشد");
    }
    setBusy(false);
  };

  const loadStats = async () => {
    setStats({ loading: true });
    const keys = [password, draft && draft.stats && draft.stats.adminKey].filter(Boolean);
    for (const k of keys) {
      try {
        const r = await fetch("/api/stats?key=" + encodeURIComponent(k));
        if (r.ok) {
          const j = await r.json();
          setStats({ data: j.stats });
          return;
        }
      } catch (e) {}
    }
    setStats({ error: "آمار در دسترس نیست (STATS KV وصل نیست یا رمز/کلید اشتباه است)" });
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "rol-invite-config.json";
    a.click();
  };
  const importJson = (file) => {
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const obj = JSON.parse(String(fr.result));
        setDraft({ ...DEFAULT_CONFIG, ...obj });
        flash("ok", "وارد شد؛ یادت ن باشه ذخیره کنی");
      } catch (e) {
        flash("err", "فایل JSON معتبر نیست");
      }
    };
    fr.readAsText(file);
  };

  if (!draft) {
    return (
      <div className="adm-page">
        <div className="adm-loading">…</div>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="adm-page">
        <div className="adm-login glass">
          <div className="adm-logo">❤️</div>
          <h1>پنل مدیریت دعوت‌نامه</h1>
          <p className="adm-sub">همه‌چیز رو از اینجا تغییر بده؛ سایت خودکار آپدیت می‌شه.</p>
          <input
            className="adm-input"
            type="password"
            placeholder="رمز مدیریت"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login()}
            autoFocus
          />
          <button className="btn primary xl adm-w100" type="button" onClick={login} disabled={busy || !password}>
            {busy ? "…" : "ورود"}
          </button>
          {msg ? <p className={"adm-msg " + msg.type}>{msg.text}</p> : null}
          <p className="adm-hint">
            رمز پیش‌فرض: <code>rol-admin-1234</code> — در تنظیمات Pages متغیر محیطی <code>ADMIN_PASSWORD</code> رو ست کن تا عوض شه.
          </p>
          <a className="adm-back" href="/">→ برگشت به سایت</a>
        </div>
      </div>
    );
  }

  const D = draft;
  const themeKeys = Object.keys(D.themes);

  return (
    <div className="adm-page">
      <header className="adm-top glass">
        <div className="adm-top-title">
          <span className="adm-logo sm">❤️</span>
          <div>
            <strong>پنل مدیریت</strong> <span className="adm-hint">· ساخته‌شده توسط اَوید کیا (@AvidKiya)</span>
            <span className="adm-hint"> {stored ? "· تنظیمات ذخیره‌شده فعال است" : "· حالت پیش‌فرض"}</span>
          </div>
        </div>
        <div className="adm-top-actions">
          {dirty ? <span className="adm-dirty">تغییرات ذخیره‌نشده</span> : null}
          <a className="btn ghost" href="/invite" target="_blank" rel="noopener">مشاهده‌ی دعوت‌نامه</a>
          <button className="btn ghost" type="button" onClick={() => { try { sessionStorage.removeItem("rol:adminKey"); } catch (e) {} setAuthed(false); }}>خروج</button>
          <button className="btn primary" type="button" onClick={save} disabled={busy}>{busy ? "…" : "ذخیره‌ی تغییرات"}</button>
        </div>
      </header>

      {msg ? <div className={"adm-toast " + msg.type}>{msg.text}</div> : null}
      {!authEnv ? (
        <div className="adm-warn">
          ⚠️ این پنل الان با رمزِ داخل خود سایت کار می‌کند. برای اینکه <b>فقط خودت</b> دسترسی داشته باشی، در تنظیمات Pages متغیر
          محیطی <code dir="ltr">ADMIN_PASSWORD</code> را با یک رمز قوی ست کن و دوباره deploy کن (راهنما در README). ۸ بار رمز اشتباه = قفل ۱۰ دقیقه‌ای.
        </div>
      ) : null}

      <div className="adm-body">
        <nav className="adm-tabs glass">
          {TABS.map((t) => (
            <button key={t.id} className={"adm-tab" + (tab === t.id ? " sel" : "")} type="button" onClick={() => setTab(t.id)}>
              <span aria-hidden="true">{t.icon}</span> {t.label}
            </button>
          ))}
        </nav>

        <main className="adm-content">
          {/* ---------------- general ---------------- */}
          {tab === "general" ? (
            <section className="adm-card glass">
              <h2>⚙️ عمومی</h2>
              <Row label="اسم خودت (فرستنده)" hint="پایین صفحه و کارت پایانی نشان داده می‌شود">
                <TextInput value={D.senderName} onChange={(v) => set("senderName", v)} />
              </Row>
              <Row label="اسم او (پیش‌فرض)" hint="وقتی لینک name نداشته باشد استفاده می‌شود؛ لینک همیشه قوی‌تر است">
                <TextInput value={D.recipientName} onChange={(v) => set("recipientName", v)} />
              </Row>
              <Row label="اسم نمونه در /demo">
                <TextInput value={D.demoName} onChange={(v) => set("demoName", v)} />
              </Row>
              <Row label="سؤال اصلی" hint="مهم‌ترین جمله‌ی سایت 😄">
                <TextInput value={D.question} onChange={(v) => set("question", v)} />
              </Row>
              <Row label="لقب بعد از بله" hint="جای {pet} در «خب {pet}…»">
                <TextInput value={D.petPhrase} onChange={(v) => set("petPhrase", v)} />
              </Row>
              <Row label="متن اشتراک‌گذاری کارت پایانی">
                <TextInput value={D.finalShareText} onChange={(v) => set("finalShareText", v)} />
              </Row>
              <Row label="مناسبت پیش‌فرض دعوت" hint="شعرِ همین مناسبت وسط جریان نمایش داده می‌شود (با پارامتر occasion= در لینک عوض می‌شود)">
                <div className="occ-edit">
                  {(D.occasions || []).map((o) => (
                    <button key={o.id} type="button" className={"adm-chip" + ((D.defaultOccasion || "love") === o.id ? " sel" : "")} onClick={() => set("defaultOccasion", o.id)}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </Row>
              <Row label="یوزرنیم تلگرام تو (برای دکمه‌ی «جوابم رو خودم بگم»)" hint="خالی = دکمه مخفی می‌شود. فقط حروف انگلیسی/اعداد/_">
                <TextInput value={(D.replyTo && D.replyTo.telegram) || ""} onChange={(v) => set("replyTo.telegram", String(v).replace(/[^A-Za-z0-9_]/g, ""))} ph="AvidKiya" dir="ltr" />
              </Row>
              <Row label="متن پیش‌فرض پیام تلگرام" hint="{date} و {when} و {name} خودکار جایگزین می‌شوند">
                <TextArea value={(D.replyTo && D.replyTo.text) || ""} onChange={(v) => set("replyTo.text", v)} />
              </Row>
              <Row label="تم پیش‌فرض" hint="با لینک ?theme= موقتاً عوض می‌شود">
                <div className="adm-themepick">
                  {themeKeys.map((tk) => (
                    <button key={tk} className={"adm-theme-opt" + (D.theme === tk ? " sel" : "")} type="button" onClick={() => set("theme", tk)}>
                      <span className={"adm-mini-dot " + tk} /> {THEME_NAMES[tk] || tk}
                    </button>
                  ))}
                </div>
              </Row>
            </section>
          ) : null}

          {/* ---------------- themes ---------------- */}
          {tab === "themes" ? (
            <section className="adm-card glass">
              <h2>🎨 تم و رنگ</h2>
              <p className="adm-hint" style={{ marginTop: -8 }}>گلو (هاله‌ی نور) خودکار از رنگ اصلی ساخته می‌شود.</p>
              {themeKeys.map((tk) => (
                <div key={tk} className="adm-theme-block">
                  <h3>{THEME_NAMES[tk] || tk}</h3>
                  <div className="adm-colors">
                    <Row label="پس‌زمینه (بالا)"><ColorInput value={D.themes[tk].bg} onChange={(v) => set("themes." + tk + ".bg", v)} label="bg" /></Row>
                    <Row label="پس‌زمینه (پایین)"><ColorInput value={D.themes[tk].bg2} onChange={(v) => set("themes." + tk + ".bg2", v)} label="bg2" /></Row>
                    <Row label="رنگ اصلی"><ColorInput value={D.themes[tk].acc} onChange={(v) => set("themes." + tk + ".acc", v)} label="acc" /></Row>
                    <Row label="رنگ دوم"><ColorInput value={D.themes[tk].acc2} onChange={(v) => set("themes." + tk + ".acc2", v)} label="acc2" /></Row>
                  </div>
                  <div className="adm-theme-preview" style={{ background: "linear-gradient(180deg," + D.themes[tk].bg + "," + D.themes[tk].bg2 + ")" }}>
                    <span style={{ background: "linear-gradient(135deg," + D.themes[tk].acc + "," + D.themes[tk].acc2 + ")", boxShadow: "0 8px 24px -6px " + D.themes[tk].acc }}>دکمه‌ی نمونه</span>
                  </div>
                </div>
              ))}
            </section>
          ) : null}

          {/* ---------------- texts ---------------- */}
          {tab === "texts" ? (
            <>
              <section className="adm-card glass">
                <h2>✍️ متن‌ها</h2>
                <h3 className="adm-h3">📜 اشعار مناسبت‌ها (هر خط = یک بیت؛ مصرع‌ها را با | جدا کن)</h3>
                <div className="occ-edit">
                  {(D.occasions || []).map((o) => (
                    <button key={o.id} type="button" className={"adm-chip" + (occSel === o.id ? " sel" : "")} onClick={() => setOccSel(o.id)}>
                      {o.label}
                    </button>
                  ))}
                </div>
                {(() => {
                  const idx = (D.occasions || []).findIndex((o) => o.id === occSel);
                  if (idx < 0) return null;
                  const o = D.occasions[idx];
                  const setOcc = (field, value) => set("occasions", D.occasions.map((x, i) => (i === idx ? { ...x, [field]: value } : x)));
                  const txt = (o.verses || []).map((b) => (b && b[0] ? b[0] + " | " + (b[1] || "") : "")).join("\n");
                  const onV = (v) => {
                    const verses = v.split("\n").map((ln) => ln.split("|").map((seg) => seg.trim())).filter((pr) => pr[0]).map((pr) => [pr[0].slice(0, 160), (pr[1] || "").slice(0, 160)]).slice(0, 8);
                    setOcc("verses", verses);
                  };
                  return (
                    <>
                      <Row label="برچسب مناسبت">
                        <TextInput value={o.label} onChange={(v) => setOcc("label", v)} />
                      </Row>
                      <Row label="شاعر" hint="مثلاً: شهریار">
                        <TextInput value={o.poet} onChange={(v) => setOcc("poet", v)} />
                      </Row>
                      <Row label="ابیات شعر" hint="هر خط یک بیت؛ بین دو مصرع | بگذار">
                        <TextArea value={txt} onChange={onV} />
                      </Row>
                    </>
                  );
                })()}
                <p className="adm-hint" style={{ marginTop: -8 }}>تقریباً هر جمله‌ی سایت اینجاست؛ تغییر بده و ذخیره کن. ایموجی‌ها آزادند 😄</p>
              </section>
              {TEXT_GROUPS.map((g) => (
                <section className="adm-card glass" key={g.title}>
                  <h3>{g.title}</h3>
                  {g.keys.map((k) => (
                    <Row key={k} label={k}>
                      {LONG_TEXTS.has(k) ? <TextArea value={D.text[k]} onChange={(v) => setT(k, v)} /> : <TextInput value={D.text[k]} onChange={(v) => setT(k, v)} />}
                    </Row>
                  ))}
                </section>
              ))}
              <section className="adm-card glass">
                <h3>پیام‌های دکمه‌ی «نه» (به‌ترتیب فرار کردن)</h3>
                <StringListEditor items={D.text.noTaunts} onChange={(v) => setT("noTaunts", v)} addLabel="پیام جدید" max={8} rows={1} />
              </section>
            </>
          ) : null}

          {/* ---------------- options ---------------- */}
          {tab === "options" ? (
            <>
              <section className="adm-card glass">
                <h2>☕ گزینه‌های قرار</h2>
                <p className="adm-hint" style={{ marginTop: -8 }}>کارت‌های صفحه‌ی «اولین قرارمون کجا باشه؟» — ترتیب مهم است.</p>
                <OptionListEditor items={D.dateOptions} onChange={(v) => set("dateOptions", v)} withHint addLabel="گزینه‌ی قرار" />
              </section>
              <section className="adm-card glass">
                <h3>🕐 زمان‌ها («حالا کِی؟»)</h3>
                <OptionListEditor items={D.whenOptions} onChange={(v) => set("whenOptions", v)} addLabel="زمان جدید" max={8} />
              </section>
              <section className="adm-card glass">
                <h3>⏰ ساعت‌ها (اختیاری)</h3>
                <OptionListEditor items={D.timeOptions} onChange={(v) => set("timeOptions", v)} addLabel="ساعت جدید" max={8} />
              </section>
            </>
          ) : null}

          {/* ---------------- contract ---------------- */}
          {tab === "contract" ? (
            <section className="adm-card glass">
              <h2>📜 قرارداد کوچیک</h2>
              <p className="adm-hint" style={{ marginTop: -8 }}>شماره‌ی بندها خودکار اضافه می‌شود («بند ۱»، «بند ۲»…).</p>
              <StringListEditor items={D.contractClauses} onChange={(v) => set("contractClauses", v)} addLabel="بند جدید" max={10} />
            </section>
          ) : null}

          {/* ---------------- secrets ---------------- */}
          {tab === "secrets" ? (
            <section className="adm-card glass">
              <h2>🕵️ پیام‌های مخفی</h2>
              <p className="adm-hint" style={{ marginTop: -8 }}>
                ۱) پنج‌ضربه روی لوگوی قلب بالا · ۲) نگه‌داشتن قلبِ پایین صفحه · ۳) ستاره‌ی کوچیکی که گاهی در صفحه‌ی سؤال ظاهر می‌شود.
              </p>
              <StringListEditor items={D.secrets} onChange={(v) => set("secrets", v)} addLabel="پیام مخفی جدید" max={6} />
            </section>
          ) : null}

          {/* ---------------- media ---------------- */}
          {tab === "media" ? (
            <>
              <section className="adm-card glass">
                <h2>🎵 موسیقی</h2>
                <Row label="آدرس فایل موسیقی" hint="mp3/ogg مستقیم؛ خالی = دکمه‌ی موسیقی مخفی می‌شود">
                  <div className="adm-audio">
                    <TextInput value={D.music} onChange={(v) => set("music", v)} ph="https://example.com/song.mp3 یا /assets/music/ahang.mp3" dir="ltr" />
                    {D.music ? (
                      <button className="btn ghost" type="button" onClick={() => { const a = new Audio(D.music); a.volume = 0.4; a.play().catch(() => alert("پخش نشد — آدرس یا فرمت مشکل دارد")); a.onended = () => a.remove(); }}>تست پخش</button>
                    ) : null}
                  </div>
                </Row>
              </section>
              <section className="adm-card glass">
                <h2>🖼️ استیکرها</h2>
              <p className="adm-hint" style={{ margin: "0 0 6px" }}>همه‌ی استیکرها انیمیشن‌دار هستند (webp متحرک).</p>
                <p className="adm-hint" style={{ marginTop: -8 }}>آدرس خالی = استیکر اختصاصی همین پروژه. آدرس بده = عکس دلخواه تو (webp/png/gif متحرک).</p>
                {STICKER_KINDS.map((k) => (
                  <Row key={k} label={k} hint={"پیش‌فرض: /assets/stickers/" + k + ".webp"}>
                    <div className="adm-sticker-row">
                      <img className="adm-sticker-thumb" src={"/assets/stickers/" + k + ".webp"} alt="" onError={(e) => (e.currentTarget.style.opacity = 0.2)} />
                      <TextInput value={(D.assets && D.assets[k]) || ""} onChange={(v) => set("assets." + k, v)} ph="https://… (خالی = پیش‌فرض)" dir="ltr" />
                    </div>
                  </Row>
                ))}
              </section>
            </>
          ) : null}

          {/* ---------------- stats ---------------- */}
          {tab === "stats" ? (
            <section className="adm-card glass">
              <h2>📊 آمار جواب‌ها</h2>
              <Toggle label="آمار فعال باشد" hint="فقط تعداد رویدادها ذخیره می‌شود (بله/نه/قرار/…) — بدون IP و کوکی" value={D.stats.enabled} onChange={(v) => set("stats.enabled", v)} />
              <Toggle label="نمایش اسم در آمار" hint="خاموش = اسم‌ها هش می‌شوند (خصوصی‌تر)" value={D.stats.storeName} onChange={(v) => set("stats.storeName", v)} />
              <Row label="کلید آمار" hint="برای دیدن آمار از /api/stats?key=…">
                <TextInput value={D.stats.adminKey} onChange={(v) => set("stats.adminKey", v)} dir="ltr" />
              </Row>
              <div className="adm-row">
                <button className="btn ghost" type="button" onClick={loadStats}>نمایش آمار تا الان</button>
              </div>
              {stats && stats.loading ? <p className="adm-hint">…</p> : null}
              {stats && stats.error ? <p className="adm-msg err">{stats.error}</p> : null}
              {stats && stats.data ? (
                <div className="adm-stats">
                  <table>
                    <thead>
                      <tr><th>رویداد</th><th>تعداد</th><th>آخرین بار</th></tr>
                    </thead>
                    <tbody>
                      {["view", "yes", "no", "date", "when", "contract", "final", "secret"].map((ev) => {
                        const e = stats.data.events[ev];
                        const last = stats.data.last[ev];
                        return (
                          <tr key={ev}>
                            <td>{{ view: "باز کردن صفحه", yes: "بله ❤️", no: "نه", date: "انتخاب قرار", when: "انتخاب زمان", contract: "امضای قرارداد", final: "رسیدن به کارت پایانی", secret: "پیدا کردن راز" }[ev]}</td>
                            <td>{e ? e.total : 0}</td>
                            <td dir="ltr">{last ? new Date(last).toLocaleString("fa-IR") : "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </section>
          ) : null}

          {/* ---------------- links ---------------- */}
          {tab === "links" ? (
            <section className="adm-card glass">
              <h2>🔗 ساخت لینک دعوت</h2>
              <Row label="اسم او در لینک" hint="ایموجی و کاراکترهای عجیب خودکار پاک می‌شوند">
                <TextInput value={previewName} onChange={setPreviewName} ph="مثلاً: سارا" />
              </Row>
              <Row label="لینک آماده">
                <div className="link-box glass">
                  <span className="link-txt" dir="ltr">
                    {typeof window !== "undefined" ? window.location.origin + invHref() : "/invite"}
                  </span>
                </div>
              </Row>
              <div className="adm-row">
                <button
                  className="btn primary"
                  type="button"
                  onClick={() => {
                    const url = window.location.origin + invHref();
                    if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => flash("ok", "کپی شد ✨"), () => flash("err", "کپی نشد"));
                  }}
                >
                  کپی لینک
                </button>
                <a className="btn ghost" href={invHref()} target="_blank" rel="noopener">
                  باز کردن
                </a>
              </div>
              <p className="adm-hint">پیش‌نمایش با تنظیماتِ «ذخیره‌شده» است؛ تغییرات ذخیره‌نشده هنوز اعمال نشده‌اند.</p>
              <div className="adm-preview-frame">
                <div className="occ-edit">
                  {(D.occasions || []).map((o) => (
                    <button key={o.id} type="button" className={"adm-chip" + (linkOcc === o.id ? " sel" : "")} onClick={() => setLinkOcc(linkOcc === o.id ? "" : o.id)}>
                      {o.label}
                    </button>
                  ))}
                </div>
                <iframe
                  src={invHref()}
                  title="پیش‌نمایش دعوت‌نامه"
                  loading="lazy"
                />
              </div>
            </section>
          ) : null}

          {/* ---------------- backup ---------------- */}
          {tab === "backup" ? (
            <section className="adm-card glass">
              <h2>💾 پشتیبان‌گیری و بازگردانی</h2>
              <p className="adm-hint" style={{ marginTop: -8 }}>تنظیمات فعلی رو به‌صورت فایل JSON ذخیره کن یا از فایل قبلی برگردون.</p>
              <div className="adm-row">
                <button className="btn ghost" type="button" onClick={exportJson}>⬇️ دانلود فایل تنظیمات</button>
                <button className="btn ghost" type="button" onClick={() => fileRef.current && fileRef.current.click()}>⬆️ بازگردانی از فایل</button>
                <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => e.target.files[0] && importJson(e.target.files[0])} />
              </div>
              <div className="adm-row">
                <button className="btn ghost" type="button" onClick={() => { setDraft(DEFAULT_CONFIG); flash("ok", "به پیش‌فرض برگشت (هنوز ذخیره نشده)"); }}>↩️ پرکردن فرم با پیش‌فرض‌ها</button>
                <button className="adm-danger-btn" type="button" onClick={resetAll}>🗑️ حذف همه‌ی تنظیمات ذخیره‌شده</button>
              </div>
            </section>
          ) : null}
        </main>
      </div>

      {/* sticky save bar (mobile) */}
      <div className="adm-savebar glass">
        <span>{dirty ? "• تغییرات ذخیره‌نشده" : "همه‌چیز ذخیره است"}</span>
        <button className="btn primary" type="button" onClick={save} disabled={busy || !dirty}>{busy ? "…" : "ذخیره"}</button>
      </div>
    </div>
  );
}
