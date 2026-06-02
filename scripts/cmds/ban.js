"use strict";

module.exports = {
  config: {
    name: "ban",
    version: "1.0.0",
    author: "ST",
    countDown: 5,
    role: 1,
    shortDescription: "Ban a user from using the bot",
    longDescription: "Bans a user from using bot commands. Admins only.",
    category: "admin",
    guide: { en: "{pn} [@mention | reply] [reason]" }
  },

  onStart: async ({ api, event, args, message }) => {
    if (!global.ST.DB) return message.reply("❌ Database not initialized.");

    const targetUID = getTargetUser(event, args);
    const phone     = jidToPhone(targetUID);
    const reason    = args.filter(a => !/^\d{7,}$/.test(a)).join(" ") || "No reason provided";

    if (targetUID === event.senderID) return message.reply("❌ You cannot ban yourself.");

    const adminList = global.ST.config.adminBot || [];
    if (adminList.includes(targetUID)) return message.reply("❌ You cannot ban a bot admin.");

    await global.ST.DB.users.set(targetUID, true, "isBan");
    await global.ST.DB.users.set(targetUID, reason, "banReason");

    return message.reply(`✅ *${phone}* has been banned.\n📋 Reason: ${reason}`);
  }
};
