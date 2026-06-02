"use strict";

module.exports = {
  config: {
    name: "tid",
    version: "1.0.0",
    author: "ST",
    countDown: 5,
    role: 0,
    shortDescription: "Get the current thread/group ID",
    longDescription: "Returns the JID (Thread ID) of the current chat or group.",
    category: "info",
    guide: { en: "{pn}" }
  },

  onStart: async ({ event, message }) => {
    let text = `📋 *Thread Info*\n`;
    text += `Thread ID: ${event.threadID}\n`;
    text += `Type: ${event.isGroup ? "Group" : "DM"}`;

    if (event.isGroup && global.ST.DB) {
      try {
        const thread = await global.ST.DB.threadsData(event.threadID);
        if (thread && thread.name) text += `\nName: ${thread.name}`;
        if (thread && thread.totalMember) text += `\nMembers: ${thread.totalMember}`;
      } catch (_) {}
    }

    return message.reply(text);
  }
};
