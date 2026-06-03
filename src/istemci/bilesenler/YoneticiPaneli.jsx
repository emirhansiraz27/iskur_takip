import React, { useState, useEffect } from 'react';
import api from '../api';
import { calculateDailyHours } from './OgrenciPlanlayici';

const DAYS_OF_WEEK = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
const TURKISH_DAY_ABBR = {
  'Pazartesi': 'PZT',
  'Salı': 'SAL',
  'Çarşamba': 'ÇAR',
  'Perşembe': 'PER',
  'Cuma': 'CUM'
};
const COURSE_SLOTS = [
  { id: 'S-1',  label: '08:30 - 09:15' },
  { id: 'S-2',  label: '09:25 - 10:10' },
  { id: 'S-3',  label: '10:20 - 11:05' },
  { id: 'S-4',  label: '11:15 - 12:00' },
  { id: 'S-5',  label: '13:00 - 13:45' },
  { id: 'S-6',  label: '13:55 - 14:40' },
  { id: 'S-7',  label: '14:50 - 15:35' },
  { id: 'S-8',  label: '15:45 - 16:30' },
  { id: 'S-9',  label: '17:00 - 17:45' },
  { id: 'S-10', label: '17:55 - 18:40' },
  { id: 'S-11', label: '18:50 - 19:35' },
  { id: 'S-12', label: '19:45 - 20:30' },
  { id: 'S-13', label: '20:40 - 21:25' },
  { id: 'S-14', label: '21:35 - 22:20' },
  { id: 'S-15', label: '22:30 - 23:15' }
];

