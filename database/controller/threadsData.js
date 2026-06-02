"use strict";

const fs   = require("fs");
const path = require("path");

const JSON_PATH = path.resolve(__dirname, "../../database/json/threadsData.json");

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

function defaultThread(tid) {
  return {
    tid,
    name: "Unknown Group",
    approvalMode: false,
    adminIDs: [],
    totalMember: 0,
    allMembers: [],
    memberMsgCount: {},
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

  async get(tid) {
    const all = readJson();
    if (!all[tid]) {
      all[tid] = defaultThread(tid);
      writeJson(all);
    }
    return all[tid];
  },

  async set(tid, value, field) {
    const all = readJson();
    if (!all[tid]) all[tid] = defaultThread(tid);
    if (field) {
      all[tid][field] = value;
    } else {
      all[tid] = Object.assign(all[tid], value);
    }
    all[tid].updatedAt = new Date().toISOString();
    writeJson(all);
    return all[tid];
  },

  async delete(tid) {
    const all = readJson();
    delete all[tid];
    writeJson(all);
  },

  async count() {
    return Object.keys(readJson()).length;
  },

  async refreshInfo(tid, groupInfo) {
    if (!groupInfo) return;
    const update = {};
    if (groupInfo.name || groupInfo.subject) update.name = groupInfo.name || groupInfo.subject;
    if (groupInfo.adminIDs) update.adminIDs = groupInfo.adminIDs;
    if (groupInfo.participantIDs) {
      update.totalMember = groupInfo.participantIDs.length;
      const all = readJson();
      const current = all[tid] || defaultThread(tid);
      // Merge participants into allMembers list
      const memberMap = {};
      for (const m of (current.allMembers || [])) memberMap[m.uid] = m;
      for (const pid of groupInfo.participantIDs) {
        if (!memberMap[pid]) memberMap[pid] = { uid: pid, name: "Unknown", pfp: null, msgCount: 0, inGroup: true };
        else memberMap[pid].inGroup = true;
      }
      update.allMembers = Object.values(memberMap);
    }
    if (groupInfo.participants) {
      const all = readJson();
      const current = all[tid] || defaultThread(tid);
      const memberMap = {};
      for (const m of (current.allMembers || [])) memberMap[m.uid] = m;
      for (const p of groupInfo.participants) {
        const uid = p.userID || p.id;
        if (!memberMap[uid]) memberMap[uid] = { uid, name: "Unknown", pfp: null, msgCount: 0, inGroup: true };
        else memberMap[uid].inGroup = true;
      }
      update.allMembers = Object.values(memberMap);
      update.totalMember = groupInfo.size || groupInfo.participants.length;
    }
    if (groupInfo.announcement !== undefined) update.approvalMode = groupInfo.announcement;
    return this.set(tid, update);
  },

  async incrementMsgCount(tid, uid) {
    const all = readJson();
    if (!all[tid]) all[tid] = defaultThread(tid);
    if (!all[tid].memberMsgCount) all[tid].memberMsgCount = {};
    all[tid].memberMsgCount[uid] = (all[tid].memberMsgCount[uid] || 0) + 1;
    all[tid].updatedAt = new Date().toISOString();
    writeJson(all);
  },
};

// ── MongoDB controller ───────────────────────────────────────────────────────
const mongoController = {
  _model: null,

  _get() {
    if (!this._model) this._model = require("../models/mongodb/thread.js");
    return this._model;
  },

  async getAll() {
    const docs = await this._get().find({}).lean();
    const result = {};
    for (const d of docs) result[d.tid] = d;
    return result;
  },

  async get(tid) {
    let doc = await this._get().findOne({ tid }).lean();
    if (!doc) {
      const created = await this._get().create(defaultThread(tid));
      return created.toObject ? created.toObject() : created;
    }
    return doc;
  },

  async set(tid, value, field) {
    const update = field ? { [field]: value, updatedAt: new Date() } : { ...value, updatedAt: new Date() };
    const doc = await this._get().findOneAndUpdate(
      { tid },
      { $set: update },
      { new: true, upsert: true, lean: true }
    );
    return doc;
  },

  async delete(tid) {
    await this._get().deleteOne({ tid });
  },

  async count() {
    return await this._get().countDocuments();
  },

  async refreshInfo(tid, groupInfo) {
    if (!groupInfo) return;
    const update = {};
    if (groupInfo.name || groupInfo.subject) update.name = groupInfo.name || groupInfo.subject;
    if (groupInfo.adminIDs) update.adminIDs = groupInfo.adminIDs;
    if (groupInfo.participantIDs) {
      update.totalMember = groupInfo.participantIDs.length;
    }
    if (groupInfo.announcement !== undefined) update.approvalMode = groupInfo.announcement;
    return this.set(tid, update);
  },

  async incrementMsgCount(tid, uid) {
    await this._get().findOneAndUpdate(
      { tid },
      { $inc: { [`memberMsgCount.${uid}`]: 1 }, $set: { updatedAt: new Date() } },
      { upsert: true }
    );
  },
};

function getController() {
  const type = (global.ST && global.ST.config && global.ST.config.database && global.ST.config.database.type) || "json";
  return type === "mongodb" ? mongoController : jsonController;
}

/**
 * threadsData(tid) — global convenience: get-or-create thread data object.
 * @param {string} tid
 * @returns {Promise<object>}
 */
async function threadsData(tid) {
  return getController().get(tid);
}

module.exports = {
  threadsData,
  get:              (tid)            => getController().get(tid),
  set:              (tid, v, f)      => getController().set(tid, v, f),
  delete:           (tid)            => getController().delete(tid),
  getAll:           ()               => getController().getAll(),
  count:            ()               => getController().count(),
  refreshInfo:      (tid, info)      => getController().refreshInfo(tid, info),
  incrementMsgCount:(tid, uid)       => getController().incrementMsgCount(tid, uid),
};
