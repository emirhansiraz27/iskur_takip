# AI Agent Geliştirme Kılavuzu

Bu doküman, İŞKUR-TAKİP repository üzerinde çalışacak AI agent'lar ve geliştiriciler için güncel bağlamsal rehberdir.

## Başlamadan Önce Oku

1. `README.md`
2. `belgeler/INDEX.md`
3. `belgeler/mimari/repository_map.md`
4. `belgeler/is-kurallari/project_context.md`
5. Hedef modülün frontend ve backend dosyaları

## Güncel Teknik Bilgiler

- Frontend: `src/istemci`
- Backend: `src/sunucu`
- Bileşenler: `src/istemci/bilesenler`
- API istemcisi: `src/istemci/api.js`
- Veritabanı: `veri/veritabani.sqlite`
- Örnek veri: `npm run betik:tohum`
- Geliştirme başlatma: `npm run dev`

## Öncelik Matrisi

1. **İş kuralı:** 3 gün/8 saat planlama, OTP akışı, puantaj kıyası bozulmamalı.
2. **Güvenlik:** Yönetici işlemlerinde `dept_id` ve rol kontrolü korunmalı.
3. **Kullanıcı deneyimi:** Türkçe, anlaşılır ve DEÜ temasına uygun arayüz korunmalı.
4. **Minimal değişiklik:** Sadece istenen alanı değiştir; gereksiz refactor yapma.
