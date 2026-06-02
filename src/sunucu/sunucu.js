const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const db = require('./veritabani');
const { ogrenciDurumBildirimiGonder } = require('./bildirimServisi');

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';
const SECRET_KEY = process.env.JWT_SECRET || 'iskr-gizli-anahtar-2026';

app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// GLOBAL LOGGER
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] GELEN İSTEK: ${req.method} ${req.url}`);
    next();
});

const sendResponse = (res, success, data = null, error = null, status = 200) => {
    return res.status(status).json({ success, data, error });
};

const COURSE_DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
const COURSE_SLOTS = ['S-1', 'S-2', 'S-3', 'S-4', 'S-5', 'S-6', 'S-7', 'S-8', 'S-9', 'S-10', 'S-11', 'S-12', 'S-13', 'S-14', 'S-15'];

const SLOT_TIMES = {
  'S-1':  { start: 510,  end: 555 },  // 08:30 - 09:15
  'S-2':  { start: 565,  end: 610 },  // 09:25 - 10:10
  'S-3':  { start: 620,  end: 665 },  // 10:20 - 11:05
  'S-4':  { start: 675,  end: 720 },  // 11:15 - 12:00
  'S-5':  { start: 780,  end: 825 },  // 13:00 - 13:45
  'S-6':  { start: 835,  end: 880 },  // 13:55 - 14:40
  'S-7':  { start: 890,  end: 935 },  // 14:50 - 15:35
  'S-8':  { start: 945,  end: 990 },  // 15:45 - 16:30
  'S-9':  { start: 1020, end: 1065 }, // 17:00 - 17:45
  'S-10': { start: 1075, end: 1120 }, // 17:55 - 18:40
  'S-11': { start: 1130, end: 1175 }, // 18:50 - 19:35
  'S-12': { start: 1185, end: 1230 }, // 19:45 - 20:30
  'S-13': { start: 1240, end: 1285 }, // 20:40 - 21:25
  'S-14': { start: 1295, end: 1340 }, // 21:35 - 22:20
  'S-15': { start: 1350, end: 1395 }  // 22:30 - 23:15
};

const calculateDailyHours = (selectedSlots) => {
  if (!selectedSlots || selectedSlots.length === 0) return 0;
  return selectedSlots.length * 0.9375;
};

const validateCourseScheduleMatrix = (matrix) => {
    if (!matrix || typeof matrix !== 'object' || Array.isArray(matrix)) {
        return { valid: false, error: 'Ders programı matrisi geçersiz.' };
    }

    for (const day of COURSE_DAYS) {
        if (!matrix[day] || typeof matrix[day] !== 'object' || Array.isArray(matrix[day])) {
            return { valid: false, error: `${day} günü ders programında eksik.` };
        }

        for (const slot of COURSE_SLOTS) {
            if (typeof matrix[day][slot] !== 'boolean') {
                return { valid: false, error: `${day} ${slot} değeri doğru/yanlış formatında olmalıdır.` };
            }
        }
    }

    return { valid: true };
};

// IBAN DOĞRULAMA (TR Checksum)
const validateIBAN = (iban) => {
    if (!iban) return true; // Opsiyonel olabilir
    const cleanIBAN = iban.replace(/\s/g, '').toUpperCase();
    if (!/^TR\d{24}$/.test(cleanIBAN)) return false;
    
    // Checksum kontrolü (Mod 97)
    const rearranged = cleanIBAN.substring(4) + "2927" + cleanIBAN.substring(2, 4);
    let remainder = rearranged;
    while (remainder.length > 2) {
        let block = remainder.substring(0, 9);
        remainder = (parseInt(block) % 97).toString() + remainder.substring(block.length);
    }
    return parseInt(remainder) % 97 === 1;
};

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, error: 'Token yok.' });
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ success: false, error: 'Token geçersiz.' });
        req.user = user;
        next();
    });
};

const authorizeRole = (role) => (req, res, next) => {
    if (req.user.role !== role) return res.status(403).json({ success: false, error: 'Yetkisiz rol.' });
    next();
};

const createNotification = (userId, type, title, body, entityType = null, entityId = null) => {
    console.log(`[NOTIF] Alıcı: ${userId}, Tür: ${type}, Başlık: ${title}`);
    db.run("INSERT INTO notifications (user_id, type, title, body, entity_type, entity_id) VALUES (?, ?, ?, ?, ?, ?)",
        [userId, type, title, body, entityType, entityId], (err) => {
            if (err) console.error("!!! Notification Error:", err.message);
        });
};

// ---------------------------------------------------------
// 🛠️ İSTATİSTİK MOTORU
// ---------------------------------------------------------
const getStudentAnalytics = async (studentId) => {
    const trGunler = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    
    const [plans, attendance, user, holidayRows] = await Promise.all([
        new Promise(resolve => db.all("SELECT day FROM fixed_plan WHERE user_id = ? AND status = 'approved'", [studentId], (err, rows) => resolve(rows || []))),
        new Promise(resolve => db.all("SELECT date, status FROM attendance WHERE user_id = ? AND date >= '2026-01-01'", [studentId], (err, rows) => resolve(rows || []))),
        new Promise(resolve => db.get("SELECT created_at FROM users WHERE id = ?", [studentId], (err, row) => resolve(row))),
        new Promise(resolve => db.all("SELECT date FROM holidays", [], (err, rows) => resolve(rows || [])))
    ]);

    const holidays = holidayRows.map(h => h.date);
    const pDays = (plans || []).map(p => (p.day || '').trim().toLowerCase());
    const attMap = {}; 
    let attended = 0;
    let absent = 0;
    const absentDates = []; // Hangi günlerin devamsızlık yazıldığını takip et

    (attendance || []).forEach(a => {
        attMap[a.date] = a.status;
    });

    const projectStartDate = '2026-02-01';

    // Sadece benzersiz günler (son durum) üzerinden say
    Object.entries(attMap).forEach(([date, status]) => {
        // Proje başlangıcından önceki (Ocak ayı vb.) çok eski test verilerini atla
        if (date < projectStartDate) return;

        if (['completed', 'present', 'attended', 'working'].includes(status)) {
            attended++;
        } else if (status === 'absent') {
            absent++;
            absentDates.push(date + ' (DB)');
        }
    });
    
    const simdi = new Date();
    
    // Öğrencinin ilk yoklama kaydının tarihini bul
    let firstAttDateStr = null;
    if (attendance && attendance.length > 0) {
        // Tarihleri sırala
        const sortedAtt = [...attendance].sort((a, b) => a.date.localeCompare(b.date));
        firstAttDateStr = sortedAtt[0].date;
    }

    // Devamsızlık hesaplamasını öğrencinin kayıt tarihinden veya ilk yoklama tarihinden başlat
    let startDateStr = user?.created_at ? user.created_at.split(' ')[0] : projectStartDate;
    if (firstAttDateStr && firstAttDateStr < startDateStr) {
        startDateStr = firstAttDateStr; // Eğer kayıt tarihinden önce yoklama girilmişse oradan başla
    }
    if (startDateStr < projectStartDate) {
        startDateStr = projectStartDate;
    }

    let d = new Date(startDateStr);
    d.setHours(12, 0, 0, 0);

    const dun = new Date(); 
    dun.setDate(dun.getDate() - 1);
    dun.setHours(23, 59, 59, 999);

    while (d <= dun) {
        const dStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
        const gunAdi = trGunler[d.getDay()].toLowerCase();
        
        // Eğer o gün yoklama kaydı YOKSA, tatil DEĞİLSE ve planlı günse devamsız say
        if (!attMap[dStr] && pDays.includes(gunAdi) && !holidays.includes(dStr)) {
            absent++;
            absentDates.push(dStr + ' (Kayıt Yok)');
        }
        d.setDate(d.getDate() + 1);
    }

    console.log(`[DEVAMSIZLIK ANALİZİ] Öğrenci ID: ${studentId} | Toplam Devamsızlık: ${absent}`);
    console.log(`[DEVAMSIZLIK ANALİZİ] Devamsız Sayılan Günler: ${absentDates.join(', ')}`);

    return { attended, absent };
};

// ---------------------------------------------------------
// 🚀 ROTALAR
app.get('/api/public/departments', (req, res) => {
    const sql = `
        SELECT 
            id, name, open_time, close_time, student_capacity,
            (SELECT COUNT(*) FROM users WHERE dept_id = departments.id AND role = 'student' AND is_terminated = 0) as active_students
        FROM departments 
        WHERE is_active = 1
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return sendResponse(res, false, null, 'Birimler alınamadı.', 500);
        sendResponse(res, true, { departments: rows });
    });
});

