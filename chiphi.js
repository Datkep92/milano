// ==================== chiphi.js – MILANO COFFEE PRO 2025 ====================
// LUỒNG XỬ LÝ CHÍNH: QUẢN LÝ CHI PHÍ & KHO HÀNG

let currentOperationalMonth = '';
let currentOperationalExpenses = [];
let currentInventory = [];
let currentView = 'overview'; // 'overview', 'inventory', 'services'

// ==================== LUỒNG KHỞI TẠO ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('📦 Chiphi.js: DOM Ready - Chờ kích hoạt tab');
    
    // Lắng nghe sự kiện chuyển tab
    document.addEventListener('click', function(e) {
        if (e.target.closest('.tab-btn') && e.target.textContent.includes('Chi Phí')) {
            setTimeout(initializeChiphiModule, 500);
        }
    });
});



// ==================== LUỒNG QUẢN LÝ THÁNG ====================
function setupMonthSelector() {
    console.log('📅 Đang thiết lập dropdown tháng...');
    
    const selector = document.getElementById('operationalMonthSelector');
    if (!selector) {
        console.log('❌ Không tìm thấy month selector');
        return;
    }

    // Lấy tháng hiện tại theo chu kỳ 20/N - 19/N+1
    currentOperationalMonth = getCurrentOperationalMonth(new Date());
    
    // Tạo danh sách 12 tháng gần nhất
    const months = generateOperationalMonths(12);
    
    // Render dropdown
    selector.innerHTML = months.map(m => 
        `<option value="${m}">${m}</option>`
    ).join('');
    selector.value = currentOperationalMonth;

    // Lắng nghe thay đổi tháng
    selector.onchange = () => {
        currentOperationalMonth = selector.value;
        console.log(`🔄 Đã chuyển sang tháng: ${currentOperationalMonth}`);
        refreshAllData();
    };
    
    console.log('✅ Dropdown tháng đã sẵn sàng');
}

function getCurrentOperationalMonth(date) {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    
    if (day >= 20) {
        return `${String(month).padStart(2, '0')}/${year}`;
    } else {
        let prevMonth = month - 1;
        let prevYear = year;
        if (prevMonth === 0) {
            prevMonth = 12;
            prevYear = year - 1;
        }
        return `${String(prevMonth).padStart(2, '0')}/${prevYear}`;
    }
}

function generateOperationalMonths(count) {
    const months = [];
    const today = new Date();
    
    for (let i = 0; i < count; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        months.push(getCurrentOperationalMonth(d));
    }
    
    // Loại bỏ duplicates
    return [...new Set(months)].sort().reverse();
}

// ==================== LUỒNG ĐIỀU HƯỚNG VIEW ====================
function setupNavigation() {
    console.log('🧭 Đang thiết lập navigation...');
    
    const container = document.getElementById('quickActions');
    if (!container) {
        console.log('❌ Không tìm thấy quickActions container');
        return;
    }

    // Tạo navigation buttons
    container.innerHTML = `
        <div style="display: flex; gap: 15px; flex-wrap: wrap; justify-content: center; margin-bottom: 20px;">
            <button onclick="switchToView('overview')" 
                    class="nav-btn ${currentView === 'overview' ? 'active' : ''}">
                📊 Tổng Quan
            </button>
            <button onclick="switchToView('inventory')" 
                    class="nav-btn ${currentView === 'inventory' ? 'active' : ''}">
                📦 Hàng Hóa & Kho
            </button>
            <button onclick="switchToView('services')" 
                    class="nav-btn ${currentView === 'services' ? 'active' : ''}">
                🔧 Dịch Vụ
            </button>
        </div>
    `;
    
    console.log('✅ Navigation đã sẵn sàng');
}

function switchToView(view) {
    console.log(`🔄 Chuyển sang view: ${view}`);
    
    // Cập nhật state
    currentView = view;
    
    // Cập nhật UI navigation
    updateNavigationUI();
    
    // Ẩn tất cả sections
    hideAllSections();
    
    // Hiển thị section target
    showTargetSection(view);
    
    // Load dữ liệu cho view
    loadDataForView(view);
}

function updateNavigationUI() {
    const buttons = document.querySelectorAll('.nav-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
        // Active button dựa trên text content
        if ((currentView === 'overview' && btn.textContent.includes('Tổng Quan')) ||
            (currentView === 'inventory' && btn.textContent.includes('Hàng Hóa')) ||
            (currentView === 'services' && btn.textContent.includes('Dịch Vụ'))) {
            btn.classList.add('active');
        }
    });
}

function hideAllSections() {
    const sections = ['overviewSection', 'inventorySection', 'servicesSection'];
    sections.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (section) section.style.display = 'none';
    });
}

function showTargetSection(view) {
    const targetSection = document.getElementById(`${view}Section`);
    if (targetSection) {
        targetSection.style.display = 'block';
        console.log(`✅ Đã hiển thị section: ${view}Section`);
    } else {
        console.log(`❌ Không tìm thấy section: ${view}Section`);
    }
}

// ==================== LUỒNG THAO TÁC NHANH ====================
function setupQuickActions() {
    console.log('⚡ Đang thiết lập thao tác nhanh...');
    
    const container = document.getElementById('quickActions');
    if (!container) return;

    // Thêm buttons thao tác nhanh
    const quickActionsHTML = `
       
    `;
    
    container.insertAdjacentHTML('beforeend', quickActionsHTML);
    console.log('✅ Thao tác nhanh đã sẵn sàng');
}

function handleQuickAction(action) {
    console.log(`🎯 Thao tác nhanh: ${action}`);
    
    switch(action) {
        case 'add_inventory':
            openExpenseModal('inventory');
            break;
        case 'add_service':
            openExpenseModal('service');
            break;
        default:
            console.log('❌ Thao tác không xác định:', action);
    }
}



