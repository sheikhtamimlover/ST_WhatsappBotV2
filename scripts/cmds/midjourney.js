const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const stapi = new global.utils.STBotApis();

// ── helper: download the image from a quoted message ──
async function downloadQuotedImage(event, sock) {
  const contextInfo = event.message?.message?.extendedTextMessage?.contextInfo;
  if (!contextInfo?.quotedMessage?.imageMessage) return null;
  const fakeMsg = {
    key: {
      remoteJid: event.message.key.remoteJid,
      id: contextInfo.stanzaId,
      participant: contextInfo.participant || null,
      fromMe: false
    },
    message: contextInfo.quotedMessage
  };
  return downloadMediaMessage(
    fakeMsg, 'buffer', {},
    {
      logger: { level: 'silent', info: () => {}, error: () => {}, warn: () => {} },
      reuploadRequest: sock.updateMediaMessage
    }
  );
}

// ── shared polling helper ──
async function pollProgress(taskId, processingMsg, message, label, userName) {
  let isCompleted = false;
  let lastProgress = 0;
  let progressData = null;
  let editCount = 0;

  while (!isCompleted) {
    await new Promise(r => setTimeout(r, 3000));

    const resp = await axios.get(`${stapi.baseURL}/mj/progress/${taskId}`);
    progressData = resp.data;

    const cur = parseInt(progressData.progress) || 0;
    if (cur !== lastProgress && cur < 100) {
      lastProgress = cur;
      if (editCount === 0 || (cur >= 50 && editCount === 1) || (cur >= 90 && editCount === 2)) {
        editCount++;
        try {
          await message.edit(processingMsg.key, `${label}\n\n⏳ Progress: ${progressData.progress}`);
        } catch {}
      }
    }

    if (progressData.isCompleted) isCompleted = true;
    if (progressData.status === 'FAILURE' || progressData.error) {
      throw new Error(progressData.error || 'Generation failed');
    }
  }
  return progressData;
}

// ── build button map and caption line for U/V grid ──
function buildGridButtons(buttons) {
  const buttonMap = new Map();
  const uButtons = buttons.filter(b => b.label?.startsWith('U'));
  const vButtons = buttons.filter(b => b.label?.startsWith('V'));
  const refreshBtn = buttons.find(b => b.emoji === '🔄');

  uButtons.forEach(b => buttonMap.set(b.label, { customId: b.customId, label: b.label }));
  vButtons.forEach(b => buttonMap.set(b.label, { customId: b.customId, label: b.label }));
  if (refreshBtn) buttonMap.set('🔄', { customId: refreshBtn.customId, label: 'Regenerate' });

  const parts = [
    uButtons.map(b => b.label).join(' '),
    refreshBtn ? '🔄' : '',
    vButtons.map(b => b.label).join(' ')
  ].filter(Boolean);

  return { buttonMap, actionLine: parts.length ? `\n\n${parts.join(' ')}` : '', isInitial: true };
}

// ── build numbered button map for upscale actions ──
function buildUpscaleButtons(buttons) {
  const buttonMap = new Map();
  const actionLines = [];
  buttons.forEach((btn, i) => {
    const id = i + 1;
    const lbl = btn.emoji && btn.label ? `${btn.emoji} ${btn.label}` : btn.label || btn.emoji || `Action ${id}`;
    buttonMap.set(id, { customId: btn.customId, label: lbl });
    actionLines.push(`${id}. ${lbl}`);
  });
  const actionLine = actionLines.length
    ? `\n\n✨ Available Actions:\n${actionLines.join('\n')}\n\n💡 Reply with a number to select`
    : '';
  return { buttonMap, actionLine, isInitial: false };
}

