"use client";
// ---------------------------------------------------------------------------
// components/app/SpaceTab.jsx — «فضای ما» 💑 : هاب زوج به سبک Between
// شمارنده · خاطرات · تقویم شمسی · یادداشت · آرزو · باکت‌لیست · نامه ·
// سؤال روزانه · تایم‌لاین · آهنگ · چت زوج · تنظیمات — با سینک دوطرفه
// ---------------------------------------------------------------------------
import { useState, useEffect, useCallback, useRef } from "react";
import { Ic } from "@/lib/icons";
import { buzz, confettiBurst } from "@/lib/fx";
import { api } from "@/lib/appauth";
import { addXp } from "@/lib/rizz";
import { parseChatFile, msgsToMemories } from "@/lib/chatimport";
import SpaceChat from "./SpaceChat";
import { syncSpace, syncStatus, onSyncStatus, pairState } from "@/lib/spaceSync";
import * as C from "@/lib/couple";

const VIEWS = [
  { id: "home", ic: "hearts", t: "خانه" },
  { id: "chat", ic: "chat", t: "چت ما" },
  { id: "memories", ic: "camera", t: "خاطرات" },
  { id: "calendar", ic: "cal", t: "تقویم" },
  { id: "notes", ic: "note", t: "یادداشت" },
  { id: "wishlist", ic: "gift", t: "آرزوها" },
  { id: "bucket", ic: "flag", t: "باکت‌لیست" },
  { id: "letters", ic: "letter", t: "نامه‌ها" },
  { id: "daily", ic: "help", t: "سؤال روز" },
  { id: "timeline", ic: "clock", t: "تایم‌لاین" },
  { id: "songs", ic: "music", t: "آهنگ‌ها" },
  { id: "dong", ic: "cash", t: "دانگ" },
  { id: "mood", ic: "smile", t: "حال ما" },
  { id: "game", ic: "dice", t: "بازی" },
  { id: "book", ic: "book", t: "کتاب ما" },
  { id: "dares", ic: "target", t: "چالش" },
  { id: "stats", ic: "chart", t: "آمار" },
  { id: "polls", ic: "help", t: "نظرسنجی" },
  { id: "trips", ic: "trip", t: "سفر" },
  { id: "spins", ic: "wheel", t: "گردونه" },
  { id: "capsules", ic: "capsule", t: "کپسول" },
  { id: "chains", ic: "story", t: "داستان" },
  { id: "quests", ic: "medal", t: "۳۰ روزه" },
  { id: "arts", ic: "grid", t: "پیکسل‌آرت" },
  { id: "casts", ic: "mic", t: "پادکست" },
  { id: "pins", ic: "pin", t: "نقشه" },
  { id: "banks", ic: "coin", t: "قلک" },
  { id: "movies", ic: "film", t: "فیلم" },
  { id: "recipes", ic: "pot", t: "آشپزی" },
  { id: "dreams", ic: "moon", t: "رویا" },
  { id: "shots", ic: "image", t: "چالش عکس" },
  { id: "ballots", ic: "ballot", t: "صندوق" },
  { id: "counts", ic: "clock", t: "شمارش" },
  { id: "laws", ic: "scroll", t: "قانون‌ها" },
  { id: "year", ic: "party", t: "سال ما" },
  { id: "hall", ic: "crown", t: "تالار" },
  { id: "settings", ic: "gear", t: "تنظیم" },
];
const HERO_THEMES = {
  rose: ["#ff4f8b", "#a855f7"],
  violet: ["#8b5cf6", "#6366f1"],
  sunset: ["#f59e0b", "#ef4444"],
  ocean: ["#2dd4bf", "#3b82f6"],
  cherry: ["#fb7185", "#be123c"],
  grape: ["#c084fc", "#7c3aed"],
};
const SYNC_TXT = {
  idle: "…", syncing: "در حال سینک…", ok: "همگام شد ✓", offline: "آفلاین",
  local: "فقط این گوشی", unpaired: "بدون اتصال زوج",
};

