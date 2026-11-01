const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema({
  complaintId: { 
    type: Number, 
    required: true, 
    unique: true 
  },
  studentId: { 
    type: Number, 
    required: true, 
    index: true 
  },
  studentName: {
    type: String,
    default: ""
  },
  category: { 
    type: String, 
    required: true 
  },
  hostelBlock: { 
    type: String, 
    required: true 
  },
  roomNumber: { 
    type: Number, 
    required: true 
  },
  description: { 
    type: String, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ["Pending", "In Progress", "Resolved", "PENDING", "IN PROGRESS", "RESOLVED"], 
    default: "Pending" 
  },
  date: { 
    type: Date, 
    default: Date.now 
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  // Legacy compatibility fields
  name: { type: String },
  room: { type: String },
  complaint: { type: String }
});

module.exports = mongoose.model("Complaint", complaintSchema);