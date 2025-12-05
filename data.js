// data.js - Xử lý lưu trữ dữ liệu cục bộ và DBIndex

class DataManager {
    constructor() {
        this.dbName = 'SalesManagementDB';
        this.dbVersion = 14;
        this.db = null;
        this.currentDate = new Date().toISOString().split('T')[0];
        this.initDB();
    }

    // Khởi tạo IndexedDB
    initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = (event) => {
                console.error('Lỗi mở IndexedDB:', event.target.error);
                reject(event.target.error);
            };
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('IndexedDB khởi tạo thành công');
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Tạo store cho báo cáo
                if (!db.objectStoreNames.contains('reports')) {
                    const reportsStore = db.createObjectStore('reports', { keyPath: 'id', autoIncrement: true });
                    reportsStore.createIndex('date', 'date', { unique: false });
                    reportsStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
                
                // Tạo store cho nhân viên
                if (!db.objectStoreNames.contains('employees')) {
                    const employeesStore = db.createObjectStore('employees', { keyPath: 'id', autoIncrement: true });
                    employeesStore.createIndex('name', 'name', { unique: false });
                }
                
                // Tạo store cho sản phẩm
                if (!db.objectStoreNames.contains('products')) {
                    const productsStore = db.createObjectStore('products', { keyPath: 'id', autoIncrement: true });
                    productsStore.createIndex('name', 'name', { unique: true });
                }
                
                // Tạo store cho chi phí mẫu
                if (!db.objectStoreNames.contains('expenseTemplates')) {
                    const expenseStore = db.createObjectStore('expenseTemplates', { keyPath: 'id', autoIncrement: true });
                    expenseStore.createIndex('name', 'name', { unique: true });
                }
                
                // Tạo store cho chuyển khoản mẫu
                if (!db.objectStoreNames.contains('transferTemplates')) {
                    const transferStore = db.createObjectStore('transferTemplates', { keyPath: 'id', autoIncrement: true });
                    transferStore.createIndex('name', 'name', { unique: true });
                }
                
                // Tạo store cho cài đặt
                if (!db.objectStoreNames.contains('settings')) {
                    const settingsStore = db.createObjectStore('settings', { keyPath: 'key' });
                }
                
                console.log('Cấu trúc IndexedDB đã được tạo');
            };
        });
    }

    // Lưu báo cáo
    async saveReport(reportData) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database chưa được khởi tạo'));
                return;
            }
            
            const transaction = this.db.transaction(['reports'], 'readwrite');
            const store = transaction.objectStore('reports');
            
            // Kiểm tra xem đã có báo cáo cho ngày này chưa
            const dateIndex = store.index('date');
            const dateRequest = dateIndex.getAll(reportData.date);
            
            dateRequest.onsuccess = () => {
                const existingReports = dateRequest.result;
                
                // Nếu đã có báo cáo cho ngày này, cập nhật thay vì thêm mới
                if (existingReports.length > 0) {
                    // Tìm báo cáo có cùng timestamp gần nhất
                    const latestReport = existingReports.reduce((prev, current) => {
                        return (prev.timestamp > current.timestamp) ? prev : current;
                    });
                    
                    // Tạo báo cáo mới với trạng thái đã sửa
                    const updatedReport = {
                        ...reportData,
                        id: latestReport.id,
                        previousVersion: latestReport.id,
                        edited: true,
                        editCount: (latestReport.editCount || 0) + 1,
                        lastEdited: new Date().toISOString()
                    };
                    
                    const updateRequest = store.put(updatedReport);
                    
                    updateRequest.onsuccess = () => {
                        console.log('Báo cáo đã được cập nhật:', updatedReport);
                        resolve(updatedReport);
                    };
                    
                    updateRequest.onerror = (event) => {
                        reject(new Error('Lỗi cập nhật báo cáo: ' + event.target.error));
                    };
                } else {
                    // Thêm báo cáo mới
                    reportData.timestamp = new Date().toISOString();
                    reportData.edited = false;
                    reportData.editCount = 0;
                    
                    const addRequest = store.add(reportData);
                    
                    addRequest.onsuccess = () => {
                        console.log('Báo cáo mới đã được lưu:', reportData);
                        resolve({...reportData, id: addRequest.result});
                    };
                    
                    addRequest.onerror = (event) => {
                        reject(new Error('Lỗi lưu báo cáo: ' + event.target.error));
                    };
                }
            };
            
            dateRequest.onerror = (event) => {
                reject(new Error('Lỗi kiểm tra báo cáo: ' + event.target.error));
            };
        });
    }

    // Lấy tất cả báo cáo
    async getAllReports() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database chưa được khởi tạo'));
                return;
            }
            
            const transaction = this.db.transaction(['reports'], 'readonly');
            const store = transaction.objectStore('reports');
            const request = store.getAll();
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = (event) => {
                reject(new Error('Lỗi lấy báo cáo: ' + event.target.error));
            };
        });
    }

    // Lấy báo cáo theo ngày
    async getReportsByDate(date) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database chưa được khởi tạo'));
                return;
            }
            
            const transaction = this.db.transaction(['reports'], 'readonly');
            const store = transaction.objectStore('reports');
            const dateIndex = store.index('date');
            const request = dateIndex.getAll(date);
            
            request.onsuccess = () => {
                // Sắp xếp theo thời gian mới nhất trước
                const reports = request.result.sort((a, b) => {
                    return new Date(b.timestamp) - new Date(a.timestamp);
                });
                resolve(reports);
            };
            
            request.onerror = (event) => {
                reject(new Error('Lỗi lấy báo cáo theo ngày: ' + event.target.error));
            };
        });
    }

    // Lấy báo cáo cuối cùng của ngày trước đó
    async getPreviousDayReport(date) {
        const currentDate = new Date(date);
        currentDate.setDate(currentDate.getDate() - 1);
        const previousDate = currentDate.toISOString().split('T')[0];
        
        const reports = await this.getReportsByDate(previousDate);
        
        if (reports.length > 0) {
            // Trả về báo cáo mới nhất của ngày trước
            return reports[0];
        }
        
        return null;
    }

    // Lưu danh sách sản phẩm
    async saveProducts(products) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database chưa được khởi tạo'));
                return;
            }
            
            const transaction = this.db.transaction(['products'], 'readwrite');
            const store = transaction.objectStore('products');
            
            // Xóa tất cả sản phẩm cũ
            const clearRequest = store.clear();
            
            clearRequest.onsuccess = () => {
                // Thêm sản phẩm mới
                const addPromises = products.map(product => {
                    return new Promise((resolveAdd, rejectAdd) => {
                        const addRequest = store.add(product);
                        
                        addRequest.onsuccess = () => {
                            resolveAdd();
                        };
                        
                        addRequest.onerror = (event) => {
                            rejectAdd(new Error('Lỗi lưu sản phẩm: ' + event.target.error));
                        };
                    });
                });
                
                Promise.all(addPromises)
                    .then(() => {
                        console.log('Đã lưu', products.length, 'sản phẩm');
                        resolve(products);
                    })
                    .catch(error => {
                        reject(error);
                    });
            };
            
            clearRequest.onerror = (event) => {
                reject(new Error('Lỗi xóa sản phẩm cũ: ' + event.target.error));
            };
        });
    }

    // Lấy tất cả sản phẩm
    async getAllProducts() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database chưa được khởi tạo'));
                return;
            }
            
            const transaction = this.db.transaction(['products'], 'readonly');
            const store = transaction.objectStore('products');
            const request = store.getAll();
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = (event) => {
                reject(new Error('Lỗi lấy sản phẩm: ' + event.target.error));
            };
        });
    }

    // Cập nhật số lượng tồn kho của sản phẩm
    async updateProductStock(productId, quantityChange) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database chưa được khởi tạo'));
                return;
            }
            
            const transaction = this.db.transaction(['products'], 'readwrite');
            const store = transaction.objectStore('products');
            
            const getRequest = store.get(productId);
            
            getRequest.onsuccess = () => {
                const product = getRequest.result;
                
                if (product) {
                    product.stock = (product.stock || 0) + quantityChange;
                    
                    const updateRequest = store.put(product);
                    
                    updateRequest.onsuccess = () => {
                        console.log('Đã cập nhật tồn kho sản phẩm:', product.name, 'Số lượng mới:', product.stock);
                        resolve(product);
                    };
                    
                    updateRequest.onerror = (event) => {
                        reject(new Error('Lỗi cập nhật sản phẩm: ' + event.target.error));
                    };
                } else {
                    reject(new Error('Không tìm thấy sản phẩm với ID: ' + productId));
                }
            };
            
            getRequest.onerror = (event) => {
                reject(new Error('Lỗi lấy sản phẩm: ' + event.target.error));
            };
        });
    }

    // Lưu mẫu chi phí
    async saveExpenseTemplate(name) {
        return this.saveTemplate('expenseTemplates', name);
    }

    // Lưu mẫu chuyển khoản
    async saveTransferTemplate(name) {
        return this.saveTemplate('transferTemplates', name);
    }

    // Lưu mẫu chung
    async saveTemplate(storeName, name) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database chưa được khởi tạo'));
                return;
            }
            
            if (!name || name.trim() === '') {
                reject(new Error('Tên không được để trống'));
                return;
            }
            
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            // Kiểm tra xem đã tồn tại chưa
            const index = store.index('name');
            const getRequest = index.get(name.trim());
            
            getRequest.onsuccess = () => {
                if (getRequest.result) {
                    // Đã tồn tại
                    resolve(getRequest.result);
                } else {
                    // Thêm mới
                    const template = {
                        name: name.trim(),
                        createdAt: new Date().toISOString()
                    };
                    
                    const addRequest = store.add(template);
                    
                    addRequest.onsuccess = () => {
                        resolve({...template, id: addRequest.result});
                    };
                    
                    addRequest.onerror = (event) => {
                        reject(new Error('Lỗi lưu mẫu: ' + event.target.error));
                    };
                }
            };
            
            getRequest.onerror = (event) => {
                reject(new Error('Lỗi kiểm tra mẫu: ' + event.target.error));
            };
        });
    }

    // Lấy tất cả mẫu chi phí
    async getExpenseTemplates() {
        return this.getTemplates('expenseTemplates');
    }

    // Lấy tất cả mẫu chuyển khoản
    async getTransferTemplates() {
        return this.getTemplates('transferTemplates');
    }

    // Lấy mẫu chung
    async getTemplates(storeName) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database chưa được khởi tạo'));
                return;
            }
            
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = (event) => {
                reject(new Error('Lỗi lấy mẫu: ' + event.target.error));
            };
        });
    }

    // Lưu cài đặt
    async saveSetting(key, value) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database chưa được khởi tạo'));
                return;
            }
            
            const transaction = this.db.transaction(['settings'], 'readwrite');
            const store = transaction.objectStore('settings');
            
            const setting = {
                key: key,
                value: value,
                updatedAt: new Date().toISOString()
            };
            
            const request = store.put(setting);
            
            request.onsuccess = () => {
                resolve(setting);
            };
            
            request.onerror = (event) => {
                reject(new Error('Lỗi lưu cài đặt: ' + event.target.error));
            };
        });
    }

    // Lấy cài đặt
    async getSetting(key) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database chưa được khởi tạo'));
                return;
            }
            
            const transaction = this.db.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');
            
            const request = store.get(key);
            
            request.onsuccess = () => {
                if (request.result) {
                    resolve(request.result.value);
                } else {
                    resolve(null);
                }
            };
            
            request.onerror = (event) => {
                reject(new Error('Lỗi lấy cài đặt: ' + event.target.error));
            };
        });
    }

    // Lấy tất cả dữ liệu để xuất
    async exportAllData() {
        const [
            reports,
            products,
            employees,
            expenseTemplates,
            transferTemplates,
            settings
        ] = await Promise.all([
            this.getAllReports(),
            this.getAllProducts(),
            this.getAllEmployees(),
            this.getExpenseTemplates(),
            this.getTransferTemplates(),
            this.getAllSettings()
        ]);
        
        return {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            data: {
                reports,
                products,
                employees,
                expenseTemplates,
                transferTemplates,
                settings
            }
        };
    }

    // Nhập dữ liệu
    async importData(data) {
        try {
            // Kiểm tra cấu trúc dữ liệu
            if (!data || !data.data) {
                throw new Error('Dữ liệu không hợp lệ');
            }
            
            const { reports, products } = data.data;
            
            // Lưu sản phẩm
            if (products && Array.isArray(products)) {
                await this.saveProducts(products);
            }
            
            // Lưu báo cáo
            if (reports && Array.isArray(reports)) {
                for (const report of reports) {
                    await this.saveReport(report);
                }
            }
            
            return true;
        } catch (error) {
            console.error('Lỗi nhập dữ liệu:', error);
            throw error;
        }
    }

    // Xóa toàn bộ dữ liệu
    async clearAllData() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database chưa được khởi tạo'));
                return;
            }
            
            const transaction = this.db.transaction(
                ['reports', 'products', 'employees', 'expenseTemplates', 'transferTemplates', 'settings'],
                'readwrite'
            );
            
            const stores = [
                transaction.objectStore('reports'),
                transaction.objectStore('products'),
                transaction.objectStore('employees'),
                transaction.objectStore('expenseTemplates'),
                transaction.objectStore('transferTemplates'),
                transaction.objectStore('settings')
            ];
            
            const clearPromises = stores.map(store => {
                return new Promise((resolveClear, rejectClear) => {
                    const request = store.clear();
                    
                    request.onsuccess = () => {
                        resolveClear();
                    };
                    
                    request.onerror = (event) => {
                        rejectClear(new Error('Lỗi xóa dữ liệu: ' + event.target.error));
                    };
                });
            });
            
            Promise.all(clearPromises)
                .then(() => {
                    console.log('Đã xóa toàn bộ dữ liệu');
                    resolve(true);
                })
                .catch(error => {
                    reject(error);
                });
        });
    }

    // Lấy tất cả nhân viên
    async getAllEmployees() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database chưa được khởi tạo'));
                return;
            }
            
            const transaction = this.db.transaction(['employees'], 'readonly');
            const store = transaction.objectStore('employees');
            const request = store.getAll();
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = (event) => {
                reject(new Error('Lỗi lấy nhân viên: ' + event.target.error));
            };
        });
    }

    // Lưu nhân viên
    async saveEmployee(employeeData) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database chưa được khởi tạo'));
                return;
            }
            
            const transaction = this.db.transaction(['employees'], 'readwrite');
            const store = transaction.objectStore('employees');
            
            employeeData.createdAt = new Date().toISOString();
            
            const request = store.add(employeeData);
            
            request.onsuccess = () => {
                resolve({...employeeData, id: request.result});
            };
            
            request.onerror = (event) => {
                reject(new Error('Lỗi lưu nhân viên: ' + event.target.error));
            };
        });
    }

    // Lấy tất cả cài đặt
    async getAllSettings() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database chưa được khởi tạo'));
                return;
            }
            
            const transaction = this.db.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');
            const request = store.getAll();
            
            request.onsuccess = () => {
                const settings = {};
                request.result.forEach(setting => {
                    settings[setting.key] = setting.value;
                });
                resolve(settings);
            };
            
            request.onerror = (event) => {
                reject(new Error('Lỗi lấy cài đặt: ' + event.target.error));
            };
        });
    }
}

