-- Row Level Security Policies

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnoses ENABLE ROW LEVEL SECURITY;
ALTER TABLE danger_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vaccination_reminders ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read/update their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Transactions: Users can view their own transactions
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Diagnoses: Users can view/insert their own diagnoses
CREATE POLICY "Users can view own diagnoses" ON diagnoses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own diagnoses" ON diagnoses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Danger Zones: Anyone can view approved, users can insert
CREATE POLICY "Anyone can view approved danger zones" ON danger_zones
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Authenticated users can insert danger zones" ON danger_zones
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Community Posts: Anyone can view approved, users can insert
CREATE POLICY "Anyone can view approved posts" ON community_posts
  FOR SELECT USING (moderation_status = 'approved');

CREATE POLICY "Authenticated users can insert posts" ON community_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Community Comments: Anyone can view, users can insert
CREATE POLICY "Anyone can view comments" ON community_comments
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert comments" ON community_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Pet Profiles: Users can manage their own pets
CREATE POLICY "Users can view own pets" ON pet_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pets" ON pet_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pets" ON pet_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pets" ON pet_profiles
  FOR DELETE USING (auth.uid() = user_id);

-- Vaccination Reminders: Users can view reminders for their pets
CREATE POLICY "Users can view own pet reminders" ON vaccination_reminders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pet_profiles
      WHERE pet_profiles.id = vaccination_reminders.pet_id
      AND pet_profiles.user_id = auth.uid()
    )
  );

-- Diseases: Public read access
CREATE POLICY "Anyone can view active diseases" ON diseases
  FOR SELECT USING (status = 'active');
