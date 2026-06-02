# Kurulum Kılavuzu

Bu doküman İŞKUR-TAKİP projesini yerel geliştirme ortamında çalıştırmak için güncel adımları içerir.

## Gereksinimler

- Node.js 18 veya üzeri
- npm 9 veya üzeri
- Windows, macOS veya Linux
- SQLite ayrıca kurulmak zorunda değildir; `sqlite3` paketi üzerinden kullanılır.

## Kurulum

```bash
npm install
```

## Örnek Veriyi Hazırlama

```bash
npm run betik:tohum
```

Bu komut `betikler/ornek-veri.js` dosyasını çalıştırır ve `veri/veritabani.sqlite` dosyasını örnek kullanıcılar, birimler ve test verileriyle hazırlar.

## Geliştirme Ortamını Başlatma

```bash
npm run dev
```

Bu komut `betikler/dev-baslat.js` üzerinden aynı anda Express backend ve Vite frontend geliştirme sunucusunu başlatır.

- Frontend: `http://127.0.0.1:5173`
- Backend API: `http://127.0.0.1:3000/api`

## Ayrı Ayrı Çalıştırma

```bash
npm run server
npm run client
```

## Production Build

```bash
npm run build
npm run preview
```

## Önemli Dosyalar

- Frontend giriş noktası: `src/istemci/ana.jsx`
- Ana uygulama: `src/istemci/Uygulama.jsx`
- API istemcisi: `src/istemci/api.js`
- Backend giriş noktası: `src/sunucu/sunucu.js`
- Veritabanı katmanı: `src/sunucu/veritabani.js`
- SQLite dosyası: `veri/veritabani.sqlite`

## Sorun Giderme

- **Port çakışması:** Backend `3000`, frontend `5173` portunu kullanır.
- **Veritabanı hatası:** `npm run betik:tohum` ile örnek veriyi yeniden oluşturun.
- **API bağlantı hatası:** `src/istemci/api.js` içindeki base URL `http://127.0.0.1:3000/api` olmalıdır.
- **Türkçe karakter:** `index.html` dili `tr` olarak ayarlıdır.
