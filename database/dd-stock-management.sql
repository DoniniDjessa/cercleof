-- Create dd-stocks table for managing stock batches
CREATE TABLE IF NOT EXISTS "dd-stocks" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  stock_ref VARCHAR(100) UNIQUE NOT NULL, -- e.g., STK-20251020-04F
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES "dd-users"(id)
);

-- Create dd-stock-items table for managing products within stocks
CREATE TABLE IF NOT EXISTS "dd-stock-items" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stock_id UUID REFERENCES "dd-stocks"(id) ON DELETE CASCADE,
  product_id UUID REFERENCES "dd-products"(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  batch_code VARCHAR(100) UNIQUE NOT NULL, -- e.g., STK-20251020-04F-742A
  received_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expiry_date TIMESTAMP WITH TIME ZONE,
  cost_per_unit DECIMAL(10,2),
  total_cost DECIMAL(10,2),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES "dd-users"(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_dd_stocks_stock_ref ON "dd-stocks"(stock_ref);
CREATE INDEX IF NOT EXISTS idx_dd_stocks_status ON "dd-stocks"(status);
CREATE INDEX IF NOT EXISTS idx_dd_stocks_created_at ON "dd-stocks"(created_at);

CREATE INDEX IF NOT EXISTS idx_dd_stock_items_stock_id ON "dd-stock-items"(stock_id);
CREATE INDEX IF NOT EXISTS idx_dd_stock_items_product_id ON "dd-stock-items"(product_id);
CREATE INDEX IF NOT EXISTS idx_dd_stock_items_batch_code ON "dd-stock-items"(batch_code);
CREATE INDEX IF NOT EXISTS idx_dd_stock_items_received_date ON "dd-stock-items"(received_date);

-- Create updated_at triggers
DROP FUNCTION IF EXISTS update_stocks_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS update_stock_items_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION update_stocks_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION update_stock_items_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers if they exist, then create new ones
DROP TRIGGER IF EXISTS update_dd_stocks_updated_at ON "dd-stocks";
DROP TRIGGER IF EXISTS update_dd_stock_items_updated_at ON "dd-stock-items";

CREATE TRIGGER update_dd_stocks_updated_at 
    BEFORE UPDATE ON "dd-stocks" 
    FOR EACH ROW 
    EXECUTE FUNCTION update_stocks_updated_at_column();

CREATE TRIGGER update_dd_stock_items_updated_at 
    BEFORE UPDATE ON "dd-stock-items" 
    FOR EACH ROW 
    EXECUTE FUNCTION update_stock_items_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE "dd-stocks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "dd-stock-items" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then create new ones
DROP POLICY IF EXISTS "All users can view stocks" ON "dd-stocks";
DROP POLICY IF EXISTS "All users can create stocks" ON "dd-stocks";
DROP POLICY IF EXISTS "All users can update stocks" ON "dd-stocks";
DROP POLICY IF EXISTS "Admin and manager can delete stocks" ON "dd-stocks";

DROP POLICY IF EXISTS "All users can view stock items" ON "dd-stock-items";
DROP POLICY IF EXISTS "All users can create stock items" ON "dd-stock-items";
DROP POLICY IF EXISTS "All users can update stock items" ON "dd-stock-items";
DROP POLICY IF EXISTS "Admin and manager can delete stock items" ON "dd-stock-items";

-- Create RLS policies for stocks
CREATE POLICY "All users can view stocks" ON "dd-stocks"
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "All users can create stocks" ON "dd-stocks"
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "All users can update stocks" ON "dd-stocks"
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Admin and manager can delete stocks" ON "dd-stocks"
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM "dd-users" 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('admin', 'manager', 'superadmin')
        )
    );

-- Create RLS policies for stock items
CREATE POLICY "All users can view stock items" ON "dd-stock-items"
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "All users can create stock items" ON "dd-stock-items"
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "All users can update stock items" ON "dd-stock-items"
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Admin and manager can delete stock items" ON "dd-stock-items"
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM "dd-users" 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('admin', 'manager', 'superadmin')
        )
    );

-- Grant necessary permissions
GRANT ALL ON "dd-stocks" TO authenticated;
GRANT ALL ON "dd-stock-items" TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
