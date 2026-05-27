// ========== TELEGRAM BOT - GỬI BÁO CÁO ĐẦY ĐỦ ==========

const TELEGRAM_BOT_TOKEN = "8813111415:AAHjX0-vXMM0dVgVqDSSZNbHtiQ2wiVsFrc";
const TELEGRAM_CHAT_ID = "6372876364";

// ========== HÀM GỬI TIN NHẮN CƠ BẢN ==========
async function sendTelegramMessage(message) {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });
    
    const result = await response.json();
    
    if (result.ok) {
      console.log("✅ Đã gửi báo cáo qua Telegram");
      return true;
    } else {
      console.error("❌ Lỗi gửi Telegram:", result.description);
      return false;
    }
  } catch (error) {
    console.error("❌ Lỗi kết nối Telegram:", error);
    return false;
  }
}

// ========== TÍNH TOÁN KỲ (20 → 19 tháng sau) ==========
function getCurrentPeriod() {
  const today = new Date();
  let start, end;
  
  if (today.getDate() >= 20) {
    start = new Date(today.getFullYear(), today.getMonth(), 20);
    end = new Date(today.getFullYear(), today.getMonth() + 1, 19);
  } else {
    start = new Date(today.getFullYear(), today.getMonth() - 1, 20);
    end = new Date(today.getFullYear(), today.getMonth(), 19);
  }
  
  return { start, end };
}

function getPeriodByDate(date) {
  let start, end;
  if (date.getDate() >= 20) {
    start = new Date(date.getFullYear(), date.getMonth(), 20);
    end = new Date(date.getFullYear(), date.getMonth() + 1, 19);
  } else {
    start = new Date(date.getFullYear(), date.getMonth() - 1, 20);
    end = new Date(date.getFullYear(), date.getMonth(), 19);
  }
  return { start, end };
}

