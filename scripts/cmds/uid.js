"use strict";

module.exports = {
  config: {
    name: "uid",
    version: "1.0.0",
    author: "ST",
    countDown: 5,
    role: 0,
    shortDescription: "Get UID/JID of a user or group",
    longDescription: "Returns the WhatsApp JID (UID) of yourself, a mentioned user, replied user, or the current group.",
    category: "info",
    guide: { en: "{pn} [@mention | reply | 'group']" }
  },

  onStart: async ({ api, event, args, message }) => {
    const isGroupReq = args[0] && args[0].toLowerCase() === "group";

    if (isGroupReq) {
      if (!event.isGroup) return message.reply("❌ This command must be used in a group.");
      return message.reply(
        `📋 *Group Info*\n` +
        `Thread ID: ${event.threadID}`
      );
    }

    const targetUID = getTargetUser(event, args);
    const phone     = jidToPhone(targetUID);

    let text = `📋 *User UID*\n`;
    text += `Phone: ${phone}\n`;
    text += `JID: ${targetUID}`;

    try {
      if (global.ST.DB && global.ST.DB.userData) {
        const user = await global.ST.DB.userData(targetUID);
        if (user && user.name && user.name !== "Unknown") {
          text = `📋 *User Info*\n` +
            `Name: ${user.name}\n` +
            `Phone: ${phone}\n` +
            `JID: ${targetUID}`;
        }
      }
    } catch (_) {}

    return message.reply(text);
  }
};
