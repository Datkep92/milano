// Firebase cấu hình
const firebaseConfig = {
  apiKey: "AIzaSyAAbHF51z6HkiTmlukK_v1mt2mzVMoFbho",
  authDomain: "milano-13e11.firebaseapp.com",
  databaseURL: "https://milano-13e11-default-rtdb.firebaseio.com",
  projectId: "milano-13e11",
  storageBucket: "milano-13e11.firebasestorage.app",
  messagingSenderId: "830228602200",
  appId: "1:830228602200:web:8f7dbc9897269a0863d92d",
  measurementId: "G-7H5M9WTD6S"
};

// Khởi tạo Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// Cấu hình persistence (lưu đăng nhập)
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);