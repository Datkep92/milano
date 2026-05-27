// firebase-manager-simple.js - Firebase Manager đã được sửa cấu trúc
class FirebaseManager {
    constructor() {
        this.initialized = false;
        this.db = null;
        this.auth = null;
        this.realtimeListeners = {};
        
        // Đợi DOM ready mới init để tránh lỗi timing
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            setTimeout(() => this.init(), 100);
        }
    }
    
    async init() {
        if (this.initialized) return true;
        
        try {
            console.log('🔄 FirebaseManager initializing...');
            
            // Wait for firebase to be loaded from index.html
            await this.waitForFirebase();
            
            // Lấy từ window.firebaseApp (đã sửa trong index.html)
            this.db = window.firebaseApp?.db || null;
            this.auth = window.firebaseApp?.auth || null;
            
            if (!this.db) {
                throw new Error('Firebase database not available');
            }
            
            this.initialized = true;
            console.log('✅ FirebaseManager initialized successfully');
            return true;
            
        } catch (error) {
            console.error('❌ FirebaseManager init error:', error);
            
            // Tạo fallback object để app vẫn chạy offline
            this.createFallbackAPI();
            return false;
        }
    }
    
    waitForFirebase() {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const maxWait = 7000; // 7 seconds
            
            // Kiểm tra xem Firebase đã sẵn sàng chưa
            const checkFirebase = () => {
                if (window.firebaseApp && window.firebaseApp.db) {
                    resolve(true);
                    return true;
                }
                
                if (Date.now() - startTime > maxWait) {
                    reject(new Error('Firebase initialization timeout'));
                    return false;
                }
                
                return false;
            };
            
            // Kiểm tra ngay lập tức
            if (checkFirebase()) return;
            
            // Đợi sự kiện firebaseReady
            const onFirebaseReady = () => {
                if (checkFirebase()) {
                    window.removeEventListener('firebaseReady', onFirebaseReady);
                    clearTimeout(timeoutId);
                }
            };
            
            window.addEventListener('firebaseReady', onFirebaseReady);
            
            // Hoặc poll mỗi 200ms
            const intervalId = setInterval(() => {
                if (checkFirebase()) {
                    clearInterval(intervalId);
                    window.removeEventListener('firebaseReady', onFirebaseReady);
                    clearTimeout(timeoutId);
                }
            }, 200);
            
            const timeoutId = setTimeout(() => {
                clearInterval(intervalId);
                window.removeEventListener('firebaseReady', onFirebaseReady);
                reject(new Error('Firebase timeout'));
            }, maxWait);
        });
    }
    
    // ========== DATABASE OPERATIONS ==========
    
    async getData(path) {
        if (!this.db || !this.initialized) {
            console.warn(`📴 Firebase offline - Cannot get ${path}`);
            return null;
        }
        
        try {
            const { ref, get } = window.firebaseApp.database;
            const dbRef = ref(this.db, path);
            const snapshot = await get(dbRef);
            
            return snapshot.exists() ? snapshot.val() : null;
            
        } catch (error) {
            console.error(`❌ Error getting data from ${path}:`, error);
            throw error;
        }
    }
    
    async setData(path, data) {
        if (!this.db || !this.initialized) {
            console.warn(`📴 Firebase offline - Cannot set ${path}`);
            throw new Error('Firebase offline');
        }
        
        try {
            const { ref, set } = window.firebaseApp.database;
            const dbRef = ref(this.db, path);
            
            // Thêm metadata đơn giản
            const dataWithMeta = {
                ...data,
                _updatedAt: Date.now(),
                _updatedBy: 'web'
            };
            
            await set(dbRef, dataWithMeta);
            console.log(`✅ Data set to ${path}`);
            return true;
            
        } catch (error) {
            console.error(`❌ Error setting data to ${path}:`, error);
            throw error;
        }
    }
    
    async updateData(path, updates) {
        if (!this.db || !this.initialized) {
            console.warn(`📴 Firebase offline - Cannot update ${path}`);
            throw new Error('Firebase offline');
        }
        
        try {
            const { ref, update } = window.firebaseApp.database;
            const dbRef = ref(this.db, path);
            
            // Thêm timestamp
            const updatesWithTime = {
                ...updates,
                '_updatedAt': Date.now()
            };
            
            await update(dbRef, updatesWithTime);
            console.log(`✅ Data updated at ${path}`);
            return true;
            
        } catch (error) {
            console.error(`❌ Error updating data at ${path}:`, error);
            throw error;
        }
    }
    
    async deleteData(path) {
        if (!this.db || !this.initialized) {
            console.warn(`📴 Firebase offline - Cannot delete ${path}`);
            throw new Error('Firebase offline');
        }
        
        try {
            const { ref, remove } = window.firebaseApp.database;
            const dbRef = ref(this.db, path);
            await remove(dbRef);
            
            console.log(`✅ Data deleted from ${path}`);
            return true;
            
        } catch (error) {
            console.error(`❌ Error deleting data from ${path}:`, error);
            throw error;
        }
    }
    
    // ========== REAL-TIME LISTENERS ==========
    
    listenToData(path, callback) {
        if (!this.db || !this.initialized) {
            console.warn(`📴 Firebase offline - Cannot listen to ${path}`);
            return () => {}; // Return empty unsubscribe function
        }
        
        try {
            const { ref, onValue } = window.firebaseApp.database;
            const dbRef = ref(this.db, path);
            
            const unsubscribe = onValue(dbRef, (snapshot) => {
                callback(snapshot.val());
            });
            
            // Store for cleanup
            this.realtimeListeners[path] = unsubscribe;
            
            return unsubscribe;
            
        } catch (error) {
            console.error(`❌ Error listening to ${path}:`, error);
            return () => {};
        }
    }
    
    // ========== FILE PATH HELPERS ==========
    
    getReportPath(date = null) {
        if (date) {
            const dateKey = this.formatDateForFirebase(date);
            return `reports/${dateKey}`;
        }
        return 'reports';
    }
    
    getInventoryPath(type = 'products', date = null) {
        if (date && (type === 'purchases' || type === 'services')) {
            const dateKey = this.formatDateForFirebase(date);
            return `inventory/${type}/${dateKey}`;
        }
        return `inventory/${type}`;
    }
    
    getEmployeePath(id = null) {
        if (id) {
            return `employees/${id}`;
        }
        return 'employees';
    }
    
    formatDateForFirebase(dateStr) {
        // Convert dd/mm/yyyy to yyyy-mm-dd
        try {
            const [day, month, year] = dateStr.split('/');
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        } catch (error) {
            console.error('Error formatting date:', error);
            // Return as-is nếu không parse được
            return dateStr.replace(/\//g, '-');
        }
    }
    
    formatDateFromFirebase(dateKey) {
        // Convert yyyy-mm-dd to dd/mm/yyyy
        try {
            const [year, month, day] = dateKey.split('-');
            return `${day}/${month}/${year}`;
        } catch (error) {
            console.error('Error formatting date from Firebase:', error);
            return dateKey;
        }
    }
    
    // ========== SYNC STATUS ==========
    
    async getConnectionStatus() {
        if (!this.db || !this.initialized) {
            return false;
        }
        
        try {
            const { ref, onValue } = window.firebaseApp.database;
            const connectedRef = ref(this.db, '.info/connected');
            
            return new Promise((resolve) => {
                const unsubscribe = onValue(connectedRef, (snapshot) => {
                    resolve(snapshot.val() === true);
                    unsubscribe();
                });
            });
        } catch (error) {
            console.error('Error checking connection:', error);
            return false;
        }
    }
    
    // ========== FALLBACK FOR OFFLINE MODE ==========
    
    createFallbackAPI() {
        console.log('📴 Creating Firebase fallback API for offline mode');
        
        // Tạo các hàm no-op để app không bị crash
        this.getData = async () => null;
        this.setData = async () => { throw new Error('Firebase offline'); };
        this.updateData = async () => { throw new Error('Firebase offline'); };
        this.deleteData = async () => { throw new Error('Firebase offline'); };
        this.listenToData = () => () => {};
        this.getConnectionStatus = async () => false;
        
        this.initialized = true; // Đánh dấu đã init để không retry
    }
    
    // ========== CLEANUP ==========
    
    cleanup() {
        // Remove all listeners
        Object.keys(this.realtimeListeners).forEach(path => {
            try {
                const unsubscribe = this.realtimeListeners[path];
                if (typeof unsubscribe === 'function') {
                    unsubscribe();
                }
            } catch (error) {
                console.warn(`Error cleaning up listener for ${path}:`, error);
            }
        });
        
        this.realtimeListeners = {};
        console.log('🧹 FirebaseManager cleaned up');
    }
    
    // ========== PUBLIC API ==========
    
    isAvailable() {
        return this.initialized && this.db !== null;
    }
    
    getDB() {
        return this.db;
    }
}

// Khởi tạo FirebaseManager
window.githubManager = new FirebaseManager();