module.exports = {
  config: {
    name: "mj",
    aliases: ["midjourney"],
    author: "ST | Sheikh Tamim",
    version: "1.0.1",
    countDown: 5,
    role: 0,
    description: "Generate images using Midjourney AI",
    category: "ai",
    guide: {
      en: "{pn} <prompt> - Generate image\nReply to image with {pn} <prompt> - Use image reference\nExample: {pn} A futuristic cityscape at sunset"
    }
  },

  onStart: async ({ event, message, args, sock }) => {
    try {
      const userName = event.message?.pushName || event.senderID;

      if (args.length === 0) {
        return message.reply(
          `🎨 Midjourney Image Generator\n\n` +
          `Usage:\n` +
          `• !mj <prompt> — Generate image\n` +
          `• Reply to image with !mj <prompt> — Use image reference\n\n` +
          `Example: !mj A futuristic cityscape at sunset\n\n` +
          `Tip: Use '!mjp' to extract prompts from images!`
        );
      }

      const prompt = args.join(' ');

      // Download quoted image if replying to one
      let imageBuffer = null;
      const contextInfo = event.message?.message?.extendedTextMessage?.contextInfo;
      if (contextInfo?.quotedMessage?.imageMessage) {
        try {
          imageBuffer = await downloadQuotedImage(event, sock);
        } catch (err) {
          return message.reply(`❌ Failed to download image: ${err.message}`);
        }
      }

      const processingMsg = await message.reply(
        `🎨 ${userName}\nGenerating: ${prompt}\n\n⏳ Progress: 0%`
      );

      // Submit task
      const formData = new FormData();
      formData.append('prompt', prompt);
      formData.append('botType', 'MID_JOURNEY');
      if (imageBuffer) {
        formData.append('images', imageBuffer, { filename: 'reference.jpg', contentType: 'image/jpeg' });
      }

      let taskId;
      try {
        const resp = await axios.post(`${stapi.baseURL}/mj/imagine`, formData, {
          headers: formData.getHeaders()
        });
        if (!resp.data.success) throw new Error(resp.data.message || 'Task submission failed');
        taskId = resp.data.taskId;
      } catch (err) {
        try { await message.edit(processingMsg.key, `❌ Failed to submit: ${err.message}`); } catch {}
        return;
      }

      // Poll progress
      let progressData;
      try {
        progressData = await pollProgress(
          taskId, processingMsg, message,
          `🎨 ${userName}\nGenerating: ${prompt}`,
          userName
        );
      } catch (err) {
        try { await message.edit(processingMsg.key, `❌ ${err.message}`); } catch {}
        return;
      }

      if (!progressData.task?.imageUrl) {
        try { await message.edit(processingMsg.key, `❌ No image generated`); } catch {}
        return;
      }

      // Download result
      const tmpDir = path.join(__dirname, '..', '..', 'tmp');
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
      const webpPath = path.join(tmpDir, `mj_${taskId}.webp`);
      const imgResp = await axios.get(progressData.task.imageUrl, { responseType: 'arraybuffer' });
      fs.writeFileSync(webpPath, Buffer.from(imgResp.data));

      try { await message.unsend(processingMsg); } catch {}

      // Build buttons
      let buttonMap, actionLine, isInitial;
      if (progressData.task.buttons?.length) {
        ({ buttonMap, actionLine, isInitial } = buildGridButtons(progressData.task.buttons));
      } else {
        buttonMap = new Map(); actionLine = ''; isInitial = true;
      }

      // Read buffer then delete temp file
      const imgBuf = fs.readFileSync(webpPath);
      try { fs.unlinkSync(webpPath); } catch {}

      const resultMsg = await message.sendImage(imgBuf, actionLine.trim());

      global.ST.onReply.set(resultMsg.key.id, {
        commandName: module.exports.config.name,
        taskId,
        prompt,
        buttons: progressData.task.buttons || [],
        buttonMap,
        messageID: resultMsg.key.id,
        author: event.senderID,
        isInitial
      });

    } catch (error) {
      console.error('Error in mj command:', error);
      await message.reply(`❌ Error: ${error.message}`);
    }
  },

  onReply: async function ({ message, event, Reply, sock }) {
    const { author, taskId, prompt, buttonMap, isInitial } = Reply;
    if (event.senderID !== author) return;

    const userName = event.message?.pushName || event.senderID;
    const input = event.body.trim();
    let selectedButton;

    if (isInitial) {
      selectedButton = buttonMap.get(input);
      if (!selectedButton) {
        return message.reply(`❌ Invalid selection.\n\nAvailable: ${Array.from(buttonMap.keys()).join(' ')}`);
      }
    } else {
      if (!/^\d+$/.test(input)) return message.reply(`❌ Please reply with a number.`);
      selectedButton = buttonMap.get(parseInt(input));
      if (!selectedButton) {
        return message.reply(`❌ Invalid number.\n\nAvailable:\n${Array.from(buttonMap.entries()).map(([k, v]) => `${k}. ${v.label}`).join('\n')}`);
      }
    }

    let actionName = 'Processing';
    let isUpscale = false;
    if (selectedButton.customId.includes('upsample')) { actionName = 'Upscaling'; isUpscale = true; }
    else if (selectedButton.customId.includes('variation')) actionName = 'Creating variation';
    else if (selectedButton.customId.includes('reroll')) actionName = 'Regenerating';

    const processingMsg = await message.reply(`⏳ ${userName}\n${actionName}...\n\nProgress: 0%`);

    try {
      const actionResp = await axios.post(`${stapi.baseURL}/mj/action`, {
        taskId, customId: selectedButton.customId
      });
      if (!actionResp.data.success) {
        try { await message.edit(processingMsg.key, `❌ Action failed`); } catch {}
        return;
      }

      const newTaskId = actionResp.data.taskId;
      let progressData;
      try {
        progressData = await pollProgress(
          newTaskId, processingMsg, message,
          `⏳ ${userName}\n${actionName}...`,
          userName
        );
      } catch (err) {
        try { await message.edit(processingMsg.key, `❌ ${err.message}`); } catch {}
        return;
      }

      const imgResp = await axios.get(progressData.task.imageUrl, { responseType: 'arraybuffer' });
      const tmpDir = path.join(__dirname, '..', '..', 'tmp');
      const webpPath = path.join(tmpDir, `mj_${newTaskId}.webp`);
      fs.writeFileSync(webpPath, Buffer.from(imgResp.data));

      try { await message.unsend(processingMsg); } catch {}

      let newButtonMap, displayBody, nextIsInitial;
      if (progressData.task.buttons?.length) {
        if (isUpscale) {
          ({ buttonMap: newButtonMap, actionLine: displayBody, isInitial: nextIsInitial } = buildUpscaleButtons(progressData.task.buttons));
        } else {
          ({ buttonMap: newButtonMap, actionLine: displayBody, isInitial: nextIsInitial } = buildGridButtons(progressData.task.buttons));
        }
      } else {
        newButtonMap = new Map(); displayBody = ''; nextIsInitial = true;
      }

      const imgBuf = fs.readFileSync(webpPath);
      try { fs.unlinkSync(webpPath); } catch {}

      const resultMsg = await message.sendImage(imgBuf, displayBody.trim());

      global.ST.onReply.set(resultMsg.key.id, {
        commandName: module.exports.config.name,
        taskId: newTaskId,
        prompt,
        buttons: progressData.task.buttons || [],
        buttonMap: newButtonMap,
        messageID: resultMsg.key.id,
        author: event.senderID,
        isInitial: nextIsInitial
      });

    } catch (error) {
      console.error('Error in mj action:', error);
      await message.reply(`❌ Error: ${error.message}`);
    }
  }
};
