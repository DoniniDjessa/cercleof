-- Migration: Add image and video fields to dd-categories table
-- This allows categories and subcategories to have images and videos uploaded via Cloudinary

-- Add image column to dd-categories table if it doesn't exist
ALTER TABLE "dd-categories" 
ADD COLUMN IF NOT EXISTS image TEXT;

-- Add video column to dd-categories table if it doesn't exist
ALTER TABLE "dd-categories" 
ADD COLUMN IF NOT EXISTS video TEXT;

-- Add comments to document the fields
COMMENT ON COLUMN "dd-categories".image IS 'URL to the category image stored in Cloudinary';
COMMENT ON COLUMN "dd-categories".video IS 'URL to the category video stored in Cloudinary';

