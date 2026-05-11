import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Heart, Wind, Thermometer, Activity, AlertTriangle,
    Clock, TrendingUp, TrendingDown, Brain, RefreshCw, Shield,
    FileText, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend
} from 'recharts';
import {
    fetchPatientById, fetchPatientVitals, fetchPatientRiskAssessment
} from '../lib/api';
import { fetchPatientMLTrends } from '../lib/api';
import { cn } from '../lib/utils';

// ─── Clinical range evaluation ────────────────────────────────────────────────
const getVitalStatus = (metric, value) => {
    if (value === null || value === undefined) return 'UNKNOWN';
    const ranges = {
        hr:   { criticalLow: 40, low: 60, high: 100, criticalHigh: 130 },
        sbp:  { criticalLow: 80, low: 90, high: 140, criticalHigh: 180 },
        spo2: { criticalLow: 90, low: 95, high: 100 },
        temp: { criticalLow: 35, low: 36.1, high: 37.2, criticalHigh: 39.5 },
    };
    const r = ranges[metric];
    if (!r) return 'NORMAL';
    if ((r.criticalLow !== undefined && value < r.criticalLow) ||
        (r.criticalHigh !== undefined && value > r.criticalHigh)) return 'CRITICAL';
    if (value < r.low || value > r.high) return 'WARNING';
    return 'NORMAL';
};

