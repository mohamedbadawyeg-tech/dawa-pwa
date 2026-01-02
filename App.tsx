
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MEDICATIONS as DEFAULT_MEDICATIONS, TIME_SLOT_CONFIG, SLOT_HOURS, SYMPTOMS, CATEGORY_COLORS, MEDICAL_HISTORY_SUMMARY, DIET_GUIDELINES, DAILY_TIPS } from './constants';
import { AppState, TimeSlot, AIAnalysisResult, HealthReport, Medication, DayHistory } from './types';
import { analyzeHealthStatus, generateDailyHealthTip } from './services/geminiService';
import { speakText, stopSpeech, playChime } from './services/audioService';
import { 
  syncPatientData, 
  listenToPatient, 
  generateSyncId, 
  sendRemoteReminder,
  requestForToken,
  saveTokenToDatabase,
  onForegroundMessage
} from './services/firebaseService';
import { 
  Heart, Activity, ClipboardList, CheckCircle, BrainCircuit, RefreshCw, Settings, X, Plus, 
  Calendar as CalendarIcon, Wind, VolumeX, Volume2, PlusCircle, Clock, 
  Stethoscope as DoctorIcon, AlertTriangle, UserCog, Copy, Cloud, Smile, 
  Droplets, ChevronLeft, ChevronRight, FileText, Sparkles, Moon, Sun, 
  Utensils, Minus, Zap, Bell, UtensilsCrossed, Check, Stars, Frown, Meh, ListTodo, Info, History,
  Wifi, WifiOff, Coffee, Brain, Edit3, Trash2, BellRing, Pill, XCircle
} from 'lucide-react';

