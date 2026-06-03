import React, { useState, useEffect } from 'react';
import api from './api';
import Giris from './bilesenler/Giris';
import SagPanel from './bilesenler/SagPanel';
import OgrenciPlanlayici from './bilesenler/OgrenciPlanlayici';
import YoneticiPaneli from './bilesenler/YoneticiPaneli';
import OgrenciOtp from './bilesenler/OgrenciOtp';
import YoneticiOtp from './bilesenler/YoneticiOtp';
import OgrenciPuantaj from './bilesenler/OgrenciPuantaj';
import YoneticiPuantaj from './bilesenler/YoneticiPuantaj';
import YoneticiGorevleri from './bilesenler/YoneticiGorevleri';
import OgrenciGorevleri from './bilesenler/OgrenciGorevleri';
import GenelBildirimler from './bilesenler/GenelBildirimler';
import YoneticiDuyurulari from './bilesenler/YoneticiDuyurulari';
import OgrenciDuyurulari from './bilesenler/OgrenciDuyurulari';
import YoneticiOgrenciler from './bilesenler/YoneticiOgrenciler';
import BirimEkle from './bilesenler/superadmin/BirimEkle';
import BirimAyarlari from './bilesenler/superadmin/BirimAyarlari';
import KapasitePlanlama from './bilesenler/superadmin/KapasitePlanlama';
import Odemeler from './bilesenler/superadmin/Odemeler';
import GenelDuyurular from './bilesenler/superadmin/GenelDuyurular';
import TatilYonetimi from './bilesenler/superadmin/TatilYonetimi';
import YoneticiYonetimi from './bilesenler/superadmin/YoneticiYonetimi';
import OgrenciYonetimiAdmin from './bilesenler/superadmin/OgrenciYonetimiAdmin';

function tokenPayloadAl(token) {
  try {
    const payload = token.split('.')[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(normalized));
  } catch (err) {
    return null;
  }
}

