// nhanvien.js – BẢN HOÀN CHỈNH NHẤT 2025 – ĐẸP, MƯỢT, ĐẦY ĐỦ TÍNH NĂNG
let currentCalendarMonth = '';
let currentEmployees = [];
let currentEditingEmployee = null;

// Lấy tháng hiện tại
function getCurrentMonth() {
    const d = new Date();
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}



// === TÍNH LƯƠNG CHO NHÂN VIÊN - SỬA LỖI INDEX ===
window.calculateEmployeeSalaryForMonth = async function(employeeId, monthStr) {
    try {
        const [empDoc, attDoc, bonusSnap, penaltySnap] = await Promise.all([
            db.collection('employees').doc(employeeId).get(),
            db.collection('attendance').doc(`${employeeId}_${monthStr.replace('/', '_')}`).get(),
            db.collection('bonuses_penalties')
                .where('employeeId', '==', employeeId)
                .where('month', '==', monthStr)
                .where('type', '==', 'bonus').get(),
            db.collection('bonuses_penalties')
                .where('employeeId', '==', employeeId)
                .where('month', '==', monthStr)
                .where('type', '==', 'penalty').get()
        ]);

        if (!empDoc.exists) return 0;
        const emp = empDoc.data();
        const base = Number(emp.monthlySalary || 0);
        const daily = base / 30;

        let off = 0, ot = 0;
        if (attDoc.exists) {
            const data = attDoc.data() || {};
            // SỬA LỖI: Kiểm tra dữ liệu days
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
        console.error('Lỗi tính lương (nhanvien):', err, 'employeeId:', employeeId);
        return 0;
    }
};
// === KHỞI TẠO - DROPDOWN CHO HTML HIỆN TẠI ===
function initializeNhanVienTab() {
    console.log('🚀 Khởi tạo tab Nhân viên - Dropdown tháng');
    currentCalendarMonth = getCurrentMonth();
    currentEmployees = [];
    
    // Hiển thị loading
    const container = document.getElementById('employeesList');
    if (container) {
        container.innerHTML = '<div class="loading-state">Đang tải dữ liệu...</div>';
        container.style.opacity = '0.7';
    }
    
    setupMonthDropdown(); // Thay thế navigation bằng dropdown
    setupSearch();
    loadEmployees();
}

// === SETUP DROPDOWN THÁNG - GIỮ LẠI HTML HIỆN TẠI ===
function setupMonthDropdown() {
    // Tạo dropdown container và thêm vào DOM
    const monthFilterGroup = document.querySelector('.month-filter-group');
    if (!monthFilterGroup) return;
    
    // Ẩn navigation buttons
    const prevBtn = document.getElementById('prevMonthBtn');
    const nextBtn = document.getElementById('nextMonthBtn');
    const monthDisplay = document.getElementById('currentMonthDisplay');
    
    if (prevBtn) prevBtn.style.display = 'none';
    if (nextBtn) nextBtn.style.display = 'none';
    
    // Tạo dropdown
    const dropdownHTML = `
        <select id="monthDropdown" class="month-dropdown">
            ${generateMonthOptions()}
        </select>
    `;
    
    // Thêm dropdown vào vị trí hiện tại của month display
    monthDisplay.innerHTML = dropdownHTML;
    
    // Setup event listener
    const dropdown = document.getElementById('monthDropdown');
    dropdown.value = currentCalendarMonth;
    
    dropdown.onchange = () => {
        currentCalendarMonth = dropdown.value;
        currentEmployees = [];
        
        // Hiển thị loading
        const container = document.getElementById('employeesList');
        if (container) {
            container.innerHTML = '<div class="loading-state">Đang tải dữ liệu...</div>';
            container.style.opacity = '0.7';
        }
        
        // Update month note
        updateMonthNote();
        loadEmployees();
    };
    
    // Update note ban đầu
    updateMonthNote();
}

// === TẠO OPTIONS CHO DROPDOWN ===
function generateMonthOptions() {
    const months = generateMonthList(12);
    return months.map(month => 
        `<option value="${month.value}" ${month.value === currentCalendarMonth ? 'selected' : ''}>
            ${month.label}
        </option>`
    ).join('');
}

// === TẠO DANH SÁCH THÁNG ===
function generateMonthList(count = 12) {
    const months = [];
    const today = new Date();
    
    for (let i = 0; i < count; i++) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthValue = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
        const monthLabel = formatMonthDisplay(monthValue);
        
        months.push({
            value: monthValue,
            label: monthLabel
        });
    }
    
    return months.reverse();
}

