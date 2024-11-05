// 1. INISIALISASI FIREBASE
// Import Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import {
  getStorage,
  ref,
  getDownloadURL,
  uploadBytes,
  uploadBytesResumable,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDbU5BDkDrzFN5EiodomInIi2Ae6DyHtCU",
  authDomain: "platform-kordinasi-ptsp-papua.firebaseapp.com",
  projectId: "platform-kordinasi-ptsp-papua",
  storageBucket: "platform-kordinasi-ptsp-papua.appspot.com",
  messagingSenderId: "575011801476",
  appId: "1:575011801476:web:8927fa4ee9707d70a2b5d1",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();
const storage = getStorage();

// Periksa apakah Firebase berhasil diinisialisasi
console.log("Firebase has been initialized eyee:", app);

// 2. MENANGANI AUTENTIKASI & PENGGUNAAN CHANNEL
// ELEMEN HTML START
let userNameDisplay = document.getElementById("userName");
let userImageDisplay = document.getElementById("userImage");
let logoutBtn = document.getElementById("logoutBtn");
let createChannelBtn = document.getElementById("createChannelBtn");
let channelList = document.getElementById("channelList");
let chatBox = document.getElementById("chatBox");
let messageInput = document.getElementById("messageInput");
let sendBtn = document.getElementById("sendBtn");
let fileUploadBtn = document.getElementById("fileUploadBtn");
let currentChannel = null; // Menyimpan channel aktif
let leaveChannelBtn = document.getElementById("leaveChannelBtn");
// ELEMEN HTML END
// Referensi elemen modal
const channelInputModal = document.getElementById("channelInputModal");
const channelNameInput = document.getElementById("channelNameInput");
const closeChannelInputModal = document.getElementById(
  "closeChannelInputModal"
);
const createChannelConfirmBtn = document.getElementById(
  "createChannelConfirmBtn"
);
const confirmModal = document.getElementById("confirmModal");
const modalMessage = document.getElementById("modalMessage");
const modalConfirmBtn = document.getElementById("modalConfirmBtn");
const modalCancelBtn = document.getElementById("modalCancelBtn");
// Elemen modal untuk konfirmasi dan notifikasi
const leaveChannelConfirmModal = document.getElementById(
  "leaveChannelConfirmModal"
);
const leaveChannelSuccessModal = document.getElementById(
  "leaveChannelSuccessModal"
);
const creatorCannotLeaveModal = document.getElementById(
  "creatorCannotLeaveModal"
);
const closeLeaveModal = document.getElementById("closeLeaveModal");
const leaveConfirmBtn = document.getElementById("leaveConfirmBtn");
const leaveCancelBtn = document.getElementById("leaveCancelBtn");

const closeSuccessModal = document.getElementById("closeSuccessModal");
const successOkBtn = document.getElementById("successOkBtn");

const closeCreatorModal = document.getElementById("closeCreatorModal");
const creatorOkBtn = document.getElementById("creatorOkBtn");

// Fungsi checkAuth untuk otentikasi pengguna
function checkAuth() {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      const userId = user.uid;
      const profileRef = doc(db, "profiles", userId);
      const profileSnap = await getDoc(profileRef);

      if (profileSnap.exists()) {
        const userProfile = profileSnap.data();
        userNameDisplay.textContent = userProfile.name;
        const imageRef = ref(storage, userProfile.profileImageUrl);
        getDownloadURL(imageRef)
          .then((url) => {
            userImageDisplay.src = url;
          })
          .catch((error) =>
            console.log("Error fetching profile image:", error)
          );
      }

      // Render channel, load status joined, dan load channel terakhir yang diakses
      renderChannels()
        .then(() => loadJoinedChannels()) // Load channel yang sudah di-join
        .then(() => loadLastAccessedChannel()); // Load channel terakhir yang diakses
    } else {
      window.location.href = "login.html";
    }
  });
}

checkAuth();

// Fungsi logout
logoutBtn?.addEventListener("click", () => {
  signOut(auth)
    .then(() => {
      window.location.href = "login.html";
    })
    .catch((error) => console.log("Error logging out:", error));
});

