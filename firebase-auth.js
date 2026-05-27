// ========== HỆ THỐNG ĐĂNG NHẬP ==========

const loginScreen = document.getElementById("loginScreen");
const appContainer = document.getElementById("appContainer");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const registerEmail = document.getElementById("registerEmail");
const registerPassword = document.getElementById("registerPassword");
const registerConfirmPassword = document.getElementById("registerConfirmPassword");
const registerBtn = document.getElementById("registerBtn");
const showRegister = document.getElementById("showRegister");
const showLogin = document.getElementById("showLogin");
const loginError = document.getElementById("loginError");
const registerError = document.getElementById("registerError");

let isAppShowing = false;
let currentUserRole = null;
let cachedRole = null;
let cachedRoleUid = null;

function getDeviceId() {
  let deviceId = localStorage.getItem("deviceId");
  if (!deviceId) {
    deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem("deviceId", deviceId);
  }
  return deviceId;
}

async function saveLoginInfo(user) {
  const deviceId = getDeviceId();
  const loginInfo = {
    uid: user.uid,
    email: user.email,
    deviceId: deviceId,
    lastLogin: firebase.database.ServerValue.TIMESTAMP,
    userAgent: navigator.userAgent
  };
  
  try {
    await database.ref(`users/${user.uid}/devices/${deviceId}`).set(loginInfo);
    await database.ref(`users/${user.uid}/profile/lastLogin`).set(firebase.database.ServerValue.TIMESTAMP);
    console.log("✓ Đã lưu thông tin đăng nhập");
  } catch (error) {
    console.error("Lỗi lưu:", error);
  }
}

async function login(email, password) {
  try {
    if (loginError) loginError.innerText = "";
    const result = await auth.signInWithEmailAndPassword(email, password);
    const user = result.user;
    
    await saveLoginInfo(user);
    
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("userEmail", user.email);
    localStorage.setItem("userUid", user.uid);
    
    showApp(user);
    
  } catch (error) {
    console.error("Lỗi đăng nhập:", error);
    let message = "Đăng nhập thất bại";
    switch (error.code) {
      case 'auth/user-not-found': message = "Email không tồn tại"; break;
      case 'auth/wrong-password': message = "Sai mật khẩu"; break;
      case 'auth/invalid-email': message = "Email không hợp lệ"; break;
      case 'auth/too-many-requests': message = "Quá nhiều lần thử"; break;
    }
    if (loginError) loginError.innerText = message;
  }
}

async function register(email, password, confirmPassword) {
  try {
    if (registerError) registerError.innerText = "";
    
    if (password !== confirmPassword) {
      registerError.innerText = "Mật khẩu xác nhận không khớp";
      return;
    }
    
    if (password.length < 6) {
      registerError.innerText = "Mật khẩu phải có ít nhất 6 ký tự";
      return;
    }
    
    const result = await auth.createUserWithEmailAndPassword(email, password);
    const user = result.user;
    
    const role = ROLES.STAFF;
    
    await database.ref(`users/${user.uid}/profile`).set({
      email: user.email,
      role: role,
      createdAt: firebase.database.ServerValue.TIMESTAMP,
      lastLogin: firebase.database.ServerValue.TIMESTAMP
    });
    
    await database.ref(`users/${user.uid}/role`).set(role);
    await saveLoginInfo(user);
    
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("userEmail", user.email);
    localStorage.setItem("userUid", user.uid);
    
    showApp(user);
    await checkFirstUser();
    
  } catch (error) {
    console.error("Lỗi đăng ký:", error);
    let message = "Đăng ký thất bại";
    switch (error.code) {
      case 'auth/email-already-in-use': message = "Email đã được sử dụng"; break;
      case 'auth/invalid-email': message = "Email không hợp lệ"; break;
      case 'auth/weak-password': message = "Mật khẩu quá yếu"; break;
    }
    if (registerError) registerError.innerText = message;
  }
}

