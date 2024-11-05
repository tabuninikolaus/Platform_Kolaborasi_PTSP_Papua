// Firebase configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";

// Firebase config yang sudah kamu buat
const firebaseConfig = {
  apiKey: "AIzaSyDbU5BDkDrzFN5EiodomInIi2Ae6DyHtCU",
  authDomain: "platform-kordinasi-ptsp-papua.firebaseapp.com",
  projectId: "platform-kordinasi-ptsp-papua",
  storageBucket: "platform-kordinasi-ptsp-papua.appspot.com",
  messagingSenderId: "575011801476",
  appId: "1:575011801476:web:8927fa4ee9707d70a2b5d1",
};
// Periksa apakah Firebase berhasil diinisialisasi
console.log("Firebase has been initialized:", app);
// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Kamu bisa mengekspor app jika dibutuhkan di file lain
export { app };
