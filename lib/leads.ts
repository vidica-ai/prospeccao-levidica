import { supabase } from './supabase'
import type { Lead, LeadInsert, LeadUpdate, LeadWithUser, LegacyLead, CompleteLeadInput } from './supabase'
import { getLeadsComplete, createCompleteLead } from './normalized-db'

/**
 * Lead management utilities for Supabase operations
 * All functions handle RLS automatically - users can only access their own leads
 * 
 * This module provides both legacy and normalized database functions:
 * - Legacy functions work with the original monolithic leads table
 * - New functions work with the normalized schema (organizer, event, contact, leads)
 */

// =============================================================================
// NEW NORMALIZED SCHEMA FUNCTIONS
// =============================================================================

/**
 * Get all leads with complete information using normalized schema
 */
export async function getLeadsWithFullDetails() {
  return getLeadsComplete()
}

/**
 * Create a new lead using normalized schema with all related data
 */
export async function createLeadFromSympla(input: CompleteLeadInput) {
  return createCompleteLead(input)
}

/**
 * Get leads using the new normalized schema
 */
export async function getLeadsNormalized(): Promise<{ data: Lead[] | null; error: any }> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })

  return { data, error }
}

// =============================================================================
// LEGACY FUNCTIONS (for backward compatibility)
// =============================================================================

/**
 * Fetch all leads for the current authenticated user (LEGACY)
 * Uses backup view if available, otherwise tries original table structure
 */
export async function getLeads(): Promise<{ data: LegacyLead[] | null; error: any }> {
  // Try to use the backup view first (preserves original structure)
  const { data, error } = await supabase
    .from('leads_backup_view')
    .select('*')
    .order('created_at', { ascending: false })

  if (!error) {
    return { data, error }
  }

  // Fallback to original leads table (if migration hasn't been run yet)
  const { data: fallbackData, error: fallbackError } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })

  return { data: fallbackData as LegacyLead[] | null, error: fallbackError }
}

/**
 * Fetch leads with user information for the current authenticated user (LEGACY)
 */
export async function getLeadsWithUser(): Promise<{ data: LeadWithUser[] | null; error: any }> {
  const { data, error } = await supabase
    .from('leads_with_user')
    .select('*')
    .order('created_at', { ascending: false })

  return { data, error }
}

/**
 * Get a specific lead by ID (only if owned by current user)
 */
export async function getLead(id: string): Promise<{ data: Lead | null; error: any }> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .single()

  return { data, error }
}

/**
 * Create a new lead
 */
export async function createLead(lead: LeadInsert): Promise<{ data: Lead | null; error: any }> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { data: null, error: { message: 'User not authenticated' } }
  }

  const { data, error } = await supabase
    .from('leads')
    .insert([{ ...lead, user_id: user.id }])
    .select()
    .single()

  return { data, error }
}

/**
 * Update an existing lead (only if owned by current user)
 */
export async function updateLead(id: string, updates: LeadUpdate): Promise<{ data: Lead | null; error: any }> {
  const { data, error } = await supabase
    .from('leads')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  return { data, error }
}

/**
 * Delete a lead (only if owned by current user)
 */
export async function deleteLead(id: string): Promise<{ error: any }> {
  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', id)

  return { error }
}

/**
 * Check if a Sympla URL already exists for the current user
 */
export async function checkSymplaUrlExists(symplaUrl: string): Promise<{ exists: boolean; error: any }> {
  const { data, error } = await supabase
    .from('leads')
    .select('id')
    .eq('sympla_url', symplaUrl)
    .maybeSingle()

  if (error) {
    return { exists: false, error }
  }

  return { exists: !!data, error: null }
}

/**
 * Search leads by event name, producer, or location
 */
export async function searchLeads(query: string): Promise<{ data: Lead[] | null; error: any }> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .or(`nome_evento.ilike.%${query}%,produtor.ilike.%${query}%,local.ilike.%${query}%`)
    .order('created_at', { ascending: false })

  return { data, error }
}

