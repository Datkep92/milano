// ========== FIREBASE SYNC PRO - DÙNG CHUNG DỮ LIỆU (CÓ ADMIN EXPENSES) ==========
// ĐÃ SỬA LỖI ĐỒNG BỘ 2 CHIỀU

// ========== CẤU HÌNH ==========
const STORE_ID = "milano_coffee_259";
const SYNC_DEBOUNCE_MS = 200;        // Giảm từ 500ms xuống 200ms
const REALTIME_LOCK_MS = 100;        // Giảm từ 500ms xuống 100ms
const MAX_RETRY_COUNT = 3;           // Số lần retry tối đa khi load thất bại
const RETRY_DELAY_MS = 1000;         // Thời gian chờ giữa các lần retry
let isSyncing = false;
let syncQueue = [];
let deviceId = null;
let syncDebounceTimer = null;
let isLoading = false;
let isInitialized = false;
let currentUserId = null;
let realtimeListenerRef = null; // Tham chiếu để cleanup

// Flags
window._isRealtimeUpdate = false;
window._syncVersion = 0;

// Khởi tạo device ID
function initDeviceId() {
  deviceId = localStorage.getItem("deviceId");
  if (!deviceId) {
    deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem("deviceId", deviceId);
  }
  return deviceId;
}

function saveToLocal(data, skipVersion = false) {
  if (!data) return;
  
  if (!skipVersion) {
    data._version = (data._version || 0) + 1;
    data._lastModified = Date.now();
    data._lastModifiedBy = deviceId;
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  
  // CẬP NHẬT TRỰC TIẾP BIẾN appData GỐC (cùng tham chiếu)
  // Xóa dữ liệu cũ trong appData
  Object.keys(appData).forEach(key => {
    delete appData[key];
  });
  // Gán dữ liệu mới
  Object.assign(appData, data);
  
  if (typeof ensureAppDataStructure === 'function') {
    ensureAppDataStructure();
  }
  
  return data._version;
}

// ========== ĐỒNG BỘ LÊN FIREBASE ==========
async function syncToFirebase() {
  if (window._isRealtimeUpdate) {
    console.log("⏭️ Bỏ qua sync (đang nhận dữ liệu từ realtime)");
    return;
  }
  
  if (isSyncing) {
    return new Promise((resolve) => {
      syncQueue.push(resolve);
    });
  }
  
  isSyncing = true;
  
  try {
    const user = firebase.auth().currentUser;
    if (!user) return;
    
    const localData = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!localData) return;
    
    const role = await getUserRole(user.uid);
    const isAdminUser = role === ROLES.ADMIN;
    
    console.log(`🔄 ${isAdminUser ? 'Admin' : 'Nhân viên'} đang đồng bộ...`);
    
    // Lấy tất cả ngày có dữ liệu thay đổi
    const allDates = new Set();
    
    Object.keys(localData.reports || {}).forEach(date => allDates.add(date));
    (localData.expenses || []).forEach(exp => { if (exp.date) allDates.add(exp.date); });
    (localData.adminExpenses || []).forEach(exp => { if (exp.date) allDates.add(exp.date); });
    (localData.debtTransactions || []).forEach(debt => { if (debt.date) allDates.add(debt.date); });
    
    const updates = {};
    
    for (const date of allDates) {
      const [year, month, day] = date.split('-');
      
      // Sync report
      if (localData.reports[date]) {
        const reportPath = `cafeData/${STORE_ID}/reports/${year}/${month}/${day}`;
        updates[reportPath] = {
          ...localData.reports[date],
          _syncedAt: firebase.database.ServerValue.TIMESTAMP,
          _syncedBy: user.uid,
          _syncedByEmail: user.email,
          _syncedByRole: role,
          _syncedByDevice: deviceId
        };
      }
      
      // Sync expenses
      const dayExpenses = (localData.expenses || []).filter(e => e.date === date);
      for (const exp of dayExpenses) {
        const expPath = `cafeData/${STORE_ID}/expenses/${year}/${month}/${day}/${exp.id}`;
        if (exp.deleted) {
          updates[expPath] = {
            ...exp,
            deleted: true,
            _deletedAt: Date.now(),
            _deletedBy: user.email,
            _deletedByDevice: deviceId,
            _modifiedAt: Date.now(),
            _modifiedBy: user.email,
            _modifiedByDevice: deviceId
          };
        } else {
          updates[expPath] = {
            name: exp.name,
            amount: exp.amount,
            qty: exp.qty || 0,
            deleted: false,
            _modifiedAt: exp._modifiedAt || Date.now(),
            _modifiedBy: user.email,
            _modifiedByRole: role,
            _modifiedByDevice: deviceId
          };
        }
      }
      
      // Sync debts
      const dayDebts = (localData.debtTransactions || []).filter(d => d.date === date);
      for (const debt of dayDebts) {
        const debtPath = `cafeData/${STORE_ID}/debtTransactions/${year}/${month}/${day}/${debt.id}`;
        if (debt.deleted) {
          updates[debtPath] = {
            ...debt,
            deleted: true,
            _deletedAt: Date.now(),
            _deletedBy: user.email,
            _deletedByDevice: deviceId,
            _modifiedAt: Date.now(),
            _modifiedBy: user.email,
            _modifiedByDevice: deviceId
          };
        } else {
          updates[debtPath] = {
            customer: debt.customer,
            amount: debt.amount,
            type: debt.type,
            note: debt.note || '',
            method: debt.method || '',
            deleted: false,
            _modifiedAt: debt._modifiedAt || Date.now(),
            _modifiedBy: user.email,
            _modifiedByRole: role,
            _modifiedByDevice: deviceId
          };
        }
      }
      
      // Sync adminExpenses
      const dayAdminExpenses = (localData.adminExpenses || []).filter(e => e.date === date);
      for (const exp of dayAdminExpenses) {
        const expPath = `cafeData/${STORE_ID}/adminExpenses/${year}/${month}/${day}/${exp.id}`;
        if (exp.deleted) {
          updates[expPath] = {
            ...exp,
            deleted: true,
            _deletedAt: Date.now(),
            _deletedBy: user.email,
            _deletedByDevice: deviceId
          };
        } else {
          updates[expPath] = {
            name: exp.name,
            amount: exp.amount,
            qty: exp.qty || 0,
            deleted: false,
            _modifiedAt: exp._modifiedAt || Date.now(),
            _modifiedBy: user.email,
            _modifiedByRole: role,
            _modifiedByDevice: deviceId
          };
        }
      }
    }
    
    if (Object.keys(updates).length > 0) {
      await database.ref().update(updates);
      console.log(`✅ Đã đồng bộ ${Object.keys(updates).length} thay đổi lên server`);
    }
    
    // Sync metadata
    try {
      const metadataRef = database.ref(`cafeData/${STORE_ID}/metadata`);
      
      await metadataRef.transaction((currentData) => {
        const localCategories = localData.categories || { expenses: [], adminExpenses: [], customers: [] };
        const localRecent = localData.recent || { expenses: [], adminExpenses: [], customers: [] };
        
        if (currentData === null) {
          return {
            version: Date.now(),
            lastSync: firebase.database.ServerValue.TIMESTAMP,
            syncedBy: user.uid,
            syncedByEmail: user.email,
            syncedByDevice: deviceId,
            categories: localCategories,
            recent: localRecent
          };
        }
        
        const mergedCategories = {
          expenses: [...new Set([...(currentData.categories?.expenses || []), ...(localCategories.expenses || [])])],
          adminExpenses: [...new Set([...(currentData.categories?.adminExpenses || []), ...(localCategories.adminExpenses || [])])],
          customers: [...new Set([...(currentData.categories?.customers || []), ...(localCategories.customers || [])])]
        };
        
        const mergedRecent = {
          expenses: [...new Set([...(localRecent.expenses || []), ...(currentData.recent?.expenses || [])])].slice(0, 10),
          adminExpenses: [...new Set([...(localRecent.adminExpenses || []), ...(currentData.recent?.adminExpenses || [])])].slice(0, 10),
          customers: [...new Set([...(localRecent.customers || []), ...(currentData.recent?.customers || [])])].slice(0, 10)
        };
        
        const categoriesChanged = JSON.stringify(mergedCategories) !== JSON.stringify(currentData.categories);
        const recentChanged = JSON.stringify(mergedRecent) !== JSON.stringify(currentData.recent);
        
        if (!categoriesChanged && !recentChanged) return undefined;
        
        return {
          version: Date.now(),
          lastSync: firebase.database.ServerValue.TIMESTAMP,
          syncedBy: user.uid,
          syncedByEmail: user.email,
          syncedByDevice: deviceId,
          categories: mergedCategories,
          recent: mergedRecent
        };
      });
      
      console.log(`✅ Đã đồng bộ metadata lên server`);
    } catch (metadataError) {
      console.error("❌ Lỗi sync metadata:", metadataError);
    }
    
  } catch (error) {
    console.error("❌ Lỗi sync:", error);
  } finally {
    isSyncing = false;
    if (syncQueue.length > 0) {
      const resolve = syncQueue.shift();
      setTimeout(() => syncToFirebase().then(resolve), 100);
    }
  }
}
// Thêm vào cuối file employee.js hoặc firebase-sync.js
window.forceSyncNow = async function() {
  if (typeof showToast === 'function') {
    showToast("🔄 Đang đồng bộ dữ liệu...");
  }
  
  if (typeof syncToFirebase === 'function') {
    await syncToFirebase();
  }
  
  if (typeof loadFromFirebase === 'function') {
    await loadFromFirebase();
  }
  
  // Refresh toàn bộ UI
  if (typeof loadTodayData === 'function') loadTodayData();
  if (typeof renderManagerDashboard === 'function') renderManagerDashboard();
  if (typeof renderCustomerDebtList === 'function') renderCustomerDebtList();
  if (typeof renderRecentExpenses === 'function') renderRecentExpenses();
  if (typeof renderRecentCustomers === 'function') renderRecentCustomers();
  
  if (typeof showToast === 'function') {
    showToast("✅ Đồng bộ hoàn tất!");
  }
};

