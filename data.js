// data.js - Đã tối ưu và sửa lỗi
class DataManager {
    constructor() {
        this.data = {
            reports: {},
            inventory: {
                products: [],
                purchases: {},
                services: {}
            },
            employees: {
                list: [],
                workDays: {},
                penalties: {}
            }
        };
        
        this.syncState = {
            isSyncing: false,
            isBackgroundSyncing: false,
            lastSync: null,
            online: navigator.onLine,
            hasPendingChanges: false,
            pendingChanges: []
        };
        
        this.initialized = false;
        this.isLoading = false;
        
        // Event listeners
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
        
        console.log('🔄 DataManager created');
    }
    
    async init() {
        if (this.initialized) return true;
        
        console.log('🚀 DataManager Initializing...');
        
        try {
            this.isLoading = true;
            
            // 1. Load từ localStorage trước (cho UX nhanh)
            this.loadLocalData();
            
            // 2. Đợi Firebase Manager khởi tạo
            if (window.githubManager) {
                try {
                    await window.githubManager.init();
                    console.log('✅ Firebase connected');
                } catch (firebaseError) {
                    console.warn('⚠️ Firebase connection failed, using offline mode:', firebaseError.message);
                }
            } else {
                console.warn('⚠️ Firebase Manager not available, using offline mode');
            }
            
            // 3. Load dữ liệu từ Firebase trong background nếu online
            if (navigator.onLine) {
                this.loadFromFirebase().catch(error => {
                    console.warn('⚠️ Background Firebase load failed:', error.message);
                });
            }
            
            this.initialized = true;
            this.isLoading = false;
            console.log('✅ DataManager initialized successfully');
            
            // 4. Update sync status
            this.updateSyncStatus(navigator.onLine ? 'online' : 'offline');
            
            return true;
            
        } catch (error) {
            console.error('❌ DataManager init error:', error);
            this.isLoading = false;
            
            // Vẫn khởi tạo thành công ở chế độ offline
            this.initialized = true;
            this.updateSyncStatus('offline');
            
            return false;
        }
    }
    
    // ========== FIREBASE OPERATIONS ==========
    
    async loadFromFirebase() {
        if (!navigator.onLine) {
            console.log('📴 Skipping Firebase load - offline');
            return;
        }
        
        const firebaseAvailable = window.githubManager && window.githubManager.isAvailable?.();
        if (!firebaseAvailable) {
            console.log('📴 Skipping Firebase load - not available');
            return;
        }
        
        try {
            console.log('🌐 Loading data from Firebase...');
            this.updateSyncStatus('Đang tải dữ liệu...', 'syncing');
            
            // Load từng phần một để tránh timeout
            await Promise.allSettled([
                this.loadReportsFromFirebase(),
                this.loadInventoryFromFirebase(),
                this.loadEmployeesFromFirebase()
            ]);
            
            this.syncState.lastSync = new Date().toISOString();
            this.syncState.hasPendingChanges = false;
            
            this.updateSyncStatus('Đã tải xong', 'success');
            console.log('✅ Firebase data loaded');
            
        } catch (error) {
            console.error('❌ Error loading from Firebase:', error);
            this.updateSyncStatus('Lỗi tải dữ liệu', 'error');
        }
    }
    
    async loadReportsFromFirebase() {
        try {
            const reports = await window.githubManager.getData('reports');
            
            if (reports) {
                let loadedCount = 0;
                
                Object.entries(reports).forEach(([dateKey, reportData]) => {
                    // Skip metadata
                    if (dateKey.startsWith('_')) return;
                    
                    if (reportData) {
                        const formattedDate = this.formatDateFromFirebase(dateKey);
                        this.data.reports[formattedDate] = {
                            ...reportData,
                            // Đánh dấu đã sync từ Firebase
                            _synced: true
                        };
                        loadedCount++;
                    }
                });
                
                if (loadedCount > 0) {
                    // Lưu vào localStorage
                    localStorage.setItem('milano_reports', JSON.stringify(this.data.reports));
                    console.log(`📥 Loaded ${loadedCount} reports from Firebase`);
                    this.notifyUIUpdate('reports');
                }
            }
        } catch (error) {
            console.error('❌ Error loading reports:', error);
        }
    }
    
