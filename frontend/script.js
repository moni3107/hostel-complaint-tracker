// ========================================================
// HOSTEL COMPLAINT TRACKER - FRONTEND ENGINE
// Full Multi-Role Management: Admin, Student, Warden
// ========================================================

const API_BASE = "http://127.0.0.1:5000";
const AUTH_KEY = "hostel_current_user";

// ========================================================
// AUTHENTICATION & ACCESS GUARDS
// ========================================================

function getCurrentUser() {
  try {
    const data = localStorage.getItem(AUTH_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
}

function setCurrentUser(user) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
}

function logout() {
  localStorage.removeItem(AUTH_KEY);
  window.location.href = "index.html";
}

// Centralized API client: automatically transmits auth headers and handles API communication
async function apiFetch(path, options = {}) {
  const user = getCurrentUser();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (user) {
    if (user.role) headers["x-user-role"] = user.role;
    if (user.studentId) headers["x-user-id"] = String(user.studentId);
    else if (user.wardenId) headers["x-user-id"] = String(user.wardenId);
    else if (user.adminId) headers["x-user-id"] = String(user.adminId);

    if (user.assignedHostel) headers["x-user-block"] = user.assignedHostel;
    else if (user.hostelBlock) headers["x-user-block"] = user.hostelBlock;
  }

  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  return fetch(url, { ...options, headers });
}

// Role Guard: Prevents unauthorized cross-role access
function requireRole(allowedRole) {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = "index.html";
    return null;
  }

  if (user.role !== allowedRole) {
    // Redirect to user's rightful dashboard
    if (user.role === "ADMIN") window.location.href = "admin-dashboard.html";
    else if (user.role === "WARDEN") window.location.href = "warden-dashboard.html";
    else window.location.href = "student-dashboard.html";
    return null;
  }

  // Populate user badge in topbar and sidebar
  document.querySelectorAll(".current-user-name").forEach((el) => (el.textContent = user.name));
  document.querySelectorAll(".current-user-role").forEach((el) => (el.textContent = user.role));
  return user;
}

// Redirect away from login if already authenticated
function redirectIfLoggedIn() {
  const user = getCurrentUser();
  if (user) {
    if (user.role === "ADMIN") window.location.href = "admin-dashboard.html";
    else if (user.role === "WARDEN") window.location.href = "warden-dashboard.html";
    else window.location.href = "student-dashboard.html";
  }
}

// Login Handler
async function handleRoleLogin(role, event) {
  event.preventDefault();
  const form = event.target;
  const email = form.email.value.trim();
  const password = form.password.value;
  const btn = form.querySelector('button[type="submit"]');

  let endpoint = "/student/login";
  let redirectUrl = "student-dashboard.html";

  if (role === "ADMIN") {
    endpoint = "/admin/login";
    redirectUrl = "admin-dashboard.html";
  } else if (role === "WARDEN") {
    endpoint = "/warden/login";
    redirectUrl = "warden-dashboard.html";
  }

  try {
    btn.disabled = true;
    btn.textContent = "Authenticating...";

    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, identifier: email, password, role })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Login failed");

    setCurrentUser(data.user);
    showToast(`Welcome back, ${data.user.name}!`, "success");

    setTimeout(() => {
      window.location.href = redirectUrl;
    }, 600);
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Login";
  }
}

