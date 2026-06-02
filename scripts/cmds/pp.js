"use strict";

module.exports = {
  config: {
    name: "pp",
    version: "1.1.0",
    author: "ST",
    countDown: 10,
    role: 0,
    shortDescription: "Get profile picture of a user or group",
    longDescription: "Sends the profile picture of a mentioned user, replied user, or yourself.",
    category: "info",
    guide: { en: "{pn} [@mention | reply | uid]" }
  },

  onStart: async ({ api, event, args, message }) => {
    const targetUID = global.getTargetUser
      ? global.getTargetUser(event, args)
      : (event.mentions && event.mentions[0]) || event.senderID;

    await message.react("⏳");

    let ppUrl = null;
    try {
      ppUrl = await api.getProfilePicture(targetUID);
    } catch (_) {}

    // Fallback: try with phone JID format
    if (!ppUrl) {
      try {
        const { normUID, formatJID } = require("../../wca/utils");
        ppUrl = await api.getProfilePicture(normUID(targetUID) + "@s.whatsapp.net");
      } catch (_) {}
    }

    if (!ppUrl) {
      await message.react("❌");
      return message.reply("❌ Could not fetch profile picture — user may have it hidden.");
    }

    const { normUID } = require("../../wca/utils");
    const phone = normUID(targetUID);

    try {
      await message.reply({
        body: `📸 Profile picture of ${phone}`,
        attachment: { type: "image", url: ppUrl, mimetype: "image/jpeg" },
      });
      await message.react("✅");
    } catch (e) {
      await message.react("❌");
      return message.reply("❌ Failed to send profile picture: " + e.message);
    }
  }
};
