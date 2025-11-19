-- Create dd-ai-settings table for AI Assistant user preferences
CREATE TABLE IF NOT EXISTS "dd-ai-settings" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES "dd-users"(id) ON DELETE CASCADE UNIQUE NOT NULL,
  voice_navigation_enabled BOOLEAN DEFAULT false,
  product_recommendation_enabled BOOLEAN DEFAULT true,
  skin_analysis_enabled BOOLEAN DEFAULT true,
  business_query_enabled BOOLEAN DEFAULT true,
  business_query_vocal_response_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_dd_ai_settings_user_id ON "dd-ai-settings"(user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_ai_settings_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if exists, then create it
DROP TRIGGER IF EXISTS update_dd_ai_settings_updated_at ON "dd-ai-settings";

-- Drop trigger if exists, then create it
DROP TRIGGER IF EXISTS update_dd_ai_settings_updated_at ON "dd-ai-settings";

CREATE TRIGGER update_dd_ai_settings_updated_at 
    BEFORE UPDATE ON "dd-ai-settings" 
    FOR EACH ROW 
    EXECUTE FUNCTION update_ai_settings_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE "dd-ai-settings" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only view and update their own settings
CREATE POLICY "Users can view their own AI settings" ON "dd-ai-settings"
    FOR SELECT
    USING (
        user_id IN (
            SELECT id FROM "dd-users" 
            WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own AI settings" ON "dd-ai-settings"
    FOR INSERT
    WITH CHECK (
        user_id IN (
            SELECT id FROM "dd-users" 
            WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own AI settings" ON "dd-ai-settings"
    FOR UPDATE
    USING (
        user_id IN (
            SELECT id FROM "dd-users" 
            WHERE auth_user_id = auth.uid()
        )
    );

