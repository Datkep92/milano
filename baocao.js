// ==================== PROFIT & LOSS REPORT SYSTEM ====================

// Global variables
let currentReportMonth = getCurrentOperationalMonth(new Date()); // Sửa: dùng chu kỳ 20/N-19/N+1
let profitLossData = null;

async function loadRevenueDataForMonth(month) {
    try {
        // Lấy ngày bắt đầu và kết thúc theo chu kỳ 20/N-19/N+1
        const dateRange = getOperationalMonthDateRange(month);
        
        console.log('Loading revenue data for period:', dateRange.startDate, 'to', dateRange.endDate);
        
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
        
        return {
            total: totalRevenue,
            cash: cashRevenue,
            transfer: transferRevenue,
            other: Math.max(0, totalRevenue - cashRevenue - transferRevenue)
        };
        
    } catch (error) {
        console.error('Error loading revenue data:', error);
        return { total: 0, cash: 0, transfer: 0, other: 0 };
    }
}

async function loadSalaryData(month) {
    try {
        // Lấy tổng chi phí nhân viên từ hàm đã có trong chiphi.js
        let totalSalary = 0;
        const salaryDetails = {};
        
        const snapshot = await db.collection('employees')
            .where('status', '==', 'active')
            .get();
            
        for (const doc of snapshot.docs) {
            const employee = doc.data();
            const employeeId = doc.id;
            
            const finalSalary = await calculateStaffFinalSalary(employeeId, month);
            totalSalary += finalSalary;
            salaryDetails[employee.name] = finalSalary;
        }
        
        return {
            total: totalSalary,
            details: salaryDetails
        };
        
    } catch (error) {
        console.error('Error loading salary data:', error);
        return { total: 0, details: {} };
    }
}

async function loadOperationalExpensesData(month) {
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
                // Nhóm theo tên hàng hóa
                const category = data.description || 'Không tên';
                categories[category] = (categories[category] || 0) + amount;
            } else {
                serviceTotal += amount;
                // Nhóm theo tên dịch vụ
                const category = data.description || 'Không tên';
                categories[category] = (categories[category] || 0) + amount;
            }
        });
        
        return {
            total: total,
            inventory: inventoryTotal,
            service: serviceTotal,
            categories: categories
        };
        
    } catch (error) {
        console.error('Error loading operational expenses:', error);
        return { total: 0, inventory: 0, service: 0, categories: {} };
    }
}

async function loadDailyExpensesData(month) {
    try {
        // Lấy ngày bắt đầu và kết thúc theo chu kỳ 20/N-19/N+1
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
                    
                    // Nhóm theo loại chi phí
                    const category = expense.category || 'Không phân loại';
                    categories[category] = (categories[category] || 0) + amount;
                });
            }
        });
        
        return {
            total: total,
            categories: categories
        };
        
    } catch (error) {
        console.error('Error loading daily expenses:', error);
        return { total: 0, categories: {} };
    }
}

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
        details: {
            salary: salary,
            operational: operational,
            daily: daily,
            revenue: revenue
        }
    };
}



