import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// منطق تسجيل الدخول
const loginBtn = document.getElementById('login-btn');
if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        if(!email || !password) return alert("الرجاء ملء الحقول");

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
            
            if (userDoc.exists()) {
                const role = userDoc.data().role;
                // التوجيه الفوري بناءً على الدور
                window.location.href = `${role}-dashboard.html`;
            } else {
                alert("بيانات الحساب موجودة كبريد إلكتروني، ولكن لم يتم تحديد صلاحية (Role) لها في Firestore.");
            }
        } catch (error) {
            alert("خطأ في الدخول: " + error.message);
        }
    });
}

// منطق إنشاء حساب جديد (الذي يحل مشكلة الصلاحيات)
const signupBtn = document.getElementById('signup-btn');
if (signupBtn) {
    signupBtn.addEventListener('click', async () => {
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const role = document.getElementById('signup-role').value;

        if(!email || !password) return alert("الرجاء ملء الحقول");

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            
            // تخزين الدور فوراً في Firestore لكي ينجح تسجيل الدخول مستقبلاً
            await setDoc(doc(db, "users", userCredential.user.uid), {
                email: email,
                role: role,
                createdAt: new Date()
            });

            alert("تم إنشاء الحساب وتحديد الصلاحية بنجاح!");
            window.location.href = `${role}-dashboard.html`;
        } catch (error) {
            alert("خطأ في الإنشاء: " + error.message);
        }
    });
}