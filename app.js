// app.js - Khởi tạo ứng dụng và xử lý chung

class App {
    constructor() {
        this.currentTab = 'report';
        this.setupEventListeners();
        this.initializeApp();
    }

// app.js - Cập nhật thứ tự khởi tạo

async initializeApp() {
    console.log('Ứng dụng đang khởi động...');
    
    try {
        // 1. Khởi tạo IndexedDB
        console.log('Đang khởi tạo IndexedDB...');
        await dataManager.initDB();
        console.log('IndexedDB đã sẵn sàng');
        
        // 2. Tải cài đặt GitHub
        githubManager.loadSettings();
        
        // 3. Khởi tạo reports manager
        console.log('Đang khởi tạo ReportsManager...');
        await reportsManager.initialize();
        console.log('ReportsManager đã khởi tạo');
        
        // 4. KHỞI TẠO BACKUP SETTINGS TRƯỚC
        console.log('⚙️ Khởi tạo Backup Settings...');
        window.backupSettings = new BackupSettings();
        
        // 5. KHỞI TẠO DAILY SNAPSHOT SAU (để dùng settings)
        console.log('📸 Khởi tạo Daily Snapshot...');
        window.dailySnapshot = new DailySnapshotManager();
        
        // 6. Tải snapshot gần nhất
        setTimeout(async () => {
            try {
                const loaded = await dailySnapshot.loadLatestSnapshot();
                if (loaded) {
                    this.showStatus('Đã tải dữ liệu từ snapshot gần nhất');
                }
            } catch (error) {
                console.warn('Không thể tải snapshot:', error);
            }
        }, 1500);
        
        // 7. Tải dữ liệu từ GitHub
        if (githubManager.initialized) {
            setTimeout(async () => {
                try {
                    console.log('Đang đồng bộ từ GitHub...');
                    const result = await githubManager.syncFromGitHub();
                    if (result.success) {
                        this.showStatus(`Đã đồng bộ ${result.savedCount} báo cáo từ GitHub`);
                        
                        const reportDate = document.getElementById('reportDate');
                        if (reportDate && reportDate.value) {
                            await reportsManager.loadCurrentDayReports(reportDate.value);
                        }
                    }
                } catch (error) {
                    console.error('Lỗi đồng bộ GitHub:', error);
                }
            }, 1000);
        }
        
        console.log('Ứng dụng đã sẵn sàng');
        
        // 8. Tạo snapshot khi app khởi động xong
        setTimeout(() => {
            if (window.dailySnapshot) {
                window.dailySnapshot.createTodaySnapshot();
            }
        }, 3000);
        
    } catch (error) {
        console.error('Lỗi khởi tạo ứng dụng:', error);
        this.showStatus(`Lỗi khởi tạo: ${error.message}`, 'error');
    }
}

