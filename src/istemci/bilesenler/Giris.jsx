import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../api';

const MANDATORY_DOCS = [
  { key: 'idFront', label: 'Kimlik Kartı Ön Yüzü' },
  { key: 'idBack', label: 'Kimlik Kartı Arka Yüzü' },
  { key: 'studentCert', label: 'Öğrenim / Öğrenci Belgesi' },
  { key: 'courseSchedule', label: 'Resmi Ders Programı Belgesi' },
  { key: 'criminalRecord', label: 'Adli Sicil Kaydı (e-Devlet)' },
  { key: 'residence', label: 'İkametgâh ve Hane Halkı Belgesi (e-Devlet)' },
  { key: 'sgk', label: 'Tüm SGK Hizmet Dökümü (e-Devlet)' },
  { key: 'income', label: 'Gelir Durumunu Gösterir Belge' },
  { key: 'ibanFile', label: 'Banka IBAN Numarası Belgesi' },
  { key: 'healthReport', label: 'Sağlık Raporu' }
];

const DAYS_OF_WEEK = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
const COURSE_SLOTS = [
  { id: 'S-1', label: '08:30 - 09:15' },
  { id: 'S-2', label: '09:25 - 10:10' },
  { id: 'S-3', label: '10:20 - 11:05' },
  { id: 'S-4', label: '11:15 - 12:00' },
  { id: 'S-5', label: '13:00 - 13:45' },
  { id: 'S-6', label: '13:55 - 14:40' },
  { id: 'S-7', label: '14:50 - 15:35' },
  { id: 'S-8', label: '15:45 - 16:30' },
  { id: 'S-9', label: '17:00 - 17:45' },
  { id: 'S-10', label: '17:55 - 18:40' },
  { id: 'S-11', label: '18:50 - 19:35' },
  { id: 'S-12', label: '19:45 - 20:30' },
  { id: 'S-13', label: '20:40 - 21:25' },
  { id: 'S-14', label: '21:35 - 22:20' },
  { id: 'S-15', label: '22:30 - 23:15' }
];

const createEmptyCourseScheduleMatrix = () => DAYS_OF_WEEK.reduce((dayAcc, day) => {
  dayAcc[day] = COURSE_SLOTS.reduce((slotAcc, slot) => {
    slotAcc[slot.id] = false;
    return slotAcc;
  }, {});
  return dayAcc;
}, {});

const timeToMinutes = (time) => {
  if (!time || typeof time !== 'string') return null;
  const [hour, minute] = time.split(':').map(Number);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return hour * 60 + minute;
};

const getSlotRange = (slot) => {
  const [start, end] = slot.label.split(' - ');
  return {
    start: timeToMinutes(start),
    end: timeToMinutes(end)
  };
};

const getAvailableSlotsForDepartment = (department, courseScheduleMatrix) => {
  const open = timeToMinutes(department.open_time);
  const close = timeToMinutes(department.close_time);

  return DAYS_OF_WEEK.flatMap(day => COURSE_SLOTS.filter(slot => {
    const range = getSlotRange(slot);
    const inDepartmentHours = open === null || close === null || (range.start >= open && range.end <= close);
    return inDepartmentHours && courseScheduleMatrix?.[day]?.[slot.id] === false;
  }).map(slot => ({ day, slotId: slot.id, label: slot.label })));
};

const formatDepartmentHours = (department) => {
  if (!department.open_time || !department.close_time) {
    return 'Çalışma saati belirtilmemiş';
  }
  return `${department.open_time} - ${department.close_time}`;
};

const getAvailabilityPercent = (department) => {
  const total = DAYS_OF_WEEK.length * COURSE_SLOTS.length;
  if (!total) return 0;
  return Math.round((department.availableSlots.length / total) * 100);
};

// IBAN DOĞRULAMA (TR Checksum)
const validateIBAN = (iban) => {
  if (!iban) return false;
  const cleanIBAN = iban.replace(/\s/g, '').toUpperCase();
  if (!/^TR\d{24}$/.test(cleanIBAN)) return false;
  
  const rearranged = cleanIBAN.substring(4) + "2927" + cleanIBAN.substring(2, 4);
  let remainder = rearranged;
  while (remainder.length > 2) {
    let block = remainder.substring(0, 9);
    remainder = (parseInt(block) % 97).toString() + remainder.substring(block.length);
  }
  return parseInt(remainder) % 97 === 1;
};

