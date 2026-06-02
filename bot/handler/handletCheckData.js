"use strict";

/**
 * Ensure user and thread records exist in DB on every message.
 * Saves sender display name, increments user total msgCount,
 * and increments per-thread memberMsgCount for groups.
 * Runs regardless of listenRawMsg setting.
 */
async function handleCheckData(api, event) {
  if (!global.ST || !global.ST.DB) return;

  const { userData, threadsData } = global.ST.DB;

  try {
    // ── User record ──────────────────────────────────────────────────────────
    if (event.senderID) {
      const user = await userData(event.senderID);

      // Save name on first sight (or if still Unknown)
      if (!user.name || user.name === "Unknown") {
        const pushName = event.senderName || event.pushName || (event.raw && event.raw.pushName);
        if (pushName && pushName.trim()) {
          await global.ST.DB.users.set(event.senderID, pushName.trim(), "name");
        } else {
          // Try contacts map from the Baileys socket (fastest, no API call)
          try {
            const sock = global.ST.api && global.ST.api.sock;
            if (sock && sock.contacts) {
              const { normUID } = require("../../wca/utils");
              const num  = normUID(event.senderID);
              const lidKey   = num + "@lid";
              const phoneKey = num + "@s.whatsapp.net";
              const contact  = sock.contacts[phoneKey] || sock.contacts[lidKey];
              const cName    = contact && (contact.name || contact.notify || contact.verifiedName);
              if (cName) await global.ST.DB.users.set(event.senderID, cName, "name");
            }
          } catch (_) {}
        }
      }

      // Always increment total message count for this user
      try {
        const current = await userData(event.senderID);
        await global.ST.DB.users.set(event.senderID, (current.msgCount || 0) + 1, "msgCount");
      } catch (_) {}
    }

    // ── Thread / group record ────────────────────────────────────────────────
    if (event.threadID && event.isGroup) {
      const thread = await threadsData(event.threadID);

      if (!thread.name || thread.name === "Unknown Group" || thread.totalMember === 0) {
        try {
          const info = await api.getGroupInfo(event.threadID);
          await global.ST.DB.threads.refreshInfo(event.threadID, info);
        } catch (_) {}
      }

      if (event.senderID) {
        try {
          await global.ST.DB.threads.incrementMsgCount(event.threadID, event.senderID);
        } catch (_) {}
      }
    }

  } catch (_) {}
}

module.exports = handleCheckData;
