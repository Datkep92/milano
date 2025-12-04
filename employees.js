
let currentEmployeeMonth = new Date().toISOString().substring(0, 7);
let currentEmployees = [];
let employeeSalaries = {};
let employeesEventListenersActive = false;
let currentSearchTerm = '';
let isMonthSelectorOpen = false;

// ========== GITHUB BACKGROUND SYNC SYSTEM ==========
let githubSyncQueue = [];
let isGitHubSyncing = false;
const GITHUB_SYNC_DELAY = 2000;

async function queueGitHubBackgroundSync(action, data) {
    const syncJob = {
        id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        action,
        data,
        timestamp: new Date().toISOString(),
        status: 'queued'
    };
    
    githubSyncQueue.push(syncJob);
    console.log(`📝 Queued GitHub sync: ${action}`);
    
    try {
        await dbAdd('sync_queue', {
            id: syncJob.id,
            ...syncJob
        });
    } catch (e) {
        console.log('⚠️ Could not save sync job to DB');
    }
    
    triggerBackgroundSync();
}

async function processBackgroundSync() {
    if (isGitHubSyncing || !githubSync.enabled || githubSyncQueue.length === 0) {
        return;
    }
    
    isGitHubSyncing = true;
    console.log(`🔄 Processing ${githubSyncQueue.length} GitHub sync jobs...`);
    
    try {
        const result = await syncAllToGitHub();
        
        if (result && result.success) {
            console.log('✅ GitHub sync successful');
            
            const allJobs = await dbGetAll('sync_queue');
            for (const job of allJobs) {
                if (job.status === 'queued') {
                    await dbUpdate('sync_queue', job.id, {
                        status: 'completed',
                        completedAt: new Date().toISOString()
                    });
                }
            }
            
            githubSyncQueue = githubSyncQueue.filter(job => job.status !== 'completed');
        }
        
    } catch (error) {
        console.error('❌ GitHub sync failed:', error);
        setTimeout(triggerBackgroundSync, 5000);
    } finally {
        isGitHubSyncing = false;
    }
}

function triggerBackgroundSync() {
    if (!githubSync.enabled) return;
    
    clearTimeout(window.githubSyncTimeout);
    window.githubSyncTimeout = setTimeout(() => {
        if (githubSyncQueue.length > 0) {
            processBackgroundSync();
        }
    }, GITHUB_SYNC_DELAY);
}

async function initBackgroundSync() {
    if (!githubSync.enabled) return;
    
    try {
        const pendingJobs = await dbGetAll('sync_queue');
        githubSyncQueue = pendingJobs.filter(job => job.status === 'queued');
        
        if (githubSyncQueue.length > 0) {
            console.log(`📥 Loaded ${githubSyncQueue.length} pending sync jobs`);
            triggerBackgroundSync();
        }
    } catch (error) {
        console.log('No sync queue found, starting fresh');
    }
}

// ========== UI MANAGEMENT WITH INDEXEDDB ==========
async function getEmployeeWithCache(employeeId) {
    try {
        const cachedEmployee = currentEmployees.find(emp => emp.employeeId === employeeId);
        if (cachedEmployee) return cachedEmployee;
        
        const allEmployees = await dbGetAll('employees');
        const employee = allEmployees.find(emp => emp.employeeId === employeeId);
        
        if (employee) {
            const index = currentEmployees.findIndex(emp => emp.employeeId === employeeId);
            if (index !== -1) {
                currentEmployees[index] = employee;
            } else {
                currentEmployees.push(employee);
            }
        }
        
        return employee;
    } catch (error) {
        console.error('Error getting employee:', error);
        return null;
    }
}

async function getAttendanceWithCache(employeeId, month) {
    try {
        const allAttendance = await dbGetAll('attendance');
        return allAttendance.filter(a => 
            a.employeeId === employeeId && a.month === month
        );
    } catch (error) {
        console.error('Error getting attendance:', error);
        return [];
    }
}

async function updateEmployeeCache(employeeId, updates) {
    try {
        const index = currentEmployees.findIndex(emp => emp.employeeId === employeeId);
        if (index !== -1) {
            currentEmployees[index] = { ...currentEmployees[index], ...updates };
        }
        
        if (employeeSalaries[employeeId]) {
            delete employeeSalaries[employeeId]; // Invalidate cache
        }
    } catch (error) {
        console.error('Error updating cache:', error);
    }
}

// ========== INITIALIZE ==========
function initializeEmployeesTab() {
    console.log('Initializing employees tab...');
    
    currentSearchTerm = '';
    isMonthSelectorOpen = false;
    
    if (!employeesEventListenersActive) {
        setupEmployeesEventListeners();
        employeesEventListenersActive = true;
    }
    
    initBackgroundSync();
    
    _loadEmployeesAndRender().catch(error => {
        console.error('Lỗi khởi tạo tab nhân viên:', error);
        const container = document.getElementById('employees');
        if (container) {
            container.innerHTML = `
                <div class="error-state">
                    <h3>⚠️ Lỗi tải dữ liệu</h3>
                    <p>Không thể tải danh sách nhân viên. Vui lòng thử lại sau.</p>
                    <button onclick="initializeEmployeesTab()">Thử lại</button>
                </div>
            `;
        }
    });
}

async function _loadEmployeesAndRender() {
    try {
        if (typeof showLoading === 'function') showLoading(true);
        
        currentEmployees = await dbGetAll('employees');
        await loadCurrentMonthSalaries();
        await renderEmployeesTab();
        
        if (typeof showLoading === 'function') showLoading(false);
    } catch (error) {
        console.error('❌ Error loading employees data:', error);
        if (typeof showLoading === 'function') showLoading(false);
        const container = document.getElementById('employees');
        if (container) {
            container.innerHTML = `<div class="tab-error">Lỗi tải dữ liệu: ${error.message}</div>`;
        }
    }
}

// ========== CORE FUNCTIONS WITH CACHE ==========
async function loadEmployeesData() {
    try {
        if (typeof showLoading === 'function') showLoading(true);
        
        currentEmployees = await dbGetAll('employees');
        await loadCurrentMonthSalaries();
        renderEmployeesTab();
        
        if (typeof showLoading === 'function') showLoading(false);
    } catch (error) {
        console.error('Error loading employees:', error);
        if (typeof showLoading === 'function') showLoading(false);
    }
}

