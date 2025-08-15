-- Migration: Create event table linked to organizers
-- This migration creates a normalized table to store event information
-- with proper foreign key relationships to organizers

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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure organizer and user consistency
    CONSTRAINT event_organizer_user_consistency CHECK (
        -- This will be enforced by a trigger since we can't do cross-table checks here
        organizer_id IS NOT NULL AND user_id IS NOT NULL
    )
);

-- Enable Row Level Security on event table
ALTER TABLE public.event ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for event table

-- Policy: Users can view only their own events
CREATE POLICY "Users can view own events" ON public.event
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own events
CREATE POLICY "Users can insert own events" ON public.event
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own events
CREATE POLICY "Users can update own events" ON public.event
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own events
CREATE POLICY "Users can delete own events" ON public.event
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for performance optimization

-- Index on user_id for fast filtering by user
CREATE INDEX IF NOT EXISTS idx_event_user_id ON public.event(user_id);

-- Index on organizer_id for fast joins with organizer table
CREATE INDEX IF NOT EXISTS idx_event_organizer_id ON public.event(organizer_id);

-- Index on created_at for chronological ordering
CREATE INDEX IF NOT EXISTS idx_event_created_at ON public.event(created_at DESC);

-- Index on sympla_url for fast duplicate checking
CREATE INDEX IF NOT EXISTS idx_event_sympla_url ON public.event(sympla_url);

-- Index on data_evento for date-based filtering
CREATE INDEX IF NOT EXISTS idx_event_data_evento ON public.event(data_evento);

-- Composite index for user's events ordered by creation date
CREATE INDEX IF NOT EXISTS idx_event_user_created ON public.event(user_id, created_at DESC);

-- Composite index for organizer's events
CREATE INDEX IF NOT EXISTS idx_event_organizer_created ON public.event(organizer_id, created_at DESC);

-- Index on event name for search functionality
CREATE INDEX IF NOT EXISTS idx_event_nome_evento ON public.event USING gin(to_tsvector('portuguese', nome_evento));

-- Create trigger for automatic updated_at timestamp
DROP TRIGGER IF EXISTS update_event_updated_at ON public.event;
CREATE TRIGGER update_event_updated_at
    BEFORE UPDATE ON public.event
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to ensure organizer and user consistency
CREATE OR REPLACE FUNCTION public.validate_event_organizer_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if the organizer belongs to the same user
    IF NOT EXISTS (
        SELECT 1 FROM public.organizer 
        WHERE organizer_id = NEW.organizer_id 
        AND user_id = NEW.user_id
    ) THEN
        RAISE EXCEPTION 'Organizer must belong to the same user as the event';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS validate_event_organizer_user ON public.event;
CREATE TRIGGER validate_event_organizer_user
    BEFORE INSERT OR UPDATE ON public.event
    FOR EACH ROW EXECUTE FUNCTION public.validate_event_organizer_user();

-- Add comments for documentation
COMMENT ON TABLE public.event IS 'Stores event information linked to organizers, normalized from leads table';
COMMENT ON COLUMN public.event.event_id IS 'Unique identifier for each event';
COMMENT ON COLUMN public.event.nome_evento IS 'Name of the event from Sympla';
COMMENT ON COLUMN public.event.data_evento IS 'Event date as extracted from Sympla page';
COMMENT ON COLUMN public.event.local IS 'Event location/venue';
COMMENT ON COLUMN public.event.sympla_url IS 'Original Sympla URL (unique constraint prevents duplicates)';
COMMENT ON COLUMN public.event.organizer_id IS 'Reference to the organizer of this event';
COMMENT ON COLUMN public.event.user_id IS 'Reference to the user who created this event';
COMMENT ON COLUMN public.event.created_at IS 'Timestamp when the event was first created';
COMMENT ON COLUMN public.event.updated_at IS 'Timestamp when the event was last updated';

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_event_organizer_user TO authenticated;