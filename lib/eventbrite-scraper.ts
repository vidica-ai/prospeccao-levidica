import * as cheerio from 'cheerio'

export interface EventbriteEventData {
  nome_evento: string
  data_evento: string
  local: string
  organizer_name: string
  website?: string
  eventbrite_url: string
  description?: string
  start_time?: string
  end_time?: string
  timezone?: string
}

export class EventbriteScraper {
  static async fetchEventData(url: string): Promise<EventbriteEventData> {
    try {
      // Validate Eventbrite URL
      if (!this.isEventbriteUrl(url)) {
        throw new Error('Invalid Eventbrite URL')
      }

      console.log(`[EventbriteScraper] Fetching data from: ${url}`)

      // Fetch the page content
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch Eventbrite page: ${response.status}`)
      }

      const html = await response.text()
      const $ = cheerio.load(html)

      console.log(`[EventbriteScraper] Page content loaded, length: ${html.length} chars`)

      // Extract structured data from JSON-LD if available
      const jsonLdData = this.extractJsonLdData($)
      if (jsonLdData) {
        console.log('[EventbriteScraper] Using JSON-LD structured data')
        const result = this.parseJsonLdData(jsonLdData, url)
        console.log('[EventbriteScraper] Extracted data:', {
          event: result.nome_evento,
          location: result.local,
          organizer: result.organizer_name,
          date: result.data_evento
        })
        return result
      }

      console.log('[EventbriteScraper] No JSON-LD found, falling back to HTML scraping')
      // Fallback to HTML scraping
      const result = this.scrapeHtmlData($, url)
      console.log('[EventbriteScraper] Extracted data:', {
        event: result.nome_evento,
        location: result.local,
        organizer: result.organizer_name,
        date: result.data_evento
      })
      return result

    } catch (error) {
      console.error('Error scraping Eventbrite event:', error)
      throw new Error(`Failed to extract event data: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private static isEventbriteUrl(url: string): boolean {
    try {
      const urlObj = new URL(url)
      return urlObj.hostname.includes('eventbrite.com') || urlObj.hostname.includes('eventbrite.co.uk')
    } catch {
      return false
    }
  }

  private static extractJsonLdData($: cheerio.CheerioAPI): any {
    // Look for JSON-LD structured data
    const jsonLdScripts = $('script[type="application/ld+json"]')
    
    for (let i = 0; i < jsonLdScripts.length; i++) {
      try {
        const jsonText = $(jsonLdScripts[i]).html()
        if (jsonText) {
          const jsonData = JSON.parse(jsonText)
          if (jsonData['@type'] === 'Event' || (Array.isArray(jsonData) && jsonData.some(item => item['@type'] === 'Event'))) {
            return Array.isArray(jsonData) ? jsonData.find(item => item['@type'] === 'Event') : jsonData
          }
        }
      } catch (error) {
        console.warn('Failed to parse JSON-LD data:', error)
      }
    }
    
    return null
  }

  private static parseJsonLdData(jsonData: any, url: string): EventbriteEventData {
    const startDate = jsonData.startDate ? new Date(jsonData.startDate) : null
    const endDate = jsonData.endDate ? new Date(jsonData.endDate) : null
    
    // Extract location information - prioritize venue name
    let location = 'Local não informado'
    if (jsonData.location) {
      if (typeof jsonData.location === 'string') {
        location = jsonData.location
      } else if (jsonData.location.name) {
        // Use venue name as primary location (e.g., "Renaissance São Paulo Hotel")
        location = jsonData.location.name
        
        // Optionally add city/state if venue name doesn't include it
        if (jsonData.location.address) {
          const address = jsonData.location.address
          const locality = address.addressLocality || ''
          const region = address.addressRegion || ''
          
          // Only add city/state if venue name doesn't already contain location info
          if (locality && !location.toLowerCase().includes(locality.toLowerCase())) {
            location += `, ${locality}`
            if (region && region !== locality) {
              location += `, ${region}`
            }
          }
        }
      } else if (jsonData.location.address) {
        // Fallback to address if no venue name
        const address = jsonData.location.address
        if (typeof address === 'string') {
          location = address
        } else {
          const parts = [
            address.streetAddress,
            address.addressLocality,
            address.addressRegion
          ].filter(Boolean)
          location = parts.join(', ')
        }
      }
    }

    // Extract organizer information
    let organizerName = 'Organizador não informado'
    let organizerWebsite = undefined
    
    if (jsonData.organizer) {
      if (typeof jsonData.organizer === 'string') {
        organizerName = jsonData.organizer
      } else if (Array.isArray(jsonData.organizer)) {
        // Sometimes organizer is an array, take the first one
        const firstOrganizer = jsonData.organizer[0]
        if (typeof firstOrganizer === 'string') {
          organizerName = firstOrganizer
        } else if (firstOrganizer.name) {
          organizerName = firstOrganizer.name
          organizerWebsite = firstOrganizer.url || firstOrganizer.sameAs?.[0]
        }
      } else if (jsonData.organizer.name) {
        organizerName = jsonData.organizer.name
        organizerWebsite = jsonData.organizer.url || jsonData.organizer.sameAs?.[0]
      }
    }
    
    // Clean organizer name
    if (organizerName) {
      organizerName = organizerName
        .replace(/^(by\s+|organizado por\s+|organized by\s+)/i, '')
        .replace(/\s+presents?$/i, '')
        .trim()
    }

    return {
      nome_evento: jsonData.name || 'Unnamed Event',
      data_evento: startDate ? this.formatDate(startDate) : 'Data não informada',
      local: location,
      organizer_name: organizerName,
      website: organizerWebsite,
      eventbrite_url: url,
      description: jsonData.description,
      start_time: startDate ? startDate.toISOString() : undefined,
      end_time: endDate ? endDate.toISOString() : undefined,
      timezone: jsonData.startDate ? this.extractTimezone(jsonData.startDate) : undefined
    }
  }

  private static scrapeHtmlData($: cheerio.CheerioAPI, url: string): EventbriteEventData {
    // Extract event title
    const eventTitle = $('h1[data-automation="event-title"]').text().trim() ||
                      $('.eds-event-title').text().trim() ||
                      $('h1').first().text().trim() ||
                      'Unnamed Event'

    // Extract event date - look for Eventbrite's specific date selectors
    const dateElement = $('.eds-event-date-details').text().trim() ||
                       $('[data-automation="event-date-time"]').text().trim() ||
                       $('.event-date').text().trim() ||
                       $('[class*="date"]').first().text().trim()
    
    // Extract location - improved to find venue name specifically
    let locationElement = ''
    
    // First try to find location section with "Location" header
    const locationSection = $('h3').filter((i, el) => $(el).text().toLowerCase().includes('location')).next()
    if (locationSection.length > 0) {
      locationElement = locationSection.text().trim()
    }
    
    // Alternative selectors for location
    if (!locationElement) {
      locationElement = $('[data-automation="event-location"]').text().trim() ||
                       $('.eds-text--left').filter((i, el) => {
                         const text = $(el).text()
                         return text.includes('Hotel') || text.includes('Centro') || text.includes('Alameda') || text.includes('Rua')
                       }).first().text().trim() ||
                       $('.event-location').text().trim() ||
                       'Local não informado'
    }

    // Extract organizer name - improved logic
    let organizerElement = ''
    
    // Primary method: Look for "Organized by" pattern and extract the organizer link/text after it
    const organizedByElements = $('*:contains("Organized by")').filter((i, el) => {
      const text = $(el).text().trim()
      return text.startsWith('Organized by') || text === 'Organized by'
    })
    
    if (organizedByElements.length > 0) {
      // Get the last (most specific) element containing "Organized by"
      const organizedByEl = organizedByElements.last()
      
      // Look for a link right after or within the parent element
      const parentEl = organizedByEl.parent()
      const organizerLink = parentEl.find('a').first()
      
      if (organizerLink.length > 0) {
        organizerElement = organizerLink.text().trim()
      } else {
        // Try next sibling
        const nextEl = organizedByEl.next()
        if (nextEl.length > 0) {
          // Check if next element is a link
          if (nextEl.is('a')) {
            organizerElement = nextEl.text().trim()
          } else {
            // Check for link within next element
            const linkWithin = nextEl.find('a').first()
            if (linkWithin.length > 0) {
              organizerElement = linkWithin.text().trim()
            } else {
              organizerElement = nextEl.text().trim()
            }
          }
        }
      }
      
      // If still not found, try to extract from parent's text
      if (!organizerElement) {
        const fullText = parentEl.text().trim()
        const match = fullText.match(/Organized by\s+(.+?)(?:\n|$)/i)
        if (match) {
          organizerElement = match[1].trim()
        }
      }
    }
    
    // Fallback: Try alternative selectors
    if (!organizerElement) {
      // Look for elements that commonly contain organizer info
      organizerElement = $('a[href*="/o/"]').first().text().trim() || // Organizer profile links
                        $('.eds-text-color--primary-brand').text().trim() ||
                        $('.organizer-name').text().trim() ||
                        $('[data-automation="organizer-name"]').text().trim() ||
                        $('.event-organizer').text().trim()
    }
    
    // Clean up organizer name - remove common prefixes/suffixes
    if (organizerElement) {
      organizerElement = organizerElement
        .replace(/^(by\s+|organizado por\s+|organized by\s+)/i, '')
        .replace(/\s+presents?$/i, '')
        .replace(/Follow$/, '') // Remove "Follow" if it appears at the end
        .trim()
    }
    
    if (!organizerElement) {
      organizerElement = 'Organizador não informado'
    }

    // Extract description
    const description = $('.event-description').text().trim() ||
                       $('[data-automation="event-description"]').text().trim() ||
                       $('.eds-text--left').filter((i, el) => {
                         const text = $(el).text()
                         return text.length > 50 && text.length < 1000 // Reasonable description length
                       }).first().text().trim() ||
                       $('.description').text().trim()

    // Clean location text - extract just the venue name if it's too long
    let cleanLocation = locationElement
    if (cleanLocation.length > 100) {
      // Try to extract just the venue name (usually the first line or before the address)
      const lines = cleanLocation.split('\n').map(line => line.trim()).filter(line => line.length > 0)
      if (lines.length > 0) {
        cleanLocation = lines[0] // Take the first line which is usually the venue name
      }
    }

    return {
      nome_evento: eventTitle,
      data_evento: this.parseHtmlDate(dateElement),
      local: cleanLocation || 'Local não informado',
      organizer_name: organizerElement,
      eventbrite_url: url,
      description: description || undefined
    }
  }

  private static parseHtmlDate(dateText: string): string {
    if (!dateText) return 'Data não informada'
    
    // Try to extract date patterns from Eventbrite date strings
    const datePatterns = [
      /(\w+),\s+(\w+)\s+(\d+),\s+(\d+)/i, // "Tuesday, November 4, 2025"
      /(\w+)\s+(\d+),\s+(\d+)/i,          // "November 4, 2025"
      /(\d+)\/(\d+)\/(\d+)/,              // "11/04/2025"
      /(\d+)-(\d+)-(\d+)/                 // "2025-11-04"
    ]

    for (const pattern of datePatterns) {
      const match = dateText.match(pattern)
      if (match) {
        try {
          const date = new Date(dateText)
          if (!isNaN(date.getTime())) {
            return this.formatDate(date)
          }
        } catch {
          // Continue to next pattern
        }
      }
    }

    return dateText // Return original text if parsing fails
  }

  private static formatDate(date: Date): string {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  private static extractTimezone(dateString: string): string | undefined {
    const timezonePatterns = [
      /([A-Z]{3,4})/,           // UTC, PST, EST, etc.
      /(GMT[+-]\d{1,2})/,       // GMT+3, GMT-5
      /([+-]\d{2}:\d{2})/       // +03:00, -05:00
    ]

    for (const pattern of timezonePatterns) {
      const match = dateString.match(pattern)
      if (match) {
        return match[1]
      }
    }

    return undefined
  }

  static extractEventIdFromUrl(url: string): string | null {
    try {
      // Eventbrite URLs typically have format: https://www.eventbrite.com/e/event-name-tickets-{id}
      const match = url.match(/\/e\/[^\/]*-(\d+)/i)
      return match ? match[1] : null
    } catch {
      return null
    }
  }

  static isValidEventbriteUrl(url: string): boolean {
    return this.isEventbriteUrl(url) && this.extractEventIdFromUrl(url) !== null
  }
}