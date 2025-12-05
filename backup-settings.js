// backup-settings.js - Cài đặt backup và tần suất
class BackupSettings {
    constructor() {
        this.settings = this.loadSettings();
        this.saveInterval = null;
        this.initialize();
    }

    initialize() {
        console.log('⚙️ Khởi tạo Backup Settings...');
        this.setupUI();
        this.applySettings();
    }

    // Cài đặt mặc định
    getDefaultSettings() {
        return {
            // Tần suất backup
            autoSaveEnabled: true,
            autoSaveInterval: 5, // phút
            backupOnUnload: true,
            backupOnBlur: false,
            
            // Loại backup
            backupToLocal: true,
            backupToGitHub: true,
            backupToFile: false,
            
            // Retention (giữ bao lâu)
            keepLocalDays: 7,
            keepGitHubDays: 30,
            
            // Dữ liệu backup
            backupReports: true,
            backupInventory: true,
            backupEmployees: true,
            backupAttendance: true,
            backupPurchases: true,
            backupServices: true,
            
            // Compression & Optimization
            compressData: false,
            incrementalBackup: true,
            
            // Notifications
            showBackupStatus: true,
            notifyOnBackup: false,
            notifyOnError: true
        };
    }

    // Tải cài đặt
    loadSettings() {
        try {
            const saved = localStorage.getItem('backup_settings');
            if (saved) {
                const parsed = JSON.parse(saved);
                return { ...this.getDefaultSettings(), ...parsed };
            }
        } catch (error) {
            console.error('Lỗi tải cài đặt backup:', error);
        }
        return this.getDefaultSettings();
    }

    // Lưu cài đặt
    saveSettings(newSettings = null) {
        try {
            if (newSettings) {
                this.settings = { ...this.settings, ...newSettings };
            }
            localStorage.setItem('backup_settings', JSON.stringify(this.settings));
            
            // Áp dụng cài đặt mới
            this.applySettings();
            
            console.log('💾 Đã lưu cài đặt backup');
            return true;
        } catch (error) {
            console.error('Lỗi lưu cài đặt backup:', error);
            return false;
        }
    }

    // Áp dụng cài đặt
    applySettings() {
        // Dừng interval cũ
        if (this.saveInterval) {
            clearInterval(this.saveInterval);
            this.saveInterval = null;
        }

        // Thiết lập auto-save mới nếu enabled
        if (this.settings.autoSaveEnabled && this.settings.autoSaveInterval > 0) {
            const intervalMs = this.settings.autoSaveInterval * 60 * 1000;
            this.saveInterval = setInterval(() => {
                this.triggerBackup('auto');
            }, intervalMs);
            console.log(`⏰ Auto-save mỗi ${this.settings.autoSaveInterval} phút`);
        }

        // Thiết lập event listeners
        this.setupEventListeners();
    }

    // Thiết lập event listeners
    setupEventListeners() {
        // Xóa listeners cũ
        window.removeEventListener('beforeunload', this.handleUnload);
        window.removeEventListener('blur', this.handleBlur);

        // Thêm listeners mới
        if (this.settings.backupOnUnload) {
            window.addEventListener('beforeunload', this.handleUnload.bind(this));
        }

        if (this.settings.backupOnBlur) {
            window.addEventListener('blur', this.handleBlur.bind(this));
        }
    }

    handleUnload() {
        if (this.settings.backupOnUnload) {
            this.triggerBackup('unload');
        }
    }

    handleBlur() {
        if (this.settings.backupOnBlur) {
            setTimeout(() => {
                this.triggerBackup('blur');
            }, 1000);
        }
    }

