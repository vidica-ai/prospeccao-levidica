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

      // Extract structured data from JSON-LD if available
      const jsonLdData = this.extractJsonLdData($)
      if (jsonLdData) {
        return this.parseJsonLdData(jsonLdData, url)
      }

      // Fallback to HTML scraping
      return this.scrapeHtmlData($, url)

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
    
    // Extract location information
    let location = 'Online Event'
    if (jsonData.location) {
      if (typeof jsonData.location === 'string') {
        location = jsonData.location
      } else if (jsonData.location.name) {
        location = jsonData.location.name
        if (jsonData.location.address) {
          const address = typeof jsonData.location.address === 'string' 
            ? jsonData.location.address 
            : `${jsonData.location.address.streetAddress || ''}, ${jsonData.location.address.addressLocality || ''}, ${jsonData.location.address.addressRegion || ''}`
          location += `, ${address}`
        }
      }
    }

    // Extract organizer information
    let organizerName = 'Unknown Organizer'
    let organizerWebsite = undefined
    
    if (jsonData.organizer) {
      if (typeof jsonData.organizer === 'string') {
        organizerName = jsonData.organizer
      } else if (jsonData.organizer.name) {
        organizerName = jsonData.organizer.name
        organizerWebsite = jsonData.organizer.url || jsonData.organizer.sameAs?.[0]
      }
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
                      $('.event-title').text().trim() ||
                      $('h1').first().text().trim() ||
                      'Unnamed Event'

    // Extract event date
    const dateElement = $('[data-automation="event-date-time"]').text().trim() ||
                       $('.event-date').text().trim() ||
                       $('[class*="date"]').first().text().trim()
    
    // Extract location
    const locationElement = $('[data-automation="event-location"]').text().trim() ||
                           $('.event-location').text().trim() ||
                           $('[class*="location"]').first().text().trim() ||
                           'Local não informado'

    // Extract organizer name - this might be tricky on Eventbrite
    const organizerElement = $('.organizer-name').text().trim() ||
                            $('[data-automation="organizer-name"]').text().trim() ||
                            $('.event-organizer').text().trim() ||
                            'Organizador não informado'

    // Extract description
    const description = $('.event-description').text().trim() ||
                       $('[data-automation="event-description"]').text().trim() ||
                       $('.description').text().trim()

    return {
      nome_evento: eventTitle,
      data_evento: this.parseHtmlDate(dateElement),
      local: locationElement,
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