const App: React.FC = () => {
  const today = new Date().toISOString().split('T')[0];
  const [now, setNow] = useState(new Date());
  const [calendarViewDate, setCalendarViewDate] = useState(new Date());
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isMuted, setIsMuted] = useState(false);
  
  const lastLocalActionTime = useRef<number>(0);
  const isDirty = useRef<boolean>(false);
  const lastProcessedRemoteReminder = useRef<number>(0);

  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('health_track_final_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const isSameDay = parsed.currentReport?.date === today;
        return {
          ...parsed,
          patientId: parsed.patientId || generateSyncId(),
          history: parsed.history || [],
          takenMedications: isSameDay ? (parsed.takenMedications || {}) : {},
          sentNotifications: isSameDay ? (parsed.sentNotifications || []) : [],
          currentReport: isSameDay ? parsed.currentReport : {
            date: today, healthRating: 0, painLevel: 0, symptoms: [], notes: '',
            systolicBP: 0, diastolicBP: 0, bloodSugar: 0, oxygenLevel: 0, heartRate: 0,
            sleepQuality: '', appetite: '', mood: '', waterIntake: 0
          }
        };
      } catch (e) { console.error(e); }
    }
    return {
      patientName: "الحاج ممدوح عبد العال",
      patientAge: 75,
      patientId: generateSyncId(),
      caregiverMode: false,
      caregiverTargetId: null,
      medications: DEFAULT_MEDICATIONS,
      medicalHistorySummary: MEDICAL_HISTORY_SUMMARY,
      dietGuidelines: DIET_GUIDELINES,
      upcomingProcedures: "لا توجد إجراءات مسجلة حالياً.",
      takenMedications: {},
      notificationsEnabled: true,
      sentNotifications: [],
      customReminderTimes: {},
      darkMode: false,
      history: [],
      dailyReports: {},
      currentReport: {
        date: today, healthRating: 0, painLevel: 0, sleepQuality: '', appetite: '', symptoms: [], notes: '',
        systolicBP: 0, diastolicBP: 0, bloodSugar: 0, oxygenLevel: 0, heartRate: 0, mood: '', waterIntake: 0
      }
    };
  });

  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeModal, setActiveModal] = useState<'settings' | 'report' | 'calendar' | 'summary' | 'diet' | 'procedures' | 'medDetail' | 'history' | 'medEditor' | null>(null);
  const [selectedMed, setSelectedMed] = useState<Medication | null>(null);
  const [editingMed, setEditingMed] = useState<Partial<Medication> | null>(null);
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<string | null>(null);
  const [isFetchingTip, setIsFetchingTip] = useState(false);

  useEffect(() => {
    // Check for "speak" query param (from notification click)
    const params = new URLSearchParams(window.location.search);
    const speakBody = params.get('speak');
    
    if (speakBody) {
      // Remove the param from URL without reloading
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      
      // Wait a bit for user interaction/focus then speak
      setTimeout(async () => {
        if (!isMuted) {
          await playChime();
          speakText(speakBody);
        }
      }, 1000);
    }
  }, [isMuted]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (state.darkMode) root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('health_track_final_v2', JSON.stringify(state));
  }, [state]);

  const addHistoryAction = (action: string, details: string) => {
    const entry = {
      date: today,
      action,
      details,
      timestamp: new Date().toLocaleTimeString('ar-EG')
    };
    setState(prev => ({
      ...prev,
      history: [entry, ...prev.history].slice(0, 50)
    }));
  };

  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [isEnablingNotifications, setIsEnablingNotifications] = useState(false);

  const handleEnablePushNotifications = async () => {
    setIsEnablingNotifications(true);
    try {
      console.log("Starting notification setup...");
      
      if (!('Notification' in window)) {
        alert("هذا المتصفح لا يدعم الإشعارات.");
        return;
      }
      
      console.log("Requesting permission...");
      const permission = await Notification.requestPermission();
      console.log("Permission result:", permission);

      if (permission === 'granted') {
        try {
          console.log("Calling requestForToken...");
          const token = await requestForToken();
          console.log("Token received:", token);
          
          if (token) {
            setFcmToken(token);
            await saveTokenToDatabase(state.patientId, token);
            alert("تم تفعيل تنبيهات الهاتف بنجاح! ستصلك التذكيرات على هذا الجهاز.\n\nيمكنك الآن نسخ التوكن من قائمة الإعدادات للاختبار.");
          } else {
            alert("لم يتم العثور على توكن، حاول مرة أخرى.");
          }
        } catch (tokenError: any) {
          console.error("Token Error Details:", tokenError);
          alert(`فشل الحصول على التوكن:\n${tokenError.message}\n\nتأكد من:\n1. الاتصال بالإنترنت\n2. عدم تفعيل وضع التصفح الخفي\n3. (للايفون) إضافة التطبيق للشاشة الرئيسية`);
        }
      } else {
        alert("تم رفض الإذن بالإشعارات. يرجى تفعيلها من إعدادات المتصفح يدوياً.");
      }
    } catch (err: any) {
      console.error("General Error:", err);
      alert(`حدث خطأ غير متوقع: ${err.message || err}`);
    } finally {
      setIsEnablingNotifications(false);
    }
  };

  const fetchDailyTip = useCallback(async (force = false) => {
    if (!state.caregiverMode) {
      // Use local random tips for instant variety on every load/refresh
      const randomTip = DAILY_TIPS[Math.floor(Math.random() * DAILY_TIPS.length)];
      const personalizedTip = randomTip.replace('{name}', state.patientName || "حاج/ة");
      setState(prev => ({ ...prev, dailyTipContent: personalizedTip }));
      isDirty.current = true;
    }
  }, [state.caregiverMode, state.patientName]);

  useEffect(() => { fetchDailyTip(); }, []);

  useEffect(() => {
    if (!state.notificationsEnabled) return;
    const checkAndNotify = async () => {
      const h = now.getHours();
      const medsToNotify: Medication[] = [];
      const newNotifIds: string[] = [];
      state.medications.forEach(med => {
        const slotHour = SLOT_HOURS[med.timeSlot];
        const notifId = `${today}-${med.id}-${state.caregiverMode ? 'cg' : 'pt'}`;
        if (h >= slotHour && !state.takenMedications[med.id] && !state.sentNotifications.includes(notifId)) {
          medsToNotify.push(med);
          newNotifIds.push(notifId);
        }
      });
      if (medsToNotify.length > 0) {
        const medsNames = medsToNotify.map(m => m.name).join(' و ');
        const body = state.caregiverMode ? `تأخر الحاج ممدوح في تناول: ${medsNames}` : `يا حاج ممدوح، حان موعد تناول ${medsNames}`;
        if (Notification.permission === 'granted') new Notification("صحتي 💊", { body });
        if (!isMuted && !state.caregiverMode) {
          await playChime();
          speakText(body);
        }
        setState(prev => ({ ...prev, sentNotifications: [...prev.sentNotifications, ...newNotifIds] }));
        isDirty.current = true;
      }
    };
    const timer = setInterval(() => { setNow(new Date()); checkAndNotify(); }, 60000);
    checkAndNotify();
    return () => clearInterval(timer);
  }, [state.medications, state.takenMedications, isMuted, state.caregiverMode, today, now]);

  useEffect(() => {
    const targetId = state.caregiverMode ? state.caregiverTargetId : state.patientId;
    if (!targetId || targetId.length < 4) return;
    const unsubscribe = listenToPatient(targetId, (remoteData) => {
      if (Date.now() - lastLocalActionTime.current < 3000) return;
      setState(prev => ({ ...prev, ...remoteData }));
    });
    return () => unsubscribe();
  }, [state.caregiverMode, state.caregiverTargetId, state.patientId]);

  useEffect(() => {
    if (state.remoteReminder && state.remoteReminder.timestamp > lastProcessedRemoteReminder.current) {
      const isNew = state.remoteReminder.timestamp > Date.now() - 30000;
      if (isNew && !state.caregiverMode) {
        lastProcessedRemoteReminder.current = state.remoteReminder.timestamp;
        const msg = `تذكير من المرافق: يا حاج ممدوح لا تنسى تناول ${state.remoteReminder.medName}`;
        if (!isMuted) {
          playChime();
          speakText(msg);
        }
      }
    }
  }, [state.remoteReminder, isMuted, state.caregiverMode]);

  useEffect(() => {
    const sync = async () => {
      const targetId = state.caregiverMode ? state.caregiverTargetId : state.patientId;
      if (!targetId || !isOnline || !isDirty.current) return;
      setIsSyncing(true);
      try { await syncPatientData(targetId, state); isDirty.current = false; }
      catch (err) { console.error(err); } finally { setTimeout(() => setIsSyncing(false), 500); }
    };
    const timer = setTimeout(sync, 2500);
    return () => clearTimeout(timer);
  }, [state, isOnline]);

  useEffect(() => {
    const unsubscribe = onForegroundMessage((payload) => {
      console.log('Foreground message received:', payload);
      const { title, body } = payload.notification || {};
      const isTip = payload.data?.type === 'tip';

      if (title && body) {
        if (Notification.permission === 'granted') {
           new Notification(title, { 
             body, 
             icon: 'https://cdn-icons-png.flaticon.com/512/883/883356.png',
             silent: isTip // Try to silence system notification if supported
           });
        }
        
        // Only play sound and speak if it's NOT a tip
        if (!isMuted && !isTip) {
          playChime();
          speakText(body);
        }
      }
    });
    return () => unsubscribe();
  }, [isMuted]);

  const toggleMedication = (id: string) => {
    const med = state.medications.find(m => m.id === id);
    lastLocalActionTime.current = Date.now();
    isDirty.current = true;
    const isTaking = !state.takenMedications[id];
    
    setState(prev => {
      const newTaken = { ...prev.takenMedications, [id]: isTaking };
      const newHistory = { ...prev.dailyReports, [today]: { report: prev.currentReport, takenMedications: newTaken } };
      return { ...prev, takenMedications: newTaken, dailyReports: newHistory };
    });
    addHistoryAction(isTaking ? "تناول دواء" : "إلغاء تناول دواء", med?.name || id);
  };

  const updateReport = (updates: Partial<HealthReport>) => {
    lastLocalActionTime.current = Date.now();
    isDirty.current = true;
    setState(prev => {
      const newReport = { ...prev.currentReport, ...updates };
      const newHistory = { ...prev.dailyReports, [today]: { report: newReport, takenMedications: prev.takenMedications } };
      return { ...prev, currentReport: newReport, dailyReports: newHistory };
    });
  };

  const toggleSymptom = (symptom: string) => {
    const currentSymptoms = state.currentReport.symptoms || [];
    const newSymptoms = currentSymptoms.includes(symptom)
      ? currentSymptoms.filter(s => s !== symptom)
      : [...currentSymptoms, symptom];
    updateReport({ symptoms: newSymptoms });
  };

  const saveMedication = (med: Partial<Medication>) => {
    isDirty.current = true;
    lastLocalActionTime.current = Date.now();
    setState(prev => {
      let newMeds;
      if (med.id) {
        newMeds = prev.medications.map(m => m.id === med.id ? { ...m, ...med } as Medication : m);
        addHistoryAction("تعديل دواء", med.name || "");
      } else {
        const newMed = { ...med, id: Math.random().toString(36).substr(2, 9) } as Medication;
        newMeds = [...prev.medications, newMed];
        addHistoryAction("إضافة دواء جديد", med.name || "");
      }
      return { ...prev, medications: newMeds };
    });
    setActiveModal(null);
  };

  const deleteMedication = (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الدواء؟")) return;
    isDirty.current = true;
    lastLocalActionTime.current = Date.now();
    setState(prev => {
      const med = prev.medications.find(m => m.id === id);
      addHistoryAction("حذف دواء", med?.name || "");
      return { ...prev, medications: prev.medications.filter(m => m.id !== id) };
    });
  };

  const handleAI = async () => {
    setIsAnalyzing(true);
    try {
      const res = await analyzeHealthStatus(state);
      setAiResult(res);
      if (!isMuted) await speakText(res.summary);
    } catch (e) { alert("عذراً، تعذر التحليل الآن."); }
    finally { setIsAnalyzing(false); }
  };

  const renderCalendar = () => {
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="h-10 w-10"></div>);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const hasData = state.dailyReports[dateStr];
      const isToday = dateStr === today;
      let bgColor = "bg-slate-100 dark:bg-slate-800 text-slate-400";
      if (hasData || isToday) {
        const takenCount = isToday ? Object.values(state.takenMedications).filter(Boolean).length : Object.values(hasData?.takenMedications || {}).filter(Boolean).length;
        bgColor = takenCount === state.medications.length ? "bg-emerald-500 text-white shadow-emerald-200" : takenCount > 0 ? "bg-amber-400 text-white shadow-amber-200" : "bg-blue-100 dark:bg-blue-900/30 text-blue-500";
      }
      days.push(
        <button key={d} onClick={() => (hasData || isToday) && setSelectedHistoryDate(dateStr)} className={`h-11 w-11 rounded-2xl flex items-center justify-center font-black text-sm transition-all shadow-sm ${bgColor} ${isToday ? 'ring-4 ring-blue-600 scale-105 z-10' : 'hover:scale-105'}`}>
          {d}
        </button>
      );
    }
    return days;
  };

  const progress = state.medications.length > 0 ? (Object.values(state.takenMedications).filter(Boolean).length / state.medications.length) * 100 : 0;

  const getMedCardStyle = (med: Medication, isTaken: boolean, isLate: boolean) => {
    if (isTaken) return 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-800 opacity-90 scale-[0.98]';
    if (isLate) return 'late-med-alert border-red-300 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 shake-on-late';
    
    switch(med.category) {
      case 'pressure': return 'bg-blue-50/70 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/40 shadow-blue-100/50';
      case 'diabetes': return 'bg-emerald-50/70 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/40 shadow-emerald-100/50';
      case 'blood-thinner': return 'bg-rose-50/70 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800/40 shadow-rose-100/50';
      case 'stomach': return 'bg-amber-50/70 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/40 shadow-amber-100/50';
      case 'antibiotic': return 'bg-purple-50/70 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800/40 shadow-purple-100/50';
      default: return 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-slate-200/50';
    }
  };

  return (
    <div className={`min-h-screen bg-[#f1f5f9] dark:bg-slate-950 transition-all duration-300 pb-28 font-tajawal ${state.darkMode ? 'dark' : ''}`}>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <header className={`glass-card rounded-[2rem] p-4 shadow-lg border-b-[6px] ${state.caregiverMode ? 'border-emerald-600 bg-emerald-50/90 dark:bg-emerald-950/50' : 'border-blue-600 bg-white/95 dark:bg-slate-900/80'} animate-in fade-in slide-in-from-top-4 duration-700`}>
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 w-full lg:w-auto">
              <div className={`p-3 bg-gradient-to-br ${state.caregiverMode ? 'from-emerald-600 to-teal-700' : 'from-blue-600 to-indigo-700'} rounded-2xl text-white shadow-lg animate-pulse ring-4 ${state.caregiverMode ? 'ring-emerald-100 dark:ring-emerald-900/20' : 'ring-blue-100 dark:ring-blue-900/20'}`}>
                <Heart className="w-6 h-6 fill-current" />
              </div>
              <div className="text-right">
                <h1 className="text-2xl font-black dark:text-white leading-tight tracking-tight">{state.patientName}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-black text-slate-500 border dark:border-slate-700 uppercase flex items-center gap-2">
                    كود المريض: <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{state.caregiverMode ? state.caregiverTargetId : state.patientId}</span>
                    <button 
                      onClick={() => { 
                        const id = state.caregiverMode ? state.caregiverTargetId : state.patientId;
                        if (id) {
                          navigator.clipboard.writeText(id); 
                          alert('تم نسخ الكود: ' + id);
                        }
                      }} 
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors text-blue-600"
                      title="نسخ الكود"
                    >
                      <Copy className="w-3.5 h-3.5"/>
                    </button>
                  </span>
                  {isSyncing ? <Cloud className="w-3.5 h-3.5 text-blue-500 animate-bounce" /> : <CheckCircle className={`w-3.5 h-3.5 text-emerald-500`} />}
                  {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-500" /> : <WifiOff className="w-3.5 h-3.5 text-red-500" />}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-2xl border dark:border-slate-700 shadow-inner">
              <button onClick={() => setActiveModal('history')} className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:scale-105 transition-transform text-slate-500"><History className="w-5 h-5"/></button>
              <button onClick={() => setState(p => ({...p, darkMode: !p.darkMode}))} className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:scale-105 transition-transform text-amber-500">{state.darkMode ? <Sun className="w-5 h-5"/> : <Moon className="w-5 h-5"/>}</button>
              <button onClick={() => { stopSpeech(); setIsMuted(!isMuted); }} className={`p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:scale-105 transition-transform ${isMuted ? 'text-red-500' : 'text-blue-600'}`}>{isMuted ? <VolumeX className="w-5 h-5"/> : <Volume2 className="w-5 h-5"/>}</button>
              <button onClick={() => setActiveModal('settings')} className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:scale-105 transition-transform text-slate-600 dark:text-slate-300"><Settings className="w-5 h-5"/></button>
            </div>
          </div>
          
          <div className="mt-4 space-y-2">
             <div className="flex justify-between items-end">
                <div className="text-right">
                   <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">نسبة الإنجاز اليومي</p>
                   <span className={`text-3xl font-black ${state.caregiverMode ? 'text-emerald-600' : 'text-blue-600'} tabular-nums`}>{Math.round(progress)}%</span>
                </div>
                <div className={`text-left ${state.caregiverMode ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800' : 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800'} px-3 py-1.5 rounded-lg border`}>
                   <span className={`text-[11px] font-black ${state.caregiverMode ? 'text-emerald-700 dark:text-emerald-300' : 'text-blue-700 dark:text-blue-300'}`}>{Object.values(state.takenMedications).filter(Boolean).length} / {state.medications.length} دواء</span>
                </div>
             </div>
             <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border-2 border-white dark:border-slate-700 shadow-inner p-0.5">
                <div className={`h-full bg-gradient-to-r ${state.caregiverMode ? 'from-emerald-500 via-teal-600 to-emerald-700' : 'from-blue-500 via-indigo-600 to-blue-700'} rounded-full transition-all duration-1000 shadow-lg`} style={{ width: `${progress}%` }}></div>
             </div>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-8">
            {!state.caregiverMode && (state.dailyTipContent || isFetchingTip) && (
              <section className="animate-in slide-in-from-right-4 duration-700">
                <div className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-blue-800 to-indigo-900 p-4 rounded-[1.2rem] text-white shadow-xl border-2 border-white/10">
                  <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12 scale-110"><Stars className="w-16 h-16" /></div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                       <div className="p-1.5 bg-white/20 backdrop-blur-md rounded-lg"><Sparkles className="w-4 h-4 text-yellow-300" /></div>
                       <h2 className="font-black text-base tracking-tight">نصيحة اليوم</h2>
                    </div>
                    <button onClick={() => fetchDailyTip(true)} className={`p-1.5 bg-white/10 rounded-lg hover:bg-white/20 transition-all ${isFetchingTip ? 'animate-spin' : ''}`}>
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-base font-bold leading-relaxed mb-3 drop-shadow-lg text-right">
                    {state.dailyTipContent}
                  </p>
                  <div className="flex justify-end">
                    <button onClick={() => speakText(state.dailyTipContent || '')} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 backdrop-blur-md rounded-lg hover:bg-white/30 text-[8px] font-black transition-all border border-white/10">
                      <Volume2 className="w-3.5 h-3.5" /> استماع
                    </button>
                  </div>
                </div>
              </section>
            )}

            <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                 {state.caregiverMode && (
                   <button onClick={() => { setEditingMed({timeSlot: 'morning-fasting'}); setActiveModal('medEditor'); }} className="p-3 bg-blue-600 text-white rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2 text-[10px] font-black">
                     <Plus className="w-5 h-5"/> إضافة دواء
                   </button>
                 )}
                 <h2 className="text-2xl font-black flex items-center justify-end gap-3 dark:text-white">
                   جدول الأدوية <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg"><ClipboardList className="w-6 h-6 text-blue-600" /></div>
                 </h2>
              </div>
              
              <div className="space-y-10">
                {(Object.keys(TIME_SLOT_CONFIG) as TimeSlot[]).map(slot => {
                  const meds = state.medications.filter(m => m.timeSlot === slot);
                  if (meds.length === 0) return null;
                  const cfg = TIME_SLOT_CONFIG[slot];
                  return (
                    <div key={slot} className="space-y-4 animate-in fade-in duration-500">
                      <div className="flex items-center gap-4 pr-4 border-r-4 border-blue-500 text-right">
                        <div className={`p-3 rounded-xl ${cfg.color.split(' ')[0]} dark:bg-slate-800 shadow-sm border dark:border-slate-700`}>{cfg.icon}</div>
                        <div>
                          <h3 className="font-black text-lg text-slate-800 dark:text-slate-200">{cfg.label}</h3>
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-black tracking-widest">{formatHour(SLOT_HOURS[slot])}:00</span>
                        </div>
                      </div>
                      <div className="space-y-4">
                        {meds.map(med => {
                          const isTaken = !!state.takenMedications[med.id];
                          const isLate = !isTaken && now.getHours() >= SLOT_HOURS[slot];
                          const cardStyle = getMedCardStyle(med, isTaken, isLate);
                          
                          return (
                            <div key={med.id} className={`p-4 rounded-[2rem] border-2 flex items-center gap-4 transition-all duration-300 group ${cardStyle} hover:shadow-xl hover:-translate-y-1`}>
                               <div className="flex-1 text-right">
                                 <h4 className={`font-black text-xl dark:text-white ${isTaken ? 'line-through' : ''}`}>{med.name}</h4>
                                 <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1">{med.dosage} • {med.frequencyLabel}</p>
                               </div>
                               
                               <div className="flex flex-col gap-2">
                                 {state.caregiverMode ? (
                                   <div className="flex flex-col gap-1">
                                      <button onClick={() => { setEditingMed(med); setActiveModal('medEditor'); }} className="p-3 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-all"><Edit3 className="w-4 h-4"/></button>
                                      <button onClick={() => deleteMedication(med.id)} className="p-3 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-all"><Trash2 className="w-4 h-4"/></button>
                                   </div>
                                 ) : (
                                   <button onClick={() => { setSelectedMed(med); setActiveModal('medDetail'); }} className="p-3 text-slate-400 hover:text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-all"><Info className="w-5 h-5"/></button>
                                 )}
                                 {state.caregiverMode && <button onClick={() => sendRemoteReminder(state.caregiverTargetId!, med.name)} className="p-3 text-amber-500 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-lg transition-all"><Bell className="w-5 h-5"/></button>}
                               </div>

                               <button onClick={() => toggleMedication(med.id)} className={`w-12 h-12 rounded-[1.2rem] flex items-center justify-center transition-all shadow-md shrink-0 ${isTaken ? 'bg-emerald-500 text-white' : isLate ? 'bg-red-600 text-white animate-pulse' : 'bg-white dark:bg-slate-800 text-slate-400 border dark:border-slate-700 group-hover:border-blue-300 dark:group-hover:border-blue-700'}`}>
                                 {isTaken ? <Check className="w-8 h-8"/> : <Plus className="w-8 h-8"/>}
                               </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-8">
            <section className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-xl border dark:border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-4 animate-in zoom-in-95 duration-500">
               {[
                 { label: 'الضغط', val: `${state.currentReport.systolicBP || '--'}/${state.currentReport.diastolicBP || '--'}`, icon: <Heart className="w-5 h-5 text-red-500"/>, color: 'text-red-600', unit: 'mmHg' },
                 { label: 'سكر الدم', val: state.currentReport.bloodSugar || '--', icon: <Droplets className="w-5 h-5 text-blue-400"/>, color: 'text-blue-500', unit: 'mg/dL' },
                 { label: 'أكسجين', val: `${state.currentReport.oxygenLevel || '--'}`, icon: <Wind className="w-5 h-5 text-indigo-500"/>, color: 'text-indigo-600', unit: '%' },
                 { label: 'النبض', val: state.currentReport.heartRate || '--', icon: <Activity className="w-5 h-5 text-emerald-500"/>, color: 'text-emerald-600', unit: 'bpm' }
               ].map((v, i) => (
                 <div key={i} className="text-right border-r-2 dark:border-slate-800 pr-4 last:border-0 group">
                   <div className="flex items-center justify-end gap-2 text-[8px] font-black text-slate-400 mb-2 uppercase tracking-tighter">{v.label} {v.icon}</div>
                   <div className="flex items-baseline justify-end gap-1">
                      <span className="text-[8px] font-black text-slate-300">{v.unit}</span>
                      <p className={`text-2xl font-black ${v.color} tabular-nums tracking-tighter`}>{v.val}</p>
                   </div>
                 </div>
               ))}
            </section>

            <section className="bg-slate-950 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group border-2 border-white/5">
               <div className="absolute -top-16 -left-16 w-60 h-60 bg-blue-600/20 rounded-full blur-[100px] group-hover:bg-blue-600/30 transition-all duration-1000"></div>
               <div className="absolute -bottom-16 -right-16 w-60 h-60 bg-indigo-600/20 rounded-full blur-[100px] group-hover:bg-indigo-600/30 transition-all duration-1000"></div>
               <div className="flex items-center justify-between mb-8 relative z-10">
                  <div className="p-4 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-xl ring-4 ring-white/5"><BrainCircuit className="w-8 h-8 text-white" /></div>
                  <div className="text-right">
                    <h2 className="font-black text-2xl tracking-tight">خبير صحتي الذكي</h2>
                    <p className="text-[10px] text-blue-400 font-black uppercase tracking-[0.2em] mt-1">Gemini AI</p>
                  </div>
               </div>
               <button onClick={handleAI} disabled={isAnalyzing} className="w-full py-6 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 disabled:from-slate-800 disabled:to-slate-900 rounded-[1.5rem] font-black text-lg shadow-xl active:scale-95 transition-all flex items-center justify-center gap-4 relative z-10 border border-white/10">
                 {isAnalyzing ? <RefreshCw className="w-6 h-6 animate-spin" /> : <><Zap className="w-6 h-6 fill-current text-yellow-300" /> تحليل الحالة الآن</>}
               </button>
               {aiResult && (
                 <div className="mt-8 space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 text-right relative z-10">
                    <div className="p-6 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-inner">
                       <h3 className="text-blue-400 font-black text-sm mb-3 flex items-center justify-end gap-2">ملخص الحالة <FileText className="w-4 h-4"/></h3>
                       <p className="text-sm leading-relaxed text-slate-200 font-medium">{aiResult.summary}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="p-4 bg-emerald-500/10 backdrop-blur-sm rounded-2xl border border-emerald-500/20">
                          <h4 className="text-emerald-400 font-black text-xs mb-3 flex items-center justify-end gap-2">توصيات <CheckCircle className="w-4 h-4"/></h4>
                          <ul className="text-xs space-y-2 font-bold text-slate-300">{aiResult.recommendations.map((r, i) => <li key={i} className="pr-3 border-r-2 border-emerald-500/40">{r}</li>)}</ul>
                       </div>
                       <div className="p-4 bg-red-500/10 backdrop-blur-sm rounded-2xl border border-red-500/20">
                          <h4 className="text-red-400 font-black text-xs mb-3 flex items-center justify-end gap-2">تحذيرات <AlertTriangle className="w-4 h-4"/></h4>
                          <ul className="text-xs space-y-2 font-bold text-slate-300">{aiResult.warnings.map((w, i) => <li key={i} className="pr-3 border-r-2 border-red-500/40">{w}</li>)}</ul>
                       </div>
                    </div>
                 </div>
               )}
            </section>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button onClick={() => setActiveModal('procedures')} className="p-8 bg-white dark:bg-slate-900 rounded-[2rem] border-2 border-amber-100 dark:border-amber-900/20 text-right hover:border-amber-400 transition-all shadow-lg group">
                <div className="p-3 bg-amber-50 dark:bg-amber-900/30 w-fit rounded-xl mb-4 group-hover:scale-110 transition-transform"><ListTodo className="w-8 h-8 text-amber-500" /></div>
                <h3 className="font-black text-xl text-slate-800 dark:text-slate-200">الإجراءات</h3>
                <p className="text-[8px] text-slate-400 font-black mt-2 uppercase tracking-widest">Next Steps</p>
              </button>
              <button onClick={() => setActiveModal('summary')} className="p-8 bg-white dark:bg-slate-900 rounded-[2rem] border-2 border-blue-100 dark:border-blue-900/20 text-right hover:border-blue-400 transition-all shadow-lg group">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 w-fit rounded-xl mb-4 group-hover:scale-110 transition-transform"><FileText className="w-8 h-8 text-blue-500" /></div>
                <h3 className="font-black text-xl text-slate-800 dark:text-slate-200">الملخص الطبي</h3>
                <p className="text-[8px] text-slate-400 font-black mt-2 uppercase tracking-widest">Medical History</p>
              </button>
              <button onClick={() => setActiveModal('diet')} className="p-8 bg-white dark:bg-slate-900 rounded-[2rem] border-2 border-emerald-100 dark:border-emerald-900/20 text-right hover:border-emerald-400 transition-all shadow-lg group">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 w-fit rounded-xl mb-4 group-hover:scale-110 transition-transform"><UtensilsCrossed className="w-8 h-8 text-emerald-500" /></div>
                <h3 className="font-black text-xl text-slate-800 dark:text-slate-200">نظام الأكل</h3>
                <p className="text-[8px] text-slate-400 font-black mt-2 uppercase tracking-widest">Diet Plan</p>
              </button>
            </div>
          </div>
        </main>
      </div>

      <footer className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[88%] max-w-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/50 dark:border-slate-800 px-4 py-1.5 rounded-[2.5rem] shadow-2xl z-[100] flex items-center justify-around">
        <button onClick={() => setActiveModal('report')} className="p-2.5 text-blue-600 bg-blue-50 dark:bg-blue-900/40 rounded-[1rem] active:scale-90 transition-all"><DoctorIcon className="w-5 h-5"/></button>
        <button onClick={handleAI} className="p-3 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-full shadow-xl active:scale-95 -translate-y-4 border-[4px] border-white dark:border-slate-950 transition-all"><BrainCircuit className="w-6.5 h-6.5"/></button>
        <button onClick={() => setActiveModal('calendar')} className="p-2.5 text-slate-500 dark:text-slate-400 rounded-[1rem] active:scale-90 transition-all"><CalendarIcon className="w-5 h-5"/></button>
      </footer>

      {activeModal === 'report' && (
        <div className="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4">
           <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] p-8 max-h-[90vh] overflow-y-auto text-right space-y-8 animate-in zoom-in-95 duration-300 custom-scrollbar">
              <div className="flex justify-between items-center border-b dark:border-slate-800 pb-6">
                <button onClick={() => setActiveModal(null)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-red-500"><X className="w-6 h-6"/></button>
                <div className="text-right">
                   <h2 className="text-2xl font-black dark:text-white">تقرير الحالة اليومي</h2>
                   <p className="text-xs font-bold text-slate-400 mt-1">تحديث بيانات الحاج ممدوح</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase pr-1 tracking-widest">الضغط (عالي)</label>
                   <input type="number" placeholder="120" value={state.currentReport.systolicBP || ''} onChange={e => updateReport({systolicBP: parseInt(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-center font-black text-xl dark:text-white border-2 border-transparent focus:border-blue-500 outline-none shadow-inner"/>
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase pr-1 tracking-widest">الضغط (واطي)</label>
                   <input type="number" placeholder="80" value={state.currentReport.diastolicBP || ''} onChange={e => updateReport({diastolicBP: parseInt(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-center font-black text-xl dark:text-white border-2 border-transparent focus:border-blue-500 outline-none shadow-inner"/>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase pr-1 tracking-widest">سكر الدم</label>
                   <input type="number" placeholder="100" value={state.currentReport.bloodSugar || ''} onChange={e => updateReport({bloodSugar: parseInt(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-center font-black text-xl dark:text-white border-2 border-transparent focus:border-blue-500 outline-none shadow-inner"/>
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase pr-1 tracking-widest">الأكسجين</label>
                   <input type="number" placeholder="98" value={state.currentReport.oxygenLevel || ''} onChange={e => updateReport({oxygenLevel: parseInt(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-center font-black text-xl dark:text-white border-2 border-transparent focus:border-blue-500 outline-none shadow-inner"/>
                 </div>
              </div>

              {/* Symptoms Selection Section */}
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase pr-1 tracking-widest flex items-center justify-end gap-2">الأعراض الجانبية <AlertTriangle className="w-3 h-3"/></label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                   {SYMPTOMS.map(symptom => {
                     const isSelected = state.currentReport.symptoms?.includes(symptom);
                     return (
                       <button 
                         key={symptom} 
                         onClick={() => toggleSymptom(symptom)}
                         className={`p-3 rounded-xl border-2 text-[10px] font-black transition-all flex items-center justify-between gap-2 ${isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 shadow-md' : 'border-transparent bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}
                       >
                         {isSelected && <CheckCircle className="w-3 h-3 shrink-0 text-emerald-500" />}
                         <span className="flex-1 text-center">{symptom}</span>
                       </button>
                     );
                   })}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase pr-1 tracking-widest flex items-center justify-end gap-2">جودة النوم <Moon className="w-3 h-3"/></label>
                <div className="grid grid-cols-3 gap-2">
                   {[
                     { id: 'good', label: 'عميق', color: 'text-emerald-500' },
                     { id: 'fair', label: 'متقطع', color: 'text-amber-500' },
                     { id: 'poor', label: 'أرق', color: 'text-red-500' },
                   ].map(item => (
                     <button key={item.id} onClick={() => updateReport({sleepQuality: item.id as any})} className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${state.currentReport.sleepQuality === item.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/40' : 'border-transparent bg-slate-50 dark:bg-slate-800'}`}>
                        <span className={`text-[10px] font-black ${item.color}`}>{item.label}</span>
                     </button>
                   ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase pr-1 tracking-widest flex items-center justify-end gap-2">الشهية <Utensils className="w-3 h-3"/></label>
                <div className="grid grid-cols-3 gap-2">
                   {[
                     { id: 'good', label: 'ممتازة', color: 'text-emerald-500' },
                     { id: 'fair', label: 'متوسطة', color: 'text-amber-500' },
                     { id: 'poor', label: 'ضعيفة', color: 'text-red-500' },
                   ].map(item => (
                     <button key={item.id} onClick={() => updateReport({appetite: item.id as any})} className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${state.currentReport.appetite === item.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/40' : 'border-transparent bg-slate-50 dark:bg-slate-800'}`}>
                        <span className={`text-[10px] font-black ${item.color}`}>{item.label}</span>
                     </button>
                   ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase pr-1 tracking-widest flex items-center justify-end gap-2">الحالة المزاجية <Brain className="w-3 h-3"/></label>
                <div className="grid grid-cols-4 gap-2">
                   {[
                     { id: 'happy', label: 'سعيد', icon: <Smile className="w-6 h-6"/>, color: 'text-emerald-500' },
                     { id: 'calm', label: 'مستقر', icon: <Meh className="w-6 h-6"/>, color: 'text-blue-500' },
                     { id: 'tired', label: 'متعب', icon: <Zap className="w-6 h-6"/>, color: 'text-amber-500' },
                     { id: 'anxious', label: 'قلق', icon: <Frown className="w-6 h-6"/>, color: 'text-red-500' },
                   ].map(item => (
                     <button key={item.id} onClick={() => updateReport({mood: item.id as any})} className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${state.currentReport.mood === item.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/40' : 'border-transparent bg-slate-50 dark:bg-slate-800'}`}>
                        <div className={item.color}>{item.icon}</div>
                        <span className="text-[8px] font-black dark:text-slate-300">{item.label}</span>
                     </button>
                   ))}
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-[2rem] border border-blue-100 dark:border-blue-800">
                 <label className="text-[10px] font-black text-blue-400 uppercase block mb-4 text-center tracking-widest">عداد المياه (أكواب)</label>
                 <div className="flex items-center justify-center gap-8">
                   <button onClick={() => updateReport({waterIntake: Math.max(0, (state.currentReport.waterIntake || 0) - 1)})} className="w-12 h-12 bg-white dark:bg-slate-800 rounded-xl shadow-md flex items-center justify-center text-blue-600 active:scale-90 transition-all"><Minus className="w-6 h-6"/></button>
                   <div className="text-center">
                      <div className="flex items-center gap-2 font-black text-4xl text-blue-600 dark:text-blue-400 tabular-nums"><Droplets className="w-8 h-8"/> {state.currentReport.waterIntake || 0}</div>
                   </div>
                   <button onClick={() => updateReport({waterIntake: (state.currentReport.waterIntake || 0) + 1})} className="w-12 h-12 bg-blue-600 text-white rounded-xl shadow-lg flex items-center justify-center active:scale-90 transition-all"><Plus className="w-6 h-6"/></button>
                 </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase pr-1 tracking-widest">ملاحظات إضافية</label>
                <textarea value={state.currentReport.notes || ''} onChange={e => updateReport({notes: e.target.value})} placeholder="اكتب أي ملاحظة..." className="w-full p-6 bg-slate-50 dark:bg-slate-800 rounded-2xl text-right min-h-[120px] text-base dark:text-white border-2 border-transparent focus:border-blue-500 outline-none shadow-inner"/>
              </div>
              
              <button onClick={() => { setActiveModal(null); addHistoryAction("تحديث التقرير", "تم حفظ كافة القياسات والأعراض"); }} className="w-full py-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-[1.5rem] font-black text-lg shadow-xl active:scale-95">حفظ وإغلاق</button>
           </div>
        </div>
      )}

      {activeModal === 'medEditor' && editingMed && (
        <div className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
           <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-8 text-right space-y-6 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto custom-scrollbar">
              <div className="flex justify-between items-center mb-4">
                <button onClick={() => setActiveModal(null)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl"><X className="w-6 h-6"/></button>
                <h2 className="text-2xl font-black dark:text-white">{editingMed.id ? 'تعديل الدواء' : 'إضافة دواء'}</h2>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 pr-1">اسم الدواء</label>
                <input type="text" value={editingMed.name || ''} onChange={e => setEditingMed({...editingMed, name: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl text-right font-black text-base outline-none border-2 border-transparent focus:border-blue-500 shadow-inner"/>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 pr-1">الجرعة</label>
                <input type="text" value={editingMed.dosage || ''} onChange={e => setEditingMed({...editingMed, dosage: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl text-right font-black text-base outline-none border-2 border-transparent focus:border-blue-500 shadow-inner"/>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 pr-1">موعد التناول</label>
                <select value={editingMed.timeSlot} onChange={e => setEditingMed({...editingMed, timeSlot: e.target.value as TimeSlot})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl text-right font-black text-base outline-none border-2 border-transparent focus:border-blue-500 shadow-inner">
                   {(Object.keys(TIME_SLOT_CONFIG) as TimeSlot[]).map(slot => (
                     <option key={slot} value={slot}>{TIME_SLOT_CONFIG[slot].label}</option>
                   ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 pr-1">توقيت الساعة</label>
                <input type="text" placeholder="9:00 صباحاً" value={editingMed.frequencyLabel || ''} onChange={e => setEditingMed({...editingMed, frequencyLabel: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl text-right font-black text-base outline-none border-2 border-transparent focus:border-blue-500 shadow-inner"/>
              </div>

              <button onClick={() => saveMedication(editingMed)} className="w-full py-5 bg-blue-600 text-white rounded-[1.2rem] font-black text-lg shadow-xl active:scale-95 transition-all">حفظ</button>
           </div>
        </div>
      )}

      {(activeModal === 'summary' || activeModal === 'diet' || activeModal === 'procedures') && (
        <div className="fixed inset-0 z-[200] bg-slate-950/98 backdrop-blur-2xl flex items-center justify-center p-4">
           <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] p-8 max-h-[88vh] overflow-y-auto text-right animate-in zoom-in-95 shadow-2xl">
              <div className="flex justify-between items-center mb-8 border-b dark:border-slate-800 pb-6">
                 <button onClick={() => setActiveModal(null)} className="p-4 bg-slate-100 dark:bg-slate-800 rounded-xl"><X className="w-7 h-7"/></button>
                 <div className="flex items-center gap-4">
                   <div className="text-right">
                      <h2 className="text-2xl font-black dark:text-white">
                         {activeModal === 'summary' ? 'الملخص الطبي' : activeModal === 'diet' ? 'نظام التغذية' : 'الإجراءات'}
                      </h2>
                   </div>
                   <div className="p-3 bg-blue-100 dark:bg-blue-900/40 rounded-xl">
                      {activeModal === 'summary' ? <FileText className="text-blue-600 w-8 h-8" /> : activeModal === 'diet' ? <UtensilsCrossed className="text-emerald-600 w-8 h-8" /> : <ListTodo className="text-amber-600 w-8 h-8" />}
                   </div>
                 </div>
              </div>
              {state.caregiverMode ? (
                <textarea 
                  value={activeModal === 'summary' ? state.medicalHistorySummary : activeModal === 'diet' ? state.dietGuidelines : state.upcomingProcedures}
                  onChange={e => {
                    isDirty.current = true;
                    if (activeModal === 'summary') setState(p => ({...p, medicalHistorySummary: e.target.value}));
                    if (activeModal === 'diet') setState(p => ({...p, dietGuidelines: e.target.value}));
                    if (activeModal === 'procedures') setState(p => ({...p, upcomingProcedures: e.target.value}));
                  }}
                  className="w-full p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-blue-200 dark:border-slate-700 min-h-[400px] leading-relaxed text-right text-lg font-bold dark:text-white outline-none focus:border-blue-500 shadow-inner"
                />
              ) : (
                <div className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-2xl leading-relaxed whitespace-pre-wrap dark:text-slate-200 font-bold text-lg text-right shadow-inner">
                  {activeModal === 'summary' ? state.medicalHistorySummary : activeModal === 'diet' ? state.dietGuidelines : state.upcomingProcedures}
                </div>
              )}
              <button onClick={() => setActiveModal(null)} className="w-full mt-10 py-6 bg-slate-900 dark:bg-slate-800 text-white rounded-[1.5rem] font-black text-xl shadow-2xl active:scale-95">إغلاق</button>
           </div>
        </div>
      )}

      {activeModal === 'calendar' && (
        <div className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
           <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-8 text-right animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-8">
                <button onClick={() => setActiveModal(null)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl"><X className="w-6 h-6"/></button>
                <div className="flex items-center gap-4">
                   <button onClick={() => setCalendarViewDate(new Date(calendarViewDate.setMonth(calendarViewDate.getMonth() - 1)))} className="p-2 hover:bg-slate-100 rounded-full"><ChevronLeft className="w-6 h-6"/></button>
                   <h2 className="text-xl font-black dark:text-white">{calendarViewDate.toLocaleDateString('ar-EG', {month:'long', year:'numeric'})}</h2>
                   <button onClick={() => setCalendarViewDate(new Date(calendarViewDate.setMonth(calendarViewDate.getMonth() + 1)))} className="p-2 hover:bg-slate-100 rounded-full"><ChevronRight className="w-6 h-6"/></button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-3 mb-8">{renderCalendar()}</div>
              <button onClick={() => setActiveModal(null)} className="w-full py-5 bg-slate-900 dark:bg-slate-800 text-white rounded-[1.2rem] font-black text-lg">الرجوع</button>
           </div>
        </div>
      )}

      {activeModal === 'history' && (
        <div className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
           <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] p-8 max-h-[85vh] overflow-y-auto text-right animate-in slide-in-from-bottom-10">
              <div className="flex justify-between items-center mb-8 sticky top-0 bg-white dark:bg-slate-900 py-2 z-10">
                 <button onClick={() => setActiveModal(null)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl"><X className="w-6 h-6"/></button>
                 <h2 className="text-2xl font-black dark:text-white">سجل النشاطات</h2>
              </div>
              <div className="space-y-4">
                 {state.history.map((h, i) => (
                   <div key={i} className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex justify-between items-center border-2 border-transparent hover:border-blue-100 transition-all">
                      <div className="flex flex-col items-start">
                         <span className="text-[8px] font-black text-slate-300 tabular-nums uppercase">{h.timestamp}</span>
                         <span className="text-[8px] font-black text-slate-300 tabular-nums">{h.date}</span>
                      </div>
                      <div className="text-right">
                         <h4 className="font-black text-lg dark:text-white">{h.action}</h4>
                         <p className="text-[10px] font-bold text-blue-500 dark:text-blue-400 mt-1">{h.details}</p>
                      </div>
                   </div>
                 ))}
              </div>
              <button onClick={() => setActiveModal(null)} className="w-full mt-8 py-5 bg-slate-900 dark:bg-slate-800 text-white rounded-xl font-black text-lg shadow-xl">إغلاق</button>
           </div>
        </div>
      )}

      {activeModal === 'settings' && (
        <div className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
           <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-8 text-right space-y-8 animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-4">
                 <button onClick={() => setActiveModal(null)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl"><X className="w-6 h-6"/></button>
                 <h2 className="text-2xl font-black dark:text-white">الإعدادات</h2>
              </div>
              
              {!state.caregiverMode && (
                <button 
                  onClick={handleEnablePushNotifications} 
                  disabled={isEnablingNotifications}
                  className={`w-full py-4 ${isEnablingNotifications ? 'bg-amber-300' : 'bg-amber-500'} text-white rounded-xl font-black text-sm shadow-lg active:scale-95 transition-all flex items-center justify-center gap-3`}
                >
                  <BellRing className={`w-5 h-5 ${isEnablingNotifications ? 'animate-pulse' : ''}`}/> 
                  {isEnablingNotifications ? 'جاري التفعيل...' : 'تفعيل تنبيهات الهاتف'}
                </button>
              )}

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase pr-1 tracking-widest">اسم المريض</label>
                <input type="text" value={state.patientName} onChange={e => { isDirty.current=true; setState(p=>({...p, patientName:e.target.value})) }} className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-xl text-right font-black text-lg dark:text-white outline-none shadow-inner"/>
              </div>
              <div className="p-6 bg-slate-100 dark:bg-slate-800 rounded-[2rem] shadow-inner">
                <label className="text-[10px] font-black text-slate-400 block mb-4 text-center uppercase tracking-widest">وضع التطبيق</label>
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setState(p => ({...p, caregiverMode: false}))} className={`py-4 rounded-xl font-black text-sm transition-all shadow-md ${!state.caregiverMode ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-700 text-slate-500'}`}>وضع المريض</button>
                  <button onClick={() => setState(p => ({...p, caregiverMode: true}))} className={`py-4 rounded-xl font-black text-sm transition-all shadow-md ${state.caregiverMode ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-slate-700 text-slate-500'}`}>وضع المرافق</button>
                </div>
              </div>
              {state.caregiverMode && (
                <div className="space-y-4 animate-in slide-in-from-top-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase pr-1 tracking-widest">كود المتابعة</label>
                  <input type="text" placeholder="ABCDEF" value={state.caregiverTargetId || ''} onChange={e => setState(p=>({...p, caregiverTargetId:e.target.value.toUpperCase()}))} className="w-full p-6 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-center font-black uppercase tracking-[0.4em] text-emerald-600 text-2xl border-4 border-dashed border-emerald-200 outline-none shadow-inner"/>
                </div>
              )}
              {!state.caregiverMode && (
                 <div className="space-y-4">
                   <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border-2 border-blue-100 flex items-center justify-between shadow-inner">
                      <button onClick={() => { navigator.clipboard.writeText(state.patientId); alert("تم النسخ"); }} className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm text-blue-600"><Copy className="w-5 h-5"/></button>
                      <div className="text-right">
                         <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">كودك الخاص</span>
                         <p className="font-black text-2xl text-blue-700 dark:text-blue-300 tracking-[0.1em]">{state.patientId}</p>
                      </div>
                   </div>

                   {fcmToken && (
                     <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border-2 border-amber-100 dark:border-amber-800/40 flex items-center justify-between shadow-inner animate-in fade-in slide-in-from-bottom-2">
                        <button onClick={() => { navigator.clipboard.writeText(fcmToken); alert("تم نسخ توكن الإشعارات"); }} className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm text-amber-600 hover:scale-105 transition-transform"><Copy className="w-5 h-5"/></button>
                        <div className="text-right overflow-hidden">
                           <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest block mb-1">توكن الإشعارات (للاختبار)</span>
                           <p className="font-mono text-[10px] text-amber-700 dark:text-amber-300 truncate max-w-[200px] dir-ltr text-left bg-white/50 dark:bg-black/20 p-1.5 rounded-lg border border-amber-200/50">{fcmToken.substring(0, 20)}...</p>
                        </div>
                     </div>
                   )}
                 </div>
              )}
              <button onClick={() => setActiveModal(null)} className="w-full py-6 bg-slate-950 dark:bg-slate-800 text-white rounded-[1.5rem] font-black text-lg shadow-xl active:scale-95 transition-all">حفظ وإغلاق</button>
           </div>
        </div>
      )}
      
      {fcmToken && !activeModal && (
        <div className="fixed bottom-4 left-4 right-4 z-40 animate-in slide-in-from-bottom-4 fade-in duration-500">
          <div className="bg-slate-900/90 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-white/10 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">FCM Token</p>
              <p className="font-mono text-xs text-emerald-400 truncate dir-ltr text-left select-all">{fcmToken}</p>
            </div>
            <button 
              onClick={() => { navigator.clipboard.writeText(fcmToken); alert("تم نسخ التوكن!"); }}
              className="p-3 bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-xl transition-colors"
            >
              <Copy className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {selectedHistoryDate && (
        <div className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
           <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] p-8 max-h-[90vh] overflow-y-auto text-right animate-in zoom-in-95 custom-scrollbar">
              <div className="flex justify-between items-center mb-6 border-b dark:border-slate-800 pb-4">
                 <button onClick={() => setSelectedHistoryDate(null)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl"><X className="w-6 h-6"/></button>
                 <div>
                    <h2 className="text-2xl font-black dark:text-white">تفاصيل اليوم</h2>
                    <p className="text-sm font-bold text-slate-400 mt-1">{new Date(selectedHistoryDate).toLocaleDateString('ar-EG', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})}</p>
                 </div>
              </div>

              {/* Medications Section */}
              <div className="mb-8">
                 <h3 className="font-black text-lg mb-4 flex items-center justify-end gap-2 dark:text-white">
                    الأدوية
                    <span className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg"><Pill className="w-5 h-5 text-blue-500"/></span>
                 </h3>
                 <div className="space-y-3">
                    {state.medications.map(med => {
                      const dayData = state.dailyReports[selectedHistoryDate];
                      const isTaken = dayData?.takenMedications?.[med.id];
                      return (
                        <div key={med.id} className={`p-4 rounded-2xl border-2 flex items-center justify-between ${isTaken ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/50' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800'}`}>
                           <div className="flex items-center gap-3">
                              {isTaken ? <CheckCircle className="w-6 h-6 text-emerald-500"/> : <XCircle className="w-6 h-6 text-slate-300"/>}
                              <span className={`text-sm font-bold ${isTaken ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400'}`}>{isTaken ? 'تم أخذ الدواء' : 'لم يتم التسجيل'}</span>
                           </div>
                           <div className="text-right">
                              <h4 className={`font-black ${isTaken ? 'text-emerald-900 dark:text-emerald-100' : 'text-slate-700 dark:text-slate-300'}`}>{med.name}</h4>
                              <p className="text-[10px] font-bold text-slate-400 mt-1">{med.dosage}</p>
                           </div>
                        </div>
                      );
                    })}
                 </div>
              </div>

              {/* Vitals Section */}
              {state.dailyReports[selectedHistoryDate]?.report && (
                 <div>
                    <h3 className="font-black text-lg mb-4 flex items-center justify-end gap-2 dark:text-white">
                       المؤشرات الحيوية
                       <span className="p-2 bg-rose-50 dark:bg-rose-900/30 rounded-lg"><Activity className="w-5 h-5 text-rose-500"/></span>
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                       {state.dailyReports[selectedHistoryDate].report.systolicBP && (
                         <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-center">
                            <span className="text-[10px] font-black text-slate-400 block mb-1">الضغط</span>
                            <p className="text-xl font-black text-slate-700 dark:text-slate-200">{state.dailyReports[selectedHistoryDate].report.systolicBP}/{state.dailyReports[selectedHistoryDate].report.diastolicBP}</p>
                         </div>
                       )}
                       {state.dailyReports[selectedHistoryDate].report.bloodSugar && (
                         <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-center">
                            <span className="text-[10px] font-black text-slate-400 block mb-1">السكر</span>
                            <p className="text-xl font-black text-blue-600 dark:text-blue-400">{state.dailyReports[selectedHistoryDate].report.bloodSugar}</p>
                         </div>
                       )}
                       {state.dailyReports[selectedHistoryDate].report.oxygenLevel && (
                         <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-center">
                            <span className="text-[10px] font-black text-slate-400 block mb-1">الأكسجين</span>
                            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{state.dailyReports[selectedHistoryDate].report.oxygenLevel}%</p>
                         </div>
                       )}
                       {state.dailyReports[selectedHistoryDate].report.heartRate && (
                         <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-center">
                            <span className="text-[10px] font-black text-slate-400 block mb-1">النبض</span>
                            <p className="text-xl font-black text-rose-600 dark:text-rose-400">{state.dailyReports[selectedHistoryDate].report.heartRate}</p>
                         </div>
                       )}
                    </div>

                    {/* Symptoms & Mood */}
                    <div className="mt-4 space-y-3">
                       {state.dailyReports[selectedHistoryDate].report.symptoms && state.dailyReports[selectedHistoryDate].report.symptoms.length > 0 && (
                          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-right">
                             <span className="text-[10px] font-black text-slate-400 block mb-2">الأعراض</span>
                             <div className="flex flex-wrap justify-end gap-2">
                                {state.dailyReports[selectedHistoryDate].report.symptoms.map((s, i) => (
                                   <span key={i} className="px-3 py-1 bg-white dark:bg-slate-700 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 shadow-sm border border-slate-100 dark:border-slate-600">{s}</span>
                                ))}
                             </div>
                          </div>
                       )}
                       
                       <div className="grid grid-cols-2 gap-3">
                          {state.dailyReports[selectedHistoryDate].report.mood && (
                             <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-center">
                                <span className="text-[10px] font-black text-slate-400 block mb-1">المزاج</span>
                                <p className="text-sm font-black text-slate-700 dark:text-slate-300">{state.dailyReports[selectedHistoryDate].report.mood}</p>
                             </div>
                          )}
                          {state.dailyReports[selectedHistoryDate].report.sleepQuality && (
                             <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-center">
                                <span className="text-[10px] font-black text-slate-400 block mb-1">النوم</span>
                                <p className="text-sm font-black text-slate-700 dark:text-slate-300">{state.dailyReports[selectedHistoryDate].report.sleepQuality}</p>
                             </div>
                          )}
                       </div>
                    </div>
                 </div>
              )}
              
              {!state.dailyReports[selectedHistoryDate]?.report && !state.dailyReports[selectedHistoryDate]?.takenMedications && (
                 <div className="text-center py-12">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                       <FileText className="w-8 h-8 text-slate-300"/>
                    </div>
                    <p className="text-slate-400 font-bold">لا توجد بيانات مسجلة لهذا اليوم</p>
                 </div>
              )}

              <button onClick={() => setSelectedHistoryDate(null)} className="w-full mt-8 py-5 bg-slate-900 dark:bg-slate-800 text-white rounded-[1.5rem] font-black text-lg shadow-xl active:scale-95 transition-all">إغلاق</button>
           </div>
        </div>
      )}

    </div>
  );
};

const formatHour = (h: number) => {
  if (h === 0) return "12";
  if (h < 12) return `${h}`;
  if (h === 12) return "12";
  return `${h - 12}`;
};

export default App;
