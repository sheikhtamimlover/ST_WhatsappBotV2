const axios = require("axios");
const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "members",
    aliases: [],
    version: "1.0",
    author: "ST | Sheikh Tamim",
    countDown: 10,
    role: 0,
    shortDescription: "Show all group members with avatars",
    longDescription: "Display all group members with their avatars on a canvas",
    category: "group",
    guide: "{pn}"
  },

  onStart: async function ({ message, event, sock }) {
    try {
      if (!event.isGroup) {
        return message.reply("🌚 This command only works in groups.");
      }

      await message.react('⏳');

      const threadData = await sock.groupMetadata(event.threadID);
      const groupName = threadData.subject;
      const participants = threadData.participants;
      const totalMembers = participants.length;

      // Get admins
      const admins = participants.filter(p => p.admin);
      const adminCount = admins.length;

      // Calculate canvas size based on member count
      const membersPerRow = 5;
      const avatarSize = 120;
      const spacing = 20;
      const headerHeight = 150;
      const footerHeight = 80;
      
      const rows = Math.ceil(Math.min(totalMembers, 25) / membersPerRow); // Limit to 25 members
      const canvasWidth = (membersPerRow * (avatarSize + spacing)) + spacing;
      const canvasHeight = headerHeight + (rows * (avatarSize + spacing + 40)) + footerHeight;

      const canvas = createCanvas(canvasWidth, canvasHeight);
      const ctx = canvas.getContext("2d");

      // Background gradient
      const gradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
      gradient.addColorStop(0, '#667eea');
      gradient.addColorStop(1, '#764ba2');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Header section
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(0, 0, canvasWidth, headerHeight);

      // Group name
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(groupName, canvasWidth / 2, 50);

      // Stats
      ctx.font = '20px Arial';
      ctx.fillText(`👥 Total Members: ${totalMembers} | 👑 Admins: ${adminCount}`, canvasWidth / 2, 100);

      // Draw member avatars
      let x = spacing;
      let y = headerHeight + spacing;
      let count = 0;

      for (const participant of participants) {
        if (count >= 25) break; // Limit to 25 members for performance

        const memberId = participant.id.split('@')[0];
        let memberName = memberId;
        
        // Get member name from database
        const db = global.ST?.db;
        if (db) {
          try {
            const member = await db.getMember(event.threadID, memberId);
            memberName = member?.name || memberId;
          } catch (err) {}
        }

        // Get profile picture
        let avatar;
        try {
          const avatarUrl = await sock.profilePictureUrl(participant.id, 'image');
          if (avatarUrl) {
            const response = await axios.get(avatarUrl, { responseType: 'arraybuffer', timeout: 5000 });
            if (response.headers['content-type'] && response.headers['content-type'].startsWith('image/')) {
              avatar = await loadImage(Buffer.from(response.data));
            } else {
              throw new Error('Non-image response');
            }
          } else {
            throw new Error('No profile picture');
          }
        } catch (err) {
          // Create default avatar
          avatar = await createDefaultAvatar(memberName.charAt(0).toUpperCase());
        }

        // Draw circular avatar
        ctx.save();
        ctx.beginPath();
        ctx.arc(x + avatarSize / 2, y + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, x, y, avatarSize, avatarSize);
        ctx.restore();

        // Draw admin crown if admin
        if (participant.admin) {
          ctx.font = 'bold 30px Arial';
          ctx.fillText('👑', x + avatarSize - 25, y + 10);
        }

        // Draw name below avatar
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        const shortName = memberName.length > 12 ? memberName.substring(0, 12) + '...' : memberName;
        ctx.fillText(shortName, x + avatarSize / 2, y + avatarSize + 20);

        // Move to next position
        x += avatarSize + spacing;
        count++;

        if (count % membersPerRow === 0) {
          x = spacing;
          y += avatarSize + spacing + 40;
        }
      }

      // Footer
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(0, canvasHeight - footerHeight, canvasWidth, footerHeight);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '18px Arial';
      ctx.textAlign = 'center';
      
      if (totalMembers > 25) {
        ctx.fillText(`Showing first 25 of ${totalMembers} members`, canvasWidth / 2, canvasHeight - 40);
      } else {
        ctx.fillText(`ST WhatsApp Bot • All Members`, canvasWidth / 2, canvasHeight - 40);
      }

      // Save and send
      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);
      
      const outputPath = path.join(cacheDir, `members_${Date.now()}.png`);
      const out = fs.createWriteStream(outputPath);
      const stream = canvas.createPNGStream();
      
      // Error handlers
      stream.on('error', (err) => {
        console.error("Canvas stream error:", err);
        message.reply("❌ Error creating members image").catch(() => {});
      });
      
      out.on('error', (err) => {
        console.error("File write error:", err);
        message.reply("❌ Error saving members image").catch(() => {});
      });
      
      stream.pipe(out);

      out.on("finish", async () => {
        try {
          await message.react('✅');
          
          await message.sendImage(
            fs.readFileSync(outputPath),
            `📊 ${groupName}\n\n👥 Total Members: ${totalMembers}\n👑 Admins: ${adminCount}\n${totalMembers > 25 ? `\n⚠️ Showing first 25 members` : ''}`
          );

          if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
          }
        } catch (err) {
          console.error("Error sending members image:", err);
          message.reply("❌ Error sending members image").catch(() => {});
        }
      });

    } catch (error) {
      console.error("Members command error:", error);
      return message.reply("❌ An error occurred while creating the members image.\n" + error.message);
    }
  }
};

// Helper function to create default avatar
async function createDefaultAvatar(initial) {
  const avatarCanvas = createCanvas(200, 200);
  const context = avatarCanvas.getContext('2d');
  
  // Random color based on initial
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F3A683', '#778BEB'];
  const colorIndex = initial.charCodeAt(0) % colors.length;
  
  context.fillStyle = colors[colorIndex];
  context.fillRect(0, 0, 200, 200);
  
  context.fillStyle = '#FFFFFF';
  context.font = 'bold 80px Arial';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(initial, 100, 100);
  
  // Return a Promise that resolves to an Image object
  return new Promise((resolve) => {
    const buffer = avatarCanvas.toBuffer('image/png');
    loadImage(buffer).then(resolve).catch(() => resolve(avatarCanvas));
  });
}
