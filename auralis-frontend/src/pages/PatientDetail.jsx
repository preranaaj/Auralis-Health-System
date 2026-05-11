import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft, Heart, Activity, Wind, Thermometer,
    AlertTriangle, Clock, Calendar, Droplets, TrendingUp,
    FileText, User, Share2, CheckCircle2, CreditCard
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { fetchPatientById, fetchPatientVitals, fetchPatientTimeline, addVitals, fetchDiagnosis, fetchBills, fetchPatientMLTrends, fetchPatientRiskAssessment, fetchPatientRiskHistory } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { Plus, Save, X, LayoutGrid, LineChart as ChartIcon, History as HistoryIcon } from 'lucide-react';
import VitalsChart from '../components/VitalsChart';
import MLTrendAnalysis from '../components/MLTrendAnalysis';

const PatientDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [patient, setPatient] = useState(null);
    const [vitals, setVitals] = useState([]);
    const [timeline, setTimeline] = useState([]);
    const [diagnosis, setDiagnosis] = useState([]);
    const [bills, setBills] = useState([]);
    const [mlTrends, setMlTrends] = useState({ anomalies: [], trends: [], summary: '' });
    const [riskAssessment, setRiskAssessment] = useState({ risk_score: 0.15, status: 'Low' });
    const [riskHistory, setRiskHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [vitalsViewMode, setVitalsViewMode] = useState('grid'); // 'grid' or 'chart'
    const [timeScale, setTimeScale] = useState('all'); // '24h', '7d', 'all'
    const { user } = useAuth();

    // Vitals Form State
    const [showVitalsModal, setShowVitalsModal] = useState(false);
    const [vitalsForm, setVitalsForm] = useState({
        hr: '',
        sbp: '',
        dbp: '',
        rr: '',
        temp: '',
        spo2: '',
        weight: '',
        height: '',
        note: ''
    });

    const refreshData = async () => {
        try {
            const [pData, vData, tData, dData, bData, mlData, rData, rhData] = await Promise.all([
                fetchPatientById(id),
                fetchPatientVitals(id),
                fetchPatientTimeline(id),
                fetchDiagnosis(id),
                fetchBills(id),
                fetchPatientMLTrends(id, timeScale).catch(() => ({ anomalies: [], trends: [], summary: 'Analysis currently unavailable.' })),
                fetchPatientRiskAssessment(id).catch(() => ({ risk_score: 0.15, status: 'Low' })),
                fetchPatientRiskHistory(id).catch(() => [])
            ]);
            setPatient(pData);
            setVitals(vData);
            setTimeline(tData);
            setDiagnosis(dData);
            setBills(bData);
            setMlTrends(mlData);
            setRiskAssessment(rData);
            setRiskHistory(rhData);
        } catch (error) {
            console.error("Failed to load clinical data:", error);
        }
    };

    const handleAddVitals = async (e) => {
        e.preventDefault();
        try {
            await addVitals(id, {
                hr: parseInt(vitalsForm.hr),
                sbp: parseInt(vitalsForm.sbp),
                dbp: parseInt(vitalsForm.dbp),
                rr: parseInt(vitalsForm.rr),
                temp: parseFloat(vitalsForm.temp),
                spo2: parseInt(vitalsForm.spo2),
                weight: vitalsForm.weight ? parseFloat(vitalsForm.weight) : null,
                height: vitalsForm.height ? parseFloat(vitalsForm.height) : null,
                note: vitalsForm.note
            });
            setShowVitalsModal(false);
            setVitalsForm({ hr: '', sbp: '', dbp: '', rr: '', temp: '', spo2: '', weight: '', height: '', note: '' });
            await refreshData();
            alert("Vitals synchronized successfully. Clinical state and risk analysis updated.");
        } catch (err) {
            alert("Failed to record vitals: " + err.message);
        }
    };

    useEffect(() => {
        setLoading(true);
        refreshData().finally(() => setLoading(false));
    }, [id]);

    useEffect(() => {
        if (patient) { // Don't run on mount before initial data is loaded
            fetchPatientMLTrends(id, timeScale)
                .then(data => setMlTrends(data))
                .catch(() => setMlTrends({ anomalies: [], trends: [], summary: 'Analysis currently unavailable.' }));
        }
    }, [timeScale, id]);

    if (loading) return (
        <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
            <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground font-medium">Retrieving Electronic Health Records...</p>
        </div>
    );

    if (!patient) return <div>Patient not found.</div>;

    const filterDataByScale = (data) => {
        if (!data || data.length === 0) return [];
        const now = new Date();
        if (timeScale === '24h') {
            const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
            return data.filter(d => new Date(d.timestamp || d.time) >= twentyFourHoursAgo);
        }
        if (timeScale === '7d') {
            const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
            return data.filter(d => new Date(d.timestamp || d.time) >= sevenDaysAgo);
        }
        return data;
    };

    const filteredVitals = filterDataByScale(vitals);
    const filteredRiskHistory = filterDataByScale(riskHistory);
    const latestVitals = vitals.length > 0 ? vitals[vitals.length - 1] : { hr: '--', sbp: '--', spo2: '--', temp: '--' };

    return (
        <div className="space-y-8 pb-16">
            {/* Immersive Header / Navigation */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <button
                    onClick={() => navigate('/patients')}
                    className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-all group"
                >
                    <div className="p-2 bg-secondary/50 rounded-xl group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                        <ChevronLeft className="h-6 w-6 group-hover:-translate-x-1 transition-transform" />
                    </div>
                    <span className="text-lg font-bold">Clinical Census</span>
                </button>
                <div className="flex flex-wrap items-center gap-2 md:gap-4">
                    <Link
                        to={`/patients/${id}/timeline`}
                        className="px-4 md:px-5 py-2 md:py-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl md:rounded-2xl transition-all text-slate-600 dark:text-slate-400 shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-2 font-bold text-xs md:text-base"
                    >
                        <HistoryIcon className="h-4 w-4 md:h-6 md:w-6 text-primary dark:text-cyan-400" />
                        Clinical Timeline
                    </Link>
                    {(user?.role === 'Doctor' || user?.role === 'Admin') && (
                        <button
                            onClick={() => setShowVitalsModal(true)}
                            className="px-4 md:px-5 py-2 md:py-3 bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-xl md:rounded-2xl transition-all text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100 dark:border-indigo-900/50 flex items-center gap-2 font-bold text-xs md:text-base"
                        >
                            <Plus className="h-4 w-4 md:h-6 md:w-6" />
                            Record Vitals
                        </button>
                    )}
                    <button className="p-2 md:p-3 hover:bg-white dark:hover:bg-slate-800 hover:shadow-xl rounded-xl md:rounded-2xl transition-all text-muted-foreground shadow-sm bg-white/50 dark:bg-slate-900/50 border border-white/20 dark:border-slate-800">
                        <Share2 className="h-4 w-4 md:h-6 md:w-6" />
                    </button>
                    <button className="clinical-gradient text-white px-5 md:px-8 py-2 md:py-3.5 rounded-xl md:rounded-2xl text-xs md:text-lg font-black shadow-2xl clinical-shadow flex items-center gap-2 md:gap-3 active:scale-95 transition-all w-full md:w-auto justify-center mt-2 md:mt-0">
                        <FileText className="h-4 w-4 md:h-6 md:w-6" />
                        Clinical Report
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* LEFT COLUMN: Summary & Vitals */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Immersive Patient Summary Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card rounded-[2rem] md:rounded-[2.5rem] lg:rounded-[3rem] p-6 md:p-10 lg:p-12 clinical-shadow flex flex-col md:flex-row items-center gap-6 md:gap-10 lg:gap-12 border-white/40 dark:border-slate-800/50"
                    >
                        <div className="relative">
                            <div className="h-32 w-32 rounded-[2.5rem] clinical-gradient p-1 shadow-2xl overflow-hidden ring-8 ring-white/30 dark:ring-slate-800/50">
                                <div className="h-full w-full bg-white dark:bg-slate-900 rounded-[2.2rem] overflow-hidden">
                                    {patient.gender === 'F' ? (
                                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${patient.name}&gender=female`} alt="Avatar" className="scale-125" />
                                    ) : (
                                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${patient.name}&gender=male`} alt="Avatar" className="scale-125" />
                                    )}
                                </div>
                            </div>
                            <div className="absolute -bottom-2 -right-2 h-10 w-10 rounded-2xl bg-emerald-500 border-4 border-white dark:border-slate-950 flex items-center justify-center text-white shadow-lg">
                                <CheckCircle2 className="h-6 w-6" />
                            </div>
                        </div>
                        <div className="flex-1 text-center md:text-left w-full">
                            <div className="flex flex-col md:flex-row md:items-center justify-between md:justify-start gap-4 mb-6 md:mb-4 lg:mb-6">
                                <h2 className="text-3xl md:text-4xl lg:text-6xl font-black tracking-tighter text-foreground">{patient.name}</h2>
                                <span className={`px-5 lg:px-6 py-1.5 lg:py-2 rounded-full text-sm lg:text-base font-black uppercase tracking-widest border-2 ${patient.status === 'Critical' ? 'bg-rose-500/10 text-rose-600 border-rose-200/50 dark:text-rose-400 dark:border-rose-500/30' : 'bg-emerald-500/10 text-emerald-600 border-emerald-200/50 dark:text-emerald-400 dark:border-emerald-500/30'
                                    }`}>
                                    {patient.status}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                                <div className="space-y-1">
                                    <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Acuity Meta</p>
                                    <p className="text-lg font-bold text-foreground">{patient.age}Y • {patient.gender === 'M' ? 'Male' : 'Female'}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Hemotype</p>
                                    <p className="text-lg font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2 justify-center md:justify-start">
                                        <Droplets className="h-5 w-5" />
                                        {patient.blood_type || 'O+'}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Admission</p>
                                    <p className="text-lg font-bold text-foreground">
                                        {patient.created_at ? new Date(patient.created_at).toLocaleDateString() : 'Apr 15, 2024'}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Diagnosis</p>
                                    <p className="text-lg font-bold text-primary dark:text-cyan-400">{patient.condition}</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Clinical Longitudinal Insights - Prime placement for clinical assessment */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="mb-8"
                    >
                        <MLTrendAnalysis
                            trends={mlTrends.trends}
                            anomalies={mlTrends.anomalies}
                            summary={mlTrends.summary}
                        />
                    </motion.div>

                    {/* Precision Vitals Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-4">
                            <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Physiological Telemetry</h3>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1 bg-white/50 dark:bg-slate-900/50 p-1 rounded-xl border border-white/20 dark:border-slate-800 backdrop-blur-sm">
                                    {[
                                        { id: '24h', label: '24H' },
                                        { id: '7d', label: '1W' },
                                        { id: 'all', label: 'ALL' }
                                    ].map(scale => (
                                        <button
                                            key={scale.id}
                                            onClick={() => setTimeScale(scale.id)}
                                            className={cn(
                                                "px-3 py-1.5 rounded-lg transition-all text-[9px] font-black uppercase tracking-widest",
                                                timeScale === scale.id ? "bg-slate-900 dark:bg-cyan-500 text-white shadow-sm" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                            )}
                                        >
                                            {scale.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex items-center gap-1 bg-white/50 dark:bg-slate-900/50 p-1 rounded-xl border border-white/20 dark:border-slate-800 backdrop-blur-sm">
                                    <button
                                        onClick={() => setVitalsViewMode('grid')}
                                        className={cn(
                                            "p-2 rounded-lg transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest",
                                            vitalsViewMode === 'grid' ? "bg-white dark:bg-slate-800 text-primary dark:text-cyan-400 shadow-sm" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                        )}
                                    >
                                        <LayoutGrid className="h-3.5 w-3.5" /> Grid
                                    </button>
                                    <button
                                        onClick={() => setVitalsViewMode('chart')}
                                        className={cn(
                                            "p-2 rounded-lg transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest",
                                            vitalsViewMode === 'chart' ? "bg-white dark:bg-slate-800 text-primary dark:text-cyan-400 shadow-sm" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                        )}
                                    >
                                        <ChartIcon className="h-3.5 w-3.5" /> Analytics
                                    </button>
                                </div>
                            </div>
                        </div>

                        <AnimatePresence mode="wait">
                            {vitalsViewMode === 'grid' ? (
                                <motion.div
                                    key="grid"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="grid grid-cols-2 lg:grid-cols-4 gap-4"
                                >
                                    {[
                                        { label: 'Heart Rate', value: latestVitals.hr, unit: 'BPM', icon: Heart, color: 'text-rose-500', stroke: '#f43f5e', fill: '#fff1f2', line: 'hr' },
                                        { label: 'Blood Pressure', value: `${latestVitals.sbp}/80`, unit: 'mmHg', icon: Activity, color: 'text-primary', stroke: '#3b82f6', fill: '#eff6ff', line: 'sbp' },
                                        { label: 'SPO2 Sat.', value: latestVitals.spo2, unit: '%', icon: Wind, color: 'text-emerald-500', stroke: '#10b981', fill: '#ecfdf5', line: 'spo2' },
                                        { label: 'Body Temp.', value: latestVitals.temp, unit: '°F', icon: Thermometer, color: 'text-amber-500', stroke: '#f59e0b', fill: '#fffbeb', line: 'temp' },
                                    ].map((stat, i) => (
                                        <div
                                            key={stat.label}
                                            className="glass-card rounded-[2rem] p-5 clinical-shadow hover:scale-105 transition-all duration-500 border-white/30 dark:border-slate-800/50 overflow-hidden"
                                        >
                                            <div className="mb-4">
                                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] mb-3">{stat.label}</p>
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-3 rounded-2xl bg-white dark:bg-slate-800 shadow-lg border border-slate-50 dark:border-slate-700 ${stat.color}`}>
                                                        <stat.icon className="h-6 w-6" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <div className="flex items-baseline gap-1">
                                                            <span className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tighter leading-none">{stat.value}</span>
                                                            <span className="text-[10px] font-bold text-muted-foreground/60">{stat.unit}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="h-12 w-full -mb-2 opacity-50">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <AreaChart data={filteredVitals.slice(-20)}>
                                                        <defs>
                                                            <linearGradient id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor={stat.stroke} stopOpacity={0.2} />
                                                                <stop offset="95%" stopColor={stat.stroke} stopOpacity={0} />
                                                            </linearGradient>
                                                        </defs>
                                                        <Area
                                                            type="monotone"
                                                            dataKey={stat.line}
                                                            stroke={stat.stroke}
                                                            fill={`url(#grad-${i})`}
                                                            strokeWidth={3}
                                                            dot={false}
                                                        />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    ))}
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="chart"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="glass-card rounded-[2rem] md:rounded-[3rem] p-4 md:p-10 clinical-shadow border-white/40 h-[300px] md:h-[500px]"
                                >
                                    <VitalsChart data={filteredVitals} patientId={id} />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* ML Risk Analysis Chart */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.4 }}
                            className="bg-card rounded-2xl border border-border p-6 shadow-sm overflow-hidden"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-lg font-bold">Predictive Risk Analysis</h3>
                                    <p className="text-xs text-muted-foreground mt-1">AI-driven Cardiac Event Probability (Next 24 Hours)</p>
                                </div>
                                <div className="flex gap-2">
                                    <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                                        <span className="h-2 w-2 rounded-full bg-red-400" />
                                        Critical Zone
                                    </span>
                                </div>
                            </div>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={filteredRiskHistory.length > 0 ? filteredRiskHistory : [
                                        { time: 'T-12', risk: 15 }, { time: 'T-10', risk: 20 }, { time: 'T-8', risk: 18 },
                                        { time: 'T-6', risk: 25 }, { time: 'T-4', risk: 45 }, { time: 'T-2', risk: 62 },
                                        { time: 'Today', risk: 85 },
                                    ]}>
                                        <defs>
                                            <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="time"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 10, fill: '#94a3b8' }}
                                            tickFormatter={(time) => {
                                                try {
                                                    return new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                                } catch {
                                                    return time;
                                                }
                                            }}
                                        />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} domain={[0, 100]} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                            labelFormatter={(label) => new Date(label).toLocaleString()}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="risk"
                                            stroke="#ef4444"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorRisk)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="mt-4 p-4 bg-secondary/30 dark:bg-slate-800/50 rounded-xl flex items-center justify-between">
                                <p className="text-sm font-medium">Predicted Readmission Risk Score</p>
                                <span className={cn(
                                    "text-lg font-black",
                                    riskAssessment.status === 'High' ? "text-rose-600 dark:text-rose-400" :
                                        riskAssessment.status === 'Moderate' ? "text-amber-600 dark:text-amber-400" :
                                            "text-emerald-600 dark:text-emerald-400"
                                )}>
                                    {(riskAssessment.risk_score * 100).toFixed(1)}%
                                </span>
                            </div>
                        </motion.div>
                        {/* Clinical Findings & Billing Context */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-card rounded-[2rem] border border-border p-8 shadow-sm space-y-6">
                                <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-primary" /> Clinical Findings
                                </h3>
                                <div className="space-y-4 max-h-[300px] overflow-y-auto no-scrollbar pr-2">
                                    {diagnosis.length > 0 ? diagnosis.map((d, i) => (
                                        <div key={i} className="p-5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
                                            <div className="flex justify-between items-center">
                                                <p className="font-black text-indigo-600 dark:text-cyan-400 text-sm">{d.diagnosis}</p>
                                                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{new Date(d.timestamp).toLocaleDateString()}</p>
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 italic">"{d.symptoms}"</p>
                                            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                                                <p className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400">Prescription: {d.prescription}</p>
                                            </div>
                                        </div>
                                    )) : (
                                        <p className="text-sm font-medium text-slate-400 italic text-center py-10">No clinical findings recorded.</p>
                                    )}
                                </div>
                            </div>

                            <div className="bg-card rounded-[2rem] border border-border p-8 shadow-sm space-y-6">
                                <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
                                    <CreditCard className="h-5 w-5 text-emerald-500" /> Administrative Billing
                                </h3>
                                {bills.length > 0 ? bills.map((b, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-emerald-50/30 dark:bg-emerald-500/5 rounded-2xl border border-emerald-100 dark:border-emerald-500/20">
                                        <div>
                                            <p className="text-xs font-black text-slate-800 dark:text-slate-200">{b.service_name}</p>
                                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{b.service_date}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">₹{b.total_cost}</p>
                                            <span className={cn(
                                                "text-[8px] font-black uppercase px-2 py-0.5 rounded-full",
                                                b.status === 'Paid' ? "bg-emerald-500 text-white shadow-sm" : "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400"
                                            )}>{b.status}</span>
                                        </div>
                                    </div>
                                )) : (
                                    <p className="text-sm font-medium text-slate-400 italic text-center py-10">No billing history found.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Alerts & Metadata */}
                <div className="space-y-6">

                    {/* Immersive Risk Alerts */}
                    {(patient.status === 'Critical' || (mlTrends.anomalies && mlTrends.anomalies.some(a => a.severity === 'High'))) && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="clinical-gradient rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 text-white shadow-2xl clinical-shadow relative overflow-hidden group"
                        >
                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform duration-700">
                                <AlertTriangle className="h-32 w-32" />
                            </div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="h-2 w-2 rounded-full bg-white animate-ping" />
                                    <h4 className="text-sm font-black uppercase tracking-[0.2em] text-white/80">Critical Path Analysis</h4>
                                </div>
                                <div className="bg-white/10 backdrop-blur-2xl rounded-[1.5rem] p-6 border border-white/20 mb-8">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="p-3 bg-rose-500 rounded-2xl shadow-lg ring-4 ring-rose-500/30">
                                            <Activity className="h-8 w-8 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-2xl font-black italic tracking-tight">HIGH VULNERABILITY</p>
                                            <p className="text-xs font-bold text-white/70 uppercase tracking-widest">Cardiac Event Threat</p>
                                        </div>
                                    </div>
                                    <p className="text-base font-bold text-white/90 leading-relaxed mb-4">
                                        Real-time analysis indicates a <span className="text-white underline underline-offset-4 decoration-rose-300">significant risk</span> based on current biomarker trends.
                                    </p>
                                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: (patient.status === 'Critical' ? '95%' : '85%') }}
                                            className="h-full bg-rose-400"
                                        />
                                    </div>
                                </div>
                                <button className="w-full bg-white text-primary py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 hover:bg-slate-50 transition-all shadow-xl active:scale-95">
                                    <TrendingUp className="h-6 w-6" />
                                    ESCALATE CARE
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* Vitals Summary Card */}
                    <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
                        <h3 className="font-bold mb-4 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            Trend Analysis
                        </h3>
                        <div className="space-y-4">
                            {[
                                {
                                    label: 'Acuity Level',
                                    value: riskAssessment.status || 'Low',
                                    color: riskAssessment.status === 'High' ? 'text-rose-600' :
                                        riskAssessment.status === 'Moderate' ? 'text-amber-600' :
                                            'text-emerald-600'
                                },
                                {
                                    label: 'Stability Index',
                                    value: riskAssessment.stability_index || '10/10',
                                    color: (parseInt(riskAssessment.stability_index) < 5) ? 'text-red-600' : 'text-emerald-600'
                                },
                                {
                                    label: 'Response Rate',
                                    value: riskAssessment.response_rate || 'Normal',
                                    color: riskAssessment.response_rate === 'Declining' ? 'text-red-600' :
                                        riskAssessment.response_rate === 'Positive' ? 'text-emerald-600' :
                                            'text-blue-600'
                                },
                            ].map(item => (
                                <div key={item.label} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                                    <span className="text-sm text-muted-foreground">{item.label}</span>
                                    <span className={`text-sm font-bold ${item.color}`}>{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick Clinical Notes */}
                    <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
                        <h3 className="font-bold mb-4">Recent Findings</h3>
                        <ul className="space-y-3">
                            {mlTrends.anomalies && mlTrends.anomalies.length > 0 ? (
                                mlTrends.anomalies.slice(0, 3).map((anomaly, idx) => (
                                    <li key={idx} className="flex gap-3 text-xs leading-relaxed">
                                        <span className={cn(
                                            "h-1.5 w-1.5 rounded-full mt-1 flex-shrink-0",
                                            anomaly.severity === 'High' ? "bg-red-500" : "bg-amber-500"
                                        )} />
                                        <span>
                                            <span className="font-bold uppercase">{anomaly.type} IN {anomaly.label}:</span>{' '}
                                            Recent reading of {anomaly.value} detected.
                                        </span>
                                    </li>
                                ))
                            ) : (
                                <li className="flex gap-3 text-xs leading-relaxed italic text-muted-foreground">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1 flex-shrink-0" />
                                    <span>Physiological stability within normal limits. No acute anomalies detected.</span>
                                </li>
                            )}
                        </ul>
                    </div>
                </div>
            </div>

            {/* Vitals Input Modal */}
            <AnimatePresence>
                {showVitalsModal && (
                    <div className="fixed inset-0 z-[100] flex items-start justify-center p-6 pt-16 overflow-y-auto no-scrollbar">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowVitalsModal(false)}
                            className="absolute inset-0 bg-background/80 backdrop-blur-md"
                        />
                         <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-2xl bg-card rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 clinical-shadow border border-white/40 dark:border-slate-800/50 overflow-hidden flex flex-col h-[90vh] md:h-auto md:max-h-[90vh]"
                        >
                            <div className="absolute top-0 right-0 p-4 md:p-8 z-10">
                                <button onClick={() => setShowVitalsModal(false)} className="p-2 md:p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl md:rounded-2xl transition-all">
                                    <X className="h-5 w-5 md:h-6 md:w-6 text-slate-400" />
                                </button>
                            </div>

                            <div className="mb-6 flex-shrink-0">
                                <h2 className="text-2xl md:text-4xl font-black tracking-tighter mb-2">Sync Clinical Telemetry</h2>
                                <p className="text-sm md:text-lg font-bold text-muted-foreground italic">Update patient vital signs for real-time risk assessment.</p>
                            </div>

                            <form onSubmit={handleAddVitals} className="space-y-8 overflow-y-auto no-scrollbar pr-2 flex-1 pb-4">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <label className="text-sm font-black text-muted-foreground uppercase tracking-widest pl-2">Heart Rate (BPM)</label>
                                        <input
                                            type="number" required
                                            value={vitalsForm.hr}
                                            onChange={(e) => setVitalsForm({ ...vitalsForm, hr: e.target.value })}
                                            className="w-full p-5 rounded-2xl border-2 border-slate-50 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 dark:focus:border-cyan-500 outline-none font-black text-xl text-slate-800 dark:text-slate-100"
                                            placeholder="72"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-sm font-black text-muted-foreground uppercase tracking-widest pl-2">Systolic BP (mmHg)</label>
                                        <input
                                            type="number" required
                                            value={vitalsForm.sbp}
                                            onChange={(e) => setVitalsForm({ ...vitalsForm, sbp: e.target.value })}
                                            className="w-full p-5 rounded-2xl border-2 border-slate-50 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 dark:focus:border-cyan-500 outline-none font-black text-xl text-slate-800 dark:text-slate-100"
                                            placeholder="120"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-sm font-black text-muted-foreground uppercase tracking-widest pl-2">Diastolic BP (mmHg)</label>
                                        <input
                                            type="number" required
                                            value={vitalsForm.dbp}
                                            onChange={(e) => setVitalsForm({ ...vitalsForm, dbp: e.target.value })}
                                            className="w-full p-5 rounded-2xl border-2 border-slate-50 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 dark:focus:border-cyan-500 outline-none font-black text-xl text-slate-800 dark:text-slate-100"
                                            placeholder="80"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-sm font-black text-muted-foreground uppercase tracking-widest pl-2">Resp. Rate (BPM)</label>
                                        <input
                                            type="number" required
                                            value={vitalsForm.rr}
                                            onChange={(e) => setVitalsForm({ ...vitalsForm, rr: e.target.value })}
                                            className="w-full p-5 rounded-2xl border-2 border-slate-50 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 dark:focus:border-cyan-500 outline-none font-black text-xl text-slate-800 dark:text-slate-100"
                                            placeholder="18"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-sm font-black text-muted-foreground uppercase tracking-widest pl-2">Temp (°F)</label>
                                        <input
                                            type="number" step="0.1" required
                                            value={vitalsForm.temp}
                                            onChange={(e) => setVitalsForm({ ...vitalsForm, temp: e.target.value })}
                                            className="w-full p-5 rounded-2xl border-2 border-slate-50 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 dark:focus:border-cyan-500 outline-none font-black text-xl text-slate-800 dark:text-slate-100"
                                            placeholder="98.6"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-sm font-black text-muted-foreground uppercase tracking-widest pl-2">SPO2 Saturation (%)</label>
                                        <input
                                            type="number" required
                                            value={vitalsForm.spo2}
                                            onChange={(e) => setVitalsForm({ ...vitalsForm, spo2: e.target.value })}
                                            className="w-full p-5 rounded-2xl border-2 border-slate-50 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 dark:focus:border-cyan-500 outline-none font-black text-xl text-slate-800 dark:text-slate-100"
                                            placeholder="98"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-sm font-black text-muted-foreground uppercase tracking-widest pl-2">Clinical Observation Note</label>
                                    <textarea
                                        value={vitalsForm.note}
                                        onChange={(e) => setVitalsForm({ ...vitalsForm, note: e.target.value })}
                                        className="w-full p-5 rounded-2xl border-2 border-slate-50 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 dark:focus:border-cyan-500 outline-none font-bold text-lg h-32 text-slate-800 dark:text-slate-100"
                                        placeholder="Add symmetric observations or clinical context..."
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="w-full py-6 clinical-gradient text-white rounded-[2rem] font-black text-2xl shadow-2xl clinical-shadow flex items-center justify-center gap-4 hover:opacity-90 active:scale-[0.98] transition-all"
                                >
                                    <Save className="h-8 w-8" />
                                    Synchronize Bio-Metrics
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div >
    );
};


export default PatientDetail;
