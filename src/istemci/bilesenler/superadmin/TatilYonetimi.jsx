import React, { useState, useEffect } from 'react';
import api from '../../api';

function TatilYonetimi() {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newHoliday, setNewHoliday] = useState({ date: '', description: '' });

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const data = await api.get('/superadmin/holidays');
      setHolidays(data.holidays || []);
    } catch (err) {
      console.error('Tatiller yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await api.post('/superadmin/holidays', newHoliday);
      setNewHoliday({ date: '', description: '' });
      fetchHolidays();
    } catch (err) {
      alert('Tatil eklenemedi.');
    }
  };

  const handleDelete = async (date) => {
    if (!window.confirm('Bu tatili silmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/superadmin/holidays/${date}`);
      fetchHolidays();
    } catch (err) {
      alert('Silme işlemi başarısız.');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ADD FORM */}
      <div className="glass-card">
        <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
          <span>📅</span> Yeni Resmi Tatil Ekle
        </h2>
        <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Tatil Tarihi</label>
            <input 
              type="date" 
              required 
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-primary font-bold"
              value={newHoliday.date}
              onChange={e => setNewHoliday({...newHoliday, date: e.target.value})}
            />
          </div>
          <div className="flex-[2]">
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Açıklama</label>
            <input 
              type="text" 
              required 
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-primary font-bold"
              value={newHoliday.description}
              onChange={e => setNewHoliday({...newHoliday, description: e.target.value})}
              placeholder="Örn: Ramazan Bayramı 1. Gün"
            />
          </div>
          <div className="flex items-end">
            <button type="submit" className="btn-premium h-12 !px-8">Ekle</button>
          </div>
        </form>
      </div>

      {/* LIST */}
      <div className="glass-card !p-0 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-50 bg-slate-50/50">
          <h2 className="text-xl font-extrabold text-slate-800">Tanımlı Tatil Günleri</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase">
              <tr>
                <th className="px-8 py-4 text-left">Tarih</th>
                <th className="px-8 py-4 text-left">Açıklama</th>
                <th className="px-8 py-4 text-left">Tür</th>
                <th className="px-8 py-4 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="4" className="py-10 text-center text-slate-400 font-bold text-xs uppercase">Yükleniyor...</td></tr>
              ) : holidays.length === 0 ? (
                <tr><td colSpan="4" className="py-10 text-center text-slate-400 italic">Hiç tatil günü tanımlanmamış.</td></tr>
              ) : (
                holidays.map(h => (
                  <tr key={h.date} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-4 font-bold text-slate-700">{new Date(h.date).toLocaleDateString('tr-TR')}</td>
                    <td className="px-8 py-4 text-sm font-semibold text-slate-600">{h.description}</td>
                    <td className="px-8 py-4">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${h.is_fixed ? 'bg-[#00305D] text-white' : 'bg-primary/10 text-primary'}`}>
                        {h.is_fixed ? 'SABİT RESMİ' : 'MANUEL / BAYRAM'}
                      </span>
                    </td>
                    <td className="px-8 py-4 text-right">
                      {!h.is_fixed && (
                        <button 
                          onClick={() => handleDelete(h.date)}
                          className="text-danger font-black text-[10px] uppercase hover:underline"
                        >
                          Sil
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

  export default TatilYonetimi;
