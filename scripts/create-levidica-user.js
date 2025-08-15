#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ianubhwniejdnhasxzqd.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhbnViaHduaWVqZG5oYXN4enFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMjcwNDUsImV4cCI6MjA3MDcwMzA0NX0.f7Dog5aRp5TEjGn8dwuSSflYzpKZlCZaT5KMhhGNHTE';

// User configuration - using .local.dev which worked
const userConfig = {
  email: 'levidica@local.dev',
  password: 'lericia21',
  originalUsername: 'levidica'
};

console.log('🎯 CREATING LEVIDICA TEST USER');
console.log('=' .repeat(50));
console.log(`📧 Email: ${userConfig.email}`);
console.log(`🔑 Password: ${userConfig.password}`);
console.log(`👤 Original Username: ${userConfig.originalUsername}`);
console.log(`🔗 Supabase URL: ${supabaseUrl}`);

async function createOrVerifyUser() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  console.log('\n🚀 Step 1: Creating/Verifying user...');
  
  try {
    // Try to create the user
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: userConfig.email,
      password: userConfig.password,
      options: {
        data: {
          full_name: 'Levidica Test User',
          username: userConfig.originalUsername,
          display_name: 'levidica'
        }
      }
    });

    if (signUpError) {
      if (signUpError.message.includes('already registered')) {
        console.log('✅ User already exists');
        return { exists: true, user: null };
      } else {
        console.error(`❌ Signup error: ${signUpError.message}`);
        return { exists: false, user: null, error: signUpError.message };
      }
    }

    console.log('✅ User created successfully!');
    console.log(`   User ID: ${signUpData.user.id}`);
    console.log(`   Email: ${signUpData.user.email}`);
    console.log(`   Email Confirmed: ${signUpData.user.email_confirmed_at ? 'Yes' : 'No'}`);
    
    return { exists: false, user: signUpData.user, session: signUpData.session };

  } catch (error) {
    console.error(`❌ Unexpected error: ${error.message}`);
    return { exists: false, user: null, error: error.message };
  }
}

async function checkAuthSettings() {
  console.log('\n🔍 Step 2: Checking authentication settings...');
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  // Try to sign in to see what the actual issue is
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: userConfig.email,
      password: userConfig.password
    });

    if (error) {
      console.log(`⚠️  Login issue: ${error.message}`);
      
      if (error.message.includes('Email not confirmed')) {
        console.log('\n📧 EMAIL CONFIRMATION REQUIRED');
        console.log('   Your Supabase project has email confirmation enabled.');
        console.log('   To fix this, you have two options:');
        console.log('\n   Option 1: Disable email confirmation (Recommended for testing)');
        console.log('   1. Go to Supabase Dashboard > Authentication > Settings');
        console.log('   2. Find "Enable email confirmations"');
        console.log('   3. Toggle it OFF');
        console.log('   4. Save the settings');
        console.log('\n   Option 2: Manually confirm the user');
        console.log('   1. Go to Supabase Dashboard > Authentication > Users');
        console.log(`   2. Find user: ${userConfig.email}`);
        console.log('   3. Click the user and manually confirm their email');
        
        return { confirmed: false, requiresAction: true };
      } else if (error.message.includes('Invalid login credentials')) {
        console.log('❌ Invalid credentials - user may not exist or password is wrong');
        return { confirmed: false, requiresAction: false };
      } else {
        console.log(`❌ Other auth error: ${error.message}`);
        return { confirmed: false, requiresAction: false };
      }
    }

    console.log('✅ User can sign in successfully!');
    console.log(`   Session token: ${data.session.access_token.substring(0, 20)}...`);
    
    // Sign out
    await supabase.auth.signOut();
    return { confirmed: true, requiresAction: false };

  } catch (error) {
    console.error(`❌ Sign-in test error: ${error.message}`);
    return { confirmed: false, requiresAction: false };
  }
}

async function provideFinalInstructions(authStatus) {
  console.log('\n🎯 Step 3: Final Instructions');
  console.log('=' .repeat(50));
  
  if (authStatus.confirmed) {
    console.log('🎉 SUCCESS! Your test user is ready to use:');
    console.log(`   📧 Email: ${userConfig.email}`);
    console.log(`   🔑 Password: ${userConfig.password}`);
    console.log('   ✅ Can sign in immediately');
    
    console.log('\n💡 Integration Notes:');
    console.log(`   • Use "${userConfig.email}" for authentication`);
    console.log(`   • Display name can be "${userConfig.originalUsername}"`);
    console.log('   • User metadata contains the original username');
    
  } else if (authStatus.requiresAction) {
    console.log('⚠️  User created but requires email confirmation');
    console.log(`   📧 Email: ${userConfig.email}`);
    console.log(`   🔑 Password: ${userConfig.password}`);
    console.log('   ❌ Cannot sign in until confirmed');
    
    console.log('\n🛠️  ACTION REQUIRED:');
    console.log('   Go to Supabase Dashboard and either:');
    console.log('   1. Disable email confirmation (fastest for testing)');
    console.log('   2. Manually confirm this user');
    
  } else {
    console.log('❌ User creation or authentication failed');
    console.log('   Check the errors above and try again');
  }
  
  console.log('\n📝 Next Steps for Your Application:');
  console.log('   1. Use the email/password combination above');
  console.log('   2. In your app, you can display "levidica" as the username');
  console.log('   3. The actual authentication uses the full email');
  console.log('   4. User metadata contains the original username preference');
}

async function main() {
  try {
    // Step 1: Create or verify user exists
    const userResult = await createOrVerifyUser();
    
    if (userResult.error) {
      console.log('\n❌ Cannot proceed due to user creation error');
      return;
    }
    
    // Step 2: Check authentication status
    const authStatus = await checkAuthSettings();
    
    // Step 3: Provide final instructions
    await provideFinalInstructions(authStatus);
    
  } catch (error) {
    console.error('\n❌ Script failed:', error.message);
  }
}

if (require.main === module) {
  main();
}

module.exports = { userConfig, createOrVerifyUser, checkAuthSettings };