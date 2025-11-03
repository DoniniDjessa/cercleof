-- COMPREHENSIVE BEAUTY INSTITUTE MANAGEMENT SYSTEM SCHEMA
-- Based on the intelligent institute vision

-- ==============================================
-- 1. STOCKS MANAGEMENT
-- ==============================================

-- Create dd-stocks table (already exists, but let's ensure it's complete)
CREATE TABLE IF NOT EXISTS "dd-stocks" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nom VARCHAR(255) NOT NULL,
  code_stock VARCHAR(100) UNIQUE NOT NULL, -- STK-YYYYMM-XXX
  date_creation TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES "dd-users"(id),
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed', 'cancelled')),
  total_valeur DECIMAL(12,2) DEFAULT 0.00,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create dd-stock-items table (already exists, but let's ensure it's complete)
CREATE TABLE IF NOT EXISTS "dd-stock-items" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stock_id UUID REFERENCES "dd-stocks"(id) ON DELETE CASCADE,
  product_id UUID REFERENCES "dd-products"(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  batch_code VARCHAR(100) UNIQUE NOT NULL,
  expiration_date DATE,
  status VARCHAR(20) DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'sold', 'returned', 'damaged')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES "dd-users"(id)
);

-- ==============================================
-- 2. SERVICES MANAGEMENT
-- ==============================================

-- Create dd-services table
CREATE TABLE IF NOT EXISTS "dd-services" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nom VARCHAR(255) NOT NULL,
  description TEXT,
  category_id UUID REFERENCES "dd-categories"(id),
  prix_base DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  duree INTEGER NOT NULL DEFAULT 60, -- duration in minutes
  employe_type VARCHAR(50), -- category of employee (coiffeuse, esthéticienne, etc.)
  photo TEXT, -- image URL
  commission_employe DECIMAL(5,2) DEFAULT 0.00, -- percentage or amount
  actif BOOLEAN DEFAULT true,
  popularite INTEGER DEFAULT 0, -- popularity score
  tags TEXT[], -- array of tags
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES "dd-users"(id)
);

-- Create dd-services-produits table (products used in services)
CREATE TABLE IF NOT EXISTS "dd-services-produits" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID REFERENCES "dd-services"(id) ON DELETE CASCADE,
  product_id UUID REFERENCES "dd-products"(id) ON DELETE CASCADE,
  quantite DECIMAL(8,2) NOT NULL DEFAULT 1.00, -- quantity used
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- 3. SALES (POS) SYSTEM
-- ==============================================

-- Create dd-ventes table
CREATE TABLE IF NOT EXISTS "dd-ventes" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES "dd-clients"(id),
  user_id UUID REFERENCES "dd-users"(id), -- caissière/employé responsable
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  type VARCHAR(20) DEFAULT 'mixte' CHECK (type IN ('produit', 'service', 'mixte')),
  total_brut DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  reduction DECIMAL(12,2) DEFAULT 0.00, -- discount amount
  reduction_pourcentage DECIMAL(5,2) DEFAULT 0.00, -- discount percentage
  total_net DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  methode_paiement VARCHAR(20) DEFAULT 'cash' CHECK (methode_paiement IN ('cash', 'carte', 'mobile_money', 'cheque')),
  reference VARCHAR(100) UNIQUE, -- POS reference code
  status VARCHAR(20) DEFAULT 'paye' CHECK (status IN ('paye', 'annule', 'en_attente', 'rembourse')),
  source VARCHAR(20) DEFAULT 'sur_place' CHECK (source IN ('sur_place', 'en_ligne', 'telephone')),
  stock_source UUID REFERENCES "dd-stocks"(id),
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES "dd-users"(id)
);

-- Create dd-ventes-items table
CREATE TABLE IF NOT EXISTS "dd-ventes-items" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vente_id UUID REFERENCES "dd-ventes"(id) ON DELETE CASCADE,
  product_id UUID REFERENCES "dd-products"(id),
  service_id UUID REFERENCES "dd-services"(id),
  quantite DECIMAL(8,2) NOT NULL DEFAULT 1.00,
  prix_unitaire DECIMAL(10,2) NOT NULL,
  total DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK ((product_id IS NOT NULL AND service_id IS NULL) OR (product_id IS NULL AND service_id IS NOT NULL))
);

-- ==============================================
-- 4. APPOINTMENTS (RENDEZ-VOUS)
-- ==============================================

