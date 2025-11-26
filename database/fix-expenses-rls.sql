-- Fix RLS policies for dd-depenses table
-- This script adds the missing RLS policies to allow authenticated users to create, view, and manage expenses

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Authenticated users can view expenses" ON "dd-depenses";
DROP POLICY IF EXISTS "Authenticated users can create expenses" ON "dd-depenses";
DROP POLICY IF EXISTS "Authenticated users can update expenses" ON "dd-depenses";
DROP POLICY IF EXISTS "Admins can delete expenses" ON "dd-depenses";

-- Create policies for dd-depenses
CREATE POLICY "Authenticated users can view expenses" ON "dd-depenses" 
  FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create expenses" ON "dd-depenses" 
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update expenses" ON "dd-depenses" 
  FOR UPDATE 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can delete expenses" ON "dd-depenses" 
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
WHERE tablename = 'dd-depenses'
ORDER BY policyname;
