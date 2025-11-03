-- Fix the foreign key constraint for dd-products table
-- This script updates the dd-products table to use the unified dd-categories table

-- First, drop the existing foreign key constraint
ALTER TABLE "dd-products" DROP CONSTRAINT IF EXISTS "dd-products_category_id_fkey";

-- Add the correct foreign key constraint to reference dd-categories
ALTER TABLE "dd-products" 
ADD CONSTRAINT "dd-products_category_id_fkey" 
FOREIGN KEY (category_id) REFERENCES "dd-categories"(id);

-- Also fix the dd-services table if it exists
ALTER TABLE "dd-services" DROP CONSTRAINT IF EXISTS "dd-services_category_id_fkey";

ALTER TABLE "dd-services" 
ADD CONSTRAINT "dd-services_category_id_fkey" 
FOREIGN KEY (category_id) REFERENCES "dd-categories"(id);

-- Verify the constraints are properly set
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('dd-products', 'dd-services')
  AND ccu.table_name = 'dd-categories';
