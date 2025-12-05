// reports.js - Xử lý logic báo cáo

class ReportsManager {
    constructor() {
        this.currentReport = {
            date: '',
            openingBalance: 0,
            revenue: 0,
            expenses: [],
            transfers: [],
            closingBalance: 0,
            inventory: [],
            actualProfit: 0
        };
        
        this.expenseTemplates = [];
        this.transferTemplates = [];
        this.products = [];
        
        this.initialize();
    }

// Sửa hàm initialize trong reports.js
async initialize() {
    console.log('ReportsManager đang khởi tạo...');
    
    try {
        // Đợi một chút để đảm bảo dataManager đã sẵn sàng
        await this.waitForDataManager();
        
        await this.loadTemplates();
        await this.loadProducts();
        this.setupEventListeners();
        this.updateDate();
        
        console.log('ReportsManager đã khởi tạo thành công');
    } catch (error) {
        console.error('Lỗi khởi tạo ReportsManager:', error);
        // Có thể thử lại sau 1 giây
        setTimeout(() => {
            this.initialize();
        }, 1000);
    }
}

// Thêm hàm waitForDataManager
async waitForDataManager() {
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
        if (dataManager.db) {
            console.log('DataManager đã sẵn sàng sau', attempts, 'lần thử');
            return true;
        }
        
        console.log('Chờ DataManager... lần thử', attempts + 1);
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
    }
    
