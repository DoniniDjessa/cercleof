-- Create pending receipts table for receipt sharing system
-- This table stores receipts that admins send to receptionists/users for printing

CREATE TABLE IF NOT EXISTS "dd-pending_receipts" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES "dd-ventes"(id) ON DELETE CASCADE,
  sent_by UUID NOT NULL REFERENCES "dd-users"(id) ON DELETE CASCADE,
  sent_to UUID REFERENCES "dd-users"(id) ON DELETE SET NULL, -- NULL means sent to all receptionists
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  read_by UUID REFERENCES "dd-users"(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pending_receipts_sale_id ON "dd-pending_receipts"(sale_id);
CREATE INDEX IF NOT EXISTS idx_pending_receipts_sent_by ON "dd-pending_receipts"(sent_by);
CREATE INDEX IF NOT EXISTS idx_pending_receipts_sent_to ON "dd-pending_receipts"(sent_to);
CREATE INDEX IF NOT EXISTS idx_pending_receipts_is_read ON "dd-pending_receipts"(is_read);
CREATE INDEX IF NOT EXISTS idx_pending_receipts_sent_at ON "dd-pending_receipts"(sent_at);

-- Enable RLS (Row Level Security)
ALTER TABLE "dd-pending_receipts" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can see receipts sent to them or sent to all (sent_to IS NULL)
CREATE POLICY "Users can view their pending receipts" ON "dd-pending_receipts"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "dd-users" 
      WHERE auth_user_id = auth.uid() 
      AND (
        id = sent_to 
        OR sent_to IS NULL 
        OR (role IN ('receptionniste', 'admin', 'superadmin', 'manager'))
      )
    )
  );

-- Only admins can create pending receipts
CREATE POLICY "Admins can create pending receipts" ON "dd-pending_receipts"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "dd-users" 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'superadmin', 'manager')
    )
  );

-- Users can update read status of their receipts
CREATE POLICY "Users can update read status" ON "dd-pending_receipts"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "dd-users" 
      WHERE auth_user_id = auth.uid() 
      AND (
        id = sent_to 
        OR sent_to IS NULL 
        OR (role IN ('receptionniste', 'admin', 'superadmin', 'manager'))
      )
    )
  );

-- Only admins can delete pending receipts
CREATE POLICY "Admins can delete pending receipts" ON "dd-pending_receipts"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "dd-users" 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'superadmin', 'manager')
    )
  );

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_pending_receipts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_pending_receipts_updated_at_trigger
  BEFORE UPDATE ON "dd-pending_receipts"
  FOR EACH ROW
  EXECUTE FUNCTION update_pending_receipts_updated_at();

-- Verify the table was created successfully
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'dd-pending_receipts' 
ORDER BY ordinal_position;
