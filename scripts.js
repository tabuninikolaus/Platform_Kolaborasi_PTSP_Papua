//INISIALISASI FIREBASE
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getAuth,
  signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";
import { app } from "./firebase-config.js"; // Mengimpor app dari Firebase config

// Inisialisasi Firebase Auth, Firestore, dan Storage

const db = getFirestore(app);
const storage = getStorage(app);

// UNTUK LOGIN
// Mengatur proses login ketika form dikirimkan
document
  .getElementById("loginForm")
  .addEventListener("submit", function (event) {
    event.preventDefault(); // Mencegah halaman reload

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    // Proses sign in dengan Firebase Authentication
    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        // Jika login berhasil
        alert("Login berhasil!");
        window.location.href = "main-content.html"; // Arahkan ke halaman konten utama
      })
      .catch((error) => {
        // Jika login gagal
        const errorMessage = error.message;
        alert("Login gagal: " + errorMessage);
      });
  });

//   UNTUK REGISTER
// Proses register saat form disubmit
document
  .getElementById("registerForm")
  .addEventListener("submit", function (event) {
    event.preventDefault(); // Mencegah reload halaman saat submit form

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    // Validasi password dan konfirmasi password harus sama
    if (password !== confirmPassword) {
      alert("Password dan konfirmasi password tidak cocok!");
      return;
    }

    // Proses pendaftaran di Firebase Authentication
    createUserWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        // Pendaftaran berhasil
        alert("Pendaftaran berhasil!");
        window.location.href = "profile.html"; // Arahkan ke halaman profil
      })
      .catch((error) => {
        // Jika pendaftaran gagal
        const errorMessage = error.message;
        alert("Pendaftaran gagal: " + errorMessage);
      });
  });

//   UNTUK PROFILES
// Preview gambar saat diunggah
document
  .getElementById("profileImage")
  .addEventListener("change", function (event) {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = function (e) {
      const previewImage = document.getElementById("previewImage");
      previewImage.src = e.target.result;
      previewImage.style.display = "block";
    };

    reader.readAsDataURL(file);
  });

// Proses penyimpanan profil pengguna
document
  .getElementById("profileForm")
  .addEventListener("submit", function (event) {
    event.preventDefault(); // Mencegah reload halaman saat submit form

    const name = document.getElementById("name").value;
    const profileImage = document.getElementById("profileImage").files[0];
    const userId = auth.currentUser.uid;

    if (profileImage) {
      // Unggah gambar profil ke Firebase Storage
      const storageRef = ref(
        storage,
        "profile_images/" + userId + "/" + profileImage.name
      );
      uploadBytes(storageRef, profileImage)
        .then((snapshot) => {
          // Dapatkan URL gambar setelah berhasil diunggah
          getDownloadURL(snapshot.ref).then((downloadURL) => {
            // Simpan data profil ke Firestore
            setDoc(doc(db, "profiles", userId), {
              name: name,
              profileImageUrl: downloadURL,
            })
              .then(() => {
                alert("Profil berhasil disimpan!");
                window.location.href = "main-content.html"; // Arahkan ke halaman konten utama
              })
              .catch((error) => {
                alert("Gagal menyimpan profil: " + error.message);
              });
          });
        })
        .catch((error) => {
          alert("Gagal mengunggah gambar: " + error.message);
        });
    } else {
      alert("Harap unggah gambar profil!");
    }
  });
