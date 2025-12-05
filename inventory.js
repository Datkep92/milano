// inventory-enhanced.js - Hệ thống quản lý kho hàng nâng cao
class InventoryManager {
    constructor() {
        this.currentPeriod = this.getCurrentPeriod(); // Kỳ hiện tại
        this.inventory = [];
        this.purchaseHistory = [];
        this.serviceHistory = [];
        this.productHistory = new Map(); // Lưu lịch sử theo sản phẩm
        this.initialize();
    }

    async initialize() {
        console.log('📦 Khởi tạo Inventory Manager...');
        await this.loadInventory();
        await this.loadHistory();
        this.setupEventListeners();
        this.generatePeriodSelect();
        this.updateStatistics();
        this.displayInventory();
    }

    setupEventListeners() {
        // Nhập kho
        document.getElementById('importInventoryBtn')?.addEventListener('click', () => {
            this.openPurchaseModal();
        });

        // Dịch vụ/chi phí
        document.getElementById('addServiceBtn')?.addEventListener('click', () => {
            this.openServiceModal();
        });

        // Xem lịch sử
        document.getElementById('togglePurchaseHistory')?.addEventListener('click', () => {
            this.toggleHistory('purchase');
        });

        document.getElementById('toggleServiceHistory')?.addEventListener('click', () => {
            this.toggleHistory('service');
        });

        // Lưu nhập kho
        document.getElementById('savePurchaseBtn')?.addEventListener('click', () => {
            this.savePurchase();
        });

        // Lưu dịch vụ
        document.getElementById('saveServiceBtn')?.addEventListener('click', () => {
            this.saveService();
        });

        // Chọn kỳ
        document.getElementById('periodSelect')?.addEventListener('change', (e) => {
            this.currentPeriod = e.target.value;
            this.updateStatistics();
            this.displayInventory();
        });

        // Tìm kiếm sản phẩm
        document.getElementById('productSearch')?.addEventListener('input', (e) => {
            this.filterInventory(e.target.value);
        });
    }

    // Lấy kỳ hiện tại (Tháng/Năm)
    getCurrentPeriod() {
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();
        return `${year}-${month.toString().padStart(2, '0')}`;
    }

    // Tạo danh sách kỳ (12 tháng gần nhất)
    generatePeriodSelect() {
        const select = document.getElementById('periodSelect');
        if (!select) return;

        const now = new Date();
        select.innerHTML = '';

        for (let i = 0; i < 12; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const month = date.getMonth() + 1;
            const year = date.getFullYear();
            const period = `${year}-${month.toString().padStart(2, '0')}`;
            const display = `Tháng ${month}/${year}`;
            
            const option = document.createElement('option');
            option.value = period;
            option.textContent = display;
            if (period === this.currentPeriod) {
                option.selected = true;
            }
            select.appendChild(option);
        }
    }

    async loadInventory() {
        try {
            const products = await dataManager.getAllProducts();
            this.inventory = products;
            console.log(`📦 Đã tải ${products.length} sản phẩm`);
        } catch (error) {
            console.error('Lỗi tải kho hàng:', error);
            this.inventory = [];
        }
    }

    async loadHistory() {
        try {
            // Lấy lịch sử từ localStorage
            const purchaseHistory = JSON.parse(localStorage.getItem('purchase_history') || '[]');
            const serviceHistory = JSON.parse(localStorage.getItem('service_history') || '[]');
            
            this.purchaseHistory = purchaseHistory;
            this.serviceHistory = serviceHistory;
            
            // Xây dựng lịch sử theo sản phẩm
            this.buildProductHistory();
            
            console.log(`📥 Lịch sử nhập kho: ${purchaseHistory.length} giao dịch`);
            console.log(`📤 Lịch sử dịch vụ: ${serviceHistory.length} giao dịch`);
            
        } catch (error) {
            console.error('Lỗi tải lịch sử:', error);
            this.purchaseHistory = [];
            this.serviceHistory = [];
        }
    }

    buildProductHistory() {
        this.productHistory.clear();
        
        this.purchaseHistory.forEach(transaction => {
            if (transaction.type === 'purchase' && transaction.product) {
                const productId = transaction.product.id || transaction.product.name;
                if (!this.productHistory.has(productId)) {
                    this.productHistory.set(productId, []);
                }
                this.productHistory.get(productId).push({
                    type: 'purchase',
                    date: transaction.date,
                    quantity: transaction.quantity,
                    price: transaction.price,
                    total: transaction.total,
                    note: transaction.note
                });
            }
        });

        // Thêm lịch sử xuất kho từ báo cáo
        this.loadExportHistory();
    }

