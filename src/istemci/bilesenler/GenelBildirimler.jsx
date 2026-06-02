import React, { useState, useEffect, useRef } from 'react';
import api from '../api';

function hedefBelirle(bildirim) {
  // Eğer sunucudan doğrudan bir hedef (target) gelmişse onu kullan (en güveniliri)
  if (bildirim.target) return bildirim.target;

  const t = bildirim.type;
  const msg = (bildirim.title + ' ' + (bildirim.message || '')).toLowerCase();

  // Öncelik Sıralaması Düzenlendi: Plan kelimesi error tipinden önce kontrol edilmeli
  if (msg.includes('plan') || msg.includes('çalışma planı')) return 'planning';
  if (t === 'error' || msg.includes('görev reddedildi') || msg.includes('görev')) return 'tasks';
  if (t === 'critical' || t === 'warning') return 'timesheet';
  if (msg.includes('değerlendirme') || msg.includes('teslim')) return 'tasks';
  
  return null;
}

const TIP_YAPILANDIRMASI = {
  critical: {
    bg: 'bg-danger/10 border-danger/20',
    title: 'text-danger',
    badge: 'bg-danger text-white',
    label: 'KRİTİK',
  },
  warning: {
    bg: 'bg-warning/10 border-warning/20',
    title: 'text-warning',
    badge: 'bg-warning text-white',
    label: 'UYARI',
  },
  error: {
    bg: 'bg-danger/10 border-danger/20',
    title: 'text-danger',
    badge: 'bg-danger text-white',
    label: 'HATA',
  },
  info: {
    bg: 'bg-primary/10 border-primary/20',
    title: 'text-primary',
    badge: 'bg-primary text-white',
    label: 'BİLGİ',
  },
};

const VARSAYILAN_YAPILANDIRMA = {
  bg: 'bg-slate-50 border-slate-100',
  title: 'text-slate-800',
  badge: 'bg-slate-600 text-white',
  label: 'BİLDİRİM',
};

const SEKME_ETIKETLERI = {
  tasks:     '📋 Görevler',
  planning:  '🗓 Çalışma Planı',
  timesheet: '📊 Aylık Puantaj',
  otp:       '⏱ Mesai / OTP',
  announcements: '📢 Duyurular',
  'students-admin': '🎓 Öğrenci Kayıt ve Atama',
};

