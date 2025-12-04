// FIX: Thêm các biến global để theo dõi state
let currentReportDate = formatDate();
let currentReport = null;
let isReportsInitialized = false;
// FIX: Khai báo biến hiển thị danh sách kho
let showInventoryList = false;
let showReportsHistory = false;

// FIX: Sửa hàm toggle
function toggleReportsHistoryTab() {
    showReportsHistory = !showReportsHistory;
    console.log('📜 Toggle reports history:', showReportsHistory);
    loadReportsTab();
}



// FIX: Sửa hàm toggleInventoryList - đảm bảo reload đúng
function toggleInventoryList() {
    showInventoryList = !showInventoryList;
    console.log('📦 Toggle inventory list:', showInventoryList);
    loadReportsTab();
}

async function changeDateByInput(dateString) {
    console.log('🗓️ changeDateByInput called with:', dateString);
    
    // Validate date
    if (!dateString) {
        showMessage('❌ Ngày không hợp lệ', 'error');
        return;
    }
    
    // Update current date
    currentReportDate = dateString;
    console.log('📅 Current date set to:', currentReportDate);
    
    // Reload reports tab với ngày mới
    console.log('🔄 Calling loadReportsTab...');
    loadReportsTab();
}

// FIX: Đảm bảo hàm được đặt trong global scope
window.changeDateByInput = changeDateByInput;

// SỬA HÀM getOrCreateReport - ĐẢM BẢO SỐ DƯ ĐẦU KỲ ĐÚNG KHI TẠO MỚI
async function getOrCreateReport(date) {
    try {
        console.log('🔍 getOrCreateReport called for date:', date);
        
        let report = await dbGet('reports', date);
        
        if (!report) {
            console.log('🆕 Creating new report for date:', date);
            
            // TÍNH SỐ DƯ ĐẦU KỲ TỪ NGÀY TRƯỚC
            let openingBalance = 0;
            const previousDate = getPreviousDate(date);
            
            if (previousDate) {
                const previousReport = await dbGet('reports', previousDate);
                if (previousReport) {
                    openingBalance = previousReport.closingBalance || 0;
                    console.log(`📊 Using previous day closing balance: ${openingBalance}`);
                }
            }
            
            report = {
                reportId: date,
                date: date,
                openingBalance: openingBalance, // ĐẢM BẢO ĐÚNG SỐ DƯ ĐẦU KỲ
                closingBalance: 0,
                revenue: 0,
                expenses: [],
                transfers: [],
                exports: [],
                createdBy: getCurrentUser().employeeId,
                updatedBy: getCurrentUser().employeeId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                _autoCalculated: true
            };
            
            await dbAdd('reports', report);
            console.log('✅ Created new report with correct opening balance:', openingBalance);
        } else {
            console.log('📝 Using existing report');
            
            // KIỂM TRA LẠI SỐ DƯ ĐẦU KỲ CÓ ĐÚNG KHÔNG
            const previousDate = getPreviousDate(date);
            if (previousDate) {
                const previousReport = await dbGet('reports', previousDate);
                if (previousReport) {
                    const correctOpeningBalance = previousReport.closingBalance || 0;
                    
                    if (report.openingBalance !== correctOpeningBalance) {
                        console.log(`⚠️ Opening balance mismatch: ${report.openingBalance} vs ${correctOpeningBalance}`);
                        
                        // Tự động fix
                        report.openingBalance = correctOpeningBalance;
                        await dbUpdate('reports', date, {
                            openingBalance: correctOpeningBalance,
                            updatedAt: new Date().toISOString(),
                            _synced: false,
                            _autoFixed: true
                        });
                    }
                }
            }
            
            // FIX: Đảm bảo exports tồn tại trong report cũ
            if (!report.exports) {
                report.exports = [];
                await dbUpdate('reports', report.reportId, {
                    exports: [],
                    updatedAt: new Date().toISOString()
                });
            }
        }
        
        return report;
    } catch (error) {
        console.error('❌ Error in getOrCreateReport:', error);
        return {
            reportId: date,
            date: date,
            openingBalance: 0,
            closingBalance: 0,
            revenue: 0,
            expenses: [],
            transfers: [],
            exports: [],
            createdBy: getCurrentUser().employeeId,
            updatedBy: getCurrentUser().employeeId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }
}

// FIX: Sửa hàm updateReportField - chỉ update UI, không lưu DB
async function updateReportField(field, value) {
    if (!currentReport) {
        console.error('currentReport is null when updating field:', field);
        currentReport = await getOrCreateReport(currentReportDate);
    }
    
    try {
        // CHỈ CẬP NHẬT TRONG MEMORY, KHÔNG LƯU DB
        currentReport[field] = value;
        const actualReceived = calculateActualReceived(currentReport);
        
        // Update UI only
        const actualReceivedElement = document.getElementById('actualReceived');
        if (actualReceivedElement) {
            actualReceivedElement.textContent = formatCurrency(actualReceived);
        }
        
        console.log('Updated field in memory:', field, 'to:', value);
        // KHÔNG gọi dbUpdate ở đây nữa
        
    } catch (error) {
        console.error('Error updating report field:', error);
        showMessage('Lỗi khi cập nhật báo cáo', 'error');
    }
}
// FIX: Thêm hàm debug để kiểm tra state
function debugReportsState() {
    console.log('=== REPORTS DEBUG ===');
    console.log('currentReportDate:', currentReportDate);
    console.log('currentReport:', currentReport);
    console.log('isReportsInitialized:', isReportsInitialized);
    
    const container = document.getElementById('reports');
    console.log('Reports container exists:', !!container);
    console.log('Reports container HTML length:', container?.innerHTML?.length);
    
    // Kiểm tra event listeners
    const expenseElements = document.querySelectorAll('[data-action="show-expenses"]');
    const transferElements = document.querySelectorAll('[data-action="show-transfers"]');
    console.log('Expense elements:', expenseElements.length);
    console.log('Transfer elements:', transferElements.length);
}

// FIX: Gọi debug khi cần (có thể remove sau khi fix xong)
// setTimeout(debugReportsState, 2000);






function handleReportsInput(e) {
    if (e.target.matches('#revenueInput')) {
        const value = parseFloat(e.target.value) || 0;
        updateReportField('revenue', value);
    } else if (e.target.matches('#closingBalanceInput')) {
        const value = parseFloat(e.target.value) || 0;
        updateReportField('closingBalance', value);
    }
}




// FIX: Hàm format thời gian
function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit'
    });
}


// FIX: Hàm render danh sách báo cáo
async function renderReportsHistoryList() {
    try {
        const reports = await dbGetAll('reports');
        const sortedReports = reports.sort((a, b) => b.date.localeCompare(a.date));
        
        // Nhân viên chỉ xem 3 báo cáo gần nhất
        const displayReports = isAdmin() ? sortedReports.slice(0, 10) : sortedReports.slice(0, 3);
        
        if (displayReports.length === 0) {
            return '<div class="empty-state"><p>Chưa có báo cáo nào</p></div>';
        }
        
        let historyHTML = '';
        
        for (const report of displayReports) {
            const totalExpenses = calculateTotalExpenses(report);
            const totalTransfers = calculateTotalTransfers(report);
            const actualReceived = calculateActualReceived(report);
            const totalExports = calculateTotalExports(report);
            
            // Lấy lịch sử xuất kho thực tế cho ngày này
            const exportsHistory = await getExportsHistoryForDate(report.date);
            const totalHistoricalExports = exportsHistory.reduce((sum, record) => sum + record.quantity, 0);
            const totalAllExports = totalExports + totalHistoricalExports;
            
            historyHTML += `
                <div class="history-day">
                    <div class="history-header">
                        <strong>${formatDateDisplay(report.date)}</strong>
                        <div class="history-actions">
                            ${isAdmin() ? `
                                <button class="btn btn-sm btn-outline" data-action="edit-report" data-date="${report.date}">Sửa</button>
                                <button class="btn btn-sm btn-danger" data-action="delete-report" data-date="${report.date}">Xóa</button>
                            ` : report.date === formatDate() ? `
                                <button class="btn btn-sm btn-outline" data-action="edit-report" data-date="${report.date}">Sửa</button>
                            ` : ''}
                        </div>
                    </div>
                    
                    <div class="history-details">
                        <div class="history-row">
                            <span>Doanh thu:</span>
                            <span>${formatCurrency(report.revenue)}</span>
                        </div>
                        <div class="history-row">
                            <span>Chi phí:</span>
                            <span>${formatCurrency(totalExpenses)}</span>
                        </div>
                        <div class="history-row">
                            <span>Thực nhận:</span>
                            <span class="history-actual">${formatCurrency(actualReceived)}</span>
                        </div>
                        ${totalAllExports > 0 ? `
                            <div class="history-exports">
                                <strong>📦 Xuất kho: ${totalAllExports} sản phẩm</strong>
                                <button class="btn btn-link btn-sm" data-action="show-day-exports" data-date="${report.date}">
                                    (chi tiết)
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }
        
        return `<div class="reports-history-list">${historyHTML}</div>`;
        
    } catch (error) {
        return '<div class="empty-state"><p>Lỗi tải lịch sử báo cáo</p></div>';
    }
}

// FIX: Hàm render lịch sử xuất kho
async function renderExportsHistoryList() {
    try {
        const allHistory = await dbGetAll('inventoryHistory');
        const inventory = await dbGetAll('inventory');
        
        // Lọc chỉ xuất kho và nhóm theo ngày
        const exportsHistory = allHistory.filter(record => record.type === 'out');
        const exportsByDate = {};
        
        exportsHistory.forEach(record => {
            const recordDate = record.date.split('T')[0];
            if (!exportsByDate[recordDate]) {
                exportsByDate[recordDate] = [];
            }
            
            const product = inventory.find(p => p.productId === record.productId);
            exportsByDate[recordDate].push({
                ...record,
                product: product
            });
        });
        
        // Sắp xếp ngày mới nhất trước
        const sortedDates = Object.keys(exportsByDate).sort((a, b) => b.localeCompare(a));
        const displayDates = isAdmin() ? sortedDates.slice(0, 10) : sortedDates.slice(0, 5);
        
        if (displayDates.length === 0) {
            return '<div class="empty-state"><p>Chưa có xuất kho nào</p></div>';
        }
        
        let exportsHTML = '';
        
        for (const date of displayDates) {
            const dayExports = exportsByDate[date];
            const totalExports = dayExports.reduce((sum, record) => sum + record.quantity, 0);
            
            exportsHTML += `
                <div class="exports-day">
                    <div class="exports-header">
                        <strong>${formatDateDisplay(date)}</strong>
                        <span class="exports-total">${totalExports} sản phẩm</span>
                    </div>
                    
                    <div class="exports-items">
                        ${dayExports.slice(0, 3).map(record => `
                            <div class="export-item">
                                <span class="export-product">${record.product?.name || 'Unknown'}</span>
                                <span class="export-quantity">${record.quantity} ${record.product?.unit || ''}</span>
                                <span class="export-time">${formatTime(record.date)}</span>
                            </div>
                        `).join('')}
                        
                        ${dayExports.length > 3 ? `
                            <div class="export-more">
                                <button class="btn btn-link btn-sm" data-action="show-day-exports" data-date="${date}">
                                    +${dayExports.length - 3} sản phẩm khác
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }
        
        return `<div class="exports-history-list">${exportsHTML}</div>`;
        
    } catch (error) {
        return '<div class="empty-state"><p>Lỗi tải lịch sử xuất kho</p></div>';
    }
}