    throw new Error('Không thể kết nối đến database sau nhiều lần thử');
}
    // Tải danh sách mẫu
    async loadTemplates() {
        try {
            this.expenseTemplates = await dataManager.getExpenseTemplates();
            this.transferTemplates = await dataManager.getTransferTemplates();
            this.updateTemplateDropdowns();
        } catch (error) {
            console.error('Lỗi tải mẫu:', error);
        }
    }

    // Tải danh sách sản phẩm
    async loadProducts() {
        try {
            this.products = await dataManager.getAllProducts();
            this.updateProductDropdowns();
        } catch (error) {
            console.error('Lỗi tải sản phẩm:', error);
        }
    }

    // Cập nhật dropdown cho mẫu
    updateTemplateDropdowns() {
        // Cập nhật datalist cho input chi phí
        const expenseDatalist = document.getElementById('expenseTemplatesDatalist') || this.createDatalist('expenseTemplatesDatalist', 'expenseName');
        
        // Xóa các option cũ
        while (expenseDatalist.firstChild) {
            expenseDatalist.removeChild(expenseDatalist.firstChild);
        }
        
        // Thêm option mới
        this.expenseTemplates.forEach(template => {
            const option = document.createElement('option');
            option.value = template.name;
            expenseDatalist.appendChild(option);
        });
        
        // Cập nhật datalist cho input chuyển khoản
        const transferDatalist = document.getElementById('transferTemplatesDatalist') || this.createDatalist('transferTemplatesDatalist', 'transferName');
        
        // Xóa các option cũ
        while (transferDatalist.firstChild) {
            transferDatalist.removeChild(transferDatalist.firstChild);
        }
        
        // Thêm option mới
        this.transferTemplates.forEach(template => {
            const option = document.createElement('option');
            option.value = template.name;
            transferDatalist.appendChild(option);
        });
    }

    // Tạo datalist nếu chưa có
    createDatalist(id, forInput) {
        const datalist = document.createElement('datalist');
        datalist.id = id;
        document.body.appendChild(datalist);
        
        const input = document.getElementById(forInput);
        if (input) {
            input.setAttribute('list', id);
        }
        
        return datalist;
    }

    // Cập nhật dropdown cho sản phẩm
    updateProductDropdowns() {
        const inventoryItems = document.getElementById('inventoryItems');
        if (inventoryItems) {
            const selects = inventoryItems.querySelectorAll('.product-select');
            
            selects.forEach(select => {
                // Lưu giá trị đang chọn
                const currentValue = select.value;
                
                // Xóa các option cũ (trừ option đầu tiên)
                while (select.options.length > 1) {
                    select.remove(1);
                }
                
                // Thêm option mới
                this.products.forEach(product => {
                    const option = document.createElement('option');
                    option.value = product.id;
                    option.textContent = `${product.name} (Tồn: ${product.stock || 0})`;
                    select.appendChild(option);
                });
                
                // Khôi phục giá trị đang chọn
                select.value = currentValue;
            });
        }
    }

    // Thiết lập event listeners
    setupEventListeners() {
        // Ngày báo cáo
        const reportDate = document.getElementById('reportDate');
        if (reportDate) {
            reportDate.addEventListener('change', () => this.onDateChange());
        }
        
        // Nút hôm nay
        const todayBtn = document.getElementById('todayBtn');
        if (todayBtn) {
            todayBtn.addEventListener('click', () => this.setToday());
        }
        
        // Nút ngày trước/tiếp
        const prevDayBtn = document.getElementById('prevDayBtn');
        const nextDayBtn = document.getElementById('nextDayBtn');
        if (prevDayBtn) prevDayBtn.addEventListener('click', () => this.changeDate(-1));
        if (nextDayBtn) nextDayBtn.addEventListener('click', () => this.changeDate(1));
        
        // Các input tính toán
        const revenueInput = document.getElementById('revenue');
        const closingBalanceInput = document.getElementById('closingBalance');
        
        if (revenueInput) {
            revenueInput.addEventListener('input', () => this.calculateProfit());
        }
        
        if (closingBalanceInput) {
            closingBalanceInput.addEventListener('input', () => this.calculateProfit());
        }
        
        // Nút chi phí
        const expensesBtn = document.getElementById('expensesBtn');
        if (expensesBtn) {
            expensesBtn.addEventListener('click', () => this.openExpensesModal());
        }
        
        // Nút chuyển khoản
        const transfersBtn = document.getElementById('transfersBtn');
        if (transfersBtn) {
            transfersBtn.addEventListener('click', () => this.openTransfersModal());
        }
        
        // Nút kho hàng
        const toggleInventoryBtn = document.getElementById('toggleInventoryBtn');
        if (toggleInventoryBtn) {
            toggleInventoryBtn.addEventListener('click', () => this.toggleInventorySection());
        }
        
        // Nút thêm hàng
        const addInventoryItemBtn = document.getElementById('addInventoryItemBtn');
        if (addInventoryItemBtn) {
            addInventoryItemBtn.addEventListener('click', () => this.addInventoryItem());
        }
        
        // Nút lưu báo cáo
        const saveReportBtn = document.getElementById('saveReportBtn');
if (saveReportBtn) {
    saveReportBtn.addEventListener('click', () => this.saveReport());
}
        
        // Nút lịch sử
        const viewHistoryBtn = document.getElementById('viewHistoryBtn');
        if (viewHistoryBtn) {
            viewHistoryBtn.addEventListener('click', () => this.viewHistory());
        }
    const refreshInventoryBtn = document.getElementById('refreshInventory');
    if (refreshInventoryBtn) {
        refreshInventoryBtn.addEventListener('click', () => this.loadInventoryTable());
    }
    
    // Reset today output button
    const resetOutputBtn = document.getElementById('resetTodayOutput');
    if (resetOutputBtn) {
        resetOutputBtn.addEventListener('click', () => this.resetTodayOutput());
    }
    
    // Load inventory table khi mở section
    const inventorySection = document.getElementById('inventorySection');
    if (inventorySection && inventorySection.style.display !== 'none') {
        this.loadInventoryTable();
    }
}
resetForm() {
    const revenueInput = document.getElementById('revenue');
    const closingBalanceInput = document.getElementById('closingBalance');
    const actualProfitInput = document.getElementById('actualProfit');
    
    if (revenueInput) revenueInput.value = '';
    if (closingBalanceInput) closingBalanceInput.value = '';
    if (actualProfitInput) actualProfitInput.value = '';
    
    // Reset chi phí và chuyển khoản
    this.currentReport.expenses = [];
    this.currentReport.transfers = [];
    this.currentReport.inventory = [];
    
    this.updateExpensesSummary();
    this.updateTransfersSummary();
    
    // Cập nhật bảng kho hàng
    this.loadInventoryTable();
}
loadReportIntoForm(report) {
    if (!report) return;
    
    // Cập nhật dữ liệu hiện tại
    this.currentReport = JSON.parse(JSON.stringify(report));
    
    // Cập nhật các trường input
    const revenueInput = document.getElementById('revenue');
    const closingBalanceInput = document.getElementById('closingBalance');
    const actualProfitInput = document.getElementById('actualProfit');
    
    if (revenueInput) revenueInput.value = report.revenue || 0;
    if (closingBalanceInput) closingBalanceInput.value = report.closingBalance || 0;
    if (actualProfitInput) actualProfitInput.value = report.actualProfit || 0;
    
    // Cập nhật chi phí và chuyển khoản
    this.updateExpensesList();
    this.updateTransfersList();
    
    // Cập nhật kho hàng
    this.loadInventoryTable(); // Thay thế loadInventoryItems
    
    // Hiển thị thông báo
    this.showStatus('Đã tải báo cáo vào form');
}
toggleInventorySection() {
    const inventorySection = document.getElementById('inventorySection');
    const inventoryToggleIcon = document.getElementById('inventoryToggleIcon');
    
    if (inventorySection) {
        if (inventorySection.style.display === 'none') {
            inventorySection.style.display = 'block';
            if (inventoryToggleIcon) inventoryToggleIcon.textContent = '▲';
            // Tải bảng kho hàng khi mở
            this.loadInventoryTable();
        } else {
            inventorySection.style.display = 'none';
            if (inventoryToggleIcon) inventoryToggleIcon.textContent = '▼';
        }
    }
}
    // Cập nhật ngày hiện tại
    updateDate() {
        const today = new Date().toISOString().split('T')[0];
        const reportDate = document.getElementById('reportDate');
        
        if (reportDate) {
            reportDate.value = today;
            this.currentReport.date = today;
            this.onDateChange();
        }
    }

    // Đặt ngày hôm nay
    setToday() {
        const today = new Date().toISOString().split('T')[0];
        const reportDate = document.getElementById('reportDate');
        
        if (reportDate) {
            reportDate.value = today;
            this.onDateChange();
        }
    }

    // Thay đổi ngày
    changeDate(days) {
        const reportDate = document.getElementById('reportDate');
        
        if (reportDate && reportDate.value) {
            const currentDate = new Date(reportDate.value);
            currentDate.setDate(currentDate.getDate() + days);
            
            const newDate = currentDate.toISOString().split('T')[0];
            reportDate.value = newDate;
            this.onDateChange();
        }
    }

    // Xử lý khi thay đổi ngày
    async onDateChange() {
        const reportDate = document.getElementById('reportDate');
        
        if (!reportDate || !reportDate.value) {
            return;
        }
        
        const selectedDate = reportDate.value;
        this.currentReport.date = selectedDate;
        
        // Tải báo cáo của ngày trước đó để lấy số dư đầu kỳ
        await this.loadPreviousDayReport(selectedDate);
        
        // Tải báo cáo của ngày hiện tại
        await this.loadCurrentDayReports(selectedDate);
        
        // Cập nhật tổng kết kho
        this.updateInventorySummary();
        
        // Tính toán lại lãi lỗ
        this.calculateProfit();
    }

    // Tải báo cáo ngày trước đó
    async loadPreviousDayReport(date) {
        try {
            const previousReport = await dataManager.getPreviousDayReport(date);
            const openingBalanceInput = document.getElementById('openingBalance');
            
            if (previousReport && openingBalanceInput) {
                openingBalanceInput.value = previousReport.closingBalance || 0;
                this.currentReport.openingBalance = previousReport.closingBalance || 0;
            } else {
                openingBalanceInput.value = 0;
                this.currentReport.openingBalance = 0;
            }
        } catch (error) {
            console.error('Lỗi tải báo cáo ngày trước:', error);
            
            const openingBalanceInput = document.getElementById('openingBalance');
            if (openingBalanceInput) {
                openingBalanceInput.value = 0;
                this.currentReport.openingBalance = 0;
            }
        }
    }

    // Tải báo cáo ngày hiện tại