// Thêm nút đồng bộ thủ công (tùy chọn)
const syncBtn = document.createElement('button');
syncBtn.id = 'manualSyncBtn';
syncBtn.innerHTML = '🔄 Đồng bộ';
syncBtn.style.cssText = 'position:fixed; bottom:80px; right:16px; z-index:999; background:var(--primary); color:white; border:none; border-radius:50px; padding:10px 16px; font-size:12px; box-shadow:0 2px 8px rgba(0,0,0,0.2); cursor:pointer;';
syncBtn.onclick = () => window.forceSyncNow();
document.body.appendChild(syncBtn);
// ========== TẢI DỮ LIỆU TỪ FIREBASE (CÓ RETRY) ==========
async function loadFromFirebase(retryCount = 0) {
  if (isLoading) {
    console.log("⏭️ Đang load, bỏ qua");
    return false;
  }
  
  isLoading = true;
  
  try {
    const user = firebase.auth().currentUser;
    if (!user) return false;
    
    const role = await getUserRole(user.uid);
    const isAdminUser = role === ROLES.ADMIN;
    
    console.log(`📥 ${isAdminUser ? 'Admin' : 'Nhân viên'} đang tải dữ liệu từ server... (lần thử ${retryCount + 1})`);
    
    // Tải metadata
    const metadataSnap = await database.ref(`cafeData/${STORE_ID}/metadata`).once('value');
    const metadata = metadataSnap.val() || {};
    
    // Khởi tạo dữ liệu mới nếu chưa có (chỉ admin mới được tạo)
    if (Object.keys(metadata).length === 0 && isAdminUser) {
      console.log("📝 Chưa có dữ liệu trên server, khởi tạo mới...");
      const emptyData = {
        _version: 1,
        _lastModified: Date.now(),
        reports: {},
        expenses: [],
        adminExpenses: [],
        debtTransactions: [],
        categories: { expenses: [], adminExpenses: [], customers: [] },
        recent: { expenses: [], adminExpenses: [], customers: [] }
      };
      saveToLocal(emptyData, true);
      await syncToFirebase();
      isLoading = false;
      return true;
    }
    
    // Tải dữ liệu 3 tháng gần nhất
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const startDate = threeMonthsAgo.toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];
    
    const reports = {};
    const expenses = [];
    const adminExpenses = [];
    const debts = [];
    
    const dates = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0]);
    }
    
    // Tải từng ngày - sử dụng Promise.all để tải song song
    const batchSize = 10;
    for (let i = 0; i < dates.length; i += batchSize) {
      const batch = dates.slice(i, i + batchSize);
      await Promise.all(batch.map(async (date) => {
        const [year, month, day] = date.split('-');
        
        const [reportSnap, expensesSnap, adminExpensesSnap, debtsSnap] = await Promise.all([
          database.ref(`cafeData/${STORE_ID}/reports/${year}/${month}/${day}`).once('value'),
          database.ref(`cafeData/${STORE_ID}/expenses/${year}/${month}/${day}`).once('value'),
          database.ref(`cafeData/${STORE_ID}/adminExpenses/${year}/${month}/${day}`).once('value'),
          database.ref(`cafeData/${STORE_ID}/debtTransactions/${year}/${month}/${day}`).once('value')
        ]);
        
        const report = reportSnap.val();
        if (report) {
          const cleanReport = { ...report };
          delete cleanReport._syncedAt;
          delete cleanReport._syncedBy;
          delete cleanReport._syncedByEmail;
          delete cleanReport._syncedByRole;
          delete cleanReport._syncedByDevice;
          reports[date] = cleanReport;
        }
        
        const expensesMap = expensesSnap.val() || {};
        Object.entries(expensesMap).forEach(([id, exp]) => {
          if (!exp.deleted) {
            const cleanExp = { ...exp };
            delete cleanExp._modifiedBy;
            delete cleanExp._modifiedByRole;
            delete cleanExp._modifiedByDevice;
            expenses.push({ id, date, ...cleanExp });
          }
        });
        
        const adminExpensesMap = adminExpensesSnap.val() || {};
        Object.entries(adminExpensesMap).forEach(([id, exp]) => {
          if (!exp.deleted) {
            const cleanExp = { ...exp };
            delete cleanExp._modifiedBy;
            delete cleanExp._modifiedByRole;
            delete cleanExp._modifiedByDevice;
            adminExpenses.push({ id, date, ...cleanExp });
          }
        });
        
        const debtsMap = debtsSnap.val() || {};
        Object.entries(debtsMap).forEach(([id, debt]) => {
          if (!debt.deleted) {
            const cleanDebt = { ...debt };
            delete cleanDebt._modifiedBy;
            delete cleanDebt._modifiedByRole;
            delete cleanDebt._modifiedByDevice;
            debts.push({ id, date, ...cleanDebt });
          }
        });
      }));
    }
    
    const structuredData = {
      _version: metadata.version || 1,
      _lastModified: Date.now(),
      _lastModifiedBy: deviceId,
      reports: reports,
      expenses: expenses,
      adminExpenses: adminExpenses,
      debtTransactions: debts,
      categories: metadata.categories || { expenses: [], adminExpenses: [], customers: [] },
      recent: metadata.recent || { expenses: [], adminExpenses: [], customers: [] }
    };
    
    saveToLocal(structuredData, true);
    
    console.log(`✅ Đã tải: ${Object.keys(reports).length} reports, ${expenses.length} expenses, ${adminExpenses.length} adminExpenses, ${debts.length} debts`);
    
    isLoading = false;
    return true;
    
  } catch (error) {
    console.error("❌ Lỗi tải:", error);
    isLoading = false;
    
    // Retry logic
    if (retryCount < MAX_RETRY_COUNT) {
      console.log(`🔄 Đang thử lại lần ${retryCount + 2} sau ${RETRY_DELAY_MS}ms...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      return loadFromFirebase(retryCount + 1);
    }
    
    console.error("❌ Đã thử tối đa số lần, vẫn thất bại");
    return false;
  }
}

function setupRealtimeListener() {
  const user = firebase.auth().currentUser;
  if (!user) return;

  if (realtimeListenerRef) {
    realtimeListenerRef.off();
    realtimeListenerRef = null;
  }

  console.log("📡 Đang thiết lập realtime listener (child_changed)...");

  const baseRef = database.ref(`cafeData/${STORE_ID}`);
  realtimeListenerRef = baseRef;

  // Xử lý tất cả các loại thay đổi: child_changed, child_added, child_removed
  const handleDataChange = async (snapshot, eventType) => {
    if (window._isRealtimeUpdate) {
      console.log(`⏭️ Bỏ qua ${eventType} (đang xử lý)`);
      return;
    }

    const changedData = snapshot.val();
    const path = snapshot.key;

    // Kiểm tra self-update: cùng user và cùng device
    const isSelfUpdate = changedData && 
                         changedData._syncedByDevice === deviceId && 
                         changedData._syncedBy === user.uid;

    if (isSelfUpdate) {
      console.log(`⏭️ Bỏ qua self-update ${eventType} từ device ${deviceId}`);
      return;
    }

    console.log(`📡 Phát hiện ${eventType} tại: ${path}`);

    window._isRealtimeUpdate = true;

    try {
      // Cập nhật metadata riêng nếu path là metadata
      if (path === 'metadata') {
        const metadata = changedData;
        if (metadata && metadata.categories && metadata.recent) {
          const localData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
          let changed = false;
          if (JSON.stringify(localData.categories) !== JSON.stringify(metadata.categories)) {
            localData.categories = metadata.categories;
            changed = true;
          }
          if (JSON.stringify(localData.recent) !== JSON.stringify(metadata.recent)) {
            localData.recent = metadata.recent;
            changed = true;
          }
          if (changed) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(localData));
            window.appData = localData;
            if (typeof appData !== 'undefined') Object.assign(appData, localData);
            refreshUIAfterUpdate();
          }
        }
        return;
      }

      // Đối với các thay đổi khác, chỉ tải lại ngày bị ảnh hưởng
      // Tìm ngày từ path (cấu trúc: /reports/2026/05/26 hoặc /expenses/2026/05/26/id...)
      const parts = path.split('/');
      if (parts.length >= 4) {
        const year = parts[1];
        const month = parts[2];
        const day = parts[3];
        const changedDate = `${year}-${month}-${day}`;
        
        console.log(`📡 Chỉ cập nhật ngày ${changedDate}`);
        
        // Tải lại dữ liệu của ngày đó
        await loadDateFromFirebase(changedDate);
      } else {
        // Fallback: tải lại toàn bộ nếu không xác định được ngày
        await loadFromFirebase();
      }
      
      refreshUIAfterUpdate();
    } catch (err) {
      console.error("❌ Lỗi xử lý realtime:", err);
    } finally {
      setTimeout(() => {
        window._isRealtimeUpdate = false;
      }, 100); // Giảm lock xuống 100ms
    }
  };

  baseRef.on('child_changed', (snapshot) => handleDataChange(snapshot, 'child_changed'));
  baseRef.on('child_added', (snapshot) => handleDataChange(snapshot, 'child_added'));
  baseRef.on('child_removed', (snapshot) => handleDataChange(snapshot, 'child_removed'));

  console.log("✅ Realtime listener đã sẵn sàng");
}

// ========== XỬ LÝ CẬP NHẬT/NHẬP DỮ LIỆU ==========
async function handleRealtimeUpdate(path, data) {
  const parts = path.split('/');
  
  // Xử lý metadata
  if (path === 'metadata') {
    const metadata = data;
    if (metadata) {
      const localData = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (localData) {
        let changed = false;
        if (metadata.categories && JSON.stringify(localData.categories) !== JSON.stringify(metadata.categories)) {
          localData.categories = metadata.categories;
          changed = true;
        }
        if (metadata.recent && JSON.stringify(localData.recent) !== JSON.stringify(metadata.recent)) {
          localData.recent = metadata.recent;
          changed = true;
        }
        if (changed) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(localData));
          window.appData = localData;
          refreshUIAfterUpdate();
        }
      }
    }
    return;
  }
  
  // Xử lý reports, expenses, adminExpenses, debtTransactions
  if (parts.length >= 4) {
    const type = parts[0];
    const year = parts[1];
    const month = parts[2];
    const day = parts[3];
    const itemId = parts[4];
    const changedDate = `${year}-${month}-${day}`;
    
    console.log(`📡 Xử lý ${type} ngày ${changedDate} ${itemId ? `ID: ${itemId}` : ''}`);
    
    // Tải lại dữ liệu mới nhất của ngày này
    const [reportSnap, expensesSnap, adminExpensesSnap, debtsSnap] = await Promise.all([
      database.ref(`cafeData/${STORE_ID}/reports/${year}/${month}/${day}`).once('value'),
      database.ref(`cafeData/${STORE_ID}/expenses/${year}/${month}/${day}`).once('value'),
      database.ref(`cafeData/${STORE_ID}/adminExpenses/${year}/${month}/${day}`).once('value'),
      database.ref(`cafeData/${STORE_ID}/debtTransactions/${year}/${month}/${day}`).once('value')
    ]);
    
    const localData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    
    // Cập nhật report
    const newReport = reportSnap.val();
    if (newReport) {
      if (!localData.reports) localData.reports = {};
      const cleanReport = { ...newReport };
      delete cleanReport._syncedAt;
      delete cleanReport._syncedBy;
      delete cleanReport._syncedByEmail;
      delete cleanReport._syncedByRole;
      delete cleanReport._syncedByDevice;
      localData.reports[changedDate] = cleanReport;
    } else if (localData.reports && localData.reports[changedDate]) {
      delete localData.reports[changedDate];
    }
    
    // 🔥 Cập nhật expenses - XÓA CÁC ITEM CŨ, THAY BẰNG DỮ LIỆU MỚI TỪ SERVER
    localData.expenses = (localData.expenses || []).filter(e => e.date !== changedDate);
    
    const newExpensesMap = expensesSnap.val() || {};
    Object.entries(newExpensesMap).forEach(([id, exp]) => {
      // ⚠️ QUAN TRỌNG: Chỉ thêm item nếu chưa bị xóa
      if (!exp.deleted) {
        const cleanExp = { ...exp };
        delete cleanExp._modifiedBy;
        delete cleanExp._modifiedByRole;
        delete cleanExp._modifiedByDevice;
        localData.expenses.push({ id, date: changedDate, ...cleanExp });
      }
      // Nếu exp.deleted === true thì KHÔNG thêm vào (đã xóa trên server)
    });
    
    // 🔥 Cập nhật adminExpenses tương tự
    localData.adminExpenses = (localData.adminExpenses || []).filter(e => e.date !== changedDate);
    const newAdminExpensesMap = adminExpensesSnap.val() || {};
    Object.entries(newAdminExpensesMap).forEach(([id, exp]) => {
      if (!exp.deleted) {
        const cleanExp = { ...exp };
        delete cleanExp._modifiedBy;
        delete cleanExp._modifiedByRole;
        delete cleanExp._modifiedByDevice;
        localData.adminExpenses.push({ id, date: changedDate, ...cleanExp });
      }
    });
    
    // 🔥 Cập nhật debts - XÓA CÁC ITEM CŨ, THAY BẰNG DỮ LIỆU MỚI TỪ SERVER
    localData.debtTransactions = (localData.debtTransactions || []).filter(d => d.date !== changedDate);
    const newDebtsMap = debtsSnap.val() || {};
    Object.entries(newDebtsMap).forEach(([id, debt]) => {
      if (!debt.deleted) {
        const cleanDebt = { ...debt };
        delete cleanDebt._modifiedBy;
        delete cleanDebt._modifiedByRole;
        delete cleanDebt._modifiedByDevice;
        localData.debtTransactions.push({ id, date: changedDate, ...cleanDebt });
      }
    });
    
    // Cập nhật version
    localData._version = (localData._version || 0) + 1;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(localData));
    window.appData = localData;
    
    // Hiển thị thông báo
    const action = data ? (data.deleted ? "xóa" : "cập nhật") : "cập nhật";
    showToast(`📡 Đã ${action} dữ liệu ngày ${formatDisplayDate(changedDate)}`);
    refreshUIAfterUpdate();
  }
}

// ========== XỬ LÝ XÓA DỮ LIỆU ==========
async function handleRealtimeRemoval(path) {
  const parts = path.split('/');
  
  if (parts.length >= 4) {
    const type = parts[0];
    const year = parts[1];
    const month = parts[2];
    const day = parts[3];
    const changedDate = `${year}-${month}-${day}`;
    
    console.log(`📡 Xử lý xóa ${type} ngày ${changedDate}`);
    
    const localData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    
    // Xóa toàn bộ dữ liệu của ngày đó khỏi local
    if (type === 'reports' && localData.reports) {
      delete localData.reports[changedDate];
    } else if (type === 'expenses') {
      localData.expenses = (localData.expenses || []).filter(e => e.date !== changedDate);
    } else if (type === 'adminExpenses') {
      localData.adminExpenses = (localData.adminExpenses || []).filter(e => e.date !== changedDate);
    } else if (type === 'debtTransactions') {
      localData.debtTransactions = (localData.debtTransactions || []).filter(d => d.date !== changedDate);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(localData));
    window.appData = localData;
    
    showToast(`📡 Đã xóa dữ liệu ngày ${formatDisplayDate(changedDate)}`);
    refreshUIAfterUpdate();
  }
}
// ========== REFRESH UI SAU REALTIME UPDATE (MẠNH MẼ HƠN) ==========
// ========== REFRESH UI SAU REALTIME UPDATE ==========
function refreshUIAfterUpdate() {
  console.log("🔄 Refresh UI sau realtime update...");
  
  // Đồng bộ biến appData toàn cục (quan trọng!)
  const freshData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  if (typeof appData !== 'undefined') {
    // Gán từng thuộc tính để giữ tham chiếu
    Object.keys(freshData).forEach(key => {
      appData[key] = freshData[key];
    });
    // Thêm các thuộc tính mới nếu có
    Object.keys(appData).forEach(key => {
      if (!(key in freshData)) delete appData[key];
    });
  } else {
    // Nếu chưa có biến appData, tạo mới
    window.appData = freshData;
  }
  
  // Đảm bảo cấu trúc dữ liệu
  if (typeof ensureAppDataStructure === 'function') {
    ensureAppDataStructure();
  }
  
  // Render lại toàn bộ UI
  if (typeof loadTodayData === 'function') {
    loadTodayData();
  }
  
  if (typeof renderManagerDashboard === 'function') {
    renderManagerDashboard();
  }
  
  if (typeof renderCustomerDebtList === 'function') {
    renderCustomerDebtList();
  }
  
  if (typeof renderRecentExpenses === 'function') {
    renderRecentExpenses();
  }
  
  if (typeof renderRecentCustomers === 'function') {
    renderRecentCustomers();
  }
  
  if (typeof renderRecentAdminExpenses === 'function') {
    renderRecentAdminExpenses();
  }
  
  if (typeof updateTotalDebtDisplay === 'function') {
    updateTotalDebtDisplay();
  }
  
  if (typeof updateSubmitButtonStatus === 'function') {
    updateSubmitButtonStatus();
  }
  
  console.log("✅ Refresh UI hoàn tất");
}

// ========== GHI ĐÈ SAVEDATA ==========
const originalSaveData = window.saveData || function() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(window.appData));
};

window.saveData = function() {
  if (window._isRealtimeUpdate) {
    console.log("⏭️ Bỏ qua save (đang realtime update)");
    return;
  }
  
  if (window.appData) {
    window.appData._version = (window.appData._version || 0) + 1;
    window.appData._lastModified = Date.now();
    window.appData._lastModifiedBy = deviceId;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(window.appData));
  }
  
  if (originalSaveData !== window.saveData) {
    originalSaveData();
  }
  
  if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
  syncDebounceTimer = setTimeout(() => {
    syncToFirebase();
  }, 500);
};

// ========== KHỞI TẠO FIREBASE SYNC ==========
async function initFirebaseSync() {
  if (isInitialized) {
    console.log("⏭️ Firebase Sync đã khởi tạo");
    return;
  }
  
  initDeviceId();
  
  const user = firebase.auth().currentUser;
  if (user) {
    const success = await loadFromFirebase();
    if (success) {
      setupRealtimeListener();
      isInitialized = true;
      console.log("🚀 Firebase Sync Pro - Đã sẵn sàng");
    } else {
      console.error("❌ Không thể tải dữ liệu, sẽ thử lại sau 5 giây");
      setTimeout(() => initFirebaseSync(), 5000);
    }
  }
}

// ========== CLEANUP ==========
function cleanupFirebaseSync() {
  if (realtimeListenerRef) {
    realtimeListenerRef.off();
    realtimeListenerRef = null;
  }
  if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
  syncQueue = [];
  isSyncing = false;
  isLoading = false;
  isInitialized = false;
  window._isRealtimeUpdate = false;
}

// ========== FORCE SYNC ==========
async function forceSync() {
  if (typeof showToast === 'function') showToast("🔄 Đang đồng bộ...");
  await syncToFirebase();
  await loadFromFirebase();
  refreshUIAfterUpdate();
  if (typeof showToast === 'function') showToast("✅ Đồng bộ hoàn tất");
}

// ========== EXPORT ==========
window.initFirebaseSync = initFirebaseSync;
window.loadFromFirebase = loadFromFirebase;
window.syncToFirebase = syncToFirebase;
window.forceSync = forceSync;
window.cleanupFirebaseSync = cleanupFirebaseSync;

// Lắng nghe auth state
firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    if (!isInitialized) {
      initFirebaseSync();
    }
  } else {
    cleanupFirebaseSync();
    isInitialized = false;
  }
});

// ========== FORCE REFRESH TOÀN BỘ DỮ LIỆU ==========
async function forceFullRefresh() {
  console.log("🔄 Đang force refresh toàn bộ dữ liệu...");
  
  if (typeof showToast === 'function') {
    showToast("🔄 Đang tải lại dữ liệu...");
  }
  
  // Tắt realtime listener tạm thời để tránh xung đột
  if (realtimeListenerRef) {
    realtimeListenerRef.off();
    realtimeListenerRef = null;
  }
  
  // Tải lại dữ liệu từ Firebase
  const success = await loadFromFirebase();
  
  if (success) {
    // Khởi tạo lại listener
    setupRealtimeListener();
    
    // Refresh UI mạnh mẽ
    refreshUIAfterUpdate();
    
    if (typeof showToast === 'function') {
      showToast("✅ Đã cập nhật dữ liệu mới nhất");
    }
  } else {
    if (typeof showToast === 'function') {
      showToast("⚠️ Không thể tải dữ liệu, vui lòng kiểm tra mạng");
    }
  }
  
  console.log("✅ Force refresh hoàn tất");
}
// Thêm vào phần EXPORT cuối file
window.forceFullRefresh = forceFullRefresh;