// FIX: Hàm hiển thị chi tiết xuất kho theo ngày
async function showDayExportsPopup(date) {
    try {
        const exportsHistory = await getExportsHistoryForDate(date);
        
        if (exportsHistory.length === 0) {
            showMessage(`📭 Không có xuất kho ngày ${formatDateDisplay(date)}`, 'info');
            return;
        }
        
        const totalExports = exportsHistory.reduce((sum, record) => sum + record.quantity, 0);
        
        const popupHTML = `
            <div class="popup" style="max-width: 700px;">
                <button class="close-popup" data-action="close-popup">×</button>
                <h3>📦 Chi tiết Xuất kho - ${formatDateDisplay(date)}</h3>
                
                <div class="exports-summary">
                    <strong>Tổng: ${totalExports} sản phẩm</strong>
                </div>
                
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Tên sản phẩm</th>
                            <th>SL</th>
                            <th>ĐVT</th>
                            <th>Thời gian</th>
                            <th>Ghi chú</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${exportsHistory.map((record, index) => `
                            <tr>
                                <td>${record.product?.name || 'Unknown'}</td>
                                <td style="color: red; font-weight: bold;">${record.quantity}</td>
                                <td>${record.product?.unit || ''}</td>
                                <td>${formatTime(record.date)}</td>
                                <td>${record.note || ''}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div class="popup-actions">
                    <button class="btn btn-secondary" data-action="close-popup">Đóng</button>
                </div>
            </div>
        `;
        
        showPopup(popupHTML);
        
    } catch (error) {
        console.error('Error showing day exports:', error);
        showMessage('❌ Lỗi khi tải chi tiết xuất kho', 'error');
    }
}
// HÀM CHÍNH: KHỞI TẠO BÁO CÁO (Đảm bảo setup listener chính chỉ chạy một lần)
function initializeReportsTab() {
    if (!isReportsInitialized) {
        loadReportsTab();
        isReportsInitialized = true;
        // THÊM: Gọi setupReportsEventListeners ở đây để đảm bảo chỉ chạy MỘT LẦN
        setupReportsEventListeners();
    }
}

// Thay vì document.addEventListener, dùng container cụ thể
function setupReportsEventListeners() {
    console.log('Setting up reports event listeners...');
    
    const reportsContainer = document.getElementById('reports');
    if (!reportsContainer) return;
    
    // Remove old listeners
    reportsContainer.removeEventListener('click', handleReportsClick);
    reportsContainer.removeEventListener('input', handleReportsInput);
    
    // Add new listeners chỉ trên reports container
    reportsContainer.addEventListener('click', handleReportsClick);
    reportsContainer.addEventListener('input', handleReportsInput);
    
    console.log('✅ Reports event listeners setup on container');
}

// HÀM SETUP CHO POPUP CHI PHÍ (Thêm cleanup)
function setupExpensesEventListeners() { 
    // GỠ BỎ listener cũ
    document.removeEventListener('click', handleExpensesClick); 
    // Gắn listener mới
    document.addEventListener('click', handleExpensesClick); 
} 

// HÀM SETUP CHO POPUP CHUYỂN KHOẢN (Thêm cleanup)
function setupTransfersEventListeners() {
    // GỠ BỎ listener cũ
    document.removeEventListener('click', handleTransfersClick);
    // Gắn listener mới
    document.addEventListener('click', handleTransfersClick);
}


function handleReportsClick(e) {
    // KIỂM TRA nếu click từ inventory container thì bỏ qua
    if (e.target.closest('#inventory')) {
        console.log('🚫 Click from inventory, ignoring in reports');
        return;
    }
    
    const action = e.target.dataset.action;
    const target = e.target;
    
    console.log('🔍 Click detected - Action:', action, 'Target:', target);

    // --- XỬ LÝ CLICK XUẤT KHO ---

    const exportRow = target.closest('.export-row');
// FIX: Xử lý click vào dòng export
    if (target.closest('.export-row') && target.dataset.action !== 'decrease-export') {
        const productId = target.closest('.export-row').dataset.productId;
        if (productId) increaseExport(productId);
        return;
    }
    if (exportRow) {
        const productId = exportRow.dataset.productId;
        
        // 1. Xử lý GIẢM: Nếu click trực tiếp vào nút có data-action="decrease-export"
        if (action === 'decrease-export') {
            console.log(`📉 Decreasing export for: ${productId}`);
            decreaseExport(productId);
            return;
        }
        
        // 2. Xử lý TĂNG: Nếu click vào bất kỳ chỗ nào khác trong hàng (bao gồm tên SP)
        if (productId) {
            console.log(`⬆️ Increasing export for: ${productId}`);
            increaseExport(productId);
            return;
        }
    }
    
    // --- XỬ LÝ CÁC HÀNH ĐỘNG KHÁC (GIỮ NGUYÊN) ---

    if (action === "toggle-reports-history") {
        toggleReportsHistoryTab();
        return;
    }
    
    if (action === "toggle-inventory-list") {
        toggleInventoryList();
        return;
    }
    
    // ... (Giữ nguyên các khối logic if/else if cho save-report, show-expenses, v.v.)
    if (action === "clear-all-data") clearAllData();
    else if (action === "clear-device-id") clearDeviceId();
    else if (action === "show-expenses") {
        console.log('💰 Opening expenses popup...');
        showExpensesPopup();
    }    
    else if (action === "show-transfers") {
        console.log('🏦 Opening transfers popup...');
        showTransfersPopup();
    }    
    else if (action === "save-report") {
        saveCurrentReport();
    }    
}
    
// FIX: Hàm fix tất cả số dư đầu kỳ
async function fixAllOpeningBalances() {
    try {
        console.log('🔄 Fixing all opening balances...');
        
        const allReports = await dbGetAll('reports');
        const sortedReports = allReports.sort((a, b) => a.date.localeCompare(b.date));
        
        console.log('📊 Total reports:', sortedReports.length);
        
        for (let i = 0; i < sortedReports.length; i++) {
            const currentReport = sortedReports[i];
            let newOpeningBalance = 0;
            
            if (i > 0) {
                // Lấy báo cáo ngày hôm trước
                const prevReport = sortedReports[i - 1];
                
                // Kiểm tra xem có phải ngày liên tiếp không
                const currentDate = new Date(currentReport.date + 'T00:00:00');
                const prevDate = new Date(prevReport.date + 'T00:00:00');
                prevDate.setDate(prevDate.getDate() + 1);
                
                if (formatDate(currentDate) === formatDate(prevDate)) {
                    newOpeningBalance = prevReport.closingBalance;
                }
            }
            
            if (currentReport.openingBalance !== newOpeningBalance) {
                console.log(`🔄 Fixing ${currentReport.date}: ${currentReport.openingBalance} → ${newOpeningBalance}`);
                await dbUpdate('reports', currentReport.reportId, {
                    openingBalance: newOpeningBalance,
                    updatedAt: new Date().toISOString()
                });
            }
        }
        
        console.log('✅ Fixed all opening balances');
        showMessage('✅ Đã fix tất cả số dư đầu kỳ', 'success');
        
        // Reload để xem kết quả
        setTimeout(() => {
            loadReportsTab();
        }, 1000);
        
    } catch (error) {
        console.error('❌ Error fixing opening balances:', error);
        showMessage('❌ Lỗi khi fix số dư đầu kỳ', 'error');
    }
}

/**
 * @name updateOpeningBalanceChain
 * @description Tự động cập nhật số dư đầu kỳ cho chuỗi ngày liên tiếp
 */
async function updateOpeningBalanceChain(startDate) {
    try {
        console.log('⛓️ Updating opening balance chain starting from:', startDate);
        
        // Lấy tất cả reports từ startDate trở đi
        const allReports = await dbGetAll('reports');
        const futureReports = allReports
            .filter(r => r.date >= startDate)
            .sort((a, b) => a.date.localeCompare(b.date));
        
        if (futureReports.length < 2) return;
        
        let previousBalance = 0;
        
        // Tìm opening balance của startDate
        const startReport = futureReports.find(r => r.date === startDate);
        if (startReport) {
            previousBalance = startReport.closingBalance || 0;
        }
        
        // Cập nhật cho các ngày tiếp theo
        for (let i = 1; i < futureReports.length; i++) {
            const currentReport = futureReports[i];
            const prevReport = futureReports[i - 1];
            
            // Kiểm tra xem có phải ngày liên tiếp không
            const currentDate = new Date(currentReport.date);
            const prevDate = new Date(prevReport.date);
            prevDate.setDate(prevDate.getDate() + 1);
            
            if (formatDate(currentDate) === formatDate(prevDate)) {
                // Ngày liên tiếp, cập nhật opening balance
                const correctOpening = prevReport.closingBalance || 0;
                
                if (currentReport.openingBalance !== correctOpening) {
                    console.log(`🔗 ${currentReport.date}: ${currentReport.openingBalance} → ${correctOpening}`);
                    
                    await dbUpdate('reports', currentReport.reportId, {
                        openingBalance: correctOpening,
                        updatedAt: new Date().toISOString(),
                        _synced: false,
                        _autoCalculated: true
                    });
                    
                    // Sync lên Firebase
                    if (firebaseSync.enabled) {
                        const updatedReport = {
                            ...currentReport,
                            openingBalance: correctOpening,
                            updatedAt: new Date().toISOString()
                        };
                        await syncToFirebase('reports', updatedReport);
                    }
                }
            }
        }
        
        console.log('✅ Opening balance chain updated');
        
    } catch (error) {
        console.error('❌ Error updating opening balance chain:', error);
    }
}


// FIX: Sửa hoàn toàn hàm formatDate - tránh timezone issues
function formatDate(date = new Date()) {
    // Nếu là string, xử lý trực tiếp không dùng Date object
    if (typeof date === 'string') {
        // Kiểm tra định dạng YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return date; // Trả về nguyên string nếu đã đúng format
        }
        // Nếu không phải định dạng chuẩn, thử parse
        const parts = date.split('-');
        if (parts.length === 3) {
            const year = parts[0];
            const month = parts[1];
            const day = parts[2];
            return `${year}-${month}-${day}`;
        }
    }
    
    // Nếu là Date object, format thủ công
    if (date instanceof Date) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    // Fallback: lấy ngày hiện tại
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}
// FIX: Hàm debug để kiểm tra tất cả báo cáo
async function debugAllReports() {
    try {
        const allReports = await dbGetAll('reports');
        const sortedReports = allReports.sort((a, b) => a.date.localeCompare(b.date));
        
        console.log('=== 📊 ALL REPORTS DEBUG ===');
        sortedReports.forEach((report, index) => {
            console.log(`📅 ${report.date}: Opening=${report.openingBalance}, Closing=${report.closingBalance}, Revenue=${report.revenue}`);
        });
        console.log('=== END DEBUG ===');
        
        return sortedReports;
    } catch (error) {
        console.error('Error debugging reports:', error);
    }
}



async function renderExportsTable(currentExports) {
    try {
        const inventory = await dbGetAll('inventory');
        if (!inventory?.length) return '<tr><td colspan="4" class="empty-table"><p>Kho trống</p></td></tr>';

        return inventory.map(product => {
            const exportItem = currentExports?.find(exp => exp.productId === product.productId);
            const exportQuantity = exportItem?.quantity || 0;
            const hasExport = exportQuantity > 0;
            
            return `
                <tr class="export-row ${hasExport ? 'has-export' : ''}" 
                    data-product-id="${product.productId}">
                    <td class="product-info">
                        <div class="product-name-row">
                            <span class="product-name">${product.name}</span>
                            <span class="product-unit">${product.unit}</span>
                        </div>
                    </td>
                    <td class="stock-quantity">${product.currentQuantity}</td>
                    <td class="export-quantity">${exportQuantity}</td>
                    <td class="export-actions">
                        <button class="btn btn-danger btn-sm" data-action="decrease-export" 
                                data-product-id="${product.productId}" ${exportQuantity === 0 ? 'disabled' : ''}>-</button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        return '<tr><td colspan="4" class="empty-table"><p>Lỗi tải kho</p></td></tr>';
    }
}

async function decreaseExport(productId) {
    if (!currentReport) {
        currentReport = await getOrCreateReport(currentReportDate);
    }
    
    try {
        console.log(`📉 Decreasing export for product: ${productId}`);
        
        // Tìm index của sản phẩm trong exports
        const exportIndex = currentReport.exports.findIndex(e => e.productId === productId);
        
        if (exportIndex !== -1) {
            const exportItem = currentReport.exports[exportIndex];
            console.log(`Found export item:`, exportItem);
            
            // Giảm số lượng
            exportItem.quantity -= 1;
            console.log(`New quantity: ${exportItem.quantity}`);
            
            // Nếu số lượng <= 0 thì xóa khỏi mảng
            if (exportItem.quantity <= 0) {
                currentReport.exports.splice(exportIndex, 1);
                console.log(`Removed product from exports (quantity <= 0)`);
            }
            
            // QUAN TRỌNG: Cập nhật lại toàn bộ currentReport
            const updatedReport = {
                ...currentReport,
                updatedAt: new Date().toISOString(),
                _synced: false
            };
            
            // Lưu vào IndexedDB
            await dbUpdate('reports', currentReport.reportId, {
                exports: currentReport.exports,
                updatedAt: new Date().toISOString(),
                _synced: false
            });
            
            console.log(`✅ Updated report in IndexedDB`);
            
            // Sync lên Firebase nếu có kết nối
            if (typeof syncToFirebase === 'function' && firebaseSync.enabled) {
                try {
                    await syncToFirebase('reports', updatedReport);
                    console.log(`✅ Synced to Firebase`);
                } catch (syncError) {
                    console.warn('⚠️ Firebase sync failed (will retry):', syncError);
                }
            }
            
        } else {
            console.warn(`Product ${productId} not found in exports`);
        }
        
        // Tải lại giao diện để hiển thị thay đổi
        await loadReportsTab();
        
    } catch (error) {
        console.error('❌ Error decreasing export:', error);
        showMessage('❌ Lỗi khi giảm số lượng xuất kho', 'error');
    }
}
window.decreaseExport = decreaseExport;

// FIX: Thêm hàm addFromInventory - click vào sản phẩm trong kho để thêm xuất kho
async function addFromInventory(productId) {
    if (!currentReport) return;
    
    try {
        // Lấy thông tin sản phẩm từ kho
        const product = await dbGet('inventory', productId);
        if (!product) {
            showMessage('❌ Sản phẩm không tồn tại trong kho', 'error');
            return;
        }

        // Kiểm tra xem đã có trong xuất kho chưa
        let exportItem = currentReport.exports.find(exp => exp.productId === productId);
        
        if (exportItem) {
            // Nếu đã có thì tăng số lượng
            if (exportItem.quantity >= product.currentQuantity) {
                showMessage(`❌ Không đủ tồn kho. Tồn kho: ${product.currentQuantity}`, 'error');
                return;
            }
            exportItem.quantity += 1;
        } else {
            // Nếu chưa có thì tạo mới với số lượng 1
            exportItem = {
                productId: productId,
                name: product.name,
                quantity: 1,
                exportedAt: new Date().toISOString()
            };
            currentReport.exports.push(exportItem);
        }
        
        await dbUpdate('reports', currentReport.reportId, {
            exports: currentReport.exports,
            updatedAt: new Date().toISOString()
        });
        
        showMessage(`📦 Đã thêm ${product.name} vào xuất kho`, 'success');
        loadReportsTab();
        
    } catch (error) {
        console.error('Error adding from inventory:', error);
        showMessage('❌ Lỗi khi thêm xuất kho', 'error');
    }
}
// FIX: Sửa hàm renderReportsHistory
async function renderReportsHistory() {
    try {
        const reports = await dbGetAll('reports');
        const sortedReports = reports.sort((a, b) => b.date.localeCompare(a.date));
        
        // Nhân viên chỉ xem 3 báo cáo gần nhất
        const displayReports = isAdmin() ? sortedReports.slice(0, 10) : sortedReports.slice(0, 3);
        
        let historyHTML = '';
        
        for (const report of displayReports) {
            const totalExpenses = calculateTotalExpenses(report);
            const totalTransfers = calculateTotalTransfers(report);
            const actualReceived = calculateActualReceived(report);
            const totalExports = calculateTotalExports(report);
            
            historyHTML += `
                <div class="history-day">
                    <div class="history-header">
                        <strong>${formatDateDisplay(report.date)}</strong>
                        <div class="history-actions">
                            ${isAdmin() ? `
                                <button class="btn btn-sm btn-outline" data-action="edit-report" data-date="${report.date}">Sửa</button>
                                <button class="btn btn-sm btn-danger" data-action="delete-report" data-date="${report.date}">Xóa</button>
                            ` : report.date === formatDate() ? `
                                <button class="btn btn-sm btn-outline" data-action="edit-report" data-date="${report.date}">Sửa</button>
                            ` : ''}
                        </div>
                    </div>
                    
                    <div class="history-details">
                        <div class="history-row">
                            <span>Doanh thu:</span>
                            <span>${formatCurrency(report.revenue)}</span>
                        </div>
                        <div class="history-row">
                            <span>Chi phí:</span>
                            <span>${formatCurrency(totalExpenses)}</span>
                        </div>
                        <div class="history-row">
                            <span>Thực nhận:</span>
                            <span class="history-actual">${formatCurrency(actualReceived)}</span>
                        </div>
                        ${totalExports > 0 ? `
                            <div class="history-exports">
                                <strong>Xuất kho: ${totalExports} sản phẩm</strong>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }
        
        return `<div class="reports-history-list">${historyHTML}</div>`;
        
    } catch (error) {
        return '<div class="empty-state"><p>Lỗi tải lịch sử</p></div>';
    }
}
// FIX: Hàm render chi tiết xuất kho trong lịch sử
function renderExportsHistory(exports) {
    if (!exports || exports.length === 0) return '';
    
    return exports.map(exp => `
        <div class="export-history-item">
            <span>${exp.name}</span>
            <span class="export-qty">${exp.quantity}</span>
        </div>
    `).join('');
}


function clearDeviceId() {
    localStorage.removeItem('cafe_device_id');
    localStorage.removeItem('currentUser');
    showMessage('✅ Đã xóa ID thiết bị', 'success');
    setTimeout(() => location.href = 'login.html', 1000);
}
async function clearAllData() {
    if (!confirm('❌ XÓA TOÀN BỘ DỮ LIỆU?\n\nThis cannot be undone!')) return;
    
    try {
        const stores = ['employees', 'reports', 'inventory', 'inventoryHistory', 'operations', 'attendance', 'settings'];
        for (const storeName of stores) {
            const allData = await dbGetAll(storeName);
            for (const item of allData) {
                await dbDelete(storeName, storeName === 'reports' ? item.reportId : 
                                            storeName === 'employees' ? item.employeeId :
                                            storeName === 'inventory' ? item.productId :
                                            storeName === 'settings' ? item.key : item[Object.keys(item)[0]]);
            }
        }
        showMessage('✅ Đã xóa toàn bộ dữ liệu', 'success');
        setTimeout(() => location.reload(), 1000);
    } catch (error) {
        showMessage('❌ Lỗi khi xóa dữ liệu', 'error');
    }
}


// FIX: Thêm hàm debug event listeners
function debugOperationsClick() {
    console.log('🐛 DEBUG OPERATIONS CLICK...');
    
    const operationElements = document.querySelectorAll('[data-action="show-operations"]');
    console.log('Found operation elements:', operationElements.length);
    
    operationElements.forEach((el, index) => {
        console.log(`Element ${index}:`, el);
        console.log(`  - dataset:`, el.dataset);
        console.log(`  - innerHTML:`, el.innerHTML);
    });
}

// Gọi debug sau khi render
// setTimeout(debugOperationsClick, 1000);

