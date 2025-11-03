-- Migration to add pseudo column to existing dd-users table
-- Run this if you already have the dd-users table without the pseudo column

-- Add the pseudo column
ALTER TABLE "dd-users" ADD COLUMN IF NOT EXISTS pseudo VARCHAR(50);

-- Create unique index for pseudo column
CREATE UNIQUE INDEX IF NOT EXISTS idx_dd_users_pseudo ON "dd-users"(pseudo);

-- Update existing records to have a pseudo value (using email prefix as fallback)
UPDATE "dd-users" 
SET pseudo = COALESCE(
  LOWER(SPLIT_PART(email, '@', 1)), 
  'user_' || SUBSTRING(id::text, 1, 8)
)
WHERE pseudo IS NULL OR pseudo = '';

-- Make pseudo column NOT NULL after updating existing records
ALTER TABLE "dd-users" ALTER COLUMN pseudo SET NOT NULL;

-- Verify the changes
SELECT id, email, pseudo, first_name, last_name FROM "dd-users" LIMIT 5;