// Student Self-Signup
async function handleStudentSignup(event) {
  event.preventDefault();
  const form = event.target;
  const btn = form.querySelector('button[type="submit"]');

  const password = form.password.value;
  const confirmPassword = form.confirmPassword ? form.confirmPassword.value : "";

  if (confirmPassword && password !== confirmPassword) {
    showToast("Passwords do not match. Please re-enter.", "error");
    return;
  }

  const payload = {
    name: form.name.value.trim(),
    email: form.email.value.trim(),
    phone: form.phone ? form.phone.value.trim() : "",
    department: form.department ? form.department.value.trim() : "",
    year: form.year ? form.year.value : "1st Year",
    hostelBlock: form.hostelBlock.value.trim().toUpperCase(),
    roomNumber: Number(form.roomNumber.value),
    password: password,
    confirmPassword: confirmPassword
  };

  if (form.studentId && form.studentId.value.trim() !== "") {
    payload.studentId = Number(form.studentId.value.trim());
  }

  try {
    btn.disabled = true;
    btn.textContent = "Registering...";

    const res = await fetch(`${API_BASE}/student/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Registration failed");

    showToast("Registration successful! Please login with your credentials.", "success");
    setTimeout(() => {
      window.location.href = "index.html";
    }, 1200);
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Complete Registration";
  }
}

// ========================================================
// TOAST NOTIFICATIONS & UTILITIES
// ========================================================

function showToast(message, type = "info") {
  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${type === "success" ? "✓" : type === "error" ? "✕" : "ℹ"}</span> <span>${escapeHtml(message)}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function renderStatusBadge(status) {
  const s = (status || "PENDING").toUpperCase();
  if (s === "RESOLVED") return `<span class="status-badge resolved"><span class="badge-dot">●</span> Resolved</span>`;
  if (s === "IN PROGRESS") return `<span class="status-badge progress"><span class="badge-dot">●</span> In Progress</span>`;
  return `<span class="status-badge pending"><span class="badge-dot">●</span> Pending</span>`;
}

function escapeHtml(text) {
  if (text === null || text === undefined) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Modal helper
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add("show");
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove("show");
}

// Sidebar View Switcher
function switchView(viewId, linkElement = null) {
  document.querySelectorAll(".tab-view").forEach((view) => view.classList.remove("active"));
  document.querySelectorAll(".menu-link").forEach((link) => link.classList.remove("active"));

  const targetView = document.getElementById(viewId);
  if (targetView) targetView.classList.add("active");

  if (!linkElement) {
    linkElement =
      document.querySelector(`.menu-link[onclick*="'${viewId}'"]`) ||
      document.querySelector(`.menu-link[data-view="${viewId}"]`);
  }

  if (linkElement) linkElement.classList.add("active");

  // Update topbar title
  const titleEl = document.getElementById("pageTitle");
  if (titleEl && linkElement) {
    titleEl.textContent = linkElement.textContent.trim().replace(/^[^\w\s]+/, "").trim();
  }
}

// Table Search Filter Helper
function filterTable(inputId, tableBodyId) {
  const term = document.getElementById(inputId).value.toLowerCase();
  const rows = document.querySelectorAll(`#${tableBodyId} tr`);
  rows.forEach((row) => {
    const text = row.innerText.toLowerCase();
    row.style.display = text.includes(term) ? "" : "none";
  });
}

// ========================================================
// REAL-TIME AUTO REFRESHING ENGINE
// ========================================================
let livePollTimer = null;
function startRealtimePolling(role) {
  if (livePollTimer) clearInterval(livePollTimer);

  livePollTimer = setInterval(async () => {
    const user = getCurrentUser();
    if (!user || user.role !== role) {
      clearInterval(livePollTimer);
      return;
    }

    // Do not disrupt active input typing or open modals
    const modalOpen = document.querySelector(".modal.show");
    const activeEl = document.activeElement;
    const isTyping = activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || activeEl.tagName === "SELECT");

    try {
      if (role === "STUDENT") {
        await loadStudentStats(user.studentId);
        if (!isTyping && !modalOpen) {
          await loadStudentComplaints(user.studentId, true);
        }
      } else if (role === "WARDEN") {
        await loadWardenStats(user.assignedHostel);
        if (!isTyping && !modalOpen) {
          const filterSelect = document.getElementById("filterWardenComplaintStatus");
          const status = filterSelect ? filterSelect.value : "";
          await loadWardenComplaints(user.assignedHostel, status, true);
        }
      } else if (role === "ADMIN") {
        await loadAdminStats();
      }
    } catch (pollErr) {
      // Quiet background error handling
    }
  }, 5000);
}

// ========================================================
// ADMIN MODULE
// ========================================================

async function initAdminDashboard() {
  const user = requireRole("ADMIN");
  if (!user) return;

  await Promise.all([
    loadAdminStats(),
    loadHostels(),
    loadStudents(),
    loadWardens(),
    loadCategories(),
    loadAdminComplaints()
  ]);

  startRealtimePolling("ADMIN");
}

// 1. Admin Stats
async function loadAdminStats() {
  try {
    const res = await fetch(`${API_BASE}/stats/admin`);
    const data = await res.json();
    if (!res.ok) return;

    document.getElementById("statHostels").textContent = data.totalHostels || 0;
    document.getElementById("statStudents").textContent = data.totalStudents || 0;
    document.getElementById("statWardens").textContent = data.totalWardens || 0;
    document.getElementById("statComplaints").textContent = data.totalComplaints || 0;
    document.getElementById("statPending").textContent = data.pendingComplaints || 0;
    document.getElementById("statProgress").textContent = data.inProgressComplaints || 0;
    document.getElementById("statResolved").textContent = data.resolvedComplaints || 0;
  } catch (e) {
    console.error("Error loading stats:", e);
  }
}

// 2. Hostels CRUD
let hostelsCache = [];
async function loadHostels() {
  try {
    const res = await fetch(`${API_BASE}/hostels`);
    hostelsCache = await res.json();
    const tbody = document.getElementById("hostelsTableBody");
    if (!tbody) return;

    if (hostelsCache.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No hostels added yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = hostelsCache
      .map(
        (h) => `
      <tr>
        <td><strong>#${h.hostelId}</strong></td>
        <td><strong>${escapeHtml(h.name)}</strong></td>
        <td><span class="category-tag">Block ${escapeHtml(h.block)}</span></td>
        <td>${escapeHtml(h.description || "-")}</td>
        <td>
          <div class="action-btns">
            <button class="btn btn-secondary btn-sm" onclick="editHostel('${h._id}')">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteHostel('${h._id}')">Delete</button>
          </div>
        </td>
      </tr>
    `
      )
      .join("");
  } catch (e) {
    console.error(e);
  }
}

function openHostelModal(hostel = null) {
  document.getElementById("hostelModalTitle").textContent = hostel ? "Edit Hostel" : "Add New Hostel";
  document.getElementById("hostelMongoId").value = hostel ? hostel._id : "";
  document.getElementById("hostelId").value = hostel ? hostel.hostelId : "";
  document.getElementById("hostelName").value = hostel ? hostel.name : "";
  document.getElementById("hostelBlock").value = hostel ? hostel.block : "";
  document.getElementById("hostelDesc").value = hostel ? hostel.description || "" : "";
  openModal("hostelModal");
}

function editHostel(id) {
  const h = hostelsCache.find((x) => x._id === id);
  if (h) openHostelModal(h);
}

async function saveHostel(event) {
  event.preventDefault();
  const mongoId = document.getElementById("hostelMongoId").value;
  const payload = {
    hostelId: document.getElementById("hostelId").value ? Number(document.getElementById("hostelId").value) : undefined,
    name: document.getElementById("hostelName").value.trim(),
    block: document.getElementById("hostelBlock").value.trim().toUpperCase(),
    description: document.getElementById("hostelDesc").value.trim()
  };

  try {
    const url = mongoId ? `${API_BASE}/hostels/${mongoId}` : `${API_BASE}/hostels`;
    const method = mongoId ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to save hostel");

    showToast("Hostel saved successfully", "success");
    closeModal("hostelModal");
    await loadHostels();
    await loadAdminStats();
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function deleteHostel(id) {
  if (!confirm("Are you sure you want to delete this hostel?")) return;
  try {
    const res = await fetch(`${API_BASE}/hostels/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Delete failed");
    showToast("Hostel deleted", "success");
    await loadHostels();
    await loadAdminStats();
  } catch (err) {
    showToast(err.message, "error");
  }
}

// 3. Students CRUD
let studentsCache = [];
async function loadStudents() {
  try {
    const res = await fetch(`${API_BASE}/students`);
    studentsCache = await res.json();
    const tbody = document.getElementById("studentsTableBody");
    if (!tbody) return;

    if (studentsCache.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="empty-state">No students registered yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = studentsCache
      .map(
        (s) => `
      <tr>
        <td><strong>#${s.studentId}</strong></td>
        <td><strong>${escapeHtml(s.name)}</strong></td>
        <td>${escapeHtml(s.email)}</td>
        <td>${escapeHtml(s.phone || "-")}</td>
        <td>${escapeHtml(s.department || "-")} (${escapeHtml(s.year || "-")})</td>
        <td><span class="category-tag">Block ${escapeHtml(s.hostelBlock)}</span></td>
        <td>Room ${escapeHtml(s.roomNumber)}</td>
        <td>
          <div class="action-btns">
            <button class="btn btn-secondary btn-sm" onclick="editStudent('${s._id}')">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteStudent('${s._id}')">Delete</button>
          </div>
        </td>
      </tr>
    `
      )
      .join("");
  } catch (e) {
    console.error(e);
  }
}

function openStudentModal(student = null) {
  document.getElementById("studentModalTitle").textContent = student ? "Edit Student" : "Add New Student";
  document.getElementById("studentMongoId").value = student ? student._id : "";
  document.getElementById("studentIdInput").value = student ? student.studentId : "";
  document.getElementById("studentNameInput").value = student ? student.name : "";
  document.getElementById("studentEmailInput").value = student ? student.email : "";
  document.getElementById("studentPhoneInput").value = student ? student.phone || "" : "";
  document.getElementById("studentDeptInput").value = student ? student.department || "" : "";
  document.getElementById("studentYearInput").value = student ? student.year || "1st Year" : "1st Year";
  document.getElementById("studentBlockInput").value = student ? student.hostelBlock : "A";
  document.getElementById("studentRoomInput").value = student ? student.roomNumber : "";
  const passInput = document.getElementById("studentPassInput");
  if (passInput) {
    passInput.value = "";
    passInput.required = !student;
    passInput.placeholder = student ? "Leave blank to keep current password" : "Enter account password";
  }
  openModal("studentModal");
}

function editStudent(id) {
  const s = studentsCache.find((x) => x._id === id);
  if (s) openStudentModal(s);
}

async function saveStudent(event) {
  event.preventDefault();
  const mongoId = document.getElementById("studentMongoId").value;
  const passVal = document.getElementById("studentPassInput") ? document.getElementById("studentPassInput").value.trim() : "";
  const payload = {
    studentId: document.getElementById("studentIdInput").value
      ? Number(document.getElementById("studentIdInput").value)
      : undefined,
    name: document.getElementById("studentNameInput").value.trim(),
    email: document.getElementById("studentEmailInput").value.trim(),
    phone: document.getElementById("studentPhoneInput").value.trim(),
    department: document.getElementById("studentDeptInput").value.trim(),
    year: document.getElementById("studentYearInput").value,
    hostelBlock: document.getElementById("studentBlockInput").value.trim().toUpperCase(),
    roomNumber: Number(document.getElementById("studentRoomInput").value)
  };
  if (passVal) {
    payload.password = passVal;
  }

  try {
    const url = mongoId ? `${API_BASE}/students/${mongoId}` : `${API_BASE}/students`;
    const method = mongoId ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to save student");

    showToast("Student record saved", "success");
    closeModal("studentModal");
    await loadStudents();
    await loadAdminStats();
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function deleteStudent(id) {
  if (!confirm("Are you sure you want to delete this student?")) return;
  try {
    const res = await fetch(`${API_BASE}/students/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Delete failed");
    showToast("Student deleted", "success");
    await loadStudents();
    await loadAdminStats();
  } catch (err) {
    showToast(err.message, "error");
  }
}

// 4. Wardens CRUD
let wardensCache = [];
async function loadWardens() {
  try {
    const res = await fetch(`${API_BASE}/wardens`);
    wardensCache = await res.json();
    const tbody = document.getElementById("wardensTableBody");
    if (!tbody) return;

    if (wardensCache.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-state">No wardens added yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = wardensCache
      .map(
        (w) => `
      <tr>
        <td><strong>#${w.wardenId}</strong></td>
        <td><strong>${escapeHtml(w.name)}</strong></td>
        <td>${escapeHtml(w.email)}</td>
        <td>${escapeHtml(w.phone || "-")}</td>
        <td><span class="category-tag">Block ${escapeHtml(w.assignedHostel)}</span></td>
        <td>
          <div class="action-btns">
            <button class="btn btn-secondary btn-sm" onclick="editWarden('${w._id}')">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteWarden('${w._id}')">Delete</button>
          </div>
        </td>
      </tr>
    `
      )
      .join("");
  } catch (e) {
    console.error(e);
  }
}

function openWardenModal(warden = null) {
  document.getElementById("wardenModalTitle").textContent = warden ? "Edit Warden" : "Add New Warden";
  document.getElementById("wardenMongoId").value = warden ? warden._id : "";
  document.getElementById("wardenIdInput").value = warden ? warden.wardenId : "";
  document.getElementById("wardenNameInput").value = warden ? warden.name : "";
  document.getElementById("wardenEmailInput").value = warden ? warden.email : "";
  document.getElementById("wardenPhoneInput").value = warden ? warden.phone || "" : "";
  document.getElementById("wardenBlockInput").value = warden ? warden.assignedHostel : "A";
  const passInput = document.getElementById("wardenPassInput");
  if (passInput) {
    passInput.value = "";
    passInput.required = !warden;
    passInput.placeholder = warden ? "Leave blank to keep current password" : "Enter account password";
  }
  openModal("wardenModal");
}

function editWarden(id) {
  const w = wardensCache.find((x) => x._id === id);
  if (w) openWardenModal(w);
}

async function saveWarden(event) {
  event.preventDefault();
  const mongoId = document.getElementById("wardenMongoId").value;
  const passVal = document.getElementById("wardenPassInput") ? document.getElementById("wardenPassInput").value.trim() : "";
  const payload = {
    wardenId: document.getElementById("wardenIdInput").value
      ? Number(document.getElementById("wardenIdInput").value)
      : undefined,
    name: document.getElementById("wardenNameInput").value.trim(),
    email: document.getElementById("wardenEmailInput").value.trim(),
    phone: document.getElementById("wardenPhoneInput").value.trim(),
    assignedHostel: document.getElementById("wardenBlockInput").value.trim().toUpperCase()
  };
  if (passVal) {
    payload.password = passVal;
  }

  try {
    const url = mongoId ? `${API_BASE}/wardens/${mongoId}` : `${API_BASE}/wardens`;
    const method = mongoId ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to save warden");

    showToast("Warden record saved", "success");
    closeModal("wardenModal");
    await loadWardens();
    await loadAdminStats();
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function deleteWarden(id) {
  if (!confirm("Are you sure you want to delete this warden?")) return;
  try {
    const res = await fetch(`${API_BASE}/wardens/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Delete failed");
    showToast("Warden deleted", "success");
    await loadWardens();
    await loadAdminStats();
  } catch (err) {
    showToast(err.message, "error");
  }
}

// 5. Complaint Categories CRUD
let categoriesCache = [];
async function loadCategories() {
  try {
    const res = await fetch(`${API_BASE}/categories`);
    categoriesCache = await res.json();
    const tbody = document.getElementById("categoriesTableBody");
    if (!tbody) return;

    if (categoriesCache.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" class="empty-state">No categories defined.</td></tr>`;
      return;
    }

    tbody.innerHTML = categoriesCache
      .map(
        (c) => `
      <tr>
        <td><strong>${escapeHtml(c.name)}</strong></td>
        <td>${escapeHtml(c.description || "-")}</td>
        <td>
          <div class="action-btns">
            <button class="btn btn-secondary btn-sm" onclick="editCategory('${c._id}')">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteCategory('${c._id}')">Delete</button>
          </div>
        </td>
      </tr>
    `
      )
      .join("");
  } catch (e) {
    console.error(e);
  }
}

function openCategoryModal(category = null) {
  document.getElementById("categoryModalTitle").textContent = category ? "Edit Category" : "Add Category";
  document.getElementById("categoryMongoId").value = category ? category._id : "";
  document.getElementById("categoryNameInput").value = category ? category.name : "";
  document.getElementById("categoryDescInput").value = category ? category.description || "" : "";
  openModal("categoryModal");
}

function editCategory(id) {
  const c = categoriesCache.find((x) => x._id === id);
  if (c) openCategoryModal(c);
}

async function saveCategory(event) {
  event.preventDefault();
  const mongoId = document.getElementById("categoryMongoId").value;
  const payload = {
    name: document.getElementById("categoryNameInput").value.trim(),
    description: document.getElementById("categoryDescInput").value.trim()
  };

  try {
    const url = mongoId ? `${API_BASE}/categories/${mongoId}` : `${API_BASE}/categories`;
    const method = mongoId ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to save category");

    showToast("Category saved", "success");
    closeModal("categoryModal");
    await loadCategories();
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function deleteCategory(id) {
  if (!confirm("Are you sure you want to delete this category?")) return;
  try {
    const res = await fetch(`${API_BASE}/categories/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Delete failed");
    showToast("Category deleted", "success");
    await loadCategories();
  } catch (err) {
    showToast(err.message, "error");
  }
}

// 6. Admin Complaints
let adminComplaintsCache = [];
async function loadAdminComplaints(status = "") {
  try {
    const url = status
      ? `${API_BASE}/complaints?status=${encodeURIComponent(status)}`
      : `${API_BASE}/complaints`;
    const res = await fetch(url);
    adminComplaintsCache = await res.json();
    const tbody = document.getElementById("adminComplaintsTableBody");
    if (!tbody) return;

    if (!Array.isArray(adminComplaintsCache) || adminComplaintsCache.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="empty-state">No complaints lodged yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = adminComplaintsCache
      .map(
        (c) => `
      <tr>
        <td><strong>#${c.complaintId}</strong></td>
        <td>${escapeHtml(c.studentName ? `${c.studentName} (#${c.studentId})` : `Student #${c.studentId}`)}</td>
        <td><span class="category-tag">${escapeHtml(c.category)}</span></td>
        <td>Block ${escapeHtml(c.hostelBlock)}</td>
        <td>Room ${escapeHtml(c.roomNumber)}</td>
        <td>${escapeHtml(c.description)}</td>
        <td>${formatDate(c.date)}</td>
        <td>${renderStatusBadge(c.status)}</td>
        <td>
          <div class="action-btns">
            <button class="btn btn-secondary btn-sm" onclick="openComplaintEditModal('${c._id}')">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteComplaint('${c._id}')">Delete</button>
          </div>
        </td>
      </tr>
    `
      )
      .join("");
  } catch (e) {
    console.error(e);
  }
}

function filterAdminComplaintsByStatus(status = "") {
  switchView("complaintsView");
  const filterSelect = document.getElementById("filterAdminComplaintStatus");
  if (filterSelect) {
    filterSelect.value = status;
  }
  loadAdminComplaints(status);
}

function openComplaintEditModal(id) {
  const c = adminComplaintsCache.find((x) => x._id === id);
  if (!c) return;

  document.getElementById("editComplaintMongoId").value = c._id;
  document.getElementById("editComplaintIdDisplay").textContent = `#${c.complaintId}`;
  document.getElementById("editComplaintCategory").value = c.category;
  document.getElementById("editComplaintBlock").value = c.hostelBlock;
  document.getElementById("editComplaintRoom").value = c.roomNumber;
  document.getElementById("editComplaintStatus").value = c.status;
  document.getElementById("editComplaintDesc").value = c.description;

  openModal("complaintEditModal");
}

async function saveAdminComplaint(event) {
  event.preventDefault();
  const id = document.getElementById("editComplaintMongoId").value;
  const payload = {
    category: document.getElementById("editComplaintCategory").value.trim(),
    hostelBlock: document.getElementById("editComplaintBlock").value.trim().toUpperCase(),
    roomNumber: Number(document.getElementById("editComplaintRoom").value),
    status: document.getElementById("editComplaintStatus").value,
    description: document.getElementById("editComplaintDesc").value.trim()
  };

  try {
    const res = await fetch(`${API_BASE}/complaints/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to update complaint");

    showToast("Complaint updated successfully", "success");
    closeModal("complaintEditModal");
    await loadAdminComplaints();
    await loadAdminStats();
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function deleteComplaint(id) {
  if (!confirm("Are you sure you want to delete this complaint?")) return;
  try {
    const res = await fetch(`${API_BASE}/complaints/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Delete failed");
    showToast("Complaint deleted", "success");
    await loadAdminComplaints();
    await loadAdminStats();
  } catch (err) {
    showToast(err.message, "error");
  }
}

// ========================================================
// STUDENT MODULE
// ========================================================

async function initStudentDashboard() {
  const user = requireRole("STUDENT");
  if (!user) return;

  // Display user identity tags
  document.querySelectorAll(".student-id-tag").forEach((el) => (el.textContent = `#${user.studentId}`));
  document.querySelectorAll(".student-room-tag").forEach((el) => (el.textContent = `Block ${user.hostelBlock} - Room ${user.roomNumber}`));

  // Populate dashboard profile details card
  const sName = document.getElementById("dashStudentName");
  if (sName) sName.textContent = user.name || "-";
  const sId = document.getElementById("dashStudentId");
  if (sId) sId.textContent = `#${user.studentId}`;
  const sBlock = document.getElementById("dashStudentBlock");
  if (sBlock) sBlock.textContent = `Block ${user.hostelBlock || "-"}`;
  const sRoom = document.getElementById("dashStudentRoom");
  if (sRoom) sRoom.textContent = user.roomNumber ? `Room ${user.roomNumber}` : "-";
  const sEmail = document.getElementById("dashStudentEmail");
  if (sEmail) sEmail.textContent = user.email || "-";
  const sPhone = document.getElementById("dashStudentPhone");
  if (sPhone) sPhone.textContent = user.phone || "Not set";
  const sDept = document.getElementById("dashStudentDept");
  if (sDept) sDept.textContent = user.department || "Not set";
  const sYear = document.getElementById("dashStudentYear");
  if (sYear) sYear.textContent = user.year || "Not set";

  await Promise.all([
    loadStudentStats(user.studentId),
    loadCategoriesForDropdown(),
    loadStudentComplaints(user.studentId),
    loadStudentProfile(user.studentId),
    loadStudentComplaintLocation(user.studentId)
  ]);

  startRealtimePolling("STUDENT");
}

async function loadStudentStats(studentId) {
  try {
    const res = await fetch(`${API_BASE}/stats/student/${studentId}`);
    const data = await res.json();
    if (!res.ok) return;

    document.getElementById("myTotalComplaints").textContent = data.totalComplaints || 0;
    document.getElementById("myPendingComplaints").textContent = data.pendingComplaints || 0;
    document.getElementById("myProgressComplaints").textContent = data.inProgressComplaints || 0;
    document.getElementById("myResolvedComplaints").textContent = data.resolvedComplaints || 0;
  } catch (e) {
    console.error(e);
  }
}

async function loadCategoriesForDropdown() {
  try {
    const res = await fetch(`${API_BASE}/categories`);
    const cats = await res.json();
    const select = document.getElementById("complaintCategorySelect");
    if (!select) return;

    select.innerHTML = '<option value="" disabled selected>Select issue category...</option>' +
      cats.map((c) => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join("");
  } catch (e) {
    console.error(e);
  }
}

// Automatically fetch hostelBlock and roomNumber from student's profile/DB and display as read-only
async function loadStudentComplaintLocation(studentId) {
  try {
    const user = getCurrentUser();
    const idToFetch = studentId || (user ? user.studentId : null);
    if (!idToFetch) return;

    const res = await fetch(`${API_BASE}/student/${idToFetch}/profile`);
    if (!res.ok) return;
    const s = await res.json();

    // Sync session data if necessary
    if (user && user.studentId === s.studentId) {
      user.name = s.name;
      user.hostelBlock = s.hostelBlock;
      user.roomNumber = s.roomNumber;
      user.phone = s.phone;
      user.department = s.department;
      user.year = s.year;
      setCurrentUser(user);
    }

    const blockInput = document.getElementById("complaintHostelBlock");
    const roomInput = document.getElementById("complaintRoomNumber");
    const alertEl = document.getElementById("missingLocationAlert");
    const submitBtn = document.getElementById("submitComplaintBtn");

    const hasBlock = Boolean(s.hostelBlock && String(s.hostelBlock).trim() !== "");
    const hasRoom = Boolean(s.roomNumber !== undefined && s.roomNumber !== null && String(s.roomNumber).trim() !== "");

    if (blockInput) blockInput.value = hasBlock ? s.hostelBlock : "";
    if (roomInput) roomInput.value = hasRoom ? s.roomNumber : "";

    if (!hasBlock || !hasRoom) {
      if (alertEl) alertEl.style.display = "block";
      if (submitBtn) submitBtn.disabled = true;
    } else {
      if (alertEl) alertEl.style.display = "none";
      if (submitBtn) submitBtn.disabled = false;
    }
  } catch (err) {
    console.error("Failed to load complaint location:", err);
  }
}

// Submit Complaint
async function handleStudentSubmitComplaint(event) {
  event.preventDefault();
  const user = getCurrentUser();
  if (!user) return;

  const form = event.target;
  const btn = form.querySelector('button[type="submit"]');

  const hostelBlock = form.hostelBlock ? form.hostelBlock.value.trim().toUpperCase() : (user.hostelBlock || "");
  const roomNumber = form.roomNumber ? Number(form.roomNumber.value) : (user.roomNumber ? Number(user.roomNumber) : null);
  const category = form.category ? form.category.value : "";
  const description = form.description ? form.description.value.trim() : "";

  if (!hostelBlock || !roomNumber) {
    showToast("Hostel Block and Room Number are missing in your profile. Please update profile before submitting.", "error");
    const alertEl = document.getElementById("missingLocationAlert");
    if (alertEl) alertEl.style.display = "block";
    return;
  }

  if (!category || !description) {
    showToast("Please choose a category and enter description.", "error");
    return;
  }

  const payload = {
    studentId: Number(user.studentId),
    studentName: user.name,
    category: category,
    hostelBlock: hostelBlock,
    roomNumber: Number(roomNumber),
    description: description,
    status: "PENDING",
    date: new Date()
  };

  try {
    btn.disabled = true;
    btn.textContent = "Submitting...";

    const res = await fetch(`${API_BASE}/complaints`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to submit complaint");

    showToast(`Complaint #${data.complaint.complaintId} lodged successfully!`, "success");
    form.reset();

    // Re-fill read-only location fields
    await loadStudentComplaintLocation(user.studentId);
    await loadStudentComplaints(user.studentId);
    await loadStudentStats(user.studentId);

    // Switch to complaints list view
    switchView("myComplaintsView");
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "🚀 Submit Complaint";
  }
}

let studentComplaintsCache = [];
async function loadStudentComplaints(studentId, isQuiet = false) {
  try {
    const res = await apiFetch(`/student/${studentId}/complaints`);
    studentComplaintsCache = await res.json();
    const tbody = document.getElementById("studentComplaintsTableBody");
    const recentTbody = document.getElementById("studentRecentComplaintsTableBody");
    const statusTimeline = document.getElementById("studentStatusContainer");

    // 1. Populate Recent Complaints (top 5) on Dashboard tab
    if (recentTbody) {
      if (!Array.isArray(studentComplaintsCache) || studentComplaintsCache.length === 0) {
        recentTbody.innerHTML = `<tr><td colspan="5" class="empty-state">No complaints filed yet.</td></tr>`;
      } else {
        const recent = studentComplaintsCache.slice(0, 5);
        recentTbody.innerHTML = recent
          .map(
            (c) => `
          <tr>
            <td><strong>#${c.complaintId}</strong></td>
            <td><span class="category-tag">${escapeHtml(c.category)}</span></td>
            <td>${escapeHtml(c.description)}</td>
            <td>${formatDate(c.date)}</td>
            <td>${renderStatusBadge(c.status)}</td>
          </tr>
        `
          )
          .join("");
      }
    }

    // 2. Populate All My Complaints
    if (tbody) {
      if (!Array.isArray(studentComplaintsCache) || studentComplaintsCache.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-state">You have not submitted any complaints yet.</td></tr>`;
      } else {
        tbody.innerHTML = studentComplaintsCache
          .map(
            (c) => `
          <tr>
            <td><strong>#${c.complaintId}</strong></td>
            <td><span class="category-tag">${escapeHtml(c.category)}</span></td>
            <td>${escapeHtml(c.description)}</td>
            <td>Block ${escapeHtml(c.hostelBlock)} - Rm ${c.roomNumber}</td>
            <td>${formatDate(c.date)}</td>
            <td>${renderStatusBadge(c.status)}</td>
          </tr>
        `
          )
          .join("");
      }
    }

    // 3. Render Status View cards
    if (statusTimeline) {
      if (!Array.isArray(studentComplaintsCache) || studentComplaintsCache.length === 0) {
        statusTimeline.innerHTML = `<div class="empty-state">No complaints to track right now.</div>`;
      } else {
        statusTimeline.innerHTML = studentComplaintsCache
          .map(
            (c) => `
          <div class="card" style="margin-bottom: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
              <strong>Complaint #${c.complaintId} &bull; ${escapeHtml(c.category)}</strong>
              ${renderStatusBadge(c.status)}
            </div>
            <p style="color: var(--text-muted); font-size: 0.92rem; margin-bottom: 0.5rem;">${escapeHtml(c.description)}</p>
            <div style="font-size: 0.8rem; color: var(--text-muted);">Filed on ${formatDate(c.date)} | Location: Block ${escapeHtml(c.hostelBlock)}, Room ${c.roomNumber}</div>
          </div>
        `
          )
          .join("");
      }
    }
  } catch (e) {
    if (!isQuiet) console.error(e);
  }
}

function filterStudentComplaintsByStatus(status = "") {
  switchView("myComplaintsView");
  const tbody = document.getElementById("studentComplaintsTableBody");
  if (!tbody) return;

  let filtered = studentComplaintsCache;
  if (status) {
    const target = status.toUpperCase();
    filtered = studentComplaintsCache.filter((c) => (c.status || "").toUpperCase() === target);
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state">No complaints found with status "${escapeHtml(status || 'All')}".</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered
    .map(
      (c) => `
    <tr>
      <td><strong>#${c.complaintId}</strong></td>
      <td><span class="category-tag">${escapeHtml(c.category)}</span></td>
      <td>${escapeHtml(c.description)}</td>
      <td>Block ${escapeHtml(c.hostelBlock)} - Rm ${c.roomNumber}</td>
      <td>${formatDate(c.date)}</td>
      <td>${renderStatusBadge(c.status)}</td>
    </tr>
  `
    )
    .join("");
}

// Standalone complaint.html initialization
async function initStandaloneComplaintPage() {
  const user = requireRole("STUDENT");
  if (!user) return;

  document.querySelectorAll(".current-user-name").forEach((el) => (el.textContent = user.name));
  await loadCategoriesForDropdown();
  await loadStudentComplaintLocation(user.studentId);
}

// Student Profile
async function loadStudentProfile(studentId) {
  try {
    const res = await apiFetch(`/student/${studentId}/profile`);
    const s = await res.json();
    if (!res.ok) return;

    document.getElementById("profileStudentId").value = s.studentId;
    document.getElementById("profileName").value = s.name;
    document.getElementById("profileEmail").value = s.email;
    document.getElementById("profilePhone").value = s.phone || "";
    document.getElementById("profileDept").value = s.department || "";
    document.getElementById("profileYear").value = s.year || "";
    document.getElementById("profileBlock").value = s.hostelBlock;
    document.getElementById("profileRoom").value = s.roomNumber;
  } catch (e) {
    console.error(e);
  }
}

async function handleStudentUpdateProfile(event) {
  event.preventDefault();
  const user = getCurrentUser();
  if (!user) return;

  const form = event.target;
  const payload = {
    name: form.name.value.trim(),
    email: form.email.value.trim(),
    phone: form.phone.value.trim(),
    department: form.department.value.trim(),
    year: form.year.value,
    roomNumber: Number(form.roomNumber.value)
  };

  if (form.password && form.password.value) {
    payload.password = form.password.value;
  }

  try {
    const res = await apiFetch(`/student/${user.studentId}/profile`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to update profile");

    // Update session storage
    user.name = data.student.name;
    user.email = data.student.email;
    user.phone = data.student.phone;
    user.department = data.student.department;
    user.year = data.student.year;
    user.roomNumber = data.student.roomNumber;
    setCurrentUser(user);

    // Update resident card on Dashboard view
    const sEmail = document.getElementById("dashStudentEmail");
    if (sEmail) sEmail.textContent = user.email || "-";
    const sName = document.getElementById("dashStudentName");
    if (sName) sName.textContent = user.name || "-";
    const sPhone = document.getElementById("dashStudentPhone");
    if (sPhone) sPhone.textContent = user.phone || "Not set";
    const sDept = document.getElementById("dashStudentDept");
    if (sDept) sDept.textContent = user.department || "Not set";
    const sYear = document.getElementById("dashStudentYear");
    if (sYear) sYear.textContent = user.year || "Not set";
    const sRoom = document.getElementById("dashStudentRoom");
    if (sRoom) sRoom.textContent = user.roomNumber ? `Room ${user.roomNumber}` : "-";

    showToast("Profile updated successfully!", "success");
    requireRole("STUDENT");
  } catch (err) {
    showToast(err.message, "error");
  }
}

// ========================================================
// WARDEN MODULE
// ========================================================

async function initWardenDashboard() {
  const user = requireRole("WARDEN");
  if (!user) return;

  document.querySelectorAll(".warden-block-tag").forEach((el) => (el.textContent = `Block ${user.assignedHostel}`));

  await Promise.all([
    loadWardenStats(user.assignedHostel),
    loadWardenComplaints(user.assignedHostel),
    loadWardenStudents(user.assignedHostel)
  ]);

  startRealtimePolling("WARDEN");
}

async function loadWardenStats(block) {
  try {
    const res = await fetch(`${API_BASE}/stats/warden/${block}`);
    const data = await res.json();
    if (!res.ok) return;

    document.getElementById("wardenTotalComplaints").textContent = data.totalComplaints || 0;
    document.getElementById("wardenPendingComplaints").textContent = data.pendingComplaints || 0;
    document.getElementById("wardenProgressComplaints").textContent = data.inProgressComplaints || 0;
    document.getElementById("wardenResolvedComplaints").textContent = data.resolvedComplaints || 0;
    document.getElementById("wardenTotalStudents").textContent = data.totalStudents || 0;
  } catch (e) {
    console.error(e);
  }
}

let wardenComplaintsCache = [];
async function loadWardenComplaints(block, status = "") {
  try {
    let url = `${API_BASE}/complaints?hostelBlock=${encodeURIComponent(block)}`;
    if (status) {
      url += `&status=${encodeURIComponent(status)}`;
    }
    const res = await fetch(url);
    wardenComplaintsCache = await res.json();
    const tbody = document.getElementById("wardenComplaintsTableBody");
    const statusTbody = document.getElementById("wardenStatusUpdateTableBody");

    if (tbody) {
      if (!Array.isArray(wardenComplaintsCache) || wardenComplaintsCache.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No complaints reported in Block ${escapeHtml(block)}${status ? ' with status ' + escapeHtml(status) : ''}.</td></tr>`;
      } else {
        tbody.innerHTML = wardenComplaintsCache
          .map(
            (c) => `
          <tr>
            <td><strong>#${c.complaintId}</strong></td>
            <td>${escapeHtml(c.studentName ? `${c.studentName} (#${c.studentId})` : `Student #${c.studentId}`)}</td>
            <td><span class="category-tag">${escapeHtml(c.category)}</span></td>
            <td>Room ${c.roomNumber}</td>
            <td>${escapeHtml(c.description)}</td>
            <td>${formatDate(c.date)}</td>
            <td>${renderStatusBadge(c.status)}</td>
          </tr>
        `
          )
          .join("");
      }
    }

    if (statusTbody) {
      if (!Array.isArray(wardenComplaintsCache) || wardenComplaintsCache.length === 0) {
        statusTbody.innerHTML = `<tr><td colspan="6" class="empty-state">No complaints to manage.</td></tr>`;
      } else {
        statusTbody.innerHTML = wardenComplaintsCache
          .map(
            (c) => `
          <tr>
            <td><strong>#${c.complaintId}</strong></td>
            <td>Room ${c.roomNumber}</td>
            <td>${escapeHtml(c.category)}</td>
            <td>${escapeHtml(c.description)}</td>
            <td>${renderStatusBadge(c.status)}</td>
            <td>
              <select class="form-control" style="width: auto; display: inline-block; padding: 0.35rem 0.6rem; font-size: 0.85rem;" onchange="updateWardenComplaintStatus('${c._id}', this.value)">
                <option value="PENDING" ${c.status === "PENDING" || c.status === "Pending" ? "selected" : ""}>PENDING</option>
                <option value="IN PROGRESS" ${c.status === "IN PROGRESS" || c.status === "In Progress" ? "selected" : ""}>IN PROGRESS</option>
                <option value="RESOLVED" ${c.status === "RESOLVED" || c.status === "Resolved" ? "selected" : ""}>RESOLVED</option>
              </select>
            </td>
          </tr>
        `
          )
          .join("");
      }
    }
  } catch (e) {
    console.error(e);
  }
}

function filterWardenComplaintsByStatus(status = "") {
  switchView("wardenComplaintsView");
  const filterSelect = document.getElementById("filterWardenComplaintStatus");
  if (filterSelect) {
    filterSelect.value = status;
  }
  const user = getCurrentUser();
  const block = (user && user.assignedHostel) || "A";
  loadWardenComplaints(block, status);
}

async function updateWardenComplaintStatus(id, newStatus) {
  try {
    const res = await fetch(`${API_BASE}/warden/complaints/${id}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to update status");

    showToast(`Status updated to ${newStatus}`, "success");

    const user = getCurrentUser();
    if (user) {
      await loadWardenComplaints(user.assignedHostel);
      await loadWardenStats(user.assignedHostel);
    }
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function loadWardenStudents(block) {
  try {
    const res = await fetch(`${API_BASE}/students?hostelBlock=${encodeURIComponent(block)}`);
    const students = await res.json();
    const tbody = document.getElementById("wardenStudentsTableBody");
    if (!tbody) return;

    if (students.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-state">No students found in Block ${escapeHtml(block)}.</td></tr>`;
      return;
    }

    tbody.innerHTML = students
      .map(
        (s) => `
      <tr>
        <td><strong>#${s.studentId}</strong></td>
        <td><strong>${escapeHtml(s.name)}</strong></td>
        <td>${escapeHtml(s.email)}</td>
        <td>${escapeHtml(s.phone || "-")}</td>
        <td>Room ${escapeHtml(s.roomNumber)}</td>
        <td>${escapeHtml(s.department || "-")} (${escapeHtml(s.year || "-")})</td>
      </tr>
    `
      )
      .join("");
  } catch (e) {
    console.error(e);
  }
}
