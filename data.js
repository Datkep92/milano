// data.js - Quản lý dữ liệu thông minh với ưu tiên Local First
class DataManager {
    constructor() {
        this.data = {
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
        
        // DB Index từ GitHub
        this.dbIndex = {
            version: '2.0',
            lastUpdated: null,
            files: {},
            modules: {
                reports: { latest: null, files: {} },
                inventory: { latest: null, files: {} },
                employees: { latest: null, files: {} }
            }
        };
        
        // Local DB Index
        this.localDbIndex = null;
        
        // Trạng thái đồng bộ
        this.syncState = {
            isSyncing: false,
            lastLocalUpdate: null,
            lastGitHubUpdate: null,
            isInitialized: false,
            syncQueue: [],
            isProcessingQueue: false,
            autoSyncInterval: 5 * 60 * 1000, // 5 phút
            autoSyncTimer: null,
            hasPendingChanges: false
        };
        
        this.initialized = false;
    }
    
    // ========== KHỞI TẠO ==========
    async init() {
        try {
            console.log('🚀 DataManager - Fast initialization (Local First)');
            
            // 1. Load DB index từ localStorage
            await this.loadLocalDBIndex();
            
            // 2. Load dữ liệu cục bộ từ localStorage
            this.loadFromLocalStorage();
            
            // 3. Load sync queue
            this.loadSyncQueue();
            
            // 4. Đánh dấu đã khởi tạo - UI có thể render ngay
            this.syncState.isInitialized = true;
            this.syncState.lastLocalUpdate = new Date().toISOString();
            
            // 5. Kiểm tra GitHub trong nền (không chặn UI)
            setTimeout(() => this.backgroundGitHubCheck(), 1000);
            
            // 6. Thiết lập auto-sync
            this.setupAutoSync();
            
            console.log('✅ DataManager - Local data ready for UI');
            console.log('📊 Local data stats:', {
                reports: Object.keys(this.data.reports).length,
                products: this.data.inventory.products.length,
                employees: this.data.employees.list.length
            });
            
            this.initialized = true;
            
        } catch (error) {
            console.error('❌ Data init error:', error);
        }
    }
    
    setupAutoSync() {
        // Kiểm tra GitHub định kỳ
        this.syncState.autoSyncTimer = setInterval(
            () => this.backgroundGitHubCheck(),
            this.syncState.autoSyncInterval
        );
        
        // Lắng nghe sự kiện online/offline
        window.addEventListener('online', () => this.backgroundGitHubCheck());
        
        // Lắng nghe khi app trở lại focus
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && navigator.onLine) {
                this.backgroundGitHubCheck();
            }
        });
    }
    
    // ========== LOCAL STORAGE ==========
    async loadLocalDBIndex() {
        try {
            const saved = localStorage.getItem('milano_db_index');
            if (saved) {
                this.localDbIndex = JSON.parse(saved);
                console.log('📂 Loaded local DB index');
            } else {
                this.localDbIndex = {
                    version: '2.0',
                    lastUpdated: null,
                    files: {},
                    modules: {
                        reports: { latest: null, files: {} },
                        inventory: { latest: null, files: {} },
                        employees: { latest: null, files: {} }
                    }
                };
                console.log('📂 Created new local DB index');
            }
        } catch (e) {
            console.warn('⚠️ Could not load DB index:', e);
            this.localDbIndex = {
                version: '2.0',
                lastUpdated: null,
                files: {},
                modules: {
                    reports: { latest: null, files: {} },
                    inventory: { latest: null, files: {} },
                    employees: { latest: null, files: {} }
                }
            };
        }
    }
    
    saveLocalDBIndex() {
        try {
            localStorage.setItem('milano_db_index', JSON.stringify(this.localDbIndex));
        } catch (e) {
            console.warn('⚠️ Could not save DB index');
        }
    }
    
    loadFromLocalStorage() {
        try {
            // Load cache data từ localStorage
            const savedReports = localStorage.getItem('milano_reports_cache');
            const savedInventory = localStorage.getItem('milano_inventory_cache');
            const savedEmployees = localStorage.getItem('milano_employees_cache');
            
            if (savedReports) {
                const parsed = JSON.parse(savedReports);
                this.data.reports = parsed;
                console.log(`📊 Loaded ${Object.keys(parsed).length} reports from cache`);
            }
            
            if (savedInventory) {
                const parsed = JSON.parse(savedInventory);
                this.data.inventory = {
                    products: Array.isArray(parsed.products) ? parsed.products : [],
                    purchases: parsed.purchases || {},
                    services: parsed.services || {},
                    exports: parsed.exports || {}
                };
                console.log(`📦 Loaded ${this.data.inventory.products.length} products from cache`);
            }
            
            if (savedEmployees) {
                const parsed = JSON.parse(savedEmployees);
                this.data.employees = {
                    list: Array.isArray(parsed.list) ? parsed.list : [],
                    salaries: parsed.salaries || {},
                    penalties: parsed.penalties || {},
                    workDays: parsed.workDays || {}
                };
                console.log(`👥 Loaded ${this.data.employees.list.length} employees from cache`);
            }
            
        } catch (e) {
            console.warn('⚠️ Could not load from localStorage:', e);
        }
    }
    
    saveToLocalStorage() {
        try {
            localStorage.setItem('milano_reports_cache', JSON.stringify(this.data.reports));
            localStorage.setItem('milano_inventory_cache', JSON.stringify(this.data.inventory));
            localStorage.setItem('milano_employees_cache', JSON.stringify(this.data.employees));
            
            this.syncState.lastLocalUpdate = new Date().toISOString();
            this.syncState.hasPendingChanges = true;
            
        } catch (e) {
            console.warn('⚠️ Could not save to localStorage');
        }
    }
    
    // ========== SYNC QUEUE ==========
    loadSyncQueue() {
        try {
            const queue = localStorage.getItem('milano_sync_queue');
            if (queue) {
                this.syncState.syncQueue = JSON.parse(queue);
                console.log(`📋 Loaded ${this.syncState.syncQueue.length} pending sync tasks`);
            }
        } catch (e) {
            console.warn('⚠️ Could not load sync queue');
            this.syncState.syncQueue = [];
        }
    }
    
    saveSyncQueue() {
        try {
            localStorage.setItem('milano_sync_queue', JSON.stringify(this.syncState.syncQueue));
        } catch (e) {
            console.warn('⚠️ Could not save sync queue');
        }
    }
    
    queueSync(task) {
        this.syncState.syncQueue.push({
            ...task,
            queuedAt: new Date().toISOString(),
            retryCount: 0
        });
        this.saveSyncQueue();
        
        console.log(`📤 Queued sync task: ${task.module}/${task.date}`);
        
        // Tự động xử lý queue nếu đang online
        if (navigator.onLine && !this.syncState.isProcessingQueue) {
            setTimeout(() => this.processSyncQueue(), 1000);
        }
    }
    
    async processSyncQueue() {
        if (this.syncState.isProcessingQueue || this.syncState.syncQueue.length === 0) {
            return;
        }
        
        this.syncState.isProcessingQueue = true;
        console.log(`🔄 Processing sync queue (${this.syncState.syncQueue.length} tasks)`);
        
        try {
            while (this.syncState.syncQueue.length > 0 && navigator.onLine) {
                const task = this.syncState.syncQueue[0];
                
                try {
                    console.log(`📤 Processing: ${task.module}/${task.date}`);
                    
                    const success = await this.uploadToGitHub(
                        task.module,
                        task.date,
                        task.data,
                        task.message
                    );
                    
                    if (success) {
                        // Xóa task đã xử lý
                        this.syncState.syncQueue.shift();
                        console.log(`✅ Sync completed: ${task.module}/${task.date}`);
                    } else {
                        // Thử lại sau
                        task.retryCount++;
                        if (task.retryCount >= 3) {
                            console.warn(`❌ Max retries reached for: ${task.module}/${task.date}`);
                            this.syncState.syncQueue.shift();
                        } else {
                            // Chuyển xuống cuối queue để thử lại sau
                            this.syncState.syncQueue.push(this.syncState.syncQueue.shift());
                        }
                        break;
                    }
                    
                } catch (error) {
                    console.error(`❌ Sync task failed:`, error);
                    task.retryCount++;
                    
                    if (task.retryCount >= 3) {
                        console.warn(`❌ Removing failed task after 3 retries: ${task.module}/${task.date}`);
                        this.syncState.syncQueue.shift();
                    } else {
                        // Chuyển xuống cuối queue
                        this.syncState.syncQueue.push(this.syncState.syncQueue.shift());
                    }
                    break;
                }
            }
            
        } finally {
            this.syncState.isProcessingQueue = false;
            this.saveSyncQueue();
            
            if (this.syncState.syncQueue.length > 0) {
                console.log(`⏳ ${this.syncState.syncQueue.length} tasks remaining in queue`);
            }
        }
    }
    
    // ========== BACKGROUND GITHUB CHECK ==========
    async backgroundGitHubCheck() {
        if (this.syncState.isSyncing || !navigator.onLine) {
            return;
        }
        
        console.log('🔄 Background GitHub check...');
        
        try {
            // 1. Lấy DB index từ GitHub
            const remoteIndex = await window.githubManager.getDBIndex();
            if (!remoteIndex) {
                console.log('📭 No GitHub DB index found');
                return;
            }
            
            // 2. Kiểm tra nếu cần sync từ GitHub
            const needsDownload = this.needsSyncFromGitHub(remoteIndex);
            
            if (needsDownload) {
                console.log('📥 GitHub has newer data, syncing in background...');
                await this.downloadFromGitHub(remoteIndex);
            } else {
                console.log('✅ GitHub data is up-to-date');
            }
            
            // 3. Xử lý sync queue nếu có
            if (this.syncState.syncQueue.length > 0) {
                await this.processSyncQueue();
            }
            
            // 4. Kiểm tra nếu có pending changes local
            if (this.syncState.hasPendingChanges) {
                await this.uploadPendingChanges();
            }
            
        } catch (error) {
            console.log('⚠️ Background sync failed:', error.message);
        }
    }
    
    needsSyncFromGitHub(remoteIndex) {
        // Nếu chưa có local index -> cần sync
        if (!this.localDbIndex || !this.localDbIndex.lastUpdated) {
            return true;
        }
        
        // Nếu GitHub có lastUpdated mới hơn -> cần sync
        const localTime = new Date(this.localDbIndex.lastUpdated);
        const remoteTime = new Date(remoteIndex.lastUpdated);
        
        return remoteTime > localTime;
    }
    
    async downloadFromGitHub(remoteIndex) {
        this.syncState.isSyncing = true;
        this.updateSyncStatus(true, 'Đang cập nhật từ GitHub...');
        
        try {
            // Cập nhật dbIndex
            this.dbIndex = remoteIndex;
            
            // Tải dữ liệu mới từ từng module
            await this.syncModuleData('reports', true);
            await this.syncModuleData('inventory', true);
            await this.syncModuleData('employees', true);
            
            // Cập nhật local DB index
            this.localDbIndex = JSON.parse(JSON.stringify(remoteIndex));
            this.saveLocalDBIndex();
            
            // Lưu cache
            this.saveToLocalStorage();
            
            // Thông báo cho UI cập nhật
            this.notifyUIUpdate();
            
            console.log('✅ Background download completed');
            
        } catch (error) {
            console.error('❌ Background download error:', error);
        } finally {
            this.syncState.isSyncing = false;
            this.updateSyncStatus(false);
        }
    }
    
    async uploadPendingChanges() {
        // Logic để upload các thay đổi chưa được sync
        // Có thể implement nếu cần track từng thay đổi
        this.syncState.hasPendingChanges = false;
    }
    
    // ========== SMART SYNC METHODS ==========
    async syncModuleData(module, background = false) {
        try {
            const moduleFiles = this.dbIndex.modules[module]?.files || {};
            const localFiles = this.localDbIndex?.modules?.[module]?.files || {};
            
            let downloaded = 0;
            
            for (const [filename, remoteFile] of Object.entries(moduleFiles)) {
                const localFile = localFiles[filename];
                
                // Nếu file không có trong local hoặc SHA khác
                if (!localFile || localFile.sha !== remoteFile.sha) {
                    await this.downloadModuleFile(module, filename);
                    downloaded++;
                }
            }
            
            if (downloaded > 0 && !background) {
                console.log(`✅ ${module}: Downloaded ${downloaded} new/updated files`);
            }
            
        } catch (error) {
            console.error(`❌ Error syncing ${module} data:`, error);
        }
    }
    
    async downloadModuleFile(module, filename) {
        try {
            const filePath = `${module}/${filename}`;
            const content = await window.githubManager.getFileContent(filePath);
            
            if (!content) return;
            
            // Xử lý dữ liệu theo module
            switch(module) {
                case 'reports':
                    await this.processReportFile(filename, content);
                    break;
                case 'inventory':
                    await this.processInventoryFile(filename, content);
                    break;
                case 'employees':
                    await this.processEmployeesFile(filename, content);
                    break;
            }
            
        } catch (error) {
            console.error(`❌ Error downloading ${module} file ${filename}:`, error);
        }
    }
    
    // ========== DATA PROCESSING ==========
    async processReportFile(filename, content) {
        try {
            const match = filename.match(/^(\d{4}-\d{2}-\d{2})(?:_v(\d+))?\.json$/);
            if (!match) return;
            
            const dateKey = match[1];
            const version = match[2] ? parseInt(match[2]) : 1;
            
            const existingReport = this.data.reports[dateKey];
            if (!existingReport || existingReport.version < version) {
                this.data.reports[dateKey] = {
                    ...content,
                    version: version,
                    filename: filename
                };
            }
        } catch (error) {
            console.error('❌ Error processing report file:', error);
        }
    }
    
    async processInventoryFile(filename, content) {
        try {
            const match = filename.match(/^(\d{4}-\d{2}-\d{2})\.json$/);
            if (!match) return;
            
            const dateKey = match[1];
            
            if (content.type === 'purchase' && content.data) {
                if (!this.data.inventory.purchases[dateKey]) {
                    this.data.inventory.purchases[dateKey] = [];
                }
                this.data.inventory.purchases[dateKey].push(content.data);
                this.updateInventoryProduct(content.data);
                
            } else if (content.type === 'service' && content.data) {
                if (!this.data.inventory.services[dateKey]) {
                    this.data.inventory.services[dateKey] = [];
                }
                this.data.inventory.services[dateKey].push(content.data);
            }
            
        } catch (error) {
            console.error('❌ Error processing inventory file:', error);
        }
    }
    
    async processEmployeesFile(filename, content) {
        try {
            const match = filename.match(/^(\d{4}-\d{2}-\d{2})\.json$/);
            if (!match) return;
            
            const dateKey = match[1];
            
            if (content.type === 'workday' && content.employeeId && content.data) {
                if (!this.data.employees.workDays[dateKey]) {
                    this.data.employees.workDays[dateKey] = {};
                }
                this.data.employees.workDays[dateKey][content.employeeId] = content.data;
                
            } else if (content.type === 'penalty' && content.data) {
                if (!this.data.employees.penalties[dateKey]) {
                    this.data.employees.penalties[dateKey] = [];
                }
                this.data.employees.penalties[dateKey].push(content.data);
            }
            
        } catch (error) {
            console.error('❌ Error processing employees file:', error);
        }
    }
    
    updateInventoryProduct(purchaseData) {
        try {
            if (!purchaseData || !purchaseData.name) return;
            
            const products = this.data.inventory.products;
            const existingIndex = products.findIndex(p => 
                p && p.name && purchaseData.name &&
                p.name.toLowerCase() === purchaseData.name.toLowerCase() && 
                p.unit === purchaseData.unit
            );
            
            if (existingIndex >= 0) {
                products[existingIndex].quantity += (purchaseData.quantity || 0);
                products[existingIndex].totalValue += (purchaseData.total || 0);
            } else {
                products.push({
                    id: Date.now(),
                    name: purchaseData.name,
                    unit: purchaseData.unit || 'cái',
                    quantity: purchaseData.quantity || 0,
                    totalValue: purchaseData.total || 0,
                    addedAt: new Date().toISOString()
                });
            }
            
        } catch (error) {
            console.error('❌ Error updating inventory product:', error);
        }
    }
    
    // ========== PUBLIC API - ƯU TIÊN LOCAL ==========
    async syncToGitHub(module, date, data, message = null) {
        // 1. Cập nhật local data ngay lập tức
        this.updateLocalData(module, date, data);
        
        // 2. Lưu vào localStorage
        this.saveToLocalStorage();
        
        // 3. Thông báo cho UI cập nhật
        this.notifyUIUpdate();
        
        // 4. Đưa vào queue để sync lên GitHub trong nền
        this.queueSync({
            module,
            date,
            data,
            message: message || `${module} ngày ${date}`
        });
        
        console.log(`💾 Saved locally and queued for GitHub: ${module}/${date}`);
        
        return true; // Luôn trả về thành công (local)
    }
    
    async uploadToGitHub(module, date, data, message = null) {
        try {
            let filename = `${date}.json`;
            
            // Kiểm tra version
            const existingFiles = this.dbIndex.modules[module].files || {};
            let version = 1;
            
            for (const [existingFilename] of Object.entries(existingFiles)) {
                if (existingFilename.startsWith(`${date}_v`)) {
                    const match = existingFilename.match(/_v(\d+)\.json$/);
                    if (match) {
                        const existingVersion = parseInt(match[1]);
                        if (existingVersion >= version) {
                            version = existingVersion + 1;
                        }
                    }
                } else if (existingFilename === `${date}.json`) {
                    version = 2;
                }
            }
            
            if (version > 1) {
                filename = `${date}_v${version}.json`;
            }
            
            const filePath = `${module}/${filename}`;
            
            // Lưu lên GitHub
            const result = await window.githubManager.createOrUpdateFile(
                filePath,
                data,
                message || `${module} ngày ${date}${version > 1 ? ` (v${version})` : ''}`
            );
            
            if (result && result.content && result.content.sha) {
                // Cập nhật DB index
                this.dbIndex.lastUpdated = new Date().toISOString();
                this.dbIndex.files[filePath] = {
                    sha: result.content.sha,
                    lastModified: new Date().toISOString()
                };
                
                if (!this.dbIndex.modules[module]) {
                    this.dbIndex.modules[module] = { latest: null, files: {} };
                }
                
                this.dbIndex.modules[module].latest = filename;
                this.dbIndex.modules[module].files[filename] = {
                    sha: result.content.sha,
                    lastModified: new Date().toISOString()
                };
                
                // Cập nhật local DB index
                this.localDbIndex = JSON.parse(JSON.stringify(this.dbIndex));
                this.saveLocalDBIndex();
                
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error(`❌ Upload to GitHub error:`, error);
            throw error;
        }
    }
    
    updateLocalData(module, key, data) {
        try {
            // Logic cập nhật dữ liệu local theo module
            // Được gọi ngay khi user thao tác
            switch(module) {
                case 'reports':
                    this.data.reports[key] = data;
                    break;
                case 'inventory':
                    if (data.type === 'purchase' && data.data) {
                        const dateKey = key;
                        if (!this.data.inventory.purchases[dateKey]) {
                            this.data.inventory.purchases[dateKey] = [];
                        }
                        this.data.inventory.purchases[dateKey].push(data.data);
                        this.updateInventoryProduct(data.data);
                    }
                    break;
                case 'employees':
                    if (data.type === 'workday' && data.employeeId && data.data) {
                        if (!this.data.employees.workDays[key]) {
                            this.data.employees.workDays[key] = {};
                        }
                        this.data.employees.workDays[key][data.employeeId] = data.data;
                    }
                    break;
            }
            
            return true;
            
        } catch (error) {
            console.error('Error updating local data:', error);
            return false;
        }
    }
    
    // ========== GETTER METHODS - LOCAL ONLY ==========
    getReport(date) {
        return this.data.reports[date] || null;
    }
    
    getReports(startDate, endDate) {
        try {
            const allReports = [];
            const reportsData = this.data.reports;
            
            if (reportsData && typeof reportsData === 'object') {
                Object.values(reportsData).forEach(report => {
                    if (report && typeof report === 'object') {
                        allReports.push(report);
                    }
                });
            }
            
            // Filter by date range if provided
            if (startDate && endDate) {
                const parseDisplayDate = (dateStr) => {
                    try {
                        const [day, month, year] = dateStr.split('/').map(Number);
                        return new Date(year, month - 1, day);
                    } catch (e) {
                        return new Date(0);
                    }
                };
                
                const start = parseDisplayDate(startDate);
                const end = parseDisplayDate(endDate);
                
                if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                    return allReports;
                }
                
                return allReports.filter(report => {
                    if (!report || !report.date) return false;
                    try {
                        const reportDate = parseDisplayDate(report.date);
                        return reportDate >= start && reportDate <= end;
                    } catch (e) {
                        return false;
                    }
                });
            }
            
            return allReports;
            
        } catch (error) {
            console.error('Error getting reports:', error);
            return [];
        }
    }
    
    getEmployees() {
        if (!Array.isArray(this.data.employees.list)) {
            this.data.employees.list = [];
        }
        return this.data.employees.list;
    }
    
    getInventoryProducts() {
        let products = this.data.inventory?.products;
        
        if (!products || !Array.isArray(products)) {
            products = [];
            if (!this.data.inventory) {
                this.data.inventory = {};
            }
            this.data.inventory.products = products;
        }
        
        return products;
    }
    
    getEmployeeWorkDays(employeeId, monthYear) {
        const workDays = this.data.employees.workDays;
        let result = {};
        
        Object.entries(workDays).forEach(([date, dayData]) => {
            if (date.startsWith(monthYear) && dayData[employeeId]) {
                const day = date.split('-')[2];
                result[day] = dayData[employeeId];
            }
        });
        
        return result;
    }
    
    // ========== UI NOTIFICATION ==========
    notifyUIUpdate() {
        // Phát sự kiện để UI biết có dữ liệu mới
        const event = new CustomEvent('dataUpdated', {
            detail: { timestamp: new Date().toISOString() }
        });
        window.dispatchEvent(event);
    }
    
    updateSyncStatus(syncing, text = 'Đồng bộ...') {
        const statusEl = document.getElementById('syncStatus');
        if (!statusEl) return;
        
        if (syncing) {
            statusEl.innerHTML = `<i class="fas fa-sync-alt fa-spin"></i><span>${text}</span>`;
            statusEl.classList.add('syncing');
        } else {
            statusEl.innerHTML = `<i class="fas fa-check-circle"></i><span>Đã đồng bộ</span>`;
            statusEl.classList.remove('syncing');
        }
    }
    
    // ========== DEBUG & MAINTENANCE ==========
    async debugData() {
        console.log('🔍 DEBUG - DataManager State:');
        console.log('📊 Local Data:', {
            reports: Object.keys(this.data.reports).length,
            products: this.data.inventory.products.length,
            employees: this.data.employees.list.length
        });
        console.log('📋 Sync State:', this.syncState);
        console.log('📁 Local DB Index:', this.localDbIndex);
    }
    
    forceSyncNow() {
        this.backgroundGitHubCheck();
    }
    
    clearAllData() {
        localStorage.removeItem('milano_db_index');
        localStorage.removeItem('milano_reports_cache');
        localStorage.removeItem('milano_inventory_cache');
        localStorage.removeItem('milano_employees_cache');
        localStorage.removeItem('milano_sync_queue');
        
        this.data = {
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
        
        this.localDbIndex = {
            version: '2.0',
            lastUpdated: null,
            files: {},
            modules: {
                reports: { latest: null, files: {} },
                inventory: { latest: null, files: {} },
                employees: { latest: null, files: {} }
            }
        };
        
        this.syncState.syncQueue = [];
        this.saveSyncQueue();
        
        console.log('🧹 All local data cleared');
    }
    
}

// Khởi tạo singleton
window.dataManager = new DataManager();