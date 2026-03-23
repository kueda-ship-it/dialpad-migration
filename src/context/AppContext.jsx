import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { MOCK_PROJECTS } from '../utils/mockData';

const AppContext = createContext(undefined);

export const AppProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [licenseCount, setLicenseCount] = useState(null);
    const [activeUsers, setActiveUsers] = useState([]);
    const licenseTimeoutRef = useRef(null);

    // AVATAR_CACHE_KEY をコンテキスト全体で共有
    const AVATAR_CACHE_KEY = 'dm_avatar_cache';

    // ユーザー情報のエンリッチメントとキャッシュ処理
    const enrichUser = useCallback(async (sessionUser) => {
        if (!sessionUser) {
            setUser(null);
            return;
        }

        const isUeda = sessionUser.user_metadata?.full_name?.includes('上田') || 
                        sessionUser.email?.includes('ueda') || 
                        sessionUser.email === 'k_ueda@fts.co.jp';
        
        // 1. キャッシュから即時取得
        let cachedData = { avatar: null, name: null, role: null };
        try {
            const cache = JSON.parse(localStorage.getItem(AVATAR_CACHE_KEY) || '{}');
            if (cache[sessionUser.id]) cachedData = cache[sessionUser.id];
        } catch { /* ignore */ }

        const initialUser = {
            ...sessionUser,
            full_name: cachedData.name || sessionUser.user_metadata?.full_name || sessionUser.email?.split('@')[0] || 'Unknown User',
            avatar_url: cachedData.avatar || sessionUser.user_metadata?.avatar_url || sessionUser.user_metadata?.picture || null,
            dm_role: cachedData.role || (isUeda ? 'Admin' : (sessionUser.user_metadata?.dm_role || 'Manager'))
        };

        setUser(initialUser);

        // 2. 非同期でプロファイル情報を取得して更新
        const fetchRemoteProfile = async () => {
            try {
                // DBのテーブル定義に合わせて full_name -> display_name に修正
                const { data } = await supabase.from('profiles').select('avatar_url, display_name, dm_role').eq('id', sessionUser.id).single();
                if (data) {
                    const cache = JSON.parse(localStorage.getItem(AVATAR_CACHE_KEY) || '{}');
                    cache[sessionUser.id] = {
                        avatar: data.avatar_url,
                        role: data.dm_role,
                        name: data.display_name,
                    };
                    localStorage.setItem(AVATAR_CACHE_KEY, JSON.stringify(cache));

                    setUser(prev => {
                        if (!prev) return prev;
                        // DBの値を優先的に適用
                        const next = { ...prev };
                        if (data.avatar_url) next.avatar_url = data.avatar_url;
                        if (data.dm_role)   next.dm_role = data.dm_role;
                        if (data.display_name) next.full_name = data.display_name;
                        return next;
                    });
                }
            } catch (e) {
                console.error('Profile fetch error:', e);
            }
        };

        fetchRemoteProfile();
    }, []);

    // Auth session handling
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            enrichUser(session?.user);
            setAuthLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            enrichUser(session?.user);
            setAuthLoading(false);
        });

        return () => subscription.unsubscribe();
    }, [enrichUser]);

    // Presence & Real-time Active Users
    useEffect(() => {
        if (!user) return;

        const channel = supabase.channel('online-users', {
            config: {
                presence: {
                    key: user.id,
                },
            },
        });

        channel
            .on('presence', { event: 'sync' }, () => {
                const newState = channel.presenceState();
                const users = [];
                for (const id in newState) {
                    // 自分自身を除外
                    if (id === user.id) continue;
                    
                    const presence = newState[id][0];
                    if (presence) users.push(presence);
                }
                setActiveUsers(users);
            })
            .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                console.log('Join:', key, newPresences);
            })
            .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
                console.log('Leave:', key, leftPresences);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        id: user.id,
                        full_name: user.full_name || 'Unknown',
                        avatar_url: user.avatar_url,
                        email: user.email,
                        online_at: new Date().toISOString(),
                    });
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    // Fetch license count from Supabase
    const fetchLicenseCount = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('system_settings')
                .select('value')
                .eq('key', 'license_pool')
                .single();
            if (error) throw error;
            if (data?.value?.total !== undefined) {
                setLicenseCount(data.value.total);
            } else {
                // Fallback to local
                const localStr = localStorage.getItem('dm_license_count');
                const local = localStr ? parseInt(localStr, 10) : 250; // Default to 250 if nothing found
                setLicenseCount(local);
            }
        } catch (err) {
            console.error('Error fetching license count:', err);
            const localStr = localStorage.getItem('dm_license_count');
            const local = localStr ? parseInt(localStr, 10) : 250;
            setLicenseCount(local);
        }
    }, []);

    // Real-time subscription for license count
    useEffect(() => {
        const channel = supabase
            .channel('system_settings_changes')
            .on('postgres_changes', { 
                event: 'UPDATE', 
                schema: 'public', 
                table: 'system_settings',
                filter: 'key=eq.license_pool'
            }, payload => {
                if (payload.new?.value?.total !== undefined) {
                    setLicenseCount(payload.new.value.total);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    useEffect(() => {
        if (!authLoading) {
            fetchLicenseCount();
        }
    }, [fetchLicenseCount, authLoading]);
    
    // Helper to format project data uniformly
    const formatProject = useCallback((p) => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const rawStatus = p.status || '未対応';
        const isFuture = p.support_date && new Date(String(p.support_date).replace(/-/g, '/')) > now;
        // 未来日付なのに対応済は論理矛盾 → 対応予定に正規化
        const effectiveStatus = (isFuture && rawStatus === '対応済') ? '対応予定' : rawStatus;
        
        return {
            ...p,
            id: p.unit_id || p.id, // Display ID (used by components)
            uuid: p.id,            // Keep original UUID for stable matching
            phone: p.phone_number || p.phone,
            status: effectiveStatus,
            address: p.address || '',
            lat: p.lat ?? null,
            lng: p.lng ?? null,
        };
    }, []);

    // Fetch projects from Supabase
    const fetchProjects = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('projects')
                .select('*')
                .order('id', { ascending: true });

            if (error) throw error;

            if (data && data.length > 0) {
                const formatted = data.map(formatProject);
                setProjects(formatted);
            } else {
                // Fallback to localStorage or mockData
                const savedProjects = localStorage.getItem('dialpad_projects');
                const initial = savedProjects ? JSON.parse(savedProjects) : MOCK_PROJECTS;
                setProjects(initial);

                // If Supabase is empty but we have data, we'll offer to sync later or just use local
                console.log('Supabase table is empty, using fallback data');
            }
        } catch (err) {
            console.error('Error fetching projects from Supabase:', err);
            // Fallback
            const savedProjects = localStorage.getItem('dialpad_projects');
            setProjects(savedProjects ? JSON.parse(savedProjects) : MOCK_PROJECTS);
        } finally {
            setLoading(false);
        }
    }, [formatProject]);

    // Real-time subscription for projects table
    useEffect(() => {
        console.log('Subscribing to projects realtime changes...');
        const channel = supabase
            .channel('projects_table_changes')
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'projects' 
            }, payload => {
                console.log('Realtime project change received:', payload.eventType, payload);
                if (payload.eventType === 'INSERT') {
                    const newProj = formatProject(payload.new);
                    setProjects(prev => {
                        // Check if already exists (optimistic update handle)
                        if (prev.some(p => p.uuid === newProj.uuid || p.id === newProj.id)) return prev;
                        return [newProj, ...prev];
                    });
                } else if (payload.eventType === 'UPDATE') {
                    const updated = formatProject(payload.new);
                    setProjects(prev => prev.map(p => (p.uuid === updated.uuid || p.id === updated.id) ? updated : p));
                } else if (payload.eventType === 'DELETE') {
                    // Use payload.old.id (UUID) as it's guaranteed in REPLICA IDENTITY FULL or PK
                    setProjects(prev => prev.filter(p => p.uuid !== payload.old.id && p.id !== payload.old.id));
                }
            })
            .subscribe((status) => {
                console.log('Projects realtime subscription status:', status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [formatProject]);

    useEffect(() => {
        if (!authLoading) {
            fetchProjects();
        }
    }, [fetchProjects, authLoading]);

    const [selectedIds, setSelectedIds] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [notificationSettings, setNotificationSettings] = useState(() => {
        try {
            const saved = localStorage.getItem('dm_notification_settings');
            if (saved) return JSON.parse(saved);
        } catch { /* ignore */ }
        return { targetUsers: ['Admin', 'Manager'], emailEnabled: false, pushEnabled: false };
    });

    // localStorageへ永続化
    useEffect(() => {
        try {
            localStorage.setItem('dm_notification_settings', JSON.stringify(notificationSettings));
        } catch { /* ignore */ }
    }, [notificationSettings]);

    // Generate automatic notifications based on project status and dates
    useEffect(() => {
        const newNotifications = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        projects.forEach(p => {
            if (!p.support_date) return;
            const sDate = new Date(String(p.support_date).replace(/-/g, '/'));
            sDate.setHours(0, 0, 0, 0);

            // 1. 前日未更新アラート: 対応日前日でマスタ未チェック
            if (sDate.getTime() === tomorrow.getTime() && !p.master_update_done) {
                newNotifications.push({
                    id: `warn-master-${p.id}`,
                    type: 'warning',
                    title: 'マスタ未更新警告',
                    message: `${p.name} の対応が明日ですが、マスタ更新が未完了です。`,
                    projectId: p.id,
                    date: new Date()
                });
            }

            // 3. 3日前リマインド
            const threeDaysLater = new Date(today);
            threeDaysLater.setDate(today.getDate() + 3);
            if (sDate.getTime() === threeDaysLater.getTime() && p.status !== '対応済') {
                newNotifications.push({
                    id: `remind-3d-${p.id}`,
                    type: 'info',
                    title: '3日前リマインド',
                    message: `${p.name} の対応日まで3日です。準備を確認してください。`,
                    projectId: p.id,
                    date: new Date()
                });
            }

            // 2. 7日未完了通知: 対応日から7日経過しても未完了
            const sevenDaysAgo = new Date(today);
            sevenDaysAgo.setDate(today.getDate() - 7);
            if (sDate.getTime() <= sevenDaysAgo.getTime() && p.status !== '対応済') {
                newNotifications.push({
                    id: `overdue-7d-${p.id}`,
                    type: 'error',
                    title: '長期未完了アラート',
                    message: `${p.name} は対応日から7日以上経過していますが、未完了です。`,
                    projectId: p.id,
                    date: new Date()
                });
            }
        });

        setNotifications(newNotifications);
    }, [projects]);

    // ブラウザPush通知の実行
    useEffect(() => {
        if (!notificationSettings.pushEnabled) return;
        if (typeof Notification === 'undefined') return;
        if (Notification.permission !== 'granted') return;
        if (!notifications.length) return;

        const todayKey = new Date().toDateString();
        notifications.forEach(n => {
            const sentKey = `dm_push_sent_${n.id}_${todayKey}`;
            if (sessionStorage.getItem(sentKey)) return;
            try {
                new Notification(n.title, {
                    body: n.message,
                    icon: '/app-icon.png',
                    badge: '/app-icon.png',
                });
                sessionStorage.setItem(sentKey, '1');
            } catch { /* ignore */ }
        });
    }, [notifications, notificationSettings.pushEnabled]);

    useEffect(() => {
        if (projects.length > 0) {
            localStorage.setItem('dialpad_projects', JSON.stringify(projects));
        }
    }, [projects]);

    const addProject = async (newProj) => {
        const id = newProj.unit_id || Math.floor(Math.random() * 1000000).toString();
        const newStatus = newProj.status || '未対応';
        const projectToAdd = {
            ...newProj,
            id,
            status: newStatus,
            master_update_done: newProj.master_update_done || false,
        };

        // Optimistic update
        setProjects(prev => [projectToAdd, ...prev]);

        // Supabase insert
        await supabase.from('projects').insert([{
            unit_id: id,
            name: newProj.name,
            address: newProj.address || '',
            phone_number: newProj.phone,
            maintenance_month: newProj.maintenance_month,
            locker_type: newProj.locker_type || '',
            line_type: newProj.line_type || '',
            status: newStatus,
            support_date: newProj.support_date ? newProj.support_date.replace(/\//g, '-') : null,
            master_update_done: newProj.master_update_done || false,
        }]);
    };

    const updateProjectStatus = async (id, status) => {
        const project = projects.find(p => p.id === id);
        console.log('Updating project status:', id, status, 'UUID:', project?.uuid);
        
        // Optimistic update
        setProjects(prev => prev.map(p => p.id === id ? { ...p, status } : p));
        
        const targetId = project?.uuid || null;
        if (targetId) {
            const { error } = await supabase.from('projects').update({ status }).eq('id', targetId);
            if (error) console.error('Error updating status:', error);
        } else {
            const { error } = await supabase.from('projects').update({ status }).eq('unit_id', id);
            if (error) console.error('Error updating status (fallback):', error);
        }
    };

    const updateProjectField = async (id, field, value) => {
        const project = projects.find(p => p.id === id);
        console.log('Updating project field:', id, field, value, 'UUID:', project?.uuid);

        // Optimistic update
        setProjects(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
        
        let dbValue = value;
        let dbField = field;
        
        if (field === 'support_date') {
            dbValue = value ? value.replace(/\//g, '-') : null;
        } else if (field === 'phone') {
            dbField = 'phone_number';
        }

        const targetId = project?.uuid || null;
        if (targetId) {
            const { error } = await supabase.from('projects').update({ [dbField]: dbValue }).eq('id', targetId);
            if (error) console.error('Error updating field:', error);
        } else {
            const { error } = await supabase.from('projects').update({ [dbField]: dbValue }).eq('unit_id', id);
            if (error) console.error('Error updating field (fallback):', error);
        }
    };

    const updateProject = async (updatedProject) => {
        const originalId = updatedProject.original_id || updatedProject.id;
        const project = projects.find(p => p.id === originalId);

        setProjects(prev => prev.map(p =>
            p.id === originalId ? { ...updatedProject, id: updatedProject.id, uuid: p.uuid } : p
        ));

        const targetId = project?.uuid || null;
        const updateData = {
            unit_id: updatedProject.id,
            name: updatedProject.name,
            address: updatedProject.address || '',
            phone_number: updatedProject.phone,
            maintenance_month: updatedProject.maintenance_month,
            locker_type: updatedProject.locker_type || '',
            line_type: updatedProject.line_type || '',
            status: updatedProject.status,
            support_date: updatedProject.support_date ? updatedProject.support_date.replace(/\//g, '-') : null,
            master_update_done: updatedProject.master_update_done || false,
        };

        if (targetId) {
            await supabase.from('projects').update(updateData).eq('id', targetId);
        } else {
            await supabase.from('projects').update(updateData).eq('unit_id', originalId);
        }
    };

    const toggleMasterUpdate = async (id) => {
        const project = projects.find(p => p.id === id);
        if (!project) return;
        const newValue = !project.master_update_done;
        
        // Optimistic UI update
        setProjects(prev => prev.map(p => p.id === id ? { ...p, master_update_done: newValue } : p));
        
        const targetId = project?.uuid || null;
        if (targetId) {
            const { error } = await supabase.from('projects').update({ master_update_done: newValue }).eq('id', targetId);
            if (error) console.error('Error updating master status:', error);
        } else {
            const { error } = await supabase.from('projects').update({ master_update_done: newValue }).eq('unit_id', id);
            if (error) console.error('Error updating master status:', error);
        }
    };

    const deleteProject = async (id) => {
        const project = projects.find(p => p.id === id);
        setProjects(prev => prev.filter(p => p.id !== id));
        
        const targetId = project?.uuid || null;
        if (targetId) {
            await supabase.from('projects').delete().eq('id', targetId);
        } else {
            await supabase.from('projects').delete().eq('unit_id', id);
        }
    };

    const toggleSelection = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const clearSelection = () => setSelectedIds([]);

    // persist licenseCount to localStorage + Supabase (debounced) whenever it changes
    useEffect(() => {
        if (licenseCount === null) return;
        localStorage.setItem('dm_license_count', licenseCount.toString());

        if (licenseTimeoutRef.current) clearTimeout(licenseTimeoutRef.current);
        licenseTimeoutRef.current = setTimeout(async () => {
            await supabase
                .from('system_settings')
                .upsert({ key: 'license_pool', value: { total: licenseCount } }, { onConflict: 'key' });
        }, 500);
    }, [licenseCount]);

    const updateLicenseCount = (newCountOrUpdater) => {
        setLicenseCount(newCountOrUpdater);
    };

    const licenseRemaining = useMemo(() => {
        if (!licenseCount || licenseCount <= 0) return null;
        const masterDoneCount = projects.filter(p => p.master_update_done).length;
        return licenseCount - masterDoneCount;
    }, [projects, licenseCount]);

    return (
        <AppContext.Provider value={{
            projects,
            setProjects,
            loading,
            fetchProjects,
            selectedIds,
            setSelectedIds,
            toggleSelection,
            clearSelection,
            updateProjectStatus,
            updateProjectField,
            updateProject,
            toggleMasterUpdate,
            addProject,
            deleteProject,
            notifications,
            setNotifications,
            notificationSettings,
            setNotificationSettings,
            user,
            setUser,
            authLoading,
            setAuthLoading,
            licenseCount,
            setLicenseCount: updateLicenseCount,
            licenseRemaining,
            activeUsers,
        }}>
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error('useApp must be used within AppProvider');
    return context;
};
