-- Migration: Create additional performance indexes for the normalized database
-- This migration adds specialized indexes to optimize common query patterns
-- for the new normalized structure

-- Start a transaction for atomic index creation
BEGIN;

-- Step 1: Advanced indexes for organizer table

-- Index for fuzzy name matching (requires pg_trgm extension)
-- Uncomment the next line if you have superuser privileges
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- CREATE INDEX IF NOT EXISTS idx_organizer_name_trigram 
-- ON public.organizer USING gin(name gin_trgm_ops);

-- Index for website (simplified - without regex functions)
CREATE INDEX IF NOT EXISTS idx_organizer_website 
ON public.organizer(website) 
WHERE website IS NOT NULL;

-- Composite index for organizer statistics per user
CREATE INDEX IF NOT EXISTS idx_organizer_user_stats 
ON public.organizer(user_id, created_at DESC, name);

-- Step 2: Advanced indexes for event table

-- Index for event date range queries 
-- Note: Since data_evento is TEXT, we create a simple text index
-- For proper date indexing, consider adding a DATE column in the future
CREATE INDEX IF NOT EXISTS idx_event_data_evento_text
ON public.event(data_evento) WHERE data_evento IS NOT NULL;

-- Index for event location (simplified - without text search)
CREATE INDEX IF NOT EXISTS idx_event_local 
ON public.event(local);

-- Composite index for organizer's events with date sorting
CREATE INDEX IF NOT EXISTS idx_event_organizer_date 
ON public.event(organizer_id, data_evento DESC);

-- Index for Sympla URL (simplified - without regex)
CREATE INDEX IF NOT EXISTS idx_event_sympla_url_btree 
ON public.event(sympla_url);

-- Step 3: Advanced indexes for contact table

-- Index for email (simplified - without split_part)
CREATE INDEX IF NOT EXISTS idx_contact_email 
ON public.contact(email) 
WHERE email IS NOT NULL;

-- Index for contact name (simplified - without text search)
CREATE INDEX IF NOT EXISTS idx_contact_name 
ON public.contact(name) 
WHERE name IS NOT NULL;

-- Composite index for organizer contacts with verification status
CREATE INDEX IF NOT EXISTS idx_contact_organizer_verified 
ON public.contact(organizer_id, created_at DESC) 
WHERE email IS NOT NULL;

-- Step 4: Advanced indexes for leads table (updated structure)

-- Index for Hunter.io status tracking
CREATE INDEX IF NOT EXISTS idx_leads_hunter_status_date 
ON public.leads(status_busca, data_ultima_busca DESC NULLS LAST, user_id);

-- Index for verified contacts by user
CREATE INDEX IF NOT EXISTS idx_leads_verified_contacts 
ON public.leads(user_id, contato_verificado, data_ultima_busca DESC) 
WHERE contato_verificado = true;

-- Index for pending contact searches by user and date
CREATE INDEX IF NOT EXISTS idx_leads_pending_search 
ON public.leads(user_id, created_at DESC) 
WHERE status_busca = 'pendente';

-- Composite index for organizer lead statistics
CREATE INDEX IF NOT EXISTS idx_leads_organizer_stats 
ON public.leads(organizer_id, status_busca, contato_verificado);

-- Composite index for event lead tracking
CREATE INDEX IF NOT EXISTS idx_leads_event_tracking 
ON public.leads(event_id, data_ultima_busca DESC, status_busca);

-- Index for Hunter domain analysis
CREATE INDEX IF NOT EXISTS idx_leads_hunter_domain_analysis 
ON public.leads(hunter_domain, status_busca) 
WHERE hunter_domain IS NOT NULL;

-- Step 5: Cross-table composite indexes for common joins

-- Index to optimize organizer-event-lead joins
CREATE INDEX IF NOT EXISTS idx_organizer_event_leads_join 
ON public.organizer(organizer_id, user_id, created_at DESC);

-- Index to optimize event-lead performance queries
CREATE INDEX IF NOT EXISTS idx_event_leads_performance 
ON public.event(event_id, organizer_id, user_id, created_at DESC);

-- Step 6: Specialized indexes for analytics and reporting

-- Index for organizer creation date and user
-- Using simple columns instead of date_trunc which requires IMMUTABLE
CREATE INDEX IF NOT EXISTS idx_organizer_monthly_stats 
ON public.organizer(user_id, created_at);

-- Index for event creation date, user and organizer  
CREATE INDEX IF NOT EXISTS idx_event_monthly_stats 
ON public.event(user_id, organizer_id, created_at);

-- Index for lead conversion tracking by date
CREATE INDEX IF NOT EXISTS idx_leads_monthly_conversion 
ON public.leads(user_id, created_at, status_busca);

-- Step 7: Enable trigram extension for fuzzy matching (if not already enabled)
-- Note: This requires superuser privileges in production
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Step 8: Create index usage monitoring view
-- Using correct column names from pg_stat_user_indexes
CREATE OR REPLACE VIEW public.index_usage_stats AS
SELECT 
    schemaname,
    relname as tablename,
    indexrelname as indexname,
    idx_scan as scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
AND relname IN ('leads', 'organizer', 'event', 'contact')
ORDER BY idx_scan DESC;

-- Grant permissions on the monitoring view
GRANT SELECT ON public.index_usage_stats TO authenticated;

-- Commit all index changes
COMMIT;

-- Step 9: Analyze tables to update statistics for the new indexes
ANALYZE public.organizer;
ANALYZE public.event;
ANALYZE public.contact;
ANALYZE public.leads;

-- Add comments for documentation
COMMENT ON VIEW public.index_usage_stats IS 'Monitor index usage statistics for performance optimization';