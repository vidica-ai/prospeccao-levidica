-- Migration: Update leads table schema for normalized structure
-- This migration updates the leads table to reference the new normalized tables
-- and removes redundant columns that are now stored in organizer, event, and contact tables

-- IMPORTANT: This migration should be run AFTER the data migration (script 08)

-- Start a transaction for safety
BEGIN;

-- Step 1: Add the new foreign key columns to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS organizer_id UUID REFERENCES public.organizer(organizer_id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES public.event(event_id) ON DELETE CASCADE;

-- Step 2: Copy data from temporary columns created during migration
UPDATE public.leads 
SET 
    organizer_id = temp_organizer_id,
    event_id = temp_event_id
WHERE temp_organizer_id IS NOT NULL AND temp_event_id IS NOT NULL;

-- Step 3: Add NOT NULL constraints after data is populated
-- First check if all rows have been properly linked
DO $$
DECLARE
    unlinked_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO unlinked_count 
    FROM public.leads 
    WHERE organizer_id IS NULL OR event_id IS NULL;
    
    IF unlinked_count > 0 THEN
        RAISE EXCEPTION 'Cannot add NOT NULL constraints: % leads are not properly linked to organizer/event. Fix these records first.', unlinked_count;
    END IF;
END $$;

-- Add NOT NULL constraints
ALTER TABLE public.leads 
ALTER COLUMN organizer_id SET NOT NULL,
ALTER COLUMN event_id SET NOT NULL;

-- Step 4: Create indexes for the new foreign keys
CREATE INDEX IF NOT EXISTS idx_leads_organizer_id ON public.leads(organizer_id);
CREATE INDEX IF NOT EXISTS idx_leads_event_id ON public.leads(event_id);
CREATE INDEX IF NOT EXISTS idx_leads_organizer_event ON public.leads(organizer_id, event_id);

-- Step 5: Create trigger to ensure organizer/event consistency with user
CREATE OR REPLACE FUNCTION public.validate_leads_references()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if organizer belongs to the same user
    IF NOT EXISTS (
        SELECT 1 FROM public.organizer 
        WHERE organizer_id = NEW.organizer_id 
        AND user_id = NEW.user_id
    ) THEN
        RAISE EXCEPTION 'Lead organizer must belong to the same user';
    END IF;
    
    -- Check if event belongs to the same user and organizer
    IF NOT EXISTS (
        SELECT 1 FROM public.event 
        WHERE event_id = NEW.event_id 
        AND user_id = NEW.user_id
        AND organizer_id = NEW.organizer_id
    ) THEN
        RAISE EXCEPTION 'Lead event must belong to the same user and organizer';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS validate_leads_references ON public.leads;
CREATE TRIGGER validate_leads_references
    BEFORE INSERT OR UPDATE ON public.leads
    FOR EACH ROW EXECUTE FUNCTION public.validate_leads_references();

-- Step 6: Remove redundant columns that are now in normalized tables
-- First, let's create a backup view of the original data structure
CREATE OR REPLACE VIEW public.leads_backup_view AS
SELECT 
    id,
    nome_evento,
    data_evento,
    local,
    produtor,
    sympla_url,
    user_id,
    email_contato,
    website,
    contato_verificado,
    data_ultima_busca,
    hunter_domain,
    status_busca,
    created_at,
    updated_at,
    organizer_id,
    event_id
FROM public.leads;

-- Grant select permission on backup view
GRANT SELECT ON public.leads_backup_view TO authenticated;

-- Remove the redundant columns (keeping the core tracking columns)
ALTER TABLE public.leads 
DROP COLUMN IF EXISTS nome_evento,
DROP COLUMN IF EXISTS data_evento,
DROP COLUMN IF EXISTS local,
DROP COLUMN IF EXISTS produtor,
DROP COLUMN IF EXISTS sympla_url,
DROP COLUMN IF EXISTS email_contato,
DROP COLUMN IF EXISTS website;

-- Step 7: Remove temporary migration columns
ALTER TABLE public.leads 
DROP COLUMN IF EXISTS temp_organizer_id,
DROP COLUMN IF EXISTS temp_event_id;

-- Step 8: Update the leads table structure comments
COMMENT ON TABLE public.leads IS 'Stores lead tracking information with references to normalized organizer and event data';
COMMENT ON COLUMN public.leads.organizer_id IS 'Reference to the organizer associated with this lead';
COMMENT ON COLUMN public.leads.event_id IS 'Reference to the event associated with this lead';

-- Step 9: Update existing indexes to account for new structure
-- Remove old indexes that are no longer relevant
DROP INDEX IF EXISTS idx_leads_sympla_url;  -- Now in event table

-- Update composite indexes to use new structure
DROP INDEX IF EXISTS idx_leads_user_created;
CREATE INDEX IF NOT EXISTS idx_leads_user_created ON public.leads(user_id, created_at DESC);

-- Add new composite indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_leads_user_organizer ON public.leads(user_id, organizer_id);
CREATE INDEX IF NOT EXISTS idx_leads_user_event ON public.leads(user_id, event_id);
CREATE INDEX IF NOT EXISTS idx_leads_status_date ON public.leads(status_busca, data_ultima_busca DESC);

-- Step 10: Grant permissions on the new function
GRANT EXECUTE ON FUNCTION public.validate_leads_references TO authenticated;

-- Commit the transaction
COMMIT;

-- Final validation query to show the updated structure
DO $$
DECLARE
    leads_count INTEGER;
    leads_with_refs INTEGER;
BEGIN
    SELECT COUNT(*) INTO leads_count FROM public.leads;
    SELECT COUNT(*) INTO leads_with_refs 
    FROM public.leads 
    WHERE organizer_id IS NOT NULL AND event_id IS NOT NULL;
    
    RAISE NOTICE 'Leads table update completed:';
    RAISE NOTICE '  Total leads: %', leads_count;
    RAISE NOTICE '  Leads with proper references: %', leads_with_refs;
    
    IF leads_count != leads_with_refs THEN
        RAISE WARNING 'Some leads may not have proper references!';
    ELSE
        RAISE NOTICE 'All leads properly linked to normalized data.';
    END IF;
END $$;

RAISE NOTICE 'Leads table schema update completed successfully.';
RAISE NOTICE 'The leads table now references organizer and event tables.';
RAISE NOTICE 'Original data structure preserved in leads_backup_view.';