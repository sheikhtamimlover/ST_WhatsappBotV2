"use strict";
// ─── spinner.js ───────────────────────────────────────────────────────────────
// Modern animated CLI spinner. CommonJS, no extra deps. Multiple presets, a
// gradient frame painter, and the same start/succeed/fail/info/warn/stop API.
//
// Usage:
//   const spinner = require("./func/spinner.js");
//   spinner.start("Loading commands...");   // default preset = "dots"
//   spinner.succeed("109 commands loaded");
//
//   // Pick a preset:
//   spinner.start("Connecting", { preset: "aesthetic" });
//   spinner.start("Streaming",  { preset: "bouncingBar" });

const { colors, theme, icons, gradient } = require("./colors.js");

const PRESETS = {
  dots:        { interval: 80,  frames: ["⠋","⠙","⠹","⠸","⠼","⠴","⠦","⠧","⠇","⠏"] },
  dots2:       { interval: 80,  frames: ["⣾","⣽","⣻","⢿","⡿","⣟","⣯","⣷"] },
  line:        { interval: 100, frames: ["—","\\","|","/"] },
  pulse:       { interval: 110, frames: ["▱▱▱","▰▱▱","▰▰▱","▰▰▰","▰▰▱","▰▱▱"] },
  bouncingBar: { interval: 80,  frames: [
    "[    ]","[=   ]","[==  ]","[=== ]","[ ===]","[  ==]","[   =]","[    ]",
    "[   =]","[  ==]","[ ===]","[====]","[=== ]","[==  ]","[=   ]"
  ] },
  earth:       { interval: 180, frames: ["🌍","🌎","🌏"] },
  arrows:      { interval: 100, frames: ["←","↖","↑","↗","→","↘","↓","↙"] },
  aesthetic:   { interval: 80,  frames: [
    "▰▱▱▱▱▱▱","▰▰▱▱▱▱▱","▰▰▰▱▱▱▱","▰▰▰▰▱▱▱","▰▰▰▰▰▱▱",
    "▰▰▰▰▰▰▱","▰▰▰▰▰▰▰","▱▰▰▰▰▰▰","▱▱▰▰▰▰▰","▱▱▱▰▰▰▰",
    "▱▱▱▱▰▰▰","▱▱▱▱▱▰▰","▱▱▱▱▱▱▰","▱▱▱▱▱▱▱"
  ] },
};

const STOPS = [theme.brand1, theme.brand2, theme.brand3];

let _interval = null;
let _frameIdx = 0;
let _text     = "";
let _preset   = PRESETS.dots;
let _active   = false;

function clearLine() { process.stdout.write("\r\x1b[2K"); }

function _paintFrame(frame) {
  // truecolor gradient → makes single-glyph frames pulse as they cycle, and
  // multi-char frames look like a moving wave.
  return gradient(frame, STOPS);
}

const spinner = {
  start(text, opts = {}) {
    if (_interval) clearInterval(_interval);
    _preset   = PRESETS[opts.preset] || PRESETS.dots;
    _text     = text;
    _frameIdx = 0;
    _active   = true;
    clearLine();
    process.stdout.write(`  ${_paintFrame(_preset.frames[0])}  ${colors.hex(theme.text, text)}`);
    _interval = setInterval(() => {
      _frameIdx = (_frameIdx + 1) % _preset.frames.length;
      clearLine();
      process.stdout.write(`  ${_paintFrame(_preset.frames[_frameIdx])}  ${colors.hex(theme.text, _text)}`);
    }, _preset.interval);
  },

  update(text) {
    _text = text;
  },

  succeed(text) {
    if (_interval) { clearInterval(_interval); _interval = null; }
    _active = false;
    clearLine();
    process.stdout.write(`  ${colors.successText(icons.success)}  ${colors.hex(theme.text, text || _text)}\n`);
  },

  fail(text) {
    if (_interval) { clearInterval(_interval); _interval = null; }
    _active = false;
    clearLine();
    process.stdout.write(`  ${colors.errorText(icons.error)}  ${colors.hex(theme.text, text || _text)}\n`);
  },

  info(text) {
    if (_interval) { clearInterval(_interval); _interval = null; }
    _active = false;
    clearLine();
    process.stdout.write(`  ${colors.infoText(icons.info)}  ${colors.hex(theme.text, text || _text)}\n`);
  },

  warn(text) {
    if (_interval) { clearInterval(_interval); _interval = null; }
    _active = false;
    clearLine();
    process.stdout.write(`  ${colors.warnText(icons.warning)}  ${colors.hex(theme.text, text || _text)}\n`);
  },

  stop() {
    if (_interval) { clearInterval(_interval); _interval = null; }
    _active = false;
    clearLine();
  },

  isActive() { return _active; },

  presets: Object.keys(PRESETS),
};

module.exports = spinner;