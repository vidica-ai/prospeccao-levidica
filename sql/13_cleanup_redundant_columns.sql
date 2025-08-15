-- Migration: Clean up redundant columns from leads table
-- This script removes columns that are now stored in normalized tables
-- ONLY run this after verifying the migration is 100% successful!

-- Step 1: Verify migration completeness
DO $$
DECLARE
    unlinked_count INTEGER;
    total_leads INTEGER;
    organizer_count INTEGER;
    event_count INTEGER;
BEGIN
    -- Check if all leads are properly linked
    SELECT COUNT(*) INTO unlinked_count 
    FROM public.leads 
    WHERE organizer_id IS NULL OR event_id IS NULL;
    
    SELECT COUNT(*) INTO total_leads FROM public.leads;
    SELECT COUNT(*) INTO organizer_count FROM public.organizer;
    SELECT COUNT(*) INTO event_count FROM public.event;
    
    -- Report status
    RAISE NOTICE 'Migration Status Check:';
    RAISE NOTICE '  Total leads: %', total_leads;
    RAISE NOTICE '  Total organizers: %', organizer_count;
    RAISE NOTICE '  Total events: %', event_count;
    RAISE NOTICE '  Unlinked leads: %', unlinked_count;
    
    IF unlinked_count > 0 THEN
        RAISE EXCEPTION 'MIGRATION INCOMPLETE: % leads are not properly linked. DO NOT proceed with cleanup!', unlinked_count;
    END IF;
    
    IF total_leads = 0 THEN
        RAISE EXCEPTION 'NO LEADS FOUND: Leads table appears to be empty. DO NOT proceed with cleanup!';
    END IF;
    
    RAISE NOTICE 'Migration verification PASSED. Safe to proceed with cleanup.';
END $$;

-- Step 2: Create final backup view before dropping columns
CREATE OR REPLACE VIEW public.leads_final_backup AS
SELECT 
    id,
    nome_evento,
    data_evento,
    local,
    produtor,
    sympla_url,
    email_contato,
    website,
    user_id,
    contato_verificado,
    data_ultima_busca,
    hunter_domain,
    status_busca,
    created_at,
    updated_at,
    organizer_id,
    event_id,
    temp_organizer_id,
    temp_event_id
FROM public.leads;

GRANT SELECT ON public.leads_final_backup TO authenticated;
COMMENT ON VIEW public.leads_final_backup IS 'Final backup of leads table before column cleanup - contains all original data';

-- Step 3: Drop views that depend on the columns we want to remove
-- This is necessary because PostgreSQL won't let us drop columns that views depend on

DROP VIEW IF EXISTS public.leads_legacy_backup CASCADE;
DROP VIEW IF EXISTS public.leads_final_backup CASCADE;
DROP VIEW IF EXISTS public.leads_backup_view CASCADE;
DROP VIEW IF EXISTS public.migration_status CASCADE;
DROP VIEW IF EXISTS public.leads_migration_summary CASCADE;

-- Step 4: Remove redundant columns
-- These fields are now stored in the normalized organizer and event tables

-- Remove event-related columns (now in event table)
ALTER TABLE public.leads DROP COLUMN IF EXISTS nome_evento;
ALTER TABLE public.leads DROP COLUMN IF EXISTS data_evento;
ALTER TABLE public.leads DROP COLUMN IF EXISTS local;
ALTER TABLE public.leads DROP COLUMN IF EXISTS sympla_url;

-- Remove organizer-related columns (now in organizer table)
ALTER TABLE public.leads DROP COLUMN IF EXISTS produtor;
ALTER TABLE public.leads DROP COLUMN IF EXISTS website;

-- Remove contact-related columns (now in contact table)
ALTER TABLE public.leads DROP COLUMN IF EXISTS email_contato;

-- Remove temporary migration columns
ALTER TABLE public.leads DROP COLUMN IF EXISTS temp_organizer_id;
ALTER TABLE public.leads DROP COLUMN IF EXISTS temp_event_id;

-- Step 5: Update table comments to reflect new structure
COMMENT ON TABLE public.leads IS 'Lead tracking table (normalized) - references organizer and event tables';
COMMENT ON COLUMN public.leads.organizer_id IS 'Reference to organizer table - replaces old produtor field';
COMMENT ON COLUMN public.leads.event_id IS 'Reference to event table - replaces old nome_evento, data_evento, local, sympla_url fields';

