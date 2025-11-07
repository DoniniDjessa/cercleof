-- Add variant_id column to sales items to track product variants
ALTER TABLE "dd-ventes-items"
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES "dd-product-variants"(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_dd_ventes_items_variant_id ON "dd-ventes-items"(variant_id);