function displayCostBreakdown() {
    const container = document.getElementById('costBreakdown');
    if (!container || !profitLossData) return;
    
    const { salaryCost, operationalCost, dailyCost, totalCosts } = profitLossData;
    
    container.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div>
                <h4>📊 Phân Bổ Chi Phí</h4>
                <div style="background: white; padding: 15px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span>👥 Nhân viên:</span>
                        <strong>${formatCurrency(salaryCost)}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span>🏭 Vận hành:</span>
                        <strong>${formatCurrency(operationalCost)}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span>📊 Hàng ngày:</span>
                        <strong>${formatCurrency(dailyCost)}</strong>
                    </div>
                    <hr style="margin: 10px 0;">
                    <div style="display: flex; justify-content: space-between; font-weight: bold;">
                        <span>Tổng cộng:</span>
                        <strong>${formatCurrency(totalCosts)}</strong>
                    </div>
                </div>
            </div>
            
            <div>
                <h4>📈 Biểu Đồ Phân Bổ</h4>
                <div style="background: white; padding: 15px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); text-align: center;">
                    <div style="font-size: 3rem; color: #666;">📊</div>
                    <div>Biểu đồ sẽ được cập nhật</div>
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
    
    container.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div>
                <h4>💰 Phân Tích Doanh Thu</h4>
                <div style="background: white; padding: 15px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span>💵 Tiền mặt:</span>
                        <strong>${formatCurrency(revenue.cash || 0)}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span>🏦 Chuyển khoản:</span>
                        <strong>${formatCurrency(revenue.transfer || 0)}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span>📦 Khác:</span>
                        <strong>${formatCurrency(revenue.other || 0)}</strong>
                    </div>
                    <hr style="margin: 10px 0;">
                    <div style="display: flex; justify-content: space-between; font-weight: bold;">
                        <span>Tổng doanh thu:</span>
                        <strong>${formatCurrency(revenue.total || 0)}</strong>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ==================== DETAIL MODAL FUNCTIONS ====================


// ==================== UTILITY FUNCTIONS ====================

// Hàm lấy tháng vận hành hiện tại (20/N - 19/N+1)
function getCurrentOperationalMonth(date) {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    
    if (day >= 20) {
        return `${String(month).padStart(2, '0')}/${year}`;
    } else {
        let prevMonth = month - 1;
        let prevYear = year;
        if (prevMonth === 0) {
            prevMonth = 12;
            prevYear = year - 1;
        }
        return `${String(prevMonth).padStart(2, '0')}/${prevYear}`;
    }
}

// Hàm sinh danh sách tháng vận hành
function generateOperationalMonths(count) {
    const months = [];
    const today = new Date();
    
    for (let i = 0; i < count; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        months.push(getCurrentOperationalMonth(d));
    }
    
    return [...new Set(months)].sort().reverse();
}

// Hàm lấy ngày bắt đầu và kết thúc theo chu kỳ 20/N-19/N+1
function getOperationalMonthDateRange(month) {
    const [monthNum, year] = month.split('/').map(Number);
    
    // Ngày bắt đầu: 20 tháng trước
    let startMonth = monthNum - 1;
    let startYear = year;
    if (startMonth === 0) {
        startMonth = 12;
        startYear = year - 1;
    }
    
    // Ngày kết thúc: 19 tháng hiện tại
    const startDate = `${startYear}-${String(startMonth).padStart(2, '0')}-20`;
    const endDate = `${year}-${String(monthNum).padStart(2, '0')}-19`;
    
    return { startDate, endDate };
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

function formatPercentage(part, total) {
    if (!total || total === 0) return 0;
    return Math.round((part / total) * 100);
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
        
        showToast(`Đã xuất báo cáo ${fileName}`, 'success');
        
    } catch (error) {
        console.error('Error exporting report:', error);
        showToast('Lỗi khi xuất báo cáo', 'error');
    }
}

function exportPDFReport() {
    showToast('Tính năng xuất PDF sẽ được cập nhật sớm', 'info');
}

// ==================== GLOBAL EXPORTS ====================
// ==================== DETAIL MODAL FUNCTIONS ====================

function showRevenueDetails() {
    if (!profitLossData) return;
    
    const revenue = profitLossData.details.revenue || {};
    
    createDetailModal(
        '💰 Chi Tiết Doanh Thu',
        `
            <div style="display: grid; gap: 10px;">
                <div style="display: flex; justify-content: space-between; padding: 10px; background: #e8f5e8; border-radius: 8px;">
                    <span>💵 Tiền mặt:</span>
                    <strong>${formatCurrency(revenue.cash || 0)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 10px; background: #e3f2fd; border-radius: 8px;">
                    <span>🏦 Chuyển khoản:</span>
                    <strong>${formatCurrency(revenue.transfer || 0)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 10px; background: #fff3e0; border-radius: 8px;">
                    <span>📦 Khác:</span>
                    <strong>${formatCurrency(revenue.other || 0)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 10px; background: #f5f5f5; border-radius: 8px; font-weight: bold;">
                    <span>Tổng doanh thu:</span>
                    <strong>${formatCurrency(revenue.total || 0)}</strong>
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
            <div style="display: grid; gap: 10px;">
                <div style="display: flex; justify-content: space-between; padding: 10px; background: #e3f2fd; border-radius: 8px;">
                    <span>👥 Chi phí nhân viên:</span>
                    <strong>${formatCurrency(salaryCost)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 10px; background: #fff3e0; border-radius: 8px;">
                    <span>🏭 Chi phí vận hành:</span>
                    <strong>${formatCurrency(operationalCost)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 10px; background: #f3e5f5; border-radius: 8px;">
                    <span>📊 Chi phí hàng ngày:</span>
                    <strong>${formatCurrency(dailyCost)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 10px; background: #f5f5f5; border-radius: 8px; font-weight: bold;">
                    <span>Tổng chi phí:</span>
                    <strong>${formatCurrency(totalCosts)}</strong>
                </div>
            </div>
        `
    );
}

function showSalaryDetails() {
    if (!profitLossData) return;
    
    const salaryDetails = profitLossData.details.salary?.details || {};
    const total = profitLossData.salaryCost;
    
    let detailsHTML = '';
    Object.entries(salaryDetails).forEach(([name, amount]) => {
        detailsHTML += `
            <div style="display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid #eee;">
                <span>${name}</span>
                <strong>${formatCurrency(amount)}</strong>
            </div>
        `;
    });
    
    createDetailModal(
        '👥 Chi Tiết Chi Phí Nhân Viên',
        `
            <div>
                <div style="text-align: center; padding: 10px; background: #e3f2fd; border-radius: 8px; margin-bottom: 15px;">
                    <strong>Tổng: ${formatCurrency(total)}</strong>
                </div>
                <div style="max-height: 300px; overflow-y: auto;">
                    ${detailsHTML || '<div style="text-align: center; color: #666;">Không có dữ liệu</div>'}
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
            <div style="display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid #eee;">
                <span>${name}</span>
                <strong>${formatCurrency(amount)}</strong>
            </div>
        `;
    });
    
    createDetailModal(
        '🏭 Chi Tiết Chi Phí Vận Hành',
        `
            <div>
                <div style="text-align: center; padding: 10px; background: #fff3e0; border-radius: 8px; margin-bottom: 15px;">
                    <strong>Tổng: ${formatCurrency(total)}</strong>
                    <div style="font-size: 0.9rem;">
                        Hàng hóa: ${formatCurrency(operational.inventory || 0)} | 
                        Dịch vụ: ${formatCurrency(operational.service || 0)}
                    </div>
                </div>
                <div style="max-height: 300px; overflow-y: auto;">
                    ${detailsHTML || '<div style="text-align: center; color: #666;">Không có dữ liệu</div>'}
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
            <div style="display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid #eee;">
                <span>${name}</span>
                <strong>${formatCurrency(amount)}</strong>
            </div>
        `;
    });
    
    createDetailModal(
        '📊 Chi Tiết Chi Phí Hàng Ngày',
        `
            <div>
                <div style="text-align: center; padding: 10px; background: #f3e5f5; border-radius: 8px; margin-bottom: 15px;">
                    <strong>Tổng: ${formatCurrency(total)}</strong>
                </div>
                <div style="max-height: 300px; overflow-y: auto;">
                    ${detailsHTML || '<div style="text-align: center; color: #666;">Không có dữ liệu</div>'}
                </div>
            </div>
        `
    );
}

