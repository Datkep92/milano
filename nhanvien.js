// ==================== OPERATIONAL MANAGEMENT SYSTEM ====================

// Global variables
let currentEmployees = [];
let currentEditingEmployee = null;


// ==================== CHU KỲ VẬN HÀNH 20/N → 19/N+1 ====================
function getOperationalMonth(date) {
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
            prevYear -= 1;
        }
        return `${String(prevMonth).padStart(2, '0')}/${prevYear}`;
    }
}

let currentMonth = getOperationalMonth(new Date());
console.log('Tháng vận hành hiện tại (Nhân viên):', currentMonth);

// ==================== INITIALIZATION ====================
function initializeOperationalTab() {
    console.log('Initializing operational management system...');
    currentMonth = getOperationalMonth(new Date());

    setupMonthSelector();
    loadEmployees();
    setupOperationalEventListeners();
}

function setupMonthSelector() {
    const monthSelector = document.getElementById('nhanvienMonthSelector');
    if (!monthSelector) return;

    const months = [];
    const today = new Date();

    for (let i = 0; i < 12; i++) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const opMonth = getOperationalMonth(date);
        if (!months.includes(opMonth)) months.push(opMonth);
    }

    months.sort().reverse();

    monthSelector.innerHTML = months.map(m => 
        `<option value="${m}" ${m === currentMonth ? 'selected' : ''}>Tháng vận hành ${m}</option>`
    ).join('');

    monthSelector.onchange = function() {
        currentMonth = this.value;
        loadEmployees();
    };
}

function setupOperationalEventListeners() {
    // Chỉ giữ lại search, không cần gắn lại onchange cho month selector
    const searchInput = document.getElementById('employeeSearch');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(function() {
            filterEmployees(this.value);
        }, 300));
    }
}



// Biến chính thức dùng cho toàn tab Nhân viên
console.log('Tháng vận hành hiện tại (Nhân viên):', currentMonth);




async function loadEmployeeBonuses(employeeId, month) {
    try {
        const snapshot = await db.collection('bonuses_penalties')
            .where('employeeId', '==', employeeId)
            .where('month', '==', month)
            .where('type', '==', 'bonus')
            .get();
            
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error loading bonuses:', error);
        return [];
    }
}

async function loadEmployeePenalties(employeeId, month) {
    try {
        const snapshot = await db.collection('bonuses_penalties')
            .where('employeeId', '==', employeeId)
            .where('month', '==', month)
            .where('type', '==', 'penalty')
            .get();
            
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error loading penalties:', error);
        return [];
    }
}

function calculateEmployeeSalary(employee) {
    const dailySalary = Number(employee.monthlySalary) / 30;
    
    // Count off days and overtime days - sửa lỗi ở đây
    const days = employee.attendance?.days || {};
    const offDays = Object.values(days).filter(day => day === 'off').length;
    const overtimeDays = Object.values(days).filter(day => day === 'overtime').length;
    
    // Calculate bonuses and penalties
    const totalBonus = (employee.bonuses || []).reduce((sum, bonus) => sum + Number(bonus.amount || 0), 0);
    const totalPenalty = (employee.penalties || []).reduce((sum, penalty) => sum + Number(penalty.amount || 0), 0);
    
    return Number(employee.monthlySalary) 
           - (offDays * dailySalary) 
           + (overtimeDays * dailySalary)
           + totalBonus
           - totalPenalty;
}

