import { chromium } from 'playwright'

async function analyzeEventbritePage() {
  const url = 'https://www.eventbrite.com/e/brazil-tech-summit-tickets-65499469677?aff=ebdssbdestsearch'
  
  console.log('Analyzing Eventbrite page structure...')
  console.log('URL:', url)
  console.log('----------------------------------------')
  
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  
  try {
    await page.goto(url, { waitUntil: 'networkidle' })
    
    // Look for organizer information in various possible locations
    const possibleSelectors = [
      // Try to find "Organized by" section
      'text="Organized by"',
      'text="Organizado por"',
      ':has-text("Organized by")',
      
      // Look for specific class names that might contain organizer
      '.organizer-name',
      '[data-automation="organizer-name"]',
      '.eds-text-color--primary-brand',
      
      // Look for links that might be organizer profile
      'a[href*="/o/"]',
      'a[href*="/organizer/"]',
      
      // General text search
      'text="Global Startup Ecosystem"'
    ]
    
    console.log('\n🔍 Searching for organizer information...\n')
    
    for (const selector of possibleSelectors) {
      try {
        const elements = await page.locator(selector).all()
        if (elements.length > 0) {
          console.log(`✅ Found ${elements.length} element(s) matching: ${selector}`)
          for (let i = 0; i < Math.min(3, elements.length); i++) {
            const text = await elements[i].textContent()
            const href = await elements[i].getAttribute('href').catch(() => null)
            console.log(`   Element ${i + 1}: "${text?.trim()}"`)
            if (href) {
              console.log(`   Link: ${href}`)
            }
            
            // Check parent and siblings for context
            const parent = await elements[i].locator('..').textContent().catch(() => null)
            if (parent && parent !== text) {
              console.log(`   Parent context: "${parent?.substring(0, 100)}..."`)
            }
          }
        }
      } catch (error) {
        // Selector didn't match, continue
      }
    }
    
    // Try to get the entire "Organized by" section
    console.log('\n🔍 Looking for "Organized by" section structure...\n')
    
    const organizedBySection = page.locator(':has-text("Organized by")').first()
    if (await organizedBySection.count() > 0) {
      const sectionHtml = await organizedBySection.innerHTML()
      console.log('Found "Organized by" section HTML (first 500 chars):')
      console.log(sectionHtml.substring(0, 500))
      
      // Try to find the actual organizer name after "Organized by"
      const fullText = await organizedBySection.textContent()
      console.log('\nFull section text:', fullText)
      
      // Look for links within this section
      const links = await organizedBySection.locator('a').all()
      for (const link of links) {
        const linkText = await link.textContent()
        const linkHref = await link.getAttribute('href')
        console.log(`\nFound link in section:`)
        console.log(`  Text: "${linkText?.trim()}"`)
        console.log(`  Href: ${linkHref}`)
      }
    }
    
    // Try alternative: Look for specific pattern in page content
    console.log('\n🔍 Searching page content for "Global Startup Ecosystem"...\n')
    const pageContent = await page.content()
    const regex = /Global\s+Startup\s+Ecosystem/gi
    const matches = pageContent.match(regex)
    if (matches) {
      console.log(`Found "${matches[0]}" in page content ${matches.length} time(s)`)
      
      // Find context around the match
      const index = pageContent.search(regex)
      const context = pageContent.substring(Math.max(0, index - 200), Math.min(pageContent.length, index + 200))
      console.log('Context around match:')
      console.log(context.replace(/</g, '\n<'))
    }
    
  } catch (error: any) {
    console.error('Error analyzing page:', error.message)
  } finally {
    await browser.close()
  }
}

analyzeEventbritePage()