const db = require('./veritabani');

const test = async (studentId) => {
    const trGunler = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    const plans = await new Promise(r => db.all("SELECT day FROM fixed_plan WHERE user_id = ? AND status = 'approved'", [studentId], (e, rows) => r(rows || [])));
    const pDays = (plans || []).map(p => p.day.trim());
    
    console.log('Öğrenci ID:', studentId);
    console.log('Planlanan Günler:', JSON.stringify(pDays));

    const attendance = await new Promise(r => db.all("SELECT date, status FROM attendance WHERE user_id = ? AND date >= '2026-02-01'", [studentId], (e, rows) => r(rows || [])));
    const attMap = {};
    attendance.forEach(a => attMap[a.date] = a.status);

    let attended = 0;
    let absent = 0;

    let d = new Date(2026, 1, 1, 12, 0, 0);
    const dun = new Date();
    dun.setDate(dun.getDate() - 1);
    
    while (d <= dun) {
        const dStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
        const gunAdi = trGunler[d.getDay()];
        const isPlanned = pDays.some(p => p.toLowerCase() === gunAdi.toLowerCase());

        if (attMap[dStr]) {
            if (attMap[dStr] === 'completed') attended++;
            else if (attMap[dStr] === 'absent' || attMap[dStr] === 'working') absent++;
        } else if (isPlanned) {
            absent++;
            // console.log(`EKSİK GÜN: ${dStr} (${gunAdi})`);
        }
        d.setDate(d.getDate() + 1);
    }
    console.log('Sonuç -> Katılım:', attended, 'Devamsızlık:', absent);
    process.exit(0);
};

setTimeout(() => test(12), 1000);
