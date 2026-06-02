"use strict";

module.exports = {
  config: {
    name: "warn",
    version: "1.0.0",
    author: "ST",
    countDown: 5,
    role: 1,
    shortDescription: "Warn a user",
    longDescription: "Issues a warning to a user. Admins only. Accumulated warns can trigger auto-ban.",
    category: "admin",
    guide: { en: "{pn} [@mention | reply] [reason]" }
  },

  onStart: async ({ api, event, args, message }) => {
    if (!global.ST.DB) return message.reply("❌ Database not initialized.");

    const targetUID = getTargetUser(event, args);
    const phone     = jidToPhone(targetUID);
    const reason    = args.filter(a => !/^\d{7,}$/.test(a)).join(" ") || "No reason provided";

    if (targetUID === event.senderID) return message.reply("❌ You cannot warn yourself.");

    const user     = await global.ST.DB.userData(targetUID);
    const newCount = (user.warnCount || 0) + 1;
    const reasons  = [...(user.warnReason || []), reason];

    await global.ST.DB.users.set(targetUID, newCount, "warnCount");
    await global.ST.DB.users.set(targetUID, reasons, "warnReason");

    return message.reply(
      `⚠️ *${phone}* has been warned.\n` +
      `📋 Reason: ${reason}\n` +
      `🔢 Total Warnings: ${newCount}`
    );
  }
};
