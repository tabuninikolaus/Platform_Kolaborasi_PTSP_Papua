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
console.log("Firebase has been initialized:", app);

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
            const confirmJoin = confirm("Apakah kamu yakin join channel?");
            if (confirmJoin) {
              saveUserJoinedChannel(doc.id);
              loadChat(doc.id);
              updateChannelLink(doc.id);
            }
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
            const confirmDelete = confirm(
              "Apakah kamu yakin ingin menghapus channel dengan seluruh riwayatnya?"
            );
            if (confirmDelete) {
              deleteChannel(doc.id);
            }
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
createChannelBtn?.addEventListener("click", async () => {
  const channelName = prompt("Enter channel name:");
  if (channelName) {
    const channelDocRef = await addDoc(collection(db, "channels"), {
      name: channelName,
      createdBy: auth.currentUser.uid,
      timestamp: serverTimestamp(), // Tambahkan timestamp untuk pengurutan
    });

    const newChannelId = channelDocRef.id;

    // Simpan channel baru ke daftar channel yang di-join
    await saveUserJoinedChannel(newChannelId);
    await saveLastChannel(newChannelId); // Setel channel baru sebagai channel terakhir yang diakses

    // Load chat untuk channel baru dan perbarui status
    await loadChat(newChannelId);
    loadJoinedChannels(); // Sinkronkan status joined
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

  // Mengganti latar belakang chat box menjadi aktif
  chatBox.classList.remove("chat-box-default");
  chatBox.classList.add("chat-box-active");

  // Mengurutkan pesan berdasarkan timestamp (ascending)
  const messagesRef = collection(db, "channels", channelId, "messages");
  const messagesQuery = query(messagesRef, orderBy("timestamp", "asc"));

  onSnapshot(messagesQuery, (snapshot) => {
    chatBox.innerHTML = "";

    snapshot.forEach((doc) => {
      const message = doc.data();
      const messageItem = document.createElement("div");

      messageItem.classList.add("message");

      if (auth.currentUser && auth.currentUser.uid === message.userId) {
        messageItem.classList.add("self"); // Pesan dari diri sendiri di sisi kanan
      }

      if (message.fileURL) {
        messageItem.innerHTML = `
          <img src="${message.userImage}" alt="User Image" class="message-avatar">
          <div class="message-content">
            <strong>${message.userName}</strong>: <a href="${message.fileURL}" target="_blank">${message.text}</a>
          </div>
        `;
      } else {
        messageItem.innerHTML = `
          <img src="${message.userImage}" alt="User Image" class="message-avatar">
          <div class="message-content">
            <strong>${message.userName}</strong>: ${message.text}
          </div>
        `;
      }

      chatBox.appendChild(messageItem);
    });
    // Memutar notifikasi suara untuk pesan baru
    playNotificationSound();
    // Scroll otomatis ke bawah setiap kali ada pesan baru
    chatBox.scrollTop = chatBox.scrollHeight;
  });
  function playNotificationSound() {
    const audio = new Audio("notification.mp3"); // Pastikan path ke file notification.mp3 sudah benar
    audio
      .play()
      .catch((error) => console.log("Gagal memutar notifikasi suara:", error));
  }

  // Tampilkan nama channel di header chat
  const channelDocRef = doc(db, "channels", channelId);
  getDoc(channelDocRef).then((doc) => {
    if (doc.exists()) {
      const channelData = doc.data();
      document.getElementById("channelName").innerText = channelData.name;
    }
  });
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

// Fungsi untuk unggah file
fileUploadBtn?.addEventListener("click", async () => {
  const fileInput = document.createElement("input");
  fileInput.type = "file";

  fileInput.onchange = async (event) => {
    const file = event.target.files[0];
    if (file && currentChannel) {
      try {
        const storageRef = ref(storage, `files/${currentChannel}/${file.name}`);
        await uploadBytes(storageRef, file);
        const fileURL = await getDownloadURL(storageRef);

        const user = auth.currentUser;
        const userProfileRef = doc(db, "profiles", user.uid);
        const userProfileSnap = await getDoc(userProfileRef);
        const userProfile = userProfileSnap.data();

        await addDoc(collection(db, "channels", currentChannel, "messages"), {
          userName: userProfile.name,
          userImage: userProfile.profileImageUrl,
          userId: user.uid,
          text: `File: ${file.name}`,
          fileURL: fileURL, // Simpan URL file di pesan
          timestamp: serverTimestamp(),
        });
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

// Fungsi untuk meninggalkan channel dan mengupdate status channel
async function leaveChannel(channelId) {
  const user = auth.currentUser;
  const channelDocRef = doc(db, "channels", channelId);
  const channelSnap = await getDoc(channelDocRef);

  // Cek apakah user adalah pembuat channel
  if (channelSnap.exists() && channelSnap.data().createdBy === user.uid) {
    alert(
      "Anda adalah pembuat channel ini dan tidak dapat keluar dari channel. Anda dapat menghapusnya jika diperlukan."
    );
    return;
  }

  const confirmLeave = confirm(
    "Apakah kamu yakin ingin meninggalkan channel ini?"
  );
  if (confirmLeave) {
    const userJoinedRef = doc(db, "userJoinedChannels", user.uid);
    const userJoinedSnap = await getDoc(userJoinedRef);

    if (userJoinedSnap.exists()) {
      const { joinedChannels } = userJoinedSnap.data();
      const updatedChannels = joinedChannels.filter((id) => id !== channelId);

      // Simpan pembaruan ke Firestore untuk menghapus channel dari daftar joined
      await setDoc(userJoinedRef, { joinedChannels: updatedChannels });

      // Setel currentChannel ke null dan arahkan ke halaman selamat datang
      currentChannel = null;
      await clearLastAccessedChannel();
      showWelcomeMessage();

      // Update UI untuk mengubah tombol menjadi "Join" kembali
      updateChannelStatus(channelId, false);

      alert("You have successfully left the channel.");
    }
  }
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

        // Ganti nama channel menjadi teks statis (tidak bisa diklik lagi)
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
      <h3>Selamat Datang di Platform PTSP Provinsi Papua</h3>
      <p>Silahkan akses sidebar untuk create atau join channel</p>
    </div>
  `;
}

// Panggil fungsi untuk menampilkan daftar channel saat halaman dimuat
renderChannels();
