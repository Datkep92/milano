// auth.js - Hệ thống xác thực và phân quyền
class AuthManager {
    constructor() {
        // Thông tin tài khoản mặc định
        this.defaultAccounts = {
            admin: {
                password: '123123',
                role: 'admin',
                name: 'Quản trị viên'
            }
        };
        
        // Lưu trữ thông tin nhân viên (có thể mở rộng)
        this.employees = [];
        
        // Trạng thái hiện tại
        this.currentUser = null;
        this.isAuthenticated = false;
        
        // Lưu ID thiết bị
        this.deviceId = this.getDeviceId();
        this.rememberMe = true;
        
        console.log('🔐 AuthManager initialized');
    }
    
    // ========== QUẢN LÝ THIẾT BỊ ==========
    getDeviceId() {
        let deviceId = localStorage.getItem('milano_device_id');
        
        if (!deviceId) {
            // Tạo ID thiết bị mới
            deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('milano_device_id', deviceId);
        }
        
        return deviceId;
    }
    
    // ========== ĐĂNG NHẬP ==========
    async login(phoneOrPassword, isAdminLogin = false) {
        try {
            console.log('🔐 Login attempt:', { phoneOrPassword, isAdminLogin });
            
            if (isAdminLogin) {
                // Đăng nhập admin
                return this.loginAdmin(phoneOrPassword);
            } else {
                // Đăng nhập nhân viên (qua số điện thoại)
                return this.loginEmployee(phoneOrPassword);
            }
            
        } catch (error) {
            console.error('❌ Login error:', error);
            return {
                success: false,
                message: 'Lỗi hệ thống',
                error: error.message
            };
        }
    }
    
    loginAdmin(password) {
        if (password === this.defaultAccounts.admin.password) {
            this.currentUser = {
                ...this.defaultAccounts.admin,
                id: 'admin',
                phone: 'admin'
            };
            
            this.isAuthenticated = true;
            this.saveSession();
            
            console.log('✅ Admin login successful');
            return {
                success: true,
                user: this.currentUser,
                message: 'Đăng nhập quản trị thành công'
            };
        }
        
        return {
            success: false,
            message: 'Mật khẩu không đúng'
        };
    }
    


// Thêm phương thức ghi log đăng nhập
logLogin(employee, phone) {
    try {
        const loginLog = {
            employeeId: employee.id,
            employeeName: employee.name,
            phone: phone,
            timestamp: new Date().toISOString(),
            deviceId: this.deviceId,
            userAgent: navigator.userAgent
        };
        
        // Lưu log vào localStorage
        const logs = JSON.parse(localStorage.getItem('milano_login_logs') || '[]');
        logs.push(loginLog);
        
        // Giữ tối đa 100 log gần nhất
        if (logs.length > 100) {
            logs.splice(0, logs.length - 100);
        }
        
        localStorage.setItem('milano_login_logs', JSON.stringify(logs));
        
        console.log('📝 Login logged:', loginLog);
        
    } catch (error) {
        console.warn('⚠️ Error logging login:', error);
    }
}

// Cập nhật phương thức loginEmployee trong auth.js
async loginEmployee(phone) {
    // Làm sạch số điện thoại - chỉ lấy số
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Kiểm tra cơ bản
    if (!cleanPhone || cleanPhone.length < 10) {
        return {
            success: false,
            message: 'Số điện thoại phải có 10 số'
        };
    }
    
    // Tải danh sách nhân viên
    await this.loadEmployees();
    
    console.log(`🔍 Kiểm tra đăng nhập: ${cleanPhone}`);
    
    // Tìm nhân viên theo số điện thoại - SO SÁNH CHÍNH XÁC
    const employee = this.employees.find(emp => {
        if (!emp.phone) return false;
        
        // Làm sạch số điện thoại trong database
        const empPhone = emp.phone.replace(/\D/g, '');
        
        // So sánh chính xác
        return empPhone === cleanPhone;
    });
    
    if (!employee) {
        console.log(`❌ Không tìm thấy nhân viên với số: ${cleanPhone}`);
        return {
            success: false,
            message: 'Số điện thoại không có trong hệ thống'
        };
    }
    
    console.log(`✅ Tìm thấy nhân viên: ${employee.name} (${employee.phone})`);
    
    // Đăng nhập thành công - LẤY ĐẦY ĐỦ TÊN NHÂN VIÊN
    this.currentUser = {
        id: employee.id,
        name: employee.name || `Nhân viên ${cleanPhone.slice(-4)}`, // Đảm bảo có tên
        phone: employee.phone,
        role: 'employee',
        employeeId: employee.id,
        fullName: employee.name // Lưu tên đầy đủ
    };
    
    this.isAuthenticated = true;
    this.saveSession();
    
    return {
        success: true,
        user: this.currentUser,
        message: `Chào ${employee.name}`
    };
}

// Cập nhật loadEmployees - đơn giản hóa
async loadEmployees() {
    try {
        if (window.dataManager && window.dataManager.getEmployees) {
            this.employees = window.dataManager.getEmployees() || [];
            
            // Lọc những nhân viên có số điện thoại
            this.employees = this.employees.filter(emp => emp.phone && emp.phone.trim() !== '');
            
            console.log(`📱 Loaded ${this.employees.length} employees with phone numbers`);
        }
    } catch (error) {
        console.error('Error loading employees:', error);
        this.employees = [];
    }
}
    
