import React, { useState, useEffect } from 'react';
import api from '../../api';

function YoneticiYonetimi() {
  const [departments, setDepartments] = useState([]);
  const [managers, setManagers] = useState([]);
  const [managerForm, setManagerForm] = useState({ name: '', email: '', password: '', dept_id: '' });
  const [editingManager, setEditingManager] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDepartments();
    fetchUsers();
  }, []);

  const fetchDepartments = async () => {
    try {
      const data = await api.get('/superadmin/departments');
      setDepartments(data.departments || []);
    } catch (err) {
      console.error('Birimler yüklenemedi');
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await api.get('/superadmin/users');
      // Filtrele: Sadece 'manager' rolündekiler
      const managerUsers = (data.users || []).filter(u => u.role === 'manager');
      setManagers(managerUsers);
    } catch (err) {
      console.error('Kullanıcılar yüklenemedi');
    }
  };

  const handleManagerSubmit = async (e) => {
    e.preventDefault();
    if (!managerForm.dept_id) {
      setMessage({ type: 'error', text: 'Lütfen bir birim seçin.' });
      return;
    }
    setLoading(true);
    try {
      const submissionData = { 
        name: managerForm.name,
        email: managerForm.email,
        password: managerForm.password,
        dept_id: Number(managerForm.dept_id)
      };
      
      await api.post('/superadmin/managers', submissionData);
      setMessage({ type: 'success', text: 'Birim Sorumlusu başarıyla oluşturuldu.' });
      setManagerForm({ name: '', email: '', password: '', dept_id: '' });
      fetchUsers();
    } catch (err) {
      setMessage({ type: 'error', text: err || 'Birim Sorumlusu eklenemedi.' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateManager = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updateData = {
        name: editingManager.name,
        email: editingManager.email,
        dept_id: Number(editingManager.dept_id),
        role: 'manager',
        status: 'approved'
      };
      await api.put(`/superadmin/users/${editingManager.id}`, updateData);
      setMessage({ type: 'success', text: 'Birim Sorumlusu başarıyla güncellendi.' });
      setEditingManager(null);
      fetchUsers();
    } catch (err) {
      setMessage({ type: 'error', text: err || 'Güncelleme başarısız.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteManager = async (id) => {
    if (!window.confirm('Bu sorumluyu silmek istediğinize emin misiniz? Birimdeki ataması kaldırılacaktır.')) return;
    try {
      await api.delete(`/superadmin/users/${id}`);
      setMessage({ type: 'success', text: 'Birim Sorumlusu silindi.' });
      fetchUsers();
    } catch (err) {
      setMessage({ type: 'error', text: err || 'Silme işlemi başarısız.' });
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {message.text && (
        <div className={`p-4 rounded-2xl font-bold text-center ${message.type === 'success' ? 'bg-success/10 text-success border border-success/20' : 'bg-danger/10 text-danger border border-danger/20'}`}>
          {message.text}
          <button onClick={() => setMessage({ type: '', text: '' })} className="ml-4 opacity-50">✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* YENİ EKLEME FORMU */}
        <div className="lg:col-span-1">
          <div className="glass-card">
            <h2 className="text-xl font-extrabold text-slate-800 mb-6 flex items-center gap-2">
              <span className="text-2xl">👤</span> Yeni Sorumlu Ekle
            </h2>
            <form onSubmit={handleManagerSubmit} className="space-y-5">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Ad Soyad</label>
                <input 
                  type="text" 
                  required
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary focus:bg-white font-semibold text-sm transition-all"
                  value={managerForm.name}
                  onChange={e => setManagerForm({...managerForm, name: e.target.value})}
                  placeholder="Örn: Ahmet Yılmaz"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">E-posta</label>
                <input 
                  type="email" 
                  required
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary focus:bg-white font-semibold text-sm transition-all"
                  value={managerForm.email}
                  onChange={e => setManagerForm({...managerForm, email: e.target.value})}
                  placeholder="ahmet@deu.edu.tr"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Şifre</label>
                <input 
                  type="password" 
                  required
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary focus:bg-white font-semibold text-sm transition-all"
                  value={managerForm.password}
                  onChange={e => setManagerForm({...managerForm, password: e.target.value})}
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Görevli Olacağı Birim</label>
                <select 
                  required
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary focus:bg-white font-bold text-sm transition-all"
                  value={managerForm.dept_id}
                  onChange={e => setManagerForm({...managerForm, dept_id: e.target.value})}
                >
                  <option value="">Birim Seçiniz...</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="btn-premium w-full !py-3 text-sm mt-2"
              >
                {loading ? 'Ekleniyor...' : 'Sorumlu Ekle ve Ata'}
              </button>
            </form>
          </div>
        </div>

        {/* SORUMLULAR TABLOSU */}
        <div className="lg:col-span-2">
          <div className="glass-card">
            <h2 className="text-xl font-extrabold text-slate-800 mb-6 flex items-center gap-2">
              <span className="text-2xl">👥</span> Birim Sorumluları Listesi
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    <th className="py-4 px-4">Ad Soyad</th>
                    <th className="py-4 px-4">E-posta Adresi</th>
                    <th className="py-4 px-4">Birim</th>
                    <th className="py-4 px-4 text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {managers.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="py-8 text-center text-slate-400 font-semibold text-sm">Henüz birim sorumlusu tanımlanmamış.</td>
                    </tr>
                  ) : (
                    managers.map(m => (
                      <tr key={m.id} className="hover:bg-slate-50/50 transition-all">
                        <td className="py-4 px-4 font-bold text-slate-800 text-sm">{m.name}</td>
                        <td className="py-4 px-4 font-medium text-slate-500 text-xs">{m.email}</td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/5 border border-primary/10 text-primary rounded-full text-xs font-bold">
                            🏢 {m.dept_name || 'Birim Yok'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right space-x-2 whitespace-nowrap">
                          <button 
                            onClick={() => setEditingManager(m)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-primary hover:text-white rounded-lg text-xs font-bold transition-all text-slate-600"
                          >
                            Düzenle
                          </button>
                          <button 
                            onClick={() => handleDeleteManager(m.id)}
                            className="px-3 py-1.5 bg-danger/10 hover:bg-danger hover:text-white rounded-lg text-xs font-bold transition-all text-danger"
                          >
                            Sil
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* DÜZENLEME MODALI */}
      {editingManager && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full animate-fade-in relative">
            <button 
              onClick={() => setEditingManager(null)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-xl font-bold"
            >
              ✕
            </button>
            <h3 className="text-lg font-extrabold text-slate-800 mb-6">Birim Sorumlusu Düzenle</h3>
            <form onSubmit={handleUpdateManager} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Ad Soyad</label>
                <input 
                  type="text" 
                  required
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary focus:bg-white font-semibold text-sm transition-all"
                  value={editingManager.name}
                  onChange={e => setEditingManager({...editingManager, name: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">E-posta</label>
                <input 
                  type="email" 
                  required
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary focus:bg-white font-semibold text-sm transition-all"
                  value={editingManager.email}
                  onChange={e => setEditingManager({...editingManager, email: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Görevli Olacağı Birim</label>
                <select 
                  required
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary focus:bg-white font-bold text-sm transition-all"
                  value={editingManager.dept_id || ''}
                  onChange={e => setEditingManager({...editingManager, dept_id: e.target.value})}
                >
                  <option value="">Birim Seçiniz...</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-4 mt-6">
                <button 
                  type="button" 
                  onClick={() => setEditingManager(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl text-sm font-extrabold transition-all"
                >
                  Vazgeç
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-1 btn-premium !py-3 text-sm"
                >
                  {loading ? 'Güncelleniyor...' : 'Güncelle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default YoneticiYonetimi;
