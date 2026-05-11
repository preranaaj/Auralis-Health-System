import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, Lock, Mail, User, ArrowRight, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';

const Register = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [gender, setGender] = useState('');
    const [role, setRole] = useState('Patient');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { user, register } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (user) {
            if (user.role === 'Admin') navigate('/admin', { replace: true });
            else if (user.role === 'Doctor') navigate('/dashboard', { replace: true });
            else navigate('/portal', { replace: true });
        }
    }, [user, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!gender) {
            alert("Please select your orientation.");
            return;
        }
        setIsSubmitting(true);
        try {
            await register(name, email, password, gender, role);
        } catch (err) {
            console.error("Registration failed:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex h-screen w-full bg-background overflow-hidden font-sans">
            {/* Left Panel - Branding & Visuals */}
            <div className="hidden lg:flex w-7/12 bg-indigo-950 relative items-center justify-center overflow-hidden">
                {/* High-quality surgical/lab background */}
                <div className="absolute inset-0 z-0">
                    <img
                        src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=2080"
                        alt="Join Auralis"
                        className="w-full h-full object-cover mix-blend-overlay opacity-30 scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-bl from-indigo-900/95 via-purple-950/90 to-slate-950/100"></div>
                </div>

                {/* Animated Decorative Elements */}
                <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-blue-500 opacity-5 rounded-full blur-[120px] z-1"
                />

                <div className="relative z-10 p-16 text-white max-w-2xl">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-6 mb-12"
                    >
                        <div className="p-5 bg-white/10 backdrop-blur-3xl rounded-[2rem] border border-white/20 shadow-2xl ring-8 ring-white/5">
                            <Activity className="h-12 w-12 text-white" />
                        </div>
                        <h1 className="text-5xl font-black tracking-tighter uppercase italic drop-shadow-2xl">Auralis</h1>
                    </motion.div>

                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-7xl font-black mb-10 leading-[1] tracking-tighter drop-shadow-xl"
                    >
                        The Future of <br />
                        <span className="text-primary-foreground/80 underline decoration-blue-400 decoration-8 underline-offset-8">Clinical Decisions.</span>
                    </motion.h2>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-blue-50/70 text-2xl leading-relaxed font-bold mb-16 max-w-lg italic"
                    >
                        Onboard to the vanguard of medical data synthesis. Secure, intuitive, and data-driven.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="flex flex-col gap-4"
                    >
                        <div className="flex items-center gap-3 text-blue-200">
                            <ShieldCheck className="h-6 w-6 text-blue-400" />
                            <span className="text-lg font-medium tracking-wide font-sans">Enterprise-grade Security (MongoDB Atlas)</span>
                        </div>
                        <div className="flex items-center gap-3 text-blue-200">
                            <Activity className="h-6 w-6 text-emerald-400" />
                            <span className="text-lg font-medium tracking-wide">Dynamic Clinical Telemetry Visualization</span>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Right Panel - Register Form */}
            <div className="w-full lg:w-5/12 flex items-center justify-center p-6 md:p-12 relative bg-card h-full overflow-y-auto">
                <div className="absolute top-0 left-0 p-6 md:p-10">
                    <Link to="/login" className="text-sm font-bold text-primary hover:text-blue-700 transition-all flex items-center gap-2 group">
                        <ArrowRight className="h-4 w-4 rotate-180 group-hover:-translate-x-1 transition-transform" /> Back to Clinical Login
                    </Link>
                </div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-md space-y-8 md:space-y-10 mt-12 md:mt-0"
                >
                    <div className="text-center lg:text-left">
                        <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-foreground mb-3 md:mb-4">Clinical Onboarding</h2>
                        <p className="text-base md:text-xl text-muted-foreground font-bold italic">
                            Create your neural identifiers to begin.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="mt-8 md:mt-10 space-y-6 md:space-y-7">
                        <div className="space-y-5 md:space-y-6">
                            <div>
                                <label className="block text-xs md:text-sm font-black text-foreground/50 uppercase tracking-[0.2em] mb-3 md:mb-4">
                                    Professional Identity
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 md:pl-6 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-all">
                                        <User className="h-5 w-5 md:h-7 md:w-7" />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="block w-full pl-12 md:pl-16 pr-4 md:pr-6 py-4 md:py-6 border-2 border-slate-100 rounded-2xl md:rounded-[2rem] bg-slate-50 focus:bg-white focus:ring-4 md:focus:ring-8 focus:ring-primary/5 focus:border-primary transition-all outline-none text-base md:text-xl font-bold placeholder:text-slate-300"
                                        placeholder="Identification Name"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs md:text-sm font-black text-foreground/50 uppercase tracking-[0.2em] mb-3 md:mb-4">
                                    System Role
                                </label>
                                <div className="grid grid-cols-2 gap-3 md:gap-4">
                                    {['Patient', 'Doctor'].map((r) => (
                                        <button
                                            key={r}
                                            type="button"
                                            onClick={() => setRole(r)}
                                            className={cn(
                                                "py-3 md:py-4 rounded-xl md:rounded-2xl border-2 font-black transition-all flex items-center justify-center gap-2 md:gap-3 text-sm md:text-base",
                                                role === r
                                                    ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200"
                                                    : "bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100"
                                            )}
                                        >
                                            {r.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs md:text-sm font-black text-foreground/50 uppercase tracking-[0.2em] mb-3 md:mb-4">
                                    Professional Orientation
                                </label>
                                <div className="grid grid-cols-2 gap-3 md:gap-4">
                                    {['Male', 'Female'].map((mode) => (
                                        <button
                                            key={mode}
                                            type="button"
                                            onClick={() => setGender(mode)}
                                            className={cn(
                                                "py-3 md:py-4 rounded-xl md:rounded-2xl border-2 font-black transition-all flex items-center justify-center gap-2 md:gap-3 text-sm md:text-base",
                                                gender === mode
                                                    ? "bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-[1.02]"
                                                    : "bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100"
                                            )}
                                        >
                                            <div className={cn(
                                                "h-2.5 w-2.5 md:h-3 md:w-3 rounded-full border-2",
                                                gender === mode ? "bg-white border-white" : "border-slate-300"
                                            )} />
                                            {mode.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs md:text-sm font-black text-foreground/50 uppercase tracking-[0.2em] mb-3 md:mb-4">
                                    Network Identifier
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 md:pl-6 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-all">
                                        <Mail className="h-5 w-5 md:h-7 md:w-7" />
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="block w-full pl-12 md:pl-16 pr-4 md:pr-6 py-4 md:py-6 border-2 border-slate-100 rounded-2xl md:rounded-[2rem] bg-slate-50 focus:bg-white focus:ring-4 md:focus:ring-8 focus:ring-primary/5 focus:border-primary transition-all outline-none text-base md:text-xl font-bold placeholder:text-slate-300"
                                        placeholder="doctor@auralis.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs md:text-sm font-black text-foreground/50 uppercase tracking-[0.2em] mb-3 md:mb-4">
                                    Vault Security Key
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 md:pl-6 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-all">
                                        <Lock className="h-5 w-5 md:h-7 md:w-7" />
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="block w-full pl-12 md:pl-16 pr-4 md:pr-6 py-4 md:py-6 border-2 border-slate-100 rounded-2xl md:rounded-[2rem] bg-slate-50 focus:bg-white focus:ring-4 md:focus:ring-8 focus:ring-primary/5 focus:border-primary transition-all outline-none text-base md:text-xl font-bold placeholder:text-slate-300"
                                        placeholder="Min. 8 characters"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="group relative w-full flex justify-center py-4 md:py-6 px-6 md:px-8 border border-transparent text-base md:text-xl font-black uppercase tracking-widest rounded-2xl md:rounded-[2rem] text-white clinical-gradient hover:opacity-90 focus:outline-none focus:ring-4 md:focus:ring-8 focus:ring-primary/20 transition-all shadow-xl md:shadow-2xl clinical-shadow disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden active:scale-95 mt-4 md:mt-6"
                        >
                            {isSubmitting ? (
                                <div className="animate-spin rounded-full h-6 w-6 md:h-8 md:w-8 border-4 border-white border-t-transparent"></div>
                            ) : (
                                <span className="flex items-center gap-3 md:gap-4">
                                    Final Diagnostics <ArrowRight className="h-5 w-5 md:h-7 md:w-7 group-hover:translate-x-2 md:group-hover:translate-x-3 transition-transform duration-500" />
                                </span>
                            )}
                        </button>
                    </form>

                    <div className="text-center">
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
                            Auralis Systems Access Protocol v2.4
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Register;
