-- Fix RLS policies for dd-services-produits table
-- This file adds the missing RLS policies to allow authenticated users to insert, update, and select from dd-services-produits

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Authenticated users can view service products" ON "dd-services-produits";
DROP POLICY IF EXISTS "Authenticated users can create service products" ON "dd-services-produits";
DROP POLICY IF EXISTS "Authenticated users can update service products" ON "dd-services-produits";
DROP POLICY IF EXISTS "Admins can delete service products" ON "dd-services-produits";

-- Create policies for dd-services-produits
CREATE POLICY "Authenticated users can view service products" ON "dd-services-produits" 
  FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create service products" ON "dd-services-produits" 
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update service products" ON "dd-services-produits" 
  FOR UPDATE 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can delete service products" ON "dd-services-produits" 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM "dd-users" 
      WHERE auth_user_id = auth.uid() 
      AND (role = 'admin' OR role = 'superadmin')
    )
  );

-- Verify policies are created
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual 
FROM pg_policies 
WHERE tablename = 'dd-services-produits';

