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
  currentDay = addDays(currentDay, -1);
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
  currentDay = addDays(currentDay, 1);
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
  // ... sau khi tính adminExpense ...

// Tính thu nhập ròng
const netIncome = (cash + bank + grab) - (expense + adminExpense + calculateTotalSalaryForMonth(getYearMonthFromRange(range).year, getYearMonthFromRange(range).month));

// Cập nhật UI cho ô thu nhập ròng
const managerNetIncome = document.getElementById("managerNetIncome");
if (managerNetIncome) managerNetIncome.innerText = formatMoney(netIncome);
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
updateViewModeLabels();
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
function showNetIncomeDetail() {
  const range = window.currentRange;
  const periodText = range ? range.label : '';
  const { year, month } = getYearMonthFromRange(range);
  const totalSalary = calculateTotalSalaryForMonth(year, month);
  
  const cash = parseMoney(document.getElementById("managerCash")?.innerText.replace(/[^0-9]/g, '')) || 0;
  const bank = parseMoney(document.getElementById("managerBank")?.innerText.replace(/[^0-9]/g, '')) || 0;
  const grab = parseMoney(document.getElementById("managerGrab")?.innerText.replace(/[^0-9]/g, '')) || 0;
  const expense = parseMoney(document.getElementById("managerExpense")?.innerText.replace(/[^0-9]/g, '')) || 0;
  const adminExpense = parseMoney(document.getElementById("managerAdminExpense")?.innerText.replace(/[^0-9]/g, '')) || 0;
  
  const netIncome = cash + bank + grab - expense - adminExpense - totalSalary;
  
  const detailTitle = document.getElementById("detailTitle");
  const detailContent = document.getElementById("detailContent");
  if (detailTitle) detailTitle.innerText = `💰 THU NHẬP RÒNG - ${periodText}`;
  
  let html = `
    <div style="margin-bottom: 16px; padding: 12px; background: var(--bg-tertiary); border-radius: 12px; text-align: center;">
      <div style="font-size: 12px; color: var(--text-light);">Tổng thu nhập ròng</div>
      <div style="font-size: 28px; font-weight: 700; color: var(--success);">${formatMoney(netIncome)}</div>
    </div>
    <div style="font-weight: 600; margin-bottom: 12px;">📊 Chi tiết cấu thành:</div>
    <div>💵 Thực nhận: ${formatMoney(cash)}</div>
    <div>🏦 Chuyển khoản: ${formatMoney(bank)}</div>
    <div>🚕 Grab: ${formatMoney(grab)}</div>
    <div style="border-top: 1px dashed var(--border); margin: 8px 0;"></div>
    <div>📉 Chi phí NV: -${formatMoney(expense)}</div>
    <div>📋 Chi phí quản lý: -${formatMoney(adminExpense)}</div>
    <div>👥 Lương nhân viên: -${formatMoney(totalSalary)}</div>
  `;
  
  if (detailContent) detailContent.innerHTML = html;
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
  const netIncomeBox = document.getElementById('netIncomeBox');
if (netIncomeBox) {
  netIncomeBox.style.cursor = 'pointer';
  netIncomeBox.onclick = () => showNetIncomeDetail();
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

// ========== RENDER DANH SÁCH CÔNG NỢ (TAB QUẢN LÝ) – HIỂN THỊ CẢ KHÁCH ĐÃ TRẢ HẾT ==========
function renderDebtStats(range) {
  // THÊM KIỂM TRA: nếu không có dữ liệu thì thoát, không báo lỗi
  if (!appData) {
    console.warn("⚠️ renderDebtStats: appData chưa có dữ liệu");
    if (managerDebtList) managerDebtList.innerHTML = '<div class="empty-text">📭 Đang tải dữ liệu...</div>';
    return;
  }
  
  // THÊM KIỂM TRA: tạo danh sách khách hàng an toàn
  let allCustomers = new Set();
  
  // Lấy từ categories (nếu có)
  if (appData.categories && appData.categories.customers && Array.isArray(appData.categories.customers)) {
    appData.categories.customers.forEach(c => allCustomers.add(c));
  }
  
  // Lấy từ recent (nếu có)
  if (appData.recent && appData.recent.customers && Array.isArray(appData.recent.customers)) {
    appData.recent.customers.forEach(c => allCustomers.add(c));
  }
  
  // Lấy từ debtTransactions (nếu có)
  if (appData.debtTransactions && Array.isArray(appData.debtTransactions)) {
    appData.debtTransactions.forEach(t => { 
      if (!t.deleted && t.customer) allCustomers.add(t.customer); 
    });
  }
  
  // Nếu không có khách hàng nào
  if (allCustomers.size === 0) {
    if (managerDebtList) managerDebtList.innerHTML = '<div class="empty-text">✅ Không có khách nợ</div>';
    return;
  }
  
  // Tính ngày kết thúc của kỳ
  const rangeEnd = new Date(range.end);
  rangeEnd.setHours(23, 59, 59, 999);
  
  // Tạo mảng chứa thông tin từng khách hàng (tên, balance)
  const customersWithBalance = [];
  allCustomers.forEach(customer => {
    let balance = 0;
    if (appData.debtTransactions && Array.isArray(appData.debtTransactions)) {
      appData.debtTransactions
        .filter(t => !t.deleted && t.customer === customer)
        .forEach(t => {
          const transDate = new Date(t.date);
          transDate.setHours(0, 0, 0, 0);
          if (transDate <= rangeEnd) {
            if (t.type === "debt_add") balance += t.amount;
            else balance -= t.amount;
          }
        });
    }
    customersWithBalance.push({ name: customer, balance: balance });
  });
  
  // Sắp xếp: nợ > 0 lên đầu (theo số nợ giảm dần), sau đó đến dư tiền, cuối cùng là đã trả hết (balance === 0)
  customersWithBalance.sort((a, b) => {
    if (a.balance > 0 && b.balance <= 0) return -1;
    if (a.balance <= 0 && b.balance > 0) return 1;
    if (a.balance > 0 && b.balance > 0) return b.balance - a.balance;
    if (a.balance < 0 && b.balance < 0) return Math.abs(b.balance) - Math.abs(a.balance);
    return a.name.localeCompare(b.name);
  });
  
  // Tạo HTML hiển thị
  let html = "";
  customersWithBalance.forEach(customer => {
    const balance = customer.balance;
    const isDebt = balance > 0;
    const isDeposit = balance < 0;
    const isPaidOff = balance === 0;
    const displayBalance = Math.abs(balance);
    
    let statusText = '';
    let statusColor = '';
    if (isDebt) {
      statusText = `Nợ: ${formatMoney(displayBalance)}`;
      statusColor = 'var(--danger)';
    } else if (isDeposit) {
      statusText = `Dư: ${formatMoney(displayBalance)}`;
      statusColor = 'var(--success)';
    } else {
      statusText = '✅ Đã trả hết';
      statusColor = 'var(--text-light)';
    }
    
    html += `
      <div class="manager-item" onclick="showDebtDetail('${customer.name.replace(/'/g, "\\'")}')" style="display:flex; justify-content:space-between; align-items:center; gap:10px; cursor:pointer;">
        <span style="flex:1;">👤 ${customer.name}</span>
        <strong style="color:${statusColor}; white-space:nowrap;">${statusText}</strong>
      </div>
    `;
  });
  
  if (html === "") html = '<div class="empty-text">✅ Không có khách nợ</div>';
  if (managerDebtList) managerDebtList.innerHTML = html;
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
  // THÊM KIỂM TRA: nếu không có dữ liệu thì trả về 0, không báo lỗi
  if (!appData) {
    console.warn("⚠️ appData chưa có dữ liệu");
    return 0;
  }
  
  // THÊM KIỂM TRA: tạo danh sách khách hàng an toàn
  let allCustomers = new Set();
  
  // Lấy danh sách từ categories (nếu có)
  if (appData.categories && appData.categories.customers && Array.isArray(appData.categories.customers)) {
    appData.categories.customers.forEach(c => allCustomers.add(c));
  }
  
  // Lấy danh sách từ recent (nếu có)
  if (appData.recent && appData.recent.customers && Array.isArray(appData.recent.customers)) {
    appData.recent.customers.forEach(c => allCustomers.add(c));
  }
  
  // Lấy từ debtTransactions (nếu có)
  if (appData.debtTransactions && Array.isArray(appData.debtTransactions)) {
    appData.debtTransactions.forEach(t => {
      if (!t.deleted && t.customer) allCustomers.add(t.customer);
    });
  }
  
  // Nếu không có khách hàng nào thì trả về 0
  if (allCustomers.size === 0) {
    return 0;
  }
  
  // Tính tổng nợ
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




// ========== HÀM TÍNH TOÁN CHO NHÂN VIÊN ==========
const DAY_RATE = 200000;

// Lấy tháng hiện tại (YYYY-MM)
function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Lấy số ngày trong tháng
function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

// Tính tổng ngày công theo logic: tăng ca +1, nghỉ -1
function calculateActualWorkDaysFromHistory(overtimeHistory, absentHistory, year, month) {
  const daysInMonth = getDaysInMonth(year, month);
  let overtimeCount = 0;
  let absentCount = 0;
  
  const monthStr = String(month).padStart(2, '0');
  Object.keys(overtimeHistory || {}).forEach(date => {
    if (date.startsWith(`${year}-${monthStr}`)) overtimeCount++;
  });
  Object.keys(absentHistory || {}).forEach(date => {
    if (date.startsWith(`${year}-${monthStr}`)) absentCount++;
  });
  
  // Công thức mới: (ngày trong tháng - nghỉ) + tăng ca
  const totalWorkDays = (daysInMonth - absentCount) + overtimeCount;
  
  return {
    workDays: daysInMonth - absentCount,      // Số ngày thực tế có mặt (kể cả tăng ca)
    overtimeDays: overtimeCount,
    absentDays: absentCount,
    actualWorkDays: totalWorkDays
  };
}

function calculateEmployeeMonthlySalary(emp, year, month) {
  const stats = calculateActualWorkDaysFromHistory(emp.overtimeHistory, emp.absentHistory, year, month);
  const salary = stats.actualWorkDays * (emp.salaryPerDay || 200000);
  
  console.log(`💰 Lương ${emp.name}: (${stats.workDays} ngày có mặt + ${stats.overtimeDays} tăng ca) = ${stats.actualWorkDays} ngày công → ${formatMoney(salary)}`);
  
  return {
    workDays: stats.workDays,
    overtimeDays: stats.overtimeDays,
    absentDays: stats.absentDays,
    actualWorkDays: stats.actualWorkDays,
    salary: salary
  };
}

// Tính tổng lương tất cả nhân viên trong tháng
function calculateTotalMonthlySalary() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  
  let total = 0;
  (appData.employees || []).forEach(emp => {
    const result = calculateEmployeeMonthlySalary(emp, year, month);
    total += result.salary;
  });
  return total;
}

function calculateTotalSalaryForMonth(year, month) {
  let total = 0;
  (appData.employees || []).forEach(emp => {
    const stats = calculateEmployeeSalaryForMonth(emp, year, month);
    const bonus = calculateDailyBonusForMonth(emp, year, month);
    total += stats.salary + bonus;
  });
  return total;
}

function updateManagerTotalSalary() {
  const range = getDateRange();
  const { year, month } = getYearMonthFromRange(range);
  const total = calculateTotalSalaryForMonth(year, month);
  const el = document.getElementById("managerTotalSalary");
  if (el) el.innerText = formatMoney(total);
}

// Lấy danh sách các ngày trong tháng (để hiển thị dropdown)
function getDaysInMonthArray() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [];
  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    days.push(dateStr);
  }
  return days;
}
function calculateDailyBonusForMonth(employee, year, month) {
  if (!employee.rewardEnabled) return 0;
  
  let totalBonus = 0;
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  if (!employee.dailyBonus) employee.dailyBonus = {};
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const report = appData.reports[dateStr];
    
    let dayBonus = 0;
    if (report) {
      const revenue = report.revenue || 0;
      if (revenue >= 2200000) dayBonus = 20000;
      else if (revenue >= 2000000) dayBonus = 10000;
    }
    
    if (dayBonus > 0) employee.dailyBonus[dateStr] = dayBonus;
    else delete employee.dailyBonus[dateStr];
    
    totalBonus += dayBonus;
  }
  return totalBonus;
}

