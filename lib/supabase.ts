import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type User = {
  id: string
  email: string
}

// New normalized types
export type Organizer = {
  organizer_id: string
  name: string
  website: string | null
  user_id: string
  created_at: string
  updated_at: string
}

export type Event = {
  event_id: string
  nome_evento: string
  data_evento: string
  local: string
  sympla_url: string
  organizer_id: string
  user_id: string
  created_at: string
  updated_at: string
}

export type Contact = {
  contact_id: string
  name: string | null
  email: string | null
  position: string | null
  organizer_id: string
  user_id: string
  created_at: string
  updated_at: string
}

export type Lead = {
  id: string
  organizer_id: string
  event_id: string
  user_id: string
  contato_verificado: boolean
  data_ultima_busca: string | null
  hunter_domain: string | null
  status_busca: 'pendente' | 'buscando' | 'encontrado' | 'nao_encontrado' | 'erro'
  created_at: string
  updated_at: string
}

// Legacy Lead type for backward compatibility
export type LegacyLead = {
  id: string
  nome_evento: string
  data_evento: string
  local: string
  produtor: string
  sympla_url: string
  user_id: string
  created_at: string
  updated_at: string
  // Hunter.io integration columns
  email_contato: string | null
  website: string | null
  contato_verificado: boolean
  data_ultima_busca: string | null
  hunter_domain: string | null
  status_busca: 'pendente' | 'buscando' | 'encontrado' | 'nao_encontrado' | 'erro'
}

// Insert and Update types for new schema
export type OrganizerInsert = Omit<Organizer, 'organizer_id' | 'created_at' | 'updated_at'>
export type OrganizerUpdate = Partial<Omit<Organizer, 'organizer_id' | 'user_id' | 'created_at' | 'updated_at'>>

export type EventInsert = Omit<Event, 'event_id' | 'created_at' | 'updated_at'>
export type EventUpdate = Partial<Omit<Event, 'event_id' | 'user_id' | 'created_at' | 'updated_at'>>

export type ContactInsert = Omit<Contact, 'contact_id' | 'created_at' | 'updated_at'>
export type ContactUpdate = Partial<Omit<Contact, 'contact_id' | 'user_id' | 'created_at' | 'updated_at'>>

export type LeadInsert = Omit<Lead, 'id' | 'created_at' | 'updated_at'>
export type LeadUpdate = Partial<Omit<Lead, 'id' | 'user_id' | 'created_at' | 'updated_at'>>

// Legacy types for backward compatibility
export type LegacyLeadInsert = Omit<LegacyLead, 'id' | 'created_at' | 'updated_at'>
export type LegacyLeadUpdate = Partial<Omit<LegacyLead, 'id' | 'user_id' | 'created_at' | 'updated_at'>>

// View types for complete data with joins
export type LeadComplete = Lead & {
  organizer: Organizer
  event: Event
  contacts: Contact[]
}

export type LeadWithUser = Lead & {
  user_email: string | null
  user_full_name: string | null
}

export type OrganizerSummary = Organizer & {
  events_count: number
  leads_count: number
  contacts_count: number
  last_event_date: string | null
}

export type EventSummary = Event & {
  organizer: Organizer
  leads_count: number
  verified_contacts_count: number
}

export type ContactSummary = Contact & {
  organizer: Organizer
}

// For creating complete leads with all related data
export type CompleteLeadInput = {
  nome_evento: string
  data_evento: string
  local: string
  sympla_url: string
  organizer_name: string
  organizer_website?: string
  contact_name?: string
  contact_email?: string
  contact_position?: string
}