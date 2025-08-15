-- Manual Migration: Add Hunter.io columns to leads table
-- Run this SQL in your Supabase Dashboard

-- Step 1: Add the new columns
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS email_contato TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS contato_verificado BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS data_ultima_busca TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS hunter_domain TEXT,
ADD COLUMN IF NOT EXISTS status_busca TEXT DEFAULT 'pendente';

-- Step 2: Add constraint for valid status values (with proper error handling)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_status_busca_valid' 
        AND table_name = 'leads'
    ) THEN
        ALTER TABLE public.leads 
        ADD CONSTRAINT check_status_busca_valid 
        CHECK (status_busca IN ('pendente', 'buscando', 'encontrado', 'nao_encontrado', 'erro'));
    END IF;
END $$;

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_status_busca ON public.leads(status_busca);
CREATE INDEX IF NOT EXISTS idx_leads_contato_verificado ON public.leads(contato_verificado) WHERE contato_verificado = true;

-- Step 4: Add comments for documentation
COMMENT ON COLUMN public.leads.email_contato IS 'Email address found for the company through Hunter.io API';
COMMENT ON COLUMN public.leads.website IS 'Company website URL discovered through search';
COMMENT ON COLUMN public.leads.contato_verificado IS 'Whether contact information has been searched and verified';
COMMENT ON COLUMN public.leads.data_ultima_busca IS 'Timestamp when contact search was last performed';
COMMENT ON COLUMN public.leads.hunter_domain IS 'Domain used for Hunter.io email search';
COMMENT ON COLUMN public.leads.status_busca IS 'Status of contact search process';

-- Verification query (run this to confirm the migration worked)
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'leads' 
AND column_name IN ('email_contato', 'website', 'contato_verificado', 'data_ultima_busca', 'hunter_domain', 'status_busca')
ORDER BY column_name;