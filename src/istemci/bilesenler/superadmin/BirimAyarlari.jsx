import React, { useState, useEffect } from 'react';
import api from '../../api';

const OPEN_TIME_OPTIONS = [
  '07:00', '07:30', '08:00', '08:30', '09:00', '09:25', 
  '10:20', '11:15', '13:00', '13:55', '14:50', '15:00', 
  '15:45', '16:00', '17:00', '17:55', '18:50', '19:45', 
  '20:40', '21:35', '22:30'
];

const CLOSE_TIME_OPTIONS = [
  '12:00', '13:00', '13:45', '14:40', '15:35', '16:30', 
  '17:00', '17:30', '17:45', '18:00', '18:30', '18:40', 
  '19:35', '20:30', '21:00', '21:25', '22:00', '22:20', 
  '23:00', '23:15'
];

function BirimAyarlari() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', open_time: '', close_time: '' });
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

  const startEdit = (dept) => {
    setEditingId(dept.id);
    setEditForm({
      name: dept.name,
      open_time: dept.open_time,
      close_time: dept.close_time,
      student_capacity: dept.student_capacity // keep capacity during this update
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/superadmin/departments/${editingId}`, editForm);
      setMessage({ type: 'success', text: 'Birim ayarları güncellendi.' });
      setEditingId(null);
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err || 'Güncelleme başarısız.' });
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`'${name}' birimini silmek istediğinize emin misiniz?`)) return;
    
    try {
      await api.delete(`/superadmin/departments/${id}`);
      setMessage({ type: 'success', text: 'Birim başarıyla silindi.' });
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err || 'Birim silinemedi.' });
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {message.text && (
        <div className={`p-4 rounded-2xl font-bold text-center ${message.type === 'success' ? 'bg-success/10 text-success border border-success/20' : 'bg-danger/10 text-danger border border-danger/20'}`}>
          {message.text}
          <button onClick={() => setMessage({ type: '', text: '' })} className="ml-4 opacity-50">✕</button>
        </div>
      )}

      <div className="glass-card !p-0 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
           <h2 className="text-xl font-extrabold text-slate-800">Birim Ayarlarını Düzenle</h2>
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
                     <th className="text-right">İşlem</th>
                   </tr>
                 </thead>
                 <tbody>
                   {departments.map(dept => (
                     <tr key={dept.id}>
                       {editingId === dept.id ? (
                         <td colSpan="3" className="!p-0">
                           <form onSubmit={handleUpdate} className="bg-slate-50 p-6 space-y-4 animate-scale-in">
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                               <div className="md:col-span-1">
                                 <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Birim Adı</label>
                                 <input 
                                   type="text" 
                                   className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl outline-none focus:border-primary font-bold text-sm"
                                   value={editForm.name}
                                   onChange={e => setEditForm({...editForm, name: e.target.value})}
                                 />
                               </div>
                               <div>
                                 <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Açılış</label>
                                 <select 
                                   className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl outline-none focus:border-primary font-bold text-sm"
                                   value={editForm.open_time}
                                   onChange={e => setEditForm({...editForm, open_time: e.target.value})}
                                 >
                                   {OPEN_TIME_OPTIONS.map(time => (
                                     <option key={time} value={time}>{time}</option>
                                   ))}
                                 </select>
                               </div>
                               <div>
                                 <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Kapanış</label>
                                 <select 
                                   className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl outline-none focus:border-primary font-bold text-sm"
                                   value={editForm.close_time}
                                   onChange={e => setEditForm({...editForm, close_time: e.target.value})}
                                 >
                                   {CLOSE_TIME_OPTIONS.map(time => (
                                     <option key={time} value={time}>{time}</option>
                                   ))}
                                 </select>
                               </div>
                             </div>
                             <div className="flex justify-end gap-3">
                               <button type="button" onClick={() => setEditingId(null)} className="btn-secondary !py-2 !px-6">İptal</button>
                               <button type="submit" className="btn-premium !py-2 !px-8">Değişiklikleri Kaydet</button>
                             </div>
                           </form>
                         </td>
                       ) : (
                         <>
                           <td className="font-bold text-slate-800">{dept.name}</td>
                           <td className="text-slate-500 font-mono text-xs">{dept.open_time} - {dept.close_time}</td>
                           <td className="text-right">
                             <div className="flex justify-end gap-2">
                               <button onClick={() => startEdit(dept)} className="btn-secondary !py-1.5 !px-4 !text-xs">
                                 ⚙️ Düzenle
                               </button>
                               <button onClick={() => handleDelete(dept.id, dept.name)} className="btn-secondary !py-1.5 !px-4 !text-xs !bg-danger/10 !text-danger hover:!bg-danger hover:!text-white border-none">
                                 🗑️ Sil
                               </button>
                             </div>
                           </td>
                         </>
                       )}
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}

export default BirimAyarlari;
