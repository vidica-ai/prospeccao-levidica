-- Migration: Create contact table for organizer contacts
-- This migration creates a normalized table to store contact information
-- for organizers, supporting multiple contacts per organizer

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
    
    -- Ensure at least name or email is provided
    CONSTRAINT contact_has_info CHECK (
        name IS NOT NULL OR email IS NOT NULL
    ),
    
    -- Ensure email format is valid when provided
    CONSTRAINT contact_email_format CHECK (
        email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    ),
    
    -- Prevent duplicate emails per organizer (when email is not null)
    CONSTRAINT unique_email_per_organizer UNIQUE(organizer_id, email) DEFERRABLE INITIALLY DEFERRED
);

-- Create partial unique index for non-null emails only
CREATE UNIQUE INDEX IF NOT EXISTS idx_contact_organizer_email_unique 
ON public.contact(organizer_id, email) 
WHERE email IS NOT NULL;

-- Enable Row Level Security on contact table
ALTER TABLE public.contact ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for contact table

-- Policy: Users can view only their own contacts
CREATE POLICY "Users can view own contacts" ON public.contact
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own contacts
CREATE POLICY "Users can insert own contacts" ON public.contact
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own contacts
CREATE POLICY "Users can update own contacts" ON public.contact
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own contacts
CREATE POLICY "Users can delete own contacts" ON public.contact
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for performance optimization

-- Index on user_id for fast filtering by user
CREATE INDEX IF NOT EXISTS idx_contact_user_id ON public.contact(user_id);

-- Index on organizer_id for fast joins with organizer table
CREATE INDEX IF NOT EXISTS idx_contact_organizer_id ON public.contact(organizer_id);

-- Index on created_at for chronological ordering
CREATE INDEX IF NOT EXISTS idx_contact_created_at ON public.contact(created_at DESC);

-- Index on email for fast lookups (where email is not null)
CREATE INDEX IF NOT EXISTS idx_contact_email ON public.contact(email) WHERE email IS NOT NULL;

-- Index on name for search functionality
CREATE INDEX IF NOT EXISTS idx_contact_name ON public.contact USING gin(to_tsvector('portuguese', name)) WHERE name IS NOT NULL;

-- Composite index for organizer's contacts
CREATE INDEX IF NOT EXISTS idx_contact_organizer_created ON public.contact(organizer_id, created_at DESC);

-- Composite index for user's contacts ordered by creation date
CREATE INDEX IF NOT EXISTS idx_contact_user_created ON public.contact(user_id, created_at DESC);

-- Create trigger for automatic updated_at timestamp
DROP TRIGGER IF EXISTS update_contact_updated_at ON public.contact;
CREATE TRIGGER update_contact_updated_at
    BEFORE UPDATE ON public.contact
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to ensure organizer and user consistency
CREATE OR REPLACE FUNCTION public.validate_contact_organizer_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if the organizer belongs to the same user
    IF NOT EXISTS (
        SELECT 1 FROM public.organizer 
        WHERE organizer_id = NEW.organizer_id 
        AND user_id = NEW.user_id
    ) THEN
        RAISE EXCEPTION 'Contact organizer must belong to the same user as the contact';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS validate_contact_organizer_user ON public.contact;
CREATE TRIGGER validate_contact_organizer_user
    BEFORE INSERT OR UPDATE ON public.contact
    FOR EACH ROW EXECUTE FUNCTION public.validate_contact_organizer_user();

-- Add comments for documentation
COMMENT ON TABLE public.contact IS 'Stores contact information for organizers, normalized from leads table';
COMMENT ON COLUMN public.contact.contact_id IS 'Unique identifier for each contact';
COMMENT ON COLUMN public.contact.name IS 'Name of the contact person';
COMMENT ON COLUMN public.contact.email IS 'Email address of the contact';
COMMENT ON COLUMN public.contact.position IS 'Position or role of the contact within the organization';
COMMENT ON COLUMN public.contact.organizer_id IS 'Reference to the organizer this contact belongs to';
COMMENT ON COLUMN public.contact.user_id IS 'Reference to the user who created this contact';
COMMENT ON COLUMN public.contact.created_at IS 'Timestamp when the contact was first created';
COMMENT ON COLUMN public.contact.updated_at IS 'Timestamp when the contact was last updated';

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_contact_organizer_user TO authenticated;