// ========== DOM ELEMENTS (dùng var có kiểm tra) ==========
if(typeof periodLabel === 'undefined') var periodLabel = document.getElementById("periodLabel");
if(typeof managerBank === 'undefined') var managerBank = document.getElementById("managerBank");
if(typeof managerCash === 'undefined') var managerCash = document.getElementById("managerCash");
if(typeof managerExpense === 'undefined') var managerExpense = document.getElementById("managerExpense");
if(typeof managerDebt === 'undefined') var managerDebt = document.getElementById("managerDebt");
if(typeof managerAdminExpense === 'undefined') var managerAdminExpense = document.getElementById("managerAdminExpense");
if(typeof managerExpenseList === 'undefined') var managerExpenseList = document.getElementById("managerExpenseList");
if(typeof managerDebtList === 'undefined') var managerDebtList = document.getElementById("managerDebtList");

// Biến trạng thái
if(typeof currentViewMode === 'undefined') var currentViewMode = "period";
if(typeof currentPeriodDate === 'undefined') var currentPeriodDate = new Date();
if(typeof currentMonth === 'undefined') {
  const now = new Date();
  var currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
if(typeof currentDay === 'undefined') var currentDay = getToday();

// DOM elements cho bộ lọc
if(typeof viewModeBtns === 'undefined') var viewModeBtns = document.querySelectorAll(".view-mode-btn");
if(typeof periodPrevBtn === 'undefined') var periodPrevBtn = document.getElementById("periodPrevBtn");
if(typeof periodNextBtn === 'undefined') var periodNextBtn = document.getElementById("periodNextBtn");
if(typeof periodDisplay === 'undefined') var periodDisplay = document.getElementById("periodDisplay");
if(typeof datePickerWrapper === 'undefined') var datePickerWrapper = document.getElementById("datePickerWrapper");
if(typeof monthPickerWrapper === 'undefined') var monthPickerWrapper = document.getElementById("monthPickerWrapper");
if(typeof managerDatePicker === 'undefined') var managerDatePicker = document.getElementById("managerDatePicker");
if(typeof managerMonthPicker === 'undefined') var managerMonthPicker = document.getElementById("managerMonthPicker");
if(typeof statsTitle === 'undefined') var statsTitle = document.getElementById("statsTitle");
if(typeof exportExpenseBtn === 'undefined') var exportExpenseBtn = document.getElementById("exportExpenseBtn");
if(typeof exportDebtBtn === 'undefined') var exportDebtBtn = document.getElementById("exportDebtBtn");

// ========== TAB SWITCHING ==========
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".tab-btn").forEach(x => x.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(x => x.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
    
    const expenseFab = document.getElementById("expenseFab");
    const debtFab = document.getElementById("debtFab");
    const paymentFab = document.getElementById("paymentFab");
    const adminExpenseFab = document.getElementById("adminExpenseFab");
    
    const isAdminTab = btn.dataset.tab === "managerTab";
    if(expenseFab) expenseFab.classList.toggle('hidden', isAdminTab);
    if(debtFab) debtFab.classList.toggle('hidden', isAdminTab);
    if(paymentFab) paymentFab.classList.toggle('hidden', isAdminTab);
    if(adminExpenseFab) adminExpenseFab.classList.toggle('hidden', !isAdminTab);
    
    if(btn.dataset.tab === "managerTab") renderManagerDashboard();
  };
});

// ========== VIEW MODE ==========
const viewModeSelect = document.getElementById("viewModeSelect");

if(viewModeSelect){

  viewModeSelect.value = currentViewMode;

  viewModeSelect.onchange = () => {

    currentViewMode = viewModeSelect.value;

    if(datePickerWrapper){
      datePickerWrapper.classList.add("hidden");
    }

    if(monthPickerWrapper){
      monthPickerWrapper.classList.add("hidden");
    }

    if(currentViewMode === "day"){

      if(datePickerWrapper){
        datePickerWrapper.classList.remove("hidden");
      }

      if(managerDatePicker){
        managerDatePicker.value = currentDay;
      }

    }else if(currentViewMode === "month"){

      if(monthPickerWrapper){
        monthPickerWrapper.classList.remove("hidden");
      }

      if(managerMonthPicker){
        managerMonthPicker.value = currentMonth;
      }

    }

    renderManagerDashboard();
  };
}