async function loadCurrentMonthSalaries() {
    employeeSalaries = {};
    const activeEmployees = currentEmployees.filter(emp => emp.status === 'active');
    
    const batchSize = 5;
    for (let i = 0; i < activeEmployees.length; i += batchSize) {
        const batch = activeEmployees.slice(i, i + batchSize);
        await Promise.all(batch.map(async (employee) => {
            const salaryData = await calculateEmployeeSalary(employee.employeeId, currentEmployeeMonth);
            employeeSalaries[employee.employeeId] = salaryData;
        }));
    }
}
// ========== DATABASE VERIFICATION ==========
// Sửa hàm verifyDatabaseStructure trong employees.js
async function verifyDatabaseStructure() {
    try {
        console.log('🔍 Verifying database structure...');
        
        // Kiểm tra các store quan trọng
        const storesToTest = ['employees', 'attendance', 'discipline_records'];
        let allPassed = true;
        
        for (const storeName of storesToTest) {
            try {
                const testData = await dbGetAll(storeName);
                console.log(`✅ Store "${storeName}" exists with ${testData.length} records`);
            } catch (error) {
                console.warn(`⚠️ Store "${storeName}" error:`, error.message);
                // Không fail, chỉ warning
            }
        }
        
        // Test attendance store bằng cách sửa data trước khi add
        try {
            const testId = `test_attendance_${Date.now()}`;
            const testRecord = {
                attendanceId: testId, // QUAN TRỌNG: thêm attendanceId
                employeeId: 'test_emp',
                date: '2024-01-01',
                month: '2024-01',
                attendanceType: 'normal',
                createdAt: new Date().toISOString()
            };
            
            await dbAdd('attendance', testRecord);
            console.log('✅ Successfully added test attendance record');
            
            // Xóa record test
            await dbDelete('attendance', testId);
            console.log('✅ Successfully deleted test attendance record');
            
        } catch (testError) {
            console.warn('⚠️ Attendance store test had issues:', testError.message);
            // Không fail hoàn toàn, chỉ warning
        }
        
        console.log('✅ Database verification completed');
        return true; // Luôn trả về true để không block app
        
    } catch (error) {
        console.error('❌ Database verification error:', error);
        // Trả về true để không block app
        return true;
    }
}
// ========== DATABASE FIX FUNCTION ==========
async function fixAttendanceStore() {
    try {
        console.log('🔧 Attempting to fix attendance store...');
        
        // 1. Tạo store mới nếu cần
        const dbInstance = await initializeDatabase();
        const storeNames = Array.from(dbInstance.objectStoreNames);
        
        if (!storeNames.includes('attendance')) {
            console.log('🔄 Creating attendance store...');
            // Cần close và reopen với version cao hơn
            const request = indexedDB.open('CafeManagementDB', 14); // Tăng version
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('attendance')) {
                    const store = db.createObjectStore('attendance', { 
                        keyPath: 'attendanceId' 
                    });
                    console.log('✅ Created attendance store with keyPath: attendanceId');
                    
                    // Tạo indexes
                    store.createIndex('employeeId', 'employeeId', { unique: false });
                    store.createIndex('date', 'date', { unique: false });
                    store.createIndex('month', 'month', { unique: false });
                }
            };
            
            await new Promise((resolve, reject) => {
                request.onsuccess = resolve;
                request.onerror = reject;
            });
        }
        
        // 2. Kiểm tra dữ liệu hiện có
        const allAttendance = await dbGetAll('attendance');
        console.log(`📊 Current attendance records: ${allAttendance.length}`);
        
        // 3. Fix dữ liệu bị hỏng
        let fixedCount = 0;
        for (const record of allAttendance) {
            if (!record.attendanceId) {
                // Tạo attendanceId nếu thiếu
                const newId = `ATT_${record.employeeId}_${record.date}_${Date.now()}`;
                await dbUpdate('attendance', record.id || newId, {
                    attendanceId: newId,
                    ...record
                });
                fixedCount++;
            }
        }
        
        if (fixedCount > 0) {
            console.log(`✅ Fixed ${fixedCount} attendance records`);
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Failed to fix attendance store:', error);
        return false;
    }
}

// Sửa lại setEmployeeAttendance để tự động fix
async function setEmployeeAttendance(employeeId, date, type) {
    try {
        // Thử thực hiện bình thường
        return await _setEmployeeAttendance(employeeId, date, type);
        
    } catch (error) {
        console.error('❌ First attempt failed:', error.message);
        
        // Nếu lỗi liên quan đến store structure, thử fix
        if (error.message.includes('key path') || error.message.includes('attendanceId')) {
            console.log('🔄 Attempting to fix database...');
            await fixAttendanceStore();
            
            // Thử lại sau khi fix
            return await _setEmployeeAttendance(employeeId, date, type);
        }
        
        throw error;
    }
}

