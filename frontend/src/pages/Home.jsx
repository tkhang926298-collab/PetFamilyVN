import SupportAdmin from '../components/SupportAdmin';

export default function Home({ onNavigate }) {
    const features = [
        { id: 'diagnose', icon: '🔬', title: 'Tra Cứu Bệnh', desc: 'Tìm hiểu bệnh theo loài, triệu chứng, mức độ nguy hiểm' },
        { id: 'nutrition', icon: '🥗', title: 'Dinh Dưỡng', desc: 'Tra cứu dinh dưỡng và tính toán Calo mỗi ngày' },
        { id: 'food', icon: '🍽️', title: 'Thực Phẩm', desc: 'Kiểm tra thực phẩm an toàn hay độc hại cho thú cưng' },
        { id: 'vaccine', icon: '📅', title: 'Lịch Sức Khoẻ', desc: 'Sổ tay theo dõi tiêm phòng, tẩy giun, nhỏ gáy' },
        { id: 'danger', icon: '⚠️', title: 'Cảnh Báo Bả', desc: 'Bản đồ cảnh báo khu vực có bả, kiểm tra an toàn' },
        { id: 'community', icon: '💬', title: 'Cộng Đồng', desc: 'Chia sẻ kinh nghiệm, góp ý và hỏi đáp' },
    ];

    return (
        <div className="home-page">
            <div className="hero">
                <h1>🐾 Pet Is My Family</h1>
                <p>Tra cứu bệnh thú cưng miễn phí — Bảo vệ bé yêu của bạn</p>
                <button className="btn-primary btn-lg" onClick={() => onNavigate('diagnose')}>
                    🩺 Bắt Đầu Chẩn Đoán
                </button>
            </div>

            <div className="features-grid">
                {features.map(f => (
                    <button key={f.id} className="feature-card" onClick={() => onNavigate(f.id)}>
                        <span className="feature-icon">{f.icon}</span>
                        <h3>{f.title}</h3>
                        <p>{f.desc}</p>
                    </button>
                ))}
            </div>

            <SupportAdmin />

            <div className="home-footer mt-4">
                <p className="disclaimer-text">
                    ⚠️ Ứng dụng chỉ tham khảo, không thay thế bác sĩ thú y.
                </p>
                <p className="contributor-text" style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#6366F1' }}>
                    💡 Khuyến khích các bạn có kiến thức về y khoa thú cưng góp ý để mình hoàn thiện web tốt hơn!
                </p>
                <p className="contact-text" style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: '#888' }}>
                    📧 Liên hệ Admin: <strong>Tuấn</strong> — <a href="mailto:tuansu2808@gmail.com" style={{ color: '#3B82F6' }}>tuansu2808@gmail.com</a>
                </p>
            </div>
        </div>
    );
}
