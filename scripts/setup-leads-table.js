#!/usr/bin/env node

/**
 * Script to set up the leads table in Supabase
 * Run this script to create the leads table with proper RLS policies
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

async function setupLeadsTable() {
  try {
    console.log('🚀 Setting up leads table in Supabase...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, '..', 'sql', '03_create_leads_table.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 Reading SQL file:', sqlPath);
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: sqlContent
    });
    
    if (error) {
      console.error('❌ Error executing SQL:', error);
      process.exit(1);
    }
    
    console.log('✅ Leads table setup completed successfully!');
    console.log('');
    console.log('🔐 Security features enabled:');
    console.log('   ✓ Row Level Security (RLS) policies');
    console.log('   ✓ User-specific data access');
    console.log('   ✓ Automatic updated_at timestamps');
    console.log('');
    console.log('📊 Performance features added:');
    console.log('   ✓ Indexes on user_id, created_at, and sympla_url');
    console.log('   ✓ Composite index for user queries');
    console.log('');
    console.log('📋 Table structure:');
    console.log('   - id (UUID, auto-generated)');
    console.log('   - nome_evento (Text)');
    console.log('   - data_evento (Text)');
    console.log('   - local (Text)');
    console.log('   - produtor (Text)');
    console.log('   - sympla_url (Text, unique)');
    console.log('   - user_id (UUID, references auth.users)');
    console.log('   - created_at (Timestamp)');
    console.log('   - updated_at (Timestamp)');
    console.log('');
    console.log('🎯 You can now use the leads table in your application!');
    
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
  }
}

// Alternative method using raw SQL execution
async function setupLeadsTableAlternative() {
  try {
    console.log('🚀 Setting up leads table in Supabase (alternative method)...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, '..', 'sql', '03_create_leads_table.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 Reading SQL file:', sqlPath);
    
    // Split SQL into individual statements and execute them
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.length > 0) {
        const { error } = await supabase.rpc('exec_sql', {
          sql: statement
        });
        
        if (error) {
          console.error('❌ Error executing statement:', error);
          console.error('Statement:', statement);
          // Continue with other statements
        }
      }
    }
    
    console.log('✅ Leads table setup completed!');
    
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    console.error('');
    console.error('💡 Manual setup instructions:');
    console.error('   1. Go to your Supabase dashboard');
    console.error('   2. Navigate to the SQL Editor');
    console.error('   3. Copy and paste the contents of sql/03_create_leads_table.sql');
    console.error('   4. Execute the SQL script');
  }
}

// Run the setup
console.log('🏗️  Leads Table Setup Script');
console.log('================================');
console.log('');

setupLeadsTable().catch(() => {
  console.log('');
  console.log('🔄 Trying alternative method...');
  setupLeadsTableAlternative();
});