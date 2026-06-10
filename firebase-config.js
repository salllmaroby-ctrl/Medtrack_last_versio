import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ضعِ بيانات مشروعكِ الخاصة هنا
const firebaseConfig = {
  apiKey: "AIzaSyBxNrGLUOmLxHdPEaiYcZVCGLnYjYpII_0",
  authDomain: "medtrack-a4b25.firebaseapp.com",
  projectId: "medtrack-a4b25",
  storageBucket: "medtrack-a4b25.firebasestorage.app",
  messagingSenderId: "859920209218",
  appId: "1:859920209218:web:acb06dd60da75f6daaa4db",
  measurementId: "G-4LBNYH63GS"
};

const app = initializeApp(firebaseConfig);

// التصدير الاحترافي النظيف لـ auth و db
export const auth = getAuth(app);
export const db = getFirestore(app);