// === FORMAT HIỂN THỊ THÁNG ===
function formatMonthDisplay(monthStr) {
    const months = [
        'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
        'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
    ];
    const [mm, yyyy] = monthStr.split('/');
    return `${months[parseInt(mm) - 1]} ${yyyy}`;
}

// === UPDATE NOTE THÁNG ===
function updateMonthNote() {
    const monthNote = document.querySelector('.month-note');
    if (!monthNote) return;
    
    const isCurrentMonth = currentCalendarMonth === getCurrentMonth();
    monthNote.textContent = isCurrentMonth ? 'Tháng hiện tại' : 'Chỉnh sửa tháng trước';
    monthNote.style.color = isCurrentMonth ? '#4caf50' : '#ff9800';
}




function setupSearch() {
    const input = document.getElementById('employeeSearch');
    if (!input) return;
    input.addEventListener('input', debounce(() => {
        const term = input.value.toLowerCase();
        const filtered = currentEmployees.filter(e => e.name.toLowerCase().includes(term));
        displayEmployees(filtered.length > 0 ? filtered : currentEmployees);
    }, 300));
}
// === HÀM LOAD ATTENDANCE - TỐI ƯU ===
async function loadEmployeeAttendance(employeeId, month) {
    try {
        const doc = await db.collection('attendance')
            .doc(`${employeeId}_${month.replace('/', '_')}`)
            .get();
            
        if (doc.exists) {
            const data = doc.data();
            const processedData = {
                month: data.month || month,
                employeeId: data.employeeId,
                days: {}
            };
            
            // Xử lý dữ liệu days nhanh
            Object.keys(data).forEach(key => {
                if (key.startsWith('days.')) {
                    const dayNumber = key.replace('days.', '');
                    processedData.days[dayNumber] = data[key];
                }
            });
            
            return processedData;
        }
        return { days: {}, month: month };
    } catch (error) {
        console.error('Error loading attendance:', error);
        return { days: {}, month: month };
    }
}

// === HÀM LOAD BONUS/PENALTY - TỐI ƯU ===
async function loadEmployeeBonusPenalty(employeeId, month) {
    try {
        const snapshot = await db.collection('bonuses_penalties')
            .where('employeeId', '==', employeeId)
            .where('month', '==', month)
            .get();
            
        const bonuses = [];
        const penalties = [];
        
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.type === 'bonus') {
                bonuses.push(data);
            } else if (data.type === 'penalty') {
                penalties.push(data);
            }
        });
        
        return { bonuses, penalties };
    } catch (error) {
        console.error('Error loading bonus/penalty:', error);
        return { bonuses: [], penalties: [] };
    }
}

