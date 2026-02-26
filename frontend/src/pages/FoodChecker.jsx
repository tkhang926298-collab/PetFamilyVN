import { useState, useMemo } from 'react';
import foodData from '../data/food_checker.json';

const SEVERITY_MAP = {
    high: { label: '⚠️ Nguy hiểm cao', color: '#DC2626', bg: 'rgba(220,38,38,0.1)' },
    medium: { label: '🟡 Trung bình', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
    low: { label: '🟠 Thấp', color: '#F97316', bg: 'rgba(249,115,22,0.1)' },
    none: { label: '✅ An toàn', color: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
};

export default function FoodChecker() {
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all'); // all, safe, danger
    const [petFilter, setPetFilter] = useState('all'); // all, dog, cat
    const [expandedId, setExpandedId] = useState(null);

    const filtered = useMemo(() => {
        return foodData.filter(f => {
            const searchTerm = search.toLowerCase().trim();
            const escapeRegExp = (str) => str.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
            const regex = new RegExp(`(^|[\\s\\-.,()])` + escapeRegExp(searchTerm) + `(?=[\\s\\-.,()]|$)`, 'i');
            const matchSearch = searchTerm === '' ||
                regex.test(f.name) ||
                (f.name_en && regex.test(f.name_en));
            const matchSafe =
                filter === 'all' ||
                (filter === 'safe' && f.safe) ||
                (filter === 'danger' && !f.safe);
            const matchPet =
                petFilter === 'all' ||
                (petFilter === 'dog' && f.dog) ||
                (petFilter === 'cat' && f.cat);
            return matchSearch && matchSafe && matchPet;
        });
    }, [search, filter, petFilter]);

    const dangerCount = foodData.filter(f => !f.safe).length;
    const safeCount = foodData.filter(f => f.safe).length;

    return (
        <div className="food-page">
            <h2>🍽️ Kiểm Tra Thực Phẩm</h2>
            <p className="step-hint">Kiểm tra nhanh thực phẩm nào an toàn cho thú cưng của bạn</p>

            <input
                type="text"
                className="search-input"
                placeholder="🔎 Tìm kiếm thực phẩm (VN hoặc EN)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />

            {/* Safety filter */}
            <div className="filter-tabs">
                {[
                    { id: 'all', label: 'Tất Cả', count: foodData.length },
                    { id: 'danger', label: '❌ Nguy Hiểm', count: dangerCount },
                    { id: 'safe', label: '✅ An Toàn', count: safeCount },
                ].map(t => (
                    <button
                        key={t.id}
                        className={`filter-tab ${filter === t.id ? 'active' : ''}`}
                        onClick={() => setFilter(t.id)}
                    >
                        {t.label} ({t.count})
                    </button>
                ))}
            </div>

            {/* Pet filter */}
            <div className="filter-tabs pet-filter">
                {[
                    { id: 'all', label: '🐕🐈 Tất cả' },
                    { id: 'dog', label: '🐕 Chó' },
                    { id: 'cat', label: '🐈 Mèo' },
                ].map(t => (
                    <button
                        key={t.id}
                        className={`filter-tab ${petFilter === t.id ? 'active' : ''}`}
                        onClick={() => setPetFilter(t.id)}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <p className="step-hint">Hiển thị {filtered.length} kết quả</p>

            <div className="food-list">
                {filtered.map((f, i) => {
                    const sev = SEVERITY_MAP[f.severity] || SEVERITY_MAP.none;
                    const isExpanded = expandedId === i;
                    return (
                        <div
                            key={i}
                            className={`food-card-v2 ${f.safe ? 'safe' : 'danger'} ${isExpanded ? 'expanded' : ''}`}
                            onClick={() => setExpandedId(isExpanded ? null : i)}
                        >
                            <div className="food-header-v2">
                                <div className="food-title-row">
                                    <span className="food-icon-v2">{f.safe ? '✅' : '❌'}</span>
                                    <div>
                                        <h3 className="food-name-v2">{f.name}</h3>
                                        {f.name_en && <span className="food-name-en">{f.name_en}</span>}
                                    </div>
                                </div>
                                <span className="severity-badge-v2" style={{ color: sev.color, background: sev.bg }}>
                                    {sev.label}
                                </span>
                            </div>

                            <p className="food-reason-v2">{f.reason}</p>

                            <div className="food-tags">
                                {f.dog && <span className="food-tag">🐕 Chó</span>}
                                {f.cat && <span className="food-tag">🐈 Mèo</span>}
                                {f.age && <span className="food-tag">📅 {f.age}</span>}
                            </div>

                            {isExpanded && (
                                <div className="food-detail">
                                    {f.scientific && (
                                        <div className="food-detail-row">
                                            <span className="detail-label">🔬 Chất độc:</span>
                                            <span>{f.scientific}</span>
                                        </div>
                                    )}
                                    {f.common_vn && (
                                        <div className="food-detail-row">
                                            <span className="detail-label">🇻🇳 Phổ biến:</span>
                                            <span>{f.common_vn}</span>
                                        </div>
                                    )}
                                    {f.risk_under_1kg && (
                                        <div className="food-detail-row warning-row">
                                            <span className="detail-label">⚠️ Rủi ro pet &lt;1kg:</span>
                                            <span className="risk-value">{f.risk_under_1kg}</span>
                                        </div>
                                    )}
                                    {f.note_under_1kg && (
                                        <div className="food-note-box">
                                            <strong>📝 Chi tiết pet &lt;1kg:</strong>
                                            <p>{f.note_under_1kg}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            <span className="food-expand-hint">
                                {isExpanded ? '▲ Thu gọn' : '▼ Xem chi tiết'}
                            </span>
                        </div>
                    );
                })}
                {filtered.length === 0 && (
                    <p className="no-results">Không tìm thấy thực phẩm phù hợp.</p>
                )}
            </div>
        </div>
    );
}