// Cập nhật thưởng cho tất cả nhân viên (gọi khi doanh thu thay đổi)
function updateAllEmployeesBonus() {
  const range = getDateRange();
  const { year, month } = getYearMonthFromRange(range);
  (appData.employees || []).forEach(emp => {
    if (emp.rewardEnabled) {
      calculateDailyBonusForMonth(emp, year, month); // dùng hàm mới
    }
  });
  saveData();
}
// ========== RENDER DANH SÁCH NHÂN VIÊN THEO KỲ (RANGE) - SỬA LỖI NGÀY ==========
function renderEmployeeList(range) {
  console.log("🔵 renderEmployeeList - BẮT ĐẦU RENDER, range:", range);
  
  const container = document.getElementById("employeeList");
  if (!container) return;
  
  if (!range) {
    if (typeof getDateRange === 'function') range = getDateRange();
    else return;
  }
  
  // Lấy tháng dương lịch từ range
  const { year, month } = getYearMonthFromRange(range);
  const monthStr = String(month).padStart(2, '0');
  
  // Lưu giá trị dropdown cũ
  const selectedValues = {};
  document.querySelectorAll('.date-select').forEach(select => {
    if (select.id) selectedValues[select.id] = select.value;
  });
  
  if (!appData.employees || appData.employees.length === 0) {
    container.innerHTML = '<div class="empty-text">📭 Chưa có nhân viên nào</div>';
    const popupTotal = document.getElementById("popupTotalSalary");
    if (popupTotal) popupTotal.innerText = formatMoney(0);
    return;
  }
  
  // Tạo danh sách ngày trong tháng (01 -> cuối tháng)
  const daysInMonth = new Date(year, month, 0).getDate();
  const dayOptions = [];
  const today = new Date();
  const todayStrLocal = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  
  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${year}-${monthStr}-${String(i).padStart(2, '0')}`;
    const displayDate = `${i}/${month}/${year}`;
    const selected = (dateStr === todayStrLocal) ? 'selected' : '';
    dayOptions.push(`<option value="${dateStr}" ${selected}>📅 ${displayDate}</option>`);
  }
  const dayOptionsHtml = dayOptions.join('');
  
  let totalSalary = 0;
  let html = '';
  
  function formatDayMonth(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}`;
  }
  
  appData.employees.forEach(emp => {
    const stats = calculateEmployeeSalaryForMonth(emp, year, month);
    const bonus = calculateDailyBonusForMonth(emp, year, month);
    const totalWithBonus = stats.salary + bonus;
    totalSalary += totalWithBonus;
    
    // Lấy danh sách ngày tăng ca, nghỉ trong tháng
    let overtimeDates = [];
    let absentDates = [];
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const yearD = d.getFullYear();
      const monthD = String(d.getMonth() + 1).padStart(2, '0');
      const dayD = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yearD}-${monthD}-${dayD}`;
      if (emp.overtimeHistory && emp.overtimeHistory[dateStr]) overtimeDates.push(dateStr);
      if (emp.absentHistory && emp.absentHistory[dateStr]) absentDates.push(dateStr);
    }
    
    const overtimeBadges = overtimeDates.map(d => `<span class="badge-date overtime">⚡ ${formatDayMonth(d)}</span>`).join('');
    const absentBadges = absentDates.map(d => `<span class="badge-date absent">📉 ${formatDayMonth(d)}</span>`).join('');
    
    const rewardBadge = emp.rewardEnabled ? '<span class="reward-badge">🏆 Thưởng doanh thu</span>' : '';
    
    // Chi tiết thưởng
    let bonusDetailHtml = '';
    if (bonus > 0 && emp.rewardEnabled) {
      let bonusDates = [];
      Object.keys(emp.dailyBonus || {}).forEach(date => {
        const [y, m, d] = date.split('-');
        if (parseInt(y) === year && parseInt(m) === month) {
          bonusDates.push(`📅 ${d}/${m}: ${formatMoney(emp.dailyBonus[date])}`);
        }
      });
      if (bonusDates.length > 0) {
        bonusDetailHtml = `<div class="bonus-detail"><div class="bonus-title">🏆 Chi tiết thưởng doanh thu:</div><div class="bonus-list">${bonusDates.join(' · ')}</div></div>`;
      }
    }
    
    html += `
      <div class="employee-item">
        <div class="employee-header">
          <span class="employee-name">👤 ${escapeHtml(emp.name)} ${rewardBadge}</span>
          <div class="employee-actions">
            <button class="edit-employee" onclick="editEmployeeSimple('${emp.id}')">✏️</button>
            <button class="delete-employee" onclick="deleteEmployee('${emp.id}')">🗑️</button>
          </div>
        </div>
        <div class="stats-row highlight" style="margin-bottom: 6px;">
          💰 <strong>${formatMoney(stats.salary)}</strong>
          ${bonus > 0 ? `<span style="color: var(--warning);"> + thưởng ${formatMoney(bonus)}</span>` : ''}
          <span style="color: var(--success); margin-left: auto;">= ${formatMoney(totalWithBonus)}</span>
        </div>
        <div class="stats-row">
          <span>📅 <strong>${stats.actualWorkDays}</strong> ngày công</span>
          <span>⚡ <strong>${stats.overtimeDays}</strong> tăng ca</span>
          <span>📉 <strong>${stats.absentDays}</strong> nghỉ</span>
        </div>
        ${bonusDetailHtml}
        <div class="history-dates">
          ${overtimeBadges}
          ${absentBadges}
        </div>
        <div class="employee-controls">
          <div class="date-selector">
            <select id="dateSelect_${emp.id}" class="date-select">
              ${dayOptionsHtml}
            </select>
          </div>
          <div class="action-buttons">
            <button class="btn-overtime" onclick="addOvertimeOnDate('${emp.id}')">⚡ Tăng ca</button>
            <button class="btn-absent" onclick="addAbsentOnDate('${emp.id}')">📉 Nghỉ</button>
          </div>
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
  
  setTimeout(() => {
    Object.keys(selectedValues).forEach(id => {
      const select = document.getElementById(id);
      if (select && selectedValues[id]) select.value = selectedValues[id];
    });
  }, 0);
  
  const popupTotal = document.getElementById("popupTotalSalary");
  if (popupTotal) popupTotal.innerText = formatMoney(totalSalary);
  console.log(`✅ renderEmployeeList hoàn tất (tháng ${month}/${year}), tổng lương: ${formatMoney(totalSalary)}`);
}
// Định dạng ngày tháng từ YYYY-MM-DD sang DD/MM/YYYY
function formatDisplayDate2(dateString) {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
}


