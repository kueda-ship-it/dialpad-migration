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

                {/* Avatar */}
                <div className="relative group flex flex-col items-center">
                    <div className="sidebar-avatar-wrap">
                        {user?.avatar_url ? (
                            <img src={user.avatar_url} alt="" className="sidebar-avatar-img" />
                        ) : (
                            <div className="sidebar-avatar-fallback">
                                <span>{user?.full_name?.charAt(0)?.toUpperCase() || 'U'}</span>
                            </div>
                        )}
                        {/* online dot — outside overflow:hidden */}
                        <span className="sidebar-avatar-dot" />
                    </div>

                    <p className="sidebar-avatar-name">{user?.full_name?.split(' ')[0] || 'User'}</p>
                    <p className="sidebar-avatar-role">{user?.dm_role || 'Member'}</p>

                    {/* Hover tooltip */}
                    <div className="sidebar-tooltip">
                        <div className="flex items-center gap-3">
                            <div className="sidebar-tooltip-icon">
                                <span className="text-white font-black text-base">{user?.full_name?.charAt(0)?.toUpperCase() || 'U'}</span>
                            </div>
                            <div>
                                <p className="text-[12px] font-black text-white leading-none mb-1">{user?.full_name || 'User'}</p>
                                <p className="text-[9px] font-bold text-primary tracking-widest uppercase opacity-70">{user?.dm_role || 'Member'}</p>
                            </div>
                        </div>
                    </div>
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
