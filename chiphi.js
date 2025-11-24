// chiphi.js – ĐỘC LẬP HOÀN TOÀN – TỐI ƯU TỐC ĐỘ
let currentOperationalMonth = '';
let currentOperationalExpenses = [];
let currentInventory = [];
let currentView = 'overview';
let showAllExpenses = false;
let allExpenses = [];
let productCategories = [];
let serviceCategories = [];
// Thêm vào đầu file chiphi.js
function ensureSalaryCalculator() {
    if (typeof window.calculateEmployeeSalaryForMonth !== 'function') {
        console.warn('Hàm tính lương từ nhanvien.js chưa sẵn sàng, sử dụng tính toán mặc định');
        // Fallback to default calculation
        return async function(employeeId, month) {
            // Tính toán mặc định nếu hàm từ nhanvien.js không có
            return await calculateEmployeeSalaryForMonthFallback(employeeId, month);
        };
    }
    return window.calculateEmployeeSalaryForMonth;
}

// Fallback function
async function calculateEmployeeSalaryForMonthFallback(employeeId, month) {
    try {
        const [empDoc, attDoc, bonusSnap, penaltySnap] = await Promise.all([
            db.collection('employees').doc(employeeId).get(),
            db.collection('attendance').doc(`${employeeId}_${month.replace('/', '_')}`).get(),
            db.collection('bonuses_penalties')
                .where('employeeId', '==', employeeId)
                .where('month', '==', month)
                .where('type', '==', 'bonus').get(),
            db.collection('bonuses_penalties')
                .where('employeeId', '==', employeeId)
                .where('month', '==', month)
                .where('type', '==', 'penalty').get()
        ]);

        if (!empDoc.exists) return 0;
        const emp = empDoc.data();
        const base = Number(emp.monthlySalary || 0);
        const daily = base / 30;

        let off = 0, ot = 0;
        if (attDoc.exists) {
            const data = attDoc.data() || {};
            const days = data.days || {};
            
            Object.keys(days).forEach(k => {
                const status = days[k];
                if (typeof status === 'string') {
                    if (status === 'off') off++;
                    if (status === 'overtime') ot++;
                }
            });
        }

        const bonus = bonusSnap.docs.reduce((s, d) => {
            const data = d.data();
            return s + Number(data.amount || 0);
        }, 0);
        
        const penalty = penaltySnap.docs.reduce((s, d) => {
            const data = d.data();
            return s + Number(data.amount || 0);
        }, 0);

        return Math.round(base - off * daily + ot * daily + bonus - penalty);
    } catch (err) {
        console.error('Lỗi tính lương (fallback):', err);
        return 0;
    }
}
// ==================== KHỞI TẠO ĐỘC LẬP ====================
function initializeChiphiModule() {
    console.log('🚀 Khởi tạo module Chi Phí - Độc lập hoàn toàn');
    currentOperationalMonth = getCurrentOperationalMonth(new Date());
    
    // Hiển thị loading
    showLoadingState();
    
    // Khởi tạo tuần tự để đảm bảo thứ tự
    setupMonthDropdown();
    setupNavigation();
    setupQuickActions();
    loadCategories().then(() => {
        loadInitialData();
        switchToView('overview');
    });
}

function showLoadingState() {
    const sections = ['overviewSection', 'inventorySection', 'servicesSection'];
    sections.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (section) {
            section.innerHTML = '<div class="loading-state">Đang tải dữ liệu...</div>';
        }
    });
}

// ==================== QUẢN LÝ THÁNG - ĐỘC LẬP ====================
function getCurrentOperationalMonth(date) {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    
    return day >= 20 ? 
        `${String(month).padStart(2, '0')}/${year}` :
        `${String(month === 1 ? 12 : month - 1).padStart(2, '0')}/${month === 1 ? year - 1 : year}`;
}


// ==================== QUẢN LÝ THÁNG - SỬA SẮP XẾP ====================
function generateOperationalMonths(count) {
    const months = [];
    const today = new Date();
    
    for (let i = 0; i < count; i++) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 20);
        const monthValue = getCurrentOperationalMonth(date);
        const monthLabel = formatOperationalPeriod(monthValue);
        
        if (!months.find(m => m.value === monthValue)) {
            months.push({ value: monthValue, label: monthLabel });
        }
    }
    
    // SẮP XẾP NGƯỢC LẠI: tháng mới nhất ở TRÊN cùng
    return months; // Bỏ .reverse() để tháng mới nhất ở trên
}

function setupMonthDropdown() {
    const dropdown = document.getElementById('operationalMonthSelector');
    if (!dropdown) return;

    const months = generateOperationalMonths(12);
    dropdown.innerHTML = months.map(month => 
        `<option value="${month.value}" ${month.value === currentOperationalMonth ? 'selected' : ''}>
            ${month.label}
        </option>`
    ).join('');

    dropdown.onchange = () => {
        currentOperationalMonth = dropdown.value;
        refreshAllData();
    };
    
    // Mặc định chọn tháng hiện tại
    currentOperationalMonth = getCurrentOperationalMonth(new Date());
    dropdown.value = currentOperationalMonth;
}

function formatOperationalPeriod(monthStr) {
    const [m, y] = monthStr.split('/').map(Number);
    const startMonth = m;
    const startYear = y;
    const endMonth = m === 12 ? 1 : m + 1;
    const endYear = m === 12 ? y + 1 : y;
    
    return `20/${String(startMonth).padStart(2, '0')} - 19/${String(endMonth).padStart(2, '0')}/${endYear}`;
}

// ==================== ĐIỀU HƯỚNG VIEW ====================
function setupNavigation() {
    const container = document.getElementById('quickActions');
    if (!container) return;

    container.innerHTML = `
        <div class="nav-buttons">
            <button onclick="switchToView('overview')" class="nav-btn ${currentView === 'overview' ? 'active' : ''}">
                📊 Tổng Quan
            </button>
            <button onclick="switchToView('inventory')" class="nav-btn ${currentView === 'inventory' ? 'active' : ''}">
                📦 Kho Hàng
            </button>
            <button onclick="switchToView('services')" class="nav-btn ${currentView === 'services' ? 'active' : ''}">
                🔧 Dịch Vụ
            </button>
        </div>
    `;
}

function switchToView(view) {
    currentView = view;
    updateNavigationUI();
    hideAllSections();
    showTargetSection(view);
    loadDataForView(view);
}

function updateNavigationUI() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if ((currentView === 'overview' && btn.textContent.includes('Tổng Quan')) ||
            (currentView === 'inventory' && btn.textContent.includes('Kho Hàng')) ||
            (currentView === 'services' && btn.textContent.includes('Dịch Vụ'))) {
            btn.classList.add('active');
        }
    });
}

function hideAllSections() {
    ['overviewSection', 'inventorySection', 'servicesSection'].forEach(id => {
        const section = document.getElementById(id);
        if (section) section.style.display = 'none';
    });
}