// Khởi tạo DataManager toàn cục
const dataManager = new DataManager();

// Tạo dữ liệu mẫu nếu cần
async function initializeSampleData() {
    try {
        const products = await dataManager.getAllProducts();
        
        if (products.length === 0) {
            const sampleProducts = [
                { name: 'Cà phê đen', price: 15000, stock: 100 },
                { name: 'Cà phê sữa', price: 20000, stock: 80 },
                { name: 'Trà đào', price: 25000, stock: 50 },
                { name: 'Trà sữa trân châu', price: 30000, stock: 60 },
                { name: 'Nước cam', price: 22000, stock: 40 },
                { name: 'Sinh tố bơ', price: 35000, stock: 30 }
            ];
            
            await dataManager.saveProducts(sampleProducts);
            console.log('Đã tạo dữ liệu sản phẩm mẫu');
        }
        
        // Thêm mẫu chi phí
        const expenseTemplates = await dataManager.getExpenseTemplates();
        if (expenseTemplates.length === 0) {
            const sampleExpenses = ['Tiền điện', 'Tiền nước', 'Tiền thuê mặt bằng', 'Tiền mua nguyên liệu', 'Lương nhân viên'];
            
            for (const expense of sampleExpenses) {
                await dataManager.saveExpenseTemplate(expense);
            }
        }
        
        // Thêm mẫu chuyển khoản
        const transferTemplates = await dataManager.getTransferTemplates();
        if (transferTemplates.length === 0) {
            const sampleTransfers = ['Chuyển khoản ngân hàng', 'Chuyển tiền cho chủ', 'Chuyển tiền mua hàng'];
            
            for (const transfer of sampleTransfers) {
                await dataManager.saveTransferTemplate(transfer);
            }
        }
    } catch (error) {
        console.error('Lỗi khởi tạo dữ liệu mẫu:', error);
    }
}

// Gọi hàm khởi tạo dữ liệu mẫu khi trang tải xong
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        initializeSampleData();
    }, 1000);

});
