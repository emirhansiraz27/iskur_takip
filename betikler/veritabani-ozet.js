const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, '../veri/veritabani.sqlite');
const db = new sqlite3.Database(dbPath);

console.log("=== YEREL SQLITE VERİTABANI ÖZETİ ===");

db.serialize(() => {
  // 1. Departmanlar
  db.all("SELECT id, name FROM departments", (err, rows) => {
    if (err) return console.error(err);
    console.log(`\n🏢 Departmanlar (Toplam: ${rows.length}):`);
    rows.forEach(r => console.log(`  - [ID: ${r.id}] ${r.name}`));
  });

  // 2. Kullanıcılar
  db.all("SELECT id, name, email, role, status FROM users ORDER BY role, id", (err, rows) => {
    if (err) return console.error(err);
    console.log(`\n👤 Kullanıcılar (Toplam: ${rows.length}):`);
    const admins = rows.filter(r => r.role === 'super_admin');
    const managers = rows.filter(r => r.role === 'manager');
    const students = rows.filter(r => r.role === 'student');

    console.log(`  🛡️ Süper Adminler (${admins.length}):`);
    admins.forEach(r => console.log(`    - ${r.name} (${r.email})`));

    console.log(`  💼 Yöneticiler (${managers.length}):`);
    managers.forEach(r => console.log(`    - [ID: ${r.id}] ${r.name} (${r.email})`));

    console.log(`  👨‍🎓 Öğrenciler (${students.length}):`);
    students.forEach(r => console.log(`    - [ID: ${r.id}] ${r.name} (${r.email}) - Durum: ${r.status}`));
  });

  // 3. Çalışma Planları (Fixed Plan)
  db.all(`
    SELECT fp.user_id, u.name as user_name, COUNT(fp.id) as plan_count 
    FROM fixed_plan fp 
    LEFT JOIN users u ON fp.user_id = u.id 
    GROUP BY fp.user_id
  `, (err, rows) => {
    if (err) return console.error(err);
    console.log(`\n📅 Çalışma Planı Olan Kullanıcılar (Toplam: ${rows.length}):`);
    rows.forEach(r => console.log(`  - ${r.user_name || 'Bilinmeyen'} (ID: ${r.user_id}): ${r.plan_count} gün planlanmış`));
  });

  // 4. Görevler
  db.all(`
    SELECT t.title, t.category, u.name as assigned_name 
    FROM tasks t 
    LEFT JOIN users u ON t.assigned_to = u.id
  `, (err, rows) => {
    if (err) return console.error(err);
    console.log(`\n📝 Görevler (Toplam: ${rows.length}):`);
    rows.forEach(r => console.log(`  - [${r.category}] ${r.title} -> Atanan: ${r.assigned_name || 'Atanmamış'}`));
    db.close();
  });
});
