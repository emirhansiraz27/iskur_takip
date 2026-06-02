import React, { useState, useEffect } from 'react';
import api from '../api';

function YoneticiOgrenciler({ user }) {
  const [students, setStudents] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, active, terminated

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const data = await api.get('/dept/students/overview');
      setStudents(data.students || []);
      const planData = await api.get('/plan/manager');
      setPlans(planData.plans || []);
    } catch (err) {
      console.error('Öğrenciler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (s.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || 
                          (filterStatus === 'active' && s.is_terminated === 0) ||
                          (filterStatus === 'terminated' && s.is_terminated === 1);
    return matchesSearch && matchesStatus;
  });

  const terminateStudent = async (id, name) => {
    if (!window.confirm(`${name} isimli öğrencinin kurum ilişiğini kesmek istediğinize emin misiniz?`)) return;
    try {
      await api.post(`/puantaj/manager/terminate/${id}`);
      fetchStudents();
    } catch (err) {
      alert(err || 'İşlem başarısız.');
    }
  };

  const activateStudent = async (id, name) => {
    try {
      await api.post(`/manager/students/activate/${id}`);
      fetchStudents();
    } catch (err) {
      alert(err || 'İşlem başarısız.');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* HEADER & FILTERS */}
      <div className="glass-card !p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1">
             <input 
                type="text" 
                className="w-full h-12 px-4 pr-24 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 font-semibold text-sm placeholder:text-slate-400"
                placeholder="Öğrenci adı veya kullanıcı adı ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
             />
             {searchTerm && (
               <button
                 type="button"
                 onClick={() => setSearchTerm('')}
                 className="absolute right-3 top-1/2 -translate-y-1/2 !min-h-0 !px-3 !py-1 rounded-full bg-white border border-slate-200 text-[10px] font-black text-slate-500 hover:!bg-slate-100"
               >
                 TEMİZLE
               </button>
             )}
          </div>
        
           <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full lg:w-56 h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:border-primary focus:bg-white"
            >
              <option value="all">Tüm Kayıtlar</option>
              <option value="active">Sadece Aktifler</option>
              <option value="terminated">İlişiği Kesilenler</option>
            </select>

          <div className="flex items-center gap-3">
            <div className="h-12 px-4 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-xs font-black whitespace-nowrap">
              {filteredStudents.length} Sonuç
            </div>
            <button onClick={fetchStudents} className="btn-secondary !h-12 !px-4 !rounded-2xl" title="Listeyi yenile">
              <span>🔄</span>
            </button>
          </div>
        </div>
      </div>

      {/* STUDENT TABLE */}
      <div className="glass-card !p-0 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
           <h2 className="text-xl font-extrabold text-slate-800">Kayıtlı Öğrenci Rehberi</h2>
           <span className="text-[10px] font-bold text-slate-400 uppercase bg-white px-3 py-1 rounded-full border border-slate-100">
             Toplam {filteredStudents.length} Kayıt
           </span>
        </div>

        <div className="p-8">
           {loading ? (
             <div className="py-24 text-center">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent animate-spin mx-auto mb-4"></div>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Veritabanı Sorgulanıyor...</p>
             </div>
           ) : (
             <div className="table-shell custom-scrollbar">
               <table className="modern-table table-fixed min-w-[820px]">
                 <thead>
                   <tr>
                     <th className="w-[32%]">Öğrenci</th>
                     <th className="w-[16%] text-center">Program</th>
                     <th className="w-[16%] text-center">Katılım</th>
                     <th className="w-[20%] text-center">Devamsızlık Hakkı</th>
                     <th className="w-[16%] text-center">İşlem</th>
                   </tr>
                 </thead>
                 <tbody>
                   {filteredStudents.length === 0 ? (
                     <tr>
                       <td colSpan="5" className="text-center py-20 text-slate-300 font-bold uppercase text-[10px] tracking-widest italic">Aranan kriterlerde kayıt bulunamadı.</td>
                     </tr>
                   ) : (
                     filteredStudents.map(student => (
                       <tr key={student.id} className={`group ${student.is_terminated === 1 ? 'opacity-40 grayscale' : ''}`}>
                         <td className="font-bold text-slate-800">
                            <div className="flex flex-col min-w-0">
                              <span className="truncate">{student.name}</span>
                              <span className="text-[10px] font-mono font-normal text-slate-400 truncate">
                                {student.email}
                              </span>
                            </div>
                         </td>
                         <td className="text-center">
                            <span className="metric-pill bg-slate-100 text-slate-600">
                              {student.program_duration_months} AY
                            </span>
                         </td>
                         <td className="text-center">
                           <span className="metric-pill bg-success/10 text-success">{student.attended_days} Gün</span>
                         </td>
                         <td className="text-center">
                           <span className={`metric-pill ${
                             student.absent_days >= (student.program_duration_months <= 6 ? 7 : 10)
                               ? 'bg-danger text-white'
                               : student.absent_days >= (student.program_duration_months <= 6 ? 7 : 10) - 1
                                 ? 'bg-warning text-white'
                                 : 'bg-slate-100 text-slate-600'
                           }`}>
                             {student.absent_days} / {student.program_duration_months <= 6 ? 7 : 10} Gün
                           </span>
                         </td>
                         <td className="text-center">
                           {student.is_terminated === 0 ? (
                             <button 
                               onClick={() => terminateStudent(student.id, student.name)}
                               className="btn-secondary !py-1 !px-4 !text-[11px] hover:!bg-danger hover:!text-white transition-all"
                             >
                               İlişiği Kes
                             </button>
                           ) : (
                             <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase bg-slate-100 px-3 py-1 rounded-md border border-slate-200">
                               FESHEDİLDİ
                             </span>
                           )}
                         </td>
                       </tr>
                     ))
                   )}
                 </tbody>
               </table>
             </div>
           )}
        </div>
      </div>

      {/* WEEKLY SCHEDULE TABLE */}
      <div className="glass-card !p-0 overflow-hidden mt-8">
        <div className="px-8 py-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
           <h2 className="text-xl font-extrabold text-slate-800">Haftalık Çalışma Takvimi</h2>
        </div>
        <div className="p-8">
           {loading ? (
             <div className="py-10 text-center text-slate-400 font-bold uppercase text-[10px]">Yükleniyor...</div>
           ) : (
             <div className="table-shell custom-scrollbar overflow-x-auto">
               <table className="modern-table table-fixed min-w-[800px]">
                 <thead>
                   <tr>
                     <th className="w-48 text-left">Öğrenci</th>
                     {['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'].map(day => (
                       <th key={day} className="text-center w-24">{day}</th>
                     ))}
                   </tr>
                 </thead>
                 <tbody>
                   {students.filter(s => s.is_terminated === 0).length === 0 ? (
                     <tr>
                       <td colSpan="7" className="text-center py-10 text-slate-300 font-bold uppercase text-[10px] tracking-widest italic">Aktif öğrenci bulunamadı.</td>
                     </tr>
                   ) : (
                     students.filter(s => s.is_terminated === 0).map(student => {
                       const studentPlans = plans.filter(p => p.user_id === student.id && p.status === 'approved');
                       const workingDays = studentPlans.map(p => p.day);
                       return (
                         <tr key={`schedule-${student.id}`} className="group hover:bg-slate-50/50">
                           <td className="font-bold text-slate-800">
                             <div className="flex flex-col min-w-0">
                               <span className="truncate">{student.name}</span>
                               <span className="text-[10px] font-mono font-normal text-slate-400 truncate">
                                  {student.email}
                               </span>
                             </div>
                           </td>
                           {['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'].map(day => {
                             const isWorking = workingDays.includes(day);
                             return (
                               <td key={day} className="text-center p-2">
                                 {isWorking ? (
                                   <div className="w-full py-1.5 rounded-lg bg-success/10 text-success text-sm font-black border border-success/20 flex items-center justify-center" title="Mesaide">
                                     ✅
                                   </div>
                                 ) : (
                                   <div className="w-full py-1.5 rounded-lg bg-slate-50 text-slate-300 text-sm font-black border border-slate-100/50 flex items-center justify-center" title="İzinli">
                                     -
                                   </div>
                                 )}
                               </td>
                             );
                           })}
                         </tr>
                       );
                     })
                   )}
                 </tbody>
               </table>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}

export default YoneticiOgrenciler;
