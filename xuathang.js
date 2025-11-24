// xuathang.js (đã sửa lỗi)

// Khai báo biến toàn cục
window.exportInventory = window.exportInventory || [];
let exportCart = [];
let currentExportData = null;

async function loadInventoryForExport() {
    try {
        console.log('📦 Loading inventory for export...');
        const snapshot = await db.collection('inventory')
            .where('companyId', '==', 'milano')
            .get();

        window.exportInventory = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })).sort((a, b) => a.productName.localeCompare(b.productName));

        console.log('📦 Inventory loaded:', window.exportInventory.length, 'items');
        return window.exportInventory;
        
    } catch (error) {
        console.error('❌ Error loading inventory:', error);
        showToast('Lỗi tải kho hàng', 'error');
        return [];
    }
}

function displayInventoryForExport(inventory) {
    const container = getElement('inventoryExportList');
    
    if (!inventory || inventory.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📦</div>
                <div>Kho hàng trống</div>
                <small>Vui lòng nhập hàng trước khi xuất kho</small>
            </div>
        `;
        return;
    }

    container.innerHTML = inventory.map(item => {
        const inCart = exportCart.find(cartItem => cartItem.id === item.id);
        const cartQuantity = inCart ? inCart.exportQuantity : 0;
        const remaining = item.quantity - cartQuantity;
        
        return `
            <div class="inventory-export-item ${remaining <= 0 ? 'out-of-stock' : ''}">
                <div class="product-info">
                    <div class="product-name">${item.productName}</div>
                    <div class="product-stock">
                        Tồn kho: <strong>${item.quantity} ${item.unit}</strong>
                        ${cartQuantity > 0 ? `<span class="in-cart">(Đang xuất: ${cartQuantity})</span>` : ''}
                    </div>
                    <div class="product-price">
                        Giá: ${formatCurrency(item.unitPrice)}/${item.unit}
                    </div>
                </div>
                
                <div class="export-controls">
                    ${remaining > 0 ? `
                        <div class="quantity-controls">
                            <button class="btn-quantity" onclick="decreaseExportQuantity('${item.id}')" ${cartQuantity <= 0 ? 'disabled' : ''}>-</button>
                            <span class="quantity-display">${cartQuantity}</span>
                            <button class="btn-quantity" onclick="increaseExportQuantity('${item.id}', ${remaining})">+</button>
                        </div>
                        <button class="btn-add-to-cart" onclick="addToExportCart('${item.id}')">
                            🛒 Thêm
                        </button>
                    ` : `
                        <div class="out-of-stock-label">HẾT HÀNG</div>
                    `}
                </div>
            </div>
        `;
    }).join('');
}

function openExportInventoryPopup() {
    console.log('🛒 Opening export inventory popup');
    
    // Reset cart
    exportCart = [];
    
    // Load inventory and display
    loadInventoryForExport().then(inventory => {
        displayInventoryForExport(window.exportInventory);
        updateExportCartDisplay();
        getElement('exportInventoryPopup').classList.add('active');
    });
}

// Các hàm khác giữ nguyên...



// Các hàm khác cũng sử dụng exportInventory thay vì exportInventory
function addToExportCart(productId) {
    const product = exportInventory.find(item => item.id === productId); // Dùng exportInventory
    if (!product) return;

    const existingItem = exportCart.find(item => item.id === productId);
    
    if (existingItem) {
        if (existingItem.exportQuantity < product.quantity) {
            existingItem.exportQuantity += 1;
            showToast(`Đã thêm ${product.productName} vào giỏ xuất`, 'success');
        } else {
            showToast(`${product.productName} đã đạt số lượng tối đa`, 'warning');
        }
    } else {
        if (product.quantity > 0) {
            exportCart.push({
                ...product,
                exportQuantity: 1,
                exportAmount: product.unitPrice
            });
            showToast(`Đã thêm ${product.productName} vào giỏ xuất`, 'success');
        }
    }
    
    updateExportCartDisplay();
    displayInventoryForExport(exportInventory); // Dùng exportInventory
}// Sử dụng biến đã có từ app.js
// ĐẢM BẢO ĐÂY LÀ BIẾN TOÀN CỤC
window.exportInventory = window.exportInventory || [];


function increaseExportQuantity(productId, maxQuantity) {
    const cartItem = exportCart.find(item => item.id === productId);
    if (cartItem && cartItem.exportQuantity < maxQuantity) {
        cartItem.exportQuantity += 1;
        updateExportCartDisplay();
        displayInventoryForExport(exportInventory);
    }
}

function decreaseExportQuantity(productId) {
    const cartItem = exportCart.find(item => item.id === productId);
    if (cartItem) {
        if (cartItem.exportQuantity > 1) {
            cartItem.exportQuantity -= 1;
        } else {
            // Remove from cart if quantity becomes 0
            exportCart = exportCart.filter(item => item.id !== productId);
            showToast('Đã xóa sản phẩm khỏi giỏ xuất', 'info');
        }
        updateExportCartDisplay();
        displayInventoryForExport(exportInventory);
    }
}

function updateExportCartDisplay() {
    const container = getElement('exportCartItems');
    const totalElement = getElement('exportCartTotal');
    const itemCountElement = getElement('exportCartItemCount');
    
    if (!container) return;
    
    // Update item count
    const totalItems = exportCart.reduce((sum, item) => sum + item.exportQuantity, 0);
    if (itemCountElement) {
        itemCountElement.textContent = totalItems;
    }
    
    if (exportCart.length === 0) {
        container.innerHTML = `
            <div class="empty-cart">
                <div class="empty-icon">🛒</div>
                <div>Giỏ xuất kho trống</div>
                <small>Chọn sản phẩm để xuất kho</small>
            </div>
        `;
        if (totalElement) totalElement.textContent = formatCurrency(0);
        return;
    }
    
    // Calculate total value
    const totalValue = exportCart.reduce((sum, item) => {
        return sum + (item.exportQuantity * item.unitPrice);
    }, 0);
    
    // Display cart items
    container.innerHTML = exportCart.map(item => `
        <div class="cart-item">
            <div class="cart-item-info">
                <div class="cart-product-name">${item.productName}</div>
                <div class="cart-product-details">
                    ${formatCurrency(item.unitPrice)}/${item.unit} × ${item.exportQuantity}
                </div>
            </div>
            <div class="cart-item-controls">
                <div class="cart-item-total">
                    ${formatCurrency(item.exportQuantity * item.unitPrice)}
                </div>
                <button class="btn-remove-from-cart" onclick="removeFromExportCart('${item.id}')">
                    🗑️
                </button>
            </div>
        </div>
    `).join('');
    
    if (totalElement) {
        totalElement.textContent = formatCurrency(totalValue);
    }
}

function removeFromExportCart(productId) {
    exportCart = exportCart.filter(item => item.id !== productId);
    updateExportCartDisplay();
    displayInventoryForExport(exportInventory);
    showToast('Đã xóa sản phẩm khỏi giỏ xuất', 'info');
}

function clearExportCart() {
    if (exportCart.length === 0) return;
    
    if (confirm('Bạn có chắc muốn xóa toàn bộ giỏ xuất kho?')) {
        exportCart = [];
        updateExportCartDisplay();
        displayInventoryForExport(exportInventory);
        showToast('Đã xóa toàn bộ giỏ xuất', 'info');
    }
}

// ==================== EXPORT PROCESSING ====================

async function processInventoryExport() {
    if (exportCart.length === 0) {
        showToast('Vui lòng chọn sản phẩm để xuất kho', 'error');
        return;
    }
    
    // Validate stock
    for (const cartItem of exportCart) {
        const inventoryItem = exportInventory.find(item => item.id === cartItem.id);
        if (!inventoryItem || inventoryItem.quantity < cartItem.exportQuantity) {
            showToast(`${cartItem.productName} không đủ số lượng để xuất kho`, 'error');
            return;
        }
    }
    
    try {
        // Start export process
        showLoading(true);
        
        const exportData = {
            date: new Date().toISOString().split('T')[0],
            items: exportCart.map(item => ({
                productId: item.id,
                productName: item.productName,
                quantity: item.exportQuantity,
                unit: item.unit,
                unitPrice: item.unitPrice,
                totalAmount: item.exportQuantity * item.unitPrice
            })),
            totalAmount: exportCart.reduce((sum, item) => sum + (item.exportQuantity * item.unitPrice), 0),
            exportedBy: currentUser.uid,
            exportedByEmail: currentUser.email,
            companyId: 'milano',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Save export record
        const exportDoc = await db.collection('inventory_exports').add(exportData);
        exportData.id = exportDoc.id;
        currentExportData = exportData;
        
        // Update inventory quantities
        await updateInventoryAfterExport();
        
        // Show success and close popup
        showToast(`✅ Đã xuất kho thành công ${exportCart.length} sản phẩm`, 'success');
        closeExportInventoryPopup();
        
        // Refresh data
        loadDateData();
        
        // Show export summary
        setTimeout(() => {
            showExportSummary(exportData);
        }, 500);
        
    } catch (error) {
        console.error('❌ Error processing export:', error);
        showToast('Lỗi xuất kho', 'error');
    } finally {
        showLoading(false);
    }
}

async function updateInventoryAfterExport() {
    const batch = db.batch();
    
    for (const cartItem of exportCart) {
        const inventoryRef = db.collection('inventory').doc(cartItem.id);
        const inventoryDoc = await inventoryRef.get();
        
        if (inventoryDoc.exists) {
            const currentData = inventoryDoc.data();
            const newQuantity = currentData.quantity - cartItem.exportQuantity;
            const newTotalAmount = newQuantity * currentData.unitPrice;
            
            batch.update(inventoryRef, {
                quantity: newQuantity,
                totalAmount: newTotalAmount,
                lastExportDate: new Date().toISOString().split('T')[0],
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Add to export log
            const exportLogRef = db.collection('inventory_export_logs').doc();
            batch.set(exportLogRef, {
                productId: cartItem.id,
                productName: cartItem.productName,
                quantity: cartItem.exportQuantity,
                unit: cartItem.unit,
                unitPrice: cartItem.unitPrice,
                totalAmount: cartItem.exportQuantity * cartItem.unitPrice,
                exportDate: new Date().toISOString().split('T')[0],
                exportedBy: currentUser.uid,
                exportedByEmail: currentUser.email,
                companyId: 'milano',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    }
    
    await batch.commit();
}

function showExportSummary(exportData) {
    const summaryHTML = `
        <div class="export-summary">
            <h3>📦 Xuất Kho Thành Công</h3>
            <div class="summary-details">
                <div class="summary-item">
                    <span class="label">Ngày xuất:</span>
                    <span class="value">${formatDisplayDate(exportData.date)}</span>
                </div>
                <div class="summary-item">
                    <span class="label">Số sản phẩm:</span>
                    <span class="value">${exportData.items.length}</span>
                </div>
                <div class="summary-item">
                    <span class="label">Tổng giá trị:</span>
                    <span class="value">${formatCurrency(exportData.totalAmount)}</span>
                </div>
            </div>
            <div class="exported-items">
                <h4>Chi tiết xuất kho:</h4>
                ${exportData.items.map(item => `
                    <div class="exported-item">
                        <span class="product">${item.productName}</span>
                        <span class="quantity">${item.quantity} ${item.unit}</span>
                        <span class="amount">${formatCurrency(item.totalAmount)}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    showAlert('✅ Xuất Kho Thành Công', summaryHTML);
}

function closeExportInventoryPopup() {
    getElement('exportInventoryPopup').classList.remove('active');
    exportCart = [];
}

// ==================== INVENTORY REPORTS ====================

function openInventoryReports() {
    if (!isManager()) {
        showToast('Chỉ quản lý được phép xem báo cáo kho', 'error');
        return;
    }
    
    loadInventoryReports();
    getElement('inventoryReportsPopup').classList.add('active');
}

async function loadInventoryReports() {
    try {
        showLoading(true);
        
        // Load inventory data
        const inventorySnapshot = await db.collection('inventory')
            .where('companyId', '==', 'milano')
            .get();
            
        const inventory = inventorySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        // Load export history
        const exportSnapshot = await db.collection('inventory_exports')
            .where('companyId', '==', 'milano')
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();
            
        const exports = exportSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        displayInventoryReports(inventory, exports);
        
    } catch (error) {
        console.error('❌ Error loading inventory reports:', error);
        showToast('Lỗi tải báo cáo kho', 'error');
    } finally {
        showLoading(false);
    }
}

function displayInventoryReports(inventory, exports) {
    const inventoryContainer = getElement('inventoryReportsList');
    const exportsContainer = getElement('inventoryExportsList');
    
    // Display current inventory
    if (inventoryContainer) {
        inventoryContainer.innerHTML = inventory.length === 0 ? `
            <div class="empty-state">
                <div class="empty-icon">📦</div>
                <div>Không có dữ liệu kho hàng</div>
            </div>
        ` : inventory.map(item => `
            <div class="inventory-report-item ${item.quantity <= 10 ? 'low-stock' : ''}">
                <div class="product-info">
                    <div class="product-name">${item.productName}</div>
                    <div class="product-stock">
                        Tồn kho: <strong>${item.quantity} ${item.unit}</strong>
                        ${item.quantity <= 10 ? '<span class="low-stock-warning">⚠️ Sắp hết</span>' : ''}
                    </div>
                    <div class="product-value">
                        Giá trị: ${formatCurrency(item.totalAmount)}
                    </div>
                </div>
                <div class="product-meta">
                    <div class="last-update">
                        Cập nhật: ${item.lastRestockDate ? formatDisplayDate(item.lastRestockDate) : 'N/A'}
                    </div>
                    ${item.lastExportDate ? `
                        <div class="last-export">
                            Xuất gần nhất: ${formatDisplayDate(item.lastExportDate)}
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }
    
    // Display export history
    if (exportsContainer) {
        exportsContainer.innerHTML = exports.length === 0 ? `
            <div class="empty-state">
                <div class="empty-icon">📋</div>
                <div>Chưa có lịch sử xuất kho</div>
            </div>
        ` : exports.map(exportItem => `
            <div class="export-history-item">
                <div class="export-header">
                    <div class="export-date">${formatDisplayDate(exportItem.date)}</div>
                    <div class="export-total">${formatCurrency(exportItem.totalAmount)}</div>
                </div>
                <div class="export-details">
                    <div class="export-by">Người xuất: ${exportItem.exportedByEmail}</div>
                    <div class="export-count">${exportItem.items.length} sản phẩm</div>
                </div>
                <div class="export-items">
                    ${exportItem.items.slice(0, 3).map(item => `
                        <div class="export-item">
                            <span class="item-name">${item.productName}</span>
                            <span class="item-quantity">${item.quantity} ${item.unit}</span>
                        </div>
                    `).join('')}
                    ${exportItem.items.length > 3 ? `
                        <div class="more-items">... và ${exportItem.items.length - 3} sản phẩm khác</div>
                    ` : ''}
                </div>
                <button class="btn-view-details" onclick="viewExportDetails('${exportItem.id}')">
                    👁️ Xem chi tiết
                </button>
            </div>
        `).join('');
    }
}

async function viewExportDetails(exportId) {
    try {
        const exportDoc = await db.collection('inventory_exports').doc(exportId).get();
        if (!exportDoc.exists) return;
        
        const exportData = exportDoc.data();
        
        const detailsHTML = `
    <div class="export-details-modal">
        <h3>📦 Chi Tiết Xuất Kho</h3>
        <div class="export-info">
            <div class="info-item">
                <span class="label">Ngày xuất:</span>
                <span class="value">${formatDisplayDate(exportData.date)}</span>
            </div>
            <div class="info-item">
                <span class="label">Người xuất:</span>
                <span class="value">${exportData.exportedByEmail || 'Không xác định'}</span>
            </div>
            <div class="info-item">
                <span class="label">Tổng giá trị:</span>
                <span class="value">${formatCurrency(exportData.totalAmount || 0)}</span>
            </div>
        </div>
        <div class="exported-items-details">
            <h4>Danh sách sản phẩm:</h4>
            ${exportData.items && exportData.items.length > 0 ? 
                exportData.items.map(item => `
                    <div class="exported-item-detail">
                        <div class="item-name">${item.productName || 'Không tên'}</div>
                        <div class="item-quantity">${item.quantity || 0} ${item.unit || 'cái'}</div>
                        <div class="item-price">${formatCurrency(item.unitPrice || 0)}/${item.unit || 'cái'}</div>
                        <div class="item-total">${formatCurrency(item.totalAmount || 0)}</div>
                    </div>
                `).join('') : 
                '<div class="no-items">Không có sản phẩm nào</div>'
            }
        </div>
    </div>
`;


        
        showAlert('📋 Chi Tiết Xuất Kho', detailsHTML);
        
    } catch (error) {
        console.error('Error loading export details:', error);
        showToast('Lỗi tải chi tiết xuất kho', 'error');
    }
}

function closeInventoryReportsPopup() {
    getElement('inventoryReportsPopup').classList.remove('active');
}
// Thêm các hàm utility nếu chưa có
function formatDisplayDate(dateString) {
    if (!dateString) return 'Không xác định';
    try {
        return new Date(dateString).toLocaleDateString('vi-VN');
    } catch (error) {
        return 'Không xác định';
    }
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount || 0);
}
// ==================== INTEGRATION WITH EXISTING SYSTEM ====================

// Thêm vào hàm initializeApp()
function initializeInventorySystem() {
    console.log('🔄 Initializing inventory system...');
    // Inventory system will be initialized on demand
}

function updateInventorySummary() {
    const inventoryValue = exportInventory.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
    const lowStockCount = exportInventory.filter(item => (item.quantity || 0) < 10).length;
    
    // Sử dụng getElement thay vì safeUpdate
    const valueElement = getElement('inventoryValueDisplay');
    const alertElement = getElement('lowStockAlert');
    
    if (valueElement) valueElement.textContent = formatCurrency(inventoryValue);
    if (alertElement) alertElement.textContent = lowStockCount > 0 ? `⚠️ ${lowStockCount} SP sắp hết` : '✅ Kho ổn định';
}

// ==================== NEW UI ELEMENTS ====================

// Thêm các popup mới vào HTML (sẽ thêm sau)
function createInventoryPopups() {
    const popupsHTML = `
        <!-- Export Inventory Popup -->
        <div id="exportInventoryPopup" class="popup">
            <div class="popup-content large">
                <div class="popup-header">
                    <h3>📦 Xuất Kho Hàng</h3>
                    <button class="popup-close" onclick="closeExportInventoryPopup()">×</button>
                </div>
                <div class="popup-body">
                    <div class="export-layout">
                        <div class="inventory-section">
                            <h4>🛒 Chọn sản phẩm xuất kho</h4>
                            <div id="inventoryExportList" class="inventory-list">
                                <!-- Inventory items will be loaded here -->
                            </div>
                        </div>
                        
                        <div class="cart-section">
                            <div class="cart-header">
                                <h4>Giỏ xuất kho (<span id="exportCartItemCount">0</span> sản phẩm)</h4>
                                <button class="btn-clear-cart" onclick="clearExportCart()">🗑️ Xóa hết</button>
                            </div>
                            <div id="exportCartItems" class="cart-items">
                                <!-- Cart items will be displayed here -->
                            </div>
                            <div class="cart-footer">
                                <div class="cart-total">
                                    <strong>Tổng giá trị:</strong>
                                    <span id="exportCartTotal">0 ₫</span>
                                </div>
                                <button class="btn-confirm-export" onclick="processInventoryExport()">
                                    ✅ Xác Nhận Xuất Kho
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Inventory Reports Popup -->
        <div id="inventoryReportsPopup" class="popup">
            <div class="popup-content xlarge">
                <div class="popup-header">
                    <h3>📊 Báo Cáo Kho Hàng</h3>
                    <button class="popup-close" onclick="closeInventoryReportsPopup()">×</button>
                </div>
                <div class="popup-body">
                    <div class="reports-tabs">
                        <button class="tab-btn active" onclick="switchInventoryTab('current')">📦 Tồn Kho Hiện Tại</button>
                        <button class="tab-btn" onclick="switchInventoryTab('history')">📋 Lịch Sử Xuất Kho</button>
                    </div>
                    
                    <div class="reports-content">
                        <div id="exportInventoryTab" class="tab-content active">
                            <h4>Tồn Kho Hiện Tại</h4>
                            <div id="inventoryReportsList" class="reports-list">
                                <!-- Current inventory will be loaded here -->
                            </div>
                        </div>
                        
                        <div id="exportHistoryTab" class="tab-content">
                            <h4>Lịch Sử Xuất Kho</h4>
                            <div id="inventoryExportsList" class="reports-list">
                                <!-- Export history will be loaded here -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add popups to body
    document.body.insertAdjacentHTML('beforeend', popupsHTML);
}

function switchInventoryTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    const targetTab = getElement(tabName === 'current' ? 'exportInventoryTab' : 'exportHistoryTab');
    const targetBtn = document.querySelector(`.tab-btn[onclick="switchInventoryTab('${tabName}')"]`);
    
    if (targetTab) targetTab.classList.add('active');
    if (targetBtn) targetBtn.classList.add('active');
}

// ==================== INTEGRATION WITH EXISTING UI ====================

// Thêm nút xuất kho vào header hoặc navigation
function addInventoryButtonsToUI() {
    // Tìm hoặc tạo container cho nút kho hàng
    let inventoryButtonsContainer = document.getElementById('inventoryButtons');
    
    if (!inventoryButtonsContainer) {
        inventoryButtonsContainer = document.createElement('div');
        inventoryButtonsContainer.id = 'inventoryButtons';
        inventoryButtonsContainer.className = 'inventory-buttons';
        
        // Thêm vào header hoặc nơi phù hợp
        const header = document.querySelector('.app-header');
        if (header) {
            header.appendChild(inventoryButtonsContainer);
        } else {
            document.body.insertAdjacentElement('afterbegin', inventoryButtonsContainer);
        }
    }
    
    inventoryButtonsContainer.innerHTML = `
        <button class="btn-inventory-export" onclick="openExportInventoryPopup()">
            📦 Xuất Kho
        </button>
        <button class="btn-inventory-reports" onclick="openInventoryReports()">
            📊 Báo Cáo Kho
        </button>
    `;
}

// ==================== INITIALIZATION ====================

// Gọi trong hàm initializeApp()
function initializeInventoryModule() {
    console.log('🚀 Initializing inventory module...');
    createInventoryPopups();
    addInventoryButtonsToUI();
    initializeInventorySystem();
}

// Thêm vào DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
    // ... existing code ...
    initializeInventoryModule();
});

console.log('✅ Inventory Export System: Module đã sẵn sàng');