-- Create dd-rdv table
CREATE TABLE IF NOT EXISTS "dd-rdv" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES "dd-clients"(id),
  service_id UUID REFERENCES "dd-services"(id),
  employe_id UUID REFERENCES "dd-users"(id),
  date_rdv TIMESTAMP WITH TIME ZONE NOT NULL,
  duree INTEGER NOT NULL DEFAULT 60, -- duration in minutes
  statut VARCHAR(20) DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'confirme', 'annule', 'termine', 'no_show')),
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES "dd-users"(id)
);

-- ==============================================
-- 5. DELIVERIES (LIVRAISONS)
-- ==============================================

-- Create dd-livraisons table
CREATE TABLE IF NOT EXISTS "dd-livraisons" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vente_id UUID REFERENCES "dd-ventes"(id),
  client_id UUID REFERENCES "dd-clients"(id),
  adresse TEXT NOT NULL,
  livreur_id UUID REFERENCES "dd-users"(id),
  statut VARCHAR(20) DEFAULT 'en_preparation' CHECK (statut IN ('en_preparation', 'expedie', 'livre', 'annule', 'retourne')),
  date_livraison TIMESTAMP WITH TIME ZONE,
  frais DECIMAL(10,2) DEFAULT 0.00,
  mode VARCHAR(20) DEFAULT 'interne' CHECK (mode IN ('interne', 'externe')),
  preuve_photo TEXT, -- delivery proof photo URL
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES "dd-users"(id)
);

-- ==============================================
-- 6. FINANCIAL MANAGEMENT
-- ==============================================

-- Create dd-revenues table
CREATE TABLE IF NOT EXISTS "dd-revenues" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type VARCHAR(50) NOT NULL, -- vente, service, autre
  source_id UUID, -- id of the sale or other source
  montant DECIMAL(12,2) NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  note TEXT,
  enregistre_par UUID REFERENCES "dd-users"(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create dd-depenses table
CREATE TABLE IF NOT EXISTS "dd-depenses" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  categorie VARCHAR(100) NOT NULL, -- achat produits, salaire, charges, autre
  montant DECIMAL(12,2) NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fournisseur_id UUID, -- optional supplier reference
  note TEXT,
  enregistre_par UUID REFERENCES "dd-users"(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- 7. NOTIFICATIONS & ALERTS
-- ==============================================

-- Create dd-notifications table
CREATE TABLE IF NOT EXISTS "dd-notifications" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type VARCHAR(50) NOT NULL, -- vente, rdv, stock, promo, depense
  message TEXT NOT NULL,
  cible_type VARCHAR(20) NOT NULL CHECK (cible_type IN ('client', 'user', 'all')),
  cible_id UUID, -- client_id or user_id
  lu BOOLEAN DEFAULT false,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES "dd-users"(id)
);

-- ==============================================
-- 8. PROMOTIONS & LOYALTY
-- ==============================================

-- Create dd-promotions table
CREATE TABLE IF NOT EXISTS "dd-promotions" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nom VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('global', 'categorie', 'produit', 'service', 'client')),
  valeur DECIMAL(10,2) NOT NULL, -- amount or percentage
  valeur_type VARCHAR(10) DEFAULT 'pourcentage' CHECK (valeur_type IN ('pourcentage', 'montant')),
  debut TIMESTAMP WITH TIME ZONE NOT NULL,
  fin TIMESTAMP WITH TIME ZONE NOT NULL,
  conditions JSONB, -- conditions like min amount, categories, etc.
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES "dd-users"(id)
);

-- Create dd-cartes-fidelite table
CREATE TABLE IF NOT EXISTS "dd-cartes-fidelite" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES "dd-clients"(id) UNIQUE,
  points INTEGER DEFAULT 0,
  statut VARCHAR(20) DEFAULT 'active' CHECK (statut IN ('active', 'inactive', 'suspendue')),
  date_derniere_maj TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- 9. AUDIT TRAIL (USER ACTIONS)
-- ==============================================

-- Create dd-actions table
CREATE TABLE IF NOT EXISTS "dd-actions" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES "dd-users"(id),
  type VARCHAR(50) NOT NULL, -- ajout, edition, suppression, connexion
  cible_table VARCHAR(50) NOT NULL, -- table name
  cible_id UUID, -- id of the affected record
  description TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- 10. SUPPLIERS (FOURNISSEURS)
-- ==============================================

-- Create dd-fournisseurs table
CREATE TABLE IF NOT EXISTS "dd-fournisseurs" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nom VARCHAR(255) NOT NULL,
  contact_nom VARCHAR(255),
  telephone VARCHAR(20),
  email VARCHAR(255),
  adresse TEXT,
  note TEXT,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES "dd-users"(id)
);

