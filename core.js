const STORAGE_KEY = "cafe_manager_full_v1";

const defaultData = {
  reports: {},
  expenses: [],
  adminExpenses: [],
  debtTransactions: [],
  employees: [],
  categories: {
    expenses: [],
    adminExpenses: [],
    customers: []
  },
  recent: {
    expenses: [],
    adminExpenses: [],
    customers: []
  }
};


// Tạo biến toàn cục DUY NHẤT trên window
window.AppData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || defaultData;

// Tạo alias appData để code cũ vẫn chạy (tham chiếu đến cùng object)
var appData = window.AppData;

// Đảm bảo window.appData cũng trỏ đến cùng object (để firebase-sync dùng)
window.appData = window.AppData;

let editingExpenseId = null;
let editingDebtId = null;
let editingAdminExpenseId = null; // THÊM MỚI

let toastTimeout;
const toast = document.getElementById("toast");

function showToast(message){
  clearTimeout(toastTimeout);
  toast.innerText = message;
  toast.classList.add("show");
  toastTimeout = setTimeout(()=>{
    toast.classList.remove("show");
  },1200);
}
// ========== THÊM MỚI: HÀM TÍNH DOANH THU ==========

// Tính tổng doanh thu của một ngày (Tiền mặt + Chuyển khoản)
function calculateRevenueTotal(date) {
  if (!appData || !appData.reports) return 0;
  const report = appData.reports[date];
  if (!report) return 0;
  
  const cash = parseMoney(report.cash || 0);
  const bank = parseMoney(report.bank || 0);
  return cash + bank;
}

// Tính tổng doanh thu trong một khoảng thời gian (dùng cho Manager)
function calculateRevenueInRange(range) {
  let totalRevenue = 0;
  if (!appData || !appData.reports) return 0;
  
  Object.entries(appData.reports).forEach(([date, report]) => {
    if (isDateInRange(date, range)) {
      const cash = parseMoney(report.cash || 0);
      const bank = parseMoney(report.bank || 0);
      totalRevenue += (cash + bank);
    }
  });
  return totalRevenue;
}

// Export các hàm mới ra window
window.calculateRevenueTotal = calculateRevenueTotal;
window.calculateRevenueInRange = calculateRevenueInRange;
function saveData(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
}

function createId(prefix="id"){
  return prefix + "_" + Date.now();
}

function parseMoney(value){
  if (!value) return 0;
  return Number(String(value).replace(/[^0-9]/g, "")) || 0;
}

function formatMoney(value){
  return Number(value || 0).toLocaleString("vi-VN") + "đ";
}

function formatInputMoney(input){
  input.addEventListener("input",()=>{
    let value = parseMoney(input.value);
    if(input.value.trim() === ""){
      input.value = "";
    }else{
      input.value = value.toLocaleString("vi-VN");
    }
  });
}

