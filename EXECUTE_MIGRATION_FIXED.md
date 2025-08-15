# Fixed Migration Steps for Supabase

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

## Step 4: Migrate Data

```sql
-- Add temporary columns to track migration
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS temp_organizer_id UUID,
ADD COLUMN IF NOT EXISTS temp_event_id UUID;
```

Then run this:

```sql
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
```

Then:

```sql
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
```

Then:

```sql
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
```

Then:

```sql
-- Update temporary columns with organizer references
UPDATE public.leads l
SET temp_organizer_id = o.organizer_id
FROM public.organizer o
WHERE o.name = l.produtor AND o.user_id = l.user_id;
```

Then:

```sql
-- Update temporary columns with event references
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
```

Then:

```sql
-- Copy data from temporary to permanent columns
UPDATE public.leads 
SET 
    organizer_id = temp_organizer_id,
    event_id = temp_event_id
WHERE temp_organizer_id IS NOT NULL 
  AND temp_event_id IS NOT NULL;
```

Then add foreign keys (check if they exist first):

```sql
-- Check if constraint exists
SELECT constraint_name 
FROM information_schema.table_constraints 
WHERE table_name = 'leads' 
AND constraint_name IN ('fk_leads_organizer', 'fk_leads_event');
```

If the constraints don't exist, add them:

```sql
-- Add foreign key constraint for organizer
ALTER TABLE public.leads 
ADD CONSTRAINT fk_leads_organizer 
FOREIGN KEY (organizer_id) 
REFERENCES public.organizer(organizer_id) 
ON DELETE CASCADE;
```

```sql
-- Add foreign key constraint for event
ALTER TABLE public.leads 
ADD CONSTRAINT fk_leads_event 
FOREIGN KEY (event_id) 
REFERENCES public.event(event_id) 
ON DELETE CASCADE;
```

Then create indexes:

```sql
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
```

Then:

```sql
-- Create backup view for legacy compatibility
CREATE OR REPLACE VIEW public.leads_backup_view AS
SELECT 
    l.id,
    COALESCE(e.nome_evento, l.nome_evento) as nome_evento,
    COALESCE(e.data_evento, l.data_evento) as data_evento,
    COALESCE(e.local, l.local) as local,
    COALESCE(o.name, l.produtor) as produtor,
    COALESCE(e.sympla_url, l.sympla_url) as sympla_url,
    l.user_id,
    COALESCE(c.email, l.email_contato) as email_contato,
    COALESCE(o.website, l.website) as website,
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
```

```sql
-- Test backup view for legacy compatibility
SELECT * FROM leads_backup_view LIMIT 5;
```

## Step 9: Create Summary Views

```sql
-- Create organizer summary view
CREATE OR REPLACE VIEW public.organizer_summary AS
SELECT 
    o.organizer_id,
    o.name,
    o.website,
    o.user_id,
    o.created_at,
    o.updated_at,
    COUNT(DISTINCT e.event_id) as events_count,
    COUNT(DISTINCT l.id) as leads_count,
    COUNT(DISTINCT c.contact_id) as contacts_count,
    MAX(e.data_evento) as last_event_date
FROM public.organizer o
LEFT JOIN public.event e ON e.organizer_id = o.organizer_id
LEFT JOIN public.leads l ON l.organizer_id = o.organizer_id
LEFT JOIN public.contact c ON c.organizer_id = o.organizer_id
GROUP BY o.organizer_id, o.name, o.website, o.user_id, o.created_at, o.updated_at;

GRANT SELECT ON public.organizer_summary TO authenticated;
```

## Step 10: Create Performance Indexes

```sql
-- Basic performance indexes for the new structure
CREATE INDEX IF NOT EXISTS idx_organizer_user_created ON public.organizer(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_organizer_created ON public.event(organizer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_organizer ON public.contact(organizer_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status_busca);
CREATE INDEX IF NOT EXISTS idx_leads_verified ON public.leads(contato_verificado) WHERE contato_verificado = true;
```

## Step 11: Clean Up Redundant Columns (IMPORTANT - After Full Verification)

After you've verified that the migration is 100% successful and your application works with the new schema, you can clean up the redundant columns from the leads table.

**⚠️ WARNING: This step removes data permanently. Only do this after thorough testing!**

The leads table currently still has these redundant fields that are now stored in other tables:
- `nome_evento`, `data_evento`, `local`, `sympla_url` → now in `event` table
- `produtor`, `website` → now in `organizer` table  
- `email_contato` → now in `contact` table

### Option A: Automatic Cleanup (Recommended)
Execute the cleanup script that includes safety checks:
```sql
-- Copy and execute the entire content of sql/13_cleanup_redundant_columns.sql
```

### Option B: Manual Cleanup (Advanced users)
```sql
-- Remove temporary columns first
ALTER TABLE public.leads 
DROP COLUMN IF EXISTS temp_organizer_id,
DROP COLUMN IF EXISTS temp_event_id;

-- Remove redundant event fields (now in event table)
ALTER TABLE public.leads DROP COLUMN IF EXISTS nome_evento;
ALTER TABLE public.leads DROP COLUMN IF EXISTS data_evento;
ALTER TABLE public.leads DROP COLUMN IF EXISTS local;
ALTER TABLE public.leads DROP COLUMN IF EXISTS sympla_url;

-- Remove redundant organizer fields (now in organizer table)
ALTER TABLE public.leads DROP COLUMN IF EXISTS produtor;
ALTER TABLE public.leads DROP COLUMN IF EXISTS website;

-- Remove redundant contact field (now in contact table)
ALTER TABLE public.leads DROP COLUMN IF EXISTS email_contato;
```

### After Cleanup, Your Leads Table Will Contain Only:
- `id` - Lead identifier
- `organizer_id` - Reference to organizer table
- `event_id` - Reference to event table
- `user_id` - User who created the lead
- `contato_verificado` - Contact verification status
- `data_ultima_busca` - Last search date
- `hunter_domain` - Hunter.io domain
- `status_busca` - Search status
- `created_at`, `updated_at` - Timestamps

## Troubleshooting Common Errors

### If you get "constraint already exists" error:
First drop the existing constraint:
```sql
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS fk_leads_organizer;
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS fk_leads_event;
```
Then add them again.

### If you get "violates foreign key constraint" error:
Check for orphaned records:
```sql
-- Find leads without matching organizers
SELECT * FROM leads 
WHERE organizer_id IS NOT NULL 
AND organizer_id NOT IN (SELECT organizer_id FROM organizer);

-- Find leads without matching events
SELECT * FROM leads 
WHERE event_id IS NOT NULL 
AND event_id NOT IN (SELECT event_id FROM event);
```

### To check what constraints exist:
```sql
SELECT 
    tc.constraint_name, 
    tc.constraint_type,
    tc.table_name
FROM information_schema.table_constraints tc
WHERE tc.table_name IN ('leads', 'organizer', 'event', 'contact')
ORDER BY tc.table_name, tc.constraint_type;
```