import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, TrendingUp, TrendingDown, Activity, Zap } from 'lucide-react';
import { cn } from '../lib/utils';

const MLTrendAnalysis = ({ trends, anomalies, summary }) => {
    if (!trends && !anomalies) return null;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
                    <Zap className="h-5 w-5 text-amber-500 fill-amber-500" />
                    Clinical Longitudinal Insights
                </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Anomaly Detection Section */}
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-8 shadow-sm space-y-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5 dark:opacity-10">
                        <AlertTriangle className="h-24 w-24 text-rose-500" />
                    </div>
                    <h4 className="text-sm font-black uppercase tracking-widest text-rose-500 flex items-center gap-2 relative z-10">
                        <Activity className="h-4 w-4" /> Acute Physiological Events
                    </h4>

                    <div className="space-y-4 max-h-[200px] overflow-y-auto pr-2 no-scrollbar relative z-10">
                        {anomalies && anomalies.length > 0 ? (
                            anomalies.map((anomaly, i) => (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    key={i}
                                    className={cn(
                                        "p-4 rounded-2xl border flex items-center justify-between",
                                        anomaly.severity === 'High' 
                                            ? "bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/30" 
                                            : "bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/30"
                                    )}
                                >
                                    <div>
                                        <p className="text-xs font-black text-slate-800 dark:text-slate-200">{anomaly.label} {anomaly.type}</p>
                                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                            {new Date(anomaly.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className={cn(
                                            "text-sm font-black",
                                            anomaly.severity === 'High' ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-400"
                                        )}>
                                            {anomaly.value}
                                        </p>
                                        <span className="text-[8px] font-black uppercase tracking-widest opacity-80">{anomaly.severity} Risk</span>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <p className="text-sm font-medium text-slate-400 italic py-4">No significant anomalies detected in current cycle.</p>
                        )}
                    </div>
                </div>

                {/* Trend Progression Section */}
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-8 shadow-sm space-y-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5 dark:opacity-10">
                        <TrendingUp className="h-24 w-24 text-indigo-500" />
                    </div>
                    <h4 className="text-sm font-black uppercase tracking-widest text-indigo-500 flex items-center gap-2 relative z-10">
                        <TrendingUp className="h-4 w-4" /> Physiological Trajectories
                    </h4>

                    <div className="space-y-4 max-h-[200px] overflow-y-auto pr-2 no-scrollbar relative z-10">
                        {trends && trends.length > 0 ? (
                            trends.map((trend, i) => (
                                <motion.div
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    key={i}
                                    className="p-4 bg-indigo-50/50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/30 rounded-2xl flex items-center gap-4"
                                >
                                    <div className={cn(
                                        "p-2 rounded-xl text-white",
                                        trend.direction === 'Upward' ? "bg-indigo-500" : "bg-slate-500 dark:bg-slate-700"
                                    )}>
                                        {trend.direction === 'Upward' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-slate-800 dark:text-slate-200">{trend.insight}</p>
                                        <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">{trend.change_pct}% baseline shift</p>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <p className="text-sm font-medium text-slate-400 italic py-4">Physiological baselines remain stable.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Narrative Summary */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-8 bg-slate-900 dark:bg-slate-950 rounded-[2rem] text-white shadow-2xl relative overflow-hidden group border border-white/5 dark:border-slate-800"
            >
                <div className="absolute top-0 right-0 h-full w-1/3 bg-gradient-to-l from-indigo-500/20 to-transparent pointer-events-none" />
                <div className="flex items-center gap-6 relative z-10">
                    <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                        <Activity className="h-6 w-6 text-indigo-400" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300 mb-1">Narrative Clinical Assessment</p>
                        <p className="text-xl font-bold leading-tight tracking-tight">{summary}</p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default MLTrendAnalysis;