function getToday(){
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCurrentDate(){
  return reportDate ? reportDate.value : getToday();
}

function formatDisplayDate(dateString){
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
}

// Tính tổng chi phí nhân viên
function calculateExpenseTotal(date){
  if (!appData || !appData.expenses) return 0;
  return appData.expenses
    .filter(x => x.date === date && !x.deleted)
    .reduce((a,b)=>a + (b.amount || 0), 0);
}

// THÊM MỚI: Tính tổng chi phí quản lý
function calculateAdminExpenseTotal(date){
  if (!appData || !appData.adminExpenses) return 0;
  return appData.adminExpenses
    .filter(x => x.date === date && !x.deleted)
    .reduce((a,b)=>a + (b.amount || 0), 0);
}

// Tính tổng công nợ phát sinh
function calculateDebtTotal(date){
  if (!appData || !appData.debtTransactions) return 0;
  return appData.debtTransactions
    .filter(x => x.date === date && x.type === "debt_add" && !x.deleted)
    .reduce((a,b)=>a + (b.amount || 0), 0);
}

// Tính công nợ của khách hàng
function calculateCustomerDebt(customer){
  if (!appData || !appData.debtTransactions) return 0;
  let balance = 0;
  appData.debtTransactions
    .filter(x => x.customer === customer && !x.deleted)
    .forEach(item=>{
      if(item.type === "debt_add"){
        balance += item.amount || 0;
      }else{
        balance -= item.amount || 0;
      }
    });
  return balance;
}

// Tính tổng công nợ tất cả khách hàng
function calculateTotalDebtAll() {
  if (!appData || !appData.debtTransactions) return 0;
  
  const allCustomers = new Set();
  if (appData.categories?.customers) {
    appData.categories.customers.forEach(c => allCustomers.add(c));
  }
  if (appData.recent?.customers) {
    appData.recent.customers.forEach(c => allCustomers.add(c));
  }
  appData.debtTransactions.forEach(t => {
    if (!t.deleted && t.customer) allCustomers.add(t.customer);
  });
  
  let total = 0;
  allCustomers.forEach(customer => {
    total += calculateCustomerDebt(customer);
  });
  return total;
}

function getReport(date){
  if (!appData || !appData.reports) {
    return { bank:0, cash:0, reserve:0, status:"draft" };
  }
  if(!appData.reports[date]){
    appData.reports[date] = {
      bank:0,
      cash:0,
      reserve:0,
      status:"draft"
    };
  }
  return appData.reports[date];
}
// Tính tổng doanh thu trong kỳ (lấy từ reports.revenue)
function calculateRevenueInRange(range) {
  let total = 0;
  Object.entries(appData.reports).forEach(([date, report]) => {
    if (isDateInRange(date, range)) {
      total += parseMoney(report.revenue || 0);
    }
  });
  return total;
}

// Tính tổng Grab trong kỳ
function calculateGrabInRange(range) {
  let total = 0;
  Object.entries(appData.reports).forEach(([date, report]) => {
    if (isDateInRange(date, range)) {
      total += parseMoney(report.grab || 0);
    }
  });
  return total;
}

// Lấy chi tiết doanh thu theo ngày
function getRevenueDetails(range) {
  const details = [];
  Object.entries(appData.reports).forEach(([date, report]) => {
    if (isDateInRange(date, range) && (report.revenue || 0) > 0) {
      details.push({ date, amount: parseMoney(report.revenue) });
    }
  });
  return details.sort((a,b) => b.date.localeCompare(a.date));
}

// Lấy chi tiết Grab theo ngày
function getGrabDetails(range) {
  const details = [];
  Object.entries(appData.reports).forEach(([date, report]) => {
    if (isDateInRange(date, range) && (report.grab || 0) > 0) {
      details.push({ date, amount: parseMoney(report.grab) });
    }
  });
  return details.sort((a,b) => b.date.localeCompare(a.date));
}
// ========== ĐẢM BẢO CẤU TRÚC DỮ LIỆU (CÓ EMPLOYEES HISTORY) ==========
function ensureAppDataStructure() {
  if (!appData) {
    appData = {
      reports: {},
      expenses: [],
      adminExpenses: [],
      debtTransactions: [],
      employees: [],
      categories: { expenses: [], adminExpenses: [], customers: [] },
      recent: { expenses: [], adminExpenses: [], customers: [] }
    };
  }
  
  // Đảm bảo employees tồn tại
  if (!appData.employees) appData.employees = [];
  
  // Đảm bảo mỗi employee có cấu trúc đầy đủ (history + reward)
  if (appData.employees && Array.isArray(appData.employees)) {
    appData.employees.forEach(emp => {
      if (!emp.overtimeHistory) emp.overtimeHistory = {};
      if (!emp.absentHistory) emp.absentHistory = {};
      if (!emp.salaryPerDay) emp.salaryPerDay = 200000;
      if (emp.workDays === undefined) emp.workDays = 0;
      if (emp.overtimeDays === undefined) emp.overtimeDays = 0;
      if (emp.absentDays === undefined) emp.absentDays = 0;
      
      // THÊM MỚI: Cấu trúc thưởng doanh thu
      if (emp.rewardEnabled === undefined) emp.rewardEnabled = false;
      if (!emp.dailyBonus) emp.dailyBonus = {};
    });
  }
  
  // Đảm bảo các mảng chính
  if (!appData.reports) appData.reports = {};
  if (!appData.expenses) appData.expenses = [];
  if (!appData.adminExpenses) appData.adminExpenses = [];
  if (!appData.debtTransactions) appData.debtTransactions = [];
  
  // Đảm bảo categories
  if (!appData.categories) appData.categories = { expenses: [], adminExpenses: [], customers: [] };
  if (!appData.categories.expenses) appData.categories.expenses = [];
  if (!appData.categories.adminExpenses) appData.categories.adminExpenses = [];
  if (!appData.categories.customers) appData.categories.customers = [];
  
  // Đảm bảo recent
  if (!appData.recent) appData.recent = { expenses: [], adminExpenses: [], customers: [] };
  if (!appData.recent.expenses) appData.recent.expenses = [];
  if (!appData.recent.adminExpenses) appData.recent.adminExpenses = [];
  if (!appData.recent.customers) appData.recent.customers = [];
  
  // Đảm bảo mỗi report có revenue và grab
  Object.keys(appData.reports).forEach(date => {
    const report = appData.reports[date];
    if (report.revenue === undefined) report.revenue = 0;
    if (report.grab === undefined) report.grab = 0;
  });
}
ensureAppDataStructure();


// ========== CẢI TIẾN POPUP - ĐÓNG KHI CLICK RA NGOÀI HOẶC ESC ==========
function openPopup(id){
  const popup = document.getElementById(id);
  if(popup) {
    popup.classList.remove("hidden");
    
    // Thêm sự kiện click ra ngoài để đóng popup
    setTimeout(() => {
      const handleClickOutside = (e) => {
        // Nếu click vào chính popup background
        if (e.target === popup) {
          closePopup(id);
          document.removeEventListener('click', handleClickOutside);
        }
      };
      popup.addEventListener('click', handleClickOutside);
      
      // Lưu để cleanup sau
      popup._clickOutsideHandler = handleClickOutside;
    }, 0);
  }
}

function closePopup(id){
  const popup = document.getElementById(id);
  if(popup) {
    popup.classList.add("hidden");
    
    // Dọn dẹp sự kiện
    if(popup._clickOutsideHandler) {
      popup.removeEventListener('click', popup._clickOutsideHandler);
      delete popup._clickOutsideHandler;
    }
  }
}

// Thêm sự kiện ESC để đóng popup đang mở
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    // Tìm tất cả popup đang mở
    const openPopups = document.querySelectorAll('.popup:not(.hidden)');
    openPopups.forEach(popup => {
      closePopup(popup.id);
    });
  }
});

