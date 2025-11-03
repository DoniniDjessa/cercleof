# Database Setup Instructions

## 1. Create the dd-users table

Run the SQL script in your Supabase SQL editor:

```sql
-- Copy and paste the contents of database/dd-users.sql
```

## 2. Create your first superadmin user

After creating the table, you'll need to manually create your first superadmin user. You can do this in two ways:

### Option A: Using the Web Interface (Recommended)
1. Start your development server: `npm run dev`
2. Go to `http://localhost:3000`
3. Login with your existing auth user credentials
4. You'll be redirected to the setup page
5. Complete the form with your details (role defaults to 'superadmin')
6. Click "Create Superadmin Profile"

### Option B: Using Supabase Dashboard
1. Go to Authentication > Users in your Supabase dashboard
2. Create a new user with email and password
3. Note the user ID
4. Go to Table Editor > dd-users
5. Insert a new row with:
   - `auth_user_id`: The user ID from step 2
   - `email`: The user's email
   - `first_name`: User's first name
   - `last_name`: User's last name
   - `role`: 'superadmin'
   - `is_active`: true

### Option C: Using SQL
```sql
-- First create the auth user (you'll need to do this through Supabase Auth or the app)
-- Then insert the profile record
INSERT INTO "dd-users" (
  auth_user_id,
  email,
  first_name,
  last_name,
  role,
  is_active
) VALUES (
  'your-auth-user-id-here',
  'admin@yourcompany.com',
  'Super',
  'Admin',
  'superadmin',
  true
);
```

## 3. Test the system

1. Start your development server: `npm run dev`
2. Go to `http://localhost:3000`
3. You should be redirected to the login page
4. Login with your superadmin credentials
5. You should see the dashboard with access to "Manage Users (Full Access)"

## 4. Create additional users

Once logged in as superadmin:
1. Click "Manage Users" on the dashboard
2. Click "Create New User"
3. Fill in the user details
4. The system will automatically create both the auth user and profile record

## 5. Role Permissions

- **superadmin**: Full access to everything, can create/manage all users including other superadmins
- **admin**: Can manage users (except superadmin), access all features
- **manager**: Can manage staff and operations
- **caissiere**: Can access POS and transactions
- **employe**: Basic access to assigned tasks

**Note**: Superadmin is separate from employees and has complete system control.

## Next Steps

After setting up the users table, you can proceed to create other tables for:
- Products (dd-products)
- Services (dd-services)
- Clients (dd-clients)
- Appointments (dd-appointments)
- Transactions (dd-transactions)
- And more...

See `database/schema-plan.md` for the complete database design.