// Function to show modal with message and action
function showModal(message, onConfirm) {
  modalMessage.textContent = message;
  confirmModal.style.display = "block";

  // Ensure modal is closed after action is taken
  const handleCloseModal = () => {
    confirmModal.style.display = "none";
  };

  // Confirm button action
  modalConfirmBtn.onclick = () => {
    onConfirm(); // Perform the confirmed action
    handleCloseModal(); // Close the modal afterward
  };

  // Cancel button action
  modalCancelBtn.onclick = handleCloseModal;
}

// Fungsi renderChannels untuk menampilkan semua channel
function renderChannels() {
  return new Promise((resolve) => {
    const channelsQuery = query(
      collection(db, "channels"),
      orderBy("timestamp", "desc")
    );
    onSnapshot(channelsQuery, (snapshot) => {
      channelList.innerHTML = "";
      snapshot.forEach((doc) => {
        const channel = doc.data();
        const isCreator = channel.createdBy === auth.currentUser.uid;
        const channelItem = document.createElement("li");

        if (isCreator) {
          channelItem.innerHTML = `
            <a href="#" class="channel-link" data-id="${doc.id}">${channel.name}</a>
            <span class="owner-label">Owner</span>
            <button class="delete-btn" data-id="${doc.id}">X</button>
          `;
        } else {
          channelItem.innerHTML = `
            <span>${channel.name}</span>
            <button class="join-btn joinBtn" data-id="${doc.id}">Join</button>
          `;
        }

        channelList.appendChild(channelItem);

        // Event untuk join channel
        const joinBtn = channelItem.querySelector(".joinBtn");
        if (joinBtn && !isCreator) {
          joinBtn.addEventListener("click", () => {
            showModal("Apakah kamu yakin join channel?", () => {
              saveUserJoinedChannel(doc.id);
              loadChat(doc.id);
              updateChannelLink(doc.id);
            });
          });
        }

        // Event untuk akses chat melalui link nama channel (hanya untuk owner)
        const channelLink = channelItem.querySelector(".channel-link");
        if (channelLink && isCreator) {
          channelLink.addEventListener("click", (e) => {
            e.preventDefault();
            loadChat(doc.id);
          });
        }

        // Event untuk delete channel (hanya untuk owner)
        const deleteBtn = channelItem.querySelector(".delete-btn");
        if (deleteBtn && isCreator) {
          deleteBtn.addEventListener("click", () => {
            showModal(
              "Apakah kamu yakin ingin menghapus channel dengan seluruh riwayatnya?",
              () => {
                deleteChannel(doc.id);
              }
            );
          });
        }
      });
      resolve(); // Menyelesaikan promise setelah rendering channel selesai
    });
  });
}

// Fungsi untuk menampilkan kembali daftar channel yang di-*join* dan memperbarui link
async function loadJoinedChannels() {
  const user = auth.currentUser;
  const userJoinedRef = doc(db, "userJoinedChannels", user.uid);
  const userJoinedSnap = await getDoc(userJoinedRef);

  if (userJoinedSnap.exists()) {
    const { joinedChannels } = userJoinedSnap.data();
    console.log("Joined channels loaded:", joinedChannels);
    joinedChannels.forEach((channelId) => updateChannelLink(channelId));
  } else {
    console.log("No joined channels found for user");
  }

  // Panggil fungsi untuk memuat channel terakhir yang diakses setelah memastikan daftar channel yang di-*join* terbaru
  loadLastAccessedChannel();
}

// Fungsi untuk menyimpan channel yang di-*join* oleh user
async function saveUserJoinedChannel(channelId) {
  const user = auth.currentUser;
  const userJoinedRef = doc(db, "userJoinedChannels", user.uid);
  const userJoinedSnap = await getDoc(userJoinedRef);

  let joinedChannels = [];

  if (userJoinedSnap.exists()) {
    joinedChannels = userJoinedSnap.data().joinedChannels || [];
  }

  // Tambahkan channelId ke daftar channel yang di-*join*
  if (!joinedChannels.includes(channelId)) {
    joinedChannels.push(channelId);
  }

  // Perbarui dokumen `userJoinedChannels` di Firestore
  await setDoc(userJoinedRef, { joinedChannels });
}