function GenelBildirimler({ user, onNavigate }) {
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef(null);
  const seenIdsRef = useRef(new Set());

  const showToast = (bildirim) => {
    const id = Date.now() + Math.random();
    const newToast = { ...bildirim, id, exiting: false };
    setToasts(prev => [...prev, newToast]);
    
    // Auto remove after 6 seconds (1s longer than progress bar)
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 500);
    }, 6000);
  };

  useEffect(() => {
    seenIdsRef.current.clear();
    setNotifications([]);
    setToasts([]);
  }, [user?.id]);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const data = await api.get('/notifications');
        if (data && data.notifications) {
          const newNotifs = data.notifications;
          
          // İlk yükleme değilse ve yeni bildirim varsa toast göster
          if (seenIdsRef.current.size > 0) {
            newNotifs.forEach(n => {
              const key = `${n.title}-${n.message}`;
              if (!seenIdsRef.current.has(key)) {
                seenIdsRef.current.add(key);
                showToast(n);
              }
            });
          } else {
            // İlk yüklemede sadece sessizce kaydet
            newNotifs.forEach(n => seenIdsRef.current.add(`${n.title}-${n.message}`));
          }
          
          setNotifications(newNotifs);
        }
      } catch (err) {
        console.error('Bildirimler yüklenemedi:', err);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000); // 10 saniyede bir kontrol
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const unreadCount = notifications.length;

  const handleNotifClick = async (notif, idx) => {
    // API'ye okundu olarak işaretle gönder
    try {
      await api.post(`/notifications/read/${notif.id}`);
      
      // Local state güncelle
      if (idx !== undefined) {
        setNotifications(prev => prev.filter((_, i) => i !== idx));
      } else {
        setNotifications(prev => prev.filter(n => n.id !== notif.id));
      }
    } catch (err) {
      console.error('Okundu işaretlenemedi:', err);
    }

    const target = hedefBelirle(notif);
    if (target && onNavigate) {
      onNavigate(target);
      setIsOpen(false);
    }
  };

  const handleMarkAsRead = async (e, notif, idx) => {
    e.stopPropagation();
    try {
      await api.post(`/notifications/read/${notif.id}`);
      setNotifications(prev => prev.filter((_, i) => i !== idx));
      // Toast varsa onu da temizle
      setToasts(prev => prev.filter(t => t.id !== notif.id));
    } catch (err) {
      console.error('Okundu işaretlenemedi:', err);
    }
  };

  const handleReadAll = async () => {
    try {
      await api.post('/notifications/read-all');
      setNotifications([]);
      setToasts([]);
    } catch (err) {
      console.error('Tümü okundu işaretlenemedi:', err);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* TOAST RENDERING */}
      <div className="toast-container">
        {toasts.map(toast => {
          const target = hedefBelirle(toast);
          return (
            <div key={toast.id} className={`toast-item ${toast.exiting ? 'exiting' : ''}`}>
              <div className={`toast-icon-box ${TIP_YAPILANDIRMASI[toast.type]?.bg || 'bg-slate-100'}`}>
                {target === 'tasks' ? '📋' : target === 'planning' ? '🗓' : '🔔'}
              </div>
              <div className="toast-content">
                <div className="toast-title">{toast.title}</div>
                <div className="toast-message">{toast.message}</div>
                <div className="toast-action">
                   {target && (
                    <button 
                      onClick={() => handleNotifClick(toast)} 
                      className="toast-btn-go"
                    >
                      İşleme Git →
                    </button>
                   )}
                   <button 
                     onClick={(e) => handleMarkAsRead(e, toast)}
                     className="toast-btn-go !bg-slate-100 !text-slate-500"
                   >
                     Kapat
                   </button>
                </div>
              </div>
              <div className="toast-progress" style={{ animationDuration: '6s' }}></div>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`notification-button ${isOpen ? 'active' : ''}`}
        aria-label="Bildirimler"
      >
        <span className="notification-mark" aria-hidden="true"></span>
        {unreadCount > 0 && (
          <span className="notification-count">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-86 max-w-[calc(100vw-2rem)] bg-white rounded-3xl border border-slate-100 shadow-2xl z-50 overflow-hidden">
          <div className="px-5 py-4 bg-slate-50/80 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800">Bildirimler</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sistem hareketleri</p>
            </div>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button 
                  onClick={handleReadAll}
                  className="text-[9px] font-black text-primary hover:underline uppercase"
                >
                  Tümünü Oku
                </button>
              )}
              <span className="text-[10px] font-black px-3 py-1 rounded-full bg-primary/10 text-primary">{unreadCount} Yeni</span>
            </div>
          </div>

          <div className="max-h-[360px] overflow-y-auto bg-white p-3 custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-10 text-center">
                <p className="font-bold text-slate-300 text-[10px] uppercase tracking-widest">Tüm bildirimler okundu.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map((notif, idx) => {
                  const cfg = TIP_YAPILANDIRMASI[notif.type] || VARSAYILAN_YAPILANDIRMA;
                  const target = hedefBelirle(notif);
                  const isClickable = !!target && !!onNavigate;

                  return (
                    <div
                      key={idx}
                      onClick={() => handleNotifClick(notif, idx)}
                      className={`p-4 rounded-2xl border group transition-all ${cfg.bg} ${isClickable ? 'cursor-pointer hover:shadow-sm hover:-translate-y-0.5' : 'cursor-default'}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h4 className={`${cfg.title} text-xs font-extrabold leading-tight truncate uppercase`}>{notif.title}</h4>
                          <button 
                            onClick={(e) => handleMarkAsRead(e, notif, idx)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/50 rounded-lg transition-all"
                            title="Okundu İşaretle"
                          >
                            <span className="text-xs">✕</span>
                          </button>
                        </div>
                        <p className="text-slate-600 text-xs leading-relaxed mb-2">{notif.message}</p>
                        <div className="flex items-center justify-between">
                          {isClickable ? (
                            <div className="text-[9px] font-black text-primary uppercase tracking-widest">
                              Hemen Git: {SEKME_ETIKETLERI[target]?.split(' ')[1] || target}
                            </div>
                          ) : <div />}
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${cfg.badge}`}>
                            {cfg.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          <div className="p-3 bg-slate-50/80 border-t border-slate-100 text-center">
             <button 
               onClick={() => setIsOpen(false)}
               className="text-[10px] font-black text-slate-400 hover:text-slate-700 uppercase tracking-widest"
             >
               Paneli Kapat
             </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default GenelBildirimler;
