
module.exports = {
  config: {
    name: "rank",
    version: "1.0.0",
    author: "Sheikh Tamim",
    countDown: 5,
    role: 0,
    shortDescription: "View rank and leaderboard",
    longDescription: "View your rank or the top 10 leaderboard",
    category: "economy",
    guide: "{pn}\n{pn} top - View leaderboard"
  },

  onStart: async function ({ message, event, args }) {
    try {
      const db = global.ST.db;

      if (!db) {
        return message.reply("❌ Database not initialized!");
      }

      if (args[0] && args[0].toLowerCase() === 'top') {
        if (event.isGroup) {
          const thread = await db.getThread(event.threadID);
          const members = Object.values(thread?.members || {});

          const sorted = members
            .filter(m => m.exp > 0)
            .sort((a, b) => b.exp - a.exp)
            .slice(0, 10);

          if (sorted.length === 0) {
            return message.reply("❌ No users with EXP in this group!");
          }

          let leaderboard = `🏆 *Top 10 Leaderboard*\n\n`;
          sorted.forEach((member, index) => {
            const rank = calculateRank(member.exp);
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
            leaderboard += `${medal} ${member.name || member.uid}\n`;
            leaderboard += `   ⭐ EXP: ${member.exp} | 🏆 ${rank.name}\n\n`;
          });

          await message.reply(leaderboard);

        } else {
          return message.reply("❌ Leaderboard only works in groups!");
        }
      } else {
        const targetUid = event.senderID;

        if (event.isGroup) {
          const member = await db.getMember(event.threadID, targetUid);

          if (!member) {
            return message.reply("❌ Your data not found!");
          }

          const rank = calculateRank(member.exp || 0);
          const thread = await db.getThread(event.threadID);
          const members = Object.values(thread?.members || {});
          const position = members
            .filter(m => m.exp > 0)
            .sort((a, b) => b.exp - a.exp)
            .findIndex(m => m.uid === targetUid) + 1;

          let rankText = `🏆 *Your Rank*\n\n`;
          rankText += `👤 Name: ${member.name || targetUid}\n`;
          rankText += `⭐ EXP: ${member.exp || 0}\n`;
          rankText += `🏆 Rank: ${rank.name} (Level ${rank.level})\n`;
          rankText += `📊 Progress: ${rank.progress}%\n`;
          if (position > 0) {
            rankText += `🎯 Position: #${position}\n`;
          }

          await message.reply(rankText);

        } else {
          const user = await db.getDmUser(targetUid);

          if (!user) {
            return message.reply("❌ Your data not found!");
          }

          const rank = calculateRank(user.exp || 0);

          let rankText = `🏆 *Your Rank*\n\n`;
          rankText += `👤 Name: ${user.name || targetUid}\n`;
          rankText += `⭐ EXP: ${user.exp || 0}\n`;
          rankText += `🏆 Rank: ${rank.name} (Level ${rank.level})\n`;
          rankText += `📊 Progress: ${rank.progress}%\n`;

          await message.reply(rankText);
        }
      }

    } catch (error) {
      console.error('Rank command error:', error);
      await message.reply(`❌ Error: ${error.message}`);
    }
  }
};

function calculateRank(exp) {
  const ranks = [
    { level: 1, name: "Newbie", requiredExp: 0 },
    { level: 2, name: "Beginner", requiredExp: 100 },
    { level: 3, name: "Amateur", requiredExp: 300 },
    { level: 4, name: "Intermediate", requiredExp: 600 },
    { level: 5, name: "Advanced", requiredExp: 1000 },
    { level: 6, name: "Expert", requiredExp: 1500 },
    { level: 7, name: "Master", requiredExp: 2100 },
    { level: 8, name: "Grandmaster", requiredExp: 2800 },
    { level: 9, name: "Legend", requiredExp: 3600 },
    { level: 10, name: "Mythic", requiredExp: 5000 }
  ];

  for (let i = ranks.length - 1; i >= 0; i--) {
    if (exp >= ranks[i].requiredExp) {
      const nextRank = ranks[i + 1];
      const progress = nextRank
        ? Math.floor(((exp - ranks[i].requiredExp) / (nextRank.requiredExp - ranks[i].requiredExp)) * 100)
        : 100;

      return {
        level: ranks[i].level,
        name: ranks[i].name,
        progress: progress
      };
    }
  }

  return { level: 1, name: "Newbie", progress: 0 };
}
