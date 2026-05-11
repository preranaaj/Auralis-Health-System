import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, MapPin, User, ChevronLeft, ChevronRight, MoreHorizontal, Plus, Check, X, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { bookAppointment, fetchAppointments, updateAppointment, fetchDoctors } from '../lib/api';

const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const Schedule = () => {
    const { user } = useAuth();
    const today = new Date();
    const [viewDate, setViewDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(today.getDate());
    const [appointments, setAppointments] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [showBookModal, setShowBookModal] = useState(false);

    const currentYear = viewDate.getFullYear();
    const currentMonth = viewDate.getMonth();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
    const currentMonthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const [bookingForm, setBookingForm] = useState({
        doctor_id: '',
        service: 'General Consultation',
        date: today.toISOString().split('T')[0],
        time: '09:00',
        notes: ''
    });

    const loadData = async () => {
        try {
            const [aptData, docData] = await Promise.all([
                fetchAppointments(user?.id, user?.role),
                fetchDoctors()
            ]);
            setAppointments(aptData);
            setDoctors(docData);
        } catch (err) {
            console.error("Failed to load schedule data:", err);
        }
    };

    useEffect(() => {
        if (user) loadData();
    }, [user]);

    const handleBook = async (e) => {
        e.preventDefault();
        const selectedDoc = doctors.find(d => d.id === bookingForm.doctor_id);
        try {
            await bookAppointment({
                patient_id: user.id || user._id,
                patient_name: user.name,
                doctor_id: bookingForm.doctor_id,
                doctor_name: selectedDoc?.name || 'Dr. TBA',
                service: bookingForm.service,
                date: bookingForm.date,
                time: bookingForm.time,
                notes: bookingForm.notes
            });
            setShowBookModal(false);
            loadData();
        } catch (err) {
            alert("Booking failed: " + err.message);
        }
    };

    const handleStatusUpdate = async (id, status) => {
        try {
            await updateAppointment(id, { status });
            loadData();
        } catch (err) {
            alert("Update failed");
        }
    };

    const changeMonth = (offset) => {
        const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1);
        setViewDate(newDate);
    };

    return (
        <div className="space-y-6 md:space-y-8 min-h-[calc(100vh-8rem)] flex flex-col">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 md:mb-10 gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-foreground mb-1 md:mb-2 lg:mb-3">Clinical Timeline</h1>
                    <p className="text-sm md:text-lg lg:text-xl text-muted-foreground font-medium italic">Orchestrating surgical and consultative workflows.</p>
                </div>
                {user?.role !== 'Doctor' && (
                    <button
                        onClick={() => setShowBookModal(true)}
                        className="clinical-gradient text-white px-5 md:px-8 lg:px-10 py-3 md:py-3.5 lg:py-4 rounded-xl md:rounded-2xl lg:rounded-3xl text-sm md:text-lg lg:text-xl font-black shadow-2xl clinical-shadow flex items-center justify-center gap-2 md:gap-3 lg:gap-4 active:scale-95 transition-all w-full md:w-auto"
                    >
                        <Plus className="h-5 w-5 md:h-6 md:w-6 lg:h-7 lg:w-7" />
                        Secure Appointment
                    </button>
                )}
            </div>

            <div className="flex flex-col lg:flex-row gap-6 md:gap-8 flex-1">
                {/* Calendar Section */}
                <div className="lg:w-2/3 flex flex-col glass-card rounded-[2rem] md:rounded-[2.5rem] lg:rounded-[3rem] clinical-shadow overflow-hidden border border-white/20 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
                    <div className="p-6 md:p-8 lg:p-10 flex flex-col sm:flex-row items-center justify-between border-b border-white/20 dark:border-slate-800 gap-4">
                        <h3 className="text-xl md:text-2xl lg:text-3xl font-black flex items-center gap-2 md:gap-3 lg:gap-4 tracking-tight text-slate-800 dark:text-slate-100">
                            <CalendarIcon className="h-6 w-6 md:h-7 md:w-7 lg:h-8 lg:w-8 text-primary dark:text-cyan-400" />
                            {monthNames[currentMonth]} {currentYear}
                        </h3>
                        <div className="flex gap-3">
                            <button
                                onClick={() => changeMonth(-1)}
                                className="p-3 bg-white/50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 rounded-xl text-muted-foreground transition-all border border-white/20 dark:border-slate-700 shadow-sm"
                            >
                                <ChevronLeft className="h-6 w-6" />
                            </button>
                            <button
                                onClick={() => changeMonth(1)}
                                className="p-3 bg-white/50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 rounded-xl text-muted-foreground transition-all border border-white/20 dark:border-slate-700 shadow-sm"
                            >
                                <ChevronRight className="h-6 w-6" />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 border-b border-white/20 dark:border-slate-800 bg-primary/5 dark:bg-cyan-500/5">
                        {days.map(day => (
                            <div key={day} className="py-4 text-center text-xs font-black text-muted-foreground dark:text-slate-500 uppercase tracking-[0.2em]">
                                {day}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 flex-1 auto-rows-fr">
                        {/* Empty slots for offset */}
                        {[...Array(firstDayOfMonth)].map((_, i) => <div key={`empty-${i}`} className="border-b border-r border-border/50 min-h-[80px]" />)}

                        {currentMonthDays.map(day => (
                            <div
                                key={day}
                                onClick={() => setSelectedDate(day)}
                                className={`border-b border-r border-white/20 dark:border-slate-800 p-2 md:p-4 lg:p-6 min-h-[80px] md:min-h-[100px] lg:min-h-[140px] cursor-pointer hover:bg-white dark:hover:bg-slate-800/50 transition-all relative group ${day === selectedDate ? 'bg-white/80 dark:bg-slate-800/80' : ''}`}
                            >
                                <span className={`text-sm md:text-base lg:text-lg font-black h-8 w-8 md:h-10 md:w-10 lg:h-12 lg:w-12 flex items-center justify-center rounded-xl md:rounded-2xl lg:rounded-3xl transition-all ${day === selectedDate ? 'clinical-gradient text-white shadow-xl' : 'text-slate-600 dark:text-slate-400 group-hover:bg-slate-100 dark:group-hover:bg-slate-800'}`}>
                                    {day}
                                </span>
                                {/* Real appointment indicators */}
                                {(() => {
                                    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                    const dayAppts = appointments.filter(a => a.date === dateStr);
                                    if (dayAppts.length > 0) {
                                        return (
                                            <div className="mt-2 text-[10px] bg-primary/10 dark:bg-cyan-500/10 text-primary dark:text-cyan-400 rounded-lg px-2 py-1 font-black uppercase tracking-tighter border border-primary/20 dark:border-cyan-500/30">
                                                {dayAppts.length} Session{dayAppts.length > 1 ? 's' : ''}
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="lg:w-1/3 glass-card rounded-[2rem] md:rounded-[2.5rem] lg:rounded-[3rem] clinical-shadow flex flex-col overflow-hidden border border-white/20 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 h-[400px] lg:h-auto">
                    <div className="p-6 md:p-8 lg:p-10 border-b border-white/20 dark:border-slate-800">
                        <h3 className="text-xl md:text-2xl lg:text-3xl font-black tracking-tight text-slate-800 dark:text-slate-100">Session Queue ({appointments.length})</h3>
                        <p className="text-sm md:text-base lg:text-lg text-muted-foreground dark:text-slate-500 font-medium italic">Role: {user?.role} Access</p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {appointments.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                                <CalendarIcon className="h-10 w-10 mb-2 opacity-20" />
                                <p className="font-bold">No active sessions found.</p>
                            </div>
                        )}
                        {appointments.map((apt, index) => (
                            <motion.div
                                key={apt.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="p-4 md:p-6 lg:p-8 rounded-2xl md:rounded-[2rem] lg:rounded-[2.5rem] bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 hover:scale-[1.02] hover:shadow-xl dark:hover:shadow-cyan-900/20 transition-all group cursor-pointer relative overflow-hidden"
                            >
                                <div className="flex items-center gap-4 md:gap-5 lg:gap-6 mb-4 md:mb-5 lg:mb-6">
                                    <div className="h-12 w-12 md:h-14 md:w-14 lg:h-16 lg:w-16 rounded-xl md:rounded-2xl lg:rounded-3xl clinical-gradient flex items-center justify-center text-white font-black text-lg md:text-xl lg:text-2xl shadow-lg ring-4 ring-white/50 shrink-0">
                                        {user?.role === 'Doctor' ? apt.patient_name[0] : apt.doctor_name[0]}
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="font-black text-base md:text-lg lg:text-xl text-slate-800 dark:text-slate-100 tracking-tight truncate">
                                            {user?.role === 'Doctor' ? apt.patient_name : apt.doctor_name}
                                        </h4>
                                        <p className="text-xs md:text-sm lg:text-base font-bold text-muted-foreground dark:text-slate-400 uppercase tracking-wider truncate">{apt.service}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-3 text-sm font-bold text-slate-600 dark:text-slate-300 mb-5">
                                    <div className="flex items-center gap-3">
                                        <Clock className="h-5 w-5 text-primary dark:text-cyan-400" />
                                        {apt.date} <span className="text-slate-300 dark:text-slate-700 mx-1">•</span> {apt.time}
                                    </div>
                                    <div className="flex items-center gap-3 italic">
                                        <FileText className="h-5 w-5 text-slate-300" />
                                        {apt.notes || "No clinical notes attached."}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className={cn(
                                        "text-[11px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest border",
                                        apt.status === 'Approved' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-500/30" :
                                            apt.status === 'Pending' ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200/50 dark:border-amber-500/30" :
                                                "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600"
                                    )}>
                                        {apt.status}
                                    </span>

                                    {user?.role === 'Doctor' && apt.status === 'Pending' && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleStatusUpdate(apt.id, 'Approved'); }}
                                                className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-all"
                                            >
                                                <Check className="h-5 w-5" />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleStatusUpdate(apt.id, 'Cancelled'); }}
                                                className="p-2 hover:bg-rose-50 text-rose-600 rounded-lg transition-all"
                                            >
                                                <X className="h-5 w-5" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Booking Modal */}
            <AnimatePresence>
                {showBookModal && (
                    <div className="fixed inset-0 z-[100] flex items-start justify-center p-6 pt-16 overflow-y-auto no-scrollbar">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowBookModal(false)}
                            className="absolute inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 clinical-shadow border border-white/20 dark:border-slate-800 max-h-[90vh] overflow-y-auto no-scrollbar"
                        >
                            <h2 className="text-2xl md:text-3xl font-black mb-6 tracking-tight text-slate-800 dark:text-slate-100">Secure Clinical Session</h2>
                            <form onSubmit={handleBook} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground dark:text-slate-500">Select Clinician</label>
                                    <select
                                        required
                                        className="w-full p-4 rounded-xl border-2 border-slate-50 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 outline-none font-bold text-slate-800 dark:text-slate-100 focus:border-primary dark:focus:border-cyan-500"
                                        value={bookingForm.doctor_id}
                                        onChange={(e) => setBookingForm({ ...bookingForm, doctor_id: e.target.value })}
                                    >
                                        <option value="" className="dark:bg-slate-900">Select Doctor</option>
                                        {doctors.map(doc => (
                                            <option key={doc.id} value={doc.id} className="dark:bg-slate-900">{doc.name} ({doc.specialty})</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground dark:text-slate-500">Date</label>
                                        <input
                                            type="date" required
                                            className="w-full p-4 rounded-xl border-2 border-slate-50 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 outline-none font-bold text-slate-800 dark:text-slate-100 focus:border-primary dark:focus:border-cyan-500"
                                            value={bookingForm.date}
                                            onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground dark:text-slate-500">Preferred Time</label>
                                        <input
                                            type="time" required
                                            className="w-full p-4 rounded-xl border-2 border-slate-50 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 outline-none font-bold text-slate-800 dark:text-slate-100 focus:border-primary dark:focus:border-cyan-500"
                                            value={bookingForm.time}
                                            onChange={(e) => setBookingForm({ ...bookingForm, time: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground dark:text-slate-500">Clinical Concern / Notes</label>
                                    <textarea
                                        className="w-full p-4 rounded-xl border-2 border-slate-50 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 outline-none font-bold h-24 text-slate-800 dark:text-slate-100 focus:border-primary dark:focus:border-cyan-500"
                                        placeholder="Briefly describe the purpose of your visit..."
                                        value={bookingForm.notes}
                                        onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                                    />
                                </div>

                                <button type="submit" className="w-full py-5 clinical-gradient text-white rounded-2xl font-black text-xl shadow-xl active:scale-95 transition-all dark:shadow-cyan-900/50">
                                    Finalize Booking
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Schedule;