    // Thiết lập event listeners
    setupEventListeners() {
        // Chuyển tab
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.currentTarget.getAttribute('data-tab'));
            });
        });

        // Modal close buttons
        document.querySelectorAll('.modal .close').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => {
                this.closeAllModals();
            });
        });

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeAllModals();
            }
        });

        // GitHub settings button
        const githubSettingsBtn = document.getElementById('githubSettingsBtn');
        if (githubSettingsBtn) {
            githubSettingsBtn.addEventListener('click', () => {
                this.openGithubModal();
            });
        }
         document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const tabName = e.currentTarget.getAttribute('data-tab');
            this.switchTab(tabName);
            
            // Khởi tạo dashboard nếu chuyển sang tab reports-dashboard
            if (tabName === 'reports-dashboard') {
                this.initializeReportsDashboard();
            }
        });
    });

        // Debug button
        const debugBtn = document.getElementById('debugBtn');
        if (debugBtn) {
            debugBtn.addEventListener('click', () => {
                this.openDebugModal();
            });
        }

        // Load data button
        const loadDataBtn = document.getElementById('loadDataBtn');
        if (loadDataBtn) {
            loadDataBtn.addEventListener('click', () => {
                this.loadData();
            });
        }

        // Thêm chi phí
        const addExpenseBtn = document.getElementById('addExpenseBtn');
        if (addExpenseBtn) {
            addExpenseBtn.addEventListener('click', () => {
                reportsManager.addExpense();
            });
        }

        // Lưu chi phí
        const saveExpensesBtn = document.getElementById('saveExpensesBtn');
        if (saveExpensesBtn) {
            saveExpensesBtn.addEventListener('click', () => {
                this.closeModal('expensesModal');
            });
        }

        // Thêm chuyển khoản
        const addTransferBtn = document.getElementById('addTransferBtn');
        if (addTransferBtn) {
            addTransferBtn.addEventListener('click', () => {
                reportsManager.addTransfer();
            });
        }

        // Lưu chuyển khoản
        const saveTransfersBtn = document.getElementById('saveTransfersBtn');
        if (saveTransfersBtn) {
            saveTransfersBtn.addEventListener('click', () => {
                this.closeModal('transfersModal');
            });
        }

        // Cài đặt GitHub
        const saveGithubSettingsBtn = document.getElementById('saveGithubSettingsBtn');
        if (saveGithubSettingsBtn) {
            saveGithubSettingsBtn.addEventListener('click', () => {
                this.saveGithubSettings();
            });
        }

        // Test GitHub connection
        const testGithubBtn = document.getElementById('testGithubBtn');
        if (testGithubBtn) {
            testGithubBtn.addEventListener('click', () => {
                this.testGithubConnection();
            });
        }

        // Debug tools
        const clearDataBtn = document.getElementById('clearDataBtn');
        if (clearDataBtn) {
            clearDataBtn.addEventListener('click', () => {
                if (confirm('Bạn có chắc chắn muốn xóa TOÀN BỘ dữ liệu local? Hành động này không thể hoàn tác!')) {
                    this.clearAllData();
                }
            });
        }

        const exportDataBtn = document.getElementById('exportDataBtn');
        if (exportDataBtn) {
            exportDataBtn.addEventListener('click', () => {
                this.exportData();
            });
        }

        const importDataBtn = document.getElementById('importDataBtn');
        if (importDataBtn) {
            importDataBtn.addEventListener('click', () => {
                document.getElementById('importFileInput').click();
            });
        }

        const importFileInput = document.getElementById('importFileInput');
        if (importFileInput) {
            importFileInput.addEventListener('change', (e) => {
                this.importData(e);
            });
        }
const openDeleteModalBtn = document.getElementById('openDeleteReportsModal');
    if (openDeleteModalBtn) {
        openDeleteModalBtn.addEventListener('click', () => {
            this.openDeleteReportsModal();
        });
    }
    
    // Close button trong modal
    const closeBtn = document.querySelector('#deleteReportModal .close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            this.closeModal('deleteReportModal');
        });
    }
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl+S to save report
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                reportsManager.saveReport();
            }
            
            // Ctrl+H to view history
            if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
                e.preventDefault();
                reportsManager.viewHistory();
            }
            
            // Ctrl+1,2,3 to switch tabs
            if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '3') {
                e.preventDefault();
                const tabIndex = parseInt(e.key) - 1;
                const tabs = ['report', 'employees', 'inventory'];
                if (tabs[tabIndex]) {
                    this.switchTab(tabs[tabIndex]);
                }
            }
        });
    }

    // Thêm vào app.js trong hàm switchTab
