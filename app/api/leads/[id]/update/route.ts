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
    const leadId = params.id
    const body = await request.json()

    // For normalized structure, we need to handle updates differently
    const { organizer_name, organizer_website, contact_name, contact_email, contact_position, status_busca } = body

    // First, get the current lead to access related IDs
    const { data: currentLead, error: fetchError } = await supabase
      .from('leads')
      .select('id, organizer_id, event_id, user_id')
      .eq('id', leadId)
      .eq('user_id', userId)
      .single()

    if (fetchError || !currentLead) {
      return NextResponse.json(
        { error: 'Lead not found or unauthorized' },
        { status: 404 }
      )
    }

    // Handle organizer updates
    if (organizer_name !== undefined || organizer_website !== undefined) {
      const organizerUpdate: any = {}
      if (organizer_name !== undefined) organizerUpdate.name = organizer_name
      if (organizer_website !== undefined) organizerUpdate.website = organizer_website

      const { error: organizerError } = await supabase
        .from('organizer')
        .update(organizerUpdate)
        .eq('organizer_id', currentLead.organizer_id)
        .eq('user_id', userId)

      if (organizerError) {
        console.error('Error updating organizer:', organizerError)
        return NextResponse.json(
          { error: 'Failed to update organizer information' },
          { status: 500 }
        )
      }
    }

    // Handle contact creation/update
    if (contact_name !== undefined || contact_email !== undefined || contact_position !== undefined) {
      // First try to find existing contact with the same email
      let existingContact = null
      if (contact_email) {
        const { data } = await supabase
          .from('contact')
          .select('contact_id')
          .eq('organizer_id', currentLead.organizer_id)
          .eq('email', contact_email)
          .single()
        existingContact = data
      }

      if (existingContact) {
        // Update existing contact
        const contactUpdate: any = {}
        if (contact_name !== undefined) contactUpdate.name = contact_name
        if (contact_position !== undefined) contactUpdate.position = contact_position

        await supabase
          .from('contact')
          .update(contactUpdate)
          .eq('contact_id', existingContact.contact_id)
          .eq('user_id', userId)
      } else {
        // Create new contact
        await supabase
          .from('contact')
          .insert([{
            organizer_id: currentLead.organizer_id,
            name: contact_name || null,
            email: contact_email || null,
            position: contact_position || null,
            user_id: userId
          }])
      }
    }

    // Handle lead status updates
    const leadUpdate: any = {}
    
    if (status_busca !== undefined) {
      leadUpdate.status_busca = status_busca
      leadUpdate.data_ultima_busca = new Date().toISOString()
      
      // If contact info was provided and status is 'encontrado', mark as verified
      if ((contact_name || contact_email) && status_busca === 'encontrado') {
        leadUpdate.contato_verificado = true
      }
    }

    // Update the lead if there are changes
    if (Object.keys(leadUpdate).length > 0) {
      const { error: leadError } = await supabase
        .from('leads')
        .update(leadUpdate)
        .eq('id', leadId)
        .eq('user_id', userId)

      if (leadError) {
        console.error('Error updating lead:', leadError)
        return NextResponse.json(
          { error: 'Failed to update lead status' },
          { status: 500 }
        )
      }
    }

    // Return the updated complete lead data
    const { data: updatedLead, error: getError } = await supabase
      .from('leads_complete')
      .select('*')
      .eq('id', leadId)
      .single()

    if (getError) {
      console.error('Error fetching updated lead:', getError)
      return NextResponse.json(
        { error: 'Lead updated but failed to fetch updated data' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      lead: updatedLead,
      message: 'Lead updated successfully'
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}