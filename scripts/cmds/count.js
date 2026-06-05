
module.exports = {
  config: {
    name: "count",
    version: "1.0.0",
    author: "Sheikh Tamim",
    countDown: 5,
    role: 0,
    shortDescription: "View message count statistics",
    longDescription: "View your message count or global leaderboard",
    category: "info",
    guide: "{pn} - Your message count\n{pn} all - Global leaderboard"
  },

  onStart: async function ({ message, event, args }) {
    try {
      const db = global.ST?.db;

      if (!db) {
        return message.reply("❌ Database not initialized!");
      }

      if (args[0] && args[0].toLowerCase() === 'all') {
        // Global leaderboard across all groups
        const allThreads = await db.getAllThreads();
        const allGroupsList = Object.values(allThreads);

        const userStats = {};

        for (const group of allGroupsList) {
          if (group.members) {
            for (const [uid, member] of Object.entries(group.members)) {
              if (!userStats[uid]) {
                userStats[uid] = {
                  name: member.name || uid,
                  totalMsg: 0,
                  groups: 0
                };
              }
              userStats[uid].totalMsg += member.totalMsg || 0;
              userStats[uid].groups++;
            }
          }
        }

        const sorted = Object.values(userStats)
          .filter(u => u.totalMsg > 0)
          .sort((a, b) => b.totalMsg - a.totalMsg)
          .slice(0, 20);

        if (sorted.length === 0) {
          return message.reply("❌ No message data found!");
        }

        let leaderboard = `🌍 *Global Message Leaderboard*\n\n`;
        sorted.forEach((user, index) => {
          const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
          leaderboard += `${medal} ${user.name}\n`;
          leaderboard += `   💬 Messages: ${user.totalMsg}\n`;
          leaderboard += `   📊 Groups: ${user.groups}\n\n`;
        });

        await message.reply(leaderboard);
        return;
      }

      // Show user's own count
      if (event.isGroup) {
        const member = await db.getMember(event.threadID, event.senderID);
        
        if (!member) {
          return message.reply("❌ No data found for you!");
        }

        const thread = await db.getThread(event.threadID);
        const allMembers = Object.values(thread?.members || {});
        const sorted = allMembers
          .filter(m => m.totalMsg > 0)
          .sort((a, b) => b.totalMsg - a.totalMsg);

        const userRank = sorted.findIndex(m => m.uid === event.senderID) + 1;

        let countMsg = `📊 *Your Message Count*\n\n`;
        countMsg += `💬 Total Messages: ${member.totalMsg || 0}\n`;
        countMsg += `🏆 Group Rank: #${userRank} / ${sorted.length}\n`;
        countMsg += `📍 Group: ${thread?.name || 'Unknown'}\n\n`;
        countMsg += `💡 Use !count all for global leaderboard`;

        await message.reply(countMsg);
      } else {
        const dmUser = await db.getDmUser(event.senderID);
        
        if (!dmUser) {
          return message.reply("❌ No data found for you!");
        }

        let countMsg = `📊 *Your Message Count*\n\n`;
        countMsg += `💬 Total Messages: ${dmUser.totalMsg || 0}\n\n`;
        countMsg += `💡 Use !count all for global leaderboard`;

        await message.reply(countMsg);
      }

    } catch (error) {
      console.error('Count command error:', error);
      await message.reply(`❌ Error: ${error.message}`);
    }
  }
};
