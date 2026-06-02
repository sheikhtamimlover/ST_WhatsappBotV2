"use strict";

const fs      = require("fs");
const path    = require("path");
const log     = require("../../logger/log.js");
const spinner = require("../../logger/spinner.js");
const { colors } = require("../../logger/colors.js");

const CMDS_DIR   = path.resolve(__dirname, "../../scripts/cmds");
const EVENTS_DIR = path.resolve(__dirname, "../../scripts/events");

/**
 * Safely load a module, returning null on error with a logged warning.
 */
function safeRequire(filePath) {
  try {
    // Clear cache to allow reload
    delete require.cache[require.resolve(filePath)];
    return require(filePath);
  } catch (e) {
    return { __error: e };
  }
}

/**
 * Load all command files from scripts/cmds/.
 * Skips files listed in configCommands.commandUnload.
 * @param {object} api
 */
async function loadCommands(api) {
  const unload  = (global.ST.configCommands.commandUnload || []).map(n => n.toLowerCase());
  const files   = fs.readdirSync(CMDS_DIR).filter(f => f.endsWith(".js"));

  let loaded = 0;
  let skipped = 0;
  let failed = 0;

  spinner.start(`Loading commands (0/${files.length})…`);

  for (const file of files) {
    const name = file.toLowerCase();
    // Skip if in unload list
    if (unload.includes(name) || unload.includes(name.replace(".js", ""))) {
      spinner.update(`Skipping command: ${file}`);
      skipped++;
      continue;
    }

    const filePath = path.join(CMDS_DIR, file);
    const mod      = safeRequire(filePath);

    if (mod && mod.__error) {
      spinner.stop();
      log.warn("CMD LOAD", `⚠ ${file} — ${mod.__error.message}`);
      if (mod.__error.stack) {
        const lines = mod.__error.stack.split("\n").slice(0, 3).join(" | ");
        log.warn("CMD LOAD", `   at: ${lines}`);
      }
      spinner.start(`Loading commands (${loaded}/${files.length})…`);
      failed++;
      continue;
    }

    if (!mod || !mod.config || !mod.config.name) {
      log.warn("CMD LOAD", `${file} — missing config.name, skipping.`);
      failed++;
      continue;
    }

    // Run onLoad if defined
    if (typeof mod.onLoad === "function") {
      try {
        await mod.onLoad({ api, threadsData: global.ST.DB.threads, userData: global.ST.DB.users });
      } catch (e) {
        log.warn("CMD LOAD", `${file} onLoad error: ${e.message}`);
      }
    }

    global.ST.cmds.set(mod.config.name.toLowerCase(), mod);
    loaded++;
    spinner.update(`Loading commands (${loaded}/${files.length}) — ${mod.config.name}`);
  }

  let cmdSuffix = "";
  if (skipped > 0) cmdSuffix += `  |  Skipped: ${skipped}`;
  if (failed  > 0) cmdSuffix += `  |  Failed: ${failed}`;
  spinner.succeed(`Commands loaded: ${loaded}${cmdSuffix}`);
  log.success("STEP 4", `Commands: ${loaded} loaded` + cmdSuffix);
}

/**
 * Load all event files from scripts/events/.
 * Skips files listed in configCommands.commandEventUnload.
 * @param {object} api
 */
