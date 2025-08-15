import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Hunter.io API configuration
const HUNTER_API_KEY = process.env.HUNTER_API_KEY!

interface ContactSearchResult {
  email?: string
  website?: string
  success: boolean
  error?: string
}

async function searchGoogleForWebsite(companyName: string): Promise<string | null> {
  try {
    // This is a simplified Google search simulation
    // In production, you might want to use Google Custom Search API
    // For now, we'll try common website patterns
    const cleanCompanyName = companyName.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '')
    
    const possibleDomains = [
      `${cleanCompanyName}.com.br`,
      `${cleanCompanyName}.com`,
      `www.${cleanCompanyName}.com.br`,
      `www.${cleanCompanyName}.com`
    ]
    
    // Try to validate domains by checking if they exist
    for (const domain of possibleDomains) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)
        
        const response = await fetch(`https://${domain}`, {
          method: 'HEAD',
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        
        if (response.ok) {
          return domain
        }
      } catch {
        // Continue to next domain
      }
    }
    
    return null
  } catch (error) {
    console.error('Error searching for website:', error)
    return null
  }
}

async function searchHunterIO(domain: string): Promise<{ emails: string[], website: string }> {
  try {
    const response = await fetch(
      `https://api.hunter.io/v2/domain-search?domain=${domain}&api_key=${HUNTER_API_KEY}&limit=10`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      }
    )

    if (!response.ok) {
      throw new Error(`Hunter.io API error: ${response.status}`)
    }

    const data = await response.json()
    
    if (data.data && data.data.emails) {
      const emails = data.data.emails
        .filter((email: any) => email.value && email.confidence > 50)
        .map((email: any) => email.value)
        .slice(0, 3) // Get top 3 emails
      
      return {
        emails,
        website: `https://${domain}`
      }
    }

    return { emails: [], website: `https://${domain}` }
  } catch (error) {
    console.error('Hunter.io search error:', error)
    throw error
  }
}

async function findContactInfo(companyName: string): Promise<ContactSearchResult> {
  try {
    // Step 1: Search for company website
    console.log(`Searching website for: ${companyName}`)
    const website = await searchGoogleForWebsite(companyName)
    
    if (!website) {
      return {
        success: false,
        error: 'Website not found'
      }
    }

    console.log(`Found website: ${website}`)

    // Step 2: Search Hunter.io for emails
    const domain = website.replace(/^https?:\/\/(www\.)?/, '')
    const hunterResult = await searchHunterIO(domain)

    return {
      email: hunterResult.emails[0] || undefined, // Get the first/best email
      website: hunterResult.website,
      success: true
    }

  } catch (error) {
    console.error('Contact search error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = authHeader.replace('Bearer ', '')
    const body = await request.json()
    const { leadId, companyName } = body

    if (!leadId || !companyName) {
      return NextResponse.json(
        { error: 'Lead ID and company name are required' },
        { status: 400 }
      )
    }

    // Verify the lead belongs to the user and get related data
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id, organizer_id, event_id, user_id')
      .eq('id', leadId)
      .eq('user_id', userId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json(
        { error: 'Lead not found or unauthorized' },
        { status: 404 }
      )
    }

    // Search for contact information
    const contactResult = await findContactInfo(companyName)

    if (!contactResult.success) {
      // Update lead with error status using new function if available
      try {
        const { error: funcError } = await supabase.rpc('update_lead_search_status_v2', {
          p_lead_id: leadId,
          p_new_status: 'erro',
          p_found_email: null,
          p_search_domain: null
        })

        if (funcError) {
          // Fallback to direct update
          await supabase
            .from('leads')
            .update({
              status_busca: 'erro',
              data_ultima_busca: new Date().toISOString()
            })
            .eq('id', leadId)
        }
      } catch (error) {
        // Fallback to direct update
        await supabase
          .from('leads')
          .update({
            status_busca: 'erro',
            data_ultima_busca: new Date().toISOString()
          })
          .eq('id', leadId)
      }

      return NextResponse.json({
        success: false,
        error: contactResult.error
      })
    }

    const foundEmail = contactResult.email
    const foundWebsite = contactResult.website
    const searchDomain = foundWebsite ? foundWebsite.replace(/^https?:\/\/(www\.)?/, '') : null

    // Update organizer with website if found and not already set
    if (foundWebsite) {
      const { data: organizer } = await supabase
        .from('organizer')
        .select('website')
        .eq('organizer_id', lead.organizer_id)
        .single()

      if (organizer && !organizer.website) {
        await supabase
          .from('organizer')
          .update({ website: foundWebsite })
          .eq('organizer_id', lead.organizer_id)
      }
    }

    // Create contact if email found
    if (foundEmail) {
      try {
        // Check if contact with this email already exists
        const { data: existingContact } = await supabase
          .from('contact')
          .select('contact_id')
          .eq('organizer_id', lead.organizer_id)
          .eq('email', foundEmail)
          .single()

        if (!existingContact) {
          // Create new contact
          await supabase
            .from('contact')
            .insert([{
              organizer_id: lead.organizer_id,
              name: null,
              email: foundEmail,
              position: null,
              user_id: userId
            }])
        }
      } catch (contactError) {
        console.error('Error creating contact:', contactError)
        // Continue with lead update even if contact creation fails
      }
    }

    // Update lead search status using new function
    try {
      const { error: funcError } = await supabase.rpc('update_lead_search_status_v2', {
        p_lead_id: leadId,
        p_new_status: foundEmail || foundWebsite ? 'encontrado' : 'nao_encontrado',
        p_found_email: foundEmail || null,
        p_search_domain: searchDomain
      })

      if (funcError) {
        console.error('Database function failed, using fallback:', funcError)
        
        // Fallback to direct update
        await supabase
          .from('leads')
          .update({
            status_busca: foundEmail || foundWebsite ? 'encontrado' : 'nao_encontrado',
            data_ultima_busca: new Date().toISOString(),
            hunter_domain: searchDomain,
            contato_verificado: foundEmail ? true : false
          })
          .eq('id', leadId)
      }
    } catch (error) {
      console.error('Error updating lead search status:', error)
      return NextResponse.json(
        { error: 'Failed to update lead search status' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      email: foundEmail,
      website: foundWebsite,
      searchDomain: searchDomain
    })

  } catch (error) {
    console.error('Enhance contacts API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}