"use strict";

module.exports = {
  config: {
    name: "admin",
    version: "1.0.0",
    author: "ST",
    countDown: 5,
    role: 1,
    shortDescription: "Promote or demote a group member as admin",
    longDescription: "Promotes or demotes a group member as admin. Bot must be a group admin. Bot admin only.",
    category: "group",
    guide: { en: "{pn} promote/demote [@mention | reply]" }
  },

  onStart: async ({ api, event, args, message }) => {
    if (!event.isGroup) return message.reply("❌ This command only works in groups.");

    const action = (args[0] || "").toLowerCase();
    if (action !== "promote" && action !== "demote") {
      return message.reply("❌ Usage: !admin promote/demote [@mention | reply]");
    }

    const relevantArgs = args.slice(1);
    const targetUID    = getTargetUser(event, relevantArgs);
    const phone        = jidToPhone(targetUID);

    try {
      if (action === "promote") {
        await api.promoteAdmin(event.threadID, [targetUID]);
        return message.reply(`✅ *${phone}* has been promoted to group admin.`);
      } else {
        await api.demoteAdmin(event.threadID, [targetUID]);
        return message.reply(`✅ *${phone}* has been demoted from group admin.`);
      }
    } catch (e) {
      return message.reply("❌ Failed: " + e.message + "\n(Make sure the bot is a group admin.)");
    }
  }
};
