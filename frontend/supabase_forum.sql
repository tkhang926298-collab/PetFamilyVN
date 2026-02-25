-- ============================================
-- Pet Is My Family — Forum + Messaging + Feedback + DangerZones
-- Chạy trên Supabase Dashboard → SQL Editor
-- ============================================

-- 1. FORUM TOPICS (Threads)
CREATE TABLE IF NOT EXISTS forum_topics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'Ẩn danh',
  title TEXT NOT NULL CHECK (char_length(title) <= 200),
  content TEXT NOT NULL CHECK (char_length(content) <= 5000),
  pet_type TEXT NOT NULL DEFAULT 'general' CHECK (pet_type IN ('dog', 'cat', 'general')),
  category TEXT NOT NULL DEFAULT 'question' CHECK (category IN ('question', 'share', 'guide')),
  image_url TEXT,
  likes_count INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE forum_topics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read topics" ON forum_topics;
CREATE POLICY "Public read topics" ON forum_topics FOR SELECT USING (true);
DROP POLICY IF EXISTS "Auth insert topics" ON forum_topics;
CREATE POLICY "Auth insert topics" ON forum_topics FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Owner update topics" ON forum_topics;
CREATE POLICY "Owner update topics" ON forum_topics FOR UPDATE TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Owner delete topics" ON forum_topics;
CREATE POLICY "Owner delete topics" ON forum_topics FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 2. FORUM COMMENTS
CREATE TABLE IF NOT EXISTS forum_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_id UUID NOT NULL REFERENCES forum_topics(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'Ẩn danh',
  content TEXT NOT NULL CHECK (char_length(content) <= 2000),
  image_url TEXT,
  parent_comment_id UUID REFERENCES forum_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE forum_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read comments" ON forum_comments;
CREATE POLICY "Public read comments" ON forum_comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Auth insert comments" ON forum_comments;
CREATE POLICY "Auth insert comments" ON forum_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Owner delete comments" ON forum_comments;
CREATE POLICY "Owner delete comments" ON forum_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 3. TOPIC LIKES
CREATE TABLE IF NOT EXISTS topic_likes (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES forum_topics(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, topic_id)
);

ALTER TABLE topic_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read likes" ON topic_likes;
CREATE POLICY "Public read likes" ON topic_likes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Auth insert likes" ON topic_likes;
CREATE POLICY "Auth insert likes" ON topic_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Auth delete likes" ON topic_likes;
CREATE POLICY "Auth delete likes" ON topic_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 4. USER FEEDBACK (Góp ý)
CREATE TABLE IF NOT EXISTS user_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'Ẩn danh',
  type TEXT NOT NULL DEFAULT 'suggestion' CHECK (type IN ('suggestion', 'bug', 'other')),
  content TEXT NOT NULL CHECK (char_length(content) <= 1000),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'read', 'resolved')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read feedback" ON user_feedback;
CREATE POLICY "Public read feedback" ON user_feedback FOR SELECT USING (true);
DROP POLICY IF EXISTS "Auth insert feedback" ON user_feedback;
CREATE POLICY "Auth insert feedback" ON user_feedback FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Owner delete feedback" ON user_feedback;
CREATE POLICY "Owner delete feedback" ON user_feedback FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 5. DANGER ZONES (thay localStorage)
CREATE TABLE IF NOT EXISTS danger_zones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reporter_name TEXT NOT NULL DEFAULT 'Ẩn danh',
  name TEXT NOT NULL,
  description TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  radius INT NOT NULL DEFAULT 500,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE danger_zones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read zones" ON danger_zones;
CREATE POLICY "Public read zones" ON danger_zones FOR SELECT USING (true);
DROP POLICY IF EXISTS "Auth insert zones" ON danger_zones;
CREATE POLICY "Auth insert zones" ON danger_zones FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Owner delete zones" ON danger_zones;
CREATE POLICY "Owner delete zones" ON danger_zones FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 6. PRIVATE MESSAGES
CREATE TABLE IF NOT EXISTS private_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL DEFAULT 'Ẩn danh',
  content TEXT CHECK (char_length(content) <= 2000),
  image_url TEXT,
  sticker TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE private_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read own messages" ON private_messages;