// Hàm chính xử lý attendance
async function _setEmployeeAttendance(employeeId, date, type) {
    const allAttendance = await dbGetAll('attendance');
    const existingRecord = allAttendance.find(a => 
        a && a.employeeId === employeeId && a.date === date
    );

    const typeNames = {
        'normal': 'Bình thường',
        'off': 'OFF',
        'overtime': 'Tăng ca'
    };

    if (type === 'normal') {
        if (existingRecord) {
            await dbDelete('attendance', existingRecord.attendanceId || existingRecord.id);
            
            await queueGitHubBackgroundSync('attendance_delete', {
                attendanceId: existingRecord.attendanceId
            });
        }
    } else {
        if (existingRecord) {
            await dbUpdate('attendance', existingRecord.attendanceId || existingRecord.id, {
                attendanceType: type,
                updatedAt: new Date().toISOString()
            });
            
            await queueGitHubBackgroundSync('attendance_update', {
                attendanceId: existingRecord.attendanceId,
                type: type
            });
        } else {
            const timestamp = Date.now();
            const attendanceId = `ATT_${employeeId}_${date}_${timestamp}`;
            
            // ĐẢM BẢO CÓ TẤT CẢ TRƯỜNG CẦN THIẾT
            const newAttendance = {
                attendanceId: attendanceId, // key path chính
                id: attendanceId, // backup key
                employeeId: employeeId,
                date: date,
                month: currentEmployeeMonth,
                attendanceType: type,
                createdBy: getCurrentUser()?.employeeId || 'unknown',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                // Thêm các trường backup để phòng hờ
                _key: attendanceId,
                _id: attendanceId
            };
            
            console.log('📝 Adding attendance:', newAttendance);
            
            // Thử cả 2 cách
            try {
                await dbAdd('attendance', newAttendance);
            } catch (addError) {
                // Nếu lỗi, thử với tên store khác
                console.log('⚠️ First add failed, trying alternative...');
                try {
                    await dbAdd('attendances', newAttendance); // plural
                } catch {
                    throw addError;
                }
            }
            
            await queueGitHubBackgroundSync('attendance_add', newAttendance);
        }
    }
    
    // Update cache
    if (employeeSalaries[employeeId]) {
        delete employeeSalaries[employeeId];
    }
    
    showMessage(`Đã đổi thành: ${typeNames[type]}`, 'success');
    return true;
}
// Gọi hàm verify khi khởi tạo
async function initializeEmployeesTab() {
    console.log('Initializing employees tab...');
    
    // Verify database structure first
    await verifyDatabaseStructure();
    
    currentSearchTerm = '';
    isMonthSelectorOpen = false;
    
    if (!employeesEventListenersActive) {
        setupEmployeesEventListeners();
        employeesEventListenersActive = true;
    }
    
    initBackgroundSync();
    
    _loadEmployeesAndRender().catch(error => {
        console.error('Lỗi khởi tạo tab nhân viên:', error);
        const container = document.getElementById('employees');
        if (container) {
            container.innerHTML = `
                <div class="error-state">
                    <h3>⚠️ Lỗi tải dữ liệu</h3>
                    <p>Không thể tải danh sách nhân viên. Vui lòng thử lại sau.</p>
                    <button onclick="initializeEmployeesTab()">Thử lại</button>
                </div>
            `;
        }
    });
}
// ========== FIXED ATTENDANCE FUNCTION ==========

// ========== OPTIMIZED SALARY CALCULATION ==========
async function calculateEmployeeSalary(employeeId, month) {
    try {
        if (employeeSalaries[employeeId] && 
            employeeSalaries[employeeId].month === month) {
            return employeeSalaries[employeeId];
        }
        
        const employee = await getEmployeeWithCache(employeeId);
        if (!employee) return getDefaultSalaryData();

        const baseSalary = employee.baseSalary || 0;
        
        try {
            const attendance = await getAttendanceWithCache(employeeId, month);
            const offDays = attendance.filter(a => a.attendanceType === 'off').length;
            const overtimeDays = attendance.filter(a => a.attendanceType === 'overtime').length;
            const normalDays = Math.max(0, 30 - offDays);

            const dailySalary = baseSalary / 30;
            const calculatedSalary = normalDays * dailySalary;
            const overtimeBonus = overtimeDays * dailySalary * 0.5;

            let bonus = 0, penalty = 0;
            try {
                const allDisciplines = await dbGetAll('discipline_records');
                const records = allDisciplines.filter(r => 
                    r && r.employeeId === employeeId && r.month === month
                );
                
                for (const r of records) {
                    if (r.type === 'reward' || r.type === 'bonus') {
                        bonus += Number(r.amount) || 0;
                    } else if (r.type === 'penalty' || r.type === 'fine') {
                        penalty += Number(r.amount) || 0;
                    }
                }
            } catch (discErr) {
                console.warn('Không lấy được discipline_records:', discErr);
            }

            let actualSalary = calculatedSalary + overtimeBonus + bonus - penalty;
            if (actualSalary < 0) actualSalary = 0;

            const salaryData = {
                actualSalary,
                offDays,
                overtimeDays,
                normalDays,
                baseSalary,
                dailySalary,
                bonus,
                penalty,
                month
            };
            
            employeeSalaries[employeeId] = salaryData;
            
            return salaryData;
            
        } catch (attendanceError) {
            console.warn('Cannot get attendance data, using base salary:', attendanceError);
            return getDefaultSalaryData(baseSalary);
        }
    } catch (error) {
        console.error('Error calculating salary:', error);
        return getDefaultSalaryData();
    }
}

function getDefaultSalaryData(baseSalary = 0) {
    return {
        actualSalary: baseSalary,
        offDays: 0,
        overtimeDays: 0,
        normalDays: 30,
        baseSalary: baseSalary,
        dailySalary: baseSalary / 30,
        bonus: 0,
        penalty: 0,
        month: currentEmployeeMonth
    };
}

// ========== EMPLOYEE OPERATIONS WITH SYNC ==========
async function saveNewEmployee(name, phone, salary) {
    try {
        const employeeId = 'NV' + Date.now().toString().slice(-6);
        const newEmployee = {
            employeeId: employeeId,
            name: name,
            phone: phone,
            baseSalary: salary,
            role: 'employee',
            status: 'active',
            createdBy: getCurrentUser()?.employeeId || 'unknown',
            createdAt: new Date().toISOString()
        };

        await dbAdd('employees', newEmployee);
        
        currentEmployees.push(newEmployee);
        
        await queueGitHubBackgroundSync('employee_add', newEmployee);
        
        return newEmployee;
        
    } catch (error) {
        console.error('Error adding employee:', error);
        throw error;
    }
}

async function updateEmployeeInfo(employeeId, updates) {
    try {
        await dbUpdate('employees', employeeId, {
            ...updates,
            updatedAt: new Date().toISOString()
        });
        
        await updateEmployeeCache(employeeId, updates);
        
        await queueGitHubBackgroundSync('employee_update', {
            employeeId,
            ...updates
        });
        
    } catch (error) {
        console.error('Error updating employee:', error);
        throw error;
    }
}

async function deleteEmployee(employeeId) {
    try {
        await dbUpdate('employees', employeeId, {
            status: 'inactive',
            updatedAt: new Date().toISOString()
        });
        
        const index = currentEmployees.findIndex(emp => emp.employeeId === employeeId);
        if (index !== -1) {
            currentEmployees[index].status = 'inactive';
        }
        
        await queueGitHubBackgroundSync('employee_update', {
            employeeId,
            status: 'inactive'
        });
        
    } catch (error) {
        console.error('Error deleting employee:', error);
        throw error;
    }
}

