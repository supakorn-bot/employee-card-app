const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxSzm0r9jC59FV_h6Q6yF2EZ8UyPeDS7LRKxkXuxS6gyOMF87U3iRiERW3OO8VkdWOD/exec";

const elements = {
  recordId: document.getElementById("recordId"),
  templateType: document.getElementById("templateType"),
  empId: document.getElementById("empId"),
  thaiName: document.getElementById("thaiName"),
  engName: document.getElementById("engName"),
  position: document.getElementById("position"),
  department: document.getElementById("department"),
  issueDate: document.getElementById("issueDate"),
  expiryDate: document.getElementById("expiryDate"),
  status: document.getElementById("status"),
  note: document.getElementById("note"),
  photoInput: document.getElementById("photoInput"),
  card: document.getElementById("card"),
  frontContent: document.getElementById("frontContent"),
  backContent: document.getElementById("backContent"),
  photoPreview: document.getElementById("photoPreview"),
  showThaiName: document.getElementById("showThaiName"),
  showEngName: document.getElementById("showEngName"),
  showPosition: document.getElementById("showPosition"),
  showDepartment: document.getElementById("showDepartment"),
  showEmpId: document.getElementById("showEmpId"),
  saveStatus: document.getElementById("saveStatus"),
  searchInput: document.getElementById("searchInput"),
  searchStatus: document.getElementById("searchStatus"),
  employeeTableBody: document.getElementById("employeeTableBody"),
  totalEmployees: document.getElementById("totalEmployees"),
  activeEmployees: document.getElementById("activeEmployees"),
  resultCount: document.getElementById("resultCount"),
  formModeText: document.getElementById("formModeText"),
  editingBadge: document.getElementById("editingBadge"),
  cancelEditButton: document.getElementById("cancelEditButton"),
  saveButton: document.getElementById("saveButton")
};

let employeePhotoData = "";
let currentPhotoUrl = "";
let employeesCache = [];



function updateCard() {
  const type = elements.templateType.value;
  elements.card.className = `card ${type}`;

  elements.showThaiName.textContent =
    elements.thaiName.value.trim() || "ชื่อพนักงาน";
  elements.showEngName.textContent =
    elements.engName.value.trim() || "Employee Name";
  elements.showPosition.textContent =
    elements.position.value.trim() || "ตำแหน่ง";
  elements.showDepartment.textContent =
    elements.department.value.trim() || "แผนก";
  elements.showEmpId.textContent =
    elements.empId.value.trim() || "-";

  const isFront = type.startsWith("front");
  elements.frontContent.classList.toggle("hidden", !isFront);
  elements.backContent.classList.toggle(
    "hidden",
    isFront || type === "back-black"
  );
}

function setStatus(target, message, type = "") {
  target.textContent = message;
  target.className =
    target === elements.saveStatus ? "save-status" : "status-text";

  if (type) target.classList.add(type);
}

function setLoading(isLoading) {
  elements.saveButton.disabled = isLoading;
  elements.saveButton.textContent = isLoading
    ? "กำลังบันทึก..."
    : elements.recordId.value
      ? "อัปเดตข้อมูล"
      : "บันทึก Google Sheet";
}

function collectFormData() {
  const now = new Date().toISOString();

  return {
    action: elements.recordId.value ? "update" : "create",
    id: elements.recordId.value || `EMP-${Date.now()}`,
    createdAt: now,
    updatedAt: now,
    thaiName: elements.thaiName.value.trim(),
    engName: elements.engName.value.trim(),
    position: elements.position.value.trim(),
    department: elements.department.value.trim(),
    employeeId: elements.empId.value.trim(),
    templateType: elements.templateType.value,
    issueDate: elements.issueDate.value,
    expiryDate: elements.expiryDate.value,
    photoUrl: currentPhotoUrl,
    photoData: employeePhotoData,
    status: elements.status.value,
    note: elements.note.value.trim()
  };
}

function validateEmployee(data) {
  if (!data.employeeId) {
    elements.empId.focus();
    return "กรุณากรอกรหัสพนักงาน";
  }

  if (!data.thaiName) {
    elements.thaiName.focus();
    return "กรุณากรอกชื่อภาษาไทย";
  }

  return "";
}

