import React, { useState, useEffect } from 'react';
import api from '../../api';

function KullaniciYonetimi() {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', tc_kimlik: '', iban: '', phone: '', dept_id: '', role: '' });
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Filtreler
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterDept, setFilterDept] = useState('all');

  useEffect(() => {
    fetchData();
    fetchDepartments();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await api.get('/superadmin/users');
      setUsers(data.users || []);
    } catch (err) {
      console.error('Kullanıcılar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const data = await api.get('/superadmin/departments');
      setDepartments(data.departments || []);
    } catch (err) {
      console.error('Birimler yüklenemedi');
    }
  };

  const startEdit = (user) => {
    setEditingId(user.id);
    setEditForm({
      name: user.name || '',
      email: user.email || '',
      tc_kimlik: user.tc_kimlik || '',
      iban: user.iban || '',
      phone: user.phone || '',
      dept_id: user.dept_id || '',
      role: user.role
    });
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/superadmin/users/${editingId}`, editForm);
      setMessage({ type: 'success', text: `${editForm.name} bilgileri güncellendi.` });
      setEditingId(null);
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err || 'Güncelleme başarısız.' });
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`'${name}' kullanıcısını sistemden tamamen silmek istediğinize emin misiniz?`)) return;
    try {
      await api.delete(`/superadmin/users/${id}`);
      setMessage({ type: 'success', text: 'Kullanıcı silindi.' });
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err || 'Silme başarısız.' });
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (u.tc_kimlik || '').includes(searchTerm);
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    const matchesDept = filterDept === 'all' || u.dept_id?.toString() === filterDept;
    return matchesSearch && matchesRole && matchesDept;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {message.text && (
        <div className={`p-4 rounded-2xl font-bold text-center ${message.type === 'success' ? 'bg-success/10 text-success border border-success/20' : 'bg-danger/10 text-danger border border-danger/20'}`}>
          {message.text}
          <button onClick={() => setMessage({ type: '', text: '' })} className="ml-4 opacity-50">✕</button>
        </div>
      )}

      {/* FİLTRE PANELİ */}
      <div className="glass-card grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div className="md:col-span-2">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">İsim, E-posta veya TC İle Ara</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input 
              type="text" 
              placeholder="Kullanıcı ara..."
              className="w-full h-12 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary focus:bg-white font-semibold"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Rol Filtresi</label>
          <select 
            className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary font-bold"
            value={filterRole}
            onChange={e => setFilterRole(e.target.value)}
          >
            <option value="all">Tüm Roller</option>
            <option value="manager">Sorumlular</option>
            <option value="student">Öğrenciler</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Birim Filtresi</label>
          <select 
            className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary font-bold"
            value={filterDept}
            onChange={e => setFilterDept(e.target.value)}
          >
            <option value="all">Tüm Birimler</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="glass-card !p-0">
        <div className="p-8">
          {loading ? (
            <div className="py-20 text-center">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent animate-spin mx-auto"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUsers.length === 0 ? (
                <div className="py-20 text-center text-slate-400 font-bold italic">
                  Kriterlere uygun kullanıcı bulunamadı.
                </div>
              ) : (
                <div className="table-shell custom-scrollbar">
                  <table className="modern-table">
                    <thead>
                      <tr>
                        <th>Kullanıcı Bilgileri</th>
                        <th>Rol</th>
                        <th>Bağlı Birim</th>
                        <th className="text-right">İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map(u => (
                        <tr key={u.id} className={editingId === u.id ? 'bg-primary/5' : ''}>
                          {editingId === u.id ? (
                            <td colSpan="4" className="!p-0">
                              <form onSubmit={handleUpdateUser} className="bg-slate-50 p-6 space-y-4 animate-scale-in">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                  {/* 1. Ad Soyad */}
                                  <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Ad Soyad</label>
                                    <input 
                                      type="text" 
                                      className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl outline-none focus:border-primary font-bold"
                                      value={editForm.name}
                                      onChange={e => setEditForm({...editForm, name: e.target.value})}
                                      placeholder="Ad Soyad"
                                    />
                                  </div>
                                  
                                  {/* 2. E-posta */}
                                  <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">E-posta</label>
                                    <input 
                                      type="email" 
                                      className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl outline-none focus:border-primary font-bold"
                                      value={editForm.email}
                                      onChange={e => setEditForm({...editForm, email: e.target.value})}
                                      placeholder="E-posta"
                                    />
                                  </div>

                                  {/* 3. Telefon */}
                                  <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Telefon</label>
                                    <input 
                                      type="text" 
                                      className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl outline-none focus:border-primary font-bold"
                                      value={editForm.phone}
                                      onChange={e => setEditForm({...editForm, phone: e.target.value})}
                                      placeholder="Telefon"
                                    />
                                  </div>

                                  {/* 4. TC Kimlik */}
                                  <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">TC Kimlik</label>
                                    <input 
                                      type="text" 
                                      className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl outline-none focus:border-primary font-bold"
                                      value={editForm.tc_kimlik}
                                      onChange={e => setEditForm({...editForm, tc_kimlik: e.target.value})}
                                      placeholder="TC Kimlik"
                                    />
                                  </div>

                                  {/* 5. IBAN */}
                                  <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">IBAN</label>
                                    <input 
                                      type="text" 
                                      className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl outline-none focus:border-primary font-bold"
                                      value={editForm.iban}
                                      onChange={e => setEditForm({...editForm, iban: e.target.value})}
                                      placeholder="IBAN"
                                    />
                                  </div>

                                  {/* 6. Bağlı Birim (Taşı) */}
                                  <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Bağlı Birim (Taşı)</label>
                                    <select 
                                      className="w-full h-12 px-4 bg-white border-2 border-primary rounded-xl outline-none focus:border-primary font-bold"
                                      value={editForm.dept_id}
                                      onChange={e => setEditForm({...editForm, dept_id: e.target.value})}
                                    >
                                      <option value="">Birim Seçin...</option>
                                      {departments.map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                                
                                <div className="flex justify-end gap-3 mt-4">
                                  <button type="button" onClick={() => setEditingId(null)} className="btn-secondary !py-2 !px-6">İptal</button>
                                  <button type="submit" className="btn-premium !py-3 !px-10">Bilgileri Güncelle</button>
                                </div>
                              </form>
                            </td>
                          ) : (
                            <>
                              <td>
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${u.role === 'manager' ? 'bg-primary/10 text-primary' : 'bg-success/10 text-success'}`}>
                                    {u.name ? u.name[0].toUpperCase() : '?'}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-bold text-slate-800">{u.name || 'İsimsiz'}</span>
                                    <span className="text-xs text-slate-400">{u.email}</span>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${u.role === 'manager' ? 'bg-primary/10 text-primary' : 'bg-success/10 text-success'}`}>
                                  {u.role === 'manager' ? 'Sorumlu' : 'Öğrenci'}
                                </span>
                              </td>
                              <td>
                                <span className="font-bold text-slate-700">{u.dept_name || 'Birim Yok'}</span>
                              </td>
                              <td className="text-right">
                                <div className="flex justify-end gap-2">
                                  <button 
                                    onClick={() => startEdit(u)} 
                                    className="btn-secondary !py-1.5 !px-3 !text-[10px] !rounded-lg"
                                    title="Düzenle / Taşı"
                                  >
                                    🔄 Düzenle
                                  </button>
                                  <button 
                                    onClick={() => handleDelete(u.id, u.name)} 
                                    className="p-2 text-slate-300 hover:text-danger transition-colors"
                                    title="Sil"
                                  >
                                    🗑️
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
          )}
        </div>
      </div>
    </div>
  );
}

export default KullaniciYonetimi;