function createExpenseModal(type) {
    const today = new Date().toISOString().split('T')[0];
    const isInventory = type === 'inventory';
    
    const modal = document.createElement('div');
    modal.id = 'milanoExpenseModal';
    modal.style.cssText = `
        position:fixed;top:0;left:0;right:0;bottom:0;
        background:rgba(0,0,0,0.85);z-index:99999;
        display:flex;align-items:center;justify-content:center;
        padding:20px;font-family:system-ui,sans-serif;
    `;

    modal.innerHTML = `
        <div style="background:white;border-radius:20px;width:100%;max-width:520px;max-height:95vh;overflow-y:auto;box-shadow:0 30px 80px rgba(0,0,0,0.5);">
            <!-- Header -->
            <div style="background:${isInventory ? '#2196f3' : '#ff9800'};color:white;padding:24px;border-radius:20px 20px 0 0;text-align:center;position:relative;">
                <h2 style="margin:0;font-size:1.6rem;font-weight:bold;">
                    ${isInventory ? '📦 Thêm Hàng Hóa Vào Kho' : '🔧 Thêm Chi Phí Dịch Vụ'}
                </h2>
                <button onclick="closeExpenseModal()" 
                        style="position:absolute;top:15px;right:20px;background:none;border:none;color:white;font-size:36px;cursor:pointer;">×</button>
            </div>

            <!-- Form -->
            <div style="padding:28px;">
                ${createExpenseFormFields(type, today)}
            </div>

            <!-- Footer -->
            <div style="padding:24px;background:#f8f9fa;border-top:1px solid #eee;display:flex;gap:16px;justify-content:flex-end;border-radius:0 0 20px 20px;">
                <button onclick="closeExpenseModal()"
                        style="padding:16px 32px;background:#6c757d;color:white;border:none;border-radius:14px;cursor:pointer;font-weight:bold;font-size:16px;">
                    Hủy
                </button>
                <button onclick="processSaveExpense('${type}')"
                        style="padding:16px 40px;background:#28a745;color:white;border:none;border-radius:14px;cursor:pointer;font-weight:bold;font-size:16px;">
                    ${isInventory ? '📦 Nhập Kho' : '💾 Lưu Chi Phí'}
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}



function closeExpenseModal() {
    document.getElementById('milanoExpenseModal')?.remove();
}



function validateExpenseForm(type) {
    const content = document.getElementById('expenseContentInput')?.value?.trim();
    const amountRaw = document.getElementById('expenseAmountInput')?.value?.trim();
    
    if (!content || !amountRaw) {
        showToast('Vui lòng nhập đầy đủ thông tin và số tiền', 'error');
        return null;
    }
    
    const amount = Number(amountRaw.replace(/[^0-9]/g, ''));
    if (!amount || amount <= 0) {
        showToast('Số tiền không hợp lệ', 'error');
        return null;
    }
    
    return { content, amount };
}



async function saveToOperationalExpenses(expenseData) {
    await db.collection('operational_expenses').add(expenseData);
}

async function updateInventoryData(expenseData) {
    try {
        const inventoryData = {
            productName: expenseData.description,
            quantity: expenseData.quantity,
            unit: expenseData.unit,
            unitPrice: expenseData.unitPrice,
            totalAmount: expenseData.amount,
            lastRestockDate: expenseData.date,
            month: expenseData.month,
            note: expenseData.note,
            companyId: 'milano',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Kiểm tra sản phẩm đã tồn tại chưa
        const existingProduct = await db.collection('inventory')
            .where('productName', '==', expenseData.description)
            .where('companyId', '==', 'milano')
            .get();

        if (!existingProduct.empty) {
            // Cập nhật số lượng tồn kho
            const existingDoc = existingProduct.docs[0];
            const currentData = existingDoc.data();
            const newQuantity = currentData.quantity + expenseData.quantity;
            
            await db.collection('inventory').doc(existingDoc.id).update({
                quantity: newQuantity,
                unitPrice: expenseData.unitPrice,
                totalAmount: newQuantity * expenseData.unitPrice,
                lastRestockDate: expenseData.date,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Ghi log nhập hàng
            await db.collection('inventory_logs').add({
                productId: existingDoc.id,
                productName: expenseData.description,
                type: 'restock',
                quantity: expenseData.quantity,
                unit: expenseData.unit,
                unitPrice: expenseData.unitPrice,
                totalAmount: expenseData.amount,
                date: expenseData.date,
                note: `Nhập thêm: ${expenseData.note || 'Không có ghi chú'}`,
                companyId: 'milano',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
        } else {
            // Thêm sản phẩm mới vào kho
            const newProduct = await db.collection('inventory').add(inventoryData);
            
            // Ghi log nhập hàng lần đầu
            await db.collection('inventory_logs').add({
                productId: newProduct.id,
                productName: expenseData.description,
                type: 'initial_stock',
                quantity: expenseData.quantity,
                unit: expenseData.unit,
                unitPrice: expenseData.unitPrice,
                totalAmount: expenseData.amount,
                date: expenseData.date,
                note: `Nhập lần đầu: ${expenseData.note || 'Không có ghi chú'}`,
                companyId: 'milano',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    } catch (err) {
        console.error('Lỗi cập nhật kho:', err);
        throw err;
    }
}

function showSaveSuccessMessage(type, amount) {
    const message = type === 'inventory' ? '📦 ĐÃ NHẬP KHO' : '💾 ĐÃ LƯU';
    showToast(`${message} ${formatCurrency(amount)} THÀNH CÔNG!`, 'success');
}

// ==================== LUỒNG TẢI DỮ LIỆU ====================
function loadInitialData() {
    console.log('📥 Đang tải dữ liệu ban đầu...');
    loadOperationalExpenses();
}

// Thêm vào hàm loadOverviewData
async function loadOverviewData() {
    try {
        await loadInventorySummary();
        await loadRecentExpenses();
        updateOperationalSummary();
        updateMonthLabel(); // THÊM DÒNG NÀY
    } catch (error) {
        console.error('❌ Lỗi tải overview:', error);
    }
}

// Thêm hàm mới
function updateMonthLabel() {
    const monthLabel = document.getElementById('currentMonthLabel');
    if (monthLabel) {
        monthLabel.textContent = currentOperationalMonth;
    }
}

// Cập nhật hàm refreshAllData
function refreshAllData() {
    console.log('🔄 Làm mới toàn bộ dữ liệu...');
    loadOperationalExpenses();
    updateMonthLabel(); // THÊM DÒNG NÀY
    
    // Refresh view hiện tại
    loadDataForView(currentView);
}

function loadDataForView(view) {
    console.log(`📊 Đang tải dữ liệu cho view: ${view}`);
    
    switch(view) {
        case 'overview':
            loadOverviewData();
            break;
        case 'inventory':
            loadInventoryData();
            break;
        case 'services':
            loadServicesData();
            break;
    }
}


let showAllExpenses = false;
let allExpenses = [];

// Sửa hàm loadRecentExpenses
async function loadRecentExpenses() {
    try {
        const snapshot = await db.collection('operational_expenses')
            .where('month', '==', currentOperationalMonth)
            .orderBy('createdAt', 'desc')
            .get();

        allExpenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Hiển thị 5 mục đầu tiên hoặc toàn bộ
        const expensesToShow = showAllExpenses ? allExpenses : allExpenses.slice(0, 5);
        displayRecentExpenses(expensesToShow);
        
        // Cập nhật text nút toggle
        updateToggleButton();
    } catch (err) {
        console.error('Lỗi tải chi phí gần đây:', err);
    }
}

// Hàm toggle hiển thị
function toggleShowAllExpenses() {
    showAllExpenses = !showAllExpenses;
    const expensesToShow = showAllExpenses ? allExpenses : allExpenses.slice(0, 5);
    displayRecentExpenses(expensesToShow);
    updateToggleButton();
}

// Cập nhật text nút toggle
function updateToggleButton() {
    const toggleBtn = document.getElementById('toggleExpensesBtn');
    if (toggleBtn) {
        toggleBtn.textContent = showAllExpenses ? 'Ẩn bớt' : 'Xem toàn bộ';
    }
}

// Sửa hàm displayRecentExpenses
function displayRecentExpenses(expenses) {
    const container = document.getElementById('recentExpensesList');
    if (!container) return;

    if (expenses.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:40px;color:#666;">
                <div style="font-size:3rem;margin-bottom:10px;">📋</div>
                Chưa có chi phí nào trong tháng ${currentOperationalMonth}
            </div>
        `;
        return;
    }

    container.innerHTML = expenses.map(expense => `
        <div style="background:white;margin:10px 0;padding:15px;border-radius:10px;border-left:4px solid ${expense.type === 'inventory' ? '#2196f3' : '#ff9800'};">
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <div style="flex:1;">
                    <div style="font-weight:bold;color:#333;">${expense.description}</div>
                    <div style="color:#666;font-size:0.9rem;margin-top:4px;">
                        ${expense.type === 'inventory' ? '📦 Hàng hóa' : '🔧 Dịch vụ'} • ${expense.date}
                        ${expense.quantity ? ` • ${expense.quantity} ${expense.unit}` : ''}
                    </div>
                    ${expense.note ? `<div style="color:#888;font-size:0.85rem;margin-top:4px;">📝 ${expense.note}</div>` : ''}
                </div>
                <div style="font-weight:bold;color:#e91e63;font-size:1.1rem;">
                    ${formatCurrency(expense.amount)}
                </div>
            </div>
        </div>
    `).join('');
    
    // Hiển thị thông báo nếu đang xem giới hạn
    if (!showAllExpenses && allExpenses.length > 5) {
        container.innerHTML += `
            <div style="text-align:center;padding:10px;color:#666;font-size:0.9rem;">
                Đang hiển thị 5/${allExpenses.length} chi phí
            </div>
        `;
    }
}

