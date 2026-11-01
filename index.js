const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");

// Existing Models
const Complaint = require("./complaint");
const User = require("./user");

// Multi-role Models
const Admin = require("./models/Admin");
const Student = require("./models/Student");
const Warden = require("./models/Warden");
const Hostel = require("./models/Hostel");
const ComplaintCategory = require("./models/ComplaintCategory");

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/hostel";

// Body Parsers & CORS
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
const frontendDir = fs.existsSync(path.join(__dirname, "frontend"))
  ? path.join(__dirname, "frontend")
  : path.join(__dirname, "../frontend");
app.use(express.static(frontendDir));

// Additional explicit CORS headers for maximum browser compatibility
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-user-role, x-user-id, x-user-block"
  );
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// ========================================================
// MONGODB CONNECTION & AUTO-SEEDING
// ========================================================
mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log(`MongoDB connected successfully: ${MONGODB_URI}`);
    await seedDefaultData();
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
  });

// ID Generator Helpers
async function getNextComplaintId() {
  const last = await Complaint.findOne().sort({ complaintId: -1 });
  return last && last.complaintId ? last.complaintId + 1 : 1001;
}

async function getNextStudentId() {
  const last = await Student.findOne().sort({ studentId: -1 });
  return last && last.studentId ? last.studentId + 1 : 101;
}

async function getNextWardenId() {
  const last = await Warden.findOne().sort({ wardenId: -1 });
  return last && last.wardenId ? last.wardenId + 1 : 201;
}

async function getNextHostelId() {
  const last = await Hostel.findOne().sort({ hostelId: -1 });
  return last && last.hostelId ? last.hostelId + 1 : 1;
}

// Password & Security Helpers
function verifyPassword(inputPassword, storedPassword) {
  if (!storedPassword || !inputPassword) return false;
  try {
    if (storedPassword.startsWith("$2")) {
      return bcrypt.compareSync(inputPassword, storedPassword);
    }
  } catch (e) {
    // Fallback if hash format is unexpected
  }
  return inputPassword === storedPassword;
}

function sanitizeUser(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  delete obj.password;
  return obj;
}

// Default Data Seeder
async function seedDefaultData() {
  try {
    // 1. Seed Admin
    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
      await Admin.create({
        adminId: 1,
        name: "Hostel Chief Administrator",
        email: "admin@hostel.com",
        password: bcrypt.hashSync("admin123", 10),
        role: "ADMIN"
      });
      console.log("✅ Seeded default Admin: admin@hostel.com / admin123 (hashed)");
    } else {
      // Auto-upgrade existing plaintext admin password if present
      const admin = await Admin.findOne({ email: "admin@hostel.com" });
      if (admin && !admin.password.startsWith("$2")) {
        admin.password = bcrypt.hashSync(admin.password, 10);
        await admin.save();
      }
    }

    // 2. Seed Complaint Categories
    const defaultCategories = [
      "Electrical",
      "Plumbing",
      "Cleaning",
      "Furniture",
      "Water Supply",
      "Wi-Fi",
      "Food",
      "Room Maintenance",
      "Other"
    ];
    for (const cat of defaultCategories) {
      const exists = await ComplaintCategory.findOne({ name: cat });
      if (!exists) {
        await ComplaintCategory.create({
          name: cat,
          description: `${cat} maintenance & repairs`
        });
      }
    }

    // 3. Seed Sample Hostels
    const hostelCount = await Hostel.countDocuments();
    if (hostelCount === 0) {
      await Hostel.create([
        { hostelId: 1, name: "Boys Hostel Block A", block: "A", description: "First & Second Year Block" },
        { hostelId: 2, name: "Boys Hostel Block B", block: "B", description: "Third & Final Year Block" },
        { hostelId: 3, name: "Girls Hostel Block C", block: "C", description: "Main Campus Block" }
      ]);
      console.log("✅ Seeded default Hostels (Blocks A, B, C)");
    }

    // 4. Seed Sample Warden
    const wardenCount = await Warden.countDocuments();
    if (wardenCount === 0) {
      await Warden.create({
        wardenId: 201,
        name: "Dr. R. K. Sharma",
        email: "warden.a@hostel.com",
        phone: "+91 9876543210",
        assignedHostel: "A",
        password: bcrypt.hashSync("warden123", 10),
        role: "WARDEN"
      });
      console.log("✅ Seeded default Warden for Block A: warden.a@hostel.com / warden123 (hashed)");
    } else {
      const warden = await Warden.findOne({ email: "warden.a@hostel.com" });
      if (warden && !warden.password.startsWith("$2")) {
        warden.password = bcrypt.hashSync(warden.password, 10);
        await warden.save();
      }
    }

    // 5. Seed Sample Student
    const studentCount = await Student.countDocuments();
    if (studentCount === 0) {
      await Student.create({
        studentId: 101,
        name: "Rahul Verma",
        email: "student@hostel.com",
        phone: "+91 9123456780",
        department: "Computer Science",
        year: "3rd Year",
        hostelBlock: "A",
        roomNumber: 205,
        password: bcrypt.hashSync("student123", 10),
        role: "STUDENT"
      });
      console.log("✅ Seeded default Student (ID 101): student@hostel.com / student123 (hashed)");
    } else {
      const student = await Student.findOne({ email: "student@hostel.com" });
      if (student && !student.password.startsWith("$2")) {
        student.password = bcrypt.hashSync(student.password, 10);
        await student.save();
      }
    }
  } catch (seedErr) {
    console.error("Seeder error:", seedErr.message);
  }
}

