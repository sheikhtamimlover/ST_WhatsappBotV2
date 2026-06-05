
module.exports = {
  config: {
    name: "noti",
    version: "1.0.0",
    author: "Sheikh Tamim",
    countDown: 5,
    role: 2,
    shortDescription: "Send notification to users",
    longDescription: "Send notifications to all users or specific groups/DMs",
    category: "admin",
    guide: "{pn} all [message] - Send to all\n{pn} [tid] [message] - Send to specific group\n{pn} list - View all groups"
  },

  onStart: async function ({ message, event, args, sock, config }) {
    try {
      const db = global.ST.db;

      if (!db) {
        return message.reply("❌ Database not initialized!");
      }

      if (args.length === 0) {
        return message.reply(`📖 Noti Command Usage:*\n\n` +
          `• ${config.prefix}noti all [message] - Send to all GCs and DMs\n` +
          `• ${config.prefix}noti [tid] [message] - Send to specific GC\n` +
          `• ${config.prefix}noti [tid1] [tid2] [message] - Send to multiple GCs\n` +
          `• ${config.prefix}noti list - View all groups\n\n` +
          `Reply to attachment(s) with command to include them`);
      }

      if (args[0].toLowerCase() === 'list') {
        const threadsObj = await db.getAllThreads();
        const threads = Object.values(threadsObj);

        if (!threads || threads.length === 0) {
          return message.reply("❌ No groups found!");
        }

        const perPage = 10;
        const totalPages = Math.ceil(threads.length / perPage);
        const page = 1;

        const startIndex = (page - 1) * perPage;
        const endIndex = startIndex + perPage;
        const pageThreads = threads.slice(startIndex, endIndex);

        let listMsg = `📋 *Group List* (Page ${page}/${totalPages})\n\n`;
        pageThreads.forEach((thread, index) => {
          const serialNo = startIndex + index + 1;
          listMsg += `${serialNo}. ${thread.name || 'Unknown'}\n`;
          listMsg += `   👥 Members: ${thread.totalUsers || 0}\n`;
          listMsg += `   💬 Messages: ${thread.totalMsg || 0}\n`;
          listMsg += `   🆔 TID: ${thread.tid}\n\n`;
        });

        listMsg += `\n📄 Reply with:\n`;
        listMsg += `• p [number] - Change page\n`;
        listMsg += `• [serial number] [message] - Send to that group`;

        const sent = await message.reply(listMsg);

        if (sent && sent.key) {
          global.ST.onReply.set(sent.key.id, {
            commandName: 'noti',
            messageID: sent.key.id,
            author: event.senderID,
            type: 'list',
            threads: threads,
            currentPage: page,
            totalPages: totalPages,
            perPage: perPage
          });
        }

        return;
      }

      const attachments = event.messageReply?.attachments || [];
      const hasReplyMedia = attachments.length > 0 && event.messageReply;
      let targetTids = [];
      let msgText = '';

      if (args[0].toLowerCase() === 'all') {
        msgText = args.slice(1).join(' ');
        const threadsObj = await db.getAllThreads();
        const dmUsersObj = await db.getAllDmUsers();
        
        const threads = Object.values(threadsObj);
        const dmUsers = Object.values(dmUsersObj);

        targetTids = threads.map(t => t.tid);
        const dmJids = dmUsers.map(u => u.phoneNumber.includes('@') ? u.phoneNumber : `${u.phoneNumber}@s.whatsapp.net`);

        if (!msgText && !hasReplyMedia) {
          return message.reply("❌ Please provide a message or attachment!");
        }

        await message.reply(`📤 Sending notification to ${targetTids.length} groups and ${dmJids.length} DM users...`);

        let successCount = 0;
        let failCount = 0;

        const notiMsg = `📢 *Admin Notification*\n\n${msgText}`;

        for (const tid of targetTids) {
          try {
            await sock.sendMessage(tid, { text: notiMsg });

            if (hasReplyMedia) {
              try {
                const buffer = await message.downloadMedia();

                for (const attachment of attachments) {
                  if (attachment.type === 'image') {
                    await sock.sendMessage(tid, { image: buffer, caption: attachment.caption || '' });
                  } else if (attachment.type === 'video') {
                    await sock.sendMessage(tid, { video: buffer, caption: attachment.caption || '' });
                  } else if (attachment.type === 'audio') {
                    await sock.sendMessage(tid, { audio: buffer, mimetype: 'audio/mp4' });
                  } else if (attachment.type === 'document') {
                    await sock.sendMessage(tid, { 
                      document: buffer, 
                      fileName: attachment.fileName || 'document',
                      mimetype: attachment.mimetype || 'application/octet-stream'
                    });
                  }
                }
              } catch (mediaError) {
                console.error('Media download error:', mediaError.message);
              }
            }
            successCount++;
          } catch (error) {
            failCount++;
          }
        }

        for (const dmJid of dmJids) {
          try {
            await sock.sendMessage(dmJid, { text: notiMsg });

            if (hasReplyMedia) {
              try {
                const buffer = await message.downloadMedia();

                for (const attachment of attachments) {
                  if (attachment.type === 'image') {
                    await sock.sendMessage(dmJid, { image: buffer, caption: attachment.caption || '' });
                  } else if (attachment.type === 'video') {
                    await sock.sendMessage(dmJid, { video: buffer, caption: attachment.caption || '' });
                  } else if (attachment.type === 'audio') {
                    await sock.sendMessage(dmJid, { audio: buffer, mimetype: 'audio/mp4' });
                  } else if (attachment.type === 'document') {
                    await sock.sendMessage(dmJid, { 
                      document: buffer, 
                      fileName: attachment.fileName || 'document',
                      mimetype: attachment.mimetype || 'application/octet-stream'
                    });
                  }
                }
              } catch (mediaError) {
                console.error('Media download error:', mediaError.message);
              }
            }
            successCount++;
          } catch (error) {
            failCount++;
          }
        }

        return message.reply(`✅ Notification sent!\n📊 Success: ${successCount} | Failed: ${failCount}`);

      } else {
        const tids = [];
        let messageStartIndex = 0;

        for (let i = 0; i < args.length; i++) {
          if (args[i].includes('@g.us') || args[i].length > 10) {
            tids.push(args[i]);
            messageStartIndex = i + 1;
          } else {
            break;
          }
        }

        if (tids.length === 0) {
          return message.reply("❌ Please provide valid TID(s)!");
        }

        msgText = args.slice(messageStartIndex).join(' ');

        if (!msgText && !hasReplyMedia) {
          return message.reply("❌ Please provide a message or attachment!");
        }

        const notiMsg = `📢 *Admin Notification*\n\n${msgText}`;
        let successCount = 0;
        let failCount = 0;

        for (const tid of tids) {
          try {
            await sock.sendMessage(tid, { text: notiMsg });

            if (hasReplyMedia) {
              try {
                const buffer = await message.downloadMedia();

                for (const attachment of attachments) {
                  if (attachment.type === 'image') {
                    await sock.sendMessage(tid, { image: buffer, caption: attachment.caption || '' });
                  } else if (attachment.type === 'video') {
                    await sock.sendMessage(tid, { video: buffer, caption: attachment.caption || '' });
                  } else if (attachment.type === 'audio') {
                    await sock.sendMessage(tid, { audio: buffer, mimetype: 'audio/mp4' });
                  } else if (attachment.type === 'document') {
                    await sock.sendMessage(tid, { 
                      document: buffer, 
                      fileName: attachment.fileName || 'document',
                      mimetype: attachment.mimetype || 'application/octet-stream'
                    });
                  }
                }
              } catch (mediaError) {
                console.error('Media download error:', mediaError.message);
              }
            }
            successCount++;
          } catch (error) {
            failCount++;
          }
        }

        return message.reply(`✅ Notification sent to ${tids.length} group(s)!\n📊 Success: ${successCount} | Failed: ${failCount}`);
      }

    } catch (error) {
      console.error('Noti command error:', error);
      await message.reply(`❌ Error: ${error.message}`);
    }
  },

  onReply: async function ({ message, event, Reply, sock }) {
    try {
      if (event.senderID !== Reply.author) {
        return;
      }

      const userReply = event.body.trim();
      const parts = userReply.split(/\s+/);

      if (Reply.type === 'list') {
        if (parts[0].toLowerCase() === 'p' && parts[1]) {
          const newPage = parseInt(parts[1]);

          if (isNaN(newPage) || newPage < 1 || newPage > Reply.totalPages) {
            return message.reply(`❌ Invalid page number! Please enter 1-${Reply.totalPages}`);
          }

          const startIndex = (newPage - 1) * Reply.perPage;
          const endIndex = startIndex + Reply.perPage;
          const pageThreads = Reply.threads.slice(startIndex, endIndex);

          let listMsg = `📋 *Group List* (Page ${newPage}/${Reply.totalPages})\n\n`;
          pageThreads.forEach((thread, index) => {
            const serialNo = startIndex + index + 1;
            listMsg += `${serialNo}. ${thread.name || 'Unknown'}\n`;
            listMsg += `   👥 Members: ${thread.totalUsers || 0}\n`;
            listMsg += `   💬 Messages: ${thread.totalMsg || 0}\n`;
            listMsg += `   🆔 TID: ${thread.tid}\n\n`;
          });

          listMsg += `\n📄 Reply with:\n`;
          listMsg += `• p [number] - Change page\n`;
          listMsg += `• [serial number] [message] - Send to that group`;

          await message.unsend(event.messageReply.key);
          const sent = await message.reply(listMsg);

          if (sent && sent.key) {
            global.ST.onReply.set(sent.key.id, {
              commandName: 'noti',
              messageID: sent.key.id,
              author: event.senderID,
              type: 'list',
              threads: Reply.threads,
              currentPage: newPage,
              totalPages: Reply.totalPages,
              perPage: Reply.perPage
            });
          }

          global.ST.onReply.delete(Reply.messageID);
          return;
        }

        const serialNos = parts[0].split('/').map(n => parseInt(n.trim()));
        const msgText = parts.slice(1).join(' ');
        const attachments = event.messageReply?.attachments || [];
        const hasReplyMedia = attachments.length > 0 && event.messageReply;

        if (serialNos.some(n => isNaN(n))) {
          return message.reply("❌ Invalid serial number format! Use: 1 or 1/2/3");
        }

        if (!msgText && !hasReplyMedia) {
          return message.reply("❌ Please provide a message or attachment!");
        }

        const notiMsg = `📢 *Admin Notification*\n\n${msgText}`;
        let successCount = 0;
        let failCount = 0;

        for (const serialNo of serialNos) {
          if (serialNo < 1 || serialNo > Reply.threads.length) {
            failCount++;
            continue;
          }

          const thread = Reply.threads[serialNo - 1];

          try {
            await sock.sendMessage(thread.tid, { text: notiMsg });

            if (hasReplyMedia) {
              try {
                const buffer = await message.downloadMedia();

                for (const attachment of attachments) {
                  if (attachment.type === 'image') {
                    await sock.sendMessage(thread.tid, { image: buffer, caption: attachment.caption || '' });
                  } else if (attachment.type === 'video') {
                    await sock.sendMessage(thread.tid, { video: buffer, caption: attachment.caption || '' });
                  } else if (attachment.type === 'audio') {
                    await sock.sendMessage(thread.tid, { audio: buffer, mimetype: 'audio/mp4' });
                  } else if (attachment.type === 'document') {
                    await sock.sendMessage(thread.tid, { 
                      document: buffer, 
                      fileName: attachment.fileName || 'document',
                      mimetype: attachment.mimetype || 'application/octet-stream'
                    });
                  }
                }
              } catch (mediaError) {
                console.error('Media download error:', mediaError.message);
              }
            }
            successCount++;
          } catch (error) {
            failCount++;
          }
        }

        await message.reply(`✅ Notification sent!\n📊 Success: ${successCount} | Failed: ${failCount}`);
        global.ST.onReply.delete(Reply.messageID);
      }

    } catch (error) {
      console.error('Noti onReply error:', error);
      await message.reply(`❌ Error: ${error.message}`);
    }
  }
};
