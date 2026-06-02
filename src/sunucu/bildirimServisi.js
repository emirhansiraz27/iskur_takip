const nodemailer = require('nodemailer');

/**
 * SMS Gönderim Yardımcısı (Simülasyon / API Entegrasyonu)
 * @param {string} phone - Alıcı telefon numarası
 * @param {string} message - Gönderilecek SMS mesajı
 */
async function sendSMS(phone, message) {
    const apiUser = process.env.SMS_API_USER;
    const apiPass = process.env.SMS_API_PASS;

    console.log(`\n====================================================`);
    console.log(`📱 [SMS SIMÜLASYONU]`);
    console.log(`Kime: ${phone}`);
    console.log(`Mesaj: ${message}`);
    console.log(`====================================================\n`);

    if (apiUser && apiPass) {
        // Canlı sunucuda SMS API entegrasyonu buraya yapılacaktır.
        // Örnek (axios kullanarak Netgsm API çağrısı):
        // try {
        //     const axios = require('axios');
        //     await axios.post('https://api.netgsm.com.tr/sms/send/get', {
        //         user: apiUser,
        //         password: apiPass,
        //         gsmno: phone.replace(/\D/g, ''),
        //         message: message,
        //         msgheader: 'ISKUR TAKIP'
        //     });
        //     console.log(`[SMS API] SMS başarıyla gönderildi.`);
        // } catch (err) {
        //     console.error(`[SMS API] SMS gönderme hatası:`, err.message);
        // }
    }
}

/**
 * E-posta Gönderim Yardımcısı (Simülasyon / SMTP Entegrasyonu)
 * @param {string} email - Alıcı e-posta adresi
 * @param {string} subject - E-posta konusu
 * @param {string} text - Düz metin içeriği
 * @param {string} html - HTML formatlı içerik
 */
async function sendEmail(email, subject, text, html) {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || smtpUser;

    console.log(`\n====================================================`);
    console.log(`📧 [E-POSTA SIMÜLASYONU]`);
    console.log(`Kime: ${email}`);
    console.log(`Konu: ${subject}`);
    console.log(`Mesaj (Düz): ${text}`);
    console.log(`====================================================\n`);

    if (smtpHost && smtpUser && smtpPass) {
        try {
            const transporter = nodemailer.createTransport({
                host: smtpHost,
                port: Number(smtpPort || 587),
                secure: smtpPort === '465', // true for 465, false for other ports
                auth: {
                    user: smtpUser,
                    pass: smtpPass
                }
            });

            await transporter.sendMail({
                from: smtpFrom,
                to: email,
                subject: subject,
                text: text,
                html: html
            });
            console.log(`[SMTP] E-posta başarıyla gönderildi.`);
        } catch (err) {
            console.error(`[SMTP] E-posta gönderme hatası:`, err.message);
        }
    }
}

/**
 * Öğrencinin durum veya birim değişimine göre bildirim hazırlayıp gönderir
 * @param {object} ogrenci - Öğrenci bilgileri (id, name, email, phone, role)
 * @param {string} eskiDurum - Eski başvuru durumu (pending, approved, vb.)
 * @param {string} yeniDurum - Yeni başvuru durumu (approved, revision_required, rejected, vb.)
 * @param {string} eskiBirim - Eski birim adı
 * @param {string} yeniBirim - Yeni birim adı
 * @param {string} aciklama - Yönetici açıklaması (Düzeltme veya Ret gerekçesi)
 */
