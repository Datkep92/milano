// daily-snapshot.js - Hệ thống tạo và tải snapshot hàng ngày
class DailySnapshotManager {
 constructor() {
        this.today = new Date().toISOString().split('T')[0];
        this.snapshotPath = `snapshots/${this.today}`;
        this.settings = window.backupSettings?.getSettings?.() || this.getDefaultSettings();
        this.initialize();
    }

    getDefaultSettings() {
        return {
            backupToLocal: true,
            backupToGitHub: true,
            keepLocalDays: 7,
            keepGitHubDays: 30,
            backupReports: true,
            backupInventory: true,
            backupEmployees: true,
            backupAttendance: true,
            backupPurchases: true,
            backupServices: true
        };
    }

    // THÊM METHOD BỊ THIẾU
    async getReportsData() {
        try {
            const allReports = await dataManager.getAllReports();
            return allReports.filter(r => r.date === this.today);
        } catch (error) {
            console.error('Lỗi lấy dữ liệu reports:', error);
            return [];
        }
    }

    // THÊM METHOD BỊ THIẾU
    async getInventoryData() {
        try {
            return await dataManager.getAllProducts();
        } catch (error) {
            console.error('Lỗi lấy dữ liệu inventory:', error);
            return [];
        }
    }

    // THÊM METHOD BỊ THIẾU
    async getEmployeesData() {
        try {
            return await dataManager.getAllEmployees();
        } catch (error) {
            console.error('Lỗi lấy dữ liệu employees:', error);
            return [];
        }
    }

    // SỬA LẠI hàm collectAllData
    async collectAllData() {
        const now = new Date();
        const snapshotData = {
            metadata: {
                snapshotDate: this.today,
                createdAt: now.toISOString(),
                version: '1.0',
                source: 'Daily Snapshot'
            },
            data: {},
            stats: {}
        };

        // SỬA: Dùng các method đã có sẵn
        const [reports, products, employees] = await Promise.all([
            this.settings.backupReports !== false ? dataManager.getAllReports() : Promise.resolve([]),
            this.settings.backupInventory !== false ? dataManager.getAllProducts() : Promise.resolve([]),
            this.settings.backupEmployees !== false ? dataManager.getAllEmployees() : Promise.resolve([])
        ]);

        // Lọc reports theo ngày
        snapshotData.data.reports = reports.filter(r => r.date === this.today);
        snapshotData.data.products = products;
        snapshotData.data.employees = employees;

        // Lấy dữ liệu từ localStorage
        if (this.settings.backupAttendance !== false) {
            snapshotData.data.attendance = this.getLocalStorageData('attendance_');
        }

        // Lấy reward/penalty data
        const rewardData = this.getLocalStorageData('rewards_');
        const penaltyData = this.getLocalStorageData('penalties_');
        
        if (Object.keys(rewardData).length > 0) {
            snapshotData.data.rewards = rewardData;
        }
        
        if (Object.keys(penaltyData).length > 0) {
            snapshotData.data.penalties = penaltyData;
        }

        // Lấy purchase history
        if (this.settings.backupPurchases !== false) {
            const purchaseHistory = JSON.parse(localStorage.getItem('purchase_history') || '[]');
            snapshotData.data.purchases = purchaseHistory.filter(p => p.date === this.today);
        }

        // Lấy service history
        if (this.settings.backupServices !== false) {
            const serviceHistory = JSON.parse(localStorage.getItem('service_history') || '[]');
            snapshotData.data.services = serviceHistory.filter(s => s.date === this.today);
        }

        // Lấy thông tin từ các manager hiện tại
        if (window.reportsManager) {
            snapshotData.data.inventoryOutput = window.reportsManager.todayInventoryOutput || [];
            
            // Thử lấy current form data nếu có method
            if (typeof window.reportsManager.getCurrentFormData === 'function') {
                try {
                    snapshotData.data.currentReport = window.reportsManager.getCurrentFormData();
                } catch (error) {
                    console.warn('Không thể lấy current form data:', error);
                }
            }
        }

        // Thêm settings và app state
        snapshotData.data.githubSettings = githubManager.getSettings();
        snapshotData.data.appState = {
            currentTab: window.app?.currentTab || 'report',
            selectedDate: document.getElementById('reportDate')?.value || this.today
        };

        // Thêm stats
        snapshotData.stats = {
            totalReports: reports.length,
            totalProducts: products.length,
            totalEmployees: employees.length,
            todayReports: snapshotData.data.reports.length,
            todayPurchases: snapshotData.data.purchases?.length || 0,
            todayServices: snapshotData.data.services?.length || 0
        };

        return snapshotData;
    }

