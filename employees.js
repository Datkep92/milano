class EmployeesModule {
    constructor() {
        const now = new Date();
        this.currentMonth = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
        this.currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        this.selectedEmployee = null;
        this.isLoading = false;
        
        // Cache để tăng performance
        this.cache = {
            employees: null,
            lastRender: null,
            monthlyCalculations: {}
        };
        
        // Flag để tránh render liên tục
        this.isRendering = false;
        
        // Thêm event listener cho data updates - SỬA LẠI
        window.addEventListener('dataUpdated', (event) => {
            if (event.detail.module === 'employees') {
                console.log('🔄 Employees data updated, refreshing cache...');
                this.cache.employees = null; // Xóa cache để tải lại
                
                // CHỈ RENDER KHI ĐANG Ở TAB NHÂN VIÊN
                const activeTab = document.querySelector('.tab-btn.active');
                if (activeTab && activeTab.getAttribute('data-tab') === 'employees') {
                    if (!this.isRendering) {
                        setTimeout(() => this.render(), 500);
                    }
                }
            }
        });
    }
    
    // ========== LOCAL-FIRST DATA METHODS ==========
    
    async loadEmployees(forceRefresh = false) {
    // ƯU TIÊN: Trả về từ cache trước
    if (this.cache.employees && !forceRefresh) {
        return this.cache.employees;
    }
    
    try {
        // Lấy từ DataManager (đã tích hợp Firebase)
        let employees = window.dataManager.getEmployees();
        
        console.log('👥 Raw employees loaded:', employees);
        
        // THÊM: Xử lý tương thích ngược
        let needsMigration = false;
        const migratedEmployees = employees.map(employee => {
            // Tạo bản sao để không sửa trực tiếp
            const migrated = { ...employee };
            
            // Nếu có baseSalary cũ nhưng chưa có dailySalary
            if (migrated.baseSalary !== undefined && migrated.dailySalary === undefined) {
                console.log(`🔄 Migrating employee ${migrated.name}: baseSalary ${migrated.baseSalary} → dailySalary`);
                
                // Chuyển đổi: baseSalary / 30 ≈ dailySalary
                migrated.dailySalary = Math.round(migrated.baseSalary / 30);
                
                // Giữ lại baseSalary nhưng đánh dấu đã migrated
                migrated._originalBaseSalary = migrated.baseSalary;
                migrated._migratedAt = new Date().toISOString();
                
                needsMigration = true;
                
                console.log(`✅ Migrated: ${migrated.name} → ${migrated.dailySalary}/day`);
            }
            
            // Đảm bảo dailySalary luôn có giá trị
            if (migrated.dailySalary === undefined) {
                migrated.dailySalary = 0;
            }
            
            return migrated;
        });
        
        if (migratedEmployees && migratedEmployees.length > 0) {
            this.cache.employees = migratedEmployees;
            
            // Nếu có nhân viên cần migration, lưu lại vào DataManager
            if (needsMigration) {
                console.log('💾 Saving migrated employees to DataManager...');
                
                // Cập nhật lại DataManager với dữ liệu đã migrate
                window.dataManager.data.employees.list = migratedEmployees;
                
                // Lưu từng nhân viên đã migrate
                const migrationPromises = migratedEmployees.map(async (employee) => {
                    if (employee._originalBaseSalary !== undefined) {
                        try {
                            await window.dataManager.saveLocal(
                                'employees',
                                `employee_${employee.id}.json`,
                                employee,
                                `Migration: baseSalary → dailySalary`
                            );
                        } catch (error) {
                            console.warn(`⚠️ Error saving migrated employee ${employee.id}:`, error);
                        }
                    }
                });
                
                // Chạy migration trong background
                Promise.allSettlement(migrationPromises).then(() => {
                    console.log('✅ Employee migration completed');
                }).catch(error => {
                    console.error('❌ Migration error:', error);
                });
            }
            
            return migratedEmployees;
        }
        
        // Nếu không có trong local, tải từ Firebase
        if (navigator.onLine) {
            await window.dataManager.loadFromFirebase();
            const freshEmployees = window.dataManager.getEmployees();
            
            if (freshEmployees && freshEmployees.length > 0) {
                // Áp dụng migration cho dữ liệu từ Firebase
                const freshMigrated = freshEmployees.map(employee => {
                    const migrated = { ...employee };
                    
                    if (migrated.baseSalary !== undefined && migrated.dailySalary === undefined) {
                        migrated.dailySalary = Math.round(migrated.baseSalary / 30);
                        migrated._originalBaseSalary = migrated.baseSalary;
                        migrated._migratedAt = new Date().toISOString();
                    }
                    
                    if (migrated.dailySalary === undefined) {
                        migrated.dailySalary = 0;
                    }
                    
                    return migrated;
                });
                
                this.cache.employees = freshMigrated;
                return freshMigrated;
            }
        }
        
        return [];
        
    } catch (error) {
        console.error('Error loading employees:', error);
        return [];
    }
}
   
    
    // ========== PUBLIC API ==========
    
    async getEmployees() {
        return this.loadEmployees();
    }
    
    getWorkStatsSync(employee) {
        if (!employee) return { off: 0, overtime: 0 };
        const monthData = this.getEmployeeMonthlyData(employee);
        return {
            off: monthData.calculated.totalOff || 0,
            overtime: monthData.calculated.totalOvertime || 0
        };
    }
    
    calculateEmployeeSalary(employee) {
    if (!employee) return { actual: 0, daily: 0, off: 0, overtime: 0, normalDays: 0, daysInMonth: 0 };
    
    const monthData = this.getEmployeeMonthlyData(employee);
    this.calculateMonthlyData(employee, this.currentMonthKey);
    
    return {
        actual: monthData.calculated.actualSalary,
        // THAY ĐỔI: Thay base bằng daily
        daily: employee.dailySalary || 0,
        off: monthData.calculated.totalOff,
        overtime: monthData.calculated.totalOvertime,
        normalDays: monthData.calculated.normalDays,
        // THÊM: Số ngày trong tháng
        daysInMonth: monthData.calculated.daysInMonth || this.getDaysInMonth(this.currentMonthKey)
    };
}
    
    // ========== UPDATE METHODS ==========
    async updateWorkDay(employeeId, day, status) {
    try {
        const employees = await this.loadEmployees();
        const employee = employees.find(e => e.id == employeeId);
        
        if (!employee) {
            window.showToast('Không tìm thấy nhân viên', 'error');
            return false;
        }
        
        const monthData = this.getEmployeeMonthlyData(employee);
        const dayStr = String(day).padStart(2, '0');
        
        if (!monthData.workdays) monthData.workdays = {};
        monthData.workdays[dayStr] = status;
        
        this.calculateMonthlyData(employee, this.currentMonthKey);
        
        // Lưu vào Firebase qua DataManager
        const success = await window.dataManager.saveLocal(
            'employees',
            `employee_${employeeId}.json`,
            employee,
            `Cập nhật ngày làm ${day} = ${status} - ${employee.name}`
        );
        
        if (success) {
            this.cache.employees = employees;
            this.clearMonthlyCache();
            
            const statusText = status === 'normal' ? 'Bình thường' : 
                             status === 'overtime' ? 'Tăng ca' : 'OFF';
            window.showToast(`Đã cập nhật: ${statusText}`, 'success');
            return true;
        }
        
        return false;
        
    } catch (error) {
        console.error('Error updating work day:', error);
        window.showToast('Lỗi khi cập nhật', 'error');
        return false;
    }
}
    async addPenalty(employeeId, penaltyData) {
    try {
        const employees = await this.loadEmployees();
        const employee = employees.find(e => e.id == employeeId);
        
        if (!employee) {
            window.showToast('Không tìm thấy nhân viên', 'error');
            return false;
        }
        
        const monthData = this.getEmployeeMonthlyData(employee);
        
        penaltyData.id = Date.now();
        penaltyData.addedAt = new Date().toISOString();
        
        if (!monthData.penalties) monthData.penalties = [];
        monthData.penalties.push(penaltyData);
        
        this.calculateMonthlyData(employee, this.currentMonthKey);
        
        // Lưu vào Firebase qua DataManager
        const success = await window.dataManager.saveLocal(
            'employees',
            `employee_${employeeId}.json`,
            employee,
            `Thêm ${penaltyData.type === 'reward' ? 'thưởng' : 'phạt'} ${penaltyData.amount}₫ - ${employee.name}`
        );
        
        if (success) {
            this.cache.employees = employees;
            this.clearMonthlyCache();
            
            const typeText = penaltyData.type === 'reward' ? 'thưởng' : 'phạt';
            window.showToast(`Đã thêm ${typeText} ${penaltyData.amount.toLocaleString()}₫`, 'success');
            return true;
        }
        
        return false;
        
    } catch (error) {
        console.error('Error adding penalty:', error);
        window.showToast('Lỗi khi thêm chế tài', 'error');
        return false;
    }
}
    async addEmployee(employeeData) {
    try {
        const employees = await this.loadEmployees();
        
        // Kiểm tra trùng tên
        const isDuplicate = employees.some(emp => 
            emp.name.toLowerCase() === employeeData.name.toLowerCase()
        );
        
        if (isDuplicate) {
            window.showToast('Nhân viên đã tồn tại', 'warning');
            return null;
        }
        
        // Tạo ID mới = ID lớn nhất + 1
        const existingIds = employees.map(e => e.id).filter(id => id && !isNaN(id));
        const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
        const newId = maxId + 1;
        
        console.log(`🆔 Creating new employee with ID: ${newId} (max ID: ${maxId})`);
        
        const newEmployee = {
            id: newId,
            name: employeeData.name || '',
            phone: employeeData.phone || '',
            // THAY ĐỔI: Thay baseSalary bằng dailySalary
            dailySalary: employeeData.dailySalary || 0,
            position: employeeData.position || 'Nhân viên',
            monthlyData: [],
            createdAt: new Date().toISOString()
        };
        
        // Lưu vào Firebase qua DataManager
        const success = await window.dataManager.saveLocal(
            'employees',
            `employee_${newId}.json`,
            newEmployee,
            `Thêm nhân viên mới: ${newEmployee.name}`
        );
        
        if (success) {
            // Cập nhật local data
            employees.push(newEmployee);
            this.cache.employees = employees;
            
            window.showToast(`✅ Đã thêm nhân viên "${newEmployee.name}"`, 'success');
            return newEmployee;
        }
        
        return null;
        
    } catch (error) {
        console.error('❌ Error adding employee:', error);
        window.showToast('Lỗi khi thêm nhân viên', 'error');
        return null;
    }
}
    async updateEmployee(employeeId, updates) {
    try {
        const employees = await this.loadEmployees();
        const index = employees.findIndex(e => e.id == employeeId);
        
        if (index === -1) {
            window.showToast('Không tìm thấy nhân viên', 'error');
            return false;
        }
        
        employees[index] = {
            ...employees[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        
        // Lưu vào Firebase qua DataManager
        const success = await window.dataManager.saveLocal(
            'employees',
            `employee_${employeeId}.json`,
            employees[index],
            `Cập nhật nhân viên: ${employees[index].name}`
        );
        
        if (success) {
            this.cache.employees = employees;
            window.showToast('Đã cập nhật thông tin nhân viên', 'success');
            return true;
        }
        
        return false;
        
    } catch (error) {
        console.error('Error updating employee:', error);
        window.showToast('Lỗi khi cập nhật nhân viên', 'error');
        return false;
    }
}
formatDateFromFirebase(dateKey) {
    try {
        if (!dateKey) return '';
        
        if (dateKey.includes('/')) {
            return dateKey;
        }
        
        const [year, month, day] = dateKey.split('-');
        
        if (!year || !month || !day) {
            return dateKey;
        }
        
        return `${day}/${month}/${year}`;
        
    } catch (error) {
        return dateKey;
    }
}

formatDateForFirebase(dateStr) {
    try {
        if (!dateStr) return '';
        
        if (dateStr.includes('-') && dateStr.split('-')[0].length === 4) {
            return dateStr;
        }
        
        const [day, month, year] = dateStr.split('/');
        
        if (!day || !month || !year) {
            return dateStr;
        }
        
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        
    } catch (error) {
        return dateStr;
    }
}
    async deleteEmployee(employeeId) {
    try {
        const employees = await this.loadEmployees();
        const index = employees.findIndex(e => e.id == employeeId);
        
        if (index === -1) {
            window.showToast('Không tìm thấy nhân viên', 'error');
            return false;
        }
        
        const employeeName = employees[index].name;
        
        // 1. XÓA HOÀN TOÀN TỪ FIREBASE - DÙNG deleteData()
        console.log(`🗑️ Deleting employee_${employeeId} from Firebase...`);
        await window.githubManager.deleteData(`employees/employee_${employeeId}`);
        
        // 2. Xóa khỏi mảng local
        employees.splice(index, 1);
        
        // 3. Cập nhật cache
        this.cache.employees = employees;
        
        // 4. Cập nhật DataManager
        window.dataManager.data.employees.list = employees;
        window.dataManager.saveLocalData();
        
        console.log(`✅ Deleted employee "${employeeName}" completely`);
        window.showToast(`✅ Đã xóa hoàn toàn nhân viên "${employeeName}"`, 'success');
        
        return true;
        
    } catch (error) {
        console.error('❌ Error deleting employee:', error);
        window.showToast('Lỗi khi xóa nhân viên', 'error');
        return false;
    }
}
    
    getEmployeeMonthlyData(employee, monthKey = null) {
    const targetMonth = monthKey || this.currentMonthKey;
    
    const cacheKey = `${employee.id}_${targetMonth}`;
    if (this.cache.monthlyCalculations[cacheKey]) {
        return this.cache.monthlyCalculations[cacheKey];
    }
    
    if (!employee.monthlyData || !Array.isArray(employee.monthlyData)) {
        employee.monthlyData = [];
    }
    
    let monthData = employee.monthlyData.find(m => m.month === targetMonth);
    
    if (!monthData) {
        // SỬA: Lấy số ngày trong tháng thay vì cố định 30
        const daysInMonth = this.getDaysInMonth(targetMonth);
        
        monthData = {
            month: targetMonth,
            workdays: {},
            penalties: [],
            calculated: {
                totalOff: 0,
                totalOvertime: 0,
                normalDays: daysInMonth, // SỬA: Dùng daysInMonth thay vì 30
                actualSalary: 0, // SỬA: Khởi tạo 0, sẽ tính sau
                daysInMonth: daysInMonth, // THÊM: Lưu số ngày trong tháng
                dailySalary: employee.dailySalary || 0 // THÊM: Lưu lương ngày
            }
        };
        employee.monthlyData.push(monthData);
    }
    
    // THÊM: Đảm bảo calculated luôn có các trường mới
    if (!monthData.calculated) {
        monthData.calculated = {};
    }
    
    // THÊM: Đảm bảo có daysInMonth trong calculated
    if (monthData.calculated.daysInMonth === undefined) {
        monthData.calculated.daysInMonth = this.getDaysInMonth(targetMonth);
    }
    
    // THÊM: Đảm bảo có dailySalary trong calculated
    if (monthData.calculated.dailySalary === undefined) {
        monthData.calculated.dailySalary = employee.dailySalary || 0;
    }
    
    // THÊM: Đảm bảo normalDays không vượt quá daysInMonth
    if (monthData.calculated.normalDays === undefined || monthData.calculated.normalDays > monthData.calculated.daysInMonth) {
        monthData.calculated.normalDays = monthData.calculated.daysInMonth;
    }
    
    this.cache.monthlyCalculations[cacheKey] = monthData;
    
    return monthData;
}
    
    calculateMonthlyData(employee, monthKey) {
    const monthData = this.getEmployeeMonthlyData(employee, monthKey);
    
    // THAY ĐỔI: Lấy lương theo ngày thay vì lương tháng
    const dailySalary = employee.dailySalary || 0; // Lương/ngày
    
    // THAY ĐỔI: Xác định số ngày trong tháng
    const daysInMonth = this.getDaysInMonth(monthKey);
    
    let offDays = 0;
    let overtimeDays = 0;
    
    Object.values(monthData.workdays || {}).forEach(status => {
        if (status === 'off') offDays++;
        if (status === 'overtime') overtimeDays++;
    });
    
    // THAY ĐỔI: Tính normalDays dựa trên số ngày thực tế của tháng
    const normalDays = daysInMonth - offDays - overtimeDays;
    
    // THAY ĐỔI: Tính lương dựa trên dailySalary
    let actualSalary = 0;
    
    if (dailySalary > 0) {
        actualSalary = (normalDays * dailySalary) + (overtimeDays * dailySalary * 2);
    }
    
    // Xử lý thưởng/phạt (giữ nguyên)
    if (monthData.penalties && Array.isArray(monthData.penalties)) {
        monthData.penalties.forEach(p => {
            if (p.type === 'reward') {
                actualSalary += p.amount || 0;
            } else if (p.type === 'penalty') {
                actualSalary -= p.amount || 0;
            }
        });
    }
    
    actualSalary = Math.max(0, actualSalary);
    
    monthData.calculated = {
        totalOff: offDays,
        totalOvertime: overtimeDays,
        normalDays: normalDays,
        actualSalary: actualSalary,
        // THÊM: Số ngày trong tháng để hiển thị
        daysInMonth: daysInMonth,
        // THÊM: Lương ngày để hiển thị
        dailySalary: dailySalary
    };
    
    return monthData.calculated;
}
    
    // ========== CACHE MANAGEMENT ==========
    
    clearMonthlyCache() {
        this.cache.monthlyCalculations = {};
    }
    
    // ========== UI RENDER METHODS ==========
    
    async render() {
        if (this.isLoading || this.isRendering) return;
        
        this.isLoading = true;
        this.isRendering = true;
        const mainContent = document.getElementById('mainContent');
        
        try {
            const employees = await this.loadEmployees();
            const totalSalary = this.calculateTotalSalary(employees);
            const stats = this.calculateStats(employees);
            
            mainContent.innerHTML = this.renderEmployeesUI(employees, totalSalary, stats);
            
        } catch (error) {
            mainContent.innerHTML = `
                <div class="error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Lỗi khi tải dữ liệu</p>
                    <button onclick="window.employeesModule.render()">Thử lại</button>
                </div>
            `;
        } finally {
            this.isLoading = false;
            this.isRendering = false;
        }
    }
    getDaysInMonth(monthKey) {
    try {
        // monthKey = "2024-03" (YYYY-MM)
        const [year, month] = monthKey.split('-');
        // Tháng trong JavaScript là 0-indexed, nên tháng 3 = index 2
        return new Date(year, month, 0).getDate();
    } catch (error) {
        console.error('Error getting days in month:', error);
        // Fallback: 30 ngày nếu có lỗi
        return 30;
    }
}
    renderEmployeesUI(employees, totalSalary, stats) {
    return `
        <div class="employees-container">
            <div class="employees-header">
                <button class="btn-primary" onclick="window.employeesModule.showAddEmployeeModal()">
                    <i class="fas fa-plus"></i> THÊM NHÂN VIÊN
                </button>
            </div>
            
            <div class="month-selector">
                <label>Tháng lương:</label>
                <select id="salaryMonth" onchange="window.employeesModule.changeMonth()">
                    ${this.generateMonthOptions()}
                </select>
            </div>
            
            <div class="summary-cards" onclick="window.employeesModule.showSalaryDetails()" style="cursor: pointer;">
                <div class="summary-card">
                    <i class="fas fa-users"></i>
                    <div>
                        <div class="summary-label">Tổng NV</div>
                        <div class="summary-value">${employees.length}</div>
                    </div>
                </div>
                
                <div class="summary-card">
                    <i class="fas fa-calendar-times"></i>
                    <div>
                        <div class="summary-label">Ngày OFF</div>
                        <div class="summary-value">${stats.totalOff}</div>
                    </div>
                </div>
                
                <div class="summary-card">
                    <i class="fas fa-clock"></i>
                    <div>
                        <div class="summary-label">Tăng ca</div>
                        <div class="summary-value">${stats.totalOvertime}</div>
                    </div>
                </div>
                
                <div class="summary-card highlight">
                    <i class="fas fa-money-bill-wave"></i>
                    <div>
                        <div class="summary-label">Tổng lương</div>
                        <div class="summary-value">${totalSalary.toLocaleString()} ₫</div>
                    </div>
                </div>
            </div>
            
            <div class="employees-list">
                <h3>DANH SÁCH NHÂN VIÊN</h3>
                
                ${employees.length > 0 ? employees.map((employee, index) => {
                    const salary = this.calculateEmployeeSalary(employee);
                    const workStats = this.getWorkStatsSync(employee);
                    
                    return `
                        <div class="employee-card" onclick="window.employeesModule.showEmployeeDetail(${index})">
                            <div class="employee-avatar">
                                <i class="fas fa-user"></i> 
                            </div>
                            <div class="employee-info">
                                <div class="employee-name">${employee.name}</div>
                                <div class="employee-phone">
                                    <i class="fas fa-phone"></i> ${employee.phone || 'Chưa có SĐT'}
                                </div>
                                <div class="employee-stats">
                                    <span class="stat-off">OFF: ${workStats.off} ngày</span>
                                    <span class="stat-overtime">Tăng ca: ${workStats.overtime} ngày</span>
                                </div>
                                <div class="employee-salary">
                                    <!-- THAY ĐỔI: Hiển thị lương ngày và thực lãnh -->
                                    Lương ngày: <strong>${(employee.dailySalary || 0).toLocaleString()} ₫</strong>
                                </div>
                                <div class="employee-salary actual">
                                    Thực lãnh: <strong>${salary.actual.toLocaleString()} ₫</strong>
                                </div>
                            </div>
                            <div class="employee-arrow">
                                <i class="fas fa-chevron-right"></i>
                            </div>
                        </div>
                    `;
                }).join('') : `
                    <div class="empty-state">
                        <i class="fas fa-user-slash"></i>
                        <p>Chưa có nhân viên nào</p>
                        <button class="btn-primary" onclick="window.employeesModule.showAddEmployeeModal()">
                            <i class="fas fa-plus"></i> THÊM NHÂN VIÊN ĐẦU TIÊN
                        </button>
                    </div>
                `}
            </div>
        </div>
    `;
}
    
    generateMonthOptions() {
        const options = [];
        const now = new Date();
        
        for (let i = 0; i < 12; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() - i);
            const value = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
            const label = `Tháng ${value}`;
            const selected = value === this.currentMonth ? 'selected' : '';
            
            options.push(`<option value="${value}" ${selected}>${label}</option>`);
        }
        
        return options.join('');
    }
    
    async changeMonth() {
        const select = document.getElementById('salaryMonth');
        this.currentMonth = select.value;
        const [month, year] = this.currentMonth.split('/');
        this.currentMonthKey = `${year}-${month.padStart(2, '0')}`;
        this.clearMonthlyCache();
        await this.render();
    }
    
    calculateTotalSalary(employees) {
        let total = 0;
        for (const employee of employees) {
            const salary = this.calculateEmployeeSalary(employee);
            total += salary.actual;
        }
        return total;
    }
    
    calculateStats(employees) {
        let totalOff = 0;
        let totalOvertime = 0;
        
        for (const employee of employees) {
            const workStats = this.getWorkStatsSync(employee);
            totalOff += workStats.off;
            totalOvertime += workStats.overtime;
        }
        
        return { totalOff, totalOvertime };
    }
    
    // ========== MODAL METHODS ==========
    
    showAddEmployeeModal() {
    const modalContent = `
        <div class="modal-header">
            <h2><i class="fas fa-user-plus"></i> THÊM NHÂN VIÊN</h2>
            <button class="modal-close" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div class="form-group">
                <label>Tên nhân viên:</label>
                <input type="text" id="employeeName" placeholder="Nguyễn Văn A" required>
            </div>
            
            <div class="form-group">
                <label>Số điện thoại:</label>
                <input type="tel" id="employeePhone" placeholder="0912 345 678">
            </div>
            
            <div class="form-group">
                <label>Lương theo ngày:</label>
                <div class="input-group">
                    <input type="text" id="employeeDailySalary" placeholder="155.000" 
                           oninput="window.employeesModule.formatCurrency(this)">
                    <span class="currency">₫/ngày</span>
                </div>
                <small class="form-hint">Lương tính cho mỗi ngày làm việc</small>
            </div>
            
            <div class="form-group">
                <label>Chức vụ:</label>
                <input type="text" id="employeePosition" placeholder="Nhân viên">
            </div>
            
            <button class="btn-primary" onclick="window.employeesModule.addEmployeeFromModal()">
                <i class="fas fa-save"></i> 💾 LƯU NHÂN VIÊN
            </button>
            
            <button class="btn-secondary" onclick="closeModal()">
                HỦY
            </button>
        </div>
    `;
    
    window.showModal(modalContent);
}
    
    
    getCurrencyValue(inputId) {
    try {
        const input = document.getElementById(inputId);
        if (!input) {
            console.warn(`❌ Input not found: ${inputId}`);
            return 0;
        }
        
        const value = input.value.replace(/\D/g, '');
        const parsedValue = parseInt(value) || 0;
        
        console.log(`💰 Currency value for ${inputId}: ${value} -> ${parsedValue}`);
        
        return parsedValue;
        
    } catch (error) {
        console.error('Error in getCurrencyValue:', error);
        return 0;
    }
}

formatCurrency(input) {
    let value = input.value.replace(/\D/g, '');
    if (value) {
        value = parseInt(value).toLocaleString('vi-VN');
    }
    input.value = value;
}
    
    async addEmployeeFromModal() {
    try {
        const name = document.getElementById('employeeName').value.trim();
        const phone = document.getElementById('employeePhone').value.trim();
        // THAY ĐỔI: Lấy dailySalary thay vì baseSalary
        const dailySalary = this.getCurrencyValue('employeeDailySalary');
        const position = document.getElementById('employeePosition').value.trim() || 'Nhân viên';
        
        if (!name) {
            window.showToast('Vui lòng nhập tên nhân viên', 'warning');
            document.getElementById('employeeName').focus();
            return;
        }
        
        if (dailySalary <= 0) {
            window.showToast('Vui lòng nhập lương theo ngày', 'warning');
            document.getElementById('employeeDailySalary').focus();
            return;
        }
        
        const employees = await this.loadEmployees();
        const isDuplicate = employees.some(emp => 
            emp.name.toLowerCase() === name.toLowerCase()
        );
        
        if (isDuplicate) {
            window.showToast('Nhân viên đã tồn tại', 'warning');
            return;
        }
        
        const newEmployee = await this.addEmployee({
            name,
            phone,
            // THAY ĐỔI: Truyền dailySalary thay vì baseSalary
            dailySalary: dailySalary,
            position
        });
        
        if (newEmployee) {
            closeModal();
            await this.render();
        }
        
    } catch (error) {
        window.showToast('Lỗi khi thêm nhân viên', 'error');
    }
}
    
    async showEmployeeDetail(index) {
    const employees = await this.loadEmployees();
    if (index >= employees.length) return;
    
    this.selectedEmployee = employees[index];
    
    const salary = this.calculateEmployeeSalary(this.selectedEmployee);
    const monthData = this.getEmployeeMonthlyData(this.selectedEmployee);
    const workStats = {
        off: monthData.calculated.totalOff || 0,
        overtime: monthData.calculated.totalOvertime || 0,
        workdays: monthData.workdays || {}
    };
    
    const [month, year] = this.currentMonth.split('/');
    const daysInMonth = this.getDaysInMonth(this.currentMonthKey);
    
    let calendarHTML = '<div class="week-days">';
    let dayCount = 1;
    
    for (let week = 0; week < 6; week++) {
        if (dayCount > daysInMonth) break;
        
        calendarHTML += '<div class="week">';
        for (let dow = 1; dow <= 7; dow++) {
            if (dayCount > daysInMonth) {
                calendarHTML += '<div class="day empty"></div>';
            } else {
                const dayStr = String(dayCount).padStart(2, '0');
                const status = workStats.workdays[dayStr] || 'normal';
                calendarHTML += `
                    <div class="day ${status}" onclick="window.employeesModule.selectWorkDay(${dayCount})">
                        ${dayCount}
                    </div>
                `;
                dayCount++;
            }
        }
        calendarHTML += '</div>';
    }
    calendarHTML += '</div>';
    
    const penalties = monthData.penalties || [];
    
    const dailySalary = this.selectedEmployee.dailySalary || 0;
    const dailySalaryFormatted = dailySalary.toLocaleString();
    const baseSalaryEstimate = dailySalary * daysInMonth;
    const penaltiesTotal = this.getPenaltiesTotal(penalties);
    
    const modalContent = `
        <div class="modal-header">
            <div class="employee-header-info">
                <div class="employee-avatar-large">
                    <i class="fas fa-user"></i>
                </div>
                <div class="employee-header-details">
                    <h2>${this.selectedEmployee.name.toUpperCase()}</h2>
                    <div class="employee-phone">
                        <i class="fas fa-phone"></i> ${this.selectedEmployee.phone || 'Chưa có SĐT'}
                    </div>
                </div>
            </div>
            <div class="header-actions">
                <button class="btn-edit" onclick="window.employeesModule.showEditModal()" title="Sửa thông tin">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
        </div>
        
        <div class="modal-body">
            <!-- Real Salary Section -->
            <div class="real-salary-section">
                <div class="real-salary-label">THỰC LÃNH</div>
                <div class="real-salary-amount">${salary.actual.toLocaleString()} ₫</div>
            </div>
            
            <!-- Calendar Section -->
            <div class="calendar-section">
                <h3><i class="fas fa-calendar-alt"></i> LỊCH LÀM VIỆC THÁNG ${month}</h3>
                <div class="calendar-legend">
                    <div class="legend-item">
                        <div class="legend-color normal"></div>
                        <span>Bình thường</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color overtime"></div>
                        <span>Tăng ca</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color off"></div>
                        <span>OFF</span>
                    </div>
                </div>
                ${calendarHTML}
            </div>
            
            <!-- Penalties Section -->
            ${penalties.length > 0 ? `
                <div class="penalties-section">
                    <h4><i class="fas fa-balance-scale"></i> CHẾ TÀI THÁNG ${month}</h4>
                    <div class="penalties-list">
                        ${penalties.map(p => `
                            <div class="penalty-item ${p.type}">
                                <i class="fas fa-${p.type === 'reward' ? 'gift' : 'exclamation-triangle'}"></i>
                                <div>
                                    <strong>${p.type === 'reward' ? 'Thưởng' : 'Phạt'}: ${p.amount.toLocaleString()}₫</strong>
                                    <small>${p.reason || 'Không có lý do'}</small>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            <!-- Action Buttons -->
            <div class="action-buttons">
                <button class="btn-penalty" onclick="window.employeesModule.showPenaltyModal()">
                    <i class="fas fa-balance-scale"></i> CHẾ TÀI
                </button>
                <button class="btn-close-modal" onclick="closeModal()">
                    <i class="fas fa-times"></i> ĐÓNG
                </button>
            </div>
            
            <!-- Salary Details Card -->
            <div class="salary-details-card">
                <div class="salary-card-header">
                    <h3><i class="fas fa-money-bill-wave"></i> LƯƠNG THÁNG ${month}/${year}</h3>
                </div>
                <div class="salary-card-content">
                    <div class="salary-item">
                        <span class="salary-label">Lương theo ngày</span>
                        <span class="salary-value">${dailySalaryFormatted} ₫</span>
                    </div>
                    <div class="salary-item">
                        <span class="salary-label">Lương ước tính (${daysInMonth} ngày)</span>
                        <span class="salary-value">${baseSalaryEstimate.toLocaleString()} ₫</span>
                    </div>
                    <div class="salary-item">
                        <span class="salary-label">Ngày OFF</span>
                        <span class="salary-value">${salary.off} ngày</span>
                    </div>
                    <div class="salary-item">
                        <span class="salary-label">Ngày tăng ca</span>
                        <span class="salary-value">${salary.overtime} ngày</span>
                    </div>
                    <div class="salary-item total">
                        <span class="salary-label">Thưởng/Phạt</span>
                        <span class="salary-value ${penaltiesTotal > 0 ? 'positive' : penaltiesTotal < 0 ? 'negative' : ''}">
                            ${penaltiesTotal > 0 ? '+' : ''}${penaltiesTotal.toLocaleString()} ₫
                        </span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    window.showModal(modalContent);
}
    
    getPenaltiesTotal(penalties) {
        return penalties.reduce((total, p) => {
            if (p.type === 'reward') {
                return total + (p.amount || 0);
            } else {
                return total - (p.amount || 0);
            }
        }, 0);
    }

showWorkDayRegistration() {
    // Chỉ nhân viên mới được đăng ký
    if (!window.authManager || !window.authManager.isEmployee()) {
        window.showToast('Chỉ nhân viên mới được đăng ký ngày làm', 'warning');
        return;
    }
    
    const employeeId = window.authManager.getEmployeeId();
    if (!employeeId) {
        window.showToast('Không tìm thấy thông tin nhân viên', 'error');
        return;
    }
    
    // Lấy thông tin nhân viên hiện tại
    const employees = this.loadEmployeesSync();
    const employee = employees.find(e => e.id == employeeId);
    
    if (!employee) {
        window.showToast('Không tìm thấy thông tin nhân viên', 'error');
        return;
    }
    
    // Lấy dữ liệu tháng hiện tại
    const now = new Date();
    const currentMonth = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    const [month, year] = currentMonth.split('/');
    const daysInMonth = new Date(year, month, 0).getDate();
    
    // Lấy trạng thái ngày làm hiện tại
    const monthData = this.getEmployeeMonthlyData(employee);
    const workdays = monthData.workdays || {};
    
    // Tạo lịch 30 ngày
    let calendarHTML = '<div class="registration-calendar">';
    let dayCount = 1;
    
    // Hiển thị các ngày trong tháng
    for (let week = 0; week < 6; week++) {
        if (dayCount > daysInMonth) break;
        
        calendarHTML += '<div class="week">';
        for (let dow = 1; dow <= 7; dow++) {
            if (dayCount > daysInMonth) {
                calendarHTML += '<div class="day empty"></div>';
            } else {
                const dayStr = String(dayCount).padStart(2, '0');
                const currentStatus = workdays[dayStr] || 'normal';
                const isToday = dayCount === now.getDate();
                
                calendarHTML += `
                    <div class="day ${currentStatus} ${isToday ? 'today' : ''}" 
                         onclick="window.employeesModule.selectDayForRegistration(${dayCount}, '${currentStatus}')">
                        <div class="day-number">${dayCount}</div>
                        <div class="day-status">${this.getStatusIcon(currentStatus)}</div>
                    </div>
                `;
                dayCount++;
            }
        }
        calendarHTML += '</div>';
    }
    calendarHTML += '</div>';
    
    // Tạo legend cho màu sắc
    const legendHTML = `
        <div class="calendar-legend">
            <div class="legend-item">
                <div class="legend-color normal"></div>
                <span>Bình thường</span>
            </div>
            <div class="legend-item">
                <div class="legend-color overtime"></div>
                <span>Tăng ca</span>
            </div>
            <div class="legend-item">
                <div class="legend-color off"></div>
                <span>OFF</span>
            </div>
            <div class="legend-item">
                <div class="legend-color today-marker"></div>
                <span>Hôm nay</span>
            </div>
        </div>
    `;
    
    const modalContent = `
        <div class="modal-header">
            <h2><i class="fas fa-calendar-plus"></i> ĐĂNG KÝ NGÀY LÀM</h2>
            <button class="modal-close" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body registration-modal">
            <div class="employee-info-card">
                <div class="employee-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="employee-details">
                    <div class="employee-name">${employee.name}</div>
                    <div class="employee-month">Tháng ${currentMonth}</div>
                </div>
                <div class="employee-stats">
                    <div class="stat-item">
                        <i class="fas fa-check-circle" style="color:#4CAF50"></i>
                        <span>Đã đăng ký: ${Object.keys(workdays).length} ngày</span>
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-clock" style="color:#f6ad55"></i>
                        <span>Tăng ca: ${monthData.calculated?.totalOvertime || 0} ngày</span>
                    </div>
                </div>
            </div>
            
            <div class="calendar-section">
                <h3><i class="fas fa-calendar-alt"></i> LỊCH THÁNG ${month}/${year}</h3>
                ${calendarHTML}
                ${legendHTML}
            </div>
            
            <div class="day-selection-section" id="daySelectionSection" style="display: none;">
                <h3><i class="fas fa-edit"></i> CHỌN LOẠI NGÀY</h3>
                <div class="selected-day-info" id="selectedDayInfo">
                    <!-- Thông tin ngày được chọn sẽ hiển thị ở đây -->
                </div>
                
                <div class="workday-options">
                    <label class="option-item">
                        <input type="radio" name="workDayType" value="normal" checked>
                        <div class="option-content">
                            <div class="option-title normal-option">
                                <i class="fas fa-check-circle"></i> BÌNH THƯỜNG
                            </div>
                            <div class="option-subtitle">
</div>
                        </div>
                    </label>
                    
                    <label class="option-item">
                        <input type="radio" name="workDayType" value="overtime">
                        <div class="option-content">
                            <div class="option-title overtime-option">
                                <i class="fas fa-clock"></i> TĂNG CA 
                            </div>
                            <div class="option-subtitle">
</div>
                        </div>
                    </label>
                    
                    <label class="option-item">
                        <input type="radio" name="workDayType" value="off">
                        <div class="option-content">
                            <div class="option-title off-option">
                                <i class="fas fa-home"></i> OFF 
                            </div>
                            <div class="option-subtitle">
</div>
                        </div>
                    </label>
                </div>
                
                <div class="form-group">
                    <label><i class="fas fa-sticky-note"></i> Ghi chú (nếu có):</label>
                    <textarea id="workDayNote" placeholder="Lý do tăng ca/OFF, công việc đặc biệt..." rows="3"></textarea>
                </div>
                
                <div class="action-buttons">
                    <button class="btn-primary" onclick="window.employeesModule.submitWorkDayRegistration(${employeeId})">
                        <i class="fas fa-save"></i> LƯU ĐĂNG KÝ
                    </button>
                    <button class="btn-secondary" onclick="window.employeesModule.cancelDaySelection()">
                        HỦY
                    </button>
                </div>
            </div>
            
            <div class="registration-instruction">
                <i class="fas fa-info-circle"></i>
                <strong>Hướng dẫn:</strong> Nhấn vào ngày trong lịch để đăng ký loại ngày làm
            </div>
        </div>
    `;
    
    window.showModal(modalContent);
}

// Helper method để load employees đồng bộ
loadEmployeesSync() {
    if (this.cache.employees) {
        return this.cache.employees;
    }
    
    try {
        return window.dataManager.getEmployees() || [];
    } catch (error) {
        console.error('Error loading employees:', error);
        return [];
    }
}

// Helper method để lấy icon trạng thái
getStatusIcon(status) {
    switch(status) {
        case 'overtime': return '<i class="fas fa-clock" style="color:#f6ad55"></i>';
        case 'off': return '<i class="fas fa-home" style="color:#fc8181"></i>';
        default: return '<i class="fas fa-check" style="color:#4CAF50"></i>';
    }
}

// Method để chọn ngày
selectDayForRegistration(day, currentStatus) {
    const now = new Date();
    const currentMonth = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    
    // Cập nhật thông tin ngày được chọn
    const dayInfoHTML = `
        <div class="day-info-card">
            <div class="day-header">
                <i class="fas fa-calendar-day"></i>
                <h4>Ngày ${day} - Tháng ${currentMonth}</h4>
            </div>
            <div class="current-status">
                Trạng thái hiện tại: 
                <span class="status-badge ${currentStatus}">
                    ${currentStatus === 'normal' ? 'Bình thường' : 
                      currentStatus === 'overtime' ? 'Tăng ca' : 'OFF'}
                </span>
            </div>
        </div>
    `;
    
    document.getElementById('selectedDayInfo').innerHTML = dayInfoHTML;
    
    // Chọn radio button tương ứng với trạng thái hiện tại
    const radioButtons = document.getElementsByName('workDayType');
    radioButtons.forEach(radio => {
        if (radio.value === currentStatus) {
            radio.checked = true;
        }
    });
    
    // Lưu ngày được chọn
    this.selectedDayForRegistration = day;
    
    // Hiển thị section chọn loại ngày
    document.getElementById('daySelectionSection').style.display = 'block';
    
    // Cuộn đến phần chọn loại ngày
    setTimeout(() => {
        const section = document.getElementById('daySelectionSection');
        if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, 100);
}

// Method hủy chọn ngày
cancelDaySelection() {
    this.selectedDayForRegistration = null;
    document.getElementById('daySelectionSection').style.display = 'none';
}

// Cập nhật phương thức submit
async submitWorkDayRegistration(employeeId) {
    try {
        if (!this.selectedDayForRegistration) {
            window.showToast('Vui lòng chọn ngày trong lịch', 'warning');
            return;
        }
        
        const workDayType = document.querySelector('input[name="workDayType"]:checked').value;
        const note = document.getElementById('workDayNote').value.trim();
        const day = this.selectedDayForRegistration;
        
        // Cập nhật ngày làm
        const success = await this.updateWorkDay(employeeId, day, workDayType);
        
        if (success) {
            // Cập nhật ghi chú nếu có
            if (note) {
                const employees = await this.loadEmployees();
                const employee = employees.find(e => e.id == employeeId);
                
                if (employee) {
                    const monthData = this.getEmployeeMonthlyData(employee);
                    if (!monthData.notes) monthData.notes = {};
                    monthData.notes[String(day).padStart(2, '0')] = note;
                    
                    // Lưu lại
                    await window.dataManager.saveLocal(
                        'employees',
                        `employee_${employeeId}.json`,
                        employee,
                        `Ghi chú ngày ${day} - ${employee.name}`
                    );
                }
            }
            
            // Cập nhật lại modal
            window.showToast('Đã cập nhật đăng ký ngày làm', 'success');
            this.showWorkDayRegistration();
        }
        
    } catch (error) {
        console.error('Error submitting work day registration:', error);
        window.showToast('Lỗi khi đăng ký', 'error');
    }
}

    async deleteCurrentEmployee() {
        if (!this.selectedEmployee) return;
        
        if (!confirm(`Xóa nhân viên "${this.selectedEmployee.name}"?\n\nHành động này không thể hoàn tác!`)) {
            return;
        }
        
        const success = await this.deleteEmployee(this.selectedEmployee.id);
        if (success) {
            closeModal();
            await this.render();
        }
    }
    
    selectWorkDay(day) {
    if (!this.selectedEmployee) return;
    
    const currentStatus = this.getCurrentWorkDayStatus(day);
    
    // SỬA: Lấy dailySalary thay vì baseSalary
    const dailySalary = this.selectedEmployee.dailySalary || 0;
    const dailySalaryFormatted = dailySalary.toLocaleString();
    const overtimeSalaryFormatted = (dailySalary * 2).toLocaleString();
    
    const modalContent = `
        <div class="modal-header">
            <h2><i class="fas fa-calendar-day"></i> CHỌN LOẠI NGÀY</h2>
            <button class="modal-close" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div class="modal-date">
                Ngày ${day} - Tháng ${this.currentMonth}
            </div>
            
            <div class="workday-options">
                <label class="option-item">
                    <input type="radio" name="workdayType" value="normal" ${currentStatus === 'normal' ? 'checked' : ''}>
                    <div class="option-content">
                        <div class="option-title">BÌNH THƯỜNG</div>
                        <!-- SỬA: Hiển thị dailySalary -->
                    </div>
                </label>
                
                <label class="option-item">
                    <input type="radio" name="workdayType" value="overtime" ${currentStatus === 'overtime' ? 'checked' : ''}>
                    <div class="option-content">
                        <div class="option-title">TĂNG CA (+1 ngày lương)</div>
                        <!-- SỬA: Hiển thị overtimeSalary -->
                    </div>
                </label>
                
                <label class="option-item">
                    <input type="radio" name="workdayType" value="off" ${currentStatus === 'off' ? 'checked' : ''}>
                    <div class="option-content">
                        <div class="option-title">OFF (-1 ngày lương)</div>
                        <!-- SỬA: Hiển thị dailySalary -->
                    </div>
                </label>
            </div>
            
            <button class="btn-primary" onclick="window.employeesModule.updateSelectedWorkDay(${day})">
                <i class="fas fa-save"></i> CẬP NHẬT
            </button>
            
            <button class="btn-secondary" onclick="closeModal()">
                HỦY
            </button>
        </div>
    `;
    
    window.showModal(modalContent);
}
    
    getCurrentWorkDayStatus(day) {
        if (!this.selectedEmployee) return 'normal';
        const monthData = this.getEmployeeMonthlyData(this.selectedEmployee);
        const dayStr = String(day).padStart(2, '0');
        return (monthData.workdays && monthData.workdays[dayStr]) || 'normal';
    }
    
    async updateSelectedWorkDay(day) {
        const selectedType = document.querySelector('input[name="workdayType"]:checked').value;
        
        const success = await this.updateWorkDay(
            this.selectedEmployee.id, 
            day, 
            selectedType
        );
        
        if (success) {
            closeModal();
            const employees = await this.loadEmployees();
            const index = employees.findIndex(e => e.id === this.selectedEmployee.id);
            if (index >= 0) {
                this.selectedEmployee = employees[index];
                const modalIndex = employees.indexOf(this.selectedEmployee);
                this.showEmployeeDetail(modalIndex);
            }
        }
    }
    
    showPenaltyModal() {
        const modalContent = `
            <div class="modal-header">
                <strong>NV:</strong> ${this.selectedEmployee.name}
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Loại:</label>
                    <div class="button-radio-group">
                        <label class="radio-button-label">
                            <input type="radio" name="penaltyType" value="reward" checked>
                            <span class="button-radio reward">Thưởng (+)</span>
                        </label>
                        <label class="radio-button-label">
                            <input type="radio" name="penaltyType" value="penalty">
                            <span class="button-radio penalty">Phạt (-)</span>
                        </label>
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Số tiền (VND):</label>
                    <div class="input-group">
                        <input type="text" id="penaltyAmount" 
                               oninput="window.employeesModule.formatCurrency(this)">
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Lý do:</label>
                    <textarea id="penaltyReason" placeholder="Nhập lý do thưởng/phạt..." rows="3"></textarea>
                </div>
                
                <button class="btn-primary" onclick="window.employeesModule.addPenaltyFromModal()">
                    <i class="fas fa-save"></i> LƯU
                </button>
                
                <button class="btn-secondary" onclick="closeModal()">
                    HỦY
                </button>
            </div>
        `;
        
        window.showModal(modalContent);
    }
    
    async addPenaltyFromModal() {
        try {
            const type = document.querySelector('input[name="penaltyType"]:checked').value;
            const amount = this.getCurrencyValue('penaltyAmount');
            const reason = document.getElementById('penaltyReason').value.trim();
            
            if (amount <= 0) {
                window.showToast('Vui lòng nhập số tiền', 'warning');
                return;
            }
            
            if (!reason) {
                window.showToast('Vui lòng nhập lý do', 'warning');
                return;
            }
            
            const penaltyData = {
                type,
                amount,
                reason,
                date: new Date().toISOString().split('T')[0]
            };
            
            const success = await this.addPenalty(this.selectedEmployee.id, penaltyData);
            
            if (success) {
                closeModal();
                const employees = await this.loadEmployees();
                const index = employees.findIndex(e => e.id === this.selectedEmployee.id);
                this.showEmployeeDetail(index);
            }
            
        } catch (error) {
            window.showToast('Lỗi khi thêm chế tài', 'error');
        }
    }
    
    showEditModal() {
    const modalContent = `
        <div class="modal-header">
            <h2><i class="fas fa-edit"></i> SỬA THÔNG TIN</h2>
            <button class="modal-close" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div class="form-group">
                <label>Tên nhân viên:</label>
                <input type="text" id="editEmployeeName" value="${this.selectedEmployee.name}">
            </div>
            
            <div class="form-group">
                <label>Số điện thoại:</label>
                <input type="tel" id="editEmployeePhone" value="${this.selectedEmployee.phone || ''}">
            </div>
            
            <div class="form-group">
                <label>Lương theo ngày:</label>
                <div class="input-group">
                    <input type="text" id="editEmployeeDailySalary" value="${this.selectedEmployee.dailySalary || 0}" 
                           oninput="window.employeesModule.formatCurrency(this)">
                </div>
                <small class="form-hint">Lương tính cho mỗi ngày làm việc</small>
            </div>
            
            <button class="btn-primary" onclick="window.employeesModule.updateEmployeeFromModal()">
                <i class="fas fa-save"></i> CẬP NHẬT
            </button>
            <button class="btn-primary" onclick="window.employeesModule.deleteCurrentEmployee()">
                <i class="fas fa-trash"></i> XÓA NHÂN VIÊN
            </button>
            <button class="btn-secondary" onclick="closeModal()">
                HỦY
            </button>
        </div>
    `;
    
    window.showModal(modalContent);
}
    
    async updateEmployeeFromModal() {
    try {
        const name = document.getElementById('editEmployeeName').value.trim();
        const phone = document.getElementById('editEmployeePhone').value.trim();
        // THAY ĐỔI: Lấy dailySalary thay vì baseSalary
        const dailySalary = this.getCurrencyValue('editEmployeeDailySalary');
        
        if (!name) {
            window.showToast('Vui lòng nhập tên nhân viên', 'warning');
            return;
        }
        
        if (dailySalary <= 0) {
            window.showToast('Vui lòng nhập lương theo ngày', 'warning');
            return;
        }
        
        const success = await this.updateEmployee(this.selectedEmployee.id, {
            name,
            phone,
            // THAY ĐỔI: Truyền dailySalary thay vì baseSalary
            dailySalary: dailySalary
        });
        
        if (success) {
            closeModal();
            await this.render();
        }
        
    } catch (error) {
        window.showToast('Lỗi khi cập nhật', 'error');
    }
}
    
    async showSalaryDetails() {
        const employees = await this.loadEmployees();
        
        let detailsHTML = '';
        let total = 0;
        
        for (const employee of employees) {
            const salary = this.calculateEmployeeSalary(employee);
            total += salary.actual;
            
            detailsHTML += `
                <div class="salary-detail-item">
                    <div class="detail-name">${employee.name}</div>
                    <div class="detail-salary">${salary.actual.toLocaleString()} ₫</div>
                    <div class="detail-breakdown">
                        <small>
                            Cơ bản: ${salary.base.toLocaleString()} ₫ | 
                            OFF: ${salary.off} ngày | 
                            Tăng ca: ${salary.overtime} ngày
                        </small>
                    </div>
                </div>
            `;
        }
        
        const modalContent = `
            <div class="modal-header">
                <h2><i class="fas fa-money-bill-wave"></i> CHI TIẾT LƯƠNG THÁNG ${this.currentMonth}</h2>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="salary-summary">
                    <div class="summary-total">
                        <span>Tổng lương toàn bộ nhân viên:</span>
                        <strong>${total.toLocaleString()} ₫</strong>
                    </div>
                </div>
                
                <div class="salary-details-list">
                    ${detailsHTML}
                </div>
                
                <button class="btn-secondary" onclick="closeModal()">
                    ĐÓNG
                </button>
            </div>
        `;
        
        window.showModal(modalContent);
    }
    
    
}

// Khởi tạo module
window.employeesModule = new EmployeesModule();

