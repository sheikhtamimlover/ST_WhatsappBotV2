"use strict";

const fs   = require("fs");
const path = require("path");

const CACHE_DIR    = path.resolve(process.cwd(), "cache");
const RESTART_FILE = path.join(CACHE_DIR, "restart.txt");

module.exports = {
  config: {
    name: "restart",
    version: "1.0.0",
    author: "ST",
    countDown: 10,
    role: 1,
    shortDescription: "Restart the bot",
    longDescription: "Gracefully restarts the bot. After restart, sends confirmation to this thread. Admin only.",
    category: "admin",
    guide: { en: "{pn}" }
  },

  onStart: async ({ api, event, message }) => {
    // Ensure cache dir exists
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

    // Save restart info so login.js can send confirmation after reboot
    const data = {
      time:    Date.now(),
      threads: [event.threadID],
      sender:  event.senderID,
    };
    fs.writeFileSync(RESTART_FILE, JSON.stringify(data), "utf8");

    await message.reply("🔄 Restarting… I'll let you know when I'm back.");
    setTimeout(() => process.exit(2), 2000);
  }
};
