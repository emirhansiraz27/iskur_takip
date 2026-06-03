import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../../api';

const DAYS_OF_WEEK = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
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

const timeToMinutes = (time) => {
  if (!time) return null;
  const [hours, minutes] = time.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
};

const getSlotRange = (slot) => {
  const [start, end] = slot.label.split(' - ');
  return {
    start: timeToMinutes(start),
    end: timeToMinutes(end)
  };
};

const parseCourseScheduleMatrix = (matrixValue) => {
  try {
    return typeof matrixValue === 'string'
      ? JSON.parse(matrixValue || '{}')
      : (matrixValue || {});
  } catch {
    return {};
  }
};

const getAvailableSlotsForDepartment = (department, courseScheduleMatrix) => {
  const open = timeToMinutes(department.open_time);
  const close = timeToMinutes(department.close_time);

  return DAYS_OF_WEEK.flatMap(day => COURSE_SLOTS.filter(slot => {
    const range = getSlotRange(slot);
    const inDepartmentHours = open === null || close === null || (range.start >= open && range.end <= close);
    return inDepartmentHours && courseScheduleMatrix?.[day]?.[slot.id] === false;
  }).map(slot => ({ day, slotId: slot.id, label: slot.label })));
};

function OgrenciYonetimiAdmin({ initialFilter = 'all', onClearFilter }) {
  const [activeSubTab, setActiveSubTab] = useState('students'); // 'queue' or 'students'
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedUserForDocs, setSelectedUserForDocs] = useState(null);
  const [activeDocKey, setActiveDocKey] = useState('');
  const [selectedUserForAssign, setSelectedUserForAssign] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(() => initialFilter && initialFilter !== 'all' ? initialFilter : 'all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [decisionModal, setDecisionModal] = useState(null);

  useEffect(() => {
    fetchUsersAndDepts();
  }, []);

  useEffect(() => {
    if (initialFilter && initialFilter !== 'all') {
      setStatusFilter(initialFilter);
      if (initialFilter === 'pending') {
        setActiveSubTab('queue');
      } else {
        setActiveSubTab('students');
      }
      onClearFilter?.();
    }
  }, [initialFilter]);

  const fetchUsersAndDepts = async () => {
    try {
      const usersData = await api.get('/superadmin/users');
      // Filtrele: Sadece 'student' rolündekiler
      setUsers((usersData.users || []).filter(u => u.role === 'student'));

      const deptsData = await api.get('/superadmin/departments');
      setDepartments(deptsData.departments || []);
    } catch (err) {
      console.error('Veriler yüklenemedi');
    }
  };

  const handleApproveDocs = async (id) => {
    try {
      await api.put(`/superadmin/users/${id}`, {
        role: 'student',
        status: 'approved'
      });
      setMessage({ type: 'success', text: 'Öğrencinin belgeleri onaylandı. Atama bekliyor durumuna getirildi.' });
      fetchUsersAndDepts();
    } catch (err) {
      setMessage({ type: 'error', text: err || 'İşlem başarısız.' });
    }
  };

  const submitApplicationDecision = async () => {
    if (!decisionModal) return;
    const reason = decisionModal.reason || '';
    if (!reason.trim()) {
      setMessage({ type: 'error', text: 'Düzeltme istemek için açıklama zorunludur.' });
      return;
    }
    try {
      await api.put(`/superadmin/users/${decisionModal.user.id}`, {
        role: 'student',
        status: decisionModal.type === 'revision' ? 'revision_required' : 'permanently_rejected',
        rejection_reason: reason
      });
      setMessage({
        type: 'success',
        text: decisionModal.type === 'revision'
          ? 'Öğrenciden başvuru düzeltmesi istendi.'
          : 'Öğrencinin başvurusu kesin olarak reddedildi.'
      });
      setDecisionModal(null);
      fetchUsersAndDepts();
    } catch (err) {
      setMessage({ type: 'error', text: err || 'İşlem başarısız.' });
    }
  };

  const handleAssignDept = async (userId, deptId) => {
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;
    try {
      await api.put(`/superadmin/users/${userId}`, {
        name: targetUser.name,
        email: targetUser.email,
        role: 'student',
        status: 'assigned',
        dept_id: deptId,
        tc_kimlik: targetUser.tc_kimlik,
        iban: targetUser.iban,
        phone: targetUser.phone
      });
      setMessage({ type: 'success', text: 'Öğrenci birime başarıyla atandı.' });
      setSelectedUserForAssign(null);
      fetchUsersAndDepts();
    } catch (err) {
      setMessage({ type: 'error', text: err || 'Atama başarısız.' });
    }
  };

  const handleRemoveAssign = async (userId) => {
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;
    if (!window.confirm('Bu öğrencinin birim atamasını kaldırmak istediğinize emin misiniz?')) return;
    try {
      await api.put(`/superadmin/users/${userId}`, {
        name: targetUser.name,
        email: targetUser.email,
        role: 'student',
        status: 'approved',
        dept_id: null,
        tc_kimlik: targetUser.tc_kimlik,
        iban: targetUser.iban,
        phone: targetUser.phone
      });
      setMessage({ type: 'success', text: 'Öğrencinin birim ataması kaldırıldı.' });
      fetchUsersAndDepts();
    } catch (err) {
      setMessage({ type: 'error', text: err || 'İşlem başarısız.' });
    }
  };

  // Uyum Skoru Hesaplama Algoritması
  const calculateMatchScore = (student, dept) => {
    const activeStudentsInDept = users.filter(u => u.status === 'assigned' && Number(u.dept_id) === Number(dept.id)).length;
    if (activeStudentsInDept >= dept.student_capacity) {
      return { score: 0, reason: 'Kapasite Dolu (%0)', availableSlots: [] };
    }

    const courseScheduleMatrix = parseCourseScheduleMatrix(student.course_schedule_matrix);
    
    let preferredDaysObj = {};
    try {
      preferredDaysObj = typeof student.preferred_days === 'string' ? JSON.parse(student.preferred_days || '{}') : (student.preferred_days || {});
    } catch(e) {}
    const priority = preferredDaysObj.priority || 'dept';

    const open = timeToMinutes(dept.open_time);
    const close = timeToMinutes(dept.close_time);
    
    const compatibleDays = DAYS_OF_WEEK.filter(day => {
      const freeSlotsCount = COURSE_SLOTS.filter(slot => {
        const range = getSlotRange(slot);
        const inHours = open === null || close === null || (range.start >= open && range.end <= close);
        return inHours && courseScheduleMatrix?.[day]?.[slot.id] === false;
      }).length;
      return freeSlotsCount >= 8;
    });

    const compatibleDaysCount = Math.min(3, compatibleDays.length);

    if (compatibleDaysCount === 0) {
      return { score: 0, reason: 'Uyumlu çalışma günü yok (%0)', availableSlots: [] };
    }

    let score = Math.min(100, Math.round((compatibleDaysCount / 3) * 100));

    const isPreferred = Number(student.preferred_dept_id) === Number(dept.id);
    if (isPreferred) {
      const bonus = priority === 'days' ? 10 : 30;
      score = Math.min(100, score + bonus);
    }

    const reasons = [`${compatibleDaysCount} uyumlu gün (günde >= 7.5 saat çalışabilir)`];
    if (isPreferred) {
      reasons.push('Öğrenci Tercihi');
    }

    // Doluluk oranına göre kademeli penaltı (Tercih edilen birim değilse)
    if (!isPreferred && dept.student_capacity > 0) {
      const occupancyRate = activeStudentsInDept / dept.student_capacity;
      if (occupancyRate >= 0.5) {
        const ratio = (occupancyRate - 0.5) / 0.5;
        const penalty = Math.round(ratio * 20);
        score = Math.max(0, score - penalty);
        reasons.push(`Yoğunluk Penaltısı (-%${penalty})`);
      }
    }

    if (activeStudentsInDept > 0) {
      reasons.push(`Kapasite: ${activeStudentsInDept}/${dept.student_capacity}`);
    }

    return { score, reasons, availableSlots: compatibleDays };
  };

  const getDocLabel = (key) => {
    const labels = {
      idFront: 'Kimlik Ön Yüzü',
      idBack: 'Kimlik Arka Yüzü',
      studentCert: 'Öğrenci Belgesi',
      courseSchedule: 'Ders Programı',
      criminalRecord: 'Adli Sicil Kaydı',
      residence: 'İkametgâh & Hane Halkı',
      sgk: 'SGK Hizmet Dökümü',
      income: 'Gelir Durum Belgesi',
      ibanFile: 'IBAN Doğrulama Belgesi',
      healthReport: 'Sağlık Raporu'
    };
    return labels[key] || key;
  };

  // Filtrelemeler
  const pendingUsers = users.filter(u => u.status === 'pending');
  const otherUsers = users.filter(u => u.status !== 'pending');
  const unassignedCount = otherUsers.filter(u => u.status === 'approved').length;

  const filteredOtherUsers = otherUsers.filter(u => {
    const matchesSearch = (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (u.tc_kimlik && u.tc_kimlik.includes(searchQuery));
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    const matchesDepartment = departmentFilter === 'all' || Number(u.dept_id) === Number(departmentFilter);
    return matchesSearch && matchesStatus && matchesDepartment;
  });

  const studentDepartments = departments.filter(d => (
    otherUsers.some(u => Number(u.dept_id) === Number(d.id))
  ));

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* BAŞLIK VE ALT TABLAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/60 backdrop-blur-md p-4 rounded-3xl border border-slate-100">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              setActiveSubTab('students');
              if (unassignedCount > 0) {
                setStatusFilter('approved');
              }
            }}
            className={`px-5 py-2.5 rounded-2xl text-sm font-extrabold transition-all flex items-center gap-2 ${activeSubTab === 'students' ? 'bg-primary text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            🎓 Öğrenciye Birim Atama
            {unassignedCount > 0 && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse ${activeSubTab === 'students' ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'}`}>
                {unassignedCount}
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveSubTab('queue')}
            className={`px-5 py-2.5 rounded-2xl text-sm font-extrabold transition-all flex items-center gap-2 ${activeSubTab === 'queue' ? 'bg-primary text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            ⏳ Başvuru Kuyruğu
            {pendingUsers.length > 0 && (
              <span className="bg-danger text-white text-xs px-2 py-0.5 rounded-full font-black animate-pulse">
                {pendingUsers.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {message.text && (
        <div className={`p-4 rounded-2xl font-bold text-center ${message.type === 'success' ? 'bg-success/10 text-success border border-success/20' : 'bg-danger/10 text-danger border border-danger/20'}`}>
          {message.text}
          <button onClick={() => setMessage({ type: '', text: '' })} className="ml-4 opacity-50">✕</button>
        </div>
      )}

      {/* 1. BAŞVURU KUYRUĞU PANELİ */}
      {activeSubTab === 'queue' && (
        <div className="glass-card">
          <h2 className="text-xl font-extrabold text-slate-800 mb-6">Yeni Kayıt Başvuruları</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-4">Öğrenci</th>
                  <th className="py-4 px-4">TC Kimlik / E-posta</th>
                  <th className="py-4 px-4">Telefon</th>
                  <th className="py-4 px-4">Belgeler</th>
                  <th className="py-4 px-4 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pendingUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-12 text-center text-slate-400 font-semibold text-sm">
                      Mevcut yeni kayıt başvurusu bulunmamaktadır.
                    </td>
                  </tr>
                ) : (
                  pendingUsers.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-all">
                      <td className="py-4 px-4">
                        <p className="font-extrabold text-slate-800 text-sm">{u.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium">Kayıt Tarihi: {new Date(u.created_at).toLocaleDateString('tr-TR')}</p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-bold text-slate-700 text-xs">{u.tc_kimlik || '-'}</p>
                        <p className="text-[10px] text-slate-500 font-medium">{u.email}</p>
                      </td>
                      <td className="py-4 px-4 font-semibold text-slate-600 text-xs">{u.phone || '-'}</td>
                      <td className="py-4 px-4">
                        <button 
                          onClick={() => {
                            setSelectedUserForDocs(u);
                            // İlk belgeyi varsayılan seç
                            try {
                              const docs = JSON.parse(u.documents || '{}');
                              setActiveDocKey(Object.keys(docs)[0] || '');
                            } catch(e) {
                              setActiveDocKey('');
                            }
                          }}
                          className="px-3 py-1.5 bg-primary/5 hover:bg-primary/10 text-primary border border-primary/10 rounded-xl text-xs font-black transition-all"
                        >
                          📄 9 Belgeyi İncele
                        </button>
                      </td>
                      <td className="py-4 px-4 text-right space-x-2">
                        <button 
                          onClick={() => handleApproveDocs(u.id)}
                          className="px-3 py-1.5 bg-success text-white rounded-lg text-xs font-extrabold hover:bg-success-dark transition-all"
                        >
                          Onayla
                        </button>
                        <button 
                          onClick={() => setDecisionModal({ type: 'revision', user: u, reason: '' })}
                          className="px-3 py-1.5 bg-warning/10 text-warning rounded-lg text-xs font-extrabold hover:bg-warning hover:text-white transition-all"
                        >
                          Düzeltme İste
                        </button>
                        <button 
                          onClick={() => setDecisionModal({ type: 'reject', user: u, reason: '' })}
                          className="px-3 py-1.5 bg-danger/10 text-danger rounded-lg text-xs font-extrabold hover:bg-danger hover:text-white transition-all"
                        >
                          Kesin Reddet
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. ÖĞRENCİ ATAMA VE LİSTE PANELİ */}
      {activeSubTab === 'students' && (
        <div className="space-y-6">
          {/* FİLTRE VE ARAMA ÇUBUĞU */}
          <div className="glass-card grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <div>
              <input 
                type="text" 
                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary font-semibold text-sm transition-all"
                placeholder="Öğrenci adı veya TC ile ara..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <div>
              <select 
                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary font-bold text-sm transition-all"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="all">Tüm Durumlar</option>
                <option value="approved">Atama Bekleyenler (Onaylanmış)</option>
                <option value="assigned">Birime Atanmışlar</option>
                <option value="revision_required">Düzeltme Bekleyenler</option>
                <option value="rejected">Reddedilenler</option>
                <option value="permanently_rejected">Kesin Reddedilenler</option>
              </select>
            </div>
            <div>
              <select 
                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary font-bold text-sm transition-all"
                value={departmentFilter}
                onChange={e => setDepartmentFilter(e.target.value)}
              >
                <option value="all">Tüm Birimler</option>
                {studentDepartments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="text-right text-xs text-slate-400 font-bold">
              Toplam {filteredOtherUsers.length} kayıt listeleniyor.
            </div>
          </div>

          {/* ÖĞRENCİ TABLOSU */}
          <div className="glass-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    <th className="py-4 px-4">Öğrenci</th>
                    <th className="py-4 px-4">TC / IBAN</th>
                    <th className="py-4 px-4 min-w-[150px]">Durum</th>
                    <th className="py-4 px-4">Birim / Tercih</th>
                    <th className="py-4 px-4 text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredOtherUsers.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-12 text-center text-slate-400 font-semibold text-sm">
                        Aranan kriterlere uygun öğrenci bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    filteredOtherUsers.map(u => {
                      let preferredDaysObj = {};
                      try {
                        preferredDaysObj = JSON.parse(u.preferred_days || '{}');
                      } catch(e) {}
                      
                      return (
                        <tr key={u.id} className="hover:bg-slate-50/50 transition-all">
                          <td className="py-4 px-4">
                            <p className="font-extrabold text-slate-800 text-sm">{u.name}</p>
                            <p className="text-[10px] text-slate-400 font-medium">
                              {u.email || '-'}{u.phone ? ` | ${u.phone}` : ''}
                            </p>
                          </td>
                          <td className="py-4 px-4">
                            <p className="font-bold text-slate-700 text-xs">{u.tc_kimlik || '-'}</p>
                            <p className="text-[9px] text-slate-400 font-bold truncate max-w-[200px]" title={u.iban}>{u.iban || '-'}</p>
                          </td>
                          <td className="py-4 px-4">
                            {u.status === 'approved' && (
                              <span className="inline-flex items-center justify-center whitespace-nowrap px-3 py-1 bg-blue-50 border border-blue-100 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                Atama Bekliyor
                              </span>
                            )}
                            {u.status === 'assigned' && (
                              <span className="inline-flex items-center justify-center whitespace-nowrap px-3 py-1 bg-success/10 border border-success/20 text-success rounded-full text-[10px] font-bold uppercase tracking-wider">
                                Birime Atandı
                              </span>
                            )}
                            {u.status === 'rejected' && (
                              <span className="inline-flex items-center justify-center whitespace-nowrap px-3 py-1 bg-danger/10 border border-danger/20 text-danger rounded-full text-[10px] font-bold uppercase tracking-wider" title={u.phone}>
                                Reddedildi
                              </span>
                            )}
                            {u.status === 'revision_required' && (
                              <span className="inline-flex items-center justify-center whitespace-nowrap px-3 py-1 bg-warning/10 border border-warning/20 text-warning rounded-full text-[10px] font-bold uppercase tracking-wider">
                                Düzeltme Bekleniyor
                              </span>
                            )}
                            {u.status === 'permanently_rejected' && (
                              <span className="inline-flex items-center justify-center whitespace-nowrap px-3 py-1 bg-slate-100 border border-slate-200 text-slate-500 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                Kesin Reddedildi
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            {u.status === 'assigned' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-extrabold">
                                🏢 {u.dept_name}
                              </span>
                            ) : (
                              <div className="space-y-1">
                                <p className="text-xs text-slate-500 font-medium">
                                  Tercih: <span className="font-bold text-slate-700">
                                    {departments.find(d => d.id === u.preferred_dept_id)?.name || 'Fark etmez'}
                                  </span>
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {Object.entries(preferredDaysObj).map(([day, shift]) => (
                                    <span key={day} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-500 uppercase">
                                      {day.slice(0,3)}: {shift === 'gunduz' ? 'Gündüz' : 'Akşam'}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-4 text-right space-x-2">
                            {u.status === 'approved' && (
                              <button 
                                onClick={() => setSelectedUserForAssign(u)}
                                className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-extrabold hover:bg-primary-dark transition-all"
                              >
                                Birime Ata
                              </button>
                            )}
                            {u.status === 'assigned' && (
                              <>
                                <button 
                                  onClick={() => setSelectedUserForAssign(u)}
                                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-600 transition-all"
                                >
                                  Transfer Et
                                </button>
                                <button 
                                  onClick={() => handleRemoveAssign(u.id)}
                                  className="px-2.5 py-1.5 bg-danger/10 hover:bg-danger hover:text-white rounded-lg text-xs font-bold text-danger transition-all"
                                >
                                  Kaydı Çıkar
                                </button>
                              </>
                            )}
                            {u.status === 'rejected' && (
                              <button 
                                onClick={() => handleApproveDocs(u.id)}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-primary hover:text-white rounded-lg text-xs font-bold text-slate-600 transition-all"
                              >
                                Tekrar İncele / Onayla
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* BELGE İNCELEME MODALI */}
      {selectedUserForDocs && createPortal((
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 p-4">
          <div className="bg-white w-full h-full rounded-3xl overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
              <div>
                <h3 className="text-base font-extrabold text-slate-800">{selectedUserForDocs.name} - Başvuru Belgeleri</h3>
                <p className="text-[11px] text-slate-400 font-medium">Lütfen 9 zorunlu belgeyi tek tek inceleyip doğruluğunu kontrol edin.</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    handleApproveDocs(selectedUserForDocs.id);
                    setSelectedUserForDocs(null);
                  }}
                  className="px-4 py-2 bg-success text-white rounded-xl text-xs font-black hover:bg-success-dark transition-all"
                >
                  Tüm Belgeleri Onayla
                </button>
                <button 
                  onClick={() => setSelectedUserForDocs(null)}
                  className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-700 text-xl font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 grid grid-cols-[180px_minmax(0,1fr)] overflow-hidden min-h-0">
              {/* Document List (Left Sidebar) */}
              <div className="bg-slate-50 border-r border-slate-200 p-3 overflow-y-auto space-y-1.5">
                {(() => {
                  let docs = {};
                  try {
                    docs = JSON.parse(selectedUserForDocs.documents || '{}');
                  } catch(e) {}
                  
                  return Object.keys(docs).map(key => {
                    const isActive = activeDocKey === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setActiveDocKey(key)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-[11px] font-bold transition-all border ${
                          isActive 
                            ? 'bg-primary text-white border-primary shadow-sm' 
                            : 'bg-white text-slate-600 border-slate-100 hover:bg-slate-50'
                        }`}
                      >
                        {getDocLabel(key)}
                      </button>
                    );
                  });
                })()}
              </div>

              {/* Document Viewer (Right Content) */}
              <div className="bg-slate-200 overflow-auto min-w-0 min-h-0 p-3">
                {(() => {
                  let docs = {};
                  try {
                    docs = JSON.parse(selectedUserForDocs.documents || '{}');
                  } catch(e) {}

                  const selectedDoc = docs[activeDocKey];
                  if (!selectedDoc) {
                    return (
                      <div className="text-center text-slate-400 font-bold text-sm">
                        Seçili belge bulunamadı veya yüklenmemiş.
                      </div>
                    );
                  }

                  const isPdf = selectedDoc.type && selectedDoc.type.includes('pdf');
                  const base64Data = selectedDoc.data || selectedDoc; // backward compatibility

                  if (activeDocKey === 'courseSchedule') {
                    let courseScheduleMatrix = {};
                    try {
                      courseScheduleMatrix = typeof selectedUserForDocs.course_schedule_matrix === 'string'
                        ? JSON.parse(selectedUserForDocs.course_schedule_matrix || '{}')
                        : (selectedUserForDocs.course_schedule_matrix || {});
                    } catch(e) {
                      courseScheduleMatrix = {};
                    }

                    const selectedLessonCount = DAYS_OF_WEEK.reduce((total, day) => (
                      total + COURSE_SLOTS.filter(slot => courseScheduleMatrix?.[day]?.[slot.id] === true).length
                    ), 0);

                    return (
                      <div className="min-h-full grid grid-cols-1 xl:grid-cols-[minmax(520px,0.95fr)_minmax(520px,1.05fr)] gap-3">
                        <div className="bg-white border border-slate-150 rounded-2xl p-3 overflow-hidden flex flex-col min-h-0">
                          <div className="mb-4">
                            <h4 className="text-sm font-black text-slate-800">Öğrencinin İşaretlediği Ders Saatleri</h4>
                            <p className="text-[11px] text-slate-500 font-semibold mt-1">
                              Öğrencinin kayıt sırasında soldaki matriste ders olarak işaretlediği saatler aşağıda kırmızı gösterilir.
                            </p>
                            {selectedLessonCount === 0 && (
                              <p className="mt-2 rounded-xl bg-warning/10 border border-warning/20 text-warning text-[10px] font-black px-3 py-2">
                                Ders matrisi boş görünüyor. Backend yeniden başlatılmadıysa sistem yöneticisi ekranına matrisi taşıyan yeni API alanı gelmemiş olabilir.
                              </p>
                            )}
                            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                              <div className="rounded-xl bg-danger/10 border border-danger/20 p-3">
                                <p className="text-[10px] font-black text-danger uppercase tracking-wider">Ders Saati</p>
                                <p className="text-xl font-black text-danger">{selectedLessonCount}</p>
                              </div>
                              <div className="rounded-xl bg-success/10 border border-success/20 p-3">
                                <p className="text-[10px] font-black text-success uppercase tracking-wider">Boş Zaman</p>
                                <p className="text-xl font-black text-success">{DAYS_OF_WEEK.length * COURSE_SLOTS.length - selectedLessonCount}</p>
                              </div>
                            </div>
                          </div>

                          <div className="overflow-auto flex-1 min-h-0 custom-scrollbar">
                            <table className="min-w-[700px] w-full border-collapse text-[10px] table-fixed">
                              <thead>
                                <tr>
                                  <th className="w-[15%] sticky top-0 bg-slate-50 border border-slate-200 p-2 text-left text-slate-500">Saat</th>
                                  {DAYS_OF_WEEK.map(day => (
                                    <th key={day} className="w-[17%] sticky top-0 bg-slate-50 border border-slate-200 p-2 text-slate-600">{day}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {COURSE_SLOTS.map(slot => (
                                  <tr key={slot.id}>
                                    <td className="border border-slate-200 p-2 font-black text-slate-600">
                                      {slot.id}
                                      <div className="font-semibold text-slate-400">{slot.label}</div>
                                    </td>
                                    {DAYS_OF_WEEK.map(day => {
                                      const hasLesson = courseScheduleMatrix?.[day]?.[slot.id] === true;
                                      return (
                                        <td key={`${day}-${slot.id}`} className="border border-slate-200 p-1 text-center">
                                          <span 
                                            className={`flex items-center justify-center h-8 rounded-lg font-black text-[9px] uppercase tracking-widest select-none ${
                                              hasLesson
                                                ? 'bg-danger border border-danger/30 shadow-sm text-white'
                                                : 'bg-slate-50 border border-slate-200/50 text-slate-300'
                                            }`}
                                            title={hasLesson ? 'Ders Var' : 'Müsait/Boş'}
                                          >
                                            {hasLesson ? 'Ders' : ''}
                                          </span>
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        <div className="min-w-0 flex flex-col min-h-0">
                          <div className="mb-3 flex items-center justify-between text-xs text-slate-500 font-semibold bg-white border border-slate-150 p-2.5 rounded-xl">
                            <span className="truncate pr-4">Yüklenen Ders Programı: {selectedDoc.name || 'Belge'}</span>
                            <a 
                              href={base64Data} 
                              download={selectedDoc.name || `${activeDocKey}.bin`}
                              className="shrink-0 px-3.5 py-1.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-all font-bold"
                            >
                              📥 Dosyayı İndir
                            </a>
                          </div>
                          {isPdf ? (
                            <iframe 
                              src={base64Data} 
                              className="w-full flex-1 min-h-[calc(100vh-165px)] bg-white border border-slate-200 rounded-2xl"
                              title={getDocLabel(activeDocKey)}
                            />
                          ) : (
                            <div className="flex-1 min-h-[calc(100vh-165px)] bg-white border border-slate-200 rounded-2xl overflow-auto flex items-start justify-center p-3">
                              <img 
                                src={base64Data} 
                                alt={getDocLabel(activeDocKey)}
                                className="block max-w-full h-auto rounded-xl shadow-sm"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="min-h-full">
                      <div className="mb-3 flex items-center justify-between text-xs text-slate-500 font-semibold bg-white border border-slate-150 p-2.5 rounded-xl">
                        <span className="truncate pr-4">Dosya Adı: {selectedDoc.name || 'Belge'}</span>
                        <a 
                          href={base64Data} 
                          download={selectedDoc.name || `${activeDocKey}.bin`}
                          className="shrink-0 px-3.5 py-1.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-all font-bold"
                        >
                          📥 Dosyayı İndir
                        </a>
                      </div>
                      {isPdf ? (
                        <iframe 
                          src={base64Data} 
                          className="w-full h-[calc(100vh-150px)] bg-white border border-slate-200 rounded-2xl"
                          title={getDocLabel(activeDocKey)}
                        />
                      ) : (
                        <img 
                          src={base64Data} 
                          alt={getDocLabel(activeDocKey)}
                          className="block w-full max-w-5xl mx-auto h-auto bg-white rounded-2xl shadow-sm"
                        />
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      ), document.body)}

      {/* BİRİME ATA MODALI (AKILLI ÖNERİLİ) */}
      {selectedUserForAssign && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card max-w-2xl w-full max-h-[600px] flex flex-col relative !p-0 overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-150 bg-slate-50/50">
              <h3 className="text-lg font-extrabold text-slate-800">{selectedUserForAssign.name} İçin Birim Seçimi</h3>
              <p className="text-xs text-slate-400 font-medium">Birimler, öğrencinin müsaitliğine, kapasiteye ve tercihlere göre akıllı puanlanmıştır.</p>
              <button 
                onClick={() => setSelectedUserForAssign(null)}
                className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-100/50">
              {/* Student Preferences Header Card */}
              <div className="bg-white border border-slate-150 p-4 rounded-2xl text-xs space-y-2">
                <p className="font-extrabold text-slate-700 uppercase tracking-widest text-[9px] text-slate-400">Öğrenci Tercihleri ve Müsaitliği</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-slate-500 font-medium">İstenen Birim:</p>
                    <p className="font-bold text-slate-800 text-sm">
                      {departments.find(d => d.id === selectedUserForAssign.preferred_dept_id)?.name || 'Fark etmez'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 font-medium">Birim Eşleştirme Önceliği:</p>
                    <div className="mt-0.5">
                      {(() => {
                        let preferredDaysObj = {};
                        try {
                          preferredDaysObj = typeof selectedUserForAssign.preferred_days === 'string'
                            ? JSON.parse(selectedUserForAssign.preferred_days || '{}')
                            : (selectedUserForAssign.preferred_days || {});
                        } catch(e) {}
                        
                        const hasPreferredDept = !!selectedUserForAssign.preferred_dept_id && departments.some(d => d.id === selectedUserForAssign.preferred_dept_id);
                        if (!hasPreferredDept) {
                          return (
                            <span className="inline-flex px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-lg font-bold text-[10px] uppercase">
                              🌐 Otomatik Eşleştirme
                            </span>
                          );
                        }

                        const priority = preferredDaysObj.priority || 'dept';
                        return priority === 'dept' ? (
                          <span className="inline-flex px-2 py-0.5 bg-blue-50 border border-blue-100 text-blue-600 rounded-lg font-bold text-[10px] uppercase">
                            🎯 Tercih Öncelikli
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 bg-purple-50 border border-purple-100 text-purple-600 rounded-lg font-bold text-[10px] uppercase">
                            📅 Maksimum Gün Öncelikli
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                  <div>
                    <p className="text-slate-500 font-medium">Ders Programı Matrisi:</p>
                    <div className="flex flex-wrap gap-1.5 mt-0.5">
                      {(() => {
                        const courseScheduleMatrix = parseCourseScheduleMatrix(selectedUserForAssign.course_schedule_matrix);
                        const selectedLessonCount = DAYS_OF_WEEK.reduce((total, day) => (
                          total + COURSE_SLOTS.filter(slot => courseScheduleMatrix?.[day]?.[slot.id] === true).length
                        ), 0);
                        return (
                          <>
                            <span className="px-2 py-0.5 rounded bg-danger/10 border border-danger/20 text-danger font-bold text-[10px]">
                              Ders Saati: {selectedLessonCount}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-success/10 border border-success/20 text-success font-bold text-[10px]">
                              Boş Zaman: {DAYS_OF_WEEK.length * COURSE_SLOTS.length - selectedLessonCount}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Department Recommendations List */}
              <div className="space-y-3">
                {(() => {
                  // Calculate match scores for all departments
                  const scoredDepts = departments.map(d => {
                    const matchInfo = calculateMatchScore(selectedUserForAssign, d);
                    return { ...d, ...matchInfo };
                  });

                  // Sort by score descending
                  scoredDepts.sort((a, b) => b.score - a.score);

                  return scoredDepts.map(d => {
                    const activeCount = users.filter(u => u.status === 'assigned' && Number(u.dept_id) === Number(d.id)).length;
                    const isFull = activeCount >= d.student_capacity;
                    const isMatchZero = d.score === 0;

                    // Color based on score
                    const badgeColor = isMatchZero
                      ? 'bg-slate-100 text-slate-400 border-slate-200'
                      : d.score >= 70
                      ? 'bg-success/10 text-success border-success/20'
                      : 'bg-warning/10 text-warning border-warning/20';

                    return (
                      <div 
                        key={d.id} 
                        className={`flex items-center justify-between bg-white border rounded-2xl p-4 transition-all ${
                          isMatchZero ? 'opacity-60 border-slate-200' : 'border-slate-150 hover:shadow-md'
                        }`}
                      >
                        <div className="space-y-1.5 flex-1 pr-4">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-800 text-sm">{d.name}</span>
                            <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded">
                              ⏰ Kapanış: {d.close_time}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
                            <span>
                              Kapasite: <strong className={isFull ? 'text-danger' : 'text-slate-700'}>{activeCount} / {d.student_capacity}</strong>
                            </span>
                            {d.reasons && d.reasons.length > 0 && (
                              <span className="text-slate-400 text-[10px] font-medium">
                                ({d.reasons.join(', ')})
                              </span>
                            )}
                            {isMatchZero && (
                              <span className="text-danger text-[10px] font-black uppercase">
                                🚫 {d.reason}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          {/* Score Badge */}
                          <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center border font-black text-sm ${badgeColor}`}>
                            <span>%{d.score}</span>
                            <span className="text-[8px] uppercase tracking-widest font-black opacity-60">Uyum</span>
                          </div>

                          {/* Assign Button */}
                          <button 
                            disabled={isMatchZero}
                            onClick={() => handleAssignDept(selectedUserForAssign.id, d.id)}
                            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
                              isMatchZero 
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' 
                                : 'bg-primary text-white hover:bg-primary-dark shadow-sm'
                            }`}
                          >
                            Ata
                          </button>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-150 bg-slate-50/50 flex justify-end">
              <button 
                onClick={() => setSelectedUserForAssign(null)}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-black transition-all"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {decisionModal && createPortal((
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-fade-in">
            <div className={`p-5 border-b ${
              decisionModal.type === 'revision'
                ? 'bg-warning/10 border-warning/20'
                : 'bg-danger/10 border-danger/20'
            }`}>
              <div className="flex items-start gap-3">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl ${
                  decisionModal.type === 'revision'
                    ? 'bg-warning/15 text-warning'
                    : 'bg-danger/15 text-danger'
                }`}>
                  {decisionModal.type === 'revision' ? '✎' : '⚠'}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">
                    {decisionModal.type === 'revision' ? 'Başvuru Düzeltmesi İste' : 'Başvuruyu Kesin Reddet'}
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold mt-1">
                    {decisionModal.user.name} için yapacağınız açıklama öğrenciye gösterilecektir.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="rounded-2xl bg-slate-50 border border-slate-150 p-4 text-xs text-slate-600 font-semibold leading-relaxed">
                {decisionModal.type === 'revision'
                  ? 'Eksik, hatalı veya okunmayan belgeyi açıkça yazın. Öğrenci bu açıklamaya göre başvurusunu yeniden düzenleyip tekrar gönderecek.'
                  : 'Bu işlem öğrencinin başvurusunu kalıcı olarak reddeder. Öğrenci bu başvuruyla sürece devam edemez; bu nedenle gerekçeyi net ve anlaşılır yazın.'}
              </div>

              <label className="block">
                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  {decisionModal.type === 'revision' ? 'Öğrenciye Gönderilecek Düzeltme Açıklaması' : 'Kesin Ret Gerekçesi'}
                </span>
                <textarea
                  autoFocus
                  rows={5}
                  value={decisionModal.reason}
                  onChange={e => setDecisionModal(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder={
                    decisionModal.type === 'revision'
                      ? 'Örn: Ders programı belgesi okunmuyor. Lütfen güncel ve okunaklı resmi ders programınızı PDF veya resim olarak tekrar yükleyin.'
                      : 'Örn: Başvuru koşullarını karşılamadığı için başvuru kesin olarak reddedilmiştir.'
                  }
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
              </label>

              {!decisionModal.reason.trim() && (
                <p className="text-[11px] text-danger font-black">
                  Açıklama alanı zorunludur. Öğrencinin ne yapması gerektiğini anlayabilmesi için kısa ve net bir gerekçe yazın.
                </p>
              )}
            </div>

            <div className="px-5 py-4 bg-slate-50 border-t border-slate-150 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDecisionModal(null)}
                className="px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-black hover:bg-slate-100 transition-all"
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={!decisionModal.reason.trim()}
                onClick={submitApplicationDecision}
                className={`px-5 py-2.5 rounded-xl text-white text-xs font-black transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                  decisionModal.type === 'revision'
                    ? 'bg-warning hover:bg-warning/90'
                    : 'bg-danger hover:bg-danger/90'
                }`}
              >
                {decisionModal.type === 'revision' ? 'Düzeltme İste' : 'Kesin Reddet'}
              </button>
            </div>
          </div>
        </div>
      ), document.body)}
    </div>
  );
}

export default OgrenciYonetimiAdmin;
