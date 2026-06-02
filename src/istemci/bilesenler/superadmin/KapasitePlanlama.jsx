import React, { useState, useEffect } from 'react';
import api from '../../api';

function KapasitePlanlama() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newCapacity, setNewCapacity] = useState('');
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

  const handleUpdateCapacity = async (dept) => {
    try {
      await api.put(`/superadmin/departments/${dept.id}`, {
        name: dept.name,
        open_time: dept.open_time,
        close_time: dept.close_time,
        student_capacity: parseInt(newCapacity)
      });
      setMessage({ type: 'success', text: `${dept.name} kapasitesi güncellendi.` });
      setEditingId(null);
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err || 'Güncelleme başarısız.' });
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
           <h2 className="text-xl font-extrabold text-slate-800">Birim Kapasite Planlama</h2>
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
                     <th className="text-center">Mevcut Doluluk</th>
                     <th className="text-center">Kapasite Sınırı</th>
                     <th className="text-right">İşlem</th>
                   </tr>
                 </thead>
                 <tbody>
                   {departments.map(dept => {
                     const occupancy = dept.student_capacity > 0 ? (dept.active_students / dept.student_capacity) * 100 : 0;
                     const isEditing = editingId === dept.id;
                     
                     return (
                       <tr key={dept.id}>
                         <td className="font-bold text-slate-800">{dept.name}</td>
                         <td className="text-center">
                            <div className="flex flex-col items-center gap-2">
                               <div className="w-full max-w-[120px] h-2 bg-slate-100 rounded-full overflow-hidden">
                                 <div 
                                   className={`h-full transition-all duration-1000 ${occupancy >= 100 ? 'bg-danger' : occupancy >= 80 ? 'bg-warning' : 'bg-success'}`}
                                   style={{ width: `${Math.min(occupancy, 100)}%` }}
                                 ></div>
                               </div>
                               <span className="text-[11px] font-black text-slate-500">
                                 {dept.active_students} Aktif Öğrenci
                               </span>
                            </div>
                         </td>
                         <td className="text-center font-mono font-bold text-lg">
                           {isEditing ? (
                             <input 
                               type="number" 
                               className="w-20 h-10 px-2 border-2 border-primary rounded-lg text-center outline-none animate-scale-in"
                               value={newCapacity}
                               autoFocus
                               onChange={e => setNewCapacity(e.target.value)}
                             />
                           ) : (
                             dept.student_capacity
                           )}
                         </td>
                         <td className="text-right">
                           {isEditing ? (
                             <div className="flex justify-end gap-2">
                               <button onClick={() => setEditingId(null)} className="p-2 text-slate-400 hover:text-slate-600">✕</button>
                               <button 
                                 onClick={() => handleUpdateCapacity(dept)}
                                 className="bg-primary text-white px-4 py-2 rounded-lg text-xs font-bold shadow-lg shadow-primary/20"
                               >
                                 Kaydet
                               </button>
                             </div>
                           ) : (
                             <button 
                               onClick={() => { setEditingId(dept.id); setNewCapacity(dept.student_capacity); }} 
                               className="btn-secondary !py-1.5 !px-4 !text-xs"
                             >
                               ✏️ Kapasiteyi Değiştir
                             </button>
                           )}
                         </td>
                       </tr>
                     );
                   })}
                 </tbody>
               </table>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}

export default KapasitePlanlama;
