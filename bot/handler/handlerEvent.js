"use strict";

const handlerAction         = require("./handlerAction.js");
const { isAdminUID }        = require("./handlerAction.js");
const handleCheckData       = require("./handletCheckData.js");
const { normUID }           = require("@sheikhtamim/wca/utils");

// ─── Get display name from DB ─────────────────────────────────────────────────
async function getDisplayName(uid) {
  try {
    const user = await global.ST.DB.userData(uid);
    if (user && user.name && user.name !== "Unknown") return user.name;
  } catch (_) {}
  return normUID(uid);
}

// ─── Get the effective prefix for a thread ────────────────────────────────────
async function getEffectivePrefix(threadID) {
  try {
    const thread = await global.ST.DB.threadsData(threadID);
    if (thread && thread.data && thread.data.prefix) return thread.data.prefix;
  } catch (_) {}
  return global.ST.config.prefix || "!";
}

// ─── Terminal log for incoming message ────────────────────────────────────────
async function logIncoming(event) {
  const c      = global.utils.colors;
  const num    = normUID(event.senderID);
  const name   = await getDisplayName(event.senderID);
  const who    = name !== num
    ? c.hex("#a29bfe")(name) + " " + c.gray("(" + num + ")")
    : c.hex("#a29bfe")(num);

  const listenRaw = global.ST.config.listen && global.ST.config.listen.listenRawMsg;

  if (listenRaw) {
    const tid   = (event.threadID || "").split("@")[0];
    const where = event.isGroup ? c.hex("#74b9ff")(tid) : c.hex("#fd79a8")("DM");
    const body  = (event.body || "").trim().slice(0, 100);
    global.log.info("MSG",
      who + " [" + where + "]" +
      (body ? ": " + c.hex("#e6e9f0")(body) : c.gray(" (media)"))
    );
  } else {
    const where = event.isGroup ? c.gray("GC") : c.hex("#fd79a8")("DM");
    global.log.info("RCV", who + " → " + where);
  }
}

