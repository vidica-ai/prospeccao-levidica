-- ROLLBACK Migration: Restore original leads table structure
-- This script provides a way to rollback the database normalization
-- WARNING: This will permanently delete the normalized data structure
-- Only run this if you need to revert to the original monolithic schema

-- IMPORTANT: Backup your data before running this script!
-- This script assumes the leads_backup_view still exists with original data

-- Start transaction for safety
BEGIN;

-- Step 1: Confirm backup data exists
DO $$
DECLARE
    backup_count INTEGER;
    current_leads_count INTEGER;
BEGIN
    -- Check if backup view exists and has data
    SELECT COUNT(*) INTO backup_count FROM public.leads_backup_view;
    SELECT COUNT(*) INTO current_leads_count FROM public.leads;
    
    RAISE NOTICE 'Backup view contains % records', backup_count;
    RAISE NOTICE 'Current leads table contains % records', current_leads_count;
    
    IF backup_count = 0 THEN
        RAISE EXCEPTION 'No backup data found. Cannot safely rollback.';
    END IF;
    
    IF backup_count != current_leads_count THEN
        RAISE WARNING 'Backup count (%) differs from current leads count (%). Proceeding with caution.', backup_count, current_leads_count;
    END IF;
END $$;

-- Step 2: Create temporary table with original structure
CREATE TABLE IF NOT EXISTS public.leads_original_temp AS
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
    updated_at
FROM public.leads_backup_view;

-- Step 3: Drop all new constraints and triggers from leads table
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_organizer_id_fkey;
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_event_id_fkey;
DROP TRIGGER IF EXISTS validate_leads_references ON public.leads;
DROP FUNCTION IF EXISTS public.validate_leads_references();

-- Step 4: Drop new indexes
DROP INDEX IF EXISTS idx_leads_organizer_id;
DROP INDEX IF EXISTS idx_leads_event_id;
DROP INDEX IF EXISTS idx_leads_organizer_event;
DROP INDEX IF EXISTS idx_leads_user_organizer;
DROP INDEX IF EXISTS idx_leads_user_event;
DROP INDEX IF EXISTS idx_leads_status_date;

-- Step 5: Add back original columns to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS nome_evento TEXT,
ADD COLUMN IF NOT EXISTS data_evento TEXT,
ADD COLUMN IF NOT EXISTS local TEXT,
ADD COLUMN IF NOT EXISTS produtor TEXT,
ADD COLUMN IF NOT EXISTS sympla_url TEXT,
ADD COLUMN IF NOT EXISTS email_contato TEXT,
ADD COLUMN IF NOT EXISTS website TEXT;

-- Step 6: Clear current leads data and restore from backup
TRUNCATE public.leads;

INSERT INTO public.leads (
    id, nome_evento, data_evento, local, produtor, sympla_url,
    user_id, email_contato, website, contato_verificado, 
    data_ultima_busca, hunter_domain, status_busca, created_at, updated_at
)
SELECT 
    id, nome_evento, data_evento, local, produtor, sympla_url,
    user_id, email_contato, website, contato_verificado, 
    data_ultima_busca, hunter_domain, status_busca, created_at, updated_at
FROM public.leads_original_temp;

-- Step 7: Remove normalized table columns
ALTER TABLE public.leads 
DROP COLUMN IF EXISTS organizer_id,
DROP COLUMN IF EXISTS event_id;

-- Step 8: Restore original constraints and indexes
ALTER TABLE public.leads 
ALTER COLUMN nome_evento SET NOT NULL,
ALTER COLUMN data_evento SET NOT NULL,
ALTER COLUMN local SET NOT NULL,
ALTER COLUMN produtor SET NOT NULL,
ALTER COLUMN sympla_url SET NOT NULL;

-- Add unique constraint back
ALTER TABLE public.leads 
ADD CONSTRAINT leads_sympla_url_key UNIQUE (sympla_url);

