-- Create dd-menu table for storing menu structure
-- This table stores the MenuData JSON structure as described in docs/todo.md

CREATE TABLE IF NOT EXISTS "dd-menu" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES "dd-users"(id),
  updated_by UUID REFERENCES "dd-users"(id)
);

-- Create unique constraint to ensure only one menu data record exists
-- We'll use a singleton pattern with a fixed ID
INSERT INTO "dd-menu" (id, data)
VALUES ('00000000-0000-0000-0000-000000000001', '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Create index on JSONB data for better query performance
CREATE INDEX IF NOT EXISTS idx_dd_menu_gin ON "dd-menu" USING GIN (data);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_dd_menu_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_dd_menu_updated_at BEFORE UPDATE
  ON "dd-menu" FOR EACH ROW
  EXECUTE FUNCTION update_dd_menu_updated_at_column();

-- Enable RLS (Row Level Security)
ALTER TABLE "dd-menu" ENABLE ROW LEVEL SECURITY;

-- Create policy: Anyone (public/anonymous) can read menu data
-- Frontend users don't need authentication to fetch menu data
CREATE POLICY "Public can read menu data"
  ON "dd-menu"
  FOR SELECT
  TO public
  USING (true);

-- Create policy: Only admins, managers, and superadmins can insert/update menu data
CREATE POLICY "Admins can manage menu data"
  ON "dd-menu"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "dd-users"
      WHERE "dd-users".auth_user_id = auth.uid()
      AND "dd-users".role IN ('admin', 'manager', 'superadmin')
    )
  );

-- Add comment to table
COMMENT ON TABLE "dd-menu" IS 'Stores the menu structure (categories, subcategories, services) as JSONB. Follows the schema defined in docs/todo.md';

