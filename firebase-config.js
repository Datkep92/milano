// Firebase cấu hình
const firebaseConfig = {
  apiKey: "AIzaSyAkgqLNZRI53IR-ovAToiKiUCvAlaUAc0c",
  authDomain: "test-820df.firebaseapp.com",
    databaseURL: "https://test-820df-default-rtdb.firebaseio.com",
  projectId: "test-820df",
  storageBucket: "test-820df.firebasestorage.app",
  messagingSenderId: "24109852350",
  appId: "1:24109852350:web:187ea10452d88e01ca60ef",
  measurementId: "G-T31VK7N9KE"
};

// Khởi tạo Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// Cấu hình persistence (lưu đăng nhập)
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);