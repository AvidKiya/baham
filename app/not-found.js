export default function NotFound() {
  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0b0715", fontFamily: "Vazirmatn, Tahoma, sans-serif" }}>
      <div style={{ textAlign: "center", color: "#f2ecfb", padding: 24 }}>
        <div style={{ fontSize: 64 }}>👀</div>
        <p style={{ color: "#bdaadf", lineHeight: 2, fontSize: 17 }}>اینجا هیچ سؤالی نیست…<br />شاید لینک رو اشتباه اومدی.</p>
        <a href="/" style={{ display: "inline-block", marginTop: 18, background: "linear-gradient(135deg,#ff4f8b,#c96bff)", color: "#fff", textDecoration: "none", padding: "14px 34px", borderRadius: 999, fontWeight: 700, boxShadow: "0 12px 34px -8px rgba(255,79,139,.5)" }}>
          برگردیم اول
        </a>
      </div>
    </div>
  );
}