function displayRecentExpenses(expenses) {
    const container = document.getElementById('recentExpensesList');
    if (!container) return;

    if (expenses.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:40px;color:#666;">
                <div style="font-size:3rem;margin-bottom:10px;">📋</div>
                Chưa có chi phí nào trong tháng ${currentOperationalMonth}
            </div>
        `;
        return;
    }

    container.innerHTML = expenses.map(expense => `
        <div style="background:white;margin:10px 0;padding:15px;border-radius:10px;border-left:4px solid ${expense.type === 'inventory' ? '#2196f3' : '#ff9800'};">
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <div style="font-weight:bold;color:#333;">${expense.description}</div>
                    <div style="color:#666;font-size:0.9rem;margin-top:4px;">
                        ${expense.type === 'inventory' ? '📦 Hàng hóa' : '🔧 Dịch vụ'} • ${expense.date}
                        ${expense.quantity ? ` • ${expense.quantity} ${expense.unit}` : ''}
                    </div>
                    ${expense.note ? `<div style="color:#888;font-size:0.85rem;margin-top:4px;">📝 ${expense.note}</div>` : ''}
                </div>
                <div style="font-weight:bold;color:#e91e63;font-size:1.1rem;">
                    ${formatCurrency(expense.amount)}
                </div>
            </div>
        </div>
    `).join('');
}

// Tải tổng quan kho
// CÁCH 2: HIỂN THỊ GIỐNG TỔNG QUAN CHI PHÍ
async function loadInventorySummary() {
    try {
        const snapshot = await db.collection('inventory')
            .where('companyId', '==', 'milano')
            .get();

        const totalInventoryValue = snapshot.docs.reduce((sum, doc) => {
            const data = doc.data();
            return sum + (data.totalAmount || 0);
        }, 0);

        const totalProducts = snapshot.docs.length;
        const lowStockCount = snapshot.docs.filter(doc => {
            const data = doc.data();
            return data.quantity < 10;
        }).length;

        const inventorySummary = document.getElementById('inventorySummary');
        if (inventorySummary) {
            inventorySummary.innerHTML = `
                <div onclick="switchToView('inventory')" 
                     style="cursor: pointer; background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); transition: all 0.3s ease; border: 2px solid transparent;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <span style="color: #2196f3; font-weight: bold; font-size: 0.9rem;">
                            Xem chi tiết →
                        </span>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; text-align: center;">
                        <div style="padding: 15px; background: #e3f2fd; border-radius: 8px;">
                            <div style="font-size: 0.8rem; color: #1976d2; margin-bottom: 5px;">Tổng SP</div>
                            <div style="font-weight: bold; font-size: 1.4rem; color: #1976d2;">${totalProducts}</div>
                        </div>
                        <div style="padding: 15px; background: #e8f5e8; border-radius: 8px;">
                            <div style="font-size: 0.8rem; color: #2e7d32; margin-bottom: 5px;">Giá trị</div>
                            <div style="font-weight: bold; font-size: 1.2rem; color: #2e7d32;">${formatCurrencyShort(totalInventoryValue)}</div>
                        </div>
                        <div style="padding: 15px; background: ${lowStockCount > 0 ? '#fff3e0' : '#f5f5f5'}; border-radius: 8px;">
                            <div style="font-size: 0.8rem; color: ${lowStockCount > 0 ? '#e65100' : '#666'}; margin-bottom: 5px;">Sắp hết</div>
                            <div style="font-weight: bold; font-size: 1.4rem; color: ${lowStockCount > 0 ? '#e65100' : '#666'};">${lowStockCount}</div>
                        </div>
                    </div>
                </div>
            `;
            
            // Thêm hiệu ứng hover
            const card = inventorySummary.querySelector('div');
            if (card) {
                card.addEventListener('mouseover', function() {
                    this.style.transform = 'translateY(-2px)';
                    this.style.boxShadow = '0 4px 15px rgba(0,0,0,0.15)';
                    this.style.borderColor = '#2196f3';
                });
                card.addEventListener('mouseout', function() {
                    this.style.transform = 'translateY(0)';
                    this.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                    this.style.borderColor = 'transparent';
                });
            }
        }
    } catch (err) {
        console.error('Lỗi tải tổng quan kho:', err);
        
        const inventorySummary = document.getElementById('inventorySummary');
        if (inventorySummary) {
            inventorySummary.innerHTML = `
                <div onclick="switchToView('inventory')" 
                     style="cursor: pointer; background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); text-align: center; color: #666;">
                    <div style="font-size: 3rem; margin-bottom: 10px;">📦</div>
                    <div>Không thể tải dữ liệu kho</div>
                    <small style="color: #2196f3;">Click để thử lại</small>
                </div>
            `;
        }
    }
}

// THÊM HÀM FORMAT CURRENCY SHORT (nếu chưa có)
function formatCurrencyShort(amount) {
    if (amount >= 1000000000) {
        return (amount / 1000000000).toFixed(1) + 'B';
    } else if (amount >= 1000000) {
        return (amount / 1000000).toFixed(1) + 'M';
    } else if (amount >= 1000) {
        return (amount / 1000).toFixed(0) + 'K';
    }
    return amount.toString();
}

// LUỒNG TẢI INVENTORY
async function loadInventoryData() {
    try {
        const snapshot = await db.collection('inventory')
            .where('companyId', '==', 'milano')
            .get();

        currentInventory = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
        })).sort((a, b) => a.productName.localeCompare(b.productName));

        displayInventory();
    } catch (error) {
        console.error('❌ Lỗi tải inventory:', error);
        showToast('Lỗi tải dữ liệu kho', 'error');
    }
}

function displayInventory() {
    const container = document.getElementById('inventoryList');
    if (!container) {
        console.log('❌ Không tìm thấy inventoryList container');
        return;
    }

    // Cập nhật thống kê
    updateInventoryStats();

    if (currentInventory.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:60px;color:#666;font-size:1.1rem;">
                <div style="font-size:3rem;margin-bottom:20px;">📦</div>
                Kho hàng trống<br>
                <small>Nhấn "Thêm Hàng Hóa" để nhập hàng vào kho</small>
            </div>
        `;
        return;
    }

    container.innerHTML = currentInventory.map(item => `
        <div class="inventory-item" onclick="showInventoryHistory('${item.id}', '${item.productName}')">
            <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:10px;">
                <div style="flex:1;">
                    <div style="font-weight:bold;font-size:1.2rem;color:#333;">${item.productName}</div>
                    <div style="color:#666;margin-top:4px;font-size:0.9rem;">
                        Tồn kho: <strong>${item.quantity} ${item.unit}</strong>
                    </div>
                    <div style="color:#888;font-size:0.85rem;">
                        Giá nhập: ${formatCurrency(item.unitPrice)}/${item.unit}
                    </div>
                </div>
                <div style="text-align:right;">
                    <div style="font-weight:bold;font-size:1.1rem;color:#2196f3;">
                        ${formatCurrency(item.totalAmount)}
                    </div>
                    <div style="color:#888;font-size:0.8rem;">
                        Cập nhật: ${formatDate(item.lastRestockDate)}
                    </div>
                </div>
            </div>
            ${item.note ? `<div style="color:#666;font-size:0.9rem;margin-top:8px;padding:8px;background:#f5f5f5;border-radius:6px;">📝 ${item.note}</div>` : ''}
        </div>
    `).join('');
}

