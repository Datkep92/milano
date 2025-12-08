// dashboard.js - Dashboard Module với bộ lọc mạnh mẽ và export
class DashboardModule {
    constructor() {
    this.viewMode = 'day';
    this.selectedQuickFilter = 'last7';
    this.startDate = this.formatDateForDisplay(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    this.endDate = this.formatDateForDisplay(new Date());
    this.inventoryStatsCache = null;
    this.cacheTimestamp = null;
    
    // THÊM FLAGS
    this.isRendered = false;
    this.isLoading = false;
    
    // Cache dữ liệu
    this.filteredData = null;
    this.lastFilter = null;
    setTimeout(() => this.loadAllSuggestionsFromReports(), 2000);

    // Lắng nghe sự kiện data updated - NHƯNG KIỂM TRA
    window.addEventListener('dataUpdated', (event) => {
        if (this.isRendered && !this.isLoading) {
            console.log('🔄 Dashboard: Data updated, refreshing...');
            this.clearAllCache();
            if (this.lastFilter) {
                this.applyFilter(this.lastFilter);
            }
        } else {
            console.log('⏸️ Dashboard not ready yet, skipping refresh');
        }
    });
}
    
    // ========== FORMAT DATE ==========
    formatDateForDisplay(date) {
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    }
    
    formatDateForStorage(dateStr) {
        const [day, month, year] = dateStr.split('/').map(Number);
        return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    }
    
    parseDisplayDate(dateStr) {
        const [day, month, year] = dateStr.split('/').map(Number);
        return new Date(year, month - 1, day);
    }
    
    getInputDateValue(dateStr) {
        const [day, month, year] = dateStr.split('/');
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    calculateFilterDates(filterId) {
    console.log(`🔄 Calculating filter dates for: ${filterId}`);
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let start, end;
    
    switch(filterId) {
        case 'today':
            start = today;
            end = today;
            break;
            
        case 'yesterday':
            start = new Date(today);
            start.setDate(start.getDate() - 1);
            end = start;
            break;
            
        case 'last7':
            start = new Date(today);
            start.setDate(start.getDate() - 6);
            end = today;
            break;
            
        case 'last30':
            start = new Date(today);
            start.setDate(start.getDate() - 29);
            end = today;
            break;
            
        case 'thisMonth':
            start = new Date(today.getFullYear(), today.getMonth(), 1);
            end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            break;
            
        case 'lastMonth':
            start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            end = new Date(today.getFullYear(), today.getMonth(), 0);
            break;
            
        case 'custom':
            start = this.parseDisplayDate(this.startDate);
            end = this.parseDisplayDate(this.endDate);
            break;
            
        default:
            start = new Date(today);
            start.setDate(start.getDate() - 6);
            end = today;
    }
    
    console.log(`📅 Filter ${filterId}: ${this.formatDateForDisplay(start)} - ${this.formatDateForDisplay(end)}`);
    return { start, end };
}
    
    getCurrentMonthDates() {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return { start, end };
    }
    
    getLastMonthDates() {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0);
        return { start, end };
    }
    
    // ========== MAIN RENDER ==========
    render() {
    this.isLoading = true;
    
    const mainContent = document.getElementById('mainContent');
    
    mainContent.innerHTML = `
            <div class="dashboard-container">
                <div class="dashboard-header">
                    <h1><i class="fas fa-tachometer-alt"></i> TỔNG QUAN HỆ THỐNG</h1>
                    <div class="header-actions">
                        <button class="btn-small" onclick="window.dashboardModule.exportAll()">
                            <i class="fas fa-file-export"></i> Xuất tất cả
                        </button>
                    </div>
                </div>
                
                ${this.renderFilterSection()}
                
                <!-- TÀI CHÍNH -->
                ${this.renderFinanceSection()}
                
                <!-- HÀNG HÓA & DỊCH VỤ -->
                ${this.renderInventorySection()}
                
                <!-- NHÂN SỰ -->
                ${this.renderEmployeeSection()}
            </div>
        `;
        
        // Sau khi render xong, load data
    setTimeout(() => {
        this.isRendered = true;
        this.isLoading = false;
        
        // Load data với filter hiện tại
        this.applyFilter(this.selectedQuickFilter);
    }, 100);
}
    // Tạo hàm helper an toàn
safeGetElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`⚠️ Element #${id} not found`);
    }
    return element;
}

// Sử dụng trong tất cả các hàm
// HÀM SỬA - UPDATE UI VỚI DOANH THU
updateUI() {
    if (!this.filteredData) return;
    
    const { reports, inventory, employees } = this.filteredData;
    
    // Tính toán tài chính
    const financeStats = this.calculateFinanceStats(reports);
    
    // Cập nhật giá trị - SỬA THÀNH DOANH THU
    this.updateValue('totalActual', financeStats.totalActual);
    this.updateValue('totalTransfers', financeStats.totalTransfers);
    this.updateValue('totalExpenses', financeStats.totalExpenses);
    this.updateValue('receiptRate', financeStats.totalRevenue.toLocaleString() + ' ₫'); // SỬA: Hiển thị doanh thu
    
    this.updateValue('totalPurchases', inventory.totalPurchases);
    this.updateValue('totalServices', inventory.totalServices);
    this.updateValue('inventoryValue', inventory.inventoryValue);
    this.updateValue('productCount', inventory.productCount);
    
    this.updateValue('employeeCount', employees.employeeCount);
    this.updateValue('totalSalary', employees.totalSalary);
    this.updateValue('totalOffDays', employees.totalOffDays);
    this.updateValue('totalOvertime', employees.totalOvertime);
}

    // HÀM SỬA - UPDATE VALUE VỚI XỬ LÝ ĐÚNG
updateValue(elementId, value) {
    const element = document.getElementById(elementId);
    if (!element) {
        console.warn(`⚠️ Element #${elementId} not found`);
        return;
    }
    
    if (typeof value === 'number') {
        if (elementId.includes('Count') || 
            elementId.includes('Days') || 
            elementId.includes('Overtime')) {
            // Hiển thị số nguyên
            element.textContent = Math.round(value);
        } else if (elementId.includes('Rate') || elementId.includes('Percent')) {
            // Hiển thị phần trăm
            element.textContent = value.toFixed(1) + '%';
        } else {
            // Hiển thị tiền tệ
            element.textContent = value.toLocaleString('vi-VN') + ' ₫';
        }
    } else {
        // Hiển thị text bình thường
        element.textContent = value;
    }
}
    // ========== FILTER SECTION ==========
    renderFilterSection() {
        return `
            <div class="filter-section">
                <div class="filter-header">
                    <h3><i class="fas fa-filter"></i> BỘ LỌC THỐNG KÊ</h3>
                    <span class="filter-info">
                        <i class="fas fa-info-circle"></i>
                        Lọc áp dụng cho toàn bộ thống kê bên dưới
                    </span>
                </div>
                
                <div class="quick-filters">
                    <div class="filter-buttons">
                        <button class="filter-btn ${this.selectedQuickFilter === 'today' ? 'active' : ''}" 
                                onclick="window.dashboardModule.applyFilter('today')">
                            <i class="fas fa-calendar-day"></i> Hôm nay
                        </button>
                        <button class="filter-btn ${this.selectedQuickFilter === 'yesterday' ? 'active' : ''}" 
                                onclick="window.dashboardModule.applyFilter('yesterday')">
                            <i class="fas fa-history"></i> Hôm qua
                        </button>
                        <button class="filter-btn ${this.selectedQuickFilter === 'last7' ? 'active' : ''}" 
                                onclick="window.dashboardModule.applyFilter('last7')">
                            <i class="fas fa-calendar-week"></i> 7 ngày
                        </button>
                        <button class="filter-btn ${this.selectedQuickFilter === 'last30' ? 'active' : ''}" 
                                onclick="window.dashboardModule.applyFilter('last30')">
                            <i class="fas fa-calendar-alt"></i> 30 ngày
                        </button>
                        <button class="filter-btn ${this.selectedQuickFilter === 'thisMonth' ? 'active' : ''}" 
                                onclick="window.dashboardModule.applyFilter('thisMonth')">
                            <i class="fas fa-calendar"></i> Tháng này
                        </button>
                        <button class="filter-btn ${this.selectedQuickFilter === 'lastMonth' ? 'active' : ''}" 
                                onclick="window.dashboardModule.applyFilter('lastMonth')">
                            <i class="fas fa-calendar-minus"></i> Tháng trước
                        </button>
                        <button class="filter-btn ${this.selectedQuickFilter === 'custom' ? 'active' : ''}" 
                                onclick="window.dashboardModule.toggleCustomFilter()">
                            <i class="fas fa-cog"></i> Tùy chỉnh
                        </button>
                    </div>
                    
                    <div id="customFilterSection" class="custom-filter" style="display: ${this.selectedQuickFilter === 'custom' ? 'block' : 'none'}">
                        <div class="date-inputs">
                            <div class="input-group">
                                <label>Từ ngày:</label>
                                <input type="date" id="customStartDate" 
                                       value="${this.getInputDateValue(this.startDate)}">
                            </div>
                            <div class="input-group">
                                <label>Đến ngày:</label>
                                <input type="date" id="customEndDate" 
                                       value="${this.getInputDateValue(this.endDate)}">
                            </div>
                            <button class="btn-small apply-btn" onclick="window.dashboardModule.applyCustomFilter()">
                                <i class="fas fa-check"></i> Áp dụng
                            </button>
                        </div>
                    </div>
                    
                    <div class="view-toggle">
                        <span>Hiển thị:</span>
                        <select id="viewModeSelect" onchange="window.dashboardModule.changeViewMode()">
                            <option value="day" ${this.viewMode === 'day' ? 'selected' : ''}>Theo ngày</option>
                            <option value="grouped" ${this.viewMode === 'grouped' ? 'selected' : ''}>Gộp chung</option>
                        </select>
                    </div>
                </div>
                
                <div class="filter-stats">
                    <span class="stat-item">
                        <i class="fas fa-calendar"></i>
                        Khoảng thời gian: <strong>${this.getDateRangeText()}</strong>
                    </span>
                    <span class="stat-item">
                        <i class="fas fa-database"></i>
                        Dữ liệu: <strong id="dataCount">Đang tải...</strong>
                    </span>
                    <button class="btn-small refresh-btn" onclick="window.dashboardModule.refreshData()">
                        <i class="fas fa-sync-alt"></i> Làm mới
                    </button>
                </div>
            </div>
        `;
    }
    
    // HÀM SỬA - RENDER FINANCE SECTION VỚI LABEL DOANH THU
