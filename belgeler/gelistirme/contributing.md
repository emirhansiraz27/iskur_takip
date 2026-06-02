# Katkıda Bulunma Kılavuzu

İŞKUR-TAKİP projesine katkı verirken mevcut modüler yapıyı ve iş kurallarını koruyun.

## Geliştirme Ortamı

```bash
npm install
npm run betik:tohum
npm run dev
```

## Kodlama Standartları

- Frontend bileşenleri `src/istemci/bilesenler` altında özellik bazlı tutulur.
- Backend route'ları `src/sunucu/sunucu.js` içindedir.
- Veritabanı şeması ve migrasyonlar `src/sunucu/veritabani.js` içinde yönetilir.
- API çağrıları `src/istemci/api.js` üzerinden yapılmalıdır.
- Kullanıcıya gösterilen metinler Türkçe olmalıdır.
- DEÜ lacivert/beyaz tema genel standarttır.

## Güvenlik Standartları

- SQL parametrelerinde her zaman placeholder (`?`) kullanın.
- Yönetici endpoint'lerinde `authorizeRole('manager')` kontrolünü değerlendirin.
- Birim bazlı verilerde `dept_id` filtresini koruyun.
- JWT doğrulamasını bypass etmeyin.
