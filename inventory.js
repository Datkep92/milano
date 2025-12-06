// inventory.js - Module kho hàng sử dụng DataManager giống Reports
class InventoryModule {
    constructor() {
        this.currentDate = this.formatDateForStorage(new Date());
        this.currentDateDisplay = this.formatDateForDisplay(new Date());
        this.isLoading = false;
        this.cache = {
            inventoryByDate: {}
        };
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

    async render() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        const mainContent = document.getElementById('mainContent');
        
        try {
            // **LẤY DỮ LIỆU TỪ DATAMANAGER - KHÔNG GỌI GITHUB**
            const products = window.dataManager.getInventoryProducts();
            const inventoryData = this.getInventoryForCurrentDate();
            
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

    // **LẤY INVENTORY THEO NGÀY TỪ DATAMANAGER - GIỐNG NHƯ REPORTS**
    getInventoryForCurrentDate() {
        const dateKey = this.currentDate;
        
        // Trả về dữ liệu từ DataManager nếu có
        const purchases = window.dataManager.data?.inventory?.purchases?.[dateKey] || [];
        const services = window.dataManager.data?.inventory?.services?.[dateKey] || [];
        
        return {
            purchases,
            services
        };
    }

    // **THAY ĐỔI NGÀY - CHỈ ĐỔI DỮ LIỆU TRONG BỘ NHỚ, KHÔNG GỌI API**
    async changeDate() {
        const dateInput = document.getElementById('inventoryDate');
        const newDate = dateInput.value;
        
        if (newDate !== this.currentDate) {
            this.currentDate = newDate;
            
            // Format display date
            const [year, month, day] = newDate.split('-');
            this.currentDateDisplay = `${day}/${month}/${year}`;
            
            // Render lại ngay lập tức với dữ liệu mới
            await this.render();
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
                        <option value="goods">Hàng hóa</option>
                        <option value="other">Khác</option>
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
                            <option value="gói">gói</option>
                            <option value="lít">lít</option>
                            <option value="cái">cái</option>
                            <option value="thùng">thùng</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Thành tiền (tổng):</label>
                    <div class="input-group">
                        <input type="text" id="purchaseTotal" placeholder="0" oninput="window.inventoryModule.formatCurrency(this)">
                        <span class="currency">₫</span>
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

    // **LƯU PURCHASE MỚI - GIỐNG NHƯ REPORT SAVE**
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
            
            // 1. CẬP NHẬT LOCAL DATA NGAY LẬP TỨC
            this.updateLocalInventoryData(purchaseData);
            
            // 2. LƯU LÊN GITHUB THÔNG QUA DATAMANAGER (TRONG NỀN)
            await this.saveInventoryToGitHub();
            
            window.showToast('✅ Đã lưu và cập nhật kho thành công', 'success');
            closeModal();
            
            // Render lại UI
            await this.render();
            
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

    // **CẬP NHẬT SẢN PHẨM TỒN KHO**
    updateInventoryProduct(purchaseData) {
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
            } else {
                // Thêm sản phẩm mới
                products.push({
                    id: Date.now(),
                    name: purchaseData.name,
                    unit: purchaseData.unit,
                    quantity: purchaseData.quantity,
                    totalValue: purchaseData.total,
                    type: purchaseData.type,
                    addedAt: new Date().toISOString(),
                    lastUpdated: new Date().toISOString()
                });
            }
            
            // Lưu lại products
            window.dataManager.data.inventory.products = products;
            
        } catch (error) {
            console.error('Error updating inventory product:', error);
        }
    }

    // **LƯU LÊN GITHUB THÔNG QUA DATAMANAGER - GIỐNG REPORTS**
    async saveInventoryToGitHub() {
        try {
            const dateKey = this.currentDate;
            const purchases = window.dataManager.data.inventory.purchases[dateKey] || [];
            const services = window.dataManager.data.inventory.services[dateKey] || [];
            
            const inventoryData = {
                date: this.currentDateDisplay,
                purchases: purchases,
                services: services,
                lastUpdated: new Date().toISOString()
            };
            
            const dataToSave = {
                type: 'inventory',
                data: inventoryData
            };
            
            const message = `Cập nhật inventory ngày ${this.currentDateDisplay} - ${purchases.length} purchases, ${services.length} services`;
            
            // Sử dụng dataManager để sync - sẽ tự động queue nếu offline
            await window.dataManager.syncToGitHub(
                'inventory',
                dateKey,
                dataToSave,
                message
            );
            
            console.log('✅ Inventory saved via DataManager');
            
        } catch (error) {
            console.error('Error saving inventory to GitHub:', error);
            throw error;
        }
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
                
                ${purchases.length > 0 ? `
                    <div class="purchases-total">
                        <strong>Tổng mua hàng:</strong>
                        <span>${purchases.reduce((sum, p) => sum + (p.total || 0), 0).toLocaleString()} ₫</span>
                    </div>
                ` : ''}
            </div>
        `;
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
                            <span class="currency">₫</span>
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
    
    showProductHistory(index) {
        const products = window.dataManager.getInventoryProducts();
        if (index >= products.length) return;
        
        const product = products[index];
        
        // Tìm tất cả purchases có chứa sản phẩm này
        const allPurchases = [];
        if (window.dataManager.data.inventory.purchases) {
            Object.values(window.dataManager.data.inventory.purchases).forEach(purchaseList => {
                if (Array.isArray(purchaseList)) {
                    purchaseList.forEach(purchase => {
                        if (purchase.name.toLowerCase() === product.name.toLowerCase() && 
                            purchase.unit === product.unit) {
                            allPurchases.push(purchase);
                        }
                    });
                }
            });
        }
        
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
                                <span class="history-date">${purchase.date || 'N/A'}</span>
                                <span class="history-detail">${purchase.quantity} ${purchase.unit}</span>
                                <span class="history-amount">${purchase.total.toLocaleString()} ₫</span>
                                <span class="history-unit">${(purchase.unitPrice || purchase.total / purchase.quantity).toLocaleString()} ₫/${purchase.unit}</span>
                            </div>
                        `).join('')}
                    ` : `
                        <div class="empty-state">
                            <i class="fas fa-inbox"></i>
                            <p>Chưa có lịch sử nhập hàng</p>
                        </div>
                    `}
                </div>
                
                ${allPurchases.length > 0 ? `
                    <div class="history-summary">
                        <div><strong>Tổng số lần nhập:</strong> ${allPurchases.length}</div>
                        <div><strong>Tổng nhập:</strong> ${allPurchases.reduce((sum, p) => sum + p.quantity, 0)} ${product.unit}</div>
                        <div><strong>Tổng tiền nhập:</strong> ${allPurchases.reduce((sum, p) => sum + p.total, 0).toLocaleString()} ₫</div>
                    </div>
                ` : ''}
                
                <button class="btn-secondary" onclick="closeModal()">
                    <i class="fas fa-times"></i> ĐÓNG
                </button>
            </div>
        `;
        
        window.showModal(modalContent);
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
                    <label>Ghi chú:</label>
                    <textarea id="serviceNote" placeholder="Ghi chú thêm..." rows="2"></textarea>
                </div>
                
                <div class="form-group">
                    <label>Số tiền:</label>
                    <div class="input-group">
                        <input type="text" id="serviceAmount" placeholder="0" oninput="window.inventoryModule.formatCurrency(this)">
                        <span class="currency">₫</span>
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
            
            if (!window.dataManager.data.inventory.services[dateKey]) {
                window.dataManager.data.inventory.services[dateKey] = [];
            }
            
            window.dataManager.data.inventory.services[dateKey].push(serviceData);
            window.dataManager.saveToLocalStorage();
            
            // 2. Lưu lên GitHub
            await this.saveInventoryToGitHub();
            
            window.showToast('✅ Đã lưu dịch vụ', 'success');
            closeModal();
            
            // Render lại UI
            await this.render();
            
        } catch (error) {
            console.error('Error saving service:', error);
            window.showToast('Lỗi khi lưu dịch vụ', 'error');
        }
    }
}

// Khởi tạo module
window.inventoryModule = new InventoryModule();