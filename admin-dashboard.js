import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 1. التحقق من حالة تسجيل الدخول لـ الأدمن
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = 'index.html'; // إذا لم يسجل دخول يرجع للرئيسية
    }
});

// 2. الاستماع اللحظي لكوليكشن المستخدمين لحساب الإحصائيات والجدول
onSnapshot(collection(db, "users"), (snapshot) => {
    let totalPatients = 0;
    let totalDoctors = 0;
    
    const tableBody = document.getElementById('recent-accounts-table');
    if (tableBody) tableBody.innerHTML = ""; // تفريغ الجدول لإعادة البناء

    snapshot.forEach((docSnap) => {
        const userData = docSnap.data();
        const role = userData.role || "";
        const name = userData.name || userData.email || "مستخدم جديد";
        const status = userData.status || "نشط"; // القيمة الافتراضية لو لم توجد

        // حساب الأعداد بناءً على الدور (Role)
        if (role === "patient") {
            totalPatients++;
        } else if (role === "caregiver") {
            totalDoctors++;
        }

        // بناء صفوف الجدول ديناميكياً
        if (tableBody) {
            let roleText = "مدير";
            let roleColor = "text-slate-600";
            
            if (role === "patient") { roleText = "مريض"; roleColor = "text-blue-600"; }
            else if (role === "caregiver" || role === "doctor") { roleText = "مقدم رعايه"; roleColor = "text-purple-600"; }

            let statusBadge = `<span class="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">نشط</span>`;
            if (status === "انتظار") {
                statusBadge = `<span class="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">انتظار</span>`;
            }

            const row = document.createElement('tr');
            row.className = "border-b border-slate-100 hover:bg-slate-50/50 transition text-right";
            row.innerHTML = `
                <td class="py-4 px-6 font-semibold text-slate-700">${name}</td>
                <td class="py-4 px-6 ${roleColor} font-medium">${roleText}</td>
                <td class="py-4 px-6">${statusBadge}</td>
            `;
            tableBody.appendChild(row);
        }
    });

    // تحديث العدادات الرقمية في الألواح العلوية
    if (document.getElementById('total-patients')) {
        document.getElementById('total-patients').innerText = totalPatients;
    }
    if (document.getElementById('total-doctors')) {
        document.getElementById('total-doctors').innerText = totalDoctors;
    }
}, (error) => {
    console.error("حدث خطأ أثناء جلب بيانات الأدمن:", error);
});

// 3. منطق زر تسجيل الخروج للأدمن
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            window.location.href = 'index.html';
        });
    });
}