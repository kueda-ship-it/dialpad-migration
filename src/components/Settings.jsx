import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import {
    Settings as SettingsIcon, Bell, Mail, Send, LogOut,
    User, Shield, Check, Users, UserPlus, Trash2, Camera,
    ChevronRight, ChevronDown, Globe, Lock, AlertTriangle, Clock, Info
} from 'lucide-react';
import './Settings.css';

const ROLE_OPTIONS = ['Admin', 'Manager', 'Editor', 'View'];
const ROLE_STYLE = {
    Admin:   { bg: 'rgba(239,68,68,0.15)',   color: '#f87171', border: 'rgba(239,68,68,0.35)',   glow: 'rgba(239,68,68,0.18)' },
    Manager: { bg: 'rgba(139,92,246,0.15)',  color: '#c4b5fd', border: 'rgba(139,92,246,0.35)',  glow: 'rgba(139,92,246,0.18)' },
    Editor:  { bg: 'rgba(59,130,246,0.15)',  color: '#93c5fd', border: 'rgba(59,130,246,0.35)',  glow: 'rgba(59,130,246,0.18)' },
    View:    { bg: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: 'rgba(255,255,255,0.08)', glow: 'transparent' },
};

function RoleDropdown({ value, onChange }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
        const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);
    const cur = ROLE_STYLE[value] || ROLE_STYLE.View;
    return (
        <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
            <button type="button" onClick={() => setOpen(o => !o)} style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: cur.bg, border: `1px solid ${cur.border}`,
                borderRadius: '8px', padding: '7px 12px', cursor: 'pointer',
                color: cur.color, fontSize: '0.7rem', fontWeight: 800,
                textTransform: 'uppercase', letterSpacing: '0.08em',
                boxShadow: `0 0 8px ${cur.glow}`, transition: 'all 0.2s',
                whiteSpace: 'nowrap', outline: 'none',
            }}>
                {value}
                <ChevronDown size={12} style={{
                    opacity: 0.6,
                    transform: open ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s',
                }} />
            </button>
            {open && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 200,
                    background: 'rgba(10,15,25,0.97)', backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px',
                    padding: '4px', minWidth: '120px',
                    boxShadow: '0 16px 48px rgba(0,0,0,0.75)',
                }}>
                    {ROLE_OPTIONS.map(role => {
                        const c = ROLE_STYLE[role];
                        return (
                            <button key={role} type="button"
                                onClick={() => { onChange(role); setOpen(false); }}
                                style={{
                                    display: 'block', width: '100%', textAlign: 'left',
                                    padding: '8px 12px', borderRadius: '7px', border: 'none',
                                    background: value === role ? c.bg : 'transparent',
                                    color: c.color, fontSize: '0.7rem', fontWeight: 800,
                                    textTransform: 'uppercase', letterSpacing: '0.08em',
                                    cursor: 'pointer', transition: 'background 0.15s', outline: 'none',
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = c.bg}
                                onMouseLeave={e => e.currentTarget.style.background = value === role ? c.bg : 'transparent'}
                            >{role}</button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

const Settings = () => {
    const { user, setUser, notificationSettings, setNotificationSettings } = useApp();
    const [allProfiles, setAllProfiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('general');
    const [_editingUserId, _setEditingUserId] = useState(null);
    const [_avatarInput, _setAvatarInput] = useState('');

    const isAdmin = user?.dm_role === 'Admin';

    // Fetch current user's profile from Supabase profiles table on mount
    useEffect(() => {
        const fetchMyProfile = async () => {
            if (!user?.id) return;
            const { data, error } = await supabase
                .from('profiles')
                .select('avatar_url, display_name, dm_role')
                .eq('id', user.id)
                .single();

            if (data && !error) {
                // Merge profiles table data into user context
                setUser(prev => ({
                    ...prev,
                    avatar_url: data.avatar_url || prev?.avatar_url || null,
                    full_name: data.display_name || prev?.full_name,
                    dm_role: data.dm_role || prev?.dm_role
                }));
            }
        };
        fetchMyProfile();
    }, [user?.id, setUser]);

    const [showInvite, setShowInvite] = useState(false);
    const [inviteName, setInviteName] = useState('');
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('View');
    const [fetchError, setFetchError] = useState(null);

    // Timeout helper
    const withTimeout = (promise, ms = 10000) =>
        Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('タイムアウト: 10秒以内にレスポンスがありませんでした')), ms))]);

    const fetchProfiles = useCallback(async () => {
        setLoading(true);
        setFetchError(null);
        try {
            const { data, error } = await withTimeout(
                supabase.from('profiles').select('*').order('display_name')
            );
            if (error) {
                console.error('Error fetching profiles:', error);
                setFetchError(`RLSエラー: ${error.message}`);
                setAllProfiles([]);
            } else {
                console.log('[Profiles] fetched:', data?.length, 'records');
                setAllProfiles(data || []);
            }
        } catch (e) {
            console.error('Profiles fetch failed:', e);
            setFetchError(`${e.message}。SupabaseのRLSポリシー "Authenticated users can read profiles" が設定されているか確認してください。`);
            setAllProfiles([]);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        if (isAdmin && activeTab === 'users') {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            fetchProfiles();
        }
    }, [isAdmin, activeTab, fetchProfiles]);

    const inviteUser = async () => {
        if (!inviteName.trim() || !inviteEmail.trim()) {
            alert('名前とメールアドレスは必須です');
            return;
        }
        // セッションを明示取得（Azure AD SSO でのトークン期限切れ対策）
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;
        if (!accessToken) {
            alert('セッションが切れています。再ログインしてください。');
            return;
        }
        const { data, error } = await supabase.functions.invoke('invite-user', {
            body: {
                display_name: inviteName.trim(),
                email: inviteEmail.trim(),
                dm_role: inviteRole,
            },
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (error || data?.error) {
            alert('追加に失敗しました: ' + (data?.error || error?.message || 'Unknown error'));
            console.error('Invite error:', error || data?.error);
        } else {
            setInviteName('');
            setInviteEmail('');
            setInviteRole('View');
            setShowInvite(false);
            fetchProfiles();
        }
    };

    const updateRole = async (userId, newRole) => {
        const { error } = await supabase
            .from('profiles')
            .update({ dm_role: newRole })
            .eq('id', userId);

        if (error) alert('権限の更新に失敗しました: ' + error.message);
        else fetchProfiles();
    };

    const handleAvatarFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !user?.id) return;

        const fileExt = file.name.split('.').pop();
        const filePath = `avatars/${user.id}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, file, { upsert: true });

        if (uploadError) {
            console.error('Upload error:', uploadError);
            alert('画像のアップロードに失敗しました。Supabase Storage の "avatars" バケットが作成されているか確認してください。');
            return;
        }

        const { data: urlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

        if (urlData?.publicUrl) {
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: urlData.publicUrl })
                .eq('id', user.id);

            if (!updateError) {
                // Update local cache as well
                const AVATAR_CACHE_KEY = 'dm_avatar_cache';
                try {
                    const cache = JSON.parse(localStorage.getItem(AVATAR_CACHE_KEY) || '{}');
                    cache[user.id] = {
                        ...(cache[user.id] || {}),
                        avatar: urlData.publicUrl
                    };
                    localStorage.setItem(AVATAR_CACHE_KEY, JSON.stringify(cache));
                } catch { /* ignore */ }

                setUser(prev => ({ ...prev, avatar_url: urlData.publicUrl }));
                alert('アバターを更新しました！');
            }
        }
    };

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) console.error('Error logging out:', error.message);
    };

    const toggleTargetUser = (role) => {
        const targets = notificationSettings.targetUsers.includes(role)
            ? notificationSettings.targetUsers.filter(r => r !== role)
            : [...notificationSettings.targetUsers, role];

        setNotificationSettings({ ...notificationSettings, targetUsers: targets });
    };

    const getRoleBadgeClass = (role) => {
        switch (role) {
            case 'Admin': return 's-role-badge admin';
            case 'Manager': return 's-role-badge manager';
            case 'Editor': return 's-role-badge editor';
            default: return 's-role-badge view';
        }
    };

    return (
        <div className="settings-page">
            <header className="settings-header">
                <div className="settings-header-left">
                    <div className="settings-header-icon">
                        <SettingsIcon size={32} color="#3b82f6" />
                    </div>
                    <div>
                        <h1 className="settings-title">システム設定</h1>
                        <p className="settings-subtitle">
                            <Globe size={14} /> Global Management & User Controls
                        </p>
                    </div>
                </div>

                <div className="settings-tabs">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`settings-tab-btn ${activeTab === 'general' ? 'active' : ''}`}
                    >
                        <SettingsIcon size={16} />
                        一般設定
                    </button>
                    {isAdmin && (
                        <button
                            onClick={() => setActiveTab('users')}
                            className={`settings-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
                        >
                            <Users size={16} />
                            ユーザー管理
                        </button>
                    )}
                </div>
            </header>

            {activeTab === 'general' ? (
                <div className="settings-grid">
                    {/* Left Column: Profile & Security */}
                    <div className="settings-left-col">
                        <section className="s-card">
                            <div className="s-card-header">
                                <User size={22} color="#3b82f6" />
                                <h2>マイプロフィール</h2>
                            </div>

                            <div className="s-profile-center">
                                <div className="s-avatar-wrapper">
                                    {user?.avatar_url ? (
                                        <img src={user.avatar_url} alt="Avatar" className="s-avatar-img" />
                                    ) : (
                                        <div className="s-avatar-fallback">
                                            {user?.full_name?.charAt(0)}
                                        </div>
                                    )}
                                    <div className="s-avatar-camera">
                                        <Camera size={16} color="#3b82f6" />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="s-profile-name">{user?.full_name}</h3>
                                    <p className="s-profile-role">{user?.dm_role}</p>
                                </div>
                            </div>

                            <div>
                                <span className="s-upload-label">アバター画像更新</span>
                                <div className="s-file-upload">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleAvatarFileChange}
                                    />
                                    <div className="s-file-upload-visual">
                                        <span className="s-file-upload-text">画像ファイルを選択...</span>
                                        <Camera size={16} color="#64748b" />
                                    </div>
                                </div>
                                <p className="s-file-upload-hint">* 画像を選択するとSupabase Storageに自動アップロードされます</p>

                                <button onClick={handleLogout} className="s-logout-btn">
                                    <LogOut size={18} />
                                    <span>システムからログアウト</span>
                                </button>
                            </div>
                        </section>

                        <section className="s-card s-security-card">
                            <div className="s-card-header">
                                <Shield size={18} color="#3b82f6" />
                                <h3 style={{ fontWeight: 900, color: '#ffffff' }}>セキュリティ状況</h3>
                            </div>
                            <p className="s-security-text">
                                Microsoft アカウントによるシングルサインオンが有効です。Supabase RLS によりデータは保護されています。
                            </p>
                            <div className="s-security-badge">
                                <div className="s-security-dot"></div>
                                <span>Connected via Azure AD</span>
                            </div>
                        </section>
                    </div>

                    {/* Right Column: Notifications */}
                    <div className="settings-right-col">
                        <section className="s-card">
                            <div className="s-card-header">
                                <div className="s-card-header-icon purple">
                                    <Bell size={24} color="#8b5cf6" />
                                </div>
                                <h2>通知インテグレーション</h2>
                            </div>

                            {/* ── 通知トリガー説明 ── */}
                            <div style={{ marginBottom: '20px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Info size={13} color="#60a5fa" />
                                    <span style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>いつ・何が通知されるか</span>
                                </div>
                                <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                        <div style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 8, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <AlertTriangle size={14} color="#f59e0b" />
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '12px', fontWeight: 700, color: '#f59e0b', marginBottom: '2px' }}>マスタ未更新警告</p>
                                            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
                                                対応日の<strong style={{ color: 'rgba(255,255,255,0.6)' }}>前日</strong>になってもマスタ更新が未完了の号機を検出したとき。当日の作業準備を促す通知です。
                                            </p>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                        <div style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Clock size={14} color="#f87171" />
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '12px', fontWeight: 700, color: '#f87171', marginBottom: '2px' }}>長期未完了アラート</p>
                                            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
                                                対応日から<strong style={{ color: 'rgba(255,255,255,0.6)' }}>7日以上</strong>経過しても「対応済」になっていない号機を検出したとき。放置案件の早期対応を促します。
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="s-notification-grid">
                                {/* Target Roles */}
                                <div className="s-roles-panel">
                                    <h3 className="s-roles-title">
                                        <Users size={14} color="#3b82f6" /> 通知対象ロール
                                    </h3>
                                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginBottom: '10px', lineHeight: 1.5 }}>選択したロールのユーザーが通知を受け取ります。</p>
                                    <div className="s-role-items">
                                        {[
                                            { id: 'Admin', icon: <Shield size={18} />, color: '#ef4444', desc: '全通知を受信' },
                                            { id: 'Manager', icon: <Users size={18} />, color: '#8b5cf6', desc: 'アラート通知を受信' },
                                            { id: 'Editor', icon: <User size={18} />, color: '#3b82f6', desc: '担当案件の通知のみ' },
                                            { id: 'View', icon: <Lock size={18} />, color: '#64748b', desc: '通知なし（閲覧専用）' }
                                        ].map(role => {
                                            const isSelected = notificationSettings.targetUsers.includes(role.id);
                                            return (
                                                <div
                                                    key={role.id}
                                                    onClick={() => toggleTargetUser(role.id)}
                                                    className={`s-role-item ${isSelected ? 'selected' : ''}`}
                                                >
                                                    <div className="s-role-item-left">
                                                        <span style={{ color: isSelected ? role.color : '#64748b' }}>
                                                            {role.icon}
                                                        </span>
                                                        <div>
                                                            <span className={`s-role-item-name ${isSelected ? 'active' : 'inactive'}`}>
                                                                {role.id}
                                                            </span>
                                                            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', margin: 0 }}>{role.desc}</p>
                                                        </div>
                                                    </div>
                                                    <div className={`s-role-check ${isSelected ? 'checked' : ''}`}>
                                                        {isSelected && <Check size={12} color="#ffffff" />}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Delivery Channels */}
                                <div className="s-channels-col">
                                    <h3 className="s-roles-title">
                                        <Globe size={14} color="#10b981" /> 通知方法
                                    </h3>

                                    {/* ブラウザ通知 */}
                                    <div className="s-channel-card" style={{ marginBottom: '10px' }}>
                                        <div className="s-channel-top">
                                            <div className="s-channel-icon-box">
                                                <Send size={20} color="#3b82f6" />
                                            </div>
                                            <label className="switch">
                                                <input
                                                    type="checkbox"
                                                    checked={notificationSettings.pushEnabled}
                                                    onChange={async e => {
                                                        const enabled = e.target.checked;
                                                        if (enabled && typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
                                                            const perm = await Notification.requestPermission();
                                                            if (perm !== 'granted') return;
                                                        }
                                                        setNotificationSettings({ ...notificationSettings, pushEnabled: enabled });
                                                    }}
                                                />
                                                <span className="slider"></span>
                                            </label>
                                        </div>
                                        <div>
                                            <p className="s-channel-label">ブラウザ通知</p>
                                            <p className="s-channel-desc">OSのプッシュ通知としてデスクトップに表示。アプリを開いていなくても受信可能。</p>
                                            {typeof Notification !== 'undefined' && Notification.permission === 'denied' && (
                                                <p style={{ fontSize: '10px', color: '#f87171', marginTop: '6px' }}>
                                                    ⚠ ブラウザの通知が「ブロック」になっています。ブラウザ設定から許可してください。
                                                </p>
                                            )}
                                            {typeof Notification !== 'undefined' && Notification.permission === 'default' && (
                                                <button
                                                    type="button"
                                                    onClick={async () => { await Notification.requestPermission(); }}
                                                    style={{ marginTop: '6px', fontSize: '10px', padding: '3px 10px', borderRadius: '6px', border: '1px solid rgba(59,130,246,0.4)', background: 'rgba(59,130,246,0.1)', color: '#60a5fa', cursor: 'pointer' }}
                                                >
                                                    通知を許可する
                                                </button>
                                            )}
                                            {typeof Notification !== 'undefined' && Notification.permission === 'granted' && (
                                                <p style={{ fontSize: '10px', color: '#10b981', marginTop: '4px' }}>✓ 通知が許可されています</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* メール通知 */}
                                    <div className="s-channel-card">
                                        <div className="s-channel-top">
                                            <div className="s-channel-icon-box">
                                                <Mail size={20} color="#8b5cf6" />
                                            </div>
                                            <label className="switch">
                                                <input
                                                    type="checkbox"
                                                    checked={notificationSettings.emailEnabled}
                                                    onChange={e => setNotificationSettings({ ...notificationSettings, emailEnabled: e.target.checked })}
                                                />
                                                <span className="slider"></span>
                                            </label>
                                        </div>
                                        <div>
                                            <p className="s-channel-label">メール通知</p>
                                            <p className="s-channel-desc">対象ロールのユーザーのメールアドレスに通知を送信。Supabase Edge Function の設定が必要です。</p>
                                            {notificationSettings.emailEnabled && (
                                                <p style={{ fontSize: '10px', color: 'rgba(245,158,11,0.8)', marginTop: '6px' }}>
                                                    ⚠ メール送信にはSupabase Edge Functionの設定が必要です。
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="s-cloud-banner" style={{ marginTop: '10px' }}>
                                        <div className="s-cloud-header">
                                            <Check size={14} color="#3b82f6" />
                                            <span className="s-cloud-label">設定は自動保存されます</span>
                                        </div>
                                        <p className="s-cloud-text">ブラウザのlocalStorageに保存されるため、次回ログイン時も維持されます。</p>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            ) : (
                /* User Management Tab */
                <div>
                    <section className="s-card">
                        <div className="s-user-mgmt-header">
                            <div className="s-user-mgmt-title-area">
                                <div className="s-card-header-icon blue">
                                    <Users size={24} color="#3b82f6" />
                                </div>
                                <div className="s-user-mgmt-title-text">
                                    <h2>ユーザー＆権限管理</h2>
                                    <p>Profile & Role Management</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={() => setShowInvite(!showInvite)}
                                    className="s-refresh-btn"
                                    style={{ background: 'rgba(59,130,246,0.15)', borderColor: 'rgba(59,130,246,0.3)', color: '#60a5fa' }}
                                >
                                    <UserPlus size={14} style={{ marginRight: '4px' }} /> 追加
                                </button>
                                <button onClick={fetchProfiles} className="s-refresh-btn">更新</button>
                            </div>
                        </div>

                        {/* Invite Form */}
                        {showInvite && (
                            <div className="s-card" style={{ marginBottom: '1.5rem', padding: '1.25rem', background: 'rgba(59,130,246,0.05)', borderColor: 'rgba(59,130,246,0.15)' }}>
                                <h3 style={{ fontSize: '0.8rem', fontWeight: 800, color: '#ffffff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <UserPlus size={16} color="#60a5fa" /> 新規メンバー追加
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: '10px', alignItems: 'center' }}>
                                    <input
                                        type="text"
                                        placeholder="氏名"
                                        value={inviteName}
                                        onChange={e => setInviteName(e.target.value)}
                                        style={{
                                            background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '0.8rem',
                                            fontWeight: 600, outline: 'none'
                                        }}
                                    />
                                    <input
                                        type="email"
                                        placeholder="メールアドレス"
                                        value={inviteEmail}
                                        onChange={e => setInviteEmail(e.target.value)}
                                        style={{
                                            background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '0.8rem',
                                            fontWeight: 600, outline: 'none'
                                        }}
                                    />
                                    <RoleDropdown value={inviteRole} onChange={setInviteRole} />
                                    <button
                                        onClick={inviteUser}
                                        style={{
                                            padding: '10px 20px', background: 'linear-gradient(135deg, #3b82f6, #10b981)',
                                            border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 800,
                                            fontSize: '0.75rem', cursor: 'pointer', whiteSpace: 'nowrap'
                                        }}
                                    >
                                        追加
                                    </button>
                                </div>
                            </div>
                        )}

                        {loading ? (
                            <div className="s-loading">
                                <div className="s-spinner"></div>
                                <p className="s-loading-text">Loading Profiles...</p>
                            </div>
                        ) : fetchError ? (
                            <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
                                <div style={{ width: '48px', height: '48px', margin: '0 auto 1rem', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <span style={{ color: '#ef4444', fontSize: '1.5rem' }}>!</span>
                                </div>
                                <p style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.5rem' }}>プロフィール取得エラー</p>
                                <p style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '1.25rem', lineHeight: 1.6 }}>{fetchError}</p>
                                <button onClick={fetchProfiles} style={{ padding: '8px 20px', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '10px', color: '#60a5fa', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer' }}>再試行</button>
                            </div>
                        ) : (
                            <div className="s-table-wrapper">
                                <table className="s-table">
                                    <thead>
                                        <tr>
                                            <th>ユーザー</th>
                                            <th>メールアドレス</th>
                                            <th>現在のRole</th>
                                            <th style={{ textAlign: 'right' }}>アクション</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {allProfiles.map(p => (
                                            <tr key={p.id}>
                                                <td>
                                                    <div className="s-table-user-cell">
                                                        <div className="s-table-avatar">
                                                            {p.avatar_url ? (
                                                                <img src={p.avatar_url} alt="" />
                                                            ) : p.display_name?.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="s-table-username">{p.display_name || '---'}</div>
                                                            {p.group && <div className="s-table-user-sub">{p.group}</div>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="s-table-email">{p.email || 'N/A'}</span>
                                                </td>
                                                <td>
                                                    <span className={getRoleBadgeClass(p.dm_role)}>
                                                        {p.dm_role || 'View'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="s-actions-cell">
                                                        <RoleDropdown value={p.dm_role || 'View'} onChange={(v) => updateRole(p.id, v)} />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </div>
            )}
        </div>
    );
};

export default Settings;