// === HÀM RENDER ALL - TỐI ƯU ===
function renderAll() {
    displayEmployees();
    updateSummary();
    
    // Thêm loading state nếu cần
    const container = document.getElementById('employeesList');
    if (container) {
        container.style.opacity = '1';
        container.style.transition = 'opacity 0.3s ease';
    }
}
// === LOAD NHÂN VIÊN ===
// === LOAD NHÂN VIÊN - TỐI ƯU TỐC ĐỘ ===
async function loadEmployees() {
    try {
        console.time('loadEmployees'); // Đo thời gian load
        const snap = await db.collection('employees').where('status','==','active').get();
        currentEmployees = [];

        if (snap.empty) {
            renderAll();
            return;
        }

        // Tạo tất cả promises cùng lúc
        const employeePromises = snap.docs.map(async (doc) => {
            const data = doc.data();
            const empId = doc.id;
            
            // Tạo employee object cơ bản
            const emp = {
                id: empId,
                name: data.name || 'Chưa đặt tên',
                monthlySalary: Number(data.monthlySalary || 0),
                note: data.note || '',
                calculatedSalary: 0,
                attendance: { days: {} },
                bonuses: [], 
                penalties: []
            };

            // Load tất cả dữ liệu song song
            const [attendanceData, bpData] = await Promise.all([
                loadEmployeeAttendance(empId, currentCalendarMonth),
                loadEmployeeBonusPenalty(empId, currentCalendarMonth)
            ]);

            emp.attendance = attendanceData;
            emp.bonuses = bpData.bonuses;
            emp.penalties = bpData.penalties;
            emp.calculatedSalary = calculateEmployeeSalary(emp);

            return emp;
        });

        currentEmployees = await Promise.all(employeePromises);
        console.timeEnd('loadEmployees');
        renderAll();

    } catch(err) {
        console.error('Lỗi load:', err);
        currentEmployees = [];
        showToast('Lỗi tải dữ liệu', 'error');
        renderAll();
    }
}

// === TÍNH LƯƠNG - TỐI ƯU ===
function calculateEmployeeSalary(employee) {
    const dailySalary = Number(employee.monthlySalary) / 30;
    const days = employee.attendance?.days || {};
    
    const offDays = Object.values(days).filter(day => day === 'off').length;
    const overtimeDays = Object.values(days).filter(day => day === 'overtime').length;
    
    const totalBonus = (employee.bonuses || []).reduce((sum, bonus) => sum + Number(bonus.amount || 0), 0);
    const totalPenalty = (employee.penalties || []).reduce((sum, penalty) => sum + Number(penalty.amount || 0), 0);
    
    const baseSalary = Number(employee.monthlySalary);
    const finalSalary = baseSalary - (offDays * dailySalary) + (overtimeDays * dailySalary) + totalBonus - totalPenalty;
    
    return Math.max(0, Math.round(finalSalary));
}

function renderAll() {
    displayEmployees();
    updateSummary();
}

// === HIỂN THỊ ===
function displayEmployees(list = currentEmployees) {
    const c = document.getElementById('employeesList');
    if (!c) return;

    if (!list || list.length === 0) {
        c.innerHTML = `<div class="empty-state">Không có nhân viên nào</div>`;
        return;
    }

    c.innerHTML = list.map(e => {
        const off = Object.values(e.attendance.days).filter(v=>v==='off').length;
        const ot = Object.values(e.attendance.days).filter(v=>v==='overtime').length;
        const bonus = e.bonuses.reduce((s,b)=>s+Number(b.amount||0),0);
        const penalty = e.penalties.reduce((s,p)=>s+Number(p.amount||0),0);

        return `
            <div class="employee-card">
                <div class="employee-header">
                    <h3>${e.name}</h3>
                    <div class="employee-salary">${formatCurrency(e.monthlySalary)}/tháng</div>
                </div>
                <div class="employee-details">
                    <div>Off: ${off} ngày</div>
                    <div>Tăng ca: ${ot} ngày</div>
                    ${bonus>0 ? `<div class="bonus">+${formatCurrency(bonus)}</div>` : ''}
                    ${penalty>0 ? `<div class="penalty">-${formatCurrency(penalty)}</div>` : ''}
                </div>
                <div class="employee-final-salary">
                    Thực lãnh: <strong>${formatCurrency(e.calculatedSalary)}</strong>
                </div>
                <div class="employee-actions">
                    <button onclick="showAttendanceCalendar('${e.id}')">Chấm công</button>
                    <button onclick="showBonusPenaltyForm('${e.id}')">Thưởng/Phạt</button>
                    <button onclick="showEditEmployeeForm('${e.id}')">Sửa</button>
                    <button onclick="showEmployeeHistory('${e.id}')">Lịch sử</button>
                </div>
            </div>`;
    }).join('');
}

