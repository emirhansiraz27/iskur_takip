# API Dokümantasyonu

Base URL: `http://127.0.0.1:3000/api`

Tüm korumalı endpoint'ler JWT token bekler. Frontend token'ı `src/istemci/api.js` üzerinden otomatik gönderir.

## Auth

- **POST `/login`**: Kullanıcı girişi yapar ve `token` + `user` döndürür.

## Kullanıcı ve Birim

- **GET `/user/department`**: Kullanıcının birim adını ve çalışma saatlerini getirir.
- **GET `/user/stats`**: Öğrenci sağ paneli ve günlük mesai durumu için istatistik getirir.
- **GET `/dept/manager`**: Birimin yöneticisini getirir.
- **GET `/user/students`**: Aynı birimdeki öğrencileri listeler.
- **GET `/dept/students/overview`**: Yönetici için öğrenci, katılım ve devamsızlık özetleri.

## Çalışma Planı

- **GET `/plan/student`**: Öğrencinin plan kayıtları.
- **POST `/plan/student`**: Öğrencinin haftalık plan gönderimi.
- **GET `/plan/manager`**: Yönetici için birimdeki planlar.
- **POST `/plan/manager/approve`**: Planı `approved` veya `rejected` yapar.

## OTP ve Mesai

- **POST `/otp/student/generate-checkin`**: Öğrenci giriş kodu üretir.
- **POST `/otp/manager/verify-checkin`**: Yönetici giriş kodunu doğrular.
- **POST `/otp/manager/generate-checkout`**: Yönetici çıkış kodu üretir.
- **POST `/otp/student/verify-checkout`**: Öğrenci çıkış kodunu doğrular.

## Puantaj

- **GET `/timesheet/manager?year=YYYY&month=M`**: Yönetici aylık Excel benzeri puantaj tablosu.
- **GET `/timesheet/student?year=YYYY&month=M`**: Öğrencinin aylık katılım, devamsızlık ve tahmini hakediş özeti.
- **POST `/puantaj/manager/terminate/:id`**: Yönetici öğrenciyi pasif/feshedilmiş duruma alır.

## Görevler

- **GET `/tasks`**: Role göre görevleri getirir.
- **POST `/tasks`**: Yönetici görev oluşturur.
- **PUT `/tasks/submit/:id`**: Öğrenci görevi teslim eder.
- **PUT `/tasks/evaluate/:id`**: Yönetici görevi onaylar veya reddeder.
- **DELETE `/tasks/:id`**: Yönetici görevi siler.

## Duyurular

- **GET `/announcements`**: Birim duyurularını getirir.
- **POST `/announcements`**: Yönetici duyuru oluşturur.
- **DELETE `/announcements/:id`**: Yönetici duyuru siler.

## Bildirimler

- **GET `/notifications/manager`**: Yönetici için bekleyen plan/görev bildirimleri.
- **GET `/notifications/student`**: Öğrenci için plan durum bildirimleri.
- **GET `/notifications`**: Kullanıcının okunmamış sistem bildirimleri.
- **POST `/notifications/read/:id`**: Bildirimi okundu yapar.
- **POST `/notifications/read-all`**: Tüm bildirimleri okundu yapar.