app.post('/api/register/student', (req, res) => {
    const { name, email, password, tc_kimlik, iban, phone, documents, preferred_days, preferred_dept_id, course_schedule_matrix } = req.body;
    
    if (!name || !email || !password || !tc_kimlik || !iban || !phone || !documents) {
        return sendResponse(res, false, null, 'Lütfen tüm zorunlu alanları doldurun ve belgeleri yükleyin.', 400);
    }

    if (!documents.courseSchedule) {
        return sendResponse(res, false, null, 'Resmi ders programı belgesi yüklenmelidir.', 400);
    }

    const courseScheduleValidation = validateCourseScheduleMatrix(course_schedule_matrix);
    if (!courseScheduleValidation.valid) {
        return sendResponse(res, false, null, courseScheduleValidation.error, 400);
    }

    const cleanTC = tc_kimlik.toString().trim();
    if (cleanTC.length !== 11 || !/^\d+$/.test(cleanTC)) {
        return sendResponse(res, false, null, 'TC Kimlik numarası 11 haneli sayısal değer olmalıdır.', 400);
    }

    if (!validateIBAN(iban)) {
        return sendResponse(res, false, null, 'Geçersiz IBAN numarası.', 400);
    }

    db.get(
        "SELECT id, status FROM users WHERE (email = ? OR tc_kimlik = ?) AND status = 'permanently_rejected' LIMIT 1",
        [email, cleanTC],
        (err, permanentRejectRow) => {
        if (err) return sendResponse(res, false, null, 'Veritabanı hatası.', 500);
        if (permanentRejectRow) return sendResponse(res, false, null, 'Bu başvuru kalıcı olarak reddedilmiştir. Tekrar başvuru yapılamaz.', 403);

        // E-posta benzersizlik kontrolü
        db.get("SELECT id FROM users WHERE email = ?", [email], (err, row) => {
            if (err) return sendResponse(res, false, null, 'Veritabanı hatası.', 500);
            if (row) return sendResponse(res, false, null, 'Bu e-posta adresiyle kayıtlı bir kullanıcı zaten mevcut.', 400);

            // TC Kimlik benzersizlik kontrolü
            db.get("SELECT id FROM users WHERE tc_kimlik = ?", [cleanTC], (err, row2) => {
                if (err) return sendResponse(res, false, null, 'Veritabanı hatası.', 500);
                if (row2) return sendResponse(res, false, null, 'Bu TC Kimlik numarasıyla kayıtlı bir kullanıcı zaten mevcut.', 400);

                const documentsStr = JSON.stringify(documents);
                const preferredDaysStr = JSON.stringify(preferred_days || {});
                const courseScheduleMatrixStr = JSON.stringify(course_schedule_matrix);
                const preferredDeptId = preferred_dept_id ? Number(preferred_dept_id) : null;

                const sql = `
                    INSERT INTO users (name, password, role, tc_kimlik, iban, email, phone, status, documents, preferred_days, preferred_dept_id, course_schedule_matrix)
                    VALUES (?, ?, 'student', ?, ?, ?, ?, 'pending', ?, ?, ?, ?)
                `;

                db.run(sql, [name, password, cleanTC, iban, email, phone, documentsStr, preferredDaysStr, preferredDeptId, courseScheduleMatrixStr], function(insertErr) {
                    if (insertErr) {
                        console.error("[ERROR] Öğrenci Kayıt Hatası:", insertErr.message);
                        return sendResponse(res, false, null, 'Kayıt sırasında bir hata oluştu: ' + insertErr.message, 500);
                    }
                    
                    // Tüm super_admin kullanıcılarına yeni başvuru bildirimi gönder
                    db.all("SELECT id FROM users WHERE role = 'super_admin'", [], (adminErr, admins) => {
                        if (!adminErr && admins) {
                            admins.forEach(admin => {
                                createNotification(
                                    admin.id, 
                                    'student_registered', 
                                    'Yeni Öğrenci Başvurusu', 
                                    `${name} adlı öğrenci yeni kayıt başvurusu yaptı. Belgeler onay bekliyor.`, 
                                    'students-admin', 
                                    null
                                );
                            });
                        }
                    });

                    sendResponse(res, true, { id: this.lastID });
                });
            });
        });
    });
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    db.get("SELECT * FROM users WHERE email = ?", [email], (err, user) => {
        if (err || !user || user.password !== password) return sendResponse(res, false, null, 'Giriş hatası.', 401);
        const token = jwt.sign({ 
            id: user.id, 
            email: user.email, 
            name: user.name, 
            role: user.role, 
            dept_id: user.dept_id 
        }, SECRET_KEY, { expiresIn: '8h' });
        sendResponse(res, true, { token, user: { ...user, id: user.id } });
    });
});

app.get('/api/profile', authenticateToken, (req, res) => {
    db.get("SELECT id, name, email, role, dept_id, status, phone, tc_kimlik, iban, documents, preferred_days, preferred_dept_id, rejection_reason, course_schedule_matrix FROM users WHERE id = ?", [req.user.id], (err, user) => {
        if (err || !user) return sendResponse(res, false, null, 'Profil bulunamadı.', 404);
        sendResponse(res, true, { user });
    });
});

app.put('/api/student/application/revision', authenticateToken, authorizeRole('student'), (req, res) => {
    const { name, email, tc_kimlik, iban, phone, documents, preferred_days, preferred_dept_id, course_schedule_matrix } = req.body;

    if (!name || !email || !tc_kimlik || !iban || !phone || !documents) {
        return sendResponse(res, false, null, 'Lütfen tüm zorunlu alanları doldurun ve belgeleri yükleyin.', 400);
    }

    if (!documents.courseSchedule) {
        return sendResponse(res, false, null, 'Resmi ders programı belgesi yüklenmelidir.', 400);
    }

    const courseScheduleValidation = validateCourseScheduleMatrix(course_schedule_matrix);
    if (!courseScheduleValidation.valid) {
        return sendResponse(res, false, null, courseScheduleValidation.error, 400);
    }

    const cleanTC = tc_kimlik.toString().trim();
    if (cleanTC.length !== 11 || !/^\d+$/.test(cleanTC)) {
        return sendResponse(res, false, null, 'TC Kimlik numarası 11 haneli sayısal değer olmalıdır.', 400);
    }

    if (!validateIBAN(iban)) {
        return sendResponse(res, false, null, 'Geçersiz IBAN numarası.', 400);
    }

    db.get("SELECT * FROM users WHERE id = ?", [req.user.id], (err, user) => {
        if (err || !user) return sendResponse(res, false, null, 'Kullanıcı bulunamadı.', 404);
        if (user.status !== 'revision_required') {
            return sendResponse(res, false, null, 'Başvurunuz düzenleme durumunda değil.', 403);
        }

        db.get("SELECT id FROM users WHERE id != ? AND (email = ? OR tc_kimlik = ?) LIMIT 1", [req.user.id, email, cleanTC], (uniqueErr, existingUser) => {
            if (uniqueErr) return sendResponse(res, false, null, 'Veritabanı hatası.', 500);
            if (existingUser) return sendResponse(res, false, null, 'Bu e-posta veya TC Kimlik numarası başka bir kullanıcı tarafından kullanılıyor.', 400);

            const documentsStr = JSON.stringify(documents);
            const preferredDaysStr = JSON.stringify(preferred_days || {});
            const courseScheduleMatrixStr = JSON.stringify(course_schedule_matrix);
            const preferredDeptId = preferred_dept_id ? Number(preferred_dept_id) : null;

            const sql = `
                UPDATE users
                SET name = ?, email = ?, tc_kimlik = ?, iban = ?, phone = ?, documents = ?,
                    preferred_days = ?, preferred_dept_id = ?, course_schedule_matrix = ?, status = 'pending', rejection_reason = NULL
                WHERE id = ?
            `;

            db.run(sql, [name, email, cleanTC, iban, phone, documentsStr, preferredDaysStr, preferredDeptId, courseScheduleMatrixStr, req.user.id], function(updateErr) {
                if (updateErr) return sendResponse(res, false, null, 'Başvuru güncellenemedi: ' + updateErr.message, 500);

                db.all("SELECT id FROM users WHERE role = 'super_admin'", [], (adminErr, admins) => {
                    if (!adminErr && admins) {
                        admins.forEach(admin => {
                            createNotification(
                                admin.id,
                                'student_revision_submitted',
                                'Başvuru Yeniden Gönderildi',
                                `${name} adlı öğrenci başvurusunu düzelterek yeniden gönderdi.`,
                                'students-admin',
                                req.user.id
                            );
                        });
                    }
                });

                sendResponse(res, true, {
                    user: {
                        ...user,
                        name,
                        email,
                        tc_kimlik: cleanTC,
                        iban,
                        phone,
                        documents: documentsStr,
                        preferred_days: preferredDaysStr,
                        preferred_dept_id: preferredDeptId,
                        course_schedule_matrix: courseScheduleMatrixStr,
                        status: 'pending',
                        rejection_reason: null
                    }
                });
            });
        });
    });
});

// ---------------------------------------------------------
// 👑 SUPER ADMIN ÖDEME VE AYAR ROTALARI (EN ÜSTTE)
// ---------------------------------------------------------

app.get('/api/superadmin/settings', authenticateToken, authorizeRole('super_admin'), (req, res) => {
    console.log(`[${new Date().toLocaleTimeString()}] >> AYARLAR SORGULANIYOR`);
    db.all("SELECT * FROM system_settings", [], (err, rows) => {
        if (err) return sendResponse(res, false, null, 'Ayarlar alınamadı.', 500);
        const settings = {};
        rows.forEach(r => settings[r.key] = r.value);
        sendResponse(res, true, { settings });
    });
});