    async loadInventoryFromFirebase() {
    try {
        console.log('📦 Loading inventory from Firebase...');
        this.updateSyncStatus('Đang tải kho hàng...', 'syncing');
        
        // Lấy dữ liệu từ Firebase - VỚI CẤU TRÚC MỚI
        const inventoryData = await window.githubManager.getData('inventory');
        
        console.log('📦 Raw Firebase inventory data:', inventoryData);
        
        if (!inventoryData) {
            console.warn('⚠️ No inventory data found in Firebase');
            return false;
        }
        
        // 1. LOAD PRODUCTS - FIX CẤU TRÚC NESTED
        if (inventoryData.products) {
            console.log('📦 Products data structure:', inventoryData.products);
            
            // Nếu có nested products object (inventory/products/products)
            if (inventoryData.products.products && Array.isArray(inventoryData.products.products)) {
                this.data.inventory.products = inventoryData.products.products;
                console.log(`📥 Loaded ${this.data.inventory.products.length} products from nested structure`);
            }
            // Nếu products là array trực tiếp
            else if (Array.isArray(inventoryData.products)) {
                this.data.inventory.products = inventoryData.products;
                console.log(`📥 Loaded ${this.data.inventory.products.length} products from direct array`);
            }
            // Nếu là object {id1: product1, id2: product2}
            else if (typeof inventoryData.products === 'object') {
                this.data.inventory.products = Object.values(inventoryData.products);
                console.log(`📥 Loaded ${this.data.inventory.products.length} products from object`);
            }
            else {
                this.data.inventory.products = [];
                console.warn('⚠️ Unknown products format');
            }
        } else {
            this.data.inventory.products = [];
            console.warn('⚠️ No products found in Firebase');
        }
        
        // 2. LOAD PURCHASES - THEO NGÀY
        this.data.inventory.purchases = {};
        if (inventoryData.purchases && typeof inventoryData.purchases === 'object') {
            console.log('📥 Processing purchases by date...');
            
            Object.entries(inventoryData.purchases).forEach(([dateKey, dateData]) => {
                if (dateKey.startsWith('_')) return;
                
                console.log(`📥 Purchases for ${dateKey}:`, dateData);
                
                let purchasesArray = [];
                
                // Trường hợp 1: dateData là object chứa purchases array
                if (dateData && dateData.purchases && Array.isArray(dateData.purchases)) {
                    purchasesArray = dateData.purchases;
                }
                // Trường hợp 2: dateData là array trực tiếp
                else if (Array.isArray(dateData)) {
                    purchasesArray = dateData;
                }
                // Trường hợp 3: dateData là object đơn
                else if (dateData && typeof dateData === 'object') {
                    purchasesArray = [dateData];
                }
                
                if (purchasesArray.length > 0) {
                    const formattedDate = this.formatDateFromFirebase(dateKey);
                    this.data.inventory.purchases[formattedDate] = purchasesArray;
                    console.log(`✅ Added ${purchasesArray.length} purchases for ${formattedDate}`);
                }
            });
        }
        
        // 3. LOAD SERVICES - THEO NGÀY
        this.data.inventory.services = {};
        if (inventoryData.services && typeof inventoryData.services === 'object') {
            Object.entries(inventoryData.services).forEach(([dateKey, dateData]) => {
                if (dateKey.startsWith('_')) return;
                
                let servicesArray = [];
                
                if (dateData && dateData.services && Array.isArray(dateData.services)) {
                    servicesArray = dateData.services;
                } else if (Array.isArray(dateData)) {
                    servicesArray = dateData;
                } else if (dateData && typeof dateData === 'object') {
                    servicesArray = [dateData];
                }
                
                if (servicesArray.length > 0) {
                    const formattedDate = this.formatDateFromFirebase(dateKey);
                    this.data.inventory.services[formattedDate] = servicesArray;
                }
            });
        }
        
        // 4. Lưu vào localStorage
        localStorage.setItem('milano_inventory', JSON.stringify(this.data.inventory));
        
        console.log('📥 Inventory loaded successfully:', {
            products: this.data.inventory.products.length,
            purchaseDates: Object.keys(this.data.inventory.purchases).length,
            serviceDates: Object.keys(this.data.inventory.services).length
        });
        
        this.notifyUIUpdate('inventory');
        return true;
        
    } catch (error) {
        console.error('❌ Error loading inventory:', error);
        this.updateSyncStatus('Lỗi tải kho hàng', 'error');
        return false;
    }
}
    