function Uygulama() {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (!token || !savedUser) return null;

    try {
      const parsedUser = JSON.parse(savedUser);
      const payload = tokenPayloadAl(token);
      if (!payload || payload.id !== parsedUser.id || payload.role !== parsedUser.role) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        return null;
      }
      return parsedUser;
    } catch (err) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return null;
    }
  });
  const [activeTab, setActiveTab] = useState('planning');
  const [deptInfo, setDeptInfo] = useState(null);
  const [isEditingRevision, setIsEditingRevision] = useState(false);
  const [managerName, setManagerName] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [initialUsersFilter, setInitialUsersFilter] = useState('all');

  const handleNavigate = (targetTab, filterVal = null) => {
    setActiveTab(targetTab);
    if (targetTab === 'students-admin') {
      setInitialUsersFilter(filterVal || 'approved');
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.get('/profile')
        .then(data => {
          if (data.user) {
            const { documents, course_schedule_matrix, ...sanitizedUser } = data.user;
            localStorage.setItem('user', JSON.stringify(sanitizedUser));
            setUser(data.user);
          }
        })
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        });
    }
  }, []);

  useEffect(() => {
    if (!user || !user.dept_id) {
      setDeptInfo(null);
      return;
    }

    api.get('/user/department')
      .then(data => setDeptInfo(data.department))
      .catch(() => {});
      
    if (user.role === 'student') {
      api.get('/dept/manager')
        .then(data => {
            setManagerName(data.manager?.name || '');
            setManagerEmail(data.manager?.email || '');
        })
        .catch(() => {});
    }
  }, [user?.id, user?.dept_id]);

  // If super_admin, default to first tab
  // Sadece giriş yapıldığında varsayılan sekmeyi ayarla
  useEffect(() => {
    if (user) {
      if (user.role === 'super_admin') setActiveTab('add-dept');
      else if (user.role === 'manager') setActiveTab('students');
      else setActiveTab('planning');
    }
  }, [user?.id]); // Sadece kullanıcı değiştiğinde (giriş/çıkış) çalışır

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setActiveTab('planning');
    setDeptInfo(null);
    setIsEditingRevision(false);
  };

  if (!user) return <Giris onLogin={setUser} />;

  if (user && user.role === 'student' && user.status === 'revision_required' && isEditingRevision) {
    return (
      <Giris
        onLogin={setUser}
        revisionUser={user}
        onRevisionSubmitted={(updatedUser) => {
          setUser(updatedUser);
          setIsEditingRevision(false);
        }}
        onCancelRevision={() => setIsEditingRevision(false)}
      />
    );
  }

  // Eğer kullanıcı öğrenci ise ve durumu 'assigned' (Atandı) değilse kısıtlı ekranı göster
  if (user && user.role === 'student' && user.status !== 'assigned') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100 p-6">
        <div className="glass-card max-w-md w-full text-center space-y-6 !p-8 shadow-xl">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-4xl bg-white/80 shadow-md">
              {user.status === 'pending' ? '⏳' : user.status === 'approved' ? '✅' : user.status === 'revision_required' ? '📝' : '❌'}
            </div>
          </div>
          
          <div>
            <h2 className="text-2xl font-extrabold text-slate-800">
              {user.status === 'pending' && 'Başvurunuz Alındı'}
              {user.status === 'approved' && 'Başvurunuz Onaylandı'}
              {user.status === 'revision_required' && 'Başvurunuz İçin Düzeltme Gerekiyor'}
              {user.status === 'rejected' && 'Başvurunuz Reddedildi'}
              {user.status === 'permanently_rejected' && 'Başvurunuz Kesin Olarak Reddedildi'}
            </h2>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">Başvuru Durum Takibi</p>
          </div>
          
          <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-6 text-left space-y-4">
            <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
              <span className="text-slate-400 font-semibold">Öğrenci:</span>
              <span className="text-slate-700 font-bold">{user.name}</span>
            </div>
            
            <div className="text-sm">
              <p className="text-slate-500 font-medium text-center leading-relaxed">
                {user.status === 'pending' && 'Başvurunuz sistem yöneticisi tarafından incelenmektedir. Belgeleriniz onaylandıktan sonra birime atamanız yapılacaktır.'}
                {user.status === 'approved' && 'Başvurunuz başarıyla onaylandı. Sistem yöneticisi tarafından uygun bir birime atamanız yapılacaktır. Lütfen bekleyiniz.'}
                {user.status === 'revision_required' && 'Sistem yöneticisi başvurunuzda düzeltme gerektiren eksikler tespit etti. Lütfen aşağıdaki açıklamayı inceleyin.'}
                {user.status === 'rejected' && 'Başvurunuz sistem yöneticisi tarafından incelenmiş ve uygun görülmeyerek reddedilmiştir. Detaylı bilgi için yönetimle iletişime geçebilirsiniz.'}
                {user.status === 'permanently_rejected' && 'Başvurunuz program şartlarını karşılamadığı için kesin olarak reddedilmiştir. Bu karar sonrası tekrar başvuru yapılamaz.'}
              </p>
              {(user.status === 'rejected' || user.status === 'revision_required' || user.status === 'permanently_rejected') && user.rejection_reason && (
                <div className={`${user.status === 'revision_required' ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'} border rounded-xl p-3.5 mt-4 text-left`}>
                  <span className={`text-[10px] ${user.status === 'revision_required' ? 'text-amber-600' : 'text-red-500'} font-black uppercase tracking-wider block mb-1`}>
                    {user.status === 'revision_required' ? 'Düzeltme Açıklaması:' : 'Reddedilme Gerekçesi:'}
                  </span>
                  <p className={`text-xs ${user.status === 'revision_required' ? 'text-amber-700' : 'text-red-700'} font-bold leading-normal`}>{user.rejection_reason}</p>
                </div>
              )}
            </div>
          </div>

          {user.status === 'revision_required' && (
            <button 
              onClick={() => setIsEditingRevision(true)}
              className="w-full bg-primary text-white rounded-2xl py-3 px-6 text-sm font-extrabold shadow-md hover:bg-primary-dark transition-all uppercase tracking-wider"
            >
              Başvurumu Düzenle
            </button>
          )}

          <button 
            onClick={handleLogout} 
            className="w-full bg-slate-800 text-white rounded-2xl py-3 px-6 text-sm font-extrabold shadow-md hover:bg-slate-700 transition-all uppercase tracking-wider"
          >
            Çıkış Yap
          </button>
        </div>
      </div>
    );
  }

  const tabs = user.role === 'super_admin'
    ? [
        { id: 'add-dept',      label: 'Birim Ekle', icon: '🏢' },
        { id: 'edit-dept',     label: 'Birim Ayarları Düzenle', icon: '⚙️' },
        { id: 'capacity',      label: 'Kapasite Planlama', icon: '📊' },
        { id: 'managers',      label: 'Birim Sorumluları', icon: '👤' },
        { id: 'students-admin',label: 'Öğrenci Kayıt ve Atama', icon: '🎓' },
        { id: 'payments',      label: 'Ödemeler', icon: '💰' },
        { id: 'announcements', label: 'Genel Duyurular', icon: '📢' },
        { id: 'holidays',      label: 'Tatil Yönetimi', icon: '📅' },
      ]
    : user.role === 'manager'
    ? [
        { id: 'students',      label: 'Öğrenciler', icon: '👥' },
        { id: 'planning',      label: 'Çalışma Planı', icon: '🗓' },
        { id: 'otp',           label: 'Mesai / OTP', icon: '⏱' },
        { id: 'timesheet',     label: 'Aylık Puantaj', icon: '📊' },
        { id: 'tasks',         label: 'Görevler', icon: '📋' },
        { id: 'announcements', label: 'Duyurular', icon: '📢' },
      ]
    : [
        { id: 'planning',      label: 'Çalışma Planı', icon: '🗓' },
        { id: 'otp',           label: 'Mesai / OTP', icon: '⏱' },
        { id: 'timesheet',     label: 'Aylık Puantaj', icon: '📊' },
        { id: 'tasks',         label: 'Görevler', icon: '📋' },
        { id: 'announcements', label: 'Duyurular', icon: '📢' },
      ];



  return (
    <div className="app-container">
      {/* SIDEBAR */}
      <aside className="modern-sidebar">
        <div className="sidebar-logo">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center overflow-hidden bg-white/10 border border-white/10">
            <img src="/deu-logo-white.png" alt="Dokuz Eylül Üniversitesi" className="w-10 h-10 object-contain" />
          </div>
          <div>
            <h2 className="text-xl font-bold leading-tight">İŞKUR TAKİP</h2>
            <div className="flex flex-col leading-tight mt-1">
              <span className="text-[11px] text-primary-light font-bold uppercase tracking-widest">{user.role === 'super_admin' ? 'SİSTEM MERKEZİ' : (deptInfo?.name || 'Enterprise v3.0')}</span>
              {deptInfo?.open_time && deptInfo?.close_time && user.role !== 'super_admin' && (
                <span className="text-[10px] text-white/45 font-semibold tracking-wider mt-0.5">
                  {deptInfo.open_time} - {deptInfo.close_time}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="sidebar-user-card">
           <p className="text-sm font-bold truncate">{user.name}</p>
           <p className="text-[10px] text-white/50 uppercase">
             {user.role === 'super_admin' ? 'Sistem Yöneticisi' : user.role === 'manager' ? 'Birim Sorumlusu' : 'Öğrenci'}
           </p>
           {user.role === 'student' && managerName && (
             <div className="mt-1.5 flex flex-col gap-0.5">
               <p className="text-[10px] text-white/40 truncate font-medium">
                 Sorumlu: <span className="text-white/60 font-bold">{managerName}</span>
               </p>
                {managerEmail && (
                  <p className="text-[9px] text-primary-light/80 font-semibold truncate tracking-wider">
                    {managerEmail}
                  </p>
                )}
             </div>
           )}
        </div>

        <nav className="sidebar-nav">
          {tabs.map(tab => (
            <div 
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setInitialUsersFilter('all');
              }}
              className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span>{tab.label}</span>
            </div>
          ))}
        </nav>

        <div className="sidebar-logout">
           <button onClick={handleLogout} className="logout-button">
              <span>Çıkış Yap</span>
           </button>
        </div>
      </aside>

      {/* MAIN STAGE */}
      <main className="main-stage">
        <header className="stage-header !border-none !pb-0">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-800">{tabs.find(t => t.id === activeTab)?.label}</h1>
              <p className="text-sm text-slate-400 font-medium">{user.role === 'super_admin' ? 'Sistem Yöneticisi' : user.role === 'manager' ? 'Birim Sorumlusu' : 'Öğrenci Paneli'}</p>
            </div>
           <div className="flex items-center gap-6">
              <GenelBildirimler user={user} onNavigate={handleNavigate} />
           </div>
        </header>

        <div className="stage-layout">
          <div className="content-area custom-scrollbar">
             {/* Component Rendering */}
             <div className="animate-fade-in">
               {user.role === 'super_admin' && activeTab === 'add-dept'   && <BirimEkle />}
               {user.role === 'super_admin' && activeTab === 'edit-dept'  && <BirimAyarlari />}
               { user.role === 'super_admin' && activeTab === 'managers' && <YoneticiYonetimi />}
               { user.role === 'super_admin' && activeTab === 'capacity'   && <KapasitePlanlama />}
               { user.role === 'super_admin' && activeTab === 'payments'   && <Odemeler />}
               { user.role === 'super_admin' && activeTab === 'announcements' && <GenelDuyurular />}
               { user.role === 'super_admin' && activeTab === 'holidays' && <TatilYonetimi />}
               {user.role === 'super_admin' && activeTab === 'students-admin' && (
                 <OgrenciYonetimiAdmin 
                   initialFilter={initialUsersFilter} 
                   onClearFilter={() => setInitialUsersFilter('all')} 
                 />
               )}
               { user.role === 'student'  && activeTab === 'planning'      && <OgrenciPlanlayici user={user} />}
               {user.role === 'manager'  && activeTab === 'planning'      && <YoneticiPaneli user={user} />}
               {user.role === 'student'  && activeTab === 'otp'           && <OgrenciOtp user={user} />}
               {user.role === 'manager'  && activeTab === 'otp'           && <YoneticiOtp user={user} />}
               {user.role === 'student'  && activeTab === 'timesheet'     && <OgrenciPuantaj user={user} />}
               {user.role === 'manager'  && activeTab === 'timesheet'     && <YoneticiPuantaj user={user} />}
               {user.role === 'manager'  && activeTab === 'tasks'         && <YoneticiGorevleri user={user} />}
               {user.role === 'student'  && activeTab === 'tasks'         && <OgrenciGorevleri user={user} />}
               {user.role === 'manager'  && activeTab === 'students'      && <YoneticiOgrenciler user={user} />}
               {user.role === 'manager'  && activeTab === 'announcements' && <YoneticiDuyurulari user={user} />}
               {user.role === 'student'  && activeTab === 'announcements' && <OgrenciDuyurulari user={user} />}
             </div>
          </div>

          {/* RIGHT SIDEBAR WITH DATA */}
          {user.role !== 'super_admin' && <SagPanel user={user} />}
        </div>
      </main>
    </div>

  );
}

export default Uygulama;
