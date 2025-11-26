-- Simple fix for role constraint issue
-- Run this in your Supabase SQL Editor

-- Step 1: Drop the existing constraint
ALTER TABLE "dd-users" DROP CONSTRAINT IF EXISTS "dd-users_role_check";

-- Step 2: Add the correct constraint
ALTER TABLE "dd-users" ADD CONSTRAINT "dd-users_role_check" 
CHECK (role IN ('superadmin', 'admin', 'manager', 'caissiere', 'receptionniste', 'employe'));

-- Step 3: Verify it worked
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'dd-users'::regclass 
AND conname = 'dd-users_role_check';

-- Step 4: Check current roles in the table
SELECT DISTINCT role, COUNT(*) as count 
FROM "dd-users" 
GROUP BY role 
ORDER BY role;