CREATE POLICY "Read own messages" ON private_messages FOR SELECT TO authenticated 
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
DROP POLICY IF EXISTS "Send messages" ON private_messages;
CREATE POLICY "Send messages" ON private_messages FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = sender_id);
DROP POLICY IF EXISTS "Delete own sent" ON private_messages;
CREATE POLICY "Delete own sent" ON private_messages FOR DELETE TO authenticated 
  USING (auth.uid() = sender_id);

-- 7. INDEXES for performance
CREATE INDEX IF NOT EXISTS idx_forum_topics_created ON forum_topics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_topics_pet ON forum_topics(pet_type);
CREATE INDEX IF NOT EXISTS idx_forum_comments_topic ON forum_comments(topic_id, created_at);
CREATE INDEX IF NOT EXISTS idx_danger_zones_location ON danger_zones(lat, lng);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON private_messages(receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON private_messages(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON user_feedback(status, created_at DESC);

-- 8. FUNCTION: increment comments_count
CREATE OR REPLACE FUNCTION increment_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE forum_topics SET comments_count = comments_count + 1 WHERE id = NEW.topic_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_comment_insert ON forum_comments;
CREATE TRIGGER on_comment_insert
  AFTER INSERT ON forum_comments
  FOR EACH ROW EXECUTE FUNCTION increment_comments_count();

-- 9. FUNCTION: decrement comments_count
CREATE OR REPLACE FUNCTION decrement_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE forum_topics SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.topic_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_comment_delete ON forum_comments;
CREATE TRIGGER on_comment_delete
  AFTER DELETE ON forum_comments
  FOR EACH ROW EXECUTE FUNCTION decrement_comments_count();

-- 10. STORAGE BUCKET for images
-- Create buckets (only run if they don't exist — or create via Dashboard)
INSERT INTO storage.buckets (id, name, public)
VALUES ('forum-images', 'forum-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('message-images', 'message-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('danger-images', 'danger-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: authenticated users can upload, everyone can read
-- Forum images
DROP POLICY IF EXISTS "Public read forum-images" ON storage.objects;
CREATE POLICY "Public read forum-images" ON storage.objects FOR SELECT
  USING (bucket_id = 'forum-images');

DROP POLICY IF EXISTS "Auth upload forum-images" ON storage.objects;
CREATE POLICY "Auth upload forum-images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'forum-images');

DROP POLICY IF EXISTS "Owner delete forum-images" ON storage.objects;
CREATE POLICY "Owner delete forum-images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'forum-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Message images
DROP POLICY IF EXISTS "Public read message-images" ON storage.objects;
CREATE POLICY "Public read message-images" ON storage.objects FOR SELECT
  USING (bucket_id = 'message-images');

DROP POLICY IF EXISTS "Auth upload message-images" ON storage.objects;
CREATE POLICY "Auth upload message-images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'message-images');

-- Danger images
DROP POLICY IF EXISTS "Public read danger-images" ON storage.objects;
CREATE POLICY "Public read danger-images" ON storage.objects FOR SELECT
  USING (bucket_id = 'danger-images');

DROP POLICY IF EXISTS "Auth upload danger-images" ON storage.objects;
CREATE POLICY "Auth upload danger-images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'danger-images');

-- ============================================
-- 11. IMAGE UPLOAD LOGS (Anti-spam: 10 images/day per user)
-- ============================================
CREATE TABLE IF NOT EXISTS image_upload_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE image_upload_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own logs" ON image_upload_logs;
CREATE POLICY "Users read own logs" ON image_upload_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own logs" ON image_upload_logs;
CREATE POLICY "Users insert own logs" ON image_upload_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_image_logs_user_date ON image_upload_logs(user_id, created_at DESC);

-- ============================================
-- 12. ADMIN MODERATION — Update DELETE policies
-- Admin account email: admin@... (prefix = 'admin')
-- Run these AFTER the initial schema creation above.
-- These DROP + CREATE replace the owner-only delete policies.
-- ============================================

-- Helper: check if current user is admin (via user_metadata.is_admin flag)
-- Admin is granted via: python utils/grant_admin.py grant <username>
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT COALESCE((raw_user_meta_data->>'is_admin')::boolean, false)
    FROM auth.users
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Topics: owner OR admin can delete
DROP POLICY IF EXISTS "Owner delete topics" ON forum_topics;
DROP POLICY IF EXISTS "Owner or admin delete topics" ON forum_topics;
CREATE POLICY "Owner or admin delete topics" ON forum_topics FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR is_admin());

-- Comments: owner OR admin can delete
DROP POLICY IF EXISTS "Owner delete comments" ON forum_comments;
DROP POLICY IF EXISTS "Owner or admin delete comments" ON forum_comments;
CREATE POLICY "Owner or admin delete comments" ON forum_comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR is_admin());

-- Feedback: owner OR admin can delete
DROP POLICY IF EXISTS "Owner delete feedback" ON user_feedback;
DROP POLICY IF EXISTS "Owner or admin delete feedback" ON user_feedback;
CREATE POLICY "Owner or admin delete feedback" ON user_feedback FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR is_admin());

-- Danger zones: owner OR admin can delete
DROP POLICY IF EXISTS "Owner delete zones" ON danger_zones;
DROP POLICY IF EXISTS "Owner or admin delete zones" ON danger_zones;
CREATE POLICY "Owner or admin delete zones" ON danger_zones FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR is_admin());

-- Likes: admin can also delete (for topic cleanup)
DROP POLICY IF EXISTS "Auth delete likes" ON topic_likes;
DROP POLICY IF EXISTS "Owner or admin delete likes" ON topic_likes;
CREATE POLICY "Owner or admin delete likes" ON topic_likes FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR is_admin());

