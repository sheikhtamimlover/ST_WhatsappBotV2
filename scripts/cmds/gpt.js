const axios = require('axios');

module.exports = {
  config: {
    name: 'gpt',
    aliases: [],
    version: '1.0.0',
    author: 'ST',
    countDown: 0,
    role: 0,
    shortDescription: 'Chat with GPT',
    longDescription: 'Chat with GPT AI',
    category: 'AI',
    guide: {
      en: '{pn} <your message>\nReply to bot message to continue conversation'
    }
  },

  onStart: async function ({ args, message, event }) {
    try {
      if (!args[0]) {
        return message.reply(
          "Hello! I'm GPT AI\nHow can I assist you today?\n\nUsage: gpt <your message>"
        );
      }

      const userMessage = args.join(' ');

      let data = JSON.stringify({
        "agent": 1,
        "context": [
          {
            "role": "user",
            "content": userMessage
          }
        ],
        "message": userMessage
      });

      let config = {
        method: 'POST',
        url: 'https://api.manusai.watch/api/chat',
        headers: {
          'User-Agent': 'Masiha%20AI/1 CFNetwork/3860.100.1 Darwin/25.0.0',
          'Content-Type': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        data: data
      };

      const response = await axios.request(config);

      if (response.data && response.data.status && response.data.data) {
        const gptResponse = response.data.data;
        
        const sentMsg = await message.reply(gptResponse);

        if (sentMsg && sentMsg.key && sentMsg.key.id) {
          global.ST.onReply.set(sentMsg.key.id, {
            commandName: 'gpt',
            type: 'reply',
            messageID: sentMsg.key.id,
            author: event.senderID
          });
        }
      } else {
        await message.reply('❌ No response from AI.');
      }

    } catch (error) {
      console.error('GPT Error:', error.message);
      await message.reply(`❌ An error occurred: ${error.message}`);
    }
  },

  onReply: async function ({ event, Reply, message }) {
    if (event.senderID !== Reply.author) {
      return;
    }

    const userMessage = event.body?.toLowerCase() || '';
    if (userMessage === '/r' || userMessage === '/edittext' || !userMessage) return;

    try {
      let data = JSON.stringify({
        "agent": 1,
        "context": [
          {
            "role": "user",
            "content": event.body
          }
        ],
        "message": event.body
      });

      let config = {
        method: 'POST',
        url: 'https://api.manusai.watch/api/chat',
        headers: {
          'User-Agent': 'Masiha%20AI/1 CFNetwork/3860.100.1 Darwin/25.0.0',
          'Content-Type': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        data: data
      };

      const response = await axios.request(config);

      if (response.data && response.data.status && response.data.data) {
        const gptResponse = response.data.data;

        const sentMsg = await message.reply(gptResponse);

        if (sentMsg && sentMsg.key && sentMsg.key.id) {
          global.ST.onReply.set(sentMsg.key.id, {
            commandName: 'gpt',
            type: 'reply',
            messageID: sentMsg.key.id,
            author: event.senderID
          });
        }
      } else {
        await message.reply('❌ No response from AI.');
      }

    } catch (error) {
      console.error('GPT Error:', error.message);
      await message.reply('❌ An error occurred while processing your request.');
    }
  }
};
