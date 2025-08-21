import { EventbriteScraper } from '../lib/eventbrite-scraper'

async function testBrazilTechSummit() {
  const testUrl = 'https://www.eventbrite.com/e/brazil-tech-summit-tickets-65499469677?aff=ebdssbdestsearch'
  
  console.log('Testing Eventbrite Scraper with Brazil Tech Summit URL')
  console.log('URL:', testUrl)
  console.log('Expected Organizer: Global Startup Ecosystem')
  console.log('----------------------------------------')
  
  try {
    const eventData = await EventbriteScraper.fetchEventData(testUrl)
    
    console.log('\n✅ Event Data Extracted:')
    console.log('Event Name:', eventData.nome_evento)
    console.log('Date:', eventData.data_evento)
    console.log('Location:', eventData.local)
    console.log('Organizer:', eventData.organizer_name)
    console.log('Website:', eventData.website || 'Not found')
    
    console.log('\n📋 Validation:')
    console.log('Expected Organizer: "Global Startup Ecosystem" -', 
      eventData.organizer_name.includes('Global Startup Ecosystem') ? '✅ CORRECT' : `❌ INCORRECT (Got: "${eventData.organizer_name}")`)
    
  } catch (error: any) {
    console.error('❌ Error testing Eventbrite scraper:', error.message)
    console.error('Stack:', error.stack)
  }
}

testBrazilTechSummit()