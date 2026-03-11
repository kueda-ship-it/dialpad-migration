import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { MOCK_PROJECTS } from '../utils/mockData';

const AppContext = createContext(undefined);

export const AppProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [licenseCount, setLicenseCount] = useState(() => {
        try { return parseInt(localStorage.getItem('dm_license_count') || '0', 10); } catch { return 0; }
    });

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
        fetchProjects();
    }, [fetchProjects]);
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
        const dbField = field === 'phone' ? 'phone_number' : field;
        await supabase.from('projects').update({ [dbField]: value }).eq('unit_id', id);
    };

    const toggleMasterUpdate = async (id) => {
        const project = projects.find(p => p.id === id);
        if (!project) return;
        const newValue = !project.master_update_done;
        setProjects(prev => prev.map(p => p.id === id ? { ...p, master_update_done: newValue } : p));
        await supabase.from('projects').update({ master_update_done: newValue }).eq('unit_id', id);
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

    // persist licenseCount
    useEffect(() => {
        localStorage.setItem('dm_license_count', licenseCount.toString());
    }, [licenseCount]);

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
            setLicenseCount,
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
