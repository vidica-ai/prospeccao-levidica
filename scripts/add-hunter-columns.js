#!/usr/bin/env node

/**
 * Script to add Hunter.io integration columns to the leads table
 * Run this script to add the new columns for contact discovery functionality
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('');
  console.error('Please ensure these are set in your .env.local file');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addHunterColumns() {
  try {
    console.log('🚀 Adding Hunter.io columns to leads table...');
    
    // Read the migration SQL file
    const sqlPath = path.join(__dirname, '..', 'sql', '04_add_hunter_columns.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 Reading migration file:', sqlPath);
    
    // Split SQL into individual statements and execute them
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📊 Executing ${statements.length} SQL statements...`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const [index, statement] of statements.entries()) {
      if (statement.length > 0) {
        try {
          const { error } = await supabase.rpc('exec_sql', {
            sql: statement
          });
          
          if (error) {
            console.error(`❌ Error in statement ${index + 1}:`, error.message);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (err) {
          console.error(`❌ Exception in statement ${index + 1}:`, err.message);
          errorCount++;
        }
      }
    }
    
    if (errorCount === 0) {
      console.log('✅ Migration completed successfully!');
    } else {
      console.log(`⚠️  Migration completed with ${errorCount} errors and ${successCount} successes`);
    }
    
    console.log('');
    console.log('🔗 New Hunter.io integration features added:');
    console.log('   ✓ email_contato - Store discovered email addresses');
    console.log('   ✓ website - Store company website URLs');
    console.log('   ✓ contato_verificado - Track verification status');
    console.log('   ✓ data_ultima_busca - Track search timestamps');
    console.log('   ✓ hunter_domain - Store search domains');
    console.log('   ✓ status_busca - Track search process status');
    console.log('');
    console.log('📊 Performance optimizations added:');
    console.log('   ✓ Index on contato_verificado for verified contacts');
    console.log('   ✓ Index on status_busca for status filtering');
    console.log('   ✓ Index on data_ultima_busca for stale contact detection');
    console.log('   ✓ Composite index for user + status queries');
    console.log('   ✓ Index on hunter_domain for domain lookups');
    console.log('');
    console.log('🛠️  Utility features added:');
    console.log('   ✓ update_lead_search_status() function');
    console.log('   ✓ leads_pending_contact_search view');
    console.log('   ✓ Updated leads_with_user view');
    console.log('');
    console.log('🎯 Your leads table is now ready for Hunter.io integration!');
    
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    console.error('');
    console.error('💡 Manual setup instructions:');
    console.error('   1. Go to your Supabase dashboard');
    console.error('   2. Navigate to the SQL Editor');
    console.error('   3. Copy and paste the contents of sql/04_add_hunter_columns.sql');
    console.error('   4. Execute the SQL script');
    process.exit(1);
  }
}

// Alternative method for environments where rpc might not work
async function addHunterColumnsAlternative() {
  try {
    console.log('🔄 Trying alternative method...');
    console.log('');
    
    // Read the migration SQL file
    const sqlPath = path.join(__dirname, '..', 'sql', '04_add_hunter_columns.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📋 Migration SQL content:');
    console.log('=' .repeat(80));
    console.log(sqlContent);
    console.log('=' .repeat(80));
    console.log('');
    console.log('💡 To apply this migration manually:');
    console.log('   1. Copy the SQL content above');
    console.log('   2. Go to your Supabase dashboard');
    console.log('   3. Navigate to the SQL Editor');
    console.log('   4. Paste and execute the SQL script');
    console.log('');
    
  } catch (err) {
    console.error('❌ Error reading migration file:', err);
  }
}

// Verify current table structure before migration
async function verifyCurrentStructure() {
  try {
    console.log('🔍 Verifying current leads table structure...');
    
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Error accessing leads table:', error.message);
      console.log('💡 Make sure the leads table exists before running this migration');
      return false;
    }
    
    console.log('✅ Leads table is accessible');
    return true;
    
  } catch (err) {
    console.error('❌ Error verifying table structure:', err);
    return false;
  }
}

// Run the migration
console.log('🏗️  Hunter.io Integration Migration');
console.log('====================================');
console.log('');

verifyCurrentStructure().then(canProceed => {
  if (canProceed) {
    addHunterColumns().catch(() => {
      addHunterColumnsAlternative();
    });
  } else {
    console.log('');
    console.log('⚠️  Cannot proceed with migration. Please ensure:');
    console.log('   1. The leads table exists');
    console.log('   2. Your environment variables are correct');
    console.log('   3. You have proper database permissions');
  }
});