// Tương tự cho addAbsentOnDate
window.addAbsentOnDate = function(employeeId) {
  console.log("🔵 addAbsentOnDate - employeeId:", employeeId);
  
  const selectEl = document.getElementById(`dateSelect_${employeeId}`);
  if (!selectEl) {
    showToast("❌ Không tìm thấy bộ chọn ngày");
    return;
  }
  
  const selectedDate = selectEl.value;
  if (!selectedDate) {
    showToast("❌ Vui lòng chọn ngày");
    return;
  }
  
  const employee = appData.employees.find(e => e.id === employeeId);
  if (!employee) {
    showToast("❌ Không tìm thấy nhân viên");
    return;
  }
  
  if (!employee.overtimeHistory) employee.overtimeHistory = {};
  if (!employee.absentHistory) employee.absentHistory = {};
  
  if (employee.overtimeHistory[selectedDate]) {
    showToast(`⚠️ Ngày ${formatDisplayDate2(selectedDate)} đã là tăng ca, không thể nghỉ`);
    return;
  }
  
  if (employee.absentHistory[selectedDate]) {
    delete employee.absentHistory[selectedDate];
    showToast(`✓ Đã bỏ nghỉ ngày ${formatDisplayDate2(selectedDate)}`);
  } else {
    employee.absentHistory[selectedDate] = true;
    showToast(`✓ Đã thêm nghỉ ngày ${formatDisplayDate2(selectedDate)}`);
  }
  
  employee.updatedAt = Date.now();
  saveData();
  
  const popup = document.getElementById("employeePopup");
  if (popup && !popup.classList.contains("hidden")) {
    const currentRange = getDateRange();
renderEmployeeList(currentRange);
  }
  updateManagerTotalSalary();
  
  if (typeof syncToFirebase === 'function') {
    setTimeout(() => syncToFirebase(), 100);
  }
  
  console.log("✅ Đã cập nhật nghỉ, UI đã refresh");
};