app.post('/api/superadmin/settings', authenticateToken, authorizeRole('super_admin'), (req, res) => {
    const { settings } = req.body;
    if (!settings) return sendResponse(res, false, null, 'Veri eksik.', 400);
    db.serialize(() => {
        const stmt = db.prepare("INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)");
        Object.entries(settings).forEach(([key, value]) => stmt.run([key, String(value)]));
        stmt.finalize((err) => {
            if (err) return sendResponse(res, false, null, 'Hata.', 500);
            sendResponse(res, true);
        });
    });
});

app.get('/api/superadmin/reports/payroll', authenticateToken, authorizeRole('super_admin'), (req, res) => {
    console.log(`[${new Date().toLocaleTimeString()}] >> BORDRO RAPORU İSTENİYOR`);
    const { year, month } = req.query;
    if (!year || !month) return sendResponse(res, false, null, 'Yıl/Ay eksik.', 400);

    const daysInMonth = new Date(year, month, 0).getDate();
    const mStart = `${year}-${month.toString().padStart(2, '0')}-01`, mEnd = `${year}-${month.toString().padStart(2, '0')}-${daysInMonth}`;

    db.get("SELECT value FROM system_settings WHERE key = 'daily_wage'", (err, setting) => {
        const dailyWage = parseInt(setting?.value || '1375');
        const sql = `
            SELECT u.name, u.tc_kimlik, u.iban, d.name as dept_name,
            (SELECT COUNT(*) FROM attendance a WHERE a.user_id = u.id AND a.date BETWEEN ? AND ? AND a.status IN ('completed', 'present', 'attended')) as attended_days
            FROM users u JOIN departments d ON u.dept_id = d.id WHERE u.role = 'student' ORDER BY d.name, u.name`;

        db.all(sql, [mStart, mEnd], (err, rows) => {
            if (err) return sendResponse(res, false, null, 'Veri hatası.', 500);
            const report = rows.map(r => ({
                ...r, tc_kimlik: r.tc_kimlik || 'BELİRTİLMEMİŞ', iban: r.iban || 'BELİRTİLMEMİŞ',
                daily_wage: dailyWage, total_amount: r.attended_days * dailyWage
            }));
            sendResponse(res, true, { payroll: report });
        });
    });
});

app.get('/api/superadmin/announcements', authenticateToken, authorizeRole('super_admin'), (req, res) => {
    db.all("SELECT a.*, u.name as author_name FROM announcements a LEFT JOIN users u ON a.created_by = u.id WHERE a.dept_id IS NULL ORDER BY a.created_at DESC", [], (err, rows) => {
        if (err) return sendResponse(res, false, null, 'Duyurular alınamadı.', 500);
        sendResponse(res, true, { announcements: rows });
    });
});

app.post('/api/superadmin/announcements', authenticateToken, authorizeRole('super_admin'), (req, res) => {
    const { title, content, priority } = req.body;
    db.run("INSERT INTO announcements (dept_id, created_by, title, content, priority) VALUES (NULL, ?, ?, ?, ?)", 
        [req.user.id, title, content, priority || 'normal'], (err) => {
        if (err) return sendResponse(res, false, null, 'Duyuru oluşturulamadı.', 500);
        sendResponse(res, true);
    });
});

app.delete('/api/superadmin/announcements/:id', authenticateToken, authorizeRole('super_admin'), (req, res) => {
    db.run("DELETE FROM announcements WHERE id = ? AND dept_id IS NULL", [req.params.id], function(err) {
        if (err) return sendResponse(res, false, null, 'Duyuru silinemedi.', 500);
        sendResponse(res, true);
    });
});

app.get('/api/superadmin/holidays', authenticateToken, authorizeRole('super_admin'), (req, res) => {
    db.all("SELECT * FROM holidays ORDER BY date", [], (err, rows) => {
        if (err) return sendResponse(res, false, null, 'Tatiller alınamadı.', 500);
        sendResponse(res, true, { holidays: rows });
    });
});

app.post('/api/superadmin/holidays', authenticateToken, authorizeRole('super_admin'), (req, res) => {
    const { date, description } = req.body;
    db.run("INSERT OR REPLACE INTO holidays (date, description, is_fixed) VALUES (?, ?, 0)", [date, description], (err) => {
        if (err) return sendResponse(res, false, null, 'Tatil eklenemedi.', 500);
        sendResponse(res, true);
    });
});

app.delete('/api/superadmin/holidays/:date', authenticateToken, authorizeRole('super_admin'), (req, res) => {
    db.run("DELETE FROM holidays WHERE date = ?", [req.params.date], (err) => {
        if (err) return sendResponse(res, false, null, 'Tatil silinemedi.', 500);
        sendResponse(res, true);
    });
});


app.get('/api/user/department', authenticateToken, (req, res) => {
    db.get("SELECT dept_id FROM users WHERE id = ?", [req.user.id], (err, user) => {
        if (err || !user || !user.dept_id) {
            return sendResponse(res, true, { department: null });
        }
        db.get("SELECT * FROM departments WHERE id = ?", [user.dept_id], (err2, row) => sendResponse(res, true, { department: row }));
    });
});

app.get('/api/user/stats', authenticateToken, async (req, res) => {
    try {
        const stats = await getStudentAnalytics(req.user.id);
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const daysInMonth = new Date(year, month, 0).getDate();
        const mStart = `${year}-${month.toString().padStart(2, '0')}-01`;
        const mEnd = `${year}-${month.toString().padStart(2, '0')}-${daysInMonth}`;
        const bugunStr = now.toISOString().split('T')[0];
        const trGunler = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
        const bugunName = trGunler[now.getDay()];

        const [plans, att, user, completedTasks, dailyWageSetting, holidayRows] = await Promise.all([
            new Promise(resolve => db.all("SELECT day FROM fixed_plan WHERE user_id = ? AND status='approved'", [req.user.id], (err, rows) => resolve(rows || []))),
            new Promise(resolve => db.all("SELECT date, status FROM attendance WHERE user_id = ? AND date BETWEEN ? AND ?", [req.user.id, mStart, mEnd], (err, rows) => resolve(rows || []))),
            new Promise(resolve => db.get("SELECT created_at FROM users WHERE id = ?", [req.user.id], (err, row) => resolve(row))),
            new Promise(resolve => db.get("SELECT COUNT(*) as count FROM tasks WHERE (assigned_to = ? OR assigned_to IS NULL) AND status = 'approved'", [req.user.id], (err, row) => resolve(row?.count || 0))),
            new Promise(resolve => db.get("SELECT value FROM system_settings WHERE key = 'daily_wage'", (err, row) => resolve(row?.value || '1375'))),
            new Promise(resolve => db.all("SELECT date FROM holidays WHERE date BETWEEN ? AND ?", [mStart, mEnd], (err, rows) => resolve(rows || [])))
        ]);

        const holidays = holidayRows.map(h => h.date);

        const pDays = plans.map(p => p.day.toLowerCase());
        const attMap = {}; (att || []).forEach(a => attMap[a.date] = a.status);
        const studentCreatedAt = user?.created_at ? user.created_at.split(' ')[0] : '2000-01-01';

        let monthAttended = 0, monthAbsent = 0;
        for (let d = 1; d <= daysInMonth; d++) {
            const dateObj = new Date(year, month - 1, d);
            const dStr = `${year}-${month.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
            const dName = trGunler[dateObj.getDay()].toLowerCase();
            
            if (attMap[dStr]) { 
                const s = attMap[dStr];
                if (s === 'completed' || s === 'present' || s === 'attended' || s === 'working') monthAttended++; 
                else monthAbsent++; 
            }
            else if (dStr < studentCreatedAt) continue;
            else if (pDays.includes(dName) && dStr < bugunStr && !holidays.includes(dStr)) { 
                monthAbsent++; 
            }
        }

        db.get("SELECT hours FROM fixed_plan WHERE user_id = ? AND day = ? AND status = 'approved'", [req.user.id, bugunName], (err, planRow) => {
            db.get("SELECT check_in, check_out FROM attendance WHERE user_id = ? AND date = ?", [req.user.id, bugunStr], (err, attRow) => {
                sendResponse(res, true, {
                    total_attended: stats.attended,
                    total_absent: stats.absent,
                    month_attended: monthAttended,
                    month_absent: monthAbsent,
                    total_completed_tasks: completedTasks,
                    today_plan: planRow ? JSON.parse(planRow.hours) : null,
                    today_attendance: attRow || null,
                    daily_wage: parseInt(dailyWageSetting)
                });
            });
        });
        return;
    } catch (err) {
        sendResponse(res, false, null, err.message, 500);
    }
});

app.get('/api/dept/manager', authenticateToken, (req, res) => {
    db.get("SELECT dept_id FROM users WHERE id = ?", [req.user.id], (err, user) => {
        if (err || !user || !user.dept_id) {
            return sendResponse(res, true, { manager: null });
        }
        db.get("SELECT name, role, email FROM users WHERE dept_id = ? AND role = 'manager' LIMIT 1", [user.dept_id], (err2, row) => sendResponse(res, true, { manager: row }));
    });
});

app.get('/api/user/students', authenticateToken, (req, res) => {
    db.all("SELECT id, name, email, is_terminated, program_duration_months FROM users WHERE dept_id = ? AND role = 'student'", [req.user.dept_id], (err, rows) => {
        if (err) return sendResponse(res, false, null, 'Öğrenci listesi alınamadı.', 500);
        sendResponse(res, true, { students: rows || [] });
    });
});

app.get('/api/dept/students/overview', authenticateToken, authorizeRole('manager'), async (req, res) => {
    db.all("SELECT id, name, email, is_terminated, program_duration_months FROM users WHERE dept_id = ? AND role = 'student' ORDER BY name", [req.user.dept_id], async (err, students) => {
        if (err || !students) return sendResponse(res, false, null, 'Öğrenci özetleri alınamadı.', 500);
        const results = await Promise.all(students.map(async (s) => {
            const stats = await getStudentAnalytics(s.id);
            return { ...s, attended_days: stats.attended, absent_days: stats.absent };
        }));
        sendResponse(res, true, { students: results });
    });
});

app.get('/api/timesheet/manager', authenticateToken, authorizeRole('manager'), async (req, res) => {
    const { year, month } = req.query;
    const daysInMonth = new Date(year, month, 0).getDate();
    const mStart = `${year}-${month.toString().padStart(2, '0')}-01`, mEnd = `${year}-${month.toString().padStart(2, '0')}-${daysInMonth}`;
    const trGunler = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    const bugunStr = new Date().toISOString().split('T')[0];
    db.all("SELECT id, name, is_terminated, program_duration_months, created_at FROM users WHERE dept_id = ? AND role = 'student' ORDER BY name", [req.user.dept_id], async (err, students) => {
        if (err || !students) return sendResponse(res, false, null, 'Puantaj verileri alınamadı.', 500);
        const results = await Promise.all(students.map(async (s) => {
            const [plans, att, overall] = await Promise.all([
                new Promise(res => db.all("SELECT day FROM fixed_plan WHERE user_id = ? AND status='approved'", [s.id], (e, r) => res(r || []))),
                new Promise(res => db.all("SELECT date, status FROM attendance WHERE user_id = ? AND date BETWEEN ? AND ?", [s.id, mStart, mEnd], (e, r) => res(r || []))),
                getStudentAnalytics(s.id)
            ]);
            const pDays = plans.map(p => (p.day || '').toLowerCase()), attMap = {}; 
            att.forEach(a => attMap[a.date] = a.status);
            
            const studentCreatedAt = s.created_at ? s.created_at.split(' ')[0] : '2000-01-01';
            const days = []; let monthAttended = 0, monthAbsent = 0;

            for (let d = 1; d <= daysInMonth; d++) {
                const dateObj = new Date(year, month - 1, d);
                const dStr = `${year}-${month.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
                const dName = trGunler[dateObj.getDay()].toLowerCase();
                let status = 'none';
                
                if (attMap[dStr]) { 
                    const attStatus = attMap[dStr];
                    if (attStatus === 'completed' || attStatus === 'present' || attStatus === 'attended' || attStatus === 'working') {
                        status = 'attended';
                        monthAttended++;
                    } else {
                        status = 'absent';
                        monthAbsent++;
                    }
                }
                else if (dStr < studentCreatedAt) {
                    status = 'none'; // Kayıt öncesi
                }
                else if (pDays.includes(dName) && dStr < bugunStr) { 
                    status = 'absent'; 
                    monthAbsent++; 
                }
                else if (pDays.includes(dName)) {
                    status = 'planned';
                }
                days.push({ day: d, status });
            }
            return { student_id: s.id, student_name: s.name, is_terminated: s.is_terminated, program_duration_months: s.program_duration_months, days, total_attended_month: monthAttended, total_absent_month: monthAbsent, total_overall_absent: overall.absent };
        }));
        sendResponse(res, true, { timesheet: results });
    });
});

