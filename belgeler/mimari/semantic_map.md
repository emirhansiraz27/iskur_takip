# Semantic Map

Bu doküman, sistemin hangi parçalarının hangi sorumluluğu taşıdığını hızlıca anlamak için hazırlanmıştır.

## Kök Akış

1. `index.html` yüklenir.
2. `src/istemci/ana.jsx` React uygulamasını başlatır.
3. `src/istemci/Uygulama.jsx` localStorage/JWT ile oturumu kontrol eder.
4. Kullanıcı yoksa `Giris.jsx`, kullanıcı varsa rolüne göre sekmeler render edilir.
5. Tüm API istekleri `src/istemci/api.js` üzerinden `src/sunucu/sunucu.js` içindeki `/api` uçlarına gider.

## Ana Modüller

- **Auth:** `Giris.jsx`, `/api/login`, JWT payload kontrolü
- **Layout:** `Uygulama.jsx`, `SagPanel.jsx`, `GenelBildirimler.jsx`
- **Planlama:** `OgrenciPlanlayici.jsx`, `YoneticiPaneli.jsx`, `/api/plan/*`
- **OTP:** `OgrenciOtp.jsx`, `YoneticiOtp.jsx`, `/api/otp/*`
- **Puantaj:** `OgrenciPuantaj.jsx`, `YoneticiPuantaj.jsx`, `/api/timesheet/*`
- **Görevler:** `OgrenciGorevleri.jsx`, `YoneticiGorevleri.jsx`, `/api/tasks/*`
- **Duyurular:** `OgrenciDuyurulari.jsx`, `YoneticiDuyurulari.jsx`, `/api/announcements/*`
- **Öğrenciler:** `YoneticiOgrenciler.jsx`, `/api/dept/students/overview`

## Kritik Veri Tabloları

- `users`
- `departments`
- `fixed_plan`
- `attendance`
- `tasks`
- `announcements`
- `notifications`

## AI Agent İçin Dikkat Noktaları

- Eski dokümanlardaki `server.js`, `database.js`, `src/App.jsx`, `src/components` yolları artık geçerli değildir.
- Güncel yollar `src/sunucu/*` ve `src/istemci/*` altındadır.
- DEÜ lacivert tema korunmalıdır; özel istisnalar bileşen bazında açıkça yapılmalıdır.
- SQL tarafında yönetici işlemlerinde `dept_id` izolasyonu korunmalıdır.
