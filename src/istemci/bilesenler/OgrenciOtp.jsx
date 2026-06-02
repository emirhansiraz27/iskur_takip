import React, { useState, useEffect } from 'react';
import api from '../api';

function OgrenciOtp({ user }) {
  const [otpCode, setOtpCode] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [checkoutCode, setCheckoutCode] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const [planStatus, setPlanStatus] = useState('loading'); // 'loading', 'allowed', 'blocked'
  const [attendanceStatus, setAttendanceStatus] = useState('none'); // 'none', 'active', 'completed'
  const [recentCheckins, setRecentCheckins] = useState([]);

  useEffect(() => {
    checkPlanStatus();
    fetchRecentCheckins();
  }, []);

  const checkPlanStatus = async () => {
    try {
      const data = await api.get('/user/stats');
      setPlanStatus(data.today_plan ? 'allowed' : 'blocked');
      
      if (data.today_attendance?.check_out) {
        setAttendanceStatus('completed');
      } else if (data.today_attendance?.check_in) {
        setAttendanceStatus('active');
      } else {
        setAttendanceStatus('none');
      }
    } catch (err) {
      setPlanStatus('blocked');
    }
  };

  const fetchRecentCheckins = async () => {
    try {
      const data = await api.get('/otp/student/recent-checkins');
      setRecentCheckins(data.recent_checkins || []);
    } catch (err) {
      console.error('Kayıtlar yüklenemedi.');
    }
  };

  useEffect(() => {
    if (!expiresAt) return;
    const timer = setInterval(() => {
      const now = new Date();
      const diff = Math.max(0, Math.floor((new Date(expiresAt) - now) / 1000));
      setTimeLeft(diff);
      if (diff === 0) {
        setOtpCode(null);
        setExpiresAt(null);
        clearInterval(timer);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  const generateCheckin = async () => {
    if (attendanceStatus === 'completed') {
        setMessage({ type: 'success', text: 'Bugünkü mesainiz zaten tamamlanmıştır.' });
        return;
    }
    if (planStatus !== 'allowed') {
        setMessage({ type: 'error', text: 'Bugün çalışma planınızda bulunmamaktadır.' });
        return;
    }
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const data = await api.post('/otp/student/generate-checkin');
      setOtpCode(data.otp_code);
      setExpiresAt(data.expires_at);
      setAttendanceStatus('active');
    } catch (err) {
      setMessage({ type: 'error', text: err || 'Giriş kodu üretilemedi.' });
    } finally {
      setLoading(false);
    }
  };

  const verifyCheckout = async (e) => {
    e.preventDefault();
    if (!checkoutCode) return;
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const data = await api.post('/otp/student/verify-checkout', {
        otp_code: checkoutCode
      });
      setMessage({ type: 'success', text: data.message || 'Çıkış işlemi onaylandı.' });
      setCheckoutCode('');
      setAttendanceStatus('completed');
      fetchRecentCheckins();
    } catch (err) {
      setMessage({ type: 'error', text: err || 'Çıkış işlemi başarısız.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* PLAN DURUM KUTUCUĞU */}
      <div className={`glass-card border-2 flex flex-col md:flex-row items-center gap-6 p-8 animate-fade-in ${
        attendanceStatus === 'completed' ? 'border-primary/40 bg-primary/5 shadow-xl shadow-primary/5' :
        planStatus === 'allowed' ? 'border-success/30 bg-success/5' : 
        planStatus === 'blocked' ? 'border-danger/30 bg-danger/5' : 'border-slate-100 bg-slate-50'
      }`}>
         <div className="text-5xl">
            {planStatus === 'blocked' ? '🚫' : 
             attendanceStatus === 'completed' ? '⭐' : 
             planStatus === 'allowed' ? '✅' : '⌛'}
         </div>
         <div className="flex-1 text-center md:text-left space-y-1">
            <h3 className={`text-xl font-black uppercase tracking-tight ${
              planStatus === 'blocked' ? 'text-danger' :
              attendanceStatus === 'completed' ? 'text-primary' :
              planStatus === 'allowed' ? 'text-success' : 'text-slate-400'
            }`}>
               {planStatus === 'blocked' ? 'BUGÜN ÇALIŞMA BAŞLATAMAZSINIZ' :
                attendanceStatus === 'completed' ? 'MESAİNİZ SİSTEME İŞLENMİŞTİR' :
                planStatus === 'allowed' ? 'MESAİNİZİ BAŞLATABİLİRSİNİZ' : 'Plan Kontrol Ediliyor...'}
            </h3>
            <p className="text-xs font-bold text-slate-500 uppercase">
               {planStatus === 'blocked' ? 'Bugün onaylı çalışma planınızda bulunmamaktadır.' :
                attendanceStatus === 'completed' ? 'Bugünkü katılımınız başarıyla kaydedildi. İyi istirahatler!' :
                planStatus === 'allowed' ? 'Onaylı planınıza göre bugün çalışma gününüzdür.' : 'Lütfen bekleyin...'}
            </p>
         </div>
         {attendanceStatus === 'completed' && (
            <div className="hidden lg:block px-6 py-2 bg-primary text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20">
               Mesai Tamamlandı
            </div>
         )}
         {attendanceStatus !== 'completed' && planStatus === 'allowed' && (
            <div className="hidden lg:block px-6 py-2 bg-success text-white rounded-full text-[10px] font-black uppercase tracking-widest">
               Erişim Onaylandı
            </div>
         )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="glass-card !p-0 overflow-hidden">
          <div className="px-6 py-5 bg-success border-b border-success flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-white/15 text-white flex items-center justify-center text-2xl">⏱</div>
            <div>
              <h2 className="text-lg font-extrabold text-white">Mesai Girişi</h2>
              <p className="text-xs text-white/75 font-semibold">Giriş kodunuzu üretip birim sorumlunuza gösterin.</p>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className={`otp-output-card ${otpCode ? 'otp-output-card-success' : 'otp-output-card-empty'}`}>
              {otpCode ? (
                <>
                  <div className="otp-output-label otp-output-label-success">Öğrenci Giriş Kodu</div>
                  <div className="otp-output-code otp-output-code-success">{otpCode}</div>
                  <div className="otp-output-time otp-output-time-success">Kalan Süre: {timeLeft}s</div>
                </>
              ) : (
                <>
                  <div className="otp-output-empty-mark">—</div>
                  <div className="otp-output-empty-text">Henüz kod üretilmedi</div>
                </>
              )}
            </div>

            <button 
              onClick={generateCheckin}
              disabled={loading || otpCode}
              className="otp-action-button otp-action-button-checkin"
            >
              {loading ? 'Lütfen Bekleyin...' : 'Giriş Kodu Üret'}
            </button>
          </div>
        </section>

        <section className="glass-card !p-0 overflow-hidden">
          <div className="px-6 py-5 bg-danger border-b border-danger flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-white/15 text-white flex items-center justify-center text-2xl">🏁</div>
            <div>
              <h2 className="text-lg font-extrabold text-white">Mesai Çıkışı</h2>
              <p className="text-xs text-white/75 font-semibold">Birim sorumlunuzdan aldığınız kodu girin.</p>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <form onSubmit={verifyCheckout} className="space-y-4">
              <div className="otp-code-field otp-code-field-danger">
                <span className="otp-code-label otp-code-label-danger">6 Haneli Kod</span>
                <input 
                  type="text" 
                  maxLength={6}
                  placeholder="000000"
                  value={checkoutCode}
                  onChange={(e) => setCheckoutCode(e.target.value.replace(/[^0-9]/g, ''))}
                  className="otp-code-input"
                />
              </div>
              <button 
                type="submit"
                disabled={loading || checkoutCode.length < 6}
                className="otp-action-button otp-action-button-checkout"
              >
                {loading ? 'Kontrol Ediliyor...' : 'Çıkışı Onayla'}
              </button>
            </form>
          </div>
        </section>
      </div>

      {message.text && (
        <div className={`rounded-3xl p-5 border animate-fade-in ${
          message.type === 'success' ? 'bg-success/10 border-success/20 text-success' : 'bg-danger/10 border-danger/20 text-danger'
        }`}>
          <div className="flex items-center justify-center gap-3 text-sm font-extrabold">
            <span>{message.text}</span>
          </div>
        </div>
      )}

      {/* RECENT CHECKINS TABLE */}
      <section className="glass-card !p-0 overflow-hidden animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <div className="px-6 py-5 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-lg font-extrabold text-slate-800">Geçmiş Mesai Kayıtlarım</h2>
        </div>
        
        <div className="p-0">
          {recentCheckins.length === 0 ? (
            <div className="p-10 text-center text-slate-400 font-bold">
              Henüz sistemde mesai kaydınız bulunmuyor.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Tarih</th>
                    <th className="px-6 py-4 text-center">Giriş Saati</th>
                    <th className="px-6 py-4 text-center">Çıkış Saati</th>
                    <th className="px-6 py-4 text-center">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentCheckins.map((record, index) => {
                    const parts = record.date ? record.date.split('-') : [];
                    const formattedDate = parts.length === 3 ? `${parts[2]}.${parts[1]}.${parts[0]}` : record.date;
                    return (
                    <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800">{formattedDate}</td>
                      <td className="px-6 py-4 text-center font-bold text-success">{record.check_in || '--:--'}</td>
                      <td className="px-6 py-4 text-center font-bold text-danger">{record.check_out || '--:--'}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          record.status === 'completed' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                        }`}>
                          {record.status === 'completed' ? 'TAMAMLANDI' : 'MESAİDE'}
                        </span>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default OgrenciOtp;