function createDetailModal(title, content) {
    // Xóa modal cũ nếu có
    closeDetailModal();
    
    const modal = document.createElement('div');
    modal.id = 'profitLossDetailModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.85);
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        font-family: system-ui, sans-serif;
    `;

    modal.innerHTML = `
        <div style="background: white; border-radius: 20px; width: 100%; max-width: 500px; max-height: 80vh; overflow-y: auto;">
            <div style="background: #667eea; color: white; padding: 20px; border-radius: 20px 20px 0 0; text-align: center; position: relative;">
                <h3 style="margin: 0; font-size: 1.3rem;">${title}</h3>
                <div style="font-size: 0.9rem; margin-top: 5px;">Tháng ${currentReportMonth}</div>
                <button id="closeDetailModalBtn" 
                        style="position: absolute; top: 15px; right: 20px; background: none; border: none; color: white; font-size: 30px; cursor: pointer; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">×</button>
            </div>
            <div style="padding: 20px;">
                ${content}
            </div>
            <div style="padding: 20px; background: #f5f5f5; border-top: 1px solid #eee; text-align: center;">
                <button onclick="closeDetailModal()" 
                        style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
                    Đóng
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    
    // Gắn sự kiện đóng modal
    setTimeout(() => {
        const closeBtn = document.getElementById('closeDetailModalBtn');
        if (closeBtn) {
            closeBtn.onclick = function(e) {
                e.stopPropagation();
                closeDetailModal();
            };
        }
        
        // Đóng khi click outside
        modal.onclick = function(e) {
            if (e.target === modal) {
                closeDetailModal();
            }
        };
    }, 100);
    
    return modal;
}

