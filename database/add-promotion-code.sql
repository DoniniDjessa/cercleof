-- Add code field to dd-promotions table for promotion codes
-- This allows employees to enter a code instead of manually entering discount values

-- Add code column if it doesn't exist
ALTER TABLE "dd-promotions" 
ADD COLUMN IF NOT EXISTS code VARCHAR(50) UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_promotions_code ON "dd-promotions"(code);

-- Add column for usage tracking per code
ALTER TABLE "dd-promotions"
ADD COLUMN IF NOT EXISTS is_unique_usage BOOLEAN DEFAULT false;  -- If true, code can only be used once per client

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'dd-promotions' 
AND column_name IN ('code', 'is_unique_usage');

