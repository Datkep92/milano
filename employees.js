// employees.js - Hệ thống quản lý nhân viên nâng cao
class EmployeeManager {
    constructor() {
        this.currentMonth = new Date().getMonth() + 1;
        this.currentYear = new Date().getFullYear();
        this.selectedEmployee = null;
        this.attendanceData = {};
        this.initialize();
    }

    async initialize() {
        console.log('👥 Khởi tạo Employee Manager...');
        await this.loadEmployees();
        this.setupEventListeners();
        this.updateMonthlySummary();
        this.displayEmployees();
    }

    setupEventListeners() {
        // Thêm nhân viên
        document.getElementById('addEmployeeBtn')?.addEventListener('click', () => {
            this.openAddEmployeeModal();
        });

        // Chọn tháng
        document.getElementById('employeeMonthSelect')?.addEventListener('change', (e) => {
            const [year, month] = e.target.value.split('-');
            this.currentMonth = parseInt(month);
            this.currentYear = parseInt(year);
            this.updateMonthlySummary();
            this.displayEmployees();
        });

        // Lưu nhân viên
        document.getElementById('saveEmployeeBtn')?.addEventListener('click', () => {
            this.saveEmployee();
        });

        // Xóa nhân viên
        document.addEventListener('click', (e) => {
            if (e.target.closest('.delete-employee-btn')) {
                const employeeId = e.target.closest('.delete-employee-btn').dataset.id;
                this.deleteEmployee(employeeId);
            }
        });

        // Modal đóng
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => {
                this.closeModals();
            });
        });
    }

    async loadEmployees() {
        try {
            const employees = await dataManager.getAllEmployees();
            this.employees = employees;
            console.log(`Đã tải ${employees.length} nhân viên`);
        } catch (error) {
            console.error('Lỗi tải nhân viên:', error);
            this.employees = [];
        }
    }

    // Mở modal thêm nhân viên
    openAddEmployeeModal() {
        const modal = document.getElementById('addEmployeeModal');
        if (modal) {
            modal.style.display = 'block';
            // Reset form
            document.getElementById('employeeName').value = '';
            document.getElementById('employeePhone').value = '';
            document.getElementById('employeeSalary').value = '';
            document.getElementById('employeeId').value = '';
        }
    }

    // Mở modal chỉnh sửa nhân viên
    openEditEmployeeModal(employee) {
        const modal = document.getElementById('addEmployeeModal');
        if (modal) {
            modal.style.display = 'block';
            document.getElementById('employeeName').value = employee.name || '';
            document.getElementById('employeePhone').value = employee.phone || '';
            document.getElementById('employeeSalary').value = employee.baseSalary || '';
            document.getElementById('employeeId').value = employee.id;
        }
    }

    // Mở modal chi tiết nhân viên
    openEmployeeDetailModal(employee) {
        this.selectedEmployee = employee;
        const modal = document.getElementById('employeeDetailModal');
        if (modal) {
            modal.style.display = 'block';
            this.displayEmployeeDetails(employee);
            this.generateCalendar();
        }
    }

    // Mở modal thưởng/phạt
    openRewardModal(employee) {
        this.selectedEmployee = employee;
        const modal = document.getElementById('rewardModal');
        if (modal) {
            modal.style.display = 'block';
            document.getElementById('rewardAmount').value = '';
            document.getElementById('rewardReason').value = '';
            document.getElementById('rewardType').value = 'reward';
            document.getElementById('rewardEmployeeId').value = employee.id;
        }
    }

    // Hiển thị danh sách nhân viên
    displayEmployees() {
        const container = document.getElementById('employeesList');
        if (!container) return;

        if (this.employees.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <p>Chưa có nhân viên nào</p>
                    <button onclick="employeeManager.openAddEmployeeModal()" class="primary-btn">
                        <i class="fas fa-user-plus"></i> Thêm nhân viên đầu tiên
                    </button>
                </div>
            `;
            return;
        }

        let html = '<div class="employees-grid">';
        
        this.employees.forEach(employee => {
            const monthlyData = this.getMonthlyData(employee.id, this.currentMonth, this.currentYear);
            
            html += `
                <div class="employee-card" onclick="employeeManager.openEmployeeDetailModal(${JSON.stringify(employee).replace(/"/g, '&quot;')})">
                    <div class="employee-card-header">
                        <div class="employee-avatar">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="employee-info">
                            <h4>${employee.name}</h4>
                            <p class="employee-phone">${employee.phone || 'Chưa có SĐT'}</p>
                        </div>
                    </div>
                    
                    <div class="employee-stats">
                        <div class="stat-item">
                            <span class="stat-label">Ngày off</span>
                            <span class="stat-value">${monthlyData.offDays || 0}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Tăng ca</span>
                            <span class="stat-value">${monthlyData.overtimeDays || 0}</span>
                        </div>
                    </div>
                    
                    <div class="employee-salary">
                        <span class="salary-label">Lương thực</span>
                        <span class="salary-value">${this.formatCurrency(monthlyData.actualSalary || 0)}</span>
                    </div>
                    
                    <div class="employee-actions">
                        <button class="small-btn secondary edit-employee-btn" onclick="event.stopPropagation(); employeeManager.openEditEmployeeModal(${JSON.stringify(employee).replace(/"/g, '&quot;')})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="small-btn danger delete-employee-btn" data-id="${employee.id}" onclick="event.stopPropagation();">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
    }

    // Hiển thị chi tiết nhân viên
    displayEmployeeDetails(employee) {
        const container = document.getElementById('employeeDetailContent');
        if (!container) return;

        const monthlyData = this.getMonthlyData(employee.id, this.currentMonth, this.currentYear);
        
        container.innerHTML = `
            <div class="employee-detail-header">
                <div class="employee-detail-avatar">
                    <i class="fas fa-user-circle"></i>
                </div>
                <div class="employee-detail-info">
                    <h3>${employee.name}</h3>
                    <p><i class="fas fa-phone"></i> ${employee.phone || 'Chưa có SĐT'}</p>
                    <p><i class="fas fa-money-bill"></i> Lương cơ bản: ${this.formatCurrency(employee.baseSalary || 0)}</p>
                </div>
            </div>
            
            <div class="employee-monthly-summary">
                <div class="summary-card">
                    <div class="summary-icon">
                        <i class="fas fa-calendar-times"></i>
                    </div>
                    <div class="summary-content">
                        <div class="summary-label">Ngày off</div>
                        <div class="summary-value">${monthlyData.offDays || 0}</div>
                    </div>
                </div>
                
                <div class="summary-card">
                    <div class="summary-icon">
                        <i class="fas fa-clock"></i>
                    </div>
                    <div class="summary-content">
                        <div class="summary-label">Tăng ca</div>
                        <div class="summary-value">${monthlyData.overtimeDays || 0}</div>
                    </div>
                </div>
                
                <div class="summary-card">
                    <div class="summary-icon">
                        <i class="fas fa-gift"></i>
                    </div>
                    <div class="summary-content">
                        <div class="summary-label">Thưởng</div>
                        <div class="summary-value positive">${this.formatCurrency(monthlyData.totalRewards || 0)}</div>
                    </div>
                </div>
                
                <div class="summary-card">
                    <div class="summary-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="summary-content">
                        <div class="summary-label">Phạt</div>
                        <div class="summary-value negative">${this.formatCurrency(monthlyData.totalPenalties || 0)}</div>
                    </div>
                </div>
            </div>
            
            <div class="employee-detail-actions">
                <button class="btn primary" onclick="employeeManager.openRewardModal(${JSON.stringify(employee).replace(/"/g, '&quot;')})">
                    <i class="fas fa-award"></i> Thưởng/Phạt
                </button>
                <button class="btn secondary" onclick="employeeManager.openEditEmployeeModal(${JSON.stringify(employee).replace(/"/g, '&quot;')})">
                    <i class="fas fa-edit"></i> Sửa thông tin
                </button>
            </div>
            
            <div class="employee-calendar-section">
                <h4><i class="fas fa-calendar-alt"></i> Lịch tháng ${this.currentMonth}/${this.currentYear}</h4>
                <div id="employeeCalendar" class="employee-calendar">
                    <!-- Calendar will be generated here -->
                </div>
            </div>
            
            <div class="employee-salary-breakdown">
                <h4><i class="fas fa-calculator"></i> Chi tiết lương</h4>
                <div class="breakdown-item">
                    <span>Lương cơ bản</span>
                    <span>${this.formatCurrency(employee.baseSalary || 0)}</span>
                </div>
                <div class="breakdown-item">
                    <span>Khấu trừ ngày off (${monthlyData.offDays || 0} ngày)</span>
                    <span class="negative">-${this.formatCurrency(monthlyData.offDeduction || 0)}</span>
                </div>
                <div class="breakdown-item">
                    <span>Tăng ca (${monthlyData.overtimeDays || 0} ngày)</span>
                    <span class="positive">+${this.formatCurrency(monthlyData.overtimeBonus || 0)}</span>
                </div>
                ${monthlyData.totalRewards > 0 ? `
                    <div class="breakdown-item">
                        <span>Thưởng</span>
                        <span class="positive">+${this.formatCurrency(monthlyData.totalRewards || 0)}</span>
                    </div>
                ` : ''}
                ${monthlyData.totalPenalties > 0 ? `
                    <div class="breakdown-item">
                        <span>Phạt</span>
                        <span class="negative">-${this.formatCurrency(monthlyData.totalPenalties || 0)}</span>
                    </div>
                ` : ''}
                <div class="breakdown-total">
                    <span>Tổng lương thực nhận</span>
                    <span class="total-amount">${this.formatCurrency(monthlyData.actualSalary || 0)}</span>
                </div>
            </div>
        `;
    }

    // Tạo lịch 30 ngày
    generateCalendar() {
        const calendarEl = document.getElementById('employeeCalendar');
        if (!calendarEl || !this.selectedEmployee) return;

        const daysInMonth = new Date(this.currentYear, this.currentMonth, 0).getDate();
        const firstDay = new Date(this.currentYear, this.currentMonth - 1, 1).getDay();
        
        let html = '<div class="calendar-grid">';
        
        // Ngày trong tuần
        const weekDays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        weekDays.forEach(day => {
            html += `<div class="calendar-day-header">${day}</div>`;
        });
        
        // Khoảng trống trước ngày đầu tiên
        for (let i = 0; i < firstDay; i++) {
            html += '<div class="calendar-day empty"></div>';
        }
        
        // Các ngày trong tháng
        for (let day = 1; day <= daysInMonth; day++) {
            const dateKey = `${this.currentYear}-${this.currentMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            const attendance = this.getAttendance(this.selectedEmployee.id, dateKey);
            const className = attendance ? `calendar-day ${attendance}` : 'calendar-day';
            
            html += `
                <div class="${className}" data-date="${dateKey}" onclick="employeeManager.openDayDialog('${dateKey}')">
                    <div class="day-number">${day}</div>
                    <div class="day-status">${this.getStatusIcon(attendance)}</div>
                </div>
            `;
        }
        
        html += '</div>';
        calendarEl.innerHTML = html;
    }

    // Mở dialog chọn trạng thái ngày
    openDayDialog(date) {
        const currentStatus = this.getAttendance(this.selectedEmployee.id, date);
        
        const dialog = document.createElement('div');
        dialog.className = 'day-dialog';
        dialog.innerHTML = `
            <div class="dialog-content">
                <h4>Chọn trạng thái cho ngày ${date}</h4>
                <div class="status-options">
                    <button class="status-btn ${currentStatus === 'normal' ? 'active' : ''}" data-status="normal">
                        <i class="fas fa-check"></i> Bình thường
                    </button>
                    <button class="status-btn ${currentStatus === 'off' ? 'active' : ''}" data-status="off">
                        <i class="fas fa-bed"></i> Off
                    </button>
                    <button class="status-btn ${currentStatus === 'overtime' ? 'active' : ''}" data-status="overtime">
                        <i class="fas fa-clock"></i> Tăng ca
                    </button>
                </div>
                <div class="dialog-actions">
                    <button class="btn secondary" onclick="this.closest('.day-dialog').remove()">Hủy</button>
                    <button class="btn primary" onclick="employeeManager.saveAttendance('${date}')">Lưu</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // Lắng nghe lựa chọn
        dialog.querySelectorAll('.status-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                dialog.querySelectorAll('.status-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedStatus = btn.dataset.status;
            });
        });
        
        this.selectedStatus = currentStatus || 'normal';
    }

    // Lưu trạng thái ngày
    async saveAttendance(date) {
        if (!this.selectedEmployee || !this.selectedStatus) return;
        
        const attendanceKey = `attendance_${this.selectedEmployee.id}_${date}`;
        localStorage.setItem(attendanceKey, this.selectedStatus);
        
        // Đóng dialog
        document.querySelector('.day-dialog')?.remove();
        
        // Cập nhật calendar
        this.generateCalendar();
        
        // Cập nhật thông tin lương
        this.displayEmployeeDetails(this.selectedEmployee);
        
        // Lưu lên GitHub
        await this.saveAttendanceToGitHub(date);
        
        console.log(`Đã lưu trạng thái ${this.selectedStatus} cho ngày ${date}`);
    }

    // Lấy trạng thái điểm danh
    getAttendance(employeeId, date) {
        const key = `attendance_${employeeId}_${date}`;
        return localStorage.getItem(key);
    }

    // employees.js - Cập nhật phần tính lương

