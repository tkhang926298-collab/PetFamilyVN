export default function ConclusionCard({ result, riskMap }) {
    if (!result) return null;

    const risk = result.risk_category || {};
    const riskInfo = riskMap[risk.rating] || riskMap.low_risk;

    return (
        <div className="conclusion-card">
            {/* Risk Badge */}
            <div className="risk-badge" style={{ borderColor: riskInfo.color }}>
                <span className="risk-icon">{riskInfo.icon}</span>
                <span className="risk-label" style={{ color: riskInfo.color }}>{riskInfo.label}</span>
            </div>

            {/* Tên bệnh */}
            {result.name_vi && (
                <h2 className="disease-name">{result.name_vi}</h2>
            )}

            {/* Mô tả */}
            {result.problem_text && (
                <div className="conclusion-section">
                    <h3>📋 Mô Tả</h3>
                    <p>{result.problem_text}</p>
                </div>
            )}

            {/* Risk description */}
            {risk.description && (
                <div className="conclusion-section" style={{ borderLeftColor: riskInfo.color }}>
                    <h3>⚕️ Hướng Dẫn</h3>
                    <p>{risk.description}</p>
                    {risk.text_1 && <p className="text-muted">{risk.text_1}</p>}
                </div>
            )}

            {/* Sơ cứu */}
            {result.first_aid_text && (
                <div className="conclusion-section">
                    <h3>🚑 Sơ Cứu Tại Nhà</h3>
                    <pre className="first-aid-text">{result.first_aid_text}</pre>
                </div>
            )}

            {/* Thuốc */}
            {result.medications_text && (
                <div className="conclusion-section">
                    <h3>💊 Thuốc Thường Dùng</h3>
                    <p>{result.medications_text}</p>
                </div>
            )}

            {/* Dinh dưỡng */}
            {result.nutrition_text && (
                <div className="conclusion-section">
                    <h3>🍽️ Chế Độ Ăn</h3>
                    <p>{result.nutrition_text}</p>
                </div>
            )}

            {/* Travel advice */}
            {result.travel_advice_text && (
                <div className="conclusion-section">
                    <h3>🚗 Di Chuyển</h3>
                    <p>{result.travel_advice_text}</p>
                </div>
            )}

            {/* CTA buttons */}
            <div className="conclusion-actions">
                <button className="btn-danger">📍 Tìm Thú Y Gần Nhất</button>
                <button className="btn-secondary">📄 Lưu Báo Cáo PDF</button>
            </div>
        </div>
    );
}
