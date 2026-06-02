# Repository Haritası

Bu dosya, güncel klasör yapısını ve kritik dosyaların sorumluluklarını açıklar.

```text
iskr_ogr/
├── index.html
├── package.json
├── src/
│   ├── istemci/
│   │   ├── ana.jsx
│   │   ├── Uygulama.jsx
│   │   ├── api.js
│   │   ├── index.css
│   │   └── bilesenler/
│   └── sunucu/
│       ├── sunucu.js
│       └── veritabani.js
├── betikler/
│   ├── dev-baslat.js
│   └── ornek-veri.js
├── veri/
│   └── veritabani.sqlite
└── belgeler/
```

## Kritik Dosyalar

- **`src/istemci/Uygulama.jsx`:** Giriş sonrası rol tabanlı sekmeleri ve ana yerleşimi yönetir.
- **`src/istemci/api.js`:** Tüm frontend API çağrılarının merkezi istemcisidir.
- **`src/sunucu/sunucu.js`:** JWT doğrulama, rol yetkilendirme ve REST API uç noktalarını içerir.
- **`src/sunucu/veritabani.js`:** SQLite dosyasını, tabloları, indeksleri ve migrasyonları yönetir.
- **`src/istemci/index.css`:** DEÜ lacivert `#00305D`, Türkçe uyumlu font ve global UI kurallarını içerir.

## Modül İlişkileri

- Çalışma planı onayı `fixed_plan` kayıtlarını üretir/günceller.
- OTP doğrulaması başarılı olmadan `attendance` kaydı oluşmaz veya tamamlanmaz.
- Puantaj hesapları onaylı plan ve gerçekleşen attendance kıyasına dayanır.
- Görev, duyuru, öğrenci ve puantaj ekranları yönetici için `dept_id` izolasyonuna bağlıdır.
