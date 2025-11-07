-- Create product variants table to allow multiple variants per product
CREATE TABLE IF NOT EXISTS "dd-product-variants" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES "dd-products"(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  sku VARCHAR(100),
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (product_id, name)
);

-- Trigger to keep updated_at current
CREATE OR REPLACE FUNCTION update_product_variants_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_dd_product_variants_updated_at ON "dd-product-variants";
CREATE TRIGGER update_dd_product_variants_updated_at
  BEFORE UPDATE ON "dd-product-variants"
  FOR EACH ROW
  EXECUTE FUNCTION update_product_variants_updated_at_column();

-- Enable row level security
ALTER TABLE "dd-product-variants" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Authenticated users can view product variants" ON "dd-product-variants";
DROP POLICY IF EXISTS "Managers can manage product variants" ON "dd-product-variants";

CREATE POLICY "Authenticated users can view product variants" ON "dd-product-variants"
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Managers can manage product variants" ON "dd-product-variants"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "dd-users"
      WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'manager', 'superadmin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "dd-users"
      WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'manager', 'superadmin')
    )
  );

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_dd_product_variants_product_id ON "dd-product-variants"(product_id);
CREATE INDEX IF NOT EXISTS idx_dd_product_variants_name ON "dd-product-variants"(name);