function Giris({ onLogin, revisionUser = null, onRevisionSubmitted = null, onCancelRevision = null }) {
  const isRevisionMode = Boolean(revisionUser);
  // Login States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Stepper States
  const [isRegister, setIsRegister] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [departments, setDepartments] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Registration Form Fields
  const [personalForm, setPersonalForm] = useState({ name: '', email: '', password: '', confirmPassword: '', phone: '' });
  const [preferencesForm, setPreferencesForm] = useState({ tc_kimlik: '', iban: '', preferred_dept_id: '' });
  const [courseScheduleMatrix, setCourseScheduleMatrix] = useState(createEmptyCourseScheduleMatrix);
  const [documents, setDocuments] = useState({});
  const [agreement, setAgreement] = useState(false);
  const [uploadErrors, setUploadErrors] = useState({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(5);

  const handleGoToLogin = () => {
    setShowSuccessModal(false);
    setIsRegister(false);
    setCurrentStep(1);
  };
  const recommendedDepartments = departments
    .map(department => {
      const open = timeToMinutes(department.open_time);
      const close = timeToMinutes(department.close_time);
      
      const compatibleDays = DAYS_OF_WEEK.filter(day => {
        const freeSlotsCount = COURSE_SLOTS.filter(slot => {
          const range = getSlotRange(slot);
          const inHours = open === null || close === null || (range.start >= open && range.end <= close);
          return inHours && courseScheduleMatrix?.[day]?.[slot.id] === false;
        }).length;
        return freeSlotsCount >= 8;
      });

      const compatibleDaysCount = Math.min(3, compatibleDays.length);
      const priority = preferencesForm.preferred_dept_id ? 'dept' : 'days';
      
      const activeStudentsInDept = Number(department.active_students || 0);
      const capacity = Number(department.student_capacity || 0);
      
      let score = 0;
      if (capacity > 0 && activeStudentsInDept >= capacity) {
        score = 0;
      } else if (compatibleDaysCount > 0) {
        score = Math.min(100, Math.round((compatibleDaysCount / 3) * 100));
        const isPreferred = String(department.id) === String(preferencesForm.preferred_dept_id);
        if (isPreferred) {
          const bonus = priority === 'days' ? 10 : 30;
          score = Math.min(100, score + bonus);
        }
        
        // Doluluk oranına göre kademeli penaltı (Tercih edilen birim değilse)
        if (!isPreferred && capacity > 0) {
          const occupancyRate = activeStudentsInDept / capacity;
          if (occupancyRate >= 0.5) {
            const ratio = (occupancyRate - 0.5) / 0.5;
            const penalty = Math.round(ratio * 20);
            score = Math.max(0, score - penalty);
          }
        }
      }

      return {
        ...department,
        compatibleDaysCount,
        score
      };
    })
    .filter(department => department.compatibleDaysCount > 0)
    .sort((a, b) => {
      const aIsPreferred = String(a.id) === String(preferencesForm.preferred_dept_id);
      const bIsPreferred = String(b.id) === String(preferencesForm.preferred_dept_id);
      const priority = preferencesForm.preferred_dept_id ? 'dept' : 'days';

      if (priority === 'dept') {
        if (aIsPreferred && !bIsPreferred) return -1;
        if (!aIsPreferred && bIsPreferred) return 1;
      }

      if (b.score !== a.score) {
        return b.score - a.score;
      }

      if (b.compatibleDaysCount !== a.compatibleDaysCount) {
        return b.compatibleDaysCount - a.compatibleDaysCount;
      }

      if (aIsPreferred && !bIsPreferred) return -1;
      if (!aIsPreferred && bIsPreferred) return 1;

      return 0;
    });

  useEffect(() => {
    if (isRegister) {
      // Birimleri getir
      api.get('/public/departments')
        .then(data => setDepartments(data.departments || []))
        .catch(() => {});
    }
  }, [isRegister]);

  useEffect(() => {
    if (!preferencesForm.preferred_dept_id) return;
    const selectedStillAvailable = recommendedDepartments.some(department => String(department.id) === String(preferencesForm.preferred_dept_id));
    if (!selectedStillAvailable) {
      setPreferencesForm(prev => ({ ...prev, preferred_dept_id: '' }));
    }
  }, [courseScheduleMatrix, departments, preferencesForm.preferred_dept_id]);

  useEffect(() => {
    let timer;
    if (showSuccessModal && redirectCountdown > 0) {
      timer = setTimeout(() => {
        setRedirectCountdown(prev => prev - 1);
      }, 1000);
    } else if (showSuccessModal && redirectCountdown === 0) {
      setShowSuccessModal(false);
      setIsRegister(false);
      setCurrentStep(1);
    }
    return () => clearTimeout(timer);
  }, [showSuccessModal, redirectCountdown]);

  useEffect(() => {
    if (!revisionUser) return;

    let parsedDocuments = {};
    let parsedCourseScheduleMatrix = createEmptyCourseScheduleMatrix();
    try {
      parsedDocuments = typeof revisionUser.documents === 'string' ? JSON.parse(revisionUser.documents || '{}') : (revisionUser.documents || {});
    } catch {
      parsedDocuments = {};
    }
    try {
      parsedCourseScheduleMatrix = typeof revisionUser.course_schedule_matrix === 'string' ? JSON.parse(revisionUser.course_schedule_matrix || '{}') : (revisionUser.course_schedule_matrix || createEmptyCourseScheduleMatrix());
    } catch {
      parsedCourseScheduleMatrix = createEmptyCourseScheduleMatrix();
    }

    let parsedPreferredDays = {};
    try {
      parsedPreferredDays = typeof revisionUser.preferred_days === 'string' ? JSON.parse(revisionUser.preferred_days || '{}') : (revisionUser.preferred_days || {});
    } catch {
      parsedPreferredDays = {};
    }

    setIsRegister(true);
    setCurrentStep(1);
    setPersonalForm({
      name: revisionUser.name || '',
      email: revisionUser.email || '',
      password: '',
      confirmPassword: '',
      phone: revisionUser.phone || ''
    });
    setPreferencesForm({
      tc_kimlik: revisionUser.tc_kimlik || '',
      iban: revisionUser.iban || '',
      preferred_dept_id: revisionUser.preferred_dept_id || ''
    });
    setCourseScheduleMatrix(parsedCourseScheduleMatrix);
    setDocuments(parsedDocuments);
    setAgreement(false);
    setMessage({ type: '', text: '' });
  }, [revisionUser]);

  // LOGIN SUBMIT
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      const data = await api.post('/login', { email, password });
      localStorage.setItem('token', data.token);
      const { documents, course_schedule_matrix, ...sanitizedUser } = data.user;
      localStorage.setItem('user', JSON.stringify(sanitizedUser));
      onLogin(data.user);
    } catch (err) {
      setLoginError(err.message || String(err) || 'Giriş yapılamadı.');
    } finally {
      setLoginLoading(false);
    }
  };

  // FILE UPLOAD HANDLER
  const handleFileChange = (key, file) => {
    setUploadErrors(prev => ({ ...prev, [key]: '' }));
    if (!file) return;

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setUploadErrors(prev => ({
        ...prev,
        [key]: 'Bu belge yüklenemedi çünkü dosya formatı desteklenmiyor. Lütfen PDF, JPG, PNG veya WEBP formatında bir dosya seçin.'
      }));
      return;
    }

    // 10MB limit kontrolü
    if (file.size > 10 * 1024 * 1024) {
      setUploadErrors(prev => ({
        ...prev,
        [key]: `Bu belge yüklenemedi çünkü dosya boyutu 10MB sınırını aşıyor. Seçtiğiniz dosya yaklaşık ${(file.size / (1024 * 1024)).toFixed(1)}MB. Lütfen dosyayı küçültüp tekrar yükleyin.`
      }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setDocuments(prev => ({
        ...prev,
        [key]: {
          name: file.name,
          type: file.type,
          data: reader.result
        }
      }));
    };
    reader.readAsDataURL(file);
  };

  const toggleCourseSlot = (day, slotId) => {
    setCourseScheduleMatrix(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [slotId]: !prev[day]?.[slotId]
      }
    }));
  };

  // STEP VALIDATION
  const isStepValid = () => {
    if (currentStep === 1) {
      const cleanName = personalForm.name.trim();
      const nameValid = /^[a-zA-ZçÇğĞıİöÖşŞüÜ\s]{5,}$/.test(cleanName) && cleanName.split(/\s+/).length >= 2;
      
      const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personalForm.email);
      const passValid = isRevisionMode || (personalForm.password && personalForm.password.length >= 6);
      const passMatch = isRevisionMode || personalForm.password === personalForm.confirmPassword;
      
      const cleanPhone = personalForm.phone.replace(/\D/g, '');
      const phoneValid = /^(05|5)\d{9}$/.test(cleanPhone);
      
      return nameValid && emailValid && passValid && passMatch && phoneValid;
    }
    if (currentStep === 2) {
      const cleanTC = preferencesForm.tc_kimlik.trim();
      const tcValid = cleanTC.length === 11 && /^\d+$/.test(cleanTC);
      const ibanValid = validateIBAN(preferencesForm.iban);
      return tcValid && ibanValid;
    }
    if (currentStep === 3) {
      // 9 zorunlu belge yüklenmiş mi
      return MANDATORY_DOCS.every(doc => documents[doc.key]);
    }
    if (currentStep === 4) {
      return agreement;
    }
    return false;
  };

  // SUBMIT REGISTRATION
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!isStepValid()) return;

    setLoginLoading(true);
    setMessage({ type: '', text: '' });

    const payload = {
      name: personalForm.name,
      email: personalForm.email,
      password: personalForm.password,
      tc_kimlik: preferencesForm.tc_kimlik,
      iban: preferencesForm.iban.replace(/\s/g, '').toUpperCase(),
      phone: personalForm.phone,
      documents,
      preferred_days: { priority: preferencesForm.preferred_dept_id ? 'dept' : 'days' },
      preferred_dept_id: preferencesForm.preferred_dept_id || null,
      course_schedule_matrix: courseScheduleMatrix
    };

    try {
      const data = isRevisionMode
        ? await api.put('/student/application/revision', payload)
        : await api.post('/register/student', payload);
      
      if (isRevisionMode) {
        setMessage({ type: 'success', text: 'Başvurunuz güncellendi ve yeniden incelemeye gönderildi.' });
        if (data.user) {
          const { documents, course_schedule_matrix, ...sanitizedUser } = data.user;
          localStorage.setItem('user', JSON.stringify(sanitizedUser));
          onRevisionSubmitted?.(data.user);
        }
        return;
      }
      
      // Formu sıfırla
      setPersonalForm({ name: '', email: '', password: '', confirmPassword: '', phone: '' });
      setPreferencesForm({ tc_kimlik: '', iban: '', preferred_dept_id: '' });
      setCourseScheduleMatrix(createEmptyCourseScheduleMatrix());
      setDocuments({});
      setAgreement(false);
      setMessage({ type: '', text: '' });
      
      // Başarı modal'ını göster
      setShowSuccessModal(true);
      setRedirectCountdown(5);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || String(err) || 'Başvuru gönderilirken bir hata oluştu.' });
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-orb login-orb-primary"></div>
      <div className="login-orb login-orb-accent"></div>

      <div className={`login-shell animate-fade-in ${isRegister ? 'register-shell' : ''}`}>
        {/* BRAND SIDEBAR */}
        <section className={`login-brand ${isRegister ? 'hidden' : ''}`}>
          <div className="login-brand-top">
            <div className="login-mark">
              <img src="/deu-logo-white.png" alt="Dokuz Eylül Üniversitesi" />
            </div>
            <div>
              <h2>İŞKUR TAKİP</h2>
              <span>Dokuz Eylül Üniversitesi</span>
            </div>
          </div>

          <div className="login-brand-copy">
            <h1>Öğrenci Kayıt ve İş Takip Paneli</h1>
            <p>Başvurunuzu yapabilir, onaylandıktan sonra mesai planlamanızı gerçekleştirebilirsiniz.</p>
          </div>
        </section>

        {/* INTERACTIVE FORM PANEL */}
        <section className={`login-card custom-scrollbar ${isRegister ? 'register-card' : ''}`}>
          {message.text && (
            <div className={`mb-6 p-4 rounded-2xl font-bold text-center text-sm border ${
              message.type === 'success' 
                ? 'bg-success/10 text-success border-success/20' 
                : 'bg-danger/10 text-danger border-danger/20'
            }`}>
              {message.text}
            </div>
          )}

          {/* NORMAL GİRİŞ FORMU */}
          {!isRegister ? (
            <>
              <div className="login-header">
                <p className="login-eyebrow">Sistem Girişi</p>
                <h2>Oturum Açın</h2>
                <p>Lütfen bilgilerinizi giriniz.</p>
              </div>

              <form onSubmit={handleLoginSubmit} className="login-form">
                <div className="login-field">
                  <label>E-posta Adresi</label>
                  <div className="login-input-wrap">
                    <span>👤</span>
                    <input 
                      type="text" 
                      className="login-input"
                      placeholder="E-posta adresiniz..."
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="login-field">
                  <label>Şifre</label>
                  <div className="login-input-wrap">
                    <span>🔑</span>
                    <input 
                      type="password" 
                      className="login-input"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {loginError && (
                  <div className="login-error text-xs">
                    <span>⚠️</span> {loginError}
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={loginLoading}
                  className="login-submit w-full mt-2"
                >
                  {loginLoading ? 'Giriş Yapılıyor...' : 'Sisteme Bağlan'}
                </button>

                <div className="text-center mt-6 pb-6">
                  <button 
                    type="button" 
                    onClick={() => {
                      setIsRegister(true);
                      setCurrentStep(1);
                    }}
                    className="text-xs text-primary hover:underline font-bold"
                  >
                    Kayıt Olmak İstiyorum (Öğrenci Başvurusu)
                  </button>
                </div>
              </form>
            </>
          ) : (
            /* 4 ADIMLI STEPPER KAYIT FORMU */
            <div className="w-full">
              <div className="login-header">
                <p className="login-eyebrow">{isRevisionMode ? 'Başvuru Düzeltme Formu' : 'Öğrenci Başvuru Formu'}</p>
                <h2>Adım {currentStep} / 4</h2>
                {/* Stepper Tracker Bar */}
                <div className="flex gap-2 mt-4 mb-2">
                  {[1, 2, 3, 4].map(step => (
                    <div 
                      key={step} 
                      className={`h-2 flex-1 rounded-full transition-all ${
                        step <= currentStep ? 'bg-primary' : 'bg-slate-100'
                      }`}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-wider mb-6">
                  <span>1. Kişisel</span>
                  <span>2. Tercihler</span>
                  <span>3. Belgeler</span>
                  <span>4. Onay</span>
                </div>
              </div>

              <div className="space-y-6">
                {/* ADIM 1: KİŞİSEL BİLGİLER */}
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <div className="login-field">
                      <label>Ad Soyad</label>
                      <input 
                        type="text" 
                        required
                        className="login-input !pl-4"
                        placeholder="Örn: Mehmet Can"
                        value={personalForm.name}
                        onChange={e => setPersonalForm({ ...personalForm, name: e.target.value })}
                      />
                      {personalForm.name && !/^[a-zA-ZçÇğĞıİöÖşŞüÜ\s]+$/.test(personalForm.name) && (
                        <p className="text-[10px] text-danger font-bold mt-1">⚠️ Ad Soyad sadece harf ve boşluk içermelidir.</p>
                      )}
                      {personalForm.name && /^[a-zA-ZçÇğĞıİöÖşŞüÜ\s]+$/.test(personalForm.name) && personalForm.name.trim().split(/\s+/).length < 2 && (
                        <p className="text-[10px] text-danger font-bold mt-1">⚠️ Lütfen hem adınızı hem de soyadınızı giriniz (en az iki kelime).</p>
                      )}
                    </div>
                    <div className="login-field">
                      <label>E-posta (Giriş Kullanıcı Adınız Olacaktır)</label>
                      <input 
                        type="email" 
                        required
                        className="login-input !pl-4"
                        placeholder="can@ogr.deu.edu.tr"
                        value={personalForm.email}
                        onChange={e => setPersonalForm({ ...personalForm, email: e.target.value })}
                      />
                      {personalForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personalForm.email) && (
                        <p className="text-[10px] text-danger font-bold mt-1">⚠️ Geçerli bir e-posta adresi giriniz.</p>
                      )}
                    </div>
                    {!isRevisionMode && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="login-field">
                            <label>Şifre</label>
                            <input 
                              type="password" 
                              required
                              className="login-input !pl-4"
                              placeholder="••••••••"
                              value={personalForm.password}
                              onChange={e => setPersonalForm({ ...personalForm, password: e.target.value })}
                            />
                            {personalForm.password && personalForm.password.length < 6 && (
                              <p className="text-[10px] text-danger font-bold mt-1">⚠️ En az 6 karakter olmalıdır.</p>
                            )}
                          </div>
                          <div className="login-field">
                            <label>Şifre Tekrar</label>
                            <input 
                              type="password" 
                              required
                              className="login-input !pl-4"
                              placeholder="••••••••"
                              value={personalForm.confirmPassword}
                              onChange={e => setPersonalForm({ ...personalForm, confirmPassword: e.target.value })}
                            />
                          </div>
                        </div>
                        {personalForm.password && personalForm.confirmPassword && personalForm.password !== personalForm.confirmPassword && (
                          <p className="text-[10px] text-danger font-bold">⚠️ Şifreler eşleşmiyor.</p>
                        )}
                      </>
                    )}
                    <div className="login-field">
                      <label>Telefon Numarası</label>
                      <input 
                        type="tel" 
                        required
                        className="login-input !pl-4"
                        placeholder="05xxxxxxxxx"
                        value={personalForm.phone}
                        onChange={e => setPersonalForm({ ...personalForm, phone: e.target.value })}
                      />
                      {personalForm.phone && !/^(05|5)\d{9}$/.test(personalForm.phone.replace(/\D/g, '')) && (
                        <p className="text-[10px] text-danger font-bold mt-1">⚠️ Geçerli Türkiye cep telefonu giriniz (örn: 05XXXXXXXXX).</p>
                      )}
                    </div>
                  </div>
                )}

                {/* ADIM 2: KİMLİK, FİNANS VE DERS PROGRAMI */}
                {currentStep === 2 && (
                  <div className="space-y-4">
                    <div className="login-field border border-slate-100 rounded-2xl p-4 bg-white">
                      <label className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[11px] font-black flex items-center justify-center">1</span>
                        TC Kimlik Numarası
                      </label>
                        <input 
                          type="text" 
                          required
                          maxLength="11"
                          className="login-input !pl-4 font-mono font-bold text-sm"
                          placeholder="11 haneli TC no"
                          value={preferencesForm.tc_kimlik}
                          onChange={e => setPreferencesForm({ ...preferencesForm, tc_kimlik: e.target.value.replace(/\D/g, '') })}
                        />
                        {preferencesForm.tc_kimlik && preferencesForm.tc_kimlik.length !== 11 && (
                          <p className="text-[9px] text-danger font-bold mt-1">11 hane olmalıdır.</p>
                        )}
                    </div>

                    <div className="login-field border border-slate-100 rounded-2xl p-4 bg-white">
                      <label className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[11px] font-black flex items-center justify-center">2</span>
                        Banka IBAN Numarası (Katılımcı Adına Kayıtlı)
                      </label>
                        <input 
                          type="text" 
                          required
                          maxLength="34"
                          className="login-input !pl-4 font-mono font-bold text-sm tracking-wide"
                          placeholder="TR00 0000 0000 0000 0000 0000 00"
                          value={preferencesForm.iban}
                          onChange={e => setPreferencesForm({ ...preferencesForm, iban: e.target.value.toUpperCase() })}
                        />
                        {preferencesForm.iban && !validateIBAN(preferencesForm.iban) && (
                          <p className="text-[9px] text-danger font-bold mt-1">⚠️ Geçersiz TR IBAN Numarası.</p>
                        )}
                    </div>

                    <div className="border border-slate-150 p-4 rounded-2xl bg-white">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Ders Programı Matrisi</label>
                          <p className="text-[10px] text-slate-500 font-semibold mt-1">Üniversitede dersiniz olan saatleri işaretleyin. İşaretli saatler çalışma planlamasında müsait sayılmayacaktır.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCourseScheduleMatrix(createEmptyCourseScheduleMatrix())}
                          className="text-[9px] font-black text-slate-500 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg"
                        >
                          Temizle
                        </button>
                      </div>

                      <div className="overflow-x-auto max-h-[360px] custom-scrollbar">
                        <table className="min-w-[760px] w-full border-collapse text-[10px] table-fixed">
                          <thead>
                            <tr>
                              <th className="w-[15%] sticky top-0 bg-slate-50 border border-slate-200 p-2 text-left text-slate-500">Saat</th>
                              {DAYS_OF_WEEK.map(day => (
                                <th key={day} className="w-[17%] sticky top-0 bg-slate-50 border border-slate-200 p-2 text-slate-600">{day}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {COURSE_SLOTS.map(slot => (
                              <tr key={slot.id}>
                                <td className="border border-slate-200 p-2 font-black text-slate-600">
                                  {slot.id}
                                  <div className="font-semibold text-slate-400">{slot.label}</div>
                                </td>
                                {DAYS_OF_WEEK.map(day => {
                                  const selected = courseScheduleMatrix?.[day]?.[slot.id] === true;
                                  return (
                                    <td key={`${day}-${slot.id}`} className="border border-slate-200 p-1 text-center">
                                      <div
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => toggleCourseSlot(day, slot.id)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            toggleCourseSlot(day, slot.id);
                                          }
                                        }}
                                        className={`w-full h-8 rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center font-black text-[9px] uppercase tracking-widest select-none ${
                                          selected
                                            ? 'bg-danger border border-danger/30 shadow-md shadow-danger/20 text-white'
                                            : 'bg-slate-50 border border-slate-200/50 hover:bg-slate-100 hover:border-slate-300 text-slate-300'
                                        }`}
                                        title={selected ? 'Ders Var' : 'Müsait/Boş'}
                                      >
                                        {selected ? 'Ders' : ''}
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="login-field border border-slate-100 rounded-2xl p-4 bg-white">
                      <label className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[11px] font-black flex items-center justify-center">3</span>
                        Tercih Edilen Birim
                      </label>
                      <select 
                        className="login-input !pl-4 !pr-8 font-bold text-sm truncate"
                        value={preferencesForm.preferred_dept_id}
                        onChange={e => setPreferencesForm({ ...preferencesForm, preferred_dept_id: e.target.value })}
                      >
                        <option value="">Fark Etmez / Sistem En Uygun Birimi Önerebilir</option>
                        {recommendedDepartments.map(d => (
                          <option key={d.id} value={d.id}>{d.name} (%{d.score} uygunluk - {d.compatibleDaysCount} gün)</option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-500 font-semibold mt-2">
                        Birimler, yukarıdaki ders programı matrisinde boş kalan ve birimin çalışma saatleriyle örtüşen zamanlara göre uygunluk yüzdesiyle sıralanır.
                      </p>
                      {recommendedDepartments.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                          {recommendedDepartments.slice(0, 4).map(department => (
                            <button
                              key={department.id}
                              type="button"
                              onClick={() => setPreferencesForm({ ...preferencesForm, preferred_dept_id: String(department.id) })}
                              className={`text-left rounded-xl border p-3 shadow-none ${
                                String(preferencesForm.preferred_dept_id) === String(department.id)
                                  ? 'border-primary bg-primary-light'
                                  : 'border-slate-100 bg-slate-50 hover:bg-white'
                              }`}
                            >
                              <span className="block text-xs font-black text-slate-700">{department.name}</span>
                              <span className="block text-[10px] font-bold text-primary mt-1">%{department.score} uygunluk ({department.compatibleDaysCount} gün)</span>
                              <span className="block text-[9px] font-semibold text-slate-400 mt-1">{formatDepartmentHours(department)}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {recommendedDepartments.length === 0 && (
                        <p className="text-[10px] text-warning font-black mt-2">Henüz uygun birim bulunamadı. Tüm zaman aralıklarını ders olarak işaretlemediğinizden emin olun.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* ADIM 3: ZORUNLU BELGE YÜKLEMESİ */}
                {currentStep === 3 && (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-500 font-semibold mb-2">Lütfen aşağıdaki belgeleri PDF veya Resim formatında yükleyin. Resmi ders programı belgesi zorunludur. (Maks 10MB/belge)</p>
                    
                    <div className="max-h-[350px] overflow-y-auto pr-1 space-y-3.5 custom-scrollbar">
                      {MANDATORY_DOCS.map(doc => {
                        const fileState = documents[doc.key];
                        return (
                          <div key={doc.key} className="border border-slate-100 p-3 rounded-xl bg-white space-y-2">
                            <div className="flex justify-between items-center">
                              <label className="text-xs font-extrabold text-slate-700">{doc.label}</label>
                              {fileState ? (
                                <span className="text-[10px] bg-success/15 text-success font-black px-2 py-0.5 rounded-full">✓ Yüklendi</span>
                              ) : (
                                <span className="text-[10px] bg-danger/15 text-danger font-black px-2 py-0.5 rounded-full">Eksik</span>
                              )}
                            </div>
                            
                            <div className="flex gap-2 items-center">
                              <input 
                                type="file"
                                accept="image/*,.pdf"
                                required={!fileState}
                                onChange={e => handleFileChange(doc.key, e.target.files[0])}
                                className="block w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:bg-slate-100 file:text-slate-600 hover:file:bg-slate-200 cursor-pointer"
                              />
                            </div>
                            
                            {fileState && (
                              <p className="text-[9px] text-slate-400 font-bold truncate">Yüklenen: {fileState.name}</p>
                            )}
                            {uploadErrors[doc.key] && (
                              <div className="rounded-xl border border-danger/20 bg-danger/10 px-3 py-2 text-[10px] text-danger font-bold leading-relaxed">
                                {uploadErrors[doc.key]}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ADIM 4: ÖZET VE GÖNDERİM */}
                {currentStep === 4 && (
                  <div className="space-y-4">
                    <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl text-xs space-y-3">
                      <p className="font-extrabold text-slate-800 border-b pb-1.5">📝 Başvuru Özetiniz</p>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between"><span className="text-slate-400 font-medium">Ad Soyad:</span><strong className="text-slate-700 font-bold">{personalForm.name}</strong></div>
                        <div className="flex justify-between"><span className="text-slate-400 font-medium">E-posta:</span><strong className="text-slate-700 font-bold">{personalForm.email}</strong></div>
                        <div className="flex justify-between"><span className="text-slate-400 font-medium">Telefon:</span><strong className="text-slate-700 font-bold">{personalForm.phone}</strong></div>
                        <div className="flex justify-between"><span className="text-slate-400 font-medium">TC Kimlik:</span><strong className="text-slate-700 font-bold">{preferencesForm.tc_kimlik}</strong></div>
                        <div className="flex justify-between"><span className="text-slate-400 font-medium">IBAN No:</span><strong className="text-slate-700 font-bold">{preferencesForm.iban}</strong></div>
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-medium">Birim Tercihi:</span>
                          <strong className="text-slate-700 font-bold text-right">
                            {departments.find(department => String(department.id) === String(preferencesForm.preferred_dept_id))?.name || 'Sistem önerisine bırakıldı'}
                          </strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-medium">İşaretlenen Ders Vakti:</span>
                          <strong className="text-slate-700 font-bold">
                            {DAYS_OF_WEEK.reduce((total, day) => total + COURSE_SLOTS.filter(slot => courseScheduleMatrix?.[day]?.[slot.id]).length, 0)}
                          </strong>
                        </div>
                      </div>

                      <div className="border-t pt-2 space-y-1.5">
                        <p className="font-bold text-slate-500 text-[10px]">YÜKLENEN EVRAKLAR</p>
                        <div className="grid grid-cols-3 gap-1 text-[9px] text-slate-400 font-black">
                          {MANDATORY_DOCS.map(doc => (
                            <span key={doc.key} className="truncate">✓ {doc.label.slice(0,18)}...</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <label className="flex gap-2.5 items-start bg-slate-50/50 border border-slate-100 p-3 rounded-xl cursor-pointer">
                      <input 
                        type="checkbox"
                        className="w-4 h-4 mt-0.5 rounded accent-primary"
                        checked={agreement}
                        onChange={e => setAgreement(e.target.checked)}
                      />
                      <span className="text-[10px] text-slate-500 font-bold leading-normal">
                        Yukarıda girmiş olduğum tüm bilgilerin ve yüklediğim evrakların doğruluğunu beyan ederim. Aksi bir durumda doğabilecek hukuki sorumluluğu kabul ediyorum.
                      </span>
                    </label>
                  </div>
                )}

                {/* NAVIGATION BUTTONS */}
                <div className="flex gap-4 pt-2">
                  {currentStep > 1 && (
                    <button
                      type="button"
                      onClick={() => setCurrentStep(prev => prev - 1)}
                      className="flex-1 bg-slate-150 hover:bg-slate-200 text-slate-700 py-3 rounded-xl text-xs font-extrabold transition-all uppercase tracking-wider"
                    >
                      Geri
                    </button>
                  )}
                  
                  {currentStep < 4 ? (
                    <button
                      type="button"
                      disabled={!isStepValid()}
                      onClick={() => setCurrentStep(prev => prev + 1)}
                      className={`flex-1 py-3 rounded-xl text-xs font-extrabold transition-all uppercase tracking-wider ${
                        isStepValid() 
                          ? 'bg-primary text-white hover:bg-primary-dark shadow-sm' 
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed border'
                      }`}
                    >
                      İleri
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!isStepValid() || loginLoading}
                      onClick={handleRegisterSubmit}
                      className="flex-1 btn-premium !py-3 text-xs uppercase tracking-wider"
                    >
                      {loginLoading ? 'Gönderiliyor...' : isRevisionMode ? 'Düzeltmeleri Gönder' : 'Başvuruyu Gönder'}
                    </button>
                  )}
                </div>

                <div className="text-center mt-4 pb-6">
                  <button 
                    type="button" 
                    onClick={() => {
                      if (isRevisionMode) {
                        onCancelRevision?.();
                      } else {
                        setIsRegister(false);
                        setMessage({ type: '', text: '' });
                      }
                    }}
                    className="text-xs text-slate-500 hover:text-slate-800 font-bold"
                  >
                    {isRevisionMode ? 'Durum Ekranına Dön' : 'Geri Dön ve Giriş Yap'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {showSuccessModal && createPortal(
        <div className="success-modal-backdrop">
          <div className="success-modal-content">
            <div className="success-icon-wrap">
              <div className="success-icon-circle">✓</div>
            </div>
            <h3 className="success-modal-title">Başvurunuz Alındı! 🎉</h3>
            <p className="success-modal-desc">
              Kayıt başvurunuz sisteme başarıyla iletilmiştir. Başvurunuzun onay ve atama durumunu e-posta ve şifrenizle giriş yaparak dilediğiniz zaman takip edebilirsiniz.
            </p>
            <div className="success-modal-redirect-box">
              <span className="success-modal-redirect-text">
                <span className="success-modal-redirect-count">{redirectCountdown}</span> saniye içinde giriş ekranına yönlendiriliyorsunuz...
              </span>
            </div>
            <button
              onClick={handleGoToLogin}
              className="success-modal-btn"
            >
              Giriş Ekranına Git
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default Giris;
