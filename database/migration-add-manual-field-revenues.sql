-- Migration: Add 'manual' boolean field to dd-revenues table
-- This field indicates if the revenue was manually created via "Nouveau Revenu" form

-- Step 1: Add the 'manual' column to dd-revenues table
ALTER TABLE "dd-revenues" 
ADD COLUMN IF NOT EXISTS manual BOOLEAN DEFAULT false;

-- Step 2: Update all existing revenues where source_id is NULL to have manual = true
-- (These are manual revenues created via "Nouveau Revenu" form)
UPDATE "dd-revenues"
SET manual = true
WHERE source_id IS NULL;

-- Step 3: Update all existing revenues where source_id is NOT NULL to have manual = false
-- (These are revenues that reference POS sales or other sources)
UPDATE "dd-revenues"
SET manual = false
WHERE source_id IS NOT NULL;

-- Step 4: Set default value for future inserts
ALTER TABLE "dd-revenues"
ALTER COLUMN manual SET DEFAULT false;

-- Verification query (run this to check the migration results):
-- SELECT 
--   COUNT(*) as total,
--   COUNT(*) FILTER (WHERE manual = true) as manual_count,
--   COUNT(*) FILTER (WHERE manual = false) as non_manual_count,
--   COUNT(*) FILTER (WHERE source_id IS NULL) as null_source_id,
--   COUNT(*) FILTER (WHERE source_id IS NOT NULL) as has_source_id
-- FROM "dd-revenues";

