// employees.js - Module nhân viên với lưu trữ tập trung 1 file
class EmployeesModule {
    constructor() {
        const now = new Date();
        this.currentMonth = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
        this.currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        this.selectedEmployee = null;
        this.isLoading = false;
        
        // Cache toàn bộ dữ liệu
        this.cache = {
            employees: null,
            lastSync: null,
            hasChanges: false
        };
    }
    
    // ========== CORE DATA METHODS ==========
    
    async loadEmployees() {
        try {
            // 1. Lấy từ cache trước
            if (this.cache.employees) {
                return this.cache.employees;
            }
            
            // 2. Load từ GitHub
            const data = await window.githubManager.getFileContent('employees/main.json');
            
            if (data && data.employees) {
                this.cache.employees = data.employees;
                this.cache.lastSync = new Date().toISOString();
                
                // 3. Đồng bộ với localStorage
                this.syncWithLocalStorage(data.employees);
                console.log(`✅ Loaded ${data.employees.length} employees from GitHub`);
                return data.employees;
            }
            
            // 4. Fallback: từ localStorage
            const localEmployees = window.dataManager.getEmployees();
            console.log(`📂 Loaded ${localEmployees.length} employees from local storage`);
            return localEmployees;
            
        } catch (error) {
            console.error('❌ Error loading employees:', error);
            const localEmployees = window.dataManager.getEmployees();
            console.log(`🔄 Using ${localEmployees.length} employees from local storage`);
            return localEmployees;
        }
    }
    
    syncWithLocalStorage(employees) {
        try {
            window.dataManager.data.employees.list = employees;
            window.dataManager.saveToLocalStorage();
            console.log(`💾 Synced ${employees.length} employees to local storage`);
        } catch (error) {
            console.error('Error syncing to localStorage:', error);
        }
    }
    
    getEmployeeMonthlyData(employee, monthKey = null) {
        const targetMonth = monthKey || this.currentMonthKey;
        
        // Đảm bảo monthlyData tồn tại
        if (!employee.monthlyData || !Array.isArray(employee.monthlyData)) {
            employee.monthlyData = [];
        }
        
        // Tìm dữ liệu tháng hiện tại
        let monthData = employee.monthlyData.find(m => m.month === targetMonth);
        
        // Nếu chưa có, tạo mới
        if (!monthData) {
            monthData = {
                month: targetMonth,
                workdays: {},
                penalties: [],
                calculated: {
                    totalOff: 0,
                    totalOvertime: 0,
                    normalDays: 30, // Mặc định 30 ngày
                    actualSalary: employee.baseSalary || 0
                }
            };
            employee.monthlyData.push(monthData);
        }
        
        return monthData;
    }
    
    calculateMonthlyData(employee, monthKey) {
        const monthData = this.getEmployeeMonthlyData(employee, monthKey);
        const baseSalary = employee.baseSalary || 0;
        const dailySalary = Math.round(baseSalary / 30);
        
        // Đếm workdays
        let offDays = 0;
        let overtimeDays = 0;
        
        Object.values(monthData.workdays).forEach(status => {
            if (status === 'off') offDays++;
            if (status === 'overtime') overtimeDays++;
        });
        
        const normalDays = 30 - offDays - overtimeDays;
        
        // Tính lương cơ bản: bình thường + tăng ca x2 - off
        let actualSalary = (normalDays * dailySalary) + (overtimeDays * dailySalary * 2);
        
        // Cộng/trừ penalties
        if (monthData.penalties && Array.isArray(monthData.penalties)) {
            monthData.penalties.forEach(p => {
                if (p.type === 'reward') {
                    actualSalary += p.amount || 0;
                } else if (p.type === 'penalty') {
                    actualSalary -= p.amount || 0;
                }
            });
        }
        
        // Đảm bảo lương không âm
        actualSalary = Math.max(0, actualSalary);
        
        // Cập nhật calculated
        monthData.calculated = {
            totalOff: offDays,
            totalOvertime: overtimeDays,
            normalDays: normalDays,
            actualSalary: actualSalary
        };
        
        return monthData.calculated;
    }
    