switchTab(tabName) {
    // Cập nhật nút tab
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    const activeTab = document.querySelector(`.tab[data-tab="${tabName}"]`);
    if (activeTab) {
        activeTab.classList.add('active');
    }
    
    // Cập nhật nội dung tab
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const activeContent = document.getElementById(`${tabName}Tab`);
    if (activeContent) {
        activeContent.classList.add('active');
    }
    
    this.currentTab = tabName;
    
    // Tải dữ liệu cho tab nếu cần
    if (tabName === 'employees' && employeeManager && !employeeManager.initialized) {  // SỬA Ở ĐÂY: employeesManager -> employeeManager
        employeeManager.initialize();  // SỬA Ở ĐÂY: employeesManager -> employeeManager
    } else if (tabName === 'inventory' && inventoryManager) {
        // Cập nhật lại kho hàng khi chuyển sang tab này
        setTimeout(async () => {
            try {
                await inventoryManager.loadInventory();
                console.log('Đã cập nhật tab kho hàng');
            } catch (error) {
                console.error('Lỗi cập nhật tab kho hàng:', error);
            }
        }, 100);
    }
    
    if (tabName === 'reports-dashboard') {
        // Có thể cần load dữ liệu ban đầu
        setTimeout(() => {
            if (window.reportsDashboard) {
                window.reportsDashboard.loadDefaultDateRange();
            }
        }, 200);
    }
    
    if (tabName === 'employees') {
        setTimeout(() => {
            if (!window.employeeManager) {
                window.employeeManager = new EmployeeManager();
            } else {
                employeeManager.updateMonthlySummary();
                employeeManager.displayEmployees();
            }
        }, 100);
    }
    if (tabName === 'inventory') {
        setTimeout(() => {
            if (!window.inventoryManager) {
                window.inventoryManager = new InventoryManager();
            } else {
                inventoryManager.updateStatistics();
                inventoryManager.displayInventory();
            }
        }, 100);
    }
}

    // Đóng modal cụ thể
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // Mở modal GitHub
    openGithubModal() {
        const modal = document.getElementById('githubModal');
        if (modal) {
            modal.style.display = 'block';
            
            // Điền thông tin hiện tại
            const settings = githubManager.getSettings();
            
            const tokenInput = document.getElementById('githubToken');
            const repoInput = document.getElementById('githubRepo');
            const branchInput = document.getElementById('githubBranch');
            const folderInput = document.getElementById('githubFolder');
            
            if (tokenInput) tokenInput.value = settings.token || '';
            if (repoInput) repoInput.value = settings.repo || '';
            if (branchInput) branchInput.value = settings.branch || 'main';
            if (folderInput) folderInput.value = settings.folder || 'reports';
        }
    }

    // Lưu cài đặt GitHub
    async saveGithubSettings() {
        const tokenInput = document.getElementById('githubToken');
        const repoInput = document.getElementById('githubRepo');
        const branchInput = document.getElementById('githubBranch');
        const folderInput = document.getElementById('githubFolder');
        
        if (!tokenInput || !repoInput) return;
        
        const token = tokenInput.value.trim();
        const repo = repoInput.value.trim();
        const branch = branchInput.value.trim() || 'main';
        const folder = folderInput.value.trim() || 'reports';
        
        if (!token || !repo) {
            this.showStatus('Vui lòng nhập token và repository', 'error');
            return;
        }
        
        // Lưu cài đặt
        const success = githubManager.saveSettings(token, repo, branch, folder);
        
        if (success) {
            this.showStatus('Đã lưu cài đặt GitHub');
            this.closeModal('githubModal');
            
            // Tự động kiểm tra kết nối
            setTimeout(() => {
                this.testGithubConnection();
            }, 500);
        } else {
            this.showStatus('Lỗi lưu cài đặt GitHub', 'error');
        }
    }

    // Kiểm tra kết nối GitHub
    async testGithubConnection() {
        const testResult = document.getElementById('githubTestResult');
        if (testResult) {
            testResult.innerHTML = '<p>Đang kiểm tra kết nối...</p>';
        }
        
        const result = await githubManager.testConnection();
        
        if (testResult) {
            if (result.success) {
                testResult.innerHTML = `<p style="color: green;">✅ ${result.message}</p>`;
            } else {
                testResult.innerHTML = `<p style="color: red;">❌ ${result.message}</p>`;
            }
        }
    }

    // Mở modal debug
    openDebugModal() {
        const modal = document.getElementById('debugModal');
        if (modal) {
            modal.style.display = 'block';
            this.updateDebugInfo();
        }
    }

    // Cập nhật thông tin debug
    async updateDebugInfo() {
        const debugInfo = document.getElementById('debugInfo');
        const debugConsole = document.getElementById('debugConsole');
        
        if (!debugInfo) return;
        
        try {
            // Lấy thông tin từ các manager
            const reports = await dataManager.getAllReports();
            const products = await dataManager.getAllProducts();
            const employees = await dataManager.getAllEmployees();
            const githubSettings = githubManager.getSettings();
            
            const appInfo = {
                appName: 'Quản lý Báo cáo & Kho hàng',
                version: '1.0.0',
                indexedDB: dataManager.db ? 'Đã kết nối' : 'Chưa kết nối',
                github: githubSettings.initialized ? 'Đã cấu hình' : 'Chưa cấu hình',
                stats: {
                    totalReports: reports.length,
                    totalProducts: products.length,
                    totalEmployees: employees.length
                },
                githubSettings: {
                    repo: githubSettings.repo,
                    branch: githubSettings.branch,
                    folder: githubSettings.folder
                }
            };
            
            debugInfo.textContent = JSON.stringify(appInfo, null, 2);
            
            // Cập nhật console
            if (debugConsole) {
                // Lấy log từ console (nếu có thể)
                debugConsole.value = `App initialized at: ${new Date().toISOString()}\n`;
                debugConsole.value += `Reports: ${reports.length}\n`;
                debugConsole.value += `Products: ${products.length}\n`;
                debugConsole.value += `Employees: ${employees.length}\n`;
                debugConsole.value += `GitHub: ${githubSettings.initialized ? 'Configured' : 'Not configured'}\n`;
            }
        } catch (error) {
            debugInfo.textContent = `Lỗi: ${error.message}`;
        }
    }

    // Tải dữ liệu
    async loadData() {
        this.showStatus('Đang tải dữ liệu...');
        
        try {
            // Tải từ GitHub nếu được cấu hình
            if (githubManager.initialized) {
                const result = await githubManager.syncFromGitHub();
                
                if (result.success) {
                    this.showStatus(`Đã tải ${result.savedCount} báo cáo từ GitHub`);
                    
                    // Tải lại báo cáo ngày hiện tại
                    const reportDate = document.getElementById('reportDate');
                    if (reportDate && reportDate.value) {
                        await reportsManager.loadCurrentDayReports(reportDate.value);
                    }
                } else {
                    this.showStatus(`Lỗi: ${result.message}`, 'error');
                }
            } else {
                this.showStatus('GitHub chưa được cấu hình. Vui lòng cài đặt trong tab Debug.', 'warning');
            }
        } catch (error) {
            console.error('Lỗi tải dữ liệu:', error);
            this.showStatus(`Lỗi: ${error.message}`, 'error');
        }
    }

    // Xóa toàn bộ dữ liệu
    async clearAllData() {
        this.showStatus('Đang xóa dữ liệu...');
        
        try {
            await dataManager.clearAllData();
            this.showStatus('Đã xóa toàn bộ dữ liệu local');
            
            // Reset form
            reportsManager.resetForm();
            
            // Tải lại trang sau 2 giây
            setTimeout(() => {
                location.reload();
            }, 2000);
        } catch (error) {
            console.error('Lỗi xóa dữ liệu:', error);
            this.showStatus(`Lỗi: ${error.message}`, 'error');
        }
    }

    // Xuất dữ liệu
    async exportData() {
        try {
            const data = await dataManager.exportAllData();
            const dataStr = JSON.stringify(data, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
            
            const exportFileDefaultName = `sales-management-backup-${new Date().toISOString().split('T')[0]}.json`;
            
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();
            
            this.showStatus('Đã xuất dữ liệu');
        } catch (error) {
            console.error('Lỗi xuất dữ liệu:', error);
            this.showStatus(`Lỗi: ${error.message}`, 'error');
        }
    }

    // Nhập dữ liệu
    async importData(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (!confirm('Nhập dữ liệu sẽ ghi đè lên dữ liệu hiện tại. Tiếp tục?')) {
            return;
        }
        
        this.showStatus('Đang nhập dữ liệu...');
        
        const reader = new FileReader();
        
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                await dataManager.importData(data);
                
                this.showStatus('Đã nhập dữ liệu thành công');
                
                // Tải lại trang sau 1 giây
                setTimeout(() => {
                    location.reload();
                }, 1000);
            } catch (error) {
                console.error('Lỗi nhập dữ liệu:', error);
                this.showStatus(`Lỗi: ${error.message}`, 'error');
            }
        };
        
        reader.readAsText(file);
        
        // Reset input file
        event.target.value = '';
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
        
        console.log(`${type.toUpperCase()}: ${message}`);
    }
    // ===== HÀM XÓA BÁO CÁO =====
