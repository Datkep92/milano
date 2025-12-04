
// =========================================================
// GITHUB SYNC SYSTEM - COMPLETE VERSION
// =========================================================

// KHÔNG khai báo lại githubSync ở đây vì đã có trong database.js
// Sử dụng biến githubSync từ database.js

// Sync queue for background processing
let syncQueue = [];
let isSyncing = false;

// =========================================================
// 1. INITIALIZATION & SETTINGS
// =========================================================

// Load GitHub settings from localStorage
function loadGitHubSettings() {
    try {
        githubSync.token = localStorage.getItem('github_token') || '';
        githubSync.repo = localStorage.getItem('github_repo') || 'Datkep92/milano';
        githubSync.branch = localStorage.getItem('github_branch') || 'main';
        githubSync.dataPath = localStorage.getItem('github_data_path') || 'data';
        githubSync.autoSync = localStorage.getItem('github_auto_sync') !== 'false';
        githubSync.autoPull = localStorage.getItem('github_auto_pull') !== 'false';
        
        if (githubSync.token && githubSync.repo) {
            githubSync.enabled = true;
            
            // Parse owner và repo name
            const parts = githubSync.repo.split('/');
            if (parts.length === 2) {
                githubSync.owner = parts[0];
                githubSync.repoName = parts[1];
            }
            
            console.log('✅ GitHub settings loaded:', {
                enabled: githubSync.enabled,
                repo: githubSync.repo,
                autoSync: githubSync.autoSync,
                autoPull: githubSync.autoPull
            });
            
            // Auto pull data on page load if enabled
            if (githubSync.autoPull) {
                setTimeout(() => {
                    checkForUpdatesFromGitHub();
                }, 2000); // Delay 2 seconds after page load
            }
            
        } else {
            console.log('⚠️ GitHub sync disabled: No token or repo configured');
            githubSync.enabled = false;
        }
        
    } catch (error) {
        console.error('❌ Error loading GitHub settings:', error);
        githubSync.enabled = false;
    }
}

// Save GitHub settings to localStorage
function saveGitHubSettings(settings) {
    try {
        localStorage.setItem('github_token', settings.token || '');
        localStorage.setItem('github_repo', settings.repo || 'Datkep92/milano');
        localStorage.setItem('github_branch', settings.branch || 'main');
        localStorage.setItem('github_data_path', settings.dataPath || 'data');
        localStorage.setItem('github_auto_sync', settings.autoSync ? 'true' : 'false');
        localStorage.setItem('github_auto_pull', settings.autoPull ? 'true' : 'false');
        
        // Reload settings
        loadGitHubSettings();
        
        console.log('✅ GitHub settings saved');
        return true;
    } catch (error) {
        console.error('❌ Error saving GitHub settings:', error);
        return false;
    }
}

// =========================================================
// 2. SETTINGS POPUP
// =========================================================

