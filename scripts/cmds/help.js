module.exports = {
  config: {
    name: "help",
    version: "1.0.0",
    author: "ST",
    countDown: 5,
    role: 0,
    shortDescription: "Show all commands or command details",
    longDescription: "Lists all available bot commands, or shows detailed info about a specific command.",
    category: "system",
    guide: { en: "{pn}help [command name]" }
  },

  onStart: async ({ api, event, args, message, prefix }) => {
    const cmds = global.ST.cmds;

    // Show specific command info
    if (args[0]) {
      const name = args[0].toLowerCase().replace(prefix, "");
      const cmd  = cmds.get(name);
      if (!cmd) return message.reply(`❌ Command "${name}" not found.`);

      const c = cmd.config;
      const guide = (c.guide && (c.guide.en || Object.values(c.guide)[0])) || "";
      const pn    = prefix + c.name;
      const guideText = guide.replace(/\{pn\}/gi, pn);

      return message.reply(
        `📌 *${pn}*\n` +
        `Version: ${c.version || "1.0.0"}\n` +
        `Author: ${c.author || "Unknown"}\n` +
        `Category: ${c.category || "misc"}\n` +
        `Cooldown: ${c.countDown || 0}s\n` +
        `Role: ${c.role === 1 ? "Admin" : "Everyone"}\n\n` +
        `📝 ${c.longDescription || c.shortDescription || ""}\n\n` +
        (guideText ? `📖 Usage:\n${guideText}` : "")
      );
    }

    // Group commands by category
    const grouped = {};
    for (const [name, cmd] of cmds) {
      const cat = (cmd.config.category || "misc").toLowerCase();
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(prefix + cmd.config.name);
    }

    let text = `🤖 *${global.ST.config.botName || "WCA Bot"}*\n`;
    text += `Prefix: ${prefix} | Commands: ${cmds.size}\n\n`;

    for (const [cat, list] of Object.entries(grouped)) {
      text += `📂 *${cat.toUpperCase()}*\n`;
      text += list.join(", ") + "\n\n";
    }

    text += `Use ${prefix}help [command] for details.`;

    return message.reply(text);
  }
};
