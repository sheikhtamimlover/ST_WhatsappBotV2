"use strict";

module.exports = {
  config: {
    name: "balance",
    version: "1.0.0",
    author: "ST",
    countDown: 5,
    role: 0,
    shortDescription: "Check your or another user's balance",
    longDescription: "Shows money, EXP and ranking data from the database.",
    category: "economy",
    guide: { en: "{pn} [@mention | reply]" }
  },

  onStart: async ({ api, event, args, message }) => {
    if (!global.ST.DB) return message.reply("❌ Database not initialized.");

    const targetUID = getTargetUser(event, args);
    const phone     = jidToPhone(targetUID);
    const isSelf    = targetUID === event.senderID;

    const user = await global.ST.DB.userData(targetUID);
    const name = user.name && user.name !== "Unknown" ? user.name : phone;

    return message.reply(
      `💰 *${isSelf ? "Your" : name + "'s"} Balance*\n\n` +
      `💵 Money: ${user.money || 0}\n` +
      `⭐ EXP: ${user.exp || 0}`
    );
  }
};
