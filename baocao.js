// baocao.js - BÁO CÁO TÀI CHÍNH ĐỘC LẬP - TỐI ƯU TỐC ĐỘ & CACHE
let currentReportMonth = '';
let profitLossData = null;
let comparisonData = null;
let isComparing = false;
let reportDataCache = new Map(); // Đổi tên biến cache

// ==================== KHỞI TẠO ĐỘC LẬP ====================
// ==================== SỬA HÀM TÍNH LƯƠNG CHI TIẾT ====================
async function calculateSalaryForReport(employeeId, month) {
    const cacheKey = getReportCacheKey('salary', month, employeeId);
    const cached = getReportCache(cacheKey);
    if (cached !== null) return cached;

    try {
        const [empDoc, attDoc, bonusSnap, penaltySnap] = await Promise.all([
            db.collection('employees').doc(employeeId).get(),
            db.collection('attendance').doc(`${employeeId}_${month.replace('/', '_')}`).get(),
            db.collection('bonuses_penalties')
                .where('employeeId', '==', employeeId)
                .where('month', '==', month)
                .where('type', '==', 'bonus').get(),
            db.collection('bonuses_penalties')
                .where('employeeId', '==', employeeId)
                .where('month', '==', month)
                .where('type', '==', 'penalty').get()
        ]);

        if (!empDoc.exists) {
            setReportCache(cacheKey, 0);
            return 0;
        }

        const emp = empDoc.data();
        const base = Number(emp.monthlySalary || 0);
        const daily = base / 30;

        // SỬA: Đọc đúng cấu trúc dữ liệu chấm công
        let off = 0, ot = 0;
        if (attDoc.exists) {
            const data = attDoc.data() || {};
            console.log('📊 Dữ liệu chấm công RAW (báo cáo):', data);
            
            // CÁCH 1: Kiểm tra trực tiếp các trường days
            if (data.days) {
                const days = data.days;
                Object.keys(days).forEach(key => {
                    const status = days[key];
                    if (status === 'off') off++;
                    if (status === 'overtime') ot++;
                });
            }
            
            // CÁCH 2: Kiểm tra các trường trực tiếp (days.1, days.2, ...)
            Object.keys(data).forEach(key => {
                if (key.startsWith('days.')) {
                    const status = data[key];
                    if (status === 'off') off++;
                    if (status === 'overtime') ot++;
                }
            });
        }

        const bonus = bonusSnap.docs.reduce((s, d) => {
            const data = d.data();
            return s + Number(data.amount || 0);
        }, 0);
        
        const penalty = penaltySnap.docs.reduce((s, d) => {
            const data = d.data();
            return s + Number(data.amount || 0);
        }, 0);

        const finalSalary = Math.round(base - off * daily + ot * daily + bonus - penalty);
        
        console.log(`💰 Lương ${emp.name}:`, {
            lươngCơBản: base,
            ngàyOff: off,
            tăngCa: ot,
            thưởng: bonus,
            phạt: penalty,
            thựcLãnh: finalSalary
        });
        
        setReportCache(cacheKey, finalSalary);
        return finalSalary;
        
    } catch (err) {
        console.error('Lỗi tính lương (báo cáo):', err);
        setReportCache(cacheKey, 0);
        return 0;
    }
}

// ==================== SỬA HÀM LOAD SALARY DATA ====================
async function loadSalaryData(month) {
    const cacheKey = getReportCacheKey('total_salary', month);
    const cached = getReportCache(cacheKey);
    if (cached !== null) return cached;

    try {
        const snapshot = await db.collection('employees')
            .where('status', '==', 'active')
            .get();

        let totalSalary = 0;
        const salaryDetails = {};

        // SỬA: Dùng for...of để debug từng nhân viên
        for (const doc of snapshot.docs) {
            const employee = doc.data();
            const salary = await calculateSalaryForReport(doc.id, month);
            totalSalary += salary;
            salaryDetails[employee.name] = salary;
            
            console.log(`👤 ${employee.name}: ${formatCurrency(salary)}`);
        }

        const result = {
            total: totalSalary,
            details: salaryDetails
        };
        
        console.log('📋 Tổng chi phí lương:', result);
        
        setReportCache(cacheKey, result);
        return result;
        
    } catch (error) {
        console.error('Error loading salary data:', error);
        const result = { total: 0, details: {} };
        setReportCache(cacheKey, result);
        return result;
    }
}

