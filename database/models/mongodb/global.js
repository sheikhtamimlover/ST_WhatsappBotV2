"use strict";

let _mongoose;
try { _mongoose = require("mongoose"); } catch (_) {}

const globalSchema = _mongoose ? new _mongoose.Schema({
  key:       { type: String, required: true, unique: true },
  value:     { type: _mongoose.Schema.Types.Mixed, default: null },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: false }) : null;

const GlobalModel = (_mongoose && globalSchema)
  ? (_mongoose.models.Global || _mongoose.model("Global", globalSchema))
  : null;

module.exports = GlobalModel;