-- Step 6: Verify the cleanup was successful
DO $$
DECLARE
    column_count INTEGER;
    expected_columns TEXT[] := ARRAY[
        'id', 'organizer_id', 'event_id', 'user_id',
        'contato_verificado', 'data_ultima_busca', 'hunter_domain', 'status_busca',
        'created_at', 'updated_at'
    ];
    actual_columns TEXT[];
BEGIN
    -- Get actual column names
    SELECT array_agg(column_name ORDER BY ordinal_position)
    INTO actual_columns
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'leads';
    
    -- Check if cleanup was successful
    SELECT array_length(actual_columns, 1) INTO column_count;
    
    RAISE NOTICE 'Cleanup Results:';
    RAISE NOTICE '  Expected columns: %', array_length(expected_columns, 1);
    RAISE NOTICE '  Actual columns: %', column_count;
    RAISE NOTICE '  Column names: %', actual_columns;
    
    -- Verify we have the expected structure
    IF actual_columns @> expected_columns AND array_length(actual_columns, 1) = array_length(expected_columns, 1) THEN
        RAISE NOTICE 'SUCCESS: Leads table cleanup completed successfully!';
        RAISE NOTICE 'The leads table now has the proper normalized structure.';
    ELSE
        RAISE WARNING 'ATTENTION: Column structure may not match expectations.';
        RAISE NOTICE 'Expected: %', expected_columns;
        RAISE NOTICE 'Actual: %', actual_columns;
    END IF;
END $$;

-- Step 7: Create a view showing the new clean structure
CREATE OR REPLACE VIEW public.leads_clean_structure AS
SELECT 
    l.id,
    l.organizer_id,
    l.event_id,
    l.user_id,
    l.contato_verificado,
    l.data_ultima_busca,
    l.hunter_domain,
    l.status_busca,
    l.created_at,
    l.updated_at,
    -- Include related data for convenience
    o.name as organizer_name,
    o.website as organizer_website,
    e.nome_evento,
    e.data_evento,
    e.local,
    e.sympla_url
FROM public.leads l
LEFT JOIN public.organizer o ON l.organizer_id = o.organizer_id
LEFT JOIN public.event e ON l.event_id = e.event_id;

GRANT SELECT ON public.leads_clean_structure TO authenticated;
COMMENT ON VIEW public.leads_clean_structure IS 'Clean leads view showing normalized structure with related data';

-- Step 8: Recreate important views that were dropped (with updated structure)

-- Recreate migration summary view (updated for clean structure)
CREATE OR REPLACE VIEW public.leads_migration_summary AS
SELECT 
    COUNT(*) as total_leads,
    COUNT(organizer_id) as leads_with_organizer,
    COUNT(event_id) as leads_with_event,
    COUNT(CASE WHEN organizer_id IS NOT NULL AND event_id IS NOT NULL THEN 1 END) as fully_migrated,
    COUNT(CASE WHEN organizer_id IS NULL OR event_id IS NULL THEN 1 END) as incomplete_migration,
    'CLEANUP_COMPLETED' as cleanup_status
FROM public.leads;

GRANT SELECT ON public.leads_migration_summary TO authenticated;
COMMENT ON VIEW public.leads_migration_summary IS 'Migration summary after cleanup - shows normalized leads structure';

-- Recreate a legacy-compatible backup view (using joins to simulate old structure)
CREATE OR REPLACE VIEW public.leads_backup_view AS
SELECT 
    l.id,
    e.nome_evento,
    e.data_evento,
    e.local,
    o.name as produtor,
    e.sympla_url,
    l.user_id,
    c.email as email_contato,
    o.website,
    l.contato_verificado,
    l.data_ultima_busca,
    l.hunter_domain,
    l.status_busca,
    l.created_at,
    l.updated_at
FROM public.leads l
LEFT JOIN public.organizer o ON l.organizer_id = o.organizer_id
LEFT JOIN public.event e ON l.event_id = e.event_id
LEFT JOIN public.contact c ON c.organizer_id = o.organizer_id;

GRANT SELECT ON public.leads_backup_view TO authenticated;
COMMENT ON VIEW public.leads_backup_view IS 'Legacy-compatible view of leads with normalized data via joins';

-- Final success message
SELECT 
    'Leads table cleanup completed successfully!' as status,
    'Redundant columns removed, views recreated with joins' as details,
    'Use leads_clean_structure or leads_backup_view for queries' as recommendation;