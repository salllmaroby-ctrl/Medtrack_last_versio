// بيانات تجريبية (مستقبلاً ستأتي من Firestore)
const meds = [
    { name: "ضغط الدم", status: "مكتمل" },
    { name: "فيتامين د", status: "فائت" }
];

function renderDashboard() {
    const list = document.getElementById('med-list');
    meds.forEach(med => {
        list.innerHTML += `
            <div class="p-4 bg-gray-800 rounded flex justify-between">
                <span>${med.name}</span>
                <span class="${med.status === 'مكتمل' ? 'text-green-500' : 'text-red-500'}">${med.status}</span>
            </div>
        `;
    });

    const ctx = document.getElementById('myChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['سبت', 'أحد', 'اثنين'],
            datasets: [{ label: 'الالتزام', data: [80, 90, 75], borderColor: '#3b82f6' }]
        }
    });
}

// تشغيل الداش بورد
renderDashboard();