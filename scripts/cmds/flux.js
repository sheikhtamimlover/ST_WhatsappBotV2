const axios = require('axios');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const stapi = new global.utils.STBotApis();

module.exports = {
  config: {
    name: "flux",
    aliases: [],
    version: "1.0.1",
    author: "ST | Sheikh Tamim",
    countDown: 5,
    role: 0,
    shortDescription: "Generate images using Flux 2 API",
    longDescription: "Generate images with Flux 2 models. Reply to an image to use it as input.",
    category: "Image Generator",
    guide: {
      en: "{pn} <prompt> --m <model> --ar <ratio> --r <res> --n <count>\n\n" +
        "Example: {pn} a cat on the moon --m 1 --ar 16:9 --n 2\n\n" +
        "Models:\n" +
        "  1: Flux 2 Pro (default)\n" +
        "  2: Flux 2 Dev\n" +
        "  3: Flux 2 Flex\n" +
        "  4: Flux 2 Max\n\n" +
        "Aspect Ratios: 1:1, 4:3, 3:4, 16:9, 9:16, 21:9, 9:21\n" +
        "Resolution (MP): 0.25, 0.5, 1, 2\n" +
        "Count (--n): 1–4 images (default: 1)\n\n" +
        "Reply to an image to use it as input for generation."
    }
  },

  onStart: async function ({ message, args, event, sock }) {
    const userName = event.message?.pushName || event.senderID;

    // Parse args
    let prompt = "";
    let model = "1";
    let aspectRatio = "1:1";
    let resolution = "1";
    let imageCount = 1;

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--m' && args[i + 1]) {
        model = args[++i];
      } else if (args[i] === '--ar' && args[i + 1]) {
        aspectRatio = args[++i];
      } else if (args[i] === '--r' && args[i + 1]) {
        resolution = args[++i];
      } else if (args[i] === '--n' && args[i + 1]) {
        const n = parseInt(args[++i]);
        if (!isNaN(n) && n >= 1 && n <= 4) imageCount = n;
      } else {
        prompt += `${args[i]} `;
      }
    }
    prompt = prompt.trim();

    const modelMap = {
      "1": "flux-2-pro",
      "2": "flux-2-dev",
      "3": "flux-2-flex",
      "4": "flux-2-max"
    };
    const modelNames = {
      "flux-2-pro": "Flux 2 Pro",
      "flux-2-dev": "Flux 2 Dev",
      "flux-2-flex": "Flux 2 Flex",
      "flux-2-max": "Flux 2 Max"
    };
    const resolutionMap = {
      "0.25": "0.25 MP",
      "0.5": "0.5 MP",
      "1": "1 MP",
      "2": "2 MP"
    };

    if (!prompt) {
      return message.reply(
        "❌ Please provide a prompt.\n" +
        "Example: !flux a cat on the moon\n" +
        "Use --n 4 to generate 4 images at once."
      );
    }
    if (!modelMap[model]) {
      return message.reply("❌ Invalid model. Use 1 (Pro), 2 (Dev), 3 (Flex), or 4 (Max).");
    }

    const selectedModel = modelMap[model];
    const selectedResolution = resolutionMap[resolution] || "1 MP";

    // ── Download input image from replied message ──
    let inputImages = [];
    const contextInfo = event.message?.message?.extendedTextMessage?.contextInfo;

    if (contextInfo?.quotedMessage?.imageMessage) {
      const processingMsg = await message.reply("📸 Processing input image...");
      try {
        // Reconstruct a minimal Baileys message object so downloadMediaMessage can work
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

        const mimetype = contextInfo.quotedMessage.imageMessage.mimetype || 'image/jpeg';
        const base64 = imgBuffer.toString('base64');
        inputImages.push(`data:${mimetype};base64,${base64}`);

        await message.unsend(processingMsg.key);
      } catch (err) {
        await message.unsend(processingMsg.key);
        console.error("Error downloading replied image:", err.message);
        return message.reply("❌ Could not download the replied image. Please try again.");
      }
    }

    // ── Status message ──
    const countLabel = imageCount === 1 ? "1 image" : `${imageCount} images`;
    const processMsg = await message.reply(
      `🚀 ${userName}, generating ${countLabel} with ${modelNames[selectedModel]}...\n⏳ Please wait.`
    );

    try {
      const apiUrl = `${stapi.baseURL}/flux2/generate`;

      const buildPayload = () => {
        const payload = {
          model: selectedModel,
          prompt: prompt,
          outputFormat: "jpg",
          outputQuality: 80
        };

        if (inputImages.length > 0) {
          payload.inputImages = inputImages;
          payload.aspectRatio = selectedModel === "flux-2-max" ? aspectRatio : "match_input_image";
        } else {
          payload.aspectRatio = aspectRatio;
        }

        if (selectedModel === "flux-2-pro") {
          payload.resolution = selectedResolution;
          payload.safetyTolerance = 2;
          payload.promptUpsampling = false;
        } else if (selectedModel === "flux-2-dev") {
          payload.goFast = true;
        } else if (selectedModel === "flux-2-flex") {
          payload.resolution = selectedResolution;
          payload.safetyTolerance = 2;
          payload.steps = 30;
          payload.guidance = 4.5;
          payload.promptUpsampling = false;
        } else if (selectedModel === "flux-2-max") {
          payload.resolution = selectedResolution;
          payload.safetyTolerance = 2;
        }

        return payload;
      };

      const generateOne = async () => {
        const response = await axios.post(apiUrl, buildPayload());
        if (!response.data.success || !response.data.output) {
          throw new Error("No output received from API");
        }
        const imageUrl = Array.isArray(response.data.output)
          ? response.data.output[0]
          : response.data.output;
        const imgResp = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        return Buffer.from(imgResp.data);
      };

      // Run all in parallel
      const results = await Promise.allSettled(
        Array.from({ length: imageCount }, () => generateOne())
      );

      try { await message.unsend(processMsg.key); } catch {}

      const succeeded = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');

      if (succeeded.length === 0) {
        throw new Error(results[0].reason?.message || "All generations failed");
      }

      const usedRatio = inputImages.length > 0 && selectedModel !== "flux-2-max"
        ? "match_input_image"
        : aspectRatio;

      // Send each image
      for (let i = 0; i < succeeded.length; i++) {
        const caption = i === 0
          ? `✨ ${userName}\n` +
            `🎨 Model: ${modelNames[selectedModel]}\n` +
            `📐 Ratio: ${usedRatio}\n` +
            `📏 Resolution: ${selectedResolution}` +
            (succeeded.length > 1 ? `\n🖼️ Image 1/${succeeded.length}` : '')
          : `🖼️ Image ${i + 1}/${succeeded.length}`;

        await message.sendImage(succeeded[i].value, caption);
      }

      if (failed.length > 0) {
        await message.reply(`⚠️ ${failed.length} of ${imageCount} image(s) failed to generate.`);
      }

    } catch (error) {
      console.error("Flux error:", error.response?.data || error.message);
      try { await message.unsend(processMsg.key); } catch {}
      return message.reply(
        `❌ Error generating image.\n${error.response?.data?.error || error.message}`
      );
    }
  }
};
