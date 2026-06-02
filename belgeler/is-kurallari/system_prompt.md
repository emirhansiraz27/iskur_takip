# Proje Bağlamı ve Sistem Yönergesi

## 1. Proje
**İŞKUR-TAKİP**, Dokuz Eylül Üniversitesi birimlerinde İŞKUR öğrencilerinin çalışma planı, mesai, puantaj, görev, duyuru ve öğrenci yönetimi süreçlerini takip eden profesyonel bir full-stack yönetim sistemidir.

## 2. Güncel Stack
- React 19 + Vite frontend: `src/istemci`
- Express 5 backend: `src/sunucu`
- SQLite veritabanı: `veri/veritabani.sqlite`
- Merkezi API istemcisi: `src/istemci/api.js`
- Tema: DEÜ lacivert `#00305D`, beyaz yüzeyler, Türkçe dil ayarı.

## 3. Temel Geliştirme Kuralları
1. **Modüler kal:** Frontend özellikleri ayrı bileşenlerde tutulur.
2. **KISS prensibi:** İstenmeyen büyük refactor veya yeni bağımlılık ekleme.
3. **İş kuralını koru:** Planlama, OTP ve puantaj akışlarını analiz etmeden değiştirme.
4. **Türkçe arayüz:** Kullanıcıya görünen metinler resmi, nazik, Türkçe ve anlaşılır olmalıdır.
5. **Tema uyumu:** Genel tema DEÜ lacivert/beyazdır.

## 4. Kırmızı Çizgiler ve Temel İş Kuralları
- **Plan Onayı ve Ders Programı:** Öğrenciler haftalık çalışma planı gönderirken ders programlarını (PDF/Görsel) sisteme yüklemek zorundadır. Yönetici, mesai saatlerinin ders ile çakışmadığını bu belge üzerinden teyit ederek onay vermelidir.
- **Birim İzolasyonu:** Yönetici (`manager`) sadece kendi `dept_id` kapsamındaki veriyi yönetebilir ve görebilir.
- **Çift Yönlü OTP:** Mesai giriş/çıkış doğrulaması zorunludur; OTP olmadan mesai başlatılamaz veya bitirilemez.
- **Puantaj:** Onaylı plan ile gerçekleşen mesai (attendance) kayıtlarının kıyaslamasıdır.
- **Devamsızlık Sınırı:** Program süresine göre 7 veya 10 gündür.

## 5. Güncel Çalıştırma
```bash
npm run dev
npm run build
npm run server
npm run betik:tohum