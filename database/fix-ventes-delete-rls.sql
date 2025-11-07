-- Fix RLS policy for deleting dd-ventes
-- The policy was checking WHERE id = auth.uid() but should check WHERE auth_user_id = auth.uid()
-- This was preventing all deletions from working

-- Drop the incorrect policy
DROP POLICY IF EXISTS "Admins can delete sales" ON "dd-ventes";

-- Create the correct policy using auth_user_id instead of id
CREATE POLICY "Admins can delete sales" ON "dd-ventes" 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM "dd-users" 
      WHERE auth_user_id = auth.uid() 
      AND (role = 'admin' OR role = 'superadmin' OR role = 'manager')
    )
  );

-- Also fix the RLS policy for dd-ventes-items if it exists
DROP POLICY IF EXISTS "Admins can delete sale items" ON "dd-ventes-items";

CREATE POLICY "Admins can delete sale items" ON "dd-ventes-items" 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM "dd-users" 
      WHERE auth_user_id = auth.uid() 
      AND (role = 'admin' OR role = 'superadmin' OR role = 'manager')
    )
  );

-- Verify the policies were created correctly
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual 
FROM pg_policies 
WHERE tablename IN ('dd-ventes', 'dd-ventes-items') AND cmd = 'DELETE'
ORDER BY tablename, policyname;

