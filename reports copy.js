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
    
   async render() {
    if (this.isLoading) return;
    
    this.isLoading = true;
    const mainContent = document.getElementById('mainContent');
    
    try {
        // Tải báo cáo cho ngày hiện tại (currentDateKey) nếu chưa có
        if (!this.currentReport || this.currentReport.date !== this.currentDate) {
            this.currentReport = await this.loadReportForDate(this.currentDateKey);
            
            // KHÔI PHỤC DỮ LIỆU TỪ REPORT CỦA NGÀY ĐƯỢC CHỌN
            if (this.currentReport) {
                this.expenses = this.currentReport.expenses || [];
                this.transfers = this.currentReport.transfers || [];
                
                // **QUAN TRỌNG: Nếu báo cáo đã có inventoryExports thì KHÔNG load vào pending exports**
                // Chỉ load nếu chưa được xử lý (processed: false)
                const savedExports = this.currentReport.inventoryExports || [];
                this.inventoryExports = savedExports.filter(item => !item.processed);
                
                //console.log(`📦 Loaded ${this.inventoryExports.length} pending exports (filtered from ${savedExports.length} total)`);
            } else {
                // Reset khi không có report (ngày chưa có báo cáo)
                //console.log(`📭 Không có báo cáo cho ngày ${this.currentDate}, tạo mới`);
                this.expenses = [];
                this.transfers = [];
                this.inventoryExports = []; // Luôn bắt đầu với danh sách rỗng
                this.currentReport = {
                    date: this.currentDate,
                    revenue: 0,
                    openingBalance: 0,
                    closingBalance: 0,
                    actualReceived: 0
                };
            }
        }
            
            // Lấy số dư đầu kỳ từ ngày trước đó
            let openingBalance = await this.getOpeningBalance(this.currentDateKey);
            
            mainContent.innerHTML = `
                <div class="report-container">
        <div class="report-header">
            <h1><i class="fas fa-chart-line"></i> BÁO CÁO: ${this.currentDate}</h1>
            <div class="date-picker">
                <input type="date" id="reportDate" value="${this.getInputDateValue()}"
                       onchange="window.reportsModule.changeDate()">
                <!-- Xóa nút button -->
            </div>
        </div>
                    
                    <div class="report-card">
                        <label>SỐ DƯ ĐẦU KỲ</label>
                        <div class="input-group">
                            <input type="text" id="openingBalance" value="${openingBalance.toLocaleString()}" readonly>
                            <span class="currency">₫</span>
                        </div>
                        <small class="hint">(Tự động từ ngày trước)</small>
                    </div>
                    
                    <div class="report-card">
                        <label>DOANH THU</label>
                        <div class="input-group">
                            <input type="text" id="revenue" value="${this.currentReport?.revenue || 0}" 
                                   oninput="window.reportsModule.formatCurrency(this); window.reportsModule.calculate()" 
                                   placeholder="0">
                            <span class="currency">₫</span>
                        </div>
                    </div>
                    
                    <div class="action-card" onclick="window.reportsModule.showExpensesModal()">
                        <i class="fas fa-credit-card"></i>
                        <span>💳 CHI PHÍ</span>
                        <span id="expensesTotal" class="amount">${this.getTotalExpenses().toLocaleString()} ₫</span>
                    </div>
                    
                    <div class="action-card" onclick="window.reportsModule.showTransfersModal()">
                        <i class="fas fa-university"></i>
                        <span>🏦 CHUYỂN KHOẢN</span>
                        <span id="transfersTotal" class="amount">${this.getTotalTransfers().toLocaleString()} ₫</span>
                    </div>
                    
                    <div class="report-card">
                        <label>SỐ DƯ CUỐI KỲ</label>
                        <div class="input-group">
                            <input type="text" id="closingBalance" value="${this.currentReport?.closingBalance || 0}" 
                                   oninput="window.reportsModule.formatCurrency(this); window.reportsModule.calculate()" 
                                   placeholder="0">
                            <span class="currency">₫</span>
                        </div>
                    </div>
                    
                    <div class="result-card">
                        <h3>THỰC NHẬN</h3>
                        <div class="result-amount" id="actualReceived">0 ₫</div>
                    </div>
                    <div class="action-buttons">
                        <button class="btn-primary" onclick="window.reportsModule.saveReport()" id="saveButton">
                            <i class="fas fa-save"></i> 💾 LƯU
                        </button>
                        <button class="btn-secondary" onclick="window.reportsModule.sendToZalo()">
                            <i class="fas fa-paper-plane"></i> 📱 GỬI ZALO
                        </button>
                    </div>
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
                    
                    
                </div>
            `;
            
            // Tính toán ban đầu
            this.calculate();
            
        } catch (error) {
            console.error('Error rendering reports:', error);
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
    // CHỈ dùng local data
    return window.dataManager.getReport(dateKey);
}
    
    async getOpeningBalance(dateKey) {
        try {
            const currentDate = this.parseStorageDate(dateKey);
            const previousDate = new Date(currentDate);
            previousDate.setDate(previousDate.getDate() - 1);
            const previousDateKey = this.formatDateForStorage(previousDate);
            
            const previousReport = await this.loadReportForDate(previousDateKey);
            if (previousReport) {
                return previousReport.closingBalance || 0;
            }
            
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
        const revenue = this.getCurrencyValue('revenue');
        const closingBalance = this.getCurrencyValue('closingBalance');
        
        const expensesTotal = this.getTotalExpenses();
        const transfersTotal = this.getTotalTransfers();
        
        const actualReceived = openingBalance + revenue - expensesTotal - transfersTotal - closingBalance;
        
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
    }
    
    getTotalExpenses() {
        return this.expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
    }
    
    getTotalTransfers() {
        return this.transfers.reduce((sum, transfer) => sum + (transfer.amount || 0), 0);
    }
    
    showExpensesModal() {
        const modalContent = `
            <div class="modal-header">
                <h2><i class="fas fa-credit-card"></i> CHI PHÍ NGÀY ${this.currentDate}</h2>
                <button class="modal-close" onclick="closeModal(); window.reportsModule.calculate()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Tên chi phí:</label>
                    <input type="text" id="expenseName" placeholder="Tiền điện, nước, vệ sinh...">
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
        
        this.expenses.push({ 
            id: Date.now(),
            name, 
            amount,
            date: this.currentDate,
            addedAt: new Date().toISOString()
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
    
    showTransfersModal() {
        const modalContent = `
            <div class="modal-header">
                <h2><i class="fas fa-university"></i> CHUYỂN KHOẢN NGÀY ${this.currentDate}</h2>
                <button class="modal-close" onclick="closeModal(); window.reportsModule.calculate()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Nội dung chuyển khoản:</label>
                    <input type="text" id="transferContent" placeholder="Tiết kiệm, trả nợ...">
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
        
        this.transfers.push({ 
            id: Date.now(),
            content: content || 'Không có nội dung', 
            amount,
            date: this.currentDate,
            addedAt: new Date().toISOString()
        });
        
        contentInput.value = '';
        amountInput.value = '';
        
        this.showTransfersModal();
        this.calculate();
        
        window.showToast(`Đã thêm chuyển khoản cho ngày ${this.currentDate}`, 'success');
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
    
    // Lấy tất cả reports từ dataManager
    const allReports = window.dataManager.getReports('01/01/2024', '31/12/2025');
    
    //console.log(`📊 Found ${allReports.length} reports for history`);
    
    // Kiểm tra dữ liệu
    if (!Array.isArray(allReports)) {
        console.error('❌ allReports is not an array:', allReports);
        section.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Lỗi dữ liệu báo cáo</p>
            </div>
        `;
        return;
    }
    
    if (allReports.length === 0) {
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
        if (!report || !report.date) {
            console.warn('⚠️ Invalid report found:', report);
            return;
        }
        
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
            return dateB - dateA; // Mới nhất trước
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
                
                const inventoryValue = report.inventoryExports ?
                    report.inventoryExports.reduce((sum, i) => sum + (i.totalValue || 0), 0) : 0;
                
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
                            ${report.version ? `<span class="history-version">v${report.version}</span>` : ''}
                            <div class="history-actions">
                                <button class="btn-small" onclick="window.reportsModule.loadReport('${report.date}')">
                                    <i class="fas fa-eye"></i> Xem
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
                                    <small>${inventoryValue.toLocaleString()} ₫</small>
                                </div>
                                <div class="inventory-details">
                                    ${report.inventoryExports.slice(0, 3).map((item, index) => `
                                        <div class="export-detail">
                                            <span>${item.product || 'N/A'}</span>
                                            <span>${item.quantity} ${item.unit || ''}</span>
                                            <span>${(item.totalValue || 0).toLocaleString()} ₫</span>
                                        </div>
                                    `).join('')}
                                    ${report.inventoryExports.length > 3 ? `
                                        <div class="more-items">
                                            <i class="fas fa-ellipsis-h"></i>
                                            ${report.inventoryExports.length - 3} sản phẩm khác
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        ` : ''}
                        
                        <div class="history-footer">
                            <small>
                                ${report.savedAt ? `Lưu lúc: ${new Date(report.savedAt).toLocaleString('vi-VN')}` : ''}
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

// Thêm phương thức xóa báo cáo với xác nhận
async deleteReportConfirm(date, filename) {
    if (!confirm(`Bạn có chắc muốn xóa báo cáo ngày ${date}?\n\n⚠️ Cảnh báo: Hàng hóa đã xuất sẽ được hoàn trả vào kho!`)) return;
    
    try {
        // 1. Hoàn trả hàng hóa vào kho trước khi xóa
        const report = window.dataManager.data.reports[this.formatDateForStorage(this.parseDisplayDate(date))];
        if (report && report.inventoryExports && report.inventoryExports.length > 0) {
            const restoreSuccess = await this.restoreInventoryFromReport(report);
            if (!restoreSuccess) {
                window.showToast('Không thể hoàn trả hàng hóa', 'error');
                return;
            }
        }
        
        // 2. Xóa file trên GitHub
        const success = await window.githubManager.deleteFile(`reports/${filename}`, `Xóa báo cáo ngày ${date}`);
        
        if (success) {
            // 3. Xóa khỏi local storage
            const dateKey = filename.replace(/_v\d+\.json$/, '').replace('.json', '');
            delete window.dataManager.data.reports[dateKey];
            window.dataManager.saveToLocalStorage();
            
            // 4. Refresh lịch sử
            this.renderHistorySection();
            
            window.showToast(`✅ Đã xóa báo cáo ngày ${date} và hoàn trả hàng hóa`, 'success');
        } else {
            window.showToast('Không thể xóa báo cáo', 'error');
        }
    } catch (error) {
        console.error('Error deleting report:', error);
        window.showToast('Lỗi khi xóa báo cáo', 'error');
    }
}

// Thêm phương thức hoàn trả hàng hóa
async restoreInventoryFromReport(report) {
    try {
        if (!report.inventoryExports || report.inventoryExports.length === 0) {
            return true;
        }
        
        const products = window.dataManager.getInventoryProducts();
        const updatedProducts = [...products];
        
        // Cộng hàng trở lại kho
        for (const exportItem of report.inventoryExports) {
            const productIndex = updatedProducts.findIndex(p => p.id === exportItem.productId);
            
            if (productIndex !== -1) {
                updatedProducts[productIndex] = {
                    ...updatedProducts[productIndex],
                    quantity: updatedProducts[productIndex].quantity + exportItem.quantity,
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
            }
        }
        
        // Lưu kho mới
        window.dataManager.data.inventory = updatedProducts;
        window.dataManager.saveToLocalStorage();
        
        // Đồng bộ lên GitHub
        await window.dataManager.syncToGitHub(
            'inventory',
            'products',
            { products: updatedProducts },
            `Hoàn trả hàng từ xóa báo cáo ngày ${report.date}`
        );
        
        return true;
        
    } catch (error) {
        console.error('Error restoring inventory:', error);
        return false;
    }
}

// Thêm phương thức khôi phục phiên bản cũ
async restoreVersion(date, versionIndex) {
    if (!confirm(`Khôi phục phiên bản cũ của ngày ${date}?\nPhiên bản hiện tại sẽ bị ghi đè.`)) return;
    
    try {
        const allReports = window.dataManager.getReports('01/01/2024', '31/12/2025');
        const reportsForDate = allReports.filter(r => r.date === date);
        
        if (versionIndex >= reportsForDate.length) {
            window.showToast('Phiên bản không tồn tại', 'error');
            return;
        }
        
        const versionToRestore = reportsForDate[versionIndex];
        
        // Tạo phiên bản mới từ phiên bản cũ
        const restoredReport = {
            ...versionToRestore,
            savedAt: new Date().toISOString(),
            version: (reportsForDate[reportsForDate.length - 1]?.version || 0) + 1,
            restoredFrom: versionToRestore.savedAt
        };
        
        // Lưu phiên bản mới
        const dateKey = this.formatDateForStorage(this.parseDisplayDate(date));
        const success = await window.dataManager.syncToGitHub(
            'reports',
            `${dateKey}_v${restoredReport.version}`,
            restoredReport,
            `Khôi phục phiên bản ngày ${date} - Phiên bản ${restoredReport.version}`
        );
        
        if (success) {
            window.dataManager.data.reports[dateKey] = restoredReport;
            window.dataManager.saveToLocalStorage();
            
            window.showToast(`✅ Đã khôi phục phiên bản ngày ${date}`, 'success');
            closeModal();
            this.renderHistorySection();
        }
        
    } catch (error) {
        console.error('Error restoring version:', error);
        window.showToast('Lỗi khi khôi phục', 'error');
    }
}
    
    async loadReport(date) {
        const [day, month, year] = date.split('/');
        const dateKey = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        
        this.currentDateKey = dateKey;
        this.currentDate = date;
        
        await this.render();
        window.showToast(`Đã tải báo cáo ngày ${date}`, 'success');
        closeModal();
    }
    
    async deleteReport(filename) {
        if (!confirm(`Xóa báo cáo này?`)) return;
        
        try {
            const success = await window.githubManager.deleteFile(`reports/${filename}`, `Xóa báo cáo`);
            
            if (success) {
                const dateKey = filename.replace(/_v\d+\.json$/, '').replace('.json', '');
                delete window.dataManager.data.reports[dateKey];
                window.dataManager.saveToLocalStorage();
                
                window.showToast('Đã xóa báo cáo', 'success');
                this.renderHistorySection();
            } else {
                window.showToast('Không thể xóa báo cáo', 'error');
            }
        } catch (error) {
            console.error('Error deleting report:', error);
            window.showToast('Lỗi khi xóa báo cáo', 'error');
        }
    }
    
    async saveReport() {
    try {
        const openingBalance = this.getCurrencyValue('openingBalance');
        const revenue = this.getCurrencyValue('revenue');
        const closingBalance = this.getCurrencyValue('closingBalance');
        
        if (revenue < 0) {
            window.showToast('Doanh thu không hợp lệ', 'warning');
            return;
        }
        
        if (closingBalance < 0) {
            window.showToast('Số dư cuối kỳ không hợp lệ', 'warning');
            return;
        }
        
        const actualReceived = openingBalance + revenue - this.getTotalExpenses() - this.getTotalTransfers() - closingBalance;
        
        // **KIỂM TRA NẾU CÓ XUẤT KHO**
        let exportSuccess = true;
        if (this.inventoryExports.length > 0) {
            exportSuccess = await this.processInventoryExports();
            if (!exportSuccess) {
                window.showToast('Lỗi khi xuất kho', 'error');
                return;
            }
        }
        
        const reportData = {
            date: this.currentDate,
            openingBalance,
            revenue,
            expenses: this.expenses,
            transfers: this.transfers,
            closingBalance,
            actualReceived,
            inventoryExports: this.inventoryExports, // Lưu danh sách đã xuất
            savedAt: new Date().toISOString(),
            version: (this.currentReport?.version || 0) + 1,
            inventoryUpdated: exportSuccess && this.inventoryExports.length > 0
        };
        
        const saveButton = document.getElementById('saveButton');
        if (saveButton) {
            saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang lưu...';
            saveButton.disabled = true;
        }
        
        const dateKey = this.currentDateKey;
        
        const success = await window.dataManager.syncToGitHub(
            'reports',
            dateKey,
            reportData,
            `Báo cáo ngày ${this.currentDate}${this.inventoryExports.length > 0 ? ` - Xuất ${this.inventoryExports.length} sản phẩm` : ''}`
        );
        
        if (success) {
            // Cập nhật dữ liệu local
            window.dataManager.data.reports[dateKey] = reportData;
            window.dataManager.saveToLocalStorage();
            
            // Cập nhật currentReport
            this.currentReport = reportData;
            
            // **QUAN TRỌNG: RESET DANH SÁCH CHỜ XUẤT SAU KHI LƯU**
            if (this.inventoryExports.length > 0) {
                //console.log(`🔄 Resetting ${this.inventoryExports.length} pending exports`);
                this.inventoryExports = []; // Reset danh sách chờ xuất
            }
            
            // Cập nhật UI
            this.updateInventoryUI();
            
            window.showToast(`✅ Đã lưu báo cáo ngày ${this.currentDate}${this.inventoryExports.length > 0 ? ' và xuất kho' : ''}`, 'success');
            
            // Render lại để hiển thị trạng thái mới
            await this.render();
        } else {
            window.showToast('Lỗi khi lưu báo cáo', 'error');
        }
        
    } catch (error) {
        console.error('Error saving report:', error);
        window.showToast('Lỗi khi lưu báo cáo', 'error');
        
    } finally {
        const saveButton = document.getElementById('saveButton');
        if (saveButton) {
            saveButton.innerHTML = `<i class="fas fa-save"></i> 💾 ${this.currentReport?.savedAt ? 'CẬP NHẬT' : 'LƯU'} BÁO CÁO NGÀY ${this.currentDate}`;
            saveButton.disabled = false;
        }
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
async processInventoryExports() {
    try {
        if (this.inventoryExports.length === 0) {
            //console.log('Không có sản phẩm cần xuất kho');
            return true;
        }
        
        // Lấy dữ liệu kho hiện tại
        const products = window.dataManager.getInventoryProducts();
        
        // Tạo bản sao để cập nhật
        const updatedProducts = [...products];
        let hasChanges = false;
        
        //console.log(`📦 Processing ${this.inventoryExports.length} inventory exports`);
        
        // Kiểm tra và trừ tồn kho
        for (const exportItem of this.inventoryExports) {
            const productIndex = updatedProducts.findIndex(p => p.id === exportItem.productId);
            
            if (productIndex === -1) {
                console.error(`❌ Không tìm thấy sản phẩm: ${exportItem.product} (ID: ${exportItem.productId})`);
                window.showToast(`Không tìm thấy sản phẩm: ${exportItem.product}`, 'error');
                return false;
            }
            
            const product = updatedProducts[productIndex];
            
            if (product.quantity < exportItem.quantity) {
                window.showToast(`❌ Không đủ hàng tồn kho cho ${product.name} (Cần: ${exportItem.quantity}, Có: ${product.quantity})`, 'error');
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
            
            //console.log(`✅ Đã xuất ${exportItem.quantity} ${exportItem.unit} ${exportItem.product} (Còn lại: ${newQuantity})`);
        }
        
        if (hasChanges) {
            // Lưu dữ liệu kho mới
            window.dataManager.data.inventory = window.dataManager.data.inventory || {};
            window.dataManager.data.inventory.products = updatedProducts;
            
            // Lưu localStorage
            window.dataManager.saveToLocalStorage();
            
            // **CẬP NHẬT UI NGAY LẬP TỨC**
            this.updateInventoryCount();
            
            // Đồng bộ lên GitHub
            const syncResult = await window.dataManager.syncToGitHub(
                'inventory',
                'products',
                { products: updatedProducts },
                `Xuất kho ngày ${this.currentDate} - ${this.inventoryExports.length} sản phẩm`
            );
            
            if (!syncResult) {
                window.showToast('Lưu kho thành công nhưng đồng bộ GitHub thất bại', 'warning');
            }
            
            //console.log(`✅ Đã xuất kho ${this.inventoryExports.length} sản phẩm`);
            return true;
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Error processing inventory exports:', error);
        window.showToast(`Lỗi khi xuất kho: ${error.message}`, 'error');
        return false;
    }
}
    
    sendToZalo() {
        const openingBalance = this.getCurrencyValue('openingBalance');
        const revenue = this.getCurrencyValue('revenue');
        const closingBalance = this.getCurrencyValue('closingBalance');
        const actualReceived = openingBalance + revenue - this.getTotalExpenses() - this.getTotalTransfers() - closingBalance;
        
        const message = `
📊 BÁO CÁO NGÀY ${this.currentDate}

💰 Số dư đầu kỳ: ${openingBalance.toLocaleString()} ₫
📈 Doanh thu: ${revenue.toLocaleString()} ₫
💳 Chi phí: ${this.getTotalExpenses().toLocaleString()} ₫
🏦 Chuyển khoản: ${this.getTotalTransfers().toLocaleString()} ₫
💰 Số dư cuối kỳ: ${closingBalance.toLocaleString()} ₫
✅ Thực nhận: ${actualReceived.toLocaleString()} ₫

${this.expenses.length > 0 ? `📝 Chi tiết chi phí:\n${this.expenses.map(e => `• ${e.name}: ${e.amount.toLocaleString()} ₫`).join('\n')}\n` : ''}
${this.transfers.length > 0 ? `🏦 Chi tiết chuyển khoản:\n${this.transfers.map(t => `• ${t.content}: ${t.amount.toLocaleString()} ₫`).join('\n')}\n` : ''}
${this.inventoryExports.length > 0 ? `📦 Xuất kho (${this.inventoryExports.length} sản phẩm):\n${this.inventoryExports.map(item => `• ${item.time} - ${item.product} - ${item.quantity} ${item.unit}`).join('\n')}` : '📦 Chưa xuất kho sản phẩm nào'}

--- 
Hệ thống Milano ☕
${new Date().toLocaleString('vi-VN')}
        `.trim();
        
        navigator.clipboard.writeText(message).then(() => {
            window.showToast('Đã copy nội dung, mở Zalo để gửi', 'success');
            
            const encodedMessage = encodeURIComponent(message);
            const zaloUrl = `https://zalo.me/?text=${encodedMessage}`;
            
            window.open(zaloUrl, '_blank');
            
        }).catch(err => {
            console.error('Copy failed:', err);
            window.showToast('Lỗi khi copy nội dung', 'error');
        });
    }
}

// Khởi tạo module
window.reportsModule = new ReportsModule();