// github.js - Xử lý lưu trữ và đồng bộ với GitHub

class GitHubManager {
    constructor() {
        this.token = null;
        this.repo = null;
        this.branch = 'main';
        this.folder = 'reports';
        this.baseUrl = 'https://api.github.com';
        this.initialized = false;
        
        // Tải cài đặt từ localStorage khi khởi tạo
        this.loadSettings();
    }

    // Tải cài đặt từ localStorage
    loadSettings() {
        try {
            const savedToken = localStorage.getItem('github_token');
            const savedRepo = localStorage.getItem('github_repo');
            const savedBranch = localStorage.getItem('github_branch');
            const savedFolder = localStorage.getItem('github_folder');
            
            if (savedToken) this.token = savedToken;
            if (savedRepo) this.repo = savedRepo;
            if (savedBranch) this.branch = savedBranch;
            if (savedFolder) this.folder = savedFolder;
            
            this.initialized = !!this.token && !!this.repo;
            
            console.log('GitHub settings loaded:', {
                hasToken: !!this.token,
                repo: this.repo,
                branch: this.branch,
                folder: this.folder,
                initialized: this.initialized
            });
        } catch (error) {
            console.error('Error loading GitHub settings:', error);
        }
    }

    // Lưu cài đặt
    saveSettings(token, repo, branch, folder) {
        try {
            this.token = token;
            this.repo = repo;
            this.branch = branch || 'main';
            this.folder = folder || 'reports';
            
            localStorage.setItem('github_token', token);
            localStorage.setItem('github_repo', repo);
            localStorage.setItem('github_branch', this.branch);
            localStorage.setItem('github_folder', this.folder);
            
            this.initialized = true;
            
            console.log('GitHub settings saved');
            return true;
        } catch (error) {
            console.error('Error saving GitHub settings:', error);
            return false;
        }
    }