// Hàm đóng modal chi tiết
function closeDetailModal() {
    const modal = document.getElementById('profitLossDetailModal');
    if (modal) {
        modal.remove();
    }
}
// ==================== COMPARISON SYSTEM ====================

let comparisonData = null;
let isComparing = false;


async function loadMonthData(month) {
    try {
        console.log('📊 Đang tải dữ liệu tháng:', month);
        
        const [revenueData, salaryData, operationalData, dailyExpensesData] = await Promise.all([
            loadRevenueDataForMonth(month),
            loadSalaryData(month),
            loadOperationalExpensesData(month),
            loadDailyExpensesData(month)
        ]);
        
        return calculateProfitLoss(
            revenueData || { total: 0, cash: 0, transfer: 0, other: 0 },
            salaryData || { total: 0, details: {} },
            operationalData || { total: 0, inventory: 0, service: 0, categories: {} },
            dailyExpensesData || { total: 0, categories: {} }
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
        },
        salary: {
            absolute: current.salaryCost - previous.salaryCost,
            percentage: previous.salaryCost > 0 ? 
                ((current.salaryCost - previous.salaryCost) / previous.salaryCost) * 100 : 0
        },
        operational: {
            absolute: current.operationalCost - previous.operationalCost,
            percentage: previous.operationalCost > 0 ? 
                ((current.operationalCost - previous.operationalCost) / previous.operationalCost) * 100 : 0
        },
        daily: {
            absolute: current.dailyCost - previous.dailyCost,
            percentage: previous.dailyCost > 0 ? 
                ((current.dailyCost - previous.dailyCost) / previous.dailyCost) * 100 : 0
        }
    };
}

function renderComparisonBadge(absolute, percentage) {
    const isPositive = absolute >= 0;
    const absPercentage = Math.abs(percentage);
    
    return `
        <span class="comparison-badge ${isPositive ? 'positive' : 'negative'}">
            ${isPositive ? '↗️' : '↘️'} 
            ${formatCurrency(Math.abs(absolute))} 
            (${absPercentage.toFixed(1)}%)
        </span>
    `;
}


// ==================== UTILITY FUNCTIONS ====================

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


// ==================== THÊM HÀM KIỂM TRA ====================

