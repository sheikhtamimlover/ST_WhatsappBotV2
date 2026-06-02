"use strict";

const fs      = require("fs");
const path    = require("path");
const https   = require("https");
const http    = require("http");
const { Readable } = require("stream");

// ─── Re-export logger tools ─────────────────────────────────────────────────
const log      = require("./logger/log.js");
const spinner  = require("./logger/spinner.js");
const colors   = require("./logger/colors.js").colors;
const theme    = require("./logger/colors.js").theme;
const loading  = require("./logger/loading.js");
const logColor = require("./logger/logColor.js");
const Prism    = require("./logger/prism.js");

module.exports.log      = log;
module.exports.spinner  = spinner;
module.exports.colors   = colors;
module.exports.theme    = theme;
module.exports.loading  = loading;
module.exports.logColor = logColor;
module.exports.Prism    = Prism;

// ─── Stream helpers ──────────────────────────────────────────────────────────

/**
 * Get a readable stream from a URL (http/https).
 * @param {string} url
 * @returns {Promise<Readable>}
 */
function getStreamFromUrl(url) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith("https") ? https : http;
    proto.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(getStreamFromUrl(res.headers.location));
      }
      if (res.statusCode !== 200) {
        return reject(new Error("HTTP " + res.statusCode + " for " + url));
      }
      resolve(res);
    }).on("error", reject);
  });
}
module.exports.getStreamFromUrl = getStreamFromUrl;

/**
 * Get a base64 string from a URL.
 * @param {string} url
 * @returns {Promise<string>} base64 encoded data
 */
function getBase64FromUrl(url) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith("https") ? https : http;
    proto.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(getBase64FromUrl(res.headers.location));
      }
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks).toString("base64")));
      res.on("error", reject);
    }).on("error", reject);
  });
}
module.exports.getBase64FromUrl = getBase64FromUrl;

function getMessageReply(event) {
  return (event && (event.messageReply || event.replyToMessage)) || null;
}
module.exports.getMessageReply = getMessageReply;

