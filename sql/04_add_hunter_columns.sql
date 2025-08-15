-- Migration: Add Hunter.io contact discovery columns to leads table
-- This migration adds columns to support contact information discovery
-- via Hunter.io API integration for lead prospecting

-- Add new columns for Hunter.io integration
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS email_contato TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS contato_verificado BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS data_ultima_busca TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS hunter_domain TEXT,
ADD COLUMN IF NOT EXISTS status_busca TEXT DEFAULT 'pendente';

-- Add check constraint for status_busca to ensure valid values
ALTER TABLE public.leads 
ADD CONSTRAINT IF NOT EXISTS check_status_busca_valid 
CHECK (status_busca IN ('pendente', 'buscando', 'encontrado', 'nao_encontrado', 'erro'));

-- Create indexes for performance optimization on new columns

-- Index on contato_verificado for filtering verified contacts
CREATE INDEX IF NOT EXISTS idx_leads_contato_verificado 
ON public.leads(contato_verificado) WHERE contato_verificado = true;

-- Index on status_busca for filtering by search status
CREATE INDEX IF NOT EXISTS idx_leads_status_busca 
ON public.leads(status_busca);

-- Index on data_ultima_busca for finding stale contacts that need re-searching
CREATE INDEX IF NOT EXISTS idx_leads_data_ultima_busca 
ON public.leads(data_ultima_busca DESC) WHERE data_ultima_busca IS NOT NULL;

-- Composite index for finding pending searches by user
CREATE INDEX IF NOT EXISTS idx_leads_user_status_busca 
ON public.leads(user_id, status_busca) WHERE status_busca = 'pendente';

-- Index on hunter_domain for domain-based lookups
CREATE INDEX IF NOT EXISTS idx_leads_hunter_domain 
ON public.leads(hunter_domain) WHERE hunter_domain IS NOT NULL;

-- Add comments for documentation on new columns
COMMENT ON COLUMN public.leads.email_contato IS 'Email address found for the company through Hunter.io API';
COMMENT ON COLUMN public.leads.website IS 'Company website URL discovered through search';
COMMENT ON COLUMN public.leads.contato_verificado IS 'Whether contact information has been searched and verified';
COMMENT ON COLUMN public.leads.data_ultima_busca IS 'Timestamp when contact search was last performed';
COMMENT ON COLUMN public.leads.hunter_domain IS 'Domain used for Hunter.io email search';
COMMENT ON COLUMN public.leads.status_busca IS 'Status of contact search process (pendente, buscando, encontrado, nao_encontrado, erro)';

-- Update the leads_with_user view to include new columns
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
    -- New Hunter.io columns
    l.email_contato,
    l.website,
    l.contato_verificado,
    l.data_ultima_busca,
    l.hunter_domain,
    l.status_busca,
    -- User information
    p.email as user_email,
    p.full_name as user_full_name
FROM public.leads l
LEFT JOIN public.profiles p ON l.user_id = p.id;

-- Ensure RLS is still enabled on the updated view
ALTER VIEW public.leads_with_user SET (security_barrier = true);

-- Create a utility function to update search status
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
    -- Validate status
    IF new_status NOT IN ('pendente', 'buscando', 'encontrado', 'nao_encontrado', 'erro') THEN
        RAISE EXCEPTION 'Invalid status: %. Must be one of: pendente, buscando, encontrado, nao_encontrado, erro', new_status;
    END IF;
    
    -- Update the lead record
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
    AND user_id = auth.uid(); -- Ensure RLS compliance
    
    GET DIAGNOSTICS updated_rows = ROW_COUNT;
    
    RETURN updated_rows > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the utility function
GRANT EXECUTE ON FUNCTION public.update_lead_search_status TO authenticated;

-- Add comment on the utility function
COMMENT ON FUNCTION public.update_lead_search_status IS 'Updates lead search status and contact information with proper RLS enforcement';

-- Create a view for leads that need contact discovery
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

-- Enable RLS on the new view
ALTER VIEW public.leads_pending_contact_search SET (security_barrier = true);

-- Grant permissions on the new view
GRANT SELECT ON public.leads_pending_contact_search TO authenticated;

-- Add comment on the view
COMMENT ON VIEW public.leads_pending_contact_search IS 'View of leads that need contact information discovery or retry after errors';