// Hàm kiểm tra và fix lỗi dropdown
function debugMonthSelector() {
    const monthSelector = document.getElementById('reportMonthSelector');
    if (!monthSelector) {
        console.error('❌ reportMonthSelector không tồn tại');
        return;
    }
    
    console.log('🐛 Debug month selector:');
    console.log('- Element:', monthSelector);
    console.log('- Current value:', monthSelector.value);
    console.log('- Options length:', monthSelector.options.length);
    console.log('- Current report month:', currentReportMonth);
    
    // Kiểm tra event listeners
    const events = getEventListeners(monthSelector);
    console.log('- Event listeners:', events);
    
    // Test change event
    monthSelector.dispatchEvent(new Event('change'));
}

// Hàm force reload dropdown
function reloadMonthSelector() {
    console.log('🔄 Đang reload month selector...');
    setupMonthSelector();
}

// ==================== GLOBAL EXPORTS ====================

window.loadComparisonData = loadComparisonData;
window.debugMonthSelector = debugMonthSelector;
window.reloadMonthSelector = reloadMonthSelector;



function initializeProfitLossReport() {
    console.log('Khởi tạo Báo Cáo Lợi Nhuận & Chi Phí...');

    // === FIX 1: Tạo dropdown tháng ngay lập tức (tránh lỗi click không mở) ===
    const monthSelector = document.getElementById('reportMonthSelector');
    if (monthSelector) {
        // Nếu chưa có option nào → thêm tạm 1 cái để browser cho click
        if (monthSelector.options.length === 0) {
            monthSelector.innerHTML = '<option value="">Đang tải tháng...</option>';
        }

        // Tạo danh sách 12 tháng gần nhất theo chu kỳ 20/N → 19/N+1
        const months = [];
        const today = new Date();
        for (let i = 0; i < 12; i++) {
            const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const opMonth = getCurrentOperationalMonth(date);
            if (!months.includes(opMonth)) {
                months.push(opMonth);
            }
        }
        months.sort().reverse();

        // Fill options thật
        monthSelector.innerHTML = months.map(m => 
            `<option value="${m}" ${m === currentReportMonth ? 'selected' : ''}>Tháng ${m}</option>`
        ).join('');

        // Gắn sự kiện thay đổi tháng
        monthSelector.onchange = function() {
            currentReportMonth = this.value;
            loadProfitLossReport();
        };
    }

    // === FIX 2: Load báo cáo cho tháng hiện tại ===
    loadProfitLossReport();
}

function setupMonthSelector() {
    const monthSelector = document.getElementById('reportMonthSelector');
    if (!monthSelector) {
        console.error('❌ Không tìm thấy reportMonthSelector');
        return;
    }
    
    console.log('✅ Tìm thấy reportMonthSelector, đang setup...');
    
    // Generate last 12 months
    const months = generateOperationalMonths(12);
    
    // Clear và tạo options mới
    monthSelector.innerHTML = '';
    months.forEach(month => {
        const option = document.createElement('option');
        option.value = month;
        option.textContent = month;
        monthSelector.appendChild(option);
    });
    
    // Set current month
    monthSelector.value = currentReportMonth;
    
    console.log('✅ Đã setup dropdown với', months.length, 'tháng');
}

// Sửa event listener để khởi tạo khi chuyển tab
document.addEventListener('click', function(e) {
    if (e.target.closest('.tab-btn') && e.target.textContent.includes('Báo Cáo Tài Chính')) {
        console.log('📊 Tab Báo Cáo Tài Chính được click - Khởi tạo...');
        setTimeout(() => {
            initializeProfitLossReport();
        }, 100);
    }
});