const STATUS_CFG = {
    CRITICAL: { text: 'text-red-400', bg: 'bg-red-500/10 border-red-500/40', badge: 'bg-red-500/20 text-red-300' },
    WARNING:  { text: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/40', badge: 'bg-amber-500/20 text-amber-300' },
    NORMAL:   { text: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', badge: 'bg-emerald-500/20 text-emerald-300' },
    UNKNOWN:  { text: 'text-slate-400', bg: 'bg-slate-700/30 border-slate-600/30', badge: 'bg-slate-700/30 text-slate-400' },
};

const formatTime = (ts) => {
    try {
        const s = String(ts || '');
        if (s.includes('T')) return s.split('T')[1].substring(0, 5);
        if (s.includes(' ')) return s.split(' ')[1].substring(0, 5);
        return s.substring(0, 5);
    } catch { return '--:--'; }
};

// ─── Single Vital Card ────────────────────────────────────────────────────────
const VitalCard = ({ label, value, unit, sublabel, metric, icon: Icon }) => {
    const st = getVitalStatus(metric, typeof value === 'string' ? parseFloat(value) : value);
    const c = STATUS_CFG[st];
    return (
        <div className={cn("rounded-xl border p-3 space-y-1.5", c.bg)}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <Icon className={cn("h-3.5 w-3.5", c.text)} />
                    <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{label}</span>
                </div>
                <span className={cn("text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full", c.badge)}>{st}</span>
            </div>
            <div className="flex items-baseline gap-1">
                <span className={cn("text-2xl font-black leading-none", c.text)}>{value ?? '—'}</span>
                <span className="text-slate-600 text-xs font-bold">{unit}</span>
            </div>
            {sublabel && <p className="text-slate-600 text-[10px] font-semibold">{sublabel}</p>}
        </div>
    );
};

// ─── ML Anomaly / Trend Insights Panel ───────────────────────────────────────
const MLInsightsPanel = ({ mlTrends, loading }) => {
    const anomalies = mlTrends?.anomalies || [];
    const trends = mlTrends?.trends || [];
    const summary = mlTrends?.summary || '';

    const severityColor = (sev) => sev === 'High'
        ? 'bg-red-500/15 border-red-500/40 text-red-300'
        : 'bg-amber-500/15 border-amber-500/30 text-amber-300';

    return (
        <div className="space-y-3 h-full flex flex-col">
            {/* Summary */}
            <div className="bg-slate-800/80 border border-slate-700/50 rounded-xl p-3 flex items-start gap-2">
                <Zap className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                    <p className="text-amber-400 text-[10px] font-black uppercase tracking-widest mb-1">Clinical Longitudinal Assessment</p>
                    <p className="text-slate-200 text-xs font-semibold leading-snug">
                        {loading ? 'Analysing physiological patterns...' : summary || 'No summary available'}
                    </p>
                </div>
            </div>

            {/* Anomalies */}
            <div className="flex-1 min-h-0">
                <p className="text-rose-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 mb-2">
                    <Activity className="h-3 w-3" /> Acute Physiological Events
                </p>
                <div className="space-y-1.5 overflow-y-auto max-h-[160px] pr-0.5">
                    {loading ? (
                        <div className="animate-pulse space-y-2">
                            {[1,2,3].map(i => <div key={i} className="h-10 bg-slate-800 rounded-lg" />)}
                        </div>
                    ) : anomalies.length > 0 ? (
                        anomalies.map((a, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -6 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className={cn("flex items-center justify-between px-3 py-2 rounded-lg border text-xs", severityColor(a.severity))}
                            >
                                <div>
                                    <p className="font-black">{a.label} {a.type}</p>
                                    <p className="text-[10px] opacity-60">{formatTime(a.timestamp)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-black text-sm">{typeof a.value === 'number' ? a.value.toFixed(1) : a.value}</p>
                                    <p className="text-[9px] uppercase font-black opacity-60">{a.severity} Risk</p>
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        <p className="text-slate-600 text-[11px] italic py-2">No significant anomalies detected in current window.</p>
                    )}
                </div>
            </div>

            {/* Trajectories */}
            <div>
                <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 mb-2">
                    <TrendingUp className="h-3 w-3" /> Physiological Trajectories
                </p>
                <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
                    {trends.length > 0 ? (
                        trends.map((t, i) => (
                            <div key={i} className="flex items-center gap-2 px-3 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                                <div className={cn("p-1 rounded-lg", t.direction === 'Upward' ? 'bg-indigo-500' : 'bg-slate-600')}>
                                    {t.direction === 'Upward'
                                        ? <TrendingUp className="h-2.5 w-2.5 text-white" />
                                        : <TrendingDown className="h-2.5 w-2.5 text-white" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-indigo-200 text-[11px] font-black truncate">{t.insight}</p>
                                    <p className="text-indigo-400 text-[10px]">{t.change_pct}% shift</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-slate-600 text-[11px] italic py-1">Physiological baselines remain stable.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── CDSS Auto Insight Box ────────────────────────────────────────────────────
const CDSSBox = ({ latestVital, riskData, mlTrends }) => {
    const insights = [];
    if (latestVital) {
        const sbpSt = getVitalStatus('sbp', latestVital.sbp);
        const hrSt  = getVitalStatus('hr', latestVital.hr);
        const spo2St= getVitalStatus('spo2', latestVital.spo2);
        if (sbpSt === 'CRITICAL') insights.push(`Critical BP (${latestVital.sbp}/${latestVital.dbp ?? '?'} mmHg). Urgent intervention needed.`);
        else if (sbpSt === 'WARNING' && latestVital.sbp < 90) insights.push(`Hypotension (${latestVital.sbp} mmHg). Assess volume status.`);
        else if (sbpSt === 'WARNING') insights.push(`Elevated BP (${latestVital.sbp} mmHg). Monitor target organs.`);
        if (hrSt === 'CRITICAL') insights.push(`Critical HR (${latestVital.hr} bpm). Assess cardiac rhythm immediately.`);
        else if (hrSt === 'WARNING') insights.push(`Abnormal HR (${latestVital.hr} bpm). Consider arrhythmia workup.`);
        if (spo2St === 'CRITICAL') insights.push(`Critical SpO₂ (${latestVital.spo2}%). Immediate O₂ therapy.`);
        else if (spo2St === 'WARNING') insights.push(`Low SpO₂ (${latestVital.spo2}%). Supplemental O₂ advised.`);
    }
    const highAnomalies = mlTrends?.anomalies?.filter(a => a.severity === 'High').length || 0;
    if (highAnomalies > 0) insights.push(`ML detected ${highAnomalies} high-severity physiological anomaly(ies). Escalate monitoring frequency.`);
    if (riskData?.risk_score > 0.7) insights.push(`High readmission risk (${Math.round(riskData.risk_score * 100)}%). Consider enhanced discharge planning.`);
    if (insights.length === 0) insights.push('All parameters within acceptable clinical range. Continue routine monitoring.');

    const isAlert = insights.some(t => !t.startsWith('All parameters'));
    return (
        <div className={cn("rounded-xl border p-3 space-y-2", isAlert ? 'bg-amber-950/40 border-amber-500/30' : 'bg-emerald-950/20 border-emerald-500/20')}>
            <div className="flex items-center gap-2">
                <Brain className={cn("h-3.5 w-3.5 flex-shrink-0", isAlert ? 'text-amber-400' : 'text-emerald-400')} />
                <span className={cn("text-[10px] font-black uppercase tracking-widest", isAlert ? 'text-amber-400' : 'text-emerald-400')}>
                    ⚡ CDSS Clinical Insight
                </span>
            </div>
            {insights.map((t, i) => (
                <p key={i} className="text-slate-200 text-[11px] font-semibold leading-snug">{t}</p>
            ))}
            {isAlert && (
                <div className="flex gap-2 pt-1">
                    <button className="px-3 py-1 bg-amber-500 text-black rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-amber-400 transition-all">Acknowledge</button>
                    <button className="px-3 py-1 bg-slate-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-600 transition-all">Protocol</button>
                </div>
            )}
        </div>
    );
};

// ─── Custom tooltip ───────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-slate-800 border border-slate-600 rounded-xl p-2.5 text-xs shadow-xl">
            <p className="text-slate-400 font-black mb-1.5">{label}</p>
            {payload.map(p => (
                <div key={p.dataKey} className="flex items-center gap-2 font-bold" style={{ color: p.color }}>
                    <span>{p.name}:</span><span>{p.value}</span>
                </div>
            ))}
        </div>
    );
};

// ─── Time-scale filter ────────────────────────────────────────────────────────
const TIME_FILTERS = [
    { key: '24h', label: '24H' },
    { key: '7d',  label: '1W' },
    { key: 'all', label: 'ALL' },
];

// ─── Main Component ───────────────────────────────────────────────────────────
const PatientCDSSDashboard = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [patient, setPatient] = useState(null);
    const [vitals, setVitals] = useState([]);
    const [riskData, setRiskData] = useState(null);
    const [mlTrends, setMlTrends] = useState(null);
    const [mlLoading, setMlLoading] = useState(true);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [timeScale, setTimeScale] = useState('all');

    const loadData = useCallback(async (showRefreshing = false) => {
        if (showRefreshing) setRefreshing(true);
        try {
            const [p, v, r] = await Promise.allSettled([
                fetchPatientById(id),
                fetchPatientVitals(id),
                fetchPatientRiskAssessment(id),
            ]);
            if (p.status === 'fulfilled') setPatient(p.value);
            if (v.status === 'fulfilled') setVitals(v.value || []);
            if (r.status === 'fulfilled') setRiskData(r.value);
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    }, [id]);

    const loadMLTrends = useCallback(async (scale) => {
        setMlLoading(true);
        try {
            const data = await fetchPatientMLTrends(id, scale);
            setMlTrends(data);
        } catch (e) { setMlTrends(null); }
        finally { setMlLoading(false); }
    }, [id]);

    useEffect(() => { loadData(); }, [loadData]);
    useEffect(() => { loadMLTrends(timeScale); }, [timeScale, loadMLTrends]);

    const latest = vitals[vitals.length - 1];

    // Chart data (last 20 vitals)
    const chartData = vitals.slice(-20).map(v => ({
        time: formatTime(v.timestamp),
        Systolic: v.sbp || null,
        Diastolic: v.dbp || null,
        HR: v.hr || null,
        SpO2: v.spo2 || null,
    }));

    const overallStatus = (patient?.status || '').toLowerCase();
    const statusLabel = overallStatus === 'critical' ? 'CRITICAL'
        : overallStatus === 'warning' || overallStatus === 'monitoring' ? 'WARNING'
        : 'STABLE';
    const statusBadge = statusLabel === 'CRITICAL' ? 'bg-red-500/20 border-red-500/50 text-red-300 animate-pulse'
        : statusLabel === 'WARNING' ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
        : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300';

    if (loading) return (
        <div className="h-screen flex flex-col items-center justify-center gap-4 bg-slate-950">
            <div className="h-10 w-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-cyan-400 font-black uppercase tracking-widest text-sm">Loading Patient Data...</p>
        </div>
    );

    if (!patient) return (
        <div className="h-screen bg-slate-950 flex items-center justify-center">
            <div className="text-center space-y-4">
                <Shield className="h-14 w-14 text-slate-600 mx-auto" />
                <p className="text-slate-400 font-black">Patient record not found</p>
                <button onClick={() => navigate('/dashboard')} className="px-4 py-2 bg-slate-800 text-white rounded-xl font-bold text-sm">Return to Dashboard</button>
            </div>
        </div>
    );

    return (
        <div className="h-screen bg-slate-950 text-white flex flex-col overflow-hidden">
            {/* ── Top Bar ── */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 flex-shrink-0">
                <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 font-bold text-sm transition-colors">
                    <ArrowLeft className="h-4 w-4" /> Return to Dashboard
                </button>

                <div className="text-center">
                    <h1 className="text-xl font-black tracking-tight text-white">
                        {patient.name}, <span className="text-slate-400">{patient.age}{patient.gender === 'Male' ? 'M' : 'F'}</span>
                    </h1>
                    <p className="text-slate-500 text-xs font-semibold">
                        {patient.ward ? `Ward ${patient.ward}` : patient.bed ? `Bed ${patient.bed}` : 'Inpatient'} • {patient.condition || 'Under Observation'}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {/* Time scale filter */}
                    <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1">
                        {TIME_FILTERS.map(f => (
                            <button
                                key={f.key}
                                onClick={() => setTimeScale(f.key)}
                                className={cn("px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all",
                                    timeScale === f.key ? 'bg-cyan-500 text-slate-950' : 'text-slate-500 hover:text-slate-300'
                                )}
                            >{f.label}</button>
                        ))}
                    </div>
                    {riskData && (
                        <div className={cn(
                            "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border flex items-center gap-1.5",
                            riskData.risk_score > 0.6 ? 'bg-red-500/20 border-red-500/50 text-red-300'
                            : riskData.risk_score > 0.3 ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                            : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                        )}>
                            <Shield className="h-3 w-3" />
                            Readmission: {Math.round((riskData.risk_score || 0) * 100)}%
                        </div>
                    )}
                    <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border", statusBadge)}>{statusLabel}</span>
                    <button onClick={() => { loadData(true); loadMLTrends(timeScale); }} disabled={refreshing} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all">
                        <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
                    </button>
                    <button onClick={() => navigate(`/patients/${id}`)} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all">
                        Full EHR →
                    </button>
                </div>
            </div>

            {/* ── 3-Column Body (fills remaining height) ── */}
            <div className="flex-1 grid grid-cols-12 gap-3 p-4 overflow-hidden min-h-0">

                {/* ── LEFT: Vitals ── */}
                <div className="col-span-3 flex flex-col gap-2.5 overflow-hidden">
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Current Vitals</p>
                    <VitalCard label="Blood Pressure" value={latest?.sbp ? `${latest.sbp}/${latest.dbp ?? '?'}` : null} unit="mmHg" sublabel={latest?.sbp && latest?.dbp ? `PP: ${latest.sbp - (latest.dbp||0)} mmHg` : ''} metric="sbp" icon={Heart} />
                    <VitalCard label="Heart Rate" value={latest?.hr} unit="BPM" metric="hr" icon={Activity} />
                    <VitalCard label="Oxygen Saturation" value={latest?.spo2} unit="%" metric="spo2" sublabel="SpO₂" icon={Wind} />
                    <VitalCard label="Temperature" value={latest?.temp} unit="°C" metric="temp" icon={Thermometer} />

                    {/* Patient meta */}
                    <div className="mt-auto space-y-1.5 pt-2 border-t border-slate-800">
                        {[
                            { label: 'Blood Type', value: patient.blood_type || patient.bloodType || '—' },
                            { label: 'Admitted', value: patient.admission_date ? new Date(patient.admission_date).toLocaleDateString() : '—' },
                            { label: 'Allergies', value: (patient.allergies?.join(', ')) || 'None' },
                        ].map(item => (
                            <div key={item.label} className="flex justify-between items-center">
                                <span className="text-slate-600 text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                                <span className="text-slate-300 text-[11px] font-semibold truncate ml-2 max-w-[60%] text-right">{item.value}</span>
                            </div>
                        ))}
                        {riskData && (
                            <div className="flex justify-between items-center pt-1">
                                <span className="text-slate-600 text-[10px] font-black uppercase tracking-widest">Readmission Risk</span>
                                <span className={cn("text-[11px] font-black", riskData.risk_score > 0.6 ? 'text-red-400' : riskData.risk_score > 0.3 ? 'text-amber-400' : 'text-emerald-400')}>
                                    {Math.round((riskData.risk_score || 0) * 100)}%
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── CENTRE: Chart + CDSS ── */}
                <div className="col-span-6 flex flex-col gap-3 overflow-hidden min-h-0">
                    {/* Chart */}
                    <div className="bg-slate-900/80 border border-slate-700/50 rounded-2xl p-4 flex-1 min-h-0 flex flex-col">
                        <div className="flex items-center justify-between mb-3 flex-shrink-0">
                            <div>
                                <h3 className="text-white font-black text-sm">Vital Signs Trend</h3>
                                <p className="text-slate-500 text-[10px] font-semibold">Last {Math.min(vitals.length, 20)} readings</p>
                            </div>
                        </div>
                        {chartData.length > 1 ? (
                            <div className="flex-1 min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                        <XAxis dataKey="time" tick={{ fill: '#475569', fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fill: '#475569', fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                                        <Tooltip content={<ChartTooltip />} />
                                        <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', paddingTop: '4px' }} />
                                        <Line type="monotone" dataKey="Systolic" stroke="#ef4444" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                                        <Line type="monotone" dataKey="Diastolic" stroke="#f97316" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                                        <Line type="monotone" dataKey="HR" stroke="#06b6d4" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                                        <Line type="monotone" dataKey="SpO2" stroke="#10b981" strokeWidth={2} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center">
                                <p className="text-slate-600 font-black text-xs uppercase tracking-widest">No vital history available</p>
                            </div>
                        )}
                    </div>

                    {/* CDSS Insight box */}
                    <div className="flex-shrink-0">
                        <CDSSBox latestVital={latest} riskData={riskData} mlTrends={mlTrends} />
                    </div>
                </div>

                {/* ── RIGHT: ML Longitudinal Insights ── */}
                <div className="col-span-3 bg-slate-900/80 border border-slate-700/50 rounded-2xl p-4 flex flex-col overflow-hidden min-h-0">
                    <div className="flex items-center justify-between mb-3 flex-shrink-0">
                        <h3 className="text-white font-black text-sm flex items-center gap-1.5">
                            <Zap className="h-4 w-4 text-amber-400 fill-amber-400" /> Clinical Insights
                        </h3>
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 bg-slate-800 px-2 py-0.5 rounded-full">
                            {timeScale.toUpperCase()}
                        </span>
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto pr-0.5">
                        <MLInsightsPanel mlTrends={mlTrends} loading={mlLoading} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PatientCDSSDashboard;