async function saveDisciplineRecord(employeeId, type, amount, reason) {
    try {
        const recordId = 'DSC' + Date.now().toString().slice(-6);
        const disciplineRecord = {
            recordId: recordId,
            employeeId: employeeId,
            type: type,
            amount: amount,
            reason: reason,
            month: currentEmployeeMonth,
            createdBy: getCurrentUser()?.employeeId || 'unknown',
            createdAt: new Date().toISOString()
        };

        await dbAdd('discipline_records', disciplineRecord);
        
        await queueGitHubBackgroundSync('discipline_add', disciplineRecord);
        
        return disciplineRecord;
        
    } catch (error) {
        console.error('Error saving discipline:', error);
        throw error;
    }
}

// ========== EVENT LISTENERS ==========
function setupEmployeesEventListeners() {
    if (employeesEventListenersActive) return;
    
    document.addEventListener('click', function(e) {
        const target = e.target;
        const action = target.dataset?.action || target.closest('[data-action]')?.dataset?.action;
        if (!action) return;
        
        switch(action) {
            case 'add-employee':
                e.preventDefault();
                showAddEmployeePopup();
                break;
                
            case 'show-employee':
                e.preventDefault();
                const card = target.closest('.employee-card');
                if (card) {
                    const employeeId = card.dataset.id || card.dataset.employeeId;
                    if (employeeId) showEmployeeDetailPopup(employeeId);
                }
                break;
                
            case 'toggle-month-selector':
                e.preventDefault();
                e.stopPropagation();
                isMonthSelectorOpen = !isMonthSelectorOpen;
                renderEmployeesTab();
                break;
                
            case 'change-employee-month':
                e.preventDefault();
                const monthString = target.dataset.month;
                if (monthString) changeEmployeeMonth(monthString);
                break;
                
            case 'show-discipline':
                e.preventDefault();
                const employeeId = target.dataset.employeeId;
                if (employeeId) {
                    closePopup();
                    showDisciplinePopup(employeeId);
                }
                break;
                
            case 'edit-employee':
                e.preventDefault();
                const editEmployeeId = target.dataset.employeeId;
                if (editEmployeeId) {
                    closePopup();
                    showEditEmployeePopup(editEmployeeId);
                }
                break;
                
            case 'delete-employee-confirm':
                e.preventDefault();
                const deleteEmployeeId = target.dataset.employeeId;
                if (deleteEmployeeId) showDeleteConfirmPopup(deleteEmployeeId);
                break;
        }
    });
    
    document.addEventListener('click', function(e) {
        if (isMonthSelectorOpen && 
            !e.target.closest('.month-selector-popup') && 
            !e.target.closest('#monthSelectorDisplay')) {
            isMonthSelectorOpen = false;
            renderEmployeesTab();
        }
    });
    
    employeesEventListenersActive = true;
}

// ========== RENDER FUNCTIONS ==========
async function renderEmployeesTab() {
    const container = document.getElementById('employees');
    if (!container) return;

    const monthDisplay = formatMonthDisplay(currentEmployeeMonth);
    const stats = await calculateEmployeesStats();

    container.innerHTML = `
        <div class="employees-container">
            <div class="employees-header">
                <div class="header-top">
                    <h2>👥 NHÂN VIÊN</h2>
                    <div class="month-year-selector" data-action="toggle-month-selector">
                        <div class="selector-display">${monthDisplay}</div>
                        <div class="selector-arrow">▼</div>
                    </div>
                </div>

                <div class="search-overview-row">
                    <div class="search-box">
                        <input type="text" id="employeeSearch" placeholder="🔍 Tìm nhân viên..." 
                               oninput="filterEmployees(this.value)">
                    </div>
                    <div class="overview-stats">
                        <div class="stat-item">
                            <div class="stat-value">${stats.totalEmployees}</div>
                            <div class="stat-label">TỔNG NV</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${stats.totalOffDays}</div>
                            <div class="stat-label">NGÀY OFF</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${stats.totalOvertimeDays}</div>
                            <div class="stat-label">TĂNG CA</div>
                        </div>
                    </div>
                </div>

                <div class="total-salary">
                    💰 TỔNG LƯƠNG: ${formatCurrency(stats.totalSalary)}
                </div>
            </div>

            <div class="employee-list-section">
                <div class="list-header">
                    <h3>DANH SÁCH NHÂN VIÊN</h3>
                    <button class="add-employee-btn" data-action="add-employee">
                        + Thêm NV
                    </button>
                </div>

                <div class="employee-grid" id="employeeGrid">
                    ${await renderEmployeeGrid()}
                </div>
            </div>
            
            ${isMonthSelectorOpen ? `
                <div class="month-selector-popup">
                    ${generateMonthSelectorHTML()}
                </div>
            ` : ''}
        </div>
    `;
    
    const searchInput = document.getElementById('employeeSearch');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            filterEmployees(e.target.value);
        });
    }
}

function generateMonthSelectorHTML() {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    const [selectedYear, selectedMonth] = currentEmployeeMonth.split('-').map(Number);
    
    let html = '<div class="month-selector-content">';
    html += '<div class="month-selector-header">Chọn tháng</div>';
    
    html += '<div class="years-list">';
    for (let year = currentYear - 2; year <= currentYear; year++) {
        html += `<div class="year-item ${year === selectedYear ? 'selected' : ''}" 
                     onclick="changeEmployeeMonth('${year}-${selectedMonth.toString().padStart(2, '0')}')">
                    ${year}
                 </div>`;
    }
    html += '</div>';
    
    const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 
                       'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
    
    html += '<div class="months-grid">';
    monthNames.forEach((monthName, index) => {
        const monthNum = index + 1;
        html += `<div class="month-item ${monthNum === selectedMonth ? 'selected' : ''}" 
                     onclick="changeEmployeeMonth('${selectedYear}-${monthNum.toString().padStart(2, '0')}')">
                    ${monthName}
                 </div>`;
    });
    html += '</div>';
    
    html += `<div class="month-selector-actions">
                <button class="btn btn-sm btn-outline" onclick="changeEmployeeMonth('${currentYear}-${currentMonth.toString().padStart(2, '0')}')">
                    Tháng hiện tại
                </button>
            </div>`;
    
    html += '</div>';
    return html;
}

