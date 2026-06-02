"use strict";

const os = require("os");
const path = require("path");

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit++;
  }
  return `${size.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function readPackageJson(filePath) {
  try {
    delete require.cache[require.resolve(filePath)];
    return require(filePath);
  } catch (_) {
    return {};
  }
}

async function editOrReply(message, info, text) {
  if (info && info.messageID && typeof message.edit === "function") {
    try {
      await message.edit(info.messageID, text);
      return info;
    } catch (_) {}
  }
  return message.reply(text);
}

async function animateStatus(message) {
  const frames = ["|", "/", "-", "\\"];
  const steps = [
    "Checking bot runtime",
    "Reading project modules",
    "Collecting system info",
  ];

  let info = await message.reply(`${frames[0]} ${steps[0]}...`);
  let frame = 1;

  for (let i = 0; i < steps.length; i++) {
    for (let tick = 0; tick < 2; tick++) {
      await delay(350);
      info = await editOrReply(message, info, `${frames[frame % frames.length]} ${steps[i]}... (${i + 1}/${steps.length})`);
      frame++;
    }
  }

  return info;
}

module.exports = {
  config: {
    name: "status",
    version: "1.0.0",
    author: "ST",
    countDown: 8,
    role: 0,
    shortDescription: "Show full bot and system status",
    longDescription: "Displays project, runtime, memory, database, command, event, and host information.",
    category: "system",
    guide: { en: "{pn}" },
  },

  onStart: async ({ api, message }) => {
    const loading = await animateStatus(message);

    const pkg = readPackageJson(path.resolve(process.cwd(), "package.json"));
    const wcaPkg = readPackageJson(path.resolve(process.cwd(), "wca", "package.json"));
    const mem = process.memoryUsage();
    const uptime = global.humanDuration
      ? global.humanDuration(Date.now() - (global.ST.startTime || Date.now()))
      : `${Math.floor(process.uptime())}s`;

    let users = 0;
    let threads = 0;
    try {
      if (global.ST.DB) {
        users = await global.ST.DB.users.count();
        threads = await global.ST.DB.threads.count();
      }
    } catch (_) {}

    const selfID = api.getCurrentUserID ? api.getCurrentUserID() : (api.ctx && api.ctx.selfID) || "";
    const phone = selfID.split(":")[0].split("@")[0] || selfID || "unknown";
    const deps = Object.keys(pkg.dependencies || {}).length;
    const optionalDeps = Object.keys(pkg.optionalDependencies || {}).length;
    const cpu = os.cpus()[0]?.model || "unknown";
    const express = global.ST.config.express || {};
    const listen = global.ST.config.listen || {};

    const text =
      `*${global.ST.config.botName || "WCA Bot"} Status*\n\n` +
      `Project: ${pkg.name || "unknown"} v${pkg.version || "0.0.0"}\n` +
      `Account: ${phone}\n` +
      `Prefix: ${global.ST.config.prefix || "!"}\n` +
      `Uptime: ${uptime}\n\n` +
      `Runtime\n` +
      `Node: ${process.version}\n` +
      `Platform: ${os.platform()} ${os.arch()}\n` +
      `PID: ${process.pid}\n` +
      `CPU: ${cpu}\n\n` +
      `Memory\n` +
      `RSS: ${formatBytes(mem.rss)}\n` +
      `Heap: ${formatBytes(mem.heapUsed)} / ${formatBytes(mem.heapTotal)}\n` +
      `System: ${formatBytes(os.freemem())} free / ${formatBytes(os.totalmem())}\n\n` +
      `Database\n` +
      `Type: ${(global.ST.config.database && global.ST.config.database.type) || "json"}\n` +
      `Users: ${users}\n` +
      `Threads: ${threads}\n\n` +
      `Network\n` +
      `Express: ${express.enable ? "on" : "off"}${express.enable ? `:${express.port || 3000}` : ""}\n` +
      `Listen events: ${listen.listenEvents !== false ? "on" : "off"}\n` +
      `Self listen: ${listen.selfListen ? "on" : "off"}\n\n` +
      `Packages\n` +
      `WCA: ${wcaPkg.version || pkg.dependencies?.["@sheikhtamim/wca"] || "local"}\n` +
      `Dependencies: ${deps} + ${optionalDeps} optional`;

    return editOrReply(message, loading, text);
  },
};
