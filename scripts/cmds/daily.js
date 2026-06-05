
module.exports = {
  config: {
    name: "daily",
    version: "1.0.0",
    author: "Sheikh Tamim",
    countDown: 5,
    role: 0,
    shortDescription: "Claim daily bonus",
    longDescription: "Claim your daily bonus once every 24 hours",
    category: "economy",
    guide: "{pn}"
  },

  onStart: async function ({ message, event }) {
    try {
      const db = global.ST.db;

      if (!db) {
        return message.reply("❌ Database not initialized!");
      }

      const dailyAmount = 1000;
      const dailyExp = 50;
      const cooldown = 24 * 60 * 60 * 1000; // 24 hours

      if (event.isGroup) {
        const member = await db.getMember(event.threadID, event.senderID);
        const lastDaily = member?.lastDaily || 0;
        const now = Date.now();

        if (now - lastDaily < cooldown) {
          const timeLeft = cooldown - (now - lastDaily);
          const hoursLeft = Math.floor(timeLeft / (60 * 60 * 1000));
          const minutesLeft = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
          
          return message.reply(`⏰ *Daily Cooldown*\n\n` +
            `You can claim your next daily in:\n` +
            `⏱️ ${hoursLeft}h ${minutesLeft}m`);
        }

        const newMoney = (member?.money || 0) + dailyAmount;
        const newExp = (member?.exp || 0) + dailyExp;

        await db.updateMember(event.threadID, event.senderID, {
          money: newMoney,
          exp: newExp,
          lastDaily: now
        });

        await message.reply(`🎁 *Daily Bonus Claimed!*\n\n` +
          `💰 Money: +${dailyAmount}\n` +
          `⭐ EXP: +${dailyExp}\n\n` +
          `💵 Total Money: ${newMoney}\n` +
          `🌟 Total EXP: ${newExp}\n\n` +
          `Come back in 24 hours!`);

      } else {
        const user = await db.getDmUser(event.senderID);
        const lastDaily = user?.lastDaily || 0;
        const now = Date.now();

        if (now - lastDaily < cooldown) {
          const timeLeft = cooldown - (now - lastDaily);
          const hoursLeft = Math.floor(timeLeft / (60 * 60 * 1000));
          const minutesLeft = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
          
          return message.reply(`⏰ *Daily Cooldown*\n\n` +
            `You can claim your next daily in:\n` +
            `⏱️ ${hoursLeft}h ${minutesLeft}m`);
        }

        const newMoney = (user?.money || 0) + dailyAmount;
        const newExp = (user?.exp || 0) + dailyExp;

        await db.updateDmUser(event.senderID, {
          money: newMoney,
          exp: newExp,
          lastDaily: now
        });

        await message.reply(`🎁 *Daily Bonus Claimed!*\n\n` +
          `💰 Money: +${dailyAmount}\n` +
          `⭐ EXP: +${dailyExp}\n\n` +
          `💵 Total Money: ${newMoney}\n` +
          `🌟 Total EXP: ${newExp}\n\n` +
          `Come back in 24 hours!`);
      }

    } catch (error) {
      console.error('Daily command error:', error);
      await message.reply(`❌ Error: ${error.message}`);
    }
  }
};
