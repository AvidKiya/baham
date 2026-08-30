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
function extraKind(kind) {
  // فالبک SVG برای استیکرهای جدید (قبل از لود تصویر یا اگر لود نشد)
  if (kind === "rings")
    return '<svg viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="rgx" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe08a"/><stop offset="1" stop-color="#e2a93b"/></linearGradient></defs>' +
      '<circle cx="48" cy="64" r="26" fill="none" stroke="url(#rgx)" stroke-width="9"/><circle cx="76" cy="52" r="26" fill="none" stroke="url(#rgx)" stroke-width="9"/>' +
      '<path d="M76 20 l5 10 -5 10 -5 -10z" fill="#bff3ff"/><path d="M20 30 l3 6 -3 6 -3 -6z" fill="#ffd76e"/></svg>';
  if (kind === "friends")
    return '<svg viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="fgx" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff5c98"/><stop offset="1" stop-color="#c79bff"/></linearGradient></defs>' +
      '<path d="M46 96 C 14 72 8 50 26 36 C 38 26 48 34 51 44 C 54 34 64 26 76 36 C 94 50 88 72 56 96 Z" fill="url(#fgx)" transform="rotate(-8 46 64)"/>' +
      '<path d="M74 100 C 44 78 38 58 55 45 C 66 36 75 43 78 53 C 81 43 90 36 101 45 C 118 58 112 78 83 100 Z" fill="#9fd8ff" opacity=".92" transform="rotate(8 78 70)"/>' +
      '<path d="M60 12 l4 9 -4 9 -4 -9z" fill="#ffd76e"/></svg>';
  if (kind === "rocket")
    return '<svg viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="kgy" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd9ec"/><stop offset="1" stop-color="#b478ff"/></linearGradient></defs>' +
      '<path d="M60 8 C 78 26 84 48 78 72 L42 72 C 36 48 42 26 60 8 Z" fill="url(#kgy)"/><circle cx="60" cy="44" r="11" fill="#16203c" /><circle cx="60" cy="44" r="7" fill="#7ee0ff"/>' +
      '<path d="M42 58 L26 82 L44 74 Z" fill="#ff8fbf"/><path d="M78 58 L94 82 L76 74 Z" fill="#ff8fbf"/><path d="M52 72 q8 26 8 34 q0 -8 8 -34 Z" fill="#ffb35c"/><path d="M22 20 l3 6 -3 6 -3 -6z" fill="#ffd76e"/><path d="M98 26 l3 6 -3 6 -3 -6z" fill="#ffd76e"/></svg>';
  return null;
}

export function stickerSVG(kind) {
  if (cache[kind]) return cache[kind];
  let svg;
  const ek = extraKind(kind);
  if (ek) svg = ek;
  else if (kind === "sparkles") {
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
  } else if (kind === "letter") {
    svg =
      '<svg viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="sgl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff8fc0"/><stop offset="1" stop-color="#c96bff"/></linearGradient></defs>' +
      '<rect x="22" y="36" width="76" height="54" rx="12" fill="url(#sgl)"/>' +
      '<path d="M26 44 L60 68 L94 44" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".8"/>' +
      '<circle cx="60" cy="72" r="13" fill="#ff3d71"/><path transform="translate(60 70) scale(1.05)" d="M0 6 C -9 -2 -7 -11 0 -6 C 7 -11 9 -2 0 6 Z" fill="#ffd0e4"/>' +
      '<path d="M92 26 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z" fill="#ffd76e"/><circle cx="30" cy="26" r="3" fill="#fff" opacity=".9"/>' +
      "</svg>";
  } else if (kind === "roses") {
    svg =
      '<svg viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="sgr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff5c98"/><stop offset="1" stop-color="#c96bff"/></linearGradient></defs>' +
      '<path d="M60 22 C 78 22 90 36 88 52 C 92 66 80 82 60 84 C 40 82 28 66 32 52 C 30 36 42 22 60 22 Z" fill="url(#sgr)"/>' +
      '<path d="M60 30 C 72 30 80 40 78 52 C 80 62 72 74 60 76 C 48 74 40 62 42 52 C 40 40 48 30 60 30 Z" fill="#ff7fb2" opacity=".8"/>' +
      '<path d="M60 40 C 66 40 70 46 68 52 C 69 58 66 64 60 66 C 54 64 51 58 52 52 C 50 46 54 40 60 40 Z" fill="#ffa5c8" opacity=".9"/>' +
      '<path d="M60 84 C 58 94 52 100 44 104 L76 104 C 68 100 62 94 60 84 Z" fill="#4cc38a"/>' +
      '<path d="M34 96 q10 -2 14 6 q-10 4 -14 -6z" fill="#5fd4a5"/><path d="M86 92 q-10 -2 -13 6 q10 4 13 -6z" fill="#5fd4a5"/>' +
      '<circle cx="38" cy="36" r="2.6" fill="#fff"/><circle cx="94" cy="40" r="2.2" fill="#ffd76e"/><path d="M100 66 l2.4 5 -2.4 5 -2.4 -5z" fill="#ffb3d4"/>' +
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

export const STICKER_KINDS = ["nervous", "happy", "celebrate", "confused", "date", "sparkles", "letter", "roses", "rings", "friends", "rocket"];
