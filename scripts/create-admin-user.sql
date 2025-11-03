-- Script to create superadmin user in dd-users table
-- First, you need to get the auth user ID from your Supabase auth.users table

-- Step 1: Find your auth user ID
-- Run this query in Supabase SQL Editor to find your auth user ID:
SELECT id, email, created_at FROM auth.users WHERE email = 'your-email@example.com';

-- Step 2: Replace 'YOUR_AUTH_USER_ID_HERE' with the actual ID from step 1
-- Then run this INSERT statement:

INSERT INTO "dd-users" (
  auth_user_id,
  email,
  first_name,
  last_name,
  role,
  is_active,
  hire_date,
  created_at,
  updated_at
) VALUES (
  'YOUR_AUTH_USER_ID_HERE',  -- Replace with actual auth user ID
  'your-email@example.com',  -- Replace with your email
  'Super',                   -- Replace with your first name
  'Admin',                   -- Replace with your last name
  'superadmin',              -- Role: superadmin (full access)
  true,                      -- Active
  CURRENT_DATE,              -- Hire date (today)
  NOW(),                     -- Created at
  NOW()                      -- Updated at
);

-- Step 3: Verify the user was created
SELECT * FROM "dd-users" WHERE role = 'superadmin';

-- Note: Superadmin has full access to:
-- - Create, read, update, delete all users
-- - Access all system features
-- - Manage all roles including other superadmins
-- - Full system administration privileges