function addCategory(type,name){
  if(!name) return;
  if(!appData.categories[type].includes(name)){
    appData.categories[type].push(name);
  }
}

function addRecent(type,name){
  appData.recent[type] = appData.recent[type].filter(x => x !== name);
  appData.recent[type].unshift(name);
  appData.recent[type] = appData.recent[type].slice(0,5);
}

function renderDropdown(input, dropdown, list){
  const keyword = input.value.trim().toLowerCase();
  const unique = [...new Set(list)];
  const sorted = unique.sort((a,b)=>{
    const recentA = appData.recent.expenses.indexOf(a);
    const recentB = appData.recent.expenses.indexOf(b);
    if(recentA === -1) return 1;
    if(recentB === -1) return -1;
    return recentA - recentB;
  });
  let html = "";
  sorted
    .filter(x => x.toLowerCase().includes(keyword))
    .slice(0,20)
    .forEach(item=>{
      html += `<div class="dropdown-item">${item}</div>`;
    });
  if(keyword && !sorted.includes(input.value.trim())){
    html += `<div class="dropdown-item">+ Tạo mới "${input.value.trim()}"</div>`;
  }
  dropdown.innerHTML = html;
}

function getPeriodRange(dateString){
  const d = new Date(dateString);
  let start, end;
  if(d.getDate() >= 20){
    start = new Date(d.getFullYear(), d.getMonth(), 20);
    end = new Date(d.getFullYear(), d.getMonth()+1, 19);
  }else{
    start = new Date(d.getFullYear(), d.getMonth()-1, 20);
    end = new Date(d.getFullYear(), d.getMonth(), 19);
  }
  return { start, end };
}