// ==================== THÊM HÀM DEBUG DỮ LIỆU NHÂN VIÊN ====================
async function debugEmployeeSalaryData() {
    console.log('🐛 Bắt đầu debug dữ liệu lương nhân viên...');
    
    const snapshot = await db.collection('employees')
        .where('status', '==', 'active')
        .get();

    for (const doc of snapshot.docs) {
        const employee = doc.data();
        const employeeId = doc.id;
        
        console.log(`\n🔍 Debug nhân viên: ${employee.name} (${employeeId})`);
        
        // Load tất cả dữ liệu
        const [empDoc, attDoc, bonusSnap, penaltySnap] = await Promise.all([
            db.collection('employees').doc(employeeId).get(),
            db.collection('attendance').doc(`${employeeId}_${currentReportMonth.replace('/', '_')}`).get(),
            db.collection('bonuses_penalties')
                .where('employeeId', '==', employeeId)
                .where('month', '==', currentReportMonth)
                .where('type', '==', 'bonus').get(),
            db.collection('bonuses_penalties')
                .where('employeeId', '==', employeeId)
                .where('month', '==', currentReportMonth)
                .where('type', '==', 'penalty').get()
        ]);

        console.log('📊 Dữ liệu chấm công:', attDoc.exists ? attDoc.data() : 'Không có');
        console.log('🎁 Số lượng thưởng:', bonusSnap.size);
        console.log('⚠️ Số lượng phạt:', penaltySnap.size);
        
        bonusSnap.forEach(doc => console.log('  - Thưởng:', doc.data()));
        penaltySnap.forEach(doc => console.log('  - Phạt:', doc.data()));
    }
    
    alert('✅ Đã debug xong. Kiểm tra Console để xem chi tiết.');
}

// ==================== SỬA MODAL CHI TIẾT LƯƠNG ====================
function showSalaryDetails() {
    if (!profitLossData) return;
    
    const salaryDetails = profitLossData.details.salary?.details || {};
    const total = profitLossData.salaryCost;
    
    let detailsHTML = '';
    let hasData = false;
    
    Object.entries(salaryDetails).forEach(([name, amount]) => {
        if (amount > 0) {
            detailsHTML += `
                <div class="salary-item">
                    <span class="salary-name">${name}</span>
                    <span class="salary-amount">${formatCurrency(amount)}</span>
                    <span class="salary-percentage">${formatPercentage(amount, total)}%</span>
                </div>
            `;
            hasData = true;
        }
    });
    
    createDetailModal(
        '👥 Chi Tiết Chi Phí Nhân Viên',
        `
            <div class="salary-details">
                <div class="salary-total">
                    <div class="total-label">Tổng chi phí lương tháng ${currentReportMonth}</div>
                    <div class="total-value">${formatCurrency(total)}</div>
                </div>
                <div class="salary-list">
                    ${hasData ? detailsHTML : '<div class="empty-state">Không có dữ liệu nhân viên hoặc lương = 0</div>'}
                </div>
                <div class="debug-section">
                    <button class="btn-debug" onclick="debugEmployeeSalaryData()">
                        🐛 Debug Dữ Liệu
                    </button>
                    <small style="color: #666; display: block; margin-top: 5px;">
                        Kiểm tra dữ liệu chấm công, thưởng, phạt trong Console
                    </small>
                </div>
            </div>
        `
    );
}

// ==================== THÊM CSS CHO DEBUG BUTTON ====================
function addReportStyles() {
    if (!document.getElementById('reportStyles')) {
        const styles = `
            .btn-debug {
                background: #ff9800;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.9rem;
                margin-top: 10px;
            }
            .btn-debug:hover {
                background: #f57c00;
            }
            .debug-section {
                margin-top: 15px;
                padding-top: 15px;
                border-top: 1px solid #eee;
                text-align: center;
            }
            .salary-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px;
                border-bottom: 1px solid #f0f0f0;
            }
            .salary-name {
                flex: 1;
                font-weight: 500;
            }
            .salary-amount {
                font-weight: bold;
                color: #2c3e50;
                margin: 0 15px;
            }
            .salary-percentage {
                color: #7f8c8d;
                font-size: 0.9rem;
                min-width: 50px;
                text-align: right;
            }
        `;
        const styleElement = document.createElement('style');
        styleElement.id = 'reportStyles';
        styleElement.textContent = styles;
        document.head.appendChild(styleElement);
    }
}

// ==================== SỬA HÀM KHỞI TẠO ====================
function initializeProfitLossReport() {
    console.log('🚀 Khởi tạo Báo Cáo Tài Chính - Độc lập hoàn toàn');
    currentReportMonth = getCurrentOperationalMonth(new Date());
    
    // Thêm CSS
    addReportStyles();
    
    // Hiển thị loading
    showReportLoading();
    
    // Khởi tạo tuần tự
    setupReportMonthDropdown();
    setupReportEventListeners();
    loadProfitLossReport();
}

// ==================== THÊM EXPORT ====================
window.debugEmployeeSalaryData = debugEmployeeSalaryData;

function showReportLoading() {
    const sections = ['reportSummary', 'comparisonSection'];
    sections.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (section) {
            section.innerHTML = '<div class="loading-state">Đang tải báo cáo...</div>';
        }
    });
}

// ==================== QUẢN LÝ THÁNG - ĐỘC LẬP ====================
function getCurrentOperationalMonth(date) {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    
    return day >= 20 ? 
        `${String(month).padStart(2, '0')}/${year}` :
        `${String(month === 1 ? 12 : month - 1).padStart(2, '0')}/${month === 1 ? year - 1 : year}`;
}

function generateReportMonths(count = 12) {
    const months = [];
    const today = new Date();
    
    for (let i = 0; i < count; i++) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 20);
        const monthValue = getCurrentOperationalMonth(date);
        const monthLabel = formatReportPeriod(monthValue);
        
        if (!months.find(m => m.value === monthValue)) {
            months.push({ value: monthValue, label: monthLabel });
        }
    }
    
    return months;
}

