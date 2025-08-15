#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ianubhwniejdnhasxzqd.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhbnViaHduaWVqZG5oYXN4enFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMjcwNDUsImV4cCI6MjA3MDcwMzA0NX0.f7Dog5aRp5TEjGn8dwuSSflYzpKZlCZaT5KMhhGNHTE';

// Test user credentials
const testUser = {
  email: 'levidica@local.dev', // Note: Supabase requires valid email format
  password: 'lericia21'
};

async function createTestUser() {
  console.log('🚀 Creating test user in Supabase...');
  console.log(`📧 Email: ${testUser.email}`);
  console.log(`🔗 Supabase URL: ${supabaseUrl}`);
  
  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  try {
    // Attempt to sign up the user
    const { data, error } = await supabase.auth.signUp({
      email: testUser.email,
      password: testUser.password,
      options: {
        emailRedirectTo: undefined, // Disable email confirmation redirect
        data: {
          full_name: 'Levidica Test User'
        }
      }
    });

    if (error) {
      // If user already exists, try to sign in to verify credentials
      if (error.message.includes('already registered')) {
        console.log('⚠️  User already exists. Attempting to verify login...');
        
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: testUser.email,
          password: testUser.password
        });

        if (signInError) {
          console.error('❌ Failed to sign in with existing user:', signInError.message);
          return false;
        }

        console.log('✅ User already exists and login is working!');
        console.log(`👤 User ID: ${signInData.user.id}`);
        console.log(`📧 Email: ${signInData.user.email}`);
        console.log(`📅 Created: ${signInData.user.created_at}`);
        
        // Sign out after verification
        await supabase.auth.signOut();
        return true;
      } else {
        console.error('❌ Error creating user:', error.message);
        return false;
      }
    }

    console.log('✅ Test user created successfully!');
    console.log(`👤 User ID: ${data.user.id}`);
    console.log(`📧 Email: ${data.user.email}`);
    console.log(`📅 Created: ${data.user.created_at}`);
    
    // Check if email confirmation is required
    if (data.user && !data.user.email_confirmed_at) {
      console.log('📨 Note: Email confirmation may be required depending on your Supabase auth settings.');
      console.log('   If email confirmation is enabled, check your email or disable it in Supabase Dashboard > Authentication > Settings');
    }

    return true;

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    return false;
  }
}

async function testUserLogin() {
  console.log('\n🔐 Testing user login...');
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password
    });

    if (error) {
      console.error('❌ Login test failed:', error.message);
      return false;
    }

    console.log('✅ Login test successful!');
    console.log(`👤 Logged in as: ${data.user.email}`);
    console.log(`🔑 Session token: ${data.session.access_token.substring(0, 20)}...`);
    
    // Sign out after test
    await supabase.auth.signOut();
    console.log('🚪 Signed out successfully');
    
    return true;

  } catch (error) {
    console.error('❌ Login test error:', error.message);
    return false;
  }
}

// Main execution
async function main() {
  console.log('=' .repeat(50));
  console.log('🧪 SUPABASE TEST USER CREATION SCRIPT');
  console.log('=' .repeat(50));
  
  const userCreated = await createTestUser();
  
  if (userCreated) {
    const loginWorking = await testUserLogin();
    
    console.log('\n' + '=' .repeat(50));
    console.log('📋 SUMMARY');
    console.log('=' .repeat(50));
    console.log(`✅ User Creation: ${userCreated ? 'SUCCESS' : 'FAILED'}`);
    console.log(`✅ Login Test: ${loginWorking ? 'SUCCESS' : 'FAILED'}`);
    console.log(`📧 Email: ${testUser.email}`);
    console.log(`🔑 Password: ${testUser.password}`);
    console.log('\n🎉 Test user is ready to use!');
    
    if (!loginWorking) {
      console.log('\n⚠️  Note: If login failed, check your Supabase auth settings:');
      console.log('   - Email confirmation requirements');
      console.log('   - User auto-confirmation settings');
      console.log('   - RLS policies if any');
    }
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { createTestUser, testUserLogin };