// Thêm tăng ca (có force refresh)
window.addOvertimeOnDate = function(employeeId) {
  console.log("🔵 addOvertimeOnDate - employeeId:", employeeId);
  const selectEl = document.getElementById(`dateSelect_${employeeId}`);
  if (!selectEl) { showToast("❌ Không tìm thấy bộ chọn ngày"); return; }
  const selectedDate = selectEl.value;
  if (!selectedDate) { showToast("❌ Vui lòng chọn ngày"); return; }
  
  const employee = appData.employees.find(e => e.id === employeeId);
  if (!employee) { showToast("❌ Không tìm thấy nhân viên"); return; }
  
  if (!employee.overtimeHistory) employee.overtimeHistory = {};
  if (!employee.absentHistory) employee.absentHistory = {};
  
  if (employee.absentHistory[selectedDate]) {
    showToast(`⚠️ Ngày ${formatDisplayDate2(selectedDate)} đã là nghỉ, không thể tăng ca`);
    return;
  }
  
  if (employee.overtimeHistory[selectedDate]) {
    delete employee.overtimeHistory[selectedDate];
    showToast(`✓ Đã bỏ tăng ca ngày ${formatDisplayDate2(selectedDate)}`);
  } else {
    employee.overtimeHistory[selectedDate] = true;
    showToast(`✓ Đã thêm tăng ca ngày ${formatDisplayDate2(selectedDate)}`);
  }
  
  employee.updatedAt = Date.now();
  saveData();
  
  // Cập nhật tổng lương trên manager box
  updateManagerTotalSalary();
  
  // Force refresh popup nếu đang mở
  forceRefreshEmployeePopup();
  
  // Đồng bộ Firebase
  if (typeof syncToFirebase === 'function') setTimeout(() => syncToFirebase(), 100);
  console.log("✅ Tăng ca đã xử lý");
};

