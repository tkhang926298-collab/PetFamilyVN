-- ============================================
-- PATCH: Fix profiles table + user visits + admin stats
-- Chạy riêng file này trong Supabase SQL Editor
-- ============================================

-- 1. Ensure profiles table columns exist (handles schema mismatch)
DO $$
BEGIN
  -- Create table if not exists
  CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    avatar_url TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  
  -- Add missing columns if table existed with old schema
  BEGIN ALTER TABLE public.profiles ADD COLUMN display_name TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.profiles ADD COLUMN is_admin BOOLEAN DEFAULT FALSE; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.profiles ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW(); EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.profiles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW(); EXCEPTION WHEN duplicate_column THEN NULL; END;
END
$$;

-- 2. RLS Policies for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;
CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- 3. Backfill: Insert all existing auth.users into profiles (skip duplicates)
INSERT INTO public.profiles (id, display_name)
SELECT 
  id, 
  COALESCE(
    raw_user_meta_data->>'display_name',
    split_part(email, '@', 1),
    'User ' || substr(id::text, 1, 6)
  )
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- 4. Trigger to auto-create profile for NEW signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'display_name', 'User ' || substr(new.id::text, 1, 6))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. User Visits tracking table (1 row per user per day)
CREATE TABLE IF NOT EXISTS public.user_visits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, visit_date)
);

ALTER TABLE public.user_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users insert own visits" ON public.user_visits;
CREATE POLICY "Users insert own visits" ON public.user_visits
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin read visits" ON public.user_visits;
CREATE POLICY "Admin read visits" ON public.user_visits
  FOR SELECT TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_user_visits_date ON public.user_visits(user_id, visit_date DESC);

-- 6. Rewrite get_admin_stats with active/inactive user split
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS JSONB AS $$
DECLARE
  v_total_users INT;
  v_active_users INT;
  v_inactive_users INT;
  result JSONB;
BEGIN
  -- Total registered users
  SELECT COUNT(*) INTO v_total_users FROM public.profiles;

  -- Active users: >=3 distinct visit days in the last 7 days
  SELECT COUNT(*) INTO v_active_users
  FROM (
    SELECT user_id
    FROM public.user_visits
    WHERE visit_date >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY user_id
    HAVING COUNT(DISTINCT visit_date) >= 3
  ) active;

  v_inactive_users := v_total_users - v_active_users;

  result := jsonb_build_object(
    'total_users', v_total_users,
    'active_users', v_active_users,
    'inactive_users', v_inactive_users
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- Done! Check results:
SELECT COUNT(*) AS profiles_count FROM public.profiles;
