"use strict";

module.exports = {
  config: {
    name: "unsend",
    version: "1.0.0",
    author: "ST",
    countDown: 3,
    role: 1,
    shortDescription: "Delete/unsend a replied message",
    longDescription: "Deletes the bot's replied-to message. Admin only.",
    category: "admin",
    guide: { en: "{pn} (reply to a bot message)" }
  },

  onStart: async ({ api, event, message }) => {
    const replied = event.messageReply || event.replyToMessage;
    if (!replied) {
      return message.reply("Please reply to the message you want to delete.");
    }

    const targetMsgID = replied.messageID || replied.messageId;
    if (!targetMsgID) {
      return message.reply("Could not detect the replied message ID.");
    }

    try {
      await api.deleteMessage(event.threadID, {
        remoteJid: event.threadID,
        id: targetMsgID,
        fromMe: true,
      }, true);
      await message.react("✅");
    } catch (e) {
      return message.reply("Failed to delete. Make sure you replied to one of my messages.\n" + e.message);
    }
  }
};
