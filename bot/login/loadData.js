"use strict";

const log     = require("../../logger/log.js");
const spinner = require("../../logger/spinner.js");
const { attachGlobalDB, userData, threadsData } = require("../../database/controller/index.js");

/**
 * Step 3 — Load (or connect) the database and show user/thread counts.
 * @param {object} api  WCA api
 */
async function loadData(api) {
  log.divider("STEP 3 — DATABASE");

  const cfg     = global.ST.config;
  const dbType  = (cfg.database && cfg.database.type) || "json";

  // ── Connect MongoDB if required ────────────────────────────────────────────
  if (dbType === "mongodb") {
    spinner.start("Connecting to MongoDB…");
    try {
      const { connectMongoDB } = require("../../database/connectDB/connectMongoDB.js");
      await connectMongoDB();
      spinner.succeed("MongoDB connected");
    } catch (e) {
      spinner.fail("MongoDB connection failed: " + e.message);
      log.warn("DATABASE", "Falling back to JSON database.");
      global.ST.config.database.type = "json";
    }
  } else {
    log.info("DATABASE", "Using JSON file storage.");
  }

  // ── Attach global DB helpers ───────────────────────────────────────────────
  attachGlobalDB();

  // ── Count existing records ─────────────────────────────────────────────────
  spinner.start("Loading database…");
  try {
    const userCount   = await userData.count();
    const threadCount = await threadsData.count();
    spinner.succeed(`Database ready — ${userCount} user(s), ${threadCount} thread(s)`);

    log.success("STEP 3", `Users: ${userCount} | Threads: ${threadCount} | Type: ${global.ST.config.database.type}`);
  } catch (e) {
    spinner.fail("Database load error: " + e.message);
    log.err("DATABASE", e.message);
  }
}

module.exports = loadData;