// Fungsi untuk menampilkan kembali daftar channel yang di-*join* dan memperbarui link
function updateChannelLink(channelId) {
  const channelItems = document.querySelectorAll("#channelList li");
  channelItems.forEach((item) => {
    const joinBtn = item.querySelector(".joinBtn");
    const channelIdAttr = joinBtn?.getAttribute("data-id");

    if (channelIdAttr === channelId) {
      joinBtn.innerText = "Joined";
      joinBtn.disabled = true;
      joinBtn.classList.add("joined-btn", "joined");

      const channelLink = document.createElement("a");
      channelLink.href = "#";
      channelLink.innerText = item.querySelector("span").innerText;

      channelLink.addEventListener("click", (e) => {
        e.preventDefault();
        loadChat(channelId);
      });

      item.querySelector("span").replaceWith(channelLink);
    }
  });
}

// Fungsi untuk membuat channel baru
// Fungsi untuk membuka modal
function openChannelInputModal() {
  channelInputModal.style.display = "block";
}

// Fungsi untuk menutup modal
function closeChannelInput() {
  channelInputModal.style.display = "none";
  channelNameInput.value = ""; // Bersihkan input setelah modal ditutup
}

// Event listener untuk tombol close modal
closeChannelInputModal.addEventListener("click", closeChannelInput);

// Event listener untuk membuat channel saat modal terbuka
createChannelBtn?.addEventListener("click", () => {
  openChannelInputModal();
});

// Fungsi untuk membuat channel baru dengan nama yang dimasukkan di modal
createChannelConfirmBtn.addEventListener("click", async () => {
  const channelName = channelNameInput.value.trim();
  if (channelName) {
    const channelDocRef = await addDoc(collection(db, "channels"), {
      name: channelName,
      createdBy: auth.currentUser.uid,
      timestamp: serverTimestamp(),
    });

    const newChannelId = channelDocRef.id;

    // Simpan channel baru ke daftar channel yang di-join
    await saveUserJoinedChannel(newChannelId);
    await saveLastChannel(newChannelId); // Setel channel baru sebagai channel terakhir yang diakses

    // Load chat untuk channel baru dan perbarui status
    await loadChat(newChannelId);
    loadJoinedChannels(); // Sinkronkan status joined

    closeChannelInput(); // Tutup modal setelah channel dibuat
  } else {
    alert("Nama channel tidak boleh kosong.");
  }
});

// Tutup modal jika pengguna mengklik di luar modal
window.addEventListener("click", (event) => {
  if (event.target === channelInputModal) {
    closeChannelInput();
  }
});

// Fungsi untuk menghapus channel dan semua pesan di dalamnya
async function deleteChannel(channelId) {
  const channelDocRef = doc(db, "channels", channelId);
  const messagesRef = collection(db, "channels", channelId, "messages");

  const messagesSnapshot = await getDocs(messagesRef);
  messagesSnapshot.forEach(async (doc) => {
    await deleteDoc(doc.ref);
  });

  // Hapus channel dari Firestore
  await deleteDoc(channelDocRef);

  // Sinkronkan data joinedChannels untuk menghapus channel dari daftar
  const user = auth.currentUser;
  const userJoinedRef = doc(db, "userJoinedChannels", user.uid);
  const userJoinedSnap = await getDoc(userJoinedRef);

  if (userJoinedSnap.exists()) {
    const { joinedChannels } = userJoinedSnap.data();
    const updatedChannels = joinedChannels.filter((id) => id !== channelId);

    await setDoc(userJoinedRef, { joinedChannels: updatedChannels });

    // Jika channel yang dihapus adalah channel yang sedang diakses, arahkan ke halaman selamat datang
    currentChannel = null;
    await clearLastAccessedChannel();
    showWelcomeMessage();
    alert("Channel and its messages have been deleted.");
    loadJoinedChannels(); // Sinkronkan status joined
  }
}

// Fungsi untuk menyimpan channel terakhir yang diakses
async function saveLastChannel(channelId) {
  const user = auth.currentUser;
  if (user) {
    const userLastAccessRef = doc(db, "userLastAccess", user.uid);
    await setDoc(
      userLastAccessRef,
      { lastChannel: channelId },
      { merge: true }
    );
    console.log("Last accessed channel saved:", channelId);
  }
}

