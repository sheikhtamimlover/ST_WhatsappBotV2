"use strict";

const log = require("../../logger/log.js");

let _mongoose = null;

/**
 * Connect to MongoDB using the URI from config.
 * Returns the mongoose instance.
 * @returns {Promise<object>} mongoose
 */
async function connectMongoDB() {
  const uri = (global.ST.config.database && global.ST.config.database.uriMongodb) || "";
  if (!uri) throw new Error("MongoDB URI is empty. Set database.uriMongodb in config.json.");

  if (!_mongoose) {
    try {
      _mongoose = require("mongoose");
    } catch (_) {
      throw new Error("mongoose is not installed. Run: npm install mongoose");
    }
  }

  if (_mongoose.connection.readyState === 1) {
    return _mongoose;
  }

  await _mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });

  log.success("DATABASE", "MongoDB connected successfully");
  return _mongoose;
}

module.exports = { connectMongoDB };
