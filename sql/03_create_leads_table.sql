-- Create leads table for storing Sympla event lead information
-- This table stores lead data extracted from Sympla event pages

-- Create the leads table
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome_evento TEXT NOT NULL,
    data_evento TEXT NOT NULL,
    local TEXT NOT NULL,
    produtor TEXT NOT NULL,
    sympla_url TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security on leads table
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for leads table

-- Policy: Users can view only their own leads
CREATE POLICY "Users can view own leads" ON public.leads
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own leads
CREATE POLICY "Users can insert own leads" ON public.leads
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own leads
CREATE POLICY "Users can update own leads" ON public.leads
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own leads
CREATE POLICY "Users can delete own leads" ON public.leads
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for performance optimization

-- Index on user_id for fast filtering by user
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON public.leads(user_id);

-- Index on created_at for chronological ordering
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);

-- Index on sympla_url for fast duplicate checking
CREATE INDEX IF NOT EXISTS idx_leads_sympla_url ON public.leads(sympla_url);

-- Composite index for user's leads ordered by creation date
CREATE INDEX IF NOT EXISTS idx_leads_user_created ON public.leads(user_id, created_at DESC);

-- Create trigger for automatic updated_at timestamp
-- (Reusing the function from 01_auth_setup.sql)
DROP TRIGGER IF EXISTS update_leads_updated_at ON public.leads;
CREATE TRIGGER update_leads_updated_at
    BEFORE UPDATE ON public.leads
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE public.leads IS 'Stores lead information extracted from Sympla event pages';
COMMENT ON COLUMN public.leads.id IS 'Unique identifier for each lead';
COMMENT ON COLUMN public.leads.nome_evento IS 'Name of the event from Sympla';
COMMENT ON COLUMN public.leads.data_evento IS 'Event date as extracted from Sympla page';
COMMENT ON COLUMN public.leads.local IS 'Event location/venue';
COMMENT ON COLUMN public.leads.produtor IS 'Event producer/organizer name';
COMMENT ON COLUMN public.leads.sympla_url IS 'Original Sympla URL (unique constraint prevents duplicates)';
COMMENT ON COLUMN public.leads.user_id IS 'Reference to the user who created this lead';
COMMENT ON COLUMN public.leads.created_at IS 'Timestamp when the lead was first created';
COMMENT ON COLUMN public.leads.updated_at IS 'Timestamp when the lead was last updated (auto-updated by trigger)';

-- Create a view for easier querying of leads with user information
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
    p.email as user_email,
    p.full_name as user_full_name
FROM public.leads l
LEFT JOIN public.profiles p ON l.user_id = p.id;

-- Enable RLS on the view (inherits from base table policies)
ALTER VIEW public.leads_with_user SET (security_barrier = true);

-- Grant necessary permissions
-- Note: In Supabase, these permissions are typically managed through the dashboard
-- But including them here for completeness

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant permissions on leads table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;

-- Grant permissions on the view
GRANT SELECT ON public.leads_with_user TO authenticated;

-- Grant usage on sequences (for UUID generation)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;