import React, { useState, useEffect } from 'react';
import api from '../api';

const ORNEK_BASLIKLAR = [
  'Genel Bilgilendirme',
  'Önemli Hatırlatma',
  'Haftalık Çalışma Programı Hakkında',
  'Görev ve Sorumluluklar Bildirimi',
  'Teknik Aksaklık ve Bakım Duyurusu',
  'Resmi Tatil ve Çalışma Saatleri',
  'Puantaj ve Bordro İşlemleri Hatırlatması',
  'Toplantı ve Koordinasyon Daveti',
  'Eğitim ve Seminer Duyurusu',
  'Kurumsal Kurallar ve İşleyiş Bildirimi',
  'Öğrenci Çalışan Memnuniyet Anketi',
  'Yeni Dönem Planlaması'
];

function YoneticiDuyurulari({ user }) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '', priority: 'normal' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const data = await api.get('/announcements');
      setAnnouncements(data.announcements || []);
    } catch (err) {
      console.error('Duyurular yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    if (e) e.preventDefault();
    if (!newAnnouncement.title || !newAnnouncement.content) {
      alert('Lütfen tüm alanları doldurun.');
      return;
    }
    
    setSubmitting(true);
    try {
      await api.post('/announcements', {
        title: newAnnouncement.title,
        content: newAnnouncement.content,
        priority: newAnnouncement.priority
      });
      setNewAnnouncement({ title: '', content: '', priority: 'normal' });
      fetchAnnouncements();
    } catch (err) {
      alert('Duyuru paylaşılamadı: ' + (err || 'Sunucu hatası'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu duyuruyu silmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/announcements/${id}`);
      fetchAnnouncements();
    } catch (err) {
      alert('Duyuru silinemedi.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* SOL: FORM */}
      <div className="lg:col-span-2">
        <div className="glass-card !p-0 overflow-hidden sticky top-2">
          <div className="px-6 py-5 bg-slate-50/70 border-b border-slate-100 flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-2xl">📢</div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-800">Yeni Duyuru Yayınla</h2>
              <p className="text-xs text-slate-400 font-semibold">Tüm öğrencilere bilgilendirme gönderin.</p>
            </div>
          </div>
          
          <form onSubmit={handleCreate} className="p-6 space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Konu Başlığı</label>
              <input 
                list="baslik-ornekleri"
                type="text" 
                value={newAnnouncement.title}
                onChange={(e) => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 font-semibold text-sm"
                placeholder="Başlık girin..."
                required
              />
              <datalist id="baslik-ornekleri">
                {ORNEK_BASLIKLAR.map((b, i) => (
                  <option key={i} value={b} />
                ))}
              </datalist>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Önem Seviyesi</label>
              <div className="grid grid-cols-3 gap-2" role="group" aria-label="Önem seviyesi seçimi">
                {[
                  { value: 'normal', label: 'NORMAL', active: 'bg-primary text-white border-primary shadow-lg shadow-primary/20' },
                  { value: 'high', label: 'ÖNEMLİ', active: 'bg-warning text-white border-warning shadow-lg shadow-warning/20' },
                  { value: 'critical', label: 'ACİL', active: 'bg-danger text-white border-danger shadow-lg shadow-danger/20' },
                ].map(priority => (
                  <button
                    key={priority.value}
                    type="button"
                    aria-pressed={newAnnouncement.priority === priority.value}
                    onClick={() => setNewAnnouncement(prev => ({...prev, priority: priority.value}))}
                    className={`h-10 rounded-2xl border text-[10px] font-black transition-all ${
                      newAnnouncement.priority === priority.value 
                        ? priority.active
                        : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-white hover:border-primary/30'
                    }`}
                  >
                    {priority.label}
                  </button>
                ))}
              </div>
              <div className="text-[10px] font-bold text-slate-400">
                Seçili seviye: <span className="text-slate-700 uppercase">{newAnnouncement.priority === 'critical' ? 'ACİL' : newAnnouncement.priority === 'high' ? 'ÖNEMLİ' : 'NORMAL'}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mesaj İçeriği</label>
              <textarea 
                value={newAnnouncement.content}
                onChange={(e) => setNewAnnouncement({...newAnnouncement, content: e.target.value})}
                className="w-full min-h-[140px] p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 font-medium text-sm resize-none"
                placeholder="Duyuru metni..."
                required
              ></textarea>
            </div>

            <button 
              type="submit"
              disabled={submitting}
              className="btn-premium w-full !justify-center !py-3 disabled:opacity-40 disabled:grayscale"
            >
              {submitting ? 'Yayınlanıyor...' : 'Duyuruyu Paylaş'}
            </button>
          </form>
          <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-100 text-[10px] font-bold text-slate-400 text-center">
             Tüm öğrencilere anlık bildirim gider.
          </div>
        </div>
      </div>

      {/* SAĞ: LİSTE */}
      <div className="lg:col-span-3">
        <div className="glass-card !p-0 h-full flex flex-col overflow-hidden">
          <div className="px-6 py-5 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between gap-4">
             <div className="flex items-center gap-4">
               <div className="w-11 h-11 rounded-2xl bg-accent/10 text-accent flex items-center justify-center text-2xl">📁</div>
               <div>
                 <h2 className="text-lg font-extrabold text-slate-800">Duyuru Arşivi</h2>
                 <p className="text-xs text-slate-400 font-semibold">Yayınlanmış birim bilgilendirmeleri.</p>
               </div>
             </div>
             <span className="text-[10px] font-black text-primary uppercase bg-primary/10 px-3 py-1 rounded-full">
               {announcements.length} Kayıt
             </span>
          </div>

          <div className="p-5 bg-white flex-1 overflow-y-auto space-y-4 custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center py-20">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Yükleniyor...</p>
              </div>
            ) : announcements.length === 0 ? (
              <div className="py-20 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                Henüz yayınlanmış bir duyuru bulunmuyor.
              </div>
            ) : (
              announcements.map(item => (
                <article key={item.id} className="rounded-3xl border border-slate-100 bg-slate-50/60 p-5 hover:bg-white hover:shadow-sm transition-all">
                  <div className="flex justify-between items-start gap-3 mb-3">
                    <div className="flex flex-wrap gap-2">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        item.priority === 'critical' ? 'bg-danger text-white' : 
                        item.priority === 'high' ? 'bg-warning text-white' : 
                        'bg-primary/10 text-primary'
                      }`}>
                        {item.priority === 'critical' ? 'ACİL' : item.priority === 'high' ? 'ÖNEMLİ' : 'DUYURU'}
                      </span>
                      {item.dept_id === null && (
                        <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-[#00305D] text-white">
                          Üniversite Geneli
                        </span>
                      )}
                    </div>
                    <button 
                      onClick={() => handleDelete(item.id)}
                      className="text-[10px] font-black text-danger hover:underline"
                    >
                      Sil
                    </button>
                  </div>
                  
                  <div>
                    <h4 className="text-base font-extrabold text-slate-800 mb-2 leading-tight">{item.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap mb-4">{item.content}</p>
                    
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[9px] font-bold text-slate-400">
                      <div className="flex items-center gap-2">
                        <span className="uppercase">👤 {item.author_name || 'Birim Sorumlusu'}</span>
                      </div>
                      <span>📅 {new Date(item.created_at).toLocaleDateString('tr-TR')}</span>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
          <div className="px-6 py-3 bg-slate-50/70 border-t border-slate-100 text-[10px] font-bold text-slate-400">
             Sistem duyuruları kalıcı olarak saklanır.
          </div>
        </div>
      </div>
    </div>
  );
}

export default YoneticiDuyurulari;