function formatReportPeriod(monthStr) {
    const [m, y] = monthStr.split('/').map(Number);
    const startMonth = m;
    const startYear = y;
    const endMonth = m === 12 ? 1 : m + 1;
    const endYear = m === 12 ? y + 1 : y;
    
    return `20/${String(startMonth).padStart(2, '0')} - 19/${String(endMonth).padStart(2, '0')}/${endYear}`;
}

function setupReportMonthDropdown() {
    const dropdown = document.getElementById('reportMonthSelector');
    if (!dropdown) {
        console.error('❌ Không tìm thấy reportMonthSelector');
        return;
    }

    const months = generateReportMonths(12);
    dropdown.innerHTML = months.map(month => 
        `<option value="${month.value}" ${month.value === currentReportMonth ? 'selected' : ''}>
            ${month.label}
        </option>`
    ).join('');

    dropdown.onchange = () => {
        currentReportMonth = dropdown.value;
        clearReportCache();
        loadProfitLossReport();
    };
}

// ==================== CACHE SYSTEM - TĂNG TỐC ĐỘ ====================
function getReportCacheKey(collection, month, extra = '') {
    return `${collection}_${month}_${extra}`;
}

function setReportCache(key, data, ttl = 5 * 60 * 1000) {
    reportDataCache.set(key, {
        data,
        expiry: Date.now() + ttl
    });
}

function getReportCache(key) {
    const item = reportDataCache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
        reportDataCache.delete(key);
        return null;
    }
    
    return item.data;
}

function clearReportCache() {
    reportDataCache.clear();
}



// ==================== LOAD DỮ LIỆU - CACHE OPTIMIZED ====================
async function loadRevenueDataForMonth(month) {
    const cacheKey = getReportCacheKey('revenue', month);
    const cached = getReportCache(cacheKey);
    if (cached !== null) return cached;

    try {
        const dateRange = getOperationalMonthDateRange(month);
        
        const snapshot = await db.collection('reports')
            .where('date', '>=', dateRange.startDate)
            .where('date', '<=', dateRange.endDate)
            .get();
            
        let totalRevenue = 0;
        let cashRevenue = 0;
        let transferRevenue = 0;
        
        snapshot.forEach(doc => {
            const data = doc.data();
            totalRevenue += Number(data.revenue) || 0;
            
            if (data.revenueDetails) {
                cashRevenue += Number(data.revenueDetails.cashAmount) || 0;
                transferRevenue += Number(data.revenueDetails.transferTotal) || 0;
            }
        });
        
        const result = {
            total: totalRevenue,
            cash: cashRevenue,
            transfer: transferRevenue,
            other: Math.max(0, totalRevenue - cashRevenue - transferRevenue)
        };
        
        setReportCache(cacheKey, result);
        return result;
        
    } catch (error) {
        console.error('Error loading revenue data:', error);
        const result = { total: 0, cash: 0, transfer: 0, other: 0 };
        setReportCache(cacheKey, result);
        return result;
    }
}


async function loadOperationalExpensesData(month) {
    const cacheKey = getReportCacheKey('operational', month);
    const cached = getReportCache(cacheKey);
    if (cached !== null) return cached;

    try {
        const snapshot = await db.collection('operational_expenses')
            .where('month', '==', month)
            .get();
            
        let total = 0;
        let inventoryTotal = 0;
        let serviceTotal = 0;
        const categories = {};
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const amount = Number(data.amount) || 0;
            total += amount;
            
            if (data.type === 'inventory') {
                inventoryTotal += amount;
            } else {
                serviceTotal += amount;
            }
            
            // Nhóm theo tên
            const category = data.description || 'Không tên';
            categories[category] = (categories[category] || 0) + amount;
        });
        
        const result = {
            total: total,
            inventory: inventoryTotal,
            service: serviceTotal,
            categories: categories
        };
        
        setReportCache(cacheKey, result);
        return result;
        
    } catch (error) {
        console.error('Error loading operational expenses:', error);
        const result = { total: 0, inventory: 0, service: 0, categories: {} };
        setReportCache(cacheKey, result);
        return result;
    }
}

async function loadDailyExpensesData(month) {
    const cacheKey = getReportCacheKey('daily', month);
    const cached = getReportCache(cacheKey);
    if (cached !== null) return cached;

    try {
        const dateRange = getOperationalMonthDateRange(month);
        
        const snapshot = await db.collection('daily_expenses')
            .where('date', '>=', dateRange.startDate)
            .where('date', '<=', dateRange.endDate)
            .get();
            
        let total = 0;
        const categories = {};
        
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.expenses && Array.isArray(data.expenses)) {
                data.expenses.forEach(expense => {
                    const amount = Number(expense.amount) || 0;
                    total += amount;
                    
                    const category = expense.category || 'Không phân loại';
                    categories[category] = (categories[category] || 0) + amount;
                });
            }
        });
        
        const result = {
            total: total,
            categories: categories
        };
        
        setReportCache(cacheKey, result);
        return result;
        
    } catch (error) {
        console.error('Error loading daily expenses:', error);
        const result = { total: 0, categories: {} };
        setReportCache(cacheKey, result);
        return result;
    }
}

