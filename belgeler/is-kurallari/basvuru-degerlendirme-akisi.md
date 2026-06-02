# Başvuru Değerlendirme Akışı

Bu doküman, öğrenci kayıt başvurularının sistem yöneticisi tarafından değerlendirilmesi sırasında kullanılacak karar akışını ve programlama kurallarını tanımlar.

## Amaç

Öğrenci başvurularında eksik/hatalı bilgi ile program şartlarını karşılamama durumlarını birbirinden ayırmak.

Bu sayede:

- Eksik veya hatalı belge gönderen öğrenciye düzeltme hakkı verilir.
- Program şartlarını karşılamayan öğrenci kesin olarak reddedilir.
- Kesin reddedilen öğrencinin tekrar başvuru yapması engellenir.
- Öğrenci ana ekranında başvuru sonucu açık şekilde gösterilir.

## Başvuru Durumları

Sistemde öğrenci başvuruları için aşağıdaki durumlar kullanılmalıdır.

| Durum | Açıklama |
| --- | --- |
| `pending` | Yeni başvuru, sistem yöneticisi incelemesi bekliyor. |
| `revision_required` | Bilgi veya belge düzeltmesi gerekiyor. Öğrenci tekrar düzenleyip gönderebilir. |
| `approved` | Belgeler onaylandı, birim ataması bekliyor. |
| `assigned` | Öğrenci birime atandı. |
| `rejected` | Normal ret durumu. Gerekirse geriye dönük uyumluluk için korunabilir. |
| `permanently_rejected` | Öğrenci program şartlarını karşılamadığı için kesin reddedildi. Tekrar başvuru yapamaz. |

## Sistem Yöneticisi İşlemleri

Başvuru kuyruğunda her öğrenci için aşağıdaki işlemler bulunmalıdır.

### Onayla

Kullanım durumu:

- Belgeler doğruysa
- Bilgiler doğruysa
- Öğrenci başvuru için uygun görünüyorsa

Sonuç:

- `status = approved`
- Öğrenci birim atama aşamasına geçer.

### Düzeltme İste

Kullanım durumu:

- Belge okunmuyor.
- Yanlış belge yüklenmiş.
- IBAN belgesi katılımcı adına değil.
- TC, telefon veya benzeri bilgiler hatalı girilmiş.
- Başvuru tamamen reddedilmeyecek, öğrenciden revizyon istenecek.

Sonuç:

- `status = revision_required`
- Sistem yöneticisi açıklama girmek zorundadır.
- Açıklama öğrenci ana ekranında gösterilir.
- Öğrenci bilgilerini/belgelerini güncelleyip tekrar gönderebilir.
- Tekrar gönderimden sonra `status = pending` olmalıdır.

### Kesin Reddet

Kullanım durumu:

- Öğrenci program şartlarını karşılamıyor.
- Güvenlik veya uygunluk açısından başvuru kabul edilmemeli.
- SGK, gelir, aktif öğrencilik veya diğer zorunlu şartlar sağlanmıyor.

Sonuç:

- `status = permanently_rejected`
- Sistem yöneticisi açıklama girmek zorundadır.
- Öğrenci ana ekranında kesin ret gerekçesini görür.
- Öğrenci aynı TC kimlik numarası veya e-posta ile tekrar başvuru yapamaz.

## Öğrenci Ana Ekranı Davranışı

### `pending`

Öğrenciye başvurusunun incelemede olduğu gösterilir.

Örnek metin:

```text
Başvurunuz sistem yöneticisi tarafından incelenmektedir.
Belgeleriniz onaylandıktan sonra birim atama süreci başlayacaktır.
```

### `revision_required`

Öğrenciye düzeltme gerektiği gösterilir.

Örnek metin:

```text
Başvurunuz İçin Düzeltme Gerekiyor

Sistem yöneticisi başvurunuzda aşağıdaki eksiklikleri tespit etti:
[review note]

Lütfen bilgilerinizi veya belgelerinizi güncelleyip tekrar gönderin.
```

Bu ekranda `Başvurumu Düzenle` butonu bulunmalıdır.

### `approved`

Öğrenciye belgelerinin onaylandığı ve atama beklediği gösterilir.

### `assigned`

Öğrenci normal öğrenci paneline erişebilir.

### `permanently_rejected`

Öğrenciye kesin ret ekranı gösterilir.

Örnek metin:

```text
Başvurunuz Kesin Olarak Reddedildi

Başvurunuz program şartlarını karşılamadığı için kesin olarak reddedilmiştir.
Bu karar sonrası tekrar başvuru yapılamaz.

Gerekçe:
[review note]
```

Bu ekranda başvuru düzenleme veya tekrar başvuru butonu bulunmamalıdır.

## Tekrar Başvuru Engeli

Kayıt sırasında backend aşağıdaki alanları kontrol etmelidir:

- `tc_kimlik`
- `email`
- Gerekirse `phone`

Eğer aynı TC kimlik numarası veya e-posta ile `permanently_rejected` durumunda bir kullanıcı varsa kayıt engellenmelidir.

Döndürülecek hata örneği:

```text
Bu başvuru kalıcı olarak reddedilmiştir. Tekrar başvuru yapılamaz.
```

## Veri Alanı Önerisi

Mevcut `rejection_reason` alanı kısa vadede kullanılabilir.

Ancak daha anlaşılır yapı için ileride aşağıdaki alan önerilir:

```text
review_note TEXT
```

Kullanım:

- `revision_required` için düzeltme açıklaması
- `permanently_rejected` için kesin ret gerekçesi

## Programlama Adımları

1. Backend kullanıcı güncelleme endpointinde `revision_required` ve `permanently_rejected` durumlarını destekle.
2. Kayıt endpointinde kalıcı ret kontrolü ekle.
3. Admin başvuru kuyruğuna `Düzeltme İste` ve `Kesin Reddet` butonları ekle.
4. Bu iki işlemde açıklama zorunlu olsun.
5. Öğrenci giriş sonrası durum ekranında `revision_required` ve `permanently_rejected` özel ekranları göster.
6. `revision_required` durumundaki öğrenciye başvuru düzenleme ve tekrar gönderme akışı ekle.
7. Tekrar gönderim sonrası durum `pending` olarak güncellensin.
