import React, { useState, useEffect } from 'react';
import api from '../api';

const TR_AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

const dinamikAylariGetir = () => {
  const aylar = [];
  const simdi = new Date();
  const projeBaslangic = new Date(2026, 1, 1); // Şubat 2026
  
  for (let i = 11; i >= 0; i--) {
    const d = new Date(simdi.getFullYear(), simdi.getMonth() - i, 1);
    if (d >= projeBaslangic) {
      aylar.push({ value: d.getMonth() + 1, year: d.getFullYear(), label: `${TR_AYLAR[d.getMonth()]} ${d.getFullYear()}` });
    }
  }
  return aylar;
};

const AYLAR = dinamikAylariGetir();

function YoneticiPuantaj({ user }) {
  const [seciliAy, setSeciliAy] = useState(new Date().getMonth() + 1);
  const [seciliYil, setSeciliYil] = useState(new Date().getFullYear());
  const [puantaj, setPuantaj] = useState([]);
  const [loading, setLoading] = useState(false);
  const [onayModali, setOnayModali] = useState(null); 

  useEffect(() => {
    puantajiGetir();
  }, [seciliAy, seciliYil]);

  const puantajiGetir = async () => {
    setLoading(true);
    try {
      const data = await api.get('/timesheet/manager', {
        params: { year: seciliYil, month: seciliAy }
      });
      setPuantaj(data.timesheet || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const ilisikKesmeOnayi = async (ogrenciId, ogrenciAdi) => {
    setOnayModali({ id: ogrenciId, name: ogrenciAdi });
  };

  const ilisigiKes = async () => {
    if (!onayModali) return;
    try {
      await api.post(`/puantaj/manager/terminate/${onayModali.id}`);
      setOnayModali(null);
      puantajiGetir();
    } catch (err) {
      setOnayModali(null);
      alert(err.message || 'Hata: İşlem yapılamadı.');
    }
  };

  const csvDisaAktar = () => {
    if (puantaj.length === 0) return;
    const ayEtiketi = AYLAR.find(m => m.value === seciliAy && m.year === seciliYil)?.label || `${seciliAy}-${seciliYil}`;
    const gunler = puantaj.length > 0 ? puantaj[0].days.map(d => d.day) : [];

    const DURUM_ESLEME = { attended: '✓', absent: 'X', planned: '○', none: '-' };
    let csv = '\uFEFF';

    const basliklar = ['Ad Soyad', 'Durum', ...gunler, 'Bu Ay Geldi', 'Bu Ay Devamsız', 'Tüm Zamanlar Devamsız', 'Limit', 'Program Süresi (Ay)'];
    csv += basliklar.join(';') + '\n';

    puantaj.forEach(ogrenci => {
      const limit = ogrenci.program_duration_months <= 6 ? 7 : 10;
      const durumEtiketi = ogrenci.is_terminated === 1 ? 'Feshedildi' : ogrenci.total_overall_absent >= limit ? 'Kritik' : ogrenci.total_overall_absent >= limit - 2 ? 'Uyarı' : 'Aktif';
      const gunDurumlari = ogrenci.days.map(d => DURUM_ESLEME[d.status] || '-');
      const satir = [
        ogrenci.student_name,
        durumEtiketi,
        ...gunDurumlari,
        ogrenci.total_attended_month,
        ogrenci.total_absent_month,
        ogrenci.total_overall_absent,
        limit,
        ogrenci.program_duration_months
      ];
      csv += satir.join(';') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Puantaj_${ayEtiketi.replace(' ', '_')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const gunDizisiGetir = () => {
    if (puantaj.length === 0) return [];
    return puantaj[0]?.days?.map(d => d.day) || [];
  };

  const aktifOgrenciler = puantaj.filter(s => s.is_terminated === 0);
  const ilisigiKesilenler = puantaj.filter(s => s.is_terminated === 1);

  const tabloyuOlustur = (ogrenciler, ilisigiKesilenListesi = false) => {
    if (ogrenciler.length === 0) {
      return (
        <div className="p-20 text-center text-slate-400 font-bold bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
          Kayıtlı öğrenci bulunmuyor
        </div>
      );
    }

    return (
      <div className="custom-scrollbar max-w-full overflow-auto rounded-2xl border border-slate-300 bg-white shadow-sm">
        <table className="w-full min-w-[1180px] table-fixed border-collapse text-[11px] sm:text-xs">
          <thead className="sticky top-0 z-30">
            <tr>
              <th className="sticky left-0 z-40 w-[210px] border border-slate-300 bg-slate-800 px-3 py-2 text-left font-black uppercase tracking-wider text-white shadow-[8px_0_18px_rgba(15,23,42,0.08)]">Öğrenci Bilgileri</th>
              {gunDizisiGetir().map(d => (
                <th key={d} className="w-10 border border-slate-300 bg-primary/10 px-1 py-2 text-center font-black text-primary">{d}</th>
              ))}
              <th className="w-[120px] border border-emerald-200 bg-emerald-500 px-2 py-2 text-center font-black uppercase tracking-wider text-white">Katılım (Gün)</th>
              <th className="w-[120px] border border-rose-200 bg-rose-500 px-2 py-2 text-center font-black uppercase tracking-wider text-white">Aylık Devamsızlık</th>
              <th className="w-[150px] border border-amber-200 bg-amber-400 px-2 py-2 text-center font-black uppercase tracking-wider text-slate-900">Genel Devamsızlık</th>
              {!ilisigiKesilenListesi && <th className="sticky right-0 z-40 w-[110px] border border-slate-300 bg-slate-800 px-2 py-2 text-right font-black uppercase tracking-wider text-white shadow-[-8px_0_18px_rgba(15,23,42,0.08)]">Aksiyon</th>}
            </tr>
          </thead>
          <tbody>
            {ogrenciler.map((ogrenci) => {
              const limit = ogrenci.program_duration_months <= 6 ? 7 : 10;
              const uyariVar = ogrenci.total_overall_absent >= limit - 2 && ogrenci.total_overall_absent < limit;
              const kritikVar = ogrenci.total_overall_absent >= limit;

              return (
                <tr key={ogrenci.student_id} className="group hover:bg-slate-50">
                  <td className={`sticky left-0 z-20 border border-slate-300 px-3 py-2 font-bold text-slate-700 ${uyariVar ? 'text-warning' : kritikVar ? 'text-danger' : ''} bg-white group-hover:bg-slate-50 transition-colors shadow-[8px_0_18px_rgba(15,23,42,0.04)]`}>
                    <div className="flex flex-col min-w-0">
                      <span className="truncate">{ogrenci.student_name}</span>
                    </div>
                  </td>
                  {ogrenci.days?.map((d, i) => (
                    <td key={i} className="border border-slate-300 px-1 py-2 text-center">
                      <div className="flex items-center justify-center">
                        {d.status === 'attended' && <span className="flex h-6 w-6 items-center justify-center rounded-sm bg-emerald-100 text-[10px] font-black text-success">✓</span>}
                        {d.status === 'absent' && <span className="flex h-6 w-6 items-center justify-center rounded-sm bg-rose-100 text-[10px] font-black text-danger">X</span>}
                        {d.status === 'planned' && <span className="flex h-6 w-6 items-center justify-center rounded-sm bg-primary/10 text-[10px] font-black text-primary">•</span>}
                        {d.status === 'none' && <span className="text-slate-200"></span>}
                      </div>
                    </td>
                  ))}
                  <td className="border border-slate-300 bg-emerald-50/50 px-2 py-2 text-center font-black text-emerald-700">{ogrenci.total_attended_month}</td>
                  <td className="border border-slate-300 bg-rose-50 px-2 py-2 text-center font-black text-rose-700">{ogrenci.total_absent_month}</td>
                  <td className={`border border-slate-300 px-2 py-2 text-center font-black ${kritikVar ? 'bg-danger text-white' : uyariVar ? 'bg-warning text-white' : 'bg-slate-50 text-slate-700'}`}>
                      {ogrenci.total_overall_absent} / {limit}
                  </td>
                  {!ilisigiKesilenListesi && (
                    <td className="sticky right-0 z-20 border border-slate-300 bg-white px-2 py-2 text-right transition-colors group-hover:bg-slate-50 shadow-[-8px_0_18px_rgba(15,23,42,0.04)]">
                      <button 
                        onClick={() => ilisikKesmeOnayi(ogrenci.student_id, ogrenci.student_name)}
                        className={`btn-secondary !py-1 !px-3 !text-[11px] hover:!bg-danger hover:!text-white transition-all`}
                      >
                        İlişiği Kes
                      </button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* HEADER CONTROLS */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-end gap-6 bg-white p-5 sm:p-8 rounded-[24px] border border-slate-100 shadow-sm">
        <div className="space-y-2">
           <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Dönem Kontrolü</h3>
           <div className="flex flex-col sm:flex-row sm:items-center gap-4">
             <select 
                value={`${seciliAy}-${seciliYil}`}
                onChange={(e) => {
                  const [m, y] = e.target.value.split('-').map(Number);
                  setSeciliAy(m);
                  setSeciliYil(y);
                }}
                className="w-full sm:w-48 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-primary"
              >
                {AYLAR.map(m => (
                  <option key={`${m.value}-${m.year}`} value={`${m.value}-${m.year}`}>{m.label}</option>
                ))}
              </select>
              <div className="text-xs font-medium text-slate-500">
                Görüntülenen ay için toplam <span className="text-primary font-bold">{aktifOgrenciler.length} aktif</span> kayıt.
              </div>
           </div>
        </div>
        
        <button
          onClick={csvDisaAktar}
          disabled={puantaj.length === 0 || loading}
          className="btn-premium"
        >
          <span>📊</span> EXCEL RAPORU (.CSV)
        </button>
      </div>

      {/* MAIN TABLE CARD */}
      <div className="glass-card !p-0 overflow-hidden">
        <div className="px-5 sm:px-8 py-6 border-b border-slate-50 flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 bg-slate-50/50">
           <h2 className="text-xl font-extrabold text-slate-800">Aktif Puantaj Cetveli</h2>
           <div className="flex flex-wrap gap-4 text-[10px] font-bold uppercase">
              <div className="flex items-center gap-2 text-success">
                <span className="w-2 h-2 bg-success rounded-full"></span> Giriş
              </div>
              <div className="flex items-center gap-2 text-danger">
                <span className="w-2 h-2 bg-danger rounded-full"></span> Devamsız
              </div>
              <div className="flex items-center gap-2 text-primary">
                <span className="w-2 h-2 bg-primary/40 rounded-full"></span> Planlı
              </div>
           </div>
        </div>
        
        <div className="p-4 sm:p-8">
          {loading ? (
            <div className="py-24 text-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent animate-spin mx-auto mb-6"></div>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Puantaj Verileri Hazırlanıyor...</p>
            </div>
          ) : tabloyuOlustur(aktifOgrenciler, false)}
        </div>
      </div>

      {/* ARSIV CARD */}
      {!loading && ilisigiKesilenler.length > 0 && (
        <div className="glass-card !p-0 opacity-80 scale-[0.98] origin-top transition-all hover:scale-100 hover:opacity-100">
          <div className="px-8 py-4 border-b border-slate-50 bg-slate-900 text-white flex justify-between items-center rounded-t-2xl">
             <h2 className="text-sm font-bold uppercase tracking-widest">İlişiği Kesilenler Arşivi</h2>
             <span className="bg-white/20 px-2 py-0.5 rounded-md text-[10px]">{ilisigiKesilenler.length} Kayıt</span>
          </div>
          <div className="p-4 sm:p-8">
             {tabloyuOlustur(ilisigiKesilenler, true)}
          </div>
        </div>
      )}

      {/* MODERN MODAL */}
      {onayModali && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white max-w-sm w-full rounded-[32px] p-10 shadow-2xl animate-fade-in border border-white/20">
            <div className="w-20 h-20 bg-danger/10 text-danger rounded-full flex items-center justify-center text-4xl mx-auto mb-6">⚠️</div>
            <h3 className="text-2xl font-extrabold text-center text-slate-900 mb-4">Emin misiniz?</h3>
            <p className="text-slate-500 text-center leading-relaxed mb-10">
              <span className="font-bold text-slate-800">{onayModali.name}</span> isimli öğrencinin kurum ile ilişiği kesilecektir. Bu işlem geri alınamaz.
            </p>
            <div className="flex gap-4">
              <button onClick={() => setOnayModali(null)} className="btn-secondary flex-1">Vazgeç</button>
              <button onClick={ilisigiKes} className="btn-premium !bg-danger hover:!bg-danger-dark flex-1 shadow-danger/20">Evet, Onayla</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default YoneticiPuantaj;