app.get('/api/announcements', authenticateToken, (req, res) => {
    db.get("SELECT dept_id FROM users WHERE id = ?", [req.user.id], (err, user) => {
        const deptId = user?.dept_id || null;
        db.all("SELECT a.*, u.name as author_name FROM announcements a LEFT JOIN users u ON a.created_by = u.id WHERE a.dept_id = ? OR a.dept_id IS NULL ORDER BY a.created_at DESC", [deptId], (err2, rows) => sendResponse(res, true, { announcements: rows }));
    });
});

app.post('/api/announcements', authenticateToken, authorizeRole('manager'), (req, res) => {
    const { title, content, priority } = req.body;
    db.run("INSERT INTO announcements (dept_id, created_by, title, content, priority) VALUES (?, ?, ?, ?, ?)", [req.user.dept_id, req.user.id, title, content, priority || 'normal'], () => sendResponse(res, true));
});

app.delete('/api/announcements/:id', authenticateToken, authorizeRole('manager'), (req, res) => {
    db.run("DELETE FROM announcements WHERE id = ? AND dept_id = ?", [req.params.id, req.user.dept_id], function (err) {
        if (err) return sendResponse(res, false, null, 'Duyuru silinemedi.', 500);
        if (this.changes === 0) return sendResponse(res, false, null, 'Duyuru bulunamadı.', 404);
        sendResponse(res, true);
    });
});

app.get('/api/tasks', authenticateToken, (req, res) => {
    const deptId = Number(req.user.dept_id);
    const sql = req.user.role === 'student'
        ? "SELECT * FROM tasks WHERE assigned_to = ? OR assigned_to IS NULL ORDER BY created_at DESC"
        : "SELECT t.*, u.name as student_name, d.name as origin_dept_name FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id LEFT JOIN departments d ON t.dept_id = d.id WHERE t.dept_id = ? OR u.dept_id = ? ORDER BY COALESCE(t.updated_at, t.created_at) DESC";
    db.all(sql, [req.user.role === 'student' ? req.user.id : deptId, req.user.role === 'student' ? null : deptId], (err, rows) => sendResponse(res, true, { tasks: rows }));
});

app.post('/api/tasks', authenticateToken, authorizeRole('manager'), (req, res) => {
    const { assigned_to, student_id, title, description, category, deadline } = req.body;
    const assignedTo = assigned_to || student_id || null;

    const insertTask = () => {
        db.run("INSERT INTO tasks (dept_id, created_by, assigned_to, title, description, category, deadline) VALUES (?, ?, ?, ?, ?, ?, ?)", 
            [req.user.dept_id, req.user.id, assignedTo, title, description, category, deadline], function(err) {
            if (err) return sendResponse(res, false, null, 'Görev oluşturulamadı.', 500);
            if (assignedTo) {
                createNotification(assignedTo, 'task_assigned', 'Yeni Görev', `Size yeni bir görev atandı: "${title}"`, 'tasks', this.lastID);
            }
            sendResponse(res, true);
        });
    };

    if (assignedTo) {
        db.get("SELECT dept_id FROM users WHERE id = ? AND role = 'student'", [assignedTo], (err, student) => {
            if (err) return sendResponse(res, false, null, 'Veritabanı hatası.', 500);
            if (!student) return sendResponse(res, false, null, 'Belirtilen öğrenci bulunamadı.', 404);
            if (student.dept_id !== req.user.dept_id) {
                return sendResponse(res, false, null, 'Sadece kendi biriminizdeki öğrencilere görev atayabilirsiniz.', 403);
            }
            insertTask();
        });
    } else {
        insertTask();
    }
});

app.put('/api/tasks/:id', authenticateToken, authorizeRole('manager'), (req, res) => {
    const { title, description, category, deadline, student_id, assigned_to } = req.body;
    const assignedTo = assigned_to || student_id || null;

    db.get("SELECT dept_id, assigned_to, title FROM tasks WHERE id = ?", [req.params.id], (err, task) => {
        if (err) return sendResponse(res, false, null, 'Veritabanı hatası.', 500);
        if (!task) return sendResponse(res, false, null, 'Görev bulunamadı.', 404);
        if (task.dept_id !== req.user.dept_id) return sendResponse(res, false, null, 'Bu görevi düzenleme yetkiniz yok.', 403);

        const updateTask = () => {
            db.run(
                "UPDATE tasks SET title = ?, description = ?, category = ?, deadline = ?, assigned_to = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                [title, description, category, deadline, assignedTo, req.params.id],
                function(updateErr) {
                    if (updateErr) return sendResponse(res, false, null, 'Görev güncellenemedi.', 500);
                    if (assignedTo && assignedTo !== task.assigned_to) {
                        createNotification(assignedTo, 'task_assigned', 'Yeni Görev', `Size yeni bir görev atandı: "${title}"`, 'tasks', req.params.id);
                    }
                    sendResponse(res, true);
                }
            );
        };

        if (assignedTo) {
            db.get("SELECT dept_id FROM users WHERE id = ? AND role = 'student'", [assignedTo], (err2, student) => {
                if (err2) return sendResponse(res, false, null, 'Veritabanı hatası.', 500);
                if (!student) return sendResponse(res, false, null, 'Belirtilen öğrenci bulunamadı.', 404);
                if (student.dept_id !== req.user.dept_id) {
                    return sendResponse(res, false, null, 'Sadece kendi biriminizdeki öğrencilere görev atayabilirsiniz.', 403);
                }
                updateTask();
            });
        } else {
            updateTask();
        }
    });
});

