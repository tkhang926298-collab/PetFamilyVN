import { useState } from 'react';
import { supabase } from '../services/supabase';

// Supabase Auth yêu cầu email, nhưng user chỉ cần nhập username.
// Ta tự gắn domain nội bộ phía sau để tạo "email ảo" cho Supabase.
const FAKE_DOMAIN = '@petismyfamily.app';

export default function AuthPage({ onLogin }) {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const fakeEmail = username.trim().toLowerCase() + FAKE_DOMAIN;

        try {
            if (isLogin) {
                const { data, error: err } = await supabase.auth.signInWithPassword({
                    email: fakeEmail,
                    password,
                });
                if (err) {
                    if (err.message.includes('Invalid login')) {
                        throw new Error('Sai tên đăng nhập hoặc mật khẩu');
                    }
                    throw err;
                }
                onLogin(data.user);
            } else {
                // Đăng ký
                if (username.trim().length < 3) {
                    throw new Error('Tên đăng nhập phải có ít nhất 3 ký tự');
                }
                const { data, error: err } = await supabase.auth.signUp({
                    email: fakeEmail,
                    password,
                    options: {
                        data: { display_name: username.trim() },
                    },
                });
                if (err) {
                    if (err.message.includes('already registered')) {
                        throw new Error('Tên đăng nhập đã tồn tại, hãy chọn tên khác');
                    }
                    throw err;
                }
                if (data.user) {
                    onLogin(data.user);
                }
            }
        } catch (err) {
            setError(err.message || 'Có lỗi xảy ra, vui lòng thử lại');
        }
        setLoading(false);
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-logo">🐾</div>
                <h1 className="auth-title">Pet Is My Family</h1>
                <p className="auth-subtitle">Tra cứu bệnh thú cưng miễn phí</p>

                {/* Tab Login / Register */}
                <div className="auth-tabs">
                    <button
                        className={`auth-tab ${isLogin ? 'active' : ''}`}
                        onClick={() => { setIsLogin(true); setError(''); }}
                    >
                        Đăng Nhập
                    </button>
                    <button
                        className={`auth-tab ${!isLogin ? 'active' : ''}`}
                        onClick={() => { setIsLogin(false); setError(''); }}
                    >
                        Đăng Ký
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    <input
                        type="text"
                        placeholder="Tên đăng nhập"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="auth-input"
                        autoComplete="username"
                        minLength={3}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Mật khẩu (ít nhất 6 ký tự)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="auth-input"
                        autoComplete={isLogin ? 'current-password' : 'new-password'}
                        minLength={6}
                        required
                    />

                    {error && <p className="auth-error">❌ {error}</p>}

                    <button type="submit" className="btn-primary btn-auth" disabled={loading}>
                        {loading ? '⏳ Đang xử lý...' : isLogin ? '🔑 Đăng Nhập' : '📝 Tạo Tài Khoản'}
                    </button>
                </form>

                <p className="auth-footer">
                    {isLogin ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
                    <button className="auth-link" onClick={() => { setIsLogin(!isLogin); setError(''); }}>
                        {isLogin ? 'Đăng ký ngay' : 'Đăng nhập'}
                    </button>
                </p>
            </div>
        </div>
    );
}