    // ========== QUẢN LÝ PHIÊN ==========
    saveSession() {
        if (this.rememberMe && this.currentUser) {
            localStorage.setItem('milano_user_session', JSON.stringify({
                user: this.currentUser,
                timestamp: Date.now(),
                deviceId: this.deviceId
            }));
        }
    }
    
    loadSession() {
        try {
            const sessionData = localStorage.getItem('milano_user_session');
            
            if (sessionData) {
                const session = JSON.parse(sessionData);
                
                // Kiểm tra thời gian phiên (tối đa 7 ngày)
                const sessionAge = Date.now() - session.timestamp;
                const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 ngày
                
                if (sessionAge < maxAge && session.deviceId === this.deviceId) {
                    this.currentUser = session.user;
                    this.isAuthenticated = true;
                    
                    console.log(`✅ Session restored: ${this.currentUser.name}`);
                    return true;
                } else {
                    // Phiên hết hạn
                    this.clearSession();
                }
            }
        } catch (error) {
            console.warn('⚠️ Error loading session:', error);
            this.clearSession();
        }
        
        return false;
    }
    
    clearSession() {
        this.currentUser = null;
        this.isAuthenticated = false;
        localStorage.removeItem('milano_user_session');
        console.log('🗑️ Session cleared');
    }
    
    logout() {
        const userName = this.currentUser?.name || 'User';
        this.clearSession();
        
        // Quay lại màn hình đăng nhập
        this.showLoginScreen();
        
        console.log(`👋 Logout: ${userName}`);
        return {
            success: true,
            message: 'Đã đăng xuất'
        };
    }
    
    // ========== PHÂN QUYỀN ==========
    hasPermission(permission) {
        if (!this.isAuthenticated || !this.currentUser) {
            return false;
        }
        
        const userRole = this.currentUser.role;
        
        // Quyền theo role
        const rolePermissions = {
            admin: ['*'], // Tất cả quyền
            employee: ['reports', 'view_reports', 'register_workday']
        };
        
        // Admin có tất cả quyền
        if (userRole === 'admin') {
            return true;
        }
        
        // Kiểm tra quyền cụ thể
        return rolePermissions[userRole]?.includes(permission) || 
               rolePermissions[userRole]?.includes('*');
    }
    
    canAccessTab(tabName) {
        const tabPermissions = {
            'reports': ['reports'],
            'inventory': ['inventory'],
            'employees': ['employees'],
            'dashboard': ['dashboard']
        };
        
        // Admin có quyền truy cập tất cả tab
        if (this.currentUser?.role === 'admin') {
            return true;
        }
        
        // Nhân viên chỉ được truy cập tab báo cáo
        if (this.currentUser?.role === 'employee') {
            return tabName === 'reports';
        }
        
        return false;
    }
    
