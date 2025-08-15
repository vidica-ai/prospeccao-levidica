# Step-by-Step Migration Execution Guide

Execute these SQL blocks one by one in your Supabase SQL Editor. Check for errors after each step.

## Step 1: Create Organizer Table

```sql
-- Create the organizer table
CREATE TABLE IF NOT EXISTS public.organizer (
    organizer_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    website TEXT,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_organizer_per_user UNIQUE(name, user_id)
);

-- Enable RLS
ALTER TABLE public.organizer ENABLE ROW LEVEL SECURITY;

-- Create policies
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

-- Create update trigger
CREATE TRIGGER update_organizer_updated_at
    BEFORE UPDATE ON public.organizer
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizer TO authenticated;
```

## Step 2: Create Event Table

```sql
-- Create the event table
CREATE TABLE IF NOT EXISTS public.event (
    event_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome_evento TEXT NOT NULL,
    data_evento TEXT NOT NULL,
    local TEXT NOT NULL,
    sympla_url TEXT NOT NULL UNIQUE,
    organizer_id UUID NOT NULL REFERENCES public.organizer(organizer_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.event ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own events" ON public.event
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own events" ON public.event
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own events" ON public.event
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own events" ON public.event
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_event_user_id ON public.event(user_id);
CREATE INDEX IF NOT EXISTS idx_event_organizer_id ON public.event(organizer_id);
CREATE INDEX IF NOT EXISTS idx_event_created_at ON public.event(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_sympla_url ON public.event(sympla_url);

-- Create update trigger
CREATE TRIGGER update_event_updated_at
    BEFORE UPDATE ON public.event
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event TO authenticated;
```

## Step 3: Create Contact Table

```sql
-- Create the contact table
CREATE TABLE IF NOT EXISTS public.contact (
    contact_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT,
    email TEXT,
    position TEXT,
    organizer_id UUID NOT NULL REFERENCES public.organizer(organizer_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_email_per_organizer UNIQUE(email, organizer_id)
);

-- Enable RLS
ALTER TABLE public.contact ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own contacts" ON public.contact
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contacts" ON public.contact
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contacts" ON public.contact
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own contacts" ON public.contact
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_contact_user_id ON public.contact(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_organizer_id ON public.contact(organizer_id);
CREATE INDEX IF NOT EXISTS idx_contact_email ON public.contact(email);

-- Create update trigger
CREATE TRIGGER update_contact_updated_at
    BEFORE UPDATE ON public.contact
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact TO authenticated;
```

## Step 4: Migrate Data (Use the clean version)

```sql
-- Add temporary columns to track migration
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS temp_organizer_id UUID,
ADD COLUMN IF NOT EXISTS temp_event_id UUID;

-- Create organizers from unique produtor values
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

-- Create events from leads
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

-- Create contacts
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

-- Update temporary columns
UPDATE public.leads l
SET temp_organizer_id = o.organizer_id
FROM public.organizer o
WHERE o.name = l.produtor AND o.user_id = l.user_id;

UPDATE public.leads l
SET temp_event_id = e.event_id
FROM public.event e
WHERE e.sympla_url = l.sympla_url AND e.user_id = l.user_id;
```

## Step 5: Update Leads Table Structure

```sql
-- Add new foreign key columns
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS organizer_id UUID,
ADD COLUMN IF NOT EXISTS event_id UUID;

-- Copy data from temporary to permanent columns
UPDATE public.leads 
SET 
    organizer_id = temp_organizer_id,
    event_id = temp_event_id
WHERE temp_organizer_id IS NOT NULL 
  AND temp_event_id IS NOT NULL;

-- Add foreign key constraints
ALTER TABLE public.leads 
ADD CONSTRAINT fk_leads_organizer 
    FOREIGN KEY (organizer_id) REFERENCES public.organizer(organizer_id) ON DELETE CASCADE;

ALTER TABLE public.leads 
ADD CONSTRAINT fk_leads_event 
    FOREIGN KEY (event_id) REFERENCES public.event(event_id) ON DELETE CASCADE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_leads_organizer_id ON public.leads(organizer_id);
CREATE INDEX IF NOT EXISTS idx_leads_event_id ON public.leads(event_id);
```

## Step 6: Create Views

```sql
-- Create complete leads view
CREATE OR REPLACE VIEW public.leads_complete AS
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
    o.name as organizer_name,
    o.website as organizer_website,
    e.nome_evento,
    e.data_evento,
    e.local,
    e.sympla_url
FROM public.leads l
LEFT JOIN public.organizer o ON l.organizer_id = o.organizer_id
LEFT JOIN public.event e ON l.event_id = e.event_id;

-- Grant permissions
GRANT SELECT ON public.leads_complete TO authenticated;

-- Create backup view for legacy compatibility
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

-- Grant permissions
GRANT SELECT ON public.leads_backup_view TO authenticated;
```

## Step 7: Verify Migration

```sql
-- Check migration status
SELECT 
    'Total Leads' as metric,
    COUNT(*) as count
FROM public.leads
UNION ALL
SELECT 
    'Leads with Organizer' as metric,
    COUNT(*) as count
FROM public.leads
WHERE organizer_id IS NOT NULL
UNION ALL
SELECT 
    'Leads with Event' as metric,
    COUNT(*) as count
FROM public.leads
WHERE event_id IS NOT NULL
UNION ALL
SELECT 
    'Total Organizers' as metric,
    COUNT(*) as count
FROM public.organizer
UNION ALL
SELECT 
    'Total Events' as metric,
    COUNT(*) as count
FROM public.event
UNION ALL
SELECT 
    'Total Contacts' as metric,
    COUNT(*) as count
FROM public.contact;
```

## Step 8: Test the Views

```sql
-- Test leads_complete view
SELECT * FROM leads_complete LIMIT 5;

-- Test backup view for legacy compatibility
SELECT * FROM leads_backup_view LIMIT 5;
```

## Step 9: Clean Up (Optional - after verifying everything works)

```sql
-- Remove temporary columns
ALTER TABLE public.leads 
DROP COLUMN IF EXISTS temp_organizer_id,
DROP COLUMN IF EXISTS temp_event_id;

-- Drop old columns that are now in other tables (BE CAREFUL!)
-- Only do this after confirming application works with new schema
-- ALTER TABLE public.leads 
-- DROP COLUMN IF EXISTS nome_evento,
-- DROP COLUMN IF EXISTS data_evento,
-- DROP COLUMN IF EXISTS local,
-- DROP COLUMN IF EXISTS produtor,
-- DROP COLUMN IF EXISTS sympla_url,
-- DROP COLUMN IF EXISTS email_contato,
-- DROP COLUMN IF EXISTS website;
```

## Troubleshooting

If you get errors:

1. **"relation already exists"** - Table/index already created, safe to ignore
2. **"column already exists"** - Column already added, safe to ignore  
3. **"violates foreign key constraint"** - Check data integrity, some leads may not have matching organizers/events
4. **"duplicate key value"** - Check for duplicate data in source table

## Verification Queries

After migration, run these to verify success:

```sql
-- Check if all leads are properly linked
SELECT 
    COUNT(*) as total,
    COUNT(organizer_id) as with_organizer,
    COUNT(event_id) as with_event
FROM leads;

-- Find any unlinked leads
SELECT * FROM leads 
WHERE organizer_id IS NULL OR event_id IS NULL
LIMIT 10;
```