// Show GitHub settings popup
function showGitHubSettingsPopup() {
    const popupHTML = `
        <div class="popup github-settings-popup">
            <button class="close-popup" data-action="close-popup">×</button>
            <h3>⚙️ GitHub Sync Settings</h3>
            
            <div class="form-group">
                <label for="githubToken">GitHub Token:</label>
                <input type="password" id="githubToken" 
                       value="${githubSync.token}" 
                       placeholder="Nhập GitHub Personal Access Token">
                <small class="form-hint">
                    <a href="https://github.com/settings/tokens" target="_blank">
                        Tạo token tại đây (cần repo scope)
                    </a>
                </small>
            </div>
            
            <div class="form-group">
                <label for="githubRepo">Repository:</label>
                <input type="text" id="githubRepo" 
                       value="${githubSync.repo}" 
                       placeholder="owner/repo-name">
                <small class="form-hint">Ví dụ: Datkep92/milano</small>
            </div>
            
            <div class="form-group">
                <label for="githubBranch">Branch:</label>
                <input type="text" id="githubBranch" 
                       value="${githubSync.branch}" 
                       placeholder="main">
            </div>
            
            <div class="form-group">
                <label for="githubDataPath">Data Path:</label>
                <input type="text" id="githubDataPath" 
                       value="${githubSync.dataPath}" 
                       placeholder="data">
                <small class="form-hint">Thư mục chứa dữ liệu trong repo</small>
            </div>
            
            <div class="form-group checkbox-group">
                <label>
                    <input type="checkbox" id="githubAutoSync" ${githubSync.autoSync ? 'checked' : ''}>
                    Tự động đồng bộ lên GitHub
                </label>
                <small class="form-hint">Tự động đẩy dữ liệu thay đổi lên GitHub</small>
            </div>
            
            <div class="form-group checkbox-group">
                <label>
                    <input type="checkbox" id="githubAutoPull" ${githubSync.autoPull ? 'checked' : ''}>
                    Tự động tải dữ liệu từ GitHub
                </label>
                <small class="form-hint">Tự động kéo dữ liệu mới khi vào trang</small>
            </div>
            
            <div class="github-actions">
                <button class="btn btn-test" id="testGitHubConnection">
                    🔗 Test Connection
                </button>
                
                <button class="btn btn-pull" id="pullFromGitHub">
                    ⬇️ Pull Now
                </button>
                
                <button class="btn btn-push" id="pushToGitHub">
                    ⬆️ Push Now
                </button>
            </div>
            
            <div class="popup-actions">
                <button class="btn btn-secondary" data-action="close-popup">Đóng</button>
                <button class="btn btn-primary" id="saveGitHubSettings">💾 Save Settings</button>
            </div>
            
            <div id="githubStatus" class="status-message"></div>
        </div>
    `;

    showPopup(popupHTML);
    
    // Setup event listeners
    setTimeout(() => {
        setupGitHubSettingsEventListeners();
    }, 100);
}

// Setup GitHub settings popup event listeners
function setupGitHubSettingsEventListeners() {
    // Test connection button
    const testBtn = document.getElementById('testGitHubConnection');
    if (testBtn) {
        testBtn.addEventListener('click', async function() {
            testBtn.disabled = true;
            testBtn.textContent = 'Testing...';
            
            const statusDiv = document.getElementById('githubStatus');
            statusDiv.innerHTML = '<div class="status-loading">Đang kiểm tra kết nối...</div>';
            
            const result = await testGitHubConnection();
            
            testBtn.disabled = false;
            testBtn.textContent = '🔗 Test Connection';
            
            if (result.success) {
                statusDiv.innerHTML = `<div class="status-success">✅ ${result.message}</div>`;
            } else {
                statusDiv.innerHTML = `<div class="status-error">❌ ${result.message}</div>`;
            }
        });
    }
    
    // Pull from GitHub button
    const pullBtn = document.getElementById('pullFromGitHub');
    if (pullBtn) {
        pullBtn.addEventListener('click', async function() {
            pullBtn.disabled = true;
            pullBtn.textContent = 'Pulling...';
            
            const statusDiv = document.getElementById('githubStatus');
            statusDiv.innerHTML = '<div class="status-loading">Đang tải dữ liệu từ GitHub...</div>';
            
            const result = await pullFromGitHub();
            
            pullBtn.disabled = false;
            pullBtn.textContent = '⬇️ Pull Now';
            
            if (result.success) {
                statusDiv.innerHTML = `<div class="status-success">✅ ${result.message}</div>`;
                showMessage('Đã tải dữ liệu mới từ GitHub!', 'success');
                
                // Reload current tab to show new data
                const activeTab = document.querySelector('.tab-btn.active');
                if (activeTab) {
                    const tabId = activeTab.dataset.tab;
                    setTimeout(() => {
                        if (typeof window[`load${tabId.charAt(0).toUpperCase() + tabId.slice(1)}`] === 'function') {
                            window[`load${tabId.charAt(0).toUpperCase() + tabId.slice(1)}`]();
                        }
                    }, 500);
                }
            } else {
                statusDiv.innerHTML = `<div class="status-error">❌ ${result.message}</div>`;
            }
        });
    }
    
    // Push to GitHub button
    const pushBtn = document.getElementById('pushToGitHub');
    if (pushBtn) {
        pushBtn.addEventListener('click', async function() {
            pushBtn.disabled = true;
            pushBtn.textContent = 'Pushing...';
            
            const statusDiv = document.getElementById('githubStatus');
            statusDiv.innerHTML = '<div class="status-loading">Đang đẩy dữ liệu lên GitHub...</div>';
            
            const result = await pushToGitHub();
            
            pushBtn.disabled = false;
            pushBtn.textContent = '⬆️ Push Now';
            
            if (result.success) {
                statusDiv.innerHTML = `<div class="status-success">✅ ${result.message}</div>`;
                showMessage('Đã đồng bộ dữ liệu lên GitHub!', 'success');
            } else {
                statusDiv.innerHTML = `<div class="status-error">❌ ${result.message}</div>`;
            }
        });
    }
    
    // Save settings button
    const saveBtn = document.getElementById('saveGitHubSettings');
    if (saveBtn) {
        saveBtn.addEventListener('click', function() {
            const token = document.getElementById('githubToken').value.trim();
            const repo = document.getElementById('githubRepo').value.trim();
            const branch = document.getElementById('githubBranch').value.trim();
            const dataPath = document.getElementById('githubDataPath').value.trim();
            const autoSync = document.getElementById('githubAutoSync').checked;
            const autoPull = document.getElementById('githubAutoPull').checked;
            
            if (!token) {
                showMessage('Vui lòng nhập GitHub Token', 'error');
                return;
            }
            
            if (!repo || !repo.includes('/')) {
                showMessage('Repository phải có định dạng: owner/repo-name', 'error');
                return;
            }
            
            const success = saveGitHubSettings({
                token,
                repo,
                branch,
                dataPath,
                autoSync,
                autoPull
            });
            
            if (success) {
                showMessage('Đã lưu cài đặt GitHub!', 'success');
                setTimeout(() => {
                    closePopup();
                }, 1000);
            }
        });
    }
}

