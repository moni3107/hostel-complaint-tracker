const mongoose = require("mongoose");

const hostelSchema = new mongoose.Schema({
  hostelId: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  block: { type: String, required: true },
  description: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Hostel", hostelSchema);