async function saveEmployee() {
  updateCard();

  const data = collectFormData();
  const errorMessage = validateEmployee(data);

  if (errorMessage) {
    setStatus(elements.saveStatus, errorMessage, "error");
    return;
  }

  setLoading(true);
  setStatus(elements.saveStatus, "กำลังส่งข้อมูลไป Google Sheet...");

  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || "บันทึกข้อมูลไม่สำเร็จ");
    }

    setStatus(
      elements.saveStatus,
      data.action === "update"
        ? "อัปเดตข้อมูลเรียบร้อย"
        : "บันทึกข้อมูลเรียบร้อย",
      "success"
    );

    await loadEmployees("");
    resetForm(false);
  } catch (error) {
    console.error(error);
    setStatus(
      elements.saveStatus,
      `บันทึกไม่สำเร็จ: ${error.message}`,
      "error"
    );
  } finally {
    setLoading(false);
  }
}

async function loadEmployees(keyword = "") {
  setStatus(elements.searchStatus, "กำลังโหลดข้อมูล...");

  try {
    const url = new URL(GOOGLE_SCRIPT_URL);

    if (keyword.trim()) {
      url.searchParams.set("q", keyword.trim());
    }

    url.searchParams.set("_", Date.now().toString());

    const response = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store"
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || "โหลดข้อมูลไม่สำเร็จ");
    }

    employeesCache = Array.isArray(result.data) ? result.data : [];
    renderEmployeeTable(employeesCache);
    updateDashboard(
      Number(result.total ?? employeesCache.length),
      employeesCache
    );

    setStatus(
      elements.searchStatus,
      `พบ ${employeesCache.length} รายการ`,
      "success"
    );
  } catch (error) {
    console.error(error);
    setStatus(
      elements.searchStatus,
      `โหลดข้อมูลไม่สำเร็จ: ${error.message}`,
      "error"
    );
  }
}

function renderEmployeeTable(employees) {
  elements.employeeTableBody.innerHTML = "";

  if (!employees.length) {
    elements.employeeTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-cell">ไม่พบข้อมูลพนักงาน</td>
      </tr>
    `;
    return;
  }

  employees.forEach((employee) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${escapeHtml(employee.employeeId || "-")}</td>
      <td>${escapeHtml(employee.thaiName || "-")}</td>
      <td>${escapeHtml(employee.position || "-")}</td>
      <td>${escapeHtml(employee.department || "-")}</td>
      <td>${escapeHtml(employee.status || "ACTIVE")}</td>
      <td>
        <button type="button" class="table-action edit">แก้ไข</button>
        <button type="button" class="table-action print">พิมพ์</button>
      </td>
    `;

    row.querySelector(".edit").addEventListener("click", () => {
      fillForm(employee);
      document.querySelector(".workspace").scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });

    row.querySelector(".print").addEventListener("click", () => {
      fillForm(employee);
      updateCard();
      setTimeout(() => window.print(), 150);
    });

    elements.employeeTableBody.appendChild(row);
  });
}

function updateDashboard(total, employees) {
  const activeCount = employees.filter(
    (employee) =>
      String(employee.status || "ACTIVE").toUpperCase() === "ACTIVE"
  ).length;

  elements.totalEmployees.textContent = total;
  elements.activeEmployees.textContent = activeCount;
  elements.resultCount.textContent = employees.length;
}


function normalizePhotoUrl(url) {
  if (!url) return "";

  const value = String(url).trim();

  // รูปแบบ Base64 เดิม
  if (value.startsWith("data:image/")) {
    return value;
  }

  // ดึง File ID จาก Google Drive URL
  const patterns = [
    /[?&]id=([^&]+)/,
    /\/file\/d\/([^/]+)/,
    /\/d\/([^/]+)/
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);

    if (match && match[1]) {
      return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
    }
  }

  return value;
}