app.put('/api/tasks/submit/:id', authenticateToken, authorizeRole('student'), (req, res) => {
    const { completion_note } = req.body;
    // Eğer görev henüz atanmamışsa (null), teslim eden öğrenciye ata
    db.run("UPDATE tasks SET completion_note = ?, status = 'submitted', assigned_to = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND (assigned_to = ? OR assigned_to IS NULL)", 
        [completion_note, req.user.id, req.params.id, req.user.id], function (err) {
        if (err) return sendResponse(res, false, null, 'Görev teslim edilemedi.', 500);
        if (this.changes === 0) return sendResponse(res, false, null, 'Görev bulunamadı.', 404);
        
        // Notify Manager
        db.get("SELECT title, dept_id FROM tasks WHERE id = ?", [req.params.id], (e, task) => {
            // Öncelikle öğrencinin kendi yöneticisini bul (Ali Çelik gibi)
            db.get("SELECT id FROM users WHERE dept_id = ? AND role = 'manager' LIMIT 1", [req.user.dept_id], (e2, manager) => {
                if (manager) {
                    createNotification(manager.id, 'task_submitted', 'Görev Teslimi', `${req.user.name} bir görev teslim etti: "${task?.title}"`, 'tasks', req.params.id);
                }
                
                // Eğer görev başka bir bölüme aitse, o bölümün yöneticisine de bildir
                if (task?.dept_id && task.dept_id !== req.user.dept_id) {
                    db.get("SELECT id FROM users WHERE dept_id = ? AND role = 'manager' LIMIT 1", [task.dept_id], (e3, otherManager) => {
                        if (otherManager) {
                            createNotification(otherManager.id, 'task_submitted', 'Bölüm Dışı Görev Teslimi', `${req.user.name} (${req.user.dept_name || 'Dış Birim'}) bir görev teslim etti: "${task.title}"`, 'tasks', req.params.id);
                        }
                    });
                }
            });
        });
        
        sendResponse(res, true);
    });
});

app.put('/api/tasks/evaluate/:id', authenticateToken, authorizeRole('manager'), (req, res) => {
    const { performance_score, manager_feedback } = req.body;
    const score = Number(performance_score);
    const status = score > 0 ? 'approved' : 'rejected';
    db.run("UPDATE tasks SET performance_score = ?, manager_feedback = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND dept_id = ?", [score > 0 ? score : null, manager_feedback || null, status, req.params.id, req.user.dept_id], function (err) {
        if (err) return sendResponse(res, false, null, 'Değerlendirme kaydedilemedi.', 500);
        if (this.changes === 0) return sendResponse(res, false, null, 'Görev bulunamadı.', 404);
        
        // Notify Student
        db.get("SELECT title, assigned_to FROM tasks WHERE id = ?", [req.params.id], (e, task) => {
            if (task?.assigned_to) {
                createNotification(task.assigned_to, 'task_reviewed', 'Görev Sonucu', `"${task.title}" görevi ${status === 'approved' ? 'onaylandı' : 'reddedildi'}.`, 'tasks', req.params.id);
            }
        });
        
        sendResponse(res, true);
    });
});

app.delete('/api/tasks/:id', authenticateToken, authorizeRole('manager'), (req, res) => {
    db.run("DELETE FROM tasks WHERE id = ? AND dept_id = ?", [req.params.id, req.user.dept_id], function (err) {
        if (err) return sendResponse(res, false, null, 'Görev silinemedi.', 500);
        if (this.changes === 0) return sendResponse(res, false, null, 'Görev bulunamadı.', 404);
        sendResponse(res, true);
    });
});

app.post('/api/puantaj/manager/terminate/:id', authenticateToken, authorizeRole('manager'), (req, res) => {
    db.run("UPDATE users SET is_terminated = 1 WHERE id = ?", [req.params.id], () => sendResponse(res, true));
});

app.get('/api/plan/student', authenticateToken, (req, res) => {
    db.all("SELECT * FROM fixed_plan WHERE user_id = ?", [req.user.id], (err, rows) => sendResponse(res, true, { plans: rows }));
});

app.get('/api/plan/manager', authenticateToken, authorizeRole('manager'), (req, res) => {
    console.log(`DEBUG: /api/plan/manager isteği işleniyor... DeptID: ${req.user.dept_id}`);
    const sql = `
      SELECT fp.id, fp.user_id, fp.dept_id, fp.day, fp.hours, fp.status,
             fp.course_schedule_file, fp.created_at, fp.updated_at,
             u.name as student_name, u.course_schedule_matrix
      FROM fixed_plan fp
      JOIN users u ON fp.user_id = u.id
      WHERE fp.dept_id = ?
    `;
    db.all(sql, [req.user.dept_id], (err, rows) => {
      if (err) {
        console.error('Manager plan sorgu hatası:', err);
        return sendResponse(res, false, null, 'Planlar alınamadı.', 500);
      }
      if (rows && rows.length > 0) {
        console.log('DEBUG: İlk plan satırı anahtarları:', Object.keys(rows[0]));
        console.log('DEBUG: course_schedule_matrix var mı?', rows[0].hasOwnProperty('course_schedule_matrix'));
        console.log('DEBUG: course_schedule_matrix tipi:', typeof rows[0].course_schedule_matrix);
      }
      sendResponse(res, true, { plans: rows });
    });
});

app.post('/api/plan/student', authenticateToken, authorizeRole('student'), (req, res) => {
    const { plan_data } = req.body;
    const activePlanDays = Array.isArray(plan_data) ? plan_data.filter(item => Array.isArray(item.slots) && item.slots.length > 0) : [];
    const herGunTam75 = activePlanDays.every(item => calculateDailyHours(item.slots) === 7.5);
    const toplamSaat = activePlanDays.reduce((sum, item) => sum + calculateDailyHours(item.slots), 0);
    if (!Array.isArray(plan_data) || activePlanDays.length > 3 || !herGunTam75 || ![7.5, 15.0, 22.5].includes(toplamSaat)) {
        return sendResponse(res, false, null, 'Her seçilen gün tam 7.5 saat olmalıdır. Toplam 7.5, 15 veya 22.5 saat çalışılabilir.', 400);
    }
    db.serialize(() => {
        db.run("DELETE FROM fixed_plan WHERE user_id = ? AND status IN ('pending', 'rejected')", [req.user.id]);
        const stmt = db.prepare("INSERT INTO fixed_plan (user_id, dept_id, day, hours, status) VALUES (?, ?, ?, ?, 'pending')");
        activePlanDays.forEach(item => stmt.run([req.user.id, req.user.dept_id, item.day, JSON.stringify(item.slots)]));
        stmt.finalize(() => {
            // İsmi veritabanından çekelim (Token'da yoksa bile garanti olsun)
            db.get("SELECT name FROM users WHERE id = ?", [req.user.id], (err, student) => {
                const studentName = student?.name || 'Bir öğrenci';
                
                db.get("SELECT id FROM users WHERE dept_id = ? AND role = 'manager' LIMIT 1", [req.user.dept_id], (err, manager) => {
                    if (manager) {
                        const birDakikaOnce = new Date(Date.now() - 60000).toISOString();
                        db.get("SELECT id FROM notifications WHERE user_id = ? AND type = 'plan_submitted' AND created_at > ?", 
                            [manager.id, birDakikaOnce], (e, existingNotif) => {
                            if (!existingNotif) {
                                createNotification(manager.id, 'plan_submitted', 'Plan Onayı', `${studentName} yeni çalışma planı hazırladı.`, 'planning', null);
                            }
                        });
                    }
                    sendResponse(res, true);
                });
            });
        });
    });
});

app.post('/api/plan/manager/approve', authenticateToken, authorizeRole('manager'), (req, res) => {
    const { plan_id, status } = req.body;
    console.log("-------------------------------------------");
    console.log(`[İŞLEM BAŞLADI] PlanID: ${plan_id}, Yeni Durum: ${status}`);
    
    // 1. Önce bu plan kaydından öğrencinin kim olduğunu bul
    db.get("SELECT user_id FROM fixed_plan WHERE id = ?", [plan_id], (err, plan) => {
        if (!plan || !plan.user_id) {
            console.error("❌ HATA: Plan bulunamadı veya UserID eksik!");
            return sendResponse(res, false, null, 'Plan bulunamadı.', 404);
        }

        const studentId = plan.user_id;
        console.log(`[İŞLEM] Öğrenci ID: ${studentId} için tüm planlar güncelleniyor...`);

        if (status === 'rejected') {
            // RED: O öğrenciye ait TÜM planları sil
            db.run("DELETE FROM fixed_plan WHERE user_id = ?", [studentId], function(err) {
                if (err) {
                    console.error("❌ HATA: Silme işlemi başarısız!", err);
                    return sendResponse(res, false, null, 'Hata oluştu.', 500);
                }
                console.log(`✅ BAŞARILI: ${this.changes} adet kayıt silindi. (Öğrenci: ${studentId})`);
                
                // Bildirim gönder
                const birDakikaOnce = new Date(Date.now() - 60000).toISOString();
                db.get("SELECT id FROM notifications WHERE user_id = ? AND type = 'plan_rejected' AND created_at > ?", 
                    [studentId, birDakikaOnce], (e, existingNotif) => {
                    if (!existingNotif) {
                        createNotification(studentId, 'plan_rejected', 'Plan Reddedildi', 'Çalışma planınız reddedildi, lütfen yeni bir plan oluşturun.', 'planning', null);
                    }
                });
                sendResponse(res, true);
            });
        } else {
            // ONAY: O öğrenciye ait TÜM bekleyen planları onayla
            db.run("UPDATE fixed_plan SET status = 'approved' WHERE user_id = ? AND status = 'pending'", [studentId], function(err) {
                if (err) {
                    console.error("❌ HATA: Onaylama işlemi başarısız!", err);
                    return sendResponse(res, false, null, 'Hata oluştu.', 500);
                }
                console.log(`✅ BAŞARILI: ${this.changes} adet kayıt onaylandı. (Öğrenci: ${studentId})`);

                const birDakikaOnce = new Date(Date.now() - 60000).toISOString();
                db.get("SELECT id FROM notifications WHERE user_id = ? AND type = 'plan_approved' AND created_at > ?", 
                    [studentId, birDakikaOnce], (e, existingNotif) => {
                    if (!existingNotif) {
                        createNotification(studentId, 'plan_approved', 'Plan Onaylandı', 'Çalışma planınız başarıyla onaylandı.', 'planning', null);
                    }
                });
                sendResponse(res, true);
            });
        }
        console.log("-------------------------------------------");
    });
});