    async saveAllEmployees() {
        try {
            if (!this.cache.employees) {
                console.warn('⚠️ No employees data to save');
                return false;
            }
            
            const data = {
                version: '2.0',
                lastUpdated: new Date().toISOString(),
                employees: this.cache.employees
            };
            
            // 1. Save lên GitHub
            const success = await window.githubManager.createOrUpdateFile(
                'employees/main.json',
                data,
                `Cập nhật dữ liệu nhân viên - ${this.cache.employees.length} nhân viên`
            );
            
            if (success) {
                // 2. Update cache timestamp
                this.cache.lastSync = new Date().toISOString();
                this.cache.hasChanges = false;
                
                // 3. Update localStorage
                this.syncWithLocalStorage(this.cache.employees);
                
                // 4. Thông báo data đã update
                window.dataManager.notifyUIUpdate();
                
                console.log('✅ Saved all employees to GitHub');
                return true;
            }
            
            console.error('❌ Failed to save to GitHub');
            return false;
            
        } catch (error) {
            console.error('❌ Error saving employees:', error);
            
            // Fallback: vẫn lưu localStorage
            this.syncWithLocalStorage(this.cache.employees);
            this.cache.hasChanges = true;
            
            window.showToast('Đã lưu cục bộ, chưa đồng bộ GitHub', 'warning');
            return false;
        }
    }
    
    markDataChanged() {
        this.cache.hasChanges = true;
        
        // Tự động save sau 2 giây nếu có thay đổi
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        this.saveTimeout = setTimeout(() => {
            if (this.cache.hasChanges) {
                this.saveAllEmployees();
            }
        }, 2000);
    }
    
    // ========== PUBLIC API METHODS ==========
    
    async getEmployees() {
        return await this.loadEmployees();
    }
    
    async getWorkStats(employee) {
        if (!employee) return { off: 0, overtime: 0, workdays: {} };
        
        const monthData = this.getEmployeeMonthlyData(employee);
        await this.calculateMonthlyData(employee, this.currentMonthKey);
        
        return {
            off: monthData.calculated.totalOff,
            overtime: monthData.calculated.totalOvertime,
            workdays: monthData.workdays
        };
    }
    
    calculateEmployeeSalary(employee) {
        if (!employee) return { actual: 0, base: 0, off: 0, overtime: 0 };
        
        const monthData = this.getEmployeeMonthlyData(employee);
        this.calculateMonthlyData(employee, this.currentMonthKey);
        
        return {
            actual: monthData.calculated.actualSalary,
            base: employee.baseSalary || 0,
            off: monthData.calculated.totalOff,
            overtime: monthData.calculated.totalOvertime,
            normalDays: monthData.calculated.normalDays
        };
    }
    
    async updateWorkDay(employeeId, day, status) {
        try {
            const employees = await this.loadEmployees();
            const employee = employees.find(e => e.id == employeeId);
            
            if (!employee) {
                window.showToast('Không tìm thấy nhân viên', 'error');
                return false;
            }
            
            const monthData = this.getEmployeeMonthlyData(employee);
            
            // Format day (01, 02, ...)
            const dayStr = String(day).padStart(2, '0');
            
            // Cập nhật workday
            monthData.workdays[dayStr] = status;
            
            // Tự động tính toán lại
            this.calculateMonthlyData(employee, this.currentMonthKey);
            
            // Mark data changed
            this.markDataChanged();
            
            // Format ngày để hiển thị
            const [month, year] = this.currentMonth.split('/');
            const dateDisplay = `${day}/${month}/${year}`;
            const statusText = status === 'normal' ? 'Bình thường' : 
                             status === 'overtime' ? 'Tăng ca' : 'OFF';
            
            window.showToast(`Đã cập nhật ${dateDisplay}: ${statusText}`, 'success');
            return true;
            
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
            
            // Thêm penalty với ID
            penaltyData.id = Date.now();
            penaltyData.addedAt = new Date().toISOString();
            
            if (!monthData.penalties) {
                monthData.penalties = [];
            }
            
            monthData.penalties.push(penaltyData);
            
            // Tự động tính toán lại
            this.calculateMonthlyData(employee, this.currentMonthKey);
            
            // Mark data changed
            this.markDataChanged();
            
            const typeText = penaltyData.type === 'reward' ? 'thưởng' : 'phạt';
            window.showToast(`Đã thêm ${typeText} ${penaltyData.amount.toLocaleString()}₫`, 'success');
            return true;
            
        } catch (error) {
            console.error('Error adding penalty:', error);
            window.showToast('Lỗi khi thêm chế tài', 'error');
            return false;
        }
    }
    