function fillForm(employee) {
  elements.recordId.value = employee.id || "";
  elements.empId.value = employee.employeeId || "";
  elements.thaiName.value = employee.thaiName || "";
  elements.engName.value = employee.engName || "";
  elements.position.value = employee.position || "";
  elements.department.value = employee.department || "";
  elements.templateType.value = employee.templateType || "front-white";
  elements.issueDate.value = normalizeDate(employee.issueDate);
  elements.expiryDate.value = normalizeDate(employee.expiryDate);
  elements.status.value = employee.status || "ACTIVE";
  elements.note.value = employee.note || "";

  currentPhotoUrl = employee.photoUrl || "";
employeePhotoData = "";

const displayPhotoUrl = normalizePhotoUrl(currentPhotoUrl);

if (displayPhotoUrl) {
  elements.photoPreview.src = displayPhotoUrl;

  elements.photoPreview.onerror = function () {
    console.error("โหลดรูปไม่สำเร็จ:", displayPhotoUrl);
    elements.photoPreview.removeAttribute("src");
    elements.photoPreview.alt = "ไม่สามารถโหลดรูปจาก Google Drive";
  };
} else {
  elements.photoPreview.removeAttribute("src");
}

  elements.formModeText.textContent =
    `กำลังแก้ไขรหัส ${employee.employeeId || ""}`;
  elements.editingBadge.classList.remove("hidden");
  elements.cancelEditButton.classList.remove("hidden");
  elements.saveButton.textContent = "อัปเดตข้อมูล";

  updateCard();
}

function resetForm(clearStatus = true) {
  elements.recordId.value = "";
  elements.empId.value = "";
  elements.thaiName.value = "";
  elements.engName.value = "";
  elements.position.value = "";
  elements.department.value = "";
  elements.issueDate.value = "";
  elements.expiryDate.value = "";
  elements.status.value = "ACTIVE";
  elements.note.value = "";
  elements.templateType.value = "front-white";
  elements.photoInput.value = "";

  employeePhotoData = "";
  currentPhotoUrl = "";
  elements.photoPreview.removeAttribute("src");

  elements.formModeText.textContent = "โหมดสร้างรายการใหม่";
  elements.editingBadge.classList.add("hidden");
  elements.cancelEditButton.classList.add("hidden");
  elements.saveButton.textContent = "บันทึก Google Sheet";

  if (clearStatus) {
    setStatus(elements.saveStatus, "");
  }

  updateCard();
}

function normalizeDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

elements.photoInput.addEventListener("change", () => {
  const file = elements.photoInput.files[0];

  if (!file) return;

  if (!file.type.startsWith("image/")) {
    alert("กรุณาเลือกไฟล์รูปภาพ");
    elements.photoInput.value = "";
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    alert("รูปต้องมีขนาดไม่เกิน 5 MB");
    elements.photoInput.value = "";
    return;
  }

  const reader = new FileReader();

  reader.onload = (event) => {
    employeePhotoData = event.target.result;
    currentPhotoUrl = "";
    elements.photoPreview.src = employeePhotoData;
  };

  reader.onerror = () => {
    alert("ไม่สามารถอ่านไฟล์รูปภาพได้");
  };

  reader.readAsDataURL(file);
});

[
  elements.templateType,
  elements.empId,
  elements.thaiName,
  elements.engName,
  elements.position,
  elements.department
].forEach((element) => {
  element.addEventListener("input", updateCard);
  element.addEventListener("change", updateCard);
});

document
  .getElementById("previewButton")
  .addEventListener("click", updateCard);

document
  .getElementById("saveButton")
  .addEventListener("click", saveEmployee);

document
  .getElementById("printButton")
  .addEventListener("click", () => {
    updateCard();
    window.print();
  });

document
  .getElementById("searchButton")
  .addEventListener("click", () => {
    loadEmployees(elements.searchInput.value);
  });

document
  .getElementById("showAllButton")
  .addEventListener("click", () => {
    elements.searchInput.value = "";
    loadEmployees("");
  });

document
  .getElementById("newButton")
  .addEventListener("click", () => resetForm());

elements.cancelEditButton.addEventListener(
  "click",
  () => resetForm()
);

elements.searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    loadEmployees(elements.searchInput.value);
  }
});

updateCard();
loadEmployees("");
