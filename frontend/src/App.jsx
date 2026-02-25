import { useState, useEffect } from 'react';
import { supabase } from './services/supabase';
import AuthPage from './pages/AuthPage';
import Home from './pages/Home';
import Diagnose from './pages/Diagnose';
import FoodChecker from './pages/FoodChecker';
import VaccinePage from './pages/VaccinePage';
import DangerZone from './pages/DangerZone';
import NutritionLookup from './pages/NutritionLookup';
import Community from './pages/Community';
import Profile from './pages/Profile';
import './index.css';

const TABS = [
  { id: 'home', label: 'Trang Chủ', icon: '🏠' },
  { id: 'diagnose', label: 'Chẩn Đoán', icon: '🩺' },
  { id: 'nutrition', label: 'Dinh Dưỡng', icon: '🥗' },
  { id: 'food', label: 'Thực Phẩm', icon: '🍽️' },
  { id: 'danger', label: 'Cảnh Báo', icon: '⚠️' },
  { id: 'community', label: 'Cộng Đồng', icon: '💬' },
];

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const getTabFromHash = () => {
    const hash = window.location.hash.replace('#', '');
    return hash || 'home';
  };

  const [activeTab, setActiveTab] = useState(getTabFromHash());
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  useEffect(() => {
    const handleHashChange = () => {
      setActiveTab(getTabFromHash());
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (tabId) => {
    window.location.hash = tabId;
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      if (session?.user) setShowDisclaimer(true);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Log daily visit for activity tracking (1 row per user per day)
  useEffect(() => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    supabase.from('user_visits').upsert(
      { user_id: user.id, visit_date: today },
      { onConflict: 'user_id,visit_date', ignoreDuplicates: true }
    ).then(() => { }).catch(() => { });
  }, [user]);

  const handleLogin = (u) => {
    setUser(u);
    setShowDisclaimer(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigateTo('home');
  };

  if (authLoading) {
    return <div className="app"><div className="loading-spinner">⏳ Đang kiểm tra phiên đăng nhập...</div></div>;
  }

  if (!user) {
    return <AuthPage onLogin={handleLogin} />;
  }

  const displayName = user.user_metadata?.display_name || 'User';

  return (
    <div className="app">
      {showDisclaimer && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2>⚠️ Lưu Ý Quan Trọng</h2>
            <p>
              Ứng dụng chỉ mang tính chất <strong>tham khảo</strong>. Kết quả tra cứu
              KHÔNG thay thế được chẩn đoán của bác sĩ thú y chuyên nghiệp.
            </p>
            <p>
              Nếu thú cưng có dấu hiệu <span className="text-urgent">khẩn cấp</span>,
              hãy đưa đến phòng khám thú y ngay lập tức.
            </p>
            <label className="checkbox-label">
              <input type="checkbox" id="disclaimer-agree" />
              Tôi đã đọc và hiểu rõ
            </label>
            <button
              className="btn-primary"
              onClick={() => {
                const cb = document.getElementById('disclaimer-agree');
                if (cb && cb.checked) setShowDisclaimer(false);
              }}
            >
              Bắt Đầu Sử Dụng
            </button>
          </div>
        </div>
      )}

      <header className="header">
        <div className="header-content">
          <span className="logo">🐾 Pet Is My Family</span>
          <div className="header-user">
            <span
              className="user-name"
              style={{ cursor: 'pointer', textDecoration: 'underline' }}
              onClick={() => navigateTo('profile')}
              title="Xem Hồ Sơ"
            >
              👤 {displayName}
            </span>
            <button className="btn-logout" onClick={handleLogout}>Đăng xuất</button>
          </div>
        </div>
      </header>

      <main className="main-content">
        {activeTab === 'home' && <Home onNavigate={navigateTo} />}
        {activeTab === 'diagnose' && <Diagnose />}
        {activeTab === 'nutrition' && <NutritionLookup />}
        {activeTab === 'food' && <FoodChecker />}
        {activeTab === 'danger' && <DangerZone />}
        {activeTab === 'vaccine' && <VaccinePage />}
        {activeTab === 'community' && <Community />}
        {activeTab === 'profile' && <Profile user={user} />}
      </main>

      <nav className="bottom-nav">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => navigateTo(tab.id)}
          >
            <span className="nav-icon">{tab.icon}</span>
            <span className="nav-label">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export default App;