    async loadExportHistory() {
        try {
            const allReports = await dataManager.getAllReports();
            
            allReports.forEach(report => {
                if (report.inventory && Array.isArray(report.inventory)) {
                    report.inventory.forEach(item => {
                        const productId = item.id || item.name;
                        if (!this.productHistory.has(productId)) {
                            this.productHistory.set(productId, []);
                        }
                        this.productHistory.get(productId).push({
                            type: 'export',
                            date: report.date,
                            quantity: item.quantity || 1,
                            price: item.price || 0,
                            total: (item.quantity || 1) * (item.price || 0),
                            reportId: report.id
                        });
                    });
                }
            });
        } catch (error) {
            console.error('Lỗi tải lịch sử xuất kho:', error);
        }
    }

    // Mở modal nhập kho
    openPurchaseModal(date = null) {
        const modal = document.getElementById('purchaseModal');
        if (modal) {
            modal.style.display = 'block';
            
            // Đặt ngày mặc định
            const dateInput = document.getElementById('purchaseDate');
            if (date) {
                dateInput.value = date;
            } else {
                dateInput.value = new Date().toISOString().split('T')[0];
            }
            
            // Reset form
            document.getElementById('productName').value = '';
            document.getElementById('productUnit').value = '';
            document.getElementById('purchaseQuantity').value = '';
            document.getElementById('purchasePrice').value = '';
            document.getElementById('purchaseTotal').value = '';
            document.getElementById('purchaseNote').value = '';
            
            // Tự động tính tổng
            document.getElementById('purchasePrice').addEventListener('input', this.calculatePurchaseTotal.bind(this));
            document.getElementById('purchaseQuantity').addEventListener('input', this.calculatePurchaseTotal.bind(this));
            
            // Tự động điền đơn vị nếu có sản phẩm
            document.getElementById('productName').addEventListener('change', (e) => {
                this.autoFillProductInfo(e.target.value);
            });
        }
    }

    // Mở modal dịch vụ
    openServiceModal(date = null) {
        const modal = document.getElementById('serviceModal');
        if (modal) {
            modal.style.display = 'block';
            
            // Đặt ngày mặc định
            const dateInput = document.getElementById('serviceDate');
            if (date) {
                dateInput.value = date;
            } else {
                dateInput.value = new Date().toISOString().split('T')[0];
            }
            
            // Reset form
            document.getElementById('serviceName').value = '';
            document.getElementById('serviceAmount').value = '';
            document.getElementById('serviceNote').value = '';
        }
    }

