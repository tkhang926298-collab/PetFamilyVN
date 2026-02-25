// Constants cho toàn bộ ứng dụng
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export const COLORS = {
    primary: '#6366F1',      // Indigo
    secondary: '#8B5CF6',    // Violet
    accent: '#06B6D4',       // Cyan
    success: '#22C55E',      // Green (affiliate hợp)
    danger: '#EF4444',       // Red (affiliate không hợp)
    warning: '#F59E0B',      // Amber
    urgent: '#DC2626',       // Đỏ khẩn cấp
    non_urgent: '#F59E0B',   // Vàng cần thăm khám
    low_risk: '#22C55E',     // Xanh nhẹ
    bg: '#0F172A',           // Dark bg
    surface: '#1E293B',      // Card bg
    text: '#F8FAFC',         // Text chính
    muted: '#94A3B8',        // Text phụ
};

export const RISK_MAP = {
    urgent: { label: 'Khẩn cấp', color: COLORS.urgent, icon: '🔴' },
    non_urgent: { label: 'Cần thăm khám', color: COLORS.non_urgent, icon: '🟡' },
    low_risk: { label: 'Nhẹ', color: COLORS.low_risk, icon: '🟢' },
};

export const PET_TYPES = [
    { id: 'dog', name: 'Chó', emoji: '🐕' },
    { id: 'cat', name: 'Mèo', emoji: '🐈' },
];
