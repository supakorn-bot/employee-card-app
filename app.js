const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzqWLozJR_d6HGy8zdrvGjfrm6D7yBAoIxJr_12KbpnvW2SW8PQPowXHlCLttzDb562Eg/exec";

const templateType = document.getElementById("templateType");

const thaiName = document.getElementById("thaiName");
const engName = document.getElementById("engName");
const position = document.getElementById("position");
const empId = document.getElementById("empId");
const photoInput = document.getElementById("photoInput");

const card = document.getElementById("card");
const frontContent = document.getElementById("frontContent");
const backContent = document.getElementById("backContent");

const showThaiName = document.getElementById("showThaiName");
const showEngName = document.getElementById("showEngName");
const showPosition = document.getElementById("showPosition");
const showEmpId = document.getElementById("showEmpId");
const photoPreview = document.getElementById("photoPreview");

let employeePhotoData = "";

/* ==============================
   อัปเดตข้อมูลบนหน้าบัตร
================================ */
function updateCard() {
  const type = templateType.value;

  card.className = "card " + type;

  showThaiName.textContent =
    thaiName.value.trim() || "ชื่อพนักงาน";

  showEngName.textContent =
    engName.value.trim() || "Employee Name";

  showPosition.textContent =
    position.value.trim() || "ตำแหน่ง";

  showEmpId.textContent =
    empId.value.trim() || "-";

  if (type.startsWith("front")) {
    frontContent.classList.remove("hidden");
    backContent.classList.add("hidden");
  } else {
    frontContent.classList.add("hidden");
    backContent.classList.remove("hidden");
  }

  if (type === "back-black") {
    backContent.classList.add("hidden");
  }
}

/* ==============================
   อ่านรูปพนักงาน
================================ */
photoInput.addEventListener("change", function () {
  const file = photoInput.files[0];

  if (!file) {
    employeePhotoData = "";
    photoPreview.removeAttribute("src");
    return;
  }

  if (!file.type.startsWith("image/")) {
    alert("กรุณาเลือกไฟล์รูปภาพ");
    photoInput.value = "";
    return;
  }

  const reader = new FileReader();

  reader.onload = function (event) {
    employeePhotoData = event.target.result;
    photoPreview.src = employeePhotoData;
  };

  reader.onerror = function () {
    alert("ไม่สามารถอ่านไฟล์รูปได้");
  };

  reader.readAsDataURL(file);
});

/* ==============================
   บันทึกข้อมูลลง Google Sheet
================================ */
async function saveEmployee() {
  const saveStatus = document.getElementById("saveStatus");

  const now = new Date();
  const employeeIdValue = empId.value.trim();

  const employeeData = {
    id: `EMP-${Date.now()}`,

    createdAt: now.toISOString(),

    updatedAt: now.toISOString(),

    thaiName: thaiName.value.trim(),

    engName: engName.value.trim(),

    position: position.value.trim(),

    department: "",

    employeeId: employeeIdValue,

    templateType: templateType.value,

    issueDate: "",

    expiryDate: "",

    photoUrl: employeePhotoData,

    status: "ACTIVE",

    note: ""
  };

  if (!employeeData.thaiName) {
    showSaveStatus(
      "กรุณากรอกชื่อภาษาไทย",
      "error"
    );

    thaiName.focus();
    return;
  }

  if (!employeeData.employeeId) {
    showSaveStatus(
      "กรุณากรอกรหัสพนักงาน",
      "error"
    );

    empId.focus();
    return;
  }

  updateCard();

  showSaveStatus(
    "กำลังบันทึกข้อมูล...",
    ""
  );

  try {
    const response = await fetch(
      GOOGLE_SCRIPT_URL,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "text/plain;charset=utf-8"
        },

        body: JSON.stringify(employeeData)
      }
    );

    const result = await response.json();

    if (!result.success) {
      throw new Error(
        result.message || "บันทึกไม่สำเร็จ"
      );
    }

    showSaveStatus(
      `บันทึกเรียบร้อย รหัส ${employeeData.employeeId}`,
      "success"
    );

  } catch (error) {
    console.error("Save employee error:", error);

    showSaveStatus(
      "บันทึกไม่สำเร็จ กรุณาตรวจสอบ Apps Script และสิทธิ์การเข้าถึง",
      "error"
    );
  }
}

/* ==============================
   แสดงสถานะการบันทึก
================================ */
function showSaveStatus(message, type) {
  const saveStatus =
    document.getElementById("saveStatus");

  if (!saveStatus) {
    alert(message);
    return;
  }

  saveStatus.textContent = message;
  saveStatus.className = "save-status";

  if (type) {
    saveStatus.classList.add(type);
  }
}

/* ==============================
   Event
================================ */
templateType.addEventListener(
  "change",
  updateCard
);

thaiName.addEventListener(
  "input",
  updateCard
);

engName.addEventListener(
  "input",
  updateCard
);

position.addEventListener(
  "input",
  updateCard
);

empId.addEventListener(
  "input",
  updateCard
);

updateCard();