    async loadEmployeesFromFirebase() {
    try {
        const employees = await window.githubManager.getData('employees');
        
        console.log('👥 Raw Firebase employees data:', employees);
        
        if (!employees) {
            console.log('📭 No employees found in Firebase');
            return false;
        }
        
        // CHUYỂN OBJECT THÀNH ARRAY ĐÚNG CÁCH
        const employeesArray = [];
        
        Object.entries(employees).forEach(([key, employeeData]) => {
            if (key === '_meta' || key.startsWith('_')) return;
            
            console.log(`👥 Processing employee key: ${key}`, employeeData);
            
            // Nếu employeeData là object chứa nested data
            if (employeeData && typeof employeeData === 'object') {
                // Trường hợp 1: Có trường employee trực tiếp
                if (employeeData.employee && typeof employeeData.employee === 'object') {
                    employeesArray.push({
                        id: parseInt(key.replace('employee_', '')) || Date.now(),
                        ...employeeData.employee
                    });
                }
                // Trường hợp 2: Dữ liệu trực tiếp
                else {
                    employeesArray.push({
                        id: parseInt(key.replace('employee_', '')) || Date.now(),
                        ...employeeData
                    });
                }
            }
        });
        
        console.log(`✅ Converted to array: ${employeesArray.length} employees`);
        
        // Cập nhật vào DataManager
        this.data.employees.list = employeesArray;
        
        // Lưu vào localStorage
        localStorage.setItem('milano_employees', JSON.stringify(this.data.employees));
        
        this.notifyUIUpdate('employees');
        
        return true;
        
    } catch (error) {
        console.error('❌ Error loading employees:', error);
        return false;
    }
}
    
    // ========== SAVE OPERATIONS ==========
    
    async saveLocal(module, filename, data, message = '') {
        console.log(`💾 Saving ${module}/${filename}`, data);
        
        try {
            // 1. Lưu ngay vào memory
            this.saveDataToMemory(module, filename, data);
            
            // 2. Lưu vào localStorage NGAY LẬP TỨC
            this.saveLocalData();
            
            // 3. Thông báo UI UPDATE NGAY
            this.notifyUIUpdate(module);
            
            // 4. Hiển thị toast xác nhận
            if (window.showToast) {
                const toastMessage = message || `${module === 'reports' ? 'Báo cáo' : module === 'inventory' ? 'Kho' : 'Nhân viên'} đã được lưu`;
                window.showToast(toastMessage, 'success');
            }
            
            // 5. Thêm vào queue để sync lên Firebase
            this.addToFirebaseQueue(module, filename, data, message);
            
            return true;
            
        } catch (error) {
            console.error(`❌ Error in saveLocal:`, error);
            
            if (window.showToast) {
                window.showToast('Lỗi khi lưu dữ liệu', 'error');
            }
            
            return false;
        }
    }
    
    addToFirebaseQueue(module, filename, data, message = '') {
        const queueItem = {
            module,
            filename,
            data,
            message,
            timestamp: new Date().toISOString(),
            attempts: 0,
            status: 'pending'
        };
        
        this.syncState.pendingChanges.push(queueItem);
        this.syncState.hasPendingChanges = true;
        
        this.savePendingChanges();
        
        console.log(`📝 Added to Firebase queue: ${module}/${filename} (Total: ${this.syncState.pendingChanges.length})`);
        
        // Update sync status
        this.updateSyncStatus('Có thay đổi chưa đồng bộ', 'offline', this.syncState.pendingChanges.length);
        
        // Bắt đầu background sync nếu online
        if (this.syncState.online && !this.syncState.isBackgroundSyncing) {
            // Đợi 2 giây trước khi sync để tránh spam
            setTimeout(() => this.startBackgroundSync(), 2000);
        }
    }
    
