// ==================== firebase-config.js – HOÀN HẢO 100% (2025) ====================

const firebaseConfig = {
    apiKey: "AIzaSyAKPaTK5565yymhgdg7SW_-k5lx4-r3BfE",
    authDomain: "milano-2a686.firebaseapp.com",
    projectId: "milano-2a686",
    storageBucket: "milano-2a686.firebasestorage.app",
    messagingSenderId: "1060141074286",
    appId: "1:1060141074286:web:ec528fc13ac8fd2afbe37f",
    measurementId: "G-TK1GC0FT8Y"
};

// KHỞI TẠO NGAY TỪ ĐẦU – KHÔNG ĐỂ FILE NÀO KHÁC IMPORT DB TRƯỚC
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// CẤU HÌNH TRƯỚC KHI BẤT KỲ FILE NÀO DÙNG DB
db.settings({
    ignoreUndefinedProperties: true,
    cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
});

// BẬT OFFLINE PERSISTENCE AN TOÀN – KHÔNG BỊ LỖI DROPDOWN <select>
if ('indexedDB' in window) {
    db.enablePersistence()
        .then(() => {
            console.log('Offline persistence: HOÀN HẢO (không sync tab)');
        })
        .catch(err => {
            if (err.code === 'failed-precondition') {
                console.log('Đã có tab khác bật persistence → bỏ qua');
            } else if (err.code === 'unimplemented') {
                console.log('Browser không hỗ trợ offline');
            } else {
                console.warn('Persistence error:', err);
            }
        });
}

// XUẤT BIẾN TOÀN CỤC
window.firebaseApp = app;
window.auth = auth;
window.db = db;

console.log('Firebase Milano Coffee – ĐÃ SẴN SÀNG CHIẾN ĐẤU 100%!');