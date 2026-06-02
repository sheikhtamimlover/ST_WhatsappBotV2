"use strict";

module.exports = {
  config: {
    name: "cmdconfig",
    version: "1.0.0",
    author: "ST",
    countDown: 5,
    role: 1,
    shortDescription: "View or modify configCommands.json",
    longDescription: "Shows current command/event skip lists from configCommands.json.",
    category: "admin",
    guide: { en: "{pn}" }
  },

  onStart: async ({ api, event, message }) => {
    const cc = global.ST.configCommands || {};

    let text = "⚙️ *configCommands.json*\n\n";
    text += `📦 Command Unload (${(cc.commandUnload || []).length}):\n`;
    text += (cc.commandUnload || []).length > 0 ? cc.commandUnload.join(", ") : "(none)";
    text += "\n\n";
    text += `⚡ Event Unload (${(cc.commandEventUnload || []).length}):\n`;
    text += (cc.commandEventUnload || []).length > 0 ? cc.commandEventUnload.join(", ") : "(none)";

    return message.reply(text);
  }
};
