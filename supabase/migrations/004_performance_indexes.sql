-- Database Performance Optimization
-- Add indexes for frequently queried columns

-- Community Posts Indexes
CREATE INDEX IF NOT EXISTS idx_community_posts_created_at
ON community_posts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_posts_user_id
ON community_posts(user_id);

CREATE INDEX IF NOT EXISTS idx_community_posts_moderation_status
ON community_posts(moderation_status)
WHERE moderation_status = 'approved';

-- Danger Zones Indexes
CREATE INDEX IF NOT EXISTS idx_danger_zones_location
ON danger_zones(lat, lon);

CREATE INDEX IF NOT EXISTS idx_danger_zones_status
ON danger_zones(status)
WHERE status = 'approved';

CREATE INDEX IF NOT EXISTS idx_danger_zones_created_at
ON danger_zones(created_at DESC);

-- Diseases Indexes
CREATE INDEX IF NOT EXISTS idx_diseases_disease_id
ON diseases(disease_id);

CREATE INDEX IF NOT EXISTS idx_diseases_species
ON diseases(species);

CREATE INDEX IF NOT EXISTS idx_diseases_name_vi
ON diseases USING gin(to_tsvector('vietnamese', name_vi));

-- Profiles Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_zalo_id
ON profiles(zalo_id);

CREATE INDEX IF NOT EXISTS idx_profiles_created_at
ON profiles(created_at DESC);

-- Transactions Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_id
ON transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_transactions_created_at
ON transactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_type
ON transactions(type);

-- Diagnoses Indexes
CREATE INDEX IF NOT EXISTS idx_diagnoses_user_id
ON diagnoses(user_id);

CREATE INDEX IF NOT EXISTS idx_diagnoses_created_at
ON diagnoses(created_at DESC);

-- Community Comments Indexes
CREATE INDEX IF NOT EXISTS idx_community_comments_post_id
ON community_comments(post_id);

CREATE INDEX IF NOT EXISTS idx_community_comments_created_at
ON community_comments(created_at DESC);

-- Pet Profiles Indexes
CREATE INDEX IF NOT EXISTS idx_pet_profiles_user_id
ON pet_profiles(user_id);

-- Vaccination Reminders Indexes
CREATE INDEX IF NOT EXISTS idx_vaccination_reminders_pet_id
ON vaccination_reminders(pet_profile_id);

CREATE INDEX IF NOT EXISTS idx_vaccination_reminders_due_date
ON vaccination_reminders(due_date)
WHERE completed = false;

-- Optimize RPC function for nearby dangers
CREATE OR REPLACE FUNCTION get_nearby_dangers(
  user_lat DOUBLE PRECISION,
  user_lon DOUBLE PRECISION,
  radius_km DOUBLE PRECISION DEFAULT 1.0
)
RETURNS TABLE (
  id UUID,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  type TEXT,
  description TEXT,
  image_url TEXT,
  distance_km DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    dz.id,
    dz.lat,
    dz.lon,
    dz.type,
    dz.description,
    dz.image_url,
    (
      6371 * acos(
        cos(radians(user_lat)) *
        cos(radians(dz.lat)) *
        cos(radians(dz.lon) - radians(user_lon)) +
        sin(radians(user_lat)) *
        sin(radians(dz.lat))
      )
    ) AS distance_km
  FROM danger_zones dz
  WHERE
    dz.status = 'approved'
    AND (
      6371 * acos(
        cos(radians(user_lat)) *
        cos(radians(dz.lat)) *
        cos(radians(dz.lon) - radians(user_lon)) +
        sin(radians(user_lat)) *
        sin(radians(dz.lat))
      )
    ) <= radius_km
  ORDER BY distance_km ASC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add full-text search function for diseases
CREATE OR REPLACE FUNCTION search_diseases(search_term TEXT)
RETURNS TABLE (
  id UUID,
  disease_id TEXT,
  name_vi TEXT,
  name_en TEXT,
  species TEXT,
  severity TEXT,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.disease_id,
    d.name_vi,
    d.name_en,
    d.species,
    d.severity,
    ts_rank(
      to_tsvector('vietnamese', d.name_vi || ' ' || COALESCE(d.name_en, '')),
      plainto_tsquery('vietnamese', search_term)
    ) AS rank
  FROM diseases d
  WHERE
    to_tsvector('vietnamese', d.name_vi || ' ' || COALESCE(d.name_en, '')) @@
    plainto_tsquery('vietnamese', search_term)
  ORDER BY rank DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql STABLE;

-- Analyze tables for query planner
ANALYZE community_posts;
ANALYZE danger_zones;
ANALYZE diseases;
ANALYZE profiles;
ANALYZE transactions;
ANALYZE diagnoses;
ANALYZE community_comments;
ANALYZE pet_profiles;
ANALYZE vaccination_reminders;
