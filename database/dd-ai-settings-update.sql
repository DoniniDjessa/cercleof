-- Add business_query_vocal_response_enabled column to existing dd-ai-settings table
ALTER TABLE "dd-ai-settings" 
ADD COLUMN IF NOT EXISTS business_query_vocal_response_enabled BOOLEAN DEFAULT false;

