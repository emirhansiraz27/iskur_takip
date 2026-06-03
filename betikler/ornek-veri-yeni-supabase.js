"use strict";

require('dotenv').config();
const { Pool } = require('pg');

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

async function tohumla() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌ DATABASE_URL is missing in .env!");
    process.exit(1);
  }

  console.log("🔌 Connecting to Supabase (PostgreSQL)...");
  const pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  const client = await pool.connect();

  try {
    console.log("⏳ Supabase verileri temizleniyor...");
    await client.query("BEGIN");
    
    // Clear and restart sequences
    await client.query("TRUNCATE TABLE announcements, tasks, attendance, fixed_plan, users, departments, notifications, audit_logs RESTART IDENTITY CASCADE");
    console.log("🧹 Tablolar temizlendi.");

    // 1. Departman Ekleme (Batch)
    const deptValues = [];
    const deptParams = [];
    let pIdx = 1;
    for (const d of DEPTS) {
      deptValues.push(`($${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, 10)`);
      deptParams.push(d.id, d.name, d.open_time, d.close_time);
    }
    await client.query(`INSERT INTO departments (id, name, open_time, close_time, student_capacity) VALUES ${deptValues.join(', ')}`, deptParams);
    console.log("🏢 Departmanlar eklendi.");

    // 2. Yönetici Ekleme (Batch)
    const mgrValues = [];
    const mgrParams = [];
    pIdx = 1;
    for (const m of MANAGERS) {
      const email = kullaniciAdiOlustur(m.name) + "@deu.edu.tr";
      mgrValues.push(`($${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, 'manager', $${pIdx++}, 'approved', '2026-02-01 08:00:00')`);
      mgrParams.push(m.id, m.name, email, "123456", m.dept_id);
    }
    await client.query(`INSERT INTO users (id, name, email, password, role, dept_id, status, created_at) VALUES ${mgrValues.join(', ')}`, mgrParams);
    console.log("💼 Yöneticiler eklendi.");

    // 3. Öğrenci Ekleme (Batch)
    const stdValues = [];
    const stdParams = [];
    pIdx = 1;
    for (const s of STUDENTS) {
      const email = kullaniciAdiOlustur(s.name) + "@ogr.deu.edu.tr";
      const matrix = JSON.stringify(createCourseMatrix(s.type, s.emptyDays));
      stdValues.push(`($${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, 'student', $${pIdx++}, $${pIdx++}, 0, '2026-02-01 08:00:00', 'assigned', $${pIdx++})`);
      stdParams.push(s.id, s.name, email, "123456", s.dept_id, s.duration, matrix);
    }
    await client.query(`INSERT INTO users (id, name, email, password, role, dept_id, program_duration_months, is_terminated, created_at, status, course_schedule_matrix) VALUES ${stdValues.join(', ')}`, stdParams);
    console.log("👨‍🎓 Öğrenciler eklendi.");

    // 4. Sistem Yöneticileri
    await client.query(
      "INSERT INTO users (id, name, email, password, role, status) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (email) DO NOTHING",
      [52, 'Sistem Yöneticisi', 'superadmin@deu.edu.tr', 'superadmin123', 'super_admin', 'approved']
    );
    await client.query(
      "INSERT INTO users (id, name, email, password, role, status) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (email) DO NOTHING",
      [53, 'Sistem Yöneticisi (Ogr)', 'superadmin@ogr.deu.edu.tr', 'superadmin123', 'super_admin', 'approved']
    );
    console.log("🛡️ Sistem yöneticileri eklendi.");

    // 5. Çalışma Planları (Batch)
    const fpValues = [];
    const fpParams = [];
    pIdx = 1;
    for (const s of STUDENTS) {
      const hoursJSON = JSON.stringify(s.workSlots);
      for (const day of s.planDays) {
        fpValues.push(`($${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, 'approved')`);
        fpParams.push(s.id, s.dept_id, day, hoursJSON);
      }
    }
    await client.query(`INSERT INTO fixed_plan (user_id, dept_id, day, hours, status) VALUES ${fpValues.join(', ')}`, fpParams);
    console.log("📅 Çalışma planları eklendi.");

    // 6. Yoklama Ekleme (Batch - 1 Şubat 2026'dan 2 Haziran 2026'ya kadar)
    const start = new Date('2026-02-01');
    const end = new Date('2026-06-02');
    let absentCounts = { 15: 0, 24: 0 };
    
    const attValues = [];
    const attParams = [];
    pIdx = 1;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayIndex = d.getDay();
      const dayName = TR[dayIndex];
      
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
          
          attValues.push(`($${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, 'normal', $${pIdx++})`);
          attParams.push(s.id, dateStr, checkInTime, checkOutTime, status, note);
        }
      }
    }

    if (attValues.length > 0) {
      await client.query(`INSERT INTO attendance (user_id, date, check_in, check_out, status, type, note) VALUES ${attValues.join(', ')}`, attParams);
    }
    console.log("📊 Yoklamalar eklendi.");

    // 7. Örnek Görevler (Tasks) Ekleme (Batch)
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

    const taskValues = [];
    const taskParams = [];
    pIdx = 1;
    for (const t of SAMPLE_TASKS) {
      const manager = MANAGERS.find(m => m.dept_id === t.dept_id);
      const createdBy = manager ? manager.id : 1;
      taskValues.push(`($${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++})`);
      taskParams.push(
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
      );
    }
    await client.query(`INSERT INTO tasks (dept_id, created_by, assigned_to, title, description, category, deadline, status, priority, completion_note, performance_score, manager_feedback) VALUES ${taskValues.join(', ')}`, taskParams);
    console.log("📝 Görevler eklendi.");

    // Sequence güncelleme
    await client.query("SELECT setval('users_id_seq', (SELECT MAX(id) FROM users))");
    await client.query("SELECT setval('departments_id_seq', (SELECT MAX(id) FROM departments))");
    await client.query("SELECT setval('fixed_plan_id_seq', COALESCE((SELECT MAX(id) FROM fixed_plan), 1))");
    await client.query("SELECT setval('attendance_id_seq', COALESCE((SELECT MAX(id) FROM attendance), 1))");
    await client.query("SELECT setval('tasks_id_seq', COALESCE((SELECT MAX(id) FROM tasks), 1))");
    console.log("🔄 Veritabanı ID dizileri güncellendi.");

    await client.query("COMMIT");
    console.log("✅ Supabase PostgreSQL veritabanı başarıyla tohumlandı.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Supabase tohumlama hatası:", err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

tohumla();