app.get('/api/notifications/manager', authenticateToken, authorizeRole('manager'), async (req, res) => {
    try {
        const [plans, tasks] = await Promise.all([
            new Promise(resolve => db.all("SELECT * FROM fixed_plan WHERE dept_id = ? AND status = 'pending'", [req.user.dept_id], (err, rows) => resolve(rows || []))),
            new Promise(resolve => db.all("SELECT t.*, u.name as student_name FROM tasks t JOIN users u ON t.assigned_to = u.id WHERE (t.dept_id = ? OR u.dept_id = ?) AND t.status = 'submitted'", [Number(req.user.dept_id), Number(req.user.dept_id)], (err, rows) => resolve(rows || [])))
        ]);

        const notifs = [
            ...plans.map(r => ({ type: 'warning', title: 'Plan Onayı', message: 'Yeni plan onayınızı bekliyor.', target: 'planning' })),
            ...tasks.map(t => ({ type: 'info', title: 'Görev Teslimi', message: `${t.student_name} bir görev teslim etti.`, target: 'tasks' }))
        ];
        sendResponse(res, true, { notifications: notifs });
    } catch (err) {
        sendResponse(res, false, null, 'Bildirimler alınamadı.', 500);
    }
});

app.get('/api/notifications', authenticateToken, (req, res) => {
    db.all("SELECT * FROM notifications WHERE user_id = ? AND is_read = 0 ORDER BY created_at DESC LIMIT 20", [req.user.id], (err, rows) => {
        if (err) return sendResponse(res, false, null, 'Bildirimler alınamadı.', 500);
        
        const notifs = (rows || []).map(r => ({
            id: r.id,
            type: r.type.includes('rejected') || r.type.includes('error') ? 'error' : 
                  r.type.includes('warning') ? 'warning' : 'info',
            title: r.title,
            message: r.body,
            target: r.entity_type || 'planning'
        }));

        // Eğer super_admin ise atama bekleyen onaylı öğrencileri de dinamik ekle
        if (req.user.role === 'super_admin') {
            db.get("SELECT COUNT(*) as count FROM users WHERE role = 'student' AND status = 'approved' AND dept_id IS NULL", [], (err2, row) => {
                if (!err2 && row && row.count > 0) {
                    notifs.push({
                        id: 'superadmin-unassigned-notif',
                        type: 'warning',
                        title: 'Atama Bekleyen Öğrenciler',
                        message: `Atama bekleyen ${row.count} onaylı öğrenci bulunuyor.`,
                        target: 'students-admin'
                    });
                }
                sendResponse(res, true, { notifications: notifs });
            });
        } else {
            sendResponse(res, true, { notifications: notifs });
        }
    });
});

app.post('/api/notifications/read/:id', authenticateToken, (req, res) => {
    db.run("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?", [req.params.id, req.user.id], () => {
        sendResponse(res, true);
    });
});

app.post('/api/notifications/read-all', authenticateToken, (req, res) => {
    db.run("UPDATE notifications SET is_read = 1 WHERE user_id = ?", [req.user.id], () => {
        sendResponse(res, true);
    });
});

// ---------------------------------------------------------
// 🔑 OTP STORE (BELLEKTE TUTULUR)
// ---------------------------------------------------------
const otpStore = new Map(); // key: otp_code, value: { user_id, type, expires_at }

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

app.post('/api/otp/student/generate-checkin', authenticateToken, authorizeRole('student'), (req, res) => {
    const trGunler = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    const bugunName = trGunler[new Date().getDay()];
    
    db.get("SELECT id FROM fixed_plan WHERE user_id = ? AND day = ? AND status = 'approved'", [req.user.id, bugunName], (err, plan) => {
        if (err) return sendResponse(res, false, null, 'Plan kontrolü yapılamadı.', 500);
        if (!plan) return sendResponse(res, false, null, 'Bugün çalışma planınızda bulunmamaktadır. Mesai başlatamazsınız.', 400);

        const otpCode = generateOTP();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 dakika geçerli
        otpStore.set(otpCode, { user_id: req.user.id, type: 'checkin', expires_at: expiresAt });
        sendResponse(res, true, { otp_code: otpCode, expires_at: expiresAt });
    });
});

app.post('/api/otp/manager/verify-checkin', authenticateToken, authorizeRole('manager'), (req, res) => {
    const { otp_code } = req.body;
    const otpData = otpStore.get(otp_code);

    if (!otpData || otpData.type !== 'checkin' || new Date() > otpData.expires_at) {
        return res.status(400).json({ success: false, error: 'Geçersiz veya süresi dolmuş kod.' });
    }

    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toLocaleTimeString('tr-TR');

    db.run("INSERT INTO attendance (user_id, date, check_in, status, type) VALUES (?, ?, ?, 'working', 'otp')", 
        [otpData.user_id, today, now], (err) => {
        if (err) return sendResponse(res, false, null, 'Kayıt oluşturulamadı.', 500);
        otpStore.delete(otp_code);
        sendResponse(res, true, { message: 'Mesai girişi onaylandı.' });
    });
});

app.post('/api/otp/manager/generate-checkout', authenticateToken, authorizeRole('manager'), (req, res) => {
    const { user_id } = req.body;
    const today = new Date().toISOString().split('T')[0];

    db.get("SELECT status FROM attendance WHERE user_id = ? AND date = ? AND status = 'working'", [user_id, today], (err, row) => {
        if (err) return sendResponse(res, false, null, 'Kayıt kontrolü yapılamadı.', 500);
        if (!row) return sendResponse(res, false, null, 'Bu öğrencinin bugün devam eden aktif bir mesaisi bulunmuyor.', 400);

        const otpCode = generateOTP();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        otpStore.set(otpCode, { user_id: parseInt(user_id), type: 'checkout', expires_at: expiresAt });
        sendResponse(res, true, { otp_code: otpCode, expires_at: expiresAt });
    });
});

app.post('/api/otp/student/verify-checkout', authenticateToken, authorizeRole('student'), (req, res) => {
    const { otp_code } = req.body;
    const otpData = otpStore.get(otp_code);

    if (!otpData || otpData.type !== 'checkout' || otpData.user_id !== req.user.id || new Date() > otpData.expires_at) {
        return res.status(400).json({ success: false, error: 'Geçersiz veya süresi dolmuş kod.' });
    }

    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toLocaleTimeString('tr-TR');

    db.run("UPDATE attendance SET check_out = ?, status = 'completed' WHERE user_id = ? AND date = ? AND status = 'working'", 
        [now, req.user.id, today], function (err) {
        if (err) return sendResponse(res, false, null, 'Kayıt güncellenemedi.', 500);
        if (this.changes === 0) return sendResponse(res, false, null, 'Zaten çıkış yapmışsınız veya aktif mesainiz yok.', 400);
        
        otpStore.delete(otp_code);
        sendResponse(res, true, { message: 'Mesai çıkışı onaylandı.' });
    });
});

app.get('/api/otp/manager/recent-checkins', authenticateToken, authorizeRole('manager'), (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const sql = `
        SELECT a.check_in, a.check_out, a.status, u.name as student_name 
        FROM attendance a 
        JOIN users u ON a.user_id = u.id 
        WHERE u.dept_id = ? AND a.date = ?
        ORDER BY a.check_in DESC
    `;
    db.all(sql, [req.user.dept_id, today], (err, rows) => {
        if (err) return sendResponse(res, false, null, 'Kayıtlar alınamadı.', 500);
        sendResponse(res, true, { recent_checkins: rows || [] });
    });
});

app.get('/api/otp/student/recent-checkins', authenticateToken, authorizeRole('student'), (req, res) => {
    const sql = `
        SELECT date, check_in, check_out, status 
        FROM attendance 
        WHERE user_id = ? 
        ORDER BY date DESC, check_in DESC 
        LIMIT 5
    `;
    db.all(sql, [req.user.id], (err, rows) => {
        if (err) return sendResponse(res, false, null, 'Kayıtlar alınamadı.', 500);
        sendResponse(res, true, { recent_checkins: rows || [] });
    });
});

