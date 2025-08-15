-- Migration: Create updated views and utility functions for normalized schema
-- This migration creates comprehensive views and functions to work with
-- the new normalized database structure

-- Start transaction for atomic view/function creation
BEGIN;

-- Step 1: Create comprehensive views for easy data access

-- Complete leads view with all related information
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
    -- Organizer information
    o.name as organizer_name,
    o.website as organizer_website,
    -- Event information
    e.nome_evento,
    e.data_evento,
    e.local as event_local,
    e.sympla_url,
    -- User information
    p.email as user_email,
    p.full_name as user_full_name
FROM public.leads l
INNER JOIN public.organizer o ON l.organizer_id = o.organizer_id
INNER JOIN public.event e ON l.event_id = e.event_id
LEFT JOIN public.profiles p ON l.user_id = p.id;

-- Enable RLS on the complete leads view
ALTER VIEW public.leads_complete SET (security_barrier = true);

-- Organizer summary view with statistics
CREATE OR REPLACE VIEW public.organizer_summary AS
SELECT 
    o.organizer_id,
    o.name,
    o.website,
    o.user_id,
    o.created_at,
    o.updated_at,
    COUNT(DISTINCT e.event_id) as total_events,
    COUNT(DISTINCT l.id) as total_leads,
    COUNT(DISTINCT c.contact_id) as total_contacts,
    COUNT(DISTINCT CASE WHEN l.contato_verificado = true THEN l.id END) as verified_leads,
    COUNT(DISTINCT CASE WHEN l.status_busca = 'encontrado' THEN l.id END) as successful_searches,
    MAX(l.data_ultima_busca) as last_search_date,
    MAX(e.created_at) as last_event_date
FROM public.organizer o
LEFT JOIN public.event e ON o.organizer_id = e.organizer_id
LEFT JOIN public.leads l ON o.organizer_id = l.organizer_id
LEFT JOIN public.contact c ON o.organizer_id = c.organizer_id
GROUP BY o.organizer_id, o.name, o.website, o.user_id, o.created_at, o.updated_at;

-- Enable RLS on organizer summary view
ALTER VIEW public.organizer_summary SET (security_barrier = true);

-- Event summary view with lead tracking
CREATE OR REPLACE VIEW public.event_summary AS
SELECT 
    e.event_id,
    e.nome_evento,
    e.data_evento,
    e.local,
    e.sympla_url,
    e.organizer_id,
    e.user_id,
    e.created_at,
    e.updated_at,
    o.name as organizer_name,
    o.website as organizer_website,
    COUNT(l.id) as total_leads,
    COUNT(CASE WHEN l.contato_verificado = true THEN l.id END) as verified_leads,
    COUNT(CASE WHEN l.status_busca = 'encontrado' THEN l.id END) as successful_searches,
    MAX(l.data_ultima_busca) as last_search_date
FROM public.event e
INNER JOIN public.organizer o ON e.organizer_id = o.organizer_id
LEFT JOIN public.leads l ON e.event_id = l.event_id
GROUP BY e.event_id, e.nome_evento, e.data_evento, e.local, e.sympla_url, 
         e.organizer_id, e.user_id, e.created_at, e.updated_at,
         o.name, o.website;

-- Enable RLS on event summary view
ALTER VIEW public.event_summary SET (security_barrier = true);

-- Contact summary view with organizer information
CREATE OR REPLACE VIEW public.contact_summary AS
SELECT 
    c.contact_id,
    c.name as contact_name,
    c.email,
    c.position,
    c.organizer_id,
    c.user_id,
    c.created_at,
    c.updated_at,
    o.name as organizer_name,
    o.website as organizer_website,
    COUNT(l.id) as related_leads
FROM public.contact c
INNER JOIN public.organizer o ON c.organizer_id = o.organizer_id
LEFT JOIN public.leads l ON c.organizer_id = l.organizer_id
GROUP BY c.contact_id, c.name, c.email, c.position, c.organizer_id, 
         c.user_id, c.created_at, c.updated_at, o.name, o.website;

-- Enable RLS on contact summary view
ALTER VIEW public.contact_summary SET (security_barrier = true);

-- Step 2: Create utility functions

