import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion'; // eslint-disable-line no-unused-vars
import {
    MapPin, Navigation, TrendingUp, Clock,
    CheckCircle, Zap, Route, ChevronRight, Timer
} from 'lucide-react';

/* ─── 拠点情報 ──────────────────────────────────────────────────────────── */
const START_LOCATION = {
    name: '岩本町 (拠点)',
    address: '〒101-0032 東京都千代田区岩本町2-10-1',
    lat: 35.6946,
    lng: 139.7749,
};

const RouteFinder = () => {
    const { projects, selectedIds } = useApp();
    const [startTime, setStartTime] = useState('09:45');

    const selectedProjects = useMemo(
        () => projects.filter(p => selectedIds.includes(p.id)),
        [projects, selectedIds]
    );

    /* ─── ルート計算 (最近傍法) ─────────────────────────────────────────── */
    const calculatedRoute = useMemo(() => {
        if (selectedProjects.length === 0) return [];

        const route = [];
        let unvisited = [...selectedProjects];
        let currentPos = { lat: START_LOCATION.lat, lng: START_LOCATION.lng };

        while (unvisited.length > 0) {
            unvisited.sort((a, b) => {
                const distA = Math.sqrt(Math.pow(a.lat - currentPos.lat, 2) + Math.pow(a.lng - currentPos.lng, 2));
                const distB = Math.sqrt(Math.pow(b.lat - currentPos.lat, 2) + Math.pow(b.lng - currentPos.lng, 2));
                return distA - distB;
            });
            const next = unvisited.shift();
            const dist = Math.sqrt(Math.pow(next.lat - currentPos.lat, 2) + Math.pow(next.lng - currentPos.lng, 2));
            route.push({ ...next, travelTime: Math.round(dist * 200), distance: (dist * 111).toFixed(1) });
            currentPos = next;
        }

        const [h, m] = startTime.split(':').map(Number);
        let cur = new Date();
        cur.setHours(h, m, 0, 0);

        return route.map(item => {
            cur.setMinutes(cur.getMinutes() + item.travelTime);
            if (cur.getHours() === 12) cur.setHours(13, 0, 0, 0);
            const arrival = new Date(cur);
            cur.setMinutes(cur.getMinutes() + 30);
            const departure = new Date(cur);
            return {
                ...item,
                arrival:   arrival.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                departure: departure.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
        });
    }, [selectedProjects, startTime]);

    const totalTravelMin = calculatedRoute.reduce((s, i) => s + i.travelTime, 0);
    const totalDistKm    = calculatedRoute.reduce((s, i) => s + parseFloat(i.distance), 0).toFixed(1);

    return (
        <div className="w-full space-y-10">

            {/* ─── Empty State ─────────────────────────────────────────── */}
            {selectedProjects.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                    className="glass-card"
                    style={{
                        padding: '5rem 3rem', textAlign: 'center',
                        border: '1px solid rgba(255,255,255,0.06)',
                        background: 'linear-gradient(135deg, rgba(59,130,246,0.04), rgba(3,7,18,0.6))',
                    }}
                >
                    <div style={{
                        width: 72, height: 72, borderRadius: '20px',
                        background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 24px',
                        boxShadow: '0 0 40px rgba(59,130,246,0.2)',
                    }}>
                        <Route size={32} style={{ color: '#3b82f6', opacity: 0.8 }} />
                    </div>
                    <h3 style={{ fontSize: '20px', fontWeight: 900, color: '#fff', letterSpacing: '-0.01em', marginBottom: '12px' }}>
                        巡回する物件を選択してください
                    </h3>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', fontWeight: 600, lineHeight: 1.7, maxWidth: '480px', margin: '0 auto' }}>
                        案件管理一覧のチェックボックスで物件を選択すると、<br />岩本町拠点からの最適ルートが自動計算されます
                    </p>
                </motion.div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

                    {/* ─── Route List ──────────────────────────────────── */}
                    <div className="lg:col-span-3 space-y-5">

                        {/* 出発地カード */}
                        <div className="glass-card" style={{
                            padding: '1.75rem 2rem',
                            border: '1px solid rgba(59,130,246,0.2)',
                            background: 'linear-gradient(135deg, rgba(59,130,246,0.07), rgba(3,7,18,0.5))',
                            boxShadow: '0 0 30px rgba(59,130,246,0.12)',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{
                                    width: 44, height: 44, borderRadius: '14px', flexShrink: 0,
                                    background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 0 20px rgba(59,130,246,0.25)',
                                }}>
                                    <MapPin size={18} style={{ color: '#3b82f6' }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '9px', fontWeight: 800, color: 'rgba(59,130,246,0.6)', textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: '4px' }}>
                                        出発地点
                                    </div>
                                    <div style={{ fontSize: '16px', fontWeight: 900, color: '#fff', letterSpacing: '-0.01em' }}>{START_LOCATION.name}</div>
                                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '3px', fontWeight: 600 }}>{START_LOCATION.address}</div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                    <span style={{ fontSize: '9px', fontWeight: 800, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.14em' }}>出発予定時間</span>
                                    <input
                                        type="time"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        style={{
                                            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '10px', padding: '6px 12px', fontSize: '16px', fontWeight: 900,
                                            color: '#3b82f6', outline: 'none', fontFamily: 'Outfit, monospace',
                                            colorScheme: 'dark', cursor: 'pointer',
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ルートアイテム */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {calculatedRoute.map((item, idx) => (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.06, duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                                    style={{ display: 'flex', gap: '16px', alignItems: 'stretch' }}
                                >
                                    {/* ステップ番号 + ライン */}
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, paddingTop: '18px' }}>
                                        <div style={{
                                            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                                            background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '13px', fontWeight: 900, color: '#fff',
                                            boxShadow: '0 4px 16px rgba(59,130,246,0.4)',
                                        }}>
                                            {idx + 1}
                                        </div>
                                        {idx !== calculatedRoute.length - 1 && (
                                            <div style={{ width: 2, flex: 1, background: 'linear-gradient(to bottom, rgba(59,130,246,0.4), rgba(59,130,246,0.05))', marginTop: '8px', borderRadius: '2px' }} />
                                        )}
                                    </div>

                                    {/* カード */}
                                    <div className="glass-card" style={{
                                        flex: 1, padding: '1.5rem 1.75rem',
                                        border: '1px solid rgba(255,255,255,0.07)',
                                        overflow: 'hidden', position: 'relative',
                                    }}>
                                        {/* 右端アクセントライン */}
                                        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 3, background: 'linear-gradient(to bottom, #3b82f6, #6366f1)', opacity: 0.4, borderRadius: '0 12px 12px 0' }} />

                                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '12px' }}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: '16px', fontWeight: 900, color: '#fff', letterSpacing: '-0.01em', marginBottom: '4px' }}>{item.name}</div>
                                                {item.address && (
                                                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                        <MapPin size={10} style={{ flexShrink: 0 }} />
                                                        {item.address}
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                <div style={{ fontSize: '22px', fontWeight: 900, color: '#3b82f6', fontFamily: 'Outfit, monospace', lineHeight: 1, letterSpacing: '-0.02em' }}>
                                                    {item.arrival}
                                                </div>
                                                <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em', marginTop: '4px' }}>
                                                    到着予定
                                                </div>
                                            </div>
                                        </div>

                                        {/* メタ情報 */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Clock size={12} style={{ color: 'rgba(255,255,255,0.3)' }} />
                                                <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.35)' }}>移動 約{item.travelTime}分</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <TrendingUp size={12} style={{ color: 'rgba(255,255,255,0.3)' }} />
                                                <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.35)' }}>{item.distance} km</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
                                                <CheckCircle size={12} style={{ color: '#10b981' }} />
                                                <span style={{ fontSize: '11px', fontWeight: 800, color: '#10b981' }}>滞在 30分</span>
                                                <ChevronRight size={10} style={{ color: 'rgba(255,255,255,0.2)' }} />
                                                <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)' }}>出発 {item.departure}</span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* ─── Sidebar ─────────────────────────────────────── */}
                    <div className="lg:col-span-1 space-y-5">

                        {/* ルート概要 */}
                        <div className="glass-card" style={{
                            padding: '2rem',
                            border: '1px solid rgba(255,255,255,0.08)',
                            background: 'linear-gradient(160deg, rgba(255,255,255,0.03), rgba(3,7,18,0.6))',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
                                <div style={{ width: 32, height: 32, borderRadius: '10px', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Route size={15} style={{ color: '#3b82f6' }} />
                                </div>
                                <h3 style={{ fontSize: '14px', fontWeight: 900, color: '#fff', letterSpacing: '-0.01em' }}>ルート概要</h3>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {[
                                    { label: '訪問件数',  value: `${selectedProjects.length} 件`, node: <MapPin size={13} style={{ color: '#3b82f6', opacity: 0.7 }} />,     color: '#3b82f6'  },
                                    { label: '出発時間',  value: startTime,                       node: <Timer size={13} style={{ color: '#f59e0b', opacity: 0.7 }} />,      color: '#f59e0b'  },
                                    { label: '総移動時間', value: `約 ${totalTravelMin} 分`,      node: <Clock size={13} style={{ color: '#8b5cf6', opacity: 0.7 }} />,       color: '#8b5cf6'  },
                                    { label: '総距離',    value: `${totalDistKm} km`,            node: <TrendingUp size={13} style={{ color: '#10b981', opacity: 0.7 }} />,  color: '#10b981'  },
                                    { label: '終了予定',  value: calculatedRoute.length > 0 ? calculatedRoute[calculatedRoute.length - 1].departure : '--:--', node: <CheckCircle size={13} style={{ color: '#10b981', opacity: 0.7 }} />, color: '#10b981' },
                                ].map(({ label, value, node, color }) => (
                                    <div key={label} style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '10px 12px', borderRadius: '10px',
                                        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {node}
                                            <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.35)' }}>{label}</span>
                                        </div>
                                        <span style={{ fontSize: '13px', fontWeight: 900, color, fontFamily: 'Outfit, monospace' }}>{value}</span>
                                    </div>
                                ))}
                            </div>

                            <button
                                className="premium-btn-primary w-full"
                                style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                            >
                                <Navigation size={16} />
                                ナビを開始
                            </button>
                        </div>

                        {/* 昼休憩インフォ */}
                        <div className="glass-card" style={{
                            padding: '1.5rem',
                            border: '1px solid rgba(245,158,11,0.15)',
                            background: 'linear-gradient(135deg, rgba(245,158,11,0.06), rgba(3,7,18,0.5))',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                <Zap size={14} style={{ color: '#f59e0b' }} />
                                <h4 style={{ fontSize: '12px', fontWeight: 900, color: '#f59e0b', letterSpacing: '0.04em' }}>昼休憩 自動挿入</h4>
                            </div>
                            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', lineHeight: 1.7, fontWeight: 600 }}>
                                12時台に自動で 1時間の昼休憩がスケジュールに組み込まれます。
                            </p>
                            <div style={{
                                marginTop: '10px', padding: '8px 12px', borderRadius: '8px',
                                background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            }}>
                                <span style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(245,158,11,0.6)', letterSpacing: '0.1em' }}>LUNCH BREAK</span>
                                <span style={{ fontSize: '12px', fontWeight: 900, color: '#f59e0b', fontFamily: 'Outfit, monospace' }}>12:00 - 13:00</span>
                            </div>
                        </div>

                        {/* アルゴリズム説明 */}
                        <div className="glass-card" style={{
                            padding: '1.5rem',
                            border: '1px solid rgba(255,255,255,0.06)',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                <Zap size={14} style={{ color: 'rgba(99,102,241,0.7)' }} />
                                <h4 style={{ fontSize: '12px', fontWeight: 900, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.04em' }}>最適巡回の仕組み</h4>
                            </div>
                            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', lineHeight: 1.7, fontWeight: 600 }}>
                                出発地（岩本町拠点）から各物件までの直線距離を算出し、最も近い物件から順にルートを構成する最近傍法を採用しています。
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RouteFinder;
