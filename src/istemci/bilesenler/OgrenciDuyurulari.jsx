import React, { useState, useEffect } from 'react';
import api from '../api';

function OgrenciDuyurulari({ user }) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="space-y-6">
      <div className="glass-card !p-0 overflow-hidden">
        <div className="px-8 py-6 bg-slate-50/70 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-2xl">📢</div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-800">Kurumsal Duyurular</h2>
              <p className="text-xs text-slate-400 font-semibold">Birim tarafından yayınlanan güncel bilgilendirmeler.</p>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-success"></span>
            {announcements.length} Duyuru
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="py-20 text-center flex flex-col items-center">
              <div className="w-9 h-9 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
              <span className="font-bold text-primary text-[10px] uppercase tracking-widest">Duyurular yükleniyor...</span>
            </div>
          ) : announcements.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/70 p-16 text-center">
              <div className="text-5xl mb-4 opacity-30">📭</div>
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Henüz bir duyuru yayınlanmadı.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {announcements.map(item => (
                <article key={item.id} className="group bg-white border border-slate-100 rounded-3xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col min-h-[240px]">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex flex-wrap gap-2">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        item.priority === 'critical' ? 'bg-danger text-white' :
                        item.priority === 'high' ? 'bg-warning text-white' : 'bg-primary/10 text-primary'
                      }`}>
                        {item.priority === 'critical' ? 'Acil' : item.priority === 'high' ? 'Önemli' : 'Bilgi'}
                      </span>
                      {item.dept_id === null && (
                        <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-[#00305D] text-white">
                          Üniversite Geneli
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">
                      {new Date(item.created_at).toLocaleDateString('tr-TR')}
                    </span>
                  </div>

                  <h3 className="text-base font-extrabold text-slate-800 leading-tight mb-3 group-hover:text-primary transition-colors">{item.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap flex-1 custom-scrollbar overflow-y-auto max-h-36 pr-1">{item.content}</p>

                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-400">
                    <span className="uppercase">👤 {item.author_name || 'Sistem'}</span>
                    <span className="text-primary">Aktif</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default OgrenciDuyurulari;
