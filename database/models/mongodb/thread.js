"use strict";

let _mongoose;
try { _mongoose = require("mongoose"); } catch (_) {}

const memberSchema = _mongoose ? new _mongoose.Schema({
  uid:      { type: String, required: true },
  name:     { type: String, default: "Unknown" },
  pfp:      { type: String, default: null },
  msgCount: { type: Number, default: 0 },
  inGroup:  { type: Boolean, default: true },
}, { _id: false }) : null;

const threadSchema = (_mongoose && memberSchema) ? new _mongoose.Schema({
  tid:          { type: String, required: true, unique: true },
  name:         { type: String, default: "Unknown Group" },
  approvalMode: { type: Boolean, default: false },
  adminIDs:     { type: [String], default: [] },
  totalMember:  { type: Number, default: 0 },
  allMembers:   { type: [memberSchema], default: [] },
  memberMsgCount: { type: _mongoose.Schema.Types.Mixed, default: {} },
  data:         { type: _mongoose.Schema.Types.Mixed, default: {} },
  createdAt:    { type: Date, default: Date.now },
  updatedAt:    { type: Date, default: Date.now },
}, { timestamps: false }) : null;

if (threadSchema) {
  threadSchema.pre("save", function (next) {
    this.updatedAt = new Date();
    next();
  });
}

const ThreadModel = (_mongoose && threadSchema)
  ? (_mongoose.models.Thread || _mongoose.model("Thread", threadSchema))
  : null;

module.exports = ThreadModel;
