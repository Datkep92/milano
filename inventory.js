// inventory.js - Module kho hàng sử dụng DataManager giống Reports
class InventoryModule {
    constructor() {
    this.currentDate = this.formatDateForStorage(new Date());
    this.currentDateDisplay = this.formatDateForDisplay(new Date());
    this.isLoading = false;
    this.cache = {
        inventoryByDate: {}
    };
    
    // Thêm listener để debug đồng bộ
    window.addEventListener('dataUpdated', (event) => {
        if (event.detail.module === 'inventory') {
            console.log('🔄 Inventory data updated from Firebase:', event.detail);
            this.debugInventorySync();
        }
    });
    
    window.addEventListener('syncStatusChanged', (event) => {
        console.log('📡 Sync status changed:', event.detail);
    });
}

// Thêm hàm debug
async debugInventorySync() {
    console.log('🔍 DEBUG INVENTORY SYNC STATUS:');
    console.log('1. Local inventory data:', window.dataManager.data.inventory);
    console.log('2. Products count:', window.dataManager.getInventoryProducts().length);
    console.log('3. Purchases count:', Object.keys(window.dataManager.data.inventory?.purchases || {}).length);
    console.log('4. Services count:', Object.keys(window.dataManager.data.inventory?.services || {}).length);
    
    // Kiểm tra Firebase sync status
    const syncStats = window.dataManager.getSyncStats();
    console.log('5. Sync stats:', syncStats);
}