// Thêm nghỉ (có force refresh)
window.addAbsentOnDate = function(employeeId) {
  console.log("🔵 addAbsentOnDate - employeeId:", employeeId);
  const selectEl = document.getElementById(`dateSelect_${employeeId}`);
  if (!selectEl) { showToast("❌ Không tìm thấy bộ chọn ngày"); return; }
  const selectedDate = selectEl.value;
  if (!selectedDate) { showToast("❌ Vui lòng chọn ngày"); return; }
  
  const employee = appData.employees.find(e => e.id === employeeId);
  if (!employee) { showToast("❌ Không tìm thấy nhân viên"); return; }
  
  if (!employee.overtimeHistory) employee.overtimeHistory = {};
  if (!employee.absentHistory) employee.absentHistory = {};
  
  if (employee.overtimeHistory[selectedDate]) {
    showToast(`⚠️ Ngày ${formatDisplayDate2(selectedDate)} đã là tăng ca, không thể nghỉ`);
    return;
  }
  
  if (employee.absentHistory[selectedDate]) {
    delete employee.absentHistory[selectedDate];
    showToast(`✓ Đã bỏ nghỉ ngày ${formatDisplayDate2(selectedDate)}`);
  } else {
    employee.absentHistory[selectedDate] = true;
    showToast(`✓ Đã thêm nghỉ ngày ${formatDisplayDate2(selectedDate)}`);
  }
  
  employee.updatedAt = Date.now();
  saveData();
  updateManagerTotalSalary();
  forceRefreshEmployeePopup();
  if (typeof syncToFirebase === 'function') setTimeout(() => syncToFirebase(), 100);
  console.log("✅ Nghỉ đã xử lý");
};

