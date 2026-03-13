import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
                // Supabase data exists
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                const formatted = data.map(p => {
                    const rawStatus = p.status || '未対応';
                    const isFuture = p.support_date && new Date(String(p.support_date).replace(/-/g, '/')) > now;
                    // 未来日付なのに対応済は論理矛盾 → 対応予定に正規化
                    const effectiveStatus = (isFuture && rawStatus === '対応済') ? '対応予定' : rawStatus;
                    return {
                        ...p,
                        id: p.unit_id || p.id, // Use unit_id as the displayed ID if available
                        phone: p.phone_number || p.phone,
                        status: effectiveStatus,
                        address: p.address || '',
                        lat: p.lat ?? null,
                        lng: p.lng ?? null,
                    };
                });
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
    }, []);

    useEffect(() => {
        if (!authLoading) {
            fetchProjects();
        }
    }, [fetchProjects, authLoading]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [notificationSettings, setNotificationSettings] = useState({
        targetUsers: ['admin', 'manager'], // Default notification targets
        emailEnabled: true,
        pushEnabled: true
    });

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
                    message: `号機:${p.unit_id} (${p.name}) の対応が明日ですが、マスタ更新が未完了です。`,
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
                    message: `号機:${p.unit_id} (${p.name}) は対応日から7日以上経過していますが、未完了です。`,
                    projectId: p.id,
                    date: new Date()
                });
            }
        });

        setNotifications(newNotifications);
    }, [projects]);

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
        setProjects(prev => prev.map(p => p.id === id ? { ...p, status } : p));
        await supabase.from('projects').update({ status }).eq('unit_id', id);
    };

    const updateProject = async (updatedProject) => {
        // original_id tracks the old unit_id before any rename
        const originalId = updatedProject.original_id || updatedProject.id;
        setProjects(prev => prev.map(p =>
            p.id === originalId ? { ...updatedProject, id: updatedProject.id } : p
        ));
        await supabase.from('projects').update({
            unit_id: updatedProject.id,          // allow unit_id rename
            name: updatedProject.name,
            address: updatedProject.address || '',
            phone_number: updatedProject.phone,
            maintenance_month: updatedProject.maintenance_month,
            locker_type: updatedProject.locker_type || '',
            line_type: updatedProject.line_type || '',
            status: updatedProject.status,
            support_date: updatedProject.support_date ? updatedProject.support_date.replace(/\//g, '-') : null,
            master_update_done: updatedProject.master_update_done || false,
        }).eq('unit_id', originalId);
    };

    const updateProjectField = async (id, field, value) => {
        setProjects(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
        
        let dbValue = value;
        let dbField = field;
        
        if (field === 'support_date') {
            // 日本語UIでは / 区切りだが DB は - 区切り。空文字は明確に null にする。
            dbValue = value ? value.replace(/\//g, '-') : null;
        } else if (field === 'phone') {
            dbField = 'phone_number';
        }

        const { error } = await supabase.from('projects').update({ [dbField]: dbValue }).eq('unit_id', id);
        if (error) console.error(`Error updating project field ${field}:`, error);
    };

    const toggleMasterUpdate = async (id) => {
        const project = projects.find(p => p.id === id);
        if (!project) return;
        const newValue = !project.master_update_done;
        // Optimistic UI update
        setProjects(prev => prev.map(p => p.id === id ? { ...p, master_update_done: newValue } : p));
        // Background DB sync
        supabase.from('projects').update({ master_update_done: newValue }).eq('unit_id', id).then(({ error }) => {
            if (error) console.error('Error updating master status:', error);
        });
    };

    const deleteProject = async (id) => {
        setProjects(prev => prev.filter(p => p.id !== id));
        await supabase.from('projects').delete().eq('unit_id', id);
    };

    const toggleSelection = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const clearSelection = () => setSelectedIds([]);

    // persist licenseCount to Supabase (debounced)
    const updateLicenseCount = (newCount) => {
        setLicenseCount(newCount);
        localStorage.setItem('dm_license_count', newCount.toString());

        if (licenseTimeoutRef.current) clearTimeout(licenseTimeoutRef.current);
        licenseTimeoutRef.current = setTimeout(async () => {
            await supabase
                .from('system_settings')
                .update({ value: { total: newCount } })
                .eq('key', 'license_pool');
        }, 500); // 500ms 停止後に送信
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

// eslint-disable-next-line react-refresh/only-export-components
export const useApp = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error('useApp must be used within AppProvider');
    return context;
};