function formatPeriodDate(date) {
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

// ========== LẤY DỮ LIỆU TRONG KỲ (ĐẦY ĐỦ) ==========
function getDataInPeriod(startDate, endDate) {
  const reports = {};
  let totalCash = 0;
  let totalBank = 0;
  let totalReserve = 0;
  let totalRevenue = 0;
  let totalGrab = 0;
  const dailyDetails = [];
  
  // Lọc reports trong kỳ
  Object.entries(appData.reports).forEach(([date, report]) => {
    const d = new Date(date);
    if (d >= startDate && d <= endDate) {
      reports[date] = report;
      totalCash += report.cash || 0;
      totalBank += report.bank || 0;
      totalReserve += report.reserve || 0;
      totalRevenue += report.revenue || 0;
      totalGrab += report.grab || 0;
      dailyDetails.push({
        date: date,
        cash: report.cash || 0,
        bank: report.bank || 0,
        reserve: report.reserve || 0,
        revenue: report.revenue || 0,
        grab: report.grab || 0
      });
    }
  });
  
  // Lọc chi phí nhân viên trong kỳ
  const expenses = appData.expenses.filter(x => {
    if (x.deleted) return false;
    const d = new Date(x.date);
    return d >= startDate && d <= endDate;
  });
  
  // Lọc chi phí quản lý trong kỳ
  const adminExpenses = appData.adminExpenses.filter(x => {
    if (x.deleted) return false;
    const d = new Date(x.date);
    return d >= startDate && d <= endDate;
  });
  
  // Lọc công nợ phát sinh trong kỳ
  const debtsInPeriod = appData.debtTransactions.filter(x => {
    if (x.deleted) return false;
    if (x.type !== "debt_add") return false;
    const d = new Date(x.date);
    return d >= startDate && d <= endDate;
  });
  
  // Lọc thanh toán trong kỳ
  const paymentsInPeriod = appData.debtTransactions.filter(x => {
    if (x.deleted) return false;
    if (x.type !== "payment") return false;
    const d = new Date(x.date);
    return d >= startDate && d <= endDate;
  });
  
  // Tính tổng
  const totalDebtInPeriod = debtsInPeriod.reduce((sum, d) => sum + d.amount, 0);
  const totalPaymentsInPeriod = paymentsInPeriod.reduce((sum, p) => sum + p.amount, 0);
  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalAdminExpense = adminExpenses.reduce((sum, e) => sum + e.amount, 0);
  
  // Tính thực thu (tiền mặt + chuyển khoản - giao quỹ)
  const actualIncome = totalCash + totalBank - totalReserve;
  
  // Tính lợi nhuận gộp (thực thu - chi phí NV - Grab)
  const grossProfit = actualIncome - totalExpense - totalGrab;
  
  // Tính lợi nhuận ròng (sau khi trừ chi phí quản lý)
  const netProfit = grossProfit - totalAdminExpense;
  
  return {
    reports,
    dailyDetails,
    totalCash,
    totalBank,
    totalReserve,
    totalRevenue,
    totalGrab,
    actualIncome,
    expenses,
    totalExpense,
    adminExpenses,
    totalAdminExpense,
    debtsInPeriod,
    totalDebtInPeriod,
    paymentsInPeriod,
    totalPaymentsInPeriod,
    grossProfit,
    netProfit,
    startDate,
    endDate
  };
}

// ========== TẠO BÁO CÁO KỲ (ĐẦY ĐỦ) ==========
function formatPeriodReport(data, periodName) {
  const startStr = formatPeriodDate(data.startDate);
  const endStr = formatPeriodDate(data.endDate);
  
  let message = `📊 <b>BÁO CÁO KỲ ${periodName}</b>\n`;
  message += `<i>${startStr} → ${endStr}</i>\n`;
  message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  // SỐ NGÀY LÀM VIỆC
  const workingDays = Object.keys(data.reports).length;
  message += `📅 <b>THỐNG KÊ</b>\n`;
  message += `├ Số ngày báo cáo: <b>${workingDays} ngày</b>\n`;
  message += `└ Ngày cuối: <b>${formatPeriodDate(new Date(data.endDate))}</b>\n\n`;
  
  // DOANH THU (NHẬP THỦ CÔNG)
  message += `💰 <b>DOANH THU TOÀN KỲ</b>\n`;
  message += `├ 💰 Doanh thu (nhập): <b>${formatMoney(data.totalRevenue)}</b>\n`;
  message += `├ 💵 Tiền mặt: <b>${formatMoney(data.totalCash)}</b>\n`;
  message += `├ 🏦 Chuyển khoản: <b>${formatMoney(data.totalBank)}</b>\n`;
  message += `├ 🚕 Grab: <b>${formatMoney(data.totalGrab)}</b>\n`;
  message += `└ 📦 Giao quỹ: <b>${formatMoney(data.totalReserve)}</b>\n\n`;
  
  // THỰC THU
  message += `💵 <b>THỰC THU</b>\n`;
  message += `└ 💰 Thực thu (TM+CK-GQ): <b>${formatMoney(data.actualIncome)}</b>\n\n`;
  
  // CHI PHÍ
  message += `📉 <b>CHI PHÍ TOÀN KỲ</b>\n`;
  
  // Chi phí nhân viên
  if (data.expenses.length > 0) {
    const expenseGroups = {};
    data.expenses.forEach(exp => {
      if (!expenseGroups[exp.name]) {
        expenseGroups[exp.name] = { total: 0, qty: 0 };
      }
      expenseGroups[exp.name].total += exp.amount;
      expenseGroups[exp.name].qty += exp.qty || 0;
    });
    
    message += `├ 📋 Chi phí NV (${data.expenses.length} khoản): <b>${formatMoney(data.totalExpense)}</b>\n`;
    const sortedExpenses = Object.entries(expenseGroups).sort((a,b) => b[1].total - a[1].total);
    let i = 1;
    for (const [name, expData] of sortedExpenses.slice(0, 5)) {
      const prefix = i === Math.min(sortedExpenses.length, 5) ? '│  └' : '│  ├';
      const qtyText = expData.qty > 0 ? ` (${expData.qty})` : '';
      message += `│  ${prefix} ${name}${qtyText}: ${formatMoney(expData.total)}\n`;
      i++;
    }
    if (sortedExpenses.length > 5) {
      message += `│  └ ... và ${sortedExpenses.length - 5} khoản khác\n`;
    }
  } else {
    message += `├ 📋 Chi phí NV: <b>0đ</b>\n`;
  }
  
  // Chi phí quản lý
  if (data.adminExpenses.length > 0) {
    const adminExpenseGroups = {};
    data.adminExpenses.forEach(exp => {
      if (!adminExpenseGroups[exp.name]) {
        adminExpenseGroups[exp.name] = 0;
      }
      adminExpenseGroups[exp.name] += exp.amount;
    });
    
    message += `├ 🏢 Chi phí Quản lý (${data.adminExpenses.length} khoản): <b>${formatMoney(data.totalAdminExpense)}</b>\n`;
    const sortedAdminExpenses = Object.entries(adminExpenseGroups).sort((a,b) => b[1] - a[1]);
    let i = 1;
    for (const [name, amount] of sortedAdminExpenses.slice(0, 3)) {
      const prefix = i === Math.min(sortedAdminExpenses.length, 3) ? '│  └' : '│  ├';
      message += `│  ${prefix} ${name}: ${formatMoney(amount)}\n`;
      i++;
    }
    if (sortedAdminExpenses.length > 3) {
      message += `│  └ ... và ${sortedAdminExpenses.length - 3} khoản khác\n`;
    }
  } else {
    message += `├ 🏢 Chi phí Quản lý: <b>0đ</b>\n`;
  }
  
  // Grab đã hiển thị ở phần DOANH THU
  message += `└ 🚕 Grab: <b>${formatMoney(data.totalGrab)}</b>\n\n`;
  
  // CÔNG NỢ PHÁT SINH
  message += `📊 <b>CÔNG NỢ PHÁT SINH</b>\n`;
  if (data.debtsInPeriod.length > 0) {
    message += `├ Số giao dịch nợ mới: <b>${data.debtsInPeriod.length}</b>\n`;
    message += `├ Tổng nợ mới: <b>${formatMoney(data.totalDebtInPeriod)}</b>\n`;
    message += `├ Số thanh toán: <b>${data.paymentsInPeriod.length}</b>\n`;
    message += `└ Tổng thanh toán: <b>${formatMoney(data.totalPaymentsInPeriod)}</b>\n`;
    
    // Hiển thị top 5 khách nợ nhiều nhất
    const debtByCustomer = {};
    data.debtsInPeriod.forEach(debt => {
      if (!debtByCustomer[debt.customer]) {
        debtByCustomer[debt.customer] = 0;
      }
      debtByCustomer[debt.customer] += debt.amount;
    });
    const topDebtors = Object.entries(debtByCustomer).sort((a,b) => b[1] - a[1]).slice(0, 5);
    if (topDebtors.length > 0) {
      message += `\n   <i>Top khách nợ mới:</i>\n`;
      topDebtors.forEach(([customer, amount], idx) => {
        const prefix = idx === topDebtors.length - 1 ? '   └' : '   ├';
        message += `${prefix} ${customer}: ${formatMoney(amount)}\n`;
      });
    }
  } else {
    message += `├ Không có công nợ phát sinh mới\n`;
    if (data.paymentsInPeriod.length > 0) {
      message += `└ Số thanh toán: <b>${data.paymentsInPeriod.length}</b> - Tổng: ${formatMoney(data.totalPaymentsInPeriod)}\n`;
    } else {
      message += `└ Không có thanh toán\n`;
    }
  }
  message += `\n`;
  
  // LỢI NHUẬN
  message += `📈 <b>LỢI NHUẬN</b>\n`;
  message += `├ 💰 Thực thu: <b>${formatMoney(data.actualIncome)}</b>\n`;
  message += `├ 📉 Chi phí NV: <b>-${formatMoney(data.totalExpense)}</b>\n`;
  message += `├ 🚕 Grab: <b>-${formatMoney(data.totalGrab)}</b>\n`;
  message += `├ 📊 Lợi nhuận gộp: <b>${formatMoney(data.grossProfit)}</b>\n`;
  message += `├ 🏢 CP Quản lý: <b>-${formatMoney(data.totalAdminExpense)}</b>\n`;
  message += `└ 📈 LỢI NHUẬN RÒNG: <b>${formatMoney(data.netProfit)}</b>\n\n`;
  
  // CHI TIẾT THEO NGÀY (top 5 ngày doanh thu cao nhất)
  const topDays = [...data.dailyDetails]
    .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
    .slice(0, 5);
  
  if (topDays.length > 0) {
    message += `⭐ <b>TOP NGÀY DOANH THU CAO NHẤT</b>\n`;
    topDays.forEach((day, idx) => {
      const formattedDate = formatDisplayDate(day.date);
      const revenue = day.revenue || 0;
      const prefix = idx === topDays.length - 1 ? '└' : '├';
      message += `${prefix} ${formattedDate}: <b>${formatMoney(revenue)}</b>\n`;
    });
    message += `\n`;
  }
  
  message += `━━━━━━━━━━━━━━━━━━━━\n`;
  message += `☕ <b>MILANO COFFEE 259</b>\n`;
  message += `🕐 ${new Date().toLocaleString('vi-VN')}`;
  
  return message;
}

// ========== GỬI BÁO CÁO NGÀY (ĐẦY ĐỦ) ==========
async function sendFullReport(date, report, expenses, debts, debtTransactions) {
  const formattedDate = formatDisplayDate(date);
  const dayName = new Date(date).toLocaleDateString('vi-VN', { weekday: 'long' });
  
  // Tính tổng thanh toán trong ngày
  const paymentsInDay = debtTransactions.filter(x => 
    x.date === date && x.type === "payment" && !x.deleted
  );
  const totalPayments = paymentsInDay.reduce((sum, p) => sum + p.amount, 0);
  
  let message = `📊 <b>BÁO CÁO CHI TIẾT NGÀY ${formattedDate}</b>\n`;
  message += `<i>${dayName}</i>\n`;
  message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  // DOANH THU
  message += `💰 <b>DOANH THU</b>\n`;
  message += `├ 💰 Doanh thu (nhập): <b>${formatMoney(report.revenue || 0)}</b>\n`;
  message += `├ 💵 Tiền mặt: <b>${formatMoney(report.cash || 0)}</b>\n`;
  message += `├ 🏦 Chuyển khoản: <b>${formatMoney(report.bank || 0)}</b>\n`;
  message += `├ 🚕 Grab: <b>${formatMoney(report.grab || 0)}</b>\n`;
  message += `└ 📦 Giao quỹ: <b>${formatMoney(report.reserve || 0)}</b>\n\n`;
  
  // CHI PHÍ NHÂN VIÊN
  if (expenses && expenses.length > 0) {
    message += `📉 <b>CHI PHÍ (${expenses.length} khoản)</b>\n`;
    const expenseGroups = {};
    expenses.forEach(exp => {
      if (!expenseGroups[exp.name]) {
        expenseGroups[exp.name] = { total: 0, qty: 0 };
      }
      expenseGroups[exp.name].total += exp.amount;
      expenseGroups[exp.name].qty += exp.qty || 0;
    });
    
    let i = 1;
    for (const [name, data] of Object.entries(expenseGroups)) {
      const prefix = i === Object.keys(expenseGroups).length ? '└' : '├';
      const qtyText = data.qty > 0 ? ` (${data.qty})` : '';
      message += `${prefix} ${name}${qtyText}: <b>${formatMoney(data.total)}</b>\n`;
      i++;
    }
    message += `\n`;
  } else {
    message += `📉 <b>CHI PHÍ</b>\n└ Không có chi phí\n\n`;
  }
  
  // CÔNG NỢ PHÁT SINH
  if (debts && debts.length > 0) {
    message += `📊 <b>CÔNG NỢ PHÁT SINH (${debts.length} khoản)</b>\n`;
    let i = 1;
    for (const debt of debts) {
      const prefix = i === debts.length ? '└' : '├';
      message += `${prefix} 👤 ${debt.customer}: <b>+${formatMoney(debt.amount)}</b>\n`;
      if (debt.note) message += `   📝 ${debt.note.substring(0, 50)}\n`;
      i++;
    }
    message += `\n`;
  } else {
    message += `📊 <b>CÔNG NỢ PHÁT SINH</b>\n└ Không có công nợ mới\n\n`;
  }
  
  // THANH TOÁN TRONG NGÀY
  if (paymentsInDay.length > 0) {
    message += `💰 <b>THANH TOÁN TRONG NGÀY (${paymentsInDay.length} khoản)</b>\n`;
    let i = 1;
    for (const payment of paymentsInDay) {
      const prefix = i === paymentsInDay.length ? '└' : '├';
      const method = payment.method === 'TM' ? '💵 TM' : '🏦 CK';
      message += `${prefix} 👤 ${payment.customer}: <b>-${formatMoney(payment.amount)}</b> (${method})\n`;
      i++;
    }
    message += `\n`;
  }
  
  // TỔNG KẾT
  const expenseTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
  const debtTotal = debts.reduce((sum, d) => sum + d.amount, 0);
  const actualIncome = (report.cash || 0) + (report.bank || 0) - (report.reserve || 0);
  const grossProfit = actualIncome - expenseTotal - (report.grab || 0);
  
  message += `📈 <b>TỔNG KẾT</b>\n`;
  message += `├ 💰 Thực thu: <b>${formatMoney(actualIncome)}</b>\n`;
  message += `├ 📉 Chi phí NV: <b>-${formatMoney(expenseTotal)}</b>\n`;
  message += `├ 🚕 Grab: <b>-${formatMoney(report.grab || 0)}</b>\n`;
  message += `├ 📊 Lợi nhuận gộp: <b>${formatMoney(grossProfit)}</b>\n`;
  message += `├ 🧾 Công nợ mới: <b>+${formatMoney(debtTotal)}</b>\n`;
  message += `├ 💰 Thanh toán: <b>-${formatMoney(totalPayments)}</b>\n`;
  message += `└ 📅 Ngày chốt: ${formattedDate}\n\n`;
  
  message += `━━━━━━━━━━━━━━━━━━━━\n`;
  message += `☕ <b>MILANO COFFEE 259</b>\n`;
  message += `🕐 ${new Date().toLocaleString('vi-VN')}`;
  
  return await sendTelegramMessage(message);
}

// ========== GỬI BÁO CÁO NHANH (RÚT GỌN) ==========
async function sendQuickReport(date, report, expenseTotal, debtTotal) {
  const formattedDate = formatDisplayDate(date);
  const dayName = new Date(date).toLocaleDateString('vi-VN', { weekday: 'long' });
  
  let message = `📊 <b>BÁO CÁO NGÀY ${formattedDate}</b>\n`;
  message += `<i>${dayName}</i>\n`;
  message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  message += `💰 <b>DOANH THU</b>\n`;
  message += `├ 💰 Nhập: <b>${formatMoney(report.revenue || 0)}</b>\n`;
  message += `├ 💵 Tiền mặt: <b>${formatMoney(report.cash || 0)}</b>\n`;
  message += `├ 🏦 Chuyển khoản: <b>${formatMoney(report.bank || 0)}</b>\n`;
  message += `├ 🚕 Grab: <b>${formatMoney(report.grab || 0)}</b>\n`;
  message += `└ 📦 Giao quỹ: <b>${formatMoney(report.reserve || 0)}</b>\n\n`;
  
  message += `📉 <b>CHI PHÍ</b>\n`;
  message += `└ 💸 Tổng chi phí: <b>${formatMoney(expenseTotal)}</b>\n\n`;
  
  message += `📊 <b>CÔNG NỢ</b>\n`;
  message += `└ 🧾 Công nợ phát sinh: <b>${formatMoney(debtTotal)}</b>\n\n`;
  
  const actualIncome = (report.cash || 0) + (report.bank || 0) - (report.reserve || 0);
  const profit = actualIncome - expenseTotal - (report.grab || 0);
  
  message += `📈 <b>TỔNG KẾT</b>\n`;
  message += `├ 💰 Thực thu: <b>${formatMoney(actualIncome)}</b>\n`;
  message += `├ 📉 Lợi nhuận: <b>${formatMoney(profit)}</b>\n`;
  message += `└ 📅 Ngày chốt: ${formattedDate}\n\n`;
  
  message += `━━━━━━━━━━━━━━━━━━━━\n`;
  message += `☕ <b>MILANO COFFEE 259</b>\n`;
  message += `🕐 ${new Date().toLocaleString('vi-VN')}`;
  
  return await sendTelegramMessage(message);
}

// ========== GỬI BÁO CÁO KỲ ==========
async function sendPeriodReport() {
  const { start, end } = getCurrentPeriod();
  const periodName = `${start.getMonth() + 1}/${start.getFullYear()} - ${end.getMonth() + 1}/${end.getFullYear()}`;
  
  console.log(`📊 Đang tạo báo cáo kỳ: ${formatPeriodDate(start)} → ${formatPeriodDate(end)}`);
  
  const data = getDataInPeriod(start, end);
  const message = formatPeriodReport(data, periodName);
  
  return await sendTelegramMessage(message);
}

// ========== GỬI BÁO CÁO KỲ THEO NGÀY CỤ THỂ ==========
async function sendPeriodReportByDate(date) {
  const targetDate = new Date(date);
  const { start, end } = getPeriodByDate(targetDate);
  const periodName = `${start.getMonth() + 1}/${start.getFullYear()} - ${end.getMonth() + 1}/${end.getFullYear()}`;
  
  console.log(`📊 Đang tạo báo cáo kỳ: ${formatPeriodDate(start)} → ${formatPeriodDate(end)}`);
  
  const data = getDataInPeriod(start, end);
  const message = formatPeriodReport(data, periodName);
  
  return await sendTelegramMessage(message);
}

// ========== KIỂM TRA VÀ GỬI BÁO CÁO TỰ ĐỘNG ==========
async function checkAndSendAutoPeriodReport() {
  const today = new Date();
  const todayDate = today.getDate();
  const lastSentDate = localStorage.getItem('lastPeriodReportSent');
  const todayStr = today.toISOString().split('T')[0];
  
  if (todayDate === 20 && lastSentDate !== todayStr) {
    console.log("📅 Hôm nay là ngày 20, đang tạo báo cáo kỳ tự động...");
    
    const endDate = new Date(today.getFullYear(), today.getMonth(), 19);
    const startDate = new Date(today.getFullYear(), today.getMonth() - 1, 20);
    
    const data = getDataInPeriod(startDate, endDate);
    const periodName = `${startDate.getMonth() + 1}/${startDate.getFullYear()} - ${endDate.getMonth() + 1}/${endDate.getFullYear()}`;
    const message = formatPeriodReport(data, periodName);
    
    const sent = await sendTelegramMessage(message);
    
    if (sent) {
      localStorage.setItem('lastPeriodReportSent', todayStr);
      console.log("✅ Đã gửi báo cáo kỳ tự động");
    }
    
    return sent;
  }
  
  return false;
}

// ========== GỬI THÔNG BÁO ĐƠN GIẢN ==========
async function sendSimpleNotification(message) {
  return await sendTelegramMessage(message);
}

// ========== KHỞI TẠO TỰ ĐỘNG GỬI BÁO CÁO ==========
function initAutoPeriodReport() {
  setTimeout(() => {
    checkAndSendAutoPeriodReport();
  }, 5000);
  
  setInterval(() => {
    checkAndSendAutoPeriodReport();
  }, 60 * 60 * 1000);
}

// ========== EXPORT ==========
window.sendTelegramMessage = sendTelegramMessage;
window.sendQuickReport = sendQuickReport;
window.sendFullReport = sendFullReport;
window.sendSimpleNotification = sendSimpleNotification;
window.sendPeriodReport = sendPeriodReport;
window.sendPeriodReportByDate = sendPeriodReportByDate;
window.checkAndSendAutoPeriodReport = checkAndSendAutoPeriodReport;
window.initAutoPeriodReport = initAutoPeriodReport;

// Tự động khởi tạo khi load trang
if (typeof window !== 'undefined') {
  setTimeout(() => {
    initAutoPeriodReport();
  }, 10000);
}