// FIX: Sửa hàm addSampleExports - tạo xuất kho từ danh sách kho thực tế
async function addSampleExports() {
    if (!currentReport) return;
    
    try {
        // Lấy danh sách sản phẩm từ kho
        const inventory = await dbGetAll('inventory');
        
        if (inventory.length === 0) {
            showMessage('❌ Không có sản phẩm nào trong kho', 'error');
            return;
        }
        
        // Tạo xuất kho mẫu từ 2 sản phẩm đầu tiên
        currentReport.exports = inventory.slice(0, 2).map(product => ({
            productId: product.productId,
            name: product.name,
            quantity: 1, // Mặc định 1
            exportedAt: new Date().toISOString()
        }));
        
        await dbUpdate('reports', currentReport.reportId, {
            exports: currentReport.exports,
            updatedAt: new Date().toISOString()
        });
        
        showMessage('✅ Đã thêm xuất kho mẫu', 'success');
        loadReportsTab();
        
    } catch (error) {
        console.error('Error adding sample exports:', error);
        showMessage('❌ Lỗi khi thêm dữ liệu mẫu', 'error');
    }
}



// FIX: Thêm hàm debug để test event listeners
function testEventListeners() {
    console.log('=== TESTING EVENT LISTENERS ===');
    
    // Test tất cả các elements có data-action
    const allActionElements = document.querySelectorAll('[data-action]');
    console.log('Total elements with data-action:', allActionElements.length);
    
    allActionElements.forEach((el, index) => {
        console.log(`Element ${index}:`, el, 'Action:', el.dataset.action);
    });
    
    // Test cụ thể các elements quan trọng
    const testElements = [
        '[data-action="show-expenses"]',
        '[data-action="show-transfers"]', 
        '[data-action="increase-export"]',
        '[data-action="decrease-export"]',
        '[data-action="show-operations"]',
        '[data-action="show-reports-history"]',
        '[data-action="show-operations-history"]'
    ];
    
    testElements.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        console.log(`Elements for ${selector}:`, elements.length);
    });
}

// FIX: Gọi test sau khi render
// setTimeout(testEventListeners, 1000);

// Calculate totals
function calculateActualReceived(report) {
    const totalExpenses = calculateTotalExpenses(report);
    const totalTransfers = calculateTotalTransfers(report);
    return report.openingBalance + report.revenue - totalExpenses - totalTransfers - report.closingBalance;
}


// FIX: Sửa hàm calculateTotalTransfers
function calculateTotalTransfers(report) {
    if (!report.transfers || !Array.isArray(report.transfers)) {
        return 0;
    }
    return report.transfers.reduce((total, transfer) => total + (transfer.amount || 0), 0);
}

// FIX: Sửa hàm calculateTotalExports
function calculateTotalExports(report) {
    if (!report.exports || !Array.isArray(report.exports)) {
        return 0;
    }
    return report.exports.reduce((total, exportItem) => total + (exportItem.quantity || 0), 0);
}

// FIX: Sửa hàm showExpensesPopup - thêm dropdown autocomplete và sắp xếp
async function showExpensesPopup() {
    if (!currentReport) return;
    
    try {
        // Lấy danh sách chi phí từ lịch sử
        const allReports = await dbGetAll('reports');
        const expenseHistory = new Set();
        
        allReports.forEach(report => {
            if (report.expenses && Array.isArray(report.expenses)) {
                report.expenses.forEach(expense => {
                    if (expense.name && expense.name.trim()) {
                        expenseHistory.add(expense.name.trim());
                    }
                });
            }
        });
        
        const expenseSuggestions = Array.from(expenseHistory).slice(0, 10);
        
        // Sắp xếp chi phí hiện tại - mới nhất lên đầu
        const sortedExpenses = currentReport.expenses ? 
            [...currentReport.expenses].sort((a, b) => {
                const dateA = new Date(a.createdAt || a.date || Date.now());
                const dateB = new Date(b.createdAt || b.date || Date.now());
                return dateB - dateA;
            }) : [];
        
        const popupHTML = `
            <div class="popup">
                <button class="close-popup" data-action="close-popup">×</button>
                <h3>💰 Quản lý Chi phí - ${formatDateDisplay(currentReport.date)}</h3>
                
                <div class="add-expense-form">
                    <div class="expense-input-container">
                        <input type="text" id="expenseName" placeholder="Tìm hoặc nhập tên chi phí" 
                               list="expenseSuggestions" autocomplete="off">
                        <datalist id="expenseSuggestions">
                            ${expenseSuggestions.map(expense => `
                                <option value="${expense}">${expense}</option>
                            `).join('')}
                        </datalist>
                    </div>
                    <input type="number" id="expenseAmount" placeholder="Số tiền" min="0">
                    <button class="btn btn-primary" data-action="add-expense">Thêm</button>
                </div>
                
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Tên chi phí</th>
                            <th>Số tiền</th>
                            <th>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody id="expensesList">
                        ${sortedExpenses.map(expense => `
                            <tr>
                                <td>${expense.name}</td>
                                <td>${formatCurrency(expense.amount)}</td>
                                <td>
                                    <button class="btn btn-danger btn-sm" 
                                            data-action="delete-expense" 
                                            data-id="${expense.expenseId}">Xóa</button>
                                </td>
                            </tr>
                        `).join('')}
                        ${sortedExpenses.length === 0 ? `
                            <tr>
                                <td colspan="3" style="text-align: center; color: #666;">Chưa có chi phí nào</td>
                            </tr>
                        ` : ''}
                    </tbody>
                </table>
                
                ${sortedExpenses.length > 0 ? `
                <div class="section-total">
                    <strong>Tổng chi phí:</strong>
                    <strong>${formatCurrency(sortedExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0))}</strong>
                </div>
                ` : ''}
                
                <div class="popup-actions">
                    <button class="btn btn-secondary" data-action="close-popup">Đóng</button>
                </div>
            </div>
        `;
        
        showPopup(popupHTML);
        setupExpensesEventListeners();
        
    } catch (error) {
        console.error('Error showing expenses popup:', error);
        showMessage('Lỗi tải popup chi phí', 'error');
    }
}

// FIX: Sửa hàm showTransfersPopup - sắp xếp và fix lỗi
async function showTransfersPopup() {
    if (!currentReport) return;
    
    try {
        // Lấy danh sách nội dung từ lịch sử
        const allReports = await dbGetAll('reports');
        const transferHistory = new Set();
        
        allReports.forEach(report => {
            if (report.transfers && Array.isArray(report.transfers)) {
                report.transfers.forEach(transfer => {
                    if (transfer.content && transfer.content.trim()) {
                        transferHistory.add(transfer.content.trim());
                    }
                });
            }
        });
        
        const transferSuggestions = Array.from(transferHistory).slice(0, 10);
        
        // Sắp xếp chuyển khoản hiện tại - mới nhất lên đầu
        const sortedTransfers = currentReport.transfers ? 
            [...currentReport.transfers].sort((a, b) => {
                const dateA = new Date(a.createdAt || a.date || Date.now());
                const dateB = new Date(b.createdAt || b.date || Date.now());
                return dateB - dateA;
            }) : [];
        
        const popupHTML = `
            <div class="popup">
                <button class="close-popup" data-action="close-popup">×</button>
                <h3>🏦 Quản lý Chuyển khoản - ${formatDateDisplay(currentReport.date)}</h3>
                
                <div class="add-transfer-form">
                    <div class="transfer-input-container">
                        <input type="text" id="transferContent" placeholder="Nội dung chuyển khoản" 
                               list="transferSuggestions" autocomplete="off">
                        <datalist id="transferSuggestions">
                            ${transferSuggestions.map(content => `
                                <option value="${content}">${content}</option>
                            `).join('')}
                        </datalist>
                    </div>
                    <input type="number" id="transferAmount" placeholder="Số tiền" min="0">
                    <button class="btn btn-primary" data-action="add-transfer">Thêm</button>
                </div>
                
                <div class="transfer-note">
                    <small>💡 Có thể nhập số tiền 0đ. Nếu không nhập nội dung sẽ tự động tạo.</small>
                </div>
                
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Nội dung</th>
                            <th>Số tiền</th>
                            <th>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody id="transfersList">
                        ${sortedTransfers.map(transfer => `
                            <tr>
                                <td>${transfer.content || 'Không có nội dung'}</td>
                                <td>${formatCurrency(transfer.amount)}</td>
                                <td>
                                    <button class="btn btn-danger btn-sm" 
                                            data-action="delete-transfer" 
                                            data-id="${transfer.transferId}">Xóa</button>
                                </td>
                            </tr>
                        `).join('')}
                        ${sortedTransfers.length === 0 ? `
                            <tr>
                                <td colspan="3" style="text-align: center; color: #666;">Chưa có chuyển khoản nào</td>
                            </tr>
                        ` : ''}
                    </tbody>
                </table>
                
                ${sortedTransfers.length > 0 ? `
                <div class="section-total">
                    <strong>Tổng chuyển khoản:</strong>
                    <strong>${formatCurrency(sortedTransfers.reduce((sum, trans) => sum + (trans.amount || 0), 0))}</strong>
                </div>
                ` : ''}
                
                <div class="popup-actions">
                    <button class="btn btn-secondary" data-action="close-popup">Đóng</button>
                </div>
            </div>
        `;
        
        showPopup(popupHTML);
        setupTransfersEventListeners();
        
    } catch (error) {
        console.error('Error showing transfers popup:', error);
        showMessage('Lỗi tải popup chuyển khoản', 'error');
    }
}


function handleExpensesClick(e) {
    if (e.target.matches('[data-action="add-expense"]')) {
        addNewExpense();
    } else if (e.target.matches('[data-action="delete-expense"]')) {
        deleteExpense(e.target.dataset.id);
    }
}

async function addNewExpense() {
    const nameInput = document.getElementById('expenseName');
    const amountInput = document.getElementById('expenseAmount');
    
    const name = nameInput.value.trim();
    const amount = parseFloat(amountInput.value);
    
    if (!name) {
        showMessage('Vui lòng nhập tên chi phí', 'error');
        return;
    }
    
    if (!amount || amount <= 0) {
        showMessage('Vui lòng nhập số tiền hợp lệ', 'error');
        return;
    }
    
    try {
        const newExpense = {
            expenseId: 'exp_' + Date.now(),
            name: name,
            amount: amount,
            createdAt: new Date().toISOString()
        };
        
        currentReport.expenses.push(newExpense);
        await dbUpdate('reports', currentReport.reportId, { 
            expenses: currentReport.expenses,
            updatedAt: new Date().toISOString()
        });
        
        nameInput.value = '';
        amountInput.value = '';
        
        showMessage('Đã thêm chi phí thành công', 'success');
        showExpensesPopup();
        loadReportsTab();
        
    } catch (error) {
        console.error('Error adding expense:', error);
        showMessage('Lỗi khi thêm chi phí', 'error');
    }
}

async function deleteExpense(expenseId) {
    try {
        currentReport.expenses = currentReport.expenses.filter(exp => exp.expenseId !== expenseId);
        await dbUpdate('reports', currentReport.reportId, { 
            expenses: currentReport.expenses,
            updatedAt: new Date().toISOString()
        });
        
        showMessage('Đã xóa chi phí', 'success');
        showExpensesPopup();
        loadReportsTab();
        
    } catch (error) {
        console.error('Error deleting expense:', error);
        showMessage('Lỗi khi xóa chi phí', 'error');
    }
}



// FIX: Sửa hàm addNewTransfer - cho phép 0đ và tự động nội dung
async function addNewTransfer() {
    const contentInput = document.getElementById('transferContent');
    const amountInput = document.getElementById('transferAmount');
    
    let content = contentInput.value.trim();
    const amount = parseFloat(amountInput.value) || 0; // Cho phép 0đ
    
    // Tự động tạo nội dung nếu để trống
    if (!content && amount > 0) {
        content = `Chuyển khoản ${formatCurrency(amount)}`;
    } else if (!content) {
        content = 'Chuyển khoản'; // Mặc định cho 0đ
    }
    
    try {
        const newTransfer = {
            transferId: 'trf_' + Date.now(),
            content: content,
            amount: amount,
            createdAt: new Date().toISOString()
        };
        
        currentReport.transfers.push(newTransfer);
        await dbUpdate('reports', currentReport.reportId, { 
            transfers: currentReport.transfers,
            updatedAt: new Date().toISOString()
        });
        
        contentInput.value = '';
        amountInput.value = '';
        
        showMessage('Đã thêm chuyển khoản thành công', 'success');
        showTransfersPopup();
        loadReportsTab();
        
    } catch (error) {
        console.error('Error adding transfer:', error);
        showMessage('Lỗi khi thêm chuyển khoản', 'error');
    }
}


function handleTransfersClick(e) {
    if (e.target.matches('[data-action="add-transfer"]')) {
        addNewTransfer();
    } else if (e.target.matches('[data-action="delete-transfer"]')) {
        deleteTransfer(e.target.dataset.id);
    }
}


async function deleteTransfer(transferId) {
    try {
        currentReport.transfers = currentReport.transfers.filter(trf => trf.transferId !== transferId);
        await dbUpdate('reports', currentReport.reportId, { 
            transfers: currentReport.transfers,
            updatedAt: new Date().toISOString()
        });
        
        showMessage('Đã xóa chuyển khoản', 'success');
        showTransfersPopup();
        loadReportsTab();
        
    } catch (error) {
        console.error('Error deleting transfer:', error);
        showMessage('Lỗi khi xóa chuyển khoản', 'error');
    }
}

async function updateInventoryForMaterial(name, unit, quantity, amount) {
    try {
        console.log('🛒 Updating inventory for material:', { name, unit, quantity, amount });
        
        // Find existing product or create new
        const products = await dbGetAll('inventory');
        let product = products.find(p => p.name === name && p.unit === unit);
        
        if (product) {
            // Update existing product
            const newQuantity = product.currentQuantity + quantity;
            const newTotalValue = product.totalValue + amount;
            const newAveragePrice = newTotalValue / newQuantity;
            
            console.log('📦 Updating existing product:', {
                oldQuantity: product.currentQuantity,
                newQuantity: newQuantity,
                oldValue: product.totalValue,
                newValue: newTotalValue
            });
            
            await dbUpdate('inventory', product.productId, {
                currentQuantity: newQuantity,
                totalValue: newTotalValue,
                averagePrice: newAveragePrice,
                updatedAt: new Date().toISOString()
            });
            
            console.log('✅ Updated existing product');
        } else {
            // Create new product
            const productId = 'SP' + Date.now().toString().slice(-4);
            console.log('🆕 Creating new product:', { productId, name, unit, quantity, amount });
            
            product = {
                productId: productId,
                name: name,
                unit: unit,
                currentQuantity: quantity,
                minStock: 5,
                averagePrice: amount / quantity,
                totalValue: amount,
                createdBy: getCurrentUser().employeeId,
                createdAt: new Date().toISOString()
            };
            
            await dbAdd('inventory', product);
            
            console.log('✅ Created new product');
        }
        
        // Tạo ID cho history record
        const historyId = generateHistoryId();
        
        // Add to inventory history - CÓ CẢ id VÀ historyId
        const historyRecord = {
            id: historyId,  // ← THÊM id
            historyId: historyId,  // ← THÊM historyId (key path)
            productId: product.productId,
            type: 'in',
            quantity: quantity,
            unitPrice: amount / quantity,
            totalPrice: amount,
            note: `Nhập kho từ mua nguyên liệu - ${name}`,
            createdBy: getCurrentUser().employeeId,
            date: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            _synced: false
        };
        
        await dbAdd('inventoryHistory', historyRecord);
        console.log('📝 Added inventory history record');
        
    } catch (error) {
        console.error('❌ Error updating inventory:', error);
        throw error;
    }
}

