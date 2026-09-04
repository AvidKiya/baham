"use client";
// ---------------------------------------------------------------------------
// components/app/SettingsTab.jsx — تنظیمات: پروفایل، اتصال اکانت هوش مصنوعی،
// ظاهر، فضای بزرگسال، کرش‌ها، حساب (کد بازیابی/حذف)، نصب، درباره
// ---------------------------------------------------------------------------
import { useState } from "react";
import { api } from "@/lib/appauth";
import { Ic } from "@/lib/icons";

const TONES = [
  { id: "funny", t: "بامزه" }, { id: "romantic", t: "رمانتیک" }, { id: "literary", t: "ادبی" },
  { id: "direct", t: "مستقیم" }, { id: "mystery", t: "مرموز" }, { id: "cool", t: "خونسرد" },
  { id: "bold18", t: "جسورانه", adult: true }, { id: "dom18", t: "سلطه‌گر", adult: true }, { id: "tease18", t: "وسوسه‌گر", adult: true },
];
const GEN = [
  { id: "m", t: "پسرم" }, { id: "f", t: "دخترم" }, { id: "x", t: "نمی‌گویم" },
];
export const INTERESTS_GEN = ["رابطه جدی", "آشنایی کژوال", "ازدواج", "دوستی اول"];
export const INTERESTS_ADULT = ["سلطه‌گر", "سلطه‌پذیر", "سوییچ", "بانداج", "بازی نقش‌ها", "فتیش پا", "فتیش بو", "لباس و یونیفرم", "تحسین و پرستش", "سادی-مازو ملایم"];

