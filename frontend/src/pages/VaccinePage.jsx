import { useState, useEffect } from 'react';
import vaccinData from '../data/vacxin_schedule.json';

const PET_TABS = [
    { id: 'dog', label: '🐕 Chó' },
    { id: 'cat', label: '🐈 Mèo' },
];

const REPEAT_OPTIONS = [
    { value: 'once', label: 'Một lần' },
    { value: 'yearly', label: '1 năm / lần' },
    { value: 'half-yearly', label: '6 tháng / lần' },
    { value: 'custom', label: 'Tùy chỉnh (ngày)' },
];

function weeksToAge(weeks) {
    if (weeks < 12) return `${weeks} tuần tuổi`;
    if (weeks < 52) return `${Math.round(weeks / 4)} tháng tuổi`;
    return `${Math.round(weeks / 52)} năm tuổi`;
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getNextDate(dateStr, repeat) {
    if (!dateStr || repeat === 'once') return null;
    const d = new Date(dateStr);
    if (repeat === 'yearly') d.setFullYear(d.getFullYear() + 1);
    else if (repeat === 'half-yearly') d.setMonth(d.getMonth() + 6);
    return d.toISOString().split('T')[0];
}

function getDaysUntil(dateStr) {
    if (!dateStr) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
    return diff;
}

export default function VaccinePage() {
    const [pet, setPet] = useState('dog');
    const [tab, setTab] = useState('standard'); // 'standard' | 'custom'
    const [customSchedules, setCustomSchedules] = useState([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [formData, setFormData] = useState({
        petName: '',
        careType: 'vaccine',
        vaccineName: '',
        date: '',
        repeat: 'once',
        customDays: 30,
        note: '',
    });

    // Load custom schedules from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('pet_vaccine_schedules');
        if (saved) {
            try { setCustomSchedules(JSON.parse(saved)); } catch { }
        }
    }, []);

    // Save to localStorage
    useEffect(() => {
        localStorage.setItem('pet_vaccine_schedules', JSON.stringify(customSchedules));
    }, [customSchedules]);

    const schedule = vaccinData[pet] || [];

    const handleAddSchedule = () => {
        if (!formData.petName.trim() || !formData.vaccineName.trim() || !formData.date) return;
        const newItem = {
            id: Date.now(),
            petType: pet,
            petName: formData.petName.trim(),
            careType: formData.careType || 'vaccine',
            vaccineName: formData.vaccineName.trim(),
            date: formData.date,
            repeat: formData.repeat,
            customDays: formData.repeat === 'custom' ? parseInt(formData.customDays) || 30 : null,
            note: formData.note.trim(),
            completed: false,
        };
        setCustomSchedules(prev => [...prev, newItem]);
        setFormData({ petName: '', careType: 'vaccine', vaccineName: '', date: '', repeat: 'once', customDays: 30, note: '' });
        setShowAddForm(false);
    };

    const toggleComplete = (id) => {
        setCustomSchedules(prev =>
            prev.map(s => s.id === id ? { ...s, completed: !s.completed } : s)
        );
    };

    const deleteSchedule = (id) => {
        setCustomSchedules(prev => prev.filter(s => s.id !== id));
    };

    const myPetSchedules = customSchedules.filter(s => s.petType === pet);
    const upcoming = myPetSchedules
        .filter(s => !s.completed)
        .sort((a, b) => new Date(a.date) - new Date(b.date));
    const completed = myPetSchedules.filter(s => s.completed);

    return (
        <div className="vaccine-page">
            <h2>💉 Lịch Tiêm Phòng Vacxin</h2>
            <p className="step-hint">Lịch tiêm chuẩn & lịch riêng cho thú cưng của bạn</p>

            {/* Pet type tabs */}
            <div className="filter-tabs">
                {PET_TABS.map(t => (
                    <button
                        key={t.id}
                        className={`filter-tab ${pet === t.id ? 'active' : ''}`}
                        onClick={() => setPet(t.id)}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Standard / Custom toggle */}
            <div className="filter-tabs" style={{ marginTop: '0.75rem' }}>
                <button
                    className={`filter-tab ${tab === 'standard' ? 'active' : ''}`}
                    onClick={() => setTab('standard')}
                >
                    📋 Lịch chuẩn
                </button>
                <button
                    className={`filter-tab ${tab === 'custom' ? 'active' : ''}`}
                    onClick={() => setTab('custom')}
                >
                    📝 Nhắc việc ({myPetSchedules.length})
                </button>
            </div>

            {/* ── STANDARD SCHEDULE ── */}
            {tab === 'standard' && (
                <div className="vaccine-timeline">
                    {schedule.map((v, i) => (
                        <div key={i} className="vaccine-item">
                            <div className="vaccine-dot" />
                            <div className="vaccine-line" />
                            <div className="vaccine-content">
                                <div className="vaccine-age">{weeksToAge(v.age_weeks)}</div>
                                <div className="vaccine-card">
                                    <h3 className="vaccine-name">
                                        {v.vaccine}
                                        {v.dose === 'yearly' && <span className="vaccine-yearly">🔄 Hàng năm</span>}
                                        {typeof v.dose === 'number' && <span className="vaccine-dose">Mũi {v.dose}</span>}
                                    </h3>
                                    <p className="vaccine-note">{v.note}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── CUSTOM SCHEDULE ── */}
            {tab === 'custom' && (
                <div className="custom-vaccine-section">
                    <button
                        className="btn-primary"
                        style={{ width: '100%', marginBottom: '1rem' }}
                        onClick={() => setShowAddForm(!showAddForm)}
                    >
                        {showAddForm ? '✕ Đóng' : '＋ Thêm lịch tiêm'}
                    </button>

                    {/* Add form */}
                    {showAddForm && (
                        <div className="vaccine-add-form">
                            <div className="form-group">
                                <label>🐾 Tên thú cưng</label>
                                <input
                                    type="text"
                                    placeholder="Ví dụ: Milo, Luna..."
                                    value={formData.petName}
                                    onChange={e => setFormData({ ...formData, petName: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>🏷️ Nhóm chăm sóc</label>
                                <select
                                    className="search-input"
                                    style={{ appearance: 'auto', backgroundColor: 'var(--c-bg-elevated)', padding: '12px' }}
                                    value={formData.careType || 'vaccine'}
                                    onChange={e => setFormData({ ...formData, careType: e.target.value })}
                                >
                                    <option value="vaccine">💉 Tiêm phòng (Vaccine)</option>
                                    <option value="worm">🐛 Tẩy giun</option>
                                    <option value="tick">🦟 Nhỏ gáy / Trị ve rận</option>
                                    <option value="bath">🛁 Tắm rửa / Spa</option>
                                    <option value="vet">🏥 Khám định kỳ</option>
                                    <option value="other">📌 Khác</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>📝 Chi tiết việc làm / Tên thuốc</label>
                                <input
                                    type="text"
                                    placeholder="Ví dụ: 5-in-1, Tẩy drontal, Cắt tỉa lông..."
                                    value={formData.vaccineName}
                                    onChange={e => setFormData({ ...formData, vaccineName: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>📅 Ngày thực hiện</label>
                                <input
                                    type="date"
                                    value={formData.date}
                                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>🔄 Lặp lại</label>
                                <select
                                    value={formData.repeat}
                                    onChange={e => setFormData({ ...formData, repeat: e.target.value })}
                                >
                                    {REPEAT_OPTIONS.map(o => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                            </div>
                            {formData.repeat === 'custom' && (
                                <div className="form-group">
                                    <label>Số ngày lặp lại</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={formData.customDays}
                                        onChange={e => setFormData({ ...formData, customDays: e.target.value })}
                                    />
                                </div>
                            )}
                            <div className="form-group">
                                <label>📝 Ghi chú</label>
                                <input
                                    type="text"
                                    placeholder="Ghi chú thêm..."
                                    value={formData.note}
                                    onChange={e => setFormData({ ...formData, note: e.target.value })}
                                />
                            </div>
                            <button className="btn-primary" onClick={handleAddSchedule}>
                                ✓ Lưu lịch tiêm
                            </button>
                        </div>
                    )}

                    {/* Upcoming */}
                    {upcoming.length > 0 && (
                        <>
                            <h3 className="vaccine-section-title">⏰ Sắp tới</h3>
                            {upcoming.map(s => {
                                const days = getDaysUntil(s.date);
                                const isOverdue = days !== null && days < 0;
                                const isSoon = days !== null && days >= 0 && days <= 7;
                                return (
                                    <div
                                        key={s.id}
                                        className={`custom-vaccine-card ${isOverdue ? 'overdue' : ''} ${isSoon ? 'soon' : ''}`}
                                    >
                                        <div className="cv-header">
                                            <span className="cv-pet">{pet === 'dog' ? '🐕' : '🐈'} {s.petName}</span>
                                            {isOverdue && <span className="cv-badge overdue">Quá hạn!</span>}
                                            {isSoon && !isOverdue && <span className="cv-badge soon">Sắp đến!</span>}
                                        </div>
                                        <div className="cv-vaccine">
                                            {s.careType === 'worm' ? '🐛' :
                                                s.careType === 'tick' ? '🦟' :
                                                    s.careType === 'bath' ? '🛁' :
                                                        s.careType === 'vet' ? '🏥' :
                                                            s.careType === 'other' ? '📌' : '💉'} {s.vaccineName}
                                        </div>
                                        <div className="cv-date">
                                            📅 {formatDate(s.date)}
                                            {days !== null && (
                                                <span className="cv-days">
                                                    {days === 0 ? ' — Hôm nay!' : days > 0 ? ` — còn ${days} ngày` : ` — quá hạn ${Math.abs(days)} ngày`}
                                                </span>
                                            )}
                                        </div>
                                        {s.repeat !== 'once' && (
                                            <div className="cv-repeat">
                                                🔄 {s.repeat === 'yearly' ? 'Hàng năm' : s.repeat === 'half-yearly' ? '6 tháng/lần' : `${s.customDays} ngày/lần`}
                                                {getNextDate(s.date, s.repeat) && (
                                                    <span> — Lần tiếp: {formatDate(getNextDate(s.date, s.repeat))}</span>
                                                )}
                                            </div>
                                        )}
                                        {s.note && <div className="cv-note">📝 {s.note}</div>}
                                        <div className="cv-actions">
                                            <button className="btn-small btn-success" onClick={() => toggleComplete(s.id)}>✓ Đã làm</button>
                                            <button className="btn-small btn-danger" onClick={() => deleteSchedule(s.id)}>✕ Xóa</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </>
                    )}

                    {/* Completed */}
                    {completed.length > 0 && (
                        <>
                            <h3 className="vaccine-section-title" style={{ marginTop: '1.5rem' }}>✅ Đã tiêm</h3>
                            {completed.map(s => (
                                <div key={s.id} className="custom-vaccine-card completed">
                                    <div className="cv-header">
                                        <span className="cv-pet">{pet === 'dog' ? '🐕' : '🐈'} {s.petName}</span>
                                        <span className="cv-badge done">Hoàn thành</span>
                                    </div>
                                    <div className="cv-vaccine">
                                        {s.careType === 'worm' ? '🐛' :
                                            s.careType === 'tick' ? '🦟' :
                                                s.careType === 'bath' ? '🛁' :
                                                    s.careType === 'vet' ? '🏥' :
                                                        s.careType === 'other' ? '📌' : '💉'} {s.vaccineName}
                                    </div>
                                    <div className="cv-date">📅 {formatDate(s.date)}</div>
                                    <div className="cv-actions">
                                        <button className="btn-small" onClick={() => toggleComplete(s.id)}>↩ Hoàn tác</button>
                                        <button className="btn-small btn-danger" onClick={() => deleteSchedule(s.id)}>✕ Xóa</button>
                                    </div>
                                </div>
                            ))}
                        </>
                    )}

                    {myPetSchedules.length === 0 && !showAddForm && (
                        <div className="empty-state">
                            <p>📭 Chưa có lịch tiêm nào</p>
                            <p className="text-muted">Nhấn "Thêm lịch tiêm" để bắt đầu theo dõi</p>
                        </div>
                    )}
                </div>
            )}

            <div className="vaccine-footer">
                <p>⚠️ Lưu ý: Lịch tiêm phòng có thể thay đổi tùy theo tình trạng sức khỏe. Hãy tham khảo ý kiến bác sĩ thú y.</p>
            </div>
        </div>
    );
}
