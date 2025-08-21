import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Hunter.io API configuration
const HUNTER_API_KEY = process.env.HUNTER_API_KEY!

interface ContactInfo {
  email: string
  name?: string
  position?: string
  confidence?: number
}

interface ContactSearchResult {
  contacts: ContactInfo[]
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

async function searchHunterIO(domain: string): Promise<{ contacts: ContactInfo[], website: string }> {
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
      const contacts = data.data.emails
        .filter((email: any) => email.value && email.confidence > 40) // Lower threshold to get more contacts
        .map((email: any) => ({
          email: email.value,
          name: email.first_name && email.last_name 
            ? `${email.first_name} ${email.last_name}` 
            : email.first_name || email.last_name || undefined,
          position: email.position || email.department || undefined,
          confidence: email.confidence
        }))
        .slice(0, 5) // Get top 5 contacts
      
      return {
        contacts,
        website: `https://${domain}`
      }
    }

    return { contacts: [], website: `https://${domain}` }
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
        contacts: [],
        success: false,
        error: 'Website not found'
      }
    }

    console.log(`Found website: ${website}`)

    // Step 2: Search Hunter.io for contacts
    const domain = website.replace(/^https?:\/\/(www\.)?/, '')
    const hunterResult = await searchHunterIO(domain)

    console.log(`Found ${hunterResult.contacts.length} contacts for ${companyName}`)

    return {
      contacts: hunterResult.contacts,
      website: hunterResult.website,
      success: true
    }

  } catch (error) {
    console.error('Contact search error:', error)
    return {
      contacts: [],
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

    const foundContacts = contactResult.contacts
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

    // Create contacts if found
    let contactsCreated = 0
    if (foundContacts.length > 0) {
      console.log(`Processing ${foundContacts.length} contacts for organizer ${lead.organizer_id}`)
      
      for (const contact of foundContacts) {
        try {
          // Check if contact with this email already exists
          const { data: existingContact } = await supabase
            .from('contact')
            .select('contact_id')
            .eq('organizer_id', lead.organizer_id)
            .eq('email', contact.email)
            .single()

          if (!existingContact) {
            // Create new contact with all available information
            const { error: insertError } = await supabase
              .from('contact')
              .insert([{
                organizer_id: lead.organizer_id,
                name: contact.name || null,
                email: contact.email,
                position: contact.position || null,
                user_id: userId
              }])
            
            if (!insertError) {
              contactsCreated++
              console.log(`Created contact: ${contact.email} (${contact.name || 'No name'}, ${contact.position || 'No position'})`)
            } else {
              console.error(`Error inserting contact ${contact.email}:`, insertError)
            }
          } else {
            // Update existing contact with additional information if available
            if (contact.name || contact.position) {
              const updateData: any = {}
              const existingContactData = existingContact as any
              if (contact.name && !existingContactData.name) updateData.name = contact.name
              if (contact.position && !existingContactData.position) updateData.position = contact.position
              
              if (Object.keys(updateData).length > 0) {
                await supabase
                  .from('contact')
                  .update(updateData)
                  .eq('contact_id', existingContact.contact_id)
                console.log(`Updated existing contact ${contact.email} with additional info`)
              }
            }
          }
        } catch (contactError) {
          console.error(`Error processing contact ${contact.email}:`, contactError)
          // Continue with next contact
        }
      }
      
      console.log(`Created ${contactsCreated} new contacts out of ${foundContacts.length} found`)
    }

    // Update lead search status using new function
    const hasContacts = foundContacts.length > 0
    const primaryEmail = hasContacts ? foundContacts[0].email : null
    
    try {
      const { error: funcError } = await supabase.rpc('update_lead_search_status_v2', {
        p_lead_id: leadId,
        p_new_status: hasContacts || foundWebsite ? 'encontrado' : 'nao_encontrado',
        p_found_email: primaryEmail,
        p_search_domain: searchDomain
      })

      if (funcError) {
        console.error('Database function failed, using fallback:', funcError)
        
        // Fallback to direct update
        await supabase
          .from('leads')
          .update({
            status_busca: hasContacts || foundWebsite ? 'encontrado' : 'nao_encontrado',
            data_ultima_busca: new Date().toISOString(),
            hunter_domain: searchDomain,
            contato_verificado: hasContacts
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
      contacts: foundContacts,
      contactsCreated,
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