const sqlite3 = require("sqlite3").verbose();
const path = require("path");
require('dotenv').config();

const dbYolu = path.resolve("C:/Users/bilgi/OneDrive/Desktop/iskr_ogr/veri/veritabani.sqlite");
const db = new sqlite3.Database(dbYolu);

console.log("🛠️ Veritabanı Onarımı (v5 - exec) başlatılıyor...");

const repairSql = `
PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
DROP TABLE IF EXISTS users_old;
ALTER TABLE users RENAME TO users_old;
CREATE TABLE users (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    name                    TEXT,
    username                TEXT UNIQUE NOT NULL,
    password                TEXT NOT NULL,
    role                    TEXT NOT NULL CHECK(role IN ('manager', 'student', 'super_admin')),
    dept_id                 INTEGER,
    program_duration_months INTEGER,
    is_terminated           BOOLEAN DEFAULT 0,
    email                   TEXT DEFAULT NULL,
    phone                   TEXT,
    last_login_at           TEXT DEFAULT NULL,
    failed_login_attempts   INTEGER DEFAULT 0,
    locked_until            TEXT DEFAULT NULL,
    created_at              TEXT DEFAULT NULL,
    updated_at              TEXT DEFAULT NULL,
    FOREIGN KEY (dept_id) REFERENCES departments(id)
);
INSERT INTO users (id, name, username, password, role, dept_id, program_duration_months, is_terminated, email, phone, last_login_at, failed_login_attempts, locked_until, created_at, updated_at) 
SELECT id, name, username, password, role, dept_id, program_duration_months, is_terminated, email, phone, last_login_at, failed_login_attempts, locked_until, created_at, updated_at FROM users_old;
DROP TABLE users_old;
COMMIT;
PRAGMA foreign_keys=ON;
`;

db.exec(repairSql, (err) => {
    if (err) {
        console.error("❌ Onarım Hatası:", err.message);
        // Eğer zaten güncelse veya başka bir hata varsa
        if (err.message.includes("no such table: users_old")) {
            console.log("ℹ️ Tablo zaten güncel olabilir veya aktarımda sorun oluştu.");
        }
    } else {
        console.log("✅ Tablo yapısı güncellendi.");
    }

    // Super admini ekle
    const superAdmin = {
        name: 'Sistem Yöneticisi',
        username: 'superadmin',
        password: 'superadmin123',
        role: 'super_admin'
    };

    db.run("INSERT OR IGNORE INTO users (name, username, password, role) VALUES (?, ?, ?, ?)",
        [superAdmin.name, superAdmin.username, superAdmin.password, superAdmin.role], (err) => {
            if (err) console.error("❌ Admin Ekleme Hatası:", err.message);
            else {
                console.log("✅ Super admin kontrol edildi/oluşturuldu!");
                console.log("-----------------------------------");
                console.log("Kullanıcı Adı: superadmin");
                console.log("Şifre:         superadmin123");
                console.log("-----------------------------------");
            }
            db.close();
        });
});
