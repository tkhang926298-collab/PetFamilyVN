-- Pet Is My Family Database Schema
-- Phase 1: Foundation Tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PROFILES TABLE (User Management)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zalo_id TEXT UNIQUE,
  email TEXT,
  name TEXT,
  avatar TEXT,
  xu_balance INTEGER DEFAULT 10,
  ip_hash TEXT,
  device_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_profiles_zalo_id ON profiles(zalo_id);
CREATE INDEX idx_profiles_ip_hash ON profiles(ip_hash);

-- ============================================
-- 2. TRANSACTIONS TABLE (Xu System)
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  money_amount INTEGER DEFAULT 0,
  type TEXT NOT NULL CHECK (type IN ('DEPOSIT', 'USAGE', 'BONUS', 'REFUND')),
  description TEXT,
  status TEXT DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);

-- ============================================
-- 3. DISEASES TABLE (Disease Database)
-- ============================================
CREATE TABLE IF NOT EXISTS diseases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  disease_id TEXT UNIQUE NOT NULL,
  disease_name_vi TEXT NOT NULL,
  disease_name_en TEXT,
  keywords TEXT[],
  symptoms_vi TEXT,
  treatment_vi TEXT,
  visual_desc TEXT,
  prescription_otc TEXT,
  prescription_rx TEXT,
  questions JSONB,
  cloudinary_links JSONB,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_diseases_disease_id ON diseases(disease_id);
CREATE INDEX idx_diseases_keywords ON diseases USING GIN(keywords);
CREATE INDEX idx_diseases_status ON diseases(status);

-- ============================================
-- 4. DIAGNOSES TABLE (User Diagnosis History)
-- ============================================
CREATE TABLE IF NOT EXISTS diagnoses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  disease_id UUID REFERENCES diseases(id),
  image_url TEXT,
  description TEXT,
  ai_result JSONB,
  confidence_score DECIMAL(3,2),
  questions_answers JSONB,
  xu_spent INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_diagnoses_user_id ON diagnoses(user_id);
CREATE INDEX idx_diagnoses_created_at ON diagnoses(created_at DESC);

-- ============================================
-- 5. DANGER_ZONES TABLE (Community Map)
-- ============================================
CREATE TABLE IF NOT EXISTS danger_zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  lat DECIMAL(10, 8) NOT NULL,
  lon DECIMAL(11, 8) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('poison', 'thief', 'danger')),
  description TEXT,
  image_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_danger_zones_lat_lon ON danger_zones(lat, lon);
CREATE INDEX idx_danger_zones_type ON danger_zones(type);
CREATE INDEX idx_danger_zones_status ON danger_zones(status);

-- ============================================
-- 6. COMMUNITY_POSTS TABLE (Forum)
-- ============================================
CREATE TABLE IF NOT EXISTS community_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title TEXT,
  content TEXT NOT NULL,
  image_url TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  moderation_status TEXT DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  moderation_reason TEXT,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_community_posts_created_at ON community_posts(created_at DESC);
CREATE INDEX idx_community_posts_moderation_status ON community_posts(moderation_status);

-- ============================================
-- 7. COMMUNITY_COMMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS community_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  is_anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_community_comments_post_id ON community_comments(post_id);
CREATE INDEX idx_community_comments_created_at ON community_comments(created_at DESC);

-- ============================================
-- 8. PET_PROFILES TABLE (Premium Feature)
-- ============================================
CREATE TABLE IF NOT EXISTS pet_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  species TEXT NOT NULL CHECK (species IN ('dog', 'cat', 'other')),
  breed TEXT,
  birth_date DATE,
  weight DECIMAL(5,2),
  avatar_url TEXT,
  medical_history JSONB,
  vaccination_records JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_pet_profiles_user_id ON pet_profiles(user_id);

-- ============================================
-- 9. VACCINATION_REMINDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS vaccination_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pet_id UUID REFERENCES pet_profiles(id) ON DELETE CASCADE,
  vaccine_name TEXT NOT NULL,
  vaccine_name_vi TEXT,
  scheduled_date DATE NOT NULL,
  reminder_sent BOOLEAN DEFAULT false,
  completed BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_vaccination_reminders_pet_id ON vaccination_reminders(pet_id);
CREATE INDEX idx_vaccination_reminders_scheduled_date ON vaccination_reminders(scheduled_date);
CREATE INDEX idx_vaccination_reminders_reminder_sent ON vaccination_reminders(reminder_sent);