/**
 * Get leads count for the current user
 */
export async function getLeadsCount(): Promise<{ count: number | null; error: any }> {
  const { count, error } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })

  return { count, error }
}

/**
 * Get recent leads (last N days)
 */
export async function getRecentLeads(days: number = 7): Promise<{ data: Lead[] | null; error: any }> {
  const date = new Date()
  date.setDate(date.getDate() - days)
  
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .gte('created_at', date.toISOString())
    .order('created_at', { ascending: false })

  return { data, error }
}

/**
 * Hunter.io Integration Functions
 */

/**
 * Get leads that need contact discovery (pending or error status)
 */
export async function getLeadsPendingContactSearch(): Promise<{ data: Lead[] | null; error: any }> {
  const { data, error } = await supabase
    .from('leads_pending_contact_search')
    .select('*')

  return { data, error }
}

/**
 * Update lead search status and contact information
 */
export async function updateLeadSearchStatus(
  leadId: string,
  status: 'pendente' | 'buscando' | 'encontrado' | 'nao_encontrado' | 'erro',
  contactInfo?: {
    email?: string
    website?: string
    domain?: string
  }
): Promise<{ data: boolean | null; error: any }> {
  const { data, error } = await supabase.rpc('update_lead_search_status', {
    lead_id: leadId,
    new_status: status,
    found_email: contactInfo?.email || null,
    found_website: contactInfo?.website || null,
    search_domain: contactInfo?.domain || null
  })

  return { data, error }
}

/**
 * Get leads with verified contact information
 */
export async function getLeadsWithVerifiedContacts(): Promise<{ data: Lead[] | null; error: any }> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('contato_verificado', true)
    .order('data_ultima_busca', { ascending: false })

  return { data, error }
}

/**
 * Get leads by search status
 */
export async function getLeadsBySearchStatus(
  status: 'pendente' | 'buscando' | 'encontrado' | 'nao_encontrado' | 'erro'
): Promise<{ data: Lead[] | null; error: any }> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('status_busca', status)
    .order('created_at', { ascending: false })

  return { data, error }
}

/**
 * Get leads that need retry (error status and older than 24 hours)
 */
export async function getLeadsNeedingRetry(): Promise<{ data: Lead[] | null; error: any }> {
  const yesterday = new Date()
  yesterday.setHours(yesterday.getHours() - 24)
  
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('status_busca', 'erro')
    .lt('data_ultima_busca', yesterday.toISOString())
    .order('data_ultima_busca', { ascending: true })

  return { data, error }
}

/**
 * Search leads by company domain
 */
export async function searchLeadsByDomain(domain: string): Promise<{ data: Lead[] | null; error: any }> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('hunter_domain', domain)
    .order('created_at', { ascending: false })

  return { data, error }
}

/**
 * Get contact discovery statistics for current user
 */
export async function getContactDiscoveryStats(): Promise<{ 
  data: { 
    total: number
    pending: number
    found: number
    not_found: number
    errors: number
    verified: number
  } | null
  error: any 
}> {
  const { data: leads, error } = await supabase
    .from('leads')
    .select('status_busca, contato_verificado')

  if (error) {
    return { data: null, error }
  }

  if (!leads) {
    return { 
      data: { total: 0, pending: 0, found: 0, not_found: 0, errors: 0, verified: 0 },
      error: null 
    }
  }

  const stats = leads.reduce((acc, lead) => {
    acc.total++
    if (lead.contato_verificado) acc.verified++
    
    switch (lead.status_busca) {
      case 'pendente':
        acc.pending++
        break
      case 'encontrado':
        acc.found++
        break
      case 'nao_encontrado':
        acc.not_found++
        break
      case 'erro':
        acc.errors++
        break
    }
    
    return acc
  }, { total: 0, pending: 0, found: 0, not_found: 0, errors: 0, verified: 0 })

  return { data: stats, error: null }
}