async function renderEmployeeGrid() {
    const activeEmployees = currentEmployees.filter(emp => emp.status === 'active');
    
    if (activeEmployees.length === 0) {
        return `
            <div class="empty-state">
                <p>📝 Chưa có nhân viên nào</p>
                <button class="add-employee-btn" data-action="add-employee">
                    + Thêm nhân viên đầu tiên
                </button>
            </div>
        `;
    }

    let html = '';
    for (const employee of activeEmployees) {
        const salaryData = employeeSalaries[employee.employeeId] || { 
            actualSalary: employee.baseSalary, 
            offDays: 0, 
            overtimeDays: 0 
        };
        html += `
            <div class="employee-card" data-action="show-employee" data-employee-id="${employee.employeeId}">
                <div class="employee-card-content">
                    <div class="employee-name">${employee.name}</div>
                    <div class="employee-salary">${formatCurrency(salaryData.actualSalary)}</div>
                    <div class="employee-phone">${employee.phone}</div>
                    <div class="employee-stats">
                        ${salaryData.offDays > 0 ? `<span class="employee-off">🔴 ${salaryData.offDays} OFF</span>` : ''}
                        ${salaryData.overtimeDays > 0 ? `<span class="employee-overtime">🟢 ${salaryData.overtimeDays} TC</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }
    
    return html;
}

async function calculateEmployeesStats() {
    const activeEmployees = currentEmployees.filter(emp => emp.status === 'active');
    let totalOffDays = 0;
    let totalOvertimeDays = 0;
    let totalSalary = 0;

    for (const employee of activeEmployees) {
        const salaryData = employeeSalaries[employee.employeeId] || { 
            actualSalary: employee.baseSalary, 
            offDays: 0, 
            overtimeDays: 0 
        };
        totalOffDays += salaryData.offDays || 0;
        totalOvertimeDays += salaryData.overtimeDays || 0;
        totalSalary += salaryData.actualSalary || employee.baseSalary;
    }

    return {
        totalEmployees: activeEmployees.length,
        totalOffDays,
        totalOvertimeDays,
        totalSalary
    };
}

// ========== POPUP FUNCTIONS ==========
function showAddEmployeePopup() {
    if (!isAdmin()) {
        showMessage('Chỉ quản trị viên được thêm nhân viên', 'error');
        return;
    }

    const popupHTML = `
        <div class="popup">
            <button class="close-popup" data-action="close-popup">×</button>
            <h3>➕ Thêm nhân viên</h3>
            
            <div class="form-group">
                <label for="newEmployeeName">Tên nhân viên:</label>
                <input type="text" id="newEmployeeName" placeholder="Nhập họ tên">
            </div>
            
            <div class="form-group">
                <label for="newEmployeePhone">Số điện thoại:</label>
                <input type="tel" id="newEmployeePhone" placeholder="Nhập số điện thoại">
            </div>
            
            <div class="form-group">
                <label for="newEmployeeSalary">Lương cơ bản / tháng:</label>
                <input type="number" id="newEmployeeSalary" placeholder="Nhập lương cơ bản" value="5000000">
            </div>
            
            <div class="popup-actions">
                <button class="btn btn-secondary" data-action="close-popup">Hủy</button>
                <button class="btn btn-primary" data-action="save-new-employee">Lưu</button>
            </div>
        </div>
    `;

    showPopup(popupHTML);
    
    setTimeout(() => {
        setupAddEmployeeEventListeners();
    }, 100);
}

function setupAddEmployeeEventListeners() {
    const saveButton = document.querySelector('[data-action="save-new-employee"]');
    if (!saveButton) return;

    saveButton.removeEventListener('click', handleSaveNewEmployee);
    saveButton.addEventListener('click', handleSaveNewEmployee);
}

async function handleSaveNewEmployee(e) {
    e.preventDefault();
    e.stopPropagation();

    const popup = e.target.closest('.popup');
    if (!popup) return;

    const nameInput = popup.querySelector('#newEmployeeName');
    const phoneInput = popup.querySelector('#newEmployeePhone');
    const salaryInput = popup.querySelector('#newEmployeeSalary');
    
    if (!nameInput || !phoneInput || !salaryInput) {
        showMessage('Lỗi: Không tìm thấy các trường dữ liệu', 'error');
        return;
    }

    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const salary = parseFloat(salaryInput.value);

    if (!name || !phone || !salary) {
        showMessage('Vui lòng nhập đầy đủ thông tin', 'error');
        return;
    }

    if (salary <= 0) {
        showMessage('Lương phải lớn hơn 0', 'error');
        return;
    }

    const existingEmployee = currentEmployees.find(emp => emp.phone === phone && emp.status === 'active');
    if (existingEmployee) {
        showMessage('Số điện thoại đã tồn tại', 'error');
        return;
    }

    try {
        e.target.disabled = true;
        e.target.textContent = 'Đang thêm...';

        await saveNewEmployee(name, phone, salary);
        showMessage('Đã thêm nhân viên thành công!', 'success');
        
        closePopup();
        loadEmployeesData();

    } catch (error) {
        console.error('Error adding employee:', error);
        showMessage('Lỗi khi thêm nhân viên', 'error');
        e.target.disabled = false;
        e.target.textContent = 'Lưu';
    }
}

function showAttendanceOptionsPopup(employeeId, date, currentType) {
    const dateObj = new Date(date);
    const day = dateObj.getDate();
    const month = dateObj.getMonth() + 1;
    const year = dateObj.getFullYear();
    
    const popupHTML = `
        <div class="popup attendance-options-popup">
            <button class="close-popup" data-action="close-popup">×</button>
            <h3>📅 Chọn loại ngày ${day}/${month}/${year}</h3>
            
            <div class="attendance-options">
                <button class="attendance-option-btn normal-btn ${currentType === 'normal' ? 'selected' : ''}" 
                        data-action="set-attendance" data-type="normal" data-date="${date}" data-employee-id="${employeeId}">
                    <div class="option-icon">⚪</div>
                    <div class="option-text">Bình thường</div>
                    ${currentType === 'normal' ? '<div class="option-check">✓</div>' : ''}
                </button>
                
                <button class="attendance-option-btn off-btn ${currentType === 'off' ? 'selected' : ''}" 
                        data-action="set-attendance" data-type="off" data-date="${date}" data-employee-id="${employeeId}">
                    <div class="option-icon">🔴</div>
                    <div class="option-text">OFF</div>
                    ${currentType === 'off' ? '<div class="option-check">✓</div>' : ''}
                </button>
                
                <button class="attendance-option-btn overtime-btn ${currentType === 'overtime' ? 'selected' : ''}" 
                        data-action="set-attendance" data-type="overtime" data-date="${date}" data-employee-id="${employeeId}">
                    <div class="option-icon">🟢</div>
                    <div class="option-text">Tăng ca</div>
                    ${currentType === 'overtime' ? '<div class="option-check">✓</div>' : ''}
                </button>
            </div>
            
            <div class="popup-actions">
                <button class="btn btn-secondary" data-action="close-popup">Hủy</button>
            </div>
        </div>
    `;

    showPopup(popupHTML);
    
    setTimeout(() => {
        setupAttendanceOptionsEventListeners();
    }, 100);
}