    // Kích hoạt backup
    // backup-settings.js - Sửa hàm triggerBackup

async triggerBackup(source = 'manual') {
    try {
        // Kiểm tra dailySnapshot đã khởi tạo chưa
        if (!window.dailySnapshot || typeof window.dailySnapshot.createTodaySnapshot !== 'function') {
            console.warn('❌ Daily Snapshot chưa khởi tạo đúng cách');
            return;
        }

        // Kiểm tra xem có cần backup không
        if (!this.shouldBackupNow()) {
            return;
        }

        console.log(`📸 Backup triggered by: ${source}`);
        
        // Tạo snapshot với cài đặt hiện tại
        const result = await window.dailySnapshot.createTodaySnapshot();
        
        // Hiển thị thông báo
        if (result && this.settings.notifyOnBackup) {
            this.showNotification(`Đã backup (${source})`, 'success');
        } else if (!result && this.settings.notifyOnError) {
            this.showNotification(`Không tạo được backup (${source})`, 'warning');
        }
        
    } catch (error) {
        console.error('❌ Lỗi backup:', error);
        
        if (this.settings.notifyOnError) {
            this.showNotification(`Lỗi backup: ${error.message}`, 'error');
        }
    }
}

    // Kiểm tra có nên backup không
    shouldBackupNow() {
        // Có thể thêm logic kiểm tra:
        // - Có thay đổi dữ liệu không
        // - Thời gian từ lần backup trước
        // - Kết nối mạng (nếu backup lên GitHub)
        return true;
    }

    // Thiết lập UI
    setupUI() {
        // Tạo modal cài đặt nếu chưa có
        if (!document.getElementById('backupSettingsModal')) {
            this.createSettingsModal();
        }

        // Tạo button trong debug panel
        this.createSettingsButton();
    }

    // Tạo nút mở settings
    createSettingsButton() {
        const button = document.createElement('button');
        button.id = 'backupSettingsBtn';
        button.innerHTML = '<i class="fas fa-cogs"></i> Backup Settings';
        button.className = 'small-btn';
        
        button.addEventListener('click', () => {
            this.openSettingsModal();
        });

        // Thêm vào debug panel
        const debugPanel = document.querySelector('.debug-panel');
        if (debugPanel) {
            debugPanel.appendChild(button);
        }
    }

