import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Circle, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { supabase } from '../services/supabase';

// Admin detection via user_metadata.is_admin flag (set by grant_admin.py)

// Fix leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const DEFAULT_CENTER = [10.8231, 106.6297]; // HCM City
const RADIUS_OPTIONS = [100, 200, 500, 1000, 2000, 5000];

// Haversine distance in meters
function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Sub-component: Click on map to set position
function MapClickHandler({ onMapClick }) {
    useMapEvents({ click: (e) => onMapClick(e.latlng) });
    return null;
}

// Sub-component: Fly to position
function FlyTo({ position }) {
    const map = useMap();
    useEffect(() => {
        if (position) map.flyTo(position, 15, { duration: 1 });
    }, [position, map]);
    return null;
}

export default function DangerZone() {
    const [zones, setZones] = useState([]);
    const [view, setView] = useState('map'); // map | add | search
    const [formData, setFormData] = useState({ name: '', desc: '', reporter: '', lat: '', lng: '', radius: 500 });
    const [clickPos, setClickPos] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResult, setSearchResult] = useState(null);
    const [searchPos, setSearchPos] = useState(null);
    const [geocodeResults, setGeocodeResults] = useState([]);
    const [geocoding, setGeocoding] = useState(false);
    const [flyTarget, setFlyTarget] = useState(null);
    const [expanded, setExpanded] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);

    // Load zones from Supabase & detect admin
    useEffect(() => {
        loadZonesFromDB();
        supabase.auth.getUser().then(({ data: { user } }) => {
            const meta = user?.user_metadata || {};
            setIsAdmin(meta.is_admin === true);
        });
    }, []);

    const loadZonesFromDB = async () => {
        try {
            const { data, error } = await supabase
                .from('danger_zones')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setZones((data || []).map(z => ({
                id: z.id, name: z.name, desc: z.description,
                reporter: z.reporter_name, lat: z.lat, lng: z.lng,
                radius: z.radius, createdAt: new Date(z.created_at).toLocaleString('vi-VN'),
            })));
        } catch (err) {
            console.log('DangerZones table not ready:', err.message);
            setZones([]);
        }
    };

    // Geocode an address using Nominatim
    const geocode = useCallback(async (query) => {
        if (!query.trim()) return;
        setGeocoding(true);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=vn`);
            const data = await res.json();
            setGeocodeResults(data);
        } catch { setGeocodeResults([]); }
        setGeocoding(false);
    }, []);

    const handleMapClick = (latlng) => {
        setClickPos(latlng);
        if (view === 'add') {
            setFormData(f => ({ ...f, lat: latlng.lat.toFixed(6), lng: latlng.lng.toFixed(6) }));
        }
        if (view === 'search') {
            setSearchPos([latlng.lat, latlng.lng]);
            checkPosition(latlng.lat, latlng.lng);
        }
    };

    const handleAddZone = async () => {
        const { name, desc, reporter, lat, lng, radius } = formData;
        if (!name || !lat || !lng) return;
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { error } = await supabase.from('danger_zones').insert({
                user_id: user?.id || null,
                reporter_name: reporter || user?.user_metadata?.display_name || 'Ẩn danh',
                name, description: desc,
                lat: parseFloat(lat), lng: parseFloat(lng),
                radius: parseInt(radius),
            });
            if (error) throw error;
            setFormData({ name: '', desc: '', reporter: '', lat: '', lng: '', radius: 500 });
            setClickPos(null);
            setView('map');
        } catch (err) {
            console.log('Add zone error:', err.message);
        }
    };

    const handleDeleteZone = async (id) => {
        if (!isAdmin) return;
        if (!window.confirm('🗑️ Admin: Xóa cảnh báo này?')) return;
        try {
            await supabase.from('danger_zones').delete().eq('id', id);
            loadZonesFromDB();
        } catch (err) {
            console.log('Delete zone error:', err.message);
        }
    };

    const checkPosition = (lat, lng) => {
        const matched = zones.filter(z => haversine(lat, lng, z.lat, z.lng) <= z.radius);
        if (matched.length > 0) {
            setSearchResult({ safe: false, zones: matched });
        } else {
            setSearchResult({ safe: true, zones: [] });
        }
    };

    const handleSearchGeocode = async () => {
        await geocode(searchQuery);
    };

    const selectGeoResult = (r) => {
        const lat = parseFloat(r.lat);
        const lng = parseFloat(r.lon);
        if (view === 'add') {
            setFormData(f => ({ ...f, lat: lat.toFixed(6), lng: lng.toFixed(6) }));
            setClickPos({ lat, lng });
        }
        if (view === 'search') {
            setSearchPos([lat, lng]);
            checkPosition(lat, lng);
        }
        setFlyTarget([lat, lng]);
        setGeocodeResults([]);
        setSearchQuery(r.display_name);
    };

    const TIPS = [
        { icon: '🚨', title: 'Nhận biết bả chó', text: 'Bả thường được trộn vào thức ăn hấp dẫn (thịt, xúc xích, cơm). Đặc biệt cẩn trọng tại công viên, bãi cỏ, gần thùng rác.' },
        { icon: '🦺', title: 'Đeo rọ mõm khi ra ngoài', text: 'Luôn đeo rọ mõm cho thú cưng khi dạo ở khu vực lạ hoặc có tin bả.' },
        { icon: '⚡', title: 'Xử lý khi nghi ngờ trúng bả', text: 'Gây nôn bằng oxy già 3% (2ml/kg). Đưa đến phòng khám thú y NGAY LẬP TỨC.' },
        { icon: '📱', title: 'Báo cáo khu vực nguy hiểm', text: 'Sử dụng chức năng "Thêm Cảnh Báo" ở trên để đánh dấu khu vực phát hiện bả.' },
    ];

    return (
        <div className="danger-page">
            <h2>⚠️ Cảnh Báo Bả & An Toàn</h2>

            {/* Tab buttons */}
            <div className="danger-tabs">
                <button className={`danger-tab ${view === 'map' ? 'active' : ''}`} onClick={() => setView('map')}>
                    🗺️ Bản Đồ
                </button>
                <button className={`danger-tab ${view === 'add' ? 'active' : ''}`} onClick={() => setView('add')}>
                    ➕ Thêm Cảnh Báo
                </button>
                <button className={`danger-tab ${view === 'search' ? 'active' : ''}`} onClick={() => { setView('search'); setSearchResult(null); setSearchPos(null); }}>
                    🔍 Kiểm Tra Vị Trí
                </button>
            </div>

            {/* MAP */}
            <div className="danger-map-wrapper">
                <MapContainer center={DEFAULT_CENTER} zoom={13} className="danger-map" scrollWheelZoom={true}>
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapClickHandler onMapClick={handleMapClick} />
                    {flyTarget && <FlyTo position={flyTarget} />}

                    {/* Warning zones */}
                    {zones.map(z => (
                        <Circle
                            key={z.id}
                            center={[z.lat, z.lng]}
                            radius={z.radius}
                            pathOptions={{ color: '#EF4444', fillColor: '#EF4444', fillOpacity: 0.2, weight: 2 }}
                        >
                            <Popup>
                                <div style={{ minWidth: 180 }}>
                                    <strong>⚠️ {z.name}</strong><br />
                                    {z.desc && <span>{z.desc}<br /></span>}
                                    <span>📍 Bán kính: {z.radius}m</span><br />
                                    <span>👤 Người báo: {z.reporter}</span><br />
                                    <span>🕐 {z.createdAt}</span>
                                    {isAdmin && (
                                        <><br /><button className="btn-admin-delete" style={{ marginTop: '0.5rem', width: '100%' }}
                                            onClick={() => handleDeleteZone(z.id)}>🗑️ Admin: Xóa</button></>
                                    )}
                                </div>
                            </Popup>
                        </Circle>
                    ))}

                    {/* Zone centers */}
                    {zones.map(z => (
                        <Marker key={'m-' + z.id} position={[z.lat, z.lng]}>
                            <Popup>
                                <strong>⚠️ {z.name}</strong><br />
                                📍 Tâm cảnh báo
                            </Popup>
                        </Marker>
                    ))}

                    {/* Click position */}
                    {clickPos && (view === 'add') && (
                        <Marker position={[clickPos.lat, clickPos.lng]}>
                            <Popup>📌 Vị trí đã chọn</Popup>
                        </Marker>
                    )}

                    {/* Search position */}
                    {searchPos && (
                        <Marker position={searchPos}>
                            <Popup>🔍 Vị trí kiểm tra</Popup>
                        </Marker>
                    )}
                </MapContainer>
            </div>

            {/* ADD FORM */}
            {view === 'add' && (
                <div className="danger-form">
                    <h3>➕ Thêm Cảnh Báo Mới</h3>
                    <p className="step-hint">Nhấp vào bản đồ hoặc tìm kiếm địa chỉ để chọn vị trí</p>

                    <div className="geocode-search">
                        <input
                            type="text"
                            className="search-input"
                            placeholder="🔎 Tìm kiếm địa chỉ..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSearchGeocode()}
                        />
                        <button className="btn-primary btn-sm" onClick={handleSearchGeocode} disabled={geocoding}>
                            {geocoding ? '⏳' : 'Tìm'}
                        </button>
                    </div>
                    {geocodeResults.length > 0 && (
                        <div className="geocode-results">
                            {geocodeResults.map((r, i) => (
                                <button key={i} className="geocode-item" onClick={() => selectGeoResult(r)}>
                                    📍 {r.display_name}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="form-grid">
                        <input placeholder="Tên khu vực *" value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} className="form-input" />
                        <input placeholder="Mô tả (ví dụ: phát hiện bả ở bãi cỏ)" value={formData.desc} onChange={e => setFormData(f => ({ ...f, desc: e.target.value }))} className="form-input" />
                        <input placeholder="Tên người báo cáo" value={formData.reporter} onChange={e => setFormData(f => ({ ...f, reporter: e.target.value }))} className="form-input" />
                        <div className="form-row">
                            <input placeholder="Vĩ độ (lat) *" value={formData.lat} onChange={e => setFormData(f => ({ ...f, lat: e.target.value }))} className="form-input" readOnly />
                            <input placeholder="Kinh độ (lng) *" value={formData.lng} onChange={e => setFormData(f => ({ ...f, lng: e.target.value }))} className="form-input" readOnly />
                        </div>
                        <div className="radius-select">
                            <label>📏 Bán kính cảnh báo:</label>
                            <div className="radius-options">
                                {RADIUS_OPTIONS.map(r => (
                                    <button
                                        key={r}
                                        className={`radius-btn ${formData.radius === r ? 'active' : ''}`}
                                        onClick={() => setFormData(f => ({ ...f, radius: r }))}
                                    >
                                        {r >= 1000 ? `${r / 1000}km` : `${r}m`}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <button className="btn-primary" onClick={handleAddZone} disabled={!formData.name || !formData.lat}>
                        🚨 Đăng Cảnh Báo
                    </button>
                </div>
            )}

            {/* SEARCH */}
            {view === 'search' && (
                <div className="danger-form">
                    <h3>🔍 Kiểm Tra Vị Trí An Toàn</h3>
                    <p className="step-hint">Nhấp vào bản đồ hoặc tìm kiếm địa chỉ để kiểm tra</p>

                    <div className="geocode-search">
                        <input
                            type="text"
                            className="search-input"
                            placeholder="🔎 Nhập địa chỉ cần kiểm tra..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSearchGeocode()}
                        />
                        <button className="btn-primary btn-sm" onClick={handleSearchGeocode} disabled={geocoding}>
                            {geocoding ? '⏳' : 'Tìm'}
                        </button>
                    </div>
                    {geocodeResults.length > 0 && (
                        <div className="geocode-results">
                            {geocodeResults.map((r, i) => (
                                <button key={i} className="geocode-item" onClick={() => selectGeoResult(r)}>
                                    📍 {r.display_name}
                                </button>
                            ))}
                        </div>
                    )}

                    {searchResult && (
                        <div className={`search-result ${searchResult.safe ? 'safe' : 'danger'}`}>
                            {searchResult.safe ? (
                                <>
                                    <span className="result-icon">✅</span>
                                    <h4>Khu vực AN TOÀN</h4>
                                    <p>Vị trí này không nằm trong bất kỳ vùng cảnh báo nào.</p>
                                </>
                            ) : (
                                <>
                                    <span className="result-icon">🚨</span>
                                    <h4>NGUY HIỂM — Nằm trong {searchResult.zones.length} vùng cảnh báo!</h4>
                                    {searchResult.zones.map(z => (
                                        <div key={z.id} className="matched-zone">
                                            <strong>⚠️ {z.name}</strong>
                                            {z.desc && <p>{z.desc}</p>}
                                            <p>📍 Bán kính: {z.radius}m · 👤 Người báo: {z.reporter} · 🕐 {z.createdAt}</p>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Zone list */}
            {view === 'map' && zones.length > 0 && (
                <div className="zone-list">
                    <h3>📋 Danh sách cảnh báo ({zones.length})</h3>
                    {zones.map(z => (
                        <div key={z.id} className="zone-card" onClick={() => { setFlyTarget([z.lat, z.lng]); setExpanded(expanded === z.id ? null : z.id); }}>
                            <div className="zone-header">
                                <span className="zone-icon">🚨</span>
                                <div className="zone-info">
                                    <strong>{z.name}</strong>
                                    <span className="zone-meta">📏 {z.radius}m · 👤 {z.reporter}</span>
                                </div>
                                <span className="tip-chevron">{expanded === z.id ? '▼' : '▶'}</span>
                            </div>
                            {expanded === z.id && (
                                <div className="zone-detail">
                                    {z.desc && <p>{z.desc}</p>}
                                    <p>📍 Tọa độ: {z.lat}, {z.lng}</p>
                                    <p>🕐 {z.createdAt}</p>
                                    <button className="btn-danger btn-sm" onClick={(e) => { e.stopPropagation(); handleDeleteZone(z.id); }}>
                                        🗑️ Xóa cảnh báo
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Tips */}
            <div className="tips-list" style={{ marginTop: '1.5rem' }}>
                <h3>💡 Lưu Ý An Toàn</h3>
                {TIPS.map((tip, i) => (
                    <div key={i} className="tip-card">
                        <div className="tip-header">
                            <span className="tip-icon">{tip.icon}</span>
                            <h3 className="tip-title">{tip.title}</h3>
                        </div>
                        <p className="tip-text">{tip.text}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
