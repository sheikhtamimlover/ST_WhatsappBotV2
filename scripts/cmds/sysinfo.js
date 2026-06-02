"use strict";

const os = require("os");
const fs = require("fs");
const path = require("path");
const { createCanvas } = require("canvas");
const GIFEncoder = require("gifencoderv2");

const WIDTH = 900;
const HEIGHT = 520;
const CACHE_DIR = path.join(__dirname, "cache");

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

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function truncate(ctx, text, maxWidth) {
  const raw = String(text || "");
  if (ctx.measureText(raw).width <= maxWidth) return raw;
  let out = raw;
  while (out.length > 0 && ctx.measureText(out + "...").width > maxWidth) {
    out = out.slice(0, -1);
  }
  return out + "...";
}

function readPackageJson(filePath) {
  try {
    delete require.cache[require.resolve(filePath)];
    return require(filePath);
  } catch (_) {
    return {};
  }
}

async function collectInfo(api) {
  const pkg = readPackageJson(path.resolve(process.cwd(), "package.json"));
  const wcaPkg = readPackageJson(path.resolve(process.cwd(), "wca", "package.json"));
  const mem = process.memoryUsage();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedSystemMem = totalMem - freeMem;
  const cpu = os.cpus()[0]?.model || "unknown";
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
  const express = global.ST.config.express || {};
  const listen = global.ST.config.listen || {};

  return {
    botName: global.ST.config.botName || "WCA Bot",
    project: `${pkg.name || "unknown"} v${pkg.version || "0.0.0"}`,
    account: phone,
    prefix: global.ST.config.prefix || "!",
    uptime,
    node: process.version,
    platform: `${os.platform()} ${os.arch()}`,
    cpu,
    pid: process.pid,
    rss: mem.rss,
    heapUsed: mem.heapUsed,
    heapTotal: mem.heapTotal,
    usedSystemMem,
    totalMem,
    commands: global.ST.cmds ? global.ST.cmds.size : 0,
    events: global.ST.events ? global.ST.events.size : 0,
    onReply: global.ST.onReply ? global.ST.onReply.size : 0,
    onReaction: global.ST.onReaction ? global.ST.onReaction.size : 0,
    dbType: (global.ST.config.database && global.ST.config.database.type) || "json",
    users,
    threads,
    express: express.enable ? `on:${express.port || 3000}` : "off",
    listenEvents: listen.listenEvents !== false ? "on" : "off",
    selfListen: listen.selfListen ? "on" : "off",
    wca: wcaPkg.version || pkg.dependencies?.["@sheikhtamim/wca"] || "local",
    deps: Object.keys(pkg.dependencies || {}).length,
  };
}

function roundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function fillRound(ctx, x, y, w, h, r, color) {
  ctx.fillStyle = color;
  roundedRect(ctx, x, y, w, h, r);
  ctx.fill();
}

function drawText(ctx, text, x, y, size, color, weight = "400", maxWidth = null) {
  ctx.font = `${weight} ${size}px Arial`;
  ctx.fillStyle = color;
  ctx.fillText(maxWidth ? truncate(ctx, text, maxWidth) : text, x, y);
}

function drawBar(ctx, label, value, x, y, w, color, frame, detail) {
  const pct = clamp(value, 0, 1);
  const animated = pct * clamp((frame + 1) / 10, 0, 1);
  drawText(ctx, label, x, y - 8, 18, "#d9e6f2", "700");
  drawText(ctx, detail, x + w - 170, y - 8, 15, "#8aa0b8", "400", 170);
  fillRound(ctx, x, y, w, 18, 9, "#182536");
  fillRound(ctx, x, y, w * animated, 18, 9, color);
}

function drawCard(ctx, title, rows, x, y, w, h) {
  fillRound(ctx, x, y, w, h, 8, "rgba(13, 25, 38, 0.92)");
  ctx.strokeStyle = "rgba(125, 211, 252, 0.20)";
  ctx.lineWidth = 1;
  roundedRect(ctx, x, y, w, h, 8);
  ctx.stroke();
  drawText(ctx, title, x + 18, y + 31, 18, "#7dd3fc", "700");
  let rowY = y + 65;
  for (const [label, value] of rows) {
    drawText(ctx, label, x + 18, rowY, 15, "#8aa0b8", "700", 130);
    drawText(ctx, value, x + 150, rowY, 15, "#f6fbff", "400", w - 170);
    rowY += 29;
  }
}