function isInPeriod(date,period){
  const d = new Date(date);
  return d >= period.start && d <= period.end;
}

// ========== KIỂM TRA CÓ ĐƯỢC SỬA NGÀY NÀY KHÔNG ==========
function isEditable(date) {
  const today = getToday();
  const isAdmin = window.isAdminSync ? window.isAdminSync() : false;
  
  // Admin: toàn quyền trên mọi ngày
  if (isAdmin) return true;
  
  // Nhân viên: chỉ được sửa ngày hôm nay
  if (date === today) return true;
  
  // Nhân viên: không được sửa ngày cũ (kể cả draft hay completed)
  return false;
}

function isAddable(date){
  const today = getToday();
  if(date === today) return true;
  const report = getReport(date);
  
  if (report.status === "completed") {
    return window.isAdminSync ? window.isAdminSync() : false;
  }
  return false;
}

// ========== HÀM RENDER TOÀN BỘ UI ==========
function renderAllUI() {
  console.log("🎨 renderAllUI() - Đang render toàn bộ giao diện...");
  
  const currentDate = getCurrentDate();
  const today = getToday();
  
  if (typeof loadTodayData === 'function') {
    loadTodayData();
  }
  
  if (typeof renderCustomerDebtList === 'function') {
    renderCustomerDebtList();
  }
  
  const totalDebtElement = document.getElementById("totalDebtAll");
  if (totalDebtElement) {
    totalDebtElement.innerText = formatMoney(calculateTotalDebtAll());
  }
  
  const activeTab = document.querySelector('.tab-content.active')?.id;
  if (activeTab === 'managerTab') {
    if (typeof renderManagerDashboard === 'function') {
      renderManagerDashboard();
    }
    if (typeof renderAdminExpenseStats === 'function') {
      const range = typeof getDateRange === 'function' ? getDateRange() : null;
      if (range) renderAdminExpenseStats(range);
    }
  }
  
  if (typeof renderRecentExpenses === 'function') {
    renderRecentExpenses();
  }
  if (typeof renderRecentCustomers === 'function') {
    renderRecentCustomers();
  }
  if (typeof renderRecentAdminExpenses === 'function') {
    renderRecentAdminExpenses();
  }
  
  const report = appData?.reports?.[currentDate];
  
  const expenseTotalEl = document.getElementById("expenseTotal");
  if (expenseTotalEl) {
    expenseTotalEl.innerText = formatMoney(calculateExpenseTotal(currentDate));
  }
  
  const debtTotalEl = document.getElementById("debtTotal");
  if (debtTotalEl) {
    debtTotalEl.innerText = formatMoney(calculateDebtTotal(currentDate));
  }
  
  const dayStatus = document.getElementById("dayStatus");
  if (dayStatus && report) {
    dayStatus.innerHTML = report.status === "completed" ? "🟢 Đã chốt" : "🟡 Đang nhập";
  }
  
  const bankInput = document.getElementById("bankInput");
  const cashInput = document.getElementById("cashInput");
  const reserveInput = document.getElementById("reserveInput");
  
  if (bankInput && report) bankInput.value = (report.bank || 0).toLocaleString("vi-VN");
  if (cashInput && report) cashInput.value = (report.cash || 0).toLocaleString("vi-VN");
  if (reserveInput && report) reserveInput.value = (report.reserve || 0).toLocaleString("vi-VN");
  
  console.log("✅ renderAllUI() - Hoàn tất!");
}

function refreshUIData() {
  console.log("🔄 refreshUIData() - Cập nhật dữ liệu...");
  
  if (typeof loadTodayData === 'function') {
    loadTodayData();
  }
  if (typeof renderCustomerDebtList === 'function') {
    renderCustomerDebtList();
  }
  const totalDebtElement = document.getElementById("totalDebtAll");
  if (totalDebtElement) {
    totalDebtElement.innerText = formatMoney(calculateTotalDebtAll());
  }
}

// ========== BLOCK MOBILE ZOOM ==========
document.addEventListener("gesturestart", function(e){
  e.preventDefault();
});

