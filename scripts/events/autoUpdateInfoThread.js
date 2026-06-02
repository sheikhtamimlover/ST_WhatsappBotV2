"use strict";

module.exports = {
  config: {
    name: "autoUpdateInfoThread",
    version: "1.0.0",
    author: "ST",
    category: "events"
  },

  onStart: async ({ api, event, threadsData, userData }) => {
    if (!threadsData) return;

    const updateTypes = [
      "log:subscribe", "log:unsubscribe",
      "log:thread-admins", "log:thread-name",
      "log:thread-image", "log:thread-icon"
    ];

    if (!updateTypes.includes(event.logMessageType)) return;

    const { threadID, logMessageType, logMessageData, action, participants } = event;
    if (!threadID) return;

    try {
      switch (logMessageType) {

        case "log:subscribe": {
          // New member(s) joined — add to allMembers
          const added = Array.isArray(participants) ? participants : (logMessageData && logMessageData.addedParticipants) || [];
          const thread = await threadsData.get(threadID);
          const memberMap = {};
          for (const m of (thread.allMembers || [])) memberMap[m.uid] = m;
          for (const uid of added) {
            const name = await global.resolveUserDisplayName(api, uid, userData);
            if (!memberMap[uid]) memberMap[uid] = { uid, name, pfp: null, msgCount: 0, inGroup: true };
            else {
              memberMap[uid].inGroup = true;
              if (name && name !== uid.split(":")[0].split("@")[0]) memberMap[uid].name = name;
            }
          }
          await threadsData.set(threadID, {
            allMembers: Object.values(memberMap),
            totalMember: Object.values(memberMap).filter(m => m.inGroup).length
          });

          // Try to refresh full group info from API
          try {
            const info = await api.getGroupInfo(threadID);
            await threadsData.refreshInfo(threadID, info);
          } catch (_) {}
          break;
        }

        case "log:unsubscribe": {
          // Member(s) left — mark inGroup = false
          const removed = Array.isArray(participants) ? participants : (logMessageData && logMessageData.removedParticipants) || [];
          const thread  = await threadsData.get(threadID);
          const members = (thread.allMembers || []).map(m => {
            if (removed.includes(m.uid)) return { ...m, inGroup: false };
            return m;
          });
          await threadsData.set(threadID, {
            allMembers: members,
            totalMember: members.filter(m => m.inGroup).length
          });
          break;
        }

        case "log:thread-admins": {
          // Admin promoted or demoted
          try {
            const info = await api.getGroupInfo(threadID);
            await threadsData.set(threadID, "adminIDs", "adminIDs");
            await threadsData.refreshInfo(threadID, info);
          } catch (_) {}
          break;
        }

        case "log:thread-name": {
          const newName = (logMessageData && logMessageData.value) ||
                          (event.raw && event.raw.subject) || "";
          if (newName) await threadsData.set(threadID, newName, "name");
          break;
        }

        case "log:thread-image": {
          // Group icon changed — nothing extra to store besides a refresh
          try {
            const info = await api.getGroupInfo(threadID);
            await threadsData.refreshInfo(threadID, info);
          } catch (_) {}
          break;
        }

        case "log:thread-icon": {
          const emoji = (logMessageData && logMessageData.value) || "";
          if (emoji) await threadsData.set(threadID, emoji, "emoji");
          break;
        }
      }
    } catch (_) {}
  }
};