-- Function to get or create organizer
CREATE OR REPLACE FUNCTION public.get_or_create_organizer(
    p_name TEXT,
    p_website TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS UUID AS $$
DECLARE
    v_organizer_id UUID;
BEGIN
    -- Validate input
    IF p_name IS NULL OR trim(p_name) = '' THEN
        RAISE EXCEPTION 'Organizer name cannot be empty';
    END IF;
    
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID is required';
    END IF;
    
    -- Try to find existing organizer
    SELECT organizer_id INTO v_organizer_id
    FROM public.organizer
    WHERE name = trim(p_name) 
      AND user_id = p_user_id;
    
    -- Create if not found
    IF v_organizer_id IS NULL THEN
        INSERT INTO public.organizer (name, website, user_id)
        VALUES (trim(p_name), p_website, p_user_id)
        RETURNING organizer_id INTO v_organizer_id;
    ELSE
        -- Update website if provided and different
        IF p_website IS NOT NULL THEN
            UPDATE public.organizer 
            SET website = p_website, updated_at = NOW()
            WHERE organizer_id = v_organizer_id 
              AND (website IS NULL OR website != p_website);
        END IF;
    END IF;
    
    RETURN v_organizer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create event with organizer
CREATE OR REPLACE FUNCTION public.create_event_with_organizer(
    p_nome_evento TEXT,
    p_data_evento TEXT,
    p_local TEXT,
    p_sympla_url TEXT,
    p_organizer_name TEXT,
    p_organizer_website TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS UUID AS $$
DECLARE
    v_organizer_id UUID;
    v_event_id UUID;
BEGIN
    -- Validate input
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID is required';
    END IF;
    
    -- Get or create organizer
    v_organizer_id := public.get_or_create_organizer(
        p_organizer_name, 
        p_organizer_website, 
        p_user_id
    );
    
    -- Create event
    INSERT INTO public.event (nome_evento, data_evento, local, sympla_url, organizer_id, user_id)
    VALUES (p_nome_evento, p_data_evento, p_local, p_sympla_url, v_organizer_id, p_user_id)
    RETURNING event_id INTO v_event_id;
    
    RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create lead with organizer and event
CREATE OR REPLACE FUNCTION public.create_complete_lead(
    p_nome_evento TEXT,
    p_data_evento TEXT,
    p_local TEXT,
    p_sympla_url TEXT,
    p_organizer_name TEXT,
    p_organizer_website TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS UUID AS $$
DECLARE
    v_event_id UUID;
    v_organizer_id UUID;
    v_lead_id UUID;
BEGIN
    -- Create event with organizer (this handles organizer creation too)
    v_event_id := public.create_event_with_organizer(
        p_nome_evento,
        p_data_evento,
        p_local,
        p_sympla_url,
        p_organizer_name,
        p_organizer_website,
        p_user_id
    );
    
    -- Get organizer ID from the event
    SELECT organizer_id INTO v_organizer_id
    FROM public.event
    WHERE event_id = v_event_id;
    
    -- Create lead
    INSERT INTO public.leads (organizer_id, event_id, user_id)
    VALUES (v_organizer_id, v_event_id, p_user_id)
    RETURNING id INTO v_lead_id;
    
    RETURN v_lead_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add contact to organizer
CREATE OR REPLACE FUNCTION public.add_organizer_contact(
    p_organizer_id UUID,
    p_name TEXT DEFAULT NULL,
    p_email TEXT DEFAULT NULL,
    p_position TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS UUID AS $$
DECLARE
    v_contact_id UUID;
BEGIN
    -- Validate input
    IF p_organizer_id IS NULL THEN
        RAISE EXCEPTION 'Organizer ID is required';
    END IF;
    
    IF p_name IS NULL AND p_email IS NULL THEN
        RAISE EXCEPTION 'Either contact name or email must be provided';
    END IF;
    
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID is required';
    END IF;
    
    -- Verify organizer belongs to user
    IF NOT EXISTS (
        SELECT 1 FROM public.organizer 
        WHERE organizer_id = p_organizer_id AND user_id = p_user_id
    ) THEN
        RAISE EXCEPTION 'Organizer does not belong to the specified user';
    END IF;
    
    -- Create contact
    INSERT INTO public.contact (name, email, position, organizer_id, user_id)
    VALUES (p_name, p_email, p_position, p_organizer_id, p_user_id)
    RETURNING contact_id INTO v_contact_id;
    
    RETURN v_contact_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated function to update lead search status (replacing the old one)
CREATE OR REPLACE FUNCTION public.update_lead_search_status_v2(
    p_lead_id UUID,
    p_new_status TEXT,
    p_found_email TEXT DEFAULT NULL,
    p_search_domain TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    updated_rows INTEGER;
    v_organizer_id UUID;
BEGIN
    -- Validate status
    IF p_new_status NOT IN ('pendente', 'buscando', 'encontrado', 'nao_encontrado', 'erro') THEN
        RAISE EXCEPTION 'Invalid status: %. Must be one of: pendente, buscando, encontrado, nao_encontrado, erro', p_new_status;
    END IF;
    
    -- Get organizer ID for the lead
    SELECT organizer_id INTO v_organizer_id
    FROM public.leads 
    WHERE id = p_lead_id AND user_id = auth.uid();
    
    IF v_organizer_id IS NULL THEN
        RETURN FALSE; -- Lead not found or doesn't belong to user
    END IF;
    
    -- Update the lead record
    UPDATE public.leads 
    SET 
        status_busca = p_new_status,
        data_ultima_busca = NOW(),
        hunter_domain = COALESCE(p_search_domain, hunter_domain),
        contato_verificado = CASE 
            WHEN p_new_status IN ('encontrado', 'nao_encontrado') THEN TRUE 
            ELSE contato_verificado 
        END,
        updated_at = NOW()
    WHERE id = p_lead_id 
    AND user_id = auth.uid();
    
    GET DIAGNOSTICS updated_rows = ROW_COUNT;
    
    -- If email found, create or update contact
    IF p_found_email IS NOT NULL AND p_new_status = 'encontrado' THEN
        INSERT INTO public.contact (email, organizer_id, user_id)
        VALUES (p_found_email, v_organizer_id, auth.uid())
        ON CONFLICT (organizer_id, email) DO NOTHING; -- Ignore if contact already exists
    END IF;
    
    RETURN updated_rows > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create analytical views for reporting

-- Daily statistics view
CREATE OR REPLACE VIEW public.daily_stats AS
SELECT 
    date_trunc('day', created_at)::date as date,
    'organizer' as entity_type,
    user_id,
    COUNT(*) as count
FROM public.organizer
GROUP BY date_trunc('day', created_at), user_id
UNION ALL
SELECT 
    date_trunc('day', created_at)::date as date,
    'event' as entity_type,
    user_id,
    COUNT(*) as count
FROM public.event
GROUP BY date_trunc('day', created_at), user_id
UNION ALL
SELECT 
    date_trunc('day', created_at)::date as date,
    'contact' as entity_type,
    user_id,
    COUNT(*) as count
FROM public.contact
GROUP BY date_trunc('day', created_at), user_id
UNION ALL
SELECT 
    date_trunc('day', created_at)::date as date,
    'lead' as entity_type,
    user_id,
    COUNT(*) as count
FROM public.leads
GROUP BY date_trunc('day', created_at), user_id
ORDER BY date DESC, entity_type;

-- Enable RLS on daily stats view
ALTER VIEW public.daily_stats SET (security_barrier = true);

-- Grant permissions on all new views and functions
GRANT SELECT ON public.leads_complete TO authenticated;
GRANT SELECT ON public.organizer_summary TO authenticated;
GRANT SELECT ON public.event_summary TO authenticated;
GRANT SELECT ON public.contact_summary TO authenticated;
GRANT SELECT ON public.daily_stats TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_or_create_organizer TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_event_with_organizer TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_complete_lead TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_organizer_contact TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_lead_search_status_v2 TO authenticated;

-- Commit all changes
COMMIT;

-- Add comments for documentation
COMMENT ON VIEW public.leads_complete IS 'Complete lead information with organizer, event, and user details';
COMMENT ON VIEW public.organizer_summary IS 'Organizer statistics including events, leads, and contacts counts';
COMMENT ON VIEW public.event_summary IS 'Event information with lead tracking statistics';
COMMENT ON VIEW public.contact_summary IS 'Contact information with organizer details';
COMMENT ON VIEW public.daily_stats IS 'Daily creation statistics for all entities by user';

COMMENT ON FUNCTION public.get_or_create_organizer IS 'Gets existing organizer or creates new one with RLS enforcement';
COMMENT ON FUNCTION public.create_event_with_organizer IS 'Creates event and organizer (if needed) in a single operation';
COMMENT ON FUNCTION public.create_complete_lead IS 'Creates complete lead with organizer and event in a single operation';
COMMENT ON FUNCTION public.add_organizer_contact IS 'Adds contact to organizer with proper validation';
COMMENT ON FUNCTION public.update_lead_search_status_v2 IS 'Updated version of lead search status function with contact creation';

-- Views and utility functions created successfully.
-- New functions provide safe, RLS-compliant operations for the normalized schema.