const os = require("os");
const moment = require("moment-timezone");
const { createCanvas } = require("canvas");
const GIFEncoder = require("gifencoder");
const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "cpanel",
    version: "1.0.1",
    author: "ST",
    description: "Generates an animated GIF system dashboard in hexagonal style.",
    usage: "cpanel",
    category: "system",
    role: 0
  },

  onStart: async function ({ message, event, sock }) {
    try {
      const width = 1000, height = 700;
      const encoder = new GIFEncoder(width, height);
      const fileName = `cpanel_${Date.now()}.gif`;
      const filePath = path.join(__dirname, fileName);
      const stream = fs.createWriteStream(filePath);
      encoder.createReadStream().pipe(stream);

      encoder.start();
      encoder.setRepeat(0);
      encoder.setDelay(150);
      encoder.setQuality(10);

      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");

      const formatUptime = (sec) => {
        const d = Math.floor(sec / 86400);
        const h = Math.floor((sec % 86400) / 3600);
        const m = Math.floor((sec % 3600) / 60);
        return `${d}d ${h}h ${m}m`;
      };

      const getSystemStats = () => {
        const totalMem = os.totalmem() / 1024 / 1024 / 1024;
        const freeMem = os.freemem() / 1024 / 1024 / 1024;
        const usedMem = totalMem - freeMem;
        return [
          ["BOT UPTIME", formatUptime(process.uptime())],
          ["CPU CORES", os.cpus().length.toString()],
          ["NODE.JS", process.version],
          ["DISK USED", "21.8%"],
          ["RAM USED", (usedMem / totalMem * 100).toFixed(1) + "%"],
          ["SYS UPTIME", formatUptime(os.uptime())],
          ["DISK TOTAL", "45.0 GB"],
          ["CPU LOAD", os.loadavg()[0].toFixed(1) + "%"],
          ["RAM TOTAL", totalMem.toFixed(1) + " GB"]
        ];
      };

      const hexColors = ["#ffff55", "#55ff55", "#5599ff", "#cc55ff", "#aa7755"];

      const drawHex = (x, y, label, value, alpha = 1, color = "#00ff99") => {
        const r = 100;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = Math.PI / 3 * i;
          i === 0
            ? ctx.moveTo(x + r * Math.cos(angle), y + r * Math.sin(angle))
            : ctx.lineTo(x + r * Math.cos(angle), y + r * Math.sin(angle));
        }
        ctx.closePath();
        ctx.strokeStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.fillStyle = "#ffffff";
        ctx.font = "18px Arial";
        ctx.textAlign = "center";
        ctx.fillText(label, x, y - 10);
        ctx.font = "bold 22px Arial";
        ctx.fillText(value, x, y + 20);
        ctx.globalAlpha = 1;
      };

      const cx = width / 2;
      const cy = height / 2;
      const spacing = 180;

      const positions = [
        [cx, cy - spacing],
        [cx + spacing, cy - spacing / 2],
        [cx + spacing, cy + spacing / 2],
        [cx, cy + spacing],
        [cx - spacing, cy + spacing / 2],
        [cx - spacing, cy - spacing / 2],
        [cx, cy],
        [cx + spacing * 1.5, cy],
        [cx - spacing * 1.5, cy]
      ];

      for (let frame = 0; frame < 10; frame++) {
        const stats = getSystemStats();
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = "#0f0f1b";
        ctx.fillRect(0, 0, width, height);

        ctx.font = "16px Arial";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "right";
        ctx.fillText(moment().tz("Asia/Dhaka").format("DD/MM/YYYY HH:mm:ss"), width - 30, 40);
        ctx.textAlign = "left";
        ctx.fillText(`OS: ${os.platform()} (x64)`, 30, 40);

        for (let i = 0; i < stats.length; i++) {
          const pulse = 0.5 + 0.5 * Math.sin((frame + i) / 2);
          drawHex(positions[i][0], positions[i][1], stats[i][0], stats[i][1], pulse, hexColors[i % hexColors.length]);
        }

        encoder.addFrame(ctx);
      }

      encoder.finish();

      await new Promise((resolve, reject) => {
        stream.on("finish", resolve);
        stream.on("error", reject);
      });

      const gifBuffer = fs.readFileSync(filePath);
      try { fs.unlinkSync(filePath); } catch {}

      await sock.sendMessage(message.jid, {
        video: gifBuffer,
        gifPlayback: true,
        caption: "📊 System Dashboard"
      }, { quoted: message.info });

    } catch (err) {
      console.error("cpanel error:", err);
      await message.reply("❌ Error generating system dashboard.");
    }
  }
};
