import React, { useState, useEffect } from 'react';
import api from '../api';

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

const SLOT_TIMES = {
  'S-1':  { start: 510,  end: 555 },  // 08:30 - 09:15
  'S-2':  { start: 565,  end: 610 },  // 09:25 - 10:10
  'S-3':  { start: 620,  end: 665 },  // 10:20 - 11:05
  'S-4':  { start: 675,  end: 720 },  // 11:15 - 12:00
  'S-5':  { start: 780,  end: 825 },  // 13:00 - 13:45
  'S-6':  { start: 835,  end: 880 },  // 13:55 - 14:40
  'S-7':  { start: 890,  end: 935 },  // 14:50 - 15:35
  'S-8':  { start: 945,  end: 990 },  // 15:45 - 16:30
  'S-9':  { start: 1020, end: 1065 }, // 17:00 - 17:45
  'S-10': { start: 1075, end: 1120 }, // 17:55 - 18:40
  'S-11': { start: 1130, end: 1175 }, // 18:50 - 19:35
  'S-12': { start: 1185, end: 1230 }, // 19:45 - 20:30
  'S-13': { start: 1240, end: 1285 }, // 20:40 - 21:25
  'S-14': { start: 1295, end: 1340 }, // 21:35 - 22:20
  'S-15': { start: 1350, end: 1395 }  // 22:30 - 23:15
};

export function calculateDailyHours(selectedSlots) {
  if (!selectedSlots || selectedSlots.length === 0) return 0;
  return selectedSlots.length * 0.9375;
}