// FUNGSI UNTUK BERGABUNG DENGAN CHANNEL DAN MENAMPILKAN PESAN
function loadChat(channelId) {
  currentChannel = channelId;
  saveLastChannel(channelId);

  chatBox.classList.remove("chat-box-default");
  chatBox.classList.add("chat-box-active");

  const messagesRef = collection(db, "channels", channelId, "messages");
  const messagesQuery = query(messagesRef, orderBy("timestamp", "asc"));

  let lastMessageTimestamp = null;

  onSnapshot(messagesQuery, (snapshot) => {
    chatBox.innerHTML = "";

    snapshot.forEach((doc) => {
      const message = doc.data();
      const messageItem = document.createElement("div");
      messageItem.classList.add("message");

      if (auth.currentUser && auth.currentUser.uid === message.userId) {
        messageItem.classList.add("self");

        const deleteDot = document.createElement("div");
        deleteDot.classList.add("delete-dot");
        deleteDot.textContent = "🗑️"; // Opsional, ikon hapus
        messageItem.appendChild(deleteDot);

        deleteDot.addEventListener("click", (event) => {
          event.stopPropagation();
          showDeleteConfirmation(doc.id, channelId);
        });
      }

      // Avatar pengguna
      const avatar = document.createElement("img");
      avatar.src = message.userImage;
      avatar.alt = "User Image";
      avatar.classList.add("message-avatar");
      messageItem.appendChild(avatar);

      // Konten pesan
      const messageContent = document.createElement("div");
      messageContent.classList.add("message-content");

      // Nama pengguna
      const userName = document.createElement("strong");
      userName.textContent = message.userName + ": ";
      messageContent.appendChild(userName);

      // Teks atau tautan file
      if (message.fileURL) {
        const fileLink = document.createElement("a");
        fileLink.href = message.fileURL;
        fileLink.target = "_blank";
        fileLink.textContent = message.text;
        messageContent.appendChild(fileLink);
      } else {
        const messageText = document.createTextNode(message.text);
        messageContent.appendChild(messageText);
      }

      messageItem.appendChild(messageContent);
      chatBox.appendChild(messageItem);

      // Notifikasi suara untuk pesan baru
      if (
        message.timestamp &&
        lastMessageTimestamp &&
        message.timestamp.toMillis() > lastMessageTimestamp &&
        auth.currentUser.uid !== message.userId
      ) {
        playNotificationSound();
      }
    });

    if (!snapshot.empty) {
      const latestMessage = snapshot.docs[snapshot.docs.length - 1].data();
      lastMessageTimestamp = latestMessage.timestamp
        ? latestMessage.timestamp.toMillis()
        : null;
    }

    chatBox.scrollTop = chatBox.scrollHeight;
  });

  function playNotificationSound() {
    const audio = new Audio("notification.mp3");
    audio
      .play()
      .catch((error) => console.log("Gagal memutar notifikasi suara:", error));
  }

  const channelDocRef = doc(db, "channels", channelId);
  getDoc(channelDocRef).then((doc) => {
    if (doc.exists()) {
      const channelData = doc.data();
      document.getElementById("channelName").innerText = channelData.name;
    }
  });
}

function showDeleteConfirmation(messageId, channelId) {
  const confirmDelete = confirm("Apakah Anda ingin menghapus pesan ini?");
  if (confirmDelete) {
    deleteMessage(messageId, channelId);
  }
}

async function deleteMessage(messageId, channelId) {
  const messageRef = doc(db, "channels", channelId, "messages", messageId);
  try {
    await deleteDoc(messageRef);
    console.log("Pesan berhasil dihapus.");
  } catch (error) {
    console.error("Gagal menghapus pesan:", error);
  }
}

// Fungsi untuk memuat channel terakhir yang diakses oleh pengguna
async function loadLastAccessedChannel() {
  const user = auth.currentUser;
  const userLastAccessRef = doc(db, "userLastAccess", user.uid);
  const lastAccessSnap = await getDoc(userLastAccessRef);

  if (lastAccessSnap.exists()) {
    const { lastChannel } = lastAccessSnap.data();
    if (lastChannel) {
      loadChat(lastChannel); // Mengarahkan ke channel terakhir
    } else {
      showWelcomeMessage(); // Jika tidak ada channel terakhir, tampilkan landing page
    }
  } else {
    showWelcomeMessage(); // Jika tidak ada channel terakhir, tampilkan landing page
  }
}

// Fungsi untuk mengirim pesan
sendBtn?.addEventListener("click", async () => {
  const text = messageInput.value;

  if (text && currentChannel) {
    const user = auth.currentUser;
    const userProfileRef = doc(db, "profiles", user.uid);
    const userProfileSnap = await getDoc(userProfileRef);
    const userProfile = userProfileSnap.data();

    await addDoc(collection(db, "channels", currentChannel, "messages"), {
      userName: userProfile.name,
      userImage: userProfile.profileImageUrl,
      userId: user.uid,
      text: text,
      timestamp: serverTimestamp(),
    });

    messageInput.value = "";
  }
});

