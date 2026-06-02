"use strict";

const https  = require("https");
const http   = require("http");

let log = null;
function getLog() {
  if (log) return log;
  try { log = require("../logger/log.js"); } catch (_) {}
  if (!log) log = { info: console.log, err: console.error, warn: console.warn };
  return log;
}

let _interval = null;
let _status   = "ok";

function pingUrl(url) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith("https") ? https : http;
    const req = proto.get(url, (res) => {
      let body = "";
      res.on("data", d => body += d);
      res.on("end", () => {
        try { resolve({ code: res.statusCode, data: JSON.parse(body) }); }
        catch (_) { resolve({ code: res.statusCode, data: {} }); }
      });
    });
    req.on("error", reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error("timeout")); });
  });
}

/**
 * Start the auto-uptime ping loop.
 * Reads config from global.ST.config.autoUptime
 */
function startAutoUptime() {
  const cfg      = (global.ST && global.ST.config && global.ST.config.autoUptime) || {};
  if (!cfg.enable) return;

  const expressCfg = (global.ST && global.ST.config && global.ST.config.express) || {};
  const port       = expressCfg.port || 3000;

  let myUrl = cfg.url || `http://localhost:${port}`;
  if (!myUrl.endsWith("/uptime")) myUrl = myUrl.replace(/\/$/, "") + "/uptime";

  const interval = (cfg.timeInterval || 180) * 1000;

  if (_interval) clearInterval(_interval);

  getLog().info("AUTO UPTIME", `Enabled — pinging ${myUrl} every ${cfg.timeInterval || 180}s`);

  async function tick() {
    try {
      await pingUrl(myUrl);
      if (_status !== "ok") {
        _status = "ok";
        getLog().info("AUTO UPTIME", "Bot is back online ✓");
      }
    } catch (e) {
      if (_status === "ok") {
        _status = "failed";
        getLog().err("AUTO UPTIME", "Ping failed: " + e.message);
      }
    }
  }

  // First ping after delay
  setTimeout(() => {
    tick();
    _interval = setInterval(tick, interval);
  }, interval);
}

module.exports = { startAutoUptime };
