import React from 'react';
import { supabase } from '../services/supabase';

export default function SupportAdmin() {
    const handleAffiliateClick = async (url) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                await supabase.from('analytics').insert({
                    user_id: session.user.id,
                    event_type: 'affiliate_click',
                    event_data: { url }
                });
            }
        } catch (error) {
            console.error('Lỗi khi lưu thống kê click:', error);
        }
    };

    const affiliateLinks = [
        { url: 'https://s.shopee.vn/7fUdRGgD39', name: 'Sản phẩm 1' },
        { url: 'https://s.shopee.vn/3B2E4yBPsr', name: 'Sản phẩm 2' },
        { url: 'https://s.shopee.vn/7VBDEu4wJe', name: 'Sản phẩm 3' },
        { url: 'https://s.shopee.vn/5fjZ3Uqex5', name: 'Sản phẩm 4' }
    ];

    return (
        <div className="card mt-4 support-admin-card text-center">
            <h3>☕ Ủng Hộ Admin</h3>
            <p className="text-muted text-sm mb-3">
                Nếu bạn thấy sản phẩm thực sự hữu ích, bạn có thể ủng hộ admin một cốc cafe nhé!
            </p>

            <div className="qr-container mb-4" style={{ display: 'flex', justifyContent: 'center' }}>
                <img
                    src="/assets/images/qr-admin.jpg"
                    alt="VietQR Admin"
                    style={{ maxWidth: '250px', borderRadius: '12px', border: '1px solid var(--border)' }}
                    onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://placehold.co/250x250/e2e8f0/1e293b?text=QR+Code+Admin';
                    }}
                />
            </div>

            <p className="text-muted text-sm mb-3">
                Hoặc nếu các bạn cần mua đồ cho thú cưng thì có thể ủng hộ admin mua qua các link bên dưới này để admin có tý affiliate nha!
            </p>

            <div className="aff-links-list">
                {affiliateLinks.map((link, idx) => (
                    <a
                        key={idx}
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="aff-product-link"
                        onClick={() => handleAffiliateClick(link.url)}
                    >
                        <div className="aff-product-icon">🛒</div>
                        <div className="aff-product-name">{link.name} (Shopee)</div>
                    </a>
                ))}
            </div>
        </div>
    );
}
