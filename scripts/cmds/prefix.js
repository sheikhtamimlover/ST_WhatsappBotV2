"use strict";


module.exports = {
  config: {
    name: "prefix",
    version: "1.0.0",
    author: "ST",
    countDown: 3,
    role: 0,            // anyone can VIEW; SET/RESET checked inside onStart
    shortDescription: "View or set a custom prefix for this chat",
    longDescription: "Shows the active prefix for this group/DM. Admins can set a custom one or reset to global.",
    category: "system",
    guide: { en: "{pn} [new_prefix | reset]" },
  },

  onStart: async ({ event, args, message, threadsData }) => {
    const globalPrefix = global.ST.config.prefix || "!";
    const chatType     = event.isGroup ? "group" : "DM";
    const adminList    = global.ST.config.adminBot || [];
    const isAdmin      = adminList.includes(event.senderID);

    // ── Show current prefix (anyone) ────────────────────────────────────────
    if (!args[0]) {
      const thread       = await threadsData(event.threadID);
      const customPrefix = thread && thread.data && thread.data.prefix;
      const effective    = customPrefix || globalPrefix;
      return message.reply(
        `📌 *Prefix — ${chatType}*\n` +
        `Global  : \`${globalPrefix}\`\n` +
        `This ${chatType}: \`${effective}\`` +
        (customPrefix
          ? `\n_(custom — use \`${effective}prefix reset\` to remove)_`
          : `\n_(using global)_`)
      );
    }

    // ── Set / reset — admins only ────────────────────────────────────────────
    if (!isAdmin) {
      return message.reply("⛔ Only admins can change the prefix.");
    }

    if (args[0].toLowerCase() === "reset") {
      const thread = await threadsData(event.threadID);
      const data   = (thread && thread.data) ? { ...thread.data } : {};
      delete data.prefix;
      await global.ST.DB.threads.set(event.threadID, data, "data");
      return message.reply(`✅ Prefix reset — using global: \`${globalPrefix}\``);
    }

    const newPrefix = args[0];
    if (newPrefix.length > 5) {
      return message.reply("❌ Prefix too long — max 5 characters.");
    }

    const thread = await threadsData(event.threadID);
    const data   = (thread && thread.data) ? { ...thread.data } : {};
    data.prefix  = newPrefix;
    await global.ST.DB.threads.set(event.threadID, data, "data");
    return message.reply(
      `✅ Prefix for this ${chatType} set to: \`${newPrefix}\`\n` +
      `Global prefix remains: \`${globalPrefix}\``
    );
  },

  // onChat: allow "prefix" without the prefix, and show info for the bare prefix character.
  onChat: async ({ event, args, message, threadsData }) => {
    const body = (event.body || "").trim();
    if (!body) return;

    const globalPrefix = global.ST.config.prefix || "!";
    let threadPrefix   = globalPrefix;
    try {
      const thread = await threadsData(event.threadID);
      if (thread && thread.data && thread.data.prefix) threadPrefix = thread.data.prefix;
    } catch (_) {}

    if (body === threadPrefix) {
      const line = threadPrefix !== globalPrefix
        ? `📌 This chat's prefix: \`${threadPrefix}\`\nGlobal prefix: \`${globalPrefix}\``
        : `📌 Prefix: \`${globalPrefix}\``;
      await message.reply(line);
      return true;
    }

    if ((args[0] || "").toLowerCase() === "prefix") {
      await module.exports.onStart({
        event,
        args: args.slice(1),
        message,
        threadsData,
      });
      return true;
    }
  },
};
