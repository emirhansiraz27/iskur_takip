import React, { useState, useEffect } from 'react';
import api from '../../api';

function GenelDuyurular() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newAnn, setNewAnn] = useState({ title: '', content: '', priority: 'normal' });
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const data = await api.get('/superadmin/announcements');
      setAnnouncements(data.announcements || []);
    } catch (err) {
      console.error('Duyurular yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/superadmin/announcements', newAnn);
      setMessage({ type: 'success', text: 'Genel duyuru başarıyla yayınlandı.' });
      setNewAnn({ title: '', content: '', priority: 'normal' });
      fetchAnnouncements();
    } catch (err) {
      setMessage({ type: 'error', text: err || 'Duyuru yayınlanamadı.' });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu duyuruyu silmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/superadmin/announcements/${id}`);
      fetchAnnouncements();
    } catch (err) {
      alert('Silme işlemi başarısız.');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {message.text && (
        <div className={`p-4 rounded-2xl font-bold text-center ${message.type === 'success' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
          {message.text}
          <button onClick={() => setMessage({ type: '', text: '' })} className="ml-4">✕</button>
        </div>
      )}

      {/* CREATE FORM */}
      <div className="glass-card">
        <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
          <span>📢</span> Yeni Genel Duyuru Yayınla
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Duyuru Başlığı</label>
            <input 
              type="text" 
              required 
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-primary"
              value={newAnn.title}
              onChange={e => setNewAnn({...newAnn, title: e.target.value})}
              placeholder="Örn: Bayram Tatili Hakkında Önemli Bilgilendirme"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Duyuru İçeriği</label>
            <textarea 
              required 
              rows="4"
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-primary resize-none"
              value={newAnn.content}
              onChange={e => setNewAnn({...newAnn, content: e.target.value})}
              placeholder="Duyuru metnini buraya yazınız..."
            />
          </div>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Öncelik Seviyesi</label>
              <select 
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-primary font-bold text-sm"
                value={newAnn.priority}
                onChange={e => setNewAnn({...newAnn, priority: e.target.value})}
              >
                <option value="normal">Düşük (Normal)</option>
                <option value="high">Orta (Yüksek)</option>
                <option value="critical">Önemli (Kritik)</option>
                <option value="urgent">ACİL (Hemen Aksiyon)</option>
              </select>
            </div>
            <div className="flex items-end">
              <button type="submit" className="btn-premium h-12 !px-12 whitespace-nowrap">Duyuruyu Yayınla</button>
            </div>
          </div>
        </form>
      </div>

      {/* LIST */}
      <div className="glass-card !p-0 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
          <h2 className="text-xl font-extrabold text-slate-800">Yayındaki Genel Duyurular</h2>
          <button onClick={fetchAnnouncements} className="text-xs font-bold text-primary hover:underline">Tazele</button>
        </div>
        <div className="p-8">
          {loading ? (
            <div className="py-20 text-center text-slate-400 font-bold uppercase text-xs">Yükleniyor...</div>
          ) : announcements.length === 0 ? (
            <div className="py-20 text-center italic text-slate-400">Henüz yayınlanmış bir genel duyuru bulunmuyor.</div>
          ) : (
            <div className="space-y-4">
              {announcements.map(ann => (
                <div key={ann.id} className="p-6 border border-slate-100 rounded-3xl bg-slate-50/30 hover:bg-white transition-colors group relative">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <span className={`w-3 h-3 rounded-full ${
                        ann.priority === 'urgent' ? 'bg-danger animate-pulse' : 
                        ann.priority === 'critical' ? 'bg-danger' :
                        ann.priority === 'high' ? 'bg-[#ffc601]' : 'bg-success'
                      }`}></span>
                      <h3 className="font-black text-slate-800">{ann.title}</h3>
                    </div>
                    <button 
                      onClick={() => handleDelete(ann.id)}
                      className="text-xs font-bold text-danger/50 hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      SİL
                    </button>
                  </div>
                  <p className="text-sm text-slate-600 mb-4 whitespace-pre-wrap leading-relaxed">{ann.content}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase">
                      Yayınlayan: {ann.author_name}
                    </span>
                    <span className="text-[10px] font-black text-slate-400 uppercase">
                      {new Date(ann.created_at).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GenelDuyurular;
