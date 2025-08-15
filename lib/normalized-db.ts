import { supabase } from './supabase'
import type { 
  Organizer, OrganizerInsert, OrganizerUpdate, OrganizerSummary,
  Event, EventInsert, EventUpdate, EventSummary,
  Contact, ContactInsert, ContactUpdate, ContactSummary,
  Lead, LeadInsert, LeadUpdate, LeadComplete,
  CompleteLeadInput
} from './supabase'

/**
 * Normalized database operations for the new schema
 * These functions work with the normalized organizer, event, contact, and lead tables
 */

// ORGANIZER OPERATIONS

/**
 * Get all organizers for the current user
 */
export async function getOrganizers(): Promise<{ data: Organizer[] | null; error: any }> {
  const { data, error } = await supabase
    .from('organizer')
    .select('*')
    .order('created_at', { ascending: false })

  return { data, error }
}

/**
 * Get organizer by ID
 */
export async function getOrganizer(organizer_id: string): Promise<{ data: Organizer | null; error: any }> {
  const { data, error } = await supabase
    .from('organizer')
    .select('*')
    .eq('organizer_id', organizer_id)
    .single()

  return { data, error }
}

/**
 * Create a new organizer
 */
export async function createOrganizer(organizer: OrganizerInsert): Promise<{ data: Organizer | null; error: any }> {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { data: null, error: { message: 'User not authenticated' } }
  }

  const { data, error } = await supabase
    .from('organizer')
    .insert([{ ...organizer, user_id: user.id }])
    .select()
    .single()

  return { data, error }
}

/**
 * Update an organizer
 */
export async function updateOrganizer(organizer_id: string, updates: OrganizerUpdate): Promise<{ data: Organizer | null; error: any }> {
  const { data, error } = await supabase
    .from('organizer')
    .update(updates)
    .eq('organizer_id', organizer_id)
    .select()
    .single()

  return { data, error }
}

/**
 * Delete an organizer
 */
export async function deleteOrganizer(organizer_id: string): Promise<{ error: any }> {
  const { error } = await supabase
    .from('organizer')
    .delete()
    .eq('organizer_id', organizer_id)

  return { error }
}

/**
 * Get or create organizer by name (uses the database function if available)
 */
export async function getOrCreateOrganizer(name: string, website?: string): Promise<{ data: string | null; error: any }> {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { data: null, error: { message: 'User not authenticated' } }
  }

  // Try to use the database function first
  const { data, error } = await supabase.rpc('get_or_create_organizer', {
    p_name: name,
    p_website: website || null,
    p_user_id: user.id
  })

  if (!error) {
    return { data, error }
  }

  // Fallback to manual implementation
  const { data: existing, error: findError } = await supabase
    .from('organizer')
    .select('organizer_id')
    .eq('name', name)
    .eq('user_id', user.id)
    .maybeSingle()

  if (findError) {
    return { data: null, error: findError }
  }

  if (existing) {
    return { data: existing.organizer_id, error: null }
  }

  // Create new organizer
  const { data: newOrganizer, error: createError } = await createOrganizer({
    name,
    website: website || null,
    user_id: user.id
  })

  if (createError) {
    return { data: null, error: createError }
  }

  return { data: newOrganizer?.organizer_id || null, error: null }
}

// EVENT OPERATIONS

/**
 * Get all events for the current user
 */
export async function getEvents(): Promise<{ data: Event[] | null; error: any }> {
  const { data, error } = await supabase
    .from('event')
    .select('*')
    .order('created_at', { ascending: false })

  return { data, error }
}

/**
 * Get event by ID
 */
export async function getEvent(event_id: string): Promise<{ data: Event | null; error: any }> {
  const { data, error } = await supabase
    .from('event')
    .select('*')
    .eq('event_id', event_id)
    .single()

  return { data, error }
}

/**
 * Create a new event
 */
export async function createEvent(event: EventInsert): Promise<{ data: Event | null; error: any }> {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { data: null, error: { message: 'User not authenticated' } }
  }

  const { data, error } = await supabase
    .from('event')
    .insert([{ ...event, user_id: user.id }])
    .select()
    .single()

  return { data, error }
}

/**
 * Create event with organizer (uses database function if available)
 */
export async function createEventWithOrganizer(
  eventData: Omit<EventInsert, 'organizer_id' | 'user_id'>,
  organizerName: string,
  organizerWebsite?: string
): Promise<{ data: string | null; error: any }> {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { data: null, error: { message: 'User not authenticated' } }
  }

  // Try to use the database function first
  const { data, error } = await supabase.rpc('create_event_with_organizer', {
    p_nome_evento: eventData.nome_evento,
    p_data_evento: eventData.data_evento,
    p_local: eventData.local,
    p_sympla_url: eventData.sympla_url,
    p_organizer_name: organizerName,
    p_organizer_website: organizerWebsite || null,
    p_user_id: user.id
  })

  if (!error) {
    return { data, error }
  }

  // Fallback to manual implementation
  const { data: organizer_id, error: organizerError } = await getOrCreateOrganizer(organizerName, organizerWebsite)
  
  if (organizerError || !organizer_id) {
    return { data: null, error: organizerError || { message: 'Failed to create organizer' } }
  }

  const { data: newEvent, error: eventError } = await createEvent({
    ...eventData,
    organizer_id,
    user_id: user.id
  })

  if (eventError) {
    return { data: null, error: eventError }
  }

  return { data: newEvent?.event_id || null, error: null }
}

// CONTACT OPERATIONS

/**
 * Get all contacts for the current user
 */
