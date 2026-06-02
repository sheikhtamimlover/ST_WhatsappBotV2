"use strict";

let _mongoose;
try { _mongoose = require("mongoose"); } catch (_) {}

const userSchema = _mongoose ? new _mongoose.Schema({
  uid:       { type: String, required: true, unique: true },
  name:      { type: String, default: "Unknown" },
  pfp:       { type: String, default: null },
  money:     { type: Number, default: 0 },
  exp:       { type: Number, default: 0 },
  isBan:     { type: Boolean, default: false },
  banReason: { type: String, default: "" },
  warnCount: { type: Number, default: 0 },
  warnReason:{ type: [String], default: [] },
  data:      { type: _mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: false }) : null;

if (userSchema) {
  userSchema.pre("save", function (next) {
    this.updatedAt = new Date();
    next();
  });
}

const UserModel = (_mongoose && userSchema)
  ? (_mongoose.models.User || _mongoose.model("User", userSchema))
  : null;

module.exports = UserModel;