// FUNGSI KIRM FILE

fileUploadBtn?.addEventListener("click", async () => {
  const fileInput = document.createElement("input");
  fileInput.type = "file";

  fileInput.onchange = async (event) => {
    const file = event.target.files[0];
    if (file && currentChannel) {
      try {
        // Referensi ke Firebase Storage
        const storageRef = ref(storage, `files/${currentChannel}/${file.name}`);

        // Menggunakan uploadBytesResumable untuk mendapatkan progres
        const uploadTask = uploadBytesResumable(storageRef, file);

        // Membuat elemen pesan file dalam chat
        const fileMessage = document.createElement("div");
        fileMessage.classList.add("file-message");
        fileMessage.innerHTML = `
          <div class="file-info">
            <div class="file-icon">📄</div>
            <div class="file-details">
              <span class="file-name">${file.name}</span>
              <span class="file-size">${(file.size / 1024 / 1024).toFixed(
                2
              )} MB</span>
            </div>
          </div>
          <div class="progress-container">
            <div class="progress-bar" id="progressBar"></div>
            <span class="progress-text" id="progressText">0%</span>
          </div>
          <div class="download-icon" style="display: none;">⬇️</div>
        `;
        chatBox.appendChild(fileMessage);

        const progressBar = fileMessage.querySelector(".progress-bar");
        const progressText = fileMessage.querySelector(".progress-text");
        const downloadIcon = fileMessage.querySelector(".download-icon");

        // Event listener untuk progress
        uploadTask.on(
          "state_changed",
          (snapshot) => {
            // Menghitung persen
            const progress =
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            progressBar.style.width = progress + "%";
            progressText.textContent = `${Math.floor(progress)}%`;

            if (progress === 100) {
              progressText.textContent = "Sedang menyelesaikan...";
            }
          },
          (error) => {
            console.error("Error uploading file:", error);
            progressText.textContent = "Gagal mengunggah";
          },
          async () => {
            // Ketika selesai, tampilkan ikon download
            const fileURL = await getDownloadURL(uploadTask.snapshot.ref);
            progressText.textContent = "Selesai";
            downloadIcon.style.display = "block";
            downloadIcon.onclick = () => window.open(fileURL, "_blank");

            // Menyimpan informasi file ke Firestore
            const user = auth.currentUser;
            const userProfileRef = doc(db, "profiles", user.uid);
            const userProfileSnap = await getDoc(userProfileRef);
            const userProfile = userProfileSnap.data();

            await addDoc(
              collection(db, "channels", currentChannel, "messages"),
              {
                userName: userProfile.name,
                userImage: userProfile.profileImageUrl,
                userId: user.uid,
                text: `File: ${file.name}`,
                fileURL: fileURL,
                timestamp: serverTimestamp(),
              }
            );
          }
        );
      } catch (error) {
        console.error("Error uploading file:", error);
      }
    }
  };

  fileInput.click();
});

// Fungsi untuk mengosongkan channel terakhir yang diakses ketika tidak ada channel yang tersisa
async function clearLastAccessedChannel() {
  const user = auth.currentUser;
  const userLastAccessRef = doc(db, "userLastAccess", user.uid);
  await setDoc(userLastAccessRef, { lastChannel: null }, { merge: true });
}

// Fungsi untuk membuka modal konfirmasi
function showLeaveConfirmModal(onConfirm) {
  leaveChannelConfirmModal.style.display = "block";

  const closeModal = () => {
    leaveChannelConfirmModal.style.display = "none";
  };

  closeLeaveModal.onclick = closeModal;
  leaveCancelBtn.onclick = closeModal;

  // Jika tombol "Yes" diklik, modal ditutup dan fungsi konfirmasi dijalankan
  leaveConfirmBtn.onclick = () => {
    closeModal();
    onConfirm();
  };
}

// Fungsi untuk membuka modal sukses
function showLeaveSuccessModal() {
  leaveChannelSuccessModal.style.display = "block";

  const closeSuccess = () => {
    leaveChannelSuccessModal.style.display = "none";
  };

  closeSuccessModal.onclick = closeSuccess;
  successOkBtn.onclick = closeSuccess;
}