    // ========== QUẢN LÝ NHÂN VIÊN ==========
    async loadEmployees() {
        try {
            // Lấy từ DataManager
            if (window.dataManager && window.dataManager.getEmployees) {
                this.employees = window.dataManager.getEmployees() || [];
                console.log(`👥 Loaded ${this.employees.length} employees for auth`);
            }
        } catch (error) {
            console.error('Error loading employees for auth:', error);
            this.employees = [];
        }
    }
    
    // ========== UI METHODS ==========
    showLoginScreen() {
        const mainContent = document.getElementById('mainContent');
        if (!mainContent) return;
        
        mainContent.innerHTML = this.renderLoginScreen();
        
        // Ẩn tabs khi chưa đăng nhập
        this.updateTabVisibility(false);
    }
    
    renderLoginScreen() {
        return `
            <div class="login-container">
                <div class="login-card">
                    <div class="login-header">
                        <h1><i class="fas fa-coffee"></i> MILANO</h1>
                        <p>Hệ thống quản lý quán cà phê</p>
                    </div>
                    
                    <div class="login-tabs">
                        <button class="login-tab active" id="employeeTab" onclick="window.authManager.switchLoginTab('employee')">
                            <i class="fas fa-user"></i> NHÂN VIÊN
                        </button>
                        <button class="login-tab" id="adminTab" onclick="window.authManager.switchLoginTab('admin')">
                            <i class="fas fa-lock"></i> QUẢN TRỊ
                        </button>
                    </div>
                    
                    <div class="login-form" id="employeeLoginForm">
                        <div class="form-group">
                            <label><i class="fas fa-phone"></i> SỐ ĐIỆN THOẠI</label>
                            <input type="tel" id="employeePhone" 
                                   placeholder="Nhập số điện thoại" 
                                   maxlength="10"
                                   oninput="this.value = this.value.replace(/\D/g, '')">
                        </div>
                        
                        <button class="btn-login" onclick="window.authManager.submitLogin('employee')">
                            <i class="fas fa-sign-in-alt"></i> ĐĂNG NHẬP
                        </button>
                        
                        <div class="login-note">
                            <i class="fas fa-info-circle"></i>
                            Nhập số điện thoại đã đăng ký với quán
                        </div>
                    </div>
                    
                    <div class="login-form" id="adminLoginForm" style="display: none;">
                        <div class="form-group">
                            <label><i class="fas fa-key"></i> MẬT KHẨU QUẢN TRỊ</label>
                            <input type="password" id="adminPassword" 
                                   placeholder="Nhập mật khẩu"
                                   value="123123">
                        </div>
                        
                        <button class="btn-login admin" onclick="window.authManager.submitLogin('admin')">
                            <i class="fas fa-lock"></i> ĐĂNG NHẬP QUẢN TRỊ
                        </button>
                        
                        <div class="login-note warning">
                            <i class="fas fa-exclamation-triangle"></i>
                            Chỉ dành cho chủ quán/quản lý
                        </div>
                    </div>
                    
                    <div class="login-footer">
                        <div class="device-id">
                            <small>Thiết bị: ${this.deviceId.slice(0, 8)}...</small>
                        </div>
                        <div class="remember-me">
                            <label>
                                <input type="checkbox" id="rememberMe" checked 
                                       onchange="window.authManager.toggleRememberMe()">
                                Ghi nhớ đăng nhập
                            </label>
                        </div>
                    </div>
                </div>
                
                <div class="login-info">
                    <div class="info-card">
                        <h3><i class="fas fa-users"></i> CHO NHÂN VIÊN</h3>
                        <ul>
                            <li><i class="fas fa-check"></i> Xem và tạo báo cáo ngày</li>
                            <li><i class="fas fa-check"></i> Đăng ký ngày OFF/Tăng ca</li>
                            <li><i class="fas fa-check"></i> Xem lịch làm việc cá nhân</li>
                        </ul>
                    </div>
                    
                    <div class="info-card">
                        <h3><i class="fas fa-user-shield"></i> CHO QUẢN TRỊ</h3>
                        <ul>
                            <li><i class="fas fa-check"></i> Quản lý toàn bộ hệ thống</li>
                            <li><i class="fas fa-check"></i> Quản lý nhân viên & lương</li>
                            <li><i class="fas fa-check"></i> Quản lý kho & báo cáo</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
    }
    
    switchLoginTab(tab) {
        const employeeTab = document.getElementById('employeeTab');
        const adminTab = document.getElementById('adminTab');
        const employeeForm = document.getElementById('employeeLoginForm');
        const adminForm = document.getElementById('adminLoginForm');
        
        if (tab === 'employee') {
            employeeTab.classList.add('active');
            adminTab.classList.remove('active');
            employeeForm.style.display = 'block';
            adminForm.style.display = 'none';
        } else {
            employeeTab.classList.remove('active');
            adminTab.classList.add('active');
            employeeForm.style.display = 'none';
            adminForm.style.display = 'block';
        }
    }
    
    async submitLogin(type) {
        let inputElement, value;
        
        if (type === 'employee') {
            inputElement = document.getElementById('employeePhone');
            value = inputElement.value.trim();
            
            if (!value) {
                window.showToast('Vui lòng nhập số điện thoại', 'warning');
                inputElement.focus();
                return;
            }
        } else {
            inputElement = document.getElementById('adminPassword');
            value = inputElement.value.trim();
            
            if (!value) {
                window.showToast('Vui lòng nhập mật khẩu', 'warning');
                inputElement.focus();
                return;
            }
        }
        
        // Hiển thị loading
        const loginBtn = type === 'employee' 
            ? document.querySelector('.btn-login:not(.admin)')
            : document.querySelector('.btn-login.admin');
        
        const originalText = loginBtn.innerHTML;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ĐANG XỬ LÝ...';
        loginBtn.disabled = true;
        
        try {
            const result = await this.login(value, type === 'admin');
            
            if (result.success) {
                window.showToast(result.message, 'success');
                
                // Cập nhật UI sau đăng nhập
                this.updateUIAfterLogin();
                
                // Mở tab báo cáo mặc định
                setTimeout(() => {
                    window.showTab('reports');
                }, 500);
                
            } else {
                window.showToast(result.message, 'error');
                inputElement.focus();
                inputElement.select();
            }
            
        } finally {
            // Khôi phục nút
            loginBtn.innerHTML = originalText;
            loginBtn.disabled = false;
        }
    }
    
    toggleRememberMe() {
        const checkbox = document.getElementById('rememberMe');
        this.rememberMe = checkbox.checked;
        console.log(`💾 Remember me: ${this.rememberMe}`);
    }
    
    updateUIAfterLogin() {
        // Hiển thị tabs
        this.updateTabVisibility(true);
        
        // Cập nhật header với thông tin người dùng
        this.updateHeader();
    }
    
    updateTabVisibility(show) {
        const tabs = document.querySelector('.tabs');
        if (tabs) {
            tabs.style.display = show ? 'flex' : 'none';
        }
        
        // Cập nhật tab nào được phép truy cập
        if (show && this.currentUser) {
            this.updateAvailableTabs();
        }
    }
    updateAvailableTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    const syncStatus = document.getElementById('syncStatus');
    
    tabs.forEach(tab => {
        const tabName = tab.getAttribute('data-tab');
        const canAccess = this.canAccessTab(tabName);
        
        if (canAccess) {
            tab.style.display = 'flex';
        } else {
            tab.style.display = 'none';
            
            // Nếu tab đang active bị ẩn, chuyển sang tab reports
            if (tab.classList.contains('active')) {
                tab.classList.remove('active');
                const reportsTab = document.querySelector('.tab-btn[data-tab="reports"]');
                if (reportsTab) {
                    reportsTab.classList.add('active');
                }
            }
        }
    });
    
    // Điều chỉnh vị trí sync status nếu cần
    if (syncStatus && this.currentUser?.role === 'employee') {
        syncStatus.style.marginLeft = 'auto';
    }
}
    updateFooter() {
    const footer = document.getElementById('appFooter');
    const userInfoFooter = document.getElementById('userInfoFooter');
    
    if (!footer || !userInfoFooter) return;
    
    if (this.currentUser) {
        // Thông tin người dùng và nút logout
        userInfoFooter.innerHTML = `
            <div class="footer-user-info">
                <div class="footer-avatar">
                    <i class="fas fa-${this.currentUser.role === 'admin' ? 'user-shield' : 'user'}"></i>
                </div>
                <div class="footer-user-details">
                    <div class="footer-user-name">${this.currentUser.name}</div>
                    <div class="footer-user-role">${this.currentUser.role === 'admin' ? 'Quản trị viên' : 'Thành Viên'}</div>
                </div>
                <button class="footer-logout-btn" onclick="window.authManager.logout()" title="Đăng xuất">
                    <i class="fas fa-sign-out-alt"></i>
                </button>
            </div>
        `;
        
        // Hiển thị footer
        footer.style.display = 'flex';
        
        // Thêm nút đăng ký ngày làm cho nhân viên trong footer
        if (this.currentUser.role === 'employee') {
            const workdayBtn = document.createElement('button');
            workdayBtn.className = 'footer-workday-btn';
            workdayBtn.innerHTML = `
                <i class="fas fa-calendar-plus"></i>
                <span>Đăng ký ngày làm</span>
            `;
            workdayBtn.onclick = () => window.employeesModule?.showWorkDayRegistration();
            
            // Thêm vào trước user info
            userInfoFooter.insertBefore(workdayBtn, userInfoFooter.firstChild);
        }
        
    } else {
        // Ẩn footer khi chưa đăng nhập
        footer.style.display = 'none';
    }
}
// Cập nhật phương thức updateUIAfterLogin()
updateUIAfterLogin() {
    // Hiển thị tabs
    this.updateTabVisibility(true);
    
    // Cập nhật footer với thông tin người dùng
    this.updateFooter();
    
    // Cập nhật sync status trong footer
    this.updateSyncStatusInFooter();
}

// Phương thức cập nhật sync status trong footer
updateSyncStatusInFooter(status = 'ready', pendingCount = null) {
    const icon = document.getElementById('syncIconFooter');
    const text = document.getElementById('syncTextFooter');
    
    if (!icon || !text) return;
    
    // Update icon and text
    icon.className = 'fas';
    text.textContent = status;
    
    switch(status) {
        case 'online':
            icon.classList.add('fa-circle', 'online');
            text.textContent = 'Online';
            break;
        case 'offline':
            icon.classList.add('fa-circle', 'offline');
            text.textContent = 'Offline';
            break;
        case 'syncing':
            icon.classList.add('fa-sync-alt', 'fa-spin', 'syncing');
            text.textContent = 'Đang đồng bộ...';
            break;
        case 'success':
            icon.classList.add('fa-check-circle', 'success');
            text.textContent = 'Đã đồng bộ';
            // Auto reset sau 2 giây
            setTimeout(() => {
                if (text.textContent === 'Đã đồng bộ') {
                    this.updateSyncStatusInFooter(navigator.onLine ? 'online' : 'offline');
                }
            }, 2000);
            break;
        case 'error':
            icon.classList.add('fa-exclamation-circle', 'error');
            text.textContent = 'Lỗi đồng bộ';
            // Auto reset sau 3 giây
            setTimeout(() => {
                if (text.textContent === 'Lỗi đồng bộ') {
                    this.updateSyncStatusInFooter(navigator.onLine ? 'online' : 'offline');
                }
            }, 3000);
            break;
        default:
            // 'ready' state
            icon.classList.add('fa-circle', navigator.onLine ? 'online' : 'offline');
            text.textContent = navigator.onLine ? 'Online' : 'Offline';
    }
}

// Cập nhật phương thức logout
logout() {
    const userName = this.currentUser?.name || 'User';
    this.clearSession();
    
    // Ẩn footer
    const footer = document.getElementById('appFooter');
    if (footer) {
        footer.style.display = 'none';
    }
    
    // Quay lại màn hình đăng nhập
    this.showLoginScreen();
    
    console.log(`👋 Logout: ${userName}`);
    window.showToast?.('Đã đăng xuất', 'success');
    
    return {
        success: true,
        message: 'Đã đăng xuất'
    };
}

// Cập nhật phương thức init()
async init() {
    console.log('🔐 Initializing auth system...');
    
    // Thử khôi phục phiên đăng nhập
    const hasSession = this.loadSession();
    
    if (hasSession) {
        console.log(`✅ Auto-login: ${this.currentUser.name}`);
        this.updateUIAfterLogin();
        
        // Cập nhật sync status trong footer
        this.updateSyncStatusInFooter(navigator.onLine ? 'online' : 'offline');
        
        return true;
    } else {
        // Hiển thị màn hình đăng nhập
        this.showLoginScreen();
        return false;
    }
}
    updateHeader() {
    const header = document.querySelector('.header');
    if (!header) return;
    
    // Xóa user info cũ nếu có
    const oldUserInfo = document.getElementById('userInfo');
    if (oldUserInfo) {
        oldUserInfo.remove();
    }
    
    if (this.currentUser) {
        // Tạo container cho toàn bộ phần bên phải header
        const headerRight = document.createElement('div');
        headerRight.className = 'header-right';
        
        // Thêm nút đăng ký ngày làm cho nhân viên
        if (this.currentUser.role === 'employee') {
            const registerBtn = document.createElement('button');
            registerBtn.className = 'register-workday-btn';
            registerBtn.innerHTML = `
                <i class="fas fa-calendar-plus"></i>
                <span>Đăng ký ngày làm</span>
            `;
            registerBtn.onclick = () => window.employeesModule?.showWorkDayRegistration();
            headerRight.appendChild(registerBtn);
        }
        
        // Thông tin người dùng
        const userInfo = document.createElement('div');
        userInfo.id = 'userInfo';
        userInfo.className = 'user-info';
        userInfo.innerHTML = `
            <div class="user-avatar">
                <i class="fas fa-${this.currentUser.role === 'admin' ? 'user-shield' : 'user'}"></i>
            </div>
            <div class="user-details">
                <div class="user-name">${this.currentUser.name}</div>
                <div class="user-role">${this.currentUser.role === 'admin' ? 'Quản trị' : 'Nhân viên'}</div>
            </div>
        `;
        
        // Nút đăng xuất
        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'logout-btn';
        logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i>';
        logoutBtn.title = 'Đăng xuất';
        logoutBtn.onclick = () => this.logout();
        
        // Thêm vào container
        userInfo.appendChild(logoutBtn);
        headerRight.appendChild(userInfo);
        
        // Thêm vào header
        header.appendChild(headerRight);
    }
}
    
    // ========== INITIALIZATION ==========
    async init() {
        console.log('🔐 Initializing auth system...');
        
        // Thử khôi phục phiên đăng nhập
        const hasSession = this.loadSession();
        
        if (hasSession) {
            console.log(`✅ Auto-login: ${this.currentUser.name}`);
            this.updateUIAfterLogin();
            return true;
        } else {
            // Hiển thị màn hình đăng nhập
            this.showLoginScreen();
            return false;
        }
    }
    
    // ========== PUBLIC API ==========
    getUser() {
        return this.currentUser;
    }
    
    isAdmin() {
        return this.currentUser?.role === 'admin';
    }
    
    isEmployee() {
        return this.currentUser?.role === 'employee';
    }
    
    getEmployeeId() {
        return this.currentUser?.employeeId;
    }
    
    requireAuth(requiredRole = null) {
        if (!this.isAuthenticated) {
            this.showLoginScreen();
            return false;
        }
        
        if (requiredRole && this.currentUser?.role !== requiredRole) {
            window.showToast('Bạn không có quyền truy cập', 'error');
            return false;
        }
        
        return true;
    }
}

// Khởi tạo AuthManager
window.authManager = new AuthManager();