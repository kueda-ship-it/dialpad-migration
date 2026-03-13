import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { AnimatePresence, motion } from 'framer-motion'; // eslint-disable-line no-unused-vars
import {
    Search, Calendar, FileCheck,
    Check, Plus, X, ArrowUpDown, ArrowUp, ArrowDown, Edit, Info, ChevronDown, Trash2,
    MapPin, Hash, Cpu, CalendarDays, ShieldCheck, Settings2,
    Copy, Download, Minus, ChevronLeft, ChevronRight
} from 'lucide-react';

/* ─── ステータスカラー定義（システム共通） ──────────────────────────────── */
const STATUS_COLORS = {
    '対応済': { bg: 'rgba(16,185,129,0.13)', border: 'rgba(16,185,129,0.4)', text: '#10b981', dot: 'rgba(16,185,129,0.9)' },
    '対応予定': { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.38)', text: '#f59e0b', dot: 'rgba(245,158,11,0.9)' },
    '未対応': { bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.3)', text: '#94a3b8', dot: 'rgba(100,116,139,0.8)' },
    'リスケ': { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.32)', text: '#f87171', dot: 'rgba(239,68,68,0.9)' },
};

/* ─── ProjectRow (Memoized) ──────────────────────────────────────────────── */
const ProjectRow = React.memo(({
    project, isSelected, toggleSelection,
    updateProjectStatus, handleSupportDateChange, toggleMasterUpdate,
    openEditModal, openDetailModal,
    copyToClipboard, copiedId, isViewOnly, canInlineEdit
}) => {
    const rowClass =
        project.status === '対応済' ? 'row-completed' :
            project.status === '対応予定' ? 'row-planned' : '';

    const formatMaintenanceMonth = (month) => {
        if (!month) return '---';
        return month.toString().split(',').map(m => `${m.trim()}月`).join(', ');
    };

    return (
        <tr className={`tr-hover-v13 ${rowClass}`}>
            <td className="px-8 py-5 text-center border-b border-white/[0.025]">
                <input type="checkbox" className="checkbox-v5" checked={isSelected} onChange={() => toggleSelection(project.id)} />
            </td>
            <td className="px-8 py-5 border-b border-white/[0.025]">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="node-id-plain">{project.id}</span>
                    <button
                        onClick={e => { e.stopPropagation(); copyToClipboard(project.id, 'id-' + project.id); }}
                        title="号機IDをコピー"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', opacity: 0.4, transition: 'opacity 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '0.4'}
                    >
                        {copiedId === 'id-' + project.id
                            ? <Check size={11} style={{ color: '#10b981' }} />
                            : <Copy size={11} style={{ color: 'rgba(255,255,255,0.6)' }} />
                        }
                    </button>
                </div>
            </td>
            <td className="px-8 py-5 border-b border-white/[0.025]">
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#fff', letterSpacing: '0.02em' }}>{project.name}</div>
                        <button
                            onClick={e => { e.stopPropagation(); copyToClipboard(project.name, 'name-' + project.id); }}
                            title="物件名をコピー"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', opacity: 0.4, transition: 'opacity 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                            onMouseLeave={e => e.currentTarget.style.opacity = '0.4'}
                        >
                            {copiedId === 'name-' + project.id
                                ? <Check size={11} style={{ color: '#10b981' }} />
                                : <Copy size={11} style={{ color: 'rgba(255,255,255,0.6)' }} />
                            }
                        </button>
                    </div>
                    {project.address && (
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '4px', fontWeight: 500 }}>{project.address}</div>
                    )}
                </div>
            </td>
            <td className="px-8 py-5 border-b border-white/[0.025] nowrap-v12 text-center">
                <span style={{ fontSize: '11px', fontWeight: 800, fontFamily: 'Outfit, monospace', letterSpacing: '0.1em', color: 'rgba(0,242,255,0.7)' }}>{project.phone || '---'}</span>
            </td>
            <td className="px-8 py-5 border-b border-white/[0.025] nowrap-v12 text-center">
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.45)' }}>{formatMaintenanceMonth(project.maintenance_month)}</span>
            </td>
            <td className="px-8 py-5 border-b border-white/[0.025] text-center">
                <GlassDropdown 
                    value={project.status} 
                    onChange={(val) => updateProjectStatus(project.id, val)} 
                    options={['未対応', '対応予定', '対応済', 'リスケ']} 
                    disabled={!canInlineEdit} 
                    useStatusColor 
                    isWarning={project.status === '対応予定' && !project.support_date}
                />
            </td>
            <td className="p-5 border-b border-white/[0.02] text-center">
                <div className="inline-flex items-center rounded-xl px-4 py-2.5 transition-all duration-300 group/date relative min-w-[145px] justify-center" style={{ background: STATUS_COLORS[project.status]?.bg || 'rgba(255,255,255,0.02)', border: `1px solid ${STATUS_COLORS[project.status]?.border || 'rgba(255,255,255,0.05)'}` }}>
                    <Calendar size={14} style={{ color: STATUS_COLORS[project.status]?.text || 'var(--primary)', opacity: 0.6 }} className="mr-3" />
                    {canInlineEdit ? (
                        <input type="date" className="bg-transparent border-none text-[13px] font-black outline-none cursor-pointer [color-scheme:dark] date-input-v17" style={{ color: STATUS_COLORS[project.status]?.text || '#fff' }} value={project.support_date ? project.support_date.replace(/\//g, '-') : ''} onChange={(e) => handleSupportDateChange(project, e.target.value)} />
                    ) : (
                        <span className="text-[13px] font-black font-mono tracking-widest" style={{ color: STATUS_COLORS[project.status]?.text || 'rgba(255,255,255,0.3)' }}>{project.support_date || '----/--/--'}</span>
                    )}
                </div>
            </td>
            <td className="px-5 py-5 border-b border-white/[0.025]">
                <div className="flex justify-center">
                    <button
                        onClick={(e) => { e.stopPropagation(); !isViewOnly && toggleMasterUpdate(project.id); }}
                        className={`btn-square-v9 flex items-center justify-center transition-all ${project.master_update_done
                            ? 'border-[#a855f7]/80 bg-[#a855f7]/05 text-[#a855f7] scale-105'
                            : 'bg-white/5 text-white/20 border-white/5 hover:bg-white/10 hover:text-white/40'}`}
                        style={{
                            width: '42px', height: '42px', borderRadius: '12px',
                            filter: project.master_update_done ? 'drop-shadow(0 0 5px rgba(168, 85, 247, 0.6))' : 'none',
                            boxShadow: project.master_update_done ? 'inset 0 0 10px rgba(168, 85, 247, 0.3)' : 'none'
                        }}
                        disabled={isViewOnly}
                    >
                        <FileCheck
                            size={17}
                            style={{
                                color: project.master_update_done ? '#c084fc' : undefined,
                                filter: project.master_update_done
                                    ? 'drop-shadow(0 0 2px rgba(192, 132, 252, 0.95)) drop-shadow(0 0 6px rgba(168, 85, 247, 0.4))'
                                    : 'none'
                            }}
                        />
                    </button>
                </div>
            </td>
            <td className="px-5 py-5 border-b border-white/[0.025]">
                <div className="flex items-center justify-end gap-2">
                    <button className="btn-square-v9 flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/60 transition-colors" style={{ width: '38px', height: '38px', borderRadius: '10px' }} onClick={(e) => { e.stopPropagation(); openEditModal(project); }} disabled={isViewOnly}><Edit size={14} /></button>
                    <button className="btn-square-v9 flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/60 transition-colors" style={{ width: '38px', height: '38px', borderRadius: '10px' }} onClick={(e) => { e.stopPropagation(); openDetailModal(project); }}><Info size={14} /></button>
                </div>
            </td>
        </tr>
    );
});


