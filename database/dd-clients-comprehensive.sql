-- Update dd-clients table with comprehensive client information
-- Based on clients.md requirements

-- First, let's add the new columns to the existing dd-clients table
ALTER TABLE "dd-clients" 
ADD COLUMN IF NOT EXISTS gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS acquisition_channel VARCHAR(100),
ADD COLUMN IF NOT EXISTS skin_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS hair_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS nail_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS allergies TEXT,
ADD COLUMN IF NOT EXISTS product_preferences TEXT,
ADD COLUMN IF NOT EXISTS brand_preferences TEXT,
ADD COLUMN IF NOT EXISTS services_history TEXT[], -- Array of service IDs
ADD COLUMN IF NOT EXISTS visit_frequency VARCHAR(50),
ADD COLUMN IF NOT EXISTS preferred_employee_id UUID REFERENCES "dd-users"(id),
ADD COLUMN IF NOT EXISTS staff_notes TEXT,
ADD COLUMN IF NOT EXISTS total_spent DECIMAL(12,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS average_purchase DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS last_visit_date DATE,
ADD COLUMN IF NOT EXISTS next_visit_date DATE,
ADD COLUMN IF NOT EXISTS loyalty_level VARCHAR(20) DEFAULT 'bronze' CHECK (loyalty_level IN ('bronze', 'silver', 'gold', 'platinum')),
ADD COLUMN IF NOT EXISTS satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
ADD COLUMN IF NOT EXISTS favorite_categories TEXT[], -- Array of category names
ADD COLUMN IF NOT EXISTS marketing_tags TEXT[], -- Array of marketing tags
ADD COLUMN IF NOT EXISTS preferred_communication VARCHAR(20) DEFAULT 'whatsapp' CHECK (preferred_communication IN ('whatsapp', 'email', 'sms', 'phone')),
ADD COLUMN IF NOT EXISTS profile_image TEXT, -- URL to profile image
ADD COLUMN IF NOT EXISTS internal_status VARCHAR(20) DEFAULT 'active' CHECK (internal_status IN ('active', 'inactive', 'prospect', 'vip', 'blocked')),
ADD COLUMN IF NOT EXISTS internal_notes TEXT,
ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES "dd-users"(id),
ADD COLUMN IF NOT EXISTS updated_by_user_id UUID REFERENCES "dd-users"(id);

-- Update existing columns if needed
ALTER TABLE "dd-clients" 
ALTER COLUMN preferred_contact_method SET DEFAULT 'whatsapp';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clients_loyalty_level ON "dd-clients"(loyalty_level);
CREATE INDEX IF NOT EXISTS idx_clients_internal_status ON "dd-clients"(internal_status);
CREATE INDEX IF NOT EXISTS idx_clients_last_visit ON "dd-clients"(last_visit_date);
CREATE INDEX IF NOT EXISTS idx_clients_total_spent ON "dd-clients"(total_spent);
CREATE INDEX IF NOT EXISTS idx_clients_birth_date ON "dd-clients"(birth_date);
CREATE INDEX IF NOT EXISTS idx_clients_acquisition_channel ON "dd-clients"(acquisition_channel);

-- Update RLS policies to include new fields
-- The existing policies should work, but let's ensure they cover all operations

-- Policy for viewing clients (all authenticated users can view)
DROP POLICY IF EXISTS "Public clients are viewable by everyone." ON "dd-clients";
CREATE POLICY "Authenticated users can view clients." ON "dd-clients"
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy for creating clients (all authenticated users can create)
DROP POLICY IF EXISTS "Authenticated users can create clients." ON "dd-clients";
CREATE POLICY "Authenticated users can create clients." ON "dd-clients"
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy for updating clients (all authenticated users can update)
DROP POLICY IF EXISTS "Authenticated users can update clients." ON "dd-clients";
CREATE POLICY "Authenticated users can update clients." ON "dd-clients"
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Policy for deleting clients (only admin, manager, superadmin can delete)
DROP POLICY IF EXISTS "Admins and Superadmins can delete clients." ON "dd-clients";
CREATE POLICY "Admins and Superadmins can delete clients." ON "dd-clients"
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM "dd-users" WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager' OR role = 'superadmin'))
  );

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_dd_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_dd_clients_updated_at ON "dd-clients";
CREATE TRIGGER update_dd_clients_updated_at
    BEFORE UPDATE ON "dd-clients"
    FOR EACH ROW
    EXECUTE FUNCTION update_dd_clients_updated_at();

-- Add some sample acquisition channels for reference
-- These can be used in dropdowns in the UI
INSERT INTO "dd-clients" (
  name, 
  email, 
  phones, 
  preferred_contact_method, 
  acquisition_channel,
  internal_status,
  created_by_user_id
) VALUES 
  ('Sample Client 1', 'client1@example.com', ARRAY['+223 65 12 34 56'], 'whatsapp', 'bouche_a_oreille', 'active', (SELECT id FROM "dd-users" LIMIT 1)),
  ('Sample Client 2', 'client2@example.com', ARRAY['+223 65 78 90 12'], 'email', 'instagram', 'prospect', (SELECT id FROM "dd-users" LIMIT 1))
ON CONFLICT DO NOTHING;

-- Create a view for client statistics (useful for dashboards)
CREATE OR REPLACE VIEW client_stats AS
SELECT 
  COUNT(*) as total_clients,
  COUNT(*) FILTER (WHERE internal_status = 'active') as active_clients,
  COUNT(*) FILTER (WHERE internal_status = 'vip') as vip_clients,
  COUNT(*) FILTER (WHERE loyalty_level = 'gold') as gold_clients,
  COUNT(*) FILTER (WHERE last_visit_date >= CURRENT_DATE - INTERVAL '30 days') as recent_visitors,
  AVG(total_spent) as average_spent,
  SUM(total_spent) as total_revenue
FROM "dd-clients";

-- Grant access to the view
GRANT SELECT ON client_stats TO authenticated;