function showTargetSection(view) {
    const section = document.getElementById(`${view}Section`);
    if (section) section.style.display = 'block';
}
// === CHI TIẾT CHI PHÍ NHÂN VIÊN - SỬA LỖI POPUP TRÙNG ===
async function showStaffCostDetail(staffDetails, totalCost) {
    // KIỂM TRA POPUP ĐÃ TỒN TẠI CHƯA
    if (document.getElementById('staffCostDetailModal')) {
        console.log('⚠️ Popup đã mở, không mở lại');
        return;
    }

    console.log('🔍 Bắt đầu mở popup chi tiết nhân viên');
    
    try {
        // Load thêm thông tin chi tiết cho từng nhân viên
        const detailedStaff = await Promise.all(
            staffDetails.map(async (staff) => {
                const detail = await getEmployeeSalaryDetail(staff.name, currentOperationalMonth);
                return { 
                    ...staff, 
                    ...detail,
                    offDays: detail.offDays || 0,
                    overtimeDays: detail.overtimeDays || 0,
                    offDeduction: detail.offDeduction || 0,
                    overtimeBonus: detail.overtimeBonus || 0
                };
            })
        );

        createStaffCostDetailModal(detailedStaff, totalCost);
        
    } catch (error) {
        console.error('❌ Lỗi mở popup chi tiết:', error);
        showToast('Lỗi tải chi tiết nhân viên', 'error');
    }
}

function createStaffCostDetailModal(detailedStaff, totalCost) {
    // KIỂM TRA LẦN CUỐI TRƯỚC KHI TẠO POPUP
    if (document.getElementById('staffCostDetailModal')) {
        console.log('⚠️ Popup đã được tạo trước đó');
        return;
    }

    const modal = document.createElement('div');
    modal.id = 'staffCostDetailModal';
    modal.className = 'modal-overlay active';
    
    modal.innerHTML = `
        <div class="modal-content large">
            <div class="modal-header staff">
                <h3>💰 Chi Tiết Lương Nhân Viên</h3>
                <button class="modal-close" onclick="closeStaffCostDetailModal()">×</button>
            </div>
            <div class="modal-body">
                <div class="total-cost-display">
                    📊 Tổng chi phí lương thực tế: <strong>${formatCurrency(totalCost)}</strong>
                    <div style="font-size: 0.9rem; color: #666; margin-top: 5px;">
                        Tháng ${currentOperationalMonth} • ${detailedStaff.length} nhân viên
                    </div>
                </div>
                <div class="staff-list">
                    ${detailedStaff.length === 0 ? `
                        <div class="empty-state">
                            <div class="empty-icon">👥</div>
                            <div>Chưa có nhân viên nào</div>
                        </div>
                    ` : detailedStaff.map(staff => `
                        <div class="staff-item-detailed">
                            <div class="staff-header">
                                <div class="staff-name">${staff.name}</div>
                                <div class="staff-total">${formatCurrency(staff.calculatedSalary || staff.salary)}</div>
                            </div>
                            
                            <div class="salary-breakdown">
                                <div class="breakdown-item">
                                    <span class="label">Lương cơ bản:</span>
                                    <span class="value">${formatCurrency(staff.monthlySalary)}</span>
                                </div>
                                
                                ${staff.offDays > 0 ? `
                                <div class="breakdown-item negative">
                                    <span class="label">❌ ${staff.offDays} ngày off:</span>
                                    <span class="value">-${formatCurrency(staff.offDeduction)}</span>
                                </div>
                                ` : '<div class="breakdown-item"><span class="label">❌ Ngày off:</span><span class="value">0 ngày</span></div>'}
                                
                                ${staff.overtimeDays > 0 ? `
                                <div class="breakdown-item positive">
                                    <span class="label">⭐ ${staff.overtimeDays} tăng ca:</span>
                                    <span class="value">+${formatCurrency(staff.overtimeBonus)}</span>
                                </div>
                                ` : '<div class="breakdown-item"><span class="label">⭐ Tăng ca:</span><span class="value">0 ngày</span></div>'}
                                
                                ${staff.totalBonus > 0 ? `
                                <div class="breakdown-item positive">
                                    <span class="label">🎁 Thưởng:</span>
                                    <span class="value">+${formatCurrency(staff.totalBonus)}</span>
                                </div>
                                ` : ''}
                                
                                ${staff.totalPenalty > 0 ? `
                                <div class="breakdown-item negative">
                                    <span class="label">⚠️ Phạt:</span>
                                    <span class="value">-${formatCurrency(staff.totalPenalty)}</span>
                                </div>
                                ` : ''}
                            </div>
                            
                            <div class="salary-summary">
                                <div class="final-salary">
                                    Thực lãnh: <strong>${formatCurrency(staff.calculatedSalary || staff.salary)}</strong>
                                </div>
                                <div class="salary-percentage">
                                    ${formatPercentage(staff.calculatedSalary || staff.salary, totalCost)}% tổng chi phí
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-cancel" onclick="closeStaffCostDetailModal()">Đóng</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    console.log('✅ Popup chi tiết nhân viên đã mở');
}
// ==================== THAO TÁC NHANH - GIỮ NGUYÊN HTML ====================
function setupQuickActions() {
    const container = document.getElementById('quickActions');
    if (!container) return;

    const actionsHTML = `
        <div class="quick-actions-buttons">
            <button onclick="openExpenseModal('inventory')" class="btn-primary">
                📦 Thêm Hàng Hóa
            </button>
            <button onclick="openExpenseModal('service')" class="btn-secondary">
                🔧 Thêm Dịch Vụ
            </button>
            <button onclick="exportOperationalReport()" class="btn-export">
                📊 Xuất Báo Cáo
            </button>
        </div>
    `;
    
    container.innerHTML = actionsHTML;
    
    // Thêm sự kiện click cho tiêu đề
    const header = document.getElementById('quickActionsHeader');
    if (header) {
        header.addEventListener('click', () => {
            switchToView('overview');
        });
        
        // Thêm hiệu ứng hover
        header.addEventListener('mouseenter', () => {
            header.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            header.style.color = 'white';
            header.style.transform = 'translateY(-2px)';
            header.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
        });
        
        header.addEventListener('mouseleave', () => {
            header.style.background = '';
            header.style.color = '';
            header.style.transform = '';
            header.style.boxShadow = '';
        });
    }
}

// ==================== QUẢN LÝ DANH MỤC ====================
async function loadCategories() {
    try {
        // Danh mục mặc định - không phụ thuộc Firestore
        productCategories = ['Cà phê hạt', 'Sữa tươi', 'Đường', 'Syrup', 'Bánh ngọt', 'Cốc giấy', 'Ống hút'];
        serviceCategories = ['Tiền điện', 'Tiền nước', 'Tiền mạng', 'Tiền thuê mặt bằng', 'Sửa chữa', 'Vệ sinh'];
    } catch (error) {
        console.log('Sử dụng danh mục mặc định');
    }
}

// ==================== MODAL QUẢN LÝ CHI PHÍ ====================
function openExpenseModal(type) {
    document.getElementById('milanoExpenseModal')?.remove();
    
    const modal = document.createElement('div');
    modal.id = 'milanoExpenseModal';
    modal.className = 'modal-overlay active';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header ${type === 'inventory' ? 'inventory' : 'service'}">
                <h3>${type === 'inventory' ? '📦 Thêm Hàng Hóa' : '🔧 Thêm Dịch Vụ'}</h3>
                <button class="modal-close" onclick="closeExpenseModal()">×</button>
            </div>
            <div class="modal-body">
                ${createExpenseForm(type)}
            </div>
            <div class="modal-footer">
                <button class="btn-cancel" onclick="closeExpenseModal()">❌ Hủy</button>
                <button class="btn-confirm" onclick="processSaveExpense('${type}')">
                    ${type === 'inventory' ? '📦 Nhập Kho' : '💾 Lưu Chi Phí'}
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    initializeExpenseForm(type);
}

