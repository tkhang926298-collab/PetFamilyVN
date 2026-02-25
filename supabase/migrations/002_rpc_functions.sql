-- RPC Functions for Pet Is My Family

-- ============================================
-- Function: use_credits (Deduct xu safely)
-- ============================================
CREATE OR REPLACE FUNCTION use_credits(u_id UUID, cost INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  current_bal INTEGER;
BEGIN
  -- Lock row for update
  SELECT xu_balance INTO current_bal
  FROM profiles
  WHERE id = u_id
  FOR UPDATE;

  -- Check if enough balance
  IF current_bal >= cost THEN
    -- Deduct xu
    UPDATE profiles
    SET xu_balance = xu_balance - cost,
        updated_at = NOW()
    WHERE id = u_id;

    -- Log transaction
    INSERT INTO transactions (user_id, amount, type, description, status)
    VALUES (u_id, -cost, 'USAGE', 'AI Diagnosis', 'COMPLETED');

    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Function: add_credits (Add xu - admin only)
-- ============================================
CREATE OR REPLACE FUNCTION add_credits(u_id UUID, amount INTEGER, reason TEXT DEFAULT 'Manual Add')
RETURNS BOOLEAN AS $$
BEGIN
  -- Add xu
  UPDATE profiles
  SET xu_balance = xu_balance + amount,
      updated_at = NOW()
  WHERE id = u_id;

  -- Log transaction
  INSERT INTO transactions (user_id, amount, type, description, status)
  VALUES (u_id, amount, 'BONUS', reason, 'COMPLETED');

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Function: get_nearby_dangers (Geospatial query)
-- ============================================
CREATE OR REPLACE FUNCTION get_nearby_dangers(
  user_lat DECIMAL,
  user_lon DECIMAL,
  radius_km DECIMAL DEFAULT 1.0
)
RETURNS TABLE (
  id UUID,
  lat DECIMAL,
  lon DECIMAL,
  type TEXT,
  description TEXT,
  distance_km DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    dz.id,
    dz.lat,
    dz.lon,
    dz.type,
    dz.description,
    ROUND(
      (6371 * acos(
        cos(radians(user_lat)) * cos(radians(dz.lat)) *
        cos(radians(dz.lon) - radians(user_lon)) +
        sin(radians(user_lat)) * sin(radians(dz.lat))
      ))::NUMERIC,
      2
    ) AS distance_km
  FROM danger_zones dz
  WHERE dz.status = 'approved'
  AND (
    6371 * acos(
      cos(radians(user_lat)) * cos(radians(dz.lat)) *
      cos(radians(dz.lon) - radians(user_lon)) +
      sin(radians(user_lat)) * sin(radians(dz.lat))
    )
  ) <= radius_km
  ORDER BY distance_km;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Function: search_diseases (Full-text search)
-- ============================================
CREATE OR REPLACE FUNCTION search_diseases(search_term TEXT)
RETURNS TABLE (
  id UUID,
  disease_id TEXT,
  disease_name_vi TEXT,
  symptoms_vi TEXT,
  relevance REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.disease_id,
    d.disease_name_vi,
    d.symptoms_vi,
    ts_rank(
      to_tsvector('simple', COALESCE(d.disease_name_vi, '') || ' ' || COALESCE(d.symptoms_vi, '')),
      plainto_tsquery('simple', search_term)
    ) AS relevance
  FROM diseases d
  WHERE d.status = 'active'
  AND (
    to_tsvector('simple', COALESCE(d.disease_name_vi, '') || ' ' || COALESCE(d.symptoms_vi, ''))
    @@ plainto_tsquery('simple', search_term)
    OR search_term = ANY(d.keywords)
  )
  ORDER BY relevance DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Function: get_user_diagnosis_history
-- ============================================
CREATE OR REPLACE FUNCTION get_user_diagnosis_history(u_id UUID, limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  id UUID,
  disease_name TEXT,
  image_url TEXT,
  confidence_score DECIMAL,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    dis.disease_name_vi AS disease_name,
    d.image_url,
    d.confidence_score,
    d.created_at
  FROM diagnoses d
  LEFT JOIN diseases dis ON d.disease_id = dis.id
  WHERE d.user_id = u_id
  ORDER BY d.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
