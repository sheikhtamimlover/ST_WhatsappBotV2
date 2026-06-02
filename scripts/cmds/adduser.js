"use strict";

module.exports = {
  config: {
    name: "adduser",
    version: "1.0.0",
    author: "ST",
    countDown: 5,
    role: 1,
    shortDescription: "Add a user to the current group",
    longDescription: "Adds a phone number/JID to the current group. Bot must be admin. Bot admin only.",
    category: "group",
    guide: { en: "{pn} [phone number]" }
  },

  onStart: async ({ api, event, args, message }) => {
    if (!event.isGroup) return message.reply("❌ This command only works in groups.");
    if (!args[0]) return message.reply("❌ Please provide a phone number. Example: !adduser 8801XXXXXXXXX");

    const raw   = args[0].replace(/[^0-9]/g, "");
    const jid   = raw + "@s.whatsapp.net";
    const phone = raw;

    try {
      await api.addUserToGroup(event.threadID, [jid]);
      return message.reply(`✅ *${phone}* has been added to the group.`);
    } catch (e) {
      return message.reply("❌ Failed to add user: " + e.message);
    }
  }
};
