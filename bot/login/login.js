"use strict";

const fs       = require("fs");
const path     = require("path");
const readline = require("readline");

const CONFIG_PATH  = path.resolve(process.cwd(), "config.json");
const CMD_CFG_PATH = path.resolve(process.cwd(), "configCommands.json");
const CACHE_DIR    = path.resolve(process.cwd(), "cache");
const RESTART_FILE = path.join(CACHE_DIR, "restart.txt");

// ─── Helpers ─────────────────────────────────────────────────────────────────
function ask(prompt) {
  return new Promise(resolve => {
    const iface = readline.createInterface({ input: process.stdin, output: process.stdout });
    iface.question(prompt, ans => { iface.close(); resolve(ans.trim()); });
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Config helpers ───────────────────────────────────────────────────────────
function loadConfig() {
  try {
    global.ST.config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  } catch (e) {
    global.log.err("CONFIG", "Failed to load config.json: " + e.message);
    process.exit(1);
  }
}

function loadConfigCommands() {
  try {
    global.ST.configCommands = JSON.parse(fs.readFileSync(CMD_CFG_PATH, "utf8"));
  } catch (e) {
    global.ST.configCommands = { commandUnload: [], commandEventUnload: [], commandAllowLoad: [] };
  }
}

function setupWatchers() {
  let _cfgD = null, _cmdD = null;
  fs.watch(CONFIG_PATH, () => {
    clearTimeout(_cfgD);
    _cfgD = setTimeout(() => {
      try {
        global.ST.config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
        global.log.info("CONFIG", "config.json reloaded ✓");
      } catch (_) {}
    }, 500);
  });
  fs.watch(CMD_CFG_PATH, () => {
    clearTimeout(_cmdD);
    _cmdD = setTimeout(() => {
      try {
        global.ST.configCommands = JSON.parse(fs.readFileSync(CMD_CFG_PATH, "utf8"));
        global.log.info("CONFIG", "configCommands.json reloaded ✓");
      } catch (_) {}
    }, 500);
  });
}

function saveToConfig(phoneNumber, loginMode) {
  try {
    const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    cfg.phoneNumber = phoneNumber;
    cfg.loginMode   = loginMode;
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), "utf8");
    global.ST.config.phoneNumber = phoneNumber;
    global.ST.config.loginMode   = loginMode;
  } catch (e) {
    global.log.warn("LOGIN", "Could not save to config.json: " + e.message);
  }
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────
function hasAuth(authFolder) {
  if (!fs.existsSync(authFolder)) return false;
  return fs.readdirSync(authFolder).some(f => f.includes("creds") || f.endsWith(".json"));
}

function clearAuth(authFolder) {
  try {
    if (fs.existsSync(authFolder)) {
      fs.rmSync(authFolder, { recursive: true, force: true });
      global.log.warn("LOGIN", "Auth cleared — will prompt fresh login.");
    }
  } catch (_) {}
}

// ─── Restart notification ─────────────────────────────────────────────────────
async function checkRestartFile(api) {
  try {
    if (!fs.existsSync(RESTART_FILE)) return;
    const raw  = fs.readFileSync(RESTART_FILE, "utf8");
    const data = JSON.parse(raw);
    fs.unlinkSync(RESTART_FILE);

    if (!data.threads || !data.time) return;
    const elapsed = ((Date.now() - data.time) / 1000).toFixed(2);
    const msg = `✅ Bot restarted successfully!\n⏱️ Time taken: ${elapsed}s`;

    for (const tid of data.threads) {
      try { await api.sendMessage({ body: msg }, tid); } catch (_) {}
    }
    global.log.success("RESTART", `Notified ${data.threads.length} thread(s) — took ${elapsed}s`);
  } catch (e) {
    global.log.warn("RESTART", "restart.txt read error: " + e.message);
  }
}

// ─── Connect ──────────────────────────────────────────────────────────────────
async function connect() {
  const cfg        = global.ST.config;
  const authFolder = path.resolve(process.cwd(), cfg.authFolder || "./auth");
  const wca        = require("@sheikhtamim/wca");
  const c          = global.utils.colors;

  let phoneNumber = (cfg.phoneNumber || "").trim();
  let loginMode   = (cfg.loginMode  || "").trim().toLowerCase();

  if (hasAuth(authFolder)) {
    global.log.info("LOGIN", "Auth found — restoring session…");
    return await attemptConnect(wca, { authFolder, phoneNumber: null, usePairingCode: false, printQR: false });
  }

  if (!phoneNumber) {
    console.log(c.cyanBright("\n  Enter your WhatsApp number with country code (e.g. 8801XXXXXXXXX):"));
    phoneNumber = await ask("  Number: ");
    if (!phoneNumber || !/^\d{7,}$/.test(phoneNumber)) {
      global.log.err("LOGIN", "Invalid number. Exiting.");
      process.exit(1);
    }
  }

  if (loginMode !== "pair" && loginMode !== "qr") {
    console.log(c.cyanBright("\n  Select login mode:"));
    console.log("    " + c.yellowBright("1") + " — Pair Code  (recommended)");
    console.log("    " + c.yellowBright("2") + " — QR Code");
    const choice = await ask("  Enter 1 or 2: ");
    loginMode = choice === "2" ? "qr" : "pair";
  }

  saveToConfig(phoneNumber, loginMode);

  const usePairingCode = loginMode === "pair";
  global.log.info("LOGIN", "Mode: " + (usePairingCode ? "Pair Code" : "QR Code") + " | Number: " + phoneNumber);

  return await attemptConnect(wca, { authFolder, phoneNumber, usePairingCode, printQR: !usePairingCode });
}

function attemptConnect(wca, opts) {
  return new Promise((resolve, reject) => {
    global.utils.spinner.start("Connecting to WhatsApp…", { preset: "dots" });

    let resolved = false;

    wca({
      authFolder:      opts.authFolder,
      phoneNumber:     opts.phoneNumber,
      usePairingCode:  opts.usePairingCode,
      printQR:         opts.printQR,
      skipUpdateCheck: true,
      globalOptions: {
        selfListen:            global.ST.config.listen?.selfListen          ?? false,
        listenEvents:          global.ST.config.listen?.listenEvents         ?? true,
        autoMarkDelivery:      global.ST.config.listen?.autoMarkDelivery     ?? false,
        autoReconnect:         global.ST.config.listen?.autoReconnect        ?? true,
        enableTypingIndicator: false,
      },
    }, (err, api) => {
      if (err) {
        if (resolved) return;
        resolved = true;
        global.utils.spinner.fail("Connection failed: " + (err.message || String(err)));

        if (/logout|logged.?out/i.test(String(err.message || err))) {
          clearAuth(opts.authFolder);
          global.log.info("LOGIN", "Restarting login flow…");
          connect().then(resolve).catch(reject);
          return;
        }
        reject(err);
        return;
      }

      if (resolved) return;
      resolved = true;
      global.utils.spinner.succeed("Connected to WhatsApp ✓");

      const selfID = api.getCurrentUserID ? api.getCurrentUserID() : (api.ctx?.selfID || "");
      const phone  = selfID.split(":")[0].split("@")[0] || selfID;
      global.log.success("STEP 2", "Account: " + phone);

      resolve(api);
    });
  });
}

// ─── Main startup — all 7 steps ───────────────────────────────────────────────
module.exports = async function startBot() {

  // ── Step 1: Config ────────────────────────────────────────────────────────
  global.log.divider("STEP 1 — CONFIG");
  loadConfig();
  loadConfigCommands();
  setupWatchers();
  global.log.success("STEP 1", "Config loaded — prefix: " + (global.ST.config.prefix || "!") +
    " | bot: " + (global.ST.config.botName || "WCA Bot"));

  await sleep(80);

  // ── Step 2: Connect ───────────────────────────────────────────────────────
  global.log.divider("STEP 2 — CONNECT");
  const api = await connect();
  global.ST.api = api;

  // Send restart notification if applicable
  await checkRestartFile(api);

  await sleep(120);

  // ── Step 3: Database ──────────────────────────────────────────────────────
  const loadData = require("./loadData.js");
  await loadData(api);

  await sleep(120);

  // ── Step 4: Commands + Events ─────────────────────────────────────────────
  const loadScripts = require("./loadScripts.js");
  await loadScripts(api);

  await sleep(120);

  // ── Step 5: Express + Socket.IO ───────────────────────────────────────────
  global.log.divider("STEP 5 — EXPRESS + SOCKET");
  const { startExpress } = require("./socketIo.js");
  await startExpress();
  require("../autoUptime.js").startAutoUptime();

  await sleep(120);

  // ── Step 6: Admin list ────────────────────────────────────────────────────
  const admins = global.ST.config.adminBot || [];
  const { colors: _c } = require("../../logger/colors.js");
  global.log.divider("STEP 6 — ADMINS");
  if (admins.length === 0) {
    console.log("  " + _c.hex("#7f8fa6")("─── not configured ───"));
  } else {
    for (let i = 0; i < admins.length; i++) {
      const uid   = admins[i];
      const phone = uid.split(":")[0].split("@")[0];
      let   name  = "";

      // 1) Try Baileys contacts map (fastest, no API call)
      try {
        const sock = api.sock;
        if (sock && sock.contacts) {
          const c = sock.contacts[phone + "@s.whatsapp.net"]
                 || sock.contacts[phone + "@lid"]
                 || sock.contacts[uid + "@s.whatsapp.net"];
          if (c) name = c.name || c.notify || c.verifiedName || "";
        }
      } catch (_) {}

      // 2) Try DB as fallback
      if (!name) {
        try {
          const userRec = await global.ST.DB.userData(uid);
          if (userRec && userRec.name && userRec.name !== "Unknown") name = userRec.name;
        } catch (_) {}
      }

      await sleep(50);
      const num     = _c.hex("#a29bfe")(`${i + 1}.`);
      const nameStr = name
        ? _c.hex("#22d39a")(name) + " " + _c.gray("(" + phone + ")")
        : _c.hex("#22d39a")(phone);
      console.log("  " + num + " " + nameStr);
    }
  }
  global.log.divider();

  await sleep(150);

  // ── Step 7: Ready ─────────────────────────────────────────────────────────
  const elapsed = ((Date.now() - global.ST.startTime) / 1000).toFixed(2);
  const cmds    = global.ST.cmds.size;
  const events  = global.ST.events.size;
  const prefix  = global.ST.config.prefix || "!";
  const botName = global.ST.config.botName || "WCA Bot";

  global.log.success("STEP 7",
    botName + " ready in " + elapsed + "s  |  " +
    cmds + " cmds  |  " + events + " events  |  prefix: " + prefix
  );

  // ── Keepalive — prevents Node from exiting if Baileys unref()s its socket ─
  const _keepAlive = setInterval(() => {}, 30000);
  _keepAlive.unref && _keepAlive.unref(); // don't block graceful shutdown, just prevent premature exit
  // Re-ref so we actually keep process alive
  if (_keepAlive.ref) _keepAlive.ref();

  // ── Start listening ───────────────────────────────────────────────────────
  const handlerEvent = require("../handler/handlerEvent.js");

  api.listen((err, event) => {
    // listenMqtt passes stop_listen as first arg (not a real error)
    if (err && err.type === "stop_listen") return;
    if (err && !(err instanceof Error)) {
      // It's a non-Error first-arg event — treat as event
      handlerEvent(api, err).catch(() => {});
      return;
    }
    if (err) {
      global.log.err("LISTEN", err.message || String(err));
      return;
    }
    handlerEvent(api, event).catch(e => {
      global.log.err("HANDLER", e.message || String(e));
    });
  });
};