// Thêm vào class App trong app.js

// Mở modal xóa báo cáo
async openDeleteReportsModal() {
    try {
        const modal = document.getElementById('deleteReportModal');
        if (modal) {
            modal.style.display = 'block';
            await this.loadReportsForDeletion();
            this.setupDeleteModalListeners();
        }
    } catch (error) {
        console.error('Lỗi mở modal xóa:', error);
        this.showStatus(`Lỗi: ${error.message}`, 'error');
    }
}

// Tải danh sách báo cáo để xóa
async loadReportsForDeletion(filterDate = null) {
    try {
        const listElement = document.getElementById('reportsToDeleteList');
        if (!listElement) return;
        
        listElement.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i><p>Đang tải danh sách báo cáo...</p></div>';
        
        // Lấy tất cả báo cáo
        const allReports = await dataManager.getAllReports();
        
        // Sắp xếp theo thời gian mới nhất trước
        const sortedReports = allReports.sort((a, b) => {
            return new Date(b.timestamp) - new Date(a.timestamp);
        });
        
        // Lọc theo ngày nếu có
        const filteredReports = filterDate 
            ? sortedReports.filter(report => report.date === filterDate)
            : sortedReports;
        
        if (filteredReports.length === 0) {
            listElement.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-alt"></i>
                    <p>${filterDate ? `Không có báo cáo nào cho ngày ${filterDate}` : 'Chưa có báo cáo nào'}</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        
        filteredReports.forEach(report => {
            const time = new Date(report.timestamp).toLocaleString('vi-VN');
            const editedBadge = report.edited ? '<span class="badge warning">Đã sửa</span>' : '';
            
            html += `
                <div class="report-delete-item" data-report-id="${report.id}">
                    <div class="report-delete-checkbox">
                        <input type="checkbox" class="report-checkbox" data-id="${report.id}">
                    </div>
                    <div class="report-delete-info">
                        <div class="report-delete-date">
                            <span>${report.date}</span>
                            <span class="date-badge">${time}</span>
                            ${editedBadge}
                        </div>
                        <div class="report-delete-details">
                            <div class="report-delete-detail">
                                <strong>Doanh thu:</strong> ${reportsManager.formatCurrency(report.revenue || 0)}
                            </div>
                            <div class="report-delete-detail">
                                <strong>Thực lãnh:</strong> <span class="${(report.actualProfit || 0) >= 0 ? 'positive' : 'negative'}">${reportsManager.formatCurrency(report.actualProfit || 0)}</span>
                            </div>
                            <div class="report-delete-detail">
                                <strong>Xuất kho:</strong> ${report.inventory ? report.inventory.length + ' mặt hàng' : '0'}
                            </div>
                        </div>
                        <div class="report-delete-time">
                            ID: ${report.id} | Lưu lúc: ${time}
                        </div>
                    </div>
                    <div class="report-delete-actions">
                        <button class="small-btn" onclick="app.deleteSingleReport(${report.id})">
                            <i class="fas fa-trash"></i> Xóa
                        </button>
                        <button class="small-btn secondary" onclick="reportsManager.loadReportIntoForm(${report.id})">
                            <i class="fas fa-eye"></i> Xem
                        </button>
                    </div>
                </div>
            `;
        });
        
        listElement.innerHTML = html;
        
        // Thêm selection summary
        const summary = document.createElement('div');
        summary.className = 'selection-summary';
        summary.innerHTML = `Tìm thấy <strong>${filteredReports.length}</strong> báo cáo`;
        listElement.prepend(summary);
        
    } catch (error) {
        console.error('Lỗi tải danh sách báo cáo:', error);
        const listElement = document.getElementById('reportsToDeleteList');
        if (listElement) {
            listElement.innerHTML = `
                <div class="empty-state error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Lỗi tải danh sách: ${error.message}</p>
                    <button onclick="app.loadReportsForDeletion()" class="small-btn">Thử lại</button>
                </div>
            `;
        }
    }
}

// Thiết lập event listeners cho modal
setupDeleteModalListeners() {
    // Lọc theo ngày
    const dateFilter = document.getElementById('deleteReportDateFilter');
    if (dateFilter) {
        dateFilter.addEventListener('change', async (e) => {
            await this.loadReportsForDeletion(e.target.value);
        });
    }
    
    // Xóa lọc
    const clearFilterBtn = document.getElementById('clearDateFilter');
    if (clearFilterBtn) {
        clearFilterBtn.addEventListener('click', async () => {
            if (dateFilter) dateFilter.value = '';
            await this.loadReportsForDeletion();
        });
    }
    
    // Xóa báo cáo đã chọn
    const confirmDeleteBtn = document.getElementById('confirmDeleteSelected');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', () => {
            this.deleteSelectedReports();
        });
    }
    
    // Toggle selection khi click vào item
    const listElement = document.getElementById('reportsToDeleteList');
    if (listElement) {
        listElement.addEventListener('click', (e) => {
            const item = e.target.closest('.report-delete-item');
            const checkbox = e.target.closest('.report-checkbox');
            
            if (item && !checkbox) {
                const check = item.querySelector('.report-checkbox');
                if (check) {
                    check.checked = !check.checked;
                    item.classList.toggle('selected', check.checked);
                }
            }
            
            if (checkbox) {
                const item = checkbox.closest('.report-delete-item');
                if (item) {
                    item.classList.toggle('selected', checkbox.checked);
                }
            }
        });
    }
}

