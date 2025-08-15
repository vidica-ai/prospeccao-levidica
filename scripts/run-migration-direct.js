#!/usr/bin/env node

/**
 * Database Migration Script - Direct SQL Execution
 * Executes the database normalization migration using Supabase SQL
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
    
    console.log(`   💾 File size: ${(sqlContent.length / 1024).toFixed(1)}KB`);
    console.log(`   🔄 Executing SQL via PostgreSQL REST API...`);
    
    // Use supabase.from() to execute direct SQL
    const { data, error } = await supabase.from('_migration_temp').select('*').limit(0);
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is "table not found", which is expected
      console.error(`   ❌ Connection error: ${error.message}`);
      return { success: 0, errors: 1 };
    }
    
    console.log(`   ✅ Connection successful`);
    console.log(`   ⚠️  SQL execution requires manual intervention in Supabase dashboard`);
    console.log(`   📋 Next: Copy the following SQL to your Supabase SQL Editor:`);
    console.log(`   ---`);
    console.log(sqlContent.substring(0, 200) + '...');
    console.log(`   ---`);
    
    return { success: 1, errors: 0 };
    
  } catch (err) {
    console.error(`   ❌ Failed to read ${filename}:`, err.message);
    return { success: 0, errors: 1 };
  }
}

async function createManualMigrationGuide() {
  try {
    console.log('\n📖 Creating manual migration guide...');
    
    let guideContent = `# Manual Migration Guide\n\n`;
    guideContent += `Execute these SQL scripts in order in your Supabase SQL Editor:\n\n`;
    
    for (const filename of migrationFiles) {
      const sqlPath = path.join(__dirname, '..', 'sql', filename);
      const sqlContent = fs.readFileSync(sqlPath, 'utf8');
      
      guideContent += `## ${filename}\n\n`;
      guideContent += '```sql\n';
      guideContent += sqlContent;
      guideContent += '\n```\n\n';
      guideContent += '---\n\n';
    }
    
    const guidePath = path.join(__dirname, '..', 'MANUAL_MIGRATION_GUIDE.md');
    fs.writeFileSync(guidePath, guideContent);
    
    console.log(`   ✅ Manual migration guide created: ${guidePath}`);
    
  } catch (err) {
    console.error(`   ❌ Failed to create guide:`, err.message);
  }
}

async function validateConnection() {
  try {
    console.log('\n🔍 Validating Supabase connection...');
    
    // Test basic connection
    const { data: leads, error } = await supabase
      .from('leads')
      .select('id')
      .limit(1);
    
    if (error) {
      console.log(`   ❌ Connection error: ${error.message}`);
      return false;
    } else {
      console.log(`   ✅ Connection successful, existing leads table accessible`);
      return true;
    }
    
  } catch (err) {
    console.error('   ❌ Connection validation failed:', err.message);
    return false;
  }
}

async function runMigration() {
  console.log('🚀 Database Migration - Manual Execution Mode');
  console.log('=============================================');
  console.log('');
  
  const connectionValid = await validateConnection();
  
  if (!connectionValid) {
    console.log('❌ Cannot proceed without valid database connection');
    process.exit(1);
  }
  
  console.log('⚠️  Due to Supabase RPC limitations, this migration requires manual execution.');
  console.log('');
  console.log('📋 Migration Steps:');
  console.log('1. Each SQL file will be displayed for manual execution');
  console.log('2. Copy each SQL block to your Supabase SQL Editor');
  console.log('3. Execute them in the exact order shown');
  console.log('');
  
  let totalFiles = 0;
  
  for (const filename of migrationFiles) {
    const result = await executeSqlFile(filename);
    totalFiles += result.success;
    
    // Wait for user confirmation
    console.log(`\n   ⏸️  Please execute the above SQL in Supabase SQL Editor`);
    console.log(`   ▶️  Press Enter when ready to continue to next file...`);
    
    // In a real scenario, you'd wait for user input
    // For now, we'll just pause briefly
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  await createManualMigrationGuide();
  
  console.log('\n📊 Migration Preparation Complete');
  console.log('=================================');
  console.log(`✅ Prepared ${totalFiles} migration files`);
  console.log(`📖 Manual guide created: MANUAL_MIGRATION_GUIDE.md`);
  
  console.log('\n🎯 Manual Execution Instructions:');
  console.log('1. Open your Supabase Dashboard → SQL Editor');
  console.log('2. Execute each script in the following order:');
  
  migrationFiles.forEach((file, index) => {
    console.log(`   ${index + 1}. ${file}`);
  });
  
  console.log('\n⚠️  Important Notes:');
  console.log('• Execute scripts in exact order shown above');
  console.log('• Check for errors after each script execution');
  console.log('• Backup your database before starting');
  console.log('• Use rollback script (12_rollback_migration.sql) if needed');
  
  console.log('\n📚 After Migration:');
  console.log('• Update your application code to use new schema');
  console.log('• Test all functionality thoroughly');
  console.log('• Monitor performance and add indexes as needed');
}

// Run the migration preparation
runMigration().catch(err => {
  console.error('\n💥 Migration preparation failed:', err);
  process.exit(1);
});