// Fungsi untuk membuka modal ketika pembuat channel tidak bisa meninggalkan channel
function showCreatorCannotLeaveModal() {
  creatorCannotLeaveModal.style.display = "block";

  const closeCreator = () => {
    creatorCannotLeaveModal.style.display = "none";
  };

  closeCreatorModal.onclick = closeCreator;
  creatorOkBtn.onclick = closeCreator;
}

// Fungsi untuk meninggalkan channel dan memperbarui status channel
async function leaveChannel(channelId) {
  const user = auth.currentUser;
  const channelDocRef = doc(db, "channels", channelId);
  const channelSnap = await getDoc(channelDocRef);

  // Cek apakah user adalah pembuat channel
  if (channelSnap.exists() && channelSnap.data().createdBy === user.uid) {
    showCreatorCannotLeaveModal();
    return;
  }

  // Tampilkan modal konfirmasi untuk meninggalkan channel
  showLeaveConfirmModal(async () => {
    const userJoinedRef = doc(db, "userJoinedChannels", user.uid);
    const userJoinedSnap = await getDoc(userJoinedRef);

    if (userJoinedSnap.exists()) {
      const { joinedChannels } = userJoinedSnap.data();
      const updatedChannels = joinedChannels.filter((id) => id !== channelId);

      // Perbarui Firestore untuk menghapus channel dari daftar joined
      await setDoc(userJoinedRef, { joinedChannels: updatedChannels });

      // Setel currentChannel ke null dan arahkan ke halaman selamat datang
      currentChannel = null;
      await clearLastAccessedChannel();
      showWelcomeMessage();

      // Update UI untuk mengubah tombol menjadi "Join" kembali
      updateChannelStatus(channelId, false);

      // Tampilkan modal sukses
      showLeaveSuccessModal();
    }
  });
}

// Tambahkan event listener ke tombol Leave Channel
leaveChannelBtn.addEventListener("click", () => {
  if (currentChannel) {
    leaveChannel(currentChannel);
  } else {
    alert("Tidak ada channel yang sedang aktif.");
  }
});

// Fungsi untuk memperbarui status channel setelah di-*leave*
function updateChannelStatus(channelId, isJoined) {
  const channelItems = document.querySelectorAll("#channelList li");

  channelItems.forEach((item) => {
    const joinBtn = item.querySelector(".joinBtn");
    const channelIdAttr = joinBtn?.getAttribute("data-id");

    if (channelIdAttr === channelId) {
      if (!isJoined) {
        // Jika channel di-*leave*, ubah tombol kembali ke "Join"
        joinBtn.innerText = "Join";
        joinBtn.disabled = false;
        joinBtn.classList.remove("joined-btn");

        // Ubah nama channel dari elemen <a> (link) ke <span> (teks statis)
        const channelLink = item.querySelector("a.channel-link");
        if (channelLink) {
          const span = document.createElement("span");
          span.innerText = channelLink.innerText;
          channelLink.replaceWith(span);
        }
      } else {
        joinBtn.innerText = "Joined";
        joinBtn.disabled = true;
        joinBtn.classList.add("joined-btn");

        // Ubah nama channel menjadi link yang bisa diakses jika di-*join*
        const spanText = item.querySelector("span");
        if (spanText) {
          const channelLink = document.createElement("a");
          channelLink.href = "#";
          channelLink.innerText = spanText.innerText;
          channelLink.classList.add("channel-link");
          channelLink.setAttribute("data-id", channelId);
          spanText.replaceWith(channelLink);

          channelLink.addEventListener("click", (e) => {
            e.preventDefault();
            loadChat(channelId);
          });
        }
      }
    }
  });
}

// Fungsi untuk menampilkan halaman selamat datang
function showWelcomeMessage() {
  chatBox.classList.remove("chat-box-active");
  chatBox.classList.add("chat-box-default");
  chatBox.innerHTML = `
    <div class="welcome-message">
      <h3>SELAMAT DATANG DI CHATTBOX KOLABORASI PTSP PAPUA</h3>
      <p>Silahkan akses sidebar untuk create atau join channel</p>
    </div>
  `;
}

// Panggil fungsi untuk menampilkan daftar channel saat halaman dimuat
renderChannels();