// ========================================================
// AUTHENTICATION ROUTES
// ========================================================

// 1. Admin Login (POST /admin/login)
app.post("/admin/login", async (req, res) => {
  try {
    const identifier = req.body.email !== undefined && req.body.email !== ""
      ? req.body.email
      : (req.body.adminId !== undefined && req.body.adminId !== "" ? req.body.adminId : req.body.identifier || req.body.username);
    const { password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: "Please enter Administrator Email or ID and password" });
    }

    const trimmed = String(identifier).trim();
    const orConditions = [{ email: trimmed.toLowerCase() }];

    if (!isNaN(trimmed) && trimmed !== "") {
      orConditions.push({ adminId: Number(trimmed) });
    }

    if (trimmed.toLowerCase() === "admin") {
      orConditions.push({ email: "admin@hostel.com" });
    }

    const query = {
      $or: orConditions,
      role: "ADMIN"
    };

    const admin = await Admin.findOne(query);
    if (!admin || !verifyPassword(password, admin.password)) {
      return res.status(401).json({ success: false, message: "Invalid Admin email or password" });
    }

    // Upgrade plaintext password if found
    if (!admin.password.startsWith("$2")) {
      admin.password = bcrypt.hashSync(password, 10);
      await admin.save();
    }

    res.json({
      success: true,
      message: "Admin login successful",
      user: {
        id: admin._id,
        adminId: admin.adminId,
        name: admin.name,
        email: admin.email,
        role: "ADMIN"
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// 2. Student Login (POST /student/login)
app.post("/student/login", async (req, res) => {
  try {
    const identifier = req.body.email !== undefined && req.body.email !== "" ? req.body.email : req.body.studentId;
    const { password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: "Please enter Student ID or Email and password" });
    }

    const trimmed = String(identifier).trim();
    let query;
    if (!isNaN(trimmed) && trimmed !== "") {
      query = {
        $or: [
          { studentId: Number(trimmed) },
          { email: trimmed.toLowerCase() }
        ]
      };
    } else {
      query = { email: trimmed.toLowerCase() };
    }
    query.role = "STUDENT";

    const student = await Student.findOne(query);
    if (!student || !verifyPassword(password, student.password)) {
      return res.status(401).json({ success: false, message: "Invalid Student credentials" });
    }

    // Upgrade plaintext password if found
    if (!student.password.startsWith("$2")) {
      student.password = bcrypt.hashSync(password, 10);
      await student.save();
    }

    res.json({
      success: true,
      message: "Student login successful",
      user: {
        id: student._id,
        studentId: student.studentId,
        name: student.name,
        email: student.email,
        phone: student.phone,
        department: student.department,
        year: student.year,
        hostelBlock: student.hostelBlock,
        roomNumber: student.roomNumber,
        role: "STUDENT"
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// Student Signup (POST /student/signup)
app.post("/student/signup", async (req, res) => {
  try {
    const {
      name,
      studentId,
      email,
      phone,
      department,
      year,
      hostelBlock,
      roomNumber,
      password,
      confirmPassword
    } = req.body;

    if (!name || !email || !hostelBlock || !roomNumber || !password) {
      return res.status(400).json({
        success: false,
        message: "Full name, email, hostel block, room number, and password are required"
      });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match"
      });
    }

    // Check duplicate email
    const existingEmail = await Student.findOne({ email: email.toLowerCase().trim() });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: "A student with this email already exists"
      });
    }

    // Determine student ID
    let finalStudentId;
    if (studentId) {
      finalStudentId = Number(studentId);
      const existingId = await Student.findOne({ studentId: finalStudentId });
      if (existingId) {
        return res.status(400).json({
          success: false,
          message: `Student ID ${finalStudentId} is already registered`
        });
      }
    } else {
      finalStudentId = await getNextStudentId();
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const newStudent = new Student({
      studentId: finalStudentId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone ? phone.trim() : "",
      department: department ? department.trim() : "",
      year: year || "1st Year",
      hostelBlock: hostelBlock.trim().toUpperCase(),
      roomNumber: Number(roomNumber),
      password: hashedPassword,
      role: "STUDENT"
    });

    await newStudent.save();

    res.status(201).json({
      success: true,
      message: "Student registration successful! You can now log in.",
      student: {
        id: newStudent._id,
        studentId: newStudent.studentId,
        name: newStudent.name,
        email: newStudent.email,
        phone: newStudent.phone,
        department: newStudent.department,
        year: newStudent.year,
        hostelBlock: newStudent.hostelBlock,
        roomNumber: newStudent.roomNumber,
        role: "STUDENT"
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Registration failed",
      error: error.message
    });
  }
});

// 3. Warden Login (POST /warden/login)
app.post("/warden/login", async (req, res) => {
  try {
    const identifier = req.body.email !== undefined && req.body.email !== ""
      ? req.body.email
      : (req.body.wardenId !== undefined && req.body.wardenId !== "" ? req.body.wardenId : req.body.identifier || req.body.username);
    const { password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: "Please enter Warden Email or ID and password" });
    }

    const trimmed = String(identifier).trim();
    const orConditions = [{ email: trimmed.toLowerCase() }];

    if (!isNaN(trimmed) && trimmed !== "") {
      orConditions.push({ wardenId: Number(trimmed) });
    }

    if (trimmed.toLowerCase() === "warden.a") {
      orConditions.push({ email: "warden.a@hostel.com" });
    } else if (trimmed.toLowerCase() === "warden.b") {
      orConditions.push({ email: "warden.b@hostel.com" });
    } else if (trimmed.toLowerCase() === "warden" || trimmed.toLowerCase() === "warden@hostel.com") {
      orConditions.push({ email: "warden.a@hostel.com" });
    }

    const query = {
      $or: orConditions,
      role: "WARDEN"
    };

    const warden = await Warden.findOne(query);
    if (!warden || !verifyPassword(password, warden.password)) {
      return res.status(401).json({ success: false, message: "Invalid Warden credentials" });
    }

    // Upgrade plaintext password if found
    if (!warden.password.startsWith("$2")) {
      warden.password = bcrypt.hashSync(password, 10);
      await warden.save();
    }

    res.json({
      success: true,
      message: "Warden login successful",
      user: {
        id: warden._id,
        wardenId: warden.wardenId,
        name: warden.name,
        email: warden.email,
        phone: warden.phone,
        assignedHostel: warden.assignedHostel,
        role: "WARDEN"
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// 4. Unified Login Fallback (POST /login)
app.post("/login", async (req, res) => {
  try {
    const role = req.body.role ? String(req.body.role).toUpperCase().trim() : null;
    const identifier = req.body.email || req.body.studentId || req.body.wardenId || req.body.adminId || req.body.identifier || req.body.username;
    const { password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: "Please enter identifier and password" });
    }

    const trimmed = String(identifier).trim();

    // Route explicitly if role specified
    if (role === "ADMIN") {
      const adminOr = [{ email: trimmed.toLowerCase() }];
      if (!isNaN(trimmed) && trimmed !== "") adminOr.push({ adminId: Number(trimmed) });
      if (trimmed.toLowerCase() === "admin") adminOr.push({ email: "admin@hostel.com" });
      const admin = await Admin.findOne({ $or: adminOr, role: "ADMIN" });
      if (admin && verifyPassword(password, admin.password)) {
        return res.json({
          success: true,
          message: "Admin login successful",
          user: { id: admin._id, adminId: admin.adminId, name: admin.name, email: admin.email, role: "ADMIN" }
        });
      }
      return res.status(401).json({ success: false, message: "Invalid Admin email or password" });
    }

    if (role === "WARDEN") {
      const wardenOr = [{ email: trimmed.toLowerCase() }];
      if (!isNaN(trimmed) && trimmed !== "") wardenOr.push({ wardenId: Number(trimmed) });
      if (trimmed.toLowerCase() === "warden.a" || trimmed.toLowerCase() === "warden" || trimmed.toLowerCase() === "warden@hostel.com") {
        wardenOr.push({ email: "warden.a@hostel.com" });
      } else if (trimmed.toLowerCase() === "warden.b") {
        wardenOr.push({ email: "warden.b@hostel.com" });
      }
      const warden = await Warden.findOne({ $or: wardenOr, role: "WARDEN" });
      if (warden && verifyPassword(password, warden.password)) {
        return res.json({
          success: true,
          message: "Warden login successful",
          user: { id: warden._id, wardenId: warden.wardenId, name: warden.name, email: warden.email, phone: warden.phone, assignedHostel: warden.assignedHostel, role: "WARDEN" }
        });
      }
      return res.status(401).json({ success: false, message: "Invalid Warden credentials" });
    }

    if (role === "STUDENT") {
      const studentOr = [{ email: trimmed.toLowerCase() }];
      if (!isNaN(trimmed) && trimmed !== "") studentOr.push({ studentId: Number(trimmed) });
      const student = await Student.findOne({ $or: studentOr, role: "STUDENT" });
      if (student && verifyPassword(password, student.password)) {
        return res.json({
          success: true,
          message: "Student login successful",
          user: { id: student._id, studentId: student.studentId, name: student.name, email: student.email, phone: student.phone, department: student.department, year: student.year, hostelBlock: student.hostelBlock, roomNumber: student.roomNumber, role: "STUDENT" }
        });
      }
      return res.status(401).json({ success: false, message: "Invalid Student credentials" });
    }

    // Role auto-detection if role not provided
    // 1. Check Admin
    const admin = await Admin.findOne({
      $or: [{ email: trimmed.toLowerCase() }, { adminId: Number(trimmed) || 0 }],
      role: "ADMIN"
    });
    if (admin && verifyPassword(password, admin.password)) {
      return res.json({
        success: true,
        message: "Admin login successful",
        user: { id: admin._id, adminId: admin.adminId, name: admin.name, email: admin.email, role: "ADMIN" }
      });
    }

    // 2. Check Warden
    const warden = await Warden.findOne({
      $or: [{ email: trimmed.toLowerCase() }, { wardenId: Number(trimmed) || 0 }],
      role: "WARDEN"
    });
    if (warden && verifyPassword(password, warden.password)) {
      return res.json({
        success: true,
        message: "Warden login successful",
        user: { id: warden._id, wardenId: warden.wardenId, name: warden.name, email: warden.email, phone: warden.phone, assignedHostel: warden.assignedHostel, role: "WARDEN" }
      });
    }

    // 3. Check Student
    const student = await Student.findOne({
      $or: [{ email: trimmed.toLowerCase() }, { studentId: Number(trimmed) || 0 }],
      role: "STUDENT"
    });
    if (student && verifyPassword(password, student.password)) {
      return res.json({
        success: true,
        message: "Student login successful",
        user: { id: student._id, studentId: student.studentId, name: student.name, email: student.email, phone: student.phone, department: student.department, year: student.year, hostelBlock: student.hostelBlock, roomNumber: student.roomNumber, role: "STUDENT" }
      });
    }

    return res.status(401).json({ success: false, message: "Invalid credentials" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// ========================================================
// HOSTELS API (CRUD)
// ========================================================

// POST /hostels - Add Hostel
app.post("/hostels", async (req, res) => {
  try {
    const { name, block, description } = req.body;
    if (!name || !block) {
      return res.status(400).json({ success: false, message: "Hostel Name and Block are required" });
    }

    const hostelId = req.body.hostelId || (await getNextHostelId());
    const hostel = new Hostel({
      hostelId,
      name: name.trim(),
      block: block.trim().toUpperCase(),
      description: description ? description.trim() : ""
    });

    await hostel.save();
    res.status(201).json({ success: true, message: "Hostel added successfully", hostel });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to add hostel", error: error.message });
  }
});

// GET /hostels - List Hostels
app.get("/hostels", async (req, res) => {
  try {
    const hostels = await Hostel.find().sort({ hostelId: 1 });
    res.json(hostels);
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch hostels", error: error.message });
  }
});

// PUT /hostels/:id - Edit Hostel
app.put("/hostels/:id", async (req, res) => {
  try {
    const query = mongoose.Types.ObjectId.isValid(req.params.id)
      ? { _id: req.params.id }
      : { hostelId: Number(req.params.id) };

    const updated = await Hostel.findOneAndUpdate(query, req.body, { returnDocument: "after" });
    if (!updated) {
      return res.status(404).json({ success: false, message: "Hostel not found" });
    }
    res.json({ success: true, message: "Hostel updated successfully", hostel: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update hostel", error: error.message });
  }
});

// DELETE /hostels/:id - Delete Hostel
app.delete("/hostels/:id", async (req, res) => {
  try {
    const query = mongoose.Types.ObjectId.isValid(req.params.id)
      ? { _id: req.params.id }
      : { hostelId: Number(req.params.id) };

    const deleted = await Hostel.findOneAndDelete(query);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Hostel not found" });
    }
    res.json({ success: true, message: "Hostel deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete hostel", error: error.message });
  }
});

// ========================================================
// STUDENTS API (CRUD)
// ========================================================

// POST /students - Add Student
app.post("/students", async (req, res) => {
  try {
    const { name, email, phone, department, year, hostelBlock, roomNumber, password } = req.body;
    if (!name || !email || !hostelBlock || !roomNumber || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, hostel block, room number, and password are required"
      });
    }

    const existing = await Student.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: "Student with this email already exists" });
    }

    const studentId = req.body.studentId || (await getNextStudentId());
    const student = new Student({
      studentId: Number(studentId),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone || "",
      department: department || "",
      year: year || "",
      hostelBlock: hostelBlock.trim().toUpperCase(),
      roomNumber: Number(roomNumber),
      password: bcrypt.hashSync(password, 10)
    });

    await student.save();
    res.status(201).json({ success: true, message: "Student registered successfully", student: sanitizeUser(student) });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to add student", error: error.message });
  }
});

// GET /students - List Students (supports ?hostelBlock= filter for warden; hides passwords)
app.get("/students", async (req, res) => {
  try {
    const { hostelBlock } = req.query;
    let query = hostelBlock ? { hostelBlock: hostelBlock.trim().toUpperCase() } : {};

    // Enforce warden block security
    const roleHeader = req.headers["x-user-role"];
    const blockHeader = req.headers["x-user-block"];
    if (roleHeader === "WARDEN" && blockHeader) {
      query.hostelBlock = blockHeader.trim().toUpperCase();
    }

    const students = await Student.find(query).select("-password").sort({ studentId: 1 });
    res.json(students);
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch students", error: error.message });
  }
});

// GET /students/:id - Get single student (hides password)
app.get("/students/:id", async (req, res) => {
  try {
    const query = mongoose.Types.ObjectId.isValid(req.params.id)
      ? { _id: req.params.id }
      : { studentId: Number(req.params.id) };

    const student = await Student.findOne(query).select("-password");
    if (!student) return res.status(404).json({ success: false, message: "Student not found" });
    res.json(student);
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching student", error: error.message });
  }
});

// PUT /students/:id - Edit Student
app.put("/students/:id", async (req, res) => {
  try {
    const query = mongoose.Types.ObjectId.isValid(req.params.id)
      ? { _id: req.params.id }
      : { studentId: Number(req.params.id) };

    const updateData = { ...req.body };
    if (updateData.hostelBlock) {
      updateData.hostelBlock = updateData.hostelBlock.toUpperCase();
    }
    if (updateData.roomNumber) {
      updateData.roomNumber = Number(updateData.roomNumber);
    }
    if (updateData.password && updateData.password.trim() !== "") {
      updateData.password = bcrypt.hashSync(updateData.password.trim(), 10);
    } else {
      delete updateData.password;
    }

    const updated = await Student.findOneAndUpdate(query, updateData, { returnDocument: "after" }).select("-password");
    if (!updated) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }
    res.json({ success: true, message: "Student updated successfully", student: sanitizeUser(updated) });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update student", error: error.message });
  }
});

// DELETE /students/:id - Delete Student
app.delete("/students/:id", async (req, res) => {
  try {
    const query = mongoose.Types.ObjectId.isValid(req.params.id)
      ? { _id: req.params.id }
      : { studentId: Number(req.params.id) };

    const deleted = await Student.findOneAndDelete(query);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }
    res.json({ success: true, message: "Student deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete student", error: error.message });
  }
});

// ========================================================
// WARDENS API (CRUD)
// ========================================================

// POST /wardens - Add Warden
app.post("/wardens", async (req, res) => {
  try {
    const { name, email, phone, assignedHostel, password } = req.body;
    if (!name || !email || !assignedHostel || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, assigned hostel, and password are required"
      });
    }

    const existing = await Warden.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: "Warden with this email already exists" });
    }

    const wardenId = req.body.wardenId || (await getNextWardenId());
    const warden = new Warden({
      wardenId: Number(wardenId),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone || "",
      assignedHostel: assignedHostel.trim().toUpperCase(),
      password: bcrypt.hashSync(password, 10)
    });

    await warden.save();
    res.status(201).json({ success: true, message: "Warden added successfully", warden: sanitizeUser(warden) });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to add warden", error: error.message });
  }
});

// GET /wardens - List Wardens (hides passwords)
app.get("/wardens", async (req, res) => {
  try {
    const wardens = await Warden.find().select("-password").sort({ wardenId: 1 });
    res.json(wardens);
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch wardens", error: error.message });
  }
});

// PUT /wardens/:id - Edit Warden
app.put("/wardens/:id", async (req, res) => {
  try {
    const query = mongoose.Types.ObjectId.isValid(req.params.id)
      ? { _id: req.params.id }
      : { wardenId: Number(req.params.id) };

    const updateData = { ...req.body };
    if (updateData.assignedHostel) {
      updateData.assignedHostel = updateData.assignedHostel.toUpperCase();
    }
    if (updateData.password && updateData.password.trim() !== "") {
      updateData.password = bcrypt.hashSync(updateData.password.trim(), 10);
    } else {
      delete updateData.password;
    }

    const updated = await Warden.findOneAndUpdate(query, updateData, { returnDocument: "after" }).select("-password");
    if (!updated) {
      return res.status(404).json({ success: false, message: "Warden not found" });
    }
    res.json({ success: true, message: "Warden updated successfully", warden: sanitizeUser(updated) });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update warden", error: error.message });
  }
});

// DELETE /wardens/:id - Delete Warden
app.delete("/wardens/:id", async (req, res) => {
  try {
    const query = mongoose.Types.ObjectId.isValid(req.params.id)
      ? { _id: req.params.id }
      : { wardenId: Number(req.params.id) };

    const deleted = await Warden.findOneAndDelete(query);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Warden not found" });
    }
    res.json({ success: true, message: "Warden deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete warden", error: error.message });
  }
});

