"use strict";

module.exports = {
  config: {
    name: "kick",
    version: "1.0.0",
    author: "ST",
    countDown: 5,
    role: 1,
    shortDescription: "Kick a member from the group",
    longDescription: "Removes a user from the current group. Bot must be admin. Admins only.",
    category: "group",
    guide: { en: "{pn} [@mention | reply]" }
  },

  onStart: async ({ api, event, args, message }) => {
    if (!event.isGroup) return message.reply("❌ This command only works in groups.");

    const targetUID = getTargetUser(event, args);
    const phone     = jidToPhone(targetUID);

    if (targetUID === event.senderID) return message.reply("❌ You cannot kick yourself.");

    const adminList = global.ST.config.adminBot || [];
    if (adminList.includes(targetUID)) return message.reply("❌ You cannot kick a bot admin.");

    try {
      await api.removeUserFromGroup(event.threadID, [targetUID]);
      return message.reply(`✅ *${phone}* has been kicked from the group.`);
    } catch (e) {
      return message.reply("❌ Failed to kick: " + e.message + "\n(Make sure the bot is an admin.)");
    }
  }
};