function updateInventoryStats() {
    const totalProducts = currentInventory.length;
    const totalInventoryValue = currentInventory.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
    const lowStockCount = currentInventory.filter(item => item.quantity < 10).length;

    const totalProductsEl = document.getElementById('totalProducts');
    const totalInventoryValueEl = document.getElementById('totalInventoryValue');
    const lowStockCountEl = document.getElementById('lowStockCount');

    if (totalProductsEl) totalProductsEl.textContent = totalProducts;
    if (totalInventoryValueEl) totalInventoryValueEl.textContent = formatCurrency(totalInventoryValue);
    if (lowStockCountEl) lowStockCountEl.textContent = lowStockCount;
}

// Thêm vào hàm loadServicesData
async function loadServicesData() {
    try {
        const snapshot = await db.collection('operational_expenses')
            .where('month', '==', currentOperationalMonth)
            .where('type', '==', 'service')
            .get();

        const services = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        displayServices(services);
        updateServicesMonthLabel(); // THÊM DÒNG NÀY
    } catch (error) {
        console.error('❌ Lỗi tải services:', error);
        showToast('Lỗi tải dữ liệu dịch vụ', 'error');
    }
}

// Thêm hàm mới
function updateServicesMonthLabel() {
    const monthLabel = document.getElementById('servicesMonthLabel');
    if (monthLabel) {
        monthLabel.textContent = currentOperationalMonth;
    }
}

function displayServices(services) {
    const container = document.getElementById('servicesList');
    if (!container) {
        console.log('❌ Không tìm thấy servicesList container');
        return;
    }

    // Cập nhật thống kê dịch vụ
    updateServiceStats(services);

    if (services.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:60px;color:#666;font-size:1.1rem;">
                <div style="font-size:3rem;margin-bottom:20px;">🔧</div>
                Chưa có chi phí dịch vụ nào trong tháng ${currentOperationalMonth}
            </div>
        `;
        return;
    }

    // Gom nhóm dịch vụ trùng tên
    const groupedServices = {};
    services.forEach(service => {
        const key = service.description;
        if (!groupedServices[key]) {
            groupedServices[key] = [];
        }
        groupedServices[key].push(service);
    });

    container.innerHTML = Object.entries(groupedServices).map(([serviceName, serviceList]) => {
        const totalAmount = serviceList.reduce((sum, s) => sum + (s.amount || 0), 0);
        const hasMultiple = serviceList.length > 1;
        
        return `
            <div class="service-item" onclick="${hasMultiple ? `showServiceHistory('${serviceName}')` : 'void(0)'}">
                <div style="display:flex;justify-content:space-between;align-items:start;">
                    <div style="flex:1;">
                        <div style="font-weight:bold;font-size:1.2rem;color:#333;">
                            ${serviceName}
                            ${hasMultiple ? `<span style="color:#666;font-size:0.9rem;"> (${serviceList.length} lần)</span>` : ''}
                        </div>
                        <div style="color:#666;margin-top:4px;font-size:0.9rem;">
                            ${hasMultiple ? 'Click để xem lịch sử' : `Ngày: ${serviceList[0].date}`}
                        </div>
                        ${serviceList[0].note ? `<div style="color:#888;font-size:0.85rem;margin-top:4px;">📝 ${serviceList[0].note}</div>` : ''}
                    </div>
                    <div style="text-align:right;">
                        <div style="font-weight:bold;font-size:1.3rem;color:#e91e63;">
                            ${formatCurrency(totalAmount)}
                        </div>
                        ${hasMultiple ? '' : `<div style="color:#888;font-size:0.8rem;">${serviceList[0].date}</div>`}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function updateServiceStats(services) {
    const totalServicesCost = services.reduce((sum, service) => sum + (service.amount || 0), 0);
    const serviceNames = [...new Set(services.map(s => s.description))];
    
    const totalServicesCostEl = document.getElementById('totalServicesCost');
    const totalServiceTypesEl = document.getElementById('totalServiceTypes');

    if (totalServicesCostEl) totalServicesCostEl.textContent = formatCurrency(totalServicesCost);
    if (totalServiceTypesEl) totalServiceTypesEl.textContent = serviceNames.length;
}

// Tải chi phí tổng quan
async function loadOperationalExpenses() {
    try {
        const snapshot = await db.collection('operational_expenses')
            .where('month', '==', currentOperationalMonth)
            .get();

        currentOperationalExpenses = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));

        updateOperationalSummary();
    } catch (err) {
        console.error('Lỗi tải chi phí:', err);
        showToast('Lỗi tải dữ liệu chi phí', 'error');
    }
}


function formatPercentage(part, total) {
    if (!total || total === 0) return 0;
    return Math.round((part / total) * 100);
}
// ==================== LUỒNG HIỂN THỊ LỊCH SỬ ====================
async function showInventoryHistory(productId, productName) {
    console.log(`📖 Đang mở lịch sử kho: ${productName}`);
    
    try {
        const logs = await loadInventoryLogs(productId);
        createInventoryHistoryModal(productName, logs);
    } catch (error) {
        console.error('❌ Lỗi tải lịch sử kho:', error);
        showToast('Lỗi tải lịch sử nhập hàng', 'error');
    }
}