    async startBackgroundSync() {
        if (this.syncState.isBackgroundSyncing || 
            this.syncState.pendingChanges.length === 0 ||
            !this.syncState.online) {
            return;
        }
        
        this.syncState.isBackgroundSyncing = true;
        this.updateSyncStatus('Đang đồng bộ...', 'syncing', this.syncState.pendingChanges.length);
        
        try {
            console.log(`🔄 Starting Firebase sync with ${this.syncState.pendingChanges.length} items`);
            
            await this.processFirebaseQueue();
            
            this.syncState.lastSync = new Date().toISOString();
            this.syncState.hasPendingChanges = this.syncState.pendingChanges.length > 0;
            
            if (this.syncState.pendingChanges.length === 0) {
                this.updateSyncStatus('Đồng bộ thành công', 'success', 0);
                
                if (window.showToast) {
                    window.showToast('Đã đồng bộ dữ liệu lên đám mây', 'success');
                }
            } else {
                this.updateSyncStatus('Đồng bộ một phần', 'warning', this.syncState.pendingChanges.length);
            }
            
        } catch (error) {
            console.error('❌ Firebase sync error:', error);
            this.updateSyncStatus('Lỗi đồng bộ', 'error', this.syncState.pendingChanges.length);
        } finally {
            this.syncState.isBackgroundSyncing = false;
        }
    }
    
    async processFirebaseQueue() {
        const failedItems = [];
        const firebaseAvailable = window.githubManager && window.githubManager.isAvailable?.();
        
        if (!firebaseAvailable) {
            console.warn('📴 Firebase not available for sync');
            return;
        }
        
        for (let i = 0; i < this.syncState.pendingChanges.length; i++) {
            const item = this.syncState.pendingChanges[i];
            
            // Skip nếu đã thử quá 3 lần
            if (item.attempts >= 3) {
                console.warn(`⚠️ Max attempts reached for: ${item.module}/${item.filename}`);
                failedItems.push(item);
                continue;
            }
            
            try {
                await this.uploadToFirebase(item.module, item.filename, item.data, item.message);
                
                // Xóa khỏi queue nếu thành công
                this.syncState.pendingChanges.splice(i, 1);
                i--;
                
                console.log(`✅ Firebase sync success: ${item.module}/${item.filename}`);
                
                // Update UI ngay lập tức
                this.updateSyncStatus('Đang đồng bộ...', 'syncing', this.syncState.pendingChanges.length);
                
                // Nghỉ 300ms giữa các request để tránh rate limit
                await new Promise(resolve => setTimeout(resolve, 300));
                
            } catch (error) {
                console.error(`❌ Firebase sync failed for ${item.module}/${item.filename}:`, error.message);
                item.attempts++;
                item.lastError = error.message;
                item.lastAttempt = new Date().toISOString();
            }
        }
        
        this.savePendingChanges();
    }
    
    async uploadToFirebase(module, filename, data, message = '') {
    try {
        console.log(`☁️ Uploading to Firebase: ${module}/${filename}`, data);
        
        let firebasePath = '';
        let dataToUpload = data;
        
        switch(module) {
            case 'reports':
                const dateMatch = filename.match(/(\d{4}-\d{2}-\d{2})/);
                if (dateMatch) {
                    firebasePath = `reports/${dateMatch[1]}`;
                }
                break;
                
            case 'inventory':
                if (filename === 'products.json') {
                    // LƯU THEO CẤU TRÚC MỚI: inventory/products/products
                    firebasePath = 'inventory/products';
                    // Đảm bảo data có cấu trúc {products: array}
                    if (data && Array.isArray(data.products)) {
                        dataToUpload = { products: data.products };
                    } else if (Array.isArray(data)) {
                        dataToUpload = { products: data };
                    }
                } else if (filename.includes('purchases')) {
                    const dateMatch = filename.match(/purchases_(\d{4}-\d{2}-\d{2})/);
                    if (dateMatch) {
                        firebasePath = `inventory/purchases/${dateMatch[1]}`;
                        // Lưu theo cấu trúc: {purchases: array}
                        if (data && Array.isArray(data.purchases)) {
                            dataToUpload = { purchases: data.purchases };
                        } else if (Array.isArray(data)) {
                            dataToUpload = { purchases: data };
                        }
                    }
                } else if (filename.includes('services')) {
                    const dateMatch = filename.match(/services_(\d{4}-\d{2}-\d{2})/);
                    if (dateMatch) {
                        firebasePath = `inventory/services/${dateMatch[1]}`;
                        // Lưu theo cấu trúc: {services: array}
                        if (data && Array.isArray(data.services)) {
                            dataToUpload = { services: data.services };
                        } else if (Array.isArray(data)) {
                            dataToUpload = { services: data };
                        }
                    }
                }
                break;
                
            case 'employees':
                const idMatch = filename.match(/([^\.]+)\.json/);
                if (idMatch) {
                    firebasePath = `employees/${idMatch[1]}`;
                }
                break;
        }
        
        if (!firebasePath) {
            throw new Error(`Invalid firebase path for ${module}/${filename}`);
        }
        
        console.log(`📤 Uploading to ${firebasePath}:`, dataToUpload);
        await window.githubManager.setData(firebasePath, dataToUpload);
        
        return true;
        
    } catch (error) {
        console.error(`❌ Firebase upload error:`, error);
        throw error;
    }
}
    