function createExpenseForm(type) {
    const isInventory = type === 'inventory';
    const today = new Date().toISOString().split('T')[0];
    
    return `
        <form class="expense-form" onsubmit="return false;">
            <div class="form-group">
                <label>${isInventory ? 'Tên hàng hóa' : 'Tên dịch vụ'} *</label>
                <input type="text" id="expenseContent" placeholder="Nhập tên..." required>
            </div>
            
            <div class="form-group">
                <label>Số tiền *</label>
                <input type="number" id="expenseAmount" placeholder="Nhập số tiền..." min="0" required>
            </div>
            
            ${isInventory ? `
            <div class="form-row">
                <div class="form-group">
                    <label>Số lượng</label>
                    <input type="number" id="expenseQuantity" value="1" min="1">
                </div>
                <div class="form-group">
                    <label>Đơn vị</label>
                    <select id="expenseUnit">
                        <option value="kg">kg</option>
                        <option value="gói">gói</option>
                        <option value="hộp">hộp</option>
                        <option value="thùng">thùng</option>
                        <option value="chai">chai</option>
                        <option value="cái">cái</option>
                    </select>
                </div>
            </div>
            ` : ''}
            
            <div class="form-group">
                <label>Ngày ${isInventory ? 'nhập kho' : 'chi phí'}</label>
                <input type="date" id="expenseDate" value="${today}" required>
            </div>
            
            <div class="form-group">
                <label>Ghi chú</label>
                <textarea id="expenseNote" placeholder="Không bắt buộc..."></textarea>
            </div>
        </form>
    `;
}

function initializeExpenseForm(type) {
    // Focus vào input đầu tiên
    setTimeout(() => {
        document.getElementById('expenseContent')?.focus();
    }, 100);
}

function closeExpenseModal() {
    document.getElementById('milanoExpenseModal')?.remove();
}

// ==================== XỬ LÝ LƯU DỮ LIỆU ====================
async function processSaveExpense(type) {
    try {
        const formData = validateExpenseForm(type);
        if (!formData) return;

        const expenseData = prepareExpenseData(formData, type);
        await saveExpenseData(expenseData, type);
        
        showToast(`✅ ${type === 'inventory' ? 'Đã nhập kho' : 'Đã lưu chi phí'} ${formatCurrency(expenseData.amount)}`, 'success');
        closeExpenseModal();
        refreshAllData();
        
    } catch (error) {
        console.error('Lỗi lưu dữ liệu:', error);
        showToast('❌ Lỗi lưu dữ liệu', 'error');
    }
}

function validateExpenseForm(type) {
    const content = document.getElementById('expenseContent')?.value?.trim();
    const amount = Number(document.getElementById('expenseAmount')?.value);
    
    if (!content || !amount || amount <= 0) {
        showToast('Vui lòng nhập đầy đủ thông tin', 'error');
        return null;
    }
    
    return { content, amount };
}

function prepareExpenseData(formData, type) {
    const baseData = {
        description: formData.content,
        amount: formData.amount,
        type: type,
        date: document.getElementById('expenseDate')?.value,
        month: currentOperationalMonth,
        note: document.getElementById('expenseNote')?.value?.trim() || '',
        companyId: 'milano',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    if (type === 'inventory') {
        baseData.quantity = Number(document.getElementById('expenseQuantity')?.value) || 1;
        baseData.unit = document.getElementById('expenseUnit')?.value || 'cái';
        baseData.unitPrice = Math.round(formData.amount / baseData.quantity);
    }
    
    return baseData;
}

async function saveExpenseData(expenseData, type) {
    // Lưu vào operational_expenses
    await db.collection('operational_expenses').add(expenseData);
    
    // Nếu là hàng hóa, cập nhật kho
    if (type === 'inventory') {
        await updateInventory(expenseData);
    }
}

async function updateInventory(expenseData) {
    const existingProduct = await db.collection('inventory')
        .where('productName', '==', expenseData.description)
        .where('companyId', '==', 'milano')
        .get();

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
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (!existingProduct.empty) {
        // Cập nhật số lượng
        const doc = existingProduct.docs[0];
        const current = doc.data();
        inventoryData.quantity = current.quantity + expenseData.quantity;
        inventoryData.totalAmount = inventoryData.quantity * expenseData.unitPrice;
        
        await db.collection('inventory').doc(doc.id).update(inventoryData);
    } else {
        // Thêm mới
        inventoryData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        await db.collection('inventory').add(inventoryData);
    }
}

// ==================== TẢI DỮ LIỆU - TỐI ƯU TỐC ĐỘ ====================
function refreshAllData() {
    loadOperationalExpenses();
    loadDataForView(currentView);
}

function loadInitialData() {
    loadOperationalExpenses();
}

function loadDataForView(view) {
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

async function loadOperationalExpenses() {
    try {
        const snapshot = await db.collection('operational_expenses')
            .where('month', '==', currentOperationalMonth)
            .get();

        currentOperationalExpenses = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })).sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));

        updateOperationalSummary();
    } catch (error) {
        console.error('Lỗi tải chi phí:', error);
    }
}

async function loadOverviewData() {
    try {
        await Promise.all([
            loadRecentExpenses(),
            loadInventorySummary(),
            loadStaffCost()
        ]);
    } catch (error) {
        console.error('Lỗi tải overview:', error);
    }
}

async function loadRecentExpenses() {
    try {
        const snapshot = await db.collection('operational_expenses')
            .where('month', '==', currentOperationalMonth)
            .orderBy('createdAt', 'desc')
            .get();

        allExpenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        displayRecentExpenses(showAllExpenses ? allExpenses : allExpenses.slice(0, 5));
    } catch (error) {
        console.error('Lỗi tải chi phí gần đây:', error);
    }
}

function displayRecentExpenses(expenses) {
    const container = document.getElementById('recentExpensesList');
    if (!container) return;

    container.innerHTML = expenses.length === 0 ? `
        <div class="empty-state">
            <div class="empty-icon">📋</div>
            <div>Chưa có chi phí nào trong tháng ${currentOperationalMonth}</div>
        </div>
    ` : expenses.map(expense => `
        <div class="expense-item ${expense.type}">
            <div class="expense-content">
                <div class="expense-title">${expense.description}</div>
                <div class="expense-meta">
                    ${expense.type === 'inventory' ? '📦' : '🔧'} • ${expense.date}
                    ${expense.quantity ? ` • ${expense.quantity} ${expense.unit}` : ''}
                </div>
                ${expense.note ? `<div class="expense-note">📝 ${expense.note}</div>` : ''}
            </div>
            <div class="expense-amount">${formatCurrency(expense.amount)}</div>
        </div>
    `).join('');

    if (!showAllExpenses && allExpenses.length > 5) {
        container.innerHTML += `
            <div class="expenses-count">
                Đang hiển thị 5/${allExpenses.length} chi phí
            </div>
        `;
    }
}

function toggleShowAllExpenses() {
    showAllExpenses = !showAllExpenses;
    const expensesToShow = showAllExpenses ? allExpenses : allExpenses.slice(0, 5);
    displayRecentExpenses(expensesToShow);
    
    const btn = document.getElementById('toggleExpensesBtn');
    if (btn) btn.textContent = showAllExpenses ? 'Ẩn bớt' : 'Xem toàn bộ';
}