// ========================================================
// COMPLAINT CATEGORIES API (CRUD)
// ========================================================

// POST /categories - Add Category
app.post("/categories", async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: "Category name is required" });
    }

    const existing = await ComplaintCategory.findOne({ name: name.trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: "Category already exists" });
    }

    const category = new ComplaintCategory({
      name: name.trim(),
      description: description ? description.trim() : ""
    });

    await category.save();
    res.status(201).json({ success: true, message: "Category created successfully", category });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create category", error: error.message });
  }
});

// GET /categories - List Categories
app.get("/categories", async (req, res) => {
  try {
    const categories = await ComplaintCategory.find().sort({ name: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch categories", error: error.message });
  }
});

// PUT /categories/:id - Edit Category
app.put("/categories/:id", async (req, res) => {
  try {
    const updated = await ComplaintCategory.findByIdAndUpdate(req.params.id, req.body, { returnDocument: "after" });
    if (!updated) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }
    res.json({ success: true, message: "Category updated successfully", category: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update category", error: error.message });
  }
});

// DELETE /categories/:id - Delete Category
app.delete("/categories/:id", async (req, res) => {
  try {
    const deleted = await ComplaintCategory.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }
    res.json({ success: true, message: "Category deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete category", error: error.message });
  }
});

// ========================================================
// COMPLAINTS API
// ========================================================

// POST /complaints - Add Complaint
app.post("/complaints", async (req, res) => {
  try {
    const { studentId, studentName, category, hostelBlock, roomNumber, description } = req.body;

    if (!category || !hostelBlock || !roomNumber || !description) {
      return res.status(400).json({
        success: false,
        message: "Category, hostel block, room number, and description are required"
      });
    }

    const complaintId = req.body.complaintId || (await getNextComplaintId());
    const validStudentId = studentId ? Number(studentId) : 101;

    let finalStudentName = studentName;
    if (!finalStudentName) {
      const studentDoc = await Student.findOne({ studentId: validStudentId });
      if (studentDoc) {
        finalStudentName = studentDoc.name;
      } else {
        finalStudentName = req.body.name || `Student #${validStudentId}`;
      }
    }

    const complaintDate = req.body.date ? new Date(req.body.date) : new Date();

    const newComplaint = new Complaint({
      complaintId: Number(complaintId),
      studentId: validStudentId,
      studentName: finalStudentName,
      category: category.trim(),
      hostelBlock: hostelBlock.trim().toUpperCase(),
      roomNumber: Number(roomNumber),
      description: description.trim(),
      status: (req.body.status || "PENDING").toUpperCase(),
      date: complaintDate,
      createdAt: complaintDate,
      // Legacy compatibility
      name: finalStudentName,
      room: String(roomNumber),
      complaint: description.trim()
    });

    await newComplaint.save();

    res.status(201).json({
      success: true,
      message: "Complaint submitted successfully!",
      complaint: newComplaint
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to submit complaint", error: error.message });
  }
});

// GET /complaints - List Complaints (Supports ?hostelBlock= for Warden, ?studentId= for Student, ?status=; enforces role headers)
app.get("/complaints", async (req, res) => {
  try {
    const { hostelBlock, studentId, status } = req.query;
    let query = {};

    // Role-based scoping
    const roleHeader = req.headers["x-user-role"];
    const idHeader = req.headers["x-user-id"];
    const blockHeader = req.headers["x-user-block"];

    if (roleHeader === "STUDENT" && idHeader) {
      query.studentId = Number(idHeader);
    } else if (studentId) {
      query.studentId = Number(studentId);
    }

    if (roleHeader === "WARDEN" && blockHeader) {
      query.hostelBlock = blockHeader.trim().toUpperCase();
    } else if (hostelBlock) {
      query.hostelBlock = hostelBlock.trim().toUpperCase();
    }

    if (status) {
      const s = status.trim().toUpperCase();
      if (s === "PENDING") {
        query.status = { $in: ["PENDING", "Pending"] };
      } else if (s === "IN PROGRESS") {
        query.status = { $in: ["IN PROGRESS", "In Progress"] };
      } else if (s === "RESOLVED") {
        query.status = { $in: ["RESOLVED", "Resolved"] };
      } else {
        query.status = new RegExp(`^${status.trim()}$`, "i");
      }
    }

    const complaints = await Complaint.find(query).sort({ date: -1, complaintId: -1 });
    res.json(complaints);
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch complaints", error: error.message });
  }
});

// GET /complaints/:id - Get Complaint by ID (enforces role scoping)
app.get("/complaints/:id", async (req, res) => {
  try {
    const query = mongoose.Types.ObjectId.isValid(req.params.id)
      ? { _id: req.params.id }
      : { complaintId: Number(req.params.id) };

    const complaint = await Complaint.findOne(query);
    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    // Role-based access validation
    const roleHeader = req.headers["x-user-role"];
    const idHeader = req.headers["x-user-id"];
    const blockHeader = req.headers["x-user-block"];

    if (roleHeader === "STUDENT" && idHeader && complaint.studentId !== Number(idHeader)) {
      return res.status(403).json({ success: false, message: "Unauthorized: Access restricted to your own complaint" });
    }
    if (roleHeader === "WARDEN" && blockHeader && complaint.hostelBlock !== blockHeader.trim().toUpperCase()) {
      return res.status(403).json({ success: false, message: "Unauthorized: Access restricted to complaints in your assigned block" });
    }

    res.json(complaint);
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch complaint", error: error.message });
  }
});

// PUT /complaints/:id - Edit Complaint
app.put("/complaints/:id", async (req, res) => {
  try {
    const query = mongoose.Types.ObjectId.isValid(req.params.id)
      ? { _id: req.params.id }
      : { complaintId: Number(req.params.id) };

    if (req.body.status) {
      req.body.status = req.body.status.toUpperCase();
    }
    if (req.body.roomNumber) {
      req.body.roomNumber = Number(req.body.roomNumber);
    }
    if (req.body.hostelBlock) {
      req.body.hostelBlock = req.body.hostelBlock.toUpperCase();
    }

    const updated = await Complaint.findOneAndUpdate(query, req.body, { returnDocument: "after" });
    if (!updated) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }
    res.json({ success: true, message: "Complaint updated successfully", complaint: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update complaint", error: error.message });
  }
});

// DELETE /complaints/:id - Delete Complaint (restricted from students)
app.delete("/complaints/:id", async (req, res) => {
  try {
    const roleHeader = req.headers["x-user-role"];
    if (roleHeader === "STUDENT") {
      return res.status(403).json({ success: false, message: "Unauthorized: Students cannot delete complaint records" });
    }

    const query = mongoose.Types.ObjectId.isValid(req.params.id)
      ? { _id: req.params.id }
      : { complaintId: Number(req.params.id) };

    const deleted = await Complaint.findOneAndDelete(query);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }
    res.json({ success: true, message: "Complaint deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete complaint", error: error.message });
  }
});

// ========================================================
// WARDEN SPECIFIC APIS
// ========================================================

// PUT /warden/complaints/:id/status - Warden updates complaint status
app.put("/warden/complaints/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["PENDING", "IN PROGRESS", "RESOLVED"];

    if (!status || !validStatuses.includes(status.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: "Status must be PENDING, IN PROGRESS, or RESOLVED"
      });
    }

    const query = mongoose.Types.ObjectId.isValid(req.params.id)
      ? { _id: req.params.id }
      : { complaintId: Number(req.params.id) };

    // Verify warden scope: wardens can only update complaints within their assigned block
    const roleHeader = req.headers["x-user-role"];
    const blockHeader = req.headers["x-user-block"];
    if (roleHeader === "WARDEN" && blockHeader) {
      const existing = await Complaint.findOne(query);
      if (existing && existing.hostelBlock !== blockHeader.trim().toUpperCase()) {
        return res.status(403).json({
          success: false,
          message: `Unauthorized: Warden for Block ${blockHeader} cannot update complaints in Block ${existing.hostelBlock}`
        });
      }
    }

    const updated = await Complaint.findOneAndUpdate(
      query,
      { status: status.toUpperCase() },
      { returnDocument: "after" }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    res.json({
      success: true,
      message: `Complaint status updated to ${status.toUpperCase()}`,
      complaint: updated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update status", error: error.message });
  }
});

// ========================================================
// STUDENT SPECIFIC APIS
// ========================================================

// GET /student/:studentId/complaints - Get all complaints for a student
app.get("/student/:studentId/complaints", async (req, res) => {
  try {
    const studentId = Number(req.params.studentId);

    // Prevent cross-student complaint access
    const roleHeader = req.headers["x-user-role"];
    const idHeader = req.headers["x-user-id"];
    if (roleHeader === "STUDENT" && idHeader && Number(idHeader) !== studentId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: You can only view your own complaints"
      });
    }

    const complaints = await Complaint.find({ studentId }).sort({ date: -1 });
    res.json(complaints);
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch student complaints", error: error.message });
  }
});

// GET /student/:studentId/profile - Get student profile (hides password)
app.get("/student/:studentId/profile", async (req, res) => {
  try {
    const studentId = Number(req.params.studentId);

    // Prevent cross-student profile snooping
    const roleHeader = req.headers["x-user-role"];
    const idHeader = req.headers["x-user-id"];
    if (roleHeader === "STUDENT" && idHeader && Number(idHeader) !== studentId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: You can only view your own profile"
      });
    }

    const student = await Student.findOne({ studentId }).select("-password");
    if (!student) return res.status(404).json({ success: false, message: "Student not found" });
    res.json(student);
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch profile", error: error.message });
  }
});

