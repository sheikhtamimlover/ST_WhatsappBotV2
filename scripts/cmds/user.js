"use strict";

module.exports = {
  config: {
    name: "user",
    version: "1.0.0",
    author: "ST",
    countDown: 5,
    role: 0,
    shortDescription: "View user profile/data from database",
    longDescription: "Shows a user's stored data: name, money, EXP, ban status, warnings, etc.",
    category: "info",
    guide: { en: "{pn} [@mention | reply | uid]" }
  },

  onStart: async ({ api, event, args, message }) => {
    if (!global.ST.DB) return message.reply("❌ Database not initialized.");

    const targetUID = getTargetUser(event, args);
    const phone     = jidToPhone(targetUID);

    await message.react("⏳");

    let user;
    try {
      user = await global.ST.DB.userData(targetUID);
    } catch (e) {
      await message.react("❌");
      return message.reply("❌ Failed to fetch user data: " + e.message);
    }

    const name  = user.name || phone;
    const money = user.money || 0;
    const exp   = user.exp || 0;
    const isBan = user.isBan ? "Yes ⛔" : "No ✅";
    const warns = user.warnCount || 0;

    let text = `👤 *User Profile*\n`;
    text += `Name: ${name}\n`;
    text += `Phone: ${phone}\n`;
    text += `JID: ${targetUID}\n\n`;
    text += `💰 Money: ${money}\n`;
    text += `⭐ EXP: ${exp}\n`;
    text += `🚫 Banned: ${isBan}\n`;
    text += `⚠️ Warnings: ${warns}`;

    if (user.isBan && user.banReason) {
      text += `\n📋 Ban Reason: ${user.banReason}`;
    }
    if (warns > 0 && user.warnReason && user.warnReason.length > 0) {
      text += `\n📝 Warn Reasons: ${user.warnReason.join(", ")}`;
    }

    await message.react("✅");
    return message.reply(text);
  }
};
