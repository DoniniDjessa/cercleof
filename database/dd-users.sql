-- Create dd-users table for beauty institute management system
CREATE TABLE IF NOT EXISTS "dd-users" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  pseudo VARCHAR(50) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(20) NOT NULL CHECK (role IN ('superadmin', 'admin', 'manager', 'caissiere', 'employe')),
  is_active BOOLEAN DEFAULT true,
  hire_date DATE,
  salary DECIMAL(10,2),
  commission_rate DECIMAL(5,2) DEFAULT 0.00,
  address TEXT,
  emergency_contact_name VARCHAR(100),
  emergency_contact_phone VARCHAR(20),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES "dd-users"(id),
  updated_by UUID REFERENCES "dd-users"(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_dd_users_auth_user_id ON "dd-users"(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_dd_users_email ON "dd-users"(email);
CREATE INDEX IF NOT EXISTS idx_dd_users_pseudo ON "dd-users"(pseudo);
CREATE INDEX IF NOT EXISTS idx_dd_users_role ON "dd-users"(role);
CREATE INDEX IF NOT EXISTS idx_dd_users_is_active ON "dd-users"(is_active);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_dd_users_updated_at 
    BEFORE UPDATE ON "dd-users" 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE "dd-users" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Superadmin can do everything
CREATE POLICY "Superadmin can do everything on dd-users" ON "dd-users"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM "dd-users" 
            WHERE auth_user_id = auth.uid() 
            AND role = 'superadmin'
        )
    );

-- Admin can view and update all users except superadmin
CREATE POLICY "Admin can manage non-superadmin users" ON "dd-users"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM "dd-users" 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('admin', 'superadmin')
        )
        AND role != 'superadmin'
    );

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON "dd-users"
    FOR SELECT USING (auth_user_id = auth.uid());

-- Users can update their own profile (limited fields)
CREATE POLICY "Users can update own profile" ON "dd-users"
    FOR UPDATE USING (auth_user_id = auth.uid())
    WITH CHECK (auth_user_id = auth.uid());

-- Grant necessary permissions
GRANT ALL ON "dd-users" TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