    // Tạo modal settings
    createSettingsModal() {
        const modalHTML = `
            <div id="backupSettingsModal" class="modal">
                <div class="modal-content wide-modal">
                    <div class="modal-header">
                        <h3><i class="fas fa-cogs"></i> Cài đặt Backup</h3>
                        <span class="close">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div class="settings-tabs">
                            <div class="tab-buttons">
                                <button class="tab-btn active" data-tab="frequency">⏰ Tần suất</button>
                                <button class="tab-btn" data-tab="storage">💾 Lưu trữ</button>
                                <button class="tab-btn" data-tab="data">📊 Dữ liệu</button>
                                <button class="tab-btn" data-tab="advanced">⚙️ Nâng cao</button>
                            </div>
                            
                            <div class="tab-content active" id="frequencyTab">
                                <!-- Sẽ được điền bằng JavaScript -->
                            </div>
                            
                            <div class="tab-content" id="storageTab">
                                <!-- Sẽ được điền bằng JavaScript -->
                            </div>
                            
                            <div class="tab-content" id="dataTab">
                                <!-- Sẽ được điền bằng JavaScript -->
                            </div>
                            
                            <div class="tab-content" id="advancedTab">
                                <!-- Sẽ được điền bằng JavaScript -->
                            </div>
                        </div>
                        
                        <div class="settings-actions">
                            <button id="saveBackupSettings" class="btn primary">
                                <i class="fas fa-save"></i> Lưu cài đặt
                            </button>
                            <button id="testBackupBtn" class="btn secondary">
                                <i class="fas fa-play"></i> Test Backup
                            </button>
                            <button id="resetBackupSettings" class="btn danger">
                                <i class="fas fa-undo"></i> Reset
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Setup event listeners cho modal
        this.setupModalListeners();
        
        // Load settings vào form
        this.populateSettingsForm();
    }

    // Setup modal listeners
    setupModalListeners() {
        const modal = document.getElementById('backupSettingsModal');
        const closeBtn = modal.querySelector('.close');
        
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        // Tab switching
        modal.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchSettingsTab(tabName);
            });
        });

        // Save button
        document.getElementById('saveBackupSettings').addEventListener('click', () => {
            this.saveSettingsFromForm();
        });

        // Test backup
        document.getElementById('testBackupBtn').addEventListener('click', () => {
            this.triggerBackup('test');
        });

        // Reset settings
        document.getElementById('resetBackupSettings').addEventListener('click', () => {
            if (confirm('Reset về cài đặt mặc định?')) {
                this.saveSettings(this.getDefaultSettings());
                this.populateSettingsForm();
                this.showNotification('Đã reset cài đặt', 'success');
            }
        });
    }

    // Chuyển tab settings
    switchSettingsTab(tabName) {
        // Ẩn tất cả tab content
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });

        // Bỏ active tất cả tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Hiển thị tab được chọn
        const tabContent = document.getElementById(`${tabName}Tab`);
        const tabButton = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
        
        if (tabContent) tabContent.classList.add('active');
        if (tabButton) tabButton.classList.add('active');
    }

    // Điền form với cài đặt hiện tại
    populateSettingsForm() {
        const s = this.settings;
        
        // Tab Tần suất
        document.getElementById('frequencyTab').innerHTML = `
            <div class="settings-group">
                <h4><i class="fas fa-clock"></i> Tần suất Auto-save</h4>
                
                <div class="setting-item">
                    <label class="checkbox-option">
                        <input type="checkbox" id="autoSaveEnabled" ${s.autoSaveEnabled ? 'checked' : ''}>
                        <span>Bật Auto-save</span>
                    </label>
                    <div class="setting-description">Tự động lưu dữ liệu định kỳ</div>
                </div>
                
                <div class="setting-item">
                    <label for="autoSaveInterval">Khoảng thời gian (phút):</label>
                    <select id="autoSaveInterval" class="form-control">
                        <option value="1" ${s.autoSaveInterval === 1 ? 'selected' : ''}>1 phút</option>
                        <option value="5" ${s.autoSaveInterval === 5 ? 'selected' : ''}>5 phút</option>
                        <option value="15" ${s.autoSaveInterval === 15 ? 'selected' : ''}>15 phút</option>
                        <option value="30" ${s.autoSaveInterval === 30 ? 'selected' : ''}>30 phút</option>
                        <option value="60" ${s.autoSaveInterval === 60 ? 'selected' : ''}>1 giờ</option>
                    </select>
                    <div class="setting-description">Không nên đặt quá thường xuyên (tốn tài nguyên)</div>
                </div>
                
                <div class="setting-item">
                    <label class="checkbox-option">
                        <input type="checkbox" id="backupOnUnload" ${s.backupOnUnload ? 'checked' : ''}>
                        <span>Backup khi đóng trình duyệt</span>
                    </label>
                </div>
                
                <div class="setting-item">
                    <label class="checkbox-option">
                        <input type="checkbox" id="backupOnBlur" ${s.backupOnBlur ? 'checked' : ''}>
                        <span>Backup khi chuyển tab</span>
                    </label>
                    <div class="setting-description">Có thể gây backup quá nhiều</div>
                </div>
            </div>
        `;

        // Tab Lưu trữ
        document.getElementById('storageTab').innerHTML = `
            <div class="settings-group">
                <h4><i class="fas fa-database"></i> Nơi lưu trữ</h4>
                
                <div class="setting-item">
                    <label class="checkbox-option">
                        <input type="checkbox" id="backupToLocal" ${s.backupToLocal ? 'checked' : ''}>
                        <span>Lưu trên Local Storage</span>
                    </label>
                    <div class="setting-description">Nhanh, offline, giữ ${s.keepLocalDays} ngày</div>
                </div>
                
                <div class="setting-item">
                    <label for="keepLocalDays">Giữ trên Local (ngày):</label>
                    <select id="keepLocalDays" class="form-control">
                        <option value="1" ${s.keepLocalDays === 1 ? 'selected' : ''}>1 ngày</option>
                        <option value="3" ${s.keepLocalDays === 3 ? 'selected' : ''}>3 ngày</option>
                        <option value="7" ${s.keepLocalDays === 7 ? 'selected' : ''}>7 ngày</option>
                        <option value="14" ${s.keepLocalDays === 14 ? 'selected' : ''}>14 ngày</option>
                        <option value="30" ${s.keepLocalDays === 30 ? 'selected' : ''}>30 ngày</option>
                    </select>
                </div>
                
                <div class="setting-item">
                    <label class="checkbox-option">
                        <input type="checkbox" id="backupToGitHub" ${s.backupToGitHub ? 'checked' : ''}>
                        <span>Đồng bộ lên GitHub</span>
                    </label>
                    <div class="setting-description">Cần cấu hình GitHub token</div>
                </div>
                
                <div class="setting-item">
                    <label for="keepGitHubDays">Giữ trên GitHub (ngày):</label>
                    <select id="keepGitHubDays" class="form-control">
                        <option value="7" ${s.keepGitHubDays === 7 ? 'selected' : ''}>7 ngày</option>
                        <option value="14" ${s.keepGitHubDays === 14 ? 'selected' : ''}>14 ngày</option>
                        <option value="30" ${s.keepGitHubDays === 30 ? 'selected' : ''}>30 ngày</option>
                        <option value="90" ${s.keepGitHubDays === 90 ? 'selected' : ''}>90 ngày</option>
                        <option value="365" ${s.keepGitHubDays === 365 ? 'selected' : ''}>1 năm</option>
                    </select>
                </div>
                
                <div class="setting-item">
                    <label class="checkbox-option">
                        <input type="checkbox" id="backupToFile" ${s.backupToFile ? 'checked' : ''}>
                        <span>Cho phép Export ra file</span>
                    </label>
                    <div class="setting-description">Xuất file JSON thủ công</div>
                </div>
            </div>
        `;

        // Tab Dữ liệu
        document.getElementById('dataTab').innerHTML = `
            <div class="settings-group">
                <h4><i class="fas fa-table"></i> Dữ liệu cần backup</h4>
                
                <div class="setting-item">
                    <label class="checkbox-option">
                        <input type="checkbox" id="backupReports" ${s.backupReports ? 'checked' : ''}>
                        <span>Báo cáo doanh thu</span>
                    </label>
                </div>
                
                <div class="setting-item">
                    <label class="checkbox-option">
                        <input type="checkbox" id="backupInventory" ${s.backupInventory ? 'checked' : ''}>
                        <span>Kho hàng & sản phẩm</span>
                    </label>
                </div>
                
                <div class="setting-item">
                    <label class="checkbox-option">
                        <input type="checkbox" id="backupEmployees" ${s.backupEmployees ? 'checked' : ''}>
                        <span>Nhân viên & lương</span>
                    </label>
                </div>
                
                <div class="setting-item">
                    <label class="checkbox-option">
                        <input type="checkbox" id="backupAttendance" ${s.backupAttendance ? 'checked' : ''}>
                        <span>Điểm danh & chấm công</span>
                    </label>
                </div>
                
                <div class="setting-item">
                    <label class="checkbox-option">
                        <input type="checkbox" id="backupPurchases" ${s.backupPurchases ? 'checked' : ''}>
                        <span>Lịch sử mua hàng</span>
                    </label>
                </div>
                
                <div class="setting-item">
                    <label class="checkbox-option">
                        <input type="checkbox" id="backupServices" ${s.backupServices ? 'checked' : ''}>
                        <span>Dịch vụ & chi phí</span>
                    </label>
                </div>
            </div>
        `;

        // Tab Nâng cao
        document.getElementById('advancedTab').innerHTML = `
            <div class="settings-group">
                <h4><i class="fas fa-sliders-h"></i> Tối ưu hóa</h4>
                
                <div class="setting-item">
                    <label class="checkbox-option">
                        <input type="checkbox" id="incrementalBackup" ${s.incrementalBackup ? 'checked' : ''}>
                        <span>Incremental Backup</span>
                    </label>
                    <div class="setting-description">Chỉ lưu thay đổi, tiết kiệm dung lượng</div>
                </div>
                
                <div class="setting-item">
                    <label class="checkbox-option">
                        <input type="checkbox" id="compressData" ${s.compressData ? 'checked' : ''}>
                        <span>Nén dữ liệu</span>
                    </label>
                    <div class="setting-description">Giảm 60-80% dung lượng</div>
                </div>
                
                <h4><i class="fas fa-bell"></i> Thông báo</h4>
                
                <div class="setting-item">
                    <label class="checkbox-option">
                        <input type="checkbox" id="showBackupStatus" ${s.showBackupStatus ? 'checked' : ''}>
                        <span>Hiển thị trạng thái backup</span>
                    </label>
                </div>
                
                <div class="setting-item">
                    <label class="checkbox-option">
                        <input type="checkbox" id="notifyOnBackup" ${s.notifyOnBackup ? 'checked' : ''}>
                        <span>Thông báo khi backup thành công</span>
                    </label>
                </div>
                
                <div class="setting-item">
                    <label class="checkbox-option">
                        <input type="checkbox" id="notifyOnError" ${s.notifyOnError ? 'checked' : ''}>
                        <span>Thông báo khi có lỗi</span>
                    </label>
                </div>
            </div>
        `;
    }

    // Lưu cài đặt từ form
    saveSettingsFromForm() {
        const newSettings = {
            autoSaveEnabled: document.getElementById('autoSaveEnabled').checked,
            autoSaveInterval: parseInt(document.getElementById('autoSaveInterval').value),
            backupOnUnload: document.getElementById('backupOnUnload').checked,
            backupOnBlur: document.getElementById('backupOnBlur').checked,
            
            backupToLocal: document.getElementById('backupToLocal').checked,
            backupToGitHub: document.getElementById('backupToGitHub').checked,
            backupToFile: document.getElementById('backupToFile').checked,
            
            keepLocalDays: parseInt(document.getElementById('keepLocalDays').value),
            keepGitHubDays: parseInt(document.getElementById('keepGitHubDays').value),
            
            backupReports: document.getElementById('backupReports').checked,
            backupInventory: document.getElementById('backupInventory').checked,
            backupEmployees: document.getElementById('backupEmployees').checked,
            backupAttendance: document.getElementById('backupAttendance').checked,
            backupPurchases: document.getElementById('backupPurchases').checked,
            backupServices: document.getElementById('backupServices').checked,
            
            incrementalBackup: document.getElementById('incrementalBackup').checked,
            compressData: document.getElementById('compressData').checked,
            
            showBackupStatus: document.getElementById('showBackupStatus').checked,
            notifyOnBackup: document.getElementById('notifyOnBackup').checked,
            notifyOnError: document.getElementById('notifyOnError').checked
        };

        this.saveSettings(newSettings);
        
        // Đóng modal
        document.getElementById('backupSettingsModal').style.display = 'none';
        
        this.showNotification('Đã lưu cài đặt backup', 'success');
    }

    // Mở modal settings
    openSettingsModal() {
        const modal = document.getElementById('backupSettingsModal');
        this.populateSettingsForm();
        modal.style.display = 'block';
    }

    // Hiển thị thông báo
    showNotification(message, type = 'info') {
        // Sử dụng hệ thống thông báo có sẵn hoặc tạo mới
        if (window.app && app.showStatus) {
            app.showStatus(message, type);
        } else {
            console.log(`${type}: ${message}`);
        }
    }

    // Getter cho settings
    getSettings() {
        return this.settings;
    }

    // Kiểm tra có nên backup dữ liệu nào không
    shouldBackupData(type) {
        switch(type) {
            case 'reports': return this.settings.backupReports;
            case 'inventory': return this.settings.backupInventory;
            case 'employees': return this.settings.backupEmployees;
            case 'attendance': return this.settings.backupAttendance;
            case 'purchases': return this.settings.backupPurchases;
            case 'services': return this.settings.backupServices;
            default: return true;
        }
    }
}

// Khởi tạo toàn cục
let backupSettings = null;

// Khởi tạo khi app load
function initBackupSettings() {
    if (!backupSettings) {
        backupSettings = new BackupSettings();
    }
    return backupSettings;
}

// Tự động khởi tạo
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        backupSettings = new BackupSettings();
    }, 2000);
});