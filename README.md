# İŞKUR-TAKİP: Operasyonel Yönetim ve Puantaj Sistemi

İŞKUR-TAKİP, Dokuz Eylül Üniversitesi birimlerinde İŞKUR programı kapsamında görev yapan öğrencilerin çalışma planı, mesai/OTP, puantaj, görev, duyuru ve öğrenci yönetimi süreçlerini dijitalleştiren React + Express + SQLite tabanlı bir web uygulamasıdır.

## Teknoloji Yığını

- **Frontend:** React 19, Vite, Tailwind CSS 4, Axios
- **Backend:** Node.js, Express 5, JWT, CORS, dotenv
- **Veritabanı:** SQLite (`veri/veritabani.sqlite`)
- **Tema:** DEÜ lacivert `#00305D`, beyaz yüzeyler ve Türkçe karakter uyumlu arayüz

## Güncel Özellikler

- **Rol tabanlı giriş:** `student` ve `manager`
- **Birim izolasyonu:** Kullanıcılar `dept_id` üzerinden kendi birim verileriyle çalışır.
- **Çalışma planı:** Öğrenci haftalık plan gönderir, yönetici onaylar veya reddeder.
- **Mesai/OTP:** Girişte öğrenci kod üretir, yönetici doğrular; çıkışta yönetici kod üretir, öğrenci doğrular.
- **Aylık puantaj:** Planlanan gün, gerçekleşen mesai ve devamsızlık kıyaslanır.
- **Öğrenci yönetimi:** Yönetici aktif/pasif öğrenci listesi ve devamsızlık sınırını izler.
- **Görev yönetimi:** Yönetici görev atar, öğrenci teslim eder, yönetici değerlendirir.
- **Duyurular:** Yönetici duyuru oluşturur; öğrenciler kendi birim duyurularını görür.
- **Bildirimler:** Plan onayı, görev teslimi ve ilgili aksiyonlar için bildirim akışı.

## Hızlı Başlangıç

```bash
npm install
npm run betik:tohum
npm run dev
```

`npm run dev`, `betikler/dev-baslat.js` üzerinden backend ve Vite frontend geliştirme sunucusunu birlikte başlatır.

- **Frontend:** `http://127.0.0.1:5173`
- **Backend API:** `http://127.0.0.1:3000/api`

## Kullanışlı Komutlar

```bash
npm run dev          # frontend + backend birlikte
npm run client       # sadece Vite frontend
npm run server       # sadece Express backend
npm run build        # production frontend build
npm run preview      # Vite preview
npm run betik:tohum  # örnek veri/veritabanı hazırlığı
```

## Proje Yapısı

```text
iskr_ogr/
- index.html
- package.json
- src/
  - istemci/
    - ana.jsx
    - Uygulama.jsx
    - api.js
    - index.css
    - bilesenler/
  - sunucu/
    - sunucu.js
    - veritabani.js
- betikler/
  - dev-baslat.js
  - ornek-veri.js
- veri/
  - veritabani.sqlite
- belgeler/
```

## Dokümantasyon

- **Dizin:** `belgeler/INDEX.md`
- **Mimari:** `belgeler/mimari/architecture.md`
- **API:** `belgeler/mimari/api.md`
- **Kurulum:** `belgeler/gelistirme/setup.md`
- **İş kuralları:** `belgeler/is-kurallari/project_context.md`

---

Bu proje Dokuz Eylül Üniversitesi kurumsal kimliği ve İŞKUR operasyonel takip ihtiyaçları dikkate alınarak geliştirilmiştir.
