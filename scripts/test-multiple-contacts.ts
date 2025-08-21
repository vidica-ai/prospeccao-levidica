import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function testMultipleContacts() {
  console.log('Testing Multiple Contacts Enhancement')
  console.log('=====================================\n')

  try {
    // First, let's check a sample organizer to see if multiple contacts were added
    const { data: organizers, error: orgError } = await supabase
      .from('organizer')
      .select('organizer_id, name, website')
      .limit(5)
    
    if (orgError) {
      console.error('Error fetching organizers:', orgError)
      return
    }

    console.log(`Found ${organizers?.length || 0} organizers\n`)

    // For each organizer, check their contacts
    for (const organizer of organizers || []) {
      console.log(`\nOrganizer: ${organizer.name}`)
      console.log(`Website: ${organizer.website || 'Not set'}`)
      console.log('---')
      
      const { data: contacts, error: contactError } = await supabase
        .from('contact')
        .select('contact_id, name, email, position')
        .eq('organizer_id', organizer.organizer_id)
      
      if (contactError) {
        console.error('Error fetching contacts:', contactError)
        continue
      }
      
      if (contacts && contacts.length > 0) {
        console.log(`  Found ${contacts.length} contact(s):`)
        contacts.forEach((contact, index) => {
          console.log(`  ${index + 1}. ${contact.email}`)
          if (contact.name) console.log(`     Name: ${contact.name}`)
          if (contact.position) console.log(`     Position: ${contact.position}`)
        })
      } else {
        console.log('  No contacts found')
      }
    }

    // Now let's check the leads to see their status
    console.log('\n\nLead Search Status Summary')
    console.log('==========================')
    
    const { data: statusCounts, error: statusError } = await supabase
      .from('leads')
      .select('status_busca')
    
    if (!statusError && statusCounts) {
      const summary = statusCounts.reduce((acc: any, lead) => {
        acc[lead.status_busca] = (acc[lead.status_busca] || 0) + 1
        return acc
      }, {})
      
      console.log('Status Distribution:')
      Object.entries(summary).forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`)
      })
    }

    // Check leads with multiple contacts
    console.log('\n\nOrganizers with Multiple Contacts')
    console.log('==================================')
    
    const { data: multiContactOrgs, error: multiError } = await supabase
      .rpc('get_organizers_with_multiple_contacts')
    
    if (multiError) {
      // If the function doesn't exist, do a manual query
      const { data: contactCounts } = await supabase
        .from('contact')
        .select('organizer_id')
      
      if (contactCounts) {
        const orgCounts = contactCounts.reduce((acc: any, contact) => {
          acc[contact.organizer_id] = (acc[contact.organizer_id] || 0) + 1
          return acc
        }, {})
        
        const multipleContacts = Object.entries(orgCounts)
          .filter(([_, count]: any) => count > 1)
          .length
        
        console.log(`Found ${multipleContacts} organizers with multiple contacts`)
      }
    } else if (multiContactOrgs) {
      console.log(`Found ${multiContactOrgs.length} organizers with multiple contacts`)
      multiContactOrgs.slice(0, 3).forEach((org: any) => {
        console.log(`  - ${org.name}: ${org.contact_count} contacts`)
      })
    }

  } catch (error) {
    console.error('Test error:', error)
  }
}

// Run the test
testMultipleContacts()