async function ogrenciDurumBildirimiGonder(ogrenci, eskiDurum, yeniDurum, eskiBirim, yeniBirim, aciklama) {
    if (!ogrenci || ogrenci.role !== 'student') return;

    const phone = ogrenci.phone;
    const email = ogrenci.email;
    const name = ogrenci.name;

    if (!phone && !email) return;

    let subject = '';
    let msgText = '';
    let msgHtml = '';

    // 1. Belgeler Onaylandı (pending -> approved)
    if (eskiDurum === 'pending' && yeniDurum === 'approved') {
        subject = 'İŞKUR Takip - Başvurunuz Onaylandı! ✅';
        msgText = `Sayın ${name}, yüklemiş olduğunuz belgeler başarıyla onaylanmıştır. Birim atama işleminiz tamamlandığında ayrıca bilgilendirileceksiniz.`;
        msgHtml = `
            <div style="font-family: sans-serif; padding: 20px; color: #334155;">
                <h2 style="color: #10b981;">Tebrikler! Belgeleriniz Onaylandı ✅</h2>
                <p>Sayın <strong>${name}</strong>,</p>
                <p>İŞKUR Takip Sistemi için yüklemiş olduğunuz başvuru belgeleri sistem yöneticisi tarafından incelenmiş ve onaylanmıştır.</p>
                <p>Birime atama süreciniz devam etmektedir. Atama işleminiz yapıldığında size yeni bir bilgilendirme gönderilecektir.</p>
                <br>
                <p style="font-size: 12px; color: #94a3b8;">Bu e-posta İŞKUR Takip Sistemi tarafından otomatik olarak gönderilmiştir.</p>
            </div>
        `;
    }
    // 2. Düzeltme İstendi (durum -> revision_required)
    else if (yeniDurum === 'revision_required') {
        subject = 'İŞKUR Takip - Başvuru Düzeltme Talebi 📝';
        msgText = `Sayın ${name}, başvurunuzda düzeltme yapılması gereken hususlar vardır. Gerekçe: ${aciklama || 'Belirtilmedi'}. Lütfen sisteme giriş yaparak güncelleyiniz.`;
        msgHtml = `
            <div style="font-family: sans-serif; padding: 20px; color: #334155;">
                <h2 style="color: #d97706;">Başvurunuz İçin Düzeltme Gerekiyor 📝</h2>
                <p>Sayın <strong>${name}</strong>,</p>
                <p>İŞKUR Takip Sistemi için yaptığınız başvuru belgelerinde yönetici tarafından düzeltilmesi istenen hususlar tespit edilmiştir.</p>
                <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 12px; padding: 16px; margin: 16px 0;">
                    <strong style="color: #b45309; display: block; margin-bottom: 4px;">Düzeltme Gerekçesi:</strong>
                    <p style="margin: 0; font-size: 14px;">${aciklama || 'Belirtilmedi'}</p>
                </div>
                <p>Lütfen sisteme giriş yaparak belgelerinizi bu gerekçe doğrultusunda güncelleyiniz.</p>
                <br>
                <p style="font-size: 12px; color: #94a3b8;">Bu e-posta İŞKUR Takip Sistemi tarafından otomatik olarak gönderilmiştir.</p>
            </div>
        `;
    }
    // 3. Kesin Reddedildi (durum -> permanently_rejected veya rejected)
    else if (yeniDurum === 'permanently_rejected' || yeniDurum === 'rejected') {
        subject = 'İŞKUR Takip - Başvurunuz Reddedildi ❌';
        msgText = `Sayın ${name}, İŞKUR başvurunuz uygun görülmeyerek reddedilmiştir. Gerekçe: ${aciklama || 'Belirtilmedi'}.`;
        msgHtml = `
            <div style="font-family: sans-serif; padding: 20px; color: #334155;">
                <h2 style="color: #ef4444;">Başvurunuz Reddedildi ❌</h2>
                <p>Sayın <strong>${name}</strong>,</p>
                <p>İŞKUR Takip Sistemi için yaptığınız başvuru yapılan değerlendirme sonucunda uygun görülmeyerek reddedilmiştir.</p>
                <div style="background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 12px; padding: 16px; margin: 16px 0;">
                    <strong style="color: #991b1b; display: block; margin-bottom: 4px;">Ret Gerekçesi:</strong>
                    <p style="margin: 0; font-size: 14px;">${aciklama || 'Belirtilmedi'}</p>
                </div>
                <br>
                <p style="font-size: 12px; color: #94a3b8;">Bu e-posta İŞKUR Takip Sistemi tarafından otomatik olarak gönderilmiştir.</p>
            </div>
        `;
    }
    // 4. Birime Atandı (yeniBirim !== eskiBirim)
    else if (yeniBirim && (eskiBirim !== yeniBirim)) {
        subject = 'İŞKUR Takip - Birim Atamanız Yapıldı! 🎉';
        msgText = `Sayın ${name}, atamanız "${yeniBirim}" birimine başarıyla yapılmıştır. Sisteme giriş yapıp çalışma planınızı oluşturmaya başlayabilirsiniz.`;
        msgHtml = `
            <div style="font-family: sans-serif; padding: 20px; color: #334155;">
                <h2 style="color: #3b82f6;">Birim Atamanız Yapıldı! 🎉</h2>
                <p>Sayın <strong>${name}</strong>,</p>
                <p>İŞKUR Takip Sistemi kapsamındaki atama işleminiz başarıyla tamamlanmıştır.</p>
                <p>Atandığınız Birim: <strong>${yeniBirim}</strong></p>
                <p>Lütfen sisteme e-posta ve şifrenizle giriş yaparak çalışma saatlerinizi içeren haftalık çalışma planınızı oluşturunuz.</p>
                <br>
                <p style="font-size: 12px; color: #94a3b8;">Bu e-posta İŞKUR Takip Sistemi tarafından otomatik olarak gönderilmiştir.</p>
            </div>
        `;
    }

    if (subject) {
        if (email) {
            await sendEmail(email, subject, msgText, msgHtml);
        }
        if (phone) {
            await sendSMS(phone, msgText);
        }
    }
}

module.exports = {
    sendSMS,
    sendEmail,
    ogrenciDurumBildirimiGonder
};