    // Hiển thị kho hàng
    displayInventory() {
        const container = document.getElementById('inventoryTabList');
        if (!container) return;

        // Lọc theo kỳ
        const periodInventory = this.getInventoryByPeriod(this.currentPeriod);
        
        if (periodInventory.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-boxes"></i>
                    <p>Không có sản phẩm nào trong kỳ này</p>
                    <button onclick="inventoryManager.openPurchaseModal()" class="primary-btn">
                        <i class="fas fa-plus"></i> Nhập kho đầu tiên
                    </button>
                </div>
            `;
            return;
        }

        let html = `
            <div class="inventory-controls">
                <div class="search-box">
                    <i class="fas fa-search"></i>
                    <input type="text" id="productSearch" placeholder="Tìm kiếm sản phẩm...">
                </div>
            </div>
            
            <div class="table-responsive">
                <table class="inventory-table">
                    <thead>
                        <tr>
                            <th width="5%">#</th>
                            <th width="30%">Tên sản phẩm</th>
                            <th width="10%">ĐVT</th>
                            <th width="15%">Số lượng</th>
                            <th width="20%">Thành tiền</th>
                            <th width="20%">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        let totalValue = 0;
        
        periodInventory.forEach((product, index) => {
            const productValue = (product.stock || 0) * (product.price || 0);
            totalValue += productValue;
            
            html += `
                <tr>
                    <td>${index + 1}</td>
                    <td>
                        <div class="product-info">
                            <strong>${product.name}</strong>
                            ${product.category ? `<span class="product-category">${product.category}</span>` : ''}
                        </div>
                    </td>
                    <td>${product.unit || 'cái'}</td>
                    <td>
                        <div class="stock-info">
                            <span class="stock-amount">${product.stock || 0}</span>
                            ${product.minStock && product.stock <= product.minStock ? 
                                '<span class="low-stock-badge">Sắp hết</span>' : ''}
                        </div>
                    </td>
                    <td class="price-cell">${this.formatCurrency(productValue)}</td>
                    <td>
                        <div class="product-actions">
                            <button class="small-btn" onclick="inventoryManager.viewProductHistory(${JSON.stringify(product).replace(/"/g, '&quot;')})">
                                <i class="fas fa-history"></i> Lịch sử
                            </button>
                            <button class="small-btn secondary" onclick="inventoryManager.editProduct(${JSON.stringify(product).replace(/"/g, '&quot;')})">
                                <i class="fas fa-edit"></i> Sửa
                            </button>
                            <button class="small-btn danger" onclick="inventoryManager.deleteProduct(${product.id})">
                                <i class="fas fa-trash"></i> Xóa
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="4" class="text-right"><strong>Tổng giá trị tồn kho:</strong></td>
                            <td colspan="2" class="total-value">${this.formatCurrency(totalValue)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            
            <div class="inventory-summary">
                <div class="summary-card">
                    <i class="fas fa-box-open"></i>
                    <div>
                        <div class="summary-label">Tổng sản phẩm</div>
                        <div class="summary-value">${periodInventory.length}</div>
                    </div>
                </div>
                <div class="summary-card">
                    <i class="fas fa-cubes"></i>
                    <div>
                        <div class="summary-label">Tổng số lượng</div>
                        <div class="summary-value">${periodInventory.reduce((sum, p) => sum + (p.stock || 0), 0)}</div>
                    </div>
                </div>
                <div class="summary-card highlight">
                    <i class="fas fa-money-bill-wave"></i>
                    <div>
                        <div class="summary-label">Tổng giá trị</div>
                        <div class="summary-value">${this.formatCurrency(totalValue)}</div>
                    </div>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
    }

    // Cập nhật thống kê
    updateStatistics() {
        const periodStats = this.getPeriodStatistics(this.currentPeriod);
        const statsElement = document.getElementById('inventoryStats');
        
        if (statsElement) {
            statsElement.innerHTML = `
                <div class="period-statistics">
                    <div class="period-header">
                        <h3><i class="fas fa-chart-bar"></i> Thống kê Kỳ ${this.formatPeriod(this.currentPeriod)}</h3>
                        <span class="period-formula">Công thức: 20N-19N+1 = 1 kỳ</span>
                    </div>
                    
                    <div class="stat-cards">
                        <div class="stat-card">
                            <div class="stat-icon">
                                <i class="fas fa-arrow-down"></i>
                            </div>
                            <div class="stat-content">
                                <div class="stat-label">Nhập kho</div>
                                <div class="stat-value">${periodStats.totalPurchases} sản phẩm</div>
                                <div class="stat-amount positive">${this.formatCurrency(periodStats.purchaseValue)}</div>
                            </div>
                        </div>
                        
                        <div class="stat-card">
                            <div class="stat-icon">
                                <i class="fas fa-arrow-up"></i>
                            </div>
                            <div class="stat-content">
                                <div class="stat-label">Xuất kho</div>
                                <div class="stat-value">${periodStats.totalExports} sản phẩm</div>
                                <div class="stat-amount negative">${this.formatCurrency(periodStats.exportValue)}</div>
                            </div>
                        </div>
                        
                        <div class="stat-card">
                            <div class="stat-icon">
                                <i class="fas fa-exchange-alt"></i>
                            </div>
                            <div class="stat-content">
                                <div class="stat-label">Tổng giao dịch</div>
                                <div class="stat-value">${periodStats.totalTransactions}</div>
                                <div class="stat-detail">${periodStats.purchaseCount} nhập / ${periodStats.exportCount} xuất</div>
                            </div>
                        </div>
                        
                        <div class="stat-card highlight">
                            <div class="stat-icon">
                                <i class="fas fa-warehouse"></i>
                            </div>
                            <div class="stat-content">
                                <div class="stat-label">Tổng tồn kho</div>
                                <div class="stat-value">${this.formatCurrency(periodStats.inventoryValue)}</div>
                                <div class="stat-detail">${periodStats.totalProducts} sản phẩm</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="history-controls">
                        <button id="togglePurchaseHistory" class="small-btn">
                            <i class="fas fa-shopping-cart"></i> Lịch sử mua hàng
                        </button>
                        <button id="toggleServiceHistory" class="small-btn">
                            <i class="fas fa-concierge-bell"></i> Lịch sử dịch vụ
                        </button>
                    </div>
                    
                    <div id="purchaseHistory" class="history-section" style="display: none;">
                        <h4><i class="fas fa-shopping-cart"></i> Lịch sử mua hàng</h4>
                        <div id="purchaseHistoryContent"></div>
                    </div>
                    
                    <div id="serviceHistory" class="history-section" style="display: none;">
                        <h4><i class="fas fa-concierge-bell"></i> Lịch sử dịch vụ/chi phí</h4>
                        <div id="serviceHistoryContent"></div>
                    </div>
                </div>
            `;
            
            // Cập nhật lịch sử
            this.displayPurchaseHistory();
            this.displayServiceHistory();
            
            // Setup lại event listeners
            this.setupEventListeners();
        }
    }

    // Lấy thống kê theo kỳ
    getPeriodStatistics(period) {
        const [year, month] = period.split('-').map(Number);
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        
        // Lọc giao dịch trong kỳ
        const periodPurchases = this.purchaseHistory.filter(t => {
            const transDate = new Date(t.date);
            return transDate >= startDate && transDate <= endDate;
        });
        
        const periodServices = this.serviceHistory.filter(t => {
            const transDate = new Date(t.date);
            return transDate >= startDate && transDate <= endDate;
        });
        
        // Tính xuất kho từ báo cáo
        let totalExports = 0;
        let exportValue = 0;
        let exportCount = 0;
        
        // Lấy kho hàng trong kỳ
        const periodInventory = this.getInventoryByPeriod(period);
        
        return {
            totalPurchases: periodPurchases.reduce((sum, t) => sum + (t.quantity || 0), 0),
            purchaseValue: periodPurchases.reduce((sum, t) => sum + (t.total || 0), 0),
            purchaseCount: periodPurchases.length,
            totalExports: totalExports,
            exportValue: exportValue,
            exportCount: exportCount,
            serviceCount: periodServices.length,
            serviceValue: periodServices.reduce((sum, t) => sum + (t.amount || 0), 0),
            totalTransactions: periodPurchases.length + exportCount + periodServices.length,
            inventoryValue: periodInventory.reduce((sum, p) => sum + (p.stock || 0) * (p.price || 0), 0),
            totalProducts: periodInventory.length
        };
    }

    // Lấy kho hàng theo kỳ
    getInventoryByPeriod(period) {
        // Lọc sản phẩm còn tồn trong kỳ
        return this.inventory.filter(product => {
            // Kiểm tra xem sản phẩm có tồn tại trong kỳ này không
            const productHistory = this.productHistory.get(product.id || product.name) || [];
            const hasHistoryInPeriod = productHistory.some(h => {
                const [year, month] = period.split('-').map(Number);
                const transDate = new Date(h.date);
                return transDate.getFullYear() === year && (transDate.getMonth() + 1) === month;
            });
            
            return hasHistoryInPeriod || (product.stock || 0) > 0;
        });
    }

    // Hiển thị lịch sử mua hàng
    displayPurchaseHistory() {
        const container = document.getElementById('purchaseHistoryContent');
        if (!container) return;
        
        const [year, month] = this.currentPeriod.split('-').map(Number);
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        
        const periodPurchases = this.purchaseHistory.filter(t => {
            const transDate = new Date(t.date);
            return transDate >= startDate && transDate <= endDate;
        }).sort((a, b) => new Date(b.date) - new Date(a.date));
        
        if (periodPurchases.length === 0) {
            container.innerHTML = '<p class="no-data">Không có giao dịch nào</p>';
            return;
        }
        
        let html = '<div class="history-list">';
        
        periodPurchases.forEach((purchase, index) => {
            html += `
                <div class="history-item">
                    <div class="history-date">
                        <i class="far fa-calendar"></i>
                        ${this.formatDate(purchase.date)}
                    </div>
                    <div class="history-details">
                        <div class="history-product">
                            <strong>${purchase.product?.name || purchase.productName || 'Không tên'}</strong>
                            <span class="history-quantity">${purchase.quantity} ${purchase.product?.unit || 'cái'}</span>
                        </div>
                        <div class="history-info">
                            ${purchase.note ? `<div class="history-note">${purchase.note}</div>` : ''}
                            <div class="history-amount positive">${this.formatCurrency(purchase.total)}</div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
    }

    // Hiển thị lịch sử dịch vụ
    displayServiceHistory() {
        const container = document.getElementById('serviceHistoryContent');
        if (!container) return;
        
        const [year, month] = this.currentPeriod.split('-').map(Number);
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        
        const periodServices = this.serviceHistory.filter(t => {
            const transDate = new Date(t.date);
            return transDate >= startDate && transDate <= endDate;
        }).sort((a, b) => new Date(b.date) - new Date(a.date));
        
        if (periodServices.length === 0) {
            container.innerHTML = '<p class="no-data">Không có giao dịch nào</p>';
            return;
        }
        
        let html = '<div class="history-list">';
        
        periodServices.forEach((service, index) => {
            html += `
                <div class="history-item">
                    <div class="history-date">
                        <i class="far fa-calendar"></i>
                        ${this.formatDate(service.date)}
                    </div>
                    <div class="history-details">
                        <div class="history-product">
                            <strong>${service.name || 'Không tên'}</strong>
                            <span class="history-type">${service.type || 'Dịch vụ'}</span>
                        </div>
                        <div class="history-info">
                            ${service.note ? `<div class="history-note">${service.note}</div>` : ''}
                            <div class="history-amount negative">${this.formatCurrency(service.amount)}</div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
    }

    // Toggle hiển thị lịch sử
    toggleHistory(type) {
        const element = document.getElementById(`${type}History`);
        if (element) {
            const isVisible = element.style.display !== 'none';
            element.style.display = isVisible ? 'none' : 'block';
            
            const btn = document.getElementById(`toggle${type.charAt(0).toUpperCase() + type.slice(1)}History`);
            if (btn) {
                btn.innerHTML = isVisible ? 
                    `<i class="fas fa-${type === 'purchase' ? 'shopping-cart' : 'concierge-bell'}"></i> Lịch sử ${type === 'purchase' ? 'mua hàng' : 'dịch vụ'}` :
                    `<i class="fas fa-eye-slash"></i> Ẩn lịch sử`;
            }
        }
    }

    // Tự động điền thông tin sản phẩm
    autoFillProductInfo(productName) {
        const product = this.inventory.find(p => p.name === productName);
        if (product) {
            document.getElementById('productUnit').value = product.unit || '';
            document.getElementById('purchasePrice').value = product.price || '';
        }
    }

    // Tính tổng tiền nhập kho
    calculatePurchaseTotal() {
        const quantity = parseFloat(document.getElementById('purchaseQuantity').value) || 0;
        const price = parseFloat(document.getElementById('purchasePrice').value) || 0;
        const total = quantity * price;
        document.getElementById('purchaseTotal').value = total.toFixed(0);
    }

    // Lưu nhập kho
    async savePurchase() {
        const date = document.getElementById('purchaseDate').value;
        const productName = document.getElementById('productName').value.trim();
        const unit = document.getElementById('productUnit').value.trim();
        const quantity = parseFloat(document.getElementById('purchaseQuantity').value) || 0;
        const price = parseFloat(document.getElementById('purchasePrice').value) || 0;
        const total = parseFloat(document.getElementById('purchaseTotal').value) || 0;
        const note = document.getElementById('purchaseNote').value.trim();
        
        if (!productName || !quantity || !price) {
            alert('Vui lòng nhập đầy đủ thông tin sản phẩm');
            return;
        }
        
        try {
            // Tìm hoặc tạo sản phẩm
            let product = this.inventory.find(p => p.name === productName);
            
            if (!product) {
                // Tạo sản phẩm mới
                product = {
                    name: productName,
                    unit: unit,
                    price: price,
                    stock: quantity,
                    category: 'Nguyên liệu'
                };
                
                // Lưu vào database
                const savedProduct = await dataManager.saveProduct(product);
                product.id = savedProduct.id;
                this.inventory.push(product);
            } else {
                // Cập nhật số lượng và giá
                product.stock = (product.stock || 0) + quantity;
                product.price = price; // Cập nhật giá mới nhất
                product.unit = unit || product.unit;
                
                await dataManager.updateProductStock(product.id, quantity);
            }
            
            // Lưu lịch sử nhập kho
            const purchaseRecord = {
                type: 'purchase',
                date: date,
                product: {
                    id: product.id,
                    name: productName,
                    unit: unit
                },
                quantity: quantity,
                price: price,
                total: total,
                note: note,
                timestamp: new Date().toISOString()
            };
            
            this.purchaseHistory.push(purchaseRecord);
            localStorage.setItem('purchase_history', JSON.stringify(this.purchaseHistory));
            
            // Lưu lịch sử sản phẩm
            if (!this.productHistory.has(product.id || productName)) {
                this.productHistory.set(product.id || productName, []);
            }
            this.productHistory.get(product.id || productName).push({
                type: 'purchase',
                date: date,
                quantity: quantity,
                price: price,
                total: total,
                note: note
            });
            
            // Lưu lên GitHub
            await this.savePurchaseToGitHub(purchaseRecord);
            
            // Cập nhật UI
            this.updateStatistics();
            this.displayInventory();
            
            // Đóng modal
            this.closeModals();
            
            alert('Đã lưu nhập kho thành công');
            
        } catch (error) {
            console.error('Lỗi lưu nhập kho:', error);
            alert('Lỗi: ' + error.message);
        }
    }

    // Lưu dịch vụ/chi phí
    async saveService() {
        const date = document.getElementById('serviceDate').value;
        const name = document.getElementById('serviceName').value.trim();
        const amount = parseFloat(document.getElementById('serviceAmount').value) || 0;
        const note = document.getElementById('serviceNote').value.trim();
        
        if (!name || !amount) {
            alert('Vui lòng nhập đầy đủ thông tin');
            return;
        }
        
        try {
            const serviceRecord = {
                type: 'service',
                date: date,
                name: name,
                amount: amount,
                note: note,
                timestamp: new Date().toISOString()
            };
            
            this.serviceHistory.push(serviceRecord);
            localStorage.setItem('service_history', JSON.stringify(this.serviceHistory));
            
            // Lưu lên GitHub
            await this.saveServiceToGitHub(serviceRecord);
            
            // Cập nhật thống kê
            this.updateStatistics();
            
            // Đóng modal
            this.closeModals();
            
            alert('Đã lưu dịch vụ/chi phí thành công');
            
        } catch (error) {
            console.error('Lỗi lưu dịch vụ:', error);
            alert('Lỗi: ' + error.message);
        }
    }

    // Xem lịch sử sản phẩm
    viewProductHistory(product) {
        const history = this.productHistory.get(product.id || product.name) || [];
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-history"></i> Lịch sử: ${product.name}</h3>
                    <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="product-history">
                        <div class="product-summary">
                            <p><strong>ĐVT:</strong> ${product.unit || 'cái'}</p>
                            <p><strong>Tồn kho:</strong> ${product.stock || 0}</p>
                            <p><strong>Giá:</strong> ${this.formatCurrency(product.price || 0)}</p>
                            <p><strong>Thành tiền:</strong> ${this.formatCurrency((product.stock || 0) * (product.price || 0))}</p>
                        </div>
                        
                        <h4><i class="fas fa-exchange-alt"></i> Lịch sử giao dịch</h4>
                        <div class="history-timeline">
                            ${history.length === 0 ? 
                                '<p class="no-data">Chưa có giao dịch</p>' :
                                history.sort((a, b) => new Date(b.date) - new Date(a.date))
                                    .map(record => this.renderHistoryRecord(record)).join('')
                            }
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn" onclick="this.closest('.modal').remove()">Đóng</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.style.display = 'block';
    }

    renderHistoryRecord(record) {
        const typeIcon = record.type === 'purchase' ? 
            '<i class="fas fa-arrow-down positive"></i>' : 
            '<i class="fas fa-arrow-up negative"></i>';
        
        return `
            <div class="timeline-item ${record.type}">
                <div class="timeline-date">${this.formatDate(record.date)}</div>
                <div class="timeline-content">
                    <div class="timeline-header">
                        <span class="timeline-type">${typeIcon} ${record.type === 'purchase' ? 'Nhập kho' : 'Xuất kho'}</span>
                        <span class="timeline-quantity">${record.quantity} ${record.unit || 'cái'}</span>
                    </div>
                    <div class="timeline-details">
                        ${record.note ? `<p class="timeline-note">${record.note}</p>` : ''}
                        <div class="timeline-amount">
                            ${record.type === 'purchase' ? 
                                `<span class="positive">+${this.formatCurrency(record.total)}</span>` :
                                `<span class="negative">-${this.formatCurrency(record.total)}</span>`
                            }
                            <span class="timeline-price">(${this.formatCurrency(record.price)}/đơn vị)</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Lưu lên GitHub
    async savePurchaseToGitHub(purchaseRecord) {
        if (!githubManager.initialized) return;
        
        try {
            const date = purchaseRecord.date;
            const fileName = `purchases/${date}/${Date.now()}.json`;
            const content = JSON.stringify(purchaseRecord, null, 2);
            
            await githubManager.saveFile(fileName, content, null, `Nhập kho: ${purchaseRecord.product.name}`);
            console.log('✅ Đã lưu nhập kho lên GitHub');
            
        } catch (error) {
            console.error('Lỗi lưu nhập kho lên GitHub:', error);
        }
    }

    async saveServiceToGitHub(serviceRecord) {
        if (!githubManager.initialized) return;
        
        try {
            const date = serviceRecord.date;
            const fileName = `services/${date}/${Date.now()}.json`;
            const content = JSON.stringify(serviceRecord, null, 2);
            
            await githubManager.saveFile(fileName, content, null, `Dịch vụ: ${serviceRecord.name}`);
            console.log('✅ Đã lưu dịch vụ lên GitHub');
            
        } catch (error) {
            console.error('Lỗi lưu dịch vụ lên GitHub:', error);
        }
    }

    // Đóng modal
    closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            if (modal.id !== 'employeeDetailModal' && 
                modal.id !== 'reportDetailModal' &&
                modal.id !== 'deleteReportModal') {
                modal.style.display = 'none';
            }
        });
    }

    // Format tiền
    formatCurrency(amount) {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    }

    // Format ngày
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN');
    }

    // Format kỳ
    formatPeriod(period) {
        const [year, month] = period.split('-');
        return `Tháng ${month}/${year}`;
    }

    // Tìm kiếm sản phẩm
    filterInventory(searchTerm) {
        const rows = document.querySelectorAll('.inventory-table tbody tr');
        const term = searchTerm.toLowerCase();
        
        rows.forEach(row => {
            const productName = row.cells[1].textContent.toLowerCase();
            row.style.display = productName.includes(term) ? '' : 'none';
        });
    }
}

// Thêm method mới vào DataManager
DataManager.prototype.saveProduct = async function(productData) {
    return new Promise((resolve, reject) => {
        if (!this.db) {
            reject(new Error('Database chưa được khởi tạo'));
            return;
        }
        
        const transaction = this.db.transaction(['products'], 'readwrite');
        const store = transaction.objectStore('products');
        
        productData.createdAt = new Date().toISOString();
        
        const request = store.add(productData);
        
        request.onsuccess = () => {
            resolve({...productData, id: request.result});
        };
        
        request.onerror = (event) => {
            reject(new Error('Lỗi lưu sản phẩm: ' + event.target.error));
        };
    });
};

DataManager.prototype.updateProduct = async function(productData) {
    return new Promise((resolve, reject) => {
        if (!this.db) {
            reject(new Error('Database chưa được khởi tạo'));
            return;
        }
        
        const transaction = this.db.transaction(['products'], 'readwrite');
        const store = transaction.objectStore('products');
        
        const request = store.put(productData);
        
        request.onsuccess = () => {
            resolve(productData);
        };
        
        request.onerror = (event) => {
            reject(new Error('Lỗi cập nhật sản phẩm: ' + event.target.error));
        };
    });
};

DataManager.prototype.deleteProduct = async function(productId) {
    return new Promise((resolve, reject) => {
        if (!this.db) {
            reject(new Error('Database chưa được khởi tạo'));
            return;
        }
        
        const transaction = this.db.transaction(['products'], 'readwrite');
        const store = transaction.objectStore('products');
        
        const request = store.delete(parseInt(productId));
        
        request.onsuccess = () => {
            resolve(true);
        };
        
        request.onerror = (event) => {
            reject(new Error('Lỗi xóa sản phẩm: ' + event.target.error));
        };
    });
};

// Khởi tạo Inventory Manager toàn cục
let inventoryManager = null;

// Khởi tạo khi tab được mở
function initInventoryManager() {
    if (!inventoryManager) {
        inventoryManager = new InventoryManager();
    }
    return inventoryManager;
}

// Tự động khởi tạo khi DOM sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('inventoryTab')) {
        setTimeout(() => {
            inventoryManager = new InventoryManager();
        }, 500);
    }
});