"use strict";

const fs   = require("fs");
const path = require("path");

const JSON_PATH = path.resolve(__dirname, "../../database/json/userData.json");

function ensureJsonFile() {
  const dir = path.dirname(JSON_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(JSON_PATH)) fs.writeFileSync(JSON_PATH, JSON.stringify({}, null, 2), "utf8");
}

function readJson() {
  ensureJsonFile();
  try { return JSON.parse(fs.readFileSync(JSON_PATH, "utf8")); } catch (_) { return {}; }
}

function writeJson(data) {
  ensureJsonFile();
  fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2), "utf8");
}

function defaultUser(uid) {
  return {
    uid,
    name: "Unknown",
    pfp: null,
    money: 0,
    exp: 0,
    isBan: false,
    banReason: "",
    warnCount: 0,
    warnReason: [],
    data: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ── JSON controller ──────────────────────────────────────────────────────────
const jsonController = {
  async getAll() {
    return readJson();
  },

  async get(uid) {
    const all = readJson();
    if (!all[uid]) {
      all[uid] = defaultUser(uid);
      writeJson(all);
    }
    return all[uid];
  },

  async set(uid, value, field) {
    const all = readJson();
    if (!all[uid]) all[uid] = defaultUser(uid);
    if (field) {
      all[uid][field] = value;
    } else {
      all[uid] = Object.assign(all[uid], value);
    }
    all[uid].updatedAt = new Date().toISOString();
    writeJson(all);
    return all[uid];
  },

  async delete(uid) {
    const all = readJson();
    delete all[uid];
    writeJson(all);
  },

  async count() {
    return Object.keys(readJson()).length;
  },
};

// ── MongoDB controller ───────────────────────────────────────────────────────
const mongoController = {
  _model: null,

  _get() {
    if (!this._model) this._model = require("../models/mongodb/user.js");
    return this._model;
  },

  async getAll() {
    const docs = await this._get().find({}).lean();
    const result = {};
    for (const d of docs) result[d.uid] = d;
    return result;
  },

  async get(uid) {
    let doc = await this._get().findOne({ uid }).lean();
    if (!doc) {
      doc = await this._get().create(defaultUser(uid));
      return doc.toObject ? doc.toObject() : doc;
    }
    return doc;
  },

  async set(uid, value, field) {
    const update = field ? { [field]: value, updatedAt: new Date() } : { ...value, updatedAt: new Date() };
    const doc = await this._get().findOneAndUpdate(
      { uid },
      { $set: update },
      { new: true, upsert: true, lean: true }
    );
    return doc;
  },

  async delete(uid) {
    await this._get().deleteOne({ uid });
  },

  async count() {
    return await this._get().countDocuments();
  },
};

function getController() {
  const type = (global.ST && global.ST.config && global.ST.config.database && global.ST.config.database.type) || "json";
  return type === "mongodb" ? mongoController : jsonController;
}

/**
 * userData(uid) — global convenience: get-or-create user data object.
 * @param {string} uid
 * @returns {Promise<object>}
 */
async function userData(uid) {
  return getController().get(uid);
}

module.exports = {
  userData,
  get:    (uid)         => getController().get(uid),
  set:    (uid, v, f)   => getController().set(uid, v, f),
  delete: (uid)         => getController().delete(uid),
  getAll: ()            => getController().getAll(),
  count:  ()            => getController().count(),
};
