-- Add livreur_name column to dd-livraisons table for external livreurs
ALTER TABLE "dd-livraisons" 
ADD COLUMN IF NOT EXISTS livreur_name VARCHAR(255);

-- Add comment
COMMENT ON COLUMN "dd-livraisons".livreur_name IS 'Name of external livreur (when mode is externe)';