getMonthlyData(employeeId, month, year) {
    const daysInMonth = new Date(year, month, 0).getDate();
    let offDays = 0;
    let overtimeDays = 0;
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        const status = this.getAttendance(employeeId, dateKey);
        
        if (status === 'off') offDays++;
        if (status === 'overtime') overtimeDays++;
    }
    
    const employee = this.employees.find(e => e.id === employeeId);
    const baseSalary = employee?.baseSalary || 0;
    
    // CÔNG THỨC MỚI:
    // Lương 1 ngày = Lương cơ bản / 30
    const dailySalary = baseSalary / 30;
    
    // Thưởng/phạt
    const rewardsKey = `rewards_${employeeId}_${year}-${month}`;
    const penaltiesKey = `penalties_${employeeId}_${year}-${month}`;
    const totalRewards = parseFloat(localStorage.getItem(rewardsKey) || 0);
    const totalPenalties = parseFloat(localStorage.getItem(penaltiesKey) || 0);
    
    // Tính khấu trừ và thưởng theo công thức mới
    const offDeduction = offDays * dailySalary;          // Off: -1 ngày lương
    const overtimeBonus = overtimeDays * dailySalary;    // Tăng ca: +1 ngày lương
    
    // Lương thực nhận
    const actualSalary = baseSalary - offDeduction + overtimeBonus + totalRewards - totalPenalties;
    
    return {
        offDays,
        overtimeDays,
        offDeduction,
        overtimeBonus,
        totalRewards,
        totalPenalties,
        dailySalary,      // Thêm để hiển thị
        actualSalary
    };
}

    // Icon trạng thái
    getStatusIcon(status) {
        switch(status) {
            case 'off': return '<i class="fas fa-bed"></i>';
            case 'overtime': return '<i class="fas fa-clock"></i>';
            default: return '<i class="fas fa-check"></i>';
        }
    }

    // Cập nhật tổng quan tháng
    updateMonthlySummary() {
        let totalEmployees = this.employees.length;
        let totalOffDays = 0;
        let totalOvertimeDays = 0;
        let totalSalary = 0;
        
        this.employees.forEach(employee => {
            const monthlyData = this.getMonthlyData(employee.id, this.currentMonth, this.currentYear);
            totalOffDays += monthlyData.offDays;
            totalOvertimeDays += monthlyData.overtimeDays;
            totalSalary += monthlyData.actualSalary;
        });
        
        const summaryEl = document.getElementById('monthlySummary');
        if (summaryEl) {
            summaryEl.innerHTML = `
                <div class="summary-stats">
                    <div class="stat-card">
                        <h3>Tổng nhân viên</h3>
                        <p id="totalEmployees">${totalEmployees}</p>
                    </div>
                    <div class="stat-card">
                        <h3>Tổng ngày off</h3>
                        <p id="totalOffDays">${totalOffDays}</p>
                    </div>
                    <div class="stat-card">
                        <h3>Tổng tăng ca</h3>
                        <p id="totalOvertime">${totalOvertimeDays}</p>
                    </div>
                    <div class="stat-card highlight">
                        <h3>Tổng lương tháng</h3>
                        <p id="totalSalary">${this.formatCurrency(totalSalary)}</p>
                    </div>
                </div>
            `;
        }
    }

    // Lưu nhân viên
    async saveEmployee() {
        const name = document.getElementById('employeeName').value.trim();
        const phone = document.getElementById('employeePhone').value.trim();
        const salary = parseFloat(document.getElementById('employeeSalary').value) || 0;
        const employeeId = document.getElementById('employeeId').value;
        
        if (!name) {
            alert('Vui lòng nhập tên nhân viên');
            return;
        }
        
        const employeeData = {
            name,
            phone,
            baseSalary: salary,
            createdAt: new Date().toISOString()
        };
        
        try {
            let employee;
            if (employeeId) {
                // Cập nhật
                employeeData.id = parseInt(employeeId);
                employee = await dataManager.updateEmployee(employeeData);
            } else {
                // Thêm mới
                employee = await dataManager.saveEmployee(employeeData);
            }
            
            // Cập nhật danh sách
            await this.loadEmployees();
            this.displayEmployees();
            this.updateMonthlySummary();
            
            // Lưu lên GitHub
            await this.saveEmployeeToGitHub(employee);
            
            // Đóng modal
            this.closeModals();
            
            alert(employeeId ? 'Đã cập nhật nhân viên' : 'Đã thêm nhân viên mới');
            
        } catch (error) {
            console.error('Lỗi lưu nhân viên:', error);
            alert('Lỗi: ' + error.message);
        }
    }

    // Xóa nhân viên
    async deleteEmployee(employeeId) {
        if (!confirm('Bạn có chắc chắn muốn xóa nhân viên này?')) {
            return;
        }
        
        try {
            await dataManager.deleteEmployee(employeeId);
            await this.loadEmployees();
            this.displayEmployees();
            this.updateMonthlySummary();
            
            alert('Đã xóa nhân viên');
            
        } catch (error) {
            console.error('Lỗi xóa nhân viên:', error);
            alert('Lỗi: ' + error.message);
        }
    }

    // Lưu thưởng/phạt
    async saveReward() {
        const amount = parseFloat(document.getElementById('rewardAmount').value) || 0;
        const reason = document.getElementById('rewardReason').value.trim();
        const type = document.getElementById('rewardType').value;
        const employeeId = document.getElementById('rewardEmployeeId').value;
        
        if (!amount || !reason) {
            alert('Vui lòng nhập đầy đủ thông tin');
            return;
        }
        
        const rewardData = {
            employeeId: parseInt(employeeId),
            amount: type === 'penalty' ? -Math.abs(amount) : Math.abs(amount),
            reason,
            type,
            date: new Date().toISOString(),
            month: `${this.currentYear}-${this.currentMonth.toString().padStart(2, '0')}`
        };
        
        try {
            // Lưu vào localStorage
            const key = type === 'reward' ? 
                `rewards_${employeeId}_${this.currentYear}-${this.currentMonth}` :
                `penalties_${employeeId}_${this.currentYear}-${this.currentMonth}`;
            
            const currentAmount = parseFloat(localStorage.getItem(key) || 0);
            localStorage.setItem(key, currentAmount + rewardData.amount);
            
            // Lưu lên GitHub
            await this.saveRewardToGitHub(rewardData);
            
            // Cập nhật UI
            if (this.selectedEmployee) {
                this.displayEmployeeDetails(this.selectedEmployee);
            }
            
            // Đóng modal
            this.closeModals();
            
            alert(`Đã ${type === 'reward' ? 'thưởng' : 'phạt'} ${this.formatCurrency(Math.abs(amount))}`);
            
        } catch (error) {
            console.error('Lỗi lưu thưởng/phạt:', error);
            alert('Lỗi: ' + error.message);
        }
    }

    // Lưu lên GitHub
    async saveEmployeeToGitHub(employee) {
        if (!githubManager.initialized) return;
        
        try {
            const fileName = `employees/employee-${employee.id}-${new Date().toISOString().split('T')[0]}.json`;
            const content = JSON.stringify({
                type: 'employee',
                action: employee.id ? 'update' : 'create',
                data: employee,
                timestamp: new Date().toISOString()
            }, null, 2);
            
            await githubManager.saveFile(fileName, content, null, `${employee.id ? 'Cập nhật' : 'Thêm'} nhân viên: ${employee.name}`);
            console.log('✅ Đã lưu nhân viên lên GitHub');
            
        } catch (error) {
            console.error('Lỗi lưu nhân viên lên GitHub:', error);
        }
    }

    async saveAttendanceToGitHub(date) {
        if (!githubManager.initialized || !this.selectedEmployee) return;
        
        try {
            const attendanceData = {
                employeeId: this.selectedEmployee.id,
                employeeName: this.selectedEmployee.name,
                date: date,
                status: this.selectedStatus,
                timestamp: new Date().toISOString()
            };
            
            const fileName = `attendance/${date}/employee-${this.selectedEmployee.id}.json`;
            const content = JSON.stringify(attendanceData, null, 2);
            
            await githubManager.saveFile(fileName, content, null, `Điểm danh: ${this.selectedEmployee.name} - ${date}`);
            console.log('✅ Đã lưu điểm danh lên GitHub');
            
        } catch (error) {
            console.error('Lỗi lưu điểm danh lên GitHub:', error);
        }
    }

    async saveRewardToGitHub(rewardData) {
        if (!githubManager.initialized) return;
        
        try {
            const fileName = `rewards/${rewardData.month}/employee-${rewardData.employeeId}-${Date.now()}.json`;
            const content = JSON.stringify(rewardData, null, 2);
            
            await githubManager.saveFile(fileName, content, null, 
                `${rewardData.type === 'reward' ? 'Thưởng' : 'Phạt'} nhân viên ID: ${rewardData.employeeId}`);
            console.log('✅ Đã lưu thưởng/phạt lên GitHub');
            
        } catch (error) {
            console.error('Lỗi lưu thưởng/phạt lên GitHub:', error);
        }
    }

    // Đóng tất cả modal
    closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }

    // Định dạng tiền
    formatCurrency(amount) {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    }
}

