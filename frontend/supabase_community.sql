-- ============================================
-- Supabase: Tạo bảng community_posts
-- Chạy trong SQL Editor của Supabase Dashboard:
--   https://supabase.com/dashboard → SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS community_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'Ẩn danh',
  content TEXT NOT NULL CHECK (char_length(content) <= 500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bật Row Level Security
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;

-- Ai cũng đọc được
CREATE POLICY "Public read" ON community_posts
  FOR SELECT USING (true);

-- Chỉ user đã login mới đăng bài
CREATE POLICY "Authenticated insert" ON community_posts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Chỉ xóa bài của chính mình
CREATE POLICY "Owner delete" ON community_posts
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
