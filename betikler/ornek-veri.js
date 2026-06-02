"use strict";
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const db = new sqlite3.Database(path.resolve(__dirname, "../veri/veritabani.sqlite"));

const TR = ["Pazar","Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi"];

function toAscii(str) {
  return str.toLowerCase().replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/i̇/g, 'i');
}

function kullaniciAdiOlustur(adi) {
  const parcalar = adi.trim().split(' ');
  const ad = parcalar[0];
  const soyad = parcalar.slice(1).join(' ');
  return toAscii(ad + '.' + soyad);
}

const DEPTS = [
  { id:1,  name:"Hukuk Fakültesi",             open_time:"08:00", close_time:"17:00" },
  { id:2,  name:"İktisadi ve İdari Bilimler",  open_time:"08:00", close_time:"23:00" },
  { id:3,  name:"Mühendislik Fakültesi",        open_time:"08:30", close_time:"18:30" },
  { id:4,  name:"Tıp Fakültesi",               open_time:"07:00", close_time:"20:00" },
  { id:5,  name:"Eğitim Fakültesi",            open_time:"08:00", close_time:"17:30" },
  { id:6,  name:"Güzel Sanatlar Fakültesi",    open_time:"09:00", close_time:"21:00" },
  { id:7,  name:"Fen Fakültesi",               open_time:"08:00", close_time:"18:00" },
  { id:8,  name:"Mimarlık Fakültesi",          open_time:"09:00", close_time:"19:00" },
  { id:9,  name:"Denizcilik Fakültesi",        open_time:"07:30", close_time:"16:30" },
  { id:10, name:"Merkez Kütüphane",            open_time:"08:00", close_time:"22:00" },
  { id:11, name:"İlahiyat Fakültesi",          open_time:"08:30", close_time:"17:30" },
  { id:12, name:"Edebiyat Fakültesi",          open_time:"08:30", close_time:"17:30" }
];

const MANAGERS = [
  { id:1,  name:"Ali Çelik",       dept_id:1  },
  { id:2,  name:"Elif Yıldız",     dept_id:2  },
  { id:3,  name:"Murat Şahin",     dept_id:3  },
  { id:4,  name:"Sema Arslan",     dept_id:4  },
  { id:5,  name:"Kemal Öztürk",    dept_id:5  },
  { id:6,  name:"Aylin Kaya",      dept_id:6  },
  { id:7,  name:"Hasan Demir",     dept_id:7  },
  { id:8,  name:"Neslihan Ak",     dept_id:8  },
  { id:9,  name:"Caner Yılmaz",    dept_id:9  },
  { id:10, name:"Gül Erdoğan",     dept_id:10 },
  { id:40, name:"Mehmet Yılmaz",   dept_id:11 },
  { id:41, name:"Fatma Kaya",      dept_id:12 }
];

const STUDENTS = [
  { id:11, name:"Zeynep Kara",      dept_id:1,  program_duration_months:6  },
  { id:12, name:"Burak Aydın",      dept_id:1,  program_duration_months:9  },
  { id:13, name:"Selin Çetin",      dept_id:2,  program_duration_months:6  },
  { id:14, name:"Emre Doğan",       dept_id:2,  program_duration_months:12 },
  { id:15, name:"Gizem Polat",      dept_id:3,  program_duration_months:9  },
  { id:16, name:"Tolga Bozkurt",    dept_id:3,  program_duration_months:6  },
  { id:17, name:"Merve Güneş",      dept_id:4,  program_duration_months:12 },
  { id:18, name:"Alp Karaman",      dept_id:4,  program_duration_months:9  },
  { id:19, name:"Cansu Türk",       dept_id:5,  program_duration_months:6  },
  { id:20, name:"Mert Kılıç",       dept_id:5,  program_duration_months:9  },
  { id:21, name:"İrem Koç",         dept_id:6,  program_duration_months:6  },
  { id:22, name:"Deniz Arslan",     dept_id:6,  program_duration_months:12 },
  { id:23, name:"Ceren Yıldırım",   dept_id:7,  program_duration_months:9  },
  { id:24, name:"Oğuz Çelik",       dept_id:7,  program_duration_months:6  },
  { id:25, name:"Ece Şimşek",       dept_id:8,  program_duration_months:9  },
  { id:26, name:"Berk Yılmaz",      dept_id:8,  program_duration_months:12 },
  { id:27, name:"Pınar Özdemir",    dept_id:9,  program_duration_months:6  },
  { id:28, name:"Arda Şahin",       dept_id:9,  program_duration_months:9  },
  { id:29, name:"Nil Akar",         dept_id:10, program_duration_months:6  },
  { id:30, name:"Kaan Öz",          dept_id:10, program_duration_months:12 },
  { id:50, name:"Ayşe Demir",       dept_id:11, program_duration_months:6  },
  { id:51, name:"Ahmet Ak",         dept_id:12, program_duration_months:9  }
];