// PUT /student/:studentId/profile - Update student profile (allows name, email, phone, dept, year, room, password)
app.put("/student/:studentId/profile", async (req, res) => {
  try {
    const studentId = Number(req.params.studentId);

    // Prevent cross-student profile modifications
    const roleHeader = req.headers["x-user-role"];
    const idHeader = req.headers["x-user-id"];
    if (roleHeader === "STUDENT" && idHeader && Number(idHeader) !== studentId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: You can only edit your own profile"
      });
    }

    const { name, email, phone, department, year, roomNumber, password } = req.body;

    const updateFields = {};
    if (name) updateFields.name = name.trim();
    if (email) {
      const emailLower = email.toLowerCase().trim();
      const existing = await Student.findOne({ email: emailLower, studentId: { $ne: studentId } });
      if (existing) {
        return res.status(400).json({ success: false, message: "Email is already registered by another student" });
      }
      updateFields.email = emailLower;
    }
    if (phone !== undefined) updateFields.phone = phone.trim();
    if (department !== undefined) updateFields.department = department.trim();
    if (year !== undefined) updateFields.year = year.trim();
    if (roomNumber) updateFields.roomNumber = Number(roomNumber);
    if (password && password.trim() !== "") {
      updateFields.password = bcrypt.hashSync(password.trim(), 10);
    }

    const student = await Student.findOneAndUpdate({ studentId }, updateFields, { returnDocument: "after" }).select("-password");
    if (!student) return res.status(404).json({ success: false, message: "Student not found" });

    res.json({ success: true, message: "Profile updated successfully", student });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update profile", error: error.message });
  }
});

