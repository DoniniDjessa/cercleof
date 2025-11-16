-- Create inventory movements table to track product transfers and stock changes
CREATE TABLE IF NOT EXISTS "dd-inventory_movements" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES "dd-products"(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  movement_type VARCHAR(10) NOT NULL CHECK (movement_type IN ('in', 'out')),
  reason TEXT,
  target_location VARCHAR(50), -- e.g. 'salon', 'owner', 'shop', 'other'
  taken_by UUID REFERENCES "dd-users"(id), -- user who recorded the movement
  reference_type VARCHAR(50), -- e.g. 'transfer'
  reference_id UUID, -- optional reference to another table
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


