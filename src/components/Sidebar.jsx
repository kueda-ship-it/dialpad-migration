import React from 'react';
import { LayoutDashboard, ListTodo, MapPin, Calendar, Navigation, Settings as SettingsIcon } from 'lucide-react';
import { useApp } from '../context/AppContext';

const Sidebar = ({ activeTab, setActiveTab }) => {
    const { projects, user } = useApp();
    const uncheckedCount = projects.filter(p => !p.master_update_done && p.status === '対応予定').length;
    const isAdminManagerOrEditor = ['Admin', 'Manager', 'Editor'].includes(user?.dm_role);

    const menuItems = [
        { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { id: 'projects', icon: ListTodo,        label: 'Projects'  },
        { id: 'route',    icon: Navigation,      label: 'Routes'    },
        { id: 'map',      icon: MapPin,          label: 'Map'       },
        { id: 'calendar', icon: Calendar,        label: 'Calendar'  },
    ];

    return (
        <aside className="fixed top-0 left-0 h-screen sidebar-v7">

            {/* ── Logo ── */}
            <div className="sidebar-logo-wrap">
                <div className="sidebar-logo-icon">
                    <span className="text-white font-black text-lg italic tracking-tighter select-none">DM</span>
                </div>
            </div>

            {/* ── Nav ── */}
            <nav className="flex-1 w-full flex flex-col items-center gap-1 px-2">
                {menuItems.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                        <div key={item.id} className="relative group w-full flex justify-center">
                            <div style={{ position: 'relative', display: 'inline-block' }}>
                                <button
                                    onClick={() => setActiveTab(item.id)}
                                    className={`nav-item-v7 ${isActive ? 'active' : ''}`}
                                    title={item.label}
                                >
                                    <item.icon
                                        size={22}
                                        strokeWidth={isActive ? 2.5 : 1.8}
                                    />
                                    <span className="nav-label-v8">{item.label}</span>
                                </button>
                                {item.id === 'projects' && uncheckedCount > 0 && isAdminManagerOrEditor && (
                                    <div className="sidebar-badge">{uncheckedCount}</div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </nav>

            {/* ── Bottom ── */}
            <div className="sidebar-bottom">


                {/* User Profile */}
                <div className="flex justify-center mb-4">
                    <div className="relative">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center overflow-hidden">
                            {user?.avatar_url ? (
                                <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-blue-400 font-bold text-xs">
                                    {user?.email?.[0].toUpperCase() || 'U'}
                                </span>
                            )}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-[#030712] rounded-full shadow-lg" />
                    </div>
                </div>

                {/* User Info Block */}
                <div className="flex flex-col items-center mb-6 px-1">
                    <span className="text-[11px] font-black text-white/90 truncate w-full text-center tracking-tight">
                        {user?.full_name || 'User'}
                    </span>
                    <span className="text-[9px] font-bold text-blue-400/80 uppercase tracking-widest mt-0.5">
                        {user?.dm_role || 'Member'}
                    </span>
                </div>

                {/* Settings */}
                <div className="relative group w-full flex justify-center">
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`nav-item-v7 ${activeTab === 'settings' ? 'active' : ''}`}
                        title="Settings"
                    >
                        <SettingsIcon size={20} strokeWidth={activeTab === 'settings' ? 2.5 : 1.8} />
                        <span className="nav-label-v8">Settings</span>
                    </button>
                </div>

            </div>
        </aside>
    );
};

export default Sidebar;
