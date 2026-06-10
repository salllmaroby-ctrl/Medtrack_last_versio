import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, query, where, onSnapshot, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// التحقق من حالة تسجيل الدخول لمقدم الرعاية
onAuthStateChanged(auth, (user) => {
    if (!user) window.location.href = 'index.html';
});

// مخازن مؤقتة لدمج البيانات حياً وتجنب التقرير الخاطئ
let globalPatients = [];
let globalMedications = [];

// 🔥 نظام التتبع الذكي لمنع تكرار الـ Alert المنبثق بشكل مزعج
let alertedPatients = new Set();

// 1. المراقبة الحية لجميع المرضى
const patientsQuery = query(collection(db, "users"), where("role", "==", "patient"));
onSnapshot(patientsQuery, (patientsSnapshot) => {
    globalPatients = [];
    
    patientsSnapshot.forEach((doc) => {
        globalPatients.push({ id: doc.id, ...doc.data() });
    });
    calculateAndRenderDashboard();
});

// 2. المراقبة الحية لجميع الأدوية لحساب نسب الالتزام فوراً
onSnapshot(collection(db, "medications"), (medsSnapshot) => {
    globalMedications = [];
    medsSnapshot.forEach((doc) => {
        globalMedications.push({ id: doc.id, ...doc.data() });
    });
    calculateAndRenderDashboard();
});