// Khởi tạo ngay nếu tab đang active
if (document.getElementById('baocaoTab')?.classList.contains('active')) {
    setTimeout(initializeProfitLossReport, 500);
}
function setupReportEventListeners() {
    // Month selector
    const monthSelector = document.getElementById('reportMonthSelector');
    if (monthSelector) {
        monthSelector.addEventListener('change', function() {
            console.log('🔄 Thay đổi tháng báo cáo:', this.value);
            currentReportMonth = this.value;
            
            // Tắt chế độ so sánh khi đổi tháng
            if (isComparing) {
                document.getElementById('compareToggle').checked = false;
                hideComparisonSection();
                isComparing = false;
            }
            
            loadProfitLossReport();
        });
    }
    
    // Compare toggle
    const compareToggle = document.getElementById('compareToggle');
    if (compareToggle) {
        compareToggle.addEventListener('change', toggleComparison);
    }
}

// ==================== MAIN REPORT FUNCTIONS ====================

async function loadProfitLossReport() {
    try {
        console.log('📊 Loading profit loss report for:', currentReportMonth);
        
        // Cập nhật label tháng
        updateMonthLabel();
        
        // Load data từ các collection
        const [revenueData, salaryData, operationalData, dailyExpensesData] = await Promise.all([
            loadRevenueDataForMonth(currentReportMonth),
            loadSalaryData(currentReportMonth),
            loadOperationalExpensesData(currentReportMonth),
            loadDailyExpensesData(currentReportMonth)
        ]);
        
        console.log('✅ Data loaded:', { 
            revenue: revenueData.total,
            salary: salaryData.total, 
            operational: operationalData.total,
            daily: dailyExpensesData.total 
        });
        
        // Calculate profit loss
        profitLossData = calculateProfitLoss(
            revenueData,
            salaryData,
            operationalData,
            dailyExpensesData
        );
        
        // Display report
        displayProfitLossReport();
        
    } catch (error) {
        console.error('❌ Error in loadProfitLossReport:', error);
        showToast('Lỗi khi tải báo cáo tài chính', 'error');
    }
}

function updateMonthLabel() {
    const monthLabel = document.getElementById('currentMonthLabel');
    if (monthLabel) {
        monthLabel.textContent = currentReportMonth;
    }
}

// ==================== DISPLAY FUNCTIONS ====================

function displayProfitLossReport() {
    if (!profitLossData) {
        console.log('No profit loss data to display');
        return;
    }
    
    displaySummarySection();
    updateComparisonIfActive();
}

