-- Create dd-gift-cards table for gift card management
CREATE TABLE IF NOT EXISTS "dd-gift-cards" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL, -- Gift card code (e.g., GC-XXXX-XXXX)
  initial_amount DECIMAL(10,2) NOT NULL, -- Original amount when card was created
  current_balance DECIMAL(10,2) NOT NULL, -- Current available balance
  client_id UUID REFERENCES "dd-clients"(id), -- Optional: linked to a specific client
  purchased_by UUID REFERENCES "dd-users"(id), -- User who created/sold the gift card
  purchase_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expiry_date TIMESTAMP WITH TIME ZONE, -- Optional expiry date
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'cancelled')),
  notes TEXT, -- Optional notes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES "dd-users"(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_gift_cards_code ON "dd-gift-cards"(code);
CREATE INDEX IF NOT EXISTS idx_gift_cards_client_id ON "dd-gift-cards"(client_id);
CREATE INDEX IF NOT EXISTS idx_gift_cards_status ON "dd-gift-cards"(status);
CREATE INDEX IF NOT EXISTS idx_gift_cards_expiry_date ON "dd-gift-cards"(expiry_date);

-- Create updated_at trigger
CREATE TRIGGER update_dd_gift_cards_updated_at 
    BEFORE UPDATE ON "dd-gift-cards" 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE "dd-gift-cards" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Authenticated users can view gift cards
CREATE POLICY "Authenticated users can view gift cards" ON "dd-gift-cards" 
    FOR SELECT USING (auth.role() = 'authenticated');

-- Admins and managers can create gift cards
CREATE POLICY "Admins and managers can create gift cards" ON "dd-gift-cards" 
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM "dd-users" 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('admin', 'manager', 'superadmin')
        )
    );

-- Admins and managers can update gift cards
CREATE POLICY "Admins and managers can update gift cards" ON "dd-gift-cards" 
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM "dd-users" 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('admin', 'manager', 'superadmin')
        )
    );

-- Admins and managers can delete gift cards
CREATE POLICY "Admins and managers can delete gift cards" ON "dd-gift-cards" 
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM "dd-users" 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('admin', 'manager', 'superadmin')
        )
    );

-- Create table for gift card transactions (usage history)
CREATE TABLE IF NOT EXISTS "dd-gift-card-transactions" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gift_card_id UUID REFERENCES "dd-gift-cards"(id) ON DELETE CASCADE,
  vente_id UUID REFERENCES "dd-ventes"(id), -- Sale where gift card was used
  amount DECIMAL(10,2) NOT NULL, -- Amount used (negative) or added (positive)
  balance_before DECIMAL(10,2) NOT NULL, -- Balance before transaction
  balance_after DECIMAL(10,2) NOT NULL, -- Balance after transaction
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('purchase', 'usage', 'refund', 'reload')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES "dd-users"(id)
);

-- Create indexes for gift card transactions
CREATE INDEX IF NOT EXISTS idx_gift_card_transactions_gift_card_id ON "dd-gift-card-transactions"(gift_card_id);
CREATE INDEX IF NOT EXISTS idx_gift_card_transactions_vente_id ON "dd-gift-card-transactions"(vente_id);
CREATE INDEX IF NOT EXISTS idx_gift_card_transactions_type ON "dd-gift-card-transactions"(transaction_type);

-- Enable RLS for gift card transactions
ALTER TABLE "dd-gift-card-transactions" ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view gift card transactions
CREATE POLICY "Authenticated users can view gift card transactions" ON "dd-gift-card-transactions" 
    FOR SELECT USING (auth.role() = 'authenticated');

-- Admins and managers can create gift card transactions
CREATE POLICY "Admins and managers can create gift card transactions" ON "dd-gift-card-transactions" 
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM "dd-users" 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('admin', 'manager', 'superadmin', 'caissiere')
        )
    );