// Xóa báo cáo đã chọn
async deleteSelectedReports() {
    const checkboxes = document.querySelectorAll('.report-checkbox:checked');
    
    if (checkboxes.length === 0) {
        this.showStatus('Vui lòng chọn ít nhất một báo cáo để xóa', 'warning');
        return;
    }
    
    const deleteFromGitHub = document.getElementById('deleteFromGitHub').checked;
    const reportIds = Array.from(checkboxes).map(cb => parseInt(cb.dataset.id));
    
    if (!confirm(`Bạn có chắc chắn muốn xóa ${reportIds.length} báo cáo?\nHành động này không thể hoàn tác!`)) {
        return;
    }
    
    try {
        this.showStatus('Đang xóa báo cáo...');
        
        let deletedCount = 0;
        let githubDeletedCount = 0;
        
        for (const reportId of reportIds) {
            // Xóa khỏi local
            await this.deleteReportFromLocal(reportId);
            deletedCount++;
            
            // Xóa khỏi GitHub nếu được chọn
            if (deleteFromGitHub && githubManager.initialized) {
                try {
                    // Cần lấy thông tin report để xác định file trên GitHub
                    const transaction = dataManager.db.transaction(['reports'], 'readonly');
                    const store = transaction.objectStore('reports');
                    const report = await new Promise((resolve, reject) => {
                        const request = store.get(reportId);
                        request.onsuccess = () => resolve(request.result);
                        request.onerror = () => reject();
                    });
                    
                    if (report) {
                        await this.deleteReportFromGitHub(report);
                        githubDeletedCount++;
                    }
                } catch (githubError) {
                    console.warn(`Không thể xóa file GitHub cho report ${reportId}:`, githubError);
                }
            }
        }
        
        let message = `Đã xóa ${deletedCount} báo cáo`;
        if (deleteFromGitHub) {
            message += ` (${githubDeletedCount} file trên GitHub)`;
        }
        
        this.showStatus(message);
        
        // Tải lại danh sách
        const dateFilter = document.getElementById('deleteReportDateFilter');
        await this.loadReportsForDeletion(dateFilter ? dateFilter.value : null);
        
        // Tải lại form hiện tại
        const reportDate = document.getElementById('reportDate');
        if (reportDate && reportDate.value) {
            await reportsManager.loadCurrentDayReports(reportDate.value);
        }
        
    } catch (error) {
        console.error('Lỗi xóa báo cáo:', error);
        this.showStatus(`Lỗi: ${error.message}`, 'error');
    }
}

