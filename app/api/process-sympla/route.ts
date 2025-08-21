import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { chromium } from 'playwright'
import { EventbriteScraper } from '@/lib/eventbrite-scraper'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

interface EventData {
  nome_evento: string
  data_evento: string
  local: string
  produtor: string
  sympla_url: string
  eventbrite_url?: string
  website?: string
  organizer_name?: string
}

// Create complete lead using the database function
async function createCompleteLeadWithFallback(eventData: EventData, userId: string): Promise<{ data: string | null; error: any }> {
  // Try to use the database function first
  const eventUrl = eventData.sympla_url || eventData.eventbrite_url || ''
  const organizerName = eventData.organizer_name || eventData.produtor
  
  const { data, error } = await supabase.rpc('create_complete_lead', {
    p_nome_evento: eventData.nome_evento,
    p_data_evento: eventData.data_evento,
    p_local: eventData.local,
    p_sympla_url: eventUrl,
    p_organizer_name: organizerName,
    p_organizer_website: eventData.website || null,
    p_contact_name: null,
    p_contact_email: null,
    p_contact_position: null,
    p_user_id: userId
  })

  if (!error) {
    return { data, error }
  }

  console.warn('Database function failed, using fallback:', error)

  // Fallback: Manual implementation
  try {
    // Get or create organizer
    const { data: organizerId, error: organizerError } = await supabase.rpc('get_or_create_organizer', {
      p_name: organizerName,
      p_website: eventData.website || null,
      p_user_id: userId
    })

    if (organizerError || !organizerId) {
      return { data: null, error: organizerError || { message: 'Failed to create organizer' } }
    }

    // Create event
    const { data: newEvent, error: eventError } = await supabase
      .from('event')
      .insert([{
        nome_evento: eventData.nome_evento,
        data_evento: eventData.data_evento,
        local: eventData.local,
        sympla_url: eventUrl,
        organizer_id: organizerId,
        user_id: userId
      }])
      .select()
      .single()

    if (eventError) {
      return { data: null, error: eventError }
    }

    // Create lead
    const { data: newLead, error: leadError } = await supabase
      .from('leads')
      .insert([{
        organizer_id: organizerId,
        event_id: newEvent.event_id,
        user_id: userId,
        contato_verificado: false,
        status_busca: 'pendente' as const
      }])
      .select()
      .single()

    if (leadError) {
      return { data: null, error: leadError }
    }

    return { data: newLead.id, error: null }
  } catch (fallbackError) {
    return { data: null, error: fallbackError }
  }
}

async function extractEventDataFromSymplaPage(url: string): Promise<EventData | null> {
  // First try direct fetch approach
  try {
    console.log(`Attempting to fetch: ${url}`)
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      }
    })

    if (response.ok) {
      const html = await response.text()
      console.log(`Direct fetch successful for: ${url}`)
      return await extractWithOpenAI(html, url)
    } else {
      console.log(`Direct fetch failed with status ${response.status}, trying browser...`)
    }
  } catch (error) {
    console.log(`Direct fetch failed, trying browser for: ${url}`, error)
  }

  // Fallback to browser automation
  let browser = null
  
  try {
    console.log(`Launching browser for: ${url}`)
    
    // Launch browser with stealth settings to avoid detection
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-dev-shm-usage',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-gpu',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ]
    })
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'pt-BR'
    })
    
    const page = await context.newPage()
    
    // Set additional headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8'
    })
    
    // Navigate to the page with longer timeout
    console.log(`Navigating to: ${url}`)
    await page.goto(url, { 
      waitUntil: 'domcontentloaded', 
      timeout: 45000 
    })
    
    // Wait for content to load
    await page.waitForTimeout(5000)
    
    // Try to wait for specific elements that might indicate the page loaded
    try {
      await page.waitForSelector('h1, .event-title, [data-testid*="title"]', { timeout: 10000 })
    } catch (e) {
      console.log('Could not find title selector, proceeding anyway')
    }
    
    // Get the page content
    const content = await page.content()
    console.log(`Content length: ${content.length} chars`)
    
    await browser.close()
    
    // Use OpenAI to extract the information
    const eventData = await extractWithOpenAI(content, url)
    return eventData
    
  } catch (error) {
    console.error('Error extracting data from Sympla:', error)
    if (browser) {
      await browser.close()
    }
    return null
  }
}