/**
 * Download a URL to a file path.
 * @param {string} url
 * @param {string} dest
 * @returns {Promise<string>} dest path
 */
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith("https") ? https : http;
    const file = fs.createWriteStream(dest);
    proto.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        return resolve(downloadFile(res.headers.location, dest));
      }
      res.pipe(file);
      file.on("finish", () => file.close(() => resolve(dest)));
    }).on("error", (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}
module.exports.downloadFile = downloadFile;

/**
 * Get a stream from a replied message attachment or a URL.
 * Handles photo, video, audio, document, sticker types.
 * @param {object} params
 * @param {object} [params.event]       WCA event object
 * @param {string} [params.type]        attachment type filter ('photo','video','audio', etc.)
 * @param {string} [params.url]         direct URL fallback
 * @param {object} [params.api]         WCA api (for downloadMedia)
 * @returns {Promise<{stream: Readable, mimetype: string, ext: string}|null>}
 */
async function getAttachmentStream({ event, type, url, api } = {}) {
  // From replied message
  const replied = getMessageReply(event);
  if (replied && replied.attachments) {
    const filter = type ? [type] : ["image", "photo", "video", "audio", "ptt", "document", "sticker"];
    const att = replied.attachments.find(a => filter.includes(a.type));
    if (att && att.url) {
      const stream = await getStreamFromUrl(att.url);
      return { stream, mimetype: att.mimetype || "application/octet-stream", ext: extFromMime(att.mimetype) };
    }
    if (att && api && api.downloadMedia) {
      try {
        const buf = await api.downloadMedia(replied.raw || replied);
        const stream = Readable.from(buf);
        return { stream, mimetype: att.mimetype || "application/octet-stream", ext: extFromMime(att.mimetype) };
      } catch (_) {}
    }
  }
  // From current message attachments
  if (event && event.attachments && event.attachments.length > 0) {
    const filter = type ? [type] : ["image", "photo", "video", "audio", "ptt", "document", "sticker"];
    const att = event.attachments.find(a => filter.includes(a.type));
    if (att && att.url) {
      const stream = await getStreamFromUrl(att.url);
      return { stream, mimetype: att.mimetype || "application/octet-stream", ext: extFromMime(att.mimetype) };
    }
  }
  // Direct URL
  if (url) {
    const stream = await getStreamFromUrl(url);
    return { stream, mimetype: "application/octet-stream", ext: "bin" };
  }
  return null;
}
module.exports.getAttachmentStream = getAttachmentStream;

function extFromMime(mime) {
  if (!mime) return "bin";
  const map = {
    "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
    "video/mp4": "mp4", "video/webm": "webm",
    "audio/ogg": "ogg", "audio/mp4": "m4a", "audio/mpeg": "mp3",
    "application/pdf": "pdf",
  };
  return map[mime.split(";")[0].trim()] || "bin";
}
module.exports.extFromMime = extFromMime;

// ─── Target user resolver ────────────────────────────────────────────────────

/**
 * Get a target user UID from:
 *   1. Mentioned users in the message
 *   2. Replied-to message sender
 *   3. Raw UID in args[0]
 *   4. Fallback to event.senderID
 *
 * @param {object} event   WCA event object
 * @param {string[]} args  Parsed message args
 * @returns {string} resolved UID
 */
function getTargetUser(event, args = []) {
  const replied = getMessageReply(event);
  // 1. Mentioned users
  if (event.mentions && event.mentions.length > 0) {
    return event.mentions[0];
  }
  // 2. Replied-to message
  if (replied && replied.senderID) {
    return replied.senderID;
  }
  // 3. Raw UID/phone in args (must be numeric or @s.whatsapp.net JID)
  if (args[0]) {
    const candidate = String(args[0]).replace("@", "").trim();
    if (/^\d{7,}$/.test(candidate)) return candidate + "@s.whatsapp.net";
    if (candidate.includes("@s.whatsapp.net") || candidate.includes("@g.us")) return candidate;
  }
  // 4. Fallback
  return event.senderID;
}
module.exports.getTargetUser = getTargetUser;

// ─── Avatar helper ───────────────────────────────────────────────────────────

/**
 * Get the profile picture URL for a user/group.
 * Returns null if unavailable.
 * @param {object} api  WCA api
 * @param {string} uid  JID or phone number
 * @returns {Promise<string|null>}
 */
async function getAvatar(api, uid) {
  try {
    return await api.getProfilePicture(uid);
  } catch (_) {
    return null;
  }
}
module.exports.getAvatar = getAvatar;

// ─── Message helper builder ──────────────────────────────────────────────────

/**
 * Build a per-event message helper object.
 * Provides:   reply, send, react, unsend, edit, typing
 *
 * @param {object} api    WCA api
 * @param {object} event  WCA event
 * @returns {object} message helper
 */
function buildMessage(api, event) {
  const threadID  = event.threadID;
  const rawMsg    = event.raw || null;

  return {
    /**
     * Reply to the current event message.
     * @param {string|object} msgOrObj  text or { body, attachment, mentions, … }
     * @param {function}      [cb]      (err, info) callback — also sets up onReply storage
     */
    async reply(msgOrObj, cb) {
      const content = normalizeContent(msgOrObj);
      const opts    = rawMsg ? { replyToMessage: rawMsg } : {};
      const sent    = await api.sendMessage(content, threadID, opts).catch((e) => { if (cb) cb(e, null); throw e; });

      const info = {
        messageID: sent?.key?.id || sent?.id || (Array.isArray(sent) && sent[0]?.key?.id) || null,
        threadID,
        sent,
      };

      if (typeof cb === "function") cb(null, info);
      return info;
    },

    /**
     * Send a message to a specific thread (or the current thread if omitted).
     * @param {string|object} msgOrObj
     * @param {string}        [tid]    default = event.threadID
     * @param {function}      [cb]
     */
    async send(msgOrObj, tid, cb) {
      if (typeof tid === "function") { cb = tid; tid = null; }
      tid = tid || threadID;
      const content = normalizeContent(msgOrObj);
      const sent    = await api.sendMessage(content, tid).catch((e) => { if (cb) cb(e, null); throw e; });
      const info    = { messageID: sent?.key?.id || null, threadID: tid, sent };
      if (typeof cb === "function") cb(null, info);
      return info;
    },

    /**
     * React to a message.
     * @param {string} emoji       reaction emoji
     * @param {string} [msgID]     default = event's own messageID
     */
    async react(emoji, msgID) {
      try {
        const targetID = msgID || event.messageID;
        const key      = { remoteJid: threadID, id: targetID, fromMe: false };
        return await api.reactToMessage(threadID, key, emoji);
      } catch (_) {}
    },

    /**
     * Delete / unsend a message.
     * @param {string} msgID
     */
    async unsend(msgID) {
      try {
        const id  = msgID || event.messageID;
        const key = { remoteJid: threadID, id, fromMe: true };
        return await api.deleteMessage(threadID, key, true);
      } catch (_) {}
    },

    /**
     * Edit a sent message.
     * @param {string} msgID   message ID to edit
     * @param {string} newText new body text
     */
    async edit(msgID, newText) {
      try {
        return await api.editMessage(threadID, msgID, newText);
      } catch (_) {}
    },

    /**
     * Show typing indicator in the current thread.
     * @param {string} [tid] defaults to current threadID
     */
    async typing(tid) {
      try {
        return await api.sendTypingIndicator(tid || threadID, 3000);
      } catch (_) {}
    },
  };
}
module.exports.buildMessage = buildMessage;

/**
 * Normalise a string/object into WCA sendMessage format.
 */
function normalizeContent(msgOrObj) {
  if (typeof msgOrObj === "string") return { body: msgOrObj };
  if (msgOrObj && typeof msgOrObj === "object") {
    // already has body/text/attachment — keep as-is
    if (msgOrObj.body || msgOrObj.text || msgOrObj.attachment || msgOrObj.location || msgOrObj.sticker) {
      return msgOrObj;
    }
  }
  return msgOrObj || { body: "" };
}
module.exports.normalizeContent = normalizeContent;

// ─── Misc helpers ────────────────────────────────────────────────────────────

/**
 * Sleep for ms milliseconds.
 */
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
module.exports.sleep = sleep;

/**
 * Ensure a directory exists.
 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
module.exports.ensureDir = ensureDir;

/**
 * Format a phone JID to plain number string.
 * "628xxx@s.whatsapp.net" → "628xxx"
 */
function jidToPhone(jid) {
  if (!jid) return "";
  return String(jid).split("@")[0].split(":")[0];
}
module.exports.jidToPhone = jidToPhone;

function pickContactName(contact) {
  if (!contact || typeof contact !== "object") return "";
  return contact.name || contact.notify || contact.verifiedName || contact.pushName || "";
}

async function resolveUserDisplayName(api, uid, userData) {
  const raw = String(uid || "");
  if (!raw) return "";

  const { normUID } = require("./wca/utils");
  const bare = normUID(raw);
  const candidates = Array.from(new Set([
    raw,
    bare,
    bare ? bare + "@s.whatsapp.net" : "",
    bare ? bare + "@lid" : "",
  ].filter(Boolean)));

  const getUser = userData || (global.ST && global.ST.DB && global.ST.DB.userData);
  if (typeof getUser === "function") {
    for (const key of candidates) {
      try {
        const u = await getUser(key);
        if (u && u.name && u.name !== "Unknown") return u.name;
      } catch (_) {}
    }
  }

  const sock = (api && api.sock) || (global.ST && global.ST.api && global.ST.api.sock);
  const contacts = (sock && (sock.contacts || (sock.store && sock.store.contacts))) || {};
  for (const key of candidates) {
    const name = pickContactName(contacts[key]);
    if (name) return name;
  }
  for (const [contactJid, contact] of Object.entries(contacts)) {
    if (
      contactJid === raw ||
      contactJid === bare ||
      normUID(contactJid) === bare ||
      contact?.id === raw ||
      contact?.lid === raw ||
      normUID(contact?.id || "") === bare ||
      normUID(contact?.lid || "") === bare
    ) {
      const name = pickContactName(contact);
      if (name) return name;
    }
  }

  return bare || raw;
}
module.exports.resolveUserDisplayName = resolveUserDisplayName;

/**
 * Humanise a duration in ms → "2m 30s" style.
 */
function humanDuration(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}
module.exports.humanDuration = humanDuration;
