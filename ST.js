"use strict";

// ─── Bootstrap global.ST ────────────────────────────────────────────────────
global.ST = {
  config:         {},
  configCommands: {},
  cmds:           new Map(),
  events:         new Map(),
  onReply:        new Map(),
  onReaction:     new Map(),
  _cooldowns:     new Map(),
  startTime:      Date.now(),
  api:            null,
  DB:             null,
  io:             null,
};

// ─── Globals: logger + utils ─────────────────────────────────────────────────
const log     = require("./logger/log.js");
const spinner = require("./logger/spinner.js");
const { colors, theme, gradient } = require("./logger/colors.js");
const utils   = require("./utils.js");

global.log     = log;
global.spinner = spinner;
global.colors  = colors;
global.theme   = theme;
global.gradient= gradient;
global.utils   = utils;
global.prism   = utils;

// ─── Direct util function globals ────────────────────────────────────────────
// Commands/events call these with zero imports.
global.getTargetUser       = utils.getTargetUser;
global.getMessageReply     = utils.getMessageReply;
global.resolveUserDisplayName = utils.resolveUserDisplayName;
global.jidToPhone          = utils.jidToPhone;
global.getAvatar           = utils.getAvatar;
global.buildMessage        = utils.buildMessage;
global.getStreamFromUrl    = utils.getStreamFromUrl;
global.getBase64FromUrl    = utils.getBase64FromUrl;
global.downloadFile        = utils.downloadFile;
global.getAttachmentStream = utils.getAttachmentStream;
global.humanDuration       = utils.humanDuration;
global.sleep               = (ms) => new Promise(r => setTimeout(r, ms));
global.ensureDir           = utils.ensureDir;
global.normalizeContent    = utils.normalizeContent;
global.extFromMime         = utils.extFromMime;

// ─── getDisplayName — look up user's saved name, fall back to phone ──────────
global.getDisplayName = async function getDisplayName(uid) {
  try {
    const user = await global.ST.DB.userData(uid);
    if (user && user.name && user.name !== "Unknown") return user.name;
  } catch (_) {}
  return uid.split(":")[0].split("@")[0];
};

// ─── getThreadPrefix — per-thread prefix with global fallback ─────────────────
global.getThreadPrefix = async function getThreadPrefix(threadID) {
  try {
    const thread = await global.ST.DB.threadsData(threadID);
    if (thread && thread.data && thread.data.prefix) return thread.data.prefix;
  } catch (_) {}
  return global.ST.config.prefix || "!";
};

// ─── loadScripts helpers as direct globals ───────────────────────────────────
global.loadCmd     = (...a) => require("./bot/login/loadScripts.js").loadCmd(...a);
global.unloadCmd   = (...a) => require("./bot/login/loadScripts.js").unloadCmd(...a);
global.reloadCmd   = (...a) => require("./bot/login/loadScripts.js").reloadCmd(...a);
global.loadEvent   = (...a) => require("./bot/login/loadScripts.js").loadEvent(...a);
global.unloadEvent = (...a) => require("./bot/login/loadScripts.js").unloadEvent(...a);
global.reloadEvent = (...a) => require("./bot/login/loadScripts.js").reloadEvent(...a);

// ─── Global error safety nets ────────────────────────────────────────────────
process.on("uncaughtException", (e) => {
  log.err("UNCAUGHT", e.message || String(e));
  if (e.stack) console.error(e.stack);
});
process.on("unhandledRejection", (reason) => {
  log.err("UNHANDLED", reason && reason.message ? reason.message : String(reason));
});
process.on("exit", (code) => {
  if (code !== 0 && code !== 2) log.warn("EXIT", "Process exiting with code " + code);
});

// ─── Start ───────────────────────────────────────────────────────────────────
require("./bot/login/login.js")().catch((e) => {
  log.err("STARTUP", e.message || String(e));
  if (e.stack) console.error(e.stack);
  process.exit(1);
});