// Xóa một báo cáo cụ thể
async deleteSingleReport(reportId) {
    if (!confirm('Bạn có chắc chắn muốn xóa báo cáo này?')) {
        return;
    }
    
    try {
        // Xóa khỏi local
        await this.deleteReportFromLocal(reportId);
        
        // Xóa khỏi GitHub nếu được chọn
        const deleteFromGitHub = document.getElementById('deleteFromGitHub').checked;
        if (deleteFromGitHub && githubManager.initialized) {
            const transaction = dataManager.db.transaction(['reports'], 'readonly');
            const store = transaction.objectStore('reports');
            const report = await new Promise((resolve, reject) => {
                const request = store.get(reportId);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject();
            });
            
            if (report) {
                await this.deleteReportFromGitHub(report);
            }
        }
        
        this.showStatus('Đã xóa báo cáo');
        
        // Tải lại danh sách
        const dateFilter = document.getElementById('deleteReportDateFilter');
        await this.loadReportsForDeletion(dateFilter ? dateFilter.value : null);
        
        // Tải lại form hiện tại
        const reportDate = document.getElementById('reportDate');
        if (reportDate && reportDate.value) {
            await reportsManager.loadCurrentDayReports(reportDate.value);
        }
        
    } catch (error) {
        console.error('Lỗi xóa báo cáo:', error);
        this.showStatus(`Lỗi: ${error.message}`, 'error');
    }
}

