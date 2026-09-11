// profiles.dm_role は 'Admin' / 'admin' などケース揺れがあり得るため lowercase で比較する（employee-master と同じ方針）
export const normalizeRole = (role) => (role ? String(role).toLowerCase() : null);

export const hasRole = (role, ...allowed) => {
    const r = normalizeRole(role);
    return r !== null && allowed.some(a => a.toLowerCase() === r);
};

export const isAdminRole = (role) => hasRole(role, 'Admin');

export const canEditProjects = (role) => hasRole(role, 'Admin', 'Manager', 'Editor');
