-- Fix RLS policies for dd-ventes-items table
-- This file adds the missing RLS policies to allow authenticated users to insert, update, and select from dd-ventes-items

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Authenticated users can view sale items" ON "dd-ventes-items";
DROP POLICY IF EXISTS "Authenticated users can create sale items" ON "dd-ventes-items";
DROP POLICY IF EXISTS "Authenticated users can update sale items" ON "dd-ventes-items";
DROP POLICY IF EXISTS "Admins can delete sale items" ON "dd-ventes-items";

-- Create policies for dd-ventes-items
CREATE POLICY "Authenticated users can view sale items" ON "dd-ventes-items" 
  FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create sale items" ON "dd-ventes-items" 
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update sale items" ON "dd-ventes-items" 
  FOR UPDATE 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can delete sale items" ON "dd-ventes-items" 
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
WHERE tablename = 'dd-ventes-items';

