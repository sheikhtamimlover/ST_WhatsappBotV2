const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const stapi = new global.utils.STBotApis();

module.exports = {
  config: {
    name: "nanobanana",
    aliases: ["nano"],
    version: "1.0.1",
    author: "ST | Sheikh Tamim",
    countDown: 5,
    role: 0,
    shortDescription: "Generate images using NanoBanana Pro",
    longDescription: "Generate images with NanoBanana Pro. Reply to an image to use it as input.",
    category: "Image Generator",
    guide: {
      en: `{pn} <prompt> --r <resolution> --ar <aspectRatio> --m <model>

Example: {pn} a sunset over the ocean --r 2K --ar 16:9 --m 1

Models:
  1: nano-banana-pro (default)
  2: nano-banana
  3: gen4-image-turbo

Resolution: 1K, 2K, 4K
Aspect Ratios: 1:1, 4:3, 3:4, 16:9, 9:16, 21:9, 9:21

Reply to an image to use it as input.`
    }
  },

  onStart: async function ({ message, args, event, sock }) {
    const userName = event.message?.pushName || event.senderID;

    let prompt = "";
    let resolution = "2K";
    let aspectRatio = "4:3";
    let model = "1";

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--r' && args[i + 1]) {
        resolution = args[++i].toUpperCase();
      } else if (args[i] === '--ar' && args[i + 1]) {
        aspectRatio = args[++i];
      } else if (args[i] === '--m' && args[i + 1]) {
        model = args[++i];
      } else {
        prompt += `${args[i]} `;
      }
    }
    prompt = prompt.trim();

    const modelMap = {
      "1": "nano-banana-pro",
      "2": "nano-banana",
      "3": "gen4-image-turbo"
    };
    const modelNames = {
      "nano-banana-pro": "NanoBanana Pro",
      "nano-banana": "NanoBanana",
      "gen4-image-turbo": "Gen4 Image Turbo"
    };

    const selectedModel = modelMap[model] || "nano-banana-pro";

    if (!prompt) {
      return message.reply("❌ Please provide a prompt.\nExample: !nano a sunset over the ocean");
    }

    // ── Download input image from replied message ──
    const contextInfo = event.message?.message?.extendedTextMessage?.contextInfo;
    if (!contextInfo?.quotedMessage?.imageMessage) {
      return message.reply(
        "❌ Please reply to an image to use as input.\n\n" +
        "Example: Reply to any image, then type:\n" +
        `!nano ${prompt}`
      );
    }

    const processMsg = await message.reply(`📸 ${userName}, processing input image...`);

    let tempInputPath = null;
    try {
      const quotedFakeMsg = {
        key: {
          remoteJid: event.message.key.remoteJid,
          id: contextInfo.stanzaId,
          participant: contextInfo.participant || null,
          fromMe: false
        },
        message: contextInfo.quotedMessage
      };

      const imgBuffer = await downloadMediaMessage(
        quotedFakeMsg,
        'buffer',
        {},
        {
          logger: { level: 'silent', info: () => {}, error: () => {}, warn: () => {} },
          reuploadRequest: sock.updateMediaMessage
        }
      );

      tempInputPath = path.join(__dirname, `nano_in_${Date.now()}.jpg`);
      fs.writeFileSync(tempInputPath, imgBuffer);
    } catch (err) {
      try { await message.unsend(processMsg); } catch {}
      console.error("Error downloading image:", err.message);
      return message.reply("❌ Could not download the replied image. Please try again.");
    }

    try { await message.unsend(processMsg); } catch {}

    const genMsg = await message.reply(
      `🚀 ${userName}, generating with ${modelNames[selectedModel]}...\n` +
      `📐 Ratio: ${aspectRatio} | 📏 Resolution: ${resolution}\n` +
      `⏳ Please wait.`
    );

    let tempOutputPath = null;
    try {
      const formData = new FormData();
      formData.append('images', fs.createReadStream(tempInputPath));
      formData.append('prompt', prompt);
      formData.append('model', selectedModel);
      formData.append('resolution', resolution);
      formData.append('aspectRatio', aspectRatio);
      formData.append('outputFormat', 'png');
      formData.append('safetyFilterLevel', 'block_only_high');

      const response = await axios.post(`${stapi.baseURL}/douedit/upload-images`, formData, {
        headers: { ...formData.getHeaders() }
      });

      if (!response.data.success || !response.data.data?.imageUrl) {
        throw new Error("No output received from API");
      }

      const imageUrl = response.data.data.imageUrl;
      const imgResp = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const resultBuffer = Buffer.from(imgResp.data);

      try { await message.unsend(genMsg); } catch {}

      await message.sendImage(
        resultBuffer,
        `✨ ${userName}, image ready!\n` +
        `🎨 Model: ${modelNames[selectedModel]}\n` +
        `📐 Ratio: ${aspectRatio} | 📏 Resolution: ${resolution}`
      );

    } catch (error) {
      console.error("NanoBanana error:", error.response?.data || error.message);
      try { await message.unsend(genMsg); } catch {}
      await message.reply(
        `❌ Error generating image.\n${error.response?.data?.error || error.message}`
      );
    } finally {
      if (tempInputPath && fs.existsSync(tempInputPath)) {
        try { fs.unlinkSync(tempInputPath); } catch {}
      }
      if (tempOutputPath && fs.existsSync(tempOutputPath)) {
        try { fs.unlinkSync(tempOutputPath); } catch {}
      }
    }
  }
};
