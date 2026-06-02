"use strict";

module.exports = {
  config: {
    name: "anti",
    version: "1.0.0",
    author: "ST",
    countDown: 5,
    role: 1,
    shortDescription: "Toggle anti-inbox and whitelist features",
    longDescription: "Toggle bot protection features: antiInbox, whitelistMode, whitelistThreadMode, adminOnly.",
    category: "admin",
    guide: { en: "{pn} [antiinbox | whitelist | whitelistthread | adminonly] [on/off]" }
  },

  onStart: async ({ api, event, args, message }) => {
    const feature = (args[0] || "").toLowerCase();
    const toggle  = (args[1] || "").toLowerCase();

    const featureMap = {
      antiinbox:       "antiInbox",
      whitelist:       "whitelistMode",
      whitelistthread: "whitelistThreadMode",
      adminonly:       "adminOnly",
    };

    if (!featureMap[feature]) {
      return message.reply(
        "❓ Available features:\n" +
        "• antiinbox — block DMs\n" +
        "• whitelist — only allowed UIDs\n" +
        "• whitelistthread — only allowed threads\n" +
        "• adminonly — admins only mode\n\n" +
        "Usage: !anti [feature] [on/off]"
      );
    }

    if (toggle !== "on" && toggle !== "off") {
      const current = global.ST.config.featureBox[featureMap[feature]];
      return message.reply(`ℹ️ ${feature} is currently: ${current ? "ON" : "OFF"}\nUse !anti ${feature} on/off to toggle.`);
    }

    const newVal = toggle === "on";
    global.ST.config.featureBox[featureMap[feature]] = newVal;

    return message.reply(`✅ *${feature}* has been turned ${toggle.toUpperCase()}.`);
  }
};
