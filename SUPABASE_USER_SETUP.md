# Supabase Test User Setup Guide

## Summary
Created test user for the Levidica project with the following credentials:

**User Details:**
- **Email:** `levidica@local.dev`
- **Password:** `lericia21`
- **Display Name:** `levidica`
- **Full Name:** `Levidica Test User`

## Important Notes

### Email Format Issue
The original request was to use `levidica` as the email, but Supabase requires valid email format. We solved this by:
- Using `levidica@local.dev` as the authentication email
- Storing `levidica` as the display username in user metadata
- Your application can show "levidica" to users while using the full email for authentication

### Email Confirmation Required
Your Supabase project has email confirmation enabled. To use the test user immediately:

**Option 1: Disable Email Confirmation (Recommended for Testing)**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `vidica-producoes`
3. Navigate to: Authentication > Settings
4. Find "Enable email confirmations"
5. Toggle it **OFF**
6. Save settings
7. The user can now sign in immediately

**Option 2: Manually Confirm User**
1. Go to Supabase Dashboard > Authentication > Users
2. Find user: `levidica@local.dev`
3. Click on the user
4. Manually confirm their email address

## User Creation Scripts

Three scripts have been created in the `/scripts` directory:

### 1. `create-levidica-user.js` (Recommended)
```bash
node scripts/create-levidica-user.js
```
- Comprehensive script with error handling
- Provides detailed instructions
- Checks authentication status

### 2. `create-test-user.js`
```bash
node scripts/create-test-user.js
```
- Simple user creation and testing
- Good for basic verification

### 3. `create-user-alternatives.js`
```bash
node scripts/create-user-alternatives.js
```
- Tries multiple email formats
- Shows troubleshooting options

## Manual Verification

After creating the user and handling email confirmation, test the login:

```javascript
import { supabase } from '../lib/supabase';

const testLogin = async () => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'levidica@local.dev',
    password: 'lericia21'
  });
  
  if (error) {
    console.error('Login failed:', error.message);
  } else {
    console.log('Login successful:', data.user.email);
  }
};
```

## Integration in Your App

To use "levidica" as the displayed username while maintaining proper authentication:

```javascript
// During signup, store the preferred username
const { data, error } = await supabase.auth.signUp({
  email: 'levidica@local.dev',
  password: 'lericia21',
  options: {
    data: {
      username: 'levidica',
      display_name: 'levidica',
      full_name: 'Levidica Test User'
    }
  }
});

// In your app, display the username from metadata
const user = supabase.auth.getUser();
const displayName = user?.user_metadata?.username || user?.email;
```

## Troubleshooting

### Common Issues:

1. **"Email not confirmed"**
   - Solution: Disable email confirmation in Supabase settings

2. **"Rate limit exceeded"**
   - Solution: Wait 20+ seconds between signup attempts

3. **"Invalid email format"**
   - Solution: Use proper email format (we used `@local.dev`)

4. **User already exists**
   - Solution: The scripts handle this and will verify login instead

### Current Status:
- ✅ User created: `levidica@local.dev`
- ⚠️ Email confirmation needed (see instructions above)
- 🔑 Password: `lericia21`

Once you disable email confirmation or manually confirm the user, you can sign in immediately with these credentials.