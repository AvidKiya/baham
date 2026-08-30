// مناسبت دعوت: از URL (?occasion=...) یا تنظیمات پیش‌فرض ادمین
export function occasionOf(cfg) {
  if (typeof location === "undefined") return null;
  let id = "";
  try { id = (new URLSearchParams(location.search).get("occasion") || "").trim(); } catch (e) {}
  const list = (cfg && cfg.occasions) || [];
  return list.find((o) => o.id === id) || list.find((o) => o.id === ((cfg && cfg.defaultOccasion) || "love")) || list[0] || null;
}
