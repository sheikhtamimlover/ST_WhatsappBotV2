const fs = require("fs");
const path = require("path");
const { uploadToImgur } = require("imgur-link");
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

module.exports = {
  config: {
    name: "imgur",
    version: "1.0.1",
    author: "ST | Sheikh Tamim",
    countDown: 5,
    role: 0,
    category: "Image Url",
    description: "Upload an image to Imgur and get the link",
    usages: "Reply to an image and use !imgur"
  },

  onStart: async function ({ message, event, sock }) {
    const contextInfo = event.message?.message?.extendedTextMessage?.contextInfo;

    if (!contextInfo?.quotedMessage?.imageMessage) {
      return message.reply("⚠️ Please reply to an image to upload it to Imgur.");
    }

    const filePath = path.join(__dirname, `imgur_temp_${Date.now()}.jpg`);

    try {
      const fakeMsg = {
        key: {
          remoteJid: event.message.key.remoteJid,
          id: contextInfo.stanzaId,
          participant: contextInfo.participant || null,
          fromMe: false
        },
        message: contextInfo.quotedMessage
      };

      const imgBuffer = await downloadMediaMessage(
        fakeMsg, 'buffer', {},
        {
          logger: { level: 'silent', info: () => {}, error: () => {}, warn: () => {} },
          reuploadRequest: sock.updateMediaMessage
        }
      );

      fs.writeFileSync(filePath, imgBuffer);

      const processingMsg = await message.reply("⏳ Uploading to Imgur...");

      const imgurUrl = await uploadToImgur(filePath);

      try { fs.unlinkSync(filePath); } catch {}
      try { await message.unsend(processingMsg); } catch {}

      await message.reply(`✅ Imgur URL:\n${imgurUrl}`);

    } catch (error) {
      console.error("Imgur Upload Error:", error);
      try { fs.unlinkSync(filePath); } catch {}
      await message.reply("❌ Failed to upload the image. Please try again.");
    }
  }
};
