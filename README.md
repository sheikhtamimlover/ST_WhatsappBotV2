# ST WhatsApp Bot V2

A WhatsApp bot project by **Sheikh Tamim**, built on top of the WCA WhatsApp Chat API.

- Bot repository: https://github.com/sheikhtamimlover/ST_WhatsappBotV2.git
- WCA API repository: https://github.com/sheikhtamimlover/wca.git
- Support WhatsApp group: https://chat.whatsapp.com/BtxLJBS80TG4SQFNE7KFEG
- Instagram: https://instagram.com/sheikh.tamim_lover
- Email: tamimsheikh142@gmail.com

## What This Project Is

ST WhatsApp Bot V2 is a command and event based WhatsApp bot system using a local WCA API wrapper. It supports:

- WhatsApp login by pair code or QR
- Command system from `scripts/cmds`
- Event system from `scripts/events`
- Per-thread prefix support
- Reply handlers with `onReply`
- No-prefix chat listeners with `onChat`
- Reaction handlers
- JSON or MongoDB database mode
- Media send support: text, image, video, audio, document, sticker, GIF-style video
- Group join/leave/admin update events
- Express and Socket.IO uptime server

## Install

Copy and paste:

```bash
git clone https://github.com/sheikhtamimlover/ST_WhatsappBotV2.git && cp -r ST_WhatsappBotV2/. . && rm -rf ST_WhatsappBotV2
npm install
npm start
```

## Start Commands

```bash
npm start
```

## Configuration

Main config file:

```text
config.json
```

Important fields:

```json
{
  "prefix": "!",
  "botName": "WCA Bot",
  "language": "en",
  "adminBot": ["186393124970625"],
  "phoneNumber": "8801XXXXXXXXX",
  "loginMode": "pair",
  "authFolder": "./auth"
}
```

### Config Notes

- `prefix`: Global command prefix, like `!`
- `botName`: Bot display name
- `adminBot`: Bot admin phone/user IDs
- `phoneNumber`: Your WhatsApp number with country code
- `loginMode`: Use `pair` or `qr`
- `authFolder`: Where login session files are saved
- `database.type`: Use `json` or `mongodb`
- `listen.selfListen`: Whether bot listens to its own messages
- `listen.listenEvents`: Enables group/event listening
- `featureBox.adminOnly`: If true, only admins can use commands
- `featureBox.antiInbox`: If true, bot ignores DMs
- `featureBox.unsendBotReact`: Enables reaction-to-unsend

## Project Structure

```text
.
├── ST.js
├── config.json
├── bot/
│   ├── handler/
│   │   ├── handlerEvent.js
│   │   ├── handlerAction.js
│   │   └── handletCheckData.js
│   └── login/
├── database/
│   ├── controller/
│   └── json/
├── scripts/
│   ├── cmds/
│   └── events/
├── wca/
│   ├── index.js
│   ├── utils.js
│   └── src/
└── utils.js
```

## Command Structure

Commands live in:

```text
scripts/cmds
```

Basic command example:

```js
"use strict";

module.exports = {
  config: {
    name: "ping",
    version: "1.0.0",
    author: "Your Name",
    countDown: 3,
    role: 0,
    shortDescription: "Ping command",
    category: "system",
    guide: { en: "{pn}" }
  },

  onStart: async ({ api, event, args, message, prefix, threadsData, userData }) => {
    return message.reply("Pong!");
  }
};
```

### Command Config

- `name`: Command name
- `version`: Command version
- `author`: Author name
- `countDown`: Cooldown in seconds
- `role`: `0` for everyone, `1` for admins
- `category`: Help menu category
- `guide`: Usage guide

## Command Functions

### `onStart`

Runs when user uses a prefix command.

Example:

```js
onStart: async ({ api, event, args, message }) => {
  await message.reply("Hello");
}
```

Usage:

```text
!command args
```

### `onChat`

Runs on every normal message. Useful for no-prefix commands, URL detectors, auto replies, filters, etc.

```js
onChat: async ({ event, message, args }) => {
  if ((event.body || "").toLowerCase() === "hello") {
    await message.reply("Hi!");
    return true;
  }
}
```

Return `true` if the bot should stop processing the message after `onChat`.

### `onReply`

Runs when a user replies to a bot message registered in `global.ST.onReply`.

Register:

```js
const info = await message.reply("Reply with a number");

global.ST.onReply.set(info.messageID, {
  commandName: "choose",
  author: event.senderID,
  data: ["A", "B", "C"]
});
```

