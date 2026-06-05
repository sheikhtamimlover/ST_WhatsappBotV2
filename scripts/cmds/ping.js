const os = require("os");

module.exports = {
  config: {
    name: "ping",
    version: "1.0.0",
    author: "Sheikh Tamim",
    countDown: 5,
    role: 0,
    shortDescription: "Check bot response time and stats",
    longDescription: "Checks the bot's response time, uptime, and database statistics with loading animation",
    category: "system",
    guide: "{pn}"
  },

  onStart: async function ({ message, event, api, args, sock }) {
    try {
      const loadingStages = [
        '[█▒▒▒▒▒▒▒▒▒]',
        '[███▒▒▒▒▒▒▒]',
        '[█████▒▒▒▒▒]',
        '[███████▒▒▒]',
        '[██████████]'
      ];

      const start = Date.now();
      const sent = await message.reply(loadingStages[0]);

      let loadingProgress = 0;
      let editCount = 0;
      const maxEdits = 4;

      const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

      for (let i = 0; i < maxEdits; i++) {
        editCount++;
        loadingProgress += Math.random() * 15 + 20;

        if (editCount >= maxEdits || loadingProgress >= 100) {
          loadingProgress = 100;
          break;
        }

        const stageIndex = Math.min(Math.floor(loadingProgress / 25), loadingStages.length - 2);
        const stageText = loadingStages[stageIndex];

        try {
          await message.edit(sent.key, `${stageText}\n\n📈 ${Math.floor(loadingProgress)}% Complete`);
          await sleep(600);
        } catch (err) {}
      }

      const end = Date.now();
      const responseTime = end - start;

      const uptime = process.uptime();
      const hours = Math.floor(uptime / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      const seconds = Math.floor(uptime % 60);

      const db = global.ST?.db;
      let totalDmUsers = 0;
      let totalGroups = 0;
      let totalGroupUsers = 0;

      if (db) {
        try {
          const allDmUsers = await db.getAllDmUsers ? await db.getAllDmUsers() : {};
          const allThreads = await db.getAllThreads();
          
          totalDmUsers = Object.keys(allDmUsers).length;
          totalGroups = Object.keys(allThreads).length;
          
          for (const thread of Object.values(allThreads)) {
            if (thread.members) {
              totalGroupUsers += Object.keys(thread.members).length;
            }
          }
        } catch (err) {
          global.log.error('Error fetching DB stats:', err.message);
        }
      }

      const memUsage = process.memoryUsage();
      const memUsedMB = (memUsage.heapUsed / 1024 / 1024).toFixed(2);
      const memTotalMB = (memUsage.heapTotal / 1024 / 1024).toFixed(2);

      const totalMem = os.totalmem() / (1024 * 1024);
      const freeMem = os.freemem() / (1024 * 1024);
      const usedMem = totalMem - freeMem;
      const memUsagePercent = ((usedMem / totalMem) * 100).toFixed(1);

      const getStatusIndicator = (ping) => {
        if (ping < 100) return "🟢 Excellent";
        if (ping < 300) return "🟡 Good";
        if (ping < 500) return "🟠 Fair";
        return "🔴 Poor";
      };

      const getMemoryStatus = (percent) => {
        if (percent < 60) return "🟢 Optimal";
        if (percent < 80) return "🟡 Moderate";
        return "🔴 High";
      };

      const pingText = `╭─────────────────────────────────╮
│           🏓 ST BOT PING           │
╰─────────────────────────────────╯

📡 Network Performance
├─ Response: ${responseTime}ms ${getStatusIndicator(responseTime)}
└─ Status: Online & Operational ✅

⏱️ Uptime Statistics
└─ Bot Uptime: ${hours}h ${minutes}m ${seconds}s

💾 Memory Usage
├─ Heap Used: ${memUsedMB}MB / ${memTotalMB}MB
├─ System: ${memUsagePercent}% ${getMemoryStatus(parseFloat(memUsagePercent))}
└─ Available: ${freeMem.toFixed(1)}MB

📊 Database Stats
├─ DM Users: ${totalDmUsers}
├─ Groups: ${totalGroups}
└─ Group Users: ${totalGroupUsers}

╭─────────────────────────────────╮
│     Powered by ST | Sheikh Tamim     │
╰─────────────────────────────────╯`;

      await message.edit(sent.key, pingText);

    } catch (error) {
      global.log.error('Ping command error:', error);
      await message.reply(`❌ Error: ${error.message}`);
    }
  }
};