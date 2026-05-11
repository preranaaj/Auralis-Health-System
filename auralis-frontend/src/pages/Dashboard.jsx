import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import {
    Activity, AlertTriangle, Clock, Heart,
    Wind, TrendingUp, TrendingDown, User as UserIcon,
    RefreshCw, Shield, XCircle,
    CheckCircle2, Calendar, Menu, X,
    LayoutDashboard, Users, Stethoscope, Settings, LogOut,
    ClipboardList, CheckCircle, Moon, Sun
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchPatients, fetchAppointments, fetchPatientVitals, fetchPatientById, updateAppointment } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';

// ─── Status helpers ──────────────────────────────────────────────────────────
const STATUS_CONFIG = {
    Critical: { border: 'border-red-500/60', bg: 'bg-red-950/40', badge: 'bg-red-500 text-white', dot: 'bg-red-400', glow: 'shadow-red-500/20' },
    Warning:  { border: 'border-amber-500/60', bg: 'bg-amber-950/30', badge: 'bg-amber-500 text-black', dot: 'bg-amber-400', glow: 'shadow-amber-500/20' },
    Stable:   { border: 'border-emerald-500/40', bg: 'bg-slate-900/60', badge: 'bg-emerald-500 text-white', dot: 'bg-emerald-400', glow: 'shadow-emerald-500/10' },
    Pending:  { border: 'border-slate-600/40', bg: 'bg-slate-900/60', badge: 'bg-slate-500 text-white', dot: 'bg-slate-400', glow: '' },
};

const getStatus = (patient) => {
    const s = (patient.status || '').toLowerCase();
    if (s === 'critical') return 'Critical';
    if (s === 'warning' || s === 'monitoring') return 'Warning';
    if (s === 'stable') return 'Stable';
    return 'Pending';
};

const VitalPill = ({ icon: Icon, label, value, color }) => (
    <div className="flex flex-col gap-0.5">
        <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>{label}</span>
        <span className={cn("text-sm font-black", color)}>{value ?? '—'}</span>
    </div>
);

// ─── Patient Card ─────────────────────────────────────────────────────────────
const PatientCard = ({ patient, vitals, onClick, delay = 0 }) => {
    const status = getStatus(patient);
    const cfg = STATUS_CONFIG[status];
    const latest = vitals?.[vitals.length - 1];

    const hrColor = latest?.hr > 110 || latest?.hr < 50 ? 'text-red-400' : 'text-cyan-400';
    const bpColor = latest?.sbp > 160 || latest?.sbp < 90 ? 'text-red-400' : 'text-amber-400';
    const spo2Color = latest?.spo2 < 94 ? 'text-red-400' : 'text-emerald-400';

    const alerts = patient.alerts || [];

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay }}
            onClick={onClick}
            className={cn(
                "relative rounded-2xl border-2 p-4 cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:brightness-110 shadow-lg",
                cfg.border, cfg.bg, cfg.glow
            )}
            style={{ boxShadow: status === 'Critical' ? '0 0 24px rgba(239,68,68,0.15)' : '' }}
        >
            {/* Pulsing dot for critical */}
            {status === 'Critical' && (
                <span className="absolute top-3 right-3 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                </span>
            )}

            {/* Header */}
            <div className="flex items-start gap-3 mb-3">
                <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0",
                    status === 'Critical' ? 'bg-red-600' : status === 'Warning' ? 'bg-amber-600' : 'bg-indigo-700'
                )}>
                    {patient.name?.charAt(0) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-white font-black text-sm leading-tight truncate">
                        {patient.name}, {patient.age}{patient.gender === 'Male' ? 'M' : patient.gender === 'Female' ? 'F' : ''}
                    </p>
                    <p className="text-slate-400 text-[11px] font-semibold">
                        {patient.ward ? `Ward ${patient.ward}` : `Bed ${patient.bed || '—'}`}
                    </p>
                </div>
            </div>

            {/* Condition */}
            <p className="text-slate-300 text-[11px] font-semibold mb-3 truncate">{patient.condition || 'Under Observation'}</p>

            {/* Vitals Row */}
            {latest ? (
                <div className="flex items-center gap-4 py-2 border-t border-white/10 mb-2">
                    <VitalPill icon={Heart} label="HR" value={latest.hr} color={hrColor} />
                    <VitalPill icon={Activity} label="BP" value={latest.sbp ? `${latest.sbp}/${latest.dbp || '—'}` : '—'} color={bpColor} />
                    <VitalPill icon={Wind} label="SpO2" value={latest.spo2 ? `${latest.spo2}%` : '—'} color={spo2Color} />
                </div>
            ) : (
                <div className="py-2 border-t border-white/10 mb-2">
                    <p className="text-[10px] text-slate-500 italic">No vitals recorded</p>
                </div>
            )}

            {/* Trend */}
            {patient.trend && (
                <div className="flex items-center gap-1.5 mb-2">
                    {patient.trend === 'Upward' ? (
                        <TrendingUp className="h-3 w-3 text-amber-400" />
                    ) : (
                        <TrendingDown className="h-3 w-3 text-emerald-400" />
                    )}
                    <span className="text-[10px] font-bold text-slate-400">Trending {patient.trend}</span>
                </div>
            )}

            {/* Alert badges */}
            {alerts.length > 0 && (
                <div className="mt-1 space-y-1">
                    {alerts.slice(0, 2).map((alert, i) => (
                        <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
                            <AlertTriangle className="h-3 w-3 text-amber-400 flex-shrink-0" />
                            <span className="text-[10px] text-amber-300 font-semibold truncate">{alert}</span>
                        </div>
                    ))}
                </div>
            )}
        </motion.div>
    );
};

