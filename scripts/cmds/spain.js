
module.exports = {
  config: {
    name: "spain",
    version: "1.0.0",
    author: "Sheikh Tamim",
    countDown: 5,
    role: 1,
    shortDescription: "Spam messages",
    longDescription: "Send a message multiple times (admin only)",
    category: "admin",
    guide: "{pn} <amount> <message>"
  },

  onStart: async function ({ message, event, args, sock, config }) {
    try {
      if (args.length < 2) {
        return message.reply(`📖 *Spain Command Usage:*\n\n` +
          `• ${config.prefix}spain <amount> <message>\n` +
          `Example: ${config.prefix}spain 5 Hello World`);
      }

      const amount = parseInt(args[0]);
      
      if (isNaN(amount) || amount < 1 || amount > 20) {
        return message.reply('❌ Amount must be between 1 and 20!');
      }

      const spamMessage = args.slice(1).join(' ');

      if (!spamMessage) {
        return message.reply('❌ Please provide a message to spam!');
      }

      await message.reply(`🔄 Sending ${amount} messages...`);

      for (let i = 0; i < amount; i++) {
        await sock.sendMessage(event.threadID, { text: spamMessage });
        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
      }

      await message.reply(`✅ Sent ${amount} messages!`);

    } catch (error) {
      console.error('Spain command error:', error);
      await message.reply(`❌ Error: ${error.message}`);
    }
  }
};