// ========================================================
// DASHBOARD STATS APIS
// ========================================================

// Admin Stats
app.get("/stats/admin", async (req, res) => {
  try {
    const [totalHostels, totalStudents, totalWardens, totalComplaints, pending, inProgress, resolved] =
      await Promise.all([
        Hostel.countDocuments(),
        Student.countDocuments(),
        Warden.countDocuments(),
        Complaint.countDocuments(),
        Complaint.countDocuments({ status: { $in: ["PENDING", "Pending"] } }),
        Complaint.countDocuments({ status: { $in: ["IN PROGRESS", "In Progress"] } }),
        Complaint.countDocuments({ status: { $in: ["RESOLVED", "Resolved"] } })
      ]);

    res.json({
      totalHostels,
      totalStudents,
      totalWardens,
      totalComplaints,
      pendingComplaints: pending,
      inProgressComplaints: inProgress,
      resolvedComplaints: resolved
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch admin stats", error: error.message });
  }
});

// Warden Stats
app.get("/stats/warden/:block", async (req, res) => {
  try {
    const block = req.params.block.toUpperCase();
    const [totalComplaints, pending, inProgress, resolved, studentsCount] = await Promise.all([
      Complaint.countDocuments({ hostelBlock: block }),
      Complaint.countDocuments({ hostelBlock: block, status: { $in: ["PENDING", "Pending"] } }),
      Complaint.countDocuments({ hostelBlock: block, status: { $in: ["IN PROGRESS", "In Progress"] } }),
      Complaint.countDocuments({ hostelBlock: block, status: { $in: ["RESOLVED", "Resolved"] } }),
      Student.countDocuments({ hostelBlock: block })
    ]);

    res.json({
      assignedBlock: block,
      totalComplaints,
      pendingComplaints: pending,
      inProgressComplaints: inProgress,
      resolvedComplaints: resolved,
      totalStudents: studentsCount
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch warden stats", error: error.message });
  }
});

// Student Stats
app.get("/stats/student/:studentId", async (req, res) => {
  try {
    const studentId = Number(req.params.studentId);
    const [totalComplaints, pending, inProgress, resolved] = await Promise.all([
      Complaint.countDocuments({ studentId }),
      Complaint.countDocuments({ studentId, status: { $in: ["PENDING", "Pending"] } }),
      Complaint.countDocuments({ studentId, status: { $in: ["IN PROGRESS", "In Progress"] } }),
      Complaint.countDocuments({ studentId, status: { $in: ["RESOLVED", "Resolved"] } })
    ]);

    res.json({
      totalComplaints,
      pendingComplaints: pending,
      inProgressComplaints: inProgress,
      resolvedComplaints: resolved
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch student stats", error: error.message });
  }
});

// ========================================================
// PRESERVED LEGACY ROUTES (Backwards compatibility)
// ========================================================
app.get("/", (req, res) => {
  res.sendFile(path.join(frontendDir, "index.html"));
});

app.post("/users", (req, res) => {
  const user = new User(req.body);
  user
    .save()
    .then(() => res.send("Signup successful"))
    .catch(() => res.send("Signup failed"));
});

// ========================================================
// START SERVER
// ========================================================
app.listen(PORT, () => {
  console.log(`Server started on http://127.0.0.1:${PORT}`);
});