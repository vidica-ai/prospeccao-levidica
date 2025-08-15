-- Migration: Update leads table to use normalized references
-- This script updates the leads table structure to reference the new normalized tables

-- Step 1: Add new foreign key columns if they don't exist
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS organizer_id UUID,
ADD COLUMN IF NOT EXISTS event_id UUID;

-- Step 2: Copy data from temporary columns to permanent columns
UPDATE public.leads 
SET 
    organizer_id = temp_organizer_id,
    event_id = temp_event_id
WHERE temp_organizer_id IS NOT NULL 
  AND temp_event_id IS NOT NULL;

-- Step 3: Add foreign key constraints
-- Note: PostgreSQL doesn't support IF NOT EXISTS with ADD CONSTRAINT
-- Drop existing constraints first if they exist
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS fk_leads_organizer;
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS fk_leads_event;

-- Now add the constraints
ALTER TABLE public.leads 
ADD CONSTRAINT fk_leads_organizer 
    FOREIGN KEY (organizer_id) REFERENCES public.organizer(organizer_id) ON DELETE CASCADE;

ALTER TABLE public.leads 
ADD CONSTRAINT fk_leads_event 
    FOREIGN KEY (event_id) REFERENCES public.event(event_id) ON DELETE CASCADE;

-- Step 4: Create indexes for the new foreign keys
CREATE INDEX IF NOT EXISTS idx_leads_organizer_id ON public.leads(organizer_id);
CREATE INDEX IF NOT EXISTS idx_leads_event_id ON public.leads(event_id);
CREATE INDEX IF NOT EXISTS idx_leads_organizer_event ON public.leads(organizer_id, event_id);

-- Step 5: Create a backup view preserving the original structure
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

-- Enable RLS on the backup view
ALTER VIEW public.leads_backup_view SET (security_barrier = true);

-- Grant permissions on the backup view
GRANT SELECT ON public.leads_backup_view TO authenticated;

-- Step 6: Create validation trigger for lead references
CREATE OR REPLACE FUNCTION public.validate_leads_references()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure organizer_id references exist
    IF NEW.organizer_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.organizer 
            WHERE organizer_id = NEW.organizer_id 
            AND user_id = NEW.user_id
        ) THEN
            RAISE EXCEPTION 'Invalid organizer_id reference';
        END IF;
    END IF;
    
    -- Ensure event_id references exist
    IF NEW.event_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.event 
            WHERE event_id = NEW.event_id 
            AND user_id = NEW.user_id
        ) THEN
            RAISE EXCEPTION 'Invalid event_id reference';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for validation
DROP TRIGGER IF EXISTS validate_leads_references ON public.leads;
CREATE TRIGGER validate_leads_references
    BEFORE INSERT OR UPDATE ON public.leads
    FOR EACH ROW EXECUTE FUNCTION public.validate_leads_references();

-- Step 7: Update column comments
COMMENT ON COLUMN public.leads.organizer_id IS 'Reference to the organizer associated with this lead';
COMMENT ON COLUMN public.leads.event_id IS 'Reference to the event associated with this lead';

-- Step 8: Create additional indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_user_created ON public.leads(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_user_organizer ON public.leads(user_id, organizer_id);
CREATE INDEX IF NOT EXISTS idx_leads_user_event ON public.leads(user_id, event_id);
CREATE INDEX IF NOT EXISTS idx_leads_status_date ON public.leads(status_busca, data_ultima_busca DESC);

-- Step 9: Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.validate_leads_references TO authenticated;

-- Step 10: Remove redundant columns that are now in normalized tables
-- IMPORTANT: Only run this after verifying the migration is successful!

-- First, create a backup view to preserve access to the old structure
CREATE OR REPLACE VIEW public.leads_legacy_backup AS
SELECT 
    l.id,
    l.nome_evento,
    l.data_evento,
    l.local,
    l.produtor,
    l.sympla_url,
    l.email_contato,
    l.website,
    l.user_id,
    l.contato_verificado,
    l.data_ultima_busca,
    l.hunter_domain,
    l.status_busca,
    l.created_at,
    l.updated_at,
    l.organizer_id,
    l.event_id
FROM public.leads l;

GRANT SELECT ON public.leads_legacy_backup TO authenticated;

-- Verify all leads have proper references before dropping columns
DO $$
DECLARE
    unlinked_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO unlinked_count 
    FROM public.leads 
    WHERE organizer_id IS NULL OR event_id IS NULL;
    
    IF unlinked_count > 0 THEN
        RAISE EXCEPTION 'Cannot remove columns: % leads are not properly linked to organizer/event tables', unlinked_count;
    END IF;
END $$;

-- Remove redundant columns (commented out for safety - uncomment after verification)
/*
ALTER TABLE public.leads 
DROP COLUMN IF EXISTS nome_evento,
DROP COLUMN IF EXISTS data_evento,
DROP COLUMN IF EXISTS local,
DROP COLUMN IF EXISTS produtor,
DROP COLUMN IF EXISTS sympla_url,
DROP COLUMN IF EXISTS email_contato,
DROP COLUMN IF EXISTS website;
*/

-- Create a summary view to check migration results
CREATE OR REPLACE VIEW public.leads_migration_summary AS
SELECT 
    COUNT(*) as total_leads,
    COUNT(organizer_id) as leads_with_organizer,
    COUNT(event_id) as leads_with_event,
    COUNT(CASE WHEN organizer_id IS NOT NULL AND event_id IS NOT NULL THEN 1 END) as fully_migrated,
    COUNT(CASE WHEN organizer_id IS NULL OR event_id IS NULL THEN 1 END) as incomplete_migration
FROM public.leads;

GRANT SELECT ON public.leads_migration_summary TO authenticated;