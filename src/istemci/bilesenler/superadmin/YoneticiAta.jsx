import React, { useState, useEffect } from 'react';
import api from '../../api';

function YoneticiAta() {
  const [departments, setDepartments] = useState([]);
  const [managerForm, setManagerForm] = useState({ name: '', password: '', email: '', dept_id: '' });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const data = await api.get('/superadmin/departments');
      setDepartments(data.departments || []);
    } catch (err) {
      console.error('Birimler yüklenemedi');
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
        ...managerForm
      };
      
      await api.post('/superadmin/managers', submissionData);
      setMessage({ type: 'success', text: 'Birim Sorumlusu başarıyla atandı.' });
      setManagerForm({ name: '', password: '', email: '', dept_id: '' });
    } catch (err) {
      setMessage({ type: 'error', text: err || 'Birim Sorumlusu eklenemedi.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {message.text && (
        <div className={`p-4 rounded-2xl font-bold text-center ${message.type === 'success' ? 'bg-success/10 text-success border border-success/20' : 'bg-danger/10 text-danger border border-danger/20'}`}>
          {message.text}
          <button onClick={() => setMessage({ type: '', text: '' })} className="ml-4 opacity-50">✕</button>
        </div>
      )}

      <div className="glass-card max-w-3xl mx-auto">
        <h2 className="text-2xl font-extrabold text-slate-800 mb-8 flex items-center gap-3">
          <span className="text-3xl">👤</span> Birime Sorumlu Ata
        </h2>
        <form onSubmit={handleManagerSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Ad Soyad</label>
              <input 
                type="text" 
                required
                className="w-full h-14 px-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-primary focus:bg-white font-semibold"
                value={managerForm.name}
                onChange={e => setManagerForm({...managerForm, name: e.target.value})}
                placeholder="Örn: Ahmet Yılmaz"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">E-posta (Giriş İçin Kullanılacak)</label>
              <input 
                type="email" 
                required
                className="w-full h-14 px-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-primary focus:bg-white font-semibold"
                value={managerForm.email}
                onChange={e => setManagerForm({...managerForm, email: e.target.value})}
                placeholder="ahmet@deu.edu.tr"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Geçici Şifre</label>
              <input 
                type="password" 
                required
                className="w-full h-14 px-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-primary focus:bg-white font-semibold"
                value={managerForm.password}
                onChange={e => setManagerForm({...managerForm, password: e.target.value})}
                placeholder="••••••••"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Sorumlu Olacağı Birim</label>
            <select 
              required
              className="w-full h-14 px-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-primary focus:bg-white font-bold"
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
            className="btn-premium w-full !py-4 text-lg"
          >
            {loading ? 'İşleniyor...' : 'Birim Sorumlusunu Oluştur ve Ata'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default YoneticiAta;
