// reports.js - Module báo cáo với lưu trữ theo ngày
class ReportsModule {
    constructor() {
    this.currentDate = this.formatDateForDisplay(new Date());
    this.currentDateKey = this.formatDateForStorage(new Date());
    this.expenses = [];
    this.transfers = [];
    this.inventoryExports = [];
    this.isLoading = false;
    this.currentReport = null;
    this.calculatedRevenue = 0;
    
    // THÊM: Auto-complete suggestions
    this.expenseSuggestions = this.loadSuggestions('expenseSuggestions');
    this.transferSuggestions = this.loadSuggestions('transferSuggestions');
    
    // ⭐⭐⭐ KHỞI TẠO AUTO-SAVE ⭐⭐⭐
    setTimeout(() => {
        this.setupAutoSave();
    }, 3000);
}
    // THÊM: Hàm quản lý suggestions
loadSuggestions(key) {
    try {
        const saved = localStorage.getItem(`milano_${key}`);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (e) {
        console.warn('Error loading suggestions:', e);
    }
    return [];
}

saveSuggestions(key, suggestions) {
    try {
        localStorage.setItem(`milano_${key}`, JSON.stringify(suggestions.slice(0, 20))); // Lưu 20 mục gần nhất
    } catch (e) {
        console.warn('Error saving suggestions:', e);
    }
}

addExpenseSuggestion(name) {
    if (!name || name.trim() === '') return;
    
    const trimmedName = name.trim();
    // Loại bỏ nếu đã tồn tại
    this.expenseSuggestions = this.expenseSuggestions.filter(s => s !== trimmedName);
    // Thêm vào đầu
    this.expenseSuggestions.unshift(trimmedName);
    // Giữ tối đa 20 mục
    this.expenseSuggestions = this.expenseSuggestions.slice(0, 20);
    this.saveSuggestions('expenseSuggestions', this.expenseSuggestions);
}

addTransferSuggestion(content) {
    if (!content || content.trim() === '') return;
    
    const trimmedContent = content.trim();
    // Loại bỏ nếu đã tồn tại
    this.transferSuggestions = this.transferSuggestions.filter(s => s !== trimmedContent);
    // Thêm vào đầu
    this.transferSuggestions.unshift(trimmedContent);
    // Giữ tối đa 20 mục
    this.transferSuggestions = this.transferSuggestions.slice(0, 20);
    this.saveSuggestions('transferSuggestions', this.transferSuggestions);
}
    formatDateForDisplay(date) {
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    }
    
    formatDateForStorage(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    parseStorageDate(dateStr) {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
    }
    
    parseDisplayDate(dateStr) {
        const [day, month, year] = dateStr.split('/').map(Number);
        return new Date(year, month - 1, day);
    }
    formatDateFromFirebase(dateKey) {
    try {
        // Chuyển từ yyyy-mm-dd thành dd/mm/yyyy
        if (!dateKey) return '';
        
        // Nếu đã là định dạng dd/mm/yyyy thì trả về luôn
        if (dateKey.includes('/')) {
            return dateKey;
        }
        
        // Xử lý yyyy-mm-dd
        const [year, month, day] = dateKey.split('-');
        
        if (!year || !month || !day) {
            console.warn(`⚠️ Invalid date format: ${dateKey}`);
            return dateKey;
        }
        
        return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
        
    } catch (error) {
        console.error('❌ Error formatting date from Firebase:', error, 'Input:', dateKey);
        return dateKey;
    }
}
formatDateForFirebase(dateStr) {
    try {
        // Chuyển từ dd/mm/yyyy thành yyyy-mm-dd
        if (!dateStr) return '';
        
        // Nếu đã là định dạng yyyy-mm-dd thì trả về luôn
        if (dateStr.includes('-') && dateStr.split('-')[0].length === 4) {
            return dateStr;
        }
        
        // Xử lý dd/mm/yyyy
        const [day, month, year] = dateStr.split('/');
        
        if (!day || !month || !year) {
            console.warn(`⚠️ Invalid date format: ${dateStr}`);
            return dateStr;
        }
        
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        
    } catch (error) {
        console.error('❌ Error formatting date for Firebase:', error, 'Input:', dateStr);
        return dateStr;
    }
}
   async render() {
    if (this.isLoading) return;

    this.isLoading = true;
    const mainContent = document.getElementById('mainContent');

    try {
        // ============================================================
        // 1) TẢI DỮ LIỆU TẠM LOCAL STORAGE (ưu tiên hiển thị UI)
        // ============================================================
        this.loadTempData(this.currentDate);
        console.log(`📌 Temp data loaded:`, {
            expenses: this.expenses.length,
            transfers: this.transfers.length,
            exports: this.inventoryExports.length
        });

        // ============================================================
        // 2) TẢI REPORT TRÊN FIREBASE (chỉ dùng nếu local KHÔNG có)
        // ============================================================
        let firebaseReport = null;

        if (!this.currentReport || this.currentReport.date !== this.currentDate) {
            firebaseReport = await this.loadReportForDate(this.currentDateKey);
            this.currentReport = firebaseReport || null;
        } else {
            firebaseReport = this.currentReport;
        }

        console.log("📄 Firebase report:", firebaseReport);

        // ============================================================
        // 3) GHÉP DỮ LIỆU: ƯU TIÊN LOCAL → fallback firebase
        // ============================================================

        // -- Chi phí --
        if (this.expenses.length === 0 && firebaseReport?.expenses) {
            this.expenses = [...firebaseReport.expenses];
        }

        // -- Chuyển khoản --
        if (this.transfers.length === 0 && firebaseReport?.transfers) {
            this.transfers = [...firebaseReport.transfers];
        }

        // -- Hàng xuất --
        const savedExports = firebaseReport?.inventoryExports || [];
        const pendingExports = this.inventoryExports || [];
        const allExports = pendingExports.length > 0
            ? [...savedExports, ...pendingExports]
            : [...savedExports];

        // ============================================================
        // 4) XÁC ĐỊNH SỐ DƯ ĐẦU KỲ
        // ============================================================
        let openingBalance = 0;

        if (firebaseReport?.openingBalance !== undefined) {
            openingBalance = firebaseReport.openingBalance;
        } else {
            openingBalance = await this.getOpeningBalance(this.currentDateKey);
        }

        // ============================================================
        // 5) LẤY SỐ ĐANG NHẬP TRÊN UI → ƯU TIÊN
        // ============================================================
        const actualReceived =
            this.getCurrencyValue("actualReceived") ||
            firebaseReport?.actualReceived ||
            0;

        const closingBalance =
            this.getCurrencyValue("closingBalance") ||
            firebaseReport?.closingBalance ||
            0;

        // ============================================================
        // 6) CHUẨN BỊ TEXT HIỂN THỊ HÀNG XUẤT
        // ============================================================
        const exportText =
            allExports.length > 0
                ? allExports
                      .map(
                          (item) =>
                              `${item.product || item.name} - ${item.quantity}${item.unit || ""}`
                      )
                      .join(", ")
                : "Chưa có hàng xuất";

        // ============================================================
        // 7) KIỂM TRA QUYỀN TRUY CẬP
        // ============================================================
        const isEmployee = window.authManager?.isEmployee() || false;
        const isAdmin = window.authManager?.isAdmin() || false;
        const isLatestReport = this.canEmployeeEditReport(this.currentDate);
        const canEditReport = isAdmin || (isEmployee && isLatestReport);
        
        console.log(`🔐 Quyền truy cập:`, {
            isEmployee,
            isAdmin,
            isLatestReport,
            canEditReport,
            currentDate: this.currentDate
        });

        // ============================================================
        // 8) RENDER HTML
        // ============================================================
        mainContent.innerHTML = `
            <div class="report-container">

                <div class="report-header">
                    BÁO CÁO NGÀY
                    <input type="date" id="reportDate"
                           value="${this.getInputDateValue()}"
                           onchange="window.reportsModule.changeDate()">
                </div>

                ${(this.expenses.length > 0 || this.transfers.length > 0) &&
                !firebaseReport
                    ? `
                    <div class="unsaved-notice">
                        <i class="fas fa-exclamation-circle"></i>
                        Dữ liệu chưa lưu: ${this.expenses.length} chi phí, ${this.transfers.length} chuyển khoản
                    </div>`
                    : ""}

                ${isEmployee && !isLatestReport ? `
                    <div class="view-only-notice">
                        <i class="fas fa-eye"></i>
                        <span>Đang xem báo cáo cũ - Chỉ có quyền xem</span>
                    </div>
                ` : ''}

                <div class="opening-balance">
                    <i class="fas fa-wallet"></i> 
                    Dư đầu kỳ: <strong>${openingBalance.toLocaleString()} ₫</strong>
                </div>

                <div class="quick-stats">
                    <div class="stat-card" onclick="window.reportsModule.showExpensesModal()">
                        <i class="fas fa-credit-card"></i>
                        <span>💳 CHI PHÍ ${this.expenses.length ? `<span class="count-badge">${this.expenses.length}</span>` : ""} </span>
                        <span id="expensesTotal" class="amount">
                            ${this.getTotalExpenses().toLocaleString()} ₫
                        </span>
                        
                    </div>

                    <div class="stat-card" onclick="window.reportsModule.showTransfersModal()">
                        <i class="fas fa-university"></i>
                        <span>🏦 CHUYỂN KHOẢN ${this.transfers.length ? `<span class="count-badge">${this.transfers.length}</span>` : ""} </span> 
                        <span id="transfersTotal" class="amount">
                            ${this.getTotalTransfers().toLocaleString()} ₫
                        </span>
                        
                    </div>
                </div>

                <div class="report-card compact">
    <label>THỰC NHẬN (Giao quỹ)</label>
    <div class="input-group">
        <input type="text" id="actualReceived"
               value="${actualReceived > 0 ? actualReceived.toLocaleString() : ""}"
               oninput="window.reportsModule.formatLiveInput(this); window.reportsModule.calculate()"
               onblur="window.reportsModule.formatCurrency(this)"
               placeholder="Nhập số tiền"
               ${!canEditReport ? 'readonly style="background:#f5f5f5; cursor:not-allowed;"' : ''}>
    </div>
</div>

<div class="report-card compact">
    <label>SỐ DƯ CUỐI KỲ</label>
    <div class="input-group">
        <input type="text" id="closingBalance"
               value="${closingBalance > 0 ? closingBalance.toLocaleString() : ""}"
               oninput="window.reportsModule.formatLiveInput(this); window.reportsModule.calculate()"
               onblur="window.reportsModule.formatCurrency(this)"
               placeholder="Nhập số dư"
               ${!canEditReport ? 'readonly style="background:#f5f5f5; cursor:not-allowed;"' : ''}>
    </div>
</div>

                <div class="action-buttons">
                    ${canEditReport ? `
                        <button class="btn-primary" onclick="window.reportsModule.saveReport()">
                            <i class="fas fa-save"></i> 💾 LƯU BÁO CÁO
                        </button>
                    ` : `
                        <button class="btn-primary disabled" onclick="window.showToast('Chỉ được cập nhật báo cáo gần nhất', 'info')">
                            <i class="fas fa-lock"></i> 🔒 CHỈ XEM
                        </button>
                    `}
                    <button class="btn-primary" onclick="window.reportsModule.sendToZalo()">
                        <i class="fas fa-paper-plane"></i> 📱 GỬI ZALO
                    </button>        
                </div>

                <div class="export-line">
                    <i class="fas fa-box" style="color:#4CAF50;margin-right:5px;"></i>
                    <strong>Hàng xuất:</strong> ${exportText}
                    ${
                        pendingExports.length > 0
                            ? `<span class="pending-badge">${pendingExports.length} chờ lưu</span>`
                            : ""
                    }
                </div>

                <div class="action-card" onclick="window.reportsModule.toggleInventory()">
                    <i class="fas fa-boxes"></i>
                    <span>📦 XUẤT KHO</span>
                    <span id="inventoryCount" class="amount">${allExports.length} sản phẩm</span>
                    ${pendingExports.length ? `<span class="pending-indicator">!</span>` : ""}
                    <i class="fas fa-chevron-down" id="inventoryToggle"></i>
                </div>

                <div id="inventorySection" class="collapsible-section" style="display:none;"></div>

                <div class="action-card" onclick="window.reportsModule.toggleHistory()">
                    <i class="fas fa-history"></i>
                    <span>📜 LỊCH SỬ BÁO CÁO</span>
                    <i class="fas fa-chevron-down" id="historyToggle"></i>
                </div>

                <div id="historySection" class="collapsible-section" style="display:none;"></div>

            </div>
        `;

        // ============================================================
        // 9) TÍNH TOÁN & UPDATE UI BÊN DƯỚI
        // ============================================================
        this.calculate();
        this.updateInventoryUI();

    } catch (err) {
        console.error("❌ Render error:", err);
        mainContent.innerHTML = `
            <div class="error">
                <i class="fas fa-exclamation-triangle"></i>
                Lỗi khi tải báo cáo: ${err.message}
            </div>
        `;
    } finally {
        this.isLoading = false;
    }
}

    async loadReport(date) {
    console.log(`📥 Loading report for date: ${date}`);
    
    // Parse date
    const [day, month, year] = date.split('/');
    const dateKey = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    
    // Cập nhật ngày hiện tại
    this.currentDateKey = dateKey;
    this.currentDate = date;
    
    // ⭐⭐⭐ TRƯỚC KHI RESET: LƯU DỮ LIỆU TẠM CỦA NGÀY HIỆN TẠI NẾU CÓ ⭐⭐⭐
    if (this.expenses.length > 0 || this.transfers.length > 0) {
        this.saveTempExpenses(this.currentDate);
        this.saveTempTransfers(this.currentDate);
        console.log(`💾 Lưu tạm trước khi chuyển ngày: ${this.expenses.length} chi phí, ${this.transfers.length} chuyển khoản`);
    }
    
    // Reset data để tải mới
    this.currentReport = null;
    this.expenses = [];
    this.transfers = [];
    this.inventoryExports = [];
    
    // ⭐⭐⭐ LOAD DỮ LIỆU TẠM TỪ LOCALSTORAGE CHO NGÀY MỚI ⭐⭐⭐
    this.loadTempData(this.currentDate);
    console.log(`📥 Đã tải dữ liệu tạm: ${this.expenses.length} chi phí, ${this.transfers.length} chuyển khoản`);
    
    // Hiển thị loading
    const mainContent = document.getElementById('mainContent');
    if (mainContent) {
        mainContent.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Đang tải báo cáo ngày ${date}...</p>
            </div>
        `;
    }
    
    // Tải và render
    await this.render();
    
    window.showToast(`✅ Đã tải báo cáo ngày ${date}`, 'success');
    
    // Đóng history section nếu đang mở
    const historySection = document.getElementById('historySection');
    if (historySection) {
        historySection.style.display = 'none';
        const toggleIcon = document.getElementById('historyToggle');
        if (toggleIcon) {
            toggleIcon.className = 'fas fa-chevron-down';
        }
    }
}

async saveReport() {
    try {
        // 1. Kiểm tra quyền trước khi lưu
        if (window.authManager && window.authManager.isEmployee()) {
            const currentDate = this.currentDate;
            
            console.log(`🔐 Kiểm tra quyền lưu báo cáo ngày ${currentDate}`);
            
            // Nhân viên chỉ được lưu báo cáo GẦN NHẤT
            if (!this.canEmployeeEditReport(currentDate)) {
                const latestDate = this.getLatestReportDate();
                window.showToast(`Chỉ được cập nhật báo cáo gần nhất (${latestDate})`, 'warning');
                return;
            }
        }
        
        // 2. Lấy số dư đầu kỳ từ ngày trước (tính tự động)
        const openingBalance = await this.getOpeningBalance(this.currentDateKey);
        
        // 3. Lấy giá trị từ UI
        const actualReceived = this.getCurrencyValue('actualReceived');
        const closingBalance = this.getCurrencyValue('closingBalance');
        const expensesTotal = this.getTotalExpenses();
        const transfersTotal = this.getTotalTransfers();
        
        // 4. Validation cơ bản
        if (actualReceived < 0) {
            window.showToast('Số tiền thực nhận không hợp lệ', 'warning');
            document.getElementById('actualReceived').focus();
            return;
        }
        
        if (closingBalance < 0) {
            window.showToast('Số dư cuối kỳ không hợp lệ', 'warning');
            document.getElementById('closingBalance').focus();
            return;
        }
        
        // 5. Tính toán doanh thu
        const revenue = actualReceived + expensesTotal + transfersTotal - openingBalance + closingBalance;
        
        console.log('💰 Revenue calculation:', {
            actualReceived,
            expensesTotal,
            transfersTotal,
            openingBalance,
            closingBalance,
            revenue
        });
        
        // 6. KIỂM TRA VÀ XỬ LÝ XUẤT KHO
        let exportSuccess = true;
        let exportedItems = [];
        
        if (this.inventoryExports.length > 0) {
            console.log(`📦 Processing ${this.inventoryExports.length} inventory exports...`);
            exportSuccess = await this.processInventoryExports();
            
            if (!exportSuccess) {
                window.showToast('Lỗi khi xuất kho', 'error');
                return;
            }
            
            // Lưu danh sách hàng đã xuất để hiển thị
            exportedItems = [...this.inventoryExports];
        }
        
        // 7. TẠO REPORT DATA với thông tin hàng đã xuất
        const reportData = {
            date: this.currentDate,
            openingBalance,
            actualReceived,
            revenue,
            expenses: this.expenses,
            transfers: this.transfers,
            closingBalance,
            inventoryExports: exportSuccess ? exportedItems : [], // Lưu danh sách hàng đã xuất
            savedAt: new Date().toISOString(),
            version: (this.currentReport?.version || 0) + 1,
            inventoryUpdated: exportSuccess && exportedItems.length > 0,
            exportedItemsCount: exportedItems.length,
            exportedItemsTotal: exportedItems.reduce((sum, item) => sum + item.quantity, 0),
            savedBy: window.authManager?.currentUser?.name || 'Unknown',
            userRole: window.authManager?.currentUser?.role || 'unknown'
        };
        
        const dateKey = this.currentDateKey;
        
        console.log('💾 Saving report to Firebase:', {
            dateKey,
            version: reportData.version,
            exportedItems: reportData.inventoryExports.length,
            canEdit: this.canEmployeeEditReport(this.currentDate)
        });
        
        // 8. LƯU VÀO FIREBASE THÔNG QUA DATA MANAGER
        const success = await window.dataManager.saveLocal(
            'reports',
            `${dateKey}.json`,
            reportData,
            `Báo cáo ngày ${this.currentDate} - Xuất ${exportedItems.length} sản phẩm`
        );
        
        if (success) {
            // 9. ⭐⭐⭐ XÓA DỮ LIỆU TẠM SAU KHI LƯU THÀNH CÔNG ⭐⭐⭐
            this.clearTempData(this.currentDate);
            
            // 10. RESET DỮ LIỆU SAU KHI LƯU THÀNH CÔNG
            this.resetAfterSave();
            
            // 11. Cập nhật currentReport
            this.currentReport = reportData;
            
            // 12. Hiển thị thông báo
            window.showToast(`✅ Đã lưu báo cáo ngày ${this.currentDate}`, 'success');
            
            // 13. RENDER LẠI UI
            await this.render();
        } else {
            window.showToast('❌ Lỗi khi lưu báo cáo', 'error');
        }
        
    } catch (error) {
        console.error('❌ Error saving report:', error);
        window.showToast(`Lỗi khi lưu báo cáo: ${error.message}`, 'error');
    }
}

setupAutoSave() {
    // Tự động lưu mỗi 30 giây nếu có dữ liệu
    setInterval(() => {
        if (this.expenses.length > 0 || this.transfers.length > 0) {
            this.saveTempExpenses(this.currentDate);
            this.saveTempTransfers(this.currentDate);
            
            // Lưu cả inventory exports nếu có
            if (this.inventoryExports.length > 0) {
                try {
                    const key = `milano_temp_exports_${this.currentDate}`;
                    localStorage.setItem(key, JSON.stringify(this.inventoryExports));
                } catch (error) {
                    console.error('Error auto-saving exports:', error);
                }
            }
            
            console.log('🔄 Auto-save dữ liệu tạm');
        }
    }, 30000); // 30 giây
}
    async loadReportForDate(dateKey) {
    try {
        // Lấy report từ DataManager
        const report = await window.dataManager.getReport(this.formatDateFromFirebase(dateKey));
        
        if (report) {
            console.log(`📊 Loaded report for ${dateKey}:`, report);
            return report;
        }
        
        // Nếu không tìm thấy, kiểm tra trong data trực tiếp
        const displayDate = this.formatDateFromFirebase(dateKey);
        const directReport = window.dataManager.data.reports?.[displayDate];
        
        if (directReport) {
            console.log(`📊 Found direct report for ${displayDate}:`, directReport);
            return directReport;
        }
        
        console.log(`📭 No report found for ${dateKey}`);
        return null;
        
    } catch (error) {
        console.error('Error loading report:', error);
        return null;
    }
}
    
    async getOpeningBalance(dateKey) {
    try {
        const currentDate = this.parseStorageDate(dateKey);
        const previousDate = new Date(currentDate);
        previousDate.setDate(previousDate.getDate() - 1);
        const previousDateKey = this.formatDateForStorage(previousDate);
        const previousDisplayDate = this.formatDateFromFirebase(previousDateKey);
        
        console.log(`🔍 Looking for previous day report: ${previousDisplayDate} (${previousDateKey})`);
        
        // Tìm report của ngày trước trong data
        const allReports = window.dataManager.getReports();
        const previousReport = allReports.find(r => r.date === previousDisplayDate);
        
        if (previousReport) {
            console.log(`✅ Found previous report, closing balance: ${previousReport.closingBalance || 0}`);
            return previousReport.closingBalance || 0;
        }
        
        console.log('📭 No previous report found, using 0');
        return 0;
        
    } catch (error) {
        console.error('Error getting opening balance:', error);
        return 0;
    }
}
    
    getInputDateValue() {
        const [day, month, year] = this.currentDate.split('/');
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    formatLiveInput(input) {
    // 1. Loại bỏ mọi ký tự không phải là số
    let value = input.value.replace(/\D/g, ''); 
    
    // 2. Định dạng lại số tiền (18000 thành 18.000)
    if (value) {
        // Chỉ cần định dạng, KHÔNG thêm '000'
        // Mục đích: giúp người dùng dễ đọc nếu họ nhập số lớn (ví dụ 180000 thành 180.000)
        input.value = parseInt(value).toLocaleString('vi-VN');
    } else {
        input.value = ''; // Giữ input trống nếu người dùng xóa hết
    }
}

// Phương thức HIỆN TẠI (ĐÃ SỬA): Áp dụng quy tắc thêm '000' (dùng cho onblur)
formatCurrency(input) {
    // 1. Loại bỏ mọi ký tự không phải là số
    let value = input.value.replace(/\D/g, ''); 
    
    // ⭐⭐⭐ LOGIC TỰ ĐỘNG THÊM '000' CHỈ ÁP DỤNG Ở ĐÂY ⭐⭐⭐
    // Kiểm tra độ dài: Nếu số nhập vào có 1, 2, hoặc 3 ký tự (vd: 1, 18, 999) và lớn hơn 0
    if (value.length > 0 && value.length <= 5) { // Đã đổi ngưỡng từ 3 thành 5
    value = value + '000'; // Ví dụ: '13000' thành '13000000' -> 13.000.000
}
    
    // 2. Định dạng lại số tiền (ví dụ: 18000 thành 18.000)
    if (value) {
        input.value = parseInt(value).toLocaleString('vi-VN');
    } else {
        input.value = '';
    }
}
    
   getCurrencyValue(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return 0;
    
    const value = input.value.replace(/\D/g, '');
    return parseInt(value) || 0;
}
    async loadReport(date) {
    console.log(`📥 Loading report for date: ${date}`);
    
    // Parse date
    const [day, month, year] = date.split('/');
    const dateKey = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    
    // Cập nhật ngày hiện tại
    this.currentDateKey = dateKey;
    this.currentDate = date;
    
    // ⭐⭐⭐ TRƯỚC KHI RESET: LƯU DỮ LIỆU TẠM CỦA NGÀY HIỆN TẠI NẾU CÓ ⭐⭐⭐
    if (this.expenses.length > 0 || this.transfers.length > 0) {
        this.saveTempExpenses(this.currentDate);
        this.saveTempTransfers(this.currentDate);
        console.log(`💾 Lưu tạm trước khi chuyển ngày: ${this.expenses.length} chi phí, ${this.transfers.length} chuyển khoản`);
    }
    
    // Reset data để tải mới
    this.currentReport = null;
    this.expenses = [];
    this.transfers = [];
    this.inventoryExports = [];
    
    // ⭐⭐⭐ LOAD DỮ LIỆU TẠM TỪ LOCALSTORAGE CHO NGÀY MỚI ⭐⭐⭐
    this.loadTempData(this.currentDate);
    console.log(`📥 Đã tải dữ liệu tạm: ${this.expenses.length} chi phí, ${this.transfers.length} chuyển khoản`);
    
    // Hiển thị loading
    const mainContent = document.getElementById('mainContent');
    if (mainContent) {
        mainContent.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Đang tải báo cáo ngày ${date}...</p>
            </div>
        `;
    }
    
    // Tải và render
    await this.render();
    
    window.showToast(`✅ Đã tải báo cáo ngày ${date}`, 'success');
    
    // Đóng history section nếu đang mở
    const historySection = document.getElementById('historySection');
    if (historySection) {
        historySection.style.display = 'none';
        const toggleIcon = document.getElementById('historyToggle');
        if (toggleIcon) {
            toggleIcon.className = 'fas fa-chevron-down';
        }
    }
}
    // ⭐⭐⭐ THÊM HÀM changeDate() SỬA LẠI ⭐⭐⭐
async changeDate() {
    const dateInput = document.getElementById('reportDate');
    if (!dateInput) return;
    
    const newDateStr = dateInput.value;
    const [year, month, day] = newDateStr.split('-');
    const newDate = `${day}/${month}/${year}`;
    
    console.log(`📅 Changing date from ${this.currentDate} to ${newDate}`);
    
    // ⭐⭐⭐ LƯU DỮ LIỆU TẠM CỦA NGÀY HIỆN TẠI TRƯỚC KHI CHUYỂN ⭐⭐⭐
    if (this.expenses.length > 0 || this.transfers.length > 0) {
        this.saveTempExpenses(this.currentDate);
        this.saveTempTransfers(this.currentDate);
        console.log(`💾 Saved temp data before switching: ${this.expenses.length} expenses, ${this.transfers.length} transfers`);
    }
    
    // Reset dữ liệu hiện tại để load ngày mới
    this.currentDate = newDate;
    this.currentDateKey = newDateStr;
    this.expenses = [];
    this.transfers = [];
    this.inventoryExports = [];
    this.currentReport = null;
    
    // Load report mới
    await this.loadReport(newDate);
}
    
    calculate() {
    const openingBalance = this.getCurrencyValue('openingBalance');
    const actualReceived = this.getCurrencyValue('actualReceived'); // Đổi tên từ 'revenue'
    const closingBalance = this.getCurrencyValue('closingBalance');
    
    const expensesTotal = this.getTotalExpenses();
    const transfersTotal = this.getTotalTransfers();
    
    // Công thức mới: Doanh thu = Thực nhận + Chi phí + Chuyển khoản - Số dư đầu kỳ + Số dư cuối kỳ
    const revenue = actualReceived + expensesTotal + transfersTotal - openingBalance + closingBalance;
    
    const revenueEl = document.getElementById('revenue'); // Giữ tên revenue để hiển thị doanh thu
    if (revenueEl) {
        revenueEl.textContent = `${revenue.toLocaleString()} ₫`;
    }
    
    const actualReceivedEl = document.getElementById('actualReceived');
    if (actualReceivedEl) {
        actualReceivedEl.textContent = `${actualReceived.toLocaleString()} ₫`;
        actualReceivedEl.className = `result-amount ${actualReceived >= 0 ? 'positive' : 'negative'}`;
    }
    
    const expensesTotalEl = document.getElementById('expensesTotal');
    if (expensesTotalEl) {
        expensesTotalEl.textContent = `${expensesTotal.toLocaleString()} ₫`;
    }
    
    const transfersTotalEl = document.getElementById('transfersTotal');
    if (transfersTotalEl) {
        transfersTotalEl.textContent = `${transfersTotal.toLocaleString()} ₫`;
    }
    
    // Lưu giá trị doanh thu đã tính
    this.calculatedRevenue = revenue;
}
   showExpensesModal() {
    // Kiểm tra quyền
    const canEdit = window.authManager?.isAdmin() || 
                   (window.authManager?.isEmployee() && 
                    this.canEmployeeEditReport(this.currentDate));
    
    const modalContent = `
        <div class="modal-header">
            <h2><i class="fas fa-credit-card"></i> CHI PHÍ NGÀY ${this.currentDate}</h2>
            ${!canEdit ? '<span class="view-only-badge">CHỈ XEM</span>' : ''}
            <div class="modal-header-actions">
                ${canEdit ? `
                    <button class="btn-icon" onclick="window.reportsModule.showTransfersModal()" title="Thêm chuyển khoản">
                        <i class="fas fa-university"></i>
                        <span>Chuyển khoản</span>
                    </button>
                ` : ''}
                <button class="modal-close" onclick="closeModal(); window.reportsModule.calculate()">&times;</button>
            </div>
        </div>
        <div class="modal-body compact">
            <!-- Input Section - Chỉ hiển thị nếu có quyền edit -->
            ${canEdit ? `
                <div class="input-grid">
                    <div class="form-group">
                        <label><i class="fas fa-tag"></i> Tên chi phí:</label>
                        <input type="text" id="expenseName" placeholder="Nhập tên chi phí..." class="form-input">
                    </div>
                    
                    <div class="form-group">
    <label><i class="fas fa-money-bill-wave"></i> Số tiền:</label>
    <div class="amount-input-wrapper">
        <input type="text" id="expenseAmount" placeholder="0" 
               oninput="window.reportsModule.formatLiveInput(this)"
               onblur="window.reportsModule.formatCurrency(this)"
               class="form-input">
        <span class="currency">₫</span>
    </div>
</div>
                    
                    <button class="btn-primary btn-add" onclick="window.reportsModule.addExpense()">
                        <i class="fas fa-plus"></i> THÊM
                    </button>
                </div>
            ` : ''}
            
            <!-- Expenses List - Compact -->
            <div class="list-section">
                <div class="section-header">
                    <h3><i class="fas fa-list"></i> DANH SÁCH CHI PHÍ (${this.expenses.length})</h3>
                    <div class="section-total">
                        <span>Tổng:</span>
                        <strong>${this.getTotalExpenses().toLocaleString()} ₫</strong>
                    </div>
                </div>
                
                <div class="compact-list" id="expensesList">
                    ${this.expenses.map((expense, index) => `
                        <div class="compact-item">
                            <div class="item-main">
                                <div class="item-name">${expense.name}</div>
                                <div class="item-amount">${expense.amount.toLocaleString()} ₫</div>
                            </div>
                            ${canEdit ? `
                                <div class="item-actions">
                                    <button class="btn-icon small danger" onclick="window.reportsModule.removeExpense(${index})" title="Xóa">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                    
                    ${this.expenses.length === 0 ? `
                        <div class="empty-state compact">
                            <i class="fas fa-receipt"></i>
                            <p>Chưa có chi phí nào</p>
                        </div>
                    ` : ''}
                </div>
            </div>
            
            <!-- Quick Actions -->
            <div class="quick-actions">
                <button class="btn-secondary" onclick="closeModal(); window.reportsModule.calculate()">
                    <i class="fas fa-check"></i> ĐÓNG
                </button>
            </div>
        </div>
    `;
    
    window.showModal(modalContent);
}
selectExpenseSuggestion(suggestion) {
    const expenseNameInput = document.getElementById('expenseName');
    if (expenseNameInput) {
        expenseNameInput.value = suggestion;
        expenseNameInput.focus();
    }
}

selectTransferSuggestion(suggestion) {
    const transferContentInput = document.getElementById('transferContent');
    if (transferContentInput) {
        transferContentInput.value = suggestion;
        transferContentInput.focus();
    }
}
showTransfersModal() {
    // Kiểm tra quyền
    const canEdit = window.authManager?.isAdmin() || 
                   (window.authManager?.isEmployee() && 
                    this.canEmployeeEditReport(this.currentDate));
    
    const suggestionsHTML = this.transferSuggestions.map(suggestion => 
        `<div class="suggestion-item" onclick="window.reportsModule.selectTransferSuggestion('${suggestion.replace(/'/g, "\\'")}')">
            ${suggestion}
        </div>`
    ).join('');

    const modalContent = `
        <div class="modal-header">
            <h2><i class="fas fa-university"></i> CHUYỂN KHOẢN NGÀY ${this.currentDate}</h2>
            ${!canEdit ? '<span class="view-only-badge">CHỈ XEM</span>' : ''}
            <div class="modal-header-actions">
                ${canEdit ? `
                    <!-- Nút chuyển nhanh: mở popup CHI PHÍ -->
                    <button class="btn-icon" onclick="closeModal(); window.reportsModule.showExpensesModal()" title="Mở Chi phí">
                        <i class="fas fa-credit-card"></i>
                        <span>Chi phí</span>
                    </button>
                ` : ''}

                <button class="modal-close" onclick="closeModal(); window.reportsModule.calculate()">&times;</button>
            </div>
        </div>

        <div class="modal-body compact">

            <!-- Input Section - Grid Layout - Chỉ hiển thị nếu có quyền -->
            ${canEdit ? `
                <div class="input-grid">
                    <div class="form-group">
                        <label><i class="fas fa-tag"></i> Nội dung chuyển khoản:</label>
                        <input type="text" id="transferContent" placeholder="Tiết kiệm, trả nợ..." class="form-input">
                    </div>

                    <div class="form-group">
    <label><i class="fas fa-money-bill-wave"></i> Số tiền:</label>
    <div class="amount-input-wrapper">
        <input type="text" id="transferAmount" placeholder="0"
               oninput="window.reportsModule.formatLiveInput(this)" 
               onblur="window.reportsModule.formatCurrency(this)" 
               class="form-input">
    </div>
</div>

                    <button class="btn-primary btn-add" onclick="window.reportsModule.addTransfer()">
                        <i class="fas fa-plus"></i> THÊM
                    </button>
                </div>
            ` : ''}

            <!-- Transfers List - Compact -->
            <div class="list-section">
                <div class="section-header">
                    <h3><i class="fas fa-list"></i> DANH SÁCH CHUYỂN KHOẢN (${this.transfers.length})</h3>
                    <div class="section-total">
                        <span>Tổng:</span>
                        <strong>${this.getTotalTransfers().toLocaleString()} ₫</strong>
                    </div>
                </div>

                <div class="compact-list" id="transfersList">
                    ${this.transfers.map((transfer, index) => `
                        <div class="compact-item">
                            <div class="item-main">
                                <div class="item-name">${transfer.content || 'Không có nội dung'}</div>
                                <div class="item-amount">${transfer.amount.toLocaleString()} ₫</div>
                            </div>
                            ${canEdit ? `
                                <div class="item-actions">
                                    <button class="btn-icon small danger" 
                                        onclick="window.reportsModule.removeTransfer(${index})" title="Xóa">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}

                    ${this.transfers.length === 0 ? `
                        <div class="empty-state compact">
                            <i class="fas fa-exchange-alt"></i>
                            <p>Chưa có chuyển khoản nào</p>
                        </div>
                    ` : ''}
                </div>
            </div>

            <!-- Quick Actions -->
            <div class="quick-actions">
                <button class="btn-secondary" onclick="closeModal(); window.reportsModule.calculate()">
                    <i class="fas fa-check"></i> ĐÓNG
                </button>
            </div>

        </div>
    `;

    window.showModal(modalContent);
}
// Thêm vào class ReportsModule
getLatestReportDate() {
    try {
        const allReports = window.dataManager.getReports();
        if (!allReports || allReports.length === 0) {
            console.log('📭 Không có báo cáo nào trong hệ thống');
            return null;
        }
        
        // Lọc ra các báo cáo hợp lệ (có date)
        const validReports = allReports.filter(report => {
            return report && 
                   report.date && 
                   typeof report.date === 'string' && 
                   report.date.trim() !== '';
        });
        
        if (validReports.length === 0) {
            console.log('📭 Không có báo cáo hợp lệ (có date)');
            return null;
        }
        
        // Chỉ lấy báo cáo trong 2 ngày gần nhất
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        // Filter chỉ lấy báo cáo của hôm nay và hôm qua
        const recentReports = validReports.filter(report => {
            try {
                const reportDate = this.parseDisplayDate(report.date);
                reportDate.setHours(0, 0, 0, 0);
                
                const todayDate = new Date(today);
                todayDate.setHours(0, 0, 0, 0);
                
                const yesterdayDate = new Date(yesterday);
                yesterdayDate.setHours(0, 0, 0, 0);
                
                return reportDate.getTime() === todayDate.getTime() || 
                       reportDate.getTime() === yesterdayDate.getTime();
            } catch (error) {
                return false;
            }
        });
        
        if (recentReports.length === 0) {
            console.log('📭 Không có báo cáo trong 2 ngày gần nhất');
            return null;
        }
        
        // Sắp xếp theo ngày mới nhất
        const sortedReports = [...recentReports].sort((a, b) => {
            try {
                const dateA = this.parseDisplayDate(a.date);
                const dateB = this.parseDisplayDate(b.date);
                return dateB - dateA; // Mới nhất lên đầu
            } catch (error) {
                return 0;
            }
        });
        
        const latestDate = sortedReports[0]?.date;
        console.log(`📅 Báo cáo gần nhất trong 2 ngày: ${latestDate}`);
        return latestDate;
        
    } catch (error) {
        console.error('❌ Lỗi khi lấy báo cáo gần nhất:', error);
        return null;
    }
}

canEmployeeEditReport(date) {
    if (!window.authManager) return false;
    
    // Admin có toàn quyền
    if (window.authManager.isAdmin()) {
        return true;
    }
    
    // Nhân viên chỉ được sửa báo cáo của NGÀY HIỆN TẠI hoặc HÔM QUA
    if (window.authManager.isEmployee()) {
        return this.isTodayOrYesterdayReport(date);
    }
    
    return false;
}

canEmployeeDeleteReport(date) {
    if (!window.authManager) return false;
    
    // Admin có toàn quyền
    if (window.authManager.isAdmin()) {
        return true;
    }
    
    // Nhân viên chỉ được xóa báo cáo của NGÀY HIỆN TẠI hoặc HÔM QUA
    if (window.authManager.isEmployee()) {
        return this.isTodayOrYesterdayReport(date);
    }
    
    return false;
}

// Kiểm tra xem date có phải là hôm nay hoặc hôm qua không
isTodayOrYesterdayReport(date) {
    try {
        const reportDate = this.parseDisplayDate(date);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        // Reset giờ để so sánh ngày
        reportDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        yesterday.setHours(0, 0, 0, 0);
        
        // So sánh với hôm nay hoặc hôm qua
        const isToday = reportDate.getTime() === today.getTime();
        const isYesterday = reportDate.getTime() === yesterday.getTime();
        
        console.log(`📅 Kiểm tra ngày: ${date}`, {
            reportDate,
            today,
            yesterday,
            isToday,
            isYesterday
        });
        
        return isToday || isYesterday;
        
    } catch (error) {
        console.error('❌ Lỗi kiểm tra ngày:', error);
        return false;
    }
}


    getTotalExpenses() {
    if (!this.expenses || !Array.isArray(this.expenses)) {
        return 0;
    }
    return this.expenses.reduce((sum, expense) => {
        const amount = expense.amount || 0;
        return sum + (typeof amount === 'number' ? amount : parseInt(amount) || 0);
    }, 0);
}

getTotalTransfers() {
    if (!this.transfers || !Array.isArray(this.transfers)) {
        return 0;
    }
    return this.transfers.reduce((sum, transfer) => {
        const amount = transfer.amount || 0;
        return sum + (typeof amount === 'number' ? amount : parseInt(amount) || 0);
    }, 0);
}
  
    toggleInventory() {
        const section = document.getElementById('inventorySection');
        const toggleIcon = document.getElementById('inventoryToggle');
        
        if (section.style.display === 'none') {
            section.style.display = 'block';
            toggleIcon.className = 'fas fa-chevron-up';
            this.renderInventorySection();
        } else {
            section.style.display = 'none';
            toggleIcon.className = 'fas fa-chevron-down';
        }
    }
// SỬA: Hàm toggle export - click vào bất kỳ đâu trong hàng đều tăng (trừ nút giảm)
toggleExport(index) {
    const products = window.dataManager.getInventoryProducts();
    if (index >= products.length) return;
    
    const product = products[index];
    const exportItemIndex = this.inventoryExports.findIndex(item => item.productId === product.id);
    
    if (exportItemIndex >= 0) {
        // Nếu đã có, tăng thêm 1
        const currentQty = this.inventoryExports[exportItemIndex].quantity;
        
        if (currentQty < product.quantity) {
            this.inventoryExports[exportItemIndex].quantity++;
            window.showToast(`${product.name}: ${currentQty + 1}`, 'success');
        } else {
            window.showToast(`Không đủ tồn kho cho ${product.name}`, 'warning');
        }
    } else {
        // Nếu chưa có, thêm mới với số lượng 1
        const now = new Date();
        const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        this.inventoryExports.push({
            id: Date.now(),
            productId: product.id,
            product: product.name,
            quantity: 1,
            unit: product.unit,
            time: time,
            date: this.currentDateKey
        });
        
        window.showToast(`Đã thêm ${product.name}`, 'success');
    }
    
    this.updateInventoryUI();
    this.renderInventorySection(); // Refresh UI
}

// HÀM MỚI: Xử lý click giảm với event.stopPropagation
decreaseExport(index, event) {
    if (event) {
        event.stopPropagation(); // Ngăn không cho event bubble lên
    }
    
    const products = window.dataManager.getInventoryProducts();
    if (index >= products.length) return;
    
    const product = products[index];
    const exportItemIndex = this.inventoryExports.findIndex(item => item.productId === product.id);
    
    if (exportItemIndex >= 0) {
        const currentQty = this.inventoryExports[exportItemIndex].quantity;
        
        if (currentQty > 1) {
            this.inventoryExports[exportItemIndex].quantity--;
            window.showToast(`${product.name}: ${currentQty - 1}`, 'info');
        } else {
            // Nếu số lượng là 1, xóa khỏi danh sách
            this.inventoryExports.splice(exportItemIndex, 1);
            window.showToast(`Đã xóa ${product.name}`, 'success');
        }
        
        this.updateInventoryUI();
        this.renderInventorySection();
    }
}



renderInventorySection() {
    const section = document.getElementById('inventorySection');
    if (!section) return;
    
    const products = window.dataManager.getInventoryProducts();
    
    if (products.length === 0) {
        section.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-box-open"></i>
                <p>Chưa có sản phẩm trong kho</p>
                <button class="btn-secondary" onclick="showTab('inventory')">
                    <i class="fas fa-plus"></i> Thêm sản phẩm
                </button>
            </div>
        `;
        return;
    }
    
    section.innerHTML = `
        
            
            <div class="inventory-table-simple">
                <div class="table-header-simple">
                    <div class="header-cell name">TÊN HÀNG HÓA</div>
                    <div class="header-cell stock">TỒN</div>
                    <div class="header-cell export">XUẤT</div>
                    <div class="header-cell action">GIẢM</div>
                </div>
                
                <div class="table-body-simple">
                    ${products.map((product, index) => {
                        const exportItem = this.inventoryExports.find(item => item.productId === product.id);
                        const exportQty = exportItem ? exportItem.quantity : 0;
                        
                        return `
                            <div class="table-row-simple clickable-row" 
                                 onclick="window.reportsModule.toggleExport(${index})"
                                 data-index="${index}">
                                
                                <div class="cell name">
                                    <span class="product-name">${product.name}</span>
                                    <small class="product-unit">${product.unit}</small>
                                </div>
                                
                                <div class="cell stock clickable-cell">
                                    <span class="stock-value">${product.quantity}</span>
                                </div>
                                
                                <div class="cell export clickable-cell">
                                    <div class="export-display ${exportQty > 0 ? 'active' : ''}">
                                        ${exportQty > 0 ? exportQty : '0'}
                                    </div>
                                </div>
                                
                                <div class="cell action" onclick="event.stopPropagation()">
                                    <button class="decrease-btn" 
                                            onclick="window.reportsModule.decreaseExport(${index}, event)"
                                            ${exportQty <= 0 ? 'disabled' : ''}>
                                        <i class="fas fa-minus"></i>
                                    </button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
            
            
    `;
}

  

    
    toggleHistory() {
        const section = document.getElementById('historySection');
        const toggleIcon = document.getElementById('historyToggle');
        
        if (section.style.display === 'none') {
            section.style.display = 'block';
            toggleIcon.className = 'fas fa-chevron-up';
            this.renderHistorySection();
        } else {
            section.style.display = 'none';
            toggleIcon.className = 'fas fa-chevron-down';
        }
    }
    async renderHistorySection() {
    const section = document.getElementById('historySection');
    if (!section) return;
    
    const allReports = window.dataManager.getReports();
    
    if (!Array.isArray(allReports) || allReports.length === 0) {
        section.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-history"></i>
                <p>Chưa có báo cáo nào</p>
            </div>
        `;
        return;
    }
    
    // Nhóm báo cáo theo ngày (lấy phiên bản mới nhất mỗi ngày)
    const reportsByDate = {};
    allReports.forEach(report => {
        if (!report || !report.date) return;
        
        const date = report.date;
        if (!reportsByDate[date] || 
            (report.savedAt && reportsByDate[date].savedAt && 
             new Date(report.savedAt) > new Date(reportsByDate[date].savedAt))) {
            reportsByDate[date] = report;
        }
    });
    
    // Chuyển thành mảng và sắp xếp theo ngày mới nhất
    const sortedReports = Object.values(reportsByDate)
        .sort((a, b) => {
            const dateA = this.parseDisplayDate(a.date);
            const dateB = this.parseDisplayDate(b.date);
            return dateB - dateA;
        });
    
    // Lấy báo cáo gần nhất
    const latestDate = this.getLatestReportDate();
    
    section.innerHTML = `
        <div class="history-list">
            ${sortedReports.map(report => {
                if (!report) return '';
                
                const expensesTotal = report.expenses ? 
                    report.expenses.reduce((sum, e) => sum + (e.amount || 0), 0) : 0;
                const transfersTotal = report.transfers ?
                    report.transfers.reduce((sum, t) => sum + (t.amount || 0), 0) : 0;
                
                const inventoryTotal = report.inventoryExports ?
                    report.inventoryExports.reduce((sum, i) => sum + (i.quantity || 0), 0) : 0;
                
                // Format savedAt time
                let savedTime = '';
                if (report.savedAt) {
                    try {
                        const date = new Date(report.savedAt);
                        savedTime = date.toLocaleTimeString('vi-VN', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                        });
                    } catch (e) {
                        savedTime = '';
                    }
                }
                
                // Kiểm tra có phải báo cáo gần nhất không
                const isLatest = report.date === latestDate;
                
                // KIỂM TRA QUYỀN HIỂN THỊ NÚT XÓA
                const canDelete = window.authManager?.isAdmin() || 
                    (window.authManager?.isEmployee() && isLatest);
                
                return `
                    <div class="history-item ${isLatest ? 'latest-report' : ''}">
                        <div class="history-header">
                            <span class="history-date">
                                📅 ${report.date}
                                ${isLatest ? '<span class="latest-badge">GẦN NHẤT</span>' : ''}
                            </span>
                            ${savedTime ? `<span class="history-time">${savedTime}</span>` : ''}
                            <div class="history-actions">
                                <button class="btn-small" onclick="window.reportsModule.loadReport('${report.date}')">
                                    <i class="fas fa-eye"></i> Xem
                                </button>
                                ${canDelete ? `
                                    <button class="btn-small danger" onclick="window.reportsModule.deleteReportFirebase('${report.date}')">
                                        <i class="fas fa-trash"></i> Xóa
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                        
                        <div class="history-summary">
                            <div class="summary-item">
                                <i class="fas fa-money-bill-wave"></i>
                                <div>
                                    <small>Doanh thu</small>
                                    <strong>${(report.revenue || 0).toLocaleString()} ₫</strong>
                                </div>
                            </div>
                            <div class="summary-item">
                                <i class="fas fa-credit-card"></i>
                                <div>
                                    <small>Chi phí</small>
                                    <strong>${expensesTotal.toLocaleString()} ₫</strong>
                                </div>
                            </div>
                            <div class="summary-item">
                                <i class="fas fa-university"></i>
                                <div>
                                    <small>Chuyển khoản</small>
                                    <strong>${transfersTotal.toLocaleString()} ₫</strong>
                                </div>
                            </div>
                            <div class="summary-item">
                                <i class="fas fa-hand-holding-usd"></i>
                                <div>
                                    <small>Thực nhận</small>
                                    <strong class="${(report.actualReceived || 0) >= 0 ? 'positive' : 'negative'}">
                                        ${(report.actualReceived || 0).toLocaleString()} ₫
                                    </strong>
                                </div>
                            </div>
                        </div>
                        
                        ${report.inventoryExports && report.inventoryExports.length > 0 ? `
                            <div class="inventory-summary">
                                <div class="inventory-header">
                                    <h4><i class="fas fa-boxes"></i> Xuất kho (${inventoryTotal} sản phẩm)</h4>
                                </div>
                                <div class="inventory-details">
                                    ${report.inventoryExports.map((item, index) => `
                                        <div class="export-detail">
                                            <span class="export-product">${item.product || 'N/A'}</span>
                                            <span class="export-quantity">${item.quantity} ${item.unit || ''}</span>
                                        </div>
                                    `).join('')}
                                    ${report.inventoryExports.length > 5 ? `
                                        <div class="more-items">
                                            <i class="fas fa-ellipsis-h"></i>
                                            ${report.inventoryExports.length - 5} sản phẩm khác
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        ` : ''}
                        
                        <div class="history-footer">
                            <small>
                                ${report.savedBy ? `Người lưu: ${report.savedBy} • ` : ''}
                                ${report.savedAt ? `Lưu: ${new Date(report.savedAt).toLocaleString('vi-VN')}` : ''}
                            </small>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}
async restoreVersion(date, versionIndex) {
    if (!confirm(`Bạn có chắc muốn khôi phục phiên bản này?\nBáo cáo hiện tại sẽ bị ghi đè.`)) {
        return;
    }
    
    try {
        const allReports = window.dataManager.getReports('01/01/2024', '31/12/2025');
        const reportsForDate = allReports.filter(r => r.date === date);
        
        if (versionIndex >= 0 && versionIndex < reportsForDate.length) {
            const versionToRestore = reportsForDate[versionIndex];
            
            // Lưu lại phiên bản hiện tại trước
            const currentReport = window.dataManager.data.reports[date];
            if (currentReport) {
                const backupKey = `milano_report_backup_${date}_${Date.now()}`;
                localStorage.setItem(backupKey, JSON.stringify(currentReport));
            }
            
            // Cập nhật với phiên bản cũ
            const success = await window.dataManager.saveLocal(
                'reports',
                `${this.formatDateForFirebase(date)}.json`,
                versionToRestore,
                `Khôi phục phiên bản ${versionToRestore.version || (versionIndex + 1)} ngày ${date}`
            );
            
            if (success) {
                window.showToast(`✅ Đã khôi phục phiên bản ngày ${date}`, 'success');
                closeModal();
                
                // Nếu đang xem report này, reload
                if (this.currentDate === date) {
                    await this.loadReport(date);
                }
                
                // Refresh history
                this.renderHistorySection();
            }
        }
    } catch (error) {
        console.error('Error restoring version:', error);
        window.showToast('Lỗi khi khôi phục phiên bản', 'error');
    }
}
// Thêm phương thức xem các phiên bản
showReportVersions(date) {
    const allReports = window.dataManager.getReports('01/01/2024', '31/12/2025');
    const reportsForDate = allReports.filter(r => r.date === date);
    
    const modalContent = `
        <div class="modal-header">
            <h2><i class="fas fa-history"></i> Phiên bản báo cáo ngày ${date}</h2>
            <button class="modal-close" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div class="versions-list">
                ${reportsForDate.map((report, index) => {
                    const expensesTotal = report.expenses ? 
                        report.expenses.reduce((sum, e) => sum + (e.amount || 0), 0) : 0;
                    const transfersTotal = report.transfers ?
                        report.transfers.reduce((sum, t) => sum + (t.amount || 0), 0) : 0;
                    
                    return `
                        <div class="version-item ${index === reportsForDate.length - 1 ? 'latest' : ''}">
                            <div class="version-header">
                                <div>
                                    <strong>Phiên bản ${report.version || (index + 1)}</strong>
                                    <small>${new Date(report.savedAt).toLocaleString('vi-VN')}</small>
                                </div>
                                <div class="version-actions">
                                    ${index === reportsForDate.length - 1 ? 
                                        '<span class="badge">Mới nhất</span>' : 
                                        `<button class="btn-icon" onclick="window.reportsModule.restoreVersion('${date}', ${index})">
                                            <i class="fas fa-undo"></i> Khôi phục
                                        </button>`
                                    }
                                </div>
                            </div>
                            <div class="version-details">
                                <div>Doanh thu: ${(report.revenue || 0).toLocaleString()} ₫</div>
                                <div>Chi phí: ${expensesTotal.toLocaleString()} ₫</div>
                                <div>Chuyển khoản: ${transfersTotal.toLocaleString()} ₫</div>
                                <div>Thực nhận: ${(report.actualReceived || 0).toLocaleString()} ₫</div>
                                <div>Xuất kho: ${report.inventoryExports?.length || 0} sản phẩm</div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
    
    window.showModal(modalContent);
}

    

    addTransfer() {
    const contentInput = document.getElementById('transferContent');
    const amountInput = document.getElementById('transferAmount');
    
    const content = contentInput.value.trim();
    const amount = parseInt(amountInput.value.replace(/\D/g, '') || 0);
    
    if (amount < 0) {
        window.showToast('Số tiền không hợp lệ', 'warning');
        amountInput.focus();
        return;
    }
    
    if (content) {
        this.addTransferSuggestion(content);
    }
    
    // ★ ĐẢO NGƯỢC: thêm vào đầu danh sách
    this.transfers.unshift({ 
        id: Date.now(),
        content: content || 'Không có nội dung', 
        amount,
        date: this.currentDate,
        addedAt: new Date().toISOString(),
        suggestionUsed: true
    });
    
    // ⭐⭐⭐ LƯU TẠM VÀO LOCALSTORAGE ⭐⭐⭐
    this.saveTempTransfers(this.currentDate);
    
    contentInput.value = '';
    amountInput.value = '';
    
    this.showTransfersModal();
    this.calculate();
    
    window.showToast(`Đã thêm chuyển khoản cho ngày ${this.currentDate}`, 'success');
} 

addExpense() {
    const nameInput = document.getElementById('expenseName');
    const amountInput = document.getElementById('expenseAmount');
    
    const name = nameInput.value.trim();
    const amount = parseInt(amountInput.value.replace(/\D/g, '') || 0);
    
    if (!name) {
        window.showToast('Vui lòng nhập tên chi phí', 'warning');
        nameInput.focus();
        return;
    }
    
    if (amount <= 0) {
        window.showToast('Vui lòng nhập số tiền', 'warning');
        amountInput.focus();
        return;
    }
    
    // Lưu suggestions
    this.addExpenseSuggestion(name);
    
    // ★ ĐẢO NGƯỢC: thêm vào đầu danh sách
    this.expenses.unshift({ 
        id: Date.now(),
        name, 
        amount,
        date: this.currentDate,
        addedAt: new Date().toISOString(),
        suggestionUsed: true
    });
    
    // ⭐⭐⭐ LƯU TẠM VÀO LOCALSTORAGE ⭐⭐⭐
    this.saveTempExpenses(this.currentDate);
    
    nameInput.value = '';
    amountInput.value = '';
    
    this.showExpensesModal();
    this.calculate();
    
    window.showToast(`Đã thêm chi phí cho ngày ${this.currentDate}`, 'success');
}

removeExpense(index) {
    const expense = this.expenses[index];
    this.expenses.splice(index, 1);
    
    // ⭐⭐⭐ CẬP NHẬT LOCALSTORAGE ⭐⭐⭐
    this.saveTempExpenses(this.currentDate);
    
    this.showExpensesModal();
    this.calculate();
    
    window.showToast(`Đã xóa chi phí: ${expense.name}`, 'success');
}

removeTransfer(index) {
    const transfer = this.transfers[index];
    this.transfers.splice(index, 1);
    
    // ⭐⭐⭐ CẬP NHẬT LOCALSTORAGE ⭐⭐⭐
    this.saveTempTransfers(this.currentDate);
    
    this.showTransfersModal();
    this.calculate();
    
    window.showToast(`Đã xóa chuyển khoản: ${transfer.content}`, 'success');
}

// ⭐⭐⭐ THÊM CÁC HÀM LƯU TẠM ⭐⭐⭐
saveTempExpenses(date) {
    try {
        const key = `milano_temp_expenses_${date}`;
        localStorage.setItem(key, JSON.stringify(this.expenses));
        console.log(`💾 Lưu tạm ${this.expenses.length} chi phí cho ngày ${date}`);
    } catch (error) {
        console.error('❌ Lỗi lưu tạm chi phí:', error);
    }
}

saveTempTransfers(date) {
    try {
        const key = `milano_temp_transfers_${date}`;
        localStorage.setItem(key, JSON.stringify(this.transfers));
        console.log(`💾 Lưu tạm ${this.transfers.length} chuyển khoản cho ngày ${date}`);
    } catch (error) {
        console.error('❌ Lỗi lưu tạm chuyển khoản:', error);
    }
}

loadTempData(date) {
    try {
        const expenseKey = `milano_temp_expenses_${date}`;
        const transferKey = `milano_temp_transfers_${date}`;
        
        const tempExpenses = localStorage.getItem(expenseKey);
        const tempTransfers = localStorage.getItem(transferKey);
        
        if (tempExpenses) {
            const parsed = JSON.parse(tempExpenses);
            if (Array.isArray(parsed)) {
                this.expenses = parsed;
                console.log(`📥 Tải ${this.expenses.length} chi phí tạm cho ngày ${date}`);
            }
        }
        
        if (tempTransfers) {
            const parsed = JSON.parse(tempTransfers);
            if (Array.isArray(parsed)) {
                this.transfers = parsed;
                console.log(`📥 Tải ${this.transfers.length} chuyển khoản tạm cho ngày ${date}`);
            }
        }
        
        // Kiểm tra nếu không có dữ liệu tạm, kiểm tra xem có pending exports không
        const pendingExportsKey = `milano_temp_exports_${date}`;
        const tempExports = localStorage.getItem(pendingExportsKey);
        if (tempExports) {
            const parsed = JSON.parse(tempExports);
            if (Array.isArray(parsed)) {
                this.inventoryExports = parsed;
                console.log(`📥 Tải ${this.inventoryExports.length} hàng xuất tạm cho ngày ${date}`);
            }
        }
        
    } catch (error) {
        console.error('❌ Lỗi tải dữ liệu tạm:', error);
        // Nếu lỗi, reset về mảng rỗng
        this.expenses = [];
        this.transfers = [];
        this.inventoryExports = [];
    }
}

clearTempData(date) {
    try {
        localStorage.removeItem(`milano_temp_expenses_${date}`);
        localStorage.removeItem(`milano_temp_transfers_${date}`);
        localStorage.removeItem(`milano_temp_exports_${date}`);
        console.log(`🧹 Xóa dữ liệu tạm ngày ${date}`);
    } catch (error) {
        console.error('❌ Lỗi xóa dữ liệu tạm:', error);
    }
}
    
    autoSave() {
    // Tự động lưu mỗi 30 giây
    setInterval(() => {
        if (this.expenses.length > 0 || this.transfers.length > 0) {
            this.saveTempExpenses(this.currentDate);
            this.saveTempTransfers(this.currentDate);
            console.log('🔄 Auto-save dữ liệu tạm');
        }
    }, 30000); // 30 giây
}
updateInventoryCount() {
    // Cập nhật số lượng chờ xuất (luôn là 0 sau khi lưu)
    const inventoryCount = document.getElementById('inventoryCount');
    if (inventoryCount) {
        inventoryCount.textContent = `0 sản phẩm`;
    }
    
    const pendingExports = document.getElementById('pendingExports');
    if (pendingExports) {
        pendingExports.textContent = '0';
    }
    
    // Cập nhật danh sách chờ xuất
    const exportDetails = document.getElementById('exportDetails');
    if (exportDetails) {
        if (this.inventoryExports.length === 0) {
            exportDetails.innerHTML = `
                <div class="empty-state small">
                    <p>Đã xuất kho thành công</p>
                </div>
            `;
        }
    }
    
    // Reset counter trong product list
    const products = window.dataManager.getInventoryProducts();
    if (products && Array.isArray(products)) {
        products.forEach((product, index) => {
            const qtySpan = document.getElementById(`exportQty${index}`);
            if (qtySpan) {
                qtySpan.textContent = '0';
            }
        });
    }
}
resetAfterSave() {
    console.log('🔄 Resetting data after save...');
    
    // 1. Reset inventory exports (QUAN TRỌNG: phải reset sau khi lưu)
    this.inventoryExports = [];
    
    // 2. Reset expenses và transfers nếu muốn
    // this.expenses = [];
    // this.transfers = [];
    
    // 3. Cập nhật UI ngay lập tức
    this.updateInventoryUI();
    
    console.log('✅ Data reset completed');
}

updateInventoryUI() {
    // Cập nhật số lượng chờ xuất
    const inventoryCount = document.getElementById('inventoryCount');
    if (inventoryCount) {
        inventoryCount.textContent = `${this.inventoryExports.length} sản phẩm`;
    }
    
    // Cập nhật pending exports
    const pendingExports = document.getElementById('pendingExports');
    if (pendingExports) {
        pendingExports.textContent = this.inventoryExports.length;
    }
    
    // Cập nhật export details
    const exportDetails = document.getElementById('exportDetails');
    if (exportDetails && document.getElementById('inventorySection')?.style.display !== 'none') {
        if (this.inventoryExports.length === 0) {
            exportDetails.innerHTML = `
                <div class="empty-state small">
                    <p>Chưa có sản phẩm nào chờ xuất</p>
                </div>
            `;
        } else {
            exportDetails.innerHTML = this.inventoryExports.map((item, index) => `
                <div class="export-item">
                    <i class="fas fa-clock"></i>
                    <span>${item.time} - ${item.product} - ${item.quantity} ${item.unit}</span>
                    <button class="btn-icon small" onclick="window.reportsModule.removeExport(${index})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `).join('');
        }
    }
    
    // Reset counter trong product list
    const products = window.dataManager.getInventoryProducts();
    products.forEach((product, index) => {
        const qtySpan = document.getElementById(`exportQty${index}`);
        if (qtySpan) {
            qtySpan.textContent = '0';
        }
    });
}
removeExport(index) {
    if (index >= 0 && index < this.inventoryExports.length) {
        const item = this.inventoryExports[index];
        this.inventoryExports.splice(index, 1);
        
        this.updateInventoryUI();
        
        window.showToast(`Đã xóa ${item.product} khỏi danh sách chờ xuất`, 'success');
    }
}
async processInventoryExports() {
    try {
        if (this.inventoryExports.length === 0) {
            return true;
        }
        
        // Lấy dữ liệu kho hiện tại
        const products = window.dataManager.getInventoryProducts();
        
        // Tạo bản sao để cập nhật
        const updatedProducts = [...products];
        let hasChanges = false;
        
        console.log(`📦 Processing ${this.inventoryExports.length} inventory exports`);
        
        // Kiểm tra và trừ tồn kho
        for (const exportItem of this.inventoryExports) {
            const productIndex = updatedProducts.findIndex(p => p.id === exportItem.productId);
            
            if (productIndex === -1) {
                window.showToast(`Không tìm thấy sản phẩm: ${exportItem.product}`, 'error');
                return false;
            }
            
            const product = updatedProducts[productIndex];
            
            if (product.quantity < exportItem.quantity) {
                window.showToast(`❌ Không đủ hàng tồn kho cho ${product.name}`, 'error');
                return false;
            }
            
            // Trừ tồn kho
            const newQuantity = product.quantity - exportItem.quantity;
            updatedProducts[productIndex] = {
                ...product,
                quantity: newQuantity,
                lastUpdated: new Date().toISOString(),
                history: [
                    ...(product.history || []),
                    {
                        type: 'export',
                        date: this.currentDateKey,
                        quantity: exportItem.quantity,
                        note: `Xuất kho ngày ${this.currentDate}`,
                        timestamp: new Date().toISOString(),
                        reportDate: this.currentDate
                    }
                ]
            };
            
            hasChanges = true;
            
            // Cập nhật export item với thông tin đầy đủ
            exportItem.unitPrice = product.price || product.unitPrice || 0;
            exportItem.totalValue = exportItem.quantity * (product.price || product.unitPrice || 0);
            exportItem.productCode = product.code || product.productCode || '';
            exportItem.processed = true;
            exportItem.processedAt = new Date().toISOString();
        }
        
        if (hasChanges) {
            // Cập nhật dữ liệu trong DataManager
            window.dataManager.data.inventory.products = updatedProducts;
            
            // LƯU KHO VÀO FIREBASE THÔNG QUA DATA MANAGER
            const inventoryData = { products: updatedProducts };
            await window.dataManager.saveLocal(
                'inventory',
                'products.json',
                inventoryData,
                `Xuất kho ngày ${this.currentDate} - ${this.inventoryExports.length} sản phẩm`
            );
            
            // **CẬP NHẬT UI NGAY LẬP TỨC**
            this.updateInventoryCount();
            
            console.log(`✅ Đã xuất kho ${this.inventoryExports.length} sản phẩm`);
            return true;
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Error processing inventory exports:', error);
        window.showToast(`Lỗi khi xuất kho: ${error.message}`, 'error');
        return false;
    }
}
    async deleteReportFirebase(date) {
    console.log(`🗑️ Delete request for date: ${date}`);
    
    // 1. KIỂM TRA QUYỀN - NHÂN VIÊN CHỈ ĐƯỢC XÓA BÁO CÁO GẦN NHẤT
    if (window.authManager && window.authManager.isEmployee()) {
        console.log(`🔐 Employee trying to delete report ${date}`);
        
        if (!this.canEmployeeDeleteReport(date)) {
            const latestDate = this.getLatestReportDate();
            window.showToast(`Chỉ được xóa báo cáo gần nhất (${latestDate})`, 'warning');
            return;
        }
    }
    
    // 2. Hiển thị confirm dialog
    if (!confirm(`Bạn có chắc muốn xóa báo cáo ngày ${date}?\n\n⚠️ Cảnh báo: Hàng hóa đã xuất sẽ được hoàn trả vào kho!`)) return;
    
    try {
        console.log(`🗑️ Deleting report for date: ${date}`);
        
        // 3. Tìm report trong dataManager
        const displayDate = date; // date đã là dd/mm/yyyy
        const dateKey = this.formatDateForFirebase(date);
        
        console.log(`🔍 Looking for report: ${displayDate} (key: ${dateKey})`);
        
        // Tìm trong dataManager
        let report = window.dataManager.data.reports?.[displayDate];
        
        if (!report) {
            // Thử tìm trong getReports()
            const allReports = window.dataManager.getReports();
            const foundReport = allReports.find(r => r.date === displayDate);
            
            if (!foundReport) {
                window.showToast('Không tìm thấy báo cáo', 'error');
                console.error('Report not found in data:', window.dataManager.data.reports);
                return;
            }
            
            report = foundReport;
        }
        
        console.log('📊 Found report to delete:', report);
        
        // 4. Hoàn trả hàng hóa vào kho nếu có xuất kho
        if (report.inventoryExports && report.inventoryExports.length > 0) {
            console.log(`🔄 Restoring ${report.inventoryExports.length} items to inventory`);
            
            const restoreSuccess = await this.restoreInventoryFromReportFirebase(report);
            if (!restoreSuccess) {
                window.showToast('Không thể hoàn trả hàng hóa', 'error');
                return;
            }
            
            window.showToast(`↩️ Đã hoàn trả ${report.inventoryExports.length} sản phẩm vào kho`, 'info');
        }
        
        // 5. Xóa report khỏi DataManager
        delete window.dataManager.data.reports[displayDate];
        
        // Lưu local data ngay lập tức
        window.dataManager.saveLocalData();
        
        // 6. Thêm vào queue để xóa từ Firebase (gửi null để xóa)
        await window.dataManager.saveLocal(
            'reports',
            `${dateKey}.json`,
            null, // gửi null để xóa
            `Xóa báo cáo ngày ${date}`
        );
        
        window.showToast(`✅ Đã xóa báo cáo ngày ${date}`, 'success');
        
        // 7. Refresh UI nếu đang xem report đó
        if (this.currentDate === date) {
            console.log(`🔄 Current report deleted, resetting view...`);
            this.currentReport = null;
            this.expenses = [];
            this.transfers = [];
            this.inventoryExports = [];
            await this.render();
        }
        
        // 8. Refresh lịch sử
        this.renderHistorySection();
        
    } catch (error) {
        console.error('❌ Error deleting report:', error);
        window.showToast('Lỗi khi xóa báo cáo', 'error');
    }
}
async restoreInventoryFromReportFirebase(report) {
    try {
        if (!report.inventoryExports || report.inventoryExports.length === 0) {
            return true;
        }
        
        console.log(`🔄 Restoring ${report.inventoryExports.length} items from report ${report.date}`);
        
        const products = window.dataManager.getInventoryProducts();
        const updatedProducts = [...products];
        let restoredCount = 0;
        
        // Cộng hàng trở lại kho
        for (const exportItem of report.inventoryExports) {
            const productIndex = updatedProducts.findIndex(p => 
                p.id === exportItem.productId || 
                p.name.toLowerCase() === exportItem.product.toLowerCase()
            );
            
            if (productIndex !== -1) {
                const oldQuantity = updatedProducts[productIndex].quantity;
                updatedProducts[productIndex] = {
                    ...updatedProducts[productIndex],
                    quantity: updatedProducts[productIndex].quantity + exportItem.quantity,
                    lastUpdated: new Date().toISOString(),
                    history: [
                        ...(updatedProducts[productIndex].history || []),
                        {
                            type: 'restore',
                            date: new Date().toISOString().split('T')[0],
                            quantity: exportItem.quantity,
                            note: `Hoàn trả từ xóa báo cáo ngày ${report.date}`,
                            timestamp: new Date().toISOString()
                        }
                    ]
                };
                
                console.log(`↩️ Restored ${exportItem.quantity} ${exportItem.product} (${oldQuantity} → ${updatedProducts[productIndex].quantity})`);
                restoredCount++;
            } else {
                console.warn(`⚠️ Product not found for restore: ${exportItem.product}`);
            }
        }
        
        if (restoredCount > 0) {
            // Lưu kho mới vào Firebase
            const inventoryData = { 
                products: updatedProducts,
                lastUpdated: new Date().toISOString()
            };
            
            await window.dataManager.saveLocal(
                'inventory',
                'products.json',
                inventoryData,
                `Hoàn trả hàng từ xóa báo cáo ngày ${report.date} (${restoredCount} sản phẩm)`
            );
            
            console.log(`✅ Restored ${restoredCount} items to inventory`);
            return true;
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Error restoring inventory:', error);
        return false;
    }
}
    sendToZalo() {
    try {
        // 1. Lấy số dư đầu kỳ
        const openingBalance = this.getCurrencyValue('openingBalance') || 0;
        
        // 2. Lấy giá trị từ UI
        const actualReceived = this.getCurrencyValue('actualReceived') || 0;
        const closingBalance = this.getCurrencyValue('closingBalance') || 0;
        const expensesTotal = this.getTotalExpenses();
        const transfersTotal = this.getTotalTransfers();
        
        // 3. Tính toán doanh thu
        const revenue = actualReceived + expensesTotal + transfersTotal - openingBalance + closingBalance;
        
        // 4. Chuẩn bị nội dung báo cáo
        let message = `📊 BÁO CÁO NGÀY ${this.currentDate}\n\n`;
        message += `💰 Số dư đầu kỳ: ${openingBalance.toLocaleString()} ₫\n`;
        message += `💵 Thực nhận (tiền mặt): ${actualReceived.toLocaleString()} ₫\n`;
        message += `💳 Chi phí: ${expensesTotal.toLocaleString()} ₫\n`;
        message += `🏦 Chuyển khoản: ${transfersTotal.toLocaleString()} ₫\n`;
        message += `💰 Số dư cuối kỳ: ${closingBalance.toLocaleString()} ₫\n`;
        
        
        if (this.expenses.length > 0) {
            message += `📝 Chi tiết chi phí:\n`;
            this.expenses.forEach(e => {
                message += `• ${e.name}: ${(e.amount || 0).toLocaleString()} ₫\n`;
            });
            message += `\n`;
        }
        
        if (this.transfers.length > 0) {
            message += `🏦 Chi tiết chuyển khoản:\n`;
            this.transfers.forEach(t => {
                message += `• ${t.content || 'Không có nội dung'}: ${(t.amount || 0).toLocaleString()} ₫\n`;
            });
            message += `\n`;
        }
        
        if (this.inventoryExports.length > 0) {
            message += `📦 Hàng xuất kho (chờ lưu):\n`;
            this.inventoryExports.forEach(item => {
                message += `• ${item.product || item.name}: ${item.quantity || 0}${item.unit || ''}\n`;
            });
            message += `\n`;
        }
        
        // Thêm thông tin người gửi nếu có
        if (window.authManager && window.authManager.currentUser) {
            const user = window.authManager.currentUser;
            message += `👤 Người gửi: ${user.name}\n`;
        }
        
        message += `---\n`;
        message += `Hệ thống Milano ☕\n`;
        message += `${new Date().toLocaleString('vi-VN')}`;
        
        // 5. Copy vào clipboard
        navigator.clipboard.writeText(message).then(() => {
            window.showToast('✅ Đã sao chép báo cáo vào clipboard!', 'success');
            
            // 6. Mở Zalo (tự nhận diện iOS / Android + tối ưu fallback)
function openZaloWithMessage(message) {
    const ua = navigator.userAgent.toLowerCase();
    const zaloWebUrl = `https://zalo.me/?text=${encodeURIComponent(message)}`;
    const zaloScheme = "zalo://";
    const intentUrl = "intent://zalo/#Intent;scheme=zalo;package=com.zing.zalo;end";

    // 🟦 iOS — luôn dùng zalo:// (ổn định nhất)
    if (/iphone|ipad|ipod/.test(ua)) {
        try {
            window.location.href = zaloScheme;
        } catch (e) {
            window.location.href = zaloWebUrl;
        }
        return;
    }

    // 🟩 Android — thử zalo:// → fallback intent:// → fallback zalo web
    if (/android/.test(ua)) {
        try {
            window.location.href = zaloScheme;

            setTimeout(() => {
                window.location.href = intentUrl;
            }, 500);

        } catch (e) {
            window.location.href = zaloWebUrl;
        }
        return;
    }

    // 🖥 PC / thiết bị khác → mở zalo web
    window.location.href = zaloWebUrl;
}



// ===============================
// CODE CHÍNH ĐƯỢC GIỮ NGUYÊN
// ===============================
try {
    navigator.clipboard.writeText(message).then(() => {
        window.showToast('📋 Đã sao chép nội dung vào clipboard', 'success');

        // 6. Mở Zalo
        setTimeout(() => {
            openZaloWithMessage(message);

            setTimeout(() => {
                window.showToast(
                    '📱 Zalo đã mở — chỉ cần dán (Ctrl+V / Paste) để gửi',
                    'info'
                );
            }, 500);
        }, 500);

    }).catch(err => {
        console.error('❌ Lỗi khi copy vào clipboard:', err);

        // Fallback copy thủ công
        const textArea = document.createElement('textarea');
        textArea.value = message;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            const successful = document.execCommand('copy');

            if (successful) {
                window.showToast('✅ Đã sao chép báo cáo (fallback method)', 'success');

                setTimeout(() => {
                    openZaloWithMessage(message);

                    window.showToast(
                        '📱 Đã mở Zalo — hãy dán nội dung vào khung chat',
                        'info'
                    );
                }, 600);

            } else {
                window.showToast('❌ Không thể sao chép, vui lòng copy thủ công', 'error');
            }

        } catch (err) {
            window.showToast('❌ Lỗi khi sao chép: ' + err, 'error');
        }

        document.body.removeChild(textArea);
    });

} catch (error) {
    console.error('❌ Error in sendToZalo:', error);
    window.showToast('Lỗi khi gửi Zalo: ' + error.message, 'error');
}
}

// Khởi tạo module
window.reportsModule = new ReportsModule();