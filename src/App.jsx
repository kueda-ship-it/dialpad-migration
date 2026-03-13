import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from './lib/supabase';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ProjectList from './components/ProjectList';
import CalendarView from './components/CalendarView';
import Settings from './components/Settings';
import RouteFinder from './components/RouteFinder';
import MapView from './components/MapView';
import Login from './components/Login';
import { AppProvider, useApp } from './context/AppContext';
import { LayoutDashboard, ListTodo, Calendar, Navigation, MapPin, Settings as SettingsIcon } from 'lucide-react';

// 前回のロード時間をチェックして、10秒以内の再ロードなら警告を出して止める（デバッグ用・無限ループガード）
const lastLoad = sessionStorage.getItem('dm_last_load');
const now = Date.now();
if (lastLoad && (now - parseInt(lastLoad, 10)) < 10000) {
    console.warn('--- RELOAD LOOP DETECTED: Throttling full reload ---');
}
sessionStorage.setItem('dm_last_load', now.toString());

console.log('--- App Loaded (Checking for reload loop) ---');

// Vite HMR インターセプト: 無限リロード防止
if (import.meta.hot) {
    import.meta.hot.on('vite:beforeFullReload', () => {
        const last = sessionStorage.getItem('dm_last_reload_signal');
        const now = Date.now();
        if (last && (now - parseInt(last, 10)) < 15000) {
            console.error('--- HMR: Full reload BLOCKED (loop protection) ---');
            return false; // リロードを阻止（Vite 3+ なら反映される可能性があるが、基本は console で追跡）
        }
        sessionStorage.setItem('dm_last_reload_signal', now.toString());
    });
}

const AppContent = () => {
    const { user, setUser, authLoading, setAuthLoading } = useApp();
    const [view, setView] = useState('projects');

    useEffect(() => {
        // AppContext 側で enrichUser が行われるため、ここでは何もしない
    }, []);

    if (authLoading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner">
                    <div className="logo-icon" style={{ marginBottom: '1rem' }}>
                        <span className="logo-text" style={{ fontSize: '1.5rem' }}>DM</span>
                    </div>
                    <div className="spinner"></div>
                    <p style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.3em', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', marginTop: '8px' }}>
                        Authenticating
                    </p>
                </div>
            </div>
        );
    }

    if (!user) return <Login />;

    const renderView = () => {
        switch (view) {
            case 'dashboard': return <Dashboard />;
            case 'projects': return <ProjectList />;
            case 'calendar': return <CalendarView />;
            case 'settings': return <Settings />;
            case 'route': return <RouteFinder />;
            case 'map': return <MapView />;
            default: return <ProjectList />;
        }
    };

    return (
        <div className="app-container">
            <Sidebar activeTab={view} setActiveTab={setView} />
            <main className="main-content">
                {/* ─── Global Fixed Header ────────────────────────── */}
                <div className="global-fixed-header">
                    <div className="header-content-inner">
                        <header>
                            <h1 className="text-6xl font-black title-gradient-v10 tracking-tighter uppercase">
                                {view === 'dashboard' ? 'Dashboard' : 
                                 view === 'projects' ? 'Projects' :
                                 view === 'calendar' ? 'Calendar' :
                                 view === 'route' ? 'Routes' :
                                 view === 'map' ? 'Map' : 'Settings'}
                            </h1>
                            <p className="management-subtitle-v13 mt-3">
                                {view === 'dashboard' ? 'Migration Progress Overview' : 
                                 view === 'projects' ? 'Advanced Migration Control Interface' :
                                 view === 'calendar' ? 'Real-time Asset Management System' :
                                 view === 'route' ? 'Optimal Route Finder' :
                                 view === 'map' ? 'Property Location View' : 'System Configuration'}
                            </p>
                        </header>
                        <div className="header-actions">
                            <ActiveUsers />
                        </div>
                    </div>
                </div>

                <div key={view} className="view-container view-enter">
                    {renderView()}
                </div>
            </main>
        </div>
    );
};

/* ─── ActiveUsers ───────────────────────────────────────────────────────── */
const ActiveUsers = () => {
    const { activeUsers } = useApp();
    if (!activeUsers || activeUsers.length === 0) return null;

    return (
        <div className="flex items-center -space-x-3 hover:space-x-1 transition-all duration-300">
            <AnimatePresence>
                {activeUsers.slice(0, 5).map((u, i) => (
                    <motion.div
                        key={u.id || i}
                        initial={{ opacity: 0, scale: 0.8, x: 10 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.8, x: 10 }}
                        className="relative group"
                    >
                        <div className="w-10 h-10 rounded-xl p-[1px] bg-gradient-to-br from-white/20 to-transparent border border-white/10 shadow-lg overflow-hidden backdrop-blur-md">
                            {u.avatar_url ? (
                                <img src={u.avatar_url} alt={u.full_name} className="w-full h-full object-cover rounded-[10px]" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-white/5 text-[12px] font-black text-primary rounded-[10px]">
                                    {(u.full_name || 'U').substring(0, 1).toUpperCase()}
                                </div>
                            )}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-[#030712] rounded-full shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                        
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/80 backdrop-blur-md border border-white/10 rounded-md text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[1000]">
                            {u.full_name}
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
            {activeUsers.length > 5 && (
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black text-white/40 backdrop-blur-md">
                    +{activeUsers.length - 5}
                </div>
            )}
        </div>
    );
};

const App = () => {
    return (
        <AppProvider>
            <AppContent />
        </AppProvider>
    );
}

export default App;
