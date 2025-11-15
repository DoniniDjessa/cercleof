-- Add contact_phone column to dd-livraisons table for delivery contact information
ALTER TABLE "dd-livraisons" 
ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20);

-- Add comment
COMMENT ON COLUMN "dd-livraisons".contact_phone IS 'Contact phone number for delivery (can be different from client phone)';

