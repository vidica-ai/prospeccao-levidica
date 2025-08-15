-- Migration: Data migration from monolithic leads table to normalized structure
-- This migration safely moves existing data from the leads table to the new
-- normalized organizer, event, and contact tables

-- IMPORTANT: This migration should be run AFTER creating the new tables
-- (scripts 05, 06, 07) and BEFORE updating the leads table schema (script 09)

-- Start a transaction to ensure data consistency
BEGIN;

-- Create a temporary function to log migration progress
CREATE OR REPLACE FUNCTION log_migration_step(step_name TEXT, affected_rows INTEGER)
RETURNS VOID AS $$
BEGIN
    RAISE NOTICE 'Migration Step: % - Affected rows: %', step_name, affected_rows;
END;
$$ LANGUAGE plpgsql;

-- Step 1: Migrate organizers from leads table
-- Create unique organizers from the 'produtor' field in leads table
DO $$
DECLARE
    affected_rows INTEGER;
BEGIN
    INSERT INTO public.organizer (organizer_id, name, website, user_id, created_at, updated_at)
    SELECT 
        gen_random_uuid() as organizer_id,
        TRIM(l.produtor) as name,
        CASE 
            WHEN l.website IS NOT NULL AND l.website != '' THEN l.website
            ELSE NULL
        END as website,
        l.user_id,
        MIN(l.created_at) as created_at,  -- Use earliest date for this organizer
        NOW() as updated_at
    FROM public.leads l
    WHERE TRIM(l.produtor) IS NOT NULL 
      AND TRIM(l.produtor) != ''
    GROUP BY TRIM(l.produtor), l.user_id, 
             CASE WHEN l.website IS NOT NULL AND l.website != '' THEN l.website ELSE NULL END
    ON CONFLICT (name, user_id) DO NOTHING;  -- Skip duplicates due to unique constraint
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    PERFORM log_migration_step('Create organizers from leads.produtor', affected_rows);
END $$;

-- Step 2: Migrate events from leads table
-- Create events and link them to the appropriate organizers
DO $$
DECLARE
    affected_rows INTEGER;
BEGIN
    INSERT INTO public.event (event_id, nome_evento, data_evento, local, sympla_url, organizer_id, user_id, created_at, updated_at)
    SELECT 
        gen_random_uuid() as event_id,
        l.nome_evento,
        l.data_evento,
        l.local,
        l.sympla_url,
        o.organizer_id,
        l.user_id,
        l.created_at,
        l.updated_at
    FROM public.leads l
    INNER JOIN public.organizer o ON (
        o.name = TRIM(l.produtor) 
        AND o.user_id = l.user_id
    )
    WHERE l.nome_evento IS NOT NULL 
      AND l.data_evento IS NOT NULL 
      AND l.local IS NOT NULL 
      AND l.sympla_url IS NOT NULL
    ON CONFLICT (sympla_url) DO NOTHING;  -- Skip duplicates due to unique constraint
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    PERFORM log_migration_step('Create events from leads with organizer links', affected_rows);
END $$;

-- Step 3: Migrate contacts from leads table where email_contato exists
-- Create contact records for organizers that have contact information
DO $$
DECLARE
    affected_rows INTEGER;
BEGIN
    INSERT INTO public.contact (contact_id, name, email, position, organizer_id, user_id, created_at, updated_at)
    SELECT DISTINCT
        gen_random_uuid() as contact_id,
        NULL as name,  -- We don't have individual contact names in the current schema
        l.email_contato as email,
        NULL as position,  -- We don't have position information in the current schema
        o.organizer_id,
        l.user_id,
        MIN(l.created_at) as created_at,  -- Use earliest date for this contact
        NOW() as updated_at
    FROM public.leads l
    INNER JOIN public.organizer o ON (
        o.name = TRIM(l.produtor) 
        AND o.user_id = l.user_id
    )
    WHERE l.email_contato IS NOT NULL 
      AND l.email_contato != ''
      AND l.email_contato ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'  -- Valid email format
    GROUP BY l.email_contato, o.organizer_id, l.user_id
    ON CONFLICT (organizer_id, email) DO NOTHING;  -- Skip duplicates
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    PERFORM log_migration_step('Create contacts from leads.email_contato', affected_rows);
END $$;