function updateSummary() {
    const el = document.getElementById('nhanvienSummary');
    if (!el) return;

    const list = currentEmployees;
    const total = list.reduce((s,e)=>s+(e.calculatedSalary||0),0);
    const off = list.reduce((s,e)=>s+Object.values(e.attendance.days).filter(v=>v==='off').length,0);
    const ot = list.reduce((s,e)=>s+Object.values(e.attendance.days).filter(v=>v==='overtime').length,0);
    const bonus = list.reduce((s,e)=>s+e.bonuses.reduce((t,b)=>t+Number(b.amount||0),0),0);
    const penalty = list.reduce((s,e)=>s+e.penalties.reduce((t,p)=>t+Number(p.amount||0),0),0);

    el.innerHTML = `
        <div class="summary-grid">
            <div class="summary-item"><div class="summary-value">${list.length}</div><div class="summary-label">Nhân viên</div></div>
            <div class="summary-item"><div class="summary-value">${formatCurrency(total)}</div><div class="summary-label">Tổng thực lãnh</div></div>
            <div class="summary-item"><div class="summary-value">${off}</div><div class="summary-label">Ngày off</div></div>
            <div class="summary-item"><div class="summary-value">${ot}</div><div class="summary-label">Tăng ca</div></div>
            <div class="summary-item bonus"><div class="summary-value">+${formatCurrency(bonus)}</div><div class="summary-label">Thưởng</div></div>
            <div class="summary-item penalty"><div class="summary-value">-${formatCurrency(penalty)}</div><div class="summary-label">Phạt</div></div>
        </div>`;
}

// === THÊM NHÂN VIÊN ===
function showAddEmployeeForm() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = `<div class="modal-content">
        <h3>Thêm Nhân Viên Mới</h3>
        <input type="text" id="newName" placeholder="Tên nhân viên">
        <input type="number" id="newSalary" placeholder="Lương tháng">
        <textarea id="newNote" placeholder="Ghi chú"></textarea>
        <div class="modal-footer">
            <button onclick="this.closest('.modal-overlay').remove()">Hủy</button>
            <button class="btn-confirm" onclick="saveNewEmployee()">Lưu</button>
        </div>
    </div>`;
    document.body.appendChild(modal);
}

