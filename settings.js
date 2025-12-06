// settings.js - Module cài đặt với DB index management
class SettingsModule {
    constructor() {
        this.githubFiles = [];
        this.localStats = {
            reports: 0,
            inventory: 0,
            employees: 0
        };
    }
    
    async render() {
        await this.loadStats();
        const token = localStorage.getItem('github_token') || '';
        
        const mainContent = document.getElementById('mainContent');
        mainContent.innerHTML = `
            <div class="settings-container">
                <div class="settings-header">
                    <h1><i class="fas fa-cog"></i> CÀI ĐẶT</h1>
                </div>
                
                <div class="settings-section">
                    <h2><i class="fab fa-github"></i> GITHUB SETTINGS</h2>
                    
                    <div class="setting-item">
                        <label>GitHub Token:</label>
                        <div class="input-with-button">
                            <input type="password" id="githubToken" value="${token}" placeholder="Nhập GitHub token...">
                            <button class="btn-icon" onclick="window.settingsModule.toggleTokenVisibility()">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                        <small class="hint">
                            Token cần quyền truy cập repo: Datkep92/milano
                        </small>
                    </div>
                    
                    <div class="setting-item">
                        <label>Kiểm tra kết nối:</label>
                        <button class="btn-secondary" onclick="window.settingsModule.testConnection()">
                            <i class="fas fa-plug"></i> KIỂM TRA KẾT NỐI
                        </button>
                    </div>
                    
                    <div class="setting-actions">
                        <button class="btn-primary" onclick="window.settingsModule.saveToken()">
                            <i class="fas fa-save"></i> LƯU TOKEN
                        </button>
                        <button class="btn-danger" onclick="window.settingsModule.clearAllData()">
                            <i class="fas fa-trash"></i> XÓA TOÀN BỘ DỮ LIỆU
                        </button>
                    </div>
                </div>
                
                <div class="settings-section">
                    <h2><i class="fas fa-database"></i> QUẢN LÝ DỮ LIỆU</h2>
                    
                    <div class="data-actions">
                        <button class="btn-secondary" onclick="window.settingsModule.forceSync()">
                            <i class="fas fa-sync-alt"></i> ĐỒNG BỘ NGAY
                        </button>
                        <button class="btn-secondary" onclick="window.settingsModule.exportData()">
                            <i class="fas fa-download"></i> XUẤT DỮ LIỆU
                        </button>
                        <button class="btn-secondary" onclick="window.settingsModule.importData()">
                            <i class="fas fa-upload"></i> NHẬP DỮ LIỆU
                        </button>
                    </div>
                    
                    <div class="data-stats">
                        <h3>Thống kê cục bộ:</h3>
                        <div class="stats-grid">
                            <div class="stat-item">
                                <span>Báo cáo:</span>
                                <strong>${this.localStats.reports}</strong>
                            </div>
                            <div class="stat-item">
                                <span>Sản phẩm:</span>
                                <strong>${this.localStats.inventory}</strong>
                            </div>
                            <div class="stat-item">
                                <span>Nhân viên:</span>
                                <strong>${this.localStats.employees}</strong>
                            </div>
                            <div class="stat-item">
                                <span>Lần đồng bộ:</span>
                                <strong>${localStorage.getItem('sync_count') || 0}</strong>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="settings-section">
                    <h2><i class="fas fa-info-circle"></i> THÔNG TIN DB INDEX</h2>
                    
                    <div class="db-index-info">
                        <div class="info-item">
                            <span>Phiên bản DB:</span>
                            <strong>${window.dataManager.dbIndex?.version || 'N/A'}</strong>
                        </div>
                        <div class="info-item">
                            <span>Cập nhật lần cuối:</span>
                            <strong>${window.dataManager.dbIndex?.lastUpdated ? new Date(window.dataManager.dbIndex.lastUpdated).toLocaleString('vi-VN') : 'Chưa đồng bộ'}</strong>
                        </div>
                        <div class="info-item">
                            <span>Tổng file:</span>
                            <strong>${Object.keys(window.dataManager.dbIndex?.files || {}).length}</strong>
                        </div>
                    </div>
                    
                    <div class="module-stats">
                        <h4>Chi tiết theo module:</h4>
                        <div class="stats-table">
                            <div class="stats-header">
                                <span>MODULE</span>
                                <span>FILE</span>
                                <span>LẦN CUỐI</span>
                            </div>
                            <div class="stats-row">
                                <span>📊 Báo cáo</span>
                                <span>${Object.keys(window.dataManager.dbIndex?.modules?.reports?.files || {}).length}</span>
                                <span>${window.dataManager.dbIndex?.modules?.reports?.latest || 'N/A'}</span>
                            </div>
                            <div class="stats-row">
                                <span>📦 Kho hàng</span>
                                <span>${Object.keys(window.dataManager.dbIndex?.modules?.inventory?.files || {}).length}</span>
                                <span>${window.dataManager.dbIndex?.modules?.inventory?.latest || 'N/A'}</span>
                            </div>
                            <div class="stats-row">
                                <span>👥 Nhân viên</span>
                                <span>${Object.keys(window.dataManager.dbIndex?.modules?.employees?.files || {}).length}</span>
                                <span>${window.dataManager.dbIndex?.modules?.employees?.latest || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="settings-section">
                    <h2><i class="fas fa-info-circle"></i> THÔNG TIN HỆ THỐNG</h2>
                    
                    <div class="system-info">
                        <div class="info-item">
                            <span>Phiên bản:</span>
                            <strong>2.0.0</strong>
                        </div>
                        <div class="info-item">
                            <span>Repo:</span>
                            <strong>Datkep92/milano</strong>
                        </div>
                        <div class="info-item">
                            <span>Dung lượng localStorage:</span>
                            <strong>${this.calculateLocalStorageSize()} KB</strong>
                        </div>
                        <div class="info-item">
                            <span>DB Index Local:</span>
                            <strong>${window.dataManager.localDbIndex ? 'Có' : 'Không'}</strong>
                        </div>
                    </div>
                </div>
                
                <div class="settings-section">
                    <h2><i class="fas fa-tools"></i> CÔNG CỤ</h2>
                    
                    <div class="tools-grid">
                        <button class="tool-btn" onclick="window.settingsModule.rebuildDBIndex()">
                            <i class="fas fa-database"></i>
                            <span>Xây lại DB Index</span>
                        </button>
                        <button class="tool-btn" onclick="window.settingsModule.clearCache()">
                            <i class="fas fa-broom"></i>
                            <span>Xóa cache</span>
                        </button>
                        <button class="tool-btn" onclick="window.settingsModule.checkIntegrity()">
                            <i class="fas fa-check-circle"></i>
                            <span>Kiểm tra toàn vẹn</span>
                        </button>
                        <button class="tool-btn" onclick="window.settingsModule.backupToGitHub()">
                            <i class="fas fa-cloud-upload-alt"></i>
                            <span>Backup lên GitHub</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    async loadStats() {
        try {
            // Đếm số lượng reports
            const reports = window.dataManager.data.reports;
            this.localStats.reports = Object.keys(reports).length;
            
            // Đếm số lượng products
            const products = window.dataManager.data.inventory.products;
            this.localStats.inventory = products.length;
            
            // Đếm số lượng employees
            const employees = window.dataManager.data.employees.list;
            this.localStats.employees = employees.length;
            
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }
    
    calculateLocalStorageSize() {
        let total = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                total += localStorage[key].length * 2; // UTF-16
            }
        }
        return (total / 1024).toFixed(2);
    }
    
    toggleTokenVisibility() {
        const input = document.getElementById('githubToken');
        const icon = input.nextElementSibling.querySelector('i');
        
        if (input.type === 'password') {
            input.type = 'text';
            icon.className = 'fas fa-eye-slash';
        } else {
            input.type = 'password';
            icon.className = 'fas fa-eye';
        }
    }
    
    async saveToken() {
        const token = document.getElementById('githubToken').value.trim();
        
        if (!token) {
            window.showToast('Vui lòng nhập GitHub token', 'warning');
            return;
        }
        
        window.githubManager.setToken(token);
        window.showToast('Đã lưu token', 'success');
        
        // Kiểm tra kết nối
        await this.testConnection();
    }
    
    // Tìm trong settings.js hàm testConnection(), sửa dòng 254:

async testConnection() {
    try {
        const testResult = await window.githubManager.testConnection();
        
        if (testResult) {
            window.showToast('✅ Kết nối GitHub thành công', 'success');
            
            // THAY DÒNG NÀY (dòng 254)
            // await window.dataManager.smartSync();
            
            // BẰNG MỘT TRONG CÁC PHƯƠNG THỨC SAU:
            
            // Option 1: Đồng bộ trong nền
            setTimeout(() => window.dataManager.backgroundGitHubCheck(), 1000);
            
            // Option 2: Khởi tạo lại data manager
            await window.dataManager.init();
            
            // Option 3: Chỉ thông báo và không đồng bộ ngay
            // window.showToast('Đã kết nối, đồng bộ sẽ chạy tự động', 'info');
            
        } else {
            window.showToast('❌ Kết nối GitHub thất bại', 'error');
        }
    } catch (error) {
        console.error('Connection test error:', error);
        window.showToast('Lỗi kết nối: ' + error.message, 'error');
    }
}
    
    async forceSync() {
        window.showToast('Đang đồng bộ dữ liệu...', 'info');
        
        try {
            await window.dataManager.smartSync();
            window.showToast('Đồng bộ hoàn tất', 'success');
            
            // Cập nhật số lần đồng bộ
            const count = parseInt(localStorage.getItem('sync_count') || 0) + 1;
            localStorage.setItem('sync_count', count.toString());
            
            await this.render();
            
        } catch (error) {
            console.error('Force sync error:', error);
            window.showToast('Lỗi đồng bộ dữ liệu', 'error');
        }
    }
    
    clearAllData() {
        if (!confirm('XÓA TOÀN BỘ DỮ LIỆU?\n\nHành động này sẽ xóa mọi dữ liệu cục bộ. Dữ liệu trên GitHub vẫn được giữ lại.')) {
            return;
        }
        
        // Xóa tất cả dữ liệu trong localStorage
        localStorage.removeItem('milano_db_index');
        localStorage.removeItem('milano_reports_cache');
        localStorage.removeItem('milano_inventory_cache');
        localStorage.removeItem('milano_employees_cache');
        localStorage.removeItem('sync_count');
        
        // Reset data manager
        window.dataManager.data = {
            reports: {},
            inventory: {
                products: [],
                purchases: {},
                services: {},
                exports: {}
            },
            employees: {
                list: [],
                salaries: {},
                penalties: {},
                workDays: {}
            }
        };
        
        window.dataManager.localDbIndex = {
            version: '2.0',
            lastUpdated: null,
            files: {},
            modules: {
                reports: { latest: null, files: {} },
                inventory: { latest: null, files: {} },
                employees: { latest: null, files: {} }
            }
        };
        
        window.showToast('Đã xóa toàn bộ dữ liệu cục bộ', 'success');
        
        // Chuyển về tab settings
        this.render();
    }
    
    exportData() {
        const data = {
            version: '2.0',
            exportedAt: new Date().toISOString(),
            dbIndex: window.dataManager.dbIndex,
            localDbIndex: window.dataManager.localDbIndex,
            data: window.dataManager.data
        };
        
        const dataStr = JSON.stringify(data, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `milano-backup-${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        window.showToast('Đã xuất dữ liệu', 'success');
    }
    
    importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            
            reader.onload = async (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    
                    if (!confirm('Nhập dữ liệu này sẽ ghi đè dữ liệu hiện tại. Tiếp tục?')) {
                        return;
                    }
                    
                    if (data.version !== '2.0') {
                        window.showToast('Phiên bản dữ liệu không tương thích', 'error');
                        return;
                    }
                    
                    // Import dữ liệu
                    window.dataManager.dbIndex = data.dbIndex || window.dataManager.dbIndex;
                    window.dataManager.localDbIndex = data.localDbIndex || window.dataManager.localDbIndex;
                    window.dataManager.data = data.data || window.dataManager.data;
                    
                    // Lưu vào localStorage
                    window.dataManager.saveLocalDBIndex();
                    window.dataManager.saveToLocalStorage();
                    
                    window.showToast('Đã nhập dữ liệu', 'success');
                    await this.render();
                    
                } catch (error) {
                    console.error('Error importing data:', error);
                    window.showToast('File không hợp lệ', 'error');
                }
            };
            
