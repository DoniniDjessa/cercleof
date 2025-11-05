-- Fix RLS policies for dd-livraisons, dd-revenues, and dd-actions tables
-- This file adds the missing RLS policies to allow authenticated users to insert, update, and select from these tables

-- ==============================================
-- 1. dd-livraisons
-- ==============================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Authenticated users can view deliveries" ON "dd-livraisons";
DROP POLICY IF EXISTS "Authenticated users can create deliveries" ON "dd-livraisons";
DROP POLICY IF EXISTS "Authenticated users can update deliveries" ON "dd-livraisons";
DROP POLICY IF EXISTS "Admins can delete deliveries" ON "dd-livraisons";

-- Create policies for dd-livraisons
CREATE POLICY "Authenticated users can view deliveries" ON "dd-livraisons" 
  FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create deliveries" ON "dd-livraisons" 
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update deliveries" ON "dd-livraisons" 
  FOR UPDATE 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can delete deliveries" ON "dd-livraisons" 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM "dd-users" 
      WHERE auth_user_id = auth.uid() 
      AND (role = 'admin' OR role = 'superadmin' OR role = 'manager')
    )
  );

-- ==============================================
-- 2. dd-revenues
-- ==============================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Authenticated users can view revenues" ON "dd-revenues";
DROP POLICY IF EXISTS "Authenticated users can create revenues" ON "dd-revenues";
DROP POLICY IF EXISTS "Authenticated users can update revenues" ON "dd-revenues";
DROP POLICY IF EXISTS "Admins can delete revenues" ON "dd-revenues";

-- Create policies for dd-revenues
CREATE POLICY "Authenticated users can view revenues" ON "dd-revenues" 
  FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create revenues" ON "dd-revenues" 
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update revenues" ON "dd-revenues" 
  FOR UPDATE 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can delete revenues" ON "dd-revenues" 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM "dd-users" 
      WHERE auth_user_id = auth.uid() 
      AND (role = 'admin' OR role = 'superadmin' OR role = 'manager')
    )
  );

-- ==============================================
-- 3. dd-actions
-- ==============================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Authenticated users can view actions" ON "dd-actions";
DROP POLICY IF EXISTS "Authenticated users can create actions" ON "dd-actions";
DROP POLICY IF EXISTS "Authenticated users can update actions" ON "dd-actions";
DROP POLICY IF EXISTS "Admins can delete actions" ON "dd-actions";

-- Create policies for dd-actions
CREATE POLICY "Authenticated users can view actions" ON "dd-actions" 
  FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create actions" ON "dd-actions" 
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update actions" ON "dd-actions" 
  FOR UPDATE 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can delete actions" ON "dd-actions" 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM "dd-users" 
      WHERE auth_user_id = auth.uid() 
      AND (role = 'admin' OR role = 'superadmin' OR role = 'manager')
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
WHERE tablename IN ('dd-livraisons', 'dd-revenues', 'dd-actions')
ORDER BY tablename, policyname;

