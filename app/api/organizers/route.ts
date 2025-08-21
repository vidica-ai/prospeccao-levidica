import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

export async function GET(request: NextRequest) {
  try {
    // Get user ID from Authorization header
    const authorization = request.headers.get('authorization')
    if (!authorization) {
      return NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 }
      )
    }

    const userId = authorization.replace('Bearer ', '')

    // Get search parameters
    const url = new URL(request.url)
    const search = url.searchParams.get('search') || ''
    const sortBy = url.searchParams.get('sortBy') || 'name'
    const sortOrder = url.searchParams.get('sortOrder') || 'asc'

    // Base query for organizers with contact counts
    let query = supabase
      .from('organizer')
      .select(`
        organizer_id,
        name,
        website,
        user_id,
        created_at,
        updated_at,
        contacts:contact(count)
      `)
      .eq('user_id', userId)

    // Apply search filter if provided
    if (search) {
      query = query.or(`name.ilike.%${search}%,website.ilike.%${search}%`)
    }

    // Apply sorting
    const isAscending = sortOrder === 'asc'
    switch (sortBy) {
      case 'name':
        query = query.order('name', { ascending: isAscending })
        break
      case 'created_at':
        query = query.order('created_at', { ascending: isAscending })
        break
      case 'updated_at':
        query = query.order('updated_at', { ascending: isAscending })
        break
      default:
        query = query.order('name', { ascending: true })
    }

    const { data: organizers, error: organizersError } = await query

    if (organizersError) {
      console.error('Error fetching organizers:', organizersError)
      return NextResponse.json(
        { error: 'Failed to fetch organizers' },
        { status: 500 }
      )
    }

    // Get all contacts for these organizers in a separate query
    const organizerIds = (organizers || []).map(org => org.organizer_id)
    
    let contacts = []
    if (organizerIds.length > 0) {
      const { data: contactsData, error: contactsError } = await supabase
        .from('contact')
        .select('*')
        .in('organizer_id', organizerIds)
        .order('created_at', { ascending: false })

      if (contactsError) {
        console.error('Error fetching contacts:', contactsError)
      } else {
        contacts = contactsData || []
      }
    }

    // Group contacts by organizer_id
    const contactsByOrganizer = contacts.reduce((acc, contact) => {
      if (!acc[contact.organizer_id]) {
        acc[contact.organizer_id] = []
      }
      acc[contact.organizer_id].push(contact)
      return acc
    }, {} as Record<string, any[]>)

    // Combine organizers with their contacts and contact count
    const organizersWithContacts = (organizers || []).map(organizer => ({
      ...organizer,
      contact_count: organizer.contacts?.[0]?.count || 0,
      contacts: contactsByOrganizer[organizer.organizer_id] || []
    }))

    // If sorting by contact count, we need to sort here since we can't do it in the SQL query
    if (sortBy === 'contact_count') {
      organizersWithContacts.sort((a, b) => {
        const diff = a.contact_count - b.contact_count
        return isAscending ? diff : -diff
      })
    }

    return NextResponse.json(organizersWithContacts)

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}