// ==================== QUẢN LÝ KHO HÀNG ====================
async function loadInventorySummary() {
    try {
        const snapshot = await db.collection('inventory')
            .where('companyId', '==', 'milano')
            .get();

        const totalValue = snapshot.docs.reduce((sum, doc) => sum + (doc.data().totalAmount || 0), 0);
        const totalProducts = snapshot.docs.length;
        const lowStockCount = snapshot.docs.filter(doc => (doc.data().quantity || 0) < 10).length;

        const container = document.getElementById('inventorySummary');
        if (container) {
            container.innerHTML = `
                <div class="summary-card" onclick="switchToView('inventory')">
                    <div class="summary-header">
                        <span class="view-detail">Xem chi tiết →</span>
                    </div>
                    <div class="inventory-stats">
                        <div class="stat-item">
                            <div class="stat-label">Tổng SP</div>
                            <div class="stat-value">${totalProducts}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">Giá trị</div>
                            <div class="stat-value">${formatCurrencyShort(totalValue)}</div>
                        </div>
                        <div class="stat-item ${lowStockCount > 0 ? 'warning' : ''}">
                            <div class="stat-label">Sắp hết</div>
                            <div class="stat-value">${lowStockCount}</div>
                        </div>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Lỗi tải tổng quan kho:', error);
    }
}

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
        console.error('Lỗi tải kho hàng:', error);
    }
}

function displayInventory() {
    const container = document.getElementById('inventoryList');
    if (!container) return;

    updateInventoryStats();

    container.innerHTML = currentInventory.length === 0 ? `
        <div class="empty-state">
            <div class="empty-icon">📦</div>
            <div>Kho hàng trống</div>
            <small>Nhấn "Thêm Hàng Hóa" để nhập hàng</small>
        </div>
    ` : currentInventory.map(item => `
        <div class="inventory-item" onclick="showInventoryHistory('${item.id}')">
            <div class="inventory-info">
                <div class="product-name">${item.productName}</div>
                <div class="product-details">
                    Tồn kho: <strong>${item.quantity} ${item.unit}</strong>
                </div>
                <div class="product-price">
                    Giá nhập: ${formatCurrency(item.unitPrice)}/${item.unit}
                </div>
            </div>
            <div class="inventory-value">
                <div class="total-amount">${formatCurrency(item.totalAmount)}</div>
                <div class="last-update">Cập nhật: ${formatDate(item.lastRestockDate)}</div>
            </div>
            ${item.note ? `<div class="inventory-note">📝 ${item.note}</div>` : ''}
        </div>
    `).join('');
}

function updateInventoryStats() {
    const totalProducts = currentInventory.length;
    const totalValue = currentInventory.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
    const lowStockCount = currentInventory.filter(item => (item.quantity || 0) < 10).length;

    ['totalProducts', 'totalInventoryValue', 'lowStockCount'].forEach((id, index) => {
        const element = document.getElementById(id);
        if (element) {
            const values = [totalProducts, formatCurrency(totalValue), lowStockCount];
            element.textContent = values[index];
        }
    });
}

// ==================== QUẢN LÝ DỊCH VỤ ====================
async function loadServicesData() {
    try {
        const snapshot = await db.collection('operational_expenses')
            .where('month', '==', currentOperationalMonth)
            .where('type', '==', 'service')
            .get();

        const services = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        displayServices(services);
    } catch (error) {
        console.error('Lỗi tải dịch vụ:', error);
    }
}

function displayServices(services) {
    const container = document.getElementById('servicesList');
    if (!container) return;

    updateServiceStats(services);

    // Gom nhóm dịch vụ trùng tên
    const grouped = {};
    services.forEach(service => {
        const key = service.description;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(service);
    });

    container.innerHTML = Object.entries(grouped).length === 0 ? `
        <div class="empty-state">
            <div class="empty-icon">🔧</div>
            <div>Chưa có chi phí dịch vụ</div>
        </div>
    ` : Object.entries(grouped).map(([name, list]) => {
        const total = list.reduce((sum, s) => sum + (s.amount || 0), 0);
        const hasMultiple = list.length > 1;
        
        return `
            <div class="service-item" onclick="${hasMultiple ? `showServiceHistory('${name}')` : 'void(0)'}">
                <div class="service-info">
                    <div class="service-name">
                        ${name}
                        ${hasMultiple ? `<span class="service-count">(${list.length} lần)</span>` : ''}
                    </div>
                    <div class="service-meta">
                        ${hasMultiple ? 'Click để xem lịch sử' : `Ngày: ${list[0].date}`}
                    </div>
                    ${list[0].note ? `<div class="service-note">📝 ${list[0].note}</div>` : ''}
                </div>
                <div class="service-amount">
                    <div class="total-cost">${formatCurrency(total)}</div>
                    ${!hasMultiple ? `<div class="service-date">${list[0].date}</div>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function updateServiceStats(services) {
    const totalCost = services.reduce((sum, s) => sum + (s.amount || 0), 0);
    const uniqueServices = [...new Set(services.map(s => s.description))].length;

    ['totalServicesCost', 'totalServiceTypes'].forEach((id, index) => {
        const element = document.getElementById(id);
        if (element) {
            const values = [formatCurrency(totalCost), uniqueServices];
            element.textContent = values[index];
        }
    });
}

// === TÍNH SỐ NGÀY LÀM VIỆC TRONG THÁNG ===
function calculateWorkingDays(attendanceDoc, month) {
    const [monthPart, yearPart] = month.split('/').map(Number);
    const year = parseInt(yearPart);
    const monthNum = parseInt(monthPart);
    
    // Tính số ngày trong tháng
    const daysInMonth = new Date(year, monthNum, 0).getDate();
    
    let workingDays = 0;
    let offDays = 0;
    let overtimeDays = 0;

    if (attendanceDoc.exists) {
        const attendance = attendanceDoc.data();
        const days = attendance.days || {};
        
        // Đếm số ngày làm việc (không phải off)
        for (let day = 1; day <= daysInMonth; day++) {
            const dayKey = `days.${day}`;
            const status = days[day] || 'present'; // Mặc định là có làm nếu không có dữ liệu
            
            if (status === 'off') {
                offDays++;
            } else if (status === 'overtime') {
                overtimeDays++;
                workingDays++; // Tăng ca vẫn tính là ngày làm việc
            } else if (status === 'present') {
                workingDays++;
            }
            // Các trạng thái khác mặc định không tính
        }
    } else {
        // Nếu không có dữ liệu chấm công, mặc định làm cả tháng (trừ CN)
        workingDays = calculateDefaultWorkingDays(monthNum, year);
    }

    console.log(`📅 Thống kê ngày làm việc tháng ${month}:`, {
        tổngNgàyTrongTháng: daysInMonth,
        ngàyLàmViệc: workingDays,
        ngàyOff: offDays,
        tăngCa: overtimeDays
    });

    return { workingDays, offDays, overtimeDays };
}

// === TÍNH SỐ NGÀY LÀM VIỆC MẶC ĐỊNH (TRỪ CHỦ NHẬT) ===
function calculateDefaultWorkingDays(month, year) {
    const daysInMonth = new Date(year, month, 0).getDate();
    let workingDays = 0;
    
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        // Chủ nhật (0) là ngày nghỉ
        if (date.getDay() !== 0) {
            workingDays++;
        }
    }
    
    return workingDays;
}
// === TÍNH LƯƠNG CHO CHI PHÍ - SỬA LỖI KHÔNG TÍNH OFF/TĂNG CA ===
// === TÍNH LƯƠNG CHO CHI PHÍ - SỬA LỖI ĐỌC DỮ LIỆU CHẤM CÔNG ===
async function calculateEmployeeSalaryForChiphi(employeeId, month) {
    try {
        console.log(`🔍 Bắt đầu tính lương cho ${employeeId} tháng ${month}`);
        
        const [employeeDoc, attendanceDoc, bonusesSnapshot, penaltiesSnapshot] = await Promise.all([
            db.collection('employees').doc(employeeId).get(),
            db.collection('attendance').doc(`${employeeId}_${month.replace('/', '_')}`).get(),
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

        if (!employeeDoc.exists) {
            console.log('❌ Không tìm thấy nhân viên:', employeeId);
            return 0;
        }

        const employee = employeeDoc.data();
        const monthlySalary = Number(employee.monthlySalary || 0);
        const dailySalary = monthlySalary / 30;

        // TÍNH NGÀY OFF VÀ TĂNG CA - SỬA LỖI QUAN TRỌNG
        let offDays = 0, overtimeDays = 0;
        
        if (attendanceDoc.exists) {
            const attendance = attendanceDoc.data();
            console.log('📊 Dữ liệu chấm công RAW:', attendance);
            
            // ĐỌC ĐÚNG CẤU TRÚC DỮ LIỆU: days.16, days.17, days.18,...
            Object.keys(attendance).forEach(key => {
                if (key.startsWith('days.')) {
                    const status = attendance[key];
                    const dayNumber = key.replace('days.', '');
                    console.log(`📅 Ngày ${dayNumber}: ${status}`);
                    
                    if (status === 'off') offDays++;
                    if (status === 'overtime') overtimeDays++;
                }
            });
            
            console.log(`📊 Kết quả đếm: ${offDays} off, ${overtimeDays} overtime`);
        } else {
            console.log('❌ Không có dữ liệu chấm công');
        }

        // Tính tổng thưởng
        const totalBonus = bonusesSnapshot.docs.reduce((sum, doc) => {
            const data = doc.data();
            return sum + Number(data.amount || 0);
        }, 0);
        
        // Tính tổng phạt
        const totalPenalty = penaltiesSnapshot.docs.reduce((sum, doc) => {
            const data = doc.data();
            return sum + Number(data.amount || 0);
        }, 0);

        // TÍNH LƯƠNG THỰC TẾ
        const actualSalary = monthlySalary 
            - (offDays * dailySalary) 
            + (overtimeDays * dailySalary) 
            + totalBonus 
            - totalPenalty;

        console.log(`💰 Lương thực tế ${employee.name}:`, {
            lươngCơBản: monthlySalary,
            ngàyOff: offDays,
            trừOff: offDays * dailySalary,
            tăngCa: overtimeDays,
            cộngTăngCa: overtimeDays * dailySalary,
            thưởng: totalBonus,
            phạt: totalPenalty,
            thựcLãnh: Math.round(actualSalary)
        });

        return Math.max(0, Math.round(actualSalary));
        
    } catch (error) {
        console.error('❌ Lỗi tính lương thực tế (chiphi):', error, 'employeeId:', employeeId, 'month:', month);
        return 0;
    }
}

// === HÀM DEBUG - KIỂM TRA DỮ LIỆU CHẤM CÔNG ===
async function debugEmployeeAttendance(employeeId, month) {
    try {
        console.log('🐛 DEBUG chấm công:', employeeId, month);
        
        const attendanceDoc = await db.collection('attendance')
            .doc(`${employeeId}_${month.replace('/', '_')}`)
            .get();

        if (attendanceDoc.exists) {
            const data = attendanceDoc.data();
            console.log('📊 Dữ liệu chấm công RAW:', data);
            console.log('📅 Days object:', data.days);
            
            if (data.days) {
                Object.keys(data.days).forEach(key => {
                    console.log(`📅 ${key}: ${data.days[key]}`);
                });
            }
        } else {
            console.log('❌ Không có dữ liệu chấm công');
        }
    } catch (error) {
        console.error('❌ Lỗi debug:', error);
    }
}

// === TÍNH TỔNG CHI PHÍ NHÂN VIÊN - ĐẢM BẢO GỌI ĐÚNG ===
async function loadStaffCost() {
    try {
        console.log('👥 Bắt đầu tính chi phí nhân viên cho tháng:', currentOperationalMonth);
        
        const snapshot = await db.collection('employees')
            .where('status', '==', 'active')
            .get();

        let totalStaffCost = 0;
        const staffDetails = [];

        const salaryPromises = snapshot.docs.map(async (doc) => {
            const employeeData = doc.data();
            const employeeId = doc.id;
            
            const salary = await calculateEmployeeSalaryForChiphi(employeeId, currentOperationalMonth);
            totalStaffCost += salary;
            
            // Thêm cả employeeId để dùng cho chi tiết
            staffDetails.push({
                name: employeeData.name,
                salary: salary,
                monthlySalary: employeeData.monthlySalary || 0,
                employeeId: employeeId
            });
        });

        await Promise.all(salaryPromises);
        
        console.log('📋 Danh sách nhân viên tính lương:', staffDetails);
        updateOperationalSummary(totalStaffCost, staffDetails);
        
    } catch (error) {
        console.error('❌ Lỗi tính chi phí nhân viên:', error);
        updateOperationalSummary(0, []);
    }
}

// ==================== THÊM HÀM TÍNH CHI PHÍ HÀNG NGÀY ====================
async function loadDailyExpensesForChiphi(month) {
    try {
        const dateRange = getOperationalMonthDateRange(month);
        
        const snapshot = await db.collection('daily_expenses')
            .where('date', '>=', dateRange.startDate)
            .where('date', '<=', dateRange.endDate)
            .get();
            
        let totalDaily = 0;
        
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.expenses && Array.isArray(data.expenses)) {
                data.expenses.forEach(expense => {
                    totalDaily += Number(expense.amount) || 0;
                });
            }
        });
        
        return totalDaily;
        
    } catch (error) {
        console.error('Lỗi tải chi phí hàng ngày:', error);
        return 0;
    }
}

// ==================== SỬA HÀM UPDATE TỔNG QUAN ====================
async function updateOperationalSummary(staffTotal = 0, staffDetails = []) {
    const expensesTotal = currentOperationalExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const inventoryTotal = currentOperationalExpenses
        .filter(e => e.type === 'inventory')
        .reduce((sum, e) => sum + (e.amount || 0), 0);
    const serviceTotal = currentOperationalExpenses
        .filter(e => e.type === 'service')
        .reduce((sum, e) => sum + (e.amount || 0), 0);
    
    // THÊM: Tính chi phí hàng ngày
    const dailyTotal = await loadDailyExpensesForChiphi(currentOperationalMonth);

    const totalAll = expensesTotal + staffTotal + dailyTotal;

    const container = document.getElementById('operationalSummary');
    if (container) {
        container.innerHTML = `
            <div class="summary-grid">
                <div class="summary-item total" onclick="handleSummaryClick('overview')">
                    <div class="summary-value">${formatCurrency(totalAll)}</div>
                    <div class="summary-label">Tổng Chi Phí</div>
                </div>
                <div class="summary-item inventory" onclick="handleSummaryClick('inventory')">
                    <div class="summary-value">${formatCurrency(inventoryTotal)}</div>
                    <div class="summary-label">Hàng Hóa</div>
                </div>
                <div class="summary-item service" onclick="handleSummaryClick('services')">
                    <div class="summary-value">${formatCurrency(serviceTotal)}</div>
                    <div class="summary-label">Dịch Vụ</div>
                </div>
                <div class="summary-item staff" onclick="handleStaffCostClick(${JSON.stringify(staffDetails).replace(/"/g, '&quot;')}, ${staffTotal})">
                    <div class="summary-value">${formatCurrency(staffTotal)}</div>
                    <div class="summary-label">Nhân Viên</div>
                </div>
                <!-- THÊM: Chi phí hàng ngày -->
                <div class="summary-item daily" onclick="handleSummaryClick('overview')">
                    <div class="summary-value">${formatCurrency(dailyTotal)}</div>
                    <div class="summary-label">Hàng Ngày</div>
                </div>
            </div>
        `;
    }
}

// ==================== THÊM HÀM LẤY DATE RANGE ====================
function getOperationalMonthDateRange(month) {
    const [monthNum, year] = month.split('/').map(Number);
    
    let startMonth = monthNum - 1;
    let startYear = year;
    if (startMonth === 0) {
        startMonth = 12;
        startYear = year - 1;
    }
    
    const startDate = `${startYear}-${String(startMonth).padStart(2, '0')}-20`;
    const endDate = `${year}-${String(monthNum).padStart(2, '0')}-19`;
    
    return { startDate, endDate };
}

// === XỬ LÝ CLICK SUMMARY - NGĂN NHIỀU LẦN ===
let isHandlingClick = false;

function handleSummaryClick(view) {
    if (isHandlingClick) {
        console.log('⚠️ Đang xử lý click, bỏ qua');
        return;
    }
    
    isHandlingClick = true;
    console.log(`🖱️ Chuyển đến tab: ${view}`);
    switchToView(view);
    
    // Reset sau 500ms
    setTimeout(() => {
        isHandlingClick = false;
    }, 500);
}

function handleStaffCostClick(staffDetails, totalCost) {
    if (isHandlingClick) {
        console.log('⚠️ Đang xử lý click, bỏ qua');
        return;
    }
    
    isHandlingClick = true;
    console.log('🖱️ Mở popup chi tiết nhân viên');
    showStaffCostDetail(staffDetails, totalCost);
    
    // Reset sau 500ms
    setTimeout(() => {
        isHandlingClick = false;
    }, 500);
}
// ==================== TIỆN ÍCH ====================
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
}

function formatCurrencyShort(amount) {
    if (amount >= 1000000) {
        return (amount / 1000000).toFixed(1) + 'M';
    }
    if (amount >= 1000) {
        return (amount / 1000).toFixed(0) + 'K';
    }
    return amount.toString();
}

function formatDate(dateString) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('vi-VN');
}

function showToast(message, type = 'info') {
    // Triển khai toast đơn giản
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
        background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#333'};
        color: white; padding: 12px 24px; border-radius: 25px; z-index: 10000;
        font-weight: bold; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
// ==================== QUẢN LÝ LỊCH SỬ ====================

// === LỊCH SỬ KHO HÀNG ===
// === LỊCH SỬ KHO HÀNG - THÊM NÚT XÓA ===
async function showInventoryHistory(productId) {
    try {
        const [logs, productDoc] = await Promise.all([
            loadInventoryLogs(productId),
            db.collection('inventory').doc(productId).get()
        ]);
        
        createInventoryHistoryModal(logs, productDoc.data());
    } catch (error) {
        console.error('Lỗi tải lịch sử kho:', error);
        showToast('Lỗi tải lịch sử nhập hàng', 'error');
    }
}

function createInventoryHistoryModal(logs, productInfo) {
    const modal = document.createElement('div');
    modal.id = 'inventoryHistoryModal';
    modal.className = 'modal-overlay active';
    
    modal.innerHTML = `
        <div class="modal-content large">
            <div class="modal-header inventory">
                <h3>📦 Lịch Sử Nhập Kho - ${productInfo?.productName || 'Sản phẩm'}</h3>
                <button class="modal-close" onclick="closeHistoryModal()">×</button>
            </div>
            <div class="modal-body">
                ${logs.length === 0 ? `
                    <div class="empty-state">
                        <div class="empty-icon">📋</div>
                        <div>Chưa có lịch sử nhập hàng</div>
                    </div>
                ` : `
                    <div class="history-list">
                        ${logs.map(log => `
                            <div class="history-item ${log.type}" data-log-id="${log.id}">
                                <div class="history-content">
                                    <div class="history-title">
                                        ${log.type === 'initial_stock' ? '📦 Nhập lần đầu' : '🔄 Nhập thêm'}
                                    </div>
                                    <div class="history-meta">
                                        Ngày: ${log.date} | Số lượng: +${log.quantity} ${log.unit}
                                    </div>
                                    ${log.note ? `<div class="history-note">📝 ${log.note}</div>` : ''}
                                </div>
                                <div class="history-actions">
                                    <div class="history-amount">
                                        <div class="amount">${formatCurrency(log.totalAmount)}</div>
                                        <div class="unit-price">${formatCurrency(log.unitPrice)}/${log.unit}</div>
                                    </div>
                                    <button class="btn-danger btn-small" onclick="deleteInventoryLog('${log.id}', '${log.productId}')">
                                        🗑️ Xóa
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
            <div class="modal-footer">
                <button class="btn-cancel" onclick="closeHistoryModal()">Đóng</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

// === XÓA LỊCH SỬ NHẬP KHO ===
async function deleteInventoryLog(logId, productId) {
    if (!confirm('Bạn có chắc muốn xóa lịch sử nhập hàng này? Thao tác này không thể hoàn tác.')) {
        return;
    }

    try {
        await db.collection('inventory_logs').doc(logId).delete();
        showToast('✅ Đã xóa lịch sử nhập hàng', 'success');
        
        // Reload lại lịch sử
        closeHistoryModal();
        setTimeout(() => showInventoryHistory(productId), 300);
        
    } catch (error) {
        console.error('Lỗi xóa lịch sử kho:', error);
        showToast('❌ Lỗi khi xóa lịch sử', 'error');
    }
}

async function loadInventoryLogs(productId) {
    const snapshot = await db.collection('inventory_logs')
        .where('productId', '==', productId)
        .orderBy('createdAt', 'desc')
        .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}


// === LỊCH SỬ DỊCH VỤ ===
async function showServiceHistory(serviceName) {
    try {
        const services = await loadServiceHistory(serviceName);
        createServiceHistoryModal(serviceName, services);
    } catch (error) {
        console.error('Lỗi tải lịch sử dịch vụ:', error);
        showToast('Lỗi tải lịch sử dịch vụ', 'error');
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

// === LỊCH SỬ DỊCH VỤ - THÊM NÚT XÓA ===
function createServiceHistoryModal(serviceName, services) {
    const modal = document.createElement('div');
    modal.id = 'serviceHistoryModal';
    modal.className = 'modal-overlay active';
    
    modal.innerHTML = `
        <div class="modal-content large">
            <div class="modal-header service">
                <h3>🔧 Lịch Sử: ${serviceName}</h3>
                <button class="modal-close" onclick="closeServiceHistoryModal()">×</button>
            </div>
            <div class="modal-body">
                <div class="history-list">
                    ${services.map(service => `
                        <div class="history-item service" data-service-id="${service.id}">
                            <div class="history-content">
                                <div class="history-title">${service.date}</div>
                                <div class="history-meta">Tháng: ${service.month}</div>
                                ${service.note ? `<div class="history-note">📝 ${service.note}</div>` : ''}
                            </div>
                            <div class="history-actions">
                                <div class="history-amount">
                                    <div class="amount">${formatCurrency(service.amount)}</div>
                                </div>
                                <button class="btn-danger btn-small" onclick="deleteServiceRecord('${service.id}', '${serviceName}')">
                                    🗑️ Xóa
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-cancel" onclick="closeServiceHistoryModal()">Đóng</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

// === XÓA DỊCH VỤ ===
async function deleteServiceRecord(serviceId, serviceName) {
    if (!confirm(`Bạn có chắc muốn xóa chi phí dịch vụ "${serviceName}" này? Thao tác này không thể hoàn tác.`)) {
        return;
    }

    try {
        await db.collection('operational_expenses').doc(serviceId).delete();
        showToast('✅ Đã xóa chi phí dịch vụ', 'success');
        
        // Reload lại dữ liệu
        closeServiceHistoryModal();
        refreshAllData();
        
    } catch (error) {
        console.error('Lỗi xóa dịch vụ:', error);
        showToast('❌ Lỗi khi xóa dịch vụ', 'error');
    }
}
// === DEBUG TOÀN BỘ DỮ LIỆU NHÂN VIÊN ===
async function debugAllStaffAttendance() {
    try {
        console.log('🐛 Bắt đầu debug toàn bộ dữ liệu nhân viên...');
        
        const snapshot = await db.collection('employees')
            .where('status', '==', 'active')
            .get();

        for (const doc of snapshot.docs) {
            const employee = doc.data();
            const employeeId = doc.id;
            
            console.log(`\n🔍 Debug nhân viên: ${employee.name} (${employeeId})`);
            
            const attendanceDoc = await db.collection('attendance')
                .doc(`${employeeId}_${currentOperationalMonth.replace('/', '_')}`)
                .get();

            if (attendanceDoc.exists) {
                const attendance = attendanceDoc.data();
                console.log('📊 Dữ liệu chấm công:', attendance);
                
                let offCount = 0, overtimeCount = 0;
                
                // Kiểm tra cấu trúc days
                if (attendance.days && typeof attendance.days === 'object') {
                    Object.keys(attendance.days).forEach(day => {
                        const status = attendance.days[day];
                        console.log(`📅 Day ${day}: ${status}`);
                        if (status === 'off') offCount++;
                        if (status === 'overtime') overtimeCount++;
                    });
                }
                
                // Kiểm tra các trường riêng lẻ
                Object.keys(attendance).forEach(key => {
                    if (key.startsWith('days.')) {
                        const status = attendance[key];
                        console.log(`📅 ${key}: ${status}`);
                        if (status === 'off') offCount++;
                        if (status === 'overtime') overtimeCount++;
                    }
                });
                
                console.log(`📊 Kết quả: ${offCount} off, ${overtimeCount} overtime`);
            } else {
                console.log('❌ Không có dữ liệu chấm công');
            }
        }
        
        alert('✅ Đã debug xong. Kiểm tra Console để xem chi tiết.');
        
    } catch (error) {
        console.error('❌ Lỗi debug:', error);
        alert('❌ Lỗi khi debug. Kiểm tra Console.');
    }
}
// === CHI TIẾT CHI PHÍ NHÂN VIÊN - SỬA LỖI HIỂN THỊ ===
async function showStaffCostDetail(staffDetails, totalCost) {
    // Load thêm thông tin chi tiết cho từng nhân viên
    const detailedStaff = await Promise.all(
        staffDetails.map(async (staff) => {
            const detail = await getEmployeeSalaryDetail(staff.name, currentOperationalMonth);
            return { 
                ...staff, 
                ...detail,
                // Đảm bảo có dữ liệu mặc định nếu không có
                offDays: detail.offDays || 0,
                overtimeDays: detail.overtimeDays || 0,
                offDeduction: detail.offDeduction || 0,
                overtimeBonus: detail.overtimeBonus || 0
            };
        })
    );

    console.log('📋 Dữ liệu chi tiết nhân viên:', detailedStaff);

    const modal = document.createElement('div');
    modal.id = 'staffCostDetailModal';
    modal.className = 'modal-overlay active';
    
    modal.innerHTML = `
        <div class="modal-content large">
            <div class="modal-header staff">
                <h3>💰 Chi Tiết Lương Nhân Viên</h3>
                <button class="modal-close" onclick="closeStaffCostDetailModal()">×</button>
            </div>
            <div class="modal-body">
                <div class="total-cost-display">
                    📊 Tổng chi phí lương thực tế: <strong>${formatCurrency(totalCost)}</strong>
                    <div style="font-size: 0.9rem; color: #666; margin-top: 5px;">
                        Tháng ${currentOperationalMonth} • ${detailedStaff.length} nhân viên
                    </div>
                </div>
                <div class="staff-list">
                    ${detailedStaff.length === 0 ? `
                        <div class="empty-state">
                            <div class="empty-icon">👥</div>
                            <div>Chưa có nhân viên nào</div>
                        </div>
                    ` : detailedStaff.map(staff => `
                        <div class="staff-item-detailed">
                            <div class="staff-header">
                                <div class="staff-name">${staff.name}</div>
                                <div class="staff-total">${formatCurrency(staff.calculatedSalary || staff.salary)}</div>
                            </div>
                            
                            <div class="salary-breakdown">
                                <div class="breakdown-item">
                                    <span class="label">Lương cơ bản:</span>
                                    <span class="value">${formatCurrency(staff.monthlySalary)}</span>
                                </div>
                                
                                ${staff.offDays > 0 ? `
                                <div class="breakdown-item negative">
                                    <span class="label">❌ ${staff.offDays} ngày off:</span>
                                    <span class="value">-${formatCurrency(staff.offDeduction)}</span>
                                </div>
                                ` : '<div class="breakdown-item"><span class="label">❌ Ngày off:</span><span class="value">0 ngày</span></div>'}
                                
                                ${staff.overtimeDays > 0 ? `
                                <div class="breakdown-item positive">
                                    <span class="label">⭐ ${staff.overtimeDays} tăng ca:</span>
                                    <span class="value">+${formatCurrency(staff.overtimeBonus)}</span>
                                </div>
                                ` : '<div class="breakdown-item"><span class="label">⭐ Tăng ca:</span><span class="value">0 ngày</span></div>'}
                                
                                ${staff.totalBonus > 0 ? `
                                <div class="breakdown-item positive">
                                    <span class="label">🎁 Thưởng:</span>
                                    <span class="value">+${formatCurrency(staff.totalBonus)}</span>
                                </div>
                                ` : ''}
                                
                                ${staff.totalPenalty > 0 ? `
                                <div class="breakdown-item negative">
                                    <span class="label">⚠️ Phạt:</span>
                                    <span class="value">-${formatCurrency(staff.totalPenalty)}</span>
                                </div>
                                ` : ''}
                            </div>
                            
                            <div class="salary-summary">
                                <div class="final-salary">
                                    Thực lãnh: <strong>${formatCurrency(staff.calculatedSalary || staff.salary)}</strong>
                                </div>
                                <div class="salary-percentage">
                                    ${formatPercentage(staff.calculatedSalary || staff.salary, totalCost)}% tổng chi phí
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-cancel" onclick="closeStaffCostDetailModal()">Đóng</button>
                <button class="btn-info" onclick="debugAllStaffAttendance()">🐛 Debug Dữ Liệu</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

// === LẤY CHI TIẾT LƯƠNG TỪNG NHÂN VIÊN - SỬA LỖI HIỂN THỊ ===
async function getEmployeeSalaryDetail(employeeName, month) {
    try {
        console.log(`🔍 Lấy chi tiết lương cho: ${employeeName} tháng ${month}`);
        
        // Tìm employeeId từ tên
        const employeeSnapshot = await db.collection('employees')
            .where('name', '==', employeeName)
            .where('status', '==', 'active')
            .get();

        if (employeeSnapshot.empty) {
            console.log('❌ Không tìm thấy nhân viên:', employeeName);
            return {};
        }

        const employeeDoc = employeeSnapshot.docs[0];
        const employeeId = employeeDoc.id;
        const employee = employeeDoc.data();

        // Load dữ liệu chấm công, thưởng, phạt
        const [attendanceDoc, bonusesSnapshot, penaltiesSnapshot] = await Promise.all([
            db.collection('attendance').doc(`${employeeId}_${month.replace('/', '_')}`).get(),
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

        const monthlySalary = Number(employee.monthlySalary || 0);
        const dailySalary = monthlySalary / 30;

        // TÍNH NGÀY OFF VÀ TĂNG CA - SỬA LỖI QUAN TRỌNG
        let offDays = 0, overtimeDays = 0;
        
        if (attendanceDoc.exists) {
            const attendance = attendanceDoc.data();
            console.log('📊 Dữ liệu chấm công RAW:', attendance);
            
            // CÁCH 1: Kiểm tra trực tiếp các trường days
            if (attendance.days) {
                const days = attendance.days;
                console.log('📅 Cấu trúc days:', days);
                
                // Duyệt qua tất cả các key trong days
                Object.keys(days).forEach(key => {
                    const status = days[key];
                    console.log(`📅 ${key}: ${status}`);
                    if (status === 'off') offDays++;
                    if (status === 'overtime') overtimeDays++;
                });
            }
            
            // CÁCH 2: Kiểm tra các trường trực tiếp (days.1, days.2, ...)
            Object.keys(attendance).forEach(key => {
                if (key.startsWith('days.')) {
                    const status = attendance[key];
                    console.log(`📅 ${key}: ${status}`);
                    if (status === 'off') offDays++;
                    if (status === 'overtime') overtimeDays++;
                }
            });
        }

        console.log(`📊 Kết quả đếm: offDays=${offDays}, overtimeDays=${overtimeDays}`);

        // Tính thưởng phạt
        const totalBonus = bonusesSnapshot.docs.reduce((sum, doc) => {
            const data = doc.data();
            return sum + Number(data.amount || 0);
        }, 0);
        
        const totalPenalty = penaltiesSnapshot.docs.reduce((sum, doc) => {
            const data = doc.data();
            return sum + Number(data.amount || 0);
        }, 0);

        const offDeduction = Math.round(offDays * dailySalary);
        const overtimeBonus = Math.round(overtimeDays * dailySalary);
        
        // Tính lương thực tế
        const calculatedSalary = monthlySalary - offDeduction + overtimeBonus + totalBonus - totalPenalty;

        console.log(`📋 Chi tiết lương ${employeeName}:`, {
            monthlySalary,
            offDays,
            overtimeDays,
            dailySalary,
            offDeduction,
            overtimeBonus,
            totalBonus,
            totalPenalty,
            calculatedSalary
        });

        return {
            offDays,
            overtimeDays,
            totalBonus,
            totalPenalty,
            offDeduction,
            overtimeBonus,
            monthlySalary,
            dailySalary: Math.round(dailySalary),
            calculatedSalary: Math.max(0, Math.round(calculatedSalary))
        };
        
    } catch (error) {
        console.error('❌ Lỗi lấy chi tiết lương:', error);
        return {
            offDays: 0,
            overtimeDays: 0,
            totalBonus: 0,
            totalPenalty: 0,
            offDeduction: 0,
            overtimeBonus: 0,
            monthlySalary: 0,
            dailySalary: 0,
            calculatedSalary: 0
        };
    }
}

// === HÀM ĐÓNG MODAL ===
function closeHistoryModal() {
    document.getElementById('inventoryHistoryModal')?.remove();
}

function closeServiceHistoryModal() {
    document.getElementById('serviceHistoryModal')?.remove();
}

// === ĐÓNG POPUP CHI TIẾT NHÂN VIÊN - SỬA LỖI ĐÓNG NHIỀU LẦN ===
function closeStaffCostDetailModal() {
    const modal = document.getElementById('staffCostDetailModal');
    if (modal) {
        console.log('🔒 Đang đóng popup chi tiết nhân viên');
        modal.remove();
        console.log('✅ Đã đóng popup chi tiết nhân viên');
    } else {
        console.log('⚠️ Popup không tồn tại để đóng');
    }
}

// === HÀM TIỆN ÍCH BỔ SUNG ===
function formatPercentage(part, total) {
    if (!total || total === 0) return 0;
    return Math.round((part / total) * 100);
}

function exportOperationalReport() {
    if (currentOperationalExpenses.length === 0) {
        showToast('Không có dữ liệu để xuất', 'error');
        return;
    }
    
    try {
        const data = currentOperationalExpenses.map(expense => ({
            'Ngày': expense.date,
            'Nội dung': expense.description,
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
        
        showToast(`✅ Đã xuất file ${fileName}`, 'success');
        
    } catch (error) {
        console.error('Lỗi xuất báo cáo:', error);
        showToast('❌ Lỗi khi xuất file', 'error');
    }
}
// ==================== EXPORT FUNCTIONS ====================
window.initializeChiphiModule = initializeChiphiModule;
window.switchToView = switchToView;
window.openExpenseModal = openExpenseModal;
window.closeExpenseModal = closeExpenseModal;
window.processSaveExpense = processSaveExpense;
window.toggleShowAllExpenses = toggleShowAllExpenses;
window.showInventoryHistory = showInventoryHistory;
window.showServiceHistory = showServiceHistory;
window.showStaffCostDetail = showStaffCostDetail;
window.closeHistoryModal = closeHistoryModal;
window.closeServiceHistoryModal = closeServiceHistoryModal;
window.closeStaffCostDetailModal = closeStaffCostDetailModal;
window.exportOperationalReport = exportOperationalReport;
window.deleteInventoryLog = deleteInventoryLog;
window.deleteServiceRecord = deleteServiceRecord;

console.log('✅ Chiphi.js: Module đã cập nhật với tính năng mới');

console.log('✅ Chiphi.js: Module độc lập đã sẵn sàng');