// Thay vì style inline, dùng class
function displaySummarySection() {
    const container = document.getElementById('reportSummary');
    if (!container) return;
    
    const { totalRevenue, totalCosts, netProfit, profitMargin, salaryCost, operationalCost, dailyCost } = profitLossData;
    
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
                <div class="cost-value">${formatCurrency(salaryCost)}</div>
                <div class="cost-percentage">${formatPercentage(salaryCost, totalCosts)}% tổng CP</div>
            </div>
            
            <div class="cost-detail-card operational-cost" onclick="showOperationalDetails()">
                <div class="cost-label">🏭 Chi Phí Vận Hành</div>
                <div class="cost-value">${formatCurrency(operationalCost)}</div>
                <div class="cost-percentage">${formatPercentage(operationalCost, totalCosts)}% tổng CP</div>
            </div>
            
            <div class="cost-detail-card daily-cost" onclick="showDailyExpensesDetails()">
                <div class="cost-label">📊 Chi Phí Hàng Ngày</div>
                <div class="cost-value">${formatCurrency(dailyCost)}</div>
                <div class="cost-percentage">${formatPercentage(dailyCost, totalCosts)}% tổng CP</div>
            </div>
        </div>
    `;
}

// ==================== COMPARISON SYSTEM ====================

function toggleComparison() {
    const compareToggle = document.getElementById('compareToggle');
    isComparing = compareToggle.checked;
    
    if (isComparing) {
        loadComparisonData();
    } else {
        hideComparisonSection();
    }
}

async function loadComparisonData() {
    try {
        console.log('🔄 Đang tải dữ liệu so sánh...');
        
        const currentMonthData = profitLossData;
        if (!currentMonthData) {
            showToast('Vui lòng tải dữ liệu tháng hiện tại trước', 'error');
            document.getElementById('compareToggle').checked = false;
            return;
        }
        
        // Lấy tháng trước
        const previousMonth = getPreviousMonth(currentReportMonth);
        const previousMonthData = await loadMonthData(previousMonth);
        
        if (!previousMonthData) {
            showToast('Không có dữ liệu tháng trước để so sánh', 'warning');
            document.getElementById('compareToggle').checked = false;
            return;
        }
        
        comparisonData = {
            current: currentMonthData,
            previous: previousMonthData,
            comparison: calculateComparison(currentMonthData, previousMonthData)
        };
        
        displayComparisonSection();
        
    } catch (error) {
        console.error('Error loading comparison data:', error);
        showToast('Lỗi khi tải dữ liệu so sánh', 'error');
        document.getElementById('compareToggle').checked = false;
    }
}

function displayComparisonSection() {
    const container = document.getElementById('comparisonSection');
    if (!container || !comparisonData || !comparisonData.comparison) return;
    
    const { current, previous, comparison } = comparisonData;
    const prevMonth = getPreviousMonth(currentReportMonth);
    
    container.style.display = 'block';
    container.innerHTML = `
        <h3>📊 So Sánh với Tháng ${prevMonth}</h3>
        <div class="comparison-grid">
            ${renderComparisonItem('💰 Doanh thu', current.totalRevenue, previous.totalRevenue, comparison.revenue)}
            ${renderComparisonItem('🏢 Tổng chi phí', current.totalCosts, previous.totalCosts, comparison.costs, true)}
            ${renderComparisonItem('📈 Lợi nhuận', current.netProfit, previous.netProfit, comparison.profit)}
            ${renderComparisonItem('👥 Chi phí nhân viên', current.salaryCost, previous.salaryCost, comparison.salary, true)}
            ${renderComparisonItem('🏭 Chi phí vận hành', current.operationalCost, previous.operationalCost, comparison.operational, true)}
            ${renderComparisonItem('📊 Chi phí hàng ngày', current.dailyCost, previous.dailyCost, comparison.daily, true)}
        </div>
    `;
}

function renderComparisonItem(label, currentVal, previousVal, comparison, isCost = false) {
    const absolute = isCost ? -comparison.absolute : comparison.absolute;
    const percentage = isCost ? -comparison.percentage : comparison.percentage;
    const isPositive = absolute >= 0;
    
    return `
        <div class="comparison-item">
            <div class="comparison-label">${label}</div>
            <div class="comparison-values">
                <span class="current-value">${formatCurrency(currentVal)}</span>
                <span class="previous-value">${formatCurrency(previousVal)}</span>
                <span class="comparison-badge ${isPositive ? 'positive' : 'negative'}">
                    ${isPositive ? '↗️' : '↘️'} 
                    ${formatCurrency(Math.abs(absolute))} 
                    (${Math.abs(percentage).toFixed(1)}%)
                </span>
            </div>
        </div>
    `;
}

function renderSummaryItem(label, percentage, isPositive) {
    return `
        <div style="padding: 15px; border-radius: 8px; text-align: center; background: ${isPositive ? '#e8f5e8' : '#ffebee'}; border: 1px solid ${isPositive ? '#4caf50' : '#f44336'};">
            <div style="font-size: 1.2rem; font-weight: bold; margin-bottom: 5px;">
                ${isPositive ? '↗️' : '↘️'} ${Math.abs(percentage).toFixed(1)}%
            </div>
            <div style="font-size: 0.8rem; color: #666;">${label}</div>
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

function updateComparisonIfActive() {
    if (isComparing && profitLossData) {
        loadComparisonData();
    }
}

// ==================== GLOBAL EXPORTS ====================

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

// ==================== INITIALIZATION ====================

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