// ─── Main event handler ───────────────────────────────────────────────────────
async function handlerEvent(api, event) {
  if (!event) return;

  if (event.type === "stop_listen" || event.type === "ready") return;

  if (event.type === "event" || event.type === "group_update" || event.type === "group_join_request") {
    return runEvents(api, event);
  }

  // ── Reactions — log + unsend handler ──────────────────────────────────────
  if (event.type === "message_reaction") {
    const c      = global.utils.colors;
    const num    = normUID(event.senderID);
    const emoji  = event.emoji || "(removed)";
    global.log.info("REACT",
      c.hex("#fd79a8")(emoji) + " " +
      c.gray("by") + " " + c.hex("#a29bfe")(num) +
      c.gray(" on msg " + (event.reactionKey?.id || "?").slice(0, 8))
    );

    const allowed = await handlerAction(api, event).catch(() => false);
    if (!allowed) return;

    const msgKey = event.reactionKey && event.reactionKey.id;
    if (msgKey && global.ST.onReaction.has(msgKey)) {
      const handler = global.ST.onReaction.get(msgKey);
      const cmd     = global.ST.cmds.get((handler.commandName || "").toLowerCase());
      if (cmd && typeof cmd.onReaction === "function") {
        try {
          const message = global.buildMessage(api, event);
          await cmd.onReaction({
            api, event, Reaction: handler, message,
            threadsData: global.ST.DB.threadsData,
            userData:    global.ST.DB.userData,
          });
        } catch (e) { global.log.err("REACTION", e.message); }
      }
    }
    return;
  }

  if (event.type !== "message") return;

  if (!event.messageReply && event.replyToMessage) event.messageReply = event.replyToMessage;
  if (!event.replyToMessage && event.messageReply) event.replyToMessage = event.messageReply;

  // Always update DB (name, msg count)
  await handleCheckData(api, event).catch(() => {});

  // Log the incoming message
  logIncoming(event).catch(() => {});

  // Resolve prefix for this thread
  const prefix  = await getEffectivePrefix(event.threadID);
  const body    = (event.body || "").trim();
  const args    = body.split(/\s+/).filter(Boolean);

  // Build message helper
  const message = global.buildMessage(api, event);

  // ── onChat fires on EVERY message — before any gate check ─────────────────
  for (const [cmdName, cmd] of global.ST.cmds) {
    if (typeof cmd.onChat === "function") {
      try {
        const handled = await cmd.onChat({
          api, event, args, message, prefix,
          commandName: cmdName,
          threadsData: global.ST.DB.threadsData,
          userData:    global.ST.DB.userData,
        });
        if (handled === true) return;
      } catch (e) {
        global.log.err("ONCHAT", `[${cmdName}] ${e.message}`);
      }
    }
  }

  // ── Gate check (antiInbox, whitelist, adminOnly, ban) ────────────────────
  const allowed = await handlerAction(api, event).catch(() => false);
  if (!allowed) return;

  // ── onReply ───────────────────────────────────────────────────────────────
  const replied = event.messageReply || event.replyToMessage;
  if (replied) {
    event.messageReply = replied;
    event.replyToMessage = replied;
    const replyID = replied.messageID || replied.messageId;
    if (replyID && global.ST.onReply.has(replyID)) {
      const handler = global.ST.onReply.get(replyID);
      const cmd     = global.ST.cmds.get((handler.commandName || "").toLowerCase());
      if (cmd && typeof cmd.onReply === "function") {
        try {
          await cmd.onReply({
            api, event, Reply: handler, args, message,
            threadsData: global.ST.DB.threadsData,
            userData:    global.ST.DB.userData,
          });
        } catch (e) { global.log.err("REPLY", `[${handler.commandName}] ${e.message}`); }
      }
      return;
    }
  }

  // ── Command parsing ───────────────────────────────────────────────────────
  if (!body.startsWith(prefix)) return;

  const cmdName = args[0].slice(prefix.length).toLowerCase();
  const cmdArgs = args.slice(1);
  const cmd     = global.ST.cmds.get(cmdName);

  // ── Unknown command feedback ──────────────────────────────────────────────
  if (!cmd) {
    return message.reply(
      `❓ Command \`${prefix}${cmdName}\` not found.\nType \`${prefix}help\` to see all available commands.`
    ).catch(() => {});
  }

  // ── Role check ────────────────────────────────────────────────────────────
  const role      = cmd.config.role || 0;
  const adminList = global.ST.config.adminBot || [];
  const isAdmin   = isAdminUID(event.senderID, adminList);

  if (role >= 1 && !isAdmin) {
    return message.reply("⛔ This command is for admins only.").catch(() => {});
  }

  // ── Cooldown ──────────────────────────────────────────────────────────────
  const cdKey     = `${cmdName}:${normUID(event.senderID)}`;
  const countDown = (cmd.config.countDown || 0) * 1000;
  if (countDown > 0) {
    const lastUsed  = global.ST._cooldowns.get(cdKey) || 0;
    const diff      = Date.now() - lastUsed;
    if (diff < countDown) {
      const remaining = ((countDown - diff) / 1000).toFixed(1);
      return message.reply(`⏳ Wait ${remaining}s before using this again.`).catch(() => {});
    }
  }

  if (typeof cmd.onStart !== "function") return;

  // ── Terminal: log command use ─────────────────────────────────────────────
  const c          = global.utils.colors;
  const senderNum  = normUID(event.senderID);
  const senderName = await getDisplayName(event.senderID);
  const who        = senderName !== senderNum
    ? c.hex("#a29bfe")(senderName) + " " + c.gray("(" + senderNum + ")")
    : c.yellowBright(senderNum);
  const cmdStr     = c.cyanBright(prefix + cmdName) + (cmdArgs.length ? " " + cmdArgs.join(" ") : "");
  global.log.cmd("CMD", who + " → " + cmdStr);

  // ── Execute ───────────────────────────────────────────────────────────────
  try {
    global.ST._cooldowns.set(cdKey, Date.now());
    await cmd.onStart({
      api, event, args: cmdArgs, message, prefix,
      threadsData: global.ST.DB.threadsData,
      userData:    global.ST.DB.userData,
      getLang:     (key) => key,
    });
    global.log.success("CMD", c.cyanBright(prefix + cmdName) + " " + c.gray("← done ✓"));
  } catch (e) {
    global.log.err("CMD", `[${cmdName}] ${e.message}`);
    try { await message.reply("❌ Error: " + e.message); } catch (_) {}
  }
}

// ─── Run all event handlers ───────────────────────────────────────────────────
async function runEvents(api, event) {
  for (const [, evt] of global.ST.events) {
    try {
      if (typeof evt.onStart === "function") {
        await evt.onStart({ api, event, threadsData: global.ST.DB.threadsData, userData: global.ST.DB.userData });
      }
      if (typeof evt.onEvent === "function") {
        await evt.onEvent({ api, event, threadsData: global.ST.DB.threadsData, userData: global.ST.DB.userData });
      }
    } catch (_) {}
  }
}

module.exports = handlerEvent;
