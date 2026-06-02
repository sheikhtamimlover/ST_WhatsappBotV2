"use strict";
const { colors } = require("./colors.js");

let _moment;
try { _moment = require("moment-timezone"); } catch (_) { _moment = null; }

function getTime() {
  if (_moment) return _moment().tz("Asia/Dhaka").format("HH:mm:ss");
  return new Date().toLocaleTimeString("en-US", { hour12: false });
}

function getDate() {
  if (_moment) return _moment().tz("Asia/Dhaka").format("DD/MM/YYYY");
  return new Date().toLocaleDateString("en-GB");
}

function stamp() {
  return colors.gray(`[${getTime()} ${getDate()}]`);
}

function tag(label, colorFn) {
  return colorFn(`[${label}]`);
}

function dash() {
  return colors.hex("#444444", "─");
}

function buildLine(level, colorFn, prefix, message) {
  if (message === undefined) { message = prefix; prefix = null; }
  const labelPart = prefix
    ? `${tag(level, colorFn)} ${colorFn.bold ? colorFn.bold(prefix + ":") : colors.bold[level] ? colors.bold[level](prefix + ":") : colorFn(prefix + ":")} ${message}`
    : `${tag(level, colorFn)} ${message}`;
  return `${stamp()} ${labelPart}`;
}

const log = {
  info(prefix, message) {
    console.log(buildLine("INFO", colors.cyanBright, prefix, message));
  },
  success(prefix, message) {
    console.log(buildLine("DONE", colors.greenBright, prefix, message));
  },
  warn(prefix, message) {
    console.log(buildLine("WARN", colors.yellowBright, prefix, message));
  },
  err(prefix, message, ...extra) {
    console.log(buildLine("ERR ", colors.redBright, prefix, message));
    for (const e of extra) {
      if (e && e.stack) console.log(colors.red("       " + e.stack));
      else if (typeof e === "object") console.log(colors.red("       " + JSON.stringify(e, null, 2)));
      else if (e !== undefined) console.log(colors.red("       " + e));
    }
  },
  error(...args) { this.err(...args); },
  master(prefix, message) {
    console.log(buildLine("BOT ", colors.hex.bind(null, "#f5a623"), prefix, message));
  },
  cmd(prefix, message) {
    console.log(buildLine("CMD ", colors.hex.bind(null, "#a29bfe"), prefix, message));
  },
  dev(...args) {
    try { throw new Error(); } catch (e) {
      const at = e.stack.split("\n")[2] || "";
      let pos = at.slice(at.indexOf(process.cwd()) + process.cwd().length + 1).replace(/\)$/, "");
      console.log(colors.hex("#74b9ff")(`[DEV] ${pos} =>`), ...args);
    }
  },
  divider(label = "") {
    const line = "─".repeat(50);
    if (label) {
      const padded = `──── ${label} `;
      const rest = "─".repeat(Math.max(0, 52 - padded.length));
      console.log(colors.hex("#555555")(padded + rest));
    } else {
      console.log(colors.hex("#555555")(line));
    }
  },
  banner(lines = []) {
    const width = 52;
    const border = colors.hex("#6c5ce7")("╔" + "═".repeat(width) + "╗");
    const empty  = colors.hex("#6c5ce7")("║" + " ".repeat(width) + "║");
    const foot   = colors.hex("#6c5ce7")("╚" + "═".repeat(width) + "╝");
    console.log(border);
    for (const line of lines) {
      const pad = Math.max(0, width - line.length);
      const left = Math.floor(pad / 2);
      const right = pad - left;
      console.log(colors.hex("#6c5ce7")("║") + " ".repeat(left) + line + " ".repeat(right) + colors.hex("#6c5ce7")("║"));
    }
    console.log(empty);
    console.log(foot);
  }
};

module.exports = log;