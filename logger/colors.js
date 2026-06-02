"use strict";
// ─── colors.js ────────────────────────────────────────────────────────────────
// Truecolor ANSI helper used everywhere.  Backwards-compatible API is fully
// preserved (`colors.gray`, `colors.greenBright`, `colors.hex(…)`, …) and
// extended with:
//   • `colors.theme`         — semantic palette (primary, success, warning…)
//   • `colors.icons`         — modern unicode glyphs (success, warn, info…)
//   • `colors.gradient(t,…)` — per-char truecolor interpolation
//   • `colors.box(label,…)`  — padded inverse-bg pill label
//   • `colors.dim`, `colors.faint` — subtle text helpers

const isHexColor = color => color?.match?.(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/);

const colorFunctions = {
  bold: text => `\x1b[1m${text}\x1b[22m`,
  dim: text => `\x1b[2m${text}\x1b[22m`,
  faint: text => `\x1b[2m${text}\x1b[22m`,
  italic: text => `\x1b[3m${text}\x1b[23m`,
  underline: text => `\x1b[4m${text}\x1b[24m`,
  strikethrough: text => `\x1b[9m${text}\x1b[29m`,
  blink: text => `\x1b[5m${text}\x1b[25m`,
  inverse: text => `\x1b[7m${text}\x1b[27m`,
  hidden: text => `\x1b[8m${text}\x1b[28m`,

  black: text => `\x1b[30m${text}\x1b[39m`,
  blue: text => `\x1b[34m${text}\x1b[39m`,
  blueBright: text => `\x1b[94m${text}\x1b[39m`,
  cyan: text => `\x1b[36m${text}\x1b[39m`,
  cyanBright: text => `\x1b[96m${text}\x1b[39m`,
  default: text => text,
  gray: text => `\x1b[90m${text}\x1b[39m`,
  green: text => `\x1b[32m${text}\x1b[39m`,
  greenBright: text => `\x1b[92m${text}\x1b[39m`,
  grey: text => `\x1b[90m${text}\x1b[39m`,
  magenta: text => `\x1b[35m${text}\x1b[39m`,
  magentaBright: text => `\x1b[95m${text}\x1b[39m`,
  red: text => `\x1b[31m${text}\x1b[39m`,
  redBright: text => `\x1b[91m${text}\x1b[39m`,
  reset: text => text,
  white: text => `\x1b[37m${text}\x1b[39m`,
  whiteBright: text => `\x1b[97m${text}\x1b[39m`,
  yellow: text => `\x1b[33m${text}\x1b[39m`,
  yellowBright: text => `\x1b[93m${text}\x1b[39m`,
  hex: function (color, text) {
    if (isHexColor(text)) [color, text] = [text, color];
    if (text) return _wrapFG(color, text);
    if (!isHexColor(color)) return color_ => _wrapFG(color_, color);
    return text => _wrapFG(color, text);
  },

  bgBlack: text => `\x1b[40m${text}\x1b[49m`,
  bgBlue: text => `\x1b[44m${text}\x1b[49m`,
  bgCyan: text => `\x1b[46m${text}\x1b[49m`,
  bgGray: text => `\x1b[100m${text}\x1b[49m`,
  bgGreen: text => `\x1b[42m${text}\x1b[49m`,
  bgGrey: text => `\x1b[100m${text}\x1b[49m`,
  bgMagenta: text => `\x1b[45m${text}\x1b[49m`,
  bgRed: text => `\x1b[41m${text}\x1b[49m`,
  bgWhite: text => `\x1b[47m${text}\x1b[49m`,
  bgYellow: text => `\x1b[43m${text}\x1b[49m`,
  bgHex: function (color, text) {
    if (isHexColor(text)) [color, text] = [text, color];
    if (text) return _wrapBG(color, text);
    if (!isHexColor(color)) return color_ => _wrapBG(color_, color);
    return text => _wrapBG(color, text);
  }
};

function _hex2rgb(hex) {
  if (hex.length === 4) {
    return [
      parseInt(hex[1] + hex[1], 16),
      parseInt(hex[2] + hex[2], 16),
      parseInt(hex[3] + hex[3], 16),
    ];
  }
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}
function _wrapFG(hex, text) {
  const [r, g, b] = _hex2rgb(hex);
  return `\x1b[38;2;${r};${g};${b}m${text}\x1b[39m`;
}
function _wrapBG(hex, text) {
  const [r, g, b] = _hex2rgb(hex);
  return `\x1b[48;2;${r};${g};${b}m${text}\x1b[49m`;
}