    async addEmployee(employeeData) {
        try {
            const employees = await this.loadEmployees();
            
            // Tạo ID mới (tìm ID lớn nhất + 1)
            const maxId = employees.length > 0 ? Math.max(...employees.map(e => e.id || 0)) : 0;
            const newId = maxId + 1;
            
            const newEmployee = {
                id: newId,
                name: employeeData.name || '',
                phone: employeeData.phone || '',
                baseSalary: employeeData.baseSalary || 0,
                position: employeeData.position || 'Nhân viên',
                monthlyData: [],
                createdAt: new Date().toISOString()
            };
            
            employees.push(newEmployee);
            this.cache.employees = employees;
            
            // Mark data changed
            this.markDataChanged();
            
            window.showToast('Đã thêm nhân viên mới', 'success');
            return newEmployee;
            
        } catch (error) {
            console.error('Error adding employee:', error);
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
            
            // Cập nhật thông tin cơ bản
            employees[index] = {
                ...employees[index],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            
            this.cache.employees = employees;
            
            // Mark data changed
            this.markDataChanged();
            
            window.showToast('Đã cập nhật thông tin nhân viên', 'success');
            return true;
            
        } catch (error) {
            console.error('Error updating employee:', error);
            window.showToast('Lỗi khi cập nhật nhân viên', 'error');
            return false;
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
            employees.splice(index, 1);
            this.cache.employees = employees;
            
            // Mark data changed
            this.markDataChanged();
            
            window.showToast(`Đã xóa nhân viên "${employeeName}"`, 'success');
            return true;
            
        } catch (error) {
            console.error('Error deleting employee:', error);
            window.showToast('Lỗi khi xóa nhân viên', 'error');
            return false;
        }
    }
    
    // ========== UI RENDER METHODS ==========
    
    async render() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        const mainContent = document.getElementById('mainContent');
        
        try {
            // Tải dữ liệu nhân viên
            const employees = await this.loadEmployees();
            const totalSalary = await this.calculateTotalSalary(employees);
            const stats = await this.calculateStats(employees);
            
            mainContent.innerHTML = `
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
                        
                        ${employees.map((employee, index) => {
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
                                            Thực lãnh: <strong>${salary.actual.toLocaleString()} ₫</strong>
                                        </div>
                                    </div>
                                    <div class="employee-arrow">
                                        <i class="fas fa-chevron-right"></i>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                        
                        ${employees.length === 0 ? `
                            <div class="empty-state">
                                <i class="fas fa-user-slash"></i>
                                <p>Chưa có nhân viên nào</p>
                                <button class="btn-primary" onclick="window.employeesModule.showAddEmployeeModal()">
                                    <i class="fas fa-plus"></i> THÊM NHÂN VIÊN ĐẦU TIÊN
                                </button>
                            </div>
                        ` : ''}
                    </div>
                    
                    
                </div>
            `;
            
        } catch (error) {
            console.error('Error rendering employees:', error);
            mainContent.innerHTML = `
                <div class="error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Lỗi khi tải dữ liệu nhân viên: ${error.message}</p>
                    <button onclick="window.employeesModule.render()">Thử lại</button>
                </div>
            `;
        } finally {
            this.isLoading = false;
        }
    }
    
    getWorkStatsSync(employee) {
        // Synchronous version for rendering
        if (!employee) return { off: 0, overtime: 0 };
        const monthData = this.getEmployeeMonthlyData(employee);
        return {
            off: monthData.calculated.totalOff || 0,
            overtime: monthData.calculated.totalOvertime || 0
        };
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
        await this.render();
    }
    
    async calculateTotalSalary(employees) {
        let total = 0;
        for (const employee of employees) {
            const salary = this.calculateEmployeeSalary(employee);
            total += salary.actual;
        }
        return total;
    }
    
