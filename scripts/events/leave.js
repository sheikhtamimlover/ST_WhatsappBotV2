"use strict";

module.exports = {
  config: {
    name: "leave",
    version: "1.0.0",
    author: "ST",
    category: "events"
  },

  onStart: async ({ api, event, threadsData, userData }) => {
    if (event.logMessageType !== "log:unsubscribe") return;
    if (!event.isGroup && event.type !== "event") return;

    const { threadID, participants, isBotRemoved } = event;
    if (!threadID) return;

    // If bot was removed — just log it (logsbot handles the console log)
    if (isBotRemoved) return;

    const left = Array.isArray(participants) ? participants : [];
    if (left.length === 0) return;

    let thread = null;
    try { thread = await threadsData.get(threadID); } catch (_) {}
    const groupName = (thread && thread.name) || "the group";

    for (const uid of left) {
      const name = await global.resolveUserDisplayName(api, uid, userData);

      try {
        await api.sendMessage(
          `👋 *${name}* has left ${groupName}. Goodbye!`,
          threadID
        );
      } catch (_) {}
    }
  }
};