// HÀM SỬA - RENDER FINANCE SECTION VỚI HIỂN THỊ DOANH THU ĐÚNG
renderFinanceSection() {
    return `
        <div class="section-container" id="financeSection">
            <div class="section-header">
                <h2><i class="fas fa-wallet"></i> TỔNG QUAN TÀI CHÍNH</h2>
                <div class="section-actions">
                    <button class="btn-icon" onclick="window.dashboardModule.showFinanceDetails()" title="Xem chi tiết">
                        <i class="fas fa-list"></i>
                    </button>
                    <button class="btn-icon" onclick="window.dashboardModule.exportFinanceExcel()" title="Xuất Excel">
                        <i class="fas fa-file-excel"></i>
                    </button>
                    <button class="btn-icon" onclick="window.dashboardModule.printFinance()" title="In báo cáo">
                        <i class="fas fa-print"></i>
                    </button>
                </div>
            </div>
            
            <div class="summary-cards">
                <div class="summary-card clickable" onclick="window.dashboardModule.showFinanceDetails('actual')">
                    <i class="fas fa-money-bill-wave"></i>
                    <div>
                        <div class="summary-label">Tổng thực nhận</div>
                        <div class="summary-value" id="totalActual">0 ₫</div>
                        <small class="summary-trend" id="actualTrend">Đang tải...</small>
                    </div>
                </div>
                
                <div class="summary-card clickable" onclick="window.dashboardModule.showFinanceDetails('transfers')">
                    <i class="fas fa-university"></i>
                    <div>
                        <div class="summary-label">Tổng chuyển khoản</div>
                        <div class="summary-value" id="totalTransfers">0 ₫</div>
                        <small class="summary-trend" id="transfersTrend">Đang tải...</small>
                    </div>
                    <div class="card-actions">
                        <button class="btn-icon small" onclick="event.stopPropagation(); window.dashboardModule.exportTransfersExcel()" title="Xuất Excel chuyển khoản">
                            <i class="fas fa-file-excel"></i>
                        </button>
                        <button class="btn-icon small" onclick="event.stopPropagation(); window.dashboardModule.printTransfers()" title="In chuyển khoản">
                            <i class="fas fa-print"></i>
                        </button>
                    </div>
                </div>
                
                <div class="summary-card clickable" onclick="window.dashboardModule.showFinanceDetails('expenses')">
                    <i class="fas fa-credit-card"></i>
                    <div>
                        <div class="summary-label">Tổng chi phí</div>
                        <div class="summary-value" id="totalExpenses">0 ₫</div>
                        <small class="summary-trend" id="expensesTrend">Đang tải...</small>
                    </div>
                    <div class="card-actions">
                        <button class="btn-icon small" onclick="event.stopPropagation(); window.dashboardModule.exportExpensesExcel()" title="Xuất Excel chi phí">
                            <i class="fas fa-file-excel"></i>
                        </button>
                        <button class="btn-icon small" onclick="event.stopPropagation(); window.dashboardModule.printExpenses()" title="In chi phí">
                            <i class="fas fa-print"></i>
                        </button>
                    </div>
                </div>
                
                <div class="summary-card clickable" onclick="window.dashboardModule.showRevenueDetails()">
                    <i class="fas fa-chart-line"></i>
                    <div>
                        <div class="summary-label">TỔNG DOANH THU</div>
                        <div class="summary-value" id="totalRevenue">0 ₫</div> <!-- SỬA: đổi id thành totalRevenue -->
                        <small class="summary-trend" id="revenueTrend">Đang tải...</small>
                    </div>
                </div>
            </div>
            
            <div class="detail-placeholder" id="financeDetails">
                <!-- Chi tiết sẽ được load khi click -->
            </div>
        </div>
    `;
}
// THÊM: Hàm gộp chi phí theo category
groupExpensesByCategory(expenses) {
    const categories = {};
    
    expenses.forEach(expense => {
        const category = this.categorizeExpense(expense.name);
        if (!categories[category]) {
            categories[category] = {
                name: category,
                total: 0,
                items: [],
                count: 0
            };
        }
        
        categories[category].total += expense.amount || 0;
        categories[category].items.push(expense);
        categories[category].count++;
    });
    
    // Chuyển thành mảng và sắp xếp theo tổng giảm dần
    return Object.values(categories).sort((a, b) => b.total - a.total);
}