// ========== NAVIGATION ==========
if(periodPrevBtn){

  periodPrevBtn.onclick = () => {

    if(currentViewMode === "period"){

      const newDate = new Date(currentPeriodDate);

      newDate.setMonth(
        newDate.getMonth() - 1
      );

      currentPeriodDate = newDate;

    }
    else if(currentViewMode === "month"){

      const [year, month] =
        currentMonth.split("-").map(Number);

      let newYear = year;
      let newMonth = month - 1;

      if(newMonth < 1){
        newMonth = 12;
        newYear--;
      }

      currentMonth =
        `${newYear}-${String(newMonth).padStart(2,"0")}`;

      if(managerMonthPicker){
        managerMonthPicker.value = currentMonth;
      }

    }
    else if(currentViewMode === "day"){

      const newDate = new Date(currentDay);

      newDate.setDate(
        newDate.getDate() - 1
      );

      currentDay =
        newDate.toISOString().split("T")[0];

      if(managerDatePicker){
        managerDatePicker.value = currentDay;
      }

    }

    renderManagerDashboard();
  };
}


if(periodNextBtn){

  periodNextBtn.onclick = () => {

    if(currentViewMode === "period"){

      const newDate = new Date(currentPeriodDate);

      newDate.setMonth(
        newDate.getMonth() + 1
      );

      currentPeriodDate = newDate;

    }
    else if(currentViewMode === "month"){

      const [year, month] =
        currentMonth.split("-").map(Number);

      let newYear = year;
      let newMonth = month + 1;

      if(newMonth > 12){
        newMonth = 1;
        newYear++;
      }

      currentMonth =
        `${newYear}-${String(newMonth).padStart(2,"0")}`;

      if(managerMonthPicker){
        managerMonthPicker.value = currentMonth;
      }

    }
    else if(currentViewMode === "day"){

      const newDate = new Date(currentDay);

      newDate.setDate(
        newDate.getDate() + 1
      );

      currentDay =
        newDate.toISOString().split("T")[0];

      if(managerDatePicker){
        managerDatePicker.value = currentDay;
      }

    }

    renderManagerDashboard();
  };
}


// ========== DATE PICKER ==========
if(managerDatePicker){

  managerDatePicker.onchange = () => {

    currentDay = managerDatePicker.value;

    renderManagerDashboard();
  };
}