let lastTouchEnd = 0;
document.addEventListener("touchend", function(e){
  const now = Date.now();
  if(now - lastTouchEnd <= 300){
    e.preventDefault();
  }
  lastTouchEnd = now;
}, { passive: false });

function initDefaultData() {
  if (!appData || Object.keys(appData).length === 0) {
    appData = {
      reports: {},
      expenses: [],
      adminExpenses: [],
      debtTransactions: [],
      categories: { expenses: [], adminExpenses: [], customers: [] },
      recent: { expenses: [], adminExpenses: [], customers: [], adminExpenseQty: [] }
    };
    saveData();
  }
  ensureAppDataStructure();
}

initDefaultData();
// Kích hoạt bàn phím số cho tất cả input tiền
function setupNumericKeyboard() {
    const selectors = [
        '#cashInput', '#bankInput', '#reserveInput',
        '#expenseAmount', '#debtAmount', '#adminExpenseAmount',
        '#paymentAmount', '#grabInput', '#revenueInput',
    ];
    
    selectors.forEach(selector => {
        const input = document.querySelector(selector);
        if (input) {
            input.setAttribute('inputmode', 'numeric');
            input.setAttribute('pattern', '[0-9]*');
            
            // Ngăn nhập chữ (tùy chọn)
            input.addEventListener('keypress', function(e) {
                const char = String.fromCharCode(e.which);
                if (!/[0-9]/.test(char)) {
                    e.preventDefault();
                }
            });
        }
    });
}
// ========== FORMAT TIỀN (KHÔNG NHÂN CHIA) ==========
// ========== FORMAT TIỀN (GIỮ NGUYÊN) ==========
function formatMoney(value) {
  if (value === undefined || value === null) return "0đ";
  return Number(value).toLocaleString("vi-VN") + "đ";
}

// Format số để hiển thị trong input (không có "đ")
function formatNumberForInput(value) {
  if (value === undefined || value === null) return "";
  return Number(value).toLocaleString("vi-VN");
}

function parseMoney(value) {
  if (!value) return 0;
  
  // Xóa tất cả ký tự không phải số
  let clean = String(value).replace(/[^0-9]/g, '');
  if (clean === '') return 0;
  
  let number = parseInt(clean, 10);
  
  // QUY TẮC NHANH: Nếu số nhập vào <= 9999 (tức từ 1 đến 9999), coi là nghìn => nhân với 1000
  // Ví dụ: 1000 -> 1.000.000, 500 -> 500.000, 10 -> 10.000
  // Bạn có thể tùy chỉnh ngưỡng theo nhu cầu (ví dụ <= 999)
  if (number <= 9999) {
    number = number * 1000;
  }
  
  return number;
}