// Xóa một mục lịch sử
window.removeHistoryItem = function(employeeId, type, date) {
  console.log("🔵 removeHistoryItem -", { employeeId, type, date });
  const employee = appData.employees.find(e => e.id === employeeId);
  if (!employee) { showToast("❌ Không tìm thấy nhân viên"); return; }
  
  if (type === 'overtime') {
    if (employee.overtimeHistory && employee.overtimeHistory[date]) {
      delete employee.overtimeHistory[date];
      showToast(`✓ Đã xóa tăng ca ngày ${formatDisplayDate2(date)}`);
    }
  } else if (type === 'absent') {
    if (employee.absentHistory && employee.absentHistory[date]) {
      delete employee.absentHistory[date];
      showToast(`✓ Đã xóa nghỉ ngày ${formatDisplayDate2(date)}`);
    }
  }
  
  employee.updatedAt = Date.now();
  saveData();
  updateManagerTotalSalary();
  forceRefreshEmployeePopup();
  if (typeof syncToFirebase === 'function') setTimeout(() => syncToFirebase(), 100);
};

// Reset tháng
window.resetEmployeeHistory = function(employeeId) {
  const employee = appData.employees.find(e => e.id === employeeId);
  if (!employee) { showToast("❌ Không tìm thấy nhân viên"); return; }
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  const monthPrefix = `${currentYear}-${currentMonth}`;
  
  if (!confirm(`Reset lịch sử của "${employee.name}" trong tháng này?`)) return;
  
  if (employee.overtimeHistory) {
    Object.keys(employee.overtimeHistory).forEach(date => {
      if (date.startsWith(monthPrefix)) delete employee.overtimeHistory[date];
    });
  }
  if (employee.absentHistory) {
    Object.keys(employee.absentHistory).forEach(date => {
      if (date.startsWith(monthPrefix)) delete employee.absentHistory[date];
    });
  }
  
  employee.updatedAt = Date.now();
  saveData();
  updateManagerTotalSalary();
  forceRefreshEmployeePopup();
  showToast(`✓ Đã reset lịch sử tháng này của ${employee.name}`);
  if (typeof syncToFirebase === 'function') setTimeout(() => syncToFirebase(), 100);
};
// ========== FORCE REFRESH POPUP NHÂN VIÊN ==========
function forceRefreshEmployeePopup() {
  console.log("🔄 Force refresh employee popup...");
  
  const popup = document.getElementById("employeePopup");
  if (!popup || popup.classList.contains("hidden")) {
    console.log("Popup không mở, bỏ qua");
    return;
  }
  
  // Gọi lại renderEmployeeList để cập nhật nội dung
  if (typeof renderEmployeeList === 'function') {
    const currentRange = getDateRange();
renderEmployeeList(currentRange);
  } else {
    console.error("renderEmployeeList không tồn tại");
  }
  
  // Kiểm tra xem container có thay đổi không
  const container = document.getElementById("employeeList");
  if (container) {
    console.log("Container innerHTML length:", container.innerHTML.length);
  }
}
// Thoát HTML
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

// Điều chỉnh ngày công (có đồng bộ)
window.adjustWorkDays = function(id, change) {
  const employee = appData.employees.find(e => e.id === id);
  if (!employee) return;
  
  if (change === 'reset') {
    employee.workDays = 0;
  } else {
    let newDays = (employee.workDays || 0) + change;
    if (newDays < 0) newDays = 0;
    employee.workDays = newDays;
  }
  
  employee.updatedAt = Date.now();
  saveData();
  const currentRange = getDateRange();
renderEmployeeList(currentRange);
  updateManagerTotalSalary();
  
  // Đồng bộ lên Firebase
  if (typeof syncToFirebase === 'function') {
    setTimeout(() => syncToFirebase(), 100);
  }
  
  showToast(`✓ ${employee.name}: ${employee.workDays} ngày công → ${formatMoney(calculateEmployeeSalary(employee))}`);
};

// ========== SỬA NHÂN VIÊN (POPUP) - HOÀN CHỈNH ==========
let editingEmployeeId = null;

window.editEmployeeSimple = function(id) {
  const employee = appData.employees.find(e => e.id === id);
  if (!employee) {
    showToast("❌ Không tìm thấy nhân viên");
    return;
  }
  
  editingEmployeeId = id;
  
  // Điền dữ liệu vào popup
  const nameInput = document.getElementById("editEmployeeName");
  const salaryInput = document.getElementById("editEmployeeSalary");
  const rewardCheckbox = document.getElementById("editEmployeeRewardEnabled");
  
  if (nameInput) nameInput.value = employee.name;
  if (salaryInput) salaryInput.value = employee.salaryPerDay?.toLocaleString("vi-VN") || "";
  if (rewardCheckbox) rewardCheckbox.checked = employee.rewardEnabled === true;
  
  openPopup("editEmployeePopup");
};

