import React, { useState, useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { ChevronLeft, ChevronRight, X, MapPin, Hash, CalendarDays, FileCheck, Settings2, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion'; // eslint-disable-line no-unused-vars

/* ─── ステータスカラー（システム共通） ──────────────────────────────────── */
const STATUS_STYLE = {
    '対応済':   { bg: 'rgba(16,185,129,0.18)',  border: '#10b981', text: '#10b981',  label: 'evt-done'      },
    '対応予定': { bg: 'rgba(245,158,11,0.15)',  border: '#f59e0b', text: '#f59e0b',  label: 'evt-planned'   },
    '未対応':   { bg: 'rgba(100,116,139,0.12)', border: '#64748b', text: '#94a3b8',  label: 'evt-pending'   },
    'リスケ':   { bg: 'rgba(239,68,68,0.13)',   border: '#ef4444', text: '#f87171',  label: 'evt-reschedule'},
};

const STATUS_COLORS = {
    '対応済': { bg: 'rgba(16,185,129,0.13)', border: 'rgba(16,185,129,0.4)', text: '#10b981', dot: 'rgba(16,185,129,0.9)' },
    '対応予定': { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.38)', text: '#f59e0b', dot: 'rgba(245,158,11,0.9)' },
    '未対応': { bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.3)', text: '#94a3b8', dot: 'rgba(100,116,139,0.8)' },
    'リスケ': { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.32)', text: '#f87171', dot: 'rgba(239,68,68,0.9)' },
};

/* ─── GlassDropdown ─────────────────────────────────────────────────────── */
const GlassDropdown = ({ value, onChange, options, labelPrefix = '', disabled = false, useStatusColor = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [dropUp, setDropUp] = useState(false);
    const triggerRef = useRef(null);
    const sc = useStatusColor ? STATUS_COLORS[value] : null;

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
                style={sc ? { background: sc.bg, borderColor: sc.border, color: sc.text } : {}}
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

const CalendarView = () => {
    const { projects, updateProjectStatus, user } = useApp();
    const canUpdateStatus = user?.dm_role === 'Admin' || user?.dm_role === 'Manager' || user?.dm_role === 'Editor';
    const [currentDate, setCurrentDate]     = useState(new Date());
    const [selectedProject, setSelectedProject] = useState(null);

    const getDaysInMonth = (date) => {
        const year  = date.getFullYear();
        const month = date.getMonth();
        const firstDay     = new Date(year, month, 1);
        const lastDay      = new Date(year, month + 1, 0);
        const firstDOW     = firstDay.getDay();
        const daysInMonth  = lastDay.getDate();
        const prevLastDay  = new Date(year, month, 0).getDate();

        const prevDays = Array.from({ length: firstDOW }, (_, i) => ({
            day: prevLastDay - firstDOW + i + 1, month: month - 1,
            year: month === 0 ? year - 1 : year, isCurrentMonth: false
        }));
        const currDays = Array.from({ length: daysInMonth }, (_, i) => ({
            day: i + 1, month, year, isCurrentMonth: true
        }));
        const total    = prevDays.length + currDays.length;
        const nextDays = Array.from({ length: (7 - (total % 7)) % 7 }, (_, i) => ({
            day: i + 1, month: month + 1,
            year: month === 11 ? year + 1 : year, isCurrentMonth: false
        }));
        return [...prevDays, ...currDays, ...nextDays];
    };

    const getProjectsForDay = (d) => projects.filter(p => {
        if (!p.support_date) return false;
        const pd = new Date(p.support_date.replace(/-/g, '/'));
        return pd.getFullYear() === d.year && pd.getMonth() === d.month && pd.getDate() === d.day;
    });

    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

    // 日本の祝日（2026年中心）および振替休日判定ロジック
    const isJapaneseHoliday = (date) => {
        const y = date.getFullYear();
        const m = date.getMonth() + 1;
        const d = date.getDate();
        const dow = date.getDay(); // 0:Sun, 6:Sat

        // 固定祝日
        const fixed = [
            {m:1, d:1},   // 元日
            {m:2, d:11},  // 建国記念の日
            {m:2, d:23},  // 天皇誕生日
            {m:4, d:29},  // 昭和の日
            {m:5, d:3},   // 憲法記念日
            {m:5, d:4},   // みどりの日
            {m:5, d:5},   // こどもの日
            {m:8, d:11},  // 山の日
            {m:11, d:3},  // 文化の日
            {m:11, d:23}, // 勤労感謝の日
        ];

        // 2026年固有の変動祝日
        const variable2026 = [
            {m:1, d:12},  // 成人の日 (第2月曜)
            {m:3, d:20},  // 春分の日 (計算値)
            {m:7, d:20},  // 海の日 (第3月曜)
            {m:9, d:21},  // 敬老の日 (第3月曜)
            {m:9, d:22},  // 秋分の日 (計算値)
            {m:10, d:12}, // スポーツの日 (第2月曜)
        ];

        const isFixed = fixed.some(f => f.m === m && f.d === d);
        const isVar = variable2026.some(v => v.m === m && v.d === d);
        
        if (isFixed || isVar) return true;

        // 振替休日判定: 祝日が日曜日の場合、翌月曜日が休み
        // ※ 簡易化のため「当日が月曜日」かつ「前日が祝日かつ日曜日」を判定
        if (dow === 1) {
            const yesterday = new Date(y, m - 1, d - 1);
            if (isJapaneseHoliday(yesterday) && yesterday.getDay() === 0) return true;
        }

        return false;
    };

    const getDayColor = (date, isHeader = false) => {
        const dow = date.getDay();
        const isHoli = !isHeader && isJapaneseHoliday(date);
        
        if (dow === 0 || isHoli) return 'rgba(248,113,113,0.85)'; // SUN / Holiday (Reddish)
        if (dow === 6) return 'rgba(96,165,250,0.85)';  // SAT (Blueish)
        return 'rgba(255,255,255,0.4)'; // Regular
    };

    const days = getDaysInMonth(currentDate);
    const sp = selectedProject;
    const spStyle = sp ? (STATUS_STYLE[sp.status] || STATUS_STYLE['未対応']) : null;

    return (
        <div className="w-full" style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
            {/* ─── Calendar Fixed Header (Sticky) ────────────────────────── */}
            <div className="sticky top-[124px] z-[50]" style={{ 
                background: 'rgba(3,7,18,0.95)', 
                backdropFilter: 'blur(32px) saturate(200%)',
                margin: '0 -32px', 
                padding: '20px 32px',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
            }}>
                <div className="flex justify-between items-center w-full">
                    {/* Legend */}
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                        {Object.entries(STATUS_STYLE).map(([label, s]) => (
                            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.border, boxShadow: `0 0 6px ${s.border}` }} />
                                <span style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
                            </div>
                        ))}
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '6px 8px' }}>
                        <button onClick={prevMonth} className="icon-btn hover:bg-white/10"><ChevronLeft size={20} /></button>
                        <span style={{ fontSize: '13px', fontWeight: 800, width: '120px', textAlign: 'center', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.7)' }}>
                            {currentDate.getFullYear()}年 {currentDate.getMonth() + 1}月
                        </span>
                        <button onClick={nextMonth} className="icon-btn hover:bg-white/10"><ChevronRight size={20} /></button>
                    </div>
                </div>
            </div>

            {/* ─── Calendar ───────────────────────────────────────────── */}
            <div className="glass-card calendar-wrapper">
                <div className="calendar-grid">
                    {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d, i) => (
                        <div key={d} className="calendar-day-header" style={{ color: getDayColor(new Date(2026, 0, 4 + i), true) }}>
                            {d}
                        </div>
                    ))}
                    {days.map((d, idx) => {
                        const dateObj = new Date(d.year, d.month, d.day);
                        const dayProjects = getProjectsForDay(d);
                        const isToday = new Date().toDateString() === dateObj.toDateString();
                        const color = d.isCurrentMonth ? getDayColor(dateObj) : 'rgba(255,255,255,0.1)';
                        
                        return (
                            <div key={idx} className={`calendar-day ${!d.isCurrentMonth ? 'blank' : ''} ${isToday ? 'today' : ''}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <span className="day-number" style={{ color }}>{d.day}</span>
                                    {dayProjects.length > 0 && (
                                        <span style={{ fontSize: '9px', fontWeight: 900, color: 'rgba(59,130,246,0.7)', background: 'rgba(59,130,246,0.1)', borderRadius: '4px', padding: '1px 5px' }}>
                                            {dayProjects.length}
                                        </span>
                                    )}
                                </div>
                                <div className="day-events">
                                    {dayProjects.map(p => {
                                        const s = STATUS_STYLE[p.status] || STATUS_STYLE['未対応'];
                                        return (
                                            <div
                                                key={p.id}
                                                onClick={() => setSelectedProject(p)}
                                                className="calendar-event"
                                                style={{ background: s.bg, color: s.text, borderLeft: `2px solid ${s.border}` }}
                                            >
                                                {p.name}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ─── Project Detail Modal ───────────────────────────────── */}
            <AnimatePresence>
                {sp && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.94, opacity: 0, y: 16 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.94, opacity: 0, y: 16 }}
                            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                            className="glass-panel w-full max-w-xl relative"
                            style={{ padding: '2.5rem' }}
                        >
                            {/* Close */}
                            <button
                                className="absolute top-6 right-6 icon-btn hover:bg-white/10"
                                onClick={() => setSelectedProject(null)}
                            >
                                <X size={18} />
                            </button>

                            {/* Title */}
                            <div style={{ marginBottom: '2rem' }}>
                                <h2 style={{ fontSize: '28px', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                                    PROJECT <span style={{ color: spStyle.text }}>DETAIL</span>
                                </h2>
                                <div style={{ marginTop: '12px' }}>
                                    <GlassDropdown 
                                        value={sp.status} 
                                        onChange={(val) => {
                                            updateProjectStatus(sp.id, val);
                                            setSelectedProject(prev => prev ? { ...prev, status: val } : null);
                                        }} 
                                        options={['未対応', '対応予定', '対応済', 'リスケ']} 
                                        disabled={!canUpdateStatus} 
                                        useStatusColor 
                                    />
                                </div>
                            </div>

                            {/* Fields */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div>
                                        <label style={{ fontSize: '9px', fontWeight: 800, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.16em' }}>号機 / ID</label>
                                        <p style={{ fontSize: '18px', fontWeight: 900, color: '#60a5fa', fontFamily: 'Outfit, monospace', marginTop: '6px' }}>{sp.id}</p>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '9px', fontWeight: 800, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.16em' }}>物件名</label>
                                        <p style={{ fontSize: '15px', fontWeight: 800, color: '#fff', marginTop: '6px', lineHeight: 1.3 }}>{sp.name}</p>
                                    </div>
                                </div>

                                <div style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                        <MapPin size={16} style={{ color: 'rgba(255,255,255,0.3)', marginTop: '2px', flexShrink: 0 }} />
                                        <div>
                                            <label style={{ fontSize: '9px', fontWeight: 800, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.16em' }}>住所</label>
                                            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginTop: '4px', fontWeight: 600, lineHeight: 1.5 }}>
                                                {sp.address || '住所未登録'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div>
                                        <label style={{ fontSize: '9px', fontWeight: 800, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.16em' }}>対応予定日</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                                            <CalendarDays size={14} style={{ color: spStyle.text, opacity: 0.7 }} />
                                            <p style={{ fontSize: '14px', fontWeight: 800, fontFamily: 'Outfit, monospace', color: spStyle.text }}>
                                                {sp.support_date || '未設定'}
                                            </p>
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '9px', fontWeight: 800, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.16em' }}>電話番号</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                                            <Hash size={14} style={{ color: 'rgba(0,242,255,0.5)' }} />
                                            <p style={{ fontSize: '13px', fontWeight: 800, fontFamily: 'Outfit, monospace', color: 'rgba(0,242,255,0.7)' }}>
                                                {sp.phone || '---'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* ロッカー型番 */}
                                {sp.locker_type && (
                                    <div style={{ padding: '12px 16px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.18)', borderRadius: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <Settings2 size={13} style={{ color: 'rgba(99,102,241,0.7)', flexShrink: 0 }} />
                                            <div>
                                                <label style={{ fontSize: '9px', fontWeight: 800, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.14em' }}>ロッカー型番</label>
                                                <p style={{ fontSize: '12px', fontWeight: 800, fontFamily: 'Outfit, monospace', color: 'rgba(99,102,241,0.9)', marginTop: '3px' }}>{sp.locker_type}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* マスタ更新 */}
                                <div style={{
                                    padding: '12px 16px', borderRadius: '12px',
                                    background: sp.master_update_done ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.02)',
                                    border: `1px solid ${sp.master_update_done ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.06)'}`,
                                    display: 'flex', alignItems: 'center', gap: '10px',
                                }}>
                                    <FileCheck size={15} style={{ color: sp.master_update_done ? '#10b981' : 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: sp.master_update_done ? '#10b981' : 'rgba(255,255,255,0.3)' }}>
                                        マスタ更新: {sp.master_update_done ? '完了済み' : '未完了'}
                                    </span>
                                </div>

                                <button
                                    className="premium-btn-primary w-full"
                                    style={{ marginTop: '4px' }}
                                    onClick={() => setSelectedProject(null)}
                                >
                                    CLOSE DETAILS
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CalendarView;
