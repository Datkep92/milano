// inventory.js - Module kho hàng với lưu trữ theo ngày - OPTIMIZED VERSION
class InventoryModule {
    constructor() {
        this.currentDate = this.formatDateForStorage(new Date());
        this.currentDateDisplay = this.formatDateForDisplay(new Date());
        this.purchases = [];
        this.services = [];
        this.isLoading = false;
        this.initialLoadCompleted = false; // Flag để biết đã load từ GitHub chưa
        this.cache = {
            lastGitHubSync: null,
            products: null,
            purchasesByDate: {},
            servicesByDate: {}
        };
    }
    showAddProductModal() {
        const modalContent = `
            <div class="modal-header">
                <h2><i class="fas fa-plus"></i> THÊM SẢN PHẨM</h2>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Tên sản phẩm:</label>
                    <input type="text" id="productName" placeholder="Cà phê hạt Brazil...">
                </div>
                
                <div class="form-group">
                    <label>Đơn vị:</label>
                    <select id="productUnit">
                        <option value="kg">kg</option>
                        <option value="gói">gói</option>
                        <option value="lít">lít</option>
                        <option value="cái">cái</option>
                        <option value="thùng">thùng</option>
                    </select>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Số lượng:</label>
                        <input type="number" id="productQuantity" placeholder="0" min="0" step="0.01">
                    </div>
                    <div class="form-group">
                        <label>Giá trị:</label>
                        <div class="input-group">
                            <input type="text" id="productValue" placeholder="0" oninput="window.inventoryModule.formatCurrency(this)">
                            <span class="currency">₫</span>
                        </div>
                    </div>
                </div>
                
                <button class="btn-primary" onclick="window.inventoryModule.addProduct()">
                    <i class="fas fa-save"></i> 💾 THÊM SẢN PHẨM
                </button>
                
                <button class="btn-secondary" onclick="closeModal()">
                    ĐÓNG
                </button>
            </div>
        `;
        
        window.showModal(modalContent);
    }
    formatDateForStorage(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    formatDateForDisplay(date) {
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    }
    editProduct(index) {
        const products = window.dataManager.getInventoryProducts();
        if (index >= products.length) return;
        
        const product = products[index];
        
        const modalContent = `
            <div class="modal-header">
                <h2><i class="fas fa-edit"></i> SỬA SẢN PHẨM</h2>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Tên sản phẩm:</label>
                    <input type="text" id="editProductName" value="${product.name}">
                </div>
                
                <div class="form-group">
                    <label>Đơn vị:</label>
                    <select id="editProductUnit">
                        <option value="kg" ${product.unit === 'kg' ? 'selected' : ''}>kg</option>
                        <option value="gói" ${product.unit === 'gói' ? 'selected' : ''}>gói</option>
                        <option value="lít" ${product.unit === 'lít' ? 'selected' : ''}>lít</option>
                        <option value="cái" ${product.unit === 'cái' ? 'selected' : ''}>cái</option>
                        <option value="thùng" ${product.unit === 'thùng' ? 'selected' : ''}>thùng</option>
                    </select>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Số lượng:</label>
                        <input type="number" id="editProductQuantity" value="${product.quantity}" min="0" step="0.01">
                    </div>
                    <div class="form-group">
                        <label>Giá trị:</label>
                        <div class="input-group">
                            <input type="text" id="editProductValue" value="${product.totalValue || 0}" oninput="window.inventoryModule.formatCurrency(this)">
                            <span class="currency">₫</span>
                        </div>
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Ghi chú:</label>
                    <textarea id="editProductNote" placeholder="Ghi chú thêm..." rows="2">${product.note || ''}</textarea>
                </div>
                
                <div class="button-group">
                    <button class="btn-primary" onclick="window.inventoryModule.updateProduct(${index})">
                        <i class="fas fa-save"></i> 💾 CẬP NHẬT
                    </button>
                    <button class="btn-danger" onclick="window.inventoryModule.deleteProduct(${index})">
                        <i class="fas fa-trash"></i> XÓA
                    </button>
                    <button class="btn-secondary" onclick="closeModal()">
                        ĐÓNG
                    </button>
                </div>
            </div>
        `;
        
        window.showModal(modalContent);
    }
    async render() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        const mainContent = document.getElementById('mainContent');
        
        try {
            // CHỈ LOAD TỪ GITHUB KHI VÀO TRANG LẦN ĐẦU
            if (!this.initialLoadCompleted) {
                mainContent.innerHTML = `
                    <div class="loading">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>Đang tải dữ liệu kho từ GitHub...</p>
                    </div>
                `;
                
                await this.initialLoadFromGitHub();
                this.initialLoadCompleted = true;
            }
            
            // Lấy dữ liệu cho ngày hiện tại từ cache
            await this.loadDataForDateFromCache(this.currentDate);
            
            const products = window.dataManager.getInventoryProducts();
            const totalValue = products.reduce((sum, p) => sum + (p.totalValue || 0), 0);
            
            mainContent.innerHTML = `
                <div class="inventory-container">
                    <div class="inventory-header">
                        <h1><i class="fas fa-boxes"></i> TỒN KHO</h1>
                        <div class="date-picker">
                            <input type="date" id="inventoryDate" value="${this.currentDate}">
                            <button onclick="window.inventoryModule.changeDate()"><i class="fas fa-calendar-alt"></i></button>
                        </div>
                    </div>
                    
                    <div class="inventory-total-card">
                        <div class="total-label">Tổng giá trị tồn kho</div>
                        <div class="total-value">${totalValue.toLocaleString()} ₫</div>
                        <small>(${products.length} sản phẩm)</small>
                    </div>
                    
                    <div class="action-buttons">
                        <button class="btn-primary" onclick="window.inventoryModule.showPurchaseModal()">
                            <i class="fas fa-shopping-cart"></i> MUA HÀNG HÓA
                        </button>
                        <button class="btn-secondary" onclick="window.inventoryModule.showServiceModal()">
                            <i class="fas fa-concierge-bell"></i> DỊCH VỤ/CHI PHÍ
                        </button>
                    </div>
                    
                    <div class="inventory-list">
                        <div class="list-header">
                            <span># TÊN SẢN PHẨM</span>
                            <span>SL</span>
                            <span>THÀNH TIỀN</span>
                            <span>THAO TÁC</span>
                        </div>
                        
                        ${products.map((product, index) => `
                            <div class="list-item">
                                <div class="item-product">
                                    <strong>${product.name}</strong>
                                    <small>${product.unit}</small>
                                </div>
                                <div class="item-quantity">${product.quantity}</div>
                                <div class="item-value">${(product.totalValue || 0).toLocaleString()} ₫</div>
                                <div class="item-actions">
                                    <button class="btn-icon" onclick="window.inventoryModule.showProductHistory(${index})">
                                        <i class="fas fa-history"></i>
                                    </button>
                                    <button class="btn-icon" onclick="window.inventoryModule.editProduct(${index})">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                        
                        ${products.length === 0 ? `
                            <div class="empty-state">
                                <i class="fas fa-box-open"></i>
                                <p>Chưa có sản phẩm trong kho</p>
                                <button class="btn-secondary" onclick="window.inventoryModule.showAddProductModal()">
                                    <i class="fas fa-plus"></i> Thêm sản phẩm đầu tiên
                                </button>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="action-card" onclick="window.inventoryModule.togglePurchases()">
                        <i class="fas fa-history"></i>
                        <span>📜 MUA HÀNG NGÀY ${this.currentDateDisplay}</span>
                        <i class="fas fa-chevron-down" id="purchasesToggle"></i>
                    </div>
                    
                    <div id="purchasesSection" class="collapsible-section" style="display: none;">
                        <!-- Purchases sẽ được render riêng -->
                    </div>
                    
                    <div class="action-card" onclick="window.inventoryModule.toggleServices()">
                        <i class="fas fa-history"></i>
                        <span>📝 DỊCH VỤ NGÀY ${this.currentDateDisplay}</span>
                        <i class="fas fa-chevron-down" id="servicesToggle"></i>
                    </div>
                    
                    <div id="servicesSection" class="collapsible-section" style="display: none;">
                        <!-- Services sẽ được render riêng -->
                    </div>
                    
                    <div class="action-card" onclick="window.inventoryModule.toggleStats()">
                        <i class="fas fa-chart-bar"></i>
                        <span>📈 THỐNG KÊ XUẤT NHẬP</span>
                        <i class="fas fa-chevron-down" id="statsToggle"></i>
                    </div>
                    
                    <div id="statsSection" class="collapsible-section" style="display: none;">
                        <!-- Thống kê sẽ được render riêng -->
                    </div>
                </div>
            `;
            
            // Thêm button force sync cho dev
            if (localStorage.getItem('debug_mode') === 'true') {
                mainContent.innerHTML += `
                    <div style="margin-top: 20px; text-align: center;">
                        <button class="btn-secondary" onclick="window.inventoryModule.forceGitHubSync()" style="font-size: 12px;">
                            <i class="fas fa-sync-alt"></i> Force GitHub Sync
                        </button>
                    </div>
                `;
            }
            
        } catch (error) {
            console.error('Error rendering inventory:', error);
            mainContent.innerHTML = `
                <div class="error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Lỗi khi tải dữ liệu kho: ${error.message}</p>
                    <button onclick="window.inventoryModule.render()">Thử lại</button>
                </div>
            `;
        } finally {
            this.isLoading = false;
        }
    }
    
    // CHỈ GỌI KHI VÀO TRANG LẦN ĐẦU HOẶC F5
    async initialLoadFromGitHub() {
        console.log('🚀 Initial load from GitHub (first time only)');
        
        try {
            // Load purchases từ GitHub
            const allPurchases = await this.getAllPurchasesFromGitHub();
            console.log(`📦 Loaded ${allPurchases.length} purchases from GitHub`);
            
            // Load services từ GitHub  
            const allServices = await this.getAllServicesFromGitHub();
            console.log(`📦 Loaded ${allServices.length} services from GitHub`);
            
            // Cập nhật cache
            this.updateCacheWithGitHubData(allPurchases, allServices);
            
            // Đồng bộ inventory từ purchases
            await this.syncInventoryFromAllPurchaches(allPurchases);
            
            // Lưu thời gian sync
            this.cache.lastGitHubSync = new Date().toISOString();
            localStorage.setItem('inventory_last_github_sync', this.cache.lastGitHubSync);
            
        } catch (error) {
            console.error('Error in initial GitHub load:', error);
        }
    }
    
    // Lấy dữ liệu từ cache, không gọi GitHub
    async loadDataForDateFromCache(dateKey) {
        try {
            // Lấy purchases từ cache
            this.purchases = this.cache.purchasesByDate[dateKey] || [];
            
            // Lấy services từ cache
            this.services = this.cache.servicesByDate[dateKey] || [];
            
        } catch (error) {
            console.error('Error loading from cache:', error);
            this.purchases = [];
            this.services = [];
        }
    }
    
    // Cập nhật cache với dữ liệu từ GitHub
    updateCacheWithGitHubData(purchases, services) {
        // Reset cache
        this.cache.purchasesByDate = {};
        this.cache.servicesByDate = {};
        
        // Nhóm purchases theo ngày
        purchases.forEach(purchase => {
            if (purchase && purchase.date) {
                // Chuyển đổi date display thành date key (dd/mm/yyyy -> yyyy-mm-dd)
                let dateKey = '';
                try {
                    if (purchase.date.includes('/')) {
                        const [day, month, year] = purchase.date.split('/');
                        dateKey = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                    } else {
                        dateKey = purchase.date;
                    }
                } catch (e) {
                    dateKey = purchase.date || this.currentDate;
                }
                
                if (!this.cache.purchasesByDate[dateKey]) {
                    this.cache.purchasesByDate[dateKey] = [];
                }
                this.cache.purchasesByDate[dateKey].push(purchase);
            }
        });
        
        // Nhóm services theo ngày
        services.forEach(service => {
            if (service && service.date) {
                let dateKey = '';
                try {
                    if (service.date.includes('/')) {
                        const [day, month, year] = service.date.split('/');
                        dateKey = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                    } else {
                        dateKey = service.date;
                    }
                } catch (e) {
                    dateKey = service.date || this.currentDate;
                }
                
                if (!this.cache.servicesByDate[dateKey]) {
                    this.cache.servicesByDate[dateKey] = [];
                }
                this.cache.servicesByDate[dateKey].push(service);
            }
        });
        
        console.log(`📊 Cache updated: ${Object.keys(this.cache.purchasesByDate).length} dates with purchases, ${Object.keys(this.cache.servicesByDate).length} dates with services`);
    }
    
    async getAllPurchasesFromGitHub() {
        try {
            const files = await window.githubManager.listFiles('inventory');
            const purchases = [];
            
            for (const file of files) {
                if (!file.name.includes('-') || !file.name.endsWith('.json')) continue;
                
                try {
                    const data = await window.githubManager.getFileContent(`inventory/${file.name}`);
                    if (data?.type === 'purchase' && data.data) {
                        purchases.push(data.data);
                    }
                } catch (e) {
                    // Bỏ qua lỗi file riêng lẻ
                    console.warn(`Could not load file ${file.name}:`, e.message);
                }
            }
            
            console.log(`📦 Loaded ${purchases.length} purchases from GitHub`);
            return purchases;
            
        } catch (error) {
            console.error('Error loading purchases from GitHub:', error);
            return [];
        }
    }
    
    async getAllServicesFromGitHub() {
        try {
            const files = await window.githubManager.listFiles('inventory');
            const services = [];
            
            for (const file of files) {
                if (!file.name.includes('-') || !file.name.endsWith('.json')) continue;
                
                try {
                    const data = await window.githubManager.getFileContent(`inventory/${file.name}`);
                    if (data?.type === 'service' && data.data) {
                        services.push(data.data);
                    }
                } catch (e) {
                    // Bỏ qua lỗi file riêng lẻ
                    console.warn(`Could not load file ${file.name}:`, e.message);
                }
            }
            
            console.log(`📦 Loaded ${services.length} services from GitHub`);
            return services;
            
        } catch (error) {
            console.error('Error loading services from GitHub:', error);
            return [];
        }
    }
    
    async syncInventoryFromAllPurchaches(purchases) {
        try {
            console.log('🔄 Syncing inventory from purchases...');
            
            // Lấy kho hiện tại
            const currentProducts = window.dataManager.getInventoryProducts();
            
            // Tạo map của sản phẩm hiện tại
            const currentProductMap = new Map();
            currentProducts.forEach(product => {
                const key = `${product.name.toLowerCase()}_${product.unit}`;
                currentProductMap.set(key, product);
            });
            
            // Xử lý purchases theo thứ tự thời gian
            const sortedPurchases = purchases.sort((a, b) => {
                try {
                    return new Date(a.addedAt || a.date || 0) - new Date(b.addedAt || b.date || 0);
                } catch (e) {
                    return 0;
                }
            });
            
            const syncedProducts = [];
            const processedKeys = new Set();
            
            // Đầu tiên: thêm tất cả sản phẩm hiện có
            currentProducts.forEach(product => {
                const key = `${product.name.toLowerCase()}_${product.unit}`;
                syncedProducts.push({...product});
                processedKeys.add(key);
            });
            
            // Thêm hoặc cập nhật từ purchases
            for (const purchase of sortedPurchases) {
                if (!purchase.name || !purchase.unit) continue;
                
                const key = `${purchase.name.toLowerCase()}_${purchase.unit}`;
                
                if (processedKeys.has(key)) {
                    // Sản phẩm đã có: tìm và cập nhật
                    const existingIndex = syncedProducts.findIndex(p => 
                        p.name.toLowerCase() === purchase.name.toLowerCase() && 
                        p.unit === purchase.unit
                    );
                    
                    if (existingIndex !== -1) {
                        const existingProduct = syncedProducts[existingIndex];
                        
                        // Kiểm tra nếu purchase chưa có trong history
                        const purchaseInHistory = existingProduct.history?.some(h => 
                            h.type === 'purchase' && 
                            h.date === purchase.date && 
                            Math.abs(h.quantity - purchase.quantity) < 0.01
                        );
                        
                        if (!purchaseInHistory) {
                            // Thêm purchase vào history
                            syncedProducts[existingIndex] = {
                                ...existingProduct,
                                quantity: (existingProduct.quantity || 0) + (purchase.quantity || 0),
                                totalValue: (existingProduct.totalValue || 0) + (purchase.total || 0),
                                history: [
                                    ...(existingProduct.history || []),
                                    {
                                        type: 'purchase',
                                        date: purchase.date,
                                        quantity: purchase.quantity,
                                        amount: purchase.total,
                                        unitPrice: purchase.total / purchase.quantity,
                                        timestamp: purchase.addedAt || new Date().toISOString()
                                    }
                                ]
                            };
                        }
                    }
                } else {
                    // Sản phẩm mới: thêm vào
                    const newProduct = {
                        id: Date.now() + Math.random(),
                        name: purchase.name,
                        unit: purchase.unit,
                        quantity: purchase.quantity || 0,
                        totalValue: purchase.total || 0,
                        unitPrice: (purchase.total || 0) / (purchase.quantity || 1),
                        type: purchase.type || 'material',
                        addedAt: purchase.addedAt || new Date().toISOString(),
                        history: [{
                            type: 'purchase',
                            date: purchase.date,
                            quantity: purchase.quantity,
                            amount: purchase.total,
                            unitPrice: (purchase.total || 0) / (purchase.quantity || 1),
                            timestamp: purchase.addedAt || new Date().toISOString()
                        }]
                    };
                    
                    syncedProducts.push(newProduct);
                    processedKeys.add(key);
                }
            }
            
            // Kiểm tra thay đổi trước khi lưu
            const hasChanges = this.checkInventoryChanges(currentProducts, syncedProducts);
            
            if (hasChanges) {
                // Lưu kho đã đồng bộ
                window.dataManager.data.inventory = window.dataManager.data.inventory || {};
                window.dataManager.data.inventory.products = syncedProducts;
                window.dataManager.saveToLocalStorage();
                
                console.log(`✅ Synced ${syncedProducts.length} products from ${purchases.length} purchases`);
            } else {
                console.log('⏭️ No changes in inventory, skipping save');
            }
            
        } catch (error) {
            console.error('Error syncing inventory from purchases:', error);
        }
    }
    
    checkInventoryChanges(oldProducts, newProducts) {
        if (oldProducts.length !== newProducts.length) return true;
        
        // Kiểm tra từng sản phẩm
        for (let i = 0; i < oldProducts.length; i++) {
            const oldProduct = oldProducts[i];
            const newProduct = newProducts.find(p => 
                p.name === oldProduct.name && p.unit === oldProduct.unit
            );
            
            if (!newProduct) return true;
            if (oldProduct.quantity !== newProduct.quantity) return true;
            if (oldProduct.totalValue !== newProduct.totalValue) return true;
        }
        
        return false;
    }
    
    async changeDate() {
        const dateInput = document.getElementById('inventoryDate');
        const newDate = dateInput.value;
        
        if (newDate !== this.currentDate) {
            this.currentDate = newDate;
            
            // Format display date
            const [year, month, day] = newDate.split('-');
            this.currentDateDisplay = `${day}/${month}/${year}`;
            
            // Hiển thị loading nhanh (không gọi GitHub)
            const mainContent = document.getElementById('mainContent');
            mainContent.innerHTML = `
                <div class="loading">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Đang tải dữ liệu kho ngày ${this.currentDateDisplay}...</p>
                </div>
            `;
            
            // Chỉ load từ cache
            await this.loadDataForDateFromCache(this.currentDate);
            
            // Render lại với dữ liệu từ cache
            setTimeout(() => this.render(), 50);
        }
    }
    
    // Thêm hàm force sync cho khi cần thiết
    async forceGitHubSync() {
        console.log('🔄 Force syncing from GitHub...');
        this.initialLoadCompleted = false;
        await this.render();
    }
    
    // Các hàm khác giữ nguyên...
    showPurchaseModal() {
        // Giữ nguyên như cũ...
        const modalContent = `
            <div class="modal-header">
                <h2><i class="fas fa-shopping-cart"></i> MUA HÀNG HÓA</h2>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="modal-date">${this.currentDateDisplay}</div>
                
                <div class="form-group">
                    <label>Ngày mua:</label>
                    <input type="date" id="purchaseDate" value="${this.currentDate}">
                </div>
                
                <div class="form-group">
                    <label>Loại:</label>
                    <select id="purchaseType">
                        <option value="material">Nguyên liệu</option>
                        <option value="goods">Hàng hóa</option>
                        <option value="other">Khác</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Tên / Mô tả:</label>
                    <div class="input-with-dropdown">
                        <input type="text" id="purchaseName" placeholder="Cà phê hạt Brazil...">
                        <div class="dropdown-arrow">▼</div>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Số lượng:</label>
                        <input type="number" id="purchaseQuantity" placeholder="10" min="0.01" step="0.01">
                    </div>
                    <div class="form-group">
                        <label>Đơn vị:</label>
                        <select id="purchaseUnit">
                            <option value="kg">kg</option>
                            <option value="gói">gói</option>
                            <option value="lít">lít</option>
                            <option value="cái">cái</option>
                            <option value="thùng">thùng</option>
                            <option value="bao">bao</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Thành tiền (tổng):</label>
                    <div class="input-group">
                        <input type="text" id="purchaseTotal" placeholder="0" oninput="window.inventoryModule.formatCurrency(this)">
                        <span class="currency">₫</span>
                    </div>
                    <small class="hint">Không cần nhập đơn giá</small>
                </div>
                
                <button class="btn-primary" onclick="window.inventoryModule.savePurchase()">
                    <i class="fas fa-save"></i> 💾 LƯU & CẬP NHẬT KHO
                </button>
                
                <button class="btn-secondary" onclick="closeModal()">
                    ĐÓNG
                </button>
            </div>
        `;
        
        window.showModal(modalContent);
    }
    
    formatCurrency(input) {
        let value = input.value.replace(/\D/g, '');
        if (value) {
            value = parseInt(value).toLocaleString('vi-VN');
        }
        input.value = value;
    }
    
    getCurrencyValue(inputId) {
        const input = document.getElementById(inputId);
        if (!input) return 0;
        
        const value = input.value.replace(/\D/g, '');
        return parseInt(value) || 0;
    }
    
    async savePurchase() {
        try {
            const date = document.getElementById('purchaseDate').value;
            const type = document.getElementById('purchaseType').value;
            const name = document.getElementById('purchaseName').value.trim();
            const quantity = parseFloat(document.getElementById('purchaseQuantity').value) || 0;
            const unit = document.getElementById('purchaseUnit').value;
            const total = this.getCurrencyValue('purchaseTotal');
            
            // Validation
            if (!name) {
                window.showToast('Vui lòng nhập tên hàng hóa', 'warning');
                document.getElementById('purchaseName').focus();
                return;
            }
            
            if (quantity <= 0) {
                window.showToast('Số lượng phải lớn hơn 0', 'warning');
                document.getElementById('purchaseQuantity').focus();
                return;
            }
            
            if (total <= 0) {
                window.showToast('Thành tiền phải lớn hơn 0', 'warning');
                document.getElementById('purchaseTotal').focus();
                return;
            }
            
            // Format date key
            const [year, month, day] = date.split('-');
            const dateKey = `${year}-${month}-${day}`;
            const dateDisplay = `${day}/${month}/${year}`;
            
            const purchaseData = {
                id: Date.now(),
                date: dateDisplay,
                type,
                name,
                quantity,
                unit,
                total,
                unitPrice: total / quantity,
                addedAt: new Date().toISOString()
            };
            
            // Cập nhật vào kho ngay lập tức
            const addSuccess = await this.addToInventoryFromPurchase(purchaseData);
            if (!addSuccess) {
                window.showToast('Lỗi khi cập nhật kho', 'error');
                return;
            }
            
            // Thêm vào cache purchases
            if (!this.cache.purchasesByDate[dateKey]) {
                this.cache.purchasesByDate[dateKey] = [];
            }
            this.cache.purchasesByDate[dateKey].push(purchaseData);
            this.purchases = this.cache.purchasesByDate[dateKey];
            
            // Lưu purchase lên GitHub
            const dataToSave = {
                type: 'purchase',
                data: purchaseData
            };
            
            const success = await window.dataManager.syncToGitHub(
                'inventory',
                dateKey,
                dataToSave,
                `Mua hàng hóa ngày ${dateDisplay}: ${name} - ${quantity} ${unit}`
            );
            
            if (success) {
                window.showToast('✅ Đã lưu và cập nhật kho thành công', 'success');
                closeModal();
                await this.render();
            } else {
                window.showToast('Lưu kho thành công nhưng lỗi đồng bộ GitHub', 'warning');
                closeModal();
                await this.render();
            }
            
        } catch (error) {
            console.error('Error saving purchase:', error);
            window.showToast('Lỗi khi lưu dữ liệu', 'error');
        }
    }
    
    async addToInventoryFromPurchase(purchaseData) {
        try {
            console.log(`📦 Adding to inventory from purchase: ${purchaseData.name}`);
            
            // Lấy danh sách sản phẩm hiện tại
            const products = window.dataManager.getInventoryProducts();
            
            // Tìm sản phẩm đã có trong kho
            const existingProductIndex = products.findIndex(p => 
                p.name.toLowerCase() === purchaseData.name.toLowerCase() && 
                p.unit === purchaseData.unit
            );
            
            if (existingProductIndex !== -1) {
                const existingProduct = products[existingProductIndex];
                
                // Kiểm tra nếu purchase đã tồn tại trong history
                const purchaseExists = existingProduct.history?.some(h => 
                    h.type === 'purchase' && 
                    h.date === purchaseData.date && 
                    Math.abs(h.quantity - purchaseData.quantity) < 0.01
                );
                
                if (purchaseExists) {
                    console.log(`⏭️ Purchase already exists in history, skipping`);
                    return true;
                }
                
                // Cập nhật sản phẩm
                const newQuantity = existingProduct.quantity + purchaseData.quantity;
                const newTotalValue = (existingProduct.totalValue || 0) + purchaseData.total;
                
                products[existingProductIndex] = {
                    ...existingProduct,
                    quantity: newQuantity,
                    totalValue: newTotalValue,
                    unitPrice: newTotalValue / newQuantity,
                    lastUpdated: new Date().toISOString(),
                    history: [
                        ...(existingProduct.history || []),
                        {
                            type: 'purchase',
                            date: purchaseData.date,
                            quantity: purchaseData.quantity,
                            amount: purchaseData.total,
                            unitPrice: purchaseData.unitPrice,
                            timestamp: new Date().toISOString()
                        }
                    ]
                };
                
                console.log(`✅ Updated existing product: ${purchaseData.name} (+${purchaseData.quantity} ${purchaseData.unit})`);
                
            } else {
                // Thêm sản phẩm mới
                const newProduct = {
                    id: Date.now(),
                    name: purchaseData.name,
                    unit: purchaseData.unit,
                    quantity: purchaseData.quantity,
                    totalValue: purchaseData.total,
                    unitPrice: purchaseData.unitPrice,
                    type: purchaseData.type,
                    addedAt: new Date().toISOString(),
                    history: [{
                        type: 'purchase',
                        date: purchaseData.date,
                        quantity: purchaseData.quantity,
                        amount: purchaseData.total,
                        unitPrice: purchaseData.unitPrice,
                        timestamp: new Date().toISOString()
                    }]
                };
                
                products.push(newProduct);
                console.log(`✅ Added new product to inventory: ${purchaseData.name}`);
            }
            
            // Lưu lại
            window.dataManager.data.inventory = window.dataManager.data.inventory || {};
            window.dataManager.data.inventory.products = products;
            window.dataManager.saveToLocalStorage();
            
            return true;
            
        } catch (error) {
            console.error('Error adding to inventory from purchase:', error);
            return false;
        }
    }
    
    // Các hàm còn lại giữ nguyên...
    showProductHistory(index) {
        const products = window.dataManager.getInventoryProducts();
        if (index >= products.length) return;
        
        const product = products[index];
        
        // Lấy tất cả purchases từ cache
        const allPurchases = [];
        
        Object.entries(this.cache.purchasesByDate).forEach(([dateKey, purchaseList]) => {
            if (Array.isArray(purchaseList)) {
                purchaseList.forEach(purchase => {
                    if (purchase && 
                        purchase.name && 
                        purchase.unit &&
                        purchase.name.toLowerCase() === product.name.toLowerCase() && 
                        purchase.unit === product.unit) {
                        
                        allPurchases.push({
                            ...purchase,
                            dateKey: dateKey,
                            displayDate: purchase.date || this.formatDateForDisplay(dateKey)
                        });
                    }
                });
            }
        });
        
        // Sắp xếp theo thời gian (mới nhất trước)
        allPurchases.sort((a, b) => {
            try {
                const dateA = new Date(a.dateKey || a.addedAt);
                const dateB = new Date(b.dateKey || b.addedAt);
                return dateB - dateA;
            } catch (e) {
                return 0;
            }
        });
        
        const modalContent = `
            <div class="modal-header">
                <h2><i class="fas fa-history"></i> LỊCH SỬ: ${product.name}</h2>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="product-info">
                    <div><strong>Đơn vị:</strong> ${product.unit}</div>
                    <div><strong>Hiện có:</strong> ${product.quantity}</div>
                    <div><strong>Tổng giá trị:</strong> ${(product.totalValue || 0).toLocaleString()} ₫</div>
                </div>
                
                <div class="history-section">
                    <h3><i class="fas fa-download" style="color: #10B981;"></i> LỊCH SỬ NHẬP HÀNG (${allPurchases.length} lần)</h3>
                    
                    ${allPurchases.length > 0 ? `
                        <div class="history-header">
                            <span>NGÀY</span>
                            <span>SỐ LƯỢNG</span>
                            <span>THÀNH TIỀN</span>
                            <span>ĐƠN GIÁ</span>
                        </div>
                        
                        ${allPurchases.map(purchase => `
                            <div class="history-item">
                                <span class="history-date">${purchase.displayDate || purchase.date || 'N/A'}</span>
                                <span class="history-detail">${purchase.quantity} ${purchase.unit}</span>
                                <span class="history-amount">${purchase.total.toLocaleString()} ₫</span>
                                <span class="history-unit">${(purchase.unitPrice || purchase.total / purchase.quantity).toLocaleString()} ₫/${purchase.unit}</span>
                            </div>
                        `).join('')}
                    ` : `
                        <div class="empty-state">
                            <i class="fas fa-inbox"></i>
                            <p>Chưa có lịch sử nhập hàng</p>
                            <small>Sản phẩm có thể được thêm trực tiếp vào kho</small>
                        </div>
                    `}
                </div>
                
                ${allPurchases.length > 0 ? `
                    <div class="history-summary">
                        <div><strong>Tổng số lần nhập:</strong> ${allPurchases.length}</div>
                        <div><strong>Tổng nhập:</strong> ${allPurchases.reduce((sum, p) => sum + p.quantity, 0)} ${product.unit}</div>
                        <div><strong>Tổng tiền nhập:</strong> ${allPurchases.reduce((sum, p) => sum + p.total, 0).toLocaleString()} ₫</div>
                        <div><strong>Giá trị trung bình:</strong> ${(allPurchases.reduce((sum, p) => sum + p.total, 0) / allPurchases.reduce((sum, p) => sum + p.quantity, 1)).toLocaleString()} ₫/${product.unit}</div>
                    </div>
                ` : ''}
                
                <div class="button-group">
                    <button class="btn-secondary" onclick="closeModal()">
                        <i class="fas fa-times"></i> ĐÓNG
                    </button>
                </div>
            </div>
        `;
        
        window.showModal(modalContent);
    }
    
    togglePurchases() {
        const section = document.getElementById('purchasesSection');
        const toggleIcon = document.getElementById('purchasesToggle');
        
        if (section.style.display === 'none') {
            section.style.display = 'block';
            toggleIcon.className = 'fas fa-chevron-up';
            this.renderPurchasesSection();
        } else {
            section.style.display = 'none';
            toggleIcon.className = 'fas fa-chevron-down';
        }
    }
    
    renderPurchasesSection() {
        const section = document.getElementById('purchasesSection');
        if (!section) return;
        
        section.innerHTML = `
            <div class="purchases-list">
                <h4>🛒 MUA HÀNG NGÀY ${this.currentDateDisplay}</h4>
                
                ${this.purchases.length > 0 ? this.purchases.map(purchase => `
                    <div class="purchase-item">
                        <div class="purchase-info">
                            <div class="purchase-name">${purchase.name}</div>
                            <div class="purchase-details">${purchase.quantity} ${purchase.unit} • ${purchase.type}</div>
                        </div>
                        <div class="purchase-amount">${purchase.total.toLocaleString()} ₫</div>
                    </div>
                `).join('') : `
                    <div class="empty-state">
                        <i class="fas fa-receipt"></i>
                        <p>Chưa có mua hàng nào trong ngày</p>
                    </div>
                `}
                
                <div class="purchases-total">
                    <strong>Tổng mua hàng:</strong>
                    <span>${this.purchases.reduce((sum, p) => sum + p.total, 0).toLocaleString()} ₫</span>
                </div>
            </div>
        `;
    }
    
    toggleServices() {
        const section = document.getElementById('servicesSection');
        const toggleIcon = document.getElementById('servicesToggle');
        
        if (section.style.display === 'none') {
            section.style.display = 'block';
            toggleIcon.className = 'fas fa-chevron-up';
            this.renderServicesSection();
        } else {
            section.style.display = 'none';
            toggleIcon.className = 'fas fa-chevron-down';
        }
    }
    
    renderServicesSection() {
        const section = document.getElementById('servicesSection');
        if (!section) return;
        
        section.innerHTML = `
            <div class="services-list">
                <h4>📝 DỊCH VỤ NGÀY ${this.currentDateDisplay}</h4>
                
                ${this.services.length > 0 ? this.services.map(service => `
                    <div class="service-item">
                        <div class="service-info">
                            <div class="service-name">${service.name}</div>
                            ${service.note ? `<div class="service-note">${service.note}</div>` : ''}
                        </div>
                        <div class="service-amount">${service.amount.toLocaleString()} ₫</div>
                    </div>
                `).join('') : `
                    <div class="empty-state">
                        <i class="fas fa-concierge-bell"></i>
                        <p>Chưa có dịch vụ nào trong ngày</p>
                    </div>
                `}
                
                <div class="services-total">
                    <strong>Tổng dịch vụ:</strong>
                    <span>${this.services.reduce((sum, s) => sum + s.amount, 0).toLocaleString()} ₫</span>
                </div>
            </div>
        `;
    }
    
    toggleStats() {
        const section = document.getElementById('statsSection');
        const toggleIcon = document.getElementById('statsToggle');
        
        if (section.style.display === 'none') {
            section.style.display = 'block';
            toggleIcon.className = 'fas fa-chevron-up';
            this.renderStatsSection();
        } else {
            section.style.display = 'none';
            toggleIcon.className = 'fas fa-chevron-down';
        }
    }
    
    renderStatsSection() {
        const section = document.getElementById('statsSection');
        if (!section) return;
        
        // Tính toán thống kê từ cache
        const products = window.dataManager.getInventoryProducts();
        const totalValue = products.reduce((sum, p) => sum + (p.totalValue || 0), 0);
        const totalQuantity = products.reduce((sum, p) => sum + p.quantity, 0);
        
        // Tổng purchases và services từ cache
        let totalPurchases = 0;
        let totalServices = 0;
        
        Object.values(this.cache.purchasesByDate).forEach(purchaseList => {
            if (Array.isArray(purchaseList)) {
                purchaseList.forEach(p => totalPurchases += (p.total || 0));
            }
        });
        
        Object.values(this.cache.servicesByDate).forEach(serviceList => {
            if (Array.isArray(serviceList)) {
                serviceList.forEach(s => totalServices += (s.amount || 0));
            }
        });
        
        section.innerHTML = `
            <div class="stats-container">
                <h4>📈 THỐNG KÊ TỔNG QUAN</h4>
                <small>Last sync: ${this.cache.lastGitHubSync ? new Date(this.cache.lastGitHubSync).toLocaleString() : 'Never'}</small>
                
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-label">Tổng sản phẩm</div>
                        <div class="stat-value">${products.length}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Tổng số lượng</div>
                        <div class="stat-value">${totalQuantity}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Tổng giá trị</div>
                        <div class="stat-value">${totalValue.toLocaleString()} ₫</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Tổng mua hàng</div>
                        <div class="stat-value">${totalPurchases.toLocaleString()} ₫</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Tổng dịch vụ</div>
                        <div class="stat-value">${totalServices.toLocaleString()} ₫</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Tổng chi phí</div>
                        <div class="stat-value">${(totalPurchases + totalServices).toLocaleString()} ₫</div>
                    </div>
                </div>
                
                <div class="stats-table">
                    <h5>Top 5 sản phẩm có giá trị cao nhất</h5>
                    ${products.sort((a, b) => (b.totalValue || 0) - (a.totalValue || 0)).slice(0, 5).map(product => `
                        <div class="stats-row">
                            <span>${product.name}</span>
                            <span>${product.quantity} ${product.unit}</span>
                            <span>${(product.totalValue || 0).toLocaleString()} ₫</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
}

// Khởi tạo module
window.inventoryModule = new InventoryModule();