    async calculateStats(employees) {
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
                    <label>Lương cơ bản/tháng:</label>
                    <div class="input-group">
                        <input type="text" id="employeeSalary" placeholder="8.000.000" 
                               oninput="window.employeesModule.formatCurrency(this)">
                        <span class="currency">₫</span>
                    </div>
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
    
    async addEmployeeFromModal() {
        try {
            const name = document.getElementById('employeeName').value.trim();
            const phone = document.getElementById('employeePhone').value.trim();
            const salary = this.getCurrencyValue('employeeSalary');
            const position = document.getElementById('employeePosition').value.trim() || 'Nhân viên';
            
            // Validation
            if (!name) {
                window.showToast('Vui lòng nhập tên nhân viên', 'warning');
                document.getElementById('employeeName').focus();
                return;
            }
            
            if (salary <= 0) {
                window.showToast('Vui lòng nhập lương cơ bản', 'warning');
                document.getElementById('employeeSalary').focus();
                return;
            }
            
            // Kiểm tra trùng tên
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
                baseSalary: salary,
                position
            });
            
            if (newEmployee) {
                closeModal();
                await this.render();
            }
            
        } catch (error) {
            console.error('Error adding employee:', error);
            window.showToast('Lỗi khi thêm nhân viên', 'error');
        }
    }
    
    async showEmployeeDetail(index) {
        const employees = await this.loadEmployees();
        if (index >= employees.length) return;
        
        this.selectedEmployee = employees[index];
        
        const salary = this.calculateEmployeeSalary(this.selectedEmployee);
        const workStats = await this.getWorkStats(this.selectedEmployee);
        const [month, year] = this.currentMonth.split('/');
        
        // Tạo lịch cho tháng hiện tại
        const daysInMonth = new Date(year, month, 0).getDate();
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
        
        // Lấy penalties của tháng
        const monthData = this.getEmployeeMonthlyData(this.selectedEmployee);
        const penalties = monthData.penalties || [];
        
        const modalContent = `
            <div class="modal-header">
                <h2><i class="fas fa-user"></i> ${this.selectedEmployee.name.toUpperCase()}</h2>
                <div class="employee-phone">
                        <i class="fas fa-phone"></i> ${this.selectedEmployee.phone || 'Chưa có SĐT'}
                    </div>
                <button class="btn-icon danger" onclick="window.employeesModule.deleteCurrentEmployee()">
                        <i class="fas fa-trash"></i>
                    </button>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                        <strong>THỰC LÃNH:</strong>
                        <span>${salary.actual.toLocaleString()} ₫</span>
                    </div>
            <div class="modal-body">
                <div class="calendar-section">
                    <h3>LỊCH LÀM VIỆC THÁNG ${month}</h3>
                    ${calendarHTML}
                    
                    
                </div>
                
                ${penalties.length > 0 ? `
                    <div class="penalties-section">
                        <h4>CHẾ TÀI THÁNG ${month}</h4>
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
                
                <div class="action-buttons">
                    <button class="btn-primary" onclick="window.employeesModule.showPenaltyModal()">
                        <i class="fas fa-balance-scale"></i> CHẾ TÀI
                    </button>
                    <button class="btn-secondary" onclick="window.employeesModule.showEditModal()">
                        <i class="fas fa-edit"></i> SỬA
                    </button>
             
                <button class="btn-outline" onclick="closeModal()">
                    ĐÓNG
                </button>
            </div>
            
                <div class="salary-card">
                    <h3>LƯƠNG THÁNG ${this.currentMonth}</h3>
                    <div class="salary-details">
                        <div><span>Lương cơ bản:</span> <span>${salary.base.toLocaleString()} ₫</span></div>
                        <div><span>Lương ngày:</span> <span>${Math.round(salary.base / 30).toLocaleString()} ₫/ngày</span></div>
                        <div><span>Ngày bình thường:</span> <span>${salary.normalDays} ngày</span></div>
                        <div><span>Ngày OFF:</span> <span>${salary.off} ngày</span></div>
                        <div><span>Ngày tăng ca:</span> <span>${salary.overtime} ngày</span></div>
                        <div><span>Thưởng/Phạt:</span> <span>${this.getPenaltiesTotal(penalties).toLocaleString()} ₫</span></div>
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
                            <div class="option-subtitle">Lương ngày: +${Math.round((this.selectedEmployee.baseSalary || 0) / 30).toLocaleString()} ₫</div>
                        </div>
                    </label>
                    
                    <label class="option-item">
                        <input type="radio" name="workdayType" value="overtime" ${currentStatus === 'overtime' ? 'checked' : ''}>
                        <div class="option-content">
                            <div class="option-title">TĂNG CA (+1 ngày lương)</div>
                            <div class="option-subtitle">Lương ngày: +${(Math.round((this.selectedEmployee.baseSalary || 0) / 30) * 2).toLocaleString()} ₫</div>
                        </div>
                    </label>
                    
                    <label class="option-item">
                        <input type="radio" name="workdayType" value="off" ${currentStatus === 'off' ? 'checked' : ''}>
                        <div class="option-content">
                            <div class="option-title">OFF (-1 ngày lương)</div>
                            <div class="option-subtitle">Lương ngày: -${Math.round((this.selectedEmployee.baseSalary || 0) / 30).toLocaleString()} ₫</div>
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
        return monthData.workdays[dayStr] || 'normal';
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
            // Refresh modal
            const employees = await this.loadEmployees();
            const index = employees.findIndex(e => e.id === this.selectedEmployee.id);
            if (index >= 0) {
                this.selectedEmployee = employees[index];
                this.showEmployeeDetail(index);
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
                        <input type="text" id="penaltyAmount" placeholder="500.000" 
                               oninput="window.employeesModule.formatCurrency(this)">
                        <span class="currency">₫</span>
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
                // Refresh modal
                const employees = await this.loadEmployees();
                const index = employees.findIndex(e => e.id === this.selectedEmployee.id);
                this.showEmployeeDetail(index);
            }
            
        } catch (error) {
            console.error('Error adding penalty:', error);
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
                    <label>Lương cơ bản/tháng:</label>
                    <div class="input-group">
                        <input type="text" id="editEmployeeSalary" value="${this.selectedEmployee.baseSalary}" 
                               oninput="window.employeesModule.formatCurrency(this)">
                        <span class="currency">₫</span>
                    </div>
                </div>
                
                <button class="btn-primary" onclick="window.employeesModule.updateEmployeeFromModal()">
                    <i class="fas fa-save"></i> CẬP NHẬT
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
            const salary = this.getCurrencyValue('editEmployeeSalary');
            
            if (!name) {
                window.showToast('Vui lòng nhập tên nhân viên', 'warning');
                return;
            }
            
            if (salary <= 0) {
                window.showToast('Vui lòng nhập lương cơ bản', 'warning');
                return;
            }
            
            const success = await this.updateEmployee(this.selectedEmployee.id, {
                name,
                phone,
                baseSalary: salary
            });
            
            if (success) {
                closeModal();
                await this.render();
            }
            
        } catch (error) {
            console.error('Error updating employee:', error);
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
    
    toggleWorkCalendar() {
        const section = document.getElementById('calendarSection');
        const toggleIcon = document.getElementById('calendarToggle');
        
        if (section.style.display === 'none') {
            section.style.display = 'block';
            toggleIcon.className = 'fas fa-chevron-up';
            this.renderWorkCalendar();
        } else {
            section.style.display = 'none';
            toggleIcon.className = 'fas fa-chevron-down';
        }
    }
    
    async renderWorkCalendar() {
        const section = document.getElementById('calendarSection');
        if (!section) return;
        
        const employees = await this.loadEmployees();
        const [month, year] = this.currentMonth.split('/');
        const monthKey = `${year}-${month.padStart(2, '0')}`;
        const daysInMonth = new Date(year, month, 0).getDate();
        
        // Tạo header với các ngày
        let calendarHTML = '<div class="calendar-header">';
        calendarHTML += '<div class="calendar-cell employee-name">Nhân viên</div>';
        
        for (let day = 1; day <= daysInMonth; day++) {
            calendarHTML += `<div class="calendar-cell day-header">${day}</div>`;
        }
        calendarHTML += '</div>';
        
        // Tạo hàng cho mỗi nhân viên
        employees.forEach(employee => {
            calendarHTML += '<div class="calendar-row">';
            calendarHTML += `<div class="calendar-cell employee-name">${employee.name}</div>`;
            
            const monthData = this.getEmployeeMonthlyData(employee);
            
            for (let day = 1; day <= daysInMonth; day++) {
                const dayStr = String(day).padStart(2, '0');
                const status = monthData.workdays[dayStr] || 'normal';
                
                calendarHTML += `
                    <div class="calendar-cell day-cell ${status}" 
                         onclick="window.employeesModule.quickUpdateWorkDay('${employee.id}', ${day}, '${status}')">
                        <div class="day-status">${this.getStatusSymbol(status)}</div>
                    </div>
                `;
            }
            
            calendarHTML += '</div>';
        });
        
        section.innerHTML = `
            <div class="work-calendar">
                <h4>LỊCH LÀM VIỆC THÁNG ${month}/${year}</h4>
                
                <div class="calendar-container">
                    ${calendarHTML}
                </div>
                
                <div class="calendar-legend">
                    <div class="legend-item">
                        <span class="legend-color normal"></span>
                        <span>Bình thường</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-color off"></span>
                        <span>OFF</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-color overtime"></span>
                        <span>Tăng ca</span>
                    </div>
                    <div class="legend-item">
                        <small>Click vào ô để thay đổi trạng thái</small>
                    </div>
                </div>
            </div>
        `;
    }
    
    getStatusSymbol(status) {
        switch(status) {
            case 'normal': return '•';
            case 'overtime': return '+';
            case 'off': return 'O';
            default: return '•';
        }
    }
    
    async quickUpdateWorkDay(employeeId, day, currentStatus) {
        const employees = await this.loadEmployees();
        const employee = employees.find(e => e.id == employeeId);
        if (!employee) return;
        
        this.selectedEmployee = employee;
        this.selectWorkDay(day);
    }
    
    // ========== INITIALIZATION ==========
    
    async init() {
        // Tải dữ liệu khi vào trang
        await this.loadEmployees();
        console.log('✅ Employees module initialized');
    }
}

// Khởi tạo module
window.employeesModule = new EmployeesModule();

// Tự động init khi trang load
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => window.employeesModule.init(), 1000);
});