-- ==============================================
-- 11. CREATE CLIENTS TABLE
-- ==============================================

-- Create dd-clients table (matching existing structure)
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

-- Add RLS for dd-clients
ALTER TABLE "dd-clients" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients are viewable by authenticated users." ON "dd-clients"
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create clients." ON "dd-clients"
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update their own clients." ON "dd-clients"
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Admins, Managers, and Superadmins can update all clients." ON "dd-clients"
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM "dd-users" WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin' OR role = 'manager'))
  );

CREATE POLICY "Admins, Managers, and Superadmins can delete clients." ON "dd-clients"
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM "dd-users" WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin' OR role = 'manager'))
  );

-- ==============================================
-- 12. UPDATE EXISTING TABLES
-- ==============================================

-- Update dd-products table to include missing fields
ALTER TABLE "dd-products" 
ADD COLUMN IF NOT EXISTS seuil_alerte INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS popularite INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS visible_en_pos BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS fournisseur_id UUID REFERENCES "dd-fournisseurs"(id);

-- Update dd-clients table to include missing fields (if table already exists)
ALTER TABLE "dd-clients"
ADD COLUMN IF NOT EXISTS points_fidelite INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS derniere_visite TIMESTAMP WITH TIME ZONE;

-- ==============================================
-- 13. INDEXES FOR PERFORMANCE
-- ==============================================

-- Indexes for dd-ventes
CREATE INDEX IF NOT EXISTS idx_ventes_client_id ON "dd-ventes"(client_id);
CREATE INDEX IF NOT EXISTS idx_ventes_user_id ON "dd-ventes"(user_id);
CREATE INDEX IF NOT EXISTS idx_ventes_date ON "dd-ventes"(date);
CREATE INDEX IF NOT EXISTS idx_ventes_status ON "dd-ventes"(status);

-- Indexes for dd-rdv
CREATE INDEX IF NOT EXISTS idx_rdv_client_id ON "dd-rdv"(client_id);
CREATE INDEX IF NOT EXISTS idx_rdv_employe_id ON "dd-rdv"(employe_id);
CREATE INDEX IF NOT EXISTS idx_rdv_date ON "dd-rdv"(date_rdv);
CREATE INDEX IF NOT EXISTS idx_rdv_statut ON "dd-rdv"(statut);

-- Indexes for dd-notifications
CREATE INDEX IF NOT EXISTS idx_notifications_cible ON "dd-notifications"(cible_type, cible_id);
CREATE INDEX IF NOT EXISTS idx_notifications_lu ON "dd-notifications"(lu);
CREATE INDEX IF NOT EXISTS idx_notifications_date ON "dd-notifications"(date);

-- Indexes for dd-actions
CREATE INDEX IF NOT EXISTS idx_actions_user_id ON "dd-actions"(user_id);
CREATE INDEX IF NOT EXISTS idx_actions_cible ON "dd-actions"(cible_table, cible_id);
CREATE INDEX IF NOT EXISTS idx_actions_date ON "dd-actions"(date);

-- ==============================================
-- 14. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================

-- Enable RLS on all tables
ALTER TABLE "dd-stocks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "dd-stock-items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "dd-services" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "dd-services-produits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "dd-ventes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "dd-ventes-items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "dd-rdv" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "dd-livraisons" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "dd-revenues" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "dd-depenses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "dd-notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "dd-promotions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "dd-cartes-fidelite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "dd-actions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "dd-fournisseurs" ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies for authenticated users
-- (These can be customized based on specific business rules)

-- Stocks policies
CREATE POLICY "Authenticated users can view stocks" ON "dd-stocks" FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can create stocks" ON "dd-stocks" FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update stocks" ON "dd-stocks" FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can delete stocks" ON "dd-stocks" FOR DELETE USING (
  EXISTS (SELECT 1 FROM "dd-users" WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin'))
);

-- Services policies
CREATE POLICY "Authenticated users can view services" ON "dd-services" FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can create services" ON "dd-services" FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update services" ON "dd-services" FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can delete services" ON "dd-services" FOR DELETE USING (
  EXISTS (SELECT 1 FROM "dd-users" WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin'))
);

-- Sales policies
CREATE POLICY "Authenticated users can view sales" ON "dd-ventes" FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can create sales" ON "dd-ventes" FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update sales" ON "dd-ventes" FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can delete sales" ON "dd-ventes" FOR DELETE USING (
  EXISTS (SELECT 1 FROM "dd-users" WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin'))
);