// ==================== TÍNH TOÁN LỢI NHUẬN ====================
function calculateProfitLoss(revenue, salary, operational, daily) {
    const totalRevenue = Number(revenue?.total) || 0;
    const totalSalary = Number(salary?.total) || 0;
    const totalOperational = Number(operational?.total) || 0;
    const totalDaily = Number(daily?.total) || 0;
    
    const totalCosts = totalSalary + totalOperational + totalDaily;
    const netProfit = totalRevenue - totalCosts;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    
    return {
        totalRevenue,
        totalCosts,
        netProfit,
        profitMargin,
        salaryCost: totalSalary,
        operationalCost: totalOperational,
        dailyCost: totalDaily,
        month: currentReportMonth,
        generatedAt: new Date(),
        details: { revenue, salary, operational, daily }
    };
}

// ==================== MAIN REPORT FUNCTION ====================
async function loadProfitLossReport() {
    try {
        console.log('📊 Đang tải báo cáo cho:', currentReportMonth);
        showReportLoading();
        
        // Load tất cả dữ liệu song song với cache
        const [revenueData, salaryData, operationalData, dailyExpensesData] = await Promise.all([
            loadRevenueDataForMonth(currentReportMonth),
            loadSalaryData(currentReportMonth),
            loadOperationalExpensesData(currentReportMonth),
            loadDailyExpensesData(currentReportMonth)
        ]);
        
        console.log('✅ Dữ liệu đã tải:', { 
            revenue: revenueData.total,
            salary: salaryData.total, 
            operational: operationalData.total,
            daily: dailyExpensesData.total 
        });
        
        // Tính toán lợi nhuận
        profitLossData = calculateProfitLoss(
            revenueData,
            salaryData,
            operationalData,
            dailyExpensesData
        );
        
        // Hiển thị kết quả
        displayProfitLossReport();
        
        // Cập nhật so sánh nếu đang bật
        if (isComparing) {
            loadComparisonData();
        }
        
    } catch (error) {
        console.error('❌ Lỗi tải báo cáo:', error);
        showToast('Lỗi khi tải báo cáo tài chính', 'error');
    }
}

// ==================== HIỂN THỊ BÁO CÁO ====================
function displayProfitLossReport() {
    if (!profitLossData) return;
    
    displaySummarySection();
    displayCostBreakdown();
    displayRevenueBreakdown();
}

function displaySummarySection() {
    const container = document.getElementById('reportSummary');
    if (!container) return;
    
    const { totalRevenue, totalCosts, netProfit, profitMargin } = profitLossData;
    
    container.innerHTML = `
        <div class="report-summary-grid">
            <div class="summary-card revenue-card" onclick="showRevenueDetails()">
                <div class="summary-icon">💰</div>
                <div class="summary-content">
                    <div class="summary-label">DOANH THU</div>
                    <div class="summary-value">${formatCurrency(totalRevenue)}</div>
                    <div class="summary-subtitle">Click để xem chi tiết</div>
                </div>
            </div>
            
            <div class="summary-card cost-card" onclick="showCostDetails()">
                <div class="summary-icon">🏢</div>
                <div class="summary-content">
                    <div class="summary-label">TỔNG CHI PHÍ</div>
                    <div class="summary-value">${formatCurrency(totalCosts)}</div>
                    <div class="summary-subtitle">Click để xem chi tiết</div>
                </div>
            </div>
            
            <div class="summary-card profit-card ${netProfit >= 0 ? 'positive' : 'negative'}">
                <div class="summary-icon">📈</div>
                <div class="summary-content">
                    <div class="summary-label">LỢI NHUẬN</div>
                    <div class="summary-value">${formatCurrency(netProfit)}</div>
                    <div class="summary-margin">Tỷ suất: ${profitMargin.toFixed(1)}%</div>
                </div>
            </div>
        </div>
        
        <!-- Chi tiết chi phí -->
        <div class="cost-details-grid">
            <div class="cost-detail-card staff-cost" onclick="showSalaryDetails()">
                <div class="cost-label">👥 Chi Phí Nhân Viên</div>
                <div class="cost-value">${formatCurrency(profitLossData.salaryCost)}</div>
                <div class="cost-percentage">${formatPercentage(profitLossData.salaryCost, profitLossData.totalCosts)}% tổng CP</div>
            </div>
            
            <div class="cost-detail-card operational-cost" onclick="showOperationalDetails()">
                <div class="cost-label">🏭 Chi Phí Vận Hành</div>
                <div class="cost-value">${formatCurrency(profitLossData.operationalCost)}</div>
                <div class="cost-percentage">${formatPercentage(profitLossData.operationalCost, profitLossData.totalCosts)}% tổng CP</div>
            </div>
            
            <div class="cost-detail-card daily-cost" onclick="showDailyExpensesDetails()">
                <div class="cost-label">📊 Chi Phí Hàng Ngày</div>
                <div class="cost-value">${formatCurrency(profitLossData.dailyCost)}</div>
                <div class="cost-percentage">${formatPercentage(profitLossData.dailyCost, profitLossData.totalCosts)}% tổng CP</div>
            </div>
        </div>
    `;
}

