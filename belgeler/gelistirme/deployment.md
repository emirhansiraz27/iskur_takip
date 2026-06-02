# Dağıtım Kılavuzu

İŞKUR-TAKİP, Vite frontend build çıktısı ve Express backend sunucusuyla self-hosted çalıştırılabilir.

## Build

```bash
npm install
npm run build
```

Build çıktısı `dist/` klasörüne yazılır.

## Backend Çalıştırma

```bash
npm run server
```

Bu komut `node src/sunucu/sunucu.js` çalıştırır.

## Önerilen PM2 Kullanımı

```bash
pm2 start src/sunucu/sunucu.js --name is-takip-api
pm2 save
```

## Nginx Örneği

```nginx
server {
    listen 80;
    server_name is-takip.example.edu.tr;

    location / {
        root /var/www/iskr_ogr/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## Veritabanı

SQLite dosyası `veri/veritabani.sqlite` yolundadır. Production ortamında bu klasör kalıcı disk/volume üzerinde tutulmalıdır.

## Güvenlik

- HTTPS zorunlu olmalıdır.
- `.env` ve `veri/` dış erişime kapalı tutulmalıdır.
- API sadece reverse proxy arkasından dışarı açılmalıdır.
