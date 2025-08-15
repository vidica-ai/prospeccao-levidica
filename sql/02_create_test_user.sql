-- SQL script to create the test user: levidica with password: lericia21
-- Note: This should be run after setting up authentication in Supabase

-- This is a reference script. The actual user creation should be done through:
-- 1. Supabase Dashboard Auth section, OR
-- 2. Using the Supabase client signup function, OR
-- 3. Using the SQL functions below (if you have service role access)

-- Function to create a user programmatically (requires service role key)
-- This is for reference - actual implementation should use Supabase Auth API

/*
-- Example of how to create user via SQL (requires admin privileges)
-- This is typically done through the Supabase client or dashboard instead

INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'levidica',
    crypt('lericia21', gen_salt('bf')),
    NOW(),
    NULL,
    NULL,
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Levidica User"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
);
*/

-- After user is created through proper channels, you can update their profile:
-- UPDATE public.profiles 
-- SET full_name = 'Levidica User'
-- WHERE email = 'levidica';