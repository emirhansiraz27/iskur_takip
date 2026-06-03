"use strict";

const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const dbPath = path.resolve(__dirname, "../veri/veritabani.sqlite");
const db = new sqlite3.Database(dbPath);

const TR = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
const COURSE_DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
const COURSE_SLOTS = ['S-1', 'S-2', 'S-3', 'S-4', 'S-5', 'S-6', 'S-7', 'S-8', 'S-9', 'S-10', 'S-11', 'S-12', 'S-13', 'S-14', 'S-15'];
const COURSE_SLOT_DETAILS = {
  'S-1':  { start: '08:30', end: '09:15' },
  'S-2':  { start: '09:25', end: '10:10' },
  'S-3':  { start: '10:20', end: '11:05' },
  'S-4':  { start: '11:15', end: '12:00' },
  'S-5':  { start: '13:00', end: '13:45' },
  'S-6':  { start: '13:55', end: '14:40' },
  'S-7':  { start: '14:50', end: '15:35' },
  'S-8':  { start: '15:45', end: '16:30' },
  'S-9':  { start: '17:00', end: '17:45' },
  'S-10': { start: '17:55', end: '18:40' },
  'S-11': { start: '18:50', end: '19:35' },
  'S-12': { start: '19:45', end: '20:30' },
  'S-13': { start: '20:40', end: '21:25' },
  'S-14': { start: '21:35', end: '22:20' },
  'S-15': { start: '22:30', end: '23:15' }
};

const HOLIDAYS = [
  '2026-01-01',
  '2026-04-23',
  '2026-05-01',
  '2026-05-19'
];

function toAscii(str) {
  return str.toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/i̇/g, 'i');
}

function kullaniciAdiOlustur(adi) {
  const parcalar = adi.trim().split(' ');
  const ad = parcalar[0];
  const soyad = parcalar.slice(1).join(' ');
  return toAscii(ad + '.' + soyad);
}

function createCourseMatrix(type, emptyDays = []) {
  const matrix = {};
  for (const day of COURSE_DAYS) {
    matrix[day] = {};
    const isDayEmpty = emptyDays.includes(day);
    for (const slot of COURSE_SLOTS) {
      if (isDayEmpty) {
        matrix[day][slot] = false;
      } else if (type === 'sabah') {
        const slotNum = parseInt(slot.split('-')[1]);
        matrix[day][slot] = (slotNum >= 2 && slotNum <= 7);
      } else if (type === 'aksam') {
        const slotNum = parseInt(slot.split('-')[1]);
        matrix[day][slot] = (slotNum >= 9 && slotNum <= 14);
      } else {
        matrix[day][slot] = false;
      }
    }
  }
  return matrix;
}

const DEPTS = [
  { id: 1, name: "İktisat", open_time: "08:30", close_time: "18:30" },
  { id: 2, name: "İşletme", open_time: "08:30", close_time: "18:30" },
  { id: 3, name: "Maliye", open_time: "15:00", close_time: "23:15" },
  { id: 4, name: "Çalışma Ekonomisi ve Endüstri İlişkileri", open_time: "08:30", close_time: "18:30" },
  { id: 5, name: "Ekonometri", open_time: "15:00", close_time: "23:15" },
  { id: 6, name: "Yönetim Bilişim Sistemleri", open_time: "08:30", close_time: "23:15" },
  { id: 7, name: "Kütüphane", open_time: "08:30", close_time: "18:30" },
  { id: 8, name: "Spor Salonu", open_time: "08:30", close_time: "18:30" }
];

const MANAGERS = [
  { id: 1, name: "Ahmet Yılmaz", dept_id: 1 },
  { id: 2, name: "Ayşe Kaya", dept_id: 2 },
  { id: 3, name: "Mehmet Demir", dept_id: 3 },
  { id: 4, name: "Fatma Çelik", dept_id: 4 },
  { id: 5, name: "Ali Yıldız", dept_id: 5 },
  { id: 6, name: "Zeynep Şahin", dept_id: 6 },
  { id: 7, name: "Mustafa Aydın", dept_id: 7 },
  { id: 8, name: "Emine Arslan", dept_id: 8 }
];