async function setDayStatus(employeeId, dateKey, status) {
    try {
        console.log('Setting day status:', { employeeId, dateKey, status, currentMonth });
        
        const attendanceDocRef = db.collection('attendance')
            .doc(`${employeeId}_${currentMonth.replace('/', '_')}`);
        
        let updateData = {
            month: currentMonth,
            employeeId: employeeId,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Sửa: Lưu đúng định dạng "days.XX" thay vì object lồng
        if (status === 'normal') {
            // Xóa field
            updateData[`days.${dateKey}`] = firebase.firestore.FieldValue.delete();
        } else {
            // Set giá trị trực tiếp
            updateData[`days.${dateKey}`] = status;
        }
        
        console.log('Update data:', updateData);
        
        await attendanceDocRef.set(updateData, { merge: true });
        
        showToast(`Đã cập nhật ngày ${dateKey}`, 'success');
        
        // Đóng tất cả modal
        closeModal('daySelectionModal');
        closeModal('dayRemovalModal');
        closeModal('attendanceModal');
        
        // Reload data
        console.log('Reloading employees data...');
        await loadEmployees();
        
    } catch (error) {
        console.error('Error setting day status:', error);
        showToast('Lỗi khi cập nhật ngày', 'error');
    }
}
// ==================== EMPLOYEE MANAGEMENT ====================

async function loadEmployees() {
    try {
        console.log('Loading employees for month:', currentMonth);
        
        const snapshot = await db.collection('employees')
            .where('status', '==', 'active')
            .get();
            
        currentEmployees = [];
        
        if (snapshot.empty) {
            console.log('No employees found');
            displayEmployees();
            updateOperationalSummary();
            return;
        }
        
        for (const doc of snapshot.docs) {
            const employee = {
                id: doc.id,
                ...doc.data()
            };
            
            // Load attendance and bonuses for this month
            const [attendance, bonuses, penalties] = await Promise.all([
                loadEmployeeAttendance(employee.id, currentMonth),
                loadEmployeeBonuses(employee.id, currentMonth),
                loadEmployeePenalties(employee.id, currentMonth)
            ]);
            
            employee.attendance = attendance || { days: {}, month: currentMonth };
            employee.bonuses = bonuses || [];
            employee.penalties = penalties || [];
            employee.calculatedSalary = calculateEmployeeSalary(employee);
            
            currentEmployees.push(employee);
        }
        
        console.log('Employees loaded:', currentEmployees.length);
        displayEmployees();
        updateOperationalSummary();
        
    } catch (error) {
        console.error('Error in loadEmployees:', error);
        showToast('Lỗi khi tải danh sách nhân viên', 'error');
    }
}

async function loadEmployeeAttendance(employeeId, month) {
    try {
        const doc = await db.collection('attendance')
            .doc(`${employeeId}_${month.replace('/', '_')}`)
            .get();
            
        if (doc.exists) {
            const data = doc.data();
            console.log('Attendance data loaded:', data);
            
            // Chuyển đổi dữ liệu từ Firebase format sang object lồng nhau
            const processedData = {
                month: data.month || month,
                employeeId: data.employeeId,
                days: {}
            };
            
            // Xử lý các field có dạng "days.XX"
            Object.keys(data).forEach(key => {
                if (key.startsWith('days.')) {
                    const dayNumber = key.replace('days.', '');
                    processedData.days[dayNumber] = data[key];
                } else if (key !== 'month' && key !== 'employeeId' && key !== 'updatedAt') {
                    processedData.days[key] = data[key];
                }
            });
            
            console.log('Processed attendance data:', processedData);
            return processedData;
        } else {
            console.log('No attendance data found, returning default');
            return { days: {}, month: month };
        }
    } catch (error) {
        console.error('Error loading attendance:', error);
        return { days: {}, month: month };
    }
}

// ==================== DISPLAY FUNCTIONS ====================

function displayEmployees() {
    const container = document.getElementById('employeesList');
    if (!container) {
        console.error('Employees list container not found');
        return;
    }
    
    if (!currentEmployees || currentEmployees.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                👥 Chưa có nhân viên nào
                <br><small>Click "Thêm NV" để bắt đầu</small>
            </div>
        `;
        return;
    }
    
    try {
        container.innerHTML = currentEmployees.map(employee => {
            // Sửa lỗi: đảm bảo attendance.days tồn tại
            const days = employee.attendance?.days || {};
            const offDays = Object.values(days).filter(day => day === 'off').length;
            const overtimeDays = Object.values(days).filter(day => day === 'overtime').length;
            const totalBonus = (employee.bonuses || []).reduce((sum, bonus) => sum + Number(bonus.amount || 0), 0);
            const totalPenalty = (employee.penalties || []).reduce((sum, penalty) => sum + Number(penalty.amount || 0), 0);
            
            console.log(`Employee ${employee.name}: offDays=${offDays}, overtimeDays=${overtimeDays}`);
            
            return `
                <div class="employee-card" data-employee-id="${employee.id}">
                    <div class="employee-header">
                        <h3>👤 ${employee.name || 'Chưa có tên'}</h3>
                        <div class="employee-salary">${formatCurrency(employee.monthlySalary || 0)}/tháng</div>
                    </div>
                    
                    <div class="employee-details">
                        <div class="detail-item">
                            <span class="label">📅 Off:</span>
                            <span class="value">${offDays} ngày</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">⏰ Tăng ca:</span>
                            <span class="value">${overtimeDays} ngày</span>
                        </div>
                        ${totalBonus > 0 ? `
                        <div class="detail-item bonus">
                            <span class="label">🎁 Thưởng:</span>
                            <span class="value">+${formatCurrency(totalBonus)}</span>
                        </div>
                        ` : ''}
                        ${totalPenalty > 0 ? `
                        <div class="detail-item penalty">
                            <span class="label">⚠️ Phạt:</span>
                            <span class="value">-${formatCurrency(totalPenalty)}</span>
                        </div>
                        ` : ''}
                    </div>
                    
                    <div class="employee-final-salary">
                        🎯 Thực lãnh: <strong>${formatCurrency(employee.calculatedSalary || 0)}</strong>
                    </div>
                    
                    <div class="employee-actions">
                        <button onclick="showAttendanceCalendar('${employee.id}')" class="btn-calendar">📅 Chọn ngày</button>
                        <button onclick="showBonusPenaltyForm('${employee.id}')" class="btn-bonus">💰 Thưởng/Phạt</button>
                        <button onclick="showEditEmployeeForm('${employee.id}')" class="btn-edit">✏️ Sửa</button>
                        <button onclick="showEmployeeHistory('${employee.id}')" class="btn-history">📋 Lịch sử</button>
                    </div>
                </div>
            `;
        }).join('');
        
        console.log('Employees displayed successfully');
        
    } catch (error) {
        console.error('Error displaying employees:', error);
        container.innerHTML = `
            <div class="empty-state">
                ❌ Lỗi khi hiển thị nhân viên
                <br><small>${error.message}</small>
            </div>
        `;
    }
}

function updateOperationalSummary() {
    const summaryElement = document.getElementById('nhanvienSummary'); // Đổi ID
    if (!summaryElement) return;
    
    const totalEmployees = currentEmployees.length;
    const totalBaseSalary = currentEmployees.reduce((sum, emp) => sum + Number(emp.monthlySalary || 0), 0);
    const totalFinalSalary = currentEmployees.reduce((sum, emp) => sum + Number(emp.calculatedSalary || 0), 0);
    
    const totalOffDays = currentEmployees.reduce((sum, emp) => {
        const days = emp.attendance?.days || {};
        return sum + Object.values(days).filter(day => day === 'off').length;
    }, 0);
    
    const totalOvertimeDays = currentEmployees.reduce((sum, emp) => {
        const days = emp.attendance?.days || {};
        return sum + Object.values(days).filter(day => day === 'overtime').length;
    }, 0);
    
    const totalBonus = currentEmployees.reduce((sum, emp) => 
        sum + (emp.bonuses || []).reduce((bonusSum, bonus) => bonusSum + Number(bonus.amount || 0), 0), 0
    );
    
    const totalPenalty = currentEmployees.reduce((sum, emp) => 
        sum + (emp.penalties || []).reduce((penaltySum, penalty) => penaltySum + Number(penalty.amount || 0), 0), 0
    );
    
    summaryElement.innerHTML = `
        <div class="summary-grid">
            <div class="summary-item">
                <div class="summary-value">${totalEmployees}</div>
                <div class="summary-label">👥 Nhân viên</div>
            </div>
            <div class="summary-item">
                <div class="summary-value">${formatCurrency(totalBaseSalary)}</div>
                <div class="summary-label">💰 Lương cơ bản</div>
            </div>
            <div class="summary-item">
                <div class="summary-value">${totalOffDays}</div>
                <div class="summary-label">📅 Ngày off</div>
            </div>
            <div class="summary-item">
                <div class="summary-value">${totalOvertimeDays}</div>
                <div class="summary-label">⏰ Tăng ca</div>
            </div>
            <div class="summary-item bonus">
                <div class="summary-value">+${formatCurrency(totalBonus)}</div>
                <div class="summary-label">🎁 Thưởng</div>
            </div>
            <div class="summary-item penalty">
                <div class="summary-value">-${formatCurrency(totalPenalty)}</div>
                <div class="summary-label">⚠️ Phạt</div>
            </div>
            <div class="summary-item total">
                <div class="summary-value">${formatCurrency(totalFinalSalary)}</div>
                <div class="summary-label">🎯 Tổng thực lãnh</div>
            </div>
        </div>
    `;
}

// ==================== UTILITY FUNCTIONS ====================

function filterEmployees(searchTerm) {
    if (!searchTerm) {
        displayEmployees();
        return;
    }
    
    const filtered = currentEmployees.filter(employee => 
        employee.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    const container = document.getElementById('employeesList');
    if (!container) return;
    
    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state">Không tìm thấy nhân viên</div>';
        return;
    }
    
    // Reuse display logic with filtered array
    const tempEmployees = currentEmployees;
    currentEmployees = filtered;
    displayEmployees();
    currentEmployees = tempEmployees;
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.remove();
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ==================== EXPORT FUNCTIONS ====================

function exportSalaryReport() {
    if (!currentEmployees || currentEmployees.length === 0) {
        showToast('Không có dữ liệu để xuất', 'error');
        return;
    }
    
    try {
        const data = currentEmployees.map(employee => {
            const days = employee.attendance?.days || {};
            const offDays = Object.values(days).filter(day => day === 'off').length;
            const overtimeDays = Object.values(days).filter(day => day === 'overtime').length;
            const totalBonus = (employee.bonuses || []).reduce((sum, bonus) => sum + Number(bonus.amount || 0), 0);
            const totalPenalty = (employee.penalties || []).reduce((sum, penalty) => sum + Number(penalty.amount || 0), 0);
            
            return {
                'Tên NV': employee.name || '',
                'Lương tháng': employee.monthlySalary || 0,
                'Ngày off': offDays,
                'Tăng ca': overtimeDays,
                'Thưởng': totalBonus,
                'Phạt': totalPenalty,
                'Thực lãnh': employee.calculatedSalary || 0
            };
        });
        
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        
        XLSX.utils.book_append_sheet(wb, ws, 'BaoCaoLuong');
        
        const fileName = `Bao_Cao_Luong_${currentMonth.replace('/', '_')}.xlsx`;
        XLSX.writeFile(wb, fileName);
        
        showToast(`Đã xuất file ${fileName}`, 'success');
        
    } catch (error) {
        console.error('Error exporting report:', error);
        showToast('Lỗi khi xuất file', 'error');
    }
}

// ==================== FORMAT CURRENCY ====================

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}
// ==================== EMPLOYEE CRUD OPERATIONS ====================

function showAddEmployeeForm() {
    const formHTML = `
        <div class="modal-overlay active" id="addEmployeeModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>✨ Thêm Nhân Viên Mới</h3>
                    <button class="modal-close" onclick="closeModal('addEmployeeModal')">×</button>
                </div>
                <div class="modal-body">
                    <form id="addEmployeeForm" onsubmit="saveNewEmployee(event)">
                        <div class="form-group">
                            <label for="newEmployeeName">Tên nhân viên:</label>
                            <input type="text" id="newEmployeeName" required placeholder="Nhập tên nhân viên">
                        </div>
                        <div class="form-group">
                            <label for="newEmployeeSalary">Lương tháng:</label>
                            <input type="number" id="newEmployeeSalary" required placeholder="3,000,000" min="0">
                        </div>
                        <div class="form-group">
                            <label for="newEmployeeNote">Ghi chú (tuỳ chọn):</label>
                            <textarea id="newEmployeeNote" placeholder="Vị trí, công việc..."></textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn-cancel" onclick="closeModal('addEmployeeModal')">❌ Hủy</button>
                    <button type="submit" form="addEmployeeForm" class="btn-confirm">💾 Lưu</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', formHTML);
}

async function saveNewEmployee(event) {
    event.preventDefault();
    
    const name = document.getElementById('newEmployeeName').value.trim();
    const salary = parseInt(document.getElementById('newEmployeeSalary').value) || 0;
    const note = document.getElementById('newEmployeeNote').value.trim();
    
    if (!name || salary <= 0) {
        showToast('Vui lòng nhập đầy đủ thông tin', 'error');
        return;
    }
    
    try {
        const employeeData = {
            name: name,
            monthlySalary: salary,
            note: note || '',
            status: 'active',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('employees').add(employeeData);
        
        showToast(`Đã thêm nhân viên ${name} thành công`, 'success');
        closeModal('addEmployeeModal');
        loadEmployees();
        
    } catch (error) {
        console.error('Error saving new employee:', error);
        showToast('Lỗi khi thêm nhân viên', 'error');
    }
}

function showEditEmployeeForm(employeeId) {
    const employee = currentEmployees.find(emp => emp.id === employeeId);
    if (!employee) {
        showToast('Không tìm thấy nhân viên', 'error');
        return;
    }
    
    currentEditingEmployee = employee;
    
    const formHTML = `
        <div class="modal-overlay active" id="editEmployeeModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>✏️ Chỉnh Sửa Nhân Viên</h3>
                    <button class="modal-close" onclick="closeEditEmployeeModal()">×</button>
                </div>
                <div class="modal-body">
                    <form id="editEmployeeForm" onsubmit="saveEmployeeEdit(event)">
                        <div class="form-group">
                            <label for="editEmployeeName">Tên nhân viên:</label>
                            <input type="text" id="editEmployeeName" value="${employee.name || ''}" required>
                        </div>
                        <div class="form-group">
                            <label for="editEmployeeSalary">Lương tháng:</label>
                            <input type="number" id="editEmployeeSalary" value="${employee.monthlySalary || 0}" required min="0">
                        </div>
                        <div class="form-group">
                            <label for="editEmployeeNote">Ghi chú:</label>
                            <textarea id="editEmployeeNote">${employee.note || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Trạng thái:</label>
                            <div class="radio-group">
                                <label>
                                    <input type="radio" name="employeeStatus" value="active" ${employee.status === 'active' ? 'checked' : ''}>
                                    <span>● Đang làm việc</span>
                                </label>
                                <label>
                                    <input type="radio" name="employeeStatus" value="inactive" ${employee.status === 'inactive' ? 'checked' : ''}>
                                    <span>○ Nghỉ việc</span>
                                </label>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn-danger" onclick="deleteEmployee('${employee.id}')">🗑️ Xóa</button>
                    <button type="button" class="btn-cancel" onclick="closeEditEmployeeModal()">❌ Hủy</button>
                    <button type="submit" form="editEmployeeForm" class="btn-confirm">💾 Lưu</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', formHTML);
}

async function saveEmployeeEdit(event) {
    event.preventDefault();
    
    if (!currentEditingEmployee) return;
    
    const name = document.getElementById('editEmployeeName').value.trim();
    const salary = parseInt(document.getElementById('editEmployeeSalary').value) || 0;
    const note = document.getElementById('editEmployeeNote').value.trim();
    const status = document.querySelector('input[name="employeeStatus"]:checked').value;
    
    if (!name || salary <= 0) {
        showToast('Vui lòng nhập đầy đủ thông tin', 'error');
        return;
    }
    
    try {
        const updateData = {
            name: name,
            monthlySalary: salary,
            note: note,
            status: status,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('employees').doc(currentEditingEmployee.id).update(updateData);
        
        showToast(`Đã cập nhật thông tin ${name}`, 'success');
        closeEditEmployeeModal();
        loadEmployees();
        
    } catch (error) {
        console.error('Error saving employee edit:', error);
        showToast('Lỗi khi cập nhật thông tin', 'error');
    }
}

function closeEditEmployeeModal() {
    currentEditingEmployee = null;
    closeModal('editEmployeeModal');
}

async function deleteEmployee(employeeId) {
    if (!confirm('Bạn có chắc muốn xóa nhân viên này? Dữ liệu lịch sử sẽ được giữ lại.')) {
        return;
    }
    
    try {
        await db.collection('employees').doc(employeeId).update({
            status: 'inactive',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showToast('Đã chuyển nhân viên sang trạng thái nghỉ việc', 'success');
        closeEditEmployeeModal();
        loadEmployees();
        
    } catch (error) {
        console.error('Error deleting employee:', error);
        showToast('Lỗi khi xóa nhân viên', 'error');
    }
}

// ==================== ATTENDANCE MANAGEMENT ====================

function showAttendanceCalendar(employeeId) {
    const employee = currentEmployees.find(emp => emp.id === employeeId);
    if (!employee) {
        showToast('Không tìm thấy nhân viên', 'error');
        return;
    }
    
    const calendarHTML = generateAttendanceCalendar(employee);
    
    const modalHTML = `
        <div class="modal-overlay active" id="attendanceModal">
            <div class="modal-content large">
                <div class="modal-header">
                    <h3>📅 Chọn Ngày - ${employee.name}</h3>
                    <button class="modal-close" onclick="closeModal('attendanceModal')">×</button>
                </div>
                <div class="modal-body">
                    <div class="calendar-header">
                        <h4>Tháng ${currentMonth}</h4>
                        <div class="calendar-legend">
                            <span class="legend-item"><span class="day-normal">Số</span> = Ngày thường</span>
                            <span class="legend-item"><span class="day-off">❌</span> = Off</span>
                            <span class="legend-item"><span class="day-overtime">⭐</span> = Tăng ca</span>
                        </div>
                    </div>
                    ${calendarHTML}
                    <div class="attendance-summary" id="attendanceSummary">
                        ${generateAttendanceSummary(employee)}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-cancel" onclick="closeModal('attendanceModal')">❌ Đóng</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function generateAttendanceCalendar(employee) {
    const [month, year] = currentMonth.split('/').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    
    let calendarHTML = '<div class="calendar-grid">';
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = String(day).padStart(2, '0');
        const currentStatus = employee.attendance?.days?.[dateKey] || 'normal';
        
        let dayClass = 'day-normal';
        let daySymbol = day;
        
        if (currentStatus === 'off') {
            dayClass = 'day-off';
            daySymbol = '❌';
        } else if (currentStatus === 'overtime') {
            dayClass = 'day-overtime';
            daySymbol = '⭐';
        }
        
        calendarHTML += `
            <div class="calendar-day ${dayClass}" 
                 onclick="handleDayClick('${employee.id}', '${dateKey}', '${currentStatus}')">
                ${daySymbol}
            </div>
        `;
    }
    
    calendarHTML += '</div>';
    return calendarHTML;
}

function generateAttendanceSummary(employee) {
    const days = employee.attendance?.days || {};
    const offDays = Object.values(days).filter(day => day === 'off').length;
    const overtimeDays = Object.values(days).filter(day => day === 'overtime').length;
    const dailySalary = Number(employee.monthlySalary || 0) / 30;
    
    const offDeduction = offDays * dailySalary;
    const overtimeBonus = overtimeDays * dailySalary;
    
    return `
        <div class="summary-grid">
            <div class="summary-item">
                <span class="label">📅 Ngày off:</span>
                <span class="value">${offDays} ngày</span>
            </div>
            <div class="summary-item">
                <span class="label">⏰ Tăng ca:</span>
                <span class="value">${overtimeDays} ngày</span>
            </div>
            <div class="summary-item">
                <span class="label">💰 Trừ off:</span>
                <span class="value">-${formatCurrency(offDeduction)}</span>
            </div>
            <div class="summary-item">
                <span class="label">💰 Cộng TC:</span>
                <span class="value">+${formatCurrency(overtimeBonus)}</span>
            </div>
            <div class="summary-item total">
                <span class="label">🎯 Thực lãnh:</span>
                <span class="value">${formatCurrency(employee.calculatedSalary || 0)}</span>
            </div>
        </div>
    `;
}

function handleDayClick(employeeId, dateKey, currentStatus) {
    if (currentStatus === 'normal') {
        showDaySelectionModal(employeeId, dateKey);
    } else {
        showDayRemovalModal(employeeId, dateKey, currentStatus);
    }
}

function showDaySelectionModal(employeeId, dateKey) {
    const employee = currentEmployees.find(emp => emp.id === employeeId);
    if (!employee) return;
    
    const dailySalary = Number(employee.monthlySalary || 0) / 30;
    const currentSalary = Number(employee.calculatedSalary || 0);
    
    const modalHTML = `
        <div class="modal-overlay active" id="daySelectionModal">
            <div class="modal-content small">
                <div class="modal-header">
                    <h3>✅ Chọn Ngày ${dateKey}/${currentMonth}</h3>
                    <button class="modal-close" onclick="closeModal('daySelectionModal')">×</button>
                </div>
                <div class="modal-body">
                    <p>Chọn loại cho ngày ${dateKey}/${currentMonth}:</p>
                    <div class="selection-options">
                        <button class="btn-off" onclick="setDayStatus('${employeeId}', '${dateKey}', 'off')">
                            🔴 OFF - Trừ ${formatCurrency(dailySalary)}
                        </button>
                        <button class="btn-overtime" onclick="setDayStatus('${employeeId}', '${dateKey}', 'overtime')">
                            🟢 TĂNG CA + Cộng ${formatCurrency(dailySalary)}
                        </button>
                        <button class="btn-cancel" onclick="closeModal('daySelectionModal')">
                            ❌ Hủy
                        </button>
                    </div>
                    <div class="salary-preview">
                        Thực lãnh: ${formatCurrency(currentSalary)} → 
                        <span id="salaryPreview">${formatCurrency(currentSalary)}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function showDayRemovalModal(employeeId, dateKey, currentStatus) {
    const employee = currentEmployees.find(emp => emp.id === employeeId);
    if (!employee) return;
    
    const dailySalary = Number(employee.monthlySalary || 0) / 30;
    const currentSalary = Number(employee.calculatedSalary || 0);
    const newSalary = currentStatus === 'off' ? currentSalary + dailySalary : currentSalary - dailySalary;
    
    const modalHTML = `
        <div class="modal-overlay active" id="dayRemovalModal">
            <div class="modal-content small">
                <div class="modal-header">
                    <h3>${currentStatus === 'off' ? '🔴' : '🟢'} Xác Nhận</h3>
                    <button class="modal-close" onclick="closeModal('dayRemovalModal')">×</button>
                </div>
                <div class="modal-body">
                    <p>Bỏ ${currentStatus === 'off' ? 'ngày off' : 'tăng ca'} ngày ${dateKey}/${currentMonth}?</p>
                    <div class="selection-options">
                        <button class="btn-confirm" onclick="setDayStatus('${employeeId}', '${dateKey}', 'normal')">
                            ✅ Xác nhận
                        </button>
                        <button class="btn-cancel" onclick="closeModal('dayRemovalModal')">
                            ❌ Giữ nguyên
                        </button>
                    </div>
                    <div class="salary-preview">
                        Thực lãnh: ${formatCurrency(currentSalary)} → ${formatCurrency(newSalary)}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}



// ==================== BONUS & PENALTY MANAGEMENT ====================

function showBonusPenaltyForm(employeeId) {
    const employee = currentEmployees.find(emp => emp.id === employeeId);
    if (!employee) {
        showToast('Không tìm thấy nhân viên', 'error');
        return;
    }
    
    const formHTML = `
        <div class="modal-overlay active" id="bonusPenaltyModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>💰 Thưởng & Phạt - ${employee.name}</h3>
                    <button class="modal-close" onclick="closeModal('bonusPenaltyModal')">×</button>
                </div>
                <div class="modal-body">
                    <form id="bonusPenaltyForm" onsubmit="saveBonusPenalty(event, '${employee.id}')">
                        <div class="form-group">
                            <label>Loại:</label>
                            <div class="radio-group">
                                <label>
                                    <input type="radio" name="bpType" value="bonus" checked>
                                    <span>🎁 Thưởng (+)</span>
                                </label>
                                <label>
                                    <input type="radio" name="bpType" value="penalty">
                                    <span>⚠️ Phạt (-)</span>
                                </label>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="bpAmount">Số tiền:</label>
                            <input type="number" id="bpAmount" required placeholder="500,000" min="0">
                        </div>
                        <div class="form-group">
                            <label for="bpReason">Nội dung lý do:</label>
                            <textarea id="bpReason" required placeholder="Nhập lý do thưởng/phạt..."></textarea>
                        </div>
                        <div class="form-group">
                            <label for="bpDate">Ngày áp dụng:</label>
                            <input type="date" id="bpDate" required value="${new Date().toISOString().split('T')[0]}">
                        </div>
                    </form>
                    <div class="salary-preview">
                        Thực lãnh hiện tại: ${formatCurrency(employee.calculatedSalary || 0)}
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn-cancel" onclick="closeModal('bonusPenaltyModal')">❌ Hủy</button>
                    <button type="submit" form="bonusPenaltyForm" class="btn-confirm">💾 Lưu</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', formHTML);
}

async function saveBonusPenalty(event, employeeId) {
    event.preventDefault();
    
    const type = document.querySelector('input[name="bpType"]:checked').value;
    const amount = parseInt(document.getElementById('bpAmount').value) || 0;
    const reason = document.getElementById('bpReason').value.trim();
    const date = document.getElementById('bpDate').value;
    
    if (!reason || amount <= 0) {
        showToast('Vui lòng nhập đầy đủ thông tin', 'error');
        return;
    }
    
    try {
        const bpData = {
            employeeId: employeeId,
            type: type,
            amount: amount,
            reason: reason,
            date: date,
            month: currentMonth,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('bonuses_penalties').add(bpData);
        
        showToast(`Đã ${type === 'bonus' ? 'thưởng' : 'phạt'} ${formatCurrency(amount)}`, 'success');
        closeModal('bonusPenaltyModal');
        loadEmployees();
        
    } catch (error) {
        console.error('Error saving bonus/penalty:', error);
        showToast('Lỗi khi lưu thưởng/phạt', 'error');
    }
}

function showEmployeeHistory(employeeId) {
    const employee = currentEmployees.find(emp => emp.id === employeeId);
    if (!employee) {
        showToast('Không tìm thấy nhân viên', 'error');
        return;
    }
    
    const historyHTML = generateEmployeeHistory(employee);
    
    const modalHTML = `
        <div class="modal-overlay active" id="historyModal">
            <div class="modal-content large">
                <div class="modal-header">
                    <h3>📋 Lịch Sử - ${employee.name}</h3>
                    <button class="modal-close" onclick="closeModal('historyModal')">×</button>
                </div>
                <div class="modal-body">
                    <div class="history-tabs">
                        <button class="tab-btn active" onclick="switchHistoryTab('attendance', this)">📅 Chấm công</button>
                        <button class="tab-btn" onclick="switchHistoryTab('bonuses', this)">🎁 Thưởng</button>
                        <button class="tab-btn" onclick="switchHistoryTab('penalties', this)">⚠️ Phạt</button>
                    </div>
                    
                    <div class="history-content">
                        <div id="attendanceHistory" class="tab-content active">
                            ${historyHTML.attendance}
                        </div>
                        <div id="bonusesHistory" class="tab-content">
                            ${historyHTML.bonuses}
                        </div>
                        <div id="penaltiesHistory" class="tab-content">
                            ${historyHTML.penalties}
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-cancel" onclick="closeModal('historyModal')">✅ Đóng</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function generateEmployeeHistory(employee) {
    // Attendance history
    const days = employee.attendance?.days || {};
    const offDays = Object.entries(days)
        .filter(([date, status]) => status === 'off')
        .map(([date, status]) => `<div class="history-item off">${date}/${currentMonth} - OFF</div>`)
        .join('');
    
    const overtimeDays = Object.entries(days)
        .filter(([date, status]) => status === 'overtime')
        .map(([date, status]) => `<div class="history-item overtime">${date}/${currentMonth} - TĂNG CA</div>`)
        .join('');
    
    const attendanceHistory = offDays + overtimeDays || '<div class="empty-state">Chưa có dữ liệu chấm công</div>';
    
    // Bonuses history
    const bonusesHistory = (employee.bonuses || []).length > 0 
        ? employee.bonuses.map(bp => `
            <div class="history-item bonus">
                <div class="history-date">${bp.date || ''}</div>
                <div class="history-amount">+${formatCurrency(bp.amount || 0)}</div>
                <div class="history-reason">${bp.reason || ''}</div>
            </div>
        `).join('')
        : '<div class="empty-state">Chưa có thưởng</div>';
    
    // Penalties history
    const penaltiesHistory = (employee.penalties || []).length > 0
        ? employee.penalties.map(bp => `
            <div class="history-item penalty">
                <div class="history-date">${bp.date || ''}</div>
                <div class="history-amount">-${formatCurrency(bp.amount || 0)}</div>
                <div class="history-reason">${bp.reason || ''}</div>
            </div>
        `).join('')
        : '<div class="empty-state">Chưa có phạt</div>';
    
    return {
        attendance: attendanceHistory,
        bonuses: bonusesHistory,
        penalties: penaltiesHistory
    };
}

function switchHistoryTab(tabName, button) {
    // Update tab buttons
    document.querySelectorAll('.history-tabs .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    button.classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.history-content .tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName + 'History').classList.add('active');
}

// ==================== MAKE FUNCTIONS GLOBALLY AVAILABLE ====================
window.showAddEmployeeForm = showAddEmployeeForm;
window.showAttendanceCalendar = showAttendanceCalendar;
window.showBonusPenaltyForm = showBonusPenaltyForm;
window.showEditEmployeeForm = showEditEmployeeForm;
window.showEmployeeHistory = showEmployeeHistory;
window.closeModal = closeModal;
window.exportSalaryReport = exportSalaryReport;
window.setDayStatus = setDayStatus;
window.saveBonusPenalty = saveBonusPenalty;
window.deleteEmployee = deleteEmployee;
window.switchHistoryTab = switchHistoryTab;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Khởi tạo sau một chút thời gian để tránh xung đột
    setTimeout(() => {
        if (typeof initializeOperationalTab === 'function') {
            console.log('Initializing operational tab...');
            initializeOperationalTab();
        }
    }, 1000);
});