-- Appointments policies
CREATE POLICY "Authenticated users can view appointments" ON "dd-rdv" FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can create appointments" ON "dd-rdv" FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update appointments" ON "dd-rdv" FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can delete appointments" ON "dd-rdv" FOR DELETE USING (
  EXISTS (SELECT 1 FROM "dd-users" WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin'))
);

-- ==============================================
-- 15. TRIGGERS FOR AUTOMATIC UPDATES
-- ==============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at (with IF NOT EXISTS check)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_dd_stocks_updated_at') THEN
        CREATE TRIGGER update_dd_stocks_updated_at BEFORE UPDATE ON "dd-stocks" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_dd_stock_items_updated_at') THEN
        CREATE TRIGGER update_dd_stock_items_updated_at BEFORE UPDATE ON "dd-stock-items" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_dd_services_updated_at') THEN
        CREATE TRIGGER update_dd_services_updated_at BEFORE UPDATE ON "dd-services" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_dd_ventes_updated_at') THEN
        CREATE TRIGGER update_dd_ventes_updated_at BEFORE UPDATE ON "dd-ventes" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_dd_rdv_updated_at') THEN
        CREATE TRIGGER update_dd_rdv_updated_at BEFORE UPDATE ON "dd-rdv" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_dd_livraisons_updated_at') THEN
        CREATE TRIGGER update_dd_livraisons_updated_at BEFORE UPDATE ON "dd-livraisons" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_dd_promotions_updated_at') THEN
        CREATE TRIGGER update_dd_promotions_updated_at BEFORE UPDATE ON "dd-promotions" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_dd_cartes_fidelite_updated_at') THEN
        CREATE TRIGGER update_dd_cartes_fidelite_updated_at BEFORE UPDATE ON "dd-cartes-fidelite" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_dd_fournisseurs_updated_at') THEN
        CREATE TRIGGER update_dd_fournisseurs_updated_at BEFORE UPDATE ON "dd-fournisseurs" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ==============================================
-- 16. ANALYTICS VIEWS
-- ==============================================

-- Create view for sales analytics
CREATE OR REPLACE VIEW sales_analytics AS
SELECT 
  DATE(date) as sale_date,
  COUNT(*) as total_sales,
  SUM(total_net) as total_revenue,
  AVG(total_net) as average_sale,
  COUNT(DISTINCT client_id) as unique_clients,
  SUM(CASE WHEN methode_paiement = 'cash' THEN total_net ELSE 0 END) as cash_revenue,
  SUM(CASE WHEN methode_paiement = 'carte' THEN total_net ELSE 0 END) as card_revenue,
  SUM(CASE WHEN methode_paiement = 'mobile_money' THEN total_net ELSE 0 END) as mobile_revenue
FROM "dd-ventes"
WHERE status = 'paye'
GROUP BY DATE(date)
ORDER BY sale_date DESC;

-- Create view for product performance
CREATE OR REPLACE VIEW product_performance AS
SELECT 
  p.id,
  p.name,
  p.sku,
  p.price as prix_vente,
  p.cost as prix_achat,
  (p.price - p.cost) as marge,
  p.stock_quantity,
  COUNT(vi.id) as total_sold,
  SUM(vi.quantite) as quantity_sold,
  SUM(vi.total) as revenue_generated
FROM "dd-products" p
LEFT JOIN "dd-ventes-items" vi ON p.id = vi.product_id
LEFT JOIN "dd-ventes" v ON vi.vente_id = v.id AND v.status = 'paye'
GROUP BY p.id, p.name, p.sku, p.price, p.cost, p.stock_quantity
ORDER BY revenue_generated DESC;

-- Create view for client analytics
CREATE OR REPLACE VIEW client_analytics AS
SELECT 
  c.id,
  c.first_name,
  c.last_name,
  c.email,
  c.phone,
  c.gender,
  c.city,
  c.is_active,
  COUNT(v.id) as total_purchases,
  SUM(v.total_net) as total_spent,
  AVG(v.total_net) as average_purchase,
  MAX(v.date) as last_purchase,
  COUNT(r.id) as total_appointments
FROM "dd-clients" c
LEFT JOIN "dd-ventes" v ON c.id = v.client_id AND v.status = 'paye'
LEFT JOIN "dd-rdv" r ON c.id = r.client_id
GROUP BY c.id, c.first_name, c.last_name, c.email, c.phone, c.gender, c.city, c.is_active
ORDER BY total_spent DESC;

-- Grant access to views
GRANT SELECT ON sales_analytics TO authenticated;
GRANT SELECT ON product_performance TO authenticated;
GRANT SELECT ON client_analytics TO authenticated;
