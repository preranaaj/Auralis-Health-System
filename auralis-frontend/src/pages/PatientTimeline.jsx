import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity, Heart, Thermometer, Wind,
    FileText, CreditCard, Clock, Calendar,
    User, ChevronLeft, ArrowRight, CheckCircle2,
    AlertCircle, Pill, MessageSquare, Shield,
    Download, LayoutGrid, Info, ClipboardList
} from 'lucide-react';
import {
    fetchPatientById,
    fetchPatientVitals,
    fetchDiagnosis,
    fetchBills,
    fetchPatientTimeline
} from '../lib/api';
import { cn } from '../lib/utils';

const PatientTimeline = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [patient, setPatient] = useState(null);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('All');

    useEffect(() => {
        const loadTimelineData = async () => {
            setLoading(true);
            try {
                const [pData, vData, dData, bData, tData] = await Promise.all([
                    fetchPatientById(id),
                    fetchPatientVitals(id),
                    fetchDiagnosis(id),
                    fetchBills(id),
                    fetchPatientTimeline(id)
                ]);

                setPatient(pData);

                // Synthesize all details into a single timeline
                const allEvents = [
                    ...(pData.medical_history ? [{
                        id: 'history-baseline',
                        type: 'History',
                        timestamp: pData.created_at || '1970-01-01T00:00:00',
                        title: 'Clinical Baseline',
                        description: pData.medical_history,
                        icon: ClipboardList,
                        color: 'text-amber-600',
                        bg: 'bg-amber-50',
                        details: { history: pData.medical_history }
                    }] : []),
                    ...vData.map(v => ({
                        id: `vitals-${v.id || Math.random()}`,
                        type: 'Vitals',
                        timestamp: v.timestamp,
                        title: 'Physiological Reading',
                        description: `Vitals recorded: BP ${v.sbp}/${v.dbp || 80}, HR ${v.hr} BPM`,
                        icon: Activity,
                        color: 'text-rose-500',
                        bg: 'bg-rose-50',
                        details: v
                    })),
                    ...dData.map(d => ({
                        id: `diag-${d.id || Math.random()}`,
                        type: 'Diagnosis',
                        timestamp: d.timestamp,
                        title: 'Clinical Diagnosis',
                        description: d.diagnosis,
                        icon: FileText,
                        color: 'text-indigo-500',
                        bg: 'bg-indigo-50',
                        details: d
                    })),
                    ...bData.map(b => ({
                        id: `bill-${b.id || Math.random()}`,
                        type: 'Billing',
                        timestamp: b.service_date || b.timestamp,
                        title: 'Service Entry',
                        description: `${b.service_name} - ₹${b.total_cost}`,
                        icon: CreditCard,
                        color: 'text-emerald-500',
                        bg: 'bg-emerald-50',
                        details: b
                    })),
                    ...tData.map(t => ({
                        id: `time-${t.id || Math.random()}`,
                        type: 'System',
                        timestamp: t.timestamp,
                        title: t.event,
                        description: t.description,
                        icon: Clock,
                        color: 'text-slate-500',
                        bg: 'bg-slate-50',
                        details: t
                    }))
                ];

                // Sort by timestamp descending
                allEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                setEvents(allEvents);
            } catch (error) {
                console.error("Error synthesizing timeline:", error);
            } finally {
                setLoading(false);
            }
        };

        loadTimelineData();
    }, [id]);

    const filteredEvents = activeFilter === 'All'
        ? events
        : events.filter(e => e.type === activeFilter);

    // Group events by date for timeline classification
    const groupedEvents = filteredEvents.reduce((acc, event) => {
        const dateStr = new Date(event.timestamp).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        if (!acc[dateStr]) acc[dateStr] = [];
        acc[dateStr].push(event);
        return acc;
    }, {});

    if (loading) return (
        <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
            <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">Synthesizing Clinical History...</p>
        </div>
    );

    return (
        <div className="space-y-8 pb-20 max-w-5xl mx-auto dark:text-slate-100">
            {/* Immersive Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="space-y-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 dark:hover:text-cyan-400 transition-all group font-black uppercase text-[10px] tracking-widest"
                    >
                        <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to Case
                    </button>
                    <div>
                        <h1 className="text-5xl font-black tracking-tighter text-slate-800 dark:text-white">Clinical Narrative</h1>
                        <p className="text-lg text-slate-500 font-medium italic mt-2">
                            Unified temporal synthesis for <span className="text-indigo-600 dark:text-cyan-400 font-bold not-italic">{patient?.name}</span>
                        </p>
                    </div>
                </div>

                <div className="flex gap-2 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-[1.5rem] border border-slate-200 dark:border-slate-800">
                    {['All', 'History', 'Vitals', 'Diagnosis', 'Billing', 'System'].map(f => (
                        <button
                            key={f}
                            onClick={() => setActiveFilter(f)}
                            className={cn(
                                "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                activeFilter === f
                                    ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-cyan-400 shadow-sm"
                                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            )}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Timeline Core */}
            <div className="relative pt-8 px-4">
                {/* Vertical Line */}
                <div className="absolute left-10 md:left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500/20 via-slate-100 dark:via-slate-800 to-transparent transform -translate-x-1/2" />

                <div className="space-y-12">
                    {Object.entries(groupedEvents).map(([dateLabel, dateEvents], groupIdx) => (
                        <div key={dateLabel} className="space-y-12 relative">
                            {/* Date Group Header */}
                            <div className="flex items-center justify-center relative z-20">
                                <div className="px-6 py-2 bg-indigo-50 dark:bg-slate-900 border-2 border-indigo-100 dark:border-slate-800 rounded-full font-black text-xs uppercase tracking-widest text-indigo-600 dark:text-cyan-400 shadow-sm">
                                    {dateLabel}
                                </div>
                            </div>

                            {/* Events under this Date Group */}
                            {dateEvents.map((event, idx) => {
                                // Determine alternating layout based on overall index just for visual variation
                                const isEven = (groupIdx + idx) % 2 === 0;
                                return (
                                    <motion.div
                                        key={event.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: idx * 0.05 }}
                                        className={cn(
                                            "relative flex items-center md:justify-between w-full",
                                            isEven ? "md:flex-row" : "md:flex-row-reverse"
                                        )}
                                    >
                                        {/* Point on line */}
                                        <div className="absolute left-6 md:left-1/2 h-8 w-8 rounded-full bg-white dark:bg-slate-900 border-4 border-slate-100 dark:border-slate-800 shadow-sm transform -translate-x-1/2 z-10 flex items-center justify-center group-hover:scale-125 transition-transform duration-500">
                                            <div className={cn("h-3 w-3 rounded-full", event.color.replace('text', 'bg'))} />
                                        </div>

                                        {/* Content Card */}
                                        <div className="ml-16 md:ml-0 w-full md:w-[45%]">
                                            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 md:p-8 clinical-shadow border border-slate-100 dark:border-slate-800/50 hover:scale-[1.02] transition-all duration-500 group relative overflow-hidden">
                                                {/* Type Badge */}
                                                <div className={cn(
                                                    "absolute top-0 right-0 px-4 md:px-6 py-1.5 md:py-2 rounded-bl-3xl text-[9px] font-black uppercase tracking-[0.2em]",
                                                    event.bg, event.color,
                                                    "dark:bg-opacity-20"
                                                )}>
                                                    {event.type}
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className={cn("p-4 rounded-2xl", event.bg, "dark:bg-opacity-20")}>
                                                            <event.icon className={cn("h-5 w-5 md:h-6 md:w-6", event.color)} />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-lg md:text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{event.title}</h3>
                                                            <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">
                                                                {dateLabel}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <p className="text-xs md:text-sm font-bold text-slate-600 dark:text-slate-400 leading-relaxed italic">
                                                        "{event.description}"
                                                    </p>

                                                    {/* Nested Details based on type */}
                                                    {event.type === 'Vitals' && (
                                                        <div className="grid grid-cols-4 gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                                                            <div><p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase">BP</p><p className="text-[10px] md:text-xs font-black text-indigo-600 dark:text-indigo-400">{event.details.sbp}/{event.details.dbp || 80}</p></div>
                                                            <div><p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase">HR</p><p className="text-[10px] md:text-xs font-black text-rose-500">{event.details.hr}</p></div>
                                                            <div><p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase">Temp</p><p className="text-[10px] md:text-xs font-black text-amber-500">{event.details.temp}°F</p></div>
                                                            <div><p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase">SpO2</p><p className="text-[10px] md:text-xs font-black text-emerald-500">{event.details.spo2}%</p></div>
                                                        </div>
                                                    )}

                                                    {event.type === 'Diagnosis' && event.details.prescription && (
                                                        <div className="bg-indigo-50/50 dark:bg-indigo-500/10 p-3 md:p-4 rounded-2xl border border-indigo-100 dark:border-indigo-500/20 hidden md:block">
                                                            <p className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                                                <Pill className="h-3 w-3" /> Prescription Synthesis
                                                            </p>
                                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate line-clamp-2 md:whitespace-normal">{event.details.prescription}</p>
                                                        </div>
                                                    )}

                                                    {event.type === 'Billing' && (
                                                        <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
                                                            <span className={cn(
                                                                "px-2 md:px-3 py-1 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest",
                                                                event.details.status === 'Paid' ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400"
                                                            )}>
                                                                {event.details.status}
                                                            </span>
                                                            <p className="text-base md:text-lg font-black text-slate-800 dark:text-slate-100 tracking-tighter">₹{event.details.total_cost}</p>
                                                        </div>
                                                    )}

                                                    <div className="absolute bottom-4 right-6 text-[8px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest flex items-center gap-2">
                                                        <Clock className="h-3 w-3" /> {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    ))}

                </div>
            </div>

            {/* Empty State */}
            {filteredEvents.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-300 dark:text-slate-800">
                    <HistoryIcon className="h-20 w-20 mb-4 opacity-20" />
                    <p className="text-xl font-black uppercase tracking-widest opacity-50">No Clinical Records Found</p>
                </div>
            )}
        </div>
    );
};
const HistoryIcon = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
        <path d="M12 7v5l4 2" />
    </svg>
);

export default PatientTimeline;
