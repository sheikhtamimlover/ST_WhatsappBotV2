const axios = require("axios");
const path = require("path");

const stapi = new global.utils.STBotApis();

const DEFAULT_CHARACTER_ID = "pUgX0GZ6P8SpBaLKWg3tATJRjIgK8m2jLAdkbo8nG8Y";

module.exports = {
  config: {
    name: "cai",
    aliases: [],
    version: "1.0.1",
    author: "ST | Sheikh Tamim",
    countDown: 5,
    role: 0,
    description: "Character AI chat system",
    category: "ai"
  },

  onStart: async function ({ message, args, event, sock }) {
    const uid = event.senderID;
    const userName = event.message?.pushName || uid;
    global.caiData ??= {};
    global.caiData[uid] ??= {};

    if (args[0] === "audio" || args[0] === "-a") {
      const state = args[1];
      global.caiData[uid].audio = state === "on";
      return message.reply(`🎧 Audio ${state === "on" ? "ON" : "OFF"}`);
    }

    if (args[0] === "create") {
      const sent = await message.reply("✏️ Enter character name:");
      global.ST.onReply.set(sent.key.id, {
        commandName: module.exports.config.name,
        author: uid,
        type: "create_name",
        data: {},
        messageID: sent.key.id
      });
      return;
    }

    if (args[0] === "list") {
      const res = await axios.get(`${stapi.baseURL}/cai/characters`);
      const chars = res.data.characters;
      let msg = "🎭 CHARACTER LIST:\n\n";
      chars.forEach((c, i) => msg += `${i + 1}. ${c.name}\n`);
      const sent = await message.reply(msg + "\n\nReply number to select");
      global.ST.onReply.set(sent.key.id, {
        commandName: module.exports.config.name,
        author: uid,
        type: "select",
        characters: chars,
        messageID: sent.key.id
      });
      return;
    }

    const text = args.join(" ");
    if (!text) return message.reply("❌ Enter message");

    if (!global.caiData[uid].characterId) {
      global.caiData[uid].characterId = DEFAULT_CHARACTER_ID;
    }

    const voice = global.caiData[uid].audio === true;

    try {
      const res = await axios.post(`${stapi.baseURL}/cai/chat`, {
        message: text,
        characterId: global.caiData[uid].characterId,
        voiceEnabled: voice
      });
      const data = res.data;

      const sent = await message.reply(data.reply);
      global.ST.onReply.set(sent.key.id, {
        commandName: module.exports.config.name,
        author: uid,
        type: "chat",
        messageID: sent.key.id
      });

      if (voice && data.audio) {
        try {
          const audioData = (await axios.get(data.audio, { responseType: "arraybuffer" })).data;
          await message.sendAudio(Buffer.from(audioData), false);
        } catch {}
      }
    } catch {
      return message.reply("❌ Chat error");
    }
  },

  onReply: async function ({ message, event, Reply, sock }) {
    const uid = event.senderID;
    if (Reply.author !== uid) return;

    global.caiData ??= {};
    global.caiData[uid] ??= {};

    if (Reply.type === "select") {
      const index = parseInt(event.body);
      if (isNaN(index)) return message.reply("❌ Invalid number");
      const char = Reply.characters[index - 1];
      if (!char) return message.reply("❌ Invalid selection");
      global.caiData[uid].characterId = char.characterId;
      return message.reply(`✅ Selected: ${char.name}`);
    }

    if (Reply.type === "chat") {
      const voice = global.caiData[uid].audio === true;
      try {
        const res = await axios.post(`${stapi.baseURL}/cai/chat`, {
          message: event.body,
          characterId: global.caiData[uid].characterId || DEFAULT_CHARACTER_ID,
          voiceEnabled: voice
        });
        const data = res.data;

        const sent = await message.reply(data.reply);
        global.ST.onReply.set(sent.key.id, {
          commandName: module.exports.config.name,
          author: uid,
          type: "chat",
          messageID: sent.key.id
        });

        if (voice && data.audio) {
          try {
            const audioData = (await axios.get(data.audio, { responseType: "arraybuffer" })).data;
            await message.sendAudio(Buffer.from(audioData), false);
          } catch {}
        }
      } catch {
        return message.reply("❌ Chat failed");
      }
    }

    if (Reply.type.startsWith("create_")) {
      try { await message.unsend(Reply.messageID); } catch {}
      const data = Reply.data;

      if (Reply.type === "create_name") {
        data.name = event.body;
        const sent = await message.reply("📝 Enter title:");
        global.ST.onReply.set(sent.key.id, {
          commandName: module.exports.config.name,
          author: uid,
          type: "create_title",
          data,
          messageID: sent.key.id
        });
        return;
      }

      if (Reply.type === "create_title") {
        data.title = event.body;
        const sent = await message.reply("📄 Enter description:");
        global.ST.onReply.set(sent.key.id, {
          commandName: module.exports.config.name,
          author: uid,
          type: "create_desc",
          data,
          messageID: sent.key.id
        });
        return;
      }

      if (Reply.type === "create_desc") {
        data.description = event.body;
        const sent = await message.reply("💬 Enter greeting:");
        global.ST.onReply.set(sent.key.id, {
          commandName: module.exports.config.name,
          author: uid,
          type: "create_greet",
          data,
          messageID: sent.key.id
        });
        return;
      }

      if (Reply.type === "create_greet") {
        data.greeting = event.body;
        await axios.post(`${stapi.baseURL}/cai/create`, {
          name: data.name,
          title: data.title,
          description: data.description,
          greeting: data.greeting
        });
        return message.reply(
          `✅ Character Created!\n\n` +
          `👤 ${data.name}\n` +
          `📌 ${data.title}`
        );
      }
    }
  }
};
