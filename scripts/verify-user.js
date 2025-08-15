#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ianubhwniejdnhasxzqd.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhbnViaHduaWVqZG5oYXN4enFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMjcwNDUsImV4cCI6MjA3MDcwMzA0NX0.f7Dog5aRp5TEjGn8dwuSSflYzpKZlCZaT5KMhhGNHTE';

// Test credentials
const credentials = {
  email: 'levidica@local.dev',
  password: 'lericia21'
};

async function verifyUserLogin() {
  console.log('🔐 VERIFYING LEVIDICA USER LOGIN');
  console.log('=' .repeat(40));
  console.log(`📧 Email: ${credentials.email}`);
  console.log(`🔑 Password: ${credentials.password}`);
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  try {
    console.log('\n🚀 Attempting to sign in...');
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password
    });

    if (error) {
      console.log(`❌ Login failed: ${error.message}`);
      
      if (error.message.includes('Email not confirmed')) {
        console.log('\n⚠️  EMAIL CONFIRMATION STILL REQUIRED');
        console.log('Please follow the instructions in SUPABASE_USER_SETUP.md to:');
        console.log('1. Disable email confirmation in Supabase settings, OR');
        console.log('2. Manually confirm the user in Supabase dashboard');
      } else if (error.message.includes('Invalid login credentials')) {
        console.log('\n❌ INVALID CREDENTIALS');
        console.log('The user may not exist or the credentials are incorrect.');
      }
      
      return false;
    }

    console.log('✅ LOGIN SUCCESSFUL!');
    console.log(`👤 User ID: ${data.user.id}`);
    console.log(`📧 Email: ${data.user.email}`);
    console.log(`📅 Created: ${data.user.created_at}`);
    console.log(`✅ Email Confirmed: ${data.user.email_confirmed_at ? 'Yes' : 'No'}`);
    console.log(`🔑 Session Token: ${data.session.access_token.substring(0, 30)}...`);
    
    // Check user metadata
    if (data.user.user_metadata) {
      console.log('\n📋 User Metadata:');
      console.log(`   Username: ${data.user.user_metadata.username || 'Not set'}`);
      console.log(`   Display Name: ${data.user.user_metadata.display_name || 'Not set'}`);
      console.log(`   Full Name: ${data.user.user_metadata.full_name || 'Not set'}`);
    }
    
    // Sign out
    await supabase.auth.signOut();
    console.log('\n🚪 Signed out successfully');
    
    console.log('\n🎉 TEST COMPLETE - User is ready to use!');
    return true;

  } catch (error) {
    console.error(`❌ Unexpected error: ${error.message}`);
    return false;
  }
}

async function main() {
  const success = await verifyUserLogin();
  
  if (success) {
    console.log('\n💡 INTEGRATION NOTES:');
    console.log('   • Use these credentials in your login form');
    console.log('   • Display "levidica" as username in your UI');
    console.log('   • The email "levidica@local.dev" is used for authentication');
    console.log('   • User metadata contains the preferred username');
  } else {
    console.log('\n🔧 TROUBLESHOOTING:');
    console.log('   1. Check if email confirmation is disabled in Supabase');
    console.log('   2. Verify the user exists in Supabase dashboard');
    console.log('   3. Try running the create-levidica-user.js script again');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { verifyUserLogin, credentials };