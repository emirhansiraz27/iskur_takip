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

function OgrenciPuantaj({ user }) {
  const [seciliAy, setSeciliAy] = useState(new Date().getMonth() + 1);
  const [seciliYil, setSeciliYil] = useState(new Date().getFullYear());
  const [veri, setVeri] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    puantajiGetir();
  }, [seciliAy, seciliYil]);

  const puantajiGetir = async () => {
    setLoading(true);
    try {
      const data = await api.get('/timesheet/student', {
        params: { year: seciliYil, month: seciliAy }
      });
      setVeri(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const gunRengiGetir = (durum) => {
    switch (durum) {
      case 'attended': return 'bg-emerald-500 border-emerald-700 text-white shadow-inner';
      case 'absent': return 'bg-rose-600 border-rose-800 text-white shadow-inner';
      case 'planned': return 'bg-white border-classic-dark/30 text-classic-blue border-dashed border-2';
      default: return 'bg-classic-gray/50 border-classic-dark/10 text-slate-400 opacity-30';
    }
  };

  return (
    <div className="space-y-6">
      {/* EARNINGS WINDOW */}
      <div className="glass-card !p-0 overflow-hidden">
        <div className="px-8 py-6 bg-slate-50/70 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-800">Aylık Katılım ve Hakediş</h2>
            <p className="text-xs text-slate-400 font-semibold">Seçili dönem için devam ve hakediş özeti.</p>
          </div>
           <div className="flex flex-col gap-2">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dönem Seçimi</label>
             <select 
               value={`${seciliAy}-${seciliYil}`}
               onChange={(e) => {
                 const [m, y] = e.target.value.split('-').map(Number);
                 setSeciliAy(m);
                 setSeciliYil(y);
               }}
               className="w-52 h-12 px-4 bg-white border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:border-primary"
             >
               {AYLAR.map(m => (
                 <option key={`${m.value}-${m.year}`} value={`${m.value}-${m.year}`}>{m.label}</option>
               ))}
             </select>
           </div>

        </div>
        {veri && (
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-3xl border border-success/20 bg-success/10 p-5 text-center">
              <span className="text-[10px] font-black text-success uppercase tracking-widest">Gelinen Gün</span>
              <div className="text-3xl font-black text-success mt-2">{veri.total_attended_month} Gün</div>
            </div>
            <div className="rounded-3xl border border-danger/20 bg-danger/10 p-5 text-center">
              <span className="text-[10px] font-black text-danger uppercase tracking-widest">Devamsızlık Yapılan Gün</span>
              <div className="text-3xl font-black text-danger mt-2">{veri.total_absent_month} Gün</div>
            </div>
            <div className="rounded-3xl border border-[#ffc601]/40 bg-[#ffc601] text-slate-900 p-5 text-center shadow-lg shadow-yellow-500/20">
              <span className="text-[10px] font-black text-slate-900/70 uppercase tracking-widest">Tahmini Hakediş</span>
              <div className="text-3xl font-black mt-2">{(veri.monthly_earnings || 0).toLocaleString('tr-TR')} TL</div>
            </div>
          </div>
        )}
      </div>

      {/* CALENDAR WINDOW */}
      <div className="glass-card !p-0 overflow-hidden">
        <div className="px-8 py-6 bg-slate-50/70 border-b border-slate-100">
          <h2 className="text-xl font-extrabold text-slate-800">Katılım Takvimi</h2>
          <p className="text-xs text-slate-400 font-semibold">{TR_AYLAR[seciliAy - 1]} {seciliYil}</p>
        </div>
        <div className="bg-white p-6">
          {loading || !veri ? (
            <div className="py-20 text-center flex flex-col items-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent animate-spin mb-4"></div>
              <p className="text-slate-400 font-bold uppercase text-[10px]">VERİLER ALINIYOR...</p>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-7 gap-2 mb-2">
                {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Pzr'].map(day => (
                  <div key={day} className="text-[9px] font-black text-slate-500 uppercase tracking-widest text-center py-2 bg-slate-50 border border-slate-100 rounded-xl">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {(() => {
                  const ilkGun = new Date(seciliYil, seciliAy - 1, 1).getDay();
                  const boslukSayisi = (ilkGun + 6) % 7; 
                  const hucreler = [];
                  
                  for (let i = 0; i < boslukSayisi; i++) {
                    hucreler.push(<div key={`bosluk-${i}`} className="aspect-square bg-slate-50/30 border border-slate-100 rounded-2xl opacity-40"></div>);
                  }
                  
                    veri?.days?.forEach((d, i) => {
                      const status = d.status;
                      const bgClass = status === 'attended' ? 'bg-emerald-500 text-white' : 
                                      status === 'absent' ? 'bg-rose-500 text-white' : 
                                      status === 'holiday' ? 'bg-[#00305D] text-white' :
                                      status === 'planned' ? 'bg-primary/10 text-primary' : 'bg-slate-50 text-slate-400';
                      hucreler.push(
                        <div key={`gun-${i}`} className={`aspect-square flex flex-col items-center justify-center border border-slate-100 rounded-2xl relative ${bgClass}`}>
                          <span className="text-lg font-bold">{d.day}</span>
                          <div className="absolute bottom-1 text-[7px] font-bold opacity-70 uppercase text-center px-1">
                            {status === 'attended' ? 'VAR' : status === 'absent' ? 'YOK' : status === 'holiday' ? 'TATİL' : ''}
                          </div>
                        </div>
                      );
                    });
                  return hucreler;
                })()}
              </div>
            </div>
          )}
          <div className="mt-6 p-3 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-bold text-slate-400 uppercase text-center">
            Hafta sonları ve resmi tatiller puantaj hesaplamasına dahil edilmez.
          </div>
        </div>
      </div>
    </div>
  );
}

export default OgrenciPuantaj;