async loadCurrentDayReports(date) {
    try {
        const reports = await dataManager.getReportsByDate(date);
        const reportsList = document.getElementById('reportsList');
        
        if (reportsList) {
            if (reports.length === 0) {
                reportsList.innerHTML = `
                    <div class="no-reports-message">
                        <i class="fas fa-file-alt"></i>
                        <p>Chưa có báo cáo nào cho ngày ${this.formatDateDisplay(date)}</p>
                        <small>Tạo báo cáo mới bằng cách nhập thông tin và bấm "Lưu báo cáo"</small>
                    </div>
                `;
                
                // Reset form
                this.resetForm();
            } else {
                // Hiển thị danh sách báo cáo
                reportsList.innerHTML = `
                    <div class="reports-header">
                        <h4>${reports.length} báo cáo cho ngày ${this.formatDateDisplay(date)}</h4>
                        <small>Click vào báo cáo để tải vào form chỉnh sửa</small>
                    </div>
                `;
                
                reports.forEach(report => {
                    const reportElement = this.createReportElement(report);
                    reportsList.appendChild(reportElement);
                });
                
                // Tải báo cáo mới nhất vào form
                const latestReport = reports[0];
                this.loadReportIntoForm(latestReport);
            }
        }
    } catch (error) {
        console.error('Lỗi tải báo cáo ngày hiện tại:', error);
        
        const reportsList = document.getElementById('reportsList');
        if (reportsList) {
            reportsList.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Lỗi tải báo cáo: ${error.message}</p>
                    <button onclick="reportsManager.loadCurrentDayReports('${date}')">Thử lại</button>
                </div>
            `;
        }
    }
}
// Định dạng ngày hiển thị
formatDateDisplay(dateString) {
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return dateString; // Trả về nguyên bản nếu không parse được
        }
        
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const isToday = date.toDateString() === today.toDateString();
        const isYesterday = date.toDateString() === yesterday.toDateString();
        
        if (isToday) {
            return 'Hôm nay';
        } else if (isYesterday) {
            return 'Hôm qua';
        } else {
            return date.toLocaleDateString('vi-VN', {
                weekday: 'short',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        }
    } catch (error) {
        console.error('Lỗi định dạng ngày:', error);
        return dateString;
    }
}

    // Tạo element hiển thị báo cáo - Sửa lỗi định dạng ngày
createReportElement(report) {
    const div = document.createElement('div');
    div.className = 'report-card';
    
    // Sửa: Kiểm tra và định dạng thời gian an toàn
    let timeDisplay = 'Không có thời gian';
    if (report.timestamp) {
        try {
            const date = new Date(report.timestamp);
            if (!isNaN(date.getTime())) {
                timeDisplay = date.toLocaleString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
            }
        } catch (error) {
            console.error('Lỗi định dạng thời gian:', error);
        }
    }
    
    const editedBadge = report.edited ? '<span class="edited-badge">(Đã sửa)</span>' : '';
    
    div.innerHTML = `
        <h4>Báo cáo lúc ${timeDisplay} ${editedBadge}</h4>
        <p><strong>Doanh thu:</strong> ${this.formatCurrency(report.revenue || 0)}</p>
        <p><strong>Chi phí:</strong> ${this.formatCurrency(this.calculateTotal(report.expenses))}</p>
        <p><strong>Chuyển khoản:</strong> ${this.formatCurrency(this.calculateTotal(report.transfers))}</p>
        <p><strong>Số dư cuối:</strong> ${this.formatCurrency(report.closingBalance || 0)}</p>
        <p><strong>Thực lãnh:</strong> <span class="profit ${(report.actualProfit || 0) >= 0 ? 'positive' : 'negative'}">${this.formatCurrency(report.actualProfit || 0)}</span></p>
        <p class="timestamp">${report.inventory && report.inventory.length > 0 ? report.inventory.length + ' mặt hàng xuất kho' : 'Không xuất kho'}</p>
        <button class="small-btn load-report-btn" data-id="${report.id}">Tải báo cáo này</button>
        <button class="small-btn delete-report-btn" data-id="${report.id}">Xóa</button>
    `;
    
    // Thêm event listener cho nút tải báo cáo
    const loadBtn = div.querySelector('.load-report-btn');
    if (loadBtn) {
        loadBtn.addEventListener('click', () => {
            this.loadReportIntoForm(report);
        });
    }
    
    // Thêm event listener cho nút xóa
    const deleteBtn = div.querySelector('.delete-report-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Bạn có chắc chắn muốn xóa báo cáo này?')) {
                this.deleteReport(report.id);
            }
        });
    }
    
    // Thêm event click cho toàn bộ card để tải báo cáo
    div.addEventListener('click', (e) => {
        // Chỉ tải nếu không click vào nút
        if (!e.target.closest('button')) {
            this.loadReportIntoForm(report);
        }
    });
    
    return div;
}
// Xóa báo cáo
async deleteReport(reportId) {
    try {
        if (!confirm('Bạn có chắc chắn muốn xóa báo cáo này?')) {
            return;
        }
        
        if (!dataManager || !dataManager.db) {
            throw new Error('Database chưa được khởi tạo');
        }
        
        const transaction = dataManager.db.transaction(['reports'], 'readwrite');
        const store = transaction.objectStore('reports');
        const request = store.delete(reportId);
        
        request.onsuccess = () => {
            this.showStatus('Đã xóa báo cáo');
            
            // Tải lại danh sách báo cáo
            const reportDate = document.getElementById('reportDate');
            if (reportDate && reportDate.value) {
                this.loadCurrentDayReports(reportDate.value);
            }
        };
        
        request.onerror = (event) => {
            throw new Error('Lỗi xóa báo cáo: ' + event.target.error);
        };
        
    } catch (error) {
        console.error('Lỗi xóa báo cáo:', error);
        this.showStatus(`Lỗi xóa báo cáo: ${error.message}`, 'error');
    }
}
    



    // Tính toán lãi lỗ
    calculateProfit() {
        // Lấy giá trị từ form
        const openingBalance = parseFloat(document.getElementById('openingBalance').value) || 0;
        const revenue = parseFloat(document.getElementById('revenue').value) || 0;
        const closingBalance = parseFloat(document.getElementById('closingBalance').value) || 0;
        
        // Tính tổng chi phí và chuyển khoản
        const totalExpenses = this.calculateTotal(this.currentReport.expenses);
        const totalTransfers = this.calculateTotal(this.currentReport.transfers);
        
        // Tính thực lãnh: số dư đầu + doanh thu - tổng chi phí - tổng chuyển khoản - số dư cuối
        const actualProfit = openingBalance + revenue - totalExpenses - totalTransfers - closingBalance;
        
        // Cập nhật input
        const actualProfitInput = document.getElementById('actualProfit');
        if (actualProfitInput) {
            actualProfitInput.value = actualProfit.toFixed(0);
        }
        
        // Cập nhật dữ liệu hiện tại
        this.currentReport.openingBalance = openingBalance;
        this.currentReport.revenue = revenue;
        this.currentReport.closingBalance = closingBalance;
        this.currentReport.actualProfit = actualProfit;
        
        return actualProfit;
    }

    // Tính tổng từ mảng các đối tượng có thuộc tính amount
    calculateTotal(items) {
        if (!Array.isArray(items)) return 0;
        
        return items.reduce((total, item) => {
            return total + (parseFloat(item.amount) || 0);
        }, 0);
    }

    // Mở modal chi phí
    openExpensesModal() {
        const modal = document.getElementById('expensesModal');
        if (modal) {
            modal.style.display = 'block';
            this.updateExpensesModal();
        }
    }

    // Cập nhật modal chi phí
    updateExpensesModal() {
        const expensesList = document.getElementById('expensesList');
        const modalExpensesTotal = document.getElementById('modalExpensesTotal');
        
        if (expensesList) {
            expensesList.innerHTML = '';
            
            this.currentReport.expenses.forEach((expense, index) => {
                const row = document.createElement('div');
                row.className = 'item-row';
                row.innerHTML = `
                    <span class="item-name">${expense.name || 'Không tên'}</span>
                    <span class="item-amount">${this.formatCurrency(expense.amount || 0)}</span>
                    <div class="item-actions">
                        <button class="delete-item" data-index="${index}"><i class="fas fa-trash"></i></button>
                    </div>
                `;
                
                expensesList.appendChild(row);
            });
            
            // Thêm event listeners cho nút xóa
            expensesList.querySelectorAll('.delete-item').forEach(button => {
                button.addEventListener('click', (e) => {
                    const index = parseInt(e.currentTarget.getAttribute('data-index'));
                    this.removeExpense(index);
                });
            });
        }
        
        if (modalExpensesTotal) {
            const total = this.calculateTotal(this.currentReport.expenses);
            modalExpensesTotal.textContent = this.formatCurrency(total);
        }
    }

    // Thêm chi phí
    async addExpense() {
        const expenseNameInput = document.getElementById('expenseName');
        const expenseAmountInput = document.getElementById('expenseAmount');
        
        if (!expenseNameInput || !expenseAmountInput) return;
        
        const name = expenseNameInput.value.trim();
        const amount = parseFloat(expenseAmountInput.value);
        
        if (!name || isNaN(amount) || amount <= 0) {
            this.showStatus('Vui lòng nhập tên và số tiền hợp lệ', 'error');
            return;
        }
        
        // Thêm vào danh sách
        this.currentReport.expenses.push({
            name: name,
            amount: amount
        });
        
        // Lưu làm mẫu nếu chưa có
        try {
            await dataManager.saveExpenseTemplate(name);
            await this.loadTemplates(); // Tải lại danh sách mẫu
        } catch (error) {
            console.error('Lỗi lưu mẫu chi phí:', error);
        }
        
        // Cập nhật UI
        this.updateExpensesModal();
        this.updateExpensesSummary();
        this.calculateProfit();
        
        // Reset input
        expenseNameInput.value = '';
        expenseAmountInput.value = '';
        
        // Focus lại input tên
        expenseNameInput.focus();
        
        this.showStatus('Đã thêm chi phí');
    }

    // Xóa chi phí
    removeExpense(index) {
        if (index >= 0 && index < this.currentReport.expenses.length) {
            this.currentReport.expenses.splice(index, 1);
            this.updateExpensesModal();
            this.updateExpensesSummary();
            this.calculateProfit();
            this.showStatus('Đã xóa chi phí');
        }
    }

    // Cập nhật tổng kết chi phí
    updateExpensesSummary() {
        const total = this.calculateTotal(this.currentReport.expenses);
        const count = this.currentReport.expenses.length;
        
        const expensesTotal = document.getElementById('expensesTotal');
        const expensesCount = document.getElementById('expensesCount');
        
        if (expensesTotal) {
            expensesTotal.textContent = this.formatCurrency(total);
        }
        
        if (expensesCount) {
            expensesCount.textContent = `(${count} khoản)`;
        }
    }

    // Mở modal chuyển khoản
    openTransfersModal() {
        const modal = document.getElementById('transfersModal');
        if (modal) {
            modal.style.display = 'block';
            this.updateTransfersModal();
        }
    }

    // Cập nhật modal chuyển khoản
    updateTransfersModal() {
        const transfersList = document.getElementById('transfersList');
        const modalTransfersTotal = document.getElementById('modalTransfersTotal');
        
        if (transfersList) {
            transfersList.innerHTML = '';
            
            this.currentReport.transfers.forEach((transfer, index) => {
                const row = document.createElement('div');
                row.className = 'item-row';
                row.innerHTML = `
                    <span class="item-name">${transfer.name || 'Không tên'}</span>
                    <span class="item-amount">${this.formatCurrency(transfer.amount || 0)}</span>
                    <div class="item-actions">
                        <button class="delete-item" data-index="${index}"><i class="fas fa-trash"></i></button>
                    </div>
                `;
                
                transfersList.appendChild(row);
            });
            
            // Thêm event listeners cho nút xóa
            transfersList.querySelectorAll('.delete-item').forEach(button => {
                button.addEventListener('click', (e) => {
                    const index = parseInt(e.currentTarget.getAttribute('data-index'));
                    this.removeTransfer(index);
                });
            });
        }
        
        if (modalTransfersTotal) {
            const total = this.calculateTotal(this.currentReport.transfers);
            modalTransfersTotal.textContent = this.formatCurrency(total);
        }
    }

    // Thêm chuyển khoản
    async addTransfer() {
        const transferNameInput = document.getElementById('transferName');
        const transferAmountInput = document.getElementById('transferAmount');
        
        if (!transferNameInput || !transferAmountInput) return;
        
        const name = transferNameInput.value.trim();
        const amount = parseFloat(transferAmountInput.value);
        
        if (isNaN(amount) || amount <= 0) {
            this.showStatus('Vui lòng nhập số tiền hợp lệ', 'error');
            return;
        }
        
        // Thêm vào danh sách (cho phép tên rỗng)
        this.currentReport.transfers.push({
            name: name || 'Chuyển khoản',
            amount: amount
        });
        
        // Lưu làm mẫu nếu có tên và chưa có
        if (name) {
            try {
                await dataManager.saveTransferTemplate(name);
                await this.loadTemplates(); // Tải lại danh sách mẫu
            } catch (error) {
                console.error('Lỗi lưu mẫu chuyển khoản:', error);
            }
        }
        
        // Cập nhật UI
        this.updateTransfersModal();
        this.updateTransfersSummary();
        this.calculateProfit();
        
        // Reset input
        transferNameInput.value = '';
        transferAmountInput.value = '';
        
        // Focus lại input số tiền
        transferAmountInput.focus();
        
        this.showStatus('Đã thêm chuyển khoản');
    }

    // Xóa chuyển khoản
    removeTransfer(index) {
        if (index >= 0 && index < this.currentReport.transfers.length) {
            this.currentReport.transfers.splice(index, 1);
            this.updateTransfersModal();
            this.updateTransfersSummary();
            this.calculateProfit();
            this.showStatus('Đã xóa chuyển khoản');
        }
    }

    // Cập nhật tổng kết chuyển khoản
    updateTransfersSummary() {
        const total = this.calculateTotal(this.currentReport.transfers);
        const count = this.currentReport.transfers.length;
        
        const transfersTotal = document.getElementById('transfersTotal');
        const transfersCount = document.getElementById('transfersCount');
        
        if (transfersTotal) {
            transfersTotal.textContent = this.formatCurrency(total);
        }
        
        if (transfersCount) {
            transfersCount.textContent = `(${count} khoản)`;
        }
    }

   

    // Thêm item kho hàng
    addInventoryItem(productId = '', quantity = '') {
        const inventoryItems = document.getElementById('inventoryItems');
        
        if (!inventoryItems) return;
        
        const itemDiv = document.createElement('div');
        itemDiv.className = 'inventory-item';
        itemDiv.dataset.productId = productId || '';
        
        // Tạo select sản phẩm
        const select = document.createElement('select');
        select.className = 'product-select';
        
        // Thêm option mặc định
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '-- Chọn sản phẩm --';
        select.appendChild(defaultOption);
        
        // Thêm các option sản phẩm
        this.products.forEach(product => {
            const option = document.createElement('option');
            option.value = product.id;
            option.textContent = `${product.name} (Tồn: ${product.stock || 0})`;
            
            if (product.id === productId) {
                option.selected = true;
            }
            
            select.appendChild(option);
        });
        
        // Tạo input số lượng
        const input = document.createElement('input');
        input.type = 'number';
        input.min = '0';
        input.value = quantity || '0';
        input.placeholder = 'Số lượng';
        
        // Tạo nút điều khiển số lượng
        const quantityControls = document.createElement('div');
        quantityControls.className = 'quantity-controls';
        
        const decrementBtn = document.createElement('button');
        decrementBtn.type = 'button';
        decrementBtn.className = 'quantity-btn';
        decrementBtn.innerHTML = '<i class="fas fa-minus"></i>';
        decrementBtn.addEventListener('click', () => {
            const currentValue = parseInt(input.value) || 0;
            if (currentValue > 0) {
                input.value = currentValue - 1;
                this.updateInventoryItem(itemDiv);
            }
        });
        
        const incrementBtn = document.createElement('button');
        incrementBtn.type = 'button';
        incrementBtn.className = 'quantity-btn';
        incrementBtn.innerHTML = '<i class="fas fa-plus"></i>';
        incrementBtn.addEventListener('click', () => {
            const currentValue = parseInt(input.value) || 0;
            input.value = currentValue + 1;
            this.updateInventoryItem(itemDiv);
        });
        
        // Tạo nút xóa
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'delete-item-btn';
        deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
        deleteBtn.addEventListener('click', () => {
            this.removeInventoryItem(itemDiv);
        });
        
        // Thêm event listener cho select và input
        select.addEventListener('change', () => {
            itemDiv.dataset.productId = select.value;
            this.updateInventoryItem(itemDiv);
        });
        
        input.addEventListener('input', () => {
            this.updateInventoryItem(itemDiv);
        });
        
        // Thêm click event cho toàn bộ dòng
        itemDiv.addEventListener('click', (e) => {
            // Chỉ focus input nếu click không phải vào các nút
            if (!e.target.closest('button') && !e.target.closest('select')) {
                input.focus();
            }
        });
        
        // Lắp ráp các thành phần
        quantityControls.appendChild(decrementBtn);
        quantityControls.appendChild(input);
        quantityControls.appendChild(incrementBtn);
        
        itemDiv.appendChild(select);
        itemDiv.appendChild(quantityControls);
        itemDiv.appendChild(deleteBtn);
        
        inventoryItems.appendChild(itemDiv);
        
        // Cập nhật danh sách kho
        this.updateInventoryItem(itemDiv);
    }

    // Cập nhật item kho hàng
    updateInventoryItem(itemDiv) {
        const select = itemDiv.querySelector('.product-select');
        const input = itemDiv.querySelector('input');
        
        const productId = select.value;
        const quantity = parseInt(input.value) || 0;
        
        // Cập nhật dữ liệu hiện tại
        const existingIndex = this.currentReport.inventory.findIndex(item => item.productId === productId);
        
        if (productId && quantity > 0) {
            // Tìm sản phẩm để lấy thông tin
            const product = this.products.find(p => p.id === parseInt(productId));
            
            if (product) {
                const inventoryItem = {
                    productId: parseInt(productId),
                    productName: product.name,
                    quantity: quantity,
                    price: product.price || 0,
                    stockBefore: product.stock || 0
                };
                
                if (existingIndex >= 0) {
                    // Cập nhật item đã tồn tại
                    this.currentReport.inventory[existingIndex] = inventoryItem;
                } else {
                    // Thêm item mới
                    this.currentReport.inventory.push(inventoryItem);
                }
            }
        } else if (existingIndex >= 0) {
            // Xóa item nếu không có sản phẩm hoặc số lượng = 0
            this.currentReport.inventory.splice(existingIndex, 1);
        }
        
        // Cập nhật tổng kết kho
        this.updateInventorySummary();
    }

    // Xóa item kho hàng
    removeInventoryItem(itemDiv) {
        const productId = itemDiv.dataset.productId;
        
        // Xóa khỏi dữ liệu hiện tại
        const existingIndex = this.currentReport.inventory.findIndex(item => item.productId === parseInt(productId));
        if (existingIndex >= 0) {
            this.currentReport.inventory.splice(existingIndex, 1);
        }
        
        // Xóa khỏi DOM
        itemDiv.remove();
        
        // Cập nhật tổng kết kho
        this.updateInventorySummary();
    }

    // Xóa tất cả items kho hàng
    clearInventoryItems() {
        const inventoryItems = document.getElementById('inventoryItems');
        if (inventoryItems) {
            inventoryItems.innerHTML = '';
        }
        this.currentReport.inventory = [];
    }

    // Tải items kho hàng từ dữ liệu
    loadInventoryItems(inventory) {
        // Xóa items hiện tại
        this.clearInventoryItems();
        
        // Thêm items mới
        inventory.forEach(item => {
            this.addInventoryItem(item.productId, item.quantity);
        });
    }

    // Cập nhật tổng kết kho
    updateInventorySummary() {
        const summaryList = document.getElementById('inventorySummaryList');
        
        if (!summaryList) return;
        
        if (this.currentReport.inventory.length === 0) {
            summaryList.innerHTML = '<p class="no-items">Chưa có sản phẩm nào được xuất kho</p>';
            return;
        }
        
        summaryList.innerHTML = '';
        
        this.currentReport.inventory.forEach(item => {
            const product = this.products.find(p => p.id === item.productId);
            const stockAfter = product ? (product.stock || 0) - item.quantity : 0;
            
            const div = document.createElement('div');
            div.className = 'summary-item';
            div.innerHTML = `
                <span>${item.productName}</span>
                <span>${item.quantity} (Tồn: ${stockAfter})</span>
            `;
            
            summaryList.appendChild(div);
        });
    }

// Lưu báo cáo - Phiên bản FIXED (vẫn giữ loadCurrentDayReports)
async saveReport() {
    // THÊM: Kiểm tra chống double-click ngay từ đầu
    if (this.isSaving) {
        this.showStatus('Đang lưu, vui lòng đợi...', 'warning');
        return;
    }
    
    try {
        // Set flag đang lưu
        this.isSaving = true;
        
        // 1. Lấy dữ liệu từ form
        const revenue = parseFloat(document.getElementById('revenue').value) || 0;
        const closingBalance = parseFloat(document.getElementById('closingBalance').value) || 0;
        
        // 2. Chuẩn bị dữ liệu báo cáo
        const reportData = {
            date: this.currentReport.date,
            openingBalance: this.currentReport.openingBalance,
            revenue: revenue,
            expenses: this.currentReport.expenses,
            transfers: this.currentReport.transfers,
            closingBalance: closingBalance,
            inventory: this.currentReport.inventory,
            actualProfit: this.currentReport.actualProfit,
            totalExpenses: this.calculateTotal(this.currentReport.expenses),
            totalTransfers: this.calculateTotal(this.currentReport.transfers)
        };
        
        // 3. Tính toán lại lãi lỗ
        this.calculateProfit();
        reportData.actualProfit = this.currentReport.actualProfit;
        
        // 4. Lưu vào local database
        const savedReport = await dataManager.saveReport(reportData);
        
        // 5. Cập nhật tồn kho nếu có
        if (reportData.inventory && reportData.inventory.length > 0) {
            await this.updateProductStocks();
        }
        
        // 6. ĐỒNG BỘ VỚI GITHUB - THÊM THÔNG TIN INVENTORY ĐẦY ĐỦ
        if (githubManager && githubManager.initialized) {
            try {
                // Chờ 10ms để đảm bảo timestamp khác nhau
                await new Promise(resolve => setTimeout(resolve, 10));
                
                // Đảm bảo inventory đầy đủ trong dữ liệu gửi lên GitHub
                const reportForGitHub = {
                    ...savedReport,
                    // Đảm bảo inventory là array
                    inventory: Array.isArray(savedReport.inventory) ? savedReport.inventory : [],
                    // Thêm metadata để debug
                    _localId: savedReport.id,
                    _inventoryCount: savedReport.inventory ? savedReport.inventory.length : 0,
                    _savedAt: new Date().toISOString()
                };
                
                const githubResult = await githubManager.saveReportToGitHub(reportForGitHub);
                
                if (githubResult.success) {
                    console.log('✅ GitHub:', githubResult.message, githubResult.fileName, 
                                `(${githubResult.inventoryCount || 0} mặt hàng)`);
                } else {
                    console.warn('⚠️ GitHub:', githubResult.message);
                }
            } catch (githubError) {
                console.warn('⚠️ Lỗi GitHub (đã bỏ qua):', githubError.message);
                // KHÔNG ảnh hưởng đến lưu local
            }
        }
        
        // 7. Hiển thị thông báo
        const inventoryCount = reportData.inventory ? reportData.inventory.length : 0;
        this.showStatus(`✅ Đã lưu báo cáo thành công (${inventoryCount} mặt hàng)`);
        
        // 8. Tải lại danh sách báo cáo - CHỈ GỌI 1 LẦN
        console.log('🔄 Tải lại danh sách báo cáo...');
        await this.loadCurrentDayReports(reportData.date);
        
        return savedReport;
        
    } catch (error) {
        console.error('❌ Lỗi lưu báo cáo:', error);
        this.showStatus(`❌ Lỗi: ${error.message}`, 'error');
        throw error;
    } finally {
        // Reset flag sau 2 giây
        setTimeout(() => {
            this.isSaving = false;
            console.log('✅ Reset isSaving flag');
        }, 2000);
    }
}

    // Cập nhật tồn kho sản phẩm
async updateProductStocks() {
    try {
        if (!this.currentReport.inventory || this.currentReport.inventory.length === 0) {
            return;
        }
        
        for (const item of this.currentReport.inventory) {
            if (item.productId && item.quantity > 0) {
                // Giảm số lượng tồn kho
                await dataManager.updateProductStock(item.productId, -item.quantity);
            }
        }
        
        // Tải lại danh sách sản phẩm
        await this.loadProducts();
        
        this.showStatus('Đã cập nhật tồn kho sản phẩm');
    } catch (error) {
        console.error('Lỗi cập nhật tồn kho:', error);
        this.showStatus(`Lỗi cập nhật tồn kho: ${error.message}`, 'error');
    }
}

    // Xem lịch sử
    async viewHistory() {
        try {
            const modal = document.getElementById('historyModal');
            const historyList = document.getElementById('historyList');
            
            if (!modal || !historyList) return;
            
            // Hiển thị modal
            modal.style.display = 'block';
            
            // Hiển thị loading
            historyList.innerHTML = '<p>Đang tải lịch sử...</p>';
            
            // Lấy tất cả báo cáo
            const allReports = await dataManager.getAllReports();
            
            // Nhóm theo ngày
            const reportsByDate = {};
            
            allReports.forEach(report => {
                if (!reportsByDate[report.date]) {
                    reportsByDate[report.date] = [];
                }
                reportsByDate[report.date].push(report);
            });
            
            // Sắp xếp ngày giảm dần
            const sortedDates = Object.keys(reportsByDate).sort((a, b) => {
                return new Date(b) - new Date(a);
            });
            
            // Hiển thị
            if (sortedDates.length === 0) {
                historyList.innerHTML = '<p>Chưa có báo cáo nào.</p>';
                return;
            }
            
            let html = '';
            
            sortedDates.forEach(date => {
                const reports = reportsByDate[date];
                const latestReport = reports[0]; // Báo cáo mới nhất của ngày
                
                html += `
                    <div class="history-day">
                        <h4>${this.formatDate(date)}</h4>
                        <div class="history-day-summary">
                            <p><strong>Doanh thu:</strong> ${this.formatCurrency(latestReport.revenue || 0)}</p>
                            <p><strong>Chi phí:</strong> ${this.formatCurrency(latestReport.totalExpenses || 0)}</p>
                            <p><strong>Chuyển khoản:</strong> ${this.formatCurrency(latestReport.totalTransfers || 0)}</p>
                            <p><strong>Thực lãnh:</strong> ${this.formatCurrency(latestReport.actualProfit || 0)}</p>
                            <p><small>${reports.length} báo cáo (${reports.filter(r => r.edited).length} đã sửa)</small></p>
                        </div>
                    </div>
                `;
            });
            
            historyList.innerHTML = html;
        } catch (error) {
            console.error('Lỗi tải lịch sử:', error);
            const historyList = document.getElementById('historyList');
            if (historyList) {
                historyList.innerHTML = `<p>Lỗi tải lịch sử: ${error.message}</p>`;
            }
        }
    }
// Thêm vào class ReportsManager trong reports.js

// Hàm cập nhật danh sách chi phí trên form
updateExpensesList() {
    const expensesTotal = document.getElementById('expensesTotal');
    const expensesCount = document.getElementById('expensesCount');
    
    if (expensesTotal) {
        expensesTotal.textContent = this.formatCurrency(this.calculateTotal(this.currentReport.expenses));
    }
    
    if (expensesCount) {
        expensesCount.textContent = `(${this.currentReport.expenses.length} khoản)`;
    }
}

// Hàm cập nhật danh sách chuyển khoản trên form
updateTransfersList() {
    const transfersTotal = document.getElementById('transfersTotal');
    const transfersCount = document.getElementById('transfersCount');
    
    if (transfersTotal) {
        transfersTotal.textContent = this.formatCurrency(this.calculateTotal(this.currentReport.transfers));
    }
    
    if (transfersCount) {
        transfersCount.textContent = `(${this.currentReport.transfers.length} khoản)`;
    }
}
    // Định dạng tiền tệ
    formatCurrency(amount) {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    }

    // Định dạng ngày
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    // Hiển thị trạng thái
    showStatus(message, type = 'success') {
        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.textContent = message;
            
            // Thêm class dựa trên type
            statusElement.className = 'status';
            statusElement.classList.add(type);
            
            // Tự động ẩn sau 5 giây
            setTimeout(() => {
                statusElement.textContent = 'Sẵn sàng';
                statusElement.className = 'status';
            }, 5000);
        }
        
        // Cũng log ra console
        console.log(`${type.toUpperCase()}: ${message}`);
    }
    // Tải và hiển thị kho hàng dạng bảng
async loadInventoryTable() {
    try {
        await this.loadProducts();
        const tableBody = document.getElementById('inventoryTableBody');
        const todayOutput = this.getTodayOutput();
        
        if (!tableBody) return;
        
        if (this.products.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center">
                        <i class="fas fa-box-open"></i>
                        <p>Chưa có sản phẩm nào trong kho</p>
                        <small>Thêm sản phẩm trong tab Quản lý sản phẩm</small>
                    </td>
                </tr>
            `;
            return;
        }
        
        let html = '';
        let totalOutput = 0;
        
        this.products.forEach(product => {
            const todayQty = todayOutput[product.id] || 0;
            totalOutput += todayQty;
            
            // Xác định trạng thái tồn kho
            let stockClass = 'high';
            if (product.stock <= 0) {
                stockClass = 'out';
            } else if (product.stock <= 10) {
                stockClass = 'low';
            }
            
            html += `
                <tr data-product-id="${product.id}" class="inventory-row">
                    <td class="product-name-cell" onclick="reportsManager.increaseOutput(${product.id})">
                        <div class="product-name">
                            <strong>${product.name}</strong>
                            <small>${this.formatCurrency(product.price || 0)}</small>
                        </div>
                    </td>
                    <td class="stock-cell">
                        <span class="stock-badge ${stockClass}">
                            ${product.stock || 0}
                        </span>
                    </td>
                    <td class="output-cell">
                        <div class="output-controls">
                            <button class="qty-btn decrease" onclick="reportsManager.decreaseOutput(${product.id})" 
                                    ${todayQty <= 0 ? 'disabled' : ''}>
                                <i class="fas fa-minus"></i>
                            </button>
                            <input type="number" 
                                   class="output-qty" 
                                   value="${todayQty}" 
                                   min="0" 
                                   max="${product.stock}"
                                   data-product-id="${product.id}"
                                   onchange="reportsManager.updateOutput(${product.id}, this.value)">
                            <button class="qty-btn increase" onclick="reportsManager.increaseOutput(${product.id})"
                                    ${todayQty >= (product.stock || 0) ? 'disabled' : ''}>
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                        <div class="output-value">
                            ${todayQty > 0 ? `<small>${todayQty} × ${this.formatCurrency(product.price)} = ${this.formatCurrency(todayQty * product.price)}</small>` : ''}
                        </div>
                    </td>
                    <td class="actions-cell">
                        <button class="small-btn" onclick="reportsManager.setMaxOutput(${product.id})"
                                ${(product.stock || 0) <= 0 ? 'disabled' : ''}>
                            <i class="fas fa-arrow-up"></i> Xuất tối đa
                        </button>
                    </td>
                </tr>
            `;
        });
        
        tableBody.innerHTML = html;
        
        // Cập nhật tổng
        const totalElement = document.getElementById('todayTotalOutput');
        if (totalElement) {
            totalElement.textContent = totalOutput;
        }
        
        // Cập nhật báo cáo hiện tại
        this.updateTodayOutputInReport();
        
    } catch (error) {
        console.error('Lỗi tải kho hàng:', error);
        const tableBody = document.getElementById('inventoryTableBody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center error">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Lỗi tải kho hàng: ${error.message}</p>
                        <button onclick="reportsManager.loadInventoryTable()" class="small-btn">Thử lại</button>
                    </td>
                </tr>
            `;
        }
    }
}

// Lấy số lượng xuất hôm nay từ báo cáo hiện tại
getTodayOutput() {
    const output = {};
    
    if (this.currentReport.inventory && Array.isArray(this.currentReport.inventory)) {
        this.currentReport.inventory.forEach(item => {
            if (item.productId && item.quantity > 0) {
                output[item.productId] = item.quantity;
            }
        });
    }
    
    return output;
}

// Tăng số lượng xuất
increaseOutput(productId) {
    const product = this.products.find(p => p.id === productId);
    if (!product) return;
    
    const currentQty = this.getTodayOutput()[productId] || 0;
    const maxQty = product.stock || 0;
    
    if (currentQty < maxQty) {
        this.updateOutput(productId, currentQty + 1);
    }
}

// Giảm số lượng xuất
decreaseOutput(productId) {
    const currentQty = this.getTodayOutput()[productId] || 0;
    if (currentQty > 0) {
        this.updateOutput(productId, currentQty - 1);
    }
}

// Cập nhật số lượng xuất
updateOutput(productId, quantity) {
    const qty = parseInt(quantity) || 0;
    const product = this.products.find(p => p.id === productId);
    
    if (!product) return;
    
    // Giới hạn số lượng
    const maxQty = product.stock || 0;
    const finalQty = Math.min(Math.max(0, qty), maxQty);
    
    // Cập nhật trong currentReport.inventory
    const existingIndex = this.currentReport.inventory.findIndex(
        item => item.productId === productId
    );
    
    if (finalQty > 0) {
        const inventoryItem = {
            productId: productId,
            productName: product.name,
            quantity: finalQty,
            price: product.price || 0,
            stockBefore: product.stock || 0
        };
        
        if (existingIndex >= 0) {
            this.currentReport.inventory[existingIndex] = inventoryItem;
        } else {
            this.currentReport.inventory.push(inventoryItem);
        }
    } else if (existingIndex >= 0) {
        this.currentReport.inventory.splice(existingIndex, 1);
    }
    
    // Cập nhật UI
    this.updateInventoryTableRow(productId, finalQty);
    this.updateTodayOutputInReport();
    this.calculateProfit(); // Tính lại lợi nhuận
}

// Cập nhật hàng trong bảng
updateInventoryTableRow(productId, quantity) {
    const row = document.querySelector(`tr[data-product-id="${productId}"]`);
    if (!row) return;
    
    const product = this.products.find(p => p.id === productId);
    if (!product) return;
    
    // Cập nhật input
    const input = row.querySelector('.output-qty');
    if (input) input.value = quantity;
    
    // Cập nhật nút
    const decreaseBtn = row.querySelector('.decrease');
    const increaseBtn = row.querySelector('.increase');
    if (decreaseBtn) decreaseBtn.disabled = quantity <= 0;
    if (increaseBtn) increaseBtn.disabled = quantity >= (product.stock || 0);
    
    // Cập nhật hiển thị giá trị
    const outputValue = row.querySelector('.output-value');
    if (outputValue) {
        outputValue.innerHTML = quantity > 0 ? 
            `<small>${quantity} × ${this.formatCurrency(product.price)} = ${this.formatCurrency(quantity * product.price)}</small>` : 
            '';
    }
    
    // Cập nhật badge stock
    const stockBadge = row.querySelector('.stock-badge');
    if (stockBadge) {
        let stockClass = 'high';
        if (product.stock <= 0) {
            stockClass = 'out';
        } else if (product.stock <= 10) {
            stockClass = 'low';
        }
        stockBadge.className = `stock-badge ${stockClass}`;
        stockBadge.textContent = product.stock || 0;
    }
    
    // Cập nhật nút xuất tối đa
    const maxBtn = row.querySelector('.small-btn');
    if (maxBtn) {
        maxBtn.disabled = (product.stock || 0) <= 0;
    }
    
    // Cập nhật tổng
    this.updateTotalOutput();
}

// Xuất tối đa
setMaxOutput(productId) {
    const product = this.products.find(p => p.id === productId);
    if (product && product.stock > 0) {
        this.updateOutput(productId, product.stock);
    }
}

// Reset tất cả xuất hôm nay
resetTodayOutput() {
    if (confirm('Reset tất cả số lượng xuất kho hôm nay?')) {
        this.currentReport.inventory = [];
        this.loadInventoryTable();
        this.calculateProfit();
        this.showStatus('Đã reset xuất kho hôm nay');
    }
}

// Cập nhật tổng số lượng xuất
updateTotalOutput() {
    const total = this.calculateTotalOutput();
    const totalElement = document.getElementById('todayTotalOutput');
    if (totalElement) {
        totalElement.textContent = total;
    }
}

calculateTotalOutput() {
    return this.currentReport.inventory.reduce((sum, item) => sum + (item.quantity || 0), 0);
}

// Cập nhật output trong báo cáo
updateTodayOutputInReport() {
    const outputSection = document.getElementById('todayOutputSummary');
    if (!outputSection) return;
    
    const totalItems = this.currentReport.inventory.length;
    const totalQty = this.calculateTotalOutput();
    const totalValue = this.currentReport.inventory.reduce((sum, item) => 
        sum + ((item.quantity || 0) * (item.price || 0)), 0
    );
    
    outputSection.innerHTML = `
        <div class="output-summary">
            <h4><i class="fas fa-box-open"></i> Xuất kho hôm nay</h4>
            <div class="summary-stats">
                <div class="stat-item">
                    <span class="stat-label">Số mặt hàng:</span>
                    <span class="stat-value">${totalItems}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Tổng số lượng:</span>
                    <span class="stat-value">${totalQty}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Tổng giá trị:</span>
                    <span class="stat-value">${this.formatCurrency(totalValue)}</span>
                </div>
            </div>
            ${totalItems > 0 ? `
                <div class="output-items">
                    ${this.currentReport.inventory.map(item => `
                        <div class="output-item">
                            <span>${item.productName}</span>
                            <span>${item.quantity} × ${this.formatCurrency(item.price)}</span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `;
}
}

// Khởi tạo ReportsManager toàn cục
const reportsManager = new ReportsManager();
// Test trực tiếp
document.getElementById('toggleInventoryBtn').addEventListener('click', function() {
    console.log('Manual test: Button clicked!');
    const section = document.getElementById('inventorySection');
    if (section.style.display === 'none') {
        section.style.display = 'block';
        document.getElementById('inventoryToggleIcon').textContent = '▲';
    } else {
        section.style.display = 'none';
        document.getElementById('inventoryToggleIcon').textContent = '▼';
    }
});
// Khởi tạo ReportsManager toàn cục