app.get('/api/notifications/student', authenticateToken, authorizeRole('student'), (req, res) => {
    db.all("SELECT status, MAX(updated_at) as updated_at FROM fixed_plan WHERE user_id = ? AND status != 'pending' GROUP BY status ORDER BY updated_at DESC LIMIT 5", [req.user.id], (err, rows) => {
        const notifs = (rows || []).map(r => ({ type: 'info', title: 'Plan Güncelleme', message: `Planınız ${r.status === 'approved' ? 'onaylandı' : 'reddedildi'}.`, target: 'planning' }));
        sendResponse(res, true, { notifications: notifs });
    });
});

app.get('/api/timesheet/student', authenticateToken, authorizeRole('student'), async (req, res) => {
    const { year, month } = req.query;
    const studentId = req.user.id;
    const daysInMonth = new Date(year, month, 0).getDate();
    const mStart = `${year}-${month.toString().padStart(2, '0')}-01`, mEnd = `${year}-${month.toString().padStart(2, '0')}-${daysInMonth}`;
    const trGunler = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    const bugunStr = new Date().toISOString().split('T')[0];
    try {
        const [plans, att, overall, dailyWageRow, holidayRows, user] = await Promise.all([
            new Promise(res => db.all("SELECT day FROM fixed_plan WHERE user_id = ? AND status='approved'", [studentId], (e, r) => res(r || []))),
            new Promise(res => db.all("SELECT date, status FROM attendance WHERE user_id = ? AND date BETWEEN ? AND ?", [studentId, mStart, mEnd], (e, r) => res(r || []))),
            getStudentAnalytics(studentId),
            new Promise(res => db.get("SELECT value FROM system_settings WHERE key = 'daily_wage'", (e, r) => res(r))),
            new Promise(res => db.all("SELECT date FROM holidays WHERE date BETWEEN ? AND ?", [mStart, mEnd], (e, r) => res(r || []))),
            new Promise(res => db.get("SELECT created_at FROM users WHERE id = ?", [studentId], (e, r) => res(r)))
        ]);

        const rate = parseInt(dailyWageRow?.value || '1375');
        const holidays = holidayRows.map(h => h.date);
        const pDays = plans.map(p => p.day.toLowerCase()), attMap = {}; 
        att.forEach(a => attMap[a.date] = a.status);

        const studentCreatedAt = user?.created_at ? user.created_at.split(' ')[0] : '2000-01-01';
        const days = []; 
        let monthAttended = 0, monthAbsent = 0;

        for (let d = 1; d <= daysInMonth; d++) {
            const dateObj = new Date(year, month - 1, d);
            const dStr = `${year}-${month.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
            const dName = trGunler[dateObj.getDay()].toLowerCase();
            const isHoliday = holidays.includes(dStr);
            let status = 'none';

            if (attMap[dStr]) { 
                const dbStatus = attMap[dStr];
                if (dbStatus === 'completed' || dbStatus === 'present' || dbStatus === 'attended' || dbStatus === 'working') {
                    status = 'attended';
                    monthAttended++;
                } else {
                    status = 'absent';
                    monthAbsent++;
                }
            }
            else if (isHoliday) {
                status = 'holiday';
            }
            else if (dStr < studentCreatedAt) {
                status = 'none';
            }
            else if (pDays.includes(dName) && dStr < bugunStr) { 
                status = 'absent'; monthAbsent++; 
            }
            else if (pDays.includes(dName)) {
                status = 'planned';
            }
            days.push({ day: d, status });
        }

        const earnings = monthAttended * rate;
        console.log(`[HAKEDİŞ DEBUG] Öğrenci: ${studentId}, Ay: ${month}, Gün: ${monthAttended}, Yevmiye: ${rate}, Toplam: ${earnings}`);

        sendResponse(res, true, {
            days,
            total_attended_month: monthAttended,
            total_absent_month: monthAbsent,
            total_overall_days: overall.attended,
            monthly_earnings: earnings
        });
    } catch (err) {
        console.error("Puantaj Hatası:", err);
        sendResponse(res, false, null, 'Puantaj verileri alınamadı.', 500);
    }
});

// ---------------------------------------------------------
// 👑 SUPER ADMIN ROTALARI
// ---------------------------------------------------------

// --- KULLANICI YÖNETİMİ ---
app.get('/api/superadmin/users', authenticateToken, authorizeRole('super_admin'), (req, res) => {
    const sql = `
        SELECT u.id, u.name, u.email, u.role, u.dept_id, u.tc_kimlik, u.iban, u.phone, 
               u.status, u.documents, u.preferred_days, u.preferred_dept_id, u.course_schedule_matrix, u.program_duration_months, 
               u.is_terminated, u.rejection_reason, u.created_at, d.name as dept_name 
        FROM users u 
        LEFT JOIN departments d ON u.dept_id = d.id
        WHERE u.role != 'super_admin'
        ORDER BY u.role, u.name
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return sendResponse(res, false, null, 'Kullanıcılar alınamadı.', 500);
        sendResponse(res, true, { users: rows });
    });
});

app.get('/api/superadmin/unassigned-count', authenticateToken, authorizeRole('super_admin'), (req, res) => {
    db.get("SELECT COUNT(*) as count FROM users WHERE role = 'student' AND status = 'approved' AND dept_id IS NULL", [], (err, row) => {
        if (err) return sendResponse(res, false, null, 'Atanmamış öğrenci sayısı alınamadı.', 500);
        sendResponse(res, true, { count: row?.count || 0 });
    });
});

app.put('/api/superadmin/users/:id', authenticateToken, authorizeRole('super_admin'), (req, res) => {
    const userId = req.params.id;
    db.get("SELECT * FROM users WHERE id = ?", [userId], (err, user) => {
        if (err || !user) return sendResponse(res, false, null, 'Kullanıcı bulunamadı.', 404);

        const name = req.body.name !== undefined ? req.body.name : user.name;
        const email = req.body.email !== undefined ? req.body.email : user.email;
        const dept_id = req.body.dept_id !== undefined ? req.body.dept_id : user.dept_id;
        const role = req.body.role !== undefined ? req.body.role : user.role;
        const status = req.body.status !== undefined ? req.body.status : user.status;
        const tc_kimlik = req.body.tc_kimlik !== undefined ? req.body.tc_kimlik : user.tc_kimlik;
        const iban = req.body.iban !== undefined ? req.body.iban : user.iban;
        const phone = req.body.phone !== undefined ? req.body.phone : user.phone;
        const program_duration_months = req.body.program_duration_months !== undefined ? req.body.program_duration_months : user.program_duration_months;
        const is_terminated = req.body.is_terminated !== undefined ? (req.body.is_terminated ? 1 : 0) : user.is_terminated;
        const rejection_reason = req.body.rejection_reason !== undefined ? req.body.rejection_reason : user.rejection_reason;
        if ((status === 'revision_required' || status === 'permanently_rejected') && !String(rejection_reason || '').trim()) {
            return sendResponse(res, false, null, 'Düzeltme veya kesin ret işlemi için açıklama zorunludur.', 400);
        }

        // Validations (only if student and values provided)
        if (role === 'student' && iban) {
            if (!validateIBAN(iban)) {
                return sendResponse(res, false, null, 'Geçersiz IBAN numarası.', 400);
            }
        }
        if (role === 'student' && tc_kimlik) {
            const cleanTC = tc_kimlik.toString().trim();
            if (cleanTC.length !== 11 || !/^\d+$/.test(cleanTC)) {
                return sendResponse(res, false, null, 'TC Kimlik numarası 11 haneli sayısal değer olmalıdır.', 400);
            }
        }

        const sql = `
            UPDATE users 
            SET name = ?, email = ?, dept_id = ?, role = ?, status = ?, tc_kimlik = ?, iban = ?, phone = ?, 
                program_duration_months = ?, is_terminated = ?, rejection_reason = ? 
            WHERE id = ?
        `;
        db.run(sql, [
            name, 
            email, 
            dept_id ? Number(dept_id) : null, 
            role, 
            status || 'pending', 
            tc_kimlik, 
            iban, 
            phone, 
            program_duration_months ? Number(program_duration_months) : null,
            is_terminated,
            rejection_reason,
            userId
        ], function(err) {
            if (err) return sendResponse(res, false, null, 'Kullanıcı güncellenemedi: ' + err.message, 500);
            
            // Asenkron bildirim gönderimi
            (async () => {
                try {
                    if (role === 'student') {
                        let eskiBirimAdi = '';
                        let yeniBirimAdi = '';
                        
                        const parsedOldDeptId = user.dept_id ? Number(user.dept_id) : null;
                        const parsedNewDeptId = dept_id ? Number(dept_id) : null;

                        if (parsedOldDeptId !== parsedNewDeptId) {
                            if (parsedOldDeptId) {
                                eskiBirimAdi = await new Promise(r => db.get("SELECT name FROM departments WHERE id = ?", [parsedOldDeptId], (e, row) => r(row?.name || '')));
                            }
                            if (parsedNewDeptId) {
                                yeniBirimAdi = await new Promise(r => db.get("SELECT name FROM departments WHERE id = ?", [parsedNewDeptId], (e, row) => r(row?.name || '')));
                            }
                        }

                        await ogrenciDurumBildirimiGonder(
                            { id: userId, name, email, phone, role },
                            user.status,
                            status,
                            eskiBirimAdi,
                            yeniBirimAdi,
                            rejection_reason
                        );
                    }
                } catch (notifErr) {
                    console.error('[NOTIF ERROR] Bildirim gönderilirken hata:', notifErr.message);
                }
            })();

            sendResponse(res, true);
        });
    });
});