/* ============================ تب اصلی ============================ */
const SPACE_VIEW_IDS = new Set(["home", "chat", "memories", "calendar", "notes", "wishlist", "bucket", "letters", "daily", "timeline", "songs", "dong", "mood", "game", "book", "dares", "stats", "polls", "trips", "spins", "capsules", "chains", "quests", "arts", "casts", "pins", "banks", "movies", "recipes", "dreams", "shots", "ballots", "counts", "laws", "year", "hall", "settings"]);
export default function SpaceTab({ user, go }) {
  const [view, setView] = useState(() => {
    try {
      const v = localStorage.getItem("mk:spaceview");
      if (v) {
        localStorage.removeItem("mk:spaceview");
        if (SPACE_VIEW_IDS.has(v)) return v;
      }
    } catch {}
    return "home";
  });
  const [tick, setTick] = useState(0);
  const [sync, setSync] = useState(() => syncStatus());
  const [pair, setPair] = useState({ paired: false, partner: "" });
  const [incoming, setIncoming] = useState(null); // تماس ورودی وقتی توی چت نیستیم
  const [ro, setRo] = useState(() => { try { return localStorage.getItem("mk:spacero") === "1"; } catch { return false; } });
  const [showSearch, setShowSearch] = useState(false);
  const myId = (user && user.id) || "";
  const pushTimer = useRef(null);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  const scheduleSync = useCallback(() => {
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => { syncSpace(true).then(() => setTick((t) => t + 1)); }, 2500);
  }, []);
  const touch = useCallback(() => { setTick((t) => t + 1); scheduleSync(); }, [scheduleSync]);
  const goView = useCallback((v) => {
    setView(v);
    try { buzz(5); window.scrollTo({ top: 0 }); } catch {}
  }, []);

  useEffect(() => {
    const off = onSyncStatus(setSync);
    const onSynced = () => setTick((t) => t + 1);
    try { window.addEventListener("sp:synced", onSynced); } catch {}
    syncSpace().then(() => setTick((t) => t + 1));
    pairState(true).then(setPair);
    const iv = setInterval(() => { syncSpace().then(() => setTick((t) => t + 1)); badgeCheck(); }, 30000);
    notifyCheck(myId);
    milestoneCheck();
    seasCheck();
    badgeCheck();
    return () => {
      off();
      try { window.removeEventListener("sp:synced", onSynced); } catch {}
      clearInterval(iv);
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* نظرسنجی سبک تماس ورودی (v9) — هر ۸ ثانیه وقتی جفت‌ایم */
  useEffect(() => {
    if (!pair.paired) { setIncoming(null); return; }
    let on = true;
    const check = async () => {
      try {
        const r = await api("/api/call");
        const c = r && r.data && r.data.call;
        if (on) setIncoming(c && c.state === "ringing" && !c.mine ? { type: c.type || "audio", ts: c.ts } : null);
      } catch { if (on) setIncoming(null); }
    };
    check();
    const iv = setInterval(check, 8000);
    return () => { on = false; clearInterval(iv); };
  }, [pair.paired]);

  /* فقط خواندنی (v9): با هر tick دوباره چک کن */
  useEffect(() => {
    try { setRo(localStorage.getItem("mk:spacero") === "1"); } catch {}
  }, [tick]);
  const roBackup = () => {
    try {
      const blob = new Blob([JSON.stringify(C.exportSpace())], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "baham-backup-" + C.isoDay(new Date()) + ".json";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => { try { URL.revokeObjectURL(a.href); } catch {} }, 4000);
    } catch {}
  };

  /* شورتکات جستجو (v9.2): Ctrl+K باز/بسته، Esc بستن */
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && (String(e.key || "").toLowerCase() === "k")) { e.preventDefault(); setShowSearch((s) => !s); }
      else if (e.key === "Escape") setShowSearch(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const V = { touch, reload, myId, user, go, pair, goView };

  return (
    <div className="spacetab">
      <header className="tabhead sp-head">
        <h2><Ic n="hearts" s={20} /> فضای ما</h2>
        <button type="button" className="sp-searchbtn" onClick={() => setShowSearch(true)} title="جستجو (Ctrl+K)">🔍</button>
        <div className="sp-badges">
          <span className={"sp-sync" + (sync.state === "ok" ? " ok" : "")} title="وضعیت سینک">
            <Ic n={sync.state === "syncing" ? "refresh" : "check"} s={12} /> {SYNC_TXT[sync.state] || ""}
          </span>
          {pair.paired ? (
            <span className="sp-pair on">💞 {pair.partner || "متصل"}</span>
          ) : (
            <button type="button" className="sp-pair" onClick={() => goView("settings")}>🔗 وصل شو</button>
          )}
        </div>
      </header>

      {incoming && view !== "chat" ? (
        <button type="button" className="call-banner" onClick={() => goView("chat")}>
          <span className="call-ring">{incoming.type === "video" ? "📹" : "📞"}</span>
          تماس ورودی از {(() => { try { const p = C.getCoupleProfile(); return p.partnerNick || p.partner || "پارتنرت"; } catch { return "پارتنرت"; } })()} — بزن جواب بده!
        </button>
      ) : null}
      {ro ? (
        <div className="sp-ro">
          <span>🔒 ارتباط قطعه — این فضا فقط خواندنیه</span>
          <button type="button" onClick={roBackup}>💾 بکاپ بگیر</button>
        </div>
      ) : null}
      {showSearch ? (
        <SearchPalette
          onClose={() => setShowSearch(false)}
          onGo={(v, sel) => {
            try { if (sel) localStorage.setItem("mk:spacememsel", sel); } catch {}
            setShowSearch(false);
            goView(v);
          }}
        />
      ) : null}
      <div className="sp-nav" role="tablist">
        {VIEWS.map((v) => (
          <button key={v.id} type="button" role="tab" aria-selected={view === v.id}
            className={"sp-navbtn" + (view === v.id ? " on" : "")} onClick={() => goView(v.id)}>
            <Ic n={v.ic} s={16} /> {v.t}
          </button>
        ))}
      </div>

      <div className="sp-body" key={view}>
        {view === "home" && <HomeView {...V} />}
        {view === "chat" && <SpaceChat user={user} />}
        {view === "memories" && <MemoriesView {...V} />}
        {view === "calendar" && <CalendarView {...V} />}
        {view === "notes" && <NotesView {...V} />}
        {view === "wishlist" && <WishlistView {...V} />}
        {view === "bucket" && <BucketView {...V} />}
        {view === "letters" && <LettersView {...V} />}
        {view === "daily" && <DailyView {...V} />}
        {view === "timeline" && <TimelineView {...V} />}
        {view === "songs" && <SongsView {...V} />}
        {view === "dong" && <DongView {...V} />}
        {view === "mood" && <MoodView {...V} />}
        {view === "game" && <GameView {...V} />}
        {view === "book" && <BookView {...V} />}
        {view === "dares" && <DaresView {...V} />}
        {view === "stats" && <StatsView {...V} />}
        {view === "polls" && <PollsView {...V} />}
        {view === "trips" && <TripsView {...V} />}
        {view === "spins" && <SpinsView {...V} />}
        {view === "capsules" && <CapsulesView {...V} />}
        {view === "chains" && <ChainsView {...V} />}
        {view === "quests" && <QuestsView {...V} />}
        {view === "arts" && <ArtsView {...V} />}
        {view === "casts" && <CastsView {...V} />}
        {view === "pins" && <PinsView {...V} />}
        {view === "banks" && <BanksView {...V} />}
        {view === "movies" && <MoviesView {...V} />}
        {view === "recipes" && <RecipesView {...V} />}
        {view === "dreams" && <DreamsView {...V} />}
        {view === "shots" && <ShotsView {...V} />}
        {view === "ballots" && <BallotsView {...V} />}
        {view === "counts" && <CountsView {...V} />}
        {view === "laws" && <LawsView {...V} />}
        {view === "year" && <YearView {...V} />}
        {view === "hall" && <HallView {...V} />}
        {view === "settings" && <SettingsView {...V} />}
      </div>
    </div>
  );
}

/* ---------- اعلان‌های هوشمند (روزی یک بار) ---------- */
function badgeCheck() {
  try {
    if (!("setAppBadge" in navigator)) return;
    const nx = C.upcomingEvents(1)[0];
    if (nx && nx.left <= 31) navigator.setAppBadge(Math.max(1, nx.left));
    else if ("clearAppBadge" in navigator) navigator.clearAppBadge();
  } catch {}
}
function notifyCheck(myId) {
  try {
    const today = C.isoDay(new Date());
    const meN = myId || "me";
    if (new Date().getHours() >= 22 && localStorage.getItem("sp:sleepDay") !== today && typeof Notification !== "undefined" && Notification.permission === "granted") {
      localStorage.setItem("sp:sleepDay", today);
      try { new Notification("🌙 شب بخیر", { body: "امروزتون رو با یه خاطره‌ی قشنگ تموم کنید 💤" }); } catch {}
    }
    if (localStorage.getItem("sp:notifDay") === today) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    localStorage.setItem("sp:notifDay", today);
    const annN = C.nextMilestones();
    if (annN && (annN.yearly.left <= 3 || annN.monthly.left === 0)) {
      try { new Notification("🎂🎉", { body: annN.yearly.left <= 3 ? `سالگرد ${C.faNum(annN.yearly.n)}ام ${annN.yearly.left === 0 ? "امروزه! 🎉" : C.faNum(annN.yearly.left) + " روز دیگه‌ست! 🎂"}` : "ماهگردتون امروزه! 🎉" }); } catch {}
    }
    const dueCap = C.getCapsules().find((c) => c.openAt <= Date.now() && Date.now() - c.openAt < 864e5);
    if (dueCap) {
      try { new Notification("📖 کپسول زمان باز شد!", { body: dueCap.title + " — بیا بخونش 👀" }); } catch {}
    }
    const up = C.upcomingEvents(10).filter((e) => e.left <= 7);
    if (up.length) {
      let done = {};
      try { done = JSON.parse(localStorage.getItem("sp:notifEv") || "{}"); } catch {}
      const e = up[0];
      const stage = e.left <= 0 ? "0" : e.left === 1 ? "1" : e.left <= 3 ? "3" : "7";
      const seen = String(done[e.id] || "");
      if (!seen.split(",").includes(stage)) {
        done[e.id] = (seen ? seen + "," : "") + stage;
        const keys = Object.keys(done);
        if (keys.length > 30) { const slim = {}; keys.slice(-30).forEach((k) => { slim[k] = done[k]; }); done = slim; }
        try { localStorage.setItem("sp:notifEv", JSON.stringify(done)); } catch {}
        new Notification("💑 فضای ما", { body: (e.left === 0 ? "امروز: " : e.left === 1 ? "فردا: " : C.faNum(e.left) + " روز دیگه: ") + e.title });
      }
    }
    const open = C.getDares().filter((d) => Object.keys(d.done || {}).length < 2 && Date.now() - (d.ts || 0) < 7 * 864e5);
    if (open.length) {
      setTimeout(() => {
        try { new Notification("🎯 چالش باز داری!", { body: C.faNum(open.length) + " چالش نیمه‌تمومه؛ برو انجامش بده 💪" }); } catch {}
      }, 12000);
    }
    const otd = C.onThisDay();
    if (otd.length) {
      setTimeout(() => {
        try { new Notification("📸 امروزِ پارسال", { body: "یه خاطره از امروزِ سال‌های قبل داری؛ بیا ببینش 👀" }); } catch {}
      }, 8000);
    }
    const qA = C.getQuests().find((q) => C.questDay(q) < 30);
    if (qA) {
      const qd = Math.max(0, Math.min(29, C.questDay(qA)));
      if (!((qA.done || {})[qd] || {})[meN]) {
        setTimeout(() => {
          try { new Notification("🏅 ماموریت امروز!", { body: C.MISSIONS_30[qd] }); } catch {}
        }, 16000);
      }
    }
    const myTurnChain = C.getChains().find((c) => (c.lines || []).length && c.lines[c.lines.length - 1].by !== meN);
    if (myTurnChain) {
      setTimeout(() => {
        try { new Notification("💌 نوبت توئه!", { body: `یه خط به «${myTurnChain.title}» اضافه کن ✍️` }); } catch {}
      }, 20000);
    }
    const readyMov = C.getMovies().find((m) => !m.watched && Object.values(m.votes || {}).filter((v) => v === "y").length >= 2);
    if (readyMov) {
      setTimeout(() => {
        try { new Notification("🎬 امشب فیلمه!", { body: `هر دو به «${readyMov.title}» رأی دادید 🍿` }); } catch {}
      }, 24000);
    }
    const wkS = C.getShots().find((s) => s.week === C.weekKey());
    if (!wkS || !((wkS.entries || {})[meN])) {
      setTimeout(() => {
        try { new Notification("📸 سوژه‌ی این هفته!", { body: (wkS ? wkS.theme : C.shotTheme(C.weekKey())) + " — عکست رو بذار!" }); } catch {}
      }, 28000);
    }
    const moB = C.getBallots().find((b) => b.month === C.monthKey());
    if (moB && (moB.wishes || []).length && !((moB.votes || {})[meN])) {
      setTimeout(() => {
        try { new Notification("🗳️ صندوق ماه!", { body: "به آرزوی این ماه رأی بده 🌟" }); } catch {}
      }, 32000);
    }
  } catch {}
}
/* ---------- جشن مناسبتی ---------- */
function seasCheck() {
  try {
    const oc = C.occasionNow();
    if (!oc) return;
    const today = C.isoDay(new Date());
    if (localStorage.getItem("sp:seasDay") === today + ":" + oc.id) return;
    localStorage.setItem("sp:seasDay", today + ":" + oc.id);
    setTimeout(() => { try { confettiBurst({ count: 60 }); } catch {} }, 1200);
  } catch {}
}
/* ---------- جشن مایلستون ---------- */
function milestoneCheck() {
  try {
    const p = C.getCoupleProfile();
    if (!p.since) return;
    const bd = C.breakdownDays(p.since);
    const ms = C.milestoneFor(bd.total);
    const today = C.isoDay(new Date());
    const doneKey = "sp:msDay";
    if (ms.next !== null && ms.left === 0 && localStorage.getItem(doneKey) !== today + ":" + bd.total) {
      localStorage.setItem(doneKey, today + ":" + bd.total);
      setTimeout(() => { try { confettiBurst({ count: 90 }); } catch {} }, 900);
    }
  } catch {}
}

/* ============================ جستجوی سراسری 🔍 (v9.2) ============================ */
const SEARCH_SRC = [
  { v: "memories", t: "خاطرات", e: "📸", items: () => C.getMemories().map((m) => ({ id: m.id, t: m.title || "خاطره", d: ((m.text || "") + " " + (m.place || "")).slice(0, 60), sel: m.id })) },
  { v: "calendar", t: "تقویم", e: "🗓", items: () => C.getEvents().map((e) => ({ id: e.id, t: e.title || "رویداد", d: e.date || "" })) },
  { v: "notes", t: "یادداشت", e: "📝", items: () => C.getNotes().map((n) => ({ id: n.id, t: String(n.text || n.title || "یادداشت").slice(0, 60), d: "" })) },
  { v: "wishlist", t: "آرزوها", e: "🎁", items: () => C.getWishlist().map((w) => ({ id: w.id, t: w.title || "آرزو", d: w.note || "" })) },
  { v: "bucket", t: "باکت‌لیست", e: "🪣", items: () => C.getBucket().map((b) => ({ id: b.id, t: b.title || "", d: b.done ? "انجام شده ✓" : "" })) },
  { v: "letters", t: "نامه‌ها", e: "💌", items: () => C.getLetters().map((l) => ({ id: l.id, t: l.title || "نامه", d: l.to || "" })) },
  { v: "songs", t: "آهنگ‌ها", e: "🎵", items: () => C.getSongs().map((s) => ({ id: s.id, t: s.title || "", d: s.artist || "" })) },
  { v: "game", t: "بازی", e: "🎮", items: () => C.getGames().map((g) => ({ id: g.id, t: g.title || "بازی", d: "" })) },
  { v: "dares", t: "چالش", e: "🎯", items: () => C.getDares().map((d) => ({ id: d.id, t: d.t || "", d: "" })) },
  { v: "polls", t: "نظرسنجی", e: "🗳️", items: () => C.getPolls().map((p) => ({ id: p.id, t: p.q || "", d: "" })) },
  { v: "trips", t: "سفر", e: "🧳", items: () => C.getTrips().map((t) => ({ id: t.id, t: t.title || "", d: t.dest || "" })) },
  { v: "spins", t: "گردونه", e: "🎰", items: () => C.getSpins().map((s) => ({ id: s.id, t: (s.opts || [])[s.win] || s.title || "", d: s.title || "" })) },
  { v: "capsules", t: "کپسول", e: "📖", items: () => C.getCapsules().filter((c) => c.openAt <= Date.now()).map((c) => ({ id: c.id, t: c.title || "", d: "" })) },
  { v: "chains", t: "داستان", e: "💌", items: () => C.getChains().map((c) => ({ id: c.id, t: c.title || "", d: C.faNum((c.lines || []).length) + " خط" })) },
  { v: "arts", t: "پیکسل‌آرت", e: "🎨", items: () => C.getArts().map((a) => ({ id: a.id, t: a.day || "", d: "" })) },
  { v: "casts", t: "پادکست", e: "🎙️", items: () => C.getCasts().map((c) => ({ id: c.id, t: c.title || "", d: C.faNum((c.segs || []).length) + " قطعه" })) },
  { v: "pins", t: "نقشه", e: "📍", items: () => C.getPins().map((p) => ({ id: p.id, t: p.title || "", d: p.note || "" })) },
  { v: "banks", t: "قلک", e: "💰", items: () => C.getBanks().map((b) => ({ id: b.id, t: b.title || "", d: "" })) },
  { v: "movies", t: "فیلم", e: "🎬", items: () => C.getMovies().map((m) => ({ id: m.id, t: m.title || "", d: m.kind === "series" ? "سریال" : "فیلم" })) },
  { v: "recipes", t: "آشپزی", e: "🍳", items: () => C.getRecipes().map((r) => ({ id: r.id, t: r.title || "", d: "" })) },
  { v: "dreams", t: "رویا", e: "💤", items: () => C.getDreams().map((d) => ({ id: d.id, t: String(d.text || "").slice(0, 60), d: d.day || "" })) },
  { v: "shots", t: "چالش عکس", e: "📸", items: () => C.getShots().map((s) => ({ id: s.id, t: s.theme || "", d: s.week || "" })) },
  { v: "ballots", t: "صندوق", e: "🗳️", items: () => C.getBallots().flatMap((b) => (b.wishes || []).map((w) => ({ id: w.id, t: w.t || "", d: b.month || "" }))) },
  { v: "counts", t: "شمارش", e: "⏳", items: () => C.getCounts().map((c) => ({ id: c.id, t: c.title || "", d: c.date || "" })) },
  { v: "laws", t: "قانون‌ها", e: "📜", items: () => C.getLaws().map((w) => ({ id: w.id, t: w.text || "", d: Object.keys(w.signs || {}).length >= 2 ? "تصویب شد ✅" : "" })) },
];
function SearchPalette({ onGo, onClose }) {
  const [q, setQ] = useState("");
  const inp = useRef(null);
  useEffect(() => { try { inp.current && inp.current.focus(); } catch {} }, []);
  const res = [];
  if (q.trim()) {
    for (const s of SEARCH_SRC) {
      let items = [];
      try { items = s.items().filter((x) => ((x.t || "") + " " + (x.d || "")).includes(q.trim())).slice(0, 4); } catch {}
      if (items.length) res.push({ ...s, items });
    }
  }
  const flat = res.flatMap((s) => s.items.map((x) => ({ ...x, v: s.v })));
  return (
    <div className="srch-ovl" onClick={onClose}>
      <div className="srch-box card" onClick={(e) => e.stopPropagation()}>
        <input ref={inp} className="inp" value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجو در همه‌ی فضای ما… (Esc برای بستن)"
          onKeyDown={(e) => { if (e.key === "Enter" && flat.length) onGo(flat[0].v, flat[0].sel); }} />
        <div className="srch-res">
          {q.trim() && !res.length ? <div className="muted small center">چیزی پیدا نشد 😕</div> : null}
          {!q.trim() ? <div className="muted small center">بنویس تا تو خاطرات، قرارها، آهنگ‌ها و… بگردم ✨</div> : null}
          {res.map((s) => (
            <div key={s.v} className="srch-grp">
              <div className="srch-head">{s.e} {s.t}</div>
              {s.items.map((x) => (
                <button key={s.v + x.id} type="button" className="srch-it" onClick={() => onGo(s.v, x.sel)}>
                  <b>{x.t}</b>{x.d ? <span className="tiny dim">{x.d}</span> : null}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================ خانه ============================ */
function HomeView({ goView, touch, pair, myId }) {
  const prof = C.getCoupleProfile();
  const bd = prof.since ? C.breakdownDays(prof.since) : null;
  const ms = bd ? C.milestoneFor(bd.total) : null;
  const ann = prof.since ? C.nextAnniversary(prof.since) : null;
  const mems = C.getMemories();
  const otd = C.onThisDay(mems);
  const up = C.upcomingEvents(3);
  const dq = C.dailyQuestion();
  const dans = C.getDaily()[dq.date];
  const bucket = C.getBucket();
  const bDone = bucket.filter((b) => b.done).length;
  const sealed = C.getLetters().filter((l) => C.isSealed(l)).length;
  const bal = C.expenseBalance(myId);
  const moodT = C.getMoodLog()[C.isoDay(new Date())] || {};
  const todayS = C.isoDay(new Date());
  const tMems = mems.filter((m) => C.isoDay(new Date(m.ts || 0)) === todayS).length;
  const tLets = C.getLetters().filter((l) => C.isoDay(new Date(l.ts || 0)) === todayS).length;
  const tMoodN = Object.keys(moodT).length;
  const isNight = new Date().getHours() >= 21;
  const annM = C.nextMilestones();
  const [wx, setWx] = useState(null);
  const [wxCity, setWxCity] = useState(() => { try { return JSON.parse(localStorage.getItem("sp:wxCity") || "null") || { name: "تهران", lat: 35.7, lon: 51.42 }; } catch { return { name: "تهران", lat: 35.7, lon: 51.42 }; } });
  const [wxEdit, setWxEdit] = useState("");
  useEffect(() => {
    let dead = false;
    try {
      const cache = JSON.parse(localStorage.getItem("sp:wxCache") || "null");
      if (cache && cache.lat === wxCity.lat && Date.now() - cache.ts < 36e5) { setWx(cache); return; }
    } catch {}
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${wxCity.lat}&longitude=${wxCity.lon}&current=temperature_2m,weather_code&timezone=auto`)
      .then((r) => r.json())
      .then((j) => {
        if (dead || !j || !j.current) return;
        const d = { ts: Date.now(), lat: wxCity.lat, temp: Math.round(j.current.temperature_2m), code: j.current.weather_code };
        try { localStorage.setItem("sp:wxCache", JSON.stringify(d)); } catch {}
        setWx(d);
      })
      .catch(() => {});
    return () => { dead = true; };
  }, [wxCity.lat, wxCity.lon]);
  const wxGo = () => {
    const q = wxEdit.trim();
    if (!q) return;
    fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=fa`)
      .then((r) => r.json())
      .then((j) => {
        const r = j && j.results && j.results[0];
        if (!r) return;
        const c = { name: r.name, lat: r.latitude, lon: r.longitude };
        try { localStorage.setItem("sp:wxCity", JSON.stringify(c)); } catch {}
        setWxCity(c); setWxEdit(""); setWx(null);
      })
      .catch(() => {});
  };
  const [surp, setSurp] = useState(-1);
  const unAns = C.getGames().filter((g) => !C.isMine(g, myId) && !((g.answers || {})[myId || "me"])).length;
  const dareOpen = C.getDares().filter((d) => Object.keys(d.done || {}).length < 2).length;
  const pollOpen = C.getPolls().filter((p) => !p.closed && !((p.votes || {})[myId || "me"])).length;
  const [g1, g2] = prof.theme === "custom" && prof.c1 ? [prof.c1, prof.c2 || prof.c1] : (HERO_THEMES[prof.theme] || HERO_THEMES.rose);
  const isNew = !prof.since && mems.length === 0;

  const mods = [
    { v: "chat", ic: "chat", t: "چت ما", d: pair.paired ? "حرف بزنید 💬" : "اول وصل شید 🔗", e: "💬" },
    { v: "memories", ic: "camera", t: "خاطرات", d: mems.length ? C.faNum(mems.length) + " خاطره 📸" : "اولین خاطره رو بساز", e: "📸" },
    { v: "calendar", ic: "cal", t: "تقویم", d: up.length ? "نزدیک‌ترین: " + up[0].title : "قراری بذارید", e: "🗓" },
    { v: "daily", ic: "help", t: "سؤال امروز", d: dans && dans.mine ? "جواب دادی ✓" : "یه سؤال تازه داری!", e: "❓" },
    { v: "letters", ic: "letter", t: "نامه‌ها", d: sealed ? C.faNum(sealed) + " نامه‌ی مهرشده 🔒" : "یه نامه بنویس", e: "💌" },
    { v: "bucket", ic: "flag", t: "باکت‌لیست", d: bucket.length ? C.faNum(bDone) + " از " + C.faNum(bucket.length) : "آرزوهاتون چیه؟", e: "🪣" },
    { v: "wishlist", ic: "gift", t: "آرزوها", d: "لیست کادوی همو ببینید", e: "🎁" },
    { v: "notes", ic: "note", t: "یادداشت", d: "لیست خرید، سفر، حرفا…", e: "📝" },
    { v: "songs", ic: "music", t: "آهنگ‌ها", d: "آهنگای مشترکتون", e: "🎵" },
    { v: "timeline", ic: "clock", t: "تایم‌لاین", d: "قصه‌ی شما از اول تا حالا", e: "🕐" },
    { v: "dong", ic: "cash", t: "دانگ", d: bal === 0 ? "صافید 🤝" : (bal > 0 ? "طلبکاری 😎" : "بدهکاری 😅"), e: "💸" },
    { v: "mood", ic: "smile", t: "حال ما", d: moodT.mineTs ? "امروز ثبت شد ✓" : "امروز حالت چطوره؟", e: "😊" },
    { v: "game", ic: "dice", t: "بازی", d: unAns ? C.faNum(unAns) + " بازی تازه داری!" : "کی همو بهتر می‌شناسه؟", e: "🎮" },
    { v: "book", ic: "book", t: "کتاب ما", d: "چاپ قصه‌تون 📖", e: "📖" },
    { v: "dares", ic: "target", t: "چالش", d: dareOpen ? C.faNum(dareOpen) + " چالش باز 🎯" : "یه چالش بکشید!", e: "🎯" },
    { v: "stats", ic: "chart", t: "آمار", d: "گزارش رابطه‌تون 📊", e: "📊" },
    { v: "polls", ic: "help", t: "نظرسنجی", d: pollOpen ? C.faNum(pollOpen) + " رأی مونده 🗳️" : "تصمیم مشترک بگیرید", e: "🗳️" },
    { v: "trips", ic: "trip", t: "سفر", d: C.getTrips().length ? C.faNum(C.getTrips().length) + " سفر 🧳" : "کجا بریم؟", e: "🧳" },
    { v: "spins", ic: "wheel", t: "گردونه", d: C.getSpins().length ? C.faNum(C.getSpins().length) + " قرعه 🎰" : "امشب چیکار کنیم؟", e: "🎰" },
    { v: "capsules", ic: "capsule", t: "کپسول", d: (() => { const s = C.getCapsules().filter((c) => c.openAt > Date.now()).length; return s ? C.faNum(s) + " دفن‌شده 📖" : "به آینده بنویس"; })(), e: "📖" },
    { v: "chains", ic: "story", t: "داستان", d: C.getChains().length ? C.faNum(C.getChains().length) + " داستان 💌" : "یه خط بنویس!", e: "💌" },
    { v: "quests", ic: "medal", t: "۳۰ روزه", d: (() => { const a = C.getQuests().find((q) => C.questDay(q) < 30); return a ? "روز " + C.faNum(Math.max(0, C.questDay(a)) + 1) + " 🏅" : "شروع کن!"; })(), e: "🏅" },
    { v: "arts", ic: "grid", t: "پیکسل‌آرت", d: "امروز چی می‌کشی؟ 🎨", e: "🎨" },
    { v: "casts", ic: "mic", t: "پادکست", d: C.getCasts().length ? C.faNum(C.getCasts().length) + " قسمت 🎙️" : "صداتون رو ضبط کنید!", e: "🎙️" },
    { v: "pins", ic: "pin", t: "نقشه", d: C.getPins().length ? C.faNum(C.getPins().length) + " پین 📍" : "جاهاتون کجاست؟", e: "📍" },
    { v: "banks", ic: "coin", t: "قلک", d: C.getBanks().length ? C.faNum(C.getBanks().length) + " آرزو 💰" : "برای چی جمع کنیم؟", e: "💰" },
    { v: "movies", ic: "film", t: "فیلم", d: (() => { const n = C.getMovies().filter((m) => !m.watched).length; return n ? C.faNum(n) + " تو صف 🎬" : "چی ببینیم؟"; })(), e: "🎬" },
    { v: "recipes", ic: "pot", t: "آشپزی", d: C.getRecipes().length ? C.faNum(C.getRecipes().length) + " دستور 🍳" : "چی بپزیم؟", e: "🍳" },
    { v: "dreams", ic: "moon", t: "رویا", d: "دیشب چی خواب دیدی؟ 💤", e: "💤" },
    { v: "shots", ic: "image", t: "چالش عکس", d: "سوژه‌ی این هفته! 📸", e: "📸" },
    { v: "ballots", ic: "ballot", t: "صندوق", d: "آرزوی این ماه؟ 🗳️", e: "🗳️" },
    { v: "counts", ic: "clock", t: "شمارش", d: (() => { const t = C.isoDay(new Date()); const nx = C.getCounts().filter((c) => c.date >= t).sort((a, b) => String(a.date).localeCompare(String(b.date)))[0]; return nx ? nx.title + " ⏳" : "لحظه‌شماری چی؟"; })(), e: "⏳" },
    { v: "laws", ic: "scroll", t: "قانون‌ها", d: "منشور ما 📜", e: "📜" },
    { v: "year", ic: "party", t: "سال ما", d: "مرور امسال 🎊", e: "🎊" },
    { v: "hall", ic: "crown", t: "تالار", d: "مدال‌ها و رکوردها 🏆", e: "🏆" },
  ];

  return (
    <div className="sp-home">
      {/* خلاصه امروز + حالت شب (v9.3) */}
      <div className={"sp-today" + (isNight ? " night" : "")}>
        <span className="sp-today-t">{isNight ? "🌙 امشب" : "☀️ امروز"}</span>
        <span>📸 {C.faNum(tMems)}</span>
        <span>{tMoodN ? "😊 حال ✓" : "😊 …"}</span>
        <span>💌 {C.faNum(tLets)}</span>
      </div>
      {/* سالگرد هوشمند (v9.4) */}
      {annM && (annM.monthly.left <= 7 || annM.yearly.left <= 31) ? (
        <div className="sp-ann">
          <div className="sp-ann-t">🎂 {annM.yearly.left <= 31 ? `سالگرد ${C.faNum(annM.yearly.n)}ام ${annM.yearly.left === 0 ? "امروزه! 🎉" : C.faNum(annM.yearly.left) + " روز دیگه"}` : `ماهگرد ${C.faNum(annM.monthly.n)}ام ${annM.monthly.left === 0 ? "امروزه! 🎉" : C.faNum(annM.monthly.left) + " روز دیگه"}`}</div>
          <button type="button" className="sp-ann-b" onClick={() => setSurp(Math.floor(Math.random() * C.SURPRISE_IDEAS.length))}>🎁 ایده‌ی سورپرایز</button>
          {surp >= 0 ? <div className="sp-ann-i">✨ {C.SURPRISE_IDEAS[surp]}</div> : null}
        </div>
      ) : null}
      {/* هوای قرار (v9.5) */}
      <div className="sp-wx">
        {wx ? (
          <>
            <span className="sp-wx-t">{C.weatherSuggest(wx.code).e} {wxCity.name} {C.faNum(wx.temp)}° · {C.weatherSuggest(wx.code).t}</span>
            <span className="tiny">{C.weatherSuggest(wx.code).tip}</span>
          </>
        ) : <span className="tiny dim">🌦️ در حال گرفتن هوا…</span>}
        <span className="sp-wx-ed">
          <input className="inp sp-wx-inp" value={wxEdit} onChange={(e) => setWxEdit(e.target.value)} placeholder="شهر…" onKeyDown={(e) => { if (e.key === "Enter") wxGo(); }} />
          <button type="button" className="sp-wx-b" onClick={wxGo} title="تغییر شهر">📍</button>
        </span>
      </div>
      {/* هیرو شمارنده */}
      <section className="sp-hero" style={{ background: `linear-gradient(135deg, ${g1}, ${g2})` }}>
        <div className="sp-hero-hearts" aria-hidden="true">
          {["❤️", "💕", "💖", "💘", "💗", "❤️", "💞"].map((h, i) => (
            <span key={i} style={{ animationDelay: (i * 0.9) + "s", left: (6 + i * 13) + "%" }}>{h}</span>
          ))}
        </div>
        <div className="sp-hero-emoji">{prof.emoji || "❤️"}</div>
        <h3>{prof.me || prof.partner ? `${prof.meNick || prof.me || "من"} ${prof.emoji || "❤️"} ${prof.partnerNick || prof.partner || "عشقم"}` : "فضای ما"}</h3>
        {bd ? (
          <>
            <div className="sp-hero-days">
              <span className="sp-hero-total">{C.faNum(bd.total)}</span>
              <span className="sp-hero-total-lbl">روز با هم بودن</span>
            </div>
            <div className="sp-hero-break">
              <span><b>{C.faNum(bd.y)}</b> سال</span><i />
              <span><b>{C.faNum(bd.m)}</b> ماه</span><i />
              <span><b>{C.faNum(bd.d)}</b> روز</span>
            </div>
            <p className="sp-hero-since">از {C.faJalali(prof.since)} کنار همید 💑</p>
            <div className="sp-hero-counts">
              {ms && ms.next !== null ? (
                <span className="sp-count">🏆 {C.faNum(ms.next)} روزگی: {ms.left === 0 ? "امروزه! 🎉" : C.faNum(ms.left) + " روز مونده"}</span>
              ) : null}
              {ann ? (
                <span className="sp-count">💍 سالگرد بعدی: {ann.left === 0 ? "امروزه! 🎉" : C.faNum(ann.left) + " روز مونده"}</span>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <p className="sp-hero-sub">خونه‌ی دیجیتال رابطه‌تون 🏠<br />تاریخ شروع قصه‌تون رو بگید تا شمارش شروع شه:</p>
            <button className="btn primary" type="button" onClick={() => goView("settings")}>
              <Ic n="hearts" s={16} /> شروع قصه‌ی ما
            </button>
          </>
        )}
      </section>

      {(() => { const oc = C.occasionNow(); return oc ? (
        <section className="card ccard sp-season">
          <span className="sp-season-e">{oc.e}</span>
          <div><b>{oc.greet}</b><br /><span className="tiny dim">حالت مناسبتی باهم {oc.e}</span></div>
        </section>
      ) : null; })()}

      {isNew ? (
        <section className="card ccard">
          <h3 className="ip-head"><Ic n="sparkles" s={16} /> خوش اومدی به فضای ما!</h3>
          <p className="dim small">اینجا فقط مال شماست: خاطره، قرار، نامه، سؤال روزانه… سه‌تا کار بکن و خونه‌تون آماده‌ست:</p>
          <div className="sp-steps">
            <button type="button" onClick={() => goView("settings")}><b>۱</b> اسما و تاریخ شروع رو بزن</button>
            <button type="button" onClick={() => goView("memories")}><b>۲</b> اولین خاطره رو ثبت کن</button>
            <button type="button" onClick={() => goView("settings")}><b>۳</b> پارتنرت رو دعوت کن 💞</button>
          </div>
        </section>
      ) : null}

      {otd.length ? (
        <section className="card ccard sp-otd" onClick={() => goView("memories")}>
          <h3 className="ip-head">📸 امروزِ سال‌های قبل</h3>
          {otd.slice(0, 2).map((m) => (
            <div key={m.id} className="sp-otd-one">
              {m.photos && m.photos[0] ? <img src={m.photos[0]} alt="" /> : <span className="sp-otd-ph">📸</span>}
              <div>
                <b>{m.title || "خاطره"}</b>
                <span className="tiny dim">{C.faJalali(m.date || m.ts)}</span>
              </div>
            </div>
          ))}
        </section>
      ) : null}

      <section className="card ccard sp-daily-teaser" onClick={() => goView("daily")}>
        <h3 className="ip-head">❓ سؤال امروز</h3>
        <p>«{dq.q}»</p>
        <span className="tiny">{dans && dans.mine ? "جواب دادی؛ برو ببین پارتنرت چی گفته 👀" : "هنوز جواب ندادی؛ بزن بریم 👆"}</span>
      </section>

      {up.length ? (
        <section className="card ccard">
          <h3 className="ip-head">🗓 نزدیک‌ترین قرارها</h3>
          {up.map((e) => (
            <div key={e.id} className="sp-up-one" onClick={() => goView("calendar")}>
              <span className="sp-up-e">{C.eventEmoji(e.kind)}</span>
              <div><b>{e.title}</b><span className="tiny dim">{C.faJalaliShort(e.date)}{e.time ? " · " + e.time : ""}</span></div>
              <span className="sp-left">{e.left === 0 ? "امروز!" : C.faNum(e.left) + " روز"}</span>
            </div>
          ))}
        </section>
      ) : null}

      <section className="sp-grid">
        {mods.map((m) => (
          <button key={m.v} type="button" className="sp-mod card" onClick={() => goView(m.v)}>
            <span className="sp-mod-e">{m.e}</span>
            <span className="sp-mod-t">{m.t}</span>
            <span className="sp-mod-d">{m.d}</span>
          </button>
        ))}
      </section>
    </div>
  );
}

/* ---------- دستیار حافظه 🔍 (v8.2) ---------- */
function MemoryAsk() {
  const [open, setOpen] = useState(false);
  const [mq, setMq] = useState("");
  const [ma, setMa] = useState("");
  const [busy, setBusy] = useState(false);
  const ask = async () => {
    if (!mq.trim() || busy) return;
    setBusy(true); setMa("");
    try {
      const r = await api("/api/chat", { method: "POST", body: { mode: "memory", text: mq.trim().slice(0, 500), memory: C.buildMemoryContext() } });
      if (r && r.ok && r.data && r.data.reply) setMa(r.data.reply);
      else setMa((r && r.data && r.data.message) || "فعلاً نتونستم جواب بدم؛ دوباره بپرس 🔄");
    } catch { setMa("اینترنت رو چک کن و دوباره بپرس 📡"); }
    setBusy(false);
  };
  return (
    <div className="card ccard mem-ask">
      <button type="button" className="mem-ask-h" onClick={() => setOpen(!open)}>
        <span>🔍 از خاطرات بپرس</span><Ic n="chev" s={14} style={{ transform: open ? "rotate(180deg)" : "none" }} />
      </button>
      {open && (
        <div className="mem-ask-b">
          <p className="tiny dim">مثلاً: «اولین سفرمون کجا بود؟» یا «تولد پارتنرم کیه؟»</p>
          <div className="row2">
            <input className="inp" value={mq} onChange={(e) => setMq(e.target.value)} placeholder="سؤالت رو بنویس…" maxLength={500} onKeyDown={(e) => { if (e.key === "Enter") ask(); }} />
            <button type="button" className="btn primary sm" onClick={ask} disabled={busy}>{busy ? "…" : "بپرس"}</button>
          </div>
          {busy && <div className="muted small">دارم خاطرات رو زیر و رو می‌کنم… 🧠</div>}
          {ma && <div className="mem-ans">{ma}</div>}
        </div>
      )}
    </div>
  );
}

/* ============================ خاطرات ============================ */
function MemoriesView({ touch }) {
  const [show, setShow] = useState(() => {
    try {
      if (localStorage.getItem("mk:spacenew") === "1") {
        localStorage.removeItem("mk:spacenew");
        return true;
      }
    } catch {}
    return false;
  });
  const [title, setTitle] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem("mk:share") || "null");
      if (s && s.t) return String(s.t).slice(0, 80);
    } catch {}
    return "";
  });
  const [text, setText] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem("mk:share") || "null");
      if (s && (s.text || s.url)) {
        localStorage.removeItem("mk:share");
        return [s.text, s.url].filter(Boolean).join("\n").slice(0, 2000);
      }
    } catch {}
    return "";
  });
  const [date, setDate] = useState(C.isoDay(new Date()));
  const [mood, setMood] = useState("");
  const [place, setPlace] = useState("");
  const [tags, setTags] = useState("");
  const [photos, setPhotos] = useState([]);
  const [busy, setBusy] = useState(false);
  const [sel, setSel] = useState(() => {
    try {
      const s = localStorage.getItem("mk:spacememsel");
      if (s) { localStorage.removeItem("mk:spacememsel"); return s; }
    } catch {}
    return null;
  });
  const [q, setQ] = useState("");
  const [shareLink, setShareLink] = useState("");
  const mems = C.getMemories();
  const filtered = q.trim()
    ? mems.filter((m) => (m.title + " " + m.text + " " + m.place + " " + (m.tags || []).join(" ")).includes(q.trim()))
    : mems;
  const groups = C.groupMemoriesByMonth(filtered);

  const pickPhotos = async (files) => {
    if (!files || !files.length) return;
    setBusy(true);
    const arr = [...photos];
    for (const f of [...files].slice(0, 6 - arr.length)) {
      const d = await C.compressImage(f);
      if (d) arr.push(d);
    }
    setPhotos(arr);
    setBusy(false);
  };

  const save = () => {
    if (!title.trim() && !text.trim() && !photos.length) return;
    C.addMemory({
      title: title.trim(), text: text.trim(), date, photos, mood, place: place.trim(),
      tags: tags.split(/[،,]/).map((t) => t.trim().replace(/^#/, "")).filter(Boolean),
    });
    try { addXp(5); confettiBurst({ count: 30 }); } catch {}
    setTitle(""); setText(""); setDate(C.isoDay(new Date())); setMood(""); setPlace(""); setTags(""); setPhotos([]);
    setShow(false);
    touch();
  };

  const mkShareMem = async (m) => {
    try {
      const r = await api("/api/share", { method: "POST", body: { kind: "memory", m: { title: m.title || "", text: m.text || "", date: m.date || "", place: m.place || "", photo: (m.photos && m.photos[0]) || "" } } });
      if (r && r.ok && r.data && r.data.url) {
        setShareLink(r.data.url);
        try { await navigator.clipboard.writeText(r.data.url); } catch {}
      }
    } catch {}
  };
  if (sel) {
    const m = mems.find((x) => x.id === sel) || sel;
    return (
      <div className="card ccard">
        <button className="btn ghost sm" type="button" onClick={() => setSel(null)}>
          <Ic n="chev" s={14} style={{ transform: "rotate(90deg)" }} /> برگرد
        </button>
        <h3 style={{ marginTop: 10 }}>{m.mood ? C.MEMORY_MOODS.find((x) => x.id === m.mood)?.e + " " : ""}{m.title || "خاطره"}</h3>
        <p className="tiny dim">{C.faJalali(m.date || m.ts)}{m.place ? " · 📍 " + m.place : ""}</p>
        {m.photos && m.photos.length ? (
          <div className="sp-photos big">
            {m.photos.map((p, i) => <img key={i} src={p} alt="" onClick={() => { try { window.open(p, "_blank"); } catch {} }} />)}
          </div>
        ) : null}
        {m.text ? <p className="sp-memtext">{m.text}</p> : null}
        {m.tags && m.tags.length ? (
          <div className="sp-tags">{m.tags.map((t) => <span key={t}>#{t}</span>)}</div>
        ) : null}
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <button className="btn ghost sm" type="button" onClick={() => mkShareMem(m)}>🔗 اشتراک عمومی</button>
        </div>
        {shareLink ? <p className="tiny dim" style={{ wordBreak: "break-all" }}>🔗 لینک کپی شد (۹۰ روز اعتبار): {shareLink}</p> : null}
        <button className="btn ghost danger sm" type="button" style={{ marginTop: 10 }}
          onClick={() => { if (confirm("این خاطره پاک بشه؟")) { C.delMemory(m.id); setSel(null); touch(); } }}>
          <Ic n="trash" s={14} /> حذف خاطره
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="sp-rowhead">
        <button className="btn primary" type="button" onClick={() => setShow(!show)}>
          <Ic n="plus" s={16} /> خاطره جدید
        </button>
        <input className="inp sp-search" dir="rtl" placeholder="جستجو…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <MemoryAsk />

      {show ? (
        <div className="card ccard">
          <h3 className="ip-head"><Ic n="camera" s={16} /> خاطره‌ی تازه</h3>
          <label className="sp-photopick">
            <input type="file" accept="image/*" multiple hidden onChange={(e) => pickPhotos(e.target.files)} />
            <Ic n="image" s={18} /> {busy ? "یه لحظه…" : photos.length ? C.faNum(photos.length) + " عکس انتخاب شد (بزن اضافه کن)" : "عکس اضافه کن"}
          </label>
          {photos.length ? (
            <div className="sp-photos">
              {photos.map((p, i) => (
                <span key={i} className="sp-ph">
                  <img src={p} alt="" />
                  <button type="button" onClick={() => setPhotos(photos.filter((_, k) => k !== i))}>×</button>
                </span>
              ))}
            </div>
          ) : null}
          <input className="inp" dir="rtl" maxLength={80} placeholder="عنوان خاطره (مثلاً: اولین قرارمون)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className="inp" dir="rtl" rows={3} maxLength={2000} placeholder="تعریف کن چی شد…" value={text} onChange={(e) => setText(e.target.value)} style={{ minHeight: 80, resize: "vertical" }} />
          <div className="sp-2col">
            <input className="inp" dir="ltr" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <input className="inp" dir="rtl" maxLength={60} placeholder="کجا؟ (اختیاری)" value={place} onChange={(e) => setPlace(e.target.value)} />
          </div>
          <p className="tiny dim">تاریخ: {C.faJalali(date)}</p>
          <div className="sp-moods">
            {C.MEMORY_MOODS.map((m) => (
              <button key={m.id} type="button" className={"sp-mood" + (mood === m.id ? " on" : "")} onClick={() => setMood(mood === m.id ? "" : m.id)} title={m.t}>{m.e}</button>
            ))}
          </div>
          <input className="inp" dir="rtl" maxLength={120} placeholder="تگ‌ها با ویرگول (مثلاً: سفر، شمال)" value={tags} onChange={(e) => setTags(e.target.value)} />
          <button className="btn primary big" type="button" onClick={save}><Ic n="check" s={16} /> ثبت خاطره</button>
        </div>
      ) : null}

      {mems.length === 0 ? (
        <div className="card ccard center">
          <span className="sp-bigemoji">📸</span>
          <p className="dim small">هنوز خاطره‌ای ثبت نشده.<br />اولین خاطره‌تون رو بسازید؛ اینجا آلبوم دیجیتال رابطه‌تونه.</p>
        </div>
      ) : null}

      {groups.map((g) => (
        <div key={g.key} className="sp-mgroup">
          <div className="sp-mlabel"><span>{g.label}</span></div>
          {g.items.map((m) => (
            <div key={m.id} className="card ccard sp-mem" onClick={() => { setShareLink(""); setSel(m); }}>
              <div className="sp-mem-head">
                <b>{m.mood ? (C.MEMORY_MOODS.find((x) => x.id === m.mood)?.e || "") + " " : ""}{m.title || "خاطره"}</b>
                <span className="tiny dim">{C.faJalali(m.date || m.ts)}</span>
              </div>
              {m.photos && m.photos.length ? (
                <div className="sp-photos">{m.photos.slice(0, 3).map((p, i) => <img key={i} src={p} alt="" />)}</div>
              ) : null}
              {m.text ? <p className="sp-memtext">{m.text.slice(0, 160)}{m.text.length > 160 ? "…" : ""}</p> : null}
              {m.place ? <span className="tiny dim">📍 {m.place}</span> : null}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ============================ تقویم ============================ */
const RECUR_T = { none: "بدون تکرار", daily: "روزانه", weekly: "هفتگی", monthly: "ماهانه", yearly: "سالانه" };
function CalendarView({ touch }) {
  const tj = C.toJalali(new Date()) || { jy: 1405, jm: 1 };
  const [jy, setJy] = useState(tj.jy);
  const [jm, setJm] = useState(tj.jm);
  const [sel, setSel] = useState(C.isoDay(new Date()));
  const [form, setForm] = useState(false);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [kind, setKind] = useState("date");
  const [recur, setRecur] = useState("none");
  const [note, setNote] = useState("");
  const up = C.upcomingEvents(6);
  const selEvents = C.eventsOn(sel);

  const nav = (d) => {
    let y = jy, m = jm + d;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setJy(y); setJm(m);
  };
  const days = C.jMonthLength(jy, jm);
  const firstCol = (() => { try { return (C.fromJalali(jy, jm, 1).getDay() + 1) % 7; } catch { return 0; } })();
  const todayIso = C.isoDay(new Date());
  const cells = [];
  for (let i = 0; i < firstCol; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);

  const save = () => {
    if (!title.trim()) return;
    C.addEvent({ title: title.trim(), date: sel, time, kind, note: note.trim(), recur });
    try { addXp(3); } catch {}
    setTitle(""); setTime(""); setKind("date"); setRecur("none"); setNote("");
    setForm(false);
    touch();
  };

  return (
    <div>
      <div className="card ccard sp-cal">
        <div className="sp-cal-head">
          <button type="button" onClick={() => nav(1)}><Ic n="chev" s={16} style={{ transform: "rotate(90deg)" }} /></button>
          <b>{C.jMonthLabel(jy, jm)}</b>
          <button type="button" onClick={() => nav(-1)}><Ic n="chev" s={16} style={{ transform: "rotate(-90deg)" }} /></button>
        </div>
        <div className="sp-cal-grid sp-cal-wd">
          {C.J_WDAYS_S.map((w) => <span key={w}>{w}</span>)}
        </div>
        <div className="sp-cal-grid">
          {cells.map((d, i) => {
            if (!d) return <span key={"e" + i} className="sp-day empty" />;
            let iso = "";
            try { iso = C.isoDay(C.fromJalali(jy, jm, d)); } catch {}
            const evs = iso ? C.eventsOn(iso) : [];
            return (
              <button key={d} type="button"
                className={"sp-day" + (iso === todayIso ? " today" : "") + (iso === sel ? " sel" : "") + (evs.length ? " has" : "")}
                onClick={() => { setSel(iso); setForm(false); }}>
                {C.faNum(d)}
                {evs.length ? <span className="sp-dots">{evs.slice(0, 3).map((e) => C.eventEmoji(e.kind)).join("")}</span> : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="card ccard">
        <h3 className="ip-head">📌 {C.faJalaliShort(sel)}</h3>
        {selEvents.length === 0 ? <p className="tiny dim">این روز خالیه؛ یه قرار بذارید؟ 😏</p> : null}
        {selEvents.map((e) => (
          <div key={e.id} className="sp-ev">
            <span className="sp-ev-e">{C.eventEmoji(e.kind)}</span>
            <div><b>{e.title}</b>{e.time ? <span className="tiny dim"> · {e.time}</span> : null}{e.recur !== "none" ? <span className="tiny dim"> · 🔁 {RECUR_T[e.recur]}</span> : null}{e.note ? <p className="tiny dim">{e.note}</p> : null}</div>
            <a className="sp-gcal" href={C.gcalUrl(e)} target="_blank" rel="noopener" title="افزودن به گوگل کلندر">📅</a>
            <button type="button" className="sp-gcal" onClick={() => C.downloadICS(e)} title="دانلود فایل تقویم (ICS)">⬇️</button>
            <button type="button" className="sp-del" onClick={() => { if (confirm("پاک بشه؟")) { C.delEvent(e.id); touch(); } }}><Ic n="trash" s={14} /></button>
          </div>
        ))}
        {!form ? (
          <button className="btn primary sm" type="button" onClick={() => setForm(true)}><Ic n="plus" s={14} /> رویداد این روز</button>
        ) : (
          <div className="sp-form">
            <input className="inp" dir="rtl" maxLength={80} placeholder="عنوان (مثلاً: شام دونفره)" value={title} onChange={(e) => setTitle(e.target.value)} />
            <div className="sp-2col">
              <input className="inp" dir="ltr" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              <select className="inp" dir="rtl" value={recur} onChange={(e) => setRecur(e.target.value)}>
                {Object.entries(RECUR_T).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
              </select>
            </div>
            <div className="sp-kinds">
              {C.EVENT_KINDS.map((k) => (
                <button key={k.id} type="button" className={"sp-kind" + (kind === k.id ? " on" : "")} onClick={() => setKind(k.id)}>{k.e} {k.t}</button>
              ))}
            </div>
            <input className="inp" dir="rtl" maxLength={500} placeholder="توضیح (اختیاری)" value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="sp-2col">
              <button className="btn primary" type="button" onClick={save}>ثبت</button>
              <button className="btn ghost" type="button" onClick={() => setForm(false)}>بی‌خیال</button>
            </div>
          </div>
        )}
      </div>

      {up.length ? (
        <div className="card ccard">
          <h3 className="ip-head">⏳ شمارش معکوس</h3>
          {up.map((e) => (
            <div key={e.id} className="sp-up-one">
              <span className="sp-up-e">{C.eventEmoji(e.kind)}</span>
              <div><b>{e.title}</b><span className="tiny dim">{C.faJalali(e.date)}</span></div>
              <span className="sp-left">{e.left === 0 ? "امروز! 🎉" : C.faNum(e.left) + " روز"}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ============================ یادداشت‌ها ============================ */
function NotesView({ touch }) {
  const [kind, setKind] = useState("text");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [items, setItems] = useState("");
  const [open, setOpen] = useState(null);
  const [edit, setEdit] = useState("");
  const notes = C.getNotes();

  const save = () => {
    if (kind === "check") {
      const arr = items.split("\n").map((s) => s.trim()).filter(Boolean);
      if (!title.trim() && !arr.length) return;
      C.addNote({ title: title.trim() || "لیست", kind: "check", items: arr });
    } else {
      if (!title.trim() && !body.trim()) return;
      C.addNote({ title: title.trim(), body: body.trim(), kind: "text" });
    }
    try { addXp(2); } catch {}
    setTitle(""); setBody(""); setItems("");
    touch();
  };

  return (
    <div>
      <div className="card ccard">
        <div className="sp-seg">
          <button type="button" className={kind === "text" ? "on" : ""} onClick={() => setKind("text")}>📝 یادداشت</button>
          <button type="button" className={kind === "check" ? "on" : ""} onClick={() => setKind("check")}>☑️ چک‌لیست</button>
        </div>
        <input className="inp" dir="rtl" maxLength={80} placeholder={kind === "check" ? "اسم لیست (مثلاً: خرید خونه)" : "عنوان یادداشت"} value={title} onChange={(e) => setTitle(e.target.value)} />
        {kind === "check" ? (
          <textarea className="inp" dir="rtl" rows={3} placeholder="هر خط یه مورد…&#10;شکلات&#10;گل&#10;قهوه" value={items} onChange={(e) => setItems(e.target.value)} style={{ minHeight: 80 }} />
        ) : (
          <textarea className="inp" dir="rtl" rows={3} maxLength={3000} placeholder="بنویس…" value={body} onChange={(e) => setBody(e.target.value)} style={{ minHeight: 80 }} />
        )}
        <button className="btn primary" type="button" onClick={save}><Ic n="plus" s={15} /> اضافه کن</button>
      </div>

      {notes.length === 0 ? (
        <div className="card ccard center"><span className="sp-bigemoji">📝</span><p className="dim small">هنوز یادداشتی نیست.<br />لیست خرید، برنامه سفر، حرفای خوب… همه اینجاست.</p></div>
      ) : null}

      {notes.map((n) => (
        <div key={n.id} className="card ccard sp-note">
          <div className="sp-note-head" onClick={() => { setOpen(open === n.id ? null : n.id); setEdit(n.body || ""); }}>
            <b>{n.kind === "check" ? "☑️ " : "📝 "}{n.title}</b>
            <button type="button" className="sp-del" onClick={(e) => { e.stopPropagation(); if (confirm("پاک بشه؟")) { C.delNote(n.id); touch(); } }}><Ic n="trash" s={14} /></button>
          </div>
          {n.kind === "check" ? (
            <div className="sp-checks">
              {n.items.map((it, i) => (
                <label key={i} className={"sp-check" + (it.done ? " done" : "")}>
                  <input type="checkbox" checked={!!it.done} onChange={() => {
                    const arr = n.items.map((x, k) => (k === i ? { ...x, done: !x.done } : x));
                    C.updateNote(n.id, { items: arr });
                    touch();
                  }} />
                  <span>{it.t}</span>
                </label>
              ))}
            </div>
          ) : open === n.id ? (
            <div>
              <textarea className="inp" dir="rtl" rows={4} value={edit} onChange={(e) => setEdit(e.target.value)} style={{ minHeight: 90 }} />
              <button className="btn primary sm" type="button" onClick={() => { C.updateNote(n.id, { body: edit }); setOpen(null); touch(); }}>ذخیره</button>
            </div>
          ) : n.body ? (
            <p className="sp-memtext" onClick={() => { setOpen(n.id); setEdit(n.body); }}>{n.body.slice(0, 220)}{n.body.length > 220 ? "…" : ""}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/* ============================ آرزوها ============================ */
function WishlistView({ touch, myId }) {
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");
  const [secrets, setSecrets] = useState(() => C.getSecretGifts());
  const all = C.getWishlist();
  const mine = all.filter((w) => C.isMine(w, myId));
  const theirs = all.filter((w) => !C.isMine(w, myId));

  const save = () => {
    if (!title.trim()) return;
    C.addWish({ title: title.trim(), link: link.trim(), price: price.trim(), note: note.trim(), by: myId });
    setTitle(""); setLink(""); setPrice(""); setNote("");
    touch();
  };
  const toggleSecret = (id) => {
    setSecrets(C.toggleSecretGift(id));
    try { buzz(10); } catch {}
  };

  return (
    <div>
      <div className="card ccard">
        <h3 className="ip-head"><Ic n="gift" s={16} /> آرزوی تازه</h3>
        <p className="tiny dim">هرچی دوست داری کادو بگیری اینجا بنویس؛ پارتنرت می‌بینه 👀</p>
        <input className="inp" dir="rtl" maxLength={100} placeholder="چی می‌خوای؟ (مثلاً: هدفون)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <div className="sp-2col">
          <input className="inp" dir="rtl" maxLength={40} placeholder="بودجه (اختیاری)" value={price} onChange={(e) => setPrice(e.target.value)} />
          <input className="inp" dir="ltr" maxLength={300} placeholder="لینک (اختیاری)" value={link} onChange={(e) => setLink(e.target.value)} />
        </div>
        <input className="inp" dir="rtl" maxLength={300} placeholder="توضیح (رنگ، مدل…)" value={note} onChange={(e) => setNote(e.target.value)} />
        <button className="btn primary" type="button" onClick={save}><Ic n="plus" s={15} /> به آرزوهام اضافه کن</button>
      </div>

      <div className="card ccard">
        <h3 className="ip-head">🎁 آرزوهای من ({C.faNum(mine.length)})</h3>
        {mine.length === 0 ? <p className="tiny dim">هنوز چیزی ننوشتی.</p> : null}
        {mine.map((w) => (
          <div key={w.id} className="sp-wish">
            <div><b>{w.title}</b>{w.price ? <span className="sp-price">{w.price}</span> : null}{w.note ? <p className="tiny dim">{w.note}</p> : null}</div>
            <span className="sp-wish-btns">
              {w.link ? <a className="btn ghost sm" href={w.link} target="_blank" rel="noopener">لینک</a> : null}
              <button type="button" className="sp-del" onClick={() => { C.delWish(w.id); touch(); }}><Ic n="trash" s={14} /></button>
            </span>
          </div>
        ))}
      </div>

      <div className="card ccard">
        <h3 className="ip-head">💝 آرزوهای پارتنر ({C.faNum(theirs.length)})</h3>
        <p className="tiny dim">اگه چیزی رو برای سورپرایز انتخاب کردی بزن؛ اون نمی‌فهمه کدومه 🤫 (فقط روی گوشی تو ذخیره می‌شه)</p>
        {theirs.length === 0 ? <p className="tiny dim">پارتنرت هنوز آرزویی ننوشته.</p> : null}
        {theirs.map((w) => {
          const secret = secrets.includes(w.id);
          return (
            <div key={w.id} className={"sp-wish" + (secret ? " secret" : "")}>
              <div><b>{secret ? "🎁 " : ""}{w.title}</b>{w.price ? <span className="sp-price">{w.price}</span> : null}{w.note ? <p className="tiny dim">{w.note}</p> : null}</div>
              <span className="sp-wish-btns">
                {w.link ? <a className="btn ghost sm" href={w.link} target="_blank" rel="noopener">لینک</a> : null}
                <button type="button" className={"btn sm" + (secret ? " primary" : " ghost")} onClick={() => toggleSecret(w.id)}>
                  {secret ? "سورپرایزش می‌کنم 🎁" : "سورپرایزش کن"}
                </button>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================ باکت‌لیست ============================ */
function BucketView({ touch }) {
  const [title, setTitle] = useState("");
  const list = C.getBucket();
  const done = list.filter((b) => b.done).length;

  const add = (t) => {
    const v = (t !== undefined ? t : title).trim();
    if (!v) return;
    C.addBucket(v);
    setTitle("");
    touch();
  };

  return (
    <div>
      <div className="card ccard">
        <h3 className="ip-head"><Ic n="flag" s={16} /> باکت‌لیست ما</h3>
        {list.length ? (
          <div className="sp-progress">
            <div className="lvlbar"><i style={{ width: Math.round((done / list.length) * 100) + "%" }} /></div>
            <span className="tiny dim">{C.faNum(done)} از {C.faNum(list.length)} انجام شد 🎉</span>
          </div>
        ) : null}
        <div className="ansrow">
          <input className="ansinp" dir="rtl" maxLength={120} placeholder="یه آرزوی مشترک بنویس…" value={title}
            onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }} />
          <button className="btn primary" type="button" onClick={() => add()}><Ic n="plus" s={16} /></button>
        </div>
        <p className="tiny dim" style={{ marginTop: 8 }}>ایده نداری؟ بزن روشون:</p>
        <div className="anschips">
          {C.BUCKET_IDEAS.filter((i) => !list.some((b) => b.title === i)).slice(0, 6).map((i) => (
            <button key={i} type="button" className="anschip" onClick={() => add(i)}>+ {i}</button>
          ))}
        </div>
      </div>

      {list.map((b) => (
        <div key={b.id} className={"card ccard sp-bucket" + (b.done ? " done" : "")}>
          <label>
            <input type="checkbox" checked={!!b.done} onChange={() => {
              C.toggleBucket(b.id);
              if (!b.done) { try { addXp(10); confettiBurst({ count: 40 }); } catch {} }
              touch();
            }} />
            <span>{b.done ? "✅ " : "☐ "}{b.title}</span>
          </label>
          <button type="button" className="sp-del" onClick={() => { C.delBucket(b.id); touch(); }}><Ic n="trash" s={14} /></button>
        </div>
      ))}
      {list.length === 0 ? (
        <div className="card ccard center"><span className="sp-bigemoji">🪣</span><p className="dim small">لیست کارایی که قراره با هم انجام بدید.<br />از یه پیک‌نیک ساده تا سفر دور دنیا!</p></div>
      ) : null}
    </div>
  );
}

/* ============================ نامه‌ها ============================ */
function LettersView({ touch, myId }) {
  const prof = C.getCoupleProfile();
  const [to, setTo] = useState(prof.partner || "");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [openAt, setOpenAt] = useState("");
  const [reading, setReading] = useState(null);
  const [show, setShow] = useState(false);
  const [voice, setVoice] = useState("");
  const [vdurN, setVdurN] = useState(0);
  const [rec, setRec] = useState(null);
  const [recSec, setRecSec] = useState(0);
  const recTimer = useRef(null);
  const letters = C.getLetters();
  const startVoice = async () => {
    if (rec) return;
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === "undefined") return;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let mime = "";
      for (const cd of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]) { try { if (MediaRecorder.isTypeSupported(cd)) { mime = cd; break; } } catch {} }
      const mr = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), audioBitsPerSecond: 32000 });
      const chunks = [];
      const t0 = Date.now();
      mr.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
      mr.onstop = () => {
        try { clearInterval(recTimer.current); } catch {}
        try { stream.getTracks().forEach((t) => t.stop()); } catch {}
        setRec(null);
        const blob = new Blob(chunks, { type: (mime || "audio/webm").split(";")[0] });
        if (!blob.size || blob.size > 450000) return;
        const fr = new FileReader();
        fr.onload = () => { setVoice(String(fr.result || "")); setVdurN(Math.max(1, Math.round((Date.now() - t0) / 1000))); };
        fr.readAsDataURL(blob);
      };
      mr.start(500);
      setRec({ mr, stream }); setRecSec(0);
      recTimer.current = setInterval(() => {
        const s = Math.round((Date.now() - t0) / 1000);
        setRecSec(s);
        if (s >= 90) { try { mr.stop(); } catch {} }
      }, 500);
    } catch {}
  };

  const save = () => {
    if (!body.trim() && !voice) return;
    C.addLetter({ to: to.trim() || prof.partner, title: title.trim(), body: body.trim(), openAt, by: myId, voice, vdur: vdurN });
    try { addXp(5); } catch {}
    setTitle(""); setBody(""); setOpenAt(""); setVoice(""); setVdurN(0);
    setShow(false);
    touch();
  };

  if (reading) {
    const l = letters.find((x) => x.id === reading);
    if (!l) { setReading(null); return null; }
    return (
      <div className="card ccard sp-letter-paper">
        <button className="btn ghost sm" type="button" onClick={() => setReading(null)}>
          <Ic n="chev" s={14} style={{ transform: "rotate(90deg)" }} /> برگرد
        </button>
        <div className="sp-letter-head">💌</div>
        <h3>{l.title}</h3>
        {l.to ? <p className="tiny dim">برای {l.to} · {C.faJalali(l.ts)}</p> : null}
        {l.body ? <p className="sp-letter-body">{l.body}</p> : null}
        {l.voice ? <audio controls preload="metadata" src={l.voice} style={{ width: "100%", marginTop: 10 }} /> : null}
      </div>
    );
  }

  return (
    <div>
      <button className="btn primary big" type="button" onClick={() => setShow(!show)}>
        <Ic n="letter" s={16} /> نوشتن نامه
      </button>
      {show ? (
        <div className="card ccard">
          <p className="tiny dim">می‌تونی نامه رو «مهر» کنی تا یه تاریخ خاص باز بشه — مثلاً سالگردتون 🔒</p>
          <div className="sp-2col">
            <input className="inp" dir="rtl" maxLength={40} placeholder="برای کی؟" value={to} onChange={(e) => setTo(e.target.value)} />
            <input className="inp" dir="ltr" type="date" value={openAt} onChange={(e) => setOpenAt(e.target.value)} title="تاریخ باز شدن (اختیاری)" />
          </div>
          <input className="inp" dir="rtl" maxLength={80} placeholder="عنوان نامه" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className="inp" dir="rtl" rows={6} maxLength={5000} placeholder="می‌خواستم یه چیزی بهت بگم…" value={body} onChange={(e) => setBody(e.target.value)} style={{ minHeight: 130 }} />
          {openAt ? <p className="tiny dim">🔒 این نامه {C.faJalali(openAt)} باز می‌شه.</p> : null}
          <div className="ltr-voice">
            {voice ? (
              <>
                <audio controls preload="metadata" src={voice} style={{ maxWidth: 200, height: 34 }} />
                <button type="button" className="btn ghost sm danger" onClick={() => { setVoice(""); setVdurN(0); }}>✖</button>
              </>
            ) : rec ? (
              <>
                <span className="sp-recpill">🔴 {C.faNum(recSec)} ثانیه</span>
                <button type="button" className="btn primary sm" onClick={() => { try { rec.mr.stop(); } catch {} }}>✓ تمومه</button>
              </>
            ) : (
              <button type="button" className="btn ghost sm" onClick={startVoice}>🎙️ ضبط ویس برای نامه (تا ۹۰ ثانیه)</button>
            )}
          </div>
          <button className="btn primary big" type="button" onClick={save}>💌 {openAt ? "مهرش کن و بفرست" : "بفرست"}</button>
        </div>
      ) : null}

      {letters.length === 0 ? (
        <div className="card ccard center"><span className="sp-bigemoji">💌</span><p className="dim small">هنوز نامه‌ای نیست.<br />یه نامه‌ی عاشقانه بنویس؛ گاهی کلمات از حرف زدن قشنگ‌ترن.</p></div>
      ) : null}

      {letters.map((l) => {
        const sealed = C.isSealed(l);
        const left = sealed ? Math.ceil((l.openAt - Date.now()) / C.DAY_MS) : 0;
        const mine = C.isMine(l, myId);
        return (
          <div key={l.id} className="card ccard sp-letter">
            <span className="sp-letter-ic">{sealed ? "🔒" : "💌"}</span>
            <div style={{ flex: 1 }}>
              <b>{l.voice ? "🎙️ " : ""}{l.title}</b>
              <span className="tiny dim"> · {mine ? "فرستاده‌ی تو" : "از پارتنرت"} · {C.faJalali(l.ts)}</span>
              {sealed ? <p className="tiny">🔒 {C.faNum(left)} روز دیگه باز می‌شه ({C.faJalali(l.openAt)})</p> : null}
            </div>
            {!sealed ? (
              <button className="btn ghost sm" type="button" onClick={() => { C.openLetter(l.id); setReading(l.id); touch(); }}>بخون</button>
            ) : null}
            <button type="button" className="sp-del" onClick={() => { if (confirm("پاک بشه؟")) { C.delLetter(l.id); touch(); } }}><Ic n="trash" s={14} /></button>
          </div>
        );
      })}
    </div>
  );
}

/* ============================ سؤال روزانه ============================ */
function DailyView({ touch }) {
  const dq = C.dailyQuestion();
  const all = C.getDaily();
  const cur = all[dq.date] || {};
  const [ans, setAns] = useState("");
  const hist = Object.entries(all).filter(([d]) => d !== dq.date).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 30);

  const save = () => {
    if (!ans.trim()) return;
    C.answerDaily(dq.date, ans.trim(), "mine");
    try { addXp(3); } catch {}
    setAns("");
    touch();
  };

  return (
    <div>
      <div className="card ccard sp-daily">
        <span className="tiny dim">❓ سؤال {C.faJalali(dq.date)}</span>
        <h3>«{dq.q}»</h3>
        {!cur.mine ? (
          <div>
            <textarea className="inp" dir="rtl" rows={3} maxLength={500} placeholder="جواب تو چیه؟" value={ans} onChange={(e) => setAns(e.target.value)} style={{ minHeight: 76 }} />
            <button className="btn primary big" type="button" onClick={save}>ثبت جواب</button>
            <p className="tiny dim center">جواب پارتنرت رو وقتی می‌بینی که خودت جواب داده باشی 👀</p>
          </div>
        ) : (
          <div>
            <div className="sp-ans mine"><b>تو:</b> {cur.mine}</div>
            {cur.theirs ? (
              <div className="sp-ans theirs"><b>پارتنرت:</b> {cur.theirs}</div>
            ) : (
              <div className="sp-ans wait">منتظر جواب پارتنرتی… 👀<br /><span className="tiny">بهش بگو بیاد جواب بده!</span></div>
            )}
          </div>
        )}
      </div>

      {hist.length ? (
        <div className="card ccard">
          <h3 className="ip-head">📚 جوابای قبلی</h3>
          {hist.map(([d, a]) => (
            <div key={d} className="sp-hist">
              <b className="tiny">{a.q || ""}</b><span className="tiny dim"> · {C.faJalali(d)}</span>
              {a.mine ? <p className="tiny"><b>تو:</b> {a.mine}</p> : null}
              {a.mine && a.theirs ? <p className="tiny"><b>پارتنرت:</b> {a.theirs}</p> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ============================ تایم‌لاین ============================ */
function TimelineView() {
  const items = C.buildTimeline();
  if (!items.length) {
    return <div className="card ccard center"><span className="sp-bigemoji">🕐</span><p className="dim small">تایم‌لاین شما از اینجا شروع می‌شه.<br />خاطره ثبت کن، به باکت‌لیست خط بزن، روزها رو بشمر…</p></div>;
  }
  return (
    <div className="sp-timeline">
      <div className="sp-tl-head">❤️ قصه‌ی ما</div>
      {items.map((it) => (
        <div key={it.id} className="sp-tl-one">
          <span className="sp-tl-dot">{it.e}</span>
          <div className="sp-tl-card card">
            <b>{it.t}</b>
            <span className="tiny dim">{C.faJalali(it.ts)}</span>
            {it.d && it.kind !== "milestone" ? <p className="tiny">{String(it.d).slice(0, 180)}</p> : null}
            {it.photos && it.photos[0] ? <img src={it.photos[0]} alt="" /> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============================ آهنگ‌ها ============================ */
function SongsView({ touch }) {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [link, setLink] = useState("");
  const [note, setNote] = useState("");
  const songs = C.getSongs();

  const save = () => {
    if (!title.trim()) return;
    C.addSong({ title: title.trim(), artist: artist.trim(), link: link.trim(), note: note.trim() });
    setTitle(""); setArtist(""); setLink(""); setNote("");
    touch();
  };

  return (
    <div>
      <div className="card ccard">
        <h3 className="ip-head"><Ic n="music" s={16} /> آهنگ ما</h3>
        <p className="tiny dim">آهنگ مشترکتون، آهنگ اولین قرار، آهنگایی که با هم گوش می‌دید 🎧</p>
        <input className="inp" dir="rtl" maxLength={100} placeholder="اسم آهنگ" value={title} onChange={(e) => setTitle(e.target.value)} />
        <div className="sp-2col">
          <input className="inp" dir="rtl" maxLength={80} placeholder="خواننده" value={artist} onChange={(e) => setArtist(e.target.value)} />
          <input className="inp" dir="ltr" maxLength={300} placeholder="لینک (اختیاری)" value={link} onChange={(e) => setLink(e.target.value)} />
        </div>
        <input className="inp" dir="rtl" maxLength={200} placeholder="چرا این آهنگ؟ (مثلاً: آهنگ اولین قرارمون)" value={note} onChange={(e) => setNote(e.target.value)} />
        <button className="btn primary" type="button" onClick={save}><Ic n="plus" s={15} /> اضافه کن</button>
      </div>
      {songs.length === 0 ? (
        <div className="card ccard center"><span className="sp-bigemoji">🎵</span><p className="dim small">پلی‌لیست مشترکتون خالیه.<br />«آهنگ ما» کدومه؟</p></div>
      ) : null}
      {songs.map((s) => (
        <div key={s.id} className="card ccard sp-song">
          <span className="sp-song-ic">🎵</span>
          <div style={{ flex: 1 }}>
            <b>{s.title}</b>{s.artist ? <span className="tiny dim"> · {s.artist}</span> : null}
            {s.note ? <p className="tiny dim">{s.note}</p> : null}
          </div>
          {s.link ? <a className="btn ghost sm" href={s.link} target="_blank" rel="noopener">پخش</a> : null}
          <button type="button" className="sp-del" onClick={() => { C.delSong(s.id); touch(); }}><Ic n="trash" s={14} /></button>
        </div>
      ))}
    </div>
  );
}

/* ============================ تنظیمات فضای ما ============================ */
/* ============================ دانگ و هزینه مشترک 💸 (v8.2) ============================ */
function DongView({ touch, myId }) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [payer, setPayer] = useState("me");
  const [note, setNote] = useState("");
  const list = C.getExpenses();
  const bal = C.expenseBalance(myId);
  const prof = C.getCoupleProfile();
  const pName = prof.partnerNick || prof.partner || "پارتنرت";
  const total = list.filter((e) => e.kind !== "settle").reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const submit = () => {
    if (!Number(amount)) return;
    C.addExpense({ title: title.trim(), amount, by: myId || "", mine: payer === "me", note: note.trim() });
    setTitle(""); setAmount(""); setNote(""); setPayer("me"); touch();
  };
  const settle = () => {
    if (!bal) return;
    C.addExpense({ title: "تسویه", amount: Math.abs(bal), by: myId || "", mine: bal < 0, kind: "settle", note: "تسویه حساب 🤝" });
    touch();
  };
  return (
    <div className="sp-sec">
      <div className={"dong-bal" + (bal > 0 ? " plus" : bal < 0 ? " minus" : "")}>
        <div className="dong-bal-t">💸 مانده‌حساب (دانگ ۵۰/۵۰)</div>
        <div className="dong-bal-v">
          {bal === 0 ? "صافید! 🤝" : bal > 0 ? `${pName} ${C.faToman(bal)} بهت بدهکاره` : `تو ${C.faToman(-bal)} به ${pName} بدهکاری`}
        </div>
        {bal !== 0 && <button type="button" className="btn primary sm" onClick={settle}>تسویه شد ✓</button>}
      </div>
      <div className="sp-form">
        <input className="inp" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="چی خریدی؟ مثلاً: شام رستوران 🍽" maxLength={80} />
        <div className="row2">
          <input className="inp" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, "").slice(0, 10))} placeholder="مبلغ (تومان)" inputMode="numeric" />
          <div className="seg">
            <button type="button" className={payer === "me" ? "on" : ""} onClick={() => setPayer("me")}>من دادم</button>
            <button type="button" className={payer === "peer" ? "on" : ""} onClick={() => setPayer("peer")}>{pName} داد</button>
          </div>
        </div>
        <input className="inp" value={note} onChange={(e) => setNote(e.target.value)} placeholder="توضیح (اختیاری)" maxLength={200} />
        <button type="button" className="btn primary" onClick={submit}>➕ ثبت خرج</button>
        <div className="muted small">جمع خرج‌ها: {C.faToman(total)} • {C.faNum(list.length)} قلم</div>
      </div>
      <div className="sp-list">
        {list.length === 0 && <div className="sp-empty">هنوز خرجی ثبت نشده — اولین دانگ رو ثبت کن 😄</div>}
        {list.map((e) => {
          const mine = C.expenseIsMine(e, myId);
          return (
            <div className="sp-card dong-it" key={e.id}>
              <div className="dong-it-t">{e.kind === "settle" ? "🤝" : "🧾"} {e.title}</div>
              <div className="dong-it-a">{C.faToman(e.amount)}</div>
              <div className="muted small">{mine ? "پرداخت: تو" : `پرداخت: ${pName}`} • {e.date || ""}{e.note ? ` • ${e.note}` : ""}</div>
              <button type="button" className="iconbtn danger" onClick={() => { C.delExpense(e.id); touch(); }} title="حذف"><Ic n="trash" s={15} /></button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================ حال مشترک روزانه 😊 (v8.2) ============================ */
function MoodView({ touch }) {
  const [note, setNote] = useState("");
  const today = C.isoDay(new Date());
  const log = C.getMoodLog();
  const cur = log[today] || {};
  const streak = C.moodStreak();
  const prof = C.getCoupleProfile();
  const pName = prof.partnerNick || prof.partner || "پارتنرت";
  const WD = ["ش", "۱ش", "۲ش", "۳ش", "۴ش", "۵ش", "ج"];
  const days = [];
  for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(d); }
  const pick = (v) => { C.answerMood(today, v, note); setNote(""); touch(); };
  return (
    <div className="sp-sec">
      <div className="mood-today card">
        <div className="mood-q">امروز حالت چطوره؟ {streak >= 2 && <span className="mood-streak">🔥 {C.faNum(streak)} روز</span>}</div>
        <div className="mood-btns">
          {C.MOOD5.map((m) => (
            <button key={m.v} type="button" className={"mood-b" + (cur.mineV === m.v ? " on" : "")} onClick={() => pick(m.v)} title={m.t}>
              <span className="mood-e">{m.e}</span><span className="mood-t">{m.t}</span>
            </button>
          ))}
        </div>
        <input className="inp" value={note} onChange={(e) => setNote(e.target.value)} placeholder="یه جمله درباره‌ی امروزت… (اختیاری)" maxLength={200} />
        {(cur.mineTs || cur.theirsTs) ? (
          <div className="mood-pair">
            {!!cur.mineTs && <div className="mood-p">تو: {C.moodEmoji(cur.mineV)}{cur.mineNote ? ` — ${cur.mineNote}` : ""}</div>}
            {cur.theirsTs ? <div className="mood-p">{pName}: {C.moodEmoji(cur.theirsV)}{cur.theirsNote ? ` — ${cur.theirsNote}` : ""}</div> : <div className="muted small">{pName} هنوز حالش رو ثبت نکرده ⏳</div>}
          </div>
        ) : null}
      </div>
      <div className="mood-week">
        {days.map((d) => {
          const k = C.isoDay(d);
          const e = log[k] || {};
          return (
            <div className={"mood-day" + (k === today ? " t" : "")} key={k} title={k}>
              <div className="muted tiny">{WD[(d.getDay() + 1) % 7]}</div>
              <div className="mood-de">{e.mineV ? C.moodEmoji(e.mineV) : "–"}</div>
              <div className="mood-de sm">{e.theirsV ? C.moodEmoji(e.theirsV) : "·"}</div>
            </div>
          );
        })}
      </div>
      <div className="muted small">ردیف اول: تو • ردیف دوم: {pName}</div>
    </div>
  );
}

/* ---------- کارت این یا اون ⚖️ ---------- */
function YNCard({ g, me, pName, touch, mine }) {
  const res = C.ynResult(g, me);
  const pick = (p) => { C.answerYN(g.id, p, me); touch(); };
  if (res.mine === null) {
    return (
      <div className="sp-card yn-card" key={g.id}>
        <div><b>⚖️ {g.title || "این یا اون؟"}</b></div>
        <div className="muted small">از طرف {mine ? "تو" : pName} — یکیش رو انتخاب کن 👀</div>
        <div className="yn-vs">
          <button type="button" className="btn ghost yn-opt" onClick={() => pick(0)}>{g.a}</button>
          <span className="yn-or">یا</span>
          <button type="button" className="btn ghost yn-opt" onClick={() => pick(1)}>{g.b}</button>
        </div>
      </div>
    );
  }
  return (
    <div className="sp-card yn-card" key={g.id}>
      <div><b>⚖️ {g.title || "این یا اون؟"}</b></div>
      <div className="yn-picks">
        <span className={res.mine === 0 ? "yn-on" : ""}>🅰 {g.a}</span>
        <span className={res.mine === 1 ? "yn-on" : ""}>🅱 {g.b}</span>
      </div>
      <div className="muted small">
        تو: {res.mine === 0 ? g.a : g.b}
        {res.theirs === null ? " • طرف هنوز انتخاب نکرده ⏳" : res.match ? " • هم‌دلید! 💞" : ` • ${pName}: ${res.theirs === 0 ? g.a : g.b} 😄`}
      </div>
      <button type="button" className="btn ghost sm" onClick={() => pick(res.mine === 0 ? 1 : 0)}>عوضش کن 🔄</button>
    </div>
  );
}

/* ============================ بازی دونفره 🎮 (v8.2) ============================ */
function GameView({ touch, myId }) {
  const [tab, setTab] = useState("play");
  const me = myId || "me";
  const games = C.getGames();
  const mine = games.filter((g) => C.isMine(g, myId));
  const theirs = games.filter((g) => !C.isMine(g, myId));
  const fresh = theirs.filter((g) => !(g.answers || {})[me]);
  const [playing, setPlaying] = useState(null);
  const [pi, setPi] = useState(0);
  const [picks, setPicks] = useState([]);
  const [done, setDone] = useState(null);
  const start = (g) => { setPlaying(g); setPi(0); setPicks([]); setDone(null); };
  const answer = (oi) => {
    const np = picks.slice(); np[pi] = oi; setPicks(np);
    if (pi + 1 >= ((playing && playing.qs) || []).length) {
      C.answerQuiz(playing.id, np, me);
      const g2 = C.getGames().find((x) => x.id === playing.id);
      const r = C.quizScore(g2, me);
      setDone(r);
      if (r && r.total && r.score / r.total >= 0.6) { try { window.confetti && window.confetti({ particleCount: 120, spread: 75 }); } catch {} }
      touch();
    } else setPi(pi + 1);
  };
  const [title, setTitle] = useState("");
  const [qs, setQs] = useState([]);
  const [q, setQ] = useState("");
  const [opts, setOpts] = useState(["", "", "", "", ""]);
  const [ai, setAi] = useState(0);
  const [mkType, setMkType] = useState("quiz");
  const [ynA, setYnA] = useState("");
  const [ynB, setYnB] = useState("");
  const setOpt = (i, v) => { const n = opts.slice(); n[i] = v; setOpts(n); };
  const addQ = () => {
    const clean = opts.map((o) => o.trim());
    if (!q.trim() || clean.filter(Boolean).length < 2 || qs.length >= 8) return;
    setQs([...qs, { q: q.trim(), opts: clean, a: ai }]);
    setQ(""); setOpts(["", "", "", ""]); setAi(0);
  };
  const save = () => {
    if (!qs.length) return;
    C.addQuiz({ title: title.trim(), qs, by: myId || "" });
    setTitle(""); setQs([]); setTab("results"); touch();
  };
  const saveYN = () => {
    if (!ynA.trim() || !ynB.trim()) return;
    C.addYN({ a: ynA.trim(), b: ynB.trim(), by: myId || "" });
    setYnA(""); setYnB(""); setTab("results"); touch();
  };
  const prof = C.getCoupleProfile();
  const pName = prof.partnerNick || prof.partner || "پارتنرت";
  return (
    <div className="sp-sec">
      <div className="seg game-tabs">
        <button type="button" className={tab === "play" ? "on" : ""} onClick={() => setTab("play")}>🎯 بازی کن{fresh.length ? ` (${C.faNum(fresh.length)})` : ""}</button>
        <button type="button" className={tab === "make" ? "on" : ""} onClick={() => setTab("make")}>🛠 بساز</button>
        <button type="button" className={tab === "results" ? "on" : ""} onClick={() => setTab("results")}>🏆 نتایج</button>
      </div>

      {playing && !done && (
        <div className="card game-play">
          <button type="button" className="iconbtn" onClick={() => setPlaying(null)} title="انصراف"><Ic n="x" s={15} /></button>
          <div className="muted small">{playing.title} • سؤال {C.faNum(pi + 1)} از {C.faNum((playing.qs || []).length)}</div>
          <div className="game-bar"><i style={{ width: Math.round(((pi + 1) / Math.max(1, (playing.qs || []).length)) * 100) + "%" }} /></div>
          <h4>{((playing.qs || [])[pi] || {}).q}</h4>
          <div className="game-opts">
            {(((playing.qs || [])[pi] || {}).opts || []).map((o, i) => (
              <button key={i} type="button" className="btn ghost game-opt" onClick={() => answer(i)}>{o || "—"}</button>
            ))}
          </div>
        </div>
      )}

      {playing && done && (
        <div className="card game-done">
          <div className="game-score">{done.score >= done.total ? "🏆" : done.score / Math.max(1, done.total) >= 0.5 ? "👏" : "💪"}</div>
          <h3>{done.score} از {done.total} درست!</h3>
          <p className="muted small">{done.score >= done.total ? `${pName} رو مثل کف دستت می‌شناسی! 💞` : done.score / Math.max(1, done.total) >= 0.5 ? "خوبه! ولی هنوز جا برای شناخت بیشتر هست 😉" : "وقتشه بیشتر حرف بزنید — برو سراغ سؤال امروز! ❓"}</p>
          <button type="button" className="btn primary" onClick={() => { setPlaying(null); setDone(null); setTab("results"); touch(); }}>دیدن نتایج</button>
        </div>
      )}

      {!playing && tab === "play" && (
        <div className="sp-list">
          {theirs.length === 0 && <div className="sp-empty">هنوز بازی‌ای برات ساخته نشده — خودت یکی بساز و {pName} رو به چالش بکش! 😏</div>}
          {theirs.map((g) => {
            if (g.kind === "yn") return <YNCard g={g} me={me} pName={pName} touch={touch} />;
            const r = C.quizScore(g, me);
            return (
              <div className="sp-card" key={g.id}>
                <div><b>🎮 {g.title}</b></div>
                <div className="muted small">{C.faNum((g.qs || []).length)} سؤال • از طرف {pName}{r ? ` • امتیازت: ${C.faNum(r.score)} از ${C.faNum(r.total)}` : ""}</div>
                <button type="button" className="btn primary sm" onClick={() => start(g)}>{r ? "🔁 دوباره بازی کن" : "▶ شروع بازی"}</button>
              </div>
            );
          })}
        </div>
      )}

      {!playing && tab === "make" && (
        <div className="sp-form">
          <div className="seg">
            <button type="button" className={mkType === "quiz" ? "on" : ""} onClick={() => setMkType("quiz")}>🎮 کوییز</button>
            <button type="button" className={mkType === "yn" ? "on" : ""} onClick={() => setMkType("yn")}>⚖️ این یا اون</button>
          </div>
          {mkType === "yn" ? (
            <>
              <input className="inp" value={ynA} onChange={(e) => setYnA(e.target.value)} placeholder="گزینه اول، مثلاً: کوه 🏔" maxLength={80} />
              <input className="inp" value={ynB} onChange={(e) => setYnB(e.target.value)} placeholder="گزینه دوم، مثلاً: دریا 🌊" maxLength={80} />
              <button type="button" className="btn primary" onClick={saveYN} disabled={!ynA.trim() || !ynB.trim()}>🚀 انتشار برای {pName}</button>
            </>
          ) : (
          <>
          <input className="inp" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="اسم بازی، مثلاً: کی منو بهتر می‌شناسه؟ 😏" maxLength={80} />
          <div className="card game-mk">
            <div className="muted small">سؤال {C.faNum(qs.length + 1)} از ۸ (حداقل ۲ گزینه + جواب درست)</div>
            <input className="inp" value={q} onChange={(e) => setQ(e.target.value)} placeholder="سؤالت رو بنویس…" maxLength={200} />
            {opts.map((o, i) => (
              <div className="game-optrow" key={i}>
                <button type="button" className={"game-ans" + (ai === i ? " on" : "")} onClick={() => setAi(i)} title="جواب درست">✓</button>
                <input className="inp" value={o} onChange={(e) => setOpt(i, e.target.value)} placeholder={`گزینه ${C.faNum(i + 1)}`} maxLength={80} />
              </div>
            ))}
            <button type="button" className="btn ghost" onClick={addQ}>➕ افزودن سؤال</button>
          </div>
          {qs.map((x, i) => (
            <div className="sp-card game-qq" key={i}>
              <div><b>{C.faNum(i + 1)}. {x.q}</b></div>
              <div className="muted small">جواب: {x.opts[x.a] || "—"}</div>
              <button type="button" className="iconbtn danger" onClick={() => setQs(qs.filter((_, j) => j !== i))}><Ic n="trash" s={14} /></button>
            </div>
          ))}
          <button type="button" className="btn primary" onClick={save} disabled={!qs.length}>🚀 انتشار بازی برای {pName}</button>
          </>
          )}
        </div>
      )}

      {!playing && tab === "results" && (
        <div className="sp-list">
          {games.length === 0 && <div className="sp-empty">هنوز بازی‌ای نیست — اولین رو بساز! 🛠</div>}
          {mine.map((g) => {
            if (g.kind === "yn") return <YNCard key={g.id} g={g} me={me} pName={pName} touch={touch} mine />;
            const others = Object.keys(g.answers || {}).filter((k) => k !== me);
            return (
              <div className="sp-card" key={g.id}>
                <div><b>🛠 {g.title}</b> <span className="muted tiny">(ساخته‌ی تو)</span></div>
                {others.length === 0 && <div className="muted small">{pName} هنوز بازی نکرده ⏳</div>}
                {others.map((k) => {
                  const r = C.quizScore(g, k);
                  return <div key={k} className="game-res">{pName}: {r ? `${C.faNum(r.score)} از ${C.faNum(r.total)} ${r.score >= r.total ? "🏆" : r.score / Math.max(1, r.total) >= 0.5 ? "👏" : "💪"}` : "…"}</div>;
                })}
                <button type="button" className="iconbtn danger" onClick={() => { C.delGame(g.id); touch(); }} title="حذف"><Ic n="trash" s={15} /></button>
              </div>
            );
          })}
          {theirs.map((g) => {
            if (g.kind === "yn") return <YNCard key={g.id} g={g} me={me} pName={pName} touch={touch} />;
            const r = C.quizScore(g, me);
            return (
              <div className="sp-card" key={g.id}>
                <div><b>🎮 {g.title}</b> <span className="muted tiny">(از طرف {pName})</span></div>
                <div className="muted small">{r ? `امتیازت: ${C.faNum(r.score)} از ${C.faNum(r.total)}` : "هنوز بازی نکردی!"}</div>
                {!r && <button type="button" className="btn primary sm" onClick={() => { setTab("play"); start(g); }}>▶ بازی کن</button>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ============================ آمار رابطه 📊 (v9.1) ============================ */
function StatsView({ myId }) {
  const prof = C.getCoupleProfile();
  const meN = prof.meNick || prof.me || "من";
  const pN = prof.partnerNick || prof.partner || "پارتنر";
  const days = prof.since ? Math.max(0, Math.floor((Date.now() - new Date(prof.since + "T12:00:00")) / 864e5)) : 0;
  const mems = C.getMemories();
  const mw = C.statsMoodWeek();
  const ew = C.statsExpenseWeek();
  const maxE = Math.max(1, ...ew.map((x) => x.v));
  const tags = C.statsTopTags(6);
  const places = C.statsTopPlaces(6);
  const mExp = C.statsMonthExpense();
  const dares = C.getDares();
  const me = myId || "me";
  const myDares = dares.filter((d) => (d.done || {})[me]).length;
  const bothDares = dares.filter((d) => (d.done || {})[me] && Object.keys(d.done || {}).some((k) => k !== me)).length;
  const letters = C.getLetters().length;
  const WD = ["ش", "۱ش", "۲ش", "۳ش", "۴ش", "۵ش", "ج"];
  const sc = C.coupleScore();
  const earned = C.earnedMedals(myId);
  const [newMedals, setNewMedals] = useState([]);
  useEffect(() => {
    try {
      const old = JSON.parse(localStorage.getItem("mk:medals") || "[]");
      const fresh = earned.filter((id) => !old.includes(id));
      if (fresh.length && old.length) {
        setNewMedals(fresh);
        try { confettiBurst({ count: 90 }); buzz(30); } catch {}
      }
      localStorage.setItem("mk:medals", JSON.stringify(earned));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dlReport = async () => {
    try {
      const cv = document.createElement("canvas");
      cv.width = 720; cv.height = 900;
      const x = cv.getContext("2d");
      const g = x.createLinearGradient(0, 0, 720, 900);
      g.addColorStop(0, "#3b1d4e"); g.addColorStop(1, "#8b1c4b");
      x.fillStyle = g; x.fillRect(0, 0, 720, 900);
      x.fillStyle = "#fff"; x.textAlign = "center";
      x.font = "bold 90px Tahoma"; x.fillText(prof.emoji || "💑", 360, 150);
      x.font = "bold 52px Tahoma,Vazirmatn"; x.fillText("گزارش ماه ما", 360, 230);
      x.font = "40px Tahoma,Vazirmatn"; x.fillStyle = "#ffd3e3";
      x.fillText(meN + " و " + pN, 360, 290);
      x.fillStyle = "#fff";
      const rows = [
        ["💞 روز با هم بودن", C.faNum(days)],
        ["📸 خاطره ثبت‌شده", C.faNum(mems.length)],
        ["🎯 چالش انجام‌شده (من)", C.faNum(myDares)],
        ["💪 چالش دو نفره", C.faNum(bothDares)],
        ["🔥 استریک حال", C.faNum(C.moodStreak()) + " روز"],
        ["💸 خرج این ماه", C.faToman(mExp)],
      ];
      x.font = "34px Tahoma,Vazirmatn";
      rows.forEach((r, i) => {
        const y = 400 + i * 72;
        x.fillStyle = "#ffffff22"; x.fillRect(80, y - 44, 560, 58);
        x.fillStyle = "#ffd3e3"; x.textAlign = "right"; x.fillText(r[0], 600, y);
        x.fillStyle = "#fff"; x.textAlign = "left"; x.fillText(String(r[1]), 120, y);
      });
      x.textAlign = "center"; x.fillStyle = "#ffffffaa"; x.font = "28px Tahoma";
      x.fillText("ساخته شده با باهم 💑", 360, 850);
      const blob = await new Promise((res) => cv.toBlob(res, "image/png"));
      if (!blob) return;
      const file = new File([blob], "baham-report.png", { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "گزارش ماه ما 💑" });
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "baham-report.png"; a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      }
    } catch {}
  };

  return (
    <div className="sp-sec">
      <div className="score-hero card">
        <div className="score-e">{sc.level.e}</div>
        <div className="score-t"><b>زوج {sc.level.t}</b><span className="muted small">{C.faNum(sc.score)} امتیاز زوج</span></div>
        <div className="game-bar score-bar"><i style={{ width: (sc.next ? Math.round((sc.score - sc.level.min) / Math.max(1, sc.next.min - sc.level.min) * 100) : 100) + "%" }} /></div>
        {sc.next ? <div className="tiny dim">تا «{sc.next.t} {sc.next.e}»: {C.faNum(sc.next.min - sc.score)} امتیاز مونده</div> : <div className="tiny dim">به سقف رسیدید! 🏆</div>}
      </div>
      {newMedals.length ? (
        <div className="medal-fresh">🎉 مدال تازه: {newMedals.map((id) => { const m = C.MEDALS.find((x) => x.id === id); return m ? m.e + " " + m.t : id; }).join("، ")}</div>
      ) : null}
      <div className="card stat-card">
        <h4>🏅 مدال‌ها ({C.faNum(earned.length)} از {C.faNum(C.MEDALS.length)})</h4>
        <div className="medal-grid">
          {C.MEDALS.map((m) => (
            <div key={m.id} className={"medal" + (earned.includes(m.id) ? " on" : "")} title={m.d}>
              <span className="medal-e">{m.e}</span><span className="medal-t">{m.t}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="stat-grid">
        <div className="stat-cell"><b>{C.faNum(days)}</b><span>💞 روز با هم</span></div>
        <div className="stat-cell"><b>{C.faNum(mems.length)}</b><span>📸 خاطره</span></div>
        <div className="stat-cell"><b>{C.faNum(bothDares)}</b><span>🎯 چالش دو نفره</span></div>
        <div className="stat-cell"><b>{C.faNum(letters)}</b><span>💌 نامه</span></div>
      </div>

      <div className="card stat-card">
        <h4>😊 حال هفته</h4>
        <div className="stat-bars">
          {mw.map((d, i) => (
            <div className="stat-bar" key={i} title={C.isoDay(d.day)}>
              <div className="stat-b2">
                <i style={{ height: (d.mine / 5 * 100) + "%" }} className="me" />
                <i style={{ height: (d.theirs / 5 * 100) + "%" }} className="peer" />
              </div>
              <span className="tiny dim">{WD[(d.day.getDay() + 1) % 7]}</span>
            </div>
          ))}
        </div>
        <div className="tiny dim">🟣 تو · 🩷 {pN} · استریک تو: 🔥 {C.faNum(C.moodStreak())} روز</div>
      </div>

      <div className="card stat-card">
        <h4>💸 خرج هفته <span className="tiny dim">(این ماه: {C.faToman(mExp)})</span></h4>
        <div className="stat-bars">
          {ew.map((d, i) => (
            <div className="stat-bar" key={d.k} title={d.k + ": " + C.faToman(d.v)}>
              <div className="stat-b1"><i style={{ height: Math.max(2, d.v / maxE * 100) + "%" }} /></div>
              <span className="tiny dim">{WD[(new Date(d.k + "T12:00:00").getDay() + 1) % 7]}</span>
            </div>
          ))}
        </div>
      </div>

      {(tags.length || places.length) ? (
        <div className="card stat-card">
          <h4>🏷️ حال‌وهوای خاطرات</h4>
          {tags.length ? <div className="sp-tags">{tags.map(([t, n]) => <span key={t}>#{t} ×{C.faNum(n)}</span>)}</div> : null}
          {places.length ? <div className="muted small" style={{ marginTop: 6 }}>📍 {places.map(([p, n]) => `${p} (${C.faNum(n)})`).join(" · ")}</div> : null}
        </div>
      ) : null}

      <div className="card stat-card center">
        <h4>🖼️ کارت گزارش ماه</h4>
        <p className="muted small">یه عکس قشنگ از آمار رابطه‌تون بساز و بفرست براش 💞</p>
        <button type="button" className="btn primary" onClick={dlReport}>⬇️ ساخت و اشتراک عکس</button>
      </div>
    </div>
  );
}

/* ============================ قانون‌های ما 📜 (v10) ============================ */
const LAW_IDEAS = ["هر شب قبل خواب «دوستت دارم» بگیم 💕", "دعوا رو بیشتر از یه روز کش ندیم 🤝", "گوشی سر میز غذا ممنوع 📵", "هر ماه حداقل یه قرار دونفره بریم 🌙", "همیشه طرف هم باشیم، حتی وقتی اشتباه می‌کنیم 🛡️"];
function LawsView({ touch, myId }) {
  const me = myId || "me";
  const [text, setText] = useState("");
  const laws = C.getLaws();
  const prof = C.getCoupleProfile();
  const pName = prof.partnerNick || prof.partner || "پارتنرت";
  const mk = () => { if (!text.trim()) return; C.addLaw(text.trim()); setText(""); touch(); };
  const sign = (w) => {
    const before = Object.keys(w.signs || {}).length;
    const mine = !!((w.signs || {})[me]);
    C.signLaw(w.id, myId);
    if (before < 2 && before + (mine ? -1 : 1) >= 2) { try { confettiBurst({ count: 90 }); buzz(30); } catch {} }
    touch();
  };
  const ok = laws.filter((w) => Object.keys(w.signs || {}).length >= 2).length;
  return (
    <div className="sp-sec">
      <div className="card center">
        <div className="trip-mk-t">📜 منشور ما</div>
        <div className="tiny dim">{C.faNum(laws.length)} قانون · {C.faNum(ok)} تصویب‌شده ✅</div>
        <div className="trip-add">
          <input className="inp" value={text} onChange={(e) => setText(e.target.value)} placeholder="قانون تازه؟ (مثلاً: همیشه بغل وقت خواب 🫂)" maxLength={200} onKeyDown={(e) => { if (e.key === "Enter") mk(); }} />
          <button type="button" className="btn primary sm" onClick={mk}>➕</button>
        </div>
        {laws.length === 0 ? <button type="button" className="btn ghost sm" onClick={() => { LAW_IDEAS.forEach((t) => C.addLaw(t)); touch(); }}>✨ ۵ قانون پیشنهادی</button> : null}
      </div>
      <div className="sp-list">
        {laws.map((w) => {
          const n = Object.keys(w.signs || {}).length;
          const mine = !!((w.signs || {})[me]);
          const all = n >= 2;
          return (
            <div className={"sp-card law-it" + (all ? " ok" : "")} key={w.id}>
              <div><b>{all ? "✅" : "📜"} {w.text}</b></div>
              <div className="tiny dim">{mine ? "✨ تو امضا کردی" : "تو امضا نکردی"}{Object.keys(w.signs || {}).some((k) => k !== me) ? ` · 💕 ${pName} امضا کرده` : ` · ⏳ ${pName} هنوز نه`}</div>
              <div className="mov-votes">
                <button type="button" className={"btn sm " + (mine ? "ghost" : "primary")} onClick={() => sign(w)}>{mine ? "پس گرفتن امضا" : "✍️ امضا می‌کنم"}</button>
                <button type="button" className="iconbtn danger" onClick={() => { if (confirm("این قانون لغو بشه؟")) { C.delLaw(w.id); touch(); } }} title="حذف"><Ic n="trash" s={13} /></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================ سال ما 🎊 (v10) ============================ */
function YearView() {
  const Y = new Date().getFullYear();
  const YS = String(Y);
  const inY = (ts) => { try { return new Date(ts || 0).getFullYear() === Y; } catch { return false; } };
  const mems = C.getMemories().filter((m) => inY(m.ts));
  const photos = mems.reduce((s, m) => s + ((m.photos || []).length), 0);
  const trips = C.getTrips().filter((t) => String(t.date || "").startsWith(YS));
  const movs = C.getMovies().filter((m) => m.watched).length;
  const letters = C.getLetters().filter((l) => inY(l.ts));
  const exps = C.getExpenses().filter((e) => e.kind !== "settle" && inY(e.ts));
  const expSum = exps.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const mlog = C.getMoodLog() || {};
  const mv = [];
  for (const [day, e] of Object.entries(mlog)) {
    if (!String(day).startsWith(YS) || !e) continue;
    if (e.mineV) mv.push(e.mineV);
    if (e.theirsV) mv.push(e.theirsV);
  }
  const freq = {};
  mv.forEach((v) => { freq[v] = (freq[v] || 0) + 1; });
  const topV = Object.keys(freq).sort((a, b) => freq[b] - freq[a])[0];
  const places = {};
  mems.forEach((m) => { if (m.place) places[m.place] = (places[m.place] || 0) + 1; });
  const topP = Object.keys(places).sort((a, b) => places[b] - places[a])[0];
  const qdays = C.getQuests().reduce((s, q) => s + Object.keys(q.done || {}).filter((d) => Object.keys((q.done || {})[d] || {}).length >= 2).length, 0);
  const total = mems.length + letters.length + trips.length * 3 + movs * 2 + qdays;
  const title = total >= 60 ? "سال افسانه‌ای 🏆" : total >= 30 ? "سال پرماجرا 🔥" : total >= 10 ? "سال خوب 💕" : "سال آروم 🌱";
  useEffect(() => { try { confettiBurst({ count: 80 }); } catch {} }, []);
  const copy = () => {
    const t = `🎊 سال ${C.faNum(Y)} ما: ${C.faNum(mems.length)} خاطره 📸، ${C.faNum(letters.length)} نامه 💌، ${C.faNum(trips.length)} سفر 🧳، ${C.faNum(movs)} فیلم 🎬 — ${title} (باهم 💑)`;
    try { navigator.clipboard && navigator.clipboard.writeText(t); } catch {}
  };
  const cards = [
    { e: "📸", n: mems.length, t: "خاطره" },
    { e: "📷", n: photos, t: "عکس" },
    { e: "💌", n: letters.length, t: "نامه" },
    { e: "🧳", n: trips.length, t: "سفر" },
    { e: "🎬", n: movs, t: "فیلم دیده‌شده" },
    { e: "🏅", n: qdays, t: "روز چالش کامل" },
    { e: "💸", n: expSum, t: "تومان خرج مشترک", money: true },
    { e: topV ? C.moodEmoji(Number(topV)) : "😊", n: mv.length, t: "حال ثبت‌شده" },
  ];
  return (
    <div className="sp-sec">
      <div className="card center year-hero">
        <div className="year-y">🎊 {C.faNum(Y)}</div>
        <div className="year-t">{title}</div>
        <div className="tiny">سال ما، به روایت عددها ✨</div>
      </div>
      <div className="year-grid">
        {cards.map((c, i) => (
          <div className="year-c" key={i}>
            <div className="year-e">{c.e}</div>
            <div className="year-n">{C.faNum(c.n)}</div>
            <div className="tiny dim">{c.t}</div>
          </div>
        ))}
      </div>
      {topP ? <div className="sp-card center">📍 پاتوق امسال: <b>{topP}</b> ({C.faNum(places[topP])} بار!)</div> : null}
      <button type="button" className="btn primary" onClick={copy} style={{ width: "100%" }}>📋 کپی خلاصه‌ی سال</button>
    </div>
  );
}

/* ============================ تالار افتخار 🏆 (v10) ============================ */
function HallView({ myId }) {
  const me = myId || "me";
  const earned = C.earnedMedals(myId);
  const mems = C.getMemories().length;
  const bothD = C.getDares().filter((d) => Object.keys(d.done || {}).length >= 2).length;
  const myG = C.getGames().filter((g) => (g.answers || {})[me]).length;
  const yn = C.getGames().some((g) => g.kind === "yn" && C.ynResult(g, me).match);
  const letters = C.getLetters().length;
  const exps = C.getExpenses().filter((e) => e.kind !== "settle").length;
  const streak = C.moodStreak();
  const prof = C.getCoupleProfile();
  const bd = prof.since ? C.breakdownDays(prof.since) : null;
  const days = bd ? bd.total : 0;
  const sc = C.coupleScore();
  const prog = {
    "first-memory": [Math.min(mems, 1), 1], mem10: [mems, 10], mem50: [mems, 50],
    "dare-both": [Math.min(bothD, 1), 1], dare10: [bothD, 10], mood7: [streak, 7],
    game5: [myG, 5], "yn-match": [yn ? 1 : 0, 1], letter5: [letters, 5],
    days100: [days, 100], days365: [days, 365], dong10: [exps, 10],
  };
  const recs = [
    { e: sc.level.e, t: `${C.faNum(sc.score)} امتیاز · ${sc.level.t}` },
    { e: "📅", t: `${C.faNum(days)} روز با هم` },
    { e: "🔥", t: `استریک حال: ${C.faNum(streak)} روز` },
    { e: "🎯", t: `استریک چالش: ${C.faNum(C.dareStreak(myId))} روز` },
  ];
  return (
    <div className="sp-sec">
      <div className="card center year-hero">
        <div className="year-y">🏆 تالار افتخار</div>
        <div className="tiny">{C.faNum(earned.length)} از {C.faNum(C.MEDALS.length)} مدال گرفته شده!</div>
      </div>
      <div className="year-grid">
        {recs.map((r, i) => (
          <div className="year-c" key={i}>
            <div className="year-e">{r.e}</div>
            <div className="tiny"><b>{r.t}</b></div>
          </div>
        ))}
      </div>
      <div className="hall-wall">
        {C.MEDALS.map((m) => {
          const has = earned.includes(m.id);
          const [n, g] = prog[m.id] || [0, 1];
          return (
            <div className={"hall-m" + (has ? " has" : "")} key={m.id}>
              <div className="hall-e">{has ? m.e : "🔒"}</div>
              <div className="tiny"><b>{m.t}</b></div>
              <div className="tiny dim">{has ? m.d + " ✅" : `${m.d} · ${C.faNum(Math.min(n, g))}/${C.faNum(g)}`}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================ چالش عکس هفته 📸 (v9.9) ============================ */
function ShotsView({ touch, myId }) {
  const me = myId || "me";
  const wk = C.weekKey();
  const fileRef = useRef(null);
  useEffect(() => { C.ensureShot(); touch(); }, []);
  const shots = C.getShots();
  const cur = shots.find((s) => s.week === wk) || { week: wk, theme: C.shotTheme(wk), entries: {}, votes: {} };
  const prof = C.getCoupleProfile();
  const pName = prof.partnerNick || prof.partner || "پارتنرت";
  const onFile = async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    try {
      const p = await C.compressImage(f);
      if (!p) return;
      C.addShotEntry(p, myId); touch();
    } catch {}
  };
  const entries = cur.entries || {};
  const uids = Object.keys(entries);
  const winCount = (u) => Object.values(cur.votes || {}).filter((v) => v === u).length;
  const winner = uids.length >= 2 ? uids.slice().sort((a, b) => winCount(b) - winCount(a))[0] : null;
  const card = (u) => {
    const en = entries[u];
    if (!en) return null;
    const isMe = u === me;
    const voted = (cur.votes || {})[me] === u;
    return (
      <div className={"shot-card" + (winner === u && winCount(u) > 0 ? " win" : "")} key={u}>
        <img src={en.photo} alt="" className="shot-img" />
        <div className="tiny">{isMe ? "✨ تو" : "💕 " + pName} · {C.faNum(winCount(u))} رأی {winner === u && winCount(u) > 0 ? "🏆" : ""}</div>
        {!isMe ? <button type="button" className={"mov-v" + (voted ? " on" : "")} onClick={() => { C.voteShot(u, myId); touch(); }}>{voted ? "✓ رأی دادی" : "🗳️ رأی به این"}</button> : null}
      </div>
    );
  };
  return (
    <div className="sp-sec">
      <div className="card center">
        <div className="trip-mk-t">📸 سوژه‌ی این هفته</div>
        <div className="shot-theme">{cur.theme}</div>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onFile} />
        <button type="button" className="btn primary" onClick={() => fileRef.current && fileRef.current.click()}>
          {entries[me] ? "🔄 عوضش کن" : "📸 ثبت عکس من"}
        </button>
        {!entries[me] ? <div className="tiny dim">اول عکست رو بذار، بعد به عکس پارتنرت رأی بده!</div> : null}
      </div>
      {uids.length ? <div className="shot-duo">{uids.map(card)}</div> : <div className="sp-empty">هنوز عکسی ثبت نشده 📸</div>}
      {shots.filter((s) => s.week !== wk).slice(0, 6).map((s) => {
        const us = Object.keys(s.entries || {});
        const wc = (u) => Object.values(s.votes || {}).filter((v) => v === u).length;
        const w = us.length ? us.slice().sort((a, b) => wc(b) - wc(a))[0] : null;
        return (
          <div className="sp-card" key={s.id || s.week}>
            <div className="tiny dim">{s.week} · {s.theme}</div>
            <div className="shot-duo small">
              {us.map((u) => (
                <div key={u} className="tiny">{u === me ? "تو" : pName} {w === u && wc(u) > 0 ? "🏆" : ""}<img src={s.entries[u].photo} alt="" className="shot-img sm" /></div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ============================ صندوق آرزوهای ماه 🗳️ (v9.9) ============================ */
function BallotsView({ touch, myId }) {
  const me = myId || "me";
  const mo = C.monthKey();
  const [wish, setWish] = useState("");
  useEffect(() => { C.ensureBallot(); touch(); }, []);
  const ballots = C.getBallots();
  const cur = ballots.find((b) => b.month === mo) || { month: mo, wishes: [], votes: {}, fulfilled: "" };
  const prof = C.getCoupleProfile();
  const pName = prof.partnerNick || prof.partner || "پارتنرت";
  const add = () => { if (!wish.trim()) return; C.addBallotWish(wish.trim(), myId); setWish(""); touch(); };
  const cnt = (id) => Object.values(cur.votes || {}).filter((v) => v === id).length;
  const sorted = (cur.wishes || []).slice().sort((a, b) => cnt(b.id) - cnt(a.id));
  const winner = sorted[0] && cnt(sorted[0].id) > 0 ? sorted[0] : null;
  return (
    <div className="sp-sec">
      <div className="card">
        <div className="trip-mk-t">🗳️ صندوق {mo}</div>
        <div className="tiny dim">هر ماه یه آرزو رو با هم انتخاب و برآورده کنید! 🌟</div>
        <div className="trip-add">
          <input className="inp" value={wish} onChange={(e) => setWish(e.target.value)} placeholder="آرزوت چیه؟…" maxLength={120} onKeyDown={(e) => { if (e.key === "Enter") add(); }} />
          <button type="button" className="btn primary sm" onClick={add}>➕</button>
        </div>
      </div>
      <div className="sp-list">
        {(cur.wishes || []).length === 0 && <div className="sp-empty">صندوق خالیه — اولین آرزو رو بنداز تو! 🌟</div>}
        {sorted.map((w) => {
          const mine = (cur.votes || {})[me] === w.id;
          const done = cur.fulfilled === w.id;
          return (
            <div className={"sp-card" + (done ? " bal-done" : "")} key={w.id}>
              <div><b>{done ? "🎉" : "🌟"} {w.t}</b></div>
              <div className="tiny dim">{w.by === me ? "تو" : pName} · {C.faNum(cnt(w.id))} رأی</div>
              <div className="mov-votes">
                <button type="button" className={"mov-v" + (mine ? " on" : "")} onClick={() => { C.voteWish(w.id, myId); touch(); }}>{mine ? "✓ رأی دادی" : "🗳️ رأی"}</button>
                {winner && winner.id === w.id && !done ? (
                  <button type="button" className="btn primary sm" onClick={() => { C.fulfillBallot(w.id); try { confettiBurst({ count: 100 }); } catch {} touch(); }}>🎉 برآورده شد!</button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      {ballots.filter((b) => b.month !== mo).slice(0, 6).map((b) => {
        const fw = (b.wishes || []).find((w) => w.id === b.fulfilled);
        return <div className="sp-card tiny dim" key={b.id || b.month}>🗳️ {b.month}: {fw ? `«${fw.t}» برآورده شد 🎉` : `${C.faNum((b.wishes || []).length)} آرزو، بدون برنده`}</div>;
      })}
    </div>
  );
}

/* ============================ شمارش‌های ما ⏳ (v9.9) ============================ */
const COUNT_EMOJIS = ["⏳", "🎂", "✈️", "💍", "🎓", "🏠", "👶", "🎉", "💘", "🏖️"];
function CountsView({ touch }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [emoji, setEmoji] = useState("⏳");
  const counts = C.getCounts();
  const today = C.isoDay(new Date());
  const mk = () => { if (!title.trim() || !date) return; C.addCount({ title: title.trim(), date, emoji }); setTitle(""); setDate(""); touch(); };
  const leftOf = (d) => Math.ceil((new Date(d + "T00:00:00") - new Date(today + "T00:00:00")) / 864e5);
  const sorted = counts.slice().sort((a, b) => String(a.date).localeCompare(String(b.date)));
  return (
    <div className="sp-sec">
      <div className="card">
        <div className="trip-mk-t">⏳ شمارش تازه</div>
        <div className="spin-cats">
          {COUNT_EMOJIS.map((e) => (
            <button key={e} type="button" className={"spin-cat" + (emoji === e ? " on" : "")} onClick={() => setEmoji(e)}>{e}</button>
          ))}
        </div>
        <input className="inp" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="به افتخار چی؟ (مثلاً: سفر کیش ✈️)" maxLength={80} />
        <input className="inp" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <button type="button" className="btn primary" onClick={mk} disabled={!title.trim() || !date}>⏳ ساخت شمارش</button>
      </div>
      <div className="sp-list">
        {sorted.length === 0 && <div className="sp-empty">شمارشی نیست — برای چی لحظه‌شماری می‌کنید؟ ⏳</div>}
        {sorted.map((c) => {
          const left = leftOf(c.date);
          return (
            <div className={"sp-card cnt-it" + (left === 0 ? " now" : left < 0 ? " past" : "")} key={c.id}>
              <div className="cnt-e">{c.emoji}</div>
              <div className="cnt-b">
                <b>{c.title}</b>
                <div className="cnt-l">{left === 0 ? "امروزه! 🎉" : left > 0 ? `${C.faNum(left)} روز مونده ⏳` : `${C.faNum(-left)} روز گذشته`}</div>
                <div className="tiny dim">{c.date}</div>
              </div>
              <button type="button" className="iconbtn danger" onClick={() => { C.delCount(c.id); touch(); }} title="حذف"><Ic n="trash" s={13} /></button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================ فیلم‌بین ما 🎬 (v9.8) ============================ */
function MoviesView({ touch, myId }) {
  const me = myId || "me";
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("film");
  const [tab, setTab] = useState("todo");
  const movies = C.getMovies();
  const mk = () => { if (!title.trim()) return; C.addMovie({ title: title.trim(), kind }); setTitle(""); touch(); };
  const list = movies.filter((m) => tab === "todo" ? !m.watched : m.watched);
  return (
    <div className="sp-sec">
      <div className="card">
        <div className="trip-mk-t">🎬 پیشنهاد تازه</div>
        <input className="inp" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="اسم فیلم/سریال؟" maxLength={100} onKeyDown={(e) => { if (e.key === "Enter") mk(); }} />
        <div className="spin-cats">
          <button type="button" className={"spin-cat" + (kind === "film" ? " on" : "")} onClick={() => setKind("film")}>🎬 فیلم</button>
          <button type="button" className={"spin-cat" + (kind === "series" ? " on" : "")} onClick={() => setKind("series")}>📺 سریال</button>
          <button type="button" className="btn primary sm" onClick={mk} disabled={!title.trim()}>➕ اضافه</button>
        </div>
        <div className="spin-cats">
          <button type="button" className={"spin-cat" + (tab === "todo" ? " on" : "")} onClick={() => setTab("todo")}>🍿 ندیدیم</button>
          <button type="button" className={"spin-cat" + (tab === "done" ? " on" : "")} onClick={() => setTab("done")}>✅ دیدیم</button>
        </div>
      </div>
      <div className="sp-list">
        {list.length === 0 && <div className="sp-empty">{tab === "todo" ? "لیست خالیه — چی ببینیم؟ 🎬" : "هنوز چیزی ندیدید 🍿"}</div>}
        {list.map((m) => {
          const vs = Object.values(m.votes || {});
          const yN = vs.filter((v) => v === "y").length;
          const nN = vs.filter((v) => v === "n").length;
          const mine = (m.votes || {})[me];
          const bothY = yN >= 2;
          return (
            <div className={"sp-card" + (bothY && !m.watched ? " mov-hot" : "")} key={m.id}>
              <div><b>{m.kind === "series" ? "📺" : "🎬"} {m.title}</b>{bothY && !m.watched ? <span className="cap-open"> ببینید! 🍿</span> : null}</div>
              {!m.watched ? (
                <div className="mov-votes">
                  <button type="button" className={"mov-v" + (mine === "y" ? " on" : "")} onClick={() => { C.voteMovie(m.id, "y", myId); touch(); }}>👍 {C.faNum(yN)}</button>
                  <button type="button" className={"mov-v" + (mine === "n" ? " on" : "")} onClick={() => { C.voteMovie(m.id, "n", myId); touch(); }}>👎 {C.faNum(nN)}</button>
                  <button type="button" className="btn ghost sm" onClick={() => { C.watchMovie(m.id, 0); touch(); }}>✅ دیدیم</button>
                </div>
              ) : (
                <div className="mov-votes">
                  <span>{[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} type="button" className="mov-star" onClick={() => { C.rateMovie(m.id, s); touch(); }}>{s <= (m.stars || 0) ? "⭐" : "☆"}</button>
                  ))}</span>
                  <button type="button" className="btn ghost sm" onClick={() => { C.watchMovie(m.id, m.stars); touch(); }}>↩️ برگردون</button>
                </div>
              )}
              <button type="button" className="iconbtn danger" onClick={() => { C.delMovie(m.id); touch(); }} title="حذف"><Ic n="trash" s={13} /></button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================ آشپزخونه‌ی ما 🍳 (v9.8) ============================ */
function RecipesView({ touch }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [mins, setMins] = useState("");
  const [steps, setSteps] = useState([""]);
  const [openId, setOpenId] = useState(null);
  const [timer, setTimer] = useState(null);
  const recipes = C.getRecipes();
  useEffect(() => {
    if (!timer) return;
    if (timer.left <= 0) { try { buzz(80); confettiBurst({ count: 40 }); } catch {} return; }
    const iv = setTimeout(() => setTimer({ ...timer, left: timer.left - 1 }), 1000);
    return () => clearTimeout(iv);
  }, [timer]);
  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const setStep = (i, v) => { const n = steps.slice(); n[i] = v; setSteps(n); };
  const mk = () => {
    if (!title.trim()) return;
    C.addRecipe({ title: title.trim(), desc: desc.trim(), mins, steps });
    setTitle(""); setDesc(""); setMins(""); setSteps([""]); touch();
  };
  return (
    <div className="sp-sec">
      <div className="card">
        <div className="trip-mk-t">🍳 دستور تازه</div>
        <input className="inp" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="اسم غذا؟ (مثلاً: قرمه‌سبزی مامان‌پز 😋)" maxLength={80} />
        <input className="inp" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="توضیح کوتاه / مواد لازم…" maxLength={300} />
        <input className="inp" value={mins} onChange={(e) => setMins(e.target.value)} placeholder="زمان پخت (دقیقه)" inputMode="numeric" />
        {steps.map((s, i) => (
          <input key={i} className="inp" value={s} onChange={(e) => setStep(i, e.target.value)} placeholder={`مرحله ${C.faNum(i + 1)}…`} maxLength={200} />
        ))}
        {steps.length < 20 && <button type="button" className="btn ghost sm" onClick={() => setSteps([...steps, ""])}>➕ مرحله</button>}
        <button type="button" className="btn primary" onClick={mk} disabled={!title.trim()}>🍳 ثبت دستور</button>
      </div>
      <div className="sp-list">
        {recipes.length === 0 && <div className="sp-empty">هنوز دستوری نیست — اولین غذا رو ثبت کنید! 🍳</div>}
        {recipes.map((r) => {
          const open = openId === r.id;
          const tOn = timer && timer.id === r.id;
          return (
            <div className="sp-card" key={r.id}>
              <button type="button" className="trip-head" onClick={() => setOpenId(open ? null : r.id)}>
                <span className="trip-tt">🍳 {r.title}</span>
                <span className="trip-prog">{r.mins ? C.faNum(r.mins) + " دقیقه" : ""}{r.cooked ? ` · ×${C.faNum(r.cooked)}` : ""}</span>
              </button>
              {open && (
                <div className="trip-body">
                  {r.desc ? <p className="tiny">{r.desc}</p> : null}
                  <ol className="rec-steps">{(r.steps || []).map((s, i) => <li key={i}>{s}</li>)}</ol>
                  {r.mins > 0 ? (
                    <div className="rec-timer">
                      {tOn ? (
                        <>
                          <span className="rec-clock">{timer.left <= 0 ? "🔔 تموم شد! نوش جان 😋" : "⏱️ " + fmt(timer.left)}</span>
                          <button type="button" className="btn ghost sm" onClick={() => setTimer(null)}>⏹️ توقف</button>
                          <button type="button" className="btn ghost sm" onClick={() => setTimer({ id: r.id, left: r.mins * 60, total: r.mins * 60 })}>🔁 از اول</button>
                        </>
                      ) : (
                        <button type="button" className="btn primary sm" onClick={() => setTimer({ id: r.id, left: r.mins * 60, total: r.mins * 60 })}>⏱️ شروع تایمر ({C.faNum(r.mins)} دقیقه)</button>
                      )}
                    </div>
                  ) : null}
                  <div className="px-acts">
                    <button type="button" className="btn ghost sm" onClick={() => { C.cookRecipe(r.id); touch(); }}>👨‍🍳 پختم! {r.cooked ? `(×${C.faNum(r.cooked)})` : ""}</button>
                    <button type="button" className="btn ghost sm danger" onClick={() => { if (confirm("این دستور پاک بشه؟")) { C.delRecipe(r.id); touch(); } }}>🗑️</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================ رویای مشترک 💤 (v9.8) ============================ */
function DreamsView({ touch, myId }) {
  const me = myId || "me";
  const [text, setText] = useState("");
  const dreams = C.getDreams();
  const prof = C.getCoupleProfile();
  const pName = prof.partnerNick || prof.partner || "پارتنرت";
  const save = () => { if (!text.trim()) return; C.addDream({ text: text.trim(), by: myId }); setText(""); touch(); };
  return (
    <div className="sp-sec">
      <div className="card">
        <div className="trip-mk-t">💤 خوابت رو بنویس</div>
        <textarea className="inp" value={text} onChange={(e) => setText(e.target.value)} placeholder="دیشب چی خواب دیدی؟…" rows={3} maxLength={1000} />
        <button type="button" className="btn primary" onClick={save} disabled={!text.trim()}>💤 ثبت خواب + تعبیر!</button>
      </div>
      <div className="sp-list">
        {dreams.length === 0 && <div className="sp-empty">هنوز خوابی ثبت نشده — دیشب چی دیدی؟ 💤</div>}
        {dreams.map((d) => {
          const f = C.dreamFun(d.text);
          return (
            <div className="sp-card drm-it" key={d.id}>
              <div className="tiny dim">{d.by === me || !d.by ? "✨ تو" : "💕 " + pName} · {d.day}</div>
              <p className="cap-b">💤 {d.text}</p>
              <div className="drm-fun">🔮 <b>{f.s}</b> — {f.t}</div>
              <button type="button" className="iconbtn danger" onClick={() => { C.delDream(d.id); touch(); }} title="حذف"><Ic n="trash" s={13} /></button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================ پادکست ما 🎙️ (v9.7) ============================ */
function CastsView({ touch, myId }) {
  const me = myId || "me";
  const [title, setTitle] = useState("");
  const [openId, setOpenId] = useState(null);
  const [rec, setRec] = useState(null);
  const [recSec, setRecSec] = useState(0);
  const recTimer = useRef(null);
  const [playId, setPlayId] = useState(null);
  const [playIx, setPlayIx] = useState(0);
  const auRef = useRef(null);
  const segsRef = useRef([]);
  const casts = C.getCasts();
  const prof = C.getCoupleProfile();
  const pName = prof.partnerNick || prof.partner || "پارتنرت";
  const mk = () => { C.addCast(title.trim()); setTitle(""); touch(); };
  const startRec = async (castId) => {
    if (rec) return;
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === "undefined") return;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let mime = "";
      for (const cd of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]) { try { if (MediaRecorder.isTypeSupported(cd)) { mime = cd; break; } } catch {} }
      const mr = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), audioBitsPerSecond: 32000 });
      const chunks = [];
      const t0 = Date.now();
      mr.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
      mr.onstop = () => {
        try { clearInterval(recTimer.current); } catch {}
        try { stream.getTracks().forEach((t) => t.stop()); } catch {}
        setRec(null);
        const blob = new Blob(chunks, { type: (mime || "audio/webm").split(";")[0] });
        if (!blob.size || blob.size > 450000) return;
        const fr = new FileReader();
        fr.onload = () => {
          C.addCastSeg(castId, { audio: String(fr.result || ""), dur: Math.max(1, Math.round((Date.now() - t0) / 1000)) }, myId);
          touch();
        };
        fr.readAsDataURL(blob);
      };
      mr.start(500);
      setRec({ mr }); setRecSec(0);
      recTimer.current = setInterval(() => {
        const s = Math.round((Date.now() - t0) / 1000);
        setRecSec(s);
        if (s >= 60) { try { mr.stop(); } catch {} }
      }, 500);
    } catch {}
  };
  const stopRec = () => { try { rec && rec.mr.stop(); } catch {} };
  const playAll = (cast) => {
    if (!cast.segs || !cast.segs.length) return;
    segsRef.current = cast.segs;
    setPlayId(cast.id); setPlayIx(0);
  };
  const stopPlay = () => { try { auRef.current && auRef.current.pause(); } catch {} setPlayId(null); };
  useEffect(() => {
    const a = auRef.current;
    if (!a || !playId) return;
    const segs = segsRef.current;
    if (playIx >= segs.length) { setPlayId(null); return; }
    a.src = segs[playIx].audio;
    a.play().catch(() => setPlayId(null));
  }, [playId, playIx]);
  return (
    <div className="sp-sec">
      <div className="card">
        <div className="trip-mk-t">🎙️ پادکست تازه</div>
        <div className="trip-add">
          <input className="inp" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="اسم قسمت؟ (مثلاً: خاطره‌ی سفر شمال 🌊)" maxLength={80} onKeyDown={(e) => { if (e.key === "Enter") mk(); }} />
          <button type="button" className="btn primary sm" onClick={mk}>ساخت</button>
        </div>
        <div className="tiny dim">هر کدوم تا ۶۰ ثانیه ضبط کنید، بعد همه رو پشت سر هم بشنوید! 🎧</div>
      </div>
      <audio ref={auRef} onEnded={() => setPlayIx((i) => i + 1)} style={{ display: "none" }} />
      <div className="sp-list">
        {casts.length === 0 && <div className="sp-empty">هنوز پادکستی نیست — اولین قسمت رو بسازید! 🎙️</div>}
        {casts.map((c) => {
          const segs = c.segs || [];
          const open = openId === c.id;
          const dur = segs.reduce((s, x) => s + (Number(x.dur) || 0), 0);
          return (
            <div className="sp-card" key={c.id}>
              <button type="button" className="trip-head" onClick={() => setOpenId(open ? null : c.id)}>
                <span className="trip-tt">🎙️ {c.title}</span>
                <span className="trip-prog">{segs.length ? C.faNum(segs.length) + " قطعه · " + C.faNum(dur) + " ثانیه" : "خالی"}</span>
              </button>
              {open && (
                <div className="trip-body">
                  {segs.map((s, i) => (
                    <div className="cast-s" key={i}>
                      <span className="tiny">{s.by === me ? "✨ تو" : "💕 " + pName} · {C.faNum(s.dur)} ثانیه</span>
                      <audio controls preload="metadata" src={s.audio} style={{ width: "100%", height: 32 }} />
                      <button type="button" className="iconbtn danger" onClick={() => { C.delCastSeg(c.id, s.ts, s.by); touch(); }} title="حذف"><Ic n="trash" s={13} /></button>
                    </div>
                  ))}
                  <div className="px-acts">
                    {rec ? (
                      <button type="button" className="btn primary sm" onClick={stopRec}>⏹️ تموم ({C.faNum(recSec)}s)</button>
                    ) : (
                      <button type="button" className="btn ghost sm" onClick={() => startRec(c.id)}>🎙️ ضبط قطعه (۶۰ ثانیه)</button>
                    )}
                    {playId === c.id ? (
                      <button type="button" className="btn ghost sm" onClick={stopPlay}>⏹️ توقف ({C.faNum(playIx + 1)}/{C.faNum(segs.length)})</button>
                    ) : (
                      <button type="button" className="btn primary sm" onClick={() => playAll(c)} disabled={!segs.length}>▶️ پخش همه</button>
                    )}
                  </div>
                  <button type="button" className="btn ghost sm danger" onClick={() => { if (confirm("این پادکست پاک بشه؟")) { C.delCast(c.id); touch(); } }}>🗑️ حذف پادکست</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================ نقشه‌ی خاطرات 📍 (v9.7) ============================ */
function PinsView({ touch }) {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [pick, setPick] = useState(null);
  const [q, setQ] = useState("");
  const [mapOk, setMapOk] = useState(true);
  const mapRef = useRef(null);
  const mapObj = useRef(null);
  const pins = C.getPins();
  useEffect(() => {
    let map = null, dead = false;
    (async () => {
      try {
        if (!document.getElementById("leaflet-css")) {
          const lk = document.createElement("link");
          lk.id = "leaflet-css"; lk.rel = "stylesheet";
          lk.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
          document.head.appendChild(lk);
        }
        const mod = await import("leaflet");
        const L = mod.default || mod;
        if (dead || !mapRef.current) return;
        map = L.map(mapRef.current).setView([35.7, 51.42], 11);
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(map);
        map._L = L;
        map._layer = L.layerGroup().addTo(map);
        map.on("click", (e) => setPick({ lat: +e.latlng.lat.toFixed(5), lon: +e.latlng.lng.toFixed(5) }));
        mapObj.current = map;
        setMapOk(true);
      } catch { if (!dead) setMapOk(false); }
    })();
    return () => { dead = true; try { map && map.remove(); } catch {} mapObj.current = null; };
  }, []);
  useEffect(() => {
    const map = mapObj.current;
    if (!map || !map._L || !map._layer) return;
    try {
      const L = map._L;
      map._layer.clearLayers();
      for (const p of pins) {
        const el = document.createElement("div");
        const b = document.createElement("b"); b.textContent = p.title; el.appendChild(b);
        if (p.note) { const s = document.createElement("div"); s.textContent = p.note; el.appendChild(s); }
        L.marker([p.lat, p.lon], { icon: L.divIcon({ html: "📍", className: "map-pin", iconSize: [24, 24], iconAnchor: [12, 22] }) }).addTo(map._layer).bindPopup(el);
      }
    } catch {}
  });
  const findPlace = () => {
    const query = q.trim();
    if (!query) return;
    fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=fa`)
      .then((r) => r.json())
      .then((j) => {
        const r = j && j.results && j.results[0];
        if (!r) return;
        setPick({ lat: +r.latitude.toFixed(5), lon: +r.longitude.toFixed(5) });
        try { mapObj.current && mapObj.current.setView([r.latitude, r.longitude], 12); } catch {}
        if (!title) setTitle(r.name);
      })
      .catch(() => {});
  };
  const save = () => {
    if (!title.trim() || !pick) return;
    C.addPin({ title: title.trim(), note: note.trim(), lat: pick.lat, lon: pick.lon });
    setTitle(""); setNote(""); setPick(null); touch();
  };
  const fly = (p) => { try { mapObj.current && mapObj.current.setView([p.lat, p.lon], 14); } catch {} };
  return (
    <div className="sp-sec">
      <div className="card">
        <div className="trip-mk-t">📍 پین تازه</div>
        <div ref={mapRef} className="map-box" />
        {!mapOk ? <div className="tiny dim">🛰️ نقشه آفلاینه — ولی می‌تونی با جستجوی شهر پین بذاری</div> : <div className="tiny dim">روی نقشه بزن تا نقطه انتخاب بشه 👆</div>}
        <div className="trip-add">
          <input className="inp" value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجوی شهر/جا… (مثلاً: رامسر)" onKeyDown={(e) => { if (e.key === "Enter") findPlace(); }} />
          <button type="button" className="btn ghost sm" onClick={findPlace}>🔍</button>
        </div>
        <input className="inp" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="اسم این جا؟ (مثلاً: کافه‌ی اول‌مون ☕)" maxLength={80} />
        <input className="inp" value={note} onChange={(e) => setNote(e.target.value)} placeholder="یه یادداشت کوتاه…" maxLength={300} />
        <button type="button" className="btn primary" onClick={save} disabled={!title.trim() || !pick}>📍 {pick ? "ثبت پین" : "اول نقطه رو انتخاب کن"}</button>
      </div>
      <div className="sp-list">
        {pins.length === 0 && <div className="sp-empty">هنوز پینی نیست — جاهای خاصتون رو علامت بزنید! 📍</div>}
        {pins.map((p) => (
          <div className="sp-card pin-it" key={p.id}>
            <div><b>📍 {p.title}</b>{p.note ? <p className="tiny dim">{p.note}</p> : null}<span className="tiny dim">{p.day}</span></div>
            <button type="button" className="btn ghost sm" onClick={() => fly(p)}>نمایش</button>
            <button type="button" className="iconbtn danger" onClick={() => { C.delPin(p.id); touch(); }} title="حذف"><Ic n="trash" s={13} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================ قلک آرزو 💰 (v9.7) ============================ */
function BanksView({ touch, myId }) {
  const me = myId || "me";
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [amt, setAmt] = useState({});
  const banks = C.getBanks();
  const prof = C.getCoupleProfile();
  const pName = prof.partnerNick || prof.partner || "پارتنرت";
  const mk = () => {
    const t = Math.floor(Number(String(target).replace(/[^0-9]/g, "")) || 0);
    if (!title.trim() || t < 1) return;
    C.addBank({ title: title.trim(), target: t });
    setTitle(""); setTarget(""); touch();
  };
  const deposit = (b) => {
    const a = Math.floor(Number(String(amt[b.id] || "").replace(/[^0-9]/g, "")) || 0);
    if (a < 1) return;
    const sum = C.bankSum(b);
    C.addDeposit(b.id, a, myId);
    setAmt({ ...amt, [b.id]: "" });
    if (sum < b.target && sum + a >= b.target) { try { confettiBurst({ count: 120 }); buzz(40); } catch {} }
    touch();
  };
  return (
    <div className="sp-sec">
      <div className="card">
        <div className="trip-mk-t">💰 قلک تازه</div>
        <input className="inp" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="آرزوتون چیه؟ (مثلاً: سفر استانبول ✈️)" maxLength={80} />
        <input className="inp" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="مبلغ هدف (تومان)" inputMode="numeric" />
        <button type="button" className="btn primary" onClick={mk} disabled={!title.trim() || !target.trim()}>💰 ساخت قلک</button>
      </div>
      <div className="sp-list">
        {banks.length === 0 && <div className="sp-empty">هنوز قلکی نیست — برای یه آرزو پول جمع کنید! 💰</div>}
        {banks.map((b) => {
          const sum = C.bankSum(b);
          const pct = Math.min(100, Math.round(sum / b.target * 100));
          const full = sum >= b.target;
          return (
            <div className={"sp-card bank-it" + (full ? " full" : "")} key={b.id}>
              <div className="bank-t">{full ? "🎉" : "💰"} {b.title}</div>
              <div className="bank-pig">
                <div className="bank-fill" style={{ width: pct + "%" }} />
                <span className="bank-pc">{C.faNum(pct)}٪</span>
              </div>
              <div className="tiny dim center">{C.faNum(sum)} از {C.faNum(b.target)} تومان {full ? "— رسیدید! 🎉" : ""}</div>
              {!full ? (
                <div className="trip-add">
                  <input className="inp" value={amt[b.id] || ""} onChange={(e) => setAmt({ ...amt, [b.id]: e.target.value })} placeholder="مبلغ واریز…" inputMode="numeric" onKeyDown={(e) => { if (e.key === "Enter") deposit(b); }} />
                  <button type="button" className="btn primary sm" onClick={() => deposit(b)}>واریز 🪙</button>
                </div>
              ) : null}
              {(b.dep || []).slice(-4).reverse().map((d, i) => (
                <div className="tiny dim" key={i}>🪙 {d.by === me ? "تو" : pName}: {C.faNum(d.amt)}</div>
              ))}
              <button type="button" className="iconbtn danger" onClick={() => { if (confirm("این قلک شکسته بشه؟ 🐷🔨")) { C.delBank(b.id); touch(); } }} title="حذف"><Ic n="trash" s={13} /></button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================ داستان زنجیره‌ای 💌 (v9.6) ============================ */
function ChainsView({ touch, myId }) {
  const me = myId || "me";
  const [title, setTitle] = useState("");
  const [openId, setOpenId] = useState(null);
  const [line, setLine] = useState("");
  const chains = C.getChains();
  const prof = C.getCoupleProfile();
  const pName = prof.partnerNick || prof.partner || "پارتنرت";
  const mk = () => { C.addChain(title.trim()); setTitle(""); touch(); };
  return (
    <div className="sp-sec">
      <div className="card">
        <div className="trip-mk-t">💌 داستان تازه</div>
        <div className="trip-add">
          <input className="inp" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="اسم داستان؟ (مثلاً: ماجرای ما 📖)" maxLength={80} onKeyDown={(e) => { if (e.key === "Enter") mk(); }} />
          <button type="button" className="btn primary sm" onClick={mk}>شروع</button>
        </div>
        <div className="tiny dim">قانون: هر نفر به نوبت فقط یه خط اضافه می‌کنه! ✍️</div>
      </div>
      <div className="sp-list">
        {chains.length === 0 && <div className="sp-empty">هنوز داستانی نیست — اولین خط رو تو بنویس! 💌</div>}
        {chains.map((c) => {
          const lines = c.lines || [];
          const open = openId === c.id;
          const last = lines[lines.length - 1];
          const myTurn = !last || last.by !== me;
          const send = () => { if (!line.trim()) return; C.addChainLine(c.id, line.trim(), myId); setLine(""); touch(); };
          return (
            <div className="sp-card" key={c.id}>
              <button type="button" className="trip-head" onClick={() => setOpenId(open ? null : c.id)}>
                <span className="trip-tt">💌 {c.title}</span>
                <span className="trip-prog">{lines.length ? C.faNum(lines.length) + " خط" : "خالی"}</span>
              </button>
              {open && (
                <div className="trip-body">
                  {lines.map((l, i) => (
                    <div className={"chain-l" + (l.by === me ? " me" : "")} key={i}>
                      <span className="chain-who">{l.by === me ? "✨ تو" : "💕 " + pName}</span>
                      <span>{l.t}</span>
                    </div>
                  ))}
                  {myTurn ? (
                    <div className="trip-add">
                      <input className="inp" value={line} onChange={(e) => setLine(e.target.value)} placeholder="خط بعدی داستان…" maxLength={200} onKeyDown={(e) => { if (e.key === "Enter") send(); }} />
                      <button type="button" className="btn primary sm" onClick={send}>✍️</button>
                    </div>
                  ) : <div className="tiny dim center">⏳ نوبت {pName}ه…</div>}
                  <button type="button" className="btn ghost sm danger" onClick={() => { if (confirm("این داستان پاک بشه؟")) { C.delChain(c.id); touch(); } }}>🗑️ حذف داستان</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================ چالش ۳۰ روزه 🏅 (v9.6) ============================ */
function QuestsView({ touch, myId }) {
  const me = myId || "me";
  const quests = C.getQuests();
  const active = quests.find((q) => C.questDay(q) < 30);
  const day = active ? Math.max(0, Math.min(29, C.questDay(active))) : 0;
  const bothN = active ? Array.from({ length: 30 }, (_, d) => d).filter((d) => Object.keys((active.done || {})[d] || {}).length >= 2).length : 0;
  const mineToday = active && !!((active.done || {})[day] || {})[me];
  return (
    <div className="sp-sec">
      {!active ? (
        <div className="card center">
          <div className="trip-mk-t">🏅 چالش ۳۰ روزه‌ی زوج</div>
          <p className="tiny dim">هر روز یه ماموریت کوچیک مشترک — ۳۰ روز پشت سر هم!</p>
          <button type="button" className="btn primary" onClick={() => { C.startQuest(); touch(); }}>🚀 شروع چالش!</button>
        </div>
      ) : (
        <div className="card">
          <div className="trip-mk-t">🏅 روز {C.faNum(day + 1)} از {C.faNum(30)}</div>
          <div className="quest-bar"><span style={{ width: Math.round(bothN / 30 * 100) + "%" }} /></div>
          <div className="tiny dim center">{C.faNum(bothN)} روز کامل شد ✅</div>
          <div className="quest-m">📌 {C.MISSIONS_30[day]}</div>
          <button type="button" className={"btn " + (mineToday ? "ghost" : "primary")} onClick={() => { C.checkQuest(active.id, day, myId); touch(); }}>
            {mineToday ? "✓ انجام دادم (بزن پس بگیر)" : "✅ من انجام دادم!"}
          </button>
          <div className="tiny dim center">{Object.keys((active.done || {})[day] || {}).length >= 2 ? "🎉 هر دو انجام دادید!" : mineToday ? "⏳ منتظر پارتنرتی…" : "تو هنوز انجام ندادی!"}</div>
          <div className="quest-grid">
            {Array.from({ length: 30 }, (_, d) => {
              const n = Object.keys((active.done || {})[d] || {}).length;
              return <span key={d} className={"quest-d" + (n >= 2 ? " both" : n ? " half" : "") + (d === day ? " now" : "")} title={`روز ${d + 1}`}>{d + 1}</span>;
            })}
          </div>
        </div>
      )}
      {quests.length > 1 || (quests.length === 1 && !active) ? (
        <div className="sp-list">
          {quests.filter((q) => q !== active).map((q) => {
            const n = Array.from({ length: 30 }, (_, d) => d).filter((d) => Object.keys((q.done || {})[d] || {}).length >= 2).length;
            return <div className="sp-card tiny dim" key={q.id}>🏅 دوره‌ی قبل: {C.faNum(n)} از {C.faNum(30)} روز کامل ✅</div>;
          })}
        </div>
      ) : null}
    </div>
  );
}

/* ============================ پیکسل‌آرت روزانه 🎨 (v9.6) ============================ */
function ArtsView({ touch, myId }) {
  const me = myId || "me";
  const today = C.isoDay(new Date());
  const [px, setPx] = useState(() => {
    const old = C.getArts().find((a) => a.day === today && (a.by || "") === me);
    return old ? old.px : "0".repeat(256);
  });
  const [col, setCol] = useState(7);
  const arts = C.getArts();
  const prof = C.getCoupleProfile();
  const pName = prof.partnerNick || prof.partner || "پارتنرت";
  const paint = (i) => setPx(px.substring(0, i) + col + px.substring(i + 1));
  const days = [...new Set(arts.map((a) => a.day))].sort().reverse().slice(0, 7);
  const mini = (p) => (
    <div className="px-mini">
      {p.split("").map((c, i) => <i key={i} style={{ background: C.PIXEL_COLORS[Number(c)] || "#f8fafc" }} />)}
    </div>
  );
  return (
    <div className="sp-sec">
      <div className="card">
        <div className="trip-mk-t">🎨 نقاشی امروزت</div>
        <div className="px-pal">
          {C.PIXEL_COLORS.map((c, i) => (
            <button key={i} type="button" className={"px-dot" + (col === i ? " on" : "")} style={{ background: c }} onClick={() => setCol(i)} />
          ))}
        </div>
        <div className="px-grid">
          {px.split("").map((c, i) => (
            <button key={i} type="button" className="px-c" style={{ background: C.PIXEL_COLORS[Number(c)] || "#f8fafc" }} onClick={() => paint(i)} />
          ))}
        </div>
        <div className="px-acts">
          <button type="button" className="btn ghost sm" onClick={() => setPx("0".repeat(256))}>🧹 پاک</button>
          <button type="button" className="btn primary sm" onClick={() => { C.saveArt(today, px, myId); touch(); }}>💾 ذخیره</button>
        </div>
      </div>
      <div className="sp-list">
        {days.length === 0 && <div className="sp-empty">هنوز نقاشی‌ای نیست — اولین پیکسل رو بزن! 🎨</div>}
        {days.map((d) => {
          const mine = arts.find((a) => a.day === d && (a.by || "") === me);
          const theirs = arts.find((a) => a.day === d && (a.by || "") !== me);
          return (
            <div className="sp-card" key={d}>
              <div className="tiny dim center">{d === today ? "امروز" : d}</div>
              <div className="px-duo">
                <div><div className="tiny">✨ تو</div>{mine ? mini(mine.px) : <div className="tiny dim">—</div>}</div>
                <div><div className="tiny">💕 {pName}</div>{theirs ? mini(theirs.px) : <div className="tiny dim">—</div>}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================ گردونه شانس 🎰 (v9.5) ============================ */
function SpinsView({ touch }) {
  const [cat, setCat] = useState("food");
  const [opts, setOpts] = useState(C.SPIN_PRESETS.food.opts.slice());
  const [custom, setCustom] = useState("");
  const [rolling, setRolling] = useState(-1);
  const [result, setResult] = useState(null);
  const spins = C.getSpins();
  const pickCat = (k) => { setCat(k); setOpts(C.SPIN_PRESETS[k].opts.slice()); setResult(null); };
  const addOpt = () => { if (!custom.trim() || opts.length >= 8) return; setOpts([...opts, custom.trim().slice(0, 60)]); setCustom(""); };
  const spin = () => {
    if (opts.length < 2 || rolling >= 0) return;
    setResult(null);
    let i = 0;
    const total = 12 + Math.floor(Math.random() * 8);
    const timer = setInterval(() => {
      i++;
      setRolling(Math.floor(Math.random() * opts.length));
      if (i >= total) {
        clearInterval(timer);
        const win = Math.floor(Math.random() * opts.length);
        setRolling(-1);
        setResult(win);
        C.addSpin({ title: C.SPIN_PRESETS[cat].t, opts, win });
        try { confettiBurst({ count: 70 }); buzz(30); } catch {}
        touch();
      }
    }, 90);
  };
  return (
    <div className="sp-sec">
      <div className="card">
        <div className="trip-mk-t">🎰 امشب چیکار کنیم؟</div>
        <div className="spin-cats">
          {Object.entries(C.SPIN_PRESETS).map(([k, v]) => (
            <button key={k} type="button" className={"spin-cat" + (cat === k ? " on" : "")} onClick={() => pickCat(k)}>{v.t}</button>
          ))}
        </div>
        <div className="spin-opts">
          {opts.map((o, i) => (
            <span key={i} className={"spin-opt" + (rolling === i ? " hot" : "") + (result === i ? " win" : "")}>
              {o}
              {opts.length > 2 && rolling < 0 ? <button type="button" className="spin-x" onClick={() => setOpts(opts.filter((_, j) => j !== i))}>×</button> : null}
            </span>
          ))}
        </div>
        <div className="trip-add">
          <input className="inp" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="گزینه‌ی خودت… (حداکثر ۸ تا)" maxLength={60} onKeyDown={(e) => { if (e.key === "Enter") addOpt(); }} />
          <button type="button" className="btn ghost sm" onClick={addOpt}>➕</button>
        </div>
        <button type="button" className="btn primary spin-go" onClick={spin} disabled={opts.length < 2 || rolling >= 0}>{rolling >= 0 ? "🌀 داره می‌چرخه…" : "🎰 بچرخون!"}</button>
        {result !== null && opts[result] ? <div className="spin-res">🎉 {opts[result]}</div> : null}
      </div>
      <div className="sp-list">
        {spins.length === 0 && <div className="sp-empty">هنوز قرعه‌ای نکشیدید — بچرخون ببین چی درمیاد! 🎰</div>}
        {spins.map((s) => (
          <div className="sp-card" key={s.id}>
            <div className="tiny dim">{s.title}</div>
            <div><b>🎯 {(s.opts || [])[s.win] || "؟"}</b></div>
            <div className="tiny dim">{(s.opts || []).join(" · ")}</div>
            <button type="button" className="iconbtn danger" onClick={() => { C.delSpin(s.id); touch(); }} title="حذف"><Ic n="trash" s={13} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================ کپسول زمان 📖 (v9.5) ============================ */
function CapsulesView({ touch }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [date, setDate] = useState("");
  const caps = C.getCapsules();
  const now = Date.now();
  const today = C.isoDay(new Date());
  const save = () => {
    if (!body.trim() || !date) return;
    const openAt = new Date(date + "T00:00:00").getTime();
    if (isNaN(openAt) || openAt <= now) return;
    C.addCapsule({ title: title.trim() || "کپسول زمان 📖", body: body.trim(), openAt });
    setTitle(""); setBody(""); setDate(""); touch();
  };
  return (
    <div className="sp-sec">
      <div className="card">
        <div className="trip-mk-t">📖 دفن کپسول تازه</div>
        <input className="inp" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="اسم کپسول (مثلاً: برای سالگردمون 💕)" maxLength={80} />
        <textarea className="inp" value={body} onChange={(e) => setBody(e.target.value)} placeholder="حرفت رو به آینده بنویس…" rows={3} maxLength={2000} />
        <input className="inp" type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)} />
        <button type="button" className="btn primary" onClick={save} disabled={!body.trim() || !date}>📖 دفنش کن!</button>
      </div>
      <div className="sp-list">
        {caps.length === 0 && <div className="sp-empty">هنوز کپسولی دفن نشده — یه حرف برای آینده بنویس! 📖</div>}
        {caps.map((c) => {
          const open = c.openAt <= now;
          const left = Math.ceil((c.openAt - now) / 864e5);
          return (
            <div className={"sp-card cap-it" + (open ? " open" : "")} key={c.id}>
              {open ? (
                <>
                  <div className="cap-t">📖 {c.title} <span className="cap-open">باز شد 🎉</span></div>
                  <p className="cap-b">{c.body}</p>
                </>
              ) : (
                <>
                  <div className="cap-t">🔒 {c.title}</div>
                  <div className="cap-count">{left <= 1 ? "فردا باز می‌شه! 👀" : `${C.faNum(left)} روز تا باز شدن ⏳`}</div>
                </>
              )}
              <button type="button" className="iconbtn danger" onClick={() => { if (confirm("این کپسول نابود بشه؟")) { C.delCapsule(c.id); touch(); } }} title="حذف"><Ic n="trash" s={13} /></button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================ سفر مشترک 🧳 (v9.4) ============================ */
function TripsView({ touch, myId }) {
  const [title, setTitle] = useState("");
  const [dest, setDest] = useState("");
  const [date, setDate] = useState("");
  const [openId, setOpenId] = useState(null);
  const [itemTxt, setItemTxt] = useState("");
  const trips = C.getTrips();
  const save = () => {
    if (!title.trim()) return;
    C.addTrip({ title: title.trim(), dest: dest.trim(), date, by: myId || "" });
    setTitle(""); setDest(""); setDate(""); touch();
  };
  return (
    <div className="sp-sec">
      <div className="card trip-mk">
        <div className="trip-mk-t">🧳 سفر تازه</div>
        <input className="inp" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="اسم سفر؟ مثلاً: شمالِ بهار 🌊" maxLength={80} />
        <input className="inp" value={dest} onChange={(e) => setDest(e.target.value)} placeholder="مقصد 📍 (مثلاً: رامسر)" maxLength={60} />
        <input className="inp" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <button type="button" className="btn primary" onClick={save} disabled={!title.trim()}>🧳 ساخت سفر</button>
      </div>
      <div className="sp-list">
        {trips.length === 0 && <div className="sp-empty">هنوز سفری ثبت نشده — کجا بریم؟ 🧳</div>}
        {trips.map((t) => {
          const items = t.items || [];
          const doneN = items.filter((x) => Object.keys(x.done || {}).length >= 2).length;
          const open = openId === t.id;
          const addIt = (txt) => { if (!txt.trim()) return; C.addTripItem(t.id, txt.trim()); setItemTxt(""); touch(); };
          return (
            <div className="sp-card trip-it" key={t.id}>
              <button type="button" className="trip-head" onClick={() => setOpenId(open ? null : t.id)}>
                <span className="trip-tt">🧳 {t.title}</span>
                <span className="tiny dim">{t.dest ? "📍 " + t.dest : ""}{t.date ? " · " + t.date : ""}</span>
                <span className="trip-prog">{items.length ? `${C.faNum(doneN)}/${C.faNum(items.length)}` : "خالی"}</span>
              </button>
              {open && (
                <div className="trip-body">
                  <div className="trip-add">
                    <input className="inp" value={itemTxt} onChange={(e) => setItemTxt(e.target.value)} placeholder="چی ببریم؟…" maxLength={100} onKeyDown={(e) => { if (e.key === "Enter") addIt(itemTxt); }} />
                    <button type="button" className="btn ghost sm" onClick={() => addIt(itemTxt)}>➕</button>
                  </div>
                  <div className="trip-ideas">
                    {C.PACK_IDEAS.filter((p) => !items.some((x) => x.t === p)).slice(0, 6).map((p) => (
                      <button key={p} type="button" className="trip-idea" onClick={() => { C.addTripItem(t.id, p); touch(); }}>+ {p}</button>
                    ))}
                  </div>
                  {items.map((x) => {
                    const n = Object.keys(x.done || {}).length;
                    return (
                      <div className={"trip-x" + (n >= 2 ? " both" : n ? " half" : "")} key={x.id}>
                        <button type="button" className="trip-chk" onClick={() => { C.toggleTripItem(t.id, x.id, myId); touch(); }}>
                          {n >= 2 ? "✅" : n ? "☑️" : "⬜"}
                        </button>
                        <span className="trip-xt">{x.t}</span>
                        <button type="button" className="iconbtn danger" onClick={() => { C.delTripItem(t.id, x.id); touch(); }} title="حذف"><Ic n="trash" s={13} /></button>
                      </div>
                    );
                  })}
                  <button type="button" className="btn ghost sm danger" onClick={() => { if (confirm("این سفر پاک بشه؟")) { C.delTrip(t.id); touch(); } }}>🗑️ حذف سفر</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================ نظرسنجی دو نفره 🗳️ (v9.2) ============================ */
function PollsView({ touch, myId }) {
  const me = myId || "me";
  const [q, setQ] = useState("");
  const [opts, setOpts] = useState(["", ""]);
  const polls = C.getPolls();
  const prof = C.getCoupleProfile();
  const pName = prof.partnerNick || prof.partner || "پارتنرت";
  const setOpt = (i, v) => { const n = opts.slice(); n[i] = v; setOpts(n); };
  const save = () => {
    if (!q.trim()) return;
    C.addPoll({ q: q.trim(), opts, by: myId || "" });
    setQ(""); setOpts(["", ""]); touch();
  };
  return (
    <div className="sp-sec">
      <div className="card poll-mk">
        <div className="poll-mk-t">🗳️ نظرسنجی تازه</div>
        <input className="inp" value={q} onChange={(e) => setQ(e.target.value)} placeholder="سؤالت چیه؟ مثلاً: شام کجا بریم؟" maxLength={200} />
        {opts.map((o, i) => (
          <input key={i} className="inp" value={o} onChange={(e) => setOpt(i, e.target.value)} placeholder={`گزینه ${C.faNum(i + 1)}`} maxLength={80} />
        ))}
        {opts.length < 4 && <button type="button" className="btn ghost sm" onClick={() => setOpts([...opts, ""])}>➕ گزینه</button>}
        <button type="button" className="btn primary" onClick={save} disabled={!q.trim()}>🚀 انتشار نظرسنجی</button>
      </div>
      <div className="sp-list">
        {polls.length === 0 && <div className="sp-empty">هنوز نظرسنجی‌ای نیست — اولین تصمیم مشترک رو رأی بذار! 🗳️</div>}
        {polls.map((p) => {
          const r = C.pollResult(p, me);
          const win = r.total ? r.counts.indexOf(Math.max(...r.counts)) : -1;
          return (
            <div className={"sp-card poll-it" + (p.closed ? " closed" : "")} key={p.id}>
              <div className="poll-q">🗳️ {p.q} {p.closed ? <span className="poll-closed">بسته شد</span> : null}</div>
              <div className="poll-opts">
                {(p.opts || []).map((o, i) => {
                  const pct = r.total ? Math.round(r.counts[i] / r.total * 100) : 0;
                  return (
                    <button key={i} type="button" className={"poll-opt" + (r.mine === i ? " mine" : "") + (p.closed && i === win && r.total ? " win" : "")} disabled={p.closed} onClick={() => { C.votePoll(p.id, i, myId); touch(); }}>
                      <span className="poll-bar" style={{ width: pct + "%" }} />
                      <span className="poll-ot">{o}</span>
                      <span className="poll-pc">{r.total ? C.faNum(pct) + "٪" : ""}{r.mine === i ? " ✓" : ""}</span>
                    </button>
                  );
                })}
              </div>
              <div className="muted small">
                {r.total ? `${C.faNum(r.total)} رأی` : "هنوز رأیی نیست"}
                {r.bothVoted ? " • هر دو رأی دادید 🎉" : r.mine !== null ? ` • تو رأی دادی؛ ${pName} هنوز نه ⏳` : " • تو هنوز رأی ندادی!"}
              </div>
              <div className="poll-acts">
                <button type="button" className="btn ghost sm" onClick={() => { C.togglePoll(p.id); touch(); }}>{p.closed ? "🔓 باز کن" : "🔒 ببند"}</button>
                <button type="button" className="iconbtn danger" onClick={() => { C.delPoll(p.id); touch(); }} title="حذف"><Ic n="trash" s={14} /></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================ چالش‌های زوج 🎯 (v9.1) ============================ */
function DaresView({ touch, myId }) {
  const me = myId || "me";
  const [custom, setCustom] = useState("");
  const dares = C.getDares();
  const streak = C.dareStreak(myId);
  const prof = C.getCoupleProfile();
  const pName = prof.partnerNick || prof.partner || "پارتنرت";
  const surprise = () => {
    const fresh = C.DARE_IDEAS.filter((x) => !dares.some((d) => d.t === x.t));
    const pool = fresh.length ? fresh : C.DARE_IDEAS;
    const d = pool[Math.floor(Math.random() * pool.length)];
    C.addDare({ t: d.t, e: d.e, by: myId || "" });
    try { buzz(10); } catch {}
    touch();
  };
  const add = () => {
    if (!custom.trim()) return;
    C.addDare({ t: custom.trim(), e: "🎯", by: myId || "" });
    setCustom(""); touch();
  };
  return (
    <div className="sp-sec">
      <div className="dare-hero card">
        <div className="dare-hero-t">🎯 چالش‌های دو نفره {streak >= 2 && <span className="mood-streak">🔥 {C.faNum(streak)} روز</span>}</div>
        <p className="muted small">هر چالش رو هر دو انجام بدید و تیک بزنید — استریک رو نگه دارید!</p>
        <button type="button" className="btn primary" onClick={surprise}>🎲 چالش شانسی بکش</button>
        <div className="row2">
          <input className="inp" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="یا چالش خودت رو بنویس…" maxLength={120} onKeyDown={(e) => { if (e.key === "Enter") add(); }} />
          <button type="button" className="btn ghost" onClick={add}>➕</button>
        </div>
      </div>
      <div className="sp-list">
        {dares.length === 0 && <div className="sp-empty">هنوز چالشی نیست — یه چالش شانسی بکش! 🎲</div>}
        {dares.map((d) => {
          const dn = d.done || {};
          const iDid = !!dn[me];
          const pDid = Object.keys(dn).some((k) => k !== me);
          const both = iDid && pDid;
          return (
            <div className={"sp-card dare-it" + (both ? " both" : "")} key={d.id}>
              <div className="dare-t">{d.e} {d.t}</div>
              <div className="dare-ticks">
                <button type="button" className={"dare-tick" + (iDid ? " on" : "")} onClick={() => { C.doneDare(d.id, myId); touch(); }}>
                  {iDid ? "✅ تو انجام دادی" : "⬜ من انجام دادم"}
                </button>
                <span className={"dare-peer" + (pDid ? " on" : "")}>{pDid ? `✅ ${pName} انجام داد` : `⬜ ${pName} هنوز نه`}</span>
              </div>
              {both && <div className="dare-done">🎉 هر دو انجامش دادید!</div>}
              <button type="button" className="iconbtn danger dare-del" onClick={() => { C.delDare(d.id); touch(); }} title="حذف"><Ic n="trash" s={14} /></button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================ کتاب ما 📖 (v8.2) ============================ */
function BookView() {
  const prof = C.getCoupleProfile();
  const mems = C.getMemories();
  const stars = C.getEvents().filter((e) => e.star);
  const done = C.getBucket().filter((b) => b.done);
  const days = prof.since ? Math.max(0, Math.floor((Date.now() - new Date(prof.since + "T12:00:00")) / 864e5)) : 0;
  const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const print = () => {
    const items = mems.map((m) => (
      `<div class="m"><b>${esc(m.title || "خاطره")}</b> <span class="d">${esc(m.date || "")}</span>` +
      (m.text ? `<p>${esc(m.text)}</p>` : "") +
      (m.photos && m.photos[0] ? `<img src="${m.photos[0]}" />` : "") + `</div>`
    )).join("");
    const html = "<!DOCTYPE html><html lang=\"fa\" dir=\"rtl\"><head><meta charset=\"utf-8\"><title>\u06a9\u062a\u0627\u0628 \u0645\u0627</title><style>" +
      "body{font-family:Tahome,Vazirmatn,IRANSans,system-ui;max-width:640px;margin:0 auto;padding:32px 20px;color:#222}" +
      ".cover{text-align:center;padding:56px 10px;border:3px double #e11d48;border-radius:24px;margin-bottom:28px}" +
      ".cover h1{font-size:34px;margin:8px 0}" +
      ".m{border:1px solid #e5e7eb;border-radius:16px;padding:14px;margin:0 0 14px;page-break-inside:avoid}" +
      ".m img{max-width:100%;border-radius:12px;margin-top:8px}.d{color:#888;font-size:12px}h2{color:#e11d48}ul{padding-right:18px}" +
      "</style></head><body><div class=\"cover\"><div style=\"font-size:52px\">\u0001f491</div><h1>\u06a9\u062a\u0627\u0628 \u0645\u0627</h1>" +
      `<div>${esc(prof.meNick || prof.me || "\u0645\u0646")} \u2764\ufe0f ${esc(prof.partnerNick || prof.partner || "\u062a\u0648")}</div>` +
      `<div class=\"d\">${days ? "\u0631\u0648\u0632 " + days + " \u0628\u0627 \u0647\u0645 \u0628\u0648\u062f\u0646" : ""} \u2022 ${mems.length} \u062e\u0627\u0637\u0631\u0647 \u2022 ${done.length} \u0622\u0631\u0632\u0648\u06cc \u0645\u062d\u0642\u0642\u200c\u0634\u062f\u0647</div></div>` +
      "<h2>\u0001f4f8 \u062e\u0627\u0637\u0631\u0627\u062a</h2>" + (items || "<p>\u0647\u0646\u0648\u0632 \u062e\u0627\u0637\u0631\u0647\u200c\u0627\u06cc \u062b\u0628\u062a \u0646\u0634\u062f\u0647.</p>") +
      (stars.length ? "<h2>\u2b50 \u0631\u0648\u0632\u0647\u0627\u06cc \u062e\u0627\u0635</h2><ul>" + stars.map((e) => `<li><b>${esc(e.title)}</b> <span class=\"d\">${esc(e.date || "")}</span></li>`).join("") + "</ul>" : "") +
      (done.length ? "<h2>\u0001faa3 \u0622\u0631\u0632\u0648\u0647\u0627\u06cc \u0645\u062d\u0642\u0642\u200c\u0634\u062f\u0647</h2><ul>" + done.map((b) => `<li>${esc(b.title)}</li>`).join("") + "</ul>" : "") +
      "<p class=\"d\" style=\"text-align:center;margin-top:32px\">\u0633\u0627\u062e\u062a\u0647 \u0634\u062f\u0647 \u0628\u0627 \u2764\ufe0f \u062f\u0631 \u0628\u0627\u0647\u0645</p>" +
      "<scr" + "ipt>window.onload=function(){setTimeout(function(){window.print()},400)}</scr" + "ipt></body></html>";
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
  };
  return (
    <div className="sp-sec">
      <div className="book-cover card">
        <div className="book-e">💑</div>
        <h3>کتاب ما</h3>
        <p className="muted small">{prof.meNick || prof.me || "من"} ❤️ {prof.partnerNick || prof.partner || "تو"}</p>
        <div className="book-stats">
          <span>📸 {C.faNum(mems.length)} خاطره</span>
          <span>⭐ {C.faNum(stars.length)} روز خاص</span>
          <span>🪣 {C.faNum(done.length)} آرزوی محقق‌شده</span>
          {!!days && <span>💞 {C.faNum(days)} روز با هم</span>}
        </div>
        <button type="button" className="btn primary" onClick={print}>🖨 چاپ / ذخیره‌ی PDF</button>
        <div className="muted tiny">یه صفحه‌ی تمیز باز می‌شه که می‌تونی چاپش کنی یا PDF بگیری</div>
      </div>
      {mems.length === 0 && <div className="sp-empty">هنوز خاطره‌ای نیست — کتابت خالیه! برو یه خاطره بساز 📸</div>}
    </div>
  );
}

function SettingsView({ touch, user, pair }) {
  const prof = C.getCoupleProfile();
  const [me, setMe] = useState(prof.me || "");
  const [partner, setPartner] = useState(prof.partner || "");
  const [meNick, setMeNick] = useState(prof.meNick || "");
  const [partnerNick, setPartnerNick] = useState(prof.partnerNick || "");
  const [emoji, setEmoji] = useState(prof.emoji || "❤️");
  const [since, setSince] = useState(prof.since || "");
  const [theme, setTheme] = useState(prof.theme || "rose");
  const [c1, setC1] = useState(prof.c1 || "#ff4f8b");
  const [c2, setC2] = useState(prof.c2 || "#a855f7");
  const [wallpaper, setWallpaper] = useState(prof.wallpaper || "rose");
  const [priv, setPriv] = useState(() => C.getPrivacy());
  const [msg, setMsg] = useState("");
  const [invite, setInvite] = useState(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const logged = !!(user && user.id);

  const flash = (t) => { setMsg(t); setTimeout(() => setMsg(""), 2600); };
  const [cardLink, setCardLink] = useState("");
  const [impFile, setImpFile] = useState(null);
  const [impBusy, setImpBusy] = useState(false);
  const [impDone, setImpDone] = useState("");
  const saveProfile = () => {
    C.setCoupleProfile({ me: me.trim(), partner: partner.trim(), meNick: meNick.trim(), partnerNick: partnerNick.trim(), emoji, since, theme, wallpaper, c1, c2 });
    try { addXp(5); } catch {}
    flash("ذخیره شد 💕");
    touch();
  };
  const togglePriv = (id) => {
    const next = { ...priv, [id]: priv[id] === false };
    setPriv(next);
    C.setPrivacy(next);
    touch();
  };
  const mkInvite = async () => {
    setBusy(true);
    const r = await api("/api/partner/invite", { method: "POST" });
    setBusy(false);
    if (r.ok && r.data && r.data.code) { setInvite(r.data); flash("لینک ساخته شد؛ براش بفرست 💌"); }
    else flash((r.data && r.data.message) || "نشد؛ دوباره امتحان کن");
  };
  const doExport = () => {
    try {
      const blob = new Blob([JSON.stringify(C.exportSpace())], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "fazaye-ma-backup.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      flash("بکاپ دانلود شد 💾");
    } catch { flash("نشد؛ دوباره امتحان کن"); }
  };
  const mkCardLink = async () => {
    try {
      const p = C.getCoupleProfile();
      const r = await api("/api/share", { method: "POST", body: { kind: "card", c: { me: p.meNick || p.me || "", partner: p.partnerNick || p.partner || "", since: p.since || "", emoji: p.emoji || "❤️" } } });
      if (r && r.ok && r.data && r.data.url) {
        setCardLink(r.data.url);
        try { await navigator.clipboard.writeText(r.data.url); flash("لینک کارت کپی شد؛ بفرست براشون 🔗"); } catch { flash("لینک ساخته شد 🔗"); }
      } else flash((r && r.data && r.data.message) || "نشد؛ دوباره امتحان کن");
    } catch { flash("اینترنت رو چک کن 📡"); }
  };
  const pickChatFile = async (f) => {
    if (!f) return;
    setImpBusy(true); setImpDone(""); setImpFile(null);
    try {
      const txt = await f.text();
      if (txt.length > 8000000) { flash("فایل خیلی بزرگه (حداکثر ۸ مگ)"); setImpBusy(false); return; }
      const r = parseChatFile(f.name, txt);
      if (!r.msgs.length) flash("پیامی تو فایل پیدا نشد؛ فرمت رو چک کن 😕");
      else setImpFile({ name: f.name, msgs: r.msgs, src: r.src });
    } catch { flash("فایل خونده نشد"); }
    setImpBusy(false);
  };
  const doChatImport = () => {
    if (!impFile || !impFile.msgs.length) return;
    const mems = msgsToMemories(impFile.msgs);
    for (const m of mems) C.addMemory({ title: m.title, text: m.text, date: m.day });
    setImpDone(`${C.faNum(mems.length)} خاطره از ${C.faNum(impFile.msgs.length)} پیام ساخته شد 🎉`);
    setImpFile(null);
    touch();
  };
  const doImport = (f) => {
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const ok = C.importSpace(JSON.parse(rd.result));
        flash(ok ? "برگردونده شد 🎉" : "فایل درست نیست");
        if (ok) touch();
      } catch { flash("فایل درست نیست"); }
    };
    rd.readAsText(f);
  };

  return (
    <div>
      <div className="card ccard">
        <h3 className="ip-head"><Ic n="hearts" s={16} /> ما کی هستیم؟</h3>
        <div className="sp-2col">
          <input className="inp" dir="rtl" maxLength={40} placeholder="اسم تو" value={me} onChange={(e) => setMe(e.target.value)} />
          <input className="inp" dir="rtl" maxLength={40} placeholder="اسم پارتنرت" value={partner} onChange={(e) => setPartner(e.target.value)} />
        </div>
        <div className="sp-2col">
          <input className="inp" dir="rtl" maxLength={24} placeholder="لقب تو (مثلاً: موش‌موشی 🐭)" value={meNick} onChange={(e) => setMeNick(e.target.value)} />
          <input className="inp" dir="rtl" maxLength={24} placeholder="لقب پارتنرت" value={partnerNick} onChange={(e) => setPartnerNick(e.target.value)} />
        </div>
        <label className="field">
          <span className="flbl">ایموجی شما</span>
          <div className="sp-emojis">
            {C.COUPLE_EMOJIS.map((e) => (
              <button key={e} type="button" className={"sp-emoji" + (emoji === e ? " on" : "")} onClick={() => setEmoji(e)}>{e}</button>
            ))}
          </div>
        </label>
        <label className="field">
          <span className="flbl">قصه‌مون از کی شروع شد؟ {since ? "(" + C.faJalali(since) + ")" : ""}</span>
          <input className="inp" dir="ltr" type="date" value={since} onChange={(e) => setSince(e.target.value)} />
        </label>
        <label className="field">
          <span className="flbl">رنگ فضای ما</span>
          <div className="sp-emojis">
            {Object.entries(HERO_THEMES).map(([k, [c1, c2]]) => (
              <button key={k} type="button" className={"sp-theme" + (theme === k ? " on" : "")}
                style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }} onClick={() => setTheme(k)} />
            ))}
            <button key="custom" type="button" className={"sp-theme sp-custom" + (theme === "custom" ? " on" : "")} onClick={() => setTheme("custom")} title="رنگ خودم">🎨</button>
          </div>
          {theme === "custom" ? (
            <div className="sp-customrow">
              <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(c1) ? c1 : "#ff4f8b"} onChange={(e) => setC1(e.target.value)} title="رنگ اول" />
              <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(c2) ? c2 : "#a855f7"} onChange={(e) => setC2(e.target.value)} title="رنگ دوم" />
              <span className="sp-customprev" style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }} />
            </div>
          ) : null}
        </label>
        <label className="field">
          <span className="flbl">والپیپر چت ما</span>
          <div className="sp-emojis">
            {Object.entries(C.WALLPAPERS).map(([k, bg]) => (
              <button key={k} type="button" className={"sp-theme" + (wallpaper === k ? " on" : "")}
                style={{ background: bg }} onClick={() => setWallpaper(k)} />
            ))}
          </div>
        </label>
        {msg ? <div className="mini-ok big">{msg}</div> : null}
        <button className="btn primary big" type="button" onClick={saveProfile}><Ic n="check" s={16} /> ذخیره</button>
      </div>

      <div className="card ccard">
        <h3 className="ip-head"><Ic n="users" s={16} /> اتصال زوج</h3>
        {!logged ? (
          <p className="tiny dim">برای سینک با پارتنرت اول باید وارد حسابت بشی (تب تنظیمات). بدون حساب هم همه‌چیز روی همین گوشی کار می‌کنه.</p>
        ) : pair.paired ? (
          <div className="mini-ok big">💞 با {pair.partner || "پارتنرت"} وصلی؛ چیزایی که پایین فعالن خودکار سینک می‌شن.</div>
        ) : invite ? (
          <div className="giftbox" style={{ textAlign: "center" }}>
            <b className="tiny">کد جفت‌شدن (۷ روز اعتبار):</b>
            <button className="recode" type="button" dir="ltr" onClick={() => { try { navigator.clipboard.writeText(invite.url || invite.code); } catch {} }}>{invite.code}</button>
            <button className="btn ghost sm" type="button" onClick={() => { try { navigator.clipboard.writeText(invite.url || invite.code); } catch {} flash("لینک کپی شد"); }}><Ic n="copy" s={14} /> کپی لینک دعوت</button>
          </div>
        ) : (
          <>
            <p className="tiny dim">با یه لینک، پارتنرت هم میاد تو؛ بعدش خاطره‌ها، تقویم، نامه‌ها و همه‌چیز بینتون سینک می‌شه.</p>
            <button className="btn primary" type="button" disabled={busy} onClick={mkInvite}><Ic n="invite" s={15} /> ساخت لینک دعوت</button>
          </>
        )}
        <button className="btn ghost sm" type="button" style={{ marginTop: 8 }} onClick={() => { syncSpace(true).then(() => touch()); flash("سینک شد 🔄"); }}>
          <Ic n="refresh" s={14} /> سینک دستی
        </button>
      </div>

      <div className="card ccard">
        <h3 className="ip-head"><Ic n="lock" s={16} /> چی سینک بشه؟</h3>
        <p className="tiny dim">هرچی خاموش کنی فقط روی گوشی خودت می‌مونه و برای پارتنرت نمی‌ره.</p>
        {C.SYNCABLE.map((s) => {
          const on = priv[s.id] !== false;
          return (
            <label key={s.id} className="sp-priv">
              <input type="checkbox" checked={on} onChange={() => togglePriv(s.id)} />
              <span>{s.e} {s.t}</span>
              <b className={on ? "on" : ""}>{on ? "مشترک" : "خصوصی"}</b>
            </label>
          );
        })}
      </div>

      <div className="card ccard">
        <h3 className="ip-head"><Ic n="shield" s={16} /> بکاپ و حریم</h3>
        <div className="sp-2col">
          <button className="btn ghost" type="button" onClick={doExport}><Ic n="download" s={15} /> دانلود بکاپ</button>
          <button className="btn ghost" type="button" onClick={mkCardLink}><Ic n="share" s={15} /> کارت عمومی ما 🔗</button>
          {cardLink ? <p className="tiny dim" style={{ wordBreak: "break-all" }}>🔗 {cardLink} <span className="tiny">(۹۰ روز اعتبار — فقط اسم و روزشمار، بدون عکس و جزئیات)</span></p> : null}
          <div className="imp-box">
            <b className="tiny">📥 ایمپورت تاریخچه چت (تلگرام/واتساپ)</b>
            <p className="tiny dim">خروجی چت رو بده تا حرفای هر روز بشن یه خاطره. تلگرام: Export as JSON · واتساپ: Export chat بدون مدیا</p>
            <label className="btn ghost sm">
              <input type="file" accept=".json,.txt" hidden onChange={(e) => { pickChatFile(e.target.files && e.target.files[0]); e.target.value = ""; }} />
              {impBusy ? "دارم می‌خونم…" : "📂 انتخاب فایل"}
            </label>
            {impFile ? (
              <div className="imp-prev">
                <span className="tiny">{C.faNum(impFile.msgs.length)} پیام ({impFile.src === "telegram" ? "تلگرام" : "واتساپ"}) پیدا شد</span>
                <button type="button" className="btn primary sm" onClick={doChatImport}>✨ بسازشون خاطره</button>
              </div>
            ) : null}
            {impDone ? <p className="tiny">{impDone}</p> : null}
          </div>
          <button className="btn ghost" type="button" onClick={() => fileRef.current && fileRef.current.click()}><Ic n="refresh" s={15} /> برگردوندن</button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => doImport(e.target.files[0])} />
        </div>
        <button className="btn ghost danger" type="button" style={{ marginTop: 8 }}
          onClick={() => {
            if (!confirm("همه‌ی داده‌های «فضای ما» از این گوشی پاک بشه؟ (اول بکاپ بگیر!)")) return;
            if (!confirm("مطمئنی؟ این کار برگشت نداره.")) return;
            C.wipeSpace();
            touch();
          }}>
          <Ic n="trash" s={15} /> پاک کردن همه‌ی فضای ما از این گوشی
        </button>
      </div>
    </div>
  );
}