    // Giữ nguyên các method khác không thay đổi...
    getLocalStorageData(prefix) {
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(prefix)) {
                data[key] = localStorage.getItem(key);
            }
        }
        return data;
    }

    async saveSnapshotLocal(snapshotData) {
        if (!this.settings.backupToLocal) {
            console.log('⏭️ Bỏ qua backup local (disabled)');
            return;
        }

        try {
            const key = `snapshot_${this.today}`;
            localStorage.setItem(key, JSON.stringify(snapshotData));
            
            // Lưu timestamp
            localStorage.setItem('last_snapshot', new Date().toISOString());
            
            console.log('💾 Đã lưu snapshot local');
        } catch (error) {
            console.error('Lỗi lưu snapshot local:', error);
        }
    }

    async saveSnapshotToGitHub(snapshotData) {
        if (!this.settings.backupToGitHub) {
            console.log('⏭️ Bỏ qua backup GitHub (disabled)');
            return;
        }

        // Chỉ backup nếu GitHub đã cấu hình
        if (!githubManager.initialized) {
            console.log('⏭️ Bỏ qua backup GitHub (not configured)');
            return;
        }

        try {
            const fileName = `${this.snapshotPath}/full-snapshot-${Date.now()}.json`;
            const content = JSON.stringify(snapshotData, null, 2);
            
            const result = await githubManager.saveFile(
                fileName,
                content,
                null,
                `📸 Snapshot ngày ${this.today}`
            );
            
            console.log('☁️ Đã lưu snapshot lên GitHub:', result.url);
            return result;
            
        } catch (error) {
            console.error('Lỗi lưu snapshot lên GitHub:', error);
            throw error;
        }
    }

    async createTodaySnapshot(force = false) {
        try {
            console.log('📸 Tạo snapshot cho ngày:', this.today);
            
            // Kiểm tra xem có cần backup không
            const shouldBackup = await this.shouldCreateSnapshot();
            
            if (!shouldBackup && !force) {
                console.log('⏭️ Bỏ qua snapshot (no changes)');
                return null;
            }
            
            const snapshotData = await this.collectAllData();
            
            // Lưu snapshot local
            if (this.settings.backupToLocal) {
                await this.saveSnapshotLocal(snapshotData);
            }
            
            // Lưu lên GitHub nếu đã cấu hình
            if (this.settings.backupToGitHub && githubManager.initialized) {
                await this.saveSnapshotToGitHub(snapshotData);
            }
            
            console.log('✅ Đã tạo snapshot thành công');
            return snapshotData;
            
        } catch (error) {
            console.error('❌ Lỗi tạo snapshot:', error);
            return null;
        }
    }

    async shouldCreateSnapshot() {
        // Kiểm tra thời gian từ lần backup cuối
        const lastBackup = localStorage.getItem('last_snapshot');
        if (lastBackup) {
            const lastDate = new Date(lastBackup);
            const now = new Date();
            const diffMinutes = (now - lastDate) / (1000 * 60);
            
            // Nếu backup gần đây quá (< 1 phút), bỏ qua
            if (diffMinutes < 1) {
                return false;
            }
        }

        return true;
    }

    async initialize() {
        console.log('📸 Khởi tạo Daily Snapshot Manager...');
        await this.createTodaySnapshot();
        this.setupAutoSave();
    }


  

    // Tải snapshot gần nhất
    async loadLatestSnapshot() {
        try {
            console.log('🔄 Tải snapshot gần nhất...');
            
            // Thử tải từ GitHub trước
            if (githubManager.initialized) {
                const githubSnapshot = await this.loadSnapshotFromGitHub();
                if (githubSnapshot) {
                    await this.restoreSnapshot(githubSnapshot);
                    return true;
                }
            }
            
            // Nếu không có trên GitHub, tải từ local
            const localSnapshot = this.loadSnapshotLocal();
            if (localSnapshot) {
                await this.restoreSnapshot(localSnapshot);
                return true;
            }
            
            console.log('ℹ️ Không tìm thấy snapshot nào');
            return false;
            
        } catch (error) {
            console.error('❌ Lỗi tải snapshot:', error);
            return false;
        }
    }

    // Tải snapshot từ GitHub
    async loadSnapshotFromGitHub() {
        try {
            // Tìm snapshot của hôm nay
            const folderPath = this.snapshotPath;
            const files = await this.getGitHubFolderFiles(folderPath);
            
            if (files && files.length > 0) {
                // Lấy file mới nhất
                const latestFile = files.sort((a, b) => 
                    new Date(b.createdAt) - new Date(a.createdAt)
                )[0];
                
                console.log('📥 Tải snapshot từ GitHub:', latestFile.name);
                
                const content = await githubManager.getSimpleFile(latestFile.path);
                if (content) {
                    return JSON.parse(content);
                }
            }
            
            return null;
            
        } catch (error) {
            console.error('Lỗi tải snapshot từ GitHub:', error);
            return null;
        }
    }

    // Lấy danh sách file trong folder GitHub
    async getGitHubFolderFiles(folderPath) {
        try {
            const apiUrl = `${githubManager.baseUrl}/repos/${githubManager.repo}/contents/${folderPath}?ref=${githubManager.branch}`;
            
            const response = await fetch(apiUrl, {
                headers: {
                    'Authorization': `token ${githubManager.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (response.ok) {
                return await response.json();
            } else if (response.status === 404) {
                return [];
            } else {
                throw new Error(`GitHub API error: ${response.status}`);
            }
        } catch (error) {
            console.error('Lỗi lấy danh sách file:', error);
            return null;
        }
    }

    // Tải snapshot local
    loadSnapshotLocal() {
        try {
            const key = `snapshot_${this.today}`;
            const snapshotStr = localStorage.getItem(key);
            
            if (snapshotStr) {
                console.log('📥 Tải snapshot local');
                return JSON.parse(snapshotStr);
            }
            
            return null;
        } catch (error) {
            console.error('Lỗi tải snapshot local:', error);
            return null;
        }
    }

    // Khôi phục từ snapshot
    async restoreSnapshot(snapshotData) {
        try {
            console.log('🔄 Khôi phục từ snapshot...');
            
            const { data, metadata } = snapshotData;
            
            // Khôi phục core data
            if (data.reports && Array.isArray(data.reports)) {
                for (const report of data.reports) {
                    try {
                        await dataManager.saveReport(report);
                    } catch (error) {
                        console.warn('Lỗi khôi phục report:', error);
                    }
                }
            }
            
            if (data.products && Array.isArray(data.products)) {
                await dataManager.saveProducts(data.products);
            }
            
            if (data.employees && Array.isArray(data.employees)) {
                for (const employee of data.employees) {
                    try {
                        await dataManager.saveEmployee(employee);
                    } catch (error) {
                        console.warn('Lỗi khôi phục employee:', error);
                    }
                }
            }
            
            // Khôi phục localStorage data
            if (data.attendance) {
                Object.entries(data.attendance).forEach(([key, value]) => {
                    localStorage.setItem(key, value);
                });
            }
            
            if (data.rewards) {
                Object.entries(data.rewards).forEach(([key, value]) => {
                    localStorage.setItem(key, value);
                });
            }
            
            if (data.penalties) {
                Object.entries(data.penalties).forEach(([key, value]) => {
                    localStorage.setItem(key, value);
                });
            }
            
            if (data.purchases && Array.isArray(data.purchases)) {
                const existingHistory = JSON.parse(localStorage.getItem('purchase_history') || '[]');
                const newHistory = [...existingHistory, ...data.purchases];
                localStorage.setItem('purchase_history', JSON.stringify(newHistory));
            }
            
            if (data.services && Array.isArray(data.services)) {
                const existingHistory = JSON.parse(localStorage.getItem('service_history') || '[]');
                const newHistory = [...existingHistory, ...data.services];
                localStorage.setItem('service_history', JSON.stringify(newHistory));
            }
            
            // Khôi phục app state
            if (data.appState) {
                this.restoreAppState(data.appState);
            }
            
            // Cập nhật các manager
            await this.refreshAllManagers();
            
            console.log('✅ Đã khôi phục từ snapshot thành công');
            return true;
            
        } catch (error) {
            console.error('❌ Lỗi khôi phục snapshot:', error);
            throw error;
        }
    }

    // Khôi phục trạng thái app
    restoreAppState(appState) {
        try {
            if (appState.currentTab && window.app) {
                setTimeout(() => {
                    window.app.switchTab(appState.currentTab);
                }, 500);
            }
            
            if (appState.selectedDate && document.getElementById('reportDate')) {
                document.getElementById('reportDate').value = appState.selectedDate;
            }
        } catch (error) {
            console.warn('Lỗi khôi phục app state:', error);
        }
    }

    // Làm mới tất cả manager
    async refreshAllManagers() {
        try {
            // Reports Manager
            if (window.reportsManager) {
                await window.reportsManager.initialize();
                const reportDate = document.getElementById('reportDate')?.value;
                if (reportDate) {
                    await window.reportsManager.loadCurrentDayReports(reportDate);
                }
            }
            
            // Employee Manager
            if (window.employeeManager) {
                await window.employeeManager.loadEmployees();
                window.employeeManager.updateMonthlySummary();
                window.employeeManager.displayEmployees();
            }
            
            // Inventory Manager
            if (window.inventoryManager) {
                await window.inventoryManager.loadInventory();
                await window.inventoryManager.loadHistory();
                window.inventoryManager.updateStatistics();
                window.inventoryManager.displayInventory();
            }
            
            console.log('🔄 Đã làm mới tất cả manager');
            
        } catch (error) {
            console.error('Lỗi làm mới managers:', error);
        }
    }

    // Thiết lập auto-save
    setupAutoSave() {
        // Auto-save mỗi 5 phút
        setInterval(() => {
            this.createTodaySnapshot();
        }, 5 * 60 * 1000);
        
        // Auto-save khi đóng tab/trình duyệt
        window.addEventListener('beforeunload', () => {
            this.createTodaySnapshot();
        });
        
        // Auto-save khi mất focus
        window.addEventListener('blur', () => {
            setTimeout(() => {
                this.createTodaySnapshot();
            }, 1000);
        });
    }

    // Tạo snapshot cho ngày cụ thể
    async createSnapshotForDate(date) {
        try {
            const originalDate = this.today;
            this.today = date;
            this.snapshotPath = `snapshots/${date}`;
            
            await this.createTodaySnapshot();
            
            // Trả lại ngày hiện tại
            this.today = originalDate;
            this.snapshotPath = `snapshots/${originalDate}`;
            
            console.log(`✅ Đã tạo snapshot cho ngày ${date}`);
            
        } catch (error) {
            console.error(`Lỗi tạo snapshot cho ngày ${date}:`, error);
            throw error;
        }
    }

    // Lấy danh sách snapshot có sẵn
    async getAvailableSnapshots() {
        try {
            const snapshots = [];
            
            // Lấy từ local
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('snapshot_')) {
                    const date = key.replace('snapshot_', '');
                    snapshots.push({
                        source: 'local',
                        date: date,
                        key: key
                    });
                }
            }
            
            // Lấy từ GitHub nếu có
            if (githubManager.initialized) {
                const githubSnapshots = await this.getGitHubSnapshots();
                snapshots.push(...githubSnapshots);
            }
            
            // Sắp xếp theo ngày (mới nhất trước)
            return snapshots.sort((a, b) => new Date(b.date) - new Date(a.date));
            
        } catch (error) {
            console.error('Lỗi lấy danh sách snapshot:', error);
            return [];
        }
    }

    // Lấy snapshot từ GitHub
    async getGitHubSnapshots() {
        try {
            const snapshots = [];
            const rootFolders = await this.getGitHubFolderFiles('snapshots');
            
            if (rootFolders && Array.isArray(rootFolders)) {
                for (const folder of rootFolders) {
                    if (folder.type === 'dir') {
                        const folderName = folder.name;
                        const files = await this.getGitHubFolderFiles(`snapshots/${folderName}`);
                        
                        if (files && files.length > 0) {
                            snapshots.push({
                                source: 'github',
                                date: folderName,
                                path: folder.path,
                                fileCount: files.length,
                                latestFile: files[0]
                            });
                        }
                    }
                }
            }
            
            return snapshots;
            
        } catch (error) {
            console.error('Lỗi lấy snapshot GitHub:', error);
            return [];
        }
    }

    // Xóa snapshot cũ (giữ 30 ngày gần nhất)
    async cleanupOldSnapshots() {
        try {
            const snapshots = await this.getAvailableSnapshots();
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            for (const snapshot of snapshots) {
                const snapshotDate = new Date(snapshot.date);
                
                if (snapshotDate < thirtyDaysAgo) {
                    if (snapshot.source === 'local') {
                        localStorage.removeItem(snapshot.key);
                        console.log(`🗑️ Đã xóa snapshot local cũ: ${snapshot.date}`);
                    }
                    // Có thể thêm logic xóa trên GitHub nếu cần
                }
            }
        } catch (error) {
            console.error('Lỗi dọn dẹp snapshot:', error);
        }
    }

    // Export snapshot ra file
    exportSnapshotToFile(snapshotData) {
        try {
            const dataStr = JSON.stringify(snapshotData, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
            
            const fileName = `snapshot-${this.today}-${Date.now()}.json`;
            
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', fileName);
            linkElement.click();
            
            console.log('📤 Đã export snapshot ra file');
            
        } catch (error) {
            console.error('Lỗi export snapshot:', error);
        }
    }

    // Import snapshot từ file
    async importSnapshotFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const snapshotData = JSON.parse(e.target.result);
                    
                    // Kiểm tra cấu trúc
                    if (!snapshotData.metadata || !snapshotData.data) {
                        throw new Error('File không đúng định dạng snapshot');
                    }
                    
                    // Khôi phục
                    await this.restoreSnapshot(snapshotData);
                    
                    console.log('✅ Đã import snapshot thành công');
                    resolve(true);
                    
                } catch (error) {
                    console.error('Lỗi import snapshot:', error);
                    reject(error);
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Lỗi đọc file'));
            };
            
            reader.readAsText(file);
        });
    }
}

// Khởi tạo toàn cục
let dailySnapshot = null;

// Khởi tạo khi app load
function initDailySnapshot() {
    if (!dailySnapshot) {
        dailySnapshot = new DailySnapshotManager();
    }
    return dailySnapshot;
}

// Hàm tiện ích cho UI
function createSnapshotControlUI() {
    const controlPanel = document.createElement('div');
    controlPanel.className = 'snapshot-controls';
    controlPanel.innerHTML = `
        <div class="snapshot-panel">
            <h4><i class="fas fa-camera"></i> Daily Snapshot</h4>
            <div class="snapshot-actions">
                <button id="createSnapshotBtn" class="small-btn">
                    <i class="fas fa-save"></i> Tạo Snapshot
                </button>
                <button id="loadSnapshotBtn" class="small-btn secondary">
                    <i class="fas fa-download"></i> Tải Snapshot
                </button>
                <button id="exportSnapshotBtn" class="small-btn">
                    <i class="fas fa-file-export"></i> Export
                </button>
                <label class="small-btn" style="cursor: pointer;">
                    <i class="fas fa-file-import"></i> Import
                    <input type="file" id="importSnapshotInput" accept=".json" style="display: none;">
                </label>
            </div>
            <div class="snapshot-status" id="snapshotStatus">
                <i class="fas fa-circle" style="color: #ccc;"></i>
                <span>Chưa có snapshot hôm nay</span>
            </div>
        </div>
    `;
    
    // Thêm vào UI
    const debugPanel = document.querySelector('.debug-panel');
    if (debugPanel) {
        debugPanel.appendChild(controlPanel);
    } else {
        document.querySelector('header').appendChild(controlPanel);
    }
    
    // Setup event listeners
    setTimeout(() => {
        document.getElementById('createSnapshotBtn')?.addEventListener('click', () => {
            dailySnapshot?.createTodaySnapshot();
            updateSnapshotStatus();
        });
        
        document.getElementById('loadSnapshotBtn')?.addEventListener('click', () => {
            dailySnapshot?.loadLatestSnapshot();
        });
        
        document.getElementById('exportSnapshotBtn')?.addEventListener('click', () => {
            dailySnapshot?.createTodaySnapshot().then(snapshot => {
                if (snapshot) {
                    dailySnapshot.exportSnapshotToFile(snapshot);
                }
            });
        });
        
        document.getElementById('importSnapshotInput')?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                dailySnapshot?.importSnapshotFromFile(file);
            }
            e.target.value = '';
        });
        
        updateSnapshotStatus();
    }, 1000);
}

// Cập nhật trạng thái snapshot
function updateSnapshotStatus() {
    const statusEl = document.getElementById('snapshotStatus');
    if (!statusEl) return;
    
    const lastSnapshot = localStorage.getItem('last_snapshot');
    
    if (lastSnapshot) {
        const lastDate = new Date(lastSnapshot);
        const now = new Date();
        const diffHours = (now - lastDate) / (1000 * 60 * 60);
        
        let status = 'Lâu';
        let color = '#ff6b6b';
        
        if (diffHours < 1) {
            status = 'Vừa xong';
            color = '#2ecc71';
        } else if (diffHours < 24) {
            status = 'Hôm nay';
            color = '#3498db';
        }
        
        statusEl.innerHTML = `
            <i class="fas fa-circle" style="color: ${color};"></i>
            <span>Snapshot: ${status} (${lastDate.toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})})</span>
        `;
    }
}

// Tự động khởi tạo khi app sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        // Khởi tạo snapshot manager
        dailySnapshot = new DailySnapshotManager();
        
        // Tạo UI controls
        createSnapshotControlUI();
        
        // Thử tải snapshot khi app khởi động
        setTimeout(() => {
            dailySnapshot.loadLatestSnapshot();
        }, 2000);
        
        // Cập nhật trạng thái mỗi phút
        setInterval(updateSnapshotStatus, 60000);
        
    }, 3000);
});