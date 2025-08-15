-- Migration: Data Migration from Monolithic to Normalized Schema
-- This script migrates existing data from the original leads table 
-- to the new normalized structure (organizer, event, contact tables)

-- Add temporary columns to track migration
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS temp_organizer_id UUID,
ADD COLUMN IF NOT EXISTS temp_event_id UUID;

-- Step 1: Create organizers from unique produtor values
INSERT INTO public.organizer (organizer_id, name, website, user_id, created_at, updated_at)
SELECT DISTINCT ON (produtor, user_id)
    gen_random_uuid() as organizer_id,
    produtor as name,
    website,
    user_id,
    MIN(created_at) OVER (PARTITION BY produtor, user_id) as created_at,
    NOW() as updated_at
FROM public.leads
WHERE produtor IS NOT NULL
ON CONFLICT (name, user_id) DO NOTHING;

-- Step 2: Create events from leads with organizer references
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
INNER JOIN public.organizer o ON o.name = l.produtor AND o.user_id = l.user_id
WHERE l.sympla_url IS NOT NULL
ON CONFLICT (sympla_url) DO NOTHING;

-- Step 3: Create contacts from email_contato where available
INSERT INTO public.contact (contact_id, name, email, position, organizer_id, user_id, created_at, updated_at)
SELECT DISTINCT ON (l.email_contato, o.organizer_id)
    gen_random_uuid() as contact_id,
    NULL as name,
    l.email_contato as email,
    NULL as position,
    o.organizer_id,
    l.user_id,
    l.created_at,
    l.updated_at
FROM public.leads l
INNER JOIN public.organizer o ON o.name = l.produtor AND o.user_id = l.user_id
WHERE l.email_contato IS NOT NULL AND l.email_contato != '';

-- Step 4: Update temporary columns with references
-- Update organizer_id references
UPDATE public.leads l
SET temp_organizer_id = o.organizer_id
FROM public.organizer o
WHERE o.name = l.produtor AND o.user_id = l.user_id;

-- Update event_id references
UPDATE public.leads l
SET temp_event_id = e.event_id
FROM public.event e
WHERE e.sympla_url = l.sympla_url AND e.user_id = l.user_id;

-- Create a migration status view to track progress
CREATE OR REPLACE VIEW public.migration_status AS
SELECT 
    'Total Leads' as metric,
    COUNT(*) as count
FROM public.leads
UNION ALL
SELECT 
    'Leads with Organizer' as metric,
    COUNT(*) as count
FROM public.leads
WHERE temp_organizer_id IS NOT NULL
UNION ALL
SELECT 
    'Leads with Event' as metric,
    COUNT(*) as count
FROM public.leads
WHERE temp_event_id IS NOT NULL
UNION ALL
SELECT 
    'Total Organizers Created' as metric,
    COUNT(*) as count
FROM public.organizer
UNION ALL
SELECT 
    'Total Events Created' as metric,
    COUNT(*) as count
FROM public.event
UNION ALL
SELECT 
    'Total Contacts Created' as metric,
    COUNT(*) as count
FROM public.contact;

-- Grant permissions on the migration status view
GRANT SELECT ON public.migration_status TO authenticated;

-- Add comment for documentation
COMMENT ON VIEW public.migration_status IS 'View showing the status of data migration from monolithic to normalized schema';