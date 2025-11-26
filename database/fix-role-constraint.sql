-- Fix role constraint issue in dd-users table
-- This script will drop the existing constraint and create a new one with proper role values

-- Drop the existing constraint
ALTER TABLE "dd-users" DROP CONSTRAINT IF EXISTS "dd-users_role_check";

-- Add the new constraint with all valid roles
ALTER TABLE "dd-users" ADD CONSTRAINT "dd-users_role_check" 
CHECK (role IN ('superadmin', 'admin', 'manager', 'caissiere', 'receptionniste', 'employe'));

-- Verify the constraint was added
SELECT conname, pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'dd-users'::regclass 
AND conname = 'dd-users_role_check'; 

-- Check current roles in the table to see if there are any invalid ones
SELECT DISTINCT role, COUNT(*) as count 
FROM "dd-users" 
GROUP BY role 
ORDER BY role;