// =========================================================
// 3. GITHUB API FUNCTIONS
// =========================================================

// Test GitHub connection
async function testGitHubConnection() {
    try {
        if (!githubSync.token) {
            return {
                success: false,
                message: '❌ Chưa nhập GitHub Token'
            };
        }
        
        if (!githubSync.repo || !githubSync.repo.includes('/')) {
            return {
                success: false,
                message: '❌ Repository không hợp lệ'
            };
        }
        
        const parts = githubSync.repo.split('/');
        if (parts.length !== 2) {
            return {
                success: false,
                message: '❌ Repository phải có định dạng: owner/repo-name'
            };
        }
        
        const owner = parts[0];
        const repoName = parts[1];
        const apiUrl = `https://api.github.com/repos/${owner}/${repoName}`;
        
        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `token ${githubSync.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (response.ok) {
            const repoInfo = await response.json();
            return {
                success: true,
                message: `✅ Kết nối thành công đến ${repoInfo.full_name}`,
                repo: repoInfo
            };
        } else {
            const errorText = await response.text();
            let errorMessage = `GitHub API error: ${response.status}`;
            
            if (response.status === 401) {
                errorMessage = '❌ Token không hợp lệ hoặc hết hạn';
            } else if (response.status === 404) {
                errorMessage = '❌ Repository không tồn tại hoặc không có quyền truy cập';
            } else if (response.status === 403) {
                errorMessage = '❌ Token không đủ quyền hoặc bị giới hạn rate limit';
            }
            
            return {
                success: false,
                message: errorMessage,
                status: response.status
            };
        }
        
    } catch (error) {
        console.error('❌ GitHub connection test failed:', error);
        
        let errorMessage = `❌ Lỗi kết nối: ${error.message}`;
        if (error.message.includes('Failed to fetch')) {
            errorMessage = '❌ Không thể kết nối đến GitHub. Kiểm tra mạng internet.';
        }
        
        return {
            success: false,
            message: errorMessage,
            error: error.message
        };
    }
}

// Download file from GitHub
async function downloadFromGitHub(filepath) {
    try {
        if (!githubSync.enabled || !githubSync.token || !githubSync.owner || !githubSync.repoName) {
            return null;
        }
        
        const apiUrl = `https://api.github.com/repos/${githubSync.owner}/${githubSync.repoName}/contents/${filepath}?ref=${githubSync.branch}`;
        
        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `token ${githubSync.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.content && data.encoding === 'base64') {
                try {
                    // FIX: Sử dụng TextDecoder cho UTF-8
                    const binaryString = atob(data.content);
                    const bytes = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    const decoder = new TextDecoder('utf-8');
                    const decodedContent = decoder.decode(bytes);
                    return JSON.parse(decodedContent);
                } catch (parseError) {
                    console.error('❌ Error parsing JSON:', parseError);
                    return null;
                }
            }
        } else if (response.status === 404) {
            console.log(`📭 File not found: ${filepath}`);
            return null;
        }
        
        return null;
        
    } catch (error) {
        console.error(`❌ Error downloading ${filepath} from GitHub:`, error);
        return null;
    }
}

// Upload file to GitHub
async function uploadToGitHub(filename, content) {
    try {
        if (!githubSync.enabled || !githubSync.token || !githubSync.owner || !githubSync.repoName) {
            return false;
        }
        
        const apiUrl = `https://api.github.com/repos/${githubSync.owner}/${githubSync.repoName}/contents/${filename}`;
        
        // Check if file exists to get SHA
        let sha = null;
        try {
            const existingResponse = await fetch(apiUrl + `?ref=${githubSync.branch}`, {
                headers: {
                    'Authorization': `token ${githubSync.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (existingResponse.ok) {
                const existingData = await existingResponse.json();
                sha = existingData.sha;
            }
        } catch (e) {
            // File doesn't exist, will create new
        }
        
        // Prepare base64 content
        const contentString = JSON.stringify(content, null, 2);
        const contentBase64 = btoa(unescape(encodeURIComponent(contentString)));
        
        // Create request body
        const body = {
            message: `Update ${filename} via Cafe Management App`,
            content: contentBase64,
            branch: githubSync.branch
        };
        
        if (sha) {
            body.sha = sha; // Need SHA to update existing file
        }
        
        // Upload to GitHub
        const response = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${githubSync.token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        
        if (response.ok) {
            console.log(`✅ Uploaded to GitHub: ${filename}`);
            return true;
        } else {
            const errorText = await response.text();
            console.error(`❌ GitHub upload error for ${filename}:`, errorText);
            return false;
        }
        
    } catch (error) {
        console.error(`❌ Error uploading ${filename} to GitHub:`, error);
        return false;
    }
}

// Get file metadata (last modified time)
async function getGitHubFileMetadata(filepath) {
    try {
        if (!githubSync.enabled || !githubSync.token || !githubSync.owner || !githubSync.repoName) {
            return null;
        }
        
        const apiUrl = `https://api.github.com/repos/${githubSync.owner}/${githubSync.repoName}/contents/${filepath}?ref=${githubSync.branch}`;
        
        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `token ${githubSync.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            return {
                sha: data.sha,
                size: data.size,
                lastModified: new Date(data.sha).getTime() // Use SHA as timestamp proxy
            };
        }
        
        return null;
        
    } catch (error) {
        console.error(`❌ Error getting metadata for ${filepath}:`, error);
        return null;
    }
}

// =========================================================
// 4. DATA SYNC FUNCTIONS
// =========================================================

// Check for updates from GitHub (only pull if newer)
async function checkForUpdatesFromGitHub() {
    try {
        if (!githubSync.enabled || !githubSync.autoPull) {
            return { success: false, message: 'Auto pull disabled' };
        }
        
        console.log('🔄 Checking for updates from GitHub...');
        
        const storesToCheck = ['employees', 'inventory', 'reports'];
        let needsUpdate = false;
        
        // Check each store for updates
        for (const storeName of storesToCheck) {
            const filename = `${githubSync.dataPath}/${storeName}.json`;
            const githubMetadata = await getGitHubFileMetadata(filename);
            
            if (githubMetadata) {
                // Get local metadata
                const localMetadata = await getLocalMetadata(storeName);
                
                // Compare SHA or timestamp
                if (!localMetadata || githubMetadata.sha !== localMetadata.lastSha) {
                    console.log(`📥 New data available for ${storeName}`);
                    needsUpdate = true;
                    break;
                }
            }
        }
        
        if (needsUpdate) {
            console.log('📥 Updates available, pulling from GitHub...');
            return await pullFromGitHub();
        } else {
            console.log('✅ Data is up to date with GitHub');
            return {
                success: true,
                message: 'Data is up to date',
                updated: false
            };
        }
        
    } catch (error) {
        console.error('❌ Error checking for updates:', error);
        return {
            success: false,
            message: `Error checking updates: ${error.message}`,
            updated: false
        };
    }
}

// Get local metadata for a store
async function getLocalMetadata(storeName) {
    try {
        const metadata = await dbGet('sync_metadata', storeName);
        return metadata || null;
    } catch (error) {
        return null;
    }
}

// Save local metadata
async function saveLocalMetadata(storeName, sha) {
    try {
        await dbUpdate('sync_metadata', storeName, {
            storeName: storeName,
            lastSha: sha,
            lastSync: new Date().toISOString()
        });
    } catch (error) {
        console.error(`❌ Error saving metadata for ${storeName}:`, error);
    }
}

// Sửa hàm pullFromGitHub trong github-sync.js
async function pullFromGitHub() {
    try {
        if (!githubSync.enabled) {
            return {
                success: false,
                message: 'GitHub sync is not enabled'
            };
        }
        
        console.log('📥 Pulling data from GitHub...');
        
        // First check connection
        const connectionTest = await testGitHubConnection();
        if (!connectionTest.success) {
            return connectionTest;
        }
        
        showLoading(true);
        
        const stores = ['employees', 'inventory'];
        let totalSynced = 0;
        let updatedStores = [];
        
        // Pull each store
        for (const storeName of stores) {
            const filename = `${githubSync.dataPath}/${storeName}.json`;
            console.log(`📥 Downloading: ${filename}`);
            
            const fileData = await downloadFromGitHub(filename);
            
            if (fileData && Array.isArray(fileData)) {
                // Get current data
                const currentData = await dbGetAll(storeName);
                
                // Only update if data is different
                const currentHash = JSON.stringify(currentData.sort((a, b) => 
                    (a.id || a.employeeId || '').localeCompare(b.id || b.employeeId || '')
                ));
                const newHash = JSON.stringify(fileData.sort((a, b) => 
                    (a.id || a.employeeId || '').localeCompare(b.id || b.employeeId || '')
                ));
                
                if (currentHash !== newHash) {
                    // Clear old data
                    await dbClear(storeName);
                    
                    // Add new data - ĐẢM BẢO CÓ KEY PATH
                    for (const item of fileData) {
                        try {
                            let itemWithSync = {
                                ...item,
                                _source: 'github',
                                _synced: true,
                                _lastPull: new Date().toISOString()
                            };
                            
                            // ĐẢM BẢO inventory items có đúng key path
                            if (storeName === 'inventory') {
                                // Thêm cả id và itemId để đảm bảo
                                if (!itemWithSync.id && itemWithSync.itemId) {
                                    itemWithSync.id = itemWithSync.itemId;
                                } else if (!itemWithSync.id && !itemWithSync.itemId) {
                                    // Tạo id từ name
                                    const nameSlug = item.name ? item.name.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'item';
                                    itemWithSync.id = `${nameSlug}_${Date.now()}`;
                                    itemWithSync.itemId = itemWithSync.id;
                                }
                            }
                            
                            // Sử dụng dbAdd đã được sửa để tự động fix key path
                            await dbAdd(storeName, itemWithSync);
                            totalSynced++;
                        } catch (addError) {
                            console.warn(`⚠️ Could not add item to ${storeName}:`, addError);
                            // Continue với item tiếp theo
                        }
                    }
                    
                    updatedStores.push(storeName);
                    console.log(`✅ ${storeName}: ${fileData.length} records processed`);
                } else {
                    console.log(`📭 ${storeName}: No changes, skipping`);
                }
                
                // Save metadata
                try {
                    const metadata = await getGitHubFileMetadata(filename);
                    if (metadata) {
                        await saveLocalMetadata(storeName, metadata.sha);
                    }
                } catch (metaError) {
                    console.warn(`⚠️ Could not save metadata for ${storeName}:`, metaError);
                }
            } else {
                console.log(`📭 No data found for ${storeName}`);
            }
        }
        
        // Pull reports separately
        const reportsFilename = `${githubSync.dataPath}/reports.json`;
        const reportsData = await downloadFromGitHub(reportsFilename);
        
        if (reportsData && Array.isArray(reportsData)) {
            for (const report of reportsData) {
                if (report.date) {
                    try {
                        const reportId = report.date.replace(/-/g, '');
                        const existingReport = await dbGet('reports', reportId);
                        
                        // Only update if doesn't exist or is newer
                        if (!existingReport || (report.updatedAt > existingReport.updatedAt)) {
                            await dbUpdate('reports', reportId, {
                                ...report,
                                _source: 'github',
                                _synced: true,
                                _lastPull: new Date().toISOString()
                            });
                            totalSynced++;
                        }
                    } catch (reportError) {
                        console.warn(`⚠️ Could not update report:`, reportError);
                    }
                }
            }
            
            if (reportsData.length > 0) {
                updatedStores.push('reports');
                console.log(`✅ Reports: ${reportsData.length} records checked`);
            }
        }
        
        // Update last sync time
        const syncTime = new Date().toISOString();
        localStorage.setItem('last_github_pull', syncTime);
        githubSync.lastSync = new Date(syncTime);
        
        showLoading(false);
        
        if (updatedStores.length > 0) {
            console.log(`✅ Pull complete: Processed ${totalSynced} records in ${updatedStores.join(', ')}`);
            return {
                success: true,
                message: `Đã cập nhật ${totalSynced} bản ghi từ GitHub`,
                totalSynced,
                updatedStores,
                updated: true
            };
        } else {
            return {
                success: true,
                message: 'Dữ liệu đã đồng bộ, không có thay đổi',
                totalSynced: 0,
                updatedStores: [],
                updated: false
            };
        }
        
    } catch (error) {
        console.error('❌ Error pulling from GitHub:', error);
        showLoading(false);
        return {
            success: false,
            message: `Lỗi khi tải dữ liệu: ${error.message}`
        };
    }
}

// Push data to GitHub
async function pushToGitHub() {
    try {
        if (!githubSync.enabled) {
            return {
                success: false,
                message: 'GitHub sync is not enabled'
            };
        }
        
        console.log('⬆️ Pushing data to GitHub...');
        
        // First check connection
        const connectionTest = await testGitHubConnection();
        if (!connectionTest.success) {
            return connectionTest;
        }
        
        showLoading(true);
        
        const stores = ['employees', 'inventory'];
        let totalSynced = 0;
        
        // Push each store
        for (const storeName of stores) {
            const data = await dbGetAll(storeName);
            if (data.length > 0) {
                // Clean data (remove internal fields)
                const cleanData = data.map(item => {
                    const { _synced, _source, _lastPull, _lastSync, ...cleanItem } = item;
                    return cleanItem;
                });
                
                const filename = `${githubSync.dataPath}/${storeName}.json`;
                const success = await uploadToGitHub(filename, cleanData);
                
                if (success) {
                    totalSynced += data.length;
                    console.log(`✅ Uploaded ${storeName}: ${data.length} records`);
                    
                    // Save metadata
                    const metadata = await getGitHubFileMetadata(filename);
                    if (metadata) {
                        await saveLocalMetadata(storeName, metadata.sha);
                    }
                }
            }
        }
        
        // Push reports
        const reports = await dbGetAll('reports');
        if (reports.length > 0) {
            const cleanReports = reports.map(report => {
                const { _synced, _source, _lastPull, _lastSync, ...cleanReport } = report;
                return cleanReport;
            });
            
            const reportsFilename = `${githubSync.dataPath}/reports.json`;
            const success = await uploadToGitHub(reportsFilename, cleanReports);
            
            if (success) {
                totalSynced += reports.length;
                console.log(`✅ Uploaded reports: ${reports.length} records`);
            }
        }
        
        // Create/update metadata file
        const metadata = {
            lastSync: new Date().toISOString(),
            deviceId: localStorage.getItem('device_id') || 'unknown',
            user: getCurrentUser()?.name || 'unknown',
            totalRecords: totalSynced,
            version: '1.0.0',
            app: 'Cafe Management System'
        };
        
        await uploadToGitHub(`${githubSync.dataPath}/metadata.json`, metadata);
        
        // Update last sync time
        const syncTime = new Date().toISOString();
        localStorage.setItem('last_github_push', syncTime);
        githubSync.lastSync = new Date(syncTime);
        
        showLoading(false);
        
        console.log(`✅ Push complete: ${totalSynced} records uploaded`);
        return {
            success: true,
            message: `Đã đồng bộ ${totalSynced} bản ghi lên GitHub`,
            totalSynced: totalSynced
        };
        
    } catch (error) {
        console.error('❌ Error pushing to GitHub:', error);
        showLoading(false);
        return {
            success: false,
            message: `Lỗi khi đồng bộ: ${error.message}`
        };
    }
}

// Queue sync for background processing
async function queueBackgroundSync(storeName, operation, data) {
    const syncJob = {
        id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        storeName,
        operation,
        data,
        timestamp: new Date().toISOString(),
        status: 'queued'
    };
    
    syncQueue.push(syncJob);
    console.log(`📝 Queued sync: ${storeName} (${operation})`);
    
    // Save to IndexedDB
    try {
        await dbAdd('sync_queue', {
            id: syncJob.id,
            ...syncJob
        });
    } catch (e) {
        console.log('⚠️ Could not save sync job to DB');
    }
    
    // Trigger background sync if autoSync is enabled
    if (githubSync.autoSync && githubSync.enabled) {
        triggerBackgroundSync();
    }
}

// Process background sync queue
async function processBackgroundSync() {
    if (isSyncing || !githubSync.enabled || syncQueue.length === 0) {
        return;
    }
    
    isSyncing = true;
    console.log(`🔄 Processing ${syncQueue.length} sync jobs...`);
    
    try {
        // Push all changes to GitHub
        const result = await pushToGitHub();
        
        if (result.success) {
            // Mark jobs as completed
            const allJobs = await dbGetAll('sync_queue');
            for (const job of allJobs) {
                if (job.status === 'queued') {
                    await dbUpdate('sync_queue', job.id, {
                        status: 'completed',
                        completedAt: new Date().toISOString()
                    });
                }
            }
            
            // Clear completed jobs from memory
            syncQueue = syncQueue.filter(job => job.status !== 'completed');
        }
        
    } catch (error) {
        console.error('❌ Background sync failed:', error);
        // Retry after delay
        setTimeout(processBackgroundSync, 5000);
    } finally {
        isSyncing = false;
    }
}

// Trigger background sync with delay
function triggerBackgroundSync() {
    if (!githubSync.enabled || !githubSync.autoSync) return;
    
    clearTimeout(window.syncTimeout);
    window.syncTimeout = setTimeout(() => {
        if (syncQueue.length > 0) {
            processBackgroundSync();
        }
    }, 3000); // 3 second delay
}

// =========================================================
// 5. SETTINGS TAB FUNCTIONS
// =========================================================

// Load settings tab
function loadSettings() {
    const container = document.getElementById('settings');
    if (!container) return;
    
    // Get last sync times
    const lastPull = localStorage.getItem('last_github_pull');
    const lastPush = localStorage.getItem('last_github_push');
    
    container.innerHTML = `
        <div class="settings-container">
            <h2>⚙️ Cài đặt hệ thống</h2>
            
            <div class="settings-section">
                <h3>📊 GitHub Sync</h3>
                <div class="settings-card">
                    <div class="setting-item">
                        <div class="setting-label">Trạng thái:</div>
                        <div class="setting-value">
                            <span class="status-badge ${githubSync.enabled ? 'status-on' : 'status-off'}">
                                ${githubSync.enabled ? '🟢 Đang bật' : '🔴 Đang tắt'}
                            </span>
                        </div>
                    </div>
                    
                    <div class="setting-item">
                        <div class="setting-label">Repository:</div>
                        <div class="setting-value">${githubSync.repo}</div>
                    </div>
                    
                    <div class="setting-item">
                        <div class="setting-label">Branch:</div>
                        <div class="setting-value">${githubSync.branch}</div>
                    </div>
                    
                    <div class="setting-item">
                        <div class="setting-label">Auto Sync:</div>
                        <div class="setting-value">${githubSync.autoSync ? '🟢 Bật' : '🔴 Tắt'}</div>
                    </div>
                    
                    <div class="setting-item">
                        <div class="setting-label">Auto Pull:</div>
                        <div class="setting-value">${githubSync.autoPull ? '🟢 Bật' : '🔴 Tắt'}</div>
                    </div>
                    
                    ${lastPull ? `
                    <div class="setting-item">
                        <div class="setting-label">Lần tải cuối:</div>
                        <div class="setting-value">${formatDate(lastPull)}</div>
                    </div>
                    ` : ''}
                    
                    ${lastPush ? `
                    <div class="setting-item">
                        <div class="setting-label">Lần đẩy cuối:</div>
                        <div class="setting-value">${formatDate(lastPush)}</div>
                    </div>
                    ` : ''}
                    
                    <div class="setting-actions">
                        <button class="btn btn-primary" onclick="showGitHubSettingsPopup()">
                            ⚙️ Cài đặt GitHub
                        </button>
                        
                        <button class="btn btn-secondary" onclick="pullFromGitHub().then(r => {
                            if(r.success) showMessage('Đã tải dữ liệu từ GitHub', 'success');
                            else showMessage(r.message, 'error');
                        })">
                            ⬇️ Tải từ GitHub
                        </button>
                        
                        <button class="btn btn-secondary" onclick="pushToGitHub().then(r => {
                            if(r.success) showMessage('Đã đẩy dữ liệu lên GitHub', 'success');
                            else showMessage(r.message, 'error');
                        })">
                            ⬆️ Đẩy lên GitHub
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="settings-section">
                <h3>🛠️ Công cụ</h3>
                <div class="settings-card">
                    <button class="btn btn-danger" onclick="clearLocalData()">
                        🗑️ Xóa dữ liệu local
                    </button>
                    <button class="btn btn-warning" onclick="exportLocalData()">
                        📤 Xuất dữ liệu
                    </button>
                    <button class="btn btn-info" onclick="importLocalData()">
                        📥 Nhập dữ liệu
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Utility functions
function formatDate(dateString) {
    if (!dateString) return 'Chưa bao giờ';
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN');
}

function clearLocalData() {
    if (confirm('Bạn có chắc muốn xóa tất cả dữ liệu local? Hành động này không thể hoàn tác!')) {
        indexedDB.deleteDatabase('CafeManagementDB');
        localStorage.clear();
        showMessage('Đã xóa dữ liệu local, trang sẽ được tải lại...', 'warning');
        setTimeout(() => location.reload(), 2000);
    }
}

function exportLocalData() {
    // Implementation for export
    showMessage('Tính năng đang phát triển', 'info');
}

function importLocalData() {
    // Implementation for import
    showMessage('Tính năng đang phát triển', 'info');
}

// =========================================================
// 6. INITIALIZATION & EXPORTS
// =========================================================

// Initialize GitHub sync system
async function initGitHubSync() {
    // Load settings
    loadGitHubSettings();
    
    // Load pending sync jobs
    try {
        const pendingJobs = await dbGetAll('sync_queue');
        syncQueue = pendingJobs.filter(job => job.status === 'queued');
        
        if (syncQueue.length > 0) {
            console.log(`📥 Loaded ${syncQueue.length} pending sync jobs`);
            triggerBackgroundSync();
        }
    } catch (error) {
        console.log('No sync queue found, starting fresh');
    }
    
    console.log('✅ GitHub sync system initialized');
}

// Initialize when database is ready
document.addEventListener('DOMContentLoaded', async function() {
    // Wait for database to initialize
    setTimeout(() => {
        initGitHubSync();
    }, 1000);
});

// Export functions to window
if (typeof window !== 'undefined') {
    // KHÔNG export githubSync vì đã có trong database.js
    window.showGitHubSettingsPopup = showGitHubSettingsPopup;
    window.testGitHubConnection = testGitHubConnection;
    window.pullFromGitHub = pullFromGitHub;
    window.pushToGitHub = pushToGitHub;
    window.checkForUpdatesFromGitHub = checkForUpdatesFromGitHub;
    window.queueBackgroundSync = queueBackgroundSync;
    window.loadSettings = loadSettings;
    
    console.log('✅ GitHub sync system loaded');
}
