"use strict";

const axios = require("axios");

const API_URL = "https://neoaz.is-a.dev/api/download";

function videoMime(ext) {
  const clean = String(ext || "").toLowerCase();
  if (clean === "webm") return "video/webm";
  return "video/mp4";
}

async function getDownloadData(url) {
  const res = await axios.get(API_URL, {
    params: { url },
    headers: { "User-Agent": "Mozilla/5.0" },
  });

  if (res.data?.status !== "ok") {
    throw new Error(res.data?.error || res.data?.message || "Download API failed");
  }
  return res.data;
}

function getVideoUrl(data) {
  return data?.video?.directUrl || data?.video?.downloadUrl || null;
}

function formatCaption(data) {
  const info = data.info || {};
  return (
    `Downloaded from: ${(data.platform || "unknown").toUpperCase()}\n` +
    `Title: ${info.title || "Unknown"}\n` +
    `Duration: ${info.duration || "Unknown"}\n` +
    `Quality: ${data.video?.quality || "Video"} (${data.video?.fileSize || "unknown size"})`
  );
}

module.exports = {
  config: {
    name: "autodl",
    version: "2.5.0",
    author: "ST | Sheikh Tamim",
    role: 0,
    category: "media",
    shortDescription: "Auto download video from URL",
    guide: { en: "{pn} <url>" },
  },

  onStart: async ({ api, message, event, args }) => {
    let status = null;

    try {
      const url = args[0];
      if (!url) return message.reply("Use: autodl <url>");
      if (!/^https?:\/\//i.test(url)) return message.reply("Please provide a valid URL.");

      status = await message.reply("Downloading video...");
      const data = await getDownloadData(url);
      const videoUrl = getVideoUrl(data);
      if (!videoUrl) throw new Error("No video URL returned by API");

      if (status?.messageID) await message.unsend(status.messageID);
      await api.sendVideo(videoUrl, event.threadID, formatCaption(data), {
        mimetype: videoMime(data.video?.extension),
      });
    } catch (err) {
      if (status?.messageID) await message.unsend(status.messageID).catch(() => {});
      await message.reply("Error: " + err.message).catch(() => {});
    }
  }
};
