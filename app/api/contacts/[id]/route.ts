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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const contactId = params.id
    const body = await request.json()

    const { name, email, position } = body

    // Verify the contact belongs to the user
    const { data: existingContact, error: fetchError } = await supabase
      .from('contact')
      .select('contact_id, organizer_id')
      .eq('contact_id', contactId)
      .eq('user_id', userId)
      .single()

    if (fetchError || !existingContact) {
      return NextResponse.json(
        { error: 'Contact not found or access denied' },
        { status: 404 }
      )
    }

    // Update the contact
    const { data: contact, error } = await supabase
      .from('contact')
      .update({
        name: name || null,
        email: email || null,
        position: position || null,
        updated_at: new Date().toISOString()
      })
      .eq('contact_id', contactId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating contact:', error)
      return NextResponse.json(
        { error: 'Failed to update contact' },
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const contactId = params.id

    // Verify the contact belongs to the user before deleting
    const { data: existingContact, error: fetchError } = await supabase
      .from('contact')
      .select('contact_id')
      .eq('contact_id', contactId)
      .eq('user_id', userId)
      .single()

    if (fetchError || !existingContact) {
      return NextResponse.json(
        { error: 'Contact not found or access denied' },
        { status: 404 }
      )
    }

    // Delete the contact
    const { error } = await supabase
      .from('contact')
      .delete()
      .eq('contact_id', contactId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting contact:', error)
      return NextResponse.json(
        { error: 'Failed to delete contact' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}