const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  studentId: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, default: "" },
  department: { type: String, default: "" },
  year: { type: String, default: "" },
  hostelBlock: { type: String, required: true },
  roomNumber: { type: Number, required: true },
  password: { type: String, required: true },
  role: { type: String, default: "STUDENT" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Student", studentSchema);