const timeToMinutes = (timeStr) => {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

const HAFTALIK_GUN_LIMITI = 3;
const TOPLAM_SAAT_LIMITI = 22.5;

function OgrenciPlanlayici({ user }) {
  const [department, setDepartment] = useState(null);
  const [seciliSlotlar, setSeciliSlotlar] = useState({});
  const [mevcutPlanlar, setMevcutPlanlar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hata, setHata] = useState('');
  const [islemYapiliyor, setIslemYapiliyor] = useState(false);
  const [courseMatrix, setCourseMatrix] = useState({});

  useEffect(() => {
    const verileriCek = async () => {
      try {
        const [deptData, planData, profileData] = await Promise.all([
          api.get('/user/department'),
          api.get('/plan/student'),
          api.get('/profile')
        ]);

        setDepartment(deptData.department);
        setMevcutPlanlar(planData.plans || []);

        let matrix = {};
        try {
          const raw = profileData.user?.course_schedule_matrix;
          matrix = typeof raw === 'string'
            ? JSON.parse(raw || '{}')
            : (raw || {});
        } catch { matrix = {}; }
        setCourseMatrix(matrix);

        const initialSecili = {};
        (planData.plans || [])
          .filter(p => p.status === 'approved' || p.status === 'pending')
          .forEach(p => {
            try {
              const slots = typeof p.hours === 'string' ? JSON.parse(p.hours || '[]') : (p.hours || []);
              if (p.day) {
                const open = timeToMinutes(deptData.department?.open_time);
                const close = timeToMinutes(deptData.department?.close_time);
                initialSecili[p.day] = slots.filter(slotId => {
                  const time = SLOT_TIMES[slotId];
                  return time && (open === null || close === null || (time.start >= open && time.end <= close));
                });
              }
            } catch {}
          });
        setSeciliSlotlar(initialSecili);
      } catch (err) {
        setHata('Veriler yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };

    verileriCek();
  }, []);

  const isSlotAvailable = (day, slotId) => {
    return courseMatrix?.[day]?.[slotId] !== true;
  };

  const isSlotBlockedByEveningRule = (day, slotId) => {
    const time = SLOT_TIMES[slotId];
    if (!time) return false;
    const isAfter18 = time.start >= 1080; // 18:00
    if (!isAfter18) return false;

    // 18:00 sonrası slotlar SADECE o günde akşam dersi VARSA kapatılır
    // (öğrenci o saatte derse giriyor demek). Akşam dersi yoksa birim
    // saatleri içinde olduğu sürece seçilebilir.
    const hasEveningClasses = ['S-9', 'S-10', 'S-11', 'S-12', 'S-13', 'S-14', 'S-15'].some(
      sId => courseMatrix?.[day]?.[sId] === true
    );
    // Akşam DERS varsa → o slotu kapat (çakışma var)
    return hasEveningClasses;
  };

  const isSlotInDeptHours = (slotId) => {
    if (!department) return true;
    const open = timeToMinutes(department.open_time);
    const close = timeToMinutes(department.close_time);
    const time = SLOT_TIMES[slotId];
    if (!time) return false;
    return open === null || close === null || (time.start >= open && time.end <= close);
  };

  const isDaySelectable = (day) => {
    if (!department) return true;
    const open = timeToMinutes(department.open_time);
    const close = timeToMinutes(department.close_time);

    const freeSlots = COURSE_SLOTS.filter(slot => {
      const time = SLOT_TIMES[slot.id];
      if (!time) return false;
      const inHours = open === null || close === null || (time.start >= open && time.end <= close);
      const isFree = courseMatrix?.[day]?.[slot.id] !== true;
      // Akşam kuralı: o slotta gerçekten ders varsa dışla
      const blockedByEvening = isSlotBlockedByEveningRule(day, slot.id);
      return inHours && isFree && !blockedByEvening;
    }).map(s => s.id);

    const maxHours = calculateDailyHours(freeSlots);
    return maxHours >= 7.5;
  };

  const slotDegistir = (gun, slotId) => {
    if (!isDaySelectable(gun)) return;
    if (!isSlotInDeptHours(slotId)) return;
    if (isSlotBlockedByEveningRule(gun, slotId)) return;
    const yeniSecili = { ...seciliSlotlar };
    if (!yeniSecili[gun]) yeniSecili[gun] = [];

    if (yeniSecili[gun].includes(slotId)) {
      yeniSecili[gun] = yeniSecili[gun].filter(s => s !== slotId);
      if (yeniSecili[gun].length === 0) delete yeniSecili[gun];
    } else {
      const seciliGunSayisi = Object.keys(yeniSecili).filter(g => yeniSecili[g].length > 0).length;

      const testSlots = [...yeniSecili[gun], slotId];
      const testHours = calculateDailyHours(testSlots);

      if (!yeniSecili[gun].length && seciliGunSayisi >= HAFTALIK_GUN_LIMITI) return;
      if (testHours > 7.5) return;

      const newSeciliSlotlar = { ...yeniSecili, [gun]: testSlots };
      const totalHours = Object.values(newSeciliSlotlar).reduce((sum, s) => sum + calculateDailyHours(s), 0);
      if (totalHours > TOPLAM_SAAT_LIMITI) return;

      yeniSecili[gun] = testSlots;
    }
    setSeciliSlotlar(yeniSecili);
  };

  const secimleriTemizle = () => {
    if (window.confirm('Tüm seçimlerinizi temizlemek istediğinize emin misiniz?')) {
      setSeciliSlotlar({});
    }
  };

  const planiKaydet = async () => {
    const toplamSaat = Object.values(seciliSlotlar).reduce((sum, s) => sum + calculateDailyHours(s), 0);

    if (toplamSaat === 0) {
      setHata('Lütfen en az bir çalışma saati seçin.');
      return;
    }
    const gunSayisi = Object.keys(seciliSlotlar).filter(g => seciliSlotlar[g].length > 0).length;
    const herGunTam75 = Object.values(seciliSlotlar).every(slots => slots.length === 0 || calculateDailyHours(slots) === 7.5);
    if (!herGunTam75) {
      setHata('Seçtiğiniz her gün tam olarak 7.5 saat olmalıdır. Eksik veya fazla slot seçemezsiniz.');
      return;
    }
    if (![7.5, 15.0, 22.5].includes(toplamSaat)) {
      setHata('Toplam çalışma saati 7.5, 15 veya 22.5 saat olabilir. Başka miktar seçemezsiniz.');
      return;
    }
    if (gunSayisi > HAFTALIK_GUN_LIMITI) {
      setHata(`En fazla ${HAFTALIK_GUN_LIMITI} gün seçebilirsiniz.`);
      return;
    }

    setIslemYapiliyor(true);
    setHata('');
    try {
      const planData = Object.entries(seciliSlotlar)
        .filter(([_, slots]) => slots.length > 0)
        .map(([day, slots]) => ({ day, slots }));

      await api.post('/plan/student', { plan_data: planData });
      window.location.reload();
    } catch (err) {
      setHata(err || 'Plan kaydedilirken bir hata oluştu.');
    } finally {
      setIslemYapiliyor(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center py-40">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent animate-spin"></div>
    </div>
  );

  const toplamSeciliSaat = Object.values(seciliSlotlar).reduce((sum, slots) => sum + calculateDailyHours(slots), 0);
  const toplamSeciliGun  = Object.keys(seciliSlotlar).filter(g => seciliSlotlar[g].length > 0).length;
  const herGunTam75 = Object.values(seciliSlotlar).every(slots => slots.length === 0 || calculateDailyHours(slots) === 7.5);
  const toplamUygun = [7.5, 15.0, 22.5].includes(toplamSeciliSaat);
  const bekleyenPlanVarmi = mevcutPlanlar.some(p => p.status === 'pending');
  const onayliPlanVarmi   = mevcutPlanlar.some(p => p.status === 'approved');
  const onayaGonderilebilir = toplamUygun && herGunTam75 && !bekleyenPlanVarmi && !onayliPlanVarmi;

  const onayliHucreMi = (gun, slotId) => mevcutPlanlar.some(p =>
    (p.status || '').trim() === 'approved' &&
    (p.day || '').trim() === gun &&
    (() => { try { const s = typeof p.hours === 'string' ? JSON.parse(p.hours || '[]') : (p.hours || []); return s.includes(slotId); } catch { return false; } })()
  );

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* INFO CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center text-2xl mb-4">🏫</div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Birim Saatleri</h4>
          <p className="text-lg font-extrabold text-slate-800">{department?.open_time || '??:??'} - {department?.close_time || '??:??'}</p>
        </div>
        <div className={`glass-card flex flex-col items-center text-center border-2 ${toplamSeciliGun === HAFTALIK_GUN_LIMITI ? 'border-primary shadow-lg shadow-primary/10' : 'border-transparent'}`}>
          <div className="w-12 h-12 bg-accent/10 text-accent rounded-2xl flex items-center justify-center text-2xl mb-4">📅</div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Seçilen Gün</h4>
          <p className="text-lg font-extrabold text-slate-800">{toplamSeciliGun} / {HAFTALIK_GUN_LIMITI} Gün</p>
        </div>
        <div className={`glass-card flex flex-col items-center text-center border-2 ${toplamSeciliSaat === TOPLAM_SAAT_LIMITI ? 'border-success shadow-lg shadow-success/10' : 'border-transparent'}`}>
          <div className="w-12 h-12 bg-success/10 text-success rounded-2xl flex items-center justify-center text-2xl mb-4">⏱️</div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Toplam Saat</h4>
          <p className="text-lg font-extrabold text-slate-800">{toplamSeciliSaat.toFixed(1)} / 22.5 Saat</p>
        </div>
      </div>

      {hata && (
        <div className="rounded-2xl bg-danger/10 border border-danger/20 p-4 text-sm text-danger font-bold">
          {hata}
        </div>
      )}

      {/* PLANNER WINDOW */}
      <div className="glass-card !p-0 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/70 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-800">Planlama Cetveli</h2>
            <p className="text-xs text-slate-400 font-medium">
              Ders programınıza göre müsait olduğunuz zamanları seçin. Gri alanlar ders saatinizi gösterir.
            </p>
          </div>
          {bekleyenPlanVarmi && (
            <span className="bg-warning text-white px-3 py-1 rounded-full text-[10px] font-bold animate-pulse">ONAY BEKLEYEN KAYIT VAR</span>
          )}
          {!bekleyenPlanVarmi && onayliPlanVarmi && (
            <span className="bg-success text-white px-3 py-1 rounded-full text-[10px] font-bold">ONAYLI PLAN AKTİF</span>
          )}
        </div>

        <div className="p-6 bg-white">
          <div className="grid grid-cols-6 gap-3 mb-4">
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center py-3 bg-slate-50 border border-slate-100 rounded-2xl">Saat</div>
            {DAYS_OF_WEEK.map(gun => {
              const selectable = isDaySelectable(gun);
              return (
                <div 
                  key={gun} 
                  className={`text-[10px] font-black uppercase tracking-widest text-center py-2 bg-slate-50 border rounded-2xl flex flex-col justify-center items-center ${
                    selectable ? 'text-slate-500 border-slate-100' : 'text-danger/60 border-danger/20 bg-danger/5'
                  }`}
                >
                  <span>{TURKISH_DAY_ABBR[gun]}</span>
                  {!selectable && <span className="text-[8px] font-bold text-danger lowercase mt-0.5">(yetersiz saat)</span>}
                </div>
              );
            })}
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {COURSE_SLOTS.map(slot => (
              <div key={slot.id} className="grid grid-cols-6 gap-3 group">
                <div className="flex items-center justify-center bg-slate-50 border border-slate-100 rounded-2xl text-[9px] font-black text-slate-500 group-hover:bg-slate-100 transition-colors py-2">
                  {slot.label}
                </div>
                {DAYS_OF_WEEK.map(gun => {
                  const selectable = isDaySelectable(gun);
                  const musait = isSlotAvailable(gun, slot.id);
                  const seciliMi = seciliSlotlar[gun]?.includes(slot.id);
                  const onayliMi = onayliHucreMi(gun, slot.id);
                  const inDeptHours = isSlotInDeptHours(slot.id);

                  const blockedByEveningRule = isSlotBlockedByEveningRule(gun, slot.id);

                  if (!musait) {
                    return (
                      <div 
                        key={`${gun}-${slot.id}`} 
                        className="h-12 rounded-2xl bg-danger border border-danger/30 shadow-sm select-none flex items-center justify-center text-white font-black text-[9px] uppercase tracking-widest"
                        title="Ders Var (Müsait Değil)"
                      >
                        Ders
                      </div>
                    );
                  }

                  if (!inDeptHours || blockedByEveningRule) {
                    return (
                      <div 
                        key={`${gun}-${slot.id}`} 
                        className="h-12 rounded-2xl bg-slate-100 border border-slate-200/40 select-none flex items-center justify-center text-slate-400 font-extrabold text-[8px] uppercase tracking-wider text-center"
                        title={blockedByEveningRule ? "Akşam dersi olmayan günlerde 18:00 sonrası çalışılamaz." : "Birim Kapalı"}
                      >
                        Kapalı
                      </div>
                    );
                  }

                  if (!selectable) {
                    return (
                      <div 
                        key={`${gun}-${slot.id}`} 
                        className="h-12 rounded-2xl bg-slate-100/50 border border-slate-200/30 select-none flex items-center justify-center text-slate-400 font-extrabold text-[8px] uppercase tracking-wider text-center"
                        title="Bu gün için ders programınız 7.5 saatlik çalışmaya izin vermiyor."
                      >
                        Yetersiz Süre
                      </div>
                    );
                  }

                  return (
                    <div
                      key={`${gun}-${slot.id}`}
                      role="button"
                      tabIndex={onayliMi || onayliPlanVarmi ? -1 : 0}
                      onClick={() => !onayliMi && !onayliPlanVarmi && slotDegistir(gun, slot.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          !onayliMi && !onayliPlanVarmi && slotDegistir(gun, slot.id);
                        }
                      }}
                      className={`h-12 rounded-2xl transition-all flex items-center justify-center font-black text-[9px] border shadow-sm select-none ${
                        onayliMi
                          ? 'bg-success text-white border-success shadow-md shadow-success/20'
                          : seciliMi
                            ? 'bg-primary text-white border-primary shadow-md shadow-primary/20 scale-[1.02]'
                            : onayliPlanVarmi
                              ? 'bg-slate-50/50 border-slate-100 text-transparent cursor-not-allowed opacity-40'
                              : 'bg-white border-slate-100 hover:border-primary/50 hover:bg-primary/5 text-transparent cursor-pointer'
                      }`}
                    >
                      {onayliMi ? 'Onaylı' : seciliMi ? 'Mesai' : ''}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {!onayliPlanVarmi && (
          <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex gap-6 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-danger"></div>
                <span className="text-[10px] font-bold text-slate-500 uppercase">Ders (Müsait Değil)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary"></div>
                <span className="text-[10px] font-bold text-slate-500 uppercase">Seçili</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-success"></div>
                <span className="text-[10px] font-bold text-slate-500 uppercase">Onaylanmış</span>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-3">
                {Object.keys(seciliSlotlar).length > 0 && (
                  <button
                    onClick={secimleriTemizle}
                    className="px-6 py-4 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-sm font-bold transition-all"
                  >
                    Seçimleri Temizle
                  </button>
                )}
                <button
                  onClick={planiKaydet}
                  disabled={islemYapiliyor || !onayaGonderilebilir}
                  className="btn-premium !px-12 !py-4 text-lg shadow-primary/30 disabled:opacity-30 disabled:grayscale"
                >
                  {islemYapiliyor ? 'Gönderiliyor...' : 'PLANI ONAYA GÖNDER'}
                </button>
              </div>
              {!onayaGonderilebilir && toplamSeciliSaat > 0 && !bekleyenPlanVarmi && (
                <p className="text-[10px] font-bold text-danger uppercase tracking-widest text-center">
                  Her seçilen gün tam 7.5 saat olmalıdır
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {bekleyenPlanVarmi && (
        <div className="p-6 bg-warning/10 border border-warning/20 rounded-3xl flex items-center gap-6 animate-fade-in">
          <div className="text-3xl">⚠️</div>
          <div>
            <h4 className="text-warning font-bold uppercase tracking-widest text-xs mb-1">Bilgilendirme</h4>
            <p className="text-slate-600 text-sm font-medium">Henüz onaylanmamış bir planınız bulunmaktadır. Mevcut plan onaylanmadan veya reddedilmeden yeni bir plan gönderemezsiniz.</p>
          </div>
        </div>
      )}
      {!bekleyenPlanVarmi && onayliPlanVarmi && (
        <div className="p-6 bg-success/10 border border-success/20 rounded-3xl flex items-center gap-6 animate-fade-in">
          <div className="text-3xl">✓</div>
          <div>
            <h4 className="text-success font-bold uppercase tracking-widest text-xs mb-1">Onaylı Plan Aktif</h4>
            <p className="text-slate-600 text-sm font-medium">Onaylanmış çalışma planınız aktif olduğu için aynı planı tekrar onaya göndermenize gerek yoktur.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default OgrenciPlanlayici;