// SỬA: Hàm phân loại chi phí chính xác hơn
categorizeExpense(expenseName) {
    if (!expenseName) return 'Khác';
    
    const name = expenseName.toLowerCase().trim();
    
    // Từ khóa phổ biến trong chi phí quán cà phê
    const categories = [
        {
            name: 'Nguyên liệu',
            keywords: ['cà phê', 'trà', 'sữa', 'đường', 'bột', 'hạt', 'nguyên liệu', 'thực phẩm', 'trái cây', 'trái cây', 'hoa quả']
        },
        {
            name: 'Điện nước',
            keywords: ['điện', 'nước', 'tiền điện', 'tiền nước', 'điện nước']
        },
        {
            name: 'Lương',
            keywords: ['lương', 'tiền lương', 'thưởng', 'phụ cấp', 'tiền công']
        },
        {
            name: 'Vệ sinh',
            keywords: ['vệ sinh', 'dọn dẹp', 'lau chùi', 'tẩy rửa', 'nước rửa', 'khăn']
        },
        {
            name: 'Bao bì',
            keywords: ['ly', 'cốc', 'túi', 'bao bì', 'ống hút', 'nắp', 'đĩa', 'muỗng']
        },
        {
            name: 'Quảng cáo',
            keywords: ['quảng cáo', 'marketing', 'facebook', 'zalo', 'tin nhắn', 'tờ rơi']
        },
        {
            name: 'Sửa chữa',
            keywords: ['sửa', 'sửa chữa', 'bảo trì', 'thay thế', 'máy móc', 'thiết bị']
        },
        {
            name: 'Vận chuyển',
            keywords: ['vận chuyển', 'giao hàng', 'ship', 'grab', 'be', 'now']
        },
        {
            name: 'Thuê mặt bằng',
            keywords: ['thuê', 'mặt bằng', 'tiền thuê', 'thuê nhà']
        },
        {
            name: 'Mạng internet',
            keywords: ['mạng', 'internet', 'wifi', 'data', '3g', '4g']
        }
    ];
    
    // Kiểm tra từng category
    for (const category of categories) {
        for (const keyword of category.keywords) {
            if (name.includes(keyword)) {
                return category.name;
            }
        }
    }
    
    // Phân loại dựa trên mẫu thường gặp
    if (name.includes('đá') || name.includes('nước đá')) return 'Nguyên liệu';
    if (name.includes('cam') || name.includes('chanh') || name.includes('táo')) return 'Nguyên liệu';
    if (name.includes('cơm') || name.includes('phở') || name.includes('bún')) return 'Nguyên liệu';
    if (name.includes('gas') || name.includes('bếp')) return 'Điện nước';
    if (name.includes('rửa') || name.includes('lau')) return 'Vệ sinh';
    if (name.includes('in') || name.includes('ấn')) return 'Quảng cáo';
    if (name.includes('taxi') || name.includes('xe')) return 'Vận chuyển';
    
    return 'Khác';
}
// THÊM: Hàm cho phép chỉnh sửa category
renderGroupedByCategorySection(type, title, icon, categories) {
    if (categories.length === 0) return '';
    
    let totalAmount = 0;
    categories.forEach(cat => totalAmount += cat.total);
    
    return `
        <div class="grouped-section">
            <div class="section-header-with-total">
                <div>
                    <h4><i class="${icon}"></i> ${title.toUpperCase()} THEO DANH MỤC</h4>
                    <small class="section-subtitle">${this.getDateRangeText()} • Click vào category để chỉnh sửa</small>
                </div>
                <div class="section-total-badge">
                    <span>${categories.length} danh mục</span>
                    <strong>${totalAmount.toLocaleString()} ₫</strong>
                </div>
            </div>
            
            <div class="category-actions">
                <button class="btn-small" onclick="window.dashboardModule.mergeAllToCategory('${type}', 'Nguyên liệu')">
                    <i class="fas fa-object-group"></i> Gộp vào Nguyên liệu
                </button>
                <button class="btn-small" onclick="window.dashboardModule.editCategoryNames('${type}')">
                    <i class="fas fa-edit"></i> Chỉnh sửa tên
                </button>
                <button class="btn-small" onclick="window.dashboardModule.exportCategoryReport('${type}')">
                    <i class="fas fa-file-export"></i> Xuất báo cáo
                </button>
            </div>
            
            <div class="category-list">
                ${categories.map((category, index) => `
                    <div class="category-item" id="category-${type}-${index}">
                        <div class="category-header">
                            <div class="category-name clickable" onclick="window.dashboardModule.editCategoryItem('${type}', ${index})">
                                <strong>${category.name}</strong>
                                <small>${category.count} giao dịch • ${((category.total / totalAmount) * 100).toFixed(1)}%</small>
                            </div>
                            <div class="category-total">
                                ${category.total.toLocaleString()} ₫
                            </div>
                        </div>
                        
                        <div class="category-details">
                            <div class="category-items">
                                ${category.items.slice(0, 8).map((item, itemIndex) => `
                                    <div class="category-item-detail">
                                        <span class="item-date">${item.date}</span>
                                        <span class="item-name" title="${item.name || item.content}">
                                            ${this.truncateText(item.name || item.content, 30)}
                                        </span>
                                        <span class="item-amount">${item.amount.toLocaleString()} ₫</span>
                                    </div>
                                `).join('')}
                                
                                ${category.items.length > 8 ? `
                                    <div class="more-items" onclick="window.dashboardModule.showAllCategoryItems('${type}', ${index})">
                                        <i class="fas fa-ellipsis-h"></i>
                                        Xem thêm ${category.items.length - 8} giao dịch
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="category-summary">
                <h5><i class="fas fa-chart-pie"></i> TỔNG HỢP THEO DANH MỤC</h5>
                <table class="summary-table">
                    <thead>
                        <tr>
                            <th>Danh mục</th>
                            <th>Số giao dịch</th>
                            <th>Tổng tiền</th>
                            <th>Tỷ lệ</th>
                            <th>Trung bình/giao dịch</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${categories.map(category => `
                            <tr>
                                <td>
                                    <strong>${category.name}</strong>
                                    ${category.name === 'Khác' ? 
                                        '<span class="badge-warning" style="font-size: 10px; margin-left: 5px;">Cần phân loại</span>' : 
                                        ''}
                                </td>
                                <td>${category.count}</td>
                                <td><strong>${category.total.toLocaleString()} ₫</strong></td>
                                <td>
                                    <div class="progress-container">
                                        <div class="progress-bar" style="width: ${(category.total / totalAmount) * 100}%"></div>
                                        <span>${((category.total / totalAmount) * 100).toFixed(1)}%</span>
                                    </div>
                                </td>
                                <td>${Math.round(category.total / category.count).toLocaleString()} ₫</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr class="summary-total">
                            <td><strong>TỔNG CỘNG</strong></td>
                            <td><strong>${categories.reduce((sum, cat) => sum + cat.count, 0)}</strong></td>
                            <td><strong>${totalAmount.toLocaleString()} ₫</strong></td>
                            <td><strong>100%</strong></td>
                            <td><strong>${Math.round(totalAmount / categories.reduce((sum, cat) => sum + cat.count, 1)).toLocaleString()} ₫</strong></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            
            ${categories.some(cat => cat.name === 'Khác' && cat.count > 0) ? `
                <div class="category-suggestions">
                    <h5><i class="fas fa-lightbulb"></i> GỢI Ý PHÂN LOẠI CHO "KHÁC"</h5>
                    <div class="suggestion-buttons">
                        <button class="btn-suggestion" onclick="window.dashboardModule.reclassifyCategory('${type}', 'Khác', 'Nguyên liệu', ['đá', 'cam', 'chanh', 'táo'])">
                            <i class="fas fa-seedling"></i> Chuyển sang Nguyên liệu
                        </button>
                        <button class="btn-suggestion" onclick="window.dashboardModule.reclassifyCategory('${type}', 'Khác', 'Vệ sinh', ['lau', 'rửa', 'khăn', 'nước'])">
                            <i class="fas fa-broom"></i> Chuyển sang Vệ sinh
                        </button>
                        <button class="btn-suggestion" onclick="window.dashboardModule.manualReclassify('${type}')">
                            <i class="fas fa-cog"></i> Phân loại thủ công
                        </button>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

// THÊM: Hàm cắt ngắn text
truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// THÊM: Hàm phân loại lại category
reclassifyCategory(type, fromCategory, toCategory, keywords = []) {
    if (!this.filteredData || !this.filteredData.reports) return;
    
    const { reports } = this.filteredData;
    let changedCount = 0;
    
    reports.forEach(report => {
        if (type === 'expenses' && report.expenses) {
            report.expenses.forEach(expense => {
                // Kiểm tra xem expense có thuộc category cũ và có keyword không
                const currentCategory = this.categorizeExpense(expense.name);
                if (currentCategory === fromCategory) {
                    const expenseName = expense.name.toLowerCase();
                    const hasKeyword = keywords.some(keyword => expenseName.includes(keyword));
                    
                    if (hasKeyword) {
                        // Đánh dấu để phân loại lại
                        expense._reclassified = toCategory;
                        changedCount++;
                    }
                }
            });
        }
        
        if (type === 'transfers' && report.transfers) {
            report.transfers.forEach(transfer => {
                const currentCategory = this.categorizeTransfer(transfer.content);
                if (currentCategory === fromCategory) {
                    const transferContent = (transfer.content || '').toLowerCase();
                    const hasKeyword = keywords.some(keyword => transferContent.includes(keyword));
                    
                    if (hasKeyword) {
                        transfer._reclassified = toCategory;
                        changedCount++;
                    }
                }
            });
        }
    });
    
    if (changedCount > 0) {
        window.showToast(`Đã đánh dấu ${changedCount} mục để chuyển sang "${toCategory}"`, 'success');
        // Refresh view
        this.showFinanceDetails(type === 'expenses' ? 'expenses' : 'transfers');
    } else {
        window.showToast('Không tìm thấy mục nào phù hợp để phân loại lại', 'info');
    }
}

// THÊM: Hàm phân loại thủ công
manualReclassify(type) {
    if (!this.filteredData || !this.filteredData.reports) return;
    
    const { reports } = this.filteredData;
    const items = [];
    const categories = ['Nguyên liệu', 'Điện nước', 'Lương', 'Vệ sinh', 'Bao bì', 'Quảng cáo', 'Sửa chữa', 'Vận chuyển', 'Thuê mặt bằng', 'Mạng internet'];
    
    // Thu thập tất cả items thuộc category "Khác"
    reports.forEach(report => {
        if (type === 'expenses' && report.expenses) {
            report.expenses.forEach(expense => {
                if (this.categorizeExpense(expense.name) === 'Khác') {
                    items.push({
                        type: 'expense',
                        reportDate: report.date,
                        id: expense.id,
                        name: expense.name,
                        amount: expense.amount,
                        currentCategory: 'Khác'
                    });
                }
            });
        }
        
        if (type === 'transfers' && report.transfers) {
            report.transfers.forEach(transfer => {
                if (this.categorizeTransfer(transfer.content) === 'Khác') {
                    items.push({
                        type: 'transfer',
                        reportDate: report.date,
                        id: transfer.id,
                        name: transfer.content,
                        amount: transfer.amount,
                        currentCategory: 'Khác'
                    });
                }
            });
        }
    });
    
    if (items.length === 0) {
        window.showToast('Không có mục nào thuộc category "Khác"', 'info');
        return;
    }
    
    const modalContent = `
        <div class="modal-header">
            <h2><i class="fas fa-tags"></i> PHÂN LOẠI THỦ CÔNG (${items.length} mục)</h2>
            <button class="modal-close" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
            <div class="reclassify-instructions">
                <p><i class="fas fa-info-circle"></i> Chọn category mới cho từng mục thuộc "Khác":</p>
            </div>
            
            <div class="reclassify-list">
                ${items.map((item, index) => `
                    <div class="reclassify-item">
                        <div class="reclassify-info">
                            <div>
                                <strong>${item.name || 'Không có tên'}</strong>
                                <small>${item.reportDate} • ${item.amount.toLocaleString()} ₫</small>
                            </div>
                            <div class="reclassify-actions">
                                <select class="category-select" id="category-select-${index}" data-item-id="${item.id}" data-item-type="${item.type}">
                                    <option value="">-- Chọn category --</option>
                                    ${categories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
                                    <option value="_custom">+ Tạo mới</option>
                                </select>
                                <input type="text" class="custom-category-input" id="custom-category-${index}" 
                                       placeholder="Tên category mới..." style="display: none; margin-top: 5px;">
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="modal-actions">
                <button class="btn-primary" onclick="window.dashboardModule.applyReclassifications()">
                    <i class="fas fa-check"></i> ÁP DỤNG PHÂN LOẠI
                </button>
                <button class="btn-secondary" onclick="closeModal()">
                    <i class="fas fa-times"></i> HỦY
                </button>
            </div>
        </div>
    `;
    
    window.showModal(modalContent);
    
    // Thêm event listeners cho select
    setTimeout(() => {
        items.forEach((item, index) => {
            const select = document.getElementById(`category-select-${index}`);
            const customInput = document.getElementById(`custom-category-${index}`);
            
            if (select && customInput) {
                select.addEventListener('change', function() {
                    if (this.value === '_custom') {
                        customInput.style.display = 'block';
                        customInput.focus();
                    } else {
                        customInput.style.display = 'none';
                    }
                });
            }
        });
    }, 100);
}
// THÊM: Hàm tự động học từ dữ liệu hiện có
// THÊM: Hàm tự động học từ dữ liệu hiện có
learnFromExistingData() {
    try {
        const allReports = window.dataManager.getReports();
        const expensePatterns = {};
        const transferPatterns = {};
        
        // Phân tích patterns từ dữ liệu hiện có
        allReports.forEach(report => {
            // Phân tích chi phí
            if (report.expenses) {
                report.expenses.forEach(expense => {
                    const name = expense.name.toLowerCase();
                    const currentCategory = this.categorizeExpense(expense.name);
                    
                    // Nếu không phải "Khác", lưu pattern
                    if (currentCategory !== 'Khác') {
                        const words = name.split(/[\s,\-]+/);
                        words.forEach(word => {
                            if (word.length > 2) { // Bỏ qua từ ngắn
                                if (!expensePatterns[word]) {
                                    expensePatterns[word] = {};
                                }
                                if (!expensePatterns[word][currentCategory]) {
                                    expensePatterns[word][currentCategory] = 0;
                                }
                                expensePatterns[word][currentCategory]++;
                            }
                        });
                    }
                });
            }
            
            // Phân tích chuyển khoản
            if (report.transfers) {
                report.transfers.forEach(transfer => {
                    const content = (transfer.content || '').toLowerCase();
                    const currentCategory = this.categorizeTransfer(transfer.content);
                    
                    if (currentCategory !== 'Khác') {
                        const words = content.split(/[\s,\-]+/);
                        words.forEach(word => {
                            if (word.length > 2) {
                                if (!transferPatterns[word]) {
                                    transferPatterns[word] = {};
                                }
                                if (!transferPatterns[word][currentCategory]) {
                                    transferPatterns[word][currentCategory] = 0;
                                }
                                transferPatterns[word][currentCategory]++;
                            }
                        });
                    }
                });
            }
        });
        
        // Lưu patterns vào localStorage
        localStorage.setItem('milano_expense_patterns', JSON.stringify(expensePatterns));
        localStorage.setItem('milano_transfer_patterns', JSON.stringify(transferPatterns));
        
        console.log('✅ Learned patterns from existing data');
        
    } catch (error) {
        console.error('Error learning from data:', error);
    }
}

// SỬA HÀM categorizeExpense để sử dụng patterns đã học
categorizeExpense(expenseName) {
    if (!expenseName) return 'Khác';
    
    const name = expenseName.toLowerCase().trim();
    
    // Thử sử dụng patterns đã học
    try {
        const savedPatterns = localStorage.getItem('milano_expense_patterns');
        if (savedPatterns) {
            const patterns = JSON.parse(savedPatterns);
            const words = name.split(/[\s,\-]+/);
            const categoryScores = {};
            
            // Tính điểm cho mỗi category dựa trên patterns
            words.forEach(word => {
                if (word.length > 2 && patterns[word]) {
                    Object.entries(patterns[word]).forEach(([category, score]) => {
                        if (!categoryScores[category]) {
                            categoryScores[category] = 0;
                        }
                        categoryScores[category] += score;
                    });
                }
            });
            
            // Chọn category có điểm cao nhất
            let bestCategory = 'Khác';
            let bestScore = 0;
            
            Object.entries(categoryScores).forEach(([category, score]) => {
                if (score > bestScore) {
                    bestScore = score;
                    bestCategory = category;
                }
            });
            
            // Nếu có category đủ tin cậy
            if (bestScore >= 2) { // Ngưỡng tối thiểu
                return bestCategory;
            }
        }
    } catch (error) {
        console.warn('Error using learned patterns:', error);
    }
    
    // Nếu không có patterns, dùng rules cũ
    // ... (giữ nguyên phần rules từ trước)
    
    return 'Khác';
}


// THÊM: Hàm áp dụng phân loại
applyReclassifications() {
    // Lưu custom categories và áp dụng
    window.showToast('Tính năng đang phát triển', 'info');
    closeModal();
}
// THÊM: Hàm gộp chuyển khoản theo category
groupTransfersByCategory(transfers) {
    const categories = {};
    
    transfers.forEach(transfer => {
        const category = this.categorizeTransfer(transfer.content || transfer.name);
        if (!categories[category]) {
            categories[category] = {
                name: category,
                total: 0,
                items: [],
                count: 0
            };
        }
        
        categories[category].total += transfer.amount || 0;
        categories[category].items.push(transfer);
        categories[category].count++;
    });
    
    // Chuyển thành mảng và sắp xếp theo tổng giảm dần
    return Object.values(categories).sort((a, b) => b.total - a.total);
}

// THÊM: Hàm phân loại chuyển khoản
categorizeTransfer(transferContent) {
    const content = (transferContent || '').toLowerCase();
    
    if (content.includes('tiết kiệm') || content.includes('tích lũy')) return 'Tiết kiệm';
    if (content.includes('trả nợ') || content.includes('thanh toán nợ')) return 'Trả nợ';
    if (content.includes('đầu tư')) return 'Đầu tư';
    if (content.includes('chuyển tiền') || content.includes('chuyển khoản')) return 'Chuyển khoản';
    if (content.includes('lương') || content.includes('thưởng')) return 'Lương & Thưởng';
    if (content.includes('mua sắm') || content.includes('mua hàng')) return 'Mua sắm';
    
    return 'Khác';
}
// HÀM SỬA - HIỂN THỊ CHI TIẾT DOANH THU VỚI TÍNH TOÁN
showRevenueDetails() {
    if (!this.filteredData || !this.filteredData.reports) {
        window.showToast('Vui lòng chọn bộ lọc trước', 'warning');
        return;
    }
    
    const { reports } = this.filteredData;
    const container = document.getElementById('financeDetails');
    
    console.log(`📈 Showing revenue details for ${reports.length} reports`);
    
    // Tính tổng doanh thu và doanh thu theo ngày
    const revenueByDay = {};
    let totalRevenue = 0;
    
    reports.forEach(report => {
        let dailyRevenue = 0;
        
        if (report.revenue !== undefined && report.revenue !== null) {
            // Nếu có sẵn revenue trong report
            dailyRevenue = report.revenue || 0;
        } else {
            // Tính toán doanh thu nếu không có trong report
            const expensesTotal = report.expenses ? 
                report.expenses.reduce((sum, e) => sum + (e.amount || 0), 0) : 0;
            const transfersTotal = report.transfers ?
                report.transfers.reduce((sum, t) => sum + (t.amount || 0), 0) : 0;
            
            const openingBalance = report.openingBalance || 0;
            const closingBalance = report.closingBalance || 0;
            const calculatedRevenue = (report.actualReceived || 0) + expensesTotal + transfersTotal - openingBalance + closingBalance;
            
            dailyRevenue = calculatedRevenue;
        }
        
        if (dailyRevenue > 0) {
            revenueByDay[report.date] = (revenueByDay[report.date] || 0) + dailyRevenue;
            totalRevenue += dailyRevenue;
        }
    });
    
    const days = Object.keys(revenueByDay).sort((a, b) => 
        this.parseDisplayDate(b) - this.parseDisplayDate(a)
    );
    
    let content = '';
    
    if (days.length > 0) {
        content = `
            <div class="detail-view">
                <div class="detail-header">
                    <h3><i class="fas fa-chart-line"></i> CHI TIẾT DOANH THU</h3>
                    <button class="btn-icon" onclick="document.getElementById('financeDetails').innerHTML = ''">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="revenue-summary">
                    <div class="revenue-total">
                        <div>
                            <div class="total-label">TỔNG DOANH THU</div>
                            <div class="total-value">${totalRevenue.toLocaleString()} ₫</div>
                        </div>
                    </div>
                    <small>${days.length} ngày có doanh thu</small>
                </div>
                
                <div class="detail-table">
                    <div class="table-header">
                        <div class="header-cell">NGÀY</div>
                        <div class="header-cell">DOANH THU</div>
                        <div class="header-cell">THAO TÁC</div>
                    </div>
                    ${days.map(date => `
                        <div class="table-row">
                            <div class="table-cell">${date}</div>
                            <div class="table-cell">${revenueByDay[date].toLocaleString()} ₫</div>
                            <div class="table-cell">
                                <button class="btn-small" onclick="window.dashboardModule.showDailyReport('${date}')">
                                    <i class="fas fa-external-link-alt"></i> Xem BC
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    } else {
        content = `
            <div class="detail-view">
                <div class="detail-header">
                    <h3><i class="fas fa-chart-line"></i> CHI TIẾT DOANH THU</h3>
                    <button class="btn-icon" onclick="document.getElementById('financeDetails').innerHTML = ''">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="empty-state">
                    <i class="fas fa-chart-line"></i>
                    <p>Không có dữ liệu doanh thu trong khoảng thời gian này</p>
                </div>
            </div>
        `;
    }
    
    container.innerHTML = content;
}
    
    // ========== INVENTORY SECTION ==========
    renderInventorySection() {
        return `
            <div class="section-container" id="inventorySection">
                <div class="section-header">
                    <h2><i class="fas fa-boxes"></i> HÀNG HÓA & DỊCH VỤ</h2>
                    <div class="section-actions">
                        <button class="btn-icon" onclick="window.dashboardModule.showInventoryDetails()" title="Xem chi tiết">
                            <i class="fas fa-list"></i>
                        </button>
                        <button class="btn-icon" onclick="window.dashboardModule.exportInventoryExcel()" title="Xuất Excel">
                            <i class="fas fa-file-excel"></i>
                        </button>
                        <button class="btn-icon" onclick="window.dashboardModule.printInventory()" title="In báo cáo">
                            <i class="fas fa-print"></i>
                        </button>
                    </div>
                </div>
                
                <div class="summary-cards">
                    <div class="summary-card clickable" onclick="window.dashboardModule.showInventoryDetails('purchases')">
                        <i class="fas fa-shopping-cart"></i>
                        <div>
                            <div class="summary-label">Tổng mua hàng</div>
                            <div class="summary-value" id="totalPurchases">0 ₫</div>
                            <small class="summary-trend">Đang tải...</small>
                        </div>
                        <div class="card-actions">
                            <button class="btn-icon small" onclick="event.stopPropagation(); window.dashboardModule.exportPurchasesExcel()" title="Xuất Excel mua hàng">
                                <i class="fas fa-file-excel"></i>
                            </button>
                            <button class="btn-icon small" onclick="event.stopPropagation(); window.dashboardModule.printPurchases()" title="In mua hàng">
                                <i class="fas fa-print"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="summary-card clickable" onclick="window.dashboardModule.showInventoryDetails('services')">
                        <i class="fas fa-concierge-bell"></i>
                        <div>
                            <div class="summary-label">Tổng dịch vụ</div>
                            <div class="summary-value" id="totalServices">0 ₫</div>
                            <small class="summary-trend">Đang tải...</small>
                        </div>
                        <div class="card-actions">
                            <button class="btn-icon small" onclick="event.stopPropagation(); window.dashboardModule.exportServicesExcel()" title="Xuất Excel dịch vụ">
                                <i class="fas fa-file-excel"></i>
                            </button>
                            <button class="btn-icon small" onclick="event.stopPropagation(); window.dashboardModule.printServices()" title="In dịch vụ">
                                <i class="fas fa-print"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="summary-card clickable" onclick="window.dashboardModule.showInventoryDetails('inventory')">
                        <i class="fas fa-box"></i>
                        <div>
                            <div class="summary-label">Giá trị tồn kho</div>
                            <div class="summary-value" id="inventoryValue">0 ₫</div>
                            <small class="summary-trend">Đang tải...</small>
                        </div>
                    </div>
                    
                    <div class="summary-card clickable" onclick="window.dashboardModule.showInventoryDetails('products')">
                        <i class="fas fa-cubes"></i>
                        <div>
                            <div class="summary-label">Số sản phẩm</div>
                            <div class="summary-value" id="productCount">0</div>
                            <small class="summary-trend">Đang tải...</small>
                        </div>
                    </div>
                </div>
                
                <div class="detail-placeholder" id="inventoryDetails">
                    <!-- Chi tiết sẽ được load khi click -->
                </div>
            </div>
        `;
    }
    
    // ========== EMPLOYEE SECTION ==========
    renderEmployeeSection() {
        return `
            <div class="section-container" id="employeeSection">
                <div class="section-header">
                    <h2><i class="fas fa-users"></i> NHÂN SỰ</h2>
                    <div class="section-actions">
                        <button class="btn-icon" onclick="window.dashboardModule.showEmployeeDetails()" title="Xem chi tiết">
                            <i class="fas fa-list"></i>
                        </button>
                        <button class="btn-icon" onclick="window.dashboardModule.exportEmployeeExcel()" title="Xuất Excel">
                            <i class="fas fa-file-excel"></i>
                        </button>
                        <button class="btn-icon" onclick="window.dashboardModule.printEmployee()" title="In báo cáo">
                            <i class="fas fa-print"></i>
                        </button>
                    </div>
                </div>
                
                <div class="summary-cards">
                    <div class="summary-card clickable" onclick="window.dashboardModule.showEmployeeDetails('employees')">
                        <i class="fas fa-user-friends"></i>
                        <div>
                            <div class="summary-label">Tổng nhân viên</div>
                            <div class="summary-value" id="employeeCount">0</div>
                        </div>
                    </div>
                    
                    <div class="summary-card clickable" onclick="window.dashboardModule.showEmployeeDetails('salary')">
                        <i class="fas fa-money-bill-alt"></i>
                        <div>
                            <div class="summary-label">Tổng lương tháng</div>
                            <div class="summary-value" id="totalSalary">0 ₫</div>
                        </div>
                    </div>
                    
                    <div class="summary-card clickable" onclick="window.dashboardModule.showEmployeeDetails('off')">
                        <i class="fas fa-calendar-times"></i>
                        <div>
                            <div class="summary-label">Ngày OFF</div>
                            <div class="summary-value" id="totalOffDays">0</div>
                        </div>
                    </div>
                    
                    <div class="summary-card clickable" onclick="window.dashboardModule.showEmployeeDetails('overtime')">
                        <i class="fas fa-clock"></i>
                        <div>
                            <div class="summary-label">Tăng ca</div>
                            <div class="summary-value" id="totalOvertime">0</div>
                        </div>
                    </div>
                </div>
                
                <div class="detail-placeholder" id="employeeDetails">
                    <!-- Chi tiết sẽ được load khi click -->
                </div>
            </div>
        `;
    }
    
    applyFilter(filterId) {
    console.log(`🎯 Applying filter: ${filterId}`);
    
    this.selectedQuickFilter = filterId;
    this.lastFilter = filterId;
    
    if (filterId === 'custom') {
        document.getElementById('customFilterSection').style.display = 'block';
        return;
    }
    
    const dates = this.calculateFilterDates(filterId);
    
    // Đảm bảo ngày được cập nhật
    this.startDate = this.formatDateForDisplay(dates.start);
    this.endDate = this.formatDateForDisplay(dates.end);
    
    console.log(`📊 Filter applied: ${this.startDate} - ${this.endDate}`);
    
    // Xóa cache và load lại dữ liệu
    this.clearAllCache();
    this.loadFilteredData();
    
    window.showToast(`✅ Đã áp dụng lọc: ${this.getFilterLabel(filterId)}`, 'success');
}

getFilterLabel(filterId) {
    const labels = {
        'today': 'Hôm nay',
        'yesterday': 'Hôm qua',
        'last7': '7 ngày qua',
        'last30': '30 ngày qua',
        'thisMonth': 'Tháng này',
        'lastMonth': 'Tháng trước',
        'custom': 'Tùy chỉnh'
    };
    return labels[filterId] || filterId;
}
    
    toggleCustomFilter() {
        if (this.selectedQuickFilter === 'custom') {
            this.selectedQuickFilter = 'last7';
        } else {
            this.selectedQuickFilter = 'custom';
        }
        this.render();
    }
    
    applyCustomFilter() {
        const startInput = document.getElementById('customStartDate');
        const endInput = document.getElementById('customEndDate');
        
        if (!startInput || !endInput) return;
        
        const startValue = startInput.value;
        const endValue = endInput.value;
        
        if (!startValue || !endValue) {
            window.showToast('Vui lòng chọn đầy đủ ngày bắt đầu và kết thúc', 'warning');
            return;
        }
        
        const [startYear, startMonth, startDay] = startValue.split('-');
        const [endYear, endMonth, endDay] = endValue.split('-');
        
        this.startDate = `${startDay}/${startMonth}/${startYear}`;
        this.endDate = `${endDay}/${endMonth}/${endYear}`;
        
        this.loadFilteredData();
        window.showToast('✅ Đã áp dụng lọc tùy chỉnh', 'success');
    }
    
    changeViewMode() {
        const select = document.getElementById('viewModeSelect');
        this.viewMode = select.value;
        this.refreshDisplay();
    }
    
    refreshData() {
        this.clearAllCache();
        this.loadFilteredData();
        window.showToast('✅ Đã làm mới dữ liệu', 'success');
    }
    
    // HÀM CẦN SỬA - THAY THẾ BẰNG LOGIC MỚI
async loadFilteredData() {
    try {
        console.log(`📥 Loading data for: ${this.startDate} - ${this.endDate}`);
        
        // KIỂM TRA ELEMENT TỒN TẠI TRƯỚC KHI THAO TÁC
        const dataCountElement = document.getElementById('dataCount');
        if (!dataCountElement) {
            console.warn('⚠️ Dashboard not rendered yet, skipping loadFilteredData');
            return;
        }
        
        // Hiển thị loading
        dataCountElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tải dữ liệu...';
        
        // Đảm bảo DataManager đã sẵn sàng
        if (!window.dataManager || !window.dataManager.isReady()) {
            console.warn('⚠️ DataManager not ready, waiting...');
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Chuyển đổi ngày
        const startDate = this.parseDisplayDate(this.startDate);
        const endDate = this.parseDisplayDate(this.endDate);
        
        // Load dữ liệu từ DataManager
        await this.loadAllData(startDate, endDate);
        
        // Cập nhật UI filter
        this.updateFilterUI();
        
    } catch (error) {
        console.error('❌ Error loading filtered data:', error);
        
        // Hiển thị lỗi nhưng không crash
        const dataCountElement = document.getElementById('dataCount');
        if (dataCountElement) {
            dataCountElement.innerHTML = `<i class="fas fa-exclamation-triangle" style="color: #EF4444;"></i> Lỗi: ${error.message}`;
        }
        
        // Vẫn hiển thị app với dữ liệu mặc định
        this.filteredData = {
            reports: [],
            inventory: this.getDefaultInventoryStats(),
            employees: this.getDefaultEmployeeStats()
        };
        
        this.updateUI();
    }
}
// HÀM MỚI - CẬP NHẬT UI FILTER
updateFilterUI() {
    // Cập nhật active filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        const filterType = btn.getAttribute('onclick')?.match(/applyFilter\('([^']+)'\)/)?.[1];
        if (filterType === this.selectedQuickFilter) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Cập nhật custom filter section
    const customFilterSection = document.getElementById('customFilterSection');
    if (customFilterSection) {
        customFilterSection.style.display = this.selectedQuickFilter === 'custom' ? 'block' : 'none';
    }
    
    // Cập nhật view mode select
    const viewModeSelect = document.getElementById('viewModeSelect');
    if (viewModeSelect) {
        viewModeSelect.value = this.viewMode;
    }
}

// Lấy tất cả reports từ LOCAL STORAGE
getAllReportsFromLocal() {
    try {
        const dataManager = window.dataManager;
        if (!dataManager || !dataManager.data || !dataManager.data.reports) {
            console.warn('⚠️ No dataManager or reports found');
            return [];
        }
        
        const reports = Object.values(dataManager.data.reports || {});
        console.log(`📦 Got ${reports.length} reports from local storage`);
        return reports;
        
    } catch (error) {
        console.error('Error getting reports from local:', error);
        return [];
    }
}
// HÀM MỚI - HIỂN THỊ CHI TIẾT TÀI CHÍNH VÀ LOAD DỮ LIỆU
showFinanceDetails(type = 'all') {
    if (!this.filteredData || !this.filteredData.reports) {
        window.showToast('Vui lòng chọn bộ lọc trước', 'warning');
        return;
    }
    
    const { reports } = this.filteredData;
    const container = document.getElementById('financeDetails');
    
    console.log(`💰 Showing finance details for ${reports.length} reports, type: ${type}`);
    
    let content = '';
    
    if (this.viewMode === 'day') {
        // Hiển thị theo ngày
        content = this.renderFinanceByDay(reports, type);
    } else {
        // Hiển thị gộp
        content = this.renderFinanceGrouped(reports, type);
    }
    
    container.innerHTML = `
        <div class="detail-view">
            <div class="detail-header">
                <h3>CHI TIẾT ${this.getFinanceTypeLabel(type)}</h3>
                <button class="btn-icon" onclick="document.getElementById('financeDetails').innerHTML = ''">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            ${content}
        </div>
    `;
}

// HÀM MỚI - Get finance type label
getFinanceTypeLabel(type) {
    const labels = {
        'all': 'TÀI CHÍNH',
        'actual': 'THỰC NHẬN',
        'transfers': 'CHUYỂN KHOẢN',
        'expenses': 'CHI PHÍ'
    };
    return labels[type] || type.toUpperCase();
}
// HÀM MỚI - RENDER FINANCE GROUPED VỚI LOAD DỮ LIỆU
renderFinanceGrouped(reports, type) {
    console.log(`📊 Rendering grouped finance for ${reports.length} reports`);
    
    // Gộp dữ liệu theo loại
    let groupedData = {
        actual: [],
        transfers: [],
        expenses: []
    };
    
    reports.forEach(report => {
        // Thêm thực nhận
        if (report.actualReceived) {
            groupedData.actual.push({
                type: 'actual',
                date: report.date,
                name: 'Thực nhận tiền mặt',
                amount: report.actualReceived || 0,
                description: `Báo cáo ngày ${report.date}`
            });
        }
        
        // Thêm chuyển khoản
        if (report.transfers && Array.isArray(report.transfers)) {
            report.transfers.forEach(transfer => {
                groupedData.transfers.push({
                    type: 'transfer',
                    date: report.date,
                    name: transfer.content || 'Chuyển khoản không có nội dung',
                    amount: transfer.amount || 0,
                    description: `Chuyển khoản ngày ${report.date}`
                });
            });
        }
        
        // Thêm chi phí
        if (report.expenses && Array.isArray(report.expenses)) {
            report.expenses.forEach(expense => {
                groupedData.expenses.push({
                    type: 'expense',
                    date: report.date,
                    name: expense.name || 'Chi phí không có tên',
                    amount: expense.amount || 0,
                    description: `Chi phí ngày ${report.date}`
                });
            });
        }
    });
    
    console.log(`📈 Grouped data: ${groupedData.actual.length} actual, ${groupedData.transfers.length} transfers, ${groupedData.expenses.length} expenses`);
    
    let html = '';
    
    // Hiển thị theo loại được chọn
    if (type === 'actual' || type === 'all') {
        html += this.renderFinanceGroupedSection('actual', 'Thực nhận tiền mặt', 'fas fa-money-bill-wave', groupedData.actual);
    }
    
    if (type === 'transfers' || type === 'all') {
        html += this.renderFinanceGroupedSection('transfers', 'Chuyển khoản', 'fas fa-university', groupedData.transfers);
    }
    
    if (type === 'expenses' || type === 'all') {
        html += this.renderFinanceGroupedSection('expenses', 'Chi phí', 'fas fa-credit-card', groupedData.expenses);
    }
    
    // Nếu không có dữ liệu
    if (html === '') {
        html = `
            <div class="empty-state">
                <i class="fas fa-file-invoice-dollar"></i>
                <p>Không có dữ liệu ${this.getFinanceTypeLabel(type).toLowerCase()} trong khoảng thời gian này</p>
            </div>
        `;
    }
    
    return html;
}

// HÀM MỚI - Render từng section
renderFinanceGroupedSection(type, title, icon, data) {
    if (data.length === 0) return '';
    
    return `
        <div class="grouped-section">
            <h4><i class="${icon}"></i> ${title.toUpperCase()} (${data.length} mục)</h4>
            <div class="grouped-list">
                ${data.map((item, index) => `
                    <div class="list-item ${index % 2 === 0 ? 'even' : 'odd'}">
                        <div class="item-header">
                            <span class="item-date">${item.date}</span>
                            <span class="item-amount">${item.amount.toLocaleString()} ₫</span>
                        </div>
                        <div class="item-body">
                            <span class="item-name">${item.name}</span>
                            ${item.description ? `<small class="item-desc">${item.description}</small>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="section-total">
                <strong>Tổng ${title.toLowerCase()}:</strong>
                <span>${data.reduce((sum, item) => sum + (item.amount || 0), 0).toLocaleString()} ₫</span>
            </div>
        </div>
    `;
}
// Filter reports theo ngày CHÍNH XÁC
// HÀM CẦN SỬA - XỬ LÝ ĐÚNG ĐỊNH DẠNG NGÀY
filterReportsByDate(reports, startDate, endDate) {
    if (!reports || !Array.isArray(reports)) {
        console.warn('⚠️ No reports to filter');
        return [];
    }
    
    console.log(`🔍 Filtering ${reports.length} reports from ${this.formatDateForDisplay(startDate)} to ${this.formatDateForDisplay(endDate)}`);
    
    // Reset time phần để so sánh ngày
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    
    const filtered = reports.filter(report => {
        if (!report || !report.date) return false;
        
        try {
            const reportDate = this.parseDisplayDate(report.date);
            if (!reportDate) {
                console.warn(`⚠️ Could not parse date: ${report.date}`);
                return false;
            }
            
            reportDate.setHours(0, 0, 0, 0);
            
            const isInRange = reportDate >= startDate && reportDate <= endDate;
            
            if (isInRange) {
                console.log(`✓ ${report.date} is in range`);
            }
            
            return isInRange;
            
        } catch (error) {
            console.warn(`⚠️ Error parsing report date: ${report.date}`, error);
            return false;
        }
    });
    
    console.log(`✅ Filtered to ${filtered.length} reports`);
    return filtered;
}
    
    // HÀM SỬA - UPDATE UI VỚI DOANH THU ĐÚNG
updateUI() {
    if (!this.filteredData) return;
    
    const { reports, inventory, employees } = this.filteredData;
    
    // Tính toán tài chính
    const financeStats = this.calculateFinanceStats(reports);
    
    console.log(`🔄 Updating UI with finance stats:`, financeStats);
    
    // Cập nhật giá trị - SỬA THÀNH HIỂN THỊ SỐ TIỀN
    this.updateValue('totalActual', financeStats.totalActual);
    this.updateValue('totalTransfers', financeStats.totalTransfers);
    this.updateValue('totalExpenses', financeStats.totalExpenses);
    this.updateValue('totalRevenue', financeStats.totalRevenue); // SỬA: hiển thị số tiền doanh thu
    
    // Cập nhật trend text
    this.updateTrendText('actualTrend', `Từ ${reports.length} báo cáo`);
    this.updateTrendText('transfersTrend', `${this.getTransactionCount(reports, 'transfers')} giao dịch`);
    this.updateTrendText('expensesTrend', `${this.getTransactionCount(reports, 'expenses')} khoản chi`);
    this.updateTrendText('revenueTrend', `Từ ${reports.length} báo cáo`);
    
    // Cập nhật inventory
    this.updateValue('totalPurchases', inventory.totalPurchases);
    this.updateValue('totalServices', inventory.totalServices);
    this.updateValue('inventoryValue', inventory.inventoryValue);
    this.updateValue('productCount', inventory.productCount);
    
    // Cập nhật employees
    this.updateValue('employeeCount', employees.employeeCount);
    this.updateValue('totalSalary', employees.totalSalary);
    this.updateValue('totalOffDays', employees.totalOffDays);
    this.updateValue('totalOvertime', employees.totalOvertime);
}

// HÀM MỚI - Cập nhật trend text
updateTrendText(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = text;
    }
}

// HÀM MỚI - Đếm số giao dịch
getTransactionCount(reports, type) {
    let count = 0;
    reports.forEach(report => {
        if (type === 'transfers' && report.transfers && Array.isArray(report.transfers)) {
            count += report.transfers.length;
        }
        if (type === 'expenses' && report.expenses && Array.isArray(report.expenses)) {
            count += report.expenses.length;
        }
    });
    return count;
}
    
    updateValue(elementId, value) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        if (typeof value === 'number') {
            if (elementId.includes('Count') || elementId.includes('Days') || elementId.includes('Overtime')) {
                element.textContent = value;
            } else if (elementId.includes('Rate')) {
                element.textContent = value;
            } else {
                element.textContent = value.toLocaleString() + ' ₫';
            }
        } else {
            element.textContent = value;
        }
    }
    
    // HÀM SỬA - TÍNH TOÁN THỐNG KÊ TÀI CHÍNH (ĐẢM BẢO LUÔN CÓ DOANH THU)
calculateFinanceStats(reports) {
    console.log(`💰 Calculating finance stats for ${reports.length} reports`);
    
    let totalActual = 0;
    let totalExpenses = 0;
    let totalTransfers = 0;
    let totalRevenue = 0;
    
    reports.forEach(report => {
        // Thực nhận
        totalActual += report.actualReceived || 0;
        
        // Doanh thu - Nếu report có revenue thì dùng, không thì tính toán
        if (report.revenue !== undefined && report.revenue !== null) {
            totalRevenue += report.revenue || 0;
        } else {
            // Tính toán doanh thu nếu không có trong report
            const expensesTotal = report.expenses ? 
                report.expenses.reduce((sum, e) => sum + (e.amount || 0), 0) : 0;
            const transfersTotal = report.transfers ?
                report.transfers.reduce((sum, t) => sum + (t.amount || 0), 0) : 0;
            
            // Công thức tính doanh thu từ reports.js: revenue = actualReceived + expenses + transfers - openingBalance + closingBalance
            const openingBalance = report.openingBalance || 0;
            const closingBalance = report.closingBalance || 0;
            const calculatedRevenue = (report.actualReceived || 0) + expensesTotal + transfersTotal - openingBalance + closingBalance;
            
            totalRevenue += calculatedRevenue;
        }
        
        // Chi phí
        if (report.expenses && Array.isArray(report.expenses)) {
            report.expenses.forEach(expense => {
                totalExpenses += expense.amount || 0;
            });
        }
        
        // Chuyển khoản
        if (report.transfers && Array.isArray(report.transfers)) {
            report.transfers.forEach(transfer => {
                totalTransfers += transfer.amount || 0;
            });
        }
    });
    
    console.log(`📊 Finance stats:`, {
        totalActual,
        totalExpenses,
        totalTransfers,
        totalRevenue
    });
    
    return {
        totalActual,
        totalExpenses,
        totalTransfers,
        totalRevenue
    };
}
    
    // HÀM CẦN SỬA - ĐỂ LÀM VIỆC VỚI CẤU TRÚC DATAMANAGER
calculateInventoryStats(startDate = null, endDate = null) {
    try {
        console.log(`📦 Dashboard: Calculating inventory stats`);
        
        const dataManager = window.dataManager;
        if (!dataManager || !dataManager.data || !dataManager.data.inventory) {
            console.warn('⚠️ No inventory data in DataManager');
            return this.getDefaultInventoryStats();
        }
        
        const inventoryData = dataManager.data.inventory;
        
        // Nếu không có date filter, lấy tất cả
        if (!startDate || !endDate) {
            startDate = this.parseDisplayDate(this.startDate);
            endDate = this.parseDisplayDate(this.endDate);
        }
        
        // Reset time
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        
        // Tổng mua hàng trong khoảng thời gian
        let totalPurchases = 0;
        let purchaseList = [];
        
        if (inventoryData.purchases && typeof inventoryData.purchases === 'object') {
            Object.entries(inventoryData.purchases).forEach(([dateKey, purchases]) => {
                try {
                    // Chuyển đổi dateKey từ dd/mm/yyyy sang Date object
                    const purchaseDate = this.parseDisplayDate(dateKey);
                    if (!purchaseDate) return;
                    
                    purchaseDate.setHours(0, 0, 0, 0);
                    
                    // Kiểm tra xem có trong khoảng thời gian không
                    if (purchaseDate >= startDate && purchaseDate <= endDate) {
                        if (Array.isArray(purchases)) {
                            purchases.forEach(p => {
                                const amount = Number(p.total) || 0;
                                totalPurchases += amount;
                                purchaseList.push({
                                    ...p,
                                    date: dateKey, // Giữ nguyên định dạng dd/mm/yyyy
                                    dateKey: dateKey,
                                    amount: amount
                                });
                            });
                        }
                    }
                } catch (error) {
                    console.warn(`⚠️ Error processing purchases for date ${dateKey}:`, error);
                }
            });
        }
        
        console.log(`🛒 Found ${purchaseList.length} purchases in date range`);
        
        // Tổng dịch vụ trong khoảng thời gian
        let totalServices = 0;
        let serviceList = [];
        
        if (inventoryData.services && typeof inventoryData.services === 'object') {
            Object.entries(inventoryData.services).forEach(([dateKey, services]) => {
                try {
                    const serviceDate = this.parseDisplayDate(dateKey);
                    if (!serviceDate) return;
                    
                    serviceDate.setHours(0, 0, 0, 0);
                    
                    if (serviceDate >= startDate && serviceDate <= endDate) {
                        if (Array.isArray(services)) {
                            services.forEach(s => {
                                const amount = Number(s.amount) || 0;
                                totalServices += amount;
                                serviceList.push({
                                    ...s,
                                    date: dateKey,
                                    dateKey: dateKey,
                                    amount: amount
                                });
                            });
                        }
                    }
                } catch (error) {
                    console.warn(`⚠️ Error processing services for date ${dateKey}:`, error);
                }
            });
        }
        
        console.log(`🔔 Found ${serviceList.length} services in date range`);
        
        // Giá trị tồn kho hiện tại (không filter theo ngày)
        const products = inventoryData.products || [];
        const inventoryValue = products.reduce((sum, p) => sum + (p.totalValue || 0), 0);
        const productCount = products.length;
        
        return {
            totalPurchases,
            totalServices,
            inventoryValue,
            productCount,
            purchaseList,
            serviceList,
            products,
            filtered: true,
            dateRange: {
                start: this.formatDateForDisplay(startDate),
                end: this.formatDateForDisplay(endDate)
            }
        };
        
    } catch (error) {
        console.error('❌ Error calculating inventory stats:', error);
        return this.getDefaultInventoryStats();
    }
}
    
    calculateEmployeeStats() {
        try {
            const employees = window.dataManager.getEmployees();
            const employeeCount = employees.length;
            
            let totalSalary = 0;
            let totalOffDays = 0;
            let totalOvertime = 0;
            
            if (employeeCount > 0 && window.employeesModule) {
                employees.forEach(employee => {
                    try {
                        const salary = window.employeesModule.calculateEmployeeSalary(employee);
                        totalSalary += Number(salary.actual) || 0;
                        totalOffDays += Number(salary.off) || 0;
                        totalOvertime += Number(salary.overtime) || 0;
                    } catch (err) {
                        console.warn('Error calculating salary:', err);
                    }
                });
            }
            
            return {
                employeeCount,
                totalSalary,
                totalOffDays,
                totalOvertime,
                employees
            };
            
        } catch (error) {
            console.error('Error calculating employee stats:', error);
            return this.getDefaultEmployeeStats();
        }
    }
    
    // ========== DETAIL VIEWS ==========
    showFinanceDetails(type = 'all') {
        if (!this.filteredData) {
            window.showToast('Vui lòng chọn bộ lọc trước', 'warning');
            return;
        }
        
        const { reports } = this.filteredData;
        const container = document.getElementById('financeDetails');
        
        let content = '';
        
        if (this.viewMode === 'day') {
            // Hiển thị theo ngày
            content = this.renderFinanceByDay(reports, type);
        } else {
            // Hiển thị gộp
            content = this.renderFinanceGrouped(reports, type);
        }
        
        container.innerHTML = `
            <div class="detail-view">
                <div class="detail-header">
                    <h3>CHI TIẾT TÀI CHÍNH ${type === 'all' ? '' : `- ${this.getTypeLabel(type).toUpperCase()}`}</h3>
                    <button class="btn-icon" onclick="document.getElementById('financeDetails').innerHTML = ''">
                        <i class="fas fa-times"></i>
                    </button>
                    
                </div>
                ${content}
            </div>
        `;
    }
    
    // HÀM SỬA - RENDER FINANCE BY DAY CHỈ HIỂN THỊ THỰC NHẬN
renderFinanceByDay(reports, type) {
    const sortedReports = [...reports].sort((a, b) => 
        this.parseDisplayDate(b.date) - this.parseDisplayDate(a.date)
    );
    
    console.log(`📅 Rendering finance by day for ${sortedReports.length} reports`);
    
    let html = '';
    
    // Hiển thị theo loại
    if (type === 'actual' || type === 'all') {
        html += this.renderDailySection('actual', 'Thực nhận tiền mặt', sortedReports);
    }
    
    if (type === 'transfers' || type === 'all') {
        html += this.renderDailySection('transfers', 'Chuyển khoản', sortedReports);
    }
    
    if (type === 'expenses' || type === 'all') {
        html += this.renderDailySection('expenses', 'Chi phí', sortedReports);
    }
    
    return html;
}

// HÀM MỚI - Render daily section
renderDailySection(type, title, reports) {
    let hasData = false;
    let totalAmount = 0;
    
    let rows = '';
    
    reports.forEach(report => {
        let amount = 0;
        let items = [];
        
        if (type === 'actual') {
            amount = report.actualReceived || 0;
            if (amount > 0) {
                hasData = true;
                totalAmount += amount;
                rows += `
                    <div class="table-row clickable" onclick="window.dashboardModule.showDailyReport('${report.date}')">
                        <div class="table-cell">${report.date}</div>
                        <div class="table-cell">Thực nhận tiền mặt</div>
                        <div class="table-cell">${amount.toLocaleString()} ₫</div>
                    </div>
                `;
            }
        }
        else if (type === 'transfers' && report.transfers && Array.isArray(report.transfers)) {
            report.transfers.forEach(transfer => {
                const transferAmount = transfer.amount || 0;
                if (transferAmount > 0) {
                    hasData = true;
                    totalAmount += transferAmount;
                    rows += `
                        <div class="table-row clickable" onclick="window.dashboardModule.showDailyReport('${report.date}')">
                            <div class="table-cell">${report.date}</div>
                            <div class="table-cell">${transfer.content || 'Chuyển khoản không có nội dung'}</div>
                            <div class="table-cell">${transferAmount.toLocaleString()} ₫</div>
                        </div>
                    `;
                }
            });
        }
        else if (type === 'expenses' && report.expenses && Array.isArray(report.expenses)) {
            report.expenses.forEach(expense => {
                const expenseAmount = expense.amount || 0;
                if (expenseAmount > 0) {
                    hasData = true;
                    totalAmount += expenseAmount;
                    rows += `
                        <div class="table-row clickable" onclick="window.dashboardModule.showDailyReport('${report.date}')">
                            <div class="table-cell">${report.date}</div>
                            <div class="table-cell">${expense.name || 'Chi phí không có tên'}</div>
                            <div class="table-cell">${expenseAmount.toLocaleString()} ₫</div>
                        </div>
                    `;
                }
            });
        }
    });
    
    if (!hasData) return '';
    
    return `
        <div class="daily-section">
            <h4><i class="fas fa-${type === 'actual' ? 'money-bill-wave' : type === 'transfers' ? 'university' : 'credit-card'}"></i> ${title.toUpperCase()} THEO NGÀY</h4>
            <div class="detail-table">
                <div class="table-header">
                    <div class="header-cell">NGÀY</div>
                    <div class="header-cell">NỘI DUNG</div>
                    <div class="header-cell">SỐ TIỀN</div>
                </div>
                ${rows}
                <div class="table-total">
                    <div class="total-cell"></div>
                    <div class="total-cell"><strong>Tổng ${title.toLowerCase()}:</strong></div>
                    <div class="total-cell"><strong>${totalAmount.toLocaleString()} ₫</strong></div>
                </div>
            </div>
        </div>
    `;
}
    
    // SỬA: Render finance grouped với category grouping
renderFinanceGrouped(reports, type) {
    console.log(`📊 Rendering grouped finance for ${reports.length} reports`);
    
    // Gộp dữ liệu theo loại
    let groupedData = {
        actual: [],
        transfers: [],
        expenses: []
    };
    
    reports.forEach(report => {
        // Thêm thực nhận
        if (report.actualReceived) {
            groupedData.actual.push({
                type: 'actual',
                date: report.date,
                name: 'Thực nhận tiền mặt',
                amount: report.actualReceived || 0,
                description: `Báo cáo ngày ${report.date}`
            });
        }
        
        // Thêm chuyển khoản
        if (report.transfers && Array.isArray(report.transfers)) {
            report.transfers.forEach(transfer => {
                groupedData.transfers.push({
                    type: 'transfer',
                    date: report.date,
                    name: transfer.content || 'Chuyển khoản không có nội dung',
                    amount: transfer.amount || 0,
                    description: `Chuyển khoản ngày ${report.date}`
                });
            });
        }
        
        // Thêm chi phí
        if (report.expenses && Array.isArray(report.expenses)) {
            report.expenses.forEach(expense => {
                groupedData.expenses.push({
                    type: 'expense',
                    date: report.date,
                    name: expense.name || 'Chi phí không có tên',
                    amount: expense.amount || 0,
                    description: `Chi phí ngày ${report.date}`
                });
            });
        }
    });
    
    console.log(`📈 Grouped data: ${groupedData.actual.length} actual, ${groupedData.transfers.length} transfers, ${groupedData.expenses.length} expenses`);
    
    let html = '';
    
    // Hiển thị theo loại được chọn
    if (type === 'actual' || type === 'all') {
        html += this.renderFinanceGroupedSection('actual', 'Thực nhận tiền mặt', 'fas fa-money-bill-wave', groupedData.actual);
    }
    
    if (type === 'transfers' || type === 'all') {
        // THÊM: Gộp chuyển khoản theo category
        const transferCategories = this.groupTransfersByCategory(groupedData.transfers);
        html += this.renderGroupedByCategorySection('transfers', 'Chuyển khoản', 'fas fa-university', transferCategories);
    }
    
    if (type === 'expenses' || type === 'all') {
        // THÊM: Gộp chi phí theo category
        const expenseCategories = this.groupExpensesByCategory(groupedData.expenses);
        html += this.renderGroupedByCategorySection('expenses', 'Chi phí', 'fas fa-credit-card', expenseCategories);
    }
    
    // Nếu không có dữ liệu
    if (html === '') {
        html = `
            <div class="empty-state">
                <i class="fas fa-file-invoice-dollar"></i>
                <p>Không có dữ liệu ${this.getFinanceTypeLabel(type).toLowerCase()} trong khoảng thời gian này</p>
            </div>
        `;
    }
    
    return html;
}
    // THÊM: Hàm render theo category
renderGroupedByCategorySection(type, title, icon, categories) {
    if (categories.length === 0) return '';
    
    let totalAmount = 0;
    categories.forEach(cat => totalAmount += cat.total);
    
    return `
        <div class="grouped-section">
            <div class="section-header-with-total">
                <h4><i class="${icon}"></i> ${title.toUpperCase()} THEO DANH MỤC</h4>
                <div class="section-total-badge">
                    <span>${categories.length} danh mục</span>
                    <strong>${totalAmount.toLocaleString()} ₫</strong>
                </div>
            </div>
            
            <div class="category-list">
                ${categories.map(category => `
                    <div class="category-item">
                        <div class="category-header">
                            <div class="category-name">
                                <strong>${category.name}</strong>
                                <small>${category.count} giao dịch</small>
                            </div>
                            <div class="category-total">
                                ${category.total.toLocaleString()} ₫
                            </div>
                        </div>
                        
                        <div class="category-details">
                            ${this.viewMode === 'collapsed' ? '' : `
                                <div class="category-items">
                                    ${category.items.slice(0, 5).map((item, index) => `
                                        <div class="category-item-detail">
                                            <span class="item-date">${item.date}</span>
                                            <span class="item-name">${item.name || item.content}</span>
                                            <span class="item-amount">${item.amount.toLocaleString()} ₫</span>
                                        </div>
                                    `).join('')}
                                    
                                    ${category.items.length > 5 ? `
                                        <div class="more-items">
                                            <i class="fas fa-ellipsis-h"></i>
                                            ${category.items.length - 5} giao dịch khác
                                        </div>
                                    ` : ''}
                                </div>
                            `}
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="category-summary">
                <table class="summary-table">
                    <tr>
                        <th>Danh mục</th>
                        <th>Số giao dịch</th>
                        <th>Tổng tiền</th>
                        <th>Tỷ lệ</th>
                    </tr>
                    ${categories.map(category => `
                        <tr>
                            <td>${category.name}</td>
                            <td>${category.count}</td>
                            <td>${category.total.toLocaleString()} ₫</td>
                            <td>${((category.total / totalAmount) * 100).toFixed(1)}%</td>
                        </tr>
                    `).join('')}
                </table>
            </div>
        </div>
    `;
}
    showInventoryDetails(type = 'all') {
        if (!this.filteredData) {
            window.showToast('Vui lòng chọn bộ lọc trước', 'warning');
            return;
        }
        
        const { inventory } = this.filteredData;
        const container = document.getElementById('inventoryDetails');
        
        let content = '';
        
        if (this.viewMode === 'day') {
            content = this.renderInventoryByDay(inventory, type);
        } else {
            content = this.renderInventoryGrouped(inventory, type);
        }
        
        container.innerHTML = `
            <div class="detail-view">
                <div class="detail-header">
                    <h3>CHI TIẾT HÀNG HÓA & DỊCH VỤ ${type === 'all' ? '' : `- ${this.getTypeLabel(type).toUpperCase()}`}</h3>
                    <button class="btn-icon" onclick="document.getElementById('inventoryDetails').innerHTML = ''">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                ${content}
            </div>
        `;
    }
    // THÊM: Tải tất cả suggestions từ database
loadAllSuggestionsFromReports() {
    try {
        const allReports = window.dataManager.getReports();
        const expenseSuggestions = new Set();
        const transferSuggestions = new Set();
        
        allReports.forEach(report => {
            // Load expense suggestions
            if (report.expenses && Array.isArray(report.expenses)) {
                report.expenses.forEach(expense => {
                    if (expense.name && expense.name.trim()) {
                        expenseSuggestions.add(expense.name.trim());
                    }
                });
            }
            
            // Load transfer suggestions
            if (report.transfers && Array.isArray(report.transfers)) {
                report.transfers.forEach(transfer => {
                    if (transfer.content && transfer.content.trim()) {
                        transferSuggestions.add(transfer.content.trim());
                    }
                });
            }
        });
        
        // Cập nhật suggestions trong reports module
        if (window.reportsModule) {
            window.reportsModule.expenseSuggestions = Array.from(expenseSuggestions).slice(0, 20);
            window.reportsModule.transferSuggestions = Array.from(transferSuggestions).slice(0, 20);
            
            // Lưu vào localStorage
            window.reportsModule.saveSuggestions('expenseSuggestions', window.reportsModule.expenseSuggestions);
            window.reportsModule.saveSuggestions('transferSuggestions', window.reportsModule.transferSuggestions);
            
            console.log(`✅ Loaded ${window.reportsModule.expenseSuggestions.length} expense suggestions and ${window.reportsModule.transferSuggestions.length} transfer suggestions`);
        }
        
    } catch (error) {
        console.error('Error loading suggestions from reports:', error);
    }
}


    renderInventoryByDay(inventory, type) {
        let html = '';
        
        if (type === 'purchases' || type === 'all') {
            // Nhóm purchases theo ngày
            const purchasesByDate = {};
            inventory.purchaseList.forEach(p => {
                if (!purchasesByDate[p.date]) {
                    purchasesByDate[p.date] = [];
                }
                purchasesByDate[p.date].push(p);
            });
            
            html += `
                <div class="detail-table">
                    <h4><i class="fas fa-shopping-cart"></i> MUA HÀNG THEO NGÀY</h4>
                    <div class="table-header">
                        <div class="header-cell">NGÀY</div>
                        <div class="header-cell">SẢN PHẨM</div>
                        <div class="header-cell">SỐ LƯỢNG</div>
                        <div class="header-cell">THÀNH TIỀN</div>
                    </div>
            `;
            
            Object.entries(purchasesByDate).forEach(([date, purchases]) => {
                purchases.forEach((purchase, index) => {
                    html += `
                        <div class="table-row">
                            <div class="table-cell">${index === 0 ? date : ''}</div>
                            <div class="table-cell">${purchase.name}</div>
                            <div class="table-cell">${purchase.quantity} ${purchase.unit}</div>
                            <div class="table-cell">${purchase.total.toLocaleString()} ₫</div>
                        </div>
                    `;
                });
            });
            
            html += `</div>`;
        }
        
        return html;
    }
    
    renderInventoryGrouped(inventory, type) {
        let html = '';
        
        if (type === 'purchases' || type === 'all') {
            html += `
                <div class="grouped-section">
                    <h4><i class="fas fa-shopping-cart"></i> MUA HÀNG (${inventory.purchaseList.length} mục)</h4>
                    <div class="grouped-list">
                        ${inventory.purchaseList.map(item => `
                            <div class="list-item">
                                <span class="item-date">${item.date}</span>
                                <span class="item-name">${item.name}</span>
                                <span class="item-detail">${item.quantity} ${item.unit}</span>
                                <span class="item-amount">${item.total.toLocaleString()} ₫</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        if (type === 'services' || type === 'all') {
            html += `
                <div class="grouped-section">
                    <h4><i class="fas fa-concierge-bell"></i> DỊCH VỤ (${inventory.serviceList.length} mục)</h4>
                    <div class="grouped-list">
                        ${inventory.serviceList.map(item => `
                            <div class="list-item">
                                <span class="item-date">${item.date}</span>
                                <span class="item-name">${item.name}</span>
                                ${item.note ? `<span class="item-note">${item.note}</span>` : ''}
                                <span class="item-amount">${item.amount.toLocaleString()} ₫</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        if (type === 'products' || type === 'all') {
            html += `
                <div class="grouped-section">
                    <h4><i class="fas fa-box"></i> SẢN PHẨM TỒN KHO (${inventory.products.length} sản phẩm)</h4>
                    <div class="grouped-list">
                        ${inventory.products.map(product => `
                            <div class="list-item">
                                <span class="item-name">${product.name}</span>
                                <span class="item-detail">${product.quantity} ${product.unit}</span>
                                <span class="item-amount">${(product.totalValue || 0).toLocaleString()} ₫</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        return html;
    }
    
    showEmployeeDetails(type = 'all') {
        if (!this.filteredData) {
            window.showToast('Vui lòng chọn bộ lọc trước', 'warning');
            return;
        }
        
        const { employees } = this.filteredData;
        const container = document.getElementById('employeeDetails');
        
        let content = '';
        
        if (this.viewMode === 'day') {
            content = this.renderEmployeeByDay(employees, type);
        } else {
            content = this.renderEmployeeGrouped(employees, type);
        }
        
        container.innerHTML = `
            <div class="detail-view">
                <div class="detail-header">
                    <h3>CHI TIẾT NHÂN SỰ ${type === 'all' ? '' : `- ${this.getTypeLabel(type).toUpperCase()}`}</h3>
                    <button class="btn-icon" onclick="document.getElementById('employeeDetails').innerHTML = ''">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                ${content}
            </div>
        `;
    }
    
    // ========== EXPORT FUNCTIONS ==========
    exportTransfersExcel() {
        if (!this.filteredData) {
            window.showToast('Vui lòng chọn bộ lọc trước', 'warning');
            return;
        }
        
        const { reports } = this.filteredData;
        const transfers = [];
        
        reports.forEach(report => {
            if (report.transfers) {
                report.transfers.forEach(transfer => {
                    transfers.push({
                        'Ngày': report.date,
                        'Nội dung': transfer.content || 'Không có nội dung',
                        'Số tiền': transfer.amount,
                        'Thời gian': new Date(transfer.addedAt).toLocaleString('vi-VN')
                    });
                });
            }
        });
        
        this.exportToExcel(transfers, 'ChuyenKhoan', 'Báo cáo chuyển khoản');
    }
    
    exportExpensesExcel() {
        if (!this.filteredData) {
            window.showToast('Vui lòng chọn bộ lọc trước', 'warning');
            return;
        }
        
        const { reports } = this.filteredData;
        const expenses = [];
        
        reports.forEach(report => {
            if (report.expenses) {
                report.expenses.forEach(expense => {
                    expenses.push({
                        'Ngày': report.date,
                        'Tên chi phí': expense.name,
                        'Số tiền': expense.amount,
                        'Thời gian': new Date(expense.addedAt).toLocaleString('vi-VN')
                    });
                });
            }
        });
        
        this.exportToExcel(expenses, 'ChiPhi', 'Báo cáo chi phí');
    }
    
    exportPurchasesExcel() {
        if (!this.filteredData) {
            window.showToast('Vui lòng chọn bộ lọc trước', 'warning');
            return;
        }
        
        const { inventory } = this.filteredData;
        this.exportToExcel(inventory.purchaseList, 'MuaHang', 'Báo cáo mua hàng');
    }
    
    exportServicesExcel() {
        if (!this.filteredData) {
            window.showToast('Vui lòng chọn bộ lọc trước', 'warning');
            return;
        }
        
        const { inventory } = this.filteredData;
        this.exportToExcel(inventory.serviceList, 'DichVu', 'Báo cáo dịch vụ');
    }
    
    exportToExcel(data, filename, title) {
        if (!data || data.length === 0) {
            window.showToast('Không có dữ liệu để xuất', 'warning');
            return;
        }
        
        try {
            // Tạo CSV content
            let csv = '';
            
            // Tiêu đề
            if (title) {
                csv += `${title}\n`;
                csv += `Khoảng thời gian: ${this.getDateRangeText()}\n`;
                csv += `Ngày xuất: ${new Date().toLocaleString('vi-VN')}\n\n`;
            }
            
            // Headers
            const headers = Object.keys(data[0]);
            csv += headers.join(',') + '\n';
            
            // Data
            data.forEach(item => {
                const row = headers.map(header => {
                    let value = item[header];
                    if (typeof value === 'string' && value.includes(',')) {
                        value = `"${value}"`;
                    }
                    return value;
                });
                csv += row.join(',') + '\n';
            });
            
            // Tạo blob và download
            const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            link.setAttribute('href', url);
            link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            window.showToast(`✅ Đã xuất file ${filename}.csv`, 'success');
            
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            window.showToast('Lỗi khi xuất file', 'error');
        }
    }
    
    // ========== PRINT FUNCTIONS ==========
    printTransfers() {
        if (!this.filteredData) {
            window.showToast('Vui lòng chọn bộ lọc trước', 'warning');
            return;
        }
        
        const { reports } = this.filteredData;
        const transfers = [];
        
        reports.forEach(report => {
            if (report.transfers) {
                report.transfers.forEach(transfer => {
                    transfers.push({
                        date: report.date,
                        content: transfer.content || 'Không có nội dung',
                        amount: transfer.amount
                    });
                });
            }
        });
        
        this.printSimpleReport(transfers, 'CHUYỂN KHOẢN', 'amount', 'Số tiền');
    }
    
    printExpenses() {
    if (!this.filteredData) {
        window.showToast('Vui lòng chọn bộ lọc trước', 'warning');
        return;
    }
    
    console.log(`🖨️ Printing expenses for filter: ${this.selectedQuickFilter}`);
    
    const { reports } = this.filteredData;
    const expenses = [];
    
    // Lấy tất cả expenses từ reports đã filter
    reports.forEach(report => {
        if (report.expenses && Array.isArray(report.expenses)) {
            report.expenses.forEach(expense => {
                expenses.push({
                    date: report.date,
                    name: expense.name || 'Không có tên',
                    amount: expense.amount || 0,
                    addedAt: expense.addedAt || new Date().toISOString()
                });
            });
        }
    });
    
    console.log(`📊 Found ${expenses.length} expenses to print`);
    
    if (expenses.length === 0) {
        window.showToast('Không có chi phí nào trong khoảng thời gian này', 'info');
        return;
    }
    
    // Sắp xếp theo ngày mới nhất
    expenses.sort((a, b) => {
        const dateA = this.parseDisplayDate(a.date);
        const dateB = this.parseDisplayDate(b.date);
        return dateB - dateA;
    });
    
    this.printSimpleReport(expenses, 'CHI PHÍ', 'amount', 'Số tiền');
}
    
    printPurchases() {
        if (!this.filteredData) {
            window.showToast('Vui lòng chọn bộ lọc trước', 'warning');
            return;
        }
        
        const { inventory } = this.filteredData;
        this.printSimpleReport(inventory.purchaseList, 'MUA HÀNG', 'total', 'Thành tiền');
    }
    
    printServices() {
        if (!this.filteredData) {
            window.showToast('Vui lòng chọn bộ lọc trước', 'warning');
            return;
        }
        
        const { inventory } = this.filteredData;
        this.printSimpleReport(inventory.serviceList, 'DỊCH VỤ', 'amount', 'Số tiền');
    }
    // Hàm debug để kiểm tra dữ liệu
debugData() {
    console.log('=== DEBUG DASHBOARD DATA ===');
    console.log('Filter:', this.selectedQuickFilter);
    console.log('Date range:', this.startDate, '-', this.endDate);
    
    if (this.filteredData) {
        console.log('Reports count:', this.filteredData.reports.length);
        console.log('Sample reports:', this.filteredData.reports.slice(0, 3));
        
        // Kiểm tra expenses trong tất cả reports
        let allExpenses = [];
        this.filteredData.reports.forEach(report => {
            if (report.expenses) {
                allExpenses = allExpenses.concat(report.expenses.map(e => ({
                    date: report.date,
                    ...e
                })));
            }
        });
        
        console.log('Total expenses found:', allExpenses.length);
        console.log('Expenses sample:', allExpenses.slice(0, 5));
    }
    
    console.log('============================');
}
    printSimpleReport(data, title, amountField, amountLabel) {
    if (!data || data.length === 0) {
        window.showToast('Không có dữ liệu để in', 'warning');
        return;
    }
    
    try {
        // Tạo HTML cho print
        let printContent = `
            <html>
            <head>
                <title>Báo cáo ${title}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .print-header { text-align: center; margin-bottom: 20px; }
                    .print-title { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
                    .print-subtitle { font-size: 14px; color: #666; margin-bottom: 3px; }
                    .print-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    .print-table th, .print-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    .print-table th { background-color: #f2f2f2; }
                    .print-total { margin-top: 20px; text-align: right; font-weight: bold; font-size: 16px; }
                    .print-footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
                    .no-print { display: none; }
                    @media print {
                        body { margin: 0; padding: 10px; }
                        .no-print { display: none !important; }
                    }
                </style>
            </head>
            <body>
                <div class="print-header">
                    <div class="print-title">BÁO CÁO ${title}</div>
                    <div class="print-subtitle">Khoảng thời gian: ${this.startDate} - ${this.endDate}</div>
                    <div class="print-subtitle">Ngày in: ${new Date().toLocaleString('vi-VN')}</div>
                </div>
        `;
        
        // Bảng dữ liệu
        printContent += `<table class="print-table">`;
        
        // Header
        printContent += `
            <tr>
                <th>Ngày</th>
                <th>Tên</th>
                <th>Số tiền</th>
            </tr>
        `;
        
        // Data rows
        let total = 0;
        data.forEach(item => {
            const amount = item[amountField] || 0;
            total += amount;
            
            printContent += `
                <tr>
                    <td>${item.date}</td>
                    <td>${item.name || item.content || 'N/A'}</td>
                    <td>${amount.toLocaleString()} ₫</td>
                </tr>
            `;
        });
        
        printContent += `</table>`;
        
        // Tổng
        printContent += `
            <div class="print-total">
                Tổng ${title.toLowerCase()}: ${total.toLocaleString()} ₫
            </div>
        `;
        
        // Footer
        printContent += `
            <div class="print-footer">
                Milano Management System - Tự động in từ hệ thống<br>
                Filter: ${this.getFilterLabel(this.selectedQuickFilter)} • ${data.length} mục
            </div>
            <div class="no-print" style="margin-top: 20px; text-align: center;">
                <button onclick="window.print()" style="padding: 10px 20px; background: #10B981; color: white; border: none; border-radius: 5px; cursor: pointer; margin-right: 10px;">In trang</button>
                <button onclick="window.close()" style="padding: 10px 20px; background: #6B7280; color: white; border: none; border-radius: 5px; cursor: pointer;">Đóng</button>
            </div>
            <script>
                // Tự động in sau 500ms
                setTimeout(() => {
                    window.print();
                }, 500);
            </script>
        </body></html>
        `;
        
        // Mở cửa sổ in
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        printWindow.document.write(printContent);
        printWindow.document.close();
        
    } catch (error) {
        console.error('Error printing report:', error);
        window.showToast('Lỗi khi in báo cáo', 'error');
    }
}
    
    // ========== HELPER FUNCTIONS ==========
    parseDateKey(dateKey) {
        // dateKey format: YYYY-MM-DD
        const [year, month, day] = dateKey.split('-').map(Number);
        return new Date(year, month - 1, day);
    }
    
    formatDateKeyForDisplay(dateKey) {
        const [year, month, day] = dateKey.split('-');
        return `${day}/${month}/${year}`;
    }
    
    getDateRangeText() {
        if (this.startDate === this.endDate) {
            return this.startDate;
        }
        return `${this.startDate} - ${this.endDate}`;
    }
    
    getTypeLabel(type) {
        const labels = {
            'actual': 'Thực nhận',
            'transfers': 'Chuyển khoản',
            'expenses': 'Chi phí',
            'purchases': 'Mua hàng',
            'services': 'Dịch vụ',
            'inventory': 'Tồn kho',
            'products': 'Sản phẩm',
            'employees': 'Nhân viên',
            'salary': 'Lương',
            'off': 'Ngày OFF',
            'overtime': 'Tăng ca'
        };
        return labels[type] || type;
    }
    
    getHeaderLabel(header) {
        const labels = {
            'date': 'Ngày',
            'name': 'Tên',
            'content': 'Nội dung',
            'amount': 'Số tiền',
            'total': 'Thành tiền',
            'quantity': 'Số lượng',
            'unit': 'Đơn vị',
            'type': 'Loại',
            'note': 'Ghi chú'
        };
        return labels[header] || header;
    }
    
    getDefaultInventoryStats() {
        return {
            totalPurchases: 0,
            totalServices: 0,
            inventoryValue: 0,
            productCount: 0,
            purchaseList: [],
            serviceList: [],
            products: []
        };
    }
    
    getDefaultEmployeeStats() {
        return {
            employeeCount: 0,
            totalSalary: 0,
            totalOffDays: 0,
            totalOvertime: 0,
            employees: []
        };
    }
    
    clearAllCache() {
        this.inventoryStatsCache = null;
        this.cacheTimestamp = null;
        this.filteredData = null;
    }
    
    refreshDisplay() {
        if (this.filteredData) {
            this.updateUI();
        }
    }
    
    showDailyReport(date) {
        // Chuyển đến tab reports với ngày được chọn
        window.showTab('reports');
        
        // Tìm reports module và load ngày
        setTimeout(() => {
            if (window.reportsModule) {
                window.reportsModule.loadReport(date);
            }
        }, 500);
    }
    
    exportAll() {
        window.showToast('Tính năng xuất tất cả đang phát triển', 'info');
    }
    
    exportFinanceExcel() {
        window.showToast('Tính năng xuất Excel tài chính đang phát triển', 'info');
    }
    
    exportInventoryExcel() {
        window.showToast('Tính năng xuất Excel hàng hóa đang phát triển', 'info');
    }
    
    exportEmployeeExcel() {
        window.showToast('Tính năng xuất Excel nhân sự đang phát triển', 'info');
    }
    
    printFinance() {
        window.showToast('Tính năng in tài chính đang phát triển', 'info');
    }
    
    printInventory() {
        window.showToast('Tính năng in hàng hóa đang phát triển', 'info');
    }
    
    printEmployee() {
        window.showToast('Tính năng in nhân sự đang phát triển', 'info');
    }
    // HÀM MỚI - LẤY DỮ LIỆU TỪ DATAMANAGER THEO CÁCH ĐÚNG
async loadAllData(startDate, endDate) {
    try {
        console.log(`📥 Dashboard loading data from DataManager`);
        
        // 1. Lấy tất cả reports từ DataManager (ĐÃ ĐƯỢC TỐI ƯU)
        const allReports = window.dataManager.getReports();
        console.log(`📊 Got ${allReports.length} reports from DataManager`);
        
        // 2. Filter reports theo ngày
        const filteredReports = this.filterReportsByDate(allReports, startDate, endDate);
        console.log(`✅ Filtered to ${filteredReports.length} reports in date range`);
        
        // 3. Lấy inventory data từ DataManager
        const inventoryStats = this.calculateInventoryStats(startDate, endDate);
        
        // 4. Lấy employee data từ DataManager
        const employeeStats = this.calculateEmployeeStats();
        
        // 5. Cập nhật UI với dữ liệu mới
        this.filteredData = {
            reports: filteredReports,
            inventory: inventoryStats,
            employees: employeeStats
        };
        
        // 6. Cập nhật UI
        this.updateUI();
        
        // 7. Cập nhật data count
        const dataCountElement = document.getElementById('dataCount');
        if (dataCountElement) {
            dataCountElement.innerHTML = `
                <i class="fas fa-check-circle" style="color: #10B981;"></i>
                ${filteredReports.length} báo cáo • ${inventoryStats.productCount} sản phẩm • ${employeeStats.employeeCount} nhân viên
            `;
        }
        
        return this.filteredData;
        
    } catch (error) {
        console.error('❌ Error loading dashboard data:', error);
        
        const dataCountElement = document.getElementById('dataCount');
        if (dataCountElement) {
            dataCountElement.innerHTML = `<i class="fas fa-exclamation-triangle" style="color: #EF4444;"></i> Lỗi tải dữ liệu`;
        }
        
        return null;
    }
}
}

// Khởi tạo module
window.dashboardModule = new DashboardModule();