async function logout() {
  try {
    const user = auth.currentUser;
    if (user) {
      const deviceId = getDeviceId();
      await database.ref(`users/${user.uid}/devices/${deviceId}/lastLogout`).set(firebase.database.ServerValue.TIMESTAMP);
    }
    
    if (typeof cleanupFirebaseSync === 'function') cleanupFirebaseSync();
    
    await auth.signOut();
    
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userUid");
    localStorage.removeItem(`${user?.uid}_dataLoaded`);
    
    hideApp();
    isAppShowing = false;
    
    showToast("✓ Đã đăng xuất");
  } catch (error) {
    console.error("Lỗi đăng xuất:", error);
  }
}

async function getUserRole(uid, forceRefresh = false) {
  if (!forceRefresh && cachedRoleUid === uid && cachedRole !== null) {
    return cachedRole;
  }
  
  try {
    const snapshot = await database.ref(`users/${uid}/role`).once('value');
    const role = snapshot.val();
    cachedRole = role || ROLES.STAFF;
    cachedRoleUid = uid;
    currentUserRole = cachedRole;
    return cachedRole;
  } catch (error) {
    console.error("Lỗi lấy role:", error);
    return ROLES.STAFF;
  }
}

async function showApp(user) {
  if (isAppShowing) {
    console.log("⏭️ App đã hiển thị");
    return;
  }
  isAppShowing = true;
  
  if (loginScreen) loginScreen.classList.add("hidden");
  if (appContainer) appContainer.classList.remove("hidden");
  
  const role = await getUserRole(user.uid);
  const isAdminUser = role === ROLES.ADMIN;
  window.isAdminSync = () => isAdminUser;
  
  const managerTabBtn = document.querySelector('.tab-btn[data-tab="managerTab"]');
  if (managerTabBtn) {
    if (isAdminUser) {
      managerTabBtn.classList.remove("hidden");
    } else {
      managerTabBtn.classList.add("hidden");
    }
  }
  
  // ========== ẨN/HIỆN FAB THEO ROLE ==========
  const expenseFab = document.getElementById("expenseFab");
  const debtFab = document.getElementById("debtFab");
  const paymentFab = document.getElementById("paymentFab");
  const adminExpenseFab = document.getElementById("adminExpenseFab");
  
  // Ẩn/hiện nút admin expense (chỉ admin mới thấy)
  if (adminExpenseFab) {
    if (isAdminUser) {
      adminExpenseFab.classList.remove("hidden");
    } else {
      adminExpenseFab.classList.add("hidden");
    }
  }
  
  // Lắng nghe chuyển tab để ẩn/hiện FAB
  const setupTabListeners = () => {
    document.querySelectorAll(".tab-btn").forEach(btn => {
      btn.removeEventListener('click', handleTabClick);
      btn.addEventListener('click', handleTabClick);
    });
  };
  
  const handleTabClick = (e) => {
    const btn = e.currentTarget;
    const isAdminTab = btn.dataset.tab === "managerTab";
    
    if (expenseFab) expenseFab.classList.toggle('hidden', isAdminTab);
    if (debtFab) debtFab.classList.toggle('hidden', isAdminTab);
    if (paymentFab) paymentFab.classList.toggle('hidden', isAdminTab);
    
    // Nút admin expense chỉ hiện ở tab Admin và chỉ khi là admin
    if (adminExpenseFab) {
      if (isAdminTab && isAdminUser) {
        adminExpenseFab.classList.remove('hidden');
      } else {
        adminExpenseFab.classList.add('hidden');
      }
    }
  };
  
  setupTabListeners();
  
  // Khởi tạo initial state (mặc định đang ở tab Report)
  if (expenseFab) expenseFab.classList.remove('hidden');
  if (debtFab) debtFab.classList.remove('hidden');
  if (paymentFab) paymentFab.classList.remove('hidden');
  if (adminExpenseFab) adminExpenseFab.classList.add('hidden');
  
  // ========== CHỈ KHỞI TẠO FIREBASE SYNC (KHÔNG CÓ REALTIME UI) ==========
  if (typeof initFirebaseSync === 'function') {
    await initFirebaseSync();
  }
  
  // KHÔNG gọi initRealtimeUI nữa để tránh xung đột listener
  
  // Render UI sau khi đã có dữ liệu
  setTimeout(() => {
    if (typeof loadTodayData === 'function') loadTodayData();
    if (typeof renderManagerDashboard === 'function') renderManagerDashboard();
    if (typeof renderRecentExpenses === 'function') renderRecentExpenses();
    if (typeof renderRecentCustomers === 'function') renderRecentCustomers();
    if (typeof renderRecentAdminExpenses === 'function') renderRecentAdminExpenses();
    if (typeof renderCustomerDebtList === 'function') renderCustomerDebtList();
    if (typeof updateTotalDebtDisplay === 'function') updateTotalDebtDisplay();
  }, 200);
}

