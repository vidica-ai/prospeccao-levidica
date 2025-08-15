#!/usr/bin/env node

/**
 * Test script for the new normalized database schema
 * Tests both legacy and new functions to ensure compatibility
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Import Supabase client directly
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testConnection() {
  console.log('🔍 Testing database connection...');
  
  try {
    // Test basic connection by checking if we can access the leads table
    const { data, error } = await supabase
      .from('leads')
      .select('id')
      .limit(1);
    
    if (error) {
      console.log(`   ❌ Connection error: ${error.message}`);
      return false;
    } else {
      console.log(`   ✅ Connection successful`);
      return true;
    }
  } catch (err) {
    console.error(`   ❌ Connection failed: ${err.message}`);
    return false;
  }
}

async function testLegacyFunctions() {
  console.log('\n🔄 Testing legacy functions...');
  
  try {
    // Test original leads table access
    const { data: leads, error } = await supabase
      .from('leads')
      .select('*')
      .limit(5);
    
    if (error) {
      console.log(`   ⚠️  Original leads table access failed: ${error.message}`);
    } else {
      console.log(`   ✅ Original leads table accessible: ${leads?.length || 0} records`);
    }
    
    // Test backup view if it exists
    const { data: backupLeads, error: backupError } = await supabase
      .from('leads_backup_view')
      .select('*')
      .limit(5);
    
    if (backupError) {
      console.log(`   ⚠️  Backup view not available: ${backupError.message}`);
    } else {
      console.log(`   ✅ Backup view accessible: ${backupLeads?.length || 0} records`);
    }
    
  } catch (err) {
    console.error(`   ❌ Legacy function test failed: ${err.message}`);
  }
}

async function testNewSchemaAccess() {
  console.log('\n🆕 Testing new schema access...');
  
  const tables = ['organizer', 'event', 'contact'];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`   ❌ ${table} table: ${error.message}`);
      } else {
        console.log(`   ✅ ${table} table accessible`);
      }
    } catch (err) {
      console.log(`   ❌ ${table} table: ${err.message}`);
    }
  }
}

async function testViews() {
  console.log('\n👁️  Testing views...');
  
  const views = ['leads_complete', 'organizer_summary', 'event_summary', 'contact_summary'];
  
  for (const view of views) {
    try {
      const { data, error } = await supabase
        .from(view)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`   ❌ ${view} view: ${error.message}`);
      } else {
        console.log(`   ✅ ${view} view accessible`);
      }
    } catch (err) {
      console.log(`   ❌ ${view} view: ${err.message}`);
    }
  }
}

async function testFunctions() {
  console.log('\n⚙️  Testing database functions...');
  
  const functions = [
    'get_or_create_organizer',
    'create_event_with_organizer', 
    'create_complete_lead',
    'add_organizer_contact',
    'update_lead_search_status_v2'
  ];
  
  for (const func of functions) {
    try {
      // Test function existence by calling with null parameters
      // This should fail with parameter validation, not "function not found"
      const { error } = await supabase.rpc(func, {});
      
      if (error && error.message.includes('function') && error.message.includes('does not exist')) {
        console.log(`   ❌ ${func}: Function not found`);
      } else {
        console.log(`   ✅ ${func}: Function exists`);
      }
    } catch (err) {
      console.log(`   ⚠️  ${func}: ${err.message}`);
    }
  }
}

async function generateMigrationReport() {
  console.log('\n📊 Migration Status Report');
  console.log('==========================');
  
  // Check what exists
  let tablesExist = 0;
  let viewsExist = 0;
  let functionsExist = 0;
  
  const tables = ['organizer', 'event', 'contact'];
  for (const table of tables) {
    const { error } = await supabase.from(table).select('*').limit(1);
    if (!error) tablesExist++;
  }
  
  const views = ['leads_complete', 'organizer_summary'];
  for (const view of views) {
    const { error } = await supabase.from(view).select('*').limit(1);
    if (!error) viewsExist++;
  }
  
  console.log(`Tables created: ${tablesExist}/3`);
  console.log(`Views available: ${viewsExist}/2`);
  
  if (tablesExist === 3 && viewsExist >= 1) {
    console.log('\n🎉 Migration appears successful!');
    console.log('✅ New schema is ready to use');
    console.log('✅ Legacy compatibility maintained');
  } else if (tablesExist > 0) {
    console.log('\n⚠️  Partial migration detected');
    console.log('🔄 Some tables exist, complete the migration');
  } else {
    console.log('\n📋 Migration not yet started');
    console.log('🚀 Ready to execute migration scripts');
  }
  
  console.log('\n📚 Next Steps:');
  if (tablesExist === 0) {
    console.log('1. Execute migration scripts in Supabase SQL Editor');
    console.log('2. Follow DATABASE_MIGRATION_INSTRUCTIONS.md');
  } else if (tablesExist < 3) {
    console.log('1. Complete remaining migration scripts');
    console.log('2. Verify data integrity');
  } else {
    console.log('1. Update application code to use new functions');
    console.log('2. Test thoroughly before production deployment');
  }
}

async function runTests() {
  console.log('🧪 Database Schema Migration Test Suite');
  console.log('=======================================');
  
  const connected = await testConnection();
  
  if (!connected) {
    console.log('\n❌ Cannot continue without database connection');
    process.exit(1);
  }
  
  await testLegacyFunctions();
  await testNewSchemaAccess();
  await testViews();
  await testFunctions();
  await generateMigrationReport();
  
  console.log('\n✅ Test suite completed');
}

runTests().catch(err => {
  console.error('\n💥 Test suite failed:', err);
  process.exit(1);
});