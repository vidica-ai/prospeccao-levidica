const { EventbriteScraper } = require('../lib/eventbrite-scraper.ts')

async function testEventbriteScraper() {
  const testUrl = 'https://www.eventbrite.com/e/brazil-africa-forum-2025-tickets-1323620337059?aff=ebdssbdestsearch&keep_tld=1'
  
  console.log('Testing Eventbrite Scraper with URL:', testUrl)
  console.log('----------------------------------------')
  
  try {
    const eventData = await EventbriteScraper.fetchEventData(testUrl)
    
    console.log('✅ Event Data Extracted:')
    console.log('Event Name:', eventData.nome_evento)
    console.log('Date:', eventData.data_evento)
    console.log('Location:', eventData.local)
    console.log('Organizer:', eventData.organizer_name)
    console.log('Website:', eventData.website || 'Not found')
    console.log('Description:', eventData.description ? eventData.description.substring(0, 100) + '...' : 'Not found')
    
    // Validate expected values
    console.log('\n📋 Validation:')
    console.log('Expected Location: "Renaissance São Paulo Hotel" -', 
      eventData.local.includes('Renaissance') ? '✅ Found' : '❌ Not found')
    console.log('Expected Organizer: "IBRAF" -', 
      eventData.organizer_name.includes('IBRAF') ? '✅ Found' : '❌ Not found')
    console.log('Event URL validation -', 
      EventbriteScraper.isValidEventbriteUrl(testUrl) ? '✅ Valid' : '❌ Invalid')
    
  } catch (error) {
    console.error('❌ Error testing Eventbrite scraper:', error.message)
    console.error('Stack:', error.stack)
  }
}

// Run if called directly
if (require.main === module) {
  testEventbriteScraper()
}

module.exports = { testEventbriteScraper }