-- Create tables for Salon management and Travailleurs (workers)
-- This allows tracking of services sold from POS and assignment of workers to services

-- ==============================================
-- 1. TRAVAILLEURS (Workers/Service Providers)
-- ==============================================

-- Create dd-travailleurs table
-- These are service providers (makeup artists, hairdressers, etc.) who don't have app access
CREATE TABLE IF NOT EXISTS "dd-travailleurs" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  specialite VARCHAR(100), -- makeup, tressage, manucure, etc.
  competence JSONB, -- array of skills/competencies
  taux_horaire DECIMAL(10,2) DEFAULT 0.00, -- hourly rate
  commission_rate DECIMAL(5,2) DEFAULT 0.00, -- commission percentage
  is_active BOOLEAN DEFAULT true,
  date_embauche DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES "dd-users"(id)
);

-- Create indexes for dd-travailleurs
CREATE INDEX IF NOT EXISTS idx_dd_travailleurs_specialite ON "dd-travailleurs"(specialite);
CREATE INDEX IF NOT EXISTS idx_dd_travailleurs_is_active ON "dd-travailleurs"(is_active);
CREATE INDEX IF NOT EXISTS idx_dd_travailleurs_created_by ON "dd-travailleurs"(created_by);

-- ==============================================
-- 2. SALON (Service Assignments)
-- ==============================================

-- Create dd-salon table
-- This tracks services sold from POS and their assignments to workers
CREATE TABLE IF NOT EXISTS "dd-salon" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vente_id UUID REFERENCES "dd-ventes"(id) ON DELETE CASCADE, -- Link to the sale
  vente_item_id UUID REFERENCES "dd-ventes-items"(id) ON DELETE CASCADE, -- Link to the sale item
  client_id UUID REFERENCES "dd-clients"(id),
  service_id UUID REFERENCES "dd-services"(id) NOT NULL,
  service_name VARCHAR(255) NOT NULL, -- Service name at time of sale
  service_price DECIMAL(10,2) NOT NULL, -- Service price at time of sale
  date_service TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- When the service should be performed
  statut VARCHAR(20) DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'en_cours', 'termine', 'annule', 'no_show')),
  notes TEXT, -- Notes about the service
  review TEXT, -- Client review/feedback
  rating INTEGER CHECK (rating >= 1 AND rating <= 5), -- Client rating (1-5)
  duree_estimee INTEGER, -- Estimated duration in minutes
  duree_reelle INTEGER, -- Actual duration in minutes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES "dd-users"(id)
);

-- Create dd-salon-travailleurs table (Many-to-Many relationship)
-- Links salon services to workers assigned to them
CREATE TABLE IF NOT EXISTS "dd-salon-travailleurs" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id UUID REFERENCES "dd-salon"(id) ON DELETE CASCADE NOT NULL,
  travailleur_id UUID REFERENCES "dd-travailleurs"(id) ON DELETE CASCADE NOT NULL,
  role VARCHAR(50), -- principal, assistant, etc.
  commission DECIMAL(10,2) DEFAULT 0.00, -- Commission for this worker on this service
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(salon_id, travailleur_id)
);

-- Create indexes for dd-salon
CREATE INDEX IF NOT EXISTS idx_dd_salon_vente_id ON "dd-salon"(vente_id);
CREATE INDEX IF NOT EXISTS idx_dd_salon_client_id ON "dd-salon"(client_id);
CREATE INDEX IF NOT EXISTS idx_dd_salon_service_id ON "dd-salon"(service_id);
CREATE INDEX IF NOT EXISTS idx_dd_salon_statut ON "dd-salon"(statut);
CREATE INDEX IF NOT EXISTS idx_dd_salon_date_service ON "dd-salon"(date_service);

-- Create indexes for dd-salon-travailleurs
CREATE INDEX IF NOT EXISTS idx_dd_salon_travailleurs_salon_id ON "dd-salon-travailleurs"(salon_id);
CREATE INDEX IF NOT EXISTS idx_dd_salon_travailleurs_travailleur_id ON "dd-salon-travailleurs"(travailleur_id);

-- ==============================================
-- 3. TRIGGERS
-- ==============================================

-- Update updated_at for dd-travailleurs
CREATE TRIGGER update_dd_travailleurs_updated_at 
  BEFORE UPDATE ON "dd-travailleurs" 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at for dd-salon
CREATE TRIGGER update_dd_salon_updated_at 
  BEFORE UPDATE ON "dd-salon" 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ==============================================

-- Enable RLS
ALTER TABLE "dd-travailleurs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "dd-salon" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "dd-salon-travailleurs" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dd-travailleurs
CREATE POLICY "Authenticated users can view travailleurs" ON "dd-travailleurs" 
  FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins and managers can create travailleurs" ON "dd-travailleurs" 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "dd-users" 
      WHERE auth_user_id = auth.uid() 
      AND (role = 'admin' OR role = 'superadmin' OR role = 'manager')
    )
  );

CREATE POLICY "Admins and managers can update travailleurs" ON "dd-travailleurs" 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM "dd-users" 
      WHERE auth_user_id = auth.uid() 
      AND (role = 'admin' OR role = 'superadmin' OR role = 'manager')
    )
  );

CREATE POLICY "Admins and managers can delete travailleurs" ON "dd-travailleurs" 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM "dd-users" 
      WHERE auth_user_id = auth.uid() 
      AND (role = 'admin' OR role = 'superadmin' OR role = 'manager')
    )
  );

-- RLS Policies for dd-salon
CREATE POLICY "Authenticated users can view salon services" ON "dd-salon" 
  FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create salon services" ON "dd-salon" 
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update salon services" ON "dd-salon" 
  FOR UPDATE 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins and managers can delete salon services" ON "dd-salon" 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM "dd-users" 
      WHERE auth_user_id = auth.uid() 
      AND (role = 'admin' OR role = 'superadmin' OR role = 'manager')
    )
  );

-- RLS Policies for dd-salon-travailleurs
CREATE POLICY "Authenticated users can view salon-travailleurs assignments" ON "dd-salon-travailleurs" 
  FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create salon-travailleurs assignments" ON "dd-salon-travailleurs" 
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update salon-travailleurs assignments" ON "dd-salon-travailleurs" 
  FOR UPDATE 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete salon-travailleurs assignments" ON "dd-salon-travailleurs" 
  FOR DELETE 
  USING (auth.role() = 'authenticated');

-- Verify tables are created
SELECT 
  table_name, 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name IN ('dd-travailleurs', 'dd-salon', 'dd-salon-travailleurs')
ORDER BY table_name, ordinal_position;

