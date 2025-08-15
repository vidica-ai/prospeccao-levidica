# Supabase Authentication Setup Instructions

This guide will walk you through setting up a complete Supabase authentication system for the Levidica project.

## Prerequisites

- Node.js (version 16 or higher)
- A Supabase account (free tier available at https://supabase.com)

## Step 1: Create Supabase Project

1. Go to https://supabase.com and sign in/up
2. Click "New Project"
3. Choose your organization
4. Fill in project details:
   - **Name**: `prospeccao-levidica`
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose closest to your location
5. Click "Create new project"
6. Wait for the project to be provisioned (usually 1-2 minutes)

## Step 2: Get Project Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **Project API Keys**:
     - `anon` `public` key
     - `service_role` `secret` key (keep this secure!)

## Step 3: Configure Environment Variables

1. Open the `.env` file in your project
2. Replace the placeholder values with your actual Supabase credentials:

```env
# Replace with your actual Supabase project values
SUPABASE_URL=https://your-actual-project-ref.supabase.co
SUPABASE_ANON_KEY=your-actual-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-actual-service-role-key-here

# Update database URL with your project details
DATABASE_URL=postgresql://postgres:[your-db-password]@db.your-project-ref.supabase.co:5432/postgres

# Application Configuration
NODE_ENV=development
PORT=3000
```

## Step 4: Set Up Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Run the SQL script from `sql/01_auth_setup.sql`:
   - Copy the entire content of the file
   - Paste it into the SQL Editor
   - Click "Run" to execute

This will:
- Create a `profiles` table linked to `auth.users`
- Set up Row Level Security (RLS) policies
- Create triggers for automatic profile creation
- Set up proper permissions

## Step 5: Install Dependencies

Run the following command in your project directory:

```bash
npm install
```

This will install:
- `@supabase/supabase-js` - Supabase JavaScript client
- `dotenv` - Environment variable management
- `supabase` - Supabase CLI (dev dependency)

## Step 6: Test the Setup

Run the demo server to test authentication:

```bash
npm run dev
```

This will:
1. Create the user "levidica" with password "lericia21"
2. Test login functionality
3. Demonstrate profile management
4. Test sign out

## Step 7: Enable Email Authentication (Optional)

If you want email confirmation:

1. Go to **Authentication** → **Settings** in your Supabase dashboard
2. Configure email settings:
   - Enable "Enable email confirmations"
   - Set up SMTP settings (or use Supabase's built-in email service)

## Project Structure

```
prospeccao-levidica/
├── lib/
│   ├── supabase.js          # Supabase client configuration
│   └── auth.js              # Authentication service methods
├── sql/
│   ├── 01_auth_setup.sql    # Database schema and RLS setup
│   └── 02_create_test_user.sql # Reference for user creation
├── .env                     # Environment variables (your actual config)
├── .env.example            # Environment template
├── package.json            # Project dependencies
├── server.js               # Demo server and test suite
└── SETUP_INSTRUCTIONS.md   # This file
```

## Available Authentication Methods

The `AuthService` class provides the following methods:

### User Management
- `signUp(email, password, metadata)` - Register new user
- `signIn(email, password)` - Login user
- `signOut()` - Logout user
- `getCurrentUser()` - Get current session
- `createUserAsAdmin(email, password, metadata)` - Admin user creation

### Profile Management
- `getUserProfile(userId)` - Get user profile
- `updateUserProfile(userId, updates)` - Update user profile

## Security Features

✅ **Row Level Security (RLS)** - Users can only access their own data
✅ **Password Hashing** - Passwords are securely hashed by Supabase
✅ **JWT Tokens** - Secure session management
✅ **Email Validation** - Optional email confirmation
✅ **Service Role Protection** - Admin functions require service role key

## Testing Your Setup

After completing the setup, you should be able to:

1. **Create the test user**:
   - Email: `levidica`
   - Password: `lericia21`

2. **Login with credentials**:
   ```javascript
   const result = await authService.signIn('levidica', 'lericia21');
   ```

3. **Access user session**:
   ```javascript
   const user = await authService.getCurrentUser();
   ```

## Troubleshooting

### Common Issues:

1. **"Invalid API key"**
   - Double-check your `.env` file has correct Supabase credentials
   - Ensure no extra spaces or quotes around the values

2. **"Project not found"**
   - Verify the `SUPABASE_URL` matches your project URL exactly

3. **"User already registered"**
   - This is normal if you've run the demo multiple times
   - The demo will attempt to login instead

4. **"Profile not found"**
   - Make sure you've run the SQL setup script (`01_auth_setup.sql`)
   - Check that the trigger is created properly

5. **Database connection issues**
   - Verify your database password in the `DATABASE_URL`
   - Ensure your IP is whitelisted (Supabase free tier allows all IPs by default)

## Next Steps

1. **Frontend Integration**: Use the authentication service in your frontend application
2. **Additional Tables**: Add more tables for your application data
3. **API Endpoints**: Create protected API routes using the authentication
4. **Real-time Features**: Implement real-time subscriptions for live updates
5. **File Storage**: Set up Supabase Storage for file uploads if needed

## Support

- Supabase Documentation: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
- GitHub Issues: For project-specific issues

Your Supabase authentication system is now ready to use!