"use strict";

module.exports = {
  config: {
    name: "event",
    version: "1.0.0",
    author: "ST",
    countDown: 5,
    role: 1,
    shortDescription: "Load, unload or reload an event",
    longDescription: "Dynamically manage bot events without restarting.",
    category: "admin",
    guide: { en: "{pn} load/unload/reload [eventname]" }
  },

  onStart: async ({ api, event, args, message }) => {
    const action  = (args[0] || "").toLowerCase();
    const evtName = args[1] || "";

    if (!["load", "unload", "reload"].includes(action) || !evtName) {
      return message.reply("❓ Usage: !event load/unload/reload [event name]");
    }

    try {
      if (action === "load") {
        const mod = await loadEvent(evtName, api);
        return message.reply(`✅ Event *${mod.config.name}* loaded.`);
      }
      if (action === "unload") {
        unloadEvent(evtName);
        return message.reply(`✅ Event *${evtName}* unloaded.`);
      }
      if (action === "reload") {
        const mod = await reloadEvent(evtName, api);
        return message.reply(`✅ Event *${mod.config.name}* reloaded.`);
      }
    } catch (e) {
      return message.reply("❌ Error: " + e.message);
    }
  }
};