async function saveNewEmployee() {
    const name = document.getElementById('newName').value.trim();
    const salary = Number(document.getElementById('newSalary').value);
    const note = document.getElementById('newNote').value.trim();
    if (!name || salary <= 0) return showToast('Nhập đầy đủ', 'error');

    await db.collection('employees').add({
        name, monthlySalary: salary, note, status: 'active',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    showToast('Đã thêm nhân viên');
    document.querySelector('.modal-overlay').remove();
    loadEmployees();
}

// === SỬA / XÓA ===
function showEditEmployeeForm(id) {
    const emp = currentEmployees.find(e => e.id === id);
    if (!emp) return;
    currentEditingEmployee = emp;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = `<div class="modal-content">
        <h3>Sửa nhân viên</h3>
        <input type="text" id="editName" value="${emp.name}">
        <input type="number" id="editSalary" value="${emp.monthlySalary}">
        <textarea id="editNote">${emp.note}</textarea>
        <div class="modal-footer">
            <button class="btn-danger" onclick="deleteEmployee('${id}')">Xóa</button>
            <button onclick="this.closest('.modal-overlay').remove()">Hủy</button>
            <button class="btn-confirm" onclick="saveEditEmployee()">Lưu</button>
        </div>
    </div>`;
    document.body.appendChild(modal);
}

async function saveEditEmployee() {
    const name = document.getElementById('editName').value.trim();
    const salary = Number(document.getElementById('editSalary').value);
    if (!name || salary <= 0) return showToast('Dữ liệu không hợp lệ', 'error');

    await db.collection('employees').doc(currentEditingEmployee.id).update({
        name, monthlySalary: salary,
        note: document.getElementById('editNote').value.trim(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    showToast('Đã cập nhật');
    document.querySelector('.modal-overlay').remove();
    loadEmployees();
}

async function deleteEmployee(id) {
    if (!confirm('Chuyển sang nghỉ việc?')) return;
    await db.collection('employees').doc(id).update({status: 'inactive'});
    showToast('Đã cập nhật trạng thái');
    document.querySelector('.modal-overlay').remove();
    loadEmployees();
}

// === THƯỞNG / PHẠT ===
function showBonusPenaltyForm(id) {
    const emp = currentEmployees.find(e => e.id === id);
    if (!emp) return;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = `<div class="modal-content">
        <h3>Thưởng/Phạt – ${emp.name}</h3>
        <select id="bpType"><option value="bonus">Thưởng</option><option value="penalty">Phạt</option></select>
        <input type="number" id="bpAmount" placeholder="Số tiền">
        <input type="text" id="bpReason" placeholder="Lý do">
        <input type="date" id="bpDate" value="${new Date().toISOString().split('T')[0]}">
        <div class="modal-footer">
            <button onclick="this.closest('.modal-overlay').remove()">Hủy</button>
            <button class="btn-confirm" onclick="saveBonusPenalty('${id}')">Lưu</button>
        </div>
    </div>`;
    document.body.appendChild(modal);
}

async function saveBonusPenalty(id) {
    const type = document.getElementById('bpType').value;
    const amount = Number(document.getElementById('bpAmount').value);
    const reason = document.getElementById('bpReason').value.trim();
    const date = document.getElementById('bpDate').value;
    if (!amount || !reason) return showToast('Nhập đầy đủ', 'error');

    await db.collection('bonuses_penalties').add({
        employeeId: id, type, amount, reason, date,
        month: currentCalendarMonth,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    showToast('Đã lưu thưởng/phạt');
    document.querySelector('.modal-overlay').remove();
    loadEmployees();
}

// === LỊCH SỬ ===
function showEmployeeHistory(id) {
    const emp = currentEmployees.find(e => e.id === id);
    if (!emp) return;

    const off = Object.entries(emp.attendance.days).filter(([,s])=>s==='off').map(([d])=>`<div class="history-item off">${d}/${currentCalendarMonth} – OFF</div>`).join('');
    const ot = Object.entries(emp.attendance.days).filter(([,s])=>s==='overtime').map(([d])=>`<div class="history-item overtime">${d}/${currentCalendarMonth} – Tăng ca</div>`).join('');

    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = `<div class="modal-content large">
        <h3>Lịch sử – ${emp.name}</h3>
        <button onclick="this.closest('.modal-overlay').remove()" style="position:absolute;top:10px;right:15px;font-size:28px;">×</button>
        <div style="max-height:70vh;overflow-y:auto;padding:20px;">
            ${off || ot || '<div class="empty-state">Chưa có dữ liệu chấm công</div>'}
        </div>
    </div>`;
    document.body.appendChild(modal);
}

// === XUẤT EXCEL ===
function exportSalaryReport() {
    if (currentEmployees.length === 0) return showToast('Không có dữ liệu', 'error');
    const data = currentEmployees.map(e => ({
        'Tên NV': e.name,
        'Lương tháng': e.monthlySalary,
        'Off': Object.values(e.attendance.days).filter(v=>v==='off').length,
        'Tăng ca': Object.values(e.attendance.days).filter(v=>v==='overtime').length,
        'Thưởng': e.bonuses.reduce((s,b)=>s+Number(b.amount||0),0),
        'Phạt': e.penalties.reduce((s,p)=>s+Number(p.amount||0),0),
        'Thực lãnh': e.calculatedSalary
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Luong');
    XLSX.writeFile(wb, `Bang_luong_${currentCalendarMonth}.xlsx`);
    showToast('Đã xuất file Excel');
}
function generateAttendanceSummary(employee) {
    const days = employee.attendance?.days || {};
    const offDays = Object.values(days).filter(day => day === 'off').length;
    const overtimeDays = Object.values(days).filter(day => day === 'overtime').length;
    const dailySalary = Number(employee.monthlySalary || 0) / 30;
    
    const offDeduction = offDays * dailySalary;
    const overtimeBonus = overtimeDays * dailySalary;
    
    return `
        <div class="summary-grid compact">
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
// === CHẤM CÔNG - Phiên bản mobile optimized ===
function showAttendanceCalendar(id) {
    const emp = currentEmployees.find(e => e.id === id);
    if (!emp) return;

    const [month, year] = currentCalendarMonth.split('/').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDay = new Date(year, month - 1, 1).getDay();
    
    let calendarHTML = `
        <div class="calendar-container">
            <div class="calendar-weekdays">
                <div>CN</div><div>T2</div><div>T3</div><div>T4</div><div>T5</div><div>T6</div><div>T7</div>
            </div>
            <div class="calendar-grid">
    `;
    
    // Ô trống đầu tháng
    for (let i = 0; i < firstDay; i++) {
        calendarHTML += `<div class="calendar-day empty"></div>`;
    }
    
    // Các ngày trong tháng
    for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = String(day).padStart(2, '0');
        const currentStatus = emp.attendance.days[dateKey] || 'normal';
        
        let dayClass = 'day-normal';
        let daySymbol = day;
        let dayTitle = 'Ngày thường - Click để chọn';
        
        if (currentStatus === 'off') {
            dayClass = 'day-off';
            daySymbol = '❌';
            dayTitle = 'Ngày off - Click để bỏ';
        } else if (currentStatus === 'overtime') {
            dayClass = 'day-overtime';
            daySymbol = '⭐';
            dayTitle = 'Tăng ca - Click để bỏ';
        }
        
        calendarHTML += `
            <div class="calendar-day ${dayClass}" 
                 title="${dayTitle}"
                 onclick="handleDayClick('${emp.id}', '${dateKey}', '${currentStatus}')">
                ${daySymbol}
            </div>
        `;
    }
    
    calendarHTML += `
            </div>
        </div>
    `;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = `
        <div class="modal-content large">
            <div class="modal-header">
                <h3>📅 Chấm Công - ${emp.name}</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
            <div class="modal-body">
                <div class="calendar-header">
                    <h4 style="text-align: center; margin: 0 0 10px 0; color: #333;">Tháng ${currentCalendarMonth}</h4>
                    <div class="calendar-legend">
                        <div class="legend-item">
                            <span class="day-normal"></span>
                            <span>Ngày thường</span>
                        </div>
                        <div class="legend-item">
                            <span class="day-off"></span>
                            <span>Off</span>
                        </div>
                        <div class="legend-item">
                            <span class="day-overtime"></span>
                            <span>Tăng ca</span>
                        </div>
                    </div>
                </div>
                ${calendarHTML}
                <div class="attendance-summary">
                    ${generateAttendanceSummary(emp)}
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-cancel" onclick="this.closest('.modal-overlay').remove()">❌ Đóng</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Thêm hàm handleDayClick
function handleDayClick(employeeId, dateKey, currentStatus) {
    if (currentStatus === 'normal') {
        showDaySelectionModal(employeeId, dateKey);
    } else {
        showDayRemovalModal(employeeId, dateKey, currentStatus);
    }
}

// Xóa hàm toggleDay cũ và thay bằng setDayStatus
async function setDayStatus(employeeId, dateKey, status) {
    try {
        const ref = db.collection('attendance').doc(`${employeeId}_${currentCalendarMonth.replace('/', '_')}`);
        const updateData = {
            month: currentCalendarMonth,
            employeeId: employeeId,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (status === 'normal') {
            updateData[`days.${dateKey}`] = firebase.firestore.FieldValue.delete();
        } else {
            updateData[`days.${dateKey}`] = status;
        }

        await ref.set(updateData, { merge: true });
        
        showToast(`✅ Đã cập nhật ngày ${dateKey}`, 'success');
        
        // Đóng modal
        document.querySelectorAll('.modal-overlay').forEach(modal => modal.remove());
        
        // Reload data
        await loadEmployees();
        
    } catch (error) {
        console.error('Error setting day status:', error);
        showToast('❌ Lỗi khi cập nhật ngày', 'error');
    }
}

// Thêm các hàm modal cho day selection
function showDaySelectionModal(employeeId, dateKey) {
    const employee = currentEmployees.find(emp => emp.id === employeeId);
    if (!employee) return;
    
    const dailySalary = Number(employee.monthlySalary || 0) / 30;
    
    const modalHTML = `
        <div class="modal-overlay active">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>✅ Chọn Loại Ngày</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div class="modal-body">
                    <p>Chọn loại cho ngày <strong>${dateKey}/${currentCalendarMonth}</strong> của <strong>${employee.name}</strong>:</p>
                    <div class="selection-options">
                        <button class="btn-off" onclick="setDayStatus('${employeeId}', '${dateKey}', 'off'); this.closest('.modal-overlay').remove()">
                            🔴 OFF - Trừ ${formatCurrency(dailySalary)}
                        </button>
                        <button class="btn-overtime" onclick="setDayStatus('${employeeId}', '${dateKey}', 'overtime'); this.closest('.modal-overlay').remove()">
                            🟢 TĂNG CA + Cộng ${formatCurrency(dailySalary)}
                        </button>
                        <button class="btn-cancel" onclick="this.closest('.modal-overlay').remove()">
                            ❌ Hủy
                        </button>
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
    const actionText = currentStatus === 'off' ? 'ngày off' : 'tăng ca';
    
    const modalHTML = `
        <div class="modal-overlay active">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${currentStatus === 'off' ? '🔴' : '🟢'} Xác Nhận</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div class="modal-body">
                    <p>Bỏ <strong>${actionText}</strong> ngày <strong>${dateKey}/${currentCalendarMonth}</strong> của <strong>${employee.name}</strong>?</p>
                    <div class="selection-options">
                        <button class="btn-confirm" onclick="setDayStatus('${employeeId}', '${dateKey}', 'normal'); this.closest('.modal-overlay').remove()">
                            ✅ Xác nhận
                        </button>
                        <button class="btn-cancel" onclick="this.closest('.modal-overlay').remove()">
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

// Thêm exports
window.handleDayClick = handleDayClick;
window.setDayStatus = setDayStatus;

async function toggleDay(empId, dateKey, cur) {
    let newS = 'normal';
    if (cur === 'normal') newS = confirm('OK = OFF | Cancel = Tăng ca') ? 'off' : 'overtime';

    try {
        const ref = db.collection('attendance').doc(`${empId}_${currentCalendarMonth.replace('/', '_')}`);
        const upd = newS==='normal' ? {[`days.${dateKey}`]: firebase.firestore.FieldValue.delete()} : {[`days.${dateKey}`]: newS};
        await ref.set(upd, {merge:true});
        showToast('Đã cập nhật chấm công');
        loadEmployees();
    } catch(e) { showToast('Lỗi lưu', 'error'); }
}

// === UTILS ===
function formatCurrency(n) { return new Intl.NumberFormat('vi-VN', {style:'currency', currency:'VND'}).format(n||0); }
function showToast(m,t='info') {
    const x = document.createElement('div');
    x.textContent = m;
    x.style.cssText = `position:fixed;bottom:30px;left:50%;transform:translateX(-50%);
        background:${t==='error'?'#d32f2f':'#4caf50'};color:white;padding:16px 32px;
        border-radius:50px;z-index:100000;font-weight:bold;`;
    document.body.appendChild(x);
    setTimeout(()=>x.remove(),3000);
}
function debounce(f,d) { let t; return (...a)=>{clearTimeout(t); t=setTimeout(()=>f(...a),d)}; }

// === KHỞI ĐỘNG ===
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (document.getElementById('currentMonthDisplay')) initializeNhanVienTab();
    }, 800);
});

// Public functions
window.showAddEmployeeForm = showAddEmployeeForm;
window.showAttendanceCalendar = showAttendanceCalendar;
window.showBonusPenaltyForm = showBonusPenaltyForm;
window.showEditEmployeeForm = showEditEmployeeForm;
window.showEmployeeHistory = showEmployeeHistory;
window.exportSalaryReport = exportSalaryReport;