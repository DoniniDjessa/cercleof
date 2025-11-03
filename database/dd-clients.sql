-- Create dd-clients table for beauty institute client management
CREATE TABLE IF NOT EXISTS "dd-clients" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20),
  date_of_birth DATE,
  gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
  address TEXT,
  city VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'France',
  emergency_contact_name VARCHAR(100),
  emergency_contact_phone VARCHAR(20),
  notes TEXT,
  preferred_contact_method VARCHAR(20) CHECK (preferred_contact_method IN ('email', 'phone', 'sms')),
  marketing_consent BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES "dd-users"(id),
  updated_by UUID REFERENCES "dd-users"(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_dd_clients_email ON "dd-clients"(email);
CREATE INDEX IF NOT EXISTS idx_dd_clients_phone ON "dd-clients"(phone);
CREATE INDEX IF NOT EXISTS idx_dd_clients_name ON "dd-clients"(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_dd_clients_is_active ON "dd-clients"(is_active);
CREATE INDEX IF NOT EXISTS idx_dd_clients_created_at ON "dd-clients"(created_at);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_clients_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_dd_clients_updated_at 
    BEFORE UPDATE ON "dd-clients" 
    FOR EACH ROW 
    EXECUTE FUNCTION update_clients_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE "dd-clients" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- All authenticated users can view clients
CREATE POLICY "All users can view clients" ON "dd-clients"
    FOR SELECT USING (auth.role() = 'authenticated');

-- All authenticated users can create clients
CREATE POLICY "All users can create clients" ON "dd-clients"
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- All authenticated users can update clients
CREATE POLICY "All users can update clients" ON "dd-clients"
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Only admin and manager can delete clients
CREATE POLICY "Admin and manager can delete clients" ON "dd-clients"
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM "dd-users" 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('admin', 'manager', 'superadmin')
        )
    );

-- Grant necessary permissions
GRANT ALL ON "dd-clients" TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
