// ========== PHÂN QUYỀN NGƯỜI DÙNG ==========

// Các role
const ROLES = {
  ADMIN: 'admin',      // Quản lý - full quyền
  STAFF: 'staff'       // Nhân viên - chỉ xem và nhập liệu ngày hiện tại
};

// Lấy role của user hiện tại
async function getUserRole(uid) {
  try {
    const snapshot = await database.ref(`users/${uid}/role`).once('value');
    return snapshot.val() || ROLES.STAFF;
  } catch (error) {
    console.error("Lỗi lấy role:", error);
    return ROLES.STAFF;
  }
}

// Kiểm tra có phải admin không
async function isAdmin() {
  const user = auth.currentUser;
  if (!user) return false;
  const role = await getUserRole(user.uid);
  return role === ROLES.ADMIN;
}

// Kiểm tra có phải staff không
async function isStaff() {
  const user = auth.currentUser;
  if (!user) return true; // Mặc định là staff
  const role = await getUserRole(user.uid);
  return role === ROLES.STAFF;
}

// Tạo user mới với role (chỉ admin mới làm được)
async function createUserWithRole(email, password, role = ROLES.STAFF) {
  try {
    // Chỉ admin mới có quyền tạo user
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error("Chưa đăng nhập");
    }
    
    const currentRole = await getUserRole(currentUser.uid);
    if (currentRole !== ROLES.ADMIN) {
      throw new Error("Chỉ quản lý mới có quyền tạo tài khoản");
    }
    
    // Tạo user mới
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const newUser = userCredential.user;
    
    // Gán role
    await database.ref(`users/${newUser.uid}/role`).set(role);
    await database.ref(`users/${newUser.uid}/profile`).set({
      email: email,
      role: role,
      createdAt: firebase.database.ServerValue.TIMESTAMP,
      createdBy: currentUser.uid
    });
    
    // Đăng xuất user mới (không auto login)
    await auth.signOut();
    await auth.signInWithEmailAndPassword(currentUser.email, password); // Login lại admin
    
    return { success: true, uid: newUser.uid, role: role };
  } catch (error) {
    console.error("Lỗi tạo user:", error);
    return { success: false, error: error.message };
  }
}

// Set role cho user (chỉ admin)
async function setUserRole(uid, role) {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error("Chưa đăng nhập");
    }
    
    const currentRole = await getUserRole(currentUser.uid);
    if (currentRole !== ROLES.ADMIN) {
      throw new Error("Chỉ quản lý mới có quyền phân quyền");
    }
    
    await database.ref(`users/${uid}/role`).set(role);
    await database.ref(`users/${uid}/profile/role`).set(role);
    await database.ref(`users/${uid}/profile/updatedBy`).set(currentUser.uid);
    await database.ref(`users/${uid}/profile/updatedAt`).set(firebase.database.ServerValue.TIMESTAMP);
    
    return { success: true };
  } catch (error) {
    console.error("Lỗi set role:", error);
    return { success: false, error: error.message };
  }
}

// Lấy danh sách user (chỉ admin)
async function getUserList() {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) return [];
    
    const currentRole = await getUserRole(currentUser.uid);
    if (currentRole !== ROLES.ADMIN) return [];
    
    const snapshot = await database.ref('users').once('value');
    const users = [];
    
    snapshot.forEach(child => {
      const userData = child.val();
      users.push({
        uid: child.key,
        email: userData.profile?.email || userData.email,
        role: userData.role || ROLES.STAFF,
        createdAt: userData.profile?.createdAt,
        lastLogin: userData.profile?.lastLogin
      });
    });
    
    return users;
  } catch (error) {
    console.error("Lỗi lấy danh sách user:", error);
    return [];
  }
}
// Biến đồng bộ cho quyền admin
let _isAdmin = false;

async function updateAdminStatus() {
  _isAdmin = await isAdmin();
  window.isAdminSync = () => _isAdmin;
}

// Gọi khi auth state thay đổi
auth.onAuthStateChanged(async (user) => {
  if (user) {
    await updateAdminStatus();
  } else {
    _isAdmin = false;
    window.isAdminSync = () => false;
  }
});

// Khởi tạo ban đầu
updateAdminStatus();
// Export
window.ROLES = ROLES;
window.getUserRole = getUserRole;
window.isAdmin = isAdmin;
window.isStaff = isStaff;
window.createUserWithRole = createUserWithRole;
window.setUserRole = setUserRole;
window.getUserList = getUserList;