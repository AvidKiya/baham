"use client";
// ---------------------------------------------------------------------------
// InvitePage.jsx — the fullscreen invitation experience (/invite and /demo).
// Loads config from the API (admin edits) with a hard fallback to defaults.
// ---------------------------------------------------------------------------
import { useState, useEffect } from "react";
import { DEFAULT_CONFIG } from "../shared/config.mjs";
import { fetchConfig, cleanText } from "@/lib/core";
import Experience from "@/components/Experience";
import DevPanel from "@/components/DevPanel";

export default function InvitePage({ mode = "invite" }) {
  const [cfg, setCfg] = useState(null);
  const demo = mode === "demo";

  useEffect(() => {
    document.body.dataset.mode = "invite";
    let done = false;
    const finish = (c) => {
      if (done) return;
      done = true;
      setCfg(c || DEFAULT_CONFIG);
    };
    const ctrl = new AbortController();
    const timer = setTimeout(() => finish(null), 1500); // never hang the experience
    fetchConfig(ctrl.signal).then((c) => {
      clearTimeout(timer);
      finish(c);
    });
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, []);

  if (!cfg) {
    return (
      <>
        <div className="bg" aria-hidden="true">
          <div className="blob b1"></div>
          <div className="blob b2"></div>
        </div>
        <div className="splash" role="status" aria-label="در حال بارگذاری">
          <div className="splash-heart" aria-hidden="true" />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="bg" aria-hidden="true">
        <div className="blob b1"></div>
        <div className="blob b2"></div>
        <div className="blob b3"></div>
      </div>
      <div className="grain" aria-hidden="true"></div>
      <div className="vignette" aria-hidden="true"></div>
      <div className="phone-shell">
        <div className="phone">
          <Experience config={cfg} mode="invite" />
        </div>
      </div>
      {demo ? <DevPanel /> : null}
    </>
  );
}
