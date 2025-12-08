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
        // Tải báo cáo cho ngày hiện tại
        if (!this.currentReport || this.currentReport.date !== this.currentDate) {
            this.currentReport = await this.loadReportForDate(this.currentDateKey);
            
            if (this.currentReport) {
                console.log('📊 Current report loaded:', this.currentReport);
                this.expenses = this.currentReport.expenses || [];
                this.transfers = this.currentReport.transfers || [];
                this.inventoryExports = this.currentReport.inventoryExports || [];
            } else {
                // Reset khi không có report
                this.expenses = [];
                this.transfers = [];
                this.inventoryExports = [];
                this.currentReport = null;
            }
        }
        
        // Lấy số dư đầu kỳ - SỬA QUAN TRỌNG
        let openingBalance = 0;
        
        // Ưu tiên lấy từ report hiện tại nếu có
        if (this.currentReport?.openingBalance !== undefined) {
            openingBalance = this.currentReport.openingBalance;
            console.log(`💰 Using opening balance from report: ${openingBalance}`);
        } else {
            // Tính từ ngày trước nếu không có
            openingBalance = await this.getOpeningBalance(this.currentDateKey);
            console.log(`💰 Calculated opening balance: ${openingBalance}`);
        }
        
        // Format actualReceived và closingBalance từ report nếu có
        const actualReceived = this.currentReport?.actualReceived || 0;
        const closingBalance = this.currentReport?.closingBalance || 0;
        const exportedItems = this.currentReport?.inventoryExports || [];
        const exportText = exportedItems.length > 0 
            ? exportedItems.map(item => `${item.product} - ${item.quantity}${item.unit ? item.unit : ''}`).join(', ')
            : 'Chưa có hàng xuất';
        mainContent.innerHTML = `
            <div class="report-container">
                <div class="report-header">
                    <h3><i class="fas fa-chart-line"></i> BÁO CÁO NGÀY ${this.currentDate}</h3>
                    <div class="opening-balance">
                        <i class="fas fa-wallet"></i> Dư đầu kỳ: <strong>${openingBalance.toLocaleString()} ₫</strong>
                    </div>
                    <div class="date-picker">
                        <input type="date" id="reportDate" value="${this.getInputDateValue()}"
                               onchange="window.reportsModule.changeDate()">
                    </div>
                </div>
                
                <div class="quick-stats">
                    <div class="stat-card" onclick="window.reportsModule.showExpensesModal()">
                        <i class="fas fa-credit-card"></i>
                        <span>💳 CHI PHÍ</span>
                        <span id="expensesTotal" class="amount">${this.getTotalExpenses().toLocaleString()} ₫</span>
                    </div>
                    
                    <div class="stat-card" onclick="window.reportsModule.showTransfersModal()">
                        <i class="fas fa-university"></i>
                        <span>🏦 CHUYỂN KHOẢN</span>
                        <span id="transfersTotal" class="amount">${this.getTotalTransfers().toLocaleString()} ₫</span>
                    </div>
                </div>
                
                <div class="report-card">
                    <label>THỰC NHẬN (tiền mặt) <small class="required">*</small></label>
                    <div class="input-group">
                        <input type="text" id="actualReceived" 
                               value="${actualReceived.toLocaleString()}" 
                               oninput="window.reportsModule.formatCurrency(this); window.reportsModule.calculate()" 
                               placeholder="0" required>
                        <span class="currency">₫</span>
                    </div>
                    <small class="input-help">Số tiền mặt thực tế nhận được</small>
                </div>
                
                <div class="report-card">
                    <label>SỐ DƯ CUỐI KỲ <small class="required">*</small></label>
                    <div class="input-group">
                        <input type="text" id="closingBalance" 
                               value="${closingBalance.toLocaleString()}" 
                               oninput="window.reportsModule.formatCurrency(this); window.reportsModule.calculate()" 
                               placeholder="0" required>
                        <span class="currency">₫</span>
                    </div>
                    <small class="input-help">Số tiền còn lại sau ngày</small>
                </div>
                
                <!-- Doanh thu tính toán -->
                <div class="revenue-display">
                    <div class="revenue-label">
                        <i class="fas fa-chart-line"></i>
                        <span>DOANH THU TÍNH TOÁN</span>
                    </div>
                    <div class="revenue-value" id="revenue">${this.calculatedRevenue.toLocaleString()} ₫</div>
                    
                </div>
                <div class="export-line">
                    <i class="fas fa-box" style="color: #4CAF50; margin-right: 5px;"></i>
                    <strong>Hàng xuất:</strong> ${exportText}
                </div>
                <!-- Action cards -->
                <div class="action-card" onclick="window.reportsModule.toggleInventory()">
                    <i class="fas fa-boxes"></i>
                    <span>📦 XUẤT KHO</span>
                    <span id="inventoryCount" class="amount">${this.inventoryExports.length} sản phẩm</span>
                    <i class="fas fa-chevron-down" id="inventoryToggle"></i>
                </div>
                
                <div id="inventorySection" class="collapsible-section" style="display: none;">
                    <!-- Inventory sẽ được render riêng -->
                </div>
                
                <div class="action-card" onclick="window.reportsModule.toggleHistory()">
                    <i class="fas fa-history"></i>
                    <span>📜 LỊCH SỬ BÁO CÁO</span>
                    <i class="fas fa-chevron-down" id="historyToggle"></i>
                </div>
                
                <div id="historySection" class="collapsible-section" style="display: none;">
                    <!-- Lịch sử sẽ được render riêng -->
                </div>
                
                <div class="action-buttons">
                    <button class="btn-primary" onclick="window.reportsModule.saveReport()" id="saveButton">
                        <i class="fas fa-save"></i> 💾 LƯU BÁO CÁO
                    </button>
                    <button class="btn-secondary" onclick="window.reportsModule.sendToZalo()">
                        <i class="fas fa-paper-plane"></i> 📱 GỬI ZALO
                    </button>
                </div>
            </div>
        `;
        
        // Tính toán ban đầu
        this.calculate();
        
        // Cập nhật UI cho inventory nếu có
        this.updateInventoryUI();
        
    } catch (error) {
        console.error('❌ Error rendering reports:', error);
        mainContent.innerHTML = `
            <div class="error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Lỗi khi tải báo cáo: ${error.message}</p>
                <button onclick="window.reportsModule.render()">Thử lại</button>
            </div>
        `;
    } finally {
        this.isLoading = false;
    }
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
    
    formatCurrency(input) {
        let value = input.value.replace(/\D/g, '');
        if (value) {
            value = parseInt(value).toLocaleString('vi-VN');
        }
        input.value = value;
    }
    
    getCurrencyValue(inputId) {
        const input = document.getElementById(inputId);
        if (!input) return 0;
        
        const value = input.value.replace(/\D/g, '');
        return parseInt(value) || 0;
    }
    
    async changeDate() {
    const dateInput = document.getElementById('reportDate');
    if (!dateInput) {
        console.error('Không tìm thấy ô chọn ngày');
        return;
    }
    
    const dateValue = dateInput.value;
    if (!dateValue) {
        console.error('Chưa chọn ngày');
        return;
    }
    
    const [year, month, day] = dateValue.split('-');
    const newDateKey = `${year}-${month}-${day}`;
    const newDateDisplay = `${day}/${month}/${year}`;
    
    //console.log(`📅 Đang đổi sang ngày: ${newDateDisplay} (key: ${newDateKey})`);
    
    // Nếu ngày không thay đổi thì không làm gì
    if (newDateKey === this.currentDateKey) {
        //console.log('Ngày không thay đổi');
        return;
    }
    
    // CẬP NHẬT NGÀY HIỆN TẠI
    this.currentDateKey = newDateKey;
    this.currentDate = newDateDisplay;
    
    // Hiển thị loading
    const mainContent = document.getElementById('mainContent');
    if (mainContent) {
        mainContent.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Đang tải báo cáo ngày ${newDateDisplay}...</p>
            </div>
        `;
    }
    
    // ĐẶT LẠI currentReport để tải dữ liệu mới
    this.currentReport = null;
    
    // LOAD LẠI DỮ LIỆU CỦA NGÀY MỚI
    await this.render();
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
    
    getTotalExpenses() {
        return this.expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
    }
    
    getTotalTransfers() {
        return this.transfers.reduce((sum, transfer) => sum + (transfer.amount || 0), 0);
    }
    
    showExpensesModal() {
    const suggestionsHTML = this.expenseSuggestions.map(suggestion => 
        `<div class="suggestion-item" onclick="window.reportsModule.selectExpenseSuggestion('${suggestion.replace(/'/g, "\\'")}')">
            ${suggestion}
        </div>`
    ).join('');
    
    const modalContent = `
        <div class="modal-header">
            <h2><i class="fas fa-credit-card"></i> CHI PHÍ NGÀY ${this.currentDate}</h2>
            <button class="modal-close" onclick="closeModal(); window.reportsModule.calculate()">&times;</button>
        </div>
        <div class="modal-body">
            <div class="form-group">
                <label>Tên chi phí:</label>
                <div class="suggestion-wrapper">
                    <input type="text" id="expenseName" placeholder="Tiền điện, nước, vệ sinh..." 
                           oninput="window.reportsModule.showExpenseSuggestions(this.value)">
                    <div class="suggestions-dropdown" id="expenseSuggestions" style="display: none;">
                        ${suggestionsHTML}
                        ${this.expenseSuggestions.length === 0 ? 
                            '<div class="suggestion-empty">Nhập tên chi phí mới</div>' : ''}
                    </div>
                </div>
            </div>
            
            <div class="form-group">
                <label>Số tiền:</label>
                <div class="input-group">
                    <input type="text" id="expenseAmount" placeholder="0" 
                           oninput="window.reportsModule.formatCurrency(this)">
                    <span class="currency">₫</span>
                </div>
            </div>
            
            <button class="btn-primary" onclick="window.reportsModule.addExpense()">
                <i class="fas fa-plus"></i> THÊM CHI PHÍ NGÀY ${this.currentDate}
            </button>
            
            <div class="modal-list-header">
                <h3>DANH SÁCH CHI PHÍ NGÀY ${this.currentDate}</h3>
            </div>
            
            <div class="modal-list" id="expensesList">
                ${this.expenses.map((expense, index) => `
                    <div class="list-item">
                        <div class="item-info">
                            <div class="item-name">${expense.name}</div>
                            <div class="item-amount">${expense.amount.toLocaleString()} ₫</div>
                        </div>
                        <div class="item-actions">
                            <button class="btn-icon" onclick="window.reportsModule.removeExpense(${index})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `).join('')}
                
                ${this.expenses.length === 0 ? `
                    <div class="empty-state">
                        <i class="fas fa-receipt"></i>
                        <p>Chưa có chi phí nào</p>
                    </div>
                ` : ''}
            </div>
            
            <div class="modal-total">
                <strong>TỔNG CHI PHÍ NGÀY ${this.currentDate}:</strong>
                <span>${this.getTotalExpenses().toLocaleString()} ₫</span>
            </div>
            
            <button class="btn-secondary" onclick="closeModal(); window.reportsModule.calculate()">
                ĐÓNG
            </button>
        </div>
    `;
    
    window.showModal(modalContent);
}
    // THÊM: Hàm xử lý suggestions cho chi phí
showExpenseSuggestions(searchText) {
    const dropdown = document.getElementById('expenseSuggestions');
    if (!dropdown) return;
    
    if (!searchText || searchText.trim() === '') {
        dropdown.style.display = 'none';
        return;
    }
    
    const searchLower = searchText.toLowerCase();
    const filtered = this.expenseSuggestions.filter(suggestion => 
        suggestion.toLowerCase().includes(searchLower)
    );
    
    if (filtered.length > 0) {
        dropdown.innerHTML = filtered.map(suggestion => 
            `<div class="suggestion-item" onclick="window.reportsModule.selectExpenseSuggestion('${suggestion.replace(/'/g, "\\'")}')">
                ${suggestion}
            </div>`
        ).join('');
        dropdown.style.display = 'block';
    } else {
        dropdown.innerHTML = '<div class="suggestion-empty">Không tìm thấy gợi ý</div>';
        dropdown.style.display = 'block';
    }
}

selectExpenseSuggestion(suggestion) {
    const input = document.getElementById('expenseName');
    if (input) {
        input.value = suggestion;
        input.focus();
    }
    
    const dropdown = document.getElementById('expenseSuggestions');
    if (dropdown) {
        dropdown.style.display = 'none';
    }
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
    
    // THÊM: Lưu vào suggestions
    this.addExpenseSuggestion(name);
    
    this.expenses.push({ 
        id: Date.now(),
        name, 
        amount,
        date: this.currentDate,
        addedAt: new Date().toISOString(),
        suggestionUsed: true
    });
    
    nameInput.value = '';
    amountInput.value = '';
    
    this.showExpensesModal();
    this.calculate();
    
    window.showToast(`Đã thêm chi phí cho ngày ${this.currentDate}`, 'success');
}
    
    removeExpense(index) {
        if (index >= 0 && index < this.expenses.length) {
            this.expenses.splice(index, 1);
            this.showExpensesModal();
            this.calculate();
            window.showToast('Đã xóa chi phí', 'success');
        }
    }
    
    // THÊM: Tương tự cho transfers
showTransfersModal() {
    const suggestionsHTML = this.transferSuggestions.map(suggestion => 
        `<div class="suggestion-item" onclick="window.reportsModule.selectTransferSuggestion('${suggestion.replace(/'/g, "\\'")}')">
            ${suggestion}
        </div>`
    ).join('');
    
    const modalContent = `
        <div class="modal-header">
            <h2><i class="fas fa-university"></i> CHUYỂN KHOẢN NGÀY ${this.currentDate}</h2>
            <button class="modal-close" onclick="closeModal(); window.reportsModule.calculate()">&times;</button>
        </div>
        <div class="modal-body">
            <div class="form-group">
                <label>Nội dung chuyển khoản:</label>
                <div class="suggestion-wrapper">
                    <input type="text" id="transferContent" placeholder="Tiết kiệm, trả nợ..." 
                           oninput="window.reportsModule.showTransferSuggestions(this.value)">
                    <div class="suggestions-dropdown" id="transferSuggestions" style="display: none;">
                        ${suggestionsHTML}
                        ${this.transferSuggestions.length === 0 ? 
                            '<div class="suggestion-empty">Nhập nội dung mới</div>' : ''}
                    </div>
                </div>
            </div>
            
            <div class="form-group">
                <label>Số tiền:</label>
                <div class="input-group">
                    <input type="text" id="transferAmount" placeholder="0" 
                           oninput="window.reportsModule.formatCurrency(this)">
                    <span class="currency">₫</span>
                </div>
            </div>
            
            <button class="btn-primary" onclick="window.reportsModule.addTransfer()">
                <i class="fas fa-plus"></i> THÊM CHUYỂN KHOẢN NGÀY ${this.currentDate}
            </button>
            
            <div class="modal-list-header">
                <h3>DANH SÁCH CHUYỂN KHOẢN NGÀY ${this.currentDate}</h3>
            </div>
            
            <div class="modal-list" id="transfersList">
                ${this.transfers.map((transfer, index) => `
                    <div class="list-item">
                        <div class="item-info">
                            <div class="item-name">${transfer.content || 'Không có nội dung'}</div>
                            <div class="item-amount">${transfer.amount.toLocaleString()} ₫</div>
                        </div>
                        <div class="item-actions">
                            <button class="btn-icon" onclick="window.reportsModule.removeTransfer(${index})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `).join('')}
                
                ${this.transfers.length === 0 ? `
                    <div class="empty-state">
                        <i class="fas fa-exchange-alt"></i>
                        <p>Chưa có chuyển khoản nào</p>
                    </div>
                ` : ''}
            </div>
            
            <div class="modal-total">
                <strong>TỔNG CHUYỂN KHOẢN NGÀY ${this.currentDate}:</strong>
                <span>${this.getTotalTransfers().toLocaleString()} ₫</span>
            </div>
            
            <button class="btn-secondary" onclick="closeModal(); window.reportsModule.calculate()">
                ĐÓNG
            </button>
        </div>
    `;
    
    window.showModal(modalContent);
}

// THÊM: Hàm xử lý suggestions cho chuyển khoản
showTransferSuggestions(searchText) {
    const dropdown = document.getElementById('transferSuggestions');
    if (!dropdown) return;
    
    if (!searchText || searchText.trim() === '') {
        dropdown.style.display = 'none';
        return;
    }
    
    const searchLower = searchText.toLowerCase();
    const filtered = this.transferSuggestions.filter(suggestion => 
        suggestion.toLowerCase().includes(searchLower)
    );
    
    if (filtered.length > 0) {
        dropdown.innerHTML = filtered.map(suggestion => 
            `<div class="suggestion-item" onclick="window.reportsModule.selectTransferSuggestion('${suggestion.replace(/'/g, "\\'")}')">
                ${suggestion}
            </div>`
        ).join('');
        dropdown.style.display = 'block';
    } else {
        dropdown.innerHTML = '<div class="suggestion-empty">Không tìm thấy gợi ý</div>';
        dropdown.style.display = 'block';
    }
}

selectTransferSuggestion(suggestion) {
    const input = document.getElementById('transferContent');
    if (input) {
        input.value = suggestion;
        input.focus();
    }
    
    const dropdown = document.getElementById('transferSuggestions');
    if (dropdown) {
        dropdown.style.display = 'none';
    }
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
    
    // THÊM: Lưu vào suggestions
    if (content) {
        this.addTransferSuggestion(content);
    }
    
    this.transfers.push({ 
        id: Date.now(),
        content: content || 'Không có nội dung', 
        amount,
        date: this.currentDate,
        addedAt: new Date().toISOString(),
        suggestionUsed: true
    });
    
    contentInput.value = '';
    amountInput.value = '';
    
    this.showTransfersModal();
    this.calculate();
    
    window.showToast(`Đã thêm chuyển khoản cho ngày ${this.currentDate}`, 'success');
}
    // THÊM: Tương tự cho transfers
showTransfersModal() {
    const suggestionsHTML = this.transferSuggestions.map(suggestion => 
        `<div class="suggestion-item" onclick="window.reportsModule.selectTransferSuggestion('${suggestion.replace(/'/g, "\\'")}')">
            ${suggestion}
        </div>`
    ).join('');
    
    const modalContent = `
        <div class="modal-header">
            <h2><i class="fas fa-university"></i> CHUYỂN KHOẢN NGÀY ${this.currentDate}</h2>
            <button class="modal-close" onclick="closeModal(); window.reportsModule.calculate()">&times;</button>
        </div>
        <div class="modal-body">
            <div class="form-group">
                <label>Nội dung chuyển khoản:</label>
                <div class="suggestion-wrapper">
                    <input type="text" id="transferContent" placeholder="Tiết kiệm, trả nợ..." 
                           oninput="window.reportsModule.showTransferSuggestions(this.value)">
                    <div class="suggestions-dropdown" id="transferSuggestions" style="display: none;">
                        ${suggestionsHTML}
                        ${this.transferSuggestions.length === 0 ? 
                            '<div class="suggestion-empty">Nhập nội dung mới</div>' : ''}
                    </div>
                </div>
            </div>
            
            <div class="form-group">
                <label>Số tiền:</label>
                <div class="input-group">
                    <input type="text" id="transferAmount" placeholder="0" 
                           oninput="window.reportsModule.formatCurrency(this)">
                    <span class="currency">₫</span>
                </div>
            </div>
            
            <button class="btn-primary" onclick="window.reportsModule.addTransfer()">
                <i class="fas fa-plus"></i> THÊM CHUYỂN KHOẢN NGÀY ${this.currentDate}
            </button>
            
            <div class="modal-list-header">
                <h3>DANH SÁCH CHUYỂN KHOẢN NGÀY ${this.currentDate}</h3>
            </div>
            
            <div class="modal-list" id="transfersList">
                ${this.transfers.map((transfer, index) => `
                    <div class="list-item">
                        <div class="item-info">
                            <div class="item-name">${transfer.content || 'Không có nội dung'}</div>
                            <div class="item-amount">${transfer.amount.toLocaleString()} ₫</div>
                        </div>
                        <div class="item-actions">
                            <button class="btn-icon" onclick="window.reportsModule.removeTransfer(${index})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `).join('')}
                
                ${this.transfers.length === 0 ? `
                    <div class="empty-state">
                        <i class="fas fa-exchange-alt"></i>
                        <p>Chưa có chuyển khoản nào</p>
                    </div>
                ` : ''}
            </div>
            
            <div class="modal-total">
                <strong>TỔNG CHUYỂN KHOẢN NGÀY ${this.currentDate}:</strong>
                <span>${this.getTotalTransfers().toLocaleString()} ₫</span>
            </div>
            
            <button class="btn-secondary" onclick="closeModal(); window.reportsModule.calculate()">
                ĐÓNG
            </button>
        </div>
    `;
    
    window.showModal(modalContent);
}

// THÊM: Hàm xử lý suggestions cho chuyển khoản
showTransferSuggestions(searchText) {
    const dropdown = document.getElementById('transferSuggestions');
    if (!dropdown) return;
    
    if (!searchText || searchText.trim() === '') {
        dropdown.style.display = 'none';
        return;
    }
    
    const searchLower = searchText.toLowerCase();
    const filtered = this.transferSuggestions.filter(suggestion => 
        suggestion.toLowerCase().includes(searchLower)
    );
    
    if (filtered.length > 0) {
        dropdown.innerHTML = filtered.map(suggestion => 
            `<div class="suggestion-item" onclick="window.reportsModule.selectTransferSuggestion('${suggestion.replace(/'/g, "\\'")}')">
                ${suggestion}
            </div>`
        ).join('');
        dropdown.style.display = 'block';
    } else {
        dropdown.innerHTML = '<div class="suggestion-empty">Không tìm thấy gợi ý</div>';
        dropdown.style.display = 'block';
    }
}

selectTransferSuggestion(suggestion) {
    const input = document.getElementById('transferContent');
    if (input) {
        input.value = suggestion;
        input.focus();
    }
    
    const dropdown = document.getElementById('transferSuggestions');
    if (dropdown) {
        dropdown.style.display = 'none';
    }
}


    
    removeTransfer(index) {
        if (index >= 0 && index < this.transfers.length) {
            this.transfers.splice(index, 1);
            this.showTransfersModal();
            this.calculate();
            window.showToast('Đã xóa chuyển khoản', 'success');
        }
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
            <div class="inventory-controls">
                <h4>Chọn số lượng ${this.currentDate}:</h4>
                <div class="products-list">
                    ${products.map((product, index) => {
                        const exportItem = this.inventoryExports.find(item => item.productId === product.id);
                        const exportQty = exportItem ? exportItem.quantity : 0;
                        
                        return `
                            <div class="product-item">
                                <div class="product-info">
                                    <strong>${product.name}</strong>
                                    <small>${product.unit} - Tồn: ${product.quantity}</small>
                                </div>
                                <div class="product-quantity">
                                    <button class="qty-btn" onclick="window.reportsModule.decreaseExport(${index})">-</button>
                                    <span id="exportQty${index}">${exportQty}</span>
                                    <button class="qty-btn" onclick="window.reportsModule.increaseExport(${index})">+</button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
                
                <div class="export-summary">
                    <h4>Sản phẩm chờ xuất ngày ${this.currentDate}: <span id="pendingExports">${this.inventoryExports.length}</span></h4>
                    <div id="exportDetails">
                        ${this.inventoryExports.map((item, index) => `
                            <div class="export-item">
                                <i class="fas fa-clock"></i>
                                <span>${item.time} - ${item.product} - ${item.quantity} ${item.unit}</span>
                                <button class="btn-icon small" onclick="window.reportsModule.removeExport(${index})">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        `).join('')}
                        
                        ${this.inventoryExports.length === 0 ? `
                            <div class="empty-state small">
                                <p>Chưa có sản phẩm nào chờ xuất</p>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }
    
    increaseExport(index) {
        const products = window.dataManager.getInventoryProducts();
        if (index >= products.length) return;
        
        const product = products[index];
        const exportItem = this.inventoryExports.find(item => item.productId === product.id);
        const currentExport = exportItem ? exportItem.quantity : 0;
        
        if (currentExport >= product.quantity) {
            window.showToast(`Không đủ hàng tồn kho cho ${product.name}`, 'warning');
            return;
        }
        
        const now = new Date();
        const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        if (exportItem) {
            exportItem.quantity++;
            exportItem.time = time;
        } else {
            this.inventoryExports.push({
                id: Date.now(),
                productId: product.id,
                product: product.name,
                quantity: 1,
                unit: product.unit,
                time: time,
                date: this.currentDateKey
            });
        }
        
        this.updateInventoryUI();
        window.showToast(`Đã thêm ${product.name} vào danh sách xuất ngày ${this.currentDate}`, 'success');
    }
    
    decreaseExport(index) {
        const products = window.dataManager.getInventoryProducts();
        if (index >= products.length) return;
        
        const product = products[index];
        const exportItemIndex = this.inventoryExports.findIndex(item => item.productId === product.id);
        
        if (exportItemIndex >= 0) {
            if (this.inventoryExports[exportItemIndex].quantity > 1) {
                this.inventoryExports[exportItemIndex].quantity--;
            } else {
                this.inventoryExports.splice(exportItemIndex, 1);
            }
            
            this.updateInventoryUI();
            window.showToast(`Đã giảm số lượng ${product.name}`, 'success');
        }
    }
    
    removeExport(index) {
        if (index >= 0 && index < this.inventoryExports.length) {
            this.inventoryExports.splice(index, 1);
            this.updateInventoryUI();
            this.renderInventorySection();
            window.showToast('Đã xóa sản phẩm khỏi danh sách xuất', 'success');
        }
    }
    
    updateInventoryUI() {
        const inventoryCount = document.getElementById('inventoryCount');
        if (inventoryCount) {
            inventoryCount.textContent = `${this.inventoryExports.length} sản phẩm`;
        }
        
        const pendingExports = document.getElementById('pendingExports');
        if (pendingExports) {
            pendingExports.textContent = this.inventoryExports.length;
        }
        
        const products = window.dataManager.getInventoryProducts();
        products.forEach((product, index) => {
            const exportItem = this.inventoryExports.find(item => item.productId === product.id);
            const exportQty = exportItem ? exportItem.quantity : 0;
            
            const qtySpan = document.getElementById(`exportQty${index}`);
            if (qtySpan) {
                qtySpan.textContent = exportQty;
            }
        });
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
                
                return `
                    <div class="history-item">
                        <div class="history-header">
                            <span class="history-date">📅 ${report.date}</span>
                            ${savedTime ? `<span class="history-time">${savedTime}</span>` : ''}
                            <div class="history-actions">
                                <button class="btn-small" onclick="window.reportsModule.loadReport('${report.date}')">
                                    <i class="fas fa-eye"></i> Xem
                                </button>
                                <button class="btn-small danger" onclick="window.reportsModule.deleteReportFirebase('${report.date}')">
                                    <i class="fas fa-trash"></i> Xóa
                                </button>
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
                                ${report.savedAt ? `Lưu: ${new Date(report.savedAt).toLocaleString('vi-VN')}` : ''}
                            </small>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
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

    
    async loadReport(date) {
    console.log(`📥 Loading report for date: ${date}`);
    
    // Parse date
    const [day, month, year] = date.split('/');
    const dateKey = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    
    // Cập nhật ngày hiện tại
    this.currentDateKey = dateKey;
    this.currentDate = date;
    
    // Reset current report để tải mới
    this.currentReport = null;
    this.expenses = [];
    this.transfers = [];
    this.inventoryExports = [];
    
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
        // 1. Lấy số dư đầu kỳ từ ngày trước (tính tự động)
        const openingBalance = await this.getOpeningBalance(this.currentDateKey);
        
        // 2. Lấy giá trị từ UI
        const actualReceived = this.getCurrencyValue('actualReceived');
        const closingBalance = this.getCurrencyValue('closingBalance');
        const expensesTotal = this.getTotalExpenses();
        const transfersTotal = this.getTotalTransfers();
        
        // 3. Validation cơ bản
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
        
        // 4. Tính toán doanh thu
        const revenue = actualReceived + expensesTotal + transfersTotal - openingBalance + closingBalance;
        
        console.log('💰 Revenue calculation:', {
            actualReceived,
            expensesTotal,
            transfersTotal,
            openingBalance,
            closingBalance,
            revenue
        });
        
        // 5. KIỂM TRA VÀ XỬ LÝ XUẤT KHO
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
        
        // 6. TẠO REPORT DATA với thông tin hàng đã xuất
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
            exportedItemsTotal: exportedItems.reduce((sum, item) => sum + item.quantity, 0)
        };
        
        const dateKey = this.currentDateKey;
        
        console.log('💾 Saving report to Firebase:', {
            dateKey,
            version: reportData.version,
            exportedItems: reportData.inventoryExports.length
        });
        
        // 7. LƯU VÀO FIREBASE THÔNG QUA DATA MANAGER
        const success = await window.dataManager.saveLocal(
            'reports',
            `${dateKey}.json`,
            reportData,
            `Báo cáo ngày ${this.currentDate} - Xuất ${exportedItems.length} sản phẩm`
        );
        
        if (success) {
            // 8. RESET DỮ LIỆU SAU KHI LƯU THÀNH CÔNG
            this.resetAfterSave();
            
            
            
            // 10. Cập nhật currentReport
            this.currentReport = reportData;
            
            // 11. Hiển thị thông báo
            window.showToast(`✅ Đã lưu báo cáo ngày ${this.currentDate}`, 'success');
            
            // 12. TẠO BÁO CÁO ZALO TỰ ĐỘNG
            setTimeout(() => {
                this.sendToZalo();
            }, 1000);
            
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
    products.forEach((product, index) => {
        const qtySpan = document.getElementById(`exportQty${index}`);
        if (qtySpan) {
            qtySpan.textContent = '0';
        }
    });
}
// THÊM PHƯƠNG THỨC resetAfterSave()
resetAfterSave() {
    console.log('🔄 Resetting data after save...');
    
    // 1. Reset inventory exports (QUAN TRỌNG: phải reset sau khi lưu)
    this.inventoryExports = [];
    
    // 2. Reset expenses và transfers cho ngày hiện tại
    this.expenses = [];
    this.transfers = [];
    
    // 3. Cập nhật UI ngay lập tức
    this.updateInventoryUI();
    
    console.log('✅ Data reset completed');
}

// CẬP NHẬT updateInventoryUI()
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
    if (!confirm(`Bạn có chắc muốn xóa báo cáo ngày ${date}?\n\n⚠️ Cảnh báo: Hàng hóa đã xuất sẽ được hoàn trả vào kho!`)) return;
    
    try {
        console.log(`🗑️ Deleting report for date: ${date}`);
        
        // 1. Tìm report trong dataManager
        const displayDate = date; // date đã là dd/mm/yyyy
        const dateKey = this.formatDateForFirebase(date);
        
        console.log(`🔍 Looking for report: ${displayDate} (key: ${dateKey})`);
        
        // Tìm trong dataManager
        const report = window.dataManager.data.reports?.[displayDate];
        
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
        
        // 2. Hoàn trả hàng hóa vào kho nếu có xuất kho
        if (report.inventoryExports && report.inventoryExports.length > 0) {
            console.log(`🔄 Restoring ${report.inventoryExports.length} items to inventory`);
            
            const restoreSuccess = await this.restoreInventoryFromReportFirebase(report);
            if (!restoreSuccess) {
                window.showToast('Không thể hoàn trả hàng hóa', 'error');
                return;
            }
            
            window.showToast(`↩️ Đã hoàn trả ${report.inventoryExports.length} sản phẩm vào kho`, 'info');
        }
        
        // 3. Xóa report khỏi DataManager
        delete window.dataManager.data.reports[displayDate];
        
        // Lưu local data ngay lập tức
        window.dataManager.saveLocalData();
        
        // 4. Thêm vào queue để xóa từ Firebase (gửi null để xóa)
        await window.dataManager.saveLocal(
            'reports',
            `${dateKey}.json`,
            null, // gửi null để xóa
            `Xóa báo cáo ngày ${date}`
        );
        
        window.showToast(`✅ Đã xóa báo cáo ngày ${date}`, 'success');
        
        // 5. Refresh UI nếu đang xem report đó
        if (this.currentDate === date) {
            console.log(`🔄 Current report deleted, resetting view...`);
            this.currentReport = null;
            this.expenses = [];
            this.transfers = [];
            this.inventoryExports = [];
            await this.render();
        }
        
        // 6. Refresh lịch sử
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
    const openingBalance = this.getCurrencyValue('openingBalance');
    const actualReceived = this.getCurrencyValue('actualReceived');
    const closingBalance = this.getCurrencyValue('closingBalance');
    const revenue = this.calculatedRevenue || 0; // Lấy doanh thu đã tính
    
    const message = `
📊 BÁO CÁO NGÀY ${this.currentDate}

💰 Số dư đầu kỳ: ${openingBalance.toLocaleString()} ₫
💵 Thực nhận (tiền mặt): ${actualReceived.toLocaleString()} ₫
💳 Chi phí: ${this.getTotalExpenses().toLocaleString()} ₫
🏦 Chuyển khoản: ${this.getTotalTransfers().toLocaleString()} ₫
💰 Số dư cuối kỳ: ${closingBalance.toLocaleString()} ₫
📈 Doanh thu tính toán: ${revenue.toLocaleString()} ₫

${this.expenses.length > 0 ? `📝 Chi tiết chi phí:\n${this.expenses.map(e => `• ${e.name}: ${e.amount.toLocaleString()} ₫`).join('\n')}\n` : ''}
${this.transfers.length > 0 ? `🏦 Chi tiết chuyển khoản:\n${this.transfers.map(t => `• ${t.content}: ${t.amount.toLocaleString()} ₫`).join('\n')}\n` : ''}

--- 
Hệ thống Milano ☕
${new Date().toLocaleString('vi-VN')}
    `.trim();
    
    // ... (phần copy và mở Zalo giữ nguyên)
}
}

// Khởi tạo module
window.reportsModule = new ReportsModule();