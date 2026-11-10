// ============================================
//   firebase-config.js — SoraVer2
//   ⚠️ ĐIỀN CẤU HÌNH FIREBASE CỦA BẠN VÀO ĐÂY
// ============================================
//  Lấy config tại:
//  https://console.firebase.google.com
//  → Your Project → Project Settings → Your Apps → Web App
//  → Copy firebaseConfig object
// ============================================

window.firebaseConfig = {
    apiKey:            "AIzaSyCHYYbFfoIy6CNVn5RMoAHKCAoXK5pvVJ0",
    authDomain:        "sorav2-f5dd1.firebaseapp.com",
    projectId:         "sorav2-f5dd1",
    storageBucket:     "sorav2-f5dd1.firebasestorage.app",
    messagingSenderId: "889918479415",
    appId:             "1:889918479415:web:9821541c2cc246bbfaf3b2"
};

// ============================================
//  HƯỚNG DẪN THIẾT LẬP FIREBASE:
//
//  1. Vào https://console.firebase.google.com
//  2. Tạo project mới (hoặc dùng project có sẵn)
//  3. Project Settings → General → Your Apps → Add App → Web
//  4. Copy firebaseConfig và điền vào trên
//
//  5. Authentication:
//     Build → Authentication → Sign-in method
//     → Google → Enable → Save
//
//  6. Firestore Database:
//     Build → Firestore Database → Create database
//     → Start in production mode → chọn region gần VN (asia-southeast1)
//
//  7. Firestore Security Rules (paste vào Rules tab):
//
//     rules_version = '2';
//     service cloud.firestore {
//       match /databases/{database}/documents {
//         match /users/{userId}/{document=**} {
//           allow read, write: if request.auth != null
//                              && request.auth.uid == userId;
//         }
//       }
//     }
//
// ============================================