// ========== MONTH PICKER ==========
if(managerMonthPicker){

  managerMonthPicker.onchange = () => {

    currentMonth = managerMonthPicker.value;

    renderManagerDashboard();
  };
}
function updateViewModeLabels() {

  const select = document.getElementById("viewModeSelect");
  if (!select) return;

  const periodOption = select.querySelector('option[value="period"]');
  const monthOption = select.querySelector('option[value="month"]');
  const dayOption = select.querySelector('option[value="day"]');

  const range = getDateRange();

  // Kỳ
  if (range && range.type === "period") {
    periodOption.textContent = range.label;
  } else {
    const d = new Date(currentPeriodDate);

    let start, end;

    if (d.getDate() >= 20) {
      start = new Date(d.getFullYear(), d.getMonth(), 20);
      end = new Date(d.getFullYear(), d.getMonth() + 1, 19);
    } else {
      start = new Date(d.getFullYear(), d.getMonth() - 1, 20);
      end = new Date(d.getFullYear(), d.getMonth(), 19);
    }

    periodOption.textContent =
      `${start.toLocaleDateString("vi-VN")} → ${end.toLocaleDateString("vi-VN")}`;
  }

  // Tháng
  const [year, month] = currentMonth.split("-");

  monthOption.textContent =
    `Tháng ${month}/${year}`;

  // Ngày
  dayOption.textContent =
    new Date(currentDay).toLocaleDateString("vi-VN");
}
updateViewModeLabels();
// ========== GET DATE RANGE ==========
function getDateRange(){
  if(currentViewMode === "day"){
    return {
      start: new Date(currentDay),
      end: new Date(currentDay),
      label: `Ngày ${new Date(currentDay).toLocaleDateString("vi-VN")}`,
      type: "day"
    };
  }else if(currentViewMode === "month"){
    const [year, month] = currentMonth.split("-").map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    return {
      start: start,
      end: end,
      label: `Tháng ${month}/${year}`,
      type: "month"
    };
  }else{
    const d = new Date(currentPeriodDate);
    let start, end;
    if(d.getDate() >= 20){
      start = new Date(d.getFullYear(), d.getMonth(), 20);
      end = new Date(d.getFullYear(), d.getMonth() + 1, 19);
    }else{
      start = new Date(d.getFullYear(), d.getMonth() - 1, 20);
      end = new Date(d.getFullYear(), d.getMonth(), 19);
    }
    const formatDate = (date) => `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
    return {
      start: start,
      end: end,
      label: `${formatDate(start)} → ${formatDate(end)}`,
      type: "period"
    };
  }
}

function isDateInRange(dateStr, range){
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  const start = new Date(range.start);
  start.setHours(0, 0, 0, 0);
  const end = new Date(range.end);
  end.setHours(23, 59, 59, 999);
  return d >= start && d <= end;
}
// ========== THÊM MỚI: XỬ LÝ CLICK VÀO Ô DOANH THU ==========
function showRevenueDetail() {
  const details = window.currentRevenueDetails || [];
  if (!details || details.length === 0) {
    showToast(`📭 Không có dữ liệu doanh thu trong kỳ này`);
    return;
  }
  
  const range = window.currentRange;
  const periodText = range ? range.label : '';
  const total = details.reduce((a,b) => a + b.amount, 0);
  
  const detailTitle = document.getElementById("detailTitle");
  const detailContent = document.getElementById("detailContent");
  
  if (detailTitle) detailTitle.innerText = `💰 Doanh Thu - ${periodText}`;
  
  let html = `
    <div style="margin-bottom: 16px; padding: 12px; background: var(--bg-tertiary); border-radius: 12px; text-align: center;">
      <div style="font-size: 12px; color: var(--text-light);">Tổng doanh thu</div>
      <div style="font-size: 28px; font-weight: 700; color: var(--success);">${formatMoney(total)}</div>
    </div>
    <div style="font-weight: 600; margin-bottom: 12px; font-size: 14px;">📋 Chi tiết theo ngày:</div>
  `;
  
  details.forEach(item => {
    const formattedDate = formatDisplayDate(item.date);
    html += `
      <div class="history-item" style="display: flex; justify-content: space-between; align-items: center;">
        <div class="history-name">📅 ${formattedDate}</div>
        <div class="history-amount" style="color: var(--success); font-weight: 700;">${formatMoney(item.amount)}</div>
      </div>
    `;
  });
  
  if (detailContent) detailContent.innerHTML = html;
  openPopup("detailPopup");
}

// Cập nhật hàm setupClickableManagerBoxes để thêm ô doanh thu
const originalSetupClickable = setupClickableManagerBoxes;
setupClickableManagerBoxes = function() {
  // Gọi hàm cũ nếu có
  if (typeof originalSetupClickable === 'function') originalSetupClickable();
  
  // ========== THÊM MỚI: Ô Doanh thu ==========
  const revenueBox = document.getElementById('revenueBox'); // Bạn cần thêm id="revenueBox" cho ô doanh thu trong HTML
  if (revenueBox && !revenueBox.hasAttribute('data-clickable')) {
    revenueBox.setAttribute('data-clickable', 'true');
    revenueBox.style.cursor = 'pointer';
    revenueBox.title = 'Click để xem chi tiết doanh thu theo ngày';
    revenueBox.onclick = () => showRevenueDetail();
  }
};

// Export hàm mới
window.showRevenueDetail = showRevenueDetail;
// ========== RENDER DASHBOARD (ĐÃ THÊM DOANH THU) ==========
// ========== RENDER DASHBOARD (HOÀN CHỈNH) ==========
function renderManagerDashboard() {
  const range = getDateRange();
  if (periodDisplay) periodDisplay.innerText = range.label;
  window.currentRange = range;
  
  // Khởi tạo biến
  let bank = 0, cash = 0, revenue = 0, grab = 0;
  const bankDetails = [], cashDetails = [], revenueDetails = [], grabDetails = [];
  const debtDetails = [];
  
  // Duyệt reports
  Object.entries(appData.reports).forEach(([date, report]) => {
    if (isDateInRange(date, range)) {
      const bankAmt = report.bank || 0;
      const cashAmt = report.cash || 0;
      const revenueAmt = report.revenue || 0;
      const grabAmt = report.grab || 0;
      
      bank += bankAmt;
      cash += cashAmt;
      revenue += revenueAmt;
      grab += grabAmt;
      
      if (bankAmt > 0) bankDetails.push({ date, amount: bankAmt });
      if (cashAmt > 0) cashDetails.push({ date, amount: cashAmt });
      if (revenueAmt > 0) revenueDetails.push({ date, amount: revenueAmt });
      if (grabAmt > 0) grabDetails.push({ date, amount: grabAmt });
    }
  });
  
  // Lưu details để click xem chi tiết
  window.currentBankDetails = bankDetails.sort((a,b) => b.date.localeCompare(a.date));
  window.currentCashDetails = cashDetails.sort((a,b) => b.date.localeCompare(a.date));
  window.currentRevenueDetails = revenueDetails.sort((a,b) => b.date.localeCompare(a.date));
  window.currentGrabDetails = grabDetails.sort((a,b) => b.date.localeCompare(a.date));
  
  // Tính công nợ phát sinh trong kỳ
  const debtTransactionsInRange = appData.debtTransactions
    .filter(x => !x.deleted && x.type === "debt_add" && isDateInRange(x.date, range));
  const debtTotal = debtTransactionsInRange.reduce((a, b) => a + (b.amount || 0), 0);
  
  const debtByDate = {};
  debtTransactionsInRange.forEach(item => {
    if (!debtByDate[item.date]) debtByDate[item.date] = 0;
    debtByDate[item.date] += item.amount;
  });
  window.currentDebtDetails = Object.entries(debtByDate).map(([date, amount]) => ({ date, amount }));
  
  // Tính chi phí nhân viên
  const expense = appData.expenses
    .filter(x => !x.deleted && isDateInRange(x.date, range))
    .reduce((a, b) => a + (b.amount || 0), 0);
  
  // Tính chi phí quản lý
  const adminExpense = appData.adminExpenses
    .filter(x => !x.deleted && isDateInRange(x.date, range))
    .reduce((a, b) => a + (b.amount || 0), 0);
  
  // ========== CẬP NHẬT UI ==========
  const managerRevenue = document.getElementById("managerRevenue");
  const managerGrab = document.getElementById("managerGrab");
  const managerBank = document.getElementById("managerBank");
  const managerCash = document.getElementById("managerCash");
  const managerExpense = document.getElementById("managerExpense");
  const managerDebt = document.getElementById("managerDebt");
  const managerAdminExpense = document.getElementById("managerAdminExpense");
  
  if (managerRevenue) managerRevenue.innerText = formatMoney(revenue);
  if (managerGrab) managerGrab.innerText = formatMoney(grab);
  if (managerBank) managerBank.innerText = formatMoney(bank);
  if (managerCash) managerCash.innerText = formatMoney(cash);
  if (managerExpense) managerExpense.innerText = formatMoney(expense);
  if (managerDebt) managerDebt.innerText = formatMoney(debtTotal);
  if (managerAdminExpense) managerAdminExpense.innerText = formatMoney(adminExpense);
  
  // Render danh sách
  renderExpenseStats(range);
  renderDebtStats(range);
  renderAdminExpenseStats(range);
  
  // Gán sự kiện click cho các ô
  setupClickableManagerBoxes();
  
  // Cập nhật tổng nợ hiện tại
  updateManagerTotalDebt();
}
// ========== HIỂN THỊ CHI TIẾT GRAB ==========
function showGrabDetail() {
  const details = window.currentGrabDetails || [];
  if (!details || details.length === 0) {
    showToast(`📭 Không có dữ liệu Grab trong kỳ này`);
    return;
  }
  
  const range = window.currentRange;
  const periodText = range ? range.label : '';
  const total = details.reduce((a, b) => a + b.amount, 0);
  
  const detailTitleEl = document.getElementById("detailTitle");
  const detailContentEl = document.getElementById("detailContent");
  
  if (detailTitleEl) detailTitleEl.innerText = `🚕 GRAB - ${periodText}`;
  
  let html = `
    <div style="margin-bottom: 16px; padding: 12px; background: var(--bg-tertiary); border-radius: 12px; text-align: center;">
      <div style="font-size: 12px; color: var(--text-light);">Tổng chi phí Grab</div>
      <div style="font-size: 28px; font-weight: 700; color: var(--warning);">${formatMoney(total)}</div>
    </div>
    <div style="font-weight: 600; margin-bottom: 12px; font-size: 14px;">📋 Chi tiết theo ngày:</div>
  `;
  
  details.forEach(item => {
    const formattedDate = formatDisplayDate(item.date);
    html += `
      <div class="history-item" style="display: flex; justify-content: space-between; align-items: center;">
        <div class="history-name">📅 ${formattedDate}</div>
        <div class="history-amount" style="color: var(--warning); font-weight: 700;">${formatMoney(item.amount)}</div>
      </div>
    `;
  });
  
  if (detailContentEl) detailContentEl.innerHTML = html;
  openPopup("detailPopup");
}
// ========== SETUP CLICKABLE MANAGER BOXES ==========
function setupClickableManagerBoxes() {
  // Doanh thu
  const revenueBox = document.getElementById('revenueBox');
  if (revenueBox) {
    revenueBox.style.cursor = 'pointer';
    revenueBox.onclick = () => showRevenueDetail();
  }
  
  // Grab
  const grabBox = document.getElementById('grabBox');
  if (grabBox) {
    grabBox.style.cursor = 'pointer';
    grabBox.onclick = () => showGrabDetail();
  }
  
  // Chuyển khoản
  const bankBox = document.getElementById('bankBox');
  if (bankBox) {
    bankBox.style.cursor = 'pointer';
    bankBox.onclick = () => showTransactionDetail('bank', 'Chuyển khoản', window.currentBankDetails || []);
  }
  
  // Tiền mặt
  const cashBox = document.getElementById('cashBox');
  if (cashBox) {
    cashBox.style.cursor = 'pointer';
    cashBox.onclick = () => showTransactionDetail('cash', 'Tiền mặt', window.currentCashDetails || []);
  }
  
  // Chi phí nhân viên - scroll xuống danh sách
  const expenseBox = document.getElementById('expenseBox');
  if (expenseBox) {
    expenseBox.style.cursor = 'pointer';
    expenseBox.onclick = () => scrollToExpenseList();
  }
  
  // Công nợ phát sinh
  const debtOccurBox = document.getElementById('debtOccurBox');
  if (debtOccurBox) {
    debtOccurBox.style.cursor = 'pointer';
    debtOccurBox.onclick = () => showDebtInRangeDetail();
  }
  
  // Chi phí quản lý - scroll xuống danh sách
  const adminExpenseBox = document.getElementById('adminExpenseBox');
  if (adminExpenseBox) {
    adminExpenseBox.style.cursor = 'pointer';
    adminExpenseBox.onclick = () => scrollToAdminExpenseList();
  }
  
  // Tổng công nợ hiện tại - scroll xuống danh sách nợ
  const totalDebtBox = document.getElementById('totalDebtBox');
  if (totalDebtBox) {
    totalDebtBox.style.cursor = 'pointer';
    totalDebtBox.onclick = () => scrollToDebtList();
  }
}
function setupScrollToElements() {
  // Gắn title cho các ô
  const expenseBox = document.querySelector('.manager-box:nth-child(3)');
  if (expenseBox) {
    expenseBox.title = 'Click để xem danh sách chi phí';
  }
  
  const totalDebtBox = document.querySelector('.manager-box:nth-child(5)');
  if (totalDebtBox) {
    totalDebtBox.title = 'Click để xem danh sách công nợ';
  }
  
  const adminExpenseBox = document.getElementById('adminExpenseBox');
  if (adminExpenseBox) {
    adminExpenseBox.title = 'Click để xem danh sách chi phí quản lý';
  }
}

// THÊM MỚI: Scroll đến danh sách chi phí
function scrollToExpenseList() {
  const expenseList = document.getElementById("managerExpenseList");
  if (expenseList) {
    expenseList.scrollIntoView({ behavior: 'smooth', block: 'start' });
    expenseList.style.transition = 'background 0.5s';
    expenseList.style.background = 'var(--accent-light)';
    setTimeout(() => {
      expenseList.style.background = '';
    }, 1000);
    showToast("📋 Đã cuộn đến danh sách chi phí");
  } else {
    showToast("⚠️ Chưa có dữ liệu chi phí");
  }
}

// THÊM MỚI: Scroll đến danh sách công nợ
function scrollToDebtList() {
  const debtList = document.getElementById("managerDebtList");
  if (debtList) {
    debtList.scrollIntoView({ behavior: 'smooth', block: 'start' });
    debtList.style.transition = 'background 0.5s';
    debtList.style.background = 'var(--danger-light)';
    setTimeout(() => {
      debtList.style.background = '';
    }, 1000);
    showToast("🧾 Đã cuộn đến danh sách công nợ");
  } else {
    showToast("⚠️ Chưa có dữ liệu công nợ");
  }
}

function scrollToAdminExpenseList() {
  const adminExpenseList = document.getElementById("managerAdminExpenseList");
  if (adminExpenseList) {
    adminExpenseList.scrollIntoView({ behavior: 'smooth', block: 'start' });
    adminExpenseList.style.transition = 'background 0.5s';
    adminExpenseList.style.background = 'var(--warning-light)';
    setTimeout(() => {
      adminExpenseList.style.background = '';
    }, 1000);
    showToast("📋 Đã cuộn đến danh sách chi phí quản lý");
  } else {
    showToast("⚠️ Chưa có dữ liệu chi phí quản lý");
  }
}

// THÊM MỚI: Hiển thị popup chi tiết công nợ phát sinh trong kỳ
function showDebtInRangeDetail() {
  const details = window.currentDebtDetails || [];
  if (!details || details.length === 0) {
    showToast(`📭 Không có công nợ phát sinh trong kỳ này`);
    return;
  }
  
  const range = window.currentRange;
  const periodText = range ? range.label : '';
  const total = details.reduce((a,b) => a + b.amount, 0);
  
  detailTitle.innerText = `📊 Công Nợ Phát Sinh - ${periodText}`;
  
  let html = `
    <div style="margin-bottom: 16px; padding: 12px; background: var(--bg-tertiary); border-radius: 12px; text-align: center;">
      <div style="font-size: 12px; color: var(--text-light);">Tổng công nợ phát sinh</div>
      <div style="font-size: 28px; font-weight: 700; color: var(--danger);">${formatMoney(total)}</div>
    </div>
    <div style="font-weight: 600; margin-bottom: 12px; font-size: 14px;">📋 Chi tiết theo ngày:</div>
  `;
  
  details.forEach(item => {
    const formattedDate = formatDisplayDate(item.date);
    html += `
      <div class="history-item" style="display: flex; justify-content: space-between; align-items: center;">
        <div class="history-name">📅 ${formattedDate}</div>
        <div class="history-amount" style="color: var(--danger); font-weight: 700;">+ ${formatMoney(item.amount)}</div>
      </div>
    `;
  });
  
  detailContent.innerHTML = html;
  openPopup("detailPopup");
}

function showTransactionDetail(type, title, details) {
  if (!details || details.length === 0) {
    showToast(`📭 Không có dữ liệu ${title} trong kỳ này`);
    return;
  }
  
  const range = window.currentRange;
  const periodText = range ? range.label : '';
  
  detailTitle.innerText = `💰 ${title} - ${periodText}`;
  
  let html = `
    <div style="margin-bottom: 16px; padding: 12px; background: var(--bg-tertiary); border-radius: 12px; text-align: center;">
      <div style="font-size: 12px; color: var(--text-light);">Tổng ${title}</div>
      <div style="font-size: 28px; font-weight: 700; color: var(--success);">${formatMoney(details.reduce((a,b) => a + b.amount, 0))}</div>
    </div>
    <div style="font-weight: 600; margin-bottom: 12px; font-size: 14px;">📋 Chi tiết theo ngày:</div>
  `;
  
  details.forEach(item => {
    const formattedDate = formatDisplayDate(item.date);
    html += `
      <div class="history-item" style="display: flex; justify-content: space-between; align-items: center;">
        <div class="history-name">📅 ${formattedDate}</div>
        <div class="history-amount" style="color: var(--success); font-weight: 700;">${formatMoney(item.amount)}</div>
      </div>
    `;
  });
  
  detailContent.innerHTML = html;
  openPopup("detailPopup");
}

function renderExpenseStats(range){
  const grouped = {};
  appData.expenses
    .filter(x => !x.deleted && isDateInRange(x.date, range))
    .forEach(item => {
      if(!grouped[item.name]) grouped[item.name] = [];
      grouped[item.name].push(item);
    });
  
  let html = "";
  Object.keys(grouped).sort().forEach(name => {
    const total = grouped[name].reduce((a, b) => a + b.amount, 0);
    const qtyTotal = grouped[name].reduce((a, b) => a + (b.qty || 0), 0);
    html += `<div class="manager-item" onclick="showExpenseDetail('${name.replace(/'/g, "\\'")}')" style="display:flex; justify-content:space-between; align-items:center; gap:10px; cursor:pointer;">
      <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">📦 ${name}</span>
      <strong style="flex-shrink:0; white-space:nowrap;">${qtyTotal > 0 ? `SL:${qtyTotal} • ` : ""}${formatMoney(total)}</strong>
    </div>`;
  });
  if(html === "") html = '<div class="empty-text">📭 Chưa có dữ liệu chi phí</div>';
  if(managerExpenseList) managerExpenseList.innerHTML = html;
}

function renderAdminExpenseStats(range){
  const grouped = {};
  appData.adminExpenses
    .filter(x => !x.deleted && isDateInRange(x.date, range))
    .forEach(item => {
      if(!grouped[item.name]) grouped[item.name] = [];
      grouped[item.name].push(item);
    });
  
  let html = "";
  Object.keys(grouped).sort().forEach(name => {
    const total = grouped[name].reduce((a, b) => a + b.amount, 0);
    const qtyTotal = grouped[name].reduce((a, b) => a + (b.qty || 0), 0);
    html += `<div class="manager-item" onclick="showAdminExpenseDetail('${name.replace(/'/g, "\\'")}')" style="display:flex; justify-content:space-between; align-items:center; gap:10px; cursor:pointer;">
      <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">🏢 ${name}</span>
      <strong style="flex-shrink:0; white-space:nowrap;">${qtyTotal > 0 ? `SL:${qtyTotal} • ` : ""}${formatMoney(total)}</strong>
    </div>`;
  });
  if(html === "") html = '<div class="empty-text">📭 Chưa có dữ liệu chi phí quản lý</div>';
  
  let container = document.getElementById("managerAdminExpenseList");
  if(container) container.innerHTML = html;
}

function renderDebtStats(range){
  const allCustomers = new Set();
  const balanceAtEnd = {};
  
  appData.categories.customers.forEach(c => allCustomers.add(c));
  appData.recent.customers.forEach(c => allCustomers.add(c));
  appData.debtTransactions.forEach(t => { if(!t.deleted) allCustomers.add(t.customer); });
  
  const rangeEnd = new Date(range.end);
  rangeEnd.setHours(23, 59, 59, 999);
  
  allCustomers.forEach(customer => {
    let balance = 0;
    appData.debtTransactions
      .filter(t => !t.deleted && t.customer === customer)
      .forEach(t => {
        const transDate = new Date(t.date);
        transDate.setHours(0, 0, 0, 0);
        if(transDate <= rangeEnd){
          if(t.type === "debt_add") balance += t.amount;
          else balance -= t.amount;
        }
      });
    balanceAtEnd[customer] = balance;
  });
  
  let html = "";
  Object.keys(balanceAtEnd).sort().forEach(customer => {
    const balance = balanceAtEnd[customer];
    if(balance > 0){
      html += `<div class="manager-item" onclick="showDebtDetail('${customer.replace(/'/g, "\\'")}')" style="display:flex; justify-content:space-between; align-items:center; gap:10px; cursor:pointer;">
        <span style="flex:1;">👤 ${customer}</span>
        <strong style="color:var(--danger); white-space:nowrap;">Nợ: ${formatMoney(balance)}</strong>
      </div>`;
    }
  });
  if(html === "") html = '<div class="empty-text">✅ Không có khách nợ</div>';
  if(managerDebtList) managerDebtList.innerHTML = html;
}

// ========== EXPORT ==========
function exportToCSV(data, filename, headers){
  let csv = headers.join(",") + "\n";
  data.forEach(row => { csv += row.map(cell => `"${cell}"`).join(",") + "\n"; });
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

if(exportExpenseBtn){
  exportExpenseBtn.onclick = () => {
    const range = getDateRange();
    const expenses = appData.expenses.filter(x => !x.deleted && isDateInRange(x.date, range));
    const data = expenses.map(e => [e.date, e.name, e.qty || 0, e.amount]);
    exportToCSV(data, `chi_phi_${range.label.replace(/[\/\s→:]/g, "_")}.csv`, ["Ngày", "Tên", "Số lượng", "Số tiền"]);
    showToast("✓ Đã xuất file chi phí");
  };
}

if (exportDebtBtn) {

  exportDebtBtn.onclick = () => {

    const range = getDateRange();

    const debts = appData.debtTransactions.filter(item =>
      !item.deleted &&
      isDateInRange(item.date, range)
    );

    const data = debts.map(item => [

      item.date,

      item.customer || "Khách lẻ",

      item.type === "debt_add"
        ? "Công nợ"
        : "Thanh toán",

      Number(item.amount || 0),

      item.note || ""

    ]);

    const fileName =
      `cong_no_${(range.label || "data")
        .replace(/[\/\s→:]/g, "_")}.csv`;

    exportToCSV(
      data,
      fileName,
      [
        "Ngày",
        "Khách hàng",
        "Loại",
        "Số tiền",
        "Ghi chú"
      ]
    );

    showToast(
      `✓ Đã xuất ${debts.length} giao dịch công nợ`
    );

  };

}

// Export Admin Expenses
const exportAdminExpenseBtn = document.getElementById("exportAdminExpenseBtn");
if(exportAdminExpenseBtn){
  exportAdminExpenseBtn.onclick = () => {
    const range = getDateRange();
    const adminExpenses = appData.adminExpenses.filter(x => !x.deleted && isDateInRange(x.date, range));
    const data = adminExpenses.map(e => [e.date, e.name, e.qty || 0, e.amount]);
    exportToCSV(data, `chi_phi_quan_ly_${range.label.replace(/[\/\s→:]/g, "_")}.csv`, ["Ngày", "Tên", "Số lượng", "Số tiền"]);
    showToast("✓ Đã xuất file chi phí quản lý");
  };
}

function showExpenseDetail(name){
  detailTitle.innerText = "📋 Chi Phí: " + name;
  let html = "";
  appData.expenses
    .filter(x => x.name === name && !x.deleted)
    .sort((a,b) => b.date.localeCompare(a.date))
    .forEach(item => {
      html += `<div class="history-item" style="display: flex; justify-content: space-between; align-items: center;">
        <div class="history-name">📅 ${formatDisplayDate(item.date)}</div>
        <div class="history-amount debt">${formatMoney(item.amount)}</div>
      </div>`;
    });
  if(!html) html = '<div class="empty-text">Không có dữ liệu</div>';
  detailContent.innerHTML = html;
  openPopup("detailPopup");
}

function showAdminExpenseDetail(name){
  detailTitle.innerText = "🏢 Chi Phí Quản Lý: " + name;
  let html = "";
  appData.adminExpenses
    .filter(x => x.name === name && !x.deleted)
    .sort((a,b) => b.date.localeCompare(a.date))
    .forEach(item => {
      html += `<div class="history-item" style="display: flex; justify-content: space-between; align-items: center;">
        <div class="history-name">📅 ${formatDisplayDate(item.date)}</div>
        <div class="history-amount debt">${formatMoney(item.amount)}</div>
      </div>`;
    });
  if(!html) html = '<div class="empty-text">Không có dữ liệu</div>';
  detailContent.innerHTML = html;
  openPopup("detailPopup");
}

function showDebtDetail(customer){
  detailTitle.innerText = "🧾 Công Nợ: " + customer;
  let balance = 0;
  let html = "";
  appData.debtTransactions
    .filter(x => x.customer === customer && !x.deleted)
    .sort((a,b) => a.date.localeCompare(b.date))
    .forEach(item => {
      if(item.type === "debt_add") balance += item.amount;
      else balance -= item.amount;
      const isDebt = item.type === "debt_add";
      html += `<div class="history-item" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
        <div class="history-name">
          📅 ${formatDisplayDate(item.date)}
          <div style="font-size:11px; color:var(--text-light);">Còn lại: ${formatMoney(balance)}</div>
        </div>
        <div class="history-amount ${isDebt ? 'debt' : 'payment'}">${isDebt ? '+' : '-'}${formatMoney(item.amount)}</div>
      </div>`;
    });
  if(!html) html = '<div class="empty-text">Không có dữ liệu</div>';
  detailContent.innerHTML = html;
  openPopup("detailPopup");
}

// ========== CSS ==========
if(!document.querySelector('#manager-styles')) {
  const style = document.createElement('style');
  style.id = 'manager-styles';
  style.textContent = `
    .manager-item { padding: 12px; border-bottom: 1px solid #eee; cursor: pointer; transition: background 0.2s; }
    .manager-item:hover { background: var(--bg-tertiary); }
    .manager-item-stats { display: flex; justify-content: space-between; margin-top: 6px; font-size: 13px; color: #666; }
    .positive { color: #27ae60; }
    .negative { color: #e74c3c; }
    .empty-text { text-align: center; padding: 20px; color: #999; font-style: italic; }
    .manager-box { cursor: pointer; transition: all 0.2s; }
    .manager-box:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
  `;
  document.head.appendChild(style);
}

function calculateTotalDebtAll() {
  const allCustomers = new Set();
  appData.categories.customers.forEach(c => allCustomers.add(c));
  appData.recent.customers.forEach(c => allCustomers.add(c));
  appData.debtTransactions.forEach(t => {
    if (!t.deleted && t.customer) allCustomers.add(t.customer);
  });
  let total = 0;
  allCustomers.forEach(customer => {
    total += calculateCustomerDebt(customer);
  });
  return total;
}

function updateManagerTotalDebt() {
  const managerTotalDebt = document.getElementById("managerTotalDebt");
  if (managerTotalDebt) {
    managerTotalDebt.innerText = formatMoney(calculateTotalDebtAll());
  }
}

const originalRenderManagerDashboard = renderManagerDashboard;
renderManagerDashboard = function() {
  originalRenderManagerDashboard();
  updateManagerTotalDebt();
};

// Export functions
window.showAdminExpenseDetail = showAdminExpenseDetail;
window.renderAdminExpenseStats = renderAdminExpenseStats;
window.scrollToExpenseList = scrollToExpenseList;
window.scrollToDebtList = scrollToDebtList;
window.scrollToAdminExpenseList = scrollToAdminExpenseList;
window.showDebtInRangeDetail = showDebtInRangeDetail;

renderManagerDashboard();

// ========== COLLAPSIBLE CARD - CHỈ MỞ 1 CARD MỘT LÚC ==========
function setupCollapsibleCards() {
  const cards = document.querySelectorAll('.collapsible');
  
  // Đặt trạng thái ban đầu: tất cả đều đóng, hoặc mở card đầu tiên
  cards.forEach((card, index) => {
    if (index === 0) {
      // Mở card đầu tiên
      card.classList.remove('collapsed');
    } else {
      // Các card còn lại đóng
      card.classList.add('collapsed');
    }
  });
  
  cards.forEach(card => {
    const header = card.querySelector('.toggle-header');
    if (!header) return;
    
    header.style.cursor = 'pointer';
    
    // Xóa event cũ để tránh trùng lặp
    header.removeEventListener('click', header._clickHandler);
    
    // Tạo handler mới
    const clickHandler = (e) => {
      // Không xử lý nếu click vào button bên trong header
      if (e.target.tagName === 'BUTTON') return;
      
      const isCurrentlyCollapsed = card.classList.contains('collapsed');
      
      if (isCurrentlyCollapsed) {
        // Đóng tất cả các card
        cards.forEach(c => c.classList.add('collapsed'));
        // Mở card hiện tại
        card.classList.remove('collapsed');
      } else {
        // Nếu đang mở thì đóng lại
        card.classList.add('collapsed');
      }
    };
    
    // Lưu handler để có thể remove sau
    header._clickHandler = clickHandler;
    header.addEventListener('click', clickHandler);
  });
}

// Gọi hàm sau khi DOM load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupCollapsibleCards);
} else {
  setupCollapsibleCards();
}

setupCollapsibleCards();