async function extractWithOpenAI(htmlContent: string, url: string): Promise<EventData | null> {
  try {
    const prompt = `
You are analyzing a Sympla event page to extract event information. Sympla is a Brazilian event platform.

Extract the following information from this HTML content and return ONLY valid JSON:

Required fields:
- nome_evento: The event name/title (look for h1, title tags, or event name elements)
- data_evento: The event date (keep original Portuguese format like "22 out - 2025", "15-16 nov 2024", etc.)
- local: The event location (city, state, venue name - combine if available)
- produtor: The event producer/organizer/company name

CRITICAL: FINDING THE PRODUCER/ORGANIZER:
The producer information on Sympla pages is ALWAYS in a section titled "Sobre o produtor".

SPECIFIC INSTRUCTIONS FOR PRODUCER:
1. Look for the exact text "Sobre o produtor" in the HTML
2. The producer name will be immediately after this section in a <p> tag with class containing "kPySeH" or similar
3. Look for HTML patterns like: <p class="sc-224a3358-4 kPySeH">PRODUCER_NAME</p>
4. It's typically the company/organization name, not a person's name
5. Examples: "IBDiC", "IDP", "CBF Academy", "Câmara de Comércio Brasil-Canadá", etc.
6. This is the most important field - spend extra effort finding it
7. The producer name is usually the first <p> tag after the "Sobre o produtor" heading
8. Do NOT use venue names or location names as the producer
9. Look specifically for text patterns like "Câmara de Comércio", "Instituto", "Academia", company names

SEARCH PATTERN:
- Find "Sobre o produtor" text in HTML
- Look for the next <p> tag with producer name
- Extract the company/organization name from that paragraph
- Use that as the "produtor" field

HTML PARSING TIPS:
- The producer name is typically in a paragraph tag immediately following the "Sobre o produtor" section
- Look for patterns like: <h3>Sobre o produtor</h3>....<p class="...">PRODUCER_NAME</p>
- The producer text is usually the main company/organization name in that section

Rules:
1. Look for Portuguese text and Brazilian date formats
2. Event names are usually in h1 tags or prominent headings
3. Dates might be in time elements, date classes, or near calendar icons
4. Location might include venue name + city/state
5. PRIORITIZE finding the actual organizing company name (not venue names)
6. Return valid JSON only, no extra text
7. If a field is not found, use "Não informado"

Example output for different events:
{
  "nome_evento": "XIII Congresso Internacional IBDiC 2025",
  "data_evento": "22 out - 2025", 
  "local": "São Paulo, SP",
  "produtor": "IBDiC"
}

Example for Canada-Brazil chamber event:
{
  "nome_evento": "Summit Brasil-Canadá 2025",
  "data_evento": "15 mar - 2025",
  "local": "São Paulo, SP", 
  "produtor": "Câmara de Comércio Brasil-Canadá"
}

Another example:
{
  "nome_evento": "Summit CBF Academy 2025",
  "data_evento": "15 mar - 2025",
  "local": "Rio de Janeiro, RJ", 
  "produtor": "IDP"
}

HTML Content (first 50000 chars, focusing on producer section):
${htmlContent.substring(0, 50000)}
`

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert at extracting event information from HTML pages. Always return valid JSON with the requested fields."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 500
    })

    const result = response.choices[0]?.message?.content
    if (!result) {
      throw new Error('No response from OpenAI')
    }

    // Clean the result by removing markdown code blocks if present
    let cleanedResult = result.trim()
    if (cleanedResult.startsWith('```json')) {
      cleanedResult = cleanedResult.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (cleanedResult.startsWith('```')) {
      cleanedResult = cleanedResult.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }

    console.log('Raw OpenAI response:', result.substring(0, 500))
    console.log('Cleaned result:', cleanedResult.substring(0, 500))

    // Parse the JSON response
    const eventData = JSON.parse(cleanedResult)
    
    // Add the URL to the response
    eventData.sympla_url = url
    
    return eventData as EventData

  } catch (error) {
    console.error('Error with OpenAI extraction:', error)
    return null
  }
}

async function extractEventDataFromEventbrite(url: string): Promise<EventData | null> {
  try {
    console.log(`Extracting Eventbrite data from: ${url}`)
    
    const eventbriteData = await EventbriteScraper.fetchEventData(url)
    
    // Convert Eventbrite data to our EventData format
    const eventData: EventData = {
      nome_evento: eventbriteData.nome_evento,
      data_evento: eventbriteData.data_evento,
      local: eventbriteData.local,
      produtor: eventbriteData.organizer_name,
      sympla_url: '', // Will be set to eventbrite_url
      eventbrite_url: eventbriteData.eventbrite_url,
      website: eventbriteData.website,
      organizer_name: eventbriteData.organizer_name
    }
    
    return eventData
    
  } catch (error) {
    console.error('Error extracting Eventbrite data:', error)
    return null
  }
}

function isEventbriteUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.includes('eventbrite.com') || urlObj.hostname.includes('eventbrite.co.uk')
  } catch {
    return false
  }
}

function isSymplaUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.includes('sympla.com.br')
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { links, userId } = body

    if (!links || !Array.isArray(links) || links.length === 0) {
      return NextResponse.json(
        { error: 'Links array is required' },
        { status: 400 }
      )
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const results = []
    const errors = []

    // Process each link
    for (const link of links) {
      const trimmedLink = link.trim()
      
      if (!trimmedLink) continue
      
      // Validate URL (Sympla or Eventbrite)
      const isSympa = isSymplaUrl(trimmedLink)
      const isEventbrite = isEventbriteUrl(trimmedLink)
      
      if (!isSympa && !isEventbrite) {
        errors.push(`Invalid URL (must be Sympla or Eventbrite): ${trimmedLink}`)
        continue
      }

      try {
        // Check if this URL already exists for this user (check in event table)
        const { data: existingEvent } = await supabase
          .from('event')
          .select('event_id')
          .eq('sympla_url', trimmedLink)
          .eq('user_id', userId)
          .single()

        if (existingEvent) {
          errors.push(`URL already exists: ${trimmedLink}`)
          continue
        }

        // Extract event data based on platform
        let eventData: EventData | null = null
        
        if (isSympa) {
          eventData = await extractEventDataFromSymplaPage(trimmedLink)
        } else if (isEventbrite) {
          eventData = await extractEventDataFromEventbrite(trimmedLink)
        }
        
        if (!eventData) {
          errors.push(`Failed to extract data from: ${trimmedLink}`)
          continue
        }

        // Create complete lead using normalized structure
        const { data: leadId, error: saveError } = await createCompleteLeadWithFallback(eventData, userId)

        if (saveError || !leadId) {
          errors.push(`Failed to save data for: ${trimmedLink} - ${saveError?.message || 'Unknown error'}`)
          continue
        }

        // Get the complete lead data for response
        const { data: completeLead } = await supabase
          .from('leads_complete')
          .select('*')
          .eq('id', leadId)
          .single()

        results.push(completeLead || { id: leadId, ...eventData })
        
      } catch (error) {
        console.error(`Error processing ${trimmedLink}:`, error)
        errors.push(`Error processing: ${trimmedLink}`)
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}