async function loadInventoryLogs(productId) {
    const snapshot = await db.collection('inventory_logs')
        .where('productId', '==', productId)
        .orderBy('createdAt', 'desc')
        .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

function createInventoryHistoryModal(productName, logs) {
    const modal = document.createElement('div');
    modal.id = 'inventoryHistoryModal';
    modal.style.cssText = `
        position:fixed;top:0;left:0;right:0;bottom:0;
        background:rgba(0,0,0,0.85);z-index:99999;
        display:flex;align-items:center;justify-content:center;
        padding:20px;font-family:system-ui,sans-serif;
    `;

    modal.innerHTML = `
        <div style="background:white;border-radius:20px;width:100%;max-width:800px;max-height:90vh;overflow-y:auto;">
            <div style="background:#2196f3;color:white;padding:20px;border-radius:20px 20px 0 0;">
                <h2 style="margin:0;font-size:1.4rem;">📦 Lịch Sử Nhập Kho: ${productName}</h2>
                <button onclick="closeHistoryModal()" 
                        style="position:absolute;top:15px;right:20px;background:none;border:none;color:white;font-size:30px;cursor:pointer;">×</button>
            </div>
            <div style="padding:20px;">
                ${logs.length === 0 ? `
                    <div style="text-align:center;padding:40px;color:#666;">
                        Chưa có lịch sử nhập hàng
                    </div>
                ` : `
                    <div style="display:grid;gap:10px;">
                        ${logs.map(log => `
                            <div style="padding:15px;border:1px solid #eee;border-radius:10px;background:#f9f9f9;">
                                <div style="display:flex;justify-content:space-between;align-items:center;">
                                    <div>
                                        <strong>${log.type === 'initial_stock' ? '📦 Nhập lần đầu' : '🔄 Nhập thêm'}</strong>
                                        <div style="color:#666;font-size:0.9rem;margin-top:4px;">
                                            Ngày: ${log.date} | Số lượng: +${log.quantity} ${log.unit}
                                        </div>
                                        ${log.note ? `<div style="color:#888;font-size:0.85rem;margin-top:4px;">📝 ${log.note}</div>` : ''}
                                    </div>
                                    <div style="text-align:right;">
                                        <div style="font-weight:bold;color:#2196f3;">${formatCurrency(log.totalAmount)}</div>
                                        <div style="color:#666;font-size:0.8rem;">${formatCurrency(log.unitPrice)}/${log.unit}</div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
            <div style="padding:20px;background:#f5f5f5;border-top:1px solid #eee;text-align:center;">
                <button onclick="closeHistoryModal()" 
                        style="padding:10px 20px;background:#6c757d;color:white;border:none;border-radius:8px;cursor:pointer;">
                    Đóng
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

function createServiceHistoryModal(serviceName, services) {
    // Xóa modal cũ nếu có
    document.getElementById('serviceHistoryModal')?.remove();
    
    const modal = document.createElement('div');
    modal.id = 'serviceHistoryModal';
    modal.style.cssText = `
        position:fixed;top:0;left:0;right:0;bottom:0;
        background:rgba(0,0,0,0.85);z-index:99999;
        display:flex;align-items:center;justify-content:center;
        padding:20px;font-family:system-ui,sans-serif;
    `;

    modal.innerHTML = `
        <div style="background:white;border-radius:20px;width:100%;max-width:700px;max-height:80vh;overflow-y:auto;">
            <div style="background:#ff9800;color:white;padding:20px;border-radius:20px 20px 0 0;text-align:center;position:relative;">
                <h2 style="margin:0;font-size:1.4rem;">🔧 Lịch Sử Chi Phí: ${serviceName}</h2>
                <button onclick="closeServiceHistoryModal()" 
                        style="position:absolute;top:15px;right:20px;background:none;border:none;color:white;font-size:30px;cursor:pointer;width:40px;height:40px;display:flex;align-items:center;justify-content:center;">×</button>
            </div>
            <div style="padding:20px;">
                <div style="display:grid;gap:10px;">
                    ${services.map(service => `
                        <div style="padding:15px;border:1px solid #eee;border-radius:10px;background:#f9f9f9;">
                            <div style="display:flex;justify-content:space-between;align-items:center;">
                                <div>
                                    <strong>${service.date}</strong>
                                    ${service.note ? `<div style="color:#666;font-size:0.9rem;margin-top:4px;">📝 ${service.note}</div>` : ''}
                                </div>
                                <div style="text-align:right;">
                                    <div style="font-weight:bold;color:#e91e63;font-size:1.1rem;">
                                        ${formatCurrency(service.amount)}
                                    </div>
                                    <div style="color:#666;font-size:0.8rem;">Tháng: ${service.month}</div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div style="padding:20px;background:#f5f5f5;border-top:1px solid #eee;text-align:center;">
                <button onclick="closeServiceHistoryModal()" 
                        style="padding:10px 20px;background:#6c757d;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:bold;">
                    Đóng
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    
    // Thêm event listener để đóng khi click outside (tùy chọn)
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeServiceHistoryModal();
        }
    });
}

// Hàm đóng service history modal
function closeServiceHistoryModal() {
    const modal = document.getElementById('serviceHistoryModal');
    if (modal) {
        modal.remove();
        console.log('✅ Đã đóng popup lịch sử dịch vụ');
    }
}

// Cập nhật hàm closeHistoryModal tổng
function closeHistoryModal() {
    document.getElementById('inventoryHistoryModal')?.remove();
    closeServiceHistoryModal();
}


async function showServiceHistory(serviceName) {
    console.log(`📖 Đang mở lịch sử dịch vụ: ${serviceName}`);
    
    try {
        const services = await loadServiceHistory(serviceName);
        createServiceHistoryModal(serviceName, services);
    } catch (error) {
        console.error('❌ Lỗi tải lịch sử dịch vụ:', error);
        showToast('Lỗi tải lịch sử dịch vụ', 'error');
    }
}
function exportOperationalReport() {
    if (currentOperationalExpenses.length === 0) {
        showToast('Không có dữ liệu để xuất', 'error');
        return;
    }
    
    try {
        const data = currentOperationalExpenses.map(expense => ({
            'Ngày': new Date(expense.date).toLocaleDateString('vi-VN'),
            'Nội dung': expense.content,
            'Loại': expense.type === 'inventory' ? 'Hàng hóa' : 'Dịch vụ',
            'Số tiền': expense.amount,
            'Số lượng': expense.quantity || '',
            'Đơn vị': expense.unit || '',
            'Ghi chú': expense.note || ''
        }));
        
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        
        XLSX.utils.book_append_sheet(wb, ws, 'ChiPhiVanHanh');
        
        const fileName = `Bao_Cao_Chi_Phi_${currentOperationalMonth.replace('/', '_')}.xlsx`;
        XLSX.writeFile(wb, fileName);
        
        showToast(`Đã xuất file ${fileName}`, 'success');
        
    } catch (error) {
        console.error('Error exporting report:', error);
        showToast('Lỗi khi xuất file', 'error');
    }
}
async function loadServiceHistory(serviceName) {
    const snapshot = await db.collection('operational_expenses')
        .where('description', '==', serviceName)
        .where('type', '==', 'service')
        .orderBy('date', 'desc')
        .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}


// ==================== LUỒNG TIỆN ÍCH ====================
function formatCurrency(n) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
}

function showToast(msg, type = 'info') {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = `position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:${type==='error'?'#dc3545':type==='success'?'#28a745':'#333'};color:white;padding:16px 32px;border-radius:50px;z-index:100000;font-weight:bold;box-shadow:0 10px 30px rgba(0,0,0,0.3);font-size:16px;`;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3500);
}
// Thêm biến lưu danh mục
let productCategories = [];
let serviceCategories = [];

// Hàm tải danh mục từ Firestore
async function loadCategories() {
    try {
        // Tải danh mục hàng hóa
        const productSnapshot = await db.collection('product_categories')
            .where('companyId', '==', 'milano')
            .get();
        productCategories = productSnapshot.docs.map(doc => doc.data().name);
        
        // Tải danh mục dịch vụ
        const serviceSnapshot = await db.collection('service_categories')
            .where('companyId', '==', 'milano')
            .get();
        serviceCategories = serviceSnapshot.docs.map(doc => doc.data().name);
        
        console.log('✅ Đã tải danh mục:', { productCategories, serviceCategories });
    } catch (error) {
        console.log('ℹ️ Chưa có danh mục, sẽ sử dụng danh mục mặc định');
        // Danh mục mặc định nếu chưa có
        productCategories = ['Cà phê hạt', 'Sữa tươi', 'Đường', 'Syrup', 'Bánh ngọt', 'Cốc giấy'];
        serviceCategories = ['Tiền điện', 'Tiền nước', 'Tiền mạng', 'Tiền thuê mặt bằng', 'Lương nhân viên'];
    }
}

// Cập nhật hàm createExpenseFormFields
function createExpenseFormFields(type, today) {
    const isInventory = type === 'inventory';
    const categories = isInventory ? productCategories : serviceCategories;
    
    return `
        <div style="display:grid;gap:20px;">
            <div>
                <label style="font-weight:600;margin-bottom:8px;display:block;">
                    ${isInventory ? 'Tên hàng hóa' : 'Tên dịch vụ'} <span style="color:red">*</span>
                </label>
                <div style="display: flex; gap: 8px;">
                    <select id="expenseCategorySelect" 
                            style="flex:1;padding:16px;border:2px solid #ddd;border-radius:14px;font-size:17px;"
                            onchange="handleCategorySelectChange(this.value, '${type}')">
                        <option value="">-- Chọn ${isInventory ? 'hàng hóa' : 'dịch vụ'} --</option>
                        ${categories.map(cat => `
                            <option value="${cat}">${cat}</option>
                        `).join('')}
                        <option value="custom">+ Thêm mới</option>
                    </select>
                    <input type="text" id="expenseContentInput" 
                           placeholder="${isInventory ? 'Nhập tên hàng hóa' : 'Nhập tên dịch vụ'}" 
                           style="flex:1;padding:16px;border:2px solid #ddd;border-radius:14px;font-size:17px;display:none;">
                </div>
                <small style="color:#666;font-size:12px;display:block;margin-top:4px;">
                    Chọn từ danh sách hoặc "Thêm mới" để nhập tên mới
                </small>
            </div>
            <div>
                <label style="font-weight:600;margin-bottom:8px;display:block;">Số tiền <span style="color:red">*</span></label>
                <input type="text" id="expenseAmountInput" placeholder="1.500.000" inputmode="numeric"
                       style="width:100%;padding:16px;border:2px solid #ddd;border-radius:14px;font-size:17px;box-sizing:border-box;">
            </div>
            ${isInventory ? `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div>
                    <label style="font-weight:600;margin-bottom:8px;display:block;">Số lượng</label>
                    <input type="number" id="expenseQuantityInput" value="1" min="1"
                           style="width:100%;padding:16px;border:2px solid #ddd;border-radius:14px;font-size:17px;">
                </div>
                <div>
                    <label style="font-weight:600;margin-bottom:8px;display:block;">Đơn vị tính</label>
                    <div style="display: flex; gap: 8px;">
                        <select id="expenseUnitSelect" style="flex:1;padding:16px;border:2px solid #ddd;border-radius:14px;font-size:17px;"
                                onchange="handleUnitSelectChange(this.value)">
                            <option value="kg">kg</option>
                            <option value="gói">gói</option>
                            <option value="hộp">hộp</option>
                            <option value="thùng">thùng</option>
                            <option value="chai">chai</option>
                            <option value="lon">lon</option>
                            <option value="bao">bao</option>
                            <option value="cái">cái</option>
                            <option value="lít">lít</option>
                            <option value="ml">ml</option>
                            <option value="custom">+ Thêm đơn vị mới</option>
                        </select>
                        <input type="text" id="expenseUnitInput" 
                               placeholder="Nhập đơn vị" 
                               style="flex:1;padding:16px;border:2px solid #ddd;border-radius:14px;font-size:17px;display:none;">
                    </div>
                </div>
            </div>
            ` : ''}
            <div>
                <label style="font-weight:600;margin-bottom:8px;display:block;">
                    Ngày ${isInventory ? 'nhập kho' : 'chi phí'}
                </label>
                <input type="date" id="expenseDateInput" value="${today}"
                       style="width:100%;padding:16px;border:2px solid #ddd;border-radius:14px;font-size:17px;">
            </div>
            <div>
                <label style="font-weight:600;margin-bottom:8px;display:block;">Ghi chú</label>
                <textarea id="expenseNoteInput" rows="3" placeholder="Không bắt buộc..."
                          style="width:100%;padding:16px;border:2px solid #ddd;border-radius:14px;font-size:17px;resize:vertical;"></textarea>
            </div>
        </div>
    `;
}

// Hàm xử lý thay đổi dropdown danh mục
function handleCategorySelectChange(selectedValue, type) {
    const categorySelect = document.getElementById('expenseCategorySelect');
    const contentInput = document.getElementById('expenseContentInput');
    
    if (selectedValue === 'custom') {
        contentInput.style.display = 'block';
        contentInput.focus();
        contentInput.value = '';
    } else if (selectedValue) {
        contentInput.style.display = 'none';
        contentInput.value = selectedValue;
    } else {
        contentInput.style.display = 'block';
        contentInput.value = '';
    }
}

// Hàm xử lý thay đổi dropdown đơn vị
function handleUnitSelectChange(selectedValue) {
    const unitSelect = document.getElementById('expenseUnitSelect');
    const unitInput = document.getElementById('expenseUnitInput');
    
    if (selectedValue === 'custom') {
        unitInput.style.display = 'block';
        unitInput.focus();
        unitInput.value = '';
    } else {
        unitInput.style.display = 'none';
        unitInput.value = selectedValue;
    }
}

// Hàm lưu danh mục mới vào Firestore
async function saveNewCategory(categoryName, type) {
    try {
        const collectionName = type === 'inventory' ? 'product_categories' : 'service_categories';
        
        // Kiểm tra xem danh mục đã tồn tại chưa
        const existing = await db.collection(collectionName)
            .where('name', '==', categoryName)
            .where('companyId', '==', 'milano')
            .get();
            
        if (existing.empty) {
            await db.collection(collectionName).add({
                name: categoryName,
                type: type,
                companyId: 'milano',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: currentUser?.email || 'admin@milano.com'
            });
            console.log(`✅ Đã thêm danh mục mới: ${categoryName}`);
            
            // Cập nhật danh sách danh mục
            if (type === 'inventory') {
                productCategories.push(categoryName);
            } else {
                serviceCategories.push(categoryName);
            }
        }
    } catch (error) {
        console.error('❌ Lỗi lưu danh mục:', error);
    }
}

// Cập nhật hàm prepareExpenseData
function prepareExpenseData(formData, type) {
    const contentInput = document.getElementById('expenseContentInput');
    const categorySelect = document.getElementById('expenseCategorySelect');
    
    // Lấy tên từ input hoặc select
    const description = contentInput.style.display === 'block' ? 
        contentInput.value.trim() : 
        categorySelect.value;
    
    const baseData = {
        description: description,
        amount: formData.amount,
        type: type,
        category: type === 'inventory' ? 'Hàng hóa' : 'Dịch vụ',
        date: document.getElementById('expenseDateInput')?.value || new Date().toISOString().split('T')[0],
        month: currentOperationalMonth,
        note: document.getElementById('expenseNoteInput')?.value?.trim() || '',
        status: 'active',
        companyId: 'milano',
        creatorEmail: currentUser?.email || 'admin@milano.com',
        creatorId: currentUser?.uid || 'unknown',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    if (type === 'inventory') {
        baseData.quantity = Number(document.getElementById('expenseQuantityInput')?.value) || 1;
        
        // Lấy đơn vị từ input hoặc select
        const unitInput = document.getElementById('expenseUnitInput');
        const unitSelect = document.getElementById('expenseUnitSelect');
        baseData.unit = unitInput.style.display === 'block' ? 
            unitInput.value.trim() : 
            unitSelect.value;
            
        baseData.unitPrice = Math.round(formData.amount / baseData.quantity);
    }
    
    return baseData;
}

// Cập nhật hàm processSaveExpense để lưu danh mục mới
async function processSaveExpense(type) {
    console.log(`💾 Bắt đầu lưu ${type}`);
    
    try {
        // Bước 1: Validate dữ liệu
        const formData = validateExpenseForm(type);
        if (!formData) return;
        
        // Bước 2: Lấy thông tin danh mục
        const contentInput = document.getElementById('expenseContentInput');
        const categorySelect = document.getElementById('expenseCategorySelect');
        const isNewCategory = contentInput.style.display === 'block' && contentInput.value.trim();
        
        // Bước 3: Nếu là danh mục mới, lưu vào Firestore
        if (isNewCategory) {
            await saveNewCategory(contentInput.value.trim(), type);
        }
        
        // Bước 4: Chuẩn bị dữ liệu cho Firestore
        const expenseData = prepareExpenseData(formData, type);
        
        // Bước 5: Lưu vào operational_expenses
        await saveToOperationalExpenses(expenseData);
        
        // Bước 6: Nếu là hàng hóa, cập nhật kho
        if (type === 'inventory') {
            await updateInventoryData(expenseData);
        }
        
        // Bước 7: Thông báo thành công & refresh
        showSaveSuccessMessage(type, expenseData.amount);
        closeExpenseModal();
        refreshAllData();
        
    } catch (error) {
        console.error('❌ Lỗi lưu dữ liệu:', error);
        showToast('Lỗi lưu dữ liệu: ' + error.message, 'error');
    }
}

// Cập nhật hàm openExpenseModal để reset form
function openExpenseModal(type) {
    console.log(`📝 Mở modal thêm ${type === 'inventory' ? 'hàng hóa' : 'dịch vụ'}`);
    
    // Xóa modal cũ nếu có
    document.getElementById('milanoExpenseModal')?.remove();
    
    // Tạo modal mới
    createExpenseModal(type);
    
    // Reset form
    setTimeout(() => {
        const categorySelect = document.getElementById('expenseCategorySelect');
        const contentInput = document.getElementById('expenseContentInput');
        const unitSelect = document.getElementById('expenseUnitSelect');
        const unitInput = document.getElementById('expenseUnitInput');
        
        if (categorySelect && contentInput) {
            categorySelect.value = '';
            contentInput.style.display = 'block';
            contentInput.value = '';
        }
        
        if (unitSelect && unitInput) {
            unitSelect.value = 'kg';
            unitInput.style.display = 'none';
            unitInput.value = 'kg';
        }
    }, 100);
    
    // Focus vào input đầu tiên
    setTimeout(() => {
        document.getElementById('expenseContentInput')?.focus();
    }, 200);
}

// Cập nhật hàm initializeChiphiModule để tải danh mục
async function initializeChiphiModule() {
    console.log('🚀 Bắt đầu luồng khởi tạo module Chi Phí');
    
    try {
        // Bước 1: Tải danh mục
        await loadCategories();
        
        // Bước 2: Thiết lập dropdown tháng
        setupMonthSelector();
        
        // Bước 3: Tạo navigation giữa các view
        setupNavigation();
        
        // Bước 4: Tạo nút thao tác nhanh
        setupQuickActions();
        
        // Bước 5: Tải dữ liệu ban đầu
        loadInitialData();
        
        // Bước 6: Hiển thị view mặc định
        switchToView('overview');
        
        console.log('✅ Module Chi Phí khởi tạo thành công');
    } catch (error) {
        console.error('❌ Lỗi khởi tạo module:', error);
        showToast('Lỗi khởi tạo module Chi Phí', 'error');
    }
}
// Thêm vào chiphi.js

// Hàm lấy tổng chi phí nhân viên từ tab Nhân viên
async function getTotalStaffCost() {
    try {
        const snapshot = await db.collection('employees')
            .where('status', '==', 'active')
            .get();
            
        let totalStaffCost = 0;
        
        for (const doc of snapshot.docs) {
            const employee = doc.data();
            const employeeId = doc.id;
            
            // Tính lương thực lãnh cho tháng hiện tại
            const finalSalary = await calculateStaffFinalSalary(employeeId, currentOperationalMonth);
            totalStaffCost += finalSalary;
        }
        
        return totalStaffCost;
    } catch (error) {
        console.error('Error getting total staff cost:', error);
        return 0;
    }
}

// Hàm tính lương thực lãnh (dùng chung với tab Nhân viên)
async function calculateStaffFinalSalary(employeeId, month) {
    try {
        const employeeDoc = await db.collection('employees').doc(employeeId).get();
        if (!employeeDoc.exists) return 0;
        
        const employee = employeeDoc.data();
        const monthlySalary = Number(employee.monthlySalary || 0);
        
        // Load attendance
        const attendanceDoc = await db.collection('attendance')
            .doc(`${employeeId}_${month.replace('/', '_')}`)
            .get();
            
        let offDays = 0;
        let overtimeDays = 0;
        
        if (attendanceDoc.exists) {
            const attendanceData = attendanceDoc.data();
            const days = attendanceData.days || {};
            
            Object.values(days).forEach(status => {
                if (status === 'off') offDays++;
                if (status === 'overtime') overtimeDays++;
            });
        }
        
        // Load bonuses và penalties
        const [bonusesSnapshot, penaltiesSnapshot] = await Promise.all([
            db.collection('bonuses_penalties')
                .where('employeeId', '==', employeeId)
                .where('month', '==', month)
                .where('type', '==', 'bonus')
                .get(),
            db.collection('bonuses_penalties')
                .where('employeeId', '==', employeeId)
                .where('month', '==', month)
                .where('type', '==', 'penalty')
                .get()
        ]);
        
        const totalBonus = bonusesSnapshot.docs.reduce((sum, doc) => sum + Number(doc.data().amount || 0), 0);
        const totalPenalty = penaltiesSnapshot.docs.reduce((sum, doc) => sum + Number(doc.data().amount || 0), 0);
        
        // Tính lương thực lãnh
        const dailySalary = monthlySalary / 30;
        const finalSalary = monthlySalary 
            - (offDays * dailySalary)
            + (overtimeDays * dailySalary)
            + totalBonus
            - totalPenalty;
            
        return Math.round(finalSalary);
    } catch (error) {
        console.error('Error calculating final salary:', error);
        return 0;
    }
}

// Cập nhật hàm updateOperationalSummary để thêm chi phí nhân viên
async function updateOperationalSummary() {
    const total = currentOperationalExpenses.reduce((s, e) => s + (e.amount || 0), 0);
    const inventoryTotal = currentOperationalExpenses
        .filter(e => e.type === 'inventory')
        .reduce((s, e) => s + (e.amount || 0), 0);
    const serviceTotal = currentOperationalExpenses
        .filter(e => e.type === 'service')
        .reduce((s, e) => s + (e.amount || 0), 0);
    
    // Lấy tổng chi phí nhân viên
    const staffTotal = await getTotalStaffCost();

    const el = document.getElementById('operationalSummary');
    if (el) {
        el.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; text-align: center;">
                <div style="padding:10px;background:#667eea;color:white;border-radius:10px;cursor:pointer;" onclick="switchToView('overview')">
                    <div style="font-size:0.9rem;">Tổng Chi Phí</div>
                    <div style="font-weight:bold;font-size:1.0rem;">${formatCurrency(total + staffTotal)}</div>
                </div>
                <div style="padding:10px;background:#2196f3;color:white;border-radius:10px;cursor:pointer;" onclick="switchToView('inventory')">
                    <div style="font-size:0.9rem;">Hàng Hóa</div>
                    <div style="font-weight:bold;font-size:1.0rem;">${formatCurrency(inventoryTotal)}</div>
                </div>
                <div style="padding:10px;background:#ff9800;color:white;border-radius:10px;cursor:pointer;" onclick="switchToView('services')">
                    <div style="font-size:0.9rem;">Dịch Vụ</div>
                    <div style="font-weight:bold;font-size:1.0rem;">${formatCurrency(serviceTotal)}</div>
                </div>
                <div style="padding:10px;background:#9c27b0;color:white;border-radius:10px;cursor:pointer;" onclick="showStaffCostDetail()">
                    <div style="font-size:0.9rem;">Nhân Viên</div>
                    <div style="font-weight:bold;font-size:1.0rem;">${formatCurrency(staffTotal)}</div>
                </div>
            </div>
        `;
    }
}

// Hàm hiển thị chi tiết chi phí nhân viên
async function showStaffCostDetail() {
    try {
        const snapshot = await db.collection('employees')
            .where('status', '==', 'active')
            .get();
            
        const staffDetails = [];
        let totalStaffCost = 0;
        
        for (const doc of snapshot.docs) {
            const employee = doc.data();
            const employeeId = doc.id;
            
            const finalSalary = await calculateStaffFinalSalary(employeeId, currentOperationalMonth);
            totalStaffCost += finalSalary;
            
            staffDetails.push({
                name: employee.name,
                salary: finalSalary,
                monthlySalary: employee.monthlySalary || 0
            });
        }
        
        createStaffCostDetailModal(staffDetails, totalStaffCost);
    } catch (error) {
        console.error('Error showing staff cost detail:', error);
        showToast('Lỗi tải chi tiết chi phí nhân viên', 'error');
    }
}

// Tạo modal chi tiết chi phí nhân viên
function createStaffCostDetailModal(staffDetails, totalCost) {
    const modal = document.createElement('div');
    modal.id = 'staffCostDetailModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.85);
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        font-family: system-ui, sans-serif;
    `;

    modal.innerHTML = `
        <div style="background: white; border-radius: 20px; width: 100%; max-width: 600px; max-height: 80vh; overflow-y: auto;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #9c27b0, #7b1fa2); color: white; padding: 20px; border-radius: 20px 20px 0 0; text-align: center;">
                <h2 style="margin: 0; font-size: 1.4rem;">
                    👥 Chi Tiết Chi Phí Nhân Viên
                </h2>
                <div style="font-size: 1rem; margin-top: 8px;">
                    Tháng ${currentOperationalMonth} - Tổng: ${formatCurrency(totalCost)}
                </div>
                <button onclick="closeStaffCostDetailModal()" 
                        style="position: absolute; top: 15px; right: 20px; background: none; border: none; color: white; font-size: 30px; cursor: pointer;">×</button>
            </div>

            <!-- Content -->
            <div style="padding: 20px;">
                ${staffDetails.length === 0 ? `
                    <div style="text-align: center; padding: 40px; color: #666;">
                        Chưa có nhân viên nào
                    </div>
                ` : `
                    <div style="display: grid; gap: 10px;">
                        ${staffDetails.map(staff => `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #f8f9fa; border-radius: 8px;">
                                <div>
                                    <div style="font-weight: bold; color: #333;">${staff.name}</div>
                                    <div style="font-size: 0.8rem; color: #666;">
                                        Lương cơ bản: ${formatCurrency(staff.monthlySalary)}
                                    </div>
                                </div>
                                <div style="text-align: right;">
                                    <div style="font-weight: bold; color: #e91e63; font-size: 1.1rem;">
                                        ${formatCurrency(staff.salary)}
                                    </div>
                                    <div style="font-size: 0.8rem; color: #666;">
                                        ${formatPercentage(staff.salary, totalCost)}%
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>

            <!-- Footer -->
            <div style="padding: 20px; background: #f5f5f5; border-top: 1px solid #eee; text-align: center;">
                <button onclick="closeStaffCostDetailModal()" 
                        style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 8px; cursor: pointer;">
                    Đóng
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

// Hàm đóng modal
function closeStaffCostDetailModal() {
    document.getElementById('staffCostDetailModal')?.remove();
}

// Thêm CSS cho item nhân viên
/*
.staff-item {
    background: linear-gradient(135deg, #9c27b0, #7b1fa2);
    color: white;
}
*/
window.openExpenseModal = openExpenseModal;
window.processSaveExpense = processSaveExpense;
window.switchToView = switchToView;
window.showInventoryHistory = showInventoryHistory;
window.showServiceHistory = showServiceHistory;
window.handleQuickAction = handleQuickAction;
window.closeExpenseModal = closeExpenseModal;
window.closeHistoryModal = closeHistoryModal;
window.closeServiceHistoryModal = closeServiceHistoryModal;
window.toggleShowAllExpenses = toggleShowAllExpenses;
window.handleUnitSelectChange = handleUnitSelectChange;
window.handleCategorySelectChange = handleCategorySelectChange;
window.showStaffCostDetail = showStaffCostDetail;
window.closeStaffCostDetailModal = closeStaffCostDetailModal;
console.log('✅ Chiphi.js: Module đã sẵn sàng, chờ kích hoạt tab...');