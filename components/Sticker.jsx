"use client";
// ---------------------------------------------------------------------------
// Sticker.jsx — image sticker with graceful fallback chain:
//   custom URL (config.assets) → built-in /assets/stickers/*.webp → inline SVG
// A missing image can never break the page.
// ---------------------------------------------------------------------------
import { useState, useEffect, useRef } from "react";
import { stickerSVG } from "@/lib/stickers";

export default function Sticker({ kind, cls = "stk", style, cfg, ariaLabel }) {
  const custom = cfg && cfg.assets && cfg.assets[kind] ? cfg.assets[kind] : "";
  const urls = (custom ? [custom] : []).concat(["/assets/stickers/" + kind + ".webp"]);
  const [idx, setIdx] = useState(0);
  const [failed, setFailed] = useState(false);
  const boxRef = useRef(null);
  useEffect(() => {
    setIdx(0);
    setFailed(false);
    if (boxRef.current) boxRef.current.classList.remove("ok");
  }, [custom, kind]);
  const showImg = !failed && idx < urls.length;
  return (
    <div className={cls} ref={boxRef} style={style} role={ariaLabel ? "img" : undefined} aria-label={ariaLabel}>
      <div className="stk-fb" dangerouslySetInnerHTML={{ __html: stickerSVG(kind) }} />
      {showImg ? (
        <img
          className="stk-img"
          alt=""
          loading="lazy"
          decoding="async"
          src={urls[idx]}
          onLoad={(e) => {
            const el = e.currentTarget.parentElement;
            if (el) el.classList.add("ok");
          }}
          onError={(e) => {
            const el = e.currentTarget.parentElement;
            if (el) el.classList.remove("ok");
            if (idx + 1 < urls.length) setIdx(idx + 1);
            else setFailed(true);
          }}
        />
      ) : null}
    </div>
  );
}
