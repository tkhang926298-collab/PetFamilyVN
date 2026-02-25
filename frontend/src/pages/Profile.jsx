import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { uploadToImgBB } from '../services/imgbb';

export default function Profile({ user }) {
    const [profile, setProfile] = useState(null);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [newName, setNewName] = useState('');
    const [profileError, setProfileError] = useState(null);

    useEffect(() => {
        if (!user) return;
        fetchProfile();
        logDailyVisit();
    }, [user]);

    const logDailyVisit = async () => {
        try {
            await supabase.from('user_visits').upsert(
                { user_id: user.id, visit_date: new Date().toISOString().split('T')[0] },
                { onConflict: 'user_id,visit_date', ignoreDuplicates: true }
            );
        } catch (e) { /* silent */ }
    };

    const fetchProfile = async () => {
        try {
            setLoading(true);
            setProfileError(null);

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle();

            if (error) {
                console.error('Lỗi truy vấn profiles:', error);
                setProfileError(error.message || error.code);
                if (user?.user_metadata?.is_admin === true) fetchAdminStats();
                return;
            }

            if (!data) {
                const fallbackName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User';
                const { data: newProfile, error: insertError } = await supabase
                    .from('profiles')
                    .insert({ id: user.id, display_name: fallbackName })
                    .select()
                    .single();

                if (insertError) {
                    console.error('Lỗi tạo profile:', insertError);
                    setProfileError('Không thể tạo hồ sơ. Hãy chạy file supabase_patch_profiles.sql');
                    if (user?.user_metadata?.is_admin === true) fetchAdminStats();
                    return;
                }

                setProfile(newProfile);
                setNewName(newProfile.display_name || '');
            } else {
                setProfile(data);
                setNewName(data.display_name || '');
            }

            if (user?.user_metadata?.is_admin === true) fetchAdminStats();

        } catch (error) {
            console.error('Lỗi tải profile:', error);
            setProfileError(error.message);
            if (user?.user_metadata?.is_admin === true) fetchAdminStats();
        } finally {
            setLoading(false);
        }
    };

    const fetchAdminStats = async () => {
        try {
            const { data, error } = await supabase.rpc('get_admin_stats');
            if (error) { console.error('Lỗi stats:', error); return; }
            setStats(data);
        } catch (error) {
            console.error('Lỗi stats:', error);
        }
    };

    const handleUpdateName = async () => {
        if (!newName.trim()) return;
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ display_name: newName, updated_at: new Date() })
                .eq('id', user.id);
            if (error) throw error;
            setProfile({ ...profile, display_name: newName });
            alert('Cập nhật tên thành công!');
        } catch (error) {
            alert('Lỗi cập nhật tên: ' + error.message);
        }
    };

    const handleUploadAvatar = async (e) => {
        try {
            setUploading(true);
            const file = e.target.files[0];
            if (!file) return;

            // Upload to imgBB instead of Supabase Storage
            const publicUrl = await uploadToImgBB(file);

            // Update profile with the imgBB URL
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl, updated_at: new Date() })
                .eq('id', user.id);

            if (updateError) throw updateError;

            setProfile({ ...profile, avatar_url: publicUrl });
            alert('Cập nhật avatar thành công!');

        } catch (error) {
            alert('Lỗi tải ảnh lên: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    if (loading) return <div className="p-4 text-center">⏳ Đang tải hồ sơ...</div>;

    const safeProfile = profile || {};

    return (
        <div className="profile-page max-w-2xl mx-auto p-4">
            <h2 className="mb-4">Hồ Sơ Của Bạn</h2>

            {profileError && (
                <div className="alert alert-warning mb-4" style={{ background: '#fef3cd', padding: '12px 16px', borderRadius: '8px', border: '1px solid #ffc107', color: '#856404' }}>
                    ⚠️ {profileError}
                </div>
            )}

            <div className="card mb-4" style={{ opacity: profile ? 1 : 0.5 }}>
                <div className="flex items-center gap-4 mb-4">
                    <img
                        src={safeProfile.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`}
                        alt="Avatar"
                        style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', background: '#e2e8f0' }}
                    />
                    <div>
                        <label className="btn-secondary text-sm cursor-pointer inline-block mt-2">
                            {uploading ? '⏳ Đang tải...' : '📷 Đổi Ảnh Đại Diện'}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleUploadAvatar}
                                disabled={uploading || !profile}
                                style={{ display: 'none' }}
                            />
                        </label>
                    </div>
                </div>

                <div className="form-group mb-3">
                    <label>Tên Hiển Thị</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            className="input-field"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            disabled={!profile}
                        />
                        <button className="btn-primary" onClick={handleUpdateName} disabled={!profile}>Lưu</button>
                    </div>
                </div>
                <p className="text-muted text-sm">Tên này sẽ hiển thị khi bạn đăng bài hoặc bình luận trong Cộng Đồng.</p>
            </div>

            {user?.user_metadata?.is_admin === true && (
                <div className="card admin-stats-card" style={{ borderLeft: '4px solid var(--primary)' }}>
                    <h3 className="flex items-center gap-2 mb-3">🛡️ Bảng Điều Khiển Admin</h3>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="stat-box p-3 bg-gray-50 rounded" style={{ textAlign: 'center' }}>
                            <div className="text-muted text-sm">Tổng User</div>
                            <div className="text-xl font-bold">{stats?.total_users ?? '—'}</div>
                        </div>
                        <div className="stat-box p-3 rounded" style={{ textAlign: 'center', background: '#d4edda' }}>
                            <div className="text-sm" style={{ color: '#155724' }}>🟢 Hoạt động</div>
                            <div className="text-xl font-bold" style={{ color: '#155724' }}>{stats?.active_users ?? '—'}</div>
                            <div className="text-xs text-muted">≥3 ngày/tuần</div>
                        </div>
                        <div className="stat-box p-3 rounded" style={{ textAlign: 'center', background: '#f8d7da' }}>
                            <div className="text-sm" style={{ color: '#721c24' }}>⚪ Ít hoạt động</div>
                            <div className="text-xl font-bold" style={{ color: '#721c24' }}>{stats?.inactive_users ?? '—'}</div>
                            <div className="text-xs text-muted">&lt;3 ngày/tuần</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
