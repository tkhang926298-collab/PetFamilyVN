-- Add visual_confirmation_required field to diseases table
-- This field determines if the disease requires image confirmation for diagnosis

ALTER TABLE diseases
ADD COLUMN IF NOT EXISTS visual_confirmation_required BOOLEAN DEFAULT false;

-- Add comment
COMMENT ON COLUMN diseases.visual_confirmation_required IS
'Indicates if this disease requires visual confirmation (image) for diagnosis.
true = requires image (skin, eye conditions), false = text-only diagnosis (internal conditions)';

-- Create index for filtering
CREATE INDEX IF NOT EXISTS idx_diseases_visual_required
ON diseases(visual_confirmation_required);

-- Add species field if not exists (for better categorization)
ALTER TABLE diseases
ADD COLUMN IF NOT EXISTS species TEXT DEFAULT 'both'
CHECK (species IN ('dog', 'cat', 'both'));

-- Create index for species
CREATE INDEX IF NOT EXISTS idx_diseases_species
ON diseases(species);

-- Update existing records based on visual_desc
-- If visual_desc is substantial, likely needs visual confirmation
UPDATE diseases
SET visual_confirmation_required = true
WHERE LENGTH(visual_desc) > 100
AND visual_confirmation_required IS NULL;

-- Common visual conditions (examples - adjust based on your data)
UPDATE diseases
SET visual_confirmation_required = true
WHERE disease_id LIKE '%skin%'
   OR disease_id LIKE '%eye%'
   OR disease_id LIKE '%ear%'
   OR disease_id LIKE '%dermat%'
   OR disease_id LIKE '%wound%'
   OR disease_id LIKE '%tumor%'
   OR disease_id LIKE '%lesion%';

-- Common internal conditions (text-only)
UPDATE diseases
SET visual_confirmation_required = false
WHERE disease_id LIKE '%gastro%'
   OR disease_id LIKE '%kidney%'
   OR disease_id LIKE '%liver%'
   OR disease_id LIKE '%heart%'
   OR disease_id LIKE '%diabetes%'
   OR disease_id LIKE '%fever%';
