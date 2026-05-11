import React, { useState, useEffect } from 'react';
import { Menu, Search, Bell, Moon, Sun } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const Header = ({ toggleSidebar }) => {
    const { user } = useAuth();
    const { isDark, toggle: toggleTheme } = useTheme();
    const [isConnected, setIsConnected] = useState(true);

    useEffect(() => {
        const checkConnection = async () => {
            try {
                const res = await fetch('/api/health');
                setIsConnected(res.ok);
            } catch { setIsConnected(false); }
        };
        checkConnection();
        const interval = setInterval(checkConnection, 10000);
        return () => clearInterval(interval);
    }, []);

    return (
        <header className="px-4 md:px-6 py-3 bg-background/80 backdrop-blur-md border-b border-border sticky top-0 z-30 flex items-center justify-between transition-colors duration-300">
            <div className="flex items-center gap-3">
                <button onClick={toggleSidebar} className="p-2 text-muted-foreground hover:bg-secondary dark:hover:bg-slate-800 rounded-xl transition-colors">
                    <Menu className="h-5 w-5" />
                </button>
                <div className="hidden md:flex items-center gap-2">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Clinical Interface</p>
                    <span className="w-1 h-1 bg-border rounded-full" />
                    <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isConnected ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500'}`}>
                            {isConnected ? 'System Online' : 'Backend Offline'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 md:gap-3">
                <div className="relative hidden sm:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search patients, reports..."
                        className="pl-9 pr-4 py-2 w-48 md:w-56 rounded-xl border border-input bg-secondary/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-muted-foreground dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                    />
                </div>

                {/* Quick dark mode toggle */}
                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary dark:hover:bg-slate-800 transition-all"
                    title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                    {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
                </button>

                <button className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-secondary dark:hover:bg-slate-800 rounded-xl transition-colors">
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-2 right-2 h-2 w-2 bg-destructive rounded-full border-2 border-background" />
                </button>

                <div className="flex items-center gap-2 pl-3 border-l border-border">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold text-foreground leading-tight">{user?.name || 'Clinician'}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{user?.role || 'Doctor'}</p>
                    </div>
                    <img
                        src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=6366f1&color=fff`}
                        alt="Profile"
                        className="h-9 w-9 rounded-xl border-2 border-border shadow-sm"
                    />
                </div>
            </div>
        </header>
    );
};

export default Header;
