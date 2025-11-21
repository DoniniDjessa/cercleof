-- Add new columns to dd-travailleurs table for enhanced tracking
-- Rating, service history, payments, and work time tracking

-- Add rating column (0-10 scale for global rating)
ALTER TABLE "dd-travailleurs" 
ADD COLUMN IF NOT EXISTS rating_global DECIMAL(3,1) DEFAULT 0.0 CHECK (rating_global >= 0 AND rating_global <= 10);

-- Add total services count
ALTER TABLE "dd-travailleurs" 
ADD COLUMN IF NOT EXISTS total_services INTEGER DEFAULT 0;

-- Add total amounts received (for payments given to travailleur)
ALTER TABLE "dd-travailleurs" 
ADD COLUMN IF NOT EXISTS total_montants_recus DECIMAL(12,2) DEFAULT 0.00;

-- Add work days tracking
ALTER TABLE "dd-travailleurs" 
ADD COLUMN IF NOT EXISTS jours_travailles INTEGER DEFAULT 0;

-- Add work hours tracking (in decimal hours)
ALTER TABLE "dd-travailleurs" 
ADD COLUMN IF NOT EXISTS heures_travailles DECIMAL(10,2) DEFAULT 0.00;

-- Add salary column (monthly or as needed)
ALTER TABLE "dd-travailleurs" 
ADD COLUMN IF NOT EXISTS salaire DECIMAL(10,2) DEFAULT 0.00;

-- Add salary history (JSON array to track salary changes over time)
ALTER TABLE "dd-travailleurs" 
ADD COLUMN IF NOT EXISTS salary_history JSONB DEFAULT '[]'::jsonb;

-- Add payments history (JSON array to track individual payments given)
ALTER TABLE "dd-travailleurs" 
ADD COLUMN IF NOT EXISTS payments_history JSONB DEFAULT '[]'::jsonb;

-- Add work history (JSON array to track work days/hours added)
ALTER TABLE "dd-travailleurs" 
ADD COLUMN IF NOT EXISTS work_history JSONB DEFAULT '[]'::jsonb;

-- Add notes history (for rich history tracking)
ALTER TABLE "dd-travailleurs" 
ADD COLUMN IF NOT EXISTS notes_history JSONB DEFAULT '[]'::jsonb;

-- Create index for rating
CREATE INDEX IF NOT EXISTS idx_dd_travailleurs_rating ON "dd-travailleurs"(rating_global);