    // ========== UTILITIES ==========
    
    formatDateFromFirebase(dateKey) {
        try {
            const [year, month, day] = dateKey.split('-');
            return `${day}/${month}/${year}`;
        } catch (error) {
            console.warn('⚠️ Error formatting date from Firebase:', dateKey);
            return dateKey;
        }
    }
    
    saveDataToMemory(module, filename, data) {
        switch(module) {
            case 'reports':
                const reportMatch = filename.match(/(\d{4}-\d{2}-\d{2})\.json$/);
                if (reportMatch) {
                    const dateKey = this.formatDateFromFirebase(reportMatch[1]);
                    this.data.reports[dateKey] = {
                        ...data,
                        _savedAt: new Date().toISOString(),
                        _localOnly: true
                    };
                }
                break;
                
            case 'inventory':
                if (filename === 'products.json') {
                    this.data.inventory.products = data.products || data;
                } else if (filename.includes('purchases')) {
                    const dateMatch = filename.match(/(\d{4}-\d{2}-\d{2})\.json$/);
                    if (dateMatch) {
                        const dateKey = this.formatDateFromFirebase(dateMatch[1]);
                        this.data.inventory.purchases[dateKey] = data.purchases || data;
                    }
                } else if (filename.includes('services')) {
                    const dateMatch = filename.match(/(\d{4}-\d{2}-\d{2})\.json$/);
                    if (dateMatch) {
                        const dateKey = this.formatDateFromFirebase(dateMatch[1]);
                        this.data.inventory.services[dateKey] = data.services || data;
                    }
                }
                break;
                
            case 'employees':
                if (filename === 'employees.json') {
                    this.data.employees.list = data.employees || data;
                } else {
                    const idMatch = filename.match(/([^\.]+)\.json$/);
                    if (idMatch) {
                        const employeeId = idMatch[1];
                        const existingIndex = this.data.employees.list.findIndex(e => e.id === employeeId);
                        
                        if (existingIndex >= 0) {
                            this.data.employees.list[existingIndex] = {
                                ...this.data.employees.list[existingIndex],
                                ...data,
                                _updatedAt: new Date().toISOString()
                            };
                        } else {
                            this.data.employees.list.push({
                                id: employeeId,
                                ...data,
                                _createdAt: new Date().toISOString()
                            });
                        }
                    }
                }
                break;
        }
    }
    
    loadLocalData() {
        try {
            const reports = localStorage.getItem('milano_reports');
            const inventory = localStorage.getItem('milano_inventory');
            const employees = localStorage.getItem('milano_employees');
            const pendingChanges = localStorage.getItem('milano_pending_changes');
            
            if (reports) this.data.reports = JSON.parse(reports);
            if (inventory) this.data.inventory = JSON.parse(inventory);
            if (employees) this.data.employees = JSON.parse(employees);
            if (pendingChanges) this.syncState.pendingChanges = JSON.parse(pendingChanges);
            
            if (this.syncState.pendingChanges.length > 0) {
                this.syncState.hasPendingChanges = true;
            }
            
            console.log(`📂 Local data loaded: ${Object.keys(this.data.reports).length} reports, ${this.data.inventory.products.length} products, ${this.data.employees.list.length} employees`);
            
        } catch (error) {
            console.warn('⚠️ Error loading local data:', error);
            // Reset to default if corrupted
            localStorage.removeItem('milano_reports');
            localStorage.removeItem('milano_inventory');
            localStorage.removeItem('milano_employees');
            localStorage.removeItem('milano_pending_changes');
        }
    }
    
