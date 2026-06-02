const db = require('../src/sunucu/veritabani');

const superAdmin = {
    name: 'Sistem Yöneticisi',
    username: 'superadmin',
    password: 'superadmin123',
    role: 'super_admin'
};

db.serialize(() => {
    // Önce kontrol et
    db.get("SELECT id FROM users WHERE username = ?", [superAdmin.username], (err, row) => {
        if (err) {
            console.error("❌ Hata:", err.message);
            process.exit(1);
        }

        if (row) {
            console.log("ℹ️ Super admin zaten mevcut (ID: " + row.id + ")");
            process.exit(0);
        }

        // Ekle
        const stmt = db.prepare("INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, ?)");
        stmt.run([superAdmin.name, superAdmin.username, superAdmin.password, superAdmin.role], function(err) {
            if (err) {
                console.error("❌ Super admin oluşturulamadı!");
                if (err.message.includes("CHECK constraint failed")) {
                    console.error("👉 HATA: Veritabanındaki 'users' tablosu eski kısıtlamalara sahip (CHECK constraint).");
                    console.error("👉 LÜTFEN: 'veri/veritabani.sqlite' dosyasını silip sistemi yeniden başlatın veya tabloyu güncelleyin.");
                } else {
                    console.error("Hata detayı:", err.message);
                }
                process.exit(1);
            }
            console.log("✅ Super admin başarıyla oluşturuldu!");
            console.log("-----------------------------------");
            console.log("Kullanıcı Adı: " + superAdmin.username);
            console.log("Şifre:         " + superAdmin.password);
            console.log("-----------------------------------");
            process.exit(0);
        });
        stmt.finalize();
    });
});
