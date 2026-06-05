
module.exports = {
  config: {
    name: "callad",
    version: "1.0.0",
    author: "Sheikh Tamim",
    countDown: 5,
    role: 0,
    shortDescription: "Send message to admin",
    longDescription: "Send a message with or without attachments to the admin",
    category: "user",
    guide: "{pn} [message] - Reply to attachment(s) with this command to forward to admin"
  },

  onStart: async function ({ message, event, args, sock, config }) {
    try {
      const db = global.ST.db;
      
      if (!db) {
        return message.reply("❌ Database not initialized!");
      }

      const dmAdmins = Array.isArray(config.dmAdmin) ? config.dmAdmin : [];
      
      if (dmAdmins.length === 0) {
        return message.reply("❌ No admin configured!");
      }

      const userMessage = args.join(' ') || '';
      
      const attachments = event.messageReply?.attachments || event.attachments || [];
      const hasReplyMedia = attachments.length > 0 && event.messageReply;
      const hasCurrentMedia = event.attachments && event.attachments.length > 0;
      
      if (!userMessage && !hasReplyMedia && !hasCurrentMedia) {
        return message.reply(`📖 *CallAd Usage:*\n\n` +
          `• Reply to attachment(s) with ${config.prefix}callad [message]\n` +
          `• Or send ${config.prefix}callad [message] directly`);
      }

      const senderName = event.isGroup 
        ? (await db.getMember(event.threadID, event.senderID))?.name || event.senderID
        : (await db.getDmUser(event.senderID))?.name || event.senderID;

      const location = event.isGroup 
        ? `GC: ${(await db.getThread(event.threadID))?.name || event.threadID}`
        : `DM`;

      let adminMsg = `📬 *Message from User*\n\n`;
      adminMsg += `👤 From: ${senderName}\n`;
      adminMsg += `📍 Location: ${location}\n`;
      adminMsg += `🆔 UID: ${event.senderID}\n`;
      if (event.isGroup) {
        adminMsg += `🆔 TID: ${event.threadID}\n`;
      }
      adminMsg += `\n💬 Message: ${userMessage || '(No text message)'}`;

      for (const adminId of dmAdmins) {
        const adminJid = adminId.includes('@') ? adminId : `${adminId}@s.whatsapp.net`;
        
        try {
          await sock.sendMessage(adminJid, { text: adminMsg });
          
          if (hasReplyMedia || hasCurrentMedia) {
            try {
              const buffer = await message.downloadMedia();
              
              for (const attachment of attachments) {
                if (attachment.type === 'image') {
                  await sock.sendMessage(adminJid, {
                    image: buffer,
                    caption: attachment.caption || ''
                  });
                } else if (attachment.type === 'video') {
                  await sock.sendMessage(adminJid, {
                    video: buffer,
                    caption: attachment.caption || ''
                  });
                } else if (attachment.type === 'audio') {
                  await sock.sendMessage(adminJid, {
                    audio: buffer,
                    mimetype: 'audio/mp4'
                  });
                } else if (attachment.type === 'document') {
                  await sock.sendMessage(adminJid, {
                    document: buffer,
                    fileName: attachment.fileName || 'document',
                    mimetype: attachment.mimetype || 'application/octet-stream'
                  });
                }
              }
            } catch (mediaError) {
              console.error('Media download error:', mediaError.message);
              await sock.sendMessage(adminJid, { text: '(Media could not be forwarded)' });
            }
          }
        } catch (error) {
          console.error(`Error sending to admin ${adminId}:`, error.message);
        }
      }

      await message.reply("✅ Your message has been sent to the admin!");

    } catch (error) {
      console.error('CallAd command error:', error);
      await message.reply(`❌ Error: ${error.message}`);
    }
  }
};