    // Kiểm tra kết nối
    async testConnection() {
        if (!this.initialized) {
            return { success: false, message: 'Chưa cấu hình GitHub. Vui lòng nhập token và repository.' };
        }
        
        try {
            const response = await fetch(`${this.baseUrl}/repos/${this.repo}`, {
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                return {
                    success: true,
                    message: `Kết nối thành công đến repository: ${data.full_name}`,
                    data: data
                };
            } else {
                return {
                    success: false,
                    message: `Lỗi kết nối: ${response.status} - ${response.statusText}`
                };
            }
        } catch (error) {
            return {
                success: false,
                message: `Lỗi: ${error.message}`
            };
        }
    }

    // Tải file từ GitHub
async getFile(path) {
    if (!this.initialized) {
        throw new Error('GitHub chưa được cấu hình');
    }
    
    try {
        const apiUrl = `${this.baseUrl}/repos/${this.repo}/contents/${path}?ref=${this.branch}`;
        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `token ${this.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            
            // Nếu file là base64 encoded, decode nó
            if (data.content && data.encoding === 'base64') {
                // Sửa: Giải mã Base64 và xử lý UTF-8 đúng cách
                const binaryString = atob(data.content);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                const content = new TextDecoder('utf-8').decode(bytes);
                
                return {
                    content: content,
                    sha: data.sha,
                    path: data.path
                };
            }
            
            return data;
        } else if (response.status === 404) {
            // File không tồn tại
            return null;
        } else {
            throw new Error(`Lỗi tải file: ${response.status} - ${response.statusText}`);
        }
    } catch (error) {
        console.error('Error getting file from GitHub:', error);
        throw error;
    }
}

   // Tạo file mới trên GitHub - FIXED 409 Conflict
async saveFile(path, content, sha = null, message = null) {
    if (!this.initialized) {
        throw new Error('GitHub chưa được cấu hình');
    }
    
    try {
        const apiUrl = `${this.baseUrl}/repos/${this.repo}/contents/${path}`;
        
        // Message mặc định
        if (!message) {
            const now = new Date().toLocaleString('vi-VN');
            message = `Tạo file mới ${path} lúc ${now}`;
        }
        
        // Chuyển sang Base64 đơn giản
        const base64Content = btoa(unescape(encodeURIComponent(content)));
        
        console.log('Gửi đến GitHub:', {
            path: path,
            shaProvided: !!sha,
            contentLength: content.length
        });
        
        // QUAN TRỌNG: Nếu sha không phải null, đặt thành null để tạo mới
        const payload = {
            message: message,
            content: base64Content,
            branch: this.branch
        };
        
        // KHÔNG BAO GIỜ thêm SHA vào payload
        // Để GitHub tự động tạo file mới
        
        const response = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${this.token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ File mới đã tạo:', data.commit.html_url);
            return {
                success: true,
                commit: data.commit,
                content: data.content,
                url: data.commit.html_url
            };
        } else {
            // Xử lý lỗi 409 đặc biệt
            if (response.status === 409) {
                console.warn('File đã tồn tại, tạo file khác...');
                
                // Tạo tên file mới với random
                const random = Math.random().toString(36).substring(2, 9);
                const newPath = path.replace('.json', `-${random}.json`);
                
                console.log('Thử tạo file mới:', newPath);
                
                // Thử lại với tên file mới
                return await this.saveFile(newPath, content, null, message);
            }
            
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Lỗi ${response.status}: ${errorData.message || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Lỗi tạo file:', error);
        throw error;
    }
}

// Lưu báo cáo lên GitHub - Pattern rõ ràng
async saveReportToGitHub(reportData) {
    if (!this.initialized) {
        return { success: false, message: 'GitHub chưa cấu hình' };
    }
    
    try {
        const date = reportData.date;
        const reportId = reportData.id || 'new';
        
        // DEBUG: Kiểm tra inventory
        console.log('📦 Kiểm tra inventory trước khi lưu:', {
            hasInventory: !!reportData.inventory,
            inventoryType: typeof reportData.inventory,
            inventoryLength: reportData.inventory ? reportData.inventory.length : 0,
            inventorySample: reportData.inventory ? reportData.inventory.slice(0, 2) : 'none'
        });
        
        // Đảm bảo inventory là array
        if (!Array.isArray(reportData.inventory)) {
            reportData.inventory = [];
            console.warn('⚠️ Inventory không phải array, đã reset thành []');
        }
        
        // Tạo timestamp chính xác
        const now = performance.now();
        const timestamp = Date.now() + Math.floor(now % 1000);
        
        // Tăng counter
        this.fileCounter = (this.fileCounter || 0) + 1;
        
        const fileName = `${date}-${reportId}-${timestamp}-${this.fileCounter}.json`;
        const filePath = `${this.folder}/${fileName}`;
        
        console.log('💾 Lưu lên GitHub:', {
            fileName: fileName,
            inventoryItems: reportData.inventory.length,
            inventoryData: reportData.inventory
        });
        
        // Đảm bảo dữ liệu đầy đủ
        const dataToSave = {
            ...reportData,
            // Đảm bảo các trường quan trọng có giá trị
            inventory: reportData.inventory || [],
            expenses: reportData.expenses || [],
            transfers: reportData.transfers || [],
            _savedAt: new Date().toISOString(),
            _version: '1.1',
            _inventoryCount: reportData.inventory ? reportData.inventory.length : 0
        };
        
        const content = JSON.stringify(dataToSave, null, 2);
        
        const result = await this.saveFile(
            filePath,
            content,
            null,
            `Báo cáo ${date} (${dataToSave.inventory.length} mặt hàng)`
        );
        
        return {
            success: true,
            message: `Đã lưu lên GitHub (${dataToSave.inventory.length} mặt hàng)`,
            url: result.url,
            fileName: fileName,
            inventoryCount: dataToSave.inventory.length
        };
        
    } catch (error) {
        console.error('❌ Lỗi GitHub:', error);
        return {
            success: false,
            message: `GitHub: ${error.message}`
        };
    }
}

// Tải tất cả báo cáo từ GitHub - FIXED với debug chi tiết
async loadAllReportsFromGitHub() {
    if (!this.initialized) {
        console.warn('GitHub chưa được cấu hình, bỏ qua tải báo cáo');
        return [];
    }
    
    try {
        const folderPath = this.folder;
        const apiUrl = `${this.baseUrl}/repos/${this.repo}/contents/${folderPath}?ref=${this.branch}`;
        
        console.log('📂 Tải danh sách file từ GitHub:', {
            url: apiUrl,
            repo: this.repo,
            folder: folderPath,
            branch: this.branch
        });
        
        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `token ${this.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!response.ok) {
            console.error('❌ Lỗi tải danh sách file:', {
                status: response.status,
                statusText: response.statusText,
                url: apiUrl
            });
            
            if (response.status === 404) {
                console.log('📁 Thư mục reports không tồn tại trên GitHub');
                return [];
            }
            throw new Error(`Lỗi tải danh sách: ${response.status} - ${response.statusText}`);
        }
        
        const files = await response.json();
        
        console.log(`📊 Tìm thấy ${files.length} file/folder trong thư mục`);
        
        // Debug: Log tất cả file
        files.forEach((file, index) => {
            console.log(`  ${index + 1}. ${file.type === 'dir' ? '📁' : '📄'} ${file.name} (${file.type}, ${file.size} bytes)`);
        });
        
        // Lọc chỉ lấy file JSON
        const reportFiles = files.filter(file => 
            file.type === 'file' && 
            file.name.endsWith('.json')
        );
        
        console.log(`🔍 Tìm thấy ${reportFiles.length} file JSON:`);
        reportFiles.forEach((file, index) => {
            console.log(`  ${index + 1}. ${file.name} (${file.size} bytes)`);
        });
        
        if (reportFiles.length === 0) {
            console.log('⚠️ Không tìm thấy file báo cáo JSON nào');
            return [];
        }
        
        const reports = [];
        
        // Tải từng file
        for (const file of reportFiles) {
            try {
                console.log(`\n⬇️  Đang tải file: ${file.name}...`);
                
                const fileContent = await this.getSimpleFile(file.path);
                
                if (fileContent) {
                    console.log(`✅ Đã tải ${file.name}, kích thước: ${fileContent.length} chars`);
                    
                    try {
                        const reportData = JSON.parse(fileContent);
                        
                        // Kiểm tra cấu trúc báo cáo
                        if (reportData && typeof reportData === 'object') {
                            console.log(`📊 File ${file.name} chứa báo cáo ngày: ${reportData.date || 'Không xác định'}`);
                            reports.push(reportData);
                        } else {
                            console.warn(`⚠️ File ${file.name} không phải JSON hợp lệ`);
                        }
                    } catch (parseError) {
                        console.error(`❌ Lỗi parse JSON file ${file.name}:`, parseError);
                        console.log('Nội dung file (100 ký tự đầu):', fileContent.substring(0, 100));
                    }
                } else {
                    console.warn(`⚠️ Không thể tải nội dung file ${file.name}`);
                }
            } catch (error) {
                console.error(`❌ Lỗi khi xử lý file ${file.name}:`, error);
            }
        }
        
        console.log(`\n🎯 ĐÃ TẢI XONG: ${reports.length}/${reportFiles.length} báo cáo từ GitHub`);
        
        // Thống kê
        if (reports.length > 0) {
            const dates = [...new Set(reports.map(r => r.date))];
            console.log(`📅 Các ngày có báo cáo: ${dates.join(', ')}`);
        }
        
        return reports;
        
    } catch (error) {
        console.error('❌ Lỗi tải báo cáo từ GitHub:', error);
        throw error;
    }
}

// Tải file đơn giản - FIXED BASE64 DECODE
async getSimpleFile(path) {
    if (!this.initialized || !this.token) {
        console.warn('GitHub chưa được cấu hình đúng cách');
        return null;
    }
    
    try {
        const apiUrl = `${this.baseUrl}/repos/${this.repo}/contents/${path}?ref=${this.branch}`;
        
        console.log('Tải file từ GitHub:', path);
        
        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `token ${this.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            
            // Debug: Kiểm tra dữ liệu trả về
            console.log('GitHub API response:', {
                name: data.name,
                size: data.size,
                encoding: data.encoding,
                hasContent: !!data.content,
                contentLength: data.content ? data.content.length : 0
            });
            
            if (data.content && data.encoding === 'base64') {
                // FIX: Decode base64 đúng cách
                const base64Content = data.content.replace(/\s/g, '');
                
                try {
                    // Cách 1: Sử dụng atob
                    const decodedContent = atob(base64Content);
                    console.log(`✅ Đã decode file ${data.name}, kích thước: ${decodedContent.length} chars`);
                    return decodedContent;
                } catch (decodeError) {
                    console.error('Lỗi decode base64 (atob):', decodeError);
                    
                    try {
                        // Cách 2: Sử dụng Buffer (nếu có)
                        if (typeof Buffer !== 'undefined') {
                            const buffer = Buffer.from(base64Content, 'base64');
                            const decodedContent = buffer.toString('utf-8');
                            console.log(`✅ Đã decode bằng Buffer, kích thước: ${decodedContent.length} chars`);
                            return decodedContent;
                        }
                    } catch (bufferError) {
                        console.error('Lỗi decode bằng Buffer:', bufferError);
                    }
                    
                    // Cách 3: Thử decode thủ công
                    try {
                        const decodedContent = decodeURIComponent(escape(atob(base64Content)));
                        console.log(`✅ Đã decode thủ công, kích thước: ${decodedContent.length} chars`);
                        return decodedContent;
                    } catch (manualError) {
                        console.error('Lỗi decode thủ công:', manualError);
                    }
                }
            } else if (data.content) {
                console.log(`File ${data.name} không phải base64, trả về trực tiếp`);
                return data.content;
            }
            
            console.warn(`File ${data.name} không có nội dung hoặc encoding không hợp lệ`);
            return null;
            
        } else if (response.status === 404) {
            console.log(`❌ File ${path} không tồn tại`);
            return null;
        } else {
            const errorText = await response.text();
            console.error(`❌ Lỗi tải file ${path}:`, {
                status: response.status,
                statusText: response.statusText,
                error: errorText
            });
            return null;
        }
    } catch (error) {
        console.error(`❌ Lỗi khi tải file ${path}:`, error);
        return null;
    }
}

    // Đồng bộ dữ liệu từ GitHub về local
    async syncFromGitHub() {
        if (!this.initialized) {
            return { success: false, message: 'GitHub chưa được cấu hình' };
        }
        
        try {
            console.log('Bắt đầu đồng bộ dữ liệu từ GitHub...');
            
            // Tải tất cả báo cáo từ GitHub
            const reports = await this.loadAllReportsFromGitHub();
            
            // Lưu từng báo cáo vào local database
            let savedCount = 0;
            let errorCount = 0;
            
            for (const report of reports) {
                try {
                    await dataManager.saveReport(report);
                    savedCount++;
                } catch (error) {
                    console.error(`Lỗi lưu báo cáo ${report.date}:`, error);
                    errorCount++;
                }
            }
            
            return {
                success: true,
                message: `Đồng bộ hoàn tất. Đã lưu ${savedCount} báo cáo, ${errorCount} lỗi.`,
                savedCount,
                errorCount
            };
        } catch (error) {
            console.error('Error syncing from GitHub:', error);
            return {
                success: false,
                message: `Lỗi đồng bộ: ${error.message}`
            };
        }
    }

    // Lấy thông tin cài đặt hiện tại
    getSettings() {
        return {
            token: this.token ? '********' + this.token.slice(-4) : null,
            repo: this.repo,
            branch: this.branch,
            folder: this.folder,
            initialized: this.initialized
        };
    }
}

// Khởi tạo GitHubManager toàn cục
const githubManager = new GitHubManager();