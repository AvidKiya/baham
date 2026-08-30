// ---------------------------------------------------------------------------
// lib/stickers.js — inline SVG fallback stickers (used when webp images fail
// to load, and for the CSS-only mode). Trusted static markup, no user input.
// ---------------------------------------------------------------------------

const HEART_BODY = "M60 102 C 18 72 10 46 30 30 C 45 18 57 27 60 39 C 63 27 75 18 90 30 C 110 46 102 72 60 102 Z";

function face(kind) {
  switch (kind) {
    case "nervous":
      return '<circle cx="45" cy="50" r="7" fill="#fff"/><circle cx="75" cy="50" r="7" fill="#fff"/><circle cx="47" cy="52" r="3.2" fill="#33122e"/><circle cx="73" cy="52" r="3.2" fill="#33122e"/><path d="M50 68 q10 -5 20 0" stroke="#33122e" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M88 34 q4 6 0 10 q-5 -3 0 -10" fill="#9fd8ff"/><circle cx="38" cy="62" r="4.5" fill="#ff7aa8" opacity=".7"/><circle cx="82" cy="62" r="4.5" fill="#ff7aa8" opacity=".7"/>';
    case "confused":
      return '<circle cx="45" cy="50" r="7" fill="#fff"/><circle cx="75" cy="50" r="7" fill="#fff"/><circle cx="45" cy="52" r="3" fill="#33122e"/><circle cx="75" cy="52" r="3" fill="#33122e"/><path d="M50 70 h20" stroke="#33122e" stroke-width="3" stroke-linecap="round" transform="rotate(-4 60 70)"/><path d="M36 38 l14 -3" stroke="#33122e" stroke-width="3" stroke-linecap="round"/>';
    case "happy":
    case "celebrate":
      return '<path d="M38 49 q7 -9 14 0" stroke="#33122e" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M68 49 q7 -9 14 0" stroke="#33122e" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M48 62 q12 14 24 0" stroke="#33122e" stroke-width="4" fill="#33122e" stroke-linejoin="round"/><circle cx="37" cy="61" r="5" fill="#ff7aa8" opacity=".7"/><circle cx="83" cy="61" r="5" fill="#ff7aa8" opacity=".7"/>';
    case "date":
      return '<path d="M34 50 q6 -8 12 0" stroke="#33122e" stroke-width="3.4" fill="none" stroke-linecap="round"/><path d="M74 50 q6 -8 12 0" stroke="#33122e" stroke-width="3.4" fill="none" stroke-linecap="round"/><path d="M44 63 q16 12 32 0" stroke="#33122e" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="36" cy="60" r="4.5" fill="#ff7aa8" opacity=".7"/><circle cx="84" cy="60" r="4.5" fill="#ff7aa8" opacity=".7"/>';
    default:
      return "";
  }
}

function extras(kind) {
  if (kind === "celebrate")
    return '<path d="M60 4 l7 14 -7 4 -7 -4z" fill="#ffd76e"/><circle cx="24" cy="26" r="3" fill="#ffd76e"/><circle cx="98" cy="22" r="2.6" fill="#fff"/><circle cx="16" cy="70" r="2.6" fill="#fff"/><circle cx="104" cy="66" r="3" fill="#ffd76e"/><path d="M30 10 l3 6 -3 6 -3 -6z" fill="#ffb3d4"/><path d="M92 92 l3 6 -3 6 -3 -6z" fill="#ffb3d4"/>';
  if (kind === "nervous") return '<path d="M20 24 l2.6 5 -2.6 5 -2.6 -5z" fill="#fff"/><path d="M98 84 l2.4 4.6 -2.4 4.6 -2.4 -4.6z" fill="#fff"/>';
  return "";
}

const cache = {};

export function stickerSVG(kind) {
  if (cache[kind]) return cache[kind];
  let svg;
  if (kind === "sparkles") {
    svg =
      '<svg viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="sgx" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff5c98"/><stop offset="1" stop-color="#b478ff"/></linearGradient></defs>' +
      '<path d="M60 18 l6 16 16 6 -16 6 -6 16 -6 -16 -16 -6 16 -6z" fill="url(#sgx)"/>' +
      '<path d="M96 52 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4z" fill="#ffd76e"/>' +
      '<path transform="translate(24 78) scale(.7)" d="M60 18 l6 16 16 6 -16 6 -6 16 -6 -16 -16 -6 16 -6z" fill="#ffb3d4"/>' +
      '<path d="M38 40 C 26 32 25 22 33 18 C 38 16 41 19 42 22 C 43 19 46 16 51 18 C 59 22 50 32 38 40Z" fill="url(#sgx)"/>' +
      '<path d="M86 78 C 76 71 75 63 81 60 C 85 58 88 60 89 63 C 90 60 93 58 97 60 C 103 63 96 71 86 78Z" fill="#ff5c98" opacity=".9"/>' +
      "</svg>";
  } else if (kind === "date") {
    svg =
      '<svg viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="sgd1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff5c98"/><stop offset="1" stop-color="#c96bff"/></linearGradient>' +
      '<linearGradient id="sgd2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b478ff"/><stop offset="1" stop-color="#7e5bff"/></linearGradient></defs>' +
      '<path transform="translate(-24 -6) scale(.86)" d="' + HEART_BODY + '" fill="url(#sgd1)"/>' +
      '<path transform="translate(26 6) scale(.86)" d="' + HEART_BODY + '" fill="url(#sgd2)"/>' +
      face("date") +
      '<path transform="translate(50 58) scale(.5)" d="' + HEART_BODY + '" fill="#ff3d71"/>' +
      "</svg>";
  } else {
    svg =
      '<svg viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="sg' + kind + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff5c98"/><stop offset="1" stop-color="#c96bff"/></linearGradient></defs>' +
      '<path d="' + HEART_BODY + '" fill="url(#sg' + kind + ')"/>' +
      '<ellipse cx="44" cy="36" rx="9" ry="6" fill="#fff" opacity=".28" transform="rotate(-24 44 36)"/>' +
      face(kind) +
      extras(kind) +
      "</svg>";
  }
  cache[kind] = svg;
  return svg;
}

export const STICKER_KINDS = ["nervous", "happy", "celebrate", "confused", "date", "sparkles"];
