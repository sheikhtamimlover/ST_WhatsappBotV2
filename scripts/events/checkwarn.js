"use strict";

const MAX_WARNS = 3;

module.exports = {
  config: {
    name: "checkwarn",
    version: "1.0.0",
    author: "ST",
    category: "events"
  },

  /**
   * Runs on every message event — auto-ban users who exceed MAX_WARNS.
   */
  onStart: async ({ api, event, threadsData, userData }) => {
    if (event.type !== "message") return;
    if (!event.senderID || !global.ST.DB) return;

    try {
      const user = await global.ST.DB.userData(event.senderID);
      if (!user) return;

      // Already banned
      if (user.isBan) return;

      // Check if warn count exceeds max
      if ((user.warnCount || 0) >= MAX_WARNS) {
        await global.ST.DB.users.set(event.senderID, true, "isBan");
        await global.ST.DB.users.set(event.senderID, `Auto-banned: exceeded ${MAX_WARNS} warnings`, "banReason");

        const phone = event.senderID.split(":")[0].split("@")[0];
        try {
          await api.sendMessage(
            `⛔ *${phone}* has been automatically banned after reaching ${MAX_WARNS} warnings.`,
            event.threadID
          );
        } catch (_) {}
      }
    } catch (_) {}
  }
};