function drawFrame(ctx, info, frame) {
  const pulse = Math.sin(frame / 10 * Math.PI * 2) * 0.5 + 0.5;
  const accent = `rgba(34, 211, 238, ${0.35 + pulse * 0.35})`;

  ctx.fillStyle = "#07111f";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const grd = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  grd.addColorStop(0, "#102033");
  grd.addColorStop(0.5, "#07111f");
  grd.addColorStop(1, "#12251e");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.strokeRect(18, 18, WIDTH - 36, HEIGHT - 36);

  drawText(ctx, info.botName, 42, 70, 34, "#f6fbff", "800", 560);
  drawText(ctx, "Animated System Information", 44, 101, 17, "#8aa0b8", "400");
  drawText(ctx, new Date().toLocaleString("en-US", { hour12: true }), 650, 72, 18, "#d9e6f2", "700", 210);
  drawText(ctx, `PID ${info.pid}`, 650, 101, 15, "#8aa0b8", "400", 210);

  drawBar(ctx, "Heap Usage", info.heapUsed / Math.max(info.heapTotal, 1), 44, 150, 375, "#22d3ee", frame, `${formatBytes(info.heapUsed)} / ${formatBytes(info.heapTotal)}`);
  drawBar(ctx, "System Memory", info.usedSystemMem / Math.max(info.totalMem, 1), 480, 150, 375, "#22c55e", frame, `${formatBytes(info.usedSystemMem)} / ${formatBytes(info.totalMem)}`);
  drawBar(ctx, "Process RSS", info.rss / Math.max(info.totalMem, 1), 44, 215, 375, "#f59e0b", frame, formatBytes(info.rss));
  drawBar(ctx, "Module Load", Math.min((info.commands + info.events) / 100, 1), 480, 215, 375, "#a78bfa", frame, `${info.commands} cmds / ${info.events} events`);

  drawCard(ctx, "Project", [
    ["Project", info.project],
    ["Account", info.account],
    ["Prefix", info.prefix],
    ["Uptime", info.uptime],
    ["DB", `${info.dbType} (${info.users} users, ${info.threads} threads)`],
  ], 44, 265, 390, 190);

  drawCard(ctx, "Runtime", [
    ["Node", info.node],
    ["Platform", info.platform],
    ["CPU", info.cpu],
    ["WCA", info.wca],
    ["Baileys", info.baileys],
  ], 466, 265, 390, 190);

  drawText(ctx, `Network: Express ${info.express} | listenEvents ${info.listenEvents} | selfListen ${info.selfListen}`, 44, 488, 15, "#8aa0b8", "400", 610);
  drawText(ctx, `Deps ${info.deps} | onReply ${info.onReply} | onReaction ${info.onReaction}`, 690, 488, 15, "#8aa0b8", "400", 170);
}

async function createSystemGif(info) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");
  const encoder = new GIFEncoder(WIDTH, HEIGHT);

  encoder.start();
  encoder.setRepeat(0);
  encoder.setDelay(120);
  encoder.setQuality(10);

  for (let i = 0; i < 10; i++) {
    drawFrame(ctx, info, i);
    encoder.addFrame(ctx);
  }

  encoder.finish();
  return encoder.out.getData();
}

module.exports = {
  config: {
    name: "sysinfo",
    version: "1.0.0",
    author: "ST",
    countDown: 15,
    role: 0,
    shortDescription: "Animated system info card",
    longDescription: "Generates an animated system info GIF using canvas and gifencoderv2.",
    category: "system",
    guide: { en: "{pn}" },
  },

  onStart: async ({ api, message }) => {
    const wait = await message.reply("Rendering animated system info...");
    let filePath = null;

    try {
      const info = await collectInfo(api);
      const buffer = await createSystemGif(info);
      fs.mkdirSync(CACHE_DIR, { recursive: true });
      filePath = path.join(CACHE_DIR, `sysinfo_${Date.now()}.gif`);
      fs.writeFileSync(filePath, buffer);

      if (wait?.messageID) await message.unsend(wait.messageID);
      const sent = await message.reply({
        body: `${info.botName} system info GIF`,
        attachment: {
          type: "document",
          stream: fs.createReadStream(filePath),
          mimetype: "image/gif",
          filename: path.basename(filePath),
        },
      });
      return sent;
    } catch (e) {
      if (wait?.messageID) await message.unsend(wait.messageID).catch(() => {});
      return message.reply("Failed to render system info: " + e.message);
    } finally {
      if (filePath) {
        setTimeout(() => {
          try { fs.unlinkSync(filePath); } catch (_) {}
        }, 5000);
      }
    }
  },
};
