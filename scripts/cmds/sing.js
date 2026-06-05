
const axios = require("axios");
const fs = require('fs');

module.exports = {
  config: {
    name: "sing",
    aliases: [],
    version: "1.0.1",
    author: "ST | Sheikh Tamim",
    countDown: 5,
    role: 0,
    shortDescription: "Download audio from YouTube",
    longDescription: "Search and download music from YouTube",
    category: "media",
    guide: "{pn} <song name or YouTube URL>"
  },

  onStart: async function ({ message, event, args }) {
    if (!args || args.length === 0) {
      return message.reply("❌ Please provide a song name or YouTube URL!");
    }

    const checkurl = /^(?:https?:\/\/)?(?:m\.|www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))((\w|-){11})(?:\S+)?$/;
    let videoID;
    const urlYtb = checkurl.test(args[0]);

    try {
      if (urlYtb) {
        const match = args[0].match(checkurl);
        videoID = match ? match[1] : null;
        
        await message.react('⏳');
        
        const { data: { title, downloadLink } } = await axios.get(
          `https://www.noobs-api.rf.gd/dipto/ytDl3?link=${videoID}&format=mp3`
        );
        
        const audioBuffer = await downloadAudio(downloadLink);
        
        await message.sendAudio(audioBuffer);
        await message.react('✅');
        return;
      }

      let keyWord = args.join(" ");
      keyWord = keyWord.includes("?feature=share") ? keyWord.replace("?feature=share", "") : keyWord;
      const maxResults = 6;
      
      await message.react('🔍');
      
      let result;
      try {
        result = ((await axios.get(`https://www.noobs-api.rf.gd/dipto/ytFullSearch?songName=${encodeURIComponent(keyWord)}`)).data).slice(0, maxResults);
      } catch (err) {
        return message.reply("❌ An error occurred: " + err.message);
      }

      if (result.length === 0) {
        return message.reply("⭕ No search results match the keyword: " + keyWord);
      }

      let msg = "🎵 *Music Search Results*\n\n";
      for (let i = 0; i < result.length; i++) {
        const info = result[i];
        msg += `${i + 1}. ${info.title}\n`;
        msg += `⏱️ Time: ${info.time}\n`;
        msg += `📺 Channel: ${info.channel.name}\n\n`;
      }
      msg += "\n💬 Reply with a number (1-6) to download";

      const sent = await message.reply(msg);
      
      global.ST.onReply.set(sent.key.id, {
        commandName: 'sing',
        messageID: sent.key.id,
        author: event.senderID,
        result
      });

    } catch (err) {
      console.error("Sing error:", err);
      await message.reply(`❌ Error: ${err.message}`);
    }
  },

  onReply: async function ({ event, message, Reply }) {
    try {
      const { result } = Reply;
      const choice = parseInt(event.body.trim());
      
      if (isNaN(choice) || choice < 1 || choice > result.length) {
        return message.reply("❌ Invalid choice. Please enter a number between 1 and 6.");
      }

      const infoChoice = result[choice - 1];
      const idvideo = infoChoice.id;

      await message.react('⏳');
      await message.unsend(Reply.messageID);

      const { data: { title, downloadLink, quality } } = await axios.get(
        `https://www.noobs-api.rf.gd/dipto/ytDl3?link=${idvideo}&format=mp3`
      );

      const audioBuffer = await downloadAudio(downloadLink);

      await message.sendAudio(audioBuffer);
      await message.react('✅');
      
      global.ST.onReply.delete(Reply.messageID);

    } catch (error) {
      console.error("Sing onReply error:", error);
      await message.reply("❌ Sorry, failed to download audio. File might be too large (max 26MB)");
    }
  }
};

async function downloadAudio(url) {
  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer"
    });
    return Buffer.from(response.data);
  } catch (err) {
    throw new Error("Failed to download audio: " + err.message);
  }
}