    saveLocalData() {
        try {
            localStorage.setItem('milano_reports', JSON.stringify(this.data.reports));
            localStorage.setItem('milano_inventory', JSON.stringify(this.data.inventory));
            localStorage.setItem('milano_employees', JSON.stringify(this.data.employees));
        } catch (error) {
            console.warn('⚠️ Error saving local data:', error);
        }
    }
    
    savePendingChanges() {
        try {
            localStorage.setItem('milano_pending_changes', JSON.stringify(this.syncState.pendingChanges));
        } catch (error) {
            console.warn('⚠️ Error saving pending changes:', error);
        }
    }
    
    // ========== SYNC STATUS ==========
    
    updateSyncStatus(text, status = 'ready', pendingCount = null) {
        const count = pendingCount !== null ? pendingCount : this.syncState.pendingChanges.length;
        window.updateSyncStatusUI?.(status, count);
        
        // Dispatch event cho các module khác
        const event = new CustomEvent('syncStatusChanged', {
            detail: { 
                status, 
                pendingChanges: count,
                timestamp: new Date().toISOString(),
                hasPendingChanges: this.syncState.hasPendingChanges,
                isSyncing: this.syncState.isBackgroundSyncing
            }
        });
        window.dispatchEvent(event);
    }
    
    // ========== EVENT HANDLERS ==========
    
    handleOnline() {
        console.log('🌐 Online - Starting Firebase sync');
        this.syncState.online = true;
        this.updateSyncStatus('Đang kết nối...', 'syncing');
        
        // Đợi 3 giây rồi bắt đầu sync
        setTimeout(() => {
            this.loadFromFirebase().then(() => {
                this.startBackgroundSync();
            });
        }, 3000);
    }
    
    handleOffline() {
        console.log('📴 Offline - Queueing changes');
        this.syncState.online = false;
        this.updateSyncStatus('Đang offline', 'offline', this.syncState.pendingChanges.length);
    }
    
    // ========== HELPER METHODS ==========
    
    notifyUIUpdate(module) {
        const event = new CustomEvent('dataUpdated', {
            detail: { 
                module, 
                timestamp: new Date().toISOString(),
                source: 'local' 
            }
        });
        window.dispatchEvent(event);
    }
    
    // ========== PUBLIC API ==========
    
    async getReport(date) {
        const report = this.data.reports[date] || null;
        return report;
    }
    
    getReports() {
        return Object.values(this.data.reports || {});
    }
    
    getInventoryProducts() {
        return Array.isArray(this.data.inventory.products)
            ? this.data.inventory.products
            : [];
    }
    
    getEmployees() {
        return Array.isArray(this.data.employees.list)
            ? this.data.employees.list
            : [];
    }
    
    async forceSync() {
        console.log('🔄 Manual force sync requested');
        
        if (!this.syncState.online) {
            if (window.showToast) {
                window.showToast('Không có kết nối internet', 'warning');
            }
            return;
        }
        
        await this.loadFromFirebase();
        await this.startBackgroundSync();
    }
    
    getSyncStats() {
        return {
            lastSync: this.syncState.lastSync,
            pendingChanges: this.syncState.pendingChanges.length,
            isSyncing: this.syncState.isBackgroundSyncing,
            online: this.syncState.online,
            hasPendingChanges: this.syncState.hasPendingChanges,
            localStats: {
                reports: Object.keys(this.data.reports).length,
                products: this.data.inventory.products.length,
                employees: this.data.employees.list.length,
                pendingPurchases: Object.keys(this.data.inventory.purchases).length,
                pendingServices: Object.keys(this.data.inventory.services).length
            }
        };
    }
    
    clearPendingChanges() {
        const count = this.syncState.pendingChanges.length;
        this.syncState.pendingChanges = [];
        this.syncState.hasPendingChanges = false;
        this.savePendingChanges();
        
        console.log(`🧹 Cleared ${count} pending changes`);
        this.updateSyncStatus('Đã xóa hàng đợi', 'success', 0);
        
        return count;
    }
    
    isReady() {
        return this.initialized && !this.isLoading;
    }
}

// Khởi tạo DataManager
window.dataManager = new DataManager();