// Xử lý nút Lưu trong popup sửa (chỉ đăng ký một lần)
const saveEditEmployeeBtn = document.getElementById("saveEditEmployeeBtn");
if (saveEditEmployeeBtn) {
  // Gỡ bỏ event cũ nếu có (tránh trùng)
  const newSaveBtn = saveEditEmployeeBtn.cloneNode(true);
  saveEditEmployeeBtn.parentNode.replaceChild(newSaveBtn, saveEditEmployeeBtn);
  
  newSaveBtn.onclick = () => {
    // Lấy dữ liệu từ form
    const newName = document.getElementById("editEmployeeName")?.value.trim();
    let newSalaryRaw = document.getElementById("editEmployeeSalary")?.value;
    const rewardEnabled = document.getElementById("editEmployeeRewardEnabled")?.checked || false;
    
    // Kiểm tra tên
    if (!newName) {
      alert("⚠️ Vui lòng nhập tên nhân viên");
      return;
    }
    
    // Parse lương (hỗ trợ số có dấu phẩy, khoảng trắng)
    let newSalary = 0;
    if (newSalaryRaw) {
      const cleanSalary = String(newSalaryRaw).replace(/[^0-9]/g, '');
      newSalary = parseInt(cleanSalary, 10);
    }
    
    // Nếu lương không hợp lệ, giữ nguyên lương cũ
    if (isNaN(newSalary) || newSalary <= 0) {
      const employee = appData.employees.find(e => e.id === editingEmployeeId);
      if (employee && employee.salaryPerDay) {
        newSalary = employee.salaryPerDay;
        alert(`⚠️ Lương không hợp lệ, giữ nguyên giá trị cũ: ${formatMoney(newSalary)}/ngày`);
      } else {
        newSalary = 200000;
        alert(`⚠️ Lương không hợp lệ, đặt mặc định 200,000đ/ngày`);
      }
    }
    
    // Tìm nhân viên và cập nhật
    const employee = appData.employees.find(e => e.id === editingEmployeeId);
    if (employee) {
      employee.name = newName;
      employee.salaryPerDay = newSalary;
      employee.rewardEnabled = rewardEnabled;
      employee.updatedAt = Date.now();
      saveData();
      
      if (rewardEnabled && typeof calculateDailyBonusForMonth === 'function') {
  const range = getDateRange();
  const { year, month } = getYearMonthFromRange(range);
  calculateDailyBonusForMonth(employee, year, month);
  saveData();
}
      
      // Refresh UI
      const currentRange = getDateRange();
      if (typeof renderEmployeeList === 'function') renderEmployeeList(currentRange);
      if (typeof updateManagerTotalSalary === 'function') updateManagerTotalSalary();
      
      // Đồng bộ Firebase
      if (typeof syncToFirebase === 'function') setTimeout(() => syncToFirebase(), 100);
      
      showToast(`✓ Đã cập nhật: ${newName} (${formatMoney(newSalary)}/ngày) ${rewardEnabled ? '🏆 Đã bật thưởng' : ''}`);
    } else {
      showToast("❌ Không tìm thấy nhân viên để cập nhật");
    }
    
    closePopup("editEmployeePopup");
    editingEmployeeId = null;
  };
}


// ========== HÀM TÍNH THEO KỲ (RANGE) ==========
function getDaysInRange(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let count = 0;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) count++;
  return count;
}

// Tính số ngày công thực tế trong một khoảng thời gian (start -> end)
function calculateActualWorkDaysInRange(overtimeHistory, absentHistory, startDate, endDate) {
  let overtimeCount = 0;
  let absentCount = 0;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    if (overtimeHistory && overtimeHistory[dateStr]) overtimeCount++;
    if (absentHistory && absentHistory[dateStr]) absentCount++;
  }
  
  const daysInRange = getDaysInRange(startDate, endDate);
  const workDays = daysInRange - absentCount;               // Số ngày có mặt (kể cả tăng ca)
  const actualWorkDays = workDays + overtimeCount;         // Tổng ngày công (thưởng tăng ca)
  
  return {
    workDays: workDays,
    overtimeDays: overtimeCount,
    absentDays: absentCount,
    actualWorkDays: actualWorkDays
  };
}

