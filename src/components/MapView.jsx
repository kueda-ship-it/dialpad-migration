import { useState, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useApp } from '../context/AppContext';
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { MapPin, Loader, Zap, AlertCircle, Search, X } from 'lucide-react';

/* ─── Leaflet icon fix ──────────────────────────────────────────────────── */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow });

// ─── 信頼性の高いMarkerグラフィックを使用（デフォルトカラーはLeaflet標準） ───────────
const greenIcon = new L.Icon({
    iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});
const orangeIcon = new L.Icon({
    iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});
const redIcon = new L.Icon({
    iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const getIcon = (status) => {
    if (status === '対応済') return greenIcon;
    if (status === '対応予定') return orangeIcon;
    return redIcon;
};

/* ─── 国土地理院 API (日本政府 無料・CORS対応・APIキー不要) ───────────── */
const geocodeGSI = async (address) => {
    try {
        const url = `https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(address)}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data && data.length > 0) {
            const [lng, lat] = data[0].geometry.coordinates;
            return { lat: parseFloat(lat), lng: parseFloat(lng) };
        }
        return null;
    } catch {
        return null;
    }
};

/* ─── Nominatim fallback ────────────────────────────────────────────────── */
const geocodeNominatim = async (address) => {
    try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=jp`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'ja', 'User-Agent': 'dialpad-migration-manager/1.0' } });
        const data = await res.json();
        if (data && data.length > 0) {
            return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        }
        return null;
    } catch {
        return null;
    }
};

/* ─── 住所の正規化（全角英数字・ハイフンを半角に変換） ──────────────────── */
const normalizeAddress = (address) => {
    if (!address) return '';
    return address
        .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
        .replace(/[－‐―－—]/g, '-')
        .replace(/[　]/g, ' ')
        .replace(/[（\(\)\）]/g, ' ')
        .trim();
};

/* ─── 住所の短縮（建物名などを除去して検索しやすくする） ─────────────────── */
const truncateAddress = (address) => {
    if (!address) return '';
    // 建物名っぽいキーワードで分割（全角・半角対応）
    const keywords = ['ビル', 'マンション', 'アパート', 'ハイツ', 'コーポ', 'レジデンス', 'メゾン', 'Room', '室'];
    let result = address;
    keywords.forEach(kw => {
        const idx = result.indexOf(kw);
        if (idx !== -1) {
            result = result.substring(0, idx).trim();
        }
    });

    // 最後に数字やハイフンで終わるように調整（建物名が除去された後の不要な空白や文字を消す）
    return result.replace(/[^\d\-]+$/, '').trim();
};

