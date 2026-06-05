
const axios = require('axios');

module.exports = {
  config: {
    name: "update",
    version: "1.0.0",
    author: "Sheikh Tamim",
    category: "admin",
    description: "Check and update the bot to the latest version",
    role: 1,
    usage: "update"
  },

  onStart: async function ({ message, event, api, sock }) {
    try {
      const currentVersion = require('../../package.json').version;
      
     
      
      const { data: versions } = await axios.get('https://raw.githubusercontent.com/sheikhtamimlover/ST_WhatsappBot/main/version.json');
      const latestVersion = versions[versions.length - 1].version;
      
      if (currentVersion === latestVersion) {
        return message.reply(`✅ You are using ST_WhatsappBot latest version (v${currentVersion})`);
      }
      
      const indexCurrentVersion = versions.findIndex(v => v.version === currentVersion);
      const versionsNeedToUpdate = versions.slice(indexCurrentVersion + 1);
      
      let updateInfo = `🆕 New Version Available!\n\n`;
      updateInfo += `📦 Current: v${currentVersion}\n`;
      updateInfo += `📦 Latest: v${latestVersion}\n\n`;
      updateInfo += `📋 Update Notes:\n`;
      
      versionsNeedToUpdate.forEach(v => {
        updateInfo += `\n📌 v${v.version}`;
        if (v.note) {
          updateInfo += `\n   ${v.note}`;
        }
        
        const fileCount = Object.keys(v.files || {}).length;
        const deleteCount = Object.keys(v.deleteFiles || {}).length;
        
        if (fileCount > 0) {
          updateInfo += `\n   📝 Files to update: ${fileCount}`;
        }
        if (deleteCount > 0) {
          updateInfo += `\n   🗑️ Files to delete: ${deleteCount}`;
        }
      });
      
      updateInfo += `\n\n⚠️ Reply with "yes" to start the update process.`;
      updateInfo += `\n⏱️ You have 60 seconds to confirm.`;
      
      const sentMsg = await message.reply(updateInfo);
      
      if (sentMsg && sentMsg.key) {
        global.ST.onReply.set(sentMsg.key.id, {
          commandName: 'update',
          messageID: sentMsg.key.id,
          author: event.senderID,
          versionsToUpdate: versionsNeedToUpdate,
          currentVersion: currentVersion,
          latestVersion: latestVersion
        });
        
        setTimeout(() => {
          global.ST.onReply.delete(sentMsg.key.id);
        }, 60000);
      }
      
    } catch (error) {
      console.error('Update check error:', error);
      await message.reply(`❌ Error checking for updates: ${error.message}`);
    }
  },

  onReply: async function ({ message, event, api, Reply, sock }) {
    try {
      const userReply = event.body.trim().toLowerCase();
      
      if (event.senderID !== Reply.author) {
        return;
      }
      
      if (userReply !== 'yes') {
        global.ST.onReply.delete(Reply.messageID);
        return message.reply('❌ Update cancelled.');
      }
      
      await message.reply('🔄 Starting update process...\nPlease wait, this may take a moment.');
      
      const { execSync } = require('child_process');
      
      try {
        execSync('node updater.js', { stdio: 'inherit', cwd: process.cwd() });
        await message.reply('✅ Update completed successfully!\n🔄 Please restart the bot to apply changes.');
      } catch (error) {
        await message.reply(`❌ Update failed: ${error.message}\n\nYou can try manually running: node updater.js`);
      }
      
      global.ST.onReply.delete(Reply.messageID);
      
    } catch (error) {
      console.error('Update onReply error:', error);
      await message.reply(`❌ Error during update: ${error.message}`);
    }
  }
};