-- Step 9: Recreate original indexes
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON public.leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_sympla_url ON public.leads(sympla_url);
CREATE INDEX IF NOT EXISTS idx_leads_user_created ON public.leads(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_contato_verificado ON public.leads(contato_verificado) WHERE contato_verificado = true;
CREATE INDEX IF NOT EXISTS idx_leads_status_busca ON public.leads(status_busca);
CREATE INDEX IF NOT EXISTS idx_leads_data_ultima_busca ON public.leads(data_ultima_busca DESC) WHERE data_ultima_busca IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_user_status_busca ON public.leads(user_id, status_busca) WHERE status_busca = 'pendente';
CREATE INDEX IF NOT EXISTS idx_leads_hunter_domain ON public.leads(hunter_domain) WHERE hunter_domain IS NOT NULL;

-- Step 10: Restore original check constraint
ALTER TABLE public.leads 
ADD CONSTRAINT IF NOT EXISTS check_status_busca_valid 
CHECK (status_busca IN ('pendente', 'buscando', 'encontrado', 'nao_encontrado', 'erro'));

-- Step 11: Recreate original views
CREATE OR REPLACE VIEW public.leads_with_user AS
SELECT 
    l.id,
    l.nome_evento,
    l.data_evento,
    l.local,
    l.produtor,
    l.sympla_url,
    l.user_id,
    l.created_at,
    l.updated_at,
    l.email_contato,
    l.website,
    l.contato_verificado,
    l.data_ultima_busca,
    l.hunter_domain,
    l.status_busca,
    p.email as user_email,
    p.full_name as user_full_name
FROM public.leads l
LEFT JOIN public.profiles p ON l.user_id = p.id;

ALTER VIEW public.leads_with_user SET (security_barrier = true);

CREATE OR REPLACE VIEW public.leads_pending_contact_search AS
SELECT 
    id,
    nome_evento,
    produtor,
    sympla_url,
    user_id,
    created_at,
    data_ultima_busca,
    status_busca
FROM public.leads 
WHERE status_busca = 'pendente' 
   OR (status_busca = 'erro' AND data_ultima_busca < NOW() - INTERVAL '24 hours')
ORDER BY created_at ASC;

ALTER VIEW public.leads_pending_contact_search SET (security_barrier = true);

-- Step 12: Restore original function
CREATE OR REPLACE FUNCTION public.update_lead_search_status(
    lead_id UUID,
    new_status TEXT,
    found_email TEXT DEFAULT NULL,
    found_website TEXT DEFAULT NULL,
    search_domain TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    updated_rows INTEGER;
BEGIN
    IF new_status NOT IN ('pendente', 'buscando', 'encontrado', 'nao_encontrado', 'erro') THEN
        RAISE EXCEPTION 'Invalid status: %. Must be one of: pendente, buscando, encontrado, nao_encontrado, erro', new_status;
    END IF;
    
    UPDATE public.leads 
    SET 
        status_busca = new_status,
        data_ultima_busca = NOW(),
        email_contato = COALESCE(found_email, email_contato),
        website = COALESCE(found_website, website),
        hunter_domain = COALESCE(search_domain, hunter_domain),
        contato_verificado = CASE 
            WHEN new_status IN ('encontrado', 'nao_encontrado') THEN TRUE 
            ELSE contato_verificado 
        END,
        updated_at = NOW()
    WHERE id = lead_id 
    AND user_id = auth.uid();
    
    GET DIAGNOSTICS updated_rows = ROW_COUNT;
    
    RETURN updated_rows > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 13: Drop normalized tables and related objects
-- WARNING: This permanently deletes all normalized data
DO $$
BEGIN
    -- Drop views first
    DROP VIEW IF EXISTS public.leads_complete CASCADE;
    DROP VIEW IF EXISTS public.organizer_summary CASCADE;
    DROP VIEW IF EXISTS public.event_summary CASCADE;
    DROP VIEW IF EXISTS public.contact_summary CASCADE;
    DROP VIEW IF EXISTS public.daily_stats CASCADE;
    DROP VIEW IF EXISTS public.migration_status CASCADE;
    DROP VIEW IF EXISTS public.index_usage_stats CASCADE;
    DROP VIEW IF EXISTS public.leads_backup_view CASCADE;
    
    -- Drop functions
    DROP FUNCTION IF EXISTS public.get_or_create_organizer(TEXT, TEXT, UUID) CASCADE;
    DROP FUNCTION IF EXISTS public.create_event_with_organizer(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID) CASCADE;
    DROP FUNCTION IF EXISTS public.create_complete_lead(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID) CASCADE;
    DROP FUNCTION IF EXISTS public.add_organizer_contact(UUID, TEXT, TEXT, TEXT, UUID) CASCADE;
    DROP FUNCTION IF EXISTS public.update_lead_search_status_v2(UUID, TEXT, TEXT, TEXT) CASCADE;
    DROP FUNCTION IF EXISTS public.validate_event_organizer_user() CASCADE;
    DROP FUNCTION IF EXISTS public.validate_contact_organizer_user() CASCADE;
    
    -- Drop tables (order matters due to foreign keys)
    DROP TABLE IF EXISTS public.contact CASCADE;
    DROP TABLE IF EXISTS public.leads CASCADE;  -- Drop current modified leads table
    DROP TABLE IF EXISTS public.event CASCADE;
    DROP TABLE IF EXISTS public.organizer CASCADE;
    
    RAISE NOTICE 'All normalized tables and related objects dropped.';
END $$;

-- Step 14: Recreate leads table with original structure
CREATE TABLE public.leads AS
SELECT * FROM public.leads_original_temp;

-- Add primary key
ALTER TABLE public.leads ADD PRIMARY KEY (id);

-- Add foreign key to users
ALTER TABLE public.leads 
ADD CONSTRAINT leads_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Recreate RLS policies
CREATE POLICY "Users can view own leads" ON public.leads
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own leads" ON public.leads
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own leads" ON public.leads
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own leads" ON public.leads
    FOR DELETE USING (auth.uid() = user_id);

-- Recreate triggers
CREATE TRIGGER update_leads_updated_at
    BEFORE UPDATE ON public.leads
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Step 15: Clean up temporary table
DROP TABLE public.leads_original_temp;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT SELECT ON public.leads_with_user TO authenticated;
GRANT SELECT ON public.leads_pending_contact_search TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_lead_search_status TO authenticated;

-- Commit the rollback
COMMIT;

-- Final validation
DO $$
DECLARE
    leads_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO leads_count FROM public.leads;
    RAISE NOTICE 'Rollback completed. Leads table restored with % records.', leads_count;
    RAISE NOTICE 'Original monolithic schema has been restored.';
    RAISE NOTICE 'All normalized tables and related objects have been removed.';
END $$;