const geocodeAddress = async (address) => {
    const norm = normalizeAddress(address);
    // 1. 国土地理院 (主)
    const gsi = await geocodeGSI(norm);
    if (gsi) return gsi;
    // 2. 国土地理院・短縮住所
    const short = truncateAddress(norm);
    if (short !== norm) {
        const gsi2 = await geocodeGSI(short);
        if (gsi2) return gsi2;
    }
    // 3. Nominatim (副)
    return geocodeNominatim(norm);
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/* ─── MapView ───────────────────────────────────────────────────────────── */
const MapView = () => {
    const { projects, updateProjectField } = useApp();
    const center = [35.6762, 139.7503];
    const [mapSearch, setMapSearch] = useState('');

    const validProjects = useMemo(() => {
        const t = mapSearch.toLowerCase().trim();
        return projects.filter(p => {
            if (!p.lat || !p.lng) return false;
            if (!t) return true;
            return (p.id?.toLowerCase().includes(t) || p.name?.toLowerCase().includes(t));
        });
    }, [projects, mapSearch]);

    /* ─── Geocoding state ── */
    const [geocoding, setGeocoding] = useState(false);
    const [progress, setProgress] = useState({ done: 0, total: 0, current: '' });
    const [geocodeResult, setGeocodeResult] = useState(null);

    const handleGeocode = useCallback(async () => {
        const targets = projects.filter(p => p.address && (!p.lat || !p.lng));
        if (targets.length === 0) {
            setGeocodeResult({ success: 0, fail: 0, message: '対象案件なし（住所未登録 or 既に座標あり）' });
            return;
        }

        setGeocoding(true);
        setGeocodeResult(null);
        setProgress({ done: 0, total: targets.length, current: '' });

        let successCount = 0, failedProjects = [];

        for (let i = 0; i < targets.length; i++) {
            const p = targets[i];
            setProgress({ done: i, total: targets.length, current: p.name });

            const coords = await geocodeAddress(p.address);
            if (coords) {
                await updateProjectField(p.id, 'lat', coords.lat);
                await updateProjectField(p.id, 'lng', coords.lng);
                successCount++;
            } else {
                failedProjects.push({ id: p.id, name: p.name, address: p.address });
            }
            await sleep(300); // GSI API はレート制限が緩い
        }

        setProgress({ done: targets.length, total: targets.length, current: '' });
        setGeocoding(false);
        setGeocodeResult({ success: successCount, fail: failedProjects.length, failedProjects });
    }, [projects, updateProjectField]);

    const noAddressCount = projects.filter(p => !p.address).length;
    const needsGeocode = projects.filter(p => p.address && (!p.lat || !p.lng)).length;

    const PIN_LEGEND = [
        { color: '#10b981', label: '対応済', bgColor: '#10b981' },
        { color: '#f59e0b', label: '対応予定', bgColor: '#f59e0b' },
        { color: '#ef4444', label: '未対応 / リスケ', bgColor: '#ef4444' },
    ];

    return (
        <div className="w-full space-y-8">

            {/* ─── Stats + Legend + Geocode Action ─────────────────────── */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px' }}>
                {/* ピン凡例 */}
                {PIN_LEGEND.map(({ bgColor, label }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: bgColor, boxShadow: `0 0 8px ${bgColor}` }} />
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.45)' }}>{label}</span>
                    </div>
                ))}

                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', fontWeight: 600 }}>
                    ピン表示: <strong style={{ color: 'rgba(255,255,255,0.4)' }}>{validProjects.length}</strong> / {projects.length} 件
                </span>

                {/* マップ内検索 */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px', padding: '6px 12px', minWidth: '220px',
                }}>
                    <Search size={13} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
                    <input
                        type="text"
                        placeholder="号機 / 物件名で検索..."
                        value={mapSearch}
                        onChange={e => setMapSearch(e.target.value)}
                        style={{
                            background: 'transparent', border: 'none', outline: 'none',
                            fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.7)',
                            width: '100%', fontFamily: 'Outfit, sans-serif',
                        }}
                    />
                    {mapSearch && (
                        <button onClick={() => setMapSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                            <X size={12} style={{ color: 'rgba(255,255,255,0.3)' }} />
                        </button>
                    )}
                </div>

                {/* ジオコーディングボタン */}
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {geocodeResult && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                            <span style={{ fontSize: '10px', fontWeight: 700, color: geocodeResult.fail > 0 ? '#f87171' : '#10b981' }}>
                                {geocodeResult.message || `完了: ${geocodeResult.success}件取得 / 失敗: ${geocodeResult.fail}件`}
                            </span>
                            {geocodeResult.failedProjects && geocodeResult.failedProjects.length > 0 && (
                                <details style={{ fontSize: '9px', color: 'rgba(248,113,113,0.85)', cursor: 'pointer', textAlign: 'right' }}>
                                    <summary style={{ fontWeight: 700, letterSpacing: '0.05em', listStyle: 'none', cursor: 'pointer' }}>
                                        失敗した住所を確認 ▾
                                    </summary>
                                    <div style={{ marginTop: '6px', lineHeight: 1.8, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '8px 10px', textAlign: 'left' }}>
                                        {geocodeResult.failedProjects.map(fp => (
                                            <div key={fp.id} style={{ borderBottom: '1px solid rgba(239,68,68,0.1)', paddingBottom: '4px', marginBottom: '4px' }}>
                                                <span style={{ fontWeight: 800 }}>号機 {fp.id}</span> {fp.name}<br />
                                                <span style={{ opacity: 0.7 }}>{fp.address}</span>
                                            </div>
                                        ))}
                                    </div>
                                </details>
                            )}
                        </div>
                    )}
                    {needsGeocode > 0 && !geocoding && (
                        <span style={{ fontSize: '10px', color: 'rgba(245,158,11,0.7)', fontWeight: 700 }}>
                            座標未取得: {needsGeocode} 件
                        </span>
                    )}
                    <button
                        onClick={handleGeocode}
                        disabled={geocoding || needsGeocode === 0}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '9px 18px', borderRadius: '12px', cursor: geocoding || needsGeocode === 0 ? 'not-allowed' : 'pointer',
                            background: needsGeocode > 0 && !geocoding ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${needsGeocode > 0 && !geocoding ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.08)'}`,
                            color: needsGeocode > 0 && !geocoding ? '#f59e0b' : 'rgba(255,255,255,0.25)',
                            fontSize: '11px', fontWeight: 800, transition: 'all 0.2s', letterSpacing: '0.06em',
                        }}
                    >
                        {geocoding ? (
                            <>
                                <Loader size={13} className="animate-spin" />
                                <span>{progress.done}/{progress.total}</span>
                                {progress.current && (
                                    <span style={{ opacity: 0.55, maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {progress.current}
                                    </span>
                                )}
                            </>
                        ) : (
                            <>
                                <Zap size={13} />
                                住所から座標を自動取得
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* ─── GSI 説明 ────────────────────────────────────────────── */}
            {needsGeocode > 0 && !geocoding && (
                <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: '10px',
                    padding: '12px 16px', borderRadius: '12px',
                    background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)',
                }}>
                    <AlertCircle size={14} style={{ color: '#60a5fa', flexShrink: 0, marginTop: '1px' }} />
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontWeight: 600, lineHeight: 1.6 }}>
                        国土地理院 API（日本政府・無料・APIキー不要）で住所 → 座標に変換し保存します。
                        Nominatim より日本住所の精度が高く、{needsGeocode} 件 ≒ 約 {Math.ceil(needsGeocode * 0.3 / 60)} 分で完了します。
                        Google Maps APIを使用したい場合はAPIキーをお知らせください。
                    </p>
                </div>
            )}

            {/* ─── Map Container ──────────────────────────────────────── */}
            <div className="glass-card" style={{ overflow: 'hidden', borderRadius: '20px', height: '580px', border: '1px solid rgba(255,255,255,0.07)' }}>
                <MapContainer center={center} zoom={11} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {validProjects.map(project => (
                        <Marker
                            key={project.id}
                            position={[project.lat, project.lng]}
                            icon={getIcon(project.status)}
                        >
                            <Popup>
                                <div style={{ color: '#1e293b', minWidth: '210px', fontFamily: 'Outfit, sans-serif' }}>
                                    <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>号機: {project.id}</div>
                                    <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 800, borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>{project.name}</h4>
                                    <div style={{ fontSize: '12px', lineHeight: '1.7', color: '#475569' }}>
                                        {project.address && <div>📍 {project.address}</div>}
                                        {project.locker_type && <div>🔧 {project.locker_type}</div>}
                                        <div><strong>状態:</strong> {project.status}</div>
                                        {project.maintenance_month && <div><strong>メンテ月:</strong> {project.maintenance_month}月</div>}
                                        {project.support_date && <div><strong>対応日:</strong> {project.support_date}</div>}
                                        {project.phone && <div><strong>電話:</strong> {project.phone}</div>}
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>

            {/* ─── No location data notice ─────────────────────────────── */}
            {validProjects.length === 0 && (
                <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <MapPin size={32} style={{ color: 'rgba(255,255,255,0.15)', margin: '0 auto 12px' }} />
                    <p style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(255,255,255,0.3)' }}>
                        座標データが登録されている案件がありません
                    </p>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.15)', marginTop: '6px' }}>
                        上の「住所から座標を自動取得」ボタンで一括登録できます
                        {noAddressCount > 0 && `（住所未登録: ${noAddressCount} 件は取得不可）`}
                    </p>
                </div>
            )}
        </div>
    );
};

export default MapView;