            reader.readAsText(file);
        };
        
        input.click();
    }
    
    async rebuildDBIndex() {
        if (!confirm('Xây lại DB Index?\n\nHành động này sẽ quét lại toàn bộ file trên GitHub và tạo lại DB Index.')) {
            return;
        }
        
        window.showToast('Đang xây lại DB Index...', 'info');
        
        try {
            // Lấy danh sách file từ GitHub
            const modules = ['reports', 'inventory', 'employees'];
            const newDBIndex = {
                version: '2.0',
                lastUpdated: new Date().toISOString(),
                files: {},
                modules: {
                    reports: { latest: null, files: {} },
                    inventory: { latest: null, files: {} },
                    employees: { latest: null, files: {} }
                }
            };
            
            for (const module of modules) {
                const files = await window.githubManager.listFiles(module);
                
                for (const file of files) {
                    if (file.name.endsWith('.json')) {
                        const filePath = `${module}/${file.name}`;
                        
                        newDBIndex.files[filePath] = {
                            sha: file.sha,
                            lastModified: new Date().toISOString()
                        };
                        
                        newDBIndex.modules[module].files[file.name] = {
                            sha: file.sha,
                            lastModified: new Date().toISOString()
                        };
                        
                        // Tìm file mới nhất
                        if (!newDBIndex.modules[module].latest) {
                            newDBIndex.modules[module].latest = file.name;
                        } else {
                            // So sánh timestamp từ filename
                            const currentLatest = newDBIndex.modules[module].latest;
                            if (this.compareFilenames(file.name, currentLatest) > 0) {
                                newDBIndex.modules[module].latest = file.name;
                            }
                        }
                    }
                }
            }
            
            // Lưu DB index mới
            window.dataManager.dbIndex = newDBIndex;
            await window.githubManager.updateDBIndex(newDBIndex);
            
            window.showToast('Đã xây lại DB Index thành công', 'success');
            await this.render();
            
        } catch (error) {
            console.error('Error rebuilding DB index:', error);
            window.showToast('Lỗi khi xây lại DB Index', 'error');
        }
    }
    
    compareFilenames(a, b) {
        // So sánh filename để tìm cái mới hơn
        // Ưu tiên file có version cao hơn hoặc timestamp mới hơn
        return a.localeCompare(b);
    }
    
    clearCache() {
        if (!confirm('Xóa cache cục bộ?\n\nDữ liệu sẽ được tải lại từ GitHub khi cần.')) {
            return;
        }
        
        localStorage.removeItem('milano_reports_cache');
        localStorage.removeItem('milano_inventory_cache');
        localStorage.removeItem('milano_employees_cache');
        
        window.dataManager.data = {
            reports: {},
            inventory: {
                products: [],
                purchases: {},
                services: {},
                exports: {}
            },
            employees: {
                list: [],
                salaries: {},
                penalties: {},
                workDays: {}
            }
        };
        
        window.showToast('Đã xóa cache', 'success');
        this.render();
    }
    
    async checkIntegrity() {
        window.showToast('Đang kiểm tra toàn vẹn dữ liệu...', 'info');
        
        try {
            let errors = [];
            
            // Kiểm tra DB index
            if (!window.dataManager.dbIndex) {
                errors.push('DB Index không tồn tại');
            }
            
            // Kiểm tra local DB index
            if (!window.dataManager.localDbIndex) {
                errors.push('Local DB Index không tồn tại');
            }
            
            // Kiểm tra data consistency
            const reports = window.dataManager.data.reports;
            const inventory = window.dataManager.data.inventory;
            const employees = window.dataManager.data.employees;
            
            if (!reports || typeof reports !== 'object') {
                errors.push('Dữ liệu reports không hợp lệ');
            }
            
            if (!inventory || typeof inventory !== 'object') {
                errors.push('Dữ liệu inventory không hợp lệ');
            }
            
            if (!employees || typeof employees !== 'object') {
                errors.push('Dữ liệu employees không hợp lệ');
            }
            
            if (errors.length === 0) {
                window.showToast('Dữ liệu toàn vẹn', 'success');
            } else {
                window.showToast(`Tìm thấy ${errors.length} lỗi: ${errors.join(', ')}`, 'error');
            }
            
        } catch (error) {
            console.error('Error checking integrity:', error);
            window.showToast('Lỗi khi kiểm tra toàn vẹn', 'error');
        }
    }
    
    async backupToGitHub() {
        window.showToast('Đang backup dữ liệu lên GitHub...', 'info');
        
        try {
            // Tạo backup file
            const backupData = {
                version: '2.0',
                backedUpAt: new Date().toISOString(),
                data: window.dataManager.data
            };
            
            const date = new Date().toISOString().split('T')[0];
            const filename = `backup-${date}.json`;
            
            await window.githubManager.createOrUpdateFile(
                `backups/${filename}`,
                backupData,
                `Backup dữ liệu ngày ${date}`
            );
            
            window.showToast('Đã backup dữ liệu lên GitHub', 'success');
            
        } catch (error) {
            console.error('Error backing up to GitHub:', error);
            window.showToast('Lỗi khi backup dữ liệu', 'error');
        }
    }
}

// Khởi tạo module
window.settingsModule = new SettingsModule();