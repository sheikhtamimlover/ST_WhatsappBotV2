"use strict";

const axios = require("axios");
const yts = require("yt-search");

const API_URL = "https://neoaz.is-a.dev/api/download";

function isUrl(text) {
  return /^https?:\/\//i.test(String(text || ""));
}

function audioMime(ext) {
  const clean = String(ext || "").toLowerCase();
  if (clean === "m4a" || clean === "mp4") return "audio/mp4";
  if (clean === "ogg" || clean === "opus") return "audio/ogg; codecs=opus";
  if (clean === "webm") return "audio/webm";
  return "audio/mpeg";
}

async function getDownloadData(url) {
  const res = await axios.get(API_URL, {
    params: { url },
    timeout: 60000,
    headers: { "User-Agent": "Mozilla/5.0" },
  });

  if (res.data?.status !== "ok") {
    throw new Error(res.data?.error || res.data?.message || "Download API failed");
  }
  return res.data;
}

function getAudioUrl(data) {
  return data?.audio?.directUrl || data?.audio?.downloadUrl || null;
}

async function resolveWorkerUrl(url) {
  const res = await axios.get(url, {
    timeout: 60000,
    maxRedirects: 5,
    headers: { "User-Agent": "Mozilla/5.0" },
    validateStatus: () => true,
  });

  if (res.status < 200 || res.status >= 300) {
    throw new Error("Audio URL returned HTTP " + res.status);
  }

  if (res.data && typeof res.data === "object") {
    return res.data.directUrl || res.data.fileUrl || res.data.downloadUrl || res.data.url || null;
  }

  return url;
}

async function downloadAudioBuffer(data) {
  let audioUrl = getAudioUrl(data);
  if (!audioUrl) throw new Error("No audio URL returned by API");

  if (audioUrl === data?.audio?.downloadUrl && !data?.audio?.directUrl) {
    audioUrl = await resolveWorkerUrl(audioUrl);
    if (!audioUrl) throw new Error("Could not resolve audio download URL");
  }

  const res = await axios.get(audioUrl, {
    responseType: "arraybuffer",
    timeout: 120000,
    maxRedirects: 5,
    headers: { "User-Agent": "Mozilla/5.0" },
  });

  const contentType = String(res.headers["content-type"] || "");
  if (/json|html/i.test(contentType)) {
    throw new Error("Audio URL returned " + contentType + " instead of audio");
  }

  return Buffer.from(res.data);
}

function formatInfo(data, requesterName) {
  const info = data.info || {};
  return (
    `Music: ${info.title || "Unknown"}\n` +
    `Artist: ${info.channel || "Unknown"}\n` +
    `Duration: ${info.duration || "Unknown"}\n` +
    `Quality: ${data.audio?.quality || "Audio"} (${data.audio?.fileSize || "unknown size"})` +
    (requesterName ? `\nRequested by: ${requesterName}` : "")
  );
}

async function sendMusic({ api, message, event, videoUrl, requesterName, status }) {
  let ownStatus = false;
  try {
    if (!status) {
      status = await message.reply("Processing music...");
      ownStatus = true;
    }
    const data = await getDownloadData(videoUrl);
    const audioBuffer = await downloadAudioBuffer(data);

    if (status?.messageID) await message.unsend(status.messageID);
    await message.reply(formatInfo(data, requesterName));
    await api.sendAudio(audioBuffer, event.threadID, {
      mimetype: audioMime(data.audio?.extension),
      ptt: false,
    });
  } catch (e) {
    if (status?.messageID) await message.unsend(status.messageID).catch(() => {});
    await message.reply("Download failed: " + e.message).catch(() => {});
  }
}

module.exports = {
  config: {
    name: "music",
    aliases: [],
    version: "2.5.0",
    author: "ST | Sheikh Tamim",
    role: 0,
    category: "music",
    guide: { en: "{pn} [-s] <song name | youtube url>" },
  },

  onStart: async function ({ api, message, args, event }) {
    if (!args[0]) return message.reply("Enter song name or YouTube URL.");

    let showList = false;
    if (args[0] === "-s") {
      showList = true;
      args.shift();
    }

    const query = args.join(" ").trim();
    if (!query) return message.reply("Enter song name or YouTube URL.");

    if (!showList) {
      const status = await message.reply("Processing music...");
      if (isUrl(query)) {
        return sendMusic({ api, message, event, videoUrl: query, status });
      }

      try {
        const search = await yts(query);
        if (!search.videos.length) {
          await message.unsend(status.messageID);
          return message.reply("No results found.");
        }
        return sendMusic({ api, message, event, videoUrl: search.videos[0].url, status });
      } catch (e) {
        try { await message.unsend(status.messageID); } catch (_) {}
        return message.reply("Error: " + e.message);
      }
    }

    const status = await message.reply(`Searching "${query}"...`);
    try {
      const search = await yts(query);
      if (!search.videos.length) {
        await message.unsend(status.messageID);
        return message.reply("No results found.");
      }

      const top = search.videos.slice(0, 6);
      let msg = `Results for "${query}"\n\n`;
      top.forEach((v, i) => {
        msg += `${i + 1}. ${v.title}\nDuration: ${v.timestamp}\n\n`;
      });
      msg += "Reply with a number.";

      await message.unsend(status.messageID);
      return message.reply(msg, (err, info) => {
        if (err || !info?.messageID) return;
        global.ST.onReply.set(info.messageID, {
          commandName: module.exports.config.name,
          author: event.senderID,
          videos: top,
        });
      });
    } catch (e) {
      try { await message.unsend(status.messageID); } catch (_) {}
      return message.reply("Error: " + e.message);
    }
  },

  onReply: async function ({ api, message, event, Reply, userData }) {
    if (event.senderID !== Reply.author) return message.reply("Not your request.");

    const choice = parseInt(event.body, 10);
    if (Number.isNaN(choice) || choice < 1 || choice > Reply.videos.length) {
      return message.reply("Invalid choice.");
    }

    const replyID = event.messageReply?.messageID || event.replyToMessage?.messageID;
    if (replyID) global.ST.onReply.delete(replyID);

    const requesterName = global.resolveUserDisplayName
      ? await global.resolveUserDisplayName(null, event.senderID, userData)
      : event.senderID;

    return sendMusic({
      api,
      message,
      event,
      videoUrl: Reply.videos[choice - 1].url,
      requesterName,
    });
  }
};
