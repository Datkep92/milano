// github.js - Xử lý GitHub API operations với Unicode support
class GitHubManager {
    constructor() {
        this.token = localStorage.getItem('github_token') || '';
        this.owner = 'Datkep92';
        this.repo = 'milano';
        this.baseUrl = 'https://api.github.com';
        this.headers = {
            'Authorization': `token ${this.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json; charset=utf-8'
        };
    }
    
    setToken(token) {
        this.token = token;
        this.headers.Authorization = `token ${token}`;
        localStorage.setItem('github_token', token);
    }
    
    async testConnection() {
        try {
            const response = await fetch(`${this.baseUrl}/repos/${this.owner}/${this.repo}`, {
                headers: this.headers
            });
            return response.ok;
        } catch (error) {
            console.error('GitHub connection test failed:', error);
            return false;
        }
    }
    
    async getFileContent(path) {
    try {
        const response = await fetch(
            `${this.baseUrl}/repos/${this.owner}/${this.repo}/contents/${encodeURIComponent(path)}`,
            { headers: this.headers }
        );
        
        if (!response.ok) {
            if (response.status === 404) return null;
            throw new Error(`GitHub API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // **CÁCH ĐƠN GIẢN NHẤT CHO UNICODE VIỆT NAM**
        const base64Content = data.content.replace(/\n/g, '');
        const binaryString = atob(base64Content);
        
        // Chuyển sang UTF-8 bằng cách thủ công
        let utf8String = '';
        for (let i = 0; i < binaryString.length; i++) {
            const charCode = binaryString.charCodeAt(i);
            
            // Xử lý UTF-8 multi-byte
            if (charCode < 128) {
                utf8String += String.fromCharCode(charCode);
            } else if (charCode > 191 && charCode < 224) {
                // 2-byte character
                if (i + 1 < binaryString.length) {
                    const nextCharCode = binaryString.charCodeAt(i + 1);
                    utf8String += String.fromCharCode(
                        ((charCode & 31) << 6) | (nextCharCode & 63)
                    );
                    i++;
                }
            } else if (charCode > 223 && charCode < 240) {
                // 3-byte character (phổ biến cho tiếng Việt)
                if (i + 2 < binaryString.length) {
                    const nextCharCode1 = binaryString.charCodeAt(i + 1);
                    const nextCharCode2 = binaryString.charCodeAt(i + 2);
                    utf8String += String.fromCharCode(
                        ((charCode & 15) << 12) | 
                        ((nextCharCode1 & 63) << 6) | 
                        (nextCharCode2 & 63)
                    );
                    i += 2;
                }
            }
            // Bỏ qua 4-byte characters (ít gặp)
        }
        
        // Parse JSON
        const parsed = JSON.parse(utf8String);
        console.log(`✅ Loaded ${path} with custom UTF-8 decoder`);
        return parsed;
        
    } catch (error) {
        console.error(`Error getting file ${path}:`, error);
        
        // Fallback: dùng cách cũ
        try {
            const data = await response.json();
            const content = atob(data.content.replace(/\n/g, ''));
            return JSON.parse(content);
        } catch (fallbackError) {
            throw error;
        }
    }
}
    


// Sửa hàm createOrUpdateFile để sửa lỗi ký tự
async createOrUpdateFile(path, content, message = 'Update data') {
    try {
        // Đảm bảo message có ký tự hợp lệ
        const cleanMessage = this.sanitizeString(message);
        
        // Encode content với UTF-8 đúng cách
        const contentStr = JSON.stringify(content, null, 2);
        const encodedContent = this.utf8ToBase64(contentStr);
        
        // Kiểm tra nếu file đã tồn tại
        let sha = null;
        try {
            const existing = await fetch(
                `${this.baseUrl}/repos/${this.owner}/${this.repo}/contents/${encodeURIComponent(path)}`,
                { headers: this.headers }
            );
            
            if (existing.ok) {
                const data = await existing.json();
                sha = data.sha;
                console.log(`📁 File exists, SHA: ${sha.substring(0, 8)}...`);
            }
        } catch (e) {
            // File chưa tồn tại
            console.log(`📝 Creating new file: ${path}`);
        }
        
        const response = await fetch(
            `${this.baseUrl}/repos/${this.owner}/${this.repo}/contents/${encodeURIComponent(path)}`,
            {
                method: 'PUT',
                headers: this.headers,
                body: JSON.stringify({
                    message: cleanMessage,
                    content: encodedContent,
                    sha: sha,
                    encoding: 'base64'
                })
            }
        );
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('GitHub API error:', errorData);
            throw new Error(`GitHub API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
        }
        
        const result = await response.json();
        console.log(`✅ File ${path} ${sha ? 'updated' : 'created'} successfully`);
        return result;
        
    } catch (error) {
        console.error(`Error in createOrUpdateFile ${path}:`, error);
        throw error;
    }
}

// Thêm hàm sanitize string
sanitizeString(str) {
    if (typeof str !== 'string') return '';
    // Loại bỏ ký tự control và giữ lại Unicode hợp lệ
    return str.replace(/[\x00-\x1F\x7F-\x9F]/g, '').trim();
}
    
    async deleteFile(path, message = 'Delete file') {
        try {
            // Cần SHA để xóa
            const response = await fetch(
                `${this.baseUrl}/repos/${this.owner}/${this.repo}/contents/${encodeURIComponent(path)}`,
                { headers: this.headers }
            );
            
            if (!response.ok) {
                if (response.status === 404) {
                    return true; // File không tồn tại
                }
                throw new Error(`GitHub API error: ${response.status}`);
            }
            
            const data = await response.json();
            const sha = data.sha;
            
            const deleteResponse = await fetch(
                `${this.baseUrl}/repos/${this.owner}/${this.repo}/contents/${encodeURIComponent(path)}`,
                {
                    method: 'DELETE',
                    headers: this.headers,
                    body: JSON.stringify({
                        message: message,
                        sha: sha
                    })
                }
            );
            
            return deleteResponse.ok;
        } catch (error) {
            console.error(`Error deleting file ${path}:`, error);
            throw error;
        }
    }
    
    async listFiles(path = '') {
        try {
            const response = await fetch(
                `${this.baseUrl}/repos/${this.owner}/${this.repo}/contents/${encodeURIComponent(path)}`,
                { headers: this.headers }
            );
            
            if (!response.ok) {
                return [];
            }
            
            const data = await response.json();
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('Error listing files:', error);
            return [];
        }
    }
    
    async getDBIndex() {
        try {
            const index = await this.getFileContent('dbindex.json');
            if (index) {
                return index;
            }
            
            // Tạo DB index mới nếu chưa có
            const newIndex = {
                version: '2.0',
                lastUpdated: new Date().toISOString(),
                files: {},
                modules: {
                    reports: { latest: null, files: {} },
                    inventory: { latest: null, files: {} },
                    employees: { latest: null, files: {} }
                }
            };
            
            await this.createOrUpdateFile('dbindex.json', newIndex, 'Initialize DB index');
            return newIndex;
            
        } catch (error) {
            console.error('Error getting DB index:', error);
            return null;
        }
    }
    
    async updateDBIndex(dbIndex) {
        try {
            dbIndex.lastUpdated = new Date().toISOString();
            await this.createOrUpdateFile('dbindex.json', dbIndex, 'Update DB index');
            return true;
        } catch (error) {
            console.error('Error updating DB index:', error);
            return false;
        }
    }
    
   utf8ToBase64(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const binary = String.fromCharCode.apply(null, data);
    return btoa(binary);
}

base64ToUtf8(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(bytes);
}
}

// Khởi tạo singleton
window.githubManager = new GitHubManager();