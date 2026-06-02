import React, { useState, useEffect } from 'react';
import api from '../api';

function YoneticiOtp({ user }) {
  const [checkinCode, setCheckinCode] = useState('');
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [checkoutOtp, setCheckoutOtp] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const [recentCheckins, setRecentCheckins] = useState([]);

  useEffect(() => {
    fetchActiveStudents();
    fetchRecentCheckins();
  }, []);

  useEffect(() => {
    if (!expiresAt) return;
    const timer = setInterval(() => {
      const now = new Date();
      const diff = Math.max(0, Math.floor((new Date(expiresAt) - now) / 1000));
      setTimeLeft(diff);
      if (diff === 0) {
        setCheckoutOtp(null);
        setExpiresAt(null);
        clearInterval(timer);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  const fetchActiveStudents = async () => {
    try {
      const data = await api.get('/user/students');
      setStudents(data.students || []);
    } catch (err) {
      console.error('Öğrenciler yüklenemedi.');
    }
  };

  const fetchRecentCheckins = async () => {
    try {
      const data = await api.get('/otp/manager/recent-checkins');
      setRecentCheckins(data.recent_checkins || []);
    } catch (err) {
      console.error('Giriş yapan öğrenciler yüklenemedi.');
    }
  };

  const verifyCheckin = async (e) => {
    e.preventDefault();
    if (!checkinCode) return;
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const data = await api.post('/otp/manager/verify-checkin', {
        otp_code: checkinCode
      });
      setMessage({ type: 'success', text: data.message || 'Öğrenci girişi başarıyla onaylandı.' });
      setCheckinCode('');
      fetchActiveStudents();
      fetchRecentCheckins();
    } catch (err) {
      setMessage({ type: 'error', text: err || 'Doğrulama kodu hatalı veya süresi dolmuş.' });
    } finally {
      setLoading(false);
    }
  };

  const generateCheckout = async () => {
    if (!selectedStudent) return;
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const data = await api.post('/otp/manager/generate-checkout', {
        user_id: selectedStudent
      });
      setCheckoutOtp(data.otp_code);
      setExpiresAt(data.expires_at);
    } catch (err) {
      setMessage({ type: 'error', text: err || 'Çıkış kodu üretilemedi.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="glass-card !p-0 overflow-hidden">
          <div className="px-6 py-5 bg-success border-b border-success flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-white/15 text-white flex items-center justify-center text-2xl">🛂</div>
            <div>
              <h2 className="text-lg font-extrabold text-white">Giriş Doğrulama</h2>
              <p className="text-xs text-white/75 font-semibold">Öğrencinin mesai başlangıç kodunu onaylayın.</p>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <form onSubmit={verifyCheckin} className="space-y-4">
              <div className="otp-code-field">
                <span className="otp-code-label">6 Haneli Kod</span>
                <input 
                  type="text" 
                  maxLength={6}
                  placeholder="000000"
                  value={checkinCode}
                  onChange={(e) => setCheckinCode(e.target.value.replace(/[^0-9]/g, ''))}
                  className="otp-code-input"
                />
              </div>
              <button 
                type="submit"
                disabled={loading || checkinCode.length < 6}
                className="btn-premium w-full !justify-center !py-3 disabled:opacity-40 disabled:grayscale"
              >
                {loading ? 'İşleniyor...' : 'Kodu Doğrula'}
              </button>
            </form>
          </div>
        </section>

        <section className="glass-card !p-0 overflow-hidden">
          <div className="px-6 py-5 bg-danger border-b border-danger flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-white/15 text-white flex items-center justify-center text-2xl">🔑</div>
            <div>
              <h2 className="text-lg font-extrabold text-white">Çıkış Kodu Üret</h2>
              <p className="text-xs text-white/75 font-semibold">Mesai bitişi için öğrenciye kod oluşturun.</p>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div className="space-y-4">
              <select 
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:border-primary focus:bg-white"
              >
                <option value="">Öğrenci seçin</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>

              <div className={`otp-output-card ${
                checkoutOtp ? 'otp-output-card-active' : 'otp-output-card-empty'
              }`}>
                {checkoutOtp ? (
                  <>
                    <div className="otp-output-label">Öğrenci Çıkış Kodu</div>
                    <div className="otp-output-code">{checkoutOtp}</div>
                    <div className="otp-output-time">Kod Süresi: {timeLeft}s</div>
                  </>
                ) : (
                  <>
                    <div className="otp-output-empty-mark">—</div>
                    <div className="otp-output-empty-text">Henüz kod üretilmedi</div>
                  </>
                )}
              </div>

              <button 
                onClick={generateCheckout}
                disabled={loading || !selectedStudent || checkoutOtp}
                className="btn-premium w-full !justify-center !py-3 disabled:opacity-40 disabled:grayscale"
              >
                {loading ? 'Hazırlanıyor...' : 'Çıkış Kodu Üret'}
              </button>
            </div>
          </div>
        </section>
      </div>

      {message.text && (
        <div className={`rounded-3xl p-5 border animate-fade-in ${
          message.type === 'success' ? 'bg-success/10 border-success/20 text-success' : 'bg-danger/10 border-danger/20 text-danger'
        }`}>
          <div className="flex items-center justify-center gap-3 text-sm font-extrabold">
            <span>{message.type === 'success' ? '✅' : '⚠️'}</span>
            <span>{message.text}</span>
          </div>
        </div>
      )}

      {/* RECENT CHECKINS TABLE */}
      <section className="glass-card !p-0 overflow-hidden animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <div className="px-6 py-5 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-lg font-extrabold text-slate-800">Bugün Giriş Yapan Öğrenciler</h2>
          <span className="bg-primary/10 text-primary px-3 py-1 rounded-lg text-xs font-bold">{recentCheckins.length} Kayıt</span>
        </div>
        
        <div className="p-0">
          {recentCheckins.length === 0 ? (
            <div className="p-10 text-center text-slate-400 font-bold">
              Bugün henüz giriş yapan bir öğrenci bulunmuyor.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Öğrenci Adı</th>
                    <th className="px-6 py-4 text-center">Giriş Saati</th>
                    <th className="px-6 py-4 text-center">Çıkış Saati</th>
                    <th className="px-6 py-4 text-center">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentCheckins.map((record, index) => (
                    <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800">{record.student_name}</td>
                      <td className="px-6 py-4 text-center font-bold text-success">{record.check_in || '--:--'}</td>
                      <td className="px-6 py-4 text-center font-bold text-danger">{record.check_out || '--:--'}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          record.status === 'completed' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                        }`}>
                          {record.status === 'completed' ? 'ÇIKIŞ YAPTI' : 'MESAİDE'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default YoneticiOtp;
