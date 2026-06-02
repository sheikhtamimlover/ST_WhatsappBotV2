"use strict";

/**
 * onEvent.js — Generic event router.
 * Calls onEvent() on every loaded command that defines it,
 * passing the raw WCA group/system event.
 */
module.exports = {
  config: {
    name: "onEvent",
    version: "1.0.0",
    author: "ST",
    category: "events"
  },

  onStart: async ({ api, event, threadsData, userData }) => {
    // Only fire for group-type events, not plain messages
    if (event.type === "message") return;

    for (const [, cmd] of global.ST.cmds) {
      if (typeof cmd.onEvent === "function") {
        try {
          await cmd.onEvent({ api, event, message: null, threadsData, userData });
        } catch (_) {}
      }
    }
  }
};