Handle:

```js
onReply: async ({ event, Reply, message }) => {
  if (event.senderID !== Reply.author) return;
  await message.reply("You replied: " + event.body);
}
```

### `onReaction`

Runs when a registered bot message receives a reaction.

```js
global.ST.onReaction.set(info.messageID, {
  commandName: "reacttest",
  author: event.senderID
});
```

```js
onReaction: async ({ event, Reaction, message }) => {
  await message.reply("Reaction: " + event.emoji);
}
```

## Message Helper

Inside commands you get `message`.

Common functions:

```js
await message.reply("Text");
await message.send("Text", threadID);
await message.react("👍");
await message.unsend(messageID);
await message.edit(messageID, "New text");
await message.typing();
```

Send media:

```js
await message.reply({
  body: "Here is an image",
  attachment: {
    type: "image",
    url: "https://example.com/image.jpg",
    mimetype: "image/jpeg"
  }
});
```

Video:

```js
await message.reply({
  body: "Video",
  attachment: {
    type: "video",
    url: "https://example.com/video.mp4",
    mimetype: "video/mp4"
  }
});
```

Audio:

```js
await message.reply({
  attachment: {
    type: "audio",
    url: "https://example.com/audio.mp3",
    mimetype: "audio/mpeg"
  }
});
```

Document:

```js
await message.reply({
  body: "File",
  attachment: {
    type: "document",
    url: "https://example.com/file.pdf",
    mimetype: "application/pdf",
    filename: "file.pdf"
  }
});
```

## Event Structure

Events live in:

```text
scripts/events
```

Basic event example:

```js
"use strict";

module.exports = {
  config: {
    name: "exampleEvent",
    version: "1.0.0",
    author: "Your Name",
    category: "events"
  },

  onStart: async ({ api, event, threadsData, userData }) => {
    if (event.logMessageType === "log:subscribe") {
      await api.sendMessage("Welcome!", event.threadID);
    }
  }
};
```

## Event Types

Common event types:

- `message`
- `message_reaction`
- `message_unsend`
- `event`
- `group_update`
- `group_join_request`
- `presence`
- `call`

Common group log types:

- `log:subscribe`
- `log:unsubscribe`
- `log:thread-admins`
- `log:thread-name`
- `log:thread-image`
- `log:thread-icon`

## WCA API

This bot uses WCA from:

```text
https://github.com/sheikhtamimlover/wca.git
```

WCA provides WhatsApp connection and message APIs through Baileys.

Useful API functions:

```js
api.sendMessage(message, threadID);
api.sendVideo(urlOrStream, threadID, caption, options);
api.sendAudio(urlOrStream, threadID, options);
api.sendImage(urlOrStream, threadID, caption, options);
api.deleteMessage(threadID, messageID, true);
api.reactToMessage(threadID, messageID, "👍");
api.getGroupInfo(threadID);
api.getProfilePicture(userID);
api.getUserInfo(userID);
api.downloadMedia(message);
api.getCurrentUserID();
```

## Database

JSON database files:

```text
database/json/userData.json
database/json/threadsData.json
database/json/globalData.json
```

Access in commands:

```js
const user = await userData(event.senderID);
const thread = await threadsData(event.threadID);
```

Or:

```js
const user = await global.ST.DB.userData(event.senderID);
const thread = await global.ST.DB.threadsData(event.threadID);
```

## Useful Globals

```js
global.ST.cmds
global.ST.events
global.ST.onReply
global.ST.onReaction
global.ST.config
global.ST.DB
global.buildMessage
global.getTargetUser
global.getMessageReply
global.resolveUserDisplayName
global.humanDuration
global.sleep
```

## Reload Commands

If the bot has command management enabled:

```text
!cmd load commandName
!cmd unload commandName
!cmd reload commandName
```

Events:

```text
!event load eventName
!event unload eventName
!event reload eventName
```

## Author

Created by **Sheikh Tamim**.

- GitHub: https://github.com/sheikhtamimlover
- Instagram: https://instagram.com/sheikh.tamim_lover
- Email: tamimsheikh142@gmail.com
- WhatsApp Support Group: https://chat.whatsapp.com/BtxLJBS80TG4SQFNE7KFEG

For any help, setup support, bug report, or custom bot work, contact by email or Instagram.

## License

Use and modify this project with credit to **Sheikh Tamim**.
