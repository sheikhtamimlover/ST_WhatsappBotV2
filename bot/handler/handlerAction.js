"use strict";

const { normUID } = require("@sheikhtamim/wca/utils");

/**
 * Normalize admin check — compares bare numeric IDs so both phone JIDs and
 * @lid JIDs match against whatever format is stored in config.adminBot.
 */
function isAdminUID(senderID, adminList) {
  const senderNum = normUID(senderID);
  return (adminList || []).some(a => normUID(a) === senderNum);
}

/**
 * handlerAction — gate-checks before any command runs.
 *
 * Checks (in order):
 *  1. antiInbox   — ignore DMs if enabled
 *  2. whitelistThreadMode — only allowed threads
 *  3. whitelistMode — only allowed UIDs
 *  4. adminOnly   — only bot admins
 *  5. ban check   — banned users cannot use commands
 *
 * @param {object} api
 * @param {object} event   WCA event
 * @returns {Promise<boolean>} true = allowed, false = blocked
 */
async function handlerAction(api, event) {
  const cfg = global.ST.config;
  const fb  = cfg.featureBox || {};

  const senderID  = event.senderID;
  const threadID  = event.threadID;
  const adminList = cfg.adminBot || [];
  const isAdmin   = isAdminUID(senderID, adminList);

  // ── Handle reaction-to-unsend ─────────────────────────────────────────────
  if (event.type === "message_reaction" && fb.unsendBotReact) {
    const reactEmoji = fb.unsendBotReactEmoji || "❌";
    if ((event.emoji || "").trim() === String(reactEmoji).trim() && isAdmin && event.reactionKey) {
      try {
        const msgKey = { remoteJid: threadID, id: event.reactionKey.id, fromMe: true };
        await api.deleteMessage(threadID, msgKey, true);
      } catch (e) {
        try { global.log.warn("UNSEND", "React delete failed: " + e.message); } catch (_) {}
      }
    }
    return false;
  }

  // ── antiInbox — block DMs ────────────────────────────────────────────────
  if (fb.antiInbox && !event.isGroup) {
    return false;
  }

  // ── whitelistThreadMode ──────────────────────────────────────────────────
  if (fb.whitelistThreadMode) {
    const allowed = fb.whitelistThreadIDs || [];
    if (!allowed.includes(threadID) && !isAdmin) return false;
  }

  // ── whitelistMode ────────────────────────────────────────────────────────
  if (fb.whitelistMode) {
    const allowed = (fb.whitelistUIDs || []).map(normUID);
    if (!allowed.includes(normUID(senderID)) && !isAdmin) return false;
  }

  // ── adminOnly ────────────────────────────────────────────────────────────
  if (fb.adminOnly && !isAdmin) {
    return false;
  }

  // ── Ban check ────────────────────────────────────────────────────────────
  try {
    if (global.ST.DB && global.ST.DB.userData) {
      const user = await global.ST.DB.userData(senderID);
      if (user && user.isBan) return false;
    }
  } catch (_) {}

  return true;
}

module.exports = handlerAction;
module.exports.isAdminUID = isAdminUID;
