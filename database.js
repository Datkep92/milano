// =========================================================
// DATABASE SYSTEM - CORE CONFIGURATION với GitHub Sync
// =========================================================

const DB_NAME = 'CafeManagementDB';
const DB_VERSION = 16; // ⬅️ ĐÃ TĂNG LÊN 16 để buộc chạy lại logic onupgradeneeded

// Database instance
let db = null;
let dbInitialized = false;

// GitHub sync state - CẤU HÌNH MẶC ĐỊNH CHO REPO CỦA BẠN
let githubSync = {
    enabled: false,
    token: '',
    repo: 'Datkep92/milano',
    branch: 'main',
    dataPath: 'data',
    owner: 'Datkep92',
    repoName: 'milano',
    baseUrl: 'https://api.github.com',
    isSyncing: false,
    pendingSyncs: [],
    lastSync: null,
    autoSync: true
};

// =========================================================
// 1. INITIALIZATION & STRUCTURE
// =========================================================

function initializeDatabase() {
    return new Promise((resolve, reject) => {
        if (db && dbInitialized) {
            console.log('📌 Database already initialized');
            resolve(db);
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error('❌ Database error:', event.target.error);
            reject(event.target.error);
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            dbInitialized = true;
            console.log('✅ Database opened successfully');
            
            // Load GitHub settings
            loadGitHubSettings();
            
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            console.log(`⬆️ Upgrading database from version ${event.oldVersion} to ${DB_VERSION}`);

            // Tạo các object stores
            const stores = [
                { name: 'reports', keyPath: 'reportId' },
                { name: 'employees', keyPath: 'employeeId' },
                { name: 'inventory', keyPath: 'id' }, // QUAN TRỌNG: inventory cần 'id'
                { name: 'statistics', keyPath: 'id' },
                { name: 'operations', keyPath: 'id' },
                { name: 'inventoryHistory', keyPath: 'historyId' },
                { name: 'attendance', keyPath: 'attendanceId' }, // ✅ KHÓA ĐÃ ĐƯỢC FIX
                { name: 'discipline_records', keyPath: 'recordId' },
                { name: 'sync_status', keyPath: 'key' },
                // THÊM CÁC STORE MỚI
                { name: 'sync_queue', keyPath: 'id' },
                { name: 'sync_metadata', keyPath: 'storeName' }
            ];
            
            stores.forEach(storeConfig => {
                // 🔑 FIX CỐT LÕI: Nếu store attendance đã tồn tại, ta xóa và tạo lại 
                // để chắc chắn nó dùng keyPath mới ('attendanceId') và không bị lỗi schema cũ.
                if (storeConfig.name === 'attendance' && db.objectStoreNames.contains(storeConfig.name)) {
                    db.deleteObjectStore(storeConfig.name);
                    console.log(`⚠️ Deleted old store: ${storeConfig.name} for keyPath correction.`);
                }
                
                if (!db.objectStoreNames.contains(storeConfig.name)) {
                    const store = db.createObjectStore(storeConfig.name, { 
                        keyPath: storeConfig.keyPath 
                    });
                    console.log(`✅ Created store: ${storeConfig.name} with keyPath: ${storeConfig.keyPath}`);
                    
                    // Tạo indexes cho các store quan trọng
                    if (storeConfig.name === 'inventory') {
                        store.createIndex('name', 'name', { unique: false });
                        console.log(`✅ Created index 'name' for inventory`);
                    }
                    if (storeConfig.name === 'employees') {
                        store.createIndex('phone', 'phone', { unique: true });
                        console.log(`✅ Created index 'phone' for employees`);
                    }
                }
            });
            
            console.log('✅ Database structure updated');
        };
    });
}

// =========================================================
// 2. CRUD OPERATIONS (giữ nguyên)
// =========================================================

function dbTransaction(storeName, mode, callback) {
    return new Promise((resolve, reject) => {
        if (!db) {
            console.error('❌ Database not initialized.');
            reject(new Error('Database not initialized.'));
            return;
        }
        
        if (!db.objectStoreNames.contains(storeName)) {
            console.error(`❌ Store ${storeName} does not exist`);
            reject(new Error(`Store ${storeName} does not exist`));
            return;
        }
        
        const transaction = db.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);

        transaction.oncomplete = () => {
            // Transaction completed
        };

        transaction.onerror = (event) => {
            console.error('❌ Transaction error:', event.target.error);
            reject(event.target.error);
        };

        // Execute callback
        callback(store, resolve, reject);
    });
}