async function loadEvents(api) {
  const unload = (global.ST.configCommands.commandEventUnload || []).map(n => n.toLowerCase());
  const files  = fs.readdirSync(EVENTS_DIR).filter(f => f.endsWith(".js"));

  let loaded = 0;
  let skipped = 0;
  let failed = 0;

  spinner.start(`Loading events (0/${files.length})…`);

  for (const file of files) {
    const name = file.toLowerCase();
    if (unload.includes(name) || unload.includes(name.replace(".js", ""))) {
      spinner.update(`Skipping event: ${file}`);
      skipped++;
      continue;
    }

    const filePath = path.join(EVENTS_DIR, file);
    const mod      = safeRequire(filePath);

    if (mod && mod.__error) {
      spinner.stop();
      log.warn("EVT LOAD", `⚠ ${file} — ${mod.__error.message}`);
      spinner.start(`Loading events (${loaded}/${files.length})…`);
      failed++;
      continue;
    }

    if (!mod || !mod.config || !mod.config.name) {
      log.warn("EVT LOAD", `${file} — missing config.name, skipping.`);
      failed++;
      continue;
    }

    if (typeof mod.onLoad === "function") {
      try {
        await mod.onLoad({ api, threadsData: global.ST.DB.threads, userData: global.ST.DB.users });
      } catch (e) {
        log.warn("EVT LOAD", `${file} onLoad error: ${e.message}`);
      }
    }

    global.ST.events.set(mod.config.name.toLowerCase(), mod);
    loaded++;
    spinner.update(`Loading events (${loaded}/${files.length}) — ${mod.config.name}`);
  }

  let evtSuffix = "";
  if (skipped > 0) evtSuffix += `  |  Skipped: ${skipped}`;
  if (failed  > 0) evtSuffix += `  |  Failed: ${failed}`;
  spinner.succeed(`Events loaded: ${loaded}${evtSuffix}`);
  log.success("STEP 4", `Events: ${loaded} loaded` + evtSuffix);
}

/**
 * Main step-4 loader.
 * @param {object} api
 */
async function loadScripts(api) {
  log.divider("STEP 4 — SCRIPTS");
  await loadCommands(api);
  await loadEvents(api);
}

// ─── Dynamic management helpers (used by cmd/event cmds) ─────────────────────

/**
 * Load a single command by name (without .js).
 */
async function loadCmd(cmdName, api) {
  const file     = cmdName.endsWith(".js") ? cmdName : cmdName + ".js";
  const filePath = path.join(CMDS_DIR, file);
  if (!fs.existsSync(filePath)) throw new Error("Command file not found: " + file);
  const mod = safeRequire(filePath);
  if (mod && mod.__error) throw mod.__error;
  if (!mod || !mod.config || !mod.config.name) throw new Error("Invalid command structure in: " + file);
  if (typeof mod.onLoad === "function") {
    await mod.onLoad({ api, threadsData: global.ST.DB.threads, userData: global.ST.DB.users }).catch(() => {});
  }
  global.ST.cmds.set(mod.config.name.toLowerCase(), mod);
  return mod;
}

/**
 * Unload a single command by name.
 */
function unloadCmd(cmdName) {
  const key = cmdName.toLowerCase().replace(".js", "");
  if (!global.ST.cmds.has(key)) throw new Error("Command not loaded: " + key);
  global.ST.cmds.delete(key);
}

/**
 * Reload a single command by name.
 */
async function reloadCmd(cmdName, api) {
  unloadCmd(cmdName);
  return loadCmd(cmdName, api);
}

/**
 * Load a single event by name.
 */
async function loadEvent(evtName, api) {
  const file     = evtName.endsWith(".js") ? evtName : evtName + ".js";
  const filePath = path.join(EVENTS_DIR, file);
  if (!fs.existsSync(filePath)) throw new Error("Event file not found: " + file);
  const mod = safeRequire(filePath);
  if (mod && mod.__error) throw mod.__error;
  if (!mod || !mod.config || !mod.config.name) throw new Error("Invalid event structure in: " + file);
  if (typeof mod.onLoad === "function") {
    await mod.onLoad({ api, threadsData: global.ST.DB.threads, userData: global.ST.DB.users }).catch(() => {});
  }
  global.ST.events.set(mod.config.name.toLowerCase(), mod);
  return mod;
}

/**
 * Unload a single event by name.
 */
function unloadEvent(evtName) {
  const key = evtName.toLowerCase().replace(".js", "");
  if (!global.ST.events.has(key)) throw new Error("Event not loaded: " + key);
  global.ST.events.delete(key);
}

/**
 * Reload a single event by name.
 */
async function reloadEvent(evtName, api) {
  unloadEvent(evtName);
  return loadEvent(evtName, api);
}

module.exports = loadScripts;
module.exports.loadCmd    = loadCmd;
module.exports.unloadCmd  = unloadCmd;
module.exports.reloadCmd  = reloadCmd;
module.exports.loadEvent  = loadEvent;
module.exports.unloadEvent= unloadEvent;
module.exports.reloadEvent= reloadEvent;
