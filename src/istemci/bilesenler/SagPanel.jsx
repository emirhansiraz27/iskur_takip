import React, { useState, useEffect } from 'react';
import api from '../api';

function SagPanel({ user }) {
  const [stats, setStats] = useState(null);
  const [studentStats, setStudentStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchManagerStats = async () => {
      setLoading(true);
      try {
        const data = await api.get('/dept/students/overview');
        // Support both new and legacy response shapes
        const students = (data.students || data?.studentsList || []);
        const total = students.length;
        const critical = students.filter(s => {
          const programMonths = s.program_duration_months ?? s.programMonths ?? 0;
          const absent = s.absent_days ?? s.absentDays ?? 0;
          const limit = programMonths <= 6 ? 7 : 10;
          return absent >= limit - 1;
        }).length;
        const terminated = students.filter(s => s.is_terminated === 1 || s.terminated === true).length;
        setStats({ total, critical, terminated });
      } catch (err) {
        console.error('Sağ panel istatistik hatası:', err);
      } finally {
        setLoading(false);
      }
    };

    const fetchStudentStats = async () => {
      setLoading(true);
      try {
        const data = await api.get('/user/stats');
        setStudentStats(data);
      } catch (err) {
        console.error("Öğrenci istatistik hatası:", err);
      } finally {
        setLoading(false);
      }
    };

    if (user.role === 'manager') {
      fetchManagerStats();
    } else {
      fetchStudentStats();
    }
  }, [user]);

  if (!user) return null;

  const tarihKarti = (
    <div className="widget-card !bg-primary/90 !text-white border border-slate-600 shadow-lg shadow-primary/30 animate-fade-in p-6 rounded-2xl backdrop-blur-sm">
      <div className="widget-title !text-white"><span>📅</span> Tarih ve Saat</div>
      <div className="text-lg font-extrabold">
        {now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
      </div>
      <div className="text-3xl font-black mt-2 tracking-tight">
        {now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </div>
      <p className="text-[10px] opacity-70 mt-2 uppercase font-black tracking-widest">
        {now.toLocaleDateString('tr-TR', { weekday: 'long' })}
      </p>
    </div>
  );

  if (user.role !== 'manager') {
    const todayPlan = studentStats?.today_plan;
    const todayAtt = studentStats?.today_attendance;

    return (
      <aside className="right-widgets">
        {tarihKarti}
        
        {/* BUGÜNÜN MESAİSİ */}
        <div className="widget-card animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="widget-title"><span>🕒</span> Bugünün Mesaisi</div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className={`p-3 rounded-2xl border ${todayAtt?.check_in ? 'bg-success/5 border-success/20' : 'bg-slate-50 border-slate-100'}`}>
              <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Giriş</p>
              <p className={`text-sm font-black ${todayAtt?.check_in ? 'text-success' : 'text-slate-700'}`}>
                {todayAtt?.check_in || todayPlan?.in || '--:--'}
              </p>
            </div>
            <div className={`p-3 rounded-2xl border ${todayAtt?.check_out ? 'bg-success/5 border-success/20' : 'bg-slate-50 border-slate-100'}`}>
              <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Çıkış</p>
              <p className={`text-sm font-black ${todayAtt?.check_out ? 'text-success' : 'text-slate-700'}`}>
                {todayAtt?.check_out || todayPlan?.out || '--:--'}
              </p>
            </div>
          </div>
          {!todayAtt?.check_in && todayPlan && (
            <p className="text-[9px] font-bold text-warning mt-3 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-warning rounded-full animate-pulse"></span>
              Giriş Yapmayı Unutmayın!
            </p>
          )}
        </div>

        {/* AYIK KATILIM DURUMU */}
        <div className="widget-card animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="widget-title"><span>📊</span> Devam Takip (Bu Ay)</div>
          <div className="flex justify-between items-end mt-4">
            <div className="space-y-1">
              <p className="text-[9px] font-black text-slate-400 uppercase leading-none">Bu Ay Katılım</p>
              <p className="text-3xl font-black text-success leading-none">{studentStats?.month_attended || 0}</p>
            </div>
            <div className="space-y-1 text-right">
              <p className="text-[9px] font-black text-slate-400 uppercase leading-none">Bu Ay Devamsızlık</p>
              <p className="text-3xl font-black text-danger leading-none">{studentStats?.month_absent || 0}</p>
            </div>
          </div>
          <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
            <div 
              className="h-full bg-success" 
              style={{ width: `${(studentStats?.month_attended / (studentStats?.month_attended + studentStats?.month_absent || 1)) * 100}%` }}
            ></div>
            <div 
              className="h-full bg-danger" 
              style={{ width: `${(studentStats?.month_absent / (studentStats?.month_attended + studentStats?.month_absent || 1)) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* GENEL DURUM (PASTA GRAFİĞİ) */}
        <div className="widget-card animate-fade-in" style={{ animationDelay: '0.25s' }}>
          <div className="widget-title"><span>🥧</span> Genel Durum</div>
          <div className="mt-4 flex items-center">
            {/* CSS Donut Chart */}
            <div className="relative w-16 h-16 rounded-full shrink-0 shadow-inner" 
              style={{
                background: `conic-gradient(#10b981 ${((studentStats?.total_attended || 0) / ((studentStats?.total_attended || 0) + (studentStats?.total_absent || 0) || 1)) * 100}%, #ef4444 0)`
              }}>
               <div className="absolute inset-1.5 bg-white rounded-full flex items-center justify-center shadow-sm">
                 <span className="text-[9px] font-black text-slate-700">
                   %{Math.round(((studentStats?.total_attended || 0) / ((studentStats?.total_attended || 0) + (studentStats?.total_absent || 0) || 1)) * 100)}
                 </span>
               </div>
            </div>
            
            <div className="flex-1 ml-4 space-y-2">
              <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-success shadow-sm shadow-success/50"></span>
                  <span className="text-[9px] font-black text-slate-500 uppercase">Top. Katılım</span>
                </div>
                <span className="text-sm font-black text-success">{studentStats?.total_attended || 0} G</span>
              </div>
              <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-danger shadow-sm shadow-danger/50"></span>
                  <span className="text-[9px] font-black text-slate-500 uppercase">Devamsızlık</span>
                </div>
                <span className="text-sm font-black text-danger">{studentStats?.total_absent || 0} G</span>
              </div>
            </div>
          </div>
        </div>

        {/* TAMAMLANAN GÖREVLER */}
        <div className="widget-card animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="widget-title"><span>🏆</span> Görev Başarısı</div>
          <div className="mt-3 flex items-center justify-between">
            <div>
              <p className="text-2xl font-black text-primary">{studentStats?.total_completed_tasks || 0}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase">Tamamlanan Görev</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg">🎖️</div>
          </div>
        </div>

      </aside>
    );
  }

  return (
    <aside className="right-widgets">
      {tarihKarti}

      <div className="widget-card animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <div className="widget-title"><span>👥</span> Toplam Öğrenci</div>
        <div className={`widget-value ${loading ? 'opacity-20' : ''}`}>{loading ? '00' : (stats?.total ?? 0)}</div>
        <p className="widget-sub text-primary font-bold">Kayıtlı Kontenjan</p>
      </div>

      <div className="widget-card animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <div className="widget-title"><span>⚠️</span> Kritik Uyarı</div>
        <div className={`widget-value text-danger ${loading ? 'opacity-20' : ''}`}>{loading ? '00' : (stats?.critical ?? 0)}</div>
        <p className="widget-sub text-danger font-bold">Kritik Devamsızlık</p>
      </div>

      <div className="widget-card animate-fade-in" style={{ animationDelay: '0.3s' }}>
        <div className="widget-title"><span>📁</span> Arşiv</div>
        <div className={`widget-value text-slate-300 ${loading ? 'opacity-20' : ''}`}>{loading ? '00' : (stats?.terminated ?? 0)}</div>
        <p className="widget-sub text-slate-400 font-bold">Pasif Kayıtlar</p>
      </div>
    </aside>
  );
}

export default SagPanel;