app.delete('/api/superadmin/users/:id', authenticateToken, authorizeRole('super_admin'), (req, res) => {
    // Önce kullanıcıya ait önemli veriler var mı kontrol edilebilir (yoklama vb.)
    // Ancak super_admin yetkisiyle doğrudan silme yapıyoruz.
    db.run("DELETE FROM users WHERE id = ?", [req.params.id], function(err) {
        if (err) return sendResponse(res, false, null, 'Kullanıcı silinemedi.', 500);
        sendResponse(res, true);
    });
});

app.get('/api/superadmin/departments', authenticateToken, authorizeRole('super_admin'), (req, res) => {
    const sql = `
        SELECT 
            d.*, 
            u.name as manager_name,
            (SELECT COUNT(*) FROM users WHERE dept_id = d.id AND role = 'student' AND is_terminated = 0) as active_students
        FROM departments d
        LEFT JOIN users u ON u.dept_id = d.id AND u.role = 'manager'
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return sendResponse(res, false, null, 'Birimler alınamadı.', 500);
        sendResponse(res, true, { departments: rows });
    });
});

app.post('/api/superadmin/departments', authenticateToken, authorizeRole('super_admin'), (req, res) => {
    const { name, open_time, close_time, student_capacity } = req.body;
    db.run("INSERT INTO departments (name, open_time, close_time, student_capacity) VALUES (?, ?, ?, ?)", 
        [name, open_time, close_time, student_capacity || 0], function(err) {
        if (err) return sendResponse(res, false, null, 'Birim oluşturulamadı.', 500);
        sendResponse(res, true, { id: this.lastID });
    });
});

app.put('/api/superadmin/departments/:id', authenticateToken, authorizeRole('super_admin'), (req, res) => {
    const { name, open_time, close_time, student_capacity } = req.body;
    db.run("UPDATE departments SET name = ?, open_time = ?, close_time = ?, student_capacity = ? WHERE id = ?", 
        [name, open_time, close_time, student_capacity, req.params.id], function(err) {
        if (err) return sendResponse(res, false, null, 'Birim güncellenemedi.', 500);
        sendResponse(res, true);
    });
});

app.delete('/api/superadmin/departments/:id', authenticateToken, authorizeRole('super_admin'), (req, res) => {
    const deptId = req.params.id;

    // Önce bu birime kayıtlı kullanıcı var mı kontrol et
    db.get("SELECT COUNT(*) as count FROM users WHERE dept_id = ?", [deptId], (err, row) => {
        if (err) return sendResponse(res, false, null, 'Kontrol yapılamadı.', 500);
        
        if (row.count > 0) {
            return sendResponse(res, false, null, 'Bu birime kayıtlı kullanıcılar (öğrenci/sorumlu) bulunduğu için birim silinemez. Önce kullanıcıları başka birime taşıyın veya silin.', 400);
        }

        // Kullanıcı yoksa sil
        db.run("DELETE FROM departments WHERE id = ?", [deptId], function(err) {
            if (err) return sendResponse(res, false, null, 'Birim silinemedi.', 500);
            sendResponse(res, true);
        });
    });
});

app.post('/api/superadmin/managers', authenticateToken, authorizeRole('super_admin'), (req, res) => {
    const { name, password, email, dept_id } = req.body;
    const cleanDeptId = Number(dept_id);

    console.log(`[DEBUG] Yeni Sorumlu İsteği: ${email}, Birim: ${cleanDeptId}`);

    db.run("INSERT INTO users (name, password, email, role, dept_id, status) VALUES (?, ?, ?, 'manager', ?, 'approved')", 
        [name, password, email, cleanDeptId], function(err) {
        if (err) {
            console.error("[ERROR] Sorumlu Ekleme Hatası:", err.message);
            if (err.message.includes('UNIQUE')) {
                const field = 'E-posta';
                return sendResponse(res, false, null, `Bu ${field} zaten alınmış.`, 400);
            }
            return sendResponse(res, false, null, 'Birim Sorumlusu eklenemedi.', 500);
        }
        console.log(`[DEBUG] Sorumlu Eklendi: ID ${this.lastID}`);
        sendResponse(res, true, { id: this.lastID });
    });
});


// ---------------------------------------------------------
// 👨‍💼 YÖNETİCİ ÖĞRENCİ YÖNETİMİ (KAPASİTE KONTROLLÜ)
// ---------------------------------------------------------

app.post('/api/manager/students', authenticateToken, authorizeRole('manager'), (req, res) => {
    const { name, email, password, program_duration_months } = req.body;
    const deptId = Number(req.user.dept_id);

    console.log(`[DEBUG] Yeni Öğrenci İsteği: ${email}, Birim: ${deptId}`);

    // Kapasite Kontrolü
    db.get(`
        SELECT 
            (SELECT student_capacity FROM departments WHERE id = ?) as capacity,
            (SELECT COUNT(*) FROM users WHERE dept_id = ? AND role = 'student' AND is_terminated = 0) as current_count
    `, [deptId, deptId], (err, row) => {
        if (err) return sendResponse(res, false, null, 'Kapasite kontrolü yapılamadı.', 500);
        
        const capacity = row?.capacity || 0;
        const currentCount = row?.current_count || 0;

        if (capacity > 0 && currentCount >= capacity) {
            return sendResponse(res, false, null, `Bu birimin kapasitesi (${capacity}) dolmuştur.`, 400);
        }

        db.run("INSERT INTO users (name, email, password, role, dept_id, program_duration_months, tc_kimlik, iban, is_terminated) VALUES (?, ?, ?, 'student', ?, ?, ?, ?, 0)", 
            [name, email, password, deptId, program_duration_months || 6, req.body.tc_kimlik, req.body.iban], function(err) {
            if (err) {
                console.error("[ERROR] Öğrenci Ekleme Hatası:", err.message);
                if (err.message.includes('UNIQUE')) {
                    const field = err.message.includes('tc_kimlik') ? 'TC Kimlik No' : 'E-posta';
                    return sendResponse(res, false, null, `Bu ${field} zaten sisteme kayıtlı.`, 400);
                }
                return sendResponse(res, false, null, 'Öğrenci eklenemedi.', 500);
            }
            console.log(`[DEBUG] Öğrenci Eklendi: ID ${this.lastID}`);
            sendResponse(res, true, { id: this.lastID });
        });
    });
});

app.post('/api/manager/students/activate/:id', authenticateToken, authorizeRole('manager'), (req, res) => {
    const deptId = req.user.dept_id;

    // Kapasite Kontrolü
    db.get(`
        SELECT 
            (SELECT student_capacity FROM departments WHERE id = ?) as capacity,
            (SELECT COUNT(*) FROM users WHERE dept_id = ? AND role = 'student' AND is_terminated = 0) as current_count
    `, [deptId, deptId], (err, row) => {
        if (err) return sendResponse(res, false, null, 'Kapasite kontrolü yapılamadı.', 500);
        
        if (row.capacity > 0 && row.current_count >= row.capacity) {
            return sendResponse(res, false, null, 'Bu birimin İŞKUR öğrenci kapasitesi dolmuştur.', 400);
        }

        db.run("UPDATE users SET is_terminated = 0 WHERE id = ? AND dept_id = ?", [req.params.id, deptId], function(err) {
            if (err) return sendResponse(res, false, null, 'Öğrenci aktif edilemedi.', 500);
            sendResponse(res, true);
        });
    });
});

const path = require('path');

// Statik dosyaları sun (Vite React dist klasörü)
app.use(express.static(path.join(__dirname, '../../dist')));

// API dışındaki tüm rotaları React index.html dosyasına yönlendir (SPA fallback)
app.get('/*splat', (req, res, next) => {
    if (req.path.startsWith('/api')) {
        return next();
    }
    res.sendFile(path.join(__dirname, '../../dist/index.html'));
});

// CATCH-ALL 404
app.use((req, res, next) => {
    if (req.url.startsWith('/api')) {
        return res.status(404).json({ success: false, error: `Ruta ${req.url} bulunamadı.` });
    }
    next();
});

// ERROR HANDLER (Catch-all for Express errors)
app.use((err, req, res, next) => {
    if (err && err.type === 'entity.too.large') {
        console.error(`!!! 413 PAYLOAD TOO LARGE: ${req.method} ${req.url}`);
        return res.status(413).json({ 
            success: false, 
            error: 'Yüklenen dosya çok büyük. Lütfen 2MB\'dan daha küçük bir dosya seçin.' 
        });
    }
    console.error("!!! SUNUCU HATASI:", err);
    res.status(500).json({ success: false, error: 'Bir sunucu hatası oluştu.' });
});

app.listen(PORT, HOST, () => console.log(`🚀 Sunucu http://${HOST}:${PORT} üzerinde aktif!`));
