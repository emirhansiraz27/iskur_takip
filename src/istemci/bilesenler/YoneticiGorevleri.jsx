import React, { useState, useEffect } from 'react';
import api from '../api';

const GOREV_KATEGORILERI = ['Genel', 'Evrak ve Arşivleme', 'Veri Girişi', 'Raporlama', 'Teknik Destek', 'İletişim ve Koordinasyon', 'Araştırma', 'Düzenleme ve Kontrol'];

function YoneticiGorevleri({ user }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [newTask, setNewTask] = useState({ title: '', description: '', student_id: '', deadline: '', category: 'Genel' });
  const [submitting, setSubmitting] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingTask, setEditingTask] = useState(null);
  const [evaluatingTask, setEvaluatingTask] = useState(null);
  const [evalScore, setEvalScore] = useState(5);
  const [evalFeedback, setEvalFeedback] = useState('');

  useEffect(() => {
    fetchTasks();
    fetchStudents();
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

  const fetchStudents = async () => {
    try {
      const data = await api.get('/dept/students/overview');
      setStudents(data.students || []);
    } catch (err) {}
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/tasks', newTask);
      setNewTask({ title: '', description: '', student_id: '', deadline: '', category: 'Genel' });
      fetchTasks();
    } catch (err) {
      alert(err || 'Görev oluşturulamadı.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.put(`/tasks/${editingTask.id}`, {
        title: newTask.title,
        description: newTask.description,
        student_id: newTask.student_id,
        deadline: newTask.deadline,
        category: newTask.category
      });
      setNewTask({ title: '', description: '', student_id: '', deadline: '', category: 'Genel' });
      setEditingTask(null);
      fetchTasks();
    } catch (err) {
      alert(err || 'Görev güncellenemedi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEvaluate = async (taskId, score, feedback) => {
    try {
      await api.put(`/tasks/evaluate/${taskId}`, { performance_score: score, manager_feedback: feedback });
      fetchTasks();
    } catch (err) {
      alert(err || 'Değerlendirme kaydedilemedi.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu görevi silmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/tasks/${id}`);
      fetchTasks();
    } catch (err) {
      alert(err || 'Görev silinemedi.');
    }
  };

  const filteredTasks = tasks.filter(t => {
    const matchesFilter = activeFilter === 'all' || t.status === activeFilter;
    const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (t.student_name && t.student_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (!t.student_name && searchTerm.toLowerCase().includes('birim geneli'));
    return matchesFilter && matchesSearch;
  });

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    submitted: tasks.filter(t => t.status === 'submitted').length,
    approved: tasks.filter(t => t.status === 'approved').length,
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Toplam Görev', val: stats.total, color: 'text-slate-600', bg: 'bg-slate-100', icon: '📋' },
          { label: 'Bekleyenler', val: stats.pending, color: 'text-primary', bg: 'bg-primary/10', icon: '⏳' },
          { label: 'İncelemedekiler', val: stats.submitted, color: 'text-warning', bg: 'bg-warning/10', icon: '🔍' },
          { label: 'Tamamlananlar', val: stats.approved, color: 'text-success', bg: 'bg-success/10', icon: '✅' },
        ].map((s, i) => (
          <div key={i} className="glass-card flex items-center gap-4 !py-4">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center text-xl`}>{s.icon}</div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider leading-none mb-1">{s.label}</p>
              <p className={`text-xl font-black ${s.color}`}>{s.val}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* SOL: GÖREV ATAMA FORMU */}
        <div className="xl:col-span-2">
          <div className="glass-card !p-0 overflow-hidden sticky top-2">
            <div className="px-6 py-5 bg-slate-50/70 border-b border-slate-100 flex items-center gap-4">
               <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-2xl">
                 {editingTask ? '📝' : '✍️'}
               </div>
               <div>
                 <h2 className="text-lg font-extrabold text-slate-800">
                   {editingTask ? 'Görevi Düzenle' : 'Yeni Görev Tanımla'}
                 </h2>
                 <p className="text-xs text-slate-400 font-semibold">
                   {editingTask ? 'Görev ayrıntılarını güncelleyin.' : 'Öğrenciye görev ve teslim tarihi atayın.'}
                 </p>
               </div>
            </div>
            <form onSubmit={editingTask ? handleUpdate : handleCreate} className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sorumlu Öğrenci</label>
                <select 
                  value={newTask.student_id}
                  onChange={(e) => setNewTask({...newTask, student_id: e.target.value})}
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:border-primary focus:bg-white"
                >
                  <option value="">Tüm Birim Öğrencileri (Genel Görev)</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Görev Konusu</label>
                <input 
                  type="text" 
                  value={newTask.title}
                  onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 font-semibold text-sm"
                  placeholder="Görev başlığını buradan girebilirsiniz"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Teslim Tarihi</label>
                   <input 
                     type="date" 
                     value={newTask.deadline}
                     onChange={(e) => setNewTask({...newTask, deadline: e.target.value})}
                     className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-primary focus:bg-white font-semibold text-sm"
                     required
                   />
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Kategori</label>
                   <select 
                     value={newTask.category}
                     onChange={(e) => setNewTask({...newTask, category: e.target.value})}
                     className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:border-primary focus:bg-white"
                   >
                     {GOREV_KATEGORILERI.map(kategori => (
                       <option key={kategori} value={kategori}>{kategori}</option>
                     ))}
                   </select>
                 </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Görev Açıklaması / Notlar</label>
                <textarea 
                  value={newTask.description}
                  onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                  className="w-full min-h-[120px] p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 font-medium text-sm resize-none"
                  placeholder="İş tanımı ve beklentiler..."
                  required
                ></textarea>
              </div>

              <div className="flex gap-3">
                {editingTask && (
                  <button 
                    type="button"
                    onClick={() => {
                      setEditingTask(null);
                      setNewTask({ title: '', description: '', student_id: '', deadline: '', category: 'Genel' });
                    }}
                    className="flex-1 h-12 rounded-2xl bg-slate-100 text-slate-500 font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Vazgeç
                  </button>
                )}
                <button 
                  type="submit"
                  disabled={submitting}
                  className="flex-[2] btn-premium !justify-center !py-3 disabled:opacity-40 disabled:grayscale"
                >
                  {submitting ? 'İşleniyor...' : (editingTask ? 'Değişiklikleri Kaydet' : 'Görevi Listeye Ekle')}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* SAĞ: GÖREV LİSTESİ VE FİLTRELEME */}
        <div className="xl:col-span-3 space-y-4">
          <div className="glass-card !p-5 flex flex-col lg:flex-row lg:items-center gap-4 bg-gradient-to-r from-slate-50 via-white to-primary/5 border border-primary/10">
             <div className="flex flex-wrap gap-2 flex-1">
               {[
                 { id: 'all', label: 'Tümü', count: stats.total, passive: 'bg-white text-slate-500 border-slate-200', active: 'bg-slate-800 text-white border-slate-800 shadow-slate-200' },
                 { id: 'pending', label: 'Bekleyenler', count: stats.pending, passive: 'bg-white text-primary border-primary/20', active: 'bg-primary text-white border-primary shadow-primary/20' },
                 { id: 'submitted', label: 'İncelemedekiler', count: stats.submitted, passive: 'bg-white text-warning border-warning/20', active: 'bg-warning text-white border-warning shadow-warning/20' },
                 { id: 'approved', label: 'Tamamlananlar', count: stats.approved, passive: 'bg-white text-success border-success/20', active: 'bg-success text-white border-success shadow-success/20' },
                 { id: 'rejected', label: 'Reddedilenler', count: tasks.filter(t => t.status === 'rejected').length, passive: 'bg-white text-danger border-danger/20', active: 'bg-danger text-white border-danger shadow-danger/20' },
               ].map(btn => (
                 <button 
                   key={btn.id}
                   onClick={() => setActiveFilter(btn.id)}
                   className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase border transition-all flex items-center gap-2 ${
                     activeFilter === btn.id ? `${btn.active} shadow-md` : `${btn.passive} hover:shadow-sm`
                   }`}
                 >
                   <span>{btn.label}</span>
                   {btn.count > 0 && (
                     <span className={`px-1.5 py-0.5 rounded-md text-[8px] ${activeFilter === btn.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                       {btn.count}
                     </span>
                   )}
                 </button>
               ))}
             </div>
             <div className="relative w-full lg:w-64">
               <input 
                 type="text" 
                 placeholder="Görev veya öğrenci ara..." 
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full h-10 px-4 bg-white border border-primary/10 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
               />
             </div>
          </div>

          <div className="glass-card !p-0 h-[600px] flex flex-col overflow-hidden">
            <div className="p-5 bg-white flex-1 overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="flex flex-col items-center py-20">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Veriler yükleniyor...</p>
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="py-20 text-center">
                  <div className="text-4xl mb-4 opacity-20">🗄️</div>
                  <div className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                    {searchTerm ? 'Aramanızla eşleşen görev bulunamadı.' : 'Bu kategoride görev bulunamadı.'}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredTasks.map(task => {
                    const isOverdue = new Date(task.deadline).setHours(0,0,0,0) < new Date().setHours(0,0,0,0) && task.status !== 'approved';
                    return (
                      <article 
                        key={task.id} 
                        className={`rounded-3xl border p-5 transition-all duration-300 ${
                          isOverdue 
                            ? 'border-danger/35 bg-danger/[0.02] shadow-sm shadow-danger/5 hover:bg-danger/[0.04]' 
                            : 'border-slate-100 bg-slate-50/60 hover:bg-white hover:shadow-sm'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-3 mb-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                              task.status === 'approved' ? 'bg-success text-white' : 
                              task.status === 'submitted' ? 'bg-warning text-white' : 
                              task.status === 'rejected' ? 'bg-danger text-white' : 'bg-primary/10 text-primary'
                            }`}>
                              {task.status === 'pending' ? 'BEKLEMEDE' : 
                               task.status === 'submitted' ? 'İNCELEMEDE' : 
                               task.status === 'approved' ? 'ONAYLANDI' : 'REDDEDİLDİ'}
                            </span>
                            <span className="px-3 py-1 rounded-full bg-white border border-slate-100 text-[9px] font-black text-slate-400 uppercase">#{task.category}</span>
                            {task.origin_dept_name && (
                              <span className="px-3 py-1 rounded-full bg-primary/5 border border-primary/10 text-[9px] font-black text-primary uppercase">🏢 {task.origin_dept_name}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            {(task.status === 'pending' || task.status === 'rejected') && (
                              <button 
                                onClick={() => {
                                  setEditingTask(task);
                                  setNewTask({
                                    title: task.title,
                                    description: task.description || '',
                                    student_id: task.assigned_to || '',
                                    deadline: task.deadline ? task.deadline.split('T')[0] : '',
                                    category: task.category || 'Genel'
                                  });
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }} 
                                className="text-[10px] font-black text-primary hover:underline"
                              >
                                Düzenle
                              </button>
                            )}
                            <button onClick={() => handleDelete(task.id)} className="text-[10px] font-black text-danger hover:underline">Sil</button>
                          </div>
                        </div>
                        
                        <div>
                          <div className="mb-3">
                            <p className="text-[10px] font-black text-primary uppercase mb-1">
                              {task.student_name ? `👤 ${task.student_name}` : '📢 Birim Geneli (Genel Görev)'}
                            </p>
                            <h4 className="text-base font-extrabold text-slate-800 leading-tight">{task.title}</h4>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed mb-4">{task.description || 'Açıklama girilmemiş.'}</p>
                          
                          {task.status === 'submitted' && (
                            <div className="bg-warning/10 p-4 rounded-2xl border border-warning/20 mb-4">
                               <p className="text-[9px] font-black text-warning uppercase mb-1">Öğrenci Teslim Notu</p>
                               <div className="text-xs text-slate-700 italic font-medium whitespace-pre-wrap mb-3">
                                 {formatLinks(task.completion_note)}
                               </div>
                               
                               <button
                                 onClick={() => {
                                   setEvaluatingTask(task);
                                   setEvalScore(5);
                                   setEvalFeedback('');
                                 }}
                                 className="w-full rounded-2xl bg-warning text-white text-[10px] font-black py-2.5 hover:bg-warning/90 transition-all shadow-md shadow-warning/10 uppercase tracking-wider"
                               >
                                 Göreve Not Ver / Değerlendir
                               </button>
                            </div>
                          )}
                          
                          {task.status === 'approved' && (
                            <div className="bg-success/5 border border-success/15 p-4 rounded-2xl mb-4">
                               <div className="flex items-center justify-between pb-2 border-b border-success/10 mb-2">
                                  <div className="flex items-center gap-1.5">
                                     <span className="text-[9px] font-black text-success uppercase">Performans Puanı:</span>
                                     <div className="flex text-amber-500 text-xs">
                                       {[...Array(task.performance_score)].map((_, i) => <span key={i}>★</span>)}
                                     </div>
                                  </div>
                                  <span className="text-[9px] font-black text-success uppercase">Tamamlandı</span>
                               </div>
                               {task.manager_feedback && (
                                 <div>
                                   <span className="text-[9px] font-black text-slate-400 uppercase">Değerlendirme Notu:</span>
                                   <p className="text-xs text-slate-600 italic mt-0.5">"{task.manager_feedback}"</p>
                                 </div>
                               )}
                            </div>
                          )}

                          {task.status === 'rejected' && task.manager_feedback && (
                            <div className="bg-danger/5 border border-danger/15 p-4 rounded-2xl mb-4">
                               <span className="text-[9px] font-black text-danger uppercase">Red Gerekçesi / Düzeltme Notu:</span>
                               <p className="text-xs text-slate-600 italic mt-0.5">"{task.manager_feedback}"</p>
                            </div>
                          )}
  
                          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                             <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase">
                               <span>📅 Son Tarih:</span>
                               <span>{new Date(task.deadline).toLocaleDateString('tr-TR')}</span>
                             </div>
                             {getDeadlineBadge(task.deadline, task.status)}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {evaluatingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="glass-card !p-0 max-w-lg w-full overflow-hidden shadow-2xl animate-scale-up">
            <div className="px-6 py-4 bg-gradient-to-r from-warning to-amber-500 text-white flex justify-between items-center">
              <div>
                <h2 className="text-base font-black tracking-tight">Görev Değerlendirme</h2>
                <p className="text-[10px] opacity-80 font-bold uppercase tracking-widest mt-0.5">{evaluatingTask.title}</p>
              </div>
              <button onClick={() => setEvaluatingTask(null)} className="text-white hover:opacity-80 font-black">✕</button>
            </div>
            <div className="p-6 bg-white space-y-4">
              {/* Score Selection */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Performans Skoru (Yıldız)</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setEvalScore(star)}
                      className={`w-10 h-10 rounded-xl border text-sm font-black transition-all flex items-center justify-center ${
                        evalScore === star
                          ? 'bg-warning border-warning text-white shadow-md shadow-warning/20'
                          : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      {star} ★
                    </button>
                  ))}
                </div>
              </div>

              {/* Feedback Input */}
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Geri Bildirim / Değerlendirme Notu</label>
                <textarea
                  value={evalFeedback}
                  onChange={(e) => setEvalFeedback(e.target.value)}
                  className="w-full min-h-[100px] p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-primary focus:bg-white text-sm font-medium resize-none leading-relaxed"
                  placeholder="Öğrenciye iletilecek değerlendirme notunu veya reddetme gerekçesini yazın..."
                  required
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (!evalFeedback.trim()) {
                      alert('Lütfen reddetme gerekçesini yazın.');
                      return;
                    }
                    await handleEvaluate(evaluatingTask.id, 0, evalFeedback);
                    setEvaluatingTask(null);
                    setEvalFeedback('');
                  }}
                  className="flex-1 py-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs font-black uppercase tracking-widest hover:bg-danger hover:text-white transition-all text-center"
                >
                  Reddet / Düzeltme İste
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await handleEvaluate(evaluatingTask.id, evalScore, evalFeedback || 'Başarıyla tamamlandı.');
                    setEvaluatingTask(null);
                    setEvalFeedback('');
                  }}
                  className="flex-1 py-3 rounded-xl bg-success text-white text-xs font-black uppercase tracking-widest shadow-md shadow-success/20 hover:shadow-lg transition-all text-center"
                >
                  Onayla & Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default YoneticiGorevleri;
