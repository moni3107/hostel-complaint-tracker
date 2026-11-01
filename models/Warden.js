const mongoose = require("mongoose");

const wardenSchema = new mongoose.Schema({
  wardenId: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, default: "" },
  assignedHostel: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, default: "WARDEN" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Warden", wardenSchema);