// Xóa báo cáo khỏi local database
async deleteReportFromLocal(reportId) {
    return new Promise((resolve, reject) => {
        if (!dataManager.db) {
            reject(new Error('Database chưa được khởi tạo'));
            return;
        }
        
        const transaction = dataManager.db.transaction(['reports'], 'readwrite');
        const store = transaction.objectStore('reports');
        
        const request = store.delete(reportId);
        
        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(new Error(event.target.error));
    });
}

// Xóa file trên GitHub
async deleteReportFromGitHub(report) {
    try {
        const date = report.date;
        const folderPath = githubManager.folder;
        const apiUrl = `${githubManager.baseUrl}/repos/${githubManager.repo}/contents/${folderPath}?ref=${githubManager.branch}`;
        
        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `token ${githubManager.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (response.ok) {
            const files = await response.json();
            
            // Tìm tất cả file của ngày này
            const dateFiles = files.filter(file => 
                file.name.includes(date) && 
                file.name.includes('.json')
            );
            
            if (dateFiles.length > 0) {
                // Xóa từng file
                for (const file of dateFiles) {
                    const deleteUrl = `${githubManager.baseUrl}/repos/${githubManager.repo}/contents/${file.path}`;
                    
                    const deleteResponse = await fetch(deleteUrl, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `token ${githubManager.token}`,
                            'Accept': 'application/vnd.github.v3+json',
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            message: `Xóa báo cáo ngày ${date}`,
                            sha: file.sha,
                            branch: githubManager.branch
                        })
                    });
                    
                    if (deleteResponse.ok) {
                        console.log('✅ Đã xóa file trên GitHub:', file.name);
                    } else {
                        console.warn('⚠️ Không thể xóa file:', file.name);
                    }
                }
                return true;
            }
        }
        return false;
    } catch (error) {
        console.error('Lỗi xóa file GitHub:', error);
        throw error;
    }
}
// Thêm hàm initializeReportsDashboard
async initializeReportsDashboard() {
    try {
        // Đợi một chút để DOM được cập nhật
        setTimeout(async () => {
            if (!window.reportsDashboard) {
                // Thêm file script nếu chưa có
                if (!document.querySelector('script[src*="reports-dashboard.js"]')) {
                    const script = document.createElement('script');
                    script.src = 'reports-dashboard.js';
                    document.body.appendChild(script);
                    
                    // Đợi script load
                    script.onload = () => {
                        window.reportsDashboard = initReportsDashboard();
                    };
                } else {
                    window.reportsDashboard = initReportsDashboard();
                }
            }
        }, 100);
    } catch (error) {
        console.error('Lỗi khởi tạo dashboard:', error);
    }
}

}

// Khởi tạo ứng dụng khi DOM đã sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
    // Khởi tạo ứng dụng
    window.app = new App();
    
    // Thêm một số tiện ích toàn cục để debug
    window.dataManager = dataManager;
    window.githubManager = githubManager;
    window.reportsManager = reportsManager;
    window.appInstance = window.app;
    
    console.log('Ứng dụng đã được khởi tạo. Có thể truy cập qua window.appInstance');
});