// Sửa hàm dbAdd trong database.js (thực hiện Upsert: Add HOẶC Update)
function dbAdd(storeName, data) { // Giữ tên dbAdd để không phải sửa các chỗ gọi
    return dbTransaction(storeName, 'readwrite', (store, resolve, reject) => {
        console.log(`📝 dbAdd (Upsert) called for store: ${storeName}`);
        console.log(`📝 Store keyPath: ${store.keyPath}`);
        console.log(`📝 Data being processed:`, data);
        
        // ĐẢM BẢO DATA CÓ ĐÚNG KEY PATH (Logic tạo key vẫn giữ nguyên)
        let finalData = { ...data };
        const keyPath = store.keyPath;
        
        // FIX: Kiểm tra và sửa key path cho các store
        if (!finalData[keyPath]) {
            console.warn(`⚠️ Data missing keyPath '${keyPath}' for store '${storeName}'`);
            
            // Tự động tạo key path dựa trên store type
            switch(storeName) {
                case 'inventory':
                    if (keyPath === 'id') {
                        // inventory có thể dùng id hoặc itemId
                        if (finalData.itemId) {
                            finalData.id = finalData.itemId;
                        } else {
                            // Sửa lỗi: Thay thế regex để xử lý tiếng Việt tốt hơn
                            const nameSlug = finalData.name ? finalData.name.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/[-\s]+/g, '_') : 'item';
                            finalData.id = `${nameSlug}_${Date.now()}`;
                        }
                    }
                    break;
                    
                case 'attendance':
                    if (keyPath === 'attendanceId') {
                        // attendance cần attendanceId
                        if (!finalData.attendanceId) {
                            finalData.attendanceId = `ATT_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                        }
                    }
                    break;
                    
                case 'employees':
                    if (keyPath === 'employeeId' && !finalData.employeeId) {
                        finalData.employeeId = `EMP_${Date.now()}`;
                    }
                    break;
                    
                case 'reports':
                    if (keyPath === 'reportId' && finalData.date) {
                        finalData.reportId = finalData.date.replace(/-/g, '');
                    }
                    break;
                    
                default:
                    // Tạo key generic cho các store khác
                    if (keyPath === 'id' && !finalData.id) {
                        finalData.id = `${storeName}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                    }
            }
            
            console.log(`🔄 Auto-corrected keyPath '${keyPath}' for ${storeName}:`, finalData[keyPath]);
        }
        
        console.log(`📝 Final data with keyPath:`, finalData[keyPath]);
        
        // ====================================================================
        // 🔑 FIX CỐT LÕI: DÙNG PUT() THAY CHO ADD() để tránh ConstraintError
        // ====================================================================
        const request = store.put(finalData); 
        
        request.onsuccess = (event) => {
            // put() trả về key của bản ghi vừa được thêm/cập nhật
            console.log(`✅ Upserted to ${storeName}:`, finalData);
            resolve(event.target.result);
        };
        
        request.onerror = (event) => {
            // put() vẫn có thể lỗi nếu keyPath không phải là primary key 
            // và vi phạm unique index (ví dụ: unique index 'phone' của employees)
            console.error(`❌ DB Upsert Error for store ${storeName}:`, event.target.error);
            console.error(`❌ Store name:`, storeName);
            console.error(`❌ Store keyPath:`, store.keyPath);
            console.error(`❌ Data that failed:`, finalData);
            
            // Lỗi vẫn có thể là ConstraintError nếu vi phạm unique index
            reject(event.target.error);
        };
    });
}

