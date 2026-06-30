import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  ShieldAlert,
  Search,
  UserPlus,
  MapPin,
  Sparkles,
  AlertTriangle,
  Bell,
  HeartHandshake,
  Users,
  Grid,
  TrendingUp,
  CheckCircle,
  HelpCircle,
  X,
  Phone,
  FileText,
  Clock,
  Heart
} from 'lucide-react';
import ReportForm from './components/ReportForm';
import MatchesList from './components/MatchesList';
import FaceScanner from './components/FaceScanner';
import DirectoryMap from './components/DirectoryMap';
import { Report, MatchResult, MatchNotification, FacialFeatures } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'scan' | 'report' | 'directory'>('scan');
  
  // App States
  const [reports, setReports] = useState<Report[]>([]);
  const [notifications, setNotifications] = useState<MatchNotification[]>([]);
  const [recentMatches, setRecentMatches] = useState<MatchResult[]>([]);
  const [lastScanPhoto, setLastScanPhoto] = useState<string | null>(null);
  const [lastScanFeatures, setLastScanFeatures] = useState<FacialFeatures | null>(null);
  const [scannedMatches, setScannedMatches] = useState<MatchResult[]>([]);
  const [hasScanned, setHasScanned] = useState(false);
  
  // Filtering & searching in directory
  const [searchFilter, setSearchFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("todos");
  const [typeFilter, setTypeFilter] = useState("todos");
  const [categoryFilter, setCategoryFilter] = useState("todos");

  // Notification badge indicator
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);

  // New Match Overlay Dialog State
  const [overlayMatch, setOverlayMatch] = useState<{
    newReport: Report;
    matchedReports: MatchResult[];
  } | null>(null);

  // Fetch all reports and notifications from Server
  const fetchState = async () => {
    try {
      const reportsRes = await fetch('/api/reports');
      const reportsData = await reportsRes.json();
      if (reportsData.success) {
        setReports(reportsData.reports);
      }

      const notifRes = await fetch('/api/notifications');
      const notifData = await notifRes.json();
      if (notifData.success) {
        setNotifications(notifData.notifications);
        setUnreadCount(notifData.notifications.filter((n: MatchNotification) => !n.read).length);
      }
    } catch (e) {
      console.error("Failed to fetch S.O.S VENEZUELA state:", e);
    }
  };

  useEffect(() => {
    fetchState();
    
    // Poll for notifications and reports every 10 seconds for real-time reactivity
    const interval = setInterval(fetchState, 10000);
    return () => clearInterval(interval);
  }, []);

  // Handle successful report creation
  const handleReportCreated = (newReport: Report, matches: MatchResult[]) => {
    setReports((prev) => [newReport, ...prev]);
    
    if (matches && matches.length > 0) {
      // Trigger a dramatic interactive overlay alert of the match!
      setOverlayMatch({
        newReport,
        matchedReports: matches
      });
      setRecentMatches(matches);
      // Play a simulated soft notification beep (safely using Web Audio API)
      playBeep();
    }
    
    // Refresh notifications from backend
    fetchState();
  };

  // Safe Web Audio API Notification sound
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        audioCtx.close();
      }, 300);
    } catch (e) {}
  };

  // Mark notification as read
  const handleMarkAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
      fetchState();
    } catch (e) {}
  };

  // Mark a specific report as resolved (reunited!)
  const handleResolveReport = async (id: string) => {
    try {
      const res = await fetch(`/api/reports/${id}/resolve`, { method: 'POST' });
      if (res.ok) {
        setReports((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: 'resolved' as const } : r))
        );
        fetchState();
      }
    } catch (e) {}
  };

  // Face scanner search callback
  const handleFaceSearchComplete = (matches: MatchResult[], features: FacialFeatures, photo: string) => {
    setLastScanPhoto(photo);
    setLastScanFeatures(features);
    setScannedMatches(matches);
    setHasScanned(true);
    
    // Play a short visual confirm beep
    playBeep();
  };

  // Reset face search scanner
  const handleResetScanner = () => {
    setHasScanned(false);
    setLastScanPhoto(null);
    setLastScanFeatures(null);
    setScannedMatches([]);
  };

  // Filter list of reports in database
  const filteredReports = reports.filter((report) => {
    const textMatch =
      report.fullName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      report.lastLocation.address.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (report.distinctiveFeatures &&
        report.distinctiveFeatures.toLowerCase().includes(searchFilter.toLowerCase()));

    const genderMatch =
      genderFilter === "todos" ||
      report.gender === genderFilter ||
      (genderFilter === "Masculino" && report.gender === "Macho") ||
      (genderFilter === "Femenino" && report.gender === "Hembra");
    const typeMatch = typeFilter === "todos" || report.type === typeFilter;

    // Category filter matching
    const isPet = report.facialFeatures?.isPet || false;
    const categoryMatch =
      categoryFilter === "todos" ||
      (categoryFilter === "mascota" && isPet) ||
      (categoryFilter === "humano" && !isPet);

    return textMatch && genderMatch && typeMatch && categoryMatch;
  });

  // Calculate high-level metrics
  const totalMissing = reports.filter(r => r.type === 'missing' && r.status === 'active').length;
  const totalFound = reports.filter(r => r.type === 'found' && r.status === 'active').length;
  const totalResolved = reports.filter(r => r.status === 'resolved').length;

  return (
    <div className="min-h-screen bg-pearl-white flex flex-col font-sans select-none pb-12">
      {/* Top Patriotic Ribbon Border */}
      <div className="h-2 w-full venezuela-gradient" />

      {/* Navigation Header */}
      <header className="bg-[#6B11F4] border-b border-[#510bc4] sticky top-0 z-[100] shadow-md text-white">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          
          {/* Logo & Slogan */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* S.O.S VENEZUELA Flag Icon & Text */}
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-brand-yellow flex items-center justify-center shadow-md border-2 border-white relative overflow-hidden flex-shrink-0">
                {/* Inside patriotic layout mini */}
                <div className="absolute inset-x-0 top-0 h-1/3 bg-[#FFC72C]" />
                <div className="absolute inset-x-0 top-1/3 h-1/3 bg-[#00247D]" />
                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-[#CF142B]" />
                <div className="z-10 text-white font-black text-xs drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.6)]">S.O.S</div>
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-display font-black text-base sm:text-xl tracking-tight text-white">S.O.S</span>
                  <span className="font-display font-black text-base sm:text-xl tracking-tight text-[#00F5C4]">VENEZUELA</span>
                </div>
                <p className="text-[9px] sm:text-[10px] text-purple-200 font-bold uppercase tracking-wider leading-none mt-1">
                  Sistema Humanitario de Reencuentro Familiar
                </p>
              </div>
            </div>
          </div>

          {/* Active Navigation and Alerts */}
          <div className="flex items-center gap-3 sm:gap-4">
            
            {/* Quick Stats Summary - Desktop */}
            <div className="hidden lg:flex items-center gap-3 text-xs border-r border-white/15 pr-4 mr-1">
              <span className="text-purple-200 font-medium">Estado del Canal:</span>
              <span className="bg-white/10 text-[#00F5C4] px-2.5 py-0.5 rounded-full font-bold border border-[#00F5C4]/20 flex items-center gap-1.5 shadow-sm">
                <span className="h-1.5 w-1.5 bg-[#00F5C4] rounded-full animate-ping" />
                Monitoreo AI Activo
              </span>
            </div>

            {/* Notification Alert Bell with dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
                className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition duration-150 relative cursor-pointer border border-white/10"
              >
                <Bell className="h-4.5 w-4.5 text-white" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-brand-red text-white font-extrabold text-[10px] rounded-full flex items-center justify-center animate-bounce border border-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown Drawer */}
              <AnimatePresence>
                {showNotificationsDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-3 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl z-[200] overflow-hidden"
                  >
                    <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
                      <span className="font-semibold text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Bell className="h-4 w-4 text-brand-yellow" />
                        Centro de Alertas de Rostros
                      </span>
                      <button
                        onClick={() => setShowNotificationsDropdown(false)}
                        className="text-slate-400 hover:text-white transition"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-slate-400 text-xs">
                          No tienes alertas de coincidencia todavía.
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            className={`p-3.5 transition duration-150 ${
                              notif.read ? 'bg-white' : 'bg-blue-50/50 hover:bg-blue-50'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-[10px] font-bold text-brand-red uppercase tracking-wide">
                                {notif.title}
                              </span>
                              {!notif.read && (
                                <button
                                  type="button"
                                  onClick={() => handleMarkAsRead(notif.id)}
                                  className="text-[9px] text-blue-600 hover:underline font-semibold"
                                >
                                  Marcar leída
                                </button>
                              )}
                            </div>
                            <p className="text-xs text-slate-600 mt-1">{notif.message}</p>
                            <span className="text-[9px] text-slate-400 block mt-2 font-mono">
                              {new Date(notif.date).toLocaleString()}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Separator */}
            <div className="h-6 w-[1px] bg-white/15" />

            {/* Yorders Brand Emblem to the extreme right */}
            <div className="flex items-center gap-2 select-none">
              <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner overflow-hidden flex-shrink-0">
                <svg viewBox="0 0 100 100" className="h-full w-full">
                  <rect width="100" height="100" fill="#6B11F4" />
                  {/* Bike/Motorcycle Handlebars left side */}
                  <path d="M 18 25 Q 32 25 35 40 L 35 75 M 52 25 Q 38 25 35 40" stroke="#00F5C4" strokeWidth="4.5" fill="none" strokeLinecap="round" />
                  {/* Fork & tyre */}
                  <rect x="33" y="48" width="4" height="28" rx="2" fill="#00F5C4" />
                  {/* Headlight */}
                  <circle cx="35" cy="38" r="6" fill="#00F5C4" />
                  {/* Grips */}
                  <line x1="15" y1="25" x2="21" y2="25" stroke="#00F5C4" strokeWidth="6.5" strokeLinecap="round" />
                  <line x1="49" y1="25" x2="55" y2="25" stroke="#00F5C4" strokeWidth="6.5" strokeLinecap="round" />
                  {/* Steering Wheel right side */}
                  <circle cx="68" cy="62" r="18" stroke="#00F5C4" strokeWidth="4.5" fill="none" />
                  <circle cx="68" cy="62" r="4" fill="#00F5C4" />
                  {/* Spoke paths */}
                  <path d="M 53 62 L 64 62 M 72 62 L 83 62 M 68 66 L 68 77" stroke="#00F5C4" strokeWidth="4" strokeLinecap="round" />
                </svg>
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[8px] font-mono font-black text-[#00F5C4] tracking-wider leading-none">BY</span>
                <span className="text-[11px] font-display font-black text-white tracking-tight leading-none mt-0.5">
                  YORDERS
                </span>
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 mt-6 flex-grow space-y-6">

        {/* Hero Banner Section */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-2xl p-6 sm:p-8 shadow-md relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/30 via-transparent to-transparent pointer-events-none" />
          <div className="absolute top-0 right-0 h-44 w-44 rounded-full bg-brand-yellow/10 blur-3xl pointer-events-none" />
          
          <div className="max-w-2xl space-y-3.5 relative z-10">
            <span className="bg-[#FFC72C]/15 text-[#FFC72C] text-[10px] font-black tracking-widest px-3 py-1 rounded-full uppercase border border-[#FFC72C]/30 animate-pulse">
              TECNOLOGÍA DE REENCUENTRO HUMANITARIO
            </span>
            <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight leading-none text-[#FBFBFA]">
              Buscador de Personas y Reconocimiento de Rostros por Catástrofes
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
              Plataforma MVP diseñada específicamente para la identificación rápida de víctimas en emergencias meteorológicas y desastres de Venezuela. Con georreferenciación inteligente y reconocimiento de fisonomía por Inteligencia Artificial Gemini.
            </p>
          </div>
        </div>

        {/* S.O.S STATS GRID */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3.5">
            <div className="p-2.5 bg-blue-50 text-brand-blue rounded-xl">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Buscados</span>
              <span className="text-xl font-bold font-display text-slate-950">{totalMissing}</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3.5">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">En Refugios</span>
              <span className="text-xl font-bold font-display text-slate-950">{totalFound}</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3.5">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Reencuentros</span>
              <span className="text-xl font-bold font-display text-slate-950">{totalResolved}</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3.5">
            <div className="p-2.5 bg-brand-red/10 text-brand-red rounded-xl">
              <AlertTriangle className="h-5 w-5 animate-bounce" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Coincidencias</span>
              <span className="text-xl font-bold font-display text-slate-950">{notifications.length}</span>
            </div>
          </div>
        </div>

        {/* Tab Selection Navigation */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('scan')}
            className={`py-3 px-6 text-sm font-semibold tracking-tight transition border-b-2 ${
              activeTab === 'scan'
                ? 'border-brand-blue text-brand-blue font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            1. Escaneo Facial Automatizado
          </button>
          <button
            onClick={() => setActiveTab('report')}
            className={`py-3 px-6 text-sm font-semibold tracking-tight transition border-b-2 ${
              activeTab === 'report'
                ? 'border-brand-blue text-brand-blue font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            2. Reportar Víctima (Crear Alerta)
          </button>
          <button
            onClick={() => setActiveTab('directory')}
            className={`py-3 px-6 text-sm font-semibold tracking-tight transition border-b-2 ${
              activeTab === 'directory'
                ? 'border-brand-blue text-brand-blue font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            3. Directorio Humano y Mapa
          </button>
        </div>

        {/* Content Area rendering chosen Tab */}
        <div className="space-y-6">
          {activeTab === 'scan' && (
            <div className="space-y-6 animate-fade-in">
              <FaceScanner onSearchComplete={handleFaceSearchComplete} />

              {/* Show Search results if user has executed a face scan */}
              {hasScanned && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Resultados del Escaneo de Rostro</h3>
                      <p className="text-xs text-slate-500">Rasgos analizados y candidatos potenciales identificados en la base de datos nacional.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetScanner}
                      className="text-xs font-semibold text-brand-blue hover:underline cursor-pointer"
                    >
                      Limpiar e iniciar nueva búsqueda
                    </button>
                  </div>

                  {/* Scanned features feedback card */}
                  {lastScanFeatures && (
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 animate-fade-in">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        ✨
                        Firma Descriptiva {lastScanFeatures.isPet ? 'Mascota' : 'Facial'} AI (Gemini)
                      </div>
                      <p className="text-xs text-slate-700 italic mb-3">"{lastScanFeatures.metadataSummary || 'Firma de análisis generada por visión artificial'}"</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        {lastScanFeatures.isPet ? (
                          <>
                            <div className="bg-white p-2 rounded-lg border border-slate-200/50">
                              <span className="text-[10px] text-slate-400 block font-semibold">Especie</span>
                              <span className="font-bold text-slate-700">🐾 {lastScanFeatures.petType || 'Mascota'}</span>
                            </div>
                            <div className="bg-white p-2 rounded-lg border border-slate-200/50">
                              <span className="text-[10px] text-slate-400 block font-semibold">Raza y Pelaje</span>
                              <span className="font-bold text-slate-700 line-clamp-1">{lastScanFeatures.petBreedColor || 'Desconocida'}</span>
                            </div>
                            <div className="bg-white p-2 rounded-lg border border-slate-200/50">
                              <span className="text-[10px] text-slate-400 block font-semibold">Color de Ojos</span>
                              <span className="font-bold text-slate-700">👁️ {lastScanFeatures.eyeColor || 'Desconocido'}</span>
                            </div>
                            <div className="bg-white p-2 rounded-lg border border-slate-200/50">
                              <span className="text-[10px] text-slate-400 block font-semibold">Expresión</span>
                              <span className="font-bold text-slate-700">🎭 {lastScanFeatures.expression || 'Desconocida'}</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="bg-white p-2 rounded-lg border border-slate-200/50">
                              <span className="text-[10px] text-slate-400 block font-semibold">Género estimado</span>
                              <span className="font-bold text-slate-700">{lastScanFeatures.gender || 'Desconocido'}</span>
                            </div>
                            <div className="bg-white p-2 rounded-lg border border-slate-200/50">
                              <span className="text-[10px] text-slate-400 block font-semibold">Edad estimada</span>
                              <span className="font-bold text-slate-700">{lastScanFeatures.approximateAge || 'Desconocido'}</span>
                            </div>
                            {lastScanFeatures.eyeColor ? (
                              <div className="bg-white p-2 rounded-lg border border-slate-200/50">
                                <span className="text-[10px] text-slate-400 block font-semibold">Color de Ojos</span>
                                <span className="font-bold text-slate-700">👁️ {lastScanFeatures.eyeColor}</span>
                              </div>
                            ) : (
                              <div className="bg-white p-2 rounded-lg border border-slate-200/50">
                                <span className="text-[10px] text-slate-400 block font-semibold">Cabello</span>
                                <span className="font-bold text-slate-700 line-clamp-1">{lastScanFeatures.hairColorStyle || 'Desconocido'}</span>
                              </div>
                            )}
                            <div className="bg-white p-2 rounded-lg border border-slate-200/50">
                              <span className="text-[10px] text-slate-400 block font-semibold">Rasgos clave</span>
                              <span className="font-bold text-slate-700 line-clamp-1">{lastScanFeatures.distinctiveMarks || lastScanFeatures.faceShape || 'Ninguno'}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Candidates List component */}
                  <MatchesList matches={scannedMatches} onResolveReport={handleResolveReport} />
                </div>
              )}

              {/* Default seed match alert box so the UX is clear */}
              {!hasScanned && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex gap-3">
                    <div className="p-2 bg-amber-100 text-amber-700 rounded-lg flex-shrink-0 mt-0.5">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">Demostración del MVP S.O.S VENEZUELA</h4>
                      <p className="text-xs text-amber-800 leading-relaxed mt-1">
                        Para ver el emparejamiento facial automático en acción, puedes ir a la pestaña <strong>2. Reportar Víctima</strong> e ingresar una persona con rasgos de cicatriz en la ceja y barba para Las Tejerías, o subir la foto de 'Carlos Mendoza'. El sistema enlazará instantáneamente el registro con el reporte del refugio pre-cargado.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'report' && (
            <div className="animate-fade-in">
              <ReportForm onSuccess={handleReportCreated} />
            </div>
          )}

          {activeTab === 'directory' && (
            <div className="space-y-6 animate-fade-in">
              {/* Directory Map displaying all markers geolocated */}
              <DirectoryMap reports={reports} />

              {/* Directory Filter Drawer & List */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                
                <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Directorio de Reportes Humanitarios</h3>
                    <p className="text-xs text-slate-500">Listado general de búsquedas activas y reubicaciones.</p>
                  </div>

                  {/* Filters selectors */}
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                    >
                      <option value="todos">Personas y Mascotas 🧑🐾</option>
                      <option value="humano">Solo Personas 🧑</option>
                      <option value="mascota">Solo Mascotas 🐾</option>
                    </select>

                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                    >
                      <option value="todos">Todos los Estados</option>
                      <option value="missing">Buscados / Desaparecidos</option>
                      <option value="found">Encontrados / Refugio</option>
                    </select>

                    <select
                      value={genderFilter}
                      onChange={(e) => setGenderFilter(e.target.value)}
                      className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                    >
                      <option value="todos">Cualquier Sexo</option>
                      <option value="Masculino">Masculino / Macho</option>
                      <option value="Femenino">Femenino / Hembra</option>
                    </select>
                  </div>
                </div>

                {/* Search query input */}
                <div className="relative">
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Filtrar por nombre de la víctima, señas o dirección de Venezuela..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  />
                  <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                </div>

                {/* Grid List of current victims */}
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {filteredReports.length === 0 ? (
                    <div className="col-span-full text-center py-8 text-xs text-slate-400">
                      No se encontraron reportes que coincidan con los filtros aplicados.
                    </div>
                  ) : (
                    filteredReports.map((report) => (
                      <div
                        key={report.id}
                        className={`border rounded-xl p-4 space-y-3 shadow-xs relative overflow-hidden flex flex-col justify-between ${
                          report.status === "resolved" ? "bg-slate-50 opacity-65 border-slate-100" : "bg-white border-slate-200"
                        }`}
                      >
                        <div>
                          {/* Banner Type indicator */}
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              report.type === 'missing'
                                ? 'bg-blue-50 text-brand-blue border border-blue-100'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                            }`}>
                              {report.type === 'missing' ? 'Buscado' : 'Encontrado'}
                            </span>
                            
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              report.status === 'resolved'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {report.status === 'resolved' ? 'Reencontrado' : 'Búsqueda Activa'}
                            </span>
                          </div>

                          {/* Image inside card if available */}
                          {report.photoUrl && (
                            <div className="h-28 w-full rounded-lg overflow-hidden bg-slate-50 my-2.5 border border-slate-100">
                              <img
                                src={report.photoUrl}
                                alt={report.fullName}
                                className="h-full w-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          )}

                          <h4 className="font-bold text-slate-900 font-display text-sm mt-2 flex items-center gap-1.5">
                            {report.facialFeatures?.isPet ? '🐾 ' : '🧑 '}
                            {report.fullName}
                          </h4>
                          {report.facialFeatures?.isPet ? (
                            <p className="text-[11px] text-slate-500 font-medium">
                              🐾 Mascota: {report.facialFeatures?.petType || "Animal"} | {report.gender}
                              {report.facialFeatures?.petBreedColor && ` (${report.facialFeatures.petBreedColor})`}
                            </p>
                          ) : (
                            <p className="text-[11px] text-slate-500 font-medium">Edad: {report.age} | Género: {report.gender}</p>
                          )}

                          {/* Render detailed physical features if available */}
                          {(report.facialFeatures?.eyeColor || report.facialFeatures?.faceShape || report.facialFeatures?.expression) && (
                            <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] bg-slate-50 border border-slate-100/50 text-slate-500 px-2 py-1 rounded-lg mt-1.5">
                              {report.facialFeatures?.eyeColor && <span>👁️ Ojos: {report.facialFeatures.eyeColor}</span>}
                              {report.facialFeatures?.faceShape && <span>👤 Hocico/Rostro: {report.facialFeatures.faceShape}</span>}
                              {report.facialFeatures?.expression && <span>🎭 {report.facialFeatures.expression}</span>}
                            </div>
                          )}

                          <div className="space-y-1.5 text-[11px] text-slate-600 mt-2.5">
                            <div className="flex items-start gap-1">
                              <MapPin className="h-3 w-3 text-slate-400 flex-shrink-0 mt-0.5" />
                              <span className="line-clamp-2">{report.lastLocation.address}</span>
                            </div>
                            {report.distinctiveFeatures && (
                              <p className="line-clamp-2 italic text-slate-500 bg-slate-50 p-1.5 rounded border border-slate-100">
                                "{report.distinctiveFeatures}"
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Contact Reporter Footer inside card */}
                        <div className="border-t border-slate-100 pt-2.5 mt-2 flex items-center justify-between gap-2">
                          <div className="text-[10px]">
                            <span className="text-slate-400 block font-medium">Contacto:</span>
                            <span className="font-bold text-slate-700 truncate block max-w-[120px]">
                              {report.reporterName}
                            </span>
                          </div>
                          
                          <a
                            href={`tel:${report.reporterContact}`}
                            className="p-1.5 bg-slate-900 hover:bg-slate-950 text-white rounded-lg transition text-xs flex items-center gap-1 shrink-0 cursor-pointer"
                          >
                            <Phone className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

      </main>

      {/* OVERLAY DIALOG MODAL FOR AUTOMATIC MATCH DETECTED */}
      <AnimatePresence>
        {overlayMatch && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="bg-white rounded-2xl max-w-2xl w-full border-t-8 border-brand-red shadow-2xl overflow-hidden relative"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setOverlayMatch(null)}
                className="absolute top-4 right-4 p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-full transition"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="p-6 space-y-5">
                
                {/* Header Banner */}
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-brand-red/10 text-brand-red rounded-full animate-bounce">
                    <ShieldAlert className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-[10px] bg-brand-red text-white font-extrabold px-2 py-0.5 rounded-full uppercase tracking-widest animate-pulse">
                      ¡COINCIDENCIA ENCONTRADA!
                    </span>
                    <h3 className="text-lg font-black font-display text-slate-950 mt-1">
                      El sistema ha detectado una posible vinculación automática
                    </h3>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Basado en la fisonomía facial analizada por Inteligencia Artificial y la geolocalización de las víctimas del desastre de Venezuela, se han encontrado coincidencias automáticas de alto grado:
                </p>

                {/* Two matching parties cards side-by-side */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Newly reported person */}
                  <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50 relative">
                    <span className="absolute top-2 right-2 text-[8px] bg-brand-blue text-white font-bold px-1.5 py-0.5 rounded uppercase">
                      Nuevo Reporte
                    </span>
                    
                    {overlayMatch.newReport.photoUrl && (
                      <div className="h-28 w-full rounded-lg overflow-hidden border border-slate-200 mb-2">
                        <img
                          src={overlayMatch.newReport.photoUrl}
                          alt="Nuevo"
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                    
                    <h5 className="font-bold text-xs text-slate-900">{overlayMatch.newReport.fullName}</h5>
                    <p className="text-[10px] text-slate-400">Género: {overlayMatch.newReport.gender}</p>
                    <p className="text-[10px] text-slate-600 line-clamp-2 mt-1">
                      <strong>Locación:</strong> {overlayMatch.newReport.lastLocation.address}
                    </p>
                  </div>

                  {/* Existing match candidate */}
                  <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50 relative">
                    <span className="absolute top-2 right-2 text-[8px] bg-emerald-700 text-white font-bold px-1.5 py-0.5 rounded uppercase">
                      Coincidencia ({overlayMatch.matchedReports[0].confidenceScore}%)
                    </span>
                    
                    {overlayMatch.matchedReports[0].report.photoUrl && (
                      <div className="h-28 w-full rounded-lg overflow-hidden border border-slate-200 mb-2">
                        <img
                          src={overlayMatch.matchedReports[0].report.photoUrl}
                          alt="Match"
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                    
                    <h5 className="font-bold text-xs text-slate-900">{overlayMatch.matchedReports[0].report.fullName}</h5>
                    <p className="text-[10px] text-slate-400">Género: {overlayMatch.matchedReports[0].report.gender}</p>
                    <p className="text-[10px] text-slate-600 line-clamp-2 mt-1">
                      <strong>Ubicación:</strong> {overlayMatch.matchedReports[0].report.lastLocation.address}
                    </p>
                  </div>
                </div>

                {/* Gemini AI reasoning overview text */}
                <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-100 text-xs">
                  <div className="font-semibold text-emerald-800 flex items-center gap-1.5 mb-1">
                    <Sparkles className="h-4 w-4 text-[#FFC72C] animate-spin" />
                    Razonamiento del Reconocimiento de Rostro
                  </div>
                  <p className="text-emerald-950 italic">
                    "{overlayMatch.matchedReports[0].explanation}"
                  </p>
                </div>

                {/* Quick actions inside popup */}
                <div className="flex gap-2.5 border-t border-slate-100 pt-4">
                  <a
                    href={`tel:${overlayMatch.matchedReports[0].report.reporterContact}`}
                    className="flex-1 py-2 bg-slate-900 hover:bg-slate-950 text-white rounded-xl text-center text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    Contactar Inmediatamente
                  </a>
                  <button
                    type="button"
                    onClick={() => setOverlayMatch(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
                  >
                    Entendido, Cerrar
                  </button>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-display font-black tracking-tight text-brand-blue">S.O.S</span>
            <span className="font-display font-black tracking-tight text-brand-red">VENEZUELA</span>
            <span>| © 2026 Red Humanitaria de Emergencias</span>
          </div>
          <div className="flex gap-4">
            <a href="#" className="hover:underline">Manual de Ayuda</a>
            <a href="#" className="hover:underline">Cruz Roja Venezolana</a>
            <a href="#" className="hover:underline">Protección Civil</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