// ========== CÀI ĐẶT PROMPT CHO CÁC Ô SỐ LIỆU CHÍNH ==========
function setupPromptInputs() {
  // Chỉ xử lý các ô số liệu chính trên giao diện báo cáo
  const mainNumberFields = [
    { id: "cashInput", title: "💵 Tiền mặt", field: "cash" },
    { id: "bankInput", title: "🏦 Chuyển khoản", field: "bank" },
    { id: "reserveInput", title: "📦 Giao quỹ", field: "reserve" },
    { id: "revenueInput", title: "💰 Doanh thu", field: "revenue" },
    { id: "grabInput", title: "🚕 Grab", field: "grab" }
  ];
  
  mainNumberFields.forEach(({ id, title, field }) => {
    const input = document.getElementById(id);
    if (!input) return;
    
    // Xóa event cũ bằng clone
    const newInput = input.cloneNode(true);
    input.parentNode.replaceChild(newInput, input);
    
    // Set làm readonly và style
    newInput.readOnly = true;
    newInput.style.cursor = "pointer";
    newInput.style.backgroundColor = "var(--bg-tertiary)";
    newInput.style.pointerEvents = "auto";
    
    // Gán sự kiện click
    newInput.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const currentDate = getCurrentDate();
      const report = getReport(currentDate);
      const currentValue = report[field] || 0;
      
      // Hiển thị prompt
      let inputValue = prompt(
        `${title} hiện tại: ${formatMoney(currentValue)}`,
        currentValue.toString()
      );
      
      // User cancel hoặc bỏ trống
      if (inputValue === null || inputValue === undefined || inputValue === "") {
        return;
      }
      
      // Parse số
      let newValue = parseMoney(inputValue);
      
      // Kiểm tra số âm
      if (newValue < 0) {
        alert("⚠️ Số tiền không thể âm!");
        return;
      }
      
      // Nếu giá trị không đổi thì thôi
      if (newValue === currentValue) {
        if (typeof showToast === 'function') showToast(`ℹ️ Giá trị không thay đổi`);
        return;
      }
      
      // Cập nhật report
      report[field] = newValue;
      
      // Cập nhật UI
      newInput.value = formatNumberForInput(newValue);
      
      // Lưu và đồng bộ
      saveData();
      
      // Cập nhật các UI liên quan
      if (typeof renderAllUI === 'function') {
        renderAllUI();
      } else {
        // Fallback: cập nhật thủ công
        const expenseTotalEl = document.getElementById("expenseTotal");
        const debtTotalEl = document.getElementById("debtTotal");
        if (expenseTotalEl) expenseTotalEl.innerText = formatMoney(calculateExpenseTotal(currentDate));
        if (debtTotalEl) debtTotalEl.innerText = formatMoney(calculateDebtTotal(currentDate));
        
        if (typeof updateTotalDebtDisplay === 'function') updateTotalDebtDisplay();
        if (typeof renderCustomerDebtList === 'function') renderCustomerDebtList();
        if (typeof renderManagerDashboard === 'function') renderManagerDashboard();
      }
      
      // Thông báo
      if (typeof showToast === 'function') {
        showToast(`✓ Đã cập nhật ${title}: ${formatMoney(newValue)}`);
      }
    };
  });
}
// ========== CÀI ĐẶT FORMAT CHO INPUT TRONG POPUP ==========
function setupMoneyInputs() {
  const popupMoneyInputs = [
    'expenseAmount', 'debtAmount', 'adminExpenseAmount', 'paymentAmount'
  ];
  
  popupMoneyInputs.forEach(id => {
    const input = document.getElementById(id);
    if (!input) return;
    
    // LƯU LẠI GIÁ TRỊ HIỆN TẠI
    const currentValue = input.value;
    
    // Clone và thay thế
    const newInput = input.cloneNode(true);
    input.parentNode.replaceChild(newInput, input);
    
    // Khôi phục giá trị
    newInput.value = currentValue;
    
    // CẬP NHẬT BIẾN TOÀN CỤC (quan trọng!)
    if (id === 'expenseAmount') window.expenseAmount = newInput;
    if (id === 'debtAmount') window.debtAmount = newInput;
    if (id === 'adminExpenseAmount') window.adminExpenseAmount = newInput;
    if (id === 'paymentAmount') window.paymentAmount = newInput;
    
    // Khi blur: format số
    newInput.addEventListener('blur', function() {
      let num = parseMoney(this.value);
      if (num > 0) {
        this.value = num.toLocaleString('vi-VN');
      } else {
        this.value = '';
      }
    });
    
    // Khi focus: bỏ dấu phẩy để dễ nhập
    newInput.addEventListener('focus', function() {
      let num = parseMoney(this.value);
      if (num > 0) {
        this.value = num.toString();
      } else {
        this.value = '';
      }
    });
    
    // Chỉ cho nhập số
    newInput.addEventListener('keypress', function(e) {
      if (!/[0-9]/.test(e.key)) {
        e.preventDefault();
      }
    });
  });
}

// Gọi sau khi DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setupPromptInputs();
    setupMoneyInputs();
  });
} else {
  setupPromptInputs();
  setupMoneyInputs();
}
// Thêm vào core.js, sau hàm getToday()
function addDays(dateStr, days) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
window.renderAllUI = renderAllUI;
window.refreshUIData = refreshUIData;
window.calculateTotalDebtAll = calculateTotalDebtAll;
window.calculateAdminExpenseTotal = calculateAdminExpenseTotal;