function dbGet(storeName, key) {
    return dbTransaction(storeName, 'readonly', (store, resolve, reject) => {
        if (key === undefined || key === null || key === '') {
            resolve(null);
            return;
        }

        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function dbUpdate(storeName, key, updates) {
    return dbTransaction(storeName, 'readwrite', (store, resolve, reject) => {
        const getRequest = store.get(key);

        getRequest.onsuccess = () => {
            const existing = getRequest.result;
            let updated;
            
            if (existing) {
                updated = { ...existing, ...updates };
            } else {
                // Tạo mới nếu không tồn tại
                updated = { [store.keyPath]: key, ...updates };
            }

            const putRequest = store.put(updated);
            putRequest.onsuccess = () => resolve(updated);
            putRequest.onerror = () => reject(putRequest.error);
        };

        getRequest.onerror = () => reject(getRequest.error);
    });
}

function dbDelete(storeName, key) {
    return dbTransaction(storeName, 'readwrite', (store, resolve, reject) => {
        if (key === undefined || key === null || key === '') {
            resolve();
            return;
        }

        const request = store.delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

function dbGetAll(storeName, indexName = null, range = null) {
    return dbTransaction(storeName, 'readonly', (store, resolve, reject) => {
        let request;
        if (indexName) {
            const index = store.index(indexName);
            request = index.getAll(range);
        } else {
            request = store.getAll();
        }

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

function dbClear(storeName) {
    return dbTransaction(storeName, 'readwrite', (store, resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// =========================================================
// 3. BUSINESS LOGIC FUNCTIONS
// =========================================================

async function addEmployee(employeeData) {
    const employee = {
        employeeId: 'emp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        ...employeeData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        _synced: false
    };
    await dbAdd('employees', employee);
    return employee;
}

async function updateEmployee(employeeId, updates) {
    const updated = await dbUpdate('employees', employeeId, {
        ...updates,
        updatedAt: new Date().toISOString(),
        _synced: false
    });
    return updated;
}

async function addReport(reportData) {
    const reportId = reportData.date.replace(/-/g, '');
    const report = {
        reportId: reportId,
        ...reportData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        _synced: false
    };
    await dbAdd('reports', report);
    
    // Auto sync to GitHub
    if (githubSync.enabled && githubSync.autoSync) {
        setTimeout(() => syncSingleReportToGitHub(report), 1000);
    }
    
    return report;
}

async function updateReport(reportId, updates) {
    const updated = await dbUpdate('reports', reportId, {
        ...updates,
        updatedAt: new Date().toISOString(),
        _synced: false
    });
    
    // Auto sync to GitHub
    if (githubSync.enabled && githubSync.autoSync) {
        setTimeout(() => syncSingleReportToGitHub(updated), 1000);
    }
    
    return updated;
}

// =========================================================
// 4. GITHUB SYNC SYSTEM - OPTIMIZED FOR YOUR REPO
// =========================================================

function loadGitHubSettings() {
    try {
        githubSync.token = localStorage.getItem('github_token') || '';
        githubSync.repo = localStorage.getItem('github_repo') || 'Datkep92/milano';
        githubSync.branch = localStorage.getItem('github_branch') || 'main';
        githubSync.dataPath = localStorage.getItem('github_data_path') || 'data';
        githubSync.autoSync = localStorage.getItem('github_auto_sync') !== 'false';
        
        if (githubSync.token && githubSync.repo) {
            githubSync.enabled = true;
            
            // Parse owner và repo name
            const parts = githubSync.repo.split('/');
            if (parts.length === 2) {
                githubSync.owner = parts[0];
                githubSync.repoName = parts[1];
            }
            
            console.log('✅ GitHub settings loaded:', {
                enabled: githubSync.enabled,
                repo: githubSync.repo,
                branch: githubSync.branch,
                dataPath: githubSync.dataPath,
                autoSync: githubSync.autoSync
            });
        } else {
            console.log('⚠️ GitHub settings incomplete or not configured');
        }
        
    } catch (error) {
        console.error('❌ Error loading GitHub settings:', error);
        githubSync.enabled = false;
    }
}

/**
 * Kiểm tra kết nối GitHub
 */
async function testGitHubConnection() {
    try {
        console.log('🔗 Testing GitHub connection...');
        
        // Kiểm tra cấu hình
        if (!githubSync.token) {
            return {
                success: false,
                message: '❌ Chưa nhập GitHub Token'
            };
        }
        
        if (!githubSync.repo) {
            return {
                success: false, 
                message: '❌ Chưa nhập Repository'
            };
        }
        
        // Parse owner và repo name
        const parts = githubSync.repo.split('/');
        if (parts.length !== 2) {
            return {
                success: false,
                message: '❌ Repository phải có định dạng: owner/repo-name'
            };
        }
        
        const owner = parts[0];
        const repoName = parts[1];
        const apiUrl = `https://api.github.com/repos/${owner}/${repoName}`;
        
        console.log('🔗 Testing connection to:', apiUrl);
        
        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `token ${githubSync.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (response.ok) {
            const repoInfo = await response.json();
            console.log('✅ GitHub connection successful:', repoInfo.full_name);
            
            return {
                success: true,
                message: `✅ Kết nối thành công đến ${repoInfo.full_name}`,
                repo: repoInfo
            };
        } else {
            const errorText = await response.text();
            console.error('❌ GitHub API error:', response.status, errorText);
            
            let errorMessage = `GitHub API error: ${response.status}`;
            if (response.status === 401) {
                errorMessage = '❌ Token không hợp lệ hoặc hết hạn';
            } else if (response.status === 404) {
                errorMessage = '❌ Repository không tồn tại hoặc không có quyền truy cập';
            } else if (response.status === 403) {
                errorMessage = '❌ Token không đủ quyền hoặc bị giới hạn rate limit';
            }
            
            return {
                success: false,
                message: errorMessage,
                status: response.status
            };
        }
        
    } catch (error) {
        console.error('❌ GitHub connection test failed:', error);
        
        let errorMessage = `❌ Lỗi kết nối: ${error.message}`;
        if (error.message.includes('Failed to fetch')) {
            errorMessage = '❌ Không thể kết nối đến GitHub. Kiểm tra mạng internet.';
        }
        
        return {
            success: false,
            message: errorMessage,
            error: error.message
        };
    }
}

/**
 * Đồng bộ dữ liệu từ GitHub về local
 */
async function syncFromGitHub() {
    try {
        if (!githubSync.enabled || !githubSync.token || !githubSync.owner || !githubSync.repoName) {
            throw new Error('GitHub sync chưa được cấu hình. Vui lòng kiểm tra cài đặt.');
        }
        
        console.log('📥 Syncing from GitHub...');
        
        // 1. Đồng bộ các file dữ liệu từ thư mục data
        const stores = ['employees', 'inventory', 'operations'];
        let totalSynced = 0;
        
        for (const storeName of stores) {
            const filename = `${storeName}.json`;
            const filePath = `${githubSync.dataPath}/${filename}`;
            
            console.log(`📥 Downloading: ${filePath}`);
            
            const fileData = await downloadFromGitHub(filePath);
            
            if (fileData && Array.isArray(fileData)) {
                // Xóa dữ liệu cũ
                await dbClear(storeName);
                
                // Thêm dữ liệu mới
                for (const item of fileData) {
                    try {
                        // Đảm bảo có key path
                        let itemWithSync = {
                            ...item,
                            _synced: true,
                            _source: 'github',
                            _lastSync: new Date().toISOString()
                        };
                        
                        // Thêm id nếu là inventory và thiếu
                        if (storeName === 'inventory' && !itemWithSync.id) {
                            itemWithSync.id = 'inv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
                        }
                        
                        await dbAdd(storeName, itemWithSync);
                        totalSynced++;
                    } catch (addError) {
                        console.warn(`⚠️ Could not add item to ${storeName}:`, addError);
                    }
                }
                
                console.log(`✅ ${storeName}: ${fileData.length} records synced`);
            } else {
                console.log(`📭 No data found for ${storeName}`);
            }
        }
        
        // 2. Đồng bộ báo cáo (nếu có thư mục reports)
        const reportsPath = `${githubSync.dataPath}/reports`;
        const reportsData = await downloadFromGitHub(reportsPath);
        
        if (reportsData && Array.isArray(reportsData)) {
            for (const report of reportsData) {
                if (report.date) {
                    const reportId = report.date.replace(/-/g, '');
                    await dbUpdate('reports', reportId, {
                        ...report,
                        _synced: true,
                        _source: 'github',
                        _lastSync: new Date().toISOString()
                    });
                    totalSynced++;
                }
            }
            console.log(`✅ Reports: ${reportsData.length} records synced`);
        }
        
        // 3. Cập nhật metadata
        const syncTime = new Date().toISOString();
        localStorage.setItem('last_github_sync', syncTime);
        githubSync.lastSync = new Date(syncTime);
        
        console.log(`✅ Sync complete: ${totalSynced} records synced`);
        
        return {
            success: true,
            message: `✅ Đã đồng bộ ${totalSynced} bản ghi từ GitHub`,
            totalSynced: totalSynced
        };
        
    } catch (error) {
        console.error('❌ Sync from GitHub failed:', error);
        return {
            success: false,
            message: `❌ Lỗi đồng bộ: ${error.message}`
        };
    }
}

/**
 * Đồng bộ tất cả dữ liệu lên GitHub
 */
async function syncAllToGitHub() {
    try {
        if (!githubSync.enabled || !githubSync.token || !githubSync.owner || !githubSync.repoName) {
            throw new Error('GitHub sync chưa được cấu hình. Vui lòng kiểm tra cài đặt.');
        }
        
        console.log('☁️ Syncing all data to GitHub...');
        
        // 1. Đồng bộ các store dữ liệu
        const stores = ['employees', 'inventory', 'operations'];
        let totalSynced = 0;
        
        for (const storeName of stores) {
            const data = await dbGetAll(storeName);
            if (data.length > 0) {
                // Clean data (remove internal fields)
                const cleanData = data.map(item => {
                    const { _synced, _source, _lastSync, ...cleanItem } = item;
                    return cleanItem;
                });
                
                const filename = `${githubSync.dataPath}/${storeName}.json`;
                const success = await uploadToGitHub(filename, cleanData);
                
                if (success) {
                    totalSynced += data.length;
                    console.log(`✅ Uploaded ${storeName}: ${data.length} records`);
                }
            }
        }
        
        // 2. Đồng bộ báo cáo
        const reports = await dbGetAll('reports');
        if (reports.length > 0) {
            const cleanReports = reports.map(report => {
                const { _synced, _source, _lastSync, ...cleanReport } = report;
                return cleanReport;
            });
            
            const reportsFilename = `${githubSync.dataPath}/reports.json`;
            const success = await uploadToGitHub(reportsFilename, cleanReports);
            
            if (success) {
                totalSynced += reports.length;
                console.log(`✅ Uploaded reports: ${reports.length} records`);
            }
        }
        
        // 3. Tạo file metadata
        const metadata = {
            lastSync: new Date().toISOString(),
            deviceId: localStorage.getItem('device_id') || 'unknown',
            user: getCurrentUser()?.name || 'unknown',
            totalRecords: totalSynced,
            version: '1.0.0',
            app: 'Cafe Management System'
        };
        
        await uploadToGitHub(`${githubSync.dataPath}/metadata.json`, metadata);
        
        // 4. Cập nhật thời gian sync
        const syncTime = new Date().toISOString();
        localStorage.setItem('last_github_sync', syncTime);
        githubSync.lastSync = new Date(syncTime);
        
        console.log(`✅ Sync to GitHub complete: ${totalSynced} records uploaded`);
        
        return {
            success: true,
            message: `✅ Đã đồng bộ ${totalSynced} bản ghi lên GitHub`,
            totalSynced: totalSynced
        };
        
    } catch (error) {
        console.error('❌ Sync to GitHub failed:', error);
        return {
            success: false,
            message: `❌ Lỗi đồng bộ: ${error.message}`
        };
    }
}

/**
 * Đồng bộ một báo cáo đơn lẻ lên GitHub
 */
async function syncSingleReportToGitHub(report) {
    try {
        if (!githubSync.enabled || !report || !report.date) {
            return false;
        }
        
        // Đọc tất cả báo cáo hiện có
        const allReports = await dbGetAll('reports');
        const cleanReports = allReports.map(r => {
            const { _synced, _source, _lastSync, ...cleanR } = r;
            return cleanR;
        });
        
        // Upload toàn bộ file reports.json
        const filename = `${githubSync.dataPath}/reports.json`;
        const success = await uploadToGitHub(filename, cleanReports);
        
        if (success) {
            // Cập nhật trạng thái sync trong database
            await dbUpdate('reports', report.reportId, {
                _synced: true,
                _lastSync: new Date().toISOString()
            });
            
            console.log(`✅ Synced report: ${report.date}`);
            return true;
        }
        
        return false;
        
    } catch (error) {
        console.error(`❌ Error syncing report ${report?.date}:`, error);
        return false;
    }
}

/**
 * Upload dữ liệu lên GitHub
 */
async function uploadToGitHub(filename, content) {
    try {
        const apiUrl = `https://api.github.com/repos/${githubSync.owner}/${githubSync.repoName}/contents/${filename}`;
        
        // Kiểm tra file đã tồn tại chưa
        let sha = null;
        try {
            const existingResponse = await fetch(apiUrl + `?ref=${githubSync.branch}`, {
                headers: {
                    'Authorization': `token ${githubSync.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (existingResponse.ok) {
                const existingData = await existingResponse.json();
                sha = existingData.sha;
            }
        } catch (e) {
            // File không tồn tại, sẽ tạo mới
        }
        
        // Chuẩn bị nội dung base64
        const contentString = JSON.stringify(content, null, 2);
        const contentBase64 = btoa(unescape(encodeURIComponent(contentString)));
        
        // Tạo request body
        const body = {
            message: `Update ${filename} via Cafe Management App`,
            content: contentBase64,
            branch: githubSync.branch
        };
        
        if (sha) {
            body.sha = sha; // Cần SHA để update file đã tồn tại
        }
        
        // Upload lên GitHub
        const response = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${githubSync.token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        
        if (response.ok) {
            console.log(`✅ Uploaded to GitHub: ${filename}`);
            return true;
        } else {
            const errorText = await response.text();
            console.error(`❌ GitHub upload error for ${filename}:`, errorText);
            return false;
        }
        
    } catch (error) {
        console.error(`❌ Error uploading ${filename} to GitHub:`, error);
        return false;
    }
}

/**
 * Tải file từ GitHub
 */
async function downloadFromGitHub(filepath) {
    try {
        const apiUrl = `https://api.github.com/repos/${githubSync.owner}/${githubSync.repoName}/contents/${filepath}?ref=${githubSync.branch}`;
        
        console.log(`📥 Downloading from: ${apiUrl}`);
        
        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `token ${githubSync.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.content && data.encoding === 'base64') {
                try {
                    const decodedContent = decodeURIComponent(atob(data.content));
                    return JSON.parse(decodedContent);
                } catch (parseError) {
                    console.error('❌ Error parsing JSON:', parseError);
                    return null;
                }
            }
        } else if (response.status === 404) {
            console.log(`📭 File not found: ${filepath}`);
            return null;
        }
        
        return null;
        
    } catch (error) {
        console.error(`❌ Error downloading ${filepath} from GitHub:`, error);
        return null;
    }
}

// =========================================================
// 5. UTILITY FUNCTIONS
// =========================================================

function showMessage(message, type = 'info') {
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
    } else {
        alert(`${type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️'} ${message}`);
    }
}

function getCurrentUser() {
    try {
        const userData = localStorage.getItem('currentUser');
        return userData ? JSON.parse(userData) : null;
    } catch (error) {
        return null;
    }
}

function isAdmin() {
    const user = getCurrentUser();
    return user && user.role === 'admin';
}

// =========================================================
// 6. EXPOSE TO WINDOW
// =========================================================

if (typeof window !== 'undefined') {
    // Database functions
    window.initializeDatabase = initializeDatabase;
    window.dbAdd = dbAdd;
    window.dbGet = dbGet;
    window.dbUpdate = dbUpdate;
    window.dbDelete = dbDelete;
    window.dbGetAll = dbGetAll;
    window.dbClear = dbClear;
    
    // Business functions
    window.addReport = addReport;
    window.updateReport = updateReport;
    window.addEmployee = addEmployee;
    window.updateEmployee = updateEmployee;
    window.getAllEmployees = async () => dbGetAll('employees');
    window.getAllInventory = async () => dbGetAll('inventory');
    
    // GitHub sync functions
    window.testGitHubConnection = testGitHubConnection;
    window.syncFromGitHub = syncFromGitHub;
    window.syncAllToGitHub = syncAllToGitHub;
    window.syncSingleReportToGitHub = syncSingleReportToGitHub;
    window.downloadFromGitHub = downloadFromGitHub;
    window.uploadToGitHub = uploadToGitHub;
    
    window.githubSync = githubSync;
    
    console.log('✅ Database system with GitHub sync loaded for Datkep92/milano');
}
