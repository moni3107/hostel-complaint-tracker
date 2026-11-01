const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  adminId: { type: Number, default: 1, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, default: "ADMIN" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Admin", adminSchema);
