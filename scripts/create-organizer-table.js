#!/usr/bin/env node

/**
 * Script to create the organizer table in Supabase
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createOrganizerTable() {
  try {
    console.log('🚀 Creating organizer table...');
    
    // Create the table using a simple SQL query that Supabase can handle
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public.organizer (
        organizer_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name TEXT NOT NULL,
        website TEXT,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT unique_organizer_per_user UNIQUE(name, user_id)
      );
    `;
    
    // Test by querying an existing table first
    const { data: testData, error: testError } = await supabase
      .from('leads')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.error('❌ Connection test failed:', testError.message);
      return;
    }
    
    console.log('✅ Connection successful');
    console.log('');
    console.log('📋 To create the organizer table, execute this SQL in your Supabase SQL Editor:');
    console.log('');
    console.log('--- Copy from here ---');
    console.log(createTableSQL);
    console.log('--- Copy to here ---');
    console.log('');
    
    // Also enable RLS
    const rlsSQL = `
      -- Enable Row Level Security
      ALTER TABLE public.organizer ENABLE ROW LEVEL SECURITY;
      
      -- Create RLS policies
      CREATE POLICY "Users can view own organizers" ON public.organizer
          FOR SELECT USING (auth.uid() = user_id);
      
      CREATE POLICY "Users can insert own organizers" ON public.organizer
          FOR INSERT WITH CHECK (auth.uid() = user_id);
      
      CREATE POLICY "Users can update own organizers" ON public.organizer
          FOR UPDATE USING (auth.uid() = user_id);
      
      CREATE POLICY "Users can delete own organizers" ON public.organizer
          FOR DELETE USING (auth.uid() = user_id);
      
      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_organizer_user_id ON public.organizer(user_id);
      CREATE INDEX IF NOT EXISTS idx_organizer_created_at ON public.organizer(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_organizer_name ON public.organizer(name);
      CREATE INDEX IF NOT EXISTS idx_organizer_user_name ON public.organizer(user_id, name);
      
      -- Create update trigger
      CREATE TRIGGER update_organizer_updated_at
          BEFORE UPDATE ON public.organizer
          FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
      
      -- Grant permissions
      GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizer TO authenticated;
      GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
    `;
    
    console.log('📋 Then execute this RLS and permissions SQL:');
    console.log('');
    console.log('--- Copy from here ---');
    console.log(rlsSQL);
    console.log('--- Copy to here ---');
    console.log('');
    
    console.log('✅ SQL ready for manual execution in Supabase dashboard');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

createOrganizerTable();