function displayCostBreakdown() {
    const container = document.getElementById('costBreakdown');
    if (!container || !profitLossData) return;
    
    const { salaryCost, operationalCost, dailyCost, totalCosts } = profitLossData;
    
    // Tính phần trăm cho biểu đồ
    const salaryPercent = totalCosts > 0 ? (salaryCost / totalCosts) * 100 : 0;
    const operationalPercent = totalCosts > 0 ? (operationalCost / totalCosts) * 100 : 0;
    const dailyPercent = totalCosts > 0 ? (dailyCost / totalCosts) * 100 : 0;
    
    container.innerHTML = `
        <div class="breakdown-grid">
            <div class="breakdown-chart">
                <h4>📊 Phân Bổ Chi Phí</h4>
                <div class="chart-container">
                    <div class="chart-bar" style="height: ${salaryPercent}%; background: #3498db;" title="Nhân viên: ${formatCurrency(salaryCost)}"></div>
                    <div class="chart-bar" style="height: ${operationalPercent}%; background: #e74c3c;" title="Vận hành: ${formatCurrency(operationalCost)}"></div>
                    <div class="chart-bar" style="height: ${dailyPercent}%; background: #f39c12;" title="Hàng ngày: ${formatCurrency(dailyCost)}"></div>
                </div>
                <div class="chart-legend">
                    <div class="legend-item"><span style="background:#3498db"></span> Nhân viên</div>
                    <div class="legend-item"><span style="background:#e74c3c"></span> Vận hành</div>
                    <div class="legend-item"><span style="background:#f39c12"></span> Hàng ngày</div>
                </div>
            </div>
            
            <div class="breakdown-numbers">
                <h4>📈 Tỷ Trọng Chi Phí</h4>
                <div class="percentage-list">
                    <div class="percentage-item">
                        <span class="label">👥 Nhân viên:</span>
                        <span class="value">${formatPercentage(salaryCost, totalCosts)}%</span>
                    </div>
                    <div class="percentage-item">
                        <span class="label">🏭 Vận hành:</span>
                        <span class="value">${formatPercentage(operationalCost, totalCosts)}%</span>
                    </div>
                    <div class="percentage-item">
                        <span class="label">📊 Hàng ngày:</span>
                        <span class="value">${formatPercentage(dailyCost, totalCosts)}%</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function displayRevenueBreakdown() {
    const container = document.getElementById('revenueBreakdown');
    if (!container || !profitLossData) return;
    
    const { details } = profitLossData;
    const revenue = details.revenue || {};
    
    // Tính phần trăm cho biểu đồ
    const cashPercent = revenue.total > 0 ? (revenue.cash / revenue.total) * 100 : 0;
    const transferPercent = revenue.total > 0 ? (revenue.transfer / revenue.total) * 100 : 0;
    const otherPercent = revenue.total > 0 ? (revenue.other / revenue.total) * 100 : 0;
    
    container.innerHTML = `
        <div class="revenue-grid">
            <div class="revenue-chart">
                <h4>💰 Phân Tích Doanh Thu</h4>
                <div class="chart-container horizontal">
                    <div class="chart-bar horizontal" style="width: ${cashPercent}%; background: #27ae60;" title="Tiền mặt: ${formatCurrency(revenue.cash)}"></div>
                    <div class="chart-bar horizontal" style="width: ${transferPercent}%; background: #2980b9;" title="Chuyển khoản: ${formatCurrency(revenue.transfer)}"></div>
                    <div class="chart-bar horizontal" style="width: ${otherPercent}%; background: #8e44ad;" title="Khác: ${formatCurrency(revenue.other)}"></div>
                </div>
                <div class="chart-legend">
                    <div class="legend-item"><span style="background:#27ae60"></span> Tiền mặt</div>
                    <div class="legend-item"><span style="background:#2980b9"></span> Chuyển khoản</div>
                    <div class="legend-item"><span style="background:#8e44ad"></span> Khác</div>
                </div>
            </div>
            
            <div class="revenue-numbers">
                <h4>💵 Chi Tiết Doanh Thu</h4>
                <div class="revenue-list">
                    <div class="revenue-item">
                        <span class="label">💵 Tiền mặt:</span>
                        <span class="value">${formatCurrency(revenue.cash || 0)}</span>
                        <span class="percentage">${formatPercentage(revenue.cash, revenue.total)}%</span>
                    </div>
                    <div class="revenue-item">
                        <span class="label">🏦 Chuyển khoản:</span>
                        <span class="value">${formatCurrency(revenue.transfer || 0)}</span>
                        <span class="percentage">${formatPercentage(revenue.transfer, revenue.total)}%</span>
                    </div>
                    <div class="revenue-item">
                        <span class="label">📦 Khác:</span>
                        <span class="value">${formatCurrency(revenue.other || 0)}</span>
                        <span class="percentage">${formatPercentage(revenue.other, revenue.total)}%</span>
                    </div>
                    <div class="revenue-total">
                        <span class="label">💰 Tổng doanh thu:</span>
                        <span class="value">${formatCurrency(revenue.total || 0)}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ==================== SO SÁNH DỮ LIỆU ====================
function toggleComparison() {
    const compareToggle = document.getElementById('compareToggle');
    isComparing = compareToggle ? compareToggle.checked : false;
    
    if (isComparing) {
        loadComparisonData();
    } else {
        hideComparisonSection();
    }
}

async function loadComparisonData() {
    try {
        if (!profitLossData) {
            showToast('Vui lòng tải dữ liệu tháng hiện tại trước', 'error');
            const compareToggle = document.getElementById('compareToggle');
            if (compareToggle) compareToggle.checked = false;
            return;
        }
        
        const previousMonth = getPreviousMonth(currentReportMonth);
        const previousMonthData = await loadMonthData(previousMonth);
        
        if (!previousMonthData) {
            showToast('Không có dữ liệu tháng trước để so sánh', 'warning');
            const compareToggle = document.getElementById('compareToggle');
            if (compareToggle) compareToggle.checked = false;
            return;
        }
        
        comparisonData = {
            current: profitLossData,
            previous: previousMonthData,
            comparison: calculateComparison(profitLossData, previousMonthData)
        };
        
        displayComparisonSection();
        
    } catch (error) {
        console.error('Error loading comparison data:', error);
        showToast('Lỗi khi tải dữ liệu so sánh', 'error');
        const compareToggle = document.getElementById('compareToggle');
        if (compareToggle) compareToggle.checked = false;
    }
}

async function loadMonthData(month) {
    try {
        const [revenueData, salaryData, operationalData, dailyExpensesData] = await Promise.all([
            loadRevenueDataForMonth(month),
            loadSalaryData(month),
            loadOperationalExpensesData(month),
            loadDailyExpensesData(month)
        ]);
        
        return calculateProfitLoss(
            revenueData,
            salaryData,
            operationalData,
            dailyExpensesData
        );
        
    } catch (error) {
        console.error('Error loading month data:', error);
        return null;
    }
}

function calculateComparison(current, previous) {
    if (!previous) return null;
    
    return {
        revenue: {
            absolute: current.totalRevenue - previous.totalRevenue,
            percentage: previous.totalRevenue > 0 ? 
                ((current.totalRevenue - previous.totalRevenue) / previous.totalRevenue) * 100 : 0
        },
        costs: {
            absolute: current.totalCosts - previous.totalCosts,
            percentage: previous.totalCosts > 0 ? 
                ((current.totalCosts - previous.totalCosts) / previous.totalCosts) * 100 : 0
        },
        profit: {
            absolute: current.netProfit - previous.netProfit,
            percentage: previous.netProfit !== 0 ? 
                ((current.netProfit - previous.netProfit) / Math.abs(previous.netProfit)) * 100 : 0
        }
    };
}

function displayComparisonSection() {
    const container = document.getElementById('comparisonSection');
    if (!container || !comparisonData || !comparisonData.comparison) return;
    
    const { current, previous, comparison } = comparisonData;
    const prevMonth = getPreviousMonth(currentReportMonth);
    
    container.style.display = 'block';
    container.innerHTML = `
        <div class="comparison-header">
            <h3>📊 So Sánh với Tháng ${prevMonth}</h3>
            <div class="comparison-period">
                ${formatReportPeriod(currentReportMonth)} vs ${formatReportPeriod(prevMonth)}
            </div>
        </div>
        <div class="comparison-grid">
            ${renderComparisonItem('💰 Doanh thu', current.totalRevenue, previous.totalRevenue, comparison.revenue)}
            ${renderComparisonItem('🏢 Tổng chi phí', current.totalCosts, previous.totalCosts, comparison.costs, true)}
            ${renderComparisonItem('📈 Lợi nhuận', current.netProfit, previous.netProfit, comparison.profit)}
        </div>
    `;
}

function renderComparisonItem(label, currentVal, previousVal, comparison, isCost = false) {
    const absolute = isCost ? -comparison.absolute : comparison.absolute;
    const percentage = isCost ? -comparison.percentage : comparison.percentage;
    const isPositive = absolute >= 0;
    const absPercentage = Math.abs(percentage);
    
    return `
        <div class="comparison-item">
            <div class="comparison-label">${label}</div>
            <div class="comparison-values">
                <div class="current-value">${formatCurrency(currentVal)}</div>
                <div class="previous-value">Tháng trước: ${formatCurrency(previousVal)}</div>
                <div class="comparison-badge ${isPositive ? 'positive' : 'negative'}">
                    ${isPositive ? '↗️' : '↘️'} 
                    ${formatCurrency(Math.abs(absolute))} 
                    (${absPercentage.toFixed(1)}%)
                </div>
            </div>
        </div>
    `;
}

function hideComparisonSection() {
    const container = document.getElementById('comparisonSection');
    if (container) {
        container.style.display = 'none';
    }
    comparisonData = null;
}

// ==================== MODAL CHI TIẾT ====================
function showRevenueDetails() {
    if (!profitLossData) return;
    
    const revenue = profitLossData.details.revenue || {};
    
    createDetailModal(
        '💰 Chi Tiết Doanh Thu',
        `
            <div class="detail-grid">
                <div class="detail-item cash">
                    <div class="detail-icon">💵</div>
                    <div class="detail-content">
                        <div class="detail-label">Tiền mặt</div>
                        <div class="detail-value">${formatCurrency(revenue.cash || 0)}</div>
                        <div class="detail-percentage">${formatPercentage(revenue.cash, revenue.total)}%</div>
                    </div>
                </div>
                
                <div class="detail-item transfer">
                    <div class="detail-icon">🏦</div>
                    <div class="detail-content">
                        <div class="detail-label">Chuyển khoản</div>
                        <div class="detail-value">${formatCurrency(revenue.transfer || 0)}</div>
                        <div class="detail-percentage">${formatPercentage(revenue.transfer, revenue.total)}%</div>
                    </div>
                </div>
                
                <div class="detail-item other">
                    <div class="detail-icon">📦</div>
                    <div class="detail-content">
                        <div class="detail-label">Khác</div>
                        <div class="detail-value">${formatCurrency(revenue.other || 0)}</div>
                        <div class="detail-percentage">${formatPercentage(revenue.other, revenue.total)}%</div>
                    </div>
                </div>
                
                <div class="detail-total">
                    <div class="detail-label">Tổng doanh thu</div>
                    <div class="detail-value">${formatCurrency(revenue.total || 0)}</div>
                </div>
            </div>
        `
    );
}

function showCostDetails() {
    if (!profitLossData) return;
    
    const { salaryCost, operationalCost, dailyCost, totalCosts } = profitLossData;
    
    createDetailModal(
        '🏢 Chi Tiết Tổng Chi Phí',
        `
            <div class="detail-grid">
                <div class="detail-item staff">
                    <div class="detail-icon">👥</div>
                    <div class="detail-content">
                        <div class="detail-label">Chi phí nhân viên</div>
                        <div class="detail-value">${formatCurrency(salaryCost)}</div>
                        <div class="detail-percentage">${formatPercentage(salaryCost, totalCosts)}%</div>
                    </div>
                </div>
                
                <div class="detail-item operational">
                    <div class="detail-icon">🏭</div>
                    <div class="detail-content">
                        <div class="detail-label">Chi phí vận hành</div>
                        <div class="detail-value">${formatCurrency(operationalCost)}</div>
                        <div class="detail-percentage">${formatPercentage(operationalCost, totalCosts)}%</div>
                    </div>
                </div>
                
                <div class="detail-item daily">
                    <div class="detail-icon">📊</div>
                    <div class="detail-content">
                        <div class="detail-label">Chi phí hàng ngày</div>
                        <div class="detail-value">${formatCurrency(dailyCost)}</div>
                        <div class="detail-percentage">${formatPercentage(dailyCost, totalCosts)}%</div>
                    </div>
                </div>
                
                <div class="detail-total">
                    <div class="detail-label">Tổng chi phí</div>
                    <div class="detail-value">${formatCurrency(totalCosts)}</div>
                </div>
            </div>
        `
    );
}


function showOperationalDetails() {
    if (!profitLossData) return;
    
    const operational = profitLossData.details.operational || {};
    const categories = operational.categories || {};
    const total = profitLossData.operationalCost;
    
    let detailsHTML = '';
    Object.entries(categories).forEach(([name, amount]) => {
        detailsHTML += `
            <div class="operational-item">
                <span class="operational-name">${name}</span>
                <span class="operational-amount">${formatCurrency(amount)}</span>
                <span class="operational-percentage">${formatPercentage(amount, total)}%</span>
            </div>
        `;
    });
    
    createDetailModal(
        '🏭 Chi Tiết Chi Phí Vận Hành',
        `
            <div class="operational-details">
                <div class="operational-total">
                    <div class="total-label">Tổng chi phí vận hành</div>
                    <div class="total-value">${formatCurrency(total)}</div>
                    <div class="total-breakdown">
                        Hàng hóa: ${formatCurrency(operational.inventory || 0)} | 
                        Dịch vụ: ${formatCurrency(operational.service || 0)}
                    </div>
                </div>
                <div class="operational-list">
                    ${detailsHTML || '<div class="empty-state">Không có dữ liệu chi phí</div>'}
                </div>
            </div>
        `
    );
}

function showDailyExpensesDetails() {
    if (!profitLossData) return;
    
    const daily = profitLossData.details.daily || {};
    const categories = daily.categories || {};
    const total = profitLossData.dailyCost;
    
    let detailsHTML = '';
    Object.entries(categories).forEach(([name, amount]) => {
        detailsHTML += `
            <div class="daily-item">
                <span class="daily-name">${name}</span>
                <span class="daily-amount">${formatCurrency(amount)}</span>
                <span class="daily-percentage">${formatPercentage(amount, total)}%</span>
            </div>
        `;
    });
    
    createDetailModal(
        '📊 Chi Tiết Chi Phí Hàng Ngày',
        `
            <div class="daily-details">
                <div class="daily-total">
                    <div class="total-label">Tổng chi phí hàng ngày</div>
                    <div class="total-value">${formatCurrency(total)}</div>
                </div>
                <div class="daily-list">
                    ${detailsHTML || '<div class="empty-state">Không có dữ liệu chi phí hàng ngày</div>'}
                </div>
            </div>
        `
    );
}

function createDetailModal(title, content) {
    closeDetailModal();
    
    const modal = document.createElement('div');
    modal.id = 'profitLossDetailModal';
    modal.className = 'modal-overlay active';
    
    modal.innerHTML = `
        <div class="modal-content large">
            <div class="modal-header">
                <h3>${title}</h3>
                <button class="modal-close" onclick="closeDetailModal()">×</button>
            </div>
            <div class="modal-body">
                <div class="modal-period">Tháng ${currentReportMonth}</div>
                ${content}
            </div>
            <div class="modal-footer">
                <button class="btn-cancel" onclick="closeDetailModal()">Đóng</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

function closeDetailModal() {
    const modal = document.getElementById('profitLossDetailModal');
    if (modal) modal.remove();
}

// ==================== UTILITY FUNCTIONS ====================
function getOperationalMonthDateRange(month) {
    const [monthNum, year] = month.split('/').map(Number);
    
    let startMonth = monthNum - 1;
    let startYear = year;
    if (startMonth === 0) {
        startMonth = 12;
        startYear = year - 1;
    }
    
    const startDate = `${startYear}-${String(startMonth).padStart(2, '0')}-20`;
    const endDate = `${year}-${String(monthNum).padStart(2, '0')}-19`;
    
    return { startDate, endDate };
}

function getPreviousMonth(month) {
    const [monthNum, year] = month.split('/').map(Number);
    
    let prevMonth = monthNum - 1;
    let prevYear = year;
    
    if (prevMonth === 0) {
        prevMonth = 12;
        prevYear = year - 1;
    }
    
    return `${String(prevMonth).padStart(2, '0')}/${prevYear}`;
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount || 0);
}

function formatPercentage(part, total) {
    if (!total || total === 0) return 0;
    return Math.round((part / total) * 100);
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
        background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#333'};
        color: white; padding: 12px 24px; border-radius: 25px; z-index: 10000;
        font-weight: bold; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ==================== EVENT LISTENERS ====================
function setupReportEventListeners() {
    // Compare toggle
    const compareToggle = document.getElementById('compareToggle');
    if (compareToggle) {
        compareToggle.addEventListener('change', toggleComparison);
    }
    
    // Export buttons
    const exportExcel = document.getElementById('exportExcel');
    const exportPDF = document.getElementById('exportPDF');
    
    if (exportExcel) exportExcel.addEventListener('click', exportProfitLossReport);
    if (exportPDF) exportPDF.addEventListener('click', exportPDFReport);
}

// ==================== EXPORT FUNCTIONS ====================
async function exportProfitLossReport() {
    if (!profitLossData) {
        showToast('Không có dữ liệu để xuất', 'error');
        return;
    }
    
    try {
        const { totalRevenue, totalCosts, netProfit, profitMargin, salaryCost, operationalCost, dailyCost } = profitLossData;
        
        const reportData = [{
            'Tháng': currentReportMonth,
            'Doanh thu': totalRevenue,
            'Chi phí nhân viên': salaryCost,
            'Chi phí vận hành': operationalCost,
            'Chi phí hàng ngày': dailyCost,
            'Tổng chi phí': totalCosts,
            'Lợi nhuận': netProfit,
            'Tỷ suất lợi nhuận': profitMargin.toFixed(1) + '%',
        }];
        
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(reportData);
        
        XLSX.utils.book_append_sheet(wb, ws, 'BaoCaoTaiChinh');
        
        const fileName = `Bao_Cao_Tai_Chinh_${currentReportMonth.replace('/', '_')}.xlsx`;
        XLSX.writeFile(wb, fileName);
        
        showToast(`✅ Đã xuất file ${fileName}`, 'success');
        
    } catch (error) {
        console.error('Error exporting report:', error);
        showToast('❌ Lỗi khi xuất file', 'error');
    }
}

function exportPDFReport() {
    showToast('📄 Tính năng xuất PDF sẽ được cập nhật sớm', 'info');
}

// ==================== GLOBAL EXPORTS ====================
window.initializeProfitLossReport = initializeProfitLossReport;
window.loadProfitLossReport = loadProfitLossReport;
window.exportProfitLossReport = exportProfitLossReport;
window.exportPDFReport = exportPDFReport;
window.showRevenueDetails = showRevenueDetails;
window.showCostDetails = showCostDetails;
window.showSalaryDetails = showSalaryDetails;
window.showOperationalDetails = showOperationalDetails;
window.showDailyExpensesDetails = showDailyExpensesDetails;
window.closeDetailModal = closeDetailModal;
window.toggleComparison = toggleComparison;

// Khởi tạo khi tab được active
document.addEventListener('click', function(e) {
    if (e.target.closest('.tab-btn') && e.target.textContent.includes('Báo Cáo Tài Chính')) {
        console.log('📊 Tab Báo Cáo Tài Chính được click');
        setTimeout(() => {
            initializeProfitLossReport();
        }, 300);
    }
});

// Khởi tạo khi trang load nếu tab đang active
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        const baocaoTab = document.getElementById('baocaoTab');
        if (baocaoTab && baocaoTab.classList.contains('active')) {
            console.log('🏁 Tab Báo Cáo đang active - Khởi tạo...');
            initializeProfitLossReport();
        }
    }, 1000);
});

console.log('✅ Baocao.js: Module báo cáo độc lập đã sẵn sàng');