// Thêm method mới vào DataManager
DataManager.prototype.updateEmployee = async function(employeeData) {
    return new Promise((resolve, reject) => {
        if (!this.db) {
            reject(new Error('Database chưa được khởi tạo'));
            return;
        }
        
        const transaction = this.db.transaction(['employees'], 'readwrite');
        const store = transaction.objectStore('employees');
        
        const request = store.put(employeeData);
        
        request.onsuccess = () => {
            resolve(employeeData);
        };
        
        request.onerror = (event) => {
            reject(new Error('Lỗi cập nhật nhân viên: ' + event.target.error));
        };
    });
};

DataManager.prototype.deleteEmployee = async function(employeeId) {
    return new Promise((resolve, reject) => {
        if (!this.db) {
            reject(new Error('Database chưa được khởi tạo'));
            return;
        }
        
        const transaction = this.db.transaction(['employees'], 'readwrite');
        const store = transaction.objectStore('employees');
        
        const request = store.delete(parseInt(employeeId));
        
        request.onsuccess = () => {
            resolve(true);
        };
        
        request.onerror = (event) => {
            reject(new Error('Lỗi xóa nhân viên: ' + event.target.error));
        };
    });
};

// Khởi tạo Employee Manager toàn cục
let employeeManager = null;

// Khởi tạo khi tab được mở
function initEmployeeManager() {
    if (!employeeManager) {
        employeeManager = new EmployeeManager();
    }
    return employeeManager;
}

// Tự động khởi tạo khi DOM sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('employeesTab')) {
        setTimeout(() => {
            employeeManager = new EmployeeManager();
        }, 500);
    }
});