// Tính lương nhân viên cho một tháng cụ thể (year, month)
function calculateEmployeeSalaryForMonth(emp, year, month) {
  // Tạo range của tháng (01/MM/YYYY -> cuối tháng)
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];
  
  const stats = calculateActualWorkDaysInRange(emp.overtimeHistory, emp.absentHistory, startStr, endStr);
  const salary = stats.actualWorkDays * (emp.salaryPerDay || 200000);
  return { ...stats, salary };
}
// ========== XÓA NHÂN VIÊN (CẢ LOCAL VÀ FIREBASE) ==========
window.deleteEmployee = function(id) {
  const employee = appData.employees.find(e => e.id === id);
  if (!employee) {
    showToast("❌ Không tìm thấy nhân viên");
    return;
  }
  
  if (confirm(`Bạn có chắc muốn xóa nhân viên "${employee.name}"?`)) {
    // 1. Xóa khỏi local (UI ngay lập tức)
    appData.employees = appData.employees.filter(e => e.id !== id);
    saveData();
    const currentRange = getDateRange();
renderEmployeeList(currentRange);
    updateManagerTotalSalary();
    showToast(`✓ Đã xóa: ${employee.name}`);
    
    // 2. Xóa khỏi Firebase (đồng bộ sang các máy khác)
    if (typeof firebase !== 'undefined' && firebase.database) {
      const empRef = database.ref(`cafeData/${STORE_ID}/employees/${id}`);
      empRef.remove()
        .then(() => console.log(`✅ Đã xóa nhân viên ${id} trên Firebase`))
        .catch(err => console.error("❌ Lỗi xóa Firebase:", err));
    } else if (typeof syncToFirebase === 'function') {
      // Fallback: đồng bộ toàn bộ employees (cách này chậm hơn nhưng vẫn hoạt động)
      setTimeout(() => syncToFirebase(), 100);
    }
  }
};

// ========== SỰ KIỆN THÊM NHÂN VIÊN (DÙNG PROMPT) ==========
const addEmployeeBtnSimple = document.getElementById("addEmployeeBtnSimple");
if (addEmployeeBtnSimple) {
  addEmployeeBtnSimple.onclick = () => {
    // Prompt nhập tên
    let name = prompt("👤 Nhập tên nhân viên:");
    if (!name || name.trim() === "") {
      alert("⚠️ Vui lòng nhập tên");
      return;
    }
    name = name.trim();
    
    // Prompt nhập lương/ngày (mặc định 200,000)
    let salaryInput = prompt("💰 Lương mỗi ngày (VNĐ):", "200000");
    let salaryPerDay = parseMoney(salaryInput);
    if (isNaN(salaryPerDay) || salaryPerDay <= 0) {
      salaryPerDay = 200000;
      alert("⚠️ Lương không hợp lệ, đặt mặc định 200,000đ/ngày");
    }
    
    // Kiểm tra trùng tên
    if (appData.employees.some(e => e.name.toLowerCase() === name.toLowerCase())) {
      alert("⚠️ Nhân viên này đã tồn tại!");
      return;
    }
    
    const newEmployee = {
      id: createId("emp"),
      name: name,
      salaryPerDay: salaryPerDay,
      overtimeHistory: {},
      absentHistory: {},
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    appData.employees.push(newEmployee);
    saveData();
    const currentRange = getDateRange();
renderEmployeeList(currentRange);
    updateManagerTotalSalary();
    
    if (typeof syncToFirebase === 'function') {
      setTimeout(() => syncToFirebase(), 100);
    }
    
    showToast(`✓ Đã thêm nhân viên: ${name} (${formatMoney(salaryPerDay)}/ngày)`);
  };
}



// ========== MỞ POPUP ==========
const employeeBox = document.getElementById("employeeBox");
if (employeeBox) {
  employeeBox.onclick = () => {
    const currentRange = getDateRange();  // Lấy range đang chọn
    renderEmployeeList(currentRange);
    openPopup("employeePopup");
  };
}

// ========== CẬP NHẬT VÀO RENDER DASHBOARD ==========
const originalRenderEmp = renderManagerDashboard;
renderManagerDashboard = function() {
  originalRenderEmp();
  updateManagerTotalSalary();
};

// ========== THÊM POPUP SỬA (nếu chưa có trong HTML) ==========
// Kiểm tra và thêm popup sửa nếu chưa tồn tại
if (!document.getElementById("editEmployeePopup")) {
  const editPopupHtml = `
    <div class="popup hidden" id="editEmployeePopup">
      <div class="popup-content" style="max-width: 300px;">
        <div class="popup-header">
          <h2>✏️ Sửa nhân viên</h2>
          <button class="close-btn" data-close="editEmployeePopup">✕</button>
        </div>
        <div class="popup-body">
          <input type="text" id="editEmployeeName" placeholder="Tên nhân viên" style="width: 100%; padding: 10px; margin-bottom: 12px;">
          <input type="text" id="editEmployeeSalary" placeholder="Lương/ngày" style="width: 100%; padding: 10px; margin-bottom: 16px;" inputmode="numeric">
          <button id="saveEditEmployeeBtn" class="primary-btn" style="width: 100%;">💾 Lưu</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', editPopupHtml);
}

// Lấy năm và tháng dương lịch từ range (dựa vào ngày bắt đầu)
function getYearMonthFromRange(range) {
  if (!range || !range.start) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }
  const startDate = new Date(range.start);
  const year = startDate.getFullYear();
  const month = startDate.getMonth() + 1;
  return { year, month };
}