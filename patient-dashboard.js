import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, query, where, onSnapshot, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let patientChart = null; // تعريف الرسم البياني

// 1. التحقق من هوية المريض عند فتح الصفحة
// داخل صفحة المريض - الجزء الخاص بـ <script type="module">

import { auth, db } from './firebase-config.js';
import { collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

onAuthStateChanged(auth, (user) => {
    if (user) {
        const patientId = user.uid; // معرف المريض الحالي

        // 🔥 إنشاء استعلام لمراقبة أدوية هذا المريض فقط 🔥
        const q = query(
            collection(db, "medications"), 
            where("patientId", "==", patientId)
        );

        // الاستماع للتغييرات اللحظية
        onSnapshot(q, (snapshot) => {
            const medsContainer = document.getElementById('meds-list-container'); // تأكدي إن الـ ID ده موجود في الـ HTML
            medsContainer.innerHTML = ""; // مسح القائمة القديمة

            snapshot.forEach((docSnap) => {
                const med = docSnap.data();
                
                // بناء شكل الدواء في الصفحة
                const medElement = document.createElement('div');
                medElement.className = "p-4 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center mb-3";
                medElement.innerHTML = `
                    <div>
                        <h4 class="font-bold text-slate-800">${med.name}</h4>
                        <p class="text-xs text-slate-400 mt-0.5">${med.time}</p>
                    </div>
                    <span class="px-3 py-1.5 ${med.status === 'taken' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'} text-xs font-bold rounded-lg">
                        ${med.status === 'taken' ? '✓ تم أخذها' : 'قيد الانتظار'}
                    </span>
                `;
                medsContainer.appendChild(medElement);
            });
        });
    }
});

function initDashboard(patientId) {
    // تشغيل الرسم البياني الدائري فارغاً ليتم تحديثه لاحقاً
    const ctx = document.getElementById('patientChart').getContext('2d');
    patientChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['ملتزم به', 'فائت / متبقي'],
            datasets: [{
                data: [0, 100],
                backgroundColor: ['#f43f5e', '#cbd5e1'],
                borderWidth: 0
            }]
        },
        options: { cutout: '75%', plugins: { legend: { position: 'bottom', labels: { font: { family: 'Cairo' } } } } }
    });

    // 2. الاستماع اللحظي للأدوية الخاصة بهذا المريض فقط
    const medsQuery = query(collection(db, "medications"), where("patientId", "==", patientId));
    
    onSnapshot(medsQuery, (snapshot) => {
        const container = document.getElementById('meds-list-container');
        if (!container) return;
        
        container.innerHTML = ""; // تفريغ الحاوية لإعادة البناء
        
        let totalMeds = snapshot.size;
        let takenMeds = 0;
        
        if (totalMeds === 0) {
            container.innerHTML = '<p class="text-slate-400 text-center py-4">لا توجد أدوية مضافة لجدولك اليوم بعد.</p>';
            updateProgress(0, 0);
            return;
        }
        
        snapshot.forEach((docSnap) => {
            const med = docSnap.data();
            const medId = docSnap.id;
            const isTaken = med.status === "taken";
            
            if (isTaken) takenMeds++;
            
            const medCard = document.createElement('div');
            medCard.className = `flex items-center justify-between p-4 bg-slate-50 rounded-xl border ${isTaken ? 'border-slate-100' : 'border-rose-100 bg-rose-50/10'}`;
            
            // ✨ تعديل مهم: إضافة data-id="${medId}" لكي يعرف الكود أي دواء تم ضغطه
            medCard.innerHTML = `
                <div>
                    <h5 class="font-bold text-slate-800">${med.name}</h5>
                    <p class="text-xs text-slate-400 mt-0.5">${med.time}</p>
                </div>
                ${isTaken 
                    ? '<span class="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">✓ تم أخذها</span>' 
                    : `<button data-id="${medId}" class="take-med-btn bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow-sm">تأكيد الأخذ الآن</button>`
                }
            `;
            container.appendChild(medCard);
        });
        
        // تحديث الحسابات والنسبة
        updateProgress(takenMeds, totalMeds);
    });
}

// 3. دالة تحديث شريط التقدم والرسم البياني وحفظ النسبة في حساب المريض
function updateProgress(taken, total) {
    const percentage = total > 0 ? Math.round((taken / total) * 100) : 0;
    
    document.getElementById('progress-percent').innerText = `${percentage}%`;
    document.getElementById('progress-bar').style.width = `${percentage}%`;
    
    if (patientChart) {
        patientChart.data.datasets[0].data = [taken, total - taken];
        patientChart.update();
    }

    // 🔥 حفظ النسبة الجديدة في جدول المريض لكي تظهر عند الطبيب فوراً
    if (auth.currentUser) {
        const userRef = doc(db, "users", auth.currentUser.uid);
        updateDoc(userRef, {
            adherenceRate: percentage
        }).catch(err => console.error("خطأ في تحديث نسبة الالتزام:", err));
    }
}

// 🔥 4. تشغيل أزرار "تأكيد الأخذ الآن" ديناميكياً عند الضغط عليها 🔥
document.getElementById('meds-list-container').addEventListener('click', async (e) => {
    if (e.target.classList.contains('take-med-btn')) {
        const medId = e.target.getAttribute('data-id');
        const medRef = doc(db, "medications", medId);
        
        try {
            // تحويل حالة الدواء إلى taken في قاعدة البيانات
            await updateDoc(medRef, {
                status: "taken"
            });
            alert("صحتك بالدنيا! 💊 تم تسجيل أخذ الجرعة بنجاح.");
        } catch (error) {
            console.error("خطأ أثناء تحديث حالة الدواء:", error);
            alert("حدث خطأ، يرجى المحاولة مرة أخرى.");
        }
    }
});

// 5. منطق زر تسجيل الخروج
document.getElementById('logout-btn').addEventListener('click', () => {
    signOut(auth).then(() => {
        window.location.href = 'index.html';
    });
});