export default function SettingsTab({ user, onUser, logout, installEvt, install, acc, setAcc, theme, setTheme }) {
  const p = user.profile || {};
  const ai = user.ai || {};
  const [name, setName] = useState(p.name || "");
  const [crush, setCrush] = useState(p.crush || "");
  const [gender, setGender] = useState(p.gender || "x");
  const [style, setStyle] = useState(p.style || "funny");
  const [msg, setMsg] = useState("");

  const orConnected = !!(ai.hasKey && (ai.base || "").includes("openrouter.ai"));
  const [connBusy, setConnBusy] = useState(false);
  const [key, setKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [base, setBase] = useState(ai.base || "");
  const [model, setModel] = useState(ai.model || "gpt-4o-mini");
  const [aiMsg, setAiMsg] = useState("");
  const [aiBusy, setAiBusy] = useState(false);

  const [byear, setByear] = useState("");
  const [gateMsg, setGateMsg] = useState("");
  const [ints, setInts] = useState(p.interests || []);
  const adult = !!p.adult;

  const [newCrush, setNewCrush] = useState("");
  const [delArm, setDelArm] = useState(false);

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(""), 2200); };

  const saveProfile = async () => {
    const r = await api("/api/me", { method: "PUT", body: { name: name.trim(), crush: crush.trim(), gender, style } });
    if (r.ok && r.data && r.data.user) { onUser(r.data.user); flash("پروفایلت سیو شد"); }
    else flash((r.data && r.data.message) || "ذخیره نشد");
  };

  const connect = async () => {
    setConnBusy(true); setAiMsg("");
    const r = await api("/api/oauth/openrouter/start?origin=" + encodeURIComponent(location.origin));
    if (r.ok && r.data && r.data.url) { location.href = r.data.url; return; }
    setAiMsg((r.data && r.data.message) || "شروع اتصال ممکن نشد");
    setConnBusy(false);
  };
  const disconnect = async () => {
    const r = await api("/api/me", { method: "PUT", body: { ai: { key: "" } } });
    if (r.ok && r.data && r.data.user) { onUser(r.data.user); flash("اتصال قطع شد"); }
  };
  const saveModel = async () => {
    const r = await api("/api/me", { method: "PUT", body: { ai: { model: model.trim() } } });
    if (r.ok && r.data && r.data.user) { onUser(r.data.user); flash("مدل ذخیره شد"); }
  };

  const saveAi = async () => {
    setAiBusy(true); setAiMsg("");
    const body = { ai: { base: base.trim(), model: model.trim() } };
    if (key.trim()) body.ai.key = key.trim();
    const r = await api("/api/me", { method: "PUT", body });
    if (!(r.ok && r.data && r.data.user)) {
      setAiMsg((r.data && r.data.message) || "ذخیره نشد");
      setAiBusy(false);
      return;
    }
    onUser(r.data.user);
    const t = await api("/api/me", { method: "POST", body: { action: "ai-test" } });
    if (t.ok) setAiMsg("اتصال موفق است؛ چت‌یار روشن شد");
    else setAiMsg((t.data && t.data.message) || "تست اتصال ناموفق بود");
    setAiBusy(false);
  };

  const unlockAdult = async () => {
    setGateMsg("");
    const y = parseInt(byear.trim(), 10);
    if (!y || y < 1200 || y > 2015) { setGateMsg("سال تولد را درست وارد کن؛ مثلاً ۱۳۷۶ یا 1998"); return; }
    const r = await api("/api/me", { method: "PUT", body: { birthYear: y } });
    if (r.ok && r.data && r.data.user) {
      onUser(r.data.user);
      if (r.data.user.profile && r.data.user.profile.adult) setGateMsg("فضای بزرگسال فعال شد");
      else setGateMsg((r.data && r.data.message) || "سنت برای این بخش کافی نیست");
    } else setGateMsg((r.data && r.data.message) || "فعال نشد");
  };

  const toggleInt = (t) => setInts((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : prev.length >= 8 ? prev : [...prev, t]));
  const saveInts = async () => {
    const r = await api("/api/me", { method: "PUT", body: { interests: ints } });
    if (r.ok && r.data && r.data.user) { onUser(r.data.user); setGateMsg("سلیقه‌هات سیو شد"); }
    else setGateMsg((r.data && r.data.message) || "ذخیره نشد");
    setTimeout(() => setGateMsg(""), 2200);
  };

  const addCrush = async () => {
    const c = newCrush.trim().slice(0, 32);
    if (!c) return;
    const list = [...new Set([...(p.crushes || []), c])].slice(0, 5);
    const r = await api("/api/me", { method: "PUT", body: { crushes: list, crush: c } });
    if (r.ok && r.data && r.data.user) { onUser(r.data.user); setNewCrush(""); }
  };
  const delCrush = async (c) => {
    const list = (p.crushes || []).filter((x) => x !== c);
    const r = await api("/api/me", { method: "PUT", body: { crushes: list, crush: (p.crush === c ? "" : p.crush) } });
    if (r.ok && r.data && r.data.user) onUser(r.data.user);
  };

  const exportData = async () => {
    try {
      const hist = await api("/api/history");
      const data = {
        exportedAt: new Date().toISOString(),
        app: "mokhyar",
        version: "5.2",
        profile: user,
        history: (hist.ok && hist.data && hist.data.history) || { chats: [], invites: [] },
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "mokhyar-backup-" + Date.now() + ".json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      flash("فایل پشتیبانت اومد پایین");
    } catch { flash("داده‌هات رو نداد؛ دوباره امتحان کن"); }
  };

  const delAccount = async () => {
    if (!delArm) { setDelArm(true); setTimeout(() => setDelArm(false), 4000); return; }
    const r = await api("/api/me", { method: "DELETE" });
    if (r.ok) { try { localStorage.clear(); sessionStorage.clear(); } catch {} location.href = "/"; }
  };

  let wins = {};
  try { wins = JSON.parse(localStorage.getItem("mk:wins") || "{}"); } catch {}
  const winTotal = Object.values(wins).reduce((a, b) => a + b, 0);
  const winRows = Object.entries(wins).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const toneLabel = (id) => (TONES.find((t) => t.id === id) || {}).t || id;

  return (
    <div className="settingstab">
      <header className="tabhead">
        <h2><Ic n="gear" s={20} /> تنظیمات</h2>
        <p>حسابت، هوش مصنوعیت و سلیقه‌ت</p>
      </header>

      {msg ? <div className="mini-ok big"><Ic n="check" s={15} /> {msg}</div> : null}

      <section className="card setsec">
        <h3><Ic n="key" s={17} /> هوش مصنوعی</h3>
        {orConnected ? (
          <div className="conn-ok">
            <span className="conn-dot" />
            <div>
              <b>متصل با اکانت OpenRouter</b>
              <p>جواب‌ها از حساب خودت میان؛ مصرفش رو هم تو OpenRouter می‌بینی.</p>
            </div>
          </div>
        ) : (
          <>
            <p className="dim small">دکمه رو بزن، با گوگل لاگین کن، تأیید کن — تمام. مدلای رایگان هم داره.</p>
            <button className="btn primary big" type="button" onClick={connect} disabled={connBusy}>
              <Ic n={connBusy ? "refresh" : "shieldPlain"} s={17} /> {connBusy ? "دارم صفحه‌ی لاگین رو باز می‌کنم…" : "اتصال با اکانت (OpenRouter)"}
            </button>
          </>
        )}
        <div className="two" style={{ marginTop: "12px" }}>
          <label className="field">
            <span className="flbl">مدل</span>
            <input className="inp" dir="ltr" placeholder={orConnected ? "openai/gpt-4o-mini" : "gpt-4o-mini"} value={model} onChange={(e) => setModel(e.target.value)} maxLength={60} />
          </label>
          <button className="btn ghost" type="button" style={{ alignSelf: "end" }} onClick={saveModel}><Ic n="check" s={16} /> مدل رو سیو کن</button>
        </div>
        {orConnected ? (
          <div className="m-row">
            <a className="btn ghost sm" href="https://openrouter.ai/keys" target="_blank" rel="noopener"><Ic n="eye" s={15} /> کلیدهای من در OpenRouter</a>
            <button className="btn ghost sm danger" type="button" onClick={disconnect}><Ic n="x" s={15} /> قطعش کن</button>
          </div>
        ) : null}
        {aiMsg ? <div className={/موفق|روشن/.test(aiMsg) ? "mini-ok big" : "mini-err big"}>{aiMsg}</div> : null}
        <details className="adv">
          <summary><Ic n="key" s={15} /> راه دستی با کلید (ChatGPT، OpenAI و…)</summary>
          <div className="advbody">
            <p className="dim small">کلیدت رو اینجا می‌ذاری؛ فقط روی سرور خودت می‌مونه و فقط واسه همین اپ مصرف می‌شه.</p>
            <label className="field">
              <span className="flbl">کلید API {ai.hasKey && !orConnected ? <em className="haskey">متصل است — برای تعویض، جدید را بنویس</em> : null}</span>
              <div className="keyrow">
                <input className="inp" dir="ltr" type={showKey ? "text" : "password"} placeholder="sk-…" value={key} onChange={(e) => setKey(e.target.value)} maxLength={200} />
                <button type="button" className="keyeye" aria-label="نمایش/مخفی" onClick={() => setShowKey(!showKey)}><Ic n={showKey ? "eyeOff" : "eye"} s={17} /></button>
              </div>
            </label>
            <label className="field">
              <span className="flbl">آدرس سرویس (اختیاری)</span>
              <input className="inp" dir="ltr" placeholder="api.openai.com/v1" value={base} onChange={(e) => setBase(e.target.value)} maxLength={120} />
            </label>
            <button className="btn ghost" type="button" onClick={saveAi} disabled={aiBusy}>
              <Ic n={aiBusy ? "refresh" : "check"} s={16} /> سیو و تست کن
            </button>
          </div>
        </details>
      </section>

      <section className="card setsec">
        <h3><Ic n="user" s={17} /> پروفایل</h3>
        <label className="field">
          <span className="flbl">اسم مستعار</span>
          <input className="inp" dir="rtl" maxLength={32} placeholder="مثلاً: سارا" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="flbl">جنسیتت</div>
        <div className="seg mini">
          {GEN.map((g) => (
            <button key={g.id} type="button" className={gender === g.id ? "on" : ""} onClick={() => setGender(g.id)}>{g.t}</button>
          ))}
        </div>
        <div className="flbl">لحن پیش‌فرضت</div>
        <div className="tones">
          {TONES.map((t) => {
            const locked = t.adult && !adult;
            return (
              <button key={t.id} type="button" className={"tone-chip sm" + (style === t.id ? " on" : "") + (locked ? " locked" : "")}
                onClick={() => !locked && setStyle(t.id)}>
                {locked ? <Ic n="lock" s={13} /> : null} {t.t}{t.adult ? <em>۱۸+</em> : null}
              </button>
            );
          })}
        </div>
        <button className="btn primary" type="button" onClick={saveProfile}><Ic n="check" s={16} /> پروفایلم رو سیو کن</button>
      </section>

      <section className="card setsec">
        <h3><Ic n="invite" s={17} /> کرش‌های من</h3>
        <p className="dim small">تا ۵ نفر؛ تو چت‌یار با یه لمس بین‌شون بپر.</p>
        {p.crushes && p.crushes.length ? (
          <div className="crushlist">
            {p.crushes.map((c) => (
              <span key={c} className={"cchip" + (p.crush === c ? " on" : "")}>
                {c}
                <button type="button" aria-label={"حذف " + c} onClick={() => delCrush(c)}><Ic n="x" s={12} /></button>
              </span>
            ))}
          </div>
        ) : <p className="dim tiny">هنوز کسی رو اضافه نکردی.</p>}
        <div className="two">
          <input className="inp" dir="rtl" placeholder="اسم جدید…" value={newCrush} onChange={(e) => setNewCrush(e.target.value)} maxLength={32} />
          <button className="btn ghost" type="button" onClick={addCrush}><Ic n="plus" s={16} /> افزودن</button>
        </div>
      </section>

      <section className="card setsec">
        <h3><Ic n="palette" s={17} /> ظاهر</h3>
        <div className="flbl">حالت نمایش</div>
        <div className="seg mini" style={{ marginBottom: "14px" }}>
          <button type="button" className={theme === "light" ? "on" : ""} onClick={() => setTheme("light")}><Ic n="sun" s={15} /> روشن (لاوندر)</button>
          <button type="button" className={theme === "dark" ? "on" : ""} onClick={() => setTheme("dark")}><Ic n="moon" s={15} /> تاریک (شب)</button>
          <button type="button" className={theme === "auto" ? "on" : ""} onClick={() => setTheme("auto")}><Ic n="clock" s={15} /> خودکار (شب‌ها تاریک)</button>
        </div>
        <div className="flbl">رنگ اصلی اپ</div>
        <div className="accrow">
          {[["rose", "#ff4f8b"], ["violet", "#a855f7"], ["amber", "#f59e0b"], ["teal", "#2dd4bf"]].map(([k, c]) => (
            <button key={k} type="button" className={"accsw" + (acc === k ? " sel" : "")} style={{ background: c }} aria-label={"رنگ " + k} onClick={() => setAcc(k)} />
          ))}
        </div>
        {winTotal ? (
          <div className="winstat">
            <div className="flbl" style={{ marginTop: "10px" }}><Ic n="target" s={15} /> آمار رِزت (روی همین گوشی)</div>
            <p className="dim small">{winTotal} پیشنهاد کپی شده</p>
            {winRows.map(([id, n]) => (
              <div key={id} className="winrow"><span>{toneLabel(id)}</span><b>{n}</b></div>
            ))}
          </div>
        ) : null}
      </section>

      <section className={"card setsec adult" + (adult ? " on" : "")}>
        <h3><Ic n={adult ? "flame" : "lock"} s={17} /> فضای بزرگسال <em className="a18">+۱۸</em></h3>
        {!adult ? (
          <>
            <p className="dim small">لحن‌های جسورانه، سلطه‌گر و وسوسه‌گر و علاقه‌مندی‌های +۱۸ (از بی‌دی‌اس‌ام تا فتیش‌ها) اینجا باز می‌شوند. فقط با تأیید سن.</p>
            <div className="gate">
              <label className="field">
                <span className="flbl">سال تولد (شمسی یا میلادی)</span>
                <input className="inp" dir="ltr" inputMode="numeric" placeholder="1376 یا 1998" value={byear} onChange={(e) => setByear(e.target.value)} maxLength={4} />
              </label>
              <button className="btn primary" type="button" onClick={unlockAdult}><Ic n="shieldPlain" s={16} /> سنم رو تأیید کن، بازش کن</button>
            </div>
            {gateMsg ? <div className={/فعال شد/.test(gateMsg) ? "mini-ok big" : "mini-err big"}>{gateMsg}</div> : null}
            <p className="consent"><Ic n="info" s={14} /> محتوای این بخش فقط برای رابطه‌ی دوطرفه‌ی بزرگسالان با رضایت کامل است؛ پاسخ طرف مقابل هرگز قطعی نیست.</p>
          </>
        ) : (
          <>
            <div className="adult-on"><Ic n="check" s={15} /> فضای بزرگسال بازه</div>
            <div className="flbl">علاقه‌مندی‌ها (تا ۸ مورد) — در پاسخ‌ها لحاظ می‌شوند</div>
            <div className="intgroup"><span>عمومی</span>
              <div className="ints">
                {INTERESTS_GEN.map((t) => (
                  <button key={t} type="button" className={"int-chip" + (ints.includes(t) ? " on" : "")} onClick={() => toggleInt(t)}>{t}</button>
                ))}
              </div>
            </div>
            <div className="intgroup"><span>بزرگسال</span>
              <div className="ints">
                {INTERESTS_ADULT.map((t) => (
                  <button key={t} type="button" className={"int-chip adult" + (ints.includes(t) ? " on" : "")} onClick={() => toggleInt(t)}>{t}</button>
                ))}
              </div>
            </div>
            <button className="btn ghost" type="button" onClick={saveInts}><Ic n="check" s={16} /> سلیقه‌هام رو سیو کن</button>
            {gateMsg ? <div className="mini-ok big"><Ic n="check" s={14} /> {gateMsg}</div> : null}
            <p className="consent"><Ic n="info" s={14} /> پایه‌ی همه‌چیز رضایت است؛ قبل از هر حدی، حرفش را بپرس. پیشنهادها خط‌کشی واقعی نیستند.</p>
          </>
        )}
      </section>

      <section className="card setsec">
        <h3><Ic n="shield" s={17} /> حساب</h3>
        <p className="dim small">اگر رمزت را فراموش کردی، با کد بازیابی‌ای که موقع ثبت‌نام گرفتی از صفحه‌ی ورود برمی‌گردانی.</p>
        <div className="m-row">
          <button className="btn ghost" type="button" onClick={exportData}><Ic n="exportIc" s={16} /> داده‌هام رو بده (JSON)</button>
          <button className="btn ghost danger" type="button" onClick={logout}><Ic n="logout" s={16} /> خروج از حساب</button>
        </div>
        <div className="delzone">
          <button type="button" className={"btn ghost danger sm delbtn" + (delArm ? " arm" : "")} onClick={delAccount}>
            <Ic n="trash" s={15} /> {delArm ? "مطمئنی؟ دوباره بزن تا برای همیشه حذف شود" : "حذف کامل حساب"}
          </button>
        </div>
      </section>

      <section className="card setsec">
        <h3><Ic n="download" s={17} /> نصب اپ</h3>
        {installEvt ? (
          <button className="btn ghost" type="button" onClick={install}><Ic n="download" s={16} /> مخ‌یار رو نصب کن</button>
        ) : (
          <p className="dim small">از منوی مرورگر گوشی «Add to Home Screen» رو بزن؛ مخ‌یار مثل اپ واقعی نصب می‌شه و آفلاین هم باز می‌مونه.</p>
        )}
      </section>

      <section className="card setsec aboutsec">
        <h3><Ic n="info" s={17} /> درباره</h3>
        <p className="dim small">مخ‌یار · نسخه ۶٫۲ — با وسواس ساخته شده توسط <a href="https://t.me/AvidKiya" target="_blank" rel="noopener">اَوید کیا</a></p>
        <p className="dim tiny">پاسخ‌ها با اکانت/کلید خودت ساخته می‌شوند؛ هیچ کلیدی هیچ‌جا جز سرور خودت ذخیره نمی‌شه.</p>
        <div className="m-row">
          <a className="btn ghost sm" href="/legal"><Ic n="shield" s={15} /> قوانین و حریم خصوصی</a>
        </div>
      </section>

      <p className="dim tiny center">@{user.username} · حساب مخ‌یار</p>
    </div>
  );
}
