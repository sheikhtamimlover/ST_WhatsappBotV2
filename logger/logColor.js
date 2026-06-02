"use strict";
// ─── logger/logColor.js ───────────────────────────────────────────────────────
// One-liner colourised printer.  Accepts:
//   • a hex string  (e.g. "#a29bfe")
//   • a theme key   (e.g. "success", "danger", "info", "primary", …)
//   • a colors.* fn (e.g. colors.greenBright)
// Any other shape falls back to plain text.

const { colors, theme } = require("./colors.js");

module.exports = function logColor(color, message) {
  if (message === undefined) { message = color; color = null; }
  if (typeof color === "function") return console.log(color(message));
  if (typeof color === "string") {
    if (color.startsWith("#")) return console.log(colors.hex(color, String(message)));
    if (theme[color])          return console.log(colors.hex(theme[color], String(message)));
  }
  console.log(String(message));
};