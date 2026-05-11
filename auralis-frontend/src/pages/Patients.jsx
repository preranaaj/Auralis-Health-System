import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, MoreHorizontal, User, AlertCircle, CheckCircle2, Clock, X, Save, UserPlus, Edit2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchPatients, addPatient, updatePatient, deletePatient } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const StatusBadge = ({ status }) => {
    const styles = {
        Stable: 'bg-emerald-500/10 text-emerald-600 border-emerald-200/50 dark:text-emerald-400 dark:border-emerald-500/30',
        Low: 'bg-emerald-500/10 text-emerald-600 border-emerald-200/50 dark:text-emerald-400 dark:border-emerald-500/30',
        Moderate: 'bg-amber-500/10 text-amber-600 border-amber-200/50 dark:text-amber-400 dark:border-amber-500/30',
        Observation: 'bg-amber-500/10 text-amber-600 border-amber-200/50 dark:text-amber-400 dark:border-amber-500/30',
        High: 'bg-rose-500/10 text-rose-600 border-rose-200/50 dark:text-rose-400 dark:border-rose-500/30',
        Discharged: 'bg-slate-500/10 text-slate-600 border-slate-200/50 dark:text-slate-400 dark:border-slate-500/30',
    };

    const icons = {
        Stable: CheckCircle2,
        Low: CheckCircle2,
        Moderate: Clock,
        Observation: Clock,
        High: AlertCircle,
        Discharged: User
    };

    const Icon = icons[status] || User;

    return (
        <span className={`px-4 py-1.5 rounded-full text-sm font-bold border flex items-center gap-2 w-fit transition-all hover:scale-105 ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
            <Icon className="h-4 w-4" />
            {status}
        </span>
    );
};

const PatientModal = ({ isOpen, onClose, onSubmit, initialData = null, title = "Admit Patient" }) => {
    const [formData, setFormData] = useState({
        name: '',
        age: '',
        gender: 'M',
        condition: '',
        status: 'Stable',
        ward: 'General Ward',
        blood_type: 'O+'
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                blood_type: initialData.blood_type || 'O+'
            });
        } else {
            setFormData({
                name: '',
                age: '',
                gender: 'M',
                condition: '',
                status: 'Stable',
                ward: 'General Ward',
                blood_type: 'O+'
            });
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 bg-black/50 backdrop-blur-sm overflow-y-auto no-scrollbar">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-card w-full max-w-lg rounded-xl md:rounded-2xl border border-border shadow-2xl p-6 relative flex flex-col max-h-[90vh]"
            >
                <button onClick={onClose} className="absolute right-4 top-4 p-2 hover:bg-secondary rounded-full transition-colors z-10">
                    <X className="h-5 w-5 text-muted-foreground" />
                </button>

                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 shrink-0">
                    {initialData ? <Edit2 className="h-5 w-5 text-primary" /> : <UserPlus className="h-5 w-5 text-primary" />}
                    {title}
                </h3>

                <div className="overflow-y-auto pr-2 no-scrollbar">
                    <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="space-y-4 pb-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                                <input
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary/20 outline-none"
                                    placeholder="Patient name"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-muted-foreground">Age</label>
                                <input
                                    required
                                    type="number"
                                    value={formData.age}
                                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                                    className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary/20 outline-none"
                                    placeholder="Age"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-muted-foreground">Gender</label>
                                <select
                                    value={formData.gender}
                                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                    className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary/20 outline-none"
                                >
                                    <option value="M">Male</option>
                                    <option value="F">Female</option>
                                    <option value="O">Other</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-muted-foreground">Status</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary/20 outline-none"
                                >
                                    <option value="Stable">Stable</option>
                                    <option value="Observation">Observation</option>
                                    <option value="Moderate">Moderate</option>
                                    <option value="High">High Risk</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground">Condition</label>
                            <input
                                required
                                value={formData.condition}
                                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                                className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary/20 outline-none"
                                placeholder="Primary diagnosis"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground">Ward / Location</label>
                            <input
                                required
                                value={formData.ward}
                                onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                                className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary/20 outline-none"
                                placeholder="e.g. Ward B"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground">Blood Type</label>
                            <select
                                value={formData.blood_type}
                                onChange={(e) => setFormData({ ...formData, blood_type: e.target.value })}
                                className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary/20 outline-none"
                            >
                                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex gap-3 pt-6 shrink-0 sticky bottom-0 bg-card pb-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 bg-secondary text-foreground px-4 py-3 rounded-xl font-bold hover:bg-secondary/70 transition-colors"
                            >
                                Discard
                            </button>
                            <button
                                type="submit"
                                className="flex-1 bg-primary text-white px-4 py-3 rounded-xl font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                            >
                                {initialData ? 'Update Record' : 'Admit Patient'}
                            </button>
                        </div>
                    </form>
                </div>
            </motion.div>
        </div>
    );
};

const Patients = () => {
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('All');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPatient, setEditingPatient] = useState(null);

    const loadPatients = async () => {
        try {
            const data = await fetchPatients();
            setPatients(data);
        } catch (error) {
            console.error("Failed to load patients:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPatients();
    }, []);

    const handleAdmit = async (formData) => {
        try {
            const dataWithUser = { ...formData, performed_by: currentUser?.name || "Unknown Doctor" };
            await addPatient(dataWithUser);
            setIsModalOpen(false);
            loadPatients();
        } catch (error) {
            alert("Error admitting patient: " + error.message);
        }
    };

    const handleUpdate = async (formData) => {
        try {
            const dataWithUser = { ...formData, performed_by: currentUser?.name || "Unknown Doctor" };
            await updatePatient(editingPatient.id, dataWithUser);
            setEditingPatient(null);
            loadPatients();
        } catch (error) {
            alert("Error updating patient: " + error.message);
        }
    };

    const handleDelete = async (id, name) => {
        if (window.confirm(`CRITICAL: Are you sure you want to PERMANENTLY PURGE all clinical records for ${name}? This action cannot be undone.`)) {
            try {
                await deletePatient(id);
                loadPatients();
            } catch (error) {
                alert("Error purging patient records: " + error.message);
            }
        }
    };

    const filteredPatients = patients.filter(patient => {
        const nameMatch = patient.name.toLowerCase().includes(searchTerm.toLowerCase());
        const condMatch = patient.condition?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesSearch = nameMatch || condMatch;
        const matchesFilter = filter === 'All' || patient.status === filter || patient.risk === filter;
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="space-y-4 md:space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 md:gap-6 mb-6 md:mb-8">
                <div>
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground mb-1 md:mb-2">
                        Clinical Census
                    </h1>
                    <p className="text-sm md:text-lg text-muted-foreground font-medium">
                        Real-time monitoring and acuity management for hospital wards.
                    </p>
                </div>
                <button
                    onClick={() => { setEditingPatient(null); setIsModalOpen(true); }}
                    className="clinical-gradient w-full sm:w-auto justify-center text-primary-foreground px-6 py-3 md:px-8 md:py-4 rounded-xl md:rounded-2xl text-base md:text-lg font-bold hover:opacity-90 transition-all shadow-xl clinical-shadow flex items-center gap-2 md:gap-3 active:scale-95"
                >
                    <UserPlus className="h-5 w-5 md:h-6 md:w-6" />
                    Admit Patient
                </button>
            </div>

            <div className="glass-card rounded-[1.5rem] md:rounded-[2rem] p-4 md:p-8 clinical-shadow mb-8 md:mb-12">
                <div className="flex flex-col lg:flex-row gap-4 md:gap-6 mb-6 md:mb-10">
                    <div className="relative flex-1 group w-full">
                        <Search className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Search by ID, name, or condition..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 md:pl-14 pr-4 md:pr-6 py-3 md:py-4 w-full rounded-xl md:rounded-2xl border-none bg-secondary/50 text-sm md:text-base font-medium focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-muted-foreground/50"
                        />
                    </div>
                    <div className="flex gap-2 bg-secondary/30 p-1.5 md:p-2 rounded-xl md:rounded-2xl overflow-x-auto no-scrollbar w-full lg:w-auto shrink-0">
                        {['All', 'High', 'Moderate', 'Stable', 'Discharged'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 md:px-6 py-2 md:py-3 rounded-lg md:rounded-xl text-sm md:text-base font-bold whitespace-nowrap transition-all duration-300 ${filter === f ? 'bg-white dark:bg-slate-800 shadow-xl text-primary dark:text-cyan-400 scale-105' : 'text-muted-foreground hover:text-foreground hover:bg-white/40 dark:hover:bg-slate-800/40'}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left border-separate border-spacing-y-4">
                        <thead>
                            <tr>
                                <th className="px-6 py-4 text-sm font-bold text-muted-foreground uppercase tracking-widest">Patient Identity</th>
                                <th className="px-6 py-4 text-sm font-bold text-muted-foreground uppercase tracking-widest">Admission Condition</th>
                                <th className="px-6 py-4 text-sm font-bold text-muted-foreground uppercase tracking-widest">Current Status</th>
                                <th className="px-6 py-4 text-sm font-bold text-muted-foreground uppercase tracking-widest">Assigned Ward</th>
                                <th className="px-6 py-4 text-sm font-bold text-muted-foreground uppercase tracking-widest text-center">Acuity Risk</th>
                                <th className="px-6 py-4 text-sm font-bold text-muted-foreground uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <AnimatePresence>
                                {loading ? (
                                    <tr><td colSpan="6" className="text-center py-20 text-muted-foreground">Loading clinical data...</td></tr>
                                ) : (
                                    filteredPatients.map((patient, index) => (
                                        <motion.tr
                                            key={patient.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ delay: index * 0.05 }}
                                            onClick={() => navigate(`/patients/${patient.id}`)}
                                            className="group bg-white/40 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-800/60 hover:scale-[1.01] hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300 cursor-pointer rounded-2xl relative border border-transparent dark:hover:border-slate-700/50"
                                        >
                                            <td className="px-4 md:px-6 py-4 md:py-5 rounded-l-2xl whitespace-nowrap">
                                                <div className="flex items-center gap-4 md:gap-5">
                                                    <div className="h-10 w-10 md:h-14 md:w-14 rounded-xl md:rounded-2xl clinical-gradient flex items-center justify-center text-white font-black text-lg md:text-xl shadow-lg ring-2 md:ring-4 ring-white/50 shrink-0">
                                                        {patient.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-base md:text-lg font-black text-foreground group-hover:text-primary transition-colors">{patient.name}</p>
                                                        <p className="text-[10px] md:text-sm text-muted-foreground/80 font-bold uppercase tracking-widest">{patient.age}Y • {patient.gender === 'M' ? 'Male' : 'Female'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 md:px-6 py-4 md:py-5 whitespace-nowrap">
                                                <p className="text-sm md:text-base font-bold text-slate-700 dark:text-slate-300">{patient.condition}</p>
                                                <p className="text-[10px] md:text-xs text-muted-foreground font-medium">Primary Diagnosis</p>
                                            </td>
                                            <td className="px-4 md:px-6 py-4 md:py-5 whitespace-nowrap">
                                                <StatusBadge status={patient.status} />
                                            </td>
                                            <td className="px-4 md:px-6 py-4 md:py-5 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-2 w-2 rounded-full bg-primary dark:bg-cyan-500 animate-pulse shrink-0" />
                                                    <p className="text-sm md:text-base font-bold text-slate-700 dark:text-slate-300">{patient.ward}</p>
                                                </div>
                                            </td>
                                            <td className="px-4 md:px-6 py-4 md:py-5 text-center whitespace-nowrap">
                                                <span className={`text-[10px] md:text-sm font-black px-3 py-1 md:px-4 md:py-1.5 rounded-lg md:rounded-xl uppercase tracking-tighter ${patient.risk === 'High' ? 'text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20 shadow-sm' :
                                                    patient.risk === 'Moderate' ? 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20' :
                                                        'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20'
                                                    }`}>
                                                    {patient.risk}
                                                </span>
                                            </td>
                                            <td className="px-4 md:px-6 py-4 md:py-5 text-right rounded-r-2xl border-l-0 whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1 md:gap-2">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setEditingPatient(patient); }}
                                                        className="p-2 md:p-3 bg-secondary/50 dark:bg-slate-800/50 hover:bg-primary dark:hover:bg-cyan-500 hover:text-white rounded-lg md:rounded-xl text-primary dark:text-cyan-400 transition-all duration-300 md:opacity-0 md:group-hover:opacity-100 shadow-sm"
                                                    >
                                                        <Edit2 className="h-4 w-4 md:h-5 md:w-5" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDelete(patient.id, patient.name); }}
                                                        className="p-2 md:p-3 bg-red-50 dark:bg-red-500/10 hover:bg-red-500 hover:text-white rounded-lg md:rounded-xl text-red-500 dark:text-red-400 transition-all duration-300 md:opacity-0 md:group-hover:opacity-100 shadow-sm"
                                                    >
                                                        <Trash2 className="h-4 w-4 md:h-5 md:w-5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))
                                )}
                            </AnimatePresence>
                        </tbody>
                    </table>
                    {!loading && filteredPatients.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                            <User className="h-12 w-12 mx-auto mb-3 opacity-20" />
                            <p>No patients found matching your criteria.</p>
                        </div>
                    )}
                </div>
            </div>

            <PatientModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleAdmit}
            />

            <PatientModal
                isOpen={!!editingPatient}
                onClose={() => setEditingPatient(null)}
                onSubmit={handleUpdate}
                initialData={editingPatient}
                title="Update Patient Record"
            />
        </div>
    );
};

export default Patients;