const STUDENTS = [
  { id: 11, name: "Zeynep Kara", dept_id: 1, type: "sabah", emptyDays: ["Cuma"], duration: 6, planDays: ["Cuma"], workSlots: ["S-1", "S-2", "S-3", "S-4", "S-5", "S-6", "S-7", "S-8"] },
  { id: 12, name: "Burak Aydın", dept_id: 1, type: "aksam", emptyDays: [], duration: 12, planDays: ["Salı", "Perşembe"], workSlots: ["S-1", "S-2", "S-3", "S-4", "S-5", "S-6", "S-7", "S-8"] },
  { id: 13, name: "Selin Çetin", dept_id: 2, type: "sabah", emptyDays: ["Perşembe"], duration: 6, planDays: ["Perşembe"], workSlots: ["S-1", "S-2", "S-3", "S-4", "S-5", "S-6", "S-7", "S-8"] },
  { id: 14, name: "Emre Doğan", dept_id: 2, type: "aksam", emptyDays: ["Cuma"], duration: 12, planDays: ["Çarşamba", "Cuma"], workSlots: ["S-1", "S-2", "S-3", "S-4", "S-5", "S-6", "S-7", "S-8"] },
  { id: 15, name: "Gizem Polat", dept_id: 3, type: "sabah", emptyDays: [], duration: 6, planDays: ["Pazartesi", "Çarşamba"], workSlots: ["S-8", "S-9", "S-10", "S-11", "S-12", "S-13", "S-14", "S-15"] }, // KRİTİK DEVAMSIZLIK
  { id: 16, name: "Tolga Bozkurt", dept_id: 3, type: "sabah", emptyDays: ["Cuma"], duration: 12, planDays: ["Salı", "Perşembe"], workSlots: ["S-8", "S-9", "S-10", "S-11", "S-12", "S-13", "S-14", "S-15"] },
  { id: 17, name: "Merve Güneş", dept_id: 4, type: "sabah", emptyDays: ["Pazartesi"], duration: 6, planDays: ["Pazartesi"], workSlots: ["S-1", "S-2", "S-3", "S-4", "S-5", "S-6", "S-7", "S-8"] },
  { id: 18, name: "Alp Karaman", dept_id: 4, type: "aksam", emptyDays: [], duration: 12, planDays: ["Salı", "Perşembe"], workSlots: ["S-1", "S-2", "S-3", "S-4", "S-5", "S-6", "S-7", "S-8"] },
  { id: 19, name: "Cansu Türk", dept_id: 5, type: "sabah", emptyDays: [], duration: 6, planDays: ["Pazartesi", "Salı", "Çarşamba"], workSlots: ["S-8", "S-9", "S-10", "S-11", "S-12", "S-13", "S-14", "S-15"] },
  { id: 20, name: "Mert Kılıç", dept_id: 5, type: "sabah", emptyDays: ["Perşembe"], duration: 12, planDays: ["Cuma"], workSlots: ["S-8", "S-9", "S-10", "S-11", "S-12", "S-13", "S-14", "S-15"] },
  { id: 21, name: "İrem Koç", dept_id: 6, type: "sabah", emptyDays: [], duration: 6, planDays: ["Pazartesi", "Çarşamba", "Cuma"], workSlots: ["S-8", "S-9", "S-10", "S-11", "S-12", "S-13", "S-14", "S-15"] },
  { id: 22, name: "Deniz Arslan", dept_id: 6, type: "aksam", emptyDays: [], duration: 12, planDays: ["Salı", "Perşembe"], workSlots: ["S-1", "S-2", "S-3", "S-4", "S-5", "S-6", "S-7", "S-8"] },
  { id: 23, name: "Ceren Yıldırım", dept_id: 6, type: "sabah", emptyDays: ["Çarşamba"], duration: 12, planDays: ["Pazartesi", "Salı"], workSlots: ["S-8", "S-9", "S-10", "S-11", "S-12", "S-13", "S-14", "S-15"] },
  { id: 24, name: "Oğuz Çelik", dept_id: 7, type: "aksam", emptyDays: [], duration: 6, planDays: ["Çarşamba", "Perşembe", "Cuma"], workSlots: ["S-1", "S-2", "S-3", "S-4", "S-5", "S-6", "S-7", "S-8"] }, // KRİTİK DEVAMSIZLIK
  { id: 25, name: "Ece Şimşek", dept_id: 7, type: "aksam", emptyDays: [], duration: 12, planDays: ["Pazartesi", "Çarşamba", "Cuma"], workSlots: ["S-1", "S-2", "S-3", "S-4", "S-5", "S-6", "S-7", "S-8"] },
  { id: 26, name: "Berk Yılmaz", dept_id: 8, type: "aksam", emptyDays: [], duration: 6, planDays: ["Salı", "Perşembe"], workSlots: ["S-1", "S-2", "S-3", "S-4", "S-5", "S-6", "S-7", "S-8"] },
  { id: 27, name: "Pınar Özdemir", dept_id: 8, type: "aksam", emptyDays: [], duration: 12, planDays: ["Pazartesi", "Çarşamba"], workSlots: ["S-1", "S-2", "S-3", "S-4", "S-5", "S-6", "S-7", "S-8"] },
  { id: 28, name: "Arda Şahin", dept_id: 8, type: "aksam", emptyDays: ["Salı"], duration: 12, planDays: ["Salı", "Perşembe", "Cuma"], workSlots: ["S-1", "S-2", "S-3", "S-4", "S-5", "S-6", "S-7", "S-8"] }
];