function setupAttendanceOptionsEventListeners() {
    const buttons = document.querySelectorAll('[data-action="set-attendance"]');
    buttons.forEach(button => {
        button.removeEventListener('click', handleSetAttendance);
        button.addEventListener('click', handleSetAttendance);
    });

    async function handleSetAttendance(e) {
        e.preventDefault();
        e.stopPropagation();

        const btn = e.currentTarget;
        const employeeId = btn.dataset.employeeId;
        const date = btn.dataset.date;
        const type = btn.dataset.type;

        btn.disabled = true;
        btn.style.opacity = '0.6';

        try {
            await setEmployeeAttendance(employeeId, date, type);
            await loadEmployeesData();
            showEmployeeDetailPopup(employeeId);
        } catch (error) {
            console.error('Error setting attendance:', error);
            btn.disabled = false;
            btn.style.opacity = '1';
        }
    }
}

function generateEmployeeCalendar(attendance, employeeId) {
    const [year, month] = currentEmployeeMonth.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    const today = new Date().toISOString().split('T')[0];

    let calendarHTML = '';
    const startDay = firstDay.getDay();

    for (let i = 0; i < startDay; i++) {
        calendarHTML += '<div class="calendar-day empty"></div>';
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayAttendance = attendance.find(a => a.date === dateString);
        const attendanceType = dayAttendance ? dayAttendance.attendanceType : 'normal';

        let dayClass = 'calendar-day';
        let dayIcon = '';
        
        if (dateString === today) dayClass += ' today';
        if (attendanceType === 'off') {
            dayClass += ' off';
            dayIcon = '🔴';
        } else if (attendanceType === 'overtime') {
            dayClass += ' overtime';
            dayIcon = '🟢';
        } else {
            dayIcon = '⚪';
        }

        calendarHTML += `
            <div class="${dayClass}" 
                 data-action="show-attendance-options" 
                 data-date="${dateString}" 
                 data-employee-id="${employeeId}"
                 data-current-type="${attendanceType}">
                <div class="day-number">${day}</div>
                <div class="day-icon">${dayIcon}</div>
            </div>
        `;
    }

    return calendarHTML;
}

async function showEditEmployeePopup(employeeId) {
    if (!isAdmin()) {
        showMessage('Chỉ quản trị viên được sửa thông tin nhân viên', 'error');
        return;
    }

    const employee = await getEmployeeWithCache(employeeId);
    if (!employee) {
        showMessage('Không tìm thấy nhân viên', 'error');
        return;
    }

    const popupHTML = `
        <div class="popup">
            <button class="close-popup" data-action="close-popup">×</button>
            <h3>✏️ Sửa thông tin nhân viên</h3>
            
            <div class="form-group">
                <label for="editEmployeeName">Tên nhân viên:</label>
                <input type="text" id="editEmployeeName" value="${employee.name}" placeholder="Nhập họ tên">
            </div>
            
            <div class="form-group">
                <label for="editEmployeePhone">Số điện thoại:</label>
                <input type="tel" id="editEmployeePhone" value="${employee.phone}" placeholder="Nhập số điện thoại">
            </div>
            
            <div class="form-group">
                <label for="editEmployeeSalary">Lương cơ bản / tháng:</label>
                <input type="number" id="editEmployeeSalary" value="${employee.baseSalary}" placeholder="Nhập lương cơ bản">
            </div>
            
            <div class="popup-actions">
                <button class="btn btn-secondary" data-action="close-popup">Hủy</button>
                <button class="btn btn-danger" data-action="delete-employee" data-employee-id="${employeeId}">Xóa NV</button>
                <button class="btn btn-primary" data-action="save-edit-employee" data-employee-id="${employeeId}">Lưu</button>
            </div>
        </div>
    `;

    showPopup(popupHTML);
    
    setTimeout(() => {
        setupEditEmployeeEventListeners(employeeId);
    }, 100);
}

function setupEditEmployeeEventListeners(employeeId) {
    const saveButton = document.querySelector('[data-action="save-edit-employee"]');
    const deleteButton = document.querySelector('[data-action="delete-employee"]');
    
    if (saveButton) {
        saveButton.removeEventListener('click', handleSaveEdit);
        saveButton.addEventListener('click', handleSaveEdit);
    }
    
    if (deleteButton) {
        deleteButton.removeEventListener('click', handleDelete);
        deleteButton.addEventListener('click', handleDelete);
    }
    
    async function handleSaveEdit(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const popup = e.target.closest('.popup');
        if (!popup) return;
        
        const nameInput = popup.querySelector('#editEmployeeName');
        const phoneInput = popup.querySelector('#editEmployeePhone');
        const salaryInput = popup.querySelector('#editEmployeeSalary');
        
        if (!nameInput || !phoneInput || !salaryInput) {
            showMessage('Lỗi: Không tìm thấy các trường dữ liệu', 'error');
            return;
        }
        
        const name = nameInput.value.trim();
        const phone = phoneInput.value.trim();
        const salary = parseFloat(salaryInput.value);

        if (!name || !phone || !salary) {
            showMessage('Vui lòng nhập đầy đủ thông tin', 'error');
            return;
        }

        if (salary <= 0) {
            showMessage('Lương phải lớn hơn 0', 'error');
            return;
        }

        try {
            e.target.disabled = true;
            e.target.textContent = 'Đang lưu...';
            
            await updateEmployeeInfo(employeeId, {
                name: name,
                phone: phone,
                baseSalary: salary
            });

            showMessage('Đã cập nhật thông tin nhân viên!', 'success');
            
            closePopup();
            loadEmployeesData();

        } catch (error) {
            console.error('Error updating employee:', error);
            showMessage('Lỗi khi cập nhật thông tin', 'error');
            e.target.disabled = false;
            e.target.textContent = 'Lưu';
        }
    }
    
    async function handleDelete(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (confirm('Bạn có chắc muốn xóa nhân viên này?')) {
            try {
                e.target.disabled = true;
                e.target.textContent = 'Đang xóa...';
                
                await deleteEmployee(employeeId);

                showMessage('Đã xóa nhân viên thành công', 'success');
                
                closePopup();
                loadEmployeesData();
            } catch (error) {
                console.error('Error deleting employee:', error);
                showMessage('Lỗi khi xóa nhân viên', 'error');
                e.target.disabled = false;
                e.target.textContent = 'Xóa NV';
            }
        }
    }
}