// Sadece eski öğrencilerin onaylı planları olsun
const PLAN_DAYS = {
  11: ["Pazartesi","Çarşamba","Cuma"],
  12: ["Salı","Perşembe"],
  13: ["Pazartesi","Salı","Perşembe"],
  14: ["Çarşamba","Cuma"],
  15: ["Pazartesi","Çarşamba"],
  16: ["Salı","Perşembe","Cuma"],
  17: ["Pazartesi","Çarşamba","Cuma"],
  18: ["Salı","Perşembe"],
  19: ["Pazartesi","Salı","Çarşamba"],
  20: ["Perşembe","Cuma"],
  21: ["Pazartesi","Çarşamba","Cuma"],
  22: ["Salı","Perşembe"],
  23: ["Pazartesi","Salı"],
  24: ["Çarşamba","Perşembe","Cuma"],
  25: ["Pazartesi","Çarşamba","Cuma"],
  26: ["Salı","Perşembe"],
  27: ["Pazartesi","Çarşamba"],
  28: ["Salı","Perşembe","Cuma"],
  29: ["Pazartesi","Salı","Çarşamba"],
  30: ["Perşembe","Cuma"]
  // 50 ve 51 (Ayşe ve Ahmet) burada YOK. Boş başlayacaklar.
};

const dummyHours = JSON.stringify(["S-1","S-2","S-3","S-4","S-5","S-6","S-7","S-8","S-9","S-10"]);

