import React, { useState, useEffect } from 'react';
import api from '../api';

function OgrenciGorevleri({ user }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitModal, setSubmitModal] = useState(null); 
  const [completionNote, setCompletionNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const data = await api.get('/tasks');
      setTasks(data.tasks || []);
    } catch (err) {
      console.error('Görevler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  const filteredTasks = tasks.filter(t => {
    let matchesFilter = true;
    if (activeFilter === 'todo') matchesFilter = (t.status === 'pending' || t.status === 'rejected');
    else if (activeFilter === 'review') matchesFilter = t.status === 'submitted';
    else if (activeFilter === 'done') matchesFilter = t.status === 'approved';
    
    const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const stats = {
    todo: tasks.filter(t => t.status === 'pending' || t.status === 'rejected').length,
    review: tasks.filter(t => t.status === 'submitted').length,
    done: tasks.filter(t => t.status === 'approved').length,
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!completionNote) return;
    setSubmitting(true);
    try {
      await api.put(`/tasks/submit/${submitModal.id}`, {
        completion_note: completionNote
      });
      alert('Görev başarıyla teslim edildi.');
      setSubmitModal(null);
      setCompletionNote('');
      fetchTasks();
    } catch (err) {
      alert(err || 'Görev teslim edilemedi.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending': return <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest">Yeni</span>;
      case 'submitted': return <span className="px-3 py-1 rounded-full bg-warning text-white text-[9px] font-black uppercase tracking-widest">İnceleniyor</span>;
      case 'approved': return <span className="px-3 py-1 rounded-full bg-success text-white text-[9px] font-black uppercase tracking-widest">Tamamlandı</span>;
      case 'rejected': return <span className="px-3 py-1 rounded-full bg-danger text-white text-[9px] font-black uppercase tracking-widest">Düzeltme Gerekli</span>;
      default: return null;
    }
  };

  const formatLinks = (text) => {
    if (!text) return text;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80 break-all font-bold">{part}</a>;
      }
      return part;
    });
  };

  const getDeadlineBadge = (deadline, status) => {
    if (status === 'approved') {
      return (
        <span className="px-3 py-1 rounded-full bg-success/15 text-success text-[9px] font-black uppercase tracking-widest border border-success/10">
          Onaylandı
        </span>
      );
    }
    const diffTime = new Date(deadline).setHours(0,0,0,0) - new Date().setHours(0,0,0,0);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return (
        <span className="px-3 py-1 rounded-full bg-danger/15 text-danger text-[9px] font-black uppercase tracking-widest animate-pulse border border-danger/25">
          ⚠️ Gecikmiş ({Math.abs(diffDays)} gün)
        </span>
      );
    } else if (diffDays === 0) {
      return (
        <span className="px-3 py-1 rounded-full bg-warning/15 text-warning text-[9px] font-black uppercase tracking-widest border border-warning/25">
          ⏳ Bugün Son Gün
        </span>
      );
    } else {
      return (
        <span className="px-3 py-1 rounded-full bg-info/15 text-info text-[9px] font-black uppercase tracking-widest border border-info/25">
          🕒 {diffDays} gün kaldı
        </span>
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* ÜST ÖZET KARTLARI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Yapılacak Görevler', val: stats.todo, color: 'text-primary', bg: 'bg-primary/10', icon: '📝' },
          { label: 'Teslim Edilenler', val: stats.review, color: 'text-warning', bg: 'bg-warning/10', icon: '⏳' },
          { label: 'Tamamlananlar', val: stats.done, color: 'text-success', bg: 'bg-success/10', icon: '🏆' },
        ].map((s, i) => (
          <div key={i} className="glass-card flex items-center gap-4 !py-4">
            <div className={`w-12 h-12 rounded-2xl ${s.bg} flex items-center justify-center text-2xl`}>{s.icon}</div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">{s.label}</p>
              <p className={`text-2xl font-black ${s.color}`}>{s.val}</p>
            </div>
          </div>
        ))}
      </div>

      {/* FİLTRELEME VE ARAMA ÇUBUĞU */}
      <div className="glass-card !p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'Tümü' },
            { id: 'todo', label: 'Yapılacaklar' },
            { id: 'review', label: 'Teslim Edilenler' },
            { id: 'done', label: 'Tamamlananlar' },
          ].map(btn => (
            <button 
              key={btn.id}
              onClick={() => setActiveFilter(btn.id)}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                activeFilter === btn.id ? 'bg-primary text-white shadow-lg shadow-primary/25' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[240px]">
          <input 
            type="text" 
            placeholder="Görev başlığı ara..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:border-primary transition-all"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center flex flex-col items-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
          <span className="font-bold text-slate-400 text-[10px] uppercase tracking-widest">Veriler alınıyor...</span>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="glass-card py-24 text-center">
          <div className="text-5xl mb-6 opacity-20">🍃</div>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">
            {searchTerm ? 'Aradığınız kriterlere uygun görev bulunamadı.' : 'Bu kategoride aktif görev bulunamadı.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredTasks.map(task => {
            const isOverdue = new Date(task.deadline).setHours(0,0,0,0) < new Date().setHours(0,0,0,0) && task.status !== 'approved';
            return (
              <article 
                key={task.id} 
                className={`glass-card !p-0 overflow-hidden flex flex-col justify-between group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${
                  isOverdue ? 'border-danger/35 bg-danger/[0.01]' : ''
                }`}
              >
                <div>
                  <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100 flex justify-between items-center gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {getStatusBadge(task.status)}
                      <span className="px-3 py-1 rounded-full bg-white border border-slate-100 text-[9px] font-black text-slate-400 uppercase">#{task.category}</span>
                      {!task.assigned_to && (
                        <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[9px] font-black text-primary uppercase">📢 Genel Birim Görevi</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] font-black text-slate-400 uppercase">📅 {new Date(task.deadline).toLocaleDateString('tr-TR')}</span>
                      {getDeadlineBadge(task.deadline, task.status)}
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <h4 className="text-lg font-extrabold text-slate-800 mb-3 group-hover:text-primary transition-colors">{task.title}</h4>
                    <p className="text-sm text-slate-600 leading-relaxed mb-6 line-clamp-3">{task.description || 'Açıklama girilmemiş.'}</p>
                    
                    {task.completion_note && (
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-4">
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Sizin Raporunuz</p>
                        <p className="text-xs text-slate-700 font-medium whitespace-pre-wrap">{formatLinks(task.completion_note)}</p>
                      </div>
                    )}

                    {task.manager_feedback && (
                      <div className={`p-4 rounded-2xl border mb-4 ${
                        task.status === 'rejected' ? 'bg-danger/5 border-danger/10 text-danger' : 'bg-primary/5 border-primary/10 text-slate-700'
                      }`}>
                        <p className={`text-[9px] font-black uppercase mb-1 ${task.status === 'rejected' ? 'text-danger' : 'text-primary'}`}>
                          {task.status === 'rejected' ? 'Birim Sorumlusu Red Gerekçesi' : 'Birim Sorumlusu Geri Bildirimi'}
                        </p>
                        <p className="text-xs italic font-medium">"{task.manager_feedback}"</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="p-6 pt-0 mt-auto">
                  {(task.status === 'pending' || task.status === 'rejected') && (
                    <button 
                      onClick={() => setSubmitModal(task)}
                      className="btn-premium w-full !justify-center !py-3.5 !rounded-2xl"
                    >
                      Görevi Teslim Et
                    </button>
                  )}
                  {task.status === 'approved' && (
                    <div className="bg-success/10 p-4 rounded-2xl border border-success/20 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-black text-success uppercase">Başarı Puanı:</span>
                        <div className="flex text-amber-500 text-sm ml-2">
                          {[...Array(task.performance_score)].map((_, i) => <span key={i}>★</span>)}
                        </div>
                      </div>
                      <span className="text-[10px] font-black text-success uppercase">TAMAMLANDI</span>
                    </div>
                  )}
                  {task.status === 'submitted' && (
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-slate-400 font-bold text-center text-[10px] tracking-widest uppercase flex items-center justify-center gap-2">
                      <div className="w-2 h-2 bg-warning rounded-full animate-ping"></div>
                      Değerlendirme Bekliyor
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {submitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="glass-card !p-0 max-w-2xl w-full overflow-hidden shadow-2xl animate-scale-up">
            <div className="px-8 py-6 bg-gradient-to-r from-primary to-indigo-600 text-white flex justify-between items-center">
               <div>
                 <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                   <span>📤</span> Görev Teslim Raporu
                 </h2>
                 <p className="text-[10px] text-white/70 font-black uppercase tracking-widest mt-1 opacity-80">{submitModal.title}</p>
               </div>
               <button 
                onClick={() => setSubmitModal(null)} 
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all font-bold"
               >✕</button>
            </div>
            <div className="p-8 bg-white space-y-6">
              <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Görev Hatırlatıcı</p>
                <p className="text-sm text-slate-600 font-bold leading-relaxed">{submitModal.description}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-end px-1">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Çalışma Detayları ve Notlar</label>
                    <span className="text-[10px] font-bold text-primary opacity-60">Linkler otomatik algılanır 🔗</span>
                  </div>
                  <textarea 
                    value={completionNote}
                    onChange={(e) => setCompletionNote(e.target.value)}
                    className="w-full min-h-[220px] p-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] outline-none focus:border-primary focus:bg-white focus:ring-8 focus:ring-primary/5 font-medium text-sm transition-all shadow-inner leading-relaxed"
                    placeholder="Yaptığınız işlemleri, kullandığınız kaynakları veya paylaştığınız linkleri buraya detaylıca yazın..."
                    required
                  ></textarea>
                </div>
                
                <div className="flex gap-4 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setSubmitModal(null)} 
                    className="flex-1 h-14 rounded-2xl bg-slate-100 text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Vazgeç
                  </button>
                  <button 
                    type="submit" 
                    disabled={submitting} 
                    className="flex-[2] h-14 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-40"
                  >
                    {submitting ? 'Gönderiliyor...' : 'Görevi Tamamla ve Gönder 🚀'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OgrenciGorevleri;
