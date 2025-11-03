# Supabase Admin API Setup

The user creation system now uses a server-side API route with the Supabase service role key to create users directly in Supabase auth.

## Required Setup

1. Go to your Supabase project dashboard
2. Navigate to Settings > API
3. Copy the `service_role` key (not the `anon` key)
4. Add it to your environment variables:

```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

## How It Works

The system uses a server-side API route (`/api/admin/create-user`) that:

1. **Creates auth user**: Uses Supabase admin API with service role key
2. **Creates profile**: Links the auth user to a profile in `dd-users` table
3. **Immediate access**: Users can log in right away with email/password
4. **Pseudo login**: Users can also log in with their username (pseudo)

## User Creation Flow

1. **Admin creates user** with email, password, and profile details
2. **API route processes** the request using service role key
3. **Auth user created** in Supabase auth system
4. **Profile created** in `dd-users` table with proper linking
5. **User can log in** immediately with email/password or pseudo/password

## Security Features

- **Server-side processing**: Admin operations happen on the server
- **Service role key**: Only accessible on the server, not exposed to client
- **Proper linking**: Auth user and profile are properly connected
- **Error handling**: Cleanup if profile creation fails
- **Duplicate prevention**: Checks for existing users before creation

## Benefits

- ✅ **Direct auth creation**: Users appear in Supabase auth immediately
- ✅ **No permission issues**: Uses service role key for admin operations
- ✅ **Immediate login**: Users can log in right after creation
- ✅ **Pseudo/email login**: Supports both login methods
- ✅ **Secure**: Admin operations happen server-side
