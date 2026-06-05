module.exports = {
  config: {
    name: "example",
    version: "1.0.0",
    author: "Sheikh Tamim",
    countDown: 5,
    role: 0,
    shortDescription: "Demonstrates all GoatBot v2 functions",
    longDescription: "A full interactive example showing how onStart, onChat, onReply, and onReaction work together",
    category: "fun",
    guide: "{pn} or reply or react"
  },

  // 📦 Called when command is triggered (e.g., user sends: !example)
  onStart: async function ({ message, event, api, args }) {
    const msg = await message.reply("👋 Hi! This is the *onStart* function.\nReply to this message with anything!");
    // store reply handler
    global.ST.onReply.set(msg.key.id, {
      commandName: this.config.name,
      author: event.senderID
    });
  },

  // 💬 Called when a user chats normally (not a command)
  onChat: async function ({ event, message }) {
    const text = event.body?.toLowerCase();
    if (!text) return;

    // Example: auto respond to specific keywords
    if (text.includes("hello")) {
      return message.reply("👋 Hello there! (from onChat)");
    }

    if (text.includes("st bot") || text.includes("stbot")) {
      return message.reply("🤖 ST_WhatsappBot is active!");
    }
  },

  // 💭 Called when user replies to a bot message that used onStart
  onReply: async function ({ message, event, api, Reply }) {
    if (event.senderID !== Reply.author) return message.reply("This reply is not for you!");
    const msg = await message.reply(`🗨️ You replied: “${event.body}”\nReact to this message to trigger onReaction!`);

    // store reaction handler
    global.ST.onReaction.set(msg.key.id, {
      commandName: this.config.name,
      author: event.senderID
    });
  },

  // 💟 Called when user reacts (emoji) to a message sent by this command
  onReaction: async function ({ message, event, Reaction }) {
    if (event.userID !== Reaction.author) return;
    return message.reply(`💫 You reacted with: ${event.reaction}\n(onReaction triggered!)`);
  }
};