-- ============================================
-- 13. ADMIN INSERT — allow admin to insert topics/comments/feedback
-- Also fix INSERT policies to be more permissive for authenticated users
-- ============================================

-- Topics: any authenticated user can insert (fix RLS for topic creation)
DROP POLICY IF EXISTS "Auth insert topics" ON forum_topics;
CREATE POLICY "Auth insert topics" ON forum_topics FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Comments: any authenticated user can insert
DROP POLICY IF EXISTS "Auth insert comments" ON forum_comments;
CREATE POLICY "Auth insert comments" ON forum_comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Feedback: any authenticated user can insert
DROP POLICY IF EXISTS "Auth insert feedback" ON user_feedback;
CREATE POLICY "Auth insert feedback" ON user_feedback FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Danger zones: any authenticated user can insert
DROP POLICY IF EXISTS "Auth insert zones" ON danger_zones;
CREATE POLICY "Auth insert zones" ON danger_zones FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 14. USER PROFILES
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;
CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles 
  FOR UPDATE TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Trigger to create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'display_name', 'User ' || substr(new.id::text, 1, 6)));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 15. AVATARS STORAGE BUCKET
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
CREATE POLICY "Public read avatars" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Auth upload avatars" ON storage.objects;
CREATE POLICY "Auth upload avatars" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Owner update/delete avatars" ON storage.objects;
CREATE POLICY "Owner update/delete avatars" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Owner update/delete avatars delete" ON storage.objects;
CREATE POLICY "Owner update/delete avatars delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================
-- 16. ANALYTICS & ADMIN STATS
-- ============================================
CREATE TABLE IF NOT EXISTS public.analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Auth insert analytics" ON public.analytics;
CREATE POLICY "Auth insert analytics" ON public.analytics FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin read analytics" ON public.analytics;
CREATE POLICY "Admin read analytics" ON public.analytics FOR SELECT TO authenticated
  USING (is_admin());

-- RPC Function for Admin Stats
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS JSONB AS $$
DECLARE
  total_users INT;
  total_affiliate_clicks INT;
  result JSONB;
BEGIN
  -- Security check
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT COUNT(*) INTO total_users FROM public.profiles;
  SELECT COUNT(*) INTO total_affiliate_clicks FROM public.analytics WHERE event_type = 'affiliate_click';

  result := jsonb_build_object(
    'total_users', total_users,
    'total_affiliate_clicks', total_affiliate_clicks
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