    formatDateForStorage(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
// Thêm hàm này vào class InventoryModule
async handleDateChange(event) {
    const newDate = event.target.value;
    
    if (!newDate) return;
    
    if (newDate !== this.currentDate) {
        // Update dates
        this.currentDate = newDate;
        const [year, month, day] = newDate.split('-');
        this.currentDateDisplay = `${day}/${month}/${year}`;
        
        // Show loading
        const mainContent = document.getElementById('mainContent');
        if (mainContent) {
            const originalHTML = mainContent.innerHTML;
            mainContent.innerHTML = `
                <div class="loading">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Đang tải dữ liệu ngày ${this.currentDateDisplay}...</p>
                </div>
            `;
            
            // Render lại với dữ liệu mới
            await this.render();
            
            // Nếu lỗi, restore lại HTML cũ
            if (mainContent.innerHTML.includes('loading')) {
                setTimeout(() => {
                    mainContent.innerHTML = originalHTML;
                    document.getElementById('inventoryDate').value = this.currentDate;
                }, 1000);
            }
        }
        
        // Show toast notification
        window.showToast(`📅 Đã chuyển sang ngày ${this.currentDateDisplay}`, 'info');
    }
}
    formatDateForDisplay(date) {
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    }

    async render() {
    if (this.isLoading) return;
    
    this.isLoading = true;
    const mainContent = document.getElementById('mainContent');
    
    try {
        const products = window.dataManager.getInventoryProducts();
        
        mainContent.innerHTML = `
        <div class="inventory-container">
            <!-- Header với date picker -->
            <div class="inventory-header">
                <div class="date-picker-compact">
                    <input type="date" id="inventoryDate" 
                           value="${this.currentDate}" 
                           onchange="window.inventoryModule.handleDateChange(event)">
                </div>
            </div>
                <!-- Action Buttons -->
                <div class="inventory-actions">
                    <button class="btn-primary" onclick="window.inventoryModule.showPurchaseModal()">
                        <i class="fas fa-shopping-cart"></i> MUA HÀNG
                    </button>
                    <button class="btn-primary" onclick="window.inventoryModule.showServiceModal()">
                        <i class="fas fa-concierge-bell"></i> DỊCH VỤ
                    </button>
                </div>
                
                </div>
                <div class="inventory-header">
                <h3><i class="fas fa-boxes"></i> Kho hàng  </h3> <button class="btn-secondary" onclick="window.inventoryModule.showOpeningStockModal()">
                    <i class="fas fa-box-open"></i> TỒN ĐẦU KỲ
                </button>
                <!-- Inventory List -->
                <div class="inventory-list">
                    <div class="inventory-list-header">
                        <span>TÊN SẢN PHẨM</span>
                        <span>SỐ LƯỢNG</span>
                        <span>GIÁ TRỊ</span>
                        <span>          THAO TÁC</span>
                        <span></span>
                    </div>
                    
                    <div class="inventory-list-items">
                        ${products.length > 0 ? products.map((product, index) => `
                            <div class="inventory-item" onclick="window.inventoryModule.showProductDetail(${index})">
    <div class="product-info">
        <span class="product-name">${product.name}</span>
    </div>
    <div class="product-quantity">${product.quantity}</div>
    <div class="product-value">${(product.totalValue || 0).toLocaleString()} ₫</div>
    <div class="product-actions" onclick="event.stopPropagation()">
        <button class="btn-icon-small history" onclick="window.inventoryModule.showProductHistory(${index})">
            <i class="fas fa-history"></i>
        </button>
        <button class="btn-icon-small edit" onclick="window.inventoryModule.editProduct(${index})">
            <i class="fas fa-edit"></i>
        </button>
    </div>
</div>
                        `).join('') : `
                            <div class="inventory-empty">
                                <i class="fas fa-box-open"></i>
                                <p>Chưa có sản phẩm trong kho</p>
                                <button class="btn-primary" onclick="window.inventoryModule.showAddProductModal()">
                                    <i class="fas fa-plus"></i> Thêm sản phẩm đầu tiên
                                </button>
                            </div>
                        `}
                    </div>
                </div>
                
                <!-- Collapsible Sections -->
                <div class="inventory-section">
                    <div class="action-card" onclick="window.inventoryModule.togglePurchases()">
                        <i class="fas fa-receipt"></i>
                        <span>MUA HÀNG NGÀY ${this.currentDateDisplay}</span>
                        <i class="fas fa-chevron-down" id="purchasesToggle"></i>
                    </div>
                    
                    <div id="purchasesSection" class="collapsible-section" style="display: none;">
                        <!-- Purchases sẽ được render riêng -->
                    </div>
                    
                    <div class="action-card" onclick="window.inventoryModule.toggleServices()">
                        <i class="fas fa-concierge-bell"></i>
                        <span>DỊCH VỤ NGÀY ${this.currentDateDisplay}</span>
                        <i class="fas fa-chevron-down" id="servicesToggle"></i>
                    </div>
                    
                    <div id="servicesSection" class="collapsible-section" style="display: none;">
                        <!-- Services sẽ được render riêng -->
                    </div>
                </div>
            </div>
        `;
        
        // Update UI cho collapsible sections nếu có dữ liệu
        const inventoryData = this.getInventoryForCurrentDate();
        if (inventoryData.purchases.length > 0 || inventoryData.services.length > 0) {
            // Hiển thị badge số lượng
            const purchaseCard = document.querySelector('.action-card:first-child');
            const serviceCard = document.querySelector('.action-card:last-child');
            
            if (purchaseCard && inventoryData.purchases.length > 0) {
                const purchaseBadge = document.createElement('span');
                purchaseBadge.className = 'badge-count';
                purchaseBadge.textContent = inventoryData.purchases.length;
                purchaseBadge.style.cssText = `
                    background: #10B981;
                    color: white;
                    font-size: 10px;
                    padding: 2px 6px;
                    border-radius: 10px;
                    margin-left: 8px;
                `;
                purchaseCard.querySelector('span').appendChild(purchaseBadge);
            }
            
            if (serviceCard && inventoryData.services.length > 0) {
                const serviceBadge = document.createElement('span');
                serviceBadge.className = 'badge-count';
                serviceBadge.textContent = inventoryData.services.length;
                serviceBadge.style.cssText = `
                    background: #F59E0B;
                    color: white;
                    font-size: 10px;
                    padding: 2px 6px;
                    border-radius: 10px;
                    margin-left: 8px;
                `;
                serviceCard.querySelector('span').appendChild(serviceBadge);
            }
        }
        
    } catch (error) {
        console.error('❌ Error rendering inventory:', error);
        mainContent.innerHTML = `
            <div class="error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Lỗi khi tải dữ liệu kho</p>
                <button onclick="window.inventoryModule.render()">Thử lại</button>
            </div>
        `;
    } finally {
        this.isLoading = false;
    }
}

// Thêm hàm showProductDetail
showProductDetail(index) {
    const products = window.dataManager.getInventoryProducts();
    if (index >= products.length) return;
    
    const product = products[index];
    
    const modalContent = `
        <div class="modal-header">
            <h2><i class="fas fa-box"></i> ${product.name}</h2>
            <button class="modal-close" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div class="product-detail-summary">
                <div class="detail-item">
                    <i class="fas fa-balance-scale"></i>
                    <div>
                        <small>Tồn kho</small>
                        <strong>${product.quantity} ${product.unit}</strong>
                    </div>
                </div>
                <div class="detail-item">
                    <i class="fas fa-money-bill-wave"></i>
                    <div>
                        <small>Giá trị</small>
                        <strong>${(product.totalValue || 0).toLocaleString()} ₫</strong>
                    </div>
                </div>
                <div class="detail-item">
                    <i class="fas fa-calendar-alt"></i>
                    <div>
                        <small>Cập nhật</small>
                        <strong>${product.lastUpdated ? new Date(product.lastUpdated).toLocaleDateString('vi-VN') : 'N/A'}</strong>
                    </div>
                </div>
            </div>
            
            <div class="action-buttons">
                <button class="btn-primary" onclick="window.inventoryModule.showProductHistory(${index})">
                    <i class="fas fa-history"></i> LỊCH SỬ
                </button>
                <button class="btn-secondary" onclick="window.inventoryModule.editProduct(${index})">
                    <i class="fas fa-edit"></i> CHỈNH SỬA
                </button>
                <button class="btn-outline" onclick="closeModal()">
                    ĐÓNG
                </button>
            </div>
        </div>
    `;
    
    window.showModal(modalContent);
}
async forceSync() {
    try {
        window.showToast('🔄 Đang đồng bộ dữ liệu kho...', 'info');
        
        // Force reload từ Firebase
        await window.dataManager.loadFromFirebase();
        
        // Render lại UI
        await this.render();
        
        window.showToast('✅ Đã đồng bộ dữ liệu kho', 'success');
        
        // Debug
        this.debugInventorySync();
        
    } catch (error) {
        console.error('Error force syncing inventory:', error);
        window.showToast('Lỗi đồng bộ', 'error');
    }
}
async debugFirebaseStructure() {
    try {
        console.log('🔍 DEBUG FIREBASE INVENTORY STRUCTURE');
        
        // Lấy dữ liệu trực tiếp từ Firebase để kiểm tra
        const firebaseData = await window.githubManager.getData('inventory');
        console.log('📦 Firebase inventory structure:', firebaseData);
        
        if (firebaseData) {
            console.log('📦 Products type:', typeof firebaseData.products, 'Is array?', Array.isArray(firebaseData.products));
            console.log('📦 Purchases keys:', Object.keys(firebaseData.purchases || {}));
            console.log('📦 Services keys:', Object.keys(firebaseData.services || {}));
            
            // Kiểm tra chi tiết purchases
            Object.entries(firebaseData.purchases || {}).forEach(([dateKey, data]) => {
                console.log(`📦 Purchases ${dateKey}:`, data);
                console.log(`📦 Type: ${typeof data}, Is array? ${Array.isArray(data)}`);
            });
        }
        
        // Kiểm tra local data
        console.log('📦 Local inventory data:', window.dataManager.data.inventory);
        
    } catch (error) {
        console.error('Error debugging Firebase structure:', error);
    }
}


    getInventoryForCurrentDate() {
    try {
        const dateKey = this.currentDate;
        const displayDateKey = this.formatDateFromFirebase(dateKey);
        
        console.log(`🔍 Getting inventory for date: ${dateKey} (display: ${displayDateKey})`);
        
        // Đảm bảo data tồn tại
        if (!window.dataManager.data.inventory) {
            console.warn('⚠️ No inventory data found in DataManager');
            return { purchases: [], services: [] };
        }
        
        const purchases = window.dataManager.data.inventory.purchases?.[displayDateKey] || [];
        const services = window.dataManager.data.inventory.services?.[displayDateKey] || [];
        
        console.log(`📊 Found ${purchases.length} purchases, ${services.length} services`);
        
        return {
            purchases: Array.isArray(purchases) ? purchases : [],
            services: Array.isArray(services) ? services : []
        };
        
    } catch (error) {
        console.error('Error getting inventory for current date:', error);
        return { purchases: [], services: [] };
    }
}

   

    // **HIỂN THỊ MODAL MUA HÀNG**
    showPurchaseModal() {
        const modalContent = `
            <div class="modal-header">
                <h2><i class="fas fa-shopping-cart"></i> MUA HÀNG HÓA</h2>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="modal-date">${this.currentDateDisplay}</div>
                
                <div class="form-group">
                    <label>Loại:</label>
                    <select id="purchaseType">
                        <option value="material">Nguyên liệu</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Tên / Mô tả:</label>
                    <input type="text" id="purchaseName" placeholder="Cà phê hạt Brazil...">
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
                            <option value="hộp">hộp</option>
                            <option value="gói">gói</option>
                            <option value="lít">lít</option>
                            <option value="cái">cái</option>
                            <option value="thùng">thùng</option>
                            <option value="bịch">bịch</option>
                            <option value="bao">bao</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Thành tiền (tổng):</label>
                    <div class="input-group">
                        <input type="text" id="purchaseTotal" placeholder="0" oninput="window.inventoryModule.formatCurrency(this)">
                    </div>
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

   async savePurchase() {
    try {
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
        
        const purchaseData = {
            id: Date.now(),
            date: this.currentDateDisplay,
            type,
            name,
            quantity,
            unit,
            total,
            unitPrice: total / quantity,
            addedAt: new Date().toISOString()
        };
        
        // 1. CẬP NHẬT LOCAL DATA
        const dateKey = this.currentDate;
        const displayDateKey = this.formatDateFromFirebase(dateKey);
        
        // Khởi tạo purchases nếu chưa có
        if (!window.dataManager.data.inventory.purchases[displayDateKey]) {
            window.dataManager.data.inventory.purchases[displayDateKey] = [];
        }
        
        // Thêm purchase mới
        window.dataManager.data.inventory.purchases[displayDateKey].push(purchaseData);
        
        // Cập nhật sản phẩm tồn kho
        this.updateInventoryProduct(purchaseData);
        
        // Lưu vào localStorage
        window.dataManager.saveLocalData();
        
        // 2. LƯU LÊN FIREBASE - ĐÚNG CẤU TRÚC
        const purchasesForDate = window.dataManager.data.inventory.purchases[displayDateKey];
        const purchaseDataToSave = {
            purchases: purchasesForDate,
            lastUpdated: new Date().toISOString()
        };
        
        const success = await window.dataManager.saveLocal(
            'inventory',
            `purchases_${dateKey}.json`,
            purchaseDataToSave,
            `Mua hàng ngày ${this.currentDateDisplay} - ${name}`
        );
        
        if (success) {
            window.showToast('✅ Đã lưu và cập nhật kho thành công', 'success');
            closeModal();
            await this.render();
        }
        
    } catch (error) {
        console.error('Error saving purchase:', error);
        window.showToast('Lỗi khi lưu dữ liệu', 'error');
    }
}

    // **CẬP NHẬT DỮ LIỆU LOCAL - GIỐNG NHƯ REPORTS**
    updateLocalInventoryData(purchaseData) {
        const dateKey = this.currentDate;
        
        // Khởi tạo nếu chưa có
        if (!window.dataManager.data.inventory) {
            window.dataManager.data.inventory = {
                products: [],
                purchases: {},
                services: {},
                exports: {}
            };
        }
        
        if (!window.dataManager.data.inventory.purchases[dateKey]) {
            window.dataManager.data.inventory.purchases[dateKey] = [];
        }
        
        // Thêm purchase mới
        window.dataManager.data.inventory.purchases[dateKey].push(purchaseData);
        
        // Cập nhật sản phẩm tồn kho
        this.updateInventoryProduct(purchaseData);
        
        // Lưu vào localStorage
        window.dataManager.saveToLocalStorage();
    }

    async updateInventoryProduct(purchaseData) {
    try {
        const products = window.dataManager.getInventoryProducts();
        const existingIndex = products.findIndex(p => 
            p.name.toLowerCase() === purchaseData.name.toLowerCase() && 
            p.unit === purchaseData.unit
        );
        
        if (existingIndex >= 0) {
            // Cập nhật sản phẩm đã có
            products[existingIndex].quantity += purchaseData.quantity;
            products[existingIndex].totalValue += purchaseData.total;
            products[existingIndex].lastUpdated = new Date().toISOString();
            products[existingIndex].history = products[existingIndex].history || [];
            products[existingIndex].history.push({
                type: 'purchase',
                date: this.currentDateDisplay,
                quantity: purchaseData.quantity,
                total: purchaseData.total,
                timestamp: new Date().toISOString()
            });
        } else {
            // Thêm sản phẩm mới
            products.push({
                id: Date.now(),
                name: purchaseData.name,
                unit: purchaseData.unit,
                quantity: purchaseData.quantity,
                totalValue: purchaseData.total,
                unitPrice: purchaseData.unitPrice,
                type: purchaseData.type,
                addedAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
                history: [{
                    type: 'purchase',
                    date: this.currentDateDisplay,
                    quantity: purchaseData.quantity,
                    total: purchaseData.total,
                    timestamp: new Date().toISOString()
                }]
            });
        }
        
        // Lưu products vào Firebase - ĐÚNG CẤU TRÚC
        const inventoryData = { 
            products: products,
            lastUpdated: new Date().toISOString()
        };
        
        await window.dataManager.saveLocal(
            'inventory',
            'products.json',
            inventoryData,
            `Cập nhật kho sau mua hàng - ${purchaseData.name}`
        );
        
    } catch (error) {
        console.error('Error updating inventory product:', error);
    }
}
async addProduct() {
    const name = document.getElementById('productName').value.trim();
    const unit = document.getElementById('productUnit').value;
    const quantity = parseFloat(document.getElementById('productQuantity').value) || 0;
    const value = this.getCurrencyValue('productValue');
    
    if (!name) {
        window.showToast('Vui lòng nhập tên sản phẩm', 'warning');
        return;
    }
    
    if (quantity <= 0) {
        window.showToast('Số lượng phải lớn hơn 0', 'warning');
        return;
    }
    
    if (value <= 0) {
        window.showToast('Giá trị phải lớn hơn 0', 'warning');
        return;
    }
    
    const products = window.dataManager.getInventoryProducts();
    const existingIndex = products.findIndex(p => 
        p.name.toLowerCase() === name.toLowerCase() && p.unit === unit
    );
    
    if (existingIndex >= 0) {
        // Cập nhật sản phẩm đã có
        products[existingIndex].quantity += quantity;
        products[existingIndex].totalValue += value;
        products[existingIndex].lastUpdated = new Date().toISOString();
    } else {
        // Thêm sản phẩm mới
        products.push({
            id: Date.now(),
            name,
            unit,
            quantity,
            totalValue: value,
            addedAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        });
    }
    
    // Lưu vào Firebase thông qua DataManager
    const inventoryData = { products: products };
    await window.dataManager.saveLocal(
        'inventory',
        'products.json',
        inventoryData,
        `Thêm sản phẩm mới - ${name}`
    );
    
    window.showToast('✅ Đã thêm sản phẩm vào kho', 'success');
    closeModal();
    this.render();
}
async updateProduct(index) {
    const products = window.dataManager.getInventoryProducts();
    if (index >= products.length) return;
    
    const name = document.getElementById('editProductName').value.trim();
    const unit = document.getElementById('editProductUnit').value;
    const quantity = parseFloat(document.getElementById('editProductQuantity').value) || 0;
    const value = this.getCurrencyValue('editProductValue');
    
    if (!name) {
        window.showToast('Vui lòng nhập tên sản phẩm', 'warning');
        return;
    }
    
    if (quantity < 0) {
        window.showToast('Số lượng không hợp lệ', 'warning');
        return;
    }
    
    if (value < 0) {
        window.showToast('Giá trị không hợp lệ', 'warning');
        return;
    }
    
    products[index] = {
        ...products[index],
        name,
        unit,
        quantity,
        totalValue: value,
        lastUpdated: new Date().toISOString()
    };
    
    // Lưu vào Firebase thông qua DataManager
    const inventoryData = { products: products };
    await window.dataManager.saveLocal(
        'inventory',
        'products.json',
        inventoryData,
        `Cập nhật sản phẩm - ${name}`
    );
    
    window.showToast('✅ Đã cập nhật sản phẩm', 'success');
    closeModal();
    this.render();
}
async deleteProduct(index) {
    if (!confirm('Xóa sản phẩm này?')) return;
    
    const products = window.dataManager.getInventoryProducts();
    if (index >= products.length) return;
    
    const productName = products[index].name;
    products.splice(index, 1);
    
    // Lưu vào Firebase thông qua DataManager
    const inventoryData = { products: products };
    await window.dataManager.saveLocal(
        'inventory',
        'products.json',
        inventoryData,
        `Xóa sản phẩm - ${productName}`
    );
    
    window.showToast('✅ Đã xóa sản phẩm', 'success');
    closeModal();
    this.render();
}
   

    // **CÁC HÀM UI HỖ TRỢ**
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
    
    // **TOGGLE PURCHASES SECTION**
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
    
    const inventoryData = this.getInventoryForCurrentDate();
    const purchases = inventoryData.purchases;
    
    section.innerHTML = `
        <div class="purchases-list">
            <h4>🛒 MUA HÀNG NGÀY ${this.currentDateDisplay}</h4>
            
            ${purchases.length > 0 ? purchases.map(purchase => `
                <div class="purchase-item">
                    <div class="purchase-info">
                        <div class="purchase-name">${purchase.name}</div>
                        <div class="purchase-details">${purchase.quantity} ${purchase.unit} • ${purchase.type} • ${(purchase.unitPrice || 0).toLocaleString()} ₫/${purchase.unit}</div>
                    </div>
                    <div class="purchase-amount">${purchase.total.toLocaleString()} ₫</div>
                </div>
            `).join('') : `
                <div class="empty-state">
                    <i class="fas fa-receipt"></i>
                    <p>Chưa có mua hàng nào trong ngày</p>
                </div>
            `}
            
            ${purchases.length > 0 ? `
                <div class="purchases-total">
                    <strong>Tổng mua hàng:</strong>
                    <span>${purchases.reduce((sum, p) => sum + (p.total || 0), 0).toLocaleString()} ₫</span>
                </div>
            ` : ''}
        </div>
    `;
}
    // 2. Thêm hàm showOpeningStockModal() vào class
showOpeningStockModal() {
    const modalContent = `
        <div class="modal-header">
            <h2><i class="fas fa-box-open"></i> THÊM TỒN KHO ĐẦU KỲ</h2>
            <button class="modal-close" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div class="modal-date">${this.currentDateDisplay}</div>
            
            <div class="form-group">
                <label>Tên sản phẩm:</label>
                <input type="text" id="openingStockName" placeholder="Nhập tên sản phẩm">
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label>Số lượng:</label>
                    <input type="number" id="openingStockQuantity" placeholder="0" min="0" step="0.01">
                </div>
                <div class="form-group">
                    <label>Đơn vị:</label>
                    <select id="openingStockUnit">
                        <option value="kg">kg</option>
                        <option value="hộp">hộp</option>
                        <option value="gói">gói</option>
                        <option value="lít">lít</option>
                        <option value="cái">cái</option>
                        <option value="thùng">thùng</option>
                        <option value="bịch">bịch</option>
                        <option value="bao">bao</option>
                    </select>
                </div>
            </div>
            
            <div class="form-group">
                <label>Giá trị tồn:</label>
                <div class="input-group">
                    <input type="text" id="openingStockValue" placeholder="0" oninput="window.inventoryModule.formatCurrency(this)">
                </div>
            </div>
            
            <div class="form-group">
                <label>Ghi chú:</label>
                <textarea id="openingStockNote" rows="2" placeholder="Ghi chú về tồn kho đầu kỳ..."></textarea>
            </div>
            
            <button class="btn-primary" onclick="window.inventoryModule.saveOpeningStock()">
                <i class="fas fa-save"></i> 💾 LƯU TỒN KHO
            </button>
            
            <button class="btn-secondary" onclick="closeModal()">
                ĐÓNG
            </button>
        </div>
    `;
    
    window.showModal(modalContent);
}

// 3. Thêm hàm saveOpeningStock() - NHẬP TRỰC TIẾP VÀO PRODUCTS
async saveOpeningStock() {
    try {
        const name = document.getElementById('openingStockName').value.trim();
        const quantity = parseFloat(document.getElementById('openingStockQuantity').value) || 0;
        const unit = document.getElementById('openingStockUnit').value;
        const value = this.getCurrencyValue('openingStockValue');
        const note = document.getElementById('openingStockNote').value.trim();
        
        // Validation
        if (!name) {
            window.showToast('Vui lòng nhập tên sản phẩm', 'warning');
            document.getElementById('openingStockName').focus();
            return;
        }
        
        if (quantity <= 0) {
            window.showToast('Số lượng phải lớn hơn 0', 'warning');
            document.getElementById('openingStockQuantity').focus();
            return;
        }
        
        if (value <= 0) {
            window.showToast('Giá trị phải lớn hơn 0', 'warning');
            document.getElementById('openingStockValue').focus();
            return;
        }
        
        // Lấy danh sách products hiện tại
        const products = window.dataManager.getInventoryProducts();
        
        // Kiểm tra sản phẩm đã tồn tại
        const existingIndex = products.findIndex(p => 
            p.name.toLowerCase() === name.toLowerCase() && p.unit === unit
        );
        
        const today = new Date().toISOString();
        
        if (existingIndex >= 0) {
            // Cập nhật sản phẩm đã có (CỘNG DỒN)
            const currentProduct = products[existingIndex];
            
            // Tính toán mới
            const newQuantity = currentProduct.quantity + quantity;
            const newValue = (currentProduct.totalValue || 0) + value;
            
            // Tạo lịch sử
            const historyEntry = {
                type: 'opening_stock_add',
                date: this.currentDateDisplay,
                quantityAdded: quantity,
                valueAdded: value,
                note: note || 'Bổ sung tồn kho đầu kỳ',
                timestamp: today
            };
            
            products[existingIndex] = {
                ...currentProduct,
                quantity: newQuantity,
                totalValue: newValue,
                unitPrice: newQuantity > 0 ? newValue / newQuantity : 0,
                lastUpdated: today,
                history: [...(currentProduct.history || []), historyEntry]
            };
            
            window.showToast(`✅ Đã bổ sung tồn kho "${name}"`, 'success');
        } else {
            // Thêm sản phẩm mới
            const newProduct = {
                id: Date.now(),
                name: name,
                unit: unit,
                quantity: quantity,
                totalValue: value,
                unitPrice: quantity > 0 ? value / quantity : 0,
                type: 'material',
                addedAt: today,
                lastUpdated: today,
                source: 'opening_stock',
                note: note,
                history: [{
                    type: 'opening_stock',
                    date: this.currentDateDisplay,
                    quantity: quantity,
                    totalValue: value,
                    note: note || 'Nhập tồn kho đầu kỳ',
                    timestamp: today
                }]
            };
            
            products.push(newProduct);
            window.showToast(`✅ Đã thêm "${name}" vào tồn kho`, 'success');
        }
        
        // Lưu vào Firebase thông qua DataManager
        const inventoryData = { 
            products: products,
            lastUpdated: today
        };
        
        await window.dataManager.saveLocal(
            'inventory',
            'products.json',
            inventoryData,
            `Nhập tồn kho đầu kỳ - ${name}`
        );
        
        window.showToast('✅ Đã lưu tồn kho đầu kỳ thành công', 'success');
        closeModal();
        
        // Render lại inventory
        await this.render();
        
    } catch (error) {
        console.error('Error saving opening stock:', error);
        window.showToast('Lỗi khi lưu tồn kho', 'error');
    }
}

// 4. Thêm hàm nhập nhanh (bulk import) nếu cần
showBulkOpeningStockModal() {
    const modalContent = `
        <div class="modal-header">
            <h2><i class="fas fa-file-import"></i> NHẬP NHANH TỒN KHO</h2>
            <button class="modal-close" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div class="modal-subtitle">Nhập nhiều sản phẩm cùng lúc (mỗi dòng một sản phẩm)</div>
            
            <div class="form-group">
                <label>Định dạng:</label>
                <div class="format-guide">
                    <code>Tên sản phẩm, Số lượng, Đơn vị, Giá trị</code>
                    <small>VD: Cà phê hạt Arabica, 10, kg, 5000000</small>
                </div>
            </div>
            
            <div class="form-group">
                <label>Dữ liệu:</label>
                <textarea id="bulkOpeningStockData" rows="10" placeholder="Dán dữ liệu vào đây..."></textarea>
            </div>
            
            <button class="btn-primary" onclick="window.inventoryModule.processBulkOpeningStock()">
                <i class="fas fa-upload"></i> NHẬP DỮ LIỆU
            </button>
            
            <button class="btn-secondary" onclick="closeModal()">
                ĐÓNG
            </button>
        </div>
    `;
    
    window.showModal(modalContent);
}

// 5. Hàm xử lý nhập nhanh
async processBulkOpeningStock() {
    try {
        const dataText = document.getElementById('bulkOpeningStockData').value.trim();
        
        if (!dataText) {
            window.showToast('Vui lòng nhập dữ liệu', 'warning');
            return;
        }
        
        const lines = dataText.split('\n').filter(line => line.trim() !== '');
        let successCount = 0;
        let errorCount = 0;
        
        // Lấy products hiện tại
        const products = window.dataManager.getInventoryProducts();
        const today = new Date().toISOString();
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            try {
                // Phân tích dòng: Tên, Số lượng, Đơn vị, Giá trị
                const parts = line.split(',').map(p => p.trim());
                
                if (parts.length < 4) {
                    console.warn(`Dòng ${i + 1}: Định dạng không đúng`);
                    errorCount++;
                    continue;
                }
                
                const name = parts[0];
                const quantity = parseFloat(parts[1]) || 0;
                const unit = parts[2];
                const value = parseInt(parts[3].replace(/\D/g, '')) || 0;
                
                if (!name || quantity <= 0) {
                    console.warn(`Dòng ${i + 1}: Dữ liệu không hợp lệ`);
                    errorCount++;
                    continue;
                }
                
                // Kiểm tra sản phẩm đã tồn tại
                const existingIndex = products.findIndex(p => 
                    p.name.toLowerCase() === name.toLowerCase() && p.unit === unit
                );
                
                if (existingIndex >= 0) {
                    // Cập nhật sản phẩm đã có
                    const currentProduct = products[existingIndex];
                    products[existingIndex] = {
                        ...currentProduct,
                        quantity: currentProduct.quantity + quantity,
                        totalValue: (currentProduct.totalValue || 0) + value,
                        lastUpdated: today
                    };
                } else {
                    // Thêm sản phẩm mới
                    products.push({
                        id: Date.now() + i,
                        name: name,
                        unit: unit,
                        quantity: quantity,
                        totalValue: value,
                        unitPrice: quantity > 0 ? value / quantity : 0,
                        type: 'material',
                        addedAt: today,
                        lastUpdated: today,
                        source: 'bulk_opening_stock'
                    });
                }
                
                successCount++;
                
            } catch (lineError) {
                console.error(`Lỗi xử lý dòng ${i + 1}:`, lineError);
                errorCount++;
            }
        }
        
        // Lưu tất cả products đã cập nhật
        const inventoryData = { 
            products: products,
            lastUpdated: today
        };
        
        await window.dataManager.saveLocal(
            'inventory',
            'products.json',
            inventoryData,
            `Nhập nhanh ${successCount} sản phẩm tồn kho`
        );
        
        // Hiển thị kết quả
        let message = `✅ Đã nhập ${successCount} sản phẩm`;
        if (errorCount > 0) {
            message += `, ${errorCount} lỗi`;
        }
        
        window.showToast(message, successCount > 0 ? 'success' : 'warning');
        closeModal();
        
        // Render lại inventory
        await this.render();
        
    } catch (error) {
        console.error('Error processing bulk opening stock:', error);
        window.showToast('Lỗi khi nhập dữ liệu', 'error');
    }
}
    // **TOGGLE SERVICES SECTION**
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
    
    const inventoryData = this.getInventoryForCurrentDate();
    const services = inventoryData.services;
    
    section.innerHTML = `
        <div class="services-list">
            <h4>📝 DỊCH VỤ NGÀY ${this.currentDateDisplay}</h4>
            
            ${services.length > 0 ? services.map(service => `
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
            
            ${services.length > 0 ? `
                <div class="services-total">
                    <strong>Tổng dịch vụ:</strong>
                    <span>${services.reduce((sum, s) => sum + (s.amount || 0), 0).toLocaleString()} ₫</span>
                </div>
            ` : ''}
        </div>
    `;
}
    
    // **TOGGLE STATS SECTION**
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
        
        // Tính toán từ dataManager
        const products = window.dataManager.getInventoryProducts();
        const totalValue = products.reduce((sum, p) => sum + (p.totalValue || 0), 0);
        const totalQuantity = products.reduce((sum, p) => sum + p.quantity, 0);
        
        // Tính tổng purchases và services từ tất cả ngày
        let totalPurchases = 0;
        let totalServices = 0;
        let totalDays = 0;
        
        if (window.dataManager.data.inventory.purchases) {
            Object.values(window.dataManager.data.inventory.purchases).forEach(purchaseList => {
                if (Array.isArray(purchaseList)) {
                    purchaseList.forEach(p => totalPurchases += (p.total || 0));
                    totalDays++;
                }
            });
        }
        
        if (window.dataManager.data.inventory.services) {
            Object.values(window.dataManager.data.inventory.services).forEach(serviceList => {
                if (Array.isArray(serviceList)) {
                    serviceList.forEach(s => totalServices += (s.amount || 0));
                }
            });
        }
        
        section.innerHTML = `
            <div class="stats-container">
                <h4>📈 THỐNG KÊ TỔNG QUAN</h4>
                
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
                
                ${products.length > 0 ? `
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
                ` : ''}
            </div>
        `;
    }
    
    // **CÁC HÀM QUẢN LÝ SẢN PHẨM**
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
    
    addProduct() {
        const name = document.getElementById('productName').value.trim();
        const unit = document.getElementById('productUnit').value;
        const quantity = parseFloat(document.getElementById('productQuantity').value) || 0;
        const value = this.getCurrencyValue('productValue');
        
        if (!name) {
            window.showToast('Vui lòng nhập tên sản phẩm', 'warning');
            return;
        }
        
        if (quantity <= 0) {
            window.showToast('Số lượng phải lớn hơn 0', 'warning');
            return;
        }
        
        if (value <= 0) {
            window.showToast('Giá trị phải lớn hơn 0', 'warning');
            return;
        }
        
        const products = window.dataManager.getInventoryProducts();
        const existingIndex = products.findIndex(p => 
            p.name.toLowerCase() === name.toLowerCase() && p.unit === unit
        );
        
        if (existingIndex >= 0) {
            // Cập nhật sản phẩm đã có
            products[existingIndex].quantity += quantity;
            products[existingIndex].totalValue += value;
        } else {
            // Thêm sản phẩm mới
            products.push({
                id: Date.now(),
                name,
                unit,
                quantity,
                totalValue: value,
                addedAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString()
            });
        }
        
        // Lưu lại vào dataManager
        window.dataManager.data.inventory.products = products;
        window.dataManager.saveToLocalStorage();
        
        window.showToast('✅ Đã thêm sản phẩm vào kho', 'success');
        closeModal();
        this.render();
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
                        </div>
                    </div>
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
    
    updateProduct(index) {
        const products = window.dataManager.getInventoryProducts();
        if (index >= products.length) return;
        
        const name = document.getElementById('editProductName').value.trim();
        const unit = document.getElementById('editProductUnit').value;
        const quantity = parseFloat(document.getElementById('editProductQuantity').value) || 0;
        const value = this.getCurrencyValue('editProductValue');
        
        if (!name) {
            window.showToast('Vui lòng nhập tên sản phẩm', 'warning');
            return;
        }
        
        if (quantity < 0) {
            window.showToast('Số lượng không hợp lệ', 'warning');
            return;
        }
        
        if (value < 0) {
            window.showToast('Giá trị không hợp lệ', 'warning');
            return;
        }
        
        products[index] = {
            ...products[index],
            name,
            unit,
            quantity,
            totalValue: value,
            lastUpdated: new Date().toISOString()
        };
        
        window.dataManager.data.inventory.products = products;
        window.dataManager.saveToLocalStorage();
        
        window.showToast('✅ Đã cập nhật sản phẩm', 'success');
        closeModal();
        this.render();
    }
    
    deleteProduct(index) {
        if (!confirm('Xóa sản phẩm này?')) return;
        
        const products = window.dataManager.getInventoryProducts();
        if (index >= products.length) return;
        
        products.splice(index, 1);
        window.dataManager.data.inventory.products = products;
        window.dataManager.saveToLocalStorage();
        
        window.showToast('✅ Đã xóa sản phẩm', 'success');
        closeModal();
        this.render();
    }
    
    async showProductHistory(index) {
    const products = window.dataManager.getInventoryProducts();
    if (index >= products.length) return;
    
    const product = products[index];
    
    // Tìm tất cả purchases (nhập hàng)
    const allPurchases = [];
    if (window.dataManager.data.inventory.purchases) {
        Object.entries(window.dataManager.data.inventory.purchases).forEach(([date, purchaseList]) => {
            if (Array.isArray(purchaseList)) {
                purchaseList.forEach(purchase => {
                    if (purchase.name.toLowerCase() === product.name.toLowerCase() && 
                        purchase.unit === product.unit) {
                        allPurchases.push({
                            ...purchase,
                            date: date
                        });
                    }
                });
            }
        });
    }
    
    // Tìm tất cả exports (xuất hàng)
    const allExports = [];
    const allReports = window.dataManager.getReports();
    
    allReports.forEach(report => {
        if (report.inventoryExports && Array.isArray(report.inventoryExports)) {
            report.inventoryExports.forEach(exportItem => {
                if (exportItem.productId === product.id || 
                    exportItem.product.toLowerCase() === product.name.toLowerCase()) {
                    allExports.push({
                        ...exportItem,
                        date: report.date,
                        reportDate: report.date
                    });
                }
            });
        }
    });
    
    // Sắp xếp theo thời gian
    allPurchases.sort((a, b) => new Date(b.date || b.addedAt) - new Date(a.date || a.addedAt));
    allExports.sort((a, b) => new Date(b.date || b.timestamp) - new Date(a.date || b.timestamp));
    
    const modalContent = `
        <div class="product-history-modal">
            <!-- Header -->
            <div class="product-history-header">
                <h2>
                    <i class="fas fa-history"></i>
                    LỊCH SỬ: ${product.name}
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </h2>
            </div>
            
            <!-- Summary -->
            <div class="product-summary-compact">
                <div class="summary-item-compact">
                    <i class="fas fa-box"></i>
                    <small>Tồn hiện tại</small>
                    <strong>${product.quantity} ${product.unit}</strong>
                </div>
                <div class="summary-item-compact">
                    <i class="fas fa-money-bill-wave"></i>
                    <small>Giá trị</small>
                    <strong>${(product.totalValue || 0).toLocaleString()} ₫</strong>
                </div>
                <div class="summary-item-compact">
                    <i class="fas fa-calendar-alt"></i>
                    <small>Cập nhật</small>
                    <strong>${product.lastUpdated ? new Date(product.lastUpdated).toLocaleDateString('vi-VN') : 'N/A'}</strong>
                </div>
            </div>
            
            <!-- Tabs -->
            <div class="history-tabs-compact">
                <button class="history-tab-btn active" onclick="window.inventoryModule.switchHistoryTab('import')">
                    <i class="fas fa-download"></i> NHẬP (${allPurchases.length})
                </button>
                <button class="history-tab-btn" onclick="window.inventoryModule.switchHistoryTab('export')">
                    <i class="fas fa-upload"></i> XUẤT (${allExports.length})
                </button>
            </div>
            
            <!-- Import Tab -->
            <div class="tab-content-compact" id="importTab">
                <h3><i class="fas fa-download" style="color: #10B981;"></i> LỊCH SỬ NHẬP HÀNG</h3>
                
                ${allPurchases.length > 0 ? `
                    <div class="compact-history-table">
                        <div class="compact-table-header">
                            <span>NGÀY</span>
                            <span>SỐ LƯỢNG</span>
                            <span>THÀNH TIỀN</span>
                            <span>ĐƠN GIÁ</span>
                        </div>
                        
                        ${allPurchases.map(purchase => `
                            <div class="compact-table-row">
                                <span class="history-date-compact">${purchase.date || 'N/A'}</span>
                                <span class="history-quantity">${purchase.quantity} ${purchase.unit}</span>
                                <span class="history-amount-compact">${purchase.total.toLocaleString()} ₫</span>
                                <span class="history-unit-price">${(purchase.unitPrice || purchase.total / purchase.quantity).toLocaleString()} ₫/${purchase.unit}</span>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="history-total-compact">
                        <span>Tổng nhập:</span>
                        <span>${allPurchases.reduce((sum, p) => sum + p.quantity, 0)} ${product.unit}</span>
                        <span>${allPurchases.reduce((sum, p) => sum + p.total, 0).toLocaleString()} ₫</span>
                    </div>
                ` : `
                    <div class="empty-state-compact">
                        <i class="fas fa-inbox"></i>
                        <p>Chưa có lịch sử nhập hàng</p>
                    </div>
                `}
            </div>
            
            <!-- Export Tab -->
            <div class="tab-content-compact" id="exportTab" style="display: none;">
                <h3><i class="fas fa-upload" style="color: #EF4444;"></i> LỊCH SỬ XUẤT HÀNG</h3>
                
                ${allExports.length > 0 ? `
                    <div class="export-history-compact">
                        <div class="export-table-header">
                            <span>NGÀY XUẤT</span>
                            <span>SỐ LƯỢNG</span>
                            <span>BÁO CÁO</span>
                        </div>
                        
                        ${allExports.map(exportItem => `
                            <div class="export-table-row">
                                <span class="history-date-compact">${exportItem.date || 'N/A'}</span>
                                <span class="history-quantity">${exportItem.quantity} ${exportItem.unit || product.unit}</span>
                                <span>
                                    <button class="btn-view-report" onclick="window.reportsModule.loadReport('${exportItem.reportDate}')">
                                        <i class="fas fa-external-link-alt"></i> Xem
                                    </button>
                                </span>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="history-total-compact" style="grid-template-columns: 1fr 0.8fr;">
                        <span>Tổng xuất:</span>
                        <span>${allExports.reduce((sum, e) => sum + e.quantity, 0)} ${product.unit}</span>
                    </div>
                ` : `
                    <div class="empty-state-compact">
                        <i class="fas fa-outbox"></i>
                        <p>Chưa có lịch sử xuất hàng</p>
                    </div>
                `}
            </div>
            
            <!-- Footer -->
            <div class="history-footer-btn">
                <button class="btn-close-compact" onclick="closeModal()">
                    <i class="fas fa-times"></i> ĐÓNG
                </button>
            </div>
        </div>
    `;
    
    window.showModal(modalContent);
}

// Thêm hàm switch tab
switchHistoryTab(tab) {
    const importTab = document.getElementById('importTab');
    const exportTab = document.getElementById('exportTab');
    const tabButtons = document.querySelectorAll('.history-tab-btn');
    
    if (tab === 'import') {
        importTab.style.display = 'block';
        exportTab.style.display = 'none';
        tabButtons[0].classList.add('active');
        tabButtons[1].classList.remove('active');
    } else {
        importTab.style.display = 'none';
        exportTab.style.display = 'block';
        tabButtons[0].classList.remove('active');
        tabButtons[1].classList.add('active');
    }
}

// Thêm hàm chuyển tab
switchProductHistoryTab(tab) {
    const importTab = document.getElementById('importHistoryTab');
    const exportTab = document.getElementById('exportHistoryTab');
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    if (tab === 'import') {
        importTab.style.display = 'block';
        exportTab.style.display = 'none';
        tabButtons[0].classList.add('active');
        tabButtons[1].classList.remove('active');
    } else {
        importTab.style.display = 'none';
        exportTab.style.display = 'block';
        tabButtons[0].classList.remove('active');
        tabButtons[1].classList.add('active');
    }
}
    
    // **SERVICE FUNCTIONS**
    showServiceModal() {
        const modalContent = `
            <div class="modal-header">
                <h2><i class="fas fa-concierge-bell"></i> DỊCH VỤ/CHI PHÍ</h2>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="modal-date">${this.currentDateDisplay}</div>
                
                <div class="form-group">
                    <label>Tên dịch vụ / chi phí:</label>
                    <input type="text" id="serviceName" placeholder="Tiền điện, vệ sinh...">
                </div>
                
                
                <div class="form-group">
                    <label>Số tiền:</label>
                    <div class="input-group">
                        <input type="text" id="serviceAmount" placeholder="0" oninput="window.inventoryModule.formatCurrency(this)">
                    </div>
                </div>
                
                <button class="btn-primary" onclick="window.inventoryModule.saveService()">
                    <i class="fas fa-save"></i> 💾 LƯU DỊCH VỤ
                </button>
                
                <button class="btn-secondary" onclick="closeModal()">
                    ĐÓNG
                </button>
            </div>
        `;
        
        window.showModal(modalContent);
    }
    
    async saveService() {
    try {
        const name = document.getElementById('serviceName').value.trim();
        const note = document.getElementById('serviceNote').value.trim();
        const amount = this.getCurrencyValue('serviceAmount');
        
        if (!name) {
            window.showToast('Vui lòng nhập tên dịch vụ', 'warning');
            document.getElementById('serviceName').focus();
            return;
        }
        
        if (amount <= 0) {
            window.showToast('Số tiền phải lớn hơn 0', 'warning');
            document.getElementById('serviceAmount').focus();
            return;
        }
        
        const serviceData = {
            id: Date.now(),
            date: this.currentDateDisplay,
            name,
            note,
            amount,
            addedAt: new Date().toISOString()
        };
        
        // 1. Cập nhật local data
        const dateKey = this.currentDate;
        const displayDateKey = this.formatDateFromFirebase(dateKey);
        
        if (!window.dataManager.data.inventory.services[displayDateKey]) {
            window.dataManager.data.inventory.services[displayDateKey] = [];
        }
        
        window.dataManager.data.inventory.services[displayDateKey].push(serviceData);
        window.dataManager.saveLocalData();
        
        // 2. Lưu lên Firebase thông qua DataManager
        const servicesData = {
            services: window.dataManager.data.inventory.services[displayDateKey],
            lastUpdated: new Date().toISOString()
        };
        
        await window.dataManager.saveLocal(
            'inventory',
            `services_${dateKey}.json`,
            servicesData,
            `Dịch vụ ngày ${this.currentDateDisplay} - ${name}`
        );
        
        window.showToast('✅ Đã lưu dịch vụ', 'success');
        closeModal();
        
        // Render lại UI
        await this.render();
        
    } catch (error) {
        console.error('Error saving service:', error);
        window.showToast('Lỗi khi lưu dịch vụ', 'error');
    }
}
formatDateFromFirebase(dateKey) {
    try {
        // Chuyển từ yyyy-mm-dd thành dd/mm/yyyy
        if (!dateKey) return '';
        
        // Nếu đã là định dạng dd/mm/yyyy thì trả về luôn
        if (dateKey.includes('/')) {
            return dateKey;
        }
        
        // Xử lý yyyy-mm-dd
        const [year, month, day] = dateKey.split('-');
        
        if (!year || !month || !day) {
            console.warn(`⚠️ Invalid date format: ${dateKey}`);
            return dateKey;
        }
        
        return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
        
    } catch (error) {
        console.error('❌ Error formatting date from Firebase:', error, 'Input:', dateKey);
        return dateKey;
    }
}
}
// Khởi tạo module
window.inventoryModule = new InventoryModule();
// Gọi hàm debug từ console
window.debugInventory = () => window.inventoryModule.debugFirebaseStructure();