function YoneticiPaneli({ user }) {
  const [department, setDepartment] = useState(null);
  const [planlar, setPlanlar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hata, setHata] = useState('');
  const [islemYapiliyor, setIslemYapiliyor] = useState(null);
  const [archiveFilter, setArchiveFilter] = useState('hepsi');
  const [seciliBelge, setSeciliBelge] = useState(null);

  const verileriCek = async () => {
    setLoading(true);
    try {
      const data = await api.get('/user/department');
      setDepartment(data.department);

      const planData = await api.get('/plan/manager');
      console.log('DEBUG: Manager plan data:', planData);
      if (planData.plans?.length > 0) {
        console.log('DEBUG: İlk plan satırı:', planData.plans[0]);
        console.log('DEBUG: course_schedule_matrix:', planData.plans[0].course_schedule_matrix);
      }
      setPlanlar(planData.plans || []);
    } catch (err) {
      setHata(err || 'Veriler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    verileriCek();
  }, [user.dept_id]);

  const onaylaVeyaReddet = async (ogrenciAdi, ogrenciPlanlari, durum) => {
    setIslemYapiliyor(ogrenciAdi);
    try {
      await api.post('/plan/manager/approve', {
        plan_id: ogrenciPlanlari[0].id,
        status: durum
      });
      verileriCek();
    } catch (err) {
      alert(err || 'İşlem başarısız oldu.');
    } finally {
      setIslemYapiliyor(null);
    }
  };

  if (loading && planlar.length === 0) return (
    <div className="flex flex-col justify-center items-center py-40">
      <div className="w-16 h-16 border-4 border-primary border-t-transparent animate-spin"></div>
      <p className="mt-6 text-slate-400 font-bold uppercase tracking-widest text-xs">Planlar Analiz Ediliyor...</p>
    </div>
  );

  if (hata) return <div className="glass-card text-danger text-center py-12 font-bold">{hata}</div>;

  const bekleyenPlanlar = planlar.filter(p => p.status === 'pending');
  const gruplanmisBekleyenler = bekleyenPlanlar.reduce((acc, plan) => {
    if (!acc[plan.student_name]) acc[plan.student_name] = [];
    acc[plan.student_name].push(plan);
    return acc;
  }, {});

  const digerPlanlar = planlar.filter(p => p.status !== 'pending');

  // Öğrencinin ders matrisini parse et
  const parseCourseMatrix = (raw) => {
    try {
      return typeof raw === 'string' ? JSON.parse(raw || '{}') : (raw || {});
    } catch { return {}; }
  };

  return (
    <div className="space-y-12">
      {/* ONAY BEKLEYENLER */}
      <section className="space-y-6">
        <div className="flex justify-between items-center px-4">
           <div>
             <h2 className="text-2xl font-extrabold text-slate-800">Onay Bekleyenler</h2>
             <p className="text-sm text-slate-400">Yeni gönderilen haftalık çalışma çizelgeleri.</p>
           </div>
           <span className="bg-primary/10 text-primary px-4 py-2 rounded-full font-bold text-sm">
             {Object.keys(gruplanmisBekleyenler).length} Bekleyen Grup
           </span>
        </div>

        {Object.keys(gruplanmisBekleyenler).length === 0 ? (
          <div className="p-20 text-center bg-white rounded-[32px] border-2 border-dashed border-slate-100">
            <div className="text-6xl mb-6 opacity-20">📭</div>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">İncelenecek yeni bir plan bulunmuyor.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8">
            {Object.keys(gruplanmisBekleyenler).map(ogrenciAdi => {
              const ogrenciPlanlari = gruplanmisBekleyenler[ogrenciAdi];
              const seciliSlotlar = {};
              let courseMatrix = {};
              ogrenciPlanlari.forEach(p => {
                try {
                  const slots = typeof p.hours === 'string' ? JSON.parse(p.hours || '[]') : (p.hours || []);
                  if (p.day) seciliSlotlar[p.day] = slots;
                  if (p.course_schedule_matrix) {
                    const m = parseCourseMatrix(p.course_schedule_matrix);
                    if (Object.keys(m).length) courseMatrix = m;
                  }
                } catch {}
              });

              return (
                <div key={ogrenciAdi} className="glass-card !p-0 overflow-hidden animate-fade-in">
                  <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm">👤</div>
                       <h3 className="text-xl font-bold text-slate-800">{ogrenciAdi}</h3>
                    </div>
                    <div className="flex gap-3">
                      {ogrenciPlanlari[0]?.course_schedule_file && (
                        <button
                          onClick={() => setSeciliBelge({
                            name: ogrenciAdi,
                            file: ogrenciPlanlari[0].course_schedule_file,
                            slots: seciliSlotlar,
                            matrix: courseMatrix
                          })}
                          className="btn-premium !bg-primary shadow-primary/20 !py-2 !text-sm flex items-center gap-2"
                        >
                          <span>📄</span>
                          <span>Programı Gör</span>
                        </button>
                      )}
                      <button
                        onClick={() => onaylaVeyaReddet(ogrenciAdi, ogrenciPlanlari, 'approved')}
                        disabled={islemYapiliyor === ogrenciAdi}
                        className="btn-premium !bg-success shadow-success/20 !py-2 !text-sm"
                      >
                        {islemYapiliyor === ogrenciAdi ? '...' : 'Hepsini Onayla'}
                      </button>
                      <button
                        onClick={() => onaylaVeyaReddet(ogrenciAdi, ogrenciPlanlari, 'rejected')}
                        disabled={islemYapiliyor === ogrenciAdi}
                        className="btn-premium !bg-danger shadow-danger/20 !py-2 !text-sm"
                      >
                        {islemYapiliyor === ogrenciAdi ? '...' : 'Hepsini Reddet'}
                      </button>
                    </div>
                  </div>

                  <div className="p-6 bg-white">
                    {Object.keys(courseMatrix).length === 0 && (
                      <div className="mb-4 p-3 bg-warning/10 border border-warning/20 rounded-xl text-[10px] font-bold text-warning">
                        ⚠️ Öğrencinin ders programı matrisi bulunamadı. Ders saatleri gösterilemiyor.
                      </div>
                    )}
                    <div className="grid grid-cols-6 gap-3 mb-4">
                      <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center py-3 bg-slate-50 border border-slate-100 rounded-2xl">Saat</div>
                      {DAYS_OF_WEEK.map(gun => (
                        <div key={gun} className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center py-3 bg-slate-50 border border-slate-100 rounded-2xl">
                          {TURKISH_DAY_ABBR[gun]}
                        </div>
                      ))}
                    </div>

                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {COURSE_SLOTS.map(slot => (
                        <div key={slot.id} className="grid grid-cols-6 gap-3">
                          <div className="flex items-center justify-center bg-slate-50 border border-slate-100 rounded-2xl text-[9px] font-black text-slate-500 py-2">
                            {slot.label}
                          </div>
                          {DAYS_OF_WEEK.map(gun => {
                            const dersVar = courseMatrix?.[gun]?.[slot.id] === true;
                            const seciliMi = seciliSlotlar[gun]?.includes(slot.id);

                            if (dersVar) {
                              return (
                                <div 
                                  key={`${gun}-${slot.id}`} 
                                  className="h-10 rounded-xl bg-danger border border-danger/30 shadow-sm select-none flex items-center justify-center text-white font-black text-[9px] uppercase tracking-widest"
                                  title="Ders Var (Müsait Değil)"
                                >
                                  Ders
                                </div>
                              );
                            }

                            return (
                              <div
                                key={`${gun}-${slot.id}`}
                                className={`h-10 rounded-xl flex items-center justify-center text-[9px] font-black border shadow-sm transition-all duration-200 ${
                                  seciliMi
                                    ? 'bg-primary text-white border-primary shadow-md shadow-primary/20 scale-[1.02]'
                                    : 'bg-slate-50/50 border-slate-100 text-slate-200'
                                }`}
                              >
                                {seciliMi ? 'Mesai' : ''}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex gap-6 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-danger"></div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Ders (Müsait Değil)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-primary"></div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Seçili</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ONAYLANMIŞ GENEL ÇİZELGE */}
      <section className="glass-card !p-0 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
          <h2 className="text-xl font-extrabold text-slate-800">Haftalık Genel Çizelge</h2>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Onaylanmış Aktif Planlar</span>
        </div>

        <div className="p-8">
          {planlar.filter(p => p.status === 'approved').length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-bold uppercase text-[10px] italic tracking-[0.2em]">Henüz onaylı bir plan bulunmuyor.</div>
          ) : (
            <div className="table-shell custom-scrollbar">
              <table className="modern-table table-fixed min-w-[860px]">
                <thead>
                  <tr>
                    <th className="w-[220px] sticky left-0 bg-white/90 backdrop-blur-sm z-10">Öğrenci Adı</th>
                    {DAYS_OF_WEEK.map(gun => (
                      <th key={gun} className="w-[128px] text-center">{gun}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from(new Set(planlar.filter(p => p.status === 'approved').map(p => p.student_name))).map(name => {
                    const sPlans = planlar.filter(p => p.student_name === name && p.status === 'approved');
                    const pMap = {};
                    sPlans.forEach(p => {
                      try {
                        const slots = typeof p.hours === 'string' ? JSON.parse(p.hours || '[]') : (p.hours || []);
                        pMap[p.day] = calculateDailyHours(slots);
                      } catch {}
                    });

                    return (
                      <tr key={name} className="group">
                        <td className="font-bold text-slate-800 sticky left-0 bg-white group-hover:bg-slate-50 z-10">
                          <span className="block truncate">{name}</span>
                        </td>
                        {DAYS_OF_WEEK.map(gun => (
                          <td key={gun} className="p-2">
                            <div className={`h-11 rounded-2xl flex items-center justify-center text-[10px] font-black border transition-all ${pMap[gun] ? 'bg-success text-white border-success shadow-sm' : 'bg-white border-slate-100 text-slate-200'}`}>
                              {pMap[gun] ? `${pMap[gun]} SAAT` : ''}
                            </div>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ARŞİV */}
      <section className="glass-card !p-0 overflow-hidden opacity-95 shadow-2xl shadow-slate-200/50 animate-scale-in">
        <div className="px-8 py-6 bg-slate-900 border-b border-slate-800 flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-8">
           <div className="flex flex-col lg:flex-row lg:items-center gap-8 lg:gap-16 w-full xl:w-auto">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-2xl shadow-inner border border-white/5">📚</div>
                <div className="flex flex-col">
                  <span className="text-sm font-black text-white uppercase tracking-[0.22em]">Geçmiş Plan Kayıtları</span>
                </div>
             </div>

             <div className="flex flex-col sm:flex-row gap-2 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 w-full lg:w-auto">
               {[
                 { id: 'hepsi', label: 'TÜMÜ', icon: '💎', color: 'text-primary border-primary/40' },
                 { id: 'approved', label: 'ONAYLI', icon: '✅', color: 'text-emerald-300 border-emerald-500/40' },
                 { id: 'rejected', label: 'REDDEDİLEN', icon: '❌', color: 'text-rose-300 border-rose-500/40' }
               ].map(f => (
                 <button
                   key={f.id}
                   onClick={() => setArchiveFilter(f.id)}
                   className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase border transition-all duration-300 ${
                     archiveFilter === f.id
                       ? `bg-slate-900 ${f.color}`
                       : 'bg-slate-900 border-slate-800 text-white/40 hover:text-white/70 hover:border-slate-700'
                   }`}
                 >
                   <span className="text-xs">{f.icon}</span>
                   <span className="tracking-widest">{f.label}</span>
                 </button>
               ))}
             </div>
           </div>

           <div className="flex items-center gap-4 bg-white/5 px-4 py-2 rounded-2xl border border-white/5">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
              <span className="text-[10px] font-bold text-white/60 tracking-widest uppercase">
                {digerPlanlar.length} Toplam Kayıt
              </span>
           </div>
        </div>
        <div className="p-8 bg-white">
          <div className="table-shell max-h-[500px] custom-scrollbar border border-slate-100 rounded-[24px]">
            <table className="modern-table !text-sm">
              <thead className="sticky top-0 z-10 bg-white/95 backdrop-blur-md">
                <tr>
                  <th>Öğrenci</th>
                  <th>Grup / Detay</th>
                  <th className="text-right">Durum</th>
                </tr>
              </thead>
              <tbody>
                {digerPlanlar.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">Arşiv henüz boş.</td>
                  </tr>
                ) : (
                  Object.values(digerPlanlar
                    .filter(p => archiveFilter === 'hepsi' || p.status === archiveFilter)
                    .reduce((acc, plan) => {
                      const key = `${plan.student_name}-${plan.status}`;
                      if (!acc[key]) acc[key] = { name: plan.student_name, status: plan.status, days: new Set() };
                      acc[key].days.add(plan.day);
                      return acc;
                    }, {})).map((grup, idx) => (
                    <tr key={idx}>
                      <td className="font-bold text-slate-800">{grup.name}</td>
                      <td>
                        <span className="inline-flex items-center gap-2 bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-[11px] font-bold">
                           <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
                           {Array.from(grup.days).join(', ')}
                        </span>
                      </td>
                      <td className="text-right">
                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-[11px] font-bold ${
                          grup.status === 'approved' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${grup.status === 'approved' ? 'bg-success' : 'bg-danger'}`}></span>
                          {grup.status === 'approved' ? 'ONAYLANDI' : 'REDDEDİLDİ'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* PROGRAMI GÖR MODAL */}
      {seciliBelge && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-xl" onClick={() => setSeciliBelge(null)}></div>
          <div className="relative bg-white w-full h-full flex flex-col shadow-2xl animate-scale-in">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-bold text-slate-800">{seciliBelge.name} - Ders Programı</h3>
                <p className="text-xs text-slate-400 font-medium">Öğrenci tarafından yüklenen resmi belge.</p>
              </div>
              <button
                onClick={() => setSeciliBelge(null)}
                className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center hover:bg-slate-50 transition-all shadow-sm hover:rotate-90 active:scale-95"
              >
                <span className="text-xl">✕</span>
              </button>
            </div>

            <div className="flex-1 flex flex-col xl:flex-row overflow-hidden bg-slate-50">
              {/* SOL KOLON: PLAN TABLOSU */}
              <div className="w-full xl:w-[45%] bg-white border-r border-slate-100 overflow-y-auto p-8 custom-scrollbar">
                <div className="mb-6">
                  <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2 flex items-center gap-3">
                    <span className="w-8 h-[1px] bg-primary/20"></span>
                    Öğrenci Çalışma Planı
                  </h4>
                  <p className="text-xs text-slate-400">Öğrencinin talep ettiği mesai saatleri aşağıda işaretlenmiştir.</p>
                </div>

                <div className="border border-slate-100 rounded-[24px] overflow-hidden shadow-sm bg-slate-50/30 p-4">
                  <div className="grid grid-cols-6 gap-2">
                    <div className="text-[9px] font-black text-slate-400 uppercase text-center py-2 bg-white border border-slate-100 rounded-lg">SAAT</div>
                    {DAYS_OF_WEEK.map(gun => (
                      <div key={gun} className="text-[9px] font-black text-slate-400 uppercase text-center py-2 bg-white border border-slate-100 rounded-lg">{TURKISH_DAY_ABBR[gun]}</div>
                    ))}
                  </div>
                  <div className="mt-2 space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                    {COURSE_SLOTS.map(slot => (
                      <div key={slot.id} className="grid grid-cols-6 gap-2">
                        <div className="flex items-center justify-center bg-white border border-slate-100 rounded-lg text-[8px] font-bold text-slate-500 py-1">
                          {slot.label}
                        </div>
                        {DAYS_OF_WEEK.map(gun => {
                          const dersVar = seciliBelge.matrix?.[gun]?.[slot.id] === true;
                          const seciliMi = seciliBelge.slots[gun]?.includes(slot.id);

                          if (dersVar) {
                            return (
                              <div 
                                key={`${gun}-${slot.id}`} 
                                className="h-8 rounded-lg bg-danger border border-danger/30 shadow-sm"
                                title="Ders Var (Müsait Değil)"
                              />
                            );
                          }

                          return (
                            <div
                              key={`${gun}-${slot.id}`}
                              className={`h-8 rounded-lg flex items-center justify-center text-[8px] font-black border transition-all duration-200 ${
                                seciliMi
                                  ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
                                  : 'bg-white border-slate-50 text-slate-200'
                              }`}
                            >
                              {seciliMi ? 'Mesai' : ''}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 grid grid-cols-3 gap-4">
                  {DAYS_OF_WEEK.map(gun => {
                    const dayHours = calculateDailyHours(seciliBelge.slots[gun]);
                    if (dayHours === 0) return null;
                    return (
                      <div key={gun} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col items-center">
                        <span className="text-[9px] font-black text-slate-400 uppercase mb-1">{gun}</span>
                        <span className="text-sm font-black text-slate-800">{dayHours.toFixed(1)} Saat</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SAĞ KOLON: BELGE GÖRÜNTÜLEME */}
              <div className="flex-1 overflow-auto p-8 flex justify-center items-start bg-slate-900/5">
                {seciliBelge.file.startsWith('data:application/pdf') ? (
                  <iframe
                    src={seciliBelge.file}
                    className="w-full h-full rounded-2xl shadow-2xl bg-white border border-slate-200"
                    title="Ders Programı PDF"
                  />
                ) : (
                  <div className="min-h-full flex items-center justify-center py-10">
                    <img
                      src={seciliBelge.file}
                      alt="Ders Programı"
                      className="max-w-full h-auto rounded-2xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] border-[12px] border-white"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="px-8 py-6 border-t border-slate-100 flex justify-between items-center bg-white">
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-danger"></div>
                  <span className="text-[10px] font-black text-slate-400 uppercase">Ders</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary"></div>
                  <span className="text-[10px] font-black text-slate-400 uppercase">Mesai</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-slate-100"></div>
                  <span className="text-[10px] font-black text-slate-400 uppercase">Boş</span>
                </div>
              </div>
              <button
                onClick={() => setSeciliBelge(null)}
                className="btn-premium !bg-slate-900 !py-4 !px-12 text-sm uppercase tracking-widest shadow-xl"
              >
                İncelemeyi Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default YoneticiPaneli;
