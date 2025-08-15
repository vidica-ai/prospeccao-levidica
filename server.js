require('dotenv').config();
const authService = require('./lib/auth');

/**
 * Demo server showcasing Supabase authentication
 */
async function runAuthDemo() {
    console.log('=== Supabase Authentication Demo ===\n');

    try {
        // Test 1: Create the specific user requested
        console.log('1. Creating user "levidica" with password "lericia21"...');
        const signUpResult = await authService.signUp('levidica', 'lericia21', {
            full_name: 'Levidica User'
        });
        
        if (signUpResult.success) {
            console.log('✅ User created successfully!');
            console.log('User ID:', signUpResult.user?.id);
            console.log('Email:', signUpResult.user?.email);
        } else {
            console.log('❌ User creation failed:', signUpResult.error);
            
            // If user already exists, try to sign in instead
            if (signUpResult.error.includes('already registered')) {
                console.log('User already exists, attempting to sign in...');
                const signInResult = await authService.signIn('levidica', 'lericia21');
                
                if (signInResult.success) {
                    console.log('✅ Login successful!');
                    console.log('User ID:', signInResult.user?.id);
                    console.log('Email:', signInResult.user?.email);
                } else {
                    console.log('❌ Login failed:', signInResult.error);
                }
            }
        }

        console.log('\n' + '='.repeat(50));

        // Test 2: Demonstrate login functionality
        console.log('\n2. Testing login with credentials...');
        const loginResult = await authService.signIn('levidica', 'lericia21');
        
        if (loginResult.success) {
            console.log('✅ Login test successful!');
            console.log('Session exists:', !!loginResult.session);
            console.log('Access token available:', !!loginResult.session?.access_token);
            
            // Test 3: Get current user session
            console.log('\n3. Getting current user session...');
            const currentUser = await authService.getCurrentUser();
            
            if (currentUser.success && currentUser.user) {
                console.log('✅ Current user retrieved successfully!');
                console.log('User ID:', currentUser.user.id);
                console.log('Email:', currentUser.user.email);
                console.log('Email confirmed:', currentUser.user.email_confirmed_at ? 'Yes' : 'No');
                
                // Test 4: Get user profile
                console.log('\n4. Getting user profile...');
                const profileResult = await authService.getUserProfile(currentUser.user.id);
                
                if (profileResult.success) {
                    console.log('✅ Profile retrieved successfully!');
                    console.log('Profile:', profileResult.profile);
                } else {
                    console.log('⚠️ Profile not found (this is normal for new installations):', profileResult.error);
                }
            }
            
            // Test 5: Sign out
            console.log('\n5. Testing sign out...');
            const signOutResult = await authService.signOut();
            
            if (signOutResult.success) {
                console.log('✅ Sign out successful!');
            } else {
                console.log('❌ Sign out failed:', signOutResult.error);
            }
            
        } else {
            console.log('❌ Login test failed:', loginResult.error);
        }

    } catch (error) {
        console.error('❌ Demo failed with error:', error.message);
        console.error('\nPlease ensure:');
        console.error('1. You have created a Supabase project');
        console.error('2. You have updated the .env file with your project credentials');
        console.error('3. You have run the SQL setup scripts in your Supabase project');
    }

    console.log('\n=== Demo Complete ===');
}

// Run the demo
if (require.main === module) {
    runAuthDemo();
}

module.exports = { runAuthDemo };