import React, { useState, useEffect } from 'react';
import api from '../../api';
import * as XLSX from 'xlsx';

function Odemeler() {
  const [settings, setSettings] = useState({ daily_wage: '1375' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [reportDate, setReportDate] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await api.get('/superadmin/settings');
      if (data.settings) setSettings(data.settings);
    } catch (err) {
      console.error('Ayarlar yüklenemedi');
    }
  };

  const handleUpdateWage = async (e) => {
    e.preventDefault();
    try {
      await api.post('/superadmin/settings', { settings });
      setMessage({ type: 'success', text: 'Günlük yevmiye başarıyla güncellendi.' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Güncelleme başarısız.' });
    }
  };

  const downloadPayroll = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/superadmin/reports/payroll?year=${reportDate.year}&month=${reportDate.month}`);
      const payroll = data.payroll || [];

      if (payroll.length === 0) {
        setMessage({ type: 'error', text: 'Seçilen dönem için onaylı puantaj kaydı bulunamadı.' });
        setLoading(false);
        return;
      }

      // EXCEL GENERATION
      const wb = XLSX.utils.book_new();
      
      // En üst başlıklar
      const title = [
        ["DOKUZ EYLÜL ÜNİVERSİTESİ İŞKUR ÖĞRENCİ ÖDEME BORDROSU"],
        [`Dönem: ${reportDate.month}/${reportDate.year}`],
        [],
        ["Birim Adı", "T.C. Kimlik No", "Adı Soyadı", "IBAN", "Gün Sayısı", "Günlük Yevmiye (TL)", "Toplam Ödenecek (TL)"]
      ];

      const rows = payroll.map(p => [
        p.dept_name,
        p.tc_kimlik,
        p.name,
        p.iban,
        p.attended_days,
        p.daily_wage,
        p.total_amount
      ]);

      const totalAmount = payroll.reduce((sum, p) => sum + p.total_amount, 0);
      const footer = [
        [],
        ["", "", "", "", "", "GENEL TOPLAM ÖDENECEK:", totalAmount]
      ];

      const ws = XLSX.utils.aoa_to_sheet([...title, ...rows, ...footer]);

      // Stil ayarları (basit kolon genişlikleri)
      ws['!cols'] = [
        { wch: 30 }, // Birim
        { wch: 15 }, // TC
        { wch: 25 }, // Ad Soyad
        { wch: 30 }, // IBAN
        { wch: 12 }, // Gün
        { wch: 18 }, // Yevmiye
        { wch: 20 }  // Toplam
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Bordro");
      XLSX.writeFile(wb, `DEU_ISKUR_Bordro_${reportDate.year}_${reportDate.month}.xlsx`);

      setMessage({ type: 'success', text: 'Excel bordrosu başarıyla oluşturuldu.' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Rapor oluşturulamadı.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {message.text && (
        <div className={`p-4 rounded-2xl font-bold text-center border ${
          message.type === 'success' ? 'bg-success/10 text-success border-success/20' : 'bg-danger/10 text-danger border-danger/20'
        }`}>
          {message.text}
          <button onClick={() => setMessage({text: ''})} className="ml-4 opacity-50">✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* YEVMİYE AYARI */}
        <div className="glass-card">
          <h2 className="text-xl font-extrabold text-slate-800 mb-6 flex items-center gap-3">
            <span className="text-2xl">💵</span> Günlük Öğrenciye Verilecek Net Yevmiye
          </h2>
          <form onSubmit={handleUpdateWage} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Günlük Net Yevmiye (TL)</label>
              <div className="relative">
                 <input 
                    type="number" 
                    className="w-full h-14 px-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-primary focus:bg-white text-xl font-bold"
                    value={settings.daily_wage}
                    onChange={e => setSettings({ daily_wage: e.target.value })}
                 />
                 <span className="absolute right-5 top-1/2 -translate-y-1/2 font-black text-slate-300">TL</span>
              </div>
            </div>
            <button type="submit" className="btn-premium w-full !py-4">Yevmiyeyi Güncelle</button>
            <p className="text-[10px] text-slate-400 font-medium">Bu değer tüm sistemdeki hakediş hesaplamalarını anlık olarak günceller.</p>
          </form>
        </div>

        {/* BORDRO RAPORU */}
        <div className="glass-card">
          <h2 className="text-xl font-extrabold text-slate-800 mb-6 flex items-center gap-3">
            <span className="text-2xl">📋</span> Resmi Excel Bordrosu
          </h2>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Yıl</label>
                <select 
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:border-primary"
                  value={reportDate.year}
                  onChange={e => setReportDate({...reportDate, year: e.target.value})}
                >
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Ay</label>
                <select 
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:border-primary"
                  value={reportDate.month}
                  onChange={e => setReportDate({...reportDate, month: e.target.value})}
                >
                  {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('tr-TR', {month: 'long'})}</option>
                  ))}
                </select>
              </div>
            </div>
            <button 
              onClick={downloadPayroll}
              disabled={loading}
              className="btn-premium w-full !py-4 flex items-center justify-center gap-3"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white animate-spin rounded-full"></div>
              ) : (
                <><span>📊</span> Resmi Bordro İndir (.xlsx)</>
              )}
            </button>
            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
               <p className="text-[11px] text-primary font-semibold leading-relaxed">
                 * Bordro sadece "Onaylanmış" (completed) puantaj kayıtlarını ve mevcut yevmiye değerini baz alır.
               </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Odemeler;
