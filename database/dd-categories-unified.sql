-- Create unified dd-categories table for both products and services
CREATE TABLE IF NOT EXISTS "dd-categories" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  type VARCHAR(20) NOT NULL CHECK (type IN ('product', 'service')),
  parent_id UUID REFERENCES "dd-categories"(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES "dd-users"(id)
);

-- Create dd-products table (updated to use unified categories)
CREATE TABLE IF NOT EXISTS "dd-products" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  sku VARCHAR(100) UNIQUE,
  barcode VARCHAR(100),
  category_id UUID REFERENCES "dd-categories"(id),
  brand VARCHAR(100),
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  min_stock_level INTEGER DEFAULT 0,
  max_stock_level INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
  show_to_website BOOLEAN DEFAULT false,
  images JSONB DEFAULT '[]'::jsonb,
  tags TEXT[],
  weight DECIMAL(8,2),
  dimensions JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES "dd-users"(id),
  updated_by UUID REFERENCES "dd-users"(id)
);

-- Create dd-services table (updated to use unified categories)
CREATE TABLE IF NOT EXISTS "dd-services" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category_id UUID REFERENCES "dd-categories"(id),
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
  show_to_website BOOLEAN DEFAULT false,
  images JSONB DEFAULT '[]'::jsonb,
  tags TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES "dd-users"(id),
  updated_by UUID REFERENCES "dd-users"(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_dd_categories_type ON "dd-categories"(type);
CREATE INDEX IF NOT EXISTS idx_dd_categories_parent ON "dd-categories"(parent_id);
CREATE INDEX IF NOT EXISTS idx_dd_categories_is_active ON "dd-categories"(is_active);

CREATE INDEX IF NOT EXISTS idx_dd_products_sku ON "dd-products"(sku);
CREATE INDEX IF NOT EXISTS idx_dd_products_category ON "dd-products"(category_id);
CREATE INDEX IF NOT EXISTS idx_dd_products_status ON "dd-products"(status);
CREATE INDEX IF NOT EXISTS idx_dd_products_show_to_website ON "dd-products"(show_to_website);
CREATE INDEX IF NOT EXISTS idx_dd_products_is_active ON "dd-products"(is_active);
CREATE INDEX IF NOT EXISTS idx_dd_products_created_at ON "dd-products"(created_at);

CREATE INDEX IF NOT EXISTS idx_dd_services_category ON "dd-services"(category_id);
CREATE INDEX IF NOT EXISTS idx_dd_services_status ON "dd-services"(status);
CREATE INDEX IF NOT EXISTS idx_dd_services_show_to_website ON "dd-services"(show_to_website);
CREATE INDEX IF NOT EXISTS idx_dd_services_is_active ON "dd-services"(is_active);
CREATE INDEX IF NOT EXISTS idx_dd_services_created_at ON "dd-services"(created_at);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_categories_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION update_products_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION update_services_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_dd_categories_updated_at 
    BEFORE UPDATE ON "dd-categories" 
    FOR EACH ROW 
    EXECUTE FUNCTION update_categories_updated_at_column();

CREATE TRIGGER update_dd_products_updated_at 
    BEFORE UPDATE ON "dd-products" 
    FOR EACH ROW 
    EXECUTE FUNCTION update_products_updated_at_column();

CREATE TRIGGER update_dd_services_updated_at 
    BEFORE UPDATE ON "dd-services" 
    FOR EACH ROW 
    EXECUTE FUNCTION update_services_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE "dd-categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "dd-products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "dd-services" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for categories
CREATE POLICY "All users can view categories" ON "dd-categories"
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "All users can create categories" ON "dd-categories"
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "All users can update categories" ON "dd-categories"
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Admin and manager can delete categories" ON "dd-categories"
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM "dd-users" 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('admin', 'manager', 'superadmin')
        )
    );

-- Create RLS policies for products
CREATE POLICY "All users can view products" ON "dd-products"
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "All users can create products" ON "dd-products"
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "All users can update products" ON "dd-products"
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Admin and manager can delete products" ON "dd-products"
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM "dd-users" 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('admin', 'manager', 'superadmin')
        )
    );

-- Create RLS policies for services
CREATE POLICY "All users can view services" ON "dd-services"
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "All users can create services" ON "dd-services"
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "All users can update services" ON "dd-services"
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Admin and manager can delete services" ON "dd-services"
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM "dd-users" 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('admin', 'manager', 'superadmin')
        )
    );

-- Grant necessary permissions
GRANT ALL ON "dd-categories" TO authenticated;
GRANT ALL ON "dd-products" TO authenticated;
GRANT ALL ON "dd-services" TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
