"use strict";

module.exports = {
  config: {
    name: "cmd",
    version: "1.0.0",
    author: "ST",
    countDown: 5,
    role: 1,
    shortDescription: "Load, unload or reload a command",
    longDescription: "Dynamically manage bot commands without restarting.",
    category: "admin",
    guide: { en: "{pn} load/unload/reload [cmdname]" }
  },

  onStart: async ({ api, event, args, message }) => {
    const action  = (args[0] || "").toLowerCase();
    const cmdName = args[1] || "";

    if (!["load", "unload", "reload"].includes(action) || !cmdName) {
      return message.reply("❓ Usage: !cmd load/unload/reload [command name]");
    }

    try {
      if (action === "load") {
        const mod = await loadCmd(cmdName, api);
        return message.reply(`✅ Command *${mod.config.name}* loaded.`);
      }
      if (action === "unload") {
        unloadCmd(cmdName);
        return message.reply(`✅ Command *${cmdName}* unloaded.`);
      }
      if (action === "reload") {
        const mod = await reloadCmd(cmdName, api);
        return message.reply(`✅ Command *${mod.config.name}* reloaded.`);
      }
    } catch (e) {
      return message.reply("❌ Error: " + e.message);
    }
  }
};