// ─── Appointment Modal (kept from original) ───────────────────────────────────
const AppointmentModal = ({ appointment, onClose, onRefresh }) => {
    const [patient, setPatient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [cancellationReason, setCancellationReason] = useState("");
    const [showCancelInput, setShowCancelInput] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (appointment) {
            setLoading(true);
            fetchPatientById(appointment.patient_id).then(setPatient).finally(() => setLoading(false));
        }
    }, [appointment]);

    const handleAction = async (status) => {
        if (status === 'Cancelled' && !showCancelInput) { setShowCancelInput(true); return; }
        setIsSaving(true);
        try {
            await updateAppointment(appointment.id, { status, cancellation_reason: status === 'Cancelled' ? cancellationReason : null });
            onRefresh(); onClose();
        } catch (err) { alert("Failed to update appointment: " + err.message); }
        finally { setIsSaving(false); }
    };

    if (!appointment) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-16 overflow-y-auto no-scrollbar">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/70 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white/90 backdrop-blur-2xl rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-white/50 flex flex-col max-h-[90vh]">
                <div className="p-8 pb-4 shrink-0">
                    <div className="flex justify-between items-start">
                        <h2 className="text-2xl font-black tracking-tighter">Manage Appointment</h2>
                        <button onClick={onClose}><XCircle className="h-6 w-6 text-slate-400" /></button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-8 no-scrollbar">
                    <div className="space-y-6">
                        {loading ? <div className="animate-pulse h-32 bg-slate-100 rounded-2xl" /> : (
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                {[['Patient', patient?.name], ['Age/Gender', `${patient?.age}y / ${patient?.gender}`], ['Condition', patient?.condition], ['Status', patient?.status], ['Date', appointment.date], ['Time', appointment.time]].map(([k, v]) => (
                                    <div key={k} className="flex justify-between p-3 bg-slate-50 rounded-xl">
                                        <span className="font-bold text-slate-500">{k}</span>
                                        <span className="font-black text-slate-800">{v}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {showCancelInput && (
                            <textarea value={cancellationReason} onChange={e => setCancellationReason(e.target.value)} placeholder="State the clinical reasoning for session termination..." className="w-full p-4 rounded-xl border-2 border-rose-100 bg-rose-50 outline-none font-bold text-rose-900 h-24" />
                        )}
                    </div>
                </div>

                <div className="p-6 bg-slate-50 border-t grid grid-cols-4 gap-3 shrink-0">
                    {[['Approved', 'bg-indigo-600', CheckCircle], ['Pending', 'bg-amber-500', Clock], ['Completed', 'bg-emerald-500', CheckCircle2], [showCancelInput ? 'Confirm Cancel' : 'Cancel', 'bg-rose-600', XCircle]].map(([label, color, Icon]) => (
                        <button key={label} disabled={isSaving} onClick={() => handleAction(label === 'Confirm Cancel' ? 'Cancelled' : label)} className={cn("py-3 rounded-xl font-black text-[10px] uppercase tracking-widest text-white flex items-center justify-center gap-1.5", color)}>
                            <Icon className="h-3.5 w-3.5" />{label}
                        </button>
                    ))}
                </div>
            </motion.div>
        </div>
    );
};

// ─── Slide-out Side Menu ─────────────────────────────────────────────────────
const SideMenu = ({ isOpen, onClose, user, logout }) => {
    const { isDark, toggle: toggleTheme } = useTheme();
    
    const getNavItems = () => {
        if (user?.role === 'Admin') return [
            { name: 'Control Center', path: '/admin', icon: Shield },
            { name: 'Patients', path: '/patients', icon: Users },
            { name: 'Clinicians', path: '/doctors', icon: Stethoscope },
            { name: 'Audit Logs', path: '/audit-logs', icon: ClipboardList },
            { name: 'Settings', path: '/settings', icon: Settings },
        ];
        if (user?.role === 'Doctor') return [
            { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
            { name: 'Appointments', path: '/appointments', icon: ClipboardList },
            { name: 'Patients', path: '/patients', icon: Users },
            { name: 'Schedule', path: '/schedule', icon: Calendar },
            { name: 'Settings', path: '/settings', icon: Settings },
        ];
        return [
            { name: 'My Health', path: '/portal', icon: Heart },
            { name: 'Appointments', path: '/schedule', icon: Calendar },
            { name: 'Settings', path: '/settings', icon: Settings },
        ];
    };
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose} className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm" />
                    <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-700/50 flex flex-col shadow-2xl">
                        <div className="flex items-center justify-between p-5 border-b border-slate-800">
                            <div className="flex items-center gap-2">
                                <div className="h-7 w-7 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                                    <Activity className="h-4 w-4 text-cyan-400" />
                                </div>
                                <span className="text-white font-black text-lg tracking-tight">Auralis</span>
                            </div>
                            <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                            {getNavItems().map(item => (
                                <NavLink key={item.path} to={item.path} onClick={onClose}
                                    className={({ isActive }) => cn(
                                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all',
                                        isActive ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                               : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                    )}>
                                    <item.icon className="h-4 w-4" />{item.name}
                                </NavLink>
                            ))}
                        </nav>
                        <div className="p-4 border-t border-slate-800">
                            <div className="flex items-center gap-3 p-3 mb-2">
                                <div className="h-9 w-9 rounded-xl bg-indigo-600/30 flex items-center justify-center">
                                    <UserIcon className="h-4 w-4 text-indigo-400" />
                                </div>
                                <div>
                                    <p className="text-white font-black text-sm">{user?.name || 'Clinician'}</p>
                                    <p className="text-slate-500 text-[11px] font-semibold">{user?.role || 'Doctor'}</p>
                                </div>
                            </div>
                            <button onClick={logout} className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm font-bold text-red-400 hover:bg-red-500/10 transition-all">
                                <LogOut className="h-4 w-4" /> Sign Out
                            </button>
                            <button onClick={toggleTheme} className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm font-bold text-slate-400 hover:bg-slate-800 transition-all mt-1">
                                {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
                                {isDark ? 'Light Mode' : 'Dark Mode'}
                            </button>
                        </div>
                    </motion.aside>
                </>
            )}
        </AnimatePresence>
    );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const Dashboard = () => {
    const { user, logout } = useAuth();
    const { isDark, toggle: toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [patients, setPatients] = useState([]);
    const [vitalsMap, setVitalsMap] = useState({});
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('All');
    const [selectedApt, setSelectedApt] = useState(null);
    const [lastRefresh, setLastRefresh] = useState(new Date());
    const [refreshing, setRefreshing] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    const loadData = useCallback(async (showRefreshing = false) => {
        if (showRefreshing) setRefreshing(true);
        try {
            const patientsData = await fetchPatients();
            setPatients(patientsData);
            setLastRefresh(new Date());

            // Fetch vitals for all patients in parallel
            const vitalsEntries = await Promise.allSettled(
                patientsData.map(p => fetchPatientVitals(p.id).then(v => [p.id, v]))
            );
            const map = {};
            vitalsEntries.forEach(r => { if (r.status === 'fulfilled') map[r.value[0]] = r.value[1]; });
            setVitalsMap(map);

            if (user?.role === 'Doctor') {
                const aptsData = await fetchAppointments(user.id, 'Doctor');
                setAppointments(aptsData);
            }
        } catch (err) {
            console.error("Dashboard load error:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user]);

    useEffect(() => { loadData(); }, [loadData]);

    // Categorize patients using backend status
    const categorized = patients.reduce((acc, p) => {
        const status = getStatus(p);
        acc[status] = (acc[status] || []);
        acc[status].push(p);
        return acc;
    }, {});

    const critical = categorized['Critical'] || [];
    const warning = categorized['Warning'] || [];
    const stable = categorized['Stable'] || [];
    const pending = categorized['Pending'] || [];

    const filteredPatients = filter === 'All' ? patients
        : filter === 'Critical' ? critical
        : filter === 'Warning' ? warning
        : filter === 'Stable' ? stable
        : pending;

    const FILTERS = [
        { key: 'All', label: `ALL PATIENTS: ${patients.length}`, color: 'border-cyan-500 text-cyan-400 bg-cyan-500/10' },
        { key: 'Critical', label: `CRITICAL: ${critical.length}`, color: 'border-red-500 text-red-400 bg-red-500/10' },
        { key: 'Warning', label: `WARNING: ${warning.length}`, color: 'border-amber-500 text-amber-400 bg-amber-500/10' },
        { key: 'Stable', label: `STABLE: ${stable.length}`, color: 'border-emerald-500 text-emerald-400 bg-emerald-500/10' },
    ];

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
            <div className="h-12 w-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-cyan-400 font-black uppercase tracking-widest text-sm animate-pulse">Initializing Clinical Workstation...</p>
        </div>
    );

    return (
        <div className="h-screen bg-slate-950 text-white flex flex-col overflow-hidden relative">
            {/* Side Menu */}
            <SideMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} user={user} logout={logout} />

            {/* ── Header ── */}
            <div className="z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 lg:px-8 py-3 shrink-0">
                <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setMenuOpen(true)} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all">
                            <Menu className="h-5 w-5" />
                        </button>
                        <div>
                            <h1 className="text-lg sm:text-xl font-black tracking-tight text-white leading-tight">
                                Auralis <span className="text-cyan-400">Clinical Workstation</span>
                            </h1>
                            <p className="text-slate-500 text-[11px] font-semibold hidden sm:block">
                                {user?.department || 'Emergency Department'} — Real-Time Census
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">Live</span>
                        </div>
                        <span className="text-slate-600 text-[11px] hidden md:block">
                            {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <button onClick={() => loadData(true)} disabled={refreshing}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all">
                            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar">
                <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-10">
                {/* Status Filter Tabs */}
                <div className="flex flex-wrap gap-2 sm:gap-3 mb-5 sm:mb-6">
                    {FILTERS.map(f => (
                        <button
                            key={f.key}
                            onClick={() => setFilter(f.key)}
                            className={cn(
                                "px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl border-2 text-xs font-black uppercase tracking-widest transition-all",
                                filter === f.key ? f.color : 'border-slate-700 text-slate-500 bg-transparent hover:border-slate-500'
                            )}
                        >
                            <span className="flex items-center gap-2">
                                {f.key === 'Critical' && <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />}
                                {f.key === 'Warning' && <span className="h-2 w-2 rounded-full bg-amber-500" />}
                                {f.key === 'Stable' && <span className="h-2 w-2 rounded-full bg-emerald-500" />}
                                {f.label}
                            </span>
                        </button>
                    ))}
                </div>

            {/* Critical Alert Banner */}
            {critical.length > 0 && filter !== 'Stable' && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-4 bg-red-950/60 border border-red-500/40 rounded-2xl flex items-center gap-3"
                >
                    <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 animate-pulse" />
                    <div>
                        <span className="text-red-300 font-black text-sm">{critical.length} PATIENT{critical.length > 1 ? 'S' : ''} REQUIRE IMMEDIATE ATTENTION</span>
                        <span className="text-red-400/60 text-xs font-semibold ml-2">{critical.map(p => p.name).join(', ')}</span>
                    </div>
                </motion.div>
            )}

            {/* Patient Grid */}
            {filteredPatients.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 gap-4 text-slate-600">
                    <Shield className="h-12 w-12 opacity-30" />
                    <p className="font-black uppercase tracking-widest text-sm">No {filter} patients in this ward</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                    {filteredPatients.map((patient, i) => (
                        <PatientCard
                            key={patient.id}
                            patient={patient}
                            vitals={vitalsMap[patient.id]}
                            delay={i * 0.04}
                            onClick={() => navigate(`/patients/${patient.id}/cdss`)}
                        />
                    ))}
                </div>
            )}

            {/* Doctor Appointments section */}
            {user?.role === 'Doctor' && appointments.length > 0 && (
                <div className="mt-12">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-xl font-black tracking-tight flex items-center gap-3 text-white">
                            <Calendar className="h-5 w-5 text-indigo-400" /> Today's Appointments
                        </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {appointments.slice(0, 6).map(apt => (
                            <motion.div
                                key={apt.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="bg-slate-900 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between hover:border-indigo-500/40 transition-all cursor-pointer"
                                onClick={() => setSelectedApt(apt)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-xl bg-indigo-900/60 flex items-center justify-center">
                                        <UserIcon className="h-4 w-4 text-indigo-400" />
                                    </div>
                                    <div>
                                        <p className="text-white font-black text-sm">{apt.patient_name}</p>
                                        <p className="text-slate-400 text-xs flex items-center gap-1"><Clock className="h-3 w-3" />{apt.date} {apt.time}</p>
                                    </div>
                                </div>
                                <span className={cn("px-2 py-0.5 rounded-lg text-[10px] font-black uppercase",
                                    apt.status === 'Approved' ? 'bg-emerald-500/20 text-emerald-400' :
                                    apt.status === 'Cancelled' ? 'bg-red-500/20 text-red-400' :
                                    apt.status === 'Completed' ? 'bg-indigo-500/20 text-indigo-400' :
                                    'bg-amber-500/20 text-amber-400'
                                )}>{apt.status}</span>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            </div>{/* end max-w wrapper */}
            </div>{/* end scrollable container */}

            <AnimatePresence>
                {selectedApt && <AppointmentModal appointment={selectedApt} onClose={() => setSelectedApt(null)} onRefresh={() => loadData()} />}
            </AnimatePresence>
        </div>
    );
};

export default Dashboard;
