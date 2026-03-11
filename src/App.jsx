import React, { useState, useEffect } from 'react';
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
        const AVATAR_CACHE_KEY = 'dm_avatar_cache';

        const buildUserFast = (sessionUser) => {
            if (!sessionUser) return null;
            const isUeda = sessionUser.user_metadata?.full_name?.includes('上田') || sessionUser.email?.includes('ueda') || sessionUser.email === 'k_ueda@fts.co.jp';
            // localStorageキャッシュからアバターを即時取得
            let cachedAvatar = null;
            try {
                const cache = JSON.parse(localStorage.getItem(AVATAR_CACHE_KEY) || '{}');
                if (cache[sessionUser.id]) cachedAvatar = cache[sessionUser.id];
            } catch { /* ignore */ }
            return {
                ...sessionUser,
                full_name: sessionUser.user_metadata?.full_name || sessionUser.email?.split('@')[0] || 'Unknown User',
                avatar_url: sessionUser.user_metadata?.avatar_url || sessionUser.user_metadata?.picture || cachedAvatar || null,
                dm_role: isUeda ? 'Admin' : (sessionUser.user_metadata?.dm_role || (sessionUser.email?.includes('admin') ? 'Admin' : 'Manager'))
            };
        };

        const fetchAvatarAsync = async (sessionUser) => {
            if (!sessionUser) return;
            const withTimeout = (promise, ms = 3000) =>
                Promise.race([promise, new Promise(resolve => setTimeout(() => resolve(null), ms))]);

            let avatar = null;
            try {
                const result = await withTimeout(supabase.from('profiles').select('avatar_url').eq('id', sessionUser.id).single());
                if (result?.data?.avatar_url) avatar = result.data.avatar_url;
            } catch { /* avatar fetch silenced */ }

            if (avatar) {
                // localStorageにキャッシュ保存（次回起動で即時表示）
                try {
                    const cache = JSON.parse(localStorage.getItem(AVATAR_CACHE_KEY) || '{}');
                    cache[sessionUser.id] = avatar;
                    localStorage.setItem(AVATAR_CACHE_KEY, JSON.stringify(cache));
                } catch { /* ignore */ }
                setUser(prev => prev ? { ...prev, avatar_url: avatar } : prev);
            }
        };

        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const userData = buildUserFast(session?.user);
            setUser(userData);
            setAuthLoading(false);
            fetchAvatarAsync(session?.user, session);
        };

        checkUser();
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            const userData = buildUserFast(session?.user);
            setUser(userData);
            fetchAvatarAsync(session?.user, session);
        });
        return () => subscription.unsubscribe();
    }, [setUser, setAuthLoading]);

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
                <div key={view} className="view-container view-enter">
                    {renderView()}
                </div>
            </main>
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
