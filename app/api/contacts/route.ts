import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

export async function POST(request: NextRequest) {
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
    const body = await request.json()

    const { name, email, position, organizer_id } = body

    // Validate required fields
    if (!organizer_id) {
      return NextResponse.json(
        { error: 'organizer_id is required' },
        { status: 400 }
      )
    }

    // Verify the organizer belongs to the user
    const { data: organizer, error: orgError } = await supabase
      .from('organizer')
      .select('organizer_id')
      .eq('organizer_id', organizer_id)
      .eq('user_id', userId)
      .single()

    if (orgError || !organizer) {
      return NextResponse.json(
        { error: 'Organizer not found or access denied' },
        { status: 404 }
      )
    }

    // Create the contact
    const { data: contact, error } = await supabase
      .from('contact')
      .insert({
        name: name || null,
        email: email || null,
        position: position || null,
        organizer_id,
        user_id: userId
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating contact:', error)
      return NextResponse.json(
        { error: 'Failed to create contact' },
        { status: 500 }
      )
    }

    return NextResponse.json(contact)

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}