
module.exports = {
  config: {
    name: "leave",
    version: "1.0.0",
    author: "Sheikh Tamim",
    countDown: 5,
    role: 2,
    shortDescription: "Leave groups",
    longDescription: "Make bot leave from groups by list or TID",
    category: "admin",
    guide: "{pn} - Show all groups with serial numbers\n{pn} <tid> - Leave specific group"
  },

  onStart: async function ({ message, event, args, sock }) {
    try {
      const db = global.ST?.db;

      if (!db) {
        return message.reply("❌ Database not initialized!");
      }

      if (args.length === 0) {
        const threads = await db.getAllThreads();
        const groupList = Object.values(threads);

        if (groupList.length === 0) {
          return message.reply("❌ Bot is not in any groups!");
        }

        let listMsg = `📋 *Groups List*\n\n`;
        groupList.forEach((group, index) => {
          listMsg += `${index + 1}. ${group.name || 'Unknown'}\n`;
          listMsg += `   👥 Members: ${group.totalUsers || 0}\n`;
          listMsg += `   🆔 TID: ${group.tid}\n\n`;
        });

        listMsg += `\n💡 Reply with:\n`;
        listMsg += `• Serial number to leave that group\n`;
        listMsg += `• Multiple numbers like: 1/2/3`;

        const sent = await message.reply(listMsg);

        if (sent && sent.key) {
          global.ST.onReply.set(sent.key.id, {
            commandName: 'leave',
            messageID: sent.key.id,
            author: event.senderID,
            groups: groupList
          });
        }

        return;
      }

      // Leave by TID
      const tid = args[0];

      try {
        await message.reply(`🚪 Leaving group...`);
        await sock.groupLeave(tid);
        await message.reply(`✅ Successfully left the group!`);
      } catch (error) {
        await message.reply(`❌ Failed to leave: ${error.message}`);
      }

    } catch (error) {
      console.error('Leave command error:', error);
      await message.reply(`❌ Error: ${error.message}`);
    }
  },

  onReply: async function ({ message, event, Reply, sock }) {
    try {
      if (event.senderID !== Reply.author) {
        return;
      }

      const userReply = event.body.trim();
      const serialNos = userReply.split('/').map(n => parseInt(n.trim()));

      if (serialNos.some(n => isNaN(n))) {
        return message.reply("❌ Invalid serial number format! Use: 1 or 1/2/3");
      }

      let successCount = 0;
      let failCount = 0;

      for (const serialNo of serialNos) {
        if (serialNo < 1 || serialNo > Reply.groups.length) {
          failCount++;
          continue;
        }

        const group = Reply.groups[serialNo - 1];

        try {
          await sock.groupLeave(group.tid);
          successCount++;
        } catch (error) {
          failCount++;
        }
      }

      await message.reply(`✅ Left ${successCount} group(s)!\n❌ Failed: ${failCount}`);
      global.ST.onReply.delete(Reply.messageID);

    } catch (error) {
      console.error('Leave onReply error:', error);
      await message.reply(`❌ Error: ${error.message}`);
    }
  }
};
