// dashboard.js - Module tổng quan với dữ liệu từ DB index
class DashboardModule {
    constructor() {
        this.viewMode = 'day';
        this.groupBy = 'none';
        this.startDate = this.formatDateForDisplay(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)); // 7 ngày trước
        this.endDate = this.formatDateForDisplay(new Date());
    }
    
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
    
    render() {
        const reports = window.dataManager.getReports(this.startDate, this.endDate);
        const dailyStats = this.calculateDailyStats(reports);
        const summary = this.calculateSummary(dailyStats);
        
        const mainContent = document.getElementById('mainContent');
        mainContent.innerHTML = `
            <div class="dashboard-container">
                <div class="dashboard-header">
                    <h1><i class="fas fa-tachometer-alt"></i> TỔNG QUAN</h1>
                </div>
                
                <div class="filter-controls">
                    <div class="filter-group">
                        <label>Xem theo:</label>
                        <select id="viewMode" onchange="window.dashboardModule.changeViewMode()">
                            <option value="day" ${this.viewMode === 'day' ? 'selected' : ''}>Ngày</option>
                            <option value="week" ${this.viewMode === 'week' ? 'selected' : ''}>Tuần</option>
                            <option value="month" ${this.viewMode === 'month' ? 'selected' : ''}>Tháng</option>
                        </select>
                    </div>
                    
                    <div class="date-range">
                        <div class="date-input">
                            <label>Từ:</label>
                            <input type="date" id="startDate" value="${this.getInputDateValue(this.startDate)}">
                        </div>
                        <div class="date-input">
                            <label>Đến:</label>
                            <input type="date" id="endDate" value="${this.getInputDateValue(this.endDate)}">
                        </div>
                        <button class="btn-small" onclick="window.dashboardModule.applyDateFilter()">
                            <i class="fas fa-filter"></i>
                        </button>
                    </div>
                </div>
                
                <div class="summary-cards">
                    <div class="summary-card">
                        <i class="fas fa-chart-line"></i>
                        <div>
                            <div class="summary-label">Tổng doanh thu</div>
                            <div class="summary-value">${summary.totalRevenue.toLocaleString()} ₫</div>
                        </div>
                    </div>
                    
                    <div class="summary-card">
                        <i class="fas fa-money-bill-wave"></i>
                        <div>
                            <div class="summary-label">Tổng thực nhận</div>
                            <div class="summary-value">${summary.totalActual.toLocaleString()} ₫</div>
                        </div>
                    </div>
                    
                    <div class="summary-card">
                        <i class="fas fa-credit-card"></i>
                        <div>
                            <div class="summary-label">Tổng chi phí</div>
                            <div class="summary-value">${summary.totalExpenses.toLocaleString()} ₫</div>
                        </div>
                    </div>
                    
                    <div class="summary-card">
                        <i class="fas fa-percentage"></i>
                        <div>
                            <div class="summary-label">Tỷ lệ thực nhận</div>
                            <div class="summary-value">${summary.receiptRate}%</div>
                        </div>
                    </div>
                </div>
                
                <div class="daily-reports-section">
                    <h2>📊 BÁO CÁO HÀNG NGÀY</h2>
                    <div class="stats-table">
                        <div class="stats-header">
                            <span>NGÀY</span>
                            <span>DOANH THU</span>
                            <span>THỰC NHẬN</span>
                        </div>
                        
                        ${dailyStats.map(stat => `
                            <div class="stats-row">
                                <span class="stat-date">${stat.date}</span>
                                <span class="stat-revenue">${stat.revenue.toLocaleString()} ₫</span>
                                <span class="stat-actual ${stat.actual >= 0 ? 'positive' : 'negative'}">
                                    ${stat.actual.toLocaleString()} ₫
                                </span>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="stats-summary">
                        <div class="summary-item">
                            <span>Tổng doanh thu:</span>
                            <strong>${summary.totalRevenue.toLocaleString()} ₫</strong>
                        </div>
                        <div class="summary-item">
                            <span>Tổng thực nhận:</span>
                            <strong>${summary.totalActual.toLocaleString()} ₫</strong>
                        </div>
                        <div class="summary-item">
                            <span>Tỷ lệ:</span>
                            <strong>${summary.receiptRate}%</strong>
                        </div>
                    </div>
                </div>
                
                <div class="action-card" onclick="window.dashboardModule.toggleExpensesAnalysis()">
                    <i class="fas fa-chart-pie"></i>
                    <span>📊 PHÂN TÍCH CHI TIÊU</span>
                    <i class="fas fa-chevron-down" id="expensesAnalysisToggle"></i>
                </div>
                
                <div id="expensesAnalysisSection" class="collapsible-section" style="display: none;">
                    <!-- Phân tích chi tiêu sẽ được render riêng -->
                </div>
                
                <div class="action-card" onclick="window.dashboardModule.toggleInventoryAnalysis()">
                    <i class="fas fa-boxes"></i>
                    <span>📦 PHÂN TÍCH KHO HÀNG</span>
                    <i class="fas fa-chevron-down" id="inventoryAnalysisToggle"></i>
                </div>
                
                <div id="inventoryAnalysisSection" class="collapsible-section" style="display: none;">
                    <!-- Phân tích kho hàng sẽ được render riêng -->
                </div>
                
                <div class="action-card" onclick="window.dashboardModule.toggleEmployeeAnalysis()">
                    <i class="fas fa-users"></i>
                    <span>👥 PHÂN TÍCH NHÂN SỰ</span>
                    <i class="fas fa-chevron-down" id="employeeAnalysisToggle"></i>
                </div>
                
                <div id="employeeAnalysisSection" class="collapsible-section" style="display: none;">
                    <!-- Phân tích nhân sự sẽ được render riêng -->
                </div>
            </div>
        `;
    }
    
    getInputDateValue(dateStr) {
        const [day, month, year] = dateStr.split('/');
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    calculateDailyStats(reports) {
        return reports.map(report => ({
            date: report.date,
            revenue: report.revenue || 0,
            actual: report.actualReceived || 0,
            expenses: (report.expenses || []).reduce((sum, e) => sum + e.amount, 0),
            transfers: (report.transfers || []).reduce((sum, t) => sum + t.amount, 0)
        })).sort((a, b) => this.parseDisplayDate(b.date) - this.parseDisplayDate(a.date));
    }
    
    calculateSummary(dailyStats) {
        const totalRevenue = dailyStats.reduce((sum, s) => sum + s.revenue, 0);
        const totalActual = dailyStats.reduce((sum, s) => sum + s.actual, 0);
        const totalExpenses = dailyStats.reduce((sum, s) => sum + s.expenses, 0);
        const receiptRate = totalRevenue > 0 ? ((totalActual / totalRevenue) * 100).toFixed(1) : 0;
        
        return {
            totalRevenue,
            totalActual,
            totalExpenses,
            receiptRate
        };
    }
    
    changeViewMode() {
        const select = document.getElementById('viewMode');
        this.viewMode = select.value;
        
        // Cập nhật ngày theo view mode
        const now = new Date();
        switch(this.viewMode) {
            case 'week':
                const weekAgo = new Date(now);
                weekAgo.setDate(weekAgo.getDate() - 7);
                this.startDate = this.formatDateForDisplay(weekAgo);
                this.endDate = this.formatDateForDisplay(now);
                break;
            case 'month':
                const monthAgo = new Date(now);
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                this.startDate = this.formatDateForDisplay(monthAgo);
                this.endDate = this.formatDateForDisplay(now);
                break;
        }
        
        this.render();
    }
    
    applyDateFilter() {
        const startInput = document.getElementById('startDate').value;
        const endInput = document.getElementById('endDate').value;
        
        if (startInput && endInput) {
            const [startYear, startMonth, startDay] = startInput.split('-');
            const [endYear, endMonth, endDay] = endInput.split('-');
            
            this.startDate = `${startDay}/${startMonth}/${startYear}`;
            this.endDate = `${endDay}/${endMonth}/${endYear}`;
            
            this.render();
        }
    }
    
    toggleExpensesAnalysis() {
        const section = document.getElementById('expensesAnalysisSection');
        const toggleIcon = document.getElementById('expensesAnalysisToggle');
        
        if (section.style.display === 'none') {
            section.style.display = 'block';
            toggleIcon.className = 'fas fa-chevron-up';
            this.renderExpensesAnalysis();
        } else {
            section.style.display = 'none';
            toggleIcon.className = 'fas fa-chevron-down';
        }
    }
    
    renderExpensesAnalysis() {
        const section = document.getElementById('expensesAnalysisSection');
        if (!section) return;
        
        // Lấy tất cả reports trong khoảng thời gian
        const reports = window.dataManager.getReports(this.startDate, this.endDate);
        
        // Tổng hợp chi phí
        const expenseCategories = {};
        let totalExpenses = 0;
        
        reports.forEach(report => {
            if (report.expenses && Array.isArray(report.expenses)) {
                report.expenses.forEach(expense => {
                    const category = expense.name;
                    if (!expenseCategories[category]) {
                        expenseCategories[category] = {
                            amount: 0,
                            count: 0
                        };
                    }
                    expenseCategories[category].amount += expense.amount;
                    expenseCategories[category].count++;
                    totalExpenses += expense.amount;
                });
            }
        });
        
        // Sắp xếp theo số tiền giảm dần
        const sortedCategories = Object.entries(expenseCategories)
            .sort(([, a], [, b]) => b.amount - a.amount);
        
        section.innerHTML = `
            <div class="analysis-container">
                <h4>📊 PHÂN TÍCH CHI TIÊU (${this.startDate} - ${this.endDate})</h4>
                
                <div class="analysis-summary">
                    <div class="summary-item">
                        <span>Tổng chi phí:</span>
                        <strong>${totalExpenses.toLocaleString()} ₫</strong>
                    </div>
                    <div class="summary-item">
                        <span>Số loại chi phí:</span>
                        <strong>${sortedCategories.length}</strong>
                    </div>
                    <div class="summary-item">
                        <span>Trung bình/ngày:</span>
                        <strong>${(totalExpenses / reports.length).toLocaleString()} ₫</strong>
                    </div>
                </div>
                
                <div class="analysis-table">
                    <div class="analysis-header">
                        <span>LOẠI CHI PHÍ</span>
                        <span>SỐ LẦN</span>
                        <span>TỔNG TIỀN</span>
                        <span>TỶ LỆ</span>
                    </div>
                    
                    ${sortedCategories.map(([category, data]) => {
                        const percentage = totalExpenses > 0 ? ((data.amount / totalExpenses) * 100).toFixed(1) : 0;
                        return `
                            <div class="analysis-row">
                                <span class="category-name">${category}</span>
                                <span class="category-count">${data.count}</span>
                                <span class="category-amount">${data.amount.toLocaleString()} ₫</span>
                                <span class="category-percentage">${percentage}%</span>
                            </div>
                        `;
                    }).join('')}
                </div>
                
                <div class="analysis-chart">
                    <h5>Biểu đồ phân bổ chi phí</h5>
                    <div class="chart-container">
                        ${sortedCategories.map(([category, data], index) => {
                            const percentage = totalExpenses > 0 ? ((data.amount / totalExpenses) * 100) : 0;
                            const colors = ['#10B981', '#3B82F6', '#EF4444', '#F59E0B', '#8B5CF6'];
                            const color = colors[index % colors.length];
                            
                            return `
                                <div class="chart-bar" style="width: ${percentage}%; background: ${color};">
                                    <div class="chart-label">${category} (${percentage.toFixed(1)}%)</div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
    }
    
    toggleInventoryAnalysis() {
        const section = document.getElementById('inventoryAnalysisSection');
        const toggleIcon = document.getElementById('inventoryAnalysisToggle');
        
        if (section.style.display === 'none') {
            section.style.display = 'block';
            toggleIcon.className = 'fas fa-chevron-up';
            this.renderInventoryAnalysis();
        } else {
            section.style.display = 'none';
            toggleIcon.className = 'fas fa-chevron-down';
        }
    }
    
    renderInventoryAnalysis() {
        const section = document.getElementById('inventoryAnalysisSection');
        if (!section) return;
        
        // Lấy dữ liệu kho hàng
        const products = window.dataManager.getInventoryProducts();
        const totalValue = products.reduce((sum, p) => sum + (p.totalValue || 0), 0);
        
        // Sắp xếp sản phẩm theo giá trị
        const sortedProducts = [...products].sort((a, b) => (b.totalValue || 0) - (a.totalValue || 0));
        
        section.innerHTML = `
            <div class="analysis-container">
                <h4>📦 PHÂN TÍCH KHO HÀNG</h4>
                
                <div class="analysis-summary">
                    <div class="summary-item">
                        <span>Tổng sản phẩm:</span>
                        <strong>${products.length}</strong>
                    </div>
                    <div class="summary-item">
                        <span>Tổng số lượng:</span>
                        <strong>${products.reduce((sum, p) => sum + p.quantity, 0)}</strong>
                    </div>
                    <div class="summary-item">
                        <span>Tổng giá trị:</span>
                        <strong>${totalValue.toLocaleString()} ₫</strong>
                    </div>
                </div>
                
                <div class="analysis-table">
                    <div class="analysis-header">
                        <span>SẢN PHẨM</span>
                        <span>SỐ LƯỢNG</span>
                        <span>ĐƠN VỊ</span>
                        <span>GIÁ TRỊ</span>
                    </div>
                    
                    ${sortedProducts.slice(0, 10).map(product => {
                        const percentage = totalValue > 0 ? (((product.totalValue || 0) / totalValue) * 100).toFixed(1) : 0;
                        return `
                            <div class="analysis-row">
                                <span class="product-name">${product.name}</span>
                                <span class="product-quantity">${product.quantity}</span>
                                <span class="product-unit">${product.unit}</span>
                                <span class="product-value">${(product.totalValue || 0).toLocaleString()} ₫ (${percentage}%)</span>
                            </div>
                        `;
                    }).join('')}
                </div>
                
                <div class="inventory-insights">
                    <h5>📈 Nhận xét về kho hàng</h5>
                    <ul>
                        <li>Tổng giá trị kho: <strong>${totalValue.toLocaleString()} ₫</strong></li>
                        <li>Sản phẩm có giá trị cao nhất: <strong>${sortedProducts[0]?.name || 'N/A'}</strong> (${(sortedProducts[0]?.totalValue || 0).toLocaleString()} ₫)</li>
                        <li>Số lượng sản phẩm trung bình: <strong>${(products.reduce((sum, p) => sum + p.quantity, 0) / products.length).toFixed(1)}</strong> ${products[0]?.unit || 'đơn vị'}/sản phẩm</li>
                        <li>Giá trị trung bình/sản phẩm: <strong>${(totalValue / products.length).toLocaleString()} ₫</strong></li>
                    </ul>
                </div>
            </div>
        `;
    }
    
    toggleEmployeeAnalysis() {
        const section = document.getElementById('employeeAnalysisSection');
        const toggleIcon = document.getElementById('employeeAnalysisToggle');
        
        if (section.style.display === 'none') {
            section.style.display = 'block';
            toggleIcon.className = 'fas fa-chevron-up';
            this.renderEmployeeAnalysis();
        } else {
            section.style.display = 'none';
            toggleIcon.className = 'fas fa-chevron-down';
        }
    }
    
    renderEmployeeAnalysis() {
        const section = document.getElementById('employeeAnalysisSection');
        if (!section) return;
        
        // Lấy dữ liệu nhân viên
        const employees = window.dataManager.getEmployees();
        
        // Tính toán lương
        const salaryData = employees.map(employee => {
            const salary = window.employeesModule.calculateEmployeeSalary(employee);
            return {
                name: employee.name,
                baseSalary: employee.baseSalary || 0,
                actualSalary: salary.actual,
                offDays: salary.off,
                overtimeDays: salary.overtime
            };
        });
        
        const totalSalary = salaryData.reduce((sum, e) => sum + e.actualSalary, 0);
        const avgSalary = employees.length > 0 ? totalSalary / employees.length : 0;
        
        section.innerHTML = `
            <div class="analysis-container">
                <h4>👥 PHÂN TÍCH NHÂN SỰ</h4>
                
                <div class="analysis-summary">
                    <div class="summary-item">
                        <span>Tổng nhân viên:</span>
                        <strong>${employees.length}</strong>
                    </div>
                    <div class="summary-item">
                        <span>Tổng lương tháng:</span>
                        <strong>${totalSalary.toLocaleString()} ₫</strong>
                    </div>
                    <div class="summary-item">
                        <span>Lương trung bình:</span>
                        <strong>${avgSalary.toLocaleString()} ₫</strong>
                    </div>
                </div>
                
                <div class="analysis-table">
                    <div class="analysis-header">
                        <span>NHÂN VIÊN</span>
                        <span>LƯƠNG CƠ BẢN</span>
                        <span>THỰC LÃNH</span>
                        <span>OFF/TĂNG CA</span>
                    </div>
                    
                    ${salaryData.map(employee => {
                        const difference = employee.actualSalary - employee.baseSalary;
                        const differenceText = difference > 0 ? `+${difference.toLocaleString()}` : difference.toLocaleString();
                        const differenceClass = difference > 0 ? 'positive' : difference < 0 ? 'negative' : '';
                        
                        return `
                            <div class="analysis-row">
                                <span class="employee-name">${employee.name}</span>
                                <span class="employee-base">${employee.baseSalary.toLocaleString()} ₫</span>
                                <span class="employee-actual ${differenceClass}">
                                    ${employee.actualSalary.toLocaleString()} ₫ 
                                    <small>(${differenceText} ₫)</small>
                                </span>
                                <span class="employee-days">
                                    OFF: ${employee.offDays} | Tăng ca: ${employee.overtimeDays}
                                </span>
                            </div>
                        `;
                    }).join('')}
                </div>
                
                <div class="employee-insights">
                    <h5>📊 Thống kê nhân sự</h5>
                    <ul>
                        <li>Tổng chi phí lương: <strong>${totalSalary.toLocaleString()} ₫</strong></li>
                        <li>Lương cao nhất: <strong>${Math.max(...salaryData.map(e => e.actualSalary)).toLocaleString()} ₫</strong></li>
                        <li>Lương thấp nhất: <strong>${Math.min(...salaryData.map(e => e.actualSalary)).toLocaleString()} ₫</strong></li>
                        <li>Tổng ngày OFF: <strong>${salaryData.reduce((sum, e) => sum + e.offDays, 0)}</strong></li>
                        <li>Tổng ngày tăng ca: <strong>${salaryData.reduce((sum, e) => sum + e.overtimeDays, 0)}</strong></li>
                    </ul>
                </div>
            </div>
        `;
    }
}

// Khởi tạo module
window.dashboardModule = new DashboardModule();