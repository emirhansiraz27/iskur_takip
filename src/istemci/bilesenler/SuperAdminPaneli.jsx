import React, { useState, useEffect } from 'react';
import api from '../api';

function SuperAdminPaneli() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deptForm, setDeptForm] = useState({ name: '', open_time: '08:00', close_time: '17:00', student_capacity: 10 });
  const [managerForm, setManagerForm] = useState({ name: '', password: '', email: '', dept_id: '' });
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await api.get('/superadmin/departments');
      setDepartments(data.departments || []);
    } catch (err) {
      console.error('Veriler yüklenemedi:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeptSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/superadmin/departments', deptForm);
      setMessage({ type: 'success', text: 'Birim başarıyla eklendi.' });
      setDeptForm({ name: '', open_time: '08:00', close_time: '17:00', student_capacity: 10 });
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err || 'Birim eklenemedi.' });
    }
  };

  const handleManagerSubmit = async (e) => {
    e.preventDefault();
    if (!managerForm.dept_id) {
      setMessage({ type: 'error', text: 'Lütfen bir birim seçin.' });
      return;
    }
    try {
      await api.post('/superadmin/managers', managerForm);
      setMessage({ type: 'success', text: 'Birim Sorumlusu başarıyla atandı.' });
      setManagerForm({ name: '', password: '', email: '', dept_id: '' });
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err || 'Birim Sorumlusu eklenemedi.' });
    }
  };

  return (
    <div className="space-y-12 animate-fade-in">
      {message.text && (
        <div className={`p-4 rounded-2xl font-bold text-center ${message.type === 'success' ? 'bg-success/10 text-success border border-success/20' : 'bg-danger/10 text-danger border border-danger/20'}`}>
          {message.text}
          <button onClick={() => setMessage({ type: '', text: '' })} className="ml-4 opacity-50">✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* YENİ BİRİM FORMU */}
        <div className="glass-card">
          <h2 className="text-xl font-extrabold text-slate-800 mb-6 flex items-center gap-3">
            <span className="text-2xl">🏢</span> Yeni Birim Ekle
          </h2>
          <form onSubmit={handleDeptSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Birim Adı</label>
              <input 
                type="text" 
                required
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-primary focus:bg-white"
                value={deptForm.name}
                onChange={e => setDeptForm({...deptForm, name: e.target.value})}
                placeholder="Örn: Bilgi İşlem Daire Başkanlığı"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Açılış</label>
                <input 
                  type="time" 
                  required
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-primary focus:bg-white"
                  value={deptForm.open_time}
                  onChange={e => setDeptForm({...deptForm, open_time: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Kapanış</label>
                <input 
                  type="time" 
                  required
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-primary focus:bg-white"
                  value={deptForm.close_time}
                  onChange={e => setDeptForm({...deptForm, close_time: e.target.value})}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Öğrenci Kapasitesi</label>
              <input 
                type="number" 
                required
                min="1"
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-primary focus:bg-white"
                value={deptForm.student_capacity}
                onChange={e => setDeptForm({...deptForm, student_capacity: parseInt(e.target.value)})}
              />
            </div>
            <button type="submit" className="btn-premium w-full !py-3">Birimi Kaydet</button>
          </form>
        </div>

        {/* YENİ BİRİM SORUMLUSU FORMU */}
        <div className="glass-card">
          <h2 className="text-xl font-extrabold text-slate-800 mb-6 flex items-center gap-3">
            <span className="text-2xl">👤</span> Yeni Birim Sorumlusu Ata
          </h2>
          <form onSubmit={handleManagerSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Ad Soyad</label>
                <input 
                  type="text" 
                  required
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-primary focus:bg-white"
                  value={managerForm.name}
                  onChange={e => setManagerForm({...managerForm, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">E-posta Adresi (Giriş İçin)</label>
                <input 
                  type="email" 
                  required
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-primary focus:bg-white"
                  value={managerForm.email}
                  onChange={e => setManagerForm({...managerForm, email: e.target.value})}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Şifre</label>
                <input 
                  type="password" 
                  required
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-primary focus:bg-white"
                  value={managerForm.password}
                  onChange={e => setManagerForm({...managerForm, password: e.target.value})}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Bağlanacağı Birim</label>
              <select 
                required
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-primary focus:bg-white font-bold"
                value={managerForm.dept_id}
                onChange={e => setManagerForm({...managerForm, dept_id: e.target.value})}
              >
                <option value="">Birim Seçin...</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn-premium w-full !py-3">Birim Sorumlusunu Ata</button>
          </form>
        </div>
      </div>

      {/* BİRİMLER TABLOSU */}
      <div className="glass-card !p-0 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
           <h2 className="text-xl font-extrabold text-slate-800">Sistem Birimleri ve Kapasite</h2>
           <button onClick={fetchData} className="btn-secondary !h-10 !px-4 !rounded-xl">🔄 Yenile</button>
        </div>

        <div className="p-8">
           {loading ? (
             <div className="py-20 text-center">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent animate-spin mx-auto"></div>
             </div>
           ) : (
             <div className="table-shell custom-scrollbar">
               <table className="modern-table">
                 <thead>
                   <tr>
                     <th>Birim Adı</th>
                     <th>Mesai Saatleri</th>
                     <th>Birim Sorumlusu</th>
                     <th className="text-center">Kapasite Doluluk</th>
                     <th className="text-center">Durum</th>
                   </tr>
                 </thead>
                 <tbody>
                   {departments.length === 0 ? (
                     <tr><td colSpan="5" className="text-center py-10 text-slate-400 italic">Henüz birim eklenmemiş.</td></tr>
                   ) : (
                     departments.map(dept => {
                       const occupancy = dept.student_capacity > 0 ? (dept.active_students / dept.student_capacity) * 100 : 0;
                       return (
                         <tr key={dept.id}>
                           <td className="font-bold text-slate-800">{dept.name}</td>
                           <td className="text-slate-500 font-mono text-xs">{dept.open_time} - {dept.close_time}</td>
                           <td>{dept.manager_name || <span className="text-danger italic text-xs">Sorumlu Atanmamış</span>}</td>
                           <td className="text-center">
                             <div className="flex flex-col items-center gap-2">
                               <div className="w-full max-w-[100px] h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                 <div 
                                   className={`h-full transition-all duration-1000 ${occupancy >= 100 ? 'bg-danger' : occupancy >= 80 ? 'bg-warning' : 'bg-success'}`}
                                   style={{ width: `${Math.min(occupancy, 100)}%` }}
                                 ></div>
                               </div>
                               <span className="text-[10px] font-black text-slate-500">
                                 {dept.active_students} / {dept.student_capacity}
                               </span>
                             </div>
                           </td>
                           <td className="text-center">
                             <span className={`metric-pill ${dept.active_students >= dept.student_capacity ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'}`}>
                               {dept.active_students >= dept.student_capacity ? 'DOLU' : 'MÜSAİT'}
                             </span>
                           </td>
                         </tr>
                       )
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

export default SuperAdminPaneli;