db.serialize(() => {
  const tables = ["announcements","tasks","attendance","fixed_plan","users","departments"];
  for (const t of tables) db.run(`DELETE FROM ${t}`);
  for (const t of tables) db.run(`DELETE FROM sqlite_sequence WHERE name='${t}'`);

  const dStmt = db.prepare("INSERT INTO departments (id,name,open_time,close_time) VALUES (?,?,?,?)");
  for (const d of DEPTS) dStmt.run(d.id, d.name, d.open_time, d.close_time);
  dStmt.finalize();

  const mStmt = db.prepare("INSERT INTO users (id,name,email,password,role,dept_id,program_duration_months,is_terminated,created_at,status) VALUES (?,?,?,?,?,?,?,?,?,?)");
  for (const m of MANAGERS) {
    const email = kullaniciAdiOlustur(m.name) + "@deu.edu.tr";
    mStmt.run(m.id, m.name, email, "123456", "manager", m.dept_id, null, 0, "2026-02-01 08:00:00", "approved");
  }
  mStmt.finalize();

  const sStmt = db.prepare("INSERT INTO users (id,name,email,password,role,dept_id,program_duration_months,is_terminated,created_at,status) VALUES (?,?,?,?,?,?,?,?,?,?)");
  for (const s of STUDENTS) {
    const email = kullaniciAdiOlustur(s.name) + "@ogr.deu.edu.tr";
    sStmt.run(s.id, s.name, email, "123456", "student", s.dept_id, s.program_duration_months, 0, "2026-02-01 08:00:00", "assigned");
  }
  sStmt.finalize();

  db.run("INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, ?)",
    ['Sistem Yöneticisi', 'superadmin@deu.edu.tr', 'superadmin123', 'super_admin', 'approved']);

  db.run("INSERT OR IGNORE INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, ?)",
    ['Sistem Yöneticisi (Ogr)', 'superadmin@ogr.deu.edu.tr', 'superadmin123', 'super_admin', 'approved']);

  const pStmt = db.prepare("INSERT INTO fixed_plan (user_id,dept_id,day,hours,status) VALUES (?,?,?,?,'approved')");
  for (const s of STUDENTS) {
    const days = PLAN_DAYS[s.id] || [];
    for (const day of days) pStmt.run(s.id, s.dept_id, day, dummyHours);
  }
  pStmt.finalize();

  const deadlineDate = new Date();
  deadlineDate.setDate(deadlineDate.getDate() + 15);
  const deadlineStr = deadlineDate.toISOString().split('T')[0];

  const SAMPLE_TASKS = [
    { dept_id: 1,  assigned_to: 11,   category: 'Veri Girişi',              title: 'Dava Dosyaları Sayısallaştırma', description: 'Arşivdeki eski dava özetlerinin sisteme veri girişi yapılması.' },
    { dept_id: 1,  assigned_to: null, category: 'Evrak ve Arşivleme',       title: 'Kütüphane Mevzuat Tasnifi',      description: 'Fakülte kütüphanesindeki yeni mevzuat ve yönetmeliklerin arşiv düzenlemesi.' },
    { dept_id: 2,  assigned_to: 13,   category: 'Veri Girişi',              title: 'İstatistik Veri Girişi',         description: 'Fakülte öğrenci başarı istatistiklerinin Excel tablosuna girilmesi.' },
    { dept_id: 3,  assigned_to: 15,   category: 'Düzenleme ve Kontrol',     title: 'Laboratuvar Envanter Kontrolü',  description: 'Bilgisayar mühendisliği donanım laboratuvarı cihaz listesinin güncellenmesi.' },
    { dept_id: 4,  assigned_to: 17,   category: 'Düzenleme ve Kontrol',     title: 'Poliklinik Hasta Yönlendirme Kılavuzu',   description: 'Yeni poliklinik yerleşim planına göre yönlendirme kılavuzunun hazırlanması.' },
    { dept_id: 5,  assigned_to: 19,   category: 'Evrak ve Arşivleme',       title: 'Pedagojik Materyal Tasnifi',     description: 'Görsel eğitim materyallerinin depoda kategorilere göre arşivlenmesi.' },
    { dept_id: 6,  assigned_to: 21,   category: 'İletişim ve Koordinasyon', title: 'Sergi Salonu Koordinasyonu',     description: 'Yıl sonu mezuniyet sergisi için davet listesinin kontrol edilmesi.' },
    { dept_id: 7,  assigned_to: 23,   category: 'Teknik Destek',            title: 'Kimya Lab Güvenlik Listesi',     description: 'Laboratuvarlardaki kimyasal maddelerin güvenlik uyarı etiketlerinin yenilenmesi.' },
    { dept_id: 8,  assigned_to: 25,   category: 'Düzenleme ve Kontrol',     title: 'Maket Atölyesi Düzeni',          description: 'Atölyedeki maket malzemelerinin tasnifi ve raf düzeninin yapılması.' },
    { dept_id: 9,  assigned_to: 27,   category: 'Raporlama',                title: 'Simülatör Odası Log Kontrolü',   description: 'Denizcilik simülatörü kullanım saatlerinin log defterinden Excel\'e aktarılması.' },
    { dept_id: 10, assigned_to: 29,   category: 'Araştırma',                title: 'Süreli Yayınlar Kontrolü',       description: '2025 yılına ait dergi ve süreli yayınların eksik sayılarının listelenmesi.' },
    { dept_id: 10, assigned_to: null, category: 'Evrak ve Arşivleme',       title: 'Yeni Gelen Kitap Barkodlama',    description: 'Kütüphaneye yeni teslim edilen kitapların barkodlanıp raflara dizilmesi.' },
    { dept_id: 11, assigned_to: 50,   category: 'Araştırma',                title: 'Osmanlıca Elyazmaları İndeksleme', description: 'Bölüm arşivindeki elyazmalarının dijital fihrist veri girişinin yapılması.' },
    { dept_id: 12, assigned_to: 51,   category: 'İletişim ve Koordinasyon', title: 'Roman ve Şiir Kulübü Afiş Tasarımı', description: 'Edebiyat kulübünün düzenleyeceği etkinlikler için duyuru afişlerinin hazırlanması.' }
  ];

  const tStmt = db.prepare("INSERT INTO tasks (dept_id, created_by, assigned_to, title, description, category, deadline, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')");
  for (const t of SAMPLE_TASKS) {
    const manager = MANAGERS.find(m => m.dept_id === t.dept_id);
    const createdBy = manager ? manager.id : 1;
    tStmt.run(t.dept_id, createdBy, t.assigned_to, t.title, t.description, t.category, deadlineStr);
  }
  tStmt.finalize();

  console.log("✅ Örnek Veriler Yenilendi.");
  console.log("-----------------------------------");
  console.log("GİRİŞ BİLGİLERİ (Şifreler yanlarında belirtilmiştir)");
  console.log("-----------------------------------");
  console.log("Sistem Yöneticisi: superadmin@deu.edu.tr (Şifre: superadmin123)");
  console.log("Sistem Yöneticisi (Ogr): superadmin@ogr.deu.edu.tr (Şifre: superadmin123)");
  console.log("Yönetici: mehmet.yilmaz@deu.edu.tr (Şifre: 123456)");
  console.log("Öğrenci: ayse.demir@ogr.deu.edu.tr (Şifre: 123456)");
  console.log("Öğrenci: zeynep.kara@ogr.deu.edu.tr (Şifre: 123456)");
  console.log("-----------------------------------");
  db.close();
});
