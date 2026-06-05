module.exports = {
  config: {
    name: "r",
    version: "2.1.0",
    author: "Sheikh Tamim",
    countDown: 0,
    role: 0,
    shortDescription: "Unsend bot messages",
    longDescription: "Reply to bot message with !r to delete it",
    category: "utility",
    guide: "{pn} - Reply to bot message"
  },

  onStart: async function ({ message, event, sock }) {
    try {
      const activeSock = global.ST?.sock || sock;

      if (!event.messageReply) {
        return message.reply('❌ Please reply to a bot message to unsend it!');
      }

      const quoted = event.messageReply;
      const botJid = activeSock.user.id.split(':')[0]; 

      
      if (
        !quoted.key.fromMe &&
        !quoted.key.participant?.includes(botJid) &&
        !quoted.senderID?.includes(botJid)
      ) {
        return message.reply('❌ You can only unsend bot messages!');
      }

      await activeSock.sendMessage(event.threadID, {
        delete: {
          remoteJid: event.threadID,
          fromMe: true,
          id: quoted.key.id
        }
      });

      await message.react('✅');
    } catch (error) {
      console.error('Unsend error:', error);
      await message.reply(`❌ Failed to unsend message: ${error.message}`);
    }
  }
};
