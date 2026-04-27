import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
    Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Line, ComposedChart, LabelList
} from 'recharts';
import { CheckCircle, Clock, AlertCircle, Layers, BarChart2, TrendingUp, ChevronDown, CalendarDays } from 'lucide-react';

/* ─── システムカラー定義（全体共通） ─────────────────────────────────────── */
// eslint-disable-next-line react-refresh/only-export-components
export const STATUS_COLORS = {
    done:     '#10b981',   /* 対応済   エメラルドグリーン */
    planned:  '#f59e0b',   /* 対応予定 アンバー */
    pending:  '#64748b',   /* 未対応   スレート */
    total:    '#3b82f6',   /* 全体     プライマリブルー */
    reschedule: '#ef4444', /* リスケ   レッド */
};

const Dashboard = () => {
    const { projects } = useApp();
    const [chartType, setChartType] = useState('bar');
    const [selectedYear, setSelectedYear] = useState(2026);
    const [yearDropOpen, setYearDropOpen] = useState(false);
    const yearDropRef = useRef(null);

    useEffect(() => {
        const close = (e) => { if (yearDropRef.current && !yearDropRef.current.contains(e.target)) setYearDropOpen(false); };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);

    const availableYears = useMemo(() => {
        const years = new Set();
        projects.forEach(p => {
            if (p.support_date) {
                const y = new Date(p.support_date.replace(/-/g, '/')).getFullYear();
                if (!isNaN(y)) years.add(y);
            }
        });
        return ['all', ...Array.from(years).sort((a, b) => a - b)];
    }, [projects]);

    const currentMonth = new Date().getMonth() + 1;

    const stats = useMemo(() => ({
        total:      projects.length,
        completed:  projects.filter(p => p.status === '対応済').length,
        inProgress: projects.filter(p => p.status === '対応予定').length,
        pending:    projects.filter(p => p.status === '未対応').length,
        monthMaintenance: projects.filter(p => {
            if (!p.maintenance_month) return false;
            return p.maintenance_month.toString().split(',').map(m => parseInt(m.trim(), 10)).includes(currentMonth);
        }).length,
    }), [projects, currentMonth]);

    const monthlyData = useMemo(() => {
        const undatedPlanned = projects.filter(p => p.status === '対応予定' && !p.support_date).length;
        const undatedRow = { month: '未定', completed: 0, planned: undatedPlanned, total: undatedPlanned };
        if (selectedYear !== 'all') {
            // 特定年: 12ヶ月表示
            const mStats = Array.from({ length: 12 }, (_, i) => ({
                month: (i + 1) + "月", completed: 0, planned: 0, total: 0,
            }));
            projects.forEach(p => {
                if (!p.support_date) return;
                const d = new Date(p.support_date.replace(/-/g, '/'));
                if (d.getFullYear() !== selectedYear) return;
                const idx = d.getMonth();
                if (!mStats[idx]) return;
                if (p.status === '対応済')           mStats[idx].completed++;
                else if (p.status === '対応予定') mStats[idx].planned++;
            });
            mStats.forEach(s => { s.total = s.completed + s.planned; });
            return undatedPlanned > 0 ? [...mStats, undatedRow] : mStats;
        } else {
            // 全期間: 年月ごとに展開し全月表示
            const map = new Map();
            projects.forEach(p => {
                if (!p.support_date) return;
                const d = new Date(p.support_date.replace(/-/g, '/'));
                const y = d.getFullYear();
                const m = d.getMonth() + 1;
                if (isNaN(y)) return;
                const key = y * 100 + m;
                const label = y + "年" + m + "月";
                if (!map.has(key)) map.set(key, { month: label, completed: 0, planned: 0, total: 0 });
                const entry = map.get(key);
                if (p.status === '対応済')           entry.completed++;
                else if (p.status === '対応予定') entry.planned++;
            });
            const list = Array.from(map.entries())
                .sort((a, b) => a[0] - b[0])
                .map(([, v]) => ({ ...v, total: v.completed + v.planned }));
            return undatedPlanned > 0 ? [...list, undatedRow] : list;
        }
    }, [projects, selectedYear]);

    const yearLabel = selectedYear === 'all' ? '全期間' : (selectedYear + '年');
    const completionRate = Math.round((stats.completed / (stats.total || 1)) * 100) || 0;

    const pieData = [
        { name: '完了', value: stats.completed,             color: STATUS_COLORS.done },
        { name: '未完了', value: stats.total - stats.completed, color: 'rgba(255,255,255,0.05)' },
    ];

    const statCards = [
        { label: '案件総数', sub: '登録案件',   value: stats.total,      color: STATUS_COLORS.total,    icon: Layers,      glow: 'rgba(59,130,246,0.3)',    accent: 'rgba(59,130,246,0.1)'   },
        { label: '対応完了', sub: `${completionRate}% 達成`, value: stats.completed,  color: STATUS_COLORS.done,     icon: CheckCircle, glow: 'rgba(16,185,129,0.35)',   accent: 'rgba(16,185,129,0.1)'   },
        { label: '対応予定', sub: '予定あり',   value: stats.inProgress, color: STATUS_COLORS.planned,  icon: Clock,       glow: 'rgba(245,158,11,0.3)',    accent: 'rgba(245,158,11,0.1)'   },
        { label: '未対応',   sub: '要対応',     value: stats.pending,    color: STATUS_COLORS.pending,  icon: AlertCircle, glow: 'rgba(100,116,139,0.25)',  accent: 'rgba(100,116,139,0.08)' },
        { label: '今月メンテ', sub: `${currentMonth}月 対応`, value: stats.monthMaintenance, color: '#8b5cf6', icon: CalendarDays, glow: 'rgba(139,92,246,0.3)', accent: 'rgba(139,92,246,0.1)' },
    ];

    return (
        <div className="w-full" style={{ display: 'flex', flexDirection: 'column', gap: '56px', paddingTop: '48px' }}>
            {/* Stat Cards ──────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '48px' }}>
                {statCards.map((item, idx) => (
                    <div key={idx} className="stat-card" style={{ padding: '1.75rem', border: `1px solid ${item.color}25`, boxShadow: `0 0 0 1px rgba(255,255,255,0.03), 0 8px 32px rgba(0,0,0,0.35), 0 0 40px ${item.glow}` }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'rgba(255,255,255,0.3)', marginBottom: '18px' }}>
                                    {item.label}
                                </p>
                                <p style={{ fontSize: '4rem', fontWeight: 900, color: item.color, lineHeight: 1, textShadow: `0 0 40px ${item.glow}`, letterSpacing: '-0.03em' }}>
                                    {item.value}
                                </p>
                                <p style={{ fontSize: '10px', color: item.color, opacity: 0.6, marginTop: '10px', fontWeight: 700, letterSpacing: '0.08em' }}>
                                    {item.sub}
                                </p>
                            </div>
                            <div style={{
                                width: 56, height: 56, borderRadius: 16, flexShrink: 0,
                                background: item.accent,
                                border: `1px solid ${item.color}30`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: `0 0 30px ${item.glow}, inset 0 1px 0 rgba(255,255,255,0.08)`
                            }}>
                                <item.icon size={26} style={{ color: item.color, opacity: 0.9 }} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ─── Charts ──────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Monthly Progress Chart */}
                <div className="lg:col-span-2 glass-card" style={{ padding: '2.5rem', border: '1px solid rgba(255,255,255,0.09)', boxShadow: '0 0 0 1px rgba(255,255,255,0.03), 0 8px 32px rgba(0,0,0,0.4)' }}>
                    <div className="flex items-center justify-between" style={{ marginBottom: '2.5rem' }}>
                        <div>
                            <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>月別進捗状況</h3>
                            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.18em', marginTop: '6px' }}>Monthly Progress</p>
                        </div>                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div ref={yearDropRef} style={{ position: 'relative' }}>
                                <button onClick={() => setYearDropOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '8px 14px', cursor: 'pointer', color: 'rgba(255,255,255,0.75)', fontSize: '0.72rem', fontWeight: 800, outline: 'none', transition: 'all 0.2s', whiteSpace: 'nowrap', letterSpacing: '0.04em' }}>
                                    {yearLabel}
                                    <ChevronDown size={12} style={{ opacity: 0.5, transform: yearDropOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                                </button>
                                {yearDropOpen && (
                                    <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 200, background: 'rgba(10,15,25,0.97)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '4px', minWidth: '110px', boxShadow: '0 16px 48px rgba(0,0,0,0.75)' }}>
                                        {availableYears.map(y => (
                                            <button key={y} onClick={() => { setSelectedYear(y); setYearDropOpen(false); }}
                                                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', borderRadius: '8px', border: 'none', background: selectedYear === y ? 'rgba(59,130,246,0.15)' : 'transparent', color: selectedYear === y ? '#93c5fd' : 'rgba(255,255,255,0.5)', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.15s', outline: 'none', whiteSpace: 'nowrap', letterSpacing: '0.04em' }}
                                                onMouseEnter={e => { if (selectedYear !== y) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                                                onMouseLeave={e => { e.currentTarget.style.background = selectedYear === y ? 'rgba(59,130,246,0.15)' : 'transparent'; }}
                                            >{y === 'all' ? '全期間' : y + '年'}</button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '6px', gap: '4px' }}>
                                {[
                                    { type: 'bar',  node: <BarChart2 size={16} /> },
                                    { type: 'line', node: <TrendingUp size={16} /> },
                                ].map(({ type, node }) => (
                                    <button
                                        key={type}
                                        onClick={() => setChartType(type)}
                                        style={{
                                            width: 36, height: 36, borderRadius: 10, border: 'none', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            background:   chartType === type ? STATUS_COLORS.total : 'transparent',
                                            color:        chartType === type ? '#fff' : 'rgba(255,255,255,0.3)',
                                            boxShadow:    chartType === type ? '0 4px 14px rgba(59,130,246,0.4)' : 'none',
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        {node}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div style={{ width: '100%', height: 340 }}>
                        <ResponsiveContainer>
                            <ComposedChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                                <XAxis dataKey="month" stroke="rgba(255,255,255,0.15)" fontSize={11} tickLine={false} axisLine={false} fontWeight={700} />
                                <YAxis stroke="rgba(255,255,255,0.15)" fontSize={11} tickLine={false} axisLine={false} fontWeight={700} />
                                <Tooltip
                                    contentStyle={{ background: 'rgba(10,15,25,0.96)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', boxShadow: '0 20px 50px rgba(0,0,0,0.6)', backdropFilter: 'blur(24px)' }}
                                    itemStyle={{ color: '#f8fafc', fontSize: '12px', fontWeight: 700 }}
                                    labelStyle={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}
                                />
                                {chartType === 'bar' ? (
                                    <>
                                        <Bar dataKey="completed" stackId="a" fill={STATUS_COLORS.done}    name="完了"   maxBarSize={28} radius={[6, 6, 0, 0]} />
                                        <Bar dataKey="planned"   stackId="a" fill={STATUS_COLORS.planned} name="対応予定" maxBarSize={28} radius={[6, 6, 0, 0]}>
                                            <LabelList
                                                dataKey="total"
                                                position="top"
                                                formatter={(v) => v ? `${v}件` : ''}
                                                style={{ fill: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: 800, letterSpacing: '0.02em' }}
                                            />
                                        </Bar>
                                    </>
                                ) : (
                                    <>
                                        <Line type="monotone" dataKey="completed" stroke={STATUS_COLORS.done}    strokeWidth={3} dot={{ r: 4, fill: '#030712', strokeWidth: 2, stroke: STATUS_COLORS.done }}    name="完了" />
                                        <Line type="monotone" dataKey="planned"   stroke={STATUS_COLORS.planned} strokeWidth={3} dot={{ r: 4, fill: '#030712', strokeWidth: 2, stroke: STATUS_COLORS.planned }} name="対応予定">
                                            <LabelList
                                                dataKey="total"
                                                position="top"
                                                formatter={(v) => v ? `${v}件` : ''}
                                                style={{ fill: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: 800, letterSpacing: '0.02em' }}
                                            />
                                        </Line>
                                    </>
                                )}
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Legend */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '24px', marginTop: '20px' }}>
                        {[{ label: '対応完了', color: STATUS_COLORS.done }, { label: '対応予定', color: STATUS_COLORS.planned }].map(({ label, color }) => (
                            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: 12, height: 12, borderRadius: 3, background: color }} />
                                <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.35)' }}>{label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Completion Rate Pie */}
                <div className="glass-card" style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', border: '1px solid rgba(255,255,255,0.09)', boxShadow: '0 0 0 1px rgba(255,255,255,0.03), 0 8px 32px rgba(0,0,0,0.4)' }}>
                    <div style={{ marginBottom: '2rem' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>全体の達成率</h3>
                        <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.18em', marginTop: '6px' }}>Completion Rate</p>
                    </div>

                    <div style={{ width: '100%', height: 230, position: 'relative', flexShrink: 0 }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie data={pieData} cx="50%" cy="50%" innerRadius={72} outerRadius={96} paddingAngle={4} dataKey="value" strokeWidth={0} startAngle={90} endAngle={-270}>
                                    {pieData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
                            <p style={{ fontSize: '3rem', fontWeight: 900, color: STATUS_COLORS.done, textShadow: '0 0 40px rgba(16,185,129,0.5)', lineHeight: 1, letterSpacing: '-0.03em' }}>
                                {completionRate}%
                            </p>
                            <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.18em', marginTop: '8px' }}>完了率</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '28px' }}>
                        {[
                            { label: '対応完了', value: stats.completed,  color: STATUS_COLORS.done    },
                            { label: '対応予定', value: stats.inProgress, color: STATUS_COLORS.planned },
                            { label: '未対応',   value: stats.pending,   color: STATUS_COLORS.pending },
                        ].map(({ label, value, color }) => (
                            <div key={label} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '12px 16px', borderRadius: 12,
                                background: `${color}0e`, border: `1px solid ${color}22`,
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}` }} />
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>{label}</span>
                                </div>
                                <span style={{ fontSize: '15px', fontWeight: 900, color }}>{value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
