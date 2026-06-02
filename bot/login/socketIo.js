"use strict";

const { Server } = require("socket.io");

let _log = null;
function getLog() {
  if (_log) return _log;
  try { _log = require("../../logger/log.js"); } catch (_) {}
  if (!_log) {
    _log = {
      info: (tag, ...a) => console.log(`[INFO] ${tag}:`, ...a),
      err:  (tag, ...a) => console.log(`[ERR]  ${tag}:`, ...a),
      warn: (tag, ...a) => console.log(`[WARN] ${tag}:`, ...a),
      success: (tag, ...a) => console.log(`[DONE] ${tag}:`, ...a),
    };
  }
  return _log;
}

let _server = null;
let _io     = null;

/**
 * Step 5 — Start Express HTTP server + Socket.IO.
 * Config: config.express.enable, config.express.port
 */
async function startExpress() {
  const log = getLog();
  const cfg = global.ST && global.ST.config;

  if (!cfg || !cfg.express || !cfg.express.enable) {
    log.info("STEP 5", "Express/Socket disabled in config");
    return;
  }

  let express, http;
  try {
    express = require("express");
    http    = require("http");
  } catch (e) {
    log.warn("STEP 5", "express not installed — skipping. (" + e.message + ")");
    return;
  }

  const app    = express();
  const server = http.createServer(app);
  const port   = (cfg.express && cfg.express.port) || 3000;

  app.use(express.json());

  app.get("/", (req, res) => {
    res.json({ status: "online", bot: (cfg.botName || "WCA Bot"), uptime: process.uptime() });
  });

  app.get("/uptime", (req, res) => {
    res.json({ status: "ok", uptime: process.uptime() });
  });

  app.get("/stats", (req, res) => {
    res.json({
      cmds:   global.ST.cmds ? global.ST.cmds.size : 0,
      events: global.ST.events ? global.ST.events.size : 0,
      uptime: process.uptime(),
    });
  });

  // Setup Socket.IO on the same server
  const socketSetup = module.exports._socketSetup;
  await socketSetup(server);

  await new Promise((resolve, reject) => {
    server.listen(port, (err) => {
      if (err) return reject(err);
      _server = server;
      log.success("STEP 5", `Express + Socket.IO running on port ${port}`);
      resolve();
    });
  });
}

/**
 * Original socket.io setup — attaches to an existing http.Server.
 */
async function _socketSetup(server) {
  const log = getLog();
  const cfg = (global.ST && global.ST.config && global.ST.config.serverUptime &&
               global.ST.config.serverUptime.socket) || {};
  const channelName = cfg.channelName || "uptime";
  const verifyToken = cfg.verifyToken || "bebbot";

  let io;
  try {
    io = new Server(server, { cors: { origin: "*" } });
    _io = io;
    if (global.ST) global.ST.io = io;
    log.info("SOCKET.IO", `Listening — channel="${channelName}"`);
  } catch (err) {
    return log.err("SOCKET.IO", `Init failed: ${err && err.message ? err.message : err}`);
  }

  io.on("connection", (socket) => {
    const token = (socket.handshake.auth && socket.handshake.auth.verifyToken) ||
                  (socket.handshake.query && socket.handshake.query.verifyToken);
    if (token !== verifyToken) {
      socket.emit(channelName, { status: "error", message: "Token is invalid" });
      socket.disconnect();
      return;
    }
    log.info("SOCKET.IO", `Client connected: ${socket.id}`);
    socket.emit(channelName, { status: "success", message: "Connected to server successfully" });

    const tick = setInterval(() => {
      try {
        socket.emit(channelName, {
          status: "ok", uptime: process.uptime(),
          memory: process.memoryUsage().rss, ts: Date.now(),
        });
      } catch (_) {}
    }, 30000);

    socket.on("disconnect", () => {
      clearInterval(tick);
      log.info("SOCKET.IO", `Client disconnected: ${socket.id}`);
    });
  });
}

function getIO()     { return _io; }
function getServer() { return _server; }

module.exports = startExpress;
module.exports.startExpress  = startExpress;
module.exports._socketSetup  = _socketSetup;
module.exports.getIO         = getIO;
module.exports.getServer     = getServer;