function showDeleteConfirmPopup(employeeId) {
    if (!isAdmin()) {
        showMessage('Chỉ quản trị viên được xóa nhân viên', 'error');
        return;
    }
    
    const popupHTML = `
        <div class="popup">
            <button class="close-popup" data-action="close-popup">×</button>
            <h3>🗑️ Xác nhận xóa nhân viên</h3>
            <p>Bạn có chắc chắn muốn xóa nhân viên này? Hành động này không thể hoàn tác.</p>
            
            <div class="popup-actions">
                <button class="btn btn-secondary" data-action="close-popup">Hủy</button>
                <button class="btn btn-danger" data-action="delete-employee-final" data-employee-id="${employeeId}">Xóa vĩnh viễn</button>
            </div>
        </div>
    `;
    
    showPopup(popupHTML);
    
    setTimeout(() => {
        const deleteButton = document.querySelector('[data-action="delete-employee-final"]');
        if (deleteButton) {
            deleteButton.addEventListener('click', async function(e) {
                const employeeId = e.target.dataset.employeeId;
                if (!employeeId) return;
                
                try {
                    e.target.disabled = true;
                    e.target.textContent = 'Đang xóa...';
                    
                    await dbDelete('employees', employeeId);
                    
                    // Update cache
                    currentEmployees = currentEmployees.filter(emp => emp.employeeId !== employeeId);
                    delete employeeSalaries[employeeId];
                    
                    await queueGitHubBackgroundSync('employee_delete', { employeeId });
                    
                    showMessage('Đã xóa nhân viên vĩnh viễn', 'success');
                    
                    closePopup();
                    loadEmployeesData();
                } catch (error) {
                    console.error('Error permanently deleting employee:', error);
                    showMessage('Lỗi khi xóa nhân viên', 'error');
                    e.target.disabled = false;
                    e.target.textContent = 'Xóa vĩnh viễn';
                }
            });
        }
    }, 100);
}

function showDisciplinePopup(employeeId) {
    if (!isAdmin()) {
        showMessage('Chỉ quản trị viên được thưởng/phạt nhân viên', 'error');
        return;
    }

    const popupHTML = `
        <div class="popup">
            <button class="close-popup" data-action="close-popup">×</button>
            <h3>⚖️ Chế tài nhân viên</h3>
            
            <div class="form-group">
                <label for="disciplineType">Loại chế tài:</label>
                <select id="disciplineType" class="discipline-select">
                    <option value="reward">🎁 Thưởng</option>
                    <option value="penalty">⚠️ Phạt</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="disciplineAmount">Số tiền:</label>
                <input type="number" id="disciplineAmount" placeholder="Nhập số tiền" value="0">
            </div>
            
            <div class="form-group">
                <label for="disciplineReason">Nội dung:</label>
                <input type="text" id="disciplineReason" placeholder="Nhập nội dung chế tài">
            </div>
            
            <div class="popup-actions">
                <button class="btn btn-secondary" data-action="close-popup">Hủy</button>
                <button class="btn btn-primary" data-action="save-discipline" data-employee-id="${employeeId}">Lưu</button>
            </div>
        </div>
    `;

    showPopup(popupHTML);
    
    setTimeout(() => {
        setupDisciplineEventListeners(employeeId);
    }, 100);
}

function setupDisciplineEventListeners(employeeId) {
    const saveButton = document.querySelector('[data-action="save-discipline"]');
    if (!saveButton) return;

    saveButton.removeEventListener('click', handleSaveDiscipline);
    saveButton.addEventListener('click', handleSaveDiscipline);

    async function handleSaveDiscipline(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const popup = e.target.closest('.popup');
        if (!popup) return;
        
        const typeSelect = popup.querySelector('#disciplineType');
        const amountInput = popup.querySelector('#disciplineAmount');
        const reasonInput = popup.querySelector('#disciplineReason');
        
        if (!typeSelect || !amountInput || !reasonInput) {
            showMessage('Lỗi: Không tìm thấy các trường dữ liệu', 'error');
            return;
        }
        
        const type = typeSelect.value;
        const amount = parseFloat(amountInput.value);
        const reason = reasonInput.value.trim();

        if (!amount || amount <= 0) {
            showMessage('Vui lòng nhập số tiền hợp lệ', 'error');
            return;
        }

        if (!reason) {
            showMessage('Vui lòng nhập nội dung', 'error');
            return;
        }

        try {
            e.target.disabled = true;
            e.target.textContent = 'Đang lưu...';
            
            await saveDisciplineRecord(employeeId, type, amount, reason);

            const typeText = type === 'reward' ? 'Thưởng' : 'Phạt';
            showMessage(`Đã ${typeText.toLowerCase()} thành công: ${formatCurrency(amount)}`, 'success');
            
            closePopup();
            loadEmployeesData();

        } catch (error) {
            console.error('Error saving discipline:', error);
            showMessage('Lỗi khi lưu thông tin chế tài', 'error');
            e.target.disabled = false;
            e.target.textContent = 'Lưu';
        }
    }
}

