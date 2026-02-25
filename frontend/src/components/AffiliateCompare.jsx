import affiliateData from '../data/affiliates.json';
import { supabase } from '../services/supabase';

export default function AffiliateCompare({ species, nameEn, nameVi, advice }) {
    if (!species || !nameEn) return null;

    const normalKey = species === "Cat" ? "Normal Cat" : "Normal Dog";
    const normalAff = affiliateData[normalKey];

    let currentAff = affiliateData[nameEn];

    // Fallback using AI suggestion
    if (!currentAff && advice?.product_suggestion_vi) {
        currentAff = {
            suggestion: advice.product_suggestion_vi,
            l1: '', l2: '', l3: ''
        };
    }

    if (!normalAff && !currentAff) return null;

    // Handle normal case differently (no reasoning)
    const isNormal = nameEn === "Normal Cat" || nameEn === "Normal Dog";

    const handleAffiliateClick = async (url) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('analytics').insert({
                    user_id: user.id,
                    event_type: 'affiliate_click',
                    event_data: { url }
                });
            }
        } catch (error) {
            console.error('Error logging click:', error);
        }
    };

    return (
        <div className="affiliate-compare-section">
            <h3>🎁 Gợi ý Sản phẩm</h3>
            <p className="affiliate-desc">
                {isNormal
                    ? "Gắn liền với nhu cầu dinh dưỡng duy trì cho một bé lớn lên khỏe mạnh:"
                    : "So sánh sự khác biệt giữa chế độ ăn duy trì cho thú cưng khỏe mạnh và nguồn dinh dưỡng đặc trị được thiết kế riêng biệt để hỗ trợ tình trạng của bé:"
                }
            </p>

            <div className="affiliate-cards">
                {/* Always show normal card unless we are explicitly diagnosing a normal condition without a comparison needed, but typically we show it as baseline */}
                {normalAff && !isNormal && (
                    <div className="aff-card normal">
                        <div className="aff-badge">🟢 Khỏe mạnh</div>
                        <h4>{normalKey === "Normal Cat" ? "Mèo khỏe mạnh" : "Chó khỏe mạnh"}</h4>
                        <p className="aff-suggestion">
                            <strong>Thức ăn tiêu chuẩn: </strong>
                            {normalAff.suggestion}
                        </p>
                        <div className="aff-links-list mt-3">
                            {normalAff.l1 && (
                                <a href={normalAff.l1} target="_blank" rel="noreferrer" className="aff-product-link" onClick={() => handleAffiliateClick(normalAff.l1)}>
                                    <div className="aff-product-icon">🛒</div>
                                    <div className="aff-product-name">{normalAff.n1 || "Sản phẩm gợi ý 1"}</div>
                                </a>
                            )}
                            {normalAff.l2 && (
                                <a href={normalAff.l2} target="_blank" rel="noreferrer" className="aff-product-link" onClick={() => handleAffiliateClick(normalAff.l2)}>
                                    <div className="aff-product-icon">🛒</div>
                                    <div className="aff-product-name">{normalAff.n2 || "Sản phẩm gợi ý 2"}</div>
                                </a>
                            )}
                            {normalAff.l3 && (
                                <a href={normalAff.l3} target="_blank" rel="noreferrer" className="aff-product-link" onClick={() => handleAffiliateClick(normalAff.l3)}>
                                    <div className="aff-product-icon">🛒</div>
                                    <div className="aff-product-name">{normalAff.n3 || "Sản phẩm gợi ý 3"}</div>
                                </a>
                            )}
                        </div>
                    </div>
                )}

                {currentAff && (
                    <div className={`aff-card ${isNormal ? 'normal' : 'disease'}`} style={isNormal ? { width: '100%' } : {}}>
                        <div className={`aff-badge ${isNormal ? '' : 'warning'}`}>
                            {isNormal ? '🟢 Cơ bản' : '🟡 Đặc trị'}
                        </div>
                        <h4>{nameVi || nameEn}</h4>
                        <div className="aff-suggestion">
                            <p className="mb-2"><strong>Dinh dưỡng: </strong>{currentAff.suggestion}</p>

                            {!isNormal && advice && (
                                <div className="nutrition-reasoning mt-3">
                                    {advice.should_eat?.length > 0 && (
                                        <div className="reasoning-item">
                                            <span className="reasoning-icon">✅</span>
                                            <div className="reasoning-content">
                                                <strong>Nên ưu tiên bổ sung:</strong>
                                                <p>{advice.should_eat.join(', ')}</p>
                                            </div>
                                        </div>
                                    )}
                                    {advice.avoid?.length > 0 && (
                                        <div className="reasoning-item mt-2">
                                            <span className="reasoning-icon">❌</span>
                                            <div className="reasoning-content">
                                                <strong>Tại sao không dùng thức ăn thường dài ngày?</strong>
                                                <p>Thức ăn thường thường chứa các thành phần có thể ảnh hưởng không tốt: {advice.avoid.join(', ')}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="aff-links-list mt-3">
                            {currentAff.l1 && (
                                <a href={currentAff.l1} target="_blank" rel="noreferrer" className={`aff-product-link ${!isNormal ? 'warning' : ''}`} onClick={() => handleAffiliateClick(currentAff.l1)}>
                                    <div className="aff-product-icon">🛒</div>
                                    <div className="aff-product-name">{currentAff.n1 || "Sản phẩm gợi ý 1"}</div>
                                </a>
                            )}
                            {currentAff.l2 && (
                                <a href={currentAff.l2} target="_blank" rel="noreferrer" className={`aff-product-link ${!isNormal ? 'warning' : ''}`} onClick={() => handleAffiliateClick(currentAff.l2)}>
                                    <div className="aff-product-icon">🛒</div>
                                    <div className="aff-product-name">{currentAff.n2 || "Sản phẩm gợi ý 2"}</div>
                                </a>
                            )}
                            {currentAff.l3 && (
                                <a href={currentAff.l3} target="_blank" rel="noreferrer" className={`aff-product-link ${!isNormal ? 'warning' : ''}`} onClick={() => handleAffiliateClick(currentAff.l3)}>
                                    <div className="aff-product-icon">🛒</div>
                                    <div className="aff-product-name">{currentAff.n3 || "Sản phẩm gợi ý 3"}</div>
                                </a>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