-- Step 4: Add temporary columns to leads table for migration tracking
-- These will help us link leads to the new normalized data
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS temp_organizer_id UUID,
ADD COLUMN IF NOT EXISTS temp_event_id UUID;

-- Step 5: Update leads table with references to new normalized data
DO $$
DECLARE
    affected_rows INTEGER;
BEGIN
    -- Update organizer_id references
    UPDATE public.leads l
    SET temp_organizer_id = o.organizer_id
    FROM public.organizer o
    WHERE o.name = TRIM(l.produtor) 
      AND o.user_id = l.user_id;
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    PERFORM log_migration_step('Link leads to organizers', affected_rows);
    
    -- Update event_id references
    UPDATE public.leads l
    SET temp_event_id = e.event_id
    FROM public.event e
    WHERE e.sympla_url = l.sympla_url 
      AND e.user_id = l.user_id;
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    PERFORM log_migration_step('Link leads to events', affected_rows);
END $$;

-- Step 6: Validation - Check migration integrity
DO $$
DECLARE
    leads_count INTEGER;
    organizers_count INTEGER;
    events_count INTEGER;
    contacts_count INTEGER;
    unlinked_leads INTEGER;
BEGIN
    SELECT COUNT(*) INTO leads_count FROM public.leads;
    SELECT COUNT(*) INTO organizers_count FROM public.organizer;
    SELECT COUNT(*) INTO events_count FROM public.event;
    SELECT COUNT(*) INTO contacts_count FROM public.contact;
    
    SELECT COUNT(*) INTO unlinked_leads 
    FROM public.leads 
    WHERE temp_organizer_id IS NULL OR temp_event_id IS NULL;
    
    RAISE NOTICE 'Migration Summary:';
    RAISE NOTICE '  Original leads: %', leads_count;
    RAISE NOTICE '  Created organizers: %', organizers_count;
    RAISE NOTICE '  Created events: %', events_count;
    RAISE NOTICE '  Created contacts: %', contacts_count;
    RAISE NOTICE '  Unlinked leads: %', unlinked_leads;
    
    IF unlinked_leads > 0 THEN
        RAISE WARNING '% leads could not be linked to new normalized data. Review these records manually.', unlinked_leads;
    END IF;
END $$;

-- Step 7: Create a view to show migration status
CREATE OR REPLACE VIEW public.migration_status AS
SELECT 
    'leads' as table_name,
    COUNT(*) as record_count,
    COUNT(temp_organizer_id) as linked_to_organizer,
    COUNT(temp_event_id) as linked_to_event
FROM public.leads
UNION ALL
SELECT 'organizer' as table_name, COUNT(*) as record_count, COUNT(*) as linked_to_organizer, NULL as linked_to_event FROM public.organizer
UNION ALL
SELECT 'event' as table_name, COUNT(*) as record_count, NULL as linked_to_organizer, COUNT(*) as linked_to_event FROM public.event
UNION ALL
SELECT 'contact' as table_name, COUNT(*) as record_count, NULL as linked_to_organizer, NULL as linked_to_event FROM public.contact;

-- Grant permissions on the migration status view
GRANT SELECT ON public.migration_status TO authenticated;

-- Drop the temporary logging function
DROP FUNCTION log_migration_step(TEXT, INTEGER);

-- Commit the transaction
COMMIT;

-- Add comments for documentation
COMMENT ON VIEW public.migration_status IS 'Shows the status of data migration from leads to normalized tables';

RAISE NOTICE 'Data migration completed successfully. Review the migration_status view for details.';
RAISE NOTICE 'Next step: Run script 09 to update the leads table schema.';