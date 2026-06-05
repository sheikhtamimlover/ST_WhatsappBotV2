
module.exports = {
  config: {
    name: "spy",
    version: "1.0.0",
    author: "Sheikh Tamim",
    countDown: 5,
    role: 0,
    shortDescription: "View detailed user information",
    longDescription: "View detailed information about a user including balance, rank, stats, and profile",
    category: "info",
    guide: "{pn} - View your details\n{pn} @user - View mentioned user's details\n{pn} [uid] - View user's details by UID"
  },

  onStart: async function ({ message, event, args, sock }) {
    try {
      const db = global.ST.db;

      if (!db) {
        return message.reply("❌ Database not initialized!");
      }

      let targetUid = event.senderID;

      if (event.messageReply && event.messageReply.senderID) {
        targetUid = event.messageReply.senderID;
      } else if (args[0]) {
        targetUid = args[0].replace('@', '').replace('@lid', '').trim();
      }

      if (event.isGroup) {
        const member = await db.getMember(event.threadID, targetUid);
        
        if (!member) {
          return message.reply("❌ User not found in this group!");
        }

        const rank = calculateRank(member.exp || 0);
        const thread = await db.getThread(event.threadID);
        const members = Object.values(thread?.members || {});
        const position = members
          .filter(m => m.exp > 0)
          .sort((a, b) => b.exp - a.exp)
          .findIndex(m => m.uid === targetUid) + 1;

        let spyText = `🕵️ *User Spy Information*\n\n`;
        spyText += `👤 Name: ${member.name || 'Unknown'}\n`;
        spyText += `🆔 UID: ${member.uid}\n`;
        spyText += `📊 Serial #: ${member.serialNumber || 'N/A'}\n`;
        spyText += `👑 Role: ${member.role || 'member'}\n`;
        spyText += `💵 Money: ${member.money || 0}\n`;
        spyText += `⭐ EXP: ${member.exp || 0}\n`;
        spyText += `🏆 Rank: ${rank.name} (Level ${rank.level})\n`;
        spyText += `📈 Progress: ${rank.progress}%\n`;
        if (position > 0) {
          spyText += `🎯 Leaderboard Position: #${position}\n`;
        }
        spyText += `💬 Total Messages: ${member.totalMsg || 0}\n`;
        spyText += `⚠️ Warnings: ${member.warning || 0}/3\n`;
        spyText += `🚫 Banned: ${member.ban ? 'Yes' : 'No'}\n`;
        if (member.ban && member.banReason) {
          spyText += `📝 Ban Reason: ${member.banReason}\n`;
        }
        if (member.joinedAt) {
          const joinDate = new Date(member.joinedAt).toLocaleDateString();
          spyText += `📅 Joined: ${joinDate}\n`;
        }

        if (member.pfp) {
          try {
            const axios = require('axios');
            const pfpBuffer = await axios.get(member.pfp, { responseType: 'arraybuffer' });
            await message.sendImage(Buffer.from(pfpBuffer.data), spyText);
          } catch {
            await message.reply(spyText);
          }
        } else {
          await message.reply(spyText);
        }

      } else {
        const user = await db.getDmUser(targetUid);
        
        if (!user) {
          return message.reply("❌ User not found!");
        }

        const rank = calculateRank(user.exp || 0);

        let spyText = `🕵️ *User Spy Information*\n\n`;
        spyText += `👤 Name: ${user.name || 'Unknown'}\n`;
        spyText += `📱 Phone: ${user.phoneNumber}\n`;
        spyText += `💵 Money: ${user.money || 0}\n`;
        spyText += `⭐ EXP: ${user.exp || 0}\n`;
        spyText += `🏆 Rank: ${rank.name} (Level ${rank.level})\n`;
        spyText += `📈 Progress: ${rank.progress}%\n`;
        spyText += `💬 Total Messages: ${user.totalMsg || 0}\n`;
        spyText += `🚫 Banned: ${user.ban ? 'Yes' : 'No'}\n`;
        if (user.ban && user.banReason) {
          spyText += `📝 Ban Reason: ${user.banReason}\n`;
        }
        if (user.createdAt) {
          const createdDate = new Date(user.createdAt).toLocaleDateString();
          spyText += `📅 Created: ${createdDate}\n`;
        }

        if (user.pfp) {
          try {
            const axios = require('axios');
            const pfpBuffer = await axios.get(user.pfp, { responseType: 'arraybuffer' });
            await message.sendImage(Buffer.from(pfpBuffer.data), spyText);
          } catch {
            await message.reply(spyText);
          }
        } else {
          await message.reply(spyText);
        }
      }

    } catch (error) {
      console.error('Spy command error:', error);
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
