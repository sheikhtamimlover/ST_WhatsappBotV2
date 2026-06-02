"use strict";

module.exports = {
  config: {
    name: "welcome",
    version: "1.0.0",
    author: "ST",
    category: "events"
  },

  onStart: async ({ api, event, threadsData, userData }) => {
    if (event.logMessageType !== "log:subscribe") return;
    if (!event.isGroup && event.type !== "event") return;

    const { threadID, participants, isBotAdded } = event;
    if (!threadID) return;

    // If the bot itself was added — greet the group
    if (isBotAdded) {
      const cfg    = global.ST.config;
      const prefix = cfg.prefix || "!";
      const name   = cfg.botName || "WCA Bot";
      return api.sendMessage(
        `👋 *Hello everyone!*\nI'm *${name}*, your new assistant bot.\n\nType ${prefix}help to see all available commands.`,
        threadID
      );
    }

    // Welcome new members
    const added = Array.isArray(participants) ? participants : [];
    if (added.length === 0) return;

    let thread = null;
    try { thread = await threadsData.get(threadID); } catch (_) {}
    const groupName = (thread && thread.name) || "this group";

    for (const uid of added) {
      const name = await global.resolveUserDisplayName(api, uid, userData);

      try {
        await api.sendMessage(
          `👋 Welcome *${name}* to *${groupName}*!\n\nHope you enjoy your stay 🎉`,
          threadID
        );
      } catch (_) {}
    }
  }
};
