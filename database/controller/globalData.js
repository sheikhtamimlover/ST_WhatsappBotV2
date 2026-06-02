"use strict";

const fs   = require("fs");
const path = require("path");

const JSON_PATH = path.resolve(__dirname, "../../database/json/globalData.json");

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

const jsonController = {
  async get(key) {
    const all = readJson();
    return all[key] !== undefined ? all[key] : null;
  },
  async set(key, value) {
    const all = readJson();
    all[key] = value;
    writeJson(all);
    return value;
  },
  async delete(key) {
    const all = readJson();
    delete all[key];
    writeJson(all);
  },
  async getAll() {
    return readJson();
  },
};

const mongoController = {
  _model: null,
  _get() {
    if (!this._model) this._model = require("../models/mongodb/global.js");
    return this._model;
  },
  async get(key) {
    const doc = await this._get().findOne({ key }).lean();
    return doc ? doc.value : null;
  },
  async set(key, value) {
    await this._get().findOneAndUpdate(
      { key },
      { $set: { value, updatedAt: new Date() } },
      { upsert: true }
    );
    return value;
  },
  async delete(key) {
    await this._get().deleteOne({ key });
  },
  async getAll() {
    const docs = await this._get().find({}).lean();
    const result = {};
    for (const d of docs) result[d.key] = d.value;
    return result;
  },
};

function getController() {
  const type = (global.ST && global.ST.config && global.ST.config.database && global.ST.config.database.type) || "json";
  return type === "mongodb" ? mongoController : jsonController;
}

module.exports = {
  get:    (key)       => getController().get(key),
  set:    (key, val)  => getController().set(key, val),
  delete: (key)       => getController().delete(key),
  getAll: ()          => getController().getAll(),
};