/* ─── GlassDropdown ─────────────────────────────────────────────────────── */
const GlassDropdown = ({ value, onChange, options, labelPrefix = '', disabled = false, useStatusColor = false, isWarning = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [dropUp, setDropUp] = useState(false);
    const triggerRef = useRef(null);
    const sc = useStatusColor ? STATUS_COLORS[value] : null;
    const textColor = isWarning ? '#ef4444' : (sc ? sc.text : undefined);

    const handleToggle = useCallback(() => {
        if (disabled) return;
        if (!isOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setDropUp(rect.bottom > window.innerHeight * 0.55);
        }
        setIsOpen(prev => !prev);
    }, [disabled, isOpen]);

    const panelStyle = dropUp
        ? { top: 'auto', bottom: 'calc(100% + 6px)' }
        : {};

    const motionProps = dropUp
        ? { initial: { opacity: 0, y: 8, scale: 0.96 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: 8, scale: 0.96 } }
        : { initial: { opacity: 0, y: -8, scale: 0.96 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: -8, scale: 0.96 } };

    return (
        <div className="motion-dropdown-container-v13">
            <div
                ref={triggerRef}
                className={`motion-select-trigger-v13 active-click ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={sc ? { background: sc.bg, borderColor: sc.border, color: textColor } : { color: textColor }}
                onClick={handleToggle}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {sc && <div style={{ width: 6, height: 6, borderRadius: '50%', background: sc.dot, boxShadow: `0 0 6px ${sc.dot}`, flexShrink: 0 }} />}
                    <span>{labelPrefix}{value}</span>
                </div>
                <ChevronDown size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </div>
            <AnimatePresence>
                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-[99]" onClick={() => setIsOpen(false)} />
                        <motion.div
                            {...motionProps}
                            transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
                            className="motion-select-panel-v13"
                            style={panelStyle}
                        >
                            {options.map((opt) => {
                                const optSc = useStatusColor ? STATUS_COLORS[opt] : null;
                                return (
                                    <div
                                        key={opt}
                                        className={`motion-option-v13 ${value === opt ? 'selected' : ''}`}
                                        style={optSc ? { color: value === opt ? optSc.text : undefined } : {}}
                                        onClick={() => { onChange(opt); setIsOpen(false); }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {optSc && <div style={{ width: 6, height: 6, borderRadius: '50%', background: optSc.dot, flexShrink: 0 }} />}
                                            {opt}
                                        </div>
                                    </div>
                                );
                            })}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

/* ─── SortIcon ──────────────────────────────────────────────────────────── */
const SortIcon = ({ columnKey, sortConfig }) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown size={12} className="inline ml-1 opacity-20" />;
    return sortConfig.direction === 'asc'
        ? <ArrowUp size={12} className="inline ml-1 text-primary" />
        : <ArrowDown size={12} className="inline ml-1 text-primary" />;
};

/* ─── FormField helper ──────────────────────────────────────────────────── */
const Field = ({ label, required, children }) => (
    <div className="space-y-2">
        <label style={{
            fontSize: '9px', fontWeight: 800, color: 'rgba(255,255,255,0.3)',
            textTransform: 'uppercase', letterSpacing: '0.18em', display: 'flex', alignItems: 'center', gap: '6px'
        }}>
            {label}
            {required && <span style={{ color: '#f87171', fontSize: '10px' }}>*</span>}
        </label>
        {children}
    </div>
);

const inputStyle = {
    width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px', padding: '12px 16px', fontSize: '13px', color: '#fff',
    outline: 'none', fontFamily: 'Outfit, sans-serif', fontWeight: 600,
    transition: 'border-color 0.2s',
};

/* ─── ProjectList ───────────────────────────────────────────────────────── */
const ProjectList = () => {
    const { 
        projects, setProjects,
        updateProjectStatus: originalUpdateProjectStatus, 
        updateProjectField, toggleMasterUpdate, 
        selectedIds, setSelectedIds, toggleSelection,
        licenseCount, licenseRemaining, setLicenseCount,
        user
    } = useApp();

    const [searchTerm, setSearchTerm] = useState('');

    const updateProjectStatus = useCallback((id, status) => {
        const project = projects.find(p => p.id === id);
        if (status === '対応済') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const hasDate = !!project?.support_date;
            const pDate = hasDate ? new Date(project.support_date.replace(/-/g, '/')) : null;
            if (pDate) pDate.setHours(0, 0, 0, 0);

            if (!hasDate) {
                if (!window.confirm('対応日が設定されていませんが、対応済に設定してよろしいですか？')) return;
            } else if (pDate.getTime() < today.getTime()) {
                if (!window.confirm('対応日が過去の日付ですが、対応済に設定してよろしいですか？')) return;
            }
        }
        originalUpdateProjectStatus(id, status);
    }, [originalUpdateProjectStatus, projects]);

    const isViewOnly = user?.dm_role === 'View';
    const isEditor = user?.dm_role === 'Editor';
    const canInlineEdit = !isViewOnly && !isEditor;
    const [statusFilter, setStatusFilter] = useState('すべて');
    const [masterFilter, setMasterFilter] = useState('すべて');
    const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'asc' });

    /* ─── Long Press Hook ── */
    const useLongPress = (callback, ms = 100) => {
        const timerRef = useRef(null);
        const intervalRef = useRef(null);

        const stop = useCallback(() => {
            if (timerRef.current) clearTimeout(timerRef.current);
            if (intervalRef.current) clearInterval(intervalRef.current);
        }, []);

        const start = useCallback(() => {
            callback(); // 初期クリック分
            timerRef.current = setTimeout(() => {
                intervalRef.current = setInterval(() => {
                    callback();
                }, ms);
            }, 500); // 500ms長押しで連続増減開始
        }, [callback, ms]);

        useEffect(() => {
            return stop;
        }, [stop]);

        return {
            onMouseDown: start,
            onMouseUp: stop,
            onMouseLeave: stop,
            onTouchStart: start,
            onTouchEnd: stop,
        };
    };

    const pressMinus = useLongPress(() => setLicenseCount(c => Math.max(0, c - 1)));
    const pressPlus = useLongPress(() => setLicenseCount(c => c + 1));


    /* ─── Modals ── */
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState({
        id: '',
        name: '',
        address: '',
        phone: '',
        locker_type: '',
        maintenance_month: '',
        program_version: '',
        status: '未対応',
        support_date: '',
        master_update_done: false
    });
    const [detailProject, setDetailProject] = useState(null);

    /* ─── New project form ── */
    const emptyNew = { unit_id: '', name: '', phone: '', locker_type: '', maintenance_month: '', status: '未対応', support_date: '', master_update_done: false };
    const [newProject, setNewProject] = useState(emptyNew);

    /* ─── Sort ── */
    const handleSort = (key) => {
        setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
    };

    const sortedProjects = useMemo(() => {
        const list = [...projects];
        list.sort((a, b) => {
            if (sortConfig.key === 'id') {
                const nA = parseInt(a.id, 10) || 0;
                const nB = parseInt(b.id, 10) || 0;
                return sortConfig.direction === 'asc' ? nA - nB : nB - nA;
            }
            if (sortConfig.key === 'support_date') {
                const dA = a.support_date ? new Date(a.support_date.replace(/-/g, '/')) : new Date(0);
                const dB = b.support_date ? new Date(b.support_date.replace(/-/g, '/')) : new Date(0);
                return sortConfig.direction === 'asc' ? dA - dB : dB - dA;
            }
            if (sortConfig.key === 'master_update_done') {
                return sortConfig.direction === 'asc'
                    ? (a[sortConfig.key] ? 1 : 0) - (b[sortConfig.key] ? 1 : 0)
                    : (b[sortConfig.key] ? 1 : 0) - (a[sortConfig.key] ? 1 : 0);
            }
            if (sortConfig.key === 'maintenance_month') {
                const getFirstMonth = (m) => {
                    if (!m) return 99;
                    const match = m.toString().match(/\d+/);
                    return match ? parseInt(match[0], 10) : 99;
                };
                const mA = getFirstMonth(a.maintenance_month);
                const mB = getFirstMonth(b.maintenance_month);
                return sortConfig.direction === 'asc' ? mA - mB : mB - mA;
            }
            const vA = a[sortConfig.key] || '', vB = b[sortConfig.key] || '';
            return sortConfig.direction === 'asc' ? vA.localeCompare(vB) : vB.localeCompare(vA);
        });
        return list;
    }, [projects, sortConfig]);

    const filteredProjects = useMemo(() => sortedProjects.filter(p => {
        const t = searchTerm.toLowerCase();
        const matchSearch = p.id?.toLowerCase().includes(t) || p.name?.toLowerCase().includes(t) || p.address?.toLowerCase().includes(t) || p.phone?.includes(t) || (p.maintenance_month?.toString().split(',').map(x => `${x.trim()}月`).join(', ').toLowerCase().includes(t) ?? false);
        const matchStatus = statusFilter === 'すべて' || p.status === statusFilter;
        const matchMaster = masterFilter === 'すべて' || (masterFilter === '未完了' ? !p.master_update_done : p.master_update_done);
        return matchSearch && matchStatus && matchMaster;
    }), [sortedProjects, searchTerm, statusFilter, masterFilter]);

    /* ─── License stats ── */
    const masterDoneCount = useMemo(() => projects.filter(p => p.master_update_done).length, [projects]);
    // const licenseRemaining = licenseCount > 0 ? licenseCount - masterDoneCount : null; // This is now from useApp

    /* ─── Pagination ── */
    const PAGE_SIZE = 50;
    const [currentPage, setCurrentPage] = useState(1);
    const totalPages = Math.ceil(filteredProjects.length / PAGE_SIZE);
    const pagedProjects = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE;
        return filteredProjects.slice(start, start + PAGE_SIZE);
    }, [filteredProjects, currentPage]);

    // フィルター変更時はページ1に戻す
    React.useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter, masterFilter]);

    /* ─── CSV Export ── */
    const exportCSV = () => {
        const BOM = '﻿';
        const headers = ['号機ID', '物件名', '住所', '電話番号', 'ステータス', 'メンテ月', '対応日', 'マスタ更新', 'ロッカータイプ', '備考'];
        const rows = filteredProjects.map(p => [
            p.id, p.name, p.address || '', p.phone || '',
            p.status || '', p.maintenance_month || '', p.support_date || '',
            p.master_update_done ? '完了' : '未完了',
            p.locker_type || '', p.notes || '',
        ]);
        const csv = BOM + [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `projects_${new Date().toISOString().slice(0,10)}.csv`;
        a.click(); URL.revokeObjectURL(url);
    };

    /* ─── Copy to clipboard ── */
    const [copiedId, setCopiedId] = useState(null);
    const copyToClipboard = (text, key) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedId(key);
            setTimeout(() => setCopiedId(null), 1500);
        });
    };

    /* ─── Formatters ── */

    const formatMaintenanceMonth = (month) => {
        if (!month) return '---';
        return month.toString().split(',').map(m => `${m.trim()}月`).join(', ');
    };

    /* ─── Handlers ── */
    const handleAddSubmit = (e) => {
        e.preventDefault();
        addProject(newProject);
        setIsAddModalOpen(false);
        setNewProject(emptyNew);
    };

    const handleEditSubmit = (e) => {
        e.preventDefault();
        if (!editingProject || !editingProject.id) return;
        updateProject(editingProject);
        setIsEditModalOpen(false);
    };

    const openEditModal = (project) => {
        if (!project) return;
        setEditingProject({
            ...project,
            original_id: project.id,
            id: project.id || '',
            name: project.name || '',
            address: project.address || '',
            phone: project.phone || '',
            locker_type: project.locker_type || '',
            maintenance_month: project.maintenance_month || '',
            program_version: project.program_version || '',
            status: project.status || '未対応',
            support_date: project.support_date || '',
            master_update_done: !!project.master_update_done
        });
        setIsEditModalOpen(true);
    };

    const openDetailModal = (project) => {
        setDetailProject(project);
        setIsDetailModalOpen(true);
    };

    /* support_date 変更時：将来日付 & 未対応 → 対応予定に自動設定 */
    const handleSupportDateChange = (project, rawValue) => {
        // 完了済み案件の日付変更時に警告を表示
        if (project.status === '対応済') {
            const ok = window.confirm('対応済みの案件の日付を変更しますか？');
            if (!ok) return;
        }

        const newDate = rawValue.replace(/-/g, '/');
        updateProjectField(project.id, 'support_date', newDate);
        if (rawValue && project.status === '未対応') {
            const selected = new Date(rawValue);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (selected >= today) {
                updateProjectStatus(project.id, '対応予定');
            }
        }
    };

    return (
        <div className="w-full relative pb-20">
            <div className="mesh-bg-v13" />

            {/* ─── Filter Panel (Sticky beneath Global Header) ────────── */}
            <div className="filter-panel-sticky">
                <div className="glass-panel p-5">
                    <div className="flex flex-wrap items-center gap-4">
                        {/* 検索 */}
                        <div className="flex-[3] search-container-v7">
                            <Search size={18} className="text-primary opacity-60 ml-2 mr-4" />
                            <input
                                type="text"
                                placeholder="SEARCH BY NODE ID, NAME, OR ADDRESS..."
                                className="input-v7 uppercase tracking-widest placeholder:opacity-30"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                autoComplete="off" spellCheck="false"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')} className="btn-clear-v12 mr-2"
                                ><X size={14} /></button>
                            )}
                        </div>

                        {/* Result Count Badge - Richer Design */}
                        <div className="flex items-center gap-4 px-6 py-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex-shrink-0 relative overflow-hidden group/match"
                             style={{ boxShadow: '0 4px 20px -5px rgba(59,130,246,0.15), inset 0 0 15px rgba(255,255,255,0.01)' }}>
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover/match:opacity-100 transition-opacity duration-700" />
                            <div className="flex flex-col items-start leading-none">
                                <span className="text-[8px] font-black text-white/25 uppercase tracking-[0.25em] mb-1">MATCHED RESULTS</span>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-[20px] font-black text-blue-400 font-mono tracking-tighter" style={{ textShadow: '0 0 15px rgba(96,165,250,0.3)' }}>{filteredProjects.length}</span>
                                    <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Nodes</span>
                                </div>
                            </div>
                        </div>

                        {/* Clear Selection Button */}
                        <AnimatePresence>
                            {selectedIds.length > 0 && (
                                <motion.button
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    onClick={() => setSelectedIds([])}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '8px',
                                        padding: '10px 18px', borderRadius: '14px',
                                        background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                                        color: '#f87171', fontSize: '11px', fontWeight: 900,
                                        letterSpacing: '0.1em', textTransform: 'uppercase',
                                        boxShadow: '0 4px 15px rgba(239,68,68,0.1)'
                                    }}
                                    className="active-click group"
                                >
                                    <X size={14} className="group-hover:rotate-90 transition-transform duration-300" />
                                    <span>Clear Selection ({selectedIds.length})</span>
                                </motion.button>
                            )}
                        </AnimatePresence>

                        <GlassDropdown labelPrefix="STATUS: " value={statusFilter} onChange={setStatusFilter} options={['すべて', '未対応', '対応予定', '対応済', 'リスケ']} />
                        <GlassDropdown labelPrefix="MASTER: " value={masterFilter} onChange={setMasterFilter} options={['すべて', '未完了', '完了済み']} />

                        {/* ライセンス数設定（Admin/Manager のみ） */}
                        {!isViewOnly && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                background: licenseRemaining !== null && licenseRemaining <= 10
                                    ? 'rgba(239,68,68,0.08)' : 'rgba(59,130,246,0.06)',
                                border: `1px solid ${licenseRemaining !== null && licenseRemaining <= 10 ? 'rgba(239,68,68,0.25)' : 'rgba(59,130,246,0.15)'}`,
                                borderRadius: '14px', padding: '5px 10px 5px 12px', flexShrink: 0,
                                backdropFilter: 'blur(8px)',
                            }}>
                                <ShieldCheck size={13} style={{ color: licenseRemaining !== null && licenseRemaining <= 10 ? '#f87171' : '#60a5fa', flexShrink: 0 }} />
                                <span style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap', marginLeft: '2px' }}>LICENSE</span>
                                <button
                                    {...pressMinus}
                                    style={{
                                        width: '24px', height: '24px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
                                        background: 'rgba(255,255,255,0.05)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: 'rgba(255,255,255,0.5)', transition: 'all 0.15s', flexShrink: 0,
                                        userSelect: 'none', 
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; if(pressMinus.onMouseLeave) pressMinus.onMouseLeave(); }}
                                ><Minus size={11} /></button>
                                <span 
                                    onClick={() => {
                                        if (isViewOnly) return;
                                        const newVal = window.prompt('新しいライセンス総数を入力してください', licenseCount);
                                        if (newVal !== null && !isNaN(parseInt(newVal))) {
                                            setLicenseCount(parseInt(newVal));
                                        }
                                    }}
                                    style={{
                                        minWidth: '36px', textAlign: 'center', fontSize: '14px', fontWeight: 900,
                                        fontFamily: 'Outfit, monospace', letterSpacing: '0.05em',
                                        color: licenseRemaining !== null && licenseRemaining <= 10 ? '#f87171' : '#60a5fa',
                                        lineHeight: 1,
                                        userSelect: 'none',
                                        cursor: isViewOnly ? 'default' : 'pointer'
                                    }}
                                    title={isViewOnly ? "" : "クリックして直接編集"}
                                >{licenseCount || 0}</span>
                                <button
                                    {...pressPlus}
                                    style={{
                                        width: '24px', height: '24px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
                                        background: 'rgba(255,255,255,0.05)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: 'rgba(255,255,255,0.5)', transition: 'all 0.15s', flexShrink: 0,
                                        userSelect: 'none',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; if(pressPlus.onMouseLeave) pressPlus.onMouseLeave(); }}
                                ><Plus size={11} /></button>
                                {licenseCount > 0 && licenseRemaining !== null && (
                                    <span style={{ fontSize: '10px', fontWeight: 700, color: licenseRemaining <= 10 ? '#f87171' : 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap', borderLeft: '1px solid rgba(255,255,255,0.08)', paddingLeft: '8px', marginLeft: '2px' }}>
                                        残{licenseRemaining}
                                    </span>
                                )}
                            </div>
                        )}

                        {/* CSV出力 */}
                        <button
                            onClick={exportCSV}
                            title="CSV出力"
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                padding: '8px 14px', borderRadius: '12px', cursor: 'pointer',
                                background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)',
                                color: '#10b981', fontSize: '11px', fontWeight: 800,
                                letterSpacing: '0.06em', transition: 'all 0.2s', flexShrink: 0,
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.15)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.07)'; }}
                        >
                            <Download size={13} />
                            CSV
                        </button>
                        <button
                            className="btn-add-rich-v10 group flex-shrink-0 ml-auto"
                            onClick={() => !isViewOnly && setIsAddModalOpen(true)}
                            disabled={isViewOnly}
                        >
                            <Plus size={18} />
                            <span>Create Node</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* ─── Table ───────────────────────────────────────────────── */}
            <main className="relative z-10 px-8 mt-8">
                <div className="overflow-hidden rounded-2xl border border-white/[0.04]">
                    <div className="glass-panel-v13 px-8 pb-8 pt-4">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-separate border-spacing-0">
                                <thead>
                                    <tr>
                                        <th className="px-8 py-10 w-16 text-center border-b border-white/[0.08]" style={{ verticalAlign: 'middle' }}>
                                            <Check size={13} className="mx-auto opacity-20" />
                                        </th>
                                        <th className="px-8 py-10 w-[100px] border-b border-white/[0.08] cursor-pointer th-label nowrap-v12" style={{ verticalAlign: 'middle' }} onClick={() => handleSort('id')}>
                                            号機 <SortIcon columnKey="id" sortConfig={sortConfig} />
                                        </th>
                                        <th className="px-8 py-10 border-b border-white/[0.08] cursor-pointer th-label nowrap-v12" style={{ verticalAlign: 'middle' }} onClick={() => handleSort('name')}>
                                            物件名 <SortIcon columnKey="name" sortConfig={sortConfig} />
                                        </th>
                                        <th className="px-8 py-10 w-[180px] border-b border-white/[0.08] cursor-pointer th-label nowrap-v12 text-center" style={{ verticalAlign: 'middle' }} onClick={() => handleSort('phone')}>
                                            電話番号 <SortIcon columnKey="phone" sortConfig={sortConfig} />
                                        </th>
                                        <th className="px-8 py-10 w-[120px] border-b border-white/[0.08] cursor-pointer th-label nowrap-v12 text-center" style={{ verticalAlign: 'middle' }} onClick={() => handleSort('maintenance_month')}>
                                            メンテ月 <SortIcon columnKey="maintenance_month" sortConfig={sortConfig} />
                                        </th>
                                        <th className="px-8 py-10 w-[165px] border-b border-white/[0.08] cursor-pointer th-label nowrap-v12 text-center" style={{ verticalAlign: 'middle' }} onClick={() => handleSort('status')}>
                                            ステータス <SortIcon columnKey="status" sortConfig={sortConfig} />
                                        </th>
                                        <th className="px-8 py-10 w-[185px] border-b border-white/[0.08] cursor-pointer th-label nowrap-v12 text-center" style={{ verticalAlign: 'middle' }} onClick={() => handleSort('support_date')}>対応日 <SortIcon columnKey="support_date" sortConfig={sortConfig} /></th>
                                        <th className="px-8 py-10 w-[116px] border-b border-white/[0.08] th-label nowrap-v12 text-center" style={{ verticalAlign: 'middle' }}>マスタ更新</th>
                                        <th className="px-8 py-10 border-b border-white/[0.08]" style={{ verticalAlign: 'middle' }} />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.01]">
                                    {pagedProjects.map((project) => (
                                        <ProjectRow
                                            key={project.id}
                                            project={project}
                                            isSelected={selectedIds.includes(project.id)}
                                            toggleSelection={toggleSelection}
                                            updateProjectStatus={updateProjectStatus}
                                            handleSupportDateChange={handleSupportDateChange}
                                            toggleMasterUpdate={toggleMasterUpdate}
                                            openEditModal={openEditModal}
                                            openDetailModal={openDetailModal}
                                            copyToClipboard={copyToClipboard}
                                            copiedId={copiedId}
                                            isViewOnly={isViewOnly}
                                            canInlineEdit={canInlineEdit}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>
            {/* ─── Pagination ──────────────────────────────────────── */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '20px 0' }}>
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '7px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: currentPage === 1 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.7)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: '11px', fontWeight: 700, transition: 'all 0.15s' }}
                    ><ChevronLeft size={14} /></button>

                    {Array.from({ length: Math.min(totalPages, 9) }, (_, i) => {
                        const page = totalPages <= 9 ? i + 1 : (
                            currentPage <= 5 ? i + 1 :
                            currentPage >= totalPages - 4 ? totalPages - 8 + i :
                            currentPage - 4 + i
                        );
                        return (
                            <button key={page} onClick={() => setCurrentPage(page)}
                                style={{ minWidth: '34px', height: '34px', borderRadius: '10px', border: page === currentPage ? '1px solid rgba(99,102,241,0.6)' : '1px solid rgba(255,255,255,0.07)', background: page === currentPage ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.03)', color: page === currentPage ? '#a5b4fc' : 'rgba(255,255,255,0.45)', cursor: 'pointer', fontSize: '11px', fontWeight: page === currentPage ? 900 : 600, transition: 'all 0.15s' }}
                            >{page}</button>
                        );
                    })}

                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '7px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: currentPage === totalPages ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.7)', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontSize: '11px', fontWeight: 700, transition: 'all 0.15s' }}
                    ><ChevronRight size={14} /></button>

                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', marginLeft: '8px', fontWeight: 600 }}>
                        {(currentPage - 1) * 50 + 1}–{Math.min(currentPage * 50, filteredProjects.length)} / {filteredProjects.length} 件
                    </span>
                </div>
            )}

            {/* ─── Create Node Modal ───────────────────────────────────── */}
            {createPortal(
            <AnimatePresence>
                {isAddModalOpen && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setIsAddModalOpen(false)} />
                        <motion.div initial={{ scale: 0.92, opacity: 0, y: 24 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.92, opacity: 0, y: 24 }}
                            transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
                            className="glass-panel w-full max-w-2xl relative z-[1001]" style={{ padding: '2.5rem' }}>

                            {/* Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                                <div>
                                    <h2 style={{ fontSize: '28px', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>
                                        INITIALIZE <span style={{ color: '#3b82f6' }}>NODE</span>
                                    </h2>
                                    <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.18em', marginTop: '6px' }}>
                                        新規案件の登録
                                    </p>
                                </div>
                                <button className="icon-btn hover:bg-white/10" onClick={() => setIsAddModalOpen(false)}><X size={18} /></button>
                            </div>

                            <form onSubmit={handleAddSubmit}>
                                {/* 必須フィールド */}
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <div style={{ fontSize: '9px', fontWeight: 800, color: 'rgba(59,130,246,0.6)', textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: '16px', borderBottom: '1px solid rgba(59,130,246,0.15)', paddingBottom: '8px' }}>
                                        Required Fields
                                    </div>
                                    <div className="grid grid-cols-2 gap-5">
                                        <Field label="号機 (Node ID)" required>
                                            <input
                                                type="text" required placeholder="例: 1234"
                                                style={inputStyle}
                                                value={newProject.unit_id}
                                                onChange={e => setNewProject({ ...newProject, unit_id: e.target.value })}
                                            />
                                        </Field>
                                        <Field label="物件名" required>
                                            <input
                                                type="text" required placeholder="例: ○○マンション"
                                                style={inputStyle}
                                                value={newProject.name}
                                                onChange={e => setNewProject({ ...newProject, name: e.target.value })}
                                            />
                                        </Field>
                                        <Field label="電話番号" required>
                                            <input
                                                type="text" required placeholder="例: 03-0000-0000"
                                                style={inputStyle}
                                                value={newProject.phone}
                                                onChange={e => setNewProject({ ...newProject, phone: e.target.value })}
                                            />
                                        </Field>
                                        <Field label="通信タイプ" required>
                                            <input
                                                type="text" required placeholder="例: Ethernet / H95"
                                                style={inputStyle}
                                                value={newProject.locker_type}
                                                onChange={e => setNewProject({ ...newProject, locker_type: e.target.value })}
                                            />
                                        </Field>
                                        <Field label="メンテ月" required>
                                            <input
                                                type="text" required placeholder="例: 3 または 3,9"
                                                style={inputStyle}
                                                value={newProject.maintenance_month}
                                                onChange={e => setNewProject({ ...newProject, maintenance_month: e.target.value })}
                                            />
                                        </Field>
                                        <Field label="住所">
                                            <input
                                                type="text" placeholder="例: 東京都〇〇区..."
                                                style={inputStyle}
                                                value={newProject.address || ''}
                                                onChange={e => setNewProject({ ...newProject, address: e.target.value })}
                                            />
                                        </Field>
                                    </div>
                                </div>

                                {/* 任意フィールド */}
                                <div style={{ marginBottom: '2rem' }}>
                                    <div style={{ fontSize: '9px', fontWeight: 800, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px' }}>
                                        Optional Fields
                                    </div>
                                    <div className="grid grid-cols-3 gap-5">
                                        <Field label="ステータス">
                                            <select
                                                style={{ ...inputStyle, cursor: 'pointer' }}
                                                value={newProject.status}
                                                onChange={e => setNewProject({ ...newProject, status: e.target.value })}
                                            >
                                                {['未対応', '対応予定', '対応済', 'リスケ'].map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </Field>
                                        <Field label="対応予定日">
                                            <input
                                                type="date"
                                                style={{ ...inputStyle, colorScheme: 'dark' }}
                                                value={newProject.support_date}
                                                onChange={e => setNewProject({ ...newProject, support_date: e.target.value })}
                                            />
                                        </Field>
                                        <Field label="マスタ更新">
                                            <div style={{ display: 'flex', alignItems: 'center', height: '45px', gap: '12px' }}>
                                                <input
                                                    type="checkbox"
                                                    className="checkbox-v5"
                                                    checked={newProject.master_update_done}
                                                    onChange={e => setNewProject({ ...newProject, master_update_done: e.target.checked })}
                                                />
                                                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>
                                                    {newProject.master_update_done ? '完了' : '未完了'}
                                                </span>
                                            </div>
                                        </Field>
                                    </div>
                                </div>

                                <button type="submit" className="btn-add-rich-v10 w-full justify-center py-4">
                                    EXECUTE INITIALIZATION
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            , document.body)}

            {/* ─── Edit Modal (NODE CONFIG) ─────────────────────────────── */}
            {createPortal(
            <AnimatePresence>
                {isEditModalOpen && editingProject && (() => {
                    const ep = editingProject;
                    const safeId = ep?.id ?? '';
                    const safeName = ep?.name ?? '';
                    const safePhone = ep?.phone ?? '';
                    const safeAddress = ep?.address ?? '';
                    const safeLockerType = ep?.locker_type ?? '';
                    const safeStatus = ep?.status ?? '未対応';
                    const safeSupportDate = ep?.support_date ? String(ep.support_date).replace(/\//g, '-') : '';
                    const safeProgramVersion = ep?.program_version ?? '';
                    const safeMaintenanceMonth = ep?.maintenance_month ?? '';

                    return (
                        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setIsEditModalOpen(false)} />
                            <motion.div initial={{ scale: 0.92, opacity: 0, y: 24 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.92, opacity: 0, y: 24 }}
                                transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
                                className="glass-panel w-full max-w-2xl relative z-[1001]" style={{ padding: '2.5rem' }}>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                                            <Settings2 size={18} style={{ color: '#3b82f6', opacity: 0.7 }} />
                                            <h2 style={{ fontSize: '28px', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>
                                                NODE <span style={{ color: '#3b82f6' }}>CONFIG</span>
                                            </h2>
                                        </div>
                                        <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.18em' }}>
                                            案件設定の編集
                                        </p>
                                    </div>
                                    <button className="icon-btn hover:bg-white/10" onClick={() => setIsEditModalOpen(false)}><X size={18} /></button>
                                </div>

                                <form onSubmit={handleEditSubmit}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        <div className="grid grid-cols-2 gap-5">
                                            <Field label="号機 (Node ID)" required>
                                                <input
                                                    type="text" required
                                                    style={inputStyle}
                                                    value={safeId}
                                                    onChange={e => setEditingProject({ ...ep, id: e.target.value })}
                                                />
                                            </Field>
                                            <Field label="物件名" required>
                                                <input
                                                    type="text" required
                                                    style={inputStyle}
                                                    value={safeName}
                                                    onChange={e => setEditingProject({ ...ep, name: e.target.value })}
                                                />
                                            </Field>
                                        </div>

                                        <div className="grid grid-cols-2 gap-5">
                                            <Field label="電話番号">
                                                <input
                                                    type="text"
                                                    style={inputStyle}
                                                    value={safePhone}
                                                    onChange={e => setEditingProject({ ...ep, phone: e.target.value })}
                                                />
                                            </Field>
                                            <Field label="住所">
                                                <input
                                                    type="text"
                                                    style={inputStyle}
                                                    value={safeAddress}
                                                    onChange={e => setEditingProject({ ...ep, address: e.target.value })}
                                                />
                                            </Field>
                                        </div>

                                        <div className="grid grid-cols-3 gap-5">
                                            <Field label="通信タイプ">
                                                <input
                                                    type="text"
                                                    style={inputStyle}
                                                    value={safeLockerType}
                                                    onChange={e => setEditingProject({ ...ep, locker_type: e.target.value })}
                                                />
                                            </Field>
                                            <Field label="メンテ月">
                                                <input
                                                    type="text" placeholder="例: 3 または 3,9"
                                                    style={inputStyle}
                                                    value={safeMaintenanceMonth}
                                                    onChange={e => setEditingProject({ ...ep, maintenance_month: e.target.value })}
                                                />
                                            </Field>
                                            <Field label="バージョン">
                                                <input
                                                    type="text"
                                                    style={inputStyle}
                                                    value={safeProgramVersion}
                                                    onChange={e => setEditingProject({ ...ep, program_version: e.target.value })}
                                                />
                                            </Field>
                                        </div>

                                        <div className="grid grid-cols-2 gap-5">
                                            <Field label="ステータス">
                                                <select
                                                    style={{ ...inputStyle, cursor: 'pointer' }}
                                                    value={safeStatus}
                                                    onChange={e => setEditingProject({ ...ep, status: e.target.value })}
                                                >
                                                    {['未対応', '対応予定', '対応済', 'リスケ'].map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </Field>
                                            <Field label="対応予定日">
                                                <input
                                                    type="date"
                                                    style={{ ...inputStyle, colorScheme: 'dark' }}
                                                    value={safeSupportDate}
                                                    onChange={e => setEditingProject({ ...ep, support_date: e.target.value.replace(/-/g, '/') })}
                                                />
                                            </Field>
                                        </div>

                                        <div style={{ display: 'flex', gap: '12px' }}>
                                            <button type="submit" style={{
                                                flex: 1, padding: '14px',
                                                background: 'linear-gradient(135deg, rgba(59,130,246,0.25), rgba(99,102,241,0.2))',
                                                border: '1px solid rgba(59,130,246,0.35)',
                                                borderRadius: '14px', color: '#fff', fontWeight: 900,
                                                fontSize: '12px', letterSpacing: '0.18em', textTransform: 'uppercase',
                                                cursor: 'pointer', transition: 'all 0.2s',
                                            }}>
                                                COMMIT CONFIGURATION
                                            </button>
                                            {!isEditor && !isViewOnly && <button type="button" onClick={() => {
                                                if (window.confirm('削除しますか？この操作は元に戻せません')) {
                                                    deleteProject(ep.id);
                                                    setIsEditModalOpen(false);
                                                }
                                            }} style={{
                                                padding: '14px 18px',
                                                background: 'rgba(239,68,68,0.1)',
                                                border: '1px solid rgba(239,68,68,0.3)',
                                                borderRadius: '14px', color: '#f87171', fontWeight: 900,
                                                fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s',
                                                display: 'flex', alignItems: 'center', gap: '6px',
                                            }}>
                                                <Trash2 size={14} />
                                                DELETE
                                            </button>}
                                        </div>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    );
                })()}
            </AnimatePresence>
            , document.body)}

            {/* ─── Detail Modal (Read-Only) ─────────────────────────────── */}
            {createPortal(
            <AnimatePresence>
                {isDetailModalOpen && detailProject && (() => {
                    const dp = detailProject;
                    const sc = STATUS_COLORS[dp.status] || STATUS_COLORS['未対応'];
                    return (
                        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-black/85 backdrop-blur-xl" onClick={() => setIsDetailModalOpen(false)} />
                            <motion.div
                                initial={{ scale: 0.93, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.93, opacity: 0, y: 20 }}
                                transition={{ duration: 0.26, ease: [0.23, 1, 0.32, 1] }}
                                className="glass-panel w-full max-w-lg relative z-[1001]" style={{ padding: '2.5rem' }}
                            >
                                <button className="absolute top-6 right-6 icon-btn hover:bg-white/10" onClick={() => setIsDetailModalOpen(false)}>
                                    <X size={18} />
                                </button>

                                <div style={{ marginBottom: '2rem' }}>
                                    <h2 style={{ fontSize: '26px', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                                        PROJECT <span style={{ color: sc.text }}>DETAIL</span>
                                    </h2>
                                    <div style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                                        marginTop: '12px', padding: '4px 12px', borderRadius: '8px',
                                        background: sc.bg, border: `1px solid ${sc.border}`,
                                    }}>
                                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: sc.text, boxShadow: `0 0 6px ${sc.text}` }} />
                                        <span style={{ fontSize: '11px', fontWeight: 800, color: sc.text, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{dp.status}</span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        <div>
                                            <label style={{ fontSize: '9px', fontWeight: 800, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.16em' }}>号機 / ID</label>
                                            <p style={{ fontSize: '18px', fontWeight: 900, color: '#60a5fa', fontFamily: 'Outfit, monospace', marginTop: '6px' }}>{dp.id}</p>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '9px', fontWeight: 800, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.16em' }}>物件名</label>
                                            <p style={{ fontSize: '15px', fontWeight: 800, color: '#fff', marginTop: '6px', lineHeight: 1.3 }}>{dp.name}</p>
                                        </div>
                                    </div>

                                    <div style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                            <MapPin size={15} style={{ color: 'rgba(255,255,255,0.25)', marginTop: '2px', flexShrink: 0 }} />
                                            <div>
                                                <label style={{ fontSize: '9px', fontWeight: 800, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.16em' }}>住所</label>
                                                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)', marginTop: '4px', fontWeight: 600, lineHeight: 1.5 }}>
                                                    {dp.address || '住所未登録'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <div style={{ padding: '12px 14px', background: 'rgba(0,242,255,0.04)', border: '1px solid rgba(0,242,255,0.12)', borderRadius: '12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Hash size={13} style={{ color: 'rgba(0,242,255,0.5)', flexShrink: 0 }} />
                                                <div>
                                                    <label style={{ fontSize: '9px', fontWeight: 800, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.14em' }}>電話番号</label>
                                                    <p style={{ fontSize: '12px', fontWeight: 800, fontFamily: 'Outfit, monospace', color: 'rgba(0,242,255,0.7)', marginTop: '3px' }}>{dp.phone || '---'}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Cpu size={13} style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
                                                <div>
                                                    <label style={{ fontSize: '9px', fontWeight: 800, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.14em' }}>通信タイプ</label>
                                                    <p style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginTop: '3px' }}>{dp.locker_type || '---'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        <div>
                                            <label style={{ fontSize: '9px', fontWeight: 800, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.16em' }}>対応予定日</label>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                                                <CalendarDays size={13} style={{ color: sc.text, opacity: 0.7 }} />
                                                <p style={{ fontSize: '13px', fontWeight: 800, fontFamily: 'Outfit, monospace', color: sc.text }}>{dp.support_date || '未設定'}</p>
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '9px', fontWeight: 800, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.16em' }}>メンテ月</label>
                                            <p style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginTop: '6px' }}>{formatMaintenanceMonth(dp.maintenance_month)}</p>
                                        </div>
                                    </div>

                                    <div style={{
                                        padding: '12px 16px', borderRadius: '12px',
                                        background: dp.master_update_done ? 'rgba(168, 85, 247, 0.08)' : 'rgba(255,255,255,0.02)',
                                        border: `1px solid ${dp.master_update_done ? 'rgba(168, 85, 247, 0.8)' : 'rgba(255,255,255,0.06)'}`,
                                        display: 'flex', alignItems: 'center', gap: '10px',
                                        filter: dp.master_update_done ? 'drop-shadow(0 0 4px rgba(168, 85, 247, 0.5))' : 'none',
                                        boxShadow: dp.master_update_done ? 'inset 0 0 8px rgba(168, 85, 247, 0.2)' : 'none'
                                    }}>
                                        <FileCheck
                                            size={15}
                                            style={{
                                                color: dp.master_update_done ? '#c084fc' : 'rgba(255,255,255,0.2)',
                                                flexShrink: 0,
                                                filter: dp.master_update_done
                                                    ? 'drop-shadow(0 0 2px rgba(192, 132, 252, 0.95)) drop-shadow(0 0 6px rgba(168, 85, 247, 0.4))'
                                                    : 'none'
                                            }}
                                        />
                                        <span style={{ fontSize: '12px', fontWeight: 700, color: dp.master_update_done ? '#a855f7' : 'rgba(255,255,255,0.3)' }}>
                                            マスタ更新: {dp.master_update_done ? 'OK (COMPLETED)' : '未完了'}
                                        </span>
                                    </div>

                                    <button className="premium-btn-primary w-full" style={{ marginTop: '4px' }} onClick={() => setIsDetailModalOpen(false)}>
                                        CLOSE DETAILS
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    );
                })()}
            </AnimatePresence>
            , document.body)}
        </div>
    );
};

export default ProjectList;
