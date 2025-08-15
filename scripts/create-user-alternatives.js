#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ianubhwniejdnhasxzqd.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhbnViaHduaWVqZG5oYXN4enFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMjcwNDUsImV4cCI6MjA3MDcwMzA0NX0.f7Dog5aRp5TEjGn8dwuSSflYzpKZlCZaT5KMhhGNHTE';

console.log('🔧 ALTERNATIVE USER CREATION METHODS');
console.log('=' .repeat(60));

console.log('\n📋 ISSUE: "levidica" is not a valid email format for Supabase');
console.log('Supabase requires proper email format (user@domain.com)');

console.log('\n💡 SOLUTION OPTIONS:');
console.log('1. Use "levidica@test.com" as email');
console.log('2. Use "levidica@example.com" as email');
console.log('3. Use "levidica@local.dev" as email');
console.log('4. Configure Supabase to allow custom email formats (advanced)');

console.log('\n🚀 RECOMMENDED APPROACH:');
console.log('Use a proper email format and create an alias in your application');

// Test user options
const userOptions = [
  { email: 'levidica@test.com', password: 'lericia21', description: 'Standard test domain' },
  { email: 'levidica@example.com', password: 'lericia21', description: 'RFC compliant example domain' },
  { email: 'levidica@local.dev', password: 'lericia21', description: 'Local development domain' }
];

async function createUserWithEmail(userConfig) {
  console.log(`\n🔄 Attempting to create user: ${userConfig.email}`);
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email: userConfig.email,
      password: userConfig.password,
      options: {
        data: {
          full_name: 'Levidica Test User',
          username: 'levidica' // Store original username in metadata
        }
      }
    });

    if (error) {
      if (error.message.includes('already registered')) {
        console.log(`⚠️  User ${userConfig.email} already exists`);
        return { success: true, exists: true, user: null };
      } else {
        console.log(`❌ Error: ${error.message}`);
        return { success: false, error: error.message };
      }
    }

    console.log(`✅ User created successfully!`);
    console.log(`   User ID: ${data.user.id}`);
    console.log(`   Email: ${data.user.email}`);
    
    return { success: true, exists: false, user: data.user };

  } catch (error) {
    console.log(`❌ Unexpected error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testLogin(email, password) {
  console.log(`\n🔐 Testing login for: ${email}`);
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) {
      console.log(`❌ Login failed: ${error.message}`);
      return false;
    }

    console.log(`✅ Login successful!`);
    console.log(`   Session: ${data.session.access_token.substring(0, 20)}...`);
    
    // Sign out
    await supabase.auth.signOut();
    return true;

  } catch (error) {
    console.log(`❌ Login error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('\n🎯 ATTEMPTING USER CREATION WITH DIFFERENT EMAIL FORMATS:');
  
  let createdUser = null;
  
  for (const userConfig of userOptions) {
    console.log(`\n📧 Trying: ${userConfig.email} (${userConfig.description})`);
    
    const result = await createUserWithEmail(userConfig);
    
    if (result.success) {
      createdUser = userConfig;
      
      // Test login
      const loginSuccess = await testLogin(userConfig.email, userConfig.password);
      
      if (loginSuccess) {
        console.log('\n🎉 SUCCESS! User created and login tested successfully');
        console.log(`📧 Email: ${userConfig.email}`);
        console.log(`🔑 Password: ${userConfig.password}`);
        console.log('\n💡 You can now use this email/password combination to sign in');
        
        if (userConfig.email !== 'levidica') {
          console.log('\n📝 NOTE: To use "levidica" as a username in your app:');
          console.log('   - Store "levidica" in user metadata during signup');
          console.log('   - Use email for authentication, username for display');
          console.log('   - Create a mapping in your application logic');
        }
        break;
      }
    }
  }
  
  if (!createdUser) {
    console.log('\n❌ Failed to create user with any email format');
    console.log('\n🔧 TROUBLESHOOTING:');
    console.log('   1. Check Supabase project configuration');
    console.log('   2. Verify auth settings in Supabase dashboard');
    console.log('   3. Check if email confirmation is required');
    console.log('   4. Review RLS policies if any');
  }
}

// Show SQL alternative for advanced users
function showSQLAlternative() {
  console.log('\n🔧 ADVANCED: Direct SQL Approach (Requires Service Role Key)');
  console.log('=' .repeat(60));
  console.log('If you have service role access, you can use SQL to create users:');
  console.log(`
-- This would require the service role key and direct database access
-- WARNING: Only use this approach if you understand the security implications

-- 1. First, you would need the service role key from Supabase dashboard
-- 2. Then you could potentially insert directly into auth.users table
-- 3. However, this bypasses Supabase's built-in validation and security

-- RECOMMENDED: Use the proper email format approach shown above instead
`);
}

if (require.main === module) {
  main().then(() => {
    showSQLAlternative();
  }).catch(console.error);
}