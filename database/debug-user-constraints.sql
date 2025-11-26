-- Debug script to check all constraints on dd-users table and current data

-- 1. Check all constraints on dd-users table
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'dd-users'::regclass
ORDER BY conname;

-- 2. Check for duplicate emails
SELECT email, COUNT(*) as count 
FROM "dd-users" 
GROUP BY email 
HAVING COUNT(*) > 1;

-- 3. Check for duplicate pseudos
SELECT pseudo, COUNT(*) as count 
FROM "dd-users" 
GROUP BY pseudo 
HAVING COUNT(*) > 1;

-- 4. Check all current roles
SELECT DISTINCT role, COUNT(*) as count 
FROM "dd-users" 
GROUP BY role 
ORDER BY role;

-- 5. Check for any NULL values in required fields
SELECT 
    COUNT(*) as total_users,
    COUNT(email) as has_email,
    COUNT(pseudo) as has_pseudo,
    COUNT(first_name) as has_first_name,
    COUNT(last_name) as has_last_name,
    COUNT(role) as has_role
FROM "dd-users";

-- 6. Show recent users to check data format
SELECT id, email, pseudo, first_name, last_name, role, created_at
FROM "dd-users" 
ORDER BY created_at DESC 
LIMIT 5;
