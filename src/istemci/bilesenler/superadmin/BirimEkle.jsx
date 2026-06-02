import React, { useState } from 'react';
import api from '../../api';

function BirimEkle() {
  const [deptForm, setDeptForm] = useState({ name: '', open_time: '08:00', close_time: '17:00', student_capacity: 10 });
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleDeptSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/superadmin/departments', deptForm);
      setMessage({ type: 'success', text: 'Birim başarıyla eklendi.' });
      setDeptForm({ name: '', open_time: '08:00', close_time: '17:00', student_capacity: 10 });
    } catch (err) {
      setMessage({ type: 'error', text: err || 'Birim eklenemedi.' });
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

      <div className="glass-card max-w-2xl mx-auto">
        <h2 className="text-2xl font-extrabold text-slate-800 mb-6 flex items-center gap-3">
          <span className="text-3xl">🏢</span> Yeni Birim Ekle
        </h2>
        <form onSubmit={handleDeptSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Birim Adı</label>
            <input 
              type="text" 
              required
              className="w-full h-14 px-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all font-semibold"
              value={deptForm.name}
              onChange={e => setDeptForm({...deptForm, name: e.target.value})}
              placeholder="Örn: Kütüphane ve Dokümantasyon Daire Başkanlığı"
            />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Açılış Saati</label>
              <input 
                type="time" 
                required
                className="w-full h-14 px-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all font-semibold"
                value={deptForm.open_time}
                onChange={e => setDeptForm({...deptForm, open_time: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Kapanış Saati</label>
              <input 
                type="time" 
                required
                className="w-full h-14 px-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all font-semibold"
                value={deptForm.close_time}
                onChange={e => setDeptForm({...deptForm, close_time: e.target.value})}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Başlangıç Öğrenci Kapasitesi</label>
            <input 
              type="number" 
              required
              min="1"
              className="w-full h-14 px-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all font-semibold"
              value={deptForm.student_capacity}
              onChange={e => setDeptForm({...deptForm, student_capacity: parseInt(e.target.value)})}
            />
          </div>
          <button type="submit" className="btn-premium w-full !py-4 text-lg">Birimi Sisteme Kaydet</button>
        </form>
      </div>
    </div>
  );
}

export default BirimEkle;
