#!/usr/bin/env node

/**
 * Database Migration Script
 * Executes the database normalization migration in the correct order
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

// Migration files in execution order
const migrationFiles = [
  '05_create_organizer_table.sql',
  '06_create_event_table.sql',
  '07_create_contact_table.sql',
  '08_data_migration.sql',
  '09_update_leads_table.sql',
  '10_performance_indexes.sql',
  '11_views_and_functions.sql'
];

async function executeSqlFile(filename) {
  try {
    console.log(`\n📄 Executing ${filename}...`);
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, '..', 'sql', filename);
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Split SQL into individual statements and execute them
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const statement of statements) {
      if (statement.length > 0) {
        const { error } = await supabase.rpc('exec_sql', {
          sql: statement
        });
        
        if (error) {
          console.error(`   ❌ Error in statement: ${error.message}`);
          errorCount++;
          // Log the problematic statement for debugging
          console.error(`   Statement: ${statement.substring(0, 100)}...`);
        } else {
          successCount++;
        }
      }
    }
    
    console.log(`   ✅ ${filename} completed: ${successCount} successful, ${errorCount} errors`);
    return { success: successCount, errors: errorCount };
    
  } catch (err) {
    console.error(`   ❌ Failed to execute ${filename}:`, err.message);
    return { success: 0, errors: 1 };
  }
}

async function validateMigration() {
  try {
    console.log('\n🔍 Validating migration...');
    
    // Check table counts
    const tables = ['organizer', 'event', 'contact', 'leads'];
    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`   ❌ Error checking ${table}: ${error.message}`);
      } else {
        console.log(`   ✅ ${table} table: ${count} records`);
      }
    }
    
    // Test views
    const views = ['leads_complete', 'organizer_summary'];
    for (const view of views) {
      const { data, error } = await supabase
        .from(view)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`   ❌ Error checking ${view} view: ${error.message}`);
      } else {
        console.log(`   ✅ ${view} view: accessible`);
      }
    }
    
  } catch (err) {
    console.error('   ❌ Validation failed:', err.message);
  }
}

async function runMigration() {
  console.log('🚀 Starting Database Migration');
  console.log('==============================');
  console.log('');
  console.log('⚠️  IMPORTANT: Ensure you have a database backup before proceeding!');
  console.log('');
  
  let totalSuccess = 0;
  let totalErrors = 0;
  
  for (const filename of migrationFiles) {
    const result = await executeSqlFile(filename);
    totalSuccess += result.success;
    totalErrors += result.errors;
    
    // Small delay between files to avoid overwhelming the database
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n📊 Migration Summary');
  console.log('===================');
  console.log(`✅ Successful operations: ${totalSuccess}`);
  console.log(`❌ Failed operations: ${totalErrors}`);
  
  if (totalErrors === 0) {
    console.log('\n🎉 Migration completed successfully!');
    await validateMigration();
  } else {
    console.log('\n⚠️  Migration completed with errors. Please review the logs above.');
    console.log('💡 You may need to run some statements manually in the Supabase SQL editor.');
  }
  
  console.log('\n📋 Next Steps:');
  console.log('1. Review the migration logs above');
  console.log('2. Test your application with the new schema');
  console.log('3. Update application code to use new views and functions');
  console.log('4. Monitor performance and add additional indexes if needed');
  console.log('\n📚 See MIGRATION_GUIDE.md for detailed information on using the new schema.');
}

// Run the migration
runMigration().catch(err => {
  console.error('\n💥 Migration failed with unexpected error:', err);
  console.log('\n🛠️  Manual Recovery Options:');
  console.log('1. Check your database connection and permissions');
  console.log('2. Run individual migration files manually in Supabase SQL editor');
  console.log('3. Use the rollback script (12_rollback_migration.sql) if needed');
  process.exit(1);
});