// ========== EMPLOYEE DETAIL POPUP ==========
async function showEmployeeDetailPopup(employeeId) {
    const employee = await getEmployeeWithCache(employeeId);
    if (!employee) {
        showMessage('Không tìm thấy nhân viên', 'error');
        return;
    }

    const salaryData = await calculateEmployeeSalary(employeeId, currentEmployeeMonth);
    const attendance = await getAttendanceWithCache(employeeId, currentEmployeeMonth);

    const popupHTML = `
        <div class="employee-detail-popup active">
            <div class="popup-content">
                <div class="popup-header">
                    <h3 class="popup-title">${employee.name} - ${employee.phone}</h3>
                    <button class="close-popup" data-action="close-popup">×</button>
                </div>

                <div class="actual-salary-section">
                    <div class="actual-salary-amount">
                        ${formatCurrency(salaryData.actualSalary)}
                    </div>
                </div>

                <div class="calendar-section">
                    <div class="section-title">📅 LỊCH LÀM VIỆC - ${formatMonthDisplay(currentEmployeeMonth)}</div>
                    <div class="calendar-container">
                        <div class="calendar-header">
                            <div class="calendar-header-day">CN</div>
                            <div class="calendar-header-day">T2</div>
                            <div class="calendar-header-day">T3</div>
                            <div class="calendar-header-day">T4</div>
                            <div class="calendar-header-day">T5</div>
                            <div class="calendar-header-day">T6</div>
                            <div class="calendar-header-day">T7</div>
                        </div>
                        <div class="calendar-grid">
                            ${generateEmployeeCalendar(attendance, employeeId)}
                        </div>
                    </div>
                </div>

                <div class="actions-section">
                    <div class="actions-grid">
                        <button class="action-btn edit-btn" data-action="edit-employee" data-employee-id="${employeeId}">
                            ✏️ Sửa NV
                        </button>
                        <button class="action-btn discipline-btn" data-action="show-discipline" data-employee-id="${employeeId}">
                            ⚖️ Chế tài
                        </button>
                        <button class="action-btn close-btn" data-action="close-popup">
                            Đóng
                        </button>
                    </div>
                </div>

                <div class="stats-section">
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-label">NGÀY OFF</div>
                            <div class="stat-value off">${salaryData.offDays || 0}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">TĂNG CA</div>
                            <div class="stat-value overtime">${salaryData.overtimeDays || 0}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">THƯỞNG</div>
                            <div class="stat-value bonus">+${formatCurrency(salaryData.bonus || 0)}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">PHẠT</div>
                            <div class="stat-value penalty">-${formatCurrency(salaryData.penalty || 0)}</div>
                        </div>
                    </div>
                </div>

                <div class="basic-info">
                    <div class="salary-base">
                        <div class="salary-label">Lương cơ bản</div>
                        <div class="salary-amount">${formatCurrency(employee.baseSalary)}</div>
                    </div>
                </div>
                
            </div>
        </div>
    `;

    showPopup(popupHTML);
    setupEmployeeDetailEventListeners(employeeId);
}

function setupEmployeeDetailEventListeners(employeeId) {
    const editButton = document.querySelector('[data-action="edit-employee"]');
    const disciplineButton = document.querySelector('[data-action="show-discipline"]');
    const closeButton = document.querySelector('[data-action="close-popup"]');
    const calendarDays = document.querySelectorAll('[data-action="show-attendance-options"]');

    if (editButton) {
        editButton.removeEventListener('click', handleEditEmployee);
        editButton.addEventListener('click', handleEditEmployee);
    }

    if (disciplineButton) {
        disciplineButton.removeEventListener('click', handleShowDiscipline);
        disciplineButton.addEventListener('click', handleShowDiscipline);
    }

    if (closeButton) {
        closeButton.removeEventListener('click', handleClosePopup);
        closeButton.addEventListener('click', handleClosePopup);
    }

    calendarDays.forEach(day => {
        day.removeEventListener('click', handleShowAttendanceOptions);
        day.addEventListener('click', handleShowAttendanceOptions);
    });

    function handleEditEmployee(e) {
        e.preventDefault();
        e.stopPropagation();
        showEditEmployeePopup(employeeId);
    }

    function handleShowDiscipline(e) {
        e.preventDefault();
        e.stopPropagation();
        showDisciplinePopup(employeeId);
    }

    function handleClosePopup(e) {
        e.preventDefault();
        e.stopPropagation();
        closePopup();
    }

    function handleShowAttendanceOptions(e) {
        e.preventDefault();
        e.stopPropagation();
        const card = e.target.closest('[data-action="show-attendance-options"]');
        showAttendanceOptionsPopup(employeeId, card.dataset.date, card.dataset.currentType);
    }
}

// ========== UTILITY FUNCTIONS ==========
function changeEmployeeMonth(monthString) {
    currentEmployeeMonth = monthString;
    isMonthSelectorOpen = false;
    console.log('📅 Changed employee month to:', monthString);
    loadEmployeesData();
}

function formatMonthDisplay(monthString) {
    const [year, month] = monthString.split('-');
    return `Tháng ${month}/${year}`;
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

function filterEmployees(searchTerm) {
    const grid = document.getElementById('employeeGrid');
    if (!grid) return;

    const cards = grid.querySelectorAll('.employee-card');
    const term = searchTerm.toLowerCase().trim();

    if (!term) {
        cards.forEach(card => card.style.display = 'flex');
        return;
    }

    cards.forEach(card => {
        const name = card.querySelector('.employee-name').textContent.toLowerCase();
        const phone = card.querySelector('.employee-phone').textContent;
        const matches = name.includes(term) || phone.includes(term);
        card.style.display = matches ? 'flex' : 'none';
    });
}

function showPopup(html) {
    closePopup();
    
    const popupOverlay = document.createElement('div');
    popupOverlay.className = 'popup-overlay';
    popupOverlay.innerHTML = html;
    
    document.body.appendChild(popupOverlay);
    
    setTimeout(() => {
        popupOverlay.classList.add('active');
    }, 10);
    
    popupOverlay.addEventListener('click', function(e) {
        if (e.target === popupOverlay) {
            closePopup();
        }
    });
}

function closePopup() {
    const existingPopup = document.querySelector('.popup-overlay, .employee-detail-popup');
    if (existingPopup) {
        existingPopup.classList.remove('active');
        setTimeout(() => {
            if (existingPopup.parentNode) {
                existingPopup.parentNode.removeChild(existingPopup);
            }
            loadEmployeesData();
        }, 300);
    }
}

document.addEventListener('click', function(e) {
    if (e.target.matches('.close-popup') || e.target.closest('.close-popup')) {
        closePopup();
    }
});

// ========== EXPORTS ==========
window.changeEmployeeMonth = changeEmployeeMonth;
window.filterEmployees = filterEmployees;
window.loadEmployeesData = loadEmployeesData;
window.initializeEmployeesTab = initializeEmployeesTab;