export async function getContacts(): Promise<{ data: Contact[] | null; error: any }> {
  const { data, error } = await supabase
    .from('contact')
    .select('*')
    .order('created_at', { ascending: false })

  return { data, error }
}

/**
 * Get contacts for a specific organizer
 */
export async function getOrganizerContacts(organizer_id: string): Promise<{ data: Contact[] | null; error: any }> {
  const { data, error } = await supabase
    .from('contact')
    .select('*')
    .eq('organizer_id', organizer_id)
    .order('created_at', { ascending: false })

  return { data, error }
}

/**
 * Create a new contact
 */
export async function createContact(contact: ContactInsert): Promise<{ data: Contact | null; error: any }> {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { data: null, error: { message: 'User not authenticated' } }
  }

  const { data, error } = await supabase
    .from('contact')
    .insert([{ ...contact, user_id: user.id }])
    .select()
    .single()

  return { data, error }
}

/**
 * Add contact to organizer (uses database function if available)
 */
export async function addOrganizerContact(
  organizer_id: string,
  name?: string,
  email?: string,
  position?: string
): Promise<{ data: string | null; error: any }> {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { data: null, error: { message: 'User not authenticated' } }
  }

  // Try to use the database function first
  const { data, error } = await supabase.rpc('add_organizer_contact', {
    p_organizer_id: organizer_id,
    p_name: name || null,
    p_email: email || null,
    p_position: position || null,
    p_user_id: user.id
  })

  if (!error) {
    return { data, error }
  }

  // Fallback to manual implementation
  const { data: newContact, error: contactError } = await createContact({
    organizer_id,
    name: name || null,
    email: email || null,
    position: position || null,
    user_id: user.id
  })

  if (contactError) {
    return { data: null, error: contactError }
  }

  return { data: newContact?.contact_id || null, error: null }
}

// LEAD OPERATIONS (NORMALIZED)

/**
 * Get all leads with complete information (using view if available)
 */
export async function getLeadsComplete(): Promise<{ data: LeadComplete[] | null; error: any }> {
  // Try to use the leads_complete view first
  const { data, error } = await supabase
    .from('leads_complete')
    .select('*')
    .order('created_at', { ascending: false })

  if (!error) {
    return { data, error }
  }

  // Fallback to manual joins
  const { data: leads, error: leadsError } = await supabase
    .from('leads')
    .select(`
      *,
      organizer:organizer_id (*),
      event:event_id (*),
      contacts:organizer_id (*)
    `)
    .order('created_at', { ascending: false })

  return { data: leads as LeadComplete[] | null, error: leadsError }
}

/**
 * Create a complete lead with all related data
 */
export async function createCompleteLead(input: CompleteLeadInput): Promise<{ data: string | null; error: any }> {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { data: null, error: { message: 'User not authenticated' } }
  }

  // Try to use the database function first
  const { data, error } = await supabase.rpc('create_complete_lead', {
    p_nome_evento: input.nome_evento,
    p_data_evento: input.data_evento,
    p_local: input.local,
    p_sympla_url: input.sympla_url,
    p_organizer_name: input.organizer_name,
    p_organizer_website: input.organizer_website || null,
    p_contact_name: input.contact_name || null,
    p_contact_email: input.contact_email || null,
    p_contact_position: input.contact_position || null,
    p_user_id: user.id
  })

  if (!error) {
    return { data, error }
  }

  // Fallback to manual implementation
  const { data: event_id, error: eventError } = await createEventWithOrganizer(
    {
      nome_evento: input.nome_evento,
      data_evento: input.data_evento,
      local: input.local,
      sympla_url: input.sympla_url
    },
    input.organizer_name,
    input.organizer_website
  )

  if (eventError || !event_id) {
    return { data: null, error: eventError || { message: 'Failed to create event' } }
  }

  // Get the organizer_id from the event
  const { data: event, error: getEventError } = await getEvent(event_id)
  
  if (getEventError || !event) {
    return { data: null, error: getEventError || { message: 'Failed to get event details' } }
  }

  // Create contact if provided
  if (input.contact_name || input.contact_email) {
    await addOrganizerContact(
      event.organizer_id,
      input.contact_name,
      input.contact_email,
      input.contact_position
    )
  }

  // Create the lead
  const { data: newLead, error: leadError } = await supabase
    .from('leads')
    .insert([{
      organizer_id: event.organizer_id,
      event_id: event_id,
      user_id: user.id,
      contato_verificado: false,
      status_busca: 'pendente' as const
    }])
    .select()
    .single()

  if (leadError) {
    return { data: null, error: leadError }
  }

  return { data: newLead?.id || null, error: null }
}

// SUMMARY AND ANALYTICS

/**
 * Get organizer summary with statistics
 */
export async function getOrganizersSummary(): Promise<{ data: OrganizerSummary[] | null; error: any }> {
  const { data, error } = await supabase
    .from('organizer_summary')
    .select('*')
    .order('created_at', { ascending: false })

  return { data, error }
}

/**
 * Get event summary with statistics
 */
export async function getEventsSummary(): Promise<{ data: EventSummary[] | null; error: any }> {
  const { data, error } = await supabase
    .from('event_summary')
    .select('*')
    .order('created_at', { ascending: false })

  return { data, error }
}

/**
 * Get contact summary with organizer details
 */
export async function getContactsSummary(): Promise<{ data: ContactSummary[] | null; error: any }> {
  const { data, error } = await supabase
    .from('contact_summary')
    .select('*')
    .order('created_at', { ascending: false })

  return { data, error }
}