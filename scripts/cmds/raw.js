const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const stbotApi = new global.utils.STBotApis();

module.exports = {
  config: {
    name: "raw",
    aliases: [],
    version: "1.0.1",
    author: "ST | Sheikh Tamim",
    countDown: 5,
    role: 0,
    description: "Upload code files to get raw URL",
    category: "utility",
    guide: {
      en: "   {pn} <filename.ext> <code> - Upload code with extension\n"
        + "   {pn} -c <filename> - Upload command from path\n"
        + "   {pn} -e <filename> - Upload event from path"
    }
  },

  onStart: async function ({ message, args, event }) {
    if (!args[0]) {
      return message.reply(
        "📝 Raw Upload Usage:\n\n" +
        "1. Upload code directly:\n" +
        "   !raw file.js <code>\n" +
        "   !raw style.css <code>\n" +
        "   !raw data.json <code>\n\n" +
        "2. Upload from path:\n" +
        "   !raw -c <filename> (command)\n" +
        "   !raw -e <filename> (event)"
      );
    }

    if (args[0] === "-c") {
      if (!args[1]) return message.reply("❌ Please provide a command filename");
      const filename = args[1].endsWith('.js') ? args[1] : args[1] + '.js';
      const filePath = path.join(__dirname, filename);
      if (!fs.existsSync(filePath)) return message.reply(`❌ Command file not found: ${filename}`);
      const code = fs.readFileSync(filePath, "utf-8");
      const format = path.extname(filename);
      try {
        const response = await axios.post(`${stbotApi.baseURL}/api/raw/upload`, {
          filename: filename.replace(format, ''),
          code,
          format
        });
        if (response.data.success) {
          return message.reply(
            `✅ Command uploaded!\n\n` +
            `📁 File: ${response.data.filename}\n` +
            `📂 Path: ${response.data.path}\n\n` +
            `🔗 Raw URL:\n${response.data.rawUrl}`
          );
        }
        return message.reply(`❌ Upload failed: ${response.data.message}`);
      } catch (err) {
        return message.reply(`❌ Upload error: ${err.message}`);
      }
    }

    if (args[0] === "-e") {
      if (!args[1]) return message.reply("❌ Please provide an event filename");
      const filename = args[1].endsWith('.js') ? args[1] : args[1] + '.js';
      const filePath = path.join(__dirname, '../events', filename);
      if (!fs.existsSync(filePath)) return message.reply(`❌ Event file not found: ${filename}`);
      const code = fs.readFileSync(filePath, "utf-8");
      const format = path.extname(filename);
      try {
        const response = await axios.post(`${stbotApi.baseURL}/api/raw/upload`, {
          filename: filename.replace(format, ''),
          code,
          format
        });
        if (response.data.success) {
          return message.reply(
            `✅ Event uploaded!\n\n` +
            `📁 File: ${response.data.filename}\n` +
            `📂 Path: ${response.data.path}\n\n` +
            `🔗 Raw URL:\n${response.data.rawUrl}`
          );
        }
        return message.reply(`❌ Upload failed: ${response.data.message}`);
      } catch (err) {
        return message.reply(`❌ Upload error: ${err.message}`);
      }
    }

    const filename = args[0];
    const format = path.extname(filename);
    if (!format) return message.reply("❌ Please provide a file extension (e.g., .js, .css, .json)");

    const code = event.body.slice(event.body.indexOf(filename) + filename.length + 1).trim();
    if (!code) return message.reply("❌ Please provide code to upload");

    try {
      const response = await axios.post(`${stbotApi.baseURL}/api/raw/upload`, {
        filename: filename.replace(format, ''),
        code,
        format
      });
      if (response.data.success) {
        return message.reply(
          `✅ File uploaded!\n\n` +
          `📁 File: ${response.data.filename}\n` +
          `📂 Path: ${response.data.path}\n\n` +
          `🔗 Raw URL:\n${response.data.rawUrl}\n\n` +
          `💡 Share this URL to access your code!`
        );
      }
      return message.reply(`❌ Upload failed: ${response.data.message}`);
    } catch (err) {
      return message.reply(`❌ Upload error: ${err.message}`);
    }
  }
};
