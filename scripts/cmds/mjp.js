const axios = require('axios');
const FormData = require('form-data');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const stapi = new global.utils.STBotApis();

module.exports = {
  config: {
    name: "midjourneyprompt",
    aliases: ["mjprompt", "mjp"],
    limit: 2,
    author: "ST | Sheikh Tamim",
    version: "1.0.1",
    countDown: 5,
    role: 0,
    description: "Analyze an image and extract Midjourney-style prompts",
    category: "ai",
    guide: {
      en: "Reply to an image with {pn} — Get AI prompt descriptions\nExample: Reply to any image with 'mjp'"
    }
  },

  onStart: async ({ event, message, sock }) => {
    try {
      const userName = event.message?.pushName || event.senderID;

      // Must be replying to an image
      const contextInfo = event.message?.message?.extendedTextMessage?.contextInfo;
      if (!contextInfo?.quotedMessage?.imageMessage) {
        return message.reply(
          `🔍 Midjourney Prompt Extractor\n\n` +
          `Usage:\n` +
          `• Reply to any image with !mjp\n\n` +
          `The bot will analyze the image and give you prompts you can use with !mj`
        );
      }

      const processingMsg = await message.reply(`🔍 ${userName}\nAnalyzing image...\n\n⏳ Progress: 0%`);

      // Download the quoted image
      let imageBuffer;
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
        imageBuffer = await downloadMediaMessage(
          fakeMsg, 'buffer', {},
          {
            logger: { level: 'silent', info: () => {}, error: () => {}, warn: () => {} },
            reuploadRequest: sock.updateMediaMessage
          }
        );
      } catch (err) {
        try { await message.edit(processingMsg.key, `❌ Failed to download image: ${err.message}`); } catch {}
        return;
      }

      // Submit describe task
      const formData = new FormData();
      formData.append('image', imageBuffer, { filename: 'image.jpg', contentType: 'image/jpeg' });
      formData.append('botType', 'MID_JOURNEY');

      let taskId;
      try {
        const resp = await axios.post(`${stapi.baseURL}/mj/describe`, formData, {
          headers: formData.getHeaders()
        });
        if (!resp.data.success) throw new Error(resp.data.message || 'Task submission failed');
        taskId = resp.data.taskId;
      } catch (err) {
        try { await message.edit(processingMsg.key, `❌ Failed to submit: ${err.message}`); } catch {}
        return;
      }

      // Poll for completion
      let isCompleted = false;
      let lastProgress = 0;
      let progressData = null;
      let editCount = 0;

      while (!isCompleted) {
        await new Promise(r => setTimeout(r, 3000));

        try {
          const resp = await axios.get(`${stapi.baseURL}/mj/progress/${taskId}`);
          progressData = resp.data;

          const cur = parseInt(progressData.progress) || 0;
          if (cur !== lastProgress && cur < 100) {
            lastProgress = cur;
            editCount++;
            if (editCount <= 1 || (cur >= 50 && editCount <= 3)) {
              try {
                await message.edit(
                  processingMsg.key,
                  `🔍 ${userName}\nAnalyzing image...\n\n⏳ Progress: ${progressData.progress}`
                );
              } catch {}
            }
          }

          if (progressData.isCompleted) isCompleted = true;
          if (progressData.status === 'FAILURE' || progressData.error) {
            throw new Error(progressData.error || 'Analysis failed');
          }
        } catch (err) {
          if (err.response?.status === 404) {
            try { await message.edit(processingMsg.key, `❌ Task not found or expired`); } catch {}
            return;
          }
          throw err;
        }
      }

      if (!progressData.task?.promptEn) {
        try { await message.edit(processingMsg.key, `❌ No description generated`); } catch {}
        return;
      }

      try { await message.unsend(processingMsg); } catch {}

      const prompts = progressData.task.promptEn.split('\r\n').filter(p => p.trim());

      let responseMsg = `🔍 Image Analysis Results\n\n`;
      prompts.forEach((p, i) => {
        responseMsg += `${i + 1}. ${p.length > 100 ? p.substring(0, 100) + '...' : p}\n\n`;
      });
      responseMsg += `Reply with 1–${prompts.length} to copy a prompt`;

      const resultMsg = await message.reply(responseMsg);

      global.ST.onReply.set(resultMsg.key.id, {
        commandName: module.exports.config.name,
        type: 'describe',
        taskId,
        prompts,
        messageID: resultMsg.key.id,
        author: event.senderID
      });

    } catch (error) {
      console.error('Error in mjp command:', error);
      await message.reply(`❌ Error: ${error.message}`);
    }
  },

  onReply: async function ({ message, event, Reply }) {
    const { author, type, prompts } = Reply;
    if (event.senderID !== author) return;

    const input = event.body.trim();

    if (type === 'describe' && prompts) {
      if (!/^\d+$/.test(input)) {
        return message.reply(`❌ Please reply with a number between 1–${prompts.length}`);
      }
      const num = parseInt(input);
      if (num < 1 || num > prompts.length) {
        return message.reply(`❌ Invalid number. Choose between 1–${prompts.length}`);
      }
      const selected = prompts[num - 1];
      return message.reply(
        `✅ Prompt ${num}:\n\n${selected}\n\n` +
        `Use with: !mj ${selected.substring(0, 50)}...`
      );
    }
  }
};