function hideApp() {
  if (loginScreen) loginScreen.classList.remove("hidden");
  if (appContainer) appContainer.classList.add("hidden");
}

async function checkFirstUser() {
  try {
    const user = auth.currentUser;
    if (!user) return;
    
    const roleSnapshot = await database.ref(`users/${user.uid}/role`).once('value');
    const existingRole = roleSnapshot.val();
    
    if (existingRole) return;
    
    const usersSnapshot = await database.ref('users').once('value');
    const userCount = usersSnapshot.numChildren();
    
    if (userCount === 0 || (userCount === 1 && !existingRole)) {
      await database.ref(`users/${user.uid}/role`).set(ROLES.ADMIN);
      await database.ref(`users/${user.uid}/profile/role`).set(ROLES.ADMIN);
      console.log("✓ Tài khoản được set làm ADMIN");
      window.location.reload();
    } else {
      await database.ref(`users/${user.uid}/role`).set(ROLES.STAFF);
      await database.ref(`users/${user.uid}/profile/role`).set(ROLES.STAFF);
      console.log("✓ Tài khoản được set làm STAFF");
    }
  } catch (error) {
    console.error("Lỗi:", error);
  }
}

if (loginBtn) {
  loginBtn.onclick = () => {
    const email = loginEmail?.value.trim() || "";
    const password = loginPassword?.value || "";
    if (email && password) {
      login(email, password);
    } else {
      if (loginError) loginError.innerText = "Vui lòng nhập đầy đủ thông tin";
    }
  };
}

if (registerBtn) {
  registerBtn.onclick = () => {
    const email = registerEmail?.value.trim() || "";
    const password = registerPassword?.value || "";
    const confirmPassword = registerConfirmPassword?.value || "";
    if (email && password) {
      register(email, password, confirmPassword);
    } else {
      if (registerError) registerError.innerText = "Vui lòng nhập đầy đủ thông tin";
    }
  };
}

if (logoutBtn) {
  logoutBtn.onclick = logout;
}

if (showRegister) {
  showRegister.onclick = () => {
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");
    if (loginForm) loginForm.classList.add("hidden");
    if (registerForm) registerForm.classList.remove("hidden");
    if (loginError) loginError.innerText = "";
    if (registerError) registerError.innerText = "";
  };
}

if (showLogin) {
  showLogin.onclick = () => {
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");
    if (registerForm) registerForm.classList.add("hidden");
    if (loginForm) loginForm.classList.remove("hidden");
    if (loginError) loginError.innerText = "";
    if (registerError) registerError.innerText = "";
  };
}

if (loginPassword) {
  loginPassword.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && loginBtn) loginBtn.click();
  });
}

if (registerConfirmPassword) {
  registerConfirmPassword.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && registerBtn) registerBtn.click();
  });
}

auth.onAuthStateChanged(async (user) => {
  if (user) {
    if (!isAppShowing) {
      showApp(user);
    }
  } else {
    hideApp();
    isAppShowing = false;
  }
});

window.getUserRole = getUserRole;