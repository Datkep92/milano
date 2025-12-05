// reports-dashboard.js - Hệ thống thống kê và báo cáo tổng quan

class ReportsDashboard {
    constructor() {
        this.currentView = 'daily'; // 'daily' hoặc 'aggregated'
        this.dateRange = {
            start: null,
            end: null
        };
        this.reportsData = [];
        this.initialize();
    }

    async initialize() {
        console.log('📊 Khởi tạo Reports Dashboard...');
        this.setupEventListeners();
        await this.loadDefaultDateRange();
    }

    // Tải khoảng thời gian mặc định (7 ngày gần nhất)
    async loadDefaultDateRange() {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7); // 7 ngày gần nhất
        
        this.dateRange.start = startDate.toISOString().split('T')[0];
        this.dateRange.end = endDate.toISOString().split('T')[0];
        
        // Cập nhật UI
        const startInput = document.getElementById('reportStartDate');
        const endInput = document.getElementById('reportEndDate');
        
        if (startInput) startInput.value = this.dateRange.start;
        if (endInput) endInput.value = this.dateRange.end;
    }

    setupEventListeners() {
        // Nút tải báo cáo
        const loadReportsBtn = document.getElementById('loadReportsBtn');
        if (loadReportsBtn) {
            loadReportsBtn.addEventListener('click', () => this.loadReportsByDateRange());
        }

        // Chế độ xem (ngày/gộp)
        const viewModeDaily = document.getElementById('viewModeDaily');
        const viewModeAggregated = document.getElementById('viewModeAggregated');
        
        if (viewModeDaily) {
            viewModeDaily.addEventListener('click', () => this.switchViewMode('daily'));
        }
        
        if (viewModeAggregated) {
            viewModeAggregated.addEventListener('click', () => this.switchViewMode('aggregated'));
        }

        // Export báo cáo
        const exportReportBtn = document.getElementById('exportReportBtn');
        if (exportReportBtn) {
            exportReportBtn.addEventListener('click', () => this.exportReport());
        }

        // Xem chi tiết báo cáo
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('view-report-detail')) {
                const reportId = e.target.dataset.reportId;
                this.viewReportDetail(reportId);
            }
        });
    }

    // Tải báo cáo theo khoảng thời gian
    async loadReportsByDateRange() {
        try {
            const startDate = document.getElementById('reportStartDate').value;
            const endDate = document.getElementById('reportEndDate').value;
            
            if (!startDate || !endDate) {
                this.showMessage('Vui lòng chọn khoảng thời gian', 'warning');
                return;
            }
            
            if (new Date(startDate) > new Date(endDate)) {
                this.showMessage('Ngày bắt đầu không thể lớn hơn ngày kết thúc', 'error');
                return;
            }
            
            this.showLoading(true);
            
            // Lấy tất cả báo cáo
            const allReports = await dataManager.getAllReports();
            
            // Lọc theo khoảng thời gian
            this.reportsData = allReports.filter(report => {
                const reportDate = new Date(report.date);
                return reportDate >= new Date(startDate) && 
                       reportDate <= new Date(endDate);
            });
            
            // Sắp xếp theo ngày (mới nhất trước)
            this.reportsData.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            this.dateRange.start = startDate;
            this.dateRange.end = endDate;
            
            console.log(`📈 Đã tải ${this.reportsData.length} báo cáo từ ${startDate} đến ${endDate}`);
            
            // Hiển thị kết quả
            this.displayReports();
            this.displaySummary();
            
            this.showMessage(`Đã tải ${this.reportsData.length} báo cáo`, 'success');
            
        } catch (error) {
            console.error('❌ Lỗi tải báo cáo:', error);
            this.showMessage(`Lỗi: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // Hiển thị danh sách báo cáo
    displayReports() {
        const reportsList = document.getElementById('reportsDashboardList');
        if (!reportsList) return;
        
        if (this.reportsData.length === 0) {
            reportsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-alt"></i>
                    <p>Không có báo cáo nào trong khoảng thời gian này</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        
        if (this.currentView === 'daily') {
            // Chế độ xem theo ngày
            html = this.renderDailyView();
        } else {
            // Chế độ xem gộp
            html = this.renderAggregatedView();
        }
        
        reportsList.innerHTML = html;
    }

    // Render chế độ xem theo ngày
    renderDailyView() {
        let html = '<div class="daily-reports-container">';
        
        // Nhóm báo cáo theo ngày
        const reportsByDate = this.groupReportsByDate();
        
        for (const [date, reports] of Object.entries(reportsByDate)) {
            // Lấy báo cáo mới nhất của ngày (nếu có nhiều bản ghi)
            const latestReport = reports[0];
            
            // Tính tổng cho ngày
            const dailySummary = this.calculateDailySummary(reports);
            
            html += `
                <div class="daily-report-card">
                    <div class="daily-report-header">
                        <h4>📅 ${this.formatDate(date)}</h4>
                        <span class="report-count">${reports.length} báo cáo</span>
                    </div>
                    
                    <div class="daily-report-summary">
                        <div class="summary-item">
                            <span class="label">Doanh thu:</span>
                            <span class="value positive">${this.formatCurrency(dailySummary.revenue)}</span>
                        </div>
                        <div class="summary-item">
                            <span class="label">Chi phí:</span>
                            <span class="value negative">${this.formatCurrency(dailySummary.expenses)}</span>
                        </div>
                        <div class="summary-item">
                            <span class="label">Chuyển khoản:</span>
                            <span class="value neutral">${this.formatCurrency(dailySummary.transfers)}</span>
                        </div>
                        <div class="summary-item highlight">
                            <span class="label">Thực lãnh:</span>
                            <span class="value ${dailySummary.actualProfit >= 0 ? 'positive' : 'negative'}">
                                ${this.formatCurrency(dailySummary.actualProfit)}
                            </span>
                        </div>
                    </div>
                    
                    <div class="daily-report-details">
                        <button class="small-btn view-report-detail" data-report-id="${latestReport.id}">
                            <i class="fas fa-eye"></i> Xem chi tiết
                        </button>
                        <div class="inventory-preview">
                            <i class="fas fa-boxes"></i> 
                            ${latestReport.inventory?.length || 0} mặt hàng xuất kho
                        </div>
                    </div>
                    
                    ${reports.length > 1 ? `
                        <div class="report-versions">
                            <small><i class="fas fa-history"></i> Có ${reports.length - 1} phiên bản sửa trước đó</small>
                        </div>
                    ` : ''}
                </div>
            `;
        }
        
        html += '</div>';
        return html;
    }

    // Render chế độ xem gộp
    renderAggregatedView() {
        const aggregatedData = this.calculateAggregatedData();
        
        let html = `
            <div class="aggregated-report">
                <div class="aggregated-header">
                    <h3>📊 Tổng hợp báo cáo từ ${this.formatDate(this.dateRange.start)} đến ${this.formatDate(this.dateRange.end)}</h3>
                    <div class="total-days">${this.reportsData.length} báo cáo / ${this.getUniqueDays()} ngày</div>
                </div>
                
                <div class="aggregated-stats">
                    <div class="stat-card large">
                        <div class="stat-icon">
                            <i class="fas fa-money-bill-wave"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-label">Tổng doanh thu</div>
                            <div class="stat-value positive">${this.formatCurrency(aggregatedData.totalRevenue)}</div>
                        </div>
                    </div>
                    
                    <div class="stat-card large">
                        <div class="stat-icon">
                            <i class="fas fa-receipt"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-label">Tổng chi phí</div>
                            <div class="stat-value negative">${this.formatCurrency(aggregatedData.totalExpenses)}</div>
                            <div class="stat-detail">
                                ${aggregatedData.expenseCategories.length} loại chi phí
                            </div>
                        </div>
                    </div>
                    
                    <div class="stat-card large">
                        <div class="stat-icon">
                            <i class="fas fa-exchange-alt"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-label">Tổng chuyển khoản</div>
                            <div class="stat-value neutral">${this.formatCurrency(aggregatedData.totalTransfers)}</div>
                        </div>
                    </div>
                    
                    <div class="stat-card large highlight">
                        <div class="stat-icon">
                            <i class="fas fa-chart-line"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-label">Tổng thực lãnh</div>
                            <div class="stat-value ${aggregatedData.totalActualProfit >= 0 ? 'positive' : 'negative'}">
                                ${this.formatCurrency(aggregatedData.totalActualProfit)}
                            </div>
                            <div class="stat-detail">
                                Trung bình: ${this.formatCurrency(aggregatedData.averageDailyProfit)}/ngày
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="detailed-breakdown">
                    <!-- Chi phí chi tiết -->
                    <div class="breakdown-section">
                        <h4><i class="fas fa-receipt"></i> Phân tích chi phí</h4>
                        <div class="breakdown-content" id="expensesBreakdown">
                            <!-- Sẽ được điền bên dưới -->
                        </div>
                    </div>
                    
                    <!-- Chuyển khoản chi tiết -->
                    <div class="breakdown-section">
                        <h4><i class="fas fa-exchange-alt"></i> Phân tích chuyển khoản</h4>
                        <div class="breakdown-content" id="transfersBreakdown">
                            <!-- Sẽ được điền bên dưới -->
                        </div>
                    </div>
                    
                    <!-- Thống kê kho hàng -->
                    <div class="breakdown-section">
                        <h4><i class="fas fa-warehouse"></i> Thống kê xuất kho</h4>
                        <div class="breakdown-content">
                            <p>Tổng số mặt hàng xuất: <strong>${aggregatedData.totalInventoryItems}</strong></p>
                            <p>Số ngày có xuất kho: <strong>${aggregatedData.daysWithInventory}</strong> ngày</p>
                            <p>Trung bình: <strong>${Math.round(aggregatedData.averageInventoryPerDay)}</strong> mặt hàng/ngày</p>
                        </div>
                    </div>
                </div>
                
                <div class="daily-comparison">
                    <h4><i class="fas fa-chart-bar"></i> Biểu đồ doanh thu theo ngày</h4>
                    <div id="revenueChart">
                        <!-- Biểu đồ đơn giản bằng HTML -->
                        <div class="chart-container">
                            ${this.renderSimpleRevenueChart()}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        return html;
    }

    // Hiển thị tổng quan thống kê
    displaySummary() {
        const summaryElement = document.getElementById('reportsSummary');
        if (!summaryElement) return;
        
        if (this.reportsData.length === 0) {
            summaryElement.innerHTML = '<p class="no-data">Không có dữ liệu để thống kê</p>';
            return;
        }
        
        const aggregatedData = this.calculateAggregatedData();
        
        summaryElement.innerHTML = `
            <div class="quick-summary">
                <div class="summary-item">
                    <i class="fas fa-calendar-alt"></i>
                    <div>
                        <div class="label">Khoảng thời gian</div>
                        <div class="value">${this.formatDate(this.dateRange.start)} - ${this.formatDate(this.dateRange.end)}</div>
                    </div>
                </div>
                <div class="summary-item">
                    <i class="fas fa-file-alt"></i>
                    <div>
                        <div class="label">Số báo cáo</div>
                        <div class="value">${this.reportsData.length}</div>
                    </div>
                </div>
                <div class="summary-item">
                    <i class="fas fa-money-bill-wave"></i>
                    <div>
                        <div class="label">Tổng doanh thu</div>
                        <div class="value positive">${this.formatCurrency(aggregatedData.totalRevenue)}</div>
                    </div>
                </div>
                <div class="summary-item">
                    <i class="fas fa-wallet"></i>
                    <div>
                        <div class="label">Tổng thực lãnh</div>
                        <div class="value ${aggregatedData.totalActualProfit >= 0 ? 'positive' : 'negative'}">
                            ${this.formatCurrency(aggregatedData.totalActualProfit)}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Hiển thị breakdown chi tiết nếu ở chế độ gộp
        if (this.currentView === 'aggregated') {
            this.displayExpensesBreakdown(aggregatedData.expenseCategories);
            this.displayTransfersBreakdown(aggregatedData.transferCategories);
        }
    }

    // Hiển thị phân tích chi phí
    displayExpensesBreakdown(categories) {
        const breakdownElement = document.getElementById('expensesBreakdown');
        if (!breakdownElement) return;
        
        if (categories.length === 0) {
            breakdownElement.innerHTML = '<p class="no-data">Không có chi phí nào</p>';
            return;
        }
        
        let html = '<div class="categories-list">';
        
        categories.forEach(category => {
            const percentage = category.total > 0 ? 
                Math.round((category.total / this.calculateAggregatedData().totalExpenses) * 100) : 0;
            
            html += `
                <div class="category-item">
                    <div class="category-name">
                        <span>${category.name}</span>
                        <span class="category-count">${category.count} lần</span>
                    </div>
                    <div class="category-details">
                        <div class="category-amount negative">${this.formatCurrency(category.total)}</div>
                        <div class="category-percentage">${percentage}%</div>
                        <div class="category-bar">
                            <div class="bar-fill" style="width: ${percentage}%"></div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        breakdownElement.innerHTML = html;
    }

    // Hiển thị phân tích chuyển khoản
    displayTransfersBreakdown(categories) {
        const breakdownElement = document.getElementById('transfersBreakdown');
        if (!breakdownElement) return;
        
        if (categories.length === 0) {
            breakdownElement.innerHTML = '<p class="no-data">Không có chuyển khoản nào</p>';
            return;
        }
        
        let html = '<div class="categories-list">';
        
        categories.forEach(category => {
            const percentage = category.total > 0 ? 
                Math.round((category.total / this.calculateAggregatedData().totalTransfers) * 100) : 0;
            
            html += `
                <div class="category-item">
                    <div class="category-name">
                        <span>${category.name || 'Không có tên'}</span>
                        <span class="category-count">${category.count} lần</span>
                    </div>
                    <div class="category-details">
                        <div class="category-amount neutral">${this.formatCurrency(category.total)}</div>
                        <div class="category-percentage">${percentage}%</div>
                        <div class="category-bar">
                            <div class="bar-fill" style="width: ${percentage}%"></div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        breakdownElement.innerHTML = html;
    }

    // Tính toán dữ liệu gộp
    calculateAggregatedData() {
        const result = {
            totalRevenue: 0,
            totalExpenses: 0,
            totalTransfers: 0,
            totalActualProfit: 0,
            totalInventoryItems: 0,
            daysWithInventory: 0,
            expenseCategories: [],
            transferCategories: [],
            days: []
        };
        
        const expenseMap = new Map();
        const transferMap = new Map();
        const daysSet = new Set();
        
        this.reportsData.forEach(report => {
            // Doanh thu
            result.totalRevenue += parseFloat(report.revenue || 0);
            
            // Chi phí
            if (report.expenses && Array.isArray(report.expenses)) {
                report.expenses.forEach(expense => {
                    result.totalExpenses += parseFloat(expense.amount || 0);
                    
                    // Phân loại chi phí
                    const name = expense.name || 'Không có tên';
                    if (expenseMap.has(name)) {
                        const item = expenseMap.get(name);
                        item.total += parseFloat(expense.amount || 0);
                        item.count += 1;
                    } else {
                        expenseMap.set(name, {
                            name: name,
                            total: parseFloat(expense.amount || 0),
                            count: 1
                        });
                    }
                });
            }
            
            // Chuyển khoản
            if (report.transfers && Array.isArray(report.transfers)) {
                report.transfers.forEach(transfer => {
                    result.totalTransfers += parseFloat(transfer.amount || 0);
                    
                    // Phân loại chuyển khoản
                    const name = transfer.name || 'Không có tên';
                    if (transferMap.has(name)) {
                        const item = transferMap.get(name);
                        item.total += parseFloat(transfer.amount || 0);
                        item.count += 1;
                    } else {
                        transferMap.set(name, {
                            name: name,
                            total: parseFloat(transfer.amount || 0),
                            count: 1
                        });
                    }
                });
            }
            
            // Thực lãnh
            result.totalActualProfit += parseFloat(report.actualProfit || 0);
            
            // Kho hàng
            if (report.inventory && Array.isArray(report.inventory)) {
                result.totalInventoryItems += report.inventory.length;
                if (report.inventory.length > 0) {
                    result.daysWithInventory++;
                }
            }
            
            // Ngày
            daysSet.add(report.date);
        });
        
        // Chuyển Map thành Array
        result.expenseCategories = Array.from(expenseMap.values())
            .sort((a, b) => b.total - a.total);
        
        result.transferCategories = Array.from(transferMap.values())
            .sort((a, b) => b.total - a.total);
        
        // Tính trung bình
        result.averageDailyProfit = result.totalActualProfit / this.getUniqueDays();
        result.averageInventoryPerDay = result.totalInventoryItems / this.getUniqueDays();
        
        return result;
    }

    // Tính tổng theo ngày
    calculateDailySummary(reports) {
        const summary = {
            revenue: 0,
            expenses: 0,
            transfers: 0,
            actualProfit: 0
        };
        
        reports.forEach(report => {
            summary.revenue += parseFloat(report.revenue || 0);
            summary.actualProfit += parseFloat(report.actualProfit || 0);
            
            if (report.expenses && Array.isArray(report.expenses)) {
                report.expenses.forEach(expense => {
                    summary.expenses += parseFloat(expense.amount || 0);
                });
            }
            
            if (report.transfers && Array.isArray(report.transfers)) {
                report.transfers.forEach(transfer => {
                    summary.transfers += parseFloat(transfer.amount || 0);
                });
            }
        });
        
        return summary;
    }

    // Nhóm báo cáo theo ngày
    groupReportsByDate() {
        const groups = {};
        
        this.reportsData.forEach(report => {
            if (!groups[report.date]) {
                groups[report.date] = [];
            }
            groups[report.date].push(report);
        });
        
        return groups;
    }

    // Lấy số ngày duy nhất
    getUniqueDays() {
        const uniqueDays = new Set(this.reportsData.map(report => report.date));
        return uniqueDays.size;
    }

    // Chuyển đổi chế độ xem
    switchViewMode(mode) {
        this.currentView = mode;
        this.displayReports();
        
        // Cập nhật nút active
        document.querySelectorAll('.view-mode-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        if (mode === 'daily') {
            document.getElementById('viewModeDaily').classList.add('active');
        } else {
            document.getElementById('viewModeAggregated').classList.add('active');
        }
    }

    // Xem chi tiết báo cáo
    viewReportDetail(reportId) {
        // Tìm báo cáo
        const report = this.reportsData.find(r => r.id === parseInt(reportId));
        
        if (!report) {
            this.showMessage('Không tìm thấy báo cáo', 'error');
            return;
        }
        
        // Mở modal chi tiết
        this.openReportDetailModal(report);
    }

    // Mở modal chi tiết báo cáo
    openReportDetailModal(report) {
        // Tạo modal nếu chưa có
        if (!document.getElementById('reportDetailModal')) {
            this.createReportDetailModal();
        }
        
        const modal = document.getElementById('reportDetailModal');
        const content = document.getElementById('reportDetailContent');
        
        // Điền thông tin chi tiết
        content.innerHTML = this.renderReportDetail(report);
        
        // Hiển thị modal
        modal.style.display = 'block';
    }

    // Render chi tiết báo cáo
    renderReportDetail(report) {
        return `
            <div class="report-detail-view">
                <div class="report-detail-header">
                    <h3>📋 Báo cáo ngày ${report.date}</h3>
                    <div class="report-meta">
                        <span><i class="far fa-clock"></i> ${new Date(report.timestamp).toLocaleString('vi-VN')}</span>
                        ${report.edited ? '<span class="badge warning"><i class="fas fa-edit"></i> Đã sửa</span>' : ''}
                    </div>
                </div>
                
                <div class="report-detail-summary">
                    <div class="detail-card">
                        <div class="detail-label">Doanh thu</div>
                        <div class="detail-value positive">${this.formatCurrency(report.revenue || 0)}</div>
                    </div>
                    
                    <div class="detail-card">
                        <div class="detail-label">Số dư đầu kỳ</div>
                        <div class="detail-value">${this.formatCurrency(report.openingBalance || 0)}</div>
                    </div>
                    
                    <div class="detail-card">
                        <div class="detail-label">Số dư cuối kỳ</div>
                        <div class="detail-value">${this.formatCurrency(report.closingBalance || 0)}</div>
                    </div>
                </div>
                
                ${report.expenses && report.expenses.length > 0 ? `
                    <div class="detail-section">
                        <h4><i class="fas fa-receipt"></i> Chi phí (${report.expenses.length} khoản)</h4>
                        <div class="detail-list">
                            ${report.expenses.map(expense => `
                                <div class="detail-item">
                                    <span>${expense.name || 'Không có tên'}</span>
                                    <span class="amount negative">${this.formatCurrency(expense.amount || 0)}</span>
                                </div>
                            `).join('')}
                        </div>
                        <div class="detail-total">
                            <strong>Tổng chi phí:</strong>
                            <span class="negative">${this.formatCurrency(report.expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0))}</span>
                        </div>
                    </div>
                ` : ''}
                
                ${report.transfers && report.transfers.length > 0 ? `
                    <div class="detail-section">
                        <h4><i class="fas fa-exchange-alt"></i> Chuyển khoản (${report.transfers.length} khoản)</h4>
                        <div class="detail-list">
                            ${report.transfers.map(transfer => `
                                <div class="detail-item">
                                    <span>${transfer.name || 'Không có tên'}</span>
                                    <span class="amount neutral">${this.formatCurrency(transfer.amount || 0)}</span>
                                </div>
                            `).join('')}
                        </div>
                        <div class="detail-total">
                            <strong>Tổng chuyển khoản:</strong>
                            <span class="neutral">${this.formatCurrency(report.transfers.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0))}</span>
                        </div>
                    </div>
                ` : ''}
                
                ${report.inventory && report.inventory.length > 0 ? `
                    <div class="detail-section">
                        <h4><i class="fas fa-boxes"></i> Xuất kho (${report.inventory.length} mặt hàng)</h4>
                        <div class="detail-list">
                            ${report.inventory.map(item => `
                                <div class="detail-item">
                                    <span>${item.name || 'Sản phẩm'}</span>
                                    <span class="amount">${item.quantity || 1} × ${this.formatCurrency(item.price || 0)}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <div class="detail-section highlight">
                    <h4><i class="fas fa-calculator"></i> Kết quả cuối cùng</h4>
                    <div class="final-result">
                        <div class="result-label">Thực lãnh</div>
                        <div class="result-value ${report.actualProfit >= 0 ? 'positive' : 'negative'}">
                            ${this.formatCurrency(report.actualProfit || 0)}
                        </div>
                    </div>
                </div>
                
                <div class="detail-actions">
                    <button class="btn secondary" onclick="reportsManager.loadReportIntoForm(${report.id})">
                        <i class="fas fa-edit"></i> Sửa báo cáo này
                    </button>
                    <button class="btn" onclick="app.closeModal('reportDetailModal')">
                        <i class="fas fa-times"></i> Đóng
                    </button>
                </div>
            </div>
        `;
    }

    // Tạo modal chi tiết
    createReportDetailModal() {
        const modalHTML = `
            <div id="reportDetailModal" class="modal">
                <div class="modal-content wide-modal">
                    <div class="modal-header">
                        <h3><i class="fas fa-file-alt"></i> Chi tiết báo cáo</h3>
                        <span class="close" onclick="app.closeModal('reportDetailModal')">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div id="reportDetailContent">
                            <!-- Nội dung sẽ được điền bằng JavaScript -->
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    // Xuất báo cáo
    async exportReport() {
        try {
            if (this.reportsData.length === 0) {
                this.showMessage('Không có dữ liệu để xuất', 'warning');
                return;
            }
            
            const aggregatedData = this.calculateAggregatedData();
            
            const exportData = {
                title: `Báo cáo tổng hợp từ ${this.dateRange.start} đến ${this.dateRange.end}`,
                exportedAt: new Date().toISOString(),
                dateRange: this.dateRange,
                summary: {
                    totalReports: this.reportsData.length,
                    totalDays: this.getUniqueDays(),
                    totalRevenue: aggregatedData.totalRevenue,
                    totalExpenses: aggregatedData.totalExpenses,
                    totalTransfers: aggregatedData.totalTransfers,
                    totalActualProfit: aggregatedData.totalActualProfit,
                    averageDailyProfit: aggregatedData.averageDailyProfit
                },
                expenseBreakdown: aggregatedData.expenseCategories,
                transferBreakdown: aggregatedData.transferCategories,
                dailyReports: this.groupReportsByDate()
            };
            
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
            
            const fileName = `report-summary-${this.dateRange.start}-to-${this.dateRange.end}.json`;
            
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', fileName);
            linkElement.click();
            
            this.showMessage('Đã xuất báo cáo thành công', 'success');
            
        } catch (error) {
            console.error('❌ Lỗi xuất báo cáo:', error);
            this.showMessage(`Lỗi: ${error.message}`, 'error');
        }
    }

    // Tạo biểu đồ doanh thu đơn giản
    renderSimpleRevenueChart() {
        const reportsByDate = this.groupReportsByDate();
        const dates = Object.keys(reportsByDate).sort();
        
        if (dates.length === 0) {
            return '<p class="no-data">Không có dữ liệu để vẽ biểu đồ</p>';
        }
        
        // Tìm giá trị lớn nhất để tính tỉ lệ
        const maxRevenue = Math.max(...dates.map(date => 
            this.calculateDailySummary(reportsByDate[date]).revenue
        ));
        
        let html = '<div class="simple-chart">';
        
        dates.forEach(date => {
            const summary = this.calculateDailySummary(reportsByDate[date]);
            const height = maxRevenue > 0 ? Math.round((summary.revenue / maxRevenue) * 100) : 0;
            
            html += `
                <div class="chart-column">
                    <div class="chart-bar" style="height: ${height}%"></div>
                    <div class="chart-label">
                        <div>${this.formatDate(date, 'short')}</div>
                        <div class="chart-value">${this.formatCurrency(summary.revenue)}</div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        return html;
    }

    // Tiện ích helper
    formatCurrency(amount) {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    }

    formatDate(dateString, format = 'long') {
        const date = new Date(dateString);
        if (format === 'short') {
            return date.getDate() + '/' + (date.getMonth() + 1);
        }
        return date.toLocaleDateString('vi-VN');
    }

    showMessage(message, type = 'info') {
        // Sử dụng hệ thống message có sẵn
        if (window.app && app.showStatus) {
            app.showStatus(message, type);
        } else {
            console.log(`${type}: ${message}`);
        }
    }

    showLoading(show) {
        const loadingElement = document.getElementById('reportsLoading');
        if (loadingElement) {
            loadingElement.style.display = show ? 'block' : 'none';
        }
    }
}

// Khởi tạo toàn cục
let reportsDashboard = null;

// Hàm để khởi tạo khi tab được mở
function initReportsDashboard() {
    if (!reportsDashboard) {
        reportsDashboard = new ReportsDashboard();
    }
    return reportsDashboard;
}