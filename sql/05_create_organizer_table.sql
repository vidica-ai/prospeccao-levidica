-- Migration: Create organizer table for event organizers
-- This migration creates a normalized table to store event organizer information
-- extracted from the monolithic leads table

-- Create the organizer table
CREATE TABLE IF NOT EXISTS public.organizer (
    organizer_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    website TEXT,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure organizer names are unique per user to prevent duplicates
    CONSTRAINT unique_organizer_per_user UNIQUE(name, user_id)
);

-- Enable Row Level Security on organizer table
ALTER TABLE public.organizer ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for organizer table

-- Policy: Users can view only their own organizers
CREATE POLICY "Users can view own organizers" ON public.organizer
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own organizers
CREATE POLICY "Users can insert own organizers" ON public.organizer
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own organizers
CREATE POLICY "Users can update own organizers" ON public.organizer
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own organizers
CREATE POLICY "Users can delete own organizers" ON public.organizer
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for performance optimization

-- Index on user_id for fast filtering by user
CREATE INDEX IF NOT EXISTS idx_organizer_user_id ON public.organizer(user_id);

-- Index on created_at for chronological ordering
CREATE INDEX IF NOT EXISTS idx_organizer_created_at ON public.organizer(created_at DESC);

-- Index on name for search functionality
CREATE INDEX IF NOT EXISTS idx_organizer_name ON public.organizer(name);

-- Composite index for user's organizers ordered by name
CREATE INDEX IF NOT EXISTS idx_organizer_user_name ON public.organizer(user_id, name);

-- Index on website for domain-based lookups
CREATE INDEX IF NOT EXISTS idx_organizer_website ON public.organizer(website) WHERE website IS NOT NULL;

-- Create trigger for automatic updated_at timestamp
DROP TRIGGER IF EXISTS update_organizer_updated_at ON public.organizer;
CREATE TRIGGER update_organizer_updated_at
    BEFORE UPDATE ON public.organizer
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE public.organizer IS 'Stores event organizer information normalized from leads table';
COMMENT ON COLUMN public.organizer.organizer_id IS 'Unique identifier for each organizer';
COMMENT ON COLUMN public.organizer.name IS 'Name of the event organizer/producer';
COMMENT ON COLUMN public.organizer.website IS 'Organizer website URL';
COMMENT ON COLUMN public.organizer.user_id IS 'Reference to the user who created this organizer';
COMMENT ON COLUMN public.organizer.created_at IS 'Timestamp when the organizer was first created';
COMMENT ON COLUMN public.organizer.updated_at IS 'Timestamp when the organizer was last updated';

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizer TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;