// History popups
async function showReportsHistoryPopup() {
    try {
        const reports = await dbGetAll('reports');
        const sortedReports = reports.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
        
        const popupHTML = `
            <div class="popup">
                <button class="close-popup" data-action="close-popup">×</button>
                <h3>📜 Lịch sử báo cáo hàng ngày</h3>
                
                <div class="history-list">
                    ${sortedReports.map(report => {
                        const totalExpenses = calculateTotalExpenses(report);
                        const totalTransfers = calculateTotalTransfers(report);
                        const actualReceived = calculateActualReceived(report);
                        
                        return `
                            <div class="history-item">
                                <div class="history-date">${formatDateDisplay(report.date)}</div>
                                <div class="history-details">
                                    <span>DT: ${formatCurrency(report.revenue)}</span>
                                    <span>CP: ${formatCurrency(totalExpenses)}</span>
                                    <span>TN: ${formatCurrency(actualReceived)}</span>
                                </div>
                                ${isAdmin() ? `
                                    <div class="history-actions">
                                        <button class="btn btn-sm btn-secondary" data-action="edit-report" data-date="${report.date}">Sửa</button>
                                        <button class="btn btn-sm btn-danger" data-action="delete-report" data-date="${report.date}">Xóa</button>
                                    </div>
                                ` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
                
                <div class="popup-actions">
                    <button class="btn btn-secondary" data-action="close-popup">Đóng</button>
                </div>
            </div>
        `;
        
        showPopup(popupHTML);
        
    } catch (error) {
        console.error('Error loading reports history:', error);
        showMessage('Lỗi khi tải lịch sử báo cáo', 'error');
    }
}

async function showOperationsHistoryPopup() {
    if (!isAdmin()) {
        showMessage('Chỉ quản trị viên được xem lịch sử mua sắm', 'error');
        return;
    }
    
    try {
        const operations = await dbGetAll('operations');
        const sortedOperations = operations.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 15);
        
        const popupHTML = `
            <div class="popup">
                <button class="close-popup" data-action="close-popup">×</button>
                <h3>📦 Lịch sử mua sắm vận hành</h3>
                
                <div class="history-list">
                    ${sortedOperations.map(op => `
                        <div class="history-item">
                            <div class="history-date">${formatDateDisplay(op.date)}</div>
                            <div class="history-details">
                                <span>${op.type === 'material' ? '🛒' : '🔧'} ${op.name}</span>
                                <span>${formatCurrency(op.amount)}</span>
                            </div>
                            ${op.quantity ? `<div class="history-quantity">${op.quantity} ${op.unit}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
                
                <div class="popup-actions">
                    <button class="btn btn-secondary" data-action="close-popup">Đóng</button>
                </div>
            </div>
        `;
        
        showPopup(popupHTML);
        
    } catch (error) {
        console.error('Error loading operations history:', error);
        showMessage('Lỗi khi tải lịch sử mua sắm', 'error');
    }
}

// FIX: Sửa hàm calculateTotalExports - đảm bảo tính đúng
function calculateTotalExports(report) {
    console.log('🐛 calculateTotalExports - report:', report);
    
    if (!report || !report.exports || !Array.isArray(report.exports)) {
        console.log('❌ No exports data');
        return 0;
    }
    
    const total = report.exports.reduce((sum, exportItem) => {
        const quantity = exportItem.quantity || 0;
        console.log(`   ${exportItem.name}: ${quantity}`);
        return sum + quantity;
    }, 0);
    
    console.log('✅ Total exports:', total);
    return total;
}


function calculateTotalExpenses(report) {
    if (!report.expenses || !Array.isArray(report.expenses)) {
        return 0;
    }
    return report.expenses.reduce((total, expense) => total + (expense.amount || 0), 0);
}


// FIX: Sửa hàm copyReportToClipboard - không cần load từ DB
async function copyReportToClipboard() {
    if (!currentReport) return;
    
    try {
        console.log('📋 Bắt đầu copy báo cáo từ UI...');
        
        const reportContent = await createDailyReportContent(currentReport);
        const success = await zaloIntegration.copyToClipboard(reportContent);
        
        if (success) {
            zaloIntegration.showNotification('📋 Đã copy báo cáo vào clipboard!', 'success');
        } else {
            zaloIntegration.showNotification('❌ Không thể copy báo cáo', 'error');
        }
        
    } catch (error) {
        console.error('Error copying report:', error);
        zaloIntegration.showNotification('❌ Lỗi khi copy báo cáo: ' + error.message, 'error');
    }
}

// FIX: Sửa class ZaloIntegration để dùng hàm trên
class ZaloIntegration {
    constructor() {
        this.zaloDeepLink = 'zalo://';
    }

    /**
     * Tạo nội dung báo cáo ngày
     */
    async createDailyReportContent(reportData) {
        return await createDailyReportContent(reportData);
    }

    /**
     * Copy nội dung vào clipboard
     */
    async copyToClipboard(text) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                return true;
            } else {
                // Fallback cho các trình duyệt cũ
                const textArea = document.createElement('textarea');
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                return successful;
            }
        } catch (err) {
            console.error('Lỗi copy clipboard:', err);
            return false;
        }
    }

    /**
     * Mở Zalo và gửi tin nhắn
     */
    async sendToZalo(reportData) {
        try {
            // Tạo nội dung báo cáo
            const reportContent = await this.createDailyReportContent(reportData);
            console.log('📋 Report content:', reportContent); // DEBUG
            
            // Copy vào clipboard
            const copySuccess = await this.copyToClipboard(reportContent);
            
            if (!copySuccess) {
                throw new Error('Không thể copy nội dung vào clipboard');
            }

            // Mở Zalo
            this.openZalo();
            
            // Hiển thị thông báo
            this.showNotification('Đã copy báo cáo vào clipboard. Mở Zalo và paste để gửi!', 'success');
            
            return true;
        } catch (error) {
            console.error('Lỗi gửi Zalo:', error);
            this.showNotification('Lỗi khi gửi báo cáo: ' + error.message, 'error');
            return false;
        }
    }

    /**
     * Mở ứng dụng Zalo
     */
    openZalo() {
        // Thử mở ứng dụng Zalo
        window.location.href = this.zaloDeepLink;
        
        // Fallback: sau 2 giây, mở web Zalo nếu ứng dụng không mở được
        setTimeout(() => {
            window.open('https://zalo.me', '_blank');
        }, 2000);
    }

    /**
     * Hiển thị thông báo
     */
    showNotification(message, type = 'info') {
        // Tạo thông báo tạm thời
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;

        document.body.appendChild(notification);

        // Tự động xóa sau 5 giây
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);

        // Cho phép đóng thủ công
        notification.querySelector('.notification-close').addEventListener('click', () => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        });
    }
}

// Tạo instance global
const zaloIntegration = new ZaloIntegration();

// FIX: Sửa hàm shareReportToZalo để dùng class mới
async function shareReportToZalo() {
    if (!currentReport) return;
    
    try {
        const success = await zaloIntegration.sendToZalo(currentReport);
        
        if (success) {
            console.log('✅ Gửi Zalo thành công');
        }
        
    } catch (error) {
        console.error('Error sharing to Zalo:', error);
    }
}

// FIX: Sửa hàm copyReportToClipboard - đảm bảo lấy dữ liệu mới nhất
async function copyReportToClipboard() {
    if (!currentReport) return;
    
    try {
        console.log('📋 Bắt đầu copy báo cáo...');
        
        // ĐẢM BẢO: Load lại dữ liệu mới nhất từ database
        const freshReport = await dbGet('reports', currentReportDate);
        console.log('Fresh report from DB:', freshReport);
        
        if (freshReport) {
            currentReport = freshReport; // Cập nhật currentReport với dữ liệu mới
        }
        
        const reportContent = await createDailyReportContent(currentReport);
        const success = await zaloIntegration.copyToClipboard(reportContent);
        
        if (success) {
            zaloIntegration.showNotification('📋 Đã copy báo cáo vào clipboard!', 'success');
        } else {
            zaloIntegration.showNotification('❌ Không thể copy báo cáo', 'error');
        }
        
    } catch (error) {
        console.error('Error copying report:', error);
        zaloIntegration.showNotification('❌ Lỗi khi copy báo cáo: ' + error.message, 'error');
    }
}

// FIX: Cập nhật hàm tạo nội dung báo cáo để hiển thị nhập kho
async function createDailyReportContent(reportData) {
    console.log('🐛 createDailyReportContent - reportData:', reportData);
    
    const actualReceived = calculateActualReceived(reportData);
    const totalExpenses = calculateTotalExpenses(reportData);
    const totalTransfers = calculateTotalTransfers(reportData);
    const totalExports = calculateTotalExports(reportData);
    
    // Lấy lịch sử xuất kho và nhập kho thực tế
    const exportsHistory = await getExportsHistoryForDate(reportData.date);
    const importsHistory = await getImportsHistoryForDate(reportData.date);
    const totalHistoricalExports = exportsHistory.reduce((sum, record) => sum + record.quantity, 0);
    const totalHistoricalImports = importsHistory.reduce((sum, record) => sum + record.quantity, 0);
    
    let content = `📊 BÁO CÁO NGÀY ${formatDateDisplay(reportData.date)}\n\n`;
    
    content += `💰 Số dư đầu kỳ: ${formatCurrency(reportData.openingBalance)}\n`;
    content += `📈 Doanh thu: ${formatCurrency(reportData.revenue)}\n`;
    content += `💸 Chi phí: ${formatCurrency(totalExpenses)}\n`;
    content += `🏦 Chuyển khoản: ${formatCurrency(totalTransfers)}\n`;
    content += `💰 Số dư cuối kỳ: ${formatCurrency(reportData.closingBalance)}\n`;
    content += `🎯 Thực nhận: ${formatCurrency(actualReceived)}\n\n`;

    // Chi tiết chi phí
    if (reportData.expenses && reportData.expenses.length > 0) {
        content += `📋 CHI TIẾT CHI PHÍ:\n`;
        reportData.expenses.forEach(expense => {
            content += `   • ${expense.name}: ${formatCurrency(expense.amount)}\n`;
        });
        content += `\n`;
    }

    // Chi tiết chuyển khoản
    if (reportData.transfers && reportData.transfers.length > 0) {
        content += `🏦 CHI TIẾT CHUYỂN KHOẢN:\n`;
        reportData.transfers.forEach(transfer => {
            const contentText = transfer.content || 'Chuyển khoản';
            content += `   • ${contentText}: ${formatCurrency(transfer.amount)}\n`;
        });
        content += `\n`;
    }

    // NHẬP KHO - LỊCH SỬ (từ vận hành)
    if (importsHistory.length > 0) {
        content += `📥 NHẬP KHO (${totalHistoricalImports} sản phẩm):\n`;
        
        // Nhóm theo sản phẩm để tổng hợp
        const productImports = {};
        importsHistory.forEach(record => {
            const productName = record.product?.name || 'Unknown';
            if (!productImports[productName]) {
                productImports[productName] = {
                    quantity: 0,
                    unit: record.product?.unit || '',
                    totalValue: 0
                };
            }
            productImports[productName].quantity += record.quantity;
            productImports[productName].totalValue += record.totalPrice;
        });
        
        // Hiển thị tổng hợp
        Object.entries(productImports).forEach(([productName, data]) => {
            content += `   • ${productName}: ${data.quantity} ${data.unit} - ${formatCurrency(data.totalValue)}\n`;
        });
        content += `\n`;
    }

    // XUẤT KHO - HIỆN TẠI (chưa lưu)
    if (reportData.exports && reportData.exports.length > 0) {
        const validExports = reportData.exports.filter(exp => exp.quantity > 0);
        if (validExports.length > 0) {
            content += `📦 XUẤT KHO HIỆN TẠI (${totalExports} sản phẩm):\n`;
            
            const inventory = await dbGetAll('inventory');
            
            for (const exportItem of validExports) {
                const product = inventory.find(p => p.productId === exportItem.productId);
                const productName = product ? product.name : exportItem.name;
                const productUnit = product ? product.unit : '';
                
                content += `   • ${productName}: ${exportItem.quantity} ${productUnit}\n`;
            }
            content += `\n`;
        }
    }

    // XUẤT KHO - LỊCH SỬ (đã lưu)
    if (exportsHistory.length > 0) {
        content += `📚 XUẤT KHO ĐÃ LƯU (${totalHistoricalExports} sản phẩm):\n`;
        
        // Nhóm theo sản phẩm để tổng hợp
        const productExports = {};
        exportsHistory.forEach(record => {
            const productName = record.product?.name || 'Unknown';
            if (!productExports[productName]) {
                productExports[productName] = {
                    quantity: 0,
                    unit: record.product?.unit || ''
                };
            }
            productExports[productName].quantity += record.quantity;
        });
        
        // Hiển thị tổng hợp
        Object.entries(productExports).forEach(([productName, data]) => {
            content += `   • ${productName}: ${data.quantity} ${data.unit}\n`;
        });
        content += `\n`;
    }

    // TỔNG KẾT KHO
    const totalAllImports = totalHistoricalImports;
    const totalAllExports = totalExports + totalHistoricalExports;
    
    if (totalAllImports > 0 || totalAllExports > 0) {
        content += `📊 TỔNG KẾT KHO:\n`;
        if (totalAllImports > 0) {
            content += `   📥 Nhập kho: ${totalAllImports} sản phẩm\n`;
        }
        if (totalAllExports > 0) {
            content += `   📤 Xuất kho: ${totalAllExports} sản phẩm\n`;
        }
        content += `\n`;
    }

    content += `-- Quản lý Cafe --`;

    console.log('📄 FINAL REPORT CONTENT:');
    console.log(content);
    
    return content;
}
async function findProductByNameAndUnit(name, unit) {
    const allProducts = await dbGetAll('inventory');
    return allProducts.find(p => 
        p.name.toLowerCase() === name.toLowerCase() && 
        p.unit.toLowerCase() === unit.toLowerCase()
    );
}
function addReportsStyles() {
    if (!document.getElementById('reports-styles')) {
        const style = document.createElement('style');
        style.id = 'reports-styles';
        style.textContent = `
            /* ... CSS cũ ... */
            
            .pending-exports-alert {
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 8px;
                padding: 12px 15px;
                margin: 15px 0;
                display: flex;
                align-items: center;
                animation: pulse 2s infinite;
            }
            
            .processed-exports-info {
                background: #d4edda;
                border: 1px solid #c3e6cb;
                border-radius: 8px;
                padding: 12px 15px;
                margin: 15px 0;
                display: flex;
                align-items: center;
            }
            
            .alert-icon, .info-icon {
                font-size: 24px;
                margin-right: 12px;
            }
            
            .alert-content, .info-content {
                flex: 1;
            }
            
            .alert-content strong, .info-content strong {
                display: block;
                margin-bottom: 4px;
                font-size: 14px;
            }
            
            .alert-content small, .info-content small {
                font-size: 12px;
                color: #666;
            }
            
            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.8; }
                100% { opacity: 1; }
            }
            
            .action-buttons {
                display: flex;
                gap: 10px;
                margin-top: 20px;
                margin-bottom: 15px;
            }
            
            .action-buttons .btn-primary {
                background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
                border: none;
                padding: 12px 24px;
                font-weight: bold;
                flex: 2;
            }
            
            .action-buttons .btn-success {
                background: linear-gradient(135deg, #28a745 0%, #1e7e34 100%);
                border: none;
                padding: 12px 24px;
                font-weight: bold;
                flex: 1;
            }
        `;
        document.head.appendChild(style);
    }
}
// FIX: Sửa hoàn toàn hàm saveMaterial - sử dụng ngày báo cáo cho cả date và dateKey
async function saveMaterial() {
    const name = document.getElementById('materialName').value.trim();
    const quantity = parseFloat(document.getElementById('materialQuantity').value);
    const unit = document.getElementById('materialUnit').value.trim();
    const amount = parseFloat(document.getElementById('materialAmount').value);

    if (!name || isNaN(quantity) || quantity <= 0 || !unit || isNaN(amount) || amount <= 0) {
        showMessage('Vui lòng nhập đầy đủ Tên, Số lượng, Đơn vị và Thành tiền hợp lệ.', 'error');
        return;
    }

    try {
        const currentUser = getCurrentUser();
        const operationId = generateOperationId();
        const historyId = generateHistoryId();  // ← Tạo historyId
        
        const selectedDate = currentInventoryDate;
        const isoDate = new Date(selectedDate + 'T12:00:00').toISOString();
        const unitPrice = amount / quantity;

        console.log('📅 Saving material for selected date:', selectedDate);

        // 1. Tạo Operation Record
        const operationRecord = {
            id: operationId,
            operationId: operationId,
            date: isoDate,
            dateKey: selectedDate,
            type: 'material',
            name: name,
            quantity: quantity,
            unit: unit,
            amount: amount,
            unitPrice: unitPrice, 
            createdBy: currentUser.employeeId,
            createdAt: isoDate,
            updatedAt: isoDate,
            _synced: false
        };

        await dbAdd('operations', operationRecord);
        console.log('✅ Saved operation record for date:', selectedDate);

        // 2. Cập nhật Kho hàng
        let product = await findProductByNameAndUnit(name, unit); 
        
        if (!product) {
            const newProductId = 'prod_' + Math.random().toString(36).substring(2, 9);
            product = {
                id: newProductId,
                itemId: newProductId,
                productId: newProductId,
                name: name,
                unit: unit,
                currentQuantity: 0,
                minStock: 0,
                averagePrice: 0,
                totalValue: 0,
                createdAt: isoDate,
                updatedAt: isoDate,
                _synced: false
            };
            await dbAdd('inventory', product);
            console.log('✅ Created new product');
        }

        // 3. Tạo bản ghi lịch sử nhập kho - CÓ CẢ id VÀ historyId
        const historyRecord = {
            id: historyId,  // ← THÊM id
            historyId: historyId,  // ← THÊM historyId (key path)
            productId: product.id,
            type: 'in',
            quantity: quantity,
            unitPrice: unitPrice,
            totalPrice: amount,
            note: `Mua sắm vận hành: ${name} - Ngày: ${formatDateDisplay(selectedDate)}`,
            createdBy: currentUser.employeeId,
            date: isoDate,
            reportDate: selectedDate,
            createdAt: isoDate,
            updatedAt: isoDate,
            _synced: false
        };
        
        console.log('📝 Adding inventory history:', historyRecord);
        await dbAdd('inventoryHistory', historyRecord);
        
        // ... phần còn lại giữ nguyên
    } catch (error) {
        console.error('Error saving material operation:', error);
        showMessage('❌ Lỗi khi lưu mua sắm Nguyên liệu: ' + (error.message || error), 'error');
    }
}

// FIX: Sửa hoàn toàn hàm saveService - sử dụng ngày báo cáo
async function saveService() {
    const name = document.getElementById('serviceName').value.trim();
    const amount = parseFloat(document.getElementById('serviceAmount').value);

    if (!name || isNaN(amount) || amount <= 0) {
        showMessage('Vui lòng nhập đầy đủ Tên Dịch vụ và Số tiền hợp lệ.', 'error');
        return;
    }

    try {
        const currentUser = getCurrentUser();
        const operationId = generateOperationId();
        
        // FIX: Sử dụng ngày báo cáo cho tất cả các trường date
        const reportDate = currentReportDate; // Ngày được chọn trong báo cáo
        const isoDate = new Date(reportDate + 'T12:00:00').toISOString(); // Tạo ISO string từ ngày báo cáo

        console.log('📅 Saving service for report date:', reportDate);
        console.log('📅 Generated ISO date:', isoDate);

        // Tạo Operation Record với ngày báo cáo
        const operationRecord = {
            operationId: operationId,
            date: isoDate, // Sử dụng ngày báo cáo (không phải ngày hiện tại)
            dateKey: reportDate, // Ngày báo cáo (YYYY-MM-DD)
            type: 'service',
            name: name,
            quantity: 0,
            unit: '',
            amount: amount,
            createdBy: currentUser.employeeId,
            createdAt: isoDate // Sử dụng ngày báo cáo
        };

        await dbAdd('operations', operationRecord);
        console.log('✅ Saved service operation with date:', reportDate);

        showMessage(`✅ Đã lưu mua sắm Dịch vụ cho ngày ${formatDateDisplay(reportDate)}`, 'success');
        closePopup();
        loadReportsTab();

    } catch (error) {
        console.error('Error saving service operation:', error);
        showMessage('❌ Lỗi khi lưu mua sắm Dịch vụ', 'error');
    }
}

// FIX: Thêm hàm debug để kiểm tra dữ liệu operations
async function debugOperations() {
    try {
        console.log('=== 🐛 DEBUG OPERATIONS ===');
        console.log('📅 Current report date:', currentReportDate);
        
        const operations = await dbGetAll('operations');
        console.log('📦 Total operations:', operations.length);
        
        const todayOps = operations.filter(op => op.dateKey === currentReportDate);
        console.log('📊 Operations for current date:', todayOps.length);
        
        todayOps.forEach((op, index) => {
            console.log(`   ${index + 1}. ${op.type} - ${op.name} - ${op.amount} - Date: ${op.date} - DateKey: ${op.dateKey}`);
        });
        
        console.log('=== END DEBUG ===');
    } catch (error) {
        console.error('Error debugging operations:', error);
    }
}

// FIX: Cập nhật hàm getImportsHistoryForDate để lọc chính xác hơn
async function getImportsHistoryForDate(date) {
    try {
        const allHistory = await dbGetAll('inventoryHistory');
        const inventory = await dbGetAll('inventory');
        
        console.log('📥 Looking for imports for date:', date);
        
        // Lọc theo type='in' và ngày báo cáo
        const importsHistory = allHistory
            .filter(record => {
                if (record.type !== 'in') return false;
                
                // Kiểm tra theo reportDate trước, sau đó theo date
                let recordDate = '';
                if (record.reportDate) {
                    recordDate = record.reportDate;
                } else if (record.date) {
                    // Parse từ ISO string
                    recordDate = record.date.split('T')[0];
                }
                
                console.log(`   Record: ${record.productId} - Date: ${recordDate} - Match: ${recordDate === date}`);
                return recordDate === date;
            })
            .map(record => {
                const product = inventory.find(p => p.productId === record.productId);
                return {
                    ...record,
                    product: product
                };
            });
        
        console.log('📥 Found imports for', date, ':', importsHistory.length, 'records');
        return importsHistory;
        
    } catch (error) {
        console.error('Error getting imports history:', error);
        return [];
    }
}



// FIX: Thêm hàm để migrate dữ liệu cũ (chạy một lần)
async function migrateOperationsDate() {
    try {
        console.log('🔄 Migrating operations date...');
        const operations = await dbGetAll('operations');
        
        let migratedCount = 0;
        for (const op of operations) {
            if (op.date && !op.dateKey) {
                // Tạo dateKey từ date
                const dateKey = op.date.split('T')[0];
                await dbUpdate('operations', op.operationId, {
                    dateKey: dateKey
                });
                migratedCount++;
                console.log(`✅ Migrated operation: ${op.operationId} -> ${dateKey}`);
            }
        }
        
        console.log(`✅ Migration completed: ${migratedCount} operations migrated`);
        return migratedCount;
    } catch (error) {
        console.error('Error migrating operations:', error);
        return 0;
    }
}

async function updateInventoryFromExports() {
    try {
        console.log('📦 Updating inventory from exports for date:', currentReportDate);
        
        // Lấy báo cáo mới nhất từ database (có exports)
        const freshReport = await dbGet('reports', currentReportDate);
        if (!freshReport || !freshReport.exports || freshReport.exports.length === 0) {
            console.log('📭 No exports to process');
            return;
        }
        
        console.log('📊 Processing', freshReport.exports.length, 'export items');
        
        const now = new Date();
        const [year, month, day] = currentReportDate.split('-');
        const exportDateTime = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds());
        const isoDate = exportDateTime.toISOString();
        
        for (const exportItem of freshReport.exports) {
            console.log('🔄 Processing export:', exportItem);
            
            const product = await dbGet('inventory', exportItem.productId);
            
            if (product) {
                console.log('🎯 Found product:', product.name, 'Stock:', product.currentQuantity);
                
                // Kiểm tra số lượng xuất
                if (exportItem.quantity > product.currentQuantity) {
                    showMessage(`❌ Không đủ tồn kho cho ${product.name}. Tồn: ${product.currentQuantity}, Xuất: ${exportItem.quantity}`, 'error');
                    continue;
                }
                
                // Cập nhật số lượng tồn kho
                const newQuantity = product.currentQuantity - exportItem.quantity;
                const newTotalValue = newQuantity * product.averagePrice;
                
                const updatedProduct = {
                    ...product,
                    currentQuantity: newQuantity,
                    totalValue: newTotalValue,
                    updatedAt: new Date().toISOString(),
                    _synced: false
                };
                
                // Lưu vào IndexedDB
                await dbUpdate('inventory', product.productId, updatedProduct);
                
                console.log(`📉 Updated inventory for ${product.name}: ${product.currentQuantity} → ${newQuantity}`);
                
                // Tạo ID cho history record
                const historyId = generateHistoryId();
                
                // Ghi lịch sử xuất kho
                const historyRecord = {
                    id: historyId,  // ← THÊM id
                    historyId: historyId,  // ← THÊM historyId (key path)
                    productId: product.productId,
                    type: 'out',
                    quantity: exportItem.quantity,
                    unitPrice: product.averagePrice,
                    totalPrice: exportItem.quantity * product.averagePrice,
                    note: `Xuất kho bán hàng - NV: ${getCurrentUser().name}`,
                    createdBy: getCurrentUser().employeeId,
                    date: isoDate,
                    reportDate: currentReportDate,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    _synced: false
                };
                
                // Lưu vào IndexedDB
                await dbAdd('inventoryHistory', historyRecord);
                
                console.log('📝 Added export history for', product.name);
                
            } else {
                console.warn(`❌ Product not found: ${exportItem.productId}`);
                showMessage(`❌ Sản phẩm không tồn tại trong kho: ${exportItem.name || exportItem.productId}`, 'error');
            }
        }
        
        console.log('🎉 Finished processing exports');
        
    } catch (error) {
        console.error('❌ Error updating inventory from exports:', error);
        showMessage('❌ Lỗi khi xử lý xuất kho: ' + error.message, 'error');
        throw error;
    }
}
async function checkSyncStatus() {
    console.log('=== 🔄 SYNC STATUS CHECK ===');
    
    // Kiểm tra Firebase connection
    console.log('Firebase enabled:', firebaseSync.enabled);
    console.log('Firebase DB available:', !!firebaseSync.db);
    
    // Kiểm tra current report sync status
    const dbReport = await dbGet('reports', currentReportDate);
    console.log('Report sync status:', {
        date: currentReportDate,
        hasData: !!dbReport,
        synced: dbReport?._synced || false,
        exportsCount: dbReport?.exports?.length || 0,
        lastSync: dbReport?._lastSync || 'Never'
    });
    
    // Kiểm tra pending syncs
    console.log('Pending syncs:', firebaseSync.pendingSyncs.length);
    
    // Test sync manually
    if (dbReport && !dbReport._synced) {
        console.log('🔄 Attempting manual sync...');
        if (typeof syncToFirebase === 'function') {
            const success = await syncToFirebase('reports', dbReport);
            console.log('Manual sync result:', success ? '✅ Success' : '❌ Failed');
        }
    }
    
    console.log('=== END SYNC CHECK ===');
}

window.checkSyncStatus = checkSyncStatus;
// FIX: Hàm đơn giản để tạo datetime từ ngày lựa chọn
function createDateTimeForReport(selectedDate) {
    const now = new Date();
    const [year, month, day] = selectedDate.split('-');
    // Giữ nguyên giờ phút giây hiện tại, chỉ thay đổi ngày
    return new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds());
}

// FIX: Sửa hàm getExportsHistoryForDate - lọc theo ngày báo cáo
async function getExportsHistoryForDate(date) {
    try {
        // Lấy TẤT CẢ history
        const allHistory = await dbGetAll('inventoryHistory');
        
        // Lấy thông tin sản phẩm
        const inventory = await dbGetAll('inventory');
        
        console.log('📋 Looking for exports history for date:', date);
        
        // Lọc và map giống tab Kho
        const exportsHistory = allHistory
            .filter(record => {
                // Lọc theo type='out' và ngày
                if (record.type !== 'out') return false;
                
                let recordDate = '';
                if (record.reportDate) {
                    recordDate = record.reportDate;
                } else if (record.date) {
                    // Parse từ ISO string
                    recordDate = record.date.split('T')[0];
                }
                
                console.log(`   Export record: ${record.productId} - Date: ${recordDate} - Match: ${recordDate === date}`);
                return recordDate === date;
            })
            .map(record => {
                const product = inventory.find(p => p.productId === record.productId);
                return {
                    ...record,
                    product: product
                };
            });
        
        console.log('📋 Exports history for', date, ':', exportsHistory.length, 'records');
        return exportsHistory;
        
    } catch (error) {
        console.error('Error getting exports history:', error);
        return [];
    }
}

/**
 * @name increaseExport
 * @description Tăng số lượng xuất kho tạm thời cho một sản phẩm.
 * @param {string} productId - ID sản phẩm.
 */
async function increaseExport(productId) {
    if (!currentReport) {
        currentReport = await getOrCreateReport(currentReportDate);
    }
    
    try {
        // Lấy thông tin sản phẩm từ kho
        const product = await dbGet('inventory', productId);
        if (!product) {
            showMessage('❌ Sản phẩm không tồn tại trong kho', 'error');
            return;
        }
        
        // Kiểm tra số lượng tồn kho
        if (product.currentQuantity <= 0) {
            showMessage(`❌ Không đủ tồn kho cho ${product.name}. Tồn kho: ${product.currentQuantity}`, 'error');
            return;
        }
        
        // Tìm hoặc tạo export item
        let exportItem = currentReport.exports.find(e => e.productId === productId);
        
        if (exportItem) {
            // Kiểm tra không vượt quá tồn kho
            if (exportItem.quantity >= product.currentQuantity) {
                showMessage(`❌ Không đủ tồn kho cho ${product.name}. Tồn kho: ${product.currentQuantity}`, 'error');
                return;
            }
            exportItem.quantity += 1;
        } else {
            // Tạo mới với số lượng 1
            exportItem = {
                productId: productId,
                name: product.name,
                quantity: 1,
                exportedAt: new Date().toISOString()
            };
            currentReport.exports.push(exportItem);
        }
        
        // Lưu vào database
        await dbUpdate('reports', currentReport.reportId, {
            exports: currentReport.exports,
            updatedAt: new Date().toISOString()
        });
        
        console.log(`✅ Increased export for ${product.name}: ${exportItem.quantity}`);
        
        // Cập nhật giao diện
        await loadReportsTab();
        
    } catch (error) {
        console.error('❌ Error increasing export:', error);
        showMessage('❌ Lỗi khi tăng số lượng xuất kho', 'error');
    }
}

window.increaseExport = increaseExport;
window.increaseExport = increaseExport;

// FIX: Thêm hàm debug để kiểm tra lịch sử xuất kho
async function debugExportsHistory() {
    try {
        console.log('=== 🐛 DEBUG EXPORTS HISTORY ===');
        console.log('📅 Current report date:', currentReportDate);
        
        const allHistory = await dbGetAll('inventoryHistory');
        console.log('📜 Total history records:', allHistory.length);
        
        const exportsHistory = allHistory.filter(record => record.type === 'out');
        console.log('📤 Total export records:', exportsHistory.length);
        
        const todayExports = exportsHistory.filter(record => {
            let recordDate = '';
            if (record.reportDate) {
                recordDate = record.reportDate;
            } else if (record.date) {
                recordDate = record.date.split('T')[0];
            }
            return recordDate === currentReportDate;
        });
        
        console.log('📊 Exports for current date:', todayExports.length);
        
        todayExports.forEach((record, index) => {
            console.log(`   ${index + 1}. ${record.productId} - ${record.quantity} - Date: ${record.date} - ReportDate: ${record.reportDate}`);
        });
        
        console.log('=== END DEBUG ===');
    } catch (error) {
        console.error('Error debugging exports history:', error);
    }
}

// FIX: Cập nhật hàm showExportsHistoryPopup để hiển thị đúng ngày
async function showExportsHistoryPopup() {
    try {
        // Lấy tất cả lịch sử xuất kho cho ngày hiện tại trong báo cáo
        const exportsHistory = await getExportsHistoryForDate(currentReportDate);
        
        console.log('📦 Exports history for today:', exportsHistory);
        
        if (exportsHistory.length === 0) {
            showMessage(`📭 Không có lịch sử xuất kho cho ngày ${formatDateDisplay(currentReportDate)}`, 'info');
            return;
        }
        
        // Lấy thông tin sản phẩm để hiển thị tên
        const inventory = await dbGetAll('inventory');
        
        const popupHTML = `
            <div class="popup" style="max-width: 800px;">
                <button class="close-popup" data-action="close-popup">×</button>
                <h3>📦 Lịch sử Xuất kho - ${formatDateDisplay(currentReportDate)}</h3>
                
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Tên sản phẩm</th>
                            <th>Thời gian</th>
                            <th>SL xuất</th>
                            <th>Đơn giá</th>
                            <th>Thành tiền</th>
                            <th>Ghi chú</th>
                            <th>NV thực hiện</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${exportsHistory.map((record, index) => {
                            const product = inventory.find(p => p.productId === record.productId);
                            const productName = product ? product.name : 'Unknown';
                            
                            return `
                                <tr>
                                    <td>${index + 1}</td>
                                    <td>${productName}</td>
                                    <td>${formatDateTime(record.date)}</td>
                                    <td style="color: red;">-${record.quantity}</td>
                                    <td>${record.unitPrice ? formatCurrency(record.unitPrice) : '-'}</td>
                                    <td>${record.totalPrice ? formatCurrency(record.totalPrice) : '-'}</td>
                                    <td>${record.note || ''}</td>
                                    <td>${record.createdBy || 'System'}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
                
                <div class="export-summary">
                    <strong>Tổng xuất: ${exportsHistory.reduce((sum, record) => sum + record.quantity, 0)} sản phẩm</strong>
                </div>
                
                <div class="popup-actions">
                    <button class="btn btn-secondary" data-action="close-popup">Đóng</button>
                    <button class="btn btn-info" onclick="debugExportsHistory()">🐛 Debug</button>
                </div>
            </div>
        `;
        
        showPopup(popupHTML);
        
    } catch (error) {
        console.error('Error loading exports history:', error);
        showMessage('❌ Lỗi khi tải lịch sử xuất kho', 'error');
    }
}

// FIX: Thêm hàm migrate exports history (chạy một lần)
async function migrateExportsHistoryDate() {
    try {
        console.log('🔄 Migrating exports history date...');
        const allHistory = await dbGetAll('inventoryHistory');
        
        let migratedCount = 0;
        for (const record of allHistory) {
            if (record.type === 'out' && record.date && !record.reportDate) {
                // Tạo reportDate từ date
                const reportDate = record.date.split('T')[0];
                await dbUpdate('inventoryHistory', record.id || record.productId, {
                    reportDate: reportDate
                });
                migratedCount++;
                console.log(`✅ Migrated export record: ${record.productId} -> ${reportDate}`);
            }
        }
        
        console.log(`✅ Export migration completed: ${migratedCount} records migrated`);
        return migratedCount;
    } catch (error) {
        console.error('Error migrating exports history:', error);
        return 0;
    }
}


// reports.js - cuối file
window.loadReports = function() {
    console.log('📊 Loading reports...');
    // Gọi hàm chính của module
    if (typeof initializeReports === 'function') initializeReports();
    if (typeof loadReportsData === 'function') loadReportsData();
};

// inventory.js - cuối file  
window.loadInventory = function() {
    console.log('📦 Loading inventory...');
    if (typeof initializeInventory === 'function') initializeInventory();
    if (typeof loadInventoryData === 'function') loadInventoryData();
};

// statistics.js - cuối file
window.loadStatistics = function() {
    console.log('📈 Loading statistics...');
    if (typeof initializeStatistics === 'function') initializeStatistics();
};

// employees.js - cuối file
window.loadEmployeesData = function() {
    console.log('👥 Loading employees...');
    if (typeof initializeEmployees === 'function') initializeEmployees();
};

// overview.js - cuối file
window.loadOverview = function() {
    console.log('👁 Loading overview...');
    if (typeof initializeOverview === 'function') initializeOverview();
};

async function loadReportsTab() {
    try {
        console.log('🚀 loadReportsTab called. Date:', currentReportDate);

        // 1. BUỘC TẢI LẠI currentReport TỪ DB INDEX MỚI NHẤT
        currentReport = await getOrCreateReport(currentReportDate); 

        // 2. KIỂM TRA VÀ FIX SỐ DƯ ĐẦU KỲ NẾU CẦN
        // Đây là bước QUAN TRỌNG: Đảm bảo số dư đầu kỳ đúng khi tải từ Firebase
        await verifyAndFixOpeningBalance(currentReportDate);

        // 3. Lấy dữ liệu Inventory
        const inventoryList = await dbGetAll('inventory'); 
        window.globalInventoryMap = new Map(inventoryList.map(item => [item.productId, item]));

        // 4. Render UI chính
        const container = document.getElementById('reports');
        if (container) {
            await renderReportsTab(container, currentReport);
            
            // 5. Setup listeners
            setupReportsEventListeners(); 
            
            console.log('✅ Reports Tab Rendered Successfully.');
            
        } else {
            console.error('❌ Reports container not found.');
        }

    } catch (error) {
        console.error('❌ FATAL Error loading reports tab:', error);
        showMessage('Lỗi tải báo cáo: ' + error.message, 'error');
    }
}
// THÊM HÀM KIỂM TRA VÀ FIX SỐ DƯ ĐẦU KỲ
async function verifyAndFixOpeningBalance(currentDate) {
    try {
        console.log('🔍 Verifying opening balance for date:', currentDate);
        
        // Lấy report hiện tại
        const currentReport = await dbGet('reports', currentDate);
        if (!currentReport) return;
        
        // Nếu đây không phải là ngày đầu tiên
        const previousDate = getPreviousDate(currentDate);
        if (previousDate) {
            const previousReport = await dbGet('reports', previousDate);
            
            if (previousReport) {
                // Số dư đầu kỳ phải = số dư cuối kỳ ngày trước
                const correctOpeningBalance = previousReport.closingBalance || 0;
                
                if (currentReport.openingBalance !== correctOpeningBalance) {
                    console.log(`🔄 Fix needed: ${currentDate} opening=${currentReport.openingBalance}, should be=${correctOpeningBalance}`);
                    
                    // Fix trong memory
                    currentReport.openingBalance = correctOpeningBalance;
                    
                    // Fix trong database
                    await dbUpdate('reports', currentDate, {
                        openingBalance: correctOpeningBalance,
                        updatedAt: new Date().toISOString(),
                        _synced: false,
                        _autoFixed: true
                    });
                    
                    console.log(`✅ Fixed opening balance for ${currentDate}`);
                    
                    // Nếu có Firebase, sync lên
                    if (firebaseSync.enabled) {
                        const updatedReport = {
                            ...currentReport,
                            openingBalance: correctOpeningBalance,
                            updatedAt: new Date().toISOString()
                        };
                        await syncToFirebase('reports', updatedReport);
                    }
                } else {
                    console.log(`✅ Opening balance correct for ${currentDate}: ${currentReport.openingBalance}`);
                }
            }
        }
        
    } catch (error) {
        console.error('❌ Error verifying opening balance:', error);
    }
}
// THÊM HÀM NÀY Ở PHẦN ĐẦU FILE reports.js (sau các biến global)

/**
 * @name getPreviousDate
 * @description Lấy ngày trước đó từ một ngày cho trước (YYYY-MM-DD)
 * @param {string} dateStr - Ngày định dạng YYYY-MM-DD
 * @returns {string|null} Ngày trước đó hoặc null nếu lỗi
 */
function getPreviousDate(dateStr) {
    try {
        console.log('📅 getPreviousDate called with:', dateStr);
        
        // Kiểm tra định dạng
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            console.error('❌ Invalid date format:', dateStr);
            return null;
        }
        
        const [year, month, day] = dateStr.split('-').map(Number);
        console.log('   Parsed:', { year, month, day });
        
        // Tạo Date object
        const date = new Date(year, month - 1, day); // month - 1 vì Date month là 0-based
        date.setDate(date.getDate() - 1);
        
        const prevYear = date.getFullYear();
        const prevMonth = (date.getMonth() + 1).toString().padStart(2, '0');
        const prevDay = date.getDate().toString().padStart(2, '0');
        const previousDate = `${prevYear}-${prevMonth}-${prevDay}`;
        
        console.log('   Previous date:', previousDate);
        return previousDate;
        
    } catch (error) {
        console.error('❌ Error in getPreviousDate:', error);
        return null;
    }
}

// EXPOSE TO WINDOW
window.loadReportsTab = loadReportsTab;

// FIX: Sửa hàm saveCurrentReport - Reset xuất kho về 0, lưu vào lịch sử
// Thêm ở đầu file reports.js

// Hàm saveCurrentReport hoàn chỉnh
async function saveCurrentReport() {
    if (!currentReport) {
        showToast('❌ Không có báo cáo để lưu', 'error');
        return;
    }
    
    try {
        console.log('💾 Bắt đầu lưu báo cáo...', currentReportDate);
        
        // 1. Lấy giá trị từ UI
        const revenueInput = document.getElementById('revenueInput');
        const closingBalanceInput = document.getElementById('closingBalanceInput');
        
        if (!revenueInput || !closingBalanceInput) {
            showToast('❌ Không tìm thấy input doanh thu/số dư', 'error');
            return;
        }
        
        const revenue = parseFloat(revenueInput.value) || 0;
        const closingBalance = parseFloat(closingBalanceInput.value) || 0;
        
        console.log('📊 Dữ liệu từ UI:', {
            revenue: revenue,
            closingBalance: closingBalance
        });
        
        // 2. Lấy dữ liệu xuất kho từ UI
        const exportsData = await getExportsFromUI();
        console.log('📦 Xuất kho từ UI:', exportsData);
        
        // 3. Tính toán các giá trị
        const totalExpenses = calculateTotalExpenses(currentReport);
        const totalTransfers = calculateTotalTransfers(currentReport);
        const actualReceived = currentReport.openingBalance + revenue - totalExpenses - totalTransfers - closingBalance;
        
        // 4. Tạo object báo cáo hoàn chỉnh
        const reportToSave = {
            reportId: currentReportDate,
            date: currentReportDate,
            openingBalance: currentReport.openingBalance || 0,
            revenue: revenue,
            closingBalance: closingBalance,
            actualReceived: actualReceived,
            expenses: currentReport.expenses || [],
            transfers: currentReport.transfers || [],
            exports: exportsData.items || [],
            createdBy: getCurrentUser()?.employeeId || 'unknown',
            updatedBy: getCurrentUser()?.employeeId || 'unknown',
            createdAt: currentReport.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            _synced: false,
            _deviceId: localStorage.getItem('device_id') || 'unknown',
            _hasExports: exportsData.items.length > 0
        };
        
        // 5. Hiển thị thông báo lưu
        showToast('💾 Đang lưu báo cáo...', 'info');
        
        // 6. Lưu vào IndexedDB
        const existingReport = await dbGet('reports', currentReportDate);
        if (existingReport) {
            await dbUpdate('reports', currentReportDate, reportToSave);
            console.log('✅ Đã cập nhật báo cáo trong IndexedDB');
        } else {
            await dbAdd('reports', reportToSave);
            console.log('✅ Đã thêm báo cáo mới vào IndexedDB');
        }
        
        // 7. Cập nhật currentReport trong memory
        currentReport = reportToSave;
        
        // 8. Xử lý xuất kho nếu có
        if (exportsData.items.length > 0) {
            await processExportsAndUpdateInventory(exportsData.items);
        }
        
        // 9. Cập nhật số dư đầu kỳ cho ngày tiếp theo
        await updateNextDayOpeningBalance(closingBalance, currentReportDate);
        
        // 10. Đồng bộ lên GitHub nếu được bật
        if (githubSync && githubSync.enabled && githubSync.autoSync) {
            setTimeout(async () => {
                try {
                    showToast('☁️ Đang đồng bộ lên GitHub...', 'info');
                    
                    const freshReport = await dbGet('reports', currentReportDate);
                    if (freshReport) {
                        const syncSuccess = await syncSingleReportToGitHub(freshReport);
                        if (syncSuccess) {
                            showToast('✅ Đã đồng bộ lên GitHub', 'success');
                        } else {
                            showToast('⚠️ Đã lưu local, sẽ thử đồng bộ GitHub sau', 'warning');
                        }
                    }
                } catch (syncError) {
                    console.error('⚠️ GitHub sync failed:', syncError);
                    showToast('⚠️ Đã lưu local (GitHub sync failed)', 'warning');
                }
            }, 1500);
        } else {
            showToast('✅ Đã lưu báo cáo thành công', 'success');
        }
        
        // 11. Reload UI
        setTimeout(() => {
            loadReportsTab();
        }, 1000);
        
        // 12. Log kết quả
        console.log('🎉 Lưu báo cáo thành công:', {
            date: currentReportDate,
            revenue: revenue,
            closingBalance: closingBalance,
            exports: exportsData.items.length,
            syncedToGitHub: githubSync && githubSync.enabled
        });
        
    } catch (error) {
        console.error('❌ Lỗi khi lưu báo cáo:', error);
        showToast(`❌ Lỗi khi lưu báo cáo: ${error.message}`, 'error');
        
        // Thử lưu lại sau 2 giây nếu lỗi
        setTimeout(() => {
            showToast('🔄 Thử lưu lại...', 'info');
            saveCurrentReport();
        }, 2000);
    }
}

// Hàm hỗ trợ: Lấy dữ liệu xuất kho từ UI
async function getExportsFromUI() {
    console.log('📦 Lấy dữ liệu xuất kho từ UI...');
    
    const exportRows = document.querySelectorAll('.export-row');
    console.log('Tìm thấy số dòng:', exportRows.length);
    
    let totalQuantity = 0;
    const items = [];
    
    for (const row of exportRows) {
        const productId = row.dataset.productId;
        
        if (!productId) {
            console.warn('⚠️ Không tìm thấy productId');
            continue;
        }
        
        const quantityElement = row.querySelector('.export-quantity');
        const quantity = parseInt(quantityElement?.textContent) || 0;
        
        if (quantity > 0) {
            const product = await dbGet('inventory', productId);
            
            if (product) {
                totalQuantity += quantity;
                items.push({
                    productId: productId,
                    name: product.name,
                    quantity: quantity,
                    unit: product.unit || '',
                    exportedAt: new Date().toISOString()
                });
                
                console.log(`   ${product.name}: ${quantity} ${product.unit || ''}`);
            }
        }
    }
    
    console.log(`📊 Tổng xuất kho: ${totalQuantity} sản phẩm, ${items.length} mặt hàng`);
    
    return {
        totalQuantity: totalQuantity,
        items: items
    };
}
// Thêm vào đầu file (sau các biến global)
function generateHistoryId() {
    return 'hist_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
}
// Hàm hỗ trợ: Xử lý xuất kho và cập nhật tồn kho
async function processExportsAndUpdateInventory(exportsArray) {
    try {
        console.log('📦 Xử lý xuất kho và cập nhật tồn kho...');
        
        if (!exportsArray || exportsArray.length === 0) {
            console.log('📭 Không có xuất kho để xử lý');
            return;
        }
        
        const now = new Date();
        const [year, month, day] = currentReportDate.split('-');
        const exportDateTime = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds());
        
        for (const exportItem of exportsArray) {
            console.log(`🔄 Xử lý: ${exportItem.name}`);
            
            const product = await dbGet('inventory', exportItem.productId);
            
            if (!product) {
                console.warn(`❌ Không tìm thấy sản phẩm: ${exportItem.productId}`);
                continue;
            }
            
            // Kiểm tra số lượng tồn kho
            if (exportItem.quantity > product.currentQuantity) {
                console.warn(`⚠️ Không đủ tồn kho: ${product.name} (Tồn: ${product.currentQuantity}, Xuất: ${exportItem.quantity})`);
                continue;
            }
            
            // Cập nhật tồn kho
            const newQuantity = product.currentQuantity - exportItem.quantity;
            const newTotalValue = newQuantity * (product.averagePrice || 0);
            
            await dbUpdate('inventory', product.productId, {
                currentQuantity: newQuantity,
                totalValue: newTotalValue,
                updatedAt: new Date().toISOString(),
                _synced: false
            });
            
            // Tạo ID cho history record
            const historyId = generateHistoryId();
            
            // Ghi lịch sử xuất kho - CÓ CẢ id VÀ historyId
            const historyRecord = {
                id: historyId,  // ← THÊM id
                historyId: historyId,  // ← THÊM historyId (key path)
                productId: product.productId,
                type: 'out',
                quantity: exportItem.quantity,
                unitPrice: product.averagePrice || 0,
                totalPrice: exportItem.quantity * (product.averagePrice || 0),
                note: `Xuất kho ngày ${currentReportDate}`,
                createdBy: getCurrentUser()?.employeeId || 'unknown',
                date: exportDateTime.toISOString(),
                reportDate: currentReportDate,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                _synced: false
            };
            
            console.log('📝 Adding export history record:', historyRecord);
            await dbAdd('inventoryHistory', historyRecord);
            
            console.log(`✅ Đã cập nhật tồn kho: ${product.name} -${exportItem.quantity}`);
        }
        
        console.log('🎉 Xử lý xuất kho hoàn tất');
        
    } catch (error) {
        console.error('❌ Lỗi xử lý xuất kho:', error);
        throw error;
    }
}

async function updateNextDayOpeningBalance(currentDate) {
    console.log('🔄 Cập nhật số dư đầu kỳ cho ngày tiếp theo...');
    
    try {
        // ĐẢM BẢO currentDate là string, không phải Promise
        console.log('📅 Current date:', currentDate, 'Type:', typeof currentDate);
        
        // Nếu currentDate không phải string, chuyển đổi
        if (typeof currentDate !== 'string') {
            if (currentDate instanceof Date) {
                currentDate = formatDate(currentDate);
            } else if (currentDate && currentDate.date) {
                // Nếu là object có property date
                currentDate = currentDate.date;
            } else {
                console.error('❌ Invalid date format:', currentDate);
                return;
            }
        }
        
        // Gọi getNextDate với string date
        const nextDate = await getNextDate(currentDate);
        console.log('📅 Ngày tiếp theo:', nextDate);
        
        if (!nextDate) {
            console.log('📭 Không có ngày tiếp theo, bỏ qua');
            return;
        }
        
        const nextDateId = nextDate.replace(/-/g, '');
        const currentReport = await dbGet('reports', currentDate.replace(/-/g, ''));
        
        if (!currentReport) {
            console.log('📭 Không tìm thấy báo cáo hiện tại');
            return;
        }
        
        const nextReport = await dbGet('reports', nextDateId);
        
        if (nextReport) {
            // Cập nhật báo cáo ngày tiếp theo
            await dbUpdate('reports', nextDateId, {
                openingBalance: currentReport.closingBalance || 0,
                updatedAt: new Date().toISOString(),
                _synced: false
            });
            console.log(`✅ Đã cập nhật số dư đầu kỳ cho ${nextDate}: ${currentReport.closingBalance || 0}`);
        } else {
            console.log(`📭 Chưa có báo cáo cho ${nextDate}, bỏ qua`);
        }
        
    } catch (error) {
        console.error('❌ Lỗi cập nhật số dư đầu kỳ:', error);
    }
}

// Hàm hỗ trợ: Lấy ngày tiếp theo
function getNextDate(dateStr) {
    try {
        const [year, month, day] = dateStr.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        date.setDate(date.getDate() + 1);
        
        const nextYear = date.getFullYear();
        const nextMonth = (date.getMonth() + 1).toString().padStart(2, '0');
        const nextDay = date.getDate().toString().padStart(2, '0');
        
        return `${nextYear}-${nextMonth}-${nextDay}`;
    } catch (error) {
        console.error('❌ Lỗi tính ngày tiếp theo:', error);
        return null;
    }
}

// Export hàm saveCurrentReport
window.saveCurrentReport = saveCurrentReport;



// FIX: Sửa hàm renderReportsTab để hiển thị đúng lịch sử xuất kho
async function renderReportsTab(container, report) {
    const actualReceived = calculateActualReceived(report);
    const totalExpenses = calculateTotalExpenses(report);
    const totalTransfers = calculateTotalTransfers(report);
    const totalExports = calculateTotalExports(report);
    
    // QUAN TRỌNG: Lấy lịch sử xuất kho từ database theo ngày báo cáo
    const exportsHistory = await getExportsHistoryForDate(report.date);
    const hasExportsHistory = exportsHistory.length > 0;
    const totalHistoricalExports = exportsHistory.reduce((sum, record) => sum + record.quantity, 0);
    
    // Kiểm tra nếu báo cáo đã được lưu (có doanh thu hoặc số dư hoặc xuất kho đã xử lý)
    const isSaved = report.revenue > 0 || report.closingBalance > 0 || hasExportsHistory;
    
    container.innerHTML = `
    <div class="reports-content" data-tab="reports">
            <div class="date-selector">
                <input type="date" class="date-input" value="${report.date}" id="dateInput" 
                       onchange="changeDateByInput(this.value)">
                ${isSaved ? '<div class="saved-badge">✅</div>' : ''}
            </div>

            <div class="summary-grid">
                <div class="summary-card">
                    <h3>Số dư đầu kỳ</h3>
                    <div class="amount">${formatCurrency(report.openingBalance)}</div>
                </div>
                
                <div class="summary-card">
                    <h3>Doanh thu</h3>
                    <input type="number" id="revenueInput" class="amount-input" 
                           value="${report.revenue}" placeholder="0" min="0">
                </div>
                
                <div class="summary-card clickable" data-action="show-expenses">
                    <h3>Chi phí ›</h3>
                    <div class="amount">${formatCurrency(totalExpenses)}</div>
                </div>
                
                <div class="summary-card clickable" data-action="show-transfers">
                    <h3>Chuyển khoản ›</h3>
                    <div class="amount">${formatCurrency(totalTransfers)}</div>
                </div>
                
                <div class="summary-card">
                    <h3>Số dư cuối kỳ</h3>
                    <input type="number" id="closingBalanceInput" class="amount-input" 
                           value="${report.closingBalance}" placeholder="0" min="0">
                </div>
                
                <div class="summary-card" style="background: #e8f5e8;">
                    <h3>Thực nhận</h3>
                    <div class="amount" style="color: #2e7d32;">${formatCurrency(actualReceived)}</div>
                </div>
            </div>

            <div class="action-buttons">
                <button class="btn btn-primary" data-action="save-report">
                    ${isSaved ? '💾 Cập nhật' : '💾 Lưu'}
                </button>
                <button class="btn btn-success" data-action="share-zalo">📱 Gửi Zalo</button>
            </div>
        </div>

        <!-- PHẦN XUẤT KHO - HIỆN TẠI (chờ xuất) -->
        <div class="section">
            <div class="section-header-with-action clickable-header" data-action="toggle-inventory-list">
                <h2>📦 Kho hàng</h2>
                <button class="btn btn-outline btn-sm">
                   ${showInventoryList ? '👁‍🗨' : '👁'}
                </button>
            </div>
            
            ${showInventoryList ? `
                <div class="exports-table-container">
                    <table class="exports-table">
                        <thead>
                            <tr>
                                <th>Tên sản phẩm</th>
                                <th>Tồn kho</th>
                                <th>Xuất kho</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${await renderExportsTable(report.exports)}
                        </tbody>
                    </table>
                </div>
            ` : ''}

            <div class="export-total">
                <strong>${totalExports} sản phẩm chờ xuất kho</strong>
            </div>
        </div>

        <!-- PHẦN XUẤT KHO - LỊCH SỬ ĐÃ LƯU -->
        ${hasExportsHistory ? `
            <div class="section">
                <div class="section-header">
                    <h2>📦 Hàng đã xuất trong ngày</h2>
                </div>
                <div class="exports-history-section">
                    <div class="exports-history-list">
                        ${exportsHistory.map(record => {
                            const product = record.product;
                            // LẤY TÊN CHÍNH XÁC TỪ PRODUCT HOẶC TỪ RECORD
                            const productName = product?.name || record.productName || 'Unknown';
                            const productUnit = product?.unit || record.productUnit || '';
                            
                            return `
                                <div class="export-history-item">
                                    <span class="export-product">${productName}</span>
                                    <span class="export-quantity">${record.quantity} ${productUnit}</span>
                                    <span class="export-time">${formatTime(record.date)}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    <div class="exports-history-total">
                        <strong>Tổng: ${totalHistoricalExports} sản phẩm đã xuất kho</strong>
                    </div>
                </div>
            </div>
        ` : ''}

        <!-- PHẦN LỊCH SỬ BÁO CÁO -->
        <div class="section">
            <div class="section-header-with-action">
                <h2 class="clickable-section-header" data-action="toggle-reports-history">📜 Lịch sử Báo cáo</h2>
                <button class="btn btn-outline btn-sm" data-action="toggle-reports-history">
                    ${showReportsHistory ? '👁‍🗨' : '👁'}
                </button>
            </div>
            ${showReportsHistory ? await renderReportsHistory() : ''}
        </div>
    `;
}



// HÀM GOM VÀ SYNC TOÀN BỘ DỮ LIỆU TỪ INDEXEDDB
async function collectAndSyncAllData() {
    try {
        console.log('📊 GOM TOÀN BỘ DỮ LIỆU TỪ INDEXEDDB...');
        
        if (!firebaseSync.enabled) {
            console.log('⚠️ Firebase sync bị tắt');
            return false;
        }
        
        if (!firebaseSync.db) {
            console.log('🔄 Đang khởi tạo Firebase...');
            initializeFirebase();
            
            if (!firebaseSync.db) {
                console.log('❌ Không thể kết nối Firebase, đưa vào hàng chờ');
                return false;
            }
        }
        
        // DANH SÁCH TẤT CẢ STORES CẦN SYNC
        const allStores = [
            'employees',
            'reports', 
            'inventory',
            'inventoryHistory',
            'operations',
            'attendance',
            'discipline_records',
            'work_logs',
            'settings'
        ];
        
        let totalItems = 0;
        let syncedItems = 0;
        let failedItems = 0;
        
        // SYNC TỪNG STORE
        for (const storeName of allStores) {
            try {
                console.log(`📦 Đang gom dữ liệu từ: ${storeName}`);
                
                // Lấy TOÀN BỘ dữ liệu từ store này
                const allData = await dbGetAll(storeName);
                console.log(`   Tìm thấy ${allData.length} bản ghi trong ${storeName}`);
                
                totalItems += allData.length;
                
                // SYNC TỪNG BẢN GHI LÊN FIREBASE
                for (const item of allData) {
                    try {
                        // Chuẩn bị dữ liệu cho Firebase
                        let firebaseData = { ...item };
                        
                        // Đảm bảo có các trường metadata
                        if (!firebaseData._synced) {
                            firebaseData._synced = true;
                            firebaseData._lastSync = new Date().toISOString();
                            firebaseData._deviceId = localStorage.getItem('device_id') || 'unknown';
                            firebaseData._syncTimestamp = Date.now();
                        }
                        
                        // Xác định document ID
                        let docId;
                        if (firebaseData.employeeId) docId = firebaseData.employeeId;
                        else if (firebaseData.reportId) docId = firebaseData.reportId;
                        else if (firebaseData.operationId) docId = firebaseData.operationId;
                        else if (firebaseData.productId) docId = firebaseData.productId;
                        else if (firebaseData.attendanceId) docId = firebaseData.attendanceId;
                        else if (firebaseData.historyId) docId = firebaseData.historyId;
                        else if (firebaseData.recordId) docId = firebaseData.recordId;
                        else if (firebaseData.logId) docId = firebaseData.logId;
                        else if (firebaseData.key) docId = firebaseData.key;
                        else {
                            console.warn(`⚠️ Không tìm thấy ID cho bản ghi trong ${storeName}:`, item);
                            continue;
                        }
                        
                        // Gửi lên Firebase
                        await firebaseSync.db.collection(storeName)
                            .doc(docId)
                            .set(firebaseData, { merge: true });
                        
                        syncedItems++;
                        
                        // Cập nhật trạng thái sync trong IndexedDB
                        try {
                            await dbUpdate(storeName, docId, {
                                _synced: true,
                                _lastSync: new Date().toISOString()
                            });
                        } catch (dbError) {
                            // Bỏ qua nếu không update được
                        }
                        
                    } catch (itemError) {
                        console.error(`❌ Lỗi sync bản ghi trong ${storeName}:`, itemError);
                        failedItems++;
                    }
                }
                
                console.log(`✅ Đã gửi ${storeName} lên Firebase`);
                
            } catch (storeError) {
                console.error(`❌ Lỗi khi gom dữ liệu từ ${storeName}:`, storeError);
                failedItems++;
            }
        }
        
        console.log(`📊 KẾT QUẢ SYNC: ${syncedItems}/${totalItems} bản ghi thành công, ${failedItems} lỗi`);
        
        // ĐẶC BIỆT: ĐẢM BẢO BÁO CÁO HIỆN TẠI ĐƯỢC SYNC
        try {
            console.log('🔍 Đang sync báo cáo hiện tại...');
            const currentReportFull = await dbGet('reports', currentReportDate);
            if (currentReportFull) {
                await firebaseSync.db.collection('reports')
                    .doc(currentReportDate)
                    .set({
                        ...currentReportFull,
                        _synced: true,
                        _lastSync: new Date().toISOString(),
                        _deviceId: localStorage.getItem('device_id') || 'unknown',
                        _syncTimestamp: Date.now()
                    }, { merge: true });
                console.log('✅ Đã sync báo cáo hiện tại');
            }
        } catch (reportError) {
            console.error('❌ Lỗi sync báo cáo hiện tại:', reportError);
        }
        
        return failedItems === 0;
        
    } catch (error) {
        console.error('❌ Lỗi trong collectAndSyncAllData:', error);
        return false;
    }
}



// HÀM LƯU BÁO CÁO VÀO INDEXEDDB (VỚI XUẤT KHO)
async function saveReportToIndexedDB(reportData) {
    try {
        console.log('💾 Lưu báo cáo vào IndexedDB...');
        
        // Kiểm tra report đã tồn tại chưa
        const existingReport = await dbGet('reports', reportData.reportId);
        
        if (existingReport) {
            console.log('📝 Cập nhật báo cáo trong IndexedDB');
            // GHI ĐÈ toàn bộ dữ liệu (bao gồm xuất kho)
            await dbUpdate('reports', reportData.reportId, reportData);
        } else {
            console.log('🆕 Thêm báo cáo mới vào IndexedDB');
            await dbAdd('reports', reportData);
        }
        
        console.log('✅ Lưu IndexedDB thành công');
        return true;
        
    } catch (error) {
        console.error('❌ Lỗi lưu vào IndexedDB:', error);
        throw error;
    }
}



// EXPOSE TO WINDOW
window.saveCurrentReport = saveCurrentReport;
window.collectAndSyncAllData = collectAndSyncAllData;

// THÊM HÀM ĐỒNG BỘ TOÀN BỘ DỮ LIỆU LÊN FIREBASE
async function syncAllDataToFirebase() {
    try {
        console.log('☁️ Syncing ALL data to Firebase...');
        
        if (!firebaseSync.enabled) {
            console.log('⚠️ Firebase sync disabled');
            return false;
        }
        
        // 1. ĐỒNG BỘ DANH SÁCH STORES CẦN SYNC
        const storesToSync = [
            'employees',
            'reports', 
            'inventory',
            'inventoryHistory',
            'operations',
            'attendance',
            'discipline_records',
            'work_logs',
            'settings'
        ];
        
        let totalSynced = 0;
        let totalErrors = 0;
        
        // 2. SYNC TỪNG STORE
        for (const storeName of storesToSync) {
            try {
                console.log(`📦 Syncing ${storeName}...`);
                
                // Lấy tất cả dữ liệu từ IndexedDB
                const allData = await dbGetAll(storeName);
                console.log(`   Found ${allData.length} records in ${storeName}`);
                
                // Sync từng bản ghi
                for (const item of allData) {
                    try {
                        // Gọi hàm sync tiêu chuẩn
                        const success = await syncToFirebase(storeName, item);
                        if (success) {
                            totalSynced++;
                        } else {
                            totalErrors++;
                        }
                    } catch (itemError) {
                        console.error(`❌ Error syncing item in ${storeName}:`, itemError);
                        totalErrors++;
                    }
                }
                
                console.log(`✅ ${storeName} sync completed`);
                
            } catch (storeError) {
                console.error(`❌ Error syncing store ${storeName}:`, storeError);
                totalErrors++;
            }
        }
        
        // 3. ĐỒNG BỘ BÁO CÁO HIỆN TẠI VỚI EXPORTS (để đảm bảo)
        try {
            const currentReportFull = await dbGet('reports', currentReportDate);
            if (currentReportFull) {
                console.log('☁️ Syncing current report separately...');
                await syncToFirebase('reports', currentReportFull);
            }
        } catch (reportError) {
            console.error('❌ Error syncing current report:', reportError);
        }
        
        console.log(`📊 Sync Summary: ${totalSynced} items synced, ${totalErrors} errors`);
        
        return totalErrors === 0;
        
    } catch (error) {
        console.error('❌ Error in syncAllDataToFirebase:', error);
        return false;
    }
}

// THÊM HÀM SYNC BULK (để tối ưu)
async function syncBulkToFirebase(storeName, items) {
    if (!firebaseSync.enabled || !firebaseSync.db) {
        return false;
    }
    
    try {
        const batch = firebaseSync.db.batch();
        
        for (const item of items) {
            // Xác định document ID dựa trên store
            let docId;
            switch (storeName) {
                case 'employees': docId = item.employeeId; break;
                case 'reports': docId = item.reportId; break;
                case 'operations': docId = item.operationId; break;
                case 'inventory': docId = item.productId; break;
                case 'inventoryHistory': docId = item.historyId; break;
                case 'attendance': docId = item.attendanceId; break;
                case 'discipline_records': docId = item.recordId; break;
                case 'work_logs': docId = item.logId; break;
                case 'settings': docId = item.key; break;
                default: docId = item.id || item._id;
            }
            
            if (docId) {
                const docRef = firebaseSync.db.collection(storeName).doc(docId);
                
                // Chuẩn bị dữ liệu sync
                const syncData = {
                    ...item,
                    _synced: true,
                    _lastSync: new Date().toISOString(),
                    _deviceId: localStorage.getItem('device_id') || 'unknown',
                    _syncTimestamp: Date.now()
                };
                
                batch.set(docRef, syncData, { merge: true });
            }
        }
        
        await batch.commit();
        console.log(`✅ Bulk sync: ${items.length} items to ${storeName}`);
        
        return true;
        
    } catch (error) {
        console.error(`❌ Bulk sync error for ${storeName}:`, error);
        
        // Nếu batch lỗi, thử sync từng cái
        for (const item of items) {
            try {
                await syncToFirebase(storeName, item);
            } catch (itemError) {
                console.error(`❌ Individual sync failed:`, itemError);
            }
        }
        
        return false;
    }
}

// SỬA HÀM syncReportToFirebase thành sync chỉ báo cáo
async function syncSingleReportToFirebase(reportData) {
    try {
        // 1. KIỂM TRA FIREBASE
        if (!firebaseSync.enabled) {
            console.log('⚠️ Firebase sync disabled');
            return false;
        }
        
        if (!firebaseSync.db) {
            console.log('⚠️ Firebase DB not initialized, attempting to initialize...');
            initializeFirebase();
            
            if (!firebaseSync.db) {
                console.log('❌ Still no Firebase DB, queuing sync');
                firebaseSync.pendingSyncs.push({
                    storeName: 'reports',
                    data: reportData,
                    timestamp: new Date()
                });
                return false;
            }
        }
        
        console.log('☁️ Syncing single report to Firebase...', {
            date: reportData.date,
            hasExports: reportData._hasExports
        });
        
        // 2. CHUẨN BỊ DỮ LIỆU
        const firebaseData = {
            ...reportData,
            _synced: true,
            _lastSync: new Date().toISOString(),
            _deviceId: localStorage.getItem('device_id') || 'unknown',
            _syncTimestamp: Date.now()
        };
        
        // 3. SYNC LÊN FIREBASE
        const docRef = firebaseSync.db.collection('reports').doc(reportData.reportId);
        await docRef.set(firebaseData, { merge: true });
        
        console.log(`✅ Single report sync successful: reports/${reportData.reportId}`);
        
        // 4. CẬP NHẬT TRẠNG THÁI SYNC TRONG INDEXEDDB
        try {
            await dbUpdate('reports', reportData.reportId, {
                _synced: true,
                _lastSync: new Date().toISOString()
            });
        } catch (dbError) {
            console.warn('Could not update sync status in IndexedDB:', dbError);
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Single report sync error:', error);
        
        // Thêm vào pending syncs
        firebaseSync.pendingSyncs.push({
            storeName: 'reports',
            data: reportData,
            timestamp: new Date(),
            retryCount: 0,
            error: error.message
        });
        
        return false;
    }
}

// EXPOSE TO WINDOW
window.saveCurrentReport = saveCurrentReport;
window.syncAllDataToFirebase = syncAllDataToFirebase;
window.syncBulkToFirebase = syncBulkToFirebase;
/**
 * @name showSaveNotification
 * @description Hiển thị toast thông báo khi lưu báo cáo
 */
function showSaveNotification(isUpdate, exportsCount, totalExportsQuantity) {
    let message = isUpdate ? '💾 Đang cập nhật báo cáo...' : '💾 Đang lưu báo cáo...';
    
    if (exportsCount > 0) {
        if (isUpdate) {
            message = `💾 Đang cập nhật báo cáo và xử lý ${exportsCount} mặt hàng xuất kho...`;
        } else {
            message = `💾 Đang lưu báo cáo và xử lý ${exportsCount} mặt hàng xuất kho...`;
        }
    }
    
    showToast(message, 'info');
}
async function syncReportsFromFirebaseManually() {
    try {
        if (!firebaseSync.enabled || !firebaseSync.db) {
            console.log('⚠️ Firebase not available');
            return;
        }
        
        console.log('📥 Syncing reports from Firebase...');
        
        // Lấy dữ liệu từ Firebase
        const snapshot = await firebaseSync.db.collection('reports').get();
        const firebaseIds = new Set();
        
        for (const doc of snapshot.docs) {
            const firebaseData = doc.data();
            const reportId = firebaseData.reportId;
            
            if (!reportId) continue;
            
            firebaseIds.add(reportId);
            
            // Lấy dữ liệu local
            const localReport = await dbGet('reports', reportId);
            
            // Chuẩn bị dữ liệu
            const dataToSave = {
                ...firebaseData,
                _synced: true,
                _lastSync: new Date().toISOString()
            };
            
            // Lưu vào IndexedDB
            if (localReport) {
                await dbUpdate('reports', reportId, dataToSave);
            } else {
                await dbAdd('reports', dataToSave);
            }
        }
        
        // Fix số dư đầu kỳ sau khi sync
        await fixOpeningBalanceOnSync();
        
        console.log('✅ Reports sync complete with opening balance fix');
        showMessage('✅ Đã đồng bộ báo cáo và fix số dư đầu kỳ', 'success');
        
        // Reload UI
        loadReportsTab();
        
    } catch (error) {
        console.error('❌ Error syncing reports:', error);
        showMessage('❌ Lỗi khi đồng bộ báo cáo', 'error');
    }
}

// Thêm nút sync manual vào UI
function addSyncManualButton() {
    if (!isAdmin()) return;
    
    const container = document.getElementById('reports');
    if (!container) return;
    
    const syncButton = document.createElement('button');
    syncButton.className = 'btn btn-info btn-sm';
    syncButton.style.marginLeft = '10px';
    syncButton.innerHTML = '🔄 Fix Opening Balance';
    syncButton.onclick = syncReportsFromFirebaseManually;
    
    // Tìm phần developer tools để thêm nút
    const devSection = container.querySelector('.dev-actions');
    if (devSection) {
        devSection.appendChild(syncButton);
    }
}

async function fixOpeningBalanceOnSync() {
    try {
        console.log('🔧 Fixing opening balance chain after sync...');
        
        const allReports = await dbGetAll('reports');
        if (allReports.length === 0) return;
        
        // Sắp xếp theo ngày
        const sortedReports = allReports.sort((a, b) => a.date.localeCompare(b.date));
        
        // Tạo map để truy cập nhanh
        const reportMap = new Map();
        sortedReports.forEach(report => {
            reportMap.set(report.date, report);
        });
        
        // Duyệt qua tất cả báo cáo và fix số dư đầu kỳ
        for (let i = 1; i < sortedReports.length; i++) {
            const currentReport = sortedReports[i];
            const prevReport = sortedReports[i - 1];
            
            // Kiểm tra xem có phải ngày liên tiếp không
            const currentDate = new Date(currentReport.date);
            const prevDate = new Date(prevReport.date);
            prevDate.setDate(prevDate.getDate() + 1);
            
            const currentDateStr = formatDate(currentDate);
            const prevDateStr = formatDate(prevDate);
            
            if (currentDateStr === prevDateStr) {
                // Ngày liên tiếp, cập nhật số dư đầu kỳ
                const correctOpeningBalance = prevReport.closingBalance || 0;
                
                if (currentReport.openingBalance !== correctOpeningBalance) {
                    console.log(`🔄 Fixing ${currentReport.date}: opening=${currentReport.openingBalance} → ${correctOpeningBalance}`);
                    
                    await dbUpdate('reports', currentReport.reportId, {
                        openingBalance: correctOpeningBalance,
                        updatedAt: new Date().toISOString(),
                        _synced: false,
                        _autoFixed: true
                    });
                    
                    // Sync lên Firebase
                    if (firebaseSync.enabled) {
                        const updatedReport = {
                            ...currentReport,
                            openingBalance: correctOpeningBalance,
                            updatedAt: new Date().toISOString()
                        };
                        await syncToFirebase('reports', updatedReport);
                    }
                }
            }
        }
        
        console.log('✅ Opening balance chain fixed after sync');
        
    } catch (error) {
        console.error('❌ Error fixing opening balance on sync:', error);
    }
}

async function getNextDate(currentDate) {
    try {
        const [year, month, day] = currentDate.split('-').map(Number);
        const nextDate = new Date(year, month - 1, day + 1);
        const nextYear = nextDate.getFullYear();
        const nextMonth = (nextDate.getMonth() + 1).toString().padStart(2, '0');
        const nextDay = nextDate.getDate().toString().padStart(2, '0');
        return `${nextYear}-${nextMonth}-${nextDay}`;
    } catch (error) {
        console.error('Error getting next date:', error);
        return '';
    }
}
/**
 * @name showToast
 * @description Hiển thị toast notification
 */
function showToast(message, type = 'info') {
    // Xóa toast cũ nếu có
    const oldToast = document.getElementById('global-toast');
    if (oldToast) {
        oldToast.remove();
    }
    
    // Tạo toast mới
    const toast = document.createElement('div');
    toast.id = 'global-toast';
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // Tự động ẩn sau 5 giây
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 5000);
}

// Thêm vào window
window.showToast = showToast;
async function syncReportToFirebase(reportData) {
    try {
        // 1. KIỂM TRA FIREBASE
        if (!firebaseSync.enabled) {
            console.log('⚠️ Firebase sync disabled');
            return false;
        }
        
        if (!firebaseSync.db) {
            console.log('⚠️ Firebase DB not initialized, attempting to initialize...');
            initializeFirebase();
            
            if (!firebaseSync.db) {
                console.log('❌ Still no Firebase DB, queuing sync');
                firebaseSync.pendingSyncs.push({
                    storeName: 'reports',
                    data: reportData,
                    timestamp: new Date()
                });
                return false;
            }
        }
        
        console.log('☁️ Syncing report to Firebase...', {
            date: reportData.date,
            hasExports: reportData._hasExports,
            exportsCount: reportData.exports?.length || 0
        });
        
        // 2. CHUẨN BỊ DỮ LIỆU
        const firebaseData = {
            ...reportData,
            _synced: true,
            _lastSync: new Date().toISOString(),
            _deviceId: localStorage.getItem('device_id') || 'unknown',
            _syncTimestamp: Date.now()
        };
        
        // 3. SYNC LÊN FIREBASE
        const docRef = firebaseSync.db.collection('reports').doc(reportData.reportId);
        
        // Sử dụng set với merge: true
        await docRef.set(firebaseData, { merge: true });
        
        console.log(`✅ Firebase sync successful: reports/${reportData.reportId}`);
        console.log('   Exports saved:', firebaseData.exports?.length || 0);
        
        // 4. CẬP NHẬT TRẠNG THÁI SYNC TRONG INDEXEDDB
        try {
            await dbUpdate('reports', reportData.reportId, {
                _synced: true,
                _lastSync: new Date().toISOString()
            });
        } catch (dbError) {
            console.warn('Could not update sync status in IndexedDB:', dbError);
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Firebase sync error:', error);
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        
        // Thêm vào pending syncs
        firebaseSync.pendingSyncs.push({
            storeName: 'reports',
            data: reportData,
            timestamp: new Date(),
            retryCount: 0,
            error: error.message
        });
        
        return false;
    }
}


// EXPOSE TO WINDOW
window.saveCurrentReport = saveCurrentReport;