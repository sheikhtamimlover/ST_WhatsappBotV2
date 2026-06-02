"use strict";

module.exports = {
  config: {
    name: "stats",
    version: "1.0.0",
    author: "ST",
    countDown: 10,
    role: 0,
    shortDescription: "Show bot statistics",
    longDescription: "Displays uptime, loaded commands, events, database counts, and memory usage.",
    category: "system",
    guide: { en: "{pn}" }
  },

  onStart: async ({ api, event, message }) => {
    const uptime  = humanDuration(Date.now() - (global.ST.startTime || Date.now()));
    const cmds    = global.ST.cmds ? global.ST.cmds.size : 0;
    const events  = global.ST.events ? global.ST.events.size : 0;
    const mem     = (process.memoryUsage().rss / 1024 / 1024).toFixed(1);

    let users   = 0;
    let threads = 0;
    try {
      if (global.ST.DB) {
        users   = await global.ST.DB.users.count();
        threads = await global.ST.DB.threads.count();
      }
    } catch (_) {}

    const selfID = api.getCurrentUserID ? api.getCurrentUserID() : "";
    const phone  = selfID.split(":")[0].split("@")[0] || selfID;

    return message.reply(
      `🤖 *${global.ST.config.botName || "WCA Bot"} Stats*\n\n` +
      `📱 Account: ${phone}\n` +
      `⏱️ Uptime: ${uptime}\n` +
      `💾 Memory: ${mem} MB\n\n` +
      `📦 Commands: ${cmds}\n` +
      `⚡ Events: ${events}\n\n` +
      `👥 Users in DB: ${users}\n` +
      `💬 Threads in DB: ${threads}\n\n` +
      `🗄️ DB Type: ${(global.ST.config.database && global.ST.config.database.type) || "json"}`
    );
  }
};