// 3. الدالة الأساسية لحساب النسب وتوليد التنبيهات والـ Alerts حياً
function calculateAndRenderDashboard() {
    const gridContainer = document.getElementById('patients-grid') || document.getElementById('patients-container');
    const alertsSection = document.getElementById('section-alerts');

    if (!gridContainer) return;
    gridContainer.innerHTML = ""; // مسح الواجهة القديمة

    // تجهيز حاوية التنبيهات داخل قسم التنبيهات لتظهر بالشاشة
    if (alertsSection) {
        alertsSection.innerHTML = `
            <div class="mb-6">
                <h3 class="font-bold text-xl text-slate-800">⚠️ التنبيهات العاجلة للمرضى</h3>
                <p class="text-sm text-slate-400 mt-1">يتم رصد المرضى الذين يقل معدل التزامهم عن 70% تلقائياً لحمايتهم</p>
            </div>
            <div id="alerts-container" class="space-y-4"></div>
        `;
    }
    const alertsContainer = document.getElementById('alerts-container');
    let totalAlertsCount = 0;

    // المرور على كل مريض لحساب التزامه
    globalPatients.forEach((patient) => {
        const patientMeds = globalMedications.filter(med => med.patientId === patient.id);
        
        let totalMeds = patientMeds.length;
        let completedMeds = patientMeds.filter(med => med.status === 'completed').length;
        
        // حساب النسبة المئوية
        let adherencePercentage = totalMeds === 0 ? 100 : Math.round((completedMeds / totalMeds) * 100);

        let progressBarColor = "bg-purple-600";
        let statusBadge = `<span class="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-lg">✓ ملتزم</span>`;

        // إذا قل الالتزام عن 70%
        if (adherencePercentage < 70) {
            progressBarColor = "bg-rose-500 animate-pulse"; 
            statusBadge = `<span class="px-2.5 py-1 bg-rose-50 text-rose-600 text-xs font-bold rounded-lg">⚠️ غير منضبط</span>`;
            
            totalAlertsCount++;

            // 📢 أ) إطلاق الـ Alert المنبثق على شاشة الطبيب (يظهر مرة واحدة فقط عند انخفاض النسبة)
            const patientName = patient.name || patient.email;
            if (!alertedPatients.has(patient.id)) {
                alertedPatients.add(patient.id); // تسجيل المريض أنه تم التنبيه عنه
                
                // إطلاق صوت تنبيه أو نافذة منبثقة فورية
                setTimeout(() => {
                    alert(`🚨 تنبيه عاجل: انخفض معدل التزام المريض (${patientName}) إلى ${adherencePercentage}%! يرجى مراجعته فوراً.`);
                }, 500);
            }

            // ب) إضافة كارت الإنذار في صفحة التنبيهات داخل النظام
            if (alertsContainer) {
                const alertCard = document.createElement('div');
                alertCard.className = "p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-between shadow-sm border-r-4 border-r-rose-500 animate-fade-in";
                alertCard.innerHTML = `
                    <div class="flex items-center gap-3">
                        <span class="text-2xl">🚨</span>
                        <div>
                            <h4 class="font-bold text-rose-800 text-sm md:text-base">إنذار حرج: انخفاض التزام المريض</h4>
                            <p class="text-xs md:text-sm text-rose-700 mt-1">انخفض معدل التزام المريض <span class="font-bold underline">${patientName}</span> إلى <span class="font-bold">${adherencePercentage}%</span> فقط!</p>
                        </div>
                    </div>
                    <span class="text-xs bg-rose-200/60 text-rose-700 px-3 py-1.5 rounded-lg font-bold">يتطلب متابعة عاجلة</span>
                `;
                alertsContainer.appendChild(alertCard);
            }
        } else {
            // إذا تحسن التزام المريض أو زادت النسبة عن 70%، نحذفه من قائمة الـ Alerts المفعلة لكي يعمل مستقبلاً إذا قل مرة أخرى
            alertedPatients.delete(patient.id);
        }

        // بناء كارت المريض في لوحة التحكم الرئيسية
        const patientCard = document.createElement('div');
        patientCard.className = "bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 flex flex-col justify-between";
        patientCard.innerHTML = `
            <div class="flex justify-between items-start">
                <div>
                    <h4 class="font-bold text-slate-800 text-lg">${patient.name || 'مريض غير مسمى'}</h4>
                    <p class="text-xs text-slate-400 mt-0.5">${patient.email}</p>
                </div>
                ${statusBadge}
            </div>
            
            <div class="space-y-1.5">
                <div class="flex justify-between text-xs font-semibold text-slate-500">
                    <span>معدل الانضباط اليومي</span>
                    <span class="text-slate-800">${adherencePercentage}%</span>
                </div>
                <div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div class="${progressBarColor} h-full rounded-full transition-all duration-500" style="width: ${adherencePercentage}%"></div>
                </div>
                <p class="text-[11px] text-slate-400 text-left pt-0.5">عدد الأدوية: ${completedMeds} من ${totalMeds}</p>
            </div>

            <button data-id="${patient.id}" class="add-med-btn w-full py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 border border-purple-100">
                ➕ إضافة علاج جديد للجدول
            </button>
        `;
        gridContainer.appendChild(patientCard);
    });

    // رسالة عند عدم وجود أية إنذارات حرجة
    if (totalAlertsCount === 0 && alertsContainer) {
        alertsContainer.innerHTML = `
            <div class="text-center py-12 bg-white rounded-2xl border border-slate-100 shadow-sm text-slate-400">
                <span class="text-4xl block mb-2">💚</span>
                جميع المرضى ملتزمون بخططهم العلاجية بنجاح فوق 70% حالياً!
            </div>
        `;
    }
}

// 4. منطق زر "إضافة دواء"
document.addEventListener('click', async (e) => {
    const addBtn = e.target.closest('.add-med-btn'); 
    if (addBtn) {
        const patientId = addBtn.getAttribute('data-id');
        const medName = prompt("أدخل اسم الدواء والجرعة المطلوبة:");
        const medTime = prompt("أدخل وقت الجرعة اليومي (مثال: 09:00 صباحاً):");
        
        if (medName && medTime) {
            try {
                await addDoc(collection(db, "medications"), {
                    name: medName,
                    time: medTime,
                    patientId: patientId, 
                    status: "pending",     
                    createdAt: new Date()
                });
                alert("تمت إضافة الدواء بنجاح! وسوف يظهر في حساب المريض فوراً 💊");
            } catch (error) {
                console.error("خطأ أثناء إضافة الدواء الجديد:", error);
            }
        }
    }
});

// 5. زر تسجيل الخروج
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            window.location.href = 'index.html';
        });
    });
}