"use strict";
// ─── logger/loading.js ────────────────────────────────────────────────────────
// Simple level-based logger used outside the startup animations. Modernised:
// padded labels, semantic icons, theme palette — all driven by func/colors.js.
//
// Levels: info, success/succes, warn, error/err, master.

const { colors, theme, icons } = require("./colors.js");

let _moment;
try { _moment = require("moment-timezone"); } catch (_) {}

function ts() {
  const t = _moment
    ? _moment().tz("Asia/Dhaka").format("HH:mm:ss DD/MM/YYYY")
    : new Date().toLocaleString("en-GB");
  return colors.hex(theme.muted, `[${t}]`);
}

function _label(label, hex) {
  return colors.hex(hex, String(label).padEnd(7, " "));
}

function _line({ icon, hex, label, message }) {
  return `${ts()} ${colors.hex(hex, icon)} ${_label(label, hex)} ${message}`;
}

function logError(prefix, message) {
  if (message === undefined) { message = prefix; prefix = "ERROR"; }
  console.log(_line({ icon: icons.error, hex: theme.danger, label: prefix, message }));
}

module.exports = {
  err:    logError,
  error:  logError,
  warn(prefix, message) {
    if (message === undefined) { message = prefix; prefix = "WARN"; }
    console.log(_line({ icon: icons.warning, hex: theme.warning, label: prefix, message }));
  },
  info(prefix, message) {
    if (message === undefined) { message = prefix; prefix = "INFO"; }
    console.log(_line({ icon: icons.info, hex: theme.info, label: prefix, message }));
  },
  succes(prefix, message) {
    if (message === undefined) { message = prefix; prefix = "DONE"; }
    console.log(_line({ icon: icons.success, hex: theme.success, label: prefix, message }));
  },
  success(prefix, message) {
    if (message === undefined) { message = prefix; prefix = "DONE"; }
    console.log(_line({ icon: icons.success, hex: theme.success, label: prefix, message }));
  },
  master(prefix, message) {
    if (message === undefined) { message = prefix; prefix = "MASTER"; }
    console.log(_line({ icon: icons.star, hex: theme.accent, label: prefix, message }));
  },
};