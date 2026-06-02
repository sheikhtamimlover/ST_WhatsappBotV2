"use strict";

module.exports = {
  config: {
    name: "logsbot",
    version: "1.0.0",
    author: "ST",
    category: "events"
  },

  onStart: async ({ api, event, threadsData, userData }) => {
    if (!event) return;

    const { type, logMessageType, threadID, senderID, action } = event;
    if (type !== "event" && type !== "group_update") return;

    let groupName = threadID || "unknown";
    try {
      if (threadsData && threadID) {
        const t = await threadsData.get(threadID);
        if (t && t.name && t.name !== "Unknown Group") groupName = t.name;
      }
    } catch (_) {}

    const phone = (senderID || "").split(":")[0].split("@")[0] || senderID || "?";
    const c = global.utils.colors;

    const names = [];
    for (const uid of event.participants || []) {
      names.push(await global.resolveUserDisplayName(api, uid, userData));
    }
    const participantText = names.length ? names.join(", ") : "";

    switch (logMessageType) {
      case "log:subscribe":
        global.log.info("GROUP EVENT", `${c.greenBright("JOIN")} - ${groupName}: ${participantText}`);
        break;
      case "log:unsubscribe":
        global.log.info("GROUP EVENT", `${c.yellowBright("LEAVE")} - ${groupName}: ${participantText}`);
        break;
      case "log:thread-admins":
        global.log.info("GROUP EVENT", `${c.cyanBright("ADMIN")} - ${groupName}: ${action || "changed"} by ${phone}`);
        break;
      case "log:thread-name":
        global.log.info("GROUP EVENT", `${c.magentaBright("RENAME")} - ${groupName} (by ${phone})`);
        break;
      case "log:thread-image":
      case "log:thread-icon":
        global.log.info("GROUP EVENT", `${c.blueBright("ICON")} - ${groupName} (by ${phone})`);
        break;
      default:
        if (logMessageType) {
          global.log.info("GROUP EVENT", `${logMessageType} - ${groupName}`);
        }
        break;
    }

    if (event.isBotAdded)    global.log.success("BOT EVENT", `Bot was ADDED to: ${groupName} (${threadID})`);
    if (event.isBotRemoved)  global.log.warn("BOT EVENT",   `Bot was REMOVED from: ${groupName} (${threadID})`);
    if (event.isBotPromoted) global.log.success("BOT EVENT", `Bot was PROMOTED to admin in: ${groupName}`);
    if (event.isBotDemoted)  global.log.warn("BOT EVENT",   `Bot was DEMOTED in: ${groupName}`);
  }
};