// ── Build the public `colors` object (all keys also support `.bold` chain) ──
const colors = {};
colors.bold = {};
for (const key in colorFunctions) {
  if (key === "bold") continue;
  colors[key] = colorFunctions[key];
  colors[key].bold = (text, color) =>
    colorFunctions.bold(colorFunctions[key](text, color));
  colors.bold[key] = (text, color) =>
    colorFunctions.bold(colorFunctions[key](text, color));
}
// Re-attach standalone bold/dim that don't go through the chain helper above.
colors.bold = Object.assign(colorFunctions.bold, colors.bold);
colors.dim   = colorFunctions.dim;
colors.faint = colorFunctions.faint;

// ── Theme ────────────────────────────────────────────────────────────────────
// One palette every UI module reads from, so changing a brand color here
// updates the whole startup screen.
const theme = {
  brand1:   "#ff7eb6", // pink
  brand2:   "#a29bfe", // purple
  brand3:   "#74b9ff", // sky-blue
  primary:  "#a29bfe",
  accent:   "#fd79a8",
  success:  "#22d39a",
  warning:  "#ffb648",
  danger:   "#ff5c7a",
  info:     "#74b9ff",
  muted:    "#7f8fa6",
  dim:      "#5b647a",
  text:     "#e6e9f0",
  border:   "#3a3f55",
};
colors.theme = theme;

// ── Icons / glyphs ───────────────────────────────────────────────────────────
const icons = {
  success: "✓",
  warning: "▲",
  error:   "✗",
  info:    "◈",
  bullet:  "•",
  arrow:   "›",
  star:    "★",
  bolt:    "⚡",
  dot:     "●",
  ring:    "◯",
  diamond: "◆",
  pipe:    "│",
};
colors.icons = icons;

// ── Gradient: per-char truecolor interpolation across N stops ────────────────
function _lerp(a, b, t) { return Math.round(a + (b - a) * t); }
function gradient(text, stops) {
  if (!Array.isArray(stops) || stops.length === 0) return text;
  if (stops.length === 1) return _wrapFG(stops[0], text);
  const rgbs  = stops.map(_hex2rgb);
  const segs  = rgbs.length - 1;
  const chars = [...String(text)];
  // visible (non-ANSI/space) char count for an even color sweep
  const visIdx = [];
  chars.forEach((c, i) => { if (c !== " " && c !== "\n" && c !== "\t") visIdx.push(i); });
  const denom = Math.max(1, visIdx.length - 1);
  let visN = 0;
  return chars.map((c, i) => {
    if (c === " " || c === "\n" || c === "\t") return c;
    const t      = visN++ / denom;
    const segIdx = Math.min(segs - 1, Math.floor(t * segs));
    const segT   = (t * segs) - segIdx;
    const a = rgbs[segIdx], b = rgbs[segIdx + 1];
    const r = _lerp(a[0], b[0], segT);
    const g = _lerp(a[1], b[1], segT);
    const bl= _lerp(a[2], b[2], segT);
    return `\x1b[38;2;${r};${g};${bl}m${c}\x1b[39m`;
  }).join("");
}
colors.gradient = gradient;

// Pre-built brand gradient used by banner/section headers.
colors.brand = (text) => gradient(text, [theme.brand1, theme.brand2, theme.brand3]);

// ── Inverse-bg "pill" label  ───────────────────────────────────────────────
// `colors.box("LOGIN", theme.info)` →   ░░░ LOGIN ░░░ in white-on-color
function box(label, hex = theme.primary, fgHex = "#0b0d12") {
  return _wrapBG(hex, _wrapFG(fgHex, ` ${label} `));
}
colors.box = box;

// ── Semantic shortcuts for log lines ──────────────────────────────────────────
colors.successText = t => _wrapFG(theme.success, t);
colors.warnText    = t => _wrapFG(theme.warning, t);
colors.errorText   = t => _wrapFG(theme.danger,  t);
colors.infoText    = t => _wrapFG(theme.info,    t);
colors.mutedText   = t => _wrapFG(theme.muted,   t);

// ── Strip ANSI (for length math) ─────────────────────────────────────────────
const ANSI_RE = /\x1b\[[0-9;]*m/g;
colors.strip = (text) => String(text).replace(ANSI_RE, "");

module.exports = {
  isHexColor,
  colors,
  theme,
  icons,
  gradient,
};