const runQuery = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function(err) {
    if (err) reject(err);
    else resolve(this);
  });
});

async function createTables() {
  await runQuery(`
    CREATE TABLE IF NOT EXISTS departments (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      name             TEXT NOT NULL,
      open_time        TEXT NOT NULL,
      close_time       TEXT NOT NULL,
      student_capacity INTEGER DEFAULT 10,
      location         TEXT,
      is_active        INTEGER DEFAULT 1,
      created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS users (
      id                      INTEGER PRIMARY KEY AUTOINCREMENT,
      name                    TEXT,
      email                   TEXT UNIQUE NOT NULL,
      password                TEXT NOT NULL,
      role                    TEXT NOT NULL CHECK(role IN ('manager', 'student', 'super_admin')),
      dept_id                 INTEGER,
      program_duration_months INTEGER,
      is_terminated           INTEGER DEFAULT 0,
      tc_kimlik               TEXT UNIQUE,
      iban                    TEXT,
      phone                   TEXT,
      status                  TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'assigned', 'approved', 'rejected', 'revision_required', 'permanently_rejected')),
      documents               TEXT,
      preferred_days          TEXT,
      preferred_dept_id       INTEGER,
      rejection_reason        TEXT,
      course_schedule_matrix  TEXT,
      last_login_at           TIMESTAMP,
      failed_login_attempts   INTEGER DEFAULT 0,
      locked_until            TIMESTAMP,
      created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (dept_id) REFERENCES departments(id) ON DELETE SET NULL
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS fixed_plan (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id              INTEGER NOT NULL,
      dept_id              INTEGER NOT NULL,
      day                  TEXT NOT NULL,
      hours                TEXT NOT NULL,
      status               TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
      course_schedule_file TEXT,
      created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (dept_id) REFERENCES departments(id) ON DELETE CASCADE
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS attendance (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL,
      date       TEXT NOT NULL,
      check_in   TEXT,
      check_out  TEXT,
      status     TEXT,
      type       TEXT,
      note       TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, date)
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS tasks (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      dept_id           INTEGER NOT NULL,
      created_by        INTEGER NOT NULL,
      assigned_to       INTEGER,
      title             TEXT NOT NULL,
      description       TEXT,
      category          TEXT NOT NULL,
      deadline          TIMESTAMP,
      status            TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'submitted', 'approved', 'rejected')),
      priority          TEXT DEFAULT 'normal',
      is_archived       INTEGER DEFAULT 0,
      completion_note   TEXT,
      performance_score INTEGER CHECK(performance_score >= 1 AND performance_score <= 5),
      manager_feedback  TEXT,
      created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (dept_id)    REFERENCES departments(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS holidays (
      date        TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      is_fixed    INTEGER DEFAULT 0
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS announcements (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      dept_id    INTEGER,
      created_by INTEGER NOT NULL,
      title      TEXT NOT NULL,
      content    TEXT NOT NULL,
      priority   TEXT DEFAULT 'normal' CHECK(priority IN ('normal', 'high', 'critical', 'urgent')),
      expires_at TEXT,
      is_pinned  INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (dept_id)    REFERENCES departments(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS announcement_reads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      announcement_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      read_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE (announcement_id, user_id)
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS leave_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      dept_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('sick', 'personal', 'emergency', 'other')),
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
      reviewed_by INTEGER,
      review_note TEXT,
      reviewed_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (dept_id) REFERENCES departments(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT,
      entity_type TEXT,
      entity_id INTEGER,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id INTEGER,
      old_value TEXT,
      new_value TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);
}

async function main() {
  try {
    console.log("🧹 Clearing old database tables...");
    await runQuery("PRAGMA foreign_keys = OFF");
    const tables = [
      "leave_requests", "notifications", "audit_logs", "announcement_reads", 
      "announcements", "tasks", "holidays", "attendance", "fixed_plan", 
      "users", "departments", "system_settings"
    ];
    for (const t of tables) {
      await runQuery(`DROP TABLE IF EXISTS ${t}`);
    }
    await runQuery("PRAGMA foreign_keys = ON");

    // Create schema
    await createTables();

    // 1. Departman Ekleme
    for (const d of DEPTS) {
      await runQuery(
        "INSERT INTO departments (id, name, open_time, close_time, student_capacity) VALUES (?, ?, ?, ?, 10)",
        [d.id, d.name, d.open_time, d.close_time]
      );
    }

    // 2. Yönetici Ekleme
    for (const m of MANAGERS) {
      const email = kullaniciAdiOlustur(m.name) + "@deu.edu.tr";
      await runQuery(
        "INSERT INTO users (id, name, email, password, role, dept_id, status, created_at) VALUES (?, ?, ?, ?, 'manager', ?, 'approved', '2026-02-01 08:00:00')",
        [m.id, m.name, email, "123456", m.dept_id]
      );
    }

    // 3. Öğrenci Ekleme
    for (const s of STUDENTS) {
      const email = kullaniciAdiOlustur(s.name) + "@ogr.deu.edu.tr";
      const matrix = JSON.stringify(createCourseMatrix(s.type, s.emptyDays));
      await runQuery(
        "INSERT INTO users (id, name, email, password, role, dept_id, program_duration_months, is_terminated, created_at, status, course_schedule_matrix) VALUES (?, ?, ?, ?, 'student', ?, ?, 0, '2026-02-01 08:00:00', 'assigned', ?)",
        [s.id, s.name, email, "123456", s.dept_id, s.duration, matrix]
      );
    }

    // 4. Sistem Yöneticisi Ekleme
    await runQuery(
      "INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, ?)",
      ['Sistem Yöneticisi', 'superadmin@deu.edu.tr', 'superadmin123', 'super_admin', 'approved']
    );
    await runQuery(
      "INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, ?)",
      ['Sistem Yöneticisi (Ogr)', 'superadmin@ogr.deu.edu.tr', 'superadmin123', 'super_admin', 'approved']
    );

    // 5. Çalışma Planları (Fixed Plan) Ekleme
    for (const s of STUDENTS) {
      const hoursJSON = JSON.stringify(s.workSlots);
      for (const day of s.planDays) {
        await runQuery(
          "INSERT INTO fixed_plan (user_id, dept_id, day, hours, status) VALUES (?, ?, ?, ?, 'approved')",
          [s.id, s.dept_id, day, hoursJSON]
        );
      }
    }

    // 6. Yoklama (Attendance) Ekleme (1 Şubat 2026'dan 2 Haziran 2026'ya kadar)
    const start = new Date('2026-02-01');
    const end = new Date('2026-06-02');
    
    let absentCounts = { 15: 0, 24: 0 };

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayIndex = d.getDay();
      const dayName = TR[dayIndex];
      
      // Hafta sonu ve resmi tatil günlerinde yoklama alma
      if (dayIndex === 0 || dayIndex === 6 || HOLIDAYS.includes(dateStr)) {
        continue;
      }
      
      for (const s of STUDENTS) {
        if (s.planDays.includes(dayName)) {
          let status = 'completed';
          let note = '';
          
          if (s.id === 15) {
            if (absentCounts[15] < 8 && d.getDate() % 7 === 0) {
              status = 'absent';
              note = 'Habersiz katılım sağlamadı.';
              absentCounts[15]++;
            }
          } else if (s.id === 24) {
            if (absentCounts[24] < 9 && d.getDate() % 5 === 0) {
              status = 'absent';
              note = 'İletişim kurulamadı, mazeretsiz gelmedi.';
              absentCounts[24]++;
            }
          } else {
            if (Math.random() < 0.01) {
              status = 'absent';
              note = 'Gelmeyeceğini bildirmedi.';
            }
          }
          
          const firstSlot = s.workSlots[0];
          const lastSlot = s.workSlots[s.workSlots.length - 1];
          const checkInTime = COURSE_SLOT_DETAILS[firstSlot]?.start || '08:30';
          const checkOutTime = COURSE_SLOT_DETAILS[lastSlot]?.end || '17:00';
          
          await runQuery(
            "INSERT INTO attendance (user_id, date, check_in, check_out, status, type, note) VALUES (?, ?, ?, ?, ?, 'normal', ?)",
            [s.id, dateStr, checkInTime, checkOutTime, status, note]
          );
        }
      }
    }

    // 7. Örnek Görevler (Tasks) Ekleme
    const SAMPLE_TASKS = [
      // Pending tasks
      { dept_id: 1, assigned_to: 11, category: 'Veri Girişi', title: 'İktisat Raporlama Veri Girişi', description: 'Arşivdeki ekonomik verilerin sisteme girişinin yapılması.', status: 'pending', priority: 'normal' },
      { dept_id: 2, assigned_to: 13, category: 'Evrak Düzeni', title: 'İşletme Belge Arşivleme', description: 'Staj belgelerinin taranarak arşivlenmesi.', status: 'pending', priority: 'high' },
      { dept_id: 3, assigned_to: 16, category: 'Teknik Destek', title: 'Maliye Veri Kontrolü', description: 'Gelir tablolarındaki formüllerin kontrol edilmesi.', status: 'pending', priority: 'normal' },
      { dept_id: 6, assigned_to: 21, category: 'Kodlama/Veri', title: 'YBS Portal Düzenleme', description: 'Birim web sayfasındaki öğrenci bilgilerinin güncellenmesi.', status: 'pending', priority: 'normal' },
      { dept_id: 7, assigned_to: 25, category: 'Tasnif', title: 'Kütüphane Kitap Barkodlama', description: 'Yeni gelen iktisat kitaplarının etiketlenmesi.', status: 'pending', priority: 'normal' },
      { dept_id: 8, assigned_to: 27, category: 'Organizasyon', title: 'Spor Salonu Ekipman Kontrolü', description: 'Kullanım dışı kalan spor aletlerinin envanterden düşülmesi.', status: 'pending', priority: 'normal' },

      // Submitted tasks (Waiting for manager review)
      { dept_id: 1, assigned_to: 12, category: 'Raporlama', title: 'Haftalık İktisadi Göstergeler Raporu', description: 'Son haftaya ait döviz ve enflasyon verilerinin tablolaştırılması.', status: 'submitted', priority: 'high', completion_note: 'Tüm veriler Merkez Bankası sitesinden çekilerek Excel formatında rapora eklenmiştir. Onayınızı rica ederim.' },
      { dept_id: 6, assigned_to: 22, category: 'Veritabanı', title: 'YBS Envanter Veritabanı Yedeği', description: 'Sunucudaki demirbaş veritabanının haftalık yedeğinin alınması.', status: 'submitted', priority: 'normal', completion_note: 'SQL yedek dosyası `.bak` uzantılı olarak sunucu yedek klasörüne yüklenmiştir.' },
      { dept_id: 8, assigned_to: 28, category: 'Saha Yönetimi', title: 'Spor Aletleri Temizlik ve Hijyen Raporu', description: 'Spor salonundaki tüm istasyonların dezenfeksiyon durum raporu.', status: 'submitted', priority: 'high', completion_note: 'Salon dezenfekte edilmiş, imza föyleri doldurulmuştur.' },

      // Approved tasks (Completed and scored)
      { dept_id: 1, assigned_to: 11, category: 'Sunum', title: 'Ekonomik Büyüme Sunum Hazırlığı', description: 'Akademik kurul toplantısı için büyüme grafiklerinin slayt yapılması.', status: 'approved', priority: 'normal', completion_note: 'Slaytlar PowerPoint olarak yöneticime e-posta ile gönderilmiştir.', performance_score: 5, manager_feedback: 'Grafikler çok temiz ve profesyonel hazırlanmış. Teşekkürler.' },
      { dept_id: 7, assigned_to: 24, category: 'Dijitalleşme', title: 'Kütüphane Eski Eser Katalog Kaydı', description: 'Tarihi el yazması eserlerin dijital katalog sistemine kaydedilmesi.', status: 'approved', priority: 'high', completion_note: 'Toplam 15 adet nadir eserin künye bilgileri girilmiştir.', performance_score: 4, manager_feedback: 'Girişler titizlikle yapılmış, ellerine sağlık.' },

      // Rejected tasks (Needs revision or failed)
      { dept_id: 2, assigned_to: 14, category: 'Analiz', title: 'Rakip Analiz Pazar Araştırması', description: 'Bölgemizdeki diğer işletmelerin fiyat ve kampanya analiz raporu.', status: 'rejected', priority: 'normal', completion_note: 'Sadece 2 rakip firmanın fiyat listesini ekledim.', performance_score: null, manager_feedback: 'Rapor çok yetersiz. En az 5 büyük rakibin analizi ve kampanya karşılaştırmalarını da ekleyip tekrar teslim etmelisin.' }
    ];

    const deadlineDate = new Date();
    deadlineDate.setDate(deadlineDate.getDate() + 15);
    const deadlineStr = deadlineDate.toISOString().split('T')[0];

    for (const t of SAMPLE_TASKS) {
      const manager = MANAGERS.find(m => m.dept_id === t.dept_id);
      const createdBy = manager ? manager.id : 1;
      await runQuery(
        "INSERT INTO tasks (dept_id, created_by, assigned_to, title, description, category, deadline, status, priority, completion_note, performance_score, manager_feedback) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          t.dept_id, 
          createdBy, 
          t.assigned_to, 
          t.title, 
          t.description, 
          t.category, 
          deadlineStr, 
          t.status || 'pending', 
          t.priority || 'normal', 
          t.completion_note || null, 
          t.performance_score || null, 
          t.manager_feedback || null
        ]
      );
    }

    console.log("✅ Yeni Yerel SQLite veritabanı başarıyla tohumlandı.");
    console.log("  - Toplam Departman: " + DEPTS.length);
    console.log("  - Toplam Yönetici: " + MANAGERS.length);
    console.log("  - Toplam Öğrenci: " + STUDENTS.length);
    console.log("  - Devamsızlığı Kritik Öğrenciler: Gizem Polat (Maliye) ve Oğuz Çelik (Kütüphane)");

  } catch (err) {
    console.error("❌ Hata oluştu:", err.message);
  } finally {
    db.close();
  }
}

main();
