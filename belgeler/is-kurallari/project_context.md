# Proje Bağlamı ve İş Kuralları

İŞKUR-TAKİP, üniversite birimlerindeki İŞKUR öğrencilerinin çalışma planı, mesai takibi, puantajı, görevleri ve duyurularını dijital ortamda yönetmek için geliştirilmiştir.

## Temel Amaç

- Kağıt/imza süreçlerini azaltmak
- Mesai giriş/çıkışlarını OTP ile doğrulamak
- Devamsızlık ve katılımı planla karşılaştırmak
- Yöneticiye birim bazlı kontrol sağlamak
- Öğrenciye kendi plan, görev, duyuru ve puantajını şeffaf göstermek

## Kırmızı Çizgiler

### 1. Birim İzolasyonu

Her kullanıcı bir `dept_id` değerine bağlıdır. Yönetici sadece kendi birimindeki öğrencileri, planları, görevleri, duyuruları ve puantaj kayıtlarını yönetebilir.

### 2. Plan + Attendance Kıyaslı Puantaj

Puantaj sadece gelen gün sayısını göstermez. Onaylı plan ile OTP sonucunda oluşan `attendance` kayıtları karşılaştırılır.

### 3. Çift Yönlü OTP

- Giriş: Öğrenci kod üretir, yönetici doğrular.
- Çıkış: Yönetici kod üretir, öğrenci doğrular.

### 4. Devamsızlık Sınırı

- 6 ay ve altı programlarda sınır: 7 gün
- 6 aydan uzun programlarda sınır: 10 gün

## Güncel Modül Durumu

| Modül | Durum |
|---|---|
| Kimlik doğrulama ve rol yapısı | Tamamlandı |
| Öğrenci planlama | Tamamlandı |
| Yönetici plan onayı ve arşiv | Tamamlandı |
| Çift yönlü OTP | Tamamlandı |
| Öğrenci puantajı ve hakediş | Tamamlandı |
| Yönetici Excel benzeri puantaj | Tamamlandı |
| Görev yönetimi | Tamamlandı |
| Duyurular | Tamamlandı |
| Öğrenci yönetimi ve fesih | Tamamlandı |
| Bildirimler | Tamamlandı |
| DEÜ lacivert/beyaz tema | Tamamlandı |
